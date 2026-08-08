/** Portrait review page: every hair style x a few frames, at 6x. Served at /portraits.html. */
import { HAIR_STYLES, PORTRAIT_H, PORTRAIT_W, getPortrait, ActorLook } from '@/art/actors';
import { PAL } from '@/art/palette';

const S = Number(new URLSearchParams(location.search).get('s') ?? 6);
const base: ActorLook = {
  frame: 'average', skin: 3, hair: 'crop', hairColor: PAL.rust1,
  eyeColor: PAL.brine3, uniform: 'spinehand', accent: PAL.amber2, accessory: 'none',
};
const c = document.getElementById('view') as HTMLCanvasElement;
c.width = HAIR_STYLES.length * (PORTRAIT_W * S + 6);
c.height = 3 * (PORTRAIT_H * S + 6);
const g = c.getContext('2d')!;
g.imageSmoothingEnabled = false;
g.fillStyle = PAL.void1;
g.fillRect(0, 0, c.width, c.height);
[2, 4, 0].forEach((skin, row) => {
  HAIR_STYLES.forEach((hair, i) => {
    const p = getPortrait({ ...base, hair, skin, hairColor: row === 1 ? PAL.bone2 : PAL.rust1 });
    g.drawImage(p, i * (PORTRAIT_W * S + 6) + 3, row * (PORTRAIT_H * S + 6) + 3, PORTRAIT_W * S, PORTRAIT_H * S);
  });
});
(window as unknown as Record<string, unknown>).__portraits = true;
