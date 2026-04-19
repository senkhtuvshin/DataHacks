"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface MiniChartProps {
  data:   { label: string; value: number }[];
  title?: string;
  unit?:  string;
  /** Tailwind bg-* class used as the hover-highlight color e.g. "bg-sig-amber" */
  color?: string;
}

export function MiniChart({
  data,
  title = "Activity",
  unit  = "%",
  color = "bg-sig-green",
}: MiniChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [displayValue, setDisplayValue] = useState<number | null>(null);
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  useEffect(() => {
    if (hoveredIndex !== null) setDisplayValue(data[hoveredIndex].value);
  }, [hoveredIndex, data]);

  return (
    <div
      onMouseLeave={() => { setHoveredIndex(null); setTimeout(() => setDisplayValue(null), 80); }}
      style={{ background: "#18181b", border: "1px solid #27272a" }}
      className="w-full p-3 flex flex-col gap-2"
    >
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className={cn("inline-block w-1.5 h-1.5 flex-shrink-0", color)} />
          <span className="text-[9px] tracking-[0.18em] uppercase font-mono" style={{ color: "#52525b" }}>{title}</span>
        </div>
        <span
          className="text-[10px] font-mono tabular-nums transition-opacity duration-100"
          style={{ color: "#e4e4e7", opacity: displayValue !== null ? 1 : 0 }}
        >
          {displayValue ?? 0}{unit}
        </span>
      </div>

      {/* Bar chart — each column = [flex track bg-z800] + [label row] */}
      <div className="flex gap-px" style={{ height: 52 }}>
        {data.map((item, index) => {
          const pct        = (item.value / maxValue) * 100;
          const isHovered  = hoveredIndex === index;
          const anyHovered = hoveredIndex !== null;
          const isNeighbor = anyHovered && Math.abs(index - (hoveredIndex as number)) === 1;

          // Bar fill color: default = z200 (bright zinc), hover = semantic color prop
          const barBg =
            isHovered  ? undefined       :  // handled via className (color prop)
            isNeighbor ? "#d4d4d8"       :  // z300
            anyHovered ? "#71717a"       :  // z500 dimmed
                         "#e4e4e7";          // z200 — always visible default

          return (
            <div
              key={item.label}
              className="relative flex-1 flex flex-col"
              onMouseEnter={() => setHoveredIndex(index)}
            >
              {/* Track + bar area — flex-1 fills all height except label */}
              <div
                className="flex-1 flex flex-col justify-end relative"
                style={{ background: "#27272a" /* z800 track */ }}
              >
                {/* Bar — grows from bottom */}
                <div
                  className={cn(
                    "w-full transition-colors duration-150",
                    isHovered ? color : ""
                  )}
                  style={{
                    height: `${pct}%`,
                    minHeight: pct > 0 ? 2 : 0,
                    background: isHovered ? undefined : barBg,
                  }}
                />

                {/* Tooltip */}
                {isHovered && displayValue !== null && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 font-mono font-semibold whitespace-nowrap z-10"
                    style={{
                      bottom: "calc(100% + 2px)",
                      background: "#e4e4e7",
                      color: "#09090b",
                      fontSize: 9,
                      padding: "1px 4px",
                    }}
                  >
                    {displayValue}{unit}
                  </div>
                )}
              </div>

              {/* Label */}
              <div className="flex-shrink-0 flex items-center justify-center" style={{ height: 14 }}>
                <span
                  className="font-mono leading-none"
                  style={{
                    fontSize: 8,
                    color: isHovered ? "#d4d4d8" : "#52525b",
                  }}
                >
                  {item.label.charAt(0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
