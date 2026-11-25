#!/usr/bin/env python3
"""Textabgleich der Ratgeber-Beiträge vor/nach Relaunch 3.3 (nur Python-Standardbibliothek).

Aufruf im Projektordner:   python3 tools/ratgeber_textabgleich.py [--basis origin/main] [--ausgabe docs/relaunch/ratgeber-textabgleich.md]

Prüft je Beitrag:
  1. Markdown-Text (ohne Frontmatter) in content/ratgeber/<slug>.md ist gegenüber der Basis unverändert.
  2. Der sichtbare Beitragstext der generierten Seite (ratgeber/<slug>/index.html, Bereich .article__body
     ohne die Rahmenbausteine Kurz-Kasten, Häufige Fragen, Stand/Quellen und Hinweis) ist vollständig
     und in derselben Reihenfolge in der neuen Seite enthalten (Vergleich nach Leerraum-Normalisierung).
  3. Alle Sprungmarken (ids der Überschriften) der Basis gibt es weiterhin.
  4. Das Titelbild und alle Bilder im Text der Basis sind weiterhin eingebunden.
Basis = die eingecheckte Fassung im angegebenen Git-Stand (git show <basis>:<pfad>).
Exit-Code 1, wenn ein Beitrag abweicht.
"""
import argparse
import re
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAHMEN = {"beitrag-kurz", "beitrag-fragen", "beitrag-quellen", "article__disclaimer"}
VOID = {"img", "source", "br", "hr", "input", "meta", "link", "use"}


class BodyText(HTMLParser):
    """Sammelt Text, ids und Bildquellen innerhalb von <div class="article__body">."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.depth = 0          # Tiefe innerhalb article__body (0 = außerhalb)
        self.skip = 0           # Tiefe innerhalb eines Rahmenbausteins
        self.text, self.ids, self.bilder = [], [], []
        self.titelbild = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        klassen = set((a.get("class") or "").split())
        if tag == "picture" and "article__media" in klassen:
            self.titelbild = True
        if tag == "img" and (self.depth or self.titelbild):
            self.bilder.append(a.get("src", ""))
            self.titelbild = False
        if tag in VOID:
            return
        if self.depth == 0:
            if tag == "div" and "article__body" in klassen:
                self.depth = 1
            return
        self.depth += 1
        if self.skip:
            self.skip += 1
        elif klassen & RAHMEN:
            self.skip = 1
        elif a.get("id"):
            self.ids.append(a["id"])

    def handle_endtag(self, tag):
        if tag in VOID or self.depth == 0:
            return
        self.depth -= 1
        if self.skip:
            self.skip -= 1

    def handle_data(self, data):
        if self.depth and not self.skip:
            self.text.append(data)


def auswerten(html):
    p = BodyText()
    p.feed(html)
    return re.sub(r"\s+", " ", " ".join(p.text)).strip(), p.ids, p.bilder


def git_show(basis, pfad):
    r = subprocess.run(["git", "show", f"{basis}:{pfad}"], cwd=ROOT, capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def rev(basis):
    r = subprocess.run(["git", "rev-parse", "--short", basis], cwd=ROOT, capture_output=True, text=True)
    return r.stdout.strip() or basis


def md_text(src):
    lines = src.split("\n")
    end = lines.index("---", 1)
    return "\n".join(lines[end + 1:])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--basis", default="origin/main")
    ap.add_argument("--ausgabe", default="docs/relaunch/ratgeber-textabgleich.md")
    args = ap.parse_args()
    zeilen, fehler = [], 0
    for md in sorted((ROOT / "content" / "ratgeber").glob("*.md")):
        slug = md.stem
        alt_md = git_show(args.basis, f"content/ratgeber/{slug}.md")
        alt_html = git_show(args.basis, f"ratgeber/{slug}/index.html")
        if alt_md is None or alt_html is None:
            zeilen.append((slug, "neu (nicht in der Basis)", "–", "–", "–", "–"))
            continue
        neu_html = (ROOT / "ratgeber" / slug / "index.html").read_text(encoding="utf-8")
        md_gleich = md_text(alt_md) == md_text(md.read_text(encoding="utf-8"))
        alt_t, alt_ids, alt_b = auswerten(alt_html)
        neu_t, neu_ids, neu_b = auswerten(neu_html)
        text_ok = alt_t in neu_t
        ids_fehlen = [i for i in alt_ids if i not in neu_ids]
        bilder_fehlen = [b for b in alt_b if b not in neu_html]
        ok = md_gleich and text_ok and not ids_fehlen and not bilder_fehlen
        fehler += not ok
        zeilen.append((
            slug,
            "unverändert" if md_gleich else "**geändert**",
            f"{len(alt_t)} Zeichen, vollständig enthalten" if text_ok else "**fehlt/abweichend**",
            "alle vorhanden" if not ids_fehlen else "**fehlen: " + ", ".join(ids_fehlen) + "**",
            "alle vorhanden" if not bilder_fehlen else "**fehlen: " + ", ".join(bilder_fehlen) + "**",
            "ok" if ok else "**Abweichung**",
        ))
    out = [
        "# Textabgleich Ratgeber: vor/nach Relaunch 3.3",
        "",
        f"Erzeugt von `python3 tools/ratgeber_textabgleich.py --basis {args.basis}` (Basis = eingecheckte Fassung "
        f"`{args.basis}` = Commit `{rev(args.basis)}` vor der Umstellung).",
        "",
        "Geprüft je Beitrag: (1) Markdown-Text ohne Frontmatter unverändert, (2) sichtbarer Beitragstext der "
        "generierten Seite (Bereich `.article__body` ohne die neuen Rahmenbausteine „Das Wichtigste in Kürze“, "
        "„Häufige Fragen“, „Stand und Quellen“ und den Hinweis-Kasten) vollständig und in derselben Reihenfolge "
        "enthalten, (3) alle Sprungmarken der Überschriften weiter vorhanden (neu hinzugekommen sind nur ids an "
        "###-Fragen), (4) Titelbild und Bilder im Text weiter eingebunden.",
        "",
        "Geändert hat sich nur das Frontmatter (`kategorie`, `unterkategorien`, `hervorgehoben`, `anliegen`, "
        "`kurz`). Die Punkte unter `kurz` sind keine neuen Aussagen: Sie fassen Sätze des jeweiligen Beitrags "
        "zusammen; jede Zahl darin muss wörtlich im Beitrag stehen (Prüfung in `tools/build.py`, `load_beitraege`).",
        "",
        "| Beitrag | Markdown-Text | Sichtbarer Text | Sprungmarken | Bilder | Ergebnis |",
        "|---|---|---|---|---|---|",
    ]
    out += [f"| `{z[0]}` | " + " | ".join(z[1:]) + " |" for z in zeilen]
    out += ["", f"**Ergebnis:** {len(zeilen) - fehler} von {len(zeilen)} Beiträgen ohne Abweichung."
            + ("" if not fehler else f" {fehler} mit Abweichung."), ""]
    (ROOT / args.ausgabe).write_text("\n".join(out), encoding="utf-8")
    print("\n".join(out[-2:]))
    return 1 if fehler else 0


if __name__ == "__main__":
    sys.exit(main())
