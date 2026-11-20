#!/usr/bin/env python3
"""Kopiert Header/Footer aus index.html nach partials/*.html (Referenzkopien → header.php/footer.php).
Aufruf im Projektordner: python3 tools/sync-partials.py"""
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = (root / "index.html").read_text(encoding="utf-8")
for name, php in (("header", "header.php"), ("footer", "footer.php")):
    m = re.search(r"<!-- BEGIN partial:%s.*?-->\n(.*?)<!-- END partial:%s -->" % (name, name), src, re.S)
    if not m:
        raise SystemExit(f"Marker für {name} nicht gefunden")
    head = (f"<!--\n  REFERENZKOPIE – {name.upper()}  →  WordPress: {php}\n"
            f"  Quelle der Wahrheit ist index.html (Block zwischen \"BEGIN/END partial:{name}\").\n"
            "  Diese Datei wird NICHT per JS eingebunden; sie dient als Vorlage für das Theme.\n"
            "  Neu erzeugen: python3 tools/sync-partials.py\n-->\n")
    (root / "partials" / f"{name}.html").write_text(head + m.group(1), encoding="utf-8")
    print(f"partials/{name}.html aktualisiert")
