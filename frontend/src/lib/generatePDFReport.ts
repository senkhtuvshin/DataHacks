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

// ── Colour palette (matches Vent dark UI) ─────────────────────────────────
const C = {
  black:    [0,   0,   0]   as [number,number,number],
  ink:      [15,  15,  17]  as [number,number,number],
  slate800: [39,  39,  42]  as [number,number,number],
  slate600: [82,  82,  91]  as [number,number,number],
  slate400: [161, 161, 170] as [number,number,number],
  slate200: [228, 228, 231] as [number,number,number],
  white:    [255, 255, 255] as [number,number,number],
  green:    [34,  197, 94]  as [number,number,number],
  amber:    [245, 158, 11]  as [number,number,number],
  red:      [239, 68,  68]  as [number,number,number],
};

function setColor(doc: jsPDF, rgb: [number,number,number], type: "fill"|"text"|"draw" = "fill") {
  if (type === "fill")  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  if (type === "text")  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  if (type === "draw")  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
}

export function generatePDFReport(data: ReportData) {
  const { score, sim, profile, decision, insurance, rationale, certNum } = data;
  const doc   = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W     = 210;
  const PL    = 18;   // padding left
  const PR    = 18;   // padding right
  const CW    = W - PL - PR;
  let   y     = 0;

  // ── helpers ──────────────────────────────────────────────────────────────

  function nl(n = 4) { y += n; }

  function rule(color: [number,number,number] = C.slate800, thickness = 0.2) {
    setColor(doc, color, "draw");
    doc.setLineWidth(thickness);
    doc.line(PL, y, W - PR, y);
    nl(3);
  }

  function label(text: string, x = PL) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    setColor(doc, C.slate600, "text");
    const upper = text.toUpperCase().replace(/_/g," ");
    doc.text(upper, x, y, { charSpace: 0.8 });
    nl(3.5);
  }

  function value(text: string, color: [number,number,number] = C.slate200, x = PL, mono = false) {
    doc.setFontSize(8.5);
    doc.setFont(mono ? "courier" : "helvetica", "normal");
    setColor(doc, color, "text");
    doc.text(text, x, y);
    nl(4.5);
  }

  function title(text: string, size = 10, color: [number,number,number] = C.white) {
    doc.setFontSize(size);
    doc.setFont("helvetica", "bold");
    setColor(doc, color, "text");
    doc.text(text, PL, y);
    nl(size * 0.6);
  }

  function badge(text: string, color: [number,number,number], x: number, bY: number) {
    const pad = 2.5;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    const tw = doc.getTextWidth(text);
    setColor(doc, color, "fill");
    doc.rect(x, bY - 4.5, tw + pad * 2, 6, "F");
    setColor(doc, C.black, "text");
    doc.text(text, x + pad, bY);
  }

  function sectionHeader(text: string) {
    nl(1);
    setColor(doc, C.slate800, "fill");
    doc.rect(PL, y - 1, CW, 7, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    setColor(doc, C.slate400, "text");
    doc.text(text.toUpperCase(), PL + 2, y + 4, { charSpace: 0.9 });
    nl(9);
  }

  function twoCol(
    pairs: [string, string][],
    colW = CW / 2,
    mono = false
  ) {
    const startY = y;
    let   leftY  = startY;
    let   rightY = startY;

    pairs.forEach(([lbl, val], i) => {
      const isLeft = i % 2 === 0;
      const x      = isLeft ? PL : PL + colW;
      if (isLeft) y = leftY;
      else        y = rightY;

      label(lbl, x);
      const vColor = val === "APPROVED" ? C.green : val === "REJECTED" ? C.red : C.slate200;
      value(val, vColor, x, mono);

      if (isLeft) leftY = y;
      else        rightY = y;
    });

    y = Math.max(leftY, rightY);
  }

  function scoreBar(v: number, color: [number,number,number]) {
    const bH  = 3;
    const bW  = CW;
    const fill = (v / 100) * bW;
    setColor(doc, C.slate800, "fill");
    doc.rect(PL, y, bW, bH, "F");
    setColor(doc, color, "fill");
    doc.rect(PL, y, fill, bH, "F");
    nl(bH + 4);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ══════════════════════════════════════════════════════════════════════════

  // ── Cover header bar ─────────────────────────────────────────────────────
  setColor(doc, C.ink, "fill");
  doc.rect(0, 0, W, 36, "F");

  y = 13;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setColor(doc, C.white, "text");
  doc.text("VENT", PL, y, { charSpace: 2 });

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setColor(doc, C.slate400, "text");
  doc.text("GEOTHERMAL INTELLIGENCE & RESILIENCE ENGINE", PL + 14, y, { charSpace: 0.5 });

  y = 22;
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  setColor(doc, C.slate200, "text");
  doc.text("STRUCTURAL INTEGRITY & SITE ASSESSMENT REPORT", PL, y);

  y = 29;
  const isApproved = sim.status === "APPROVED";
  const statusColor = isApproved ? C.green : C.red;
  badge(
    isApproved ? "✓  VENT CERTIFIED" : "✗  CERTIFICATION REJECTED",
    statusColor,
    PL,
    y,
  );

  const issuedStr = format(new Date(sim.timestamp), "dd MMM yyyy  HH:mm 'UTC'");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setColor(doc, C.slate600, "text");
  doc.text(`Issued: ${issuedStr}`, W - PR - doc.getTextWidth(`Issued: ${issuedStr}`), y);

  y = 44;

  // ── Site Overview ─────────────────────────────────────────────────────────
  sectionHeader("01 · Site Overview");

  twoCol([
    ["Well Name",     score.wellName],
    ["County",        score.county + ", California"],
    ["Coordinates",   `${sim.lat.toFixed(5)}, ${sim.lon.toFixed(5)}`],
    ["Depth",         score.depthM ? `${score.depthM} m` : "Not recorded"],
    ["Nearest Site",  `${score.distanceKm.toFixed(2)} km from query`],
    ["Operator",      profile.companyName],
    ["Use Case",      profile.useCase.replace(/_/g," ")],
    ["Budget",        `$${profile.budget_musd}M USD`],
  ], CW / 2, false);
  nl(2);

  // ── Vent Score ────────────────────────────────────────────────────────────
  sectionHeader("02 · Vent Score Breakdown");

  const vsColor = score.ventScore >= 70 ? C.green : score.ventScore >= 45 ? C.amber : C.red;
  const riskColor2 = score.riskLevel === "LOW" ? C.green : score.riskLevel === "MODERATE" ? C.amber : C.red;

  // Big score number
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  setColor(doc, vsColor, "text");
  doc.text(String(score.ventScore), PL, y);
  doc.setFontSize(10);
  setColor(doc, C.slate400, "text");
  doc.text("/ 100", PL + 20, y);
  nl(4);
  scoreBar(score.ventScore, vsColor);

  twoCol([
    ["Heat Score",       `${score.heatScore} / 100`],
    ["Stability Score",  `${score.stabilityScore} / 100`],
    ["Peak Ground Vel.", `${sim.pgvMs.toFixed(5)} m/s`],
    ["Seismic Risk",     score.riskLevel],
  ]);
  nl(2);
  rule();

  // ── Seismic Analysis ──────────────────────────────────────────────────────
  sectionHeader("03 · Seismic Analysis");

  twoCol([
    ["Scripps Sim ID",    sim.scrippsSImId],
    ["Physics Model",     "Rekoske et al. 2025"],
    ["PGV (m/s)",         sim.pgvMs.toFixed(5)],
    ["Risk Level",        score.riskLevel],
  ], CW / 2, true);
  nl(2);
  rule();

  // ── Material Simulation ───────────────────────────────────────────────────
  sectionHeader("04 · Material Resilience Simulation");

  twoCol([
    ["Material",          sim.materialLabel],
    ["Install Depth",     `${sim.depthM} m`],
    ["Seismic Stress",    `${sim.seismicStressMpa.toFixed(4)} MPa`],
    ["Eff. Yield Str.",   `${sim.yieldStrengthMpa} MPa`],
    ["Safety Factor",     `${sim.safetyFactor}×`],
    ["Certification",     sim.status],
  ], CW / 2, true);

  // Verdict box
  nl(2);
  const vBoxColor = isApproved ? C.green : C.red;
  setColor(doc, vBoxColor, "draw");
  doc.setLineWidth(0.5);
  doc.rect(PL, y, CW, 12, "S");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, vBoxColor, "text");
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
  y = 18;

  // Small header on page 2
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setColor(doc, C.slate600, "text");
  doc.text("VENT SITE ASSESSMENT REPORT  ·  " + score.wellName.toUpperCase(), PL, y);
  doc.text(`Page 2`, W - PR - 10, y);
  nl(4);
  rule(C.slate800, 0.15);

  // ── Business Recommendation ───────────────────────────────────────────────
  sectionHeader("05 · Business Recommendation");

  const dColor =
    decision.color === "green"  ? C.green  :
    decision.color === "amber"  ? C.amber  :
    decision.color === "orange" ? C.amber  : C.red;

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, dColor, "text");
  doc.text(decision.action, PL, y);
  nl(5);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "italic");
  setColor(doc, C.slate400, "text");
  doc.text(decision.subtitle, PL, y);
  nl(6);

  twoCol([
    ["Capacity",       decision.capacity_mw],
    ["Est. Capex",     `$${decision.capex_musd}M USD`],
    ["Timeline",       decision.timeline_yr + " years"],
    ["Confidence",     `${decision.confidence}%`],
  ]);
  nl(1);

  // Rationale bullets
  label("Decision Rationale");
  decision.rationale.forEach((r) => {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, C.slate200, "text");
    doc.text(`•  ${r}`, PL + 2, y);
    nl(5);
  });
  nl(1);
  rule();

  // ── Insurance Classification ──────────────────────────────────────────────
  sectionHeader("06 · Insurance Classification");

  const insColor =
    insurance.class === "A" ? C.green :
    insurance.class === "B" ? C.slate200 :
    insurance.class === "C" ? C.amber  : C.red;

  // Class badge
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  setColor(doc, insColor, "text");
  doc.text(`Class ${insurance.class}`, PL, y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, C.slate400, "text");
  doc.text(`— ${insurance.label}`, PL + 22, y);
  nl(6);

  twoCol([
    ["Annual Premium",  insurance.annualPremiumRange],
    ["Coverage Type",   insurance.coverageType],
    ["Providers",       insurance.providers.length > 0 ? insurance.providers.join(", ") : "Not available"],
    ["Key Exclusions",  insurance.exclusions.slice(0, 2).join("; ")],
  ]);
  nl(1);
  rule();

  // ── AI Site Rationale ─────────────────────────────────────────────────────
  sectionHeader("07 · AI Site Rationale  (Gemini 1.5 Flash)");

  const rationaleText = rationale || "AI rationale unavailable.";
  const lines = doc.splitTextToSize(rationaleText, CW);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  setColor(doc, C.slate200, "text");
  doc.text(lines, PL, y);
  y += lines.length * 5 + 4;

  rule();

  // ── Certificate Metadata ──────────────────────────────────────────────────
  sectionHeader("08 · Certificate Metadata");

  twoCol([
    ["Certificate No.",  certNum],
    ["Issued To",        profile.companyName],
    ["Risk Tolerance",   profile.riskTolerance],
    ["Company Size",     profile.companySize],
    ["Issued At",        issuedStr],
    ["Vent Score",       `${sim.ventScore} / 100`],
  ], CW / 2, true);
  nl(2);

  // ── Disclaimer ────────────────────────────────────────────────────────────
  const maxY = 280;
  if (y < maxY - 20) y = maxY - 20;

  setColor(doc, C.slate800, "fill");
  doc.rect(PL, y, CW, 16, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  setColor(doc, C.slate600, "text");
  const disc = "This report is generated by the Vent platform using physics-based seismic simulations from the Scripps Institution of Oceanography (Rekoske et al. 2025). It is for preliminary due-diligence only and does not constitute a licensed engineering report. All investment and permitting decisions must be reviewed by a certified geothermal engineer.";
  const discLines = doc.splitTextToSize(disc, CW - 6);
  doc.text(discLines, PL + 3, y + 5);

  // ── Save ─────────────────────────────────────────────────────────────────
  const dateStr = format(new Date(), "yyyyMMdd");
  const safeName = score.wellName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 24);
  doc.save(`VENT-${safeName}-${dateStr}.pdf`);
}
