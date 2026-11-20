# KONZEPT 60+ – statischer Prototyp (Arbeitstitel)

Statischer HTML/CSS/Vanilla-JS-Prototyp eines kostenlosen, **persönlichen** Vermittlungsportals für Menschen ab 60 und Angehörige. Keine Frameworks, keine externen Ressourcen (Source Serif 4 lokal + Systemschrift), keine Datenübertragung: Formulare werden nur simuliert (kein `fetch`, kein Storage, keine Cookies). Alle Inhalte sind **Beispieldaten**; Telefonnummer `0211 000 000 00` ist als „Demo“ gekennzeichnet, Domain `example.org` ist ein Platzhalter (Kommentare in `<head>`/JSON-LD).

## Lokal starten

```bash
python3 tools/build.py          # nur nötig nach Änderungen an templates/, partials/, data/
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
| `/ratgeber/` | `ratgeber/index.html` | `templates/ratgeber.html` („In Vorbereitung“) |
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
```

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
assets/js/main.js          Mobilmenü, Vorauswahl, abhängige Leistungen, Validierung, Simulationen
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

**Taxonomien:** `themenbereich` (Slugs/Term-Meta wie `data/themen.json`), `region` (wie `data/regionen.json`, hierarchisch möglich).

## Offene Punkte

- Impressum und Datenschutz ausformulieren und **rechtlich prüfen** lassen (inkl. Art. 9 DSGVO bei Gesundheitsangaben im Freitext, Ablauf der Weitergabe-Zustimmung, Double-Opt-in Newsletter).
- Echte Telefonnummer, Erreichbarkeit, Domain (Canonical, OG, JSON-LD), ggf. Adresse/Logo im JSON-LD.
- Ob Anbieterprofile später öffentlich sichtbar sind („Veröffentlichung“) oder nur intern genutzt werden, ist inhaltlich zu klären.
- Formular-Backend (Spam-Schutz, Bestätigungsmail) und CSP vor Livegang gegen tatsächliche Einbindungen prüfen.
