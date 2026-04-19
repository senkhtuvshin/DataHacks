const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type RiskTolerance = "conservative" | "balanced" | "aggressive";
export type CompanySize   = "startup" | "sme" | "enterprise";
export type UseCase       = "power_generation" | "direct_heating" | "industrial" | "research";

export interface BusinessProfile {
  companyName:    string;
  companySize:    CompanySize;
  riskTolerance:  RiskTolerance;
  useCase:        UseCase;
  budget_musd:    number;   // $M USD
}

export const DEFAULT_PROFILE: BusinessProfile = {
  companyName:   "My Company",
  companySize:   "sme",
  riskTolerance: "balanced",
  useCase:       "power_generation",
  budget_musd:   50,
};

export interface VentScoreResponse {
  wellName:       string;
  lat:            number;
  lon:            number;
  county:         string;
  depthM:         number | null;
  distanceKm:     number;
  heatScore:      number;
  pgvMs:          number;
  stabilityScore: number;
  ventScore:      number;
  riskLevel:      "LOW" | "MODERATE" | "HIGH";
  scrippsSImId:   string;
  timestamp:      string;
}

export interface SimulationRequest {
  lat:            number;
  lon:            number;
  material:       "steel" | "titanium" | "composite";
  pipe_depth_m:   number;
  risk_tolerance?: RiskTolerance;
}

export interface SimulationResponse {
  material:          string;
  materialLabel:     string;
  depthM:            number;
  pgvMs:             number;
  seismicStressMpa:  number;
  yieldStrengthMpa:  number;
  safetyFactor:      number;
  certified:         boolean;
  status:            "APPROVED" | "REJECTED";
  ventScore:         number;
  lat:               number;
  lon:               number;
  scrippsSImId:      string;
  timestamp:         string;
}

export interface GeoJSONFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: {
    wellName: string;
    county:   string;
    depthM:   number | null;
    heatScore: number;
    lat:      number;
    lon:      number;
  };
}

export interface WellsGeoJSON {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}

export interface SavedLocation extends VentScoreResponse {
  savedAt: string;
  note?:   string;
}

export async function fetchWellsGeoJSON(): Promise<WellsGeoJSON> {
  const res = await fetch(`${API}/wells/geojson`);
  if (!res.ok) throw new Error("Failed to load wells");
  return res.json();
}

export async function fetchVentScore(lat: number, lon: number): Promise<VentScoreResponse> {
  const res = await fetch(`${API}/score?lat=${lat}&lon=${lon}`);
  if (!res.ok) throw new Error("Failed to calculate Vent Score");
  return res.json();
}

export async function runSimulation(body: SimulationRequest): Promise<SimulationResponse> {
  const res = await fetch(`${API}/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Simulation failed");
  return res.json();
}

// ── Decision engine (client-side) ──────────────────────────────────────────

export interface BusinessDecision {
  action:      string;
  subtitle:    string;
  color:       "green" | "amber" | "orange" | "red";
  confidence:  number;   // 0-100
  capacity_mw: string;
  capex_musd:  string;
  timeline_yr: string;
  rationale:   string[];
}

export function computeDecision(score: VentScoreResponse, profile: BusinessProfile): BusinessDecision {
  const s = score.ventScore;
  const uc = profile.useCase;
  const rt = profile.riskTolerance;

  if (uc === "power_generation") {
    if (s >= 78) return {
      action: "Build Binary Cycle Power Plant",
      subtitle: "Site demonstrates strong commercial viability",
      color: "green",
      confidence: Math.min(97, 60 + s * 0.5),
      capacity_mw: `${Math.round(score.depthM ? score.depthM / 40 : 5)}–${Math.round(score.depthM ? score.depthM / 25 : 10)} MW`,
      capex_musd: profile.companySize === "enterprise" ? "40–120" : "15–50",
      timeline_yr: "3–5",
      rationale: [
        `Vent Score of ${s} exceeds the 75-point commercial threshold`,
        score.riskLevel === "LOW" ? "Low seismic risk supports long-term infrastructure" : "Moderate seismic risk manageable with titanium casing",
        score.depthM && score.depthM > 1000 ? `${score.depthM}m depth indicates significant thermal gradient` : "Shallow system suitable for binary ORC cycle",
      ],
    };
    if (s >= 58) return {
      action: "Pilot Binary Cycle Plant",
      subtitle: "Feasible — additional survey recommended before full commitment",
      color: "amber",
      confidence: Math.min(80, 40 + s * 0.5),
      capacity_mw: "2–8 MW",
      capex_musd: "8–25",
      timeline_yr: "4–6",
      rationale: [
        `Score of ${s} is viable but additional geophysical survey advised`,
        "Pilot plant reduces capital risk before full-scale commitment",
        rt === "aggressive" ? "Risk tolerance permits proceeding without extended survey" : "Conservative approach: drill test well first",
      ],
    };
    if (s >= 38) return {
      action: "Exploratory Drilling Only",
      subtitle: "Score insufficient for commercial plant — test well required",
      color: "orange",
      confidence: 35,
      capacity_mw: "TBD",
      capex_musd: "2–5",
      timeline_yr: "2–3",
      rationale: [
        `Score of ${s} is below the 58-point commercial threshold`,
        "Exploratory well will confirm or deny viable resource",
        "Do not commit full capex until test data is reviewed",
      ],
    };
    return {
      action: "Do Not Proceed",
      subtitle: "Site not recommended for power generation at this time",
      color: "red",
      confidence: 90,
      capacity_mw: "N/A",
      capex_musd: "N/A",
      timeline_yr: "N/A",
      rationale: [
        `Vent Score of ${s} is critically low`,
        score.riskLevel === "HIGH" ? "High seismic risk makes this site unsafe for infrastructure" : "Insufficient thermal gradient for economic extraction",
        "Recommend re-evaluation if regional conditions change",
      ],
    };
  }

  if (uc === "direct_heating") {
    if (s >= 50) return {
      action: "Build District Heating System",
      subtitle: "Economically viable for direct-use geothermal heating",
      color: "green",
      confidence: 78,
      capacity_mw: "1–5 MWth",
      capex_musd: "2–10",
      timeline_yr: "1–3",
      rationale: [
        "Direct-use systems have lower temperature requirements",
        `Score of ${s} confirms adequate shallow thermal resource`,
        "District heating ROI typically 5–8 years in this score range",
      ],
    };
    return {
      action: "Small-Scale Residential Heating",
      subtitle: "Limited direct use — single building or greenhouse",
      color: "amber",
      confidence: 55,
      capacity_mw: "<1 MWth",
      capex_musd: "0.5–2",
      timeline_yr: "1–2",
      rationale: [
        `Score of ${s} supports only low-enthalpy direct use`,
        "Consider ground-source heat pump as alternative",
      ],
    };
  }

  if (uc === "industrial") {
    return {
      action: s >= 55 ? "Industrial Process Heat Viable" : "Limited Industrial Use",
      subtitle: s >= 55 ? "Suitable for food processing, drying, or mineral extraction" : "Heat output below industrial process requirements",
      color: s >= 55 ? "green" : "orange",
      confidence: s >= 55 ? 70 : 40,
      capacity_mw: "2–15 MWth",
      capex_musd: "5–30",
      timeline_yr: "2–4",
      rationale: [
        `Industrial heat demand requires sustained temperatures`,
        s >= 55 ? "Score supports direct industrial process heat" : "Score marginal — detailed thermal gradient study needed",
      ],
    };
  }

  // Research
  return {
    action: "Research & Monitoring Site",
    subtitle: "All sites viable for scientific monitoring and data collection",
    color: "green",
    confidence: 95,
    capacity_mw: "N/A",
    capex_musd: "0.1–1",
    timeline_yr: "0.5–2",
    rationale: [
      "Research objectives do not require high Vent Scores",
      `Site data contributes to regional geothermal mapping`,
      "Scripps simulation data available for academic publication",
    ],
  };
}

// ── Insurance engine (client-side) ─────────────────────────────────────────

export interface InsuranceRating {
  class:        "A" | "B" | "C" | "D";
  label:        string;
  color:        string;
  annualPremiumRange: string;
  coverageType: string;
  exclusions:   string[];
  providers:    string[];
}

export function computeInsurance(score: VentScoreResponse, profile: BusinessProfile): InsuranceRating {
  const s = score.ventScore;
  const pgv = score.pgvMs;

  if (s >= 75 && pgv < 0.05) return {
    class: "A",
    label: "Investment Grade",
    color: "text-vent-green",
    annualPremiumRange: `$${profile.companySize === "enterprise" ? "120–280" : "40–95"}K/yr`,
    coverageType: "Full Infrastructure + Business Interruption",
    exclusions: ["Acts of war", "Intentional damage"],
    providers: ["Munich Re Geothermal", "Swiss Re Energy", "Marsh Energy"],
  };
  if (s >= 58) return {
    class: "B",
    label: "Standard Coverage",
    color: "text-blue-400",
    annualPremiumRange: `$${profile.companySize === "enterprise" ? "250–480" : "80–160"}K/yr`,
    coverageType: "Infrastructure + Limited Business Interruption",
    exclusions: ["Seismic events >M6.5", "Acts of war", "Pre-existing ground instability"],
    providers: ["Munich Re Geothermal", "Lloyd's of London Energy", "AIG Energy"],
  };
  if (s >= 38) return {
    class: "C",
    label: "High-Risk Coverage",
    color: "text-vent-amber",
    annualPremiumRange: `$${profile.companySize === "enterprise" ? "480–900" : "150–320"}K/yr`,
    coverageType: "Infrastructure Only (no BI)",
    exclusions: ["Seismic events >M5.5", "Induced seismicity", "Subsidence", "Business interruption"],
    providers: ["Lloyd's of London Energy", "Specialist brokers only"],
  };
  return {
    class: "D",
    label: "Uninsurable — Remediation Required",
    color: "text-vent-red",
    annualPremiumRange: "Not available",
    coverageType: "None — site must reach Class C before coverage",
    exclusions: ["All standard perils"],
    providers: [],
  };
}
