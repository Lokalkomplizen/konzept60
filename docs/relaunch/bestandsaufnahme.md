# Bestandsaufnahme Website-Prototyp „Konzept 60+“

Stand der Erhebung: 2026-11-25. Quelle: Repository `konzept60`, ausgecheckter Stand `main` bei Commit `bd5692c` (identisch mit dem Branch `claude/project-thread-bme6ey`). Die Zahlen stammen aus den generierten HTML-Dateien, den Quelldateien und per Skript ausgewerteten Dateigrößen. Wo etwas von Hand ergänzt oder gerundet ist, steht es dabei.

**Methode:** Die generierten Seiten wurden mit Python/BeautifulSoup geparst. „Wörter“ zählt den sichtbaren Text im `<main>`-Element (ohne Skript, Style, SVG, `<template>`; inklusive Formularbeschriftungen, Teaser-Karten und Fußbereichen innerhalb von `<main>`). Bei Ratgeber-Beiträgen steht zusätzlich die Wortzahl nur des Beitragstextes (`.article__body`). Alle Wortzahlen sind Zählungen, aber „ungefähr“: Regel ist jede Folge aus Buchstaben/Ziffern/Bindestrich.

## Überblick in Zahlen

| Kennzahl | Wert |
|---|---|
| Generierte HTML-Seiten (ohne Vorlagen/Partials; Test-Fixtures gibt es nicht, `tests/` enthält nur JS) | 40 |
| davon Ratgeber-Beiträge | 21 |
| davon Themenseiten (Detail) | 6 |
| Bilddateien in `assets/img` | 207 (206 Rasterbilder, 1 SVG) |
| JS-Dateien in `assets/js` (inkl. `pflegegrad/`) | 12 |
| Datendateien (`data/*.json`, `data/pflegegrad/*.json`, `assets/data/*.json`) | 15 |
| Tote interne Links (Ziel-Datei existiert nicht) | 0 |
| Interne Links mit nicht vorhandener Sprungmarke (`#id` fehlt im statischen HTML des Ziels) | 0 |
| Bilddateien ohne Verweis in HTML/CSS/JS/JSON | 1 |

## 1. Seitenliste

Übersicht (Reihenfolge: Startseite, danach alphabetisch nach Pfad). Quelle = Vorlage laut Kopfkommentar der generierten Datei (`GENERIERT … aus templates/…`); bei Themen und Ratgeber kommen die Inhalte zusätzlich aus `data/themen.json` bzw. `content/ratgeber/<slug>.md`. Die Seite `/veranstaltungen/` bezieht ihre Inhalte aus `data/veranstaltungen.json`, die Mein-Alltag-Seiten aus `data/checklisten.json`, `data/wohnungs-check.json`, `data/pflegegrad/*.json`.

| # | URL-Pfad | Generierte Datei | Quell-Template / Quelle | `<title>` | h1 | Wörter (main) |
|---|---|---|---|---|---|---|
| 1 | `/` | `index.html` | `templates/index.html` | Konzept 60+ – Hilfe finden. Einfach und kostenlos. | Sie müssen nicht wissen, wer Ihnen helfen kann. Dafür sind wir da. | 1228 |
| 2 | `/404.html` | `404.html` | `templates/404.html` | Seite nicht gefunden – Konzept 60+ | Diese Seite gibt es leider nicht | 35 |
| 3 | `/datenschutz/` | `datenschutz/index.html` | `templates/datenschutz.html` | Datenschutzerklärung (Platzhalter) – Konzept 60+ | Datenschutzerklärung | 491 |
| 4 | `/fuer-anbieter/` | `fuer-anbieter/index.html` | `templates/fuer-anbieter.html` | Für Anbieter – Konzept 60+ | Gemeinsam für Menschen ab 60 in der Region | 798 |
| 5 | `/impressum/` | `impressum/index.html` | `templates/impressum.html` | Impressum (Platzhalter) – Konzept 60+ | Impressum | 113 |
| 6 | `/mein-alltag/checklisten/` | `mein-alltag/checklisten/index.html` | `templates/mein-alltag-checklisten.html` | Checklisten – Mein Alltag – Konzept 60+ | Meine Checklisten | 652 |
| 7 | `/mein-alltag/` | `mein-alltag/index.html` | `templates/mein-alltag.html` | Mein Alltag – Konzept 60+ | Mein Alltag | 209 |
| 8 | `/mein-alltag/pflegegrad-rechner/` | `mein-alltag/pflegegrad-rechner/index.html` | `templates/mein-alltag-pflegegrad-rechner.html` | Pflegegradrechner: Welcher Pflegegrad könnte vorliegen? – Konzept 60+ | Welcher Pflegegrad könnte vorliegen? | 896 |
| 9 | `/mein-alltag/wohnungs-check/` | `mein-alltag/wohnungs-check/index.html` | `templates/mein-alltag-wohnungs-check.html` | Wohnungs-Check – Mein Alltag – Konzept 60+ | Mein Wohnungs-Check | 734 |
| 10 | `/ratgeber/alltag-gut-organisiert/` | `ratgeber/alltag-gut-organisiert/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/alltag-gut-organisiert.md` | Gut organisiert und selbstbestimmt: 5 Dinge, die den Alltag leichter machen – Ratgeber – Konzept 60+ | Gut organisiert und selbstbestimmt: 5 Dinge, die den Alltag leichter machen | 667 |
| 11 | `/ratgeber/altersgerechter-umbau/` | `ratgeber/altersgerechter-umbau/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/altersgerechter-umbau.md` | Altersgerechter Umbau: So bleibt das eigene Zuhause ein Zuhause – Ratgeber – Konzept 60+ | Altersgerechter Umbau: So bleibt das eigene Zuhause ein Zuhause | 815 |
| 12 | `/ratgeber/barrierefrei-wohnen/` | `ratgeber/barrierefrei-wohnen/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/barrierefrei-wohnen.md` | Barrierefrei wohnen: Kleine Veränderungen, große Wirkung – Ratgeber – Konzept 60+ | Barrierefrei wohnen: Kleine Veränderungen, große Wirkung | 549 |
| 13 | `/ratgeber/betrug-telefon-haustuer/` | `ratgeber/betrug-telefon-haustuer/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/betrug-telefon-haustuer.md` | Vorsicht vor Betrug: So schützen Sie sich am Telefon und an der Haustür – Ratgeber – Konzept 60+ | Vorsicht vor Betrug: So schützen Sie sich am Telefon und an der Haustür | 661 |
| 14 | `/ratgeber/eltern-aus-der-ferne-unterstuetzen/` | `ratgeber/eltern-aus-der-ferne-unterstuetzen/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/eltern-aus-der-ferne-unterstuetzen.md` | Eltern aus der Ferne unterstützen: Ein Leitfaden für Angehörige – Ratgeber – Konzept 60+ | Eltern aus der Ferne unterstützen: Ein Leitfaden für Angehörige | 1200 |
| 15 | `/ratgeber/ernaehrung-ab-60/` | `ratgeber/ernaehrung-ab-60/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/ernaehrung-ab-60.md` | Fit ab 60: Welche Lebensmittel jetzt besonders wertvoll für Ihren Körper sind – Ratgeber – Konzept 60+ | Fit ab 60: Welche Lebensmittel jetzt besonders wertvoll für Ihren Körper sind | 1581 |
| 16 | `/ratgeber/fruehstueck-ab-60-eiweiss/` | `ratgeber/fruehstueck-ab-60-eiweiss/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/fruehstueck-ab-60-eiweiss.md` | Frühstück ab 60: Warum Eiweiß am Morgen so wichtig ist – Ratgeber – Konzept 60+ | Frühstück ab 60: Warum Eiweiß jetzt schon morgens auf den Teller gehört | 1456 |
| 17 | `/ratgeber/gemeinsam-statt-einsam/` | `ratgeber/gemeinsam-statt-einsam/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/gemeinsam-statt-einsam.md` | Gemeinsam statt einsam: Warum soziale Kontakte im Alter so wichtig sind – Ratgeber – Konzept 60+ | Gemeinsam statt einsam: Warum soziale Kontakte im Alter so wichtig sind | 593 |
| 18 | `/ratgeber/gesund-und-fit-im-alter/` | `ratgeber/gesund-und-fit-im-alter/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/gesund-und-fit-im-alter.md` | Gesund und fit im Alter: Was Sie selbst für Ihr Wohlbefinden tun können – Ratgeber – Konzept 60+ | Gesund und fit im Alter: Was Sie selbst für Ihr Wohlbefinden tun können | 770 |
| 19 | `/ratgeber/haushaltshilfe-betrieb-oder-privat/` | `ratgeber/haushaltshilfe-betrieb-oder-privat/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/haushaltshilfe-betrieb-oder-privat.md` | Haushaltshilfe: Betrieb oder privat – was passt zu mir? – Ratgeber – Konzept 60+ | Haushaltshilfe: Betrieb oder privat – was passt zu mir? | 908 |
| 20 | `/ratgeber/haushaltshilfe-im-alter/` | `ratgeber/haushaltshilfe-im-alter/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/haushaltshilfe-im-alter.md` | Haushaltshilfe im Alter: Unterstützung, die den Alltag leichter macht – Ratgeber – Konzept 60+ | Haushaltshilfe im Alter: Unterstützung, die den Alltag leichter macht | 627 |
| 21 | `/ratgeber/hausnotruf-auswahl/` | `ratgeber/hausnotruf-auswahl/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/hausnotruf-auswahl.md` | Hausnotruf: Worauf Sie bei der Auswahl achten sollten – Ratgeber – Konzept 60+ | Hausnotruf: Worauf Sie bei der Auswahl achten sollten | 1194 |
| 22 | `/ratgeber/` | `ratgeber/index.html` | `templates/ratgeber.html` | Ratgeber – Konzept 60+ | Wissen, das weiterhilft | 837 |
| 23 | `/ratgeber/krankenfahrten/` | `ratgeber/krankenfahrten/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/krankenfahrten.md` | Krankenfahrten: Sicher und zuverlässig zum Arzt oder zur Therapie – Ratgeber – Konzept 60+ | Krankenfahrten: Sicher und zuverlässig zum Arzt oder zur Therapie | 826 |
| 24 | `/ratgeber/kurzzeitpflege/` | `ratgeber/kurzzeitpflege/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/kurzzeitpflege.md` | Kurzzeitpflege: Wenn Pflege vorübergehend nicht zu Hause möglich ist – Ratgeber – Konzept 60+ | Kurzzeitpflege: Wenn Pflege vorübergehend nicht zu Hause möglich ist | 1230 |
| 25 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` | `ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen.md` | Mehrgenerationenhaus: Kosten, Steuern und Vorteile – Ratgeber – Konzept 60+ | Mehrgenerationenhaus: Gemeinsam wohnen, Kosten teilen und Steuervorteile nutzen | 5338 |
| 26 | `/ratgeber/mobilitaet-im-alter-ohne-auto/` | `ratgeber/mobilitaet-im-alter-ohne-auto/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/mobilitaet-im-alter-ohne-auto.md` | Mobilität im Alter: Unabhängig ohne eigenes Auto – Ratgeber – Konzept 60+ | Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig? | 5042 |
| 27 | `/ratgeber/patientenverfuegung-vorsorgevollmacht/` | `ratgeber/patientenverfuegung-vorsorgevollmacht/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/patientenverfuegung-vorsorgevollmacht.md` | Patientenverfügung und Vorsorgevollmacht: Das sollten Sie wissen – Ratgeber – Konzept 60+ | Patientenverfügung und Vorsorgevollmacht: Wer entscheidet, wenn ich es selbst nicht mehr kann? | 2960 |
| 28 | `/ratgeber/pflegegrad-beantragen/` | `ratgeber/pflegegrad-beantragen/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/pflegegrad-beantragen.md` | Pflegegrad beantragen: Schritt für Schritt zum richtigen Pflegegrad – Ratgeber – Konzept 60+ | Pflegegrad beantragen: Schritt für Schritt zum richtigen Pflegegrad | 1027 |
| 29 | `/ratgeber/pflegereform-2027/` | `ratgeber/pflegereform-2027/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/pflegereform-2027.md` | Pflege 2027: Was sich zum 1. Januar ändern soll – Ratgeber – Konzept 60+ | Pflege 2027: Was sich zum 1. Januar ändern soll | 1226 |
| 30 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` | `ratgeber/rente-reicht-nicht-finanzielle-hilfen/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/rente-reicht-nicht-finanzielle-hilfen.md` | Rente reicht nicht? Diese finanziellen Hilfen gibt es – Ratgeber – Konzept 60+ | Rente reicht nicht? Diese finanziellen Hilfen und Ansprüche sollten ältere Menschen kennen | 4816 |
| 31 | `/ratgeber/treppenlift-einbau/` | `ratgeber/treppenlift-einbau/index.html` | `templates/ratgeber-beitrag.html + content/ratgeber/treppenlift-einbau.md` | Treppenlift: Was Sie vor dem Einbau wissen sollten – Ratgeber – Konzept 60+ | Treppenlift: Was Sie vor dem Einbau wissen sollten | 1483 |
| 32 | `/themen/alltag-persoenliche-hilfe/` | `themen/alltag-persoenliche-hilfe/index.html` | `templates/thema.html + data/themen.json` | Alltag und persönliche Hilfe – Themen – Konzept 60+ | Alltag und persönliche Hilfe | 299 |
| 33 | `/themen/freizeit-lebensqualitaet/` | `themen/freizeit-lebensqualitaet/index.html` | `templates/thema.html + data/themen.json` | Freizeit und Lebensqualität – Themen – Konzept 60+ | Freizeit und Lebensqualität | 285 |
| 34 | `/themen/haushalt-reinigung/` | `themen/haushalt-reinigung/index.html` | `templates/thema.html + data/themen.json` | Haushalt und Reinigung – Themen – Konzept 60+ | Haushalt und Reinigung | 266 |
| 35 | `/themen/` | `themen/index.html` | `templates/themen.html` | Themen – Konzept 60+ | Wobei dürfen wir helfen? | 235 |
| 36 | `/themen/pflege-betreuung/` | `themen/pflege-betreuung/index.html` | `templates/thema.html + data/themen.json` | Pflege und Betreuung – Themen – Konzept 60+ | Pflege und Betreuung | 307 |
| 37 | `/themen/technik-sicherheit/` | `themen/technik-sicherheit/index.html` | `templates/thema.html + data/themen.json` | Technik und Sicherheit – Themen – Konzept 60+ | Technik und Sicherheit | 256 |
| 38 | `/themen/wohnen-haus-handwerk/` | `themen/wohnen-haus-handwerk/index.html` | `templates/thema.html + data/themen.json` | Wohnen, Haus und Handwerk – Themen – Konzept 60+ | Wohnen, Haus und Handwerk | 284 |
| 39 | `/veranstaltungen/` | `veranstaltungen/index.html` | `templates/veranstaltungen.html` | Veranstaltungen für Sie – Konzept 60+ | Veranstaltungen für Sie | 1607 |
| 40 | `/veranstaltungen/melden/` | `veranstaltungen/melden/index.html` | `templates/veranstaltungen-melden.html` | Veranstaltung melden – Konzept 60+ | Veranstaltung melden | 388 |

Gesamtwörter im Hauptinhalt aller Seiten: **44889** (Summe der Spalte, enthält wiederkehrende Bausteine mehrfach).

### Überschriften je Seite (h2 / h3 im `<main>`)

**`/`** – 1228 Wörter, Quelle `templates/index.html`

- `<title>`: Konzept 60+ – Hilfe finden. Einfach und kostenlos.
- h1: Sie müssen nicht wissen, wer Ihnen helfen kann. Dafür sind wir da.
- h2: Wie können wir Ihnen heute helfen?
- h2: Drei Wege, wie wir helfen
  - h3: Hilfe finden Wobei dürfen wir helfen?
  - h3: Verständlich erklärt: der Ratgeber
  - h3: Mein Alltag
- h2: In drei Schritten zur passenden Hilfe
  - h3: Anliegen beschreiben
  - h3: Unser Team sucht für Sie
  - h3: Sie erhalten Rückmeldung
- h2: Sie suchen Unterstützung für Ihre Eltern oder Angehörigen?
- h2: Beschreiben Sie Ihr Anliegen
  - h3: Ihre Anfrage
  - h3: Bitte prüfen Sie Ihre Angaben
  - h3: Fast geschafft: Bitte noch auf „Senden“ tippen
- h2: Wissen, das weiterhilft
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?
  - h3: Mehrgenerationenhaus: Gemeinsam wohnen, Kosten teilen und Steuervorteile nutzen
  - h3: Frühstück ab 60: Warum Eiweiß jetzt schon morgens auf den Teller gehört

**`/404.html`** – 35 Wörter, Quelle `templates/404.html`

- `<title>`: Seite nicht gefunden – Konzept 60+
- h1: Diese Seite gibt es leider nicht
- (keine h2/h3)

**`/datenschutz/`** – 491 Wörter, Quelle `templates/datenschutz.html`

- `<title>`: Datenschutzerklärung (Platzhalter) – Konzept 60+
- h1: Datenschutzerklärung
- h2: Inhalt
- h2: 1. Verantwortlicher
- h2: 2. Zwecke der Verarbeitung
  - h3: 2.1 Bearbeitung Ihrer Anfrage
  - h3: 2.2 Weitergabe an Anbieter – nur nach Ihrer Zustimmung
  - h3: 2.3 Newsletter (freiwillig)
  - h3: 2.4 Registrierung als Anbieter oder privater Helfer
  - h3: 2.5 Kontakt per E-Mail oder WhatsApp
  - h3: 2.6 Anbieterliste (Vorschläge in der Anfrage)
- h2: 3. Rechtsgrundlagen
- h2: 4. Speicherdauer
- h2: 5. Ihre Rechte
- h2: 6. Hosting, Server-Logs, Cookies

**`/fuer-anbieter/`** – 798 Wörter, Quelle `templates/fuer-anbieter.html`

- `<title>`: Für Anbieter – Konzept 60+
- h1: Gemeinsam für Menschen ab 60 in der Region
- h2: Warum mitmachen?
- h2: Gewerblicher Dienstleister oder privater Helfer?
  - h3: Gewerbliche Dienstleister
  - h3: Private Helfer
- h2: Kostenlos starten
  - h3: So geht es nach der Registrierung weiter
- h2: Als Anbieter registrieren
  - h3: Ihre Registrierung
  - h3: Bitte prüfen Sie Ihre Angaben
  - h3: Fast geschafft: Bitte noch auf „Senden“ tippen

**`/impressum/`** – 113 Wörter, Quelle `templates/impressum.html`

- `<title>`: Impressum (Platzhalter) – Konzept 60+
- h1: Impressum
- h2: Angaben gemäß § 5 DDG
- h2: Kontakt
- h2: Register und Umsatzsteuer
- h2: Verantwortlich für den Inhalt
- h2: Weitere Hinweise

**`/mein-alltag/checklisten/`** – 652 Wörter, Quelle `templates/mein-alltag-checklisten.html`

- `<title>`: Checklisten – Mein Alltag – Konzept 60+
- h1: Meine Checklisten
- h2: Vorbereitung auf einen Arzttermin
- h2: Wohnung altersgerecht gestalten
- h2: Pflegegrad beantragen
- h2: Vorbereitung auf einen Handwerkertermin

**`/mein-alltag/`** – 209 Wörter, Quelle `templates/mein-alltag.html`

- `<title>`: Mein Alltag – Konzept 60+
- h1: Mein Alltag
- h2: Unsere Werkzeuge
  - h3: Meine Checklisten
  - h3: Mein Wohnungs-Check
  - h3: Pflegegradrechner
  - h3: Veranstaltungen für Sie
  - h3: Meine Erinnerungen
  - h3: Mein Unterstützungsplan

**`/mein-alltag/pflegegrad-rechner/`** – 896 Wörter, Quelle `templates/mein-alltag-pflegegrad-rechner.html`

- `<title>`: Pflegegradrechner: Welcher Pflegegrad könnte vorliegen? – Konzept 60+
- h1: Welcher Pflegegrad könnte vorliegen?
- h2: Ihre Antworten im Überblick
- h2: 
  - h3: So verteilen sich die Punkte
  - h3: Wo die größten Einschränkungen liegen
  - h3: Was bedeutet die Pflegereform für Sie?
  - h3: Leistungen der Pflegeversicherung ab 2027
  - h3: Welche Unterstützung passen könnte
  - h3: Wie es weitergehen kann
- h2: Häufige Fragen zum Pflegegradrechner
  - h3: Wie wird der Pflegegrad berechnet?
  - h3: Ab wie vielen Punkten gibt es welchen Pflegegrad?
  - h3: Ist das Ergebnis des Pflegegradrechners verbindlich?
  - h3: Wie beantrage ich einen Pflegegrad?
  - h3: Was ändert sich mit der Pflegereform 2027?
  - h3: Werden meine Angaben gespeichert?
  - h3: Kann ich den Rechner für meine Mutter oder meinen Vater ausfüllen?
  - h3: Darf jeder Dienstleister über die Pflegekasse abrechnen?

**`/mein-alltag/wohnungs-check/`** – 734 Wörter, Quelle `templates/mein-alltag-wohnungs-check.html`

- `<title>`: Wohnungs-Check – Mein Alltag – Konzept 60+
- h1: Mein Wohnungs-Check
- h2: Ihre Auswertung
  - h3: Das ist schon gut
  - h3: Hier lohnt sich ein Blick
  - h3: Mehr dazu im Ratgeber

**`/ratgeber/alltag-gut-organisiert/`** – 667 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/alltag-gut-organisiert.md`

- `<title>`: Gut organisiert und selbstbestimmt: 5 Dinge, die den Alltag leichter machen – Ratgeber – Konzept 60+
- h1: Gut organisiert und selbstbestimmt: 5 Dinge, die den Alltag leichter machen
- h2: Inhalt
- h2: 1. Das eigene Zuhause im Blick behalten
- h2: 2. Gesundheit und Termine organisieren
- h2: 3. Finanzen regelmäßig überprüfen
- h2: 4. Wichtige Unterlagen und Vorsorge ordnen
- h2: 5. Freizeit und soziale Kontakte pflegen
- h2: Kleine Schritte machen den Unterschied
- h2: Sie suchen Unterstützung zum Thema Alltag und persönliche Hilfe?
- h2: Weitere Beiträge
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?
  - h3: Rente reicht nicht? Diese finanziellen Hilfen und Ansprüche sollten ältere Menschen kennen
  - h3: Patientenverfügung und Vorsorgevollmacht: Wer entscheidet, wenn ich es selbst nicht mehr kann?

**`/ratgeber/altersgerechter-umbau/`** – 815 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/altersgerechter-umbau.md`

- `<title>`: Altersgerechter Umbau: So bleibt das eigene Zuhause ein Zuhause – Ratgeber – Konzept 60+
- h1: Altersgerechter Umbau: So bleibt das eigene Zuhause ein Zuhause
- h2: Inhalt
- h2: 1. Das Badezimmer sicher und komfortabel gestalten
- h2: 2. Treppen und Eingänge überwinden
- h2: 3. Türen, Flure und Wohnräume anpassen
- h2: 4. Die Küche praktischer gestalten
- h2: 5. Welche Fördermöglichkeiten gibt es?
- h2: 6. Gute Planung spart Geld und Ärger
- h2: Heute planen, morgen selbstständig wohnen
- h2: Sie suchen Unterstützung zum Thema Wohnen, Haus und Handwerk?
- h2: Weitere Beiträge
  - h3: Mehrgenerationenhaus: Gemeinsam wohnen, Kosten teilen und Steuervorteile nutzen
  - h3: Barrierefrei wohnen: Kleine Veränderungen, große Wirkung
  - h3: Treppenlift: Was Sie vor dem Einbau wissen sollten

**`/ratgeber/barrierefrei-wohnen/`** – 549 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/barrierefrei-wohnen.md`

- `<title>`: Barrierefrei wohnen: Kleine Veränderungen, große Wirkung – Ratgeber – Konzept 60+
- h1: Barrierefrei wohnen: Kleine Veränderungen, große Wirkung
- h2: Inhalt
- h2: 1. Stolperfallen beseitigen
- h2: 2. Für gutes Licht sorgen
- h2: 3. Badezimmer sicherer gestalten
- h2: 4. Treppen und Eingänge prüfen
- h2: 5. Rechtzeitig Unterstützung einholen
- h2: Selbstständig wohnen, solange es geht
- h2: Sie suchen Unterstützung zum Thema Wohnen, Haus und Handwerk?
- h2: Weitere Beiträge
  - h3: Mehrgenerationenhaus: Gemeinsam wohnen, Kosten teilen und Steuervorteile nutzen
  - h3: Altersgerechter Umbau: So bleibt das eigene Zuhause ein Zuhause
  - h3: Treppenlift: Was Sie vor dem Einbau wissen sollten

**`/ratgeber/betrug-telefon-haustuer/`** – 661 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/betrug-telefon-haustuer.md`

- `<title>`: Vorsicht vor Betrug: So schützen Sie sich am Telefon und an der Haustür – Ratgeber – Konzept 60+
- h1: Vorsicht vor Betrug: So schützen Sie sich am Telefon und an der Haustür
- h2: Inhalt
- h2: 1. Lassen Sie sich nicht unter Druck setzen
- h2: 2. Vorsicht bei angeblichen Polizeibeamten
- h2: 3. Keine Fremden einfach hereinlassen
- h2: 4. Geben Sie keine persönlichen Daten weiter
- h2: 5. Sprechen Sie mit Familie und Freunden
- h2: Was tun, wenn Sie unsicher sind?
- h2: Gemeinsam besser geschützt
- h2: Sie suchen Unterstützung zum Thema Technik und Sicherheit?
- h2: Weitere Beiträge
  - h3: Hausnotruf: Worauf Sie bei der Auswahl achten sollten
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?
  - h3: Mehrgenerationenhaus: Gemeinsam wohnen, Kosten teilen und Steuervorteile nutzen

**`/ratgeber/eltern-aus-der-ferne-unterstuetzen/`** – 1200 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/eltern-aus-der-ferne-unterstuetzen.md`

- `<title>`: Eltern aus der Ferne unterstützen: Ein Leitfaden für Angehörige – Ratgeber – Konzept 60+
- h1: Eltern aus der Ferne unterstützen: Ein Leitfaden für Angehörige
- h2: Inhalt
- h2: 1. Erkennen, wann Unterstützung notwendig wird
- h2: 2. Ein zuverlässiges Netzwerk vor Ort aufbauen
  - h3: Familie und Nachbarn
  - h3: Ambulante Pflegedienste
  - h3: Haushalts- und Alltagshelfer
  - h3: Hausarzt und Apotheke
  - h3: Angebote in der Nachbarschaft
- h2: 3. Unterstützung organisieren, auch wenn Sie weit weg wohnen
- h2: 4. Pflege und finanzielle Unterstützung frühzeitig klären
- h2: 5. Rechtliche und organisatorische Fragen nicht vergessen
- h2: 6. Regelmäßigen Kontakt und klare Abläufe schaffen
- h2: 7. Denken Sie auch an sich selbst
- h2: Unser Fazit: Nähe ist nicht nur eine Frage der Entfernung
- h2: Sie suchen Unterstützung zum Thema Alltag und persönliche Hilfe?
- h2: Weitere Beiträge
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?
  - h3: Rente reicht nicht? Diese finanziellen Hilfen und Ansprüche sollten ältere Menschen kennen
  - h3: Patientenverfügung und Vorsorgevollmacht: Wer entscheidet, wenn ich es selbst nicht mehr kann?

**`/ratgeber/ernaehrung-ab-60/`** – 1581 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/ernaehrung-ab-60.md`

- `<title>`: Fit ab 60: Welche Lebensmittel jetzt besonders wertvoll für Ihren Körper sind – Ratgeber – Konzept 60+
- h1: Fit ab 60: Welche Lebensmittel jetzt besonders wertvoll für Ihren Körper sind
- h2: Inhalt
- h2: 1. Eiweiß: Wichtig für starke Muskeln
  - h3: Wie viel Eiweiß braucht man ab 60?
- h2: 2. Ballaststoffe: Gut für eine aktive Verdauung
- h2: 3. Vitamine und Mineralstoffe: Kleine Helfer mit großer Wirkung
  - h3: Vitamin B12: Wichtig für Nerven und Blutbildung
  - h3: Vitamin D und Calcium: Für stabile Knochen
- h2: 4. Gesunde Fette: Energie und wichtige Fettsäuren
- h2: 5. Energie für den Alltag: Die richtigen Kohlenhydrate
- h2: 6. Trinken nicht vergessen: Wasser hält den Körper in Schwung
- h2: 7. So könnte ein ausgewogener Tag aussehen
  - h3: Frühstück
  - h3: Mittagessen
  - h3: Nachmittags
  - h3: Abendessen
- h2: 8. Ernährung allein reicht nicht: Bewegung hält zusätzlich fit
- h2: Fazit: Kleine Veränderungen können viel bewirken
- h2: Gut informiert und selbstständig durchs Leben
- h2: Sie suchen Unterstützung zum Thema Freizeit und Lebensqualität?
- h2: Weitere Beiträge
  - h3: Frühstück ab 60: Warum Eiweiß jetzt schon morgens auf den Teller gehört
  - h3: Gesund und fit im Alter: Was Sie selbst für Ihr Wohlbefinden tun können
  - h3: Gemeinsam statt einsam: Warum soziale Kontakte im Alter so wichtig sind

**`/ratgeber/fruehstueck-ab-60-eiweiss/`** – 1456 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/fruehstueck-ab-60-eiweiss.md`

- `<title>`: Frühstück ab 60: Warum Eiweiß am Morgen so wichtig ist – Ratgeber – Konzept 60+
- h1: Frühstück ab 60: Warum Eiweiß jetzt schon morgens auf den Teller gehört
- h2: Inhalt
- h2: Warum wird Eiweiß im Alter besonders wichtig?
- h2: Wie viel Eiweiß braucht man ab 60?
- h2: Diese Lebensmittel gehören auf einen eiweißreichen Frühstückstisch
  - h3: 1. Quark und Skyr
  - h3: 2. Eier
  - h3: 3. Haferflocken
  - h3: 4. Nüsse und Kerne
  - h3: 5. Käse und Frischkäse
  - h3: 6. Pflanzliche Alternativen
- h2: Drei einfache Frühstücksideen für jeden Tag
  - h3: Frühstück 1: Das fruchtige Kraftpaket
  - h3: Frühstück 2: Herzhaft und sättigend
  - h3: Frühstück 3: Warmes Porridge
- h2: Muss es wirklich schon morgens Eiweiß sein?
- h2: Eiweiß allein reicht nicht: Was gehört zu einem ausgewogenen Frühstück?
- h2: Bewegung macht den Unterschied
- h2: Fazit: Ein gutes Frühstück ist ein einfacher Anfang
- h2: Gut informiert und aktiv durchs Leben
- h2: Sie suchen Unterstützung zum Thema Freizeit und Lebensqualität?
- h2: Weitere Beiträge
  - h3: Fit ab 60: Welche Lebensmittel jetzt besonders wertvoll für Ihren Körper sind
  - h3: Gesund und fit im Alter: Was Sie selbst für Ihr Wohlbefinden tun können
  - h3: Gemeinsam statt einsam: Warum soziale Kontakte im Alter so wichtig sind

**`/ratgeber/gemeinsam-statt-einsam/`** – 593 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/gemeinsam-statt-einsam.md`

- `<title>`: Gemeinsam statt einsam: Warum soziale Kontakte im Alter so wichtig sind – Ratgeber – Konzept 60+
- h1: Gemeinsam statt einsam: Warum soziale Kontakte im Alter so wichtig sind
- h2: Inhalt
- h2: 1. Freundschaften bewusst pflegen
- h2: 2. Neue Menschen kennenlernen
- h2: 3. Gemeinsam aktiv bleiben
- h2: 4. Auch digitale Kontakte nutzen
- h2: 5. Hilfe annehmen und auf andere zugehen
- h2: Kleine Begegnungen machen einen großen Unterschied
- h2: Sie suchen Unterstützung zum Thema Freizeit und Lebensqualität?
- h2: Weitere Beiträge
  - h3: Frühstück ab 60: Warum Eiweiß jetzt schon morgens auf den Teller gehört
  - h3: Fit ab 60: Welche Lebensmittel jetzt besonders wertvoll für Ihren Körper sind
  - h3: Gesund und fit im Alter: Was Sie selbst für Ihr Wohlbefinden tun können

**`/ratgeber/gesund-und-fit-im-alter/`** – 770 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/gesund-und-fit-im-alter.md`

- `<title>`: Gesund und fit im Alter: Was Sie selbst für Ihr Wohlbefinden tun können – Ratgeber – Konzept 60+
- h1: Gesund und fit im Alter: Was Sie selbst für Ihr Wohlbefinden tun können
- h2: Inhalt
- h2: 1. Bewegung hält Körper und Geist in Schwung
- h2: 2. Ausgewogen essen und ausreichend trinken
- h2: 3. Vorsorgeuntersuchungen wahrnehmen
- h2: 4. Auf ausreichend Schlaf und Erholung achten
- h2: 5. Kontakte und geistige Aktivität pflegen
- h2: 6. Sicherheit im Alltag nicht vergessen
- h2: Gesundheit ist keine Frage des Alters allein
- h2: Sie suchen Unterstützung zum Thema Freizeit und Lebensqualität?
- h2: Weitere Beiträge
  - h3: Frühstück ab 60: Warum Eiweiß jetzt schon morgens auf den Teller gehört
  - h3: Fit ab 60: Welche Lebensmittel jetzt besonders wertvoll für Ihren Körper sind
  - h3: Gemeinsam statt einsam: Warum soziale Kontakte im Alter so wichtig sind

**`/ratgeber/haushaltshilfe-betrieb-oder-privat/`** – 908 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/haushaltshilfe-betrieb-oder-privat.md`

- `<title>`: Haushaltshilfe: Betrieb oder privat – was passt zu mir? – Ratgeber – Konzept 60+
- h1: Haushaltshilfe: Betrieb oder privat – was passt zu mir?
- h2: Inhalt
- h2: 1. Haushaltshilfe über einen professionellen Betrieb
- h2: 2. Eine private Haushaltshilfe engagieren
- h2: 3. Was kostet eine Haushaltshilfe?
- h2: 4. Diese Fragen sollten Sie vorab klären
- h2: 5. Was passt am besten zu Ihnen?
- h2: Unser Tipp: Lassen Sie sich Zeit bei der Entscheidung
- h2: Sie suchen Unterstützung zum Thema Haushalt und Reinigung?
- h2: Weitere Beiträge
  - h3: Haushaltshilfe im Alter: Unterstützung, die den Alltag leichter macht
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?
  - h3: Mehrgenerationenhaus: Gemeinsam wohnen, Kosten teilen und Steuervorteile nutzen

**`/ratgeber/haushaltshilfe-im-alter/`** – 627 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/haushaltshilfe-im-alter.md`

- `<title>`: Haushaltshilfe im Alter: Unterstützung, die den Alltag leichter macht – Ratgeber – Konzept 60+
- h1: Haushaltshilfe im Alter: Unterstützung, die den Alltag leichter macht
- h2: Inhalt
- h2: 1. Welche Aufgaben kann eine Haushaltshilfe übernehmen?
- h2: 2. Haushaltshilfe oder Betreuungskraft?
- h2: 3. Wer übernimmt die Kosten?
- h2: 4. Worauf sollte man bei der Auswahl achten?
- h2: 5. Unterstützung annehmen ist kein Zeichen von Schwäche
- h2: Die passende Hilfe finden
- h2: Sie suchen Unterstützung zum Thema Haushalt und Reinigung?
- h2: Weitere Beiträge
  - h3: Haushaltshilfe: Betrieb oder privat – was passt zu mir?
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?
  - h3: Mehrgenerationenhaus: Gemeinsam wohnen, Kosten teilen und Steuervorteile nutzen

**`/ratgeber/hausnotruf-auswahl/`** – 1194 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/hausnotruf-auswahl.md`

- `<title>`: Hausnotruf: Worauf Sie bei der Auswahl achten sollten – Ratgeber – Konzept 60+
- h1: Hausnotruf: Worauf Sie bei der Auswahl achten sollten
- h2: Inhalt
- h2: 1. Was ist ein Hausnotruf und wie funktioniert er?
- h2: 2. Welche Hausnotrufsysteme gibt es?
  - h3: Der klassische Hausnotruf
  - h3: Mobile Notrufsysteme
  - h3: Notrufuhren und intelligente Assistenzsysteme
- h2: 3. Welche Kosten entstehen?
- h2: 4. Worauf sollten Sie bei der Auswahl achten?
  - h3: Die Notrufzentrale
  - h3: Die Technik
  - h3: Die Reichweite
  - h3: Die Zusatzleistungen
  - h3: Vertrag und Kosten
- h2: 5. Was passiert, wenn Sie den Notruf auslösen?
- h2: 6. Welches System passt zu Ihnen?
- h2: Unser Tipp: Vergleichen Sie nicht nur den Preis
- h2: Sie suchen Unterstützung zum Thema Technik und Sicherheit?
- h2: Weitere Beiträge
  - h3: Vorsicht vor Betrug: So schützen Sie sich am Telefon und an der Haustür
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?
  - h3: Mehrgenerationenhaus: Gemeinsam wohnen, Kosten teilen und Steuervorteile nutzen

**`/ratgeber/`** – 837 Wörter, Quelle `templates/ratgeber.html`

- `<title>`: Ratgeber – Konzept 60+
- h1: Wissen, das weiterhilft
- h2: Alle Beiträge
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?
  - h3: Mehrgenerationenhaus: Gemeinsam wohnen, Kosten teilen und Steuervorteile nutzen
  - h3: Frühstück ab 60: Warum Eiweiß jetzt schon morgens auf den Teller gehört
  - h3: Rente reicht nicht? Diese finanziellen Hilfen und Ansprüche sollten ältere Menschen kennen
  - h3: Kurzzeitpflege: Wenn Pflege vorübergehend nicht zu Hause möglich ist
  - h3: Fit ab 60: Welche Lebensmittel jetzt besonders wertvoll für Ihren Körper sind
  - h3: Patientenverfügung und Vorsorgevollmacht: Wer entscheidet, wenn ich es selbst nicht mehr kann?
  - h3: Pflege 2027: Was sich zum 1. Januar ändern soll
  - h3: Altersgerechter Umbau: So bleibt das eigene Zuhause ein Zuhause
  - h3: Krankenfahrten: Sicher und zuverlässig zum Arzt oder zur Therapie
  - h3: Pflegegrad beantragen: Schritt für Schritt zum richtigen Pflegegrad
  - h3: Gesund und fit im Alter: Was Sie selbst für Ihr Wohlbefinden tun können
  - h3: Haushaltshilfe im Alter: Unterstützung, die den Alltag leichter macht
  - h3: Vorsicht vor Betrug: So schützen Sie sich am Telefon und an der Haustür
  - h3: Gemeinsam statt einsam: Warum soziale Kontakte im Alter so wichtig sind
  - h3: Barrierefrei wohnen: Kleine Veränderungen, große Wirkung
  - h3: Gut organisiert und selbstbestimmt: 5 Dinge, die den Alltag leichter machen
  - h3: Hausnotruf: Worauf Sie bei der Auswahl achten sollten
  - h3: Treppenlift: Was Sie vor dem Einbau wissen sollten
  - h3: Haushaltshilfe: Betrieb oder privat – was passt zu mir?
  - h3: Eltern aus der Ferne unterstützen: Ein Leitfaden für Angehörige

**`/ratgeber/krankenfahrten/`** – 826 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/krankenfahrten.md`

- `<title>`: Krankenfahrten: Sicher und zuverlässig zum Arzt oder zur Therapie – Ratgeber – Konzept 60+
- h1: Krankenfahrten: Sicher und zuverlässig zum Arzt oder zur Therapie
- h2: Inhalt
- h2: 1. Was ist eine Krankenfahrt?
- h2: 2. Wann übernimmt die Krankenkasse die Kosten?
- h2: 3. Brauche ich eine ärztliche Verordnung?
- h2: 4. Welche Kosten müssen selbst getragen werden?
- h2: 5. Krankenfahrt oder Krankentransport: Was ist der Unterschied?
- h2: 6. Worauf sollte man bei der Buchung achten?
- h2: Gut ankommen und entspannt behandelt werden
- h2: Sie suchen Unterstützung zum Thema Alltag und persönliche Hilfe?
- h2: Weitere Beiträge
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?
  - h3: Rente reicht nicht? Diese finanziellen Hilfen und Ansprüche sollten ältere Menschen kennen
  - h3: Patientenverfügung und Vorsorgevollmacht: Wer entscheidet, wenn ich es selbst nicht mehr kann?

**`/ratgeber/kurzzeitpflege/`** – 1230 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/kurzzeitpflege.md`

- `<title>`: Kurzzeitpflege: Wenn Pflege vorübergehend nicht zu Hause möglich ist – Ratgeber – Konzept 60+
- h1: Kurzzeitpflege: Wenn Pflege vorübergehend nicht zu Hause möglich ist
- h2: Inhalt
- h2: Was ist Kurzzeitpflege?
- h2: Wer hat Anspruch auf Kurzzeitpflege?
- h2: Wie lange kann Kurzzeitpflege genutzt werden?
- h2: Wie viel zahlt die Pflegekasse ab 2027?
- h2: Welche Kosten übernimmt die Pflegekasse?
- h2: Was passiert mit den laufenden Leistungen während der Kurzzeitpflege?
- h2: Wie findet man einen passenden Kurzzeitpflegeplatz?
- h2: Was sollte man vor dem Aufenthalt vorbereiten?
- h2: Kurzzeitpflege oder Ersatzpflege zu Hause: Was ist der Unterschied?
- h2: Wie geht es nach der Kurzzeitpflege weiter?
- h2: Wir helfen: Unterstützung finden und den Alltag organisieren
- h2: Sie suchen Unterstützung zum Thema Pflege und Betreuung?
- h2: Weitere Beiträge
  - h3: Pflege 2027: Was sich zum 1. Januar ändern soll
  - h3: Pflegegrad beantragen: Schritt für Schritt zum richtigen Pflegegrad
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?

**`/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/`** – 5338 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen.md`

- `<title>`: Mehrgenerationenhaus: Kosten, Steuern und Vorteile – Ratgeber – Konzept 60+
- h1: Mehrgenerationenhaus: Gemeinsam wohnen, Kosten teilen und Steuervorteile nutzen
- h2: Inhalt
- h2: 1. Was bedeutet Mehrgenerationenwohnen eigentlich?
  - h3: Wohnform 1: Ein gemeinsames Haus mit getrennten Wohnbereichen
  - h3: Wohnform 2: Ein Haus mit zwei oder mehreren abgeschlossenen Wohnungen
  - h3: Wohnform 3: Umbau eines bestehenden Hauses
  - h3: Wohnform 4: Gemeinsam geplante Neubauprojekte
  - h3: Wohnform 5: Gemeinschaftliche Wohnprojekte mit mehreren Parteien
- h2: 2. Warum entscheiden sich Familien für ein Mehrgenerationenhaus?
  - h3: Unterstützung im Alltag
  - h3: Möglichst lange selbstständig wohnen
  - h3: Finanzielle Entlastung
  - h3: Soziale Nähe und weniger Einsamkeit
- h2: 3. Welche Voraussetzungen sollte ein Mehrgenerationenhaus erfüllen?
  - h3: Die richtige Immobilie
  - h3: Barrierefreiheit von Anfang an berücksichtigen
  - h3: Die Lage muss zum Alltag passen
  - h3: Baurechtliche Voraussetzungen prüfen
- h2: 4. Aufgaben- und Kostenverteilung: Der wichtigste Punkt für ein harmonisches Zusammenleben
  - h3: Welche Aufgaben fallen an?
  - h3: Wie werden die laufenden Kosten aufgeteilt?
  - h3: Beispiel für eine monatliche Kostenverteilung
  - h3: Wer bezahlt Reparaturen und größere Investitionen?
- h2: 5. Steuerliche Vorteile beim Mehrgenerationenwohnen
  - h3: 5.1 Haushaltsnahe Dienstleistungen: Bis zu 4.000 Euro Steuerermäßigung
  - h3: 5.2 Minijob im Haushalt: Bis zu 510 Euro Steuerermäßigung
  - h3: 5.3 Handwerkerleistungen: Ab 2027 voraussichtlich bis zu 900 Euro Steuerermäßigung
  - h3: 5.4 Pflege und Betreuung: Steuerliche Entlastung für Familien
  - h3: 5.5 Pflege-Pauschbetrag: Wenn Angehörige unentgeltlich pflegen
  - h3: 5.6 Steuerliche Vorteile bei Vermietung innerhalb der Familie
  - h3: 5.7 Schenkung und Erbschaft: Das Haus rechtzeitig regeln
- h2: 6. Welche Fördermittel gibt es für ein Mehrgenerationenhaus?
  - h3: 6.1 Zuschuss der Pflegekasse für wohnumfeldverbessernde Maßnahmen
  - h3: 6.2 KfW-Förderung für altersgerechtes Umbauen
  - h3: 6.3 Förderungen für energetische Sanierungen
- h2: 7. Rechtliche Gestaltung: Wem gehört das Haus und wer darf dort wohnen?
  - h3: Variante 1: Eine Generation besitzt das Haus
  - h3: Variante 2: Mehrere Generationen sind gemeinsam Eigentümer
  - h3: Variante 3: Eine Generation vermietet an die andere
  - h3: Wohnrecht und Nießbrauch
- h2: 8. Was passiert, wenn ein Bewohner pflegebedürftig wird?
- h2: 9. Welche Nachteile und Risiken gibt es?
  - h3: Weniger Privatsphäre
  - h3: Unterschiedliche Vorstellungen vom Zusammenleben
  - h3: Ungleiche Belastung
  - h3: Finanzielle Abhängigkeit
  - h3: Veränderungen im Leben
- h2: 10. So planen Sie ein Mehrgenerationenhaus richtig
  - h3: Schritt 1: Alle Beteiligten an einen Tisch holen
  - h3: Schritt 2: Wohnbedürfnisse klären
  - h3: Schritt 3: Immobilie prüfen
  - h3: Schritt 4: Finanzierungsplan erstellen
  - h3: Schritt 5: Kosten- und Aufgabenverteilung vereinbaren
  - h3: Schritt 6: Rechtliche Vereinbarungen treffen
  - h3: Schritt 7: Eine Probephase vereinbaren
  - h3: Schritt 8: Regelmäßig miteinander sprechen
- h2: 11. Beispiel: Wie könnte ein Mehrgenerationenhaus in der Praxis aussehen?
- h2: 12. Checkliste: Ist ein Mehrgenerationenhaus das Richtige für uns?
  - h3: Unser Mehrgenerationen-Check
- h2: 13. Fazit: Ein Zuhause für mehrere Generationen braucht gute Planung
- h2: Wir helfen: Die passende Unterstützung rund ums Wohnen finden
- h2: Quellen und offizielle Formulare
- h2: Sie suchen Unterstützung zum Thema Wohnen, Haus und Handwerk?
- h2: Weitere Beiträge
  - h3: Altersgerechter Umbau: So bleibt das eigene Zuhause ein Zuhause
  - h3: Barrierefrei wohnen: Kleine Veränderungen, große Wirkung
  - h3: Treppenlift: Was Sie vor dem Einbau wissen sollten

**`/ratgeber/mobilitaet-im-alter-ohne-auto/`** – 5042 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/mobilitaet-im-alter-ohne-auto.md`

- `<title>`: Mobilität im Alter: Unabhängig ohne eigenes Auto – Ratgeber – Konzept 60+
- h1: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?
- h2: Inhalt
- h2: 1. Warum Mobilität im Alter so wichtig ist
- h2: 2. Wann ist es sinnvoll, das Autofahren aufzugeben?
  - h3: Warnzeichen, die ernst genommen werden sollten
  - h3: Gibt es eine verpflichtende Fahrtauglichkeitsprüfung ab einem bestimmten Alter?
- h2: 3. Bus und Bahn: Die wichtigste Alternative zum eigenen Auto
  - h3: Welche Verkehrsmittel gehören zum ÖPNV?
  - h3: Was kostet die Nutzung?
  - h3: Deutschlandticket: Preis ab 2027
  - h3: Gibt es besondere Seniorentickets?
  - h3: Bus und Bahn barrierefrei nutzen
  - h3: Die erste Fahrt gemeinsam üben
- h2: 4. Bürgerbus, Rufbus und TaxiBus: Mobilität auch auf dem Land
  - h3: Bürgerbus: Von Bürgern für Bürger
  - h3: Rufbus: Der Bus kommt nur bei Bedarf
  - h3: TaxiBus und Anruf-Sammeltaxi
- h2: 5. Taxi und private Fahrdienste: Wenn es direkt und bequem sein soll
  - h3: Taxi
  - h3: Spezielle Fahrdienste für ältere und mobilitätseingeschränkte Menschen
- h2: 6. Krankenfahrten: Wann übernimmt die Krankenkasse die Kosten?
  - h3: Was ist eine Krankenfahrt?
  - h3: Was ist ein Krankentransport?
  - h3: Wann übernimmt die Krankenkasse die Kosten?
  - h3: Brauche ich eine ärztliche Verordnung?
  - h3: Wie hoch ist die Zuzahlung?
- h2: 7. Schwerbehindertenausweis: Vergünstigungen bei Bus und Bahn
  - h3: Welche Merkzeichen berechtigen zur unentgeltlichen Beförderung?
  - h3: Was kostet die Wertmarke?
  - h3: Darf eine Begleitperson kostenlos mitfahren?
- h2: 8. Zu Fuß unterwegs: Die unterschätzte Form der Mobilität
  - h3: Worauf sollten Sie achten?
  - h3: Rollator: Mehr Sicherheit und Bewegungsfreiheit
- h2: 9. Fahrrad, E-Bike und Pedelec: Auch im Alter mobil bleiben
  - h3: Vorteile eines Pedelecs
  - h3: Worauf sollten ältere Fahrer achten?
- h2: 10. Nachbarschaftshilfe und ehrenamtliche Fahrdienste
  - h3: Wo findet man solche Angebote?
  - h3: Was sollte vorher geklärt werden?
- h2: 11. Angehörige unterstützen: Gemeinsam Mobilität organisieren
  - h3: Eine einfache Wochenplanung
- h2: 12. Mobilitäts-Apps und digitale Fahrpläne: Hilfe oder Hindernis?
  - h3: Nützliche digitale Helfer
  - h3: Was ist bei der Nutzung wichtig?
  - h3: Nicht alles muss digital sein
- h2: 13. Barrierefrei mit der Deutschen Bahn reisen
  - h3: Mobilitätsservice-Zentrale der Deutschen Bahn
- h2: 14. Was kostet Mobilität ohne eigenes Auto?
  - h3: Beispiel: Monatliche Kosten eines eigenen Autos
  - h3: Beispiel: Mobilität ohne eigenes Auto
- h2: 15. Welche finanzielle Unterstützung gibt es?
  - h3: Sozialticket und vergünstigte Fahrkarten
  - h3: Unentgeltliche Beförderung bei Schwerbehinderung
  - h3: Krankenfahrten über die Krankenkasse
  - h3: Fahrdienste der Kommunen und gemeinnütziger Organisationen
  - h3: Mobilität als Teil der sozialen Teilhabe
- h2: 16. Wie finde ich passende Mobilitätsangebote in meiner Nähe?
- h2: 17. Praktischer Mobilitätsplan: So bleiben Sie unabhängig
  - h3: Schritt 1: Den eigenen Bedarf ermitteln
  - h3: Schritt 2: Angebote in der Umgebung prüfen
  - h3: Schritt 3: Kosten vergleichen
  - h3: Schritt 4: Unterstützung organisieren
  - h3: Schritt 5: Die neuen Wege ausprobieren
  - h3: Schritt 6: Notfallplan erstellen
  - h3: Ihre Checkliste zum Abhaken
- h2: 18. Häufige Fragen zur Mobilität im Alter
  - h3: Darf ich im Alter unbegrenzt Auto fahren?
  - h3: Gibt es ein kostenloses Seniorenticket?
  - h3: Kann ich mit einem Schwerbehindertenausweis kostenlos Bus und Bahn fahren?
  - h3: Übernimmt die Krankenkasse Taxifahrten zum Arzt?
  - h3: Wer bezahlt einen Fahrdienst für Senioren?
  - h3: Was kann ich tun, wenn ich auf dem Land wohne und kein Bus fährt?
  - h3: Gibt es Unterstützung, wenn ich einen Rollator benötige?
- h2: 19. Fazit: Unabhängig bleiben, auch ohne eigenes Auto
- h2: Wir helfen: Gemeinsam passende Mobilitätsangebote finden
- h2: Quellen und offizielle Formulare
- h2: Sie suchen Unterstützung zum Thema Alltag und persönliche Hilfe?
- h2: Weitere Beiträge
  - h3: Rente reicht nicht? Diese finanziellen Hilfen und Ansprüche sollten ältere Menschen kennen
  - h3: Patientenverfügung und Vorsorgevollmacht: Wer entscheidet, wenn ich es selbst nicht mehr kann?
  - h3: Krankenfahrten: Sicher und zuverlässig zum Arzt oder zur Therapie

**`/ratgeber/patientenverfuegung-vorsorgevollmacht/`** – 2960 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/patientenverfuegung-vorsorgevollmacht.md`

- `<title>`: Patientenverfügung und Vorsorgevollmacht: Das sollten Sie wissen – Ratgeber – Konzept 60+
- h1: Patientenverfügung und Vorsorgevollmacht: Wer entscheidet, wenn ich es selbst nicht mehr kann?
- h2: Inhalt
- h2: 1. Warum rechtzeitige Vorsorge so wichtig ist
- h2: 2. Die Patientenverfügung: Sie bestimmen, welche Behandlung Sie wünschen
  - h3: In welchen Situationen gilt eine Patientenverfügung?
  - h3: Ist eine Patientenverfügung verbindlich?
- h2: 3. Die Vorsorgevollmacht: Sie bestimmen, wer für Sie handeln darf
  - h3: Muss die Vorsorgevollmacht notariell beglaubigt werden?
- h2: 4. Patientenverfügung und Vorsorgevollmacht: Wo liegt der Unterschied?
- h2: 5. Die Betreuungsverfügung: Eine wichtige dritte Möglichkeit
- h2: 6. Was passiert, wenn ich keine Vorsorge getroffen habe?
  - h3: Das Ehegattennotvertretungsrecht: Was Ehepartner wissen sollten
- h2: 7. Die häufigsten Fehler bei der Vorsorge
  - h3: Fehler 1: Zu allgemeine Formulierungen
  - h3: Fehler 2: Die bevollmächtigte Person weiß nichts davon
  - h3: Fehler 3: Die Dokumente sind nicht auffindbar
  - h3: Fehler 4: Es gibt keine Vertretung für den Ernstfall
  - h3: Fehler 5: Die Bankvollmacht fehlt
  - h3: Fehler 6: Die Dokumente werden nie wieder überprüft
  - h3: Fehler 7: Die Registrierung wird mit der Vollmacht verwechselt
- h2: 8. Wo und wie bewahre ich meine Dokumente auf?
- h2: 9. Wie erstelle ich meine Vorsorgedokumente?
  - h3: Schritt 1: Eigene Wünsche überlegen
  - h3: Schritt 2: Mit einer Vertrauensperson sprechen
  - h3: Schritt 3: Offizielle Vorlagen nutzen
  - h3: Schritt 4: Ärztlich beraten lassen
  - h3: Schritt 5: Unterschreiben und zugänglich aufbewahren
- h2: 10. Praktische Checkliste: Bin ich gut vorbereitet?
- h2: Fazit: Vorsorge ist ein Stück Selbstbestimmung
- h2: Gut vorbereitet in die Zukunft
- h2: Quellen und offizielle Formulare
- h2: Sie suchen Unterstützung zum Thema Alltag und persönliche Hilfe?
- h2: Weitere Beiträge
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?
  - h3: Rente reicht nicht? Diese finanziellen Hilfen und Ansprüche sollten ältere Menschen kennen
  - h3: Krankenfahrten: Sicher und zuverlässig zum Arzt oder zur Therapie

**`/ratgeber/pflegegrad-beantragen/`** – 1027 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/pflegegrad-beantragen.md`

- `<title>`: Pflegegrad beantragen: Schritt für Schritt zum richtigen Pflegegrad – Ratgeber – Konzept 60+
- h1: Pflegegrad beantragen: Schritt für Schritt zum richtigen Pflegegrad
- h2: Inhalt
- h2: 1. Wann ist ein Pflegegrad sinnvoll?
- h2: 2. Antrag bei der Pflegekasse stellen
- h2: 3. Vorbereitung auf die Begutachtung
- h2: 4. Diese sechs Lebensbereiche werden bewertet
- h2: 5. Welche Pflegegrade gibt es?
- h2: 6. Wann kommt die Entscheidung?
- h2: 7. Was tun, wenn der Pflegegrad zu niedrig ist?
- h2: 8. Welche Unterstützung gibt es nach der Einstufung?
- h2: Frühzeitig Hilfe organisieren
- h2: Sie suchen Unterstützung zum Thema Pflege und Betreuung?
- h2: Weitere Beiträge
  - h3: Kurzzeitpflege: Wenn Pflege vorübergehend nicht zu Hause möglich ist
  - h3: Pflege 2027: Was sich zum 1. Januar ändern soll
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?

**`/ratgeber/pflegereform-2027/`** – 1226 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/pflegereform-2027.md`

- `<title>`: Pflege 2027: Was sich zum 1. Januar ändern soll – Ratgeber – Konzept 60+
- h1: Pflege 2027: Was sich zum 1. Januar ändern soll
- h2: Inhalt
- h2: 1. Pflegeleistungen werden neu geordnet
- h2: 2. Neue monatliche Budgets für Pflegebedürftige
  - h3: Was bedeuten die neuen Budgets?
- h2: 3. Neues Sozialraumbudget statt Entlastungsbetrag
- h2: 4. Neues Überbrückungsbudget für Notfälle
- h2: 5. Änderungen bei den Pflegegraden
  - h3: Was bedeutet das für Menschen mit bestehendem Pflegegrad?
- h2: 6. Was ändert sich für Menschen mit Pflegegrad 1?
- h2: 7. Höhere Beiträge für Kinderlose
- h2: 8. Mehr Unterstützung und digitale Angebote
- h2: 9. Was sollten Pflegebedürftige und Angehörige jetzt tun?
- h2: Unser Fazit: Gut informiert in die Pflegezukunft
- h2: Sie suchen Unterstützung zum Thema Pflege und Betreuung?
- h2: Weitere Beiträge
  - h3: Kurzzeitpflege: Wenn Pflege vorübergehend nicht zu Hause möglich ist
  - h3: Pflegegrad beantragen: Schritt für Schritt zum richtigen Pflegegrad
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?

**`/ratgeber/rente-reicht-nicht-finanzielle-hilfen/`** – 4816 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/rente-reicht-nicht-finanzielle-hilfen.md`

- `<title>`: Rente reicht nicht? Diese finanziellen Hilfen gibt es – Ratgeber – Konzept 60+
- h1: Rente reicht nicht? Diese finanziellen Hilfen und Ansprüche sollten ältere Menschen kennen
- h2: Inhalt
- h2: 1. Grundsicherung im Alter: Wenn die Rente nicht zum Leben reicht
  - h3: Wer hat Anspruch auf Grundsicherung im Alter?
  - h3: Welche Kosten übernimmt die Grundsicherung?
  - h3: Ein Beispiel: Wie wird die Grundsicherung berechnet?
  - h3: Muss ich mein Erspartes aufbrauchen?
  - h3: Müssen meine Kinder für meine Grundsicherung bezahlen?
  - h3: Wo beantrage ich Grundsicherung?
- h2: 2. Wohngeld: Ein Zuschuss zur Miete oder zum eigenen Haus
  - h3: Wer kann Wohngeld erhalten?
  - h3: Wie viel Wohngeld kann ich bekommen?
  - h3: Kann ich Wohngeld und Grundsicherung gleichzeitig bekommen?
  - h3: Wo beantrage ich Wohngeld?
- h2: 3. Hilfe zur Pflege: Wenn die Pflegekosten die Rente übersteigen
  - h3: Wer kann Hilfe zur Pflege bekommen?
  - h3: Welche Kosten können übernommen werden?
  - h3: Muss ich mein Haus verkaufen, wenn ich ins Pflegeheim muss?
  - h3: Müssen meine Kinder die Pflegekosten bezahlen?
  - h3: Wo beantrage ich Hilfe zur Pflege?
- h2: 4. Grundrente: Ein Zuschlag für Menschen mit langjähriger Versicherungszeit
  - h3: Wer kann einen Grundrentenzuschlag erhalten?
  - h3: Muss ich die Grundrente beantragen?
  - h3: Wichtig: Grundrentenzeiten können auch bei anderen Sozialleistungen helfen
- h2: 5. Befreiung vom Rundfunkbeitrag
  - h3: Wer kann sich befreien lassen?
  - h3: Was ist ein besonderer Härtefall?
  - h3: Wie beantrage ich die Befreiung?
- h2: 6. Befreiung von Zuzahlungen bei Medikamenten und medizinischen Leistungen
  - h3: Wie hoch ist die Belastungsgrenze?
  - h3: Beispiel für eine Befreiung
  - h3: Was gilt als schwerwiegend chronisch krank?
- h2: 7. Zuschüsse für einen altersgerechten Umbau der Wohnung
  - h3: Zuschuss der Pflegekasse für wohnumfeldverbessernde Maßnahmen
  - h3: Förderung durch die KfW
- h2: 8. Pflegehilfsmittel und Unterstützung im Alltag: Zusätzliche Leistungen nicht verschenken
  - h3: Pflegehilfsmittel zum Verbrauch
  - h3: Sozialraumbudget statt Entlastungsbetrag
  - h3: Hausnotruf
- h2: 9. Weitere finanzielle Entlastungen, die viele ältere Menschen nicht kennen
  - h3: Sozialtarife und Vergünstigungen beim Telefon
  - h3: Ermäßigungen für Menschen mit Schwerbehinderung
  - h3: Steuerliche Entlastungen
  - h3: Unterstützung bei Bestattungskosten
- h2: 10. Pflegewohngeld in Nordrhein-Westfalen: Eine besondere Unterstützung
  - h3: Wer kann Pflegewohngeld erhalten?
  - h3: Wo beantrage ich Pflegewohngeld?
- h2: 11. Welche Leistung ist die richtige? Die wichtigsten Unterschiede im Überblick
- h2: 12. So gehen Sie vor: In fünf Schritten zu möglichen Ansprüchen
  - h3: Schritt 1: Einnahmen und Ausgaben zusammenstellen
  - h3: Schritt 2: Prüfen, welche Leistungen infrage kommen
  - h3: Schritt 3: Unterlagen vorbereiten
  - h3: Schritt 4: Antrag stellen und Unterlagen vollständig einreichen
  - h3: Schritt 5: Bescheid prüfen lassen
- h2: 13. Wo bekomme ich Hilfe und Beratung?
- h2: 14. Fazit: Wer seine Ansprüche kennt, kann im Alter finanziell entlastet werden
- h2: Wir helfen: Unterstützung in Ihrer Nähe finden
- h2: Quellen und offizielle Formulare
- h2: Sie suchen Unterstützung zum Thema Alltag und persönliche Hilfe?
- h2: Weitere Beiträge
  - h3: Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig?
  - h3: Patientenverfügung und Vorsorgevollmacht: Wer entscheidet, wenn ich es selbst nicht mehr kann?
  - h3: Krankenfahrten: Sicher und zuverlässig zum Arzt oder zur Therapie

**`/ratgeber/treppenlift-einbau/`** – 1483 Wörter, Quelle `templates/ratgeber-beitrag.html + content/ratgeber/treppenlift-einbau.md`

- `<title>`: Treppenlift: Was Sie vor dem Einbau wissen sollten – Ratgeber – Konzept 60+
- h1: Treppenlift: Was Sie vor dem Einbau wissen sollten
- h2: Inhalt
- h2: 1. Wann ist ein Treppenlift sinnvoll?
- h2: 2. Welche Treppenlifte gibt es?
  - h3: Sitzlift für gerade Treppen
  - h3: Sitzlift für kurvige Treppen
  - h3: Plattformlift
  - h3: Hublift und Senkrechtlift
- h2: 3. Wie läuft der Einbau ab?
- h2: 4. Welche Kosten entstehen?
- h2: 5. Welche Förderung ist möglich?
  - h3: Zuschuss der Pflegekasse
  - h3: Förderkredit der KfW
  - h3: Steuerliche Entlastung
- h2: 6. Treppenlift in der Mietwohnung
- h2: 7. Worauf sollten Sie bei Angeboten achten?
  - h3: Sicherheit und Technik
  - h3: Service und Vertrag
- h2: 8. Welche Lösung passt zu Ihnen?
- h2: Unser Tipp: Vergleichen Sie in Ruhe
- h2: Sie suchen Unterstützung zum Thema Wohnen, Haus und Handwerk?
- h2: Weitere Beiträge
  - h3: Mehrgenerationenhaus: Gemeinsam wohnen, Kosten teilen und Steuervorteile nutzen
  - h3: Altersgerechter Umbau: So bleibt das eigene Zuhause ein Zuhause
  - h3: Barrierefrei wohnen: Kleine Veränderungen, große Wirkung

**`/themen/alltag-persoenliche-hilfe/`** – 299 Wörter, Quelle `templates/thema.html + data/themen.json`

- `<title>`: Alltag und persönliche Hilfe – Themen – Konzept 60+
- h1: Alltag und persönliche Hilfe
- h2: Mögliche Unterstützungsangebote
- h2: Beispiele für konkrete Leistungen
- h2: Passender Ratgeber
- h2: Bei uns landen Sie nicht in einer anonymen Datenbank.
- h2: Weitere Themen

**`/themen/freizeit-lebensqualitaet/`** – 285 Wörter, Quelle `templates/thema.html + data/themen.json`

- `<title>`: Freizeit und Lebensqualität – Themen – Konzept 60+
- h1: Freizeit und Lebensqualität
- h2: Mögliche Unterstützungsangebote
- h2: Beispiele für konkrete Leistungen
- h2: Passender Ratgeber
- h2: Bei uns landen Sie nicht in einer anonymen Datenbank.
- h2: Weitere Themen

**`/themen/haushalt-reinigung/`** – 266 Wörter, Quelle `templates/thema.html + data/themen.json`

- `<title>`: Haushalt und Reinigung – Themen – Konzept 60+
- h1: Haushalt und Reinigung
- h2: Mögliche Unterstützungsangebote
- h2: Beispiele für konkrete Leistungen
- h2: Passender Ratgeber
- h2: Bei uns landen Sie nicht in einer anonymen Datenbank.
- h2: Weitere Themen

**`/themen/`** – 235 Wörter, Quelle `templates/themen.html`

- `<title>`: Themen – Konzept 60+
- h1: Wobei dürfen wir helfen?
- h2: Wohnen, Haus und Handwerk
- h2: Haushalt und Reinigung
- h2: Pflege und Betreuung
- h2: Alltag und persönliche Hilfe
- h2: Technik und Sicherheit
- h2: Freizeit und Lebensqualität

**`/themen/pflege-betreuung/`** – 307 Wörter, Quelle `templates/thema.html + data/themen.json`

- `<title>`: Pflege und Betreuung – Themen – Konzept 60+
- h1: Pflege und Betreuung
- h2: Mögliche Unterstützungsangebote
- h2: Beispiele für konkrete Leistungen
- h2: Passender Ratgeber
- h2: Bei uns landen Sie nicht in einer anonymen Datenbank.
- h2: Weitere Themen

**`/themen/technik-sicherheit/`** – 256 Wörter, Quelle `templates/thema.html + data/themen.json`

- `<title>`: Technik und Sicherheit – Themen – Konzept 60+
- h1: Technik und Sicherheit
- h2: Mögliche Unterstützungsangebote
- h2: Beispiele für konkrete Leistungen
- h2: Passender Ratgeber
- h2: Bei uns landen Sie nicht in einer anonymen Datenbank.
- h2: Weitere Themen

**`/themen/wohnen-haus-handwerk/`** – 284 Wörter, Quelle `templates/thema.html + data/themen.json`

- `<title>`: Wohnen, Haus und Handwerk – Themen – Konzept 60+
- h1: Wohnen, Haus und Handwerk
- h2: Mögliche Unterstützungsangebote
- h2: Beispiele für konkrete Leistungen
- h2: Passender Ratgeber
- h2: Bei uns landen Sie nicht in einer anonymen Datenbank.
- h2: Weitere Themen

**`/veranstaltungen/`** – 1607 Wörter, Quelle `templates/veranstaltungen.html`

- `<title>`: Veranstaltungen für Sie – Konzept 60+
- h1: Veranstaltungen für Sie
- h2: Alle Veranstaltungen
  - h3: Veranstaltungen eingrenzen
- h2: Dienstag, 24. November 2026
  - h3: Vortrag: Plastik und Mikroplastik im Alltag
- h2: Mittwoch, 25. November 2026
  - h3: Tipps aus dem ThEO: Aromapflege bei Magen- und Darmbeschwerden
  - h3: Polizei-Sprechstunde und Sicherheitstipps
  - h3: KI und ich: Einstieg für Menschen ab 60
- h2: Donnerstag, 26. November 2026
  - h3: Adventsbasar vor dem Kaufhaus Wertvoll
- h2: Freitag, 27. November 2026
  - h3: Adventskranz binden
  - h3: Singkreis mit Kaffee und Kuchen
- h2: Samstag, 28. November 2026
  - h3: Orgelkonzert: Mit Bach in den Advent
- h2: Montag, 30. November 2026
  - h3: Kurs „Leben mit Demenz“
- h2: Dienstag, 1. Dezember 2026
  - h3: Seniorensingen
- h2: Samstag, 5. Dezember 2026
  - h3: Flusen im Kopf: Alltag mit Demenz gestalten
- h2: Montag, 7. Dezember 2026
  - h3: Handy- und Smartphone-Sprechstunde
- h2: Dienstag, 8. Dezember 2026
  - h3: Adventslieder singen und Adventsfeier
  - h3: Adventskonzert des Chors Ton-Art
- h2: Mittwoch, 9. Dezember 2026
  - h3: Patientenverfügung und Vorsorgevollmacht
  - h3: Vortrag: Schmerzen bei Demenz erkennen
- h2: Freitag, 11. Dezember 2026
  - h3: Weihnachtsfeier mit Adventsbasar
- h2: Sonntag, 13. Dezember 2026
  - h3: Konzert des Gospel- und Kirchenchors
- h2: Montag, 14. Dezember 2026
  - h3: Weihnachtsdisco mit Musik und Tanz
- h2: Mittwoch, 16. Dezember 2026
  - h3: Gerontopsychiatrische Sprechstunde für Angehörige
- h2: Donnerstag, 24. Dezember 2026
  - h3: Heiligabend gemeinsam feiern

**`/veranstaltungen/melden/`** – 388 Wörter, Quelle `templates/veranstaltungen-melden.html`

- `<title>`: Veranstaltung melden – Konzept 60+
- h1: Veranstaltung melden
- h2: So läuft es ab
  - h3: Ihre Veranstaltung
  - h3: Bitte prüfen Sie Ihre Angaben
  - h3: Fast geschafft: Bitte noch auf „Senden“ tippen

## 2. Ratgeber

21 Beiträge in `content/ratgeber/*.md` (Frontmatter + Markdown), generiert nach `ratgeber/<slug>/index.html`; die Übersicht `ratgeber/index.html` listet alle 21 Beiträge laut `data/ratgeber.json`. „Interne Links“ = Zahl der Links im Beitragstext (`.article__body`) auf Seiten der eigenen Domain; in Klammern die eindeutigen Ziele. „Bild“ = Titelbild (`bild:`) und ggf. Bild im Text (`inline_bild:`), jeweils unter `assets/img/ratgeber/`.

| Slug | Titel | Thema/Kategorie | Veröffentlicht | Geändert | Stand (Frontmatter) | Bild | Wörter (Beitragstext) | h2 | Interne Links im Text |
|---|---|---|---|---|---|---|---|---|---|
| `alltag-gut-organisiert` | Gut organisiert und selbstbestimmt: 5 Dinge, die den Alltag leichter machen | Alltag und persönliche Hilfe (`alltag-persoenliche-hilfe`) | 2026-11-20 15:30 | 2026-11-20 | November 2026 | alltag-gut-organisiert + Text: alltag-medikamente-wochenbox | 421 | 9 | 0 (0) |
| `altersgerechter-umbau` | Altersgerechter Umbau: So bleibt das eigene Zuhause ein Zuhause | Wohnen, Haus und Handwerk (`wohnen-haus-handwerk`) | 2026-11-20 17:05 | 2026-11-20 | November 2026 | altersgerechter-umbau + Text: altersgerechter-umbau-foerderung | 572 | 10 | 2 (2) |
| `barrierefrei-wohnen` | Barrierefrei wohnen: Kleine Veränderungen, große Wirkung | Wohnen, Haus und Handwerk (`wohnen-haus-handwerk`) | 2026-11-20 16:15 | 2026-11-20 | November 2026 | barrierefrei-wohnen + Text: barrierefrei-wohnen-bad | 328 | 9 | 1 (1) |
| `betrug-telefon-haustuer` | Vorsicht vor Betrug: So schützen Sie sich am Telefon und an der Haustür | Technik und Sicherheit (`technik-sicherheit`) | 2026-11-20 16:30 | 2026-11-20 | November 2026 | betrug-telefon-haustuer | 416 | 10 | 0 (0) |
| `eltern-aus-der-ferne-unterstuetzen` | Eltern aus der Ferne unterstützen: Ein Leitfaden für Angehörige | Alltag und persönliche Hilfe (`alltag-persoenliche-hilfe`) | 2026-11-20 10:00 | 2026-11-20 | November 2026 | eltern-aus-der-ferne-unterstuetzen + Text: eltern-aus-der-ferne-tablet-kueche | 931 | 11 | 0 (0) |
| `ernaehrung-ab-60` | Fit ab 60: Welche Lebensmittel jetzt besonders wertvoll für Ihren Körper sind | Freizeit und Lebensqualität (`freizeit-lebensqualitaet`) | 2026-11-21 18:30 | 2026-11-21 | November 2026 | ernaehrung-ab-60 + Text: ernaehrung-ab-60-kochen | 1291 | 13 | 2 (2) |
| `fruehstueck-ab-60-eiweiss` | Frühstück ab 60: Warum Eiweiß jetzt schon morgens auf den Teller gehört | Freizeit und Lebensqualität (`freizeit-lebensqualitaet`) | 2026-11-21 19:00 | 2026-11-21 | November 2026 | fruehstueck-ab-60-garten + Text: fruehstueck-ab-60-nordic-walking | 1182 | 12 | 2 (2) |
| `gemeinsam-statt-einsam` | Gemeinsam statt einsam: Warum soziale Kontakte im Alter so wichtig sind | Freizeit und Lebensqualität (`freizeit-lebensqualitaet`) | 2026-11-20 16:50 | 2026-11-20 | November 2026 | gemeinsam-statt-einsam | 348 | 9 | 0 (0) |
| `gesund-und-fit-im-alter` | Gesund und fit im Alter: Was Sie selbst für Ihr Wohlbefinden tun können | Freizeit und Lebensqualität (`freizeit-lebensqualitaet`) | 2026-11-20 16:55 | 2026-11-20 | November 2026 | gesund-und-fit-im-alter + Text: gesund-und-fit-wandern | 508 | 10 | 3 (3) |
| `haushaltshilfe-betrieb-oder-privat` | Haushaltshilfe: Betrieb oder privat – was passt zu mir? | Haushalt und Reinigung (`haushalt-reinigung`) | 2026-11-20 10:01 | 2026-11-20 | November 2026 | haushaltshilfe-betrieb-oder-privat + Text: haushaltshilfe-kosten-sparschwein | 674 | 9 | 0 (0) |
| `haushaltshilfe-im-alter` | Haushaltshilfe im Alter: Unterstützung, die den Alltag leichter macht | Haushalt und Reinigung (`haushalt-reinigung`) | 2026-11-20 16:45 | 2026-11-20 | November 2026 | haushaltshilfe-im-alter | 396 | 9 | 0 (0) |
| `hausnotruf-auswahl` | Hausnotruf: Worauf Sie bei der Auswahl achten sollten | Technik und Sicherheit (`technik-sicherheit`) | 2026-11-20 10:02 | 2026-11-20 | November 2026 | hausnotruf-auswahl | 945 | 10 | 0 (0) |
| `krankenfahrten` | Krankenfahrten: Sicher und zuverlässig zum Arzt oder zur Therapie | Alltag und persönliche Hilfe (`alltag-persoenliche-hilfe`) | 2026-11-20 17:00 | 2026-11-20 | November 2026 | krankenfahrten + Text: krankenfahrten-verordnung | 570 | 10 | 0 (0) |
| `kurzzeitpflege` | Kurzzeitpflege: Wenn Pflege vorübergehend nicht zu Hause möglich ist | Pflege und Betreuung (`pflege-betreuung`) | 2026-11-20 22:00 | 2026-11-20 | November 2026 (geplant ab 2027, Regierungsentwurf) | kurzzeitpflege + Text: kurzzeitpflege-vorbereiten | 964 | 14 | 5 (5) |
| `mehrgenerationenhaus-mehrgenerationenwohnen` | Mehrgenerationenhaus: Gemeinsam wohnen, Kosten teilen und Steuervorteile nutzen | Wohnen, Haus und Handwerk (`wohnen-haus-handwerk`) | 2026-11-23 11:00 | 2026-11-23 | November 2026 (Steueränderungen 2027: Regierungsentwurf) | mehrgenerationenhaus-garten + Text: mehrgenerationenhaus-anbau | mehrgenerationenhaus-altbau-umbau | mehrgenerationenhaus-wohnkueche | mehrgenerationenhaus-bad-bodengleich | mehrgenerationenhaus-zweifamilienhaus | mehrgenerationenhaus-einliegerwohnung | 5019 | 18 | 15 (15) |
| `mobilitaet-im-alter-ohne-auto` | Mobilität im Alter: Wie bleibe ich auch ohne eigenes Auto unabhängig? | Alltag und persönliche Hilfe (`alltag-persoenliche-hilfe`) | 2026-11-23 15:00 | 2026-11-23 | November 2026 (Zuzahlung 2027: angekündigt) | mobilitaet-haltestelle + Text: mobilitaet-fahrdienst-rampe | mobilitaet-rollator | 4669 | 24 | 9 (9) |
| `patientenverfuegung-vorsorgevollmacht` | Patientenverfügung und Vorsorgevollmacht: Wer entscheidet, wenn ich es selbst nicht mehr kann? | Alltag und persönliche Hilfe (`alltag-persoenliche-hilfe`) | 2026-11-23 10:00 | 2026-11-23 | November 2026 | patientenverfuegung-vorsorgevollmacht | 2658 | 16 | 0 (0) |
| `pflegegrad-beantragen` | Pflegegrad beantragen: Schritt für Schritt zum richtigen Pflegegrad | Pflege und Betreuung (`pflege-betreuung`) | 2026-11-20 17:10 | 2026-11-20 | November 2026 | pflegegrad-beantragen + Text: pflegegrad-antrag-schreibtisch | 783 | 12 | 2 (2) |
| `pflegereform-2027` | Pflege 2027: Was sich zum 1. Januar ändern soll | Pflege und Betreuung (`pflege-betreuung`) | 2026-11-20 19:00 | 2026-11-20 | November 2026 (Gesetzentwurf) | pflegereform-2027 | 974 | 13 | 3 (2) |
| `rente-reicht-nicht-finanzielle-hilfen` | Rente reicht nicht? Diese finanziellen Hilfen und Ansprüche sollten ältere Menschen kennen | Alltag und persönliche Hilfe (`alltag-persoenliche-hilfe`) | 2026-11-23 10:00 | 2026-11-23 | November 2026 (Pflegereform 2027: Gesetzentwurf) | rente-reicht-nicht-planung + Text: rente-wohnkosten | rente-fernsehabend | rente-medikamente-zuzahlung | rente-barrierefreies-bad | rente-pflegehilfsmittel | rente-sparen-rechnungen | rente-unterlagen-schreibtisch | 4466 | 19 | 9 (9) |
| `treppenlift-einbau` | Treppenlift: Was Sie vor dem Einbau wissen sollten | Wohnen, Haus und Handwerk (`wohnen-haus-handwerk`) | 2026-11-20 12:00 | 2026-11-20 | November 2026 | treppenlift-einbau + Text: treppenlift-kosten-planen | 1237 | 12 | 0 (0) |

Summe Beitragstext: **29352** Wörter; Median 931; kürzester 328, längster 5019.

Beiträge je Themenbereich: Alltag und persönliche Hilfe 6; Wohnen, Haus und Handwerk 4; Technik und Sicherheit 2; Freizeit und Lebensqualität 4; Haushalt und Reinigung 2; Pflege und Betreuung 3.

### Interne Linkziele im Beitragstext

- `alltag-gut-organisiert`: (keine)
- `altersgerechter-umbau`: `/ratgeber/barrierefrei-wohnen/`; `/ratgeber/treppenlift-einbau/`
- `barrierefrei-wohnen`: `/ratgeber/treppenlift-einbau/`
- `betrug-telefon-haustuer`: (keine)
- `eltern-aus-der-ferne-unterstuetzen`: (keine)
- `ernaehrung-ab-60`: `/ratgeber/fruehstueck-ab-60-eiweiss/`; `/ratgeber/gesund-und-fit-im-alter/`
- `fruehstueck-ab-60-eiweiss`: `/ratgeber/ernaehrung-ab-60/`; `/ratgeber/gesund-und-fit-im-alter/`
- `gemeinsam-statt-einsam`: (keine)
- `gesund-und-fit-im-alter`: `/ratgeber/barrierefrei-wohnen/`; `/ratgeber/gemeinsam-statt-einsam/`; `/ratgeber/haushaltshilfe-im-alter/`
- `haushaltshilfe-betrieb-oder-privat`: (keine)
- `haushaltshilfe-im-alter`: (keine)
- `hausnotruf-auswahl`: (keine)
- `krankenfahrten`: (keine)
- `kurzzeitpflege`: `/`; `/ratgeber/haushaltshilfe-im-alter/`; `/ratgeber/hausnotruf-auswahl/`; `/ratgeber/pflegegrad-beantragen/`; `/ratgeber/pflegereform-2027/`
- `mehrgenerationenhaus-mehrgenerationenwohnen`: `/`; `/mein-alltag/pflegegrad-rechner/`; `/ratgeber/altersgerechter-umbau/`; `/ratgeber/barrierefrei-wohnen/`; `/ratgeber/eltern-aus-der-ferne-unterstuetzen/`; `/ratgeber/gemeinsam-statt-einsam/`; `/ratgeber/haushaltshilfe-betrieb-oder-privat/`; `/ratgeber/haushaltshilfe-im-alter/`; `/ratgeber/hausnotruf-auswahl/`; `/ratgeber/kurzzeitpflege/`; `/ratgeber/patientenverfuegung-vorsorgevollmacht/`; `/ratgeber/pflegegrad-beantragen/`; `/ratgeber/pflegereform-2027/`; `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/`; `/ratgeber/treppenlift-einbau/`
- `mobilitaet-im-alter-ohne-auto`: `/`; `/mein-alltag/pflegegrad-rechner/`; `/ratgeber/eltern-aus-der-ferne-unterstuetzen/`; `/ratgeber/gemeinsam-statt-einsam/`; `/ratgeber/krankenfahrten/`; `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/`; `/ratgeber/pflegegrad-beantragen/`; `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/`; `/veranstaltungen/`
- `patientenverfuegung-vorsorgevollmacht`: (keine)
- `pflegegrad-beantragen`: `/ratgeber/altersgerechter-umbau/`; `/ratgeber/haushaltshilfe-im-alter/`
- `pflegereform-2027`: `/`; `/ratgeber/pflegegrad-beantragen/` ×2
- `rente-reicht-nicht-finanzielle-hilfen`: `/`; `/mein-alltag/pflegegrad-rechner/`; `/ratgeber/alltag-gut-organisiert/`; `/ratgeber/altersgerechter-umbau/`; `/ratgeber/haushaltshilfe-im-alter/`; `/ratgeber/hausnotruf-auswahl/`; `/ratgeber/pflegegrad-beantragen/`; `/ratgeber/pflegereform-2027/`; `/ratgeber/treppenlift-einbau/`
- `treppenlift-einbau`: (keine)

Weitere Frontmatter-Felder (Anzahl Beiträge): `hinweis` 11, `tabelle_beschriftung` 8, `seo_titel` 5, `meta_beschreibung` 5, `quellen` 4. Pflichtfelder in allen 21: titel, slug, thema, bild, bild_alt, stand, veroeffentlicht, geaendert.

## 3. Themenbereiche

Quelle: `data/themen.json` (6 Themenbereiche). Je Thema erzeugt `tools/build.py` eine Themenkarte (Startseite, `/themen/`), eine Detailseite `/themen/<slug>/`, eine Option im Anfrageformular sowie eine Checkbox-Gruppe „Was genau?“ (Leistungen + automatisch „Sonstiges“).

### Wohnen, Haus und Handwerk (`wohnen-haus-handwerk`)

- Kurztext: Kleine Reparaturen, Garten, Umbau für mehr Komfort oder Hilfe beim Umzug.
- Einleitung: Ein tropfender Wasserhahn, eine Hecke, die geschnitten werden muss, oder ein Bad, das bequemer werden soll: Rund ums Haus fällt immer etwas an. Wir suchen für Sie Handwerksbetriebe, Hausmeisterdienste oder hilfsbereite Menschen aus Ihrer Nachbarschaft, die zu Ihrem Anliegen passen.
- Beispiel-Chips (4): Kleinreparaturen; Gartenpflege; Barrierearmer Umbau; Umzugshilfe
- Leistungen im Formular (7, plus automatisch „Sonstiges“):
  - Kleinreparaturen im Haus
  - Gartenpflege und Heckenschnitt
  - Barrierearmer Umbau (z. B. Bad, Haltegriffe)
  - Maler- und Tapezierarbeiten
  - Möbel aufbauen oder umstellen
  - Umzugshilfe
  - Winterdienst
- Angebote (4):
  - Handwerksbetriebe für Arbeiten, die eine Fachkraft erfordern – etwa Elektrik, Sanitär oder Umbauten
  - Hausmeister- und Gartendienste für wiederkehrende Arbeiten
  - Umzugsunternehmen, auch für kleinere Umzüge
  - Private Helfer für einfache Handgriffe, zum Beispiel ein Regal aufhängen oder Laub fegen
- Bild: `assets/img/themen/wohnen-haus-handwerk` – `wohnen-haus-handwerk-480.webp` (480×600, 34 KB), `wohnen-haus-handwerk-800.jpg` (800×1000, 116 KB), `wohnen-haus-handwerk-800.webp` (800×1000, 76 KB); Alt-Text: „Ein Handwerker mit Werkzeugkoffer steht lächelnd vor der Haustür eines älteren Herrn, der ihn freundlich empfängt.“
- Verwendet auf: `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/`, `/themen/freizeit-lebensqualitaet/`, `/themen/haushalt-reinigung/`, `/themen/pflege-betreuung/`, `/themen/technik-sicherheit/`, `/themen/wohnen-haus-handwerk/`
- Ratgeber-Beiträge mit diesem Thema (4): `altersgerechter-umbau`, `barrierefrei-wohnen`, `mehrgenerationenhaus-mehrgenerationenwohnen`, `treppenlift-einbau`
- Anbieter-Einträge in `assets/data/anbieter.json` mit diesem Thema (nur Zählung): 34

### Haushalt und Reinigung (`haushalt-reinigung`)

- Kurztext: Unterstützung im Haushalt, regelmäßig oder einmalig.
- Einleitung: Wenn das Putzen schwerer fällt oder einfach mehr Zeit für Schönes bleiben soll: Wir suchen Unterstützung im Haushalt, die zu Ihnen passt – ob jede Woche, alle zwei Wochen oder einmalig, etwa für einen Großputz.
- Beispiel-Chips (4): Wohnungsreinigung; Fenster putzen; Wäsche; Entrümpelung
- Leistungen im Formular (6, plus automatisch „Sonstiges“):
  - Regelmäßige Wohnungsreinigung
  - Fenster putzen
  - Wäsche waschen und bügeln
  - Großputz oder Frühjahrsputz
  - Entrümpelung und Haushaltsauflösung
  - Hilfe beim Kochen und Vorräte auffüllen
- Angebote (4):
  - Reinigungsfirmen und haushaltsnahe Dienstleister
  - Anbieter für Entrümpelung und Haushaltsauflösung
  - Private Haushaltshilfen für einfache, regelmäßige Aufgaben
  - Auf Wunsch Anbieter, die als „Angebot zur Unterstützung im Alltag“ anerkannt sind – ob das für Sie in Frage kommt, klären Sie bitte mit Ihrer Pflegekasse
- Bild: `assets/img/themen/haushalt-reinigung` – `haushalt-reinigung-480.webp` (480×600, 38 KB), `haushalt-reinigung-800.jpg` (800×1000, 121 KB), `haushalt-reinigung-800.webp` (800×1000, 80 KB); Alt-Text: „Eine Haushaltshilfe mit gelben Handschuhen wischt den Tisch, während eine ältere Frau mit einer Tasse in der Hand daneben sitzt und lacht.“
- Verwendet auf: `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/`, `/themen/freizeit-lebensqualitaet/`, `/themen/haushalt-reinigung/`, `/themen/pflege-betreuung/`, `/themen/technik-sicherheit/`, `/themen/wohnen-haus-handwerk/`
- Ratgeber-Beiträge mit diesem Thema (2): `haushaltshilfe-betrieb-oder-privat`, `haushaltshilfe-im-alter`
- Anbieter-Einträge in `assets/data/anbieter.json` mit diesem Thema (nur Zählung): 91

### Pflege und Betreuung (`pflege-betreuung`)

- Kurztext: Wir vermitteln Kontakte zu Pflegediensten und Betreuungsangeboten – und entlasten Angehörige.
- Einleitung: Wenn Pflege oder Betreuung nötig wird, ist die Suche nach einem passenden Angebot oft mühsam. Wir nehmen Ihnen einen Teil davon ab: Sie schildern uns die Situation, und wir suchen Kontakte zu Pflegediensten und Betreuungsangeboten in Ihrer Region.
- Beispiel-Chips (3): Ambulante Pflege; Stundenweise Betreuung; Entlastung für Angehörige
- Leistungen im Formular (6, plus automatisch „Sonstiges“):
  - Ambulante Pflege durch einen Pflegedienst
  - Stundenweise Betreuung zu Hause
  - Entlastung für pflegende Angehörige
  - Verhinderungspflege
  - Tagespflege
  - Betreuung bei Demenz
- Angebote (4):
  - Zugelassene ambulante Pflegedienste
  - Betreuungsdienste und anerkannte Angebote zur Unterstützung im Alltag
  - Einrichtungen der Tagespflege
  - Kontakte zu Beratungsstellen, wenn Sie Fragen zu Pflegegrad oder Leistungen der Pflegekasse haben
- Hinweis: Pflegeleistungen werden ausschließlich von zugelassenen Pflegediensten und Einrichtungen erbracht. Wir pflegen nicht selbst und bieten keine Pflegeberatung an. Wir stellen lediglich den Kontakt her. Für eine Beratung zu Pflegegrad und Leistungen wenden Sie sich bitte an Ihre Pflegekasse oder eine Pflegeberatungsstelle.
- Bild: `assets/img/themen/pflege-betreuung-v2` – `pflege-betreuung-v2-480.webp` (480×528, 43 KB), `pflege-betreuung-v2-800.jpg` (800×880, 132 KB), `pflege-betreuung-v2-800.webp` (800×880, 92 KB); Alt-Text: „Eine Betreuerin kniet lächelnd neben einer älteren Frau, die im Garten sitzt, und legt ihr freundlich die Hand auf den Arm.“; abweichende Höhe `hoehe`=880
- Verwendet auf: `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/`, `/themen/freizeit-lebensqualitaet/`, `/themen/haushalt-reinigung/`, `/themen/pflege-betreuung/`, `/themen/technik-sicherheit/`, `/themen/wohnen-haus-handwerk/`
- Ratgeber-Beiträge mit diesem Thema (3): `kurzzeitpflege`, `pflegegrad-beantragen`, `pflegereform-2027`
- Anbieter-Einträge in `assets/data/anbieter.json` mit diesem Thema (nur Zählung): 308

### Alltag und persönliche Hilfe (`alltag-persoenliche-hilfe`)

- Kurztext: Begleitung und praktische Hilfe für die kleinen und großen Dinge des Alltags.
- Einleitung: Einkäufe tragen, zum Arzt begleiten, einen Brief vom Amt gemeinsam lesen: Oft sind es die alltäglichen Dinge, bei denen eine helfende Hand fehlt. Wir suchen Menschen und Dienste, die Sie dabei zuverlässig unterstützen.
- Beispiel-Chips (4): Einkaufen; Begleitung zu Terminen; Fahrdienst; Post und Formulare
- Leistungen im Formular (6, plus automatisch „Sonstiges“):
  - Einkaufen und Besorgungen
  - Begleitung zu Arztterminen
  - Begleitung zu Behörden und Banken
  - Fahrdienst
  - Hilfe bei Post und Formularen
  - Botengänge, zum Beispiel zur Apotheke
- Angebote (4):
  - Fahr- und Begleitdienste
  - Alltagshelfer und Seniorenassistenz
  - Private Helfer aus der Nachbarschaft für Einkäufe und Besorgungen
  - Ehrenamtliche Angebote, sofern es sie in Ihrer Region gibt
- Bild: `assets/img/themen/alltag-persoenliche-hilfe` – `alltag-persoenliche-hilfe-480.webp` (480×600, 41 KB), `alltag-persoenliche-hilfe-800.jpg` (800×1000, 126 KB), `alltag-persoenliche-hilfe-800.webp` (800×1000, 85 KB); Alt-Text: „Ein Mann trägt eine Einkaufstüte und geht lächelnd mit einer älteren Dame untergehakt die Straße entlang.“
- Verwendet auf: `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/`, `/themen/freizeit-lebensqualitaet/`, `/themen/haushalt-reinigung/`, `/themen/pflege-betreuung/`, `/themen/technik-sicherheit/`, `/themen/wohnen-haus-handwerk/`
- Ratgeber-Beiträge mit diesem Thema (6): `alltag-gut-organisiert`, `eltern-aus-der-ferne-unterstuetzen`, `krankenfahrten`, `mobilitaet-im-alter-ohne-auto`, `patientenverfuegung-vorsorgevollmacht`, `rente-reicht-nicht-finanzielle-hilfen`
- Anbieter-Einträge in `assets/data/anbieter.json` mit diesem Thema (nur Zählung): 242

### Technik und Sicherheit (`technik-sicherheit`)

- Kurztext: Geräte einrichten, Fragen klären und sicher zu Hause leben.
- Einleitung: Ein neues Smartphone, ein Fernseher, der nicht mehr will, oder der Wunsch nach mehr Sicherheit zu Hause: Wir suchen geduldige Menschen und Fachbetriebe, die Technik verständlich erklären und zuverlässig einrichten.
- Beispiel-Chips (4): Smartphone und Tablet; Hausnotruf; Rauchmelder; Fernseher einrichten
- Leistungen im Formular (7, plus automatisch „Sonstiges“):
  - Smartphone und Tablet einrichten und erklären
  - Computer, Internet und E-Mail
  - Fernseher und Receiver einrichten
  - Hausnotruf
  - Rauchmelder anbringen
  - Einbruchschutz und Türsicherung
  - Seniorentelefon einrichten
- Angebote (4):
  - Technikhilfe für zu Hause, auch mit viel Geduld beim Erklären
  - Anbieter von Hausnotrufsystemen
  - Fachbetriebe für Sicherheitstechnik und Einbruchschutz
  - Private Helfer, die sich mit Smartphone und Tablet gut auskennen
- Bild: `assets/img/themen/technik-sicherheit` – `technik-sicherheit-480.webp` (480×600, 33 KB), `technik-sicherheit-800.jpg` (800×1000, 108 KB), `technik-sicherheit-800.webp` (800×1000, 69 KB); Alt-Text: „Ein jüngerer Mann zeigt einem älteren Herrn am Tisch etwas auf dem Tablet, beide lachen.“
- Verwendet auf: `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/`, `/themen/freizeit-lebensqualitaet/`, `/themen/haushalt-reinigung/`, `/themen/pflege-betreuung/`, `/themen/technik-sicherheit/`, `/themen/wohnen-haus-handwerk/`
- Ratgeber-Beiträge mit diesem Thema (2): `betrug-telefon-haustuer`, `hausnotruf-auswahl`
- Anbieter-Einträge in `assets/data/anbieter.json` mit diesem Thema (nur Zählung): 63

### Freizeit und Lebensqualität (`freizeit-lebensqualitaet`)

- Kurztext: Gemeinsam unterwegs sein, Neues lernen und Kontakte pflegen.
- Einleitung: Gemeinsam spazieren gehen, einen Kurs besuchen oder einfach jemanden zum Reden haben: Lebensqualität hat viele Gesichter. Wir suchen Angebote und Menschen in Ihrer Nähe, mit denen Sie Ihre freie Zeit gerne verbringen.
- Beispiel-Chips (4): Spaziergänge; Kurse; Ausflüge; Gesellschaft
- Leistungen im Formular (6, plus automatisch „Sonstiges“):
  - Spaziergänge in Begleitung
  - Begleitung zu Veranstaltungen
  - Ausflüge und Tagesfahrten
  - Kurse, zum Beispiel Bewegung oder Kreatives
  - Gesellschaft leisten und Vorlesen
  - Gemeinsame Hobbys und Spiele
- Angebote (4):
  - Kurs- und Freizeitanbieter in Ihrer Region
  - Begleitdienste für Ausflüge und Veranstaltungen
  - Private Helfer, die gerne Zeit mit Ihnen verbringen
  - Hinweise auf Treffpunkte und Gruppen in Ihrer Nähe
- Bild: `assets/img/themen/freizeit-lebensqualitaet` – `freizeit-lebensqualitaet-480.webp` (480×600, 50 KB), `freizeit-lebensqualitaet-800.jpg` (800×1000, 146 KB), `freizeit-lebensqualitaet-800.webp` (800×1000, 106 KB); Alt-Text: „Eine Gruppe älterer Menschen ist gut gelaunt mit Wanderstöcken in der Natur unterwegs.“
- Verwendet auf: `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/`, `/themen/freizeit-lebensqualitaet/`, `/themen/haushalt-reinigung/`, `/themen/pflege-betreuung/`, `/themen/technik-sicherheit/`, `/themen/wohnen-haus-handwerk/`
- Ratgeber-Beiträge mit diesem Thema (4): `ernaehrung-ab-60`, `fruehstueck-ab-60-eiweiss`, `gemeinsam-statt-einsam`, `gesund-und-fit-im-alter`
- Anbieter-Einträge in `assets/data/anbieter.json` mit diesem Thema (nur Zählung): 81

## 4. Bilder

207 Dateien in `assets/img` (rekursiv), zusammen 22.3 MB. Pixelmaße mit PIL ermittelt. „Verwendet auf“ = Seiten, in deren generiertem HTML der Dateipfad vorkommt (`src`, `srcset`, `og:image`, JSON-LD). „Nur Code/Daten“ = Pfad kommt nur in CSS, JS oder `data/*.json` vor.

### `assets/img/` (10 Dateien, 3506 KB)

| Datei | KB | Pixel | Verwendet auf |
|---|---|---|---|
| `angehoerige-familie-1200.webp` | 147.6 | 1200×800 | `/` |
| `angehoerige-familie-480.webp` | 30.4 | 480×320 | `/` |
| `angehoerige-familie-800.jpg` | 93.6 | 800×533 | `/` |
| `angehoerige-familie-800.webp` | 76.1 | 800×533 | `/` |
| `hero-garten-1600.jpg` | 256.1 | 1600×900 | 12 Seiten, u. a. `/`, `/datenschutz/`, `/fuer-anbieter/` |
| `hero-garten-1600.webp` | 184.4 | 1600×900 | `/` |
| `hero-garten-800.jpg` | 92.0 | 800×450 | `/` |
| `hero-garten-800.webp` | 77.0 | 800×450 | `/` |
| `hero-garten.png` | 2535.4 | 1672×941 | **–** |
| `illus.svg` | 13.8 | SVG (viewBox 96×96) | 32 Seiten, u. a. `/`, `/fuer-anbieter/`, `/mein-alltag/` |

### `assets/img/icons/` (6 Dateien, 47 KB)

| Datei | KB | Pixel | Verwendet auf |
|---|---|---|---|
| `kostenlos-192.webp` | 10.4 | 192×192 | `/` |
| `kostenlos-96.webp` | 4.5 | 96×96 | `/` |
| `persoenlich-192.webp` | 12.5 | 192×192 | `/` |
| `persoenlich-96.webp` | 5.1 | 96×96 | `/` |
| `regional-192.webp` | 9.9 | 192×192 | `/` |
| `regional-96.webp` | 4.4 | 96×96 | `/` |

### `assets/img/pflegegrad/` (4 Dateien, 553 KB)

| Datei | KB | Pixel | Verwendet auf |
|---|---|---|---|
| `titelbild-1536.jpg` | 238.7 | 1536×1024 | `/mein-alltag/pflegegrad-rechner/` |
| `titelbild-1536.webp` | 160.8 | 1536×1024 | `/mein-alltag/pflegegrad-rechner/` |
| `titelbild-800.jpg` | 87.2 | 800×533 | `/mein-alltag/pflegegrad-rechner/` |
| `titelbild-800.webp` | 66.2 | 800×533 | `/mein-alltag/pflegegrad-rechner/` |

### `assets/img/ratgeber/` (165 Dateien, 16784 KB)

| Datei | KB | Pixel | Verwendet auf |
|---|---|---|---|
| `alltag-gut-organisiert-1400.jpg` | 206.8 | 1400×933 | `/ratgeber/alltag-gut-organisiert/` |
| `alltag-gut-organisiert-1400.webp` | 148.2 | 1400×933 | `/ratgeber/alltag-gut-organisiert/` |
| `alltag-gut-organisiert-800.webp` | 68.9 | 800×533 | `/ratgeber/`, `/ratgeber/alltag-gut-organisiert/` |
| `alltag-gut-organisiert-teaser-600.webp` | 50.4 | 600×450 | `/themen/alltag-persoenliche-hilfe/` |
| `alltag-medikamente-wochenbox-1400.jpg` | 148.3 | 1400×933 | `/ratgeber/alltag-gut-organisiert/` |
| `alltag-medikamente-wochenbox-1400.webp` | 86.3 | 1400×933 | `/ratgeber/alltag-gut-organisiert/` |
| `alltag-medikamente-wochenbox-800.webp` | 43.6 | 800×533 | `/ratgeber/alltag-gut-organisiert/` |
| `altersgerechter-umbau-1400.jpg` | 183.7 | 1400×933 | `/ratgeber/altersgerechter-umbau/` |
| `altersgerechter-umbau-1400.webp` | 119.6 | 1400×933 | `/ratgeber/altersgerechter-umbau/` |
| `altersgerechter-umbau-800.webp` | 51.8 | 800×533 | `/ratgeber/`, `/ratgeber/altersgerechter-umbau/`, `/ratgeber/barrierefrei-wohnen/`, `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/`, `/ratgeber/treppenlift-einbau/` |
| `altersgerechter-umbau-foerderung-1400.jpg` | 177.6 | 1400×933 | `/ratgeber/altersgerechter-umbau/` |
| `altersgerechter-umbau-foerderung-1400.webp` | 115.3 | 1400×933 | `/ratgeber/altersgerechter-umbau/` |
| `altersgerechter-umbau-foerderung-800.webp` | 57.3 | 800×533 | `/ratgeber/altersgerechter-umbau/` |
| `altersgerechter-umbau-teaser-600.webp` | 33.6 | 600×450 | `/themen/wohnen-haus-handwerk/` |
| `barrierefrei-wohnen-1400.jpg` | 157.5 | 1400×933 | `/ratgeber/barrierefrei-wohnen/` |
| `barrierefrei-wohnen-1400.webp` | 100.9 | 1400×933 | `/ratgeber/barrierefrei-wohnen/` |
| `barrierefrei-wohnen-800.webp` | 47.0 | 800×533 | `/ratgeber/`, `/ratgeber/altersgerechter-umbau/`, `/ratgeber/barrierefrei-wohnen/`, `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/`, `/ratgeber/treppenlift-einbau/` |
| `barrierefrei-wohnen-bad-1400.jpg` | 156.4 | 1400×933 | `/ratgeber/barrierefrei-wohnen/` |
| `barrierefrei-wohnen-bad-1400.webp` | 87.6 | 1400×933 | `/ratgeber/barrierefrei-wohnen/` |
| `barrierefrei-wohnen-bad-800.webp` | 44.6 | 800×533 | `/ratgeber/barrierefrei-wohnen/` |
| `barrierefrei-wohnen-teaser-600.webp` | 33.7 | 600×450 | `/themen/wohnen-haus-handwerk/` |
| `betrug-telefon-haustuer-1400.jpg` | 118.7 | 1400×933 | `/ratgeber/betrug-telefon-haustuer/` |
| `betrug-telefon-haustuer-1400.webp` | 60.0 | 1400×933 | `/ratgeber/betrug-telefon-haustuer/` |
| `betrug-telefon-haustuer-800.webp` | 27.4 | 800×533 | `/ratgeber/`, `/ratgeber/betrug-telefon-haustuer/`, `/ratgeber/hausnotruf-auswahl/` |
| `betrug-telefon-haustuer-teaser-600.webp` | 20.0 | 600×450 | `/themen/technik-sicherheit/` |
| `eltern-aus-der-ferne-tablet-kueche-1400.jpg` | 122.4 | 1400×933 | `/ratgeber/eltern-aus-der-ferne-unterstuetzen/` |
| `eltern-aus-der-ferne-tablet-kueche-1400.webp` | 62.8 | 1400×933 | `/ratgeber/eltern-aus-der-ferne-unterstuetzen/` |
| `eltern-aus-der-ferne-tablet-kueche-800.webp` | 31.2 | 800×533 | `/ratgeber/eltern-aus-der-ferne-unterstuetzen/` |
| `eltern-aus-der-ferne-unterstuetzen-1400.jpg` | 167.3 | 1400×933 | `/ratgeber/eltern-aus-der-ferne-unterstuetzen/` |
| `eltern-aus-der-ferne-unterstuetzen-1400.webp` | 103.7 | 1400×933 | `/ratgeber/eltern-aus-der-ferne-unterstuetzen/` |
| `eltern-aus-der-ferne-unterstuetzen-800.webp` | 53.2 | 800×533 | `/ratgeber/`, `/ratgeber/eltern-aus-der-ferne-unterstuetzen/` |
| `eltern-aus-der-ferne-unterstuetzen-teaser-600.webp` | 36.9 | 600×450 | `/themen/alltag-persoenliche-hilfe/` |
| `ernaehrung-ab-60-1400.jpg` | 225.8 | 1400×933 | `/ratgeber/ernaehrung-ab-60/` |
| `ernaehrung-ab-60-1400.webp` | 167.5 | 1400×933 | `/ratgeber/ernaehrung-ab-60/` |
| `ernaehrung-ab-60-800.webp` | 80.5 | 800×533 | `/ratgeber/`, `/ratgeber/ernaehrung-ab-60/`, `/ratgeber/fruehstueck-ab-60-eiweiss/`, `/ratgeber/gemeinsam-statt-einsam/`, `/ratgeber/gesund-und-fit-im-alter/` |
| `ernaehrung-ab-60-kochen-1400.jpg` | 190.6 | 1400×933 | `/ratgeber/ernaehrung-ab-60/` |
| `ernaehrung-ab-60-kochen-1400.webp` | 127.3 | 1400×933 | `/ratgeber/ernaehrung-ab-60/` |
| `ernaehrung-ab-60-kochen-800.webp` | 58.8 | 800×533 | `/ratgeber/ernaehrung-ab-60/` |
| `ernaehrung-ab-60-teaser-600.webp` | 57.0 | 600×450 | `/themen/freizeit-lebensqualitaet/` |
| `fruehstueck-ab-60-garten-1400.jpg` | 247.2 | 1400×933 | `/ratgeber/fruehstueck-ab-60-eiweiss/` |
| `fruehstueck-ab-60-garten-1400.webp` | 189.4 | 1400×933 | `/ratgeber/fruehstueck-ab-60-eiweiss/` |
| `fruehstueck-ab-60-garten-800.webp` | 92.3 | 800×533 | 6 Seiten, u. a. `/`, `/ratgeber/`, `/ratgeber/ernaehrung-ab-60/` |
| `fruehstueck-ab-60-garten-teaser-600.webp` | 65.0 | 600×450 | `/themen/freizeit-lebensqualitaet/` |
| `fruehstueck-ab-60-nordic-walking-1400.jpg` | 213.2 | 1400×933 | `/ratgeber/fruehstueck-ab-60-eiweiss/` |
| `fruehstueck-ab-60-nordic-walking-1400.webp` | 145.1 | 1400×933 | `/ratgeber/fruehstueck-ab-60-eiweiss/` |
| `fruehstueck-ab-60-nordic-walking-800.webp` | 73.1 | 800×533 | `/ratgeber/fruehstueck-ab-60-eiweiss/` |
| `gemeinsam-statt-einsam-1400.jpg` | 213.2 | 1400×933 | `/`, `/ratgeber/gemeinsam-statt-einsam/` |
| `gemeinsam-statt-einsam-1400.webp` | 145.1 | 1400×933 | `/`, `/ratgeber/gemeinsam-statt-einsam/` |
| `gemeinsam-statt-einsam-800.webp` | 73.1 | 800×533 | 6 Seiten, u. a. `/`, `/ratgeber/`, `/ratgeber/ernaehrung-ab-60/` |
| `gemeinsam-statt-einsam-teaser-600.webp` | 49.8 | 600×450 | `/themen/freizeit-lebensqualitaet/` |
| `gesund-und-fit-im-alter-1400.jpg` | 155.9 | 1400×933 | `/ratgeber/gesund-und-fit-im-alter/` |
| `gesund-und-fit-im-alter-1400.webp` | 93.8 | 1400×933 | `/ratgeber/gesund-und-fit-im-alter/` |
| `gesund-und-fit-im-alter-800.webp` | 44.3 | 800×533 | `/ratgeber/`, `/ratgeber/ernaehrung-ab-60/`, `/ratgeber/fruehstueck-ab-60-eiweiss/`, `/ratgeber/gemeinsam-statt-einsam/`, `/ratgeber/gesund-und-fit-im-alter/` |
| `gesund-und-fit-im-alter-teaser-600.webp` | 30.3 | 600×450 | `/themen/freizeit-lebensqualitaet/` |
| `gesund-und-fit-wandern-1400.jpg` | 187.3 | 1400×933 | `/ratgeber/gesund-und-fit-im-alter/` |
| `gesund-und-fit-wandern-1400.webp` | 122.9 | 1400×933 | `/ratgeber/gesund-und-fit-im-alter/` |
| `gesund-und-fit-wandern-800.webp` | 62.4 | 800×533 | `/ratgeber/gesund-und-fit-im-alter/` |
| `haushaltshilfe-betrieb-oder-privat-1400.jpg` | 181.5 | 1400×933 | `/ratgeber/haushaltshilfe-betrieb-oder-privat/` |
| `haushaltshilfe-betrieb-oder-privat-1400.webp` | 119.3 | 1400×933 | `/ratgeber/haushaltshilfe-betrieb-oder-privat/` |
| `haushaltshilfe-betrieb-oder-privat-800.webp` | 50.8 | 800×533 | `/ratgeber/`, `/ratgeber/haushaltshilfe-betrieb-oder-privat/`, `/ratgeber/haushaltshilfe-im-alter/` |
| `haushaltshilfe-betrieb-oder-privat-teaser-600.webp` | 35.6 | 600×450 | `/themen/haushalt-reinigung/` |
| `haushaltshilfe-im-alter-1400.jpg` | 172.9 | 1400×933 | `/ratgeber/haushaltshilfe-im-alter/` |
| `haushaltshilfe-im-alter-1400.webp` | 111.0 | 1400×933 | `/ratgeber/haushaltshilfe-im-alter/` |
| `haushaltshilfe-im-alter-800.webp` | 52.2 | 800×533 | `/ratgeber/`, `/ratgeber/haushaltshilfe-betrieb-oder-privat/`, `/ratgeber/haushaltshilfe-im-alter/` |
| `haushaltshilfe-im-alter-teaser-600.webp` | 38.4 | 600×450 | `/themen/haushalt-reinigung/` |
| `haushaltshilfe-kosten-sparschwein-1400.jpg` | 147.0 | 1400×933 | `/ratgeber/haushaltshilfe-betrieb-oder-privat/` |
| `haushaltshilfe-kosten-sparschwein-1400.webp` | 84.9 | 1400×933 | `/ratgeber/haushaltshilfe-betrieb-oder-privat/` |
| `haushaltshilfe-kosten-sparschwein-800.webp` | 41.0 | 800×533 | `/ratgeber/haushaltshilfe-betrieb-oder-privat/` |
| `hausnotruf-auswahl-1400.jpg` | 192.8 | 1400×933 | `/ratgeber/hausnotruf-auswahl/` |
| `hausnotruf-auswahl-1400.webp` | 132.9 | 1400×933 | `/ratgeber/hausnotruf-auswahl/` |
| `hausnotruf-auswahl-800.webp` | 63.0 | 800×533 | `/ratgeber/`, `/ratgeber/betrug-telefon-haustuer/`, `/ratgeber/hausnotruf-auswahl/` |
| `hausnotruf-auswahl-teaser-600.webp` | 43.2 | 600×450 | `/themen/technik-sicherheit/` |
| `krankenfahrten-1400.jpg` | 221.8 | 1400×933 | `/ratgeber/krankenfahrten/` |
| `krankenfahrten-1400.webp` | 158.3 | 1400×933 | `/ratgeber/krankenfahrten/` |
| `krankenfahrten-800.webp` | 74.0 | 800×533 | `/ratgeber/`, `/ratgeber/krankenfahrten/`, `/ratgeber/mobilitaet-im-alter-ohne-auto/`, `/ratgeber/patientenverfuegung-vorsorgevollmacht/`, `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `krankenfahrten-teaser-600.webp` | 50.9 | 600×450 | `/themen/alltag-persoenliche-hilfe/` |
| `krankenfahrten-verordnung-1400.jpg` | 115.8 | 1400×933 | `/ratgeber/krankenfahrten/` |
| `krankenfahrten-verordnung-1400.webp` | 58.0 | 1400×933 | `/ratgeber/krankenfahrten/` |
| `krankenfahrten-verordnung-800.webp` | 29.3 | 800×533 | `/ratgeber/krankenfahrten/` |
| `kurzzeitpflege-1400.jpg` | 199.8 | 1400×933 | `/ratgeber/kurzzeitpflege/` |
| `kurzzeitpflege-1400.webp` | 138.7 | 1400×933 | `/ratgeber/kurzzeitpflege/` |
| `kurzzeitpflege-800.webp` | 64.5 | 800×533 | `/ratgeber/`, `/ratgeber/kurzzeitpflege/`, `/ratgeber/pflegegrad-beantragen/`, `/ratgeber/pflegereform-2027/` |
| `kurzzeitpflege-teaser-600.webp` | 44.9 | 600×450 | `/themen/pflege-betreuung/` |
| `kurzzeitpflege-vorbereiten-1400.jpg` | 169.9 | 1400×933 | `/ratgeber/kurzzeitpflege/` |
| `kurzzeitpflege-vorbereiten-1400.webp` | 112.1 | 1400×933 | `/ratgeber/kurzzeitpflege/` |
| `kurzzeitpflege-vorbereiten-800.webp` | 52.6 | 800×533 | `/ratgeber/kurzzeitpflege/` |
| `mehrgenerationenhaus-altbau-umbau-1400.jpg` | 131.3 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-altbau-umbau-1400.webp` | 75.1 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-altbau-umbau-800.webp` | 39.7 | 800×533 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-anbau-1400.jpg` | 204.7 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-anbau-1400.webp` | 159.2 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-anbau-800.webp` | 53.8 | 800×533 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-bad-bodengleich-1400.jpg` | 111.4 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-bad-bodengleich-1400.webp` | 50.9 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-bad-bodengleich-800.webp` | 25.6 | 800×533 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-einliegerwohnung-1400.jpg` | 94.7 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-einliegerwohnung-1400.webp` | 38.5 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-einliegerwohnung-800.webp` | 19.7 | 800×533 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-garten-1400.jpg` | 255.9 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-garten-1400.webp` | 207.4 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-garten-800.webp` | 72.9 | 800×533 | 10 Seiten, u. a. `/`, `/ratgeber/`, `/ratgeber/altersgerechter-umbau/` |
| `mehrgenerationenhaus-garten-teaser-600.webp` | 48.3 | 600×450 | `/themen/wohnen-haus-handwerk/` |
| `mehrgenerationenhaus-wohnkueche-1400.jpg` | 145.1 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-wohnkueche-1400.webp` | 80.0 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-wohnkueche-800.webp` | 37.9 | 800×533 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-zweifamilienhaus-1400.jpg` | 244.3 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-zweifamilienhaus-1400.webp` | 181.1 | 1400×933 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mehrgenerationenhaus-zweifamilienhaus-800.webp` | 81.8 | 800×533 | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` |
| `mobilitaet-fahrdienst-rampe-1400.jpg` | 258.7 | 1400×933 | `/ratgeber/mobilitaet-im-alter-ohne-auto/` |
| `mobilitaet-fahrdienst-rampe-1400.webp` | 196.2 | 1400×933 | `/ratgeber/mobilitaet-im-alter-ohne-auto/` |
| `mobilitaet-fahrdienst-rampe-800.webp` | 72.7 | 800×533 | `/ratgeber/mobilitaet-im-alter-ohne-auto/` |
| `mobilitaet-haltestelle-1400.jpg` | 135.9 | 1400×933 | `/ratgeber/mobilitaet-im-alter-ohne-auto/` |
| `mobilitaet-haltestelle-1400.webp` | 68.6 | 1400×933 | `/ratgeber/mobilitaet-im-alter-ohne-auto/` |
| `mobilitaet-haltestelle-800.webp` | 34.3 | 800×533 | 15 Seiten, u. a. `/`, `/ratgeber/`, `/ratgeber/alltag-gut-organisiert/` |
| `mobilitaet-haltestelle-teaser-600.webp` | 26.1 | 600×450 | `/themen/alltag-persoenliche-hilfe/` |
| `mobilitaet-rollator-1400.jpg` | 168.4 | 1400×933 | `/ratgeber/mobilitaet-im-alter-ohne-auto/` |
| `mobilitaet-rollator-1400.webp` | 93.6 | 1400×933 | `/ratgeber/mobilitaet-im-alter-ohne-auto/` |
| `mobilitaet-rollator-800.webp` | 41.0 | 800×533 | `/ratgeber/mobilitaet-im-alter-ohne-auto/` |
| `patientenverfuegung-vorsorgevollmacht-1400.jpg` | 169.3 | 1400×933 | `/ratgeber/patientenverfuegung-vorsorgevollmacht/` |
| `patientenverfuegung-vorsorgevollmacht-1400.webp` | 109.2 | 1400×933 | `/ratgeber/patientenverfuegung-vorsorgevollmacht/` |
| `patientenverfuegung-vorsorgevollmacht-800.webp` | 56.8 | 800×533 | 7 Seiten, u. a. `/ratgeber/`, `/ratgeber/alltag-gut-organisiert/`, `/ratgeber/eltern-aus-der-ferne-unterstuetzen/` |
| `patientenverfuegung-vorsorgevollmacht-teaser-600.webp` | 40.4 | 600×450 | `/themen/alltag-persoenliche-hilfe/` |
| `pflegegrad-antrag-schreibtisch-1400.jpg` | 144.0 | 1400×933 | `/ratgeber/pflegegrad-beantragen/` |
| `pflegegrad-antrag-schreibtisch-1400.webp` | 82.1 | 1400×933 | `/ratgeber/pflegegrad-beantragen/` |
| `pflegegrad-antrag-schreibtisch-800.webp` | 39.9 | 800×533 | `/ratgeber/pflegegrad-beantragen/` |
| `pflegegrad-beantragen-1400.jpg` | 184.5 | 1400×933 | `/ratgeber/pflegegrad-beantragen/` |
| `pflegegrad-beantragen-1400.webp` | 115.7 | 1400×933 | `/ratgeber/pflegegrad-beantragen/` |
| `pflegegrad-beantragen-800.webp` | 53.3 | 800×533 | `/ratgeber/`, `/ratgeber/kurzzeitpflege/`, `/ratgeber/pflegegrad-beantragen/`, `/ratgeber/pflegereform-2027/` |
| `pflegegrad-beantragen-teaser-600.webp` | 37.3 | 600×450 | `/themen/pflege-betreuung/` |
| `pflegereform-2027-1400.jpg` | 202.3 | 1400×933 | `/ratgeber/pflegereform-2027/` |
| `pflegereform-2027-1400.webp` | 142.5 | 1400×933 | `/ratgeber/pflegereform-2027/` |
| `pflegereform-2027-800.webp` | 68.1 | 800×533 | `/ratgeber/`, `/ratgeber/kurzzeitpflege/`, `/ratgeber/pflegegrad-beantragen/`, `/ratgeber/pflegereform-2027/` |
| `pflegereform-2027-teaser-600.webp` | 47.9 | 600×450 | `/themen/pflege-betreuung/` |
| `rente-barrierefreies-bad-1400.jpg` | 156.4 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-barrierefreies-bad-1400.webp` | 87.6 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-barrierefreies-bad-800.webp` | 44.6 | 800×533 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-fernsehabend-1400.jpg` | 155.5 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-fernsehabend-1400.webp` | 92.0 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-fernsehabend-800.webp` | 44.6 | 800×533 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-medikamente-zuzahlung-1400.jpg` | 115.8 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-medikamente-zuzahlung-1400.webp` | 58.0 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-medikamente-zuzahlung-800.webp` | 29.3 | 800×533 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-pflegehilfsmittel-1400.jpg` | 169.9 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-pflegehilfsmittel-1400.webp` | 112.1 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-pflegehilfsmittel-800.webp` | 52.6 | 800×533 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-reicht-nicht-planung-1400.jpg` | 129.3 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-reicht-nicht-planung-1400.webp` | 69.2 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-reicht-nicht-planung-800.webp` | 34.2 | 800×533 | 7 Seiten, u. a. `/ratgeber/`, `/ratgeber/alltag-gut-organisiert/`, `/ratgeber/eltern-aus-der-ferne-unterstuetzen/` |
| `rente-reicht-nicht-planung-teaser-600.webp` | 24.0 | 600×450 | `/themen/alltag-persoenliche-hilfe/` |
| `rente-sparen-rechnungen-1400.jpg` | 147.0 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-sparen-rechnungen-1400.webp` | 84.9 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-sparen-rechnungen-800.webp` | 41.0 | 800×533 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-unterlagen-schreibtisch-1400.jpg` | 144.0 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-unterlagen-schreibtisch-1400.webp` | 82.1 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-unterlagen-schreibtisch-800.webp` | 39.9 | 800×533 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-wohnkosten-1400.jpg` | 177.6 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-wohnkosten-1400.webp` | 115.3 | 1400×933 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `rente-wohnkosten-800.webp` | 57.3 | 800×533 | `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` |
| `treppenlift-einbau-1400.jpg` | 162.1 | 1400×933 | `/ratgeber/treppenlift-einbau/` |
| `treppenlift-einbau-1400.webp` | 100.5 | 1400×933 | `/ratgeber/treppenlift-einbau/` |
| `treppenlift-einbau-800.webp` | 49.1 | 800×533 | `/ratgeber/`, `/ratgeber/altersgerechter-umbau/`, `/ratgeber/barrierefrei-wohnen/`, `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/`, `/ratgeber/treppenlift-einbau/` |
| `treppenlift-einbau-teaser-600.webp` | 35.8 | 600×450 | `/themen/wohnen-haus-handwerk/` |
| `treppenlift-kosten-planen-1400.jpg` | 129.3 | 1400×933 | `/ratgeber/treppenlift-einbau/` |
| `treppenlift-kosten-planen-1400.webp` | 69.2 | 1400×933 | `/ratgeber/treppenlift-einbau/` |
| `treppenlift-kosten-planen-800.webp` | 34.2 | 800×533 | `/ratgeber/treppenlift-einbau/` |

### `assets/img/themen/` (18 Dateien, 1495 KB)

| Datei | KB | Pixel | Verwendet auf |
|---|---|---|---|
| `alltag-persoenliche-hilfe-480.webp` | 40.7 | 480×600 | 8 Seiten, u. a. `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/` |
| `alltag-persoenliche-hilfe-800.jpg` | 125.9 | 800×1000 | `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/` |
| `alltag-persoenliche-hilfe-800.webp` | 84.8 | 800×1000 | `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/` |
| `freizeit-lebensqualitaet-480.webp` | 50.0 | 480×600 | 8 Seiten, u. a. `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/` |
| `freizeit-lebensqualitaet-800.jpg` | 145.6 | 800×1000 | `/`, `/themen/`, `/themen/freizeit-lebensqualitaet/` |
| `freizeit-lebensqualitaet-800.webp` | 105.6 | 800×1000 | `/`, `/themen/`, `/themen/freizeit-lebensqualitaet/` |
| `haushalt-reinigung-480.webp` | 38.4 | 480×600 | 8 Seiten, u. a. `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/` |
| `haushalt-reinigung-800.jpg` | 121.0 | 800×1000 | `/`, `/themen/`, `/themen/haushalt-reinigung/` |
| `haushalt-reinigung-800.webp` | 80.4 | 800×1000 | `/`, `/themen/`, `/themen/haushalt-reinigung/` |
| `pflege-betreuung-v2-480.webp` | 43.1 | 480×528 | 8 Seiten, u. a. `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/` |
| `pflege-betreuung-v2-800.jpg` | 131.6 | 800×880 | `/`, `/themen/`, `/themen/pflege-betreuung/` |
| `pflege-betreuung-v2-800.webp` | 91.8 | 800×880 | `/`, `/themen/`, `/themen/pflege-betreuung/` |
| `technik-sicherheit-480.webp` | 32.9 | 480×600 | 8 Seiten, u. a. `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/` |
| `technik-sicherheit-800.jpg` | 107.9 | 800×1000 | `/`, `/themen/`, `/themen/technik-sicherheit/` |
| `technik-sicherheit-800.webp` | 69.2 | 800×1000 | `/`, `/themen/`, `/themen/technik-sicherheit/` |
| `wohnen-haus-handwerk-480.webp` | 33.9 | 480×600 | 8 Seiten, u. a. `/`, `/themen/`, `/themen/alltag-persoenliche-hilfe/` |
| `wohnen-haus-handwerk-800.jpg` | 116.4 | 800×1000 | `/`, `/themen/`, `/themen/wohnen-haus-handwerk/` |
| `wohnen-haus-handwerk-800.webp` | 75.5 | 800×1000 | `/`, `/themen/`, `/themen/wohnen-haus-handwerk/` |

### `assets/img/veranstaltungen/` (4 Dateien, 423 KB)

| Datei | KB | Pixel | Verwendet auf |
|---|---|---|---|
| `titelbild-1536.jpg` | 183.4 | 1536×864 | `/veranstaltungen/` |
| `titelbild-1536.webp` | 116.8 | 1536×864 | `/veranstaltungen/` |
| `titelbild-800.jpg` | 70.2 | 800×450 | `/veranstaltungen/` |
| `titelbild-800.webp` | 52.4 | 800×450 | `/veranstaltungen/` |

### Ungenutzte Bilder

Ohne jeden Verweis in HTML, CSS, JS oder `data/*.json`: **1** Dateien.

| Datei | KB | Pixel |
|---|---|---|
| `assets/img/hero-garten.png` | 2535.4 | 1672×941 |

## 5. Funktionen und Daten

### JavaScript (`assets/js`)

| Datei | Zeilen | Funktion | Geladen auf (Anzahl Seiten) |
|---|---|---|---|
| `assets/js/alltag.js` | 169 | „Mein Alltag“: Checklisten mit Fortschrittsanzeige („x von y erledigt“), Zurücksetzen und Drucken sowie Wohnungs-Check-Auswertung aus den Antworten (priorisierte Empfehlungen) und Drucken. Nichts wird gespeichert. | `/mein-alltag/checklisten/`, `/mein-alltag/pflegegrad-rechner/`, `/mein-alltag/wohnungs-check/` |
| `assets/js/anbieter-logik.js` | 123 | Reine Funktionen (kein DOM/Netzwerk) für Anbieterliste: Filter nach Thema/Leistung/Ort, Sortierung, Ortsnormalisierung, Telefon-Link und Textfassung; unter Node getestet (`tests/anbieter-logik.test.js`). | `/` |
| `assets/js/anbieter.js` | 474 | Anbieter-Trefferliste (`AnbieterListe.baue`): lädt beim ersten Anzeigen `assets/data/anbieter.json` per `fetch`, zeigt Karten (zunächst 6, „Weitere anzeigen“ je 6), Mehrfachauswahl und ein Kontaktfenster (`<dialog>`) mit Anruf, Kopieren, Teilen und Drucken. Genutzt im Anfrageformular (Schritt 4) und im Ergebnis des Assistenten. | `/` |
| `assets/js/api.js` | 157 | Baut die Versandlinks (`mailto:` und `wa.me`) mit vorbefülltem Text; Empfängeradressen stehen nur hier. Ein späteres REST-Backend ist darin beschrieben, im Prototyp aber nicht aktiv (kein `fetch`). | `/`, `/fuer-anbieter/`, `/veranstaltungen/melden/` |
| `assets/js/assistent.js` | 332 | Unterstützungs-Assistent auf der Startseite: zwei bis drei Fragen (Ziel; Thema bzw. Alltagswerkzeug; bei „praktisch“/„Angehörige“ zusätzlich Ort), Zusammenfassung und Link auf das vorausgefüllte Anfrageformular bzw. passenden Ratgeber; zeigt in bestimmten Ergebnissen die Anbieter-Trefferliste. | `/` |
| `assets/js/main.js` | 1250 | Gemeinsamer Baustein (13 nummerierte Abschnitte laut Kopfkommentar): mobile Navigation, Vorbelegung des Anfrageformulars per URL (`?thema=`, `?wer=`, `?ort=`), abhängige Leistungs-Chips, gemeinsame Formularvalidierung (Anfrage, Anbieter-Registrierung, Veranstaltung melden), Ratgeber-Themenfilter, Vorlesen (Web Speech API), Scroll-Animationen, Seite teilen, Seite drucken, Checklisten in Beiträgen, Inhaltsverzeichnis. | alle 40 Seiten |
| `assets/js/no-js.js` | 5 | Setzt sofort die Klasse `js` auf `<html>` (statt `no-js`), damit das Mobilmenü nur mit JavaScript eingeklappt wird. Wird synchron im Kopf geladen (kein `defer`). | alle 40 Seiten |
| `assets/js/pflegegrad/leistungen.js` | 225 | Pflegegradrechner: Leistungen je Pflegegrad (Pakete 2027 Hauptansicht, 2026 Vergleich), Reform-Erklärung und „passende Hilfe“ aus eingebetteten Daten. | `/mein-alltag/pflegegrad-rechner/` |
| `assets/js/pflegegrad/nba.js` | 231 | Reine Rechenlogik des Pflegegradrechners (NBA-Punkte je Kriterium, Module, Gewichtung, Gesamtpunkte, Pflegegrad); Regeln stehen in `data/pflegegrad/nba-*.json`. | `/mein-alltag/pflegegrad-rechner/` |
| `assets/js/pflegegrad/rechner.js` | 482 | Oberfläche des Pflegegradrechners: Fragebogen (Schritte aus `fragen.json`, 29 Schritte), Zusammenfassung und Ergebnis; Antworten nur im Arbeitsspeicher. | `/mein-alltag/pflegegrad-rechner/` |
| `assets/js/schritte.js` | 347 | Macht aus den Formularen mit `data-schritte` Schritt-für-Schritt-Formulare: Fortschrittsanzeige, Zurück/Weiter, Prüfung je Schritt, Zusammenfassung und Versand-Schritt (E-Mail- oder WhatsApp-Link). Ohne JS bleiben alle Abschnitte sichtbar. | `/`, `/fuer-anbieter/`, `/veranstaltungen/melden/` |
| `assets/js/veranstaltungen.js` | 82 | Veranstaltungskalender: Filter nach Ort und Thema (Auswahlfelder), Ergebniszähler, Ausblenden leerer Tagesgruppen; Filterzustand in der Adresszeile (`?ort=&thema=`); klappt vor dem Drucken alle Detailbereiche auf. | `/veranstaltungen/` |

Hinweis: `main.js` wird auf allen Seiten geladen, aktiviert aber je Abschnitt nur, was im DOM vorhanden ist. Die Tests in `tests/` (`anbieter-logik.test.js`, `nba.test.js`, `versand.test.js`, `anbieter.e2e.js`, `rechner.e2e.js`) werden auf keiner Seite geladen.

### Funktionen aus Nutzersicht und wo sie vorkommen

| Funktion | Skripte | Seiten (Anzahl) |
|---|---|---|
| Unterstützungs-Assistent (2–3 Fragen → Ergebnis) | `assistent.js`, `anbieter.js`, `anbieter-logik.js` | `/` |
| Anfrage-Schrittformular (5 Schritte + Anbieter-Trefferliste + Versand) | `main.js`, `schritte.js`, `api.js`, `anbieter.js` | `/` |
| Anbieter-Registrierung (Schrittformular) | `main.js`, `schritte.js`, `api.js` | `/fuer-anbieter/` |
| Veranstaltung melden (Schrittformular) | `main.js`, `schritte.js`, `api.js` | `/veranstaltungen/melden/` |
| Veranstaltungskalender mit Filter | `veranstaltungen.js` | `/veranstaltungen/` |
| Pflegegradrechner | `pflegegrad/nba.js`, `leistungen.js`, `rechner.js`, `alltag.js` | `/mein-alltag/pflegegrad-rechner/` |
| Wohnungs-Check | `alltag.js` | `/mein-alltag/wohnungs-check/` |
| Checklisten (Fortschritt, Drucken) | `alltag.js` | `/mein-alltag/checklisten/` |
| Checkliste im Ratgeber-Beitrag | `main.js` (Abschnitt 12) | `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/`, `/ratgeber/mobilitaet-im-alter-ohne-auto/`, `/ratgeber/patientenverfuegung-vorsorgevollmacht/` |
| Vorlesen (Web Speech API) | `main.js` | 21 Seiten (`/ratgeber/alltag-gut-organisiert/`, `/ratgeber/altersgerechter-umbau/` …) |
| Teilen (`navigator.share`/Link kopieren) | `main.js` | 35 Seiten (`/fuer-anbieter/`, `/mein-alltag/` …) |
| Seite drucken (Schaltfläche) | `main.js` | 22 Seiten (`/ratgeber/alltag-gut-organisiert/`, `/ratgeber/altersgerechter-umbau/` …) |
| Ratgeber-Themenfilter | `main.js` | `/ratgeber/` |
| Inhaltsverzeichnis im Beitrag | `main.js` | 21 Seiten (`/ratgeber/alltag-gut-organisiert/`, `/ratgeber/altersgerechter-umbau/` …) |

Hinweis: „Drucken“ und „Teilen“ erscheinen zusätzlich im Kontaktfenster der Anbieterliste (`anbieter.js`) und in Checklisten/Wohnungs-Check (`alltag.js`); „Teilen“-/„Drucken“-Schaltflächen sind im HTML `hidden` und werden erst mit JS sichtbar (Zeilen sind aus dem generierten HTML und dem Skriptquelltext abgeleitet).

### Datendateien

| Datei | Größe | Zweck | Einträge (Zählung je Hauptfeld) |
|---|---|---|---|
| `assets/data/anbieter.json` | 347 KB | Öffentlich ausgelieferte, verschlankte Anbieterliste für `anbieter.js` (leere Felder weggelassen) plus Leistungs-Zuordnung (`leistungen`: Leistungs-Slug → Kategorie-IDs). Inhalte hier nicht aufgeführt. | leistungen: 38, anbieter: 819 |
| `data/anbieter.json` | 441 KB | Quelle der Anbieterliste (Rohdaten); `tools/build.py` erzeugt daraus `assets/data/anbieter.json`. Inhalte hier nicht aufgeführt. | anbieter: 819 |
| `data/checklisten.json` | 5 KB | Inhalte der Checklisten unter `/mein-alltag/checklisten/`. | checklisten: 4 |
| `data/kategorie-zuordnung.json` | 5 KB | Zuordnung Kategorie-ID der Anbieterdaten → Themenbereich (`null` = nicht anzeigen) und je Thema/Leistung passende Kategorie-IDs. | kategorien: 93, leistungen: 6 |
| `data/pflegegrad/faq.json` | 3 KB | FAQ zum Pflegegradrechner. | fragen: 8 |
| `data/pflegegrad/fragen.json` | 28 KB | Fragebogen des Rechners (Schritte, Skalen, Texte je Pflegegrad). | modul_kurz: 6, stufen_text: 5, grad_texte: 6, bedingungen: 2, skalen: 5, schritte: 29 |
| `data/pflegegrad/hilfe.json` | 4 KB | „Passende Hilfe“-Texte und Angebote im Rechner. | finanzierung_texte: 4, angebote: 10 |
| `data/pflegegrad/leistungen.json` | 21 KB | Leistungsbeträge je Pflegegrad (Pakete 2027/2026). | pakete: 2 |
| `data/pflegegrad/nba-2017.json` | 20 KB | Bewertungsregeln NBA (geltendes Recht seit 2017). | quellen: 3, stufen: 5, module: 6, pflegegrade: 6, nicht_abgebildet: 2 |
| `data/pflegegrad/nba-2027-entwurf.json` | 1 KB | Bewertungsregeln Entwurf 2027 (Regierungsentwurf, im Rechner schaltbar). | pflegegrade: 6, quellen: 2 |
| `data/ratgeber.json` | 36 KB | GENERIERT aus `content/ratgeber/*.md`: Frontmatter, Anreißer und URL je Beitrag (für Übersicht, Assistent, Weitere Beiträge). | beitraege: 21 |
| `data/regionen.json` | 1 KB | Regionen (Orte) für Formular-Vorschläge, Footer-Links und Anbieter-Registrierung. | regionen: 8 |
| `data/themen.json` | 9 KB | Quelle für 6 Themenbereiche (Startseite, Themenseiten, Formular-Leistungen, Footer). | themen: 6 |
| `data/veranstaltungen.json` | 18 KB | Veranstaltungstermine für `/veranstaltungen/` (Quelle: öffentliche Quellen, siehe `docs/veranstaltungen-quellen.md`). | veranstaltungen: 22 |
| `data/wohnungs-check.json` | 6 KB | Fragen, Gruppen und Empfehlungen des Wohnungs-Checks. | ratgeber: 4, gruppen: 5 |

**Anbieterdaten (nur Zählung, keine Inhalte):** `data/anbieter.json` hat 819 Einträge mit den Feldern `id, name, schwerpunkt, thema, kategorie_id, unterkategorie, stadt, einzugsgebiet, angebotsform, traegerart, kassenabrechnung, telefon, email, website, adresse` (Stand-Angabe „November 2026“, Modus „echt“). `assets/data/anbieter.json` hat ebenfalls 819 Einträge, davon befüllt: id 819, name 819, schwerpunkt 819, thema 819, kategorie_id 819, unterkategorie 819, stadt 819, angebotsform 773, traegerart 560, kassenabrechnung 819, telefon 730, email 358, website 502, adresse 770, einzugsgebiet 75; 31 verschiedene Orte; Verteilung nach Themenbereich: pflege-betreuung 308, alltag-persoenliche-hilfe 242, haushalt-reinigung 91, freizeit-lebensqualitaet 81, technik-sicherheit 63, wohnen-haus-handwerk 34.

**Veranstaltungen:** 22 Termine, Datumsbereich 2026-11-23 bis 2026-12-24, Städte: Düsseldorf, Hilden, Remscheid, Solingen, Wesel, Wuppertal; Themen: Kultur 5, Bildung 2, Gesundheit 6, Digital 2, Begegnung 7.
**Checklisten:** „Vorbereitung auf einen Arzttermin“ (11 Punkte); „Wohnung altersgerecht gestalten“ (12 Punkte); „Pflegegrad beantragen“ (11 Punkte); „Vorbereitung auf einen Handwerkertermin“ (11 Punkte).
**Wohnungs-Check:** 12 Fragen in 5 Gruppen (Eingang und Zugang 2, Flur und Treppen 3, Bad 2, Küche und Wohnräume 3, Licht und Notfall 2); verknüpfte Ratgeber: barrierefrei-wohnen, altersgerechter-umbau, treppenlift-einbau, hausnotruf-auswahl.

Weitere Dateien im Repo (nicht im Auftrag, nur zur Orientierung): `tools/build.py` (Generator), `tools/bilder.py`, `tools/kontakte.py`, `sitemap.xml`, `robots.txt`, `_headers`, `wrangler.jsonc`, `docs/pflegegradrechner-konzept.md`, `docs/veranstaltungen-quellen.md`, `assets/css/*.css` (6), `assets/fonts` (3).

## 6. Interne Verlinkung

### Hauptnavigation (Kopfbereich, auf allen Seiten gleich)

- Hilfe finden → `/themen/`
- Ratgeber → `/ratgeber/`
- Mein Alltag → `/mein-alltag/`
- Für Anbieter → `/fuer-anbieter/`
- Anfrage stellen → `/#anfrage`
- (Kopf, außerhalb Navigation) Konzept 60+ → `/`

### Footer (auf allen Seiten gleich)

- **Drei Wege** (3 Links): Hilfe finden → `/themen/`; Ratgeber – Wissen bekommen → `/ratgeber/`; Mein Alltag – Alltag erleichtern → `/mein-alltag/`
- **Themen** (6 Links): Wohnen, Haus und Handwerk → `/themen/wohnen-haus-handwerk/`; Haushalt und Reinigung → `/themen/haushalt-reinigung/`; Pflege und Betreuung → `/themen/pflege-betreuung/`; Alltag und persönliche Hilfe → `/themen/alltag-persoenliche-hilfe/`; Technik und Sicherheit → `/themen/technik-sicherheit/`; Freizeit und Lebensqualität → `/themen/freizeit-lebensqualitaet/`
- **Regionen** (8 Links): Düsseldorf → `/?region=duesseldorf#anfrage`; Wuppertal → `/?region=wuppertal#anfrage`; Hilden → `/?region=hilden#anfrage`; Remscheid → `/?region=remscheid#anfrage`; Solingen → `/?region=solingen#anfrage`; Langenfeld → `/?region=langenfeld#anfrage`; Haan → `/?region=haan#anfrage`; Wesel → `/?region=wesel#anfrage`
- **Informationen** (6 Links): So funktioniert’s → `/#so-funktionierts`; Veranstaltungen → `/veranstaltungen/`; Veranstaltung melden → `/veranstaltungen/melden/`; Für Anbieter → `/fuer-anbieter/`; Impressum → `/impressum/`; Datenschutz → `/datenschutz/`
- (Footer, außerhalb der Navigation) Konzept 60+ → `/`

Hinweis: Footer-Themenlinks führen auf `/themen/<slug>/`, Footer-Regionslinks auf `/?region=<slug>#anfrage` (Startseite mit Formular-Vorbelegung); Karten führen auf `/?thema=<slug>#anfrage`.

### Ein- und ausgehende interne Links je Seite

Zählung auf Seitenebene: *eindeutige Zielseiten*, ohne Link auf sich selbst, ohne Sprungmarken/Abfragen (`?thema=…` zählt als Link auf `/`). „Gesamt“ = inkl. Kopf/Fuß, „nur main“ = nur Links im Hauptinhalt. „Linkvorkommen“ = alle `<a>` mit interner Adresse inkl. Duplikate und Selbstlinks. Externe Links (http/https/mailto/tel) sind nicht enthalten.

| Seite | Ausgehend Gesamt | Ausgehend nur main | Eingehend Gesamt | Eingehend nur main | Linkvorkommen intern |
|---|---|---|---|---|---|
| `/` | 18 | 15 | 39 | 39 | 57 |
| `/404.html` | 15 | 3 | 0 | 0 | 35 |
| `/datenschutz/` | 14 | 2 | 39 | 3 | 33 |
| `/fuer-anbieter/` | 14 | 3 | 39 | 2 | 35 |
| `/impressum/` | 14 | 1 | 39 | 1 | 32 |
| `/mein-alltag/checklisten/` | 18 | 5 | 1 | 1 | 41 |
| `/mein-alltag/` | 17 | 5 | 39 | 4 | 37 |
| `/mein-alltag/pflegegrad-rechner/` | 16 | 3 | 4 | 4 | 35 |
| `/mein-alltag/wohnungs-check/` | 19 | 6 | 1 | 1 | 38 |
| `/ratgeber/alltag-gut-organisiert/` | 18 | 6 | 3 | 3 | 40 |
| `/ratgeber/altersgerechter-umbau/` | 18 | 6 | 9 | 9 | 42 |
| `/ratgeber/barrierefrei-wohnen/` | 18 | 6 | 7 | 7 | 41 |
| `/ratgeber/betrug-telefon-haustuer/` | 18 | 6 | 3 | 3 | 40 |
| `/ratgeber/eltern-aus-der-ferne-unterstuetzen/` | 18 | 6 | 5 | 5 | 40 |
| `/ratgeber/ernaehrung-ab-60/` | 18 | 6 | 5 | 5 | 42 |
| `/ratgeber/fruehstueck-ab-60-eiweiss/` | 18 | 6 | 6 | 6 | 42 |
| `/ratgeber/gemeinsam-statt-einsam/` | 18 | 6 | 7 | 7 | 40 |
| `/ratgeber/gesund-und-fit-im-alter/` | 20 | 8 | 5 | 5 | 43 |
| `/ratgeber/haushaltshilfe-betrieb-oder-privat/` | 18 | 6 | 4 | 4 | 40 |
| `/ratgeber/haushaltshilfe-im-alter/` | 18 | 6 | 8 | 8 | 40 |
| `/ratgeber/hausnotruf-auswahl/` | 18 | 6 | 7 | 7 | 40 |
| `/ratgeber/` | 35 | 22 | 39 | 22 | 52 |
| `/ratgeber/krankenfahrten/` | 18 | 6 | 6 | 6 | 40 |
| `/ratgeber/kurzzeitpflege/` | 20 | 8 | 5 | 5 | 45 |
| `/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/` | 29 | 17 | 11 | 11 | 55 |
| `/ratgeber/mobilitaet-im-alter-ohne-auto/` | 23 | 12 | 15 | 15 | 49 |
| `/ratgeber/patientenverfuegung-vorsorgevollmacht/` | 18 | 6 | 8 | 8 | 40 |
| `/ratgeber/pflegegrad-beantragen/` | 20 | 8 | 9 | 9 | 42 |
| `/ratgeber/pflegereform-2027/` | 18 | 6 | 6 | 6 | 43 |
| `/ratgeber/rente-reicht-nicht-finanzielle-hilfen/` | 26 | 14 | 8 | 8 | 49 |
| `/ratgeber/treppenlift-einbau/` | 18 | 6 | 7 | 7 | 40 |
| `/themen/alltag-persoenliche-hilfe/` | 20 | 13 | 39 | 13 | 46 |
| `/themen/freizeit-lebensqualitaet/` | 18 | 11 | 39 | 11 | 44 |
| `/themen/haushalt-reinigung/` | 16 | 9 | 39 | 9 | 42 |
| `/themen/` | 14 | 7 | 39 | 8 | 45 |
| `/themen/pflege-betreuung/` | 17 | 10 | 39 | 10 | 43 |
| `/themen/technik-sicherheit/` | 16 | 9 | 39 | 9 | 42 |
| `/themen/wohnen-haus-handwerk/` | 18 | 11 | 39 | 11 | 44 |
| `/veranstaltungen/` | 14 | 2 | 39 | 3 | 34 |
| `/veranstaltungen/melden/` | 14 | 3 | 39 | 2 | 35 |

### Tote interne Links

Es gibt **keine** toten internen Links: Bei allen `<a href>`-Zielen mit interner Adresse (Pfad beginnt mit `/` oder ist relativ) existiert die Zieldatei (`…/index.html` bzw. Datei). Die Zahl der geprüften Linkvorkommen: 1663.

Alle Sprungmarken (`#id`) auf interne Ziele finden sich im statischen HTML der Zielseite.

Alle per `src`, `srcset` und `<link href>` eingebundenen Ressourcen mit Pfad beginnend `/` existieren als Datei.

### Seiten ohne eingehende Links

- Ohne eingehenden Link von irgendeiner anderen Seite (inkl. Kopf/Fuß): `/404.html`
- Ohne eingehenden Link aus dem Hauptinhalt (`<main>`) einer anderen Seite (nur Kopf/Fuß-Links möglich): `/404.html`

Die Fehlerseite `/404.html` ist per Konfiguration (`wrangler.jsonc`, `not_found_handling: "404-page"`) erreichbar und wird nicht verlinkt.

### Externe Links (Überblick)

| Ziel (Host/Schema) | Linkvorkommen | Seiten |
|---|---|---|
| `www.caritas-duesseldorf.de` | 10 | 1 |
| `www.gesetze-im-internet.de` | 8 | 3 |
| `www.kfw.de` | 5 | 2 |
| `www.bmj.de` | 4 | 1 |
| `www.bundesgesundheitsministerium.de` | 3 | 3 |
| `gesund.bund.de` | 3 | 3 |
| `www.bahn.de` | 3 | 1 |
| `www.verbraucherzentrale.de` | 3 | 2 |
| `gesundheitscampuswesel.de` | 3 | 1 |
| `www.bergische-vhs.de` | 3 | 1 |
| `www.diakonie-kreis-mettmann.de` | 2 | 1 |
| `www.kath-hilden.de` | 2 | 1 |
| `www.bundestag.de` | 1 | 1 |
| `esth.bundesfinanzministerium.de` | 1 | 1 |
| `www.elster.de` | 1 | 1 |
| `www.minijob-zentrale.de` | 1 | 1 |
| `www.bmbfsfj.bund.de` | 1 | 1 |
| `www.bafa.de` | 1 | 1 |
| `recht.nrw.de` | 1 | 1 |
| `www.pflege.de` | 1 | 1 |
| `www.bundesregierung.de` | 1 | 1 |
| `www.mobil.nrw` | 1 | 1 |
| `www.g-ba.de` | 1 | 1 |
| `infoportal.mobil.nrw` | 1 | 1 |
| `www.tk.de` | 1 | 1 |
| `www.seniorenportal.de` | 1 | 1 |
| `www.vorsorgeregister.de` | 1 | 1 |
| `www.bundesaerztekammer.de` | 1 | 1 |
| `www.bmas.de` | 1 | 1 |
| `www.deutsche-rentenversicherung.de` | 1 | 1 |
| `www.bmwsb.bund.de` | 1 | 1 |
| `www.rundfunkbeitrag.de` | 1 | 1 |
| `verwaltung.bund.de` | 1 | 1 |
| `www.verbraucherzentrale.nrw` | 1 | 1 |
| `luettringhausen.ekir.de` | 1 | 1 |

## 7. Formulare

Alle Formulare sind statisch; keines sendet Daten an einen Server. Die Schrittformulare (`data-schritte`) enden mit einem Versand-Schritt: Zusammenfassung und Link zum E-Mail-Programm (`mailto:`) oder zu WhatsApp (`wa.me`) – gesendet wird erst im jeweiligen Programm. Empfänger stehen als Platzhalter in `assets/js/api.js`. `action`/`method="post"` ist gesetzt (Ausweichverhalten ohne JS), im Prototyp aber ohne Empfänger.

### anfrage-formular – `/`

- `action` = `/#anfrage`, `method` = `post`, Schrittmodus: ja
- Schritte im HTML: 5 Abschnitte mit Feldern (1 Ihr Anliegen; 2 Wo wird Hilfe benötigt?; 3 Worum geht es genau?; 4 Ihre Kontaktdaten; 5 Einwilligung); zusätzlich: Schritt „Anbieter in Ihrer Nähe“ (nur mit JS, `data-schritt-anbieter`, Trefferliste aus `anbieter.js`, ohne Formularfelder); Versand-Schritt (nur mit JS: Zusammenfassung + E-Mail/WhatsApp)

| Schritt | Feld (`name`) | Typ | Pflicht | Beschriftung / Optionen |
|---|---|---|---|---|
| Ihr Anliegen | `wer` | radio | ja | Für wen suchen Sie Hilfe? * – Auswahl (2): Für mich; Für Angehörige |
| Ihr Anliegen | `thema` | select | ja | Themenbereich * – 8 Optionen: Bitte wählen; Wohnen, Haus und Handwerk; Haushalt und Reinigung; Pflege und Betreuung; Alltag und persönliche Hilfe; Technik und Sicherheit; Freizeit und Lebensqualität; Etwas anderes / weiß nicht |
| Wo wird Hilfe benötigt? | `plz` | text | ja | PLZ * |
| Wo wird Hilfe benötigt? | `ort` | text | ja | Ort * |
| Worum geht es genau? | `beschreibung` | textarea | ja | Beschreiben Sie Ihr Anliegen * |
| Ihre Kontaktdaten | `vorname` | text | ja | Vorname * |
| Ihre Kontaktdaten | `nachname` | text | ja | Nachname * |
| Ihre Kontaktdaten | `telefon` | tel | nein | Telefon |
| Ihre Kontaktdaten | `email` | email | nein | E-Mail |
| Ihre Kontaktdaten | `rueckruf` | radio | nein | Wann dürfen wir Sie zurückrufen? (optional) – Auswahl (3): Vormittags (9–12 Uhr); Nachmittags (13–17 Uhr); Eigenes Zeitfenster |
| Ihre Kontaktdaten | `rueckruf_eigen` | text | nein | Ihr Zeitfenster * |
| Einwilligung | `einwilligung_bearbeitung` | checkbox | ja | Ich bin einverstanden, dass das Team von „ Konzept 60+ “ meine Angaben zur Bearbeitung der Anfrage nutzt und mich kontaktiert. * |
| Einwilligung | `newsletter` | checkbox | nein | Freiwillig: Newsletter mit Ratgeber-Tipps per E-Mail, jederzeit widerrufbar . |
| Ihr Anliegen | `leistungen` | checkbox | nein | „Was genau?“ – Chip-Gruppe je Themenbereich (6 Gruppen, nur die zum Thema passende sichtbar), insgesamt 44 Checkboxen inkl. je „Sonstiges“, Inhalte siehe Abschnitt 3 |

### anbieter-formular – `/fuer-anbieter/`

- `action` = `/fuer-anbieter/#registrierung`, `method` = `post`, Schrittmodus: ja
- Schritte im HTML: 7 Abschnitte mit Feldern (1 Art des Angebots; 2 Angaben zum Betrieb (nur für Betriebe); 3 Leistungen und Einsatzorte (nur für Betriebe); 2 Angaben zu Ihnen (nur für private Helfer); 3 Ihr Angebot (nur für private Helfer); 4 Kontakt; 5 Einwilligung); zusätzlich: Versand-Schritt (nur mit JS: Zusammenfassung + E-Mail/WhatsApp)

| Schritt | Feld (`name`) | Typ | Pflicht | Beschriftung / Optionen |
|---|---|---|---|---|
| Art des Angebots | `art` | radio | ja | Wie möchten Sie sich registrieren? * – Auswahl (2): Gewerblicher Dienstleister Betrieb, Selbstständige, Organisa; Privater Helfer Einfache Alltagshilfe als Privatperson |
| Angaben zum Betrieb (nur für Betriebe) | `firma` | text | nein | Firmenname * |
| Angaben zum Betrieb (nur für Betriebe) | `ansprechpartner` | text | nein | Ansprechpartner (Vor- und Nachname) * |
| Leistungen und Einsatzorte (nur für Betriebe) | `bereiche` | checkbox | nein | Leistungsbereiche * (mehrere möglich) – Auswahl (6): Wohnen, Haus und Handwerk; Haushalt und Reinigung; Pflege und Betreuung; Alltag und persönliche Hilfe; Technik und Sicherheit; Freizeit und Lebensqualität |
| Leistungen und Einsatzorte (nur für Betriebe) | `einsatzorte` | checkbox | nein | Einsatzorte / Regionen * (mehrere möglich) – Auswahl (8): Düsseldorf; Wuppertal; Hilden; Remscheid; Solingen; Langenfeld; Haan; Wesel |
| Leistungen und Einsatzorte (nur für Betriebe) | `weitere_orte` | text | nein | Weitere Orte (freiwillig) |
| Angaben zu Ihnen (nur für private Helfer) | `vorname` | text | nein | Vorname * |
| Angaben zu Ihnen (nur für private Helfer) | `nachname` | text | nein | Nachname * |
| Ihr Angebot (nur für private Helfer) | `hilfe` | checkbox | nein | Wobei möchten Sie helfen? * (mehrere möglich) – Auswahl (6): Einkaufen und Besorgungen; Begleitung zu Terminen oder Spaziergängen; Gesellschaft leisten, Vorlesen; Hilfe bei Smartphone und Tablet; Leichte Gartenarbeit; Kleine Handgriffe im Haushalt |
| Ihr Angebot (nur für private Helfer) | `region` | select | nein | Wo möchten Sie helfen? * – 10 Optionen: Bitte wählen; Düsseldorf; Wuppertal; Hilden; Remscheid; Solingen; Langenfeld; Haan; Wesel; Andere Region |
| Ihr Angebot (nur für private Helfer) | `verfuegbarkeit` | checkbox | nein | Wann haben Sie in der Regel Zeit? * (mehrere möglich) – Auswahl (4): Werktags vormittags; Werktags nachmittags; Abends; Am Wochenende |
| Kontakt | `email` | email | ja | E-Mail * |
| Kontakt | `telefon` | tel | nein | Telefon (freiwillig) |
| Kontakt | `nachricht` | textarea | nein | Was sollten wir noch wissen? (freiwillig) |
| Einwilligung | `einwilligung` | checkbox | ja | Ich bin einverstanden, dass das Team von „ Konzept 60+ “ meine Angaben zur Prüfung meiner Registrierung und zur Kontaktaufnahme verwendet. Mehr dazu in der Datenschutzerklärung . * |

Die Schritte 2 und 3 gibt es zweimal (je nach Auswahl „Gewerblicher Dienstleister“ bzw. „Privater Helfer“, `data-art-bereich`); sichtbar ist nur der zur Art passende Satz.

### wohnungs-check-formular – `/mein-alltag/wohnungs-check/`

- `action` = `None`, `method` = `None`, Schrittmodus: nein

| Schritt | Feld (`name`) | Typ | Pflicht | Beschriftung / Optionen |
|---|---|---|---|---|
| – | `zugang-stufen` | radio | nein | Kommen Sie sicher in Ihre Wohnung oder Ihr Haus – auch bei Nässe und Dunkelheit? – Auswahl (3): Ja; Teilweise; Nein |
| – | `zugang-greifen` | radio | nein | Können Sie Haustür, Schlüssel und Briefkasten gut greifen und bedienen? – Auswahl (3): Ja; Teilweise; Nein |
| – | `flur-stolper` | radio | nein | Sind Ihre Böden frei von Stolperfallen wie losen Teppichen, Kabeln oder Türschwellen? – Auswahl (3): Ja; Teilweise; Nein |
| – | `flur-treppen` | radio | nein | Haben Ihre Treppen einen stabilen Handlauf und gut erkennbare Stufenkanten? – Auswahl (3): Ja; Teilweise; Nein |
| – | `flur-wege` | radio | nein | Sind Flure und Durchgänge frei, sodass Sie auch mit Gehhilfe gut durchkommen? – Auswahl (3): Ja; Teilweise; Nein |
| – | `bad-rutsch` | radio | nein | Ist der Boden in Dusche oder Wanne rutschfest? – Auswahl (3): Ja; Teilweise; Nein |
| – | `bad-halt` | radio | nein | Gibt es feste Haltegriffe an Dusche, Wanne und WC? – Auswahl (3): Ja; Teilweise; Nein |
| – | `wohnen-greifhoehe` | radio | nein | Liegen die Dinge, die Sie täglich brauchen, in bequemer Reichweite – ohne Leiter oder Hocker? – Auswahl (3): Ja; Teilweise; Nein |
| – | `wohnen-sitzen` | radio | nein | Gibt es Stühle oder Sessel, aus denen Sie leicht und sicher aufstehen können? – Auswahl (3): Ja; Teilweise; Nein |
| – | `wohnen-moebel` | radio | nein | 10 Stehen die Möbel, auf die Sie sich beim Gehen stützen, fest und stabil? – Auswahl (3): Ja; Teilweise; Nein |
| – | `licht-nacht` | radio | nein | 11 Sind Flure, Treppen und der Weg zur Toilette nachts ausreichend beleuchtet? – Auswahl (3): Ja; Teilweise; Nein |
| – | `licht-notruf` | radio | nein | 12 Können Sie in jedem Raum im Notfall Hilfe rufen – zum Beispiel mit einem Telefon in Reichweite oder einem Notrufknopf? – Auswahl (3): Ja; Teilweise; Nein |

Kein Schrittformular und kein Versand: 12 Radiofragen (Ja / Teilweise / Nein) in 5 Gruppen; die Auswertung entsteht per JS in der Seite (`alltag.js`).

### (ohne id) – `/veranstaltungen/`

- `action` = `None`, `method` = `None`, Schrittmodus: nein

| Schritt | Feld (`name`) | Typ | Pflicht | Beschriftung / Optionen |
|---|---|---|---|---|
| – | `ort` | select | nein | Ort – 7 Optionen: Alle Orte; Düsseldorf; Hilden; Remscheid; Solingen; Wesel; Wuppertal |

Filterformular (`data-ev-filter`) ohne Senden: Ort-Auswahl (`ort`, Feld oben) plus 6 Themen-Schaltflächen (`<button data-ev-thema>`: Alle Themen, Kultur, Bildung, Begegnung, Digital, Gesundheit; keine `input`-Felder) und „Filter zurücksetzen“; wirkt nur auf die Liste der Seite.

### melden-formular – `/veranstaltungen/melden/`

- `action` = `/veranstaltungen/melden/`, `method` = `post`, Schrittmodus: ja
- Schritte im HTML: 6 Abschnitte mit Feldern (; 1 Die Veranstaltung; 2 Wann und wo?; 3 Weitere Angaben; 4 Der Veranstalter; 5 Bestätigung); zusätzlich: Versand-Schritt (nur mit JS: Zusammenfassung + E-Mail/WhatsApp)

| Schritt | Feld (`name`) | Typ | Pflicht | Beschriftung / Optionen |
|---|---|---|---|---|
| – | `website` | text | nein | Bitte leer lassen |
| Die Veranstaltung | `titel` | text | ja | Titel * |
| Die Veranstaltung | `kategorie` | select | ja | Thema * – 7 Optionen: Bitte wählen; Bewegung; Kultur; Bildung; Begegnung; Digital; Gesundheit |
| Die Veranstaltung | `beschreibung` | textarea | ja | Kurzbeschreibung * |
| Wann und wo? | `datum` | date | ja | Datum * |
| Wann und wo? | `beginn` | time | ja | Beginn * |
| Wann und wo? | `ende` | time | nein | Ende (optional) |
| Wann und wo? | `stadt` | select | ja | Stadt * – 9 Optionen: Bitte wählen; Düsseldorf; Wuppertal; Hilden; Remscheid; Solingen; Langenfeld; Haan; Wesel |
| Wann und wo? | `ort` | text | ja | Veranstaltungsort mit Straße * |
| Weitere Angaben | `barrierefrei` | radio | nein | Ist der Ort barrierefrei zugänglich? – Auswahl (3): Ja; Nein; Weiß ich nicht |
| Weitere Angaben | `anmeldung` | radio | nein | Ist eine Anmeldung nötig? – Auswahl (2): Ja; Nein |
| Weitere Angaben | `kosten` | text | nein | Kosten (optional) |
| Weitere Angaben | `link` | url | nein | Internetseite zur Veranstaltung (optional) |
| Der Veranstalter | `veranstalter` | text | ja | Name des Veranstalters * |
| Der Veranstalter | `ansprechperson` | text | ja | Ansprechperson * |
| Der Veranstalter | `email` | email | ja | E-Mail * |
| Der Veranstalter | `telefon` | tel | nein | Telefon (optional) |
| Bestätigung | `einwilligung` | checkbox | ja | Ich bin berechtigt, diese Angaben zu machen, und mit der Veröffentlichung nach Prüfung einverstanden. Meine Kontaktdaten dürfen für Rückfragen verwendet werden. Datenschutz * |

**Weitere Eingabe-Oberflächen ohne `<form>`:** Unterstützungs-Assistent auf `/` (`data-assistent`, 2–3 Radio-Fragen laut `assistent.js`: „Was beschäftigt Sie gerade?“ mit 4 Zielen, „Worum geht es konkret?“ mit 6 Themen bzw. 5 Alltagswerkzeugen, bei „praktisch“/„Angehörige“ zusätzlich Ort mit 8 Orten + „Andere Stadt“); Pflegegradrechner auf `/mein-alltag/pflegegrad-rechner/` (per JS erzeugter Fragebogen, 29 Schritte in `data/pflegegrad/fragen.json`); Checklisten (Checkboxen, 4 Listen); Ratgeber-Themenfilter auf `/ratgeber/`; Kontaktfenster der Anbieterliste (`<dialog>` per JS).

## 8. Auffälligkeiten (nur Fakten)

- **Platzhalter-Seiten:** `/impressum/` (113 Wörter) und `/datenschutz/` (491 Wörter) tragen „(Platzhalter)“ im `<title>` und einen sichtbaren Platzhalter-Hinweis („wird ausformuliert und rechtlich geprüft“); die README nennt beide „muss rechtlich geprüft werden“.
- **Platzhalter-Domain:** `https://www.example.org` steht in 39 von 40 Seiten (Canonical, Open Graph, JSON-LD; ausgenommen `/404.html`) und in `sitemap.xml`/`robots.txt`. Die README sagt „Alle Inhalte sind Beispieldaten“, während `data/anbieter.json` `"modus": "echt"` und `data/veranstaltungen.json` „Echte Termine aus öffentlichen Quellen“ ausweisen; der Footer jeder Seite trägt den Hinweis „Prototyp Beispieldaten: Formulare senden nichts, die Domain ist ein Platzhalter“. Alle 39 Seiten außer `/404.html` stehen in `sitemap.xml` (geprüft: 39 von 39).
- **Versand-Empfänger:** `3` Seiten mit Formular zeigen den Hinweis „Die Empfänger sind Platzhalter“; die Empfängerdaten stehen nur in `assets/js/api.js` (`KONTAKT`). Es gibt keinen aktiven Server-Versand (kein POST-Ziel).
- **Impressum/Datenschutz im Footer:** `/impressum/` und `/datenschutz/` sind aus allen 39 anderen Seiten verlinkt (eingehend: 39 bzw. 39 Seiten), obwohl beide Platzhalter sind.
- **README nicht auf dem Stand der Seiten:** Die README-Tabelle nennt `/ratgeber/<slug>/ (4×)`, es gibt 21 Beiträge; `/veranstaltungen/` und `/veranstaltungen/melden/` stehen nicht in der Seitentabelle der README (nur im Fließtext/WordPress-Abschnitt).
- **Ungenutzte Bilder:** 1 Datei in `assets/img` ohne Verweis in HTML/CSS/JS/JSON: `hero-garten.png` (2.5 MB, 1672×941); alle anderen Dateien sind in mindestens einer generierten Seite eingebunden.
- **Ratgeber-Bilder:** Titelbild-Basisnamen im Frontmatter: keine doppelt verwendet; Bilder im Text (`inline_bild`) bei 15 von 21 Beiträgen; Beiträge ohne Textbild: `betrug-telefon-haustuer`, `gemeinsam-statt-einsam`, `haushaltshilfe-im-alter`, `hausnotruf-auswahl`, `patientenverfuegung-vorsorgevollmacht`, `pflegereform-2027`.
- **Doppelungen im Text:** 26 Absätze/Listenpunkte (≥ 70 Zeichen) kommen auf mehr als einer Seite wortgleich vor, vor allem: Themenkarten-Texte auf `/` und `/themen/`; Ratgeber-Anreißer auf `/` und `/ratgeber/`; der Standard-Hinweis „Dieser Beitrag dient der allgemeinen Information …“ in 10 Beiträgen; die 5 Textbausteine der Themenseiten in allen 6 Themenseiten; Datenschutz-/Prototyp-Hinweise der Versand-Schritte auf 3 Seiten.
- **Inhaltlich benachbarte Beiträge** (nach Titel/Thema, keine Textprüfung): `haushaltshilfe-im-alter` und `haushaltshilfe-betrieb-oder-privat`; `ernaehrung-ab-60` und `fruehstueck-ab-60-eiweiss`; `pflegegrad-beantragen`, `pflegereform-2027` und `kurzzeitpflege` (alle mit Pflegereform-2027-Bezug laut Stand-Angabe); `barrierefrei-wohnen`, `altersgerechter-umbau` und `treppenlift-einbau` (im Wohnungs-Check gemeinsam verlinkt).
- **Stand-Angaben:** 4 Beiträge mit „2027“ im Feld `stand` (Regierungsentwurf, geplante Regeln): `kurzzeitpflege`, `mehrgenerationenhaus-mehrgenerationenwohnen`, `mobilitaet-im-alter-ohne-auto`, `rente-reicht-nicht-finanzielle-hilfen`; Veröffentlichungsdaten reichen von 2026-11-20 bis 2026-11-23.
- **Meta-Felder Ratgeber:** `seo_titel` bei 5 und `meta_beschreibung` bei 5 von 21 Beiträgen gesetzt; Länge der `<title>`-Texte: 20–102 Zeichen (Seiten über 70 Zeichen: 21).
- **Veranstaltungen:** `data/veranstaltungen.json` hat 22 Einträge, die generierte Seite zeigt 21: `tools/build.py` lässt Termine vor dem Build-Datum weg, der Eintrag vom 2026-11-23 fehlt deshalb. Die Seite ist statisch erzeugt; heute (2026-11-25) liegt/liegen 1 der angezeigten Termine vor diesem Datum. Der Datenbestand deckt 2026-11-23 bis 2026-12-24 ab (31 Tage).
- **Verlinkung:** 0 tote interne Links; 0 Sprungmarken ohne statisches Ziel; Seiten ohne eingehenden Link: 1 (`/404.html` ausgenommen); Seiten ohne eingehenden Link aus dem Hauptinhalt: `/404.html`.
- **Wenig verlinkte Seiten** (höchstens 1 eingehender Link aus dem Hauptinhalt anderer Seiten, Kopf/Fuß nicht gezählt): `/impressum/`, `/mein-alltag/checklisten/`, `/mein-alltag/wohnungs-check/`. Die Seite `/veranstaltungen/` ist nicht in der Hauptnavigation, nur im Footer und im Hauptinhalt von 3 Seite(n).
- **Struktur:** Seiten mit genau einer h1: 40 von 40; `<img>` ohne `alt`-Attribut: 0; `<img>` mit leerem `alt` (dekorativ): 141.
- **Ratgeber-Querverweise im Text:** 53 interne Links in 21 Beiträgen insgesamt; Beiträge ohne einen einzigen internen Link im Text: `alltag-gut-organisiert`, `betrug-telefon-haustuer`, `eltern-aus-der-ferne-unterstuetzen`, `gemeinsam-statt-einsam`, `haushaltshilfe-betrieb-oder-privat`, `haushaltshilfe-im-alter`, `hausnotruf-auswahl`, `krankenfahrten`, `patientenverfuegung-vorsorgevollmacht`, `treppenlift-einbau`.
- **Daten/Skripte ohne Seitenbezug:** alle JS-Dateien werden auf mindestens einer Seite geladen.

---
Erzeugt mit einem Python-Skript (BeautifulSoup/PIL) aus den generierten Dateien; Skript liegt im Scratchpad der Sitzung und ist nicht Teil des Repos.
