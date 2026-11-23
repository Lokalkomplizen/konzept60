/* Veranstaltungskalender – Filter nach Ort und Thema, Ergebniszähler (Progressive Enhancement).
   Die Liste ist serverseitig nach Tag gruppiert (tools/build.py) und ohne JS vollständig sichtbar.
   Hier werden Zeilen (<li data-ev …>) per hidden-Attribut aus- und Tagesgruppen ohne Treffer ausgeblendet.
   Der Filterzustand steht in der Adresszeile (?ort=…&thema=…, history.replaceState) – Links wie
   /veranstaltungen/?ort=Hilden&thema=Kultur filtern beim Laden; unbekannte Werte → „Alle“.
   Drucken: alle „Mehr erfahren“-Bereiche werden vorher auf- und danach wieder zugeklappt. */
(function () {
  'use strict';
  var form = document.querySelector('[data-ev-filter]');
  var host = document.querySelector('[data-ev-list]');
  if (!form || !host) return;

  var countEl = form.querySelector('[data-ev-count]');
  var emptyEl = document.querySelector('[data-ev-empty]');
  var ort = form.elements.ort;
  var chips = Array.prototype.slice.call(form.querySelectorAll('[data-ev-thema]'));
  var items = Array.prototype.slice.call(host.querySelectorAll('[data-ev]'));
  var days = Array.prototype.slice.call(host.querySelectorAll('[data-ev-day]'));
  var thema = '';

  function setThema(value) {
    var bekannt = chips.some(function (c) { return c.getAttribute('data-ev-thema') === value; });
    thema = bekannt ? value : '';
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-ev-thema') === thema)); });
  }

  function setOrt(value) {
    var bekannt = Array.prototype.some.call(ort.options, function (o) { return o.value === value; });
    ort.value = bekannt ? value : '';
  }

  function updateUrl() {
    var params = new URLSearchParams(window.location.search);
    if (ort.value) params.set('ort', ort.value); else params.delete('ort');
    if (thema) params.set('thema', thema); else params.delete('thema');
    var query = params.toString();
    history.replaceState(null, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
  }

  function render(schreibeUrl) {
    var n = 0;
    items.forEach(function (li) {
      var show = (!ort.value || li.getAttribute('data-stadt') === ort.value) &&
                 (!thema || li.getAttribute('data-thema') === thema);
      li.hidden = !show;
      if (show) n += 1;
    });
    days.forEach(function (d) { d.hidden = !d.querySelector('[data-ev]:not([hidden])'); });
    countEl.textContent = n + (n === 1 ? ' Veranstaltung' : ' Veranstaltungen');
    if (emptyEl) emptyEl.hidden = n !== 0;
    if (schreibeUrl) updateUrl();
  }

  ort.addEventListener('change', function () { render(true); });
  chips.forEach(function (c) {
    c.addEventListener('click', function () { setThema(c.getAttribute('data-ev-thema')); render(true); });
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.querySelector('[data-ev-reset]').addEventListener('click', function () {
    setOrt('');
    setThema('');
    render(true);
  });

  // Beim Laden: ?ort=…&thema=… übernehmen (ungültige Werte werden aus der Adresszeile entfernt)
  var params = new URLSearchParams(window.location.search);
  var hatParameter = params.has('ort') || params.has('thema');
  setOrt(params.get('ort') || '');
  setThema(params.get('thema') || '');
  render(hatParameter);

  // Drucken: Zusatzinfos mitdrucken
  var geoeffnet = [];
  window.addEventListener('beforeprint', function () {
    geoeffnet = [];
    host.querySelectorAll('details:not([open])').forEach(function (d) { d.open = true; geoeffnet.push(d); });
  });
  window.addEventListener('afterprint', function () {
    geoeffnet.forEach(function (d) { d.open = false; });
    geoeffnet = [];
  });
})();
