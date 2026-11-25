/* ==========================================================================
   Konzept 60+ – anbieter.js: Anbieter-Trefferliste (wiederverwendbarer Baustein)
   --------------------------------------------------------------------------
   AnbieterListe.baue(optionen) erzeugt Liste + Zähler + Kontakt-Button und liefert { wurzel, zeige, zuruecksetzen }.
   optionen.ausfuehrlich: Karte zusätzlich mit Unterkategorie, Hausbesuch ja/nein, E-Mail, Website (Assistent).
   AnbieterListe.laden(url) liefert die geladenen Daten (ein gemeinsamer Abruf).
   Verwendet an zwei Stellen: Anfrageformular (Schritt 4, [data-schritt-anbieter] / [data-anbieter-mount]) und
   Ergebnis des Assistenten (assets/js/assistent.js). Es gibt nur EINEN Kontaktdialog (<dialog>) und EINEN Datenabruf.
   - Lädt die Anbieterdaten erst beim ersten Anzeigen per fetch (nur lesend, gleiche Herkunft):
     assets/data/anbieter.json (erzeugt von tools/build.py aus data/anbieter.json).
   - Filter/Sortierung: AnbieterLogik (anbieter-logik.js). Zunächst 6 Karten, „Weitere anzeigen“ je 6.
   - Mehrfachauswahl nur im Speicher der Seite (nichts wird gespeichert oder übertragen) → Kontaktfenster.
   - Ohne JS bleibt der Formular-Schritt verborgen; das Formular läuft wie bisher.
   → WordPress: Liste aus CPT 'anbieter' (REST), Dialog als Template-Part.
   ========================================================================== */
(function () {
  'use strict';

  var L = window.AnbieterLogik;
  if (!L) return;

  var SEITE = 6;
  var instanz = 0;
  var daten = null;          // { modus, stand, leistungen, anbieter } – geteilt
  var ladeFehler = false;
  var ladeVersprechen = null;
  var dialog = null;
  var dialogTeile = null;
  var vorherFokus = null;

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

  function laden(url) {
    if (daten || ladeFehler) return Promise.resolve();
    if (ladeVersprechen) return ladeVersprechen;
    if (!url || !window.fetch) { ladeFehler = true; return Promise.resolve(); }
    ladeVersprechen = window.fetch(url, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (d) { daten = d; })
      .catch(function () { ladeFehler = true; });
    return ladeVersprechen;
  }

  function wortAnbieter(n) { return n === 1 ? 'passender Anbieter' : 'passende Anbieter'; }
  function quellenHinweis() {
    return (daten && daten.modus === 'beispiel') ? 'Beispieldaten: Namen und Nummern sind erfunden.' : L.HINWEIS_QUELLE;
  }

  function googleLink(a, cls) {
    var g = node('a', cls, 'Bewertungen bei Google ansehen');
    g.href = L.googleMapsLink(a);
    g.target = '_blank';
    g.rel = 'noopener noreferrer';
    g.appendChild(node('span', 'visually-hidden', ' (öffnet Google Maps)'));
    return g;
  }


  /* ---- Baustein: Liste ---- */
  function baue(opt) {
    instanz += 1;
    var prefix = (opt.prefix || 'anb') + instanz;
    var seitenname = opt.seitenname || 'Konzept 60+';
    var wurzel = node('div', 'anbieter-liste-baustein');
    var intro = node('p', 'anbieter__intro');
    var quelle = node('div', 'notice notice--light anbieter__quelle');
    quelle.hidden = true;
    quelle.appendChild(icon('icon-info'));
    var quelleText = node('p');
    quelle.appendChild(quelleText);
    var status = node('p', 'visually-hidden');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    var laedt = node('p', 'anbieter__laedt', 'Passende Anbieter werden gesucht …');
    laedt.hidden = true;
    var liste = node('ul', 'anbieter__liste');
    var mehrZeile = node('p', 'anbieter__mehr');
    mehrZeile.hidden = true;
    var mehr = node('button', 'btn btn--secondary', 'Weitere anzeigen');
    mehr.type = 'button';
    mehrZeile.appendChild(mehr);
    var leer = node('div', 'anbieter__leer');
    leer.hidden = true;
    leer.appendChild(node('h5', 'anbieter__leer-titel', 'Dafür suchen wir persönlich für Sie'));
    var leerText = node('p');
    leer.appendChild(leerText);
    var aktionen = node('div', 'anbieter__aktionen');
    aktionen.hidden = true;
    var zaehler = node('p', 'anbieter__zaehler', 'Noch kein Anbieter ausgewählt');
    zaehler.setAttribute('role', 'status');
    zaehler.setAttribute('aria-live', 'polite');
    var fehler = node('p', 'form-field__error anbieter__fehler');
    fehler.setAttribute('role', 'alert');
    var kontakt = node('button', 'btn btn--secondary btn--block');
    kontakt.type = 'button';
    kontakt.setAttribute('aria-disabled', 'true');
    kontakt.appendChild(icon('icon-teilen'));
    kontakt.appendChild(document.createTextNode(' Ausgewählte drucken oder weiterleiten'));
    aktionen.appendChild(zaehler);
    aktionen.appendChild(fehler);
    aktionen.appendChild(kontakt);
    [intro, quelle, status, laedt, liste, mehrZeile, leer, aktionen].forEach(function (n) { wurzel.appendChild(n); });

    var treffer = [];
    var sichtbar = SEITE;
    var gewaehlt = {};
    var schluessel = '';

    function ansage(text) { status.textContent = text; }

    /* Karte: kein Gesamt-<label> (sonst verschluckt es die Links). Inhalt, direkter „Anrufen“-Button,
       Google-Link und ein eigenes großes Label für die Auswahl-Checkbox. */
    function karte(a) {
      var li = node('li', 'anbieter-karte-item');
      var box0 = node('div', 'anbieter-karte');
      var idName = prefix + '-' + a.id + '-name';
      var idInfo = prefix + '-' + a.id + '-info';
      var idWahl = prefix + '-' + a.id + '-wahl';
      var inhalt = node('div', 'anbieter-karte__inhalt');
      var name = node('span', 'anbieter-karte__name', a.name);
      name.id = idName;
      inhalt.appendChild(name);
      var info = node('span', 'anbieter-karte__info');
      info.id = idInfo;
      if (opt.ausfuehrlich && a.unterkategorie) info.appendChild(node('span', 'anbieter-karte__leistung', a.unterkategorie));
      if (a.schwerpunkt) info.appendChild(node('span', 'anbieter-karte__text', a.schwerpunkt));
      var ort = a._gruppe === 1 ? 'Sitz in ' + a.stadt + ', auch für Ihren Ort tätig' : a.stadt;
      info.appendChild(node('span', 'anbieter-karte__meta', 'Ort: ' + ort));
      if (a.angebotsform) info.appendChild(node('span', 'anbieter-karte__meta', 'Angebot: ' + a.angebotsform));
      var hb = opt.ausfuehrlich ? L.hausbesuch(a) : '';
      if (hb) info.appendChild(node('span', 'anbieter-karte__meta', 'Hausbesuch: ' + hb));
      if (a._passt) info.appendChild(node('span', 'anbieter-karte__passt', 'Passt zu Ihrer Auswahl'));
      if (a.kassenabrechnung === 'ja') info.appendChild(node('span', 'badge anbieter-karte__kasse', 'Rechnet mit der Pflegekasse ab'));
      inhalt.appendChild(info);
      box0.appendChild(inhalt);

      var tel = L.telLink(a.telefon);
      if (tel) {
        var anruf = node('a', 'btn btn--secondary anbieter-karte__anruf');
        anruf.href = tel;
        anruf.appendChild(icon('icon-phone'));
        anruf.appendChild(document.createTextNode(' Anrufen'));
        anruf.appendChild(node('span', 'visually-hidden', ': ' + a.name));
        box0.appendChild(anruf);
      }
      if (opt.ausfuehrlich && (a.email || a.website)) {
        var wege = node('p', 'anbieter-karte__wege');
        if (a.email) {
          var m = node('a', 'anbieter-karte__weg', 'E-Mail schreiben');
          m.href = 'mailto:' + a.email;
          m.appendChild(node('span', 'visually-hidden', ': ' + a.email));
          wege.appendChild(m);
        }
        if (a.website) {
          var w = node('a', 'anbieter-karte__weg', 'Website');
          w.href = a.website;
          w.target = '_blank';
          w.rel = 'noopener noreferrer';
          w.appendChild(node('span', 'visually-hidden', ' von ' + a.name + ' (öffnet in neuem Tab)'));
          wege.appendChild(w);
        }
        box0.appendChild(wege);
      }
      box0.appendChild(googleLink(a, 'anbieter-karte__google'));

      var wahl = node('label', 'anbieter-karte__wahl');
      var box = document.createElement('input');
      box.type = 'checkbox';
      box.setAttribute('data-anbieter-id', a.id);
      box.setAttribute('aria-labelledby', idWahl + ' ' + idName);
      box.setAttribute('aria-describedby', idInfo);
      box.checked = Boolean(gewaehlt[a.id]);
      wahl.appendChild(box);
      var wt = node('span', 'anbieter-karte__wahl-text', 'Auswählen');
      wt.id = idWahl;
      wahl.appendChild(wt);
      box0.appendChild(wahl);
      li.appendChild(box0);
      return li;
    }

    function zeichneListe(fokusIndex) {
      liste.replaceChildren();
      treffer.slice(0, sichtbar).forEach(function (a) { liste.appendChild(karte(a)); });
      mehrZeile.hidden = sichtbar >= treffer.length;
      if (!mehrZeile.hidden) mehr.textContent = 'Weitere anzeigen (' + (treffer.length - sichtbar) + ' weitere)';
      if (typeof fokusIndex === 'number') {
        var boxen = liste.querySelectorAll('input[type="checkbox"]');
        if (boxen[fokusIndex]) boxen[fokusIndex].focus();
      }
    }

    function aktualisiereZaehler() {
      var n = Object.keys(gewaehlt).length;
      zaehler.textContent = n === 0 ? 'Noch kein Anbieter ausgewählt' : n + ' ausgewählt';
      kontakt.setAttribute('aria-disabled', n === 0 ? 'true' : 'false');
      if (n > 0) fehler.textContent = '';
    }

    function leeren() {
      liste.replaceChildren();
      leer.hidden = true;
      aktionen.hidden = true;
      mehrZeile.hidden = true;
      intro.textContent = '';
      quelle.hidden = true;
    }

    function zuruecksetzen() { gewaehlt = {}; schluessel = ''; sichtbar = SEITE; aktualisiereZaehler(); }

    /* eing: { thema, themaTitel, ort, leistungen[] }; Ergebnis: Promise mit Trefferzahl */
    function zeige(eing) {
      leeren();
      laedt.hidden = false;
      return laden(opt.url).then(function () {
        laedt.hidden = true;
        fehler.textContent = '';
        var ortText = eing.ort || 'Ihrer Nähe';
        // eing.treffer: bereits gefilterte Liste (Assistent, L.filtereAnliegen); sonst Filter nach Thema + Ort
        if (Array.isArray(eing.treffer)) treffer = ladeFehler ? [] : eing.treffer;
        else treffer = (ladeFehler || !daten || !eing.ort || !eing.thema) ? [] : L.filtere(daten.anbieter, eing, daten.leistungen);
        var neu = eing.schluessel || [eing.thema, eing.ort, (eing.leistungen || []).join(',')].join('|');
        if (neu !== schluessel) { gewaehlt = {}; sichtbar = SEITE; schluessel = neu; }
        else {
          var ids = {};
          treffer.forEach(function (a) { ids[a.id] = true; });
          Object.keys(gewaehlt).forEach(function (id) { if (!ids[id]) delete gewaehlt[id]; });
        }
        if (treffer.length) {
          quelle.hidden = false;
          quelleText.replaceChildren();
          var q = quellenHinweis() + ' ';
          if (!daten || daten.modus !== 'beispiel') q += L.HINWEIS_PREISE + ' ';
          quelleText.appendChild(document.createTextNode(q));
          var link = node('a', '', 'Angaben falsch oder Eintrag entfernen lassen?');
          link.href = '/impressum/';
          quelleText.appendChild(link);
          intro.textContent = opt.introText ? opt.introText(treffer.length, eing, ortText)
            : treffer.length + ' ' + wortAnbieter(treffer.length) + ' in ' + ortText + '.';
          aktionen.hidden = false;
          zeichneListe();
          ansage(treffer.length + ' ' + wortAnbieter(treffer.length) + ' gefunden.');
        } else {
          if (opt.leerKasten) {
            leerText.textContent = ladeFehler
              ? 'Die Liste konnte gerade nicht geladen werden. Das ist kein Problem: Schicken Sie uns Ihre Anfrage, dann suchen wir persönlich für Sie.'
              : 'In ' + ortText + (eing.themaTitel ? ' haben wir zu „' + eing.themaTitel + '“' : ' haben wir') +
                ' noch keinen Anbieter in unserer Liste. Das ist kein Problem: Wir suchen persönlich für Sie. Schicken Sie uns einfach Ihre Anfrage.';
            leer.hidden = false;
          }
          ansage('Keine Anbieter in der Liste. Wir suchen persönlich für Sie.');
        }
        aktualisiereZaehler();
        return treffer.length;
      });
    }

    liste.addEventListener('change', function (event) {
      var box = event.target.closest('input[data-anbieter-id]');
      if (!box) return;
      var id = box.getAttribute('data-anbieter-id');
      if (box.checked) gewaehlt[id] = true; else delete gewaehlt[id];
      aktualisiereZaehler();
    });
    mehr.addEventListener('click', function () {
      var alt = sichtbar;
      sichtbar += SEITE;
      zeichneListe(alt);
      ansage(Math.min(sichtbar, treffer.length) + ' von ' + treffer.length + ' Anbietern werden angezeigt.');
    });
    kontakt.addEventListener('click', function () {
      if (Object.keys(gewaehlt).length === 0) {
        fehler.textContent = 'Bitte wählen Sie zuerst mindestens einen Anbieter aus (Kästchen „Auswählen“ an der Karte). Zum Anrufen genügt der Knopf „Anrufen“ an der Karte.';
        return;
      }
      oeffneDialog(treffer.filter(function (a) { return gewaehlt[a.id]; }), kontakt, seitenname);
    });

    return { wurzel: wurzel, zeige: zeige, zuruecksetzen: zuruecksetzen };
  }

  /* ---- Kontaktfenster (<dialog>) ---- */
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
    var gl = node('p', 'kontakt__zeile no-print');
    gl.appendChild(googleLink(a, 'kontakt__google'));
    li.appendChild(gl);
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

  function oeffneDialog(auswahl, ausloeser, seitenname) {
    baueDialog();
    var t = dialogTeile;
    t.hinweis.replaceChildren();
    t.hinweis.appendChild(node('p', '', quellenHinweis()));
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

    vorherFokus = ausloeser;
    dialog.showModal();
    t.titel.focus();
    dialog.scrollTop = 0;
  }


  /* ---- Formular-Schritt (Anfrage) ---- */
  function initFormular() {
    var form = document.getElementById('anfrage-formular');
    var schritt = form && form.querySelector('[data-schritt-anbieter]');
    var mount = schritt && schritt.querySelector('[data-anbieter-mount]');
    if (!mount) return;
    var baustein = baue({
      url: schritt.getAttribute('data-anbieter-url'),
      seitenname: schritt.getAttribute('data-seitenname'),
      prefix: 'f-anb',
      leerKasten: true,
      introText: function (n, eing, ortText) {
        return n + ' ' + wortAnbieter(n) + ' für „' + eing.themaTitel + '“ in ' + ortText +
          '. Wählen Sie einen oder mehrere aus und lassen Sie sich die Kontaktdaten anzeigen.';
      }
    });
    mount.appendChild(baustein.wurzel);
    var persoenlich = schritt.querySelector('[data-anbieter-persoenlich]');

    form.addEventListener('schritte:wechsel', function (event) {
      if (event.detail.schritt.indexOf(schritt) === -1) return;
      var sel = form.elements.thema;
      baustein.zeige({
        thema: sel ? sel.value : '',
        themaTitel: sel && sel.value ? sel.options[sel.selectedIndex].text : '',
        ort: form.elements.ort ? form.elements.ort.value.trim() : '',
        leistungen: Array.prototype.filter.call(form.querySelectorAll('input[name="leistungen"]:checked'),
          function (i) { return !i.disabled; }).map(function (i) { return i.value; })
      });
    });
    form.addEventListener('reset', baustein.zuruecksetzen);
    form.addEventListener('schritte:start', baustein.zuruecksetzen);
    if (persoenlich) persoenlich.addEventListener('click', function () {
      form.dispatchEvent(new CustomEvent('schritte:weiter'));
    });
  }

  /* Daten für andere Bausteine (Assistent: Zählung verwandter Anliegen). Promise mit { modus, anbieter, … } oder null. */
  function ladeDaten(url) {
    return laden(url).then(function () { return ladeFehler ? null : daten; });
  }

  window.AnbieterListe = Object.freeze({ baue: baue, laden: ladeDaten });
  initFormular();
})();
