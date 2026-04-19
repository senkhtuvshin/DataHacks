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

// ── Colours — white background PDF ──────────────────────────────────────────
const C = {
  ink:       [15,  15,  20]  as [number,number,number],
  body:      [50,  50,  60]  as [number,number,number],
  muted:     [95,  95, 110]  as [number,number,number],
  faint:     [155,155, 165]  as [number,number,number],
  headerBg:  [18,  18,  22]  as [number,number,number],
  sectionBg: [230,230, 235]  as [number,number,number],
  track:     [208,208, 215]  as [number,number,number],
  green:     [21, 128,  61]  as [number,number,number],
  amber:     [175, 100,   0] as [number,number,number],
  red:       [185,  28,  28] as [number,number,number],
  white:     [255, 255, 255] as [number,number,number],
  border:    [198, 198, 208] as [number,number,number],
};

function rgb(doc: jsPDF, c: [number,number,number], t: "fill"|"text"|"draw") {
  if (t === "fill") doc.setFillColor(c[0], c[1], c[2]);
  if (t === "text") doc.setTextColor(c[0], c[1], c[2]);
  if (t === "draw") doc.setDrawColor(c[0], c[1], c[2]);
}

export function generatePDFReport(data: ReportData) {
  const { score, sim, profile, decision, insurance, rationale, certNum } = data;
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const W   = 210;
  const PL  = 18;
  const PR  = 18;
  const CW  = W - PL - PR;
  let   y   = 0;

  function nl(n = 4) { y += n; }

  function rule(thickness = 0.15) {
    rgb(doc, C.border, "draw");
    doc.setLineWidth(thickness);
    doc.line(PL, y, W - PR, y);
    nl(4);
  }

  // Section header: dark bg bar — advances y by enough to clear text below
  function sectionHeader(text: string) {
    nl(3);
    rgb(doc, C.sectionBg, "fill");
    doc.rect(PL, y, CW, 8, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    rgb(doc, C.muted, "text");
    doc.text(text.toUpperCase(), PL + 3, y + 5.5, { charSpace: 0.9 });
    y += 8; // exact rect height, no overlap
    nl(5); // breathing room below rect before content
  }

  function lbl(text: string, x = PL) {
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    rgb(doc, C.muted, "text");
    doc.text(text.toUpperCase(), x, y, { charSpace: 0.6 });
    nl(3.5);
  }

  function val(
    text: string,
    x = PL,
    opts: { color?: [number,number,number]; mono?: boolean } = {},
  ) {
    const { color = C.ink, mono = false } = opts;
    doc.setFontSize(8.5);
    doc.setFont(mono ? "courier" : "helvetica", "normal");
    rgb(doc, color, "text");
    doc.text(text, x, y);
    nl(5.5);
  }

  function twoCol(pairs: [string, string][], mono = false) {
    const half  = CW / 2;
    let   lY    = y;
    let   rY    = y;
    pairs.forEach(([l, v], i) => {
      const left = i % 2 === 0;
      const x    = left ? PL : PL + half;
      y = left ? lY : rY;
      lbl(l, x);
      const vColor = v === "APPROVED" ? C.green : v === "REJECTED" ? C.red : C.ink;
      val(v, x, { color: vColor, mono });
      if (left) lY = y; else rY = y;
    });
    y = Math.max(lY, rY);
  }

  function scoreBar(v: number, color: [number,number,number]) {
    rgb(doc, C.track, "fill");
    doc.rect(PL, y, CW, 3, "F");
    rgb(doc, color, "fill");
    doc.rect(PL, y, (v / 100) * CW, 3, "F");
    nl(8);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 1
  // ══════════════════════════════════════════════════════════════════════════

  // ── Cover header bar ─────────────────────────────────────────────────────
  rgb(doc, C.headerBg, "fill");
  doc.rect(0, 0, W, 40, "F");

  // VENT wordmark — line 1
  y = 13;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  rgb(doc, C.white, "text");
  doc.text("VENT", PL, y, { charSpace: 3 });

  // Subtitle — on its own line below, smaller
  y = 20;
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.faint, "text");
  doc.text("GEOTHERMAL INTELLIGENCE & RESILIENCE ENGINE", PL, y, { charSpace: 0.5 });

  // Report title line
  y = 28;
  doc.setFontSize(9.5);
  doc.setFont("helvetica", "bold");
  rgb(doc, [200, 200, 210] as [number,number,number], "text");
  doc.text("STRUCTURAL INTEGRITY & SITE ASSESSMENT REPORT", PL, y);

  // Status badge + issued date
  const isApproved = sim.status === "APPROVED";
  const statusColor = isApproved ? C.green : C.red;
  const issuedStr   = format(new Date(sim.timestamp), "dd MMM yyyy  HH:mm 'UTC'");

  y = 36;
  // Badge
  const badgeTxt = isApproved ? "VENT CERTIFIED" : "CERTIFICATION REJECTED";
  const bPad = 2.5;
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  const bW = doc.getTextWidth(badgeTxt) + bPad * 2;
  rgb(doc, statusColor, "fill");
  doc.rect(PL, y - 5, bW, 6.5, "F");
  rgb(doc, C.white, "text");
  doc.text(badgeTxt, PL + bPad, y);

  // Issued date right-aligned
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.faint, "text");
  const dtW = doc.getTextWidth(`Issued: ${issuedStr}`);
  doc.text(`Issued: ${issuedStr}`, W - PR - dtW, y);

  y = 50;

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
  nl(2); rule();

  // ── 02 Vent Score Breakdown ───────────────────────────────────────────────
  sectionHeader("02 · Vent Score Breakdown");

  const vsColor = score.ventScore >= 70 ? C.green : score.ventScore >= 45 ? C.amber : C.red;

  // Score number — drawn at baseline; font size 28 means ascender ~9.9mm above y
  // sectionHeader already gave 5mm padding, so y is clear of the rect
  doc.setFontSize(28);
  doc.setFont("helvetica", "bold");
  rgb(doc, vsColor, "text");
  doc.text(String(score.ventScore), PL, y);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.muted, "text");
  doc.text("/ 100", PL + 20, y);

  nl(6); // advance past the large numeral descender
  scoreBar(score.ventScore, vsColor);

  twoCol([
    ["Heat Score",       `${score.heatScore} / 100`],
    ["Stability Score",  `${score.stabilityScore} / 100`],
    ["Peak Ground Vel.", `${sim.pgvMs.toFixed(5)} m/s`],
    ["Seismic Risk",     score.riskLevel],
  ]);
  nl(2); rule();

  // ── 03 Seismic Analysis ───────────────────────────────────────────────────
  sectionHeader("03 · Seismic Analysis");
  twoCol([
    ["Scripps Sim ID",  sim.scrippsSImId],
    ["Physics Model",   "Rekoske et al. 2025"],
    ["PGV (m/s)",       sim.pgvMs.toFixed(5)],
    ["Risk Level",      score.riskLevel],
  ], true);
  nl(2); rule();

  // ── 04 Material Resilience Simulation ────────────────────────────────────
  sectionHeader("04 · Material Resilience Simulation");
  twoCol([
    ["Material",        sim.materialLabel],
    ["Install Depth",   `${sim.depthM} m`],
    ["Seismic Stress",  `${sim.seismicStressMpa.toFixed(4)} MPa`],
    ["Eff. Yield Str.", `${sim.yieldStrengthMpa} MPa`],
    ["Safety Factor",   `${sim.safetyFactor}×`],
    ["Certification",   sim.status],
  ], true);
  nl(2);

  // Verdict box
  const vFill   = isApproved ? ([218, 240, 224] as [number,number,number]) : ([245, 218, 218] as [number,number,number]);
  const vBorder = isApproved ? C.green : C.red;
  rgb(doc, vFill, "fill");
  rgb(doc, vBorder, "draw");
  doc.setLineWidth(0.5);
  doc.rect(PL, y, CW, 12, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  rgb(doc, vBorder, "text");
  doc.text(
    isApproved
      ? `APPROVED — Safety factor ${sim.safetyFactor}× meets structural integrity requirements.`
      : `REJECTED — Seismic stress ${sim.seismicStressMpa.toFixed(2)} MPa exceeds material yield threshold.`,
    PL + 4, y + 7.5,
  );
  y += 12;
  nl(4);

  // ══════════════════════════════════════════════════════════════════════════
  // PAGE 2
  // ══════════════════════════════════════════════════════════════════════════
  doc.addPage();
  y = 14;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.faint, "text");
  doc.text("VENT SITE ASSESSMENT  ·  " + score.wellName.toUpperCase(), PL, y);
  doc.text("Page 2 / 2", W - PR - 14, y);
  nl(5); rule(0.15);

  // ── 05 Business Recommendation ────────────────────────────────────────────
  sectionHeader("05 · Business Recommendation");

  const dColor =
    decision.color === "green"  ? C.green :
    decision.color === "amber"  ? C.amber :
    decision.color === "orange" ? C.amber : C.red;

  doc.setFontSize(11);
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
    const wrapped = doc.splitTextToSize(`•  ${r}`, CW - 4);
    doc.text(wrapped, PL + 2, y);
    y += wrapped.length * 5;
    nl(1);
  });
  nl(2); rule();

  // ── 06 Insurance Classification ───────────────────────────────────────────
  sectionHeader("06 · Insurance Classification");

  const insColor =
    insurance.class === "A" ? C.green :
    insurance.class === "B" ? C.body  :
    insurance.class === "C" ? C.amber : C.red;

  // Class label at normal-ish size — no overlap risk
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  rgb(doc, insColor, "text");
  doc.text(`Class ${insurance.class}`, PL, y);
  nl(3);

  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.body, "text");
  doc.text(insurance.label, PL, y);
  nl(7);

  twoCol([
    ["Annual Premium",  insurance.annualPremiumRange],
    ["Coverage Type",   insurance.coverageType],
    ["Providers",       insurance.providers.length ? insurance.providers.slice(0, 2).join(", ") : "Not available"],
    ["Key Exclusions",  insurance.exclusions.slice(0, 2).join("; ")],
  ]);
  nl(2); rule();

  // ── 07 AI Site Rationale ──────────────────────────────────────────────────
  sectionHeader("07 · AI Site Rationale  (Gemini 1.5 Flash)");

  const rationaleText = rationale || "AI rationale not available.";
  const rLines = doc.splitTextToSize(rationaleText, CW);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  rgb(doc, C.body, "text");
  doc.text(rLines, PL, y);
  y += rLines.length * 5.5 + 4;
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
  nl(3);

  // ── Disclaimer ────────────────────────────────────────────────────────────
  const disclaimerY = Math.max(y, 272);
  rgb(doc, C.sectionBg, "fill");
  doc.rect(PL, disclaimerY, CW, 18, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "italic");
  rgb(doc, C.muted, "text");
  const disc = "This report is generated by the Vent platform using physics-based seismic simulations from the Scripps Institution of Oceanography (Rekoske et al. 2025). It is for preliminary due-diligence only and does not constitute a licensed engineering report. All investment and permitting decisions must be reviewed by a certified geothermal engineer.";
  const discLines = doc.splitTextToSize(disc, CW - 6);
  doc.text(discLines, PL + 3, disclaimerY + 5.5);

  // ── Save ──────────────────────────────────────────────────────────────────
  const dateStr  = format(new Date(), "yyyyMMdd");
  const safeName = score.wellName.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 24);
  doc.save(`VENT-${safeName}-${dateStr}.pdf`);
}
