const { chromium } = require('playwright');
const out = __dirname + '/../../../out/shots/suite/h_';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('ERR ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file:///home/user/smt_handling_line.html');
  await p.waitForTimeout(2500);
  const which = process.argv.slice(2);
  for (const w of which) {
    const [n, js, ff] = w.split('|');
    await p.evaluate(([a, f]) => { window.__step = 0; eval(a); __sim.ff(+f || 0); }, [js, ff]);
    await p.waitForTimeout(3500);
    await p.screenshot({ path: out + n + '.png' });
    console.log(n, JSON.stringify(await p.evaluate(() => ({ t: __sim.time.toFixed(0), st: __sim.MACH.map(m => m.key + ':' + m.done + ':' + m.state).join(' | '), cyc: document.getElementById('cyV').textContent + ' ' + document.getElementById('cyS').textContent }))));
  }
  console.log(errs.slice(0, 10).join('\n'));
  await b.close();
})();
