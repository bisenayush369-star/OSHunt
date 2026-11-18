import "./admin.css";

/**
 * Deliberately bare. For anyone without the owner cookie, /admin and /admin/login must be indistinguishable from
 * a page that does not exist, so this layout adds no title, meta tags, wrapper element or classes. The admin's
 * own wrapper (AdminRoot), its title and its colours are produced by the pages, and only after the cookie check.
 * Fonts: Outfit and JetBrains Mono already come from app/globals.css (--font-sans / --font-mono).
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
