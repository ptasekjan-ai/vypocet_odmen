const kpsOptions = [
  {
    code: "K1",
    value: 0.35,
    role: "účetní, recepční, asistent/ka"
  },
  {
    code: "K2",
    value: 0.45,
    role: "obchodní manažer/ka, konzultant/ka, vývojář/ka, vedoucí oddělení, štábní zaměstnanec, ředitel/ka"
  }
];

const kohpsOptions = [
  { code: "H1", value: 0.30, role: "výkonný ředitel" },
  { code: "H2", value: 0.40, role: "ředitel/ka útvaru" },
  { code: "H3", value: 0.60, role: "vedoucí oddělení" },
  { code: "H4", value: 0.70, role: "řadový zaměstnanec" },
  { code: "H5", value: 0.30, role: "obchodní manažer/ka, produktový manažer/ka, jejich nadřízení" }
];

const corporateKvBands = [
  { label: "Nad 110 %", test: (value) => value > 110, values: { H1: 1.30, H2: 1.25, H3: 1.20, H4: 1.15 } },
  { label: "101-110 %", test: (value) => value >= 101 && value <= 110, values: { H1: 1.15, H2: 1.13, H3: 1.11, H4: 1.07 } },
  { label: "99,9-100,9 %", test: (value) => value >= 99.9 && value <= 100.9, values: { H1: 1.00, H2: 1.00, H3: 1.00, H4: 1.00 } },
  { label: "97-99,89 %", test: (value) => value >= 97 && value <= 99.89, values: { H1: 0.74, H2: 0.76, H3: 0.78, H4: 0.80 } },
  { label: "93-96,9 %", test: (value) => value >= 93 && value <= 96.9, values: { H1: 0.50, H2: 0.55, H3: 0.60, H4: 0.65 } },
  { label: "90-92,9 %", test: (value) => value >= 90 && value <= 92.9, values: { H1: 0.30, H2: 0.35, H3: 0.40, H4: 0.45 } }
];

const h5Rules = [
  ["150 % a více", "(plnění + 50) / 100"],
  ["100-149 %", "(plnění × 2 - 100) / 100"],
  ["100 %", "1,00"],
  ["90-99 %", "0,85-0,99"],
  ["80-89 %", "0,75-0,84"],
  ["80 % a méně", "0,00"]
];

const defaults = {
  salary: 73630,
  kpsCode: "K2",
  kohpsCode: "H5",
  personalFulfillment: 100,
  prp: 100,
  mealDays: 20,
  mealContribution: 40,
  annualBenefit: 9200,
  incomeIncrease: 7,
  legacyCoefficient: 0.39535,
  profitPlan: 67980000,
  profitActual: 48510000,
  revenuePlan: 409800000,
  revenueActual: 375095478
};

const elements = {};
const inputIds = [
  "salary",
  "kpsCode",
  "kohpsCode",
  "personalFulfillment",
  "prp",
  "profitPlan",
  "profitActual",
  "revenuePlan",
  "revenueActual"
];

const outputIds = [
  "classificationSummary",
  "classificationPercent",
  "kps",
  "kohps",
  "kpsRoleHint",
  "kohpsRoleHint",
  "personalTargetGroup",
  "personalFulfillmentOutput",
  "prpOutput",
  "coefficientState",
  "monthlyReward",
  "annualReward",
  "formulaLine",
  "profitFulfillment",
  "revenueFulfillment",
  "businessAverage",
  "businessCoefficient",
  "businessModeBadge",
  "rulesBadge",
  "rulesList",
  "kpsRows",
  "kohpsRows",
  "scenarioRows"
];

let scenarios = loadScenarios();

function byId(id) {
  return document.getElementById(id);
}

function numberValue(id) {
  const value = Number(elements[id].value);
  return Number.isFinite(value) ? value : 0;
}

function percentValue(id) {
  return numberValue(id) / 100;
}

function formatCurrency(value, digits = 0) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "currency",
    currency: "CZK",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

function formatPercent(value, digits = 0) {
  return new Intl.NumberFormat("cs-CZ", {
    style: "percent",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value);
}

function formatPlainPercent(value, digits = 2) {
  return new Intl.NumberFormat("cs-CZ", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  }).format(value) + " %";
}

function ceiling(value, significance = 1) {
  if (!Number.isFinite(value) || significance === 0) {
    return 0;
  }
  return Math.ceil(value / significance) * significance;
}

function findByCode(options, code) {
  return options.find((option) => option.code === code) || options[0];
}

function h5CoefficientFromFulfillment(percent) {
  if (percent <= 80) {
    return 0;
  }
  if (percent < 90) {
    return (percent - 5) / 100;
  }
  if (percent < 100) {
    return 0.85 + ((percent - 90) / 9) * 0.14;
  }
  if (percent < 150) {
    return (percent * 2 - 100) / 100;
  }
  return (percent + 50) / 100;
}

function calculateBusinessValues(hCode) {
  const profitFulfillment = numberValue("profitPlan") ? (numberValue("profitActual") / numberValue("profitPlan")) * 100 : 0;
  const revenueFulfillment = numberValue("revenuePlan") ? (numberValue("revenueActual") / numberValue("revenuePlan")) * 100 : 0;
  const average = (profitFulfillment + revenueFulfillment) / 2;
  const band = corporateKvBands.find((item) => item.test(average));
  const coefficient = band && band.values[hCode] ? band.values[hCode] : 0;

  return {
    profitFulfillment,
    revenueFulfillment,
    average,
    band,
    coefficient
  };
}

function readState() {
  const kpsOption = findByCode(kpsOptions, elements.kpsCode.value);
  const kohpsOption = findByCode(kohpsOptions, elements.kohpsCode.value);
  const isH5 = kohpsOption.code === "H5";
  const business = calculateBusinessValues(kohpsOption.code);
  const personalCoefficient = h5CoefficientFromFulfillment(numberValue("personalFulfillment"));
  const kv = isH5 ? personalCoefficient : business.coefficient;

  return {
    salary: numberValue("salary"),
    kpsCode: kpsOption.code,
    hCode: kohpsOption.code,
    kps: kpsOption.value,
    kohps: kohpsOption.value,
    classificationPercent: kpsOption.value * kohpsOption.value,
    personalFulfillment: numberValue("personalFulfillment"),
    personalCoefficient,
    isH5,
    business,
    kv,
    prp: percentValue("prp"),
    mealDays: defaults.mealDays,
    mealContribution: defaults.mealContribution,
    annualBenefit: defaults.annualBenefit,
    incomeIncrease: defaults.incomeIncrease / 100,
    legacyCoefficient: defaults.legacyCoefficient,
    profitPlan: numberValue("profitPlan"),
    profitActual: numberValue("profitActual"),
    revenuePlan: numberValue("revenuePlan"),
    revenueActual: numberValue("revenueActual")
  };
}

function calculateReward(state) {
  const annualSalary = state.salary * 12;
  const annualRewardRaw = annualSalary * state.kps * (1 - state.kohps) * state.kv * state.prp;
  const annualRewardRounded = ceiling(annualRewardRaw, 1);
  const monthlyReward = annualRewardRounded / 12;
  const baseWithOh = state.salary * state.kps * state.kohps + state.salary;
  const socialIncrease = baseWithOh * state.incomeIncrease;
  const mealAndBenefit = state.mealDays * state.mealContribution + state.annualBenefit / 12;
  const legacyMonthlyReward =
    annualSalary * state.kps * (1 - state.kohps) * state.legacyCoefficient * state.prp / 12;
  const totalMonthlyIncrease = monthlyReward - legacyMonthlyReward + mealAndBenefit + socialIncrease;

  return {
    annualSalary,
    annualRewardRaw,
    annualRewardRounded,
    monthlyReward,
    baseWithOh,
    socialIncrease,
    mealAndBenefit,
    legacyMonthlyReward,
    totalMonthlyIncrease
  };
}

function populateSelects() {
  elements.kpsCode.innerHTML = kpsOptions.map((option) => `
    <option value="${option.code}">${option.code} - ${formatPercent(option.value)}</option>
  `).join("");

  elements.kohpsCode.innerHTML = kohpsOptions.map((option) => `
    <option value="${option.code}">${option.code} - ${formatPercent(option.value)}</option>
  `).join("");
}

function renderFormula(state, result) {
  const line = [
    formatCurrency(state.salary, 0),
    "× 12 ×",
    formatPercent(state.kps),
    "× (1 -",
    formatPercent(state.kohps) + ") ×",
    formatPercent(state.kv),
    "×",
    formatPercent(state.prp),
    "=",
    formatCurrency(result.annualRewardRaw, 2)
  ];

  elements.formulaLine.textContent = line.join(" ");
}

function renderBusiness(state) {
  const business = state.business;
  elements.profitFulfillment.textContent = formatPlainPercent(business.profitFulfillment, 2);
  elements.revenueFulfillment.textContent = formatPlainPercent(business.revenueFulfillment, 2);
  elements.businessAverage.textContent = formatPlainPercent(business.average, 2);
  elements.businessCoefficient.textContent = state.isH5 ? "-" : formatPercent(business.coefficient);
  elements.businessModeBadge.textContent = state.isH5 ? "H5 používá osobní cíle" : `aktivní ${state.hCode}`;
}

function renderRules(state) {
  if (state.isH5) {
    elements.rulesBadge.textContent = "H5";
    elements.rulesList.innerHTML = `
      <div class="table-wrap">
        <table class="compact-table kv-table">
          <thead>
            <tr>
              <th>Plnění osobních cílů</th>
              <th>kV</th>
            </tr>
          </thead>
          <tbody>
            ${h5Rules.map(([limit, formula]) => `
              <tr class="${h5RuleIsActive(limit, state.personalFulfillment) ? "is-active" : ""}">
                <td>${limit}</td>
                <td>${formula}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    return;
  }

  elements.rulesBadge.textContent = "H1-H4";
  elements.rulesList.innerHTML = `
    <div class="table-wrap">
      <table class="compact-table kv-table">
        <thead>
          <tr>
            <th>Plnění firemních cílů</th>
            <th class="${state.hCode === "H1" ? "selected-col" : ""}">H1</th>
            <th class="${state.hCode === "H2" ? "selected-col" : ""}">H2</th>
            <th class="${state.hCode === "H3" ? "selected-col" : ""}">H3</th>
            <th class="${state.hCode === "H4" ? "selected-col" : ""}">H4</th>
          </tr>
        </thead>
        <tbody>
          ${corporateKvBands.map((band) => `
            <tr class="${state.business.band === band ? "is-active" : ""}">
              <td>${band.label}</td>
              ${["H1", "H2", "H3", "H4"].map((code) => `
                <td class="${state.hCode === code ? "selected-col" : ""}">${formatPercent(band.values[code])}</td>
              `).join("")}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function h5RuleIsActive(limit, value) {
  if (limit.startsWith("150")) return value >= 150;
  if (limit.startsWith("100-149")) return value > 100 && value < 150;
  if (limit.startsWith("100 %")) return value === 100;
  if (limit.startsWith("90")) return value >= 90 && value < 100;
  if (limit.startsWith("80-89")) return value > 80 && value < 90;
  return value <= 80;
}

function renderCodebooks(state) {
  elements.kpsRows.innerHTML = kpsOptions.map((option) => `
    <tr class="${state.kpsCode === option.code ? "is-active" : ""}">
      <td>${option.code}</td>
      <td>${formatPercent(option.value)}</td>
      <td>${option.role}</td>
    </tr>
  `).join("");

  elements.kohpsRows.innerHTML = kohpsOptions.map((option) => `
    <tr class="${state.hCode === option.code ? "is-active" : ""}">
      <td>${option.code}</td>
      <td>${formatPercent(option.value)}</td>
      <td>${option.role}</td>
    </tr>
  `).join("");
}

function renderScenarios() {
  if (!scenarios.length) {
    elements.scenarioRows.innerHTML = '<tr><td colspan="6" class="empty-cell">Zatím bez uložených scénářů.</td></tr>';
    return;
  }

  elements.scenarioRows.innerHTML = scenarios.map((scenario, index) => `
    <tr>
      <td>${index + 1}. ${scenario.name}</td>
      <td>${formatCurrency(scenario.salary, 0)}</td>
      <td>${formatPercent(scenario.kv)}</td>
      <td>${formatCurrency(scenario.annualRewardRounded, 0)}</td>
      <td>${formatCurrency(scenario.monthlyReward, 0)}</td>
      <td>${formatCurrency(scenario.totalMonthlyIncrease, 0)}</td>
    </tr>
  `).join("");
}

function update() {
  const state = readState();
  const result = calculateReward(state);
  const source = state.isH5 ? "osobní cíle" : "firemní cíle";

  elements.classificationSummary.textContent = `${state.kpsCode} / ${state.hCode}`;
  elements.classificationPercent.value = (state.classificationPercent * 100).toFixed(1);
  elements.kps.value = (state.kps * 100).toFixed(0);
  elements.kohps.value = (state.kohps * 100).toFixed(0);
  elements.kpsRoleHint.textContent = findByCode(kpsOptions, state.kpsCode).role;
  elements.kohpsRoleHint.textContent = findByCode(kohpsOptions, state.hCode).role;
  elements.personalTargetGroup.hidden = !state.isH5;
  elements.personalFulfillmentOutput.textContent = formatPlainPercent(state.personalFulfillment, 0);
  elements.prpOutput.textContent = formatPercent(state.prp);
  elements.coefficientState.textContent = `kV: ${formatPercent(state.kv)} (${source})`;
  elements.annualReward.textContent = formatCurrency(result.annualRewardRounded, 0);
  elements.monthlyReward.textContent = `Měsíčně: ${formatCurrency(result.monthlyReward, 0)}`;

  renderFormula(state, result);
  renderBusiness(state);
  renderRules(state);
  renderCodebooks(state);

  return { state, result };
}

function setDefaults() {
  Object.entries(defaults).forEach(([id, value]) => {
    if (!elements[id]) {
      return;
    }
    elements[id].value = value;
  });
  update();
}

function addScenario() {
  const { state, result } = update();
  const name = `${state.kpsCode}/${state.hCode} · ZM ${formatCurrency(state.salary, 0)} · kV ${formatPercent(state.kv)}`;
  scenarios.unshift({
    name,
    salary: state.salary,
    kv: state.kv,
    annualRewardRounded: result.annualRewardRounded,
    monthlyReward: result.monthlyReward,
    totalMonthlyIncrease: result.totalMonthlyIncrease
  });
  scenarios = scenarios.slice(0, 8);
  saveScenarios();
  renderScenarios();
}

function clearScenarios() {
  scenarios = [];
  saveScenarios();
  renderScenarios();
}

function saveScenarios() {
  localStorage.setItem("reward-calculator-scenarios", JSON.stringify(scenarios));
}

function loadScenarios() {
  try {
    return JSON.parse(localStorage.getItem("reward-calculator-scenarios")) || [];
  } catch {
    return [];
  }
}

function init() {
  [...inputIds, ...outputIds].forEach((id) => {
    elements[id] = byId(id);
  });

  populateSelects();
  setDefaults();

  inputIds.forEach((id) => {
    elements[id].addEventListener("input", update);
    elements[id].addEventListener("change", update);
  });

  byId("resetButton").addEventListener("click", setDefaults);
  byId("addScenarioButton").addEventListener("click", addScenario);
  byId("clearScenariosButton").addEventListener("click", clearScenarios);

  renderScenarios();
  update();
}

init();
