import * as React from "react";

type CollapsibleContextValue = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
};

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(null);

export function Collapsible({
  open,
  onOpenChange,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  return (
    <CollapsibleContext.Provider value={{ open, onOpenChange }}>
      <div {...props}>{children}</div>
    </CollapsibleContext.Provider>
  );
}

export function CollapsibleTrigger({
  children,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const context = React.useContext(CollapsibleContext);

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = (event) => {
    onClick?.(event);
    if (!event.defaultPrevented) {
      context?.onOpenChange?.(!context.open);
    }
  };

  return (
    <button type="button" onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

export function CollapsibleContent({
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const context = React.useContext(CollapsibleContext);

  if (!context?.open) {
    return null;
  }

  return <div {...props}>{children}</div>;
}
