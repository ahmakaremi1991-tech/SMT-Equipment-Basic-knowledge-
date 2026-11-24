const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1400, height: 800 } }); const errs=[];p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/user/smt-equipment-basic-knowledge-/machines/handling_line.html#aoitable'); await p.waitForTimeout(2500);
  console.log('deep link:', await p.evaluate(() => document.querySelector('#title .t1').textContent));
  console.log(await p.evaluate(() => { window.__step=0; __sim.setMode(true); __sim.ff(360); const u=__sim.MACH.find(m=>m.key==='unloader'),a=__sim.MACH.find(m=>m.key==='aoitable');
    return 'line 360 s: unloader stored '+u.stored+' · AOI table OK '+a.stats.ok+' NG '+a.stats.ng+' · '+document.getElementById('cyS').textContent; }));
  console.log('errors:', errs.length ? errs : 'none'); await b.close(); })();
