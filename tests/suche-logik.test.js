// Unit-Test der Freitextsuche (assets/js/suche-logik.js) gegen den echten Anliegen-Katalog data/anliegen.json.
// Aufruf: node --test tests/*.test.js
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const S = require("../assets/js/suche-logik.js");

const K = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/anliegen.json"), "utf8"));
const ORTE = ["Düsseldorf", "Wuppertal", "Hilden", "Remscheid", "Solingen", "Langenfeld", "Haan", "Wesel", "Mülheim an der Ruhr"];
const KAT = {
  anliegen: K.anliegen,
  gruppen: K.gruppen,
  orte: ORTE,
  ratgeber: [{ slug: "treppenlift-einbau", titel: "Treppenlift: Einbau, Kosten und Zuschüsse", url: "/ratgeber/treppenlift-einbau/" }],
  themen: [{ slug: "pflege-betreuung", titel: "Pflege und Betreuung" }]
};
const erstes = (q) => S.suche(q, KAT).treffer[0];

test("normalisieren: Kleinschreibung, Umlaute, ß, Bindestriche", () => {
  assert.equal(S.normalisiere("Fußpflege – Bad-Umbau"), "fusspflege bad umbau");
  assert.equal(S.normalisiere("Düsseldorf"), S.normalisiere("duesseldorf"));
  assert.deepEqual(S.woerter("Ich suche Hilfe für meine Mutter"), []);
});

test("Wortstamm: -en, -er, -e abschneiden", () => {
  assert.equal(S.stamm("treppen"), "trepp");
  assert.equal(S.stamm("treppe"), "trepp");
  assert.equal(S.stamm("kurvige"), "kurvig");
  assert.equal(S.stamm("maler"), "mal");
  assert.equal(S.stamm("bad"), "bad");
});

test("Tippfehler: Abstand 1 erst ab 5 Buchstaben", () => {
  assert.equal(S.abstandHoechstensEins("hausnotruf", "hausnotrf"), true);
  assert.equal(S.abstandHoechstensEins("treppenlfit", "treppenlift"), true); // vertauscht
  assert.equal(S.abstandHoechstensEins("garten", "karten"), true);
  assert.equal(S.wortPasst("bat", "bad", false), 0, "kurze Wörter: kein Tippfehler-Abgleich");
  assert.equal(S.wortPasst("hausnotrf", "hausnotruf", false), 1);
  assert.equal(S.wortPasst("hausnotruf", "hausnotruf", false), 3);
});

test("Mehrwort-Regel: „dusche statt badewanne“ findet bad-dusche zuerst", () => {
  assert.equal(erstes("dusche statt badewanne").id, "bad-dusche");
  assert.equal(erstes("Badewanne raus, Dusche rein").id, "bad-dusche");
});

test("Szenarien aus dem Konzept", () => {
  const h = S.suche("Haushaltshilfe in Solingen", KAT);
  assert.equal(h.treffer[0].id, "haushaltshilfe");
  assert.equal(h.ort, "Solingen");
  const t = S.suche("Treppenlift kurvige Treppe", KAT);
  assert.equal(t.treffer[0].id, "treppenlift");
  assert.equal(S.passendeOption("Treppenlift kurvige Treppe", K.fragen["treppe-form"].optionen), "kurvig");
  const p = S.suche("Pflegedienst für Mutter in Düsseldorf", KAT);
  assert.equal(p.treffer[0].id, "pflegedienst");
  assert.equal(p.ort, "Düsseldorf");
  assert.equal(p.person, "angehoerige");
  assert.equal(erstes("Zuschüsse Badumbau").id, "bad-zuschuss");
});

test("Umgangssprache, Wortteile, Tippfehler und Eingabe ab 2 Buchstaben", () => {
  assert.equal(erstes("putzfrau").id, "haushaltshilfe");
  assert.equal(erstes("essen auf rädern").id, "essen");
  assert.equal(erstes("hausnotrf").id, "hausnotruf");
  assert.equal(erstes("trepp").id, "treppenlift");
  assert.equal(erstes("handy").id, "smartphone-computer");
  assert.equal(erstes("bad").art, "gruppe");
  assert.equal(S.suche("t", KAT).treffer.length, 0, "erst ab 2 Buchstaben");
  assert.ok(S.suche("tr", KAT).treffer.length > 0);
  assert.ok(S.suche("pf", KAT).treffer.length <= 5, "höchstens 5 Anliegen");
});

test("Ratgeber und Themen werden mitgefunden, höchstens 2 Ratgeber", () => {
  const r = S.suche("treppenlift", KAT);
  assert.equal(r.ratgeber.length, 1);
  assert.equal(r.ratgeber[0].url, "/ratgeber/treppenlift-einbau/");
  assert.equal(S.suche("pflege", KAT).themen[0].id, "pflege-betreuung");
});

test("Kein Treffer: leere Listen, aber erkannter Ort bleibt erhalten", () => {
  const r = S.suche("xyzqwv in Hilden", KAT);
  assert.deepEqual(r.treffer, []);
  assert.equal(r.ort, "Hilden");
  assert.equal(S.erkenneOrt("pflege in mülheim an der ruhr", ORTE).ort, "Mülheim an der Ruhr");
  assert.equal(S.erkenneOrt("pflege dusseldorf", ORTE).ort, "Düsseldorf");
});
