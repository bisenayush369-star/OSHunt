import type { Metadata } from "next";
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper";
import Footer from "@/components/ui/footer";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Note: removed `next/font/google` import to avoid remote fetch during build in offline environments.
// The app falls back to system fonts defined in `globals.css`.

export const metadata: Metadata = {
  title: "OSHunt — Find bugs. Fix them. Get known.",
  description: "AI-powered open source contribution platform",
  icons: {
    icon: "/favicon.png"
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en">
      <body>
        <SessionWrapper session={session}>{children}</SessionWrapper>
        <Footer />
      </body>
    </html>
  );
}