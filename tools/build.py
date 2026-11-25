#!/usr/bin/env python3
"""Konzept 60+ – statischer Seitengenerator (nur Python-Standardbibliothek).

Aufruf im Projektordner:   python3 tools/build.py

Erzeugt alle HTML-Seiten aus
  templates/_layout.html          Grundgerüst (<head>, Skip-Link, <main>, Skripte)
  templates/<seite>.html          Seiteninhalt (+ Meta-Kommentar mit title/description/nav)
  partials/icons.html             SVG-Sprite
  partials/header.html            Kopfbereich inkl. Navigation ({{nav:…}} → aria-current)
  partials/footer.html            Fußbereich ({{footer_themen}}, {{footer_regionen}})
  data/themen.json, data/regionen.json, data/checklisten.json, data/wohnungs-check.json
  data/anliegen.json              Anliegen-Katalog (Suche + Assistent, geprüft in load_anliegen())
  data/ratgeber-kategorien.json   Ratgeber-Kategorien/Unterkategorien (geprüft in load_ratgeber_kategorien())
  content/ratgeber/*.md           Ratgeber-Beiträge (Frontmatter + Markdown-Teilmenge)
                                  → ratgeber/<slug>/index.html, ratgeber/index.html, ratgeber/<kategorie>/index.html,
                                    assets/data/ratgeber-suche.json,
                                    data/ratgeber.json (gesammelte Frontmatter, generiert)

Die erzeugten Dateien (index.html, themen/…, fuer-anbieter/…, 404.html …) werden
eingecheckt – das Deployment (Cloudflare Workers Assets) braucht keinen Build.

Platzhalter-Syntax: {{name}}. Unbekannte Platzhalter brechen den Build ab.
"""
import hashlib
import html
import json
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "templates"
PARTIALS = ROOT / "partials"
CONTENT = ROOT / "content" / "ratgeber"
RATGEBER_IMG = "assets/img/ratgeber"
SITE_NAME = "Konzept 60+"  # Arbeitstitel – hier zentral ändern; Templates nutzen {{site_name}}
SITE = "https://www.example.org"  # PLATZHALTER-Domain (reserviert) – vor Livegang ersetzen. Einzige Stelle der Domain:
                                  # Canonical, Open Graph, JSON-LD, sitemap.xml und robots.txt nutzen nur SITE.
PLATZHALTER = "PLATZHALTER-Domain (SITE in tools/build.py) vor Livegang ersetzen"

PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-z0-9_:\-]+)\s*\}\}")
META_RE = re.compile(r"\A<!--meta\n(.*?)\n-->\n", re.S)
# Hauptnavigation (Relaunch 3.2, Konzept Abschnitt 8): Hilfe finden · Ratgeber · Mein Alltag · So funktioniert es,
# dazu der Knopf „Anbieter suchen“ (nav:suche, ebenfalls /hilfe-finden/). „Für Anbieter“ steht nur noch im Footer.
# Template-Kopf „nav: hilfe“ markiert /hilfe-finden/ (Menüpunkt und Knopf, aria-current="page");
# „nav: hilfe“ + „nav_level: section“ markiert nur den Menüpunkt (Themenübersicht und Themenseiten, aria-current="true").
NAV_KEYS = ("hilfe", "ratgeber", "alltag", "so", "suche")


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
    """<picture> mit WebP 480/800 + JPG-Fallback 800 (4:5, 800×1000; abweichende Höhe über bild.hoehe,
    z. B. Pflege-Bild 800×880 ohne Rollstuhlgriff – CSS schneidet per object-fit auf 4:5 zu)."""
    base = "/" + thema["bild"]["datei"]
    hoehe = thema["bild"].get("hoehe", 1000)
    extra = ' fetchpriority="high"' if priority else ""
    return (
        f'<picture class="{css_class}">\n'
        f'  <source type="image/webp" srcset="{base}-480.webp 480w, {base}-800.webp 800w" sizes="{sizes}">\n'
        f'  <img src="{base}-800.jpg" width="800" height="{hoehe}" alt="{esc(thema["bild"]["alt"])}"\n'
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
        <a class="card__link" href="/anfrage/?thema={t["slug"]}" data-thema="{t["slug"]}">Anliegen beschreiben<span class="visually-hidden">: {title}</span> <svg class="icon" aria-hidden="true"><use href="#icon-arrow"/></svg></a>
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
        [f'<li><a href="/anfrage/?region={r["slug"]}" data-region="{r["slug"]}">{esc(r["name"])}</a></li>' for r in regionen],
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


# --------------------------------------------------------------------------
# Relaunch 3.2: Sprungmarken der Leistungen auf den Themenseiten und Bausteine der Startseite (A–F,
# docs/relaunch/startseite-ia.md). → WordPress: front-page.php mit Template-Parts hero-suche, themen,
# ablauf, ratgeber-auswahl, vertrauen.
# --------------------------------------------------------------------------
THEMA_IDS = {"inhalt", "hauptnavigation", "angebote-titel", "leistungen-titel", "persoenlich-titel",
             "weitere-titel", "ratgeber-hinweis-titel", "leistungen"}


def leistung_anker(leistung):
    """Sprungmarke einer Leistung auf ihrer Themenseite, z. B. #treppenlift-und-hilfsmittel."""
    return slugify(leistung)


def anliegen_fuer_leistung(leistung, anliegen):
    """Passendstes Anliegen zu einer Leistung (für den Link „Anbieter suchen“ auf der Themenseite):
    zuerst Anliegen mit Anbieterliste, ohne Gruppe, mit möglichst wenigen Leistungen; sonst Katalogreihenfolge."""
    passend = [a for a in anliegen["anliegen"] if leistung in a["leistungen"]]
    if not passend:
        raise SystemExit(f"FEHLER: Leistung „{leistung}“ hat kein Anliegen")
    return min(passend, key=lambda a: (not a["kategorien"], bool(a.get("gruppe")), len(a["leistungen"])))


def thema_leistungen_liste(t, anliegen, n):
    """„Beispiele für konkrete Leistungen“ auf der Themenseite: jede Leistung mit eigener Sprungmarke
    (Ziel der Unterthemen-Links der Startseite) und einem Link in den Assistenten (/hilfe-finden/?anliegen=…)."""
    lines = ['<ul class="check-list check-list--leistungen">']
    gesehen = set()
    for leistung in t["leistungen"]:
        anker = leistung_anker(leistung)
        if anker in gesehen or anker in THEMA_IDS:
            raise SystemExit(f"FEHLER: themen.json – Sprungmarke #{anker} ({t['slug']}) nicht eindeutig")
        gesehen.add(anker)
        a = anliegen_fuer_leistung(leistung, anliegen)
        text = "Anbieter suchen" if a["kategorien"] else "Mehr dazu"
        lines.append(
            f'  <li id="{anker}"><svg class="icon" aria-hidden="true"><use href="#icon-check"/></svg>'
            f'<span>{esc(leistung)} <a class="check-list__link" href="/hilfe-finden/?anliegen={a["id"]}">'
            f'{text}<span class="visually-hidden">: {esc(leistung)}</span></a></span></li>'
        )
    lines.append("</ul>")
    return indent(lines, n)


def unterthemen(t):
    """Unterthemen-Links einer Startseiten-Karte: die bisherigen Beispiel-Stichworte (Text bleibt), jeweils
    verlinkt auf die Sprungmarke der passenden Leistung (erste Leistung, die das erste Wort enthält)."""
    out = []
    for b in t["beispiele"]:
        wort = b.split()[0].lower()
        leistung = next((x for x in t["leistungen"] if wort in x.lower()), None)
        if not leistung:
            raise SystemExit(f"FEHLER: themen.json – Beispiel „{b}“ ({t['slug']}) passt zu keiner Leistung")
        out.append((b, f'/themen/{t["slug"]}/#{leistung_anker(leistung)}'))
    if not 3 <= len(out) <= 4:
        raise SystemExit(f"FEHLER: themen.json – {t['slug']} braucht 3–4 Beispiele für die Startseite")
    return out


START_SIZES = "(min-width: 48em) 10rem, 3rem"


def themen_start(themen, n):
    """Teil B: sechs Themenkarten (Bild, Titel, 3–4 Unterthemen-Links, „Alle Leistungen ansehen“).
    Anders als das Kartenraster auf /themen/: Bild links, Unterthemen als Links (→ template-parts/card-thema-start.php)."""
    lines = []
    for t in themen:
        title = esc(t["titel"])
        links = "\n".join(
            f'    <li><a class="thema-start__link" href="{href}">{esc(label)}</a></li>' for label, href in unterthemen(t)
        )
        lines.append(f"""<li class="thema-start">
{indent(picture(t, START_SIZES, "thema-start__media").splitlines(), 2)}
  <h3 class="thema-start__title" id="thema-start-{t["slug"]}"><a href="/themen/{t["slug"]}/">{title}</a></h3>
  <ul class="thema-start__links" aria-labelledby="thema-start-{t["slug"]}">
{links}
  </ul>
  <p class="thema-start__alle"><a href="/themen/{t["slug"]}/#leistungen-titel">Alle Leistungen ansehen<span class="visually-hidden">: {title}</span></a></p>
</li>""")
    return indent("\n".join(lines).splitlines(), n)


def hero_chips(anliegen, n):
    """Teil A, „Häufig gesucht“: Links in den Assistenten mit vorgewähltem Anliegen (und ggf. Filterantwort),
    Reihenfolge und Wortlaut aus data/anliegen.json → startseite. Funktionieren ohne JS als normale Links."""
    from urllib.parse import urlencode
    lines = []
    for c in anliegen["startseite"]:
        query = urlencode({"anliegen": c["anliegen"], **c.get("vorwahl", {})})
        lines.append(f'<li><a class="hero-chip" href="/hilfe-finden/?{esc(query)}">{esc(c["titel"])}</a></li>')
    return indent(lines, n)


def ratgeber_start(beitraege, n):
    """Teil E: sechs ausgewählte Beiträge (Frontmatter startseite: 1–6) statt der drei neuesten;
    Karte wie überall (Bild, Thema, Titel, automatischer Anreißer)."""
    auswahl = sorted((b for b in beitraege if b.get("startseite")), key=lambda b: int(b["startseite"]))
    return "\n".join(article_card(b, "h3", n) for b in auswahl)


def werkzeug_kacheln(n):
    """Teil E: Kacheln Pflegegradrechner, Wohnungs-Check, Checklisten (aus ALLTAG_WERKZEUGE) und Veranstaltungen.
    Ohne Illustrationen: schlichte Verweiszeilen, damit nicht jedes Raster gleich aussieht."""
    by_id = {w["id"]: w for w in ALLTAG_WERKZEUGE}
    kacheln = [by_id["pflegegrad-rechner"], by_id["wohnungs-check"], by_id["checklisten"],
               {"titel": "Veranstaltungen", "hinweis": "Was ist los in Ihrer Stadt?", "url": "/veranstaltungen/"}]
    lines = [
        f'<li><a class="werkzeug-kachel" href="{k["url"]}"><span class="werkzeug-kachel__titel">{esc(k["titel"])}</span>'
        f'<span class="werkzeug-kachel__text">{esc(k["hinweis"])}</span>'
        f'<svg class="icon" aria-hidden="true"><use href="#icon-arrow"/></svg></a></li>'
        for k in kacheln
    ]
    return indent(lines, n)


VERTRAUEN = [
    ("kostenlos", "Kostenlos und unverbindlich",
     "Suche, Ratgeber und Vermittlung kosten Sie nichts. Sie gehen keine Verpflichtung ein."),
    (None, "Sie entscheiden selbst",
     "Sie wählen den Anbieter aus und vereinbaren Preise und Termine direkt mit ihm."),
    ("regional", "Regional und nah",
     "Anbieter aus Ihrer Region: Rheinland, Niederrhein und Bergisches Land."),
    ("persoenlich", "Wir helfen, wenn Sie nicht weiterkommen",
     "Persönlich statt anonym: Jemand aus unserem Team sucht für Sie, wenn nichts passt oder Sie lieber Unterstützung möchten."),
]


def vertrauen_liste(n):
    """Teil F (Startseite) und /so-funktioniert-es/: vier Aussagen mit den vorhandenen Icons (WebP, 96/192 px).
    Für „Sie entscheiden selbst“ gibt es kein eigenes Bild: dort steht das vorhandene Häkchen aus dem SVG-Sprite."""
    lines = ['<ul class="vertrauen">']
    for icon, titel, text in VERTRAUEN:
        if icon:
            bild = (f'<img class="vertrauen__icon" src="/assets/img/icons/{icon}-96.webp" '
                    f'srcset="/assets/img/icons/{icon}-96.webp 1x, /assets/img/icons/{icon}-192.webp 2x" '
                    f'width="96" height="96" alt="" loading="lazy" decoding="async">')
        else:
            bild = '<span class="vertrauen__icon vertrauen__icon--zeichen"><svg class="icon" aria-hidden="true"><use href="#icon-check"/></svg></span>'
        lines += [
            '  <li class="vertrauen__item">',
            f"    {bild}",
            f'    <p><strong class="vertrauen__titel">{esc(titel)}</strong> {esc(text)}</p>',
            "  </li>",
        ]
    lines.append("</ul>")
    return indent(lines, n)


# --------------------------------------------------------------------------
# Seiten-Werkzeuge: Vorlesen / Teilen / Drucken
# (→ WordPress: template-parts/seiten-werkzeuge.php mit denselben Argumenten)
# Eine gemeinsame Button-Reihe für mehrere Seitentypen – damit das Markup nur hier
# steht. Alle Schaltflächen brauchen JavaScript und stehen deshalb mit "hidden" im
# HTML; assets/js/main.js (8., 10., 11.) zeigt sie, wenn der Browser sie unterstützt.
# Klasse "no-print": im Ausdruck verschwindet die Reihe (assets/css/print.css).
# --------------------------------------------------------------------------
VORLESEN_HTML = [
    '<!-- Vorlesen: Browser-Sprachausgabe (Web Speech API), ohne Drittanbieter.',
    '     Bleibt verborgen, wenn der Browser keine Sprachausgabe kann (main.js, Abschnitt 8). -->',
    '<div class="vorlesen" data-vorlesen hidden>',
    '  <button type="button" class="btn btn--secondary vorlesen__btn" data-vorlesen-start>',
    '    <svg class="icon" aria-hidden="true"><use href="#icon-vorlesen" data-vorlesen-icon/></svg>',
    '    <span class="seiten-werkzeuge__lang" data-vorlesen-label>Beitrag vorlesen</span>',
    '    <span class="seiten-werkzeuge__kurz" aria-hidden="true" data-vorlesen-kurz>Vorlesen</span>',
    '  </button>',
    '  <button type="button" class="btn btn--secondary vorlesen__btn" data-vorlesen-stopp hidden>',
    '    <svg class="icon" aria-hidden="true"><use href="#icon-stopp"/></svg>',
    '    <span>Stopp</span>',
    '  </button>',
    '  <p class="vorlesen__status visually-hidden" role="status" aria-live="polite" data-vorlesen-status></p>',
    '</div>',
]


def seiten_werkzeuge(teilen_aria, n, vorlesen=False, drucken=None, teilen_titel=None,
                     teilen_label="Seite teilen", dezent=True):
    """teilen_aria  aria-label der Teilen-Schaltfläche (sagt, was geteilt wird)
    n            Einrückung im Template (der Platzhalter steht in Spalte 0)
    vorlesen     Vorlesen-Schaltflächen voranstellen (nur Ratgeber-Beiträge)
    drucken      Beschriftung der Druck-Schaltfläche ([data-drucken-seite] → window.print());
                 None = keine Druck-Schaltfläche. Bewusst NICHT [data-drucken]: das ist in
                 assets/js/alltag.js der Bereichsdruck (Checkliste, Auswertung).
    teilen_titel eigener Titel zum Teilen statt document.title
    dezent       True (Übersichtsseiten): Textlinks mit Symbol statt Pillenbuttons.
                 False (Ratgeber-Beitrag): Buttons; auf dem Handy nebeneinander mit
                 Kurzbeschriftung (lange Beschriftung bleibt im Namen, visuell verborgen)
    """
    mod = " seiten-werkzeuge--dezent" if dezent else ""
    btn = "seiten-werkzeuge__link" if dezent else "btn btn--secondary seiten-werkzeuge__btn"

    def label(lang, kurz):
        if dezent:
            return [f"    <span>{esc(lang)}</span>"]
        return [f'    <span class="seiten-werkzeuge__lang">{esc(lang)}</span>',
                f'    <span class="seiten-werkzeuge__kurz" aria-hidden="true">{esc(kurz)}</span>']

    lines = [f'<div class="seiten-werkzeuge{mod} no-print" data-werkzeuge>']
    if vorlesen:
        lines += ["  " + line for line in VORLESEN_HTML]
    titel_attr = f' data-teilen-titel="{esc(teilen_titel)}"' if teilen_titel else ""
    lines += [
        f'  <button type="button" class="{btn}" data-teilen{titel_attr}',
        f'          aria-label="{esc(teilen_aria)}" hidden>',
        '    <svg class="icon" aria-hidden="true"><use href="#icon-teilen"/></svg>',
        *label(teilen_label, "Teilen"),
        "  </button>",
    ]
    if drucken:
        lines += [
            f'  <button type="button" class="{btn}" data-drucken-seite hidden>',
            '    <svg class="icon" aria-hidden="true"><use href="#icon-drucken"/></svg>',
            *label(drucken, "Drucken"),
            "  </button>",
        ]
    lines += [
        '  <p class="seiten-werkzeuge__status" role="status" aria-live="polite" data-werkzeuge-status></p>',
        "</div>",
    ]
    return indent(lines, n)


def andere_themen(themen, aktuell):
    lines = []
    for t in themen:
        if t["slug"] == aktuell:
            continue
        lines.append(
            f'<li><a class="topic-link" href="/themen/{t["slug"]}/">'
            f'<img class="topic-link__img" src="/{t["bild"]["datei"]}-480.webp" width="480" height="{t["bild"].get("hoehe", 1000) * 480 // 800}" alt="" loading="lazy" decoding="async">'
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
#   startseite             1–6: Platz in der Ratgeber-Auswahl der Startseite (jede Zahl genau einmal)
# Relaunch 3.3 (Ratgeber-Struktur, data/ratgeber-kategorien.json):
#   kategorie              Pflicht: Slug der Kategorie (Breadcrumb, Kicker, Kategorieseite)
#   unterkategorien        Pflicht: Slugs, mit Komma getrennt (Mehrfachzuordnung, auch aus anderen Kategorien)
#   hervorgehoben          1–3: Platz unter „Empfohlen“ auf /ratgeber/ (2–3 Beiträge, jede Zahl einmal)
#   anliegen               id aus data/anliegen.json → Knopf „Passende Hilfe finden“ (/hilfe-finden/?anliegen=…)
#   kurz                   Liste (Zeilen „  - Punkt“): Kasten „Das Wichtigste in Kürze“, 3–5 Punkte,
#                          nur Aussagen aus dem Beitrag (Zahlen prüft load_beitraege gegen den Text)
# --------------------------------------------------------------------------
FRONTMATTER_KEYS = ("titel", "slug", "thema", "kategorie", "unterkategorien", "bild", "bild_alt", "stand", "geaendert")
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
    key = None
    for line in lines[1:end]:
        if not line.strip():
            continue
        # Liste (nur für Felder ohne Wert in der Kopfzeile, z. B. „kurz:“ + Zeilen „  - Punkt“)
        if line.startswith((" ", "\t")) and line.strip().startswith("- "):
            if key is None or not isinstance(meta.get(key), list):
                raise SystemExit(f"FEHLER: {source} – Listenpunkt ohne Listenfeld: {line!r}")
            meta[key].append(line.strip()[2:].strip())
            continue
        key, sep, value = line.partition(":")
        if not sep:
            raise SystemExit(f"FEHLER: {source} – ungültige Frontmatter-Zeile: {line!r}")
        key = key.strip()
        meta[key] = value.strip() if value.strip() else []
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


# ids, die die Beitragsvorlage selbst vergibt (Inhaltsverzeichnis, Kästen) – nie für Überschriften
RESERVIERTE_IDS = ("inhalt", "toc-titel", "kurz-titel", "fragen-titel", "quellen-titel",
                   "anfrage-cta-titel", "weitere-beitraege-titel", "hauptnavigation")


def heading_ids(blocks):
    """Eindeutige ids für ##-Überschriften (Sprungziele des Inhaltsverzeichnisses)."""
    ids, seen = {}, set()
    for i, (kind, data) in enumerate(blocks):
        if kind == "h2":
            # führende Nummerierung („1. “) weglassen → ids beginnen mit Buchstaben (CSS-/JS-Selektoren)
            base = slugify(re.sub(r"^\d+\.\s*", "", plain(data))) or "abschnitt"
            anchor, n = base, 2
            while anchor in seen or anchor in RESERVIERTE_IDS:
                anchor, n = f"{base}-{n}", n + 1
            seen.add(anchor)
            ids[i] = anchor
    # ###-Überschriften, die als Frage formuliert sind, bekommen ebenfalls eine id (Sprungziel der
    # „Häufigen Fragen“, Relaunch 3.3). ##-ids bleiben dadurch unverändert (zuerst vergeben).
    for i, (kind, data) in enumerate(blocks):
        if kind == "h3" and plain(data).rstrip().endswith("?"):
            base = slugify(re.sub(r"^\d+(\.\d+)*\.?\s*", "", plain(data))) or "frage"
            anchor, n = base, 2
            while anchor in seen or anchor in RESERVIERTE_IDS:
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
            out.append(f'<h3 id="{ids[i]}">{inline(data)}</h3>' if i in ids else f"<h3>{inline(data)}</h3>")
        elif kind == "p":
            out.append(f"<p>{inline(data)}</p>")
        elif kind == "ul" and all(item.startswith("[ ] ") for item in data):
            # Aufgabenliste: interaktive Checkliste (ids pro Seite eindeutig).
            # Fortschritt + Zurücksetzen: main.js (initBeitragCheck), ohne JS verborgen.
            out.append('<div class="beitrag-check" data-beitrag-check>')
            out.append('  <div class="beitrag-check__status" data-check-status hidden>')
            out.append(f'    <p class="beitrag-check__text" aria-live="polite"><span data-check-text>0 von {len(data)} Punkten geklärt</span>'
                       '<span class="beitrag-check__prozent" data-check-prozent>0 %</span></p>')
            out.append(f'    <div class="beitrag-check__balken" role="progressbar" aria-label="Fortschritt der Checkliste" '
                       f'aria-valuemin="0" aria-valuemax="{len(data)}" aria-valuenow="0"><span data-check-balken></span></div>')
            out.append('  </div>')
            out.append('  <ul class="beitrag-checkliste">')
            for item in data:
                n_check += 1
                out.append(
                    f'    <li><label class="choice"><input type="checkbox" id="{slug}-check-{n_check}"> '
                    f'<span>{inline(item[4:].strip())}</span></label></li>')
            out.append("  </ul>")
            out.append('  <button type="button" class="btn btn--secondary beitrag-check__reset no-print" data-check-reset hidden>Checkliste zurücksetzen</button>')
            out.append("</div>")
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
    """Fügt jedes weitere Bild nach der ersten Liste des passenden Abschnitts ein.
    ##-Überschrift: ohne Liste direkt nach der Überschrift (wie bisher).
    ###-Überschrift: ohne Liste am Ende des Unterabschnitts (vor der nächsten Überschrift)."""
    for bild, alt, ueberschrift in inline_bilder(meta):
        start = next((i for i, (k, d) in enumerate(blocks)
                      if k in ("h2", "h3") and plain(d).startswith(ueberschrift)), None)
        if start is None:
            raise SystemExit(f"FEHLER: {source} – Überschrift für inline_bild nicht gefunden: {ueberschrift!r}")
        ende = ("h2",) if blocks[start][0] == "h2" else ("h2", "h3")
        pos = start + 1
        for i in range(start + 1, len(blocks) + 1):
            if i == len(blocks) or blocks[i][0] in ende:
                if blocks[start][0] == "h3":
                    pos = i
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
        # „Das Wichtigste in Kürze“ (Relaunch 3.3): 3–5 Punkte, nur Aussagen aus dem Beitrag.
        # Grobe Absicherung: Jede Zahl eines Punkts muss genau so im Beitragstext stehen.
        if "kurz" in meta:
            if not isinstance(meta["kurz"], list) or not 3 <= len(meta["kurz"]) <= 5:
                raise SystemExit(f"FEHLER: {source} – 'kurz' braucht 3–5 Listenpunkte („  - …“)")
            text = plain(body)
            for punkt in meta["kurz"]:
                for zahl in re.findall(r"\d+(?:[.,]\d+)*", punkt):
                    if not re.search(r"(?<![\d.,])" + re.escape(zahl) + r"(?![\d]|[.,]\d)", text):
                        raise SystemExit(f"FEHLER: {source} – Zahl „{zahl}“ aus 'kurz' steht nicht im Beitrag: {punkt!r}")
        for key, value in meta.items():
            if isinstance(value, list) and key != "kurz":
                raise SystemExit(f"FEHLER: {source} – Feld '{key}' darf keine Liste sein")
        beitraege.append(b)
    # Startseiten-Auswahl (Relaunch 3.2): Frontmatter "startseite: 1" … "startseite: 6", jede Zahl genau einmal
    # (→ WordPress: Meta-Feld bzw. „Beitrag oben halten“ + menu_order)
    plaetze = sorted(b["startseite"] for b in beitraege if b.get("startseite"))
    if plaetze != [str(i) for i in range(1, 7)]:
        raise SystemExit(f"FEHLER: Frontmatter 'startseite' muss genau einmal 1 bis 6 vergeben (gefunden: {plaetze})")
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


ANBIETER_ASSET = "assets/data/anbieter.json"
ASSISTENT_ASSET = "assets/data/assistent.json"


def write_anbieter_assets(themen):
    """data/anbieter.json (Konverter tools/kontakte.py) -> assets/data/anbieter.json (ausgeliefert, per fetch geladen
    von assets/js/anbieter.js, erst wenn der Anbieter-Schritt im Anfrageformular erreicht wird).
    Leere Felder entfallen; 'leistungen' = Leistungs-Slug (wie value der Checkbox) -> passende Kategorie-IDs.
    → WordPress: CPT 'anbieter' + REST-Endpunkt, der dieselbe Struktur liefert.
    Gibt die URL mit ?v=<Hash> zurück (Cache-Busting wie bei CSS/JS)."""
    daten = json.loads(read(ROOT / "data" / "anbieter.json"))
    zuordnung = json.loads(read(ROOT / "data" / "kategorie-zuordnung.json"))
    slugs = {t["slug"] for t in themen}
    for e in daten["anbieter"]:
        if e["thema"] not in slugs:
            raise SystemExit(f"FEHLER: anbieter.json – unbekanntes Thema {e['thema']} bei {e['id']}")
    leistungen = {}
    for thema, liste in zuordnung["leistungen"].items():
        for text, ids in liste.items():
            leistungen[slugify(text)] = ids
    kompakt = [{k: v for k, v in e.items() if v not in ("", [], None, False) or k == "id"} for e in daten["anbieter"]]
    out = {"modus": daten["modus"], "stand": daten["stand"], "leistungen": leistungen, "anbieter": kompakt}
    ziel = ROOT / ANBIETER_ASSET
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return "/" + ANBIETER_ASSET + "?v=" + _asset_version("/" + ANBIETER_ASSET)


def write_ratgeber_json(beitraege):
    """data/ratgeber.json – gesammelte Beitragsdaten (Abbildung auf WordPress-Posts, s. README)."""
    keys = ("slug", "titel", "thema", "thema_titel", "kategorie", "kategorie_titel", "unterkategorien", "hervorgehoben",
            "anliegen", "kurz", "bild", "bild_alt", "stand", "veroeffentlicht", "geaendert", "startseite", "anreisser", "url",
            "inline_bild", "inline_bild_alt", "inline_nach_ueberschrift", "tabelle_beschriftung", "hinweis",
            "quellen", "seo_titel", "meta_beschreibung")
    data = {
        "_hinweis": "GENERIERT von tools/build.py aus content/ratgeber/*.md – nicht direkt bearbeiten",
        "beitraege": [{k: b[k] for k in keys if k in b} for b in beitraege],
    }
    (ROOT / "data" / "ratgeber.json").write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def article_card(b, heading="h3", n=0, pill=None):
    """Beitragskarte mit Bild 3:2, geschwungener Textfläche und Pill (→ template-parts/card-artikel.php).
    pill: Text der Pill (Standard: Themenbereich; „Verwandte Ratgeber“ zeigen die Ratgeber-Kategorie)."""
    title = esc(b["titel"])
    lines = [
        "<li>",
        '  <article class="article-card article-card--image">',
        f'    <img class="article-card__media" src="/{RATGEBER_IMG}/{b["bild"]}-800.webp" width="800" height="533" alt="" loading="lazy" decoding="async">',
        '    <div class="article-card__body">',
        f'      <p class="article-card__meta"><span class="article-card__pill">{esc(pill or b["thema_titel"])}</span></p>',
        f'      <{heading} class="article-card__title"><a href="{b["url"]}">{title}</a></{heading}>',
        f'      <p class="article-card__text">{esc(b["anreisser"])}</p>',
        '      <p class="article-card__more" aria-hidden="true">Weiterlesen →</p>',
        "    </div>",
        "  </article>",
        "</li>",
    ]
    return indent(lines, n)


ALLTAG_WERKZEUGE = [
    {"id": "checklisten", "illu": "checkliste", "titel": "Checklisten", "hinweis": "Zum Abhaken und Ausdrucken", "url": "/mein-alltag/checklisten/", "bald": False},
    {"id": "wohnungs-check", "illu": "wohnungscheck", "titel": "Wohnungs-Check", "hinweis": "Wie sicher ist Ihr Zuhause?", "url": "/mein-alltag/wohnungs-check/", "bald": False},
    {"id": "pflegegrad-rechner", "illu": "pflegegrad", "titel": "Pflegegradrechner", "hinweis": "Welcher Pflegegrad könnte vorliegen?", "url": "/mein-alltag/pflegegrad-rechner/", "bald": False},
    {"id": "termine", "illu": "erinnerungen", "titel": "Termine und Erinnerungen", "hinweis": "Kommt bald", "url": "/mein-alltag/", "bald": True},
    {"id": "plan", "illu": "plan", "titel": "Unterstützung planen", "hinweis": "Kommt bald", "url": "/mein-alltag/", "bald": True},
]


def load_anliegen(themen, beitraege):
    """data/anliegen.json prüfen (Konzept docs/relaunch/konzept-assistent-suche.md, Abschnitt 2/3):
    Kategorien streng und sichtbar (nicht null in kategorie-zuordnung.json), jede Leistung aus themen.json
    mindestens einmal, Verweise (verwandt, fragen, ratgeber, werkzeug, gruppe, haeufig) gültig.
    → WordPress: Taxonomie 'anliegen' (Term-Meta: begriffe, kategorien, fragen, notizfragen, verwandt)."""
    kat = json.loads(read(ROOT / "data" / "anliegen.json"))
    zuordnung = json.loads(read(ROOT / "data" / "kategorie-zuordnung.json"))["kategorien"]
    slugs_t = {t["slug"] for t in themen}
    slugs_b = {b["slug"] for b in beitraege}
    ids = [a["id"] for a in kat["anliegen"]]
    if len(ids) != len(set(ids)):
        raise SystemExit("FEHLER: anliegen.json – doppelte id")
    gruppen = {g["id"] for g in kat["gruppen"]}
    werkzeuge = {w["id"] for w in ALLTAG_WERKZEUGE}
    fragen = kat["fragen"]
    for fid, f in fragen.items():
        if f.get("art") not in ("filter", "notiz") or not f.get("optionen") or not f.get("titel"):
            raise SystemExit(f"FEHLER: anliegen.json – Frage {fid} unvollständig")
        for o in f["optionen"]:
            for k in o.get("kategorien", []):
                if not zuordnung.get(k):
                    raise SystemExit(f"FEHLER: anliegen.json – Frage {fid}: Kategorie {k} unbekannt/ausgeblendet")
    alle_leistungen = set()
    for a in kat["anliegen"]:
        for key in ("id", "titel", "thema", "kategorien", "leistungen", "verwandt", "begriffe", "fragen", "notizfragen", "ratgeber"):
            if key not in a:
                raise SystemExit(f"FEHLER: anliegen.json – '{key}' fehlt bei {a.get('id')}")
        if a["thema"] not in slugs_t:
            raise SystemExit(f"FEHLER: anliegen.json – unbekanntes Thema bei {a['id']}")
        if a.get("gruppe") and a["gruppe"] not in gruppen:
            raise SystemExit(f"FEHLER: anliegen.json – unbekannte Gruppe bei {a['id']}")
        for k in a["kategorien"]:
            if not zuordnung.get(k):
                raise SystemExit(f"FEHLER: anliegen.json – Kategorie {k} unbekannt/ausgeblendet bei {a['id']}")
        for v in a["verwandt"]:
            if v not in ids:
                raise SystemExit(f"FEHLER: anliegen.json – verwandt '{v}' unbekannt bei {a['id']}")
        for fid in a["fragen"]:
            if fid != "ort" and (fid not in fragen or fragen[fid]["art"] != "filter"):
                raise SystemExit(f"FEHLER: anliegen.json – Filterfrage '{fid}' unbekannt bei {a['id']}")
        for fid in a["notizfragen"]:
            if fid not in fragen or fragen[fid]["art"] != "notiz":
                raise SystemExit(f"FEHLER: anliegen.json – Notizfrage '{fid}' unbekannt bei {a['id']}")
        for r in a["ratgeber"]:
            if r not in slugs_b:
                raise SystemExit(f"FEHLER: anliegen.json – Ratgeber '{r}' unbekannt bei {a['id']}")
        if a.get("werkzeug") and a["werkzeug"] not in werkzeuge:
            raise SystemExit(f"FEHLER: anliegen.json – Werkzeug unbekannt bei {a['id']}")
        if a["kategorien"] and "ort" not in a["fragen"]:
            raise SystemExit(f"FEHLER: anliegen.json – {a['id']} hat Kategorien, aber keine Ortsfrage")
        if not a["kategorien"] and not (a["ratgeber"] or a.get("werkzeug")):
            raise SystemExit(f"FEHLER: anliegen.json – {a['id']} ohne Kategorien braucht Ratgeber oder Werkzeug")
        if len([f for f in a["fragen"] if f != "ort"]) + 1 > 4:
            raise SystemExit(f"FEHLER: anliegen.json – {a['id']}: höchstens vier Fragen bis zur Liste")
        eigene = next(t for t in themen if t["slug"] == a["thema"])["leistungen"]
        for leistung in a["leistungen"]:
            if leistung not in eigene:
                raise SystemExit(f"FEHLER: anliegen.json – Leistung „{leistung}“ gehört nicht zum Thema von {a['id']}")
        alle_leistungen.update(a["leistungen"])
    for t in themen:
        for leistung in t["leistungen"]:
            if leistung not in alle_leistungen:
                raise SystemExit(f"FEHLER: anliegen.json – Leistung „{leistung}“ ({t['slug']}) hat kein Anliegen")
    # Startseite „Häufig gesucht“: Anliegen + optionale Vorwahl (f-<Filterfrage>, n-<Notizfrage>) mit gültiger Option
    for c in kat.get("startseite", []):
        a = next((x for x in kat["anliegen"] if x["id"] == c.get("anliegen")), None)
        if not a or not c.get("titel"):
            raise SystemExit(f"FEHLER: anliegen.json – startseite: unbekanntes Anliegen {c.get('anliegen')}")
        for k, v in c.get("vorwahl", {}).items():
            fid = k[2:]
            erlaubt = a["fragen"] if k.startswith("f-") else a["notizfragen"] if k.startswith("n-") else []
            if fid not in erlaubt or v not in [o["id"] for o in fragen[fid]["optionen"]]:
                raise SystemExit(f"FEHLER: anliegen.json – startseite {c['titel']}: Vorwahl {k}={v} ungültig")
    if not 6 <= len(kat.get("startseite", [])) <= 8:
        raise SystemExit("FEHLER: anliegen.json – startseite braucht 6–8 Einträge")
    for h in kat["haeufig"]:
        if (h.split(":", 1)[1] not in gruppen) if h.startswith("gruppe:") else (h not in ids):
            raise SystemExit(f"FEHLER: anliegen.json – haeufig '{h}' unbekannt")
    return kat


def anbieter_orte(regionen):
    """Ortsvorschläge ohne Umkreissuche: Start-Städte plus alle Städte und Einzugsgebiete aus der Anbieterliste."""
    daten = json.loads(read(ROOT / "data" / "anbieter.json"))
    orte = {r["name"] for r in regionen}
    for e in daten["anbieter"]:
        if e.get("stadt"):
            orte.add(e["stadt"])
        orte.update(o for o in e.get("einzugsgebiet") or [] if o)
    return sorted(orte, key=lambda o: o.lower())


def assistent_data(themen, regionen, beitraege, anliegen):
    """Daten für Assistent und Freitextsuche (Startseite #assistent und /hilfe-finden/) → assets/data/assistent.json
    (ausgeliefert, lesend per fetch geladen von assets/js/assistent.js; als data-Attribut wäre jede Seite ~70 KB
    größer). Gibt die URL mit ?v=<Hash> zurück. → WordPress: REST-Endpunkt bzw. wp_localize_script;
    Anliegen aus der Taxonomie 'anliegen', Beiträge per WP_Query."""
    by_slug = {b["slug"]: b for b in beitraege}
    data = {
        "sprite": f"{ILLU_SPRITE}?v={_asset_version(ILLU_SPRITE)}",
        "ziele": [
            {"id": "angehoerige", "illu": "angehoerige", "titel": "Ich suche Hilfe für einen Angehörigen", "hinweis": "Auch wenn Sie nicht vor Ort wohnen"},
            {"id": "informieren", "illu": "wissen", "titel": "Ich möchte mich informieren", "hinweis": "Verständliche Beiträge im Ratgeber"},
            {"id": "alltag", "illu": "alltag", "titel": "Ich möchte meinen Alltag besser organisieren", "hinweis": "Checklisten und Wohnungs-Check zum Selbermachen"},
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
        "alltag": ALLTAG_WERKZEUGE,
        "orte": [r["name"] for r in regionen],
        "ortVorschlaege": anbieter_orte(regionen),
        "ratgeber": [{"slug": b["slug"], "titel": b["titel"], "url": b["url"]} for b in beitraege],
        "haeufig": anliegen["haeufig"],
        "gruppen": anliegen["gruppen"],
        "fragen": anliegen["fragen"],
        "anliegen": [
            {k: v for k, v in a.items() if v not in ([], "", None)} | {"kategorien": a["kategorien"]}
            for a in anliegen["anliegen"]
        ],
        "leistungSlugs": {a["id"]: [slugify(x) for x in a["leistungen"]] for a in anliegen["anliegen"]},
    }
    for a in data["anliegen"]:
        a["ratgeber"] = [{"titel": by_slug[r]["titel"], "url": by_slug[r]["url"]} for r in a.get("ratgeber", [])]
    ziel = ROOT / ASSISTENT_ASSET
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return "/" + ASSISTENT_ASSET + "?v=" + _asset_version("/" + ASSISTENT_ASSET)


def assistent_nojs(themen):
    """Ohne JavaScript: Links auf die Themenseiten und das Anfrageformular (Konzept Abschnitt 7)."""
    lines = [f'<li><a href="/themen/{t["slug"]}/">{esc(t["titel"])}</a></li>' for t in themen]
    lines.append('<li><a href="/anfrage/">Anliegen beschreiben</a> – wir suchen persönlich für Sie</li>')
    return indent(lines, 8)


def article_toc(blocks, ids):
    lines = [
        '<nav class="toc article__toc" aria-labelledby="toc-titel">',
        # Handy/Tablet eingeklappt, ab 64em offen (main.js 13.; CSS ::details-content ohne JS)
        '  <details class="toc__details" data-toc>',
        '    <summary><h2 id="toc-titel">Inhalt</h2></summary>',
        '    <ul class="article__toc-list">',
    ]
    for i, (kind, data) in enumerate(blocks):
        if kind == "h2":
            lines.append(f'      <li><a href="#{ids[i]}">{esc(plain(data))}</a></li>')
    lines += ["    </ul>", "  </details>", "</nav>"]
    return lines


def article_jsonld(b, fragen):
    """Article (ohne author: Beiträge ohne Autor; publisher = Organisation) + BreadcrumbList,
    dazu FAQPage, wenn der Beitrag Zwischenüberschriften als Fragen hat (Antwort = sichtbarer Text)."""
    tag, _, zeit = b.get("veroeffentlicht", b["geaendert"]).partition(" ")
    published = f"{tag}T{zeit}:00+01:00" if zeit else tag   # Europe/Berlin, November = MEZ
    article = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": b["titel"],
        "description": b["description"],
        "image": [f'{SITE}/{RATGEBER_IMG}/{b["bild"]}-1400.jpg'],
        "datePublished": published,
        "dateModified": b["geaendert"],
        "inLanguage": "de-DE",
        "articleSection": b["kategorie_titel"],
        "mainEntityOfPage": f'{SITE}{b["url"]}',
        "publisher": {"@type": "Organization", "name": SITE_NAME, "url": f"{SITE}/"},
    }
    data = [article, breadcrumb_jsonld([("Startseite", "/"), ("Ratgeber", "/ratgeber/"),
                                        (b["kategorie_titel"], b["kategorie_url"]), (b["titel"], b["url"])])]
    if fragen:
        data.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": f, "acceptedAnswer": {"@type": "Answer", "text": a}} for f, a, _x in fragen]})
    return jsonld_script(data, f"JSON-LD: {PLATZHALTER}; Logo erst mit echten Daten ergänzen.\n"
                               "       Kein author: Ratgeber erscheinen ohne Autor.")


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
    fragen = beitrag_fragen(blocks, ids)
    b["_fragen"] = fragen
    nah = verwandte(b, beitraege)
    return {
        "meta_titel": b.get("seo_titel") or b["titel"],
        "meta_description": b["description"],
        "beitrag_jsonld": article_jsonld(b, fragen),
        "og_article": b,
        "beitrag_slug": b["slug"],
        "beitrag_titel": esc(b["titel"]),
        "beitrag_thema": b["thema"],
        "beitrag_thema_titel": esc(b["thema_titel"]),
        "beitrag_kategorie_titel": esc(b["kategorie_titel"]),
        "beitrag_kategorie_url": b["kategorie_url"],
        "beitrag_stand": esc(b["stand"]),
        "beitrag_geaendert": b["geaendert"],
        # Hinweisbox am Beitragsende: eigener Text über Frontmatter "hinweis", sonst Standardtext
        "beitrag_hinweis": inline(b["hinweis"]) if b.get("hinweis") else (
            "Dieser Beitrag dient der allgemeinen Information und ersetzt keine individuelle Beratung. "
            f"Beträge und Voraussetzungen können sich ändern – maßgeblich sind die Angaben Ihrer Pflegekasse. Stand: {esc(b['stand'])}."),
        "beitrag_kurz": kurz_block(b),
        "beitrag_fragen": fragen_block(fragen),
        "beitrag_quellen": stand_quellen_block(b),
        "beitrag_hilfe": hilfe_block(b),
        "werkzeuge_beitrag": seiten_werkzeuge(
            "Beitrag teilen: Link zu diesem Ratgeber-Beitrag", 10, vorlesen=True,
            drucken="Beitrag drucken oder als PDF speichern", teilen_titel=b["titel"], dezent=False),
        "beitrag_bild": indent(article_picture(b), 8),
        "beitrag_toc": indent(article_toc(blocks, ids), 8),
        "beitrag_inhalt": indent(render_blocks(blocks, ids, b.get("tabelle_beschriftung"), b["slug"]).splitlines(), 8),
        # Verwandte Ratgeber: gleiche Unterkategorie, dann gleiche Kategorie; höchstens 3 Karten
        "weitere_beitraege": "\n".join(article_card(x, "h3", 8, pill=x["kategorie_titel"]) for x in nah),
    }


def thema_ratgeber(t, beitraege):
    """Verweis „Passender Ratgeber“ auf Themenseiten (→ WP_Query tax_query themenbereich)."""
    passend = [b for b in beitraege if b["thema"] == t["slug"]]
    if not passend:
        return ""
    lines = [
        '<section class="topic-ratgeber" aria-labelledby="ratgeber-hinweis-titel">',
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
    lines += ["  </ul>", "</section>"]
    return indent(lines, 6)


# --------------------------------------------------------------------------
# Ratgeber-Struktur (Relaunch 3.3): Kategorien + Unterkategorien, Übersicht mit Suche,
# Kategorieseiten, Beitragsbausteine (Kurz-Kasten, Häufige Fragen, Stand und Quellen,
# Verwandte Ratgeber, Passende Hilfe). Daten: data/ratgeber-kategorien.json + Frontmatter.
# → WordPress: hierarchische Taxonomie 'ratgeber_kategorie' (Kategorie = Term, Unterkategorie
#   = Kind-Term), Archiv taxonomy-ratgeber_kategorie.php; Kurz-Kasten/FAQ/Quellen als Felder bzw.
#   Filter auf the_content.
# --------------------------------------------------------------------------
RATGEBER_SUCHE_ASSET = "assets/data/ratgeber-suche.json"
# Unterseiten unter /ratgeber/, die es außer Beiträgen und Kategorien gibt (heute keine) –
# Kategorie-Slugs dürfen weder Beitrags-Slugs noch diesen Namen entsprechen.
RATGEBER_RESERVIERT = {"index", "assets", "suche", "seite", "page", "feed"}


def de_datum(iso):
    j, m, t = (int(x) for x in iso.split("-"))
    return f"{t}. {MONATE[m - 1]} {j}"


def stand_hinweis(b):
    """Zusatz im Stand („Gesetzentwurf“, „Regierungsentwurf“ …) = Text in Klammern; '' ohne Zusatz."""
    m = re.search(r"\((.+)\)\s*$", b["stand"])
    return m.group(1).strip() if m else ""


def load_ratgeber_kategorien(themen, beitraege):
    """data/ratgeber-kategorien.json prüfen und mit den Beiträgen verknüpfen.
    Bricht ab bei: doppelten Slugs, Kategorie-Slug = Beitrags-Slug (beide wären /ratgeber/<slug>/),
    unbekannter Kategorie/Unterkategorie im Frontmatter, Beitrag ohne Unterkategorie seiner Kategorie,
    ungültigen Verweisen in themen/haeufig, falsch vergebenem 'hervorgehoben'.
    Ergebnis: Liste der Kategorien mit 'unter' (nur Unterkategorien mit Beiträgen) und 'beitraege'."""
    daten = json.loads(read(ROOT / "data" / "ratgeber-kategorien.json"))
    slugs_b = {b["slug"] for b in beitraege}
    kats, unter = {}, {}
    for k in daten["kategorien"]:
        for key in ("slug", "titel", "kurztext", "unterkategorien"):
            if not k.get(key):
                raise SystemExit(f"FEHLER: ratgeber-kategorien.json – '{key}' fehlt bei {k.get('slug')}")
        if not re.fullmatch(r"[a-z0-9]+(-[a-z0-9]+)*", k["slug"]):
            raise SystemExit(f"FEHLER: ratgeber-kategorien.json – ungültiger Slug {k['slug']!r}")
        if k["slug"] in slugs_b:
            raise SystemExit(f"FEHLER: Namenskollision – Kategorie und Beitrag heißen beide '{k['slug']}' "
                             f"(/ratgeber/{k['slug']}/). Kategorie-Slug ändern, Beitrags-URLs bleiben fest.")
        if k["slug"] in RATGEBER_RESERVIERT or k["slug"] in kats:
            raise SystemExit(f"FEHLER: ratgeber-kategorien.json – Slug '{k['slug']}' reserviert oder doppelt")
        kats[k["slug"]] = k
        for u in k["unterkategorien"]:
            if not u.get("slug") or not u.get("titel"):
                raise SystemExit(f"FEHLER: ratgeber-kategorien.json – Unterkategorie unvollständig in {k['slug']}")
            if u["slug"] in unter or u["slug"] in RESERVIERTE_IDS:
                raise SystemExit(f"FEHLER: ratgeber-kategorien.json – Unterkategorie '{u['slug']}' doppelt/reserviert")
            unter[u["slug"]] = (k, u)
    for k in kats:
        if k in unter:
            raise SystemExit(f"FEHLER: ratgeber-kategorien.json – '{k}' ist Kategorie und Unterkategorie")
    plaetze = []
    for b in beitraege:
        if b["kategorie"] not in kats:
            raise SystemExit(f"FEHLER: {b['slug']} – unbekannte Kategorie '{b['kategorie']}'")
        us = [x.strip() for x in b["unterkategorien"].split(",") if x.strip()]
        for x in us:
            if x not in unter:
                raise SystemExit(f"FEHLER: {b['slug']} – unbekannte Unterkategorie '{x}'")
        if len(us) != len(set(us)):
            raise SystemExit(f"FEHLER: {b['slug']} – Unterkategorie doppelt")
        if not any(unter[x][0]["slug"] == b["kategorie"] for x in us):
            raise SystemExit(f"FEHLER: {b['slug']} – mindestens eine Unterkategorie muss zur Kategorie '{b['kategorie']}' gehören")
        b["unter_liste"] = us
        b["kategorie_titel"] = kats[b["kategorie"]]["titel"]
        b["kategorie_url"] = f"/ratgeber/{b['kategorie']}/"
        if b.get("hervorgehoben"):
            plaetze.append(b["hervorgehoben"])
    if sorted(plaetze) not in (["1", "2"], ["1", "2", "3"]):
        raise SystemExit(f"FEHLER: Frontmatter 'hervorgehoben' muss 1–2 oder 1–3 je einmal vergeben (gefunden: {sorted(plaetze)})")
    struktur = []
    for k in daten["kategorien"]:
        eigene = {u["slug"] for u in k["unterkategorien"]}
        subs = []
        for u in k["unterkategorien"]:
            arts = [b for b in beitraege if u["slug"] in b["unter_liste"]]
            if arts:   # Unterkategorien ohne Beitrag werden nicht angezeigt
                subs.append(dict(u, beitraege=arts))
        alle = [b for b in beitraege if b["kategorie"] == k["slug"] or eigene & set(b["unter_liste"])]
        alle.sort(key=lambda b: b["kategorie"] != k["slug"])   # eigene Beiträge zuerst, sonst Reihenfolge der Übersicht
        if not alle:
            raise SystemExit(f"FEHLER: Kategorie '{k['slug']}' hat keinen Beitrag (keine leeren Seiten)")
        struktur.append(dict(k, unter=subs, beitraege=alle, url=f"/ratgeber/{k['slug']}/"))
    sichtbar = {u["slug"] for k in struktur for u in k["unter"]}

    def ziel_url(ziel):
        kat, _, sub = ziel.partition("#")
        if kat not in kats or (sub and sub not in sichtbar):
            raise SystemExit(f"FEHLER: ratgeber-kategorien.json – Ziel '{ziel}' unbekannt oder ohne Beitrag")
        return f"/ratgeber/{kat}/" + (f"#{sub}" if sub else "")

    slugs_t = {t["slug"] for t in themen}
    weiterleitung = {}
    for thema, ziel in daten["themen"].items():
        if thema.startswith("_"):
            continue
        if thema not in slugs_t:
            raise SystemExit(f"FEHLER: ratgeber-kategorien.json – themen: unbekanntes Thema '{thema}'")
        weiterleitung[thema] = ziel_url(ziel)
    if set(weiterleitung) != slugs_t:
        raise SystemExit("FEHLER: ratgeber-kategorien.json – themen muss jedes Thema aus themen.json umleiten")
    by_slug = {b["slug"]: b for b in beitraege}
    haeufig = []
    for h in daten["haeufig"]:
        if h.get("beitrag"):
            if h["beitrag"] not in by_slug:
                raise SystemExit(f"FEHLER: ratgeber-kategorien.json – haeufig: Beitrag '{h['beitrag']}' unbekannt")
            haeufig.append((h["titel"], by_slug[h["beitrag"]]["url"]))
        else:
            haeufig.append((h["titel"], ziel_url(h["ziel"])))
    return {"kategorien": struktur, "unter": unter, "weiterleitung": weiterleitung, "haeufig": haeufig}


def pruefe_anliegen_verweise(beitraege, anliegen):
    ids = {a["id"]: a for a in anliegen["anliegen"]}
    for b in beitraege:
        if b.get("anliegen") and b["anliegen"] not in ids:
            raise SystemExit(f"FEHLER: {b['slug']} – Anliegen '{b['anliegen']}' fehlt in data/anliegen.json")
        if b.get("anliegen"):
            b["anliegen_titel"] = ids[b["anliegen"]]["titel"]


def ratgeber_zeile(b, heading="h3", n=0, anreisser=True, meta=None):
    """Kompakte Beitragszeile: kleines Vorschaubild 4:3, Kategorie/Stand, Titel, optional Anreißer.
    Ganze Zeile über den Titel-Link klickbar (→ template-parts/zeile-artikel.php)."""
    meta = meta if meta is not None else f'{esc(b["kategorie_titel"])} · Stand: {esc(b["stand"])}'
    lines = [
        '<li class="ratgeber-zeile">',
        f'  <img class="ratgeber-zeile__bild" src="/{RATGEBER_IMG}/{b["bild"]}-teaser-600.webp" width="600" height="450" alt="" loading="lazy" decoding="async">',
        '  <div class="ratgeber-zeile__text">',
        f'    <p class="ratgeber-zeile__meta">{meta}</p>',
        f'    <{heading} class="ratgeber-zeile__titel"><a href="{b["url"]}">{esc(b["titel"])}</a></{heading}>',
    ]
    if anreisser:
        lines.append(f'    <p class="ratgeber-zeile__anreisser">{esc(b["anreisser"])}</p>')
    lines += ["  </div>", "</li>"]
    return indent(lines, n)


def ratgeber_haeufig(rk, n):
    return indent([f'<li><a class="ratgeber-chip" href="{esc(url)}">{esc(titel)}</a></li>'
                   for titel, url in rk["haeufig"]], n)


def ratgeber_empfohlen(beitraege, n):
    """„Empfohlen“: 2–3 Beiträge (Frontmatter hervorgehoben). Der erste groß mit Bild, die übrigen als Zeilen."""
    auswahl = sorted((b for b in beitraege if b.get("hervorgehoben")), key=lambda b: b["hervorgehoben"])
    haupt, rest = auswahl[0], auswahl[1:]
    base = f'/{RATGEBER_IMG}/{haupt["bild"]}'
    lines = [
        '<article class="ratgeber-empfohlen__haupt">',
        '  <picture>',
        f'    <source type="image/webp" srcset="{base}-800.webp 800w, {base}-1400.webp 1400w" sizes="(min-width: 64em) 40rem, calc(100vw - 2.5rem)">',
        f'    <img class="ratgeber-empfohlen__bild" src="{base}-1400.jpg" width="1400" height="933" alt="" loading="lazy" decoding="async">',
        '  </picture>',
        '  <div class="ratgeber-empfohlen__text">',
        f'    <p class="ratgeber-zeile__meta">{esc(haupt["kategorie_titel"])} · Stand: {esc(haupt["stand"])}</p>',
        f'    <h3 class="ratgeber-empfohlen__titel"><a href="{haupt["url"]}">{esc(haupt["titel"])}</a></h3>',
        f'    <p>{esc(haupt["anreisser"])}</p>',
        '  </div>',
        '</article>',
        '<ul class="ratgeber-liste ratgeber-empfohlen__weitere">',
    ]
    out = indent(lines, n) + "\n" + "\n".join(ratgeber_zeile(b, "h3", n + 2) for b in rest)
    return out + "\n" + indent(["</ul>"], n)


def ratgeber_themen(rk, n):
    """Kategorien mit Unterkategorien und Anzahl (Index statt Kartenraster)."""
    lines = []
    for k in rk["kategorien"]:
        anzahl = len(k["beitraege"])
        lines += [
            '<li class="ratgeber-thema">',
            '  <div class="ratgeber-thema__kopf">',
            f'    <h3 class="ratgeber-thema__titel"><a href="{k["url"]}">{esc(k["titel"])}</a></h3>',
            f'    <p class="ratgeber-thema__anzahl">{anzahl} {"Beitrag" if anzahl == 1 else "Beiträge"}</p>',
            f'    <p class="ratgeber-thema__text">{esc(k["kurztext"])}</p>',
            '  </div>',
            f'  <ul class="ratgeber-thema__unter" aria-label="Unterthemen: {esc(k["titel"])}">',
        ]
        for u in k["unter"]:
            c = len(u["beitraege"])
            lines.append(f'    <li><a href="{k["url"]}#{u["slug"]}">{esc(u["titel"])}'
                         f'<span class="ratgeber-thema__zahl"> ({c}<span class="visually-hidden"> {"Beitrag" if c == 1 else "Beiträge"}</span>)</span></a></li>')
        lines += ["  </ul>", "</li>"]
    return indent(lines, n)


def ratgeber_aktuell(beitraege, n, limit=5):
    """„Aktuell“: Beiträge mit Entwurfs-/Gesetzesstand (Zusatz in Klammern im Feld stand), danach die
    zuletzt geänderten; neueste Änderung zuerst."""
    sortiert = sorted(beitraege, key=lambda b: (bool(stand_hinweis(b)), b["geaendert"], b.get("veroeffentlicht", "")), reverse=True)
    lines = []
    for b in sortiert[:limit]:
        hinweis = stand_hinweis(b)
        marke = (f'<span class="ratgeber-aktuell__marke">{esc(hinweis)}</span>' if hinweis
                 else '<span class="ratgeber-aktuell__marke ratgeber-aktuell__marke--neu">Aktualisiert</span>')
        lines += [
            '<li class="ratgeber-aktuell__eintrag">',
            f'  {marke}',
            f'  <a class="ratgeber-aktuell__link" href="{b["url"]}">{esc(b["titel"])}</a>',
            f'  <span class="ratgeber-aktuell__datum">Geändert am <time datetime="{b["geaendert"]}">{de_datum(b["geaendert"])}</time></span>',
            "</li>",
        ]
    return indent(lines, n)


def _sortkey(text):
    t = text.lower()
    for a, b in (("ä", "a"), ("ö", "o"), ("ü", "u"), ("ß", "ss")):
        t = t.replace(a, b)
    return t


def ratgeber_az(beitraege, n):
    lines = []
    for b in sorted(beitraege, key=lambda b: _sortkey(b["titel"])):
        lines.append(f'<li><a href="{b["url"]}">{esc(b["titel"])}</a> <span class="ratgeber-az__kat">{esc(b["kategorie_titel"])}</span></li>')
    return indent(lines, n)


def write_ratgeber_suche(beitraege, rk):
    """Suchindex der Ratgeber-Übersicht → assets/data/ratgeber-suche.json (fetch, ?v=Hash).
    Volltext über Titel, Anreißer, Zwischenüberschriften (##/###) und „Das Wichtigste in Kürze“,
    dazu Kategorie-/Unterkategorie-Titel und deren Suchbegriffe. Logik: SucheLogik.sucheRatgeber."""
    eintraege = []
    for b in beitraege:
        begriffe = [b["kategorie_titel"]]
        for x in b["unter_liste"]:
            _k, u = rk["unter"][x]
            begriffe += [u["titel"]] + u.get("begriffe", [])
        eintraege.append({
            "slug": b["slug"],
            "titel": b["titel"],
            "url": b["url"],
            "kategorie": b["kategorie_titel"],
            "stand": b["stand"],
            "anreisser": b["anreisser"],
            "ueberschriften": [re.sub(r"^\d+(\.\d+)*\.?\s*", "", plain(d)) for k, d in b["_blocks"] if k in ("h2", "h3")],
            "kurz": b.get("kurz", []),
            "begriffe": list(dict.fromkeys(begriffe)),
        })
    ziel = ROOT / RATGEBER_SUCHE_ASSET
    ziel.parent.mkdir(parents=True, exist_ok=True)
    ziel.write_text(json.dumps({"beitraege": eintraege}, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return "/" + RATGEBER_SUCHE_ASSET + "?v=" + _asset_version("/" + RATGEBER_SUCHE_ASSET)


def breadcrumb_jsonld(stufen):
    """stufen: [(name, pfad), …] → BreadcrumbList."""
    return {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i, "name": name, "item": f"{SITE}{pfad}"}
        for i, (name, pfad) in enumerate(stufen, 1)]}


def jsonld_script(data, kommentar):
    body = json.dumps(data, ensure_ascii=False, indent=2).replace("</", "<\\/")
    return (f"  <!-- {kommentar} -->\n"
            '  <script type="application/ld+json">\n' + indent(body.splitlines(), 2) + "\n  </script>")


def weiterleitung_skript(rk):
    """Alte Filter-Adressen /ratgeber/?thema=… → Kategorieseite (assets/js/weiterleitung.js, im <head>)."""
    ziele = json.dumps(rk["weiterleitung"], ensure_ascii=False, separators=(",", ":"))
    return f'<script src="/assets/js/weiterleitung.js" data-ratgeber-themen="{esc(ziele)}"></script>'


def kategorie_ctx(k, rk):
    stufen = [("Startseite", "/"), ("Ratgeber", "/ratgeber/"), (k["titel"], k["url"])]
    anzahl = len(k["beitraege"])
    nav = [f'<li><a class="ratgeber-chip" href="#{u["slug"]}">{esc(u["titel"])}'
           f'<span class="ratgeber-chip__zahl"> ({len(u["beitraege"])})</span></a></li>' for u in k["unter"]]
    abschnitte = []
    for u in k["unter"]:
        abschnitte += [
            f'<section class="kategorie-abschnitt" aria-labelledby="{u["slug"]}">',
            f'  <h2 class="kategorie-abschnitt__titel" id="{u["slug"]}">{esc(u["titel"])}</h2>',
            '  <ul class="ratgeber-liste">',
            "\n".join(ratgeber_zeile(b, "h3", 4, meta=f'Stand: {esc(b["stand"])}') for b in u["beitraege"]),
            "  </ul>",
            "</section>",
        ]
    andere = [f'<li><a href="{x["url"]}">{esc(x["titel"])}</a></li>' for x in rk["kategorien"] if x["slug"] != k["slug"]]
    return {
        "kategorie_slug": k["slug"],
        "kategorie_titel": esc(k["titel"]),
        "kategorie_kurztext": esc(k["kurztext"]),
        "kategorie_meta_beschreibung": esc(f'{k["titel"]} im Ratgeber: {k["kurztext"]}'),
        "kategorie_anzahl": f'{anzahl} {"Beitrag" if anzahl == 1 else "Beiträge"}',
        "kategorie_nav": indent(nav, 10),
        "kategorie_abschnitte": indent(abschnitte, 6),
        "kategorie_andere": indent(andere, 8),
        "kategorie_jsonld": jsonld_script([breadcrumb_jsonld(stufen)], f"JSON-LD: {PLATZHALTER}."),
        "werkzeuge_kategorie": seiten_werkzeuge(f"Ratgeber-Bereich {k['titel']} teilen: Link zu dieser Seite", 6),
    }


def antwort_text(blocks):
    """Sichtbarer Text der Blöcke als ein Absatz (für FAQPage); Bilder und Tabellen bleiben außen vor."""
    teile = []
    for kind, data in blocks:
        if kind == "p":
            teile.append(plain(data))
        elif kind in ("ul", "ol"):
            teile.append(" ".join(plain(x).rstrip() for x in data))
        elif kind == "quote":
            teile.append(antwort_text(data))
    return " ".join(t for t in teile if t).strip()


def beitrag_fragen(blocks, ids):
    """Häufige Fragen = vorhandene Zwischenüberschriften (## oder ###), die mit „?“ enden, mit dem Text bis
    zur nächsten Überschrift als Antwort. Nichts wird ergänzt; ohne Text darunter keine Frage."""
    fragen = []
    for i, (kind, data) in enumerate(blocks):
        if kind not in ("h2", "h3") or not plain(data).rstrip().endswith("?"):
            continue
        j = i + 1
        while j < len(blocks) and blocks[j][0] not in ("h2", "h3"):
            j += 1
        antwort = antwort_text(blocks[i + 1:j])
        if antwort:
            frage = re.sub(r"^\d+(\.\d+)*\.?\s+", "", plain(data)).strip()
            fragen.append((frage, antwort, ids[i]))
    return fragen


def kurz_block(b):
    if not b.get("kurz"):
        return ""
    lines = ['<section class="beitrag-kurz" aria-labelledby="kurz-titel">',
             '  <h2 class="beitrag-kurz__titel" id="kurz-titel">Das Wichtigste in Kürze</h2>',
             '  <ul class="beitrag-kurz__liste">']
    lines += [f"    <li>{inline(p)}</li>" for p in b["kurz"]]
    lines += ["  </ul>", "</section>"]
    return indent(lines, 10) + "\n"


def fragen_block(fragen):
    if not fragen:
        return ""
    lines = ['<nav class="beitrag-fragen" aria-labelledby="fragen-titel">',
             '  <h2 id="fragen-titel">Häufige Fragen</h2>',
             '  <p class="beitrag-fragen__hinweis">Die Antworten stehen im Beitrag. Ein Klick führt zur Stelle im Text.</p>',
             '  <ul class="beitrag-fragen__liste">']
    lines += [f'    <li><a href="#{anker}">{esc(frage)}</a></li>' for frage, _a, anker in fragen]
    lines += ["  </ul>", "</nav>"]
    return indent(lines, 10) + "\n"


def stand_quellen_block(b):
    """Block „Stand und Quellen“: Stand + Änderungsdatum, dazu die vorhandenen Quellen (Frontmatter
    'quellen'; es wird nichts ergänzt)."""
    titel = "Stand und Quellen" if b.get("quellen") else "Stand"
    lines = ['<section class="beitrag-quellen" aria-labelledby="quellen-titel">',
             f'  <h2 id="quellen-titel">{titel}</h2>',
             f'  <p class="beitrag-quellen__stand">Stand: {esc(b["stand"])}. Zuletzt geändert am '
             f'<time datetime="{b["geaendert"]}">{de_datum(b["geaendert"])}</time>.</p>']
    if b.get("quellen"):
        lines += ['  <h3 class="beitrag-quellen__titel">Quellen und offizielle Stellen</h3>', "  <ol>"]
        for entry in b["quellen"].split(" ;; "):
            label, _, url = entry.rpartition("|")
            lines.append(f'    <li><a href="{esc(url.strip())}" rel="noopener">{esc(label.strip())}</a></li>')
        lines.append("  </ol>")
    lines.append("</section>")
    return indent(lines, 10) + "\n"


def verwandte(b, beitraege, limit=3):
    """Verwandte Ratgeber: gemeinsame Unterkategorien zählen doppelt, gleiche Kategorie einfach; höchstens 3."""
    eigene = set(b["unter_liste"])
    kandidaten = []
    for pos, x in enumerate(beitraege):
        if x["slug"] == b["slug"]:
            continue
        punkte = 2 * len(eigene & set(x["unter_liste"])) + (x["kategorie"] == b["kategorie"])
        if punkte:
            kandidaten.append((-punkte, pos, x))
    return [x for _p, _pos, x in sorted(kandidaten, key=lambda t: (t[0], t[1]))][:limit]


def hilfe_block(b):
    """„Passende Hilfe finden“: Link in den Assistenten mit passendem Anliegen (nur mit Frontmatter
    'anliegen'), sonst wie bisher „Anliegen beschreiben“ (persönliche Vermittlung)."""
    if b.get("anliegen"):
        lines = [
            '<div class="relatives__text">',
            '  <span class="section__eyebrow">Passende Hilfe finden</span>',
            f'  <h2 id="anfrage-cta-titel">Anbieter für „{esc(b["anliegen_titel"])}“ in Ihrer Nähe</h2>',
            '  <p>',
            '    Im Assistenten wählen Sie Ihren Ort und sehen passende Anbieter aus Ihrer Region.',
            '    Sie entscheiden selbst, wen Sie ansprechen. Lieber persönlich? Dann suchen wir für Sie.',
            '  </p>',
            '</div>',
            '<div class="relatives__action">',
            f'  <a class="btn btn--primary" href="/hilfe-finden/?anliegen={esc(b["anliegen"])}">',
            '    Passende Hilfe finden',
            '    <svg class="icon" aria-hidden="true"><use href="#icon-arrow"/></svg>',
            '  </a>',
            f'  <a class="relatives__link" href="/anfrage/?thema={b["thema"]}" data-thema="{b["thema"]}">Bei uns melden</a>',
            '</div>',
        ]
    else:
        lines = [
            '<div class="relatives__text">',
            '  <span class="section__eyebrow">Persönliche Vermittlung</span>',
            f'  <h2 id="anfrage-cta-titel">Sie suchen Unterstützung zum Thema {esc(b["thema_titel"])}?</h2>',
            '  <p>',
            '    Beschreiben Sie uns Ihr Anliegen. Unser Team sucht kostenlos und persönlich nach passenden',
            '    Ansprechpartnern in Ihrer Region – auch wenn Sie für Angehörige anfragen.',
            '  </p>',
            '</div>',
            '<div class="relatives__action">',
            f'  <a class="btn btn--primary" href="/anfrage/?thema={b["thema"]}" data-thema="{b["thema"]}">',
            '    Anliegen beschreiben',
            '    <svg class="icon" aria-hidden="true"><use href="#icon-arrow"/></svg>',
            '  </a>',
            '</div>',
        ]
    return indent(lines, 8)


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
    <a class="btn btn--secondary" href="/anfrage/?thema={c["thema"]}" data-thema="{c["thema"]}">Unterstützung anfragen</a>
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
    <a class="btn btn--secondary" href="/anfrage/?thema={check["thema"]}" data-thema="{check["thema"]}">Unterstützung anfragen</a>
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
    jsonld = jsonld_script(data, f"JSON-LD: {PLATZHALTER}. FAQ-Antworten = sichtbarer Text.")
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
        # Kompakte Zeile: Uhrzeit links, Titel + Ort in der Mitte, Thema rechts;
        # Beschreibung, Veranstalter, Fakten, Quelle und Stand im <details> („Mehr erfahren“).
        lines += [
            f'    <li class="ev-item" data-ev data-datum="{e["datum"]}" data-beginn="{e["beginn"]}" '
            f'data-stadt="{esc(e["stadt"])}" data-thema="{esc(e["kategorie"])}" data-label="{tag_label(d)}">',
            f'      <article class="ev-row{" ev-row--abgesagt" if abgesagt else ""}" aria-labelledby="{e["id"]}-titel">',
            f'        <p class="ev-row__time"><time datetime="{e["datum"]}T{e["beginn"]}">{zeit}</time>'
            f'</p>',
            f'        <p class="ev-row__thema"><span class="ev-card__pill">{esc(e["kategorie"])}</span>'
            + ('<span class="ev-card__status">Abgesagt</span>' if abgesagt else "") + '</p>',
            '        <div class="ev-row__main">',
            f'          <h3 class="ev-row__title" id="{e["id"]}-titel">{titel}</h3>',
            f'          <p class="ev-row__where"><strong>{esc(e["stadt"])}</strong>, {esc(e["ort"])}</p>',
            '          <details class="ev-row__more">',
            f'            <summary>Mehr erfahren<span class="visually-hidden"> zu {titel}</span></summary>',
            '            <div class="ev-row__details">',
            f'              <p class="ev-row__text">{esc(e["kurztext"])}</p>',
            '              <ul class="ev-card__facts">',
            f'                <li><span class="visually-hidden">Kosten: </span><strong>{esc(e["kosten"])}</strong></li>',
        ] + [f'                <li>{m}</li>' for m in marker] + [
            '              </ul>',
            f'              <p class="ev-row__org">Veranstalter: {esc(e["veranstalter"])}</p>',
            f'              <p class="ev-row__source"><a href="{esc(e["quelle_url"])}">Quelle ansehen<span class="visually-hidden"> zu {titel}</span></a>'
            f' <span class="ev-row__stand">Stand: geprüft am {de_datum(e["geprueft_am"])}</span></p>',
            '            </div>',
            '          </details>',
            '        </div>',
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


def write_sitemap(lastmod):
    """sitemap.xml + robots.txt (Platzhalter-Domain, vor Livegang ersetzen).
    lastmod: Pfad → Datum JJJJ-MM-TT (Beiträge: geaendert; sonst Datum des letzten Commits der Quellen)."""
    urls = "\n".join(f"  <url><loc>{SITE}{p}</loc><lastmod>{lastmod[p]}</lastmod></url>" for p in sorted(lastmod))
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        "<!-- GENERIERT von tools/build.py – Domain ist ein Platzhalter (SITE) -->\n"
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + "\n</urlset>\n",
        encoding="utf-8")
    (ROOT / "robots.txt").write_text(
        "# GENERIERT von tools/build.py\nUser-agent: *\nAllow: /\nDisallow: /partials/\nDisallow: /screenshots/\n\n"
        f"Sitemap: {SITE}/sitemap.xml\n", encoding="utf-8")


def area_served(regionen):
    """Start-Städte aus data/regionen.json als schema.org-City (Organisation, Themen-Services)."""
    return [{"@type": "City", "name": r["name"]} for r in regionen]


def organisation(regionen=None):
    """Organisation ohne Telefonnummer und ohne Adresse (beides gibt es nicht bzw. ist nicht festgelegt)."""
    org = {"@type": "Organization", "name": SITE_NAME, "url": f"{SITE}/"}
    if regionen:
        org = {"@context": "https://schema.org", **org,
               "description": "Kostenloses Portal für Menschen ab 60 und Angehörige: regionale Anbieter selbst finden "
                              "oder persönlich vermitteln lassen. Wir erbringen selbst keine Dienstleistungen.",
               "areaServed": area_served(regionen)}
    return org


def home_head(regionen):
    """Hero-Preload + JSON-LD der Startseite (Organization; ohne Telefon, ohne Adresse, ohne Logo)."""
    return f"""  <link rel="preload" as="image" type="image/webp" fetchpriority="high"
        imagesrcset="/assets/img/hero-garten-800.webp 800w, /assets/img/hero-garten-1600.webp 1600w"
        imagesizes="(min-width: 60em) 45vw, 100vw">

{jsonld_script(organisation(regionen), f"JSON-LD: {PLATZHALTER}; Adresse/Logo erst mit echten Daten ergänzen, keine Telefonnummer.")}"""


def thema_jsonld(t, regionen):
    """Themenseite: Service (Vermittlung im Themenbereich, kostenlos, Start-Städte) + BreadcrumbList."""
    url = f"{SITE}/themen/{t['slug']}/"
    service = {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": t["titel"],
        "serviceType": f"Vermittlung regionaler Anbieter: {t['titel']}",
        "description": t["kurztext"],
        "url": url,
        "provider": organisation(),
        "areaServed": area_served(regionen),
        "audience": {"@type": "PeopleAudience", "suggestedMinAge": 60},
        "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR",
                   "description": "Suche und persönliche Vermittlung sind kostenlos."},
    }
    return [service]


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
    return f"""  <!-- PROTOTYP: {PLATZHALTER} (Canonical, Open Graph, JSON-LD). -->
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


# Feste Leiste unten auf dem Handy (< 48em, CSS .leiste). Verdeckt nichts: body.hat-leiste bekommt unten
# Innenabstand in Leistenhöhe, html scroll-padding-bottom (Fokus nie verdeckt); während ein Eingabefeld
# den Fokus hat (Bildschirmtastatur), blendet CSS die Leiste aus. → WordPress: footer.php (außer page-hilfe-finden)
MOBIL_LEISTE = """<nav class="leiste no-print" aria-label="Schnellzugriff">
  <a class="btn btn--primary leiste__knopf" href="/hilfe-finden/">
    <svg class="icon" aria-hidden="true"><use href="#icon-suche"/></svg>
    <span>Anbieter suchen</span>
  </a>
</nav>"""


SEITEN_META = {}   # output → {title, description, lastmod} (Prüfung auf Eindeutigkeit am Ende von main)

# Seiten ohne sichtbare Brotkrümelnavigation: Name der zweiten Stufe für die BreadcrumbList (JSON-LD)
BREADCRUMB_NAMEN = {
    "anfrage/index.html": "Bei uns melden",
    "hilfe-finden/index.html": "Hilfe finden",
    "ratgeber/index.html": "Ratgeber",
    "so-funktioniert-es/index.html": "So funktioniert es",
}
BREADCRUMB_RE = re.compile(r'<nav class="breadcrumb"[^>]*>(.*?)</nav>', re.S)
BREADCRUMB_LI_RE = re.compile(r"<li>(.*?)</li>", re.S)
TAG_RE = re.compile(r"<[^>]+>")


def breadcrumb_aus_seite(output, path, content):
    """BreadcrumbList für jede Seite außer Start und 404: aus der sichtbaren Brotkrümelnavigation
    (Name = Linktext, Ziel = href bzw. die Seite selbst), sonst Startseite › BREADCRUMB_NAMEN[output]."""
    m = BREADCRUMB_RE.search(content)
    stufen = []
    if m:
        for li in BREADCRUMB_LI_RE.findall(m.group(1)):
            href = re.search(r'href="([^"#?]+)"', li)
            name = html.unescape(TAG_RE.sub("", li)).strip()
            stufen.append((name, href.group(1) if href else path))
    elif output in BREADCRUMB_NAMEN:
        stufen = [("Startseite", "/"), (BREADCRUMB_NAMEN[output], path)]
    if len(stufen) < 2 or stufen[-1][1] != path:
        raise SystemExit(f"FEHLER: {output} – Brotkrümel fehlen oder enden nicht bei {path}: {stufen}")
    return breadcrumb_jsonld(stufen)


def git_datum(pfade):
    """Datum (JJJJ-MM-TT) des letzten Commits, der eine der Quellen ändert (sitemap.xml lastmod).
    Ohne Git oder für neue Dateien: heutiges Datum."""
    try:
        out = subprocess.run(["git", "log", "-1", "--format=%cs", "--", *pfade], cwd=ROOT,
                             capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        out = ""
    return out or date.today().isoformat()


def build_page(template, output, ctx, partials, themen, regionen):
    meta, body = parse_template(template)
    page_ctx = dict(ctx)
    title = render(meta["title"], page_ctx, template)
    description = render(meta["description"], page_ctx, template)
    path = "/" + output.replace("index.html", "") if output != "404.html" else None
    nav = meta.get("nav", "")
    nav_ctx = {"site_name": esc(SITE_NAME)}
    for key in NAV_KEYS:
        nav_ctx[f"nav:{key}"] = ""
    if nav:
        if nav not in NAV_KEYS or nav == "suche":
            raise SystemExit(f"FEHLER: templates/{template} – unbekannter Navigationspunkt '{nav}'")
        bereich = meta.get("nav_level") == "section"
        nav_ctx[f"nav:{nav}"] = ' aria-current="true"' if bereich else ' aria-current="page"'
        if nav == "hilfe" and not bereich:
            nav_ctx["nav:suche"] = ' aria-current="page"'
    # Handy: feste Leiste „Anbieter suchen“ unten (nicht auf /hilfe-finden/ selbst, dort steht die Suche schon)
    leiste = output != "hilfe-finden/index.html"

    image = None
    if "thema_slug" in ctx:
        t = next(t for t in themen if t["slug"] == ctx["thema_slug"])
        image = (f'/{t["bild"]["datei"]}-800.jpg', 800, t["bild"].get("hoehe", 1000), t["bild"]["alt"])
    article = ctx.get("og_article")
    if article:
        image = (f'/{RATGEBER_IMG}/{article["bild"]}-1400.jpg', 1400, 933, article["bild_alt"])

    content = render(body, page_ctx, template)
    head_extra = render(meta.get("head_extra", ""), page_ctx, template)
    if path not in (None, "/") and "BreadcrumbList" not in head_extra:
        daten = [breadcrumb_aus_seite(output, path, content)]
        if "thema_slug" in ctx:
            daten = thema_jsonld(t, regionen) + daten
        head_extra = (head_extra + "\n" if head_extra else "") + jsonld_script(daten, f"JSON-LD: {PLATZHALTER}.")
    layout_ctx = {
        "title": esc(title),
        "description": esc(description),
        "meta_seo": meta_seo(path, title, description, image, noindex=path is None, article=article),
        "head_extra": head_extra,
        "body_extra": ("  " + render(meta["body_extra"], page_ctx, template)) if meta.get("body_extra") else "",
        "icons": partials["icons"].rstrip(),
        "header": render(partials["header"], nav_ctx, "partials/header.html").rstrip(),
        "footer": render(partials["footer"], {
            "site_name": esc(SITE_NAME),
            "footer_themen": footer_themen(themen),
            "footer_regionen": footer_regionen(regionen),
        }, "partials/footer.html").rstrip(),
        "content": content.rstrip(),
        "body_klasse": ' class="hat-leiste"' if leiste else "",
        "mobil_leiste": MOBIL_LEISTE if leiste else "",
    }
    quellen = [f"templates/{template}"] + [f"data/{d}" for d in meta.get("daten", "").split()]
    lastmod = article["geaendert"] if article else git_datum(quellen)
    SEITEN_META[output] = {"title": title, "description": description, "lastmod": lastmod, "path": path}
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
    rk = load_ratgeber_kategorien(themen, beitraege)
    write_ratgeber_json(beitraege)
    anbieter_url = write_anbieter_assets(themen)

    checklisten, wohnungs_check = load_alltag(themen, beitraege)
    anliegen = load_anliegen(themen, beitraege)
    pruefe_anliegen_verweise(beitraege, anliegen)
    pgr_faq, pgr_jsonld, pgr_faq_stand = pflegegrad_seo()
    wc_form, wc_result = wohnungs_check_html(wohnungs_check, beitraege, SITE_NAME)
    region_items = [(r["slug"], r["name"]) for r in regionen]
    common = {
        "site_name": esc(SITE_NAME),
        # Startseite (Relaunch 3.2): sechs ausgewählte Beiträge (Frontmatter startseite), Übersicht: alle
        "ratgeber_start": ratgeber_start(beitraege, 8),
        "ratgeber_anzahl": str(len(beitraege)),
        "themen_start": themen_start(themen, 8),
        "hero_chips": hero_chips(anliegen, 10),
        "werkzeug_kacheln": werkzeug_kacheln(8),
        "vertrauen_liste": vertrauen_liste(6),
        "werkzeuge_so": seiten_werkzeuge("Seite „So funktioniert es“ teilen: Link zu dieser Seite", 6),
        "leitfaden_angehoerige": next(
            (b["url"] for b in beitraege if b["slug"] == "eltern-aus-der-ferne-unterstuetzen"), "/ratgeber/"),
        # Ratgeber-Übersicht (Relaunch 3.3): Suche, Häufig gesucht, Empfohlen, Kategorien, Aktuell, A–Z
        "ratgeber_suche_url": write_ratgeber_suche(beitraege, rk),
        "ratgeber_haeufig": ratgeber_haeufig(rk, 10),
        "ratgeber_empfohlen": ratgeber_empfohlen(beitraege, 8),
        "ratgeber_themen": ratgeber_themen(rk, 8),
        "ratgeber_aktuell": ratgeber_aktuell(beitraege, 8),
        "ratgeber_az": ratgeber_az(beitraege, 12),
        "ratgeber_weiterleitung": weiterleitung_skript(rk),
        "checklisten_inhalt": checklisten_html(checklisten, beitraege, SITE_NAME),
        "wc_formular": wc_form,
        "wc_ergebnis": wc_result,
        "pgr_daten": pflegegrad_daten(),
        "pgr_faq": pgr_faq,
        "pgr_jsonld": pgr_jsonld,
        "pgr_faq_stand": esc(pgr_faq_stand),
        # Seiten-Werkzeuge (Vorlesen/Teilen/Drucken) – je Seitentyp eine Zusammenstellung
        "werkzeuge_ratgeber": seiten_werkzeuge("Ratgeber-Übersicht teilen: Link zu dieser Seite", 6),
        "werkzeuge_thema": seiten_werkzeuge("Themenseite teilen: Link zu dieser Seite", 10),
        "werkzeuge_themen": seiten_werkzeuge("Themenübersicht teilen: Link zu dieser Seite", 6),
        "werkzeuge_veranstaltungen": seiten_werkzeuge(
            "Veranstaltungen teilen: Link zu dieser Seite", 8,
            drucken="Liste drucken oder als PDF speichern"),
        "werkzeuge_pflegegrad": seiten_werkzeuge(
            "Pflegegradrechner teilen: Link zum Rechner (ohne Ihre Angaben)", 12,
            teilen_titel="Pflegegradrechner"),
        "werkzeuge_alltag": seiten_werkzeuge("Mein Alltag teilen: Link zu dieser Seite", 6),
        "werkzeuge_checklisten": seiten_werkzeuge(
            "Checklisten teilen: Link zu dieser Seite (ohne Ihre Haken)", 6),
        "werkzeuge_wohnungs_check": seiten_werkzeuge(
            "Wohnungs-Check teilen: Link zu dieser Seite (ohne Ihre Antworten)", 6),
        "werkzeuge_anbieter": seiten_werkzeuge("Seite für Anbieter teilen: Link zu dieser Seite", 6),
        "anbieter_url": anbieter_url,
        "home_head": home_head(regionen),
        **veranstaltungen_html(regionen),
        "assistent_url": assistent_data(themen, regionen, beitraege, anliegen),
        "assistent_nojs": assistent_nojs(themen),
        "werkzeuge_hilfe": seiten_werkzeuge("Seite „Hilfe finden“ teilen: Link zu dieser Seite", 6),
        "themen_karten_h2": theme_cards(themen, "h2", 8),
        "themen_karten_h3": theme_cards(themen, "h3", 8),
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
        ("hilfe-finden.html", "hilfe-finden/index.html"),
        ("anfrage.html", "anfrage/index.html"),
        ("so-funktioniert-es.html", "so-funktioniert-es/index.html"),
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
            "thema_leistungen": thema_leistungen_liste(t, anliegen, 8),
            "thema_hinweis": hinweis_block(t),
            "andere_themen": andere_themen(themen, t["slug"]),
            "thema_ratgeber": thema_ratgeber(t, beitraege),
        })
        built.append(build_page("thema.html", f"themen/{t['slug']}/index.html", ctx, partials, themen, regionen))

    for k in rk["kategorien"]:
        ctx = dict(common)
        ctx.update(kategorie_ctx(k, rk))
        built.append(build_page("ratgeber-kategorie.html", f"ratgeber/{k['slug']}/index.html", ctx, partials, themen, regionen))

    for b in beitraege:
        ctx = dict(common)
        ctx.update(beitrag_ctx(b, beitraege))
        built.append(build_page("ratgeber-beitrag.html", f"ratgeber/{b['slug']}/index.html", ctx, partials, themen, regionen))

    # Eindeutige <title> und Meta-Descriptions (SEO, Relaunch 3.3)
    for feld in ("title", "description"):
        gesehen = {}
        for output, werte in SEITEN_META.items():
            if output == "404.html":
                continue
            if werte[feld] in gesehen:
                raise SystemExit(f"FEHLER: doppelte {feld} in {gesehen[werte[feld]]} und {output}: {werte[feld]!r}")
            gesehen[werte[feld]] = output

    write_sitemap({SEITEN_META[p]["path"]: SEITEN_META[p]["lastmod"] for p in built if p != "404.html"})
    print("  ✓ data/ratgeber.json, assets/data/anbieter.json, assets/data/assistent.json, sitemap.xml, robots.txt")
    for path in built:
        print(f"  ✓ {path}")
    print(f"{len(built)} Seiten erzeugt.")


if __name__ == "__main__":
    sys.exit(main())
