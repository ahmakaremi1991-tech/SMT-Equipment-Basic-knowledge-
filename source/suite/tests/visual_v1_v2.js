// Same moments on v1 and v2 of each page, screenshots side by side + pixel difference.
// node visual_v1_v2.js <v1 dir> <v2 dir> <out dir> [pages]
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const [V1, V2, OUT, ...pages] = process.argv.slice(2); fs.mkdirSync(OUT, { recursive: true });
const PAGES = pages.length ? pages : ['printer', 'spi', 'placement', 'reflow', 'aoi', 'handling_line'];
const MOMENTS = { placement: [3, 9, 14], handling_line: [20, 60, 140], default: [6, 25, 60] };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const res = [];
  for (const pg of PAGES) for (const [ver, dir] of [['v1', V1], ['v2', V2]]) {
    const p = await b.newPage({ viewport: { width: 960, height: 600 } });
    await p.addInitScript(() => { window.__step = 0; try { localStorage.clear(); localStorage.setItem('smt-quality', 'high'); localStorage.setItem('smt-side', 'min'); } catch (e) {} });
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + path.join(dir, pg + '.html')); await p.waitForTimeout(3500);
    if (pg === 'handling_line') await p.evaluate(() => setMode(true));
    let prev = 0;
    for (const t of (MOMENTS[pg] || MOMENTS.default)) {
      await p.evaluate(([t, prev, pg]) => {
        if (pg === 'placement') { __sim.pause(); __sim.seek(t); }
        else { __sim.ff(t - prev); }
        window.dispatchEvent(new Event('keydown'));
      }, [t, prev, pg]); prev = t;
      await p.waitForTimeout(2500);
      await p.evaluate(() => window.dispatchEvent(new Event('keydown'))); await p.waitForTimeout(1500);
      await p.screenshot({ path: path.join(OUT, `${pg}_${t}_${ver}.png`) });
    }
    if (errs.length) console.log(pg, ver, 'ERR', errs[0]);
    await p.close();
  }
  await b.close();
})();
