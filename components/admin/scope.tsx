"use client";

import { useEffect } from "react";

/**
 * Radix portals (Sheet, AlertDialog, Dialog) render under <body>, outside the layout's
 * wrapper div, so they would not see the next/font variables. While the admin is mounted
 * this adds those classes to <body> and sets the page background (so iOS overscroll is
 * dark), then removes everything again when you navigate away.
 */
export function AdminScope({ classNames }: { classNames: string }) {
  useEffect(() => {
    const list = classNames.split(" ").filter(Boolean);
    const { body, documentElement: html } = document;
    const previousBackground = html.style.backgroundColor;

    body.classList.add("osa-body", ...list);
    html.style.backgroundColor = "#08090a";

    return () => {
      body.classList.remove("osa-body", ...list);
      html.style.backgroundColor = previousBackground;
    };
  }, [classNames]);

  return null;
}
