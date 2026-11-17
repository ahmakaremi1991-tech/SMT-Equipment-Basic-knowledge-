"""Assemble one machine page from the shared shell."""
import os
D=os.path.dirname(os.path.abspath(__file__))
rd=lambda p:open(os.path.join(D,p),encoding='utf-8').read()
FLOW=['LOADER','PRINTER','SPI','PLACEMENT','REFLOW','AOI','UNLOADER']
def page(c):
    """c: dict(title, fn, sub, step, overlays=[(id,label,default)], specs=[(k,v)], extra_side, stage_html, toolbar, libs, script, module=False)"""
    ovs=''.join(f'<label class="chk"><input type="checkbox" id="ovc-{i}" data-ovc="{i}" {"checked" if d else ""}><span>{l}</span></label>' for i,l,d in c['overlays'])
    specs=''.join(f'<tr><td>{k}</td><td>{v}</td></tr>' for k,v in c['specs'])
    flow='<i>›</i>'.join(f'<span class="{"me" if f==c["fn"] else ""}">{f}</span>' for f in c.get('flow',FLOW))
    side=f'''<aside id="side"><div id="rail">
  <button id="sideTgl" title="Show / hide panel"><svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg></button>
  <button id="themeTgl" title="Switch White / Dark gray theme"><svg viewBox="0 0 24 24" id="themeIco"></svg></button>
  <div class="vtxt">{c["fn"]}</div></div>
 <div id="sideBody">
  <div class="fn">{c["fn"]}</div><div class="fn-sub">{c["sub"]}</div>
  <div class="sec"><h3>Theme</h3><div class="seg2"><button data-theme-btn="light">White</button><button data-theme-btn="dark">Dark gray</button></div></div>
  <div class="sec"><h3>On-screen data</h3>{ovs}</div>
  {c.get("extra_side","")}
  {c.get("machine_html") or f'<div class="sec"><h3>Machine</h3><table class="spec">{specs}</table><p class="note">Generic machine model. Dimensions follow published data for this machine class; units are millimetres, conveyor height 900 mm, boards flow left to right.</p></div>'}
  <div class="sec"><h3>{c.get("flow_title","Position in the SMT line")}</h3><div class="flow" id="flowList">{flow}</div></div>
 </div></aside>'''
    return f'''<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{c["title"]}</title>
<style>
{rd("shell.css")}
{c.get("css","")}
</style>
</head>
<body>
{side}
<main id="stage"><canvas id="c"></canvas>
<div id="title" class="panel" data-ov="title"><div class="t1">{c["fn"]}</div><div class="t2">{c["sub"]}</div></div>
<div id="cycle" class="panel" data-ov="cycle"><div class="k" id="cyK">CYCLE TIME</div><div class="v" id="cyV">—</div><div class="s" id="cyS"></div></div>
{c["stage_html"]}
<div id="bar" class="panel">{c["toolbar"]}</div>
<div id="tags"></div>
</main>
<script>{rd("shell.js")}</script>
{c["libs"]}
{c["script"]}
</body>
</html>
'''
