"use client";
import { useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { SiteSettings } from "@/lib/types";
import { ThemeSelect } from "./ThemeProvider";
export default function Header({ settings }: { settings: SiteSettings }) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const links = settings.navigation?.length
    ? settings.navigation
    : [{ label: "Stories", href: "/blog" }];
  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link href="/" className="brand" aria-label={`${settings.title} home`}>
          {settings.logo_url && (
            <Image
              src={settings.logo_url}
              alt=""
              width={32}
              height={32}
              unoptimized
            />
          )}
          {settings.title}
          <span className="brand-dot">.</span>
        </Link>
        <div
          className="header-controls"
          onKeyDown={(event) => {
            if (event.key === "Escape" && open) {
              setOpen(false);
              toggle.current?.focus();
            }
          }}
        >
          <button
            ref={toggle}
            type="button"
            className="button menu-toggle"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen(!open)}
          >
            Menu
          </button>
          <nav
            id={menuId}
            className={`header-navigation${open ? " is-open" : ""}`}
            aria-label="Main navigation"
          >
            {links.map((link, index) => (
              <Link
                key={`${link.href}-${index}`}
                href={link.href}
                onClick={() => setOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <ThemeSelect />
        </div>
      </div>
    </header>
  );
}
export function Footer({ settings }: { settings: SiteSettings }) {
  return (
    <footer className="shell site-footer">
      <div>
        <Link href="/" className="footer-brand">
          {settings.title}
        </Link>
        <p>{settings.description}</p>
      </div>
      <nav aria-label="Footer navigation">
        <a href="/feed.xml">RSS feed</a>
        {settings.social_url && (
          <a href={settings.social_url} rel="noopener noreferrer">
            Elsewhere ↗
          </a>
        )}
        <Link href="/blog/admin">Write</Link>
      </nav>
      <small>Published with Bloggr</small>
    </footer>
  );
}
