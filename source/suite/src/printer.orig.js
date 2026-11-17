
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
   MACHINE — EKRA SERIO 5000 stencil printer.  Units: millimetres.
   1180 (X, board flow) x 1840 (Z, depth) x 1606 (Y, height).
   =================================================================== */
const CONV_Y=900,BW=250,BD=200,BT=1.6,LZ=250,STEN_Y=962,LIFT=STEN_Y-CONV_Y-BT-.05;
const HX=590,HZ=920,TOP=1606,BODY_TOP=860,SPLIT=920,WX0=-380,WX1=460;
const machine=new THREE.Group();scene.add(machine);
const shellMats=[];
const sm=(c,r=.55,m=.05)=>{const x=std(c,r,m);shellMats.push(x);return x;};
const M={anth:sm(0x2f3237,.62,.15),silver:sm(0xc2c5c9,.45,.25),magenta:sm(0xd4006c,.45,.1),dark:std(0x24272b,.6,.2),
  alu:std(0xb9c0c8,.35,.85),aluD:std(0x7d858f,.45,.8),steel:std(0xd5dadf,.22,.95),black:std(0x15171a,.55,.2),bed:std(0x1d2024,.6,.1),
  red:std(0xc8202a,.5,.1),white:std(0xf1f2f3,.7,0),blue:std(0x1e78d6,.4,.1),camBlue:std(0x1b4fb0,.35,.6),glassLens:std(0x0b1020,.05,.9)};
const NOSH={cast:false};

/* --- cabinet --- */
box(machine,2*HX,BODY_TOP-130,2*HZ,M.anth,0,(BODY_TOP+130)/2,0,NOSH);
box(machine,2*HX-70,40,2*HZ-70,M.dark,0,112,0,NOSH);
[[-500,-800],[500,-800],[-500,800],[500,800]].forEach(p=>{cyl(machine,58,64,20,M.steel,p[0],10,p[1]);cyl(machine,16,16,110,M.steel,p[0],70,p[1]);});
box(machine,WX1-WX0,SPLIT-146,10,M.silver,(WX0+WX1)/2,(SPLIT+134)/2,HZ+3,NOSH);          // lower front panel
box(machine,45,TOP-130,12,M.magenta,WX0-22.5,(TOP+130)/2,HZ+3,NOSH);                    // magenta stripe
box(machine,HX+WX0-45,TOP-BODY_TOP,20,M.anth,(-HX+WX0-45)/2,(TOP+BODY_TOP)/2,HZ-10,NOSH); // left front column
box(machine,HX-WX1,TOP-BODY_TOP,20,M.anth,(HX+WX1)/2,(TOP+BODY_TOP)/2,HZ-10,NOSH);       // right front column
box(machine,2*HX,TOP-BODY_TOP,20,M.anth,0,(TOP+BODY_TOP)/2,-HZ+10,NOSH);                 // rear wall
box(machine,2*HX,20,300+HZ,M.anth,0,TOP-10,(300-HZ)/2,NOSH);                             // roof (rear part)
box(machine,HX+WX0,20,HZ-300,M.anth,(-HX+WX0)/2,TOP-10,(HZ+300)/2,NOSH);
box(machine,HX-WX1,20,HZ-300,M.anth,(HX+WX1)/2,TOP-10,(HZ+300)/2,NOSH);
cyl(machine,9,9,5,M.black,WX0+50,560,HZ+9,{rx:PI/2,cast:false});
(function(){ // side walls with transport openings
  const sh=new THREE.Shape();sh.moveTo(-HZ,BODY_TOP);sh.lineTo(HZ,BODY_TOP);sh.lineTo(HZ,TOP);sh.lineTo(-HZ,TOP);sh.closePath();
  const ho=new THREE.Path();ho.moveTo(LZ-150,872);ho.lineTo(LZ+150,872);ho.lineTo(LZ+150,968);ho.lineTo(LZ-150,968);ho.closePath();sh.holes.push(ho);
  const g=new THREE.ExtrudeGeometry(sh,{depth:20,bevelEnabled:false});
  [-HX+20,HX].forEach(x=>{const m=new THREE.Mesh(g,M.anth);m.rotation.y=-PI/2;m.position.x=x;machine.add(m);});
  [-1,1].forEach(s=>{box(machine,26,8,316,M.silver,s*(HX+3),971,LZ,NOSH);box(machine,26,8,316,M.silver,s*(HX+3),869,LZ,NOSH);box(machine,26,106,8,M.silver,s*(HX+3),920,LZ+154,NOSH);box(machine,26,106,8,M.silver,s*(HX+3),920,LZ-154,NOSH);
    box(machine,3,3,2*HZ-40,M.dark,s*(HX+.5),SPLIT,0,NOSH);box(machine,4,560,900,M.anth,s*(HX+1),520,-350,NOSH);});
  const wt=canvasTex(128,128,(g2)=>{g2.clearRect(0,0,128,128);g2.fillStyle='#f2c400';g2.beginPath();g2.moveTo(64,10);g2.lineTo(120,112);g2.lineTo(8,112);g2.closePath();g2.fill();g2.strokeStyle='#111';g2.lineWidth=7;g2.stroke();g2.fillStyle='#111';g2.fillRect(59,44,10,36);g2.fillRect(59,88,10,10);});
  const w=new THREE.Mesh(new THREE.PlaneGeometry(70,70),new THREE.MeshBasicMaterial({map:wt,transparent:true}));w.position.set(-HX-.8,1010,LZ-230);w.rotation.y=-PI/2;machine.add(w);
})();
// lettering + logo
(function(){
  const t=label(machine,'SERIO 5000',330,50,(-HX+WX0-45)/2,1335,HZ+.8,{fg:'#e9eaec',pw:660,weight:'700',size:.74});t.rotation.z=PI/2;
  const lt=canvasTex(900,300,(g,W,H)=>{g.clearRect(0,0,W,H);g.fillStyle='#17181a';g.font='italic 900 190px "Arial Black",Arial,sans-serif';g.textBaseline='middle';g.fillText('EKRA',10,130);
    g.fillStyle='#d4006c';[[640,0],[745,0]].forEach(p=>{g.beginPath();g.moveTo(p[0]+60,48);g.lineTo(p[0]+140,48);g.lineTo(p[0]+80,212);g.lineTo(p[0],212);g.closePath();g.fill();});
    g.fillStyle='#55585c';g.font='500 40px Arial';g.fillText('Screen Printing Technologies',300,262);});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(330,110),new THREE.MeshStandardMaterial({map:lt,transparent:true,roughness:.5}));m.position.set(230,815,HZ+8.6);machine.add(m);
  const x=(HX+WX1)/2;
  cyl(machine,34,34,6,std(0xf2c400,.5),x,1520,HZ+3,{rx:PI/2,cast:false});cyl(machine,24,19,28,M.red,x,1520,HZ+18,{rx:PI/2,cast:false});
  cyl(machine,13,13,10,M.red,(-HX+WX0-45)/2,1120,HZ+4,{rx:PI/2,cast:false});
})();

/* --- hood (front window + top cover), hinged at the top, lifts up --- */
const hoodPivot=new THREE.Group();hoodPivot.position.set(0,TOP,300);machine.add(hoodPivot);
const glassMat=new THREE.MeshStandardMaterial({color:0x9db4c8,roughness:.05,metalness:.2,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide});
(function(){
  const off=new THREE.Group();off.position.set(0,-TOP,-300);hoodPivot.add(off);
  const cx=(WX0+WX1)/2,w=WX1-WX0;
  box(off,w,18,HZ-300,M.silver,cx,TOP-9,(HZ+300)/2,NOSH);
  const fs=new THREE.Shape();fs.moveTo(WX0,SPLIT);fs.lineTo(WX1,SPLIT);fs.lineTo(WX1,TOP);fs.lineTo(WX0,TOP);fs.closePath();
  const ho=new THREE.Path();ho.moveTo(WX0+38,SPLIT+50);ho.lineTo(WX1-38,SPLIT+50);ho.lineTo(WX1-38,TOP-48);ho.lineTo(WX0+38,TOP-48);ho.closePath();fs.holes.push(ho);
  const ff=new THREE.Mesh(new THREE.ExtrudeGeometry(fs,{depth:14,bevelEnabled:false}),M.silver);ff.position.z=HZ-14;off.add(ff);
  const gl=new THREE.Mesh(new THREE.PlaneGeometry(w-76,TOP-SPLIT-98),glassMat);gl.position.set(cx,(TOP+SPLIT)/2+1,HZ-7);gl.renderOrder=5;off.add(gl);
  box(off,420,14,14,M.steel,cx,SPLIT+24,HZ+16,NOSH);box(off,14,14,22,M.steel,cx-200,SPLIT+24,HZ+6,NOSH);box(off,14,14,22,M.steel,cx+200,SPLIT+24,HZ+6,NOSH);
})();
const hood={open:0,target:0};

/* --- signal tower --- */
const tower={};
(function(){
  const g=new THREE.Group();g.position.set(WX0-22,TOP,HZ-50);machine.add(g);
  cyl(g,7,7,230,M.steel,0,115,0);
  [['r',0xff2a2a,292],['y',0xffa800,261],['g',0x22e06a,230]].forEach(a=>{const mt=new THREE.MeshStandardMaterial({color:a[1],emissive:a[1],emissiveIntensity:.05,roughness:.3,transparent:true,opacity:.92});tower[a[0]]=mt;cyl(g,16,16,29,mt,0,a[2]+15,0);});
  cyl(g,17,17,6,M.dark,0,326,0);
})();

/* --- operator touch screen on the right-hand arm --- */
let monTex,monCtx;
(function(){
  const g=new THREE.Group();g.position.set((HX+WX1)/2,0,HZ);machine.add(g);
  box(g,50,50,200,M.dark,30,1340,90);box(g,300,36,36,M.dark,180,1340,180);
  const m=new THREE.Group();m.position.set(360,1350,230);m.rotation.y=-.3;g.add(m);
  box(m,560,350,30,M.black,0,0,0);
  const c=document.createElement('canvas');c.width=640;c.height=400;monCtx=c.getContext('2d');
  monTex=new THREE.CanvasTexture(c);monTex.encoding=THREE.sRGBEncoding;monTex.anisotropy=8;
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(525,318),new THREE.MeshBasicMaterial({map:monTex,toneMapped:false}));scr.position.set(0,0,16);m.add(scr);
})();

/* --- neighbours in the line --- */
[-1,1].forEach(s=>{
  box(scene,600,1000,800,std(0x262c35,.75,.1),s*1150,500,LZ,NOSH);
  box(scene,4,100,330,M.black,s*849,916,LZ,NOSH);
  label(scene,s<0?'▶  FROM LOADER':'TO SPI / PLACEMENT  ▶',520,64,s*1150,1001,LZ+300,{rx:-PI/2,fg:'#9fb4cf',pw:800,size:.5});
});

/* --- interior --- */
const interior=new THREE.Group();machine.add(interior);
box(interior,2*HX-44,12,2*HZ-44,M.bed,0,856,0);
const inLight=new THREE.PointLight(0xe6eeff,.9,2000,1);inLight.position.set(0,1480,-300);interior.add(inLight);
box(interior,900,10,30,new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xd8e6ff,emissiveIntensity:.9}),0,1560,-880,NOSH);

/* transport: infeed, lifting print nest, outfeed */
const beltTex=canvasTex(64,16,(g)=>{g.fillStyle='#1c1e21';g.fillRect(0,0,64,16);g.fillStyle='#2c3035';for(let x=0;x<64;x+=16)g.fillRect(x,0,6,16);},{repeat:true});
beltTex.repeat.set(40,1);
const beltMat=std(0xffffff,.9,0,{map:beltTex});
function railSeg(parent,x0,x1){const len=x1-x0,cx=(x0+x1)/2;[-1,1].forEach(s=>{const rz=LZ+s*(BD/2+7);
  box(parent,len,46,12,M.alu,cx,CONV_Y-17,rz);box(parent,len,6,5,M.aluD,cx,CONV_Y+9,rz-s*3.5,NOSH);box(parent,len,3,6,beltMat,cx,CONV_Y-1.5,LZ+s*(BD/2-2.5),NOSH);});}
railSeg(interior,-840,-180);railSeg(interior,180,840);
[-520,-300,300,520].forEach(x=>cyl(interior,6,6,BD+30,M.steel,x,CONV_Y-30,LZ,{rx:PI/2,seg:10}));
[-1,1].forEach(s=>box(interior,60,34,16,M.black,s*800,CONV_Y-17,LZ+BD/2+21,NOSH));
const nest=new THREE.Group();interior.add(nest);
const clamps=[];
(function(){
  railSeg(nest,-172,172);
  box(nest,270,12,130,M.aluD,0,878,LZ);box(nest,170,70,110,M.alu,0,837,LZ);
  for(let ix=-2;ix<=2;ix++)for(let iz=-1;iz<=1;iz++)cyl(nest,3.2,3.2,16,M.steel,ix*52,892,LZ+iz*46,{seg:8,cast:false});
  [-1,1].forEach(s=>{const c=box(nest,344,.5,7,M.steel,0,CONV_Y+BT+.3,LZ+s*(BD/2+4),NOSH);c.userData.s=s;clamps.push(c);});
  [[-150,-70],[150,-70],[-150,70],[150,70]].forEach(p=>{cyl(interior,9,9,60,M.steel,p[0],892,LZ+p[1],{seg:14});box(nest,30,14,30,M.aluD,p[0],871,LZ+p[1]);});
})();
const stopPin=cyl(interior,5,5,16,M.steel,BW/2+7,CONV_Y-12,LZ,{seg:12});

/* stencil holder + frame (foil is built after the board artwork exists) */
const stencil=new THREE.Group();stencil.position.set(0,STEN_Y,LZ);interior.add(stencil);
(function(){
  [-1,1].forEach(s=>{
    box(interior,30,40,900,M.alu,s*397,STEN_Y+10,LZ);box(interior,26,6,900,M.aluD,s*378,STEN_Y-3,LZ,NOSH);
    [-230,730].forEach(z=>box(interior,34,STEN_Y-10-862,34,M.aluD,s*397,(STEN_Y-10+862)/2,z));
    [-60,250,560].forEach(z=>{box(interior,40,26,50,M.black,s*392,STEN_Y+42,z,NOSH);box(interior,60,14,20,M.aluD,s*424,STEN_Y-22,z,NOSH);});
    box(interior,24,20,900,M.steel,s*450,934,LZ);                     // shared linear rails (camera gantry + cleaner)
  });
  const F=736,P=38;
  box(stencil,F,30,P,M.alu,0,15,F/2-P/2);box(stencil,F,30,P,M.alu,0,15,-F/2+P/2);
  box(stencil,P,30,F-2*P,M.alu,F/2-P/2,15,0);box(stencil,P,30,F-2*P,M.alu,-F/2+P/2,15,0);
})();

/* squeegee gantry + closed-loop print head */
const sq={z:325,fy:1,ry:1};
const sqBeam=new THREE.Group();interior.add(sqBeam);
const blades=[];let pasteRoll;
(function(){
  [-1,1].forEach(s=>{box(interior,50,50,1150,M.alu,s*505,1167,LZ);box(interior,14,8,1110,M.steel,s*505,1196,LZ,NOSH);
    [-300,800].forEach(z=>box(interior,50,1142-862,50,M.aluD,s*505,(1142+862)/2,z));});
  box(sqBeam,1060,80,110,M.alu,0,1232,0);box(sqBeam,80,30,150,M.aluD,-505,1205,0);box(sqBeam,80,30,150,M.aluD,505,1205,0);
  box(sqBeam,900,24,50,M.black,0,1284,-20,NOSH);
  box(sqBeam,390,100,200,std(0x9aa1a9,.4,.7),0,STEN_Y+180,0);
  label(sqBeam,'CLOSED LOOP',170,26,0,STEN_Y+180,100.8,{fg:'#1a1c1f',pw:420,size:.6});
  box(sqBeam,60,60,60,M.black,150,STEN_Y+260,0);cyl(sqBeam,20,20,70,M.black,150,STEN_Y+262,-60,{rx:PI/2});
  [1,-1].forEach(s=>{ // s=+1 front blade (prints toward the rear), s=-1 rear blade
    const g=new THREE.Group();g.position.z=s*45;sqBeam.add(g);
    cyl(g,24,24,90,M.alu,-100,STEN_Y+175,0);cyl(g,24,24,90,M.alu,100,STEN_Y+175,0);
    const mv=new THREE.Group();g.add(mv);
    cyl(mv,8,8,120,M.steel,-100,STEN_Y+95,0,{seg:12});cyl(mv,8,8,120,M.steel,100,STEN_Y+95,0,{seg:12});
    box(mv,310,24,22,M.aluD,0,STEN_Y+46,-s*19);
    const r=new THREE.Group();r.position.y=STEN_Y+.3;r.rotation.x=-s*.52;mv.add(r);
    box(r,300,42,1.4,M.steel,0,21,0);
    blades.push({mv,s});
  });
  pasteRoll=new THREE.Mesh(new THREE.CylinderGeometry(7,7,232,16),std(0x8d9095,.85,.3));pasteRoll.rotation.z=PI/2;pasteRoll.castShadow=true;interior.add(pasteRoll);
})();

/* EVA vision camera gantry (travels between stencil and board) */
const cam={x:-300,zb:-110};
const camBeam=new THREE.Group(),camHead=new THREE.Group();interior.add(camBeam);camBeam.add(camHead);
const camLeds=[];let camLight;
(function(){
  box(camBeam,880,24,46,M.alu,0,934,0);box(camBeam,40,26,70,M.aluD,-450,934,0);box(camBeam,40,26,70,M.aluD,450,934,0);
  box(camHead,74,32,64,M.camBlue,0,934,54);label(camHead,'EVA',40,14,0,934,86.6,{fg:'#fff',pw:200});
  [1,-1].forEach(s=>{cyl(camHead,11,11,3,M.glassLens,0,934+s*17,54,{seg:16,cast:false});
    const mt=new THREE.MeshStandardMaterial({color:0x331010,emissive:0xff3020,emissiveIntensity:0,roughness:.4});
    const t=new THREE.Mesh(new THREE.TorusGeometry(17,2.5,6,24),mt);t.rotation.x=PI/2;t.position.set(0,934+s*16.5,54);camHead.add(t);camLeds.push(mt);});
  camLight=new THREE.PointLight(0xff4030,0,160,1.2);camLight.position.set(0,934,54);camHead.add(camLight);
})();

/* stencil underside cleaner (oscillating wiper with fabric roll) */
const cleaner=new THREE.Group();interior.add(cleaner);
let wipeBar;
(function(){
  box(cleaner,600,20,120,M.alu,0,926,0);box(cleaner,150,14,40,M.aluD,-375,934,0);box(cleaner,150,14,40,M.aluD,375,934,0);
  const fab=std(0xf4f4f1,.9,0);
  [-38,38].forEach(z=>{const r=new THREE.Mesh(new THREE.CylinderGeometry(z<0?16:11,z<0?16:11,540,20),fab);r.rotation.z=PI/2;r.position.set(0,940,z);r.castShadow=true;cleaner.add(r);});
  wipeBar=new THREE.Group();cleaner.add(wipeBar);
  box(wipeBar,540,12,18,fab,0,949,0);box(wipeBar,540,1,60,fab,0,952,0,NOSH);
  cyl(cleaner,7,7,70,M.blue,290,948,30,{seg:10});
})();

/* pneumatics on the rear wall (regulators with gauges, valve terminal, cable duct) */
(function(){
  const z=-HZ+22,gt=canvasTex(128,128,(g)=>{g.fillStyle='#f6f6f4';g.beginPath();g.arc(64,64,62,0,7);g.fill();g.strokeStyle='#222';g.lineWidth=3;for(let a=-2.3;a<=2.3;a+=.38){g.beginPath();g.moveTo(64+Math.sin(a)*46,64-Math.cos(a)*46);g.lineTo(64+Math.sin(a)*56,64-Math.cos(a)*56);g.stroke();}
    g.strokeStyle='#c22';g.lineWidth=4;g.beginPath();g.moveTo(64,64);g.lineTo(94,34);g.stroke();g.fillStyle='#1e78d6';g.font='700 15px Arial';g.textAlign='center';g.fillText('bar',64,98);});
  const gm=std(0xffffff,.4,0,{map:gt});
  for(let i=0;i<6;i++){const x=-60+i*78;box(interior,46,70,46,M.black,x,1290,z+23);cyl(interior,17,17,44,M.blue,x,1347,z+23);
    cyl(interior,24,24,14,M.black,x,1275,z+52,{rx:PI/2,cast:false});const f=new THREE.Mesh(new THREE.CircleGeometry(21,24),gm);f.position.set(x,1275,z+59.5);interior.add(f);}
  box(interior,300,70,50,M.white,-330,1300,z+25);for(let i=0;i<14;i++)box(interior,12,56,6,std(0xd6d8da,.6),-462+i*20,1300,z+53,NOSH);
  box(interior,1000,60,60,M.white,0,1180,z+30);
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
  bga:(size,pitch)=>(ls,pd)=>{const n=Math.floor((size-1)/pitch);for(let i=0;i<n;i++)for(let j=0;j<n;j++)pd.push([(i-(n-1)/2)*pitch,(j-(n-1)/2)*pitch,pitch*.5,pitch*.5]);
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
const BARE=true;
const board=(function buildTemplate(){
  const S=10,CW=BW*S,CH=BD*S;
  const bucket=new Bucket(),cands=[],places=[],refs={};
  const SIZ={ '0402':[1.0,.5,.35],'0603':[1.6,.8,.45],'0805':[2.0,1.25,.5],'1206':[3.2,1.6,.55] };
  function place(pre,x,z,rot,builder,o={}){
    const ls=[],pd=[],info=builder(ls,pd);refs[pre]=(refs[pre]||0)+1;const name=pre+refs[pre];
    places.push({name,x,z,rot,pd,info,silk:o.silk!==false});
    if(BARE){}else if(o.cand){const g=new THREE.Group(),b=new Bucket();ls.forEach(a=>b.add(a[0],a[1],a[2]));b.build(g);g.position.set(x,BT,z);g.rotation.order='YXZ';g.rotation.y=rot;cands.push({name,kind:info.kind,len:info.len||0,group:g,x,z,rot,w:info.w,d:info.d,h:info.h});}
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
  const pads=[],pg=[];
  places.forEach(p=>{if(p.info.kind=='conn')return;const c=Math.cos(p.rot),s=Math.sin(p.rot),odd=Math.abs(s)>.5;
    p.pd.forEach(a=>{const x=p.x+a[0]*c+a[1]*s,z=p.z-a[0]*s+a[1]*c,w=(odd?a[3]:a[2])*.9,d=(odd?a[2]:a[3])*.9;pads.push([x,z,w,d]);
      const g=new THREE.BoxGeometry(w,.13,d);g.translate(x,BT+.075,z);pg.push(g);});});
  const pasteGeo=BGU.mergeBufferGeometries(pg,false);pg.forEach(g=>g.dispose());
  let tris=0;st.traverse(o=>{if(o.isMesh)tris+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});
  return{static:st,cands,places,pads,pasteGeo,tris:Math.round(tris)};
})();

/* ===================================================================
   RUNTIME — stencil, boards, print cycle, UI
   =================================================================== */
const foilMats=[];
(function(){ // stainless foil with laser-cut apertures taken from the board's pad layout
  const S=10,tex=canvasTex(BW*S,BD*S,(g,W,H)=>{
    g.fillStyle='#b3b8bd';g.fillRect(0,0,W,H);
    for(let i=0;i<2600;i++){g.fillStyle='rgba('+(Math.random()<.5?'255,255,255':'60,66,72')+','+(Math.random()*.07)+')';g.fillRect(0,Math.random()*H,W,1);}
    g.fillStyle='#0b0c0e';board.pads.forEach(p=>g.fillRect((p[0]-p[2]/2+BW/2)*S,(p[1]-p[3]/2+BD/2)*S,p[2]*S,p[3]*S));
    FIDS.forEach(f=>{g.fillStyle='#4a4f55';g.beginPath();g.arc((f.x+BW/2)*S,(f.z+BD/2)*S,5,0,7);g.fill();});
    g.fillStyle='#868c92';g.font='600 22px Arial';g.fillText('EKRA  ·  MV9-TV1 REV C  ·  T = 0.13 mm  ·  TOP SIDE',(-100+BW/2)*S,(97+BD/2)*S);
    g.strokeStyle='rgba(60,66,72,.35)';g.lineWidth=2;g.strokeRect(1,1,W-2,H-2);});
  const m1=new THREE.MeshStandardMaterial({map:tex,roughness:.38,metalness:.75,side:THREE.DoubleSide,envMapIntensity:.9});
  const bt=canvasTex(256,256,(g)=>{g.fillStyle='#b3b8bd';g.fillRect(0,0,256,256);for(let i=0;i<700;i++){g.fillStyle='rgba('+(Math.random()<.5?'255,255,255':'60,66,72')+','+(Math.random()*.07)+')';g.fillRect(0,Math.random()*256,256,1);}},{repeat:true});bt.repeat.set(.004,.004);
  const m2=new THREE.MeshStandardMaterial({map:bt,roughness:.38,metalness:.75,side:THREE.DoubleSide,envMapIntensity:.9});
  foilMats.push(m1,m2);
  const c=new THREE.Mesh(FLAT(BW,BD),m1);c.position.y=.1;c.receiveShadow=true;stencil.add(c);
  const sh=new THREE.Shape();sh.moveTo(-330,-330);sh.lineTo(330,-330);sh.lineTo(330,330);sh.lineTo(-330,330);sh.closePath();
  const ho=new THREE.Path();ho.moveTo(-BW/2,-BD/2);ho.lineTo(BW/2,-BD/2);ho.lineTo(BW/2,BD/2);ho.lineTo(-BW/2,BD/2);ho.closePath();sh.holes.push(ho);
  const og=new THREE.ShapeGeometry(sh);og.rotateX(-PI/2);const o=new THREE.Mesh(og,m2);o.position.y=.1;o.receiveShadow=true;stencil.add(o);
})();
const pasteMat=std(0x8f9296,.82,.35);
let serial=4200;
function makeBoard(x){
  const g=new THREE.Group();
  board.static.children.forEach(m=>{const c=new THREE.Mesh(m.geometry,m.material);c.position.copy(m.position);c.receiveShadow=true;c.castShadow=m.castShadow;g.add(c);});
  const p=new THREE.Mesh(board.pasteGeo,pasteMat);p.visible=false;p.receiveShadow=true;g.add(p);
  g.position.set(x,CONV_Y,LZ);interior.add(g);return{g,x,paste:p,sn:++serial};
}

/* ---------- tiny coroutine scheduler ---------- */
const FRAME=-1,cos=[];
class Co{constructor(g){this.g=g;this.wait=0;this.done=false;}
  step(dt){if(this.done)return;this.wait-=dt;let pass=dt,guard=0;
    while(this.wait<=0&&guard++<64){const r=this.g.next(pass);pass=0;if(r.done){this.done=true;return;}if(r.value===FRAME){this.wait=1e-9;return;}this.wait+=r.value;}}}
function run(g){const c=new Co(g);cos.push(c);return c;}
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function* tween(dur,fn,lin){let t=0;while(t<dur){t+=yield FRAME;const k=Math.min(1,t/dur);fn(lin?k:ease(k));}}

/* ---------- state ---------- */
const STEPS=['LOAD','CLAMP','ALIGN','LIFT','PRINT','SEPARATE','INSPECT','UNLOAD'];
const CLEAN_EVERY=4,PRINT_V=80;
const st={step:-1,name:'IDLE',sub:'—',printed:0,ct:0,sinceClean:0,cleans:0,off:null,force:0,speed:0,lift:0,clamp:0,dir:-1,down:[0,0],clz:640,clup:0,osc:false,cur:null,stopUp:true,rollZ:358,cov:0};
const camFx={c:new THREE.Color(1,1,1),p:0};
let simTime=0,speed=1,paused=false,moving=0;
const logEl=$('log');
function addLog(t,cls){const d=document.createElement('div');d.textContent=t;if(cls)d.className=cls;logEl.prepend(d);while(logEl.children.length>7)logEl.lastChild.remove();}
function setStep(i,sub){st.step=i;st.name=STEPS[i];st.sub=sub||'—';}
const BELT_V=330;
function* conveyTo(b,x){moving++;while(b.x<x){const dt=yield FRAME;b.x=Math.min(x,b.x+BELT_V*dt);b.g.position.x=b.x;}moving--;}
function* exitScript(b){yield* conveyTo(b,610);yield 1.3;yield* conveyTo(b,1180);interior.remove(b.g);}
function* camTo(x,z){const x0=cam.x,z0=cam.zb,zb=z-54,d=Math.hypot(x-x0,zb-z0);yield* tween(Math.max(.15,d/900+.08),k=>{cam.x=x0+(x-x0)*k;cam.zb=z0+(zb-z0)*k;});}
function* flash(col,dur){camFx.c.setHex(col);camFx.p=1;yield dur;camFx.p=0;yield .04;}
function* clean(){
  st.step=-1;st.name='CLEAN';st.sub='CLEANER TO STENCIL';
  yield* tween(.8,k=>st.clz=640+(372-640)*k);
  st.sub='WET WIPE · OSCILLATING';yield* tween(.15,k=>st.clup=k);st.osc=true;
  yield* tween(2.6,k=>st.clz=372+(118-372)*k,true);
  st.sub='DRY WIPE + VACUUM';yield* tween(2.2,k=>st.clz=118+(372-118)*k,true);
  st.osc=false;yield* tween(.15,k=>st.clup=1-k);st.sub='CLEANER PARK';
  yield* tween(.8,k=>st.clz=372+(640-372)*k);
  st.sinceClean=0;st.cleans++;addLog('Stencil underside cleaned (#'+st.cleans+')','cl');
}
function* main(){
  yield .3;let b=makeBoard(-1160);
  while(true){
    const t0=simTime;
    setStep(0,'BOARD TO PRINT NEST');st.stopUp=true;yield* conveyTo(b,0);
    const nb=makeBoard(-1160),pre=run(conveyTo(nb,-565));
    setStep(1,'SIDE + TOP CLAMP');st.cur=b;yield* tween(.3,k=>st.clamp=k);
    setStep(2,'EVA CAMERA');
    for(const f of [FIDS[1],FIDS[2]]){yield* camTo(f.x,LZ+f.z);st.sub='STENCIL FIDUCIAL ▲';yield* flash(0xff3020,.13);st.sub='BOARD FIDUCIAL ▼';yield* flash(0xffffff,.13);}
    st.off=[(Math.random()-.5)*90,(Math.random()-.5)*90,(Math.random()-.5)*.04];st.sub='TABLE X / Y / θ CORRECTION';
    yield* camTo(-300,-56);yield .2;
    setStep(3,'TABLE UP TO STENCIL');yield* tween(.55,k=>st.lift=k*LIFT);
    const dir=st.dir,bi=dir<0?0:1,z0=dir<0?325:150,z1=dir<0?85:390,zs=sq.z;
    setStep(4,dir<0?'SQUEEGEE FRONT → REAR':'SQUEEGEE REAR → FRONT');
    yield* tween(.3,k=>sq.z=zs+(z0-zs)*k);
    yield* tween(.2,k=>st.down[bi]=k);st.force=60+Math.round(Math.random()*4);st.speed=PRINT_V;
    yield* tween(Math.abs(z1-z0)/PRINT_V,k=>sq.z=z0+(z1-z0)*k,true);
    st.speed=0;yield* tween(.2,k=>st.down[bi]=1-k);st.force=0;st.dir=-dir;
    setStep(5,'SLOW SNAP-OFF');b.paste.visible=true;
    yield* tween(.5,k=>st.lift=LIFT-3*k,true);yield* tween(.45,k=>st.lift=(LIFT-3)*(1-k));
    setStep(6,'2D PASTE INSPECTION');
    for(const s of [[-65,40],[-5,-50]]){yield* camTo(s[0],LZ+s[1]);yield* flash(0xffffff,.14);}
    st.cov=96+Math.random()*3.5;st.sub='COVERAGE '+st.cov.toFixed(1)+' %  OK';
    yield* camTo(-300,-56);
    setStep(7,'RELEASE + TRANSFER');yield* tween(.25,k=>st.clamp=1-k);st.cur=null;st.stopUp=false;
    st.printed++;st.sinceClean++;st.ct=simTime-t0;
    addLog('#'+b.sn+'  printed  '+st.ct.toFixed(1)+' s  ·  '+st.cov.toFixed(1)+' %','ok');
    const ex=run(exitScript(b));
    if(st.sinceClean>=CLEAN_EVERY){while(b.x<200)yield FRAME;yield* clean();}
    while(b.x<330||!pre.done)yield FRAME;
    b=nb;
  }
}
run(main());

/* ---------- inset: what the EVA camera sees (looking down at the board) ---------- */
const insetCam=new THREE.OrthographicCamera(-15*255/253,15*255/253,15,-15,.5,70);insetCam.up.set(0,0,-1);

/* ---------- labels ---------- */
const tags=[];
function tag(text,obj,x,y,z){const el=document.createElement('div');el.className='tag';el.textContent=text;$('tags').appendChild(el);tags.push({el,obj,v:new THREE.Vector3(x,y,z)});}
tag('Closed-loop squeegee head',sqBeam,0,STEN_Y+235,100);
tag('Stencil in 29" frame',stencil,-250,34,300);
tag('Solder paste roll',pasteRoll,0,12,0);
tag('EVA alignment camera',camHead,0,955,54);
tag('Stencil underside cleaner',cleaner,-200,960,0);
tag('Lifting print nest',nest,0,905,LZ+120);
tag('Pneumatics',interior,130,1390,-HZ+60);
tag('Hood — click to open',machine,40,1480,HZ+20);
tag('Touch screen',machine,(HX+WX1)/2+360,1560,HZ+230);
let showTags=false;

/* ---------- UI ---------- */
let tween3=null;
function flyTo(p,t,dur=1.2){tween3={p0:camera.position.clone(),t0:controls.target.clone(),p1:new THREE.Vector3(...p),t1:new THREE.Vector3(...t),t:0,dur};}
function setHood(o){hood.target=o?1:0;$('bHood').textContent=o?'Close hood':'Open hood';$('bHood').classList.toggle('on',!!o);}
let seeThru=false;
function setSten(o){seeThru=o;$('bSten').classList.toggle('on',o);foilMats.forEach(m=>{m.transparent=o;m.opacity=o?.22:1;m.depthWrite=!o;m.needsUpdate=true;});}
const views={
  over:()=>{flyTo([-2450,1950,3600],[0,880,120]);},
  inside:()=>{setHood(1);flyTo([-330,2050,2250],[0,960,250]);},
  head:()=>{setHood(1);flyTo([-520,1330,1050],[0,1010,250]);},
  nest:()=>{setHood(1);setSten(true);flyTo([-330,1130,720],[0,925,250]);},
  out:()=>{flyTo([760,1040,520],[610,902,255]);},
  top:()=>{setHood(1);flyTo([0,4300,LZ+5],[0,900,LZ]);}
};
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-v]').forEach(x=>x.classList.remove('on'));b.classList.add('on');views[b.dataset.v]();});
document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-s]').forEach(x=>x.classList.remove('on'));b.classList.add('on');speed=+b.dataset.s;});
$('bHood').onclick=()=>setHood(!hood.target);
$('bSten').onclick=()=>setSten(!seeThru);
let xray=false;
$('bXray').onclick=()=>{xray=!xray;$('bXray').classList.toggle('on',xray);shellMats.forEach(m=>{m.transparent=xray;m.opacity=xray?.1:1;m.depthWrite=!xray;m.needsUpdate=true;});};
$('bLab').onclick=()=>{showTags=!showTags;$('bLab').classList.toggle('on',showTags);if(!showTags)tags.forEach(t=>t.el.style.display='none');};
$('bPause').onclick=()=>{paused=!paused;$('bPause').textContent=paused?'Resume':'Pause';$('bPause').classList.toggle('on',paused);};
$('specBtn').onclick=()=>{const s=$('spec'),o=s.style.display!='block';s.style.display=o?'block':'none';$('specBtn').textContent=(o?'▾':'▸')+' Machine specifications';};
controls.addEventListener('start',()=>{tween3=null;});
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let downAt=null;
function hitHood(e){mouse.set(e.clientX/window.innerWidth*2-1,-(e.clientY/window.innerHeight)*2+1);ray.setFromCamera(mouse,camera);return ray.intersectObject(hoodPivot,true).length>0;}
canvas.addEventListener('pointerdown',e=>{downAt=[e.clientX,e.clientY];});
canvas.addEventListener('pointerup',e=>{if(!downAt||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>5)return;if(hitHood(e))setHood(!hood.target);});
canvas.addEventListener('pointermove',e=>{if(e.buttons)return;canvas.style.cursor=hitHood(e)?'pointer':'';});

function updateHud(){
  const hs=$('hState');hs.textContent=st.name;hs.className='pill '+(st.name=='CLEAN'?'cl':st.name=='IDLE'?'idle':'');
  $('phase').textContent=st.sub;
  $('stepN').textContent=st.step>=0?(st.step+1)+' / '+STEPS.length:'—';$('stepBar').style.width=(st.step>=0?(st.step+1)/STEPS.length*100:0)+'%';
  $('force').textContent=st.force?st.force+' N':'—';$('spd').textContent=st.speed?st.speed+' mm/s':'—';
  $('offs').textContent=st.off?(st.off[0]>=0?'+':'')+st.off[0].toFixed(0)+' / '+(st.off[1]>=0?'+':'')+st.off[1].toFixed(0)+' µm / '+(st.off[2]*1000).toFixed(0)+' m°':'—';
  $('nPr').textContent=st.printed;$('ct').textContent=st.ct?st.ct.toFixed(1)+' s':'—';
  $('sc').textContent=st.sinceClean+' / '+CLEAN_EVERY;$('ncl').textContent=st.cleans;
  $('insL').textContent=camFx.p>0?'CAPTURE':'LIVE';$('rec').style.opacity=camFx.p>0?1:.25;
}
function drawMon(){
  const g=monCtx,W=640,H=400;g.fillStyle='#14171c';g.fillRect(0,0,W,H);
  g.fillStyle='#22262d';g.fillRect(0,0,W,42);g.fillStyle='#d4006c';g.fillRect(0,42,W,4);
  g.fillStyle='#fff';g.font='700 20px Arial';g.textAlign='left';g.textBaseline='middle';g.fillText('SIMPLEX  ·  SERIO 5000',14,22);
  g.font='500 14px Arial';g.textAlign='right';g.fillText(paused?'PAUSED':'AUTOMATIC',W-14,22);g.textAlign='left';
  STEPS.forEach((s,i)=>{const y=62+i*34,on=i==st.step;g.fillStyle=on?'#d4006c':(i<st.step?'#2a4a38':'#22262d');g.fillRect(16,y,170,28);g.fillStyle=on||i<st.step?'#fff':'#8fa3bd';g.font=(on?'700 ':'500 ')+'15px Arial';g.fillText((i+1)+'  '+s,26,y+15);});
  if(st.name=='CLEAN'){g.fillStyle='#e8a020';g.fillRect(16,62+8*34-2,170,28);g.fillStyle='#111';g.font='700 15px Arial';g.fillText('STENCIL CLEAN',26,62+8*34+13);}
  const bx=214,by=64,bw=270,bh=216;g.fillStyle='#0f5a31';g.fillRect(bx,by,bw,bh);g.strokeStyle='#d9b85c';g.lineWidth=2;g.strokeRect(bx,by,bw,bh);
  g.strokeStyle='#fff';g.lineWidth=2;[FIDS[1],FIDS[2]].forEach(f=>{const x=bx+(f.x+BW/2)/BW*bw,y=by+(f.z+BD/2)/BD*bh;g.beginPath();g.moveTo(x-9,y);g.lineTo(x+9,y);g.moveTo(x,y-9);g.lineTo(x,y+9);g.stroke();});
  if(st.step==4){const z=sq.z+(st.dir<0?45:-45)-LZ,y=by+(z+BD/2)/BD*bh;if(y>by&&y<by+bh){g.fillStyle='rgba(220,225,230,.9)';g.fillRect(bx+6,y-3,bw-12,6);}}
  g.fillStyle='#8fa3bd';g.font='500 13px Arial';g.fillText('SQUEEGEE FORCE',504,76);g.fillText('PRINT SPEED',504,128);g.fillText('BOARDS',504,180);g.fillText('CYCLE',504,232);
  g.fillStyle='#fff';g.font='700 21px Arial';g.fillText(st.force?st.force+' N':'—',504,100);g.fillText(st.speed?st.speed+' mm/s':'—',504,152);g.fillText(String(st.printed),504,204);g.fillText(st.ct?st.ct.toFixed(1)+' s':'—',504,256);
  g.fillStyle='#8fa3bd';g.font='500 14px Arial';g.fillText(st.sub,214,304);
  g.fillText('PRINTS SINCE CLEAN  '+st.sinceClean+' / '+CLEAN_EVERY+'      CLEANS  '+st.cleans,214,372);
  monTex.needsUpdate=true;
}

/* ---------- main loop ---------- */
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();
renderer.shadowMap.autoUpdate=false;
camera.position.set(-2450,1950,3600);controls.target.set(0,880,120);
const clock=new THREE.Clock();let hudT=0,monT=0;const _p=new THREE.Vector3();
function frame(){
  requestAnimationFrame(frame);
  const rdt=Math.min(clock.getDelta(),.05),dt=paused?0:(window.__step!==undefined?window.__step:rdt*speed);
  if(dt>0){simTime+=dt;
    const n=Math.max(1,Math.ceil(dt/.02));for(let i=0;i<n;i++){for(let k=0;k<cos.length;k++)cos[k].step(dt/n);}
    for(let k=cos.length-1;k>=0;k--)if(cos[k].done)cos.splice(k,1);
    if(moving>0)beltTex.offset.x-=dt*BELT_V/20;
    const ty=st.stopUp?CONV_Y+3:CONV_Y-12;stopPin.position.y+=(ty-stopPin.position.y)*Math.min(1,dt*14);
  }
  // poses
  nest.position.y=st.lift;if(st.cur)st.cur.g.position.y=CONV_Y+st.lift;
  clamps.forEach(c=>c.position.z=LZ+c.userData.s*(BD/2+4-5.5*st.clamp));
  sqBeam.position.z=sq.z;blades.forEach((b,i)=>b.mv.position.y=38*(1-st.down[i]));
  if(st.down[0]>.9)st.rollZ=Math.min(st.rollZ,sq.z+33);if(st.down[1]>.9)st.rollZ=Math.max(st.rollZ,sq.z-33);
  pasteRoll.position.set(0,STEN_Y+7.4,st.rollZ);
  camBeam.position.z=cam.zb;camHead.position.x=cam.x;
  camLeds.forEach(m=>{m.emissive.copy(camFx.c);m.emissiveIntensity=camFx.p*3;});camLight.color.copy(camFx.c);camLight.intensity=camFx.p*2.2;
  cleaner.position.set(st.osc?Math.sin(simTime*42)*4:0,0,st.clz);wipeBar.position.y=st.clup*6;
  hood.open+=(hood.target-hood.open)*Math.min(1,rdt*3.2);hoodPivot.rotation.x=-hood.open*1.15;
  const blink=(performance.now()%700)<350,cl=st.name=='CLEAN';
  tower.g.emissiveIntensity=(!paused&&!cl)?1.8:.05;tower.y.emissiveIntensity=(paused||(cl&&blink))?1.8:.05;tower.r.emissiveIntensity=.05;
  // camera
  if(tween3){tween3.t+=rdt;const k=ease(Math.min(1,tween3.t/tween3.dur));camera.position.lerpVectors(tween3.p0,tween3.p1,k);controls.target.lerpVectors(tween3.t0,tween3.t1,k);if(k>=1)tween3=null;}
  controls.update();
  const dist=camera.position.distanceTo(controls.target);camera.near=Math.max(1.5,Math.min(10,dist*.03));camera.updateProjectionMatrix();
  const W=window.innerWidth,H=window.innerHeight;
  renderer.setScissorTest(false);renderer.setViewport(0,0,W,H);renderer.clear();
  renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
  if(W>900){
    insetCam.position.set(cam.x,917,cam.zb+54);insetCam.lookAt(cam.x,0,cam.zb+54);
    renderer.setScissorTest(true);renderer.setViewport(15,15,255,253);renderer.setScissor(15,15,255,253);renderer.clear();renderer.render(scene,insetCam);renderer.setScissorTest(false);
  }
  if(showTags)tags.forEach(t=>{_p.copy(t.v);t.obj.localToWorld(_p);_p.project(camera);const vis=_p.z<1&&Math.abs(_p.x)<1&&Math.abs(_p.y)<1;t.el.style.display=vis?'block':'none';if(vis){t.el.style.left=((_p.x+1)/2*W)+'px';t.el.style.top=((1-_p.y)/2*H)+'px';}});
  hudT+=rdt;if(hudT>.08){hudT=0;updateHud();}
  monT+=rdt;if(monT>.2){monT=0;drawMon();}
}
window.__sim={st,sq,cam,board,views,setHood,setSten,get time(){return simTime;},setSpeed:s=>speed=s,ff:s=>{const n=Math.round(s/.01);for(let i=0;i<n;i++){simTime+=.01;for(let k=0;k<cos.length;k++)cos[k].step(.01);}}};
frame();

