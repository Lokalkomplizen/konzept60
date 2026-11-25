// Unit-Test der Anbieter-Filter-/Sortierlogik (assets/js/anbieter-logik.js)
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const L = require("../assets/js/anbieter-logik.js");

const liste = [
  { id: "1", name: "Zeta Pflege", thema: "pflege-betreuung", kategorie_id: "03.01", stadt: "Wuppertal", einzugsgebiet: [] },
  { id: "2", name: "Alpha Tagespflege", thema: "pflege-betreuung", kategorie_id: "03.04", stadt: "Wuppertal", einzugsgebiet: [] },
  { id: "3", name: "Beta Pflege", thema: "pflege-betreuung", kategorie_id: "03.01", stadt: "Solingen", einzugsgebiet: ["Wuppertal"] },
  { id: "4", name: "Gamma Pflege", thema: "pflege-betreuung", kategorie_id: "03.01", stadt: "Essen", einzugsgebiet: [] },
  { id: "5", name: "Delta Garten", thema: "wohnen-haus-handwerk", kategorie_id: "01.04", stadt: "Wuppertal", einzugsgebiet: [] },
  { id: "6", name: "Mülheim Pflege", thema: "pflege-betreuung", kategorie_id: "03.01", stadt: "Mülheim an der Ruhr", einzugsgebiet: [] }
];
const map = { tagespflege: ["03.04"], "ambulante-pflege-durch-einen-pflegedienst": ["03.01"] };

test("nur gewähltes Thema und passender Ort (Stadt oder Einzugsgebiet)", () => {
  const r = L.filtere(liste, { thema: "pflege-betreuung", ort: "Wuppertal", leistungen: [] }, map);
  assert.deepEqual(r.map((a) => a.id), ["2", "1", "3"]); // Stadt (alphabetisch), dann Einzugsgebiet; 4 und 5 fehlen
});

test("Ort: Groß/Klein und Leerraum egal, Mülheim an der Ruhr normalisiert", () => {
  assert.equal(L.filtere(liste, { thema: "pflege-betreuung", ort: "  wuppertal ", leistungen: [] }, map).length, 3);
  assert.deepEqual(L.filtere(liste, { thema: "pflege-betreuung", ort: "Mülheim a. d. Ruhr", leistungen: [] }, map).map((a) => a.id), ["6"]);
});

test("zur Leistung passende Kategorie zuerst, aber Stadt-Treffer vor Einzugsgebiet", () => {
  const r = L.filtere(liste, { thema: "pflege-betreuung", ort: "Wuppertal", leistungen: ["ambulante-pflege-durch-einen-pflegedienst"] }, map);
  assert.deepEqual(r.map((a) => a.id), ["1", "2", "3"]);
  assert.equal(r[0]._passt, true);
  assert.equal(r[1]._passt, false);
});

test("unbekannter Ort ohne Treffer (z. B. Wesel) -> leere Liste; leerer Ort -> alle des Themas", () => {
  assert.deepEqual(L.filtere(liste, { thema: "pflege-betreuung", ort: "Wesel", leistungen: [] }, map), []);
  assert.equal(L.filtere(liste, { thema: "pflege-betreuung", ort: "", leistungen: [] }, map).length, 5);
});

test("Telefon-Link: Leerzeichen/Bindestriche weg, nur erste Nummer", () => {
  assert.equal(L.telLink("0211 00000-12"), "tel:021100000" + "12");
  assert.equal(L.telLink("02065 9881040 / 02066 5039870"), "tel:020659881040");
  assert.equal(L.telLink("+49 211 33756489"), "tel:+4921133756489");
  assert.equal(L.telLink(""), "");
});

test("Textfassung enthält alle Kontakte und beide Hinweise; Links kodiert", () => {
  const t = L.kontaktText([{ name: "A", telefon: "0211 1", adresse: "Weg 1, 40210 Düsseldorf" }, { name: "B", email: "info@b.example.org" }]);
  assert.match(t, /1\. A\nAdresse: Weg 1/);
  assert.match(t, /2\. B\nE-Mail: info@b\.example\.org/);
  assert.ok(t.includes(L.HINWEIS_QUELLE) && t.includes(L.HINWEIS_PREISE));
  assert.ok(L.mailtoLink("Betreff & mehr", t).startsWith("mailto:?subject=Betreff%20%26%20mehr&body="));
  assert.equal(decodeURIComponent(L.whatsappLink("a b\nc").split("text=")[1]), "a b\nc");
});

test("Google-Maps-Link: Name + Stadt kodiert, keine Bewertungsdaten", () => {
  const u = L.googleMapsLink({ name: "Pflege & Co", stadt: "Mülheim an der Ruhr" });
  assert.equal(u, "https://www.google.com/maps/search/?api=1&query=Pflege%20%26%20Co%20M%C3%BClheim%20an%20der%20Ruhr");
});

// ---- Anliegen-Abgleich (data/anliegen.json): streng nach Kategorie, Ort über Stadt/Einzugsgebiet ----
// Kleine Test-Fixture mit erfundenen Platzhalter-Namen (keine Daten aus data/anbieter.json).
const fix = [
  { id: "t1", name: "Lift Nord", thema: "wohnen-haus-handwerk", kategorie_id: "01.02", stadt: "Solingen", einzugsgebiet: [] },
  { id: "t2", name: "Allround Handwerk", thema: "wohnen-haus-handwerk", kategorie_id: "01.03", stadt: "Solingen", einzugsgebiet: [] },
  { id: "t3", name: "Lift Süd", thema: "wohnen-haus-handwerk", kategorie_id: "01.02", stadt: "Haan", einzugsgebiet: ["Solingen"] },
  { id: "h1", name: "Putz B", thema: "haushalt-reinigung", kategorie_id: "02.01", stadt: "Solingen", einzugsgebiet: [] },
  { id: "h2", name: "Menü A", thema: "haushalt-reinigung", kategorie_id: "02.04", stadt: "Solingen", einzugsgebiet: [] },
  { id: "h3", name: "Laden C", thema: "alltag-persoenliche-hilfe", kategorie_id: "02.03", stadt: "Solingen", einzugsgebiet: [] },
  { id: "p1", name: "Physio Haus", thema: "pflege-betreuung", kategorie_id: "05.01", stadt: "Hilden", einzugsgebiet: [], angebotsform: "Hausbesuch" },
  { id: "p2", name: "Physio Praxis", thema: "pflege-betreuung", kategorie_id: "05.01", stadt: "Hilden", einzugsgebiet: [], angebotsform: "vor Ort" },
  { id: "p3", name: "Physio Beides", thema: "pflege-betreuung", kategorie_id: "05.01", stadt: "Hilden", einzugsgebiet: [], angebotsform: "Hausbesuch und vor Ort" },
  { id: "p4", name: "Physio Unbekannt", thema: "pflege-betreuung", kategorie_id: "05.01", stadt: "Hilden", einzugsgebiet: [] }
];

test("Anliegen streng: Treppenlift (01.02) zeigt keinen allgemeinen Handwerker; Stadt vor Einzugsgebiet", () => {
  const r = L.filtereAnliegen(fix, { kategorien: ["01.02"], ort: "Solingen" });
  assert.deepEqual(r.map((a) => a.id), ["t1", "t3"]);
  assert.equal(r[1]._gruppe, 1);
});

test("Anliegen: Thema egal, Kategorie zählt (Haushaltshilfe mit Einkaufen 02.03 aus anderem Thema); Hauptkategorie zuerst", () => {
  const r = L.filtereAnliegen(fix, { kategorien: ["02.01", "02.02", "02.04", "02.03"], ort: "solingen" });
  assert.deepEqual(r.map((a) => a.id), ["h1", "h2", "h3"]);
  assert.deepEqual(L.filtereAnliegen(fix, { kategorien: ["02.04"], ort: "Solingen" }).map((a) => a.id), ["h2"]);
});

test("Anliegen: Angebotsform-Filter schließt nur bekannte Abweichungen aus", () => {
  assert.deepEqual(L.filtereAnliegen(fix, { kategorien: ["05.01"], ort: "Hilden", angebotsform: "hausbesuch" }).map((a) => a.id).sort(), ["p1", "p3", "p4"]);
  assert.deepEqual(L.filtereAnliegen(fix, { kategorien: ["05.01"], ort: "Hilden", angebotsform: "vor-ort" }).map((a) => a.id).sort(), ["p2", "p3", "p4"]);
});

test("Anliegen ohne Kategorien (Ratgeber-Anliegen) und unbekannter Ort -> leer; Zählung je Anliegen", () => {
  assert.deepEqual(L.filtereAnliegen(fix, { kategorien: [], ort: "Solingen" }), []);
  assert.deepEqual(L.filtereAnliegen(fix, { kategorien: ["01.02"], ort: "Wesel" }), []);
  const n = L.zaehleAnliegen(fix, [{ id: "treppenlift", kategorien: ["01.02"] }, { id: "maler", kategorien: ["01.03"] }, { id: "zuschuss", kategorien: [] }], "Haan");
  assert.deepEqual(n, { treppenlift: 1, maler: 0, zuschuss: 0 });
});

test("Notizzettel-Text: nur beantwortete Zeilen", () => {
  const t = L.notizText("Das sollten Sie am Telefon sagen", [{ label: "Anliegen", wert: "Treppenlift" }, { label: "Etagen", wert: "" }, { label: "Treppe", wert: "Mit Kurve oder Wendel" }]);
  assert.equal(t, "Das sollten Sie am Telefon sagen\n\n- Anliegen: Treppenlift\n- Treppe: Mit Kurve oder Wendel");
});

test("Hausbesuch ja/nein aus der Angebotsform, unbekannt bleibt leer", () => {
  assert.equal(L.hausbesuch({ angebotsform: "Hausbesuch und vor Ort" }), "ja");
  assert.equal(L.hausbesuch({ angebotsform: "vor Ort" }), "nein");
  assert.equal(L.hausbesuch({ angebotsform: "Beratung" }), "");
  assert.equal(L.hausbesuch({}), "");
});
