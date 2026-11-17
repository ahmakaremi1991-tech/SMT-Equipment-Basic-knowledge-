
'use strict';
/* ===================================================================
   SMT LINE SUITE — shared 3D setup.  Units: millimetres.
   X = board flow (left -> right), Y = up, Z = toward the operator.
   Conveyor (board top) at 900 mm; lane 1 at z = +170, lane 2 at z = -170.
   =================================================================== */
const CFG=Object.assign({shadow:1500,shadowFar:6000,shadowMap:2048,maxDist:9000,esd:3400,contact:[4300,2700]},window.SMT_CFG||{});
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
scene.background=new THREE.Color(0x10151d);   /* dark-gray theme colour (also used by the CSS --scene variable) */
const camera=new THREE.PerspectiveCamera(38,1,10,40000);
camera.position.set(2450,1950,3300);
camera.layers.enable(1);camera.layers.enable(2);
const controls=new THREE.OrbitControls(camera,canvas);
controls.target.set(0,880,0);controls.enableDamping=true;controls.dampingFactor=.08;
controls.minDistance=45;controls.maxDistance=CFG.maxDist;controls.maxPolarAngle=PI*.495;

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

const hemi=new THREE.HemisphereLight(0xdfeaff,0x4a4f58,.75);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffffff,1.9);
sun.position.set(900,2900,1900);sun.castShadow=true;
sun.shadow.mapSize.set(CFG.shadowMap,CFG.shadowMap);
Object.assign(sun.shadow.camera,{left:-CFG.shadow,right:CFG.shadow,top:CFG.shadow,bottom:-CFG.shadow,near:200,far:CFG.shadowFar});
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

/* ---------- floor (re-tinted by the theme) ---------- */
const floorMat=std(0xffffff,.82,0);
const stubMat=std(0x2b323d,.75,.1);          /* neighbouring machines in the line */
(function(){
  const f=new THREE.Mesh(new THREE.PlaneGeometry(40000,40000),floorMat);
  f.rotation.x=-PI/2;f.receiveShadow=true;scene.add(f);
  // ESD safety line around the machine
  const lt=canvasTex(64,64,(g)=>{g.fillStyle='#e8b923';g.fillRect(0,0,64,64);});
  [[0,1250,CFG.esd,60],[0,-1250,CFG.esd,60]].forEach(a=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(a[2],a[3]),new THREE.MeshBasicMaterial({map:lt,transparent:true,opacity:.55}));m.rotation.x=-PI/2;m.position.set(a[0],1,a[1]);scene.add(m);});
  // soft contact shadow under the machine
  const st=canvasTex(256,256,(g,W,H)=>{const gr=g.createRadialGradient(W/2,H/2,W*.18,W/2,H/2,W*.5);gr.addColorStop(0,'rgba(0,0,0,.75)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);});
  const s=new THREE.Mesh(new THREE.PlaneGeometry(CFG.contact[0],CFG.contact[1]),new THREE.MeshBasicMaterial({map:st,transparent:true,depthWrite:false}));
  s.rotation.x=-PI/2;s.position.y=2;scene.add(s);
})();
function floorTex(dark){const t=canvasTex(512,512,(g,W,H)=>{g.fillStyle=dark?'#232a34':'#d5dae0';g.fillRect(0,0,W,H);g.strokeStyle=dark?'rgba(255,255,255,.055)':'rgba(0,0,0,.07)';g.lineWidth=2;g.strokeRect(0,0,W,H);
  for(let i=0;i<900;i++){g.fillStyle=(dark?'rgba(255,255,255,':'rgba(0,0,0,')+(Math.random()*.025)+')';g.fillRect(Math.random()*W,Math.random()*H,2,2);}},{repeat:true});t.repeat.set(40,40);return t;}
const _ftex={};
SMT.onTheme(d=>{
  scene.background.set(d?0x10151d:0xeef1f5);
  const k=d?'d':'l';if(!_ftex[k])_ftex[k]=floorTex(d);floorMat.map=_ftex[k];floorMat.needsUpdate=true;
  stubMat.color.set(d?0x2b323d:0xb7bfc9);hemi.intensity=d?.75:.95;hemi.groundColor.set(d?0x4a4f58:0x9aa3ad);
  renderer.toneMappingExposure=d?1.05:1.0;
});
/* line-neighbour stub with a readable flow label */
function lineStub(x,z,w,d,text){box(scene,w,1000,d,stubMat,x,500,z,NOSH);
  label(scene,text,Math.min(560,w-60),78,x,1001,z+d/2-90,{rx:-PI/2,bg:'#1e6fd9',fg:'#ffffff',pw:900,size:.46});}
