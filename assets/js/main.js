/* ==========================================================================
   Konzept 60+ – main.js (Vanilla JS, kein Framework, kein Build)
   1. Mobile Navigation
   2. Vorauswahl im Anfrageformular (?thema=…, ?wer=…|?fuer=…, ?ort=…|?region=… bzw. Links;
      nur Werte aus den erlaubten Listen werden übernommen)
   3. Abhängige Leistungen je Themenbereich (Markup erzeugt tools/build.py aus data/themen.json)
   4. Formular-Validierung (gemeinsamer Baustein für Anfrage + Anbieter-Registrierung)
   5. Anfrageformular – Simulation
   6. Anbieter-Registrierung – Simulation, Felder je Anbieterart
   6b. Veranstaltung melden – Simulation (api.js)
   7. Ratgeber-Übersicht – Themenfilter (?thema=…)
   8. Ratgeber-Beitrag – Vorlesen (Web Speech API des Browsers, kein Drittanbieter)
   9. Scroll-Animationen (IntersectionObserver + CSS, dezent; aus bei reduzierter Bewegung)
  10. Seite teilen (navigator.share, sonst Link in die Zwischenablage)
  11. Ganze Seite drucken ([data-drucken-seite]) + Quellenangabe im Ausdruck
   Es wird NICHTS gesendet oder gespeichert: kein fetch, kein Storage, keine Cookies.
   → WordPress: wp_enqueue_script( 'wirhelfen-main', …, [ 'strategy' => 'defer' ] );
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
    // ?wer=selbst|angehoerige (vom Assistenten) – ?fuer= bleibt als älterer Name gültig
    var fuer = params.get('wer') || params.get('fuer');
    if (fuer) {
      var radio = form.querySelector('input[name="wer"][value="' + CSS.escape(fuer) + '"]');
      if (radio) { radio.checked = true; applied = true; }
    }
    var region = params.get('region');
    if (region && form.elements.ort && !form.elements.ort.value) {
      var option = document.querySelector('#f-orte option[data-region="' + CSS.escape(region) + '"]');
      if (option) { form.elements.ort.value = option.value; applied = true; }
    }
    // ?ort=<Stadt> (vom Assistenten): nur Städte aus der Liste der Startregionen übernehmen, sonst ignorieren
    var ort = params.get('ort');
    if (ort && form.elements.ort && !form.elements.ort.value) {
      var match = Array.prototype.slice.call(document.querySelectorAll('#f-orte option')).filter(function (o) {
        return o.value === ort;
      })[0];
      if (match) { form.elements.ort.value = match.value; applied = true; }
    }
    return applied;
  }

  function initPreselect() {
    var form = document.getElementById('anfrage-formular');
    if (!form) return;

    // a) Beim Laden: Parameter übernehmen, danach aus der Adresszeile entfernen
    var params = new URLSearchParams(window.location.search);
    if (applyPreselect(form, params) || ['thema', 'fuer', 'wer', 'region', 'ort'].some(function (k) { return params.has(k); })) {
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
    newsletter: 'Für den Newsletter benötigen wir Ihre E-Mail-Adresse. Bitte tragen Sie sie ein oder entfernen Sie das Häkchen.',
    einwilligung: 'Bitte bestätigen Sie die Einwilligung, damit unser Team Ihre Anfrage bearbeiten darf.',
    rueckrufEigen: 'Bitte nennen Sie Ihr gewünschtes Zeitfenster, zum Beispiel „dienstags ab 15 Uhr“, oder wählen Sie eine andere Möglichkeit.',
    senden: 'Das hat leider nicht geklappt. Bitte versuchen Sie es noch einmal.'
  };

  var RUECKRUF_TEXT = { vormittags: 'Vormittags (9–12 Uhr)', nachmittags: 'Nachmittags (13–17 Uhr)' };

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
          return mail && !EMAIL_RE.test(mail) ? MSG.email : '';
        } },
      { error: 'f-newsletter-fehler', focus: self(f.newsletter), inputs: one(f.newsletter),
        group: document.getElementById('f-newsletter-feld'),
        check: function () { return f.newsletter.checked && !val(f.email) ? MSG.newsletter : ''; } },
      { error: 'f-datenschutz-fehler', focus: self(f.einwilligung_bearbeitung), inputs: one(f.einwilligung_bearbeitung),
        group: document.getElementById('f-datenschutz-feld'),
        check: function () { return f.einwilligung_bearbeitung.checked ? '' : MSG.einwilligung; } }
    ];

    // Rückrufwunsch (optional): Gruppe nur sichtbar/aktiv, solange eine Telefonnummer eingetragen ist
    var rueckrufGroup = form.querySelector('[data-rueckruf]');
    var rueckrufEigen = form.querySelector('[data-rueckruf-eigen]');
    var rueckrufReset = form.querySelector('[data-rueckruf-zuruecksetzen]');
    var radiosRueckruf = byName(form, 'rueckruf');
    function rueckrufAktiv() { return Boolean(rueckrufGroup) && !rueckrufGroup.hidden; }
    function rueckrufWahl() {
      var checked = form.querySelector('input[name="rueckruf"]:checked');
      return rueckrufAktiv() && checked ? checked.value : '';
    }
    function setDisabled(node, disabled) {
      node.hidden = disabled;
      node.disabled = disabled; // wirkt auf fieldset; Eingaben darin werden dann nicht übertragen/validiert
    }
    function updateRueckruf() {
      if (!rueckrufGroup) return;
      setDisabled(rueckrufGroup, !val(f.telefon));
      var wahl = form.querySelector('input[name="rueckruf"]:checked');
      if (rueckrufEigen) {
        var eigen = Boolean(wahl) && wahl.value === 'eigen' && rueckrufAktiv();
        rueckrufEigen.hidden = !eigen;
        f.rueckruf_eigen.disabled = !eigen;
      }
      if (rueckrufReset) rueckrufReset.hidden = !wahl;
    }
    if (rueckrufGroup) {
      radiosRueckruf().forEach(function (r) { r.setAttribute('aria-describedby', 'f-rueckruf-fehler'); });
      f.telefon.addEventListener('input', updateRueckruf);
      form.addEventListener('change', updateRueckruf);
      if (rueckrufReset) {
        rueckrufReset.addEventListener('click', function () {
          radiosRueckruf().forEach(function (r) { r.checked = false; });
          f.rueckruf_eigen.value = '';
          updateRueckruf();
          radiosRueckruf()[0].focus();
        });
      }
      updateRueckruf();
      fields.push({ error: 'f-rueckruf-eigen-fehler', focus: self(f.rueckruf_eigen), inputs: one(f.rueckruf_eigen),
        when: function () { return rueckrufWahl() === 'eigen'; },
        check: function () { return val(f.rueckruf_eigen) ? '' : MSG.rueckrufEigen; } });
    }

    // Nutzlast gemäß JSDoc in api.js (AnfragePayload)
    function buildPayload() {
      var wahl = rueckrufWahl();
      var wer = form.querySelector('input[name="wer"]:checked');
      return {
        wer: wer ? wer.value : '',
        thema: f.thema.value,
        leistungen: Array.prototype.slice.call(form.querySelectorAll('input[name="leistungen"]:checked'))
          .filter(function (i) { return !i.disabled; }).map(function (i) { return i.value; }),
        beschreibung: val(f.beschreibung),
        plz: val(f.plz),
        ort: val(f.ort),
        vorname: val(f.vorname),
        nachname: val(f.nachname),
        telefon: val(f.telefon),
        email: val(f.email),
        rueckruf: wahl ? { fenster: wahl, eigenes: wahl === 'eigen' ? val(f.rueckruf_eigen) : null } : null,
        einwilligung_bearbeitung: f.einwilligung_bearbeitung.checked,
        newsletter: f.newsletter.checked
      };
    }

    var absenden = form.querySelector('[data-absenden]');
    var absendenLabel = absenden ? absenden.textContent : '';
    var sendeFehler = form.querySelector('[data-sende-fehler]');

    function zeigeErfolg(payload) {
      var nameEl = success.querySelector('[data-erfolg-name]');
      var kontaktEl = success.querySelector('[data-erfolg-kontakt]');
      var rueckrufEl = success.querySelector('[data-erfolg-rueckruf]');
      var rueckrufText = success.querySelector('[data-erfolg-rueckruf-text]');
      var mailEl = success.querySelector('[data-erfolg-email]');
      if (nameEl) nameEl.textContent = ', ' + payload.vorname + ' ' + payload.nachname;
      if (kontaktEl) kontaktEl.textContent = payload.telefon ? ' – telefonisch unter ' + payload.telefon : ' – per E-Mail an ' + payload.email;
      if (rueckrufEl && rueckrufText) {
        rueckrufEl.hidden = !payload.rueckruf;
        if (payload.rueckruf) {
          rueckrufText.textContent = payload.rueckruf.fenster === 'eigen'
            ? 'Eigenes Zeitfenster – ' + payload.rueckruf.eigenes
            : RUECKRUF_TEXT[payload.rueckruf.fenster];
        }
      }
      // Hinweis auf die E-Mail-Bestätigung nur, wenn eine E-Mail-Adresse angegeben wurde
      if (mailEl) mailEl.hidden = !payload.email;
      showSuccess(form, success);
    }

    var validation = setupValidation(form, summary, fields, function () {
      var payload = buildPayload();
      if (absenden) { absenden.disabled = true; absenden.textContent = 'Wird übermittelt …'; }
      form.setAttribute('aria-busy', 'true');
      // Schnittstelle: assets/js/api.js – im Prototyp simuliert, es wird nichts gesendet
      window.WirHelfenAPI.sendeAnfrage(payload).then(function () {
        zeigeErfolg(payload);
      }).catch(function () {
        if (sendeFehler) { sendeFehler.textContent = MSG.senden; }
      }).then(function () {
        form.removeAttribute('aria-busy');
        if (absenden) { absenden.disabled = false; absenden.textContent = absendenLabel; }
      });
    });

    var again = success.querySelector('[data-neue-anfrage]');
    if (again) {
      again.addEventListener('click', function () {
        validation.reset();
        if (updateLeistungen) updateLeistungen();
        updateRueckruf();
        if (sendeFehler) sendeFehler.textContent = '';
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
     6b. Veranstaltung melden (/veranstaltungen/melden/) – Simulation über api.js
     ------------------------------------------------------------------------ */
  var MSG_V = {
    titel: 'Bitte geben Sie den Titel der Veranstaltung ein.',
    kategorie: 'Bitte wählen Sie ein Thema aus.',
    datumLeer: 'Bitte geben Sie das Datum ein.',
    datumVergangen: 'Das Datum liegt in der Vergangenheit. Bitte geben Sie ein zukünftiges Datum ein.',
    beginn: 'Bitte geben Sie die Uhrzeit des Beginns ein.',
    ende: 'Das Ende muss nach dem Beginn liegen.',
    stadt: 'Bitte wählen Sie die Stadt aus.',
    ort: 'Bitte geben Sie den Veranstaltungsort mit Straße ein.',
    beschreibung: 'Bitte beschreiben Sie die Veranstaltung kurz.',
    link: 'Bitte prüfen Sie die Internetadresse. Sie sollte mit https:// beginnen.',
    veranstalter: 'Bitte geben Sie den Namen des Veranstalters ein.',
    ansprechperson: 'Bitte nennen Sie eine Ansprechperson.',
    emailLeer: 'Bitte geben Sie Ihre E-Mail-Adresse an, damit wir bei Fragen antworten können.',
    email: 'Bitte prüfen Sie die E-Mail-Adresse. Sie sollte so aussehen: name@beispiel.de',
    telefon: 'Die Telefonnummer scheint nicht vollständig zu sein. Bitte nur Ziffern, Leerzeichen und + / - verwenden.',
    einwilligung: 'Bitte bestätigen Sie, dass Sie berechtigt sind und der Datenschutzerklärung zustimmen.',
    senden: 'Das hat leider nicht geklappt. Bitte versuchen Sie es noch einmal.'
  };
  var BESCHREIBUNG_MAX = 400;

  function initEventForm() {
    var form = document.getElementById('melden-formular');
    var success = document.getElementById('melden-erfolg');
    var summary = document.getElementById('melden-fehler');
    if (!form || !success || !summary) return;

    var f = form.elements;
    function val(input) { return input.value.trim(); }
    function radio(name) {
      var checked = form.querySelector('input[name="' + name + '"]:checked');
      return checked ? checked.value : '';
    }
    function heuteIso() {
      var d = new Date();
      return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
    }
    function urlInvalid(value) {
      if (!value) return false;
      try { var u = new URL(value); return !/^https?:$/.test(u.protocol); } catch (e) { return true; }
    }
    function required(name, message) {
      return { error: 'm-' + name + '-fehler', focus: self(f[name]), inputs: one(f[name]),
        check: function () { return val(f[name]) ? '' : message; } };
    }

    var fields = [
      required('titel', MSG_V.titel),
      required('kategorie', MSG_V.kategorie),
      { error: 'm-datum-fehler', focus: self(f.datum), inputs: one(f.datum),
        check: function () {
          var v = val(f.datum);
          if (!v) return MSG_V.datumLeer;
          return v < heuteIso() ? MSG_V.datumVergangen : '';
        } },
      required('beginn', MSG_V.beginn),
      { error: 'm-ende-fehler', focus: self(f.ende), inputs: one(f.ende),
        when: function () { return Boolean(val(f.ende) && val(f.beginn)); },
        check: function () { return val(f.ende) <= val(f.beginn) ? MSG_V.ende : ''; } },
      required('stadt', MSG_V.stadt),
      required('ort', MSG_V.ort),
      required('beschreibung', MSG_V.beschreibung),
      { error: 'm-link-fehler', focus: self(f.link), inputs: one(f.link),
        check: function () { return urlInvalid(val(f.link)) ? MSG_V.link : ''; } },
      required('veranstalter', MSG_V.veranstalter),
      required('ansprechperson', MSG_V.ansprechperson),
      { error: 'm-email-fehler', focus: self(f.email), inputs: one(f.email),
        check: function () {
          var mail = val(f.email);
          if (!mail) return MSG_V.emailLeer;
          return EMAIL_RE.test(mail) ? '' : MSG_V.email;
        } },
      { error: 'm-telefon-fehler', focus: self(f.telefon), inputs: one(f.telefon),
        check: function () { return phoneInvalid(val(f.telefon)) ? MSG_V.telefon : ''; } },
      { error: 'm-einwilligung-fehler', focus: self(f.einwilligung), inputs: one(f.einwilligung),
        group: document.getElementById('m-einwilligung-feld'),
        check: function () { return f.einwilligung.checked ? '' : MSG_V.einwilligung; } }
    ];

    // Zeichenzähler (nur mit JS; ohne JS begrenzt maxlength)
    var zaehler = form.querySelector('[data-zaehler]');
    function updateZaehler() {
      if (!zaehler) return;
      var rest = BESCHREIBUNG_MAX - f.beschreibung.value.length;
      zaehler.textContent = 'Noch ' + rest + ' Zeichen';
    }
    f.beschreibung.addEventListener('input', updateZaehler);

    // Nutzlast gemäß JSDoc in api.js (VeranstaltungPayload)
    function buildPayload() {
      return {
        titel: val(f.titel), datum: val(f.datum), beginn: val(f.beginn), ende: val(f.ende),
        stadt: f.stadt.value, ort: val(f.ort), kategorie: f.kategorie.value,
        beschreibung: val(f.beschreibung).slice(0, BESCHREIBUNG_MAX),
        kosten: val(f.kosten), anmeldung: radio('anmeldung'), barrierefrei: radio('barrierefrei') || 'unbekannt',
        link: val(f.link), veranstalter: val(f.veranstalter), ansprechperson: val(f.ansprechperson),
        email: val(f.email), telefon: val(f.telefon), einwilligung: f.einwilligung.checked
      };
    }

    var absenden = form.querySelector('[data-absenden]');
    var absendenLabel = absenden ? absenden.textContent : '';
    var sendeFehler = form.querySelector('[data-sende-fehler]');

    var validation = setupValidation(form, summary, fields, function () {
      // Honigtopf gefüllt: so tun, als wäre es angekommen, aber nichts senden
      if (val(f.website)) { showSuccess(form, success); return; }
      var payload = buildPayload();
      if (absenden) { absenden.disabled = true; absenden.textContent = 'Wird übermittelt …'; }
      form.setAttribute('aria-busy', 'true');
      // Schnittstelle: assets/js/api.js – im Prototyp simuliert, es wird nichts gesendet
      window.WirHelfenAPI.veranstaltungMelden(payload).then(function () {
        showSuccess(form, success);
      }).catch(function () {
        if (sendeFehler) sendeFehler.textContent = MSG_V.senden;
      }).then(function () {
        form.removeAttribute('aria-busy');
        if (absenden) { absenden.disabled = false; absenden.textContent = absendenLabel; }
      });
    });

    var again = success.querySelector('[data-neue-anfrage]');
    if (again) {
      again.addEventListener('click', function () {
        validation.reset();
        updateZaehler();
        if (sendeFehler) sendeFehler.textContent = '';
        success.hidden = true;
        form.hidden = false;
        f.titel.focus();
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


  /* ------------------------------------------------------------------------
     8. Ratgeber-Beitrag – Vorlesen
     Liest Titel und Beitragstext abschnittsweise mit der Sprachausgabe des Browsers vor
     (speechSynthesis, deutsche Stimme falls vorhanden). Pause = anhalten und an derselben
     Stelle weiterlesen (abschnittsweise, weil pause()/resume() auf Android unzuverlässig ist).
     Ohne Unterstützung bleibt die Schaltfläche verborgen.
     ------------------------------------------------------------------------ */
  function initVorlesen() {
    var root = document.querySelector('[data-vorlesen]');
    var body = document.querySelector('.article__body');
    if (!root || !body) return;
    if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance !== 'function') return;

    var synth = window.speechSynthesis;
    var startBtn = root.querySelector('[data-vorlesen-start]');
    var stoppBtn = root.querySelector('[data-vorlesen-stopp]');
    var label = root.querySelector('[data-vorlesen-label]');
    var icon = root.querySelector('[data-vorlesen-icon]');
    var status = root.querySelector('[data-vorlesen-status]');

    var title = document.querySelector('.article__header h1');
    var parts = [title].concat(Array.prototype.slice.call(
      body.querySelectorAll('h2, h3, p, li, th, td, figcaption, caption')
    )).filter(function (el) {
      // Hinweisbox am Ende und verschachtelte Absätze (z. B. <p> in <li>) nicht doppelt lesen
      if (!el || el.closest('.article__disclaimer')) return false;
      var parent = el.parentElement && el.parentElement.closest('li, th, td, p');
      return !(parent && body.contains(parent));
    }).filter(function (el) { return el.textContent.trim() !== ''; });
    if (!parts.length) return;

    var state = 'idle';   // idle | playing | paused
    var index = 0;
    var current = null;
    var voice = null;

    function pickVoice() {
      var voices = synth.getVoices() || [];
      voice = voices.filter(function (v) { return /^de(-|_|$)/i.test(v.lang) && v.localService; })[0] ||
              voices.filter(function (v) { return /^de(-|_|$)/i.test(v.lang); })[0] || null;
    }
    pickVoice();
    if (typeof synth.addEventListener === 'function') synth.addEventListener('voiceschanged', pickVoice);

    function mark(el) {
      var prev = document.querySelector('.vorlesen-aktiv');
      if (prev) prev.classList.remove('vorlesen-aktiv');
      if (el) el.classList.add('vorlesen-aktiv');
    }

    function setUi() {
      var text = state === 'playing' ? 'Pause' : state === 'paused' ? 'Weiterlesen' : 'Beitrag vorlesen';
      label.textContent = text;
      icon.setAttribute('href', state === 'playing' ? '#icon-pause' : '#icon-vorlesen');
      stoppBtn.hidden = state === 'idle';
    }

    function announce(text) { status.textContent = text; }

    function speakFrom(i) {
      if (i >= parts.length) { stop('Vorlesen beendet.'); return; }
      index = i;
      var el = parts[i];
      var u = new window.SpeechSynthesisUtterance(el.textContent.replace(/\s+/g, ' ').trim());
      u.lang = 'de-DE';
      if (voice) u.voice = voice;
      u.rate = 0.95;
      current = u;
      u.onend = function () {
        if (current !== u || state !== 'playing') return;
        speakFrom(i + 1);
      };
      u.onerror = function (e) {
        if (current !== u || state !== 'playing') return;
        if (e && (e.error === 'interrupted' || e.error === 'canceled')) return;
        speakFrom(i + 1);
      };
      mark(el);
      synth.speak(u);
    }

    function play() {
      synth.cancel();
      state = 'playing';
      setUi();
      announce(index === 0 ? 'Vorlesen gestartet.' : 'Vorlesen fortgesetzt.');
      speakFrom(index);
    }

    function pause() {
      state = 'paused';
      current = null;
      synth.cancel();
      setUi();
      announce('Vorlesen angehalten.');
    }

    function stop(message) {
      state = 'idle';
      current = null;
      index = 0;
      synth.cancel();
      mark(null);
      setUi();
      announce(message || 'Vorlesen beendet.');
    }

    startBtn.addEventListener('click', function () {
      if (state === 'playing') pause(); else play();
    });
    stoppBtn.addEventListener('click', function () { stop(); startBtn.focus(); });
    window.addEventListener('pagehide', function () { synth.cancel(); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && state !== 'idle') stop();
    });

    synth.cancel();   // evtl. noch laufende Ausgabe einer vorherigen Seite beenden
    root.hidden = false;
  }


  /* ------------------------------------------------------------------------
     10. Seite teilen
     Progressive Enhancement: Die Schaltfläche steht mit "hidden" im HTML und
     erscheint nur, wenn der Browser teilen (navigator.share, meist auf Handys)
     oder in die Zwischenablage schreiben kann. Geteilt wird immer die Adresse
     der aktuellen Seite ohne Sprungmarke – die Abfrage (?thema=…, ?ort=…) bleibt
     erhalten, weil sie den gezeigten Inhalt bestimmt.
     Es wird nichts gesendet: navigator.share übergibt nur an das Gerät.
     ------------------------------------------------------------------------ */
  function seitenAdresse() {
    var url = new URL(window.location.href);
    url.hash = '';                    // Sprungmarke weg, Abfrage behalten
    return url.href;
  }

  function initTeilen() {
    var kannTeilen = typeof navigator.share === 'function';
    var kannKopieren = !!(navigator.clipboard && typeof navigator.clipboard.writeText === 'function');
    if (!kannTeilen && !kannKopieren) return;

    Array.prototype.forEach.call(document.querySelectorAll('[data-teilen]'), function (button) {
      var reihe = button.closest('[data-werkzeuge]');
      var status = reihe && reihe.querySelector('[data-werkzeuge-status]');
      var timer = null;

      // Meldung am Button: sichtbar und über role="status" angekündigt, nach 3 s wieder weg
      function melden(text) {
        if (!status) return;
        status.textContent = text;
        if (timer) window.clearTimeout(timer);
        timer = window.setTimeout(function () { status.textContent = ''; }, 3000);
      }

      function kopieren() {
        if (!kannKopieren) { melden('Teilen hat nicht geklappt.'); return; }
        navigator.clipboard.writeText(seitenAdresse()).then(function () {
          melden('Link kopiert');
        }, function () {
          melden('Kopieren hat nicht geklappt.');
        });
      }

      button.addEventListener('click', function () {
        if (!kannTeilen) { kopieren(); return; }
        var versuch;
        try {
          versuch = navigator.share({
            title: button.getAttribute('data-teilen-titel') || document.title,
            url: seitenAdresse()
          });
        } catch (e) {
          kopieren();
          return;
        }
        if (versuch && typeof versuch.catch === 'function') {
          versuch.catch(function (fehler) {
            // Abbruch durch die Nutzerin ist kein Fehler – dann keine Meldung
            if (fehler && fehler.name === 'AbortError') return;
            kopieren();
          });
        }
      });

      button.hidden = false;
    });
  }

  /* ------------------------------------------------------------------------
     11. Ganze Seite drucken + Quellenangabe im Ausdruck
     [data-drucken-seite] druckt die ganze Seite; print.css lässt nur den Inhalt
     stehen. Bewusst ein eigenes Attribut: [data-drucken] ist in assets/js/alltag.js
     der Bereichsdruck (einzelne Checkliste, Auswertung) – die beiden dürfen sich
     nicht in die Quere kommen.
     Die Quellenangabe (.print-url aus templates/_layout.html) wird erst beim Drucken
     gefüllt. Eigener beforeprint-Listener, weil der in Abschnitt 9 bei reduzierter
     Bewegung oder ohne IntersectionObserver gar nicht angemeldet wird.
     ------------------------------------------------------------------------ */
  function initDrucken() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-drucken-seite]'), function (button) {
      button.addEventListener('click', function () { window.print(); });
      button.hidden = false;
    });

    var ziele = document.querySelectorAll('[data-print-url]');
    if (!ziele.length) return;
    window.addEventListener('beforeprint', function () {
      Array.prototype.forEach.call(ziele, function (el) {
        el.textContent = 'Quelle: ' + seitenAdresse();
      });
    });
  }


  /* ------------------------------------------------------------------------
     9. Scroll-Animationen
     Ordnet Elementen per Selektor einen Effekt zu (data-anim), damit Templates
     und später das WordPress-Theme kein Extra-Markup brauchen.
     Sicherheitsnetz: Ohne JS, ohne IntersectionObserver oder bei
     prefers-reduced-motion passiert nichts – alles bleibt normal sichtbar.
     ------------------------------------------------------------------------ */
  function initScrollAnimationen() {
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) return;

    var GRUPPEN = [
      // [Selektor, Effekt, Stagger (Kinder zeitversetzt)]
      ['.section__header, .page-header h1, .article__body > h2, .topic-columns h2', 'up'],
      ['.article__body > p, .article__body > ul, .article__body > .article__table-wrap, .article__notice, .relatives__panel, .section > .container > .notice', 'up'],
      ['.grid, .trust__list, .benefits, .steps', 'up', true],
      ['.split > :first-child, .topic-columns > :nth-child(odd)', 'left'],
      ['.split > :last-child, .topic-columns > :nth-child(even)', 'right'],
      ['.article__figure img, .card__media img', 'zoom']
    ];
    var STAGGER_MS = 90, STAGGER_SPALTEN = 3; // Verzögerung je Spalte, nicht über die ganze Liste
    var ziele = [];

    GRUPPEN.forEach(function (g) {
      document.querySelectorAll(g[0]).forEach(function (el) {
        if (g[2]) {
          Array.prototype.forEach.call(el.children, function (kind, i) {
            if (kind.hasAttribute('data-anim')) return;
            kind.setAttribute('data-anim', g[1]);
            kind.style.setProperty('--anim-delay', (i % STAGGER_SPALTEN) * STAGGER_MS + 'ms');
            ziele.push(kind);
          });
        } else if (!el.hasAttribute('data-anim') && !el.closest('[data-anim]:not([data-anim="zoom"])')) {
          el.setAttribute('data-anim', g[1]);
          ziele.push(el);
        }
      });
    });
    // Bilder in bereits animierten Karten trotzdem zoomen lassen
    document.querySelectorAll('.article__figure img, .card__media img').forEach(function (img) {
      if (!img.hasAttribute('data-anim')) { img.setAttribute('data-anim', 'zoom'); ziele.push(img); }
    });

    // Was beim Laden schon im Bild ist, bleibt einfach stehen (kein Aufblitzen).
    var vh = window.innerHeight || document.documentElement.clientHeight;
    ziele.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) el.classList.add('is-visible');
    });
    document.documentElement.classList.add('js-anim');

    var io = new IntersectionObserver(function (eintraege) {
      eintraege.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.05 });
    ziele.forEach(function (el) { if (!el.classList.contains('is-visible')) io.observe(el); });

    // Drucken: alles zeigen
    window.addEventListener('beforeprint', function () {
      ziele.forEach(function (el) { el.classList.add('is-visible'); });
    });

    initParallax();
  }

  /* Dezentes Parallax für große Bilder – nur Desktop, nur transform, rAF-gedrosselt */
  function initParallax() {
    var desktop = window.matchMedia('(min-width: 60em)');
    var bilder = Array.prototype.slice.call(document.querySelectorAll('.hero__media img, .topic-hero__media img'));
    if (!bilder.length) return;
    var STAERKE = 28; // max. Verschiebung in px nach oben/unten
    var geplant = false;

    function aktualisieren() {
      geplant = false;
      var vh = window.innerHeight;
      bilder.forEach(function (img) {
        if (!desktop.matches) { img.classList.remove('has-parallax'); return; }
        var r = img.parentNode.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2); // -1 … 1
        p = Math.max(-1, Math.min(1, p));
        img.style.setProperty('--parallax-y', (p * -STAERKE).toFixed(1) + 'px');
        img.classList.add('has-parallax');
      });
    }
    function anfordern() {
      if (!geplant) { geplant = true; window.requestAnimationFrame(aktualisieren); }
    }
    window.addEventListener('scroll', anfordern, { passive: true });
    window.addEventListener('resize', anfordern, { passive: true });
    aktualisieren();
  }

  /* ------------------------------------------------------------------------
     12. Checklisten in Ratgeber-Beiträgen: Fortschritt + Zurücksetzen
     (Markup: tools/build.py render_blocks; Haken werden nicht gespeichert)
     ------------------------------------------------------------------------ */
  function initBeitragCheck() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-beitrag-check]'), function (wrap) {
      var boxes = Array.prototype.slice.call(wrap.querySelectorAll('input[type="checkbox"]'));
      var status = wrap.querySelector('[data-check-status]');
      var text = wrap.querySelector('[data-check-text]');
      var prozent = wrap.querySelector('[data-check-prozent]');
      var balken = wrap.querySelector('[data-check-balken]');
      var leiste = wrap.querySelector('[role="progressbar"]');
      var reset = wrap.querySelector('[data-check-reset]');
      if (!boxes.length || !status) return;
      function update() {
        var done = boxes.filter(function (b) { return b.checked; }).length;
        var pct = Math.round(done / boxes.length * 100);
        text.textContent = done + ' von ' + boxes.length + ' Punkten geklärt';
        prozent.textContent = pct + ' %';
        balken.style.width = pct + '%';
        leiste.setAttribute('aria-valuenow', String(done));
        leiste.setAttribute('aria-valuetext', done + ' von ' + boxes.length);
      }
      status.hidden = false;
      if (reset) {
        reset.hidden = false;
        reset.addEventListener('click', function () {
          boxes.forEach(function (b) { b.checked = false; });
          update();
          boxes[0].focus();
        });
      }
      wrap.addEventListener('change', update);
      update();
    });
  }

  /* ------------------------------------------------------------------------ */
  initNavigation();
  var updateLeistungen = initLeistungen();
  initRequestForm(updateLeistungen);
  initPreselect();
  initProviderForm();
  initEventForm();
  initRatgeberFilter();
  initVorlesen();
  initTeilen();
  initDrucken();
  initScrollAnimationen();
  initBeitragCheck();
})();
