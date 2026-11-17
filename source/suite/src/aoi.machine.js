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

