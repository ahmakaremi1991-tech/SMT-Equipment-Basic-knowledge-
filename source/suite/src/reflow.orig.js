
'use strict';
/* ===================================================================
   MIRTEC MV-9DL 3D AOI — dual lane simulation.  Units: millimetres.
   X = board flow (left -> right), Y = up, Z = toward the operator.
   =================================================================== */
THREE.ColorManagement.legacyMode=false;
const $=id=>document.getElementById(id);
const PI=Math.PI, BGU=THREE.BufferGeometryUtils;
let seed=20261;
function rnd(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}
const rr=(a,b)=>a+(b-a)*rnd(), pick=a=>a[Math.floor(rnd()*a.length)];

/* ---------- renderer / scene ---------- */
const canvas=$('c');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:false});
renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
renderer.outputEncoding=THREE.sRGBEncoding;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.autoClear=false;
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x10151d);
const camera=new THREE.PerspectiveCamera(38,1,10,40000);
camera.position.set(2450,1950,3300);
camera.layers.enable(1);camera.layers.enable(2);
const controls=new THREE.OrbitControls(camera,canvas);
controls.target.set(0,880,0);controls.enableDamping=true;controls.dampingFactor=.08;
controls.minDistance=45;controls.maxDistance=18000;controls.maxPolarAngle=PI*.495;

/* environment for reflections (small procedural studio) */
(function(){
  const es=new THREE.Scene();
  es.add(new THREE.Mesh(new THREE.BoxGeometry(100,100,100),new THREE.MeshBasicMaterial({color:0x3a4250,side:THREE.BackSide})));
  const pm=new THREE.MeshBasicMaterial({color:0xffffff});
  [[0,49,0,60,1,60],[-49,10,0,1,40,70],[49,15,20,1,30,40],[0,10,49,70,30,1]].forEach(a=>{const m=new THREE.Mesh(new THREE.BoxGeometry(a[3],a[4],a[5]),pm);m.position.set(a[0],a[1],a[2]);es.add(m);});
  const fl=new THREE.Mesh(new THREE.BoxGeometry(100,1,100),new THREE.MeshBasicMaterial({color:0x1a1d22}));fl.position.y=-49;es.add(fl);
  const pg=new THREE.PMREMGenerator(renderer);
  scene.environment=pg.fromScene(es,0.04).texture;pg.dispose();
})();

scene.add(new THREE.HemisphereLight(0xdfeaff,0x4a4f58,.75));
const sun=new THREE.DirectionalLight(0xffffff,1.9);
sun.position.set(900,2900,1900);sun.castShadow=true;
sun.shadow.mapSize.set(4096,4096);
Object.assign(sun.shadow.camera,{left:-4600,right:4600,top:4600,bottom:-4600,near:200,far:14000});
sun.shadow.bias=-.0004;sun.shadow.normalBias=1.2;
scene.add(sun);
const fill=new THREE.DirectionalLight(0x9fc0ff,.35);fill.position.set(-2000,1500,-1500);scene.add(fill);

/* ---------- helpers ---------- */
function canvasTex(w,h,draw,opt={}){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');draw(g,w,h);const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=renderer.capabilities.getMaxAnisotropy();if(opt.repeat){t.wrapS=t.wrapT=THREE.RepeatWrapping;}return t;}
const std=(color,rough=.6,metal=0,extra={})=>new THREE.MeshStandardMaterial(Object.assign({color,roughness:rough,metalness:metal,envMapIntensity:metal>.5?1.1:.5},extra));
function box(parent,w,h,d,mat,x,y,z,o={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);if(o.cast!==false)m.castShadow=true;if(o.recv!==false)m.receiveShadow=true;if(o.rx)m.rotation.x=o.rx;if(o.ry)m.rotation.y=o.ry;if(o.rz)m.rotation.z=o.rz;parent.add(m);return m;}
function cyl(parent,r1,r2,h,mat,x,y,z,o={}){const m=new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,o.seg||28,1,!!o.open),mat);m.position.set(x,y,z);if(o.cast!==false)m.castShadow=true;m.receiveShadow=true;if(o.rx)m.rotation.x=o.rx;if(o.rz)m.rotation.z=o.rz;parent.add(m);return m;}
function label(parent,text,w,h,x,y,z,o={}){
  const t=canvasTex(o.pw||512,o.ph||Math.round((o.pw||512)*h/w),(g,W,H)=>{if(o.bg){g.fillStyle=o.bg;g.fillRect(0,0,W,H);}g.fillStyle=o.fg||'#fff';g.font=(o.weight||'700')+' '+Math.round(H*(o.size||.62))+'px "Segoe UI",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,W/2,H/2+H*.04);});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,transparent:!o.bg,toneMapped:false}));
  m.position.set(x,y,z);if(o.ry)m.rotation.y=o.ry;if(o.rx)m.rotation.x=o.rx;parent.add(m);return m;
}

/* ---------- floor ---------- */
(function(){
  const t=canvasTex(512,512,(g,W,H)=>{g.fillStyle='#232a34';g.fillRect(0,0,W,H);g.strokeStyle='rgba(255,255,255,.055)';g.lineWidth=2;g.strokeRect(0,0,W,H);for(let i=0;i<900;i++){g.fillStyle='rgba(255,255,255,'+(Math.random()*.025)+')';g.fillRect(Math.random()*W,Math.random()*H,2,2);}},{repeat:true});
  t.repeat.set(40,40);
  const f=new THREE.Mesh(new THREE.PlaneGeometry(40000,40000),std(0xffffff,.82,0,{map:t}));
  f.rotation.x=-PI/2;f.receiveShadow=true;scene.add(f);
  // ESD safety line around the machine
  const lt=canvasTex(64,64,(g)=>{g.fillStyle='#e8b923';g.fillRect(0,0,64,64);});
  [[0,1250,9600,60],[0,-1250,9600,60]].forEach(a=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(a[2],a[3]),new THREE.MeshBasicMaterial({map:lt,transparent:true,opacity:.55}));m.rotation.x=-PI/2;m.position.set(a[0],1,a[1]);scene.add(m);});
  // soft contact shadow under the machine
  const st=canvasTex(256,256,(g,W,H)=>{const gr=g.createRadialGradient(W/2,H/2,W*.18,W/2,H/2,W*.5);gr.addColorStop(0,'rgba(0,0,0,.75)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);});
  const s=new THREE.Mesh(new THREE.PlaneGeometry(9000,2900),new THREE.MeshBasicMaterial({map:st,transparent:true,depthWrite:false}));
  s.rotation.x=-PI/2;s.position.y=2;scene.add(s);
})();

/* ===================================================================
   MACHINE — Rehm VisionXP+ convection reflow oven, dual lane.  Units: mm.
   Standard configuration: 9 preheat + 4 peak + 4 cooling zones,
   process (heating) length 4550 mm.  X = board flow, Z = toward operator.
   =================================================================== */
const CONV_Y=900, LANE_Z=[170,-170], BW=250, BD=200, BT=1.6;
const ZL=350,NH=13,NC=4,INF=600,OUTF=650;
const PX0=-(INF+NH*ZL+NC*ZL+OUTF)/2+INF;               // start of zone 1
const LX0=PX0-INF, LX1=PX0+(NH+NC)*ZL+OUTF;            // machine ends
const HZ=800,TOPY=1500,SILL=940,BASE=110;
const ZSET=[120,150,165,175,180,185,190,195,200,235,250,250,230,100,65,45,35];
const ZNAME=[...Array(9)].map((_,i)=>'P'+(i+1)).concat(['R1','R2','R3','R4','C1','C2','C3','C4']);
const machine=new THREE.Group();scene.add(machine);
const shellMats=[];
const sm=(c,r=.55,m=.05)=>{const x=std(c,r,m);shellMats.push(x);return x;};
const M={
  body:sm(0xe4e6e8,.45,.12), body2:sm(0xd6d9dc,.5,.15), anth:sm(0x33373d,.55,.2), band:sm(0x1f2226,.5,.25), blue:sm(0x0057a8,.45,.15),
  alu:std(0xb9c0c8,.35,.85), aluD:std(0x7d858f,.45,.8), steel:std(0xd5dadf,.22,.95), black:std(0x15171a,.55,.2),
  ss:std(0xa9afb5,.35,.8), red:std(0xc8202a,.5,.1), insul:std(0x7a7f86,.85,.1)
};
const NOSH={cast:false};
const L=LX1-LX0, CX=(LX0+LX1)/2;

/* --- base cabinet --- */
box(machine,L,800-BASE,2*HZ,M.body,CX,(800+BASE)/2,0,NOSH);
[-1,1].forEach(s=>box(machine,L,SILL-800,HZ-465,M.body,CX,(SILL+800)/2,s*(HZ+465)/2,NOSH));
[LX0+(PX0-LX0)/2,LX1-(LX1-PX0-(NH+NC)*ZL)/2].forEach(x=>box(machine,PX0-LX0-40,SILL-800-60,930,M.body,x,(SILL-60+800)/2,0,NOSH));
box(machine,L-40,BASE-20,2*HZ-60,M.anth,CX,(BASE+20)/2,0,NOSH);
for(let x=LX0+300;x<LX1-200;x+=1100)[-650,650].forEach(z=>{cyl(machine,40,46,16,M.steel,x,8,z);cyl(machine,13,13,80,M.steel,x,50,z);});
// dark band at conveyor level along the front + Rehm wordmark
box(machine,L,46,6,M.band,CX,SILL-23,HZ+3,NOSH);
// service doors along the front (one per ~2 zones)
const doors=[];
(function(){
  const segs=[[LX0+20,PX0-10]];for(let x=PX0;x<PX0+(NH+NC)*ZL-10;x+=700)segs.push([x+10,Math.min(x+690,PX0+(NH+NC)*ZL-10)]);segs.push([PX0+(NH+NC)*ZL+10,LX1-20]);
  segs.forEach((s,i)=>{const w=s[1]-s[0],g=new THREE.Group();g.position.set(s[0],0,HZ+4);machine.add(g);
    box(g,w,SILL-60-BASE-30,8,M.body2,w/2,(SILL-60+BASE+30)/2,0,NOSH);
    box(g,14,90,14,M.anth,w-40,600,10,NOSH);
    doors.push({g,dir:1,open:0,target:0,i});});
})();
// condensation trap / residue management units and blowers behind the doors
for(let i=0;i<NH+NC;i+=2){const x=PX0+i*ZL+ZL;cyl(machine,90,90,380,M.ss,x,520,HZ-260);cyl(machine,70,70,120,M.black,x,760,HZ-260);box(machine,220,120,220,M.aluD,x,240,HZ-260);}
box(machine,L-60,6,2*HZ-80,M.black,CX,BASE+30,0,NOSH);

/* --- end walls with dual-lane conveyor ports --- */
[-1,1].forEach(s=>{const x=s<0?LX0:LX1;
  box(machine,24,TOPY-SILL,2*HZ,M.body,x-s*12,(TOPY+SILL)/2,0,NOSH);
  box(machine,30,130,700,M.black,x+s*6,920,0,{cast:false});
  box(machine,34,92,640,new THREE.MeshBasicMaterial({color:0x050607}),x+s*7,916,0,NOSH);});

/* --- fixed lower tunnel (bottom heaters) --- */
const tunnel=new THREE.Group();machine.add(tunnel);
box(tunnel,(NH+NC)*ZL,30,900,M.insul,PX0+(NH+NC)*ZL/2,830,0);
[-1,1].forEach(s=>box(tunnel,(NH+NC)*ZL,120,30,M.ss,PX0+(NH+NC)*ZL/2,880,s*450));
box(tunnel,(NH+NC)*ZL,4,380,M.body2,PX0+(NH+NC)*ZL/2,SILL-2,(HZ+465)/2-40,NOSH);

/* nozzle plates (perforated, glowing with zone temperature) */
const nozT=canvasTex(256,256,(g)=>{g.fillStyle='#8c939a';g.fillRect(0,0,256,256);g.fillStyle='#1a1c1f';for(let y=10;y<256;y+=21)for(let x=(y/21)%2?10:20;x<256;x+=21){g.beginPath();g.arc(x,y,4.2,0,7);g.fill();}},{repeat:true});
nozT.repeat.set(1.3,3.4);
const zoneMats=[];
function zoneColor(t,cool){const c=new THREE.Color();if(cool){c.setRGB(.05,.25+.25*(t-30)/80,.6);return c;}const k=Math.max(0,Math.min(1,(t-100)/170));c.setRGB(1,.18+.5*(1-k)*.4,.02);return c;}
for(let i=0;i<NH+NC;i++){
  const cool=i>=NH,mt=new THREE.MeshStandardMaterial({color:cool?0x8fa4b8:0xa0a7ae,map:nozT,roughness:.6,metalness:.5,emissive:zoneColor(ZSET[i],cool),emissiveIntensity:cool?.25:.12+.75*Math.max(0,(ZSET[i]-110)/150)});
  zoneMats.push(mt);
  const x=PX0+i*ZL+ZL/2;
  box(tunnel,ZL-14,8,860,mt,x,852,0,NOSH);
  if(i>0)box(tunnel,6,70,880,M.ss,PX0+i*ZL,842,0,NOSH);
  if(cool){for(let f=-3;f<=3;f++)box(tunnel,ZL-40,22,6,std(0x6f8ea8,.4,.7),x,870,f*110,NOSH);}
}
// zone labels on the sill
for(let i=0;i<NH+NC;i++)label(machine,ZNAME[i]+'  '+ZSET[i]+'°',220,34,PX0+i*ZL+ZL/2,SILL+.5,HZ-150,{rx:-PI/2,fg:i<NH?'#c4602a':'#2a79c4',pw:440,size:.7});

/* --- pin-chain conveyors (two lanes, chains run the full length) --- */
const chainTex=canvasTex(64,16,(g)=>{g.fillStyle='#2a2d31';g.fillRect(0,0,64,16);g.fillStyle='#8a9097';for(let x=0;x<64;x+=16){g.fillRect(x+2,3,10,10);}g.fillStyle='#d8dde2';for(let x=0;x<64;x+=16)g.fillRect(x+6,6,3,4);},{repeat:true});
chainTex.repeat.set((L+300)/16,1);
const lanes=LANE_Z.map((z,i)=>{
  const g=new THREE.Group();machine.add(g);
  const T=chainTex.clone();T.needsUpdate=true;T.repeat.set((L+300)/16,1);
  const cm=std(0xffffff,.6,.5,{map:T});
  [-1,1].forEach(s=>{const rz=z+s*(BD/2+6);
    box(g,L+300,40,14,M.alu,CX,CONV_Y-22,rz);box(g,L+300,5,10,cm,CX,CONV_Y-1.5,rz-s*2,NOSH);
    box(g,L+300,8,4,M.aluD,CX,CONV_Y+8,rz+s*5,NOSH);});
  for(let x=LX0+200;x<LX1;x+=900)cyl(g,7,7,BD+40,M.steel,x,CONV_Y-36,z,{rx:PI/2,seg:10});
  label(g,'LANE '+(i+1),90,22,LX0+180,CONV_Y+12,z+(i?-130:130),{rx:-PI/2,fg:'#4fd1ff',pw:300,size:.7});
  return {i,z,g,tex:T,v:i?750/60:800/60,boards:[],last:null};
});

/* --- hood (process tunnel cover with top heaters) — hinged at the rear, lifts up --- */
const hoodPivot=new THREE.Group();hoodPivot.position.set(0,TOPY,-HZ);machine.add(hoodPivot);
const hoodTop=[];
(function(){
  const off=new THREE.Group();off.position.set(0,-TOPY,HZ);hoodPivot.add(off);
  const x0=PX0-40,x1=PX0+(NH+NC)*ZL+40,w=x1-x0,cx=(x0+x1)/2;
  box(off,w,22,2*HZ,M.body,cx,TOPY-11,0,NOSH);                                    // top
  box(off,w,TOPY-SILL-22,24,M.body,cx,(TOPY+SILL-22)/2,HZ-12,NOSH);                 // front skirt
  box(off,w,TOPY-SILL-22,24,M.body,cx,(TOPY+SILL-22)/2,-HZ+12,NOSH);
  [x0+12,x1-12].forEach(x=>box(off,24,TOPY-SILL-22,2*HZ,M.body,x,(TOPY+SILL-22)/2,0,NOSH));
  box(off,w,40,6,M.band,cx,TOPY-80,HZ+3,NOSH);                                     // dark accent line
  box(off,w,8,6,M.blue,cx,SILL+30,HZ+3,NOSH);
  // wordmarks
  const lt=canvasTex(1000,200,(g,W,H)=>{g.clearRect(0,0,W,H);g.fillStyle='#0057a8';g.font='italic 900 150px "Arial Black",Arial,sans-serif';g.textBaseline='middle';g.fillText('Rehm',10,100);g.fillStyle='#4a4f56';g.font='500 46px Arial';g.fillText('THERMAL SYSTEMS',470,72);g.font='700 60px Arial';g.fillStyle='#1f2226';g.fillText('VisionXP+',470,136);});
  const lg=new THREE.Mesh(new THREE.PlaneGeometry(900,180),new THREE.MeshStandardMaterial({map:lt,transparent:true,roughness:.5}));lg.position.set(x0+700,1240,HZ+1);off.add(lg);
  // zone strip on the front (thin LED bar per zone)
  for(let i=0;i<NH+NC;i++){const mt=new THREE.MeshBasicMaterial({color:i<NH?0xff7a20:0x40a0ff,toneMapped:false});box(off,ZL-60,10,4,mt,PX0+i*ZL+ZL/2,SILL+70,HZ+2,NOSH);}
  // insulated inner box + top heater modules with nozzle plates
  box(off,(NH+NC)*ZL,30,900,M.insul,PX0+(NH+NC)*ZL/2,1205,0);
  [-1,1].forEach(s=>box(off,(NH+NC)*ZL,250,30,M.ss,PX0+(NH+NC)*ZL/2,1070,s*450));
  for(let i=0;i<NH+NC;i++){const x=PX0+i*ZL+ZL/2;
    box(off,ZL-14,8,860,zoneMats[i],x,965,0,NOSH);
    if(i>0)box(off,6,240,880,M.ss,PX0+i*ZL,1080,0,NOSH);
    if(i<NH){box(off,ZL-80,130,300,M.ss,x,1120,0);cyl(off,60,60,90,M.black,x,TOPY+40,-300);}else{box(off,ZL-60,90,500,std(0x6f8ea8,.4,.7),x,1110,0);}
  }
})();
const hood={open:0,target:0};
// exhaust stacks (fixed on the hood top would move; put them on the rear frame)
[PX0+2*ZL,PX0+12*ZL].forEach(x=>{cyl(machine,75,75,260,M.ss,x,TOPY+130,-HZ+90);cyl(machine,90,90,20,M.ss,x,TOPY+10,-HZ+90);});

/* --- infeed / outfeed covers (glass) --- */
const glassMat=new THREE.MeshStandardMaterial({color:0x9db4c8,roughness:.05,metalness:.2,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});
[[LX0+12,PX0-40],[PX0+(NH+NC)*ZL+40,LX1-12]].forEach(s=>{const w=s[1]-s[0],cx=(s[0]+s[1])/2;
  box(machine,w,22,2*HZ,M.body,cx,TOPY-11,0,NOSH);box(machine,w,TOPY-SILL-22,22,M.body,cx,(TOPY+SILL)/2,-HZ+11,NOSH);
  const f=new THREE.Mesh(new THREE.PlaneGeometry(w-40,TOPY-SILL-80),glassMat);f.position.set(cx,(TOPY+SILL)/2,HZ-6);f.renderOrder=5;machine.add(f);
  box(machine,w,30,24,M.body,cx,TOPY-37,HZ-12,NOSH);box(machine,w,24,24,M.body,cx,SILL+12,HZ-12,NOSH);});

/* --- signal tower + operator monitor at the infeed --- */
const tower={};
(function(){
  const g=new THREE.Group();g.position.set(LX0+200,TOPY,-HZ+150);machine.add(g);
  cyl(g,9,9,260,M.steel,0,130,0);cyl(g,22,26,14,M.black,0,7,0);
  [['r',0xff2a2a,340],['y',0xffa800,300],['g',0x22e06a,260]].forEach(a=>{const mt=new THREE.MeshStandardMaterial({color:a[1],emissive:a[1],emissiveIntensity:.05,roughness:.3,transparent:true,opacity:.92});tower[a[0]]=mt;cyl(g,22,22,38,mt,0,a[2]+19,0);});
  cyl(g,23,23,8,M.dark||M.band,0,382,0);
})();
let monTex,monCtx;
(function(){
  const g=new THREE.Group();g.position.set(LX0+380,0,HZ);machine.add(g);
  box(g,60,60,240,M.body2,0,1300,120);box(g,60,260,60,M.body2,0,1400,230);
  const m=new THREE.Group();m.position.set(0,1460,290);m.rotation.y=.35;g.add(m);
  box(m,620,400,40,M.black,0,0,0);box(m,120,120,40,M.black,0,0,-36);
  const c=document.createElement('canvas');c.width=640;c.height=400;monCtx=c.getContext('2d');
  monTex=new THREE.CanvasTexture(c);monTex.encoding=THREE.sRGBEncoding;monTex.anisotropy=8;
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(586,366),new THREE.MeshBasicMaterial({map:monTex,toneMapped:false}));scr.position.set(0,0,21);m.add(scr);
  const k=new THREE.Group();k.position.set(0,1180,300);k.rotation.y=.35;g.add(k);
  box(k,520,14,200,M.black,0,0,0);box(k,360,12,120,std(0x2c2f34,.6),-50,13,-10);
})();
// E-stops on both ends of the front
[LX0+120,LX1-120].forEach(x=>{box(machine,90,90,4,std(0xf2c400,.5),x,SILL-160,HZ+6,NOSH);cyl(machine,28,22,28,M.red,x,SILL-160,HZ+22,{rx:PI/2,cast:false});});

/* --- neighbours in the line --- */
[-1,1].forEach(s=>{
  box(scene,640,1000,800,std(0x262c35,.75,.1),s*(LX1+520),500,0,NOSH);
  box(scene,4,100,620,M.black,s*(LX1+199),916,0,NOSH);
  label(scene,s<0?'▶  FROM AOI':'TO UNLOADER  ▶',520,70,s*(LX1+520),1001,300,{rx:-PI/2,fg:'#9fb4cf',pw:800,size:.5});
});
const interior=machine;
const inLight=new THREE.PointLight(0xffd9b0,.6,3000,1);inLight.position.set(CX,1150,0);machine.add(inLight);
/* ===================================================================
   PCB — high-detail assembled board (built once, instanced per board)
   =================================================================== */
const PM={ // component materials
  icBody:std(0x16181b,.55,.05), bgaSub:std(0x0e3b26,.5,.05), tin:std(0xd6dadd,.28,.9), solder:std(0xc9ced2,.2,.95),
  ceramic:std(0xe8e6df,.6,0), resTop:std(0x121314,.5,0), mlcc:std(0xb08a5a,.55,0), mlcc2:std(0x8d6b46,.55,0),
  alu:std(0xcfd4d8,.25,.92), ecapBase:std(0x111214,.6,0), tant:std(0xd99a1c,.55,0), tantMark:std(0x7a4a08,.6,0),
  ferrite:std(0x3a3d41,.75,.1), steel:std(0xd9dde0,.2,.95), plastic:std(0x1a1b1e,.6,0), gold:std(0xe2b84a,.25,.95),
  ledBase:std(0xf0efe8,.5,0), ledG:std(0x7dff9a,.3,0,{emissive:0x1bbf4a,emissiveIntensity:.5}), ledR:std(0xff8a8a,.3,0,{emissive:0xd02020,emissiveIntensity:.5}),
  fr4:std(0x0d4a2a,.6,.05)
};
function markMat(w,h,draw){const t=canvasTex(w,h,draw);return new THREE.MeshStandardMaterial({map:t,transparent:true,alphaTest:.35,roughness:.6,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2});}
const mk=(lines,col='#b9bdc2')=>(g,W,H)=>{g.clearRect(0,0,W,H);g.fillStyle=col;g.textAlign='center';g.textBaseline='middle';const n=lines.length;lines.forEach((l,i)=>{g.font=(i==0?'700 ':'500 ')+Math.round(H/(n+1.2)*(i==0?1.05:.8))+'px Arial';g.fillText(l,W/2,H*(i+1)/(n+1));});};
PM.markR=markMat(96,48,mk(['103'],'#e8e8e8'));
PM.markR2=markMat(96,48,mk(['4701'],'#e8e8e8'));
PM.markIC=markMat(256,128,mk(['LM358D','2231 K7'],'#aeb3b8'));
PM.markIC2=markMat(256,96,mk(['74HC595','A2241'],'#aeb3b8'));
PM.markMCU=markMat(256,256,(g,W,H)=>{mk(['ARM','MCU-F407','VGT6  2244','KOR 9A'])(g,W,H);g.beginPath();g.arc(30,H-30,11,0,7);g.fillStyle='#63686d';g.fill();});
PM.markBGA=markMat(256,256,(g,W,H)=>{mk(['SoC','MX8-QUAD','AB1234.01','2245 TW'])(g,W,H);g.beginPath();g.arc(26,H-26,9,0,7);g.fillStyle='#8a8f94';g.fill();});
PM.markL=markMat(96,96,mk(['4R7'],'#d0d0d0'));
PM.markEcap=(function(){const t=canvasTex(128,128,(g,W,H)=>{g.fillStyle='#c9ced2';g.beginPath();g.arc(64,64,64,0,7);g.fill();g.fillStyle='#17181a';g.beginPath();g.arc(64,64,64,PI*.62,PI*1.38);g.closePath();g.fill();g.fillStyle='#17181a';g.font='700 26px Arial';g.textAlign='center';g.fillText('100',78,52);g.fillText('16V',78,82);g.font='500 16px Arial';g.fillText('K2A',78,104);});return std(0xffffff,.35,.5,{map:t});})();
PM.label=(function(){const t=canvasTex(300,100,(g,W,H)=>{g.fillStyle='#f4f4f0';g.fillRect(0,0,W,H);g.fillStyle='#111';let x=14;while(x<W-14){const w=1+Math.floor(Math.random()*4);g.fillRect(x,10,w,52);x+=w+1+Math.floor(Math.random()*3);}g.font='600 20px Consolas,monospace';g.textAlign='center';g.fillText('SN MV9DL-0042-A17',W/2,86);});return std(0xffffff,.7,0,{map:t});})();

const geoCache={};
const BX=(w,h,d)=>{const k='b'+w+'_'+h+'_'+d;return geoCache[k]||(geoCache[k]=new THREE.BoxGeometry(w,h,d));};
const CY=(r1,r2,h,s=20)=>{const k='c'+r1+'_'+r2+'_'+h+'_'+s;return geoCache[k]||(geoCache[k]=new THREE.CylinderGeometry(r1,r2,h,s));};
const FLAT=(w,d)=>{const k='f'+w+'_'+d;if(!geoCache[k]){const g=new THREE.PlaneGeometry(w,d);g.rotateX(-PI/2);geoCache[k]=g;}return geoCache[k];};
const DISC=(r)=>{const k='d'+r;if(!geoCache[k]){const g=new THREE.CircleGeometry(r,28);g.rotateX(-PI/2);geoCache[k]=g;}return geoCache[k];};
const BALL=(r)=>{const k='s'+r;return geoCache[k]||(geoCache[k]=new THREE.SphereGeometry(r,7,5));};
class Bucket{constructor(){this.m={};}
  add(mat,geo,mtx){const g=geo.clone();g.applyMatrix4(mtx);(this.m[mat]=this.m[mat]||[]).push(g);}
  build(parent){for(const k in this.m){const g=BGU.mergeBufferGeometries(this.m[k],false);this.m[k].forEach(x=>x.dispose());const mesh=new THREE.Mesh(g,PM[k]);mesh.receiveShadow=true;parent.add(mesh);}return parent;}}
const _m=new THREE.Matrix4(),_v=new THREE.Vector3();
function P(ls,mat,geo,x,y,z,ang=0){const m=new THREE.Matrix4().makeRotationY(ang);m.setPosition(x,y,z);ls.push([mat,geo,m]);}
function PR(ls,mat,geo,ang,x,y,z){const m=new THREE.Matrix4().makeRotationY(ang);_v.set(x,y,z).applyMatrix4(m);m.setPosition(_v);ls.push([mat,geo,m]);}
function padR(pd,ang,x,z,w,d){const c=Math.cos(ang),s=Math.sin(ang),odd=Math.abs(s)>.5;pd.push([x*c+z*s,-x*s+z*c,odd?d:w,odd?w:d]);}
function leadRow(ls,pd,n,pitch,edge,H,ang,lw){
  for(let i=0;i<n;i++){const px=(i-(n-1)/2)*pitch;
    PR(ls,'tin',BX(lw,.15,.5),ang,px,H*.55,edge+.2);
    PR(ls,'tin',BX(lw,+(H*.55).toFixed(3),.15),ang,px,H*.275+.04,edge+.45);
    PR(ls,'tin',BX(lw,.15,.65),ang,px,.075,edge+.72);
    padR(pd,ang,px,edge+.75,+(lw+.12).toFixed(3),1.35);}
}
/* --- component builders: fill part list (ls) + pad list (pd), return footprint info --- */
const C={
  chip:(L,W,H,type,mark)=>(ls,pd)=>{const t=+(Math.max(.22,L*.2)).toFixed(3);
    P(ls,type=='R'?'ceramic':(type=='C2'?'mlcc2':'mlcc'),BX(+(L-2*t).toFixed(3),H,W),0,H/2,0);
    P(ls,'tin',BX(t,+(H+.04).toFixed(3),+(W+.04).toFixed(3)),-(L-t)/2,H/2,0);P(ls,'tin',BX(t,+(H+.04).toFixed(3),+(W+.04).toFixed(3)),(L-t)/2,H/2,0);
    if(type=='R'){P(ls,'resTop',BX(+(L-2*t-.04).toFixed(3),.03,+(W-.08).toFixed(3)),0,H+.015,0);if(L>=1.6)P(ls,mark||'markR',FLAT(+(L-2*t-.15).toFixed(3),+(W*.72).toFixed(3)),0,H+.04,0);}
    pd.push([-L/2,0,L*.44,W*1.22],[L/2,0,L*.44,W*1.22]);return{w:L+.9,d:W+.7,h:H,kind:'chip',len:L};},
  led:(col)=>(ls,pd)=>{P(ls,'ledBase',BX(1.6,.3,.8),0,.15,0);P(ls,col,BX(1.0,.45,.78),0,.52,0);P(ls,'tin',BX(.3,.34,.84),-.65,.17,0);P(ls,'tin',BX(.3,.34,.84),.65,.17,0);
    pd.push([-.8,0,.7,1],[.8,0,.7,1]);return{w:2.5,d:1.5,h:.75,kind:'led',len:1.6};},
  soic:(n)=>(ls,pd)=>{const bl=+(n/2*1.27-.18).toFixed(2);
    P(ls,'icBody',BX(bl,1.45,3.9),0,.1+.725,0);P(ls,n>8?'markIC2':'markIC',FLAT(+(bl*.86).toFixed(2),n>8?2.9:3.1),0,1.57,0);
    P(ls,'tin',CY(.28,.28,.02,12),-bl/2+.7,1.56,1.3);
    leadRow(ls,pd,n/2,1.27,1.95,1.5,0,.42);leadRow(ls,pd,n/2,1.27,1.95,1.5,PI,.42);
    return{w:bl+.8,d:6.6,h:1.6,kind:'ic'};},
  qfp:(nps,body,pitch)=>(ls,pd)=>{
    P(ls,'icBody',BX(body,1.4,body),0,.1+.7,0);P(ls,'markMCU',FLAT(+(body*.82).toFixed(2),+(body*.82).toFixed(2)),0,1.52,0);
    for(let k=0;k<4;k++)leadRow(ls,pd,nps,pitch,body/2,1.5,k*PI/2,+(pitch*.46).toFixed(3));
    return{w:body+2.8,d:body+2.8,h:1.6,kind:'ic'};},
  bga:(size,pitch)=>(ls,pd)=>{const n=Math.floor((size-1)/pitch);
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){if(i>1&&i<n-2&&j>1&&j<n-2)continue;P(ls,'solder',BALL(+(pitch*.3).toFixed(3)),(i-(n-1)/2)*pitch,.24,(j-(n-1)/2)*pitch);}
    P(ls,'bgaSub',BX(size,.36,size),0,.44+.18,0);P(ls,'icBody',BX(size-1.6,1.0,size-1.6),0,.8+.5,0);
    P(ls,'markBGA',FLAT(+(size*.74).toFixed(2),+(size*.74).toFixed(2)),0,1.82,0);
    return{w:size+1,d:size+1,h:1.85,kind:'ic'};},
  qfn:(s)=>(ls,pd)=>{P(ls,'icBody',BX(s,.85,s),0,.45,0);P(ls,'tin',CY(.25,.25,.02,12),-s/2+.7,.87,s/2-.7);
    const n=Math.round(s/.5)-2;for(let k=0;k<4;k++)for(let i=0;i<n;i++)padR(pd,k*PI/2,(i-(n-1)/2)*.5,s/2+.05,.26,.8);
    return{w:s+1,d:s+1,h:.9,kind:'ic'};},
  ecap:(d,h)=>(ls,pd)=>{const r=d/2;
    P(ls,'ecapBase',BX(d+.6,1.5,d+.6),0,.75,0);P(ls,'alu',CY(r,r,+(h-1.9).toFixed(2),28),0,1.4+(h-1.9)/2,0);
    P(ls,'alu',CY(+(r-.5).toFixed(2),r,.5,28),0,h-.25,0);P(ls,'markEcap',DISC(+(r-.5).toFixed(2)),0,h+.02,0);
    P(ls,'tin',BX(1.1,.25,.9),-(r+.75),.125,0);P(ls,'tin',BX(1.1,.25,.9),(r+.75),.125,0);
    pd.push([-(r+.5),0,d*.5,1.9],[(r+.5),0,d*.5,1.9]);return{w:d+1.2,d:d+1.2,h:h,kind:'ecap',round:r+.9};},
  tant:(L,W,H)=>(ls,pd)=>{P(ls,'tant',BX(L-.5,H,W),0,H/2+.03,0);P(ls,'tantMark',BX(.7,.03,W),-L/2+1.1,H+.045,0);
    P(ls,'tin',BX(.4,H*.6,W*.8),-L/2+.1,H*.3,0);P(ls,'tin',BX(.4,H*.6,W*.8),L/2-.1,H*.3,0);
    pd.push([-L/2+.2,0,1.6,W*.9],[L/2-.2,0,1.6,W*.9]);return{w:L+1,d:W+.8,h:H,kind:'tant'};},
  sot23:()=>(ls,pd)=>{P(ls,'icBody',BX(2.9,1.0,1.3),0,.6,0);leadRow(ls,pd,2,1.9,.65,1.0,0,.4);leadRow(ls,pd,1,1.9,.65,1.0,PI,.4);return{w:3.4,d:3.4,h:1.1,kind:'ic'};},
  ind:(s,h)=>(ls,pd)=>{P(ls,'ferrite',BX(s,h,s),0,h/2,0);P(ls,'markL',FLAT(s*.6,s*.6),0,h+.03,0);
    P(ls,'tin',BX(.5,h*.5,s*.7),-s/2,h*.25,0);P(ls,'tin',BX(.5,h*.5,s*.7),s/2,h*.25,0);pd.push([-s/2,0,1.8,s*.8],[s/2,0,1.8,s*.8]);return{w:s+1.2,d:s+.8,h:h,kind:'ic'};},
  xtal:()=>(ls,pd)=>{P(ls,'plastic',BX(11.6,.5,4.9),0,.25,0);P(ls,'steel',BX(10.6,3.0,4.1),0,2,0);pd.push([-5.6,0,2.4,2.2],[5.6,0,2.4,2.2]);return{w:13,d:5.6,h:3.5,kind:'ic'};},
  header:(n,rows)=>(ls,pd)=>{P(ls,'plastic',BX(+(n*2.54).toFixed(2),2.5,+(rows*2.54).toFixed(2)),0,1.25,0);
    for(let i=0;i<n;i++)for(let j=0;j<rows;j++)P(ls,'gold',BX(.64,8.4,.64),(i-(n-1)/2)*2.54,4.2,(j-(rows-1)/2)*2.54);
    return{w:n*2.54+.8,d:rows*2.54+.8,h:8.4,kind:'conn'};},
  usb:()=>(ls,pd)=>{P(ls,'steel',BX(14,7,13),0,3.5,0);P(ls,'plastic',BX(12,5,.5),0,3.5,6.4);pd.push([-7.2,-3,2,3],[7.2,-3,2,3]);return{w:15.5,d:14,h:7,kind:'conn'};},
  dpak:()=>(ls,pd)=>{P(ls,'icBody',BX(6.5,2.3,6.1),0,1.15,0);P(ls,'tin',BX(5.3,.5,1.3),0,.25,-3.6);leadRow(ls,pd,2,4.57,3.05,1.3,0,.8);
    pd.push([0,-1.6,6.4,6.6]);return{w:7.6,d:10,h:2.3,kind:'ic'};}
};

const FIDS=[{x:-105,z:-90},{x:105,z:-90},{x:-105,z:90}];
const board=(function buildTemplate(){
  const S=10,CW=BW*S,CH=BD*S;
  const bucket=new Bucket(),cands=[],places=[],refs={};
  const SIZ={ '0402':[1.0,.5,.35],'0603':[1.6,.8,.45],'0805':[2.0,1.25,.5],'1206':[3.2,1.6,.55] };
  function place(pre,x,z,rot,builder,o={}){
    const ls=[],pd=[],info=builder(ls,pd);refs[pre]=(refs[pre]||0)+1;const name=pre+refs[pre];
    places.push({name,x,z,rot,pd,info,silk:o.silk!==false});
    if(false){const g=new THREE.Group(),b=new Bucket();ls.forEach(a=>b.add(a[0],a[1],a[2]));b.build(g);g.position.set(x,BT,z);g.rotation.order='YXZ';g.rotation.y=rot;cands.push({name,kind:info.kind,len:info.len||0,group:g,x,z,rot,w:info.w,d:info.d,h:info.h});}
    else{const m=new THREE.Matrix4().makeRotationY(rot);m.setPosition(x,BT,z);ls.forEach(a=>bucket.add(a[0],a[1],new THREE.Matrix4().multiplyMatrices(m,a[2])));}
  }
  const R=(sz,x,z,rot,o)=>{const s=SIZ[sz];place('R',x,z,rot,C.chip(s[0],s[1],s[2],'R',rnd()<.5?'markR':'markR2'),o);};
  const Cc=(sz,x,z,rot,o)=>{const s=SIZ[sz];place('C',x,z,rot,C.chip(s[0],s[1],+(Math.min(s[1]*.95,1.3)).toFixed(2),rnd()<.3?'C2':'C'),o);};
  const H=PI/2;
  /* ---- layout (mm, origin = board centre) ---- */
  // U1: big BGA + decoupling ring
  place('U',-65,-40,0,C.bga(27,1.0));
  for(let i=0;i<7;i++){Cc('0402',-77+i*4,-59,0);Cc('0402',-77+i*4,-21,0);Cc('0402',-84,-52+i*4,H);Cc('0402',-46,-52+i*4,H);}
  // U2: QFP-100 + crystal
  place('U',-65,40,0,C.qfp(25,14,.5));
  for(let i=0;i<7;i++){R('0603',-80+i*5,56,H);Cc('0603',-80+i*5,25,H);}
  place('Y',-93,40,H,C.xtal());Cc('0603',-93,50,0);Cc('0603',-93,30,0);
  // U3: BGA 17
  place('U',-5,-50,0,C.bga(17,.8));
  for(let i=0;i<4;i++){Cc('0402',9,-56+i*4,H);Cc('0402',-19,-56+i*4,H);Cc('0402',-11+i*4,-64,0);}
  // U4: QFP-64
  place('U',0,15,0,C.qfp(16,10,.5));
  for(let i=0;i<5;i++){R('0805',-12+i*6,30,H,{cand:i==1});Cc('0805',-12+i*6,1,H);}
  // U5: QFP-44
  place('U',-5,65,0,C.qfp(11,10,.8));
  for(let i=0;i<4;i++){R('1206',15+i*5,61,H,{cand:i==2});Cc('1206',15+i*5,71,H);}
  // SOIC logic row
  for(let i=0;i<4;i++)place('U',35+i*12,-6,0,C.soic(8),{cand:i==1});
  place('U',40,15,0,C.soic(16));place('U',62,15,0,C.soic(16));
  for(let i=0;i<7;i++)Cc('0603',35+i*6,5,0);
  for(let i=0;i<9;i++)R('1206',34+i*6,28,H,{cand:i==4||i==7});
  // power section
  place('U',40,-35,0,C.qfn(5));place('U',55,-35,0,C.qfn(5));
  place('L',72,-35,0,C.ind(6,3));place('L',72,-52,0,C.ind(6,3));
  place('Q',40,-56,0,C.dpak());
  place('C',56,-50,0,C.tant(7.3,4.3,2.8),{cand:true});place('C',56,-58,0,C.tant(7.3,4.3,2.8));
  [[95,-76],[108,-76],[95,-61],[108,-61]].forEach(p=>place('C',p[0],p[1],0,C.ecap(8,10)));
  place('C',94,-46,0,C.ecap(6.3,7.7),{cand:true});place('C',105,-46,0,C.ecap(6.3,7.7));
  place('C',100,-29,0,C.ecap(10,10.5));
  for(let i=0;i<3;i++)place('C',95+i*10,-9,H,C.tant(3.5,2.8,1.9));
  // connectors
  place('J',100,20,H,C.header(10,2));place('J',100,60,H,C.header(8,1));
  place('J',50,-90,0,C.header(13,2));place('J',85,90,0,C.usb());
  // LEDs and small-signal
  for(let i=0;i<6;i++){place('D',20+i*8,89,0,C.led(i%2?'ledR':'ledG'),{cand:i==2});R('0603',20+i*8,83,0);}
  for(let i=0;i<6;i++){place('Q',30+i*10,45,0,C.sot23(),{cand:i==3});R('0603',30+i*10,38.5,0);Cc('0402',30+i*10,51,0);}
  // passive fields
  for(let i=0;i<21;i++)(i%2?R:Cc)('0805',-110,-70+i*7,0,{cand:i==6||i==15});
  for(let c=0;c<3;c++)for(let i=0;i<10;i++)(((c+i)%3)?R:Cc)('0603',-38+c*6,-60+i*4,H,{cand:(c==1&&i==5)});
  place('U',-32,13,0,C.soic(8));place('U',-32,26,0,C.soic(8));
  for(let c=0;c<5;c++)for(let i=0;i<5;i++)(((c*2+i)%3)?R:Cc)('0805',-42+c*5,42+i*7,H,{cand:(c==2&&i==2)||(c==4&&i==0)});
  for(let i=0;i<11;i++)Cc('1206',22+i*6,-76,H,{cand:i==5});
  for(let i=0;i<15;i++)R('0603',-100+i*5,-72,H);
  for(let i=0;i<21;i++)Cc('0402',-50+i*3,86,H);
  for(let i=0;i<11;i++)R('0805',113,10+i*6,0,{cand:i==8});

  /* ---- board artwork (solder mask, traces, pads, silkscreen) ---- */
  const tex=canvasTex(CW,CH,(g)=>{
    const X=x=>(x+BW/2)*S,Z=z=>(z+BD/2)*S;
    g.fillStyle='#0f5a31';g.fillRect(0,0,CW,CH);
    // subtle copper-pour hatch
    g.strokeStyle='rgba(30,140,80,.18)';g.lineWidth=1;for(let i=-CH;i<CW;i+=14){g.beginPath();g.moveTo(i,0);g.lineTo(i+CH,CH);g.stroke();}
    // traces
    const padPts=[];places.forEach(p=>{const c=Math.cos(p.rot),s=Math.sin(p.rot);p.pd.forEach(a=>padPts.push([p.x+a[0]*c+a[1]*s,p.z-a[0]*s+a[1]*c]));});
    const dirs=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
    g.lineCap='round';g.lineJoin='round';
    for(let i=0;i<620;i++){let p=pick(padPts),x=p[0],z=p[1],d=Math.floor(rnd()*8);
      g.strokeStyle=rnd()<.5?'#178049':'#1a8a4f';g.lineWidth=rnd()<.12?5:(rnd()<.5?2.2:1.6);g.beginPath();g.moveTo(X(x),Z(z));
      const n=2+Math.floor(rnd()*4);for(let k=0;k<n;k++){const l=rr(2,16),dd=dirs[d];x=Math.max(-121,Math.min(121,x+dd[0]*l));z=Math.max(-96,Math.min(96,z+dd[1]*l));g.lineTo(X(x),Z(z));d=(d+(rnd()<.5?1:7))%8;}
      g.stroke();
      if(rnd()<.75){g.fillStyle='#c9a54a';g.beginPath();g.arc(X(x),Z(z),3.6,0,7);g.fill();g.fillStyle='#0a2e1a';g.beginPath();g.arc(X(x),Z(z),1.5,0,7);g.fill();}
    }
    // pads (ENIG gold)
    places.forEach(p=>{g.save();g.translate(X(p.x),Z(p.z));g.rotate(-p.rot);
      p.pd.forEach(a=>{g.fillStyle='#0a3f22';g.fillRect((a[0]-a[2]/2)*S-1.5,(a[1]-a[3]/2)*S-1.5,a[2]*S+3,a[3]*S+3);g.fillStyle='#d9b85c';g.fillRect((a[0]-a[2]/2)*S,(a[1]-a[3]/2)*S,a[2]*S,a[3]*S);});
      g.restore();});
    // silkscreen
    g.strokeStyle='#f1f3f0';g.fillStyle='#f1f3f0';g.lineWidth=1.6;
    places.forEach(p=>{const i=p.info;if(!p.silk||i.w<2.4)return;g.save();g.translate(X(p.x),Z(p.z));g.rotate(-p.rot);
      if(i.round){g.beginPath();g.arc(0,0,i.round*S,0,7);g.stroke();g.font='700 22px Arial';g.fillText('+',-i.round*S-16,-i.round*S+10);}
      else if(i.kind=='ic'||i.kind=='conn'||i.kind=='tant'){const w=i.w*S+6,d=i.d*S+6;const c=10;
        [[-1,-1],[1,-1],[1,1],[-1,1]].forEach(q=>{g.beginPath();g.moveTo(q[0]*w/2,q[1]*(d/2-c));g.lineTo(q[0]*w/2,q[1]*d/2);g.lineTo(q[0]*(w/2-c),q[1]*d/2);g.stroke();});
        g.beginPath();g.arc(-w/2-5,d/2+5,2.6,0,7);g.fill();}
      g.restore();
      if(i.kind!='chip'&&i.kind!='led'){g.font='600 13px Arial';const ex=(Math.abs(Math.sin(p.rot))>.5?i.d:i.w)/2,ez=(Math.abs(Math.sin(p.rot))>.5?i.w:i.d)/2;g.fillText(p.name,X(p.x-ex),Z(p.z-ez)-8);}
    });
    g.font='700 26px Arial';g.fillText('AOI DEMO BOARD · MV9-TV1 REV C',X(-100),Z(96.5));
    g.font='600 15px Arial';g.fillText('SMT LINE SIMULATION · 94V-0 · 2026-W46',X(-42),Z(96.5));
    // fiducials + tooling holes
    FIDS.forEach(f=>{g.fillStyle='#3a2a16';g.beginPath();g.arc(X(f.x),Z(f.z),15,0,7);g.fill();g.fillStyle='#e0bf62';g.beginPath();g.arc(X(f.x),Z(f.z),5,0,7);g.fill();});
    [[-118,-93],[118,-93],[-118,93],[118,93]].forEach(h=>{g.fillStyle='#d9b85c';g.beginPath();g.arc(X(h[0]),Z(h[1]),30,0,7);g.fill();g.fillStyle='#07090b';g.beginPath();g.arc(X(h[0]),Z(h[1]),16,0,7);g.fill();});
    g.strokeStyle='#caa64a';g.lineWidth=3;g.strokeRect(2,2,CW-4,CH-4);
  });
  const st=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(BW,BT,BD),PM.fr4);body.position.y=BT/2;body.castShadow=true;body.receiveShadow=true;st.add(body);
  const top=new THREE.Mesh(FLAT(BW,BD),std(0xffffff,.42,.12,{map:tex}));top.position.y=BT+.01;top.receiveShadow=true;st.add(top);
  const lb=new THREE.Mesh(FLAT(30,10),PM.label);lb.position.set(-68,BT+.05,-86);st.add(lb);
  bucket.build(st);
  const pg=[];
  places.forEach(p=>{if(p.info.kind=='conn')return;const c=Math.cos(p.rot),s=Math.sin(p.rot),odd=Math.abs(s)>.5;
    p.pd.forEach(a=>{const x=p.x+a[0]*c+a[1]*s,z=p.z-a[0]*s+a[1]*c,w=(odd?a[3]:a[2])*.9,d=(odd?a[2]:a[3])*.9;const g=new THREE.BoxGeometry(w,.12,d);g.translate(x,BT+.07,z);pg.push(g);});});
  const pasteGeo=BGU.mergeBufferGeometries(pg,false);pg.forEach(g=>g.dispose());
  let tris=0;st.traverse(o=>{if(o.isMesh)tris+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});
  return{static:st,cands,places,pasteGeo,tris:Math.round(tris)};
})();

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

