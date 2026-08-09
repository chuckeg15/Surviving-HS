import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--no-sandbox','--disable-dev-shm-usage'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const e = []; p.on('pageerror', x => e.push(x.message));
await p.goto('http://localhost:5175/', { waitUntil: 'load' });
await p.waitForTimeout(2500);
for (const s of process.argv.slice(2)) {
  await p.evaluate(async n => { await window.__candlewake.gotoScene(n); }, s);
  await p.waitForTimeout(1300);
  await p.screenshot({ path: `shots/${s}.png` });
  console.log(s, '->', await p.evaluate(() => window.__candlewake.app.state.room));
}
console.log(e.length ? e.slice(0,5) : 'no page errors');
await b.close();
