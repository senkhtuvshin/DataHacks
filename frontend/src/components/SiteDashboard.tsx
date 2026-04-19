"use client";

import { useState, useEffect } from "react";
import { X, Bookmark, BookmarkCheck, CheckCircle2, XCircle, Loader2, ChevronRight, GitCompare } from "lucide-react";
import type { VentScoreResponse, SimulationResponse, BusinessProfile } from "@/lib/api";
import { runSimulation, computeDecision, computeInsurance, fetchRationale } from "@/lib/api";
import { MiniChart } from "@/components/ui/mini-chart";
import { cn } from "@/lib/utils";

type Material  = "steel" | "titanium" | "composite";
type StepId    = 1 | 2 | 3 | 4 | 5;
type SigColor  = "green" | "amber" | "red";

// ── Constants ──────────────────────────────────────────────────────────────

const MAT: Record<Material, { label: string; yield: number; e_gpa: number; maxDepth: string }> = {
  steel:     { label: "Carbon Steel",     yield: 250, e_gpa: 200, maxDepth: "< 1 000 m" },
  titanium:  { label: "Grade-5 Titanium", yield: 880, e_gpa: 114, maxDepth: "Any depth" },
  composite: { label: "Carbon Composite", yield: 400, e_gpa:  70, maxDepth: "< 1 800 m" },
};

function scoreColor(v: number): SigColor { return v >= 70 ? "green" : v >= 45 ? "amber" : "red"; }
function riskColor(r: string): SigColor  { return r === "LOW" ? "green" : r === "MODERATE" ? "amber" : "red"; }
function depthLabel(m: number) { return m < 300 ? "very shallow" : m < 1000 ? "shallow" : m < 2000 ? "intermediate" : "deep"; }

const SIG: Record<SigColor, { text: string; bg: string; border: string; dot: string }> = {
  green: { text: "text-[#22c55e]", bg: "bg-[#22c55e]/10", border: "border-[#22c55e]/30", dot: "bg-[#22c55e]" },
  amber: { text: "text-[#f59e0b]", bg: "bg-[#f59e0b]/10", border: "border-[#f59e0b]/30", dot: "bg-[#f59e0b]" },
  red:   { text: "text-[#ef4444]", bg: "bg-[#ef4444]/10", border: "border-[#ef4444]/30", dot: "bg-[#ef4444]" },
};


// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  score:      VentScoreResponse;
  profile:    BusinessProfile;
  saved:      boolean;
  savedCount: number;
  onClose:    () => void;
  onCertify:  (sim: SimulationResponse) => void;
  onSave:     () => void;
  onCompare:  () => void;
}

// ── Main component ─────────────────────────────────────────────────────────

export function SiteDashboard({ score, profile, saved, savedCount, onClose, onCertify, onSave, onCompare }: Props) {
  const [activeStep,  setActiveStep]  = useState<StepId>(3);
  const [material,    setMaterial]    = useState<Material>("steel");
  const [depth,       setDepth]       = useState(500);
  const [simResult,   setSimResult]   = useState<SimulationResponse | null>(null);
  const [running,     setRunning]     = useState(false);
  const [simErr,      setSimErr]      = useState<string | null>(null);
  const [rationale,   setRationale]   = useState<string | null>(null);
  const [ratLoading,  setRatLoading]  = useState(true);

  // Fetch Gemini rationale when site or profile changes
  useEffect(() => {
    setRationale(null);
    setRatLoading(true);
    fetchRationale(score, profile)
      .then((text) => setRationale(text))
      .catch(() => setRationale(
        `${score.wellName} in ${score.county} yields a Vent Score of ${score.ventScore}/100 ` +
        `with a ${score.riskLevel.toLowerCase()} seismic risk profile. ` +
        `PGV of ${(score.pgvMs * 100).toFixed(4)} cm/s recorded by Rekoske et al. 2025.`
      ))
      .finally(() => setRatLoading(false));
  }, [score.wellName, profile.useCase, profile.riskTolerance, profile.companySize]);

  const decision   = computeDecision(score, profile);
  const insurance  = computeInsurance(score, profile);
  const sfRequired = profile.riskTolerance === "conservative" ? 5 : profile.riskTolerance === "aggressive" ? 1.5 : 3;
  const sc         = scoreColor(score.ventScore);
  const rc         = riskColor(score.riskLevel);

  // Live stress estimate
  const m   = MAT[material];
  const str = (m.e_gpa * 1000 * score.pgvMs) / 800 * (1 + (depth / 500) * 0.12);
  const th  = Math.max(0, (depth - 500) * (material === "steel" ? 0.40 : material === "composite" ? 0.25 : 0.15));
  const eff = Math.max(10, m.yield - th);
  const sf  = eff / Math.max(str, 1e-6);
  const ok  = sf >= sfRequired;

  // Seismic radial chart
  const base = score.pgvMs * 100;
  const pgvData = ["N","NE","E","SE","S","SW","W"].map((l, i) =>
    ({ label: l, value: +(base * [0.92,1.08,0.87,1.15,0.95,1.03,0.78][i]).toFixed(3) })
  );

  const stepStatus = (id: StepId) => id < activeStep ? "done" : id === activeStep ? "active" : "pending";

  async function runSim() {
    setRunning(true); setSimErr(null);
    try {
      const r = await runSimulation({ lat: score.lat, lon: score.lon, material, pipe_depth_m: depth, risk_tolerance: profile.riskTolerance });
      setSimResult(r); setActiveStep(5);
    } catch { setSimErr("API error — check backend."); }
    finally { setRunning(false); }
  }

  return (
    <div
      className="absolute top-0 right-0 h-full bg-[#09090b] border-l border-[#27272a] animate-slidein z-20 flex flex-col"
      style={{ width: "min(1120px, calc(100vw - 56px))" }}
    >
      {/* ── Header bar ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-[#27272a] bg-[#111113] flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className={cn("w-1.5 h-1.5 rounded-full", SIG[sc].dot)} />
          <span className="font-mono text-[#fafafa] text-sm font-semibold tracking-wide">{score.wellName}</span>
          <span className="text-[#52525b] text-xs">·</span>
          <span className="text-[#a1a1aa] text-xs">{score.county}</span>
          <span className="text-[#52525b] text-xs">·</span>
          <span className="font-mono text-[#71717a] text-xs">{score.lat.toFixed(4)}, {score.lon.toFixed(4)}</span>
        </div>
        <div className="flex items-center gap-2">
          {savedCount >= 2 && (
            <button onClick={onCompare} className="flex items-center gap-1.5 px-2.5 py-1 border border-[#27272a] hover:border-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] text-xs transition-colors">
              <GitCompare size={11} /> COMPARE ({savedCount})
            </button>
          )}
          {savedCount === 1 && saved && (
            <span className="text-[#52525b] text-[11px]">Save 1 more to compare</span>
          )}
          <button onClick={onSave} className={cn("p-1.5 border transition-colors", saved ? "border-[#22c55e] text-[#22c55e]" : "border-[#27272a] text-[#52525b] hover:border-[#3f3f46] hover:text-[#a1a1aa]")}>
            {saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
          </button>
          <button onClick={onClose} className="p-1.5 border border-[#27272a] hover:border-[#3f3f46] text-[#52525b] hover:text-[#a1a1aa] transition-colors"><X size={13} /></button>
        </div>
      </div>

      {/* ── 3-column grid ───────────────────────────────────────────── */}
      <div className="flex-1 grid overflow-hidden" style={{ gridTemplateColumns: "248px 1fr 272px" }}>

        {/* ══════════════════════════════════════════════════════════════
            LEFT — Simulation pipeline / vertical stepper
        ══════════════════════════════════════════════════════════════ */}
        <div className="border-r border-[#27272a] flex flex-col overflow-y-auto bg-[#09090b]">
          {/* Pipeline label */}
          <div className="px-4 py-3 border-b border-[#27272a]">
            <span className="text-[10px] font-semibold tracking-[0.12em] text-[#52525b] uppercase">Vent Certification Pipeline</span>
          </div>

          <div className="p-3 space-y-0.5 flex-1">
            <PipelineStep id={1} label="SITE IDENTIFIED"     status={stepStatus(1)} onClick={() => setActiveStep(1)}>
              {activeStep === 1 && (
                <div className="space-y-1">
                  <KV k="Well ID"   v={score.wellName} mono />
                  <KV k="County"    v={score.county} />
                  <KV k="Coords"    v={`${score.lat.toFixed(4)}, ${score.lon.toFixed(4)}`} mono />
                  <KV k="Dist."     v={`${score.distanceKm} km from query`} mono />
                </div>
              )}
            </PipelineStep>

            <PipelineStep id={2} label="GEOLOGICAL ANALYSIS" status={stepStatus(2)} onClick={() => setActiveStep(2)}>
              {activeStep === 2 && (
                <div className="space-y-1">
                  <KV k="Depth"     v={score.depthM ? `${score.depthM} m` : "N/A"} mono />
                  <KV k="Class"     v={score.depthM ? depthLabel(score.depthM) : "—"} />
                  <KV k="Formation" v="TD logged" />
                </div>
              )}
            </PipelineStep>

            <PipelineStep id={3} label="SEISMIC ASSESSMENT"  status={stepStatus(3)} onClick={() => setActiveStep(3)}>
              {activeStep === 3 && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <KV k="PGV"    v={`${(score.pgvMs*100).toFixed(4)} cm/s`} mono />
                    <KV k="Risk"   v={score.riskLevel} color={rc} />
                    <KV k="Sim ID" v={score.scrippsSImId} mono small />
                  </div>
                  <MiniChart data={pgvData} title="PGV RADIAL" unit=" cm/s" color="bg-sig-amber" />
                </div>
              )}
            </PipelineStep>

            <PipelineStep id={4} label="CONFIGURE SIMULATION" status={stepStatus(4)} onClick={() => setActiveStep(4)}>
              {activeStep === 4 && (
                <div className="space-y-3">
                  {/* Material */}
                  <div>
                    <p className="text-[10px] text-[#52525b] uppercase tracking-widest mb-1.5">Pipe Material</p>
                    {(Object.keys(MAT) as Material[]).map((k) => (
                      <button key={k} onClick={(e) => { e.stopPropagation(); setMaterial(k); }}
                        className={cn("w-full flex justify-between items-center px-2.5 py-2 border mb-1 text-xs transition-colors",
                          material === k ? "border-[#e4e4e7] bg-[#18181b] text-[#fafafa]" : "border-[#27272a] bg-[#09090b] text-[#71717a] hover:border-[#3f3f46] hover:text-[#a1a1aa]")}>
                        <span>{MAT[k].label}</span>
                        <span className="font-mono">{MAT[k].yield} MPa · {MAT[k].maxDepth}</span>
                      </button>
                    ))}
                  </div>
                  {/* Depth */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-2">
                      <span className="text-[#52525b] uppercase tracking-widest">Depth</span>
                      <span className="font-mono text-[#fafafa]">{depth} m</span>
                    </div>
                    <input type="range" min={50} max={3000} step={50} value={depth}
                      onClick={(e) => e.stopPropagation()} onChange={(e) => setDepth(Number(e.target.value))}
                      className="w-full" />
                    <div className="flex justify-between text-[10px] text-[#52525b] mt-1 font-mono">
                      <span>50</span><span>3000</span>
                    </div>
                  </div>
                  {/* SF live */}
                  <div className={cn("flex justify-between items-center px-2.5 py-2 border text-xs font-mono",
                    ok ? "border-[#22c55e]/30 bg-[#22c55e]/5 text-[#22c55e]" : "border-[#ef4444]/30 bg-[#ef4444]/5 text-[#ef4444]")}>
                    <span>SF {sf.toFixed(2)}×</span>
                    <span>{ok ? `≥ ${sfRequired}× PASS` : `< ${sfRequired}× FAIL`}</span>
                  </div>
                  {simErr && <p className="text-[#ef4444] text-[11px] font-mono">{simErr}</p>}
                  <button onClick={(e) => { e.stopPropagation(); runSim(); }} disabled={running}
                    className="w-full py-2 border border-[#e4e4e7] bg-[#e4e4e7] text-[#09090b] text-xs font-bold tracking-widest uppercase hover:bg-[#fafafa] disabled:opacity-40 transition-colors flex items-center justify-center gap-2">
                    {running ? <><Loader2 size={11} className="animate-spin" /> RUNNING…</> : <>EXECUTE <ChevronRight size={11} /></>}
                  </button>
                </div>
              )}
            </PipelineStep>

            <PipelineStep id={5} label="CERTIFICATION"
              status={simResult ? (simResult.certified ? "approved" : "rejected") : stepStatus(5)}
              onClick={() => setActiveStep(5)}>
              {activeStep === 5 && simResult && (
                <div className="space-y-2">
                  <div className={cn("flex justify-between items-center px-2.5 py-2 border text-xs font-mono font-semibold",
                    simResult.certified ? "border-[#22c55e]/30 bg-[#22c55e]/5 text-[#22c55e]" : "border-[#ef4444]/30 bg-[#ef4444]/5 text-[#ef4444]")}>
                    <span>{simResult.status}</span>
                    <span>SF {simResult.safetyFactor}×</span>
                  </div>
                  <div className="space-y-1">
                    <KV k="Stress"   v={`${simResult.seismicStressMpa.toFixed(4)} MPa`} mono />
                    <KV k="Eff. Yld" v={`${simResult.yieldStrengthMpa} MPa`} mono />
                    <KV k="Material" v={simResult.materialLabel} />
                    <KV k="Depth"    v={`${simResult.depthM} m`} mono />
                  </div>
                  {simResult.certified && (
                    <button onClick={(e) => { e.stopPropagation(); onCertify(simResult); }}
                      className="w-full py-2 border border-[#22c55e]/40 bg-[#22c55e]/10 text-[#22c55e] text-xs font-bold tracking-widest uppercase hover:bg-[#22c55e]/20 transition-colors">
                      GENERATE CERTIFICATE
                    </button>
                  )}
                </div>
              )}
              {activeStep === 5 && !simResult && (
                <p className="text-[#52525b] text-[11px]">Complete Step 4 first.</p>
              )}
            </PipelineStep>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            MIDDLE — Bento grid
        ══════════════════════════════════════════════════════════════ */}
        <div className="overflow-y-auto bg-[#09090b]">
          {/* Section label */}
          <div className="px-5 py-3 border-b border-[#27272a] bg-[#111113]">
            <span className="text-[10px] font-semibold tracking-[0.12em] text-[#52525b] uppercase">Site Intelligence — {score.wellName}</span>
          </div>

          <div className="p-4 space-y-3">
            {/* Rationale card */}
            <BentoCard label="AI SITE RATIONALE · GEMINI 1.5 FLASH" accent="none">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 border border-[#27272a] flex items-center justify-center flex-shrink-0 mt-0.5 flex-shrink-0">
                  <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none">
                    <path d="M8 1L1 4.5l7 3.5 7-3.5L8 1zM1 11.5l7 3.5 7-3.5M1 8l7 3.5 7-3.5" stroke="#71717a" strokeWidth="1" strokeLinecap="round"/>
                  </svg>
                </div>
                {ratLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 size={11} className="animate-spin text-[#52525b]" />
                    <span className="text-[#52525b] text-xs font-mono">Generating analysis…</span>
                  </div>
                ) : (
                  <p className="text-[#a1a1aa] text-xs leading-5">{rationale}</p>
                )}
              </div>
            </BentoCard>

            {/* 4-stat row */}
            <div className="grid grid-cols-4 gap-2">
              <StatCard label="DEPTH" value={score.depthM ? `${score.depthM}` : "—"} unit="m"
                sub={score.depthM ? depthLabel(score.depthM) : "not recorded"} />
              <StatCard label="PEAK GROUND VEL." value={(score.pgvMs * 100).toFixed(3)} unit="cm/s"
                sub="Rekoske 2025" />
              <StatCard label="SEISMIC RISK" value={score.riskLevel} unit=""
                sub={`PGV ${score.pgvMs.toFixed(5)} m/s`} color={rc} />
              <StatCard label="INSURANCE CLASS" value={insurance.class} unit=""
                sub={insurance.label} color={insurance.class === "A" ? "green" : insurance.class === "B" ? "amber" : "red"} />
            </div>

            {/* Decision card */}
            <BentoCard label={`RECOMMENDATION · ${profile.companyName.toUpperCase()}`} accent={decision.color === "green" ? "green" : decision.color === "amber" ? "amber" : "red"}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <p className={cn("font-semibold text-sm leading-tight", SIG[decision.color === "orange" ? "amber" : decision.color as SigColor]?.text ?? "text-[#fafafa]")}>
                    {decision.action}
                  </p>
                  <p className="text-[#71717a] text-xs mt-1">{decision.subtitle}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-2xl font-bold text-[#fafafa]">{decision.confidence}%</p>
                  <p className="text-[#52525b] text-[10px] uppercase tracking-wider">Confidence</p>
                </div>
              </div>
              {decision.action !== "Do Not Proceed" && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {[["CAPACITY", decision.capacity_mw], ["EST. CAPEX", `$${decision.capex_musd}M`], ["TIMELINE", `${decision.timeline_yr} yr`]].map(([k, v]) => (
                    <div key={k} className="border border-[#27272a] px-2.5 py-2">
                      <p className="text-[10px] text-[#52525b] uppercase tracking-wider">{k}</p>
                      <p className="font-mono text-[#d4d4d8] text-xs font-semibold mt-0.5">{v}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="space-y-1 border-t border-[#27272a] pt-3">
                {decision.rationale.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[#71717a]">
                    <span className="text-[#3f3f46] mt-0.5 flex-shrink-0 font-mono">{String(i+1).padStart(2,"0")}</span>
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </BentoCard>

            {/* Insurance detail */}
            <BentoCard label="INSURANCE ASSESSMENT" accent="none">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-2">Coverage Type</p>
                  <p className="text-[#d4d4d8] text-xs">{insurance.coverageType}</p>
                  <p className="text-[#52525b] text-[11px] mt-1">{insurance.annualPremiumRange} / year</p>
                </div>
                <div>
                  <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-2">Key Exclusions</p>
                  <div className="space-y-1">
                    {insurance.exclusions.slice(0,3).map((e) => (
                      <div key={e} className="flex items-center gap-1.5 text-[11px] text-[#71717a]">
                        <span className="w-1 h-1 bg-[#ef4444] rounded-full flex-shrink-0" />
                        {e}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </BentoCard>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            RIGHT — Score metrics + Verification badge
        ══════════════════════════════════════════════════════════════ */}
        <div className="border-l border-[#27272a] flex flex-col overflow-y-auto bg-[#09090b]">
          {/* Section label */}
          <div className="px-4 py-3 border-b border-[#27272a] bg-[#111113]">
            <span className="text-[10px] font-semibold tracking-[0.12em] text-[#52525b] uppercase">Integrity Score</span>
          </div>

          {/* ── Metric card ── */}
          <div className="p-4 border-b border-[#27272a] space-y-4">
            {/* Big number */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] text-[#52525b] uppercase tracking-widest mb-1">Vent Score</p>
                <div className="flex items-baseline gap-2">
                  <span className={cn("font-mono text-5xl font-bold leading-none", SIG[sc].text)}>{score.ventScore}</span>
                  <span className="text-[#52525b] font-mono text-sm">/ 100</span>
                </div>
              </div>
              <div className={cn("px-2 py-1 border text-[10px] font-mono font-bold uppercase tracking-wider", SIG[sc].text, SIG[sc].border, SIG[sc].bg)}>
                {sc.toUpperCase()}
              </div>
            </div>
            {/* Master progress bar */}
            <div>
              <div className="h-0.5 bg-[#27272a] w-full">
                <div className={cn("h-full transition-all duration-1000", SIG[sc].dot.replace("bg-", "bg-"))}
                  style={{ width: `${score.ventScore}%` }} />
              </div>
              <div className="flex justify-between text-[#52525b] font-mono text-[10px] mt-1">
                <span>0</span><span>50</span><span>100</span>
              </div>
            </div>
            {/* Formula */}
            <p className="text-[#52525b] text-[10px] font-mono">HEAT × 0.6  +  STABILITY × 0.4</p>
          </div>

          {/* ── Sub-scores ── */}
          <div className="p-4 border-b border-[#27272a] space-y-3">
            <p className="text-[10px] text-[#52525b] uppercase tracking-widest">Component Scores</p>
            <ScoreBar label="HEAT" value={score.heatScore}     color="bg-[#f59e0b]" sub={score.depthM ? `${score.depthM} m` : "N/A"} />
            <ScoreBar label="STAB" value={score.stabilityScore} color="bg-[#22c55e]" sub={`${(score.pgvMs*100).toFixed(3)} cm/s PGV`} />
          </div>

          {/* ── Benchmarks ── */}
          <div className="p-4 border-b border-[#27272a] space-y-2.5">
            <p className="text-[10px] text-[#52525b] uppercase tracking-widest">Threshold Checks</p>
            <Threshold label="Commercial Viable" threshold={58} current={score.ventScore} />
            <Threshold label="Investment Grade"  threshold={75} current={score.ventScore} />
            <Threshold label="Class A Insurance" threshold={75} current={score.ventScore} />
          </div>

          {/* ── Verification badge ── */}
          <div className="p-4 flex-1">
            <p className="text-[10px] text-[#52525b] uppercase tracking-widest mb-4">Verification Status</p>
            <VerificationBadge simResult={simResult} onGoToSim={() => setActiveStep(4)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
// Sub-components
// ══════════════════════════════════════════════════════════════════════════

function PipelineStep({ id, label, status, onClick, children }: {
  id: number; label: string;
  status: "done" | "active" | "pending" | "approved" | "rejected";
  onClick: () => void; children?: React.ReactNode;
}) {
  const isDone     = status === "done" || status === "approved";
  const isActive   = status === "active";
  const isApproved = status === "approved";
  const isRejected = status === "rejected";

  const numColor = isDone ? "text-[#22c55e] border-[#22c55e]/40"
    : isRejected ? "text-[#ef4444] border-[#ef4444]/40"
    : isActive   ? "text-[#fafafa] border-[#e4e4e7]"
    :              "text-[#3f3f46] border-[#27272a]";

  const labelColor = isDone ? "text-[#71717a]" : isActive ? "text-[#fafafa]" : "text-[#3f3f46]";

  return (
    <div className="relative">
      {id < 5 && <div className="absolute left-[15px] top-[32px] w-px h-full bg-[#27272a]" style={{ maxHeight: 32 }} />}
      <button onClick={onClick} className="w-full text-left">
        <div className={cn("flex items-start gap-2.5 p-2.5 border transition-colors",
          isActive ? "border-[#27272a] bg-[#111113]" : "border-transparent hover:bg-[#0f0f11]")}>
          {/* Step number box */}
          <div className={cn("w-[22px] h-[22px] border flex items-center justify-center flex-shrink-0 font-mono text-[10px] font-bold mt-0.5", numColor)}>
            {isDone && !isRejected ? <CheckCircle2 size={12} /> : isRejected ? <XCircle size={12} /> : id}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={cn("text-[10px] font-semibold tracking-[0.1em]", labelColor)}>{label}</span>
              {isApproved && <span className="text-[#22c55e] text-[9px] font-mono">APPROVED</span>}
              {isRejected && <span className="text-[#ef4444] text-[9px] font-mono">REJECTED</span>}
              {isDone && !isApproved && !isRejected && <span className="text-[#22c55e] text-[9px] font-mono">✓</span>}
              {status === "pending" && <span className="text-[#3f3f46] text-[9px] font-mono">—</span>}
            </div>
            {isActive && children && <div className="mt-2.5 space-y-1">{children}</div>}
          </div>
        </div>
      </button>
    </div>
  );
}

function KV({ k, v, mono, color, small }: { k: string; v: string; mono?: boolean; color?: SigColor; small?: boolean }) {
  return (
    <div className="flex justify-between items-baseline gap-2">
      <span className="text-[#52525b] text-[10px] uppercase tracking-wider flex-shrink-0">{k}</span>
      <span className={cn(
        small ? "text-[10px]" : "text-xs",
        mono ? "font-mono" : "",
        color ? SIG[color].text : "text-[#d4d4d8]"
      )}>{v}</span>
    </div>
  );
}

function BentoCard({ label, accent, children }: {
  label: string; accent: "green" | "amber" | "red" | "none"; children: React.ReactNode;
}) {
  const leftBorder = accent !== "none" ? `border-l-2 border-l-[${SIG[accent as SigColor]?.text.replace("text-", "")}]` : "";
  return (
    <div className={cn("border border-[#27272a] bg-[#111113]", accent !== "none" && "border-l-2",
      accent === "green" ? "border-l-[#22c55e]" : accent === "amber" ? "border-l-[#f59e0b]" : accent === "red" ? "border-l-[#ef4444]" : ""
    )}>
      <div className="px-3 py-2 border-b border-[#27272a]">
        <span className="text-[10px] font-semibold tracking-[0.1em] text-[#52525b] uppercase">{label}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function StatCard({ label, value, unit, sub, color }: {
  label: string; value: string; unit: string; sub: string; color?: SigColor;
}) {
  return (
    <div className="border border-[#27272a] bg-[#111113] p-3">
      <p className="text-[10px] text-[#52525b] uppercase tracking-wider mb-2 leading-tight">{label}</p>
      <p className={cn("font-mono text-xl font-bold leading-none", color ? SIG[color].text : "text-[#fafafa]")}>
        {value}<span className="text-[#71717a] text-sm ml-1">{unit}</span>
      </p>
      <p className="text-[#52525b] text-[10px] mt-1.5">{sub}</p>
    </div>
  );
}

function ScoreBar({ label, value, color, sub }: { label: string; value: number; color: string; sub: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[#71717a] text-[10px] font-mono uppercase tracking-wider">{label}</span>
        <span className="text-[#d4d4d8] text-xs font-mono font-semibold">{value} <span className="text-[#52525b]">· {sub}</span></span>
      </div>
      <div className="h-0.5 bg-[#27272a]">
        <div className={cn("h-full transition-all duration-1000", color)} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Threshold({ label, threshold, current }: { label: string; threshold: number; current: number }) {
  const met = current >= threshold;
  const pct = Math.min(100, (current / threshold) * 100);
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-[#71717a]">{label}</span>
        <span className={cn("text-[10px] font-mono font-semibold", met ? "text-[#22c55e]" : "text-[#52525b]")}>
          {met ? `${current} ≥ ${threshold} ✓` : `${current} / ${threshold}`}
        </span>
      </div>
      <div className="h-0.5 bg-[#27272a]">
        <div className={cn("h-full transition-all duration-1000", met ? "bg-[#22c55e]" : "bg-[#f59e0b]")}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function VerificationBadge({ simResult, onGoToSim }: { simResult: SimulationResponse | null; onGoToSim: () => void }) {
  if (!simResult) {
    return (
      <div className="border border-dashed border-[#27272a] p-5 text-center space-y-3">
        <div className="w-10 h-10 border border-[#27272a] mx-auto flex items-center justify-center">
          <span className="text-[#3f3f46] font-mono text-lg">?</span>
        </div>
        <div>
          <p className="text-[#52525b] text-xs font-semibold uppercase tracking-widest">Pending Verification</p>
          <p className="text-[#3f3f46] text-[11px] mt-1">Execute simulation to generate certificate</p>
        </div>
        <button onClick={onGoToSim}
          className="w-full py-2 border border-[#27272a] hover:border-[#3f3f46] text-[#71717a] hover:text-[#a1a1aa] text-xs uppercase tracking-widest transition-colors">
          Configure →
        </button>
      </div>
    );
  }

  const ok = simResult.certified;
  const c  = ok ? SIG.green : SIG.red;

  return (
    <div className={cn("border p-4 space-y-3", c.border, c.bg)}>
      {/* Status header */}
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle2 size={16} className={c.text} /> : <XCircle size={16} className={c.text} />}
        <span className={cn("font-mono font-bold text-sm uppercase tracking-wider", c.text)}>{simResult.status}</span>
      </div>
      {/* Data */}
      <div className="space-y-1.5 border-t border-[#27272a] pt-3">
        <KV k="Material"  v={simResult.materialLabel} />
        <KV k="Depth"     v={`${simResult.depthM} m`} mono />
        <KV k="SF"        v={`${simResult.safetyFactor}×`} mono color={ok ? "green" : "red"} />
        <KV k="Stress"    v={`${simResult.seismicStressMpa.toFixed(4)} MPa`} mono />
        <KV k="Eff. Yld"  v={`${simResult.yieldStrengthMpa} MPa`} mono />
        <KV k="Sim ID"    v={simResult.scrippsSImId} mono small />
      </div>
      {ok && (
        <p className={cn("text-[10px] font-mono uppercase tracking-wider", c.text)}>
          Eligible for Vent Certification
        </p>
      )}
    </div>
  );
}
