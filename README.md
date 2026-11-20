# KONZEPT 60+ – statischer Prototyp (Arbeitstitel)

Statischer HTML/CSS/Vanilla-JS-Prototyp eines kostenlosen, **persönlichen** Vermittlungsportals für Menschen ab 60 und Angehörige. Keine Frameworks, keine externen Ressourcen (Source Serif 4 lokal + Systemschrift), keine Datenübertragung: Formulare werden nur simuliert (kein `fetch`, kein Storage, keine Cookies). Alle Inhalte sind **Beispieldaten**; Telefonnummer `0211 000 000 00` ist als „Demo“ gekennzeichnet, Domain `example.org` ist ein Platzhalter (Kommentare in `<head>`/JSON-LD).

## Lokal starten

```bash
python3 tools/build.py          # nur nötig nach Änderungen an templates/, partials/, data/, content/
python3 -m http.server 8000     # → http://localhost:8000
# oder mit echten Headern/404-Verhalten wie im Deployment:
npx wrangler dev                # → http://localhost:8787
```

Alle Pfade sind **wurzelrelativ** (`/assets/…`, `/themen/…`) – die Seiten brauchen deshalb einen Server (kein `file://`). Das ist nötig, damit `404.html` unter beliebigen Pfaden funktioniert, und entspricht WordPress (absolute URLs).

## Seiten

| URL | Datei (generiert) | Vorlage |
|---|---|---|
| `/` | `index.html` | `templates/index.html` |
| `/themen/` | `themen/index.html` | `templates/themen.html` |
| `/themen/<slug>/` (6×) | `themen/<slug>/index.html` | `templates/thema.html` + `data/themen.json` |
| `/fuer-anbieter/` | `fuer-anbieter/index.html` | `templates/fuer-anbieter.html` |
| `/ratgeber/` | `ratgeber/index.html` | `templates/ratgeber.html` (Übersicht, Karten aus `content/ratgeber/`) |
| `/ratgeber/<slug>/` (4×) | `ratgeber/<slug>/index.html` | `templates/ratgeber-beitrag.html` + `content/ratgeber/<slug>.md` |
| `/impressum/`, `/datenschutz/` | `…/index.html` | Platzhalter-Gliederung, **muss rechtlich geprüft werden** |
| unbekannte Pfade | `404.html` | `wrangler.jsonc` → `assets.not_found_handling: "404-page"` |

Cloudflare Workers Assets liefert `/themen/slug/` aus `themen/slug/index.html` (`/themen/slug` → 307 auf die Variante mit Slash).

**Entscheidung Navigation „Themen“:** verweist auf die eigene Übersichtsseite `/themen/` (entspricht später dem Taxonomie-Archiv). Die Startseite behält zusätzlich den Abschnitt `#themen`. Aktiver Menüpunkt: `aria-current="page"` (Übersicht) bzw. `aria-current="true"` (Unterseiten eines Bereichs).

## Build (`tools/build.py`, nur Python-Standardbibliothek)

```
templates/_layout.html     Grundgerüst: <head>, Skip-Link, <main>, Skripte
templates/<seite>.html     Seiteninhalt; Kopf-Kommentar <!--meta title/description/nav -->
partials/icons.html        SVG-Sprite
partials/header.html       Kopf inkl. Hauptnavigation (Platzhalter nav:… → aria-current)
partials/footer.html       Fuß inkl. Themen-/Regionslisten
data/themen.json           slug, titel, kurztext, einleitung, beispiele[], leistungen[] (5–8), angebote[], hinweis?, bild{datei, alt}
data/regionen.json         slug, name
content/ratgeber/<slug>.md Ratgeber-Beiträge: Frontmatter + Markdown-Teilmenge (s. u.)
data/ratgeber.json         GENERIERT: gesammelte Frontmatter + Anreißer + URL je Beitrag
```

### Ratgeber-Beiträge (`content/ratgeber/*.md`)

Frontmatter (`---` … `---`, je Zeile `feld: wert`, Wert ab dem ersten Doppelpunkt):

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `titel`, `slug` | ja | H1/`<title>`; Slug = Dateiname = URL `/ratgeber/<slug>/` |
| `thema` | ja | Slug aus `data/themen.json` (Kicker-Link, CTA-Vorauswahl `/?thema=<thema>#anfrage`, „Passender Ratgeber“ auf der Themenseite) |
| `bild`, `bild_alt` | ja | Beitragsbild `assets/img/ratgeber/<bild>-800.webp/-1400.webp/-1400.jpg` (3:2) + Teaser `<bild>-teaser-600.webp` (4:3) |
| `stand` | ja | sichtbarer Stand („November 2026“) unter dem Titel und im Hinweis-Kasten |
| `geaendert` | ja | Änderungsdatum `JJJJ-MM-TT` (`<time datetime>`, `article:modified_time`, JSON-LD `dateModified`) |
| `inline_bild`, `inline_bild_alt`, `inline_nach_ueberschrift` | nein | zweites Bild im Text (lazy, 3:2) nach der ersten Liste des `##`-Abschnitts, dessen Überschrift so beginnt |
| `tabelle_beschriftung` | nein | `<caption>` (visuell verborgen) für Tabellen |

Markdown-Teilmenge (eigener Parser in `build.py`, HTML wird escaped): `##`/`###` Überschriften (`##` erhalten ids → automatisches Inhaltsverzeichnis), Absätze, `- ` Listen, `**fett**`, `> ` Zitat-Blöcke (mehrere Absätze über `>`-Leerzeile → Hinweis-Box; beginnt der Text mit „**Wichtig**“ in Terrakotta, sonst Salbei), Pipe-Tabellen mit Trennzeile (→ `<table>` mit `<th scope="col">`, mobil als Label/Wert-Karten über `data-label`). Anreißer und Meta-Description = erster Absatz, an Wortgrenze auf ~160/155 Zeichen gekürzt. Der Text wird **wörtlich** übernommen; Rahmen (Breadcrumb, Stand, Hinweis-Kasten, CTA, „Weitere Beiträge“) kommt aus der Vorlage.

Bilder: `python3 tools/bilder.py --ratgeber <ordner>` erzeugt aus `<bild>.png/.jpg` die Größen oben (mittiger Zuschnitt; Teaser nur für Titelbilder). Originale danach löschen.

Reihenfolge: neueste zuerst nach `geaendert` (bei gleichem Datum Dateiname absteigend). Die Startseite zeigt die drei neuesten Beiträge, die Übersicht `/ratgeber/` alle ohne Begrenzung (Raster 1 → 2 → 4 Spalten), „Weitere Beiträge“ alle übrigen.

**Themenfilter `/ratgeber/`:** `ratgeber_filter()` in `build.py` erzeugt „Alle“ + nur Themenbereiche mit mindestens einem Beitrag (Reihenfolge `data/themen.json`, mit Anzahl) als `<button type="button" aria-pressed>` in einer Gruppe „Beiträge nach Thema filtern“; Karten tragen `data-thema`. `main.js` (7.) blendet Karten per `hidden` ein/aus, meldet die Anzahl in einer `aria-live`-Zeile und schreibt `?thema=<slug>` per `history.replaceState` in die Adresszeile – Links wie `/ratgeber/?thema=technik-sicherheit` filtern beim Laden (unbekannte/leere Themen → „Alle“). Ohne JS ist die Leiste ausgeblendet (`.js .filter`), alle Karten sind sichtbar. Aktiv = Navy-Fläche **plus** Häkchen. Die Übersicht hat bewusst keine Breadcrumb (Hauptnavigation markiert „Ratgeber“; `page-header--plain`); Beitragsseiten behalten sie. Gibt es zum Thema eines Beitrags weitere Beiträge, erscheint unter „Weitere Beiträge“ der Link „Weitere Beiträge zum Thema …“ auf die gefilterte Übersicht (derzeit je Thema nur ein Beitrag → nicht ausgegeben).

Titelbild später ersetzen (zuletzt `treppenlift-einbau`, November 2026): neues Original im Seitenverhältnis 3:2, mind. 1400 px breit, als `assets/img/ratgeber-original/<bild>.png` ablegen (Dateiname = Feld `bild`), `python3 tools/bilder.py --ratgeber assets/img/ratgeber-original` ausführen (überschreibt alle Größen inkl. Teaser), `bild_alt` im Frontmatter an das neue Motiv anpassen, `geaendert` pflegen, `python3 tools/build.py` ausführen und `assets/img/ratgeber-original/` wieder löschen.

Platzhalter `{{name}}`; unbekannte Platzhalter brechen den Build ab, ebenso fehlende Bilder oder Datenfelder. **Die generierten HTML-Dateien werden eingecheckt** – das Deployment braucht keinen Build. Generierte Dateien tragen den Kommentar „GENERIERT von tools/build.py – nicht direkt bearbeiten“. `templates/`, `tools/`, `partials/` und `data/` stehen in `.assetsignore` (werden nicht ausgeliefert; JS lädt kein JSON mehr).

`tools/bilder.py <ordner>` (Pillow) erzeugt aus Originalen `<slug>.png` die Themenbilder: Zuschnitt 4:5 (mittig, leicht nach oben gewichtet), WebP 480/800 (q78) + JPG 800 nach `assets/img/themen/`. Originale gehören nicht ins Repo.

## Weitere Struktur

```
assets/css/tokens.css      Design-Tokens  → theme.json
assets/css/base.css        Reset, Typografie, Fokus, Hilfsklassen
assets/css/layout.css      Container, Sektionen, Header, Hero, Raster, Footer
assets/css/components.css  BEM-Komponenten (.card, .personal, .relatives, .benefits, .path-card,
                           .page-header, .breadcrumb, .topic-*, .form__section, .notice--*, .demo-label …)
assets/js/no-js.js         setzt html.js (Mobilmenü klappt nur mit JS zu)
assets/js/main.js          Mobilmenü, Vorauswahl, abhängige Leistungen, Validierung, Simulationen, Ratgeber-Themenfilter
_headers                   Security-Header (strikte CSP ohne unsafe-inline) + Cache-Regeln
```

### Entscheidungen

- **Kein Inline-JS/-CSS** (außer JSON-LD) → CSP ohne `unsafe-inline`; geprüft unter `wrangler dev` mit echten Headern.
- **Vorauswahl:** Links wie `/?thema=pflege-betreuung#anfrage`, `/?fuer=angehoerige#anfrage`, `/?region=wesel#anfrage` funktionieren von jeder Seite (ohne JS: normale Navigation zum Formular). `main.js` übernimmt die Parameter und entfernt sie danach aus der Adresszeile; auf der Startseite selbst werden solche Links ohne Neuladen abgefangen.
- **Leistungen je Kategorie** werden serverseitig (Build) als Checkbox-Gruppen gerendert, standardmäßig `hidden disabled`; JS blendet die passende ein. Ohne JS genügt die Pflicht-Beschreibung.
- **Formular-Validierung** (gemeinsamer Baustein für Anfrage und Registrierung): Fehler je Feld (`aria-invalid`, `aria-describedby`), Fehlerzusammenfassung mit Sprunglinks, Fokus aufs erste Fehlerfeld, Live-Aktualisierung nach dem ersten Absenden. Regel „Telefon **oder** E-Mail“ als eigene Gruppe.
- **Einwilligungen getrennt:** Pflicht-Checkbox nur für die Bearbeitung durch das Team; Weitergabe an Anbieter erfolgt erst nach späterer ausdrücklicher Zustimmung (Infokasten, keine Checkbox); Newsletter separat, freiwillig, nicht vorausgewählt.
- **Anbieter-Registrierung:** Auswahl gewerblich/privat blendet die passenden Felder ein (ohne JS: beide sichtbar; typabhängige Pflichtfelder prüft nur JS, damit native Validierung nicht beide Bereiche verlangt).

## Mapping HTML → WordPress (eigenes Theme)

| Prototyp | WordPress |
|---|---|
| `tokens.css` | `theme.json` (`settings.color.palette`, `typography.fontSizes`, `spacing`) |
| `base/layout/components.css` | `style.css` bzw. `wp_enqueue_style()` in gleicher Reihenfolge |
| `templates/_layout.html` (`<head>`-Teil) + `partials/header.html` | `header.php` (`wp_head()`, `wp_body_open()`, `wp_nav_menu('primary')`; aktiver Punkt über `current-menu-item` → `aria-current`) |
| `partials/icons.html` | `template-parts/icon-sprite.php` |
| `partials/footer.html` (+ Ende von `_layout.html`) | `footer.php` (`wp_footer()`, Listen via `get_terms('themenbereich')` / `get_terms('region')`) |
| `templates/index.html` | `front-page.php` mit `get_template_part()` je Sektion |
| `templates/thema.html` | `taxonomy-themenbereich.php` (Term + Term-Meta aus `themen.json`) |
| `templates/themen.html` | `page-themen.php` bzw. Archiv der Taxonomie |
| `templates/fuer-anbieter.html` | `page-fuer-anbieter.php` |
| `templates/ratgeber.html` | `home.php` (Beitragsarchiv) |
| `templates/ratgeber-beitrag.html` | `single.php` (Breadcrumb, `the_content()`, Inhaltsverzeichnis per Filter auf `the_content` aus den H2) |
| Beitragskarte (`article_card()` in build.py) | `template-parts/card-artikel.php` (`the_post_thumbnail('teaser-4-3')`, `get_the_excerpt()`) |
| „Passender Ratgeber“ auf Themenseiten | `WP_Query` mit `tax_query` `themenbereich` = aktueller Term |
| `templates/impressum.html`, `datenschutz.html` | `page-impressum.php`, `page-datenschutz.php` (oder Standard-`page.php`) |
| `templates/404.html` | `404.php` |
| Themenkarte (`theme_card()` in build.py) | `template-parts/card-thema.php` |
| Block „Persönliche Vermittlung“ | `template-parts/persoenlich.php` |
| Formulare | eigener Handler über `admin-post.php` (Nonce, Sanitizing) oder Formular-Plugin |
| `main.js` | `wp_enqueue_script(..., ['strategy' => 'defer'])` |

**Custom Post Types** (nicht öffentlich: `public => false`, `show_ui => true`)

- `anbieter` – gewerbliche Dienstleister. Meta: Firma, Ansprechpartner, Einsatzorte, Nachweise, Prüfstatus
- `helfer` – private Helfer. Meta: Hilfeangebote, Verfügbarkeit, Prüfstatus
- `anfrage` – eingehende Anliegen. Meta: Für wen, Leistungen, PLZ/Ort, Kontakt, Rückrufwunsch, Einwilligung Bearbeitung (+ Zeitstempel), Newsletter-Einwilligung (separat), Weitergabe-Zustimmungen je Anbieter, Bearbeitungsstatus

**Ratgeber = Standard-Beiträge (`post`)** – Mapping `content/ratgeber/*.md` / `data/ratgeber.json` → WordPress:

| Frontmatter | WordPress |
|---|---|
| `titel` | `post_title` |
| `slug` | `post_name` (Permalink `/ratgeber/%postname%/`) |
| Markdown-Text | `post_content` (Gutenberg-Blöcke: Überschrift, Absatz, Liste, Tabelle; Zitat-Block → Block-Stil „Hinweis“) |
| `thema` | Term der Taxonomie `themenbereich` (für `post` registriert; ersetzt die Kategorie) |
| `bild`, `bild_alt` | Beitragsbild (`_thumbnail_id`, Alt-Text der Mediendatei); Größen `ratgeber-1400` (3:2), `teaser-4-3` (600×450) |
| `inline_bild`, `inline_bild_alt` | Bild-Block im Inhalt (`loading="lazy"`) |
| `stand`, `geaendert` | `post_modified` (Anzeige „Stand: “ + `get_the_modified_date('F Y')`) |
| Anreißer | `post_excerpt` (oder automatisch gekürzt) |
| Hinweis-Kasten, CTA, „Weitere Beiträge“ | fest in `single.php` (Vorauswahl über `themenbereich`-Slug) |

**Taxonomien:** `themenbereich` (Slugs/Term-Meta wie `data/themen.json`), `region` (wie `data/regionen.json`, hierarchisch möglich).

## Offene Punkte

- Impressum und Datenschutz ausformulieren und **rechtlich prüfen** lassen (inkl. Art. 9 DSGVO bei Gesundheitsangaben im Freitext, Ablauf der Weitergabe-Zustimmung, Double-Opt-in Newsletter).
- Domain (Canonical, OG, JSON-LD), ggf. Adresse/Logo im JSON-LD.
- Ratgeber: `datePublished`/Autor im JSON-LD erst mit echten Daten; Beträge (Entlastungsbetrag, Hausnotruf-Zuschuss, Treppenlift: Pflegekassen-Zuschuss, KfW-Status) vor Veröffentlichung fachlich prüfen und `stand`/`geaendert` pflegen.
- Treppenlift-Titelbild: Original nur 1199 px breit → `-1400`-Varianten sind leicht hochskaliert; bei Gelegenheit Original ≥ 1400 px nachliefern.
- Ob Anbieterprofile später öffentlich sichtbar sind („Veröffentlichung“) oder nur intern genutzt werden, ist inhaltlich zu klären.
- Formular-Backend (Spam-Schutz, Bestätigungsmail) und CSP vor Livegang gegen tatsächliche Einbindungen prüfen.
