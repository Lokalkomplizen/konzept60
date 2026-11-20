/* ==========================================================================
   Wir helfen – alltag.js („Mein Alltag“: Checklisten + Wohnungs-Check)
   1. Checklisten – Fortschritt („3 von 10 erledigt“) und Drucken
   2. Wohnungs-Check – Auswertung aus den Antworten, Drucken
   Es wird NICHTS gespeichert oder gesendet: kein Storage, keine Cookies, kein fetch.
   Haken und Antworten leben nur im geöffneten Tab; zum Aufheben drucken / als PDF speichern.
   Markup erzeugt tools/build.py aus data/checklisten.json bzw. data/wohnungs-check.json.
   → WordPress: wp_enqueue_script nur auf den Seiten „Checklisten“ und „Wohnungs-Check“.
   ========================================================================== */
(function () {
  'use strict';

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* Druck: nur den gewählten Bereich drucken. print.css blendet Navigation, Fußbereich und alle
     anderen [data-druck-bereich] aus, solange body.is-printing gesetzt ist. */
  function drucke(bereich) {
    var body = document.body;
    function aufraeumen() {
      body.classList.remove('is-printing');
      bereich.classList.remove('is-print-target');
      window.removeEventListener('afterprint', aufraeumen);
    }
    body.classList.add('is-printing');
    bereich.classList.add('is-print-target');
    window.addEventListener('afterprint', aufraeumen);
    window.print();
  }

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-drucken]');
    if (!button) return;
    var bereich = button.closest('[data-druck-bereich]');
    if (bereich) drucke(bereich);
  });

  // Druck-Schaltflächen brauchen JS → ohne JS bleiben sie verborgen
  Array.prototype.forEach.call(document.querySelectorAll('[data-drucken][hidden]'), function (b) { b.hidden = false; });

  /* ------------------------------------------------------------------------
     1. Checklisten
     ------------------------------------------------------------------------ */
  function initChecklisten() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-checkliste]'), function (liste) {
      var boxes = Array.prototype.slice.call(liste.querySelectorAll('input[type="checkbox"]'));
      var status = liste.querySelector('[data-fortschritt]');
      if (!boxes.length || !status) return;
      function update() {
        var done = boxes.filter(function (b) { return b.checked; }).length;
        status.hidden = false;
        status.textContent = done + ' von ' + boxes.length + ' erledigt';
      }
      liste.addEventListener('change', update);
      update();
    });
  }

  /* ------------------------------------------------------------------------
     2. Wohnungs-Check
     Antworten Ja / Teilweise / Nein → „Das ist schon gut“ (Ja) und „Hier lohnt sich ein Blick“
     (Teilweise/Nein), sortiert nach Priorität (Sturzgefahr zuerst), dann Nein vor Teilweise.
     Keine Punkte, keine Noten.
     ------------------------------------------------------------------------ */
  function initWohnungsCheck() {
    var form = document.getElementById('wohnungs-check-formular');
    var result = document.querySelector('[data-ergebnis]');
    if (!form || !result) return;

    var formWrap = form.closest('.wc-form-wrap');
    var error = document.getElementById('wc-fehler');
    var intro = result.querySelector('[data-ergebnis-intro]');
    var blockGut = result.querySelector('[data-block-gut]');
    var blockBlick = result.querySelector('[data-block-blick]');
    var gutItems = Array.prototype.slice.call(result.querySelectorAll('[data-gut]'));
    var pool = result.querySelector('.wc-result__pool');
    var blickItems = Array.prototype.slice.call(pool.querySelectorAll('[data-blick]'));
    var zuerst = result.querySelector('[data-blick-zuerst]');
    var danach = result.querySelector('[data-blick-danach]');
    var listeZuerst = result.querySelector('[data-blick-liste-zuerst]');
    var listeDanach = result.querySelector('[data-blick-liste-danach]');
    var fragen = Array.prototype.slice.call(form.querySelectorAll('[data-frage]'));

    function answer(id) {
      var checked = form.querySelector('input[name="' + id + '"]:checked');
      return checked ? checked.value : '';
    }

    form.addEventListener('change', function () {
      error.textContent = '';
    });

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var antworten = {};
      var beantwortet = 0;
      fragen.forEach(function (f) {
        var id = f.getAttribute('data-frage');
        antworten[id] = answer(id);
        if (antworten[id]) beantwortet += 1;
      });
      if (!beantwortet) {
        error.textContent = 'Bitte beantworten Sie mindestens eine Frage, damit wir etwas auswerten können.';
        form.querySelector('input[type="radio"]').focus();
        return;
      }
      error.textContent = '';

      // zurücksetzen
      blickItems.forEach(function (li) { pool.appendChild(li); });
      gutItems.forEach(function (li) { li.hidden = true; });

      var gut = 0;
      var blick = [];
      fragen.forEach(function (f, index) {
        var id = f.getAttribute('data-frage');
        var a = antworten[id];
        if (a === 'ja') {
          var g = result.querySelector('[data-gut="' + id + '"]');
          if (g) { g.hidden = false; gut += 1; }
        } else if (a === 'teilweise' || a === 'nein') {
          var li = pool.querySelector('[data-blick="' + id + '"]');
          if (li) {
            li.querySelector('[data-antwort-label]').textContent = 'Antwort: ' + (a === 'nein' ? 'Nein' : 'Teilweise');
            blick.push({ li: li, prio: Number(li.getAttribute('data-prio')), nein: a === 'nein' ? 0 : 1, index: index });
          }
        }
      });
      blick.sort(function (x, y) { return x.prio - y.prio || x.nein - y.nein || x.index - y.index; });
      blick.forEach(function (b) { (b.prio === 1 ? listeZuerst : listeDanach).appendChild(b.li); });

      blockGut.hidden = gut === 0;
      blockBlick.hidden = blick.length === 0;
      zuerst.hidden = !listeZuerst.children.length;
      danach.hidden = !listeDanach.children.length;

      var text;
      if (!blick.length) {
        text = 'Das sieht rundum gut aus: Bei allen beantworteten Fragen haben Sie „Ja“ gewählt.';
      } else {
        text = blick.length === 1
          ? 'Bei einem Thema lohnt sich ein Blick.'
          : 'Bei ' + blick.length + ' Themen lohnt sich ein Blick.';
        text += ' Das ist ganz normal – oft helfen schon kleine Veränderungen.';
      }
      var offen = fragen.length - beantwortet;
      if (offen) text += ' ' + (offen === 1 ? 'Eine Frage haben Sie ausgelassen.' : offen + ' Fragen haben Sie ausgelassen.');
      intro.textContent = text;

      formWrap.hidden = true;
      result.hidden = false;
      var heading = result.querySelector('#ergebnis-titel');
      heading.focus({ preventScroll: true });
      result.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    });

    result.querySelector('[data-neu-starten]').addEventListener('click', function () {
      result.hidden = true;
      formWrap.hidden = false;
      var first = form.querySelector('input[type="radio"]');
      form.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      if (first) first.focus({ preventScroll: true });
    });
  }

  initChecklisten();
  initWohnungsCheck();
})();
