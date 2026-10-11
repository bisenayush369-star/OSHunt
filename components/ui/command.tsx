import * as React from "react";

import { cn } from "@/components/lib/utils";

type CommandProps = React.HTMLAttributes<HTMLDivElement> & { loop?: boolean };

type CommandGroupProps = React.HTMLAttributes<HTMLDivElement> & { heading?: string };

type CommandItemProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { value?: string; onSelect?: () => void };

const Command = React.forwardRef<HTMLDivElement, CommandProps>(
  ({ className, loop: _loop, ...props }, ref) => (
    <div ref={ref} className={cn("flex h-full w-full flex-col overflow-hidden rounded-lg bg-[#111111] text-white", className)} {...props} />
  ),
);
Command.displayName = "Command";

const CommandInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md border border-white/10 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-white/40 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  ),
);
CommandInput.displayName = "CommandInput";

const CommandList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("max-h-[300px] overflow-y-auto p-1", className)} {...props} />,
);
CommandList.displayName = "CommandList";

const CommandEmpty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("px-2 py-6 text-center text-sm text-white/60", className)} {...props} />,
);
CommandEmpty.displayName = "CommandEmpty";

const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ className, heading, children, ...props }, ref) => (
    <div ref={ref} className={cn("overflow-hidden p-1 text-white", className)} {...props}>
      {heading ? <div className="px-2 pb-1 pt-2 text-[10px] font-medium uppercase tracking-[0.12em] text-white/40">{heading}</div> : null}
      {children}
    </div>
  ),
);
CommandGroup.displayName = "CommandGroup";

const CommandSeparator = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("my-1 h-px bg-white/10", className)} {...props} />,
);
CommandSeparator.displayName = "CommandSeparator";

const CommandItem = React.forwardRef<HTMLButtonElement, CommandItemProps>(
  ({ className, onSelect, onClick, value: _value, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        "flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/5 hover:text-white focus:bg-white/5 focus:outline-none",
        className,
      )}
      onClick={onSelect ?? onClick}
      {...props}
    />
  ),
);
CommandItem.displayName = "CommandItem";

export {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
};
