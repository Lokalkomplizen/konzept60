# Relaunch Phase 2: Konzept Suche, Assistent und Umkreissuche

Stand: 25.11.2026 · gilt für Master-Prompt Punkte 5, 10, 11 · Grundlage: `bestandsaufnahme.md`, `data/anbieter.json` (819 Einträge), `data/kategorie-zuordnung.json`

Grundsatz (Tommy, 25.11.2026): **Der Besucher wählt seinen Anbieter selbst.** Persönliche Vermittlung („Bei uns melden") ist der Rückfallweg, wenn nichts passt oder jemand Hilfe braucht.

---

## 1. Was die Daten hergeben (und was nicht)

| Merkmal | Vorhanden | Folge |
|---|---|---|
| Thema (6 Bereiche) | alle 819 | Grobfilter |
| Unterkategorie (`kategorie_id`, 41 Werte) | alle 819 | **Feinfilter für ein Anliegen.** Das ist der einzige Weg, damit ein allgemeiner Handwerker nicht beim Treppenlift erscheint. |
| PLZ in der Adresse | 716 von 819 | Koordinate über PLZ-Mittelpunkt |
| Stadt | alle 819 | Rückfall-Koordinate (Stadtmitte, Entfernung mit „ca.") |
| Einzugsgebiet | 75 Einträge | Anbieter, die ausdrücklich in den Wohnort kommen, gelten als Treffer, auch wenn sie weiter weg sitzen |
| Angebotsform (Hausbesuch / vor Ort) | 773 | Filterfrage bei Therapie, Fußpflege, Kursen |
| Kassenabrechnung | 235 ja, 16 nein, 568 unbekannt | nur Sortierung („ja" zuerst), nie Ausschluss |
| Treppenart, Etagen, Häufigkeit, Wohnungsgröße | **nein** | Fragen dazu ändern die Liste nicht, siehe 3. |
| Logo, Bild, Google-Sterne | **nein** | Kein Logo, Themenbild als Platzhalter-Fläche. Google nur als Link (Tommy, 24.11.2026). |

Dünne Stellen [Certain, gezählt]: Treppenlift 5 Anbieter, Hausmeister/Reparaturen 3, Handwerker 1, Umzug 1, Wäsche 1, Einbruchschutz 2, Seniorenassistenz 2. Wesel 0 Einträge. Düsseldorf nur 29, aber Nachbarstädte (Ratingen, Erkrath, Hilden, Mettmann) liegen im 20-km-Umkreis. Die Umkreissuche macht die Liste für Düsseldorf also deutlich besser.

## 2. Der Anliegen-Katalog (neu: `data/anliegen.json`)

Herzstück von Suche und Assistent. Ein **Anliegen** ist das, was der Besucher meint („Treppenlift", „Badewanne durch Dusche ersetzen"), nicht eine Branche.

```json
{
  "id": "bad-dusche",
  "titel": "Badewanne durch Dusche ersetzen",
  "thema": "wohnen-haus-handwerk",
  "gruppe": "badezimmer",
  "kategorien": ["01.01"],
  "verwandt": ["bad-umbau", "haltegriffe"],
  "begriffe": ["dusche statt badewanne", "wanne raus", "bodengleiche dusche", "walk in dusche", "duschtasse", "badewanne ausbauen"],
  "fragen": ["foerderung-bad", "ort", "radius"],
  "notizfragen": ["bad-zustand"],
  "ratgeber": ["barrierefrei-wohnen", "altersgerechter-umbau"]
}
```

- `kategorien` sind **streng**: Nur Anbieter mit genau diesen Kategorie-IDs sind Treffer. Verwandte Kategorien erscheinen nur als Vorschlag bei null Treffern.
- `gruppe` bündelt Anliegen für den Einstieg „Badezimmer" → sechs Möglichkeiten (Beispiel aus dem Prompt).
- Anliegen ohne passende Anbieter-Kategorie (z. B. „Zuschüsse für Badumbau finden") führen zum Ratgeber und zum Rückfallweg, nicht zu einer leeren Liste. Das wird beim Anliegen sichtbar angekündigt („Dazu haben wir einen Ratgeber").
- Erste Fassung: rund 45 Anliegen aus den 39 Leistungen in `data/themen.json`, den 41 Unterkategorien der Excel und den Beispielen aus dem Prompt. Keine bestehende Leistung fällt weg. Neu dazu kommen u. a. „Treppenlift und Hilfsmittel".

## 3. Fragen: nur was wirkt

Regel 13 im Prompt verbietet Elemente, die nur optisch funktionieren. Darum gibt es zwei Arten von Fragen, und der Besucher sieht den Unterschied:

1. **Filterfragen** ändern die Trefferliste. Beispiele: Art der Pflege (Pflege zu Hause, Tages- oder Kurzzeitpflege, Demenz, Palliativ), Art der Haushaltshilfe (Reinigung 02.01, Wäsche 02.02, Kochen/Essen 02.04, Einkaufen 02.03), Hausbesuch oder vor Ort, Ort und Radius.
2. **Notizfragen** ändern die Liste nicht, helfen aber beim Anruf. Beispiele: Treppenart, innen oder außen, Etagen, Häufigkeit der Haushaltshilfe. Sie stehen nach den Filterfragen, sind immer überspringbar und tragen den Hinweis „Für Ihr Gespräch mit dem Anbieter". Die Antworten erscheinen im Ergebnis als **Notizzettel** („Das sollten Sie am Telefon sagen"), der mit Drucken, E-Mail und WhatsApp weitergegeben werden kann und im Text für „Bei uns melden" landet.

Höchstens vier Fragen bis zur Liste, Ort zählt mit. Jede Frage hat große Auswahlflächen (mindestens 56 px hoch, 12 px Abstand), keine Dropdowns.

Beispiel Treppenlift: Anliegen → Ort/PLZ → Radius → **Liste**. Danach optional: Treppenart, innen/außen, Etagen → Notizzettel.
Beispiel Haushaltshilfe: Welche Unterstützung (Filter) → Ort/PLZ → Radius → **Liste**. Häufigkeit als Notizfrage.

## 4. Umkreissuche

> **Zurückgestellt (Tommy, 25.11.2026):** Die Umkreissuche wird vorerst nicht gebaut. Gesucht wird über die Stadt (Stadt gleich oder Wohnort im Einzugsgebiet des Anbieters). Der Abschnitt bleibt als Plan für später stehen.

- **Eingabe:** PLZ oder Ort in einem Feld, mit Vorschlägen während der Eingabe (alle Orte und PLZ aus NRW im Umkreis von 60 km um die Start-Region).
- **Radius:** 5 · 10 · 20 · 30 · 50 km · Gesamte Region, als große Knöpfe. Voreinstellung 20 km [Guessing: 10 km ist für Spezialanbieter zu eng, 20 km deckt die Nachbarstädte ab].
- **Koordinaten:** GeoNames-Postleitzahlen (CC BY 4.0, Quellenangabe im Impressum und auf der Ergebnisseite). Die Datei wird beim Build auf die Region gekürzt (`tools/geodaten.py` → `assets/data/plz.json`, geschätzt unter 30 KB). Kein externer Dienst zur Laufzeit, nichts verlässt den Browser.
- **Entfernung:** Luftlinie zwischen PLZ-Mittelpunkten, angezeigt als „ca. 7 km (Luftlinie)". Echte Fahrstrecken bräuchten einen Routing-Dienst mit API-Schlüssel und Kosten. Das ist dokumentiert, aber nicht gebaut.
- **Treffer:** Entfernung ≤ Radius **oder** der Wohnort steht im Einzugsgebiet des Anbieters. Nichts außerhalb, solange der Besucher den Radius nicht selbst erweitert.
- **Null Treffer:** „Im Umkreis von 10 km haben wir keinen Anbieter gefunden." Darunter Knöpfe mit echten Zahlen: „20 km: 3 Anbieter", „50 km: 7 Anbieter", dann verwandte Anliegen mit Anzahl, dann „Bei uns melden".

## 5. Ergebnisliste

Pro Anbieter: Name, Unterkategorie als Leistungsbeschreibung, Schwerpunkt (falls vorhanden), Ort, Entfernung, Telefon (als großer Anrufen-Knopf), E-Mail, Website, „Bewertungen bei Google ansehen" (Link), Hausbesuch ja/nein, Kassenabrechnung falls „ja". Kein Logo.
Sortierung umschaltbar: **Passend zuerst** (Voreinstellung: Einzugsgebiet enthält Wohnort, dann Entfernung) oder **Nächste zuerst**.
Bestehende Funktionen aus PR #39 bis #42 bleiben: Mehrfachauswahl, Kontaktfenster, Drucken, Weiterleiten, Hinweis „Angaben ohne Gewähr", Korrektur melden.

## 6. Freitextsuche (Master-Prompt 11)

- Ein Feld „Was suchen Sie?" auf der Startseite, auf `/hilfe-finden/` und im Kopf jeder Seite als Knopf „Anbieter suchen".
- Abgleich im Browser gegen `begriffe` aller Anliegen, Ratgeber-Titel und Themen: Kleinschreibung, ä/ae, ß/ss, Bindestriche, Wortstämme (einfaches Abschneiden von -en, -er, -e), Tippfehler (Abstand 1 bei Wörtern ab 5 Buchstaben), Mehrwort-Regeln („dusche statt badewanne" → `bad-dusche`).
- Vorschläge ab dem 2. Buchstaben als Liste unter dem Feld (ARIA-Combobox, mit Pfeiltasten und Tippen bedienbar). Höchstens 5 Anliegen und 2 Ratgeber.
- Kein Treffer: „Dazu haben wir nichts gefunden" plus die sechs Themen und „Bei uns melden". Wir protokollieren keine Suchbegriffe. Für die Pflege des Katalogs bitten wir später freiwillig um Rückmeldung.
- Keine generative KI. Der Katalog ist pflegbar, schnell und kostet nichts.

## 7. Ablauf und Bedienung (Master-Prompt 5E)

- Ein Baustein `assets/js/assistent.js` (neu geschrieben), eingesetzt auf Startseite (Hero) und `/hilfe-finden/`.
- Zustand steht in der URL (`/hilfe-finden/?anliegen=treppenlift&plz=42651&r=20`). Damit funktionieren der Zurück-Knopf des Browsers, Lesezeichen und Teilen. Gespeichert wird nichts.
- Fortschritt immer sichtbar („Schritt 2 von 3"), Knöpfe „Zurück", „Überspringen" (bei nicht nötigen Fragen), „Neu starten". Gewählte Angaben stehen oben als Zeile mit „ändern"-Links.
- Ohne JavaScript: Themenliste mit Links auf die Themenseiten und das Anfrageformular.

## 8. Navigation (Master-Prompt 10)

**Hilfe finden** (`/hilfe-finden/`: Suche, Assistent, sechs Themen) · **Ratgeber** · **Mein Alltag** · **So funktioniert es** (`/so-funktioniert-es/`: Ablauf, für Angehörige, Vertrauen, für Anbieter). Fester Knopf „Anbieter suchen" rechts im Kopf, auf dem Handy als Leiste unten.
„Themen" ist kein eigener Menüpunkt, weil die Themen Teil von „Hilfe finden" sind. Die URLs `/themen/…` bleiben bestehen.

## 9. WordPress

`anliegen` wird eine Taxonomie mit Term-Meta (Begriffe, Fragen, Kategorien), die PLZ-Tabelle eine eigene Tabelle, die Umkreissuche ein REST-Endpunkt `/wp-json/wirhelfen/v1/anbieter?anliegen=&plz=&r=`. Die Logik in `anbieter-logik.js` bleibt rein und testbar und dient als Vorlage für PHP.

## 10. Grenzen, offen gesagt

- Entfernung nur Luftlinie (Routing bräuchte bezahlte API).
- Keine Logos, keine Sterne.
- Treppenlift, Reparaturen, Umzug, Einbruchschutz: kaum Anbieter. Hier hilft nur, die Kontaktliste zu ergänzen.
- Wesel: keine Anbieter, bis die Liste ergänzt ist. Wer in Wesel sucht, landet im Umkreis bei Dinslaken (24 Einträge) [Likely, etwa 15 km].
- Ohne die GeoNames-Datei läuft die Liste weiter mit dem bisherigen Ortsabgleich (Stadt gleich oder Einzugsgebiet).
