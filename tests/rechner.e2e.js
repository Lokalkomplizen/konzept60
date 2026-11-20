// Ende-zu-Ende-Test des Pflegegradrechners im echten Browser (Playwright).
// Aufruf (Playwright muss installiert sein, im Projektordner):
//   python3 -m http.server 8765 &   node tests/rechner.e2e.js
// Prüft: kompletter Durchlauf über die Oberfläche ergibt dieselben Punkte wie
// nba.js direkt, Filterfragen überspringen, Pflichtfelder, Ändern, Neustart,
// keine Netzwerkanfragen nach dem Laden, kein Storage.
"use strict";
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const NBA = require("../assets/js/pflegegrad/nba.js");

const BASE = process.env.BASE || "http://localhost:8765";
const SHOTS = process.env.SHOTS; // optionaler Ordner für Screenshots
const D = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "../data/pflegegrad", f), "utf8"));
const REGELN = D("nba-2017.json");
const FRAGEN = D("fragen.json");

// Testfall: Antwortindex je Skala, Filter, Häufigkeiten
const FALL = {
  filter: { bedarfskonstellation: "nein", kognition: "ja", verhalten: "nein", harn_relevant: "ja", stuhl_relevant: "nein", medizin: "ja" },
  wahl: (frage) => (frage.kriterium.startsWith("4.") ? 2 : frage.kriterium.startsWith("2.") ? 1 : frage.skala === "sonde" ? 0 : 1),
  haeufigkeit: { "5.1": { tag: 3 }, "5.6": { tag: 1 }, "5.13": { monat: 2 } },
};

function erwartet() {
  const antworten = {};
  for (const s of FRAGEN.schritte) {
    if (s.nur_wenn) {
      const [k, v] = s.nur_wenn.split("=");
      if (FALL.filter[k] !== v) continue;
    }
    for (const f of s.fragen) {
      if (!f.kriterium) continue;
      if (f.typ === "haeufigkeit") { if (FALL.haeufigkeit[f.kriterium]) antworten[f.kriterium] = FALL.haeufigkeit[f.kriterium]; }
      else antworten[f.kriterium] = FRAGEN.skalen[f.skala][FALL.wahl(f)].wert;
    }
  }
  return NBA.berechne(REGELN, antworten, { harn_relevant: true, stuhl_relevant: false });
}

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name), fullPage: true });
}

async function durchlauf(page, prefix) {
  const requests = [];
  page.on("request", (r) => requests.push(r.url()));
  await page.goto(BASE + "/mein-alltag/pflegegrad-rechner/");
  await shot(page, prefix + "-start.png");
  const nachLaden = requests.length;
  await page.click("[data-pgr-los]");

  // Pflichtfeld: Weiter ohne Antwort zeigt Fehler
  await page.click("[data-pgr-frage] button[type=submit]");
  assert.ok(await page.isVisible(".pgr-q__fehler"), "Fehlermeldung bei fehlender Antwort");

  let schritt = 0;
  while (await page.isVisible("[data-pgr-frage]")) {
    const sets = await page.$$("[data-pgr-frage] .pgr-q");
    for (const fs_ of sets) {
      const typ = await fs_.getAttribute("data-typ");
      if (typ === "filter") {
        const key = await fs_.getAttribute("data-key");
        await (await fs_.$(`input[value="${FALL.filter[key]}"]`)).check();
      } else if (typ === "skala") {
        const k = await fs_.getAttribute("data-kriterium");
        const frage = FRAGEN.schritte.flatMap((s) => s.fragen).find((f) => f.kriterium === k);
        const inputs = await fs_.$$("input[type=radio]");
        await inputs[FALL.wahl(frage)].check();
      } else if (typ === "haeufigkeit") {
        const k = await fs_.getAttribute("data-kriterium");
        const h = FALL.haeufigkeit[k] || {};
        for (const [e, v] of Object.entries(h)) await fs_.$eval(`[data-einheit="${e}"]`, (el, v) => (el.value = String(v)), v);
      }
    }
    if (schritt === 3) await shot(page, prefix + "-frage.png");
    await page.click("[data-pgr-frage] button[type=submit]");
    schritt++;
    assert.ok(schritt < 40, "Endlosschleife im Fragebogen");
  }
  assert.ok(await page.isVisible("[data-pgr-zusammenfassung]"));
  await shot(page, prefix + "-zusammenfassung.png");
  await page.click("[data-pgr-auswerten]");
  await page.waitForSelector("[data-pgr-ergebnis]:not([hidden])");
  await shot(page, prefix + "-ergebnis.png");

  const summe = await page.textContent("[data-pgr-summe]");
  const grad = await page.textContent("[data-pgr-grad]");
  const e = erwartet();
  assert.equal(summe, e.gesamtpunkte.toLocaleString("de-DE", { maximumFractionDigits: 2 }));
  assert.equal(grad, e.pflegegrad ? "Pflegegrad " + e.pflegegrad : "Voraussichtlich kein Pflegegrad");

  // Verhalten-Filter "nein" → keine Modul-3-Fragen gezeigt; Schrittzahl passt
  const aktiv = FRAGEN.schritte.filter((s) => !s.nur_wenn || FALL.filter[s.nur_wenn.split("=")[0]] === s.nur_wenn.split("=")[1]);
  assert.equal(schritt, aktiv.length, "Anzahl der gezeigten Schritte");

  // Ändern aus der Übersicht
  await page.click("[data-pgr-uebersicht]");
  await page.click(".pgr-summary__edit >> nth=0");
  assert.ok(await page.isVisible("[data-pgr-frage]"));

  // Datenschutz: nach dem Laden keine Anfragen, kein Storage
  assert.equal(requests.length, nachLaden, "Netzwerkanfragen nach dem Laden: " + requests.slice(nachLaden).join(", "));
  const storage = await page.evaluate(() => localStorage.length + sessionStorage.length + document.cookie.length);
  assert.equal(storage, 0);

  // Neustart löscht alles
  await page.goto(BASE + "/mein-alltag/pflegegrad-rechner/");
  return { e, schritt };
}

(async () => {
  const browser = await chromium.launch();
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const r1 = await durchlauf(desktop, "desktop");
  const mobil = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
  await durchlauf(mobil, "mobil");
  await browser.close();
  console.log(`OK – ${r1.schritt} Schritte, ${r1.e.gesamtpunkte} Punkte, Pflegegrad ${r1.e.pflegegrad}`);
})().catch((err) => { console.error(err); process.exit(1); });
