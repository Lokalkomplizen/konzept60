/* Setzt sofort die Klasse "js" auf <html> (vor dem CSS-Rendering), damit
 * das Mobilmenü nur dann zugeklappt wird, wenn JavaScript tatsächlich läuft.
 * Externe Datei statt Inline-Script → strikte CSP ohne 'unsafe-inline' möglich. */
document.documentElement.classList.remove('no-js');
document.documentElement.classList.add('js');
