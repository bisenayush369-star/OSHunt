import type { Metadata } from "next";
// 🔥 1. Import the Outfit font from next/font/google
import { Outfit } from "next/font/google"; 
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper"; 
import Footer from "@/components/ui/footer"; 

// 🔥 2. Configure the font with the weights you need
const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

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
    // 🔥 3. Apply the font's class name to the HTML or Body tag
    <html lang="en" className={outfit.className}> 
      <body>
        {/* 🔥 4. Wrap your children with the SessionWrapper */}
        <SessionWrapper session={null}>
          {children}
        </SessionWrapper>
        
        {/* 🔥 5. Add the Footer right before the body closes */}
        <Footer />
      </body>
    </html>
  );
}