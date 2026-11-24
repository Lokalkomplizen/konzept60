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
