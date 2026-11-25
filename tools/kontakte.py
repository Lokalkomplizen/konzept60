#!/usr/bin/env python3
"""Konverter Kontaktliste (Excel) -> data/anbieter.json und data/kategorie-zuordnung.json.

Nutzt openpyxl (nur dieses Skript; tools/build.py bleibt reine Standardbibliothek).
Die Excel gehört NICHT ins Repo.

  python3 tools/kontakte.py [PFAD.xlsx] [--modus echt|beispiel]

Modi
  echt      (Standard) gefilterte Echtdaten: nur Prüfstatus "ok"; Trägerart privat/ehrenamtlich entfällt;
            Ansprechpartner wird nie ausgegeben; E-Mail nur mit generischem lokalen Teil (kein Personenbezug);
            Klammerzusätze mit Personennamen im Namen entfallen (danach Dubletten nach Name+Telefon+Thema
            zusammengeführt); Hinweise wie "(Quelle ... prüfen)" im Schwerpunkt entfallen; Einträge mit
            Quelle/Schwerpunkt "2013" oder "veraltet" entfallen.
  beispiel  gleiche Verteilung (Thema x Stadt, höchstens 5 je Paar, Kategorie, Angebotsform,
            Kassenabrechnung), aber erfundene Namen/Nummern/Adressen (nur example.org), "beispiel": true.

Kategorie-IDs, die auf null zugeordnet sind (Beratung, Recht, Trauer, Haustiere ...), werden nicht
ausgegeben. Zuordnung: data/kategorie-zuordnung.json (wird hier erzeugt; Kategorie -> Thema-Slug).
→ WordPress: CPT 'anbieter' (Taxonomien themenbereich + region); Felder siehe README.
"""
import argparse
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
STANDARD_EXCEL = "/mnt/project-files/kontaktliste/Konzept60plus_Kontaktliste_2026-11-23.xlsx"
STAND = "November 2026"

W, H, P, A, T, F = ("wohnen-haus-handwerk", "haushalt-reinigung", "pflege-betreuung",
                    "alltag-persoenliche-hilfe", "technik-sicherheit", "freizeit-lebensqualitaet")

# Kategorie-ID -> Thema (None = nicht anzeigen)
ZUORDNUNG = {
    "01.01": W, "01.02": W, "01.03": W, "01.04": W, "01.05": W, "01.06": W,
    "02.01": H, "02.02": H, "02.03": A, "02.04": H, "02.05": A,
    "03.01": P, "03.02": P, "03.03": P, "03.04": P, "03.05": P, "03.06": None, "03.07": P, "03.08": P,
    "04.01": A, "04.02": A, "04.03": F, "04.04": A, "04.05": A, "04.06": A, "04.07": F,
    "05.01": P, "05.02": A, "05.03": A, "05.04": None, "05.05": None, "05.06": None, "05.07": None, "05.08": F,
    "06.01": A, "06.02": A, "06.03": A, "06.04": None, "06.05": None,
    "07.01": T, "07.02": T, "07.03": T, "07.04": None, "07.05": None,
    "08.01": T, "08.02": T, "08.03": T, "08.04": T, "08.05": T,
    "09.01": None, "09.02": None, "09.03": None, "09.04": None, "09.05": None, "09.06": None, "09.07": None, "09.08": None,
    "10.01": None, "10.02": None, "10.03": None, "10.04": None, "10.05": None, "10.06": None,
    "11.01": None, "11.02": None, "11.03": None, "11.04": W, "11.05": H, "11.06": None,
    "12.01": F, "12.02": F, "12.03": F, "12.04": F, "12.05": F, "12.06": F, "12.07": None, "12.08": None, "12.09": F,
    "13.01": None, "13.02": None, "13.03": P, "13.04": None, "13.05": None, "13.06": None,
    "14.01": None, "14.02": None, "14.03": None, "14.04": None, "14.05": None,
    "15.01": None, "15.02": None, "15.03": None, "15.04": None,
}

# Leistung (Wortlaut data/themen.json) -> passende Kategorie-IDs (kommen zuerst)
LEISTUNGEN = {
    W: {"Kleinreparaturen im Haus": ["01.05", "01.03"], "Gartenpflege und Heckenschnitt": ["01.04"],
        "Barrierearmer Umbau (z. B. Bad, Haltegriffe)": ["01.01", "01.02"], "Maler- und Tapezierarbeiten": ["01.03"],
        "Möbel aufbauen oder umstellen": ["01.05"], "Umzugshilfe": ["11.04"], "Winterdienst": ["01.04", "01.05"],
        "Treppenlift und Hilfsmittel": ["01.02"]},
    H: {"Regelmäßige Wohnungsreinigung": ["02.01"], "Fenster putzen": ["02.01"], "Wäsche waschen und bügeln": ["02.02"],
        "Großputz oder Frühjahrsputz": ["02.01"], "Entrümpelung und Haushaltsauflösung": ["11.05"],
        "Hilfe beim Kochen und Vorräte auffüllen": ["02.04"]},
    P: {"Ambulante Pflege durch einen Pflegedienst": ["03.01"], "Stundenweise Betreuung zu Hause": ["03.01", "03.03"],
        "Entlastung für pflegende Angehörige": ["13.03", "03.04"], "Verhinderungspflege": ["03.04", "03.01"],
        "Tagespflege": ["03.04"], "Betreuung bei Demenz": ["03.05"]},
    A: {"Einkaufen und Besorgungen": ["02.03", "04.01", "02.05"], "Begleitung zu Arztterminen": ["04.04", "06.02"],
        "Begleitung zu Behörden und Banken": ["04.04", "04.02"], "Fahrdienst": ["06.02", "06.01", "06.03"],
        "Hilfe bei Post und Formularen": ["04.02", "04.01"], "Botengänge, zum Beispiel zur Apotheke": ["02.05", "02.03"]},
    T: {"Smartphone und Tablet einrichten und erklären": ["08.01", "08.02"], "Computer, Internet und E-Mail": ["08.01", "08.02"],
        "Fernseher und Receiver einrichten": ["08.04"], "Hausnotruf": ["07.01"], "Rauchmelder anbringen": ["07.02"],
        "Einbruchschutz und Türsicherung": ["07.03"], "Seniorentelefon einrichten": ["08.04", "08.01"]},
    F: {"Spaziergänge in Begleitung": ["12.01", "04.03"], "Begleitung zu Veranstaltungen": ["12.03", "12.01"],
        "Ausflüge und Tagesfahrten": ["12.05", "04.07"], "Kurse, zum Beispiel Bewegung oder Kreatives": ["12.04", "12.06", "05.08", "12.03"],
        "Gesellschaft leisten und Vorlesen": ["04.03", "12.01", "12.09"], "Gemeinsame Hobbys und Spiele": ["12.02", "12.01"]},
}

ORG_WOERTER = re.compile(r"e\.\s?v\.|gmbh|ggmbh|\bkg\b|\bug\b|caritas|awo|drk|diakonie|humana|ev\.|kirche|standort|linie|home instead|"
                         r"fuk|krankenfahrt|sanitär|hospiz|bochumer|stadt|verband|zentrum|haus|pflege|dienst|service|tagespflege|"
                         r"altenzentrum|bürgerbus|taxi|ruhr|bochum|duisburg|essen|kreis|stiftung|gesellschaft|\d", re.I)
GENERISCH = ("info", "kontakt", "service", "buero", "büro", "mail", "post", "pflege", "beratung", "verwaltung", "team", "office",
             "zentrale", "hausnotruf", "fahrdienst", "tagespflege", "sozialstation", "wohnberatung", "fachstelle", "stadtteil",
             "betreuung", "sekretariat", "ambulant", "menue", "reha", "demenz", "anmeldung", "begegnung", "empfang", "vorstand",
             "stadtbuero", "buecherei", "kundenservice", "hospiz", "sanitaet", "taxi", "bestattung")
STAEDTE_LOKAL = ("bochum", "wuppertal", "duesseldorf", "solingen", "remscheid", "hilden", "haan", "langenfeld", "velbert",
                 "essen", "duisburg", "oberhausen", "leverkusen", "muelheim", "mettmann", "ratingen", "erkrath", "dinslaken")


def norm_stadt(s):
    """'Mülheim an der Ruhr' / 'mülheim a. d. ruhr' -> einheitliche Schreibweise; Groß/Klein egal."""
    s = re.sub(r"\s+", " ", (s or "").strip())
    if re.fullmatch(r"m[uü]lheim( a\.? ?d\.? ruhr| an der ruhr)?", s, re.I):
        return "Mülheim an der Ruhr"
    return s


def generische_email(mail):
    mail = (mail or "").strip().lower()
    if "@" not in mail or " " in mail:
        return ""
    lokal = mail.split("@")[0]
    if lokal in STAEDTE_LOKAL or any(w in lokal for w in GENERISCH):
        return mail
    return ""


VORNAMEN = set("""anna anja angela andrea annette ayse barbara birgit brigitte carmen christine christina claudia conny dagmar daniela
dirk dragica elke elena erika eva franziska gabriele gisela hafije heike helga ines ingrid irina jaqueline jessica johannes josef
julia karin katharina katja kerstin klaus lars lena lisa maria marion marlies martina melanie michaela monika nadine natalia nicole
petra renate rita sabine sandra sabrina silke simone sonja stefanie susanne svenja tatjana thomas ulrike ursula uwe vera yvonne
andreas benedikt bernd christian detlef frank georg gerd hans heinz jens joachim jörg jürgen karl manfred markus martin michael
norbert peter ralf reinhard rolf stefan sven thorsten tobias udo ulrich wolfgang werner olga larissa tanja knut gezim armin marina fatee norbert thorsten pia rainer helga fritz tim malika nina nicoleta funda darline eveline antje sarah hafije zoran emil josef klaus ina bettina felicitas francisca johanna""".split())


_RECHTSFORM = re.compile(r"^(GmbH|UG|GbR|KG|OHG|e\.?|Pflegedienst|Hospiz\w*|Quartier|Haus|Stift|Apotheke|Krankenfahrten)$")


def _enthaelt_person(name):
    """Vorname gefolgt von großgeschriebenem Wort (Einzelunternehmer, Personenname) -> True."""
    w = re.findall(r"[\wÄÖÜäöüß.&-]+", name)
    for i in range(len(w) - 1):
        if w[i].lower() in VORNAMEN and w[i + 1][:1].isupper() and not _RECHTSFORM.match(w[i + 1]):
            return True
    return False


def bereinige_name(name):
    name = (name or "").strip()
    def klammer(m):
        inhalt = m.group(1).strip()
        return m.group(0) if ORG_WOERTER.search(inhalt) else ""
    name = re.sub(r"\s*\(([^)]*)\)", klammer, name)
    # Personenname nach Gedankenstrich/in Klammer am Ende: "… – Pflegeberatung (Johannes Hansen)" ist oben bereits weg
    name = re.sub(r"\s+", " ", name).strip(" –-")
    return "" if _enthaelt_person(name) else name   # Personennamen (Einzelunternehmer) nicht ausgeben


def bereinige_schwerpunkt(text):
    text = (text or "").strip()
    text = re.sub(r"\s*\([^)]*(?:Quelle|prüfen|Wegweiser|Flyer|Auszug|Stand|20\d\d)[^)]*\)", "", text, flags=re.I)
    return re.sub(r"\s+", " ", text).strip(" ,;")


def angebotsform(roh):
    roh = (roh or "").strip()
    return {"Hausbesuch/mobil": "Hausbesuch", "mobil": "Hausbesuch", "beides": "Hausbesuch und vor Ort",
            "persönlich, Hausbesuch": "Hausbesuch und vor Ort", "unbekannt": ""}.get(roh, roh)


def traegerart(roh):
    roh = (roh or "").strip()
    if roh.lower() in ("prüfen", "unbekannt", ""):
        return ""
    return "kommunal" if roh.lower() == "kommunal" else roh


def website(w):
    w = (w or "").strip()
    if not w:
        return ""
    return w if re.match(r"https?://", w, re.I) else "https://" + w


def lade(pfad):
    import openpyxl
    wb = openpyxl.load_workbook(pfad, read_only=True, data_only=True)
    zeilen = list(wb["Kontakte"].iter_rows(values_only=True))
    kopf = [str(c or "").strip() for c in zeilen[0]]
    def spalte(prefix):
        for i, k in enumerate(kopf):
            if k.startswith(prefix):
                return i
        raise SystemExit(f"FEHLER: Spalte '{prefix}' fehlt in Blatt Kontakte")
    idx = {k: spalte(k) for k in ("Nr", "Stadt", "Kategorie-ID", "Unterkategorie", "Anbieter", "Schwerpunkt", "Angebotsform",
                                   "Trägerart", "Telefon", "E-Mail", "Website", "Adresse", "PLZ", "Einzugsgebiet",
                                   "Kassenabrechnung", "Quelle", "Prüfstatus", "Notiz")}
    # Ansprechpartner wird bewusst nicht gelesen.
    def cell(z, k):
        v = z[idx[k]]
        return "" if v is None else str(v).strip()
    kontakte = [{k: cell(z, k) for k in idx} for z in zeilen[1:] if any(z)]
    return kontakte


def einzugsgebiet(roh, bekannte, stadt):
    """Einzugsgebiet-Freitext -> Liste bekannter Städte (ohne die eigene Stadt)."""
    roh = re.sub(r"\([^)]*\)", "", roh or "")
    ergebnis = []
    for tok in re.split(r"[,;/]| und ", roh):
        tok = norm_stadt(tok)
        if not tok:
            continue
        kandidat = tok if tok.casefold() in bekannte else norm_stadt(re.split(r"[- ]", tok)[0]) if "-" in tok else tok
        kandidat = bekannte.get(kandidat.casefold())
        if kandidat and kandidat != stadt and kandidat not in ergebnis:
            ergebnis.append(kandidat)
    return ergebnis


def echt(kontakte, regionen):
    bekannte = {}
    for k in kontakte:
        s = norm_stadt(k["Stadt"])
        bekannte[s.casefold()] = s
    for r in regionen:
        bekannte.setdefault(r.casefold(), r)
    raus = {"gesamt": len(kontakte)}
    ausgabe = {}
    for k in kontakte:
        kat = k["Kategorie-ID"]
        thema = ZUORDNUNG.get(kat)
        if k["Prüfstatus"].lower() != "ok" or not thema:
            continue
        if k["Trägerart"].lower() in ("privat", "ehrenamtlich"):
            continue
        if re.search(r"2013|veraltet", k["Quelle"] + " " + k["Schwerpunkt"], re.I):
            continue
        name = bereinige_name(k["Anbieter"])
        if not name:
            continue
        stadt = norm_stadt(k["Stadt"])
        adresse = k["Adresse"]
        if adresse and k["PLZ"] and k["PLZ"] not in adresse:
            adresse += f", {k['PLZ']} {stadt}"
        eintrag = {
            "name": name,
            "schwerpunkt": bereinige_schwerpunkt(k["Schwerpunkt"]),
            "thema": thema,
            "kategorie_id": kat,
            "unterkategorie": k["Unterkategorie"],
            "stadt": stadt,
            "einzugsgebiet": einzugsgebiet(k["Einzugsgebiet"], bekannte, stadt),
            "angebotsform": angebotsform(k["Angebotsform"]),
            "traegerart": traegerart(k["Trägerart"]),
            "kassenabrechnung": k["Kassenabrechnung"].lower() if k["Kassenabrechnung"].lower() in ("ja", "nein") else "unbekannt",
            "telefon": k["Telefon"],
            "email": generische_email(k["E-Mail"]),
            "website": website(k["Website"]),
            "adresse": adresse,
        }
        if not (eintrag["telefon"] or eintrag["email"] or eintrag["website"]):
            continue   # ohne jeden Kontaktweg nutzlos
        schluessel = (name.casefold(), re.sub(r"\D", "", eintrag["telefon"]), thema, stadt)
        if schluessel in ausgabe:   # Dublette: zusammenführen (Einzugsgebiet, fehlende Felder ergänzen)
            alt = ausgabe[schluessel]
            for s in eintrag["einzugsgebiet"]:
                if s not in alt["einzugsgebiet"]:
                    alt["einzugsgebiet"].append(s)
            for feld in ("email", "website", "adresse", "schwerpunkt"):
                alt[feld] = alt[feld] or eintrag[feld]
            continue
        ausgabe[schluessel] = eintrag
    return list(ausgabe.values())


STRASSEN = ["Musterstraße", "Beispielweg", "Probeallee", "Erfundenstraße", "Platzhalterring"]
TYP = {W: ["Handwerker", "Gartenservice", "Hausmeisterdienst"], H: ["Haushaltshilfe", "Reinigungsservice"],
       P: ["Pflegedienst", "Tagespflege", "Betreuungsdienst"], A: ["Alltagshilfe", "Fahrdienst", "Begleitservice"],
       T: ["Technikhilfe", "Hausnotruf", "Sicherheitsservice"], F: ["Treff", "Seniorenkreis", "Ausflugsservice"]}


def beispiel(echte, max_je_paar=5, seed=60):
    rnd = random.Random(seed)
    nach_paar = {}
    for e in echte:
        nach_paar.setdefault((e["thema"], e["stadt"]), []).append(e)
    ergebnis = []
    for paar in sorted(nach_paar):
        eintraege = nach_paar[paar][:]
        rnd.shuffle(eintraege)
        for e in eintraege[:max_je_paar]:
            ergebnis.append(e)
    out = []
    for n, e in enumerate(ergebnis, 1):
        stadt = e["stadt"]
        slug = re.sub(r"[^a-z]", "", stadt.lower().replace("ü", "ue").replace("ö", "oe").replace("ä", "ae"))
        typ = rnd.choice(TYP[e["thema"]])
        out.append({
            "name": f"{typ} Muster {stadt} {n}",
            "schwerpunkt": f"Beispieltext zu {e['unterkategorie']}",
            "thema": e["thema"], "kategorie_id": e["kategorie_id"], "unterkategorie": e["unterkategorie"],
            "stadt": stadt, "einzugsgebiet": e["einzugsgebiet"], "angebotsform": e["angebotsform"],
            "traegerart": e["traegerart"], "kassenabrechnung": e["kassenabrechnung"],
            "telefon": f"0211 00000-{n % 100:02d}", "email": f"info@{slug}-{n}.example.org",
            "website": f"https://{slug}-{n}.example.org",
            "adresse": f"{rnd.choice(STRASSEN)} {rnd.randint(1, 99)}, 00000 {stadt}",
            "beispiel": True,
        })
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("excel", nargs="?", default=STANDARD_EXCEL)
    ap.add_argument("--modus", choices=("echt", "beispiel"), default="echt")
    args = ap.parse_args()

    regionen = [r["name"] for r in json.loads((ROOT / "data" / "regionen.json").read_text("utf-8"))["regionen"]]
    kontakte = lade(args.excel)
    daten = echt(kontakte, regionen)
    if args.modus == "beispiel":
        daten = beispiel(daten)
    daten.sort(key=lambda e: (e["thema"], e["stadt"], e["name"].casefold()))
    for i, e in enumerate(daten, 1):
        e["id"] = f"a{i:04d}"
    felder = ("id", "name", "schwerpunkt", "thema", "kategorie_id", "unterkategorie", "stadt", "einzugsgebiet", "angebotsform",
              "traegerart", "kassenabrechnung", "telefon", "email", "website", "adresse", "beispiel")
    daten = [{k: e[k] for k in felder if k in e} for e in daten]

    hinweis = ("In WordPress: CPT 'anbieter' (nicht öffentlich/Backend), Taxonomien 'themenbereich' (thema) und 'region' "
               "(stadt + einzugsgebiet). Felder = Meta. GENERIERT von tools/kontakte.py – nicht von Hand bearbeiten.")
    ausgabe = {"_hinweis": hinweis, "modus": args.modus, "stand": STAND, "anzahl": len(daten), "anbieter": daten}
    (ROOT / "data" / "anbieter.json").write_text(json.dumps(ausgabe, ensure_ascii=False, indent=1) + "\n", "utf-8")

    zuordnung = {
        "_hinweis": "Kategorie-ID -> Thema-Slug aus data/themen.json (null = nicht anzeigen: Beratungsstellen, Recht, Trauer, Haustiere ...). "
                    "'leistungen': je Thema und Leistung die passenden Kategorie-IDs (Treffer zuerst).",
        "kategorien": ZUORDNUNG,
        "leistungen": LEISTUNGEN,
    }
    (ROOT / "data" / "kategorie-zuordnung.json").write_text(json.dumps(zuordnung, ensure_ascii=False, indent=1) + "\n", "utf-8")

    print(f"Modus {args.modus}: {len(kontakte)} Zeilen in der Excel -> {len(daten)} Anbieter")
    print("  je Region der Website (Stadt oder Einzugsgebiet):")
    for r in regionen:
        n = sum(1 for e in daten if e["stadt"] == r or r in e["einzugsgebiet"])
        print(f"    {r}: {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
