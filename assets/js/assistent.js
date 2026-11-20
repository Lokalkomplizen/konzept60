/* ==========================================================================
   Wir helfen – assistent.js (Unterstützungs-Assistent, nur auf der Startseite eingebunden)
   Drei kurze Fragen → Zusammenfassung + passender nächster Schritt.
   - Daten (Themen, Städte, Ratgeber-Beiträge) kommen als JSON im Attribut data-assistent
     (erzeugt von tools/build.py → assistent_data()); kein Inline-Skript, kein Nachladen.
   - Ohne JS zeigt der Abschnitt stattdessen die drei Säulen-Links (progressive enhancement).
   - Es wird NICHTS gespeichert oder gesendet: kein Storage, keine Cookies, kein fetch.
     Das Ergebnis ist nur ein Link auf das vorausgefüllte Anfrageformular
     (?thema=<slug>&wer=selbst|angehoerige&ort=<Stadt>#anfrage), das main.js (2.) auswertet.
   - Barrierearm: echte Radio-Buttons in fieldset/legend, Fokus beim Schrittwechsel auf die
     Schritt-Überschrift, Fortschritt in einer aria-live-Zone, Zurück-Button je Schritt.
   → WordPress: eigener Block bzw. Template-Part; Daten über wp_localize_script/data-Attribut.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.getElementById('assistent');
  var app = root && root.querySelector('[data-assistent-app]');
  if (!root || !app) return;

  var data;
  try {
    data = JSON.parse(root.getAttribute('data-assistent'));
  } catch (e) {
    return; // ohne gültige Daten bleibt die Ohne-JS-Fassung stehen
  }
  if (!data || !data.ziele || !data.themen) return;

  var ST = { schritt: 0, ziel: '', thema: '', ort: null, andereStadt: false };
  var uid = 0;

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ---- kleine DOM-Helfer (Daten nie als HTML einsetzen) ---------------------- */
  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (key) {
      if (key === 'text') node.textContent = attrs[key];
      else if (key === 'class') node.className = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function icon(name) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#icon-' + name);
    svg.appendChild(use);
    return svg;
  }

  function button(label, className, onClick, withArrow) {
    var b = el('button', { type: 'button', 'class': 'btn ' + className }, [label]);
    if (withArrow) b.appendChild(icon('arrow'));
    b.addEventListener('click', onClick);
    return b;
  }

  /* ---- Ablauf ------------------------------------------------------------------- */
  function themaById(slug) {
    return data.themen.filter(function (t) { return t.slug === slug; })[0];
  }
  function alltagById(id) {
    return data.alltag.filter(function (t) { return t.id === id; })[0];
  }

  function flow() {
    // alltag/informieren: 2 Fragen – praktisch/Angehörige: 3 Fragen (mit Stadt)
    if (ST.ziel === 'informieren' || ST.ziel === 'alltag') return ['ziel', 'thema'];
    return ['ziel', 'thema', 'ort'];
  }

  function stepOptions(step) {
    if (step === 'ziel') {
      return data.ziele.map(function (z) { return { value: z.id, titel: z.titel, hinweis: z.hinweis }; });
    }
    if (step === 'thema') {
      if (ST.ziel === 'alltag') {
        return data.alltag.map(function (a) { return { value: a.id, titel: a.titel, hinweis: a.hinweis }; });
      }
      return data.themen.map(function (t) { return { value: t.slug, titel: t.titel, hinweis: '' }; });
    }
    var orte = data.orte.map(function (o) { return { value: o, titel: o, hinweis: '' }; });
    orte.push({ value: '__andere', titel: 'Andere Stadt', hinweis: '' });
    return orte;
  }

  var TITEL = {
    ziel: 'Was beschäftigt Sie gerade?',
    thema: 'Worum geht es konkret?',
    ort: 'In welcher Stadt benötigen Sie Unterstützung?'
  };

  function current(step) {
    if (step === 'ziel') return ST.ziel;
    if (step === 'thema') return ST.thema;
    return ST.andereStadt ? '__andere' : (ST.ort || '');
  }

  function render(focusHeading) {
    var steps = flow();
    var isResult = ST.schritt >= steps.length;
    app.replaceChildren();
    var card = el('div', { 'class': 'assistent__card' });
    app.appendChild(card);

    // Fortschritt (aria-live: wird bei jedem Wechsel vorgelesen)
    var total = steps.length;
    var progress = el('p', { 'class': 'assistent__progress', 'aria-live': 'polite' });
    progress.textContent = isResult ? 'Ihr Ergebnis' : 'Schritt ' + (ST.schritt + 1) + ' von ' + total;
    card.appendChild(progress);

    if (!isResult) {
      var bar = el('div', { 'class': 'assistent__bar', 'aria-hidden': 'true' });
      for (var i = 0; i < total; i += 1) {
        bar.appendChild(el('span', { 'class': 'assistent__bar-step' + (i <= ST.schritt ? ' is-done' : '') }));
      }
      card.appendChild(bar);
      card.appendChild(renderStep(steps[ST.schritt]));
    } else {
      card.appendChild(renderResult());
    }

    if (focusHeading) {
      var heading = card.querySelector('[data-assistent-heading]');
      if (heading) heading.focus({ preventScroll: true });
      if (heading && !isElementInView(card)) {
        card.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      }
    }
  }

  function isElementInView(node) {
    var r = node.getBoundingClientRect();
    return r.top >= 0 && r.top < window.innerHeight * 0.6;
  }

  function renderStep(step) {
    uid += 1;
    var name = 'assistent-' + step;
    var errorId = 'assistent-fehler-' + uid;
    var form = el('form', { 'class': 'assistent__form', novalidate: '' });
    var fieldset = el('fieldset', { 'class': 'assistent__fieldset', 'aria-describedby': errorId });
    var heading = el('h3', { 'class': 'assistent__heading', tabindex: '-1', 'data-assistent-heading': '', text: TITEL[step] });
    fieldset.appendChild(el('legend', { 'class': 'assistent__legend' }, [heading]));

    var options = stepOptions(step);
    var wide = step === 'ziel' || (step === 'thema' && ST.ziel === 'alltag');
    var list = el('div', { 'class': 'assistent__choices' + (wide ? ' assistent__choices--wide' : '') + (step === 'ort' ? ' assistent__choices--chips' : '') });
    var selected = current(step);
    options.forEach(function (o, idx) {
      var input = el('input', { type: 'radio', name: name, value: o.value, id: name + '-' + idx });
      if (o.value === selected) input.checked = true;
      var text = el('span', { 'class': 'choice-card__text' }, [el('span', { 'class': 'choice-card__title', text: o.titel })]);
      if (o.hinweis) text.appendChild(el('span', { 'class': 'choice-card__hint', text: o.hinweis }));
      list.appendChild(el('label', { 'class': 'choice-card' }, [input, text]));
    });
    fieldset.appendChild(list);

    // Hinweis bei „Andere Stadt“ (Live-Bereich)
    var note = null;
    if (step === 'ort') {
      note = el('p', { 'class': 'assistent__note', 'aria-live': 'polite' });
      fieldset.appendChild(note);
    }
    var error = el('p', { 'class': 'form-field__error', id: errorId, 'aria-live': 'polite' });
    fieldset.appendChild(error);
    form.appendChild(fieldset);

    function updateNote() {
      if (!note) return;
      var chosen = form.querySelector('input[name="' + name + '"]:checked');
      note.textContent = chosen && chosen.value === '__andere'
        ? 'Wir starten zunächst in ' + listNames(data.orte) + '. Ihre Anfrage können Sie trotzdem stellen – wir schauen, was möglich ist.'
        : '';
    }
    form.addEventListener('change', function () {
      error.textContent = '';
      fieldset.removeAttribute('aria-invalid');
      updateNote();
    });
    updateNote();

    var isLast = ST.schritt === flow().length - 1;
    var actions = el('div', { 'class': 'assistent__actions' });
    if (ST.schritt > 0) {
      actions.appendChild(button('Zurück', 'btn--secondary', function () { ST.schritt -= 1; render(true); }));
    }
    var next = el('button', { type: 'submit', 'class': 'btn btn--primary' }, [isLast ? 'Ergebnis anzeigen' : 'Weiter']);
    next.appendChild(icon('arrow'));
    actions.appendChild(next);
    form.appendChild(actions);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var chosen = form.querySelector('input[name="' + name + '"]:checked');
      if (!chosen) {
        error.textContent = 'Bitte wählen Sie eine Antwort aus, damit wir weitermachen können.';
        fieldset.setAttribute('aria-invalid', 'true');
        form.querySelector('input[name="' + name + '"]').focus();
        return;
      }
      if (step === 'ziel') {
        if (ST.ziel !== chosen.value) { ST.thema = ''; ST.ort = null; ST.andereStadt = false; }
        ST.ziel = chosen.value;
      } else if (step === 'thema') {
        ST.thema = chosen.value;
      } else {
        ST.andereStadt = chosen.value === '__andere';
        ST.ort = ST.andereStadt ? null : chosen.value;
      }
      ST.schritt += 1;
      render(true);
    });
    return form;
  }

  function listNames(names) {
    return names.slice(0, -1).join(', ') + ' und ' + names[names.length - 1];
  }

  /* ---- Ergebnis --------------------------------------------------------------- */
  function link(href, label, className) {
    var a = el('a', { href: href, 'class': className || '' }, [label]);
    return a;
  }

  function renderResult() {
    var wrap = el('div', { 'class': 'assistent__result' });
    var heading = el('h3', { 'class': 'assistent__heading', tabindex: '-1', 'data-assistent-heading': '', text: 'Das haben wir für Sie gefunden' });
    wrap.appendChild(heading);

    var summary = el('p', { 'class': 'assistent__summary' });
    var extra = null;
    var main = null;
    var side = [];

    if (ST.ziel === 'praktisch' || ST.ziel === 'angehoerige') {
      var t = themaById(ST.thema);
      var wer = ST.ziel === 'angehoerige' ? 'angehoerige' : 'selbst';
      summary.textContent = (wer === 'angehoerige'
        ? 'Sie suchen Unterstützung für Ihre Angehörigen'
        : 'Sie suchen praktische Unterstützung') +
        ' beim Thema „' + t.titel + '“' + (ST.ort ? ' in ' + ST.ort : '') + '.';
      extra = el('p', { 'class': 'assistent__extra',
        text: 'Ein Mensch aus unserem Team liest Ihre Anfrage persönlich. Ihre Auswahl übernehmen wir ins Formular – dort können Sie alles noch ändern oder ergänzen.' });
      var href = '/?thema=' + encodeURIComponent(t.slug) + '&wer=' + wer +
        (ST.ort ? '&ort=' + encodeURIComponent(ST.ort) : '') + '#anfrage';
      main = { href: href, label: 'Anfrage mit diesen Angaben stellen' };
      if (ST.andereStadt) {
        extra.textContent += ' Ihre Stadt gehört noch nicht zu unseren ersten Städten (' + listNames(data.orte) +
          '). Die Anfrage können Sie trotzdem stellen.';
      }
      side.push({ href: t.url, label: 'Mehr zum Thema „' + t.titel + '“' });
      if (t.ratgeber && t.ratgeber[0]) side.push({ href: t.ratgeber[0].url, label: 'Ratgeber: ' + t.ratgeber[0].titel });
    } else if (ST.ziel === 'informieren') {
      var ti = themaById(ST.thema);
      summary.textContent = 'Sie möchten sich zum Thema „' + ti.titel + '“ informieren.';
      var beitraege = ti.ratgeber || [];
      if (beitraege[0]) main = { href: beitraege[0].url, label: 'Beitrag lesen: ' + beitraege[0].titel };
      else main = { href: '/ratgeber/', label: 'Zum Ratgeber' };
      side.push({ href: ti.url, label: 'Mehr zum Thema „' + ti.titel + '“' });
      if (beitraege[1]) side.push({ href: beitraege[1].url, label: 'Auch interessant: ' + beitraege[1].titel });
      else side.push({ href: '/ratgeber/', label: 'Alle Beiträge im Ratgeber' });
    } else {
      var a = alltagById(ST.thema);
      summary.textContent = 'Sie möchten Ihren Alltag besser organisieren – mit „' + a.titel + '“.';
      if (a.bald) {
        extra = el('p', { 'class': 'assistent__extra',
          text: 'Dieses Werkzeug kommt bald. Schauen Sie in der Zwischenzeit gern in „Mein Alltag“ vorbei.' });
        main = { href: '/mein-alltag/', label: 'Zu „Mein Alltag“' };
      } else {
        main = { href: a.url, label: a.titel + ' öffnen' };
      }
      data.alltag.filter(function (x) { return !x.bald && x.id !== a.id; }).slice(0, 2).forEach(function (x) {
        side.push({ href: x.url, label: x.titel });
      });
    }

    wrap.appendChild(summary);
    if (extra) wrap.appendChild(extra);

    var mainLink = el('a', { href: main.href, 'class': 'btn btn--primary btn--block-mobile' }, [main.label]);
    mainLink.appendChild(icon('arrow'));
    wrap.appendChild(el('p', { 'class': 'assistent__main' }, [mainLink]));

    if (side.length) {
      var ul = el('ul', { 'class': 'assistent__links', 'aria-label': 'Weitere passende Angebote' });
      side.slice(0, 2).forEach(function (s) { ul.appendChild(el('li', {}, [link(s.href, s.label)])); });
      wrap.appendChild(ul);
    }

    var actions = el('div', { 'class': 'assistent__actions' });
    actions.appendChild(button('Zurück', 'btn--secondary', function () { ST.schritt -= 1; render(true); }));
    actions.appendChild(button('Von vorn beginnen', 'btn--secondary', function () {
      ST = { schritt: 0, ziel: '', thema: '', ort: null, andereStadt: false };
      render(true);
    }));
    wrap.appendChild(actions);
    return wrap;
  }

  /* ---- Start ---------------------------------------------------------------------- */
  app.hidden = false;
  render(false);
})();
