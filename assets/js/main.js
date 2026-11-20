/* ==========================================================================
   KONZEPT 60+ – main.js (Vanilla JS, kein Framework, kein Build)
   1. Mobile Navigation
   2. Vorauswahl im Anfrageformular (?thema=…, ?fuer=…, ?region=… bzw. Links)
   3. Abhängige Leistungen je Themenbereich (Markup erzeugt tools/build.py aus data/themen.json)
   4. Formular-Validierung (gemeinsamer Baustein für Anfrage + Anbieter-Registrierung)
   5. Anfrageformular – Simulation
   6. Anbieter-Registrierung – Simulation, Felder je Anbieterart
   7. Ratgeber-Übersicht – Themenfilter (?thema=…)
   Es wird NICHTS gesendet oder gespeichert: kein fetch, kein Storage, keine Cookies.
   → WordPress: wp_enqueue_script( 'konzept60-main', …, [ 'strategy' => 'defer' ] );
   ========================================================================== */
(function () {
  'use strict';

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function scrollToEl(el) {
    el.scrollIntoView({ block: 'start', behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }

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

    // Nach Klick auf einen Link schließen
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
     2. Vorauswahl im Anfrageformular
        Links wie /?thema=pflege-betreuung#anfrage funktionieren von jeder Seite
        (ohne JS: normale Navigation zum Formular). Auf der Startseite selbst
        wird der Link abgefangen – kein Neuladen, Fokus springt zum Formular.
     ------------------------------------------------------------------------ */
  function applyPreselect(form, params) {
    var applied = false;
    var thema = params.get('thema');
    if (thema && form.elements.thema) {
      var select = form.elements.thema;
      if (select.querySelector('option[value="' + CSS.escape(thema) + '"]')) {
        select.value = thema;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        applied = true;
      }
    }
    var fuer = params.get('fuer');
    if (fuer) {
      var radio = form.querySelector('input[name="wer"][value="' + CSS.escape(fuer) + '"]');
      if (radio) { radio.checked = true; applied = true; }
    }
    var region = params.get('region');
    if (region && form.elements.ort && !form.elements.ort.value) {
      var option = document.querySelector('#f-orte option[data-region="' + CSS.escape(region) + '"]');
      if (option) { form.elements.ort.value = option.value; applied = true; }
    }
    return applied;
  }

  function initPreselect() {
    var form = document.getElementById('anfrage-formular');
    if (!form) return;

    // a) Beim Laden: Parameter übernehmen, danach aus der Adresszeile entfernen
    var params = new URLSearchParams(window.location.search);
    if (applyPreselect(form, params) || params.has('thema') || params.has('fuer') || params.has('region')) {
      history.replaceState(null, '', window.location.pathname + window.location.hash);
    }

    // b) Klick auf einen Vorauswahl-Link derselben Seite
    document.addEventListener('click', function (event) {
      var link = event.target.closest('a[href]');
      if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
      var url = new URL(link.href, window.location.href);
      if (url.pathname !== window.location.pathname || url.hash !== '#anfrage' || !url.search) return;
      event.preventDefault();
      applyPreselect(form, url.searchParams);
      history.replaceState(null, '', url.pathname + '#anfrage');
      var section = document.getElementById('anfrage');
      var heading = document.getElementById('anfrage-titel');
      if (form.hidden) {
        // Erfolgsmeldung wird angezeigt → Formular wieder öffnen
        var again = document.querySelector('#anfrage-erfolg [data-neue-anfrage]');
        if (again) again.click();
        applyPreselect(form, url.searchParams);
      }
      if (section) scrollToEl(section);
      if (heading) heading.focus({ preventScroll: true });
    });
  }

  /* ------------------------------------------------------------------------
     3. Abhängige Leistungen
     ------------------------------------------------------------------------ */
  function initLeistungen() {
    var select = document.querySelector('[data-kategorie-select]');
    var groups = document.querySelectorAll('[data-leistungen]');
    if (!select || !groups.length) return null;

    function update() {
      groups.forEach(function (group) {
        var active = group.getAttribute('data-leistungen') === select.value;
        group.hidden = !active;
        group.disabled = !active; // inaktive Gruppen werden nicht mit übertragen
      });
    }

    select.addEventListener('change', update);
    update();
    return update;
  }

  /* ------------------------------------------------------------------------
     4. Validierungs-Baustein
        fields: [{ error, focus, inputs, group?, when?, check }]
     ------------------------------------------------------------------------ */
  var PHONE_RE = /^[+0-9][0-9\s\/()\-]{5,}$/;
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PLZ_RE = /^[0-9]{5}$/;

  function phoneInvalid(value) {
    return value && (!PHONE_RE.test(value) || value.replace(/\D/g, '').length < 6);
  }

  function setupValidation(form, summary, fields, onValid) {
    // Eigene Validierung statt Browser-Bubbles (ohne JS greift die native Validierung)
    form.setAttribute('novalidate', '');
    var submitted = false;

    // Fehlertext + Gruppenrahmen je Feld; aria-invalid je Eingabe (ein Eingabefeld kann
    // von mehreren Regeln betroffen sein, z. B. Telefon: "Telefon oder E-Mail" + Format)
    function applyStates(results) {
      var invalid = [];
      results.forEach(function (r) {
        var errorEl = document.getElementById(r.field.error);
        if (errorEl) errorEl.textContent = r.message;
        if (r.field.group) r.field.group.classList.toggle('form-field--invalid', Boolean(r.message));
        if (r.message) invalid = invalid.concat(r.field.inputs());
      });
      results.forEach(function (r) {
        r.field.inputs().forEach(function (input) {
          if (invalid.indexOf(input) !== -1) input.setAttribute('aria-invalid', 'true');
          else input.removeAttribute('aria-invalid');
        });
      });
    }

    function validateAll() {
      var results = fields.map(function (field) {
        var active = !field.when || field.when();
        return { field: field, message: active ? field.check() : '' };
      });
      applyStates(results);
      return results.filter(function (r) { return r.message; });
    }

    function renderSummary(errors) {
      var list = summary.querySelector('[data-fehlerliste]');
      list.replaceChildren();
      errors.forEach(function (e) {
        var target = e.field.focus();
        var li = document.createElement('li');
        var a = document.createElement('a');
        a.href = '#' + (target.id || e.field.error);
        a.textContent = e.message;
        a.addEventListener('click', function (event) {
          event.preventDefault();
          target.focus();
        });
        li.appendChild(a);
        list.appendChild(li);
      });
      summary.hidden = errors.length === 0;
    }

    // Nach dem ersten Absendeversuch: Fehler beim Korrigieren live aktualisieren
    function revalidate() {
      if (!submitted) return;
      renderSummary(validateAll());
    }
    form.addEventListener('change', revalidate);
    form.addEventListener('input', revalidate);

    form.addEventListener('submit', function (event) {
      event.preventDefault(); // Prototyp: kein Versand, kein fetch, keine Speicherung
      submitted = true;
      var errors = validateAll();
      renderSummary(errors);
      if (errors.length) {
        errors[0].field.focus().focus();
        return;
      }
      onValid();
    });

    return {
      reset: function () {
        form.reset();
        submitted = false;
        applyStates(fields.map(function (field) { return { field: field, message: '' }; }));
        summary.hidden = true;
      }
    };
  }

  function byName(form, name) {
    return function () { return Array.prototype.slice.call(form.querySelectorAll('input[name="' + name + '"]')); };
  }
  function one(el) { return function () { return [el]; }; }
  function first(fn) { return function () { return fn()[0]; }; }
  function self(el) { return function () { return el; }; }
  function anyChecked(form, name) { return Boolean(form.querySelector('input[name="' + name + '"]:checked')); }

  function showSuccess(form, success) {
    form.hidden = true;
    success.hidden = false;
    success.focus();
    scrollToEl(success);
  }

  /* ------------------------------------------------------------------------
     5. Anfrageformular
     ------------------------------------------------------------------------ */
  var MSG = {
    wer: 'Bitte wählen Sie aus, für wen Sie Hilfe suchen.',
    thema: 'Bitte wählen Sie einen Themenbereich aus (oder „Etwas anderes / weiß nicht“).',
    beschreibungLeer: 'Bitte beschreiben Sie kurz, wobei Hilfe benötigt wird.',
    beschreibungKurz: 'Bitte schreiben Sie etwas mehr (mindestens 20 Zeichen), damit wir Ihr Anliegen gut verstehen.',
    plz: 'Bitte geben Sie eine Postleitzahl mit genau 5 Ziffern ein, zum Beispiel 40210.',
    ort: 'Bitte geben Sie den Ort ein.',
    vorname: 'Bitte geben Sie Ihren Vornamen ein.',
    nachname: 'Bitte geben Sie Ihren Nachnamen ein.',
    kontakt: 'Bitte geben Sie eine Telefonnummer oder eine E-Mail-Adresse an – mindestens eines von beiden –, damit wir Sie erreichen können.',
    telefon: 'Die Telefonnummer scheint nicht vollständig zu sein. Bitte nur Ziffern, Leerzeichen und + / - verwenden.',
    email: 'Bitte prüfen Sie die E-Mail-Adresse. Sie sollte so aussehen: name@beispiel.de',
    emailNoetig: 'Sie möchten nur per E-Mail kontaktiert werden – bitte geben Sie dafür Ihre E-Mail-Adresse an.',
    newsletter: 'Für den Newsletter benötigen wir Ihre E-Mail-Adresse. Bitte tragen Sie sie ein oder entfernen Sie das Häkchen.',
    einwilligung: 'Bitte bestätigen Sie die Einwilligung, damit unser Team Ihre Anfrage bearbeiten darf.'
  };

  function initRequestForm(updateLeistungen) {
    var form = document.getElementById('anfrage-formular');
    var success = document.getElementById('anfrage-erfolg');
    var summary = document.getElementById('formular-fehler');
    if (!form || !success || !summary) return;

    var f = form.elements;
    var radiosWer = byName(form, 'wer');
    radiosWer().forEach(function (r) { r.setAttribute('aria-describedby', 'f-wer-fehler'); });

    function val(input) { return input.value.trim(); }

    var fields = [
      { error: 'f-wer-fehler', focus: first(radiosWer), inputs: radiosWer, group: document.getElementById('f-wer'),
        check: function () { return anyChecked(form, 'wer') ? '' : MSG.wer; } },
      { error: 'f-thema-fehler', focus: self(f.thema), inputs: one(f.thema),
        check: function () { return f.thema.value ? '' : MSG.thema; } },
      { error: 'f-beschreibung-fehler', focus: self(f.beschreibung), inputs: one(f.beschreibung),
        check: function () {
          var v = val(f.beschreibung);
          if (!v) return MSG.beschreibungLeer;
          return v.length < 20 ? MSG.beschreibungKurz : '';
        } },
      { error: 'f-plz-fehler', focus: self(f.plz), inputs: one(f.plz),
        check: function () { return PLZ_RE.test(val(f.plz)) ? '' : MSG.plz; } },
      { error: 'f-ort-fehler', focus: self(f.ort), inputs: one(f.ort),
        check: function () { return val(f.ort).length >= 2 ? '' : MSG.ort; } },
      { error: 'f-vorname-fehler', focus: self(f.vorname), inputs: one(f.vorname),
        check: function () { return val(f.vorname) ? '' : MSG.vorname; } },
      { error: 'f-nachname-fehler', focus: self(f.nachname), inputs: one(f.nachname),
        check: function () { return val(f.nachname) ? '' : MSG.nachname; } },
      // Mindestens eines von Telefon / E-Mail
      { error: 'f-kontakt-fehler', focus: self(f.telefon), inputs: function () { return [f.telefon, f.email]; },
        group: document.getElementById('f-kontakt'),
        check: function () { return val(f.telefon) || val(f.email) ? '' : MSG.kontakt; } },
      { error: 'f-telefon-fehler', focus: self(f.telefon), inputs: one(f.telefon),
        when: function () { return Boolean(val(f.telefon)); },
        check: function () { return phoneInvalid(val(f.telefon)) ? MSG.telefon : ''; } },
      { error: 'f-email-fehler', focus: self(f.email), inputs: one(f.email),
        when: function () { return Boolean(val(f.telefon) || val(f.email)); },
        check: function () {
          var mail = val(f.email);
          var rueckruf = form.querySelector('input[name="rueckruf"]:checked');
          if (mail && !EMAIL_RE.test(mail)) return MSG.email;
          if (!mail && rueckruf && rueckruf.value === 'kein-anruf') return MSG.emailNoetig;
          return '';
        } },
      { error: 'f-newsletter-fehler', focus: self(f.newsletter), inputs: one(f.newsletter),
        group: document.getElementById('f-newsletter-feld'),
        check: function () { return f.newsletter.checked && !val(f.email) ? MSG.newsletter : ''; } },
      { error: 'f-datenschutz-fehler', focus: self(f.einwilligung_bearbeitung), inputs: one(f.einwilligung_bearbeitung),
        group: document.getElementById('f-datenschutz-feld'),
        check: function () { return f.einwilligung_bearbeitung.checked ? '' : MSG.einwilligung; } }
    ];

    var validation = setupValidation(form, summary, fields, function () {
      var nameEl = success.querySelector('[data-erfolg-name]');
      var kontaktEl = success.querySelector('[data-erfolg-kontakt]');
      var tel = val(f.telefon);
      var mail = val(f.email);
      if (nameEl) nameEl.textContent = ', ' + val(f.vorname) + ' ' + val(f.nachname);
      if (kontaktEl) kontaktEl.textContent = tel ? ' – telefonisch unter ' + tel : ' – per E-Mail an ' + mail;
      showSuccess(form, success);
    });

    var again = success.querySelector('[data-neue-anfrage]');
    if (again) {
      again.addEventListener('click', function () {
        validation.reset();
        if (updateLeistungen) updateLeistungen();
        success.hidden = true;
        form.hidden = false;
        var firstRadio = radiosWer()[0];
        if (firstRadio) firstRadio.focus();
      });
    }
  }

  /* ------------------------------------------------------------------------
     6. Anbieter-Registrierung
     ------------------------------------------------------------------------ */
  var MSG_A = {
    art: 'Bitte wählen Sie aus, ob Sie sich als Betrieb oder als privater Helfer registrieren.',
    firma: 'Bitte geben Sie den Firmennamen ein.',
    ansprechpartner: 'Bitte geben Sie eine Ansprechperson an.',
    bereiche: 'Bitte wählen Sie mindestens einen Leistungsbereich aus.',
    einsatzorte: 'Bitte wählen Sie mindestens einen Einsatzort aus.',
    vorname: 'Bitte geben Sie Ihren Vornamen ein.',
    nachname: 'Bitte geben Sie Ihren Nachnamen ein.',
    hilfe: 'Bitte wählen Sie aus, wobei Sie helfen möchten.',
    region: 'Bitte wählen Sie aus, wo Sie helfen möchten.',
    verfuegbarkeit: 'Bitte geben Sie an, wann Sie in der Regel Zeit haben.',
    emailLeer: 'Bitte geben Sie Ihre E-Mail-Adresse an, damit wir uns nach der Prüfung melden können.',
    email: 'Bitte prüfen Sie die E-Mail-Adresse. Sie sollte so aussehen: name@beispiel.de',
    telefon: 'Die Telefonnummer scheint nicht vollständig zu sein. Bitte nur Ziffern, Leerzeichen und + / - verwenden.',
    einwilligung: 'Bitte bestätigen Sie die Einwilligung, damit wir Ihre Registrierung prüfen dürfen.'
  };

  function initProviderForm() {
    var form = document.getElementById('anbieter-formular');
    var success = document.getElementById('anbieter-erfolg');
    var summary = document.getElementById('anbieter-fehler');
    if (!form || !success || !summary) return;

    var f = form.elements;
    var radiosArt = byName(form, 'art');
    var sections = form.querySelectorAll('[data-art-bereich]');
    var hint = form.querySelector('[data-art-hinweis]');
    radiosArt().forEach(function (r) { r.setAttribute('aria-describedby', 'a-art-fehler'); });

    function art() {
      var checked = form.querySelector('input[name="art"]:checked');
      return checked ? checked.value : '';
    }

    // Nur die Felder der gewählten Anbieterart zeigen (ohne JS: beide sichtbar)
    function updateArt() {
      var current = art();
      sections.forEach(function (section) {
        var active = section.getAttribute('data-art-bereich') === current;
        section.hidden = !active;
        section.disabled = !active;
      });
      if (hint) hint.hidden = Boolean(current);
    }
    radiosArt().forEach(function (r) { r.addEventListener('change', updateArt); });
    updateArt();

    // Buttons "Als Betrieb registrieren" / "Als privater Helfer registrieren"
    document.addEventListener('click', function (event) {
      var link = event.target.closest('[data-anbieterart]');
      if (!link) return;
      var radio = form.querySelector('input[name="art"][value="' + CSS.escape(link.getAttribute('data-anbieterart')) + '"]');
      if (!radio || form.hidden) return;
      event.preventDefault();
      radio.checked = true;
      updateArt();
      history.replaceState(null, '', window.location.pathname + '#registrierung');
      scrollToEl(document.getElementById('registrierung'));
      radio.focus({ preventScroll: true });
    });

    function val(input) { return input.value.trim(); }
    function isArt(name) { return function () { return art() === name; }; }

    var fields = [
      { error: 'a-art-fehler', focus: first(radiosArt), inputs: radiosArt, group: document.getElementById('a-art'),
        check: function () { return art() ? '' : MSG_A.art; } },
      // gewerblich
      { error: 'a-firma-fehler', focus: self(f.firma), inputs: one(f.firma), when: isArt('gewerblich'),
        check: function () { return val(f.firma) ? '' : MSG_A.firma; } },
      { error: 'a-ansprechpartner-fehler', focus: self(f.ansprechpartner), inputs: one(f.ansprechpartner), when: isArt('gewerblich'),
        check: function () { return val(f.ansprechpartner) ? '' : MSG_A.ansprechpartner; } },
      { error: 'a-bereiche-fehler', focus: first(byName(form, 'bereiche')), inputs: byName(form, 'bereiche'),
        group: document.getElementById('a-bereiche'), when: isArt('gewerblich'),
        check: function () { return anyChecked(form, 'bereiche') ? '' : MSG_A.bereiche; } },
      { error: 'a-einsatzorte-fehler', focus: first(byName(form, 'einsatzorte')), inputs: byName(form, 'einsatzorte'),
        group: document.getElementById('a-einsatzorte'), when: isArt('gewerblich'),
        check: function () { return anyChecked(form, 'einsatzorte') || val(f.weitere_orte) ? '' : MSG_A.einsatzorte; } },
      // privat
      { error: 'a-vorname-fehler', focus: self(f.vorname), inputs: one(f.vorname), when: isArt('privat'),
        check: function () { return val(f.vorname) ? '' : MSG_A.vorname; } },
      { error: 'a-nachname-fehler', focus: self(f.nachname), inputs: one(f.nachname), when: isArt('privat'),
        check: function () { return val(f.nachname) ? '' : MSG_A.nachname; } },
      { error: 'a-hilfe-fehler', focus: first(byName(form, 'hilfe')), inputs: byName(form, 'hilfe'),
        group: document.getElementById('a-hilfe'), when: isArt('privat'),
        check: function () { return anyChecked(form, 'hilfe') ? '' : MSG_A.hilfe; } },
      { error: 'a-region-fehler', focus: self(f.region), inputs: one(f.region), when: isArt('privat'),
        check: function () { return f.region.value ? '' : MSG_A.region; } },
      { error: 'a-verfuegbarkeit-fehler', focus: first(byName(form, 'verfuegbarkeit')), inputs: byName(form, 'verfuegbarkeit'),
        group: document.getElementById('a-verfuegbarkeit'), when: isArt('privat'),
        check: function () { return anyChecked(form, 'verfuegbarkeit') ? '' : MSG_A.verfuegbarkeit; } },
      // Kontakt + Einwilligung
      { error: 'a-email-fehler', focus: self(f.email), inputs: one(f.email),
        check: function () {
          var mail = val(f.email);
          if (!mail) return MSG_A.emailLeer;
          return EMAIL_RE.test(mail) ? '' : MSG_A.email;
        } },
      { error: 'a-telefon-fehler', focus: self(f.telefon), inputs: one(f.telefon),
        check: function () { return phoneInvalid(val(f.telefon)) ? MSG_A.telefon : ''; } },
      { error: 'a-einwilligung-fehler', focus: self(f.einwilligung), inputs: one(f.einwilligung),
        group: document.getElementById('a-einwilligung-feld'),
        check: function () { return f.einwilligung.checked ? '' : MSG_A.einwilligung; } }
    ];

    var validation = setupValidation(form, summary, fields, function () {
      var artEl = success.querySelector('[data-erfolg-art]');
      if (artEl) artEl.textContent = art() === 'gewerblich'
        ? ' – bei Bedarf bitten wir dann um passende Nachweise'
        : ' – gern auch zu einem kurzen persönlichen Kennenlernen';
      showSuccess(form, success);
    });

    var again = success.querySelector('[data-neue-anfrage]');
    if (again) {
      again.addEventListener('click', function () {
        validation.reset();
        updateArt();
        success.hidden = true;
        form.hidden = false;
        radiosArt()[0].focus();
      });
    }
  }

  /* ------------------------------------------------------------------------
     7. Ratgeber-Übersicht – Themenfilter
        Markup erzeugt tools/build.py (Buttons mit aria-pressed, Karten mit data-thema).
        Ohne JS ist die Leiste per CSS ausgeblendet und alle Karten sind sichtbar.
        Zustand in der Adresszeile (?thema=slug), damit Links wie /ratgeber/?thema=… funktionieren.
     ------------------------------------------------------------------------ */
  function initRatgeberFilter() {
    var root = document.querySelector('[data-filter]');
    var list = document.querySelector('[data-filter-items]');
    if (!root || !list) return;
    var buttons = Array.prototype.slice.call(root.querySelectorAll('[data-filter-thema]'));
    var items = Array.prototype.slice.call(list.querySelectorAll('[data-thema]'));
    var status = root.querySelector('[data-filter-status]');

    function labelOf(button) {
      // Thementitel ohne Anzahl in Klammern
      var clone = button.cloneNode(true);
      var count = clone.querySelector('.filter__count');
      if (count) count.remove();
      return clone.textContent.trim();
    }

    function apply(thema, updateUrl) {
      var button = buttons.filter(function (b) { return b.getAttribute('data-filter-thema') === thema; })[0];
      if (!button) { thema = ''; button = buttons[0]; }
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
      var visible = 0;
      items.forEach(function (item) {
        var show = !thema || item.getAttribute('data-thema') === thema;
        item.hidden = !show;
        if (show) visible += 1;
      });
      if (status) {
        var text = visible + (visible === 1 ? ' Beitrag' : ' Beiträge');
        if (thema) text += ' zum Thema „' + labelOf(button) + '“';
        status.textContent = text;
      }
      if (updateUrl) {
        var params = new URLSearchParams(window.location.search);
        if (thema) params.set('thema', thema); else params.delete('thema');
        var query = params.toString();
        history.replaceState(null, '', window.location.pathname + (query ? '?' + query : '') + window.location.hash);
      }
    }

    root.addEventListener('click', function (event) {
      var button = event.target.closest('[data-filter-thema]');
      if (!button || !root.contains(button)) return;
      apply(button.getAttribute('data-filter-thema'), true);
    });

    // Beim Laden: ?thema=… übernehmen (unbekannte/leere Themen → „Alle“, Parameter wird entfernt)
    var initial = new URLSearchParams(window.location.search).get('thema');
    if (initial !== null) apply(initial, true);
  }

  /* ------------------------------------------------------------------------ */
  initNavigation();
  var updateLeistungen = initLeistungen();
  initRequestForm(updateLeistungen);
  initPreselect();
  initProviderForm();
  initRatgeberFilter();
})();
