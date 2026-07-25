import type { Metadata } from "next";
// 🔥 1. Import the Outfit font from next/font/google
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper"; 
import Footer from "@/components/ui/footer"; 

// Note: removed `next/font/google` import to avoid remote fetch during build in offline environments.
// The app falls back to system fonts defined in `globals.css`.

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
    // 🔥 3. Use system fonts via globals.css (no remote Google Fonts fetch)
    <html lang="en"> 
      <body>
        {/* 🔥 4. Wrap your children with the SessionWrapper */}
        <SessionWrapper>
          {children}
        </SessionWrapper>
        
        {/* 🔥 5. Add the Footer right before the body closes */}
        <Footer />
      </body>
    </html>
  );
}