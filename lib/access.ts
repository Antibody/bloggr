import { HttpError } from "./validation";
export function assertSameOrigin(
  request: Request,
  configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL,
) {
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    let expected = new URL(request.url).origin;
    if (configuredOrigin) {
      try {
        const canonical = new URL(configuredOrigin);
        if (
          !["https:", "http:"].includes(canonical.protocol) ||
          canonical.username ||
          canonical.password ||
          !canonical.hostname
        )
          throw new Error();
        expected = canonical.origin;
      } catch {
        throw new HttpError(503, "Configure a valid publication origin.");
      }
    }
    if (!origin || origin !== expected)
      throw new HttpError(403, "This request must come from this site.");
  }
}
export function assertAdminUser(
  user: { email?: string | null } | null,
  allowedEmail: string | undefined,
) {
  if (!user) throw new HttpError(401, "Please sign in.");
  if (!allowedEmail || user.email?.toLowerCase() !== allowedEmail.toLowerCase())
    throw new HttpError(403, "You do not have access to this publication.");
}
export async function boundedBody(
  request: Request,
  maxBytes: number,
): Promise<Uint8Array> {
  const reader = request.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "Request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  return bytes;
}

export type WorkspaceRole = "owner" | "editor" | "author";
export type WorkspaceActor = { id: string; email: string; role: WorkspaceRole };
export function isOwnerEmail(
  email: string | undefined | null,
  allowedEmail: string | undefined,
) {
  return !!allowedEmail && email?.toLowerCase() === allowedEmail.toLowerCase();
}
export function assertPostAccess(
  actor: WorkspaceActor,
  post: { author_id?: string | null; status: string },
) {
  if (
    actor.role === "author" &&
    (post.author_id !== actor.id || post.status !== "draft")
  )
    throw new HttpError(403, "Authors can manage only their own drafts.");
}
