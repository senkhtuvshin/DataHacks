"use client";

import { Bookmark, X, GitCompare } from "lucide-react";
import type { SavedLocation } from "@/lib/api";

interface Props {
  saved:     SavedLocation[];
  onRemove:  (wellName: string) => void;
  onCompare: () => void;
  onSelect:  (s: SavedLocation) => void;
}

export function SavedLocations({ saved, onRemove, onCompare, onSelect }: Props) {
  if (saved.length === 0) return null;

  const canCompare = saved.length >= 2;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-20 bg-z900 border-t border-z800">
      <div className="flex items-center gap-3 px-4 py-2 overflow-x-auto">

        {/* Label */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Bookmark size={11} className="text-z400" />
          <span className="text-z500 text-[10px] font-mono tracking-wider uppercase whitespace-nowrap">
            {saved.length} Saved
          </span>
        </div>

        <span className="w-px h-3 bg-z800 flex-shrink-0" />

        {/* Saved chips */}
        <div className="flex items-center gap-1.5 flex-1 overflow-x-auto">
          {saved.map((s) => (
            <div
              key={s.wellName}
              className="flex items-center gap-2 bg-z850 border border-z800 px-2.5 py-1 flex-shrink-0 group hover:border-z700 transition-colors"
            >
              <button onClick={() => onSelect(s)} className="flex items-center gap-1.5">
                <ScoreDot score={s.ventScore} />
                <span className="text-z300 text-[10px] font-mono">{s.wellName}</span>
                <span className="text-z600 text-[10px] font-mono">{s.ventScore}</span>
              </button>
              <button
                onClick={() => onRemove(s.wellName)}
                className="text-z700 hover:text-sig-red transition-colors opacity-0 group-hover:opacity-100"
              >
                <X size={9} />
              </button>
            </div>
          ))}
        </div>

        {/* Compare button */}
        <div className="relative flex-shrink-0 group/cmp">
          <button
            onClick={canCompare ? onCompare : undefined}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono tracking-wider uppercase border transition-colors ${
              canCompare
                ? "bg-z850 border-z700 text-z200 hover:border-z400 cursor-pointer"
                : "bg-z900 border-z800 text-z600 cursor-not-allowed"
            }`}
          >
            <GitCompare size={11} />
            {canCompare ? `Compare (${saved.length})` : "Compare"}
          </button>
          {!canCompare && (
            <div className="absolute bottom-full right-0 mb-1.5 px-2.5 py-1.5 bg-z850 border border-z800 text-[10px] text-z500 whitespace-nowrap opacity-0 group-hover/cmp:opacity-100 transition-opacity pointer-events-none font-mono">
              Save {2 - saved.length} more to compare
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScoreDot({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-sig-green" :
    score >= 45 ? "bg-sig-amber" :
                  "bg-sig-red";
  return <span className={`w-1.5 h-1.5 ${color} flex-shrink-0`} />;
}
