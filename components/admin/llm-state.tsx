import { Ban, CircleCheck, CircleDot, CirclePause, Gauge, KeyRound, PowerOff, TriangleAlert, Unlink, Wrench, type LucideIcon } from "lucide-react";
import { LLM_STATE_LABEL, type LlmState } from "@/components/lib/admin/contract";
import { Chip, type Tone } from "./kit";

/** One look per LLM state, used by the overview and the LLM page. Colour, icon and word always travel together. */
export const STATE_TONE: Record<LlmState, Tone> = {
  change: "bad",
  limit: "bad",
  unlinked: "warn",
  paused: "warn",
  failing: "serious",
  near: "warn",
  ok: "good",
  ready: "mute",
  off: "mute",
  nokey: "mute",
};

export const STATE_ICON: Record<LlmState, LucideIcon> = {
  change: Wrench,
  limit: Ban,
  unlinked: Unlink,
  paused: CirclePause,
  failing: TriangleAlert,
  near: Gauge,
  ok: CircleCheck,
  ready: CircleDot,
  off: PowerOff,
  nokey: KeyRound,
};

export function StateChip({ state, className }: { state: LlmState; className?: string }) {
  return (
    <Chip tone={STATE_TONE[state]} icon={STATE_ICON[state]} className={className}>
      {LLM_STATE_LABEL[state]}
    </Chip>
  );
}
