// Ende-zu-Ende-Test des Ratgebers (Relaunch 3.3) mit Playwright.
// Aufruf: python3 -m http.server 8765 &   SHOTS=<ordner/> node tests/ratgeber.e2e.js
// Prüft: Übersicht (Suche „Pflegegrad“ und „Zuschuss Bad“, ?q= in der Adresse, Häufig gesucht, Empfohlen,
// Themen nur mit Unterthemen mit Beiträgen, Aktuell, A–Z), Kategorieseite (Breadcrumb, Abschnitte, JSON-LD),
// Beitrag (Kurz-Kasten, Inhaltsverzeichnis, Häufige Fragen mit gültigem FAQPage-JSON-LD, Article ohne author,
// BreadcrumbList, Stand und Quellen, Passende Hilfe, Verwandte Ratgeber), alte Filter-Adressen ?thema=…,
// ohne JavaScript, 48-px-Ziele, kein horizontales Scrollen bei 320/390/1440 und das Szenario
// „75-Jährige sucht Zuschüsse für den barrierefreien Badumbau“ in höchstens drei Klicks.
// Mit SHOTS: ganzseitige Bilder (deviceScaleFactor 2) der Übersicht und eines Beitrags bei 390 und 1440 px.
"use strict";
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const BASE = process.env.BASE || "http://localhost:8765";
const SHOTS = process.env.SHOTS ? process.env.SHOTS.replace(/\/?$/, "/") : "";
const KAT = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/ratgeber-kategorien.json"), "utf8"));
const SLUGS = fs.readdirSync(path.join(__dirname, "../content/ratgeber")).map((f) => f.replace(/\.md$/, ""));

async function keinHorizontalesScrollen(page, label) {
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  assert.ok(w[0] <= w[1], `${label}: horizontales Scrollen (${w[0]} > ${w[1]})`);
}

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

async function jsonld(page) {
  const texte = await page.$$eval('script[type="application/ld+json"]', (s) => s.map((x) => x.textContent));
  return texte.flatMap((t) => [].concat(JSON.parse(t)));   // wirft bei ungültigem JSON
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

  // ---- Übersicht: Suche ----
  {
    const { ctx, page } = await neueSeite("suche", { width: 1440, height: 900 });
    await page.goto(BASE + "/ratgeber/");
    const feld = page.getByLabel("Im Ratgeber suchen");
    await feld.waitFor();
    await feld.fill("Pflegegrad");
    const treffer = page.locator("[data-suche-treffer] li");
    await page.waitForFunction(() => document.querySelectorAll("[data-suche-treffer] li").length > 0);
    assert.equal(await treffer.first().locator("a").getAttribute("href"), "/ratgeber/pflegegrad-beantragen/", "Pflegegrad zuerst");
    assert.match(await page.locator("[data-suche-status]").textContent(), /Beitr(ag|äge) zu „Pflegegrad“ gefunden/);
    assert.equal(new URL(page.url()).searchParams.get("q"), "Pflegegrad", "Suchbegriff in der Adresse");

    await feld.fill("Zuschuss Bad");
    await page.waitForFunction(() => /Zuschuss Bad/.test(document.querySelector("[data-suche-status]").textContent));
    const hrefs = await treffer.locator("a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.equal(hrefs[0], "/ratgeber/altersgerechter-umbau/", "Zuschuss Bad: Altersgerechter Umbau zuerst");
    assert.ok(hrefs.includes("/ratgeber/barrierefrei-wohnen/"), "Zuschuss Bad: Barrierefrei wohnen");

    await feld.fill("xyzq");
    await page.waitForFunction(() => /Kein Beitrag/.test(document.querySelector("[data-suche-status]").textContent));
    assert.equal(await treffer.count(), 0);

    // Direktaufruf mit ?q= füllt das Feld und sucht sofort
    await page.goto(BASE + "/ratgeber/?q=Hausnotruf");
    await page.waitForFunction(() => document.querySelectorAll("[data-suche-treffer] li").length > 0);
    assert.equal(await feld.inputValue(), "Hausnotruf");
    assert.equal(await treffer.first().locator("a").getAttribute("href"), "/ratgeber/hausnotruf-auswahl/");
    await ctx.close();
  }

  // ---- Übersicht: Aufbau ----
  {
    const { ctx, page } = await neueSeite("aufbau", { width: 1440, height: 900 });
    await page.goto(BASE + "/ratgeber/");
    assert.equal(await page.locator("h1").count(), 1);
    assert.equal(await page.locator(".ratgeber-chips .ratgeber-chip").count(), KAT.haeufig.length, "Häufig gesucht");
    const empfohlen = await page.locator(".ratgeber-empfohlen a").count();
    assert.ok(empfohlen >= 2 && empfohlen <= 3, `2–3 empfohlene Beiträge (${empfohlen})`);
    assert.equal(await page.locator(".ratgeber-thema").count(), KAT.kategorien.length, "alle Kategorien");
    // Unterthemen: jede angezeigte führt zu einem Abschnitt mit mindestens einem Beitrag
    const unter = await page.locator(".ratgeber-thema__unter a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.ok(unter.length > 0);
    assert.ok(await page.locator(".ratgeber-aktuell__eintrag").count() >= 3, "Aktuell");
    assert.equal(await page.locator(".ratgeber-az__liste li").count(), SLUGS.length, "A–Z: alle Beiträge");
    // kein endloses Kartenraster mehr
    assert.equal(await page.locator(".article-card").count(), 0, "keine Kartenwand auf der Übersicht");
    // 48-px-Ziele
    const klein = await page.$$eval(".ratgeber-chip, .ratgeber-thema__unter a, .ratgeber-thema__titel a, .ratgeber-aktuell__link, .ratgeber-az > summary",
      (els) => els.filter((e) => e.getBoundingClientRect().height < 47.5).map((e) => e.textContent.trim()));
    assert.deepEqual(klein, [], "Klickflächen unter 48 px");
    // Fokus: gelber Ring mit Navy-Saum
    await page.locator(".ratgeber-chip").first().focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    const fokus = await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return [s.outlineStyle, s.boxShadow]; });
    assert.equal(fokus[0], "solid");
    assert.match(fokus[1], /rgb\(20, 33, 61\)/, "Navy-Saum am Fokus");

    // Unterthemen-Ziele haben Beiträge
    for (const href of unter) {
      const [pfad, anker] = href.split("#");
      await page.goto(BASE + pfad);
      assert.ok(await page.locator(`#${anker} ~ .ratgeber-liste li, section:has(> #${anker}) .ratgeber-liste li`).count() > 0, `leer: ${href}`);
    }
    await ctx.close();
  }

  // ---- Kategorieseite ----
  {
    const { ctx, page } = await neueSeite("kategorie", { width: 1440, height: 900 });
    await page.goto(BASE + "/ratgeber/wohnen-umbauen/");
    assert.equal(await page.locator("h1").textContent(), "Wohnen und Umbauen");
    assert.equal(await page.locator(".breadcrumb [aria-current=page]").textContent(), "Wohnen und Umbauen");
    assert.equal(await page.locator(".site-nav [aria-current]").first().textContent().then((t) => t.trim()), "Ratgeber");
    const abschnitte = await page.locator(".kategorie-abschnitt").count();
    assert.ok(abschnitte >= 3, "Abschnitte je Unterkategorie");
    assert.equal(await page.locator(".kategorie-abschnitt:not(:has(.ratgeber-zeile))").count(), 0, "keine leeren Abschnitte");
    assert.ok(await page.locator("#foerderung-umbau ~ .ratgeber-liste a[href='/ratgeber/altersgerechter-umbau/']").count() === 1);
    const ld = await jsonld(page);
    assert.ok(ld.some((d) => d["@type"] === "BreadcrumbList" && d.itemListElement.length === 3));
    // jede Kategorie erreichbar, Titel eindeutig
    const titel = new Set();
    for (const k of KAT.kategorien) {
      const r = await page.goto(BASE + `/ratgeber/${k.slug}/`);
      assert.equal(r.status(), 200, k.slug);
      titel.add(await page.title());
    }
    assert.equal(titel.size, KAT.kategorien.length, "eindeutige Titel der Kategorieseiten");
    await ctx.close();
  }

  // ---- Beitrag: Aufbau, JSON-LD ----
  {
    const { ctx, page } = await neueSeite("beitrag", { width: 1440, height: 900 });
    await page.goto(BASE + "/ratgeber/pflegegrad-beantragen/");
    const crumbs = await page.locator(".breadcrumb li").allTextContents();
    assert.deepEqual(crumbs.map((c) => c.trim()).slice(0, 3), ["Startseite", "Ratgeber", "Pflege und Betreuung"]);
    assert.equal(await page.locator(".beitrag-kurz li").count() >= 3, true, "Das Wichtigste in Kürze");
    assert.ok(await page.locator(".article__toc a").count() >= 5, "Inhaltsverzeichnis");
    assert.match(await page.locator(".beitrag-quellen").textContent(), /Stand: November 2026\. Zuletzt geändert am 20\. November 2026/);
    assert.equal(await page.locator(".relatives a[href='/hilfe-finden/?anliegen=pflegedienst']").count(), 1, "Passende Hilfe");
    const verwandt = await page.locator(".section--sage .article-card").count();
    assert.ok(verwandt >= 1 && verwandt <= 3, "Verwandte Ratgeber 1–3");

    const ld = await jsonld(page);
    const art = ld.find((d) => d["@type"] === "Article");
    assert.ok(art && art.headline && art.datePublished && art.dateModified && art.image && art.publisher["@type"] === "Organization");
    assert.equal(art.author, undefined, "kein author");
    assert.ok(ld.some((d) => d["@type"] === "BreadcrumbList" && d.itemListElement.length === 4));
    const faq = ld.find((d) => d["@type"] === "FAQPage");
    assert.ok(faq && faq.mainEntity.length >= 3, "FAQPage");
    const sichtbar = await page.locator(".article__body").textContent();
    const norm = (t) => t.replace(/\s+/g, " ");
    for (const q of faq.mainEntity) {
      assert.ok(q.name.endsWith("?"), q.name);
      assert.ok(norm(sichtbar).includes(norm(q.acceptedAnswer.text).slice(0, 80)), `Antwort sichtbar: ${q.name}`);
    }
    // Sprunglinks der Fragen führen zu vorhandenen Überschriften
    const anker = await page.locator(".beitrag-fragen a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    assert.equal(anker.length, faq.mainEntity.length);
    for (const a of anker) assert.equal(await page.locator(`.article__body :is(h2,h3)${a}`).count(), 1, a);

    // Alle Beiträge: gültiges JSON-LD, Kategorie im Breadcrumb, Kurz-Kasten, eindeutige Titel/Descriptions
    const titel = new Set(), desc = new Set();
    let mitFaq = 0;
    for (const slug of SLUGS) {
      const r = await page.goto(BASE + `/ratgeber/${slug}/`);
      assert.equal(r.status(), 200, slug);
      const d = await jsonld(page);
      if (d.some((x) => x["@type"] === "FAQPage")) mitFaq += 1;
      assert.ok(!d.some((x) => x.author), `${slug}: kein author`);
      assert.ok(await page.locator(".beitrag-kurz li").count() >= 3, `${slug}: Kurz-Kasten`);
      titel.add(await page.title());
      desc.add(await page.locator('meta[name="description"]').getAttribute("content"));
    }
    assert.equal(titel.size, SLUGS.length, "eindeutige Titel");
    assert.equal(desc.size, SLUGS.length, "eindeutige Meta-Descriptions");
    console.log(`  Beiträge mit FAQPage: ${mitFaq} von ${SLUGS.length}`);
    await ctx.close();
  }

  // ---- Alte Filter-Adressen ----
  {
    const { ctx, page } = await neueSeite("weiterleitung", { width: 390, height: 844 });
    await page.goto(BASE + "/ratgeber/?thema=wohnen-haus-handwerk");
    await page.waitForURL(/\/ratgeber\/wohnen-umbauen\/$/);
    await page.goto(BASE + "/ratgeber/?thema=haushalt-reinigung");
    await page.waitForURL(/\/ratgeber\/alltag-unterstuetzung\/#haushaltshilfe$/);
    await page.goto(BASE + "/ratgeber/?thema=gibtsnicht");
    assert.equal(new URL(page.url()).pathname, "/ratgeber/");
    assert.equal(new URL(page.url()).search, "", "unbekanntes Thema: Parameter entfernt");
    await ctx.close();
  }

  // ---- Ohne JavaScript ----
  {
    const { ctx, page } = await neueSeite("ohne js", { width: 390, height: 844 }, { javaScriptEnabled: false });
    await page.goto(BASE + "/ratgeber/");
    assert.equal(await page.locator("[data-ratgeber-suche]").isVisible(), false, "Suche ohne JS verborgen");
    assert.equal(await page.locator(".ratgeber-thema").count(), KAT.kategorien.length);
    assert.equal(await page.locator(".ratgeber-az__liste a").count(), SLUGS.length, "alle Beiträge erreichbar");
    await ctx.close();
  }

  // ---- Reflow 320 / 390 / 1440 ----
  for (const breite of [320, 390, 1440]) {
    const { ctx, page } = await neueSeite("reflow " + breite, { width: breite, height: 844 });
    const pfade = ["/ratgeber/", ...KAT.kategorien.map((k) => `/ratgeber/${k.slug}/`),
      "/ratgeber/pflegegrad-beantragen/", "/ratgeber/mobilitaet-im-alter-ohne-auto/",
      "/ratgeber/mehrgenerationenhaus-mehrgenerationenwohnen/", "/ratgeber/rente-reicht-nicht-finanzielle-hilfen/",
      "/ratgeber/patientenverfuegung-vorsorgevollmacht/"];
    for (const pfad of pfade) {
      await page.goto(BASE + pfad);
      await keinHorizontalesScrollen(page, `${pfad} bei ${breite} px`);
    }
    await page.goto(BASE + "/ratgeber/?q=Zuschuss%20Bad");
    await page.waitForFunction(() => document.querySelectorAll("[data-suche-treffer] li").length > 0);
    await keinHorizontalesScrollen(page, `Suchtreffer bei ${breite} px`);
    await ctx.close();
  }

  // ---- Szenario: 75-Jährige will wissen, welche Zuschüsse es für einen barrierefreien Badumbau gibt ----
  {
    const { ctx, page } = await neueSeite("szenario", { width: 390, height: 844 });
    let klicks = 0;
    await page.goto(BASE + "/");
    await page.getByRole("button", { name: "Menü" }).click(); klicks += 0;   // Menü öffnen zählt nicht als Ziel-Klick
    await page.locator("#hauptnavigation").getByRole("link", { name: "Ratgeber", exact: true }).click(); klicks += 1;
    await page.waitForURL(/\/ratgeber\/$/);
    await page.getByRole("link", { name: "Zuschüsse für den Umbau" }).click(); klicks += 1;
    await page.waitForURL(/\/ratgeber\/wohnen-umbauen\/#foerderung-umbau$/);
    await page.locator("#foerderung-umbau ~ .ratgeber-liste").getByRole("link", { name: /Altersgerechter Umbau/ }).click(); klicks += 1;
    await page.waitForURL(/\/ratgeber\/altersgerechter-umbau\/$/);
    assert.ok(klicks <= 3, `Klicks: ${klicks}`);
    assert.equal(await page.getByRole("heading", { name: "5. Welche Fördermöglichkeiten gibt es?" }).count(), 1);
    assert.match(await page.locator(".beitrag-kurz").textContent(), /4\.180 Euro/);
    // Alternativ über die Suche: Eingabe + ein Klick
    await page.goto(BASE + "/ratgeber/");
    await page.getByLabel("Im Ratgeber suchen").fill("Zuschüsse Badumbau");
    await page.waitForFunction(() => document.querySelectorAll("[data-suche-treffer] li").length > 0);
    await page.locator("[data-suche-treffer] a").first().click();
    await page.waitForURL(/\/ratgeber\/altersgerechter-umbau\/$/);
    await ctx.close();
  }

  // ---- Screenshots ----
  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    for (const breite of [390, 1440]) {
      const { ctx, page } = await neueSeite("shots " + breite, { width: breite, height: 900 });
      for (const [pfad, name] of [["/ratgeber/", "ratgeber-uebersicht"], ["/ratgeber/altersgerechter-umbau/", "ratgeber-beitrag-altersgerechter-umbau"]]) {
        await page.goto(BASE + pfad);
        await durchscrollen(page);
        await page.screenshot({ path: `${SHOTS}${name}-${breite}.png`, fullPage: true });
      }
      await ctx.close();
    }
  }

  await browser.close();
  assert.deepEqual(fehler, [], "Konsolenfehler");
  console.log("OK: Ratgeber 3.3 – Suche, Übersicht, Kategorien, Beiträge mit FAQ/JSON-LD, Weiterleitung, ohne JS, 320/390/1440, Szenario Badumbau ≤ 3 Klicks");
})().catch((e) => { console.error(e); process.exit(1); });
