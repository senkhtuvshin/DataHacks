"use client";

import { X, Building2, Zap, ShieldCheck, FlaskConical, Factory, TrendingUp, AlertTriangle } from "lucide-react";
import type { BusinessProfile, CompanySize, RiskTolerance, UseCase } from "@/lib/api";

interface Props {
  profile: BusinessProfile;
  onChange: (p: BusinessProfile) => void;
  onClose: () => void;
}

export function BusinessProfilePanel({ profile, onChange, onClose }: Props) {
  const set = (patch: Partial<BusinessProfile>) => onChange({ ...profile, ...patch });

  return (
    <div
      className="absolute top-0 left-0 h-full w-[320px] border-r border-z800 animate-slidein z-30 flex flex-col overflow-hidden"
      style={{ background: "#111113", animationDirection: "normal" } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-z800 flex-shrink-0">
        <div>
          <p className="text-z600 text-[9px] tracking-[0.2em] uppercase">Configuration</p>
          <h2 className="text-z200 font-semibold text-xs mt-0.5 tracking-wide">Business Profile</h2>
        </div>
        <button onClick={onClose} className="text-z600 hover:text-z200 transition-colors p-1">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {/* Company name */}
        <Field label="Company Name">
          <input
            type="text"
            value={profile.companyName}
            onChange={(e) => set({ companyName: e.target.value })}
            className="w-full border border-z700 px-3 py-2 text-xs font-mono outline-none focus:border-z200 transition-colors placeholder:text-z600"
            style={{ background: "#09090b", color: "#e4e4e7" }}
            autoComplete="off"
            placeholder="Your company name"
          />
        </Field>

        {/* Company size */}
        <Field label="Company Size">
          {([
            ["startup",    "Startup",    "< $10M revenue · 1–20 employees"],
            ["sme",        "SME",        "$10–200M revenue · 20–500 employees"],
            ["enterprise", "Enterprise", "> $200M revenue · 500+ employees"],
          ] as [CompanySize, string, string][]).map(([val, label, sub]) => (
            <OptionRow
              key={val}
              selected={profile.companySize === val}
              onClick={() => set({ companySize: val })}
              icon={<Building2 size={11} className="flex-shrink-0" />}
              label={label}
              sub={sub}
            />
          ))}
        </Field>

        {/* Use case */}
        <Field label="Primary Use Case">
          {([
            ["power_generation", Zap,          "Power Generation",   "Grid-connected electricity"],
            ["direct_heating",   Building2,    "Direct Heating",     "District or industrial heat"],
            ["industrial",       Factory,      "Industrial Process", "Heat for manufacturing"],
            ["research",         FlaskConical, "Research",           "Scientific monitoring"],
          ] as [UseCase, React.ElementType, string, string][]).map(([val, Icon, label, sub]) => (
            <OptionRow
              key={val}
              selected={profile.useCase === val}
              onClick={() => set({ useCase: val })}
              icon={<Icon size={11} className="flex-shrink-0" />}
              label={label}
              sub={sub}
            />
          ))}
        </Field>

        {/* Risk tolerance */}
        <Field label="Risk Tolerance">
          {([
            ["conservative", ShieldCheck,   "Conservative", "SF ≥ 5× · Class A/B insurance",    "text-sig-green"],
            ["balanced",     TrendingUp,    "Balanced",     "SF ≥ 3× · Standard practice",       "text-z400"],
            ["aggressive",   AlertTriangle, "Aggressive",   "SF ≥ 1.5× · Maximise ROI",          "text-sig-amber"],
          ] as [RiskTolerance, React.ElementType, string, string, string][]).map(([val, Icon, label, sub, col]) => (
            <OptionRow
              key={val}
              selected={profile.riskTolerance === val}
              onClick={() => set({ riskTolerance: val })}
              icon={<Icon size={11} className={`flex-shrink-0 ${col}`} />}
              label={label}
              sub={sub}
            />
          ))}
        </Field>

        {/* Budget */}
        <Field label="Development Budget">
          <div className="flex justify-between items-center mb-2">
            <span className="text-z600 text-[10px] font-mono">$1M — $500M</span>
            <span className="text-z200 font-mono text-xs">${profile.budget_musd}M USD</span>
          </div>
          <input
            type="range" min={1} max={500} step={5}
            value={profile.budget_musd}
            onChange={(e) => set({ budget_musd: Number(e.target.value) })}
            className="w-full"
          />
        </Field>

        {/* Info note */}
        <div className="border border-z800 bg-z850 p-3">
          <p className="text-z600 text-[10px] leading-relaxed">
            Profile settings influence the decision engine, insurance classification, and safety-factor thresholds in all site analyses.
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-z600 text-[9px] tracking-[0.18em] uppercase">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function OptionRow({
  selected, onClick, icon, label, sub,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2.5 px-3 py-2 text-left transition-colors"
      style={selected
        ? { background: "#27272a", borderLeft: "2px solid #e4e4e7", borderTop: "1px solid #3f3f46", borderRight: "1px solid #3f3f46", borderBottom: "1px solid #3f3f46" }
        : { background: "transparent", border: "1px solid #27272a" }
      }
    >
      <span style={{ color: selected ? "#a1a1aa" : "#3f3f46", marginTop: 2 }}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium leading-tight" style={{ color: selected ? "#fafafa" : "#71717a" }}>{label}</p>
        <p className="text-[10px] mt-0.5 font-mono" style={{ color: selected ? "#71717a" : "#3f3f46" }}>{sub}</p>
      </div>
      {selected && (
        <span className="flex-shrink-0 mt-0.5" style={{ width: 6, height: 6, background: "#e4e4e7", display: "inline-block" }} />
      )}
    </button>
  );
}
