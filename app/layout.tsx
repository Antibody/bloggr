// app/layout.tsx
import "./globals.css";
import { SupabaseProvider } from "./supabase-provider"; // adjust the path if needed

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Default to dark mode on the server-side render
  return (
    <html lang="en">
      {/* DO NOT add a <head> tag here. Next.js automatically manages the head. */}
      {/* Apply dark-mode class directly to body */}
      <body className="dark-mode">
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
