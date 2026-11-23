(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.remove("no-js");
  root.classList.add("js");

  /* Menu mobile */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("site-nav");
  if (toggle && nav) {
    var close = function () {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("is-open");
    };
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
      if (!open) {
        var first = nav.querySelector("a");
        if (first) first.focus();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        close();
        toggle.focus();
      }
    });
    window.matchMedia("(min-width: 72em)").addEventListener("change", function (mq) {
      if (mq.matches) close();
    });
  }

  /* Filet sous l'en-tête au défilement */
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* Épreuve de barrage du héros : les cibles sont entourées une à une */
  var sheet = document.querySelector(".barrage");
  if (sheet) {
    var circles = Array.prototype.slice.call(sheet.querySelectorAll(".c"));
    var counter = sheet.querySelector("[data-found]");
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    circles.sort(function (a, b) {
      return Number(a.getAttribute("data-order")) - Number(b.getAttribute("data-order"));
    });
    if (reduce || !("IntersectionObserver" in window)) {
      circles.forEach(function (c) { c.classList.add("is-drawn"); });
    } else {
      if (counter) counter.textContent = "0";
      var started = false;
      var run = function () {
        if (started) return;
        started = true;
        var i = 0;
        var tick = function () {
          if (i >= circles.length) return;
          circles[i].classList.add("is-drawn");
          i += 1;
          if (counter) counter.textContent = String(i);
          window.setTimeout(tick, 170 + Math.round(Math.random() * 120));
        };
        window.setTimeout(tick, 450);
      };
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) { run(); io.disconnect(); }
        });
      }, { threshold: 0.35 });
      io.observe(sheet);
    }
  }
})();
