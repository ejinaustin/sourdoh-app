// ===================== BEGIN: Planner (formula + schedule with levain) =====================
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

  const targetWeightInput = document.getElementById("targetWeight");
  const hydrationInput = document.getElementById("hydration");
  const saltPercentInput = document.getElementById("saltPercent");
  const levainPercentInput = document.getElementById("levainPercent");
  const flourBlendInput = document.getElementById("flourBlend");
  const ambientTempInput = document.getElementById("ambientTemp");

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
  if (tipModalCloseBtn) {
    tipModalCloseBtn.addEventListener("click", closeTipModal);
  }

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
  const targetWeightHintBtn = document.getElementById("targetWeightHintBtn");
  const hydrationHintBtn = document.getElementById("hydrationHintBtn");
  const saltHintBtn = document.getElementById("saltHintBtn");
  const flourBlendHintBtn = document.getElementById("flourBlendHintBtn");
  const ambientTempHintBtn = document.getElementById("ambientTempHintBtn");
  const levainHintBtn = document.getElementById("levainHintBtn");

  if (targetWeightHintBtn) {
    targetWeightHintBtn.addEventListener("click", () => {
      openTipModal("Target dough weight", [
        "This is the total weight of your mixed dough (flour + water + salt + levain).",
        "Examples:",
        "• 700–900 g → medium boule",
        "• 800–1,000 g → sandwich loaf",
        "• 1,400–1,800 g → two loaves",
      ]);
    });
  }

  if (hydrationHintBtn) {
    hydrationHintBtn.addEventListener("click", () => {
      openTipModal("Hydration", [
        "Hydration is water-to-flour ratio by weight.",
        "• 60–65%: easier handling, tighter crumb",
        "• 70–75%: classic sourdough range",
        "• 80%+: very open crumb, stickier dough",
      ]);
    });
  }

  if (saltHintBtn) {
    saltHintBtn.addEventListener("click", () => {
      openTipModal("Salt", [
        "Salt adds flavor, strengthens gluten, and slightly slows fermentation.",
        "Typical is ~1.8–2.2% of flour weight.",
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

  if (levainHintBtn) {
    levainHintBtn.addEventListener("click", () => {
      openTipModal("Levain", [
        "Levain is a build of active starter used for this dough.",
        "15–25% levain (of flour) is a safe, beginner-friendly range.",
      ]);
    });
  }

  // ===================== END: SOUR D’OH! TIP MODAL WIRING =====================

  // IMPORTANT: bakeStarterSelect is declared in bakes section; we read it if present
  function getLevainHydrationPercent() {
    let hydrationPct = 100; // default

    const bakeStarterSelect = document.getElementById("bakeStarterSelect");
    if (bakeStarterSelect && bakeStarterSelect.value) {
      const opt = bakeStarterSelect.selectedOptions?.[0];
      if (opt) {
        const raw = opt.getAttribute("data-hydration");
        if (raw) {
          const parsed = parseFloat(raw.replace(/[^\d.]/g, ""));
          if (!isNaN(parsed) && parsed > 0 && parsed < 300) hydrationPct = parsed;
        }
      }
    }

    return hydrationPct;
  }

  function renderSchedulePreview(formula) {
    if (!schedulePreview) return;

    const {
      targetWeight,
      flour,
      water,
      salt,
      levainPercent,
      levainHydrationPercent,
      levainWeight,
      levainFlour,
      levainWater,
      addedFlour,
      addedWater,
      ambient,
      hydration,
      flourBlend,
    } = formula;

    const tempUnit =
      bodyEl && bodyEl.getAttribute("data-temp-units") === "F" ? "°F" : "°C";

    let friendlyTemp =
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

    const hasLevain = levainPercent && levainPercent > 0 && levainWeight > 0;

    let topHtml = `
      <div class="muted-text" style="margin-bottom:0.75rem;">
        Target dough: <strong>${targetWeight.toFixed(0)} g</strong> at
        <strong>${hydration.toFixed(0)}% hydration</strong> with about
        <strong>${salt.toFixed(1)} g salt</strong> at
        <strong>${friendlyTemp}</strong>.
      </div>
      <div class="muted-text" style="margin-bottom:0.75rem;">
        Flour: <strong>${flour.toFixed(0)} g</strong> total
        ${flourBlend ? `(e.g. <span>${escapeHtml(flourBlend)}</span>)` : ""}.
        Water: <strong>${water.toFixed(0)} g</strong> total.
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

    let levainHtml = "";
    if (hasLevain) {
      levainHtml = `
        <div class="muted-text" style="margin-bottom:0.75rem;">
          Levain: <strong>${levainPercent.toFixed(0)}%</strong> of flour (~<strong>${levainWeight.toFixed(0)} g</strong>
          at <strong>${levainHydrationPercent.toFixed(0)}% hydration</strong>).
        </div>
        <div class="note-callout">
          <strong>Levain breakdown:</strong><br>
          Contributes about <strong>${levainFlour.toFixed(0)} g flour</strong> and
          <strong>${levainWater.toFixed(0)} g water</strong>.<br>
          You’ll still add around <strong>${addedFlour.toFixed(0)} g flour</strong> and
          <strong>${addedWater.toFixed(0)} g water</strong> at mix.
        </div>
      `;
    }

    const mixLevainLine = hasLevain
      ? `Add your levain (~${levainWeight.toFixed(0)} g) and salt (~${salt.toFixed(1)} g). Mix until cohesive.`
      : `Add your ripe starter and salt (~${salt.toFixed(1)} g). Mix until cohesive.`;

    schedulePreview.innerHTML = `
      ${topHtml}
      ${levainHtml}

      <div class="schedule-grid">
        <div class="schedule-row">
          <div class="schedule-time">Step 1</div>
          <div>
            <div class="schedule-label" tabindex="0">Autolyse (optional)</div>
            <div class="schedule-detail">
              Mix flour (${addedFlour.toFixed(0)} g) + water (${addedWater.toFixed(0)} g). Rest 30–60 minutes.
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 2</div>
          <div>
            <div class="schedule-label" tabindex="0">Mix levain &amp; salt</div>
            <div class="schedule-detail">${mixLevainLine}</div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 3</div>
          <div>
            <div class="schedule-label" tabindex="0">Bulk fermentation</div>
            <div class="schedule-detail">
              Ferment at ${friendlyTemp}. Typical: ${bulkTimeText}. Look for bubbles, puffiness, and jiggle.
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 4</div>
          <div>
            <div class="schedule-label" tabindex="0">Strength-building folds</div>
            <div class="schedule-detail">
              Do 3–4 fold sets every 30–45 min in the first half of bulk. Stop when the dough feels stronger.
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 5</div>
          <div>
            <div class="schedule-label" tabindex="0">Bench rest</div>
            <div class="schedule-detail">Rest 20–30 minutes, covered.</div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 6</div>
          <div>
            <div class="schedule-label" tabindex="0">Final shape</div>
            <div class="schedule-detail">Shape with surface tension (boule/batard/pan).</div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 7</div>
          <div>
            <div class="schedule-label" tabindex="0">Final proof</div>
            <div class="schedule-detail">45–90 min at room temp OR 8–16 hrs cold proof.</div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 8</div>
          <div>
            <div class="schedule-label" tabindex="0">Bake</div>
            <div class="schedule-detail">Bake hot + steamy (often Dutch oven). Cool 1 hr before slicing.</div>
          </div>
        </div>
      </div>
    `;
  }

  // Bind button click (and fail loudly if missing)
  if (
    calculateFormulaBtn &&
    schedulePreview &&
    targetWeightInput &&
    hydrationInput &&
    saltPercentInput
  ) {
    calculateFormulaBtn.addEventListener("click", () => {
      const targetWeight = parseFloat(targetWeightInput.value) || 900;
      const hydration = parseFloat(hydrationInput.value) || 75;
      const saltPercent = parseFloat(saltPercentInput.value) || 2;
      const levainPercent = levainPercentInput
        ? parseFloat(levainPercentInput.value) || 0
        : 0;

      const ambient =
        ambientTempInput && ambientTempInput.value !== ""
          ? parseFloat(ambientTempInput.value)
          : null;

      // Baker's math
      const flour = targetWeight / (1 + hydration / 100 + saltPercent / 100);
      const water = (flour * hydration) / 100;
      const salt = (flour * saltPercent) / 100;

      // Levain math
      const levainHydrationPercent = getLevainHydrationPercent();
      let levainWeight = 0;
      let levainFlour = 0;
      let levainWater = 0;
      let addedFlour = flour;
      let addedWater = water;

      if (levainPercent > 0) {
        levainWeight = (flour * levainPercent) / 100;

        const hRatio = levainHydrationPercent > 0 ? levainHydrationPercent / 100 : 1;
        levainFlour = levainWeight / (1 + hRatio);
        levainWater = levainWeight - levainFlour;

        addedFlour = flour - levainFlour;
        addedWater = water - levainWater;
      }

      renderSchedulePreview({
        targetWeight,
        flour,
        water,
        salt,
        levainPercent,
        levainHydrationPercent,
        levainWeight,
        levainFlour,
        levainWater,
        addedFlour,
        addedWater,
        ambient,
        hydration,
        flourBlend: flourBlendInput && flourBlendInput.value.trim(),
      });

      // Mirror into Flow Guide if that hook exists
      if (typeof window !== "undefined" && typeof window.sourdohAddFlowEvent === "function") {
        const roundedWeight = Math.round(targetWeight);
        const stageText = `Planned dough: ~${roundedWeight}g at ${hydration}% hydration`;
        const tempText = ambient !== null && !Number.isNaN(ambient) ? `${ambient}` : "";
        const blendNote =
          flourBlendInput && flourBlendInput.value.trim()
            ? `Flour blend: ${flourBlendInput.value.trim()}`
            : "";
        window.sourdohAddFlowEvent("bulk", stageText, tempText, blendNote);
      }
    });
  } else {
    // Helpful console signal if DOM IDs ever change
    console.warn(
      "Planner: missing required DOM nodes. Check IDs: calculateFormulaBtn, schedulePreview, targetWeight, hydration, saltPercent."
    );
  }
})();

// ===================== END: Planner (formula + schedule with levain) =====================
