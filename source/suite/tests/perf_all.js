// Before/after for every machine page: real WebGL draw calls per frame (incl. shadow pass and insets),
// draws while paused, errors.  node perf_all.js <v1 dir> <v2 dir> [pages...]
const { chromium } = require('playwright');
const path = require('path');
const [V1, V2, ...pages] = process.argv.slice(2);
const PAGES = pages.length ? pages : ['printer', 'spi', 'placement', 'reflow', 'aoi', 'handling_line'];
const COUNT = () => { window.__dc = 0; window.__fr = 0; const w = (P) => { for (const k of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) { const o = P[k]; if (o) P[k] = function () { window.__dc++; return o.apply(this, arguments); }; } };
  w(WebGLRenderingContext.prototype); w(WebGL2RenderingContext.prototype); try { localStorage.setItem('smt-quality', 'high'); } catch (e) {} };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const rows = [];
  for (const pg of PAGES) for (const [ver, dir] of [['v1', V1], ['v2', V2]]) {
    const f = path.join(dir, pg + '.html'); if (!require('fs').existsSync(f)) continue;
    const p = await b.newPage({ viewport: { width: 1600, height: 900 } });
    await p.addInitScript(COUNT);
    const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
    const t0 = Date.now(); await p.goto('file://' + f); await p.waitForTimeout(5000);
    // frames: count requestAnimationFrame ticks via a counter of our own
    await p.evaluate(() => { window.__ticks = 0; (function t() { window.__ticks++; requestAnimationFrame(t); })(); });
    const a = await p.evaluate(() => [__dc, __ticks]); const s0 = Date.now(); await p.waitForTimeout(6000);
    const c = await p.evaluate(() => [__dc, __ticks]); const secs = (Date.now() - s0) / 1000;
    const run = { dpf: (c[0] - a[0]) / Math.max(1, c[1] - a[1]), fps: (c[1] - a[1]) / secs };
    // pause, let things settle, then count draws for 3 s
    await p.evaluate(() => { const b = document.getElementById('bPause') || document.getElementById('play') || [...document.querySelectorAll('#bar button')].find(x => /pause/i.test(x.textContent)); if (b) b.click(); });
    await p.waitForTimeout(2500); const d0 = await p.evaluate(() => [__dc, __ticks]); await p.waitForTimeout(3000); const d1 = await p.evaluate(() => [__dc, __ticks]);
    const idle = (d1[0] - d0[0]) / Math.max(1, d1[1] - d0[1]);
    const extra = await p.evaluate(() => window.__v2 ? JSON.stringify(window.__v2.merge) : '');
    rows.push({ pg, ver, dpf: Math.round(run.dpf), fps: run.fps.toFixed(1), idle: Math.round(idle), errs: errs.filter(e => !/GPU stall|WebGL-|swiftshader/i.test(e)).slice(0, 2).join(' | '), extra });
    await p.close();
  }
  await b.close();
  console.log('| page | v1 draws/frame | v2 draws/frame | v1 fps* | v2 fps* | draws/frame while paused v1 → v2 |\n|---|---|---|---|---|---|');
  for (const pg of PAGES) { const a = rows.find(r => r.pg === pg && r.ver === 'v1'), c = rows.find(r => r.pg === pg && r.ver === 'v2'); if (!a || !c) continue;
    console.log(`| ${pg} | ${a.dpf} | ${c.dpf} | ${a.fps} | ${c.fps} | ${a.idle} → ${c.idle} |`); }
  rows.filter(r => r.errs || r.extra).forEach(r => console.log(r.pg, r.ver, r.extra, r.errs));
})();
