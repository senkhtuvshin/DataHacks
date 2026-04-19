"use client";

import { X, CheckCircle2, XCircle, ShieldCheck, Printer } from "lucide-react";
import { format } from "date-fns";
import type { SimulationResponse, VentScoreResponse, BusinessProfile } from "@/lib/api";
import { computeInsurance } from "@/lib/api";

interface Props {
  sim:     SimulationResponse;
  score:   VentScoreResponse;
  profile: BusinessProfile;
  onClose: () => void;
}

export function CertModal({ sim, score, profile, onClose }: Props) {
  const approved  = sim.status === "APPROVED";
  const issued    = format(new Date(sim.timestamp), "PPpp 'UTC'");
  const certNum   = `VENT-${sim.scrippsSImId}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const insurance = computeInsurance(score, profile);

  const sigText   = approved ? "text-sig-green" : "text-sig-red";
  const sigBorder = approved ? "border-sig-green" : "border-sig-red";
  const sigBg     = approved ? "bg-sig-green"     : "bg-sig-red";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fadeup">
      <div className="w-full max-w-lg bg-z900 border border-z800 overflow-hidden max-h-[90vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-z800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck size={13} className="text-z400" />
            <span className="text-z200 font-semibold text-xs tracking-wide">VENT RESILIENCE CERTIFICATE</span>
          </div>
          <button onClick={onClose} className="text-z600 hover:text-z200 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Status banner */}
          <div className={`flex items-center gap-3 px-4 py-3 border-l-2 bg-z850 border ${sigBorder} border-l-current`}>
            {approved
              ? <CheckCircle2 size={20} className={`${sigText} flex-shrink-0`} />
              : <XCircle      size={20} className={`${sigText} flex-shrink-0`} />}
            <div>
              <p className={`font-bold text-sm font-mono tracking-wide ${sigText}`}>
                {approved ? "VENT CERTIFIED" : "CERTIFICATION REJECTED"}
              </p>
              <p className="text-z500 text-[10px] mt-0.5">
                {approved
                  ? "This site meets Vent structural integrity and seismic resilience standards."
                  : "Seismic stress exceeds material yield threshold at the specified depth."}
              </p>
            </div>
          </div>

          {/* Seal + cert metadata */}
          <div className="flex items-start gap-4">
            <VentSeal approved={approved} />
            <div className="space-y-2.5 pt-1">
              <MetaRow label="Issued To"       value={profile.companyName} />
              <MetaRow label="Certificate No." value={certNum} mono />
              <MetaRow label="Issued"          value={issued} />
            </div>
          </div>

          {/* Simulation data grid */}
          <div className="bg-z850 border border-z800 p-4 grid grid-cols-2 gap-x-8 gap-y-3">
            <CertRow label="Site"             value={score.wellName} />
            <CertRow label="County"           value={score.county} />
            <CertRow label="Coordinates"      value={`${sim.lat.toFixed(4)}, ${sim.lon.toFixed(4)}`} mono />
            <CertRow label="Vent Score"       value={`${sim.ventScore} / 100`} highlight />
            <CertRow label="Pipe Material"    value={sim.materialLabel} />
            <CertRow label="Install Depth"    value={`${sim.depthM} m`} mono />
            <CertRow label="Peak Ground Vel." value={`${sim.pgvMs.toFixed(5)} m/s`} mono />
            <CertRow label="Seismic Stress"   value={`${sim.seismicStressMpa.toFixed(4)} MPa`} mono />
            <CertRow label="Eff. Yield Str."  value={`${sim.yieldStrengthMpa} MPa`} mono />
            <CertRow label="Safety Factor"    value={`${sim.safetyFactor}×`} highlight={approved} />
            <CertRow label="Risk Tolerance"   value={profile.riskTolerance.charAt(0).toUpperCase() + profile.riskTolerance.slice(1)} />
            <CertRow label="Use Case"         value={profile.useCase.replace(/_/g, " ")} />
            <CertRow label="Scripps Sim ID"   value={sim.scrippsSImId} mono />
            <CertRow label="Physics Model"    value="Rekoske et al. 2025" />
          </div>

          {/* Insurance classification */}
          <div className={`flex items-center justify-between bg-z850 border px-4 py-3 ${
            insurance.class === "A" ? "border-sig-green" :
            insurance.class === "B" ? "border-z700"      :
            insurance.class === "C" ? "border-sig-amber" :
                                      "border-sig-red"
          }`}>
            <div>
              <p className="text-z600 text-[9px] tracking-[0.18em] uppercase">Insurance Classification</p>
              <p className={`font-semibold text-xs mt-1 font-mono ${insurance.color}`}>
                Class {insurance.class} — {insurance.label}
              </p>
              <p className="text-z500 text-[10px] mt-0.5 font-mono">Est. {insurance.annualPremiumRange}</p>
            </div>
            <div className={`text-5xl font-black font-mono leading-none ${insurance.color}`}>
              {insurance.class}
            </div>
          </div>

          {/* Disclaimer */}
          <p className="text-z700 text-[10px] text-center leading-relaxed border-t border-z800 pt-4">
            This certificate is generated by the Vent platform using physics-based seismic simulations
            from the Scripps Institution of Oceanography (Rekoske et al. 2025). It is for
            preliminary due-diligence only and does not constitute a licensed engineering report.
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-z800 flex-shrink-0">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-z800 text-z500 hover:text-z200 hover:border-z700 text-xs transition-colors font-mono"
          >
            <Printer size={12} /> Print PDF
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-z200 hover:bg-z50 text-z950 text-xs font-semibold transition-colors font-mono"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function VentSeal({ approved }: { approved: boolean }) {
  const color  = approved ? "text-sig-green border-sig-green" : "text-sig-red border-sig-red";
  const status = approved ? "CERTIFIED" : "REJECTED";
  return (
    <div className={`flex-shrink-0 w-20 h-20 border-2 flex flex-col items-center justify-center gap-0.5 bg-z850 ${color}`}>
      <ShieldCheck size={20} className={approved ? "text-sig-green" : "text-sig-red"} />
      <span className={`text-[8px] font-bold tracking-[0.2em] uppercase font-mono ${approved ? "text-sig-green" : "text-sig-red"}`}>
        VENT
      </span>
      <span className={`text-[7px] tracking-[0.15em] uppercase font-mono ${approved ? "text-sig-green" : "text-sig-red"}`}>
        {status}
      </span>
    </div>
  );
}

function MetaRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-z600 text-[9px] tracking-[0.18em] uppercase">{label}</p>
      <p className={`text-z300 text-[11px] mt-0.5 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function CertRow({ label, value, highlight, mono }: {
  label: string; value: string; highlight?: boolean; mono?: boolean;
}) {
  return (
    <div>
      <p className="text-z600 text-[9px] tracking-[0.15em] uppercase">{label}</p>
      <p className={`text-[11px] mt-0.5 font-mono ${highlight ? "text-z50 font-semibold" : "text-z400"}`}>
        {value}
      </p>
    </div>
  );
}
