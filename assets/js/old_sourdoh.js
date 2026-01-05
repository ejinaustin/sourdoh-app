
    (function () {
      "use strict";

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

      function escapeHtml(str) {
        if (str === undefined || str === null) return "";
        return String(str).replace(/[&<>"']/g, function (c) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] || c;
        });
      }

      function escapeAttr(str) {
        return escapeHtml(str).replace(/"/g, "&quot;");
      }

      const bodyEl = document.body;

      // ---------- Navigation ----------
      const navButtons = document.querySelectorAll(".app-nav-button");
      const sections = document.querySelectorAll(".app-section");

      function showSection(sectionName) {
        const targetId = "section-" + sectionName;
        sections.forEach((sec) => {
          if (sec.id === targetId) {
            sec.classList.add("app-section-active");
          } else {
            sec.classList.remove("app-section-active");
          }
        });
      }

      navButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
          const section = btn.getAttribute("data-section");
          navButtons.forEach((b) => b.classList.toggle("app-nav-active", b === btn));
          showSection(section);
        });
      });

      // ---------- Mode handling (Beginner / Expert) ----------
      const modeSelect = document.getElementById("modeSelect");
      const modeHint = document.getElementById("modeHint");
      const settingsModeSummary = document.getElementById("settingsModeSummary");

      const MODE_DESCRIPTIONS = {
        beginner: {
          home:
            "Beginner mode: we’ll keep things gentle, guide step-by-step, and tuck the nerdy bits behind “Deep Science” panels.",
          settings:
            "Beginner mode focuses on clear explanations and fewer distractions. You’ll see more guidance and fewer advanced knobs.",
        },
        expert: {
          home:
            "Expert mode: we assume you’ve baked a few loaves. Expect more numbers, less hand-holding, and quick access to the deeper science.",
          settings:
            "Expert mode prioritizes speed and detail over explanation. Great if you’re optimizing formulas or comparing multiple bakes.",
        },
      };

      function applyMode(mode) {
        const m = mode === "expert" ? "expert" : "beginner";
        bodyEl.setAttribute("data-mode", m);
        if (modeSelect) modeSelect.value = m;
        if (modeHint && MODE_DESCRIPTIONS[m]) modeHint.textContent = MODE_DESCRIPTIONS[m].home;
        if (settingsModeSummary && MODE_DESCRIPTIONS[m]) {
          settingsModeSummary.textContent = MODE_DESCRIPTIONS[m].settings;
        }
        saveJSON(STORAGE_KEYS.mode, m);
      }

      const storedMode = loadJSON(STORAGE_KEYS.mode, null);
      applyMode(storedMode || "beginner");

      if (modeSelect) {
        modeSelect.addEventListener("change", (e) => {
          applyMode(e.target.value);
        });
      }

      // ---------- Units & converters ----------
      const unitsMetric = document.getElementById("unitsMetric");
      const unitsImperial = document.getElementById("unitsImperial");
      const weightLabels = document.querySelectorAll('[data-units-label="weight"]');
      const tempLabels = document.querySelectorAll('[data-units-label="temp"]');

      function applyUnits(units) {
        const u = units === "imperial" ? "imperial" : "metric";
        bodyEl.setAttribute("data-units", u);

        if (unitsMetric) unitsMetric.checked = u === "metric";
        if (unitsImperial) unitsImperial.checked = u === "imperial";

        weightLabels.forEach((el) => {
          el.textContent = u === "imperial" ? "oz" : "g";
        });
        tempLabels.forEach((el) => {
          el.textContent = u === "imperial" ? "°F" : "°C";
        });

        saveJSON(STORAGE_KEYS.units, u);
      }

      const storedUnits = loadJSON(STORAGE_KEYS.units, null);
      applyUnits(storedUnits || "metric");

      if (unitsMetric) {
        unitsMetric.addEventListener("change", () => applyUnits("metric"));
      }
      if (unitsImperial) {
        unitsImperial.addEventListener("change", () => applyUnits("imperial"));
      }

      // Converters
      const convertWeightInput = document.getElementById("convertWeightInput");
      const convertWeightDirection = document.getElementById("convertWeightDirection");
      const convertWeightResult = document.getElementById("convertWeightResult");
      const convertTempInput = document.getElementById("convertTempInput");
      const convertTempDirection = document.getElementById("convertTempDirection");
      const convertTempResult = document.getElementById("convertTempResult");

      function updateWeightConversion() {
        if (!convertWeightInput || !convertWeightDirection || !convertWeightResult) return;
        const val = parseFloat(convertWeightInput.value);
        if (!val && val !== 0) {
          convertWeightResult.textContent = "";
          return;
        }
        const dir = convertWeightDirection.value;
        let out = "";
        if (dir === "g-to-oz") {
          out = (val / 28.3495).toFixed(2) + " oz";
        } else {
          out = (val * 28.3495).toFixed(0) + " g";
        }
        convertWeightResult.textContent = out;
      }

      function updateTempConversion() {
        if (!convertTempInput || !convertTempDirection || !convertTempResult) return;
        const val = parseFloat(convertTempInput.value);
        if (!val && val !== 0) {
          convertTempResult.textContent = "";
          return;
        }
        const dir = convertTempDirection.value;
        let out = "";
        if (dir === "c-to-f") {
          out = ((val * 9) / 5 + 32).toFixed(1) + " °F";
        } else {
          out = (((val - 32) * 5) / 9).toFixed(1) + " °C";
        }
        convertTempResult.textContent = out;
      }

      if (convertWeightInput) {
        convertWeightInput.addEventListener("input", updateWeightConversion);
        convertWeightDirection.addEventListener("change", updateWeightConversion);
      }
      if (convertTempInput) {
        convertTempInput.addEventListener("input", updateTempConversion);
        convertTempDirection.addEventListener("change", updateTempConversion);
      }

      // ---------- Starter Lab ----------
      let starters = loadJSON(STORAGE_KEYS.starters, []);
      let feeds = loadJSON(STORAGE_KEYS.feeds, []);

      const starterListEl = document.getElementById("starterList");
      const feedStarterSelect = document.getElementById("feedStarterSelect");
      const bakeStarterSelect = document.getElementById("bakeStarterSelect");

      const starterNameInput = document.getElementById("starterName");
      const starterHydrationInput = document.getElementById("starterHydration");
      const starterFlourInput = document.getElementById("starterFlour");
      const starterOriginInput = document.getElementById("starterOrigin");
      // Auto-populate origin date with today by default (for new starters)
      if (starterOriginInput && !starterOriginInput.value) {
        const today = new Date();
        const iso = today.toISOString().slice(0, 10); // YYYY-MM-DD
        starterOriginInput.value = iso;
      }
      const starterNotesInput = document.getElementById("starterNotes");
      const starterSaveBtn = document.getElementById("starterSaveBtn");

      const starterExpectationsCard = document.getElementById("starterExpectationsCard");
      const starterExpectationsBtn = document.getElementById("starterExpectationsBtn");

      if (starterExpectationsCard) {
        starterExpectationsCard.style.display = "none";
      }
      if (starterExpectationsBtn && starterExpectationsCard) {
        starterExpectationsBtn.addEventListener("click", () => {
          const hidden = starterExpectationsCard.style.display === "none";
          starterExpectationsCard.style.display = hidden ? "" : "none";
        });
      }

      function renderStarters() {
        if (!starterListEl) return;

        if (!Array.isArray(starters)) starters = [];

        if (!starters.length) {
          starterListEl.innerHTML =
            '<div class="list-empty">No starters yet. Create one above to see it here.</div>';
        } else {
          const items = starters
            .map((s) => {
              const starterFeeds = Array.isArray(feeds)
                ? feeds.filter((f) => f.starterId === s.id)
                : [];

              let feedHistoryHtml = "";
              if (starterFeeds.length) {
                const rows = starterFeeds
                  .slice()
                  .sort((a, b) => {
                    const at = a.timestamp || "";
                    const bt = b.timestamp || "";
                    return at.localeCompare(bt);
                  })
                  .reverse()
                  .map((f) => {
                    const when = f.timestamp ? new Date(f.timestamp).toLocaleString() : "";
                    const ratioText = f.ratio ? ` · ${escapeHtml(f.ratio)}` : "";
                    const tempText = f.temp ? ` · ${escapeHtml(f.temp)}°C` : "";
                    const peakText = f.peakHours ? ` · peak ~${escapeHtml(f.peakHours)}h` : "";
                    const notesText = f.notes
                      ? `<div class="feed-history-notes">${escapeHtml(f.notes).replace(/\n/g, "<br>")}</div>`
                      : "";
                    return `
              <div class="feed-history-item">
                <div class="feed-history-meta">${escapeHtml(when)}${ratioText}${tempText}${peakText}</div>
                ${notesText}
              </div>`;
                  })
                  .join("");

                feedHistoryHtml = `
              <details class="feed-history">
                <summary>Feed history (${starterFeeds.length})</summary>
                <div class="feed-history-list">
                  ${rows}
                </div>
              </details>`;
              } else {
                feedHistoryHtml =
                  '<div class="feed-history-empty muted-text">No feedings logged yet.</div>';
              }

              return `
              <div class="list-item">
                <div class="list-item-header">
                  <span>${escapeHtml(s.name || "Unnamed starter")}</span>
                  <span class="list-item-meta">${escapeHtml(s.originDate || "")}</span>
                </div>
                <div class="list-item-meta">
                  Hydration: ${s.hydration ? escapeHtml(s.hydration) + "%" : "–"} • Flour:
                  ${escapeHtml(s.flour || "–")}
                </div>
                ${
                  s.notes
                    ? `<div class="list-item-body">${escapeHtml(s.notes).replace(/\n/g, "<br>")}</div>`
                    : ""
                }
                ${feedHistoryHtml}
              </div>`;
            })
            .join("");
          starterListEl.innerHTML = `<div class="list-items">${items}</div>`;
        }

        const starterOptions =
          starters.length > 0
            ? '<option value="">Choose a starter</option>' +
              starters
                .map((s) => `<option value="${escapeAttr(s.id || "")}">${escapeAttr(s.name || "")}</option>`)
                .join("")
            : '<option value="">Choose a starter</option>';

        if (feedStarterSelect) {
          feedStarterSelect.innerHTML = starterOptions;
        }
        if (bakeStarterSelect) {
          const base = '<option value="">No specific starter</option>';
          if (starters.length) {
            bakeStarterSelect.innerHTML =
              base +
              starters
                .map((s) => `<option value="${escapeAttr(s.id || "")}">${escapeAttr(s.name || "")}</option>`)
                .join("");
          } else {
            bakeStarterSelect.innerHTML = base;
          }
        }
      }if (starterSaveBtn) {
        starterSaveBtn.addEventListener("click", () => {
          const name = (starterNameInput && starterNameInput.value.trim()) || "";
          if (!name) {
            window.alert("Give your starter a name first.");
            return;
          }

          const starter = {
            id: Date.now().toString(),
            name,
            hydration: starterHydrationInput && starterHydrationInput.value.trim(),
            flour: starterFlourInput && starterFlourInput.value.trim(),
            originDate: starterOriginInput && starterOriginInput.value,
            notes: starterNotesInput && starterNotesInput.value.trim(),
          };

          starters.push(starter);
          saveJSON(STORAGE_KEYS.starters, starters);
          renderStarters();

          if (starterNameInput) starterNameInput.value = "";
          if (starterHydrationInput) starterHydrationInput.value = "";
          if (starterFlourInput) starterFlourInput.value = "";
          if (starterOriginInput) starterOriginInput.value = "";
          if (starterNotesInput) starterNotesInput.value = "";
        });
      }

      const feedRatioInput = document.getElementById("feedRatio");
      const feedTempInput = document.getElementById("feedTemp");
      const feedPeakTimeInput = document.getElementById("feedPeakTime");
      const feedNotesInput = document.getElementById("feedNotes");
      const feedSaveBtn = document.getElementById("feedSaveBtn");

      if (feedSaveBtn) {
        feedSaveBtn.addEventListener("click", () => {
          const starterId = feedStarterSelect && feedStarterSelect.value;
          if (!starterId) {
            window.alert("Choose a starter for this feeding.");
            return;
          }

          const entry = {
            id: Date.now().toString(),
            starterId,
            timestamp: new Date().toISOString(),
            ratio: feedRatioInput && feedRatioInput.value.trim(),
            temp: feedTempInput && feedTempInput.value.trim(),
            peakHours: feedPeakTimeInput && feedPeakTimeInput.value.trim(),
            notes: feedNotesInput && feedNotesInput.value.trim(),
          };

          if (!Array.isArray(feeds)) feeds = [];
          feeds.push(entry);
          saveJSON(STORAGE_KEYS.feeds, feeds);

          if (feedRatioInput) feedRatioInput.value = "";
          if (feedTempInput) feedTempInput.value = "";
          if (feedPeakTimeInput) feedPeakTimeInput.value = "";
          if (feedNotesInput) feedNotesInput.value = "";

          window.alert("Feeding saved under that starter.");
        });
      }

      const printStarterLogBtn = document.getElementById("printStarterLogBtn");
      if (printStarterLogBtn) {
        printStarterLogBtn.addEventListener("click", () => {
          window.print();
        });
      }

      const deepScienceBlock = document.getElementById("starterDeepScience");
      if (deepScienceBlock) {
        const header = deepScienceBlock.querySelector(".deep-science-header");
        const body = deepScienceBlock.querySelector(".deep-science-body");
        const icon = deepScienceBlock.querySelector(".deep-science-toggle-icon");
        if (body && header) {
          body.classList.remove("open");
          body.style.display = "none";
          header.addEventListener("click", () => {
            const isOpen = body.classList.contains("open");
            body.classList.toggle("open", !isOpen);
            body.style.display = isOpen ? "none" : "block";
            if (icon) icon.textContent = isOpen ? "▼" : "▲";
          });
        }
      }

// ---------- Planner: formula + schedule with hover tips + levain details ----------
      const calculateFormulaBtn = document.getElementById("calculateFormulaBtn");
      const schedulePreview = document.getElementById("schedulePreview");
      const targetWeightInput = document.getElementById("targetWeight");
      const hydrationInput = document.getElementById("hydration");
      const saltPercentInput = document.getElementById("saltPercent");
      const levainPercentInput = document.getElementById("levainPercent");
      const flourBlendInput = document.getElementById("flourBlend");
      const ambientTempInput = document.getElementById("ambientTemp");

      // Optional: use the same starter selection as the Bake Log for levain style
      const bakeStarterSelect = document.getElementById("bakeStarterSelect");

      // Optional levain hint button ("?")
      const levainHintBtn = document.getElementById("levainHintBtn");
      if (levainHintBtn) {
        levainHintBtn.addEventListener("click", () => {
          window.alert(
            [
              "Levain (or preferment) is counted as part of your total flour and water,",
              "not something extra on top. The planner:",
              "",
              "- Uses your starter's hydration when we can (from its profile).",
              "- Defaults to 100% hydration if no starter is selected.",
              "- Calculates total levain weight as a % of total flour.",
              "- Splits that levain into flour + water so you can see how much",
              "  of your mix is pre-fermented and how much fresh flour/water",
              "  you still need to add.",
              "",
              "Why it matters: the levain amount and its hydration affect how",
              "quickly the dough ferments, how sour it gets, and how strong the",
              "gluten feels during mixing and shaping."
            ].join("\n")
          );
        });
      }

      // Determine which levain hydration to assume (percent) based on starter profile, or 100% fallback
      function getLevainHydrationPercent() {
        // Default to 100% hydration
        let hydrationPct = 100;

        // If we have a starter selection and a starters list, try to look it up
        try {
          if (bakeStarterSelect && bakeStarterSelect.value && Array.isArray(starters)) {
            const starterId = bakeStarterSelect.value;
            const s = starters.find((st) => st.id === starterId);
            if (s && s.hydration) {
              const parsed = parseFloat(String(s.hydration).replace(/[^\d.]/g, ""));
              if (!isNaN(parsed) && parsed > 0 && parsed < 300) {
                hydrationPct = parsed;
              }
            }
          }
        } catch (e) {
          // If anything weird happens, just fall back to 100%
          hydrationPct = 100;
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

        const friendlyTemp =
          ambient != null && !isNaN(ambient) ? ambient.toFixed(1) + "°C" : "room temp";

        const hasLevain = levainPercent && levainPercent > 0 && levainWeight > 0;

        // Top summary
        let topHtml = `
          <div class="muted-text" style="margin-bottom:0.7rem;">
            Based on <strong>${targetWeight.toFixed(0)} g</strong> dough at
            <strong>${hydration.toFixed(0)}%</strong> hydration and roughly ${friendlyTemp},
            here’s an approximate formula and flow:
          </div>
          <div class="muted-text" style="margin-bottom:0.7rem;">
            Flour: <strong>${flour.toFixed(0)} g</strong>
            &nbsp;&middot;&nbsp;
            Water: <strong>${water.toFixed(0)} g</strong>
            &nbsp;&middot;&nbsp;
            Salt: <strong>${salt.toFixed(0)} g</strong>
        `;

        if (hasLevain) {
          topHtml += `
            &nbsp;&middot;&nbsp;
            Levain: <strong>${levainWeight.toFixed(0)} g</strong>
            <span class="muted-text">
              (${levainPercent.toFixed(0)}% of flour at ~${levainHydrationPercent.toFixed(0)}% hydration)
            </span>
          `;
        }

        if (flourBlend) {
          topHtml += `<br><span class="muted-text">Flour blend: ${escapeHtml(flourBlend)}</span>`;
        }

        topHtml += `</div>`;

        // Levain breakdown block (optional)
        let levainHtml = "";
        if (hasLevain) {
          levainHtml = `
            <div class="muted-text" style="margin-bottom:0.7rem;">
              <strong>Levain breakdown:</strong><br>
              Levain contributes approximately
              <strong>${levainFlour.toFixed(0)} g flour</strong> and
              <strong>${levainWater.toFixed(0)} g water</strong> to your dough.
              That means you will still add roughly
              <strong>${addedFlour.toFixed(0)} g fresh flour</strong> and
              <strong>${addedWater.toFixed(0)} g fresh water</strong>
              during mixing.
            </div>
          `;
        }

        schedulePreview.innerHTML = `
          ${topHtml}
          ${levainHtml}

          <div class="schedule-grid">
            <div class="schedule-row">
              <div class="schedule-time">Step 1</div>
              <div>
                <div
                  class="schedule-label"
                  data-tooltip="Autolyse is an early step where you mix flour and water before fermentation really gets going. It is basically a flour-and-water soak that jump-starts gluten development without kneading and lets the flour fully hydrate before you add salt and levain."
                  tabindex="0"
                >
                  Autolyse
                </div>
                <div class="schedule-detail">
                  Mix the ${addedFlour.toFixed(
                    0
                  )} g fresh flour with about the same proportion of the water you plan to add
                  (keeping some back if you like to fine-tune). Cover and rest 30–60 minutes.
                  Dough should feel smoother and less shaggy.
                </div>
              </div>
            </div>

            <div class="schedule-row">
              <div class="schedule-time">Step 2</div>
              <div>
                <div
                  class="schedule-label"
                  data-tooltip="Levain is a portion of your starter that you feed specifically for this bake; it is the mature, bubbly mix that drives fermentation. In this step you add your ripe levain and salt to the autolysed dough. The levain brings yeast and bacteria, while the salt strengthens gluten and slows fermentation slightly so you have a more controlled rise."
                  tabindex="0"
                >
                  Mix &amp; add levain + salt
                </div>
                <div class="schedule-detail">
                  Add your <strong>${hasLevain ? levainWeight.toFixed(0) : 0} g</strong> levain
                  and <strong>${salt.toFixed(
                    1
                  )} g</strong> salt into the dough. Pinch and fold until evenly distributed.
                  Dough will feel stickier at first, then tighten up.
                </div>
              </div>
            </div>

            <div class="schedule-row">
              <div class="schedule-time">Step 3</div>
              <div>
                <div
                  class="schedule-label"
                  data-tooltip="Bulk ferment is the main rise, where most gas, acidity, and flavor develop. Instead of chasing a precise number of hours, watch the dough: smoother texture, visible bubbles around the edges, and roughly a 30–60% rise usually signal it is ready to move on."
                  tabindex="0"
                >
                  Bulk ferment + folds
                </div>
                <div class="schedule-detail">
                  Let the dough rest in a warm spot. Perform gentle coil or stretch-&amp;-folds every
                  30–45 minutes for the first 2–3 hours to build strength without tearing. Watch the dough,
                  not the clock.
                </div>
              </div>
            </div>

            <div class="schedule-row">
              <div class="schedule-time">Step 4</div>
              <div>
                <div
                  class="schedule-label"
                  data-tooltip="Preshaping gathers the dough into a loose round or log to organize the gluten and redistribute gas. It makes final shaping easier and more even without committing to the final tight shape yet."
                  tabindex="0"
                >
                  Preshape
                </div>
                <div class="schedule-detail">
                  Turn dough out, lightly flour the surface, and tuck into a loose round.
                  Aim for light tension without tearing.
                </div>
              </div>
            </div>

            <div class="schedule-row">
              <div class="schedule-time">Step 5</div>
              <div>
                <div
                  class="schedule-label"
                  data-tooltip="Bench rest lets the dough relax after preshaping so gluten loosens just enough for a clean final shape. If it spreads completely flat, your dough may be too weak or too warm; if it does not relax at all, it may be under-fermented or too tight."
                  tabindex="0"
                >
                  Bench rest
                </div>
                <div class="schedule-detail">
                  Cover and rest 20–30 minutes. The dough should relax slightly but still hold some shape.
                </div>
              </div>
            </div>

            <div class="schedule-row">
              <div class="schedule-time">Step 6</div>
              <div>
                <div
                  class="schedule-label"
                  data-tooltip="Final shaping creates surface tension so the loaf rises upward instead of spreading out. A good shape balances strength and gentleness: too rough and you squeeze out gas, too timid and the loaf will pancake during proof or baking."
                  tabindex="0"
                >
                  Final shape
                </div>
                <div class="schedule-detail">
                  Shape into your chosen form (boule, batard, pan loaf). Use firm but gentle movements
                  to create a tight skin.
                </div>
              </div>
            </div>

            <div class="schedule-row">
              <div class="schedule-time">Step 7</div>
              <div>
                <div
                  class="schedule-label"
                  data-tooltip="A long, cool proof in the fridge slows fermentation, deepens flavor, and helps the loaf keep its shape. Over-proofed dough often feels extremely fragile and may collapse when you score it; under-proofed dough will feel tight and resist expansion."
                  tabindex="0"
                >
                  Cold proof (fridge)
                </div>
                <div class="schedule-detail">
                  Place shaped dough in a floured basket, cover, and refrigerate overnight or until
                  well-proofed and slightly jiggly.
                </div>
              </div>
            </div>

            <div class="schedule-row">
              <div class="schedule-time">Step 8 – Bake day</div>
              <div>
                <div
                  class="schedule-label"
                  data-tooltip="A thoroughly preheated oven and baking surface give you oven spring and a strong crust. Steam in the first part of the bake keeps the crust flexible so the loaf can expand before it sets, then venting or removing the lid lets it crisp and color."
                  tabindex="0"
                >
                  Preheat &amp; bake
                </div>
                <div class="schedule-detail">
                  Preheat your oven and vessel for at least 30–45 minutes. Score the cold dough,
                  bake with steam or lid on, then finish uncovered until deep golden and crackling.
                </div>
              </div>
            </div>
          </div>
        `;
      }

      if (calculateFormulaBtn && schedulePreview) {
        calculateFormulaBtn.addEventListener("click", () => {
          const targetWeight = parseFloat(targetWeightInput && targetWeightInput.value) || 0;
          if (!targetWeight || targetWeight <= 0) {
            schedulePreview.textContent =
              "Please enter at least a target dough weight to generate a formula and schedule.";
            return;
          }

          const hydration =
            parseFloat(hydrationInput && hydrationInput.value) || 75; // %
          const saltPercent =
            parseFloat(saltPercentInput && saltPercentInput.value) || 2; // %
          const levainPercent =
            parseFloat(levainPercentInput && levainPercentInput.value) || 0; // % of flour
          const ambient = parseFloat(ambientTempInput && ambientTempInput.value);

          // Simple baker's math: target ≈ flour + water + salt
          const flour = targetWeight / (1 + hydration / 100 + saltPercent / 100);
          const water = flour * (hydration / 100);
          const salt = flour * (saltPercent / 100);

          // Levain math: levain is a % of total flour, with its own hydration
          const levainHydrationPercent = getLevainHydrationPercent();
          let levainWeight = 0;
          let levainFlour = 0;
          let levainWater = 0;
          let addedFlour = flour;
          let addedWater = water;

          if (levainPercent > 0) {
            levainWeight = flour * (levainPercent / 100);

            // Convert hydration% to ratio (e.g., 100% -> 1.0, 80% -> 0.8)
            const hRatio =
              levainHydrationPercent > 0 ? levainHydrationPercent / 100 : 1;

            // LevainWeight = f + w, and w = hRatio * f => f = L / (1 + hRatio)
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

      // ---------- Bake log (unlimited) ----------
      let bakes = loadJSON(STORAGE_KEYS.bakes, []);

      const bakeSaveBtn = document.getElementById("bakeSaveBtn");
      const bakeListEl = document.getElementById("bakeList");

      const bakeNameInput = document.getElementById("bakeName");
      const bakeDateInput = document.getElementById("bakeDate");
      // Auto-populate bake date with today by default
      if (bakeDateInput && !bakeDateInput.value) {
        const today = new Date();
        const iso = today.toISOString().slice(0, 10); // YYYY-MM-DD
        bakeDateInput.value = iso;
      }

      const bakeDoughWeightInput = document.getElementById("bakeDoughWeight");
      const bakeHydrationInput = document.getElementById("bakeHydration");
      const bakeSaltPercentInput = document.getElementById("bakeSaltPercent");
      const bakeLevainPercentInput = document.getElementById("bakeLevainPercent");

      const bakeAmbientTempInput = document.getElementById("bakeAmbientTemp");
      const bakeBulkHoursInput = document.getElementById("bakeBulkHours");
      const bakeFoldsInput = document.getElementById("bakeFolds");
      const bakeFoldMethodSelect = document.getElementById("bakeFoldMethod");
      const bakeBulkNotesInput = document.getElementById("bakeBulkNotes");

      const bakeProofMethodSelect = document.getElementById("bakeProofMethod");
      const bakeProofHoursInput = document.getElementById("bakeProofHours");
      const bakeProofTempInput = document.getElementById("bakeProofTemp");
      const bakeVesselSelect = document.getElementById("bakeVessel");

      const bakePreheatTempInput = document.getElementById("bakePreheatTemp");
      const bakeBakeTempInput = document.getElementById("bakeBakeTemp");
      const bakeCoveredMinutesInput = document.getElementById("bakeCoveredMinutes");
      const bakeUncoveredMinutesInput = document.getElementById("bakeUncoveredMinutes");
      const bakeSteamMethodInput = document.getElementById("bakeSteamMethod");
      const bakeBakeNotesInput = document.getElementById("bakeBakeNotes");

      const bakeCrumbInput = document.getElementById("bakeCrumb");
      const bakeCrustInput = document.getElementById("bakeCrust");
      const bakeSournessInput = document.getElementById("bakeSourness");
      const bakeOverallInput = document.getElementById("bakeOverall");
      const bakeNotesInput = document.getElementById("bakeNotes");

      function renderBakes() {
        if (!bakeListEl) return;

        if (!Array.isArray(bakes)) bakes = [];

        if (!bakes.length) {
          bakeListEl.className = "list-empty";
          bakeListEl.textContent = "No bakes saved yet. Log one above to start your history.";
          return;
        }

        bakeListEl.className = "list-items";
        bakeListEl.innerHTML = bakes
          .slice()
          .reverse()
          .map((b) => {
            const metaBits = [];
            if (b.doughWeight) metaBits.push(`${b.doughWeight} g`);
            if (b.hydration) metaBits.push(`${b.hydration}% hydration`);
            if (b.ambientTemp) metaBits.push(`${b.ambientTemp}°C ambient`);
            const meta = metaBits.join(" • ");

            const ratings = [];
            if (b.crumb) ratings.push(`Crumb ${b.crumb}/5`);
            if (b.crust) ratings.push(`Crust ${b.crust}/5`);
            if (b.sourness) ratings.push(`Sourness ${b.sourness}/5`);
            if (b.overall) ratings.push(`Overall ${b.overall}/5`);
            const ratingText = ratings.join(" • ");

            return `
              <div class="list-item">
                <div class="list-item-header">
                  <span>${escapeHtml(b.name || "Unnamed bake")}</span>
                  <span class="list-item-meta">${escapeHtml(b.date || "")}</span>
                </div>
                ${
                  meta
                    ? `<div class="list-item-meta">${escapeHtml(meta)}</div>`
                    : ""
                }
                ${
                  ratingText
                    ? `<div class="list-item-meta">${escapeHtml(ratingText)}</div>`
                    : ""
                }
                ${
                  b.notes
                    ? `<div class="list-item-body">${escapeHtml(b.notes).replace(/\n/g, "<br>")}</div>`
                    : ""
                }
              </div>
            `;
          })
          .join("");
      }

      if (bakeSaveBtn) {
        bakeSaveBtn.addEventListener("click", () => {
          const name = (bakeNameInput && bakeNameInput.value.trim()) || "";
          const date = bakeDateInput && bakeDateInput.value;
          if (!name) {
            window.alert("Give this bake a name so you can find it later.");
            return;
          }

          const bake = {
            id: Date.now().toString(),
            name,
            date,
            starterId: bakeStarterSelect && bakeStarterSelect.value,
            doughWeight: bakeDoughWeightInput && bakeDoughWeightInput.value.trim(),
            hydration: bakeHydrationInput && bakeHydrationInput.value.trim(),
            saltPercent: bakeSaltPercentInput && bakeSaltPercentInput.value.trim(),
            levainPercent: bakeLevainPercentInput && bakeLevainPercentInput.value.trim(),
            ambientTemp: bakeAmbientTempInput && bakeAmbientTempInput.value.trim(),
            bulkHours: bakeBulkHoursInput && bakeBulkHoursInput.value.trim(),
            folds: bakeFoldsInput && bakeFoldsInput.value.trim(),
            foldMethod: bakeFoldMethodSelect && bakeFoldMethodSelect.value,
            bulkNotes: bakeBulkNotesInput && bakeBulkNotesInput.value.trim(),
            proofMethod: bakeProofMethodSelect && bakeProofMethodSelect.value,
            proofHours: bakeProofHoursInput && bakeProofHoursInput.value.trim(),
            proofTemp: bakeProofTempInput && bakeProofTempInput.value.trim(),
            vessel: bakeVesselSelect && bakeVesselSelect.value,
            preheatTemp: bakePreheatTempInput && bakePreheatTempInput.value.trim(),
            bakeTemp: bakeBakeTempInput && bakeBakeTempInput.value.trim(),
            coveredMinutes: bakeCoveredMinutesInput && bakeCoveredMinutesInput.value.trim(),
            uncoveredMinutes: bakeUncoveredMinutesInput && bakeUncoveredMinutesInput.value.trim(),
            steamMethod: bakeSteamMethodInput && bakeSteamMethodInput.value.trim(),
            bakeNotes: bakeBakeNotesInput && bakeBakeNotesInput.value.trim(),
            crumb: bakeCrumbInput && bakeCrumbInput.value.trim(),
            crust: bakeCrustInput && bakeCrustInput.value.trim(),
            sourness: bakeSournessInput && bakeSournessInput.value.trim(),
            overall: bakeOverallInput && bakeOverallInput.value.trim(),
            notes: bakeNotesInput && bakeNotesInput.value.trim(),
          };

          if (!Array.isArray(bakes)) bakes = [];
          bakes.push(bake);
          saveJSON(STORAGE_KEYS.bakes, bakes);
          renderBakes();

          // Light reset of core fields
          [
            bakeNameInput,
            bakeDateInput,
            bakeDoughWeightInput,
            bakeHydrationInput,
            bakeSaltPercentInput,
            bakeLevainPercentInput,
            bakeAmbientTempInput,
            bakeBulkHoursInput,
            bakeFoldsInput,
            bakeBulkNotesInput,
            bakeProofHoursInput,
            bakeProofTempInput,
            bakePreheatTempInput,
            bakeBakeTempInput,
            bakeCoveredMinutesInput,
            bakeUncoveredMinutesInput,
            bakeSteamMethodInput,
            bakeBakeNotesInput,
            bakeCrumbInput,
            bakeCrustInput,
            bakeSournessInput,
            bakeOverallInput,
            bakeNotesInput,
          ].forEach((el) => {
            if (el) el.value = "";
          });
        });
      }

      // ---------- Journal ----------
      let journalEntries = loadJSON(STORAGE_KEYS.journal, []);
      const journalTitleInput = document.getElementById("journalTitle");
      const journalDateInput = document.getElementById("journalDate");
      // Auto-populate journal date with today by default
      if (journalDateInput && !journalDateInput.value) {
        const today = new Date();
        const iso = today.toISOString().slice(0, 10); // YYYY-MM-DD
        journalDateInput.value = iso;
      }
      const journalStoryInput = document.getElementById("journalStory");
      const journalSaveBtn = document.getElementById("journalSaveBtn");
      const journalListEl = document.getElementById("journalList");

      function renderJournal() {
        if (!journalListEl) return;

        if (!Array.isArray(journalEntries)) journalEntries = [];

        if (!journalEntries.length) {
          journalListEl.className = "list-empty";
          journalListEl.textContent = "No entries yet. Start by saving one above.";
          return;
        }

        journalListEl.className = "list-items";
        journalListEl.innerHTML = journalEntries
          .slice()
          .reverse()
          .map((entry) => {
            return `
              <div class="list-item">
                <div class="list-item-header">
                  <span>${escapeHtml(entry.title || "Untitled entry")}</span>
                  <span class="list-item-meta">${escapeHtml(entry.date || "")}</span>
                </div>
                ${
                  entry.story
                    ? `<div class="list-item-body">${escapeHtml(entry.story).replace(/\n/g, "<br>")}</div>`
                    : ""
                }
              </div>
            `;
          })
          .join("");
      }

      if (journalSaveBtn) {
        journalSaveBtn.addEventListener("click", () => {
          const title = (journalTitleInput && journalTitleInput.value.trim()) || "";
          const date = journalDateInput && journalDateInput.value;
          const story = journalStoryInput && journalStoryInput.value.trim();

          if (!title && !story) {
            window.alert("Add at least a title or a story before saving.");
            return;
          }

          const entry = {
            id: Date.now().toString(),
            title,
            date,
            story,
          };

          if (!Array.isArray(journalEntries)) journalEntries = [];
          journalEntries.push(entry);
          saveJSON(STORAGE_KEYS.journal, journalEntries);
          renderJournal();

          if (journalTitleInput) journalTitleInput.value = "";
          if (journalDateInput) journalDateInput.value = "";
          if (journalStoryInput) journalStoryInput.value = "";
        });
      }

      // ---------- Family recipes ----------
      let familyRecipes = loadJSON(STORAGE_KEYS.family, []);
      const familyTitleInput = document.getElementById("familyTitle");
      const familyAttributionInput = document.getElementById("familyAttribution");
      const familyStoryInput = document.getElementById("familyStory");
      const familySaveBtn = document.getElementById("familySaveBtn");
      const familyListEl = document.getElementById("familyList");

      function renderFamilyRecipes() {
        if (!familyListEl) return;

        if (!Array.isArray(familyRecipes)) familyRecipes = [];

        if (!familyRecipes.length) {
          familyListEl.className = "list-empty";
          familyListEl.textContent = "No recipes saved yet. Add one above to pin it in place.";
          return;
        }

        familyListEl.className = "list-items";
        familyListEl.innerHTML = familyRecipes
          .slice()
          .reverse()
          .map((r) => {
            return `
              <div class="list-item">
                <div class="list-item-header">
                  <span>${escapeHtml(r.title || "Untitled recipe")}</span>
                  <span class="list-item-meta">${escapeHtml(r.attribution || "")}</span>
                </div>
                ${
                  r.story
                    ? `<div class="list-item-body">${escapeHtml(r.story).replace(/\n/g, "<br>")}</div>`
                    : ""
                }
              </div>
            `;
          })
          .join("");
      }

      if (familySaveBtn) {
        familySaveBtn.addEventListener("click", () => {
          const title = (familyTitleInput && familyTitleInput.value.trim()) || "";
          const attribution = familyAttributionInput && familyAttributionInput.value.trim();
          const story = familyStoryInput && familyStoryInput.value.trim();

          if (!title && !story) {
            window.alert("Add at least a name or some notes before saving.");
            return;
          }

          const recipe = {
            id: Date.now().toString(),
            title,
            attribution,
            story,
          };

          if (!Array.isArray(familyRecipes)) familyRecipes = [];
          familyRecipes.push(recipe);
          saveJSON(STORAGE_KEYS.family, familyRecipes);
          renderFamilyRecipes();

          if (familyTitleInput) familyTitleInput.value = "";
          if (familyAttributionInput) familyAttributionInput.value = "";
          if (familyStoryInput) familyStoryInput.value = "";
        });
      }

      // ---------- Initial renders ----------
      renderStarters();
      renderBakes();
      renderJournal();
      renderFamilyRecipes();
    })();
  
    