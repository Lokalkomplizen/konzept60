/*
 * Konzept 60+ – Pflegegradrechner: Leistungen, Reform-Erklärung, passende Hilfe
 *
 * Liest nur die eingebetteten Daten (data/pflegegrad/leistungen.json, hilfe.json
 * über #pgr-daten). Keine Netzwerkanfragen, keine Speicherung.
 * Anzeige (Entscheidung 20.11.2026): Paket mit anzeige="haupt" (2027) ist die
 * Hauptansicht, das Paket mit anzeige="vergleich" (2026) erscheint nur im
 * zugeklappten Kasten „Was ändert sich gegenüber 2026?“.
 * Keine Summenzeilen: Budgets sind zweckgebunden und nicht addierbar.
 *
 * WordPress: unverändert per wp_enqueue_script nach nba.js und vor rechner.js.
 */
(function () {
  'use strict';

  function h(tag, attrs, kinder) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k];
      else if (k === 'class') e.className = attrs[k];
      else e.setAttribute(k, attrs[k]);
    });
    (kinder || []).forEach(function (c) { if (c) e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }

  function euro(n) { return n.toLocaleString('de-DE') + ' €'; }

  function zeitraumText(z) {
    if (z.indexOf('jährlich') === 0) return 'im Jahr';
    if (z.indexOf('monatlich') === 0) return 'im Monat';
    return z.replace(', bis zu', '');
  }

  function betragText(l, grad) {
    var b = l.betraege[String(grad)];
    if (b === null || b === undefined) return null;
    var bisZu = l.zeitraum.indexOf('bis zu') >= 0 ? 'bis zu ' : '';
    return bisZu + euro(b) + ' ' + zeitraumText(l.zeitraum);
  }

  function paket(D, anzeige) {
    return D.leistungen.pakete.filter(function (p) { return p.anzeige === anzeige; })[0];
  }

  function statusBadge(p) {
    var t = (p.status_text && p.status_text[p.rechtsstatus]) || p.rechtsstatus;
    return h('span', { class: 'badge pgr-status pgr-status--' + p.rechtsstatus, text: t });
  }

  function leere(c) { while (c.firstChild) c.removeChild(c.firstChild); return c; }

  // -------------------------------------------------------------------
  // Leistungen 2027 (Hauptansicht)
  // -------------------------------------------------------------------
  function zeigeLeistungen(box, haupt, alt, grad, gradNeu) {
    leere(box);
    box.appendChild(h('p', {}, [statusBadge(haupt)]));
    if (gradNeu !== grad && haupt.rechtsstatus !== 'geltend') {
      box.appendChild(h('p', { text: 'Gezeigt werden die Beträge für Pflegegrad ' + grad + '. Bei einem neuen Antrag nach den geplanten Punktgrenzen käme voraussichtlich ' +
        (gradNeu ? 'Pflegegrad ' + gradNeu : 'kein Pflegegrad') + ' heraus – dann gelten die Beträge dieses Grades.' }));
    }

    var karten = haupt.leistungen.filter(function (l) { return betragText(l, grad); });
    if (!karten.length) {
      box.appendChild(h('p', { text: grad === 1
        ? 'Für Pflegegrad 1 sind nach dem Gesetzentwurf keine dieser Budgets vorgesehen.'
        : 'Ohne Pflegegrad zahlt die Pflegeversicherung keine Leistungen. Die Pflegeberatung ist trotzdem kostenlos.' }));
    }
    var liste = h('ul', { class: 'pgr-leistungen' });
    karten.forEach(function (l) {
      var kinder = [
        h('h4', { class: 'pgr-leistung__titel', text: l.titel }),
        h('p', { class: 'pgr-leistung__betrag', text: betragText(l, grad) })
      ];
      if (l.kurz) kinder.push(h('p', { text: l.kurz }));
      kinder.push(h('p', { class: 'pgr-leistung__voraus', text: 'Voraussetzungen: ' + l.voraussetzungen }));
      (l.offen || []).forEach(function (o) { kinder.push(h('p', { class: 'pgr-leistung__offen', text: 'Noch offen: ' + o })); });
      liste.appendChild(h('li', { class: 'pgr-leistung' }, kinder));
    });
    if (karten.length) {
      box.appendChild(liste);
      // Quellen einmal unter den Karten (alle Budgets stützen sich auf dieselben Quellen)
      var quellen = [];
      karten.forEach(function (l) { l.quellen.forEach(function (q) { if (quellen.indexOf(q.titel) < 0) quellen.push(q.titel); }); });
      box.appendChild(h('p', { class: 'pgr-quelle', text: 'Quellen: ' + quellen.join('; ') + '. ' + (haupt.quellenqualitaet && haupt.rechtsstatus === 'gesetzentwurf'
        ? 'Die Beträge sind bisher nur über Sekundärquellen belegt und werden nach dem Beschluss im Gesetzestext geprüft.' : '') }));
    }

    // Leistungen ohne geprüfte 2027-Beträge: Betrag 2026, ausdrücklich so gekennzeichnet
    if (haupt.ungeprueft && grad > 0) {
      var weitere = alt.leistungen.filter(function (l) {
        return haupt.ungeprueft.ids.indexOf(l.id) >= 0 && betragText(l, grad);
      });
      if (weitere.length) {
        box.appendChild(h('h4', { text: 'Weitere Leistungen' }));
        box.appendChild(h('p', { class: 'pgr-leistung__offen', text: haupt.ungeprueft.text }));
        var ul = h('ul', { class: 'pgr-liste' });
        weitere.forEach(function (l) {
          ul.appendChild(h('li', {}, [h('strong', { text: l.titel + ': ' }), betragText(l, grad) + ' (Stand 2026, ' + l.paragraf + ')']));
        });
        box.appendChild(ul);
      }
    }
  }

  // -------------------------------------------------------------------
  // „Was bedeutet die Reform für mich?“
  // -------------------------------------------------------------------
  function zeigeReform(box, haupt, grad) {
    leere(box);
    box.appendChild(h('p', {}, [statusBadge(haupt)]));
    box.appendChild(h('p', { text: haupt.pflegegrad_texte[String(grad)] }));
    if (grad > 0 && haupt.bestandsschutz) box.appendChild(h('p', { text: haupt.bestandsschutz }));
  }

  // -------------------------------------------------------------------
  // Zugeklappt: Was ändert sich gegenüber 2026?
  // -------------------------------------------------------------------
  function zeigeAenderungen(box, haupt, alt, grad) {
    leere(box);
    var altNach = {};
    alt.leistungen.forEach(function (l) { altNach[l.id] = l; });
    var zeilen = haupt.leistungen.filter(function (l) { return l.ersetzt && altNach[l.ersetzt]; });
    if (grad > 0) {
      var tabelle = h('table', { class: 'pgr-table' }, [
        h('caption', { text: 'Pflegegrad ' + grad + ': bisherige und geplante Leistung (Monatsbeträge, nicht addierbar)' }),
        h('thead', {}, [h('tr', {}, [
          h('th', { scope: 'col', text: 'Bis 2026' }),
          h('th', { scope: 'col', text: haupt.rechtsstatus === 'gesetzentwurf' ? 'Ab 2027 (geplant)' : 'Ab 2027' })
        ])])
      ]);
      var body = h('tbody');
      zeilen.forEach(function (l) {
        var a = altNach[l.ersetzt];
        var aText = betragText(a, grad);
        var nText = betragText(l, grad);
        if (!aText && !nText) return;
        body.appendChild(h('tr', {}, [
          h('td', { text: a.titel + ': ' + (aText || 'keine Leistung') }),
          h('td', { text: l.titel + ': ' + (nText || 'keine Leistung') })
        ]));
      });
      tabelle.appendChild(body);
      box.appendChild(h('div', { class: 'pgr-table-wrap' }, [tabelle]));
    }
    box.appendChild(h('p', { text: 'Was als eigene Leistung entfallen soll:' }));
    var ul = h('ul', { class: 'pgr-liste' });
    haupt.entfaellt.forEach(function (e) { ul.appendChild(h('li', { text: e.text })); });
    box.appendChild(ul);
    var quellen = (alt.leistungen[0] && alt.leistungen[0].quellen[0]) ? alt.leistungen[0].quellen[0].titel : '';
    box.appendChild(h('p', { class: 'pgr-quelle', text: 'Beträge 2026: ' + quellen + '. Geplante Änderungen: ' +
      haupt.gesetz + ' (' + (haupt.verfahren ? 'Drucksache ' + haupt.verfahren.drucksache : '') + '), Beträge nach ' +
      (haupt.entfaellt_quellen || []).map(function (q) { return q.titel; }).join('; ') + '.' }));
  }

  // -------------------------------------------------------------------
  // Passende Hilfe nach Ergebnis
  // -------------------------------------------------------------------
  function passt(wenn, r) {
    var gradOk = wenn.pflegegrad_ab === undefined || r.pflegegrad >= wenn.pflegegrad_ab;
    var modulOk = !wenn.module || wenn.module.some(function (m) {
      var mod = r.module.filter(function (x) { return x.nr === m[0]; })[0];
      return mod && mod.stufe >= m[1];
    });
    return gradOk && modulOk;
  }

  function zeigeHilfe(box, H, r, haupt) {
    leere(box);
    var ohneBudget = r.pflegegrad < 2 && haupt.rechtsstatus !== 'historisch';
    var treffer = H.angebote.filter(function (a) { return passt(a.wenn, r); });
    if (!treffer.length) treffer = H.angebote.filter(function (a) { return a.id === 'haushalt' || a.id === 'alltagsbegleitung'; });
    var ul = h('ul', { class: 'pgr-hilfe' });
    treffer.forEach(function (a) {
      var fin = a.finanzierung.slice();
      var hinweis = a.hinweis || '';
      if (ohneBudget && !(a.auch_ohne_budget && r.pflegegrad === 1)) {
        var vorher = fin.length;
        fin = fin.filter(function (f) { return f !== 'kasse' && f !== 'anerkannt'; });
        if (fin.indexOf('privat') < 0) fin.push('privat');
        if (fin.length !== vorher || a.finanzierung.indexOf('privat') < 0) {
          hinweis = r.pflegegrad === 1
            ? 'Bei Pflegegrad 1 soll es nach dem Gesetzentwurf ab 2027 dafür kein Budget der Pflegekasse mehr geben.'
            : 'Ohne Pflegegrad zahlt die Pflegekasse dafür nicht.';
        }
      }
      var labels = h('ul', { class: 'pgr-finanzierung' });
      fin.forEach(function (f) { labels.appendChild(h('li', { class: 'pgr-fin pgr-fin--' + f, text: H.finanzierung_texte[f] })); });
      var kinder = [
        h('h4', { class: 'pgr-hilfe__titel', text: a.titel }),
        labels
      ];
      if (hinweis) kinder.push(h('p', { class: 'pgr-leistung__voraus', text: hinweis }));
      kinder.push(h('a', { class: 'pgr-hilfe__link no-print', href: '/anfrage/?thema=' + encodeURIComponent(a.thema), 'data-thema': a.thema, text: 'Unterstützung anfragen' }));
      ul.appendChild(h('li', { class: 'pgr-hilfe__item' }, kinder));
    });
    box.appendChild(ul);
    box.appendChild(h('p', { class: 'pgr-quelle', text: H.nrw_hinweis }));
  }

  function zeige(ergebnisEl, r, filter, D) {
    if (!D.leistungen || !D.hilfe) return;
    var haupt = paket(D, 'haupt');
    var alt = paket(D, 'vergleich');
    var gradNeu = D.entwurf ? window.WirHelfenNBA.pflegegradAusPunkten(D.entwurf.pflegegrade, r.gesamtpunkte) : r.pflegegrad;
    var q = function (s) { return ergebnisEl.querySelector(s); };
    if (q('[data-pgr-reform-ich]')) zeigeReform(q('[data-pgr-reform-ich]'), haupt, r.pflegegrad);
    if (q('[data-pgr-leistungen]')) zeigeLeistungen(q('[data-pgr-leistungen]'), haupt, alt, r.pflegegrad, gradNeu);
    if (q('[data-pgr-aenderungen]')) zeigeAenderungen(q('[data-pgr-aenderungen]'), haupt, alt, r.pflegegrad);
    if (q('[data-pgr-hilfe]')) zeigeHilfe(q('[data-pgr-hilfe]'), D.hilfe, r, haupt);
  }

  // Drucken/PDF: zugeklappte Abschnitte der Auswertung für den Druck öffnen, danach wieder schließen
  var geoeffnet = [];
  window.addEventListener('beforeprint', function () {
    geoeffnet = Array.prototype.filter.call(document.querySelectorAll('[data-druck-bereich] details:not([open])'), function (d) { d.open = true; return true; });
  });
  window.addEventListener('afterprint', function () {
    geoeffnet.forEach(function (d) { d.open = false; });
    geoeffnet = [];
  });

  window.WirHelfenLeistungen = { zeige: zeige, _intern: { passt: passt, betragText: betragText } };
})();
