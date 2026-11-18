"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Radix portals (drawer, dialogs, command menu) render under <body>, outside `.osa-root`, so they
 * would not see the admin tokens. While the admin is mounted this puts `osa-body` on <body> and a
 * dark background on <html> (so iOS overscroll and the area behind a bounce are dark), and removes
 * both when you navigate back to the rest of OSHunt. No next/font here: the families come from the
 * site's own globals.css.
 */
export function AdminScope() {
  useEffect(() => {
    const { body, documentElement: html } = document;
    const previous = { background: html.style.backgroundColor, scheme: html.style.colorScheme };
    body.classList.add("osa-body");
    html.style.backgroundColor = "#090909";
    html.style.colorScheme = "dark";
    return () => {
      body.classList.remove("osa-body");
      html.style.backgroundColor = previous.background;
      html.style.colorScheme = previous.scheme;
    };
  }, []);

  return null;
}

/**
 * The admin's root element. It is rendered by the dashboard and the sign-in form themselves (not by app/admin/layout.tsx),
 * so a visitor without the cookie gets a plain 404 with none of the admin's wrapper, classes or colours.
 */
export function AdminRoot({ children }: { children: ReactNode }) {
  return (
    <div className="osa-root">
      <AdminScope />
      {children}
    </div>
  );
}
