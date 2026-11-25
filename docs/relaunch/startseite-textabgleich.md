# Textabgleich: alte Startseite → Relaunch 3.2

Stand: Relaunch 3.2 (Branch `claude/project-thread-bme6ey`). Quelle der alten Fassung:
`git show origin/main:templates/index.html`. Grundlage der neuen Fassung: `docs/relaunch/startseite-ia.md`
und Abschnitt 8 in `docs/relaunch/konzept-assistent-suche.md`.

Grundsatz: Kein Text und kein Bild der alten Startseite fällt weg. Alles, was nicht mehr auf der
Startseite steht, steht wörtlich auf `/so-funktioniert-es/`, `/anfrage/` oder `/hilfe-finden/`.
„Unverändert“ heißt: Wortlaut gleich; nur die Überschriftenebene kann sich geändert haben.

Neue Startseite: A Hero mit Suche · B Themen · D Ablauf mit Rückfall-Kasten · E Ratgeber und Werkzeuge ·
F Vertrauen (Teil C ist in A aufgegangen).

## Passagen

| Alte Startseite (Abschnitt, Text) | Neuer Ort | Hinweis |
|---|---|---|
| **Hero**, h1 „Sie müssen nicht wissen, wer Ihnen helfen kann. Dafür sind wir da.“ | Startseite D, Rückfall-Kasten (`.rueckfall__satz`); `/so-funktioniert-es/#so-funktionierts`, erster Absatz der Einleitung | Neue h1 der Startseite: „Hilfe finden. Einfach und kostenlos.“ (Vorgabe aus startseite-ia.md) |
| Hero-Text „Sie beschreiben, wobei Sie Unterstützung brauchen. Jemand aus unserem Team sucht für Sie passende Dienstleister oder private Helfer in Ihrer Region – für Sie selbst oder für Ihre Angehörigen.“ | `/so-funktioniert-es/#so-funktionierts`, Einleitung | unverändert; kurze Fassung in D („Jemand aus unserem Team sucht persönlich für Sie …“) |
| Hero-Bild `hero-garten` mit Alternativtext | Startseite A | unverändert, gleicher Alternativtext |
| Knopf „Assistent starten“ (`#assistent`) | ersetzt durch die Suche im Hero, die 7 Chips „Häufig gesucht“ und den Header-Knopf „Anbieter suchen“; alle führen nach `/hilfe-finden/` | alte Adresse `/#assistent` leitet um |
| Knopf „Anliegen beschreiben“ (`#anfrage`) | Startseite D „Bei uns melden“ → `/anfrage/`; `/so-funktioniert-es/#so-funktionierts` Knopf „Anliegen beschreiben“ → `/anfrage/` | alte Adresse `/#anfrage` leitet um |
| **Vertrauensleiste** (Icons): „Kostenlos und unverbindlich“, „Persönlich statt anonym“, „Regional – Rheinland, Niederrhein und Bergisches Land“ | Startseite A (Stichworte „kostenlos · unverbindlich · regional“); Startseite F und `/so-funktioniert-es/#vertrauen` (ausformuliert, mit denselben Icons: „Kostenlos und unverbindlich“, „Regional und nah … Rheinland, Niederrhein und Bergisches Land“, „Persönlich statt anonym: …“) | Texte in `tools/build.py` (`VERTRAUEN`) |
| **Assistent**: Eyebrow „Assistent“, h2 „Wie können wir Ihnen heute helfen?“, Einleitung „Beantworten Sie zwei, drei kurze Fragen – wir zeigen Ihnen den passenden nächsten Schritt.“ | `/hilfe-finden/` | unverändert |
| Assistent ohne JavaScript: „Hilfe finden – wir suchen persönlich für Sie“, „Wissen bekommen – der Ratgeber“, „Alltag erleichtern – Mein Alltag“, Themenliste | `/hilfe-finden/` (`.assistent__nojs`) | Links auf `/anfrage/` statt `/#anfrage` |
| **Drei Wege**: Eyebrow „Unser Angebot“, h2 „Drei Wege, wie wir helfen“, „Suchen Sie sich aus, womit Sie anfangen möchten.“ | `/so-funktioniert-es/#drei-wege` | unverändert |
| Weg 1 „Hilfe finden“: „Wobei dürfen wir helfen?“ und „Ob kleine Reparatur, Hilfe im Haushalt oder Begleitung zum Arzt: Wählen Sie einen Bereich – oder beschreiben Sie Ihr Anliegen einfach in eigenen Worten.“ | Startseite B (h2 und Einleitung) | unverändert; die sechs Themenkarten stehen in B, jetzt mit 3–4 Unterthemen-Links |
| Weg 2 „Wissen bekommen – Verständlich erklärt: der Ratgeber – Beiträge zu Haushalt, Wohnen, Pflege und Sicherheit, ohne Fachchinesisch.“ | `/so-funktioniert-es/#drei-wege` | unverändert |
| Weg 3 „Alltag erleichtern – Mein Alltag – Checklisten zum Abhaken und ein Wohnungs-Check für mehr Sicherheit zu Hause, ohne Anmeldung, ohne Speicherung.“ | `/so-funktioniert-es/#drei-wege`; Kurzform in Startseite E („Zum Selbermachen, ohne Anmeldung, ohne Speicherung.“) | unverändert; dazu eine dritte Karte „Anbieter in Ihrer Region“ → `/hilfe-finden/` |
| **Bildband** `gemeinsam-statt-einsam` mit Alternativtext | `/so-funktioniert-es/` zwischen „Für Angehörige“ und „Vertrauen“ | unverändert |
| **So funktioniert’s**: h2 „In drei Schritten zur passenden Hilfe“, Einleitung „Bei uns landen Sie nicht in einer anonymen Datenbank. Wir sind selbst kein Dienstleister: …“ | `/so-funktioniert-es/#so-funktionierts` (Eyebrow jetzt „Persönliche Vermittlung“) | unverändert |
| Drei Schritte „Anliegen beschreiben“, „Unser Team sucht für Sie“ („… Kein Algorithmus entscheidet.“), „Sie erhalten Rückmeldung“ | `/so-funktioniert-es/#so-funktionierts` | unverändert. Die Startseite D zeigt die drei neuen Schritte zum Selbstsuchen |
| Hinweis „Sie behalten die Kontrolle. … Ehrlich gesagt: Wir können nicht garantieren, dass wir immer jemanden finden. …“ | `/so-funktioniert-es/#so-funktionierts`; Kurzform „Ehrlich gesagt: …“ in Startseite D | unverändert |
| **Für Angehörige**: Bild, Eyebrow, h2 „Sie suchen Unterstützung für Ihre Eltern oder Angehörigen?“, Text „Auch Sie können unser Portal nutzen. …“, Leitfaden-Link, Knopf „Für Angehörige anfragen“ | `/so-funktioniert-es/#angehoerige` | unverändert; Knopf → `/anfrage/?wer=angehoerige` (statt `/?fuer=angehoerige#anfrage`), neu daneben „Anbieter für einen Angehörigen suchen“. Kurzform mit Leitfaden-Link in Startseite D |
| **Anfrageformular** komplett: Eyebrow „Hilfe finden“, „Beschreiben Sie Ihr Anliegen“, „Es dauert etwa zwei Minuten. …“, Häkchenliste, alle Felder, Anbieter-Schritt, Einwilligung, Datenschutzhinweis, Versand, Erfolgsmeldung, Prototyp-Hinweise | `/anfrage/` | Wortlaut unverändert; Überschriften eine Ebene höher (h1 statt h2 usw.); neu ein Satz „Lieber selbst einen Anbieter suchen? Zur Anbietersuche“ |
| **Ratgeber**: Eyebrow „Ratgeber“, h2 „Wissen, das weiterhilft“, „Verständlich erklärt, ohne Fachchinesisch.“, Link „Alle Beiträge im Ratgeber“ | Startseite E | unverändert; Link jetzt „Alle N Beiträge im Ratgeber“; sechs Beiträge über Frontmatter `startseite: 1–6` statt der drei neuesten |
| **Für Anbieter**: „Für Dienstleister und private Helfer: Werden Sie Teil unseres regionalen Netzwerks.“, „Mehr für Anbieter“ | `/so-funktioniert-es/#fuer-anbieter` | unverändert; auf der Startseite F der kurze Hinweis „Sie bieten Hilfe an? Kostenlos registrieren“; „Für Anbieter“ im Footer |
| Meta-Beschreibung „… vermittelt Menschen ab 60 und ihren Angehörigen kostenlos und persönlich …“ | Sinngemäß in der Meta-Beschreibung von `/so-funktioniert-es/` | Startseite hat eine neue Beschreibung passend zur Suche |

## Alte Adressen

Externes Skript `assets/js/weiterleitung.js` (nur Startseite, im `<head>`, `location.replace`):

| Alt | Neu |
|---|---|
| `/#anfrage`, `/?thema=…&wer=…&fuer=…&ort=…&region=…&leistung=…&notiz=…(#anfrage)` | `/anfrage/?…` (Vorausfüllung bleibt) |
| `/#assistent`, `/?anliegen=…&stadt=…&f-…&n-…(#assistent)`, `/?q=…` | `/hilfe-finden/?…` |
| `/#so-funktionierts` | `/so-funktioniert-es/` |
| `/#angehoerige`, `/#fuer-anbieter`, `/#drei-wege` | `/so-funktioniert-es/#…` |

Ohne JavaScript bleibt man auf der Startseite; `#anfrage` ist dort der Rückfall-Kasten mit dem Link
„Bei uns melden“ → `/anfrage/`. In WordPress: Abfrageteil als 301 in `template_redirect`, Anker per Skript.
