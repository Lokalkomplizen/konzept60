/* ==========================================================================
   Konzept 60+ – Pflegegradrechner: Fragebogen und Ergebnis (Oberfläche)
   Rechnet NICHT selbst: alle Punkte kommen aus nba.js (WirHelfenNBA).
   Daten: <script type="application/json" id="pgr-daten"> (von tools/build.py
   aus data/pflegegrad/*.json eingebettet – kein fetch).
   Datenschutz: Antworten leben nur im Arbeitsspeicher dieses Tabs.
   Kein Storage, keine Cookies, keine Netzwerkanfrage. Neu laden = alles weg.
   → WordPress: wp_enqueue_script('wirhelfen-nba') + dieses Skript, Daten per
     wp_add_inline_script / <script type="application/json"> ausgeben.
   ========================================================================== */
(function () {
  'use strict';

  var NBA = window.WirHelfenNBA;
  var datenEl = document.getElementById('pgr-daten');
  var app = document.querySelector('[data-pgr]');
  if (!NBA || !datenEl || !app) return;

  var D = JSON.parse(datenEl.textContent);
  var REGELN = D.regeln;
  var ENTWURF = D.entwurf;
  var F = D.fragen;

  var el = {
    start: app.querySelector('[data-pgr-start]'),
    frage: app.querySelector('[data-pgr-frage]'),
    zusammenfassung: app.querySelector('[data-pgr-zusammenfassung]'),
    ergebnis: app.querySelector('[data-pgr-ergebnis]')
  };

  // ---------------------------------------------------------------------
  // Zustand (nur im Arbeitsspeicher)
  // ---------------------------------------------------------------------
  var state;
  function neuerZustand() {
    state = { idx: 0, antworten: {}, filter: {} };
  }
  neuerZustand();

  function kriteriumTitel(id) {
    for (var m = 0; m < REGELN.module.length; m++) {
      var ks = REGELN.module[m].kriterien;
      for (var k = 0; k < ks.length; k++) {
        if (ks[k].id === id) return ks[k].titel;
        if (ks[k].teile) {
          for (var t = 0; t < ks[k].teile.length; t++) if (ks[k].teile[t][0] === id) return ks[k].teile[t][1];
        }
      }
    }
    return id;
  }

  /** Schritte, die aktuell gelten (Filterfragen blenden Blöcke aus). */
  function aktiveSchritte() {
    return F.schritte.filter(function (s) {
      if (!s.nur_wenn) return true;
      // Unbeantwortete Filter zählen als „ja“: die Schrittzahl kann so nur kleiner werden, nie größer.
      var teile = s.nur_wenn.split('=');
      var wert = state.filter[teile[0]];
      return wert === undefined || wert === teile[1];
    });
  }

  /** Heutiges Datum (lokal) als JJJJ-MM-TT. Für Tests: ?testdatum=2027-01-02 */
  function heute() {
    var m = /[?&]testdatum=(\d{4}-\d{2}-\d{2})/.exec(window.location.search);
    if (m) return m[1];
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function datumText(iso) {
    var t = iso.split('-');
    return +t[2] + '. ' + ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'][+t[1] - 1] + ' ' + t[0];
  }

  // ---------------------------------------------------------------------
  // Hilfen für Markup
  // ---------------------------------------------------------------------
  function h(tag, attrs, kinder) {
    var e = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'text') e.textContent = attrs[k];
        else if (k === 'html') e.innerHTML = attrs[k]; // nur für eigene, statische Texte
        else if (attrs[k] === true) e.setAttribute(k, '');
        else if (attrs[k] !== false && attrs[k] != null) e.setAttribute(k, attrs[k]);
      });
    }
    (kinder || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function zeige(name) {
    Object.keys(el).forEach(function (k) { el[k].hidden = k !== name; });
    // genau eine h1 je Ansicht (A11Y-05): außerhalb des Starts die visuell verborgene h1 „Pflegegradrechner“
    var h1 = app.querySelector('[data-pgr-h1]');
    if (h1) h1.hidden = name === 'start';
    var ziel = el[name].querySelector('[data-pgr-fokus]') || el[name];
    ziel.setAttribute('tabindex', '-1');
    ziel.focus({ preventScroll: true });
    var top = app.getBoundingClientRect().top + window.pageYOffset - 16;
    if (window.pageYOffset > top) window.scrollTo(0, top);
  }

  function infoBox(text, id) {
    if (!text) return null;
    var det = h('details', { class: 'pgr-info' }, [
      h('summary', null, [h('span', { text: 'Was ist damit gemeint?' })]),
      h('p', { text: text, id: id })
    ]);
    return det;
  }

  // ---------------------------------------------------------------------
  // Fragetypen
  // ---------------------------------------------------------------------
  function skalaFrage(frage, schritt, nr) {
    var skala = F.skalen[frage.skala];
    var name = 'pgr-' + frage.kriterium.replace('.', '-');
    var legend = h('legend', { class: 'pgr-q__text' }, [h('span', { text: frage.text })]);
    var optionen = skala.map(function (opt) {
      var input = h('input', { type: 'radio', name: name, value: opt.wert, required: true });
      if (state.antworten[frage.kriterium] === opt.wert) input.checked = true;
      return h('label', { class: 'choice pgr-choice' }, [
        input,
        h('span', null, [
          h('span', { class: 'pgr-choice__titel', text: opt.text }),
          opt.hilfe ? h('span', { class: 'pgr-choice__hilfe', text: opt.hilfe }) : null
        ])
      ]);
    });
    var fs = h('fieldset', { class: 'pgr-q', 'data-kriterium': frage.kriterium, 'data-typ': 'skala' }, [
      legend,
      infoBox(frage.info, name + '-info'),
      h('div', { class: 'choice-group' }, optionen),
      h('p', { class: 'pgr-q__fehler', hidden: true, role: 'alert', text: 'Bitte wählen Sie eine Antwort aus.' })
    ]);
    return fs;
  }

  function jaNeinFrage(frage) {
    var key = frage.filter;
    var name = 'pgr-' + key;
    var aktuell = state.filter[key];
    var optionen = [['ja', frage.ja || 'Ja'], ['nein', frage.nein || 'Nein']].map(function (o) {
      var input = h('input', { type: 'radio', name: name, value: o[0], required: true });
      if (aktuell === o[0]) input.checked = true;
      return h('label', { class: 'choice pgr-choice' }, [input, h('span', null, [h('span', { class: 'pgr-choice__titel', text: o[1] })])]);
    });
    return h('fieldset', { class: 'pgr-q', 'data-typ': 'filter', 'data-key': key }, [
      h('legend', { class: 'pgr-q__text' }, [h('span', { text: frage.text })]),
      infoBox(frage.info, name + '-info'),
      h('div', { class: 'choice-group choice-group--inline' }, optionen),
      h('p', { class: 'pgr-q__fehler', hidden: true, role: 'alert', text: 'Bitte wählen Sie Ja oder Nein.' })
    ]);
  }

  function haeufigkeitFrage(frage) {
    var a = state.antworten[frage.kriterium] || {};
    var einheiten = frage.einheiten || ['tag', 'woche', 'monat'];
    var labels = { tag: 'pro Tag', woche: 'pro Woche', monat: 'pro Monat' };
    var felder = einheiten.map(function (e) {
      var id = 'pgr-' + frage.kriterium.replace('.', '-') + '-' + e;
      if (e === 'taeglich') {
        var cb = h('input', { type: 'checkbox', id: id, 'data-einheit': 'tag' });
        if (a.tag) cb.checked = true;
        return h('label', { class: 'choice pgr-choice pgr-choice--check', for: id }, [cb, h('span', { text: frage.taeglich_text || 'täglich' })]);
      }
      return h('div', { class: 'pgr-anzahl' }, [
        h('label', { for: id, text: labels[e] }),
        h('input', {
          type: 'number', id: id, inputmode: 'numeric', min: '0', max: '99', step: '1',
          value: a[e] ? String(a[e]) : '', placeholder: '0', 'data-einheit': e
        })
      ]);
    });
    return h('fieldset', { class: 'pgr-q', 'data-kriterium': frage.kriterium, 'data-typ': 'haeufigkeit' }, [
      h('legend', { class: 'pgr-q__text' }, [h('span', { text: frage.text })]),
      infoBox(frage.info),
      h('div', { class: 'pgr-anzahl-gruppe' }, felder),
      h('p', { class: 'pgr-q__fehler', hidden: true, role: 'alert', text: 'Bitte nur ganze Zahlen von 0 bis 99 eingeben.' })
    ]);
  }

  // ---------------------------------------------------------------------
  // Schritt anzeigen
  // ---------------------------------------------------------------------
  function zeigeSchritt() {
    var schritte = aktiveSchritte();
    var s = schritte[state.idx];
    var modul = s.modul ? REGELN.module[s.modul - 1] : null;
    var gesamt = schritte.length;

    var form = h('form', { class: 'pgr-form', novalidate: true });
    if (s.einleitung) form.appendChild(h('p', { class: 'pgr-step__intro', text: s.einleitung }));
    s.fragen.forEach(function (frage, i) {
      var feld;
      if (frage.filter) feld = jaNeinFrage(frage);
      else if (frage.typ === 'haeufigkeit') feld = haeufigkeitFrage(frage);
      else feld = skalaFrage(frage, s, i);
      form.appendChild(feld);
    });

    var zurueck = h('button', { type: 'button', class: 'btn btn--secondary', 'data-pgr-zurueck': true, text: 'Zurück' });
    var weiter = h('button', { type: 'submit', class: 'btn btn--primary', text: state.idx === gesamt - 1 ? 'Zur Übersicht' : 'Weiter' });
    form.appendChild(h('div', { class: 'pgr-nav' }, [zurueck, weiter]));

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!speichereSchritt(form)) return;
      if (state.idx < aktiveSchritte().length - 1) {
        state.idx++;
        zeigeSchritt();
      } else {
        zeigeZusammenfassung();
      }
    });
    zurueck.addEventListener('click', function () {
      speichereSchritt(form, true);
      if (state.idx === 0) { zeige('start'); return; }
      state.idx--;
      zeigeSchritt();
    });

    var prozent = Math.round((state.idx / gesamt) * 100);
    el.frage.innerHTML = '';
    el.frage.appendChild(fortschritt(s, schritte));
    el.frage.appendChild(h('p', { class: 'pgr-progress__text', text: 'Schritt ' + (state.idx + 1) + ' von ' + gesamt + (modul ? ' · ' + F.modul_kurz[s.modul - 1] : '') }));
    var bar = h('div', { class: 'pgr-progress', role: 'progressbar', 'aria-label': 'Fortschritt', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(prozent) }, [
      h('span', { class: 'pgr-progress__bar', style: null })
    ]);
    bar.firstChild.style.width = prozent + '%';
    el.frage.appendChild(bar);
    el.frage.appendChild(h('h2', { class: 'pgr-step__title', text: s.titel, 'data-pgr-fokus': true }));
    el.frage.appendChild(form);
    zeige('frage');
  }

  /** Punkte-Leiste der Abschnitte (1–6 + Start), wie im Titelbild angedeutet. */
  function fortschritt(s, schritte) {
    var aktuell = s.modul || 0;
    var liste = h('ol', { class: 'pgr-steps', 'aria-label': 'Abschnitte' });
    F.modul_kurz.forEach(function (name, i) {
      var nr = i + 1;
      var status = nr < aktuell ? 'erledigt' : nr === aktuell ? 'aktuell' : 'offen';
      var li = h('li', { class: 'pgr-steps__item pgr-steps__item--' + status }, [
        h('span', { class: 'pgr-steps__nr', 'aria-hidden': 'true', text: String(nr) }),
        h('span', { class: 'visually-hidden', text: name + (status === 'aktuell' ? ' (aktuell)' : status === 'erledigt' ? ' (erledigt)' : '') })
      ]);
      if (status === 'aktuell') li.setAttribute('aria-current', 'step');
      liste.appendChild(li);
    });
    return liste;
  }

  /** Antworten des Formulars übernehmen. Gibt false zurück, wenn etwas fehlt. */
  function speichereSchritt(form, ohnePruefung) {
    var ok = true;
    var erstesFehlerfeld = null;
    Array.prototype.forEach.call(form.querySelectorAll('.pgr-q'), function (fs) {
      var fehler = fs.querySelector('.pgr-q__fehler');
      var gueltig = true;
      var typ = fs.getAttribute('data-typ');
      if (typ === 'skala') {
        var c = fs.querySelector('input:checked');
        if (c) state.antworten[fs.getAttribute('data-kriterium')] = c.value;
        else gueltig = false;
      } else if (typ === 'filter') {
        var j = fs.querySelector('input:checked');
        if (!j) gueltig = false;
        else setzeFilter(fs.getAttribute('data-key'), j.value);
      } else if (typ === 'haeufigkeit') {
        var wert = {};
        Array.prototype.forEach.call(fs.querySelectorAll('[data-einheit]'), function (inp) {
          var e = inp.getAttribute('data-einheit');
          if (inp.type === 'checkbox') { if (inp.checked) wert.tag = 1; return; }
          var v = inp.value.trim();
          if (v === '') return;
          if (!/^\d{1,2}$/.test(v)) { gueltig = false; return; }
          if (+v > 0) wert[e] = +v;
        });
        if (gueltig) state.antworten[fs.getAttribute('data-kriterium')] = wert;
      }
      if (fehler) fehler.hidden = gueltig || ohnePruefung;
      fs.classList.toggle('pgr-q--fehler', !gueltig && !ohnePruefung);
      if (!gueltig) { ok = false; if (!erstesFehlerfeld) erstesFehlerfeld = fs; }
    });
    if (!ok && !ohnePruefung && erstesFehlerfeld) {
      var ziel = erstesFehlerfeld.querySelector('input');
      if (ziel) ziel.focus();
    }
    return ok || !!ohnePruefung;
  }

  /** Filter setzen. Bei „nein“ werden die Antworten des übersprungenen Blocks gelöscht (= keine Einschränkung). */
  function setzeFilter(key, wert) {
    state.filter[key] = wert;
    if (wert !== 'nein') return;
    F.schritte.forEach(function (s) {
      if (s.nur_wenn === key + '=ja') {
        s.fragen.forEach(function (f) { if (f.kriterium) delete state.antworten[f.kriterium]; });
      }
    });
  }

  // ---------------------------------------------------------------------
  // Zusammenfassung vor der Auswertung
  // ---------------------------------------------------------------------
  function antwortText(frage) {
    var a = state.antworten[frage.kriterium];
    if (frage.typ === 'haeufigkeit') {
      if (!a || (!a.tag && !a.woche && !a.monat)) return 'nicht nötig oder selbstständig';
      var teile = [];
      if (frage.einheiten && frage.einheiten.indexOf('taeglich') >= 0 && a.tag) return 'täglich';
      if (a.tag) teile.push(a.tag + '× pro Tag');
      if (a.woche) teile.push(a.woche + '× pro Woche');
      if (a.monat) teile.push(a.monat + '× pro Monat');
      return teile.join(', ');
    }
    var skala = F.skalen[frage.skala];
    for (var i = 0; i < skala.length; i++) if (skala[i].wert === a) return skala[i].text;
    return '–';
  }

  function zeigeZusammenfassung() {
    var c = el.zusammenfassung.querySelector('[data-pgr-liste]');
    c.innerHTML = '';
    var schritte = aktiveSchritte();
    F.modul_kurz.forEach(function (name, i) {
      var nr = i + 1;
      var block = h('div', { class: 'pgr-summary__block' }, [h('h3', { text: 'Abschnitt ' + nr + ': ' + name })]);
      var dl = h('dl', { class: 'pgr-summary__list' });
      var uebersprungen = F.schritte.some(function (s) { return s.modul === nr && s.nur_wenn && schritte.indexOf(s) < 0; });
      schritte.forEach(function (s, idx) {
        if (s.modul !== nr) return;
        s.fragen.forEach(function (f) {
          var aendern = h('button', { type: 'button', class: 'pgr-summary__edit', text: 'Ändern' });
          aendern.setAttribute('aria-label', 'Antwort ändern: ' + f.kurz);
          aendern.addEventListener('click', function () { state.idx = idx; zeigeSchritt(); });
          dl.appendChild(h('div', { class: 'pgr-summary__row' }, [
            h('dt', { text: f.kurz }),
            h('dd', null, [h('span', { text: f.filter ? (state.filter[f.filter] === 'ja' ? 'Ja' : 'Nein') : antwortText(f) }), aendern])
          ]));
        });
      });
      if (uebersprungen) {
        var idxFilter = schritte.findIndex(function (s) { return s.modul === nr && s.fragen.some(function (f) { return f.filter; }); });
        var btn = h('button', { type: 'button', class: 'pgr-summary__edit', text: 'Ändern' });
        btn.addEventListener('click', function () { state.idx = idxFilter; zeigeSchritt(); });
        dl.appendChild(h('div', { class: 'pgr-summary__row' }, [
          h('dt', { text: 'Einzelfragen' }),
          h('dd', null, [h('span', { text: 'übersprungen – zählt als „keine Einschränkung“' }), btn])
        ]));
      }
      block.appendChild(dl);
      c.appendChild(block);
    });
    zeige('zusammenfassung');
  }

  // ---------------------------------------------------------------------
  // Ergebnis (Etappe 2: Pflegegrad und Module; Leistungen folgen in Etappe 3)
  // ---------------------------------------------------------------------
  function zeigeErgebnis() {
    var bedingungen = {};
    F.bedingungen.forEach(function (b) { bedingungen[b] = state.filter[b] === 'ja'; });
    var r = NBA.berechne(REGELN, state.antworten, bedingungen);
    // Welche Grenzen gelten heute? Ein Entwurf wird nie gerechnet (nba.js regelwerkFuer).
    var rw = NBA.regelwerkFuer(REGELN, [ENTWURF], heute());
    r.pflegegrad = NBA.pflegegradAusPunkten(rw.aktiv.pflegegrade, r.gesamtpunkte);
    var zahl = function (n) { return n.toLocaleString('de-DE', { maximumFractionDigits: 2 }); };
    var grenzen = rw.aktiv.pflegegrade;
    var neuesRecht = rw.aktiv.id !== REGELN.id;

    var titel = el.ergebnis.querySelector('[data-pgr-grad]');
    var satz = el.ergebnis.querySelector('[data-pgr-satz]');
    titel.textContent = r.pflegegrad ? 'Pflegegrad ' + r.pflegegrad : 'Voraussichtlich kein Pflegegrad';
    satz.textContent = 'Nach Ihren Angaben ergibt sich eine geschätzte Gesamtpunktzahl von ' + zahl(r.gesamtpunkte) +
      ' von 100 Punkten. ' + (r.pflegegrad
        ? 'Das entspricht nach dem geltenden Recht (§ 15 SGB XI) voraussichtlich Pflegegrad ' + r.pflegegrad + '.'
        : 'Für Pflegegrad 1 sind mindestens ' + zahl(grenzen[1].ab) + ' Punkte nötig.');
    el.ergebnis.querySelector('[data-pgr-grenzen-text]').textContent = grenzen.slice(1).map(function (g) {
      return 'Pflegegrad ' + g.grad + ' ab ' + zahl(g.ab);
    }).join(', ') + ' Punkten.';

    el.ergebnis.querySelector('[data-pgr-grad-text]').textContent = F.grad_texte[r.pflegegrad];

    // Nähe zur Grenze: reine Anzeige, verändert das Ergebnis nicht
    var grenzHinweis = el.ergebnis.querySelector('[data-pgr-grenze]');
    var naechste = grenzen.filter(function (g) { return g.ab > r.gesamtpunkte; })[0];
    var eigene = grenzen.filter(function (g) { return g.grad === r.pflegegrad; })[0];
    var text = '';
    if (naechste && naechste.ab - r.gesamtpunkte <= F.grenze_naehe) {
      text = 'Ihr Wert liegt nahe an der Grenze zu Pflegegrad ' + naechste.grad + ' (ab ' + zahl(naechste.ab) + ' Punkten). Kleine Unterschiede bei der Begutachtung können zu einer höheren Einstufung führen.';
    } else if (eigene && eigene.grad > 0 && r.gesamtpunkte - eigene.ab < F.grenze_naehe) {
      text = 'Ihr Wert liegt knapp über der Grenze für Pflegegrad ' + eigene.grad + ' (ab ' + zahl(eigene.ab) + ' Punkten). Bei der Begutachtung kann auch ein niedrigerer Pflegegrad herauskommen.';
    }
    grenzHinweis.hidden = !text;
    grenzHinweis.querySelector('p').textContent = text;

    // Besondere Bedarfskonstellation (§ 15 Abs. 4): nur Hinweis, keine automatische Einstufung
    el.ergebnis.querySelector('[data-pgr-sonderfall]').hidden = !(state.filter.bedarfskonstellation === 'ja' && r.pflegegrad < 5);

    // Kommende Änderung der Grenzen (Entwurf oder beschlossen, noch nicht in Kraft)
    var reform = el.ergebnis.querySelector('[data-pgr-reform]');
    var gradNeu = rw.kommend ? NBA.pflegegradAusPunkten(rw.kommend.pflegegrade, r.gesamtpunkte) : r.pflegegrad;
    reform.hidden = gradNeu >= r.pflegegrad;
    if (!reform.hidden) {
      var beschlossen = rw.kommend.rechtsstatus === 'beschlossen';
      reform.querySelector('[data-pgr-reform-titel]').textContent = beschlossen
        ? 'Pflegereform: neue Punktgrenzen beschlossen'
        : 'Pflegereform (Gesetzentwurf, noch nicht beschlossen)';
      reform.querySelector('[data-pgr-reform-text]').textContent =
        (beschlossen ? 'Ab dem ' + datumText(rw.kommend.gueltig_ab) + ' gelten' : 'Nach dem Gesetzentwurf sollen ab dem ' + datumText(rw.kommend.gueltig_ab)) +
        ' höhere Punktgrenzen für Pflegegrad 1 bis 3' + (beschlossen ? '' : ' gelten') + '. Mit ' + zahl(r.gesamtpunkte) +
        ' Punkten käme bei einem neuen Antrag danach voraussichtlich ' + (gradNeu ? 'Pflegegrad ' + gradNeu : 'kein Pflegegrad') +
        ' heraus. Bereits anerkannte Pflegegrade sollen Bestandsschutz erhalten.';
    }

    // Unter neuem Recht: Hinweis auf Bestandsschutz für bereits festgestellte Pflegegrade
    el.ergebnis.querySelector('[data-pgr-bestandsschutz]').hidden = !neuesRecht;

    // Leistungen, Reform-Erklärung, passende Hilfe (pflegegrad/leistungen.js)
    if (window.WirHelfenLeistungen) window.WirHelfenLeistungen.zeige(el.ergebnis, r, state.filter, D);

    // Modulgrafik
    var liste = el.ergebnis.querySelector('[data-pgr-module]');
    liste.innerHTML = '';
    r.module.forEach(function (m) {
      var anteil = m.maxGewichtet ? Math.round((m.gewichtet / m.maxGewichtet) * 100) : 0;
      var bar = h('span', { class: 'pgr-bar__fill pgr-bar__fill--' + m.stufe });
      bar.style.width = Math.max(anteil, 0) + '%';
      liste.appendChild(h('li', { class: 'pgr-bar' + (m.zaehlt ? '' : ' pgr-bar--zaehlt-nicht') }, [
        h('span', { class: 'pgr-bar__label' }, [
          h('strong', { text: m.nr + '. ' + F.modul_kurz[m.nr - 1] }),
          h('span', { class: 'pgr-bar__wert', text: zahl(m.gewichtet) + ' von ' + zahl(m.maxGewichtet) + ' Punkten · ' + F.stufen_text[m.stufe] + (m.zaehlt ? '' : ' · zählt nicht (nur der höhere Wert aus Abschnitt 2 und 3 zählt)') })
        ]),
        h('span', { class: 'pgr-bar__track', 'aria-hidden': 'true' }, [bar])
      ]));
    });

    // Stärkste Einschränkungen: Module mit Stufe ≥ 2, nach gewichtetem Anteil
    var stark = r.module.filter(function (m) { return m.stufe >= 2 && m.zaehlt; })
      .sort(function (a, b) { return b.gewichtet / b.maxGewichtet - a.gewichtet / a.maxGewichtet; });
    var staerken = el.ergebnis.querySelector('[data-pgr-staerkste]');
    staerken.innerHTML = '';
    if (stark.length) {
      stark.forEach(function (m) { staerken.appendChild(h('li', { text: F.modul_kurz[m.nr - 1] + ': ' + F.stufen_text[m.stufe] + ' Einschränkungen' })); });
    } else {
      staerken.appendChild(h('li', { text: 'Nach Ihren Angaben gibt es in keinem Bereich erhebliche Einschränkungen.' }));
    }

    var tabelle = el.ergebnis.querySelector('[data-pgr-tabelle]');
    tabelle.innerHTML = '';
    r.module.forEach(function (m) {
      tabelle.appendChild(h('tr', null, [
        h('th', { scope: 'row', text: m.nr + '. ' + F.modul_kurz[m.nr - 1] }),
        h('td', { text: String(m.summe) }),
        h('td', { text: F.stufen_text[m.stufe] }),
        h('td', { text: zahl(m.gewichtet) + (m.zaehlt ? '' : ' (zählt nicht)') })
      ]));
    });
    el.ergebnis.querySelector('[data-pgr-summe]').textContent = zahl(r.gesamtpunkte);
    zeige('ergebnis');
  }

  // ---------------------------------------------------------------------
  // Steuerung
  // ---------------------------------------------------------------------
  app.addEventListener('click', function (ev) {
    var t = ev.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-pgr-los')) { state.idx = 0; zeigeSchritt(); }
    else if (t.hasAttribute('data-pgr-auswerten')) zeigeErgebnis();
    else if (t.hasAttribute('data-pgr-zurueck-zu-fragen')) { state.idx = aktiveSchritte().length - 1; zeigeSchritt(); }
    else if (t.hasAttribute('data-pgr-uebersicht')) zeigeZusammenfassung();
    else if (t.hasAttribute('data-pgr-neu')) {
      neuerZustand();
      zeige('start');
    }
  });

  app.classList.add('pgr--bereit');
  Array.prototype.forEach.call(app.querySelectorAll('[data-pgr-js]'), function (b) { b.hidden = false; });
})();
