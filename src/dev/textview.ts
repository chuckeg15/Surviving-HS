/**
 * Text reveal review page. Nobody can inspect a typewriter in a live frame —
 * by the time a screenshot is taken the line has finished — so this drives
 * TextReveal with a fixed timestep and draws the state at chosen moments, plus
 * the paging and indicator states side by side.
 *
 * It also counts the blips each speed asks for, because "one blip every few
 * characters" is a claim about a rate and a rate can be measured.
 *
 * Served at /text.html.
 */

import { PAL } from '@/art/palette';
import { Painter } from '@/ui/painter';
import { TextReveal, type RevealOpts } from '@/game/dialogue';
import { settings, TEXT_CPS, type TextSpeed } from '@/core/settings';
import { audio } from '@/core/audio';
import { LINE_H, wrapText } from '@/art/font';

const W = 420;
const STEP = 1 / 60;

const SAMPLE =
  'The cradle log runs to four pages and stops mid-entry on the third of ' +
  'Thirdmonth. No sign-off. No fault code. Nothing after it at all.';

const LONG =
  'Annex Three is listed as cold storage and has been drawing eleven kilowatts ' +
  'since the second watch. The manifest says the compartment is empty. The load ' +
  'says it is not, and the load is measured at the bus, which nobody on this ' +
  'deck can edit.';

/** Runs a reveal forward by `seconds` at a fixed step. */
function sim(r: TextReveal, seconds: number): void {
  for (let t = 0; t < seconds - 1e-9; t += STEP) r.update(STEP);
}

/** Seconds of typing before the first page is complete. */
function timeToFinish(text: string, o: RevealOpts): number {
  const r = new TextReveal();
  r.show(text, o);
  let t = 0;
  while (r.typing && t < 30) {
    r.update(STEP);
    t += STEP;
  }
  return t;
}

let blips = 0;
type SfxFn = (typeof audio)['sfx'];

function box(
  p: Painter,
  r: TextReveal,
  x: number,
  y: number,
  w: number,
  label: string,
  time = 0,
): number {
  const h = 8 + r.boxLines * LINE_H + 10;
  p.text(label, x, y - 9, { color: PAL.iron5 });
  p.panel(x, y, w, h, 'dialogue');
  r.draw(p, x + 8, y + 8, { color: PAL.bone2, shadow: PAL.void0 });
  r.drawIndicator(p, x + w - 12, y + h - 12, time);
  return h;
}

function main(): void {
  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const opts: RevealOpts = { width: W - 40, maxLines: 4 };
  const speeds: TextSpeed[] = ['slow', 'normal', 'fast', 'instant'];

  // The store is shared with the game on this origin, so put it back after.
  const keep = settings.get().textSpeed;
  const realSfx: SfxFn = audio.sfx.bind(audio);
  audio.sfx = ((id, o) => {
    if (id === 'text.blip') blips++;
    realSfx(id, o);
  }) as SfxFn;

  // Every reveal is simulated up front so the drawing pass is a snapshot of
  // states that are all reproducible, not of whatever the clock happened to do.
  const speedRows = speeds.map((s) => {
    settings.set('textSpeed', s);
    const r = new TextReveal();
    r.show(SAMPLE, { ...opts, token: `speed-${s}` });
    const before = blips;
    sim(r, 1);
    return { s, r, blips: blips - before };
  });

  settings.set('textSpeed', 'normal');
  const shots = [0.25, 0.6, 1.2, 4].map((t) => {
    const r = new TextReveal();
    r.show(SAMPLE, { ...opts, token: `shot-${t}` });
    sim(r, t);
    return { t, r };
  });

  const paged: { label: string; r: TextReveal }[] = [];
  {
    const r = new TextReveal();
    r.show(LONG, { width: W - 40, maxLines: 3, token: 'page' });
    sim(r, 6);
    paged.push({ label: `page 1 of ${r.pageCount} \x7f full, more behind it`, r });
    const r2 = new TextReveal();
    r2.show(LONG, { width: W - 40, maxLines: 3, token: 'page' });
    sim(r2, 6);
    r2.confirm();
    sim(r2, 0.5);
    paged.push({ label: 'page 2, half revealed', r: r2 });
    const r3 = new TextReveal();
    r3.show(LONG, { width: W - 40, maxLines: 3, token: 'page' });
    for (let i = 0; i < 8; i++) {
      sim(r3, 6);
      if (!r3.confirm()) break;
    }
    paged.push({ label: 'last page \x7f finished, the player has the turn', r: r3 });
  }

  // Confirm never advances past unread text. Three presses: one during the
  // reveal, one a frame later, one after the guard has lapsed.
  const twice = new TextReveal();
  twice.show(LONG, { width: W - 40, maxLines: 3, token: 'twice' });
  sim(twice, 0.3);
  const mash: string[] = [];
  twice.confirm();
  mash.push(`typing press -> page ${twice.pageIndex + 1}, ${twice.typing ? 'typing' : 'complete'}`);
  sim(twice, STEP);
  twice.confirm();
  mash.push(`mashed press -> page ${twice.pageIndex + 1}`);
  sim(twice, 0.25);
  twice.confirm();
  mash.push(`press after 0.25s -> page ${twice.pageIndex + 1}`);

  // The beats are the whole difference between the run time and the arithmetic.
  const beats = timeToFinish(SAMPLE, { ...opts, token: 'beats' });
  const flat = wrapText(SAMPLE, W - 40).join('').length / TEXT_CPS.normal;

  settings.set('textSpeed', keep);
  audio.sfx = realSfx;

  const rows: { label: string; r: TextReveal }[] = [
    ...speedRows.map((row) => {
      const cps = TEXT_CPS[row.s];
      return {
        label: `${row.s.toUpperCase()}  ${cps === Infinity ? 'instant' : `${cps} cps`}  ${row.blips} blips/s`,
        r: row.r,
      };
    }),
    ...shots.map((s) => ({ label: `normal, t=${s.t.toFixed(2)}s`, r: s.r })),
    ...paged,
  ];

  canvas.width = W;
  canvas.height =
    46 + rows.reduce((n, row) => n + 8 + row.r.boxLines * LINE_H + 10 + 22, 0) + 56;
  const g = canvas.getContext('2d')!;
  g.imageSmoothingEnabled = false;
  const p = new Painter(g);
  p.rect(0, 0, canvas.width, canvas.height, PAL.void1);
  p.text('TEXT REVEAL REVIEW', 10, 6, { color: PAL.halo3 });
  p.text('every box below is one second of typing unless labelled', 10, 16, {
    color: PAL.iron4,
  });

  let y = 46;
  for (const row of rows) y += box(p, row.r, 10, y, W - 20, row.label, 0.2) + 22;

  mash.forEach((m, i) => p.text(m, 10, y + i * 10, { color: PAL.halo2 }));
  p.text(
    `punctuation: ${beats.toFixed(2)}s to type, ${flat.toFixed(2)}s of characters`,
    10,
    y + mash.length * 10,
    { color: PAL.iron5 },
  );

  (window as unknown as Record<string, unknown>).__textview = {
    blipsPerSecond: Object.fromEntries(speedRows.map((r) => [r.s, r.blips])),
    mash,
    pages: paged[0].r.pageCount,
  };
}

main();
