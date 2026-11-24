// Ende-zu-Ende-Test der Anbieter-Trefferliste im Anfrageformular (Playwright).
// Aufruf: python3 -m http.server 8765 &   SHOTS=<ordner> node tests/anbieter.e2e.js
// Prüft: Ablauf Pflege + Wuppertal bis Kontaktfenster, Mehrfachauswahl, Zähler, Weitere anzeigen,
// Leerzustand (Wesel), Druckansicht (nur Dialog), Mobil 390 px / Desktop 1440 px ohne horizontales Scrollen,
// keine Konsolenfehler.
"use strict";
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const BASE = process.env.BASE || "http://localhost:8765";
const SHOTS = process.env.SHOTS;

async function bisAnbieter(page, thema, ort, plz) {
  await page.goto(BASE + "/#anfrage");
  await page.check("#f-wer-selbst");
  await page.selectOption("#f-thema", thema);
  await page.click(".schritte__weiter");
  await page.fill("#f-beschreibung", "Ich suche Unterstützung für meine Mutter, mehrmals pro Woche.");
  await page.click(".schritte__weiter");
  await page.fill("#f-plz", plz);
  await page.fill("#f-ort", ort);
  await page.click(".schritte__weiter");
  await page.waitForSelector("[data-schritt-anbieter]:not(.is-schritt-inaktiv)");
  await page.waitForSelector("[data-anbieter-laedt][hidden]", { state: "attached" });
}

async function keinHorizontalesScrollen(page, label) {
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(w[0] <= w[1], `${label}: horizontales Scrollen (${w[0]} > ${w[1]})`);
}

(async () => {
  const browser = await chromium.launch();
  const fehler = [];
  for (const [name, vp] of [["mobil", { width: 390, height: 844 }], ["desktop", { width: 1440, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") fehler.push(`${name}: ${m.text()}`); });
    page.on("pageerror", (e) => fehler.push(`${name}: ${e.message}`));

    await bisAnbieter(page, "pflege-betreuung", "Wuppertal", "42103");
    const stand = await page.textContent(".schritte__stand");
    assert.equal(stand.trim(), "Schritt 4 von 7");
    assert.equal(await page.locator(".schritte__weiter").isHidden(), true, "generisches Weiter im Anbieter-Schritt verborgen");
    assert.equal(await page.locator(".anbieter-karte").count(), 6, "zunächst 6 Karten");
    assert.match(await page.textContent("[data-anbieter-quelle-text]"), /öffentlich zugänglichen Quellen, Stand November 2026, ohne Gewähr/);
    assert.equal(await page.locator("[data-anbieter-kontakt]").getAttribute("aria-disabled"), "true");
    await page.dispatchEvent("[data-anbieter-kontakt]", "click");
    assert.match(await page.textContent("[data-anbieter-fehler]"), /mindestens einen Anbieter/);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/anbieter-liste-${name}.png`, fullPage: false });

    await page.click("[data-anbieter-mehr]");
    assert.equal(await page.locator(".anbieter-karte").count(), 12, "Weitere anzeigen: 12 Karten");

    // Mehrfachauswahl über die ganze Karte (label)
    await page.locator(".anbieter-karte").nth(0).click();
    await page.locator(".anbieter-karte").nth(2).click();
    assert.equal((await page.textContent("[data-anbieter-zaehler]")).trim(), "2 ausgewählt");
    await keinHorizontalesScrollen(page, name + " Liste");
    if (SHOTS) {
      await page.locator("[data-schritt-anbieter]").screenshot({ path: `${SHOTS}/anbieter-auswahl-${name}.png` });
    }

    await page.click("[data-anbieter-kontakt]");
    const dlg = page.locator("dialog.kontakt-dialog");
    await dlg.waitFor({ state: "visible" });
    assert.equal(await page.evaluate(() => document.activeElement.id), "kontakt-dialog-titel", "Fokus auf Überschrift");
    assert.equal(await dlg.locator(".kontakt").count(), 2);
    assert.match(await dlg.locator("a.kontakt__anruf").first().getAttribute("href"), /^tel:\+?\d+$/);
    assert.match(await dlg.textContent(), /Bitte vereinbaren Sie Preise und Termine direkt mit dem Anbieter\./);
    assert.equal(await dlg.getByRole("button", { name: "Weiterleiten" }).count() + await dlg.getByText("Per WhatsApp senden").count() > 0, true);
    await keinHorizontalesScrollen(page, name + " Dialog");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/kontaktfenster-${name}.png` });

    // Druckansicht: nur der Dialoginhalt
    await dlg.getByRole("button", { name: "Drucken" }).evaluate((b) => { window.print = () => {}; });
    await dlg.getByRole("button", { name: "Drucken" }).click();
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator(".site-header").isVisible(), false, "Druck: Kopf verborgen");
    assert.equal(await page.locator("#anfrage-formular").isVisible(), false, "Druck: Formular verborgen");
    assert.equal(await dlg.locator(".kontakt").first().isVisible(), true, "Druck: Kontakte sichtbar");
    assert.equal(await dlg.locator(".kontakt-dialog__aktionen").isVisible(), false, "Druck: Schaltflächen verborgen");
    if (SHOTS && name === "desktop") await page.screenshot({ path: `${SHOTS}/druckansicht.png`, fullPage: true });
    await page.emulateMedia({ media: "screen" });

    // Esc schließt, Fokus zurück
    await page.keyboard.press("Escape");
    await dlg.waitFor({ state: "hidden" });
    assert.equal(await page.evaluate(() => document.activeElement.hasAttribute("data-anbieter-kontakt")), true, "Fokus zurück");

    // persönlicher Weg -> Kontaktdaten (Schritt 5)
    await page.click("[data-anbieter-persoenlich]");
    assert.equal((await page.textContent(".schritte__stand")).trim(), "Schritt 5 von 7");
    await page.waitForSelector("#f-vorname", { state: "visible" });
    await ctx.close();
  }

  // Leerzustand: Wesel hat keine Einträge
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") fehler.push(`wesel: ${m.text()}`); });
  await bisAnbieter(page, "pflege-betreuung", "Wesel", "46483");
  assert.equal(await page.locator(".anbieter-karte").count(), 0);
  assert.equal(await page.locator("[data-anbieter-leer]").isVisible(), true);
  assert.match(await page.textContent("[data-anbieter-leer-text]"), /suchen persönlich/);
  await keinHorizontalesScrollen(page, "Wesel");
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/anbieter-leer-mobil.png` });
  await ctx.close();

  // Ohne JS: Schritt verborgen, Formular unverändert
  const ctxN = await browser.newContext({ javaScriptEnabled: false });
  const pageN = await ctxN.newPage();
  await pageN.goto(BASE + "/");
  assert.equal(await pageN.locator("[data-schritt-anbieter]").isVisible(), false);
  assert.equal(await pageN.locator("#f-vorname").isVisible(), true);
  await ctxN.close();

  await browser.close();
  assert.deepEqual(fehler, [], "Konsolenfehler: " + fehler.join("; "));
  console.log("OK: Anbieter-Ablauf, Auswahl, Dialog, Druck, Leerzustand, ohne JS, mobil + desktop");
})().catch((e) => { console.error(e); process.exit(1); });
