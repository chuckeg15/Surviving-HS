/**
 * Folds the single-chunk build into one standalone .html, and emits a
 * body-only fragment for hosting on a platform that supplies its own
 * <head>/<body> wrapper.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'dist-single');
const html = readFileSync(path.join(OUT, 'index.html'), 'utf8');
const js = readFileSync(path.join(OUT, 'game.js'), 'utf8');

// pull the <style> block and the stage markup out of the built index.html
const style = (html.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
const stage = (html.match(/<div id="stage">[\s\S]*?<\/div>\s*<\/div>/) || [''])[0];
const boot = '<div id="boot">LOADING&#8230;</div>';

const fragment = `<style>
${style}
/* hosted page: the wrapper supplies its own body, so pin the stage to it */
html, body { margin:0; padding:0; height:100%; overflow:hidden; background:#05080a; }
</style>
${stage}
${boot}
<script>
(function () {
  // A blank screen with no explanation is the worst possible failure. Anything
  // that stops the game booting says so, in words, on the page.
  function fail(msg) {
    var b = document.getElementById('boot');
    if (!b) { b = document.createElement('div'); b.id = 'boot'; document.body.appendChild(b); }
    b.className = '';
    b.style.cssText = 'position:fixed;inset:0;z-index:99;display:grid;place-items:center;' +
      'background:#05080a;color:#c6d6cf;font:13px/1.6 ui-monospace,monospace;padding:24px;text-align:center';
    b.innerHTML = '<div style="max-width:36em"><p style="color:#ab2a28;letter-spacing:.2em;' +
      'text-transform:uppercase;font-size:11px;margin:0 0 14px">Candlewake could not start</p>' +
      '<p style="margin:0 0 12px">' + msg + '</p>' +
      '<p style="color:#55747f;font-size:11px;margin:0">The game needs a current browser with ' +
      'WebGL enabled. On a phone, open this file in Chrome or Firefox rather than a file-manager ' +
      'preview - previews usually cannot run WebGL.</p></div>';
  }
  try {
    var c = document.createElement('canvas');
    var gl = c.getContext('webgl2') || c.getContext('webgl') || c.getContext('experimental-webgl');
    if (!gl) { fail('This browser reports no WebGL support, which the renderer requires.'); return; }
  } catch (e) { fail('WebGL could not be initialised: ' + e.message); return; }
  window.addEventListener('error', function (e) {
    if (!window.__candlewake) fail('A script error stopped startup: ' + (e.message || 'unknown'));
  });
  setTimeout(function () {
    if (!window.__candlewake) fail('Startup did not complete. If you opened this from a file ' +
      'manager, try opening it directly in a browser instead.');
  }, 9000);
})();
</script>
<script>
${js}
</script>
`;

const standalone = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>CANDLEWAKE</title>
</head>
<body>
${fragment}
</body>
</html>
`;

writeFileSync(path.join(OUT, 'candlewake.html'), standalone);
if (!existsSync(path.join(ROOT, 'artifact'))) mkdirSync(path.join(ROOT, 'artifact'));
writeFileSync(path.join(ROOT, 'artifact', 'candlewake.html'), fragment);
const kb = (s) => (Buffer.byteLength(s) / 1024).toFixed(0) + ' kB';
console.log('standalone dist-single/candlewake.html  ' + kb(standalone));
console.log('fragment   artifact/candlewake.html     ' + kb(fragment));
