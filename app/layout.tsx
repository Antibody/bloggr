import type { CSSProperties } from "react";
import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { getSiteSettings } from "@/lib/site";
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  return {
    metadataBase: url ? new URL(url) : undefined,
    title: { default: site.title, template: `%s · ${site.title}` },
    description: site.description,
    alternates: { types: { "application/rss+xml": "/feed.xml" } },
  };
}
const themeScript = `(function(){try{var t=localStorage.getItem('bloggr-theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}})()`;
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const settings = await getSiteSettings();
  return (
    <html lang={settings.locale.split("-")[0] || "en"} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        data-typography={settings.typography || "editorial"}
        style={{ "--brand-accent": settings.accent } as CSSProperties}
      >
        <ThemeProvider>
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
