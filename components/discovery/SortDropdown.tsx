"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SORT_LABELS } from "@/types/discovery";
import type { SortOption } from "@/types/discovery";

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

const OPTIONS = Object.keys(SORT_LABELS) as SortOption[];

export function SortDropdown({ value, onChange }: SortDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div className="sort-wrap" ref={wrapRef}>
      <Button
        type="button"
        variant="outline"
        className="toggle-btn"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <ArrowUpDown size={13} strokeWidth={2} aria-hidden="true" />
        {SORT_LABELS[value]}
      </Button>
      {open && (
        <div className="sort-panel" role="listbox">
          {OPTIONS.map((opt) => (
            <button
              key={opt}
              type="button"
              role="option"
              aria-selected={value === opt}
              className={`sort-option ${value === opt ? "active" : ""}`}
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {SORT_LABELS[opt]}
                {value === opt && <Check size={13} strokeWidth={2.5} aria-hidden="true" />}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
