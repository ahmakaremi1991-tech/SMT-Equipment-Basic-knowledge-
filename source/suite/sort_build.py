"""Build the AOI sorting line page: shell + common + pcbkit + handling parts + wrapped AOI model + sort.js."""
import os,sys,re
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from page import page
D=os.path.dirname(os.path.abspath(__file__));L=os.path.join(D,'..','lib','node_modules','three')
rd=lambda p:open(p,encoding='utf-8').read()
LIBS=''.join('<script>'+rd(os.path.join(L,*p))+'</script>\n' for p in [('build','three.min.js'),('examples','js','controls','OrbitControls.js'),('examples','js','utils','BufferGeometryUtils.js')])

# ---------- wrap the AOI page model into buildAOI(parent, BW, BD) ----------
def rep(s,a,b,n=1):
    assert s.count(a)==n,(a[:60],s.count(a));return s.replace(a,b)
def aoi_part():
    s=rd(os.path.join(D,'src','aoi.machine.js'))
    s=rep(s,"const CONV_Y=900, LANE_Z=[170,-170], BW=250, BD=200, BT=1.6;","const CONV_Y=900, LANE_Z=[170,-170], BT=1.6;")
    s=rep(s,"const machine=new THREE.Group();scene.add(machine);","const machine=new THREE.Group();parent.add(machine);")
    s=rep(s,"/* --- lower cabinet (matches MV-9 photo: centre double door, blue logo panel above it) --- */","/* --- lower cabinet: centre double door, function-label panel above it --- */")
    s,n=re.subn(r"\(function\(\)\{const t=canvasTex\(1080,280.*?machine\.add\(m\);\}\)\(\);","""(function(){const t=canvasTex(1080,280,(g,W,H)=>{g.fillStyle='#1b4db3';g.fillRect(0,0,W,H);g.textAlign='center';g.textBaseline='middle';
  g.fillStyle='#fff';g.font='900 150px "Arial Black",Arial,sans-serif';g.fillText('AOI',W/2,112);
  g.font='700 40px Arial';g.fillStyle='#cfe0ff';g.fillText('AUTOMATED OPTICAL INSPECTION',W/2,222);});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(BX1-BX0,140),std(0xffffff,.45,.1,{map:t}));m.position.set((BX0+BX1)/2,719,750.6);machine.add(m);})();""",s,flags=re.S);assert n==1
    s,n=re.subn(r"/\* --- neighbours in the line.*?\n\}\);\n","",s,flags=re.S);assert n==1
    # shorter lane rails: the machine is 1250 mm long and its neighbours touch it
    s=rep(s,"box(g,1720,46,12,M.alu,0,CONV_Y-17,rz);","box(g,1250,46,12,M.alu,0,CONV_Y-17,rz);")
    s=rep(s,"box(g,1720,6,5,M.aluD,0,CONV_Y+9,rz-s*3.5,NOSH);","box(g,1250,6,5,M.aluD,0,CONV_Y+9,rz-s*3.5,NOSH);")
    s=rep(s,"box(g,1720,3,6,bm,0,CONV_Y-1.5,z+s*(BD/2-2.5),NOSH);","box(g,1250,3,6,bm,0,CONV_Y-1.5,z+s*(BD/2-2.5),NOSH);")
    s=rep(s,"[-790,790].forEach(","[-590,590].forEach(")
    s=rep(s,"box(g,60,34,16,M.black,-845,CONV_Y-17,rz+s*14,NOSH);","box(g,60,34,16,M.black,-560,CONV_Y-17,rz+s*14,NOSH);")
    s=rep(s,"L.beltTex.repeat.set(86,1);","L.beltTex.repeat.set(62,1);")
    s=rep(s,"g.position.set(-540,0,FZ);","g.position.set(-240,0,FZ);")   # monitor arm closer to the machine: the scanner stands right next to it
    s=s.replace("'MIRTEC","'AOI").replace("MV-9","AOI")
    assert 'MIRTEC' not in s.upper() and 'MV-9' not in s
    body='\n'.join('  '+l for l in s.split('\n'))
    return ("function buildAOI(parent,BW,BD){\n"+body+
            "\n  return {machine,interior,lanes,beam,head,rings,projLens,projBeams,flashSpot,glowSprite,fovGlow,fovStripe,stripeTex,hoodPivot,doors,tower,monCtx,monTex,shellMats};\n}\n")

WIDTHS=[164,175,190,212];PITCH=[3,4,5]
seg=lambda attr,vals,fmt=str:'<div class="seg2 segN">'+''.join(f'<button data-{attr}="{v}">{fmt(v)}</button>' for v in vals)+'</div>'
extra=('<div class="sec"><h3 data-t="lang">Language</h3><div class="seg2"><button data-lang="en">English</button><button data-lang="ro">Română</button></div></div>'
 '<div class="sec"><h3 data-t="setup">Line setup</h3>'
 '<label class="chk"><input type="checkbox" id="setAct"><span data-t="setAct">Activate line setup</span></label>'
 '<div id="setFields">'
 '<div class="fl" data-t="side">Inspection side</div><div class="seg2"><button data-side="TOP">TOP</button><button data-side="BOT">BOT</button></div>'
 '<div class="fl" data-t="prog">AOI program</div><select id="progSel"><option value="">— choose —</option>'+''.join(f'<option>Program {i}</option>' for i in range(1,6))+'</select>'
 '<div class="fl" data-t="magW">Magazine width (mm)</div>'+seg('w',WIDTHS)+
 '<div class="fl" data-t="pitch">Magazine pitch</div>'+seg('p',PITCH)+
 '<div class="grid2"><label><span class="fl" data-t="count">Panels in loader</span><input type="number" id="cntIn" min="1" value="20"></label>'
 '<label><span class="fl" data-t="cap">Magazine capacity</span><input type="number" id="capIn" min="1" value="10"></label></div>'
 '</div>'
 '<table class="spec"><tr><td data-t="convW">Conveyor / flipper width</td><td id="wOut"></td></tr><tr><td data-t="flipMode">Flippers</td><td id="fOut"></td></tr><tr><td data-t="pitch">Pitch</td><td id="useOut"></td></tr></table>'
 '<p class="note" id="setNote"></p></div>')
mach=('<div class="sec"><h3 data-t="counters">Counters</h3>'
 +''.join(f'<div class="row"><span data-t="{k}"></span><b id="{i}">0</b></div>' for k,i in [('c_load','cLoad'),('c_ins','cIns'),('c_good','cGood'),('c_bad','cBad'),('c_judge','cJudge'),('c_left','cLeft')])+'</div>'
 '<div class="sec"><h3 data-t="mags">Magazines</h3>'
 +''.join(f'<div class="row"><span data-t="mag{i}"></span><b id="m{i}n">0</b></div><div class="bar {"red" if i==3 else "grn"}"><i id="m{i}b"></i></div>' for i in (1,2,3))+'</div>')
stage=('<div id="hint" data-ov="hint"></div>'
 '<div id="hud" class="panel" data-ov="hud"><h2 data-t="stTitle">LINE STATUS</h2>'
 '<div class="row"><span data-t="status">Line</span><span id="lineSt" class="pill idle"></span></div><div id="setLine" class="sl"></div><div id="stList"></div>'
 '<div id="log" data-ov="log"></div></div>'
 '<div id="warn" class="panel"><div id="wMsg"></div><button id="bRepl2" onclick="document.getElementById(\'bRepl\').click()" data-t="replace">Replace magazine</button></div>'
 '<div id="judge" class="modal"><div class="card"><h3 data-t="judgeT">Operator judgement</h3><p id="jMsg"></p><p class="note" data-t="judgeHint"></p>'
 '<div class="jb"><button id="jPass" data-t="pass">PASS</button><button id="jFail" data-t="fail">FAIL</button></div></div></div>'
 '<div id="done" class="modal"><div class="card"><h3 data-t="doneT">Run complete</h3><table class="spec" id="dBody"></table><div class="jb"><button id="dClose" data-t="doneClose">Close</button></div></div></div>')
bar=('<button id="bStart" class="go" data-t="START">START</button><button id="bPause">PAUSE</button><button id="bStop" class="stp" data-t="STOP">STOP</button><button id="bReset" data-t="RESET">RESET</button>'
 '<div class="sep"></div><button id="bMark" class="mk" data-t="mark">Mark panel for judgement</button><button id="bRepl" data-t="replace">Replace magazine</button>'
 '<div class="sep"></div><span class="lbl" data-t="speed">Speed</span>'+''.join(f'<button data-s="{v}"{" class=on" if v==1 else ""}>{v}×</button>' for v in (0.5,1,2,4))+
 '<div class="sep"></div>'+''.join(f'<button data-v="{v}"{" class=on" if v=="over" else ""} data-t="{t}"></button>' for v,t in [('over','over'),('loader','vLoader'),('aoi','vAoi'),('unloader','vUnl'),('follow','follow'),('top','vTop')])+
 '<div class="sep"></div><button id="bHood">Open covers</button><button id="bXray" data-t="xray">X-ray</button><button id="bLab" data-t="labels">Labels</button>')
css="""#hud{width:330px}#hud .sl{font-size:11px;color:var(--mut);margin:2px 0 8px}
#stList .pill{max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fl{font-size:11px;color:var(--mut);margin:8px 0 4px;display:block}
.segN{display:grid;grid-template-columns:repeat(4,1fr)}.segN button{padding:6px 0}
#setFields.off{opacity:.45;pointer-events:none}
#progSel,#setFields input[type=number]{width:100%;padding:6px 8px;border-radius:7px;border:1px solid var(--line);background:var(--btn);color:var(--txt);font:inherit}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sec .row b{font-variant-numeric:tabular-nums}
.bar.grn i{background:linear-gradient(90deg,#1f9e55,#3ddc84)}.bar.red i{background:linear-gradient(90deg,#a3131c,#ff4d5a)}
#bar button.go{background:#1f9e55;color:#fff;border-color:#1f9e55}#bar button.stp{background:#c8202a;color:#fff;border-color:#c8202a}
#bar button.mk{background:#f2c400;color:#1d2128;border-color:#f2c400;font-weight:700}
#bar button:disabled{opacity:.38;cursor:not-allowed}
#warn{display:none;top:120px;left:50%;transform:translateX(-50%);padding:12px 16px;border-color:#c8202a;max-width:520px;text-align:center;z-index:5}
#warn.show{display:block}#wMsg{font-weight:700;color:var(--ng);margin-bottom:8px}
#warn button{background:#c8202a;color:#fff;border:0;padding:8px 16px;border-radius:7px;font-weight:700;cursor:pointer}
.modal{display:none;position:absolute;inset:0;background:rgba(0,0,0,.45);z-index:9;align-items:center;justify-content:center}
.modal.show{display:flex}
.modal .card{background:var(--pan);border:1px solid var(--line);border-radius:12px;padding:20px 24px;min-width:360px;max-width:480px;box-shadow:var(--shadow);backdrop-filter:blur(10px)}
.modal h3{margin:0 0 10px;font-size:16px}#jMsg{font-size:15px;font-weight:600}
.jb{display:flex;gap:10px;margin-top:14px;justify-content:flex-end}
.jb button{padding:10px 18px;border-radius:8px;border:0;font-weight:800;cursor:pointer;background:var(--btn);color:var(--txt)}
#jPass{background:#1f9e55;color:#fff}#jFail{background:#c8202a;color:#fff}"""
FLOW=['LOADER','FLIPPER 1','SCANNER','AOI','FLIPPER 2','UNLOADER']
js=("<script>\n'use strict';\nwindow.SMT_CFG={shadow:3600,shadowFar:16000,shadowMap:4096,maxDist:22000,esd:10600,contact:[11000,2800]};\n"
    +rd(os.path.join(D,'common.js')).replace("'use strict';\n","",1)+rd(os.path.join(D,'pcbkit.js'))+rd(os.path.join(D,'handling_parts.js'))
    +rd(os.path.join(D,'sort.js')).replace('/*__AOI_MODEL__*/',aoi_part())+"\n</script>")
html=page(dict(title='AOI SORTING LINE — offline sorting of suspect panels · SMT simulation',fn='AOI SORTING LINE',
  sub='Offline automatic sorting line: loader, flipper, scanner, AOI, flipper and unloader.',
  overlays=[('title','Title',True),('cycle','Cycle time',True),('hud','Line status',True),('log','Event log',True),('hint','Mouse hint',True)],
  specs=[],extra_side=extra,machine_html=mach,flow=FLOW,flow_title='Sorting line',stage_html=stage,toolbar=bar,libs=LIBS,script=js,css=css))
out='/home/user/smt_sorting_line.html';open(out,'w',encoding='utf-8').write(html);print(out,len(html)//1024,'KB')
