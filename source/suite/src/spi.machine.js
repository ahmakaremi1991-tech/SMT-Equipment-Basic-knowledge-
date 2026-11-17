/* ===================================================================
   MACHINE — Koh Young aSPIre3 (L chassis, dual lane).  Units: millimetres.
   1000 (X, board flow) x 1460 (Z, depth) x 1727 (Y) — signal tower adds 475.
   =================================================================== */
const CONV_Y=900, LANE_Z=[170,-170], BW=250, BD=200, BT=1.6;
const HX=500,HZ=730,TOP=1727,FOOT=167,STRIP=-340,WIN0=1060,WIN1=1650,GR0=870,GR1=1030;
const machine=new THREE.Group();scene.add(machine);
const shellMats=[];
const sm=(c,r=.55,m=.05)=>{const x=std(c,r,m);shellMats.push(x);return x;};
const M={
  front:sm(0xdfe2e5,.42,.25), front2:sm(0xcfd3d7,.45,.3), side:sm(0x5a5f66,.5,.3), strip:sm(0x44484e,.5,.3), dark:sm(0x26292e,.6,.2),
  alu:std(0xb9c0c8,.35,.85), aluD:std(0x7d858f,.45,.8), steel:std(0xd5dadf,.22,.95), black:std(0x15171a,.55,.2),
  granite:std(0x1d2024,.6,.1), camBlue:std(0x202327,.4,.5), glassLens:std(0x0b1020,.05,.9), copper:std(0xb87333,.35,.9), red:std(0xc8202a,.5,.1)
};
const NOSH={cast:false};

/* --- body --- */
box(machine,2*HX,GR0-FOOT,2*HZ-30,M.side,0,(GR0+FOOT)/2,-15,NOSH);                // lower body
box(machine,2*HX-60,30,2*HZ-60,M.dark,0,FOOT+15,0,NOSH);
[[-420,-640],[420,-640],[-420,640],[420,640]].forEach(p=>{cyl(machine,40,46,18,M.steel,p[0],9,p[1]);cyl(machine,14,14,150,M.steel,p[0],90,p[1]);cyl(machine,24,24,16,M.steel,p[0],120,p[1],{seg:6});});
// left control strip (full height)
box(machine,HX+STRIP,TOP-FOOT,24,M.strip,(-HX+STRIP)/2,(TOP+FOOT)/2,HZ-12,NOSH);
// lower front: door + KOHYOUNG grille panel
box(machine,HX-STRIP,GR1-GR0,20,M.front2,(HX+STRIP)/2,(GR0+GR1)/2,HZ-10,NOSH);
(function(){
  const t=canvasTex(1024,190,(g,W,H)=>{g.fillStyle='#cfd3d7';g.fillRect(0,0,W,H);g.fillStyle='#3a3e44';for(let y=14;y<H-8;y+=13)for(let x=(y/13)%2?18:11;x<W-8;x+=14){g.beginPath();g.arc(x,y,3.4,0,7);g.fill();}
    g.fillStyle='#1b1d20';g.fillRect(W/2-270,H/2-44,540,88);g.strokeStyle='#8a9097';g.lineWidth=4;g.strokeRect(W/2-270,H/2-44,540,88);
    g.fillStyle='#e8eaec';g.font='600 60px "Arial",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('K O H Y O U N G',W/2,H/2+3);});
  const m=new THREE.Mesh(new THREE.PlaneGeometry(HX-STRIP-40,GR1-GR0-20),std(0xffffff,.5,.25,{map:t}));m.position.set((HX+STRIP)/2,(GR0+GR1)/2,HZ+.6);machine.add(m);
})();
const doors=[];
(function(){const g=new THREE.Group();g.position.set(STRIP,0,HZ);machine.add(g);
  box(g,HX-STRIP-4,GR0-FOOT-50,14,M.front,(HX-STRIP)/2,(GR0+FOOT+20)/2,-2,NOSH);
  box(g,16,110,16,M.dark,HX-STRIP-60,560,9,NOSH);
  const wt=canvasTex(128,128,(g2)=>{g2.clearRect(0,0,128,128);g2.fillStyle='#f2c400';g2.beginPath();g2.moveTo(64,12);g2.lineTo(118,110);g2.lineTo(10,110);g2.closePath();g2.fill();g2.strokeStyle='#111';g2.lineWidth=6;g2.stroke();g2.fillStyle='#111';g2.fillRect(59,44,10,34);g2.fillRect(59,86,10,10);});
  const w=new THREE.Mesh(new THREE.PlaneGeometry(46,46),new THREE.MeshBasicMaterial({map:wt,transparent:true}));w.position.set((HX-STRIP)/2,720,5.5);g.add(w);
  doors.push({g,dir:1,open:0,target:0});})();
// PC / electrical bay behind the door
box(machine,HX-STRIP-30,4,600,M.black,(HX+STRIP)/2,FOOT+40,HZ-310,NOSH);
box(machine,200,420,420,M.black,-180,FOOT+250,HZ-260);box(machine,170,8,4,M.aluD,-180,FOOT+390,HZ-49,NOSH);
cyl(machine,5,5,3,std(0x30ff70,.3,0,{emissive:0x30ff70,emissiveIntensity:2}),-130,FOOT+430,HZ-48,{rx:PI/2,cast:false});
box(machine,240,190,260,std(0x8d949c,.5,.5),130,FOOT+140,HZ-200);
[0x2d7be0,0x2d7be0,0xe8a020,0xdde2e6,0x30a050].forEach((c,i)=>box(machine,30,70,50,std(c,.5),60+i*36,FOOT+560,HZ-330,NOSH));
// upper front frame around the window
box(machine,HX-STRIP,WIN0-GR1,20,M.front,(HX+STRIP)/2,(WIN0+GR1)/2,HZ-10,NOSH);
box(machine,20,TOP-GR1,20,M.front,HX-10,(TOP+GR1)/2,HZ-10,NOSH);
// sides
(function(){
  const sh=new THREE.Shape();sh.moveTo(-HZ,GR0);sh.lineTo(HZ,GR0);sh.lineTo(HZ,TOP);sh.lineTo(-HZ,TOP);sh.closePath();
  const ho=new THREE.Path();ho.moveTo(-300,868);ho.lineTo(300,868);ho.lineTo(300,965);ho.lineTo(-300,965);ho.closePath();sh.holes.push(ho);
  const g=new THREE.ExtrudeGeometry(sh,{depth:20,bevelEnabled:false});
  [-HX+20,HX].forEach(x=>{const m=new THREE.Mesh(g,M.side);m.rotation.y=-PI/2;m.position.x=x;machine.add(m);});
  [-1,1].forEach(s=>{
    box(machine,30,150,680,M.black,s*(HX+6),916,0,{cast:false});                    // black conveyor port frame
    box(machine,34,104,612,new THREE.MeshBasicMaterial({color:0x050607}),s*(HX+7),916,0,NOSH);
    [[-640,1500],[640,1500],[-640,330],[640,330]].forEach(q=>box(machine,6,32,22,M.black,s*(HX+3),q[1],q[0],NOSH));
    box(machine,3,3,2*HZ-60,M.dark,s*(HX+1.5),GR0,0,NOSH);
  });
})();
box(machine,2*HX,20,HZ,M.front,0,TOP-10,-HZ/2,NOSH);                                  // rear roof
box(machine,2*HX,TOP-GR0,20,M.side,0,(TOP+GR0)/2,-HZ+10,NOSH);                      // rear wall
box(machine,2*HX,GR0-FOOT,20,M.side,0,(GR0+FOOT)/2,-HZ+10,NOSH);
// controls on the strip: E-stop top, start/stop pairs, key switch, second E-stop
(function(){const x=(-HX+STRIP)/2,z=HZ;
  [[1600],[1180]].forEach(a=>{box(machine,90,90,4,std(0xf2c400,.5),x,a[0],z+2,NOSH);cyl(machine,30,24,30,M.red,x,a[0],z+18,{rx:PI/2,cast:false});});
  [[1500,0x21b354,0xd03030],[1440,0x21b354,0xd03030],[1290,0x21b354,0xd03030]].forEach(a=>{
    cyl(machine,15,15,10,std(a[1],.4,.1,{emissive:a[1],emissiveIntensity:.5}),x-30,a[0],z+5,{rx:PI/2,cast:false});
    cyl(machine,15,15,10,std(a[2],.4,.1),x+30,a[0],z+5,{rx:PI/2,cast:false});});
  box(machine,46,46,6,std(0xe8e8e8,.5),x,1365,z+3,NOSH);cyl(machine,12,12,14,M.black,x,1365,z+10,{rx:PI/2,cast:false});
})();

/* --- front window cover (dark glass with aSPIre3 logo) — hinged at the roof, lifts up --- */
const hoodPivot=new THREE.Group();hoodPivot.position.set(0,TOP,0);machine.add(hoodPivot);
const glassMat=new THREE.MeshStandardMaterial({color:0x080b10,roughness:.06,metalness:.4,transparent:true,opacity:.8,depthWrite:false,side:THREE.DoubleSide});
(function(){
  const off=new THREE.Group();off.position.set(0,-TOP,0);hoodPivot.add(off);
  const x0=STRIP,x1=HX-20,cx=(x0+x1)/2,w=x1-x0;
  box(off,2*HX,20,HZ,M.front,0,TOP-10,HZ/2,NOSH);                                  // front roof panel
  const fs=new THREE.Shape();fs.moveTo(x0,WIN0);fs.lineTo(x1,WIN0);fs.lineTo(x1,TOP);fs.lineTo(x0,TOP);fs.closePath();
  const ho=new THREE.Path();ho.moveTo(x0+22,WIN0+22);ho.lineTo(x1-22,WIN0+22);ho.lineTo(x1-22,WIN1);ho.lineTo(x0+22,WIN1);ho.closePath();fs.holes.push(ho);
  const ff=new THREE.Mesh(new THREE.ExtrudeGeometry(fs,{depth:14,bevelEnabled:false}),M.front);ff.position.z=HZ-10;off.add(ff);
  const gl=new THREE.Mesh(new THREE.PlaneGeometry(w-44,WIN1-WIN0-22),glassMat);gl.position.set(cx,(WIN0+22+WIN1)/2,HZ-3);gl.renderOrder=5;off.add(gl);
  const lt=canvasTex(512,128,(g)=>{g.clearRect(0,0,512,128);g.font='300 92px "Segoe UI",Arial,sans-serif';g.textBaseline='middle';g.fillStyle='#35c3cf';g.fillText('aSPIre',8,66);g.fillStyle='#8fe3ea';g.fillText('3',300,66);});
  const lg=new THREE.Mesh(new THREE.PlaneGeometry(190,48),new THREE.MeshBasicMaterial({map:lt,transparent:true,depthWrite:false,toneMapped:false}));lg.position.set(x0+130,WIN1-50,HZ-1.5);lg.renderOrder=6;off.add(lg);
  const wt=canvasTex(128,128,(g2)=>{g2.clearRect(0,0,128,128);g2.fillStyle='#f2c400';g2.beginPath();g2.moveTo(64,12);g2.lineTo(118,110);g2.lineTo(10,110);g2.closePath();g2.fill();g2.strokeStyle='#111';g2.lineWidth=6;g2.stroke();g2.fillStyle='#111';g2.fillRect(59,44,10,34);g2.fillRect(59,86,10,10);});
  const wm=new THREE.Mesh(new THREE.PlaneGeometry(40,40),new THREE.MeshBasicMaterial({map:wt,transparent:true}));wm.position.set(x0+300,TOP-38,HZ+5);off.add(wm);
  box(off,260,14,14,M.steel,cx,WIN0+8,HZ+16,NOSH);
})();
const hood={open:0,target:0};

/* --- signal tower (rear right) --- */
const tower={};
(function(){
  const g=new THREE.Group();g.position.set(420,TOP,-560);machine.add(g);
  cyl(g,9,9,330,M.steel,0,165,0);cyl(g,22,26,14,M.black,0,7,0);
  [['r',0xff2a2a,410],['y',0xffa800,370],['g',0x22e06a,330]].forEach(a=>{const mt=new THREE.MeshStandardMaterial({color:a[1],emissive:a[1],emissiveIntensity:.05,roughness:.3,transparent:true,opacity:.92});tower[a[0]]=mt;cyl(g,22,22,38,mt,0,a[2]+19,0);});
  cyl(g,23,23,8,M.dark,0,452,0);
})();

/* --- monitor + keyboard tray on the right-hand arm (protrudes 457 mm) --- */
let monTex,monCtx;
(function(){
  const g=new THREE.Group();g.position.set(HX-40,0,HZ);machine.add(g);
  box(g,60,60,300,M.front2,0,1150,150);box(g,70,300,60,M.front2,0,1270,290);
  const m=new THREE.Group();m.position.set(60,1370,340);m.rotation.y=-.2;g.add(m);
  box(m,620,400,40,M.black,0,0,0);box(m,120,120,40,M.black,0,0,-36);
  const c=document.createElement('canvas');c.width=640;c.height=400;monCtx=c.getContext('2d');
  monTex=new THREE.CanvasTexture(c);monTex.encoding=THREE.sRGBEncoding;monTex.anisotropy=8;
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(586,366),new THREE.MeshBasicMaterial({map:monTex,toneMapped:false}));scr.position.set(0,0,21);m.add(scr);
  const k=new THREE.Group();k.position.set(-60,1100,360);k.rotation.y=-.12;g.add(k);
  box(k,560,14,220,M.black,0,0,0);box(k,380,12,130,std(0x2c2f34,.6),-60,13,-10);box(k,60,22,90,std(0x2c2f34,.5),180,17,0);
})();

/* --- neighbours in the line (upstream / downstream stubs) --- */
[-1,1].forEach(s=>{
  box(scene,640,1000,800,std(0x262c35,.75,.1),s*1020,500,0,NOSH);
  box(scene,4,100,620,M.black,s*699,916,0,NOSH);
  label(scene,s<0?'▶  FROM PRINTER':'TO PLACEMENT  ▶',520,70,s*1020,1001,300,{rx:-PI/2,fg:'#9fb4cf',pw:800,size:.5});
});

/* --- interior: bed, lighting --- */
const interior=new THREE.Group();machine.add(interior);
box(interior,956,24,1400,M.granite,0,852,0);box(interior,956,50,1400,M.dark,0,815,0,NOSH);
const inLight=new THREE.PointLight(0xdfeaff,.9,1900,1);inLight.position.set(0,1500,-150);interior.add(inLight);
box(interior,900,10,30,new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xcfe2ff,emissiveIntensity:.9}),0,1660,-690,NOSH);

/* --- conveyors (two lanes) --- */
const beltTexBase=canvasTex(64,16,(g)=>{g.fillStyle='#1c1e21';g.fillRect(0,0,64,16);g.fillStyle='#2c3035';for(let x=0;x<64;x+=16)g.fillRect(x,0,6,16);},{repeat:true});
const lanes=LANE_Z.map((z,i)=>{
  const L={i,z,state:'—',board:null,moving:0,g:new THREE.Group()};
  L.beltTex=beltTexBase.clone();L.beltTex.needsUpdate=true;L.beltTex.repeat.set(70,1);
  const bm=std(0xffffff,.9,0,{map:L.beltTex});
  const g=L.g;interior.add(g);
  [-1,1].forEach(s=>{
    const rz=z+s*(BD/2+7);
    box(g,1400,46,12,M.alu,0,CONV_Y-17,rz);                         // rail
    box(g,1400,6,5,M.aluD,0,CONV_Y+9,rz-s*3.5,NOSH);                // top guide lip
    box(g,1400,3,6,bm,0,CONV_Y-1.5,z+s*(BD/2-2.5),NOSH);            // belt
    [-420,-210,0,210,420].forEach(x=>box(g,30,30,14,M.aluD,x,865+7,rz)); // feet
    [-640,640].forEach(x=>cyl(g,9,9,14,M.black,x,CONV_Y-9,rz-s*8,{rx:PI/2,cast:false}));
    box(g,60,34,16,M.black,-440,CONV_Y-17,rz+s*14,NOSH);            // belt motor
  });
  // width-adjust lead screws
  [-420,420].forEach(x=>cyl(g,6,6,BD+40,M.steel,x,CONV_Y-30,z,{rx:PI/2,seg:10}));
  // board stopper + sensor
  L.stop=cyl(g,5,5,16,M.steel,BW/2+7,CONV_Y-12,z,{seg:12});
  box(g,14,10,10,std(0xff8a00,.5),BW/2+30,CONV_Y-22,z+BD/2-6,NOSH);
  // support plate under the board
  box(g,BW+20,6,BD-30,M.aluD,0,CONV_Y-30,z);
  for(let ix=-2;ix<=2;ix++)for(let iz=-1;iz<=1;iz++)cyl(g,3,3,26,M.steel,ix*50,CONV_Y-14,z+iz*60,{seg:8,cast:false});
  label(g,'LANE '+(i+1),90,22,-380,CONV_Y+13,z+BD/2+7+ (i?-22:22),{rx:-PI/2,fg:'#4fd1ff',pw:300,size:.7});
  return L;
});

/* --- XY linear-motor gantry --- */
const gantry={x:0,z:0};
const magT=canvasTex(256,16,(g)=>{for(let x=0;x<256;x+=16){g.fillStyle=(x/16)%2?'#8b6a2a':'#59431b';g.fillRect(x,0,16,16);}},{repeat:true});
(function(){
  [-1,1].forEach(s=>{
    [-640,350].forEach(z=>box(interior,60,330,60,M.aluD,s*430,864+165,z));
    box(interior,80,70,1100,M.alu,s*430,1229,-145);
    const mt=magT.clone();mt.needsUpdate=true;mt.rotation=PI/2;mt.repeat.set(20,1);
    box(interior,40,4,1060,std(0xffffff,.4,.6,{map:mt}),s*430,1266,-145,NOSH);
    box(interior,12,10,1060,M.steel,s*400,1268,-145,NOSH);
  });
})();
const beam=new THREE.Group();interior.add(beam);
box(beam,900,110,96,M.alu,0,1325,0);
box(beam,100,40,150,M.aluD,-430,1290,0);box(beam,100,40,150,M.aluD,430,1290,0);
(function(){const mt=magT.clone();mt.needsUpdate=true;mt.repeat.set(17,1);box(beam,780,40,4,std(0xffffff,.4,.6,{map:mt}),0,1325,50,NOSH);
  box(beam,780,10,8,M.steel,0,1368,50,NOSH);box(beam,780,10,8,M.steel,0,1282,50,NOSH);
  box(beam,860,26,60,M.black,0,1394,-10,NOSH);})(); // cable chain

/* --- optical head: 12 MP camera, IR-RGB LED ring, 4-way moiré projectors --- */
const head=new THREE.Group();interior.add(head);
const rings=[],projLens=[],projBeams=[];
let flashSpot,glowSprite,fovGlow,fovStripe,stripeTex;
const FOV_W=61.44,FOV_D=46.08;
(function(){
  const h=head,hb=std(0x1c1e22,.45,.35);
  box(h,200,150,34,M.aluD,0,1325,-68);
  box(h,190,300,18,M.alu,0,1200,-58);
  box(h,170,40,6,M.black,0,1285,-48.5,NOSH);label(h,'KOH YOUNG',150,22,0,1285,-45,{fg:'#dfe3e6',pw:420,size:.62});
  // camera
  box(h,84,100,84,hb,0,1300,0);label(h,'12MP',50,16,0,1312,42.6,{fg:'#9fe7ee',pw:256});
  cyl(h,10,10,26,M.black,18,1360,-12,{seg:12});
  cyl(h,26,26,130,M.black,0,1190,0);cyl(h,29,29,12,M.aluD,0,1240,0);cyl(h,30,30,10,M.aluD,0,1135,0);
  // projector cross body
  box(h,240,46,60,hb,0,1112,0);box(h,60,46,240,hb,0,1112,0);
  for(let k=0;k<4;k++){
    const a=k*PI/2,px=Math.cos(a)*150,pz=Math.sin(a)*150,g=new THREE.Group();g.position.set(px,1078,pz);h.add(g);g.lookAt(new THREE.Vector3(0,902,0));
    box(g,56,56,92,hb,0,0,-44);cyl(g,18,18,30,M.black,0,0,14,{rx:PI/2,seg:18});box(g,30,10,40,M.aluD,0,32,-50,NOSH);
    const lm=new THREE.MeshStandardMaterial({color:0x101828,emissive:0xbfe6ff,emissiveIntensity:0,roughness:.1});
    cyl(g,14,14,2,lm,0,0,30,{rx:PI/2,seg:18,cast:false});projLens.push(lm);
    box(h,22,70,22,M.aluD,Math.cos(a)*118,1120,Math.sin(a)*118);
    const ap=new THREE.Vector3(px,1078,pz).lerp(new THREE.Vector3(0,902,0),.14),y=CONV_Y+BT+.4,hw=FOV_W/2,hd=FOV_D/2;
    const c=[[-hw,y,-hd],[hw,y,-hd],[hw,y,hd],[-hw,y,hd]],v=[];
    for(let i=0;i<4;i++){const p=c[i],q=c[(i+1)%4];v.push(ap.x,ap.y,ap.z,p[0],p[1],p[2],q[0],q[1],q[2]);}
    const bg=new THREE.BufferGeometry();bg.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
    const bm=new THREE.Mesh(bg,new THREE.MeshBasicMaterial({color:0xbfe6ff,transparent:true,opacity:.16,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));
    bm.layers.set(1);bm.visible=false;h.add(bm);projBeams.push(bm);
  }
  // LED ring light housing (round, black) with white coax + R/G/B rings
  const rh=new THREE.Mesh(new THREE.CylinderGeometry(70,96,36,48,1,true),new THREE.MeshStandardMaterial({color:0x121316,roughness:.5,metalness:.3,side:THREE.DoubleSide}));
  rh.position.y=988;rh.castShadow=true;h.add(rh);
  const top=new THREE.Mesh(new THREE.RingGeometry(31,70,40),new THREE.MeshStandardMaterial({color:0x121316,roughness:.5,metalness:.3,side:THREE.DoubleSide}));top.rotation.x=-PI/2;top.position.y=1006;h.add(top);
  const bot=new THREE.Mesh(new THREE.RingGeometry(56,96,48),new THREE.MeshStandardMaterial({color:0x0c0d0f,roughness:.6,side:THREE.DoubleSide}));bot.rotation.x=-PI/2;bot.position.y=970;h.add(bot);
  [[60,0xffffff],[71,0xff3030],[80,0x30ff70],[89,0x3a70ff]].forEach(r=>{const mt=new THREE.MeshStandardMaterial({color:0x222222,emissive:r[1],emissiveIntensity:.04,roughness:.4});const t=new THREE.Mesh(new THREE.TorusGeometry(r[0],2.6,6,64),mt);t.rotation.x=PI/2;t.position.y=969.5;h.add(t);rings.push(mt);});
  cyl(h,22,22,6,M.aluD,0,1095,0);
  flashSpot=new THREE.SpotLight(0xffffff,0,700,.42,.55,1);flashSpot.position.set(0,1040,0);
  const tg=new THREE.Object3D();tg.position.set(0,900,0);h.add(tg);flashSpot.target=tg;h.add(flashSpot);
  const gt=canvasTex(128,128,(g)=>{const gr=g.createRadialGradient(64,64,4,64,64,64);gr.addColorStop(0,'rgba(255,255,255,1)');gr.addColorStop(.35,'rgba(255,255,255,.35)');gr.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=gr;g.fillRect(0,0,128,128);});
  glowSprite=new THREE.Sprite(new THREE.SpriteMaterial({map:gt,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
  glowSprite.scale.set(380,380,1);glowSprite.position.set(0,935,0);glowSprite.layers.set(1);h.add(glowSprite);
  const pg=new THREE.PlaneGeometry(FOV_W,FOV_D);pg.rotateX(-PI/2);
  fovGlow=new THREE.Mesh(pg,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));
  fovGlow.position.y=CONV_Y+BT+.3;fovGlow.layers.set(1);h.add(fovGlow);
  stripeTex=canvasTex(64,8,(g)=>{for(let x=0;x<64;x++){const v=Math.round(127+127*Math.sin(x/64*2*PI));g.fillStyle='rgb('+v+','+v+','+v+')';g.fillRect(x,0,1,8);}},{repeat:true});
  stripeTex.encoding=THREE.LinearEncoding;stripeTex.center.set(.5,.5);stripeTex.repeat.set(9,1);
  fovStripe=new THREE.Mesh(pg,new THREE.MeshBasicMaterial({map:stripeTex,color:0xcfeaff,transparent:true,opacity:.45,blending:THREE.AdditiveBlending,depthWrite:false}));
  fovStripe.position.y=CONV_Y+BT+.35;fovStripe.layers.set(2);fovStripe.visible=false;h.add(fovStripe);
  const fr=new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints([[-1,-1],[1,-1],[1,1],[-1,1]].map(p=>new THREE.Vector3(p[0]*FOV_W/2,CONV_Y+BT+.5,p[1]*FOV_D/2))),new THREE.LineBasicMaterial({color:0x4fd1ff,transparent:true,opacity:.9}));
  fr.layers.set(1);h.add(fr);head.userData.frame=fr;
})();

