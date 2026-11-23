# DESIGN.md – Konzept 60+

Gebündelte Design-Referenz für Menschen und AI-Design-Agents. Beschreibt, was im Code steht (`assets/css/*.css`, `partials/`, `templates/`). Bei Widerspruch gilt der Code; Abweichungen von den Projektregeln stehen in Abschnitt 12.

Quelle der Wahrheit für Werte: `assets/css/tokens.css`. Hier nie abweichende Werte pflegen, nur dort.

---

## 1. Kurzprofil und Zweck

- **Name:** "Konzept 60+" (Arbeitstitel). Nur Textlogo, kein Bildlogo. Der Name steht zentral in `tools/build.py` (`SITE_NAME`) und kommt per `{{site_name}}` in Templates und Partials.
- **Logo:** `.logo` in Source Serif 4 (Gewicht 600, 1.75rem, Navy) mit kleinem terrakottafarbenem Punkt (`.logo__text::after`). Auf dunklem Grund `.logo--light`.
- **Zweck:** kostenloses, persönliches Vermittlungs- und Infoportal für Menschen ab 60 und Angehörige. Es verbindet sie mit gewerblichen Anbietern und privaten Helfern. Wir erbringen selbst keine Dienstleistungen.
- **Drei Säulen** (Hauptnavigation): Hilfe finden (`/themen/`), Ratgeber (`/ratgeber/`), Mein Alltag (`/mein-alltag/`). Dazu klein "Für Anbieter" und der CTA "Anfrage stellen".
- **Sechs Themen:** Wohnen, Haus und Handwerk; Haushalt und Reinigung; Pflege und Betreuung; Alltag und persönliche Hilfe; Technik und Sicherheit; Freizeit und Lebensqualität. Dazu Ratgeber.
- **Region:** Düsseldorf, Wuppertal, Hilden, Remscheid, Solingen, Langenfeld, Haan, Wesel (`data/regionen.json`).
- **Technik:** statisches HTML, CSS, Vanilla-JS auf Cloudflare Workers, später eigenes WordPress-Theme.

## 2. Zielgruppe und Prinzipien

**Zielgruppe:** Menschen ab 60 sowie Angehörige (auch aus der Ferne). Viele lesen am Handy, manche mit nachlassendem Sehvermögen oder wenig Technikerfahrung.

**Gestalterische Prinzipien (im Code belegt):**

1. **Groß und ruhig:** Basisschrift 19px mobil, 20px ab 60em; Zeilenhöhe 1.6; Textspalte max. 68ch.
2. **Mobile-first:** Basisstile gelten für schmale Schirme, `min-width`-Queries erweitern.
3. **Hoher Kontrast:** Fließtext ca. 16:1, Sekundärtext ca. 9.6:1, Formularränder mindestens 3:1.
4. **Große Ziele:** Touch-Ziele mindestens 48px (`--touch-min`), Formularfelder 52px.
5. **Eindeutig:** Pro Bereich eine Hauptaktion (Terrakotta-Button). Aktiver Zustand nie nur über Farbe (z. B. Häkchen im Filter).
6. **Ohne JS nutzbar:** Inhalte und Navigation funktionieren ohne Skript (`.js` auf `<html>` schaltet Verbesserungen frei). Werkzeug-Buttons (Vorlesen, Teilen, Drucken) sind ohne JS `hidden`.
7. **Dezent:** Ruhige Animationen, nur einmalig, abschaltbar.
8. **Persönlich:** Vermittlung wird von einem Team geprüft, nicht automatisch.

## 3. Farben

Palette: tiefes Navy, Weiß, dezente Naturtöne (Sand, Salbei) und ein einziger warmer Akzent (Terrakotta). Alle Werte aus `tokens.css`.

### 3.1 Navy (Primärfarbe)

| Token | Wert | Verwendung |
|---|---|---|
| `--color-navy-900` | `#0e1830` | tiefster Ton: Footer, Topbar |
| `--color-navy-800` | `#14213d` | Primärfarbe: Überschriften, Links, Hero, `.section--navy`, Fokus-Kontur |
| `--color-navy-700` | `#22325a` | Zwischenton |
| `--color-navy-100` | `#e6e9f0` | heller Navy-Tint |
| `--color-on-navy` | `#e3e8f1` | heller Text auf Navy (Hero, `.section--navy`, Schritte, Footer), ca. 13:1 |
| `--color-on-navy-muted` | `#d5dbe7` | Kleingedrucktes auf Navy (`.hero__note`), ca. 11.5:1 |

### 3.2 Weiß und Text

| Token | Wert | Verwendung / Kontrast |
|---|---|---|
| `--color-white` | `#ffffff` | Seitenhintergrund, Karten, Felder |
| `--color-ink` | `#161d2f` | Fließtext auf Weiß, ca. 16:1 (AAA) |
| `--color-ink-muted` | `#3b4458` | Sekundärtext auf Weiß, ca. 9.6:1 (AAA) |
| `--color-border-input` | `#6b7385` | Ränder von Eingabefeldern, Chips und Auswahlkarten, ca. 4.8:1 auf Weiß |

### 3.3 Sand (natürlicher Hintergrund, Linien)

| Token | Wert | Verwendung |
|---|---|---|
| `--color-sand-50` | `#fbf8f2` | sehr heller Sandton |
| `--color-sand-100` | `#f4eee3` | Abschnittshintergrund (`.section--sand`), Bild-Platzhalter |
| `--color-sand-300` | `#e3d6bf` | Linien, Kartenränder, Header-Unterkante |

### 3.4 Salbei

| Token | Wert | Verwendung |
|---|---|---|
| `--color-sage-100` | `#e5ece4` | Abschnittshintergrund (`.section--sage`) |
| `--color-sage-200` | `#c9d6c8` | Rand der Hinweisboxen |
| `--color-sage-400` | `#8fa892` | nur Dekor, z. B. Eyebrow und Icons auf Navy |
| `--color-sage-700` | `#3d5a44` | textfähig auf Weiß/Sand, ca. 7:1; Eyebrow, Häkchen, Karten-Hover-Rand |

### 3.5 Terrakotta (Akzent, Primär-CTA)

| Token | Wert | Verwendung / Kontrast |
|---|---|---|
| `--color-terra-600` | `#a8471f` | Primär-Button, Logo-Punkt, Hinweisbox-Rand; Weiß darauf ca. 5.9:1 |
| `--color-terra-700` | `#8a3a19` | Hover, Badge-Text, wichtige Hinweise |
| `--color-terra-100` | `#f6e4da` | Badge-Hintergrund, `.notice--important`, Vorlese-Markierung |
| `--color-terra-200` | `#ecc9b6` | Rand des Angehörigen-Panels |
| `--color-terra-300` | `#f0c9b4` | helles Terrakotta, nur auf Navy (Hero-Titel, Footer-Hover), ca. 10:1 |

### 3.6 Illustrations-Icons (nur Dekor)

| Token | Wert | Verwendung |
|---|---|---|
| `--color-olive-600` | `#75825a` | Ring in `assets/img/illus.svg` |
| `--color-olive-300` | `#a4ae8b` | Flächen in den Illustrationen |
| `--color-orange-500` | `#c0702c` | Akzentflächen, nie für Text |

Hinweis: `illus.svg` trägt diese Werte fest eingetragen. Bei Änderung dort mitziehen.

### 3.7 Status und Fokus

| Token | Wert | Verwendung |
|---|---|---|
| `--color-error` | `#a31d1d` | Fehlertext, ca. 7.4:1 auf Weiß |
| `--color-error-bg` | `#fbeaea` | Hintergrund ungültiger Felder |
| `--color-success` | `#2f5a37` | Erfolg |
| `--color-success-bg` | `#e7f1e6` | Erfolgs-Hintergrund |
| `--color-focus` | `#f2b134` | Fokusring, wirkt mit Navy-Kontur auf hellem und dunklem Grund |

### 3.8 Abschnittsflächen

`.section` (weiß), `.section--sand`, `.section--sage`, `.section--navy` (Überschriften dann weiß). Abwechselnd einsetzen, nie zwei gleiche direkt untereinander ohne Grund.

## 4. Typografie

**Schriften (nur diese zwei, beide ohne externe Verbindung):**

| Token | Stack | Einsatz |
|---|---|---|
| `--font-serif` | "Source Serif 4", "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, "Times New Roman", serif | h1, h2, Logo, Frageüberschriften, Hero |
| `--font-sans` | system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif | Fließtext (`body`), h3, h4, Buttons, Formulare, Kartentitel, Footer-Überschriften |

- Source Serif 4 ist selbst gehostet (SIL OFL 1.1) in `assets/fonts/`: `source-serif-4-latin-600-normal.woff2` und `…latin-ext-600-normal.woff2`, `font-display: swap`, Preload des Latin-Schnitts im Layout. Es gibt nur Gewicht 600 (kein Kursiv, kein 400/700).
- Keine Google-Fonts-CDN, keine weiteren Schriften.

**Größen:**

| Token | Wert | Hinweis |
|---|---|---|
| `--font-size-base` | `1.1875rem` (19px); ab 60em `1.25rem` (20px) | Fließtext |
| `--font-size-sm` | `1.0625rem` (17px) | nur Kleingedrucktes und Meta; „Für Anbieter“ in der Navigation |
| `--font-size-md` | `1.125rem` (18px) | Hauptnavigation ab 68em |
| `--font-size-lg` | `1.3125rem` | Einleitungen (`.section__intro`, `.hero__text`) |
| `--font-size-h3` | `1.4375rem` | h3, Gewicht 700, Sans |
| `--font-size-h2` | `clamp(1.875rem, 1.4rem + 2vw, 2.625rem)` | Serif, 600 |
| `--font-size-h1` | `clamp(2.25rem, 1.6rem + 3vw, 3.75rem)` | Serif, 600 |
| `--line-height-base` | `1.6` | Fließtext |
| `--line-height-tight` | `1.2` | Überschriften |

**Regeln aus base.css:**

- Überschriften: Navy-800, `text-wrap: balance`, h1/h2 `letter-spacing: -0.01em`.
- Absätze: `max-width: 68ch`.
- Links: Navy, unterstrichen (`text-decoration-thickness: 0.08em`, `text-underline-offset: 0.18em`), Hover Terrakotta-700.
- Eyebrow (`.section__eyebrow`): 17px, fett, Großbuchstaben, `letter-spacing: 0.06em`, Salbei-700.
- Hero-Titel: `clamp(2rem, 1.45rem + 2.4vw, 3.25rem)`, zweite Zeile (`span`) in hellem Terrakotta.

## 5. Abstände, Raster, Breakpoints, Radien, Schatten

### 5.1 Abstandsskala

| Token | Wert |
|---|---|
| `--space-2xs` | `0.25rem` |
| `--space-xs` | `0.5rem` |
| `--space-s` | `0.75rem` |
| `--space-m` | `1rem` |
| `--space-l` | `1.5rem` |
| `--space-xl` | `2rem` |
| `--space-2xl` | `3rem` |
| `--space-3xl` | `clamp(3.5rem, 2.5rem + 4vw, 6rem)` (Abschnitts-Padding) |

### 5.2 Container und Sonstiges

| Token | Wert | Hinweis |
|---|---|---|
| `--container-max` | `clamp(75rem, 80vw, 120rem)` | 1200px, auf großen Monitoren 80 % der Breite (max. 1920px) |
| `--gutter` | `1.25rem`; ab 60em `2rem` | seitlicher Innenabstand |
| `--touch-min` | `3rem` | 48px Mindestgröße für Touch-Ziele |
| `--transition` | `160ms ease`; bei reduzierter Bewegung `0ms` | Standard-Übergang |

### 5.3 Radien und Schatten

| Token | Wert | Einsatz |
|---|---|---|
| `--radius-s` | `6px` | Eingabefelder, Skip-Link, Menü-Button |
| `--radius-m` | `12px` | Karten, Hinweisboxen |
| `--radius-l` | `20px` | große Panels (`.provider-panel`) |
| (fest) | `999px` | Buttons, Badges, Pills, Stand-Hinweis |
| (fest) | `50%` | runde Marker, Logo-Punkt |
| `--shadow-card` | `0 1px 2px rgb(20 33 61 / 0.06), 0 6px 20px rgb(20 33 61 / 0.07)` | Karten; Schatten sind sonst nicht vorgesehen |

### 5.4 Raster (`layout.css`)

- `.grid` ist 1 Spalte. `.grid--2`, `.grid--3`, `.grid--4` zeigen ab 40em 2 Spalten; `.grid--3` ab 64em 3; `.grid--4` ab 75em 4.
- `.split` (2 Spalten ab 60em), `.request-layout` (4fr/7fr ab 64em, Aside sticky), `.hero` (5fr/6fr ab 60em, Bild rechts).
- Footer-Raster: 1 Spalte, ab 48em 2, ab 64em 5 Spalten.

### 5.5 Breakpoints (alle in `em`)

| Breite | Wirkung |
|---|---|
| `30em` / `<30em` | Kleinster Handy-Bereich: Werkzeug-Buttons im Beitrag nebeneinander mit Kurzbeschriftung |
| `40em` / `<40em` | 2-Spalten-Raster; mobile Kartenbilder 2:1 |
| `48em` / `<48em` | Topbar sichtbar, Footer 2 Spalten; viele Komponenten-Anpassungen |
| `56em` | Beitragslayout |
| `60em` / `<60em` | Desktop-Schrift 20px, Gutter 2rem, Hero zweispaltig |
| `64em` | 3-Spalten-Raster, Anfrage-Layout, Footer 5 Spalten |
| `68em` / `<68em` | Desktop-Navigation (darunter Menü-Button, mit JS einklappbar) |
| `75em` | 4-Spalten-Raster (Ratgeber) |

Neue Breakpoints nur aus dieser Liste wählen.

## 6. Komponenten

Namensschema BEM (`block__element--modifier`), WordPress-tauglich (Template-Parts, Block-Styles).

### 6.1 Buttons (`.btn`)

- Pille (`border-radius: 999px`), `min-height: 48px`, Padding `0.7rem 1.4rem`, Rand 2px, fett, `1.0625em`, Übergang `--transition`.
- Varianten: `.btn--primary` (Terrakotta-600, Weiß; Hover Terrakotta-700) nur für „Anfrage stellen“ (Header-CTA), den Hero-/Seitenkopf-CTA und Formular-Absenden; Karten-, Kachel- und Raster-Buttons (Drei Wege, Mein Alltag, Checklisten, Angehörigen-Panel der Startseite, Assistent „Weiter“) sind `.btn--secondary`; `.btn--secondary` (Weiß, Navy-Rand; Hover Navy-Fläche); `.btn--outline-light` (transparent, weißer Rand, auf Navy); `.btn--block` (volle Breite); `.btn--menu` (Radius 6px, für Menü-Toggle, `aria-expanded` füllt Navy).
- `.btn-group` ordnet mehrere Buttons.

### 6.2 Karten

- `.card`: weiß, 1px Sandrand, `--radius-m`, `--shadow-card`; Hover und `:focus-within` färben den Rand Salbei-700. Ganze Karte klickbar.
- `.card__media` Bild oben 4:5, `object-fit: cover`. In `.card-grid` mobil (<40em) Querformat 2:1 mit Rand innen.
- Teile: `.card__body`, `.card__title` (Sans), `.card__text`, `.card__examples`, `.card__actions`, `.card__link`, `.card__more`.
- `.article-card` (Ratgeber): Bild 4:3, Meta, Titel, Anreißer, `.article-card__pill`, `.article-card__stand`.
- `.provider-panel`: weiß, Sandrand, `--radius-l`.

### 6.3 Hinweisboxen (`.notice`)

Weiß, `--radius-m`, 6px Balken links, Icon. Varianten: Standard (Terrakotta-600), `--light` (Salbei, Sandrand), `--important` (Terrakotta-100, Balken Terrakotta-700), `--privacy` (Datenschutz im Formular), `--flush`.

### 6.4 Formulare

- Struktur: `.form`, `.form__section` mit `.form__legend` und nummeriertem `.form__legend-nr`, `.form__row`, `.form-field` mit `__label`, `__req`, `__hint`, `__input`, `__error`.
- Eingabe: `min-height: 3.25rem`, Rand 2px `--color-border-input` (Kontrast mindestens 3:1), `--radius-s`, Textarea ab 9rem Höhe; Hover Rand Navy; ungültig: Rand `--color-error` und Hintergrund `--color-error-bg` (`aria-invalid="true"`).
- Auswahl: `.choice-group`, `.choice` (große Klickfläche), `.segment` / `.segment__option`, `.chip`.
- Fehler: `.form-summary` mit Sprunglinks, Fokus aufs erste Fehlerfeld, Fehler je Feld über `aria-describedby`. Erfolg: `.form-success`.
- Einwilligungen getrennt: Pflicht (Bearbeitung) einzeln, Newsletter freiwillig und nicht vorausgewählt. Rückruf nur als Wunsch, Rückruf erfolgt durch uns.

### 6.5 Header und Navigation

- `.site-header`: weiß, 1px Sandlinie unten, Balkenhöhe mind. 5rem. `.site-header__topbar` (Navy-900, nur ab 48em) trägt nur einen Hinweistext.
- Ab 68em horizontale `.site-nav` mit `.site-nav__link` (18px, `--font-size-md`; bricht 68em–1440px nicht um), "Für Anbieter" kleiner (`--minor`, 17px) und CTA `.btn--primary` "Anfrage stellen". Darunter: `.btn--menu` klappt `#hauptnavigation` nur mit JS (`.js`) zu; ohne JS steht die Navigation offen.
- Aktiver Punkt: `aria-current="page"` (Übersicht) oder `aria-current="true"` (Unterseite).
- Skip-Link `.skip-link` oben.

### 6.6 Footer

`.site-footer` (Navy-900, Text `--color-on-navy`, Links weiß, Hover hell-terrakotta). Spalten: Logo mit Kurztext, Drei Wege, Themen, Regionen (`auto-fill`, Spalten ab 6.5em, Abstand `--space-2xs`/`--space-xl`: 2 Spalten wo Platz ist, in der schmalen 5-Spalten-Ansicht ab 64em eine), Informationen. Linkzeilen mind. 48px hoch. Unten Trennlinie, Copyright, Prototyp-Hinweis (`.demo-label`).

### 6.7 Weitere Bausteine

- **Hero** (`.hero`): Navy, Bild 16:10 (Desktop rechts, füllend), `.hero__title`, `.hero__text`, `.hero__note`.
- **Seitenkopf** `.page-header`, **Breadcrumb** `.breadcrumb`, **Check-Liste** `.check-list`, **Badge** `.badge` (Terrakotta-100), **Demo-Label** `.demo-label`.
- **Assistent** (Startseite, `assets/js/assistent.js`): Ziel, Thema, Stadt, Ergebnis mit einem Hauptbutton und höchstens zwei Nebenlinks. Ohne JS: drei Säulen-Links.

### 6.8 Ratgeber-Elemente

- Kopf: Kicker-Link zum Thema (`.article__kicker`), H1, **Stand-Pille** `.article__stand` ("Stand: Monat Jahr"). Beiträge ohne Autor.
- Layout `.article__layout`: Titelbild 3:2, Inhaltsverzeichnis `.toc`, Fließtext; zweites Bild optional (lazy, 3:2). Beitrag steht an derselben Containerkante wie alle Seiten (nicht zentriert); Text 42rem, Kopf max. 64rem.
- Inhaltsverzeichnis als `<details class="toc__details" data-toc>`: unter 64em eingeklappt (Summary „Inhalt“ mit +/−), ab 64em offen und nicht einklappbar (`main.js` 13.; ohne JS über `::details-content`). Links mind. 48px (`--touch-min`).
- Tabellen: mobil als Label/Wert-Karten (`data-label`), `<caption>` visuell verborgen.
- Hinweis-Kasten ("Wichtig" in Terrakotta, sonst Salbei), Quellenblock `.beitrag-quellen`, CTA am Ende, "Weitere Beiträge".
- Themenfilter `/ratgeber/`: Buttons mit `aria-pressed`; aktiv = Navy-Fläche plus Häkchen; Live-Region meldet die Anzahl.
- Fördersummen immer mit Quelle; Stand und Änderungsdatum gepflegt.

### 6.9 Seitenwerkzeuge (Vorlesen, Teilen, Drucken)

- `.seiten-werkzeuge` (Flex, Abstand `--space-s`) enthält `.vorlesen` mit `.vorlesen__btn` sowie Teilen und Drucken (`.seiten-werkzeuge__btn`), jeweils `min-height: 3.25rem`.
- Alle Buttons haben `hidden`, bis JS sie freischaltet (`main.js` 8., 10., 11.).
- Rückmeldung `.seiten-werkzeuge__status` (`role="status"`, z. B. "Link kopiert").
- Gerade vorgelesener Abschnitt: `.vorlesen-aktiv` (Terrakotta-100 mit Ring).
- Unter 30em (nur Beitrag): Buttons nebeneinander in einer Zeile, Symbol über Kurzbeschriftung (`.seiten-werkzeuge__kurz`, `aria-hidden`: Vorlesen/Pause/Weiter, Teilen, Drucken); die lange Beschriftung (`.seiten-werkzeuge__lang`) bleibt visuell verborgen im Namen.
- Übersichtsseiten (Themen, Ratgeber, Mein Alltag, Checklisten, Wohnungs-Check, Pflegegradrechner, Veranstaltungen, Für Anbieter): `.seiten-werkzeuge--dezent` mit `.seiten-werkzeuge__link` (Textlink mit Symbol, unterstrichen, 48px hoch) statt Pillenbutton (`seiten_werkzeuge(..., dezent=True)` in `build.py`).

### 6.10 Druck (`print.css`, nur `media="print"`)

Weißer Grund, schwarze Schrift 12pt, kein Header, Footer, Navigation, Buttons, Bilder, Werkzeuge, Inhaltsverzeichnis. Externe Links zeigen ihre Adresse. Quellenangabe `.print-url` am Ende. Bereichsdruck über `body.is-printing` und `.is-print-target`. Hinweis: `print.css` nutzt feste Werte (`#fff`, `#000`, `#999`), bewusst für Druck.

## 7. Bewegung und Animation

- **Standard-Übergang:** `--transition: 160ms ease` für Buttons, Kartenrand, Hover-Flächen. Nur Farbe, Rand, Breite (Fortschrittsbalken); kein Springen.
- **Reduzierte Bewegung:** `tokens.css` setzt `--transition: 0ms`; `base.css` setzt `scroll-behavior: auto` und kürzt alle Animationen und Übergänge auf 0.01ms. Fortschrittsbalken `.beitrag-check__balken` schaltet Übergang ebenfalls ab.
- **Scroll-Einblendung** (`[data-anim]`, nur bei `prefers-reduced-motion: no-preference`, gesetzt durch `main.js` 9. mit `.js-anim`): Einblenden 0.6s `ease-out`, Bewegung 0.6s `cubic-bezier(0.22, 0.61, 0.36, 1)`, optional `--anim-delay`.
  - Varianten: `up` (16px), `left`/`right` (20px; mobil <48em stattdessen senkrecht), `zoom` (Skalierung 1.05, Bild 1.2s). Einmalig, bereits sichtbare Elemente werden nicht animiert.
  - Parallax nur Desktop (`.has-parallax`, `--parallax-y`), dezent.
- **Smooth Scroll** auf `html`; Anker mit `scroll-margin-top`.
- Regeln: keine Endlosschleifen, kein Autoplay, keine Bewegung, die Information trägt.

## 8. Barrierefreiheit

- **Schriftgröße:** Fließtext mindestens 19px; 17px nur für Meta und Kleingedrucktes. Browser-Zoom und Textvergrößerung (`rem`, `em`) bleiben möglich.
- **Touch-Ziele:** mindestens 48px (`--touch-min`) für Buttons, Logo, Footer-Links; Formularfelder und Werkzeug-Buttons 52px.
- **Fokus:** global `:focus-visible` = 3px Gelb (`--color-focus`) Kontur, Offset 3px, zusätzlicher 6px Navy-Ring; wirkt auf hell und dunkel. Nie entfernen (Ausnahme: Titel-Link in Karten, dort zeigt `:focus-within` den Rand).
- **Kontrast:** Textfarben nur aus Abschnitt 3 (mindestens AA, meist AAA). Formularränder mindestens 3:1. Dekorfarben (`sage-400`, `olive-*`, `orange-500`) nie für Text.
- **Nicht nur Farbe:** Zustände mit Zusatzmerkmal (Häkchen, Icon, Text, Balken).
- **Semantik:** Landmarken, Skip-Link, `aria-current`, `aria-expanded`, `aria-describedby`, `aria-invalid`, `aria-pressed`, `role="status"` und `aria-live` für Rückmeldungen. `.visually-hidden` für reine Screenreader-Texte.
- **Bilder:** immer sinnvoller Alt-Text (Beitragsbilder per Frontmatter `bild_alt`).
- **Fehlermeldungen:** in einfacher Sprache, mit Zusammenfassung und Sprunglinks.
- **Bewegung:** siehe Abschnitt 7.

## 9. Bildsprache

- **Motive:** fröhliche, aktive, lebensbejahende ältere Menschen (KI-Bilder), echte Begegnungen, Alltag, Gärten, Gemeinschaft.
- **Nicht zeigen:** Pflege-Klischees (kraftlose Hände, Rollstuhl als Symbol, Bettlägerigkeit), keine staatlichen Hoheitszeichen (z. B. Bundesadler).
- **Ausnahme:** Das Herz-Logo im Pflege-Bild bleibt.
- **Kategoriebilder** (Themenkarten): Hochformat 4:5; **mobil im Querformat** (2:1 in `.card-grid`, unter 40em).
- **Formate:** Hero 16:10 (`hero-garten-*`), Beitrag 3:2, Teaser 4:3. Ordner: `assets/img/themen/`, `ratgeber/`, `veranstaltungen/`, `pflegegrad/`. Zuschnitt und WebP-Größen über `tools/bilder.py`; Originale nicht ins Repo.
- **Technik:** WebP mit JPG-Fallback, `object-fit: cover`, Platzhalterfläche Sand-100, Lazy-Loading außer im ersten Sichtbereich.
- **Icons:** SVG-Sprite `partials/icons.html` (Linien-Icons, `aria-hidden`), Illustrationen in `assets/img/illus.svg` (96×96, Farben Olive/Orange).

## 10. Tonalität und Texte

- **Sprache:** einfaches, warmes, nicht technisches Deutsch. Ansprache mit "Sie". Kurze Sätze, keine Fachwörter ohne Erklärung.
- **Vermittlung ist persönlich:** Das Team prüft jede Anfrage. Keine Erfolgsgarantie. Keine Zusage einer Antwortzeit (nicht "so schnell wie möglich").
- **Kontakt:** keine eigene Telefonnummer auf der Seite, keine Aufforderung, uns anzurufen. Ein Rückruf durch uns darf angeboten werden. Telefon **oder** E-Mail genügt im Formular.
- **Anbieterprofile** sind nicht öffentlich.
- **Ratgeber:** ohne Autor, mit sichtbarem "Stand"; Förderbeträge immer mit Quelle. Inhalte gehen vom Rechtsstand 2027 aus.
- **Beispieldaten** sind als Prototyp gekennzeichnet (`.demo-label`).
- Buttons nennen die Handlung ("Anfrage stellen", "Hilfe finden"), nicht "Hier klicken".
- Bindestriche: kein Gedankenstrich in Fließtext; Gedankenstrich nur in Titeln, wenn bereits vorhanden.

## 11. Dos und Don'ts

**Do**

- Farben, Abstände, Größen, Radien, Schatten immer über Tokens aus `tokens.css`.
- Genau einen Terrakotta-Primärbutton pro Bereich; Terrakotta nur für Header-CTA, Hero-/Seitenkopf-CTA und Formular-Absenden.
- Container nie mit `margin-inline: 0` und eigener `max-width` überschreiben (verschiebt die Kante): Lesebreite über Grid-Spalte (`grid-template-columns: minmax(0, 52rem)`) oder Kind-Elemente begrenzen.
- Navy für Struktur, Sand und Salbei für Flächen, Terrakotta nur als Akzent.
- Mobil zuerst entwerfen, dann mit `min-width` erweitern.
- Ziele mindestens 48px, Text mindestens 17px (Fließtext 19px und mehr).
- Zustände mit Text oder Icon zusätzlich zur Farbe.
- Komponenten per BEM benennen, in `components.css` ablegen.
- Ohne JS lauffähig halten; JS nur ergänzen.
- Quellen und Stand bei Zahlen nennen.

**Don't**

- Keine Hex-Werte im Komponenten-CSS hartcodieren (siehe Abschnitt 12 für Altlasten).
- Keine zusätzlichen Schriften, keine Google-Fonts oder andere CDNs.
- Keine Frameworks, kein Elementor, keine unnötigen Plugins.
- Kein Inline-CSS und kein Inline-JS (strikte CSP, nur JSON-LD inline).
- Keine eigene Telefonnummer, kein "Rufen Sie uns an", keine Antwortzeit-Versprechen.
- Keine Pflege-Klischeebilder, keine Hoheitszeichen.
- Kein Autoplay, keine Dauer-Animation.
- Keine Schatten außer `--shadow-card`, keine Verläufe, keine Glas-Effekte.
- Keine neuen Radien oder Breakpoints außerhalb der Listen oben.
- Gelben Fokusring nie überschreiben oder entfernen.

## 12. Hinweise für AI-Agents

**Dateien:**

| Pfad | Inhalt |
|---|---|
| `assets/css/tokens.css` | alle Design-Tokens (entspricht später `theme.json`) |
| `assets/css/fonts.css` | `@font-face` Source Serif 4 |
| `assets/css/base.css` | Reset, Typografie, Fokus, Hilfsklassen |
| `assets/css/layout.css` | Container, Sektionen, Raster, Header, Hero, Footer |
| `assets/css/components.css` | BEM-Komponenten (ca. 77 KB; gezielt per `grep` suchen) |
| `assets/css/print.css` | Druckansicht (nur `media="print"`) |
| `assets/fonts/` | selbst gehostete WOFF2-Dateien |
| `assets/js/` | `main.js`, `no-js.js`, `api.js`, `assistent.js`, `alltag.js`, `veranstaltungen.js`, `pflegegrad/` |
| `templates/`, `partials/`, `data/`, `content/ratgeber/` | Quellen; HTML wird per `python3 tools/build.py` generiert |
| `README.md` | Struktur, Build, WordPress-Mapping |

**Regeln:**

1. Generierte HTML-Dateien (Kommentar "GENERIERT von tools/build.py") nie direkt bearbeiten, sondern Template, Partial, Daten oder Markdown ändern und neu bauen. Der Seitenname kommt aus `SITE_NAME` in `tools/build.py`.
2. Immer `var(--token)` verwenden. Neue Werte erst als Token in `tokens.css` anlegen, dann nutzen. Tokens bleiben im Schema `--color-…`, `--space-…`, `--font-…`, `--radius-…` (theme.json-nah).
3. Keine neuen Schriften, keine CDNs, keine Frameworks. Nur HTML, CSS, Vanilla-JS.
4. Klassennamen BEM und deutsch-englisch gemischt wie vorhanden; keine Utility-Klassen-Systeme. Namen WordPress-migrationsfreundlich halten (Template-Part pro Komponente).
5. Mobile-first mit `min-width` in `em`, nur Breakpoints aus 5.5.
6. Jede interaktive Komponente braucht Fokuszustand, Tastaturbedienung, 48px-Ziel und ein Verhalten ohne JS.
7. Bewegung nur mit `--transition` oder im `prefers-reduced-motion: no-preference`-Block.
8. Inhalte nach Abschnitt 10 prüfen (Sie-Ansprache, keine Telefonnummer, keine Zeitzusage, Stand und Quellen).
9. Bilder nur nach Abschnitt 9; Größen über `tools/bilder.py`.

**Bekannte Abweichungen im Code (Stand der Prüfung):**

- Source Serif 4 ist nur für Überschriften (h1, h2), Logo und Frageüberschriften im Einsatz; der Fließtext nutzt die Systemschrift (`--font-sans`). Es ist nur ein Gewicht (600) eingebunden.
- `components.css` und `layout.css` enthalten keine festen Hex-Werte mehr. Einzige Ausnahme sind halbtransparente Weiß-Ränder auf Navy (`rgb(255 255 255 / …)`).
- Kennzeichnungen (`.demo-label`, `.badge`, `.placeholder-tag`) und Nummern in Kreisen (`.form__legend-nr`, `.wc__q-nr`) haben mindestens 16px (1rem), liegen also noch unter den 17px aus Abschnitt 8. Kleiner sind nur einzelne Symbolzeichen in Icon-Kreisen (+, ✓, !, i; 0.75 bis 0.95rem), die keinen Lesetext tragen.
- `.card` deklariert `transform` im Übergang, setzt aber keinen Transform-Hover.
