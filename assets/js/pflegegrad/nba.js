/*
 * Wir helfen – NBA-Bewertungslogik (Pflegegradrechner)
 *
 * Reine Rechenfunktionen ohne DOM, ohne Netzwerk, ohne Speicherung.
 * Die Regeln stehen NICHT im Code, sondern in data/pflegegrad/nba-*.json
 * (Anlage 1 und 2 zu § 15 SGB XI). Der Code setzt nur die dort
 * beschriebene Mechanik um:
 *   1. Einzelpunkte je Kriterium (Anlage 1)
 *   2. Modul 5: Häufigkeiten → Punkte (Anlage 1, Modul 5)
 *   3. Summe je Modul → Stufe → gewichtete Punkte (Anlage 2)
 *   4. Modul 2/3: nur der höhere gewichtete Wert zählt (§ 15 Abs. 3)
 *   5. Gesamtpunkte → Pflegegrad (§ 15 Abs. 3)
 *
 * Rundung: Gesetz und Anlagen nennen keine Rundungsregel. Alle Rechnungen
 * laufen exakt (ganzzahlig in Hilfseinheiten), es wird nicht gerundet.
 *
 * Läuft im Browser (window.WirHelfenNBA) und in Node (require) für Tests.
 * WordPress: Datei unverändert per wp_enqueue_script einbinden.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.WirHelfenNBA = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ---------------------------------------------------------------------
  // Hilfen
  // ---------------------------------------------------------------------
  function zahl(v) {
    var n = Number(v);
    if (!isFinite(n) || n < 0) return 0;
    return n;
  }

  /** Index der Stufe (0 = keine … 4 = schwerste) anhand der Summengrenzen. */
  function stufeAusSumme(summe, grenzen) {
    var stufe = 0;
    for (var i = 0; i < grenzen.length; i++) {
      if (summe >= grenzen[i]) stufe = i;
    }
    return stufe;
  }

  // ---------------------------------------------------------------------
  // Modul 5 – Häufigkeiten
  // Exakte Rechnung in der Einheit "pro 210 Tage" (kgV von 1, 7, 30),
  // damit z. B. 1× wöchentlich = 30 und 1× täglich = 210 ganzzahlig sind.
  // ---------------------------------------------------------------------
  var EINHEIT_TAG = 210;
  var EINHEIT_WOCHE = 30; // 210 / 7
  var EINHEIT_MONAT = 7; // 210 / 30

  function haeufigkeitEinheiten(h) {
    h = h || {};
    return zahl(h.tag) * EINHEIT_TAG + zahl(h.woche) * EINHEIT_WOCHE + zahl(h.monat) * EINHEIT_MONAT;
  }

  function grenzeErfuellt(einheiten, g) {
    if ("min_pro_tag" in g) return einheiten >= g.min_pro_tag * EINHEIT_TAG;
    if ("ueber_pro_tag" in g) return einheiten > g.ueber_pro_tag * EINHEIT_TAG;
    if ("min_pro_woche" in g) return einheiten >= g.min_pro_woche * EINHEIT_WOCHE;
    throw new Error("Unbekannte Grenze in Modul 5: " + JSON.stringify(g));
  }

  /** 5.1–5.7 bzw. 5.8–5.11: Häufigkeiten aller Teilkriterien addieren, dann Punktgrenze. */
  function punkteHaeufigkeitGruppe(kriterium, antworten) {
    var summe = 0;
    kriterium.teile.forEach(function (teil) {
      summe += haeufigkeitEinheiten(antworten[teil[0]]);
    });
    var punkte = 0;
    kriterium.punktgrenzen.forEach(function (g) {
      if (grenzeErfuellt(summe, g)) punkte = g.punkte;
    });
    return { punkte: punkte, proTag: summe / EINHEIT_TAG };
  }

  /** 5.12–5.15: gewichtete Häufigkeiten (in Zehnteln, um 3 × 4,3 exakt zu rechnen). */
  function punkteGewichteteBesuche(kriterium, antworten) {
    var zehntel = 0;
    kriterium.teile.forEach(function (teil) {
      var id = teil[0];
      var faktoren = teil[2];
      var a = antworten[id] || {};
      if (faktoren.taeglich && zahl(a.tag) > 0) {
        zehntel += Math.round(faktoren.taeglich * 10);
        return; // täglich: fester Wert, Wochen-/Monatsangaben entfallen
      }
      if (faktoren.woche) zehntel += zahl(a.woche) * Math.round(faktoren.woche * 10);
      if (faktoren.monat) zehntel += zahl(a.monat) * Math.round(faktoren.monat * 10);
    });
    var punkte = 0;
    kriterium.punktgrenzen.forEach(function (g) {
      if (zehntel >= Math.round(g.ab * 10)) punkte = g.punkte;
    });
    return { punkte: punkte, wert: zehntel / 10 };
  }

  // ---------------------------------------------------------------------
  // Einzelkriterien
  // ---------------------------------------------------------------------
  function punkteStufenKriterium(kriterium, antworten, bedingungen) {
    if (kriterium.nur_wenn && !bedingungen[kriterium.nur_wenn]) return 0;
    var wert = antworten[kriterium.id];
    if (wert === undefined || wert === null || wert === "") return 0;
    var idx = kriterium.stufen.indexOf(wert);
    if (idx < 0) throw new Error("Ungültige Antwort '" + wert + "' für Kriterium " + kriterium.id);
    return kriterium.punkte[idx];
  }

  function punkteKriterium(kriterium, antworten, bedingungen) {
    switch (kriterium.typ) {
      case "stufen":
        return { punkte: punkteStufenKriterium(kriterium, antworten, bedingungen) };
      case "haeufigkeit_gruppe":
        return punkteHaeufigkeitGruppe(kriterium, antworten);
      case "gewichtete_besuche":
        return punkteGewichteteBesuche(kriterium, antworten);
      default:
        throw new Error("Unbekannter Kriteriumstyp: " + kriterium.typ);
    }
  }

  // ---------------------------------------------------------------------
  // Gesamtberechnung
  // ---------------------------------------------------------------------
  /**
   * @param {object} regeln     Inhalt von data/pflegegrad/nba-*.json
   * @param {object} antworten  { "1.1": "selbstaendig", "5.1": {tag: 3}, … }
   * @param {object} [bedingungen] { harn_relevant: bool, stuhl_relevant: bool }
   * @returns {object} Ergebnis mit Modulen, Gesamtpunkten, Pflegegrad
   */
  function berechne(regeln, antworten, bedingungen) {
    antworten = antworten || {};
    bedingungen = bedingungen || {};

    var module = regeln.module.map(function (modul) {
      var details = {};
      var summe = 0;
      modul.kriterien.forEach(function (k) {
        var r = punkteKriterium(k, antworten, bedingungen);
        details[k.id] = r;
        summe += r.punkte;
      });
      var stufe = stufeAusSumme(summe, modul.summengrenzen);
      return {
        nr: modul.nr,
        titel: modul.titel,
        summe: summe,
        stufe: stufe,
        stufeText: regeln.stufen[stufe],
        gewichtet: modul.gewichtete_punkte[stufe],
        maxGewichtet: modul.gewichtete_punkte[modul.gewichtete_punkte.length - 1],
        zaehlt: true,
        details: details
      };
    });

    // § 15 Abs. 3: Modul 2 und 3 – nur der höhere gewichtete Wert zählt.
    var m2 = module[1];
    var m3 = module[2];
    if (m3.gewichtet > m2.gewichtet) {
      m2.zaehlt = false;
    } else {
      m3.zaehlt = false;
    }

    // Exakte Addition in Hundertsteln (3,75 / 11,25 sind binär nicht exakt).
    var hundertstel = 0;
    module.forEach(function (m) {
      if (m.zaehlt) hundertstel += Math.round(m.gewichtet * 100);
    });
    var gesamt = hundertstel / 100;

    return {
      regelwerk: regeln.id,
      module: module,
      gesamtpunkte: gesamt,
      pflegegrad: pflegegradAusPunkten(regeln.pflegegrade, gesamt)
    };
  }

  /** Pflegegrad anhand einer Grenzliste [{grad, ab}] (aufsteigend). */
  function pflegegradAusPunkten(grenzen, punkte) {
    var cent = Math.round(punkte * 100);
    var grad = 0;
    grenzen.forEach(function (g) {
      if (cent >= Math.round(g.ab * 100)) grad = g.grad;
    });
    return grad;
  }

  return {
    berechne: berechne,
    pflegegradAusPunkten: pflegegradAusPunkten,
    stufeAusSumme: stufeAusSumme,
    _intern: { haeufigkeitEinheiten: haeufigkeitEinheiten }
  };
});
