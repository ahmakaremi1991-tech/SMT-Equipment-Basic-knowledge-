const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('ERR ' + e.message)); p.on('console', m => { if (m.type() === 'error' || m.type()==='warning') errs.push('CONSOLE ' + m.text()); });
  p.on('request', r => { if (!r.url().startsWith('file:') && !r.url().startsWith('data:')) errs.push('NET ' + r.url()); });
  await p.goto('file:///home/user/smt_placement.html');
  await p.waitForTimeout(4000);
  const info = await p.evaluate(() => window.__sim ? { dur: __sim.duration, parts: __sim.JOB.length, keys: new Set(__sim.JOB.map(j=>j.key)).size, cyc: document.getElementById('cyV').textContent + ' | ' + document.getElementById('cyS').textContent } : null);
  console.log(JSON.stringify(info));
  const sh = async (n, js, w = 3000) => { await p.evaluate(a => { eval(a); }, js); await p.waitForTimeout(w); await p.screenshot({ path: __dirname + '/../../../out/shots/suite/npm_' + n + '.png' }); };
  await sh('iso', "__sim.seek(__sim.duration*0.45);__sim.pause();");
  await sh('gantry', "__sim.setView('gantry');");
  await sh('board', "__sim.setView('board');");
  await sh('nozzle', "__sim.setView('pickf');");
  await sh('light', "document.getElementById('themeTgl').click();document.getElementById('sideTgl').click();__sim.setView('iso');");
  console.log(errs.slice(0, 12).join('\n'));
  await b.close();
})();
