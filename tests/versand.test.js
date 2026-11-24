// Unit-Test der Versand-Links (assets/js/api.js): mailto und wa.me korrekt kodiert.
"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const API = require("../assets/js/api.js");

test("mailto: Betreff und Text vollständig kodiert, Zeilenumbrüche als CRLF", () => {
  const { email } = API.versandLinks("Anfrage über Konzept 60+: Pflege & Betreuung", "Zeile 1\nÄrger? #1 a=b&c");
  assert.ok(email.startsWith("mailto:"));
  assert.ok(!/[ \n#]/.test(email.slice(7)), "keine unkodierten Zeichen");
  const [, subject] = email.match(/subject=([^&]*)/);
  const [, body] = email.match(/body=([^&]*)/);
  assert.equal(decodeURIComponent(subject), "Anfrage über Konzept 60+: Pflege & Betreuung");
  assert.equal(decodeURIComponent(body), "Zeile 1\r\nÄrger? #1 a=b&c");
});

test("wa.me: Nummer nur aus Ziffern, Text mit Betreff vorangestellt", () => {
  const { whatsapp } = API.versandLinks("Betreff", "Text & mehr\nZeile 2");
  const url = new URL(whatsapp);
  assert.equal(url.hostname, "wa.me");
  assert.match(url.pathname, /^\/\d{8,15}$/);
  assert.equal(url.searchParams.get("text"), "Betreff\n\nText & mehr\nZeile 2");
});
