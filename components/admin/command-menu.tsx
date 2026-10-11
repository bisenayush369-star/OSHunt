"use client";

import { Eye, EyeOff, LayoutDashboard, LogOut, RefreshCw, Timer, Users as UsersIcon } from "lucide-react";
import { RANGES, RANGE_META, type AdminUser, type RangeKey } from "@/components/lib/admin/contract";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Face } from "./face";
import { cx } from "./format";

type View = "overview" | "users";

/**
 * Cmd/Ctrl+K. Built from Dialog + Command (not CommandDialog) so the same code works on
 * every shadcn version and so the dialog can take the console's dark surface class.
 */
export function CommandMenu({
  open,
  onOpenChange,
  users,
  mask,
  onView,
  onRange,
  onOpenUser,
  onSync,
  onToggleMask,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  users: AdminUser[] | null;
  mask: boolean;
  onView: (view: View) => void;
  onRange: (range: RangeKey) => void;
  onOpenUser: (id: string) => void;
  onSync: () => void;
  onToggleMask: () => void;
  onSignOut: () => void;
}) {
  const done = (fn: () => void) => () => {
    onOpenChange(false);
    fn();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cx("osa-surface", "osa-palette", mask && "osa-mask")}>
        <DialogTitle className="osa-sr">Command menu</DialogTitle>
        <DialogDescription className="osa-sr">Search accounts or run an action.</DialogDescription>
        <Command className="osa-cmd" loop>
          <CommandInput placeholder="Search accounts or type a command" />
          <CommandList>
            <CommandEmpty>Nothing matches that.</CommandEmpty>

            <CommandGroup heading="Go to">
              <CommandItem value="overview dashboard" onSelect={done(() => onView("overview"))}>
                <LayoutDashboard aria-hidden="true" />
                Overview
              </CommandItem>
              <CommandItem value="accounts users list" onSelect={done(() => onView("users"))}>
                <UsersIcon aria-hidden="true" />
                Accounts
              </CommandItem>
            </CommandGroup>

            <CommandGroup heading="Time range">
              {RANGES.map((range) => (
                <CommandItem
                  key={range}
                  value={`range ${range} last ${RANGE_META[range].long}`}
                  onSelect={done(() => {
                    onView("overview");
                    onRange(range);
                  })}
                >
                  <Timer aria-hidden="true" />
                  Last {RANGE_META[range].long}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandGroup heading="Actions">
              <CommandItem value="sync refresh now" onSelect={done(onSync)}>
                <RefreshCw aria-hidden="true" />
                Sync now
              </CommandItem>
              <CommandItem value="privacy mask blur personal details" onSelect={done(onToggleMask)}>
                {mask ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
                {mask ? "Show personal details" : "Hide personal details"}
              </CommandItem>
              <CommandItem value="sign out log out" onSelect={done(onSignOut)}>
                <LogOut aria-hidden="true" />
                Sign out
              </CommandItem>
            </CommandGroup>

            {users && users.length > 0 ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Accounts">
                  {users.slice(0, 40).map((user) => (
                    <CommandItem
                      key={user.id}
                      value={`${user.name} ${user.email} ${user.githubUsername ?? ""} ${user.id}`}
                      onSelect={done(() => onOpenUser(user.id))}
                    >
                      <Face name={user.name} size={22} />
                      <span className="osa-pii">{user.name}</span>
                      <span className="osa-cmd-sub osa-pii">{user.githubUsername ? `@${user.githubUsername}` : user.email}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
