# KONZEPT 60+ – Prototyp Startseite (Arbeitstitel)

Statischer HTML/CSS/Vanilla-JS-Prototyp. Kein Build, keine Frameworks, keine externen CDNs oder Webfonts (Systemschriften). Alle Inhalte sind **Beispieldaten**; Telefonnummer `0211 000 000 00`, Adresse und Domain `example.org` sind Platzhalter (im Code mit `BEISPIEL` / `data-placeholder` markiert).

## Lokal starten

```bash
cd konzept60-prototyp
python3 -m http.server 8000
# → http://localhost:8000
```

(Ein Server ist nötig, damit `data/*.json` geladen wird. Ohne Server bzw. ohne JS funktioniert die Seite trotzdem – mit dem HTML-Fallback.)

## Struktur

```
index.html              Startseite – vollständiges HTML inkl. Header/Footer (funktioniert ohne JS)
partials/header.html    Referenzkopie Header  → header.php   (wird NICHT per JS geladen)
partials/footer.html    Referenzkopie Footer  → footer.php
tools/sync-partials.py  erzeugt partials/* aus index.html neu (Marker BEGIN/END partial:…)
assets/css/tokens.css   Design-Tokens (CSS-Variablen)  → theme.json
assets/css/base.css     Reset, Typografie, Fokus, Skip-Link, Hilfsklassen
assets/css/layout.css   Container, Sektionen, Header, Hero, Raster, Footer
assets/css/components.css BEM-Komponenten: .btn, .card, .step, .form-field, .choice, .notice, .article-card …
assets/js/no-js.js      setzt sofort html.js (Mobilmenü klappt nur mit JS zu)
assets/js/main.js       Mobilnavigation, Themen/Regionen aus JSON, Vorauswahl, Formular-Simulation
assets/img/             hero-garten.png (Original), -800/-1600 als WebP + JPG-Fallback
data/themen.json        6 Themenbereiche (slug, titel, kurztext, beispiele[], icon)
data/regionen.json      Regionen (slug, name) – beliebig erweiterbar
_headers                Cloudflare Pages: Security-Header (inkl. strikter CSP) + Cache-Regeln
screenshots/            Test-Screenshots (Playwright)
```

### Entscheidungen

- **Header/Footer direkt in `index.html`**, nicht per JS-Include: vollständig ohne JS, SEO- und a11y-sicher. `partials/` sind reine Referenzkopien für das Theme und werden per `tools/sync-partials.py` aktuell gehalten.
- **Themen-Karten stehen im HTML** (später serverseitig aus der Taxonomie). `main.js` rendert sie aus `data/themen.json` mit identischem Markup neu und befüllt die Selects (Themen, Regionen). Schlägt das Laden fehl, bleibt der HTML-Fallback.
- **Formular sendet nichts**: kein `fetch`, keine Speicherung. Eigene Validierung (`novalidate` wird erst per JS gesetzt; ohne JS greift die native HTML-Validierung). Fehler mit `aria-invalid`, `aria-describedby`, Fehlerzusammenfassung und Fokus aufs erste Fehlerfeld.
- **Icons**: selbst gezeichnete Inline-SVG-Symbole (Sprite am Anfang von `<body>`), Referenz über `icon`-Schlüssel in `themen.json`.
- **Keine Inline-Scripts/-Styles** (außer JSON-LD, das kein ausführbares Script ist) → CSP ohne `unsafe-inline`.

## Mapping HTML → WordPress (eigenes Theme)

| Prototyp | WordPress |
|---|---|
| `tokens.css` | `theme.json` (`settings.color.palette`, `typography.fontSizes`, `spacing`) |
| `base/layout/components.css` | `style.css` bzw. per `wp_enqueue_style()` in gleicher Reihenfolge |
| Header-Block / `partials/header.html` | `header.php` (`wp_head()`, `wp_nav_menu('primary')`) |
| Footer-Block / `partials/footer.html` | `footer.php` (`wp_footer()`, Regionen via `get_terms('region')`) |
| `index.html` Sektionen | `front-page.php` mit `get_template_part()` je Sektion |
| `.card` Thema | `template-parts/card-thema.php` (Schleife über `get_terms('themenbereich')`) |
| `.article-card` | `template-parts/card-artikel.php` (`WP_Query`, 3 neueste Beiträge = Ratgeber) |
| Formular | eigener Handler über `admin-post.php` (Nonce, Sanitizing) oder Formular-Plugin → legt `anfrage` an |
| `main.js` | `wp_enqueue_script(..., ['strategy' => 'defer'])`; Daten per `wp_localize_script` oder REST |

**Custom Post Types**

- `anbieter` – gewerbliche Dienstleister (nicht öffentlich: `public => false`, `show_ui => true`), Meta: Qualifikationen/Nachweise, Prüfstatus
- `helfer` – private Helfer (nicht öffentlich), Meta: Verfügbarkeit, Prüfstatus
- `anfrage` – eingehende Anliegen (nicht öffentlich), Meta: Wer sucht, Kontakt, Rückrufwunsch, Einwilligung + Zeitstempel, Bearbeitungsstatus

**Taxonomien** (jeweils allen drei CPTs zugeordnet)

- `themenbereich` – Slugs wie in `data/themen.json`; Term-Meta `beispiele`, `icon`
- `region` – Slugs wie in `data/regionen.json`; hierarchisch möglich (Kreis › Stadt)

## Offene Punkte

- Impressum, Datenschutz, echte Telefonnummer/Adresse, Domain in OG/JSON-LD/Canonical.
- Rechtliche Prüfung der Einwilligungstexte (Weitergabe an Anbieter).
- Serifenschrift für Überschriften ist ein System-Stack (Iowan/Palatino/Georgia) – je nach System unterschiedlich; ggf. lokal gehostete Webfont ergänzen.
- `_headers`: CSP vor Livegang gegen tatsächliche Einbindungen (Analytics, Formulardienst) prüfen.
