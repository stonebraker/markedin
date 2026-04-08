'use strict';

(function () {
  // Only act when the browser is showing a raw .mi file.
  // Chrome renders plain-text responses inside a <pre> wrapped in <body>.
  const pre = document.querySelector('body > pre');
  if (!pre) return;

  // Verify the URL actually ends in .mi (ignore query strings)
  const path = window.location.pathname;
  if (!path.endsWith('.mi')) return;

  const source = pre.textContent;

  // Parse and render
  let html = '';
  try {
    html = markedin.renderHtmlFrag(source);
  } catch (e) {
    html = '<pre style="color:#dc2626;padding:1rem">' + e.message + '</pre>';
  }

  // Replace the page content
  document.body.innerHTML = html;
  document.body.classList.add('mi-preview');

  // Set page title from frontmatter if available
  try {
    const { data } = markedin.parse(source);
    if (data.title) document.title = data.title;
  } catch (_) {}
})();
