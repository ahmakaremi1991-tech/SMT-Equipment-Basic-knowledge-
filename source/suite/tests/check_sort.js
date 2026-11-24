const { chromium } = require('playwright');
const out = __dirname + '/../../../out/shots/sort/';
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('ERR ' + e.message+' '+e.stack)); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('file:///home/user/smt_sorting_line.html');
  await p.waitForTimeout(3000);
  const st=()=>p.evaluate(()=>({st:__sim.state,hold:__sim.hold,cnt:JSON.stringify(__sim.CNT),mags:[0,1,2].map(i=>__sim.magCount(i)).join('/'),line:__sim.LINE.map(m=>m.key+':'+m.st).join(' '),start:document.getElementById('bStart').disabled}));
  for (const w of process.argv.slice(2)) {
    const [n, js, ff, wt] = w.split('|');
    await p.evaluate(([a, f]) => { window.__step = 0; eval(a); __sim.ff(+f || 0); }, [js, ff]);
    await p.waitForTimeout(+wt||3000);
    await p.screenshot({ path: out + n + '.png' });
    console.log(n, JSON.stringify(await st()));
  }
  console.log(errs.slice(0, 10).join('\n'));
  await b.close();
})();
