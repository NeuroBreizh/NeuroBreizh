/* NeuroBreizh — affichage du suivi (page patient et espace praticien)
   Graphiques en SVG dessinés à la taille réelle de leur conteneur. */
(function () {
  "use strict";

  var GAMES = (window.NBSuivi && window.NBSuivi.GAMES) || {};
  var C = {
    line: "#1E6B78",
    grid: "#E3EAEB",
    axis: "#4A5A6E",
    band: "#E1EEEF",
    heat: ["#EEF3F3", "#CFE6E8", "#8FCBCF", "#1E6B78"]
  };
  var NS = "http://www.w3.org/2000/svg";
  var DAY = 86400000;
  var fmtDay = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" });
  var fmtLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  var fmtFull = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  var fmtTime = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
  var observers = [];

  function el(tag, attrs, html) {
    var e = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === "class") e.className = attrs[k];
      else if (k === "text") e.textContent = attrs[k];
      else e.setAttribute(k, attrs[k]);
    }
    if (html !== undefined) e.innerHTML = html;
    return e;
  }
  function svg(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }
  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function nf(n, d) {
    return n === null || n === undefined ? "–" : Number(n).toLocaleString("fr-FR", { maximumFractionDigits: d || 0 });
  }
  function minutes(sec) { return sec ? sec / 60 : 0; }
  function dayStart(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  function mondayOf(d) {
    var x = dayStart(d);
    var wd = (x.getDay() + 6) % 7;
    return new Date(x.getTime() - wd * DAY);
  }
  function key(d) { var x = dayStart(d); return x.getFullYear() + "-" + (x.getMonth() + 1) + "-" + x.getDate(); }
  function gameName(g) { return (GAMES[g] && GAMES[g].name) || g; }
  function gameFn(g) { return (GAMES[g] && GAMES[g].fn) || ""; }
  function durTxt(sec) {
    if (!sec) return "–";
    var m = Math.floor(sec / 60), s = sec % 60;
    return m ? m + " min " + (s < 10 ? "0" : "") + s + " s" : s + " s";
  }

  /* ---------- Infobulle partagée ---------- */
  var tip = null;
  function showTip(host, x, y, html) {
    if (!tip) {
      tip = el("div", { class: "nb-tip", role: "tooltip" });
      document.body.appendChild(tip);
    }
    tip.innerHTML = html;
    tip.style.display = "block";
    var r = host.getBoundingClientRect();
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var left = r.left + window.scrollX + x - tw / 2;
    var top = r.top + window.scrollY + y - th - 14;
    left = Math.max(window.scrollX + 8, Math.min(left, window.scrollX + document.documentElement.clientWidth - tw - 8));
    if (top < window.scrollY + 8) top = r.top + window.scrollY + y + 18;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }
  function hideTip() { if (tip) tip.style.display = "none"; }
  function bindTip(node, host, x, y, html) {
    node.addEventListener("mouseenter", function () { showTip(host, x(), y(), html); });
    node.addEventListener("mouseleave", hideTip);
    node.addEventListener("focus", function () { showTip(host, x(), y(), html); });
    node.addEventListener("blur", hideTip);
  }

  function observe(box, draw) {
    draw();
    if ("ResizeObserver" in window) {
      var last = box.clientWidth;
      var ro = new ResizeObserver(function () {
        if (Math.abs(box.clientWidth - last) > 2) { last = box.clientWidth; draw(); }
      });
      ro.observe(box);
      observers.push(ro);
    }
  }

  /* ---------- Courbe : une série, une échelle ---------- */
  function lineChart(box, points, opt) {
    // points : [{v, label, s}] ; opt : {min, max, unit, fmt, height}
    observe(box, function () {
      box.innerHTML = "";
      var W = Math.max(260, box.clientWidth), H = opt.height || 190;
      var m = { l: 40, r: 44, t: 18, b: 26 };
      var iw = W - m.l - m.r, ih = H - m.t - m.b;
      var vals = points.map(function (p) { return p.v; });
      var min = opt.min !== undefined ? opt.min : 0;
      var max = opt.max !== undefined ? opt.max : Math.max.apply(null, vals) * 1.15 || 1;
      var ticks = opt.ticks || niceTicks(min, max, 4);
      max = Math.max(max, ticks[ticks.length - 1]);
      var root = svg("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "group", "aria-label": opt.aria || "" });
      function X(i) { return m.l + (points.length === 1 ? iw / 2 : (i * iw) / (points.length - 1)); }
      function Y(v) { return m.t + ih - ((v - min) / (max - min || 1)) * ih; }
      ticks.forEach(function (t) {
        root.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), stroke: C.grid, "stroke-width": 1 }));
        var tx = svg("text", { x: m.l - 8, y: Y(t) + 4, "text-anchor": "end", class: "tick" });
        tx.textContent = opt.fmt ? opt.fmt(t) : nf(t);
        root.appendChild(tx);
      });
      // axe des x : première et dernière date
      if (points.length) {
        var a = svg("text", { x: X(0), y: H - 6, "text-anchor": points.length === 1 ? "middle" : "start", class: "tick" });
        a.textContent = fmtDay.format(new Date(points[0].s.end));
        root.appendChild(a);
        if (points.length > 1) {
          var b = svg("text", { x: X(points.length - 1), y: H - 6, "text-anchor": "end", class: "tick" });
          b.textContent = fmtDay.format(new Date(points[points.length - 1].s.end));
          root.appendChild(b);
        }
      }
      if (points.length > 1) {
        var d = points.map(function (p, i) { return (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(p.v).toFixed(1); }).join("");
        root.appendChild(svg("path", { d: d, fill: "none", stroke: C.line, "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }));
      }
      // étiquettes de changement de niveau (sélectives)
      var prev = null, shown = 0;
      points.forEach(function (p, i) {
        if (p.label && p.label !== prev && shown < 6) {
          var anchor = i === 0 ? "start" : (i === points.length - 1 ? "end" : "middle");
          var t = svg("text", { x: X(i) + (i === 0 ? -4 : 0), y: Math.max(11, Y(p.v) - 12), "text-anchor": anchor, class: "lvl" });
          t.textContent = p.label;
          root.appendChild(t);
          shown++;
        }
        prev = p.label;
      });
      points.forEach(function (p, i) {
        var cx = X(i), cy = Y(p.v);
        root.appendChild(svg("circle", { cx: cx, cy: cy, r: 4, fill: C.line, stroke: "#fff", "stroke-width": 2 }));
        var hit = svg("circle", { cx: cx, cy: cy, r: 12, fill: "transparent", tabindex: 0, class: "hit", role: "img",
          "aria-label": fmtFull.format(new Date(p.s.end)) + ", " + (p.label || "") + ", " + (opt.fmt ? opt.fmt(p.v) : nf(p.v)) });
        bindTip(hit, box, function () { return cx; }, function () { return cy; }, sessionTip(p.s));
        root.appendChild(hit);
      });
      // valeur finale en étiquette directe
      var lp = points[points.length - 1];
      if (lp) {
        var lt = svg("text", { x: X(points.length - 1) + 8, y: Y(lp.v) + 4, class: "endval" });
        lt.textContent = opt.fmt ? opt.fmt(lp.v) : nf(lp.v);
        root.appendChild(lt);
      }
      box.appendChild(root);
    });
  }

  function niceTicks(min, max, n) {
    var span = max - min || 1;
    var step = Math.pow(10, Math.floor(Math.log10(span / n)));
    var err = (n * step) / span;
    if (err <= 0.15) step *= 10; else if (err <= 0.35) step *= 5; else if (err <= 0.75) step *= 2;
    var out = [];
    for (var v = Math.floor(min / step) * step; v <= max + step * 0.5; v += step) out.push(Math.round(v));
    return out;
  }

  function sessionTip(s) {
    var rows = [];
    rows.push("<strong>" + esc(fmtLong.format(new Date(s.end))) + "</strong> à " + esc(fmtTime.format(new Date(s.end))));
    if (s.level) rows.push("Niveau : " + esc(s.level));
    if (s.acc !== null && s.acc !== undefined) rows.push("Précision : " + nf(s.acc) + " %");
    if (s.rt) rows.push("Temps de réaction : " + nf(s.rt) + " ms");
    if (s.score !== null && s.score !== undefined) rows.push("Score : " + nf(s.score));
    if (s.dur) rows.push("Durée : " + durTxt(s.dur));
    return rows.join("<br>");
  }

  /* ---------- Barres : minutes par semaine ---------- */
  function weeklyBars(box, sessions, weeks) {
    var start = mondayOf(new Date(Date.now() - (weeks - 1) * 7 * DAY));
    var data = [];
    for (var i = 0; i < weeks; i++) data.push({ from: new Date(start.getTime() + i * 7 * DAY), min: 0, n: 0, days: {} });
    sessions.forEach(function (s) {
      var t = new Date(s.end).getTime();
      var idx = Math.floor((t - start.getTime()) / (7 * DAY));
      if (idx >= 0 && idx < weeks) { data[idx].min += minutes(s.dur); data[idx].n++; data[idx].days[key(s.end)] = 1; }
    });
    observe(box, function () {
      box.innerHTML = "";
      var W = Math.max(260, box.clientWidth), H = 220;
      var m = { l: 40, r: 12, t: 14, b: 26 };
      var iw = W - m.l - m.r, ih = H - m.t - m.b;
      var maxV = Math.max(110, Math.max.apply(null, data.map(function (d) { return d.min; })) * 1.1);
      var ticks = niceTicks(0, maxV, 4);
      maxV = ticks[ticks.length - 1];
      function Y(v) { return m.t + ih - (v / maxV) * ih; }
      var root = svg("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "group",
        "aria-label": "Minutes d'entraînement par semaine sur " + weeks + " semaines" });
      // bande objectif 75–100 min
      root.appendChild(svg("rect", { x: m.l, width: iw, y: Y(100), height: Y(75) - Y(100), fill: C.band }));
      var bl = svg("text", { x: W - m.r - 4, y: Y(100) - 5, "text-anchor": "end", class: "band-label" });
      bl.textContent = "Objectif : 75 à 100 min";
      root.appendChild(bl);
      ticks.forEach(function (t) {
        root.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: Y(t), y2: Y(t), stroke: C.grid, "stroke-width": 1 }));
        var tx = svg("text", { x: m.l - 8, y: Y(t) + 4, "text-anchor": "end", class: "tick" });
        tx.textContent = nf(t);
        root.appendChild(tx);
      });
      var slot = iw / weeks, bw = Math.min(44, slot - 10);
      data.forEach(function (d, i) {
        var x = m.l + i * slot + (slot - bw) / 2;
        var h = Y(0) - Y(d.min);
        if (d.min > 0) {
          var r = Math.min(4, h / 2, bw / 2);
          var p = "M" + x + " " + Y(0) + "V" + (Y(d.min) + r) + "Q" + x + " " + Y(d.min) + " " + (x + r) + " " + Y(d.min) +
            "H" + (x + bw - r) + "Q" + (x + bw) + " " + Y(d.min) + " " + (x + bw) + " " + (Y(d.min) + r) + "V" + Y(0) + "Z";
          root.appendChild(svg("path", { d: p, fill: C.line }));
        }
        var skip = slot < 56 ? 2 : 1;
        if ((weeks - 1 - i) % skip === 0) {
          var isLast = i === weeks - 1;
          var lab = svg("text", { x: isLast && skip > 1 ? x + bw : x + bw / 2, y: H - 6, "text-anchor": isLast && skip > 1 ? "end" : "middle", class: "tick" });
          lab.textContent = isLast ? "Cette sem." : fmtDay.format(d.from);
          root.appendChild(lab);
        }
        var hit = svg("rect", { x: m.l + i * slot, y: m.t, width: slot, height: ih, fill: "transparent", tabindex: 0, class: "hit", role: "img",
          "aria-label": "Semaine du " + fmtDay.format(d.from) + " : " + nf(d.min) + " minutes" });
        var html = "<strong>Semaine du " + esc(fmtDay.format(d.from)) + "</strong><br>" + nf(d.min) + " min d'entraînement<br>" +
          Object.keys(d.days).length + " jour" + (Object.keys(d.days).length > 1 ? "s" : "") + ", " + d.n + " partie" + (d.n > 1 ? "s" : "");
        bindTip(hit, box, function () { return x + bw / 2; }, function () { return Y(d.min); }, html);
        root.appendChild(hit);
      });
      root.appendChild(svg("line", { x1: m.l, x2: W - m.r, y1: Y(0), y2: Y(0), stroke: "#B9C7CB", "stroke-width": 1 }));
      var last = data[weeks - 1];
      if (last.min > 0) {
        var vx = m.l + (weeks - 1) * slot + slot / 2;
        var vt = svg("text", { x: vx, y: Y(last.min) - 6, "text-anchor": "middle", class: "endval" });
        vt.textContent = nf(last.min) + " min";
        root.appendChild(vt);
      }
      box.appendChild(root);
    });
  }

  /* ---------- Calendrier de régularité (4 semaines) ---------- */
  function heatmap(box, sessions) {
    var byDay = {};
    sessions.forEach(function (s) {
      var k = key(s.end);
      byDay[k] = byDay[k] || { min: 0, n: 0 };
      byDay[k].min += minutes(s.dur);
      byDay[k].n++;
    });
    var start = mondayOf(new Date(Date.now() - 21 * DAY));
    var today = key(new Date());
    var grid = el("div", { class: "heat", role: "group", "aria-label": "Jours d'entraînement sur les quatre dernières semaines" });
    ["L", "M", "M", "J", "V", "S", "D"].forEach(function (d, i) {
      grid.appendChild(el("span", { class: "heat-head", "aria-hidden": "true", text: d }));
    });
    for (var i = 0; i < 28; i++) {
      var date = new Date(start.getTime() + i * DAY);
      var k = key(date);
      var info = byDay[k];
      var future = date.getTime() > Date.now();
      var lvl = !info ? 0 : info.min >= 20 ? 3 : info.min >= 10 ? 2 : 1;
      var cell = el("span", { class: "heat-cell" + (k === today ? " is-today" : "") + (future ? " is-future" : ""), tabindex: future ? "-1" : "0",
        role: "img",
        "aria-label": fmtLong.format(date) + (info ? " : " + nf(info.min) + " min, " + info.n + " partie" + (info.n > 1 ? "s" : "") : " : pas d'entraînement") });
      cell.style.background = future ? "transparent" : C.heat[lvl];
      (function (cell, date, info) {
        var html = "<strong>" + esc(fmtLong.format(date)) + "</strong><br>" +
          (info ? nf(info.min) + " min, " + info.n + " partie" + (info.n > 1 ? "s" : "") : "Pas d'entraînement");
        cell.addEventListener("mouseenter", function () { var r = cell.getBoundingClientRect(), g = grid.getBoundingClientRect(); showTip(grid, r.left - g.left + r.width / 2, r.top - g.top, html); });
        cell.addEventListener("focus", function () { var r = cell.getBoundingClientRect(), g = grid.getBoundingClientRect(); showTip(grid, r.left - g.left + r.width / 2, r.top - g.top, html); });
        cell.addEventListener("mouseleave", hideTip);
        cell.addEventListener("blur", hideTip);
      })(cell, date, info);
      grid.appendChild(cell);
    }
    box.innerHTML = "";
    box.appendChild(grid);
    var legend = el("ul", { class: "heat-legend", role: "list" });
    [["Aucune partie", 0], ["Moins de 10 min", 1], ["10 à 19 min", 2], ["20 min et plus", 3]].forEach(function (l) {
      var li = el("li");
      var sw = el("span", { class: "sw" });
      sw.style.background = C.heat[l[1]];
      li.appendChild(sw);
      li.appendChild(document.createTextNode(l[0]));
      legend.appendChild(li);
    });
    box.appendChild(legend);
  }

  /* ---------- Regroupement par jeu et exercice ---------- */
  function groups(sessions) {
    var map = {}, order = [];
    sessions.forEach(function (s) {
      var k = s.game + "|" + (s.ex || "");
      if (!map[k]) { map[k] = { game: s.game, ex: s.ex || "", list: [] }; order.push(k); }
      map[k].list.push(s);
    });
    return order.map(function (k) { return map[k]; }).sort(function (a, b) {
      return b.list[b.list.length - 1].end < a.list[a.list.length - 1].end ? -1 : 1;
    });
  }

  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : null; }

  /* ---------- Rendu complet ---------- */
  function render(target, opts) {
    observers.forEach(function (o) { o.disconnect(); });
    observers = [];
    hideTip();
    var sessions = (opts.sessions || []).slice().sort(function (a, b) { return a.end < b.end ? -1 : 1; });
    target.innerHTML = "";
    if (!sessions.length) {
      target.appendChild(el("div", { class: "empty" },
        "<h2>Aucune partie enregistrée pour l’instant</h2><p>Les parties des jeux NeuroBreizh jouées sur cet appareil s’afficheront ici, avec leurs courbes de progression.</p>" +
        '<p><a class="btn btn-primary" href="' + esc(opts.gamesUrl || "../jeux/") + '">Choisir un jeu</a></p>'));
      return;
    }

    // Tuiles
    var now = Date.now();
    var weekStart = mondayOf(new Date()).getTime();
    var thisWeek = sessions.filter(function (s) { return Date.parse(s.end) >= weekStart; });
    var last7 = {};
    sessions.forEach(function (s) { if (now - Date.parse(s.end) < 7 * DAY) last7[key(s.end)] = 1; });
    var minWeek = thisWeek.reduce(function (a, s) { return a + minutes(s.dur); }, 0);
    var tiles = el("ul", { class: "tiles", role: "list" });
    tiles.innerHTML =
      '<li class="tile"><span class="tile-label">Cette semaine</span><span class="tile-value">' + nf(minWeek) + ' min</span><span class="tile-sub">Objectif du suivi : 75 à 100 min</span></li>' +
      '<li class="tile"><span class="tile-label">Jours d’entraînement, 7 derniers jours</span><span class="tile-value">' + Object.keys(last7).length + ' sur 7</span><span class="tile-sub">Objectif : 5 jours</span></li>' +
      '<li class="tile"><span class="tile-label">Parties enregistrées</span><span class="tile-value">' + nf(sessions.length) + '</span><span class="tile-sub">Depuis le ' + esc(fmtFull.format(new Date(sessions[0].end))) + "</span></li>";
    target.appendChild(tiles);

    // Régularité
    var reg = el("section", { class: "suivi-block", "aria-labelledby": "reg-t" });
    reg.innerHTML = '<div class="suivi-split"><div><h2 id="reg-t">Régularité</h2><p class="muted small">Les quatre dernières semaines. Un peu chaque jour vaut mieux que beaucoup en une fois.</p><div class="heat-box"></div></div>' +
      '<div><h2 id="sem-t">Minutes par semaine</h2><p class="muted small">Les huit dernières semaines, avec l’objectif du suivi en fond.</p><div class="chart" data-c="weeks"></div></div></div>';
    target.appendChild(reg);
    heatmap(reg.querySelector(".heat-box"), sessions);
    weeklyBars(reg.querySelector('[data-c="weeks"]'), sessions, 8);

    // Par jeu
    var gs = groups(sessions);
    var byGame = el("section", { class: "suivi-block", "aria-labelledby": "jeux-t" });
    byGame.innerHTML = '<h2 id="jeux-t">Progression par jeu</h2><p class="muted small">Chaque point est une partie, de la plus ancienne à la plus récente. Le niveau joué est indiqué quand il change. Survolez ou sélectionnez un point pour le détail.</p>';
    var list = el("div", { class: "game-charts" });
    gs.forEach(function (g) {
      var mainIsAcc = (GAMES[g.game] || {}).main !== "score";
      var pts = g.list.filter(function (s) { return mainIsAcc ? s.acc !== null && s.acc !== undefined : s.score !== null; })
        .map(function (s) { return { v: mainIsAcc ? s.acc : s.score, label: s.level, s: s }; });
      var card = el("article", { class: "game-chart" });
      var title = gameName(g.game) + (g.ex ? ", " + g.ex : "");
      var lastS = g.list[g.list.length - 1];
      card.innerHTML = '<header><h3>' + esc(gameName(g.game)) + (g.ex ? ' <span class="ex">' + esc(g.ex) + "</span>" : "") + '</h3><p class="fn">' + esc(gameFn(g.game)) + ", " +
        g.list.length + " partie" + (g.list.length > 1 ? "s" : "") + ", dernier niveau : " + esc(lastS.level || "–") + "</p></header>" +
        '<p class="chart-title">' + (mainIsAcc ? "Précision (%)" : "Score") + '</p><div class="chart"></div>';
      list.appendChild(card);
      if (pts.length) {
        lineChart(card.querySelector(".chart"), pts, mainIsAcc
          ? { min: 0, max: 100, ticks: [0, 25, 50, 75, 100], fmt: function (v) { return nf(v) + " %"; }, aria: "Précision au fil des parties, " + title }
          : { min: 0, fmt: function (v) { return nf(v); }, aria: "Score au fil des parties, " + title });
      }
      var rts = g.list.filter(function (s) { return s.rt; }).map(function (s) { return { v: s.rt, label: s.level, s: s }; });
      if (rts.length) {
        var rtT = el("p", { class: "chart-title", text: "Temps de réaction moyen (ms), plus bas = plus rapide" });
        var rtBox = el("div", { class: "chart" });
        card.appendChild(rtT);
        card.appendChild(rtBox);
        lineChart(rtBox, rts, { min: 0, height: 150, fmt: function (v) { return nf(v); }, aria: "Temps de réaction au fil des parties, " + title });
      }
    });
    byGame.appendChild(list);
    target.appendChild(byGame);

    // Synthèse (praticien)
    if (opts.mode === "praticien") {
      var syn = el("section", { class: "suivi-block", "aria-labelledby": "syn-t" });
      var rows = [];
      gs.forEach(function (g) {
        var lv = {};
        g.list.forEach(function (s) { (lv[s.level || "–"] = lv[s.level || "–"] || []).push(s); });
        Object.keys(lv).forEach(function (l) {
          var a = lv[l];
          var accs = a.filter(function (s) { return s.acc !== null && s.acc !== undefined; }).map(function (s) { return s.acc; });
          var rts = a.filter(function (s) { return s.rt; }).map(function (s) { return s.rt; });
          var f3 = mean(accs.slice(0, 3)), l3 = mean(accs.slice(-3));
          var rf = mean(rts.slice(0, 3)), rl = mean(rts.slice(-3));
          rows.push("<tr><th scope=\"row\">" + esc(gameName(g.game)) + (g.ex ? ", " + esc(g.ex) : "") + "</th><td>" + esc(l) + "</td><td class=\"num\">" + a.length +
            "</td><td class=\"num\">" + (f3 === null ? "–" : nf(f3) + " %") + "</td><td class=\"num\">" + (l3 === null ? "–" : nf(l3) + " %") +
            "</td><td class=\"num\">" + (f3 === null || accs.length < 2 ? "–" : (l3 - f3 >= 0 ? "+" : "−") + nf(Math.abs(l3 - f3)) + " pts") +
            "</td><td class=\"num\">" + (rf === null ? "–" : nf(rf) + " → " + nf(rl) + " ms") + "</td></tr>");
        });
      });
      syn.innerHTML = '<h2 id="syn-t">Synthèse par jeu et par niveau</h2><p class="muted small">Moyenne des trois premières et des trois dernières parties à un même niveau. Ces scores ne sont pas normés : ils décrivent une évolution individuelle, pas une performance.</p>' +
        '<div class="table-scroll" tabindex="0" role="region" aria-label="Tableau de synthèse, défilable"><table class="data"><thead><tr><th scope="col">Jeu</th><th scope="col">Niveau</th><th scope="col" class="num">Parties</th><th scope="col" class="num">Précision au début</th><th scope="col" class="num">Précision récente</th><th scope="col" class="num">Évolution</th><th scope="col" class="num">Temps de réaction</th></tr></thead><tbody>' +
        rows.join("") + "</tbody></table></div>";
      target.appendChild(syn);
    }

    // Tableau complet
    var tbl = el("details", { class: "suivi-block all-sessions" });
    var trs = sessions.slice().reverse().map(function (s) {
      var det = Object.keys(s.det || {}).map(function (k) { return esc(k) + " : " + esc(s.det[k]); }).join(" ; ");
      return "<tr><td>" + esc(fmtFull.format(new Date(s.end))) + " " + esc(fmtTime.format(new Date(s.end))) + "</td><td>" + esc(gameName(s.game)) + (s.ex ? ", " + esc(s.ex) : "") +
        "</td><td>" + esc(s.level || "–") + "</td><td class=\"num\">" + durTxt(s.dur) + "</td><td class=\"num\">" + nf(s.score) + "</td><td class=\"num\">" +
        (s.acc === null || s.acc === undefined ? "–" : nf(s.acc) + " %") + "</td><td class=\"num\">" + (s.rt ? nf(s.rt) + " ms" : "–") + "</td><td class=\"det\">" + det + "</td></tr>";
    }).join("");
    tbl.innerHTML = "<summary>Toutes les parties (" + sessions.length + ")</summary>" +
      '<div class="table-scroll" tabindex="0" role="region" aria-label="Tableau de toutes les parties, défilable"><table class="data"><thead><tr><th scope="col">Date</th><th scope="col">Jeu</th><th scope="col">Niveau</th><th scope="col" class="num">Durée</th><th scope="col" class="num">Score</th><th scope="col" class="num">Précision</th><th scope="col" class="num">Temps de réaction</th><th scope="col">Détails</th></tr></thead><tbody>' +
      trs + "</tbody></table></div>";
    target.appendChild(tbl);
  }

  function download(obj, filename) {
    var blob = new Blob([JSON.stringify(obj, null, 1)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = el("a", { href: url, download: filename });
    document.body.appendChild(a);
    a.click();
    window.setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  function slug(s) {
    return String(s || "profil").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "profil";
  }

  window.NBVue = { render: render, download: download, slug: slug, fmtFull: fmtFull };
})();
