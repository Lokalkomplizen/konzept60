/* ==========================================================================
   Konzept 60+ – assistent.js: Assistent mit Freitextsuche (Relaunch 3.1)
   Eingesetzt auf /hilfe-finden/ (#assistent, ganzer Ablauf) und als Einstieg im Hero der Startseite
   ([data-assistent-einstieg], Relaunch 3.2): dort nur Suchfeld mit Vorschlägen; jede Auswahl öffnet
   /hilfe-finden/ mit dem passenden Zustand in der Adresszeile (Chips „Häufig gesucht“ sind normale Links).
   Konzept: docs/relaunch/konzept-assistent-suche.md (Abschnitte 2, 3, 5, 6, 7; Umkreissuche zurückgestellt).
   - Daten: assets/data/assistent.json (Anliegen-Katalog, Fragen, Themen, Städte, Ratgeber; erzeugt von
     tools/build.py, lesend per fetch). Anbieter: AnbieterListe (anbieter.js) mit AnbieterLogik.filtereAnliegen.
   - Ablauf: Anliegen (Suche, „Häufig gesucht“, Thema → Anliegen, Gruppe „Badezimmer“) → Filterfragen
     (ändern die Liste) → Stadt → Liste. Danach optional Notizfragen → Notizzettel („Das sollten Sie am
     Telefon sagen“) zum Drucken, Mailen, per WhatsApp, und als Text für „Bei uns melden“.
   - Weitere Wege wie bisher: „Ich möchte mich informieren“ (Thema → Ratgeber), „Alltag organisieren“
     (Mein-Alltag-Werkzeuge), „Hilfe für einen Angehörigen“ (→ wer=angehoerige im Anfrageformular).
   - Zustand steht in der Adresszeile (history.pushState): Zurück-Knopf des Browsers, Lesezeichen, Teilen.
     Es wird NICHTS gespeichert oder gesendet: kein Storage, keine Cookies, keine Protokollierung der Suche.
   - Barrierearm: Fokus beim Schrittwechsel auf die Überschrift, Fortschritt und Trefferzahl in aria-live,
     ARIA-Combobox (Pfeiltasten, Enter, Escape), große Auswahlflächen, keine Dropdowns.
   - Ohne JS: Links auf die Themenseiten und das Anfrageformular (im Template).
   → WordPress: Block/Template-Part „assistent“; Daten per REST bzw. wp_localize_script.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('assistent');
  var EINSTIEG = !root && document.querySelector('[data-assistent-einstieg]');
  if (EINSTIEG) root = EINSTIEG;
  var app = root && !EINSTIEG ? root.querySelector('[data-assistent-app]') : null;
  var L = window.AnbieterLogik;
  var S = window.SucheLogik;
  if (!root || !S || (!EINSTIEG && (!app || !L))) return;
  var ZIEL = '/hilfe-finden/';

  var data = null;
  var ST = {};
  var FILTER = 'f-';
  var NOTIZ = 'n-';
  var uid = 0;
  var merkeSuche = function () {};

  /* ---- kleine DOM-Helfer (Daten nie als HTML einsetzen) ---------------------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (attrs[key] === null || attrs[key] === undefined) return;
      if (key === 'text') node.textContent = attrs[key];
      else if (key === 'class') node.className = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }
  function svgUse(href, cls) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', href);
    svg.appendChild(use);
    return svg;
  }
  function icon(name) { return svgUse('#icon-' + name, 'icon'); }
  function illu(name) { return svgUse((data.sprite || '/assets/img/illus.svg') + '#illu-' + name, 'illu illu--s choice-card__illu'); }
  function button(label, className, onClick) {
    var b = el('button', { type: 'button', 'class': 'btn ' + className }, [label]);
    b.addEventListener('click', onClick);
    return b;
  }
  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ---- Daten-Zugriff ------------------------------------------------------------ */
  function anliegenById(id) { return data.anliegen.filter(function (a) { return a.id === id; })[0]; }
  function gruppeById(id) { return data.gruppen.filter(function (g) { return g.id === id; })[0]; }
  function themaById(slug) { return data.themen.filter(function (t) { return t.slug === slug; })[0]; }
  function alltagById(id) { return data.alltag.filter(function (t) { return t.id === id; })[0]; }
  function frage(id) { return data.fragen[id]; }
  function option(fid, oid) { var f = frage(fid); return f && f.optionen.filter(function (o) { return o.id === oid; })[0]; }
  function filterFragen(a) { return (a.fragen || []).filter(function (f) { return f !== 'ort' && frage(f); }); }
  function hatListe(a) { return a.kategorien && a.kategorien.length > 0; }
  function werkzeugVon(a) { return a.werkzeug ? alltagById(a.werkzeug) : null; }

  /* ---- Zustand <-> Adresszeile ------------------------------------------------ */
  var KEYS = ['person', 'ziel', 'werkzeug', 'bereich', 'gruppe', 'anliegen', 'stadt', 'notizen', 'q'];
  function ausUrl() {
    var p = new URLSearchParams(window.location.search);
    var st = {};
    p.forEach(function (v, k) {
      if (KEYS.indexOf(k) !== -1 || k.indexOf(FILTER) === 0 || k.indexOf(NOTIZ) === 0) st[k] = v;
    });
    // ungültige Werte verwerfen (alte Lesezeichen, Tippfehler)
    if (st.anliegen && !anliegenById(st.anliegen)) delete st.anliegen;
    if (st.gruppe && !gruppeById(st.gruppe)) delete st.gruppe;
    if (st.bereich && !themaById(st.bereich)) delete st.bereich;
    if (st.ziel && ['informieren', 'alltag'].indexOf(st.ziel) === -1) delete st.ziel;
    if (st.werkzeug && !alltagById(st.werkzeug)) delete st.werkzeug;
    if (st.person && st.person !== 'angehoerige') delete st.person;
    Object.keys(st).forEach(function (k) {
      var id = k.slice(2);
      if ((k.indexOf(FILTER) === 0 || k.indexOf(NOTIZ) === 0) && st[k] !== '-' && !option(id, st[k])) delete st[k];
    });
    return st;
  }
  function query(st, pfad) {
    var p = new URLSearchParams();
    KEYS.forEach(function (k) { if (st[k]) p.set(k, st[k]); });
    Object.keys(st).sort().forEach(function (k) {
      if ((k.indexOf(FILTER) === 0 || k.indexOf(NOTIZ) === 0) && st[k]) p.set(k, st[k]);
    });
    var q = p.toString();
    return (pfad || window.location.pathname) + (q ? '?' + q : '');
  }
  function gehe(st, ersetzen) {
    ST = st;
    var url = query(st);
    if (ersetzen) history.replaceState(null, '', url); else history.pushState(null, '', url);
    merkeSuche();
    render(true);
  }
  function mit(aenderung, ohne) {
    var st = Object.assign({}, ST, aenderung || {});
    (ohne || []).forEach(function (k) {
      if (k === FILTER || k === NOTIZ) Object.keys(st).forEach(function (x) { if (x.indexOf(k) === 0) delete st[x]; });
      else delete st[k];
    });
    Object.keys(st).forEach(function (k) { if (st[k] === '' || st[k] === undefined) delete st[k]; });
    return st;
  }
  var ALLES_AUSWAHL = ['ziel', 'werkzeug', 'bereich', 'gruppe', 'anliegen', 'notizen', 'q', FILTER, NOTIZ];

  /* ---- Ablauf: Schritte aus dem Zustand berechnen -------------------------------- */
  /* Jeder Schritt: { typ, id?, ohne: [...] } – „ohne“ = Schlüssel, die „Zurück“ zu diesem Schritt entfernt. */
  function ablauf() {
    var pfad = [{ typ: 'start', ohne: ALLES_AUSWAHL }];
    if (ST.ziel === 'alltag') {
      pfad.push({ typ: 'werkzeug', ohne: ['werkzeug'] });
      return { pfad: pfad, aktuell: ST.werkzeug ? pfad.length : 1, ergebnis: 'alltag' };
    }
    if (ST.ziel === 'informieren') {
      pfad.push({ typ: 'info-thema', ohne: ['bereich'] });
      return { pfad: pfad, aktuell: ST.bereich ? pfad.length : 1, ergebnis: 'informieren' };
    }
    var a = ST.anliegen && anliegenById(ST.anliegen);
    if (ST.bereich) pfad.push({ typ: 'bereich', ohne: ['gruppe', 'anliegen', 'notizen', FILTER, NOTIZ] });
    if (ST.gruppe) pfad.push({ typ: 'gruppe', ohne: ['anliegen', 'notizen', FILTER, NOTIZ] });
    if (!a) return { pfad: pfad, aktuell: pfad.length - 1 };
    var aktuell = -1;
    filterFragen(a).forEach(function (fid) {
      pfad.push({ typ: 'filter', id: fid, ohne: [FILTER + fid] });
      if (aktuell === -1 && !ST[FILTER + fid]) aktuell = pfad.length - 1;
    });
    if (hatListe(a)) {
      pfad.push({ typ: 'ort', ohne: ['stadt'] });
      if (aktuell === -1 && !ST.stadt) aktuell = pfad.length - 1;
    }
    return { pfad: pfad, aktuell: aktuell === -1 ? pfad.length : aktuell, ergebnis: hatListe(a) ? 'anbieter' : 'ratgeber', anliegen: a };
  }

  function offeneNotiz(a) {
    var ids = a.notizfragen || [];
    for (var i = 0; i < ids.length; i++) if (!ST[NOTIZ + ids[i]]) return i;
    return -1;
  }

  /* ---- Rendern ----------------------------------------------------------------------- */
  function render(fokus) {
    var lauf = ablauf();
    var istErgebnis = lauf.aktuell >= lauf.pfad.length;
    var notizIndex = -1;
    if (istErgebnis && lauf.ergebnis === 'anbieter' && ST.notizen) notizIndex = offeneNotiz(lauf.anliegen);

    app.replaceChildren();
    var card = el('div', { 'class': 'assistent__card' });
    app.appendChild(card);

    var progress = el('p', { 'class': 'assistent__progress', 'aria-live': 'polite' });
    card.appendChild(progress);
    var bar = el('div', { 'class': 'assistent__bar', 'aria-hidden': 'true' });

    if (notizIndex !== -1) {
      var ids = lauf.anliegen.notizfragen;
      progress.textContent = 'Für Ihr Gespräch · Frage ' + (notizIndex + 1) + ' von ' + ids.length;
      for (var j = 0; j < ids.length; j++) bar.appendChild(el('span', { 'class': 'assistent__bar-step' + (j <= notizIndex ? ' is-done' : '') }));
      card.appendChild(bar);
      haengeAn(card, auswahlZeile(lauf));
      card.appendChild(renderNotiz(lauf.anliegen, notizIndex));
    } else if (!istErgebnis) {
      // Am Start steht die Zahl der Schritte noch nicht fest (hängt vom Anliegen ab, höchstens vier Fragen)
      progress.textContent = lauf.pfad.length === 1 ? 'Schritt 1 · Ihr Anliegen' : 'Schritt ' + (lauf.aktuell + 1) + ' von ' + lauf.pfad.length;
      for (var i = 0; i < lauf.pfad.length; i++) bar.appendChild(el('span', { 'class': 'assistent__bar-step' + (i <= lauf.aktuell ? ' is-done' : '') }));
      card.appendChild(bar);
      haengeAn(card, auswahlZeile(lauf));
      card.appendChild(renderSchritt(lauf.pfad[lauf.aktuell], lauf));
    } else {
      progress.textContent = 'Ihr Ergebnis';
      haengeAn(card, auswahlZeile(lauf));
      card.appendChild(renderErgebnis(lauf));
    }

    if (fokus) {
      var heading = card.querySelector('[data-assistent-heading]');
      if (heading) heading.focus({ preventScroll: true });
      if (!imBlick(card)) card.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }
  }
  function haengeAn(eltern, kind) { if (kind) eltern.appendChild(kind); }
  function imBlick(node) {
    var r = node.getBoundingClientRect();
    return r.top >= 0 && r.top < window.innerHeight * 0.6;
  }

  function ueberschrift(text) {
    return el('h3', { 'class': 'assistent__heading', tabindex: '-1', 'data-assistent-heading': '', text: text });
  }

  /* Gewählte Angaben als Zeile mit „ändern“-Links (echte Links mit Adresse, abgefangen für pushState) */
  function aendernLink(label, wert, st) {
    var a = el('a', { href: query(st), 'class': 'assistent__aendern' }, ['ändern']);
    a.appendChild(el('span', { 'class': 'visually-hidden', text: ': ' + label }));
    a.addEventListener('click', function (e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      gehe(st);
    });
    return el('li', { 'class': 'assistent__auswahl-item' }, [
      el('span', { 'class': 'assistent__auswahl-label', text: label + ': ' }), el('strong', { text: wert }), ' ', a
    ]);
  }
  function auswahlZeile(lauf) {
    var ul = el('ul', { 'class': 'assistent__auswahl', 'aria-label': 'Ihre Angaben' });
    if (ST.person) ul.appendChild(aendernLink('Für', 'einen Angehörigen', mit({}, ['person'])));
    if (ST.ziel === 'informieren') ul.appendChild(aendernLink('Ziel', 'Informieren', mit({}, ALLES_AUSWAHL)));
    if (ST.ziel === 'alltag') ul.appendChild(aendernLink('Ziel', 'Alltag organisieren', mit({}, ALLES_AUSWAHL)));
    if (ST.werkzeug) ul.appendChild(aendernLink('Werkzeug', alltagById(ST.werkzeug).titel, mit({}, ['werkzeug'])));
    if (ST.bereich) ul.appendChild(aendernLink('Thema', themaById(ST.bereich).titel, mit({}, ['bereich', 'gruppe', 'anliegen', 'notizen', FILTER, NOTIZ])));
    if (ST.gruppe && !ST.anliegen) ul.appendChild(aendernLink('Bereich', gruppeById(ST.gruppe).titel, mit({}, ['gruppe'])));
    var a = lauf.anliegen;
    if (a) {
      ul.appendChild(aendernLink('Anliegen', a.titel, mit({}, ['anliegen', 'notizen', FILTER, NOTIZ])));
      filterFragen(a).forEach(function (fid) {
        var v = ST[FILTER + fid];
        if (!v) return;
        ul.appendChild(aendernLink(frage(fid).notiz || frage(fid).titel, v === '-' ? 'alle' : option(fid, v).titel, mit({}, [FILTER + fid])));
      });
    }
    if (ST.stadt && (!a || hatListe(a))) ul.appendChild(aendernLink('Stadt', ST.stadt, mit({}, ['stadt'])));
    return ul.children.length ? ul : null;
  }

  /* Auswahlkarte als <button> (ein Tipp = Auswahl + weiter) */
  function wahlKarte(titel, hinweis, onClick, opt) {
    opt = opt || {};
    var text = el('span', { 'class': 'choice-card__text' }, [el('span', { 'class': 'choice-card__title', text: titel })]);
    if (hinweis) text.appendChild(el('span', { 'class': 'choice-card__hint', text: hinweis }));
    var b = el('button', {
      type: 'button',
      'class': 'choice-card choice-card--tap' + (opt.illu ? ' choice-card--illu' : ''),
      'aria-pressed': opt.gewaehlt ? 'true' : 'false'
    }, [opt.illu ? illu(opt.illu) : null, text]);
    b.addEventListener('click', onClick);
    return b;
  }
  function wahlListe(karten, art) {
    var list = el('div', { 'class': 'assistent__choices' + (art ? ' assistent__choices--' + art : '') });
    karten.forEach(function (k) { list.appendChild(k); });
    return list;
  }
  function anliegenHinweis(a) {
    if (!hatListe(a)) return 'Dazu haben wir einen Ratgeber';
    return a.kurz || '';
  }
  function waehleAnliegen(a, extra) {
    gehe(Object.assign(mit({ anliegen: a.id }, ['notizen', 'q', FILTER, NOTIZ]), extra || {}));
  }
  function anliegenKarte(a) {
    return wahlKarte(a.titel, anliegenHinweis(a), function () { waehleAnliegen(a); }, { gewaehlt: ST.anliegen === a.id });
  }
  function gruppeKarte(g) {
    var n = data.anliegen.filter(function (a) { return a.gruppe === g.id; }).length;
    return wahlKarte(g.titel, g.hinweis || (n + ' Möglichkeiten'), function () {
      gehe(mit({ gruppe: g.id }, ['anliegen', 'q', FILTER, NOTIZ, 'notizen']));
    });
  }
  function haeufigKarte(eintrag) {
    if (eintrag.indexOf('gruppe:') === 0) return gruppeKarte(gruppeById(eintrag.slice(7)));
    return anliegenKarte(anliegenById(eintrag));
  }

  function aktionen(lauf, opt) {
    opt = opt || {};
    var box = el('div', { 'class': 'assistent__actions' });
    var k = opt.index;
    if (k > 0) {
      box.appendChild(button('Zurück', 'btn--secondary', function () {
        if (opt.zurueck) { opt.zurueck(); return; }
        gehe(mit({}, lauf.pfad[k - 1].ohne));
      }));
    }
    if (opt.ueberspringen) box.appendChild(button(opt.ueberspringenText || 'Überspringen', 'btn--secondary', opt.ueberspringen));
    if (k > 0 || Object.keys(ST).length) {
      box.appendChild(button('Neu starten', 'btn--secondary assistent__neu', function () { gehe({}); }));
    }
    return box;
  }

  /* ---- Schritte ---------------------------------------------------------------------- */
  function renderSchritt(schritt, lauf) {
    var wrap = el('div', { 'class': 'assistent__form' });
    var idx = lauf.aktuell;
    if (schritt.typ === 'start') {
      wrap.appendChild(ueberschrift(ST.person ? 'Wobei braucht Ihr Angehöriger Hilfe?' : 'Wobei suchen Sie Hilfe?'));
      wrap.appendChild(sucheBaustein());
      wrap.appendChild(el('h4', { 'class': 'assistent__abschnitt', text: 'Häufig gesucht' }));
      wrap.appendChild(wahlListe(data.haeufig.map(haeufigKarte)));
      wrap.appendChild(el('h4', { 'class': 'assistent__abschnitt', text: 'Alle Themen' }));
      wrap.appendChild(wahlListe(data.themen.map(function (t) {
        return wahlKarte(t.titel, '', function () { gehe(mit({ bereich: t.slug }, ['gruppe', 'anliegen', 'q', FILTER, NOTIZ])); });
      })));
      wrap.appendChild(el('h4', { 'class': 'assistent__abschnitt', text: 'Andere Wege' }));
      wrap.appendChild(wahlListe(data.ziele.filter(function (z) { return !(z.id === 'angehoerige' && ST.person); }).map(function (z) {
        return wahlKarte(z.titel, z.hinweis, function () {
          if (z.id === 'angehoerige') gehe(mit({ person: 'angehoerige' }, ['q']));
          else gehe(mit({ ziel: z.id }, ['bereich', 'gruppe', 'anliegen', 'q', FILTER, NOTIZ]));
        }, { illu: z.illu });
      }), 'wide'));
    } else if (schritt.typ === 'bereich') {
      var t = themaById(ST.bereich);
      wrap.appendChild(ueberschrift('Worum geht es beim Thema „' + t.titel + '“?'));
      var karten = [];
      var gesehen = {};
      data.anliegen.filter(function (a) { return a.thema === t.slug; }).forEach(function (a) {
        if (a.gruppe) {
          if (!gesehen[a.gruppe]) { gesehen[a.gruppe] = true; karten.push(gruppeKarte(gruppeById(a.gruppe))); }
        } else karten.push(anliegenKarte(a));
      });
      wrap.appendChild(wahlListe(karten));
      wrap.appendChild(el('p', { 'class': 'assistent__extra' }, [
        'Nicht dabei? ', el('a', { href: t.url, text: 'Mehr zum Thema „' + t.titel + '“' }), ' oder ',
        el('a', { href: meldenLink(null), text: 'bei uns melden' }), '.'
      ]));
    } else if (schritt.typ === 'gruppe') {
      var g = gruppeById(ST.gruppe);
      wrap.appendChild(ueberschrift(g.frage || g.titel));
      wrap.appendChild(wahlListe(data.anliegen.filter(function (a) { return a.gruppe === g.id; }).map(anliegenKarte)));
    } else if (schritt.typ === 'filter') {
      var f = frage(schritt.id);
      wrap.appendChild(ueberschrift(f.titel));
      wrap.appendChild(el('p', { 'class': 'assistent__frage-art', text: 'Ihre Antwort ändert die Liste der Anbieter.' }));
      wrap.appendChild(wahlListe(f.optionen.map(function (o) {
        var st = {};
        st[FILTER + schritt.id] = o.id;
        return wahlKarte(o.titel, '', function () { gehe(mit(st)); }, { gewaehlt: ST[FILTER + schritt.id] === o.id });
      })));
      wrap.appendChild(aktionen(lauf, {
        index: idx,
        ueberspringenText: 'Überspringen (alle zeigen)',
        ueberspringen: function () { var st = {}; st[FILTER + schritt.id] = '-'; gehe(mit(st)); }
      }));
      return wrap;
    } else if (schritt.typ === 'ort') {
      wrap.appendChild(ueberschrift('In welcher Stadt suchen Sie?'));
      wrap.appendChild(wahlListe(data.orte.map(function (o) {
        return wahlKarte(o, '', function () { gehe(mit({ stadt: o })); }, { gewaehlt: ST.stadt === o });
      }), 'chips'));
      wrap.appendChild(ortFeld());
    } else if (schritt.typ === 'werkzeug') {
      wrap.appendChild(ueberschrift('Womit möchten Sie anfangen?'));
      wrap.appendChild(wahlListe(data.alltag.map(function (w) {
        return wahlKarte(w.titel, w.hinweis, function () { gehe(mit({ werkzeug: w.id })); }, { illu: w.illu });
      }), 'wide'));
    } else if (schritt.typ === 'info-thema') {
      wrap.appendChild(ueberschrift('Zu welchem Thema möchten Sie sich informieren?'));
      wrap.appendChild(wahlListe(data.themen.map(function (t2) {
        return wahlKarte(t2.titel, '', function () { gehe(mit({ bereich: t2.slug })); });
      })));
    }
    wrap.appendChild(aktionen(lauf, { index: idx }));
    return wrap;
  }

  function renderNotiz(a, i) {
    var fid = a.notizfragen[i];
    var f = frage(fid);
    var wrap = el('div', { 'class': 'assistent__form' });
    wrap.appendChild(ueberschrift(f.titel));
    wrap.appendChild(el('p', { 'class': 'assistent__frage-art' }, [
      el('strong', { text: 'Für Ihr Gespräch mit dem Anbieter. ' }), 'Die Antwort ändert die Liste nicht, sie kommt auf Ihren Notizzettel.'
    ]));
    if (f.hinweis) wrap.appendChild(el('p', { 'class': 'assistent__extra', text: f.hinweis }));
    wrap.appendChild(wahlListe(f.optionen.map(function (o) {
      var st = {};
      st[NOTIZ + fid] = o.id;
      return wahlKarte(o.titel, '', function () { gehe(mit(st)); }, { gewaehlt: ST[NOTIZ + fid] === o.id });
    })));
    var box = el('div', { 'class': 'assistent__actions' });
    box.appendChild(button('Zurück', 'btn--secondary', function () {
      if (i === 0) gehe(mit({}, ['notizen']));
      else gehe(mit({}, [NOTIZ + a.notizfragen[i - 1]]));
    }));
    box.appendChild(button('Überspringen', 'btn--secondary', function () { var st = {}; st[NOTIZ + fid] = '-'; gehe(mit(st)); }));
    box.appendChild(button('Zur Liste', 'btn--secondary', function () {
      var st = {};
      a.notizfragen.slice(i).forEach(function (x) { if (!ST[NOTIZ + x]) st[NOTIZ + x] = '-'; });
      gehe(mit(st));
    }));
    wrap.appendChild(box);
    return wrap;
  }

  /* ---- Combobox (Suche und Ortsfeld) --------------------------------------------- */
  /* opt: { id, label, hinweis, platzhalter, wert, knopf, vorschlaege(text) → [{label, hinweis, wert}],
            waehle(vorschlag), absenden(text) } */
  function combobox(opt) {
    uid += 1;
    var id = opt.id + '-' + uid;
    var form = el('form', { 'class': 'suche', role: opt.rolle || null, action: opt.action || null, method: 'get', novalidate: '' });
    form.appendChild(el('label', { 'class': 'suche__label', 'for': id, text: opt.label }));
    if (opt.hinweis) form.appendChild(el('p', { 'class': 'suche__hinweis', id: id + '-hinweis', text: opt.hinweis }));
    var zeile = el('div', { 'class': 'suche__zeile' });
    var feld = el('div', { 'class': 'suche__feld' });
    var input = el('input', {
      'class': 'form-field__input suche__input', id: id, name: opt.name || 'q', type: 'text',
      role: 'combobox', 'aria-autocomplete': 'list', 'aria-expanded': 'false', 'aria-controls': id + '-liste',
      autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', enterkeyhint: 'search',
      placeholder: opt.platzhalter || null, 'aria-describedby': opt.hinweis ? id + '-hinweis' : null
    });
    if (opt.wert) input.value = opt.wert;
    var liste = el('ul', { 'class': 'suche__liste', id: id + '-liste', role: 'listbox', 'aria-label': 'Vorschläge' });
    liste.hidden = true;
    var status = el('p', { 'class': 'visually-hidden', role: 'status', 'aria-live': 'polite' });
    feld.appendChild(input);
    feld.appendChild(liste);
    zeile.appendChild(feld);
    var knopf = el('button', { type: 'submit', 'class': 'btn ' + (opt.knopfKlasse || 'btn--secondary') + ' suche__knopf' }, [icon('suche'), ' ' + (opt.knopf || 'Suchen')]);
    zeile.appendChild(knopf);
    form.appendChild(zeile);
    form.appendChild(status);

    var aktuell = [];
    var aktiv = -1;
    function schliessen() {
      liste.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      aktiv = -1;
    }
    function markiere(i) {
      aktiv = i;
      Array.prototype.forEach.call(liste.children, function (li, n) { li.setAttribute('aria-selected', n === i ? 'true' : 'false'); });
      if (i >= 0 && liste.children[i]) {
        input.setAttribute('aria-activedescendant', liste.children[i].id);
        liste.children[i].scrollIntoView({ block: 'nearest' });
      } else input.removeAttribute('aria-activedescendant');
    }
    function zeige() {
      var text = input.value;
      aktuell = text.trim().length >= 2 ? opt.vorschlaege(text) : [];
      liste.replaceChildren();
      aktuell.forEach(function (v, n) {
        var li = el('li', { 'class': 'suche__option', role: 'option', id: id + '-opt-' + n, 'aria-selected': 'false' }, [
          el('span', { 'class': 'suche__option-titel', text: v.label })
        ]);
        if (v.hinweis) li.appendChild(el('span', { 'class': 'suche__option-hinweis', text: v.hinweis }));
        li.addEventListener('mousedown', function (e) { e.preventDefault(); }); // Fokus bleibt im Feld
        li.addEventListener('click', function () { schliessen(); opt.waehle(v); });
        liste.appendChild(li);
      });
      aktiv = -1;
      input.removeAttribute('aria-activedescendant');
      var offen = aktuell.length > 0;
      liste.hidden = !offen;
      input.setAttribute('aria-expanded', offen ? 'true' : 'false');
      if (text.trim().length >= 2) {
        status.textContent = offen ? aktuell.length + (aktuell.length === 1 ? ' Vorschlag' : ' Vorschläge') + '. Mit den Pfeiltasten auswählen.' : 'Keine Vorschläge.';
      } else status.textContent = '';
    }
    input.addEventListener('input', zeige);
    input.addEventListener('focus', function () { if (input.value.trim().length >= 2) zeige(); });
    input.addEventListener('blur', function () { window.setTimeout(schliessen, 150); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (liste.hidden) zeige();
        if (aktuell.length) markiere(aktiv + 1 >= aktuell.length ? 0 : aktiv + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (aktuell.length && !liste.hidden) markiere(aktiv <= 0 ? aktuell.length - 1 : aktiv - 1);
      } else if (e.key === 'Enter') {
        if (!liste.hidden && aktiv >= 0) {
          e.preventDefault();
          var v = aktuell[aktiv];
          schliessen();
          opt.waehle(v);
        }
      } else if (e.key === 'Escape') {
        if (!liste.hidden) { e.preventDefault(); schliessen(); }
        else if (input.value) { e.preventDefault(); input.value = ''; status.textContent = ''; }
      }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      schliessen();
      opt.absenden(input.value);
    });
    return { form: form, input: input };
  }

  /* ---- Freitextsuche ----------------------------------------------------------------- */
  var KATALOG = null;
  function katalog() {
    if (!KATALOG) {
      KATALOG = { anliegen: data.anliegen, gruppen: data.gruppen, ratgeber: data.ratgeber, themen: data.themen, orte: data.ortVorschlaege };
    }
    return KATALOG;
  }
  function treffer(text) {
    var r = S.suche(text, katalog());
    var liste = [];
    r.treffer.forEach(function (t) {
      if (t.art === 'gruppe') liste.push({ art: 'gruppe', id: t.id, label: t.titel, hinweis: gruppeById(t.id).hinweis });
      else {
        var a = anliegenById(t.id);
        var thema = themaById(a.thema);
        liste.push({ art: 'anliegen', id: t.id, label: a.titel, hinweis: (hatListe(a) ? thema.titel : 'Ratgeber') + (r.ort && hatListe(a) ? ' · in ' + r.ort : '') });
      }
    });
    r.ratgeber.forEach(function (b) { liste.push({ art: 'ratgeber', id: b.id, label: b.titel, hinweis: 'Beitrag im Ratgeber', url: b.url }); });
    r.themen.forEach(function (t) { liste.push({ art: 'thema', id: t.id, label: t.titel, hinweis: 'Thema' }); });
    return { liste: liste, roh: r };
  }
  /* Zielzustand eines Vorschlags; im Einstieg (Startseite) als Seitenwechsel nach /hilfe-finden/ */
  function nimmTreffer(v, text) {
    if (v.art === 'ratgeber') { window.location.href = v.url; return; }
    var st = zielVon(v, text);
    if (EINSTIEG) window.location.href = query(st, ZIEL);
    else gehe(st);
  }
  function zielVon(v, text) {
    if (v.art === 'thema') return mit({ bereich: v.id }, ['gruppe', 'anliegen', 'q', FILTER, NOTIZ, 'notizen']);
    if (v.art === 'gruppe') return mit({ gruppe: v.id }, ['anliegen', 'q', FILTER, NOTIZ, 'notizen']);
    var a = anliegenById(v.id);
    var r = S.suche(text || '', katalog());
    var extra = {};
    if (r.ort) extra.stadt = r.ort;
    if (r.person) extra.person = r.person;
    // Notizfragen aus der Eingabe vorbelegen („kurvige Treppe“)
    (a.notizfragen || []).forEach(function (fid) {
      var o = S.passendeOption(text || '', frage(fid).optionen);
      if (o) extra[NOTIZ + fid] = o;
    });
    return Object.assign(mit({ anliegen: a.id }, ['notizen', 'q', FILTER, NOTIZ]), extra);
  }

  /* Einstieg im Hero der Startseite: das Formular aus dem HTML (funktioniert ohne JS) wird durch die
     Combobox ersetzt. Schon getippter Text und der Fokus bleiben erhalten. */
  function starteEinstieg() {
    var alt = root.querySelector('[data-einstieg-form]');
    if (!alt) return;
    var altInput = alt.querySelector('input');
    var wert = altInput ? altInput.value : '';
    var hatteFokus = alt.contains(document.activeElement);
    var cb = combobox({
      id: 'hero-suche',
      label: 'Was suchen Sie?',
      platzhalter: altInput ? altInput.getAttribute('placeholder') : null,
      knopf: 'Hilfe finden',
      knopfKlasse: 'btn--primary',
      rolle: 'search',
      action: ZIEL,
      wert: wert,
      vorschlaege: function (text) { return treffer(text).liste; },
      waehle: function (v) { nimmTreffer(v, cb.input.value); },
      absenden: function (text) {
        if (!text.trim()) { cb.input.focus(); return; }
        window.location.href = query({ q: text.trim() }, ZIEL);
      }
    });
    cb.form.classList.add('suche--hero');
    alt.parentNode.replaceChild(cb.form, alt);
    if (hatteFokus) {
      cb.input.focus();
      if (wert.trim().length >= 2) cb.input.dispatchEvent(new Event('input'));
    }
  }

  function sucheBaustein() {
    var box = el('div', { 'class': 'assistent__suche' });
    var ergebnis = el('div', { 'class': 'suche__ergebnis', 'aria-live': 'polite' });
    var cb = combobox({
      id: 'suche',
      label: 'Was suchen Sie?',
      hinweis: 'Zum Beispiel „Haushaltshilfe in Solingen“ oder „Dusche statt Badewanne“',
      knopf: 'Suchen',
      rolle: 'search',
      action: '/hilfe-finden/',
      wert: ST.q || '',
      vorschlaege: function (text) { return treffer(text).liste; },
      waehle: function (v) { nimmTreffer(v, cb.input.value); },
      absenden: function (text) {
        if (!text.trim()) { cb.input.focus(); return; }
        ST = mit({ q: text.trim() });
        history.pushState(null, '', query(ST));
        merkeSuche();
        zeigeErgebnis(text);
        var h = ergebnis.querySelector('[data-such-titel]');
        if (h) h.focus();
      }
    });
    function zeigeErgebnis(text) {
      ergebnis.replaceChildren();
      var t = treffer(text);
      var h = el('h4', { 'class': 'suche__ergebnis-titel', tabindex: '-1', 'data-such-titel': '' });
      ergebnis.appendChild(h);
      if (!t.liste.length) {
        h.textContent = 'Dazu haben wir nichts gefunden';
        ergebnis.appendChild(el('p', { text: 'Versuchen Sie ein anderes Wort oder wählen Sie eines der Themen. Wenn nichts passt, suchen wir persönlich für Sie.' }));
        ergebnis.appendChild(wahlListe(data.themen.map(function (th) {
          return wahlKarte(th.titel, '', function () { gehe(mit({ bereich: th.slug }, ['q', 'gruppe', 'anliegen'])); });
        })));
        var melden = el('a', { href: meldenLink(null, text), 'class': 'btn btn--secondary assistent__melden-btn' }, ['Bei uns melden']);
        ergebnis.appendChild(el('p', { 'class': 'assistent__melden-zeile' }, [melden]));
        return;
      }
      h.textContent = 'Passend zu „' + text.trim() + '“';
      ergebnis.appendChild(wahlListe(t.liste.map(function (v) {
        return wahlKarte(v.label, v.hinweis, function () { nimmTreffer(v, text); });
      })));
    }
    box.appendChild(cb.form);
    box.appendChild(ergebnis);
    if (ST.q) zeigeErgebnis(ST.q);
    return box;
  }

  function ortFeld() {
    var cb = combobox({
      id: 'ort',
      label: 'Andere Stadt',
      hinweis: 'Ortsnamen eingeben, zum Beispiel Ratingen oder Velbert',
      knopf: 'Weiter',
      name: 'stadt',
      wert: ST.stadt && data.orte.indexOf(ST.stadt) === -1 ? ST.stadt : '',
      vorschlaege: function (text) {
        var q = S.normalisiere(text);
        return data.ortVorschlaege.filter(function (o) { return S.normalisiere(o).indexOf(q) === 0; })
          .concat(data.ortVorschlaege.filter(function (o) { var n = S.normalisiere(o); return n.indexOf(q) > 0; }))
          .slice(0, 6).map(function (o) { return { label: o, wert: o }; });
      },
      waehle: function (v) { gehe(mit({ stadt: v.wert })); },
      absenden: function (text) {
        var t = text.trim();
        if (!t) { cb.input.focus(); return; }
        var exakt = data.ortVorschlaege.filter(function (o) { return S.normalisiere(o) === S.normalisiere(t); })[0];
        gehe(mit({ stadt: exakt || t }));
      }
    });
    cb.form.classList.add('suche--ort');
    return cb.form;
  }

  /* ---- Ergebnis --------------------------------------------------------------------- */
  function gewaehlteKategorien(a) {
    var kat = a.kategorien.slice();
    filterFragen(a).forEach(function (fid) {
      var o = option(fid, ST[FILTER + fid]);
      if (o && o.kategorien) kat = o.kategorien.filter(function (k) { return kat.indexOf(k) !== -1; });
    });
    return kat;
  }
  function gewaehlteAngebotsform(a) {
    var form = '';
    filterFragen(a).forEach(function (fid) {
      var o = option(fid, ST[FILTER + fid]);
      if (o && o.angebotsform) form = o.angebotsform;
    });
    return form;
  }

  function notizZeilen(a) {
    var zeilen = [{ label: 'Anliegen', wert: a.titel }];
    if (ST.person) zeilen.push({ label: 'Für', wert: 'einen Angehörigen' });
    if (ST.stadt) zeilen.push({ label: 'Stadt', wert: ST.stadt });
    filterFragen(a).forEach(function (fid) {
      var o = option(fid, ST[FILTER + fid]);
      if (o) zeilen.push({ label: frage(fid).notiz, wert: o.titel });
    });
    (a.notizfragen || []).forEach(function (fid) {
      var o = option(fid, ST[NOTIZ + fid]);
      if (o) zeilen.push({ label: frage(fid).notiz, wert: o.titel, notiz: true });
    });
    return zeilen;
  }

  /* „Bei uns melden“: vorausgefülltes Anfrageformular /anfrage/ (main.js 2. übernimmt thema, wer, ort, leistung, notiz) */
  function meldenLink(a, freitext) {
    var p = new URLSearchParams();
    var thema = a ? a.thema : (ST.bereich || '');
    if (thema) p.set('thema', thema);
    p.set('wer', ST.person ? 'angehoerige' : 'selbst');
    if (ST.stadt) p.set('ort', ST.stadt);
    if (a && data.leistungSlugs[a.id] && data.leistungSlugs[a.id].length) p.set('leistung', data.leistungSlugs[a.id].join(','));
    var notiz = '';
    if (a) notiz = L.notizText('Mein Anliegen', notizZeilen(a));
    else if (freitext) notiz = 'Ich suche: ' + freitext.trim();
    if (notiz) p.set('notiz', notiz);
    return '/anfrage/?' + p.toString();
  }

  function meldenBlock(a, text) {
    var box = el('div', { 'class': 'assistent__melden' });
    box.appendChild(el('h4', { 'class': 'assistent__melden-titel', text: 'Lieber persönlich vermitteln lassen?' }));
    box.appendChild(el('p', { text: text || 'Dann melden Sie sich bei uns. Jemand aus unserem Team sucht für Sie, kostenlos und ohne Verpflichtung. Ihre Angaben übernehmen wir ins Formular, dort können Sie alles noch ändern.' }));
    var link = el('a', { href: meldenLink(a), 'class': 'btn btn--primary btn--block-mobile' }, ['Bei uns melden']);
    link.appendChild(icon('arrow'));
    box.appendChild(link);
    return box;
  }

  function weitereLinks(links) {
    if (!links.length) return null;
    var ul = el('ul', { 'class': 'assistent__links', 'aria-label': 'Weitere passende Angebote' });
    links.forEach(function (s) { ul.appendChild(el('li', {}, [el('a', { href: s.href, text: s.label })])); });
    return ul;
  }

  function notizzettel(a) {
    var zeilen = notizZeilen(a);
    var box = el('div', { 'class': 'notizzettel', 'data-notizzettel': '' });
    box.appendChild(el('h4', { 'class': 'notizzettel__titel', text: 'Das sollten Sie am Telefon sagen' }));
    var ul = el('ul', { 'class': 'notizzettel__liste' });
    zeilen.forEach(function (z) {
      ul.appendChild(el('li', {}, [el('span', { 'class': 'notizzettel__label', text: z.label + ': ' }), z.wert]));
    });
    box.appendChild(ul);
    var text = L.notizText('Das sollten Sie am Telefon sagen', zeilen);
    var betreff = 'Notizzettel: ' + a.titel + ' – ' + (root.getAttribute('data-seitenname') || '');
    var akt = el('div', { 'class': 'notizzettel__aktionen' });
    akt.appendChild(button('', 'btn--secondary', function () {
      document.body.classList.add('is-printing-notiz');
      window.print();
      window.setTimeout(function () { document.body.classList.remove('is-printing-notiz'); }, 1000);
    }));
    akt.lastChild.replaceChildren(icon('drucken'), document.createTextNode(' Drucken'));
    akt.appendChild(el('a', { 'class': 'btn btn--secondary', href: L.mailtoLink(betreff, text) }, [icon('mail'), ' Per E-Mail senden']));
    akt.appendChild(el('a', { 'class': 'btn btn--secondary', href: L.whatsappLink(text), target: '_blank', rel: 'noopener noreferrer' }, [icon('chat'), ' Per WhatsApp senden']));
    box.appendChild(akt);
    var aendern = el('a', { href: query(mit({ notizen: '1' }, [NOTIZ])), 'class': 'notizzettel__aendern' }, ['Notizen ändern']);
    aendern.addEventListener('click', function (e) { e.preventDefault(); gehe(mit({ notizen: '1' }, [NOTIZ])); });
    box.appendChild(el('p', { 'class': 'notizzettel__fuss' }, [aendern]));
    return box;
  }
  window.addEventListener('afterprint', function () { document.body.classList.remove('is-printing-notiz'); });

  function renderErgebnis(lauf) {
    var wrap = el('div', { 'class': 'assistent__result' });
    if (lauf.ergebnis === 'alltag') return ergebnisAlltag(wrap, lauf);
    if (lauf.ergebnis === 'informieren') return ergebnisInformieren(wrap, lauf);
    var a = lauf.anliegen;
    var thema = themaById(a.thema);
    if (lauf.ergebnis === 'ratgeber') {
      wrap.appendChild(ueberschrift('Zu „' + a.titel + '“ haben wir einen Ratgeber'));
      wrap.appendChild(el('p', { 'class': 'assistent__summary', text: 'Dafür gibt es keine Anbieter-Liste. Im Ratgeber finden Sie, was Sie wissen müssen.' }));
      var haupt = a.ratgeber && a.ratgeber[0];
      var w = werkzeugVon(a);
      var mainWrap = el('div', { 'class': 'assistent__main' });
      if (haupt) {
        var m = el('a', { href: haupt.url, 'class': 'btn btn--secondary btn--block-mobile' }, ['Beitrag lesen: ' + haupt.titel]);
        m.appendChild(icon('arrow'));
        mainWrap.appendChild(m);
      }
      wrap.appendChild(mainWrap);
      var links = [];
      if (a.ratgeber && a.ratgeber[1]) links.push({ href: a.ratgeber[1].url, label: 'Auch interessant: ' + a.ratgeber[1].titel });
      if (w) links.push({ href: w.url, label: w.titel + ' öffnen' });
      var ul = weitereLinks(links);
      if (ul) wrap.appendChild(ul);
      wrap.appendChild(verwandtBlock(a, null, 'Passende Anbieter dazu'));
      wrap.appendChild(meldenBlock(a));
      wrap.appendChild(aktionen(lauf, { index: lauf.pfad.length }));
      return wrap;
    }

    var titel = ueberschrift('„' + a.titel + '“ in ' + ST.stadt);
    wrap.appendChild(titel);
    var zahl = el('p', { 'class': 'assistent__trefferzahl', role: 'status', 'aria-live': 'polite', text: 'Passende Anbieter werden gesucht …' });
    wrap.appendChild(zahl);

    var notizenOffen = ST.notizen && offeneNotiz(a) === -1 && notizZeilen(a).some(function (z) { return z.notiz; });
    if (notizenOffen) wrap.appendChild(notizzettel(a));

    var listeWrap = el('div', { 'class': 'assistent__liste' });
    wrap.appendChild(listeWrap);
    var nachListe = el('div', { 'class': 'assistent__nach-liste' });
    wrap.appendChild(nachListe);

    var liste = window.AnbieterListe && window.AnbieterListe.baue({
      url: root.getAttribute('data-anbieter-url'),
      seitenname: root.getAttribute('data-seitenname'),
      prefix: 'a-anb',
      leerKasten: false,
      ausfuehrlich: true,
      introText: function () { return 'Sortiert: zuerst Anbieter in ' + ST.stadt + ', dann Anbieter, die auch nach ' + ST.stadt + ' kommen. Wählen Sie einen oder mehrere aus, um die Kontaktdaten zu drucken oder weiterzuleiten.'; }
    });
    if (!liste) {
      zahl.textContent = 'Die Liste ist gerade nicht verfügbar.';
      nachListe.appendChild(meldenBlock(a));
      return wrap;
    }
    listeWrap.appendChild(liste.wurzel);

    window.AnbieterListe.laden(root.getAttribute('data-anbieter-url')).then(function (d) {
      var alle = d ? d.anbieter : [];
      var auswahl = { kategorien: gewaehlteKategorien(a), ort: ST.stadt, angebotsform: gewaehlteAngebotsform(a) };
      var t = L.filtereAnliegen(alle, auswahl);
      return liste.zeige({
        treffer: t, schluessel: [a.id, ST.stadt, auswahl.kategorien.join(','), auswahl.angebotsform].join('|'),
        thema: a.thema, themaTitel: thema.titel, ort: ST.stadt
      }).then(function (n) {
        if (!d) {
          zahl.textContent = 'Die Liste konnte gerade nicht geladen werden. Wir suchen gern persönlich für Sie.';
          nachListe.appendChild(meldenBlock(a));
          return;
        }
        if (n > 0) {
          zahl.textContent = n + (n === 1 ? ' Anbieter gefunden.' : ' Anbieter gefunden.');
          if (!notizenOffen && (a.notizfragen || []).length) nachListe.appendChild(notizEinladung(a));
          nachListe.appendChild(meldenBlock(a, 'Nichts Passendes dabei, oder möchten Sie nicht selbst anrufen? Dann melden Sie sich bei uns. Jemand aus unserem Team sucht für Sie, kostenlos und ohne Verpflichtung. Ihre Angaben übernehmen wir ins Formular.'));
        } else {
          zahl.textContent = 'In ' + ST.stadt + ' haben wir zu „' + a.titel + '“ noch keinen Anbieter in unserer Liste.';
          nachListe.appendChild(verwandtBlock(a, alle, 'Vielleicht passt eines dieser Anliegen'));
          nachListe.appendChild(meldenBlock(a, 'Das ist kein Problem: Jemand aus unserem Team sucht persönlich für Sie, kostenlos und ohne Verpflichtung. Ihre Angaben übernehmen wir ins Formular.'));
        }
        var links = [{ href: thema.url, label: 'Mehr zum Thema „' + thema.titel + '“' }];
        if (a.ratgeber && a.ratgeber[0]) links.push({ href: a.ratgeber[0].url, label: 'Ratgeber: ' + a.ratgeber[0].titel });
        haengeAn(nachListe, weitereLinks(links));
        nachListe.appendChild(aktionen(lauf, { index: lauf.pfad.length }));
      });
    });
    return wrap;
  }

  function notizEinladung(a) {
    var box = el('div', { 'class': 'assistent__notiz-einladung' });
    box.appendChild(el('h4', { 'class': 'assistent__abschnitt', text: 'Gut vorbereitet anrufen' }));
    box.appendChild(el('p', { text: (a.notizfragen.length === 1 ? 'Eine kurze Frage' : a.notizfragen.length + ' kurze Fragen') + ' für Ihr Gespräch, alle freiwillig. Daraus wird ein Notizzettel zum Drucken oder Weiterschicken. Die Liste ändert sich dadurch nicht.' }));
    box.appendChild(button('Notizzettel erstellen', 'btn--secondary', function () { gehe(mit({ notizen: '1' })); }));
    return box;
  }

  /* Verwandte Anliegen mit echter Trefferzahl für die gewählte Stadt (alle = Anbieterliste; null = ohne Zahlen) */
  function verwandtBlock(a, alle, titel) {
    var box = el('div', { 'class': 'assistent__verwandt' });
    var verwandt = (a.verwandt || []).map(anliegenById).filter(Boolean);
    var zahlen = alle && ST.stadt ? L.zaehleAnliegen(alle, verwandt, ST.stadt) : null;
    var karten = [];
    verwandt.forEach(function (v) {
      var hinweis = anliegenHinweis(v);
      if (zahlen && hatListe(v)) {
        if (!zahlen[v.id]) return;
        hinweis = zahlen[v.id] + (zahlen[v.id] === 1 ? ' Anbieter in ' : ' Anbieter in ') + ST.stadt;
      }
      karten.push(wahlKarte(v.titel, hinweis, function () { waehleAnliegen(v); }));
    });
    if (!karten.length) return el('div');
    box.appendChild(el('h4', { 'class': 'assistent__abschnitt', text: titel }));
    box.appendChild(wahlListe(karten));
    return box;
  }

  function ergebnisInformieren(wrap, lauf) {
    var t = themaById(ST.bereich);
    wrap.appendChild(ueberschrift('Das haben wir für Sie gefunden'));
    wrap.appendChild(el('p', { 'class': 'assistent__summary', text: 'Sie möchten sich zum Thema „' + t.titel + '“ informieren.' }));
    var b = t.ratgeber || [];
    var main = b[0] ? { href: b[0].url, label: 'Beitrag lesen: ' + b[0].titel } : { href: '/ratgeber/', label: 'Zum Ratgeber' };
    var m = el('a', { href: main.href, 'class': 'btn btn--secondary btn--block-mobile' }, [main.label]);
    m.appendChild(icon('arrow'));
    wrap.appendChild(el('div', { 'class': 'assistent__main' }, [m]));
    haengeAn(wrap, weitereLinks([
      { href: t.url, label: 'Mehr zum Thema „' + t.titel + '“' },
      b[1] ? { href: b[1].url, label: 'Auch interessant: ' + b[1].titel } : { href: '/ratgeber/', label: 'Alle Beiträge im Ratgeber' }
    ]));
    wrap.appendChild(aktionen(lauf, { index: lauf.pfad.length }));
    return wrap;
  }

  function ergebnisAlltag(wrap, lauf) {
    var w = alltagById(ST.werkzeug);
    wrap.appendChild(ueberschrift('Das haben wir für Sie gefunden'));
    wrap.appendChild(el('p', { 'class': 'assistent__summary', text: 'Sie möchten Ihren Alltag besser organisieren – mit „' + w.titel + '“.' }));
    var main;
    if (w.bald) {
      wrap.appendChild(el('p', { 'class': 'assistent__extra', text: 'Dieses Werkzeug kommt bald. Schauen Sie in der Zwischenzeit gern in „Mein Alltag“ vorbei.' }));
      main = { href: '/mein-alltag/', label: 'Zu „Mein Alltag“' };
    } else main = { href: w.url, label: w.titel + ' öffnen' };
    var m = el('a', { href: main.href, 'class': 'btn btn--secondary btn--block-mobile' }, [main.label]);
    m.appendChild(icon('arrow'));
    wrap.appendChild(el('div', { 'class': 'assistent__main' }, [m]));
    haengeAn(wrap, weitereLinks(data.alltag.filter(function (x) { return !x.bald && x.id !== w.id; }).slice(0, 2).map(function (x) {
      return { href: x.url, label: x.titel };
    })));
    wrap.appendChild(aktionen(lauf, { index: lauf.pfad.length }));
    return wrap;
  }

  /* ---- Start ---------------------------------------------------------------------- */
  function fehlschlag() { root.classList.add('assistent--ohne-app'); }
  var url = root.getAttribute('data-assistent-url');
  if (!url || !window.fetch || !window.history || !history.pushState) { fehlschlag(); return; }
  window.fetch(url, { credentials: 'same-origin' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (d) {
      if (!d || !d.anliegen || !d.themen) throw new Error('Daten unvollständig');
      data = d;
      if (EINSTIEG) { starteEinstieg(); return; }
      ST = ausUrl();
      app.hidden = false;
      render(false);
      var zuletzt = window.location.search;
      window.addEventListener('popstate', function () {
        // Sprünge zu Ankern (#anfrage …) lösen auch popstate aus: nur bei geändertem Zustand neu zeichnen
        if (window.location.search === zuletzt) return;
        zuletzt = window.location.search;
        ST = ausUrl();
        render(true);
      });
      merkeSuche = function () { zuletzt = window.location.search; };
    })
    .catch(fehlschlag);
})();
