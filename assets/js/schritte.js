/* ==========================================================================
   Konzept 60+ – schritte.js: Schritt-für-Schritt-Formulare (Vanilla JS, kein Framework)
   --------------------------------------------------------------------------
   Deklarativ über data-Attribute, für jedes Formular wiederverwendbar:

     <form data-schritte                         Schritt-Modus einschalten
           data-schritte-erfolg="<id>"           Element, das nach dem Versand erscheint (.form-success)
           data-versand-betreff="…"              Betreff (main.js kann ihn ergänzen)
           data-versand-einleitung="…">          erste Zeile der Nachricht
       <fieldset data-schritt>…</fieldset>       ein Schritt (Überschrift: .form__legend)
       <fieldset data-schritt="x">…</fieldset>   gleicher Wert = derselbe Schritt; gezeigt wird nur,
       <fieldset data-schritt="x">…</fieldset>   was nicht [hidden] ist (z. B. je Anbieterart)
       <section data-schritt data-schritt-versand hidden>   letzter Schritt: Zusammenfassung + Versand
         <dl data-zusammenfassung></dl>
         <a data-versand="email">…</a> <a data-versand="whatsapp">…</a>
       </section>
     </form>

   Ohne JS: alle Abschnitte sichtbar, Versand-Schritt bleibt hidden, normales Absenden.
   Mit JS: Fortschritt („Schritt 2 von 6“ + Balken), Zurück/Weiter, Prüfung je Schritt,
   Fokus auf die Schritt-Überschrift, Ansage per aria-live.

   Ereignisse am <form> (Schnittstelle zu main.js, das die Feldregeln kennt):
     schritte:pruefen  cancelable; detail { schritt: Element[] | null (= alle), geprueft, fehlerFeld }
                       → Listener prüft, setzt geprueft = true und ruft bei Fehlern preventDefault()
                         (fehlerFeld = erstes fehlerhaftes Feld). Ohne Listener: native Prüfung.
     schritte:wechsel  detail { index, anzahl, schritt: Element[] }
     schritte:versand  detail { zeilen: [[Bezeichnung, Wert], …], betreff, einleitung, gruss }
                       → Listener füllt die Zusammenfassung; ohne Listener werden Felder generisch gelesen.
   Eingehend:  schritte:start (zurück zu Schritt 1), form.reset() → Schritt 1.

   Versand: Links baut WirHelfenAPI.versandLinks() in api.js (Empfänger nur dort).
   Es wird nichts gespeichert: kein Storage, keine Cookies, kein Netzwerkzugriff.
   → WordPress: wp_enqueue_script( 'konzept-schritte', …/schritte.js, [ 'konzept-api' ], …,
                [ 'strategy' => 'defer' ] ) nach main.js
   ========================================================================== */
(function () {
  'use strict';

  var KANAL_TEXT = { email: 'Ihrem E-Mail-Programm', whatsapp: 'WhatsApp' };

  function reducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
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

  function sichtbar(node) { return !node.closest('[hidden]'); }

  function textOhneLeerraum(node) {
    return node ? node.textContent.replace(/\s+/g, ' ').replace(/\s*\*\s*$/, '').trim() : '';
  }

  /* Schritte sammeln: gleicher data-schritt-Wert = ein Schritt */
  function sammleSchritte(form) {
    var schritte = [];
    var nachSchluessel = {};
    form.querySelectorAll('[data-schritt]').forEach(function (node) {
      var key = node.getAttribute('data-schritt');
      if (key && nachSchluessel[key]) { nachSchluessel[key].push(node); return; }
      var schritt = [node];
      schritte.push(schritt);
      if (key) nachSchluessel[key] = schritt;
    });
    return schritte;
  }

  /* Generische Zusammenfassung (Rückfall, wenn kein Listener Zeilen liefert) */
  function generischeZeilen(form) {
    var zeilen = [];
    var gesehen = {};
    Array.prototype.forEach.call(form.elements, function (input) {
      if (!input.name || input.disabled || gesehen[input.name] || !sichtbar(input)) return;
      if (input.closest('[aria-hidden="true"]') || /^(button|submit|reset|hidden)$/.test(input.type)) return;
      var wert = '';
      var label = '';
      if (input.type === 'radio' || input.type === 'checkbox') {
        gesehen[input.name] = true;
        var gewaehlt = form.querySelectorAll('input[name="' + CSS.escape(input.name) + '"]:checked');
        wert = Array.prototype.map.call(gewaehlt, function (i) { return textOhneLeerraum(i.closest('label')); }).join(', ');
        var gruppe = input.closest('fieldset');
        label = gruppe ? textOhneLeerraum(gruppe.querySelector('legend')) : input.name;
      } else if (input.tagName === 'SELECT') {
        wert = input.value ? input.options[input.selectedIndex].text : '';
        label = textOhneLeerraum(input.labels && input.labels[0]);
      } else {
        wert = input.value.trim();
        label = textOhneLeerraum(input.labels && input.labels[0]);
      }
      if (wert) zeilen.push([label || input.name, wert]);
    });
    return zeilen;
  }

  function initSchrittFormular(form) {
    var schritte = sammleSchritte(form);
    if (schritte.length < 2) return;
    var anzahl = schritte.length;
    var aktuell = 0;
    var versandIndex = -1;
    schritte.forEach(function (schritt, i) {
      schritt.forEach(function (node) {
        if (node.hasAttribute('data-schritt-versand')) { versandIndex = i; node.hidden = false; }
      });
    });
    var erfolg = document.getElementById(form.getAttribute('data-schritte-erfolg') || '');
    form.classList.add('form--schritte');

    /* --- Kopf: Fortschritt (Text + Balken) und Live-Region --- */
    var kopf = el('div', 'schritte__kopf');
    var stand = el('p', 'schritte__stand');
    var balken = el('ol', 'schritte__balken');
    balken.setAttribute('aria-hidden', 'true');
    var segmente = schritte.map(function () {
      var seg = el('li', 'schritte__segment');
      balken.appendChild(seg);
      return seg;
    });
    var status = el('p', 'visually-hidden');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    kopf.appendChild(stand);
    kopf.appendChild(balken);
    kopf.appendChild(status);
    var summary = form.querySelector('.form-summary');
    var ersterSchritt = schritte[0][0];
    form.insertBefore(kopf, summary && summary.parentNode === form ? summary : ersterSchritt);

    /* --- Navigation: Zurück / Weiter (nach dem letzten Schritt im DOM) --- */
    var nav = el('div', 'schritte__nav');
    var zurueck = el('button', 'btn btn--secondary schritte__zurueck');
    zurueck.type = 'button';
    zurueck.appendChild(icon('icon-arrow'));
    zurueck.appendChild(document.createTextNode(' Zurück'));
    var weiter = el('button', 'btn btn--primary schritte__weiter');
    weiter.type = 'button';
    weiter.appendChild(document.createTextNode('Weiter '));
    weiter.appendChild(icon('icon-arrow'));
    nav.appendChild(zurueck);
    nav.appendChild(weiter);
    var letzterKnoten = form.querySelectorAll('[data-schritt]');
    letzterKnoten = letzterKnoten[letzterKnoten.length - 1];
    letzterKnoten.parentNode.insertBefore(nav, letzterKnoten.nextSibling);

    function titelVon(index) {
      var kandidaten = [];
      schritte[index].forEach(function (node) {
        kandidaten = kandidaten.concat(Array.prototype.slice.call(node.querySelectorAll('.form__legend, [data-schritt-titel]')));
      });
      var titel = kandidaten.filter(sichtbar)[0] || kandidaten[0];
      if (titel && !titel.hasAttribute('tabindex')) titel.setAttribute('tabindex', '-1');
      return titel;
    }

    function indexVon(node) {
      for (var i = 0; i < schritte.length; i++) {
        if (schritte[i].some(function (s) { return s.contains(node); })) return i;
      }
      return -1;
    }

    function scrolleZumKopf() {
      var rect = kopf.getBoundingClientRect();
      // Nur scrollen, wenn der Kopf nicht im oberen Bereich des Fensters steht
      if (rect.top < 0 || rect.top > window.innerHeight * 0.4) {
        kopf.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
      }
    }

    function zeige(index, fokus) {
      aktuell = Math.max(0, Math.min(index, anzahl - 1));
      schritte.forEach(function (schritt, i) {
        schritt.forEach(function (node) { node.classList.toggle('is-schritt-inaktiv', i !== aktuell); });
      });
      segmente.forEach(function (seg, i) {
        seg.classList.toggle('is-erledigt', i < aktuell);
        seg.classList.toggle('is-aktuell', i === aktuell);
      });
      var titel = titelVon(aktuell);
      var titelText = textOhneLeerraum(titel).replace(/^\d+\s*/, '');
      stand.textContent = 'Schritt ' + (aktuell + 1) + ' von ' + anzahl;
      zurueck.hidden = aktuell === 0;
      weiter.hidden = aktuell === versandIndex;
      nav.classList.toggle('schritte__nav--nur-zurueck', aktuell === versandIndex);
      form.dispatchEvent(new CustomEvent('schritte:wechsel', {
        detail: { index: aktuell, anzahl: anzahl, schritt: schritte[aktuell] }
      }));
      if (fokus) {
        status.textContent = 'Schritt ' + (aktuell + 1) + ' von ' + anzahl + ': ' + titelText;
        if (titel) titel.focus({ preventScroll: true });
        scrolleZumKopf();
      }
    }

    /* Prüfung: main.js antwortet über das Ereignis; sonst native Prüfung */
    function pruefe(schritt) {
      var detail = { schritt: schritt, geprueft: false, fehlerFeld: null };
      var ok = form.dispatchEvent(new CustomEvent('schritte:pruefen', { detail: detail, cancelable: true }));
      if (!detail.geprueft) {
        var bereich = schritt || [form];
        var felder = [];
        bereich.forEach(function (node) {
          felder = felder.concat(Array.prototype.slice.call(node.querySelectorAll('input, select, textarea')));
        });
        var ungueltig = felder.filter(function (f) { return !f.disabled && sichtbar(f) && !f.checkValidity(); })[0];
        if (ungueltig) { ok = false; detail.fehlerFeld = ungueltig; ungueltig.reportValidity(); }
      }
      if (!ok && detail.fehlerFeld) {
        var idx = indexVon(detail.fehlerFeld);
        if (idx !== -1 && idx !== aktuell) {
          // Fehler in einem früheren Schritt: dorthin wechseln und diesen Schritt prüfen (zeigt die Meldungen)
          zeige(idx, false);
          return pruefe(schritte[idx]);
        }
        status.textContent = 'Bitte prüfen Sie Ihre Angaben in Schritt ' + (aktuell + 1) + '.';
        detail.fehlerFeld.focus();
      }
      return ok;
    }

    /* Versand-Schritt vorbereiten: Zusammenfassung + Links */
    function bereiteVersand() {
      var versand = schritte[versandIndex][0];
      var detail = {
        zeilen: [],
        betreff: form.getAttribute('data-versand-betreff') || document.title,
        einleitung: form.getAttribute('data-versand-einleitung') || '',
        gruss: 'Viele Grüße'
      };
      form.dispatchEvent(new CustomEvent('schritte:versand', { detail: detail }));
      if (!detail.zeilen.length) detail.zeilen = generischeZeilen(form);

      var liste = versand.querySelector('[data-zusammenfassung]');
      if (liste) {
        liste.replaceChildren();
        detail.zeilen.forEach(function (z) {
          var zeile = el('div', 'versand__zeile');
          zeile.appendChild(el('dt', '', z[0]));
          zeile.appendChild(el('dd', '', z[1]));
          liste.appendChild(zeile);
        });
      }

      var text = [detail.einleitung, '']
        .concat(detail.zeilen.map(function (z) { return z[0] + ': ' + z[1]; }))
        .concat(['', detail.gruss])
        .join('\n').replace(/^\n+/, '');
      var links = window.WirHelfenAPI && window.WirHelfenAPI.versandLinks
        ? window.WirHelfenAPI.versandLinks(detail.betreff, text) : null;
      versand.querySelectorAll('[data-versand]').forEach(function (link) {
        var kanal = link.getAttribute('data-versand');
        if (links && links[kanal]) link.setAttribute('href', links[kanal]);
        else link.removeAttribute('href');
      });
    }

    function weiterKlick() {
      if (aktuell >= anzahl - 1) return;
      if (!pruefe(schritte[aktuell])) return;
      var ziel = aktuell + 1;
      if (ziel === versandIndex) {
        if (!pruefe(null)) return; // Sicherheitsnetz: alle Angaben nochmals prüfen
        bereiteVersand();
      }
      zeige(ziel, true);
    }

    weiter.addEventListener('click', weiterKlick);
    zurueck.addEventListener('click', function () { zeige(aktuell - 1, true); });

    // Enter in einem Eingabefeld = „Weiter“ statt Absenden (Erfassung vor main.js)
    document.addEventListener('submit', function (event) {
      if (event.target !== form) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      weiterKlick();
    }, true);

    form.addEventListener('schritte:start', function () { zeige(0, false); });
    form.addEventListener('reset', function () {
      if (erfolg) erfolg.hidden = true;
      form.hidden = false;
      zeige(0, false);
    });

    /* Versand gewählt: Link öffnet E-Mail-Programm bzw. WhatsApp, danach Bestätigung */
    form.addEventListener('click', function (event) {
      var link = event.target.closest('[data-versand]');
      if (!link || !link.getAttribute('href')) return;
      var kanal = link.getAttribute('data-versand');
      // Navigation selbst nicht verhindern; Bestätigung erst danach zeigen
      window.setTimeout(function () {
        if (!erfolg) return;
        var kanalEl = erfolg.querySelector('[data-erfolg-kanal]');
        if (kanalEl) kanalEl.textContent = KANAL_TEXT[kanal] || kanal;
        form.hidden = true;
        erfolg.hidden = false;
        erfolg.focus();
        erfolg.scrollIntoView({ block: 'start', behavior: reducedMotion() ? 'auto' : 'smooth' });
      }, 0);
    });

    // „Anderen Weg zum Senden wählen“: zurück zum Versand-Schritt
    if (erfolg) {
      erfolg.addEventListener('click', function (event) {
        if (!event.target.closest('[data-schritte-auswahl]')) return;
        erfolg.hidden = true;
        form.hidden = false;
        zeige(versandIndex, true);
      });
    }

    zeige(0, false);
  }

  document.querySelectorAll('form[data-schritte]').forEach(initSchrittFormular);
})();
