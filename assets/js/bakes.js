"use strict";

// ===================== BEGIN: BAKES MODULE =====================

// Load from localStorage
let bakes = loadJSON(STORAGE_KEYS.bakes, []);

// Buttons / list
const bakeSaveBtn = document.getElementById("bakeSaveBtn");
const bakeListEl  = document.getElementById("bakeList");

// Core bake meta
const bakeNameInput = document.getElementById("bakeName");
const bakeDateInput = document.getElementById("bakeDate");
// NOTE: bakeStarterSelect is defined in starter.js and reused here.

// Formula & dough
const bakeDoughWeightInput   = document.getElementById("bakeDoughWeight");
const bakeHydrationInput     = document.getElementById("bakeHydration");
const bakeSaltPercentInput   = document.getElementById("bakeSaltPercent");
const bakeLevainPercentInput = document.getElementById("bakeLevainPercent");

// Fermentation
const bakeAmbientTempInput   = document.getElementById("bakeAmbientTemp");
const bakeBulkStartTimeInput = document.getElementById("bakeBulkStartTime");
const bakeBulkEndTimeInput   = document.getElementById("bakeBulkEndTime");
const bakeBulkHoursInput     = document.getElementById("bakeBulkHours");
const bakeFoldsInput         = document.getElementById("bakeFolds");
const bakeFoldMethodSelect   = document.getElementById("bakeFoldMethod");
const bakeBulkNotesInput     = document.getElementById("bakeBulkNotes");

// Proof & bake
const bakeProofMethodSelect   = document.getElementById("bakeProofMethod");
const bakeProofStartTimeInput = document.getElementById("bakeProofStartTime");
const bakeProofEndTimeInput   = document.getElementById("bakeProofEndTime");
const bakeProofHoursInput     = document.getElementById("bakeProofHours");
const bakeProofTempInput      = document.getElementById("bakeProofTemp");
const bakeVesselSelect        = document.getElementById("bakeVessel");
const bakePreheatTempInput    = document.getElementById("bakePreheatTemp");
const bakeBakeTempInput       = document.getElementById("bakeBakeTemp");
const bakeCoveredMinutesInput   = document.getElementById("bakeCoveredMinutes");
const bakeUncoveredMinutesInput = document.getElementById("bakeUncoveredMinutes");
const bakeSteamMethodInput      = document.getElementById("bakeSteamMethod");
const bakeBakeNotesInput        = document.getElementById("bakeBakeNotes");

// Outcome / evaluation
const bakeCrumbInput    = document.getElementById("bakeCrumb");
const bakeCrustInput    = document.getElementById("bakeCrust");
const bakeSournessInput = document.getElementById("bakeSourness");
const bakeOverallInput  = document.getElementById("bakeOverall");
const bakeNotesInput    = document.getElementById("bakeNotes");

// ---------- Helpers ----------

function getInputNumber(input) {
  if (!input) return null;
  const raw = input.value.trim();
  if (!raw) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

function getInputString(input) {
  if (!input) return "";
  return input.value.trim();
}


function computeHoursFromTimes(startStr, endStr) {
  if (!startStr || !endStr) return null;

  const startParts = startStr.split(":");
  const endParts   = endStr.split(":");
  if (startParts.length !== 2 || endParts.length !== 2) return null;

  const sh = Number(startParts[0]);
  const sm = Number(startParts[1]);
  const eh = Number(endParts[0]);
  const em = Number(endParts[1]);

  const valid =
    Number.isFinite(sh) && Number.isFinite(sm) &&
    Number.isFinite(eh) && Number.isFinite(em) &&
    sh >= 0 && sh < 24 && sm >= 0 && sm < 60 &&
    eh >= 0 && eh < 24 && em >= 0 && em < 60;

  if (!valid) return null;

  let startMin = sh * 60 + sm;
  let endMin   = eh * 60 + em;

  // crossed midnight
  if (endMin < startMin) {
    endMin += 24 * 60;
  }

  const diffMinutes = endMin - startMin;
  const diffHours   = diffMinutes / 60;

  return Number.isFinite(diffHours) ? Number(diffHours.toFixed(2)) : null;
}

function saveBakes() {
  saveJSON(STORAGE_KEYS.bakes, bakes);
}

// ---------- Create bake object from form ----------

function createBakeFromForm() {
  const now = Date.now();

  // Starter selection & name (bakeStarterSelect comes from starter.js)
  const starterSelect = document.getElementById("bakeStarterSelect");
  const starterId = (starterSelect && starterSelect.value) || "";
  const starterName =
    starterSelect &&
    starterSelect.options &&
    starterSelect.selectedIndex >= 0
      ? starterSelect.options[starterSelect.selectedIndex].textContent.trim()
      : "";

  const bake = {
    id: "bake_" + now,
    createdAt: now,

    // Meta
    name: getInputString(bakeNameInput) || "Untitled bake",
    date: getInputString(bakeDateInput),

    starterId,
    starterName,

    // Formula
    doughWeight:   getInputNumber(bakeDoughWeightInput),
    hydration:     getInputNumber(bakeHydrationInput),
    saltPercent:   getInputNumber(bakeSaltPercentInput),
    levainPercent: getInputNumber(bakeLevainPercentInput),

// Fermentation
    ambientTemp: getInputNumber(bakeAmbientTempInput),

    // Bulk times (store both times and derived hours)
    bulkStartTime: (bakeBulkStartTimeInput && bakeBulkStartTimeInput.value.trim()) || "",
    bulkEndTime:   (bakeBulkEndTimeInput && bakeBulkEndTimeInput.value.trim())   || "",
    bulkHours: (function () {
      const startStr = bakeBulkStartTimeInput && bakeBulkStartTimeInput.value.trim();
      const endStr   = bakeBulkEndTimeInput && bakeBulkEndTimeInput.value.trim();
      const derived  = computeHoursFromTimes(startStr, endStr);
      return derived != null ? derived : getInputNumber(bakeBulkHoursInput);
    })(),

    folds:      getInputNumber(bakeFoldsInput),
    foldMethod: getInputString(bakeFoldMethodSelect),
    bulkNotes:  getInputString(bakeBulkNotesInput),

    // Proof & bake
    proofMethod: getInputString(bakeProofMethodSelect),

    // Proof times (store both times and derived hours)
    proofStartTime: (bakeProofStartTimeInput && bakeProofStartTimeInput.value.trim()) || "",
    proofEndTime:   (bakeProofEndTimeInput && bakeProofEndTimeInput.value.trim())   || "",
    proofHours: (function () {
      const startStr = bakeProofStartTimeInput && bakeProofStartTimeInput.value.trim();
      const endStr   = bakeProofEndTimeInput && bakeProofEndTimeInput.value.trim();
      const derived  = computeHoursFromTimes(startStr, endStr);
      return derived != null ? derived : getInputNumber(bakeProofHoursInput);
    })(),

    proofTemp:        getInputNumber(bakeProofTempInput),
    vessel:           getInputString(bakeVesselSelect),
    preheatTemp:      getInputNumber(bakePreheatTempInput),
    bakeTemp:         getInputNumber(bakeBakeTempInput),
    coveredMinutes:   getInputNumber(bakeCoveredMinutesInput),
    uncoveredMinutes: getInputNumber(bakeUncoveredMinutesInput),
    steamMethod:      getInputString(bakeSteamMethodInput),
    bakeNotes:        getInputString(bakeBakeNotesInput),

    // Evaluation
    crumb:    getInputNumber(bakeCrumbInput),
    crust:    getInputNumber(bakeCrustInput),
    sourness: getInputNumber(bakeSournessInput),
    overall:  getInputNumber(bakeOverallInput),
    notes:    getInputString(bakeNotesInput)
  };

  return bake;
}

// ---------- Render list ----------

function renderBakes() {
  if (!bakeListEl) return;

  if (!Array.isArray(bakes) || bakes.length === 0) {
    bakeListEl.innerHTML =
      '<div class="list-empty">No bakes logged yet. Your future perfect loaf starts here.</div>';
    return;
  }

  const itemsHtml = bakes
    .slice()
    .sort((a, b) => {
      const at = a.createdAt || a.date || "";
      const bt = b.createdAt || b.date || "";
      return String(at).localeCompare(String(bt));
    })
    .reverse()
    .map((bake) => {
      const name = bake.name || "Untitled bake";
      const date = bake.date || "";
      const starterName = bake.starterName || "Unknown starter";

      const hydration =
        typeof bake.hydration === "number" && Number.isFinite(bake.hydration)
          ? `${bake.hydration}%`
          : "N/A";

      const summary = `
        <div class="bake-card-header">
          <div class="bake-card-title">${name}</div>
          <div class="bake-card-meta">
            <span>${date}</span>
            <span>${starterName}</span>
            <span>${hydration} hydration</span>
          </div>
        </div>
      `;

      const fermentation = `
        <div class="bake-card-section">
          <div class="bake-card-section-title">Fermentation</div>
          <div class="bake-card-section-body">
            <div>Ambient: ${
              bake.ambientTemp != null ? bake.ambientTemp + "°" : "N/A"
            }</div>
            <div>Bulk: ${
              bake.bulkHours != null ? bake.bulkHours + " h" : "N/A"
            } ${
              bake.folds != null ? `· ${bake.folds} folds` : ""
            }</div>
            <div>Notes: ${bake.bulkNotes || "—"}</div>
          </div>
        </div>
      `;

      const proofAndBake = `
        <div class="bake-card-section">
          <div class="bake-card-section-title">Proof & bake</div>
          <div class="bake-card-section-body">
            <div>Proof: ${
              bake.proofHours != null ? bake.proofHours + " h" : "N/A"
            } at ${
              bake.proofTemp != null ? bake.proofTemp + "°" : "?"
            }</div>
            <div>Vessel: ${bake.vessel || "—"}</div>
            <div>Temps: preheat ${
              bake.preheatTemp != null ? bake.preheatTemp + "°" : "?"
            }, bake ${
              bake.bakeTemp != null ? bake.bakeTemp + "°" : "?"
            }</div>
            <div>Covered / uncovered: ${
              bake.coveredMinutes != null ? bake.coveredMinutes + " min" : "?"
            } / ${
              bake.uncoveredMinutes != null ? bake.uncoveredMinutes + " min" : "?"
            }</div>
            <div>Steam: ${bake.steamMethod || "—"}</div>
            <div>Notes: ${bake.bakeNotes || "—"}</div>
          </div>
        </div>
      `;

      const evaluation = `
        <div class="bake-card-section">
          <div class="bake-card-section-title">Evaluation</div>
          <div class="bake-card-section-body">
            <div>Crumb: ${bake.crumb != null ? bake.crumb : "—"}/10</div>
            <div>Crust: ${bake.crust != null ? bake.crust : "—"}/10</div>
            <div>Sourness: ${bake.sourness != null ? bake.sourness : "—"}/10</div>
            <div>Overall: ${bake.overall != null ? bake.overall : "—"}/10</div>
            <div>Notes: ${bake.notes || "—"}</div>
          </div>
        </div>
      `;

      return `
        <article class="bake-card">
          ${summary}
          ${fermentation}
          ${proofAndBake}
          ${evaluation}
        </article>
      `;
    })
    .join("");

  bakeListEl.innerHTML = itemsHtml;
}

// ---------- Save handler ----------

if (bakeSaveBtn) {
  bakeSaveBtn.addEventListener("click", () => {
    const bake = createBakeFromForm();
    if (!Array.isArray(bakes)) bakes = [];
    bakes.push(bake);
    saveBakes();
    renderBakes();

    if (bakeNameInput) bakeNameInput.value = "";
    if (bakeDoughWeightInput) bakeDoughWeightInput.value = "";
    if (bakeHydrationInput) bakeHydrationInput.value = "";
    if (bakeSaltPercentInput) bakeSaltPercentInput.value = "";
    if (bakeLevainPercentInput) bakeLevainPercentInput.value = "";
    if (bakeAmbientTempInput) bakeAmbientTempInput.value = "";
    if (bakeBulkStartTimeInput) bakeBulkStartTimeInput.value = "";
    if (bakeBulkEndTimeInput) bakeBulkEndTimeInput.value = "";
    if (bakeFoldsInput) bakeFoldsInput.value = "";
    if (bakeFoldMethodSelect) bakeFoldMethodSelect.value = "";
    if (bakeBulkNotesInput) bakeBulkNotesInput.value = "";
    if (bakeProofMethodSelect) bakeProofMethodSelect.value = "";
    if (bakeProofStartTimeInput) bakeProofStartTimeInput.value = "";
    if (bakeProofEndTimeInput) bakeProofEndTimeInput.value = "";
    if (bakeProofTempInput) bakeProofTempInput.value = "";
    if (bakeVesselSelect) bakeVesselSelect.value = "";
    if (bakePreheatTempInput) bakePreheatTempInput.value = "";
    if (bakeBakeTempInput) bakeBakeTempInput.value = "";
    if (bakeCoveredMinutesInput) bakeCoveredMinutesInput.value = "";
    if (bakeUncoveredMinutesInput) bakeUncoveredMinutesInput.value = "";
    if (bakeSteamMethodInput) bakeSteamMethodInput.value = "";
    if (bakeBakeNotesInput) bakeBakeNotesInput.value = "";
    if (bakeCrumbInput) bakeCrumbInput.value = "";
    if (bakeCrustInput) bakeCrustInput.value = "";
    if (bakeSournessInput) bakeSournessInput.value = "";
    if (bakeOverallInput) bakeOverallInput.value = "";
    if (bakeNotesInput) bakeNotesInput.value = "";
  });
}

// Initialize date to today if empty
if (bakeDateInput && !bakeDateInput.value) {
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  bakeDateInput.value = iso;
}

// Initial render on load
renderBakes();

// ===================== END: BAKES MODULE =====================
// ===================== BEGIN: BAKE TIMERS (Bakes page wiring) =====================
(function () {
  "use strict";

  function $(sel, root = document) { return root.querySelector(sel); }

  function ensureTimersReady() {
    if (!window.SDTimers) {
      console.warn("Bake timers: SDTimers not found. Is assets/js/timers.js loaded?");
      return false;
    }
    return true;
  }

  function hoursToSec(h) {
    const n = parseFloat(h);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 3600);
  }

  function minutesToSec(m) {
    const n = parseFloat(m);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.round(n * 60);
  }

  function formatDuration(sec) {
    const s = Math.max(0, Math.floor(sec));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

    function makeBtn(id, label, kind) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `timer-btn timer-btn--${kind}`;
    b.id = id;
    b.textContent = label;
    return b;
    }

function setBtnState(btnId, timerId) {
  const btn = document.getElementById(btnId);
  if (!btn || !window.SDTimers) return;

  const base = btn.dataset.baseLabel || btn.textContent || "";
  const t = SDTimers.getTimer(timerId);

  // No timer or completed: reset label + enable
  if (!t || t.isComplete) {
    btn.disabled = false;
    btn.classList.remove("is-running");
    btn.textContent = base;
    return;
  }

  // Timer exists and not complete → disable the "start" button
  btn.disabled = true;

  // Glow if actively running
  if (t.isRunning) btn.classList.add("is-running");
  else btn.classList.remove("is-running");

  const timeLabel = (t.type === "countdown") ? t.remainingLabel : t.elapsedLabel;

  // Default active label
  let activeLabel = btn.dataset.runningLabel || base;

  // Special: folds progress (done/total)
  if (timerId === "bakes.folds") {
    const meta = t.meta || {};
    const total = Math.max(1, parseInt(meta.total || 1, 10));
    const done  = Math.max(0, parseInt(meta.done  || 0, 10));
    // Your labels are 1-based for the user: current round is done+1
    const current = Math.min(total, done + 1);
    activeLabel = `${activeLabel} (${current}/${total})`;
  }

  btn.textContent = `${activeLabel} (${timeLabel})`;
}

function updateTimerButtonStates() {
  setBtnState("bakeTimerAutolyseBtn", "bakes.autolyse");
  setBtnState("bakeTimerFoldsBtn",   "bakes.folds");
  setBtnState("bakeTimerBulkBtn",    "bakes.bulk");
  setBtnState("bakeTimerProofBtn",   "bakes.proof");
}

  // --- UI injection (buttons + live status line) ---
  function injectTimerControls() {
    const fermentLabel = Array.from(document.querySelectorAll("#section-bakes .muted-text"))
      .find(el => (el.textContent || "").trim().toLowerCase() === "fermentation");

    if (!fermentLabel) return;

    if ($("#bakeTimerControls", fermentLabel.parentElement)) return;

    const wrap = document.createElement("div");
    wrap.id = "bakeTimerControls";
    wrap.style.marginTop = "0.6rem";
    wrap.style.display = "flex";
    wrap.style.flexWrap = "wrap";
    wrap.style.gap = "0.5rem";
    wrap.style.alignItems = "center";

    const autolyseBtn = makeBtn("bakeTimerAutolyseBtn", "⏱ Autolyse (45m)", "autolyse");
    const foldsBtn    = makeBtn("bakeTimerFoldsBtn",   "⏱ Folds (30m x N)", "folds");
    const bulkBtn     = makeBtn("bakeTimerBulkBtn",    "⏱ Start Bulk", "bulk");
    const proofBtn    = makeBtn("bakeTimerProofBtn",   "⏱ Start Proof", "proof");

    autolyseBtn.dataset.baseLabel = autolyseBtn.textContent;
    foldsBtn.dataset.baseLabel    = foldsBtn.textContent;
    bulkBtn.dataset.baseLabel     = bulkBtn.textContent;
    proofBtn.dataset.baseLabel    = proofBtn.textContent;

    bulkBtn.dataset.runningLabel  = "⏱ Bulk";
    proofBtn.dataset.runningLabel = "⏱ Proof";
    foldsBtn.dataset.runningLabel = "⏱ Folds";

    wrap.appendChild(autolyseBtn);
    wrap.appendChild(foldsBtn);
    wrap.appendChild(bulkBtn);
    wrap.appendChild(proofBtn);

    const status = document.createElement("div");
    status.id = "bakeTimerStatus";
    status.className = "muted-text";
    status.style.width = "100%";
    status.style.marginTop = "0.35rem";
    status.style.fontWeight = "600";
    status.textContent = "Timers: (none running)";

    fermentLabel.insertAdjacentElement("afterend", wrap);
    wrap.insertAdjacentElement("afterend", status);
  }

  function updateStatusLine() {
    if (!ensureTimersReady()) return;

    const el = $("#bakeTimerStatus");
    if (!el) return;

    const ids = ["bakes.autolyse", "bakes.folds", "bakes.bulk", "bakes.proof"];
    const active = ids
      .map(id => SDTimers.getTimer(id))
      .filter(t => t && !t.isComplete);

    if (!active.length) {
      el.textContent = "Timers: (none running)";
      return;
    }

    const parts = active.map(t => {
      const left = t.type === "countdown" ? t.remainingLabel : t.elapsedLabel;
      const state = t.isRunning ? "▶" : "⏸";
      return `${state} ${t.label}: ${left}`;
    });

    el.textContent = "Timers: " + parts.join("  •  ");
  }

  // --- Core actions ---
  function startAutolyse() {
    if (!ensureTimersReady()) return;

    const id = "bakes.autolyse";
    const durationSec = 45 * 60;

    SDTimers.create(id, {
      label: "Autolyse",
      type: "countdown",
      durationSec,
      sound: 1, // chime1
      meta: {
        page: "bakes",
        anchor: "#bakeBulkHours" // best available anchor near fermentation workflow
      }
    });

    SDTimers.start(id);
    updateStatusLine();
  }

  function startBulk() {
    if (!ensureTimersReady()) return;

    const bulkHoursEl = $("#bakeBulkHours");
    const durationSec = hoursToSec(bulkHoursEl?.value);

    if (!durationSec) {
      alert("Set Bulk ferment (hours) first (example: 4.5).");
      return;
    }

    const id = "bakes.bulk";
    SDTimers.create(id, {
      label: `Bulk ferment (${formatDuration(durationSec)})`,
      type: "countdown",
      durationSec,
      sound: 3, // chime3
      meta: {
        page: "bakes",
        anchor: "#bakeBulkHours"
      }
    });

    SDTimers.start(id);
    updateStatusLine();
  }

  function startProof() {
    if (!ensureTimersReady()) return;

    const proofHoursEl = $("#bakeProofHours");
    const durationSec = hoursToSec(proofHoursEl?.value);

    if (!durationSec) {
      alert("Set Proof time (hours) first (example: 12 for cold proof).");
      return;
    }

    const methodEl = $("#bakeProofMethod");
    const method = methodEl?.value ? methodEl.value : "proof";

    const id = "bakes.proof";
    SDTimers.create(id, {
      label: `${method === "cold" ? "Cold proof" : "Proof"} (${formatDuration(durationSec)})`,
      type: "countdown",
      durationSec,
      sound: 4, // chime4
      meta: {
        page: "bakes",
        anchor: "#bakeProofHours",
        method
      }
    });

    SDTimers.start(id);
    updateStatusLine();
  }

  function startFolds() {
    if (!ensureTimersReady()) return;

    const foldsEl = $("#bakeFolds");
    const methodEl = $("#bakeFoldMethod");
    const method = methodEl?.value || "coil";

    const total = Math.max(1, parseInt(foldsEl?.value || "3", 10));
    const intervalSec = minutesToSec(30);

    const id = "bakes.folds";

    SDTimers.create(id, {
      label: `${method === "coil" ? "Coil folds" : "Stretch & folds"} (1/${total})`,
      type: "countdown",
      durationSec: intervalSec,
      sound: 2, // chime2
      meta: {
        page: "bakes",
        anchor: "#bakeFolds",
        repeat: true,
        total,
        done: 0,
        intervalSec,
        method
      }
    });

    SDTimers.reset(id);
    SDTimers.start(id);
    updateStatusLine();
  }

  function wireFoldRepeats() {
    if (!ensureTimersReady()) return;

    SDTimers.on("complete", ({ timer }) => {
      if (!timer || timer.id !== "bakes.folds") return;

      const t = SDTimers.getTimer("bakes.folds");
      if (!t) return;

      const meta = t.meta || {};
      if (!meta.repeat) return;

      const total = Math.max(1, parseInt(meta.total || 1, 10));
      const done  = Math.max(0, parseInt(meta.done || 0, 10)) + 1;

      if (done >= total) {
        SDTimers.remove("bakes.folds");
        updateStatusLine();
        alert(`✅ Folds complete (${total}/${total}).`);
        return;
      }

      const label = `${meta.method === "coil" ? "Coil folds" : "Stretch & folds"} (${done + 1}/${total})`;

      SDTimers.create("bakes.folds", {
        label,
        type: "countdown",
        durationSec: meta.intervalSec || 30 * 60,
        sound: 2,
        meta: { ...meta, done } // keeps page + anchor intact
      });

      SDTimers.start("bakes.folds");
      updateStatusLine();
    });
  }

  function wireClicks() {
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("#bakeTimerAutolyseBtn, #bakeTimerFoldsBtn, #bakeTimerBulkBtn, #bakeTimerProofBtn");
      if (!btn) return;

      e.preventDefault();

      if (btn.id === "bakeTimerAutolyseBtn") return startAutolyse();
      if (btn.id === "bakeTimerFoldsBtn")   return startFolds();
      if (btn.id === "bakeTimerBulkBtn")    return startBulk();
      if (btn.id === "bakeTimerProofBtn")   return startProof();
    });
  }

    function wireLiveUpdates() {
    if (!ensureTimersReady()) return;

    const sync = () => {
        updateStatusLine();
        updateTimerButtonStates();
    };

    SDTimers.on("tick", sync);
    SDTimers.on("change", sync);
    SDTimers.on("complete", sync);
    }

  function boot() {
    injectTimerControls();
    wireClicks();
    wireFoldRepeats();
    wireLiveUpdates();
    updateStatusLine();
    updateTimerButtonStates();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
// ===================== END: BAKE TIMERS (Bakes page wiring) =====================
