import os,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from page import page
D=os.path.dirname(os.path.abspath(__file__));L=os.path.join(D,'..','lib','node_modules','three')
rd=lambda p:open(p,encoding='utf-8').read()
LIBS=''.join('<script>'+rd(os.path.join(L,*p))+'</script>\n' for p in [('build','three.min.js'),('examples','js','controls','OrbitControls.js'),('examples','js','utils','BufferGeometryUtils.js')])
NAMES=['LOADER','DESTACKER','LASER MARKER','CONVEYOR','SHUTTLE','SCANNER','FIFO BUFFER','INVERTER','AOI TABLE','UNLOADER']
SHORT=['1 Loader','2 Destack','3 Laser','4 Conveyor','5 Shuttle','6 Scan','7 FIFO','8 Invert','9 AOI table','10 Unload']
bar=('<span class="lbl">Equipment</span>'+''.join(f'<button data-m="{i}"{" class=on" if i==0 else ""}>{s}</button>' for i,s in enumerate(SHORT))+
 '<div class="sep"></div><button id="bSingle" class="on">Single machine</button><button id="bLine">Whole line</button>'
 '<div class="sep"></div><button id="bHood">Open covers</button><button id="bXray">X-ray</button><button id="bLab">Labels</button>'
 '<div class="sep"></div><button data-v="over" class="on">Overview</button><button data-v="inside">Inside</button><button data-v="follow">Follow board</button><button data-v="top">Top</button>'
 '<div class="sep"></div><button id="bPause">Pause</button><button data-s="0.5">0.5×</button><button data-s="1" class="on">1×</button><button data-s="2">2×</button><button data-s="4">4×</button>')
stage=('<div id="hint" data-ov="hint">Drag = rotate · Wheel = zoom · Right-drag = pan · Click a glass hood to open it</div>'
 '<div id="hud" class="panel" data-ov="hud"><h2>STATUS</h2><div id="hudBody"></div><div id="log" data-ov="log"></div></div>')
extra=('<div class="sec"><h3>View mode</h3><div class="seg2"><button data-mode="single" class="on">Single machine</button><button data-mode="line">Whole line</button></div>'
 '<p class="note">Single machine: boards are fed from a stub on the left. Whole line: all ten machines are connected from loader to unloader and boards flow through the complete handling line.</p></div>')
mach=('<div class="sec"><h3>Selected equipment</h3><div id="specH" style="font-weight:700;margin-bottom:6px"></div><table class="spec" id="specT"></table>'
 '<p class="note">Generic machine models (no brands), built from manufacturer datasheets, drawings and your photos. Units mm, transport height 950 mm, belt speed 14 m/min, boards flow left to right. Single-lane machines run on lane 1; the shuttle splits boards onto lanes 1 and 2.</p></div>')
css="""#hud{width:330px}
.lrow{cursor:pointer;border-radius:6px;padding:3px 5px;margin:0 -5px}.lrow:hover{background:var(--btn)}.lrow.sel{background:var(--btnh)}
.lrow .pill{max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
#flowList span{cursor:pointer}"""
js="<script>\n'use strict';\nwindow.SMT_CFG={shadow:1700,shadowFar:16000,shadowMap:4096,maxDist:26000,esd:10600,contact:[11000,2800]};\n"+rd(os.path.join(D,'common.js')).replace("'use strict';\n","",1)+rd(os.path.join(D,'pcbkit.js'))+rd(os.path.join(D,'handling_parts.js'))+rd(os.path.join(D,'hnd2.js'))+"\n</script>"
html=page(dict(title='BOARD HANDLING LINE — loader to unloader · SMT line simulation',fn='HANDLING LINE',
  sub='Bare-board handling line: loader, destacker, laser marker, conveyor, shuttle, scanner, FIFO buffer, inverter, AOI review table and unloader, modelled on manufacturer data. Switch between machines or run the whole line.',
  overlays=[('title','Machine title',True),('cycle','Cycle time',True),('hud','Status panel',True),('log','Event log',True),('hint','Mouse hint',True)],
  specs=[],extra_side=extra,machine_html=mach,flow=NAMES,flow_title='Handling line (click to select)',stage_html=stage,toolbar=bar,libs=LIBS,script=js,css=css))
out='/home/user/smt_handling_line.html';open(out,'w',encoding='utf-8').write(html);print(out,len(html)//1024,'KB')
