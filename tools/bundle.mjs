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
<script type="module">
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
