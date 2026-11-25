#!/usr/bin/env python3
"""Erzeugt einheitliche Bildzuschnitte aus Originalen (Pillow).

Themenbilder:   python3 tools/bilder.py <ordner-mit-originalen>
  Erwartet <slug>.png/.jpg je Themenbereich (Slugs wie in data/themen.json), Zuschnitt 4:5,
  schreibt assets/img/themen/<slug>-480.webp, <slug>-800.webp, <slug>-800.jpg.

Ratgeberbilder: python3 tools/bilder.py --ratgeber <ordner-mit-originalen>
  Erwartet <bild>.png/.jpg je Beitrag (Feld "bild" im Frontmatter von content/ratgeber/*.md),
  schreibt nach assets/img/ratgeber/:
    Beitragsbild 3:2 (mittig):  <bild>-800.webp, <bild>-1400.webp, <bild>-1400.jpg
    Teaser 4:3 (mittig):        <bild>-teaser-600.webp  (nur für Titelbilder, nicht für inline_bild)
Vorschaubilder:  python3 tools/bilder.py --vorschau   (Relaunch 3.4, ohne Originale)
  Aus den vorhandenen Größen: assets/img/themen/<slug>-160.webp (4:5, aus -800.jpg; Startseite Handy, 3rem)
  und assets/img/ratgeber/<bild>-400.webp (3:2, aus -1400.jpg; Ratgeber-Zeilen der Startseite, 4rem).
  Überschreibt nur diese Vorschaugrößen, löscht nichts.
Die Originale gehören NICHT ins Repo/Deploy (nach dem Lauf löschen bzw. extern ablegen).
Benötigt Pillow (nur dieses Hilfsskript; build.py nutzt ausschließlich die Standardbibliothek).
"""
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "img" / "themen"
RATIO = 4 / 5          # Breite : Höhe
TOP_BIAS = 0.4         # 0.5 = exakt Mitte; < 0.5 = leicht nach oben (Gesichter bleiben)
WIDTHS_WEBP = (480, 800)
WIDTH_JPG = 800
QUALITY = 78


def crop_4_5(img):
    w, h = img.size
    if w / h > RATIO:                      # zu breit → seitlich mittig beschneiden
        nw = round(h * RATIO)
        left = (w - nw) // 2
        return img.crop((left, 0, left + nw, h))
    nh = round(w / RATIO)                  # zu hoch → oben/unten, leicht nach oben gewichtet
    top = round((h - nh) * TOP_BIAS)
    return img.crop((0, top, w, top + nh))


def crop_center(img, ratio):
    """Mittiger Zuschnitt auf Breite:Höhe = ratio."""
    w, h = img.size
    if w / h > ratio:
        nw = round(h * ratio)
        left = (w - nw) // 2
        return img.crop((left, 0, left + nw, h))
    nh = round(w / ratio)
    top = (h - nh) // 2
    return img.crop((0, top, w, top + nh))


RATGEBER_OUT = ROOT / "assets" / "img" / "ratgeber"


def main_ratgeber(src_dir):
    RATGEBER_OUT.mkdir(parents=True, exist_ok=True)
    # Titelbilder = Feld "bild" im Frontmatter der Beiträge (nur diese brauchen den 4:3-Teaser)
    titelbilder = set()
    for md in (ROOT / "content" / "ratgeber").glob("*.md"):
        for line in md.read_text(encoding="utf-8").splitlines():
            if line.startswith("bild:"):
                titelbilder.add(line.partition(":")[2].strip())
    files = sorted(p for p in Path(src_dir).iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg"))
    if not files:
        raise SystemExit(f"Keine Bilder in {src_dir}")
    for src in files:
        orig = Image.open(src).convert("RGB")
        hero = crop_center(orig, 3 / 2)
        for width in (800, 1400):
            resized = hero.resize((width, round(width * 2 / 3)), Image.LANCZOS)
            resized.save(RATGEBER_OUT / f"{src.stem}-{width}.webp", "WEBP", quality=QUALITY, method=6)
            if width == 1400:
                resized.save(RATGEBER_OUT / f"{src.stem}-{width}.jpg", "JPEG", quality=QUALITY, optimize=True, progressive=True)
        teaser = ""
        if src.stem in titelbilder:
            crop_center(orig, 4 / 3).resize((600, 450), Image.LANCZOS).save(
                RATGEBER_OUT / f"{src.stem}-teaser-600.webp", "WEBP", quality=QUALITY, method=6)
            teaser = ", Teaser 4:3 600 (WebP)"
        print(f"{src.stem}: {orig.size[0]}×{orig.size[1]} → 3:2 800/1400 (WebP) + 1400 (JPG){teaser}")


def main(src_dir):
    OUT.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in Path(src_dir).iterdir() if p.suffix.lower() in (".png", ".jpg", ".jpeg"))
    if not files:
        raise SystemExit(f"Keine Bilder in {src_dir}")
    for src in files:
        img = crop_4_5(Image.open(src).convert("RGB"))
        for width in sorted(set(WIDTHS_WEBP + (WIDTH_JPG,))):
            resized = img.resize((width, round(width / RATIO)), Image.LANCZOS)
            if width in WIDTHS_WEBP:
                resized.save(OUT / f"{src.stem}-{width}.webp", "WEBP", quality=QUALITY, method=6)
            if width == WIDTH_JPG:
                resized.save(OUT / f"{src.stem}-{width}.jpg", "JPEG", quality=QUALITY, optimize=True, progressive=True)
        print(f"{src.stem}: {img.size[0]}×{img.size[1]} → {', '.join(str(w) for w in WIDTHS_WEBP)} (WebP) + {WIDTH_JPG} (JPG)")


def main_vorschau():
    for jpg in sorted(OUT.glob("*-800.jpg")):
        ziel = OUT / jpg.name.replace("-800.jpg", "-160.webp")
        img = crop_4_5(Image.open(jpg).convert("RGB")).resize((160, 200), Image.LANCZOS)
        img.save(ziel, "WEBP", quality=QUALITY, method=6)
        print(f"{ziel.relative_to(ROOT)}: {ziel.stat().st_size // 1024} KB")
    for jpg in sorted(RATGEBER_OUT.glob("*-1400.jpg")):
        ziel = RATGEBER_OUT / jpg.name.replace("-1400.jpg", "-400.webp")
        img = crop_center(Image.open(jpg).convert("RGB"), 3 / 2).resize((400, 267), Image.LANCZOS)
        img.save(ziel, "WEBP", quality=QUALITY, method=6)
        print(f"{ziel.relative_to(ROOT)}: {ziel.stat().st_size // 1024} KB")


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "--vorschau":
        main_vorschau()
    elif len(sys.argv) == 3 and sys.argv[1] == "--ratgeber":
        main_ratgeber(sys.argv[2])
    elif len(sys.argv) == 2:
        main(sys.argv[1])
    else:
        raise SystemExit(__doc__)
