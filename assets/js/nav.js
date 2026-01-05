"use strict";

// ===================== BEGIN: NAVIGATION =====================
const navButtons = document.querySelectorAll(".app-nav-button");
const sections = document.querySelectorAll(".app-section");

function showSection(sectionName) {
  const targetId = "section-" + sectionName;
  sections.forEach((sec) => {
    sec.classList.toggle("app-section-active", sec.id === targetId);
  });
}

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const section = btn.getAttribute("data-section");
    if (!section) return;

    navButtons.forEach((b) => b.classList.toggle("app-nav-active", b === btn));
    showSection(section);
  });
});
// ===================== END: NAVIGATION =====================


// ===================== BEGIN: UNITS (SAVE LEGACY + BUNDLED) =====================
const bodyEl = document.body;

// Legacy keys (keep)
const WEIGHT_UNITS_KEY = "sourdoh.weightUnits";
const TEMP_UNITS_KEY   = "sourdoh.tempUnits";

// Bundled key (debug window reads this)
const UNITS_BUNDLE_KEY = "sourdoh.units";

// Controls (must match your HTML ids)
const weightUnitsGrams    = document.getElementById("weightUnitsGrams");
const weightUnitsOunces   = document.getElementById("weightUnitsOunces");
const tempUnitsCelsius    = document.getElementById("tempUnitsCelsius");
const tempUnitsFahrenheit = document.getElementById("tempUnitsFahrenheit");

// Optional volume (if present in HTML)
const volumeUnitsMl       = document.getElementById("volumeUnitsMl");
const volumeUnitsFloz     = document.getElementById("volumeUnitsFloz");

// Old combined controls (if present)
const unitsMetric   = document.getElementById("unitsMetric");
const unitsImperial = document.getElementById("unitsImperial");

// Labels in markup
const weightLabels = document.querySelectorAll('[data-units-label="weight"]');
const tempLabels   = document.querySelectorAll('[data-units-label="temp"]');
const volumeLabels = document.querySelectorAll('[data-units-label="volume"]');

// ---- bundle helpers ----
function normalizeUnitsBundle(u) {
  const out = Object.assign({ weight: "g", temp: "f", volume: "ml" }, (u && typeof u === "object") ? u : {});
  out.weight = out.weight === "oz" ? "oz" : "g";
  out.temp   = out.temp === "c" ? "c" : "f";
  out.volume = out.volume === "floz" ? "floz" : "ml";
  return out;
}

function readUnitsBundle() {
  return normalizeUnitsBundle(loadJSON(UNITS_BUNDLE_KEY, null));
}

function writeUnitsBundle(partial) {
  const next = normalizeUnitsBundle(Object.assign(readUnitsBundle(), partial || {}));
  saveJSON(UNITS_BUNDLE_KEY, next);
  return next;
}

// ---- placeholders ----
function updateUnitPlaceholders() {
  const tempUnit   = bodyEl.getAttribute("data-temp-units") === "F" ? "F" : "C";
  const weightUnit = bodyEl.getAttribute("data-weight-units") === "oz" ? "oz" : "g";

  const feedTempInput = document.getElementById("feedTemp");
  if (feedTempInput) feedTempInput.placeholder = tempUnit === "F" ? "73" : "23";

  const ambientTempInput = document.getElementById("ambientTemp");
  if (ambientTempInput) ambientTempInput.placeholder = tempUnit === "F" ? "73.0" : "23.0";

  const targetWeightInput = document.getElementById("targetWeight");
  if (targetWeightInput) targetWeightInput.placeholder = weightUnit === "oz" ? "32" : "900";

  const bakeDoughWeightInput = document.getElementById("bakeDoughWeight");
  if (bakeDoughWeightInput) bakeDoughWeightInput.placeholder = weightUnit === "oz" ? "32" : "";

  const flowStarterTemp = document.getElementById("starterTemp");
  if (flowStarterTemp) flowStarterTemp.placeholder = tempUnit === "F" ? "e.g. 72°F" : "e.g. 22°C";

  const flowBulkTemp = document.getElementById("bulkTemp");
  if (flowBulkTemp) flowBulkTemp.placeholder = tempUnit === "F" ? "e.g. 75°F" : "e.g. 24°C";

  const flowBakeTemp = document.getElementById("bakeTemp");
  if (flowBakeTemp) {
    flowBakeTemp.placeholder =
      tempUnit === "F"
        ? "e.g. 500°F preheat, 450°F bake, steam for 20 min"
        : "e.g. 260°C preheat, 230°C bake, steam for 20 min";
  }
}

function applyWeightUnits(units) {
  const u = units === "oz" ? "oz" : "g";
  bodyEl.setAttribute("data-weight-units", u);

  weightLabels.forEach((el) => (el.textContent = u === "oz" ? "oz" : "g"));
  if (weightUnitsGrams)  weightUnitsGrams.checked  = u === "g";
  if (weightUnitsOunces) weightUnitsOunces.checked = u === "oz";

  saveJSON(WEIGHT_UNITS_KEY, u);
  writeUnitsBundle({ weight: u });
  updateUnitPlaceholders();
}

function applyTempUnits(units) {
  const t = units === "F" ? "F" : "C";
  bodyEl.setAttribute("data-temp-units", t);

  tempLabels.forEach((el) => (el.textContent = t === "F" ? "°F" : "°C"));
  if (tempUnitsCelsius)    tempUnitsCelsius.checked    = t === "C";
  if (tempUnitsFahrenheit) tempUnitsFahrenheit.checked = t === "F";

  saveJSON(TEMP_UNITS_KEY, t);
  writeUnitsBundle({ temp: (t === "F" ? "f" : "c") });
  updateUnitPlaceholders();
}

function applyVolumeUnits(units) {
  const v = units === "floz" ? "floz" : "ml";
  bodyEl.dataset.unitsVolume = v;
  volumeLabels.forEach((el) => (el.textContent = v === "floz" ? "fl oz" : "ml"));

  if (volumeUnitsMl)   volumeUnitsMl.checked   = v === "ml";
  if (volumeUnitsFloz) volumeUnitsFloz.checked = v === "floz";

  writeUnitsBundle({ volume: v });
}

// ---- initial load ----
const bundled = readUnitsBundle();
const storedWeightUnits = loadJSON(WEIGHT_UNITS_KEY, null);
const storedTempUnits   = loadJSON(TEMP_UNITS_KEY, null);

// Ensure bundled units exist on first load (prevents {} in debug)
saveJSON("sourdoh.units", {
  weight: storedWeightUnits || "g",
  temp: storedTempUnits === "C" ? "c" : "f",
  volume: "ml"
});

applyWeightUnits(bundled.weight || storedWeightUnits || "g");

// bundled.temp is c|f; legacy temp is C|F
const initialTemp =
  (bundled.temp === "c") ? "C" :
  (bundled.temp === "f") ? "F" :
  (storedTempUnits || "F");
applyTempUnits(initialTemp);

if (volumeUnitsMl || volumeUnitsFloz) {
  applyVolumeUnits(bundled.volume || "ml");
}

// ---- events ----
if (weightUnitsGrams)  weightUnitsGrams.addEventListener("change", () => applyWeightUnits("g"));
if (weightUnitsOunces) weightUnitsOunces.addEventListener("change", () => applyWeightUnits("oz"));

if (tempUnitsCelsius)    tempUnitsCelsius.addEventListener("change", () => applyTempUnits("C"));
if (tempUnitsFahrenheit) tempUnitsFahrenheit.addEventListener("change", () => applyTempUnits("F"));

if (volumeUnitsMl)   volumeUnitsMl.addEventListener("change", () => applyVolumeUnits("ml"));
if (volumeUnitsFloz) volumeUnitsFloz.addEventListener("change", () => applyVolumeUnits("floz"));

// old combined radios fallback
if (!weightUnitsGrams && unitsMetric) {
  unitsMetric.addEventListener("change", () => {
    if (unitsMetric.checked) {
      applyWeightUnits("g");
      applyTempUnits("C");
      applyVolumeUnits("ml");
    }
  });
}
if (!weightUnitsOunces && unitsImperial) {
  unitsImperial.addEventListener("change", () => {
    if (unitsImperial.checked) {
      applyWeightUnits("oz");
      applyTempUnits("F");
      applyVolumeUnits("floz");
    }
  });
}
// ===================== END: UNITS (SAVE LEGACY + BUNDLED) =====================
