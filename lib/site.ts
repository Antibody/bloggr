import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { SiteSettings } from "./types";
export const defaultSettings: SiteSettings = {
  title: "Bloggr",
  description: "Ideas, stories, and things worth sharing.",
  accent: "#245d48",
  logo_url: "",
  locale: "en",
  timezone: "UTC",
  home_mode: "publication",
  social_url: "",
  navigation: [],
  typography: "editorial",
};
export async function getSiteSettings(): Promise<SiteSettings> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return defaultSettings;
  try {
    const { data } = await createClient(url, key, {
      auth: { persistSession: false },
    })
      .from("blog_settings")
      .select("data")
      .eq("id", 1)
      .single();
    return { ...defaultSettings, ...(data?.data || {}) };
  } catch {
    return defaultSettings;
  }
}
