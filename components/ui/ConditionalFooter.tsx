"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/ui/footer";

export default function ConditionalFooter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideFooter = pathname?.startsWith("/admin") ?? false;

  return (
    <>
      {children}
      {!hideFooter && <Footer />}
    </>
  );
}
