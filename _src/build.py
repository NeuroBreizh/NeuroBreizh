#!/usr/bin/env python3
"""Génère le site NeuroBreizh à partir de _src/pages/*.html et _src/site.json.

Utilisation : python3 _src/build.py   (depuis la racine du dépôt)

Jetons disponibles dans les pages :
  {{root}}            chemin relatif vers la racine du site
  {{cfg:cle}}         valeur de site.json, ou champ jaune « à compléter » si vide
  {{href:booking}}    lien de prise de rendez-vous (ou page contact si vide)
  {{href:phone}}      lien tel: (ou # si vide)
  {{href:email}}      lien mailto: (ou # si vide)
  {{todo:Libellé}}    champ jaune « à compléter » libre
  {{breadcrumb}}      fil d'Ariane de la page
  {{cta}}             bloc d'appel final commun
  {{barrage}}         illustration du héros d'accueil
  {{games:strip}} / {{games:grid}}  listes des jeux
"""
import html
import json
import os
import random
import re
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "_src")
CFG = json.load(open(os.path.join(SRC, "site.json"), encoding="utf-8"))
GAMES = json.load(open(os.path.join(SRC, "games.json"), encoding="utf-8"))

LABELS = {
    "practitioner_1_name": "Prénom Nom du praticien",
    "practitioner_1_id": "n° ADELI ou RPPS",
    "practitioner_2_name": "Prénom Nom",
    "practitioner_2_title": "profession",
    "practitioner_2_id": "n° ADELI ou RPPS",
    "address_street": "Adresse du cabinet",
    "postal_code": "Code postal",
    "phone": "Téléphone",
    "email": "Adresse e-mail",
    "hours": "Jours et horaires",
    "access": "Accès (bus, métro, parking, accessibilité)",
    "siret": "n° SIRET",
    "price_bilan_enfant": "Tarif du bilan enfant",
    "price_bilan_adulte": "Tarif du bilan adulte",
    "price_seance": "Tarif d'une séance",
    "min_age": "Âge minimum",
    "pco_status": "Le cabinet est-il partenaire de la PCO ?",
    "delay_report": "Délai de remise du compte rendu",
    "publisher": "Directeur de la publication",
}

NAV = [
    ("Le bilan", "bilan-neuropsychologique/", "bilan"),
    ("Accompagnements", "accompagnements/", "acc"),
    ("Remédiation et suivi", "remediation-cognitive/", "rem"),
    ("Jeux cognitifs", "jeux/", "jeux"),
    ("Ressources", "ressources/", "res"),
    ("Le cabinet", "cabinet/", "cab"),
]

ERMINE = (
    '<svg class="brand-mark" viewBox="0 0 40 60" aria-hidden="true" focusable="false">'
    '<g fill="currentColor"><circle cx="20" cy="5.2" r="4.2"/><circle cx="11.6" cy="11.6" r="4.2"/>'
    '<circle cx="28.4" cy="11.6" r="4.2"/>'
    '<path d="M20 15.6C21.6 25 25.5 38 31 53L25 48.5L20 58L15 48.5L9 53C14.5 38 18.4 25 20 15.6Z"/></g></svg>'
)


def todo(label):
    return f'<mark class="todo" title="À compléter avant la mise en ligne">[{html.escape(label)}]</mark>'


def cfg(key):
    val = CFG.get(key)
    if val in (None, ""):
        return todo(LABELS.get(key, key))
    return val


def href(kind, root):
    if kind == "booking":
        return CFG.get("booking_url") or f"{root}contact/#rendez-vous"
    if kind == "phone":
        p = CFG.get("phone")
        return "tel:" + re.sub(r"[^\d+]", "", p) if p else "#a-completer"
    if kind == "email":
        e = CFG.get("email")
        return "mailto:" + e if e else "#a-completer"
    return "#"


def barrage_svg():
    """Feuille de barrage : 12 x 8 mouchetures d'hermine, cibles = hermine à trois points."""
    rnd = random.Random(29)
    cols, rows = 10, 7
    cw, ch = 46, 62
    dots_full = [(20, 5.2), (11.6, 11.6), (28.4, 11.6)]
    body = 'M20 15.6C21.6 25 25.5 38 31 53L25 48.5L20 58L15 48.5L9 53C14.5 38 18.4 25 20 15.6Z'
    cells = []
    targets = 0
    for r in range(rows):
        for c in range(cols):
            is_target = rnd.random() < 0.26
            if is_target:
                dots = dots_full
                targets += 1
            else:
                variant = rnd.choice(["no-left", "no-right", "no-top", "no-left", "no-right"])
                dots = {
                    "no-left": [dots_full[0], dots_full[2]],
                    "no-right": [dots_full[0], dots_full[1]],
                    "no-top": [dots_full[1], dots_full[2]],
                }[variant]
            cells.append((r, c, is_target, dots))
    stop = round(targets * 0.62)
    parts = []
    circles = []
    order = 0
    s = 0.66
    for r, c, is_target, dots in cells:
        x = c * cw + (cw - 40 * s) / 2
        y = r * ch + (ch - 60 * s) / 2
        dot_svg = "".join(f'<circle cx="{dx}" cy="{dy}" r="4.2"/>' for dx, dy in dots)
        parts.append(f'<g transform="translate({x:.1f} {y:.1f}) scale({s})">{dot_svg}<path d="{body}"/></g>')
        if is_target and order < stop:
            cx = c * cw + cw / 2 + rnd.uniform(-1.2, 1.2)
            cy = r * ch + ch / 2 + rnd.uniform(-1.2, 1.2)
            rx, ry = 18 + rnd.uniform(-1, 1.5), 24 + rnd.uniform(-1, 1.5)
            a = rnd.uniform(-0.35, 0.35)
            # cercle « à la main » : légère ellipse qui se chevauche en fin de tracé
            d = (
                f"M{cx + rx * 0.15:.1f} {cy - ry:.1f}"
                f"C{cx + rx * 1.05:.1f} {cy - ry * 0.98:.1f} {cx + rx * 1.08:.1f} {cy + ry * 0.92:.1f} {cx + 0.5:.1f} {cy + ry:.1f}"
                f"C{cx - rx * 1.06:.1f} {cy + ry * 1.0:.1f} {cx - rx * 1.04:.1f} {cy - ry * 0.95:.1f} {cx - rx * 0.05:.1f} {cy - ry * 1.02:.1f}"
                f"C{cx + rx * 0.35:.1f} {cy - ry * 1.04:.1f} {cx + rx * 0.6:.1f} {cy - ry * 0.9:.1f} {cx + rx * 0.72:.1f} {cy - ry * 0.78:.1f}"
            )
            circles.append(
                f'<path class="c" pathLength="120" data-order="{order}" d="{d}" '
                f'transform="rotate({a * 20:.1f} {cx:.1f} {cy:.1f})"/>'
            )
            order += 1
    w, h = cols * cw, rows * ch
    svg = (
        f'<svg viewBox="-4 -6 {w + 8} {h + 12}" aria-hidden="true" focusable="false">'
        f'<g class="g">{"".join(parts)}</g>{"".join(circles)}</svg>'
    )
    return svg, order, targets


def games_strip(root):
    items = []
    for g in GAMES:
        items.append(
            f'<li><a class="game-thumb" href="{root}jeux/{g["slug"]}/">'
            f'<img src="{root}assets/img/jeux/{g["slug"]}-600.webp" width="600" height="375" loading="lazy" alt="">'
            f'<span class="name">{g["name"]}</span><span class="fn">{g["function"]}</span></a></li>'
        )
    return '<ul class="games-strip" role="list">' + "".join(items) + "</ul>"


def games_grid(root):
    items = []
    for g in GAMES:
        items.append(
            f'<li class="game-card">'
            f'<img src="{root}assets/img/jeux/{g["slug"]}-600.webp" '
            f'srcset="{root}assets/img/jeux/{g["slug"]}-600.webp 600w, {root}assets/img/jeux/{g["slug"]}-1200.webp 1200w" '
            f'sizes="(min-width: 64em) 22rem, 100vw" width="600" height="375" loading="lazy" alt="Écran d\'accueil du jeu {html.escape(g["name"])}">'
            f'<span class="fn">{g["function"]}</span>'
            f'<h3><a href="{root}jeux/{g["slug"]}/">{g["name"]}</a></h3>'
            f'<p>{g["pitch"]}</p>'
            f'<p class="paradigm">{g["paradigm"]}</p>'
            f"</li>"
        )
    return '<ul class="games-grid" role="list">' + "".join(items) + "</ul>"


def breadcrumb(meta, root):
    crumbs = [("Accueil", "")] + [tuple(c) for c in meta.get("crumbs", [])] + [(meta["short"], None)]
    lis = []
    for name, path in crumbs:
        if path is None:
            lis.append(f'<li><span aria-current="page">{name}</span></li>')
        else:
            lis.append(f'<li><a href="{root}{path}">{name}</a></li>')
    return f'<nav class="breadcrumb" aria-label="Fil d\'Ariane"><ol>{"".join(lis)}</ol></nav>'


def breadcrumb_ld(meta):
    base = CFG["base_url"].rstrip("/") + "/"
    crumbs = [("Accueil", "")] + [tuple(c) for c in meta.get("crumbs", [])] + [(meta["short"], meta["path"])]
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": n, "item": base + p}
            for i, (n, p) in enumerate(crumbs)
        ],
    }


def business_ld():
    base = CFG["base_url"].rstrip("/") + "/"
    ld = {
        "@context": "https://schema.org",
        "@type": "MedicalBusiness",
        "name": "NeuroBreizh",
        "description": "Cabinet de neuropsychologie à Rennes : bilans neuropsychologiques, remédiation cognitive et suivi pour enfants, adolescents et adultes.",
        "url": base,
        "image": base + "assets/img/og.png",
        "logo": base + "assets/img/icon-512.png",
        "areaServed": [{"@type": "City", "name": "Rennes"}, {"@type": "AdministrativeArea", "name": "Ille-et-Vilaine"}],
        "knowsLanguage": "fr",
    }
    addr = {"@type": "PostalAddress", "addressLocality": "Rennes", "addressRegion": "Bretagne", "addressCountry": "FR"}
    if CFG.get("address_street"):
        addr["streetAddress"] = CFG["address_street"]
    if CFG.get("postal_code"):
        addr["postalCode"] = CFG["postal_code"]
    ld["address"] = addr
    if CFG.get("phone"):
        ld["telephone"] = CFG["phone"]
    if CFG.get("email"):
        ld["email"] = CFG["email"]
    return ld


def french_typography(markup):
    """Espaces fines insécables avant : ; ? ! et dans les guillemets, hors balises et scripts."""
    out = []
    in_raw = False
    for chunk in re.split(r"(<[^>]+>)", markup):
        if chunk.startswith("<"):
            low = chunk.lower()
            if low.startswith("<script") or low.startswith("<style"):
                in_raw = True
            elif low.startswith("</script") or low.startswith("</style"):
                in_raw = False
            out.append(chunk)
            continue
        if in_raw or not chunk.strip():
            out.append(chunk)
            continue
        t = chunk.replace("'", "\u2019")
        t = re.sub(r"[ \u00a0]([:;?!])", "\u202f\\1", t)
        t = re.sub(r"«[ \u00a0]?", "«\u202f", t)
        t = re.sub(r"[ \u00a0]?»", "\u202f»", t)
        t = re.sub(r"(\d) (€|%|h\b|min\b|ans\b|mois\b|séances\b|minutes\b|heures\b|semaines\b|jours\b)", "\\1\u00a0\\2", t)
        out.append(t)
    return "".join(out)


def render(meta, body):
    path = meta["path"]
    if path == "404.html":
        root = CFG["base_path"]
    else:
        depth = 0 if path == "" else path.strip("/").count("/") + 1
        root = "./" if depth == 0 else "../" * depth

    svg, found, total = barrage_svg()
    tokens = {
        "{{root}}": root,
        "{{barrage}}": svg,
        "{{barrage_found}}": str(found),
        "{{barrage_total}}": str(total),
        "{{games:strip}}": games_strip(root),
        "{{games:grid}}": games_grid(root),
        "{{breadcrumb}}": breadcrumb(meta, root) if meta.get("short") else "",
        "{{year}}": str(date.today().year),
    }
    cta = open(os.path.join(SRC, "partials", "cta.html"), encoding="utf-8").read()
    body = body.replace("{{cta}}", cta)
    for k, v in tokens.items():
        body = body.replace(k, v)
    body = re.sub(r"\{\{cfg:([a-z0-9_]+)\}\}", lambda m: cfg(m.group(1)), body)
    body = re.sub(r"\{\{href:([a-z]+)\}\}", lambda m: href(m.group(1), root), body)
    body = re.sub(r"\{\{todo:([^}]+)\}\}", lambda m: todo(m.group(1)), body)
    body = body.replace("{{root}}", root)

    base = CFG["base_url"].rstrip("/") + "/"
    canonical = base + (path if path != "404.html" else "")
    title = meta["title"]
    desc = meta["description"]
    section = meta.get("section", "")

    nav_items = []
    for label, p, key in NAV:
        cur = ""
        if path == p:
            cur = ' aria-current="page"'
        elif section == key:
            cur = ' class="is-section"'
        nav_items.append(f'<li><a href="{root}{p}"{cur}>{label}</a></li>')

    lds = list(meta.get("jsonld", []))
    if path == "":
        lds.insert(0, business_ld())
    if meta.get("short") and path != "404.html":
        lds.append(breadcrumb_ld(meta))
    ld_html = "".join(
        f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>' for ld in lds
    )

    robots = '<meta name="robots" content="noindex">' if meta.get("noindex") else ""
    booking_attr = ' rel="noopener"' if CFG.get("booking_url") else ""

    page = f"""<!doctype html>
<html lang="fr" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{html.escape(desc)}">
{robots}<link rel="canonical" href="{canonical}">
<meta name="theme-color" content="#15283F">
<meta property="og:type" content="website">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="NeuroBreizh">
<meta property="og:title" content="{html.escape(meta.get('og_title', title))}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{base}assets/img/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{root}assets/img/favicon.svg" type="image/svg+xml">
<link rel="icon" href="{root}assets/img/favicon-32.png" sizes="32x32" type="image/png">
<link rel="apple-touch-icon" href="{root}assets/img/apple-touch-icon.png">
<link rel="manifest" href="{root}site.webmanifest">
<link rel="preload" href="{root}assets/fonts/dm-serif-display-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{root}assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="{root}assets/css/site.css">
<script>document.documentElement.classList.replace("no-js","js")</script>
{ld_html}
</head>
<body>
<a class="skip-link" href="#contenu">Aller au contenu</a>
<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="{root}" aria-label="NeuroBreizh, accueil">{ERMINE}<span class="brand-name">NeuroBreizh</span></a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav"><span class="nav-toggle-bars"><span></span></span>Menu</button>
    <nav class="site-nav" id="site-nav" aria-label="Navigation principale">
      <ul class="nav-list" role="list">{''.join(nav_items)}</ul>
      <a class="btn btn-primary" href="{href('booking', root)}"{booking_attr}>Prendre rendez-vous</a>
    </nav>
  </div>
</header>
<main id="contenu" tabindex="-1">
{body}
</main>
<footer class="site-footer on-dark">
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <a class="brand" href="{root}">{ERMINE}<span class="brand-name">NeuroBreizh</span></a>
        <p>Neuropsychologie et inclusion en Bretagne. Bilans, remédiation cognitive et suivi pour enfants, adolescents et adultes, à Rennes.</p>
        <address>{cfg('address_street')}<br>{cfg('postal_code')} Rennes</address>
      </div>
      <div class="footer-col">
        <h2>Consulter</h2>
        <ul role="list">
          <li><a href="{root}bilan-neuropsychologique/">Le bilan neuropsychologique</a></li>
          <li><a href="{root}accompagnements/">Accompagnements</a></li>
          <li><a href="{root}remediation-cognitive/">Remédiation et suivi</a></li>
          <li><a href="{root}formation-entreprise/">Formation en entreprise</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h2>S'informer</h2>
        <ul role="list">
          <li><a href="{root}jeux/">Jeux cognitifs</a></li>
          <li><a href="{root}suivi/">Mon suivi</a></li>
          <li><a href="{root}ressources/">Ressources</a></li>
          <li><a href="{root}questions-frequentes/">Questions fréquentes</a></li>
          <li><a href="{root}cabinet/">Le cabinet</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h2>Contact</h2>
        <ul role="list">
          <li><a href="{root}contact/">Venir au cabinet</a></li>
          <li><a href="{href('phone', root)}">{cfg('phone')}</a></li>
          <li><a href="{href('email', root)}">{cfg('email')}</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom">
      <p>Le cabinet ne prend pas en charge les urgences. En cas d'urgence, appelez le 15. Si vous avez des idées suicidaires, appelez le 3114, gratuit et ouvert 24 h sur 24.</p>
      <p><a href="{root}mentions-legales/">Mentions légales</a> &nbsp; <a href="{root}confidentialite/">Confidentialité</a> &nbsp; © {date.today().year} NeuroBreizh</p>
    </div>
  </div>
</footer>
{''.join(f'<script src="{root}{s}" defer></script>' for s in meta.get('scripts', []))}<script src="{root}assets/js/site.js" defer></script>
</body>
</html>
"""
    return french_typography(page)


def main():
    pages_dir = os.path.join(SRC, "pages")
    urls = []
    for name in sorted(os.listdir(pages_dir)):
        if not name.endswith(".html"):
            continue
        raw = open(os.path.join(pages_dir, name), encoding="utf-8").read()
        m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->\s*", raw, re.S)
        meta = json.loads(m.group(1))
        body = raw[m.end():]
        out_html = render(meta, body)
        path = meta["path"]
        if path.endswith(".html"):
            out = os.path.join(ROOT, path)
        else:
            out = os.path.join(ROOT, path, "index.html")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, "w", encoding="utf-8").write(out_html)
        if not meta.get("noindex"):
            urls.append((path, meta.get("priority", "0.6")))
        print("écrit", os.path.relpath(out, ROOT))

    base = CFG["base_url"].rstrip("/") + "/"
    today = date.today().isoformat()
    for g in GAMES:
        urls.append((f"jeux/{g['slug']}/", "0.4"))
    sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for p, pr in urls:
        sm.append(f"  <url><loc>{base}{p}</loc><lastmod>{today}</lastmod><priority>{pr}</priority></url>")
    sm.append("</urlset>")
    open(os.path.join(ROOT, "sitemap.xml"), "w").write("\n".join(sm) + "\n")
    open(os.path.join(ROOT, "robots.txt"), "w").write(f"User-agent: *\nAllow: /\n\nSitemap: {base}sitemap.xml\n")
    print("sitemap.xml :", len(urls), "adresses")


if __name__ == "__main__":
    main()
