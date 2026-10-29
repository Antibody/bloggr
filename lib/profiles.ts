import { HttpError, safeUrl } from "./validation";
export type AuthorProfile = {
  user_id: string;
  slug: string;
  display_name: string;
  bio: string;
  avatar_url: string;
};
export function parseProfile(input: unknown): Omit<AuthorProfile, "user_id"> {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new HttpError(400, "Invalid profile.");
  const value = input as Record<string, unknown>;
  if (
    typeof value.display_name !== "string" ||
    !value.display_name.trim() ||
    value.display_name.length > 100
  )
    throw new HttpError(400, "Enter a display name up to 100 characters.");
  if (
    typeof value.slug !== "string" ||
    value.slug.length > 100 ||
    !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value.slug)
  )
    throw new HttpError(
      400,
      "Use lowercase letters, numbers, and hyphens for your author URL.",
    );
  if (typeof value.bio !== "string" || value.bio.length > 2000)
    throw new HttpError(400, "Keep your biography under 2,000 characters.");
  return {
    display_name: value.display_name.trim(),
    slug: value.slug,
    bio: value.bio.trim(),
    avatar_url: safeUrl(value.avatar_url),
  };
}
