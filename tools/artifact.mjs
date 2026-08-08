/**
 * Composes the hosted single-page build: the game, plus a thin instrument
 * frame drawn from the game's OWN palette so the page and the game read as one
 * object rather than a game embedded in a website.
 *
 * The boarding card is not decoration: browsers block audio until the user
 * interacts with the page, so the game needs a real click before it can make
 * sound. Making that click carry the premise and the controls turns a browser
 * constraint into the opening beat.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'dist-single');
const html = readFileSync(path.join(OUT, 'index.html'), 'utf8');
const js = readFileSync(path.join(OUT, 'game.js'), 'utf8');
const style = (html.match(/<style>([\s\S]*?)<\/style>/) || [, ''])[1];
const stage = (html.match(/<div id="stage">[\s\S]*?<\/div>\s*<\/div>/) || [''])[0];

const page = `<title>CANDLEWAKE</title>
<style>
${style}

/* ---- hosted frame -------------------------------------------------------
   Single-theme on purpose: this is a ship's cathode screen at 02:00 and a
   light mode would be a lie. Every colour is stated explicitly so the page
   holds on whichever ground the host paints behind it. Values are lifted
   from src/art/palette.ts, so the chrome and the game share one palette. */
:root {
  --void0:#04070a; --void1:#070d11; --void2:#0b141a;
  --iron1:#22343d; --iron3:#3f5a65; --iron4:#55747f;
  --bone1:#a9bdb9; --bone2:#c6d6cf; --bone3:#e4ece4;
  --halo1:#14655e; --halo3:#54e0c8; --amber3:#f5cc57;
  --mono: ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas,
          "Liberation Mono", monospace;
}
html, body {
  margin:0; padding:0; height:100%; overflow:hidden;
  background: var(--void0); color: var(--bone2); font-family: var(--mono);
}
#stage { background: var(--void0); }

/* corner tag: the only persistent chrome once you are playing */
#tag {
  position:fixed; left:10px; bottom:9px; z-index:20;
  font-size:10px; letter-spacing:.22em; text-transform:uppercase;
  color:var(--iron4); pointer-events:none; user-select:none;
  transition:opacity .5s ease; display:flex; gap:.8em; align-items:baseline;
}
#tag b { color:var(--halo1); font-weight:600; letter-spacing:.3em; }
#tag.dim { opacity:.35; }

/* ---- boarding card ---- */
#board {
  position:fixed; inset:0; z-index:40; display:grid; place-items:center;
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(20,101,94,.10), transparent 60%),
    var(--void0);
  transition:opacity .55s ease, visibility .55s;
}
#board.gone { opacity:0; visibility:hidden; }
.card {
  width:min(560px, calc(100vw - 40px));
  background:var(--void1);
  border:1px solid var(--iron1);
  padding:30px 30px 26px;
  position:relative;
}
/* machined corner notches - the same mark the game draws on its own panels */
.card::before, .card::after {
  content:""; position:absolute; width:13px; height:13px;
  border-color:var(--halo3); border-style:solid; border-width:0;
}
.card::before { top:-1px; left:-1px; border-top-width:1px; border-left-width:1px; }
.card::after  { bottom:-1px; right:-1px; border-bottom-width:1px; border-right-width:1px; }

.eyebrow {
  font-size:10px; letter-spacing:.42em; text-transform:uppercase;
  color:var(--halo3); margin:0 0 16px;
}
h1 {
  font-family:var(--mono); font-size:clamp(30px,6.4vw,46px); line-height:1;
  letter-spacing:.16em; font-weight:700; color:var(--bone3);
  margin:0 0 14px; text-wrap:balance;
}
.premise {
  font-size:13px; line-height:1.65; color:var(--bone1);
  margin:0 0 22px; max-width:52ch;
}
.premise em { color:var(--bone3); font-style:normal; }

.rule { height:1px; background:var(--iron1); margin:0 0 18px; }

dl.keys {
  display:grid; grid-template-columns:auto 1fr; gap:7px 16px;
  margin:0 0 24px; font-size:11.5px; align-items:baseline;
}
dl.keys dt {
  color:var(--amber3); letter-spacing:.1em; white-space:nowrap;
  font-variant-numeric:tabular-nums;
}
dl.keys dd { margin:0; color:var(--bone1); }

button#begin {
  font-family:var(--mono); font-size:12px; letter-spacing:.3em;
  text-transform:uppercase; color:var(--void0); background:var(--halo3);
  border:0; padding:13px 30px; cursor:pointer; width:100%;
  transition:background .15s ease, transform .08s ease;
}
button#begin:hover { background:#7defd8; }
button#begin:active { transform:translateY(1px); }
button#begin:focus-visible { outline:2px solid var(--amber3); outline-offset:3px; }

.foot {
  margin:16px 0 0; font-size:10px; line-height:1.6; color:var(--iron4);
  letter-spacing:.04em;
}
@media (prefers-reduced-motion: reduce) {
  #board, #tag { transition:none; }
}
</style>

${stage}

<div id="board">
  <div class="card">
    <p class="eyebrow">RV Candlewake &middot; Deck C &middot; Third watch</p>
    <h1>CANDLEWAKE</h1>
    <p class="premise">
      Your shift partner missed muster. The record says she transferred decks at
      03:10, on the Captain's authority. Her boots are still in her locker, and
      <em>nobody changes decks without boots</em>.
    </p>
    <div class="rule"></div>
    <dl class="keys">
      <dt>Arrows / WASD</dt><dd>move</dd>
      <dt>Z &middot; Enter</dt><dd>talk, examine, confirm</dd>
      <dt>X &middot; Esc</dt><dd>back</dd>
      <dt>C</dt><dd>menu &mdash; saves, settings, accessibility</dd>
      <dt>Q</dt><dd>journal &mdash; clues, deductions, people</dd>
      <dt>Shift</dt><dd>run</dd>
    </dl>
    <button id="begin" type="button">Begin third watch</button>
    <p class="foot">
      Runs entirely in this page. All art is drawn by code at startup and all
      sound is synthesised live &mdash; there are no asset files. Saves to this
      browser. Chapter One is complete; the rest is designed, not built.
    </p>
  </div>
</div>

<div id="tag"><b>Candlewake</b><span>C menu &middot; Q journal</span></div>

<script type="module">
${js}
</script>
<script>
(function () {
  var board = document.getElementById('board');
  var begin = document.getElementById('begin');
  var tag = document.getElementById('tag');
  function start() {
    board.classList.add('gone');
    // hand focus to the game so the very first arrow key moves the character
    var ui = document.getElementById('ui');
    if (ui) { ui.setAttribute('tabindex', '0'); ui.focus(); }
    setTimeout(function () { tag.classList.add('dim'); }, 2600);
  }
  begin.addEventListener('click', start);
  // Enter/Space on the card should also start, so a keyboard player never has
  // to reach for the mouse to get in.
  document.addEventListener('keydown', function (e) {
    if (board.classList.contains('gone')) return;
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'z' || e.key === 'Z') {
      e.preventDefault(); start();
    }
  });
})();
</script>
`;

if (!existsSync(path.join(ROOT, 'artifact'))) mkdirSync(path.join(ROOT, 'artifact'));
writeFileSync(path.join(ROOT, 'artifact', 'candlewake.html'), page);
console.log('artifact/candlewake.html  ' + (Buffer.byteLength(page) / 1024).toFixed(0) + ' kB');
