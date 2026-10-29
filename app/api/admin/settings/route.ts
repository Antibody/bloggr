import { NextRequest, NextResponse } from "next/server";
import { authorizeAdmin, apiError, readJson } from "@/lib/admin";
import { parseSettings } from "@/lib/validation";
import { defaultSettings } from "@/lib/site";
export async function GET(request: NextRequest) {
  try {
    const db = await authorizeAdmin(request);
    const { data, error } = await db
      .from("blog_settings")
      .select("data")
      .eq("id", 1)
      .single();
    if (error) throw error;
    return NextResponse.json({
      settings: { ...defaultSettings, ...data.data },
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: NextRequest) {
  try {
    const db = await authorizeAdmin(request);
    const settings = parseSettings(await readJson(request));
    const { error } = await db
      .from("blog_settings")
      .update({ data: settings })
      .eq("id", 1);
    if (error) throw error;
    return NextResponse.json({ settings });
  } catch (e) {
    return apiError(e);
  }
}
