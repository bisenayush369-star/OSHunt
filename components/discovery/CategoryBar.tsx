"use client";

import { useEffect } from "react";
import {
  BrainCircuit, Code2, Server, Boxes, Terminal,
  ShieldCheck, HardDrive, Gem, GraduationCap, Film,
  Cpu, BookOpen, Database, CheckCircle, Wifi, Smartphone,
  Palette, FileText, Wrench, Briefcase, Package,
  TrendingUp, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Category } from "@/types/discovery";

export const CATEGORIES: Category[] = [
  { id: "movies-anime", label: "Anime", query: "anime stars:>50" },
  { id: "ai-ml", label: "AI & ML", query: "topic:machine-learning stars:>300" },
  { id: "llm-models", label: "LLM Models", query: "topic:llm stars:>100" },
  { id: "frontend", label: "Frontend", query: "topic:frontend stars:>300" },
  { id: "backend", label: "Backend", query: "topic:backend stars:>300" },
  { id: "devops", label: "DevOps", query: "topic:devops stars:>200" },
  { id: "databases", label: "Databases", query: "topic:database stars:>300" },
  { id: "testing", label: "Testing", query: "topic:testing stars:>200" },
  { id: "apis", label: "Free APIs", query: "topic:api stars:>200" },
  { id: "mobile", label: "Mobile Dev", query: "topic:mobile stars:>300" },
  { id: "courses", label: "Courses", query: "(topic:tutorial OR topic:course OR topic:learning) stars:>100" },
  { id: "cli", label: "CLI Tools", query: "topic:cli stars:>200" },
  { id: "security", label: "Security", query: "topic:security stars:>300" },
  { id: "self-hosted", label: "Self-Hosted", query: "topic:selfhosted stars:>300" },
  { id: "frameworks", label: "Frameworks", query: "topic:framework stars:>300" },
  { id: "design-tools", label: "Design Tools", query: "topic:design stars:>100" },
  { id: "documentation", label: "Documentation", query: "topic:documentation stars:>100" },
  { id: "tools", label: "Dev Tools", query: "topic:developer-tools stars:>200" },
  { id: "jobs", label: "Job Resources", query: "(job OR jobs OR career) in:name,description,readme stars:>50" },
  { id: "hidden-gems", label: "Hidden Gems", query: "stars:50..2000 pushed:>{recent} archived:false" },
  { id: "best-beginner", label: "Beginner Friendly", query: "good-first-issues:>5 help-wanted-issues:>3", sort: "updated" },
];

const CATEGORY_ICONS: Record<string, typeof BrainCircuit> = {
  "movies-anime": Film,
  "ai-ml": BrainCircuit,
  "llm-models": Cpu,
  frontend: Code2,
  backend: Server,
  devops: Boxes,
  databases: Database,
  testing: CheckCircle,
  apis: Wifi,
  mobile: Smartphone,
  courses: BookOpen,
  cli: Terminal,
  security: ShieldCheck,
  "self-hosted": HardDrive,
  frameworks: Package,
  "design-tools": Palette,
  documentation: FileText,
  tools: Wrench,
  jobs: Briefcase,
  "hidden-gems": Gem,
  "best-beginner": GraduationCap,
};

const PRIMARY_IDS = [
  "ai-ml",
  "frontend",
  "backend",
  "devops",
  "best-beginner",
  "hidden-gems",
  "cli",
  "jobs",
];

const PRIMARY_CATEGORIES = CATEGORIES.filter((c) => PRIMARY_IDS.includes(c.id));
const MORE_CATEGORIES = CATEGORIES.filter((c) => !PRIMARY_IDS.includes(c.id));

const MORE_TRIGGER_KEY = "__more-trigger__";

interface CategoryBarProps {
  active: Category;
  onSelect: (category: Category) => void;
}

function pillClasses(isActive: boolean) {
  return isActive
    ? "border-[#a8ff3e] bg-[#a8ff3e] text-[#090909] font-semibold shadow-[0_0_16px_-2px_rgba(168,255,62,0.45)]"
    : "border-white/10 bg-white/[0.03] text-neutral-400 font-medium hover:border-white/20 hover:bg-white/[0.06] hover:text-neutral-200";
}

const PILL_BASE =
  "inline-flex shrink-0 snap-start cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-2 text-[13px] transition-all duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a8ff3e]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#090909]";

export function CategoryBar({ active, onSelect }: CategoryBarProps) {
  const activeInMore = MORE_CATEGORIES.find((c) => c.id === active.id);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const targetKey = activeInMore ? MORE_TRIGGER_KEY : active.id;
    const target = document.getElementById(`category-pill-${targetKey}`);
    target?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }, [active.id, activeInMore]);

  const handleMoreSelect = (id: string) => {
    const category = MORE_CATEGORIES.find((c) => c.id === id);
    if (category) onSelect(category);
  };

  const TriggerIcon = activeInMore ? (CATEGORY_ICONS[activeInMore.id] ?? TrendingUp) : TrendingUp;

  return (
    <div className="w-full" role="group" aria-label="Filter by category">
      <div className="category-row flex items-center gap-2 overflow-x-auto scroll-smooth motion-reduce:scroll-auto snap-x snap-proximity pb-1 [-webkit-overflow-scrolling:touch] [mask-image:linear-gradient(to_right,transparent,black_5%,black_95%,transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {PRIMARY_CATEGORIES.map((c) => {
          const isActive = active.id === c.id;
          const Icon = CATEGORY_ICONS[c.id] ?? TrendingUp;
          return (
            <Button
              key={c.id}
              id={`category-pill-${c.id}`}
              type="button"
              variant="ghost"
              aria-pressed={isActive}
              onClick={() => onSelect(c)}
              className={`${PILL_BASE} ${pillClasses(isActive)}`}
            >
              <Icon size={13} strokeWidth={2} aria-hidden="true" />
              {c.label}
            </Button>
          );
        })}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              id={`category-pill-${MORE_TRIGGER_KEY}`}
              type="button"
              variant="ghost"
              className={`${PILL_BASE} ${pillClasses(Boolean(activeInMore))}`}
            >
              {activeInMore ? (
                <>
                  <TriggerIcon size={13} strokeWidth={2} aria-hidden="true" />
                  {activeInMore.label}
                </>
              ) : (
                "More"
              )}
              <ChevronDown size={13} strokeWidth={2} aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="max-h-[60vh] w-56 overflow-y-auto">
            <DropdownMenuLabel className="text-xs text-neutral-500">
              More categories
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup value={active.id} onValueChange={handleMoreSelect}>
              {MORE_CATEGORIES.map((c) => {
                const Icon = CATEGORY_ICONS[c.id] ?? TrendingUp;
                return (
                  <DropdownMenuRadioItem
                    key={c.id}
                    value={c.id}
                    className="cursor-pointer gap-2 text-[13px] data-[state=checked]:font-semibold data-[state=checked]:text-[#a8ff3e]"
                  >
                    <Icon size={14} strokeWidth={2} aria-hidden="true" />
                    {c.label}
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
