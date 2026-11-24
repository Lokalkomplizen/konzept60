/* ==========================================================================
   Konzept 60+ – api.js: alle Wege, auf denen Formulardaten die Seite verlassen
   --------------------------------------------------------------------------
   1. Versandwege der Schritt-Formulare (AKTIV): E-Mail (mailto:) und WhatsApp (wa.me).
      Die Seite baut nur einen Link mit vorbefülltem Text; gesendet wird erst, wenn die
      Person im E-Mail-Programm bzw. in WhatsApp selbst auf „Senden“ tippt. Die Empfänger
      stehen NUR hier in KONTAKT. Genutzt von assets/js/schritte.js (Versand-Schritt).
      Projektregel: Die WhatsApp-Nummer erscheint nie als sichtbarer Text auf der Seite.

   2. Späteres Backend (im Prototyp SIMULIERT, derzeit nicht aufgerufen):
   !!! Hier wird NICHTS gesendet. Kein fetch, kein XMLHttpRequest, kein Beacon,
   !!! keine Speicherung (kein Storage, keine Cookies).
   Späteres Ziel (WordPress): REST-Endpunkt
       POST /wp-json/wirhelfen/v1/anfragen        (Content-Type: application/json)
   - legt einen Beitrag im Custom Post Type `anfrage` an (nicht öffentlich: public => false)
   - Status-Feld: neu → in Bearbeitung → vermittelt → abgeschlossen (Start: neu)
   - Taxonomien: themenbereich (aus payload.thema), region (aus payload.ort, falls bekannt)
   - Eingangsbestätigung per wp_mail() an payload.email – nur wenn eine E-Mail angegeben wurde
   - Antwort 201 { "ok": true }  |  Fehler 4xx/5xx { "ok": false, "fehler": "…" }
   - Serverseitig: Nonce/Spam-Schutz, Sanitizing, Zeitstempel der Einwilligung
   Die Nutzlast-Schemata unten (AnfragePayload, VeranstaltungPayload) beschreiben die Felder,
   die main.js heute für die Zusammenfassung im Versand-Schritt sammelt. Beim Umstieg auf
   das Backend wird nur diese Datei angepasst (fetch statt Simulation).
   ========================================================================== */
(function (root) {
  'use strict';

  /**
   * Nutzlast einer Anfrage (Schema für POST /wp-json/wirhelfen/v1/anfragen).
   *
   * @typedef {Object} Rueckruf
   * @property {('vormittags'|'nachmittags'|'eigen')} fenster  Gewünschtes Zeitfenster
   *           (vormittags = 9–12 Uhr, nachmittags = 13–17 Uhr, eigen = Freitext)
   * @property {string|null} eigenes  Freitext bei fenster = "eigen" (z. B. „dienstags ab 15 Uhr“), sonst null
   *
   * @typedef {Object} AnfragePayload
   * @property {('selbst'|'angehoerige')} wer  Für wen wird Hilfe gesucht
   * @property {string} thema                  Themen-Slug aus data/themen.json oder "sonstiges"
   * @property {string[]} leistungen           Gewählte Leistungen (Slugs), evtl. leer
   * @property {string} beschreibung           Freitext, mindestens 20 Zeichen
   * @property {string} plz                    Genau 5 Ziffern
   * @property {string} ort                    Ort/Stadt
   * @property {string} vorname
   * @property {string} nachname
   * @property {string} telefon                Leer, wenn nicht angegeben (Telefon ODER E-Mail ist Pflicht)
   * @property {string} email                  Leer, wenn nicht angegeben
   * @property {Rueckruf|null} rueckruf        Nur gesetzt, wenn eine Telefonnummer vorliegt und ein Wunsch gewählt wurde
   * @property {boolean} einwilligung_bearbeitung  Pflicht: Einwilligung zur Bearbeitung (immer true)
   * @property {boolean} newsletter            Freiwillig, getrennte Einwilligung (Double-Opt-in serverseitig)
   *
   * @typedef {Object} AnfrageAntwort
   * @property {boolean} ok
   * @property {boolean} simuliert             Im Prototyp immer true
   */

  var SIMULATIONSDAUER_MS = 900;

  /* ---- 1. Versandwege ------------------------------------------------------ */

  // Platzhalter, vor Livegang ersetzen! Einzige Stelle für die Empfänger.
  // whatsapp: internationale Nummer nur aus Ziffern, ohne +, ohne führende 0 (Format für wa.me).
  var KONTAKT = Object.freeze({ email: 'hallo@example.org', whatsapp: '490000000000' });

  /**
   * Baut die Versand-Links mit vorbefülltem Betreff und Text.
   * @param {string} betreff
   * @param {string} text  Zeilen mit \n getrennt
   * @returns {{email: string, whatsapp: string}}
   */
  function versandLinks(betreff, text) {
    betreff = String(betreff || '');
    text = String(text || '');
    // mailto (RFC 6068): Zeilenumbrüche als CRLF, alles mit encodeURIComponent kodiert
    var mailText = text.replace(/\r?\n/g, '\r\n');
    return {
      email: 'mailto:' + KONTAKT.email + '?subject=' + encodeURIComponent(betreff) + '&body=' + encodeURIComponent(mailText),
      whatsapp: 'https://wa.me/' + KONTAKT.whatsapp + '?text=' + encodeURIComponent(betreff + '\n\n' + text)
    };
  }

  /* ---- 2. Späteres Backend (simuliert) ------------------------------------- */

  /**
   * Sendet eine Anfrage (SIMULIERT – es verlässt keine Information das Gerät).
   * @param {AnfragePayload} payload
   * @returns {Promise<AnfrageAntwort>} löst nach kurzer Zeit auf; lehnt nur bei ungültiger Nutzlast ab
   */
  function sendeAnfrage(payload) {
    return new Promise(function (resolve, reject) {
      if (!payload || typeof payload !== 'object') {
        reject(new Error('Ungültige Anfrage'));
        return;
      }
      // SIMULATION: kein Netzwerkzugriff. Später: fetch('/wp-json/wirhelfen/v1/anfragen', { method: 'POST', … })
      root.setTimeout(function () {
        resolve({ ok: true, simuliert: true });
      }, SIMULATIONSDAUER_MS);
    });
  }

  /**
   * Nutzlast einer Veranstaltungsmeldung (Formular /veranstaltungen/melden/).
   * Felder wie data/veranstaltungen.json; Veranstalter-Kontakt wird NICHT veröffentlicht.
   *
   * Späteres Ziel (WordPress): POST /wp-json/wirhelfen/v1/veranstaltungen
   * - legt einen Beitrag im CPT `veranstaltung` mit post_status "pending" an (Prüfung im Backend)
   * - Meta: datum, beginn, ende, ort, veranstalter, kosten, anmeldung, barrierefrei, link,
   *         kontakt_name, kontakt_email, kontakt_telefon (nur intern), Einwilligung + Zeitstempel
   * - Taxonomien: kategorie (aus payload.kategorie), region (aus payload.stadt)
   * - Antwort 201 { "ok": true } | 4xx/5xx { "ok": false, "fehler": "…" }; Nonce/Honigtopf serverseitig
   *
   * @typedef {Object} VeranstaltungPayload
   * @property {string} titel
   * @property {string} datum           ISO (JJJJ-MM-TT)
   * @property {string} beginn          HH:MM
   * @property {string} ende            HH:MM oder leer
   * @property {string} stadt           Eine der Städte aus data/regionen.json
   * @property {string} ort             Veranstaltungsort + Straße
   * @property {string} kategorie       Bewegung|Kultur|Bildung|Begegnung|Digital|Gesundheit
   * @property {string} beschreibung    Höchstens 400 Zeichen (wird redaktionell zu `kurztext`)
   * @property {string} kosten          Freitext oder leer
   * @property {('ja'|'nein'|'')} anmeldung
   * @property {('ja'|'nein'|'unbekannt')} barrierefrei
   * @property {string} link            URL oder leer
   * @property {string} veranstalter    Wird veröffentlicht
   * @property {string} ansprechperson  Nicht veröffentlicht
   * @property {string} email           Nicht veröffentlicht
   * @property {string} telefon         Nicht veröffentlicht, evtl. leer
   * @property {boolean} einwilligung   Pflicht (Berechtigung + Datenschutz), immer true
   */

  /**
   * Meldet eine Veranstaltung (SIMULIERT – es verlässt keine Information das Gerät).
   * @param {VeranstaltungPayload} payload
   * @returns {Promise<AnfrageAntwort>}
   */
  function veranstaltungMelden(payload) {
    return new Promise(function (resolve, reject) {
      if (!payload || typeof payload !== 'object') {
        reject(new Error('Ungültige Meldung'));
        return;
      }
      // SIMULATION: kein Netzwerkzugriff. Später: fetch('/wp-json/wirhelfen/v1/veranstaltungen', { method: 'POST', … })
      root.setTimeout(function () {
        resolve({ ok: true, simuliert: true });
      }, SIMULATIONSDAUER_MS);
    });
  }

  root.WirHelfenAPI = Object.freeze({
    versandLinks: versandLinks,
    sendeAnfrage: sendeAnfrage,
    veranstaltungMelden: veranstaltungMelden
  });
  // Für Unit-Tests unter Node (node --test tests/)
  if (typeof module !== 'undefined' && module.exports) module.exports = root.WirHelfenAPI;
})(typeof window !== 'undefined' ? window : globalThis);
