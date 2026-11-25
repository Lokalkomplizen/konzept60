# Relaunch: Vorschlag Informationsarchitektur Startseite (Teile A bis F)

Stand: 25.11.2026 · Grundlage: Master-Prompt Punkte 1 bis 4 (Punkt 5 „Assistenten komplett überarbeiten" fehlt noch) · Bestandsaufnahme: `docs/relaunch/bestandsaufnahme.md`

Dieser Vorschlag ändert noch nichts an der Seite. Umgesetzt wird erst, wenn der Master-Prompt vollständig vorliegt.

---

## 1. Was die Startseite heute zeigt (Reihenfolge)

| # | Abschnitt heute | Anker | Inhalt |
|---|---|---|---|
| 1 | Hero | – | „Sie müssen nicht wissen, wer Ihnen helfen kann. Dafür sind wir da.", Buttons „Assistent starten" und „Anliegen beschreiben" |
| 2 | Vertrauensleiste | – | Kostenlos und unverbindlich · Persönlich statt anonym · Regional |
| 3 | Assistent | `#assistent` | Fragen mit je einem Tipp, Ergebnis mit Anbieter-Trefferliste (PR #42) |
| 4 | Drei Wege | `#drei-wege` | Hilfe finden (6 Themenkarten mit Bildern und Chips) · Ratgeber · Mein Alltag |
| 5 | So funktioniert's | `#so-funktionierts` | 3 Schritte: Anliegen beschreiben · Unser Team sucht für Sie · Sie erhalten Rückmeldung |
| 6 | Für Angehörige | `#angehoerige` | Hinweis plus Leitfaden „Eltern aus der Ferne unterstützen" |
| 7 | Anfrageformular | `#anfrage` | Schritt-Formular, danach Trefferliste oder persönliche Vermittlung |
| 8 | Ratgeber | `#ratgeber` | 3 neueste Beiträge |
| 9 | Für Anbieter | `#fuer-anbieter` | Hinweis auf Registrierung |

Das sind neun Blöcke mit zwei vollständigen Einstiegen (Assistent und Formular) auf einer Seite. Genau das ist das Hauptproblem, nicht das Aussehen.

## 2. Vier Punkte, bei denen ich dem Prompt widerspreche oder etwas ergänze

1. **A und C sind fast dieselbe Liste.** Die Suchbeispiele in A (Haushalt, Treppenlift, Pflege, Handwerker, Bad, Computer) und der Schnelleinstieg in C (Haushaltshilfe, Treppenlift, Pflege, Garten, Badumbau, Hausnotruf) überschneiden sich zu vier Fünfteln. Zwei Blöcke mit denselben Zielen widersprechen der eigenen Regel „keine überladenen Seiten". Vorschlag: C wird Teil von A, als Zeile „Häufig gesucht" direkt unter dem Suchfeld. Die Suchbeispiele erscheinen als wechselnder Platzhaltertext im Feld.
2. **Suche und Assistent dürfen nicht nebeneinander stehen.** Wenn beide auf der Startseite bleiben, muss ein Besucher sich zuerst entscheiden, welchen Weg er nimmt. Das kostet genau den Klick, den wir sparen wollen. Vorschlag: Die Suche ist der erste Schritt des Assistenten. Wer „Treppenlift" eintippt, landet direkt bei der Frage nach dem Ort und danach in der Trefferliste. Wie genau, hängt an Punkt 5 des Prompts, deshalb hier nur als Richtung.
3. **D und Hero passen nicht zusammen. Entschieden am 25.11.2026:** Hauptweg ist, dass sich der Besucher seinen Dienstleister selbst aussucht. Die persönliche Vermittlung ist nur der Rückfallweg, wenn nichts passt oder jemand Hilfe braucht. Daraus folgt: Der Hero-Satz „Sie müssen nicht wissen, wer Ihnen helfen kann. Dafür sind wir da." verspricht zu viel und wird vom Hauptsatz zum Text auf dem Rückfall-Kasten in D (der Text bleibt erhalten, nur an anderer Stelle). „Persönlich statt anonym" wird in F umformuliert, siehe dort.
4. **A bis F lässt drei vorhandene Inhalte ohne Platz.** Mein Alltag (Pflegegradrechner, Wohnungs-Check, Checklisten), der Angehörigen-Block und der Veranstaltungskalender kommen im Prompt nicht vor. Löschen ist verboten, also brauchen sie einen Ort. Vorschlag siehe Teil E und F.

## 3. Neue Startseite

Reihenfolge auf allen Geräten gleich. Geschätzte Länge auf dem Handy: rund 5 Bildschirmhöhen statt heute rund 14 [geschätzt, wird nach dem Umbau gemessen].

### A. Hero mit Suche

- **Überschrift (h1):** „Hilfe finden. Einfach und kostenlos."
- **Unterzeile:** „Geprüfte Anbieter aus Ihrer Region. Sie wählen selbst, wir helfen, wenn Sie nicht weiterkommen." Die bisherige h1 „Sie müssen nicht wissen, wer Ihnen helfen kann. Dafür sind wir da." zieht in D (Rückfall-Kasten) um.
- **Suchfeld** mit sichtbarem Label „Was suchen Sie?", mindestens 56 px hoch, Schrift 20 px, großer Button „Hilfe finden". Platzhalter wechselt nicht automatisch (Animation), sondern zeigt fest ein Beispiel: „z. B. Hilfe im Haushalt".
- **Häufig gesucht** (ehemals C), 6 große Chips, je mindestens 48 px hoch und 12 px Abstand:
  Haushaltshilfe · Treppenlift · Pflege zu Hause · Gartenhilfe · Bad umbauen · Hausnotruf · Hilfe am Computer
  (7 Einträge, weil „Computer" aus A sonst verloren ginge.) Jeder Chip führt direkt zur Frage nach dem Ort mit vorgewähltem Thema und Leistung.
- **Drei Vertrauenswörter** in einer Zeile darunter: kostenlos · unverbindlich · regional. Das ausführliche Versprechen steht in F.
- Hero-Bild „Garten" bleibt.

**Wie die Suche technisch funktioniert:** Eine neue Datei `data/suchbegriffe.json` ordnet Wörter und Umschreibungen (Treppenlift, Lift, Treppe, Badumbau, Dusche, Putzhilfe, Laptop, Handy …) einem Thema, einer Leistung und passenden Ratgeber-Beiträgen zu. Gesucht wird im Browser, ohne externen Dienst, ohne Speicherung. Tippfehler werden toleriert (einfacher Abstandsvergleich). Ergebnis: höchstens drei Vorschläge als große Buttons, darunter „Nichts Passendes? Beschreiben Sie Ihr Anliegen". In WordPress wird daraus ein Endpunkt `/wp-json/wirhelfen/v1/suche`, dieselbe JSON-Struktur.

**Lücke in den Daten:** „Treppenlift" ist heute keine eigene Leistung in `data/themen.json` („Treppenlift" gibt es nur als Ratgeber-Beitrag, „Badumbau" heißt dort „Barrierearmer Umbau"). Für den Schnelleinstieg kommt „Treppenlift und Hilfsmittel" als neue Leistung unter Wohnen, Haus und Handwerk dazu. Nichts wird umbenannt oder entfernt. Ob die Excel-Kontaktliste genug Treppenlift-Anbieter hat, prüfe ich beim Umbau.

### B. Die sechs Themen

- Die sechs bestehenden Karten mit den vorhandenen Bildern, Reihenfolge wie im Prompt.
- Neu: Jede Karte zeigt drei bis vier Unterthemen als direkte Links (aus `leistungen` in `data/themen.json`), dazu „Alle Leistungen ansehen" zur Themenseite.
- Unterthemen bekommen **keine eigenen Seiten**, sondern Sprungmarken auf der Themenseite (`/themen/wohnen-haus-handwerk/#treppenlift`). 38 dünne Einzelseiten wären schlecht für Pflege und Suchmaschinen. Die bestehenden URLs bleiben.
- Die heutigen Beispiel-Chips auf den Karten werden zu diesen Unterthemen-Links, der Text bleibt.

### C. Schnelleinstieg

Geht in A auf (siehe Punkt 2.1). Falls du C trotzdem als eigenen Block willst: dann ohne die Einträge, die schon in A stehen, und mit anderen Zielen (z. B. Umzugshilfe, Fahrdienst, Begleitung zum Arzt, Fenster putzen).

### D. So funktioniert die Vermittlung

1. **Anliegen beschreiben.** Suchen oder Thema antippen, Ort angeben.
2. **Passende regionale Anbieter finden.** Wir zeigen geprüfte Anbieter aus Ihrer Region.
3. **Kontakt aufnehmen.** Sie rufen den Anbieter selbst an oder schreiben ihm.

**Rückfall-Kasten direkt darunter:** „Nichts Passendes gefunden? Oder lieber mit Unterstützung? Sie müssen nicht wissen, wer Ihnen helfen kann. Dafür sind wir da." Button „Bei uns melden" zu `/anfrage/` (persönliche Vermittlung, Rückruf durch uns möglich). Derselbe Kasten erscheint am Ende jeder Trefferliste und bei null Treffern.

Darunter wie bisher: keine Antwortfrist, nur „so schnell wie möglich", und offen gesagt, dass wir nicht für jedes Anliegen jemanden finden. Keine Telefonnummer, Rückruf durch uns bleibt erlaubt. Der Angehörigen-Block (heute #6) wird als Hinweiskasten hier angehängt: „Sie suchen Hilfe für Ihre Eltern?" mit dem Link zum Leitfaden.

### E. Ratgeber und Werkzeuge

- **Ratgeber:** sechs ausgewählte statt drei neueste Beiträge. Auswahl über ein neues Frontmatter-Feld `startseite: 1–6`, damit nicht zufällig drei Ernährungstexte oben stehen. Karte: Bild, Thema, Titel, ein Satz Beschreibung (neues Frontmatter-Feld `kurztext`, das heute bei allen 21 Beiträgen fehlt; ich schreibe es aus dem ersten Absatz, ohne den Beitrag zu ändern). Link „Alle 21 Beiträge".
- **Werkzeuge** (bisher „Mein Alltag"): eine Zeile mit drei großen Kacheln: Pflegegrad-Rechner · Wohnungs-Check · Checklisten.
- **Veranstaltungen:** eine Kachel „Was ist los in Ihrer Stadt?" zum Kalender.

### F. Vertrauen

Vier Aussagen mit den vorhandenen Icons, je ein Satz Erklärung:
Kostenlos und unverbindlich · Sie entscheiden selbst · Regional und nah · Wir helfen, wenn Sie nicht weiterkommen.

„Persönlich statt anonym" stimmt für den Hauptweg nicht mehr, denn dort sucht der Besucher allein in einer Liste. Vorschlag: Die Aussage wandert sinngemäß in die vierte Zeile („Wir helfen, wenn Sie nicht weiterkommen: persönlich, nicht anonym"). Die vier vorhandenen Icons passen weiter (kostenlos, persönlich, regional); für „Sie entscheiden selbst" fehlt eins.
Das neue Icon zeichnest du im Stil der drei vorhandenen WebP-Icons.
Darunter klein der Anbieter-Hinweis (heute #9): „Sie bieten Hilfe an? Kostenlos registrieren".

### Was von der Startseite wegzieht

| Heute | Neu | Erhalt |
|---|---|---|
| Anfrageformular `#anfrage` | eigene Seite `/anfrage/` | Text und Felder unverändert. `/#anfrage` und `/?thema=…#anfrage` werden per Skript auf `/anfrage/?thema=…` umgeleitet, damit alte Links und der Header-Link weiter funktionieren. |
| Assistent `#assistent` | wird mit der Suche in A zusammengeführt | Abhängig von Punkt 5 des Prompts |
| Drei Wege | aufgeteilt auf B (Hilfe finden) und E (Ratgeber, Mein Alltag) | Texte wandern mit |

## 4. Navigation (Header)

Heute: Themen · Ratgeber · Mein Alltag · Für Anbieter · Anfrage. Vorschlag: **Hilfe finden · Ratgeber · Mein Alltag · Veranstaltungen** plus Button „Anliegen beschreiben". „Für Anbieter" wandert in den Footer, weil Anbieter nicht die Hauptzielgruppe sind. Keine Untermenüs.

## 5. Was beim Umbau mit erledigt wird

- Offene WCAG-Punkte aus dem Audit vom 24.11.2026: A11Y-01/02 (Umbruch bei 320 px und vergrößertem Textabstand, `minmax(0,1fr)` und `min-width:0`, Silbentrennung für h1 bis h3, Footer-Links) und A11Y-05 (Pflegegrad-Rechner ohne h1 in Fragen und Ergebnis).
- Bestehende Funktionen bleiben: Trefferliste aus der Excel mit 4 Tipps bis zum Anruf, Pflegegrad-Rechner, Veranstaltungskalender, Schritt-Formulare, Vorlesen/Teilen/Drucken.
- WordPress: Jeder Block oben bleibt ein eigener Template-Part (`hero-suche`, `themen`, `ablauf`, `ratgeber-auswahl`, `vertrauen`), Suchbegriffe als JSON, später als Option oder eigener Post-Type pflegbar.

## 6. Offen

- Punkt 5 und alles danach im Master-Prompt.
- Icon „Sie entscheiden selbst" (neu, von dir).
- Welche sechs Ratgeber auf die Startseite sollen. Mein Vorschlag, falls du nichts sagst: Pflegegrad beantragen · Haushaltshilfe im Alter · Treppenlift-Einbau · Hausnotruf auswählen · Barrierefrei wohnen · Eltern aus der Ferne unterstützen.
