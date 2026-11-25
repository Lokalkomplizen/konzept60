// Ende-zu-Ende-Test der Startseite (Relaunch 3.2, docs/relaunch/startseite-ia.md) mit Playwright.
// Aufruf: python3 -m http.server 8765 &   SHOTS=<ordner/> node tests/startseite.e2e.js
// Prüft: kein horizontales Scrollen bei 320/390/768/1440 (Startseite, /anfrage/, /so-funktioniert-es/),
// Aufbau A–F (h1, 7 Chips, 6 Themen, Rückfall-Kasten, 6 Ratgeber, Vertrauen), Chips und Hero-Suche starten
// den Assistenten auf /hilfe-finden/, alte Adressen (/#anfrage, /?thema=…#anfrage, /#assistent,
// /#angehoerige) leiten um und füllen vor, Handy-Leiste fehlt auf /hilfe-finden/ und verdeckt nichts,
// ohne JavaScript bleibt die Suche ein normales Formular. Mit SHOTS: ganzseitige Bilder bei 390 und 1440.
"use strict";
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const BASE = process.env.BASE || "http://localhost:8765";
const SHOTS = process.env.SHOTS ? process.env.SHOTS.replace(/\/?$/, "/") : "";

async function keinHorizontalesScrollen(page, label) {
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(w[0] <= w[1], `${label}: horizontales Scrollen (${w[0]} > ${w[1]})`);
}

// Einmal durchscrollen, damit Bilder mit loading="lazy" geladen sind (für ganzseitige Bilder)
async function durchscrollen(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
}

(async () => {
  const browser = await chromium.launch();
  const fehler = [];
  const neueSeite = async (name, vp, extra = {}) => {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, reducedMotion: "reduce", ...extra });
    const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") fehler.push(`${name}: ${m.text()}`); });
    page.on("pageerror", (e) => fehler.push(`${name}: ${e.message}`));
    return { ctx, page };
  };

  // ---- Reflow: 320 / 390 / 768 / 1440 ohne horizontales Scrollen ----
  for (const breite of [320, 390, 768, 1440]) {
    const { ctx, page } = await neueSeite("reflow " + breite, { width: breite, height: 844 });
    for (const pfad of ["/", "/anfrage/", "/so-funktioniert-es/", "/hilfe-finden/"]) {
      await page.goto(BASE + pfad);
      await page.waitForLoadState("load");
      await keinHorizontalesScrollen(page, `${pfad} bei ${breite} px`);
    }
    // Startseite: Vorschläge der Hero-Suche offen, ebenfalls ohne Überlauf
    await page.goto(BASE + "/");
    await page.locator(".hero-suche input[role=combobox]").fill("treppe");
    await page.locator(".hero-suche [role=listbox]:not([hidden]) [role=option]").first().waitFor();
    await keinHorizontalesScrollen(page, `Vorschläge bei ${breite} px`);
    await ctx.close();
  }

  // ---- Aufbau A–F ----
  {
    const { ctx, page } = await neueSeite("aufbau", { width: 1440, height: 900 });
    await page.goto(BASE + "/");
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal((await page.textContent("h1")).replace(/\s+/g, " ").trim(), "Hilfe finden. Einfach und kostenlos.");
    assert.equal(await page.locator(".hero-chips a").count(), 7, "7 Chips „Häufig gesucht“");
    for (const href of await page.locator(".hero-chips a").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
      assert.match(href, /^\/hilfe-finden\/\?anliegen=[a-z-]+/);
    }
    assert.deepEqual(await page.locator(".hero__vertrauen li").allTextContents(), ["kostenlos", "unverbindlich", "regional"]);
    assert.equal(await page.locator(".themen-start > li").count(), 6, "6 Themen");
    for (const n of await page.locator(".thema-start__links").evaluateAll((uls) => uls.map((u) => u.children.length))) {
      assert.ok(n >= 3 && n <= 4, "3–4 Unterthemen je Thema: " + n);
    }
    // Unterthemen-Links zeigen auf vorhandene Sprungmarken der Themenseite
    const ziel = await page.locator(".thema-start__links a").first().getAttribute("href");
    assert.match(ziel, /^\/themen\/[a-z-]+\/#[a-z0-9-]+$/);
    const [pfadT, anker] = ziel.split("#");
    await page.goto(BASE + pfadT);
    assert.equal(await page.locator("#" + anker).count(), 1, "Sprungmarke vorhanden: " + ziel);
    await page.goto(BASE + "/");
    assert.equal(await page.locator(".ablauf__schritte > li").count(), 3);
    const rueck = page.locator(".rueckfall");
    assert.match(await rueck.textContent(), /Sie müssen nicht wissen, wer Ihnen helfen kann\. Dafür sind wir da\./);
    assert.equal(await rueck.getByRole("link", { name: "Bei uns melden" }).getAttribute("href"), "/anfrage/");
    assert.equal(await page.locator(".ratgeber-start > li").count(), 6, "6 Ratgeber");
    assert.equal(await page.locator(".werkzeug-kachel").count(), 4, "4 Werkzeug-Kacheln");
    assert.ok(await page.locator(".vertrauen > li").count() >= 4, "Vertrauensaussagen");
    assert.equal(await page.locator("#fuer-anbieter a").getAttribute("href"), "/fuer-anbieter/#registrierung");
    // Keine Umkreissuche
    assert.doesNotMatch(await page.textContent("main"), /Umkreis|Radius|\d+\s*km\b/);
    // Navigation: Hilfe finden · Ratgeber · Mein Alltag · So funktioniert es, Knopf „Anbieter suchen“
    const nav = await page.locator(".site-nav__list > li > a").allTextContents();
    assert.deepEqual(nav.map((t) => t.trim()), ["Hilfe finden", "Ratgeber", "Mein Alltag", "So funktioniert es"]);
    assert.match(await page.locator(".site-header__suche").textContent(), /Anbieter suchen/);
    assert.equal(await page.locator("footer a[href='/fuer-anbieter/']").count() >= 1, true, "Für Anbieter im Footer");
    await ctx.close();
  }

  // ---- Chips starten den Assistenten ----
  {
    const { ctx, page } = await neueSeite("chips", { width: 390, height: 844 });
    await page.goto(BASE + "/");
    await page.locator(".hero-chips").getByRole("link", { name: "Treppenlift", exact: true }).click();
    await page.waitForURL(/\/hilfe-finden\/\?anliegen=treppenlift$/);
    await page.locator("#assistent .assistent__card").waitFor();
    assert.match(await page.textContent("#assistent .assistent__auswahl"), /Treppenlift/);
    await page.goBack();
    await page.locator(".hero-chips").getByRole("link", { name: "Hilfe am Computer" }).click();
    await page.waitForURL(/anliegen=smartphone-computer&f-digital-art=einzeln&n-geraet=computer$/);
    await page.locator("#assistent .assistent__card").waitFor();
    await ctx.close();
  }

  // ---- Hero-Suche: Vorschlag per Tastatur und Freitext ----
  {
    const { ctx, page } = await neueSeite("suche", { width: 1440, height: 900 });
    await page.goto(BASE + "/");
    const input = page.locator(".hero-suche input[role=combobox]");
    await input.fill("Pflegedienst für Mutter in Düsseldorf");
    await page.locator(".hero-suche [role=listbox]:not([hidden]) [role=option]").first().waitFor();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/hilfe-finden\/\?.*anliegen=pflegedienst/);
    assert.match(page.url(), /person=angehoerige/);
    assert.match(decodeURIComponent(page.url()), /stadt=Düsseldorf/);
    await page.locator("#assistent .assistent__card").waitFor();
    // Freitext ohne Auswahl: Absenden führt zur Trefferseite des Assistenten
    await page.goto(BASE + "/");
    await input.fill("xqzvbw");
    await input.press("Enter");
    await page.waitForURL(/\/hilfe-finden\/\?q=xqzvbw$/);
    await page.getByText("Dazu haben wir nichts gefunden").waitFor();
    await ctx.close();
  }

  // ---- Ohne JavaScript: Suche ist ein normales GET-Formular nach /hilfe-finden/ ----
  {
    const ctx = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE + "/");
    const form = page.locator("form[data-einstieg-form]");
    assert.equal(await form.getAttribute("action"), "/hilfe-finden/");
    assert.equal(await form.getAttribute("method"), "get");
    assert.equal(await page.locator("#hero-suche-feld").getAttribute("name"), "q");
    assert.equal(await page.locator(".hero-chips a").count(), 7);
    // ohne JS keine Umleitung, aber #anfrage führt zum Rückfall-Kasten mit Link auf /anfrage/
    await page.goto(BASE + "/#anfrage");
    assert.equal(new URL(page.url()).pathname, "/");
    assert.equal(await page.locator("#anfrage a[href='/anfrage/']").count(), 1);
    await ctx.close();
  }

  // ---- Alte Adressen leiten um ----
  {
    const { ctx, page } = await neueSeite("weiterleitung", { width: 390, height: 844 });
    await page.goto(BASE + "/#anfrage");
    await page.waitForURL(BASE + "/anfrage/");
    await page.locator("#anfrage-formular").waitFor();

    await page.goto(BASE + "/?thema=pflege-betreuung&wer=angehoerige&ort=Hilden#anfrage");
    // main.js füllt vor und räumt danach den Abfrageteil weg (history.replaceState)
    await page.waitForURL(/\/anfrage\/(\?thema=pflege-betreuung&wer=angehoerige&ort=Hilden)?$/);
    await page.waitForFunction(() => document.getElementById("f-thema").value === "pflege-betreuung");
    assert.equal(await page.isChecked("#f-wer-angehoerige"), true);
    assert.equal(await page.inputValue("#f-ort"), "Hilden");

    await page.goto(BASE + "/#assistent");
    await page.waitForURL(BASE + "/hilfe-finden/");
    await page.locator("#assistent .assistent__card").waitFor();

    await page.goto(BASE + "/?anliegen=treppenlift&stadt=Wesel#assistent");
    await page.waitForURL(/\/hilfe-finden\/\?anliegen=treppenlift&stadt=Wesel/);

    await page.goto(BASE + "/#so-funktionierts");
    await page.waitForURL(BASE + "/so-funktioniert-es/");
    await page.goto(BASE + "/#angehoerige");
    await page.waitForURL(BASE + "/so-funktioniert-es/#angehoerige");
    assert.equal(await page.locator("#angehoerige").count(), 1);

    // Startseite ohne alte Anker bleibt, wo sie ist
    await page.goto(BASE + "/#themen");
    assert.equal(new URL(page.url()).pathname, "/");
    await ctx.close();
  }

  // ---- Handy-Leiste: nicht auf /hilfe-finden/, verdeckt nichts ----
  {
    const { ctx, page } = await neueSeite("leiste", { width: 390, height: 844 });
    await page.goto(BASE + "/hilfe-finden/");
    assert.equal(await page.locator(".leiste").count(), 0, "keine Leiste auf /hilfe-finden/");

    await page.goto(BASE + "/ratgeber/");
    const leiste = page.locator(".leiste");
    assert.equal(await leiste.isVisible(), true, "Leiste auf Inhaltsseiten");
    assert.equal(await leiste.getByRole("link", { name: /Anbieter suchen/ }).getAttribute("href"), "/hilfe-finden/");
    // Ganz nach unten: das letzte Element des Footers liegt oberhalb der Leiste
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const lage = await page.evaluate(() => {
      const links = [...document.querySelectorAll("footer a")];
      const letzter = links[links.length - 1].getBoundingClientRect();
      return { unten: letzter.bottom, leisteOben: document.querySelector(".leiste").getBoundingClientRect().top };
    });
    assert.ok(lage.unten <= lage.leisteOben, `Leiste verdeckt den Footer (${lage.unten} > ${lage.leisteOben})`);

    // Startseite: Leiste verborgen, solange die Hero-Suche sichtbar ist
    await page.goto(BASE + "/");
    await page.waitForFunction(() => document.querySelector(".leiste").classList.contains("is-verborgen"));
    await page.evaluate(() => document.getElementById("vertrauen").scrollIntoView());
    await page.waitForFunction(() => !document.querySelector(".leiste").classList.contains("is-verborgen"));
    // ab 48em keine Leiste
    await page.setViewportSize({ width: 1024, height: 800 });
    assert.equal(await page.locator(".leiste").isVisible(), false, "keine Leiste am Desktop");
    await ctx.close();
  }

  // ---- Screenshots: ganze Startseite bei 390 und 1440 ----
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    for (const breite of [390, 1440]) {
      const { ctx, page } = await neueSeite("shot " + breite, { width: breite, height: 900 });
      for (const [pfad, name] of [["/", "startseite"], ["/so-funktioniert-es/", "so-funktioniert-es"], ["/anfrage/", "anfrage"]]) {
        await page.goto(BASE + pfad);
        await durchscrollen(page);
        await page.screenshot({ path: `${SHOTS}${name}-${breite}.png`, fullPage: true });
      }
      await ctx.close();
    }
  }

  await browser.close();
  assert.deepEqual(fehler, [], "Konsolenfehler: " + fehler.join("; "));
  console.log("OK: Startseite – Reflow 320/390/768/1440, Aufbau A–F, Chips, Hero-Suche, ohne JS, Weiterleitungen, Leiste" + (SHOTS ? ", Screenshots" : ""));
})().catch((e) => { console.error(e); process.exit(1); });
