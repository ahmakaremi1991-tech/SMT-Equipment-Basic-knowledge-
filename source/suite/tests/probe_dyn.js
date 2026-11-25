// Finds every part that moves, turns, scales, hides or is removed while a page runs.
// Usage: node probe_dyn.js <page.html> <out.json> "<roots JS expr>" <sim seconds> ["<setup JS>"]
// The v2 build keeps these parts separate (everything else is merged).
const { chromium } = require('playwright');
const fs = require('fs');
const [page, out, rootsExpr, simS, setup] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 360, height: 240 } });
  await p.addInitScript(() => { window.__step = 0; try { localStorage.clear(); } catch (e) {} });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + require('path').resolve(page));
  await p.waitForTimeout(1500);
  const n0 = await p.evaluate(([rootsExpr, setup]) => {
    if (setup) eval(setup);
    const roots = eval(rootsExpr);
    const key = o => { const p = o.position, r = o.rotation, s = o.scale; return [p.x, p.y, p.z, r.x, r.y, r.z, s.x, s.y, s.z].map(v => v.toFixed(3)).join(',') + (o.visible ? 'v' : 'h'); };
    const all = [];
    roots.forEach((R, ri) => { const walk = (o, path) => { o.children.forEach((c, i) => { const pp = path.concat(i); all.push({ o: c, path: pp, parent: o, k: key(c), moved: false }); walk(c, pp); }); }; walk(R, [ri]); });
    window.__probe = { all, key, roots };
    return all.length;
  }, [rootsExpr, setup || '']);
  // exercise: run the simulation, and press every toolbar button once along the way
  const btns = await p.evaluate(() => [...document.querySelectorAll('#bar button')].map((b, i) => i));
  const total = +simS, chunk = 4;
  let pressed = 0;
  for (let t = 0; t < total; t += chunk) {
    await p.evaluate(([chunk]) => { window.__step = 0.25; }, [chunk]);
    await p.waitForTimeout(600);
    await p.evaluate(() => {
      window.__step = 0;
      if (window.__sim && __sim.ff) __sim.ff(3);
      const P = window.__probe; for (const e of P.all) { if (e.moved) continue; if (e.o.parent !== e.parent || P.key(e.o) !== e.k) e.moved = true; }
    });
    if (pressed < btns.length) { await p.evaluate(i => { const b = document.querySelectorAll('#bar button')[i]; if (b && !/RESET|Reset|STOP|Pause|PAUSE/.test(b.textContent)) b.click(); }, btns[pressed]); pressed++; }
  }
  // run once more with every button pressed, then compare a last time
  await p.evaluate(() => { window.__step = 0.25; }); await p.waitForTimeout(1500);
  const res = await p.evaluate(() => { const P = window.__probe; for (const e of P.all) { if (!e.moved && (e.o.parent !== e.parent || P.key(e.o) !== e.k)) e.moved = true; }
    return P.all.filter(e => e.moved).map(e => e.path); });   // every moving node: a moving part inside another moving part must stay separate too
  fs.writeFileSync(out, JSON.stringify(res));
  console.log(require('path').basename(page), 'objects', n0, 'moving', res.length, 'buttons pressed', pressed, errs.length ? 'ERR ' + errs[0] : '');
  await b.close();
})();
