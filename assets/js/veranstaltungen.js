/* Veranstaltungskalender – Filter nach Ort und Thema, Ergebniszähler (Progressive Enhancement).
   Die Liste ist serverseitig nach Tag gruppiert (tools/build.py) und ohne JS vollständig sichtbar.
   Hier werden Karten (<li data-ev …>) per hidden-Attribut aus- und Tagesgruppen ohne Treffer ausgeblendet. */
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
    thema = value;
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.getAttribute('data-ev-thema') === value)); });
  }

  function render() {
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
  }

  ort.addEventListener('change', render);
  chips.forEach(function (c) {
    c.addEventListener('click', function () { setThema(c.getAttribute('data-ev-thema')); render(); });
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });
  form.querySelector('[data-ev-reset]').addEventListener('click', function () {
    ort.value = '';
    setThema('');
    render();
  });
  render();
})();
