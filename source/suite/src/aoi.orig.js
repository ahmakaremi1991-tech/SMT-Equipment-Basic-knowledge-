
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
controls.minDistance=45;controls.maxDistance=9000;controls.maxPolarAngle=PI*.495;

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
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-1500,right:1500,top:1500,bottom:-1500,near:500,far:6000});
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
  [[0,1250,3400,60],[0,-1250,3400,60]].forEach(a=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(a[2],a[3]),new THREE.MeshBasicMaterial({map:lt,transparent:true,opacity:.55}));m.rotation.x=-PI/2;m.position.set(a[0],1,a[1]);scene.add(m);});
  // soft contact shadow under the machine
  const st=canvasTex(256,256,(g,W,H)=>{const gr=g.createRadialGradient(W/2,H/2,W*.18,W/2,H/2,W*.5);gr.addColorStop(0,'rgba(0,0,0,.75)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);});
  const s=new THREE.Mesh(new THREE.PlaneGeometry(4300,2700),new THREE.MeshBasicMaterial({map:st,transparent:true,depthWrite:false}));
  s.rotation.x=-PI/2;s.position.y=2;scene.add(s);
})();

/* ===================================================================
   MACHINE
   =================================================================== */
const CONV_Y=900, LANE_Z=[170,-170], BW=250, BD=200, BT=1.6;
const machine=new THREE.Group();scene.add(machine);
const shellMats=[];
const sm=(c,r=.55,m=.05)=>{const x=std(c,r,m);shellMats.push(x);return x;};
const M={
  white:sm(0xe9ecef,.5,.05), white2:sm(0xdfe3e7,.55,.05), dark:sm(0x2b3038,.6,.2), blue:sm(0x1557b8,.45,.15),
  alu:std(0xb9c0c8,.35,.85), aluD:std(0x7d858f,.45,.8), steel:std(0xd5dadf,.22,.95), black:std(0x15171a,.55,.2),
  granite:std(0x1d2024,.6,.1), belt:null, rubber:std(0x1b1d20,.9,0), camBlue:std(0x1b4fb0,.35,.6),
  glassLens:std(0x0b1020,.05,.9), copper:std(0xb87333,.35,.9), red:std(0xc8202a,.5,.1)
};
const NOSH={cast:false};

/* --- lower cabinet (matches MV-9 photo: centre double door, blue logo panel above it) --- */
const BODY_Y0=110,SILL=790,FZ=620,BX0=-300,BX1=240,AX0=-455,AX1=425;
box(machine,BX0+625,SILL-BODY_Y0,1500,M.white,(BX0-625)/2,(SILL+BODY_Y0)/2,0,NOSH);
box(machine,625-BX1,SILL-BODY_Y0,1500,M.white,(BX1+625)/2,(SILL+BODY_Y0)/2,0,NOSH);
box(machine,BX1-BX0,SILL-BODY_Y0,1200,M.white,(BX0+BX1)/2,(SILL+BODY_Y0)/2,-150,NOSH);
box(machine,BX1-BX0,SILL-648,300,M.white,(BX0+BX1)/2,(SILL+648)/2,600,NOSH);
box(machine,BX1-BX0,16,300,M.white,(BX0+BX1)/2,BODY_Y0+8,600,NOSH);
box(machine,1200,40,1450,M.dark,0,BODY_Y0-18,0,NOSH);
[[-560,-680],[560,-680],[-560,680],[560,680]].forEach(p=>{cyl(machine,46,52,16,M.steel,p[0],8,p[1]);cyl(machine,13,13,100,M.steel,p[0],60,p[1]);cyl(machine,24,24,14,M.steel,p[0],88,p[1],{seg:6});
  cyl(machine,30,30,26,M.black,p[0]+(p[0]<0?90:-90),32,p[1],{rx:PI/2});});
box(machine,BX0+625,3,3,M.dark,(BX0-625)/2,700,751,NOSH);box(machine,625-BX1,3,3,M.dark,(BX1+625)/2,700,751,NOSH);
// electrical bay behind the doors
box(machine,BX1-BX0,522,4,M.black,(BX0+BX1)/2,387,453,NOSH);
box(machine,170,400,250,M.black,-195,326,600);cyl(machine,5,5,3,std(0x30ff70,.3,0,{emissive:0x30ff70,emissiveIntensity:2}),-150,480,726,{rx:PI/2,cast:false});
box(machine,150,8,6,M.aluD,-195,440,727,NOSH);box(machine,150,8,6,M.aluD,-195,400,727,NOSH);
box(machine,200,180,240,std(0x8d949c,.5,.5),110,216,600);box(machine,230,10,40,M.aluD,95,560,470,NOSH);
[0x2d7be0,0x2d7be0,0xe8a020,0xdde2e6,0xdde2e6,0x30a050].forEach((c,i)=>box(machine,30,70,50,std(c,.5),5+i*34,560,490,NOSH));
cyl(machine,22,22,90,M.alu,150,400,560);cyl(machine,30,30,8,M.black,150,450,560);
const doors=[];
[[BX0,1],[BX1,-1]].forEach(a=>{const g=new THREE.Group();g.position.set(a[0],0,750);machine.add(g);
  box(g,268,518,10,M.white2,a[1]*135,387,2,NOSH);box(g,30,104,7,M.black,a[1]*226,470,8,NOSH);box(g,16,80,5,std(0x30343a,.4,.3),a[1]*226,470,11,NOSH);
  doors.push({g,dir:a[1],open:0,target:0});});
// blue logo panel
(function(){const t=canvasTex(1080,280,(g,W,H)=>{g.fillStyle='#1b4db3';g.fillRect(0,0,W,H);g.textAlign='center';g.textBaseline='middle';
  g.fillStyle='#fff';g.font='900 118px "Arial Black",Arial,sans-serif';g.fillText('MV-9',W/2-20,96);g.fillRect(W/2-190,152,340,10);
  g.fillStyle='#ff5a2a';g.font='900 78px "Arial Black",Arial,sans-serif';g.fillText('MIRTEC',W/2-34,214);
  g.save();g.translate(W/2+160,208);for(let i=0;i<8;i++){g.rotate(PI/4);g.fillRect(-5,12,10,20);}g.restore();});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(BX1-BX0,140),std(0xffffff,.45,.1,{map:t}));m.position.set((BX0+BX1)/2,719,750.6);machine.add(m);})();
// side service panels + vents
const ventT=canvasTex(128,128,(g)=>{g.fillStyle='#d0d5da';g.fillRect(0,0,128,128);g.fillStyle='#2a2f36';for(let y=6;y<128;y+=12)g.fillRect(8,y,112,6);});
[-1,1].forEach(s=>{
  box(machine,5,430,900,M.white2,s*626,1270,-120,NOSH);box(machine,5,520,900,M.white2,s*626,440,-120,NOSH);
  [[1440,-480],[1440,240],[640,-480],[640,240]].forEach(q=>box(machine,6,34,22,M.black,s*629,q[0],q[1],NOSH));
  const v=new THREE.Mesh(new THREE.PlaneGeometry(150,150),std(0xffffff,.6,.1,{map:ventT}));v.position.set(s*629.5,330,150);v.rotation.y=s*PI/2;machine.add(v);});

/* --- upper enclosure --- */
box(machine,1250,810,22,M.white,0,1195,-739,NOSH);                           // rear wall
box(machine,AX0+625,810,22,M.white,(AX0-625)/2,1195,FZ-11,NOSH);             // left front column
box(machine,625-AX1,810,22,M.white,(AX1+625)/2,1195,FZ-11,NOSH);             // right front column
box(machine,AX0+625,22,FZ+750,M.white,(AX0-625)/2,1589,(FZ-750)/2,NOSH);     // roof strips
box(machine,625-AX1,22,FZ+750,M.white,(AX1+625)/2,1589,(FZ-750)/2,NOSH);
box(machine,AX1-AX0,22,700,M.white,(AX0+AX1)/2,1589,-400,NOSH);
box(machine,AX1-AX0,74,20,M.dark,(AX0+AX1)/2,827,FZ-10,NOSH);                // sill behind the bay
(function(){
  const sh=new THREE.Shape();sh.moveTo(-750,SILL);sh.lineTo(FZ,SILL);sh.lineTo(FZ,1600);sh.lineTo(-750,1600);sh.closePath();
  const ho=new THREE.Path();ho.moveTo(-310,868);ho.lineTo(310,868);ho.lineTo(310,965);ho.lineTo(-310,965);ho.closePath();sh.holes.push(ho);
  const g=new THREE.ExtrudeGeometry(sh,{depth:22,bevelEnabled:false});
  [-603,625].forEach(x=>{const m=new THREE.Mesh(g,M.white);m.rotation.y=-PI/2;m.position.x=x;machine.add(m);});
  [-1,1].forEach(s=>{box(machine,30,8,640,M.dark,s*628,968,0,NOSH);box(machine,30,8,640,M.dark,s*628,864,0,NOSH);box(machine,30,110,8,M.dark,s*628,916,314,NOSH);box(machine,30,110,8,M.dark,s*628,916,-314,NOSH);});
})();
// operator controls on the right column (E-stop, lamp, main power switch)
(function(){const x=(AX1+625)/2,z=FZ;
  box(machine,120,290,5,M.white2,x,1330,z+2,NOSH);
  box(machine,96,96,4,std(0xf2c400,.5),x,1420,z+5,NOSH);cyl(machine,30,24,30,M.red,x,1420,z+22,{rx:PI/2,cast:false});
  cyl(machine,15,15,12,std(0x21b354,.4,.1,{emissive:0x0c8a3c,emissiveIntensity:.8}),x,1335,z+8,{rx:PI/2,cast:false});
  box(machine,74,84,6,std(0xf4f4f4,.5),x,1245,z+5,NOSH);cyl(machine,24,24,14,M.black,x,1245,z+12,{rx:PI/2,cast:false});box(machine,10,44,14,M.black,x,1245,z+20,NOSH);})();

/* --- hood: silver bay with dark window + roof panel, hinged at the back, lifts up --- */
const hoodPivot=new THREE.Group();hoodPivot.position.set(0,1600,-50);machine.add(hoodPivot);
const glassMat=new THREE.MeshStandardMaterial({color:0x0a1420,roughness:.06,metalness:.4,transparent:true,opacity:.74,depthWrite:false,side:THREE.DoubleSide});
(function(){
  const silver=new THREE.MeshStandardMaterial({color:0x5d636a,roughness:.5,metalness:.3,envMapIntensity:.5,side:THREE.DoubleSide});shellMats.push(silver);
  const off=new THREE.Group();off.position.set(0,-1600,50);hoodPivot.add(off);        // children use machine coordinates
  box(off,AX1-AX0,20,FZ+50,M.white,(AX0+AX1)/2,1590,(FZ-50)/2,NOSH);                  // roof panel
  const YC=885,v=[];
  const quad=(a,b,c,d)=>{v.push(...a,...b,...c,...a,...c,...d);};
  quad([AX0,YC,FZ],[BX0,YC,750],[BX0,1600,750],[AX0,1600,FZ]);                         // angled side faces
  quad([AX1,YC,FZ],[BX1,YC,750],[BX1,1600,750],[AX1,1600,FZ]);
  quad([AX0,YC,FZ],[BX0,YC,750],[BX0,SILL,750],[BX0,SILL,FZ]);                         // lower chamfers
  quad([AX1,YC,FZ],[BX1,YC,750],[BX1,SILL,750],[BX1,SILL,FZ]);
  quad([AX0,1600,FZ],[BX0,1600,750],[BX1,1600,750],[AX1,1600,FZ]);                     // top cap
  const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(v,3));bg.computeVertexNormals();
  off.add(new THREE.Mesh(bg,silver));
  const win=()=>{const p=new THREE.Path();p.moveTo(BX0+30,1000);p.lineTo(BX0+95,935);p.lineTo(BX1-95,935);p.lineTo(BX1-30,1000);p.lineTo(BX1-30,1572);p.lineTo(BX0+30,1572);p.closePath();return p;};
  const fs=new THREE.Shape();fs.moveTo(BX0,SILL);fs.lineTo(BX1,SILL);fs.lineTo(BX1,1600);fs.lineTo(BX0,1600);fs.closePath();fs.holes.push(win());
  const ff=new THREE.Mesh(new THREE.ExtrudeGeometry(fs,{depth:12,bevelEnabled:false}),silver);ff.position.z=738;off.add(ff);
  const ws=new THREE.Shape(win().getPoints());const gl=new THREE.Mesh(new THREE.ShapeGeometry(ws),glassMat);gl.position.z=744;gl.renderOrder=5;off.add(gl);
  box(off,300,14,14,M.steel,(BX0+BX1)/2,858,772,NOSH);box(off,14,14,24,M.steel,(BX0+BX1)/2-143,858,760,NOSH);box(off,14,14,24,M.steel,(BX0+BX1)/2+143,858,760,NOSH); // handle
})();
const hood={open:0,target:0};

/* --- signal tower (red / amber / green, top to bottom) --- */
const tower={};
(function(){
  const g=new THREE.Group();g.position.set(520,1600,-260);machine.add(g);
  cyl(g,9,9,190,M.steel,0,95,0);cyl(g,22,26,14,M.black,0,7,0);
  [['r',0xff2a2a,270],['y',0xffa800,230],['g',0x22e06a,190]].forEach(a=>{const mt=new THREE.MeshStandardMaterial({color:a[1],emissive:a[1],emissiveIntensity:.05,roughness:.3,transparent:true,opacity:.92});tower[a[0]]=mt;cyl(g,24,24,38,mt,0,a[2]+19,0);});
  cyl(g,25,25,8,M.dark,0,312,0);
})();

/* --- operator monitor + keyboard on the left-hand arm --- */
let monTex,monCtx;
(function(){
  const g=new THREE.Group();g.position.set(-540,0,FZ);machine.add(g);
  box(g,60,380,40,M.white2,0,1180,20);box(g,40,40,190,M.white2,0,1330,115);box(g,40,40,150,M.white2,0,1040,95);
  const m=new THREE.Group();m.position.set(-150,1340,215);m.rotation.y=.16;g.add(m);
  box(m,730,440,34,std(0xc8ccd0,.4,.5),0,0,0);box(m,120,120,40,M.dark,0,0,-30);
  const c=document.createElement('canvas');c.width=640;c.height=400;monCtx=c.getContext('2d');
  monTex=new THREE.CanvasTexture(c);monTex.encoding=THREE.sRGBEncoding;monTex.anisotropy=8;
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(690,400),new THREE.MeshBasicMaterial({map:monTex,toneMapped:false}));scr.position.set(0,0,18);m.add(scr);
  const k=new THREE.Group();k.position.set(-150,1030,250);k.rotation.y=.16;g.add(k);
  box(k,520,14,210,std(0xe6e8ea,.5),0,0,0);box(k,360,12,120,std(0xf2f3f4,.6),-50,13,-10);box(k,56,22,90,std(0xf2f3f4,.5),190,17,0);
})();

/* --- neighbours in the line (upstream / downstream stubs) --- */
[-1,1].forEach(s=>{
  const m=std(0x262c35,.75,.1);
  box(scene,640,1000,800,m,s*1185,500,0,NOSH);
  box(scene,4,100,620,M.black,s*864,916,0,NOSH);
  label(scene,s<0?'▶  FROM PLACEMENT':'TO REFLOW  ▶',520,70,s*1185,1001,300,{rx:-PI/2,fg:'#9fb4cf',pw:800,size:.5});
});

/* --- interior: bed, lighting --- */
const interior=new THREE.Group();machine.add(interior);
box(interior,1200,24,1340,M.granite,0,852,-65);box(interior,1200,50,1340,M.dark,0,815,-65,NOSH);
const inLight=new THREE.PointLight(0xdfeaff,.9,1900,1);inLight.position.set(0,1500,-150);interior.add(inLight);
box(interior,900,10,30,new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xcfe2ff,emissiveIntensity:.9}),0,1540,-720,NOSH);

/* --- conveyors (two lanes) --- */
const beltTexBase=canvasTex(64,16,(g)=>{g.fillStyle='#1c1e21';g.fillRect(0,0,64,16);g.fillStyle='#2c3035';for(let x=0;x<64;x+=16)g.fillRect(x,0,6,16);},{repeat:true});
const lanes=LANE_Z.map((z,i)=>{
  const L={i,z,state:'—',board:null,moving:0,g:new THREE.Group()};
  L.beltTex=beltTexBase.clone();L.beltTex.needsUpdate=true;L.beltTex.repeat.set(86,1);
  const bm=std(0xffffff,.9,0,{map:L.beltTex});
  const g=L.g;interior.add(g);
  [-1,1].forEach(s=>{
    const rz=z+s*(BD/2+7);
    box(g,1720,46,12,M.alu,0,CONV_Y-17,rz);                         // rail
    box(g,1720,6,5,M.aluD,0,CONV_Y+9,rz-s*3.5,NOSH);                // top guide lip
    box(g,1720,3,6,bm,0,CONV_Y-1.5,z+s*(BD/2-2.5),NOSH);            // belt
    [-520,-260,0,260,520].forEach(x=>box(g,30,30,14,M.aluD,x,865+7,rz)); // feet
    [-790,790].forEach(x=>cyl(g,9,9,14,M.black,x,CONV_Y-9,rz-s*8,{rx:PI/2,cast:false}));
    box(g,60,34,16,M.black,-845,CONV_Y-17,rz+s*14,NOSH);            // belt motor
  });
  // width-adjust lead screws
  [-420,420].forEach(x=>cyl(g,6,6,BD+40,M.steel,x,CONV_Y-30,z,{rx:PI/2,seg:10}));
  // board stopper + sensor
  L.stop=cyl(g,5,5,16,M.steel,BW/2+7,CONV_Y-12,z,{seg:12});
  box(g,14,10,10,std(0xff8a00,.5),BW/2+30,CONV_Y-22,z+BD/2-6,NOSH);
  // support plate under the board
  box(g,BW+20,6,BD-30,M.aluD,0,CONV_Y-30,z);
  for(let ix=-2;ix<=2;ix++)for(let iz=-1;iz<=1;iz++)cyl(g,3,3,26,M.steel,ix*50,CONV_Y-14,z+iz*60,{seg:8,cast:false});
  label(g,'LANE '+(i+1),90,22,-560,CONV_Y+13,z+BD/2+7+ (i?-22:22),{rx:-PI/2,fg:'#4fd1ff',pw:300,size:.7});
  return L;
});

/* --- XY linear-motor gantry --- */
const gantry={x:0,z:0};
const magT=canvasTex(256,16,(g)=>{for(let x=0;x<256;x+=16){g.fillStyle=(x/16)%2?'#8b6a2a':'#59431b';g.fillRect(x,0,16,16);}},{repeat:true});
(function(){
  [-1,1].forEach(s=>{
    [-640,350].forEach(z=>box(interior,70,330,70,M.aluD,s*540,864+165,z));
    box(interior,84,70,1100,M.alu,s*540,1229,-145);
    const mt=magT.clone();mt.needsUpdate=true;mt.rotation=PI/2;mt.repeat.set(20,1);
    box(interior,40,4,1060,std(0xffffff,.4,.6,{map:mt}),s*540,1266,-145,NOSH);
    box(interior,12,10,1060,M.steel,s*540-s*30,1268,-145,NOSH);
  });
})();
const beam=new THREE.Group();interior.add(beam);
box(beam,1160,110,96,M.alu,0,1325,0);
box(beam,110,40,150,M.aluD,-540,1290,0);box(beam,110,40,150,M.aluD,540,1290,0);
(function(){const mt=magT.clone();mt.needsUpdate=true;mt.repeat.set(22,1);box(beam,1000,40,4,std(0xffffff,.4,.6,{map:mt}),0,1325,50,NOSH);
  box(beam,1000,10,8,M.steel,0,1368,50,NOSH);box(beam,1000,10,8,M.steel,0,1282,50,NOSH);
  box(beam,1100,26,60,M.black,0,1394,-10,NOSH);})(); // cable chain

/* --- optical head --- */
const head=new THREE.Group();interior.add(head);
const rings=[],projLens=[],projBeams=[];
let flashSpot,glowSprite,fovGlow,fovStripe,stripeTex;
const FOV_W=58.56,FOV_D=58.56;
(function(){
  const h=head;
  box(h,200,150,34,M.aluD,0,1325,-68);                               // carriage on the beam
  box(h,180,330,18,M.alu,0,1215,-58);                                // Z plate
  box(h,70,12,60,M.alu,0,1290,-25);box(h,70,12,60,M.alu,0,1150,-25); // camera brackets
  // top camera
  box(h,66,84,66,M.camBlue,0,1280,0);
  cyl(h,10,10,26,M.black,16,1335,-10,{seg:12});
  label(h,'15MP',44,16,0,1290,33.5,{fg:'#fff',pw:256});
  cyl(h,24,24,110,M.black,0,1185,0);cyl(h,27,27,14,M.aluD,0,1215,0);
  cyl(h,33,30,70,M.black,0,1095,0);cyl(h,34,34,8,M.aluD,0,1128,0);
  // light dome
  const dome=new THREE.Mesh(new THREE.CylinderGeometry(42,118,92,48,1,true),new THREE.MeshStandardMaterial({color:0x121316,roughness:.55,metalness:.2,envMapIntensity:.3,side:THREE.DoubleSide}));
  dome.position.y=978;dome.castShadow=true;h.add(dome);
  cyl(h,46,46,10,M.aluD,0,1028,0,{open:false});
  const ringDef=[[1014,50,0xffffff],[996,66,0xff3030],[972,86,0x30ff60],[948,104,0x3a70ff]];
  ringDef.forEach(r=>{const mt=new THREE.MeshStandardMaterial({color:0x222222,emissive:r[2],emissiveIntensity:.04,roughness:.4});const t=new THREE.Mesh(new THREE.TorusGeometry(r[1],4.5,8,48),mt);t.rotation.x=PI/2;t.position.y=r[0];h.add(t);rings.push(mt);});
  // carrier ring for side cameras and projectors
  const cr=new THREE.Mesh(new THREE.TorusGeometry(150,7,8,48),M.aluD);cr.rotation.x=PI/2;cr.position.y=1100;cr.castShadow=true;h.add(cr);
  for(let k=0;k<4;k++){const a=k*PI/2+PI/4;box(h,110,10,16,M.aluD,Math.cos(a)*95,1100,Math.sin(a)*95,{ry:-a});}
  // 4 side-view cameras (diagonals)
  for(let k=0;k<4;k++){
    const a=k*PI/2+PI/4,g=new THREE.Group();g.position.set(Math.cos(a)*150,1062,Math.sin(a)*150);h.add(g);g.lookAt(new THREE.Vector3(0,902,0));
    box(g,36,36,52,M.camBlue,0,0,-30);cyl(g,12,12,40,M.black,0,0,16,{rx:PI/2,seg:16});cyl(g,9,9,2,M.glassLens,0,0,37,{rx:PI/2,seg:16,cast:false});
  }
  // 4 moire projectors (N/E/S/W)
  for(let k=0;k<4;k++){
    const a=k*PI/2,px=Math.cos(a)*158,pz=Math.sin(a)*158,g=new THREE.Group();g.position.set(px,1082,pz);h.add(g);g.lookAt(new THREE.Vector3(0,902,0));
    box(g,46,46,78,std(0x4a5058,.4,.7),0,0,-42);cyl(g,16,16,34,M.black,0,0,12,{rx:PI/2,seg:16});
    const lm=new THREE.MeshStandardMaterial({color:0x101828,emissive:0x9fd0ff,emissiveIntensity:0,roughness:.1});
    cyl(g,12,12,2,lm,0,0,30,{rx:PI/2,seg:16,cast:false});projLens.push(lm);
    box(g,14,14,10,M.copper,0,26,-60,NOSH);
    // projection frustum (apex at lens, base on the FOV)
    const ap=new THREE.Vector3(px,1082,pz).lerp(new THREE.Vector3(0,902,0),.13),y=CONV_Y+BT+.4,hw=FOV_W/2,hd=FOV_D/2;
    const c=[[-hw,y,-hd],[hw,y,-hd],[hw,y,hd],[-hw,y,hd]],v=[];
    for(let i=0;i<4;i++){const p=c[i],q=c[(i+1)%4];v.push(ap.x,ap.y,ap.z,p[0],p[1],p[2],q[0],q[1],q[2]);}
    const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
    const bm=new THREE.Mesh(bg,new THREE.MeshBasicMaterial({color:0x9fd0ff,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    bm.layers.set(1);bm.visible=false;h.add(bm);projBeams.push(bm);
  }
  // strobe light
  flashSpot=new THREE.SpotLight(0xffffff,0,700,.42,.55,1);flashSpot.position.set(0,1040,0);
  const tg=new THREE.Object3D();tg.position.set(0,900,0);h.add(tg);flashSpot.target=tg;h.add(flashSpot);
  const gt=canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,4,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});
  glowSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:gt,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
  glowSprite.scale.set(420,420,1);glowSprite.position.set(0,930,0);glowSprite.layers.set(1);h.add(glowSprite);
  // FOV illumination + fringe pattern on the board
  const pg=new THREE.PlaneGeometry(FOV_W,FOV_D);pg.rotateX(-PI/2);
  fovGlow=new THREE.Mesh(pg,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
  fovGlow.position.y=CONV_Y+BT+.3;fovGlow.layers.set(1);h.add(fovGlow);
  stripeTex=canvasTex(64,8,(g)=>{for(let x=0;x<64;x++){const v=Math.round(127+127*Math.sin(x/64*2*PI));g.fillStyle='rgb('+v+','+v+','+v+')';g.fillRect(x,0,1,8);}},{repeat:true});
  stripeTex.encoding=THREE.LinearEncoding;stripeTex.center.set(.5,.5);stripeTex.repeat.set(7,1);
  fovStripe=new THREE.Mesh(pg,new THREE.MeshBasicMaterial({map:stripeTex,color:0xbfe0ff,transparent:true,opacity:.42,blending:THREE.AdditiveBlending,depthWrite:false}));
  fovStripe.position.y=CONV_Y+BT+.35;fovStripe.layers.set(2);fovStripe.visible=false;h.add(fovStripe);
  // FOV outline
  const fr=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-1,-1],[1,-1],[1,1],[-1,1]].map(p=>new THREE.Vector3(p[0]*FOV_W/2,CONV_Y+BT+.5,p[1]*FOV_D/2))),new THREE.LineBasicMaterial({color:0x4fd1ff,transparent:true,opacity:.9}));
  fr.layers.set(1);h.add(fr);head.userData.frame=fr;
})();

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
    if(o.cand){const g=new THREE.Group(),b=new Bucket();ls.forEach(a=>b.add(a[0],a[1],a[2]));b.build(g);g.position.set(x,BT,z);g.rotation.order='YXZ';g.rotation.y=rot;cands.push({name,kind:info.kind,len:info.len||0,group:g,x,z,rot,w:info.w,d:info.d,h:info.h});}
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
  let tris=0;st.traverse(o=>{if(o.isMesh)tris+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});
  return{static:st,cands,places,tris:Math.round(tris)};
})();

/* ===================================================================
   RUNTIME — boards, inspection sequence, effects, UI
   =================================================================== */
const DEF={chip:['MISSING','SHIFT','TOMBSTONE','ROTATED'],ic:['SHIFT','MISSING','LIFTED LEAD'],ecap:['POLARITY','MISSING'],tant:['POLARITY','SHIFT'],led:['MISSING','POLARITY']};
const NC=5,NR=4,SX=(BW-FOV_W)/(NC-1),SZ=(BD-FOV_D)/(NR-1),FOVS=[];for(let r=0;r<NR;r++)for(let c=0;c<NC;c++){const cc=r%2?NC-1-c:c;FOVS.push({x:-BW/2+FOV_W/2+cc*SX,z:-BD/2+FOV_D/2+r*SZ,c:cc,r});}
const redMat=new THREE.MeshBasicMaterial({color:0xff2030,toneMapped:false});
const tileOk=new THREE.MeshBasicMaterial({color:0x30ff80,transparent:true,opacity:.13,depthWrite:false});
const tileNg=new THREE.MeshBasicMaterial({color:0xff3040,transparent:true,opacity:.2,depthWrite:false});
let serial=4200;
function makeBoard(L,x){
  const g=new THREE.Group();
  board.static.children.forEach(m=>{const c=new THREE.Mesh(m.geometry,m.material);c.position.copy(m.position);c.receiveShadow=true;c.castShadow=m.castShadow;g.add(c);});
  const b={g,lane:L,x,defects:[],done:false,clamped:false,sn:++serial,ng:false};
  const R=Math.random,r=R(),nd=r<.6?0:(r<.9?1:2),idx=[];
  while(idx.length<nd){const k=Math.floor(R()*board.cands.length);if(!idx.includes(k))idx.push(k);}
  board.cands.forEach((c,k)=>{
    const o=c.group.clone();
    if(idx.includes(k)){const dl=DEF[c.kind],t=dl[Math.floor(R()*dl.length)];
      if(t=='MISSING')o.visible=false;
      else if(t=='SHIFT'){const s=Math.min(1.6,Math.max(.45,.3*Math.min(c.w,c.d)));o.position.x+=s*(R()<.5?-1:1);o.position.z+=s*.7;o.rotation.y+=.2;}
      else if(t=='TOMBSTONE'){o.rotation.z=1.05;o.position.y+=c.len/2*Math.sin(1.05)-.05;}
      else if(t=='ROTATED')o.rotation.y+=.62;
      else if(t=='POLARITY')o.rotation.y+=PI;
      else if(t=='LIFTED LEAD'){o.rotation.x=.1;o.position.y+=.32;}
      b.defects.push({name:c.name,type:t,x:c.x,z:c.z,s:Math.max(c.w,c.d)+2.2,h:c.h,found:false});}
    g.add(o);});
  g.position.set(x,CONV_Y,L.z);interior.add(g);return b;
}
function addMarker(b,d){
  const s=d.s,t=Math.max(.35,s*.06),y=BT+Math.min(d.h,3)+.6,g=new THREE.Group();
  [[0,-s/2,s+t,t],[0,s/2,s+t,t],[-s/2,0,t,s],[s/2,0,t,s]].forEach(a=>{const m=new THREE.Mesh(new THREE.BoxGeometry(a[2],.25,a[3]),redMat);m.position.set(a[0],0,a[1]);m.layers.set(1);g.add(m);});
  g.position.set(d.x,y,d.z);b.g.add(g);d.marker=g;
}
function addTile(b,f,ng){const m=new THREE.Mesh(FLAT(+(SX-1).toFixed(2),+(SZ-1).toFixed(2)),ng?tileNg:tileOk);m.position.set(f.x,BT+.22,f.z);m.layers.set(1);b.g.add(m);}

/* ---------- tiny coroutine scheduler ---------- */
const FRAME=-1,cos=[];
class Co{constructor(g){this.g=g;this.wait=0;this.done=false;}
  step(dt){if(this.done)return;this.wait-=dt;let pass=dt,guard=0;
    while(this.wait<=0&&guard++<64){const r=this.g.next(pass);pass=0;if(r.done){this.done=true;return;}if(r.value===FRAME){this.wait=1e-9;return;}this.wait+=r.value;}}}
function run(g){const c=new Co(g);cos.push(c);return c;}

/* ---------- state ---------- */
const stats={ins:0,ok:0,ng:0,ct:0};
const cur={lane:null,sn:0,fov:0,tiles:new Array(FOVS.length).fill(0),active:-1,result:'',defs:[]};
const fx={color:new THREE.Color(1,1,1),ring:-1,moire:-1,power:0,label:'—'};
let simTime=0,speed=1,paused=false,headState='IDLE',lastNgAt=-99;
const logEl=$('log');
function addLog(t,cls){const d=document.createElement('div');d.textContent=t;if(cls)d.className=cls;logEl.prepend(d);while(logEl.children.length>8)logEl.lastChild.remove();}
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

const BELT_V=330;
function* conveyTo(b,x,L){L.moving++;while(b.x<x){const dt=yield FRAME;b.x=Math.min(x,b.x+BELT_V*dt);b.g.position.x=b.x;}L.moving--;}
function* exitScript(b,L){yield* conveyTo(b,1160,L);interior.remove(b.g);}
function* laneScript(L,delay){
  yield delay;
  let b=makeBoard(L,-1160);
  while(true){
    L.state='LOADING';L.stopUp=true;
    yield* conveyTo(b,0,L);
    L.state='CLAMPING';yield .35;b.clamped=true;L.board=b;L.state='WAITING';
    const nb=makeBoard(L,-1160),pre=run(conveyTo(nb,-770,L));
    while(!b.done)yield FRAME;
    L.board=null;L.state=b.ng?'UNLOAD · NG':'UNLOAD · OK';L.stopUp=false;yield .3;
    run(exitScript(b,L));
    while(b.x<330||!pre.done)yield FRAME;
    b=nb;
  }
}
function* moveHead(x,z){
  const x0=gantry.x,z0=gantry.z,d=Math.hypot(x-x0,z-z0),T=Math.max(.1,d/1100+.07);let t=0;
  while(t<T){t+=yield FRAME;const k=ease(Math.min(1,t/T));gantry.x=x0+(x-x0)*k;gantry.z=z0+(z-z0)*k;}
}
const PH2D=[['WHITE COAX',0xffffff,0],['RED RING',0xff4a4a,1],['GREEN RING',0x4aff7a,2],['BLUE RING',0x5a8aff,3],['SIDE CAMS ×4',0xfff0cc,9]];
function* capture(){
  for(const p of PH2D){fx.label='2D · '+p[0];fx.color.setHex(p[1]);fx.ring=p[2];fx.moire=-1;fx.power=1;yield .05;fx.power=0;yield .018;}
  for(let k=0;k<4;k++){fx.label='3D MOIRÉ · '+(k*90)+'°';fx.color.setHex(0xbfe0ff);fx.ring=-1;fx.moire=k;fx.power=.5;yield .1;}
  fx.moire=-1;fx.power=0;fx.label='ANALYSING';
}
function* inspect(L,b){
  const t0=simTime;headState='ALIGN';L.state='INSPECTING';
  Object.assign(cur,{lane:L,sn:b.sn,fov:0,active:-1,result:'',defs:[]});cur.tiles.fill(0);
  for(const f of FIDS.slice(0,2)){yield* moveHead(f.x,L.z+f.z);fx.label='FIDUCIAL MARK';fx.color.setHex(0xffffff);fx.ring=0;fx.power=1;yield .09;fx.power=0;yield .05;}
  headState='SCAN';
  for(let i=0;i<FOVS.length;i++){
    const f=FOVS[i];cur.active=i;
    yield* moveHead(f.x,L.z+f.z);yield .025;
    yield* capture();
    let ng=false;
    b.defects.forEach(d=>{if(!d.found&&Math.abs(d.x-f.x)<=FOV_W/2&&Math.abs(d.z-f.z)<=FOV_D/2){d.found=true;ng=true;addMarker(b,d);cur.defs.push(d.name+' '+d.type);addLog('L'+(L.i+1)+' #'+b.sn+'  '+d.name+'  '+d.type,'ng');lastNgAt=simTime;}});
    addTile(b,f,ng);cur.tiles[i]=ng?2:1;cur.fov=i+1;
  }
  cur.active=-1;fx.label='—';
  b.ng=b.defects.length>0;b.done=true;
  stats.ins++;b.ng?stats.ng++:stats.ok++;stats.ct=simTime-t0;cur.result=b.ng?'NG':'OK';
  if(!b.ng)addLog('L'+(L.i+1)+' #'+b.sn+'  PASS  '+stats.ct.toFixed(1)+' s','ok');
}
function* headScript(){
  let turn=0;
  while(true){
    let L=null;
    for(let i=0;i<2;i++){const c=lanes[(turn+i)%2];if(c.board&&c.board.clamped&&!c.board.done){L=c;turn=(turn+i+1)%2;break;}}
    if(!L){headState='IDLE';yield FRAME;continue;}
    yield* inspect(L,L.board);
  }
}
run(laneScript(lanes[0],.2));run(laneScript(lanes[1],7));run(headScript());

/* ---------- inset cameras (what the AOI "sees") ---------- */
const insetCam=new THREE.OrthographicCamera(-FOV_W/2*255/253,FOV_W/2*255/253,FOV_D/2,-FOV_D/2,.5,70);
insetCam.up.set(0,0,-1);insetCam.layers.enable(2);
const insetCamH=insetCam.clone();insetCamH.layers.set(0);
const heightMat=new THREE.ShaderMaterial({
  uniforms:{base:{value:CONV_Y+BT},range:{value:6}},
  vertexShader:'varying float vh;varying vec3 vn;void main(){vec4 w=modelMatrix*vec4(position,1.);vh=w.y;vn=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader:'uniform float base;uniform float range;varying float vh;varying vec3 vn;\nvec3 jet(float t){return clamp(vec3(1.5-abs(4.*t-3.),1.5-abs(4.*t-2.),1.5-abs(4.*t-1.)),0.,1.);}\nvoid main(){float t=clamp((vh-base)/range,0.,1.);t=pow(t,.55);vec3 c=mix(vec3(.02,.05,.35),jet(t),step(.001,t));float s=.7+.3*abs(normalize(vn).y);gl_FragColor=vec4(c*s,1.);}'
});

/* ---------- labels ---------- */
const tags=[];
function tag(text,obj,x,y,z){const el=document.createElement('div');el.className='tag';el.textContent=text;$('tags').appendChild(el);tags.push({el,obj,v:new THREE.Vector3(x,y,z)});}
tag('15 MP top camera + telecentric lens',head,0,1322,0);
tag('Moiré 3D projector (×4)',head,158,1100,0);
tag('Side-view camera (×4)',head,-106,1085,106);
tag('Multi-colour LED light dome',head,0,960,118);
tag('Linear-motor X beam',beam,-380,1380,0);
tag('Lane 1 — front',interior,-720,925,170);
tag('Lane 2 — rear',interior,-720,925,-170);
tag('Lift-up hood — click to open',machine,-30,1500,760);tag('Electrical bay — click doors',machine,-30,560,760);tag('Operator monitor',machine,-700,1590,840);
tag('Signal tower',machine,520,1930,-260);
let showTags=false;

/* ---------- UI ---------- */
let follow=false,tween=null;const lastHead=new THREE.Vector3();
function flyTo(p,t,dur=1.2){tween={p0:camera.position.clone(),t0:controls.target.clone(),p1:new THREE.Vector3(...p),t1:new THREE.Vector3(...t),t:0,dur};}
function setHood(o){hood.target=o?1:0;$('bHood').textContent=o?'Close hood':'Open hood';$('bHood').classList.toggle('on',!!o);}
const views={
  over:()=>{follow=false;flyTo([2450,1950,3300],[0,880,0]);},
  inside:()=>{follow=false;setHood(1);flyTo([260,1900,1850],[0,930,40]);},
  follow:()=>{setHood(1);const t=[gantry.x,935,gantry.z];flyTo([t[0]+330,t[1]+330,t[2]+560],t,.9);follow='pending';},
  board:()=>{follow=false;const z=LANE_Z[0];flyTo([-10,1010,z+215],[-45,902,z+15]);},
  top:()=>{follow=false;setHood(1);flyTo([0,3900,5],[0,900,0]);}
};
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-v]').forEach(x=>x.classList.remove('on'));b.classList.add('on');views[b.dataset.v]();});
document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-s]').forEach(x=>x.classList.remove('on'));b.classList.add('on');speed=+b.dataset.s;});
$('bHood').onclick=()=>setHood(!hood.target);
let xray=false;
$('bXray').onclick=()=>{xray=!xray;$('bXray').classList.toggle('on',xray);shellMats.forEach(m=>{m.transparent=xray;m.opacity=xray?.1:1;m.depthWrite=!xray;m.needsUpdate=true;});glassMat.opacity=xray?.12:.74;};
$('bLab').onclick=()=>{showTags=!showTags;$('bLab').classList.toggle('on',showTags);if(!showTags)tags.forEach(t=>t.el.style.display='none');};
$('bPause').onclick=()=>{paused=!paused;$('bPause').textContent=paused?'Resume':'Pause';$('bPause').classList.toggle('on',paused);};
$('specBtn').onclick=()=>{const s=$('spec'),o=s.style.display!='block';s.style.display=o?'block':'none';$('specBtn').textContent=(o?'▾':'▸')+' Machine specifications';};
controls.addEventListener('start',()=>{tween=null;});
/* click the hood / doors directly */
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let downAt=null;
function hitPart(e){mouse.set(e.clientX/window.innerWidth*2-1,-(e.clientY/window.innerHeight)*2+1);ray.setFromCamera(mouse,camera);
  const h=ray.intersectObjects([hoodPivot,doors[0].g,doors[1].g],true)[0];if(!h)return null;
  for(let o=h.object;o;o=o.parent){if(o===hoodPivot)return'hood';if(o===doors[0].g)return 0;if(o===doors[1].g)return 1;}return null;}
canvas.addEventListener('pointerdown',e=>{downAt=[e.clientX,e.clientY];});
canvas.addEventListener('pointerup',e=>{if(!downAt||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>5)return;const h=hitPart(e);if(h==='hood')setHood(!hood.target);else if(h!==null)doors[h].target=doors[h].target?0:1;});
canvas.addEventListener('pointermove',e=>{if(e.buttons)return;canvas.style.cursor=hitPart(e)!==null?'pointer':'';});

function pill(el,t){el.textContent=t;el.className='pill '+(/· NG/.test(t)?'ng':/· OK/.test(t)?'ok':/—|IDLE|WAITING/.test(t)?'idle':'');}
function updateHud(){
  pill($('hState'),headState);$('phase').textContent=fx.label;
  $('fov').textContent=cur.fov+' / '+FOVS.length+(cur.lane?'  · L'+(cur.lane.i+1):'');$('fovBar').style.width=(cur.fov/FOVS.length*100)+'%';
  pill($('l1'),lanes[0].state);pill($('l2'),lanes[1].state);
  $('nIns').textContent=stats.ins;$('nOk').textContent=stats.ok;$('nNg').textContent=stats.ng;
  $('yld').textContent=stats.ins?(stats.ok/stats.ins*100).toFixed(0)+' %':'—';
  $('ct').textContent=stats.ct?stats.ct.toFixed(1)+' s':'—';
  $('insL').textContent=fx.power>0||fx.moire>=0?fx.label:'LIVE';$('insR').textContent=fx.moire>=0?'ACQUIRING':'Z 0 – 6 mm';
  $('rec').style.opacity=(fx.power>0)?1:.25;
}
function drawMon(){
  const g=monCtx,W=640,H=400;g.fillStyle='#0b1220';g.fillRect(0,0,W,H);
  g.fillStyle='#1557b8';g.fillRect(0,0,W,40);g.fillStyle='#fff';g.font='700 20px Arial';g.textAlign='left';g.textBaseline='middle';g.fillText('MIRTEC  MV-9DL  ·  3D AOI',14,21);
  g.font='500 14px Arial';g.textAlign='right';g.fillText(paused?'PAUSED':'AUTO RUN',W-14,21);g.textAlign='left';
  const mx=18,my=58,mw=350,mh=280;g.fillStyle='#0f5a31';g.fillRect(mx,my,mw,mh);
  FOVS.forEach((f,i)=>{const x=mx+f.c*mw/NC,y=my+f.r*mh/NR,s=cur.tiles[i];
    if(s){g.fillStyle=s==2?'rgba(255,60,70,.55)':'rgba(60,230,130,.35)';g.fillRect(x+2,y+2,mw/NC-4,mh/NR-4);}
    g.strokeStyle=i==cur.active?'#fff':'rgba(255,255,255,.25)';g.lineWidth=i==cur.active?3:1;g.strokeRect(x+2,y+2,mw/NC-4,mh/NR-4);});
  g.fillStyle='#8fa3bd';g.font='500 14px Arial';g.fillText('LANE',390,70);g.fillText('BOARD S/N',390,112);g.fillText('FOV',390,154);g.fillText('RESULT',390,196);
  g.fillStyle='#fff';g.font='700 20px Arial';g.fillText(cur.lane?String(cur.lane.i+1):'—',390,92);g.fillText(cur.sn?'#'+cur.sn:'—',390,134);g.fillText(cur.fov+' / '+FOVS.length,390,176);
  if(cur.result){g.fillStyle=cur.result=='OK'?'#3ddc84':'#ff4d5a';g.font='900 54px Arial';g.fillText(cur.result,390,238);}
  g.font='500 13px Consolas,monospace';g.fillStyle='#ff9aa2';cur.defs.slice(0,4).forEach((d,i)=>g.fillText(d,390,280+i*17));
  g.fillStyle='#8fa3bd';g.font='500 14px Arial';g.fillText('INSPECTED '+stats.ins+'    PASS '+stats.ok+'    NG '+stats.ng+'    '+fx.label,18,372);
  monTex.needsUpdate=true;
}

/* ---------- main loop ---------- */
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();
renderer.shadowMap.autoUpdate=false;
const clock=new THREE.Clock();let hudT=0,monT=0;const _p=new THREE.Vector3();
function frame(){
  requestAnimationFrame(frame);
  const rdt=Math.min(clock.getDelta(),.05),dt=paused?0:(window.__step!==undefined?window.__step:rdt*speed);
  if(dt>0){simTime+=dt;
    // sub-step so strobe phases stay distinct at high speed
    const n=Math.max(1,Math.ceil(dt/.02));for(let i=0;i<n;i++){for(let k=0;k<cos.length;k++)cos[k].step(dt/n);}
    for(let k=cos.length-1;k>=0;k--)if(cos[k].done)cos.splice(k,1);
    lanes.forEach(L=>{if(L.moving>0)L.beltTex.offset.x-=dt*BELT_V/20;const ty=L.stopUp?CONV_Y+3:CONV_Y-12;L.stop.position.y+=(ty-L.stop.position.y)*Math.min(1,dt*14);});
    if(fx.moire>=0)stripeTex.offset.x+=dt*7;
  }
  // gantry pose
  head.position.set(gantry.x,0,gantry.z);beam.position.z=gantry.z-133;
  // strobe / fringe effects
  const p=fx.power;
  flashSpot.intensity=fx.moire>=0?0:p*2.4;flashSpot.color.copy(fx.color);
  glowSprite.material.opacity=p*.5;glowSprite.material.color.copy(fx.color);
  fovGlow.material.opacity=fx.moire<0?p*.1:0;fovGlow.material.color.copy(fx.color);
  rings.forEach((m,i)=>m.emissiveIntensity=(p>0&&(fx.ring===i||fx.ring===9))?2.4:.04);
  for(let i=0;i<4;i++){projLens[i].emissiveIntensity=fx.moire===i?2.5:0;projBeams[i].visible=fx.moire===i;}
  fovStripe.visible=fx.moire>=0;if(fx.moire>=0)stripeTex.rotation=fx.moire*PI/2;
  head.userData.frame.material.opacity=headState=='IDLE'?.25:.9;
  // hood + tower
  hood.open+=(hood.target-hood.open)*Math.min(1,rdt*3.2);hoodPivot.rotation.x=-hood.open*1.05;doors.forEach(d=>{d.open+=(d.target-d.open)*Math.min(1,rdt*3.2);d.g.rotation.y=-d.dir*d.open*1.8;});
  const blink=(performance.now()%700)<350,recentNg=simTime-lastNgAt<3;
  tower.g.emissiveIntensity=!paused?1.6:.05;tower.y.emissiveIntensity=(paused||(recentNg&&blink))?1.8:.05;tower.r.emissiveIntensity=.05;
  // camera
  if(tween){tween.t+=rdt;const k=ease(Math.min(1,tween.t/tween.dur));camera.position.lerpVectors(tween.p0,tween.p1,k);controls.target.lerpVectors(tween.t0,tween.t1,k);if(k>=1){tween=null;if(follow=='pending'){follow=true;lastHead.set(gantry.x,0,gantry.z);}}}
  if(follow===true){_p.set(gantry.x,0,gantry.z).sub(lastHead);camera.position.add(_p);controls.target.add(_p);lastHead.set(gantry.x,0,gantry.z);}
  controls.update();
  const dist=camera.position.distanceTo(controls.target);camera.near=Math.max(1.5,Math.min(10,dist*.03));camera.updateProjectionMatrix();
  // render main view
  const W=window.innerWidth,H=window.innerHeight;
  renderer.setScissorTest(false);renderer.setViewport(0,0,W,H);renderer.clear();
  renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
  // render what the cameras see
  if(W>900){
    insetCam.position.set(gantry.x,927,gantry.z);insetCam.lookAt(gantry.x,0,gantry.z);
    renderer.setScissorTest(true);
    renderer.setViewport(15,15,255,253);renderer.setScissor(15,15,255,253);renderer.clear();renderer.render(scene,insetCam);
    if(W>1250){insetCamH.position.copy(insetCam.position);insetCamH.quaternion.copy(insetCam.quaternion);
      scene.overrideMaterial=heightMat;renderer.setViewport(282,15,255,253);renderer.setScissor(282,15,255,253);renderer.clear();renderer.render(scene,insetCamH);scene.overrideMaterial=null;}
    renderer.setScissorTest(false);
  }
  // overlays
  if(showTags)tags.forEach(t=>{_p.copy(t.v);t.obj.localToWorld(_p);_p.project(camera);const vis=_p.z<1&&Math.abs(_p.x)<1&&Math.abs(_p.y)<1;t.el.style.display=vis?'block':'none';if(vis){t.el.style.left=((_p.x+1)/2*W)+'px';t.el.style.top=((1-_p.y)/2*H)+'px';}});
  hudT+=rdt;if(hudT>.08){hudT=0;updateHud();}
  monT+=rdt;if(monT>.25){monT=0;drawMon();}
}
window.__sim={doors,gantry,lanes,stats,cur,fx,board,views,setHood,get time(){return simTime;},setSpeed:s=>speed=s,ff:s=>{const n=Math.round(s/.01);for(let i=0;i<n;i++){simTime+=.01;for(let k=0;k<cos.length;k++)cos[k].step(.01);}}};
frame();

