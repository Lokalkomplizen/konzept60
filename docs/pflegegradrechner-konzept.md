# Pflegegradrechner – Konzept und Datenbasis (Etappe 1)

Stand: 20.11.2026 · Status: Entwurf zur Freigabe

## 1. Ziel und Grenzen

Orientierungswerkzeug: Selbsteinschätzung nach dem Neuen Begutachtungsassessment (NBA, § 15 SGB XI), danach Leistungen 2026, geplante Änderungen 2027 und passende Hilfe über „Wir helfen“.

Was der Rechner **nicht** ist: keine Begutachtung, keine Rechtsberatung, keine Leistungszusage. Das Ergebnis wird als „voraussichtlich“ mit Hinweis auf die Unschärfe einer Laien-Selbsteinschätzung gezeigt.

Nicht abgebildet (bewusst):
- Kinder (§ 15 Abs. 6 und 7, Kriterien 4.K und 5.K): Altersvergleich ist in einem Laien-Fragebogen nicht seriös abbildbar. Der Rechner fragt nach dem Alter und verweist Kinder an die Pflegekasse.
- Besondere Bedarfskonstellation (§ 15 Abs. 4): nur als Hinweisfrage, keine automatische Einstufung.

## 2. Seitenstruktur

| URL | Inhalt |
|---|---|
| `/mein-alltag/pflegegrad-rechner/` | Start, Fragebogen (eine Frage bzw. kleine Gruppe pro Schritt), Zusammenfassung, Ergebnis |
| Ergebnisbereich (gleiche Seite) | Punkte, Grad, Modulgrafik, Leistungen 2026, Vergleich 2027, „Was bedeutet die Reform für mich?“, passende Hilfe, PDF |
| `/ratgeber/pflegereform-2027/` | bestehender Beitrag (PR #2), wird verlinkt statt dupliziert |

Einordnung in die Säule „Mein Alltag“ (Werkzeuge), Verlinkung aus Thema „Pflege und Betreuung“ und Ratgeber „Pflegegrad beantragen“.

## 3. Architektur

```
data/pflegegrad/
  nba-2017.json            geltende Bewertungsregeln (Anlage 1 + 2 zu § 15 SGB XI)
  nba-2027-entwurf.json    Schwellen laut PNOG-Entwurf (nur Hinweis, nicht gerechnet)
  leistungen.json          Leistungspakete mit Rechtsstatus, Gültigkeit, Quellen
  fragen.json              (Etappe 2) Laien-Fragen ↔ Kriterium-IDs, Hilfetexte
assets/js/pflegegrad/
  nba.js                   reine Rechenlogik, UMD (Browser + Node), keine DOM-Zugriffe
  rechner.js               (Etappe 2) Fragebogen-UI, Fortschritt, Zusammenfassung
  ergebnis.js              (Etappe 3) Ergebnis, Vergleich, Druck/PDF
tests/nba.test.js          node --test tests/*.test.js
```

Prinzipien:
- **Regeln stehen in JSON, nicht im Code.** Eine Gesetzesänderung = neue JSON-Datei mit `rechtsstatus`/`gueltig_ab`, kein neuer Code.
- **Rechtsstatus je Paket:** `geltend` · `beschlossen` (verkündet, noch nicht in Kraft) · `gesetzentwurf` · `historisch`. Die UI wählt nach Datum und Status; Entwürfe werden nie stillschweigend gerechnet.
- **Exakte Arithmetik:** Gesetz nennt keine Rundung. Modul 5 wird ganzzahlig in „pro 210 Tage“ bzw. Zehnteln gerechnet (sonst ergibt 3 × 4,3 = 12,8999… und eine falsche Stufe), Gesamtpunkte in Hundertsteln.
- **Datenschutz:** keine Netzwerkanfragen, kein localStorage (Projektlinie). „Zwischenspeichern während der Sitzung“ = Zustand im Arbeitsspeicher der geöffneten Seite; Neuladen setzt zurück. PDF über die Druckfunktion des Browsers (`print.css`), keine Bibliothek, kein Dienst.
- **Auslieferung:** `data/` wird nicht veröffentlicht (`.assetsignore`). `build.py` bettet die JSON-Pakete beim Erzeugen der Rechnerseite als `<script type="application/json">` ein (kein fetch).
- **WordPress:** JSON-Dateien und `nba.js` werden unverändert per `wp_enqueue_script` / `wp_localize_script` eingebunden; Seite als Template oder Shortcode `[wirhelfen_pflegegradrechner]`.

## 4. Bewertungslogik (geprüft gegen Gesetzestext)

Quelle: gesetze-im-internet.de, § 15, Anlage 1 und Anlage 2 SGB XI, abgerufen 20.11.2026.

1. Einzelpunkte je Kriterium nach Anlage 1 (Skalen unterscheiden sich je Modul: Selbstständigkeit, Fähigkeiten, Häufigkeit; 4.8 Essen ×3, 4.9/4.10 ×2; 4.11/4.12 nur bei Inkontinenz/künstlicher Ableitung; 4.13 Sonde teilweise 6, vollständig 3).
2. Modul 5: Häufigkeiten in Tagesdurchschnitt (Tag + Woche/7 + Monat/30) für 5.1–5.7 und 5.8–5.11; gewichtete Besuche für 5.12–5.15 (4,3 / 8,6 / 2 / täglich 60); 5.16 als Skala.
3. Summe je Modul → Stufe (keine … schwerste) → gewichtete Punkte nach Anlage 2.
4. Modul 2 und 3: nur der höhere gewichtete Wert zählt.
5. Gesamtpunkte → Pflegegrad: 12,5 / 27 / 47,5 / 70 / 90.

Tests: 22 Fälle, alle Grenzen knapp darunter/darauf, Modul-5-Schwellen, Gleitkomma-Fallen, ungültige Eingaben. **Keine amtlichen Referenzfälle** – der Medizinische Dienst veröffentlicht keine durchgerechneten Beispielfälle. Die Erwartungswerte sind von Hand aus Anlage 1/2 nachgerechnet.

## 5. Fragebogen (Etappe 2, umgesetzt)

- 64 Kriterien sind zu viel für Laien in 10–15 Minuten. Ansatz: Jedes Kriterium bleibt einzeln (keine eigene Formel), aber **Filterfragen** überspringen ganze Blöcke („Gibt es Verhaltensweisen, die Ihnen Sorgen machen?“ nein → Modul 3 = 0). Ergebnis bleibt identisch, weil übersprungene Kriterien sachlich 0 sind.
- Antworttexte je Skala in Alltagssprache, aber 1:1 auf die Stufen von Anlage 1 abgebildet.
- Modul 5 mit „Wie oft?“-Eingabe (pro Tag/Woche/Monat), nicht mit vier Stufen.
- Hilfetexte nach den Begutachtungsrichtlinien des MD; diese sind vor Etappe 2 im Original zu lesen (siehe offene Punkte).

## 6. Ergebnis und Leistungen (Etappe 3, Plan)

- Ergebnis: Punkte, Grad, horizontale Balken je Modul (gewichtet / maximal), Modul 2/3 mit Kennzeichnung „zählt“.
- Hinweis bei Ergebnis im Bereich alter/neuer Schwelle (12,5–15, 27–30, 47,5–50): „Nach dem Gesetzentwurf würde dieser Wert bei einem Antrag ab 2027 voraussichtlich einen Grad niedriger eingestuft.“
- Leistungen 2026 aus `leistungen.json`, Vergleich 2027 mit Status-Badge „Gesetzentwurf – noch nicht beschlossen“, Monats- und Jahresbeträge getrennt, **keine Summenzeile** („Sie erhalten insgesamt …“ wird nicht gezeigt).
- Drei Farben/Labels: über Pflegekasse finanzierbar · nur über anerkannte Angebote (§ 45a, NRW AnFöVO) · privat zu zahlen.

## 7. Offene Punkte (Stopp statt Erfindung)

| Punkt | Status | Was fehlt |
|---|---|---|
| 2027-Beträge (Entlastungs-, Sachleistungs-, Sozialraum-, Überbrückungsbudget) | nur sekundär belegt | §§ 36, 37, 45b SGB XI-E im Original der Drucksache 21/8869 lesen |
| Neue Schwellen 15/30/50 | nur sekundär belegt | § 15 SGB XI-E im Original; Bestandsschutz-Regel |
| Briefing-Werte 386/638/889/1.079, 2.089/2.529, Überbrückung 1.855 | **nicht übernommen** | 386/638 = Referentenentwurf; übrige in keiner Quelle gefunden |
| Hälftige Auszahlung erste 3 Monate | **nicht übernommen** | laut Sekundärquellen im Regierungsentwurf gestrichen |
| Pflegebegleitung | Drucksache: ab 01.01.2029 | Briefing nennt 2027 – angepasst |
| Begutachtungsrichtlinien (BRi, Kap. 4.9: Abgrenzung je Kriterium) | **nicht im Original gelesen** – PDF (Stand Jan. 2024) technisch nur bis Kap. 4.5 abrufbar | Fragetexte stützen sich auf Anlage 1, die MDS-Broschüre „Die Selbstständigkeit als Maß der Pflegebedürftigkeit“ (Treppen-Beispiel, Modul 3 nur mit Unterstützungsbedarf, Hilfsmittel = selbstständig) und allgemeine Stufenbeschreibungen. Vor Livegang Kap. 4.9 gegenlesen. |
| NRW-Anerkennung (AnFöVO) | nicht geprüft | Anbieterprofil braucht internes Merkmal „anerkannt nach § 45a“ |
| Vorpflegezeit Verhinderungspflege | Wegfall seit 01.07.2025 [wahrscheinlich] | § 39 im Original prüfen |
| Beitrags-/Finanzierungsthemen (Kinderlose 0,9 %, Minijobs, BBG 6.375 €, Ehegattenzuschlag 0,52) | nicht geprüft | Drucksache Artikel zu §§ 55, 57 SGB XI-E |
| Gesetzgebungsverfahren | Anhörung 25.11.2026 (amtlich), 2./3. Lesung 11.12., Bundesrat 18.12. (sekundär) | nach 18.12. neu prüfen |

## 8. Risiken

- **Haftung/Erwartung:** Selbsteinschätzungen weichen erfahrungsgemäß oft vom Gutachten ab. Gegenmittel: klare Formulierung, kein „Ihnen steht zu“, Hinweis auf Widerspruchsmöglichkeit und Pflegeberatung (§ 7a).
- **Reform während der Entwicklung:** Das Gesetz kann bis 18.12.2026 geändert werden. Deshalb Datenpakete statt fester Texte; nach Verkündung nur JSON austauschen.
- **SEO-Erwartung „KI-Suche“:** strukturierte Daten nur, wo sie zutreffen (WebApplication, BreadcrumbList, FAQPage nur bei sichtbarer FAQ).

## 9. Stand Etappe 2

- Seite `/mein-alltag/pflegegrad-rechner/`, Karte auf `/mein-alltag/`, Eintrag im Assistenten.
- `data/pflegegrad/fragen.json`: 29 Schritte (bei allen Filtern „Nein“ 13), 64 Kriterien; `build.py` bricht ab, wenn ein Kriterium fehlt oder doppelt ist.
- Filterfragen für Modul 2, 3, 5 und für 4.11/4.12; übersprungene Kriterien zählen 0 (inhaltlich identisch, weil „keine Einschränkung“).
- Hinweise im Ergebnis: Nähe zur Grenze (Anzeigeregel von Wir helfen, 3 Punkte, keine Gesetzesregel), besondere Bedarfskonstellation (§ 15 Abs. 4, nur Hinweis), Reform 2027 (nur wenn der Entwurf einen niedrigeren Grad ergäbe).
- Tests: `node --test tests/*.test.js` (22 Rechentests) und `tests/rechner.e2e.js` (Durchlauf im Browser, Desktop + Handy: UI-Ergebnis = nba.js, Schrittzahl, Pflichtfelder, keine Netzwerkanfragen, kein Storage).
- Offen für Etappe 3: Leistungen 2026, Vergleich 2027, „Was bedeutet die Reform für mich?“, Vermittlung nach Themen, PDF-Layout (print.css), SEO/FAQ/JSON-LD.
