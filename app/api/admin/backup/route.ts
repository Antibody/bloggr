import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { marked } from "marked";
import {
  authorizeAdmin,
  authorizeWorkspace,
  apiError,
  readJson,
} from "@/lib/admin";
import { parseDraft, HttpError } from "@/lib/validation";
import { adminPost, mutatePost } from "@/lib/post-admin";
import { slugify } from "@/lib/content";
import { defaultSettings } from "@/lib/site";
export async function GET(request: NextRequest) {
  try {
    const db = await authorizeAdmin(request);
    const all = [];
    for (let page = 0; page < 100; page++) {
      const { data, error } = await db
        .from("blog_posts")
        .select("*,blog_post_drafts(data)")
        .order("id")
        .range(page * 100, page * 100 + 99);
      if (error) throw error;
      all.push(...(data || []));
      if ((data || []).length < 100) break;
      if (page === 99)
        throw new HttpError(
          413,
          "Use a database backup for more than 10,000 posts.",
        );
    }
    const { data: settings, error } = await db
      .from("blog_settings")
      .select("data")
      .eq("id", 1)
      .single();
    if (error) throw error;
    return NextResponse.json(
      {
        format: "bloggr-v1",
        exported_at: new Date().toISOString(),
        posts: all.map((row) => {
          const p = adminPost(row);
          return {
            slug: p.slug,
            draft: p.draft,
            published: {
              title: row.title,
              content: row.content,
              date: row.published_at,
              description: row.description,
              keywords: row.keywords,
              excerpt: row.excerpt,
              cover_image: row.cover_image,
              cover_alt: row.cover_alt,
              cover_caption: row.cover_caption,
              author_id: row.author_id,
              id: row.id,
              slug: row.slug,
              created_at: row.created_at,
              updated_at: row.updated_at,
              tags: row.tags,
              author_name: row.author_name,
            },
            status: p.status,
            deleted_at: p.deleted_at,
          };
        }),
        settings: settings?.data || defaultSettings,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
          "Content-Disposition": 'attachment; filename="bloggr-backup.json"',
        },
      },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: NextRequest) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    if (actor.role !== "owner")
      throw new HttpError(403, "Only the owner can import a backup.");
    const body = await readJson(request);
    let rows = body.posts;
    if (typeof body.markdown === "string") {
      if (body.markdown.length > 100000)
        throw new HttpError(413, "Markdown is too large.");
      rows = [
        {
          draft: {
            title: body.title || "Imported story",
            htmlContent: await marked.parse(body.markdown, { async: false }),
            date: new Date().toISOString(),
          },
        },
      ];
    } else if (body.format !== "bloggr-v1")
      throw new HttpError(
        400,
        "Choose a Bloggr JSON export or a Markdown file.",
      );
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > 20)
      throw new HttpError(400, "Import between 1 and 20 posts at a time.");
    const validated = rows.map((row) => ({
      draft: parseDraft(row.draft),
      slug: slugify(String(row.slug || row.draft?.title || "imported")),
    }));
    let imported = 0;
    for (const row of validated) {
      try {
        const id = randomUUID();
        await mutatePost(
          db,
          (row.slug || "imported").slice(0, 110).replace(/-$/, "") +
            "-" +
            id.slice(0, 8),
          row.draft,
          "create",
          null,
          actor,
          id,
        );
        imported++;
      } catch {
        return NextResponse.json(
          {
            imported,
            error:
              "Import stopped. Completed drafts were kept; review them before retrying.",
          },
          { status: 500, headers: { "Cache-Control": "private, no-store" } },
        );
      }
    }
    return NextResponse.json(
      { imported },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
