import { chromium } from 'playwright';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
function findChromium(){const b='/opt/pw-browsers';for(const d of readdirSync(b).filter(x=>x.startsWith('chromium-')).sort().reverse()){const p=path.join(b,d,'chrome-linux','chrome');if(existsSync(p))return p;}}
// wrap the fragment the way the host will, to test what viewers actually get
const frag = readFileSync('artifact/candlewake.html','utf8');
writeFileSync('/tmp/wrapped.html', '<!doctype html><html><head><meta charset="utf-8"></head><body>'+frag+'</body></html>');
const br = await chromium.launch({ executablePath: findChromium(),
  args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage'] });
const p = await br.newPage({ viewport:{width:1440,height:900} });
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('file:///tmp/wrapped.html'); await p.waitForTimeout(3000);
await p.screenshot({ path:'shots/artifact-card.png' });
await p.click('#begin'); await p.waitForTimeout(1200);
console.log('scene after begin:', JSON.stringify((await p.evaluate(()=>window.__candlewake.probe())).scene));
await p.keyboard.press('KeyZ'); await p.waitForTimeout(700);
await p.keyboard.press('KeyZ'); await p.waitForTimeout(900);
await p.screenshot({ path:'shots/artifact-play.png' });
console.log('scene:', JSON.stringify((await p.evaluate(()=>window.__candlewake.probe())).scene));
console.log(errs.length? 'ERRORS: '+errs.slice(0,3).join(' | ') : 'no page errors');
await br.close();
