#!/usr/bin/env python3
"""KONZEPT 60+ – statischer Seitengenerator (nur Python-Standardbibliothek).

Aufruf im Projektordner:   python3 tools/build.py

Erzeugt alle HTML-Seiten aus
  templates/_layout.html          Grundgerüst (<head>, Skip-Link, <main>, Skripte)
  templates/<seite>.html          Seiteninhalt (+ Meta-Kommentar mit title/description/nav)
  partials/icons.html             SVG-Sprite
  partials/header.html            Kopfbereich inkl. Navigation ({{nav:…}} → aria-current)
  partials/footer.html            Fußbereich ({{footer_themen}}, {{footer_regionen}})
  data/themen.json, data/regionen.json

Die erzeugten Dateien (index.html, themen/…, fuer-anbieter/…, 404.html …) werden
eingecheckt – das Deployment (Cloudflare Workers Assets) braucht keinen Build.

Platzhalter-Syntax: {{name}}. Unbekannte Platzhalter brechen den Build ab.
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "templates"
PARTIALS = ROOT / "partials"
SITE = "https://www.example.org"  # PLATZHALTER-Domain (reserviert) – vor Livegang ersetzen

PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-z0-9_:\-]+)\s*\}\}")
META_RE = re.compile(r"\A<!--meta\n(.*?)\n-->\n", re.S)
NAV_KEYS = ("themen", "ratgeber", "anbieter")


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
    """Je Kategorie eine Checkbox-Gruppe; JS blendet die passende ein (ohne JS: verborgen, Freitext genügt)."""
    blocks = []
    for t in themen:
        items = t["leistungen"] + ["Sonstiges"]
        choices = []
        for i, leistung in enumerate(items, 1):
            value = slugify(leistung) if leistung != "Sonstiges" else "sonstiges"
            label = esc(leistung) if leistung != "Sonstiges" else "Sonstiges (bitte unten beschreiben)"
            choices.append(
                f'  <label class="choice"><input type="checkbox" name="leistungen" value="{value}" '
                f'id="f-l-{t["slug"]}-{i}"> <span>{label}</span></label>'
            )
        blocks.append(
            f'<fieldset class="form-field" data-leistungen="{t["slug"]}" hidden disabled>\n'
            f'  <legend>Was genau wird benötigt? <span class="form-field__hint">(freiwillig, mehrere möglich)</span></legend>\n'
            f'  <div class="choice-group choice-group--cols">\n'
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
# Seiten
# --------------------------------------------------------------------------
def home_head(regionen):
    """Hero-Preload + JSON-LD der Startseite (Platzhalterwerte)."""
    area = ", ".join(json.dumps(r["name"], ensure_ascii=False) for r in regionen)
    return f"""  <link rel="preload" as="image" type="image/webp"
        imagesrcset="/assets/img/hero-garten-800.webp 800w, /assets/img/hero-garten-1600.webp 1600w"
        imagesizes="(min-width: 60em) 55vw, 100vw">

  <!-- JSON-LD: PLATZHALTER – url (example.org = reservierte Beispiel-Domain) und telephone
       (Demo-Nummer, nicht vergeben) vor Livegang ersetzen; Adresse/Logo erst mit echten Daten ergänzen. -->
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "KONZEPT 60+",
    "url": "{SITE}/",
    "description": "Kostenloses Vermittlungsportal für Menschen ab 60 und Angehörige: Unser Team sucht persönlich passende Dienstleister und private Helfer in der Region.",
    "telephone": "+49-211-00000000",
    "areaServed": [{area}]
  }}
  </script>"""


def meta_seo(path, title, description, image=None, noindex=False):
    if noindex:
        return '  <meta name="robots" content="noindex">'
    img, w, h, alt = image or (
        "/assets/img/hero-garten-1600.jpg", 1600, 900, "Ältere Frau sitzt lächelnd mit einem Glas in einem sonnigen Garten."
    )
    return f"""  <!-- PROTOTYP: example.org ist eine reservierte Platzhalter-Domain – Canonical, Open Graph
       und JSON-LD vor Livegang auf die echte Domain umstellen. -->
  <link rel="canonical" href="{SITE}{path}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="de_DE">
  <meta property="og:site_name" content="KONZEPT 60+">
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
    nav_ctx = {}
    for key in NAV_KEYS:
        if key == nav:
            nav_ctx[f"nav:{key}"] = ' aria-current="true"' if meta.get("nav_level") == "section" else ' aria-current="page"'
        else:
            nav_ctx[f"nav:{key}"] = ""

    image = None
    if "thema_slug" in ctx:
        t = next(t for t in themen if t["slug"] == ctx["thema_slug"])
        image = (f'/{t["bild"]["datei"]}-800.jpg', 800, 1000, t["bild"]["alt"])

    content = render(body, page_ctx, template)
    layout_ctx = {
        "title": esc(title),
        "description": esc(description),
        "meta_seo": meta_seo(path, title, description, image, noindex=path is None),
        "head_extra": render(meta.get("head_extra", ""), page_ctx, template),
        "icons": partials["icons"].rstrip(),
        "header": render(partials["header"], nav_ctx, "partials/header.html").rstrip(),
        "footer": render(partials["footer"], {
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

    region_items = [(r["slug"], r["name"]) for r in regionen]
    common = {
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
        })
        built.append(build_page("thema.html", f"themen/{t['slug']}/index.html", ctx, partials, themen, regionen))

    for path in built:
        print(f"  ✓ {path}")
    print(f"{len(built)} Seiten erzeugt.")


if __name__ == "__main__":
    sys.exit(main())
