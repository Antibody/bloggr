import { NextRequest } from "next/server";
import {
  authorizeWorkspace,
  apiError,
  readJson,
  privateJson,
} from "@/lib/admin";
import { HttpError } from "@/lib/validation";
import {
  authorizeMedia,
  mediaName,
  mediaText,
  mediaUrl,
  referencedMedia,
} from "@/lib/media";

type Media = {
  name: string;
  alt: string;
  caption: string;
  created_at: string;
  created_by?: string | null;
  width?: number | null;
  height?: number | null;
  byte_size?: number | null;
};
export async function GET(request: NextRequest) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    const page = Number(request.nextUrl.searchParams.get("page") || 1);
    if (!Number.isInteger(page) || page < 1)
      throw new HttpError(400, "Invalid page.");
    const query = (request.nextUrl.searchParams.get("q") || "")
      .slice(0, 300)
      .toLowerCase();
    const unused = request.nextUrl.searchParams.get("unused") === "true";
    const byName = new Map<string, Media>();
    for (let offset = 0; ; offset += 500) {
      let select = db
        .from("blog_media")
        .select("*")
        .order("name")
        .range(offset, offset + 499);
      if (actor.role === "author") select = select.eq("created_by", actor.id);
      const { data, error } = await select;
      if (error) throw error;
      for (const item of data || []) byName.set(item.name, item);
      if (!data || data.length < 500) break;
    }
    // Owners can manage historical files without attributing them to another author.
    if (actor.role === "owner") {
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await db.storage.from("blog-images").list("", {
          limit: 100,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
        if (error) throw error;
        for (const file of data || [])
          if (file.id && !byName.has(file.name))
            byName.set(file.name, {
              name: file.name,
              alt: "",
              caption: "",
              created_at: file.created_at || "",
            });
        if (!data || data.length < 100) break;
      }
    }
    let items = [...byName.values()].filter((item) =>
      `${item.name} ${item.alt} ${item.caption}`.toLowerCase().includes(query),
    );
    const used = await referencedMedia(
      db,
      items.map((item) => item.name),
    );
    if (unused) items = items.filter((item) => !used.has(item.name));
    items.sort(
      (a, b) =>
        b.created_at.localeCompare(a.created_at) ||
        a.name.localeCompare(b.name),
    );
    const pageSize = 24;
    return privateJson({
      media: items
        .slice((page - 1) * pageSize, page * pageSize)
        .map((item) => ({
          ...item,
          url: mediaUrl(db, item.name),
          inUse: used.has(item.name),
        })),
      page,
      pageSize,
      total: items.length,
      hasMore: page * pageSize < items.length,
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function PATCH(request: NextRequest) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    const body = await readJson(request);
    const name = mediaName(body?.name);
    const existing = await authorizeMedia(db, actor, name);
    const alt = mediaText(body?.alt, 300),
      caption = mediaText(body?.caption, 500);
    const { error } = await db
      .from("blog_media")
      .upsert(
        { name, alt, caption, created_by: existing?.created_by || actor.id },
        { onConflict: "name" },
      );
    if (error) throw error;
    return privateJson({ success: true, name, alt, caption });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: NextRequest) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    const body = await readJson(request);
    const name = mediaName(body?.name);
    await authorizeMedia(db, actor, name);
    if ((await referencedMedia(db, [name])).has(name))
      throw new HttpError(
        409,
        "This image is used by a post or draft. Remove those references before deleting it.",
      );
    const { error } = await db.storage.from("blog-images").remove([name]);
    if (error) throw error;
    const { error: metadataError } = await db
      .from("blog_media")
      .delete()
      .eq("name", name);
    if (metadataError) throw metadataError;
    return privateJson({ success: true });
  } catch (e) {
    return apiError(e);
  }
}
