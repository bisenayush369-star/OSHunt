import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Outfit } from "next/font/google";
import { AdminScope } from "@/components/admin/scope";
import "./console.css";

// Same families as the OSHunt homepage, but self-hosted by next/font. This replaces the
// old @import url(fonts.googleapis.com) in admin.css, which blocked first paint.
const sans = Outfit({ subsets: ["latin"], variable: "--font-osa-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-osa-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "OSHunt admin", template: "%s | OSHunt admin" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
  themeColor: "#08090a",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const fonts = `${sans.variable} ${mono.variable}`;

  return (
    <div className={`osa-root ${fonts}`}>
      <AdminScope classNames={fonts} />
      {children}
    </div>
  );
}
