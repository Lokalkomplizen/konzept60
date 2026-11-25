# Textabgleich Ratgeber: vor/nach Relaunch 3.3

Erzeugt von `python3 tools/ratgeber_textabgleich.py --basis origin/main` (Basis = eingecheckte Fassung `origin/main` = Commit `3f748a3` vor der Umstellung).

Geprüft je Beitrag: (1) Markdown-Text ohne Frontmatter unverändert, (2) sichtbarer Beitragstext der generierten Seite (Bereich `.article__body` ohne die neuen Rahmenbausteine „Das Wichtigste in Kürze“, „Häufige Fragen“, „Stand und Quellen“ und den Hinweis-Kasten) vollständig und in derselben Reihenfolge enthalten, (3) alle Sprungmarken der Überschriften weiter vorhanden (neu hinzugekommen sind nur ids an ###-Fragen), (4) Titelbild und Bilder im Text weiter eingebunden.

Geändert hat sich nur das Frontmatter (`kategorie`, `unterkategorien`, `hervorgehoben`, `anliegen`, `kurz`). Die Punkte unter `kurz` sind keine neuen Aussagen: Sie fassen Sätze des jeweiligen Beitrags zusammen; jede Zahl darin muss wörtlich im Beitrag stehen (Prüfung in `tools/build.py`, `load_beitraege`).

| Beitrag | Markdown-Text | Sichtbarer Text | Sprungmarken | Bilder | Ergebnis |
|---|---|---|---|---|---|
| `alltag-gut-organisiert` | unverändert | 2967 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `altersgerechter-umbau` | unverändert | 4216 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `barrierefrei-wohnen` | unverändert | 2270 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `betrug-telefon-haustuer` | unverändert | 2719 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `eltern-aus-der-ferne-unterstuetzen` | unverändert | 7162 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `ernaehrung-ab-60` | unverändert | 9549 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `fruehstueck-ab-60-eiweiss` | unverändert | 8425 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `gemeinsam-statt-einsam` | unverändert | 2424 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `gesund-und-fit-im-alter` | unverändert | 3727 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `haushaltshilfe-betrieb-oder-privat` | unverändert | 5037 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `haushaltshilfe-im-alter` | unverändert | 2882 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `hausnotruf-auswahl` | unverändert | 6957 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `krankenfahrten` | unverändert | 4224 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `kurzzeitpflege` | unverändert | 7456 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `mehrgenerationenhaus-mehrgenerationenwohnen` | unverändert | 39040 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `mobilitaet-im-alter-ohne-auto` | unverändert | 36143 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `patientenverfuegung-vorsorgevollmacht` | unverändert | 20325 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `pflegegrad-beantragen` | unverändert | 6041 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `pflegereform-2027` | unverändert | 7297 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `rente-reicht-nicht-finanzielle-hilfen` | unverändert | 33770 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |
| `treppenlift-einbau` | unverändert | 8121 Zeichen, vollständig enthalten | alle vorhanden | alle vorhanden | ok |

**Ergebnis:** 21 von 21 Beiträgen ohne Abweichung.
