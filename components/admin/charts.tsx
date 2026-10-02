"use client";
import { useEffect, useId, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";

export const EASE = [0.16, 1, 0.3, 1] as const;

export function AnimatedNumber({ value }: { value?: number }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    if (value === undefined) return;
    if (reduce) {
      setShown(value);
      return;
    }
    const c = animate(from.current, value, {
      duration: 1.1,
      ease: EASE,
      onUpdate: (v) => {
        from.current = v;
        setShown(Math.round(v));
      },
    });
    return () => c.stop();
  }, [value, reduce]);
  return <span className="tnum">{value === undefined ? "—" : shown.toLocaleString("en-US")}</span>;
}

export function spot(reduce: boolean | null) {
  return {
    onMouseMove: (e: React.MouseEvent<HTMLElement>) => {
      if (reduce) return;
      const el = e.currentTarget;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      el.style.setProperty("--mx", `${x}px`);
      el.style.setProperty("--my", `${y}px`);
      el.style.transform = `perspective(800px) rotateX(${((y - r.height / 2) / (r.height / 2)) * -3}deg) rotateY(${((x - r.width / 2) / (r.width / 2)) * 3}deg)`;
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      e.currentTarget.style.transform = "";
    },
  };
}

type R = "1d" | "7d" | "30d" | "6m";
const UNIT: Record<R, { adj: string; noun: string }> = {
  "1d": { adj: "Hourly", noun: "hour" },
  "7d": { adj: "Daily", noun: "day" },
  "30d": { adj: "Daily", noun: "day" },
  "6m": { adj: "Weekly", noun: "week" },
};

function AdmTooltip({ active, payload, label, name }: { active?: boolean; payload?: { value?: number }[]; label?: string; name: string }) {
  if (!active || !payload?.length) return null;
  return <div className="adm-tt"><span>{label}</span><b>{payload[0].value}</b><small>{name}</small></div>;
}

export function UsagePanel({ title, sub, data, color, dashed, range, ranges, onRange }: {
  title: string;
  sub: string;
  data: { label: string; value: number }[];
  color: string;
  dashed?: boolean;
  range: R;
  ranges: { key: R; label: string }[];
  onRange: (r: R) => void;
}) {
  const id = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const u = UNIT[range];
  const total = data.reduce((a, b) => a + b.value, 0);
  const avg = data.length ? (total / data.length).toFixed(1) : "0";
  const peak = data.reduce((m, d) => (d.value > m.value ? d : m), { label: "", value: 0 });

  return (
    <Card className="adm-card adm-win">
      <div className="adm-winbar">
        <i />
        <i />
        <i />
        <span className="adm-wintitle">{title} — {sub}/{u.noun}</span>
        <div className="adm-rt" role="tablist" aria-label="Time range">
          {ranges.map((r) => (
            <button key={r.key} role="tab" aria-selected={r.key === range} data-on={r.key === range} onClick={() => onRange(r.key)}>{r.label}</button>
          ))}
        </div>
      </div>
      <div className="adm-win-body">
        {!data.length ? (
          <div className="adm-skel" style={{ height: 220 }} />
        ) : (
          <div className="adm-rc" role="img" style={{ width: "100%", height: 220 }} aria-label={`${title}: ${total} in total, ${avg} per ${u.noun} on average, peak ${peak.value} on ${peak.label}`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart key={range} data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,.07)" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: "#7a7a7a", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={28} />
                <YAxis tick={{ fill: "#7a7a7a", fontSize: 10 }} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
                <Tooltip content={<AdmTooltip name={sub} />} cursor={{ stroke: "rgba(255,255,255,.18)", strokeWidth: 1 }} />
                <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} strokeDasharray={dashed ? "6 5" : undefined} fill={`url(#${id})`} isAnimationActive={!reduce} animationDuration={900} activeDot={{ r: 4, fill: color, stroke: "#090909", strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="adm-wstats">
          <div><small>Total in range</small><b>{total.toLocaleString("en-US")}</b></div>
          <div><small>{u.adj} average</small><b>{avg}</b></div>
          <div><small>Peak {u.noun}</small><b className="lime">{peak.value}</b></div>
        </div>
      </div>
    </Card>
  );
}
