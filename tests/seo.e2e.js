// SEO-, Datenschutz- und Reflow-Prüfung aller Seiten (Relaunch 3.4) mit Playwright.
// Aufruf: python3 -m http.server 8765 &   SHOTS=<ordner/> node tests/seo.e2e.js
// Lädt jede Seite aus sitemap.xml (plus 404.html) und prüft:
// - genau eine sichtbare h1 (verborgene Zustands-h1 des Pflegegradrechners zählt nicht), keine übersprungenen
//   Überschriftenebenen im Ausgangszustand
// - <title> und Meta-Description vorhanden und über alle Seiten eindeutig; Canonical = eigene Adresse; Open Graph
// - JSON-LD parsebar; BreadcrumbList überall außer Start/404; Organization (ohne Telefon/Adresse) auf Start;
//   Service mit allen Start-Städten auf den sechs Themenseiten
// - keine Requests an fremde Hosts (Fonts, CDNs, Tracking), keine Konsolenfehler
// - kein waagerechtes Scrollen bei 320 px
// - robots.txt verweist auf die Sitemap, jede <url> hat lastmod
// Mit SHOTS: Startseite 390/1440 und eine Themenseite 390 als ganzseitige Bilder (deviceScaleFactor 2).
"use strict";
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const BASE = process.env.BASE || "http://localhost:8765";
const SHOTS = process.env.SHOTS ? process.env.SHOTS.replace(/\/?$/, "/") : "";
const ROOT = path.join(__dirname, "..");
const STAEDTE = ["Düsseldorf", "Wuppertal", "Hilden", "Remscheid", "Solingen", "Langenfeld", "Haan", "Wesel"];

const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
const eintraege = [...sitemap.matchAll(/<url><loc>(https?:\/\/[^/<]+)(\/[^<]*)<\/loc><lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod><\/url>/g)];
const SITE = eintraege.length ? eintraege[0][1] : "";
const PFADE = eintraege.map((m) => m[2]);

async function durchscrollen(page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 400) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo(0, 0);
  });
  // nur dargestellte Bilder: lazy-Bilder in ausgeblendeten Bereichen (z. B. Rückfall ohne JS) laden nie
  await page.waitForFunction(() => [...document.images].filter((i) => i.getClientRects().length).every((i) => i.complete));
}

(async () => {
  // Sitemap und robots.txt
  assert.equal((sitemap.match(/<url>/g) || []).length, PFADE.length, "jede <url> der Sitemap hat loc und lastmod");
  assert.ok(PFADE.length >= 47, `Sitemap: ${PFADE.length} Seiten`);
  assert.ok(!PFADE.includes("/404.html"), "404 steht nicht in der Sitemap");
  const robots = fs.readFileSync(path.join(ROOT, "robots.txt"), "utf8");
  assert.ok(robots.includes(`Sitemap: ${SITE}/sitemap.xml`), "robots.txt verweist auf die Sitemap");

  const browser = await chromium.launch();
  const fehler = [];
  const titel = new Map();
  const beschreibungen = new Map();
  const ctx = await browser.newContext({ viewport: { width: 320, height: 800 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  let aktuell = "";
  page.on("console", (m) => { if (m.type() === "error") fehler.push(`${aktuell}: Konsole: ${m.text()}`); });
  page.on("pageerror", (e) => fehler.push(`${aktuell}: ${e.message}`));
  page.on("request", (r) => {
    const url = r.url();
    if (!url.startsWith(BASE) && !url.startsWith("data:")) fehler.push(`${aktuell}: externer Request ${url}`);
  });

  for (const pfad of [...PFADE, "/404.html"]) {
    aktuell = pfad;
    const antwort = await page.goto(BASE + pfad, { waitUntil: "load" });
    assert.equal(antwort.status(), 200, `${pfad}: Status ${antwort.status()}`);
    await durchscrollen(page);   // lädt auch alle lazy-Bilder (externe Requests würden auffallen)

    const d = await page.evaluate(() => {
      const sichtbar = (el) => !el.closest("[hidden]") && getComputedStyle(el).display !== "none";
      const hs = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].filter(sichtbar).map((h) => +h.tagName[1]);
      const meta = (sel) => (document.querySelector(sel) || {}).content || "";
      return {
        h1: [...document.querySelectorAll("h1")].filter(sichtbar).length,
        hs,
        title: document.title.trim(),
        description: meta('meta[name="description"]').trim(),
        canonical: (document.querySelector('link[rel="canonical"]') || {}).href || "",
        ogTitle: meta('meta[property="og:title"]'),
        ogUrl: meta('meta[property="og:url"]'),
        ogImage: meta('meta[property="og:image"]'),
        robots: meta('meta[name="robots"]'),
        jsonld: [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent),
        scroll: [document.documentElement.scrollWidth, document.documentElement.clientWidth],
      };
    });

    assert.equal(d.h1, 1, `${pfad}: ${d.h1} sichtbare h1`);
    d.hs.reduce((vorher, ebene) => {
      assert.ok(ebene <= vorher + 1, `${pfad}: Überschrift springt von h${vorher} auf h${ebene}`);
      return ebene;
    }, 1);
    assert.ok(d.scroll[0] <= d.scroll[1], `${pfad}: waagerechtes Scrollen bei 320 px (${d.scroll[0]} > ${d.scroll[1]})`);
    assert.ok(d.title, `${pfad}: <title> leer`);
    assert.ok(d.description.length >= (pfad === "/404.html" ? 20 : 50), `${pfad}: Meta-Description fehlt oder ist zu kurz`);

    const daten = d.jsonld.flatMap((t) => {
      let j;
      assert.doesNotThrow(() => { j = JSON.parse(t); }, `${pfad}: JSON-LD nicht parsebar`);
      return Array.isArray(j) ? j : [j];
    });
    const typen = daten.map((x) => x["@type"]);

    if (pfad === "/404.html") {
      assert.equal(d.robots, "noindex", "404: noindex");
      continue;
    }
    for (const [map, wert, art] of [[titel, d.title, "Titel"], [beschreibungen, d.description, "Description"]]) {
      assert.ok(!map.has(wert), `${pfad}: ${art} doppelt mit ${map.get(wert)}`);
      map.set(wert, pfad);
    }
    assert.equal(d.canonical, SITE + pfad, `${pfad}: Canonical`);
    assert.equal(d.ogUrl, SITE + pfad, `${pfad}: og:url`);
    assert.ok(d.ogTitle && d.ogImage.startsWith(SITE + "/assets/img/"), `${pfad}: Open Graph unvollständig`);

    if (pfad === "/") {
      const org = daten.find((x) => x["@type"] === "Organization");
      assert.ok(org, "Start: Organization");
      assert.ok(!("telephone" in org) && !("address" in org), "Organization ohne Telefon und Adresse");
      assert.deepEqual(org.areaServed.map((c) => c.name), STAEDTE, "Organization: areaServed");
      assert.ok(!typen.includes("BreadcrumbList"), "Start ohne BreadcrumbList");
    } else {
      const bc = daten.find((x) => x["@type"] === "BreadcrumbList");
      assert.ok(bc, `${pfad}: BreadcrumbList fehlt`);
      const stufen = bc.itemListElement;
      assert.equal(stufen[0].item, SITE + "/", `${pfad}: Breadcrumb beginnt nicht bei der Startseite`);
      assert.equal(stufen[stufen.length - 1].item, SITE + pfad, `${pfad}: Breadcrumb endet nicht bei der Seite`);
    }
    if (/^\/themen\/[^/]+\/$/.test(pfad)) {
      const service = daten.find((x) => x["@type"] === "Service");
      assert.ok(service, `${pfad}: Service fehlt`);
      assert.deepEqual(service.areaServed.map((c) => c.name), STAEDTE, `${pfad}: areaServed`);
      assert.equal(service.provider["@type"], "Organization");
    }
    if (/^\/ratgeber\/[^/]+\/$/.test(pfad) && typen.includes("Article")) {
      const a = daten.find((x) => x["@type"] === "Article");
      assert.ok(a.headline && a.dateModified && a.publisher, `${pfad}: Article unvollständig`);
    }
  }
  await ctx.close();

  if (SHOTS) {
    fs.mkdirSync(SHOTS, { recursive: true });
    for (const [pfad, breite, datei] of [["/", 390, "startseite-390.png"], ["/", 1440, "startseite-1440.png"],
      ["/themen/pflege-betreuung/", 390, "themenseite-pflege-390.png"]]) {
      const c = await browser.newContext({ viewport: { width: breite, height: 900 }, deviceScaleFactor: 2, reducedMotion: "reduce" });
      const p = await c.newPage();
      await p.goto(BASE + pfad, { waitUntil: "networkidle" });
      await durchscrollen(p);
      await p.screenshot({ path: SHOTS + datei, fullPage: true });
      await c.close();
    }
  }

  await browser.close();
  if (fehler.length) {
    console.error(fehler.join("\n"));
    process.exit(1);
  }
  console.log(`OK: SEO – ${PFADE.length} Seiten + 404: je eine h1, Überschriften ohne Sprung, Titel/Description eindeutig, ` +
    "Canonical/OG, JSON-LD (Organization, Service, BreadcrumbList), nur same-origin, keine Konsolenfehler, 320 px ohne Querscrollen");
})().catch((e) => { console.error(e); process.exit(1); });
