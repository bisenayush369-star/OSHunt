import { Heart } from "lucide-react";

export function SecretHeart() {
  return (
    <span
      aria-label="Love for open source"
      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-black/20 p-1.5 text-pink-300"
      title="Built with love"
    >
      <Heart className="h-3.5 w-3.5" fill="currentColor" />
    </span>
  );
}
