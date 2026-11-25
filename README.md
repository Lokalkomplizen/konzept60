# Konzept 60+ – statischer Prototyp (Arbeitstitel)

Statischer HTML/CSS/Vanilla-JS-Prototyp eines kostenlosen, **persönlichen** Vermittlungsportals für Menschen ab 60 und Angehörige. Keine Frameworks, keine externen Ressourcen (Source Serif 4 lokal + Systemschrift), keine Datenübertragung (einzige `fetch`-Aufrufe: lesender Abruf der statischen Dateien `assets/data/anbieter.json` und `assets/data/assistent.json`): Formulare senden nichts selbst: sie öffnen E-Mail-Programm oder WhatsApp mit vorbefülltem Text (kein `fetch`, kein Storage, keine Cookies). Alle Inhalte sind **Beispieldaten**; es gibt keine eigene Telefonnummer (Rückruf erfolgt durch uns), Domain `example.org` ist ein Platzhalter (Kommentare in `<head>`/JSON-LD).

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
| `/` | `index.html` | `templates/index.html` (Startseite A–F, Relaunch 3.2: Hero mit Suche und Chips, Themen, Ablauf mit Rückfall „Bei uns melden“, Ratgeber und Werkzeuge, Vertrauen; Spezifikation `docs/relaunch/startseite-ia.md`) |
| `/anfrage/` | `anfrage/index.html` | `templates/anfrage.html` (Anfrageformular „Bei uns melden“, bis 3.1 auf der Startseite unter `#anfrage`) |
| `/so-funktioniert-es/` | `so-funktioniert-es/index.html` | `templates/so-funktioniert-es.html` (Ablauf selbst suchen und persönliche Vermittlung, Für Angehörige, Bildband, Vertrauen, Drei Wege, Hinweis für Anbieter) |
| `/themen/` | `themen/index.html` | `templates/themen.html` |
| `/hilfe-finden/` | `hilfe-finden/index.html` | `templates/hilfe-finden.html` (Suche + Assistent + sechs Themen; Ziel des Kopf-Knopfs „Anbieter suchen“, der Chips und der Hero-Suche der Startseite) |
| `/themen/<slug>/` (6×) | `themen/<slug>/index.html` | `templates/thema.html` + `data/themen.json` |
| `/fuer-anbieter/` | `fuer-anbieter/index.html` | `templates/fuer-anbieter.html` |
| `/mein-alltag/` | `mein-alltag/index.html` | `templates/mein-alltag.html` (Übersicht der Alltags-Werkzeuge) |
| `/mein-alltag/checklisten/` | `mein-alltag/checklisten/index.html` | `templates/mein-alltag-checklisten.html` + `data/checklisten.json` (4 Listen, nur allgemeine Punkte ohne Beträge/Fristen) |
| `/mein-alltag/wohnungs-check/` | `mein-alltag/wohnungs-check/index.html` | `templates/mein-alltag-wohnungs-check.html` + `data/wohnungs-check.json` (12 Fragen, Priorität 1 = Sturzgefahr) |
| `/mein-alltag/pflegegrad-rechner/` | `mein-alltag/pflegegrad-rechner/index.html` | `templates/mein-alltag-pflegegrad-rechner.html` + `data/pflegegrad/*.json` (eingebettet), Logik `assets/js/pflegegrad/`; Konzept: `docs/pflegegradrechner-konzept.md` |
| `/ratgeber/` | `ratgeber/index.html` | `templates/ratgeber.html` (Übersicht, Karten aus `content/ratgeber/`) |
| `/ratgeber/<slug>/` (4×) | `ratgeber/<slug>/index.html` | `templates/ratgeber-beitrag.html` + `content/ratgeber/<slug>.md` |
| `/impressum/`, `/datenschutz/` | `…/index.html` | Platzhalter-Gliederung, **muss rechtlich geprüft werden** |
| unbekannte Pfade | `404.html` | `wrangler.jsonc` → `assets.not_found_handling: "404-page"` |

Cloudflare Workers Assets liefert `/themen/slug/` aus `themen/slug/index.html` (`/themen/slug` → 307 auf die Variante mit Slash).

**Name:** „Konzept 60+“ ist ein Arbeitstitel und steht zentral in `tools/build.py` (`SITE_NAME`); Templates/Partials nutzen `{{site_name}}`, Meta-Titel, Open Graph und JSON-LD folgen automatisch. Textlogo = Serif + Akzentpunkt (`.logo__text`).

**Navigation (Relaunch 3.2):** „Hilfe finden“ (`/hilfe-finden/`), „Ratgeber“ (`/ratgeber/`), „Mein Alltag“ (`/mein-alltag/`), „So funktioniert es“ (`/so-funktioniert-es/`), rechts der Knopf „Anbieter suchen“ (→ `/hilfe-finden/`, ab 48em; darunter übernimmt die Handy-Leiste). Die Topbar (ab 48em) trägt den Rückfallweg „Lieber persönlich? Bei uns melden“ (→ `/anfrage/`). „Für Anbieter“ und „Bei uns melden“ stehen im Footer. `NAV_KEYS` in `build.py`: `hilfe`, `ratgeber`, `alltag`, `so`, `suche`; `/themen/` und die Themenseiten gehören zu „Hilfe finden“ (`nav: hilfe`, Unterseiten mit `nav_level: section`). Bestehende URLs (`/themen/…`) sind unverändert. Aktiver Menüpunkt: `aria-current="page"` (Übersicht) bzw. `aria-current="true"` (Unterseiten eines Bereichs); auf `/hilfe-finden/` trägt auch der Knopf „Anbieter suchen“ `aria-current="page"`.

**Handy-Leiste:** unter 48em eine feste Leiste unten mit „Anbieter suchen“ (`MOBIL_LEISTE` in `build.py`, `body.hat-leiste` mit Innenabstand in Leistenhöhe `--leiste-hoehe`, damit nichts verdeckt wird). Nicht auf `/hilfe-finden/`; ausgeblendet, solange ein Eingabefeld den Fokus hat, und auf der Startseite, solange die Hero-Suche sichtbar ist (`main.js` 14., IntersectionObserver).

**Alte Startseiten-Adressen:** `assets/js/weiterleitung.js` (nur Startseite, im `<head>` ohne `defer`, `location.replace`) leitet `/#anfrage` und `/?thema=…` usw. nach `/anfrage/?…`, `/#assistent` und `/?anliegen=…` nach `/hilfe-finden/?…`, `/#so-funktionierts`, `/#angehoerige`, `/#fuer-anbieter`, `/#drei-wege` nach `/so-funktioniert-es/(#…)`. Ohne JS bleibt man auf der Startseite; `#anfrage` ist dort der Rückfall-Kasten mit Link auf `/anfrage/`. Wo jeder alte Startseitentext jetzt steht: `docs/relaunch/startseite-textabgleich.md`.

## Build (`tools/build.py`, nur Python-Standardbibliothek)

```
templates/_layout.html     Grundgerüst: <head>, Skip-Link, <main>, Skripte
templates/<seite>.html     Seiteninhalt; Kopf-Kommentar <!--meta title/description/nav -->
partials/icons.html        SVG-Sprite
assets/img/illus.svg       Illustrations-Icons (illu-…, 96×96, Stil der Trust-Icons; extern per <use>, ?v=Hash vom Build)
partials/header.html       Kopf inkl. Hauptnavigation (Platzhalter nav:… → aria-current)
partials/footer.html       Fuß inkl. Themen-/Regionslisten
data/themen.json           slug, titel, kurztext, einleitung, beispiele[], leistungen[] (5–8), angebote[], hinweis?, bild{datei, alt, hoehe?} (hoehe: abweichende Bildhöhe bei 800 px Breite, Standard 1000)
data/regionen.json         slug, name
content/ratgeber/<slug>.md Ratgeber-Beiträge: Frontmatter + Markdown-Teilmenge (s. u.)
data/ratgeber.json         GENERIERT: gesammelte Frontmatter + Anreißer + URL je Beitrag
```

### Ratgeber-Beiträge (`content/ratgeber/*.md`)

Frontmatter (`---` … `---`, je Zeile `feld: wert`, Wert ab dem ersten Doppelpunkt):

| Feld | Pflicht | Bedeutung |
|---|---|---|
| `titel`, `slug` | ja | H1/`<title>`; Slug = Dateiname = URL `/ratgeber/<slug>/` |
| `thema` | ja | Slug aus `data/themen.json` (Kicker-Link, CTA-Vorauswahl `/anfrage/?thema=<thema>`, „Passender Ratgeber“ auf der Themenseite) |
| `bild`, `bild_alt` | ja | Beitragsbild `assets/img/ratgeber/<bild>-800.webp/-1400.webp/-1400.jpg` (3:2) + Teaser `<bild>-teaser-600.webp` (4:3) |
| `stand` | ja | sichtbarer Stand („November 2026“) unter dem Titel und im Hinweis-Kasten |
| `geaendert` | ja | Änderungsdatum `JJJJ-MM-TT` (`<time datetime>`, `article:modified_time`, JSON-LD `dateModified`) |
| `inline_bild`, `inline_bild_alt`, `inline_nach_ueberschrift` | nein | zweites Bild im Text (lazy, 3:2) nach der ersten Liste des `##`-Abschnitts, dessen Überschrift so beginnt |
| `tabelle_beschriftung` | nein | `<caption>` (visuell verborgen) für Tabellen |
| `startseite` | nein | Position 1–6 im Ratgeber-Teil der Startseite; jede Zahl genau einmal (prüft `build.py`) |

Markdown-Teilmenge (eigener Parser in `build.py`, HTML wird escaped): `##`/`###` Überschriften (`##` erhalten ids → automatisches Inhaltsverzeichnis), Absätze, `- ` Listen, `**fett**`, `> ` Zitat-Blöcke (mehrere Absätze über `>`-Leerzeile → Hinweis-Box; beginnt der Text mit „**Wichtig**“ in Terrakotta, sonst Salbei), Pipe-Tabellen mit Trennzeile (→ `<table>` mit `<th scope="col">`, mobil als Label/Wert-Karten über `data-label`). Anreißer und Meta-Description = erster Absatz, an Wortgrenze auf ~160/155 Zeichen gekürzt. Der Text wird **wörtlich** übernommen; Rahmen (Breadcrumb, Stand, Hinweis-Kasten, CTA, „Weitere Beiträge“) kommt aus der Vorlage.

Bilder: `python3 tools/bilder.py --ratgeber <ordner>` erzeugt aus `<bild>.png/.jpg` die Größen oben (mittiger Zuschnitt; Teaser nur für Titelbilder). Originale danach löschen.

Reihenfolge: neueste zuerst nach `geaendert` (bei gleichem Datum Dateiname absteigend). Die Startseite zeigt die sechs Beiträge mit `startseite: 1–6` (in dieser Reihenfolge; unter 40em als kompakte Zeilen ohne Anreißer), die Übersicht `/ratgeber/` alle ohne Begrenzung (Raster 1 → 2 → 4 Spalten), „Weitere Beiträge“ alle übrigen.

**Themenfilter `/ratgeber/`:** `ratgeber_filter()` in `build.py` erzeugt „Alle“ + nur Themenbereiche mit mindestens einem Beitrag (Reihenfolge `data/themen.json`, mit Anzahl) als `<button type="button" aria-pressed>` in einer Gruppe „Beiträge nach Thema filtern“; Karten tragen `data-thema`. `main.js` (7.) blendet Karten per `hidden` ein/aus, meldet die Anzahl in einer `aria-live`-Zeile und schreibt `?thema=<slug>` per `history.replaceState` in die Adresszeile – Links wie `/ratgeber/?thema=technik-sicherheit` filtern beim Laden (unbekannte/leere Themen → „Alle“). Ohne JS ist die Leiste ausgeblendet (`.js .filter`), alle Karten sind sichtbar. Aktiv = Navy-Fläche **plus** Häkchen. Die Übersicht hat bewusst keine Breadcrumb (Hauptnavigation markiert „Ratgeber“; `page-header--plain`); Beitragsseiten behalten sie. Gibt es zum Thema eines Beitrags weitere Beiträge, erscheint unter „Weitere Beiträge“ der Link „Weitere Beiträge zum Thema …“ auf die gefilterte Übersicht (derzeit je Thema nur ein Beitrag → nicht ausgegeben).

Titelbild später ersetzen (zuletzt `treppenlift-einbau`, November 2026): neues Original im Seitenverhältnis 3:2, mind. 1400 px breit, als `assets/img/ratgeber-original/<bild>.png` ablegen (Dateiname = Feld `bild`), `python3 tools/bilder.py --ratgeber assets/img/ratgeber-original` ausführen (überschreibt alle Größen inkl. Teaser), `bild_alt` im Frontmatter an das neue Motiv anpassen, `geaendert` pflegen, `python3 tools/build.py` ausführen und `assets/img/ratgeber-original/` wieder löschen.

Platzhalter `{{name}}`; unbekannte Platzhalter brechen den Build ab, ebenso fehlende Bilder oder Datenfelder. **Die generierten HTML-Dateien werden eingecheckt** – das Deployment braucht keinen Build. Generierte Dateien tragen den Kommentar „GENERIERT von tools/build.py – nicht direkt bearbeiten“. `templates/`, `tools/`, `partials/` und `data/` stehen in `.assetsignore` (werden nicht ausgeliefert; JS lädt kein JSON mehr).

`tools/bilder.py <ordner>` (Pillow) erzeugt aus Originalen `<slug>.png` die Themenbilder: Zuschnitt 4:5 (mittig, leicht nach oben gewichtet), WebP 480/800 (q78) + JPG 800 nach `assets/img/themen/`. Originale gehören nicht ins Repo.

## Anbieter-Trefferliste (Anfrageformular, Schritt 3)

Reihenfolge der Anfrage (mit JS): 1 Anliegen, 2 Wo, 3 Trefferliste, 4 Beschreibung, 5 Kontakt, 6 Einwilligung, 7 Prüfen/Senden; ohne JS entfällt die Liste. Nach „2 Wo“ zeigt die Anfrage auf `/anfrage/` (nur mit JS) „Passende Anbieter in Ihrer Nähe“, bevor Kontaktdaten abgefragt werden. Filter: Themenbereich + Ort (Treffer im Ort zuerst, dann Einzugsgebiet), zur gewählten Leistung passende Kategorien zuerst; zunächst 6 Karten, „Weitere anzeigen“. Jede Karte hat einen direkten „Anrufen“-Button (tel:), einen Textlink „Bewertungen bei Google ansehen“ (Google Maps, keine Sterne/Bewertungen kopiert) und ein eigenes Auswahl-Label (Karte ist kein Gesamt-Label). Mehrfachauswahl → Kontaktfenster (drucken/weiterleiten) (`<dialog>`: Anrufen, E-Mail, Website, Drucken, Weiterleiten per Web Share bzw. E-Mail/WhatsApp/Kopieren). Die Auswahl lebt nur im Speicher der Seite. Dieselbe Liste (Baustein `AnbieterListe.baue()` in `anbieter.js`, ein gemeinsamer Dialog) erscheint auch im Ergebnis des Assistenten (`/hilfe-finden/`, Ziel „praktisch/Angehörige“) unter dem Ergebnistext; ohne Treffer oder ohne Ort entfällt die Liste, es bleibt der Weg zur Anfrage. „Lieber persönlich vermitteln lassen“ führt im Formular unverändert zu den Kontaktdaten (Schritt 5); ohne JS bleibt der Schritt verborgen. Schrittnummern vergibt `schritte.js` mit JS neu (`data-nur-js`, `data-eigene-navigation`).

```
Excel (nicht im Repo) ──tools/kontakte.py──▶ data/anbieter.json + data/kategorie-zuordnung.json
                       data/anbieter.json ──tools/build.py──▶ assets/data/anbieter.json   (ausgeliefert, mit ?v=Hash)
assets/js/anbieter-logik.js   reine Filter-/Sortierlogik (Test: tests/anbieter-logik.test.js)
assets/js/anbieter.js         Liste + Dialog; lädt assets/data/anbieter.json erst beim Erreichen des Schritts (fetch, nur lesend)
```

- Konverter: `python3 tools/kontakte.py [PFAD.xlsx] [--modus echt|beispiel]` (braucht `openpyxl`; nur dieses Skript; Standardpfad `/mnt/project-files/kontaktliste/Konzept60plus_Kontaktliste_2026-11-23.xlsx`). Danach `python3 tools/build.py`.
- **`echt` (Standard, ausgeliefert):** nur Prüfstatus „ok“; Trägerart privat/ehrenamtlich entfällt; Ansprechpartner wird nie gelesen oder ausgegeben; E-Mail nur mit generischem lokalen Teil (info, kontakt, pflege …; sonst weggelassen); Klammerzusätze mit Personennamen und Einträge mit erkennbarem Personennamen (Vorname + Nachname) entfallen; Hinweise wie „(Quelle … prüfen)“ im Schwerpunkt entfernt; Einträge mit „2013“/„veraltet“ in Quelle/Schwerpunkt entfallen; Dubletten nach Name+Telefon+Thema+Stadt zusammengeführt; Einträge ohne jeden Kontaktweg entfallen.
- **`beispiel` (Option):** gleiche Verteilung, höchstens 5 je Thema×Stadt, erfundene Namen/Nummern (`0211 00000-NN`), nur `example.org`, `"beispiel": true`; die Liste zeigt dann „Beispieldaten: Namen und Nummern sind erfunden.“
- Zuordnung Kategorie-ID → Themenbereich und Leistung → Kategorie-IDs steht im Kopf von `tools/kontakte.py` (`ZUORDNUNG`, `LEISTUNGEN`) und wird als `data/kategorie-zuordnung.json` ausgegeben. `null` = nicht anzeigen (Beratung 09.x/10.x, Trauer 14.x, Haustiere 15.x, Heim/Wohnformen u. a.).
- Hinweis in Liste und Dialog: „Angaben aus öffentlich zugänglichen Quellen, Stand November 2026, ohne Gewähr.“ plus Link zu `/impressum/` (Korrektur/Entfernung); Datenschutz Abschnitt 2.6.
- Umschalten Beispiel ↔ echt: Konverter mit dem gewünschten `--modus` laufen lassen, `build.py` ausführen, beide JSON-Dateien und `assets/data/anbieter.json` einchecken.
- WordPress: `data/anbieter.json` entspricht dem CPT `anbieter` (Taxonomien `themenbereich` = `thema`, `region` = `stadt` + `einzugsgebiet`).
- E2E: `python3 -m http.server 8765 &  node tests/anbieter.e2e.js` (Playwright).

## Anliegen, Freitextsuche und Assistent (Relaunch 3.1)

Konzept: `docs/relaunch/konzept-assistent-suche.md`. Grundsatz: Der Besucher wählt seinen Anbieter selbst, „Bei uns melden“ ist der Rückfallweg. Die Umkreissuche (Konzept Abschnitt 4) ist **zurückgestellt**: Treffer = Stadt gleich oder Wohnort im Einzugsgebiet (`ortsGruppe`), keine Entfernungen, keine Radius-Knöpfe.

```
data/anliegen.json ──tools/build.py (load_anliegen prüft)──▶ assets/data/assistent.json (fetch, ?v=Hash)
data/anbieter.json ─────────────────────────────────────────▶ assets/data/anbieter.json (wie bisher)
assets/js/suche-logik.js     reine Suchlogik (Test: tests/suche-logik.test.js)
assets/js/anbieter-logik.js  + filtereAnliegen, zaehleAnliegen, hausbesuch, notizText (Test: tests/anbieter-logik.test.js)
assets/js/assistent.js       Oberfläche: Combobox, Schritte, Ergebnis, Notizzettel (/hilfe-finden/; auf der Startseite nur der Such-Einstieg [data-assistent-einstieg])
```

- **Anliegen-Katalog** `data/anliegen.json` (49 Anliegen): `id`, `titel`, `kurz?`, `thema`, `gruppe?` (z. B. `badezimmer` mit sechs Möglichkeiten), `kategorien` (**streng**: nur Anbieter mit genau diesen Kategorie-IDs, das Thema spielt keine Rolle; leer = Ratgeber-Anliegen), `leistungen` (Wortlaut aus `themen.json`, für die Vorauswahl im Formular), `verwandt`, `begriffe` (Synonyme, Umgangssprache, Mehrwort-Begriffe), `fragen` (Filterfragen + `ort`), `notizfragen`, `ratgeber` (Slugs), `werkzeug?` (Mein-Alltag-Werkzeug). Dazu `gruppen`, `haeufig` (Startauswahl), `startseite` (6–8 Chips „Häufig gesucht“ der Startseite: `titel`, `anliegen`, optional `vorwahl` mit `f-…`/`n-…`-Werten; `build.py` prüft Anliegen und Vorwahl) und `fragen` (je Frage `art: filter|notiz`, `titel`, `notiz` = Bezeichnung auf dem Notizzettel, `optionen` mit `kategorien`, `angebotsform` oder `begriffe` zur Vorbelegung aus dem Freitext). `build.py` bricht ab, wenn eine Leistung aus `themen.json` kein Anliegen hat, eine Kategorie ausgeblendet/unbekannt ist, ein Verweis nicht stimmt oder mehr als vier Fragen bis zur Liste nötig wären.
- **Freitextsuche** (`suche-logik.js`): Kleinschreibung, ä/ae, ß/ss, Bindestriche, Füllwörter weg, Wortstamm (-en/-er/-e), Tippfehler (Abstand 1 ab 5 Buchstaben), Wortteile (notruf → hausnotruf), Mehrwort-Regel (alle Wörter eines Begriffs in der Eingabe → starker Treffer, „dusche statt badewanne“ → `bad-dusche`). Erkennt Orte („in Solingen“) und Personen („für meine Mutter“ → `wer=angehoerige`). Höchstens 5 Anliegen, 2 Ratgeber, 1 Thema. Nichts wird protokolliert.
- **Assistent** (`assistent.js`): Start mit Suchfeld (ARIA-Combobox ab 2 Buchstaben, Pfeiltasten/Enter/Escape), „Häufig gesucht“, sechs Themen, „Andere Wege“ (Angehörige, Informieren → Ratgeber, Alltag → Mein-Alltag-Werkzeuge). Danach Filterfragen → Stadt (große Knöpfe der Start-Städte oder Feld mit Vorschlägen aus allen Städten der Anbieterliste) → Liste über `AnbieterListe.baue({ ausfuehrlich: true })`. Optional Notizfragen → Notizzettel (Drucken nur des Zettels über `body.is-printing-notiz`, E-Mail/WhatsApp über `mailtoLink`/`whatsappLink`). Null Treffer: verwandte Anliegen mit echter Anzahl in der Stadt, dann „Bei uns melden“. Ratgeber-Anliegen führen zu Ratgeber/Werkzeug statt zu einer leeren Liste.
- **Zustand in der Adresszeile** (`history.pushState`, kein Storage): `anliegen`, `bereich` (Thema), `gruppe`, `ziel` (`informieren|alltag`), `werkzeug`, `person=angehoerige`, `stadt`, `f-<frage>` (Filter, `-` = übersprungen), `n-<frage>` (Notiz), `notizen=1`, `q` (Suchbegriff). Beispiel: `/hilfe-finden/?anliegen=treppenlift&stadt=Solingen&n-treppe-form=kurvig`. Die Namen überschneiden sich bewusst nicht mit den Formular-Parametern.
- **„Bei uns melden“** = `/anfrage/?thema=<slug>&wer=selbst|angehoerige&ort=<Stadt>&leistung=<slug,…>&notiz=<Notizzettel als Text>`; `main.js` (2.) übernimmt `leistung` (Kästchen) und `notiz` (nur in ein leeres Beschreibungsfeld) und entfernt die Parameter danach.
- **Ohne JS** (oder wenn `assistent.json` nicht lädt): Liste mit Links auf die sechs Themenseiten und das Anfrageformular.
- Tests: `node --test tests/*.test.js`; E2E (Server auf 8765): `node tests/assistent.e2e.js` (Szenarien Haushaltshilfe in Solingen, Treppenlift kurvige Treppe, Pflegedienst für Mutter in Düsseldorf, Zuschüsse Badumbau/„dusche statt badewanne“; `SHOTS=<ordner/>` speichert Screenshots), `node tests/anbieter.e2e.js`, `node tests/rechner.e2e.js`, `node tests/startseite.e2e.js` (Startseite 3.2: kein horizontales Scrollen bei 320/390/768/1440, Aufbau A–F, Chips und Hero-Suche öffnen den Assistenten, alte Adressen leiten um, Handy-Leiste; mit `SHOTS=<ordner/>` ganzseitige Bilder bei 390 und 1440).
- **WordPress:** `anliegen` = Taxonomie mit Term-Meta (`begriffe`, `kategorien`, `fragen`, `notizfragen`, `verwandt`, `ratgeber`), Fragen als Optionsseite oder JSON im Theme; `assistent.json` = REST-Endpunkt `/wp-json/wirhelfen/v1/assistent`; Trefferliste später `/wp-json/wirhelfen/v1/anbieter?anliegen=&stadt=` mit derselben Logik wie `filtereAnliegen` (PHP-Vorlage). Seite `/hilfe-finden/` = `page-hilfe-finden.php` mit Template-Part `assistent`.

## Weitere Struktur

```
assets/css/tokens.css      Design-Tokens  → theme.json
assets/css/base.css        Reset, Typografie, Fokus, Hilfsklassen
assets/css/layout.css      Container, Sektionen, Header, Hero, Raster, Footer
assets/css/components.css  BEM-Komponenten (.card, .personal, .relatives, .benefits, .path-card,
                           .page-header, .breadcrumb, .topic-*, .form__section, .notice--*, .demo-label …)
assets/js/no-js.js         setzt html.js (Mobilmenü klappt nur mit JS zu)
assets/js/main.js          Mobilmenü, Vorauswahl, abhängige Leistungen, Validierung, Simulationen, Ratgeber-Themenfilter,
                           Seiten-Werkzeuge: Vorlesen (8.), Seite teilen (10.), ganze Seite drucken (11.)
_headers                   Security-Header (strikte CSP ohne unsafe-inline) + Cache-Regeln
```

### Entscheidungen

- **Veranstaltungen:** einspaltige Zeilen je Tag, Zusatzinfos in `<details>` („Mehr erfahren“). `assets/js/veranstaltungen.js` schreibt Ort und Thema in die Adresszeile (`/veranstaltungen/?ort=Hilden&thema=Kultur`, `history.replaceState`) und liest sie beim Laden (unbekannte Werte → „Alle“, Parameter entfernt); vor dem Druck werden alle Zusatzinfos aufgeklappt.
- **Kein Inline-JS/-CSS** (außer JSON-LD) → CSP ohne `unsafe-inline`; geprüft unter `wrangler dev` mit echten Headern.
- **Assistent** (`/hilfe-finden/`; die Startseite hat seit 3.2 nur den Einstieg: Suchfeld mit Vorschlägen und Chips, eine Auswahl öffnet `/hilfe-finden/?…` beim passenden Schritt; ohne JS ist das Suchfeld ein GET-Formular nach `/hilfe-finden/?q=…`; `assets/js/assistent.js`, eingebunden über `body_extra`): seit Relaunch 3.1 mit Freitextsuche und Anliegen-Katalog, siehe Abschnitt „Anliegen, Freitextsuche und Assistent“. Daten schreibt `build.py` (`assistent_data()`) nach `assets/data/assistent.json` (früher Attribut `data-assistent`; jetzt zu groß fürs HTML).
- **Vorauswahl:** Links wie `/anfrage/?thema=pflege-betreuung`, `/anfrage/?wer=angehoerige` (älter: `?fuer=`), `/anfrage/?ort=Hilden` (nur Städte aus `data/regionen.json`; älter: `?region=wesel`) funktionieren von jeder Seite (ohne JS: normale Navigation zum Formular). `main.js` übernimmt die Parameter und entfernt sie danach aus der Adresszeile; auf `/anfrage/` selbst werden solche Links ohne Neuladen abgefangen. Alte Links `/?…#anfrage` leitet `weiterleitung.js` um.
- **Leistungen je Kategorie** werden serverseitig (Build) als Checkbox-Gruppen gerendert, standardmäßig `hidden disabled`; JS blendet die passende ein. Ohne JS genügt die Pflicht-Beschreibung.
- **Schritt-Formulare** (`assets/js/schritte.js`, deklarativ über `data-schritte`/`data-schritt`): Anfrage, Anbieter-Registrierung und Veranstaltung melden laufen mit JS Schritt für Schritt (Fortschritt, Zurück/Weiter, Prüfung je Schritt). Letzter Schritt: Zusammenfassung und Versand **per E-Mail** (`mailto:`) oder **per WhatsApp** (`wa.me`) mit vorbefülltem Text; gesendet wird erst im Mailprogramm bzw. in WhatsApp. Empfänger stehen nur in `assets/js/api.js` (`KONTAKT`, Platzhalter, vor Livegang ersetzen). Ohne JS bleibt das ganze Formular sichtbar. Tests: `node --test` (Unit), Klickpfad per Playwright.
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
| `templates/index.html` | `front-page.php` mit `get_template_part()` je Sektion (`hero-suche`, `themen`, `ablauf`, `ratgeber-auswahl` mit `WP_Query` Meta `startseite` 1–6, `vertrauen`) |
| `templates/anfrage.html` | `page-anfrage.php` (Template-Part `form-anfrage`) |
| `templates/so-funktioniert-es.html` | `page-so-funktioniert-es.php` (Template-Parts `ablauf`, `persoenlich`, `angehoerige`, `vertrauen`) |
| `assets/js/weiterleitung.js` | Abfrageteil als 301 in `template_redirect`, Anker weiter per Skript |
| `templates/thema.html` | `taxonomy-themenbereich.php` (Term + Term-Meta aus `themen.json`) |
| `templates/themen.html` | `page-themen.php` bzw. Archiv der Taxonomie |
| `templates/hilfe-finden.html` | `page-hilfe-finden.php` (Template-Part `assistent`, Taxonomie `anliegen`) |
| `templates/fuer-anbieter.html` | `page-fuer-anbieter.php` |
| `templates/ratgeber.html` | `home.php` (Beitragsarchiv) |
| `templates/ratgeber-beitrag.html` | `single.php` (Breadcrumb, `the_content()`, Inhaltsverzeichnis per Filter auf `the_content` aus den H2) |
| Beitragskarte (`article_card()` in build.py) | `template-parts/card-artikel.php` (`the_post_thumbnail('teaser-4-3')`, `get_the_excerpt()`) |
| „Passender Ratgeber“ auf Themenseiten | `WP_Query` mit `tax_query` `themenbereich` = aktueller Term |
| `templates/impressum.html`, `datenschutz.html` | `page-impressum.php`, `page-datenschutz.php` (oder Standard-`page.php`) |
| `templates/404.html` | `404.php` |
| Themenkarte (`theme_card()` in build.py) | `template-parts/card-thema.php` |
| Block „Persönliche Vermittlung“ (Themenseiten; ausführlich auf `/so-funktioniert-es/#so-funktionierts`) | `template-parts/persoenlich.php` |
| Formulare | eigener Handler über `admin-post.php` (Nonce, Sanitizing) oder Formular-Plugin |
| `main.js` | `wp_enqueue_script(..., ['strategy' => 'defer'])` |

**Custom Post Types** (nicht öffentlich: `public => false`, `show_ui => true`)

- `anbieter` – gewerbliche Dienstleister. Meta: Firma, Ansprechpartner, Einsatzorte, Nachweise, Prüfstatus
- `helfer` – private Helfer. Meta: Hilfeangebote, Verfügbarkeit, Prüfstatus
- `anfrage` – eingehende Anliegen. Meta: Für wen, Leistungen, PLZ/Ort, Kontakt, Rückrufwunsch, Einwilligung Bearbeitung (+ Zeitstempel), Newsletter-Einwilligung (separat), Weitergabe-Zustimmungen je Anbieter, Bearbeitungsstatus

- `veranstaltung` – Termine. Meta: `datum` (Y-m-d), `beginn`, `ende`, `ort`, `veranstalter`, `kosten`, `anmeldung`, `barrierefrei`, `link` (= `quelle_url`), `geprueft_am`, `status`; interne Meta (nie ausgeben): `kontakt_name`, `kontakt_email`, `kontakt_telefon`, Einwilligung + Zeitstempel. Titel = `post_title`, `kurztext` = `post_excerpt`. Taxonomien: `kategorie` (Bewegung, Kultur, Bildung, Begegnung, Digital, Gesundheit; wie `themenbereich` aufgebaut) und `region` (= Stadt). Anders als die übrigen CPTs öffentlich (`public => true`, Archiv `/veranstaltungen/`).
  - **Meldung durch Veranstalter:** `/veranstaltungen/melden/` → `POST /wp-json/wirhelfen/v1/veranstaltungen` legt den Beitrag mit `post_status = pending` an (`WirHelfenAPI.veranstaltungMelden`, Payload als JSDoc in `api.js`). Prüfung im WP-Backend über den nativen Status „Ausstehend“ (Listenfilter, Schnellbearbeitung, „Veröffentlichen“) – kein Plugin nötig. Serverseitig: Nonce/Honigtopf (`website` muss leer sein), Sanitizing, Längenlimit 400 Zeichen. Eigene Termine des Teams: direkt `publish`.
  - **Ablaufdatum:** Archiv/Liste per `WP_Query` mit `meta_query` `datum >= heute`, `orderby meta_value`, `order ASC`; vergangene Termine bleiben im Backend, werden aber nicht ausgegeben (kein Cron nötig).

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

### Mein Alltag (Checklisten, Wohnungs-Check)

Ohne Anmeldung, **ohne Speicherung**: Haken und Antworten leben nur im geöffneten Tab (`assets/js/alltag.js`, nur auf den beiden Unterseiten eingebunden). Zum Aufheben: „Drucken / als PDF speichern“ (`window.print()`); `assets/css/print.css` (nur `media="print"`) blendet Navigation, Fußbereich und – über `body.is-printing` / `.is-print-target` – alle anderen Bereiche aus. Der Wohnungs-Check wertet ohne Noten aus („Das ist schon gut“ / „Hier lohnt sich ein Blick“, Sturzgefahr zuerst) und ersetzt keine Fachberatung. „Erinnerungen“ und „Unterstützungsplan“ sind als „In Vorbereitung“ gekennzeichnet. 

## Schnittstellen (simuliert)

`assets/js/api.js` ist die einzige Stelle, an der später mit einem Backend gesprochen wird. Im Prototyp **sendet nichts**: kein `fetch`, kein Storage, keine Cookies – `WirHelfenAPI.sendeAnfrage(payload)` gibt ein Promise zurück, das nach kurzer Zeit (simuliert) auflöst.

| | |
|---|---|
| Aufruf | `WirHelfenAPI.sendeAnfrage(payload) → Promise<{ ok, simuliert }>` (Anfrageformular, `main.js` 5.) |
| Payload | `wer`, `thema`, `leistungen[]`, `beschreibung`, `plz`, `ort`, `vorname`, `nachname`, `telefon`, `email`, `rueckruf { fenster: vormittags\|nachmittags\|eigen, eigenes }` \| `null`, `einwilligung_bearbeitung`, `newsletter` – Typen als JSDoc in `api.js` |
| Zielendpunkt (später) | WordPress REST `POST /wp-json/wirhelfen/v1/anfragen` |
| Verarbeitung (später) | legt CPT `anfrage` an (Status: neu → in Bearbeitung → vermittelt → abgeschlossen), Taxonomien `themenbereich`/`region`; Eingangsbestätigung per `wp_mail()` an die angegebene E-Mail (nur wenn vorhanden) |
| Rückrufwunsch | optional, Gruppe erscheint (mit JS) erst bei eingetragener Telefonnummer; „Eigenes Zeitfenster“ verlangt den Freitext; Anzeige in der Erfolgsmeldung |

## Offene Punkte

- Impressum und Datenschutz ausformulieren und **rechtlich prüfen** lassen (inkl. Art. 9 DSGVO bei Gesundheitsangaben im Freitext, Ablauf der Weitergabe-Zustimmung, Double-Opt-in Newsletter).
- Domain (Canonical, OG, JSON-LD), ggf. Adresse/Logo im JSON-LD.
- Ratgeber: `datePublished`/Autor im JSON-LD erst mit echten Daten; Beträge (Entlastungsbetrag, Hausnotruf-Zuschuss, Treppenlift: Pflegekassen-Zuschuss, KfW-Status) vor Veröffentlichung fachlich prüfen und `stand`/`geaendert` pflegen.
- Treppenlift-Titelbild: Original nur 1199 px breit → `-1400`-Varianten sind leicht hochskaliert; bei Gelegenheit Original ≥ 1400 px nachliefern.
- Ob Anbieterprofile später öffentlich sichtbar sind („Veröffentlichung“) oder nur intern genutzt werden, ist inhaltlich zu klären.
- Formular-Backend (Spam-Schutz, Bestätigungsmail) und CSP vor Livegang gegen tatsächliche Einbindungen prüfen.
