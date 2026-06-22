import type { Metadata } from "next";
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper"; // 🔥 1. Import the wrapper

export const metadata: Metadata = {
  title: "OSHunt — Find bugs. Fix them. Get known.",
  description: "AI-powered open source contribution platform",
  icons: {
    icon: "/favicon.png"
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* 🔥 2. Wrap your children with the SessionWrapper */}
        <SessionWrapper>
          {children}
        </SessionWrapper>
      </body>
    </html>
  );
}