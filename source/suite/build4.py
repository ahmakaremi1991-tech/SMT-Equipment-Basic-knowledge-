import os,re,sys
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from page import page
D=os.path.dirname(os.path.abspath(__file__));S=os.path.join(D,'src');L=os.path.join(D,'..','lib','node_modules','three')
rd=lambda p:open(p,encoding='utf-8').read()
def rep(s,a,b,n=1):
    c=s.count(a);assert c==n,(a[:90],c);return s.replace(a,b)
def rex(s,pat,b,n=1):
    r,c=re.subn(pat,lambda m:b,s,flags=re.S);assert c==n,(pat[:60],c);return r
def between(s,a,b):i=s.index(a);return s[i:s.index(b,i)]
LIBS=''.join('<script>'+rd(os.path.join(L,*p))+'</script>\n' for p in [('build','three.min.js'),('examples','js','controls','OrbitControls.js'),('examples','js','utils','BufferGeometryUtils.js')])
COMMON=rd(os.path.join(D,'common.js'));KIT=rd(os.path.join(D,'pcbkit.js'))
KITMAKE="const KIT=makePCBKit(THREE,a=>BGU.mergeBufferGeometries(a,false),canvasTex);const FIDS=KIT.FIDS,FLAT=KIT.FLAT,PM=KIT.PM;\n"

def rt_common(r,insets):
    r=rep(r,"function resize(){const w=window.innerWidth,h=window.innerHeight;","function resize(){const [w,h]=SMT.size();if(!w||!h)return;")
    r=rep(r,"window.addEventListener('resize',resize);resize();","new ResizeObserver(resize).observe(SMT.stage());resize();")
    r=rep(r,"const W=window.innerWidth,H=window.innerHeight;","const [W,H]=SMT.size();")
    r=rep(r,"mouse.set(e.clientX/window.innerWidth*2-1,-(e.clientY/window.innerHeight)*2+1);","SMT.ndc(e,mouse);")
    r=rex(r,r"\$\('specBtn'\)\.onclick=[^\n]*\n","")
    if insets==2:
        r=rep(r,"  if(W>900){\n","  const RA=SMT.rect('inset'),RB=SMT.rect('insetR');\n  if(RA||RB){\n")
        r=rep(r,"renderer.setViewport(15,15,255,253);renderer.setScissor(15,15,255,253);renderer.clear();renderer.render(scene,insetCam);","if(RA){renderer.setViewport(...RA);renderer.setScissor(...RA);renderer.clear();renderer.render(scene,insetCam);}")
        r=rep(r,"if(W>1250){","if(RB){")
        r=rep(r,"renderer.setViewport(282,15,255,253);renderer.setScissor(282,15,255,253);","renderer.setViewport(...RB);renderer.setScissor(...RB);")
    elif insets==1:
        r=rep(r,"  if(W>900){\n","  const RA=SMT.rect('inset');\n  if(RA){\n")
        r=rep(r,"renderer.setViewport(15,15,255,253);renderer.setScissor(15,15,255,253);","renderer.setViewport(...RA);renderer.setScissor(...RA);")
    return r

def stage_from(body,ids):
    out=[]
    for i in ids:
        a=body.index('<div id="'+i+'"');b=body.index('\n<div id=',a+5)
        out.append(body[a:b].strip())
    return '\n'.join(out)
def bar_from(body):return between(body,'<div id="bar" class="panel">','</div>\n<div id="tags">')[len('<div id="bar" class="panel">'):]

def ov_attr(html,mapping):
    for i,ov in mapping.items():
        html=rep(html,'<div id="'+i+'"','<div id="'+i+'" data-ov="'+ov+'"')
    html=html.replace('data-ov="insets" class="panel"','data-ov="insets" class="panel inset"')
    return html

def build(key,out,cfg):
    body=rd(os.path.join(S,key+'.body.html'))
    m=cfg['machine'](rd(os.path.join(S,key+'.machine.js')))
    r=cfg['runtime'](rt_common(rd(os.path.join(S,key+'.runtime.js')),cfg['insets']))
    stage=ov_attr(stage_from(body,cfg['stage_ids']),cfg['ovmap'])
    stage=stage.replace('<div id="log">','<div id="log" data-ov="log">')
    stage=cfg.get('stage_fix',lambda x:x)(stage)
    js="<script>\n'use strict';\nwindow.SMT_CFG="+cfg.get('cfg','{}')+";\n"+COMMON.replace("'use strict';\n","",1)+m+KIT+KITMAKE+cfg['adapter']+r+"\n</script>"
    html=page(dict(title=cfg['title'],fn=cfg['fn'],sub=cfg['sub'],overlays=cfg['overlays'],specs=cfg['specs'],stage_html=stage,
                   toolbar=cfg.get('bar',lambda x:x)(bar_from(body)),libs=LIBS,script=js,css=cfg.get('css','')))
    open(out,'w',encoding='utf-8').write(html);print(out,len(html)//1024,'KB')

STUB_RE=r"/\* --- neighbours in the line.*?\n\}\);\n"
# ======================================================================= AOI
def aoi_m(s):
    s=rep(s,"/* --- lower cabinet (matches MV-9 photo: centre double door, blue logo panel above it) --- */","/* --- lower cabinet: centre double door, function-label panel above it --- */")
    s=rex(s,r"\(function\(\)\{const t=canvasTex\(1080,280.*?machine\.add\(m\);\}\)\(\);","""(function(){const t=canvasTex(1080,280,(g,W,H)=>{g.fillStyle='#1b4db3';g.fillRect(0,0,W,H);g.textAlign='center';g.textBaseline='middle';
  g.fillStyle='#fff';g.font='900 150px "Arial Black",Arial,sans-serif';g.fillText('AOI',W/2,112);
  g.font='700 40px Arial';g.fillStyle='#cfe0ff';g.fillText('AUTOMATED OPTICAL INSPECTION',W/2,222);});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(BX1-BX0,140),std(0xffffff,.45,.1,{map:t}));m.position.set((BX0+BX1)/2,719,750.6);machine.add(m);})();""")
    s=rex(s,STUB_RE,"""/* --- neighbours in the line: reflow oven / buffer upstream, unloader downstream --- */
[-1,1].forEach(s=>{lineStub(s*1185,0,640,800,s<0?'FROM REFLOW / BUFFER  ▶':'▶  TO AOI TABLE');box(scene,4,100,620,M.black,s*864,916,0,NOSH);});
""")
    return s
def aoi_r(r):
    r=rep(r,"  board.static.children.forEach(m=>{const c=new THREE.Mesh(m.geometry,m.material);c.position.copy(m.position);c.receiveShadow=true;c.castShadow=m.castShadow;g.add(c);});",
          "  board.static.children.forEach(m=>{const c=new THREE.Mesh(m.geometry,m.material);c.position.copy(m.position);c.receiveShadow=true;c.castShadow=m.castShadow;g.add(c);});\n  g.add(new THREE.Mesh(board.solderGeo,board.solderMat));   // reflowed solder joints (board arrives from the oven)")
    r=rep(r,"g.fillText('MIRTEC  MV-9DL  ·  3D AOI',14,21);","g.fillText('AOI  ·  DUAL LANE  ·  3D INSPECTION',14,21);")
    r=rep(r,"stats.ct=simTime-t0;","stats.ct=simTime-t0;stats.cts.push(stats.ct);")
    r=rep(r,"const stats={ins:0,ok:0,ng:0,ct:0};","const stats={ins:0,ok:0,ng:0,ct:0,cts:[]};")
    r=rep(r,"  $('rec').style.opacity=(fx.power>0)?1:.25;\n}","  $('rec').style.opacity=(fx.power>0)?1:.25;\n  cycleBadge();\n}\n"+CYC_INSP)
    return r
CYC_INSP="""function cycleBadge(){const c=stats.cts.slice(-10);if(!c.length){SMT.cycle('—','waiting for the first board');return;}
  const avg=c.reduce((a,b)=>a+b,0)/c.length;SMT.cycle(stats.ct.toFixed(1)+' s','avg '+avg.toFixed(1)+' s · '+Math.round(3600/avg)+' boards/h · both lanes','CYCLE TIME · LAST BOARD');}
"""
AOI_ADAPT="const board={static:KIT.inst(KIT.board,KIT.compsNoCand),cands:KIT.cands,places:KIT.places,solderGeo:KIT.pasteGeo(),solderMat:std(0xd9dee2,.18,1)};\n"
# ======================================================================= SPI
def spi_m(s):
    s=rep(s,"   MACHINE — Koh Young aSPIre3 (L chassis, dual lane).  Units: millimetres.","   MACHINE — 3D solder paste inspection (SPI), dual lane.  Units: millimetres.")
    s=rep(s,"// lower front: door + KOHYOUNG grille panel","// lower front: door + grille panel with the function label")
    s=rex(s,r"K.O.H.Y.O.U.N.G","S P I")
    s=rep(s,"/* --- front window cover (dark glass with aSPIre3 logo) — hinged at the roof, lifts up --- */","/* --- front window cover (dark glass with function label) — hinged at the roof, lifts up --- */")
    s=rex(s,r"const lt=canvasTex\(512,128,.*?\}\);\n","const lt=canvasTex(512,128,(g)=>{g.clearRect(0,0,512,128);g.font='900 104px \"Arial Black\",Arial,sans-serif';g.textBaseline='middle';g.fillStyle='#46d6e0';g.fillText('SPI',8,66);g.font='700 22px Arial';g.fillStyle='#9fe7ee';g.fillText('SOLDER PASTE',270,50);g.fillText('INSPECTION',270,80);});\n")
    s=rep(s,"label(h,'KOH YOUNG',150,22,0,1285,-45,","label(h,'SPI HEAD',150,22,0,1285,-45,")
    s=rep(s,"new THREE.PlaneGeometry(190,48)","new THREE.PlaneGeometry(400,100)")
    s=rep(s,"lg.position.set(x0+130,WIN1-50,HZ-1.5);","lg.position.set(x0+230,WIN1-70,HZ-1.5);")
    s=rex(s,STUB_RE,"""/* --- neighbours in the line --- */
[-1,1].forEach(s=>{lineStub(s*1020,0,640,800,s<0?'FROM PRINTER  ▶':'▶  TO PLACEMENT');box(scene,4,100,620,M.black,s*699,916,0,NOSH);});
""")
    return s
def spi_r(r):
    r=rep(r,"tag('Monitor (KSMART / SPI GUI)',","tag('Operator monitor',")
    r=rep(r,"g.fillText('aSPIre3  ·  3D SPI  ·  KSMART',14,21);","g.fillText('SPI  ·  DUAL LANE  ·  3D PASTE',14,21);")
    r=rep(r,"stats.ct=simTime-t0;","stats.ct=simTime-t0;stats.cts.push(stats.ct);")
    r=rep(r,"const stats={ins:0,ok:0,ng:0,ct:0};","const stats={ins:0,ok:0,ng:0,ct:0,cts:[]};")
    r=rep(r,"  $('rec').style.opacity=(fx.power>0)?1:.25;\n}","  $('rec').style.opacity=(fx.power>0)?1:.25;\n  cycleBadge();\n}\n"+CYC_INSP)
    return r
SPI_ADAPT="const _ci=KIT.candPadIdx(36);const board={static:KIT.inst(KIT.board),pads:KIT.pads,candPads:KIT.pads.filter((q,i)=>_ci.has(i)),pasteGeo:KIT.pasteGeo(_ci),places:KIT.places};\n"
# ======================================================================= PRINTER
def pr_m(s):
    s=rep(s,"   MACHINE — EKRA SERIO 5000 stencil printer.  Units: millimetres.","   MACHINE — solder paste stencil printer.  Units: millimetres.")
    s=rep(s,"BT=1.6,LZ=250,","BT=1.6,LZ=170,")          # lane 1 of the line (was 250)
    s=rep(s,"magenta:sm(0xd4006c,.45,.1)","magenta:sm(0x1e6fd9,.45,.1)")
    s=rep(s,"label(machine,'SERIO 5000',330,50,","label(machine,'PRINTER',330,50,")
    s=rex(s,r"const lt=canvasTex\(900,300,.*?Technologies',300,262\);\}\);\n","const lt=canvasTex(900,300,(g,W,H)=>{g.clearRect(0,0,W,H);g.fillStyle='#17181a';g.font='900 170px \"Arial Black\",Arial,sans-serif';g.textBaseline='middle';g.textAlign='center';g.fillText('PRINTER',W/2,125);g.fillStyle='#1e6fd9';g.fillRect(W/2-300,212,600,8);g.fillStyle='#55585c';g.font='600 40px Arial';g.fillText('SOLDER PASTE STENCIL PRINTING',W/2,262);});\n")
    s=rep(s,"label(camHead,'EVA',40,14,","label(camHead,'VISION',40,14,")
    s=rep(s,"/* EVA vision camera gantry","/* vision alignment camera gantry")
    s=rep(s,"[-230,730].forEach(z=>","[-310,650].forEach(z=>")
    s=rep(s,"[-300,800].forEach(z=>","[-380,720].forEach(z=>")
    s=rep(s,"[-60,250,560].forEach(z=>","[-140,170,480].forEach(z=>")
    s=rep(s,"const sq={z:325,","const sq={z:245,")
    s=rex(s,STUB_RE,"""/* --- neighbours in the line --- */
[-1,1].forEach(s=>{lineStub(s*1150,0,600,800,s<0?'FROM LOADER  ▶':'▶  TO SPI');box(scene,4,100,330,M.black,s*849,916,LZ,NOSH);});
""")
    return s
def pr_r(r):
    r=rep(r,"g.fillText('EKRA  ·  MV9-TV1 REV C  ·  T = 0.13 mm  ·  TOP SIDE',","g.fillText('SMT DEMO BOARD REV C  ·  T = 0.13 mm  ·  TOP SIDE',")
    r=rep(r,"setStep(2,'EVA CAMERA');","setStep(2,'VISION CAMERA');")
    r=rep(r,"tag('EVA alignment camera',","tag('Vision alignment camera',")
    r=rep(r,"/* ---------- inset: what the EVA camera sees","/* ---------- inset: what the vision camera sees")
    r=rep(r,"g.fillText('SIMPLEX  ·  SERIO 5000',14,22);","g.fillText('PRINTER  ·  OPERATOR PANEL',14,22);")
    r=r.replace("#d4006c","#1e6fd9")
    for a,b in [("640+(372-640)*k","640+(292-640)*k"),("372+(118-372)*k","292+(38-292)*k"),("118+(372-118)*k","38+(292-38)*k"),("372+(640-372)*k","292+(640-292)*k"),("z0=dir<0?325:150,z1=dir<0?85:390","z0=dir<0?245:70,z1=dir<0?5:310")]:
        r=rep(r,a,b)
    r=rep(r,"rollZ:358","rollZ:278") if "rollZ:358" in r else r
    r=rep(r,"st.printed++;st.sinceClean++;st.ct=simTime-t0;","st.printed++;st.sinceClean++;st.ct=simTime-t0;st.cts.push(st.ct);")
    r=rep(r,"const st={step:-1,","const st={cts:[],step:-1,")
    r=rep(r,"  $('insL').textContent=camFx.p>0?'CAPTURE':'LIVE';","  $('insL').textContent=camFx.p>0?'CAPTURE':'LIVE';\n  {const c=st.cts.slice(-10);if(!c.length)SMT.cycle('—','first board in progress');else{const avg=c.reduce((a,b)=>a+b,0)/c.length;SMT.cycle(st.ct.toFixed(1)+' s','avg '+avg.toFixed(1)+' s · '+Math.round(3600/avg)+' boards/h · cleaning every '+CLEAN_EVERY,'CYCLE TIME · LAST BOARD');}}")
    return r
PR_ADAPT="const board={static:KIT.inst(KIT.board),pads:KIT.pads,pasteGeo:KIT.pasteGeo(),places:KIT.places};\n"
# ======================================================================= REFLOW
def rf_m(s):
    s=rep(s,"   MACHINE — Rehm VisionXP+ convection reflow oven, dual lane.  Units: mm.","   MACHINE — convection reflow oven, dual lane.  Units: mm.")
    s=rep(s,"// dark band at conveyor level along the front + Rehm wordmark","// dark band at conveyor level along the front")
    s=rex(s,r"const lt=canvasTex\(1000,200,.*?\}\);\n","const lt=canvasTex(1000,200,(g,W,H)=>{g.clearRect(0,0,W,H);g.fillStyle='#0057a8';g.font='900 150px \"Arial Black\",Arial,sans-serif';g.textBaseline='middle';g.fillText('REFLOW',10,100);g.fillStyle='#4a4f56';g.font='700 34px Arial';g.fillText('CONVECTION',700,70);g.fillText('17 ZONES · N2',700,128);});\n")
    s=rex(s,STUB_RE,"""/* --- neighbours in the line --- */
[-1,1].forEach(s=>{lineStub(s*(LX1+520),0,640,800,s<0?'FROM PLACEMENT  ▶':'▶  TO AOI');box(scene,4,100,620,M.black,s*(LX1+199),916,0,NOSH);});
""")
    # separate top nozzle plates (they turn see-through when the hood is open so the fans behind them show)
    s=rep(s,"    box(off,ZL-14,8,860,zoneMats[i],x,965,0,NOSH);","    const tm=zoneMats[i].clone();tm.transparent=true;topPlates.push(tm);box(off,ZL-14,8,860,tm,x,965,0,NOSH);\n    fanAt(off,x,i>=NH);")
    s=rep(s,"const hoodTop=[];","const hoodTop=[],topPlates=[],fans=[],airs=[];\n"+FANS)
    return s
FANS="""/* circulation fan: radial impeller between the top heater module and the nozzle plate */
const fanBlade=std(0xb9bfc6,.35,.8),fanBladeC=std(0x7fb2d8,.35,.7),fanHub=std(0x2a2d31,.5,.4);
function fanAt(par,x,cool){
  const g=new THREE.Group();g.position.set(x,1012,0);par.add(g);
  const ring=new THREE.Mesh(new THREE.TorusGeometry(118,5,8,40),std(0x6c737b,.4,.7));ring.rotation.x=PI/2;g.add(ring);
  const rot=new THREE.Group();g.add(rot);
  const disc=new THREE.Mesh(new THREE.CylinderGeometry(105,105,4,40),cool?fanBladeC:fanBlade);disc.position.y=22;rot.add(disc);
  for(let k=0;k<10;k++){const b=new THREE.Mesh(new THREE.BoxGeometry(70,36,4),cool?fanBladeC:fanBlade);const a=k/10*PI*2;
    b.position.set(Math.cos(a)*62,4,Math.sin(a)*62);b.rotation.y=-a+.5;rot.add(b);}
  const hub=new THREE.Mesh(new THREE.CylinderGeometry(26,26,40,20),fanHub);hub.position.y=6;rot.add(hub);
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(12,12,44,12),std(0xd5dadf,.25,.9));cap.position.y=6;rot.add(cap);
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(8,8,90,12),std(0xd5dadf,.25,.9));shaft.position.y=70;g.add(shaft);
  fans.push({rot,cool});
  /* airflow: particles leave the impeller rim and are pushed down through the nozzle plate */
  const N=34,pos=new Float32Array(N*3),col=new Float32Array(N*3),ph=new Float32Array(N),ang=new Float32Array(N);
  for(let i=0;i<N;i++){ph[i]=Math.random();ang[i]=Math.random()*PI*2;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(col,3));
  const pts=new THREE.Points(geo,new THREE.PointsMaterial({size:15,map:airTex(),vertexColors:true,transparent:true,opacity:.0,depthWrite:false,blending:THREE.AdditiveBlending}));
  pts.frustumCulled=false;pts.position.set(x,0,0);par.add(pts);
  airs.push({pts,pos,col,ph,ang,N,cool,i:fans.length-1});
}
let _airTex=null;function airTex(){return _airTex||(_airTex=canvasTex(64,64,(g)=>{const gr=g.createRadialGradient(32,32,1,32,32,32);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);}));}
"""
def rf_r(r):
    r=rep(r,"tag('ViCON operator monitor',","tag('Operator monitor',")
    r=rep(r,"cg.fillStyle='rgba(8,12,18,.6)';","cg.fillStyle='#141a22';")
    r=rep(r,"g.fillText('ViCON  ·  VisionXP+  ·  dual lane',14,21);","g.fillText('REFLOW  ·  DUAL LANE  ·  OPERATOR PANEL',14,21);")
    r=rep(r,"tag('Exhaust',","tag('Circulation fans (one per zone, inside the hood)',machine,PX0+6*ZL,1160,HZ-80);\ntag('Exhaust',")
    # fan spin + airflow while running, visible when the hood is open
    r=rep(r,"  hood.open+=(hood.target-hood.open)*Math.min(1,rdt*2.5);hoodPivot.rotation.x=-hood.open*.85;",
"""  hood.open+=(hood.target-hood.open)*Math.min(1,rdt*2.5);hoodPivot.rotation.x=-hood.open*.85;
  {const run=paused?0:1,see=Math.max(hood.open,xray?1:0);fanSpin+=rdt*run;
   topPlates.forEach(m=>{m.opacity=1-.72*see;m.depthWrite=see<.5;});
   fans.forEach((f,i)=>{f.rot.rotation.y+=rdt*run*(f.cool?17:20);});
   airs.forEach(a=>{const zi=a.i,T=ZSET[zi],hot=new THREE.Color();
     if(a.cool)hot.setRGB(.25,.75,1);else{const k=Math.max(0,Math.min(1,(T-110)/150));hot.setRGB(1,.55-.35*k,.12);}
     a.pts.material.opacity=see*.85*(run?1:.4);
     for(let i=0;i<a.N;i++){if(run)a.ph[i]=(a.ph[i]+rdt*(.55+.2*(i%3)))%1;const t=a.ph[i],an=a.ang[i]+fanSpin*1.3;
       let r,y;if(t<.4){r=30+t/.4*95;y=1020;}else{const u=(t-.4)/.6;r=125+u*60;y=1020-u*105;}
       a.pos[i*3]=Math.cos(an)*r*.85;a.pos[i*3+1]=y;a.pos[i*3+2]=Math.sin(an)*r*2.2;
       const f=t<.1?t/.1:t>.85?(1-t)/.15:1;a.col[i*3]=hot.r*f;a.col[i*3+1]=hot.g*f;a.col[i*3+2]=hot.b*f;}
     a.pts.geometry.attributes.position.needsUpdate=true;a.pts.geometry.attributes.color.needsUpdate=true;});}""")
    r=rep(r,"let simTime=0,speed=10,paused=false,thermal=false;","let simTime=0,speed=10,paused=false,thermal=false,fanSpin=0;const exits=[[],[]];")
    r=rep(r,"const b=L.boards.shift();machine.remove(b.g);stats.done++;stats.last[L.i]=b;","const b=L.boards.shift();machine.remove(b.g);stats.done++;stats.last[L.i]=b;exits[L.i].push(simTime);")
    r=rep(r,"  $('clk').textContent=","  {const tk=lanes.map((L,i)=>{const e=exits[i];return e.length>1?(e[e.length-1]-e[e.length-2]):PITCH*(i?1.08:1)/L.v;}),dw=lanes.map(L=>(ZX1-PX0)/L.v),mmss=t=>Math.floor(t/60)+':'+String(Math.round(t%60)).padStart(2,'0');\n   SMT.cycle(tk[0].toFixed(1)+' s','lane 2 '+tk[1].toFixed(1)+' s · dwell '+mmss(dw[0])+' / '+mmss(dw[1])+' · '+Math.round(3600/tk[0]+3600/tk[1])+' boards/h','CYCLE TIME · LANE 1 TAKT');}\n  $('clk').textContent=")
    r=rep(r,"$('bXray').onclick=()=>{xray=!xray;","$('bXray').onclick=()=>{xray=!xray;")  # keep
    return r
RF_ADAPT="const board={static:KIT.inst(KIT.board,KIT.compsAll),pasteGeo:KIT.pasteGeo(),places:KIT.places};\n"
RF_CSS="""
#prof{left:12px;bottom:calc(var(--barH,46px) + 24px);width:524px;height:302px;padding:0;overflow:hidden}
#prof .hd{height:24px;background:var(--hd);display:flex;align-items:center;justify-content:space-between;padding:0 9px;font-size:11px;letter-spacing:.8px;color:#e8902c}
#prof .hd i{font-style:normal;font-family:Consolas,monospace;font-size:11px}
.tab{background:none;border:0;border-bottom:2px solid transparent;border-radius:0;color:var(--mut);font-size:11px;letter-spacing:.8px;padding:3px 6px;margin-right:4px;cursor:pointer}
.tab.on{color:#e8902c;border-bottom-color:#e8902c}
#phName{font-family:Arial;font-size:11px;letter-spacing:.5px}
.pis{display:flex;gap:5px;padding:5px 7px 3px}
.pi{flex:1;display:flex;align-items:center;justify-content:center;gap:6px;padding:5px 4px;font-size:11.5px;position:relative;background:var(--btn);border:1px solid var(--line);border-radius:7px;cursor:pointer}
.pi svg{width:17px;height:17px;fill:currentColor;stroke:currentColor;stroke-width:1.6;stroke-linecap:round}
.pi[data-p=soak]{color:#e8742c}.pi[data-p=flux]{color:#c99a3a}.pi[data-p=melt]{color:#e8404f}.pi[data-p=solid]{color:#2aa7e0}.pi[data-p=live]{color:var(--tx)}
.pi.on{background:var(--btnh);border-color:currentColor}
.pi.live:after{content:"";position:absolute;top:4px;right:5px;width:7px;height:7px;border-radius:50%;background:currentColor;box-shadow:0 0 6px currentColor}
#joint,#chart{display:block;width:520px;height:228px;margin:2px}
"""
INS_OV=[('title','Machine title',True),('cycle','Cycle time',True),('hud','Status panel',True),('log','Event log',True)]
BASE={
 'aoi':dict(out='/home/user/smt_aoi.html',title='AOI — automated optical inspection · SMT line simulation',fn='AOI',
   sub='Dual-lane 2D/3D automated optical inspection. Reflowed boards arrive from the reflow oven / buffer; inspected boards go to the AOI review table, where an operator confirms or rejects each call before the unloader.',
   machine=aoi_m,runtime=aoi_r,adapter=AOI_ADAPT,insets=2,stage_ids=['hint','hud','inset','insetR'],ovmap={'hud':'hud','inset':'insets','insetR':'insets','hint':'hint'},
   stage_fix=lambda h:h.replace('<div class="scale"></div>','<div class="scale" data-top="6 mm"></div>'),
   overlays=INS_OV+[('insets','Camera & 3D views',True),('hint','Mouse hint',True)],
   specs=[('Footprint','1250 × 1500 × 1600 mm'),('Lanes','2 (one optical head)'),('PCB, dual lane','50 × 50 – 330 × 280 mm'),('Top camera','15 MP, telecentric'),('FOV','58.56 × 58.56 mm at 15 µm'),('Side cameras','4 angled'),('3D','Multi-frequency moiré'),('Drive','Linear motor XY'),('Demo board','250 × 200 mm, 20 FOV')]),
 'spi':dict(out='/home/user/smt_spi.html',title='SPI — 3D solder paste inspection · SMT line simulation',fn='SPI',
   sub='Dual-lane 3D solder paste inspection: measures volume, height, area and offset of every paste deposit after the printer.',
   machine=spi_m,runtime=spi_r,adapter=SPI_ADAPT,insets=2,stage_ids=['hint','hud','inset','insetR'],ovmap={'hud':'hud','inset':'insets','insetR':'insets','hint':'hint'},
   stage_fix=lambda h:h.replace('<div class="scale"></div>','<div class="scale" data-top="250 µm"></div>'),
   overlays=INS_OV+[('insets','Camera & 3D views',True),('hint','Mouse hint',True)],
   specs=[('Footprint','1000 × 1460 × 1727 mm'),('Lanes','2 (one optical head)'),('PCB, dual lane','50 × 50 – 490 × 580 mm'),('Transfer height','870 – 950 mm'),('Camera','12 MP, telecentric'),('FOV','61.44 × 46.08 mm at 15 µm'),('3D','Moiré, 4-way projection'),('Z resolution','0.37 µm'),('Demo board','250 × 200 mm, 25 FOV')]),
 'printer':dict(out='/home/user/smt_printer.html',title='PRINTER — solder paste stencil printer · SMT line simulation',fn='PRINTER',
   sub='Single-lane solder paste stencil printer feeding lane 1: vision alignment, closed-loop squeegee, automatic stencil underside cleaning.',
   machine=pr_m,runtime=pr_r,adapter=PR_ADAPT,insets=1,stage_fix=lambda h:h.replace('EVA CAMERA · BOARD','VISION CAMERA · BOARD'),stage_ids=['hint','hud','inset'],ovmap={'hud':'hud','inset':'insets','hint':'hint'},
   overlays=INS_OV+[('insets','Vision camera view',True),('hint','Mouse hint',True)],
   specs=[('Footprint','1180 × 1840 × 1606 mm'),('Lanes','1 (lane 1 of the line)'),('Print format','80 × 50 – 510 × 510 mm'),('Stencil frame','450 × 450 – 800 × 900 mm'),('Core cycle','7 s + print'),('Alignment','± 12.5 µm @ 6σ'),('Squeegee','1 – 300 mm/s · 40 – 250 N'),('Demo board','250 × 200 mm, 0.13 mm stencil')]),
 'reflow':dict(out='/home/user/smt_reflow.html',title='REFLOW — dual-lane convection reflow oven · SMT line simulation',fn='REFLOW',
   sub='Dual-lane convection reflow: 9 preheat, 4 peak and 4 cooling zones with circulation fans; each lane runs its own conveyor speed.',
   machine=rf_m,runtime=rf_r,adapter=RF_ADAPT,insets=0,stage_fix=lambda h:h.replace('color:#fff">00:00:00','color:var(--tx)">00:00:00'),stage_ids=['hint','hud','prof'],ovmap={'hud':'hud','prof':'prof','hint':'hint'},css=RF_CSS,
   cfg="{shadow:4600,shadowFar:14000,shadowMap:4096,maxDist:18000,esd:9600,contact:[9000,2900]}",
   overlays=INS_OV+[('prof','Thermal profile / solder joint',True),('hint','Mouse hint',True)],
   specs=[('Configuration','9 preheat + 4 peak + 4 cooling'),('Process length','4550 mm heating'),('System length','≈ 7200 mm'),('Width × height','≈ 1600 × 1500 mm'),('Conveyor','2 × pin chain, asynchronous'),('Atmosphere','N₂, residual O₂ monitored'),('Profile','SAC305 lead-free, peak ≈ 245 °C')]),
}
for k,c in BASE.items():
    if len(sys.argv)>1 and k not in sys.argv[1:]:continue
    build(k,c['out'],c)
