/* ============================================================
   Daniel Olutunbi, Career Positioning
   Premium interaction layer, vanilla JS, no dependencies.

   Every pointer driven effect (spotlight glow, magnetic buttons,
   hero tilt) is gated behind a fine pointer check, so touch
   devices never receive mousemove side effects, and behind
   prefers-reduced-motion, so a stated OS preference is honored
   rather than just slowed down.
============================================================ */

(function () {
  "use strict";

  /* ---------------- feature detection ---------------- */
  var reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduceMotion = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener("change", function (e) {
    reduceMotion = e.matches;
  });
  var hasFinePointer = window.matchMedia("(pointer: fine)").matches;

  /* ---------------- utilities ---------------- */
  function throttleRaf(fn) {
    var scheduled = false;
    return function () {
      if (scheduled) return;
      scheduled = true;
      var args = arguments;
      var self = this;
      requestAnimationFrame(function () {
        fn.apply(self, args);
        scheduled = false;
      });
    };
  }

  function debounce(fn, wait) {
    var t;
    return function () {
      var args = arguments;
      var self = this;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(self, args);
      }, wait);
    };
  }

  /* ---------------- gather references up front ----------------
     Grabbed once, before any listener fires, so nothing below
     runs into a variable that has not been declared yet. */
  var root = document.documentElement;
  var body = document.body;
  var themeToggle = document.querySelector(".theme-toggle");
  var progressBar = document.querySelector(".scroll-progress");
  var headerEl = document.querySelector("header");
  var backToTop = document.querySelector(".back-to-top");
  var menuToggle = document.querySelector(".menu-toggle");
  var navLinks = document.querySelector(".nav-links");
  var navSpyLinks = Array.prototype.slice.call(
    document.querySelectorAll(".nav-links li:not(.nav-cta):not(.nav-social-item) > a[href^='#']")
  );
  var spySections = navSpyLinks
    .map(function (a) {
      return document.querySelector(a.getAttribute("href"));
    })
    .filter(Boolean);
  var tiltCard = document.querySelector(".redline-card");
  var glowCards = Array.prototype.slice.call(
    document.querySelectorAll(".service-card, .rl-card")
  );

  /* ---------------- footer year ---------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------------- theme (dark / light) ----------------
     The initial value is already set by a small inline script
     in <head>, before this file loads, so the page never flashes
     the wrong theme. This block only wires up the toggle button
     and keeps it in sync afterward. */
  var THEME_KEY = "chrisheri-theme";

  function setTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (themeToggle) themeToggle.setAttribute("aria-pressed", String(theme === "dark"));
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      /* storage unavailable, theme still applies for this session */
    }
  }

  if (themeToggle) {
    themeToggle.setAttribute(
      "aria-pressed",
      String(root.getAttribute("data-theme") === "dark")
    );
    themeToggle.addEventListener("click", function () {
      var current = root.getAttribute("data-theme") === "dark" ? "dark" : "light";
      setTheme(current === "dark" ? "light" : "dark");
    });
  }

  /* ---------------- scrollspy ---------------- */
  function updateScrollSpy() {
    if (!spySections.length) return;
    var fromTop = window.scrollY + window.innerHeight * 0.35;
    var currentId = spySections[0].id;
    for (var i = 0; i < spySections.length; i++) {
      if (spySections[i].offsetTop <= fromTop) currentId = spySections[i].id;
    }
    navSpyLinks.forEach(function (a) {
      a.classList.toggle("is-active", a.getAttribute("href") === "#" + currentId);
    });
  }

  /* ---------------- unified scroll handler ----------------
     One rAF throttled listener drives the progress bar, the
     header elevation state, the back to top button, and the
     scrollspy, instead of four separate scroll listeners. */
  var onScroll = throttleRaf(function () {
    var scrollTop = window.scrollY;
    var docHeight = document.documentElement.scrollHeight - window.innerHeight;
    var ratio = docHeight > 0 ? scrollTop / docHeight : 0;

    if (progressBar) progressBar.style.width = (ratio * 100).toFixed(2) + "%";
    if (headerEl) headerEl.classList.toggle("is-scrolled", scrollTop > 8);
    if (backToTop) backToTop.classList.toggle("is-visible", scrollTop > 640);

    updateScrollSpy();
  });

  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------------- reveal on scroll, staggered ----------------
     --reveal-i is set per element based on its position among
     siblings sharing the same parent, so cards in a grid cascade
     in together rather than each firing independently. */
  var revealGroups = new Map();
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  revealEls.forEach(function (el) {
    var parent = el.parentElement;
    var i = revealGroups.has(parent) ? revealGroups.get(parent) : 0;
    el.style.setProperty("--reveal-i", i);
    revealGroups.set(parent, i + 1);
  });

  var revealObserver = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  revealEls.forEach(function (el) {
    revealObserver.observe(el);
  });

  /* ---------------- mobile menu ---------------- */
  if (menuToggle && navLinks) {
    var mobileLinkItems = Array.prototype.slice.call(navLinks.children);
    mobileLinkItems.forEach(function (li, i) {
      li.style.setProperty("--reveal-i", i);
    });

    menuToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    navLinks.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", function (event) {
      var insideNav = navLinks.contains(event.target) || menuToggle.contains(event.target);
      if (!insideNav) {
        navLinks.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });

    window.addEventListener(
      "resize",
      debounce(function () {
        if (window.innerWidth > 760) {
          navLinks.classList.remove("is-open");
          menuToggle.setAttribute("aria-expanded", "false");
        }
      }, 150)
    );
  }

  /* ---------------- card spotlight glow ----------------
     A soft light that tracks the cursor within each card, like
     reading a page with a loupe. Desktop pointers only. */
  if (hasFinePointer) {
    glowCards.forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", ((e.clientX - rect.left) / rect.width) * 100 + "%");
        card.style.setProperty("--my", ((e.clientY - rect.top) / rect.height) * 100 + "%");
      });
    });
  }

  /* ---------------- magnetic buttons ----------------
     The primary call to action eases toward the cursor within a
     small radius, then eases back on release. Damped with a
     simple lerp loop rather than following 1 to 1, so it reads
     as magnetic rather than jittery. */
  if (hasFinePointer && !reduceMotion) {
    document.querySelectorAll(".btn-fill").forEach(function (btn) {
      var targetX = 0;
      var targetY = 0;
      var currentX = 0;
      var currentY = 0;
      var raf = null;

      function loop() {
        currentX += (targetX - currentX) * 0.18;
        currentY += (targetY - currentY) * 0.18;
        btn.style.transform = "translate(" + currentX.toFixed(2) + "px, " + currentY.toFixed(2) + "px)";
        if (Math.abs(targetX - currentX) > 0.1 || Math.abs(targetY - currentY) > 0.1) {
          raf = requestAnimationFrame(loop);
        } else {
          raf = null;
        }
      }

      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        targetX = (e.clientX - rect.left - rect.width / 2) * 0.25;
        targetY = (e.clientY - rect.top - rect.height / 2) * 0.35;
        if (!raf) raf = requestAnimationFrame(loop);
      });

      btn.addEventListener("mouseleave", function () {
        targetX = 0;
        targetY = 0;
        if (!raf) raf = requestAnimationFrame(loop);
      });
    });
  }

  /* ---------------- hero card tilt ----------------
     A few degrees of perspective toward the cursor, like paper
     lifted slightly to catch the light. Capped low on purpose,
     this is a hint of depth, not a gimmick. */
  if (tiltCard && hasFinePointer && !reduceMotion) {
    var maxTilt = 5;

    tiltCard.addEventListener("mousemove", function (e) {
      var rect = tiltCard.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width;
      var py = (e.clientY - rect.top) / rect.height;
      var rotateY = (px - 0.5) * maxTilt * 2;
      var rotateX = (0.5 - py) * maxTilt * 2;
      tiltCard.style.transform =
        "perspective(900px) rotateX(" + rotateX.toFixed(2) + "deg) rotateY(" + rotateY.toFixed(2) + "deg)";
    });

    tiltCard.addEventListener("mouseleave", function () {
      tiltCard.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
    });
  }

  /* ---------------- button and link ripple ---------------- */
  document.querySelectorAll(".btn, .contact-link").forEach(function (el) {
    el.addEventListener("click", function (e) {
      if (reduceMotion) return;
      var rect = el.getBoundingClientRect();
      var ripple = document.createElement("span");
      var size = Math.max(rect.width, rect.height) * 1.6;
      ripple.className = "ripple";
      ripple.style.width = ripple.style.height = size + "px";
      ripple.style.left = e.clientX - rect.left - size / 2 + "px";
      ripple.style.top = e.clientY - rect.top - size / 2 + "px";
      el.appendChild(ripple);
      ripple.addEventListener("animationend", function () {
        ripple.remove();
      });
    });
  });

  /* ---------------- copy contact email to clipboard ---------------- */
  document.querySelectorAll("[data-copy]").forEach(function (el) {
    el.addEventListener("click", function (event) {
      event.preventDefault();
      var value = el.getAttribute("data-copy");
      var note = el.parentElement.querySelector(".copy-note");

      function showConfirmation() {
        if (!note) return;
        note.textContent = "Copied";
        note.classList.add("is-visible");
        window.clearTimeout(note._hideTimer);
        note._hideTimer = window.setTimeout(function () {
          note.classList.remove("is-visible");
        }, 1800);
      }

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard
          .writeText(value)
          .then(showConfirmation)
          .catch(function () {
            window.location.href = "mailto:" + value;
          });
      } else {
        window.location.href = "mailto:" + value;
      }
    });
  });

  /* ---------------- back to top ---------------- */
  if (backToTop) {
    backToTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ---------------- FAQ accordion ----------------
     Each item toggles independently. The collapse itself is a
     CSS grid-template-rows trick (0fr to 1fr), so this JS only
     needs to flip aria-expanded, no height measuring required. */
  document.querySelectorAll(".faq-question").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var isOpen = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", String(!isOpen));
    });
  });

  /* ---------------- before/after carousel ----------------
     One slide is ever "active" (position: relative, in flow),
     the rest sit absolutely positioned and invisible, so the
     container's height always matches whichever slide is
     showing without a layout jump. */
  var carousel = document.querySelector("[data-carousel]");
  if (carousel) {
    var slides = Array.prototype.slice.call(carousel.querySelectorAll("[data-slide]"));
    var dots = Array.prototype.slice.call(carousel.querySelectorAll(".carousel-dot"));
    var prevBtn = carousel.querySelector(".carousel-prev");
    var nextBtn = carousel.querySelector(".carousel-next");
    var currentSlide = 0;

    function showSlide(index) {
      currentSlide = (index + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        slide.classList.toggle("is-active", i === currentSlide);
      });
      dots.forEach(function (dot, i) {
        var active = i === currentSlide;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-current", String(active));
      });
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        showSlide(i);
      });
    });
    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        showSlide(currentSlide - 1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        showSlide(currentSlide + 1);
      });
    }
  }

  /* ---------------- initial state ----------------
     Run once on load so the header, progress bar, and scrollspy
     reflect the actual scroll position immediately (a mid page
     reload should not show an empty progress bar). */
  onScroll();

  window.addEventListener("load", function () {
    requestAnimationFrame(function () {
      body.classList.add("is-loaded");
    });
  });
})();
