# Relaunch Phase 4: Qualitätssicherung

Stand: 25.11.2026, geprüft auf `main` nach PR #46 (lokal mit `python3 -m http.server`, Chromium über Playwright).

| Prüfung | Ergebnis |
|---|---|
| Unit-Tests `node --test tests/*.test.js` | 53 von 53 bestanden |
| E2E `anbieter`, `assistent`, `ratgeber`, `rechner`, `seo`, `startseite` | alle grün |
| Vier Senioren-Szenarien (Haushaltshilfe Solingen, Treppenlift kurvige Treppe, Pflegedienst Düsseldorf, Zuschüsse Badumbau) | grün in `assistent.e2e.js` und `ratgeber.e2e.js` |
| Kein waagerechtes Scrollen | alle 47 Seiten bei 320, 390, 768, 1024 und 1440 px |
| Eine h1, eindeutige Titel und Descriptions, gültiges JSON-LD, keine Konsolenfehler | alle Seiten (`seo.e2e.js`) |
| Fremde Requests (DSGVO) | keine auf allen Seiten |
| Tastatur | Skip-Link zuerst, danach Kopf, Suche, Häufig-gesucht-Chips, alle mit sichtbarem Fokus |

## Nicht geprüft
- Echte Geräte (iPhone/Safari, Android), Firefox, echter Screenreader (VoiceOver, NVDA)
- Live-Seite: aus der Cloud-Umgebung nicht erreichbar, nur lokal geprüft
- Lesbarkeit mit echten Menschen ab 60: ein kurzer Test mit 3 bis 5 Personen bringt mehr als jeder automatische Test

## Offen (braucht Tommy)
1. Kurzfassungen „Das Wichtigste in Kürze“ redaktionell gegenlesen
2. Echte Veröffentlichungsdaten in den Ratgebern (Feld `veroeffentlicht`)
3. Domain statt `example.org` (`SITE` in `tools/build.py`), Impressum und Datenschutz
4. Kontaktliste ergänzen: Treppenlift (5), Reparaturen (3), Reinigung in Düsseldorf (0), Wesel (0)
5. Umkreissuche (zurückgestellt): braucht GeoNames-Datei `DE.zip`
6. Icon für „Sie entscheiden selbst“ (derzeit ohne Icon)
