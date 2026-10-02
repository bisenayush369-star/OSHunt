"use client";

import * as React from "react";
import { Check, CircleAlert, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type State = "idle" | "copied" | "failed";

export function CopyButton({
  value,
  label,
  className,
}: {
  value: string;
  /** Spoken as "Copy {label}" and "{label} copied". */
  label: string;
  className?: string;
}) {
  const [state, setState] = React.useState<State>("idle");

  React.useEffect(() => {
    if (state === "idle") return;
    const timer = window.setTimeout(() => setState("idle"), 2000);
    return () => window.clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("copied");
    } catch {
      // No clipboard API (an insecure page) or the browser blocked it. Say so, instead of doing nothing.
      setState("failed");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={copy}
        aria-label={`Copy ${label}`}
        className={cn("focus-visible:outline-hidden", className)}
      >
        {state === "copied" ? (
          <Check aria-hidden className="text-primary" />
        ) : state === "failed" ? (
          <CircleAlert aria-hidden className="text-destructive" />
        ) : (
          <Copy aria-hidden />
        )}
      </Button>
      <span role="status" className="sr-only">
        {state === "copied" ? `${label} copied` : state === "failed" ? `Couldn’t copy. Select the ${label} instead.` : ""}
      </span>
    </>
  );
}
