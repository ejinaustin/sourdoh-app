/* ===================== BEGIN: SDTimers UI (Global Modal + Floating Button) =====================
   Features:
   - Floating ⏱ button (bottom-right)
   - Modal listing active/paused timers
   - Go / Start / Pause / Reset / Remove controls
   - Sound toggle + volume slider + test chime
   - Live updates on tick/change/complete
   - Jump-to-section ("Go") using timer.meta.anchor + best-effort tab switch via timer.meta.page

   Notes:
   - Requires assets/js/timers.js loaded BEFORE this file.
   - Jump-to-section requires timers to be created with meta: { page: "...", anchor: "#someSelector" }
=============================================================================================== */

(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  function el(tag, attrs = {}, children = []) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === "class") n.className = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    });
    children.forEach((c) => n.appendChild(typeof c === "string" ? document.createTextNode(c) : c));
    return n;
  }

  function $(sel, root = document) { return root.querySelector(sel); }

  function ensureEngine() {
    if (!window.SDTimers) {
      console.warn("Timers UI: SDTimers not found. Ensure assets/js/timers.js is loaded first.");
      return false;
    }
    return true;
  }

  function injectCSSOnce() {
    if ($("#sdTimersUIStyles")) return;

    const css = `
/* --- SD Timers UI --- */
#sdTimersFab{
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 9999;
  border-radius: 999px;
  padding: 10px 12px;
  font-weight: 800;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(30,30,30,0.92);
  color: #fff;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
}
#sdTimersFab small{ opacity: 0.85; font-weight: 700; }

#sdTimersBackdrop{
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: none;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.55);
  padding: 18px;
}
#sdTimersBackdrop.is-open{ display: flex; }

#sdTimersModal{
  width: min(860px, 100%);
  max-height: min(78vh, 720px);
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.12);
  background: rgba(20,20,20,0.96);
  color: #fff;
  box-shadow: 0 18px 60px rgba(0,0,0,0.55);
}
#sdTimersModalHeader{
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
#sdTimersModalHeader h3{
  margin: 0;
  font-size: 16px;
  letter-spacing: 0.2px;
}
#sdTimersModalHeader .actions{
  display: flex;
  align-items: center;
  gap: 8px;
}

#sdTimersModalBody{
  padding: 14px 16px 16px;
  overflow: auto;
  max-height: calc(78vh - 64px);
}

.sdTimersSettings{
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  margin-bottom: 12px;
}
.sdTimersSettings label{
  display: inline-flex;
  gap: 8px;
  align-items: center;
  font-weight: 800;
  font-size: 13px;
  opacity: 0.95;
}
.sdTimersSettings input[type="range"]{ width: 150px; }

.sdTimersRow{
  display: grid;
  grid-template-columns: 1.25fr 0.9fr 0.9fr auto;
  gap: 10px;
  align-items: center;
  padding: 10px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.04);
  margin-bottom: 10px;
}
.sdTimersRow .label{
  font-weight: 900;
  line-height: 1.2;
}
.sdTimersRow .meta{
  opacity: 0.8;
  font-size: 12px;
  margin-top: 2px;
}
.sdTimersRow .time{
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  font-weight: 900;
  font-size: 14px;
}
.sdTimersRow .state{
  opacity: 0.85;
  font-weight: 900;
  font-size: 12px;
}

.sdTimersRow .btns{
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.sdTimersRow button{
  border-radius: 999px;
  padding: 8px 10px;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  color: #fff;
  font-weight: 900;
}
.sdTimersRow button:hover{ background: rgba(255,255,255,0.12); }

.sdTimersEmpty{
  opacity: 0.8;
  padding: 14px 10px;
  border: 1px dashed rgba(255,255,255,0.22);
  border-radius: 12px;
}

.sdTimersClose{
  border-radius: 999px;
  padding: 8px 10px;
  cursor: pointer;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  color: #fff;
  font-weight: 900;
}
.sdTimersClose:hover{ background: rgba(255,255,255,0.12); }

/* Flash highlight for Go-to-section */
.sdTimerFlash {
  outline: 3px solid rgba(255, 255, 255, 0.35);
  box-shadow: 0 0 0 6px rgba(255, 255, 255, 0.10);
  border-radius: 14px;
  transition: box-shadow 0.25s ease, outline 0.25s ease;
}
`;

    const style = document.createElement("style");
    style.id = "sdTimersUIStyles";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function buildUI() {
    // Floating button
    if (!$("#sdTimersFab")) {
      const fab = el("button", { id: "sdTimersFab", type: "button", title: "Open timers" }, [
        "⏱ ",
        el("small", {}, ["Timers"])
      ]);
      document.body.appendChild(fab);
    }

    // Modal
    if (!$("#sdTimersBackdrop")) {
      const backdrop = el("div", { id: "sdTimersBackdrop", "aria-hidden": "true" }, [
        el("div", { id: "sdTimersModal", role: "dialog", "aria-modal": "true", "aria-label": "Timers" }, [
          el("div", { id: "sdTimersModalHeader" }, [
            el("h3", {}, ["Active timers"]),
            el("div", { class: "actions" }, [
              el("button", { id: "sdTimersCloseBtn", class: "sdTimersClose", type: "button" }, ["✕"])
            ])
          ]),
          el("div", { id: "sdTimersModalBody" }, [
            el("div", { id: "sdTimersSettings", class: "sdTimersSettings" }),
            el("div", { id: "sdTimersList" })
          ])
        ])
      ]);

      document.body.appendChild(backdrop);
    }
  }

  function openModal() {
    const bd = $("#sdTimersBackdrop");
    if (!bd) return;
    bd.classList.add("is-open");
    bd.setAttribute("aria-hidden", "false");
    document.body.classList.add("sd-timers-open");
    render();
  }

  function closeModal() {
    const bd = $("#sdTimersBackdrop");
    if (!bd) return;
    bd.classList.remove("is-open");
    bd.setAttribute("aria-hidden", "true");
    document.body.classList.remove("sd-timers-open");
  }

  function renderSettings() {
    const host = $("#sdTimersSettings");
    if (!host) return;
    const s = SDTimers.settings.get();

    host.innerHTML = "";

    const soundToggle = el("label", {}, [
      el("input", {
        type: "checkbox",
        id: "sdTimersSoundEnabled",
        ...(s.soundEnabled ? { checked: "" } : {})
      }),
      "Sound"
    ]);

    const volWrap = el("label", {}, [
      "Volume",
      el("input", {
        type: "range",
        id: "sdTimersSoundVolume",
        min: "0",
        max: "1",
        step: "0.05",
        value: String(s.soundVolume ?? 0.35)
      })
    ]);

    const testBtn = el("button", { type: "button", id: "sdTimersTestChime" }, ["Test chime"]);

    host.appendChild(soundToggle);
    host.appendChild(volWrap);
    host.appendChild(testBtn);

    $("#sdTimersSoundEnabled")?.addEventListener("change", (e) => {
      SDTimers.settings.set({ soundEnabled: !!e.target.checked });
    });

    $("#sdTimersSoundVolume")?.addEventListener("input", (e) => {
      SDTimers.settings.set({ soundVolume: parseFloat(e.target.value) });
    });

    $("#sdTimersTestChime")?.addEventListener("click", () => {
      // Creates a tiny 1-second timer; chime plays on completion
      const id = "ui.test.chime";
      SDTimers.create(id, {
        label: "Chime test",
        type: "countdown",
        durationSec: 1,
        sound: SDTimers.settings.get().soundDefault || 1
      });
      SDTimers.reset(id);
      SDTimers.start(id);
    });
  }

  function bestEffortSwitchToPage(page) {
    if (!page) return;

    const selectors = [
      `#nav-${page}`, `#tab-${page}`,
      `[data-nav="${page}"]`, `[data-tab="${page}"]`,
      `button[data-target="${page}"]`, `a[data-target="${page}"]`,
      `button[data-section="${page}"]`, `a[data-section="${page}"]`,
      `button[data-page="${page}"]`, `a[data-page="${page}"]`,
      `button[data-route="${page}"]`, `a[data-route="${page}"]`
    ];

    const node = selectors.map(s => document.querySelector(s)).find(Boolean);
    if (node) node.click();
  }

  function flashElement(target) {
    const flashEl =
      target.closest?.(".card, .panel, .input-row, .section, .block") ||
      target;

    flashEl.classList.add("sdTimerFlash");
    setTimeout(() => flashEl.classList.remove("sdTimerFlash"), 1200);
  }

  function tryGoToTimer(timer) {
    const meta = timer?.meta || {};
    const anchor = meta.anchor;
    const page = meta.page;

    // Switch tab/section (best effort)
    if (page) bestEffortSwitchToPage(page);

    if (!anchor) return;

    // Let DOM update if the page/tab re-renders
    setTimeout(() => {
      const target = document.querySelector(anchor);
      if (!target) return;

      target.scrollIntoView({ behavior: "smooth", block: "center" });
      flashElement(target);
    }, 140);
  }

  function render() {
    if (!ensureEngine()) return;

    renderSettings();

    const listEl = $("#sdTimersList");
    if (!listEl) return;

    const timers = SDTimers.list()
      .filter(t => !t.isComplete) // active/paused only
      .sort((a, b) => {
        // Running first, then newest
        if (a.isRunning !== b.isRunning) return a.isRunning ? -1 : 1;
        return (b.createdAt || 0) - (a.createdAt || 0);
      });

    listEl.innerHTML = "";

    if (!timers.length) {
      listEl.appendChild(el("div", { class: "sdTimersEmpty" }, [
        "No active timers yet. Start one from Bakes and it’ll appear here."
      ]));
      return;
    }

    timers.forEach((t) => {
      const left = (t.type === "countdown") ? t.remainingLabel : t.elapsedLabel;
      const stateIcon = t.isRunning ? "▶" : "⏸";
      const stateText = t.isRunning ? "Running" : "Paused";

      const row = el("div", { class: "sdTimersRow", "data-id": t.id }, [
        el("div", {}, [
          el("div", { class: "label" }, [t.label]),
          el("div", { class: "meta" }, [t.id])
        ]),
        el("div", {}, [
          el("div", { class: "time" }, [left]),
          el("div", { class: "state" }, [`${stateIcon} ${stateText}`])
        ]),
        el("div", {}, [
          el("div", { class: "meta" }, [
            (t.type === "countdown")
              ? `Countdown • chime${t.sound || 1}`
              : `Elapsed • chime${t.sound || 1}`
          ]),
          el("div", { class: "meta" }, [
            (t.meta && (t.meta.page || t.meta.anchor))
              ? `Go: ${t.meta.page || "?"}${t.meta.anchor ? " " + t.meta.anchor : ""}`
              : "Go: (not linked)"
          ])
        ]),
        el("div", { class: "btns" }, [
          el("button", { type: "button", "data-act": "goto" }, ["Go"]),
          el("button", { type: "button", "data-act": t.isRunning ? "pause" : "start" }, [t.isRunning ? "Pause" : "Start"]),
          el("button", { type: "button", "data-act": "reset" }, ["Reset"]),
          el("button", { type: "button", "data-act": "remove" }, ["Remove"])
        ])
      ]);

      listEl.appendChild(row);
    });
  }

  function wireEvents() {
    // Open/close
    $("#sdTimersFab")?.addEventListener("click", openModal);
    $("#sdTimersCloseBtn")?.addEventListener("click", closeModal);

    const backdrop = $("#sdTimersBackdrop");
    backdrop?.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("#sdTimersBackdrop")?.classList.contains("is-open")) closeModal();
    });

    // Delegated actions inside list
    document.addEventListener("click", (e) => {
      const btn = e.target.closest("#sdTimersList button[data-act]");
      if (!btn) return;

      if (!ensureEngine()) return;

      const row = btn.closest(".sdTimersRow");
      const id = row?.getAttribute("data-id");
      const act = btn.getAttribute("data-act");
      if (!id || !act) return;

      e.preventDefault();

      if (act === "goto") {
        const t = SDTimers.getTimer(id);
        closeModal();
        if (t) tryGoToTimer(t);
        return;
      }

      if (act === "start") SDTimers.start(id);
      if (act === "pause") SDTimers.pause(id);
      if (act === "reset") SDTimers.reset(id);
      if (act === "remove") SDTimers.remove(id);

      render();
    });

    // Live updates + FAB badge updates
    if (ensureEngine()) {
      SDTimers.on("tick", () => {
        if ($("#sdTimersBackdrop")?.classList.contains("is-open")) render();
        updateFab();
      });
      SDTimers.on("change", () => {
        if ($("#sdTimersBackdrop")?.classList.contains("is-open")) render();
        updateFab();
      });
      SDTimers.on("complete", () => {
        if ($("#sdTimersBackdrop")?.classList.contains("is-open")) render();
        updateFab();
      });
      SDTimers.on("settings", () => {
        if ($("#sdTimersBackdrop")?.classList.contains("is-open")) renderSettings();
      });
    }
  }

  function updateFab() {
    const fab = $("#sdTimersFab");
    if (!fab || !ensureEngine()) return;

    const active = SDTimers.getActive().filter(t => t && !t.isComplete);
    const running = active.filter(t => t.isRunning);
    const count = active.length;

    fab.innerHTML = `⏱ <small>Timers${count ? ` (${count})` : ""}${running.length ? " • ▶" : ""}</small>`;
  }

  ready(function () {
    injectCSSOnce();
    buildUI();
    wireEvents();
    updateFab();
  });

  // Expose open/close so you can hook this to nav/footer later if you want
  window.SDTimersUI = { open: openModal, close: closeModal };
})();

/* ===================== END: SDTimers UI (Global Modal + Floating Button) ===================== */
