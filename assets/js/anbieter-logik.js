/* ==========================================================================
   Konzept 60+ – anbieter-logik.js: reine Funktionen für die Anbieter-Trefferliste
   (Filter, Sortierung, Telefon-Link, Textfassung). Kein DOM, kein Netzwerk, kein Storage –
   deshalb unter Node testbar (tests/anbieter-logik.test.js). Benutzt von assets/js/anbieter.js.
   → WordPress: Filter/Sortierung später serverseitig (WP_Query mit tax_query themenbereich + region).
   ========================================================================== */
(function (root) {
  'use strict';

  var HINWEIS_QUELLE = 'Angaben aus öffentlich zugänglichen Quellen, Stand November 2026, ohne Gewähr.';
  var HINWEIS_PREISE = 'Bitte vereinbaren Sie Preise und Termine direkt mit dem Anbieter.';

  /* Ort vergleichbar machen: Groß/Klein, Leerraum, „Mülheim an der Ruhr“ = „Mülheim a. d. Ruhr“,
     „Düsseldorf-Mitte“/„Düsseldorf (Stadtmitte)“ -> „düsseldorf“ nur bei Klammer, sonst unverändert. */
  function normalisiereOrt(text) {
    var s = String(text || '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
    s = s.replace(/^mülheim( a\.? ?d\.? ruhr| an der ruhr)?$/, 'mülheim an der ruhr');
    s = s.replace(/^monheim( am rhein)?$/, 'monheim am rhein');
    return s;
  }

  /* 0 = Stadt gleich, 1 = Ort im Einzugsgebiet, -1 = kein Treffer; ohne Ort: 2 (alle gleichrangig) */
  function ortsGruppe(anbieter, ort) {
    var o = normalisiereOrt(ort);
    if (!o) return 2;
    if (normalisiereOrt(anbieter.stadt) === o) return 0;
    var gebiet = anbieter.einzugsgebiet || [];
    for (var i = 0; i < gebiet.length; i++) {
      if (normalisiereOrt(gebiet[i]) === o) return 1;
    }
    return -1;
  }

  /* Kategorie-IDs der gewählten Leistungen (Slugs) vereinigen */
  function leistungsIds(leistungen, leistungsMap) {
    var ids = {};
    (leistungen || []).forEach(function (slug) {
      ((leistungsMap || {})[slug] || []).forEach(function (id) { ids[id] = true; });
    });
    return ids;
  }

  /* Treffer: Thema gleich UND (Stadt gleich ODER im Einzugsgebiet).
     Reihenfolge: 1. Stadt-Treffer vor Einzugsgebiet, 2. zur Leistung passende Kategorie zuerst,
     3. Name alphabetisch. Ergebnis: Array von Kopien mit _gruppe und _passt. */
  function filtere(liste, auswahl, leistungsMap) {
    var ids = leistungsIds(auswahl.leistungen, leistungsMap);
    var hatLeistung = Object.keys(ids).length > 0;
    return (liste || [])
      .filter(function (a) { return a.thema === auswahl.thema; })
      .map(function (a) {
        var kopie = Object.assign({}, a);
        kopie._gruppe = ortsGruppe(a, auswahl.ort);
        kopie._passt = hatLeistung && Boolean(ids[a.kategorie_id]);
        return kopie;
      })
      .filter(function (a) { return a._gruppe !== -1; })
      .sort(function (x, y) {
        if (x._gruppe !== y._gruppe) return x._gruppe - y._gruppe;
        if (x._passt !== y._passt) return x._passt ? -1 : 1;
        return String(x.name).localeCompare(String(y.name), 'de', { sensitivity: 'base' });
      });
  }

  /* Erste Telefonnummer als tel:-Link (Leerzeichen, Bindestriche, Schrägstriche entfernt); '' wenn keine */
  function telefonErste(telefon) {
    var erste = String(telefon || '').split(/[\/;,]| oder /)[0];
    return erste.trim();
  }
  function telLink(telefon) {
    var ziffern = telefonErste(telefon).replace(/[^+0-9]/g, '');
    return ziffern.replace(/\+/g, '').length >= 5 ? 'tel:' + ziffern : '';
  }

  /* Link zur Google-Maps-Suche (keine Bewertungen/Sterne kopieren – nur verlinken) */
  function googleMapsLink(a) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(String(a.name || '') + ' ' + String(a.stadt || ''));
  }

  function websiteAnzeige(url) {
    return String(url || '').replace(/^https?:\/\//i, '').replace(/\/$/, '');
  }

  /* Textfassung aller gewählten Kontakte (Teilen, E-Mail, WhatsApp, Kopieren) */
  function kontaktText(liste) {
    var teile = ['Passende Anbieter', HINWEIS_QUELLE, ''];
    liste.forEach(function (a, i) {
      teile.push((i + 1) + '. ' + a.name);
      if (a.adresse) teile.push('Adresse: ' + a.adresse);
      if (a.telefon) teile.push('Telefon: ' + a.telefon);
      if (a.email) teile.push('E-Mail: ' + a.email);
      if (a.website) teile.push('Website: ' + a.website);
      if (a.angebotsform) teile.push('Angebot: ' + a.angebotsform);
      teile.push('');
    });
    teile.push(HINWEIS_PREISE);
    return teile.join('\n');
  }

  function mailtoLink(betreff, text) {
    return 'mailto:?subject=' + encodeURIComponent(betreff) + '&body=' + encodeURIComponent(text.replace(/\n/g, '\r\n'));
  }
  function whatsappLink(text) {
    return 'https://wa.me/?text=' + encodeURIComponent(text);
  }

  var api = {
    HINWEIS_QUELLE: HINWEIS_QUELLE,
    HINWEIS_PREISE: HINWEIS_PREISE,
    normalisiereOrt: normalisiereOrt,
    ortsGruppe: ortsGruppe,
    filtere: filtere,
    telefonErste: telefonErste,
    telLink: telLink,
    googleMapsLink: googleMapsLink,
    websiteAnzeige: websiteAnzeige,
    kontaktText: kontaktText,
    mailtoLink: mailtoLink,
    whatsappLink: whatsappLink
  };
  root.AnbieterLogik = Object.freeze(api);
  if (typeof module !== 'undefined' && module.exports) module.exports = root.AnbieterLogik;
})(typeof window !== 'undefined' ? window : globalThis);
