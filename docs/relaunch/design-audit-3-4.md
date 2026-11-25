# Design-Audit Relaunch 3.4

Stand: 25.11.2026. Geprüft wurden alle Seitentypen bei 320, 390 und 1440 px gegen die Liste aus dem Auftrag: austauschbare Standardlayouts, Verläufe, bunte Farbflächen, zu viele abgerundete Karten, dekorative Icons, Dashboard-Optik, Animationen, immer gleiche Kartenraster. Dazu Designsystem (Farben, Schriftgrößen, Abstände, Buttons, Formulare), Technik (Mobile First, Bilder, Core Web Vitals, WCAG 2.2 AA, DSGVO, SEO).

Legende: **behoben** = in diesem Schritt geändert, **offen** = bewusst nicht geändert (Begründung).

## 1. Seitenübergreifend (Designsystem)

| Befund | Status |
|---|---|
| Fünf feste Farbwerte in `components.css`/`layout.css` (halbtransparentes Weiß auf Navy, Dialog-Hintergrund) | **behoben**: Tokens `--color-line-on-navy`, `--color-border-on-navy`, `--color-backdrop` |
| Radien uneinheitlich: 6/16/20 px, dazu fest 2/3/4/5 px, `999px` an Buttons, Fortschrittsbalken und Links. Wirkt weich und austauschbar | **behoben**: Skala `--radius-xs` 3, `--radius-s` 6 (Buttons, Felder), `--radius-m` 8 (Karten, Boxen), `--radius-l` = `--radius-m`, `--radius-pill` nur noch für Chips, Badges und Stand-Hinweis, `--radius-round` für Nummern. Alle Werte im CSS über Tokens |
| Buttons als Pillen (typische Landingpage-Optik) | **behoben**: `.btn` 6 px Radius, gleiche Höhe (48 px), Rand 2 px; Filter- und Checklisten-Knöpfe ebenso |
| Kartenschatten `0 6px 20px` auf fast jeder Fläche | **behoben**: `--shadow-card` nur noch 1 px; Karten trennen sich über den Sandrand |
| Kennzeichnungen mit 16 px (`.badge`, `.demo-label`, `.placeholder-tag`, Segment-Optionen, Nummern in Kreisen) | **behoben**: alle auf `--font-size-sm` (17 px). Kleiner sind nur Einzelzeichen in Symbolkreisen (+, ✓, !, i) |
| Scroll-Animationen: Einblenden von links/rechts, zeitversetzte Karten, Zoom auf Bilder, Parallax am Hero | **behoben**: nur noch Abschnittsköpfe blenden 0,4 s mit 8 px ein, nur bei `prefers-reduced-motion: no-preference`; Zoom und Parallax entfernt (`main.js` 9.) |
| Terrakotta als Fläche an vielen Stellen (Ratgeber-Pillen, Veranstaltungs-Pillen) neben dem Primärknopf | **behoben**: Themenbereich der Ratgeber als Salbei-Textzeile, Veranstaltungs-Thema als ruhige Sand-Marke; Terrakotta bleibt Primärknopf, Logo-Punkt, Hinweisbalken |
| Geschwungene Bildkante („Bildwelle“) an Ratgeber-Karten: dekorativ, typisch generiert | **behoben**: gerade Kante |
| Footer auf dem Handy 1.500 px hoch | **behoben**: Linkspalten als `<details>` (Handy zu, ab 48em offen und nicht einklappbar, ohne JS über `::details-content`); Impressum und Datenschutz stehen immer sichtbar in der Fußzeile |
| Abschnitts-Innenabstand auf dem Handy 56 px | **behoben**: `--space-3xl` Handy 36 px, Desktop unverändert 96 px; Abschnittskopf-Abstand 24 px (ab 48em 32 px); Seitenrand Handy 16 px |
| Sechs Stylesheets blockieren das Rendern (Fonts, Tokens, Base, Layout, Komponenten) | **offen**: zusammen ca. 150 KB unkomprimiert, ausgeliefert mit Brotli ca. 25 KB; Bündeln erst mit dem WordPress-Theme |
| `no-js.js` und `weiterleitung.js` ohne `defer` im `<head>` | **offen, gewollt**: 0,3 bzw. 3 KB; müssen vor dem ersten Zeichnen laufen (Klasse `js`, Umleitung alter Adressen). Alle übrigen Skripte haben `defer` |

## 2. Seitentypen

| Seite | Befund | Status |
|---|---|---|
| Start | Themen auf dem Handy als sechs Karten mit je 4 Pillen untereinander (2.540 px) | **behoben**: Liste mit Trennlinien, 3-rem-Vorschaubild, Unterthemen als Textlinks in zwei Spalten; ab 48em Karte, Links fließend statt Raster |
| Start | Ratgeber auf dem Handy als sechs gerundete Karten mit Terrakotta-Pillen | **behoben**: Zeilen mit Trennlinie, 4-rem-Bild, Themenbereich als Textzeile |
| Start | Werkzeuge als vier Kacheln, Vertrauen mit Bildsymbolen auf dem Handy, Kennzeilen („HILFE FINDEN“) über jeder h2 | **behoben**: Werkzeuge als Liste, Bildsymbole unter 40em ausgeblendet, Kennzeilen der Startseite erst ab 48em |
| Start | Hero-Preload mit anderen `sizes` als das Bild (55vw/45vw): Browser konnte zwei Größen laden | **behoben** |
| /hilfe-finden/ | Assistent ist funktional, Auswahlkarten sind Werkzeug, kein Dekor | ohne Änderung |
| /themen/ | gleichförmiges Kartenraster mit großen Bildern | **offen**: bewusst Übersicht mit Bildern (Orientierung); erstes Bild jetzt nicht mehr lazy |
| Themenseite | drei Illustrations-Icons im Block „Persönliche Vermittlung“ | **behoben**: schlichte Häkchen bzw. Schloss aus dem Sprite |
| /anfrage/ | Schrittformular konsistent (Buttons, Felder, Fehler) | ohne Änderung |
| /so-funktioniert-es/ | drei Weg-Karten mit Illustrationen | **behoben**: Illustrationen entfernt, Karten mit farbiger Oberkante bleiben |
| Ratgeber-Übersicht/Kategorie | schon in 3.3 ohne reines Kartenraster | erstes Bild der Kategorie eager |
| Ratgeber-Beitrag | Illustration im Kasten „Passende Hilfe“ trägt das Layout (Spalte) | **offen**: bleibt |
| Mein Alltag | Illustrationen der sechs Werkzeuge | **offen**: bleiben als Wiedererkennung der Werkzeuge; Datenschutz-Hinweis jetzt mit Schloss-Symbol statt Illustration |
| Rechner, Wohnungs-Check, Checklisten | Datenschutz-Illustration in Hinweisen | **behoben** (Schloss-Symbol) |
| Veranstaltungen | Titelbild wurde auf dem Handy geladen, obwohl ausgeblendet; Thema-Pille Terrakotta | **behoben** |
| Für Anbieter | vier Vorteils-Karten mit Illustrationen, zwei Weg-Karten mit Illustrationen | **behoben**: Vorteile als Textspalten mit Linie oben, Illustrationen entfernt |
| Impressum, Datenschutz, 404 | Textseiten, konsistent | ohne Änderung |

Bilddateien wurden nicht gelöscht; `assets/img/illus.svg` bleibt (Mein Alltag, Beitrag).

## 3. Startseite auf dem Handy (390 px)

Gemessen mit Playwright (`document.documentElement.scrollHeight`, mit JS, Footer-Spalten zu):

| | vorher | nachher |
|---|---|---|
| Gesamt | **9.995 px** | **6.953 px** |
| Hero | 1.084 | 933 |
| Themen | 2.540 | 1.626 |
| Ablauf + Rückfall | 1.485 | 1.236 |
| Ratgeber + Werkzeuge | 2.068 | 1.496 |
| Vertrauen | 1.156 | 877 |
| Footer | 1.513 | 636 |

Kein Inhalt entfernt: alle Texte, Links und Bilder stehen weiter auf der Seite (Kennzeilen und Vertrauens-Symbole erst ab 48em bzw. 40em sichtbar).

## 4. SEO

- `<title>` und Meta-Description eindeutig (Build bricht bei Doppelungen ab), genau eine sichtbare h1, keine übersprungenen Ebenen: geprüft in `tests/seo.e2e.js`.
- JSON-LD: `Organization` auf Start (ohne Telefon, ohne Adresse, `areaServed` = acht Start-Städte als `City`), `Service` auf den sechs Themenseiten (kostenlose Vermittlung, gleiche Städte), `BreadcrumbList` auf allen Seiten außer Start und 404 (aus der sichtbaren Brotkrümelnavigation, sonst Startseite › Seite), `Article`/`FAQPage` wie in 3.3.
- Canonical und Open Graph auf allen Seiten; Domain nur in `SITE` (`tools/build.py`).
- `sitemap.xml`: 47 Seiten mit `lastmod` (48 Seiten minus 404, die `noindex` trägt); `robots.txt` verweist darauf.

## 5. Performance: Transfergröße und Requests

Playwright, Seite laden bis `networkidle` ohne Scrollen, Summe aus Antwort-Körper + Kopfzeilen. Lokaler Server ohne Kompression (`python3 -m http.server`), daher absolut höher als im Deployment; Vergleich vorher/nachher ist gleich gemessen.

| Seitentyp | Breite | vorher KB / Requests | nachher KB / Requests | Seitenhöhe px | fremde Requests |
|---|---|---|---|---|---|
| Start | 390 | 694 / 21 | 509 / 21 | 9995 → 6953 | 0 |
| Start | 1440 | 849 / 24 | 564 / 24 | 7049 → 6846 | 0 |
| Hilfe finden | 390 | 644 / 22 | 649 / 22 | 7081 → 5936 | 0 |
| Themenübersicht | 390 | 495 / 16 | 500 / 16 | 4379 → 3398 | 0 |
| Themenseite | 390 | 443 / 15 | 435 / 14 | 7335 → 6061 | 0 |
| Themenseite | 1440 | 640 / 20 | 632 / 19 | 4258 → 4312 | 0 |
| Anfrage | 390 | 327 / 14 | 332 / 14 | 2860 → 1910 | 0 |
| So funktioniert es | 390 | 301 / 12 | 291 / 11 | 8564 → 6923 | 0 |
| Ratgeber-Übersicht | 390 | 412 / 16 | 417 / 16 | 8849 → 7791 | 0 |
| Ratgeber-Kategorie | 390 | 423 / 14 | 427 / 14 | 5411 → 4434 | 0 |
| Ratgeber-Beitrag | 390 | 350 / 12 | 355 / 12 | 16380 → 15251 | 0 |
| Mein Alltag | 390 | 264 / 11 | 269 / 11 | 5484 → 4488 | 0 |
| Pflegegrad-Rechner | 390 | 440 / 15 | 444 / 15 | 4885 → 3837 | 0 |
| Wohnungs-Check | 390 | 286 / 12 | 277 / 11 | 5590 → 4508 | 0 |
| Checklisten | 390 | 280 / 12 | 271 / 11 | 11042 → 9865 | 0 |
| Veranstaltungen | 390 | 348 / 12 | 301 / 11 | 8878 → 7878 | 0 |
| Veranstaltung melden | 390 | 285 / 12 | 290 / 12 | 3798 → 2828 | 0 |
| Für Anbieter | 390 | 309 / 13 | 299 / 12 | 8677 → 6822 | 0 |
| Impressum | 390 | 246 / 10 | 251 / 10 | 3530 → 2602 | 0 |
| Datenschutz | 390 | 250 / 10 | 255 / 10 | 7166 → 6238 | 0 |
| 404 | 390 | 243 / 10 | 247 / 10 | 2349 → 1389 | 0 |

Desktop (1440) der übrigen Seiten: Werte wie 390 px ± 5 KB (gleiche Dateien).

Maßnahmen: Vorschaubilder `tools/bilder.py --vorschau` (Themen 160 px, Ratgeber 400 px; Startseite Handy lädt 8–20 KB statt 35–60 KB je Bild), Hero-Preload mit passenden `sizes` und `fetchpriority`, erstes sichtbares Bild nie lazy, alle weiteren `loading="lazy"` + `decoding="async"` + `width`/`height`, Titelbild der Veranstaltungen unter 48em gar nicht geladen. Schrift: Source Serif 4 (21 KB) mit `font-display: swap` und Preload. Die je Seite gleich bleibenden ~240 KB sind CSS (150 KB) und `main.js` (54 KB) unkomprimiert.

Bilder über 300 KB, die ausgeliefert werden: **keine** (größte: `ratgeber/mobilitaet-fahrdienst-rampe-1400.jpg` 258 KB, `hero-garten-1600.jpg` 256 KB, nur als JPG-Rückfall bzw. auf großen Schirmen). Im Repo liegt `assets/img/hero-garten.png` (> 300 KB), wird aber nirgends eingebunden (Original, nicht gelöscht).

## 6. DSGVO

`tests/seo.e2e.js` lädt alle 47 Seiten plus 404, scrollt jede einmal ganz durch (lädt alle lazy-Bilder) und schlägt bei jedem Request an einen fremden Host fehl: **0 fremde Requests**. Keine Webfonts von Google, keine CDNs, kein Tracking. Links zu Google Maps sind normale `<a>`-Links und laden nichts.

## 7. Offene Punkte

- CSS bündeln/minifizieren erst im WordPress-Theme (Kompression übernimmt Cloudflare).
- `/themen/` bleibt ein Bildraster; falls es zu gleichförmig wirkt, später als Liste wie auf der Startseite.
- Ratgeber-Beitrag auf dem Handy weiterhin lang (15.000 px) – Textlänge, nicht Gestaltung.
