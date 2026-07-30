/* ============================================
   SYNTHETIX — Savings Estimator
   ============================================ */

// ---------- Industry context ----------
// NOTE: overrunLow/High, maintLow/High, engCost, and auditCost are
// starting-point assumptions, tailored per industry as reasonable
// directional differences — NOT sourced benchmark data. Replace with real
// figures once your team/finance validates them. Fully editable in the UI.
const INDUSTRIES = {
  bfsi: {
    label: "Banking & Financial Services",
    regulator: "an OCC-style model-risk review",
    systemLabel: "core banking systems",
    systemsFieldQuestion: "How many core banking systems need updating?",
    defaults: { overrunLow: 20, overrunHigh: 35, maintLow: 15, maintHigh: 25, engCost: 165000, auditCost: 120 }
  },
  insurance: {
    label: "Insurance",
    regulator: "an NAIC-aligned compliance exam",
    systemLabel: "policy admin & claims systems",
    systemsFieldQuestion: "How many policy admin or claims systems need updating?",
    defaults: { overrunLow: 22, overrunHigh: 38, maintLow: 15, maintHigh: 25, engCost: 150000, auditCost: 110 }
  },
  healthcare: {
    label: "Healthcare",
    regulator: "a HIPAA / clinical-safety review",
    systemLabel: "EHR & interoperability systems",
    systemsFieldQuestion: "How many EHR or health-record systems need updating?",
    defaults: { overrunLow: 25, overrunHigh: 40, maintLow: 18, maintHigh: 28, engCost: 155000, auditCost: 130 }
  }
};

const INDUSTRY_ORDER = ["bfsi", "insurance", "healthcare"];

// ---------- Bucket midpoints (representative anchors, not precise figures) ----------
const BUDGET_MIDPOINT = { lt2m: 1250000, "2to10m": 6000000, "10to50m": 30000000, "50mplus": 65000000 };
const ENGINEER_MIDPOINT = { "1-5": 3, "6-15": 10, "16-40": 28, "40+": 55 };
const HOURS_SAVED_PER_CHANGE = { minutes: 0, hours: 2, days: 8, weeks: 32 };
const CHANGES_PER_YEAR = { "1": 40, "2-5": 90, "6+": 160 };

let state = {
  industry: "bfsi",
  unlocked: false,
  displayed: { capexLow: 0, capexHigh: 0, opexLow: 0, opexHigh: 0 }
};

// ---------- DOM refs ----------
const els = {
  toggleButtons: document.querySelectorAll("#industryToggle .segment"),
  segmentIndicator: document.getElementById("segmentIndicator"),
  systemsFieldLabel: document.getElementById("systemsFieldLabel"),

  budget: document.getElementById("in-budget"),
  approach: document.getElementById("in-approach"),
  systems: document.getElementById("in-systems"),
  engineers: document.getElementById("in-engineers"),
  evidence: document.getElementById("in-evidence"),
  horizon: document.getElementById("in-horizon"),

  lockedPrompt: document.getElementById("lockedPrompt"),
  seeResultsBtn: document.getElementById("seeResultsBtn"),
  hubspotFormWrap: document.getElementById("hubspotFormWrap"),
  alreadySubmittedBtn: document.getElementById("alreadySubmittedBtn"),
  resultsArea: document.getElementById("resultsArea"),

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
  compareDelta: document.getElementById("compareDelta"),

  assumptionsToggle: document.getElementById("assumptionsToggle"),
  assumptionsPanel: document.getElementById("assumptionsPanel"),

  overrunLow: document.getElementById("a-overrunLow"),
  overrunHigh: document.getElementById("a-overrunHigh"),
  maintLow: document.getElementById("a-maintLow"),
  maintHigh: document.getElementById("a-maintHigh"),
  engCost: document.getElementById("a-engCost"),
  auditCost: document.getElementById("a-auditCost"),

  year: document.getElementById("year")
};

// ---------- Formatting ----------
const fmtCompact = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(n);

// ---------- Segmented control ----------
function moveIndicator(index) {
  els.segmentIndicator.style.transform = `translateX(${index * 100}%)`;
}

els.toggleButtons.forEach((btn, i) => {
  btn.addEventListener("click", () => {
    els.toggleButtons.forEach(b => b.setAttribute("aria-selected", "false"));
    btn.setAttribute("aria-selected", "true");
    moveIndicator(i);
    state.industry = btn.dataset.industry;
    applyIndustryDefaults();
    recalculate();
  });
});

function applyIndustryDefaults() {
  const ind = INDUSTRIES[state.industry];
  els.systemsFieldLabel.textContent = ind.systemsFieldQuestion;
  els.overrunLow.value = ind.defaults.overrunLow;
  els.overrunHigh.value = ind.defaults.overrunHigh;
  els.maintLow.value = ind.defaults.maintLow;
  els.maintHigh.value = ind.defaults.maintHigh;
  els.engCost.value = ind.defaults.engCost;
  els.auditCost.value = ind.defaults.auditCost;
}

// ---------- Gate flow: See My Results -> HubSpot form -> Results ----------
els.seeResultsBtn.addEventListener("click", () => {
  els.lockedPrompt.hidden = true;
  els.hubspotFormWrap.hidden = false;
});

els.alreadySubmittedBtn.addEventListener("click", unlockResults);

// Listen for HubSpot's form-submitted postMessage event (covers both the
// classic and the newer embed script, which both bridge via postMessage).
window.addEventListener("message", (event) => {
  if (!event.data || typeof event.data !== "object") return;
  const isHsSubmit =
    event.data.type === "hsFormCallback" &&
    (event.data.eventName === "onFormSubmitted" || event.data.eventName === "onFormSubmit");
  if (isHsSubmit) unlockResults();
});

function unlockResults() {
  if (state.unlocked) return;
  state.unlocked = true;
  els.hubspotFormWrap.hidden = true;
  els.resultsArea.hidden = false;
  els.resultsArea.dataset.revealing = "true";
  recalculate();
}

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

// ---------- Animated number tween ----------
function tweenRange(el, fromLow, toLow, fromHigh, toHigh, duration = 650) {
  const start = performance.now();
  function frame(now) {
    const t = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    const curLow = fromLow + (toLow - fromLow) * eased;
    const curHigh = fromHigh + (toHigh - fromHigh) * eased;
    el.textContent = `${fmtCompact(curLow)}–${fmtCompact(curHigh)}`;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---------- Core calculation ----------
function recalculate() {
  if (!state.unlocked) return;

  const ind = INDUSTRIES[state.industry];

  const budgetKey = els.budget.value;
  const approach = els.approach.value;
  const systemsKey = els.systems.value;
  const engineersKey = els.engineers.value;
  const evidenceKey = els.evidence.value;
  const horizonMonths = Number(els.horizon.value);
  const horizonYears = horizonMonths / 12;

  const overrunLow = Number(els.overrunLow.value) / 100;
  const overrunHigh = Number(els.overrunHigh.value) / 100;
  const maintLow = Number(els.maintLow.value) / 100;
  const maintHigh = Number(els.maintHigh.value) / 100;
  const engCost = Number(els.engCost.value);
  const auditCost = Number(els.auditCost.value);

  const budgetMidpoint = BUDGET_MIDPOINT[budgetKey];

  // ---- Upfront savings ----
  const capexLow = budgetMidpoint * overrunLow;
  const capexHigh = budgetMidpoint * overrunHigh;
  const showCapex = approach !== "incremental";

  // ---- Yearly savings: legacy maintenance reduction ----
  const engineerMidpoint = ENGINEER_MIDPOINT[engineersKey];
  const annualMaintenanceSpend = engineerMidpoint * engCost;
  const maintSavingsLow = annualMaintenanceSpend * maintLow;
  const maintSavingsHigh = annualMaintenanceSpend * maintHigh;

  // ---- Yearly savings: audit-prep time ----
  const hoursSavedPerChange = HOURS_SAVED_PER_CHANGE[evidenceKey];
  const changesPerYear = CHANGES_PER_YEAR[systemsKey];
  const auditPrepSavingsAnnual = hoursSavedPerChange * changesPerYear * auditCost;

  const opexLow = (maintSavingsLow + auditPrepSavingsAnnual) * horizonYears;
  const opexHigh = (maintSavingsHigh + auditPrepSavingsAnnual) * horizonYears;

  // ---- Render: upfront savings card ----
  if (showCapex) {
    els.capexCard.classList.remove("result-card--na");
    els.capexSub.textContent = "Compared to one big, risky project";
    tweenRange(els.capexValue, state.displayed.capexLow, capexLow, state.displayed.capexHigh, capexHigh);
  } else {
    els.capexCard.classList.add("result-card--na");
    els.capexValue.textContent = "Already lean";
    els.capexSub.textContent = "You're already doing this step-by-step — nice.";
  }

  // ---- Render: yearly savings card ----
  const horizonLabelText = horizonMonths === 12 ? "1 YR" : horizonMonths === 24 ? "2 YRS" : "3 YRS";
  els.horizonLabel.textContent = `/ ${horizonLabelText}`;
  tweenRange(els.opexValue, state.displayed.opexLow, opexLow, state.displayed.opexHigh, opexHigh);

  state.displayed = { capexLow: showCapex ? capexLow : 0, capexHigh: showCapex ? capexHigh : 0, opexLow, opexHigh };

  // ---- Context line ----
  els.contextLine.textContent = showCapex
    ? `For your ${ind.systemLabel}, this reflects avoiding the extra cost of one big, risky project, plus spending less on upkeep and audit prep — the kind of proof ${ind.regulator} would want ready to go, not put together at the last minute.`
    : `Since you're already modernizing step-by-step, the savings here come from spending less on upkeep and audit prep for your ${ind.systemLabel} — proof ${ind.regulator} would want ready to go, not put together at the last minute.`;

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

  const delta = bigBangExposure - governedBudget;
  els.compareDelta.innerHTML = `That's roughly <strong>${fmtCompact(delta)}</strong> lower with the step-by-step plan.`;
}

// ---------- Init ----------
els.year.textContent = new Date().getFullYear();
applyIndustryDefaults();
moveIndicator(0);
