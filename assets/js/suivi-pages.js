/* NeuroBreizh — logique des pages « Mon suivi » et « Espace praticien » */
(function () {
  "use strict";
  var S = window.NBSuivi, V = window.NBVue;
  if (!S || !V) return;
  document.body.setAttribute("data-suivi-page", "");
  var page = document.querySelector("[data-suivi]");
  if (!page) return;
  var app = document.getElementById("suivi-app");
  var status = document.getElementById("suivi-status");
  function say(msg) { if (status) { status.textContent = ""; window.setTimeout(function () { status.textContent = msg; }, 30); } }

  /* ================= Page patient ================= */
  if (page.getAttribute("data-suivi") === "patient") {
    var select = document.getElementById("profile-select");
    var nameIn = document.getElementById("profile-name");
    var form = document.getElementById("profile-form");
    var addBtn = document.getElementById("profile-add");
    var exportBtn = document.getElementById("export-btn");
    var importIn = document.getElementById("import-file");
    var delBtn = document.getElementById("delete-btn");
    var delCancel = document.getElementById("delete-cancel");
    var warn = document.getElementById("storage-warning");
    var gamesUrl = page.getAttribute("data-games") || "../jeux/";

    if (!S.storageAvailable() && warn) warn.hidden = false;

    function refresh() {
      var ps = S.profiles();
      var active = S.activeProfile();
      select.innerHTML = "";
      ps.forEach(function (p) {
        var o = document.createElement("option");
        o.value = p.id;
        o.textContent = p.name || "Profil sans nom";
        if (active && p.id === active.id) o.selected = true;
        select.appendChild(o);
      });
      select.parentNode.hidden = ps.length < 2;
      nameIn.value = active ? active.name : "";
      exportBtn.disabled = !active || !S.sessionsFor(active.id).length;
      delBtn.hidden = !active;
      V.render(app, { sessions: active ? S.sessionsFor(active.id) : [], mode: "patient", gamesUrl: gamesUrl });
    }

    select.addEventListener("change", function () { S.setActive(select.value); refresh(); say("Profil affiché : " + (select.options[select.selectedIndex].text)); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var active = S.activeProfile();
      if (active) S.renameProfile(active.id, nameIn.value); else S.createProfile(nameIn.value);
      refresh();
      say("Profil enregistré.");
    });
    addBtn.addEventListener("click", function () {
      S.createProfile("");
      refresh();
      nameIn.focus();
      say("Nouveau profil créé. Indiquez un prénom ou un code, puis enregistrez.");
    });
    exportBtn.addEventListener("click", function () {
      var active = S.activeProfile();
      if (!active) return;
      var data = S.exportData(active.id);
      var d = new Date();
      var stamp = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      V.download(data, "suivi-neurobreizh-" + V.slug(active.name) + "-" + stamp + ".json");
      say("Fichier exporté. Apportez-le ou envoyez-le au cabinet avant la séance.");
    });
    importIn.addEventListener("change", function () {
      var f = importIn.files && importIn.files[0];
      if (!f) return;
      f.text().then(function (txt) {
        var obj = S.parseExport(txt);
        var res = S.importData(obj);
        refresh();
        say(res.added + " partie" + (res.added > 1 ? "s" : "") + " importée" + (res.added > 1 ? "s" : "") + " dans le profil " + (res.profile.name || "sans nom") + ".");
      }).catch(function (err) {
        say(err && err.message && err.message.indexOf("NeuroBreizh") >= 0 ? err.message : "Ce fichier n’a pas pu être lu. Choisissez un fichier exporté depuis Mon suivi.");
      });
      importIn.value = "";
    });
    var armed = false;
    delBtn.addEventListener("click", function () {
      var active = S.activeProfile();
      if (!active) return;
      if (!armed) {
        armed = true;
        delBtn.textContent = "Confirmer la suppression de ce profil";
        delBtn.classList.add("btn-danger");
        delCancel.hidden = false;
        say("Toutes les parties de ce profil seront effacées de cet appareil. Exportez-les d’abord si vous voulez les garder.");
        return;
      }
      S.deleteProfile(active.id);
      disarm();
      refresh();
      say("Profil supprimé.");
    });
    function disarm() {
      armed = false;
      delBtn.textContent = "Supprimer ce profil";
      delBtn.classList.remove("btn-danger");
      delCancel.hidden = true;
    }
    delCancel.addEventListener("click", function () { disarm(); say("Suppression annulée."); delBtn.focus(); });

    window.addEventListener("storage", function (e) { if (e.key === "nb-suivi") refresh(); });
    refresh();
  }

  /* ================= Espace praticien ================= */
  if (page.getAttribute("data-suivi") === "praticien") {
    var input = document.getElementById("praticien-files");
    var drop = document.getElementById("dropzone");
    var tabs = document.getElementById("patients");
    var demoBtn = document.getElementById("demo-btn");
    var printBtn = document.getElementById("print-btn");
    var head = document.getElementById("patient-head");
    var patients = [];
    var current = -1;

    function show(i) {
      current = i;
      var p = patients[i];
      tabs.querySelectorAll("button").forEach(function (b, j) { b.setAttribute("aria-pressed", String(j === i)); });
      var first = p.sessions.length ? p.sessions.reduce(function (a, s) { return s.end < a ? s.end : a; }, p.sessions[0].end) : null;
      head.hidden = false;
      head.querySelector("h2").textContent = p.name || "Profil sans nom";
      head.querySelector("p").textContent = p.sessions.length + " parties" + (first ? ", depuis le " + V.fmtFull.format(new Date(first)) : "") +
        (p.exported ? ". Fichier exporté le " + V.fmtFull.format(new Date(p.exported)) + "." : ".") + (p.demo ? " Données fictives, pour l’exemple." : "");
      printBtn.hidden = false;
      V.render(app, { sessions: p.sessions, mode: "praticien" });
    }

    function renderTabs() {
      tabs.innerHTML = "";
      patients.forEach(function (p, i) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "patient-tab";
        b.textContent = (p.name || "Profil sans nom") + (p.demo ? " (exemple)" : "");
        b.addEventListener("click", function () { show(i); });
        tabs.appendChild(b);
      });
      tabs.hidden = patients.length < 2;
    }

    function addPatient(p) {
      var idx = -1;
      patients.forEach(function (q, i) { if (q.name === p.name && !q.demo && !p.demo) idx = i; });
      if (idx >= 0) patients[idx] = p; else { patients.push(p); idx = patients.length - 1; }
      renderTabs();
      show(idx);
    }

    function readFiles(files) {
      Array.prototype.forEach.call(files, function (f) {
        f.text().then(function (txt) {
          var obj = S.parseExport(txt);
          addPatient({ name: obj.profile && obj.profile.name, exported: obj.exported, sessions: obj.sessions });
          say("Fichier ouvert : " + f.name);
        }).catch(function () {
          say("Le fichier " + f.name + " n’est pas un export de suivi NeuroBreizh.");
        });
      });
    }

    input.addEventListener("change", function () { readFiles(input.files); input.value = ""; });
    ["dragenter", "dragover"].forEach(function (t) {
      drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add("is-over"); });
    });
    ["dragleave", "drop"].forEach(function (t) {
      drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.remove("is-over"); });
    });
    drop.addEventListener("drop", function (e) { if (e.dataTransfer && e.dataTransfer.files) readFiles(e.dataTransfer.files); });
    printBtn.addEventListener("click", function () { try { window.print(); } catch (e) { /* impression indisponible */ } });
    demoBtn.addEventListener("click", function () {
      addPatient({ name: "Exemple fictif", demo: true, sessions: demo() });
      say("Exemple fictif affiché.");
    });
  }

  /* Données fictives pour l'exemple : six semaines d'un suivi régulier */
  function demo() {
    var seed = 7;
    function r() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
    var out = [];
    var start = new Date();
    start.setHours(17, 30, 0, 0);
    start = new Date(start.getTime() - 41 * 86400000);
    var plan = [
      { game: "reflexes-controle", ex: "", levels: ["Facile", "Moyen"], acc: [68, 88], rt: [640, 540] },
      { game: "fee-jardins", ex: "", levels: ["Novice", "Initié"], acc: [52, 76], rt: null },
      { game: "station-mnemos", ex: "N-Back", levels: ["Débutant", "Pilote"], acc: [58, 81], rt: null },
      { game: "ma-journee", ex: "Planning", levels: ["Facile"], acc: [60, 84], rt: null },
      { game: "hermine-psy", ex: "Identifier", levels: ["Facile", "Moyen"], acc: [74, 90], rt: [1480, 1120] }
    ];
    for (var d = 0; d < 42; d++) {
      var date = new Date(start.getTime() + d * 86400000);
      var wd = date.getDay();
      if ((wd === 0 && r() < 0.8) || (wd === 6 && r() < 0.5) || r() < 0.12) continue;
      var progress = d / 41;
      var n = 2 + Math.floor(r() * 2);
      for (var k = 0; k < n; k++) {
        var g = plan[(d + k * 2) % plan.length];
        var lvl = g.levels[progress > 0.5 && g.levels.length > 1 ? 1 : 0];
        var base = g.acc[0] + (g.acc[1] - g.acc[0]) * progress - (lvl === g.levels[1] && progress < 0.62 ? 8 : 0);
        var acc = Math.max(20, Math.min(100, Math.round(base + (r() - 0.5) * 14)));
        var t = new Date(date.getTime() + k * 7 * 60000);
        out.push({
          id: "demo" + d + "-" + k, game: g.game, ex: g.ex, level: lvl, end: t.toISOString(),
          dur: 300 + Math.round(r() * 240), score: Math.round(acc * 12 + r() * 200), acc: acc,
          rt: g.rt ? Math.round(g.rt[0] + (g.rt[1] - g.rt[0]) * progress + (r() - 0.5) * 80) : null,
          err: Math.round((100 - acc) / 8), ok: Math.round(acc / 6), det: {}
        });
      }
    }
    return out;
  }
})();
