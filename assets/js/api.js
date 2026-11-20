/* ==========================================================================
   Wir helfen – api.js: Schnittstelle zum (späteren) Backend – im Prototyp SIMULIERT
   --------------------------------------------------------------------------
   !!! PROTOTYP: Hier wird NICHTS gesendet. Kein fetch, kein XMLHttpRequest, kein Beacon,
   !!! keine Speicherung (kein Storage, keine Cookies). Die Funktion löst nur nach kurzer
   !!! Zeit auf, damit die Oberfläche ein realistisches „Wird übermittelt …“ zeigen kann.

   Späteres Ziel (WordPress): REST-Endpunkt
       POST /wp-json/wirhelfen/v1/anfragen        (Content-Type: application/json)
   - legt einen Beitrag im Custom Post Type `anfrage` an (nicht öffentlich: public => false)
   - Status-Feld: neu → in Bearbeitung → vermittelt → abgeschlossen (Start: neu)
   - Taxonomien: themenbereich (aus payload.thema), region (aus payload.ort, falls bekannt)
   - Eingangsbestätigung per wp_mail() an payload.email – nur wenn eine E-Mail angegeben wurde
   - Antwort 201 { "ok": true }  |  Fehler 4xx/5xx { "ok": false, "fehler": "…" }
   - Serverseitig: Nonce/Spam-Schutz, Sanitizing, Zeitstempel der Einwilligung
   Das Formular (main.js, 5.) ruft nur WirHelfenAPI.sendeAnfrage(payload) auf – beim
   Umstieg wird ausschließlich diese Datei ersetzt (fetch statt Simulation).
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

  root.WirHelfenAPI = Object.freeze({ sendeAnfrage: sendeAnfrage });
})(window);
