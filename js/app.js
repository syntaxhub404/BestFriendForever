const SECRET_PASSWORD = "2005";

function isEntryPage() {
  const p = location.pathname.split("/").pop();
  return p === "" || p === "index.html";
}
if (!isEntryPage() && localStorage.getItem("memoryVaultUnlocked") !== "yes") {
  location.replace("index.html");
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.querySelector("#passwordForm");
  const input = document.querySelector("#vaultPassword");
  const toggle = document.querySelector("#togglePassword");
  const error = document.querySelector("#errorMsg");

  toggle?.addEventListener("click", () => {
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    toggle.textContent = show ? "Hide" : "Show";
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    if (input.value === SECRET_PASSWORD) {
      localStorage.setItem("memoryVaultUnlocked", "yes");
      location.href = "gifts.html";
    } else {
      error.textContent = "That password is not correct. Try again.";
      input.value = "";
      input.focus();
    }
  });

  document.querySelector("#resetVault")?.addEventListener("click", () => {
    localStorage.removeItem("memoryVaultUnlocked");
    location.href = "index.html";
  });

  // Envelope typing.
  const envelope = document.querySelector("#envelope");
  const textEl = document.querySelector("#letterText");
  const replay = document.querySelector("#replayTyping");
  const message = "You are one of my favourite memories. Thank you for every laugh, every little moment, and every beautiful day. Here is to many more memories together.";
  let typeTimer = null;

  function typeMessage() {
    if (!textEl) return;
    clearInterval(typeTimer);
    textEl.textContent = "";
    let i = 0;
    typeTimer = setInterval(() => {
      i++;
      textEl.textContent = message.slice(0, i);
      if (i >= message.length) clearInterval(typeTimer);
    }, 25);
  }

  envelope?.addEventListener("click", () => {
    envelope.classList.add("open");
    setTimeout(typeMessage, 550);
  });
  replay?.addEventListener("click", () => {
    envelope?.classList.add("open");
    typeMessage();
  });

  // Reliable scratch card.
  const canvas = document.querySelector("#scratchCanvas");
  const card = document.querySelector("#scratchCard");

  if (canvas && card) {
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let drawing = false;
    let lastPoint = null;
    let revealed = false;
    let resizeTimer = null;

    function setupCanvas() {
      const rect = card.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      canvas.style.width = rect.width + "px";
      canvas.style.height = rect.height + "px";

      // Work in CSS pixels while keeping a high-resolution canvas.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = "source-over";

      const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
      gradient.addColorStop(0, "#f2bdcd");
      gradient.addColorStop(0.5, "#dca9bd");
      gradient.addColorStop(1, "#563c5c");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, rect.width, rect.height);

      // Foil texture.
      for (let i = 0; i < 420; i++) {
        const x = Math.random() * rect.width;
        const y = Math.random() * rect.height;
        const r = Math.random() * 1.6 + 0.4;
        ctx.fillStyle = i % 2 ? "rgba(255,255,255,.18)" : "rgba(86,60,92,.10)";
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Foil wording.
      ctx.fillStyle = "rgba(255,255,255,.75)";
      ctx.textAlign = "center";
      ctx.font = "900 18px system-ui";
      ctx.fillText("A LITTLE SECRET", rect.width / 2, rect.height / 2 - 10);
      ctx.font = "700 11px system-ui";
      ctx.fillText("SCRATCH TO REVEAL", rect.width / 2, rect.height / 2 + 18);

      canvas.style.opacity = "1";
      document.querySelector("#scratchLabel")?.classList.remove("hidden");
      revealed = false;
    }

    function getPoint(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function eraseAt(point) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(46, canvas.clientWidth * 0.075);

      ctx.beginPath();
      if (lastPoint) {
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(point.x, point.y);
      } else {
        ctx.moveTo(point.x, point.y);
        ctx.lineTo(point.x + 0.01, point.y + 0.01);
      }
      ctx.stroke();
      ctx.restore();

      lastPoint = point;
    }

    function revealIfEnough() {
      if (revealed) return;

      const w = canvas.width;
      const h = canvas.height;
      const pixels = ctx.getImageData(0, 0, w, h).data;

      // Sample alpha every 20 pixels. Transparent means scratched away.
      let transparent = 0;
      let total = 0;
      for (let i = 3; i < pixels.length; i += 20) {
        total++;
        if (pixels[i] < 30) transparent++;
      }

      const scratched = transparent / total;
      if (scratched >= 0.48) {
        revealed = true;
        canvas.style.transition = "opacity .65s ease";
        canvas.style.opacity = "0";
        document.querySelector("#scratchLabel")?.classList.add("hidden");
      }
    }

    canvas.addEventListener("pointerdown", (e) => {
      if (revealed) return;
      drawing = true;
      lastPoint = getPoint(e);
      canvas.setPointerCapture?.(e.pointerId);
      eraseAt(lastPoint);
      revealIfEnough();
      e.preventDefault();
    }, { passive: false });

    canvas.addEventListener("pointermove", (e) => {
      if (!drawing || revealed) return;
      eraseAt(getPoint(e));
      revealIfEnough();
      e.preventDefault();
    }, { passive: false });

    function stopDrawing() {
      drawing = false;
      lastPoint = null;
    }
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointercancel", stopDrawing);
    canvas.addEventListener("pointerleave", () => { if (!canvas.hasPointerCapture?.()) stopDrawing(); });

    setupCanvas();
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        // Do not destroy a reveal once it is already complete.
        if (!revealed) setupCanvas();
      }, 180);
    });
  }
});
