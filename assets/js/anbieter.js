/* ==========================================================================
   Konzept 60+ – anbieter.js: „Passende Anbieter in Ihrer Nähe“ (Anfrageformular, Schritt 4)
   --------------------------------------------------------------------------
   - Wird aktiv, sobald schritte.js den Schritt [data-schritt-anbieter] zeigt (Ereignis schritte:wechsel).
   - Lädt die Anbieterdaten erst dann per fetch (nur lesend, gleiche Herkunft, keine Eingaben werden gesendet):
     data-anbieter-url (assets/data/anbieter.json, erzeugt von tools/build.py aus data/anbieter.json).
   - Filter/Sortierung: AnbieterLogik (anbieter-logik.js): Themenbereich + Ort (Ort zuerst, dann Einzugsgebiet),
     zur gewählten Leistung passende Kategorien zuerst. Zunächst 6 Karten, „Weitere anzeigen“ je 6.
   - Mehrfachauswahl (nur im Speicher der Seite, nichts wird gespeichert oder übertragen) →
     Kontaktfenster (<dialog>): Anrufen, E-Mail, Website, Drucken, Weiterleiten.
   - Ohne JS bleibt der Schritt verborgen; das Formular läuft wie bisher.
   → WordPress: Liste aus CPT 'anbieter' (REST), Dialog als Template-Part.
   ========================================================================== */
(function () {
  'use strict';

  var L = window.AnbieterLogik;
  var form = document.getElementById('anfrage-formular');
  var schritt = form && form.querySelector('[data-schritt-anbieter]');
  if (!L || !form || !schritt) return;

  var SEITE = 6;
  var q = function (sel) { return schritt.querySelector(sel); };
  var el = {
    intro: q('[data-anbieter-intro]'),
    quelle: q('[data-anbieter-quelle]'),
    quelleText: q('[data-anbieter-quelle-text]'),
    status: q('[data-anbieter-status]'),
    laedt: q('[data-anbieter-laedt]'),
    liste: q('[data-anbieter-liste]'),
    mehrZeile: q('[data-anbieter-mehr-zeile]'),
    mehr: q('[data-anbieter-mehr]'),
    leer: q('[data-anbieter-leer]'),
    leerText: q('[data-anbieter-leer-text]'),
    aktionen: q('[data-anbieter-aktionen]'),
    zaehler: q('[data-anbieter-zaehler]'),
    fehler: q('[data-anbieter-fehler]'),
    kontakt: q('[data-anbieter-kontakt]'),
    persoenlich: q('[data-anbieter-persoenlich]')
  };
  var url = schritt.getAttribute('data-anbieter-url');
  var seitenname = schritt.getAttribute('data-seitenname') || 'Konzept 60+';

  var daten = null;          // { modus, stand, leistungen, anbieter }
  var ladeFehler = false;
  var treffer = [];          // aktuelle Trefferliste (sortiert)
  var sichtbar = SEITE;
  var gewaehlt = {};         // id -> true (nur im Speicher)
  var schluessel = '';       // Themenbereich|Ort|Leistungen der letzten Darstellung

  function node(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }
  function icon(name) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#' + name);
    svg.appendChild(use);
    return svg;
  }
  function reduced() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ---- Eingaben aus Schritt 1–3 ---- */
  function eingaben() {
    var thema = form.elements.thema ? form.elements.thema.value : '';
    var ort = form.elements.ort ? form.elements.ort.value.trim() : '';
    var leistungen = Array.prototype.filter.call(
      form.querySelectorAll('input[name="leistungen"]:checked'), function (i) { return !i.disabled; })
      .map(function (i) { return i.value; });
    return { thema: thema, ort: ort, leistungen: leistungen };
  }
  function ansage(text) { el.status.textContent = text; }
  function wortAnbieter(n) { return n === 1 ? 'passender Anbieter' : 'passende Anbieter'; }

  function laden() {
    if (daten || ladeFehler) return Promise.resolve();
    if (!url || !window.fetch) { ladeFehler = true; return Promise.resolve(); }
    return window.fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { daten = d; })
      .catch(function () { ladeFehler = true; });
  }

  /* ---- Darstellung ---- */
  function karte(a, index) {
    var li = node('li', 'anbieter-karte-item');
    var label = node('label', 'anbieter-karte');
    var idName = 'anbieter-' + a.id + '-name';
    var idInfo = 'anbieter-' + a.id + '-info';
    var inhalt = node('span', 'anbieter-karte__inhalt');
    var name = node('span', 'anbieter-karte__name', a.name);
    name.id = idName;
    inhalt.appendChild(name);
    var info = node('span', 'anbieter-karte__info');
    info.id = idInfo;
    if (a.schwerpunkt) info.appendChild(node('span', 'anbieter-karte__text', a.schwerpunkt));
    var ort = a._gruppe === 1 ? 'Sitz in ' + a.stadt + ', auch für Ihren Ort tätig' : a.stadt;
    info.appendChild(node('span', 'anbieter-karte__meta', 'Ort: ' + ort));
    if (a.angebotsform) info.appendChild(node('span', 'anbieter-karte__meta', 'Angebot: ' + a.angebotsform));
    if (a._passt) info.appendChild(node('span', 'anbieter-karte__passt', 'Passt zu Ihrer Auswahl'));
    if (a.kassenabrechnung === 'ja') info.appendChild(node('span', 'badge anbieter-karte__kasse', 'Rechnet mit der Pflegekasse ab'));
    inhalt.appendChild(info);
    label.appendChild(inhalt);

    var wahl = node('span', 'anbieter-karte__wahl');
    var box = document.createElement('input');
    box.type = 'checkbox';
    box.setAttribute('data-anbieter-id', a.id);
    box.setAttribute('aria-labelledby', idName);
    box.setAttribute('aria-describedby', idInfo);
    box.checked = Boolean(gewaehlt[a.id]);
    wahl.appendChild(box);
    wahl.appendChild(node('span', 'anbieter-karte__wahl-text', 'Auswählen'));
    label.appendChild(wahl);
    li.appendChild(label);
    return li;
  }

  function zeichneListe(fokusIndex) {
    el.liste.replaceChildren();
    treffer.slice(0, sichtbar).forEach(function (a, i) { el.liste.appendChild(karte(a, i)); });
    el.mehrZeile.hidden = sichtbar >= treffer.length;
    if (!el.mehrZeile.hidden) {
      var rest = treffer.length - sichtbar;
      el.mehr.textContent = 'Weitere anzeigen (' + rest + ' weitere)';
    }
    if (typeof fokusIndex === 'number') {
      var boxen = el.liste.querySelectorAll('input[type="checkbox"]');
      if (boxen[fokusIndex]) boxen[fokusIndex].focus();
    }
  }

  function aktualisiereZaehler() {
    var n = Object.keys(gewaehlt).length;
    el.zaehler.textContent = n === 0 ? 'Noch kein Anbieter ausgewählt' : n + ' ausgewählt';
    el.kontakt.setAttribute('aria-disabled', n === 0 ? 'true' : 'false');
    if (n > 0) el.fehler.textContent = '';
  }

  function zeigeSchritt() {
    var eing = eingaben();
    var neu = [eing.thema, eing.ort, eing.leistungen.join(',')].join('|');
    var themaTitel = form.elements.thema && form.elements.thema.value
      ? form.elements.thema.options[form.elements.thema.selectedIndex].text : '';
    var ortText = eing.ort || 'Ihrer Nähe';
    el.laedt.hidden = true;
    el.fehler.textContent = '';
    el.quelle.hidden = false;

    var quelle = (daten && daten.modus === 'beispiel')
      ? 'Beispieldaten: Namen und Nummern sind erfunden.'
      : L.HINWEIS_QUELLE;
    el.quelleText.textContent = quelle + ' ';
    if (!daten || daten.modus !== 'beispiel') {
      el.quelleText.appendChild(document.createTextNode(L.HINWEIS_PREISE + ' '));
    }
    var link = node('a', '', 'Angaben falsch oder Eintrag entfernen lassen?');
    link.href = '/impressum/';
    el.quelleText.appendChild(link);

    if (ladeFehler || !daten) {
      treffer = [];
    } else {
      treffer = L.filtere(daten.anbieter, eing, daten.leistungen);
    }
    if (neu !== schluessel) {      // Eingaben geändert: Auswahl zurücksetzen, ab Anfang zeigen
      gewaehlt = {};
      sichtbar = SEITE;
      schluessel = neu;
    } else {
      var ids = {};
      treffer.forEach(function (a) { ids[a.id] = true; });
      Object.keys(gewaehlt).forEach(function (id) { if (!ids[id]) delete gewaehlt[id]; });
    }

    var hatListe = treffer.length > 0;
    el.leer.hidden = hatListe;
    el.aktionen.hidden = !hatListe;
    el.liste.hidden = !hatListe;
    if (hatListe) {
      el.intro.textContent = treffer.length + ' ' + wortAnbieter(treffer.length) + ' für „' + themaTitel +
        '“ in ' + ortText + '. Wählen Sie einen oder mehrere aus und lassen Sie sich die Kontaktdaten anzeigen.';
      zeichneListe();
      ansage(treffer.length + ' ' + wortAnbieter(treffer.length) + ' gefunden.');
    } else {
      el.liste.replaceChildren();
      el.mehrZeile.hidden = true;
      el.intro.textContent = '';
      el.leerText.textContent = ladeFehler
        ? 'Die Liste konnte gerade nicht geladen werden. Das ist kein Problem: Schicken Sie uns Ihre Anfrage, dann suchen wir persönlich für Sie.'
        : 'In ' + ortText + (themaTitel ? ' haben wir zu „' + themaTitel + '“' : ' haben wir') +
          ' noch keinen Anbieter in unserer Liste. Das ist kein Problem: Wir suchen persönlich für Sie. Schicken Sie uns einfach Ihre Anfrage.';
      ansage('Keine Anbieter in der Liste. Wir suchen persönlich für Sie.');
    }
    aktualisiereZaehler();
  }

  form.addEventListener('schritte:wechsel', function (event) {
    var aktiv = event.detail.schritt.indexOf(schritt) !== -1;
    if (!aktiv) return;
    el.laedt.hidden = false;
    el.liste.replaceChildren();
    el.leer.hidden = true;
    el.aktionen.hidden = true;
    el.mehrZeile.hidden = true;
    laden().then(zeigeSchritt);
  });

  function zuruecksetzen() { gewaehlt = {}; schluessel = ''; sichtbar = SEITE; aktualisiereZaehler(); }
  form.addEventListener('reset', zuruecksetzen);
  form.addEventListener('schritte:start', zuruecksetzen);

  el.liste.addEventListener('change', function (event) {
    var box = event.target.closest('input[data-anbieter-id]');
    if (!box) return;
    var id = box.getAttribute('data-anbieter-id');
    if (box.checked) gewaehlt[id] = true; else delete gewaehlt[id];
    aktualisiereZaehler();
  });

  el.mehr.addEventListener('click', function () {
    var alt = sichtbar;
    sichtbar += SEITE;
    zeichneListe(alt);
    ansage(Math.min(sichtbar, treffer.length) + ' von ' + treffer.length + ' Anbietern werden angezeigt.');
  });

  el.persoenlich.addEventListener('click', function () {
    form.dispatchEvent(new CustomEvent('schritte:weiter'));
  });

  /* ---- Kontaktfenster (<dialog>) ---- */
  var dialog = null;
  var dialogTeile = null;
  var vorherFokus = null;

  function baueDialog() {
    if (dialog) return;
    dialog = node('dialog', 'kontakt-dialog');
    dialog.setAttribute('aria-labelledby', 'kontakt-dialog-titel');
    var innen = node('div', 'kontakt-dialog__innen');
    var titel = node('h2', 'kontakt-dialog__titel', 'Ihre ausgewählten Kontakte');
    titel.id = 'kontakt-dialog-titel';
    titel.tabIndex = -1;
    var hinweis = node('div', 'kontakt-dialog__hinweis');
    var liste = node('ul', 'kontakt-dialog__liste');
    var aktionen = node('div', 'kontakt-dialog__aktionen no-print');
    var meldung = node('p', 'kontakt-dialog__meldung no-print');
    meldung.setAttribute('role', 'status');
    meldung.setAttribute('aria-live', 'polite');
    var schliessen = node('button', 'btn btn--secondary kontakt-dialog__schliessen no-print', 'Schließen');
    schliessen.type = 'button';
    schliessen.addEventListener('click', function () { dialog.close(); });
    innen.appendChild(titel);
    innen.appendChild(hinweis);
    innen.appendChild(liste);
    innen.appendChild(aktionen);
    innen.appendChild(meldung);
    innen.appendChild(schliessen);
    dialog.appendChild(innen);
    document.body.appendChild(dialog);
    dialogTeile = { titel: titel, hinweis: hinweis, liste: liste, aktionen: aktionen, meldung: meldung };

    dialog.addEventListener('close', function () {
      document.body.classList.remove('is-printing-kontakte');
      if (vorherFokus && document.contains(vorherFokus)) vorherFokus.focus();
    });
    // Klick auf den abgedunkelten Hintergrund schließt ebenfalls
    dialog.addEventListener('click', function (event) { if (event.target === dialog) dialog.close(); });
    window.addEventListener('afterprint', function () { document.body.classList.remove('is-printing-kontakte'); });
  }

  function zeile(beschriftung, inhalt) {
    var p = node('p', 'kontakt__zeile');
    p.appendChild(node('span', 'kontakt__label', beschriftung + ': '));
    if (typeof inhalt === 'string') p.appendChild(document.createTextNode(inhalt));
    else p.appendChild(inhalt);
    return p;
  }

  function kontaktBlock(a) {
    var li = node('li', 'kontakt');
    li.appendChild(node('h3', 'kontakt__name', a.name));
    if (a.angebotsform) li.appendChild(zeile('Angebot', a.angebotsform));
    if (a.adresse) li.appendChild(zeile('Adresse', a.adresse));
    var tel = L.telLink(a.telefon);
    if (a.telefon) {
      li.appendChild(zeile('Telefon', a.telefon));
      if (tel) {
        var anruf = node('a', 'btn btn--primary kontakt__anruf');
        anruf.href = tel;
        anruf.appendChild(icon('icon-phone'));
        anruf.appendChild(document.createTextNode(' Anrufen'));
        var sr = node('span', 'visually-hidden', ': ' + a.name);
        anruf.appendChild(sr);
        li.appendChild(anruf);
      }
    }
    if (a.email) {
      var m = node('a', '', a.email);
      m.href = 'mailto:' + a.email;
      li.appendChild(zeile('E-Mail', m));
    }
    if (a.website) {
      var w = node('a', '', L.websiteAnzeige(a.website));
      w.href = a.website;
      w.target = '_blank';
      w.rel = 'noopener noreferrer';
      w.appendChild(node('span', 'visually-hidden', ' (öffnet in neuem Tab)'));
      li.appendChild(zeile('Website', w));
    }
    if (!a.telefon && !a.email && !a.website) li.appendChild(node('p', '', 'Keine Kontaktdaten hinterlegt.'));
    return li;
  }

  function aktionKnopf(text, iconName, fn) {
    var b = node('button', 'btn btn--secondary');
    b.type = 'button';
    if (iconName) b.appendChild(icon(iconName));
    b.appendChild(document.createTextNode((iconName ? ' ' : '') + text));
    b.addEventListener('click', fn);
    return b;
  }
  function aktionLink(text, iconName, href, extern) {
    var a = node('a', 'btn btn--secondary');
    a.href = href;
    if (extern) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.appendChild(icon(iconName));
    a.appendChild(document.createTextNode(' ' + text));
    return a;
  }

  function meldeDialog(text) { dialogTeile.meldung.textContent = text; }

  function kopiere(text) {
    var fertig = function () { meldeDialog('Der Text wurde kopiert. Sie können ihn jetzt einfügen.'); };
    var misslungen = function () { meldeDialog('Kopieren hat leider nicht geklappt. Bitte markieren Sie den Text selbst.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(fertig, misslungen);
      return;
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    dialog.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    dialog.removeChild(ta);
    if (ok) fertig(); else misslungen();
  }

  function oeffneDialog() {
    baueDialog();
    var auswahl = treffer.filter(function (a) { return gewaehlt[a.id]; });
    var t = dialogTeile;
    t.hinweis.replaceChildren();
    var quelle = (daten && daten.modus === 'beispiel') ? 'Beispieldaten: Namen und Nummern sind erfunden.' : L.HINWEIS_QUELLE;
    t.hinweis.appendChild(node('p', '', quelle));
    var korrektur = node('a', '', 'Angaben falsch oder Eintrag entfernen lassen?');
    korrektur.href = '/impressum/';
    var korrekturZeile = node('p', 'no-print');
    korrekturZeile.appendChild(korrektur);
    t.hinweis.appendChild(korrekturZeile);
    t.hinweis.appendChild(node('p', 'kontakt-dialog__preise', L.HINWEIS_PREISE));
    t.liste.replaceChildren();
    auswahl.forEach(function (a) { t.liste.appendChild(kontaktBlock(a)); });
    t.meldung.textContent = '';
    t.aktionen.replaceChildren();
    var text = L.kontaktText(auswahl);

    t.aktionen.appendChild(aktionKnopf('Drucken', 'icon-drucken', function () {
      document.body.classList.add('is-printing-kontakte');
      window.print();
      // Rückfall, falls afterprint nicht feuert
      window.setTimeout(function () { document.body.classList.remove('is-printing-kontakte'); }, 1000);
    }));
    var betreff = 'Passende Anbieter – ' + seitenname;
    if (navigator.share) {
      t.aktionen.appendChild(aktionKnopf('Weiterleiten', 'icon-teilen', function () {
        navigator.share({ title: betreff, text: text }).catch(function () { /* abgebrochen */ });
      }));
    } else {
      t.aktionen.appendChild(aktionLink('Per E-Mail senden', 'icon-mail', L.mailtoLink(betreff, text), false));
      t.aktionen.appendChild(aktionLink('Per WhatsApp senden', 'icon-chat', L.whatsappLink(text), true));
    }
    t.aktionen.appendChild(aktionKnopf('Text kopieren', null, function () { kopiere(text); }));

    vorherFokus = el.kontakt;
    dialog.showModal();
    t.titel.focus();
    dialog.scrollTop = 0;
  }

  el.kontakt.addEventListener('click', function () {
    if (Object.keys(gewaehlt).length === 0) {
      el.fehler.textContent = 'Bitte wählen Sie zuerst mindestens einen Anbieter aus (Kästchen „Auswählen“ an der Karte).';
      return;
    }
    oeffneDialog();
  });
})();
