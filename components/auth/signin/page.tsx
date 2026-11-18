import type { Metadata } from "next";
import "./globals.css";
import SessionWrapper from "@/components/SessionWrapper"; 
import Footer from "@/components/ui/footer"; 

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
    <html lang="en" className="font-sans"> 
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