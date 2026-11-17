/* ===================================================================
   RUNTIME — boards, thermal model, UI
   =================================================================== */
const LIQ=217, ZX1=PX0+(NH+NC)*ZL, SPAWN=LX0-420, EXIT=LX1+420, PITCH=650;
const pasteRaw=std(0x8f9296,.82,.35), solderMolten=std(0xe8ecef,.08,1,{emissive:0x5a2a08,emissiveIntensity:.6}), solderSolid=std(0xd9dee2,.16,1);
const TCOL=t=>{const c=new THREE.Color(),k=Math.max(0,Math.min(1,(t-25)/230));c.setHSL(.66-.66*k,1,.5);return c;};
let serial=4200;
function makeBoard(L){
  const g=new THREE.Group();
  board.static.children.forEach(m=>{const c=new THREE.Mesh(m.geometry,m.material);c.position.copy(m.position);c.receiveShadow=true;g.add(c);});
  const paste=new THREE.Mesh(board.pasteGeo,pasteRaw);g.add(paste);
  const th=new THREE.Mesh(FLAT(BW,BD),new THREE.MeshBasicMaterial({color:0x2040ff,transparent:true,opacity:.55,depthWrite:false}));th.position.y=BT+9;th.visible=thermal;g.add(th);
  g.position.set(SPAWN,CONV_Y,L.z);machine.add(g);
  const b={g,paste,th,x:SPAWN,T:25,t:0,prof:[[0,25]],peak:25,tal:0,ramp:0,cool:0,melted:false,sn:++serial,lane:L,tIn:null,tOut:null};
  initSolder(b);L.boards.push(b);L.last=b;return b;
}
function airAt(x){if(x>=PX0&&x<ZX1){const i=Math.floor((x-PX0)/ZL);return [ZSET[i]+zoneNoise[i],i<NH?.033:.05,i];}return [25,.004,-1];}
const zoneNoise=ZSET.map(()=>0);
const stats={done:0,last:[null,null],o2:480};
let simTime=0,speed=10,paused=false,thermal=false;
const logEl=$('log');
function addLog(t,cls){const d=document.createElement('div');d.textContent=t;if(cls)d.className=cls;logEl.prepend(d);while(logEl.children.length>7)logEl.lastChild.remove();}
function stepBoard(b,dt){
  const L=b.lane;b.x+=L.v*dt;b.t+=dt;
  const a=airAt(b.x),T0=b.T;b.T+=a[1]*(a[0]-b.T)*dt;
  const r=(b.T-T0)/dt;if(a[2]>=0&&a[2]<NH)b.ramp=Math.max(b.ramp,r);else if(a[2]>=NH)b.cool=Math.min(b.cool,r);
  b.peak=Math.max(b.peak,b.T);if(b.T>LIQ)b.tal+=dt;
  if(b.tIn===null&&b.x>=PX0)b.tIn=b.t;if(b.tOut===null&&b.x>=ZX1)b.tOut=b.t;
  if(b.t-b.prof[b.prof.length-1][0]>=2)b.prof.push([b.t,b.T]);
  stepSolder(b,dt);emitVapour(b,dt);
}
function simulate(dt){
  simTime+=dt;
  if(Math.random()<dt*.2)zoneNoise.forEach((_,i)=>zoneNoise[i]=Math.round((Math.random()-.5)*3));
  stats.o2+=(480+Math.sin(simTime/40)*35-stats.o2)*Math.min(1,dt*.1);
  lanes.forEach(L=>{
    if(!L.last||L.last.x>SPAWN+PITCH*(L.i?1.08:1))makeBoard(L);
    L.boards.forEach(b=>stepBoard(b,dt));stepVapour(dt);
    while(L.boards.length&&L.boards[0].x>EXIT){const b=L.boards.shift();machine.remove(b.g);stats.done++;stats.last[L.i]=b;
      const ok=b.peak>=235&&b.peak<=255&&b.tal>=45&&b.tal<=120;
      addLog('L'+(L.i+1)+' #'+b.sn+'  peak '+b.peak.toFixed(1)+'°C  TAL '+b.tal.toFixed(0)+' s  '+(ok?'OK':'CHECK'),ok?'ok':'ng');}
  });
}


/* ===================================================================
   SOLDER PASTE PHYSICS — flux evaporation, soak/activation, melting,
   solidification (SAC305: liquidus 217 °C).  One state per board.
   =================================================================== */
const SOAK0=150,SOAK1=200,FREEZE=217;
const PH={PRINTED:['PRINTED PASTE','#9aa3ad','Fresh SAC305 paste: Type-4 powder (20–38 µm) suspended in flux'],
  PREHEAT:['PREHEAT · SOLVENT OUT','#ffb35c','Ramp-up: solvents in the flux start to evaporate'],
  SOAK:['SOAK · FLUX ACTIVATION','#ff8a3c','150–200 °C: flux activates, strips oxides from powder and pads, volatiles outgas'],
  RAMP:['RAMP TO PEAK','#ff6a3c','200–217 °C: last volatiles leave, paste is dry and clean, ready to melt'],
  MELTING:['MELTING · COALESCENCE','#ff4d5a','Above 217 °C: powder melts, droplets coalesce and wet the pad and termination'],
  LIQUID:['LIQUID · WETTING','#ff3d8a','Molten solder above liquidus, forming the fillet (time above liquidus)'],
  SOLIDIFYING:['SOLIDIFYING','#46b4ff','Below 217 °C: the joint freezes from the pad upwards'],
  SOLID:['SOLID JOINT','#46d6e0','Solid solder joint with a thin flux residue']};
function initSolder(b){Object.assign(b,{flux:1,act:0,melt:0,solid:0,evap:0,phase:'PRINTED',ev:{},pm:pasteRaw.clone()});b.paste.material=b.pm;}
function stepSolder(b,dt){
  const T=b.T;
  b.evap=Math.max(0,T-110)/100*.018*(b.flux-.12)*(b.melt>0?2:1);b.flux=Math.max(.12,b.flux-b.evap*dt);
  if(T>140)b.act=Math.min(1,b.act+(T-140)/60*.02*dt);
  if(T>=FREEZE&&b.solid<1)b.melt=Math.min(1,b.melt+dt*.35);
  if(b.melt>=1&&T<FREEZE)b.solid=Math.min(1,b.solid+dt*.22*(1+(FREEZE-T)/12));
  const e=b.ev;
  if(e.soak0===undefined&&T>=SOAK0)e.soak0=[b.t,T];if(e.soak1===undefined&&T>=SOAK1)e.soak1=[b.t,T];
  if(e.flux===undefined&&b.flux<.3)e.flux=[b.t,T];if(e.melt===undefined&&b.melt>=1)e.melt=[b.t,T];if(e.solid===undefined&&b.solid>=1)e.solid=[b.t,T];
  b.phase=b.solid>=1?'SOLID':b.melt>=1&&T<FREEZE?'SOLIDIFYING':b.melt>0&&b.melt<1?'MELTING':b.melt>=1?'LIQUID':T>=SOAK1?'RAMP':T>=SOAK0?'SOAK':T>=60?'PREHEAT':'PRINTED';
}
const _c1=new THREE.Color(),_c2=new THREE.Color();
function paintPaste(b){
  const m=b.pm,a=b.act;
  if(b.melt<.02){_c1.setHex(0x80848a).lerp(_c2.setHex(0xa9adb2),a);m.color.copy(_c1);m.roughness=.88-.15*a;m.metalness=.3;m.emissiveIntensity=0;}
  else if(b.solid<1){m.color.setHex(0xeef2f5);m.roughness=.04+.5*(1-b.melt)*.5;m.metalness=1;m.emissive.setHex(0x6a2a08);m.emissiveIntensity=Math.max(0,(b.T-205)/45)*.7*(1-b.solid);}
  else{m.color.setHex(0xd2d7db);m.roughness=.24;m.metalness=1;m.emissiveIntensity=0;}
  const sy=1-.32*b.melt;b.paste.scale.y=sy;b.paste.position.y=(1-sy)*(BT+.01);
}

/* --- 3D flux vapour rising from boards (points) --- */
const VAP=900,vapPos=new Float32Array(VAP*3),vapLife=new Float32Array(VAP),vapVel=new Float32Array(VAP*3);let vapI=0;
const vapGeo=new THREE.BufferGeometry();vapGeo.setAttribute('position',new THREE.BufferAttribute(vapPos,3));
const vapTex=canvasTex(64,64,(g)=>{const gr=g.createRadialGradient(32,32,2,32,32,32);gr.addColorStop(0,'rgba(255,255,255,.9)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,64,64);});
const vapMat=new THREE.PointsMaterial({size:16,map:vapTex,transparent:true,opacity:.35,depthWrite:false,color:0xf3e6c8});
const vapPts=new THREE.Points(vapGeo,vapMat);vapPts.frustumCulled=false;machine.add(vapPts);
for(let i=0;i<VAP;i++)vapPos[i*3+1]=-1e5;
let vapAcc=0;
function emitVapour(b,dt){vapAcc+=b.evap*dt*900;while(vapAcc>1){vapAcc--;const i=vapI++%VAP;
  vapPos[i*3]=b.x+(Math.random()-.5)*BW;vapPos[i*3+1]=CONV_Y+3;vapPos[i*3+2]=b.lane.z+(Math.random()-.5)*BD;
  vapVel[i*3]=(Math.random()-.5)*6+b.lane.v;vapVel[i*3+1]=20+Math.random()*25;vapVel[i*3+2]=(Math.random()-.5)*6;vapLife[i]=4+Math.random()*3;}}
function stepVapour(dt){for(let i=0;i<VAP;i++){if(vapLife[i]<=0)continue;vapLife[i]-=dt;if(vapLife[i]<=0||vapPos[i*3+1]>CONV_Y+260){vapLife[i]=0;vapPos[i*3+1]=-1e5;continue;}
  vapPos[i*3]+=vapVel[i*3]*dt;vapPos[i*3+1]+=vapVel[i*3+1]*dt;vapPos[i*3+2]+=vapVel[i*3+2]*dt;}vapGeo.attributes.position.needsUpdate=true;}

/* --- 2D cross-section of one chip-resistor joint --- */
const jc=$('joint'),jg=jc.getContext('2d');
const SPH=[];(function(){let r=7;for(let k=0;k<1400&&SPH.length<190;k++){const x=92+Math.random()*218,y=142+Math.random()*41,rad=4+Math.random()*2.4;
  if(x>246&&x<304&&y<152)continue;if(SPH.some(s=>Math.hypot(s.x-x,s.y-y)<s.r+rad-1.5))continue;SPH.push({x,y,r:rad,th:Math.random()*.75});}})();
const bubbles=[];
function filletPath(m,g){const xl=90-22*m,top=112+(1-m)*34;g.beginPath();g.moveTo(xl,184);g.quadraticCurveTo(232,182,250,top);g.lineTo(250,150);g.lineTo(300,150);g.quadraticCurveTo(306,172,318+6*m,184);g.closePath();}
function drawJoint(b,rdt){
  const g=jg,W=jc.width,H=jc.height;
  const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,'#0c1118');bg.addColorStop(1,'#141b25');g.fillStyle=bg;g.fillRect(0,0,W,H);
  if(!b){g.fillStyle='#8fa3bd';g.font='14px Arial';g.fillText('Waiting for a board…',20,40);return;}
  const T=b.T,m=b.melt,s=b.solid,f=b.flux,a=b.act;
  // heat haze background tint
  const hk=Math.max(0,Math.min(1,(T-25)/230));g.fillStyle='rgba(255,'+Math.round(120-60*hk)+',40,'+(hk*.12)+')';g.fillRect(0,0,W,H);
  // laminate + pad
  g.fillStyle='#0f5a31';g.fillRect(0,192,W,36);g.strokeStyle='rgba(40,150,90,.35)';for(let y=198;y<228;y+=6){g.beginPath();g.moveTo(0,y);g.lineTo(W,y);g.stroke();}
  g.fillStyle='#0a3f22';g.fillRect(0,186,62,6);g.fillRect(338,186,W-338,6);
  g.fillStyle='#c87533';g.fillRect(66,184,268,8);g.fillStyle='#e0bd5c';g.fillRect(66,183,268,2);
  // paste before melting: flux matrix + powder spheres
  if(m<1){const top=140+(1-f)*9,al=(.12+.5*f)*(1-m);
    g.fillStyle='rgba(205,150,60,'+al+')';g.beginPath();g.moveTo(90,184);g.lineTo(92,top+3);g.quadraticCurveTo(92,top,96,top);g.lineTo(306,top);g.quadraticCurveTo(310,top,310,top+3);g.lineTo(312,184);g.closePath();g.fill();
    const lo=Math.round(110+70*a),hi=Math.round(160+70*a);
    SPH.forEach(p=>{const k=Math.max(0,Math.min(1,(m-p.th)/.25));if(k>=1)return;const r=p.r*(1-k);const y=p.y+(184-p.y)*(1-f)*.08;
      const gr=g.createRadialGradient(p.x-r*.35,y-r*.35,r*.1,p.x,y,r);gr.addColorStop(0,'rgb('+hi+','+hi+','+(hi+4)+')');gr.addColorStop(1,'rgb('+(lo-40)+','+(lo-38)+','+(lo-34)+')');
      g.fillStyle=gr;g.beginPath();g.arc(p.x,y,r,0,7);g.fill();});}
  // component: tin termination + ceramic body
  g.fillStyle='#b9bec4';g.fillRect(250,90,52,60);g.fillStyle='#8d9399';g.fillRect(250,90,52,4);
  g.fillStyle='#e6e3da';g.fillRect(302,96,W-302,50);g.fillStyle='#16181b';g.fillRect(302,96,W-302,7);
  g.strokeStyle='rgba(120,110,95,.5)';for(let y=106;y<144;y+=7){g.beginPath();g.moveTo(296,y);g.lineTo(W,y);g.stroke();}
  // molten / solid joint
  if(m>0){g.save();g.globalAlpha=Math.min(1,m*1.25);
    filletPath(m,g);const lg=g.createLinearGradient(90,184,250,112);lg.addColorStop(0,'#c9ced3');lg.addColorStop(.55,'#f4f7f9');lg.addColorStop(1,'#aeb4ba');g.fillStyle=lg;g.fill();
    if(T>FREEZE-1&&s<1){g.shadowColor='rgba(255,120,40,.8)';g.shadowBlur=14*Math.min(1,(T-205)/40);g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=2;g.stroke();g.shadowBlur=0;}
    if(s>0){const yf=184-s*(184-112);g.save();filletPath(m,g);g.clip();g.fillStyle='#9fa6ad';g.fillRect(0,yf,W,H);
      g.strokeStyle='rgba(70,76,84,.35)';g.lineWidth=1;for(let i=0;i<70;i++){const x=80+((i*53)%250),y=yf+((i*29)%80);if(y<184){g.beginPath();g.moveTo(x,y);g.lineTo(x+5,y+3);g.stroke();}}
      if(s<1){g.setLineDash([5,4]);g.strokeStyle='#46b4ff';g.lineWidth=2;g.beginPath();g.moveTo(60,yf);g.lineTo(340,yf);g.stroke();g.setLineDash([]);}
      g.restore();}
    g.strokeStyle='rgba(205,150,60,'+(f*.9)+')';g.lineWidth=4;filletPath(m,g);g.stroke();
    g.restore();}
  // vapour bubbles
  const rate=b.evap*900;if(Math.random()<rate*rdt*3)bubbles.push({x:100+Math.random()*200,y:140,r:1.5+Math.random()*3,v:18+Math.random()*25,ph:Math.random()*6});
  for(let i=bubbles.length-1;i>=0;i--){const q=bubbles[i];q.y-=q.v*rdt;q.ph+=rdt*4;if(q.y<40){bubbles.splice(i,1);continue;}
    g.strokeStyle='rgba(240,225,190,'+Math.min(.7,(q.y-40)/80)+')';g.lineWidth=1.2;g.beginPath();g.arc(q.x+Math.sin(q.ph)*4,q.y,q.r,0,7);g.stroke();}
  // text + gauges
  const P=PH[b.phase];
  g.fillStyle='#dfe8f5';g.font='600 12px Consolas,monospace';g.fillText('L'+(b.lane.i+1)+' #'+b.sn+' · '+zoneOf(b)+' · '+T.toFixed(1)+' °C',10,18);
  g.fillStyle=P[1];g.font='800 15px Arial';g.fillText(P[0],10,38);
  g.fillStyle='#b8c6d8';g.font='11px Arial';const words=P[2].split(' ');let line='',y=54;words.forEach(w=>{if(g.measureText(line+w).width>230){g.fillText(line,10,y);y+=13;line='';}line+=w+' ';});g.fillText(line,10,y);
  const bars=[['Flux',f,'#d9a046'],['Activation',a,'#ff8a3c'],['Melted',m,'#ff4d5a'],['Solid',s,'#46d6e0']];
  bars.forEach((q,i)=>{const x=372,yy=14+i*17;g.fillStyle='#8fa3bd';g.font='10.5px Arial';g.fillText(q[0],x,yy+8);g.fillStyle='rgba(255,255,255,.1)';g.fillRect(x+62,yy,80,8);g.fillStyle=q[2];g.fillRect(x+62,yy,80*q[1],8);});
  g.fillStyle='#8fa3bd';g.font='10px Arial';g.fillText('100 µm',W-52,H-42);g.fillStyle='#dfe8f5';g.fillRect(W-50,H-38,34,2);
  g.fillText('SAC305 · liquidus 217 °C',372,90);
}

/* ---------- labels ---------- */
const tags=[];
function tag(text,obj,x,y,z){const el=document.createElement('div');el.className='tag';el.textContent=text;$('tags').appendChild(el);tags.push({el,obj,v:new THREE.Vector3(x,y,z)});}
tag('Hood with top heater modules — click to open',machine,PX0+6*ZL,TOPY+30,HZ);
tag('Preheat zones P1 – P9',machine,PX0+4.5*ZL,SILL+20,HZ-120);
tag('Reflow (peak) zones R1 – R4',machine,PX0+11*ZL,SILL+20,HZ-120);
tag('Cooling zones C1 – C4',machine,PX0+15*ZL,SILL+20,HZ-120);
tag('Pin-chain conveyor · lane 1',machine,LX0+300,CONV_Y+20,170);
tag('Pin-chain conveyor · lane 2',machine,LX0+300,CONV_Y+20,-170);
tag('Exhaust',machine,PX0+2*ZL,TOPY+280,-HZ+90);
tag('Residue management — click a door',machine,PX0+3*ZL,500,HZ+10);
tag('ViCON operator monitor',machine,LX0+380,1700,HZ+300);
tag('Signal tower',machine,LX0+200,TOPY+400,-HZ+150);
let showTags=false;

/* ---------- UI ---------- */
let tween=null,follow=null,watch=null,watchPh='live',profTab='chart';
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function flyTo(p,t,dur=1.3){tween={p0:camera.position.clone(),t0:controls.target.clone(),p1:new THREE.Vector3(...p),t1:new THREE.Vector3(...t),t:0,dur};}
function setHood(o){hood.target=o?1:0;$('bHood').textContent=o?'Close hood':'Open hood';$('bHood').classList.toggle('on',!!o);}
function lead(L){let b=null;L.boards.forEach(q=>{if(q.x<ZX1&&q.x>PX0-200&&(!b||q.x>b.x))b=q;});return b||L.boards[L.boards.length-1];}
const views={
  over:()=>{follow=null;flyTo([-5600,3300,6400],[0,800,0]);},
  inside:()=>{follow=null;setHood(1);flyTo([-1500,2900,2700],[0,900,0]);},
  follow:()=>{setHood(1);const b=lead(lanes[0]);watchBoard(b);},
  peak:()=>{follow=null;setHood(1);const x=PX0+11*ZL;flyTo([x-500,1650,1500],[x,900,0]);},
  cool:()=>{follow=null;setHood(1);const x=PX0+15*ZL;flyTo([x-500,1650,1500],[x,900,0]);},
  top:()=>{follow=null;setHood(1);flyTo([0,9500,10],[0,900,0]);}
};
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-v]').forEach(x=>x.classList.remove('on'));b.classList.add('on');views[b.dataset.v]();});
document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-s]').forEach(x=>x.classList.remove('on'));b.classList.add('on');speed=+b.dataset.s;});
$('bHood').onclick=()=>setHood(!hood.target);
let xray=false;
$('bXray').onclick=()=>{xray=!xray;$('bXray').classList.toggle('on',xray);shellMats.forEach(m=>{m.transparent=xray;m.opacity=xray?.1:1;m.depthWrite=!xray;m.needsUpdate=true;});};
$('bTherm').onclick=()=>{thermal=!thermal;$('bTherm').classList.toggle('on',thermal);lanes.forEach(L=>L.boards.forEach(b=>b.th.visible=thermal));};
$('bLab').onclick=()=>{showTags=!showTags;$('bLab').classList.toggle('on',showTags);if(!showTags)tags.forEach(t=>t.el.style.display='none');};
$('bPause').onclick=()=>{paused=!paused;$('bPause').textContent=paused?'Resume':'Pause';$('bPause').classList.toggle('on',paused);};
$('specBtn').onclick=()=>{const s=$('spec'),o=s.style.display!='block';s.style.display=o?'block':'none';$('specBtn').textContent=(o?'▾':'▸')+' Machine specifications';};
controls.addEventListener('start',()=>{tween=null;});
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let downAt=null;
function hitPart(e){mouse.set(e.clientX/window.innerWidth*2-1,-(e.clientY/window.innerHeight)*2+1);ray.setFromCamera(mouse,camera);
  const h=ray.intersectObjects([hoodPivot,...doors.map(d=>d.g)],true)[0];if(!h)return null;
  for(let o=h.object;o;o=o.parent){if(o===hoodPivot)return'hood';const k=doors.findIndex(d=>d.g===o);if(k>=0)return k;}return null;}
canvas.addEventListener('pointerdown',e=>{downAt=[e.clientX,e.clientY];});
canvas.addEventListener('pointerup',e=>{if(!downAt||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>5)return;const h=hitPart(e);if(h==='hood')setHood(!hood.target);else if(h!==null)doors[h].target=doors[h].target?0:1;});
canvas.addEventListener('pointermove',e=>{if(e.buttons)return;canvas.style.cursor=hitPart(e)!==null?'pointer':'';});

/* ---------- phase icon tabs + panel tabs ---------- */
function watchBoard(b){if(!b)return;watch=b;setHood(1);follow={b};tween=null;
  flyTo([b.x-300,CONV_Y+340,b.lane.z+520],[b.x,CONV_Y,b.lane.z],1);follow={b};}
const PHASE_OF={soak:['SOAK'],flux:['PREHEAT','SOAK','RAMP'],melt:['MELTING','LIQUID'],solid:['SOLIDIFYING','SOLID']};
function pickBoard(ph){const all=[...lanes[0].boards,...lanes[1].boards].filter(b=>b.x<LX1);
  let c=all.filter(b=>PHASE_OF[ph].includes(b.phase));
  if(ph=='flux')c.sort((a,b)=>b.evap-a.evap);else if(ph=='solid'){const sf=c.filter(b=>b.phase=='SOLIDIFYING');if(sf.length)c=sf;c.sort((a,b)=>a.x-b.x);}else c.sort((a,b)=>b.x-a.x);
  if(c.length)return c[0];
  const order=['PRINTED','PREHEAT','SOAK','RAMP','MELTING','LIQUID','SOLIDIFYING','SOLID'],tgt=order.indexOf(PHASE_OF[ph][0]);
  return all.filter(b=>order.indexOf(b.phase)<tgt).sort((a,b)=>b.x-a.x)[0]||lead(lanes[0]);}
function selectPhase(ph){watchPh=ph;document.querySelectorAll('.pi').forEach(e=>e.classList.toggle('on',e.dataset.p==ph));
  setTab('joint');watchBoard(ph=='live'?lead(lanes[0]):pickBoard(ph));}
function setTab(t){profTab=t;document.querySelectorAll('.tab').forEach(e=>e.classList.toggle('on',e.dataset.t==t));$('chart').style.display=t=='chart'?'block':'none';$('joint').style.display=t=='joint'?'block':'none';}
document.querySelectorAll('.pi').forEach(e=>e.onclick=()=>selectPhase(e.dataset.p));
document.querySelectorAll('.tab').forEach(e=>e.onclick=()=>setTab(e.dataset.t));
function updatePhaseIcons(){const b=watch&&machine.children.includes(watch.g)?watch:lead(lanes[0]);if(!b)return;
  for(const k in PHASE_OF){const el=document.querySelector('.pi[data-p="'+k+'"]');el.classList.toggle('live',PHASE_OF[k].includes(b.phase));}
  $('phName').textContent=PH[b.phase][0];$('phName').style.color=PH[b.phase][1];}

/* ---------- thermal profile chart ---------- */
const chart=$('chart'),cg=chart.getContext('2d');
function drawChart(){
  const W=chart.width,H=chart.height,ml=38,mr=10,mt=12,mb=24,pw=W-ml-mr,ph=H-mt-mb,TM=600,TY=280;
  const X=t=>ml+t/TM*pw,Y=T=>mt+ph-T/TY*ph;
  cg.clearRect(0,0,W,H);cg.fillStyle='rgba(8,12,18,.6)';cg.fillRect(0,0,W,H);
  const v=lanes[0].v,t0=(PX0-SPAWN)/v;cg.save();
  for(let i=0;i<NH+NC;i++){const a=X(t0+i*ZL/v),b=X(t0+(i+1)*ZL/v);cg.fillStyle=i<9?'rgba(255,170,60,.06)':i<NH?'rgba(255,80,40,.13)':'rgba(60,140,255,.1)';cg.fillRect(a,mt,b-a,ph);}
  cg.strokeStyle='rgba(255,255,255,.08)';cg.lineWidth=1;cg.font='10px Consolas,monospace';cg.fillStyle='#8fa3bd';
  for(let T=0;T<=TY;T+=50){cg.beginPath();cg.moveTo(ml,Y(T));cg.lineTo(W-mr,Y(T));cg.stroke();cg.fillText(T+'°',4,Y(T)+3);}
  for(let t=0;t<=TM;t+=100)cg.fillText(t+' s',X(t)-10,H-8);
  const hl=watchPh;cg.fillStyle=hl=='soak'?'rgba(255,138,60,.22)':'rgba(255,138,60,.09)';cg.fillRect(ml,Y(SOAK1),pw,Y(SOAK0)-Y(SOAK1));
  cg.fillStyle='#ff9a5c';cg.fillText('SOAK 150–200 °C',ml+4,Y(SOAK1)+11);
  if(hl=='melt'||hl=='solid'){cg.fillStyle=hl=='melt'?'rgba(255,77,90,.12)':'rgba(70,180,255,.12)';cg.fillRect(ml,mt,pw,Y(LIQ)-mt);}
  cg.strokeStyle='rgba(255,77,90,.7)';cg.setLineDash([5,4]);cg.beginPath();cg.moveTo(ml,Y(LIQ));cg.lineTo(W-mr,Y(LIQ));cg.stroke();cg.setLineDash([]);
  cg.fillStyle='#ff6b75';cg.fillText('217 °C liquidus',W-mr-96,Y(LIQ)-4);
  cg.strokeStyle='rgba(255,255,255,.35)';cg.beginPath();cg.moveTo(X(0),Y(25));cg.lineTo(X(t0),Y(25));
  for(let i=0;i<NH+NC;i++){cg.lineTo(X(t0+i*ZL/v),Y(ZSET[i]));cg.lineTo(X(t0+(i+1)*ZL/v),Y(ZSET[i]));}cg.stroke();
  const plot=(b,col,w)=>{if(!b)return;cg.strokeStyle=col;cg.lineWidth=w;cg.beginPath();b.prof.forEach((p,i)=>i?cg.lineTo(X(p[0]),Y(p[1])):cg.moveTo(X(p[0]),Y(p[1])));cg.lineTo(X(b.t),Y(b.T));cg.stroke();};
  plot(stats.last[0],'rgba(160,170,185,.6)',1.5);
  const wb=watch&&machine.children.includes(watch.g)?watch:lead(lanes[0]);
  if(wb){[['soak0','#ff8a3c','soak'],['flux','#d9a046','flux out'],['melt','#ff4d5a','melted'],['solid','#46d6e0','solid']].forEach(q=>{const e=wb.ev[q[0]];if(!e)return;
    cg.fillStyle=q[1];cg.beginPath();cg.arc(X(e[0]),Y(e[1]),4.5,0,7);cg.fill();cg.font='600 10px Arial';cg.fillText(q[2],X(e[0])+6,Y(e[1])+(q[0]=='solid'?12:-6));});}
  const a=lead(lanes[0]),c=lead(lanes[1]);plot(c,'#46d6e0',2);plot(a,'#ff9a3c',2.4);
  [[a,'#ff9a3c'],[c,'#46d6e0']].forEach(q=>{if(!q[0])return;cg.fillStyle=q[1];cg.beginPath();cg.arc(X(q[0].t),Y(q[0].T),3.5,0,7);cg.fill();});
  cg.lineWidth=1;cg.restore();
}
function zoneOf(b){const a=airAt(b.x);return a[2]<0?(b.x<PX0?'INFEED':'OUTFEED'):ZNAME[a[2]];}
function updateHud(){
  const a=lead(lanes[0]),c=lead(lanes[1]);
  $('b1').textContent=a?'#'+a.sn+' · '+zoneOf(a)+' · '+a.T.toFixed(0)+' °C':'—';
  $('b2').textContent=c?'#'+c.sn+' · '+zoneOf(c)+' · '+c.T.toFixed(0)+' °C':'—';
  $('sp').textContent=(lanes[0].v*60/10).toFixed(0)+' / '+(lanes[1].v*60/10).toFixed(0)+' cm/min';
  $('nin').textContent=lanes.reduce((s,L)=>s+L.boards.filter(b=>b.x>LX0-130&&b.x<LX1+130).length,0);
  $('o2').textContent=stats.o2.toFixed(0)+' ppm';
  const l=stats.last[0]||stats.last[1];
  $('pk').textContent=l?l.peak.toFixed(1)+' °C':'—';$('tal').textContent=l?l.tal.toFixed(0)+' s':'—';
  $('rmp').textContent=l?l.ramp.toFixed(2)+' / '+(-l.cool).toFixed(2)+' K/s':'—';
  $('ndone').textContent=stats.done;
  $('clk').textContent=new Date(simTime*1000).toISOString().substr(11,8);
}
function drawMon(){
  const g=monCtx,W=640,H=400;g.fillStyle='#eef0f2';g.fillRect(0,0,W,H);
  g.fillStyle='#0057a8';g.fillRect(0,0,W,40);g.fillStyle='#fff';g.font='700 20px Arial';g.textAlign='left';g.textBaseline='middle';g.fillText('ViCON  ·  VisionXP+  ·  dual lane',14,21);
  g.font='500 14px Arial';g.textAlign='right';g.fillText(paused?'PAUSED':'PRODUCTION',W-14,21);g.textAlign='left';
  const bw=34;for(let i=0;i<NH+NC;i++){const x=14+i*36,T=ZSET[i]+zoneNoise[i],h=T/280*190;g.fillStyle=i<NH?'#e86a2a':'#2a79c4';g.fillRect(x,250-h,bw-6,h);
    g.fillStyle='#1f2226';g.font='600 11px Arial';g.fillText(ZNAME[i],x,262);g.font='500 10px Arial';g.fillText(String(T),x,250-h-8);}
  g.fillStyle='#1f2226';g.font='600 14px Arial';
  g.fillText('Conveyor  L1 '+(lanes[0].v*6).toFixed(0)+' cm/min   L2 '+(lanes[1].v*6).toFixed(0)+' cm/min',14,292);
  g.fillText('N₂ atmosphere · residual O₂ '+stats.o2.toFixed(0)+' ppm',14,316);
  const l=stats.last[0]||stats.last[1];g.fillText('Last board: peak '+(l?l.peak.toFixed(1)+' °C':'—')+'   TAL '+(l?l.tal.toFixed(0)+' s':'—'),14,340);
  g.fillText('Boards completed  '+stats.done,14,364);
  monTex.needsUpdate=true;
}

/* ---------- main loop ---------- */
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();
renderer.shadowMap.autoUpdate=false;
const clock=new THREE.Clock();let hudT=0,monT=0,chT=0;const _p=new THREE.Vector3();
function frame(){
  requestAnimationFrame(frame);
  const rdt=Math.min(clock.getDelta(),.05),dt=paused?0:(window.__step!==undefined?window.__step:rdt*speed);
  if(dt>0){const n=Math.max(1,Math.ceil(dt/.5));for(let i=0;i<n;i++)simulate(dt/n);
    lanes.forEach(L=>L.tex.offset.x-=dt*L.v/16);}
  lanes.forEach(L=>L.boards.forEach(b=>{b.g.position.x=b.x;paintPaste(b);if(thermal)b.th.material.color.copy(TCOL(b.T));}));
  if(profTab=='joint'){const jb=watch&&machine.children.includes(watch.g)?watch:lead(lanes[0]);drawJoint(jb,paused?0:rdt*Math.min(speed,10)/10*3);}
  updatePhaseIcons();
  hood.open+=(hood.target-hood.open)*Math.min(1,rdt*2.5);hoodPivot.rotation.x=-hood.open*.85;
  doors.forEach(d=>{d.open+=(d.target-d.open)*Math.min(1,rdt*3.2);d.g.rotation.y=-d.dir*d.open*1.6;});
  tower.g.emissiveIntensity=!paused?1.8:.05;tower.y.emissiveIntensity=paused?1.8:.05;tower.r.emissiveIntensity=.05;
  if(tween){tween.t+=rdt;const k=ease(Math.min(1,tween.t/tween.dur));camera.position.lerpVectors(tween.p0,tween.p1,k);controls.target.lerpVectors(tween.t0,tween.t1,k);if(k>=1)tween=null;}
  if(follow&&!tween){if(!machine.children.includes(follow.b.g)||follow.b.x>LX1+300){follow=null;}else{const dx=follow.b.x-controls.target.x;camera.position.x+=dx;controls.target.x+=dx;}}
  controls.update();
  const dist=camera.position.distanceTo(controls.target);camera.near=Math.max(2,Math.min(10,dist*.03));camera.updateProjectionMatrix();
  const W=window.innerWidth,H=window.innerHeight;
  renderer.setViewport(0,0,W,H);renderer.clear();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
  if(showTags)tags.forEach(t=>{_p.copy(t.v);t.obj.localToWorld(_p);_p.project(camera);const vis=_p.z<1&&Math.abs(_p.x)<1&&Math.abs(_p.y)<1;t.el.style.display=vis?'block':'none';if(vis){t.el.style.left=((_p.x+1)/2*W)+'px';t.el.style.top=((1-_p.y)/2*H)+'px';}});
  hudT+=rdt;if(hudT>.1){hudT=0;updateHud();}
  chT+=rdt;if(chT>.15){chT=0;drawChart();}
  monT+=rdt;if(monT>.3){monT=0;drawMon();}
}
camera.position.set(-5600,3300,6400);controls.target.set(0,800,0);
window.__sim={selectPhase,setTab,get watch(){return watch;},lanes,stats,views,setHood,doors,get time(){return simTime;},ff:s=>{const n=Math.round(s/.5);for(let i=0;i<n;i++)simulate(.5);}};
frame();

