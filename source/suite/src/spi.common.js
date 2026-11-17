
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
camera.position.set(-2300,2000,3300);
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

