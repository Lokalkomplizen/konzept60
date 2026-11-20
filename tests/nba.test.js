// Tests der NBA-Bewertungslogik.  Aufruf:  node --test tests/
// Erwartete Werte sind von Hand aus Anlage 1 und 2 zu § 15 SGB XI
// nachgerechnet (Rechenweg im Kommentar). Es sind KEINE amtlichen
// Referenzfälle – solche veröffentlicht der Medizinische Dienst nicht.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

const NBA = require("../assets/js/pflegegrad/nba.js");
const REGELN = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../data/pflegegrad/nba-2017.json"), "utf8")
);

const S = ["selbstaendig", "ueberwiegend_selbstaendig", "ueberwiegend_unselbstaendig", "unselbstaendig"];
const F = ["vorhanden", "groesstenteils", "gering", "nicht_vorhanden"];
const H = ["nie", "selten", "haeufig", "taeglich"];

/** Setzt Stufen-Antworten für eine Liste von Kriterien. */
function setze(a, ids, wert) {
  ids.forEach((id) => (a[id] = wert));
  return a;
}
const ids = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix}.${i + 1}`);
const calc = (a, b) => NBA.berechne(REGELN, a, b);
const modul = (r, nr) => r.module[nr - 1];

// -------------------------------------------------------------------------
// Datenbasis gegen Anlage 2 prüfen
// -------------------------------------------------------------------------
test("Datenbasis: Höchstsummen je Modul entsprechen Anlage 2", () => {
  // Anlage 2, jeweils Obergrenze „schwerste“: M1 15, M2 33, M3 65, M4 54, M5 15, M6 18
  const erwartet = { 1: 15, 2: 33, 3: 65, 4: 54, 5: 15, 6: 18 };
  for (const m of REGELN.module) {
    let max = 0;
    for (const k of m.kriterien) {
      if (k.typ === "stufen") max += Math.max(...k.punkte);
      else max += Math.max(...k.punktgrenzen.map((g) => g.punkte));
    }
    assert.equal(max, erwartet[m.nr], `Modul ${m.nr}`);
  }
});

test("Datenbasis: Gewichtungen ergeben 100 Punkte", () => {
  const max = REGELN.module
    .filter((m) => m.nr !== 3) // Modul 2/3 teilen sich 15 %
    .reduce((s, m) => s + m.gewichtete_punkte[4], 0);
  assert.equal(max, 100);
});

// -------------------------------------------------------------------------
// Gesamtfälle
// -------------------------------------------------------------------------
test("Keine Einschränkungen → 0 Punkte, kein Pflegegrad", () => {
  const r = calc({});
  assert.equal(r.gesamtpunkte, 0);
  assert.equal(r.pflegegrad, 0);
});

test("Alle Kriterien maximal → 100 Punkte, Pflegegrad 5", () => {
  const a = {};
  setze(a, ids("1", 5), S[3]);
  setze(a, ids("2", 11), F[3]);
  setze(a, ids("3", 13), H[3]);
  setze(a, ids("4", 12), S[3]);
  a["4.13"] = "teilweise"; // 6 Punkte (höchster Wert, Anlage 1)
  a["5.1"] = { tag: 9 }; //  > 8×/Tag → 3
  a["5.8"] = { tag: 3 }; // ≥ 3×/Tag → 3
  a["5.12"] = { tag: 1 }; // täglich → 60 → 6
  a["5.16"] = "unselbstaendig"; // 3
  setze(a, ids("6", 6), S[3]);
  const r = calc(a, { harn_relevant: true, stuhl_relevant: true });
  assert.deepEqual(r.module.map((m) => m.summe), [15, 33, 65, 54, 15, 18]);
  assert.equal(r.gesamtpunkte, 100);
  assert.equal(r.pflegegrad, 5);
});

// -------------------------------------------------------------------------
// Pflegegrad-Grenzen (§ 15 Abs. 3) – jeweils knapp darunter / genau auf der Grenze
// -------------------------------------------------------------------------
test("Grenze 12,5: 10 Punkte → kein PG; 12,5 → PG 1", () => {
  // M4 Summe 3 (geringe) = 10; M1 Summe 1 (keine) = 0
  let r = calc({ "4.1": S[1], "4.2": S[1], "4.3": S[1], "1.1": S[1] });
  assert.equal(r.gesamtpunkte, 10);
  assert.equal(r.pflegegrad, 0);
  // + M1 Summe 2 (geringe) = 2,5 → 12,5
  r = calc({ "4.1": S[1], "4.2": S[1], "4.3": S[1], "1.1": S[2] });
  assert.equal(r.gesamtpunkte, 12.5);
  assert.equal(r.pflegegrad, 1);
});

test("Grenze 27: 26,25 → PG 1; 27 → PG 2", () => {
  // M4 Summe 8 = 20; M1 Summe 2 = 2,5; M6 Summe 1 = 3,75 → 26,25
  const basis = { "4.8": S[2], "4.4": S[2] }; // 6 + 2 = 8
  let r = calc({ ...basis, "1.5": S[2], "6.1": S[1] });
  assert.equal(r.gesamtpunkte, 26.25);
  assert.equal(r.pflegegrad, 1);
  // M4 20 + M1 Summe 6 (schwere) 7,5 = 27,5. Genau 27 ist mit den Stufenwerten
  // nicht erreichbar, daher wird die Grenze zusätzlich direkt geprüft.
  r = calc({ ...basis, "1.4": S[3], "1.5": S[3] });
  assert.equal(r.gesamtpunkte, 27.5);
  assert.equal(r.pflegegrad, 2);
  // Grenze selbst über die Funktion prüfen
  assert.equal(NBA.pflegegradAusPunkten(REGELN.pflegegrade, 27), 2);
  assert.equal(NBA.pflegegradAusPunkten(REGELN.pflegegrade, 26.99), 1);
});

test("Grenze 47,5: 45 → PG 2; 47,5 → PG 3", () => {
  // M4 Summe 19 (schwere) = 30; M5 Summe 2 (erhebliche) = 10
  const a = {};
  setze(a, ids("4", 7), S[2]); // 14
  a["4.8"] = S[1]; // 3 → 17
  a["4.9"] = S[1]; // 2 → 19
  a["5.16"] = S[2]; // 2
  let r = calc({ ...a, "1.1": S[2], "1.2": S[2] }); // M1 Summe 4 = 5 → 45
  assert.equal(r.gesamtpunkte, 45);
  assert.equal(r.pflegegrad, 2);
  r = calc({ ...a, "1.1": S[3], "1.2": S[3] }); // M1 Summe 6 = 7,5 → 47,5
  assert.equal(r.gesamtpunkte, 47.5);
  assert.equal(r.pflegegrad, 3);
});

test("Grenze 70: 67,5 → PG 3; 70 → PG 4", () => {
  const a = {};
  setze(a, ids("4", 12), S[3]); // 21 + 9 + 6 + 6 + 3 + 3 = 48, ohne Inkontinenz-Bedingung 42
  // M4 ≥ 37 = 40
  a["5.1"] = { tag: 4 }; // 2 Punkte
  a["5.16"] = S[2]; // 2 Punkte → Summe 4 = 15
  let r = calc({ ...a, "1.1": S[3], "1.2": S[3] }); // M1 6 = 7,5 → 62,5
  assert.equal(r.gesamtpunkte, 62.5);
  r = calc({ ...a, "6.1": S[3], "6.2": S[3], "6.3": S[1] }); // M6 7 = 11,25 → 66,25
  assert.equal(r.gesamtpunkte, 66.25);
  assert.equal(r.pflegegrad, 3);
  setze(a, ["2.1", "2.2", "2.3", "2.4", "2.5", "2.6"], F[3]); // M2 18 = 15
  r = calc(a);
  assert.equal(r.gesamtpunkte, 70);
  assert.equal(r.pflegegrad, 4);
});

test("Grenze 90: 88,75 → PG 4; 92,5 → PG 5", () => {
  const a = {};
  setze(a, ids("4", 12), S[3]); // M4 = 40
  a["5.12"] = { tag: 1 }; // 6 → M5 schwerste = 20
  setze(a, ["2.1", "2.2", "2.3", "2.4", "2.5"], F[3]); // M2 15 (schwere) = 11,25
  a["1.1"] = S[2]; // M1 2 = 2,5
  setze(a, ["6.1", "6.2", "6.3", "6.4"], S[3]); // M6 12 = 15
  let r = calc(a);
  assert.equal(r.gesamtpunkte, 88.75);
  assert.equal(r.pflegegrad, 4);
  a["2.6"] = F[2]; // M2 17 = 15 → 40 + 20 + 15 + 2,5 + 15 = 92,5
  r = calc(a);
  assert.equal(r.gesamtpunkte, 92.5);
  assert.equal(r.pflegegrad, 5);
  assert.equal(NBA.pflegegradAusPunkten(REGELN.pflegegrade, 90), 5);
  assert.equal(NBA.pflegegradAusPunkten(REGELN.pflegegrade, 89.99), 4);
});

// -------------------------------------------------------------------------
// Modul 2 / 3 (§ 15 Abs. 3)
// -------------------------------------------------------------------------
test("Modul 2/3: nur der höhere gewichtete Wert zählt, keine Addition", () => {
  const a = {};
  setze(a, ["2.1", "2.2", "2.3"], F[2]); // M2 6 = erhebliche 7,5
  a["3.1"] = H[3]; // M3 5 = schwere 11,25
  const r = calc(a);
  assert.equal(modul(r, 2).gewichtet, 7.5);
  assert.equal(modul(r, 3).gewichtet, 11.25);
  assert.equal(modul(r, 2).zaehlt, false);
  assert.equal(modul(r, 3).zaehlt, true);
  assert.equal(r.gesamtpunkte, 11.25);
});

test("Modul 3: Häufigkeitspunkte 0/1/3/5 und Schwellen 1/3/5/7", () => {
  assert.equal(modul(calc({ "3.2": H[1] }), 3).stufe, 1); // 1 → geringe
  assert.equal(modul(calc({ "3.2": H[2] }), 3).stufe, 2); // 3 → erhebliche
  assert.equal(modul(calc({ "3.2": H[3] }), 3).stufe, 3); // 5 → schwere
  assert.equal(modul(calc({ "3.2": H[3], "3.10": H[2] }), 3).stufe, 4); // 8 → schwerste
});

// -------------------------------------------------------------------------
// Modul 4 – Sonderregeln
// -------------------------------------------------------------------------
test("Modul 4: 4.8 Essen zählt dreifach, 4.9/4.10 doppelt", () => {
  assert.equal(modul(calc({ "4.8": S[3] }), 4).summe, 9);
  assert.equal(modul(calc({ "4.9": S[3] }), 4).summe, 6);
  assert.equal(modul(calc({ "4.10": S[3] }), 4).summe, 6);
});

test("Modul 4: 4.11/4.12 zählen nur bei Inkontinenz bzw. künstlicher Ableitung", () => {
  const a = { "4.11": S[3], "4.12": S[3] };
  assert.equal(modul(calc(a), 4).summe, 0);
  assert.equal(modul(calc(a, { harn_relevant: true }), 4).summe, 3);
  assert.equal(modul(calc(a, { harn_relevant: true, stuhl_relevant: true }), 4).summe, 6);
});

test("Modul 4: 4.13 Sonde – teilweise 6, vollständig 3", () => {
  assert.equal(modul(calc({ "4.13": "teilweise" }), 4).summe, 6);
  assert.equal(modul(calc({ "4.13": "vollstaendig" }), 4).summe, 3);
  assert.equal(modul(calc({ "4.13": "entfaellt" }), 4).summe, 0);
});

// -------------------------------------------------------------------------
// Modul 5 – Häufigkeitsregeln
// -------------------------------------------------------------------------
const m5 = (a) => modul(calc(a), 5);

test("Modul 5, 5.1–5.7: Tagesdurchschnitt aus Tag + Woche/7 + Monat/30", () => {
  assert.equal(m5({ "5.1": { monat: 29 } }).summe, 0); // < 1×/Tag
  assert.equal(m5({ "5.1": { monat: 30 } }).summe, 1); // genau 1×/Tag
  assert.equal(m5({ "5.1": { woche: 7 } }).summe, 1); // genau 1×/Tag
  assert.equal(m5({ "5.1": { tag: 3 } }).summe, 1); // genau 3 → noch 1
  assert.equal(m5({ "5.1": { tag: 3 }, "5.6": { woche: 1 } }).summe, 2); // > 3
  assert.equal(m5({ "5.1": { tag: 8 } }).summe, 2); // genau 8 → noch 2
  assert.equal(m5({ "5.1": { tag: 8, monat: 1 } }).summe, 3); // > 8
  // Beispiel aus Anlage 1: 3× Medikation + 1× Blutzucker täglich = 4 → 2 Punkte
  assert.equal(m5({ "5.1": { tag: 3 }, "5.6": { tag: 1 } }).summe, 2);
});

test("Modul 5, 5.8–5.11: wöchentliche und tägliche Schwellen", () => {
  assert.equal(m5({ "5.8": { monat: 4 } }).summe, 0); // < 1×/Woche (4/30 < 1/7)
  assert.equal(m5({ "5.8": { monat: 5 } }).summe, 1); // 5/30 ≥ 1/7
  assert.equal(m5({ "5.8": { woche: 1 } }).summe, 1);
  assert.equal(m5({ "5.8": { woche: 6 } }).summe, 1); // < 1×/Tag
  assert.equal(m5({ "5.8": { tag: 1 } }).summe, 2);
  assert.equal(m5({ "5.8": { tag: 2, woche: 6 } }).summe, 2); // < 3×/Tag
  assert.equal(m5({ "5.8": { tag: 2, woche: 7 } }).summe, 3); // genau 3×/Tag
});

test("Modul 5, 5.12–5.15: Gewichte 4,3 / 8,6 / 2 / 60 ohne Rundungsfehler", () => {
  assert.equal(m5({ "5.13": { monat: 4 } }).summe, 0); // 4 < 4,3
  assert.equal(m5({ "5.13": { woche: 1 } }).summe, 1); // 4,3
  assert.equal(m5({ "5.13": { woche: 2 } }).summe, 2); // 8,6
  assert.equal(m5({ "5.13": { woche: 3 } }).summe, 3); // 12,9 (Gleitkomma-Falle 3 × 4,3)
  assert.equal(m5({ "5.15": { woche: 1 } }).summe, 2); // 8,6
  assert.equal(m5({ "5.15": { monat: 2 }, "5.14": { monat: 1 } }).summe, 1); // 4 + 1 = 5
  assert.equal(m5({ "5.12": { tag: 1 } }).summe, 6); // täglich = 60
  assert.equal(m5({ "5.12": { woche: 6 } }).summe, 3); // 51,6 < 60
  assert.equal(m5({ "5.12": { woche: 7 } }).summe, 6); // 60,2 ≥ 60
});

test("Modul 5: Summe der vier Teilbereiche → Stufe", () => {
  // 1 (5.1) + 1 (5.8) + 1 (5.13) + 1 (5.16) = 4 → schwere = 15
  const r = m5({ "5.1": { tag: 1 }, "5.8": { woche: 1 }, "5.13": { woche: 1 }, "5.16": S[1] });
  assert.equal(r.summe, 4);
  assert.equal(r.gewichtet, 15);
});

// -------------------------------------------------------------------------
// Fehlerhafte Eingaben
// -------------------------------------------------------------------------
test("Ungültige Antwort wird abgewiesen statt still gezählt", () => {
  assert.throws(() => calc({ "1.1": "vielleicht" }), /Ungültige Antwort/);
});

test("Negative oder unsinnige Häufigkeiten zählen als 0", () => {
  assert.equal(m5({ "5.1": { tag: -5, woche: "abc" } }).summe, 0);
});

// -------------------------------------------------------------------------
// Entwurf 2027 und Leistungsdaten
// -------------------------------------------------------------------------
const ENTWURF = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/pflegegrad/nba-2027-entwurf.json"), "utf8"));
const LEISTUNGEN = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/pflegegrad/leistungen.json"), "utf8"));

test("Entwurf 2027: dieselben Punkte ergeben ggf. einen niedrigeren Grad", () => {
  assert.equal(NBA.pflegegradAusPunkten(REGELN.pflegegrade, 28), 2);
  assert.equal(NBA.pflegegradAusPunkten(ENTWURF.pflegegrade, 28), 1);
  assert.equal(NBA.pflegegradAusPunkten(ENTWURF.pflegegrade, 12.5), 0);
  assert.equal(NBA.pflegegradAusPunkten(ENTWURF.pflegegrade, 50), 3);
});

test("Leistungsdaten: jedes Paket hat Rechtsstatus, jede Leistung Quelle und Zeitraum", () => {
  const status = ["geltend", "beschlossen", "gesetzentwurf", "historisch"];
  for (const p of LEISTUNGEN.pakete) {
    assert.ok(status.includes(p.rechtsstatus), p.id);
    assert.ok(p.gueltig_ab, p.id);
    for (const l of p.leistungen) {
      assert.ok(l.quellen && l.quellen.length > 0, l.id);
      assert.ok(l.zeitraum, l.id);
      assert.ok(l.voraussetzungen, l.id);
    }
  }
});

// -------------------------------------------------------------------------
// Umschaltung nach Datum und Rechtsstand
// -------------------------------------------------------------------------
test("Regelwerk: Entwurf wird nie gerechnet, auch nach dem 1.1.2027", () => {
  const r = NBA.regelwerkFuer(REGELN, [ENTWURF], "2027-03-01");
  assert.equal(r.aktiv.id, "nba_2017");
  assert.equal(r.kommend.id, ENTWURF.id);
});

test("Regelwerk: beschlossen, aber vor Inkrafttreten → alte Grenzen + Hinweis", () => {
  const b = { ...ENTWURF, rechtsstatus: "beschlossen" };
  const r = NBA.regelwerkFuer(REGELN, [b], "2026-12-31");
  assert.equal(r.aktiv.id, "nba_2017");
  assert.equal(NBA.pflegegradAusPunkten(r.aktiv.pflegegrade, 28), 2);
  assert.equal(r.kommend.rechtsstatus, "beschlossen");
});

test("Regelwerk: beschlossen und in Kraft → neue Grenzen, kein Hinweis mehr", () => {
  const b = { ...ENTWURF, rechtsstatus: "beschlossen" };
  const r = NBA.regelwerkFuer(REGELN, [b], "2027-01-01");
  assert.equal(r.aktiv.id, ENTWURF.id);
  assert.equal(r.kommend, null);
  assert.equal(NBA.pflegegradAusPunkten(r.aktiv.pflegegrade, 28), 1);
});
