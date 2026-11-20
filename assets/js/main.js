/* ==========================================================================
   KONZEPT 60+ – main.js (Vanilla JS, kein Framework, kein Build)
   1. Mobile Navigation
   2. Daten aus data/*.json laden (Progressive Enhancement):
      – Themen-Karten neu rendern, Select-Optionen befüllen
   3. Vorauswahl Thema/Region über Links (data-thema / data-region)
   4. Formular-Simulation mit Validierung – es wird NICHTS gesendet/gespeichert
   → WordPress: wp_enqueue_script( 'konzept60-main', …, [ 'strategy' => 'defer' ] );
     Datenquelle dann z. B. wp_localize_script() oder REST /wp/v2/themenbereich
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------------
     1. Mobile Navigation
     ------------------------------------------------------------------------ */
  function initNavigation() {
    var toggle = document.querySelector('.site-header__nav-toggle');
    var nav = document.getElementById('hauptnavigation');
    if (!toggle || !nav) return;

    // Beschriftung bleibt "Menü" (stabile Breite), Zustand über aria-expanded + Icon
    var icon = toggle.querySelector('[data-menu-icon]');

    function setOpen(open) {
      nav.classList.toggle('is-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      if (icon) icon.setAttribute('href', open ? '#icon-close' : '#icon-menu');
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Nach Klick auf einen Ankerlink schließen
    nav.addEventListener('click', function (event) {
      if (event.target.closest('a')) setOpen(false);
    });

    // Escape schließt und setzt den Fokus zurück auf den Button
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        setOpen(false);
        toggle.focus();
      }
    });

    // Beim Wechsel auf Desktop-Breite Zustand zurücksetzen
    var desktop = window.matchMedia('(min-width: 68em)');
    var reset = function () { if (desktop.matches) setOpen(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', reset);
  }

  /* ------------------------------------------------------------------------
     2. Daten laden (nur lesend; Seite funktioniert vollständig ohne)
     ------------------------------------------------------------------------ */
  function loadJSON(url) {
    return fetch(url, { headers: { Accept: 'application/json' } }).then(function (res) {
      if (!res.ok) throw new Error(url + ': HTTP ' + res.status);
      return res.json();
    });
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function svgIcon(name) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', 'icon');
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', '#icon-' + name);
    svg.appendChild(use);
    return svg;
  }

  // Erzeugt exakt dasselbe Markup wie die statischen Karten in index.html
  // (→ WordPress: template-parts/card-thema.php)
  function renderThemaCard(thema) {
    var li = el('li');
    var article = el('article', 'card');

    var iconWrap = el('span', 'card__icon');
    iconWrap.appendChild(svgIcon(thema.icon));
    article.appendChild(iconWrap);

    article.appendChild(el('h3', 'card__title', thema.titel));
    article.appendChild(el('p', 'card__text', thema.kurztext));

    if (Array.isArray(thema.beispiele) && thema.beispiele.length) {
      var ul = el('ul', 'card__examples');
      ul.setAttribute('aria-label', 'Beispiele');
      thema.beispiele.forEach(function (b) { ul.appendChild(el('li', null, b)); });
      article.appendChild(ul);
    }

    var link = el('a', 'card__link', 'Anliegen beschreiben');
    link.href = '#anfrage';
    link.setAttribute('data-thema', thema.slug);
    link.appendChild(el('span', 'visually-hidden', ': ' + thema.titel));
    link.appendChild(document.createTextNode(' '));
    link.appendChild(svgIcon('arrow'));
    article.appendChild(link);

    li.appendChild(article);
    return li;
  }

  function renderThemen(themen) {
    var list = document.querySelector('[data-themen-liste]');
    if (!list || !themen.length) return;
    var fragment = document.createDocumentFragment();
    themen.forEach(function (t) { fragment.appendChild(renderThemaCard(t)); });
    list.replaceChildren(fragment);
  }

  // Ersetzt die Fallback-Optionen; erste (leere) und letzte ("Andere …") bleiben
  function fillSelect(select, items, valueKey, labelKey) {
    if (!select || !items.length) return;
    var current = select.value;
    var first = select.options[0];
    var last = select.options[select.options.length - 1];
    var fragment = document.createDocumentFragment();
    fragment.appendChild(first);
    items.forEach(function (item) {
      var opt = document.createElement('option');
      opt.value = item[valueKey];
      opt.textContent = item[labelKey];
      fragment.appendChild(opt);
    });
    fragment.appendChild(last);
    select.replaceChildren(fragment);
    select.value = current;
  }

  function initData() {
    loadJSON('data/themen.json')
      .then(function (data) {
        var themen = (data && data.themen) || [];
        renderThemen(themen);
        fillSelect(document.querySelector('[data-themen-select]'), themen, 'slug', 'titel');
      })
      .catch(function (err) {
        // Kein Problem: statisches HTML bleibt stehen
        console.info('[KONZEPT 60+] Themen-JSON nicht geladen, nutze HTML-Fallback.', err.message);
      });

    loadJSON('data/regionen.json')
      .then(function (data) {
        fillSelect(document.querySelector('[data-regionen-select]'), (data && data.regionen) || [], 'slug', 'name');
      })
      .catch(function (err) {
        console.info('[KONZEPT 60+] Regionen-JSON nicht geladen, nutze HTML-Fallback.', err.message);
      });
  }

  /* ------------------------------------------------------------------------
     3. Vorauswahl über Links
     ------------------------------------------------------------------------ */
  function initPreselect() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest('[data-thema], [data-region]');
      if (!link) return;
      var thema = link.getAttribute('data-thema');
      var region = link.getAttribute('data-region');
      if (thema) {
        var s1 = document.getElementById('f-thema');
        if (s1) s1.value = thema;
      }
      if (region) {
        var s2 = document.getElementById('f-region');
        if (s2) s2.value = region;
      }
    });
  }

  /* ------------------------------------------------------------------------
     4. Formular-Simulation
     ------------------------------------------------------------------------ */
  var MESSAGES = {
    thema: 'Bitte wählen Sie einen Themenbereich aus.',
    region: 'Bitte wählen Sie Ihre Region aus.',
    beschreibungLeer: 'Bitte beschreiben Sie kurz, wobei Sie Hilfe brauchen.',
    beschreibungKurz: 'Bitte schreiben Sie etwas mehr (mindestens 20 Zeichen), damit wir Ihr Anliegen gut verstehen.',
    wer: 'Bitte wählen Sie aus, für wen Sie Hilfe suchen.',
    name: 'Bitte geben Sie Ihren Namen ein.',
    kontakt: 'Bitte geben Sie eine Telefonnummer oder eine E-Mail-Adresse an, damit wir Sie erreichen können.',
    telefon: 'Die Telefonnummer scheint nicht vollständig zu sein. Bitte nur Ziffern, Leerzeichen und + / - verwenden.',
    email: 'Bitte prüfen Sie die E-Mail-Adresse. Sie sollte so aussehen: name@beispiel.de',
    emailNoetig: 'Sie möchten nur per E-Mail kontaktiert werden – bitte geben Sie dafür Ihre E-Mail-Adresse an.',
    datenschutz: 'Bitte bestätigen Sie die Einwilligung, damit wir Ihre Anfrage bearbeiten dürfen.'
  };

  var PHONE_RE = /^[+0-9][0-9\s\/()\-]{5,}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function initForm() {
    var form = document.getElementById('anfrage-formular');
    var success = document.getElementById('anfrage-erfolg');
    var summary = document.getElementById('formular-fehler');
    if (!form || !success || !summary) return;

    // Eigene Validierung statt Browser-Bubbles (ohne JS greift die native Validierung)
    form.setAttribute('novalidate', '');

    var f = form.elements;
    var radiosWer = form.querySelectorAll('input[name="wer"]');
    radiosWer.forEach(function (r) { r.setAttribute('aria-describedby', 'f-wer-fehler'); });

    var submitted = false;

    // Feldbeschreibung: id des Fehler-Elements, Fokusziel, Prüf-Funktion
    var fields = [
      { key: 'thema', error: 'f-thema-fehler', label: 'Themenbereich', focus: f.thema, inputs: [f.thema],
        check: function () { return f.thema.value ? '' : MESSAGES.thema; } },
      { key: 'region', error: 'f-region-fehler', label: 'Region', focus: f.region, inputs: [f.region],
        check: function () { return f.region.value ? '' : MESSAGES.region; } },
      { key: 'beschreibung', error: 'f-beschreibung-fehler', label: 'Beschreibung', focus: f.beschreibung, inputs: [f.beschreibung],
        check: function () {
          var v = f.beschreibung.value.trim();
          if (!v) return MESSAGES.beschreibungLeer;
          if (v.length < 20) return MESSAGES.beschreibungKurz;
          return '';
        } },
      { key: 'wer', error: 'f-wer-fehler', label: 'Für wen', focus: radiosWer[0], inputs: Array.prototype.slice.call(radiosWer),
        group: document.getElementById('f-wer'),
        check: function () { return form.querySelector('input[name="wer"]:checked') ? '' : MESSAGES.wer; } },
      { key: 'name', error: 'f-name-fehler', label: 'Name', focus: f.name, inputs: [f.name],
        check: function () { return f.name.value.trim().length >= 2 ? '' : MESSAGES.name; } },
      { key: 'telefon', error: 'f-telefon-fehler', label: 'Telefon', focus: f.telefon, inputs: [f.telefon],
        check: function () {
          var tel = f.telefon.value.trim();
          var mail = f.email.value.trim();
          if (!tel && !mail) return MESSAGES.kontakt;
          if (tel && (!PHONE_RE.test(tel) || tel.replace(/\D/g, '').length < 6)) return MESSAGES.telefon;
          return '';
        } },
      { key: 'email', error: 'f-email-fehler', label: 'E-Mail', focus: f.email, inputs: [f.email],
        check: function () {
          var mail = f.email.value.trim();
          var nurMail = form.querySelector('input[name="rueckruf"]:checked');
          if (mail && !EMAIL_RE.test(mail)) return MESSAGES.email;
          if (!mail && nurMail && nurMail.value === 'kein-anruf') return MESSAGES.emailNoetig;
          return '';
        } },
      { key: 'datenschutz', error: 'f-datenschutz-fehler', label: 'Einwilligung', focus: f.datenschutz, inputs: [f.datenschutz],
        group: document.getElementById('f-datenschutz-feld'),
        check: function () { return f.datenschutz.checked ? '' : MESSAGES.datenschutz; } }
    ];

    function showFieldState(field, message) {
      var errorEl = document.getElementById(field.error);
      if (errorEl) errorEl.textContent = message;
      field.inputs.forEach(function (input) {
        if (message) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
      });
      if (field.group) field.group.classList.toggle('form-field--invalid', Boolean(message));
    }

    function validateField(field) {
      var message = field.check();
      showFieldState(field, message);
      return message;
    }

    function renderSummary(errors) {
      var list = summary.querySelector('[data-fehlerliste]');
      list.replaceChildren();
      errors.forEach(function (e) {
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + (e.field.focus.id || e.field.error);
        a.textContent = e.message;
        a.addEventListener('click', function (event) {
          event.preventDefault();
          e.field.focus.focus();
        });
        li.appendChild(a);
        list.appendChild(li);
      });
      summary.hidden = errors.length === 0;
    }

    function validateAll() {
      var errors = [];
      fields.forEach(function (field) {
        var message = validateField(field);
        if (message) errors.push({ field: field, message: message });
      });
      return errors;
    }

    // Nach dem ersten Absendeversuch: Fehler beim Korrigieren live aktualisieren
    form.addEventListener('change', revalidate);
    form.addEventListener('input', revalidate);
    function revalidate() {
      if (!submitted) return;
      var errors = validateAll();
      renderSummary(errors);
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault(); // Prototyp: kein Versand, kein fetch, keine Speicherung
      submitted = true;
      var errors = validateAll();
      renderSummary(errors);

      if (errors.length) {
        errors[0].field.focus.focus();
        return;
      }

      showSuccess();
    });

    function showSuccess() {
      var name = f.name.value.trim();
      var tel = f.telefon.value.trim();
      var nameEl = success.querySelector('[data-erfolg-name]');
      var kontaktEl = success.querySelector('[data-erfolg-kontakt]');
      if (nameEl) nameEl.textContent = name;
      if (kontaktEl) kontaktEl.textContent = tel ? ' telefonisch unter ' + tel : ' per E-Mail';

      form.hidden = true;
      success.hidden = false;
      success.focus();
      success.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    }

    var again = success.querySelector('[data-neue-anfrage]');
    if (again) {
      again.addEventListener('click', function () {
        form.reset();
        submitted = false;
        fields.forEach(function (field) { showFieldState(field, ''); });
        summary.hidden = true;
        success.hidden = true;
        form.hidden = false;
        f.thema.focus();
      });
    }
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /* ------------------------------------------------------------------------ */
  initNavigation();
  initData();
  initPreselect();
  initForm();
})();
