"use client";

import { X, ArrowUp, ArrowDown, Minus } from "lucide-react";
import type { SavedLocation, BusinessProfile } from "@/lib/api";
import { computeDecision, computeInsurance } from "@/lib/api";

interface Props {
  locations: SavedLocation[];
  profile:   BusinessProfile;
  onClose:   () => void;
  onSelect:  (s: SavedLocation) => void;
}

export function CompareModal({ locations, profile, onClose, onSelect }: Props) {
  const sites = locations.slice(0, 3);
  const best  = sites.reduce((a, b) => a.ventScore > b.ventScore ? a : b);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
      <div className="w-full max-w-5xl bg-z900 border border-z800 overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-z800 flex-shrink-0">
          <div>
            <h2 className="text-z200 font-semibold text-xs tracking-wide uppercase">Location Comparison</h2>
            <p className="text-z600 text-[10px] font-mono mt-0.5">
              {sites.length} saved sites · highest vent score highlighted
            </p>
          </div>
          <button onClick={onClose} className="text-z600 hover:text-z200 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Cards grid */}
        <div className="flex-1 overflow-auto p-5">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${sites.length}, 1fr)` }}>
            {sites.map((s) => {
              const decision  = computeDecision(s, profile);
              const insurance = computeInsurance(s, profile);
              const isBest    = s.wellName === best.wellName;

              const scoreColor =
                s.ventScore >= 70 ? "text-sig-green" :
                s.ventScore >= 45 ? "text-sig-amber" :
                                    "text-sig-red";

              return (
                <div
                  key={s.wellName}
                  className={`relative border p-4 space-y-3 ${
                    isBest ? "border-z700 bg-z850" : "border-z800 bg-z850"
                  }`}
                >
                  {/* Best label */}
                  {isBest && (
                    <div className="absolute -top-px left-0 right-0 h-0.5 bg-sig-green" />
                  )}

                  {/* Site header */}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-z200 font-mono text-xs font-semibold">{s.wellName}</p>
                      {isBest && (
                        <span className="text-[9px] font-mono text-sig-green border border-sig-green px-1.5 py-px uppercase tracking-wider">
                          BEST
                        </span>
                      )}
                    </div>
                    <p className="text-z600 text-[10px] font-mono mt-0.5">{s.county}</p>
                  </div>

                  {/* Score */}
                  <div>
                    <p className={`text-4xl font-black font-mono leading-none ${scoreColor}`}>
                      {s.ventScore}
                    </p>
                    <div className="mt-1.5 h-0.5 bg-z800">
                      <div
                        className={`h-full transition-all ${
                          s.ventScore >= 70 ? "bg-sig-green" :
                          s.ventScore >= 45 ? "bg-sig-amber" : "bg-sig-red"
                        }`}
                        style={{ width: `${s.ventScore}%` }}
                      />
                    </div>
                    <p className="text-z600 text-[10px] font-mono mt-1">Vent Score / 100</p>
                  </div>

                  {/* Metrics */}
                  <div className="space-y-1.5 border-t border-z800 pt-3">
                    <CompareRow label="Heat Score" value={s.heatScore}      unit=""     all={sites.map(x => x.heatScore)} />
                    <CompareRow label="Stability"  value={s.stabilityScore} unit=""     all={sites.map(x => x.stabilityScore)} />
                    <CompareRow label="Depth"      value={s.depthM ?? 0}    unit=" m"   all={sites.map(x => x.depthM ?? 0)} />
                    <CompareRow label="PGV"        value={+(s.pgvMs * 100).toFixed(2)} unit=" cm/s" all={sites.map(x => +(x.pgvMs * 100).toFixed(2))} lowerIsBetter />
                  </div>

                  {/* Decision */}
                  <div className="border-t border-z800 pt-3 space-y-1">
                    <p className="text-z600 text-[9px] tracking-[0.18em] uppercase">Recommendation</p>
                    <p className={`text-xs font-semibold font-mono ${
                      decision.color === "green"  ? "text-sig-green" :
                      decision.color === "amber"  ? "text-sig-amber" :
                      decision.color === "orange" ? "text-sig-amber" :
                                                    "text-sig-red"
                    }`}>{decision.action}</p>
                    {decision.capex_musd !== "N/A" && (
                      <p className="text-z600 text-[10px] font-mono">Capex: ${decision.capex_musd}M</p>
                    )}
                  </div>

                  {/* Insurance + risk */}
                  <div className="border-t border-z800 pt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-z600 text-[10px]">Insurance</span>
                      <span className={`text-xs font-bold font-mono ${insurance.color}`}>Class {insurance.class}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 flex-shrink-0 ${
                        s.riskLevel === "LOW"      ? "bg-sig-green" :
                        s.riskLevel === "MODERATE" ? "bg-sig-amber" : "bg-sig-red"
                      }`} />
                      <span className={`text-[10px] font-mono ${
                        s.riskLevel === "LOW"      ? "text-sig-green" :
                        s.riskLevel === "MODERATE" ? "text-sig-amber" : "text-sig-red"
                      }`}>{s.riskLevel} SEISMIC RISK</span>
                    </div>
                  </div>

                  <button
                    onClick={() => { onSelect(s); onClose(); }}
                    className="w-full py-1.5 bg-z800 hover:bg-z700 border border-z700 text-z300 text-[10px] font-mono tracking-wider uppercase transition-colors"
                  >
                    Open Full Analysis →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareRow({ label, value, unit, all, lowerIsBetter }: {
  label: string; value: number; unit: string; all: number[]; lowerIsBetter?: boolean;
}) {
  const max    = Math.max(...all);
  const min    = Math.min(...all);
  const isBest  = lowerIsBetter ? value === min : value === max;
  const isWorst = lowerIsBetter ? value === max : value === min;
  return (
    <div className="flex items-center justify-between">
      <span className="text-z600 text-[10px]">{label}</span>
      <div className="flex items-center gap-1">
        <span className={`text-[10px] font-mono ${
          isBest ? "text-sig-green font-semibold" :
          isWorst ? "text-sig-red" : "text-z400"
        }`}>
          {value}{unit}
        </span>
        {isBest  && <ArrowUp   size={9} className="text-sig-green" />}
        {isWorst && <ArrowDown size={9} className="text-sig-red"   />}
        {!isBest && !isWorst && <Minus size={9} className="text-z700" />}
      </div>
    </div>
  );
}
