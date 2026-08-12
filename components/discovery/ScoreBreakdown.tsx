import { Check, X } from "lucide-react";
import type { ScoreFactor } from "@/types/discovery";

interface ScoreBreakdownProps {
  factors: ScoreFactor[];
  archived: boolean;
}

export function ScoreBreakdown({ factors, archived }: ScoreBreakdownProps) {
  return (
    <div className="score-breakdown">
      {archived && (
        <div className="score-factor-row archived-note">
          <X size={11} strokeWidth={2.5} aria-hidden="true" />
          <span>Archived — score capped, not accepting contributions</span>
        </div>
      )}
      {factors.map((f) => (
        <div key={f.label} className={`score-factor-row ${f.met ? "met" : "unmet"}`}>
          {f.met ? <Check size={11} strokeWidth={2.5} aria-hidden="true" /> : <X size={11} strokeWidth={2} aria-hidden="true" />}
          <span>{f.label}</span>
          <span className="score-factor-points">{f.met ? `+${f.points}` : "0"}</span>
        </div>
      ))}
    </div>
  );
}
