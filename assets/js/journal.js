"use strict";

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
