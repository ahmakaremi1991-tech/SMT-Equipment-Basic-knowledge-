const { chromium } = require('playwright');
const out = __dirname + '/../../../out/thumbs/';
const ONLY=process.argv.slice(2);
const jobs = [
  ['printer','smt_printer.html','',"window.__step=0;__sim.ff(14);"],
  ['spi','smt_spi.html','',"window.__step=0;__sim.ff(20);"],
  ['placement','smt_placement.html','',"__sim.seek(__sim.duration*0.45);__sim.pause();"],
  ['reflow','smt_reflow.html','',"window.__step=0;__sim.ff(500);"],
  ['aoi','smt_aoi.html','',"window.__step=0;__sim.ff(20);"],
  ['line','smt_handling_line.html','#line',"window.__step=0;__sim.ff(120);__sim.views.line();"],
  ['loader','smt_handling_line.html','#loader',"window.__step=0;__sim.ff(14);__sim.setHoods(1);"],
  ['destacker','smt_handling_line.html','#destacker',"window.__step=0;__sim.ff(9);"],
  ['laser','smt_handling_line.html','#laser',"window.__step=0;__sim.ff(10);__sim.setHoods(1);"],
  ['conveyor','smt_handling_line.html','#cleaning',"window.__step=0;__sim.ff(8);"],
  ['shuttle','smt_handling_line.html','#shuttle',"window.__step=0;__sim.ff(6.5);"],
  ['scanner','smt_handling_line.html','#scanner',"window.__step=0;__sim.ff(8);"],
  ['fifo','smt_handling_line.html','#fifo',"window.__step=0;__sim.ff(40);__sim.setHoods(1);"],
  ['inverter','smt_handling_line.html','#inverter',"window.__step=0;__sim.ff(8.6);__sim.setHoods(1);"],
  ['unloader','smt_handling_line.html','#unloader',"window.__step=0;__sim.ff(30);__sim.setHoods(1);"],
  ['aoitable','smt_handling_line.html','#aoitable',"window.__step=0;__sim.ff(14);"],
];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [n, f, h, js] of jobs) {
    if (ONLY.length && !ONLY.includes(n)) continue;
    const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
    p.on('pageerror', e => console.log(n, 'ERR', e.message));
    await p.addInitScript(() => { try { localStorage.setItem('smt-theme', 'dark'); localStorage.setItem('smt-side', 'open'); } catch (e) {} });
    await p.goto('file:///home/user/' + f + h); await p.waitForTimeout(2500);
    await p.addStyleTag({ content: '#side,.panel,#hint,#tags,.tag,#tip{display:none!important}' });
    await p.evaluate(a => { eval(a); }, js);await p.waitForTimeout(4000);
    await p.waitForTimeout(2500);
    if (f.includes('handling') && n!=='line') await p.evaluate(() => { camera.position.lerp(controls.target, .42); camera.position.y += 120; });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: out + n + '.png' });
    await p.close(); console.log('ok', n);
  }
  await b.close();
})();
