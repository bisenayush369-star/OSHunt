import { auth } from "@/lib/auth";

export default auth(() => {
  // NextAuth handles the redirect for unauthenticated users
});

export const config = {
  matcher: [
    "/bookmarks/:path*",
    "/profile/:path*",
  ],
};