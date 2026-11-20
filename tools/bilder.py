#!/usr/bin/env python3
"""Erzeugt einheitliche 4:5-Hochformat-Zuschnitte der Themenbilder (WebP 480/800 + JPG 800).

Aufruf:  python3 tools/bilder.py <ordner-mit-originalen>
Erwartet <slug>.png/.jpg je Themenbereich (Slugs wie in data/themen.json) und schreibt nach
assets/img/themen/<slug>-480.webp, <slug>-800.webp, <slug>-800.jpg.
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


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    main(sys.argv[1])
