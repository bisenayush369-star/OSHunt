"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cx, initials } from "./format";

/** Avatar used everywhere an account appears. GitHub photo when linked, initials otherwise. */
export function Face({
  name,
  github,
  size = 36,
  className,
}: {
  name: string;
  github?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <Avatar className={cx("osa-face", className)} style={{ width: size, height: size }}>
      {github ? (
        <AvatarImage
          src={`https://github.com/${encodeURIComponent(github)}.png?size=${size * 2}`}
          alt=""
          referrerPolicy="no-referrer"
        />
      ) : null}
      <AvatarFallback className="osa-face-fallback" style={{ fontSize: Math.max(11, Math.round(size * 0.36)) }}>
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
