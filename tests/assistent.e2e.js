// Ende-zu-Ende-Test: Assistent mit Freitextsuche auf /hilfe-finden/ und der Startseite (Playwright).
// Aufruf: python3 -m http.server 8765 &   SHOTS=<ordner/> node tests/assistent.e2e.js
// Szenarien (Konzept docs/relaunch/konzept-assistent-suche.md): „Haushaltshilfe in Solingen“,
// „Treppenlift kurvige Treppe“, „Pflegedienst für Mutter in Düsseldorf“, „Zuschüsse Badumbau“ /
// „dusche statt badewanne“. Erwartete Trefferzahlen werden zur Laufzeit mit derselben reinen Logik
// (anbieter-logik.js) aus der ausgelieferten Liste berechnet – keine Anbieterdaten im Test.
// Dazu: Combobox per Tastatur, Zurück-Knopf des Browsers, Notizzettel, Null-Treffer, ohne JS, 320 px.
"use strict";
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const L = require("../assets/js/anbieter-logik.js");

const BASE = process.env.BASE || "http://localhost:8765";
const SHOTS = process.env.SHOTS ? process.env.SHOTS.replace(/\/?$/, "/") : "";
const ANBIETER = JSON.parse(fs.readFileSync(path.join(__dirname, "../assets/data/anbieter.json"), "utf8")).anbieter;
const erwartet = (kategorien, ort) => L.filtereAnliegen(ANBIETER, { kategorien, ort }).map((a) => a.id);

async function keinHorizontalesScrollen(page, label) {
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(w[0] <= w[1], `${label}: horizontales Scrollen (${w[0]} > ${w[1]})`);
}
async function fokusText(page) { return page.evaluate(() => document.activeElement && document.activeElement.textContent.trim()); }
async function suche(page, text) {
  const input = page.locator(".assistent__suche input[role=combobox]");
  await input.fill(text);
  await page.locator(".assistent__suche [role=listbox]:not([hidden]) [role=option]").first().waitFor();
  return input;
}
async function warteAufListe(page) {
  await page.waitForFunction(() => {
    const z = document.querySelector(".assistent__trefferzahl");
    return z && !/gesucht/.test(z.textContent);
  });
}
async function angezeigteIds(page) {
  // alle Karten aufdecken
  while (await page.locator(".assistent__liste .anbieter__mehr:not([hidden]) button").count()) {
    await page.locator(".assistent__liste .anbieter__mehr button").click();
  }
  return page.locator(".assistent__liste input[data-anbieter-id]").evaluateAll((els) => els.map((e) => e.getAttribute("data-anbieter-id")));
}

(async () => {
  const browser = await chromium.launch();
  const fehler = [];
  const neueSeite = async (name, vp) => {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") fehler.push(`${name}: ${m.text()}`); });
    page.on("pageerror", (e) => fehler.push(`${name}: ${e.message}`));
    return { ctx, page };
  };

  for (const [name, vp] of [["mobil", { width: 390, height: 844 }], ["desktop", { width: 1440, height: 900 }]]) {
    const { ctx, page } = await neueSeite(name, vp);

    // ---- Szenario 1: Haushaltshilfe in Solingen (Tastatur: Pfeil runter + Enter) ----
    await page.goto(BASE + "/hilfe-finden/");
    await page.waitForSelector(".assistent__card");
    assert.equal(await page.locator("a.site-header__suche[href='/hilfe-finden/']").count(), 1, "Knopf „Anbieter suchen“ im Kopf");
    const input = await suche(page, "Haushaltshilfe in Solingen");
    assert.equal(await input.getAttribute("aria-expanded"), "true");
    const optionen = page.locator(".assistent__suche [role=option]");
    assert.ok(await optionen.count() <= 7, "höchstens 5 Anliegen + 2 Ratgeber");
    assert.match(await optionen.first().textContent(), /Haushaltshilfe.*in Solingen/);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}suche-vorschlaege-${name}.png` });
    await page.keyboard.press("ArrowDown");
    assert.equal(await input.getAttribute("aria-activedescendant"), await optionen.first().getAttribute("id"));
    await page.keyboard.press("Enter");
    await page.waitForURL(/anliegen=haushaltshilfe/);
    assert.match(page.url(), /stadt=Solingen/, "Ort aus dem Freitext übernommen");
    assert.equal((await page.textContent(".assistent__progress")).trim(), "Schritt 2 von 3");
    assert.equal(await fokusText(page), "Welche Unterstützung brauchen Sie im Haushalt?", "Fokus auf Frage");
    const karte = page.locator(".assistent__choices .choice-card").first();
    assert.ok((await karte.boundingBox()).height >= 56, "Auswahlfläche mind. 56 px");
    await page.getByRole("button", { name: "Putzen und Reinigung" }).click();
    await warteAufListe(page);
    assert.equal(await fokusText(page), "„Haushaltshilfe“ in Solingen");
    const soll1 = erwartet(["02.01"], "Solingen");
    assert.ok(soll1.length > 0, "Testvoraussetzung: Haushaltshilfe in Solingen vorhanden");
    assert.equal((await page.textContent(".assistent__trefferzahl")).trim(), `${soll1.length} Anbieter gefunden.`);
    assert.deepEqual(await angezeigteIds(page), soll1, "nur Reinigung 02.01, Stadt vor Einzugsgebiet");
    assert.ok(await page.locator(".assistent__liste .anbieter-karte__anruf").count() > 0, "Anrufen-Knopf");
    assert.doesNotMatch(await page.locator(".assistent__liste").textContent(), /★|Sterne/);
    assert.equal(await page.locator(".assistent__liste img").count(), 0, "keine Logos");
    await keinHorizontalesScrollen(page, name + " Liste");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}ergebnisliste-${name}.png`, fullPage: name === "desktop" });

    // Notizzettel: Häufigkeit (Notizfrage) ändert die Liste nicht
    await page.getByRole("button", { name: "Notizzettel erstellen" }).click();
    assert.match(await page.textContent(".assistent__progress"), /Für Ihr Gespräch · Frage 1 von 2/);
    assert.match(await page.textContent(".assistent__frage-art"), /ändert die Liste nicht/);
    await page.getByRole("button", { name: "Einmal pro Woche" }).click();
    await page.getByRole("button", { name: "Überspringen" }).click();
    await warteAufListe(page);
    const zettel = page.locator("[data-notizzettel]");
    assert.match(await zettel.textContent(), /Häufigkeit: Einmal pro Woche/);
    assert.match(await zettel.textContent(), /Unterstützung: Putzen und Reinigung/);
    assert.match(await zettel.locator("a[href^='mailto:']").getAttribute("href"), /Einmal%20pro%20Woche/);
    assert.match(await zettel.locator("a[href^='https://wa.me/']").getAttribute("href"), /text=/);
    assert.deepEqual(await angezeigteIds(page), soll1, "Liste unverändert nach Notizfragen");
    // Druck: nur der Zettel
    await zettel.getByRole("button", { name: "Drucken" }).evaluate(() => { window.print = () => {}; });
    await zettel.getByRole("button", { name: "Drucken" }).click();
    await page.emulateMedia({ media: "print" });
    assert.equal(await page.locator(".site-header").isVisible(), false);
    assert.equal(await page.locator(".assistent__liste").isVisible(), false);
    assert.equal(await zettel.isVisible(), true);
    await page.emulateMedia({ media: "screen" });
    await page.evaluate(() => document.body.classList.remove("is-printing-notiz"));
    // Zurück-Knopf des Browsers: wieder bei der letzten Notizfrage
    await page.goBack();
    await page.waitForFunction(() => /Frage 2 von 2/.test(document.querySelector(".assistent__progress").textContent));
    await page.goForward();
    await warteAufListe(page);

    // ---- Szenario 2: Treppenlift kurvige Treppe (Klick auf Vorschlag) ----
    await page.goto(BASE + "/hilfe-finden/");
    await page.waitForSelector(".assistent__card");
    await suche(page, "Treppenlift kurvige Treppe");
    await page.locator(".assistent__suche [role=option]").first().click();
    await page.waitForURL(/anliegen=treppenlift/);
    assert.match(page.url(), /n-treppe-form=kurvig/, "Treppenart aus dem Freitext vorbelegt");
    assert.equal((await page.textContent(".assistent__progress")).trim(), "Schritt 2 von 2");
    await page.getByRole("button", { name: "Wuppertal", exact: true }).click();
    await warteAufListe(page);
    const soll2 = erwartet(["01.02"], "Wuppertal");
    const ist2 = await angezeigteIds(page);
    assert.deepEqual(ist2, soll2, "streng 01.02: kein allgemeiner Handwerker");
    if (soll2.length) {
      await page.getByRole("button", { name: "Notizzettel erstellen" }).click();
      assert.equal(await fokusText(page), "Liegt die Treppe innen oder außen?", "Treppenart schon beantwortet");
      await page.getByRole("button", { name: "Im Haus" }).click();
      await page.getByRole("button", { name: "Zwei Etagen" }).click();
      await warteAufListe(page);
      assert.match(await page.textContent("[data-notizzettel]"), /Treppe: Mit Kurve oder Wendel[\s\S]*Lage der Treppe: Im Haus[\s\S]*Etagen: Zwei Etagen/);
    } else {
      assert.match(await page.textContent(".assistent__trefferzahl"), /noch keinen Anbieter/);
      assert.ok(await page.getByRole("link", { name: /Bei uns melden/ }).count() === 1);
    }
    // Null-Treffer mit verwandten Anliegen (echte Zahlen): Wesel hat keine Einträge
    await page.goto(BASE + "/hilfe-finden/?anliegen=treppenlift&stadt=Wesel");
    await warteAufListe(page);
    assert.match(await page.textContent(".assistent__trefferzahl"), /In Wesel haben wir zu „Treppenlift“ noch keinen Anbieter/);
    assert.equal(await page.locator(".assistent__liste .anbieter-karte").count(), 0);
    for (const hint of await page.locator(".assistent__verwandt .choice-card__hint").allTextContents()) {
      assert.match(hint, /^[1-9]\d* Anbieter in Wesel$|Ratgeber/, "verwandte Anliegen nur mit echten Zahlen > 0");
    }
    const melden = page.getByRole("link", { name: /Bei uns melden/ });
    assert.match(await melden.getAttribute("href"), /^\/\?thema=wohnen-haus-handwerk&wer=selbst&ort=Wesel&leistung=treppenlift-und-hilfsmittel&notiz=.*#anfrage$/);
    await keinHorizontalesScrollen(page, name + " Null-Treffer");

    // ---- Szenario 3: Pflegedienst für Mutter in Düsseldorf → Bei uns melden ----
    await page.goto(BASE + "/hilfe-finden/");
    await page.waitForSelector(".assistent__card");
    await suche(page, "Pflegedienst für Mutter in Düsseldorf");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForURL(/anliegen=pflegedienst/);
    assert.match(page.url(), /person=angehoerige/);
    assert.match(decodeURIComponent(page.url()), /stadt=Düsseldorf/);
    assert.match(await page.textContent(".assistent__auswahl"), /Für: einen Angehörigen/);
    await page.getByRole("button", { name: "Pflege zu Hause durch einen Pflegedienst" }).click();
    await warteAufListe(page);
    const soll3 = erwartet(["03.01"], "Düsseldorf");
    assert.deepEqual(await angezeigteIds(page), soll3);
    const href3 = await page.getByRole("link", { name: /Bei uns melden/ }).getAttribute("href");
    assert.match(href3, /thema=pflege-betreuung&wer=angehoerige&ort=D%C3%BCsseldorf&leistung=ambulante-pflege-durch-einen-pflegedienst/);
    await page.getByRole("link", { name: /Bei uns melden/ }).click();
    await page.waitForURL(/#anfrage$/);
    await page.waitForFunction(() => document.getElementById("f-thema").value === "pflege-betreuung");
    assert.equal(await page.isChecked("#f-wer-angehoerige"), true);
    assert.equal(await page.inputValue("#f-ort"), "Düsseldorf");
    assert.match(await page.inputValue("#f-beschreibung"), /Anliegen: Pflegedienst und Pflege[\s\S]*Art der Pflege: Pflege zu Hause/);
    assert.equal(await page.isChecked("input[name=leistungen][value='ambulante-pflege-durch-einen-pflegedienst']"), true);

    // ---- Szenario 4: dusche statt badewanne / Zuschüsse Badumbau ----
    await page.goto(BASE + "/hilfe-finden/");
    await page.waitForSelector(".assistent__card");
    await suche(page, "dusche statt badewanne");
    assert.match(await page.locator(".assistent__suche [role=option]").first().textContent(), /^Badewanne durch Dusche ersetzen/);
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".assistent__suche [role=listbox]").isHidden(), true, "Escape schließt");
    await suche(page, "Zuschüsse Badumbau");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForURL(/anliegen=bad-zuschuss/);
    assert.match(await fokusText(page), /haben wir einen Ratgeber/);
    assert.equal(await page.locator(".assistent__result a[href='/ratgeber/altersgerechter-umbau/']").count(), 1);
    assert.equal(await page.locator(".anbieter-karte").count(), 0, "kein leere Liste beim Ratgeber-Anliegen");
    assert.equal(await page.getByRole("button", { name: /Badewanne durch Dusche ersetzen/ }).count(), 1, "verwandtes Anliegen");
    // Gruppe Badezimmer: sechs Möglichkeiten
    await page.getByRole("button", { name: "Neu starten" }).click();
    await page.getByRole("button", { name: /Badezimmer umbauen/ }).first().click();
    assert.equal(await page.locator(".assistent__choices .choice-card").count(), 6);

    // Kein Treffer: Hinweis, sechs Themen, Bei uns melden
    await page.getByRole("button", { name: "Neu starten" }).click();
    const inp = page.locator(".assistent__suche input[role=combobox]");
    await inp.fill("xqzvbw");
    await inp.press("Enter");
    await page.getByText("Dazu haben wir nichts gefunden").waitFor();
    assert.equal(await page.locator(".suche__ergebnis .choice-card").count(), 6);
    assert.equal(await page.locator(".suche__ergebnis a", { hasText: "Bei uns melden" }).count(), 1);
    await ctx.close();
  }

  // ---- Startseite: Assistent an derselben Stelle (#assistent), 4 Tipps bis zum Anruf ----
  {
    const { ctx, page } = await neueSeite("start", { width: 390, height: 844 });
    await page.goto(BASE + "/");
    const app = page.locator("#assistent [data-assistent-app]");
    await app.locator(".assistent__card").waitFor();
    await app.getByRole("button", { name: /^Haushaltshilfe/ }).click();             // 1
    await app.getByRole("button", { name: "Putzen und Reinigung" }).click();        // 2
    await app.getByRole("button", { name: "Wuppertal", exact: true }).click();      // 3
    await warteAufListe(page);
    assert.match(page.url(), /\/\?anliegen=haushaltshilfe&stadt=Wuppertal&f-haushalt-art=reinigung#assistent$/);
    assert.ok(erwartet(["02.01"], "Wuppertal").length > 0, "Testvoraussetzung");
    assert.match(await app.locator(".anbieter-karte__anruf").first().getAttribute("href"), /^tel:/);       // 4
    // Mein Alltag weiterhin erreichbar
    await app.getByRole("button", { name: "Neu starten" }).click();
    await app.getByRole("button", { name: /Alltag besser organisieren/ }).click();
    await app.getByRole("button", { name: /Wohnungs-Check/ }).click();
    assert.equal(await app.getByRole("link", { name: "Wohnungs-Check öffnen" }).getAttribute("href"), "/mein-alltag/wohnungs-check/");
    await ctx.close();
  }

  // ---- 320 px ohne horizontales Scrollen ----
  {
    const { ctx, page } = await neueSeite("320", { width: 320, height: 640 });
    await page.goto(BASE + "/hilfe-finden/");
    await page.waitForSelector(".assistent__card");
    await keinHorizontalesScrollen(page, "320 Start");
    await suche(page, "treppenlift");
    await keinHorizontalesScrollen(page, "320 Vorschläge");
    await page.goto(BASE + "/hilfe-finden/?anliegen=pflegedienst&stadt=Hilden&f-pflege-art=zuhause");
    await warteAufListe(page);
    await keinHorizontalesScrollen(page, "320 Liste");
    await ctx.close();
  }

  // ---- Ohne JavaScript: Themen und Formular als Links ----
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE + "/hilfe-finden/");
    const nojs = page.locator(".assistent__nojs");
    assert.equal(await nojs.isVisible(), true);
    assert.equal(await nojs.locator("a[href^='/themen/']").count(), 6);
    assert.equal(await nojs.locator("a[href='/#anfrage']").count(), 1);
    assert.equal(await page.locator("[data-assistent-app]").isVisible(), false);
    await ctx.close();
  }

  await browser.close();
  assert.deepEqual(fehler, [], "Konsolenfehler: " + fehler.join("; "));
  console.log("OK: Assistent + Suche – 4 Szenarien, Notizzettel, Null-Treffer, Startseite, 320 px, ohne JS, mobil + desktop");
})().catch((e) => { console.error(e); process.exit(1); });
