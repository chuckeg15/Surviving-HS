import { chromium, devices } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
function findChromium(){const b='/opt/pw-browsers';for(const d of readdirSync(b).filter(x=>x.startsWith('chromium-')).sort().reverse()){const p=path.join(b,d,'chrome-linux','chrome');if(existsSync(p))return p;}}
const br = await chromium.launch({ executablePath:findChromium(),
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await br.newContext({ ...devices['Pixel 5'] });
const p = await ctx.newPage();
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file:///home/user/Surviving-HS/dist-single/candlewake.html');
await p.waitForTimeout(4000);
const boot = await p.evaluate(()=>({ hooked: !!window.__candlewake, bootText: (document.getElementById('boot')||{}).textContent||'' }));
console.log('booted:', boot.hooked, '| boot msg:', boot.bootText.slice(0,80));
await p.screenshot({ path:'shots/mobile-1-load.png' });
if (boot.hooked) {
  // touch-only: tap OK twice to get through the title, then walk with the dpad
  const tap = async (sel) => { const el = await p.$(sel); if(!el) { console.log('missing', sel); return; }
    const b = await el.boundingBox(); await p.touchscreen.tap(b.x+b.width/2, b.y+b.height/2); };
  await tap('#touch .a'); await p.waitForTimeout(700);
  await tap('#touch .a'); await p.waitForTimeout(900);
  console.log('scene after taps:', (await p.evaluate(()=>window.__candlewake.probe())).scene);
  await p.screenshot({ path:'shots/mobile-2-touch.png' });
}
console.log(errs.length? 'ERRORS: '+errs.slice(0,3).join(' | ') : 'no page errors');
await br.close();
