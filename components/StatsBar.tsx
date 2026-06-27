"use client";

import { useStats } from "@/lib/stats-store";
import { TOKEN_TICKER } from "@/lib/config";

function formatNum(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

const cells = [
  { key: "totalWagered", label: "TOTAL WAGERED", suffix: "$", bg: "bg-arena-mint" },
  { key: "totalBuybacks", label: "BUYBACKS", suffix: "$", bg: "bg-arena-sky" },
  { key: "totalBurned", label: "BURNED FOREVER", suffix: ` ${TOKEN_TICKER}`, bg: "bg-arena-coral" },
  { key: "roundsPlayed", label: "ROUNDS PLAYED", suffix: "", bg: "bg-arena-lavender" },
] as const;

export function StatsBar() {
  const stats = useStats();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 w-full">
      {cells.map((c) => {
        const value = stats[c.key];
        const display =
          c.key === "roundsPlayed" ? value.toLocaleString() : formatNum(value);
        return (
          <div
            key={c.key}
            className={`${c.bg} border-4 border-arena-ink shadow-pixelSm px-3 py-2 flex flex-col gap-1`}
          >
            <span className="text-[8px] tracking-widest opacity-80">{c.label}</span>
            <span className="text-[12px] md:text-[14px] tracking-tight">
              {c.suffix.startsWith(" ") ? "" : c.suffix}
              {display}
              {c.suffix.startsWith(" ") ? c.suffix : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
