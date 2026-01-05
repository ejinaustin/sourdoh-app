// ===================== BEGIN: Planner (formula + schedule with levain) =====================
(function () {
  "use strict";

  // Grab all the elements we need
  const calculateFormulaBtn = document.getElementById("calculateFormulaBtn");
  const schedulePreview = document.getElementById("schedulePreview");

  const targetWeightInput = document.getElementById("targetWeight");
  const hydrationInput = document.getElementById("hydration");
  const saltPercentInput = document.getElementById("saltPercent");
  const levainPercentInput = document.getElementById("levainPercent");
  const flourBlendInput = document.getElementById("flourBlend");
  const ambientTempInput = document.getElementById("ambientTemp");

    // IMPORTANT: bakeStarterSelect is declared once in starter.js and reused here
  const targetWeightHintBtn = document.getElementById("targetWeightHintBtn");
  const hydrationHintBtn = document.getElementById("hydrationHintBtn");
  const saltHintBtn = document.getElementById("saltHintBtn");
  const flourBlendHintBtn = document.getElementById("flourBlendHintBtn");
  const ambientTempHintBtn = document.getElementById("ambientTempHintBtn");
  const levainHintBtn = document.getElementById("levainHintBtn");

  // Beginner-friendly hint buttons for the dough formula

  if (targetWeightHintBtn) {
    targetWeightHintBtn.addEventListener("click", () => {
      window.alert(
        [
          "Target dough weight – what is it?",
          "",
          "This is the total weight of the mixed dough that will become your loaf or loaves –",
          "flour, water, salt, and levain all included.",
          "",
          "Typical ranges:",
          "• 700–900 g → a medium round boule.",
          "• 800–1,000 g → a sandwich tin loaf.",
          "• 1,400–1,800 g → two loaves from one mix.",
          "",
          "Choosing this up front lets the app scale the flour, water, salt, and levain for you."
        ].join("\n")
      );
    });
  }

  if (hydrationHintBtn) {
    hydrationHintBtn.addEventListener("click", () => {
      window.alert(
        [
          "Hydration – how wet is the dough?",
          "",
          "Hydration is the ratio of water to flour by weight.",
          "• 60–65%: easier to handle, tighter crumb.",
          "• 70–75%: classic open-crumb sourdough, good oven spring.",
          "• 80%+: very open crumb, but the dough is stickier and needs more technique.",
          "",
          "Higher hydration doughs ferment a bit faster and feel looser; lower hydration",
          "doughs are firmer and more forgiving but won’t have the same big holes."
        ].join("\n")
      );
    });
  }

  if (saltHintBtn) {
    saltHintBtn.addEventListener("click", () => {
      window.alert(
        [
          "Salt – why it matters",
          "",
          "Salt in bread does three big things:",
          "• Adds flavor.",
          "• Strengthens the gluten network.",
          "• Slows fermentation slightly so the dough doesn’t race ahead.",
          "",
          "Typical sourdough uses about 1.8–2.2% salt relative to flour weight.",
          "",
          "Tip: don’t dump dry salt directly on a small blob of starter – it can stress the",
          "yeast and bacteria. Instead, mix salt into the main dough or into the water first."
        ].join("\n")
      );
    });
  }

  if (flourBlendHintBtn) {
    flourBlendHintBtn.addEventListener("click", () => {
      window.alert(
        [
          "Flour blend – how different flours behave",
          "",
          "Different flours change both structure and flavor:",
          "• Bread flour: higher protein → stronger gluten and more chew.",
          "• All-purpose: softens the crumb, more tender.",
          "• Whole wheat / rye / spelt: more flavor, color, and nutrition,",
          "  but they also absorb more water and can speed fermentation.",
          "",
          "As you add more whole grain, you often need a little more water and you",
          "may shorten the bulk/proof times so the dough doesn’t over-ferment."
        ].join("\n")
      );
    });
  }

  if (ambientTempHintBtn) {
    ambientTempHintBtn.addEventListener("click", () => {
      window.alert(
        [
          "Room temperature – the fermentation throttle",
          "",
          "Dough temperature (and room temperature) controls how fast your dough ferments.",
          "",
          "Rough guide:",
          "• 18–20°C (64–68°F): slow; expect longer bulk and proof times.",
          "• 23–24°C (73–75°F): “normal” pace for many recipes.",
          "• 25–28°C (77–82°F): fast; you need to watch the dough closely",
          "  so it doesn’t overproof.",
          "",
          "Use this value so the planner can suggest time ranges that actually match your kitchen."
        ].join("\n")
      );
    });
  }

  // Beginner-friendly levain explanation for the "?" button
  if (levainHintBtn) {
    levainHintBtn.addEventListener("click", () => {
      window.alert(
        [
          "What is levain (and why does it matter)?",
          "",
          "In sourdough, “levain” is a portion of active starter that you build just for this dough.",
          "It’s made from your main starter plus fresh flour and water.",
          "",
          "“Levain % of flour” describes how big that levain build is compared to the total flour",
          "in the dough. For example:",
          "• 20% levain in a 500 g flour dough → about 100 g of that dough comes from levain.",
          "",
          "Levain brings both flour and water, plus all the yeast and bacteria that drive fermentation.",
          "Choosing this percentage helps control flavor and timing.",
          "",
          "If you don’t have a starter saved in Starter Lab, assume your levain is 100% hydration",
          "(equal parts flour and water by weight), which is the most common style.",
          "",
          "If you’re new to this, a levain of 15–25% of the flour is a very safe range."
        ].join("\n")
      );
    });
  }

  // Beginner-friendly levain explanation for the "?" button
  if (levainHintBtn) {
    levainHintBtn.addEventListener("click", () => {
      window.alert(
        [
          "What is levain (and why does it matter)?",
          "",
          "In sourdough, “levain” is a portion of active starter that you build just for this dough. It’s made from your main starter, plus fresh flour and water.",
          "",
          "When we say “Levain % of flour”, we’re talking about how big that levain is compared to the total flour in the dough. For example:",
          "  • 20% levain in a 500 g flour dough means about 100 g of that dough comes from your levain.",
          "",
          "This matters because levain brings both flour and water with it. The app uses this percentage (plus your starter’s hydration) to estimate how much flour and water the levain is contributing, so it can tell you how much fresh flour and water you’ll still add when you mix.",
          "",
          "If you don’t have a starter saved in the Starter Lab, we assume your levain is 100% hydration (equal parts flour and water by weight), which is the most common style.",
          "",
          "If you’re new to this, a levain of 15–25% of the flour is a very safe range."
        ].join("\n")
      );
    });
  }

  // Try to infer levain hydration from the selected starter (via data-hydration on the <option>), otherwise 100%
  function getLevainHydrationPercent() {
    let hydrationPct = 100; // default

    if (typeof bakeStarterSelect !== "undefined" && bakeStarterSelect && bakeStarterSelect.value) {
      const opt = bakeStarterSelect.selectedOptions[0];
      if (opt) {
        const raw = opt.getAttribute("data-hydration");
        if (raw) {
          const parsed = parseFloat(raw.replace(/[^\d.]/g, ""));
          if (!isNaN(parsed) && parsed > 0 && parsed < 300) {
            hydrationPct = parsed;
          }
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

    // Build a friendly temp string + a little science about what that means
    let friendlyTemp =
      ambient != null && !isNaN(ambient)
        ? ambient.toFixed(1) + tempUnit
        : "room temp";

    let bulkTimeText = "3–5 hours";
    let tempDescriptor = "";

    if (ambient != null && !isNaN(ambient)) {
      let ambientC = ambient;
      const isF =
        bodyEl && bodyEl.getAttribute("data-temp-units") === "F";

      if (isF) {
        ambientC = ((ambient - 32) * 5) / 9;
      }

      if (ambientC <= 20) {
        bulkTimeText = "4–6 hours";
        tempDescriptor =
          "Cooler room temps slow fermentation down. Expect a longer, gentler bulk and keep an eye on volume instead of the clock.";
      } else if (ambientC >= 26) {
        bulkTimeText = "3–4 hours";
        tempDescriptor =
          "Warmer room temps speed fermentation up. Dough will rise faster, so check it more often to avoid overproofing.";
      } else {
        bulkTimeText = "3½–5 hours";
        tempDescriptor =
          "This is a comfortable mid-range for sourdough. Bulk will move at a moderate pace with a good balance of flavor and strength.";
      }
    }

    const hasLevain =
      levainPercent && levainPercent > 0 && levainWeight > 0;

    // Top summary
    let topHtml = `
      <div class="muted-text" style="margin-bottom:0.75rem;">
        Target dough: <strong>${targetWeight.toFixed(0)} g</strong> at
        <strong>${hydration.toFixed(0)}% hydration</strong> with about
        <strong>${salt.toFixed(1)}% salt</strong> at
        <strong>${friendlyTemp}</strong>.
      </div>
      <div class="muted-text" style="margin-bottom:0.75rem;">
        Flour: <strong>${flour.toFixed(0)} g</strong> total
        ${
          flourBlend
            ? `(e.g. <span>${escapeHtml(flourBlend)}</span>)`
            : ""
        }.
        Water: <strong>${water.toFixed(0)} g</strong> total.
      </div>
    `;

    if (tempDescriptor) {
      topHtml += `
        <div class="note-callout">
          <strong>How your room temperature affects this dough:</strong><br>
          ${escapeHtml(tempDescriptor)}
        </div>
      `;
    }

    let levainHtml = "";
    if (hasLevain) {
      levainHtml = `
        <div class="muted-text" style="margin-bottom:0.75rem;">
          Levain: <strong>${levainPercent.toFixed(
            0
          )}%</strong> of flour (~<strong>${levainWeight.toFixed(
        0
      )} g</strong> at about
          <strong>${levainHydrationPercent.toFixed(0)}% hydration</strong>).
        </div>
        <div class="note-callout">
          <strong>Levain breakdown (nothing to memorize):</strong><br>
          Your levain contributes about
          <strong>${levainFlour.toFixed(0)} g flour</strong> and
          <strong>${levainWater.toFixed(0)} g water</strong> to the dough.
          That means you’ll still add around
          <strong>${addedFlour.toFixed(0)} g fresh flour</strong> and
          <strong>${addedWater.toFixed(0)} g fresh water</strong>
          when you mix the dough.
        </div>
      `;
    }

    // Step 2 text – avoid saying “~0 g” when levain is not used
    const mixLevainLine = hasLevain
      ? `Add your levain (~${levainWeight.toFixed(
          0
        )} g) and salt (~${salt.toFixed(
          1
        )}% of flour). Mix until everything is evenly combined and the dough looks cohesive.`
      : `Add your ripe starter and salt (~${salt.toFixed(
          1
        )}% of flour). Mix until everything is evenly combined and the dough looks cohesive.`;

    schedulePreview.innerHTML = `
      ${topHtml}
      ${levainHtml}

      <div class="schedule-grid">
        <div class="schedule-row">
          <div class="schedule-time">Step 1</div>
          <div>
            <div
              class="schedule-label"
              data-tooltip="Autolyse is an easy first step: you mix just flour and water and let them sit so the flour can drink in the water."
              tabindex="0"
            >
              Autolyse (optional but nice)
            </div>
            <div class="schedule-detail">
              Mix the fresh flour (${addedFlour.toFixed(
                0
              )} g) and fresh water (${addedWater.toFixed(
      0
    )} g). Let it rest 30–60 minutes.
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 2</div>
          <div>
            <div
              class="schedule-label"
              data-tooltip="This is when you add your levain and salt to the soaked flour, turning it into a full dough."
              tabindex="0"
            >
              Mix levain &amp; salt
            </div>
            <div class="schedule-detail">
              ${mixLevainLine}
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 3</div>
          <div>
            <div
              class="schedule-label"
              data-tooltip="Bulk fermentation is the main rise in the bowl. Time and temperature work together here."
              tabindex="0"
            >
              Bulk fermentation
            </div>
            <div class="schedule-detail">
              Let the dough rise at ${friendlyTemp}. Depending on your starter and room temp,
              this might take about ${bulkTimeText}. Look for a softer, puffier dough with bubbles
              along the sides and a smoother, jiggly surface when you shake the container.
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 4</div>
          <div>
            <div
              class="schedule-label"
              data-tooltip="Coil folds or stretch-and-folds gently build strength in the dough without kneading."
              tabindex="0"
            >
              Strength-building folds
            </div>
            <div class="schedule-detail">
              During the first half of bulk, perform 3–4 gentle sets of folds about 30–45 minutes apart.
              Stop folding once the dough feels smoother, stronger, and a bit bouncy.
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 5</div>
          <div>
            <div
              class="schedule-label"
              data-tooltip="Bench rest lets the dough relax before you shape it, making it easier to handle."
              tabindex="0"
            >
              Bench rest
            </div>
            <div class="schedule-detail">
              Cover and rest 20–30 minutes. The dough should relax and spread a little,
              but not go completely flat.
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 6</div>
          <div>
            <div
              class="schedule-label"
              data-tooltip="Final shaping creates the surface tension that helps your loaf rise up instead of splatting outward."
              tabindex="0"
            >
              Final shape
            </div>
            <div class="schedule-detail">
              Shape into your chosen form (boule, batard, or pan loaf). Use firm but gentle
              movements to make a snug, smooth surface without tearing.
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 7</div>
          <div>
            <div
              class="schedule-label"
              data-tooltip="The final proof is the last rise before baking. It can be at room temp or in the fridge for extra flavor."
              tabindex="0"
            >
              Final proof
            </div>
            <div class="schedule-detail">
              Let the shaped dough rise at room temp for 45–90 minutes, or in the fridge for 8–16 hours
              (cold proof) for more flavor and flexibility with your schedule. The dough should look slightly
              puffier and feel lighter when gently poked.
            </div>
          </div>
        </div>

        <div class="schedule-row">
          <div class="schedule-time">Step 8</div>
          <div>
            <div
              class="schedule-label"
              data-tooltip="A hot, steamy oven helps the loaf spring up and develop a good crust."
              tabindex="0"
            >
              Bake
            </div>
            <div class="schedule-detail">
              Bake in a preheated oven (typically 230–250°C / 450–480°F), with steam or in a covered
              Dutch oven, until the crust is deeply colored and the internal temperature is around 96°C / 205°F.
              Let the loaf cool at least an hour before slicing so the crumb can set.
            </div>
          </div>
        </div>
      </div>
    `;
  }

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

      // Basic baker's math
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

        const hRatio =
          levainHydrationPercent > 0 ? levainHydrationPercent / 100 : 1;
        // L = f + w, w = h*f => f = L / (1 + h)
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
    });
  }
})();
// ===================== END: Planner (formula + schedule with levain) =====================
