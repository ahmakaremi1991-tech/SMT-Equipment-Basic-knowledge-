const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 } });
  await p.goto('file:///home/user/smt_sorting_line.html');
  await p.waitForTimeout(3000);
  await p.addStyleTag({content:'#side,#title,#cycle,#hud,#bar,#hint,#tags{display:none!important}#stage{left:0!important;inset:0!important}'});
  await p.evaluate(()=>{window.__step=0;__sim.start();__sim.ff(45);});
  await p.waitForTimeout(1500);
  await p.evaluate(()=>{window.dispatchEvent(new Event('resize'));});
  await p.waitForTimeout(1500);
  await p.evaluate(()=>{__sim.views.over();__sim.endTween();});
  await p.waitForTimeout(4000);
  await p.screenshot({ path: __dirname+'/../../../out/shots/sort/thumb.png' });
  await b.close();
})();
