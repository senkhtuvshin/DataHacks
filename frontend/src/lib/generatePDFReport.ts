import jsPDF from "jspdf";
import type {
  VentScoreResponse,
  SimulationResponse,
  BusinessProfile,
  BusinessDecision,
  InsuranceRating,
} from "@/lib/api";
import { format } from "date-fns";

interface ReportData {
  score:     VentScoreResponse;
  sim:       SimulationResponse;
  profile:   BusinessProfile;
  decision:  BusinessDecision;
  insurance: InsuranceRating;
  rationale: string | null;
  certNum:   string;
}

// ── Colour palette — designed for WHITE page ──────────────────────────────
const C = {
  // text
  ink:       [15,  15,  20]  as [number,number,number],   // near-black — main values
  body:      [45,  45,  55]  as [number,number,number],   // dark gray — secondary text
  muted:     [90,  90, 105]  as [number,number,number],   // medium gray — labels
  faint:     [150,150, 160]  as [number,number,number],   // light gray — meta
  // backgrounds
  headerBg:  [18,  18,  22]  as [number,number,number],   // near-black cover bar
  sectionBg: [232,232, 236]  as [number,number,number],   // light gray section headers
  rowBg:     [246,246, 249]  as [number,number,number],   // off-white rows
  track:     [210,210, 216]  as [number,number,number],   // progress bar track
  // signals
  green:     [21, 128,  61]  as [number,number,number],   // darker green (readable on white)
  amber:     [180, 100,   0] as [number,number,number],   // darker amber
  red:       [185,  28,  28] as [number,number,number],   // darker red
  white:     [255, 255, 255] as [number,number,number],
  black:     [0,   0,   0]   as [number,number,number],
  border:    [200, 200, 208] as [number,number,number],
};

function rgb(doc: jsPDF, c: [number,number,number], type: "fill"|"text"|"draw") {
  if (type === "fill") doc.setFillColor(c[0], c[1], c[2]);
  if (type === "text") doc.setTextColor(c[0], c[1], c[2]);
  if (type === "draw") doc.setDrawColor(c[0], c[1], c[2]);
}

export function generatePDFReport(data: ReportData) {
  const { score, sim, profile, decision, insurance, rationale, certNum } = data;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W   = 210;
  const PL  = 18;
  const PR  = 18;
  const CW  = W - PL - PR;
  let   y   = 0;

  // ── Helpers ───────────────────────────────────────────────────────────────

  function nl(n = 4) { y += n; }

  function rule(thickness = 0.15) {
    rgb(doc, C.border, "draw");
    doc.setLineWidth(thickness);
    doc.line(PL, y, W - PR, y);
    nl(3);
  }

  function sectionHeader(text: string) {
    nl(2);
    rgb(doc, C.sectionBg, "fill");
    doc.rect(PL, y - 1, CW, 7.5, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    rgb(doc, C.muted, "text");
    doc.text(text.toUpperCase(), PL + 3, y + 4.5, { charSpace: 0.9 });
    nl(10);
  }

  function lbl(text: string, x = PL) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    rgb(doc, C.muted, "text");
    doc.text(text.toUpperCase(), x, y, { charSpace: 0.6 });
    nl(3.5);
  }

  function val(text: string, x = PL, opts: { color?: [number,number,number]; mono?: boolean; size?: number } = {}) {
    const { color = C.ink, mono = false, size = 8.5 } = opts;
    doc.setFontSize(size);
    doc.setFont(mono ? "courier" : "helvetica", "normal");
    rgb(doc, color, "text");
    doc.text(text, x, y);
    nl(5);
  }

  function twoCol(pairs: [string, string][], mono = false) {
    const half = CW / 2;
    const startY = y;
    let lY = startY, rY = startY;

    pairs.forEach(([l, v], i) => {
      const isLeft = i % 2 === 0;
      const x = isLeft ? PL : PL + half;
      y = isLeft ? lY : rY;

      lbl(l, x);
      const vColor = v === "APPROVED" ? C.green : v === "REJECTED" ? C.red : C.ink;
      val(v, x, { color: vColor, mono });

      if (isLeft) lY = y; else rY = y;
    });
    y = Math.max(lY, rY);
  }

  function scoreBar(v: number, color: [number,number,number]) {
    const bH = 3;
    rgb(doc, C.track, "fill");
    doc.rect(PL, y, CW, bH, "F");
    rgb(doc, color, "fill");
    doc.rect(PL, y, (v / 100) * CW, bH, "F");
    nl(bH + 5);
  }

  function badge(text: string, bgColor: [number,number,number], x: number, bY: number) {
    const pad = 2.5;
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    const tw = doc.getTextWidth(text);
    rgb(doc, bgColor, "fill");
    doc.rect(x, bY - 5, tw + pad * 2, 7, "F");
    rgb(doc, C.white, "text");
    doc.text(text, x + pad, bY);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ══════════════════════════════════════════════════════════════════════════

  // Cover bar
  rgb(doc, C.headerBg, "fill");
  doc.rect(0, 0, W, 38, "F");

  y = 14;
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  rgb(doc, C.white, "text");
  doc.text("VENT", PL, y, { charSpace: 3 });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.faint, "text");
  doc.text("GEOTHERMAL INTELLIGENCE & RESILIENCE ENGINE", PL + 16, y, { charSpace: 0.4 });

  y = 23;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  rgb(doc, [200, 200, 210] as [number,number,number], "text");
  doc.text("STRUCTURAL INTEGRITY & SITE ASSESSMENT REPORT", PL, y);

  y = 31;
  const isApproved = sim.status === "APPROVED";
  badge(
    isApproved ? "✓  VENT CERTIFIED" : "✗  CERTIFICATION REJECTED",
    isApproved ? C.green : C.red,
    PL, y,
  );

  const issuedStr = format(new Date(sim.timestamp), "dd MMM yyyy  HH:mm 'UTC'");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.faint, "text");
  const issuedW = doc.getTextWidth(`Issued: ${issuedStr}`);
  doc.text(`Issued: ${issuedStr}`, W - PR - issuedW, y);

  y = 48;

  // ── 01 Site Overview ──────────────────────────────────────────────────────
  sectionHeader("01 · Site Overview");
  twoCol([
    ["Well Name",    score.wellName],
    ["County",       score.county + ", California"],
    ["Coordinates",  `${sim.lat.toFixed(5)}, ${sim.lon.toFixed(5)}`],
    ["Depth",        score.depthM ? `${score.depthM} m` : "Not recorded"],
    ["Nearest Site", `${score.distanceKm.toFixed(2)} km from query`],
    ["Operator",     profile.companyName],
    ["Use Case",     profile.useCase.replace(/_/g, " ")],
    ["Budget",       `$${profile.budget_musd}M USD`],
  ]);
  nl(1); rule();

  // ── 02 Vent Score ─────────────────────────────────────────────────────────
  sectionHeader("02 · Vent Score Breakdown");

  const vsColor = score.ventScore >= 70 ? C.green : score.ventScore >= 45 ? C.amber : C.red;

  doc.setFontSize(30);
  doc.setFont("helvetica", "bold");
  rgb(doc, vsColor, "text");
  doc.text(String(score.ventScore), PL, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.muted, "text");
  doc.text("/ 100", PL + 22, y);
  nl(5);
  scoreBar(score.ventScore, vsColor);

  twoCol([
    ["Heat Score",      `${score.heatScore} / 100`],
    ["Stability Score", `${score.stabilityScore} / 100`],
    ["Peak Ground Vel.",`${sim.pgvMs.toFixed(5)} m/s`],
    ["Seismic Risk",    score.riskLevel],
  ]);
  nl(1); rule();

  // ── 03 Seismic Analysis ───────────────────────────────────────────────────
  sectionHeader("03 · Seismic Analysis");
  twoCol([
    ["Scripps Sim ID",  sim.scrippsSImId],
    ["Physics Model",   "Rekoske et al. 2025"],
    ["PGV (m/s)",       sim.pgvMs.toFixed(5)],
    ["Risk Level",      score.riskLevel],
  ], true);
  nl(1); rule();

  // ── 04 Material Simulation ────────────────────────────────────────────────
  sectionHeader("04 · Material Resilience Simulation");
  twoCol([
    ["Material",       sim.materialLabel],
    ["Install Depth",  `${sim.depthM} m`],
    ["Seismic Stress", `${sim.seismicStressMpa.toFixed(4)} MPa`],
    ["Eff. Yield Str.",`${sim.yieldStrengthMpa} MPa`],
    ["Safety Factor",  `${sim.safetyFactor}×`],
    ["Certification",  sim.status],
  ], true);

  // Verdict box
  nl(2);
  const vBoxFill = isApproved ? ([220, 240, 225] as [number,number,number]) : ([245, 220, 220] as [number,number,number]);
  const vBoxBorder = isApproved ? C.green : C.red;
  const vBoxText   = isApproved ? C.green : C.red;
  rgb(doc, vBoxFill, "fill");
  rgb(doc, vBoxBorder, "draw");
  doc.setLineWidth(0.4);
  doc.rect(PL, y, CW, 12, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  rgb(doc, vBoxText, "text");
  doc.text(
    isApproved
      ? `APPROVED — Safety factor ${sim.safetyFactor}× meets structural integrity requirements.`
      : `REJECTED — Seismic stress ${sim.seismicStressMpa.toFixed(2)} MPa exceeds material yield threshold.`,
    PL + 4, y + 7.5,
  );
  nl(18);

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = 14;

  // Page 2 mini header
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.faint, "text");
  doc.text("VENT SITE ASSESSMENT REPORT  ·  " + score.wellName.toUpperCase(), PL, y);
  doc.text("Page 2 / 2", W - PR - 16, y);
  nl(4); rule(0.15);

  // ── 05 Business Recommendation ────────────────────────────────────────────
  sectionHeader("05 · Business Recommendation");

  const dColor =
    decision.color === "green"  ? C.green :
    decision.color === "amber"  ? C.amber :
    decision.color === "orange" ? C.amber : C.red;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  rgb(doc, dColor, "text");
  doc.text(decision.action, PL, y);
  nl(6);

  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  rgb(doc, C.body, "text");
  doc.text(decision.subtitle, PL, y);
  nl(6);

  twoCol([
    ["Capacity",   decision.capacity_mw],
    ["Est. Capex", `$${decision.capex_musd}M USD`],
    ["Timeline",   decision.timeline_yr + " years"],
    ["Confidence", `${decision.confidence}%`],
  ]);
  nl(1);

  lbl("Decision Rationale");
  decision.rationale.forEach((r) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    rgb(doc, C.body, "text");
    doc.text(`•  ${r}`, PL + 2, y);
    nl(5);
  });
  nl(1); rule();

  // ── 06 Insurance Classification ───────────────────────────────────────────
  sectionHeader("06 · Insurance Classification");

  const insColor =
    insurance.class === "A" ? C.green :
    insurance.class === "B" ? C.body  :
    insurance.class === "C" ? C.amber : C.red;

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  rgb(doc, insColor, "text");
  doc.text(`Class ${insurance.class}`, PL, y);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.body, "text");
  doc.text(`  —  ${insurance.label}`, PL + 24, y);
  nl(7);

  twoCol([
    ["Annual Premium",  insurance.annualPremiumRange],
    ["Coverage Type",   insurance.coverageType],
    ["Providers",       insurance.providers.length ? insurance.providers.slice(0, 2).join(", ") : "Not available"],
    ["Key Exclusions",  insurance.exclusions.slice(0, 2).join("; ")],
  ]);
  nl(1); rule();

  // ── 07 AI Site Rationale ──────────────────────────────────────────────────
  sectionHeader("07 · AI Site Rationale  (Gemini 1.5 Flash)");

  const rationaleText = rationale || "AI rationale not available for this report.";
  const lines = doc.splitTextToSize(rationaleText, CW);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.body, "text");
  doc.text(lines, PL, y);
  y += lines.length * 5.5 + 4;

  rule();

  // ── 08 Certificate Metadata ───────────────────────────────────────────────
  sectionHeader("08 · Certificate Metadata");
  twoCol([
    ["Certificate No.", certNum],
    ["Issued To",       profile.companyName],
    ["Risk Tolerance",  profile.riskTolerance],
    ["Company Size",    profile.companySize],
    ["Issued At",       issuedStr],
    ["Vent Score",      `${sim.ventScore} / 100`],
  ], true);
  nl(2);

  // ── Disclaimer ────────────────────────────────────────────────────────────
  const maxY = 278;
  if (y < maxY - 20) y = maxY - 20;

  rgb(doc, C.sectionBg, "fill");
  doc.rect(PL, y, CW, 18, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  rgb(doc, C.muted, "text");
  const disc = "This report is generated by the Vent platform using physics-based seismic simulations from the Scripps Institution of Oceanography (Rekoske et al. 2025). It is for preliminary due-diligence only and does not constitute a licensed engineering report. All investment and permitting decisions must be reviewed by a certified geothermal engineer.";
  const discLines = doc.splitTextToSize(disc, CW - 6);
  doc.text(discLines, PL + 3, y + 5.5);

  // ── Save ──────────────────────────────────────────────────────────────────
  const dateStr  = format(new Date(), "yyyyMMdd");
  const safeName = score.wellName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 24);
  doc.save(`VENT-${safeName}-${dateStr}.pdf`);
}
