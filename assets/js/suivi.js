/* NeuroBreizh — carnet de suivi local
   Les résultats des jeux sont enregistrés uniquement dans le navigateur
   (localStorage). Rien n'est envoyé sur Internet. */
(function () {
  "use strict";
  var KEY = "nb-suivi";
  var MAX_SESSIONS = 6000;

  var GAMES = {
    "reflexes-controle": { name: "Réflexes & Contrôle", fn: "Inhibition", main: "acc" },
    "fee-jardins": { name: "La Fée des Deux Jardins", fn: "Attention divisée", main: "acc" },
    "station-mnemos": { name: "Station Mnémos", fn: "Mémoire de travail", main: "acc" },
    "donjon-des-regles": { name: "Le Donjon des Règles", fn: "Flexibilité cognitive", main: "score" },
    "oreille-musicale": { name: "L'Oreille Musicale", fn: "Attention auditive", main: "acc" },
    "ma-journee": { name: "Ma Journée", fn: "Planification", main: "acc" },
    "hermine-psy": { name: "Hermine ψ", fn: "Vitesse de traitement", main: "acc" }
  };

  var memory = null; // repli si le stockage local est indisponible
  var starts = {};

  function emptyStore() {
    return { v: 1, active: null, profiles: {}, sessions: [] };
  }

  function load() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return memory || emptyStore();
      var data = JSON.parse(raw);
      if (!data || data.v !== 1 || !Array.isArray(data.sessions)) return emptyStore();
      return data;
    } catch (e) {
      return memory || emptyStore();
    }
  }

  function save(data) {
    if (data.sessions.length > MAX_SESSIONS) data.sessions = data.sessions.slice(-MAX_SESSIONS);
    memory = data;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      return false;
    }
  }

  function storageAvailable() {
    try {
      var k = KEY + "-test";
      window.localStorage.setItem(k, "1");
      window.localStorage.removeItem(k);
      return true;
    } catch (e) {
      return false;
    }
  }

  function uid(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function cleanLevel(label) {
    if (!label) return "";
    return String(label).replace(/[♾∞]/g, "").replace(/\s+/g, " ").trim();
  }

  function num(v) {
    if (v === null || v === undefined || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function ensureProfile(data) {
    if (data.active && data.profiles[data.active]) return data.profiles[data.active];
    var ids = Object.keys(data.profiles);
    if (ids.length) {
      data.active = ids[0];
      return data.profiles[ids[0]];
    }
    var p = { id: uid("p"), name: "", created: new Date().toISOString() };
    data.profiles[p.id] = p;
    data.active = p.id;
    return p;
  }

  function start(game) {
    starts[game] = Date.now();
  }

  function record(r) {
    if (!r || !r.game) return null;
    // Partie vide (aucune réponse) : rien à enregistrer
    if (num(r.correct) === 0 && num(r.errors) === 0 && !num(r.score)) return null;
    var data = load();
    // Garde-fou : une même fin de partie signalée deux fois
    var last = data.sessions[data.sessions.length - 1];
    if (last && last.game === r.game && Date.now() - Date.parse(last.end) < 2000) return null;
    var profile = ensureProfile(data);
    var now = Date.now();
    var t0 = starts[r.game];
    var dur = t0 ? Math.round((now - t0) / 1000) : null;
    if (dur !== null && (dur < 0 || dur > 4 * 3600)) dur = null;
    delete starts[r.game];
    var s = {
      id: uid("s"),
      p: profile.id,
      game: r.game,
      ex: r.exercise || "",
      level: cleanLevel(r.level),
      end: new Date(now).toISOString(),
      dur: dur,
      score: num(r.score),
      acc: num(r.accuracy),
      rt: num(r.rt),
      err: num(r.errors),
      ok: num(r.correct),
      det: r.details || {}
    };
    data.sessions.push(s);
    var stored = save(data);
    notify(profile, stored);
    return s;
  }

  /* Petit message dans les jeux : la partie est enregistrée */
  function notify(profile, stored) {
    if (!document.body || document.body.hasAttribute("data-suivi-page")) return;
    var old = document.getElementById("nb-suivi-toast");
    if (old) old.remove();
    var box = document.createElement("div");
    box.id = "nb-suivi-toast";
    box.setAttribute("role", "status");
    box.style.cssText = [
      "position:fixed", "left:16px", "bottom:16px", "z-index:2147483000",
      "max-width:calc(100vw - 32px)", "padding:10px 14px", "border-radius:10px",
      "background:#15283F", "color:#fff", "box-shadow:0 8px 24px rgba(0,0,0,.35)",
      "font:600 14px/1.4 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif",
      "display:flex", "gap:12px", "align-items:center"
    ].join(";");
    var who = profile && profile.name ? " pour " + profile.name : "";
    var text = document.createElement("span");
    text.textContent = stored
      ? "Partie enregistrée dans Mon suivi" + who + "."
      : "Partie terminée. Ce navigateur ne permet pas de l’enregistrer.";
    box.appendChild(text);
    if (stored) {
      var a = document.createElement("a");
      a.href = suiviUrl();
      a.textContent = "Voir";
      a.style.cssText = "color:#8FCBCF;text-decoration:underline;text-underline-offset:3px";
      box.appendChild(a);
    }
    var close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Fermer");
    close.textContent = "×";
    close.style.cssText = "background:none;border:0;color:#fff;font-size:20px;line-height:1;cursor:pointer;padding:0 2px;min-width:24px;min-height:24px";
    close.onclick = function () { box.remove(); };
    box.appendChild(close);
    document.body.appendChild(box);
    window.setTimeout(function () { if (box.parentNode) box.remove(); }, 7000);
  }

  function suiviUrl() {
    var p = window.location.pathname;
    var i = p.indexOf("/jeux/");
    return i >= 0 ? p.slice(0, i) + "/suivi/index.html" : "../../suivi/index.html";
  }

  /* Profils */
  function profiles() {
    var data = load();
    return Object.keys(data.profiles).map(function (id) { return data.profiles[id]; });
  }
  function activeProfile() {
    var data = load();
    return data.active && data.profiles[data.active] ? data.profiles[data.active] : null;
  }
  function createProfile(name) {
    var data = load();
    var p = { id: uid("p"), name: String(name || "").trim().slice(0, 40), created: new Date().toISOString() };
    data.profiles[p.id] = p;
    data.active = p.id;
    save(data);
    return p;
  }
  function renameProfile(id, name) {
    var data = load();
    if (!data.profiles[id]) return;
    data.profiles[id].name = String(name || "").trim().slice(0, 40);
    save(data);
  }
  function setActive(id) {
    var data = load();
    if (data.profiles[id]) { data.active = id; save(data); }
  }
  function deleteProfile(id) {
    var data = load();
    delete data.profiles[id];
    data.sessions = data.sessions.filter(function (s) { return s.p !== id; });
    if (data.active === id) data.active = Object.keys(data.profiles)[0] || null;
    save(data);
  }
  function sessionsFor(id) {
    var data = load();
    return data.sessions.filter(function (s) { return s.p === id; });
  }

  /* Export / import */
  function exportData(id) {
    var data = load();
    var p = data.profiles[id];
    if (!p) return null;
    return {
      format: "neurobreizh-suivi",
      v: 1,
      exported: new Date().toISOString(),
      profile: { name: p.name, created: p.created },
      sessions: data.sessions.filter(function (s) { return s.p === id; }).map(function (s) {
        var c = {};
        for (var k in s) if (k !== "p") c[k] = s[k];
        return c;
      })
    };
  }

  function parseExport(text) {
    var obj = JSON.parse(text);
    if (!obj || obj.format !== "neurobreizh-suivi" || !Array.isArray(obj.sessions)) {
      throw new Error("Ce fichier n’est pas un export de suivi NeuroBreizh.");
    }
    obj.sessions = obj.sessions.filter(function (s) { return s && s.game && s.end; });
    return obj;
  }

  function importData(obj) {
    var data = load();
    var name = (obj.profile && obj.profile.name) || "";
    var target = null;
    Object.keys(data.profiles).forEach(function (id) {
      if (!target && data.profiles[id].name === name) target = data.profiles[id];
    });
    if (!target) {
      target = { id: uid("p"), name: name, created: (obj.profile && obj.profile.created) || new Date().toISOString() };
      data.profiles[target.id] = target;
    }
    var known = {};
    data.sessions.forEach(function (s) { known[s.id] = true; });
    var added = 0;
    obj.sessions.forEach(function (s) {
      if (s.id && known[s.id]) return;
      var c = {};
      for (var k in s) c[k] = s[k];
      c.p = target.id;
      if (!c.id) c.id = uid("s");
      data.sessions.push(c);
      added += 1;
    });
    data.sessions.sort(function (a, b) { return a.end < b.end ? -1 : 1; });
    data.active = target.id;
    save(data);
    return { profile: target, added: added };
  }

  window.NBSuivi = {
    GAMES: GAMES,
    start: start,
    record: record,
    storageAvailable: storageAvailable,
    profiles: profiles,
    activeProfile: activeProfile,
    createProfile: createProfile,
    renameProfile: renameProfile,
    setActive: setActive,
    deleteProfile: deleteProfile,
    sessionsFor: sessionsFor,
    exportData: exportData,
    parseExport: parseExport,
    importData: importData
  };
})();
