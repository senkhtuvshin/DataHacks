"use client";

import { Settings } from "lucide-react";

interface Props {
  onSettingsClick: () => void;
}

export function Header({ onSettingsClick }: Props) {
  return (
    <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3 pointer-events-none">

      {/* Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 bg-z200 flex items-center justify-center">
          <span className="text-z950 font-bold text-xs font-mono">V</span>
        </div>
        <div>
          <p className="text-z50 font-semibold text-xs leading-tight tracking-[0.12em] uppercase">VENT</p>
          <p className="text-z600 text-[9px] tracking-[0.2em] uppercase">Geothermal Intelligence</p>
        </div>
      </div>

      {/* Legend + settings */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-3 bg-z900 border border-z800 px-3 py-1.5">
          <LegendItem hex="#22c55e" label="Low Risk" />
          <span className="w-px h-3 bg-z800" />
          <LegendItem hex="#f59e0b" label="Moderate" />
          <span className="w-px h-3 bg-z800" />
          <LegendItem hex="#ef4444" label="High Risk" />
          <span className="w-px h-3 bg-z800" />
          <span className="text-z600 text-[10px] font-mono">Rekoske et al. 2025</span>
        </div>

        <button
          onClick={onSettingsClick}
          className="w-8 h-8 flex items-center justify-center bg-z900 border border-z800 text-z600 hover:text-z200 hover:border-z700 transition-colors"
          title="Business Profile Settings"
        >
          <Settings size={13} />
        </button>
      </div>
    </div>
  );
}

function LegendItem({ hex, label }: { hex: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {/* inline style — guaranteed render regardless of Tailwind JIT scanning */}
      <span className="inline-block flex-shrink-0" style={{ width: 8, height: 8, background: hex }} />
      <span className="text-[10px]" style={{ color: "#a1a1aa" }}>{label}</span>
    </div>
  );
}
