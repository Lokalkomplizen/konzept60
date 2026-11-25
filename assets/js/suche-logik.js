/* ==========================================================================
   Konzept 60+ – suche-logik.js: reine Funktionen der Freitextsuche „Was suchen Sie?“
   Abgleich im Browser gegen die Begriffe des Anliegen-Katalogs (data/anliegen.json), Ratgeber-Titel
   und Themen. Kein DOM, kein Netzwerk, kein Storage, keine Protokollierung, keine KI –
   deshalb unter Node testbar (tests/suche-logik.test.js). Benutzt von assets/js/assistent.js.
   Regeln (Konzept Abschnitt 6):
   - Kleinschreibung, ä/ae, ö/oe, ü/ue, ß/ss, Bindestriche und Satzzeichen wie Leerzeichen
   - Wortstamm: einfaches Abschneiden von -en, -er, -e
   - Tippfehler: Abstand 1 (auch vertauschte Nachbarbuchstaben) bei Wörtern ab 5 Buchstaben
   - Mehrwort-Regeln: Ein Begriff aus mehreren Wörtern („dusche statt badewanne“) zählt stark,
     wenn alle seine Wörter in der Eingabe vorkommen.
   - Ort („in Solingen“) und Personenhinweis („für meine Mutter“) werden erkannt und aus dem
     Abgleich herausgenommen.
   → WordPress: dieselbe Logik als PHP im REST-Endpunkt oder weiter im Browser.
   ========================================================================== */
(function (root) {
  'use strict';

  var STOPP = ('ich du sie er es wir ihr mein meine meinen meiner meinem mir mich uns unser unsere fuer mit und oder ' +
    'der die das den dem des ein eine einen einem einer in im ins zu zum zur an am auf bei beim von vom aus nach ' +
    'suche suchen sucht brauche brauchen braucht benoetige benoetigen hilfe helfen jemand jemanden etwas ' +
    'bitte gibt wer was wie wo welche welcher nicht mehr kein keine noch schon sehr so ist sind bin hat haben ' +
    'kann koennen moechte moechten will wollen soll sollen mal').split(' ');
  var PERSON = ('mutter mama vater papa eltern oma opa grossmutter grossvater schwiegermutter schwiegervater ' +
    'angehoerige angehoerigen angehoeriger mann frau ehemann ehefrau partner partnerin tante onkel').split(' ');
  var STOPP_SET = {};
  STOPP.concat(PERSON).forEach(function (w) { STOPP_SET[w] = true; });
  var PERSON_SET = {};
  PERSON.forEach(function (w) { PERSON_SET[w] = true; });

  function normalisiere(text) {
    return String(text || '').toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[éèê]/g, 'e').replace(/[áàâ]/g, 'a')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /* Wörter ohne Füllwörter (für, mit, meine …) */
  function woerter(text) {
    return normalisiere(text).split(' ').filter(function (w) { return w && !STOPP_SET[w]; });
  }

  function stamm(wort) {
    var w = String(wort || '');
    var endungen = ['en', 'er', 'e'];
    for (var i = 0; i < endungen.length; i++) {
      var e = endungen[i];
      if (w.length - e.length >= 3 && w.slice(-e.length) === e) return w.slice(0, -e.length);
    }
    return w;
  }

  /* Levenshtein-Abstand höchstens 1 (einfügen, löschen, ersetzen) oder zwei vertauschte Nachbarn */
  function abstandHoechstensEins(a, b) {
    if (a === b) return true;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;
    if (la === lb) {
      var diff = [];
      for (var i = 0; i < la; i++) if (a[i] !== b[i]) diff.push(i);
      if (diff.length === 1) return true;
      return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
    }
    var lang = la > lb ? a : b, kurz = la > lb ? b : a;
    var j = 0, fehler = 0;
    for (var k = 0; k < lang.length; k++) {
      if (lang[k] === kurz[j]) j++;
      else if (++fehler > 1) return false;
    }
    return true;
  }

  /* Wie gut passt ein Eingabewort q zu einem Katalogwort z? 3 = gleich/Stamm, 2 = Anfang/Wortteil, 1 = Tippfehler, 0 = nein.
     letztes: das zuletzt getippte Wort darf schon ab 2 Buchstaben als Wortanfang passen. */
  function wortPasst(q, z, letztes) {
    if (!q || !z) return 0;
    if (q === z || stamm(q) === stamm(z)) return 3;
    if (z.indexOf(q) === 0 && (q.length >= 4 || (letztes && q.length >= 2))) return 2;
    if (q.length >= 4 && z.indexOf(q) > 0) return 2;                  // Wortteil: notruf → hausnotruf
    if (z.length >= 5 && q.indexOf(z) !== -1) return 2;              // zusammengesetzt: badumbau → umbau
    if (q.length >= 5 && z.length >= 5 && (abstandHoechstensEins(q, z) || abstandHoechstensEins(stamm(q), stamm(z)))) return 1;
    return 0;
  }

  /* Bewertung eines Katalogtextes (Titel oder Begriff) für die Eingabewörter */
  function bewerteText(qWoerter, text) {
    var p = woerter(text);
    if (!qWoerter.length || !p.length) return 0;
    var summe = 0, getroffen = 0;
    qWoerter.forEach(function (q, i) {
      var best = 0;
      p.forEach(function (z) { best = Math.max(best, wortPasst(q, z, i === qWoerter.length - 1)); });
      if (best) { summe += best * 10; getroffen += 1; }
    });
    if (!getroffen) return 0;
    var abgedeckt = p.every(function (z) {
      return qWoerter.some(function (q, i) { return wortPasst(q, z, i === qWoerter.length - 1) >= 2; });
    });
    var score = summe;
    if (abgedeckt) score += p.length >= 2 ? 30 + 10 * p.length : 10;   // Mehrwort-Regel
    if (getroffen === qWoerter.length) score += 20;
    return score;
  }

  function bewerteEintrag(qWoerter, eintrag) {
    var best = bewerteText(qWoerter, eintrag.titel) + 1; // Titel leicht bevorzugt
    if (best === 1) best = 0;
    (eintrag.begriffe || []).forEach(function (b) { best = Math.max(best, bewerteText(qWoerter, b)); });
    return best;
  }

  /* Ortsschlüssel: Umlaute ohne e (duesseldorf = dusseldorf) */
  function ortSchluessel(text) {
    return normalisiere(text).replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
  }

  /* Erkennt einen bekannten Ort in der Eingabe. Ergebnis: { ort: 'Solingen' | '', rest: 'haushaltshilfe in' } */
  function erkenneOrt(text, orte) {
    var t = ' ' + ortSchluessel(text) + ' ';
    var sortiert = (orte || []).slice().sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < sortiert.length; i++) {
      var k = ortSchluessel(sortiert[i]);
      if (k && t.indexOf(' ' + k + ' ') !== -1) {
        // im Originaltext dieselbe Wortfolge entfernen
        var teile = normalisiere(text).split(' ');
        var n = k.split(' ').length;
        for (var s = 0; s + n <= teile.length; s++) {
          if (ortSchluessel(teile.slice(s, s + n).join(' ')) === k) {
            teile.splice(s, n);
            break;
          }
        }
        return { ort: sortiert[i], rest: teile.join(' ') };
      }
    }
    return { ort: '', rest: normalisiere(text) };
  }

  /* „für meine Mutter“ → 'angehoerige' */
  function erkennePerson(text) {
    return normalisiere(text).split(' ').some(function (w) { return PERSON_SET[w]; }) ? 'angehoerige' : '';
  }

  /* Vorbelegung einer Notizfrage aus der Eingabe („kurvige Treppe“ → kurvig); '' wenn nichts passt */
  function passendeOption(text, optionen) {
    var q = woerter(text);
    for (var i = 0; i < (optionen || []).length; i++) {
      var o = optionen[i];
      var treffer = (o.begriffe || []).some(function (b) {
        var bw = woerter(b);
        return bw.length && bw.every(function (z) { return q.some(function (w) { return wortPasst(w, z, false) === 3; }); });
      });
      if (treffer) return o.id;
    }
    return '';
  }

  function sortiereNachScore(liste) {
    return liste.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return String(a.titel).localeCompare(String(b.titel), 'de');
    });
  }

  /* Hauptfunktion.
     katalog: { anliegen: [{id, titel, begriffe}], gruppen: [{id, titel, begriffe}], ratgeber: [{titel, url}],
                themen: [{slug, titel}], orte: ['Solingen', …] }
     Ergebnis: { treffer: [{art: 'anliegen'|'gruppe', id, titel, score}] (höchstens 5),
                 ratgeber: [...] (höchstens 2), themen: [...] (höchstens 1), ort, person, woerter } */
  function suche(text, katalog, opt) {
    opt = opt || {};
    var o = erkenneOrt(text, katalog.orte);
    var q = woerter(o.rest);
    var leer = { treffer: [], ratgeber: [], themen: [], ort: o.ort, person: erkennePerson(text), woerter: q };
    if (normalisiere(text).replace(/ /g, '').length < (opt.mindestens || 2) || !q.length) return leer;

    var treffer = [];
    (katalog.anliegen || []).forEach(function (a) {
      var s = bewerteEintrag(q, a);
      if (s > 0) treffer.push({ art: 'anliegen', id: a.id, titel: a.titel, score: s });
    });
    (katalog.gruppen || []).forEach(function (g) {
      var s = bewerteEintrag(q, g);
      if (s > 0) treffer.push({ art: 'gruppe', id: g.id, titel: g.titel, score: s });
    });
    sortiereNachScore(treffer);
    // Schwache Treffer (nur Tippfehler-Ähnlichkeit) weglassen, wenn es deutlich bessere gibt
    if (treffer.length && treffer[0].score >= 40) {
      treffer = treffer.filter(function (t) { return t.score >= 20; });
    }

    var ratgeber = [];
    (katalog.ratgeber || []).forEach(function (r) {
      var s = bewerteText(q, r.titel);
      if (s >= 30) ratgeber.push({ art: 'ratgeber', id: r.slug || r.url, titel: r.titel, url: r.url, score: s });
    });
    var themen = [];
    (katalog.themen || []).forEach(function (t) {
      var s = bewerteText(q, t.titel);
      if (s >= 30) themen.push({ art: 'thema', id: t.slug, titel: t.titel, score: s });
    });

    leer.treffer = treffer.slice(0, opt.maxAnliegen || 5);
    leer.ratgeber = sortiereNachScore(ratgeber).slice(0, opt.maxRatgeber || 2);
    leer.themen = sortiereNachScore(themen).slice(0, 1);
    return leer;
  }

  /* Ratgeber-Suche (Relaunch 3.3, /ratgeber/): Volltext über den beim Build erzeugten Index
     (assets/data/ratgeber-suche.json). Je Eingabewort zählt der beste Treffer, gewichtet nach Feld:
     Titel 4, Kategorie/Unterkategorie und deren Suchbegriffe 3, Zwischenüberschriften 2,
     „Das Wichtigste in Kürze“ und Anreißer 1 (Wortvergleich wie oben: Stamm, Wortteil, Tippfehler).
     Treffer = Beiträge mit den meisten erkannten Eingabewörtern (ab drei Wörtern darf eines fehlen), sortiert
     nach Zahl der erkannten Wörter, dann Punkten.
     index: [{slug, titel, url, kategorie, stand, anreisser, ueberschriften[], kurz[], begriffe[]}]
     Ergebnis: { treffer: [{slug, titel, url, kategorie, stand, score}], alleWoerter: bool, woerter } */
  var RATGEBER_FELDER = [['titel', 4], ['begriffe', 3], ['ueberschriften', 2], ['kurz', 1], ['anreisser', 1]];

  function ratgeberWoerter(eintrag) {
    if (eintrag._woerter) return eintrag._woerter;
    var felder = {};
    RATGEBER_FELDER.forEach(function (f) {
      var liste = [];
      [].concat(eintrag[f[0]] || []).forEach(function (t) { liste = liste.concat(woerter(t)); });
      felder[f[0]] = liste;
    });
    try { Object.defineProperty(eintrag, '_woerter', { value: felder }); } catch (e) { /* eingefroren: ohne Cache */ }
    return felder;
  }

  function sucheRatgeber(text, index, opt) {
    opt = opt || {};
    var q = woerter(text);
    var leer = { treffer: [], alleWoerter: false, woerter: q };
    if (normalisiere(text).replace(/ /g, '').length < (opt.mindestens || 2) || !q.length) return leer;
    var bewertet = (index || []).map(function (e) {
      var felder = ratgeberWoerter(e);
      var erkannt = 0, score = 0;
      q.forEach(function (w, i) {
        var best = 0, haeufig = 0;
        RATGEBER_FELDER.forEach(function (f) {
          felder[f[0]].forEach(function (z) {
            var p = wortPasst(w, z, i === q.length - 1);
            if (p) { best = Math.max(best, p * f[1]); if (p >= 2) haeufig += 1; }
          });
        });
        if (best) { erkannt += 1; score += best * 10 + Math.min(haeufig, 10); }
      });
      return { e: e, erkannt: erkannt, score: score };
    });
    var maxErkannt = bewertet.reduce(function (m, b) { return Math.max(m, b.erkannt); }, 0);
    if (!maxErkannt) return leer;
    // Ab drei Suchwörtern (ganze Fragen) darf ein Wort fehlen; Beiträge mit mehr erkannten Wörtern zuerst
    var mindest = Math.max(1, maxErkannt - (q.length >= 3 ? 1 : 0));
    var treffer = bewertet.filter(function (b) { return b.erkannt >= mindest; })
      .sort(function (a, b) {
        return b.erkannt - a.erkannt || b.score - a.score || String(a.e.titel).localeCompare(String(b.e.titel), 'de');
      })
      .slice(0, opt.max || 8)
      .map(function (b) {
        return { slug: b.e.slug, titel: b.e.titel, url: b.e.url, kategorie: b.e.kategorie, stand: b.e.stand, score: b.score };
      });
    return { treffer: treffer, alleWoerter: maxErkannt === q.length, woerter: q };
  }

  var api = {
    sucheRatgeber: sucheRatgeber,
    normalisiere: normalisiere,
    woerter: woerter,
    stamm: stamm,
    abstandHoechstensEins: abstandHoechstensEins,
    wortPasst: wortPasst,
    bewerteText: bewerteText,
    erkenneOrt: erkenneOrt,
    erkennePerson: erkennePerson,
    passendeOption: passendeOption,
    suche: suche
  };
  root.SucheLogik = Object.freeze(api);
  if (typeof module !== 'undefined' && module.exports) module.exports = root.SucheLogik;
})(typeof window !== 'undefined' ? window : globalThis);
