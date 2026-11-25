/* ==========================================================================
   Konzept 60+ – ratgeber.js: Suche auf der Ratgeber-Übersicht /ratgeber/ (Relaunch 3.3)
   Logik: SucheLogik.sucheRatgeber (assets/js/suche-logik.js, unter Node getestet).
   Index: assets/data/ratgeber-suche.json (erzeugt von tools/build.py, nur lesender fetch beim
   ersten Fokus oder bei ?q=… in der Adresse). Suchbegriff steht in der Adresszeile (?q=…,
   history.replaceState), damit Links und „Zurück“ funktionieren. Es wird nichts gespeichert,
   gesendet oder protokolliert. Ohne JS bleibt das Suchfeld verborgen (hidden); Themen, „Häufig
   gesucht“ und die A–Z-Liste führen dann zu allen Beiträgen.
   → WordPress: gleiche Datei, Index als REST-Endpunkt oder statische JSON-Datei im Theme.
   ========================================================================== */
(function () {
  'use strict';
  var root = document.querySelector('[data-ratgeber-suche]');
  if (!root || !window.SucheLogik || !window.fetch) return;

  var form = root.querySelector('[data-ratgeber-suche-form]');
  var input = form.querySelector('input[name="q"]');
  var status = root.querySelector('[data-suche-status]');
  var liste = root.querySelector('[data-suche-treffer]');
  var index = null;
  var laden = null;
  var timer = null;

  root.hidden = false;

  function holeIndex() {
    if (!laden) {
      laden = fetch(root.getAttribute('data-suche-url'), { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
        .then(function (d) { index = d.beitraege || []; return index; })
        .catch(function () {
          laden = null;
          status.textContent = 'Die Suche ist gerade nicht verfügbar. Bitte wählen Sie unten ein Thema.';
          return null;
        });
    }
    return laden;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function adresse(text) {
    var params = new URLSearchParams(window.location.search);
    if (text) params.set('q', text); else params.delete('q');
    var query = params.toString();
    history.replaceState(null, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
  }

  function zeige(text) {
    var t = text.trim();
    liste.textContent = '';
    if (!t) { status.textContent = ''; adresse(''); return; }
    var r = window.SucheLogik.sucheRatgeber(t, index || []);
    adresse(t);
    if (!r.woerter.length) {
      status.textContent = 'Bitte geben Sie ein Stichwort ein, zum Beispiel „Pflegegrad“.';
      return;
    }
    if (!r.treffer.length) {
      status.textContent = 'Kein Beitrag zu „' + t + '“ gefunden. Versuchen Sie ein anderes Wort oder wählen Sie unten ein Thema.';
      return;
    }
    var n = r.treffer.length;
    status.textContent = (r.alleWoerter ? '' : 'Kein Beitrag passt zu allen Wörtern. ') +
      n + (n === 1 ? ' Beitrag' : ' Beiträge') + ' zu „' + t + '“' + (r.alleWoerter ? ' gefunden.' : ' passen teilweise.');
    r.treffer.forEach(function (b) {
      var li = el('li', 'ratgeber-zeile ratgeber-zeile--ohne-bild');
      var box = el('div', 'ratgeber-zeile__text');
      box.appendChild(el('p', 'ratgeber-zeile__meta', b.kategorie + ' · Stand: ' + b.stand));
      var titel = el('p', 'ratgeber-zeile__titel');
      var a = el('a', '', b.titel);
      a.href = b.url;
      titel.appendChild(a);
      box.appendChild(titel);
      li.appendChild(box);
      liste.appendChild(li);
    });
  }

  function suche() {
    var text = input.value;
    if (index) { zeige(text); return; }
    holeIndex().then(function (i) { if (i) zeige(input.value); });
  }

  input.addEventListener('focus', holeIndex, { once: true });
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(suche, 250);
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearTimeout(timer);
    suche();
  });

  var start = new URLSearchParams(window.location.search).get('q');
  if (start) {
    input.value = start;
    suche();
  }
})();
