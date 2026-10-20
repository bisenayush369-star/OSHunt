"use client"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SORT_OPTIONS, type SortKey } from "@/components/lib/repo-types"
import { ACTION_BUTTON, ChevronDownIcon, SortIcon, cx } from "./repo-ui"

export function SortControl({
  value,
  onChange,
  className,
}: {
  value: SortKey
  onChange: (key: SortKey) => void
  /** Size it from the page, e.g. "h-11 lg:h-10" to match the toolbar next to it. */
  className?: string
}) {
  const current = SORT_OPTIONS.find(o => o.value === value)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className={cx(ACTION_BUTTON, "h-10 max-w-full min-w-0 text-[#d4d4d4]", className)}
        >
          <SortIcon className="shrink-0" />
          <span className="sr-only">Sort by </span>
          <span className="min-w-0 truncate">{current?.label ?? "Sort"}</span>
          <ChevronDownIcon className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="w-56 rounded-xl border-white/10 bg-[#0c0c0c]/95 p-1.5 text-[#e5e5e5] shadow-2xl shadow-black/60 backdrop-blur-xl"
      >
        <DropdownMenuLabel className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-[#8a8a8a]">
          Sort by
        </DropdownMenuLabel>
        {/* Radio items: the menu announces "Most stars, radio item, checked" and arrow keys / typeahead just work. */}
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={next => {
            const option = SORT_OPTIONS.find(o => o.value === next)
            if (option) onChange(option.value)
          }}
        >
          {SORT_OPTIONS.map(opt => (
            <DropdownMenuRadioItem
              key={opt.value}
              value={opt.value}
              className="min-h-10 cursor-pointer rounded-lg py-2 text-[13px] text-[#d4d4d4] focus:bg-white/[0.07] focus:text-white data-[state=checked]:font-medium data-[state=checked]:text-[#a8ff3e] data-[state=checked]:focus:text-[#a8ff3e]"
            >
              {opt.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}