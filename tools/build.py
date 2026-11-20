#!/usr/bin/env python3
"""Wir helfen – statischer Seitengenerator (nur Python-Standardbibliothek).

Aufruf im Projektordner:   python3 tools/build.py

Erzeugt alle HTML-Seiten aus
  templates/_layout.html          Grundgerüst (<head>, Skip-Link, <main>, Skripte)
  templates/<seite>.html          Seiteninhalt (+ Meta-Kommentar mit title/description/nav)
  partials/icons.html             SVG-Sprite
  partials/header.html            Kopfbereich inkl. Navigation ({{nav:…}} → aria-current)
  partials/footer.html            Fußbereich ({{footer_themen}}, {{footer_regionen}})
  data/themen.json, data/regionen.json
  content/ratgeber/*.md           Ratgeber-Beiträge (Frontmatter + Markdown-Teilmenge)
                                  → ratgeber/<slug>/index.html, ratgeber/index.html,
                                    data/ratgeber.json (gesammelte Frontmatter, generiert)

Die erzeugten Dateien (index.html, themen/…, fuer-anbieter/…, 404.html …) werden
eingecheckt – das Deployment (Cloudflare Workers Assets) braucht keinen Build.

Platzhalter-Syntax: {{name}}. Unbekannte Platzhalter brechen den Build ab.
"""
import hashlib
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "templates"
PARTIALS = ROOT / "partials"
CONTENT = ROOT / "content" / "ratgeber"
RATGEBER_IMG = "assets/img/ratgeber"
SITE_NAME = "Wir helfen"  # Arbeitstitel – hier zentral ändern; Templates nutzen {{site_name}}
SITE = "https://www.example.org"  # PLATZHALTER-Domain (reserviert) – vor Livegang ersetzen

PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-z0-9_:\-]+)\s*\}\}")
META_RE = re.compile(r"\A<!--meta\n(.*?)\n-->\n", re.S)
NAV_KEYS = ("themen", "ratgeber", "alltag", "anbieter")


# --------------------------------------------------------------------------
# Hilfsfunktionen
# --------------------------------------------------------------------------
def esc(text):
    return html.escape(str(text), quote=True)


def slugify(text):
    text = text.lower()
    for a, b in (("ä", "ae"), ("ö", "oe"), ("ü", "ue"), ("ß", "ss")):
        text = text.replace(a, b)
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-")


def read(path):
    return path.read_text(encoding="utf-8")


def render(text, ctx, source):
    def repl(match):
        key = match.group(1)
        if key not in ctx:
            raise SystemExit(f"FEHLER: Unbekannter Platzhalter {{{{{key}}}}} in {source}")
        return str(ctx[key])
    return PLACEHOLDER_RE.sub(repl, text)


def parse_template(name):
    src = read(TEMPLATES / name)
    match = META_RE.match(src)
    if not match:
        raise SystemExit(f"FEHLER: templates/{name} beginnt nicht mit <!--meta … -->")
    meta = {}
    for line in match.group(1).splitlines():
        if line.strip():
            key, _, value = line.partition(":")
            meta[key.strip()] = value.strip()
    return meta, src[match.end():]


def indent(lines, n):
    pad = " " * n
    return "\n".join(pad + line if line else line for line in lines)


# --------------------------------------------------------------------------
# Bausteine (→ WordPress: template-parts/*.php)
# --------------------------------------------------------------------------
def picture(thema, sizes, css_class, loading="lazy", priority=False):
    """<picture> mit WebP 480/800 + JPG-Fallback 800 (4:5, 800×1000)."""
    base = "/" + thema["bild"]["datei"]
    extra = ' fetchpriority="high"' if priority else ""
    return (
        f'<picture class="{css_class}">\n'
        f'  <source type="image/webp" srcset="{base}-480.webp 480w, {base}-800.webp 800w" sizes="{sizes}">\n'
        f'  <img src="{base}-800.jpg" width="800" height="1000" alt="{esc(thema["bild"]["alt"])}"\n'
        f'       loading="{loading}" decoding="async"{extra}>\n'
        f"</picture>"
    )


CARD_SIZES = "(min-width: 75em) 370px, (min-width: 64em) 30vw, (min-width: 40em) 46vw, 92vw"


def theme_card(t, heading="h3"):
    """Themenkarte (→ template-parts/card-thema.php)."""
    chips = "".join(f"<li>{esc(b)}</li>" for b in t["beispiele"])
    title = esc(t["titel"])
    return f"""<li>
  <article class="card">
{indent(picture(t, CARD_SIZES, "card__media").splitlines(), 4)}
    <div class="card__body">
      <{heading} class="card__title">{title}</{heading}>
      <p class="card__text">{esc(t["kurztext"])}</p>
      <ul class="card__examples" aria-label="Beispiele">
        {chips}
      </ul>
      <div class="card__actions">
        <a class="card__link" href="/?thema={t["slug"]}#anfrage" data-thema="{t["slug"]}">Anliegen beschreiben<span class="visually-hidden">: {title}</span> <svg class="icon" aria-hidden="true"><use href="#icon-arrow"/></svg></a>
        <a class="card__more" href="/themen/{t["slug"]}/">Mehr zum Thema<span class="visually-hidden">: {title}</span></a>
      </div>
    </div>
  </article>
</li>"""


def theme_cards(themen, heading, n):
    return indent("\n".join(theme_card(t, heading) for t in themen).splitlines(), n)


def kategorie_optionen(themen):
    lines = ['<option value="">Bitte wählen</option>']
    lines += [f'<option value="{t["slug"]}">{esc(t["titel"])}</option>' for t in themen]
    lines.append('<option value="sonstiges">Etwas anderes / weiß nicht</option>')
    return indent(lines, 16)


def leistungen_gruppen(themen):
    """Je Kategorie eine Checkbox-Gruppe als umbrechende Chips; JS blendet die passende ein
    (ohne JS: verborgen, Freitext genügt)."""
    blocks = []
    for t in themen:
        items = t["leistungen"] + ["Sonstiges"]
        choices = []
        for i, leistung in enumerate(items, 1):
            value = slugify(leistung) if leistung != "Sonstiges" else "sonstiges"
            choices.append(
                f'  <label class="chip"><input type="checkbox" name="leistungen" value="{value}" '
                f'id="f-l-{t["slug"]}-{i}"> <span>{esc(leistung)}</span></label>'
            )
        blocks.append(
            f'<fieldset class="form-field" data-leistungen="{t["slug"]}" hidden disabled>\n'
            f'  <legend>Was genau? <span class="form-field__hint">(optional)</span></legend>\n'
            f'  <div class="chip-group">\n'
            + indent(choices, 2) + "\n"
            f"  </div>\n"
            f"</fieldset>"
        )
    return indent("\n".join(blocks).splitlines(), 12)


def orte_optionen(regionen):
    return indent([f'<option value="{esc(r["name"])}" data-region="{r["slug"]}"></option>' for r in regionen], 14)


def regionen_text(regionen):
    names = [r["name"] for r in regionen]
    return ", ".join(names[:-1]) + " und " + names[-1]


def checkbox_liste(name, items, id_prefix, n):
    lines = [
        f'<label class="choice"><input type="checkbox" name="{name}" value="{value}" id="{id_prefix}-{value}"> <span>{esc(label)}</span></label>'
        for value, label in items
    ]
    return indent(lines, n)


def footer_themen(themen):
    return indent([f'<li><a href="/themen/{t["slug"]}/">{esc(t["titel"])}</a></li>' for t in themen], 10)


def footer_regionen(regionen):
    return indent(
        [f'<li><a href="/?region={r["slug"]}#anfrage" data-region="{r["slug"]}">{esc(r["name"])}</a></li>' for r in regionen],
        10,
    )


def liste(items, n, css="check-list"):
    lines = [f'<ul class="{css}">']
    for item in items:
        lines.append(
            f'  <li><svg class="icon" aria-hidden="true"><use href="#icon-check"/></svg><span>{esc(item)}</span></li>'
        )
    lines.append("</ul>")
    return indent(lines, n)


def andere_themen(themen, aktuell):
    lines = []
    for t in themen:
        if t["slug"] == aktuell:
            continue
        lines.append(
            f'<li><a class="topic-link" href="/themen/{t["slug"]}/">'
            f'<img class="topic-link__img" src="/{t["bild"]["datei"]}-480.webp" width="480" height="600" alt="" loading="lazy" decoding="async">'
            f'<span class="topic-link__title">{esc(t["titel"])}</span>'
            f'<svg class="icon" aria-hidden="true"><use href="#icon-arrow"/></svg></a></li>'
        )
    return indent(lines, 8)


def hinweis_block(t):
    if not t.get("hinweis"):
        return ""
    return indent(
        [
            '<div class="notice notice--important" role="note">',
            '  <svg class="icon" aria-hidden="true"><use href="#icon-info"/></svg>',
            f'  <p><strong>Wichtiger Hinweis:</strong> {esc(t["hinweis"])}</p>',
            "</div>",
        ],
        6,
    )


# --------------------------------------------------------------------------
# Ratgeber: Frontmatter + minimaler Markdown-Parser
# (→ WordPress: Beitrag = Post, Inhalt = post_content/Blöcke)
#
# Unterstützte Teilmenge: ## / ### Überschriften, Absätze, "- " Listen,
# **fett**, "> " Zitat-Blöcke (mehrzeilig, mehrere Absätze über ">"-Leerzeile),
# Pipe-Tabellen ("| a | b |" + Trennzeile "| --- | --- |", erste Zeile = Kopf).
# Alles andere wird als normaler Absatz-Text (HTML-escaped) ausgegeben.
# Optionale Frontmatter-Felder:
#   inline_bild, inline_bild_alt, inline_nach_ueberschrift  zweites Bild im Text: nach der
#       ersten Liste des ##-Abschnitts, dessen Überschrift so beginnt (sonst direkt nach der Überschrift)
#   tabelle_beschriftung   <caption> (visuell verborgen) für Tabellen im Beitrag; mehrere Tabellen: „Erste | Zweite“
# --------------------------------------------------------------------------
FRONTMATTER_KEYS = ("titel", "slug", "thema", "bild", "bild_alt", "stand", "geaendert")
BOLD_RE = re.compile(r"\*\*(.+?)\*\*")


def parse_frontmatter(src, source):
    lines = src.splitlines()
    if not lines or lines[0].strip() != "---":
        raise SystemExit(f"FEHLER: {source} beginnt nicht mit Frontmatter (---)")
    try:
        end = lines.index("---", 1)
    except ValueError:
        raise SystemExit(f"FEHLER: {source} – Frontmatter nicht abgeschlossen (---)")
    meta = {}
    for line in lines[1:end]:
        if line.strip():
            key, sep, value = line.partition(":")
            if not sep:
                raise SystemExit(f"FEHLER: {source} – ungültige Frontmatter-Zeile: {line!r}")
            meta[key.strip()] = value.strip()
    for key in FRONTMATTER_KEYS:
        if not meta.get(key):
            raise SystemExit(f"FEHLER: {source} – Frontmatter-Feld '{key}' fehlt")
    inline_keys = ("inline_bild", "inline_bild_alt", "inline_nach_ueberschrift")
    if any(meta.get(k) for k in inline_keys) and not all(meta.get(k) for k in inline_keys):
        raise SystemExit(f"FEHLER: {source} – inline_bild braucht inline_bild_alt und inline_nach_ueberschrift")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", meta["geaendert"]):
        raise SystemExit(f"FEHLER: {source} – 'geaendert' muss JJJJ-MM-TT sein")
    return meta, "\n".join(lines[end + 1:])


# Nur interne Links: [Text](/pfad/) – externe URLs bewusst nicht erlaubt
LINK_RE = re.compile(r"\[([^\]]+)\]\((/[^)\s\"<>]*)\)")


def inline(text):
    """Escaping zuerst, danach **fett** → <strong> und [Text](/pfad/) → <a> (nur interne Pfade)."""
    html = BOLD_RE.sub(r"<strong>\1</strong>", esc(text))
    return LINK_RE.sub(r'<a href="\2">\1</a>', html)


def plain(text):
    """Markdown-Zeichen entfernen (für Meta-Description, Anreißer, TOC)."""
    return LINK_RE.sub(r"\1", BOLD_RE.sub(r"\1", text))


def md_blocks(text):
    """Zerlegt Markdown in Blöcke: (typ, daten). typ ∈ h2, h3, p, ul, quote."""
    blocks, para, items, quote, table = [], [], [], [], []

    def cells(row):
        return [c.strip() for c in row.strip().strip("|").split("|")]

    def flush():
        if table:
            if len(table) < 2 or not re.fullmatch(r"\|?(:?-+:?\|)*:?-+:?\|?", table[1].replace(" ", "")):
                raise SystemExit(f"FEHLER: Tabelle ohne Trennzeile: {table[0]!r}")
            head = cells(table[0])
            rows = [cells(r) for r in table[2:]]
            if any(len(r) != len(head) for r in rows):
                raise SystemExit(f"FEHLER: Tabellenzeile mit falscher Spaltenzahl: {table[0]!r}")
            blocks.append(("table", (head, rows)))
            table.clear()
        if para:
            blocks.append(("p", " ".join(para)))
            para.clear()
        if items:
            blocks.append(("ul", list(items)))
            items.clear()
        if quote:
            blocks.append(("quote", md_blocks("\n".join(quote))))
            quote.clear()

    for raw in text.splitlines():
        line = raw.rstrip()
        stripped = line.strip()
        if stripped.startswith(">"):
            if para or items:
                flush()
            quote.append(re.sub(r"^>\s?", "", stripped))
            continue
        if quote:
            flush()
        if stripped.startswith("|"):
            if para or items:
                flush()
            table.append(stripped)
            continue
        if table:
            flush()
        if not stripped:
            flush()
        elif stripped.startswith("### "):
            flush()
            blocks.append(("h3", stripped[4:].strip()))
        elif stripped.startswith("## "):
            flush()
            blocks.append(("h2", stripped[3:].strip()))
        elif stripped.startswith("- "):
            if para:
                flush()
            items.append(stripped[2:].strip())
        elif items and line.startswith("  "):
            items[-1] += " " + stripped          # Fortsetzungszeile eines Listenpunkts
        else:
            if items:
                flush()
            para.append(stripped)
    flush()
    return blocks


def heading_ids(blocks):
    """Eindeutige ids für ##-Überschriften (Sprungziele des Inhaltsverzeichnisses)."""
    ids, seen = {}, set()
    for i, (kind, data) in enumerate(blocks):
        if kind == "h2":
            # führende Nummerierung („1. “) weglassen → ids beginnen mit Buchstaben (CSS-/JS-Selektoren)
            base = slugify(re.sub(r"^\d+\.\s*", "", plain(data))) or "abschnitt"
            anchor, n = base, 2
            while anchor in seen or anchor in ("inhalt", "toc-titel"):
                anchor, n = f"{base}-{n}", n + 1
            seen.add(anchor)
            ids[i] = anchor
    return ids


def render_blocks(blocks, ids=None, caption=None):
    ids = ids or {}
    # mehrere Tabellen: Beschriftungen mit „ | “ trennen (eine Angabe gilt für alle Tabellen)
    captions = [c.strip() for c in caption.split(" | ")] if caption else []
    n_table = 0
    out = []
    for i, (kind, data) in enumerate(blocks):
        if kind == "h2":
            out.append(f'<h2 id="{ids[i]}">{inline(data)}</h2>')
        elif kind == "h3":
            out.append(f"<h3>{inline(data)}</h3>")
        elif kind == "p":
            out.append(f"<p>{inline(data)}</p>")
        elif kind == "ul":
            out.append("<ul>")
            out += [f"  <li>{inline(item)}</li>" for item in data]
            out.append("</ul>")
        elif kind == "table":
            head, rows = data
            out.append('<div class="article__table-wrap">')
            out.append('  <table class="article__table">')
            cap = captions[min(n_table, len(captions) - 1)] if captions else ""
            n_table += 1
            if cap:
                out.append(f'    <caption class="visually-hidden">{esc(cap)}</caption>')
            out.append("    <thead>")
            out.append("      <tr>" + "".join(f'<th scope="col">{inline(h)}</th>' for h in head) + "</tr>")
            out.append("    </thead>")
            out.append("    <tbody>")
            for row in rows:
                out.append("      <tr>" + "".join(
                    f'<td data-label="{esc(plain(h))}">{inline(c)}</td>' for h, c in zip(head, row)) + "</tr>")
            out.append("    </tbody>")
            out.append("  </table>")
            out.append("</div>")
        elif kind == "img":
            base = f'/{RATGEBER_IMG}/{data["bild"]}'
            out += [
                '<figure class="article__figure">',
                '  <picture>',
                f'    <source type="image/webp" srcset="{base}-800.webp 800w, {base}-1400.webp 1400w" sizes="(min-width: 48em) 42rem, calc(100vw - 2.5rem)">',
                f'    <img src="{base}-1400.jpg" width="1400" height="933" alt="{esc(data["alt"])}" loading="lazy" decoding="async">',
                "  </picture>",
                "</figure>",
            ]
        elif kind == "quote":
            first = next((d for k, d in data if k == "p"), "")
            variant = "notice--important" if plain(first).startswith("Wichtig") else "notice--light"
            out.append(f'<div class="notice {variant} article__notice" role="note">')
            out.append('  <svg class="icon" aria-hidden="true"><use href="#icon-info"/></svg>')
            out.append('  <div class="notice__body">')
            out += ["    " + line for line in render_blocks(data).splitlines()]
            out.append("  </div>")
            out.append("</div>")
    return "\n".join(out)


def insert_inline_bild(blocks, meta, source):
    """Fügt das zweite Bild nach der ersten Liste des passenden ##-Abschnitts ein."""
    start = next((i for i, (k, d) in enumerate(blocks)
                  if k == "h2" and plain(d).startswith(meta["inline_nach_ueberschrift"])), None)
    if start is None:
        raise SystemExit(f"FEHLER: {source} – Überschrift für inline_bild nicht gefunden: {meta['inline_nach_ueberschrift']!r}")
    pos = start + 1
    for i in range(start + 1, len(blocks)):
        if blocks[i][0] == "h2":
            break
        if blocks[i][0] == "ul":
            pos = i + 1
            break
    img = ("img", {"bild": meta["inline_bild"], "alt": meta["inline_bild_alt"]})
    return blocks[:pos] + [img] + blocks[pos:]


def kuerzen(text, limit=160):
    """Auf ~limit Zeichen an Wortgrenze kürzen, mit „…“."""
    if len(text) <= limit:
        return text
    cut = text[:limit + 1].rsplit(" ", 1)[0].rstrip(" ,;:–-")
    return cut + "…"


def load_beitraege(themen):
    themen_by_slug = {t["slug"]: t for t in themen}
    beitraege = []
    for path in sorted(CONTENT.glob("*.md")):
        source = path.relative_to(ROOT)
        meta, body = parse_frontmatter(read(path), source)
        if meta["slug"] != path.stem:
            raise SystemExit(f"FEHLER: {source} – slug '{meta['slug']}' passt nicht zum Dateinamen")
        if meta["thema"] not in themen_by_slug:
            raise SystemExit(f"FEHLER: {source} – unbekanntes Thema '{meta['thema']}'")
        bilder = [(meta["bild"], ("-800.webp", "-1400.webp", "-1400.jpg", "-teaser-600.webp"))]
        if meta.get("inline_bild"):
            bilder.append((meta["inline_bild"], ("-800.webp", "-1400.webp", "-1400.jpg")))
        for name, suffixes in bilder:
            for suffix in suffixes:
                if not (ROOT / RATGEBER_IMG / (name + suffix)).exists():
                    raise SystemExit(f"FEHLER: Bild fehlt: {RATGEBER_IMG}/{name}{suffix}")
        blocks = md_blocks(body)
        if meta.get("inline_bild"):
            blocks = insert_inline_bild(blocks, meta, source)
        first = next((d for k, d in blocks if k == "p"), None)
        if not first:
            raise SystemExit(f"FEHLER: {source} – kein einleitender Absatz")
        b = dict(meta)
        b["thema_titel"] = themen_by_slug[meta["thema"]]["titel"]
        b["anreisser"] = kuerzen(plain(first), 160)
        b["description"] = kuerzen(plain(first), 155)
        b["url"] = f"/ratgeber/{meta['slug']}/"
        b["_blocks"] = blocks
        beitraege.append(b)
    # Neueste zuerst (→ WordPress: orderby date DESC): Feld "veroeffentlicht" (JJJJ-MM-TT HH:MM),
    # sonst "geaendert"; bei Gleichstand Dateiname absteigend
    beitraege.sort(key=lambda x: (x.get("veroeffentlicht", x["geaendert"]), x["slug"]), reverse=True)
    return beitraege


# Cache-Busting: CSS/JS-Verweise bekommen ?v=<Inhalts-Hash>, damit Browser nach
# einem Deploy sofort die neue Fassung laden (WordPress: Versionsparameter von
# wp_enqueue_style/wp_enqueue_script, z. B. filemtime()).
ASSET_RE = re.compile(r'((?:href|src)="/assets/(?:css|js)/[^"?]+\.(?:css|js))"')


def _asset_version(path):
    data = (ROOT / path.lstrip("/")).read_bytes()
    return hashlib.sha256(data).hexdigest()[:10]


def add_asset_versions(page):
    def repl(m):
        attr_url = m.group(1)
        url = attr_url.split('"', 1)[1]
        return f'{attr_url}?v={_asset_version(url)}"'
    return ASSET_RE.sub(repl, page)


def write_ratgeber_json(beitraege):
    """data/ratgeber.json – gesammelte Beitragsdaten (Abbildung auf WordPress-Posts, s. README)."""
    keys = ("slug", "titel", "thema", "thema_titel", "bild", "bild_alt", "stand", "veroeffentlicht", "geaendert", "anreisser", "url",
            "inline_bild", "inline_bild_alt", "inline_nach_ueberschrift", "tabelle_beschriftung", "hinweis")
    data = {
        "_hinweis": "GENERIERT von tools/build.py aus content/ratgeber/*.md – nicht direkt bearbeiten",
        "beitraege": [{k: b[k] for k in keys if k in b} for b in beitraege],
    }
    (ROOT / "data" / "ratgeber.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def article_card(b, heading="h3", n=0, filter_attr=False):
    """Beitragskarte mit Bild 3:2, geschwungener Textfläche und Themen-Pill (→ template-parts/card-artikel.php).
    filter_attr: data-thema am <li> für die Themenfilter der Übersicht /ratgeber/."""
    title = esc(b["titel"])
    lines = [
        f'<li data-thema="{b["thema"]}">' if filter_attr else "<li>",
        '  <article class="article-card article-card--image">',
        f'    <img class="article-card__media" src="/{RATGEBER_IMG}/{b["bild"]}-800.webp" width="800" height="533" alt="" loading="lazy" decoding="async">',
        '    <div class="article-card__body">',
        f'      <p class="article-card__meta"><span class="article-card__pill">{esc(b["thema_titel"])}</span></p>',
        f'      <{heading} class="article-card__title"><a href="{b["url"]}">{title}</a></{heading}>',
        f'      <p class="article-card__text">{esc(b["anreisser"])}</p>',
        '      <p class="article-card__more" aria-hidden="true">Weiterlesen →</p>',
        "    </div>",
        "  </article>",
        "</li>",
    ]
    return indent(lines, n)


def ratgeber_filter(themen, beitraege):
    """Themenfilter der Übersicht /ratgeber/: „Alle“ + nur Themenbereiche mit Beiträgen
    (Reihenfolge wie data/themen.json), je mit Anzahl. Ohne JS per CSS ausgeblendet (.js),
    main.js blendet Karten über das hidden-Attribut ein/aus (→ WordPress: get_terms('themenbereich',
    hide_empty) + Zählung aus term->count)."""
    counts = {}
    for b in beitraege:
        counts[b["thema"]] = counts.get(b["thema"], 0) + 1
    gesamt = len(beitraege)
    wort = "Beitrag" if gesamt == 1 else "Beiträge"
    lines = [
        '<div class="filter" data-filter>',
        '  <p class="filter__label" id="filter-label">Beiträge nach Thema filtern</p>',
        '  <div class="filter__list" role="group" aria-labelledby="filter-label">',
        f'    <button type="button" class="filter__btn" aria-pressed="true" data-filter-thema="">'
        f'<svg class="icon filter__check" aria-hidden="true"><use href="#icon-check"/></svg>'
        f'Alle <span class="filter__count">({gesamt})</span></button>',
    ]
    for t in themen:
        n = counts.get(t["slug"])
        if not n:
            continue
        lines.append(
            f'    <button type="button" class="filter__btn" aria-pressed="false" data-filter-thema="{t["slug"]}">'
            f'<svg class="icon filter__check" aria-hidden="true"><use href="#icon-check"/></svg>'
            f'{esc(t["titel"])} <span class="filter__count">({n})</span></button>'
        )
    lines += [
        "  </div>",
        f'  <p class="filter__status" aria-live="polite" data-filter-status>{gesamt} {wort}</p>',
        "</div>",
    ]
    return indent(lines, 6)


def article_toc(blocks, ids):
    lines = [
        '<nav class="toc article__toc" aria-labelledby="toc-titel">',
        '  <h2 id="toc-titel">Inhalt</h2>',
        '  <ul class="article__toc-list">',
    ]
    for i, (kind, data) in enumerate(blocks):
        if kind == "h2":
            lines.append(f'    <li><a href="#{ids[i]}">{esc(plain(data))}</a></li>')
    lines += ["  </ul>", "</nav>"]
    return lines


def article_jsonld(b):
    data = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": b["titel"],
        "description": b["description"],
        "image": [f'{SITE}/{RATGEBER_IMG}/{b["bild"]}-1400.jpg'],
        "dateModified": b["geaendert"],
        "inLanguage": "de-DE",
        "articleSection": b["thema_titel"],
        "mainEntityOfPage": f'{SITE}{b["url"]}',
        "publisher": {"@type": "Organization", "name": SITE_NAME, "url": f"{SITE}/"},
    }
    body = json.dumps(data, ensure_ascii=False, indent=2).replace("</", "<\\/")
    return (
        "  <!-- JSON-LD: PLATZHALTER – url/publisher (example.org = reservierte Beispiel-Domain) vor Livegang\n"
        "       ersetzen; datePublished/author/Logo erst mit echten Daten ergänzen. -->\n"
        '  <script type="application/ld+json">\n'
        + indent(body.splitlines(), 2) + "\n  </script>"
    )


def article_picture(b):
    base = f'/{RATGEBER_IMG}/{b["bild"]}'
    return [
        '<picture class="article__media">',
        f'  <source type="image/webp" srcset="{base}-800.webp 800w, {base}-1400.webp 1400w" sizes="(min-width: 64em) 63rem, calc(100vw - 2.5rem)">',
        f'  <img src="{base}-1400.jpg" width="1400" height="933" alt="{esc(b["bild_alt"])}" decoding="async" fetchpriority="high">',
        "</picture>",
    ]


def beitrag_ctx(b, beitraege):
    blocks = b["_blocks"]
    ids = heading_ids(blocks)
    andere = [x for x in beitraege if x["slug"] != b["slug"]]
    # Link auf die gefilterte Übersicht nur, wenn es weitere Beiträge zum selben Thema gibt
    gleiches_thema = [x for x in andere if x["thema"] == b["thema"]]
    thema_link = (
        f'      <p class="article-list__all"><a href="/ratgeber/?thema={b["thema"]}">'
        f'Weitere Beiträge zum Thema {esc(b["thema_titel"])}</a></p>'
    ) if gleiches_thema else ""
    return {
        "meta_titel": b["titel"],
        "meta_description": b["description"],
        "beitrag_jsonld": article_jsonld(b),
        "og_article": b,
        "beitrag_slug": b["slug"],
        "beitrag_titel": esc(b["titel"]),
        "beitrag_thema": b["thema"],
        "beitrag_thema_titel": esc(b["thema_titel"]),
        "beitrag_stand": esc(b["stand"]),
        "beitrag_geaendert": b["geaendert"],
        # Hinweisbox am Beitragsende: eigener Text über Frontmatter "hinweis", sonst Standardtext
        "beitrag_hinweis": inline(b["hinweis"]) if b.get("hinweis") else (
            "Dieser Beitrag dient der allgemeinen Information und ersetzt keine individuelle Beratung. "
            f"Beträge und Voraussetzungen können sich ändern – maßgeblich sind die Angaben Ihrer Pflegekasse. Stand: {esc(b['stand'])}."),
        "beitrag_bild": indent(article_picture(b), 8),
        "beitrag_toc": indent(article_toc(blocks, ids), 8),
        "beitrag_inhalt": indent(render_blocks(blocks, ids, b.get("tabelle_beschriftung")).splitlines(), 8),
        # Beiträge zum selben Thema zuerst, dann die neuesten übrigen; max. 3 Karten
        "weitere_beitraege": "\n".join(article_card(x, "h3", 8) for x in (gleiches_thema + [x for x in andere if x["thema"] != b["thema"]])[:3]),
        "weitere_zum_thema": thema_link,
    }


def thema_ratgeber(t, beitraege):
    """Verweis „Passender Ratgeber“ auf Themenseiten (→ WP_Query tax_query themenbereich)."""
    passend = [b for b in beitraege if b["thema"] == t["slug"]]
    if not passend:
        return ""
    lines = [
        '<aside class="topic-ratgeber" aria-labelledby="ratgeber-hinweis-titel">',
        '  <h2 class="topic-ratgeber__title" id="ratgeber-hinweis-titel">Passender Ratgeber</h2>',
        '  <ul class="topic-ratgeber__list">',
    ]
    for b in passend:
        lines.append(
            f'    <li><a class="topic-link" href="{b["url"]}">'
            f'<img class="topic-link__img topic-link__img--wide" src="/{RATGEBER_IMG}/{b["bild"]}-teaser-600.webp" width="600" height="450" alt="" loading="lazy" decoding="async">'
            f'<span class="topic-link__title">{esc(b["titel"])}</span>'
            f'<svg class="icon" aria-hidden="true"><use href="#icon-arrow"/></svg></a></li>'
        )
    lines += ["  </ul>", "</aside>"]
    return indent(lines, 6)


# --------------------------------------------------------------------------
# Seiten
# --------------------------------------------------------------------------
def home_head(regionen):
    """Hero-Preload + JSON-LD der Startseite (Platzhalterwerte)."""
    area = ", ".join(json.dumps(r["name"], ensure_ascii=False) for r in regionen)
    return f"""  <link rel="preload" as="image" type="image/webp"
        imagesrcset="/assets/img/hero-garten-800.webp 800w, /assets/img/hero-garten-1600.webp 1600w"
        imagesizes="(min-width: 60em) 55vw, 100vw">

  <!-- JSON-LD: PLATZHALTER – url (example.org = reservierte Beispiel-Domain)
       (Demo-Nummer, nicht vergeben) vor Livegang ersetzen; Adresse/Logo erst mit echten Daten ergänzen. -->
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "{SITE_NAME}",
    "url": "{SITE}/",
    "description": "Kostenloses Vermittlungsportal für Menschen ab 60 und Angehörige: Unser Team sucht persönlich passende Dienstleister und private Helfer in der Region.",
    "areaServed": [{area}]
  }}
  </script>"""


def meta_seo(path, title, description, image=None, noindex=False, article=None):
    if noindex:
        return '  <meta name="robots" content="noindex">'
    img, w, h, alt = image or (
        "/assets/img/hero-garten-1600.jpg", 1600, 900, "Ältere Frau sitzt lächelnd mit einem Glas in einem sonnigen Garten."
    )
    article_tags = ""
    if article:
        article_tags = (
            f'\n  <meta property="article:modified_time" content="{article["geaendert"]}">'
            f'\n  <meta property="article:section" content="{esc(article["thema_titel"])}">'
        )
    return f"""  <!-- PROTOTYP: example.org ist eine reservierte Platzhalter-Domain – Canonical, Open Graph
       und JSON-LD vor Livegang auf die echte Domain umstellen. -->
  <link rel="canonical" href="{SITE}{path}">
  <meta property="og:type" content="{"article" if article else "website"}">{article_tags}
  <meta property="og:locale" content="de_DE">
  <meta property="og:site_name" content="{esc(SITE_NAME)}">
  <meta property="og:title" content="{esc(title)}">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:url" content="{SITE}{path}">
  <meta property="og:image" content="{SITE}{img}">
  <meta property="og:image:width" content="{w}">
  <meta property="og:image:height" content="{h}">
  <meta property="og:image:alt" content="{esc(alt)}">
  <meta name="twitter:card" content="summary_large_image">"""


def build_page(template, output, ctx, partials, themen, regionen):
    meta, body = parse_template(template)
    page_ctx = dict(ctx)
    title = render(meta["title"], page_ctx, template)
    description = render(meta["description"], page_ctx, template)
    path = "/" + output.replace("index.html", "") if output != "404.html" else None
    nav = meta.get("nav", "")
    nav_ctx = {"site_name": esc(SITE_NAME)}
    for key in NAV_KEYS:
        if key == nav:
            nav_ctx[f"nav:{key}"] = ' aria-current="true"' if meta.get("nav_level") == "section" else ' aria-current="page"'
        else:
            nav_ctx[f"nav:{key}"] = ""

    image = None
    if "thema_slug" in ctx:
        t = next(t for t in themen if t["slug"] == ctx["thema_slug"])
        image = (f'/{t["bild"]["datei"]}-800.jpg', 800, 1000, t["bild"]["alt"])
    article = ctx.get("og_article")
    if article:
        image = (f'/{RATGEBER_IMG}/{article["bild"]}-1400.jpg', 1400, 933, article["bild_alt"])

    content = render(body, page_ctx, template)
    layout_ctx = {
        "title": esc(title),
        "description": esc(description),
        "meta_seo": meta_seo(path, title, description, image, noindex=path is None, article=article),
        "head_extra": render(meta.get("head_extra", ""), page_ctx, template),
        "icons": partials["icons"].rstrip(),
        "header": render(partials["header"], nav_ctx, "partials/header.html").rstrip(),
        "footer": render(partials["footer"], {
            "site_name": esc(SITE_NAME),
            "footer_themen": footer_themen(themen),
            "footer_regionen": footer_regionen(regionen),
        }, "partials/footer.html").rstrip(),
        "content": content.rstrip(),
    }
    page = render(partials["layout"], layout_ctx, "templates/_layout.html")
    page = page.replace(
        "<!doctype html>\n",
        f"<!doctype html>\n<!-- GENERIERT von tools/build.py aus templates/{template} – nicht direkt bearbeiten -->\n",
        1,
    )
    if PLACEHOLDER_RE.search(page):
        raise SystemExit(f"FEHLER: Platzhalter-Reste in {output}")
    page = add_asset_versions(page)
    target = ROOT / output
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(page, encoding="utf-8")
    return output


def main():
    themen = json.loads(read(ROOT / "data" / "themen.json"))["themen"]
    regionen = json.loads(read(ROOT / "data" / "regionen.json"))["regionen"]

    for t in themen:
        for key in ("slug", "titel", "kurztext", "einleitung", "beispiele", "leistungen", "angebote", "bild"):
            if key not in t:
                raise SystemExit(f"FEHLER: themen.json – '{key}' fehlt bei {t.get('slug')}")
        if not 5 <= len(t["leistungen"]) <= 8:
            raise SystemExit(f"FEHLER: themen.json – {t['slug']} braucht 5–8 Leistungen")
        for suffix in ("-480.webp", "-800.webp", "-800.jpg"):
            if not (ROOT / (t["bild"]["datei"] + suffix)).exists():
                raise SystemExit(f"FEHLER: Bild fehlt: {t['bild']['datei']}{suffix}")

    partials = {
        "layout": read(TEMPLATES / "_layout.html"),
        "icons": read(PARTIALS / "icons.html"),
        "header": read(PARTIALS / "header.html"),
        "footer": read(PARTIALS / "footer.html"),
    }

    beitraege = load_beitraege(themen)
    write_ratgeber_json(beitraege)

    region_items = [(r["slug"], r["name"]) for r in regionen]
    common = {
        "site_name": esc(SITE_NAME),
        # Startseite: die drei neuesten Beiträge (Raster mit 3 Spalten), Übersicht: alle (keine Begrenzung)
        "ratgeber_karten": "\n".join(article_card(b, "h3", 8) for b in beitraege[:3]),
        "leitfaden_angehoerige": next(
            (b["url"] for b in beitraege if b["slug"] == "eltern-aus-der-ferne-unterstuetzen"), "/ratgeber/"),
        "ratgeber_karten_h2": "\n".join(article_card(b, "h2", 8, filter_attr=True) for b in beitraege),
        "ratgeber_filter": ratgeber_filter(themen, beitraege),
        "home_head": home_head(regionen),
        "themen_karten_h3": theme_cards(themen, "h3", 8),
        "themen_karten_h2": theme_cards(themen, "h2", 8),
        "kategorie_optionen": kategorie_optionen(themen),
        "leistungen_gruppen": leistungen_gruppen(themen),
        "orte_optionen": orte_optionen(regionen),
        "regionen_text": regionen_text(regionen),
        "anbieter_bereiche": checkbox_liste("bereiche", [(t["slug"], t["titel"]) for t in themen], "a-bereich", 16),
        "anbieter_einsatzorte": checkbox_liste("einsatzorte", region_items, "a-ort", 16),
        "anbieter_region_optionen": indent(
            ['<option value="">Bitte wählen</option>']
            + [f'<option value="{r["slug"]}">{esc(r["name"])}</option>' for r in regionen]
            + ['<option value="andere">Andere Region</option>'],
            16,
        ),
    }

    built = []
    for template, output in (
        ("index.html", "index.html"),
        ("themen.html", "themen/index.html"),
        ("fuer-anbieter.html", "fuer-anbieter/index.html"),
        ("ratgeber.html", "ratgeber/index.html"),
        ("mein-alltag.html", "mein-alltag/index.html"),
        ("impressum.html", "impressum/index.html"),
        ("datenschutz.html", "datenschutz/index.html"),
        ("404.html", "404.html"),
    ):
        built.append(build_page(template, output, common, partials, themen, regionen))

    for t in themen:
        ctx = dict(common)
        ctx.update({
            "thema_slug": t["slug"],
            "thema_titel": esc(t["titel"]),
            "thema_kurztext": esc(t["kurztext"]),
            "thema_einleitung": esc(t["einleitung"]),
            "thema_bild": indent(picture(t, "(min-width: 30em) 28rem, 92vw", "topic-hero__media", loading="eager", priority=True).splitlines(), 6),
            "thema_angebote": liste(t["angebote"], 8),
            "thema_leistungen": liste(t["leistungen"], 8),
            "thema_hinweis": hinweis_block(t),
            "andere_themen": andere_themen(themen, t["slug"]),
            "thema_ratgeber": thema_ratgeber(t, beitraege),
        })
        built.append(build_page("thema.html", f"themen/{t['slug']}/index.html", ctx, partials, themen, regionen))

    for b in beitraege:
        ctx = dict(common)
        ctx.update(beitrag_ctx(b, beitraege))
        built.append(build_page("ratgeber-beitrag.html", f"ratgeber/{b['slug']}/index.html", ctx, partials, themen, regionen))

    print("  ✓ data/ratgeber.json")
    for path in built:
        print(f"  ✓ {path}")
    print(f"{len(built)} Seiten erzeugt.")


if __name__ == "__main__":
    sys.exit(main())
