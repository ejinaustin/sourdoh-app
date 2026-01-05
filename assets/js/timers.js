/* ===================== BEGIN: SDTimers (Global Multi-Timer Engine + Chimes) =====================
   Supports:
   - Multiple concurrent timers
   - Countdown + elapsed modes
   - Persist/resume across refresh via localStorage
   - Soft chime on completion (chime1-4)
   - Simple modal UI helpers (optional)
=============================================================================================== */
console.log("SDTimers file loaded");

(function () {
  "use strict";

  const STORAGE_KEY = "sourdoh.timers.v1";
  const SETTINGS_KEY = "sourdoh.timers.settings.v1";

  const DEFAULT_SETTINGS = {
    soundEnabled: true,
    soundVolume: 0.35,     // soft by default
    soundDefault: 1,       // chime1.mp3
    useRandomChime: false, // later optional
  };

  // Your declared sound paths
  const CHIME_PATHS = {
    1: "assets/sounds/chime1.mp3",
    2: "assets/sounds/chime2.mp3",
    3: "assets/sounds/chime3.mp3",
    4: "assets/sounds/chime4.mp3",
  };

  // In-memory runtime
  let timers = {};       // { [id]: Timer }
  let tickHandle = null; // setInterval handle
  let listeners = new Map(); // event listeners per event name

  function nowMs() {
    return Date.now();
  }

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function loadSettings() {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(safeParse(raw, {}) || {}) };
  }

  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  function loadTimers() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return safeParse(raw, {});
  }

  function saveTimers() {
    // Persist only what we need
    const toSave = {};
    for (const [id, t] of Object.entries(timers)) {
      toSave[id] = {
        id: t.id,
        label: t.label,
        type: t.type,                 // "countdown" | "elapsed"
        durationSec: t.durationSec,   // for countdown
        sound: t.sound,               // 1-4
        createdAt: t.createdAt,
        startedAt: t.startedAt,       // ms or null
        pausedAt: t.pausedAt,         // ms or null
        accumulatedMs: t.accumulatedMs, // elapsed while running before current run
        isRunning: t.isRunning,
        isComplete: t.isComplete,
        completedAt: t.completedAt,   // ms or null
        meta: t.meta || {},
      };
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }

  function emit(eventName, payload) {
    const set = listeners.get(eventName);
    if (!set) return;
    for (const fn of set) {
      try { fn(payload); } catch (e) { console.warn("SDTimers listener error:", e); }
    }
  }

  function on(eventName, fn) {
    if (!listeners.has(eventName)) listeners.set(eventName, new Set());
    listeners.get(eventName).add(fn);
    return () => listeners.get(eventName)?.delete(fn);
  }

  function msToParts(ms) {
    const totalSec = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return { h, m, s, totalSec };
  }

  function formatHMS(ms) {
    const { h, m, s } = msToParts(ms);
    const pad = (n) => String(n).padStart(2, "0");
    if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
    return `${m}:${pad(s)}`;
  }

  function getTimer(id) {
    return timers[id] || null;
  }

  function computeTimerMs(t) {
    // returns { elapsedMs, remainingMs }
    const baseElapsed = t.accumulatedMs || 0;
    let runElapsed = 0;

    if (t.isRunning && t.startedAt) {
      runElapsed = nowMs() - t.startedAt;
    }

    const elapsedMs = baseElapsed + runElapsed;

    if (t.type === "elapsed") {
      return { elapsedMs, remainingMs: 0 };
    }

    // countdown
    const durationMs = Math.max(0, (t.durationSec || 0) * 1000);
    const remainingMs = Math.max(0, durationMs - elapsedMs);
    return { elapsedMs, remainingMs };
  }

  // --- Sound ---
  const audioCache = {};
  function getChimeUrl(chimeNum) {
    return CHIME_PATHS[chimeNum] || CHIME_PATHS[DEFAULT_SETTINGS.soundDefault];
  }

  function preloadChimes() {
    // Preload but don’t spam failures
    for (const k of Object.keys(CHIME_PATHS)) {
      const url = CHIME_PATHS[k];
      if (audioCache[url]) continue;
      const a = new Audio(url);
      a.preload = "auto";
      audioCache[url] = a;
    }
  }

  function playChime(chimeNum) {
    const settings = loadSettings();
    if (!settings.soundEnabled) return;

    const url = getChimeUrl(chimeNum || settings.soundDefault);

    let a = audioCache[url];
    if (!a) {
      a = new Audio(url);
      a.preload = "auto";
      audioCache[url] = a;
    }

    // Restart sound from beginning
    try {
      a.pause();
      a.currentTime = 0;
      a.volume = Math.min(1, Math.max(0, settings.soundVolume ?? 0.35));
      // play() can fail without user interaction; that's OK.
      a.play().catch(() => {});
    } catch {
      // ignore
    }
  }

  // --- Timer lifecycle ---
  function create(id, opts = {}) {
    if (!id) throw new Error("SDTimers.create requires an id");

    const existing = timers[id];
    if (existing) return existing; // no duplicate by default

    const settings = loadSettings();

    const t = {
      id,
      label: opts.label || id,
      type: opts.type === "elapsed" ? "elapsed" : "countdown",
      durationSec: Number.isFinite(opts.durationSec) ? opts.durationSec : (opts.durationSec ? parseFloat(opts.durationSec) : 0),
      sound: opts.sound || settings.soundDefault,
      createdAt: nowMs(),
      startedAt: null,
      pausedAt: null,
      accumulatedMs: 0,
      isRunning: false,
      isComplete: false,
      completedAt: null,
      meta: opts.meta || {}, // e.g., { page:"bakes", anchor:"#bulkBlock" }
    };

    timers[id] = t;
    saveTimers();
    emit("change", { type: "create", timer: snapshot(t) });
    ensureTicking();
    return t;
  }

  function snapshot(t) {
    const { elapsedMs, remainingMs } = computeTimerMs(t);
    return {
      ...t,
      elapsedMs,
      remainingMs,
      elapsedLabel: formatHMS(elapsedMs),
      remainingLabel: formatHMS(remainingMs),
    };
  }

  function start(id) {
    const t = getTimer(id);
    if (!t) throw new Error(`Timer not found: ${id}`);

    // If completed, restarting should reset first
    if (t.isComplete) reset(id);

    if (t.isRunning) return snapshot(t);

    t.isRunning = true;
    t.startedAt = nowMs();
    t.pausedAt = null;

    saveTimers();
    emit("change", { type: "start", timer: snapshot(t) });
    ensureTicking();
    return snapshot(t);
  }

  function pause(id) {
    const t = getTimer(id);
    if (!t) throw new Error(`Timer not found: ${id}`);
    if (!t.isRunning) return snapshot(t);

    const elapsedThisRun = t.startedAt ? (nowMs() - t.startedAt) : 0;
    t.accumulatedMs = (t.accumulatedMs || 0) + Math.max(0, elapsedThisRun);
    t.isRunning = false;
    t.pausedAt = nowMs();
    t.startedAt = null;

    saveTimers();
    emit("change", { type: "pause", timer: snapshot(t) });
    ensureTicking();
    return snapshot(t);
  }

  function reset(id) {
    const t = getTimer(id);
    if (!t) throw new Error(`Timer not found: ${id}`);

    t.isRunning = false;
    t.isComplete = false;
    t.completedAt = null;
    t.startedAt = null;
    t.pausedAt = null;
    t.accumulatedMs = 0;

    saveTimers();
    emit("change", { type: "reset", timer: snapshot(t) });
    ensureTicking();
    return snapshot(t);
  }

  function remove(id) {
    if (!timers[id]) return;
    delete timers[id];
    saveTimers();
    emit("change", { type: "remove", id });
    ensureTicking();
  }

  function list() {
    return Object.values(timers).map(snapshot);
  }

  function getActive() {
    return list().filter(t => !t.isComplete);
  }

  function ensureTicking() {
    const anyRunning = Object.values(timers).some(t => t.isRunning);
    if (anyRunning && !tickHandle) {
      tickHandle = setInterval(tick, 250);
    } else if (!anyRunning && tickHandle) {
      clearInterval(tickHandle);
      tickHandle = null;
    }
  }

  function tick() {
    let changed = false;

    for (const t of Object.values(timers)) {
      if (!t.isRunning) continue;

      if (t.type === "countdown") {
        const { remainingMs } = computeTimerMs(t);
        if (remainingMs <= 0 && !t.isComplete) {
          // complete it
          t.isComplete = true;
          t.isRunning = false;
          t.completedAt = nowMs();

          // lock accumulated to duration
          const durationMs = Math.max(0, (t.durationSec || 0) * 1000);
          t.accumulatedMs = durationMs;
          t.startedAt = null;

          playChime(t.sound);
          emit("complete", { timer: snapshot(t) });
          changed = true;
        }
      }
    }

    if (changed) saveTimers();

    // Always emit tick for UI
    emit("tick", { timers: list() });
    ensureTicking();
  }

  // Restore
  function restore() {
    timers = {};
    const saved = loadTimers();
    for (const [id, t] of Object.entries(saved || {})) {
      timers[id] = {
        id,
        label: t.label || id,
        type: t.type === "elapsed" ? "elapsed" : "countdown",
        durationSec: Number.isFinite(t.durationSec) ? t.durationSec : (t.durationSec ? parseFloat(t.durationSec) : 0),
        sound: t.sound || DEFAULT_SETTINGS.soundDefault,
        createdAt: t.createdAt || nowMs(),
        startedAt: t.startedAt || null,
        pausedAt: t.pausedAt || null,
        accumulatedMs: t.accumulatedMs || 0,
        isRunning: !!t.isRunning,
        isComplete: !!t.isComplete,
        completedAt: t.completedAt || null,
        meta: t.meta || {},
      };

      // If it was "running" before refresh, keep it running using startedAt.
      // That’s already persisted; computeTimerMs will continue.
    }

    ensureTicking();
    emit("change", { type: "restore", timers: list() });
  }

  // Settings helpers
  function getSettings() {
    return loadSettings();
  }
  function setSettings(partial) {
    const next = { ...loadSettings(), ...(partial || {}) };
    saveSettings(next);
    emit("settings", next);
    return next;
  }

  // Initialize
  preloadChimes();
  restore();

  // Public API
  window.SDTimers = {
    create,
    start,
    pause,
    reset,
    remove,
    list,
    getActive,
    getTimer: (id) => (timers[id] ? snapshot(timers[id]) : null),
    on,
    settings: {
      get: getSettings,
      set: setSettings,
      chimes: CHIME_PATHS,
    },
    util: {
      formatHMS,
    },
  };
})();

/* ===================== END: SDTimers (Global Multi-Timer Engine + Chimes) ===================== */
