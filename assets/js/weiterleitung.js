/* ==========================================================================
   Konzept 60+ – weiterleitung.js: alte Startseiten-Adressen umleiten (Relaunch 3.2)
   Nur auf der Startseite eingebunden, im <head> und ohne defer, damit die Umleitung vor dem
   ersten Zeichnen passiert. Bis Relaunch 3.1 lagen Anfrageformular, Assistent und „So funktioniert’s“
   auf der Startseite; Lesezeichen, geteilte Links und gedruckte Hinweise sollen weiter funktionieren:
     /#anfrage, /?thema=…#anfrage, /?wer=…, /?ort=… …   → /anfrage/?…        (Vorausfüllung bleibt)
     /#assistent, /?anliegen=…&stadt=…#assistent         → /hilfe-finden/?…   (Zustand des Assistenten)
     /#so-funktionierts, /#angehoerige, /#fuer-anbieter,
     /#drei-wege                                         → /so-funktioniert-es/(#…)
   location.replace: kein zusätzlicher Eintrag im Verlauf. Es wird nichts gespeichert oder gesendet.
   Ohne JavaScript bleibt man auf der Startseite; dort führt „Bei uns melden“ (#anfrage) weiter.
   → WordPress: dieselben Regeln als 301 in template_redirect (Abfrageteil) bzw. dieses Skript (Anker).
   ========================================================================== */
(function () {
  'use strict';
  var l = window.location;
  if (l.pathname !== '/' && l.pathname !== '/index.html') return;

  var params = new URLSearchParams(l.search);
  var FORMULAR = ['thema', 'wer', 'fuer', 'ort', 'region', 'leistung', 'notiz'];
  var ASSISTENT = ['anliegen', 'bereich', 'gruppe', 'ziel', 'werkzeug', 'person', 'stadt', 'notizen', 'q'];
  var hat = function (liste) { return liste.some(function (k) { return params.has(k); }); };
  var assistent = hat(ASSISTENT);
  params.forEach(function (v, k) { if (k.indexOf('f-') === 0 || k.indexOf('n-') === 0) assistent = true; });

  var ziel = null;
  if (l.hash === '#assistent' || assistent) ziel = '/hilfe-finden/' + l.search;
  else if (l.hash === '#anfrage' || hat(FORMULAR)) ziel = '/anfrage/' + l.search;
  else if (l.hash === '#so-funktionierts') ziel = '/so-funktioniert-es/';
  else if (l.hash === '#angehoerige' || l.hash === '#fuer-anbieter' || l.hash === '#drei-wege') ziel = '/so-funktioniert-es/' + l.hash;

  if (ziel) l.replace(ziel);
})();
