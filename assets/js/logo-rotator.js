// ===================== BEGIN: HEADER LOGO ROTATOR =====================
// Rotates the tiny header logo through assets/images/logo_1.png ... logo_27.png
// - Changes image every 3000 seconds
// - Click on the logo to advance immediately
// =====================================================================
document.addEventListener("DOMContentLoaded", () => {
  // This must match the ID in your <img> tag:
  // <img id="appLogoRotator" src="assets/images/logo_1.png" ... >
  const logoEl = document.getElementById("appLogoRotator");
  if (!logoEl) {
    console.warn("[Logo Rotator] #appLogoRotator not found in DOM.");
    return;
  }

  // How many logo_N.png images you have
  const totalLogos = 27;

  // Start on logo_1.png (your initial src)
  let index = 1;

  // "sequential" cycles 1→2→3→...→27→1
  // "random" jumps to a random logo each time
  const mode = "random" ; // or "sequential"

  // Build the path to the image
  // IMPORTANT: This matches your HTML: src="assets/images/logo_1.png"
  function buildLogoPath(i) {
    return `assets/images/logo_${i}.png`;
  }

const ENABLE_LOGO_PRELOAD = false;

// Optional: pre-load all images so swaps are snappy
if (ENABLE_LOGO_PRELOAD) {
  (function preloadLogos() {
    for (let i = 1; i <= totalLogos; i++) {
      const img = new Image();
      img.src = buildLogoPath(i);
    }
  })();
}

  function nextLogo() {
    if (mode === "random") {
      // Ensure we don't pick the same logo twice in a row
      let newIndex = index;
      while (newIndex === index && totalLogos > 1) {
        newIndex = Math.floor(Math.random() * totalLogos) + 1;
      }
      index = newIndex;
    } else {
      // Sequential mode
      index = index >= totalLogos ? 1 : index + 1;
    }

    // Simple fade-out / fade-in effect
    logoEl.style.opacity = "0";

    setTimeout(() => {
      logoEl.src = buildLogoPath(index);
      logoEl.style.opacity = "1";
    }, 200);
  }

  // Rotate automatically every 3 seconds
  const intervalMs = 30000;
  setInterval(nextLogo, intervalMs);

  // Also let the user click the logo to jump ahead
  logoEl.addEventListener("click", nextLogo);

  console.log("[Logo Rotator] Initialized with", totalLogos, "logos in", mode, "mode.");
});
// ===================== END: HEADER LOGO ROTATOR =====================
