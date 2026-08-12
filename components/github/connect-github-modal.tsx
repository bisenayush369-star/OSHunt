"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ConnectGithubView } from "./connect-github-view";

export function ConnectGithubModal({
  open,
  onOpenChange,
  returnTo,
  expired,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  returnTo: string;
  expired?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto border-none bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">{expired ? "Reconnect GitHub" : "Connect GitHub"}</DialogTitle>
        <ConnectGithubView returnTo={returnTo} expired={expired} onDismiss={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
