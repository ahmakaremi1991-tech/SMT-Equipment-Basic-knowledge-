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
