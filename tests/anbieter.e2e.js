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
  await page.fill("#f-plz", plz);
  await page.fill("#f-ort", ort);
  await page.click(".schritte__weiter");
  await page.waitForSelector("[data-schritt-anbieter]:not(.is-schritt-inaktiv)");
  await page.waitForSelector("[data-schritt-anbieter] .anbieter__laedt[hidden]", { state: "attached" });
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
    assert.equal(stand.trim(), "Schritt 3 von 7");
    assert.equal(await page.locator(".schritte__weiter").isHidden(), true, "generisches Weiter im Anbieter-Schritt verborgen");
    assert.equal(await page.locator(".anbieter-karte").count(), 6, "zunächst 6 Karten");
    const anruf = page.locator("[data-schritt-anbieter] .anbieter-karte__anruf").first();
    assert.match(await anruf.getAttribute("href"), /^tel:\+?\d+$/, "Anrufen-Button mit tel:-Link");
    assert.ok((await anruf.boundingBox()).height >= 48, "Anrufen mind. 48 px hoch");
    const g = page.locator("[data-schritt-anbieter] .anbieter-karte__google").first();
    assert.match(await g.getAttribute("href"), /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
    assert.equal(await g.getAttribute("target"), "_blank");
    assert.equal(await g.getAttribute("rel"), "noopener noreferrer");
    assert.equal(await page.locator("[data-schritt-anbieter] .anbieter-karte__wahl").first().evaluate((e) => e.getBoundingClientRect().height >= 48), true);
    assert.doesNotMatch(await page.locator("[data-schritt-anbieter]").textContent(), /Sterne|★/);
    assert.match(await page.textContent("[data-schritt-anbieter] .anbieter__quelle p"), /öffentlich zugänglichen Quellen, Stand November 2026, ohne Gewähr/);
    assert.equal(await page.locator("[data-schritt-anbieter] .anbieter__aktionen button").getAttribute("aria-disabled"), "true");
    await page.dispatchEvent("[data-schritt-anbieter] .anbieter__aktionen button", "click");
    assert.match(await page.textContent("[data-schritt-anbieter] .anbieter__fehler"), /mindestens einen Anbieter/);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/anbieter-liste-${name}.png`, fullPage: false });
    if (SHOTS && name === "mobil") await page.locator("#anfrage-formular").screenshot({ path: `${SHOTS}/formular-treffer-mobil.png` });

    await page.click("[data-schritt-anbieter] .anbieter__mehr button");
    assert.equal(await page.locator(".anbieter-karte").count(), 12, "Weitere anzeigen: 12 Karten");

    // Mehrfachauswahl über die ganze Karte (label)
    await page.locator(".anbieter-karte__wahl").nth(0).click();
    await page.locator(".anbieter-karte__wahl").nth(2).click();
    assert.equal((await page.textContent("[data-schritt-anbieter] .anbieter__zaehler")).trim(), "2 ausgewählt");
    await keinHorizontalesScrollen(page, name + " Liste");
    if (SHOTS) {
      await page.locator("[data-schritt-anbieter]").screenshot({ path: `${SHOTS}/anbieter-auswahl-${name}.png` });
    }

    await page.click("[data-schritt-anbieter] .anbieter__aktionen button");
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
    assert.equal(await page.evaluate(() => !!document.activeElement.closest(".anbieter__aktionen")), true, "Fokus zurück");

    // persönlicher Weg -> Beschreibung (Schritt 4) -> Kontaktdaten (Schritt 5)
    await page.click("[data-anbieter-persoenlich]");
    assert.equal((await page.textContent(".schritte__stand")).trim(), "Schritt 4 von 7");
    await page.fill("#f-beschreibung", "Ich suche Unterstützung für meine Mutter, mehrmals pro Woche.");
    await page.click(".schritte__weiter");
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
  assert.equal(await page.locator("[data-schritt-anbieter] .anbieter__leer").isVisible(), true);
  assert.match(await page.textContent("[data-schritt-anbieter] .anbieter__leer p"), /suchen persönlich/);
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

// ---- Assistent (neu, Relaunch 3.1): Ergebnis mit Trefferliste (Haushaltshilfe, Wuppertal) ----
// Ausführliche Szenarien: tests/assistent.e2e.js
(async () => {
  const browser = await chromium.launch();
  const fehler = [];
  for (const [name, vp] of [["mobil", { width: 390, height: 844 }], ["desktop", { width: 1440, height: 900 }]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") fehler.push(`assistent ${name}: ${m.text()}`); });
    page.on("pageerror", (e) => fehler.push(`assistent ${name}: ${e.message}`));
    await page.goto(BASE + "/");
    const app = page.locator("[data-assistent-app]");
    await app.locator(".assistent__card").waitFor();
    let tipps = 0;
    const tippe = async (locator) => { await locator.click(); tipps += 1; };
    await tippe(app.getByRole("button", { name: /^Haushaltshilfe/ }));
    assert.equal(await app.locator("button:has-text('Weiter')").count(), 0, "kein Weiter-Button");
    if (SHOTS && name === "mobil") await page.locator("#assistent").screenshot({ path: `${SHOTS}/assistent-frage-mobil.png` });
    await tippe(app.getByRole("button", { name: "Putzen und Reinigung" }));
    await tippe(app.getByRole("button", { name: "Wuppertal", exact: true }));
    assert.equal(tipps, 3, "3 Tipps bis zur Liste, der 4. ist „Anrufen“");
    assert.equal(await page.evaluate(() => document.activeElement.textContent), "„Haushaltshilfe“ in Wuppertal", "Fokus auf Ergebnis-Überschrift");
    await app.locator(".anbieter-karte").first().waitFor();
    const karten = await app.locator(".anbieter-karte").count();
    assert.ok(karten >= 1 && karten <= 6, "Karten im Assistenten: " + karten);
    assert.match(await app.textContent(), /öffentlich zugänglichen Quellen, Stand November 2026, ohne Gewähr/);
    assert.ok(await app.locator(".anbieter-karte__anruf").count() > 0, "Anrufen auf Karten im Assistenten");
    assert.equal(await app.getByRole("link", { name: "Bei uns melden" }).count(), 1);
    assert.match(await app.getByRole("link", { name: "Bei uns melden" }).getAttribute("href"), /thema=haushalt-reinigung.*ort=Wuppertal.*#anfrage/);
    await app.locator(".anbieter-karte__wahl").nth(0).click();
    if (karten > 1) {
      await app.locator(".anbieter-karte__wahl").nth(1).click();
      assert.equal((await app.locator(".anbieter__zaehler").textContent()).trim(), "2 ausgewählt");
    }
    await keinHorizontalesScrollen(page, "Assistent " + name);
    if (SHOTS) await page.locator("#assistent").screenshot({ path: `${SHOTS}/assistent-treffer-${name}.png` });
    await app.getByRole("button", { name: "Ausgewählte drucken oder weiterleiten" }).click();
    const dlg = page.locator("dialog.kontakt-dialog");
    await dlg.waitFor({ state: "visible" });
    assert.equal(await page.locator("dialog.kontakt-dialog").count(), 1, "nur ein Dialog");
    assert.equal(await dlg.locator(".kontakt").count(), karten > 1 ? 2 : 1);
    await keinHorizontalesScrollen(page, "Assistent-Dialog " + name);
    if (SHOTS && name === "mobil") await page.screenshot({ path: `${SHOTS}/assistent-dialog-mobil.png` });
    await page.keyboard.press("Escape");
    await dlg.waitFor({ state: "hidden" });

    // Leerzustand: Wesel -> keine Liste, Weg zur Anfrage
    await app.getByRole("button", { name: "Zurück" }).click();
    await app.getByRole("button", { name: "Wesel", exact: true }).click();
    await page.waitForFunction(() => /noch keinen Anbieter/.test(document.querySelector("[data-assistent-app]").textContent));
    assert.equal(await app.locator(".anbieter-karte").count(), 0);
    assert.equal(await app.locator(".anbieter__leer").isVisible(), false, "kein leerer Kasten");
    assert.equal(await app.getByRole("link", { name: "Bei uns melden" }).count(), 1);
    await ctx.close();
  }
  await browser.close();
  assert.deepEqual(fehler, [], "Konsolenfehler: " + fehler.join("; "));
  console.log("OK: Assistent-Ergebnis mit Trefferliste, Dialog, Leerzustand, mobil + desktop");
})().catch((e) => { console.error(e); process.exit(1); });
