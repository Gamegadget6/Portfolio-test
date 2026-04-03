/* ===================================================================
   Liban Ali Syed — Portfolio  ·  script.js
   Theme toggle, mobile menu, scroll reveals, active nav
   =================================================================== */

(function () {
    'use strict';

    // ── Cache DOM ──────────────────────────────────────────────
    const html            = document.documentElement;
    const body            = document.body;
    const navbar          = document.getElementById('navbar');
    const themeToggle     = document.getElementById('themeToggle');
    const mobileMenuBtn   = document.getElementById('mobileMenuBtn');
    const mobileOverlay   = document.getElementById('mobileOverlay');
    const mobileLinks     = document.querySelectorAll('.mobile-link');
    const navLinks        = document.querySelectorAll('.nav-link');
    const sections        = document.querySelectorAll('section[id]');

    // ── Theme Toggle ──────────────────────────────────────────
    const STORAGE_KEY = 'liban-theme';

    function getPreferredTheme() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function applyTheme(theme) {
        html.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEY, theme);
    }

    // Initialise
    applyTheme(getPreferredTheme());

    themeToggle.addEventListener('click', () => {
        const current = html.getAttribute('data-theme');
        applyTheme(current === 'light' ? 'dark' : 'light');
    });

    // Respect OS changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (!localStorage.getItem(STORAGE_KEY)) {
            applyTheme(e.matches ? 'dark' : 'light');
        }
    });

    // ── Mobile Menu ───────────────────────────────────────────
    function openMobileMenu() {
        mobileMenuBtn.classList.add('active');
        mobileOverlay.classList.add('active');
        body.style.overflow = 'hidden';
    }

    function closeMobileMenu() {
        mobileMenuBtn.classList.remove('active');
        mobileOverlay.classList.remove('active');
        body.style.overflow = '';
    }

    mobileMenuBtn.addEventListener('click', () => {
        mobileOverlay.classList.contains('active') ? closeMobileMenu() : openMobileMenu();
    });

    mobileOverlay.addEventListener('click', (e) => {
        if (e.target === mobileOverlay) closeMobileMenu();
    });

    mobileLinks.forEach((link) => {
        link.addEventListener('click', () => {
            closeMobileMenu();
        });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeMobileMenu();
    });

    // ── Scroll — Navbar shadow ────────────────────────────────
    let lastScroll = 0;
    function handleScroll() {
        const scrollY = window.scrollY;
        navbar.classList.toggle('scrolled', scrollY > 20);
        lastScroll = scrollY;
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    // ── Active Nav Link (Intersection Observer) ───────────────
    const navObserverOptions = {
        root: null,
        rootMargin: '-30% 0px -60% 0px',
        threshold: 0,
    };

    const navObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                const id = entry.target.getAttribute('id');
                navLinks.forEach((link) => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, navObserverOptions);

    sections.forEach((section) => navObserver.observe(section));

    // ── Scroll Reveal ─────────────────────────────────────────
    function setupReveals() {
        // Tag individual elements for reveal
        const revealTargets = [
            ...document.querySelectorAll('.section-header'),
            ...document.querySelectorAll('.contact-window'),
        ];

        revealTargets.forEach((el) => el.classList.add('reveal'));

        // Tag grids for staggered reveal
        const staggerTargets = [
            ...document.querySelectorAll('.skills-grid'),
            ...document.querySelectorAll('.projects-grid'),
        ];

        staggerTargets.forEach((el) => el.classList.add('reveal-stagger'));

        // Observe
        const revealObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        revealObserver.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
        );

        document.querySelectorAll('.reveal, .reveal-stagger').forEach((el) => {
            revealObserver.observe(el);
        });
    }

    // Run after paint
    requestAnimationFrame(() => {
        requestAnimationFrame(setupReveals);
    });

    // ── Smooth scroll for anchor links ─────────────
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            const target = document.querySelector(targetId);   
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
})();
