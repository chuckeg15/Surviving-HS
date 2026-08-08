import { chromium, devices } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
function findChromium(){const b='/opt/pw-browsers';for(const d of readdirSync(b).filter(x=>x.startsWith('chromium-')).sort().reverse()){const p=path.join(b,d,'chrome-linux','chrome');if(existsSync(p))return p;}}
const br = await chromium.launch({ executablePath:findChromium(),
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await br.newContext({ ...devices['Pixel 5'] });
const p = await ctx.newPage();
await p.goto('file:///home/user/Surviving-HS/dist-single/candlewake.html');
await p.waitForTimeout(4000);
const d = await p.evaluate(() => {
  const f = document.getElementById('frame');
  const w = document.getElementById('world');
  const u = document.getElementById('ui');
  const fr = f.getBoundingClientRect();
  // sample the UI canvas (2D) for any non-transparent pixel
  const c2 = u.getContext('2d');
  let uiPix = 0;
  try { const img = c2.getImageData(0,0,u.width,u.height).data;
    for (let i=3;i<img.length;i+=4) if (img[i]>8) uiPix++; } catch(e) { uiPix = -1; }
  return {
    innerW: innerWidth, innerH: innerHeight, dpr: devicePixelRatio,
    frame: { w: fr.width, h: fr.height, x: fr.x, y: fr.y },
    worldAttr: [w.width, w.height],
    worldCss: [getComputedStyle(w).width, getComputedStyle(w).height],
    uiAttr: [u.width, u.height],
    uiNonEmptyPixels: uiPix,
    stageDisplay: getComputedStyle(document.getElementById('stage')).display,
    scene: window.__candlewake ? window.__candlewake.probe().scene : 'none',
  };
});
console.log(JSON.stringify(d, null, 1));
await br.close();
