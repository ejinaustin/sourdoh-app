// ===================== BEGIN: Planner (flour-first formula + schedule with starter/levain) =====================
(function () {
  "use strict";

  // Always-available references
  const bodyEl = document.body;

  // Safe HTML escape (uses utils.js if present, falls back if not)
  const escapeHtml =
    (typeof window !== "undefined" && typeof window.escapeHtml === "function")
      ? window.escapeHtml
      : function (str) {
          return String(str ?? "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
        };

  // Grab all the elements we need
  const calculateFormulaBtn = document.getElementById("calculateFormulaBtn");
  const schedulePreview = document.getElementById("schedulePreview");

  // Flour-first inputs
  const flourWeightInput = document.getElementById("flourWeight"); // flour grams (base)
  const hydrationInput = document.getElementById("hydration");
  const saltPercentInput = document.getElementById("saltPercent");
  const levainPercentInput = document.getElementById("levainPercent"); // starter/levain % of flour BY WEIGHT
  const flourBlendInput = document.getElementById("flourBlend");
  const ambientTempInput = document.getElementById("ambientTemp");

  // ===================== BEGIN: STARTER SELECTOR (EXPERT ONLY, NO MATH YET) =====================
  // Step B: This is wired + persisted, but does NOT affect math yet.
  const plannerStarterSelect = document.getElementById("plannerStarterSelect");
  const plannerStarterMeta = document.getElementById("plannerStarterMeta");

  // local storage key for Planner metadata
  const PLANNER_STARTER_KEY = "sourdoh.planner.selectedStarterId";

  // cached starters for lookup
  let plannerStartersCache = [];

  /**
   * Load starters from Starter Lab storage.
   * Starter Lab uses localStorage key: "sourdoh.starters"
   */
  function loadPlannerStarters() {
    try {
      const raw = localStorage.getItem("sourdoh.starters");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function formatStarterLabel(s) {
    const name =
      (s && (s.name || s.starterName || s.title))
        ? String(s.name || s.starterName || s.title)
        : "Unnamed starter";
    const hyd = (s && (s.hydration != null)) ? Number(s.hydration) : null;
    return (hyd != null && !Number.isNaN(hyd)) ? `${name} (${hyd}% hydration)` : name;
  }

  function getSelectedStarterFromCache(id) {
    if (!id) return null;
    return plannerStartersCache.find((s) => String(s.id) === String(id)) || null;
  }

  function updatePlannerStarterMeta() {
    if (!plannerStarterMeta) return;

    const id =
      plannerStarterSelect
        ? plannerStarterSelect.value
        : (localStorage.getItem(PLANNER_STARTER_KEY) || "");

    const s = getSelectedStarterFromCache(id);

    if (!id) {
      plannerStarterMeta.innerHTML =
        `<span class="muted-text">No starter selected. (That’s fine.)</span>`;
      return;
    }

    if (!s) {
      plannerStarterMeta.innerHTML =
        `<span class="muted-text">Selected starter not found (it may have been deleted).</span>`;
      return;
    }

    const name = (s.name || s.starterName || "Selected starter");
    const hyd =
      (s.hydration != null && !Number.isNaN(Number(s.hydration)))
        ? Number(s.hydration)
        : null;

    plannerStarterMeta.innerHTML =
      (hyd != null)
        ? `Using: <strong>${escapeHtml(String(name))}</strong> · Recorded hydration: <strong>${hyd}%</strong>`
        : `Using: <strong>${escapeHtml(String(name))}</strong>`;
  }

  function populatePlannerStarterSelect() {
    if (!plannerStarterSelect) return;

    plannerStartersCache = loadPlannerStarters();

    // Keep the first placeholder option, replace the rest
    plannerStarterSelect
      .querySelectorAll("option:not(:first-child)")
      .forEach((o) => o.remove());

    plannerStartersCache.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = String(s.id);
      opt.textContent = formatStarterLabel(s);
      plannerStarterSelect.appendChild(opt);
    });

    // restore selection
    const saved = localStorage.getItem(PLANNER_STARTER_KEY) || "";
    if (saved) plannerStarterSelect.value = saved;

    updatePlannerStarterMeta();
  }

  // init + bind
  populatePlannerStarterSelect();

  if (plannerStarterSelect) {
    plannerStarterSelect.addEventListener("change", () => {
      localStorage.setItem(PLANNER_STARTER_KEY, plannerStarterSelect.value || "");
      updatePlannerStarterMeta();
    });
  }

  // Refresh starter list when Starter Lab changes
    window.addEventListener("sourdoh:starterschange", populatePlannerStarterSelect);


  // When mode changes, we don't need to rebuild options, just refresh the meta text.
  window.addEventListener("sourdoh:modechange", () => {
    updatePlannerStarterMeta();
  });
  // ===================== END: STARTER SELECTOR (EXPERT ONLY, NO MATH YET) =====================

  // ===================== BEGIN: PLANNER MODE (GLOBAL BEGINNER/EXPERT) =====================
  const plannerModeToggle = document.getElementById("plannerModeToggle");
  const plannerModeText = document.getElementById("plannerModeText");
  const levainLabelText = document.getElementById("levainLabelText");

  const MODE_KEY = "sourdoh.mode"; // global (Settings uses this)

  function getPlannerModeSafe() {
    const raw = (localStorage.getItem(MODE_KEY) || "").toLowerCase();
    if (raw === "expert" || raw === "beginner") return raw;

    // fallback if SDMode exists
    if (window.SDMode && typeof window.SDMode.get === "function") {
      return window.SDMode.get();
    }
    return "beginner";
  }

  function setPlannerModeSafe(mode) {
    const next = (mode === "expert") ? "expert" : "beginner";
    localStorage.setItem(MODE_KEY, next);

    // If SDMode exists, let it apply + broadcast too
    if (window.SDMode && typeof window.SDMode.set === "function") {
      window.SDMode.set(next);
    } else {
      applyPlannerModeUI();
      window.dispatchEvent(new CustomEvent("sourdoh:modechange", { detail: next }));
    }
  }

  function applyPlannerModeUI() {
    const mode = getPlannerModeSafe();
    if (plannerModeText) plannerModeText.textContent = (mode === "expert") ? "Expert" : "Beginner";
    if (levainLabelText) levainLabelText.textContent = (mode === "expert") ? "Levain" : "Starter";
  }

  if (plannerModeToggle) {
    plannerModeToggle.addEventListener("click", () => {
      setPlannerModeSafe(getPlannerModeSafe() === "expert" ? "beginner" : "expert");
    });
  }

  // apply immediately + listen for global changes
  applyPlannerModeUI();
  window.addEventListener("sourdoh:modechange", applyPlannerModeUI);
  // ===================== END: PLANNER MODE (GLOBAL BEGINNER/EXPERT) =====================

  // ===================== BEGIN: SOUR D’OH! TIP MODAL WIRING =====================

  // Grab the global tip modal elements (defined once in index.html)
  const tipModalBackdrop = document.getElementById("tipModalBackdrop");
  const tipModalTitleEl = document.getElementById("tipModalTitle");
  const tipModalBodyEl = document.getElementById("tipModalBody");
  const tipModalCloseBtn = document.getElementById("tipModalClose");

  /**
   * Open the branded tip modal.
   * @param {string} title
   * @param {string[]|string} lines
   */
  function openTipModal(title, lines) {
    // If the modal HTML is missing for some reason, fall back to alert.
    if (!tipModalBackdrop || !tipModalBodyEl) {
      window.alert(
        "Tip:\n\n" + (Array.isArray(lines) ? lines.join("\n") : String(lines || ""))
      );
      return;
    }

    document.body.classList.add("tip-modal-open");
    tipModalBackdrop.classList.add("is-open");

    if (tipModalTitleEl) tipModalTitleEl.textContent = title || "Tip";

    // Clear previous content
    tipModalBodyEl.innerHTML = "";

    if (Array.isArray(lines)) {
      lines.forEach((line, idx) => {
        const p = document.createElement("p");
        p.textContent = line;
        if (idx === 0) p.classList.add("tip-lead");
        tipModalBodyEl.appendChild(p);
      });
    } else {
      const p = document.createElement("p");
      p.textContent = String(lines || "");
      p.classList.add("tip-lead");
      tipModalBodyEl.appendChild(p);
    }
  }

  // Expose for other modules if needed
  window.openTipModal = openTipModal;

  function closeTipModal() {
    if (!tipModalBackdrop) return;
    tipModalBackdrop.classList.remove("is-open");
    document.body.classList.remove("tip-modal-open");
  }

  // Close actions: X button, backdrop click, Esc key
  if (tipModalCloseBtn) tipModalCloseBtn.addEventListener("click", closeTipModal);

  if (tipModalBackdrop) {
    tipModalBackdrop.addEventListener("click", (evt) => {
      if (evt.target === tipModalBackdrop) closeTipModal();
    });
  }

  document.addEventListener("keydown", (evt) => {
    if (evt.key === "Escape" && tipModalBackdrop?.classList.contains("is-open")) {
      closeTipModal();
    }
  });

  // Hook up the hint buttons in the Planner form
  const flourWeightHintBtn = document.getElementById("flourWeightHintBtn");
  const hydrationHintBtn = document.getElementById("hydrationHintBtn");
  const saltHintBtn = document.getElementById("saltHintBtn");
  const flourBlendHintBtn = document.getElementById("flourBlendHintBtn");
  const ambientTempHintBtn = document.getElementById("ambientTempHintBtn");
  const levainHintBtn = document.getElementById("levainHintBtn");

  if (flourWeightHintBtn) {
    flourWeightHintBtn.addEventListener("click", () => {
      openTipModal("Flour weight (your recipe base)", [
        "In baker’s percentages, flour is always 100%. Everything else is a % of flour.",
        "Pick a flour amount that matches your loaf/banneton/pan… the rest scales automatically.",
        "Examples (typical ranges):",
        "• Medium boule: 450–550 g flour",
        "• Sandwich loaf (8.5×4.5 pan): 500–650 g flour",
        "• Two loaves: 900–1,100 g flour",
        "Note: Expert Mode (future upgrade) will add nerd knobs (levain hydration, prefermented flour %, timing science) without confusing beginners.",
      ]);
    });
  }

  if (hydrationHintBtn) {
    hydrationHintBtn.addEventListener("click", () => {
      openTipModal("Hydration (water % of flour)", [
        "Hydration is water-to-flour ratio by weight.",
        "• 60–65%: easier handling, tighter crumb",
        "• 70–75%: classic sourdough range",
        "• 80%+: very open crumb, stickier dough",
        "Tip: whole grains usually need a touch more water.",
      ]);
    });
  }

  if (saltHintBtn) {
    saltHintBtn.addEventListener("click", () => {
      openTipModal("Salt (usually 1.8–2.2%)", [
        "Salt is a % of flour weight.",
        "It adds flavor, strengthens gluten, and slightly slows fermentation.",
        "Typical range is ~1.8–2.2% of flour.",
      ]);
    });
  }

  if (flourBlendHintBtn) {
    flourBlendHintBtn.addEventListener("click", () => {
      openTipModal("Flour blend", [
        "Whole grains absorb more water and often ferment faster.",
        "More whole wheat/rye usually means: slightly higher hydration and slightly shorter timing.",
      ]);
    });
  }

  if (ambientTempHintBtn) {
    ambientTempHintBtn.addEventListener("click", () => {
      openTipModal("Room temperature", [
        "Temperature is the fermentation throttle.",
        "Cooler = slower (longer bulk/proof). Warmer = faster (watch for overproof).",
      ]);
    });
  }

  // ===================== BEGIN: STARTER/LEVAIN TIP (RECIPE-STYLE %) =====================
  if (levainHintBtn) {
    levainHintBtn.addEventListener("click", () => {
      openTipModal("Starter / Levain (% of flour)", [
        "Beginner: 'Starter' and 'levain' are basically the same thing — active, bubbly starter added to your dough.",
        "In this planner, the % is recipe-style: starter grams = flour grams × %.",
        "Example: 500 g flour at 18% starter → 90 g ripe starter.",
        "Expert Mode (future) will add the deep math: levain hydration overrides, prefermented flour %, and effective hydration.",
      ]);
    });
  }
  // ===================== END: STARTER/LEVAIN TIP (RECIPE-STYLE %) =====================

  // ===================== END: SOUR D’OH! TIP MODAL WIRING =====================

  // For now: assume starter/levain hydration is 100% (future Expert tuning knob)
  function getLevainHydrationPercent() {
    return 100;
  }

  // ===================== BEGIN: RENDER + CLICK HANDLER (FIXED STRUCTURE) =====================
  function renderSchedulePreview(formula) {
    if (!schedulePreview) return;

    const {
      flour,
      water,
      salt,
      levainPercent,
      levainHydrationPercent,
      levainWeight,
      levainFlour,
      levainWater,
      ambient,
      hydration,
      flourBlend,
      totalDoughWeight,

      // metadata only (no math yet)
      selectedStarterId,
      selectedStarterName,
      selectedStarterHydration,
    } = formula;

    // ===================== BEGIN: PLANNER STEP LABELS (BEGINNER vs EXPERT LANGUAGE LAYER) =====================
    const modeRaw = (localStorage.getItem("sourdoh.mode") || "beginner").toLowerCase();
    const isExpert = modeRaw === "expert";

    const L = {
      // Step label text (what the UI shows)
      mixStarterLabel: isExpert ? "Mix levain &amp; salt" : "Mix starter &amp; salt",

      // Beginner = plain words + (real term). Expert = real term only.
      restLabel: isExpert ? "Autolyse" : "Rest (autolyse)",
      foldsLabel: isExpert ? "Coil folds" : "Folds (coil folds)",
      bulkLabel: isExpert ? "Bulk fermentation" : "Rise (bulk ferment)",
      benchLabel: isExpert ? "Bench rest" : "Short rest (bench rest)",
      shapeLabel: isExpert ? "Preshape &amp; shape" : "Shape (preshape &amp; shape)",
      proofLabel: isExpert ? "Final proof" : "Final rise (proof)",
      bakeLabel: isExpert ? "Bake" : "Bake (in the oven)",
    };
    // ===================== END: PLANNER STEP LABELS (BEGINNER vs EXPERT LANGUAGE LAYER) =====================

    const tempUnit =
      bodyEl && bodyEl.getAttribute("data-temp-units") === "F" ? "°F" : "°C";

    const friendlyTemp =
      ambient != null && !isNaN(ambient)
        ? ambient.toFixed(1) + tempUnit
        : "room temp";

    let bulkTimeText = "3–5 hours";
    let tempDescriptor = "";

    if (ambient != null && !isNaN(ambient)) {
      let ambientC = ambient;
      const isF = bodyEl && bodyEl.getAttribute("data-temp-units") === "F";
      if (isF) ambientC = ((ambient - 32) * 5) / 9;

      if (ambientC <= 20) {
        bulkTimeText = "4–6 hours";
        tempDescriptor =
          "Cooler temps slow fermentation. Expect longer bulk; watch volume more than the clock.";
      } else if (ambientC >= 26) {
        bulkTimeText = "3–4 hours";
        tempDescriptor =
          "Warmer temps speed fermentation. Check more often to avoid overproofing.";
      } else {
        bulkTimeText = "3½–5 hours";
        tempDescriptor =
          "Mid-range temps: moderate pace with a good balance of strength and flavor.";
      }
    }

    const hasLevain = levainPercent > 0 && levainWeight > 0;

    let topHtml = `
      <div class="muted-text" style="margin-bottom:0.75rem;">
        Flour-first formula (baker’s %). Flour is <strong>100%</strong>.
        Your dough comes out to about <strong>${totalDoughWeight.toFixed(0)} g</strong>
        at <strong>${hydration.toFixed(0)}% hydration</strong>.
      </div>

      <div class="muted-text" style="margin-bottom:0.75rem;">
        Flour: <strong>${flour.toFixed(0)} g</strong>
        ${flourBlend ? `(e.g. <span>${escapeHtml(flourBlend)}</span>)` : ""}.
        Water: <strong>${water.toFixed(0)} g</strong>.
        Salt: <strong>${salt.toFixed(1)} g</strong>.
        Temp: <strong>${friendlyTemp}</strong>.
      </div>

      <div class="note-callout">
        <strong>What “baker’s %” means:</strong><br>
        Flour is always 100%. Water, salt, starter/levain, etc. are expressed as a percentage of flour.
        This makes recipes scale perfectly by changing one number: flour weight.
      </div>
    `;

    if (tempDescriptor) {
      topHtml += `
        <div class="note-callout">
          <strong>Temp effect explains timing:</strong><br>
          ${escapeHtml(tempDescriptor)}
        </div>
      `;
    }

    // Expert-only: show selected starter as metadata (no math changes yet)
    if (isExpert && selectedStarterId) {
      const nameSafe = selectedStarterName ? escapeHtml(String(selectedStarterName)) : "Selected starter";
      const hydText =
        (selectedStarterHydration != null && !Number.isNaN(selectedStarterHydration))
          ? ` · <strong>${selectedStarterHydration}%</strong> hydration (recorded)`
          : "";

      topHtml += `
        <div class="note-callout">
          <strong>Starter selected (metadata only):</strong><br>
          ${nameSafe}${hydText}<br>
          <em>No math changes yet. Future: use this to compute “effective hydration” automatically.</em>
        </div>
      `;
    }

    // Levain summary: beginner gets simple; expert gets split + assumptions
    let levainHtml = "";
    if (hasLevain) {
      const starterWordTitle = isExpert ? "Levain" : "Starter";

      const beginnerLevainHtml = `
        <div class="muted-text" style="margin-bottom:0.75rem;">
          ${starterWordTitle}: <strong>${levainPercent.toFixed(0)}%</strong> of flour → 
          <strong>${levainWeight.toFixed(0)} g</strong> ripe ${starterWordTitle.toLowerCase()}.
        </div>
      `;

      const expertLevainHtml = `
        <div class="muted-text" style="margin-bottom:0.75rem;">
          ${starterWordTitle}: <strong>${levainPercent.toFixed(0)}%</strong> of flour → 
          <strong>${levainWeight.toFixed(0)} g</strong> ripe ${starterWordTitle.toLowerCase()}
          (assumes <strong>${levainHydrationPercent.toFixed(0)}% hydration</strong>).
        </div>

        <div class="note-callout">
          <strong>Inside your ${starterWordTitle.toLowerCase()} (info only):</strong><br>
          Flour in ${starterWordTitle.toLowerCase()}: <strong>${levainFlour.toFixed(0)} g</strong><br>
          Water in ${starterWordTitle.toLowerCase()}: <strong>${levainWater.toFixed(0)} g</strong><br><br>

          <strong>Formula totals you add:</strong><br>
          Flour: <strong>${flour.toFixed(0)} g</strong> · Water: <strong>${water.toFixed(0)} g</strong> ·
          Salt: <strong>${salt.toFixed(1)} g</strong><br>

          <em>Future: show “effective hydration” including ${starterWordTitle.toLowerCase()} water.</em>
        </div>
      `;

      levainHtml = isExpert ? expertLevainHtml : beginnerLevainHtml;
    }

    // ===================== BEGIN: STEP 2 COPY – MODE-AWARE (USES isExpert) =====================
    const starterWord = isExpert ? "levain" : "starter";
    const starterPhrase = isExpert ? "ripe levain" : "ripe starter";

    const mixLevainLine = (hasLevain)
      ? `Add your <strong>${levainWeight.toFixed(0)} g</strong> ${starterPhrase} and salt (~${salt.toFixed(1)} g). Mix until cohesive.`
      : `Add your ${starterWord} and salt (~${salt.toFixed(1)} g). Mix until cohesive.`;
    // ===================== END: STEP 2 COPY – MODE-AWARE (USES isExpert) =====================

    schedulePreview.innerHTML = `
      ${topHtml}
      ${levainHtml}

      <div class="schedule-grid">
        <div class="schedule-row">
          <div class="schedule-time">Step 1</div>
          <div>
            <div class="schedule-label" tabindex="0">${L.restLabel}</div>
            <div class="schedule-detail">
              ${isExpert
                ? `Combine flour (${flour.toFixed(0)} g) + water (${water.toFixed(0)} g). Autolyse 30–60 min.`
                : `Mix flour (${flour.toFixed(0)} g) + water (${water.toFixed(0)} g). Rest 30–60 minutes (autolyse).`}
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 2</div>
          <div>
            <div class="schedule-label" tabindex="0">${L.mixStarterLabel}</div>
            <div class="schedule-detail">${mixLevainLine}</div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 3</div>
          <div>
            <div class="schedule-label" tabindex="0">${L.bulkLabel}</div>
            <div class="schedule-detail">
              ${isExpert
                ? `Ferment at ${friendlyTemp}. Typical: ${bulkTimeText}. Note: folds happen during bulk (see Step 4). Target: strength + volume increase, not the clock.`
                : `Let it rise at ${friendlyTemp}. Typical: ${bulkTimeText}. Note: folds happen during this rise (see Step 4). Look for bubbles, puffiness, and jiggle (bulk ferment).`}
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 4</div>
          <div>
            <div class="schedule-label" tabindex="0">${L.foldsLabel}</div>
            <div class="schedule-detail">
              ${isExpert
                ? `Do 3–4 sets during early bulk, spaced 30–45 min. This step happens during Step 3 (bulk), not after it. Stop once dough shows strength and holds shape.`
                : `Do 3–4 fold sets every 30–45 min during the first half of the rise. This happens during Step 3 (bulk), not after it. Stop when the dough feels stronger.`}
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 5</div>
          <div>
            <div class="schedule-label" tabindex="0">${L.benchLabel}</div>
            <div class="schedule-detail">
              ${isExpert
                ? `Bench rest 20–30 min, covered (relax gluten before shaping).`
                : `Rest 20–30 minutes, covered, so shaping is easier (bench rest).`}
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 6</div>
          <div>
            <div class="schedule-label" tabindex="0">${L.shapeLabel}</div>
            <div class="schedule-detail">
              ${isExpert
                ? `Shape with tension (boule/batard/pan). Aim for a tight skin without tearing.`
                : `Shape the dough and create a “tight outer skin” (surface tension). Choose boule/batard/pan.`}
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 7</div>
          <div>
            <div class="schedule-label" tabindex="0">${L.proofLabel}</div>
            <div class="schedule-detail">
              ${isExpert
                ? `Proof 45–90 min at room temp OR retard 8–16 hrs cold. Use poke test + dough feel.`
                : `Final rise: 45–90 min at room temp OR 8–16 hrs in the fridge (cold proof).`}
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 8</div>
          <div>
            <div class="schedule-label" tabindex="0">${L.bakeLabel}</div>
            <div class="schedule-detail">
              ${isExpert
                ? `Bake hot with steam (often Dutch oven). Vent for color. Cool fully before slicing.`
                : `Bake hot + steamy (often Dutch oven). Cool 1 hour before slicing.`}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // ===================== BEGIN: CALCULATE FORMULA CLICK HANDLER (CLEAN) =====================
  if (calculateFormulaBtn && schedulePreview && flourWeightInput && hydrationInput && saltPercentInput) {
    calculateFormulaBtn.addEventListener("click", () => {
      const flour = parseFloat(flourWeightInput.value) || 500;
      const hydration = parseFloat(hydrationInput.value) || 75;
      const saltPercent = parseFloat(saltPercentInput.value) || 2;

      // Default starter/levain to 20% if field is empty
      const levainPercentRaw = levainPercentInput ? levainPercentInput.value : "";
      const levainPercent = (levainPercentRaw === "") ? 20 : (parseFloat(levainPercentRaw) || 0);

      const ambient =
        ambientTempInput && ambientTempInput.value !== ""
          ? parseFloat(ambientTempInput.value)
          : null;

      const water = (flour * hydration) / 100;
      const salt = (flour * saltPercent) / 100;

      const levainHydrationPercent = getLevainHydrationPercent(); // 100 for now
      const levainWeight = (flour * levainPercent) / 100;

      let levainFlour = 0;
      let levainWater = 0;
      if (levainWeight > 0) {
        levainFlour = levainWeight / (1 + levainHydrationPercent / 100);
        levainWater = levainWeight - levainFlour;
      }

      const totalDoughWeight = flour + water + salt + levainWeight;

      // --- Starter metadata for this bake (NO MATH YET) ---
      const selectedStarterId = localStorage.getItem(PLANNER_STARTER_KEY) || "";
      const selectedStarterObj = getSelectedStarterFromCache(selectedStarterId);
      const selectedStarterName = selectedStarterObj
        ? (selectedStarterObj.name || selectedStarterObj.starterName || "")
        : "";
      const selectedStarterHydration =
        (selectedStarterObj && selectedStarterObj.hydration != null)
          ? Number(selectedStarterObj.hydration)
          : null;

      // FUTURE PATH (NOT ENABLED YET):
      // If we later turn on "effective hydration", we can set levainHydrationPercent from selectedStarterHydration,
      // and compute starter flour/water contribution automatically.

      renderSchedulePreview({
        flour,
        water,
        salt,
        levainPercent,
        levainHydrationPercent,
        levainWeight,
        levainFlour,
        levainWater,
        ambient,
        hydration,
        flourBlend: flourBlendInput && flourBlendInput.value.trim(),
        totalDoughWeight,

        // metadata only (no math yet)
        selectedStarterId,
        selectedStarterName,
        selectedStarterHydration,
      });
    });
  } else {
    console.warn(
      "Planner (flour-first): missing required DOM nodes. Check IDs: calculateFormulaBtn, schedulePreview, flourWeight, hydration, saltPercent."
    );
  }
  // ===================== END: CALCULATE FORMULA CLICK HANDLER (CLEAN) =====================
  // ===================== END: RENDER + CLICK HANDLER (FIXED STRUCTURE) =====================
})();
// ===================== END: Planner (flour-first formula + schedule with starter/levain) =====================
