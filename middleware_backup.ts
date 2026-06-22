import { auth } from "@/lib/auth";

export default auth((req) => {});

export const config = {
  // Specify the exact routes you want to protect from logged-out users
  matcher: [
    "/hunt", 
    "/analyze/:path*",
    "/api/issues/:path*",
    "/api/analyze/:path*"
  ],
};