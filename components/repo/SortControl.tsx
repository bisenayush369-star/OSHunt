"use client"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SORT_OPTIONS, type SortKey } from "@/lib/repo-types"

const SortIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M6 12h12M10 18h4" />
  </svg>
)
const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const ChevronIcon = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export function SortControl({ value, onChange }: { value: SortKey; onChange: (key: SortKey) => void }) {
  const current = SORT_OPTIONS.find(o => o.value === value)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-[#1a1a1a] bg-[#050505] px-3 text-[12.5px] font-medium text-[#ccc] transition-colors hover:border-[#a8ff3e]/30 hover:text-[#a8ff3e]"
        >
          <SortIcon />
          {current?.label ?? "Sort"}
          <span className="opacity-60"><ChevronIcon /></span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-52 border-[#1a1a1a] bg-[#0a0a0a]/95 p-1.5 backdrop-blur-md">
        {SORT_OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt.value}
            onSelect={() => onChange(opt.value)}
            className={`flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-[13px] focus:bg-[#151515] ${
              opt.value === value ? "text-[#a8ff3e]" : "text-[#ccc]"
            }`}
          >
            {opt.label}
            {opt.value === value && <CheckIcon />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
