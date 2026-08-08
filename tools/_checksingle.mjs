import { chromium } from 'playwright';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
function findChromium() {
  const base = '/opt/pw-browsers';
  for (const d of readdirSync(base).filter(x=>x.startsWith('chromium-')).sort().reverse()) {
    const p = path.join(base, d, 'chrome-linux', 'chrome');
    if (existsSync(p)) return p;
  }
}
const b = await chromium.launch({ executablePath: findChromium(),
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport:{width:1280,height:720} });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file:///home/user/Surviving-HS/dist-single/candlewake.html');
await p.waitForTimeout(3500);
const probe = await p.evaluate(()=> window.__candlewake ? window.__candlewake.probe() : null);
console.log('probe:', JSON.stringify(probe));
await p.screenshot({ path:'/home/user/Surviving-HS/shots/single-title.png' });
// drive into the game to prove it is not just a title card
await p.keyboard.press('KeyZ'); await p.waitForTimeout(600);
await p.keyboard.press('KeyZ'); await p.waitForTimeout(900);
const p2 = await p.evaluate(()=> window.__candlewake.probe());
console.log('after start:', JSON.stringify({scene:p2.scene}));
await p.screenshot({ path:'/home/user/Surviving-HS/shots/single-next.png' });
console.log(errs.length? 'ERRORS: '+errs.slice(0,3).join(' | ') : 'no page errors');
await b.close();
