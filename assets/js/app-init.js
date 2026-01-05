"use strict";

// ---------- Initial renders (guarded) ----------
try { renderStarters(); } catch (e) { console.error("renderStarters failed", e); }
try { renderBakes(); } catch (e) { console.error("renderBakes failed", e); }
try { renderJournal(); } catch (e) { console.error("renderJournal failed", e); }
try { renderFamilyRecipes(); } catch (e) { console.error("renderFamilyRecipes failed", e); }

// ===================== BEGIN: FLOW GUIDE MODAL =====================

(() => {
  const modal = document.getElementById('flowModal');
  if (!modal) return; // safety guard if markup not present

  const closeBtn   = document.getElementById('flowModalClose');
  const timelineEl = document.getElementById('flowTimeline');
  const clearBtn   = document.getElementById('flowTimelineClear');

  const tabs   = Array.from(modal.querySelectorAll('[data-flow-tab]'));
  const panels = Array.from(modal.querySelectorAll('[data-flow-panel]'));

  const starterForm = document.getElementById('flowStarterForm');
  const bulkForm    = document.getElementById('flowBulkForm');
  const bakeForm    = document.getElementById('flowBakeForm');

  const STORAGE_KEY = 'sourdoh_flow_timeline_v1';
  const STATE_KEY   = 'sourdoh_flow_state_v1';

  function loadTimeline() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch (_) {
      // non-fatal
    }
  }

  let timeline = loadTimeline();
  let flowState = loadState() || {
    hasActiveFlow: false,
    lastCategory: null,
    lastStage: null,
    lastTab: 'starter'
  };

  function saveTimeline() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timeline));
    } catch (_) {
      // non-fatal
    }
  }

  function formatTimestamp(ts) {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return '';
      return d.toLocaleString(undefined, {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return '';
    }
  }

  function renderTimeline() {
    if (!timelineEl) return;

    if (!timeline.length) {
      timelineEl.innerHTML = '<p class="flow-timeline-empty">No events yet. Log starter, dough/bulk, or proof/bake checkpoints and they’ll show up here in order.</p>';
      return;
    }

    const items = timeline
      .slice()
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      .map(evt => {
        const ts = formatTimestamp(evt.createdAt);
        const catLabel =
          evt.category === 'starter' ? 'Starter' :
          evt.category === 'bulk'    ? 'Dough & bulk' :
          evt.category === 'bake'    ? 'Proof & bake' :
          'Step';

        const tempText = evt.temp ? `<span class="flow-timeline-temp">${evt.temp}</span>` : '';
        const notesText = evt.notes ? `<div class="flow-timeline-notes">${evt.notes}</div>` : '';

        return `
          <article class="flow-timeline-item">
            <header class="flow-timeline-header">
              <span class="flow-timeline-cat">${catLabel}</span>
              ${ts ? `<span class="flow-timeline-time">${ts}</span>` : ''}
            </header>
            <div class="flow-timeline-stage">${evt.stage || ''}</div>
            ${tempText}
            ${notesText}
          </article>
        `;
      })
      .join('');

    timelineEl.innerHTML = items;
  }

  function switchTab(id) {
    const safeId = id || 'starter';

    tabs.forEach(tab => {
      const tabId = tab.getAttribute('data-flow-tab');
      tab.classList.toggle('is-active', tabId === safeId);
    });
    panels.forEach(panel => {
      const panelId = panel.getAttribute('data-flow-panel');
      panel.classList.toggle('is-active', panelId === safeId);
    });

    // remember last tab
    flowState.lastTab = safeId;
    saveState(flowState);
  }

    // ---------- Core helper: add an event into the flow timeline ----------
    function addEvent(category, stage, temp, notes) {
    const evt = {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        createdAt: Date.now(),
        category,
        stage: stage || "",
        temp: temp || "",
        notes: notes || "",
    };
    timeline.push(evt);
    saveTimeline();

    // update flow state
    flowState.hasActiveFlow = true;
    flowState.lastCategory = category;
    flowState.lastStage = stage || "";

    // tie tab to category when appropriate
    if (category === "starter") flowState.lastTab = "starter";
    if (category === "bulk") flowState.lastTab = "bulk";
    if (category === "bake") flowState.lastTab = "bake";
    saveState(flowState);

    renderTimeline();
    }

    // ---------- Expose to the rest of the app ----------
    // Other modules (Starter Lab, Planner, Bakes) can call this
    // to keep the Flow Guide timeline in sync with real actions.
    if (typeof window !== "undefined") {
    window.sourdohAddFlowEvent = function (category, stage, temp, notes) {
        try {
        addEvent(category, stage, temp, notes);
        } catch (err) {
        // Non-fatal: we never want this to break the main flows
        console.warn("sourdohAddFlowEvent failed:", err);
        }
    };
    }


    function openModal() {
    modal.classList.add("is-open");
    document.body.classList.add("flow-modal-open");

    // On open, if there is an active flow and timeline, auto-resume from last stage
    if (flowState.hasActiveFlow && timeline.length && flowState.lastStage) {
      const catLabel =
        flowState.lastCategory === "starter"
          ? "Starter"
          : flowState.lastCategory === "bulk"
          ? "Dough & bulk"
          : flowState.lastCategory === "bake"
          ? "Proof & bake"
          : "Step";

      // Default to last tab if we have one, otherwise Starter
      switchTab(flowState.lastTab || "starter");

      // Render existing timeline
      renderTimeline();

      // Branded Sour D’oh! message instead of browser confirm
      if (typeof openTipModal === "function") {
        openTipModal("Flow guide – resuming", [
          "Resuming from your last logged flow.",
          "",
          `${catLabel}: ${flowState.lastStage}`,
          "",
          "Your previous starter → bulk → bake timeline has been restored.",
          "If you’d rather start from scratch, use the “Clear timeline” button to wipe this flow and begin a new one from the Starter tab."
        ]);
      }
    } else {
      // No active flow: start fresh on Starter tab
      switchTab(flowState.lastTab || "starter");
      renderTimeline();
    }
  }


  function closeModal() {
    modal.classList.remove('is-open');
    document.body.classList.remove('flow-modal-open');
  }

    // 🔗 Wire up Flow Guide triggers (use ID and explicit data-attribute only)
    const triggers = Array.from(
    document.querySelectorAll('#flowGuideTrigger, [data-flow-guide-trigger="true"]')
    );


  triggers.forEach(btn => {
    btn.addEventListener('click', (evt) => {
      evt.preventDefault();

      // Scroll the underlying page to the top first
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Small delay so the scroll can start before we pop the modal
      setTimeout(openModal, 250);
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeModal();
      // we do NOT clear anything here; flowState + timeline stay so they can resume later
    });
  }

  modal.addEventListener('click', (evt) => {
    if (evt.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (evt) => {
    if (evt.key === 'Escape' && modal.classList.contains('is-open')) {
      closeModal();
    }
  });

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const id = tab.getAttribute('data-flow-tab');
      if (!id) return;
      switchTab(id);
    });
  });

  // ----- Starter form: includes auto-advance when "Mature starter" is logged -----
  if (starterForm) {
    starterForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const stageInput = starterForm.querySelector('input[name="starterStage"]:checked');
      const tempInput  = starterForm.querySelector('input[name="starterTemp"]');
      const notesInput = starterForm.querySelector('textarea[name="starterNotes"]');

      const stage = stageInput ? stageInput.value : '';
      const temp  = tempInput ? tempInput.value.trim() : '';
      const notes = notesInput ? notesInput.value.trim() : '';

           if (!stage) {
        openTipModal("Flow guide – starter", [
          "Choose where you are in the starter timeline first.",
          "",
          "Pick the option that best matches your starter right now (just fed, peaking, mature, etc.), then log the temperature and any notes."
        ]);
        return;
      }


      addEvent('starter', stage, temp, notes);
      starterForm.reset();

      // If the baker logs "Mature starter", move them into the dough/bulk step
            if (/Mature starter/i.test(stage)) {
        openTipModal("Starter logged as mature", [
          "Nice! Your starter is logged as mature.",
          "",
          "The guide will move you to Step 2 so you can start tracking your dough mix and bulk fermentation."
        ]);
        switchTab("bulk");
      }

    });
  }

  // ----- Bulk / dough form -----
  if (bulkForm) {
    bulkForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const stageInput = bulkForm.querySelector('input[name="bulkStage"]:checked');
      const tempInput  = bulkForm.querySelector('input[name="bulkTemp"]');
      const notesInput = bulkForm.querySelector('textarea[name="bulkNotes"]');

      const stage = stageInput ? stageInput.value : '';
      const temp  = tempInput ? tempInput.value.trim() : '';
      const notes = notesInput ? notesInput.value.trim() : '';

        if (!stage) {
        openTipModal("Flow guide – dough & bulk", [
          "Choose where you are in the dough / bulk process.",
          "",
          "Select the step that matches what you’re doing (mixing, early bulk, mid bulk, end of bulk) before logging temperature and notes."
        ]);
        return;
      }

      addEvent('bulk', stage, temp, notes);
      bulkForm.reset();

      // If they log "End of bulk", move them into Step 3 (proof & bake)
            if (/End of bulk/i.test(stage)) {
        openTipModal("End of bulk logged", [
          "End of bulk logged – nice.",
          "",
          "The guide will move you to Step 3 so you can track proofing and the bake."
        ]);
        switchTab("bake");
      }

    });
  }

  // ----- Bake form -----
  if (bakeForm) {
    bakeForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const stageInput = bakeForm.querySelector('input[name="bakeStage"]:checked');
      const tempInput  = bakeForm.querySelector('input[name="bakeTemp"]');
      const notesInput = bakeForm.querySelector('textarea[name="bakeNotes"]');

      const stage = stageInput ? stageInput.value : '';
      const temp  = tempInput ? tempInput.value.trim() : '';
      const notes = notesInput ? notesInput.value.trim() : '';

            if (!stage) {
        openTipModal("Flow guide – proof & bake", [
          "Choose where you are in proofing / baking.",
          "",
          "Pick the step that fits best (cold proof, room-temp proof, preheat, bake, etc.) before saving your notes."
        ]);
        return;
      }


      addEvent('bake', stage, temp, notes);
      bakeForm.reset();
    });
  }

  // ----- Clear timeline -----
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (!timeline.length) return;
      const ok = confirm('Clear the current flow timeline? This only affects this browser.');
      if (!ok) return;
      timeline = [];
      saveTimeline();
      flowState = {
        hasActiveFlow: false,
        lastCategory: null,
        lastStage: null,
        lastTab: 'starter'
      };
      saveState(flowState);
      renderTimeline();
    });
  }

  // Initial view: use lastTab if there is state, otherwise starter
  switchTab(flowState.lastTab || 'starter');
  renderTimeline();
})();

// ===================== END: FLOW GUIDE MODAL =====================

// ===================== BEGIN: FAQ MODAL =====================
(() => {
  const modal = document.getElementById('faqModal');
  if (!modal) return;

  const closeBtn = document.getElementById('faqModalClose');

  const triggers = Array.from(
    document.querySelectorAll('#faqGuideTrigger, .faq-guide-btn, [data-faq-trigger="true"]')
  );

  function openFaqModal() {
    modal.classList.add('is-open');
    document.body.classList.add('faq-modal-open');
  }

  function closeFaqModal() {
    modal.classList.remove('is-open');
    document.body.classList.remove('faq-modal-open');
  }

  // Open from Learn section button + footer button
  triggers.forEach(btn => {
    btn.addEventListener('click', (evt) => {
      evt.preventDefault?.();

      // Scroll to top so the modal feels anchored
      window.scrollTo({ top: 0, behavior: 'smooth' });

      setTimeout(openFaqModal, 250);
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      closeFaqModal();
    });
  }

  // Click backdrop to close
  modal.addEventListener('click', (evt) => {
    if (evt.target === modal) {
      closeFaqModal();
    }
  });

  // ESC key closes when open
  document.addEventListener('keydown', (evt) => {
    if (evt.key === 'Escape' && modal.classList.contains('is-open')) {
      closeFaqModal();
    }
  });

  // Accordion behavior
  const headers = Array.from(modal.querySelectorAll('.faq-accordion-header'));

  headers.forEach(header => {
    header.addEventListener('click', () => {
      const panel = header.nextElementSibling;
      if (!panel) return;

      const section = header.closest('.faq-section');
      const isOpen = header.classList.contains('is-open');

      // Close all in this section
      if (section) {
        section.querySelectorAll('.faq-accordion-header').forEach(h => h.classList.remove('is-open'));
        section.querySelectorAll('.faq-accordion-panel').forEach(p => {
          p.style.maxHeight = null;
        });
      }

      // Re-open the clicked one if it was closed
      if (!isOpen) {
        header.classList.add('is-open');
        panel.style.maxHeight = panel.scrollHeight + 'px';
      }
    });
  });

  // Open first question by default
  const firstHeader = modal.querySelector('.faq-accordion-header');
  if (firstHeader && firstHeader.nextElementSibling) {
    firstHeader.classList.add('is-open');
    const firstPanel = firstHeader.nextElementSibling;
    firstPanel.style.maxHeight = firstPanel.scrollHeight + 'px';
  }
})();
// ===================== END: FAQ MODAL =====================

// ===================== BEGIN: STARTER LOG PRINT BUTTON =====================
(() => {
  const printBtn = document.getElementById('printStarterLogBtn');
  if (!printBtn) return; // safety guard

  printBtn.addEventListener('click', (e) => {
    e.preventDefault();

    // Make sure the Starter Lab section is active (helps visually pre-print)
    const starterSection = document.getElementById('section-starterLab');
    if (starterSection) {
      starterSection.classList.add('app-section-active');
    }

    // Trigger browser print – CSS @media print will swap to the log layout
    window.print();
  });
})();
// ===================== END: STARTER LOG PRINT BUTTON =====================

// ===================== BEGIN: BETA FEEDBACK MODAL =====================
(() => {
  const openBtn = document.getElementById("inlineFeedbackOpenBtn");
  const modal   = document.getElementById("betaFeedbackModal");
  if (!modal || !openBtn) return;

  const closeBtn = document.getElementById("betaFeedbackCloseBtn");

  function openModal() {
    modal.classList.add("is-open");
    document.body.classList.add("beta-feedback-open");
  }

  function closeModal() {
    modal.classList.remove("is-open");
    document.body.classList.remove("beta-feedback-open");
  }

  openBtn.addEventListener("click", (e) => {
    e.preventDefault();
    openModal();
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  // Click backdrop to close
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // ESC to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });
})();
// ===================== END: BETA FEEDBACK MODAL =====================


// ===================== BEGIN: BAKE REPORT MODAL LOGIC =====================
(() => {
  const modal      = document.getElementById("bakeReportModal");
  const closeBtn   = document.getElementById("bakeReportCloseBtn");
  const contentEl  = document.getElementById("bakeReportContent");
  const graphCanvas = document.getElementById("bakeReportGraph");
  const titleEl    = document.getElementById("bakeReportTitle");

  if (!modal || !contentEl) return; // safety guard – only runs on main app page

  function parseTimeSafe(iso) {
    if (!iso) return null;
    const t = Date.parse(iso);
    return Number.isFinite(t) ? t : null;
  }

  function loadSafe(key, fallback) {
    try {
      return loadJSON(key, fallback);
    } catch (err) {
      console.warn("Bake report load failed for key", key, err);
      return fallback;
    }
  }

  function buildBakeReport(bakeId) {
    if (!bakeId) return null;

    // Core collections
    const allBakes   = loadSafe(STORAGE_KEYS.bakes, []);
    const starters   = loadSafe(STORAGE_KEYS.starters, []);
    const feeds      = loadSafe(STORAGE_KEYS.feeds, []);
    const flowEvents = loadSafe("sourdoh_flow_timeline_v1", []);

    const bake = Array.isArray(allBakes)
      ? allBakes.find((b) => b && String(b.id) === String(bakeId))
      : null;

    if (!bake) return null;

    const bakeTimeMs = parseTimeSafe(bake.timestamp) ?? Date.now();
    const sessionStart = bakeTimeMs - 36 * 60 * 60 * 1000; // 36h before
    const sessionEnd   = bakeTimeMs +  6 * 60 * 60 * 1000; // 6h after

    const starter = Array.isArray(starters)
      ? starters.find((s) => s && s.id === bake.starterId)
      : null;

    const starterFeeds = Array.isArray(feeds)
      ? feeds
          .filter((f) => {
            if (!f || f.starterId !== bake.starterId || !f.timestamp) return false;
            const t = parseTimeSafe(f.timestamp);
            return t !== null && t >= sessionStart && t <= sessionEnd;
          })
          .sort((a, b) => {
            const at = parseTimeSafe(a.timestamp) ?? 0;
            const bt = parseTimeSafe(b.timestamp) ?? 0;
            return at - bt;
          })
      : [];

    const flowInWindow = Array.isArray(flowEvents)
      ? flowEvents
          .filter((evt) => {
            if (!evt || typeof evt.createdAt !== "number") return false;
            return evt.createdAt >= sessionStart && evt.createdAt <= sessionEnd;
          })
          .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
      : [];

    const flowByCategory = {
      starter: flowInWindow.filter((e) => e.category === "starter"),
      bulk:    flowInWindow.filter((e) => e.category === "bulk"),
      bake:    flowInWindow.filter((e) => e.category === "bake"),
    };

    return {
      bake,
      starter,
      starterFeeds,
      flowByCategory,
      allFlowEvents: flowInWindow,
    };
  }

  function formatDateLabel(bake) {
    if (!bake) return "";
    if (bake.date) return bake.date;
    if (bake.timestamp) {
      try {
        const d = new Date(bake.timestamp);
        return d.toLocaleString();
      } catch {
        return String(bake.timestamp);
      }
    }
    return "";
  }

  function escapeHtmlLite(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderBakeReport(report) {
    const { bake, starter, starterFeeds, flowByCategory, allFlowEvents } = report;

    if (!bake) {
      contentEl.innerHTML = `<p>Could not build a report for this bake.</p>`;
      return;
    }

    const name = bake.name || "Unnamed bake";
    const dateLabel = formatDateLabel(bake);

    if (titleEl) {
      titleEl.textContent = `Bake report – ${name}`;
    }

    // Rating bits
    const ratingBits = [];
    if (bake.overall)  ratingBits.push(`Overall ${bake.overall}/10`);
    if (bake.crumb)    ratingBits.push(`Crumb ${bake.crumb}/10`);
    if (bake.crust)    ratingBits.push(`Crust ${bake.crust}/10`);
    if (bake.sourness) ratingBits.push(`Sourness ${bake.sourness}/10`);

    const metaBits = [];
    if (starter && starter.name) metaBits.push(`Starter: ${starter.name}`);
    if (bake.doughWeight)        metaBits.push(`Dough: ${bake.doughWeight} g`);
    if (typeof bake.hydration !== "undefined" && bake.hydration !== "")
      metaBits.push(`Hydration: ${bake.hydration}%`);
    if (bake.saltPercent)
      metaBits.push(`Salt: ${bake.saltPercent}% of flour`);
    if (bake.ovenTemp)
      metaBits.push(`Oven: ${bake.ovenTemp}°`);

    // Starter feeds HTML
    let starterFeedsHtml = `<p style="font-size:0.85rem;color:#9ca3af;">No Starter Lab feeds were logged in the 36 hours before this bake.</p>`;
    if (starterFeeds && starterFeeds.length) {
      starterFeedsHtml = `
        <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.35rem;font-size:0.85rem;">
          ${starterFeeds
            .map((f) => {
              const ts = f.timestamp
                ? new Date(f.timestamp).toLocaleString()
                : "Unknown time";
              const bits = [];

              if (f.ratio)     bits.push(`Feed ${escapeHtmlLite(f.ratio)}`);
              if (f.temp)      bits.push(`@ ${escapeHtmlLite(f.temp)}`);
              if (f.peakHours) bits.push(`Peak in ${escapeHtmlLite(f.peakHours)}h`);

              const line = bits.join(" · ");
              const notes = f.notes ? `<div style="color:#9ca3af;">${escapeHtmlLite(f.notes)}</div>` : "";

              return `
                <li>
                  <div style="color:#e5e7eb;">${escapeHtmlLite(ts)}</div>
                  <div>${line || "Feed recorded"}</div>
                  ${notes}
                </li>
              `;
            })
            .join("")}
        </ul>
      `;
    }

    // Flow timeline HTML
    function renderFlowSection(label, events) {
      if (!events || !events.length) {
        return `
          <section>
            <h3 style="font-size:0.9rem;margin-bottom:0.25rem;">${label}</h3>
            <p style="font-size:0.8rem;color:#9ca3af;">No flow events recorded for this phase in this bake’s window.</p>
          </section>
        `;
      }

      return `
        <section>
          <h3 style="font-size:0.9rem;margin-bottom:0.25rem;">${label}</h3>
          <ul style="list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:0.35rem;font-size:0.85rem;">
            ${events
              .map((evt) => {
                const t = evt.createdAt ? new Date(evt.createdAt).toLocaleString() : "Unknown time";
                const tempPart = evt.temp ? ` · ${escapeHtmlLite(evt.temp)}` : "";
                const notes = evt.notes
                  ? `<div style="color:#9ca3af;">${escapeHtmlLite(evt.notes)}</div>`
                  : "";
                return `
                  <li>
                    <div style="color:#e5e7eb;">${escapeHtmlLite(t)}</div>
                    <div>${escapeHtmlLite(evt.stage || "Event")}${tempPart}</div>
                    ${notes}
                  </li>
                `;
              })
              .join("")}
          </ul>
        </section>
      `;
    }

    const flowHtml = `
      <div style="display:flex;flex-direction:column;gap:0.75rem;">
        ${renderFlowSection("Starter phase (Flow Guide)", flowByCategory.starter)}
        ${renderFlowSection("Bulk & folds (Flow Guide)", flowByCategory.bulk)}
        ${renderFlowSection("Proof & bake (Flow Guide)", flowByCategory.bake)}
      </div>
    `;

    // Build final HTML
    contentEl.innerHTML = `
      <section style="font-size:0.9rem;display:flex;flex-direction:column;gap:0.35rem;">
        <div style="font-size:0.85rem;color:#9ca3af;">${escapeHtmlLite(dateLabel)}</div>
        <div style="font-weight:600;">${escapeHtmlLite(name)}</div>
        ${
          metaBits.length
            ? `<div style="font-size:0.85rem;color:#cbd5f5;">${metaBits
                .map(escapeHtmlLite)
                .join(" · ")}</div>`
            : ""
        }
        ${
          ratingBits.length
            ? `<div style="font-size:0.85rem;color:#fbbf24;">${ratingBits
                .map(escapeHtmlLite)
                .join(" · ")}</div>`
            : ""
        }
        ${
          bake.notes
            ? `<div style="margin-top:0.35rem;font-size:0.85rem;">${escapeHtmlLite(bake.notes)
                .replace(/\n/g, "<br>")}</div>`
            : ""
        }
      </section>

      <section style="border-top:1px solid rgba(148,163,184,0.4);padding-top:0.75rem;">
        <h3 style="font-size:0.9rem;margin-bottom:0.25rem;">Starter activity before this bake</h3>
        ${starterFeedsHtml}
      </section>

      <section style="border-top:1px solid rgba(148,163,184,0.4);padding-top:0.75rem;">
        ${flowHtml}
      </section>
    `;

    // Draw graph from flow events (temps only)
    drawBakeReportGraph(allFlowEvents);
  }

  function drawBakeReportGraph(events) {
    if (!graphCanvas) return;

    const ctx = graphCanvas.getContext("2d");
    const width  = graphCanvas.width;
    const height = graphCanvas.height;

    ctx.clearRect(0, 0, width, height);

    if (!Array.isArray(events) || !events.length) return;

    const tempPoints = events
      .filter((e) => e && e.temp && typeof e.createdAt === "number")
      .map((e) => {
        const y = parseFloat(String(e.temp).replace(/[^\d.-]/g, ""));
        return {
          t: e.createdAt,
          y: Number.isFinite(y) ? y : null,
        };
      })
      .filter((p) => p.y !== null);

    if (!tempPoints.length) return;

    tempPoints.sort((a, b) => a.t - b.t);

    const t0 = tempPoints[0].t;
    const xs = tempPoints.map((p) => (p.t - t0) / (60 * 60 * 1000)); // hours since first reading
    const ys = tempPoints.map((p) => p.y);

    const minX = 0;
    const maxX = xs[xs.length - 1] || 1;
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);

    if (!Number.isFinite(minY) || !Number.isFinite(maxY)) return;
    if (minY === maxY) {
      minY -= 1;
      maxY += 1;
    }

    function xToPx(x) {
      if (maxX === minX) return 0;
      return ((x - minX) / (maxX - minX)) * (width - 40) + 20;
    }

    function yToPx(y) {
      if (maxY === minY) return height / 2;
      const norm = (y - minY) / (maxY - minY);
      return height - 20 - norm * (height - 40);
    }

    // Axis baseline
    ctx.strokeStyle = "rgba(148,163,184,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, height - 20);
    ctx.lineTo(width - 20, height - 20);
    ctx.stroke();

    // Line
    ctx.strokeStyle = "#fbbf24";
    ctx.lineWidth = 2;
    ctx.beginPath();
    xs.forEach((x, i) => {
      const px = xToPx(x);
      const py = yToPx(ys[i]);
      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    });
    ctx.stroke();

    // Points
    ctx.fillStyle = "#fde68a";
    xs.forEach((x, i) => {
      const px = xToPx(x);
      const py = yToPx(ys[i]);
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function openModal() {
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("bake-report-open");
  }

  function closeModal() {
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("bake-report-open");
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      closeModal();
    });
  }

  // Click backdrop to close
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // ESC to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) {
      closeModal();
    }
  });

  // Global click delegation for "View bake report" buttons
  document.addEventListener("click", (evt) => {
    const btn = evt.target.closest("[data-bake-report-id]");
    if (!btn) return;

    const bakeId = btn.getAttribute("data-bake-report-id");
    if (!bakeId) return;

    const report = buildBakeReport(bakeId);
    if (!report) {
      window.alert("Could not build a report for this bake yet.");
      return;
    }

    renderBakeReport(report);
    openModal();
  });
})();
// ===================== END: BAKE REPORT MODAL LOGIC =====================

// ===================== BEGIN: BAKE REPORT PRINT BUTTON =====================
(() => {
  const printBtn = document.getElementById("printBakeReportBtn");
  if (!printBtn) return; // safety guard

  printBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const body = document.body;

    // Make sure the Bakes section is active and visible before printing
    const bakesSection = document.getElementById("section-bakes");
    if (bakesSection) {
      bakesSection.classList.add("app-section-active");
    }

    // Flag that we want a Bakes-focused print layout
    if (body) {
      body.classList.add("print-bakes-mode");
    }

    // Give the browser a moment to apply styles, then print
    setTimeout(() => {
      window.print();
      // Clean up the flag afterwards so normal view is restored
      if (body) {
        body.classList.remove("print-bakes-mode");
      }
    }, 50);
  });
})();
// ===================== END: BAKE REPORT PRINT BUTTON =====================


// ===================== BEGIN: SETTINGS DEBUG PANEL (TEMP) =====================
(() => {
  const panel   = document.getElementById("settingsDebug");
  const pre     = document.getElementById("settingsDebugPre");
  const hideBtn = document.getElementById("settingsDebugHideBtn");
  if (!panel || !pre) return;

  const qs = new URLSearchParams(window.location.search);
  const debugForced = qs.get("debug") === "1" || qs.get("debug") === "true";

  // Safer key lookup
  const KEY_UNITS = (window.STORAGE_KEYS && window.STORAGE_KEYS.units) || "sourdoh.units";
  const KEY_MODE  = (window.STORAGE_KEYS && window.STORAGE_KEYS.mode)  || "sourdoh.mode";

  function safeParse(jsonStr) {
    try { return JSON.parse(jsonStr); } catch { return null; }
  }

  function isSettingsActive() {
    const sec = document.getElementById("section-settings");
    return !!(sec && sec.classList.contains("app-section-active"));
  }

  function byIdChecked(id) {
    const el = document.getElementById(id);
    return !!(el && el.checked);
  }

  function readUIState() {
    return {
      weightUnits: {
        grams:  byIdChecked("weightUnitsGrams"),
        ounces: byIdChecked("weightUnitsOunces"),
      },
      tempUnits: {
        celsius:    byIdChecked("tempUnitsCelsius"),
        fahrenheit: byIdChecked("tempUnitsFahrenheit"),
      },
      volumeUnits: {
        ml:   byIdChecked("volumeUnitsMl"),
        floz: byIdChecked("volumeUnitsFloz"), // if you add this radio later
      },
    };
  }

  function readStorageState() {
    return {
      unitsRaw: localStorage.getItem(KEY_UNITS),
      units: safeParse(localStorage.getItem(KEY_UNITS)),
      modeRaw: localStorage.getItem(KEY_MODE),
    };
  }

  function readPageState() {
    return {
      bodyDataUnits: document.body.getAttribute("data-units"),
      bodyDataset: { ...document.body.dataset },
      url: window.location.href,
    };
  }

  function normalizeUnits(u) {
    // what we WANT to see in storage
    const out = Object.assign({ weight: "g", temp: "c", volume: "ml" }, (u && typeof u === "object") ? u : {});
    out.weight = out.weight === "oz" ? "oz" : "g";
    out.temp   = out.temp === "f"  ? "f"  : "c";
    out.volume = out.volume === "floz" ? "floz" : "ml";
    return out;
  }

  function render() {
    const visible = debugForced || isSettingsActive();
    panel.hidden = !visible;
    if (!visible) return;

    const storage = readStorageState();
    const ui = readUIState();
    const page = readPageState();

    // If your units manager exists, show what the app thinks (super useful)
    const appUnits =
      (window.SDUnits && typeof window.SDUnits.get === "function")
        ? window.SDUnits.get()
        : null;

    // Direct read (bypasses any helper/key confusion)
    const directUnitsRaw = localStorage.getItem("sourdoh.units");
    const directUnits = safeParse(directUnitsRaw) || {};

    const unitsNormalized = normalizeUnits(storage.units);

    const hasUnits =
      storage.units && typeof storage.units === "object" && Object.keys(storage.units).length > 0;

    const modePretty = (() => {
      const raw = storage.modeRaw;
      if (!raw) return "(none)";
      // modeRaw is typically a JSON string like "\"beginner\""
      const parsed = safeParse(raw);
      return parsed || raw;
    })();

    const lines = [];

    // Header
    lines.push(`Sour D’oh! Debug — current settings`);
    lines.push(`Updated: ${new Date().toLocaleString()}`);
    lines.push(`URL: ${page.url}`);
    lines.push("");

    // Mode
    lines.push("MODE");
    lines.push(`• mode (raw): ${storage.modeRaw || "(none)"}`);
    lines.push(`• mode (pretty): ${modePretty}`);
    lines.push("");

    // Units (storage + normalized)
    lines.push("UNITS (storage)");
    lines.push(`• key: ${KEY_UNITS}`);
    lines.push(`• raw: ${storage.unitsRaw || "(none)"}`);
    lines.push(`• parsed: ${storage.units ? JSON.stringify(storage.units) : "(none)"}`);
    lines.push(`• normalized: ${JSON.stringify(unitsNormalized)}`);
    lines.push("");

    // Units (direct)
    lines.push("UNITS (direct read)");
    lines.push(`• localStorage.getItem("sourdoh.units"): ${directUnitsRaw || "(none)"}`);
    lines.push(`• parsed: ${Object.keys(directUnits).length ? JSON.stringify(directUnits) : "(empty object)"}`);
    lines.push("");

    // UI radios
    lines.push("UI (settings page radios)");
    lines.push(
      `• weight: grams=${ui.weightUnits.grams ? "✅" : "—"}  ounces=${ui.weightUnits.ounces ? "✅" : "—"}`
    );
    lines.push(
      `• temp:   celsius=${ui.tempUnits.celsius ? "✅" : "—"}  fahrenheit=${ui.tempUnits.fahrenheit ? "✅" : "—"}`
    );
    lines.push(
      `• volume: ml=${ui.volumeUnits.ml ? "✅" : "—"}  floz=${ui.volumeUnits.floz ? "✅" : "—"}`
    );
    lines.push("");

    // App manager view
    lines.push("APP (SDUnits manager)");
    lines.push(
      `• unitsFromManager: ${appUnits ? JSON.stringify(appUnits) : "(not available)"}`
    );
    lines.push("");

    // Page dataset
    lines.push("PAGE (body dataset)");
    lines.push(`• data-units: ${page.bodyDataUnits || "(none)"}`);
    lines.push(`• dataset: ${JSON.stringify(page.bodyDataset, null, 2)}`);
    lines.push("");

    // Status note
    lines.push("STATUS");
    lines.push(
      hasUnits
        ? "✅ Units exist in storage."
        : "⚠️ Units are empty/missing in storage. This is why you see {} — nothing is being saved yet."
    );

    pre.textContent = lines.join("\n");
  }

  if (hideBtn) {
    hideBtn.addEventListener("click", () => {
      panel.hidden = true;
    });
  }

  document.addEventListener("change", (e) => {
    const t = e.target;
    if (!t) return;
    if (t.closest && t.closest("#section-settings")) render();
  });

  window.addEventListener("storage", render);

  let lastActive = null;
  setInterval(() => {
    const active = isSettingsActive();
    if (active !== lastActive) {
      lastActive = active;
      render();
    }
  }, 400);

  render();

})();
// ===================== END: SETTINGS DEBUG PANEL (TEMP) =====================
