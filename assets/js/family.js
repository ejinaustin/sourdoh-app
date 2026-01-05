"use strict";

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
