// ===================== BEGIN: utils.js (FULL REPLACEMENT) =====================
"use strict";

// ===================== BEGIN: GLOBAL STORAGE HELPERS =====================
window.loadJSON = function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
};

window.saveJSON = function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore
  }
};
// ===================== END: GLOBAL STORAGE HELPERS =====================

// ---------- Storage helpers ----------
const STORAGE_KEYS = {
  mode: "sourdoh.mode",
  units: "sourdoh.units",
  starters: "sourdoh.starters",
  feeds: "sourdoh.feeds",
  bakes: "sourdoh.bakes",
  journal: "sourdoh.journal",
  family: "sourdoh.family",
};

// Make sure other scripts can access bodyEl even if they expect it on window
window.bodyEl = document.body;

// LocalStorage JSON helpers
function loadJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // ignore quota / private mode errors for prototype
  }
}

// Safe HTML escaping
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c;
  });
}
function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

// ---------- Units + conversions ----------
// Defaults: you said "C sounds good for visibility", so default temp = Celsius. :contentReference[oaicite:1]{index=1}
const DEFAULT_UNITS = {
  weight: "g",    // g | oz
  temp: "c",      // c | f
  volume: "ml",   // ml | floz  (we’ll wire UI later, but support is here)
};

function normalizeUnits(u) {
  const safe = Object.assign({}, DEFAULT_UNITS, u || {});
  safe.weight = safe.weight === "oz" ? "oz" : "g";
  safe.temp   = safe.temp === "f" ? "f" : "c";
  safe.volume = safe.volume === "floz" ? "floz" : "ml";
  return safe;
}

function gramsToOunces(g) { return g / 28.349523125; }
function ouncesToGrams(oz) { return oz * 28.349523125; }

function cToF(c) { return (c * 9) / 5 + 32; }
function fToC(f) { return ((f - 32) * 5) / 9; }

function mlToFlOz(ml) { return ml / 29.5735295625; }
function flOzToMl(oz) { return oz * 29.5735295625; }

// Update little unit labels in the UI (you already use data-units-label="temp"/"weight") :contentReference[oaicite:2]{index=2}
function applyUnitsToLabels(units) {
  const u = normalizeUnits(units);

  // Body dataset (handy for CSS hooks)
  document.body.dataset.unitsWeight = u.weight;
  document.body.dataset.unitsTemp = u.temp;
  document.body.dataset.unitsVolume = u.volume;

  // Inline labels
  document.querySelectorAll('[data-units-label="weight"]').forEach((el) => {
    el.textContent = u.weight === "oz" ? "oz" : "g";
  });
  document.querySelectorAll('[data-units-label="temp"]').forEach((el) => {
    el.textContent = u.temp === "f" ? "°F" : "°C";
  });
  document.querySelectorAll('[data-units-label="volume"]').forEach((el) => {
    el.textContent = u.volume === "floz" ? "fl oz" : "ml";
  });
}

// Pull current preference from Settings UI if it exists (IDs come from your Settings page) :contentReference[oaicite:3]{index=3}
function getUnitsFromSettingsDomOrNull() {
  const g = document.getElementById("weightUnitsGrams");
  const o = document.getElementById("weightUnitsOunces");
  const c = document.getElementById("tempUnitsC");
  const f = document.getElementById("tempUnitsF");

  // If settings inputs aren’t on the page yet, don’t guess from them
  if (!g && !o && !c && !f) return null;

  const weight =
    o && o.checked ? "oz" :
    g && g.checked ? "g" :
    null;

  const temp =
    f && f.checked ? "f" :
    c && c.checked ? "c" :
    null;

  const out = {};
  if (weight) out.weight = weight;
  if (temp) out.temp = temp;

  return Object.keys(out).length ? out : null;
}

// The single source of truth for unit prefs
window.SDUnits = {
  get() {
    const stored = loadJSON(STORAGE_KEYS.units, null);
    return normalizeUnits(stored);
  },

  set(partial) {
    const current = window.SDUnits.get();
    const next = normalizeUnits(Object.assign({}, current, partial || {}));
    saveJSON(STORAGE_KEYS.units, next);
    applyUnitsToLabels(next);
    return next;
  },

  // Ensure we always have something stored (so debug panel never sees {})
  ensure() {
    const storedRaw = loadJSON(STORAGE_KEYS.units, null);

    // If storage already has something valid, normalize + apply labels
    if (storedRaw && typeof storedRaw === "object") {
      const n = normalizeUnits(storedRaw);
      saveJSON(STORAGE_KEYS.units, n);
      applyUnitsToLabels(n);
      return n;
    }

    // Otherwise, try to seed from Settings UI (if present)
    const domUnits = getUnitsFromSettingsDomOrNull();
    const seeded = normalizeUnits(domUnits || DEFAULT_UNITS);

    saveJSON(STORAGE_KEYS.units, seeded);
    applyUnitsToLabels(seeded);
    return seeded;
  },
};

// Bind change events on Settings inputs so storage actually updates
function bindUnitsSettingsListeners() {
  const ids = ["weightUnitsGrams", "weightUnitsOunces", "tempUnitsC", "tempUnitsF"];
  const inputs = ids.map((id) => document.getElementById(id)).filter(Boolean);
  if (!inputs.length) return;

  inputs.forEach((el) => {
    el.addEventListener("change", () => {
      const domUnits = getUnitsFromSettingsDomOrNull();
      if (domUnits) window.SDUnits.set(domUnits);
    });
  });
}

// Snapshot for debug window (this is what we print)
window.readCurrentSettingsSnapshot = function readCurrentSettingsSnapshot() {
  const mode = loadJSON(STORAGE_KEYS.mode, null);
  const units = window.SDUnits ? window.SDUnits.get() : loadJSON(STORAGE_KEYS.units, {});
  return {
    mode: mode ?? "(not set yet)",
    units,
    storageKeys: STORAGE_KEYS,
  };
};

// Bootstrapping (safe to run on every page load)
document.addEventListener("DOMContentLoaded", () => {
  // Make sure units exist + labels update
  if (window.SDUnits) window.SDUnits.ensure();
  bindUnitsSettingsListeners();
});
// ===================== END: utils.js (FULL REPLACEMENT) =====================

// ===================== BEGIN: GLOBAL BAKER MODE (BEGINNER / EXPERT) =====================
(function () {
  const MODE_KEY = "sourdoh.mode";
  const VALID = ["beginner", "expert"];

  function getMode() {
    const m = localStorage.getItem(MODE_KEY);
    return VALID.includes(m) ? m : "beginner";
  }

  function setMode(mode) {
    const next = VALID.includes(mode) ? mode : "beginner";
    localStorage.setItem(MODE_KEY, next);
    applyMode();
    window.dispatchEvent(new CustomEvent("sourdoh:modechange", { detail: next }));
  }

  function toggleMode() {
    setMode(getMode() === "beginner" ? "expert" : "beginner");
  }

  function applyMode() {
    const mode = getMode();
    document.documentElement.dataset.bakerMode = mode;

    document.querySelectorAll(".beginner-only").forEach(el => {
      el.style.display = mode === "beginner" ? "" : "none";
    });
    document.querySelectorAll(".expert-only").forEach(el => {
      el.style.display = mode === "expert" ? "" : "none";
    });

    const text = document.getElementById("globalModeText");
    if (text) text.textContent = mode === "expert" ? "Expert" : "Beginner";
  }

  window.SDMode = { get: getMode, set: setMode, toggle: toggleMode, apply: applyMode };
  document.addEventListener("DOMContentLoaded", applyMode);
})();
// ===================== END: GLOBAL BAKER MODE (BEGINNER / EXPERT) =====================
