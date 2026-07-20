/* ===================================================================
   Liban Ali Syed — Portfolio  ·  script.js
   Starfield + cursor constellation engine, mobile menu, scroll reveals,
   active nav. Built with performance guardrails: single canvas, capped
   particle counts, rAF pause on hidden tab, prefers-reduced-motion.
   =================================================================== */

/* ---------------------------------------------------------------
   Starfield & Constellation Engine
   --------------------------------------------------------------- */
(function () {
  "use strict";

  const canvas = document.getElementById("starfield");
  if (!canvas) return;
  const ctx = canvas.getContext("2d", { alpha: true });

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  const STAR_COUNT = isMobile ? 70 : 150;
  const LINK_DIST = isMobile ? 85 : 125;
  const CURSOR_RADIUS = isMobile ? 100 : 150;
  const MAX_DPR = 2;

  let width = 0,
    height = 0,
    dpr = 1;
  let stars = [];
  let comets = [];
  let rafId = null;
  let lastTime = 0;
  let running = false;

  const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, active: false };

  // ---- Pre-rendered glow sprites (cheaper than per-star shadowBlur) ----
  function makeGlow(color, size) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const gctx = c.getContext("2d");
    const grad = gctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    grad.addColorStop(0, color);
    grad.addColorStop(1, "rgba(0,0,0,0)");
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, size, size);
    return c;
  }
  const glowGold = makeGlow("rgba(240,207,149,0.95)", 48);
  const glowStar = makeGlow("rgba(232,228,243,0.7)", 26);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initStars();
  }

  function initStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.3 + 0.4,
        baseAlpha: Math.random() * 0.5 + 0.35,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.6 + 0.2,
        driftX: (Math.random() - 0.5) * 0.04,
        driftY: (Math.random() - 0.5) * 0.04,
        wake: 0,
      });
    }
  }

  function maybeSpawnComet(dt) {
    if (reducedMotion) return;
    if (comets.length >= 2) return;
    // Roughly one comet every 7-16s on average
    if (Math.random() < dt * 0.00035) {
      const fromLeft = Math.random() < 0.5;
      const y = Math.random() * height * 0.5;
      comets.push({
        x: fromLeft ? -20 : width + 20,
        y: y,
        vx: (fromLeft ? 1 : -1) * (2.2 + Math.random() * 1.4),
        vy: 0.9 + Math.random() * 0.6,
        life: 1,
        trail: [],
      });
    }
  }

  function updateComets(dt) {
    for (let i = comets.length - 1; i >= 0; i--) {
      const c = comets[i];
      c.trail.push({ x: c.x, y: c.y });
      if (c.trail.length > 14) c.trail.shift();
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.life -= dt * 0.006;
      if (c.life <= 0 || c.x < -60 || c.x > width + 60 || c.y > height + 60) {
        comets.splice(i, 1);
        continue;
      }
      if (c.trail.length > 1) {
        ctx.beginPath();
        for (let t = 0; t < c.trail.length; t++) {
          const p = c.trail[t];
          if (t === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        const grad = ctx.createLinearGradient(
          c.trail[0].x,
          c.trail[0].y,
          c.x,
          c.y,
        );
        grad.addColorStop(0, "rgba(240,207,149,0)");
        grad.addColorStop(1, "rgba(240,207,149," + 0.75 * c.life + ")");
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
    }
  }

  function tick(now) {
    if (!lastTime) lastTime = now;
    const dt = Math.min((now - lastTime) / 16.6667, 3);
    lastTime = now;

    // Smooth cursor trailing
    mouse.x += (mouse.tx - mouse.x) * 0.18;
    mouse.y += (mouse.ty - mouse.y) * 0.18;

    ctx.clearRect(0, 0, width, height);

    const awake = [];

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.phase += s.speed * dt * 0.04;
      const twinkle = 0.5 + 0.5 * Math.sin(s.phase);

      s.x += s.driftX * dt;
      s.y += s.driftY * dt;
      if (s.x < -5) s.x = width + 5;
      else if (s.x > width + 5) s.x = -5;
      if (s.y < -5) s.y = height + 5;
      else if (s.y > height + 5) s.y = -5;

      let targetWake = 0;
      if (mouse.active && !reducedMotion) {
        const dx = s.x - mouse.x,
          dy = s.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CURSOR_RADIUS) targetWake = 1 - dist / CURSOR_RADIUS;
      }
      s.wake += (targetWake - s.wake) * Math.min(0.09 * dt, 1);
      if (s.wake < 0.003) s.wake = 0;
      if (s.wake > 0.12) awake.push(s);

      const alpha = Math.min(
        s.baseAlpha * (0.55 + 0.45 * twinkle) + s.wake * 0.55,
        1,
      );
      const size = s.r * (1 + s.wake * 1.6);

      if (s.wake > 0.08) {
        const glowSize = size * 10;
        ctx.globalAlpha = Math.min(s.wake * 0.8, 0.9);
        ctx.drawImage(
          glowGold,
          s.x - glowSize / 2,
          s.y - glowSize / 2,
          glowSize,
          glowSize,
        );
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.wake > 0.35 ? "#f0cf95" : "#e8e4f3";
      ctx.beginPath();
      ctx.arc(s.x, s.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Constellation links between nearby "awake" stars
    if (awake.length > 1) {
      for (let i = 0; i < awake.length; i++) {
        for (let j = i + 1; j < awake.length; j++) {
          const a = awake[i],
            b = awake[j];
          const dx = a.x - b.x,
            dy = a.y - b.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < LINK_DIST) {
            const o = (1 - d / LINK_DIST) * Math.min(a.wake, b.wake) * 0.7;
            if (o <= 0.02) continue;
            ctx.globalAlpha = o;
            ctx.strokeStyle = "#cda86a";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    maybeSpawnComet(dt);
    updateComets(dt);

    if (running) rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = 0;
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
  }

  function onPointerMove(e) {
    mouse.tx = e.clientX;
    mouse.ty = e.clientY;
    mouse.active = true;
  }
  function onPointerLeave() {
    mouse.active = false;
  }

  let resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });
  window.addEventListener("pointerleave", onPointerLeave, { passive: true });
  document.addEventListener("mouseleave", onPointerLeave, { passive: true });
  window.addEventListener("resize", onResize);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  resize();
  // Render at least one static frame even under reduced motion,
  // so the sky isn't empty; just don't keep looping.
  if (reducedMotion) {
    lastTime = 0;
    tick(performance.now());
  } else {
    start();
  }
})();

/* ---------------------------------------------------------------
   Navbar, mobile menu, active nav, scroll reveals
   --------------------------------------------------------------- */
(function () {
  "use strict";

  const body = document.body;
  const navbar = document.getElementById("navbar");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const mobileOverlay = document.getElementById("mobileOverlay");
  const mobileLinks = document.querySelectorAll(".mobile-link");
  const navLinks = document.querySelectorAll(".nav-link");
  const sections = document.querySelectorAll("section[id]");

  // ── Mobile Menu ───────────────────────────────────────────
  function openMobileMenu() {
    mobileMenuBtn.classList.add("active");
    mobileMenuBtn.setAttribute("aria-expanded", "true");
    mobileOverlay.classList.add("active");
    body.style.overflow = "hidden";
  }

  function closeMobileMenu() {
    mobileMenuBtn.classList.remove("active");
    mobileMenuBtn.setAttribute("aria-expanded", "false");
    mobileOverlay.classList.remove("active");
    body.style.overflow = "";
  }

  mobileMenuBtn.addEventListener("click", () => {
    mobileOverlay.classList.contains("active")
      ? closeMobileMenu()
      : openMobileMenu();
  });

  mobileOverlay.addEventListener("click", (e) => {
    if (e.target === mobileOverlay) closeMobileMenu();
  });

  mobileLinks.forEach((link) => {
    link.addEventListener("click", closeMobileMenu);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMobileMenu();
  });

  // ── Scroll — Navbar shadow/background ─────────────────────
  function handleScroll() {
    navbar.classList.toggle("scrolled", window.scrollY > 20);
  }
  window.addEventListener("scroll", handleScroll, { passive: true });
  handleScroll();

  // ── Active Nav Link (Intersection Observer) ───────────────
  const navObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach((link) => {
            link.classList.toggle(
              "active",
              link.getAttribute("href") === `#${id}`,
            );
          });
        }
      });
    },
    { root: null, rootMargin: "-30% 0px -60% 0px", threshold: 0 },
  );

  sections.forEach((section) => navObserver.observe(section));

  // ── Scroll Reveal ─────────────────────────────────────────
  function setupReveals() {
    [
      ...document.querySelectorAll(".section-header"),
      ...document.querySelectorAll(".contact-plate"),
    ].forEach((el) => el.classList.add("reveal"));

    [
      ...document.querySelectorAll(".skills-grid"),
      ...document.querySelectorAll(".projects-grid"),
    ].forEach((el) => el.classList.add("reveal-stagger"));

    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );

    document.querySelectorAll(".reveal, .reveal-stagger").forEach((el) => {
      revealObserver.observe(el);
    });
  }

  requestAnimationFrame(() => requestAnimationFrame(setupReveals));

  // ── Smooth scroll for anchor links ─────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const targetId = this.getAttribute("href");
      if (targetId === "#") return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });
})();
