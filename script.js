/* ============================================
   SYNTHETIX — Capex/Opex Calculator
   ============================================ */

const CONTACT_EMAIL = "hello@synthetix.ai"; // TODO: replace with live inbox

// ---------- Industry context (mirrors the Assessment tool's pattern) ----------
const INDUSTRIES = {
  bfsi: {
    label: "Banking & Financial Services",
    regulator: "an OCC-style model-risk review",
    systemLabel: "core banking platform",
    guideName: "Governed AI Delivery for Banking",
    guideUrl: "https://synthetix.ai/download/bfsi-governance-guide"
  },
  insurance: {
    label: "Insurance",
    regulator: "an NAIC-aligned compliance exam",
    systemLabel: "policy admin & claims platform",
    guideName: "The NAIC-Ready AI Governance Guide",
    guideUrl: "https://synthetix.ai/download/insurance-governance-guide"
  },
  healthcare: {
    label: "Healthcare",
    regulator: "a HIPAA / clinical-safety review",
    systemLabel: "EHR & interoperability layer",
    guideName: "Clinical-Safe AI Delivery for Health Systems",
    guideUrl: "https://synthetix.ai/download/healthcare-governance-guide"
  }
};

// ---------- Bucket midpoints (representative anchors, not precise figures) ----------
const BUDGET_MIDPOINT = { lt2m: 1250000, "2to10m": 6000000, "10to50m": 30000000, "50mplus": 65000000 };
const BUDGET_DISPLAY = { lt2m: "<$2M", "2to10m": "$2–10M", "10to50m": "$10–50M", "50mplus": "$50M+" };
const ENGINEER_MIDPOINT = { "1-5": 3, "6-15": 10, "16-40": 28, "40+": 55 };
const HOURS_SAVED_PER_CHANGE = { minutes: 0, hours: 2, days: 8, weeks: 32 };
const CHANGES_PER_YEAR = { "1": 40, "2-5": 90, "6+": 160 };

let state = { industry: "bfsi" };

// ---------- DOM refs ----------
const els = {
  toggleButtons: document.querySelectorAll("#industryToggle .segment"),
  budget: document.getElementById("in-budget"),
  approach: document.getElementById("in-approach"),
  systems: document.getElementById("in-systems"),
  engineers: document.getElementById("in-engineers"),
  evidence: document.getElementById("in-evidence"),
  horizon: document.getElementById("in-horizon"),

  capexCard: document.getElementById("capexCard"),
  capexValue: document.getElementById("capexValue"),
  capexSub: document.getElementById("capexSub"),
  opexValue: document.getElementById("opexValue"),
  horizonLabel: document.getElementById("horizonLabel"),
  contextLine: document.getElementById("contextLine"),

  barBigBang: document.getElementById("barBigBang"),
  barBigBangValue: document.getElementById("barBigBangValue"),
  barGoverned: document.getElementById("barGoverned"),
  barGovernedValue: document.getElementById("barGovernedValue"),

  assumptionsToggle: document.getElementById("assumptionsToggle"),
  assumptionsPanel: document.getElementById("assumptionsPanel"),
  assumptionsChevron: document.getElementById("assumptionsChevron"),

  overrunLow: document.getElementById("a-overrunLow"),
  overrunHigh: document.getElementById("a-overrunHigh"),
  maintLow: document.getElementById("a-maintLow"),
  maintHigh: document.getElementById("a-maintHigh"),
  engCost: document.getElementById("a-engCost"),
  auditCost: document.getElementById("a-auditCost"),

  meetCta: document.getElementById("meetCta"),
  guideCta: document.getElementById("guideCta"),
  year: document.getElementById("year")
};

// ---------- Formatting ----------
const fmtCompact = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(n);
const fmtFull = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

// ---------- Industry toggle ----------
els.toggleButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    els.toggleButtons.forEach(b => b.setAttribute("aria-selected", "false"));
    btn.setAttribute("aria-selected", "true");
    state.industry = btn.dataset.industry;
    recalculate();
  });
});

// ---------- Assumptions panel toggle ----------
els.assumptionsToggle.addEventListener("click", () => {
  const isOpen = els.assumptionsToggle.getAttribute("aria-expanded") === "true";
  els.assumptionsToggle.setAttribute("aria-expanded", String(!isOpen));
  els.assumptionsPanel.hidden = isOpen;
});

// ---------- Wire up recalculation ----------
[els.budget, els.approach, els.systems, els.engineers, els.evidence, els.horizon].forEach(el =>
  el.addEventListener("change", recalculate)
);
[els.overrunLow, els.overrunHigh, els.maintLow, els.maintHigh, els.engCost, els.auditCost].forEach(el =>
  el.addEventListener("input", recalculate)
);

// ---------- Core calculation ----------
function recalculate() {
  const ind = INDUSTRIES[state.industry];

  const budgetKey = els.budget.value;
  const approach = els.approach.value;
  const systemsKey = els.systems.value;
  const engineersKey = els.engineers.value;
  const evidenceKey = els.evidence.value;
  const horizonMonths = Number(els.horizon.value);

  const overrunLow = Number(els.overrunLow.value) / 100;
  const overrunHigh = Number(els.overrunHigh.value) / 100;
  const maintLow = Number(els.maintLow.value) / 100;
  const maintHigh = Number(els.maintHigh.value) / 100;
  const engCost = Number(els.engCost.value);
  const auditCost = Number(els.auditCost.value);

  const budgetMidpoint = BUDGET_MIDPOINT[budgetKey];

  // ---- Capex avoided ----
  const capexLow = budgetMidpoint * overrunLow;
  const capexHigh = budgetMidpoint * overrunHigh;
  const showCapex = approach !== "incremental";

  // ---- Opex: legacy maintenance reduction ----
  const engineerMidpoint = ENGINEER_MIDPOINT[engineersKey];
  const annualMaintenanceSpend = engineerMidpoint * engCost;
  const maintSavingsLow = annualMaintenanceSpend * maintLow;
  const maintSavingsHigh = annualMaintenanceSpend * maintHigh;

  // ---- Opex: audit-prep time savings ----
  const hoursSavedPerChange = HOURS_SAVED_PER_CHANGE[evidenceKey];
  const changesPerYear = CHANGES_PER_YEAR[systemsKey];
  const auditPrepSavingsAnnual = hoursSavedPerChange * changesPerYear * auditCost;

  // ---- Totals over horizon ----
  const horizonFactor = horizonMonths / 12;
  const opexLow = (maintSavingsLow + auditPrepSavingsAnnual) * horizonFactor;
  const opexHigh = (maintSavingsHigh + auditPrepSavingsAnnual) * horizonFactor;

  // ---- Render: Capex card ----
  if (showCapex) {
    els.capexCard.style.opacity = "1";
    els.capexValue.textContent = `${fmtCompact(capexLow)}–${fmtCompact(capexHigh)}`;
    els.capexSub.textContent = "vs. a typical big-bang replacement";
  } else {
    els.capexValue.textContent = "N/A";
    els.capexSub.textContent = "Already incremental — comparison doesn't apply";
    els.capexCard.style.opacity = "0.55";
  }

  // ---- Render: Opex card ----
  els.horizonLabel.textContent = `/ ${horizonMonths} MO`;
  els.opexValue.textContent = `${fmtCompact(opexLow)}–${fmtCompact(opexHigh)}`;

  // ---- Context line ----
  els.contextLine.textContent = showCapex
    ? `For a ${ind.systemLabel}, this reflects avoiding a typical wave-based-vs-big-bang cost overrun, plus reduced legacy-maintenance and audit-prep spend — the kind of evidence ${ind.regulator} would want documented, not reconstructed.`
    : `Since you're already modernizing incrementally, the opportunity here is compounding legacy-maintenance and audit-prep savings on your ${ind.systemLabel} — evidence ${ind.regulator} would want documented, not reconstructed.`;

  // ---- Comparison bars ----
  const bigBangExposure = budgetMidpoint * (1 + overrunHigh);
  const governedBudget = budgetMidpoint;
  const maxVal = Math.max(bigBangExposure, governedBudget);

  requestAnimationFrame(() => {
    els.barBigBang.style.width = `${(bigBangExposure / maxVal) * 100}%`;
    els.barGoverned.style.width = `${(governedBudget / maxVal) * 100}%`;
  });
  els.barBigBangValue.textContent = fmtCompact(bigBangExposure);
  els.barGovernedValue.textContent = fmtCompact(governedBudget);

  // ---- CTAs ----
  const subject = encodeURIComponent("Let's meet");
  const capexText = showCapex ? `capex avoided ${fmtFull(capexLow)}–${fmtFull(capexHigh)}, ` : "";
  const body = encodeURIComponent(
    `Hi,\n\nI ran the Capex/Opex Calculator for ${ind.label} and got: ${capexText}opex reduction ${fmtFull(opexLow)}–${fmtFull(opexHigh)} over ${horizonMonths} months.\n\nI'd like to talk through what a governed pilot could look like.\n\nA few times that work for me:\n`
  );
  els.meetCta.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  els.guideCta.href = ind.guideUrl;
  els.guideCta.textContent = `Read: ${ind.guideName}`;
}

// ---------- Init ----------
els.year.textContent = new Date().getFullYear();
recalculate();
