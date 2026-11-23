#!/usr/bin/env python3
"""Wir helfen – statischer Seitengenerator (nur Python-Standardbibliothek).

Aufruf im Projektordner:   python3 tools/build.py

Erzeugt alle HTML-Seiten aus
  templates/_layout.html          Grundgerüst (<head>, Skip-Link, <main>, Skripte)
  templates/<seite>.html          Seiteninhalt (+ Meta-Kommentar mit title/description/nav)
  partials/icons.html             SVG-Sprite
  partials/header.html            Kopfbereich inkl. Navigation ({{nav:…}} → aria-current)
  partials/footer.html            Fußbereich ({{footer_themen}}, {{footer_regionen}})
  data/themen.json, data/regionen.json, data/checklisten.json, data/wohnungs-check.json
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
# Unterstützte Teilmenge: ## / ### Überschriften, Absätze, "- " Listen, "1. " nummerierte Listen,
# **fett**, "> " Zitat-Blöcke (mehrzeilig, mehrere Absätze über ">"-Leerzeile),
# Pipe-Tabellen ("| a | b |" + Trennzeile "| --- | --- |", erste Zeile = Kopf).
# Alles andere wird als normaler Absatz-Text (HTML-escaped) ausgegeben.
# Optionale Frontmatter-Felder:
#   inline_bild, inline_bild_alt, inline_nach_ueberschrift  weiteres Bild im Text: nach der
#       ersten Liste des ##-Abschnitts, dessen Überschrift so beginnt (sonst direkt nach der Überschrift);
#       mehrere Bilder: alle drei Felder mit „ | “ trennen (gleiche Anzahl, Reihenfolge beliebig)
#   tabelle_beschriftung   <caption> (visuell verborgen) für Tabellen im Beitrag; mehrere Tabellen: „Erste | Zweite“
#   seo_titel              eigener <title>/og:title statt "titel" (→ WordPress: SEO-Titel, z. B. Yoast/Rank Math)
#   meta_beschreibung      eigene Meta-Description statt des gekürzten ersten Absatzes
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
    if meta.get("quellen"):
        for entry in meta["quellen"].split(" ;; "):
            label, _, url = (x.strip() for x in entry.rpartition("|"))
            if not label or not url.startswith("https://") or " " in url:
                raise SystemExit(f"FEHLER: {source} – ungültige Quelle (Format 'Label | https://url'): {entry!r}")
    inline_keys = ("inline_bild", "inline_bild_alt", "inline_nach_ueberschrift")
    if any(meta.get(k) for k in inline_keys) and not all(meta.get(k) for k in inline_keys):
        raise SystemExit(f"FEHLER: {source} – inline_bild braucht inline_bild_alt und inline_nach_ueberschrift")
    if meta.get("inline_bild") and len({len(meta[k].split(" | ")) for k in inline_keys}) != 1:
        raise SystemExit(f"FEHLER: {source} – inline_bild, inline_bild_alt und inline_nach_ueberschrift brauchen gleich viele Einträge")
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
    text = re.sub(r"^\[ \]\s+", "", text)   # Aufgabenlisten-Marker
    return LINK_RE.sub(r"\1", BOLD_RE.sub(r"\1", text))


def md_blocks(text):
    """Zerlegt Markdown in Blöcke: (typ, daten). typ ∈ h2, h3, p, ul, ol, quote, table."""
    blocks, para, items, quote, table = [], [], [], [], []
    ordered = []   # nummerierte Liste ("1. Text")

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
        if ordered:
            blocks.append(("ol", list(ordered)))
            ordered.clear()
        if quote:
            blocks.append(("quote", md_blocks("\n".join(quote))))
            quote.clear()

    for raw in text.splitlines():
        line = raw.rstrip()
        stripped = line.strip()
        if stripped.startswith(">"):
            if para or items or ordered:
                flush()
            quote.append(re.sub(r"^>\s?", "", stripped))
            continue
        if quote:
            flush()
        if stripped.startswith("|"):
            if para or items or ordered:
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
            if para or ordered:
                flush()
            items.append(stripped[2:].strip())
        elif re.match(r"\d+\.\s", stripped) and not para:
            if items:
                flush()
            ordered.append(re.sub(r"^\d+\.\s+", "", stripped))
        elif (items or ordered) and line.startswith("  "):
            (items or ordered)[-1] += " " + stripped   # Fortsetzungszeile eines Listenpunkts
        else:
            if items or ordered:
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


def render_blocks(blocks, ids=None, caption=None, slug="beitrag"):
    ids = ids or {}
    n_check = 0
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
        elif kind == "ul" and all(item.startswith("[ ] ") for item in data):
            # Aufgabenliste: interaktive Checkliste (ids pro Seite eindeutig)
            out.append('<ul class="beitrag-checkliste">')
            for item in data:
                n_check += 1
                out.append(
                    f'  <li><label class="choice"><input type="checkbox" id="{slug}-check-{n_check}"> '
                    f'<span>{inline(item[4:].strip())}</span></label></li>')
            out.append("</ul>")
        elif kind == "ul":
            out.append("<ul>")
            out += [f"  <li>{inline(item)}</li>" for item in data]
            out.append("</ul>")
        elif kind == "ol":
            out.append("<ol>")
            out += [f"  <li>{inline(item)}</li>" for item in data]
            out.append("</ol>")
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


def inline_bilder(meta):
    """[(bild, alt, überschrift), …] aus den inline_*-Feldern (mehrere mit „ | “ getrennt)."""
    if not meta.get("inline_bild"):
        return []
    return list(zip(*(meta[k].split(" | ") for k in ("inline_bild", "inline_bild_alt", "inline_nach_ueberschrift"))))


def insert_inline_bild(blocks, meta, source):
    """Fügt jedes weitere Bild nach der ersten Liste des passenden ##-Abschnitts ein."""
    for bild, alt, ueberschrift in inline_bilder(meta):
        start = next((i for i, (k, d) in enumerate(blocks)
                      if k == "h2" and plain(d).startswith(ueberschrift)), None)
        if start is None:
            raise SystemExit(f"FEHLER: {source} – Überschrift für inline_bild nicht gefunden: {ueberschrift!r}")
        pos = start + 1
        for i in range(start + 1, len(blocks)):
            if blocks[i][0] == "h2":
                break
            if blocks[i][0] == "ul":
                pos = i + 1
                break
        blocks = blocks[:pos] + [("img", {"bild": bild, "alt": alt})] + blocks[pos:]
    return blocks


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
        for name, _alt, _h in inline_bilder(meta):
            bilder.append((name, ("-800.webp", "-1400.webp", "-1400.jpg")))
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
        b["description"] = meta.get("meta_beschreibung") or kuerzen(plain(first), 155)
        b["url"] = f"/ratgeber/{meta['slug']}/"
        b["_blocks"] = blocks
        beitraege.append(b)
    # Neueste zuerst (→ WordPress: orderby date DESC): Feld "veroeffentlicht" (JJJJ-MM-TT HH:MM),
    # sonst "geaendert"; bei Gleichstand Dateiname absteigend
    beitraege.sort(key=lambda x: (x.get("veroeffentlicht", x["geaendert"]), x["slug"]), reverse=True)
    return themen_streuen(beitraege)


ABSTAND = 2   # gleiches Thema frühestens nach 2 anderen Beiträgen (3er-Raster: nie zweimal in einer Zeile)


def themen_streuen(beitraege):
    """Beiträge desselben Themas sollen nicht nebeneinander stehen (Übersicht, Startseite, Handy-Liste).
    Greedy: Der nächstneuere Beitrag, dessen Thema in den letzten ABSTAND Beiträgen nicht vorkommt,
    rückt vor. Geht das nicht mehr (nur noch ein Thema übrig), bleibt die Datumsfolge.
    (→ WordPress: dieselbe Logik in der Query-Schleife bzw. per pre_get_posts/Filter.)"""
    rest, out = list(beitraege), []
    while rest:
        # Zuerst: Thema kommt in den letzten ABSTAND Beiträgen nicht vor; sonst nur nicht direkt davor
        for fenster in (ABSTAND, 1):
            zuletzt = {b["thema"] for b in out[-fenster:]}
            i = next((k for k, b in enumerate(rest) if b["thema"] not in zuletzt), None)
            if i is not None:
                break
        out.append(rest.pop(i or 0))
    return out


# Cache-Busting: CSS/JS-Verweise bekommen ?v=<Inhalts-Hash>, damit Browser nach
# einem Deploy sofort die neue Fassung laden (WordPress: Versionsparameter von
# wp_enqueue_style/wp_enqueue_script, z. B. filemtime()).
ASSET_RE = re.compile(r'((?:href|src)="/assets/(?:css|js)/[^"?]+\.(?:css|js))"')


ILLU_SPRITE = "/assets/img/illus.svg"
ILLU_RE = re.compile(r'href="/assets/img/illus\.svg#')


def _asset_version(path):
    data = (ROOT / path.lstrip("/")).read_bytes()
    return hashlib.sha256(data).hexdigest()[:10]


def add_asset_versions(page):
    def repl(m):
        attr_url = m.group(1)
        url = attr_url.split('"', 1)[1]
        return f'{attr_url}?v={_asset_version(url)}"'
    page = ASSET_RE.sub(repl, page)
    # Illustrations-Sprite: <use href="/assets/img/illus.svg#illu-…"> → ?v=<Hash> vor dem Fragment
    return ILLU_RE.sub(lambda m: f'href="{ILLU_SPRITE}?v={_asset_version(ILLU_SPRITE)}#', page)


def write_ratgeber_json(beitraege):
    """data/ratgeber.json – gesammelte Beitragsdaten (Abbildung auf WordPress-Posts, s. README)."""
    keys = ("slug", "titel", "thema", "thema_titel", "bild", "bild_alt", "stand", "veroeffentlicht", "geaendert", "anreisser", "url",
            "inline_bild", "inline_bild_alt", "inline_nach_ueberschrift", "tabelle_beschriftung", "hinweis",
            "quellen", "seo_titel", "meta_beschreibung")
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


def assistent_data(themen, regionen, beitraege):
    """Daten für den Unterstützungs-Assistenten (Startseite) → als data-Attribut ins HTML (kein Inline-Skript,
    kein Nachladen). Gelesen von assets/js/assistent.js. → WordPress: wp_localize_script bzw. data-Attribut
    im Block-Template; Beiträge per WP_Query nach Taxonomie themenbereich."""
    data = {
        "sprite": f"{ILLU_SPRITE}?v={_asset_version(ILLU_SPRITE)}",
        "ziele": [
            {"id": "praktisch", "illu": "praktisch", "titel": "Ich brauche praktische Unterstützung", "hinweis": "Zum Beispiel im Haushalt, bei Reparaturen oder im Alltag"},
            {"id": "informieren", "illu": "wissen", "titel": "Ich möchte mich informieren", "hinweis": "Verständliche Beiträge im Ratgeber"},
            {"id": "alltag", "illu": "alltag", "titel": "Ich möchte meinen Alltag besser organisieren", "hinweis": "Checklisten und Wohnungs-Check zum Selbermachen"},
            {"id": "angehoerige", "illu": "angehoerige", "titel": "Ich suche Hilfe für einen Angehörigen", "hinweis": "Auch wenn Sie nicht vor Ort wohnen"},
        ],
        "themen": [
            {
                "slug": t["slug"],
                "titel": t["titel"],
                "url": f"/themen/{t['slug']}/",
                "ratgeber": [{"titel": b["titel"], "url": b["url"]} for b in beitraege if b["thema"] == t["slug"]][:2],
            }
            for t in themen
        ],
        "alltag": [
            {"id": "checklisten", "illu": "checkliste", "titel": "Checklisten", "hinweis": "Zum Abhaken und Ausdrucken", "url": "/mein-alltag/checklisten/", "bald": False},
            {"id": "wohnungs-check", "illu": "wohnungscheck", "titel": "Wohnungs-Check", "hinweis": "Wie sicher ist Ihr Zuhause?", "url": "/mein-alltag/wohnungs-check/", "bald": False},
            {"id": "pflegegrad-rechner", "illu": "pflegegrad", "titel": "Pflegegradrechner", "hinweis": "Welcher Pflegegrad könnte vorliegen?", "url": "/mein-alltag/pflegegrad-rechner/", "bald": False},
            {"id": "termine", "illu": "erinnerungen", "titel": "Termine und Erinnerungen", "hinweis": "Kommt bald", "url": "/mein-alltag/", "bald": True},
            {"id": "plan", "illu": "plan", "titel": "Unterstützung planen", "hinweis": "Kommt bald", "url": "/mein-alltag/", "bald": True},
        ],
        "orte": [r["name"] for r in regionen],
    }
    return esc(json.dumps(data, ensure_ascii=False, separators=(",", ":")))


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


def quellen_block(b):
    """Quellen/offizielle Formulare (Frontmatter 'quellen'); leer ohne Angabe."""
    if not b.get("quellen"):
        return ""
    lines = ['<section class="beitrag-quellen" aria-labelledby="quellen-titel">',
             '  <h2 id="quellen-titel">Quellen und offizielle Formulare</h2>', "  <ol>"]
    for entry in b["quellen"].split(" ;; "):
        label, _, url = entry.rpartition("|")
        lines.append(f'    <li><a href="{esc(url.strip())}" rel="noopener">{esc(label.strip())}</a></li>')
    lines += ["  </ol>", "</section>"]
    return indent(lines, 10) + "\n"


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
        "meta_titel": b.get("seo_titel") or b["titel"],
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
        "beitrag_quellen": quellen_block(b),
        "beitrag_bild": indent(article_picture(b), 8),
        "beitrag_toc": indent(article_toc(blocks, ids), 8),
        "beitrag_inhalt": indent(render_blocks(blocks, ids, b.get("tabelle_beschriftung"), b["slug"]).splitlines(), 8),
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
# Mein Alltag: Checklisten + Wohnungs-Check (→ WordPress: Seiten mit Template-Parts;
# Inhalte später als Custom Post Type „checkliste“ bzw. Options-/JSON-Daten)
# Es wird nichts gespeichert: Abhaken/Antworten leben nur im geöffneten Browser-Tab.
# --------------------------------------------------------------------------
def load_alltag(themen, beitraege):
    checklisten = json.loads(read(ROOT / "data" / "checklisten.json"))["checklisten"]
    check = json.loads(read(ROOT / "data" / "wohnungs-check.json"))
    slugs_t = {t["slug"] for t in themen}
    by_slug = {b["slug"]: b for b in beitraege}
    for c in checklisten:
        for key in ("id", "titel", "einleitung", "punkte", "thema", "ratgeber"):
            if key not in c:
                raise SystemExit(f"FEHLER: checklisten.json – '{key}' fehlt bei {c.get('id')}")
        if not 8 <= len(c["punkte"]) <= 12:
            raise SystemExit(f"FEHLER: checklisten.json – {c['id']} braucht 8–12 Punkte")
        if c["thema"] not in slugs_t or c["ratgeber"] not in by_slug:
            raise SystemExit(f"FEHLER: checklisten.json – unbekanntes Thema/Ratgeber bei {c['id']}")
    fragen = [f for g in check["gruppen"] for f in g["fragen"]]
    if not 10 <= len(fragen) <= 12:
        raise SystemExit("FEHLER: wohnungs-check.json – 10–12 Fragen erwartet")
    if check["thema"] not in slugs_t or any(r not in by_slug for r in check["ratgeber"]):
        raise SystemExit("FEHLER: wohnungs-check.json – unbekanntes Thema/Ratgeber")
    return checklisten, check


def checklisten_html(checklisten, beitraege, site_name):
    by_slug = {b["slug"]: b for b in beitraege}
    nav = ['<nav class="checklist-nav no-print" aria-label="Alle Checklisten">', "  <ul>"]
    for c in checklisten:
        nav.append(f'    <li><a href="#{c["id"]}">{esc(c["titel"])}</a></li>')
    nav += ["  </ul>", "</nav>"]
    out = ["\n".join(nav)]
    for c in checklisten:
        r = by_slug[c["ratgeber"]]
        items = "\n".join(
            f'    <li><label class="choice"><input type="checkbox" id="{c["id"]}-{i}"> <span>{esc(p)}</span></label></li>'
            for i, p in enumerate(c["punkte"], 1)
        )
        out.append(f"""<section class="checklist" id="{c["id"]}" aria-labelledby="{c["id"]}-titel" data-checkliste data-druck-bereich>
  <h2 id="{c["id"]}-titel">{esc(c["titel"])}</h2>
  <p class="checklist__intro">{esc(c["einleitung"])}</p>
  <p class="checklist__progress" aria-live="polite" data-fortschritt hidden></p>
  <ul class="checklist__items">
{items}
  </ul>
  <p class="print-only">{esc(site_name)} – Checkliste zum Ausdrucken. Sie ersetzt keine persönliche Beratung.</p>
  <div class="checklist__actions no-print">
    <button class="btn btn--secondary" type="button" data-drucken hidden>Drucken / als PDF speichern</button>
    <a class="btn btn--primary" href="/?thema={c["thema"]}#anfrage" data-thema="{c["thema"]}">Unterstützung anfragen</a>
  </div>
  <p class="checklist__more no-print">Mehr dazu: <a href="{r["url"]}">{esc(r["titel"])}</a></p>
</section>""")
    return indent("\n\n".join(out).splitlines(), 6)


def wohnungs_check_html(check, beitraege, site_name):
    by_slug = {b["slug"]: b for b in beitraege}
    antworten = (("ja", "Ja"), ("teilweise", "Teilweise"), ("nein", "Nein"))
    form = ['<div data-druck-bereich class="wc-form-wrap">',
            '<form class="wc" id="wohnungs-check-formular" novalidate aria-label="Wohnungs-Check: Fragen">']
    nr = 0
    for g in check["gruppen"]:
        form.append(f'  <fieldset class="wc__group">\n    <legend class="wc__group-title">{esc(g["titel"])}</legend>')
        for f in g["fragen"]:
            nr += 1
            opts = "\n".join(
                f'        <label class="segment__option"><input type="radio" name="{f["id"]}" value="{v}" id="{f["id"]}-{v}"> <span>{label}</span></label>'
                for v, label in antworten
            )
            form.append(f"""    <fieldset class="wc__question" id="frage-{f["id"]}" data-frage="{f["id"]}">
      <legend class="wc__q-text"><span class="wc__q-nr" aria-hidden="true">{nr}</span> {esc(f["frage"])}</legend>
      <div class="segment segment--wrap wc__answers">
{opts}
      </div>
    </fieldset>""")
        form.append("  </fieldset>")
    form.append("""  <div class="wc__actions">
    <p class="form-field__error" id="wc-fehler" role="alert"></p>
    <button class="btn btn--primary" type="submit">Auswertung anzeigen</button>
  </div>
</form>
</div>""")

    gut, blick = [], []
    for g in check["gruppen"]:
        for f in g["fragen"]:
            gut.append(f'      <li data-gut="{f["id"]}" hidden>{esc(f["kurz"])}</li>')
            blick.append(
                f'      <li class="wc-result__item" data-blick="{f["id"]}" data-prio="{f["prioritaet"]}">\n'
                f'        <p class="wc-result__item-title"><strong>{esc(f["kurz"])}</strong> '
                f'<span class="badge" data-antwort-label></span></p>\n'
                f'        <p>{esc(f["empfehlung"])}</p>\n'
                f"      </li>"
            )
    links = "\n".join(
        f'      <li><a href="{by_slug[s]["url"]}">{esc(by_slug[s]["titel"])}</a></li>' for s in check["ratgeber"]
    )
    nl = "\n"
    result = f"""<section class="wc-result" id="ergebnis" aria-labelledby="ergebnis-titel" data-ergebnis data-druck-bereich hidden>
  <h2 id="ergebnis-titel" tabindex="-1">Ihre Auswertung</h2>
  <p class="wc-result__intro" data-ergebnis-intro></p>

  <div class="wc-result__block" data-block-gut hidden>
    <h3>Das ist schon gut</h3>
    <ul class="check-list" data-gut-liste>
{nl.join(gut)}
    </ul>
  </div>

  <div class="wc-result__block" data-block-blick hidden>
    <h3>Hier lohnt sich ein Blick</h3>
    <div data-blick-zuerst hidden>
      <h4>Zuerst: hier besteht Sturzgefahr</h4>
      <ol class="wc-result__list" data-blick-liste-zuerst></ol>
    </div>
    <div data-blick-danach hidden>
      <h4>Danach</h4>
      <ol class="wc-result__list" data-blick-liste-danach></ol>
    </div>
    <!-- Empfehlungen je Frage (Vorrat): assets/js/alltag.js blendet je nach Antwort ein und sortiert nach Priorität -->
    <ul class="wc-result__pool" hidden>
{nl.join(blick)}
    </ul>
  </div>

  <div class="wc-result__block no-print">
    <h3>Mehr dazu im Ratgeber</h3>
    <ul class="wc-result__links">
{links}
    </ul>
  </div>

  <p class="print-only">{esc(site_name)} – Ergebnis des Wohnungs-Checks (nur für Sie ausgedruckt, nichts wurde gespeichert).</p>

  <div class="notice notice--light wc-result__hinweis">
    <svg class="icon" aria-hidden="true"><use href="#icon-info"/></svg>
    <p><strong>Wichtig:</strong> Der Wohnungs-Check gibt Anregungen und ersetzt keine Fachberatung. Bei größeren Veränderungen holen Sie sich bitte Rat von Fachleuten, zum Beispiel einer Wohnberatung.</p>
  </div>

  <div class="btn-group no-print">
    <a class="btn btn--primary" href="/?thema={check["thema"]}#anfrage" data-thema="{check["thema"]}">Unterstützung anfragen</a>
    <button class="btn btn--secondary" type="button" data-drucken>Drucken / als PDF speichern</button>
    <button class="btn btn--secondary" type="button" data-neu-starten>Antworten ändern</button>
  </div>
</section>"""
    return indent("\n".join(form).splitlines(), 6), indent(result.splitlines(), 6)


# --------------------------------------------------------------------------
# Seiten
# --------------------------------------------------------------------------
def pflegegrad_daten():
    """Bettet die Rechner-Daten als JSON in die Seite ein (data/ wird nicht veröffentlicht, kein fetch).
    → WordPress: dieselbe Struktur per wp_add_inline_script oder <script type="application/json">."""
    d = ROOT / "data" / "pflegegrad"
    daten = {
        "regeln": json.loads(read(d / "nba-2017.json")),
        "entwurf": json.loads(read(d / "nba-2027-entwurf.json")),
        "fragen": json.loads(read(d / "fragen.json")),
        "leistungen": json.loads(read(d / "leistungen.json")),
        "hilfe": json.loads(read(d / "hilfe.json")),
    }
    # Jedes Kriterium mit Einzelpunkten muss genau einmal abgefragt werden
    erwartet = []
    for m in daten["regeln"]["module"]:
        for k in m["kriterien"]:
            erwartet += [t[0] for t in k["teile"]] if "teile" in k else [k["id"]]
    gefragt = [f["kriterium"] for s in daten["fragen"]["schritte"] for f in s["fragen"] if "kriterium" in f]
    if sorted(gefragt) != sorted(erwartet):
        fehlt = sorted(set(erwartet) - set(gefragt))
        doppelt = sorted({k for k in gefragt if gefragt.count(k) > 1})
        raise SystemExit(f"FEHLER: fragen.json – fehlende Kriterien {fehlt}, doppelte {doppelt}")
    text = json.dumps(daten, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    return f'<script type="application/json" id="pgr-daten">{text}</script>'


def pflegegrad_seo():
    """FAQ (sichtbar) + JSON-LD (WebApplication, FAQPage, BreadcrumbList) aus derselben Quelle."""
    faq = json.loads(read(ROOT / "data" / "pflegegrad" / "faq.json"))
    items = []
    for i, f in enumerate(faq["fragen"]):
        items.append(
            f'        <details class="faq__item"{" open" if i == 0 else ""}>\n'
            f'          <summary><h3 class="faq__frage">{esc(f["frage"])}</h3></summary>\n'
            f'          <p>{esc(f["antwort"])}</p>\n'
            f'        </details>'
        )
    url = f"{SITE}/mein-alltag/pflegegrad-rechner/"
    data = [
        {"@context": "https://schema.org", "@type": "WebApplication", "name": "Pflegegradrechner",
         "url": url, "applicationCategory": "HealthApplication", "operatingSystem": "Alle (Browser)",
         "inLanguage": "de-DE", "isAccessibleForFree": True,
         "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR"},
         "description": "Unverbindliche Einschätzung des Pflegegrades nach dem Begutachtungsverfahren (§ 15 SGB XI). Läuft im Browser, speichert nichts.",
         "provider": {"@type": "Organization", "name": SITE_NAME, "url": f"{SITE}/"}},
        {"@context": "https://schema.org", "@type": "FAQPage",
         "mainEntity": [{"@type": "Question", "name": f["frage"],
                         "acceptedAnswer": {"@type": "Answer", "text": f["antwort"]}} for f in faq["fragen"]]},
        {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Startseite", "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "Mein Alltag", "item": f"{SITE}/mein-alltag/"},
            {"@type": "ListItem", "position": 3, "name": "Pflegegradrechner", "item": url}]},
    ]
    body = json.dumps(data, ensure_ascii=False, indent=2).replace("</", "<\\/")
    jsonld = ("  <!-- JSON-LD: PLATZHALTER-Domain example.org vor Livegang ersetzen. FAQ-Antworten = sichtbarer Text. -->\n"
              '  <script type="application/ld+json">\n' + indent(body.splitlines(), 2) + "\n  </script>")
    return "\n".join(items), jsonld, faq["stand"]


WOCHENTAGE = ("Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag")
MONATE = ("Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August",
          "September", "Oktober", "November", "Dezember")
EV_KATEGORIEN = ("Bewegung", "Kultur", "Bildung", "Begegnung", "Digital", "Gesundheit")


def tag_label(d):
    return f"{WOCHENTAGE[d.weekday()]}, {d.day}. {MONATE[d.month - 1]} {d.year}"


def veranstaltungen_html(regionen):
    """Veranstaltungskalender /veranstaltungen/: statische, nach Tag gruppierte Liste (funktioniert ohne JS),
    vergangene Termine (vor Build-Datum) entfallen. Filter/Sortierung: assets/js/veranstaltungen.js
    (liest data-*-Attribute der <li>). → WordPress: CPT 'veranstaltung', Taxonomien thema/region."""
    import datetime
    data = json.loads(read(ROOT / "data" / "veranstaltungen.json"))
    heute = datetime.date.today()
    events = []
    for e in data["veranstaltungen"]:
        for key in ("id", "titel", "datum", "beginn", "stadt", "ort", "veranstalter", "kategorie", "kurztext",
                    "kosten", "anmeldung", "barrierefrei", "quelle_url", "geprueft_am", "status"):
            if key not in e:
                raise SystemExit(f"FEHLER: veranstaltungen.json – '{key}' fehlt bei {e.get('id')}")
        if e["kategorie"] not in EV_KATEGORIEN:
            raise SystemExit(f"FEHLER: veranstaltungen.json – unbekannte Kategorie bei {e['id']}")
        if e["stadt"] not in [r["name"] for r in regionen]:
            raise SystemExit(f"FEHLER: veranstaltungen.json – unbekannte Stadt bei {e['id']}")
        if datetime.date.fromisoformat(e["datum"]) >= heute:
            events.append(e)
    events.sort(key=lambda e: (e["datum"], e["beginn"]))

    def de_datum(iso):
        d = datetime.date.fromisoformat(iso)
        return f"{d.day}. {MONATE[d.month - 1]} {d.year}"

    lines = []
    aktuell = None
    for e in events:
        d = datetime.date.fromisoformat(e["datum"])
        if e["datum"] != aktuell:
            if aktuell is not None:
                lines += ["  </ul>", "</section>"]
            aktuell = e["datum"]
            lines += ['<section class="ev-day" data-ev-day>',
                      f'  <h2 class="ev-day__title">{tag_label(d)}</h2>', '  <ul class="ev-list">']
        abgesagt = e["status"] == "abgesagt"
        zeit = e["beginn"] + (f"–{e['ende']}" if e.get("ende") else "") + " Uhr"
        marker = []
        marker.append("Anmeldung nötig" if e["anmeldung"] else "Keine Anmeldung nötig")
        marker.append("Barrierefreiheit bitte erfragen" if e["barrierefrei"] is None
                      else "Barrierefrei" if e["barrierefrei"] else "Nicht barrierefrei")
        titel = esc(e["titel"])
        lines += [
            f'    <li class="ev-item" data-ev data-datum="{e["datum"]}" data-beginn="{e["beginn"]}" '
            f'data-stadt="{esc(e["stadt"])}" data-thema="{esc(e["kategorie"])}" data-label="{tag_label(d)}">',
            f'      <article class="ev-card{" ev-card--abgesagt" if abgesagt else ""}" aria-labelledby="{e["id"]}-titel">',
            '        <p class="ev-card__meta">',
            f'          <span class="ev-card__pill">{esc(e["kategorie"])}</span>',
        ]
        if abgesagt:
            lines.append('          <span class="ev-card__status">Abgesagt</span>')
        lines += [
            '        </p>',
            f'        <h3 class="ev-card__title" id="{e["id"]}-titel">{titel}</h3>',
            f'        <p class="ev-card__when">'
            f'<time datetime="{e["datum"]}T{e["beginn"]}">{tag_label(d)}, {zeit}</time></p>',
            f'        <p class="ev-card__where"><strong>{esc(e["stadt"])}</strong> – {esc(e["ort"])}</p>',
            f'        <p class="ev-card__org">Veranstalter: {esc(e["veranstalter"])}</p>',
            f'        <p class="ev-card__text">{esc(e["kurztext"])}</p>',
            '        <ul class="ev-card__facts">',
            f'          <li><span class="visually-hidden">Kosten: </span><strong>{esc(e["kosten"])}</strong></li>',
        ] + [f'          <li>{m}</li>' for m in marker] + [
            '        </ul>',
            f'        <p class="ev-card__source"><a href="{esc(e["quelle_url"])}">Quelle ansehen<span class="visually-hidden"> zu {titel}</span></a>'
            f' <span class="ev-card__stand">Stand: geprüft am {de_datum(e["geprueft_am"])}</span></p>',
            '      </article>',
            '    </li>',
        ]
    if aktuell is not None:
        lines += ["  </ul>", "</section>"]
    liste_html = indent(lines, 8) if lines else ""

    staedte = sorted({e["stadt"] for e in events})
    kats = [(k, sum(1 for e in events if e["kategorie"] == k)) for k in EV_KATEGORIEN]
    kats = [(k, n) for k, n in kats if n]
    chips = [f'<button type="button" class="filter__btn" aria-pressed="true" data-ev-thema="">'
             f'<svg class="icon filter__check" aria-hidden="true"><use href="#icon-check"/></svg>Alle Themen</button>']
    chips += [f'<button type="button" class="filter__btn" aria-pressed="false" data-ev-thema="{esc(k)}">'
              f'<svg class="icon filter__check" aria-hidden="true"><use href="#icon-check"/></svg>{esc(k)}</button>'
              for k, n in kats]
    return {
        "ev_liste": liste_html,
        "ev_anzahl": f"{len(events)} {'Veranstaltung' if len(events) == 1 else 'Veranstaltungen'}",
        "ev_hinweis": esc(data["hinweis"]),
        "ev_opt_stadt": indent(['<option value="">Alle Orte</option>']
                               + [f'<option value="{esc(x)}">{esc(x)}</option>' for x in staedte], 14),
        "ev_chips_thema": indent(chips, 12),
        # Formular „Veranstaltung melden“: alle Regionen / Kategorien (nicht nur die mit Terminen)
        "melden_opt_stadt": indent(['<option value="">Bitte wählen</option>']
                                   + [f'<option value="{esc(r["name"])}">{esc(r["name"])}</option>' for r in regionen], 16),
        "melden_opt_kategorie": indent(['<option value="">Bitte wählen</option>']
                                       + [f'<option value="{esc(k)}">{esc(k)}</option>' for k in EV_KATEGORIEN], 16),
    }


def write_sitemap(paths):
    """sitemap.xml + robots.txt (Platzhalter-Domain, vor Livegang ersetzen)."""
    urls = "\n".join(f"  <url><loc>{SITE}{p}</loc></url>" for p in sorted(paths))
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        "<!-- GENERIERT von tools/build.py – example.org ist ein Platzhalter -->\n"
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "\n</urlset>\n",
        encoding="utf-8")
    (ROOT / "robots.txt").write_text(
        "# GENERIERT von tools/build.py\nUser-agent: *\nAllow: /\nDisallow: /partials/\nDisallow: /screenshots/\n\n"
        f"Sitemap: {SITE}/sitemap.xml\n", encoding="utf-8")


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
        "body_extra": ("  " + render(meta["body_extra"], page_ctx, template)) if meta.get("body_extra") else "",
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

    checklisten, wohnungs_check = load_alltag(themen, beitraege)
    pgr_faq, pgr_jsonld, pgr_faq_stand = pflegegrad_seo()
    wc_form, wc_result = wohnungs_check_html(wohnungs_check, beitraege, SITE_NAME)
    region_items = [(r["slug"], r["name"]) for r in regionen]
    common = {
        "site_name": esc(SITE_NAME),
        # Startseite: die drei neuesten Beiträge (Raster mit 3 Spalten), Übersicht: alle (keine Begrenzung)
        "ratgeber_karten": "\n".join(article_card(b, "h3", 8) for b in beitraege[:3]),
        "leitfaden_angehoerige": next(
            (b["url"] for b in beitraege if b["slug"] == "eltern-aus-der-ferne-unterstuetzen"), "/ratgeber/"),
        "ratgeber_karten_h2": "\n".join(article_card(b, "h2", 8, filter_attr=True) for b in beitraege),
        "ratgeber_filter": ratgeber_filter(themen, beitraege),
        "checklisten_inhalt": checklisten_html(checklisten, beitraege, SITE_NAME),
        "wc_formular": wc_form,
        "wc_ergebnis": wc_result,
        "pgr_daten": pflegegrad_daten(),
        "pgr_faq": pgr_faq,
        "pgr_jsonld": pgr_jsonld,
        "pgr_faq_stand": esc(pgr_faq_stand),
        "home_head": home_head(regionen),
        **veranstaltungen_html(regionen),
        "assistent_daten": assistent_data(themen, regionen, beitraege),
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
        ("veranstaltungen.html", "veranstaltungen/index.html"),
        ("veranstaltungen-melden.html", "veranstaltungen/melden/index.html"),
        ("mein-alltag-checklisten.html", "mein-alltag/checklisten/index.html"),
        ("mein-alltag-wohnungs-check.html", "mein-alltag/wohnungs-check/index.html"),
        ("mein-alltag-pflegegrad-rechner.html", "mein-alltag/pflegegrad-rechner/index.html"),
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

    write_sitemap(["/" + p.removesuffix("index.html") for p in built if p != "404.html"])
    print("  ✓ data/ratgeber.json, sitemap.xml, robots.txt")
    for path in built:
        print(f"  ✓ {path}")
    print(f"{len(built)} Seiten erzeugt.")


if __name__ == "__main__":
    sys.exit(main())
