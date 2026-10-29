import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { boundedBody } from "@/lib/access";
import { randomUUID } from "node:crypto";
import { authorizeWorkspace, apiError } from "@/lib/admin";
import { mediaText } from "@/lib/media";
import { HttpError } from "@/lib/validation";
export async function POST(request: NextRequest) {
  try {
    const { db, actor } = await authorizeWorkspace(request);
    if (Number(request.headers.get("content-length")) > 5500000)
      throw new HttpError(413, "Choose an image smaller than 5 MB.");
    const body = await boundedBody(request, 5500000);
    const form = await new Request(request.url, {
      method: "POST",
      headers: { "content-type": request.headers.get("content-type") || "" },
      body: Buffer.from(body),
    }).formData();
    const alt = mediaText(form.get("alt"), 300);
    const caption = mediaText(form.get("caption"), 500);
    const file = form.get("image");
    if (!(file instanceof File) || file.size > 5242880 || file.size === 0)
      throw new HttpError(400, "Choose an image between 1 byte and 5 MB.");
    const bytes = Buffer.from(await file.arrayBuffer());
    let output: Buffer;
    try {
      const image = sharp(bytes, {
        limitInputPixels: 25000000,
        animated: false,
      });
      const meta = await image.metadata();
      if (!["jpeg", "png", "webp", "gif"].includes(meta.format || "")) throw 0;
      output = await image
        .rotate()
        .resize({ width: 1800, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new HttpError(
        400,
        "Choose a valid JPEG, PNG, WebP, or GIF image up to 25 megapixels.",
      );
    }
    const name = randomUUID() + ".webp";
    const { error } = await db.storage
      .from("blog-images")
      .upload(name, output, { contentType: "image/webp", upsert: false });
    if (error) throw error;
    const dimensions = await sharp(output).metadata();
    const { error: metadataError } = await db.from("blog_media").insert({
      name,
      alt,
      caption,
      width: dimensions.width,
      height: dimensions.height,
      byte_size: output.length,
      created_by: actor.id,
    });
    if (metadataError) {
      await db.storage.from("blog-images").remove([name]);
      throw metadataError;
    }
    return NextResponse.json({
      imageUrl: db.storage.from("blog-images").getPublicUrl(name).data
        .publicUrl,
      name,
      alt,
      caption,
      success: true,
    });
  } catch (e) {
    return apiError(e);
  }
}
