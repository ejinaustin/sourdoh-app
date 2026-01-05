"use strict";

// Always-available references
// const bodyEl = document.body;

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

      const feedStarterHydrationInput = document.getElementById("feedStarterHydration");
      const feedFlourInput = document.getElementById("feedFlour");
      const feedWaterInput = document.getElementById("feedWater");
      const feedRatioInput = document.getElementById("feedRatio");
      const feedTempInput = document.getElementById("feedTemp");
      const feedPeakHoursInput = document.getElementById("feedPeakTime");
      const feedNotesInput = document.getElementById("feedNotes");
      const feedSaveBtn = document.getElementById("feedSaveBtn");
      const peakHours = feedPeakHoursInput && feedPeakHoursInput.value.trim();


      const starterExpectationsBtn = document.getElementById("starterExpectationsBtn");
      const starterExpectationsCard = document.getElementById("starterExpectationsCard");


      // ===================== BEGIN: HTML ESCAPERS (FALLBACK SAFE) =====================
// IMPORTANT: utils.js already defines a global `escapeHtmlSafe()` function.
// Declaring `const escapeHtml = ...` here causes a global redeclare SyntaxError.
// So we alias to a DIFFERENT name that won't collide.
const escapeHtmlSafe =
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

// Safe for attribute values (we use double quotes in attributes)
const escapeAttrSafe =
  (typeof window !== "undefined" && typeof window.escapeAttr === "function")
    ? window.escapeAttr
    : function (value) {
        return String(value ?? "")
          .replace(/&/g, "&amp;")
          .replace(/"/g, "&quot;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
      };
// ===================== END: HTML ESCAPERS (FALLBACK SAFE) =====================

// ===================== BEGIN: STARTER EDIT/DELETE HELPERS + PLANNER SYNC EVENT =====================
            function notifyStartersChanged() {
            // Lets Planner refresh starter dropdowns without tight coupling
            window.dispatchEvent(new Event("sourdoh:starterschange"));
            }

            function findStarterIndexById(id) {
            if (!Array.isArray(starters)) starters = [];
            return starters.findIndex(s => String(s.id) === String(id));
            }

            function saveStartersAndRefresh() {
            saveJSON(STORAGE_KEYS.starters, starters);
            notifyStartersChanged();
            renderStarters();
            }

            // ===================== END: STARTER EDIT/DELETE HELPERS + PLANNER SYNC EVENT =====================

        // ===================== BEGIN: STARTER LAB LANGUAGE (BEGINNER / EXPERT) =====================
        function getBakerModeSafe() {
        // Primary source of truth: localStorage
        const raw = (localStorage.getItem("sourdoh.mode") || "").toLowerCase();
        if (raw === "expert" || raw === "beginner") return raw;

        // Fallback: if SDMode exists, use it
        const sd = window.SDMode;
        if (sd && typeof sd.get === "function") return sd.get();

        return "beginner";
        }

        function applyStarterLanguage(mode) {
        // (Optional) subtitle if you have it
        const subtitle = document.getElementById("starterSubtitle");

        // Your actual starter name input id is "starterName"
        const nameInput = document.getElementById("starterName");

        // Label text for the starter name field (if your HTML uses <label for="starterName">)
        const nameLabel = document.querySelector('label[for="starterName"]');

        // Any headings that literally contain the word "Starter"
        const starterLabTitle = document.getElementById("starterLabTitle"); // only if you add it later

        if (mode === "expert") {
            if (subtitle) subtitle.textContent = "Maintain and track your levain culture.";
            if (nameInput) nameInput.placeholder = "Levain name (optional)";
            if (nameLabel) nameLabel.textContent = "Levain name";
            if (starterLabTitle) starterLabTitle.textContent = "Levain Lab";
        } else {
            if (subtitle) subtitle.textContent = "Create and care for your sourdough starter.";
            if (nameInput) nameInput.placeholder = "Give your starter a name";
            if (nameLabel) nameLabel.textContent = "Starter name";
            if (starterLabTitle) starterLabTitle.textContent = "Starter Lab";
        }
        }

        // Apply immediately
        applyStarterLanguage(getBakerModeSafe());

        // React to global mode changes
        window.addEventListener("sourdoh:modechange", (e) => {
        applyStarterLanguage((e && e.detail) || getBakerModeSafe());
        });
        // ===================== END: STARTER LAB LANGUAGE (BEGINNER / EXPERT) =====================
           
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
            // Which temp unit are we showing in feed history?
            const tempUnit =
            bodyEl && bodyEl.getAttribute("data-temp-units") === "F" ? "°F" : "°C";

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
                    const ratioText = f.ratio ? ` · ${escapeHtmlSafe(f.ratio)}` : "";

                    const tempUnitLabel =
                        bodyEl && bodyEl.getAttribute("data-temp-units") === "F" ? "°F" : "°C";
                    const tempText = f.temp ? ` · ${escapeHtmlSafe(f.temp)}${tempUnitLabel}` : "";

                    const peakText = f.peakHours ? ` · peak ~${escapeHtmlSafe(f.peakHours)}h` : "";

                    const notesText = f.notes
                        ? `<div class="feed-history-notes">${escapeHtmlSafe(f.notes).replace(/\n/g, "<br>")}</div>`
                        : "";
                    return `
                        <div class="feed-history-item">
                        <div class="feed-history-meta">${escapeHtmlSafe(when)}${ratioText}${tempText}${peakText}</div>
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

                // ===================== BEGIN: STARTER ITEM ACTION BUTTONS (EDIT/DELETE) =====================
                const actionsHtml = `
                <div class="pill-row" style="display:flex; gap:0.5rem; align-items:center; margin-top:0.4rem;">
                    <button type="button" class="mini-btn" data-starter-action="edit" data-starter-id="${escapeAttrSafe(s.id || "")}">
                    Edit
                    </button>
                    <button type="button" class="mini-btn danger" data-starter-action="delete" data-starter-id="${escapeAttrSafe(s.id || "")}">
                    Delete
                    </button>
                </div>
                `;
                // ===================== END: STARTER ITEM ACTION BUTTONS (EDIT/DELETE) =====================

                return `
                <div class="list-item">
                    <div class="list-item-header">
                    <span>${escapeHtmlSafe(s.name || "Unnamed starter")}</span>
                    <span class="list-item-meta">${escapeHtmlSafe(s.originDate || "")}</span>
                    </div>

                    <div class="list-item-meta">
                    Hydration: ${s.hydration != null && s.hydration !== "" ? escapeHtmlSafe(String(s.hydration)) + "%" : "–"} • Flour:
                    ${escapeHtmlSafe(s.flour || "–")}
                    </div>

                    ${actionsHtml}

                    ${
                    s.notes
                        ? `<div class="list-item-body">${escapeHtmlSafe(s.notes).replace(/\n/g, "<br>")}</div>`
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
                .map((s) => `<option value="${escapeAttrSafe(s.id || "")}">${escapeAttrSafe(s.name || "")}</option>`)
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
                .map((s) => `<option value="${escapeAttrSafe(s.id || "")}">${escapeAttrSafe(s.name || "")}</option>`)
                .join("");
            } else {
            bakeStarterSelect.innerHTML = base;
            }
        }
        }
            // Expose for app-init.js and other modules
            window.renderStarters = renderStarters;

        // ===================== BEGIN: STARTER LIST ACTION HANDLER (EDIT/DELETE) =====================
        if (starterListEl) {
        starterListEl.addEventListener("click", (evt) => {
            const btn = evt.target && evt.target.closest
            ? evt.target.closest("[data-starter-action][data-starter-id]")
            : null;
            if (!btn) return;

            const action = btn.getAttribute("data-starter-action");
            const id = btn.getAttribute("data-starter-id");
            if (!action || !id) return;

            const idx = (typeof findStarterIndexById === "function") ? findStarterIndexById(id) : -1;
            if (idx < 0) {
            window.alert("Could not find that starter. It may have been deleted.");
            return;
            }

            // DELETE
            if (action === "delete") {
            const name = starters[idx]?.name || "this starter";
            const ok = window.confirm(`Delete "${name}"? This cannot be undone.`);
            if (!ok) return;

            starters.splice(idx, 1);

            // If the deleted starter is currently selected for Planner, clear it
            try {
                const plannerKey = "sourdoh.planner.selectedStarterId";
                if (localStorage.getItem(plannerKey) === String(id)) {
                localStorage.setItem(plannerKey, "");
                }
            } catch (e) {}

            if (typeof saveStartersAndRefresh === "function") {
                saveStartersAndRefresh(); // saves + notifyStartersChanged + renderStarters
            } else {
                saveJSON(STORAGE_KEYS.starters, starters);
                if (typeof notifyStartersChanged === "function") notifyStartersChanged();
                renderStarters();
            }
            return;
            }

            // EDIT
            if (action === "edit") {
            const s = starters[idx];

            const nextName = window.prompt("Starter name:", s.name || "");
            if (nextName === null) return;
            const nameTrim = String(nextName).trim();
            if (!nameTrim) {
                window.alert("Name cannot be blank.");
                return;
            }

            const nextHyd = window.prompt("Hydration % (e.g. 100):", (s.hydration ?? "").toString());
            if (nextHyd === null) return;

            const nextFlour = window.prompt("Flour type (optional):", (s.flour ?? "").toString());
            if (nextFlour === null) return;

            const nextOrigin = window.prompt("Origin date (YYYY-MM-DD, optional):", (s.originDate ?? "").toString());
            if (nextOrigin === null) return;

            const nextNotes = window.prompt("Notes (optional):", (s.notes ?? "").toString());
            if (nextNotes === null) return;

            starters[idx] = {
                ...s,
                name: nameTrim,
                hydration: String(nextHyd).trim(),
                flour: String(nextFlour).trim(),
                originDate: String(nextOrigin).trim(),
                notes: String(nextNotes).trim(),
            };

            if (typeof saveStartersAndRefresh === "function") {
                saveStartersAndRefresh();
            } else {
                saveJSON(STORAGE_KEYS.starters, starters);
                if (typeof notifyStartersChanged === "function") notifyStartersChanged();
                renderStarters();
            }
            return;
            }
        });
        }
        // ===================== END: STARTER LIST ACTION HANDLER (EDIT/DELETE) =====================

        if (starterSaveBtn) {
        starterSaveBtn.addEventListener("click", () => {
            const name = (starterNameInput && starterNameInput.value.trim()) || "";
            if (!name) {
            window.alert("Give your starter a name first.");
            return;
            }

            const hydration = starterHydrationInput ? parseFloat(starterHydrationInput.value) : null;
            const flour = starterFlourInput && starterFlourInput.value.trim();
            const originDate = starterOriginInput && starterOriginInput.value;
            const notes = starterNotesInput && starterNotesInput.value.trim();

            const starter = {
            id: Date.now().toString(),
            name,
            hydration,
            flour,
            originDate,
            notes,
            };

            if (!Array.isArray(starters)) starters = [];
            starters.push(starter);

            // Save + refresh + notify Planner
            if (typeof saveStartersAndRefresh === "function") {
            saveStartersAndRefresh();
            } else {
            saveJSON(STORAGE_KEYS.starters, starters);
            if (typeof notifyStartersChanged === "function") notifyStartersChanged();
            renderStarters();
            }

            if (starterNameInput) starterNameInput.value = "";
            if (starterHydrationInput) starterHydrationInput.value = "";
            if (starterFlourInput) starterFlourInput.value = "";
            if (starterOriginInput) starterOriginInput.value = "";
            if (starterNotesInput) starterNotesInput.value = "";
        });
        }

    // ===================== BEGIN: FEED SAVE HANDLER =====================
    if (feedSaveBtn) {
    feedSaveBtn.addEventListener("click", () => {
        const starterId = feedStarterSelect && feedStarterSelect.value;
        if (!starterId) {
        window.alert("Choose which starter you fed.");
        return;
        }

        const hydration = feedStarterHydrationInput && feedStarterHydrationInput.value.trim();
        const flour = feedFlourInput && feedFlourInput.value.trim();
        const water = feedWaterInput && feedWaterInput.value.trim();
        const ratio = feedRatioInput && feedRatioInput.value.trim();
        const temp = feedTempInput && feedTempInput.value.trim();
        const peakHours = feedPeakHoursInput && feedPeakHoursInput.value.trim();
        const notes = feedNotesInput && feedNotesInput.value.trim();

        const feed = {
        id: Date.now().toString(),
        starterId,
        hydration,
        flour,
        water,
        ratio,
        temp,
        peakHours,
        notes,
        timestamp: new Date().toISOString(),
        };

        if (!Array.isArray(feeds)) feeds = [];
        feeds.push(feed);
        saveJSON(STORAGE_KEYS.feeds, feeds);

        // ---------- Mirror into Flow Guide timeline (if available) ----------
        if (typeof window !== "undefined" && typeof window.sourdohAddFlowEvent === "function") {
        // Try to resolve starter name for nicer text
        let starterName = "starter";
        if (Array.isArray(starters)) {
            const s = starters.find((st) => st.id === starterId);
            if (s && s.name) starterName = s.name;
        }

        const labelBase = `Fed starter: ${starterName}`;
        const stageText = ratio ? `${labelBase} (${ratio})` : labelBase;
        const tempText = temp || "";
        const combinedNotes = notes || "";

        window.sourdohAddFlowEvent("starter", stageText, tempText, combinedNotes);
        }

        // Clear inputs
        if (feedStarterHydrationInput) feedStarterHydrationInput.value = "";
        if (feedFlourInput) feedFlourInput.value = "";
        if (feedWaterInput) feedWaterInput.value = "";
        if (feedRatioInput) feedRatioInput.value = "";
        if (feedTempInput) feedTempInput.value = "";
        if (feedPeakHoursInput) feedPeakHoursInput.value = "";
        if (feedNotesInput) feedNotesInput.value = "";
    });
    }
    // ===================== END: FEED SAVE HANDLER =====================

// ===================== BEGIN: DEEP SCIENCE TOGGLES (ROBUST) =====================

// Helper: force display with !important so CSS can't block it
function setDisplayImportant(el, value) {
  if (!el) return;
  el.style.setProperty("display", value, "important");
}

function wireDeepScienceBlock(block) {
  if (!block) return;

  const header = block.querySelector(".deep-science-header");
  const body   = block.querySelector(".deep-science-body");
  const icon   = block.querySelector(".deep-science-toggle-icon");

  if (!header || !body) return;

  // Start collapsed
  body.classList.remove("open");
  setDisplayImportant(body, "none");
  header.setAttribute("role", "button");
  header.setAttribute("tabindex", "0");
  header.setAttribute("aria-expanded", "false");
  if (icon) icon.textContent = "▼";

  function toggle() {
    const isOpen = body.classList.contains("open");
    body.classList.toggle("open", !isOpen);
    setDisplayImportant(body, isOpen ? "none" : "block");
    header.setAttribute("aria-expanded", String(!isOpen));
    if (icon) icon.textContent = isOpen ? "▼" : "▲";
  }

  // Click anywhere in the header (including the arrow)
  header.addEventListener("click", (e) => {
    e.preventDefault();
    toggle();
  });

  // Keyboard support (Enter/Space)
  header.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });
}

// Expectations card blocks
document.querySelectorAll(".deep-science-block").forEach(wireDeepScienceBlock);

// Standalone bottom-of-page block (if present)
const standaloneDeepScience = document.getElementById("starterDeepScience");
if (standaloneDeepScience) wireDeepScienceBlock(standaloneDeepScience);

// ===================== END: DEEP SCIENCE TOGGLES (ROBUST) =====================


// ===================== BEGIN: STARTER NAME GENERATOR =====================
(function () {
  "use strict";

    // ---- DOM HOOKS ----
    // IMPORTANT: this matches <input id="starterName"> in Starter Lab
    const starterNameInput       = document.getElementById("starterName");
    const starterNameRandomBtn   = document.getElementById("starterNameRandomBtn");
    const starterNameSuggestions = document.getElementById("starterNameSuggestions");

    // Modal + "arcade" UI
    const starterNameModal        = document.getElementById("starterNameModal");
    const starterNameModalClose   = document.getElementById("starterNameModalClose");
    const starterNameModalOpeners = Array.from(
    document.querySelectorAll("[data-starter-name-modal-open='true']")
    );
    const starterNameWheelDisplay = document.getElementById("starterNameWheelDisplay");
    const starterNameSpinBtn      = document.getElementById("starterNameSpinBtn");

    // If the main input is missing, bail early (nothing else makes sense)
    if (!starterNameInput) {
    return;
    }


  // Audio hooks
  const starterWheelTickSound = document.getElementById("starterWheelTickSound");
  const starterWheelRiffSound = document.getElementById("starterWheelRiffSound");

  // If the main input is missing, don't bother wiring anything
  if (!starterNameInput) return;

  // ---- CURATED STARTER NAME LIST ----
  // Add as many as you like; this is your chaos corner.
  const STARTER_NAME_POOL = [
    // Art / genius puns
    "Leonardough da Vinci",
    "Vincent Van Dough",
    "Dough Vinci",
    "Michelangelough",
    "Crumb Monet",
    "Pablo Picrusto",
    "Edgar Allan Dough",
    "Claude Doughnet",
    "Frida Kahlough",
    "Bready Mercury",
    "Freddie Yeastcury",

    // Celebs & characters
    "Doughy Parton",
    "Bread Pitt",
    "Jane Dough",
    "Doughn Draper",
    "Gandalf the Grain",
    "Obi-Wan Crustnobi",
    "Darth Baker",
    "Princess Ryea",
    "Lord of the Crumbs",
    "Crustopher Robin",
    "Bubba Fett",
    "Wheata Franklin",
    "Doughlor Swift",
    "Moist Malone",
    "Crumb Solo",
    "Chew-bacca",
    "Knead Sheeran",

    // Yeast / fermentation puns
    "Yeast of Eden",
    "Yeast Mode",
    "The Yeast Whisperer",
    "Yeastie Boys",
    "Yeaster Bunny",
    "Rise Against",
    "The One Who Rises",
    "Leaven Las Vegas",
    "Leavenly Father",
    "Starter McStarterson",
    "The Wild Yeast West",
    "Leaven on a Prayer",
    "Agent Ferment",

    // Bread / dough / crust puns
    "Sir Rise-a-Lot",
    "Glutenous Maximus",
    "Gluten Goblin",
    "Glutenny Kravitz",
    "Crustopher Columbus",
    "Crust Crusader",
    "Captain Crumb",
    "Mother Loaf",
    "Flour Child",
    "Flour Power Ranger",
    "The Dough Reaper",
    "Doughrah the Explorer",
    "Kneady Baby",
    "Starterella",
    "Bubbly McBubbleface",
    "Loaf Vader",
    "Return of the Breadi",
    "Rise Skybaker",

    // Completely unhinged / fun
    "Bubbles the Destroyer",
    "Big Mama Bubbles",
    "Bubble O’Seven",
    "Rise-a-saurus Rex",
    "Captain Leavenhook",
    "Puffy Daddy",
    "The Bubbler",
    "Dough You Love Me?",
    "Sourduna Matata",
    "Sourdough Samurai",
    "BakeZilla",
    "Fermento Prime",
    "Doughmantor",
    "Doughlius Caesar",
    "Doughphine",
    "Grain Gretzky",
    "Sticky Stardust",
    "Flourentine",
    "Wonderbread Woman",
    "Crumb Daddy",
    "Yeast Beast",
    "Loaf Goddess",

    // A little Ed / 3LD / vibes
    "Zen and the Art of Fermentation",
    "Trip the Drippy Starter",
    "Three-Legged Leavener",
    "Crumb of the Litter",
    "Pawsitively Proofed",
    "Austin Powers: International Loaf of Mystery",
    "Keep Austin Crusty",
    "Lady Leaven of Austin",
    "Kenny Loggins (to the Danger Loaf)"
  ];

      const STARTER_FIRST_PARTS = [
    "Doughy",
    "Crusty",
    "Bubbly",
    "Yeasty",
    "Stretch",
    "Floury",
    "Toasty",
    "Gooey",
    "Rustic",
    "Sparky",
    "Zesty",
    "Sunny",
    "Moony",
    "Cloudy",
    "Spunky",
    "Saucy",
    "Cheeky",
    "Lucky",
    "Tiny",
    "Chunky",
    "Loafy",
    "Crumb",
    "Sprout",
    "Wild",
    "Fizzy",
    "Tangy",
    "Softy",
    "Bold",
    "Brisk",
    "Feisty",
    "Cozy",
    "Snug",
    "Nerdy",
    "Wizard",
    "Captain",
    "Major",
    "Doctor",
    "Professor",
    "Sir",
    "Lady",
    "Dame",
    "Count",
    "Duke",
    "Baron",
    "Squire",
    "Boss",
    "Chief",
    "Ranger",
    "Scout"
  ];

  const STARTER_LAST_PARTS = [
    "McBubbles",
    "O\u2019Crumb",
    "Yeastwood",
    "Starterson",
    "Leavenworth",
    "Crustington",
    "Doughsworth",
    "Flourchild",
    "Breadly",
    "Panadero",
    "Loafington",
    "Fermento",
    "Wildling",
    "Bakerston",
    "Hoochworth",
    "Tangwell",
    "Risenstein",
    "Flourmont",
    "Boulefort",
    "Cobblestone",
    "Sunrise",
    "Moonrise",
    "Morningstar",
    "Nightfall",
    "Oakheart",
    "Pinecrest",
    "Riverstone",
    "Cloudfall",
    "Stormrise",
    "Brightcrumb",
    "Deepcrust",
    "Oldfield",
    "Newfield",
    "Goldcrust",
    "Silvercrumb",
    "Rustbrook",
    "Stonewell",
    "Warmheart",
    "Goodbread",
    "Fireside",
    "Hearthstone",
    "Fieldstone",
    "Meadowrise",
    "Evercrust",
    "Softcrumb",
    "Speltshire",
    "Ryecrest",
    "Barleywood",
    "Oatmont"
  ];


  const SUGGESTION_COUNT = 5;

  // ---- HELPERS ----

  function getRandomInt(max) {
    return Math.floor(Math.random() * max);
  }

   function pickRandomName() {
    const haveCombos =
      Array.isArray(STARTER_FIRST_PARTS) && STARTER_FIRST_PARTS.length &&
      Array.isArray(STARTER_LAST_PARTS)  && STARTER_LAST_PARTS.length;

    // ~50% chance to build a first + last combo
    const useCombo = haveCombos && Math.random() < 0.5;

    if (useCombo) {
      const first = STARTER_FIRST_PARTS[getRandomInt(STARTER_FIRST_PARTS.length)];
      const last  = STARTER_LAST_PARTS[getRandomInt(STARTER_LAST_PARTS.length)];
      return `${first} ${last}`;
    }

    // Otherwise, pull from the original curated pool
    if (!STARTER_NAME_POOL.length) return "My First Starter";
    const idx = getRandomInt(STARTER_NAME_POOL.length);
    return STARTER_NAME_POOL[idx];
  }

  function getRandomSuggestions(count) {
    const pool = [...STARTER_NAME_POOL];
    const picked = [];
    const limit = Math.min(count, pool.length);

    for (let i = 0; i < limit; i++) {
      const idx = getRandomInt(pool.length);
      picked.push(pool[idx]);
      pool.splice(idx, 1);
    }
    return picked;
  }

  function applyStarterName(name) {
    if (!name) return;
    starterNameInput.value = name;
    starterNameInput.dispatchEvent(new Event("input", { bubbles: true }));
    starterNameInput.focus();
  }

  function renderStarterSuggestions() {
    if (!starterNameSuggestions) return;

    const suggestions = getRandomSuggestions(SUGGESTION_COUNT);

    if (!suggestions.length) {
      starterNameSuggestions.innerHTML =
        `<p class="starter-name-empty">No suggestions available.</p>`;
      return;
    }

    const buttonsHtml = suggestions
      .map(
        (name) => `
        <button type="button"
          class="starter-name-suggestion-btn soft-btn"
          data-starter-name="${name.replace(/"/g, "&quot;")}"
        >
          ${name}
        </button>`
      )
      .join("");

    starterNameSuggestions.innerHTML = `
      <p class="starter-name-help-text">
        Click a name to adopt it:
      </p>
      <div class="starter-name-suggestion-list">
        ${buttonsHtml}
      </div>
      <button type="button" class="starter-name-clear-suggestions-btn ghost-btn">
        ✖ Clear list
      </button>
    `;
  }

  function handleSuggestionsClick(event) {
    if (!starterNameSuggestions) return;
    const target = event.target;

    if (target.classList.contains("starter-name-suggestion-btn")) {
      const name =
        target.getAttribute("data-starter-name") ||
        target.textContent.trim();
      if (name) applyStarterName(name);
      return;
    }

    if (target.classList.contains("starter-name-clear-suggestions-btn")) {
      starterNameSuggestions.innerHTML = "";
    }
  }

  // ---- MODAL HELPERS ----

  function openStarterNameModal() {
    if (!starterNameModal) return;
    starterNameModal.classList.add("is-open");
    document.body.classList.add("starter-name-modal-open");

    if (starterNameWheelDisplay) {
      const current = starterNameInput.value.trim() || pickRandomName();
      starterNameWheelDisplay.textContent = current;
    }
  }

  function closeStarterNameModal() {
    if (!starterNameModal) return;
    starterNameModal.classList.remove("is-open");
    document.body.classList.remove("starter-name-modal-open");
  }

  let spinTimer = null;

  function playTickSound() {
    if (!starterWheelTickSound) return;
    try {
      starterWheelTickSound.currentTime = 0;
      starterWheelTickSound.play().catch(() => {});
    } catch (_) {}
  }

  function stopTickSound() {
    if (!starterWheelTickSound) return;
    try {
      starterWheelTickSound.pause();
      starterWheelTickSound.currentTime = 0;
    } catch (_) {}
  }

  function playRiffSound() {
    if (!starterWheelRiffSound) return;
    try {
      starterWheelRiffSound.currentTime = 0;
      starterWheelRiffSound.play().catch(() => {});
    } catch (_) {}
  }

  function spinStarterNameWheel() {
    if (!starterNameWheelDisplay || spinTimer) return;

    // Reset any previous finishing/crit classes
    starterNameWheelDisplay.classList.remove(
      "starter-name-wheel-spinning",
      "starter-name-wheel-final",
      "starter-name-wheel-crit"
    );

        // Small chance of a dramatic "critical success"
        const isCritRoll = Math.random() < 0.20; // 20%

        let frames = 18; // how many "ticks" before we stop

        starterNameWheelDisplay.classList.add("starter-name-wheel-spinning");
        playTickSound();

        spinTimer = setInterval(() => {
        const name = pickRandomName();
        starterNameWheelDisplay.textContent = name;
        frames -= 1;

        if (frames <= 0) {
            clearInterval(spinTimer);
            spinTimer = null;

            // Stop spin animation + ticking sound
            starterNameWheelDisplay.classList.remove("starter-name-wheel-spinning");
            stopTickSound();
            playRiffSound();

            // Apply visual "hit" and maybe "critical" state
            starterNameWheelDisplay.classList.add("starter-name-wheel-final");

            if (isCritRoll) {
            starterNameWheelDisplay.classList.add("starter-name-wheel-crit");

            // ---- CRIT BANNER ----
            const critBanner = document.getElementById("starterCritBanner");
            if (critBanner) {
                critBanner.classList.add("show");
                setTimeout(() => critBanner.classList.remove("show"), 1400);
            }
            }

            // Lock in the final name into the real Starter Lab input
            applyStarterName(starterNameWheelDisplay.textContent.trim());

            // Optionally remove the final pulse after a short delay
            setTimeout(() => {
            starterNameWheelDisplay.classList.remove("starter-name-wheel-final");
            }, 700);
        }
        }, 80);

  }

  // ---- EVENT WIRING ----

  // Auto-fill once if empty
  if (!starterNameInput.value.trim()) {
    applyStarterName(pickRandomName());
  }

  // Roll again button
  if (starterNameRandomBtn) {
    starterNameRandomBtn.addEventListener("click", (evt) => {
      evt.preventDefault();
      applyStarterName(pickRandomName());
    });
  }

  // Suggestions click handling
  if (starterNameSuggestions) {
    starterNameSuggestions.addEventListener("click", handleSuggestionsClick);
    renderStarterSuggestions();
  }

  // Modal openers
  if (starterNameModal && starterNameModalOpeners.length) {
    starterNameModalOpeners.forEach((btn) => {
      btn.addEventListener("click", (evt) => {
        evt.preventDefault();
        openStarterNameModal();
      });
    });
  }

  // Modal close button
  if (starterNameModal && starterNameModalClose) {
    starterNameModalClose.addEventListener("click", (evt) => {
      evt.preventDefault();
      closeStarterNameModal();
    });
  }

  // Click on backdrop closes modal
  if (starterNameModal) {
    starterNameModal.addEventListener("click", (evt) => {
      if (evt.target === starterNameModal) {
        closeStarterNameModal();
      }
    });
  }

  // ESC key closes modal
  document.addEventListener("keydown", (evt) => {
    if (
      evt.key === "Escape" &&
      starterNameModal &&
      starterNameModal.classList.contains("is-open")
    ) {
      closeStarterNameModal();
    }
  });

  // Spin button inside modal
  if (starterNameSpinBtn) {
    starterNameSpinBtn.addEventListener("click", (evt) => {
      evt.preventDefault();
      spinStarterNameWheel();
    });
  }
})();
// ===================== END: STARTER NAME GENERATOR =====================
// ===================== BEGIN: DEEP SCIENCE (DELEGATED TOGGLE - ALWAYS WORKS) =====================
(function () {
  "use strict";

  function setDisplayImportant(el, value) {
    if (!el) return;
    el.style.setProperty("display", value, "important");
  }

  function toggleDeepScience(headerEl) {
    const block = headerEl.closest(".deep-science-block");
    if (!block) return;

    const body = block.querySelector(".deep-science-body");
    const icon = block.querySelector(".deep-science-toggle-icon");
    if (!body) return;

    const isOpen = body.classList.contains("open");

    body.classList.toggle("open", !isOpen);
    setDisplayImportant(body, isOpen ? "none" : "block");

    headerEl.setAttribute("aria-expanded", String(!isOpen));
    if (icon) icon.textContent = isOpen ? "▼" : "▲";
  }

  // Make headers feel clickable even if CSS forgot
  function ensureHeaderUX(headerEl) {
    try {
      headerEl.style.setProperty("cursor", "pointer", "important");
      headerEl.style.setProperty("pointer-events", "auto", "important");
    } catch (_) {}
    headerEl.setAttribute("role", "button");
    headerEl.setAttribute("tabindex", "0");
    if (!headerEl.hasAttribute("aria-expanded")) headerEl.setAttribute("aria-expanded", "false");
  }

  // One listener for ALL deep-science headers (survives re-renders)
  document.addEventListener("click", (e) => {
    const header = e.target.closest(".deep-science-header");
    if (!header) return;

    // Optional: only affect the Starter Lab deep science section
    // If you want ALL deep-science blocks site-wide, delete the next 3 lines.
    const parent = header.closest("#starterDeepScience, #starterLab, #starterTab");
    if (!parent) return;

    e.preventDefault();
    ensureHeaderUX(header);
    toggleDeepScience(header);
  });

  // Keyboard support
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const header = document.activeElement && document.activeElement.closest
      ? document.activeElement.closest(".deep-science-header")
      : null;
    if (!header) return;

    const parent = header.closest("#starterDeepScience, #starterLab, #starterTab");
    if (!parent) return;

    e.preventDefault();
    ensureHeaderUX(header);
    toggleDeepScience(header);
  });

  // Force initial collapsed state (also survives CSS “display:none !important”)
  document.querySelectorAll("#starterDeepScience .deep-science-body").forEach((body) => {
    body.classList.remove("open");
    setDisplayImportant(body, "none");
  });
})();
// ===================== END: DEEP SCIENCE (DELEGATED TOGGLE - ALWAYS WORKS) =====================
