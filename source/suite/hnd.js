
/* ===================================================================
   BOARD HANDLING LINE — nine handling machines, one page.
   Units mm.  X = board flow, Y = up, Z = toward the operator.
   Board top at 901.6 mm; lane 1 at z = +170, lane 2 at z = -170.
   Single-lane machines run on lane 1 (as the line printer does).
   =================================================================== */
const CONV_Y=900,BW=250,BD=200,BT=1.6,LZ=[170,-170],NOSH={cast:false};
const shellMats=[];
const sm=(c,r=.55,m=.05)=>{const x=std(c,r,m);shellMats.push(x);return x;};
const M={
  body:sm(0xdfe3e7,.5,.08),body2:sm(0xc6ccd3,.5,.12),frame:sm(0x3b4048,.55,.25),blue:sm(0x1e6fd9,.45,.12),
  dark:std(0x24272b,.6,.2),alu:std(0xb9c0c8,.35,.85),aluD:std(0x7d858f,.45,.8),steel:std(0xd5dadf,.22,.95),black:std(0x15171a,.55,.2),
  yellow:std(0xf2c400,.5),red:std(0xc8202a,.5,.1),green:std(0x21b354,.4,.1),mag:std(0x8d959e,.45,.6),magD:std(0x4a5058,.5,.5),
  rubber:std(0x1b1d20,.9,0),cup:std(0x2a2d31,.7,0),brush:std(0x2e3a5a,.95,0),glass:null
};
M.glass=new THREE.MeshStandardMaterial({color:0x9db4c8,roughness:.05,metalness:.2,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});
const KIT=makePCBKit(THREE,a=>BGU.mergeBufferGeometries(a,false),canvasTex);const FLAT=KIT.FLAT;

/* ---------- conveyor belt texture (animated while boards move) ---------- */
const beltTex=canvasTex(64,16,(g)=>{g.fillStyle='#1c1e21';g.fillRect(0,0,64,16);g.fillStyle='#2c3035';for(let x=0;x<64;x+=16)g.fillRect(x,0,6,16);},{repeat:true});
beltTex.repeat.set(.06,1);
const beltMat=std(0xffffff,.9,0,{map:beltTex});
function rails(g,xa,xb,z,y=CONV_Y,o={}){const len=xb-xa,cx=(xa+xb)/2;
  [-1,1].forEach(s=>{const rz=z+s*(BD/2+7);
    box(g,len,42,12,M.alu,cx,y-19,rz);box(g,len,6,5,M.aluD,cx,y+9,rz-s*3.5,NOSH);
    const b=new THREE.Mesh(new THREE.BoxGeometry(len,3,6),beltMat);b.position.set(cx,y-1.5,z+s*(BD/2-2.5));g.add(b);
    if(o.legs!==false)for(let x=xa+60;x<xb-20;x+=Math.max(200,len/3))box(g,26,y-40-(o.legBase||820),26,M.aluD,x,(y-40+(o.legBase||820))/2,rz);});
  if(o.motor!==false)box(g,60,34,16,M.black,xa+40,y-19,z+BD/2+21,NOSH);
}

/* ---------- generic enclosure: lower cabinet, posts, glass hood (lifts), function label ---------- */
function enclosure(m,o){
  const g=m.g,L=m.L,x0=-L/2,x1=L/2,D=o.D||1100,z0=o.z0??-D/2,z1=o.z1??D/2,H=o.H||1650,cab=o.cab||800;
  box(g,L,cab-100,z1-z0,M.body,0,(cab+100)/2,(z0+z1)/2,NOSH);
  box(g,L-40,90,z1-z0-60,M.dark,0,55,(z0+z1)/2,NOSH);
  [[x0+60,z0+60],[x1-60,z0+60],[x0+60,z1-60],[x1-60,z1-60]].forEach(p=>{cyl(g,30,36,14,M.steel,p[0],7,p[1]);cyl(g,10,10,60,M.steel,p[0],40,p[1]);});
  // front service doors on the cabinet
  const nd=Math.max(1,Math.round(L/600)),dw=(L-20)/nd;
  for(let i=0;i<nd;i++){box(g,dw-14,cab-260,6,M.body2,x0+10+dw*(i+.5),(cab+140)/2-20,z1+3,NOSH);box(g,12,90,12,M.dark,x0+10+dw*(i+1)-50,cab-260,z1+9,NOSH);}
  // function label band
  const lw=Math.min(L-40,o.labelW||L-40);
  label(g,m.name,lw,92,0,o.labelY||cab-70,z1+6.5,{bg:'#1e6fd9',fg:'#ffffff',pw:Math.round(lw*2),size:.62,weight:'900'});
  if(o.upper===false)return;
  // upper frame: posts + top rails + roof
  [[x0+15,z0+15],[x1-15,z0+15],[x0+15,z1-15],[x1-15,z1-15]].forEach(p=>box(g,30,H-cab,30,M.frame,p[0],(H+cab)/2,p[1]));
  box(g,L,24,30,M.frame,0,H-12,z0+15);box(g,L,24,30,M.frame,0,H-12,z1-15);box(g,30,24,z1-z0,M.frame,x0+15,H-12,(z0+z1)/2);box(g,30,24,z1-z0,M.frame,x1-15,H-12,(z0+z1)/2);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(L-30,8,z1-z0-30),M.body);roof.position.set(0,H-4,(z0+z1)/2);g.add(roof);shellMats.includes(M.body);
  // rear and side glass (side glass leaves the conveyor band open)
  const pg=(w,h,x,y,z,ry)=>{const p=new THREE.Mesh(new THREE.PlaneGeometry(w,h),M.glass);p.position.set(x,y,z);if(ry)p.rotation.y=ry;p.renderOrder=5;g.add(p);};
  pg(L-60,H-cab-40,0,(H+cab)/2,z0+2);
  [x0+2,x1-2].forEach(x=>pg(z1-z0-60,H-1000-30,x,(H+1000)/2-10,(z0+z1)/2,PI/2));
  // hood: front glass door hinged along the top front edge
  const hp=new THREE.Group();hp.position.set(0,H-20,z1-15);g.add(hp);
  const hw=L-70,hh=H-cab-50;
  const fr=new THREE.Group();hp.add(fr);
  box(fr,hw,18,14,M.frame,0,-hh+9,0,NOSH);box(fr,hw,16,14,M.frame,0,-8,0,NOSH);box(fr,16,hh,14,M.frame,-hw/2+8,-hh/2,0,NOSH);box(fr,16,hh,14,M.frame,hw/2-8,-hh/2,0,NOSH);
  const gl=new THREE.Mesh(new THREE.PlaneGeometry(hw-32,hh-34),M.glass);gl.position.set(0,-hh/2,2);gl.renderOrder=5;fr.add(gl);
  box(fr,Math.min(300,hw*.5),14,14,M.steel,0,-hh+36,20,NOSH);
  m.hoods.push({p:hp,open:0,target:0,ang:-1.15});
  m.H=H;
  return {x0,x1,z0,z1,H,cab};
}
function signal(m,x,z,H){const g=new THREE.Group();g.position.set(x,H,z);m.g.add(g);cyl(g,7,7,160,M.steel,0,80,0);
  const L={};[['r',0xff2a2a,214],['y',0xffa800,186],['g',0x22e06a,158]].forEach(a=>{const mt=new THREE.MeshStandardMaterial({color:a[1],emissive:a[1],emissiveIntensity:.05,roughness:.3});L[a[0]]=mt;cyl(g,16,16,26,mt,0,a[2]+13,0);});m.lamps=L;}

/* ---------- boards ---------- */
const bottomMat=std(0xffffff,.55,.05,{map:canvasTex(1000,800,(g,W,H)=>{g.fillStyle='#0f5a31';g.fillRect(0,0,W,H);g.strokeStyle='rgba(30,140,80,.25)';for(let i=-H;i<W;i+=12){g.beginPath();g.moveTo(i,0);g.lineTo(i+H,H);g.stroke();}
  g.fillStyle='#d9b85c';for(let i=0;i<260;i++){const x=Math.random()*W,y=Math.random()*H;g.fillRect(x,y,8,5);}
  g.fillStyle='#f1f3f0';g.font='700 46px Arial';g.fillText('BOTTOM SIDE',40,H-40);g.strokeStyle='#caa64a';g.lineWidth=6;g.strokeRect(3,3,W-6,H-6);})});
let serial=0;const DM_X=-40,DM_Z=-88,DM=12;
function newBoard(lane=0){
  const g=new THREE.Group(),piv=new THREE.Group();g.add(piv);
  const inner=KIT.inst(KIT.board);inner.position.y=-BT/2;piv.add(inner);
  const bot=new THREE.Mesh(FLAT(BW,BD),bottomMat);bot.rotation.x=PI;bot.position.y=-BT/2-.02;piv.add(bot);
  const c=document.createElement('canvas');c.width=c.height=112;const tex=new THREE.CanvasTexture(c);tex.encoding=THREE.sRGBEncoding;
  const dec=new THREE.Mesh(FLAT(DM,DM),new THREE.MeshBasicMaterial({map:tex,transparent:true,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-4}));
  dec.position.set(DM_X,BT/2+.03,DM_Z);dec.visible=false;piv.add(dec);
  const b={g,piv,dec,dc:c,dt:tex,x:-1e5,z:LZ[lane],dy:0,lane,flip:0,sn:++serial,marked:false,code:'',bits:null,alive:true};
  boardsG.add(g);boards.push(b);return b;
}
const boardsG=new THREE.Group();scene.add(boardsG);let boards=[];
function killBoard(b){b.alive=false;boardsG.remove(b.g);b.dt.dispose();}
function dmBits(sn){let h=sn*2654435761>>>0;const n=14,bits=[];for(let y=0;y<n;y++)for(let x=0;x<n;x++){let v;
  if(x==0||y==n-1)v=1;else if(y==0)v=x%2==0;else if(x==n-1)v=y%2==1;else{h^=h<<13;h^=h>>>17;h^=h<<5;v=(h>>>0)%100<48;}bits.push(v?1:0);}return bits;}
function drawMark(b,p){const c=b.dc,g=c.getContext('2d'),n=14,s=c.width/(n+2);g.clearRect(0,0,c.width,c.height);
  if(!b.bits)b.bits=dmBits(b.sn);g.fillStyle='rgba(40,120,70,.55)';g.fillRect(0,0,c.width,c.height);g.fillStyle='#e9f3df';
  const lim=Math.floor(p*n*n);for(let i=0;i<lim;i++)if(b.bits[i])g.fillRect(s*(1+i%n),s*(1+Math.floor(i/n)),s+.5,s+.5);b.dt.needsUpdate=true;b.dec.visible=true;}
function markFull(b){b.marked=true;b.code='SN2611'+String(b.sn).padStart(5,'0');drawMark(b,1);}

/* ---------- magazines (loader / unloader) ---------- */
const MAG={L:290,W:236,H:560,slots:20,pitch:24,y0:40};
function makeMag(){const g=new THREE.Group();
  [-1,1].forEach(s=>{box(g,MAG.L,MAG.H,6,M.mag,0,MAG.H/2,s*(MAG.W/2-3));
    for(let k=0;k<MAG.slots;k++)box(g,MAG.L-20,3,8,M.magD,0,MAG.y0+k*MAG.pitch-2,s*(MAG.W/2-9),NOSH);});
  box(g,MAG.L,8,MAG.W,M.magD,0,4,0);box(g,MAG.L,8,MAG.W,M.magD,0,MAG.H-4,0);box(g,60,20,20,M.black,0,MAG.H+12,0,NOSH);
  magsG.add(g);return {g,x:0,y:0,z:0,boards:new Array(MAG.slots).fill(null),alive:true};}
const magsG=new THREE.Group();scene.add(magsG);let mags=[];
function addMag(full){const mg=makeMag();if(full)for(let k=0;k<MAG.slots;k++){const b=newBoard(0);mg.boards[k]=b;}mags.push(mg);return mg;}
function killMag(mg){mg.alive=false;magsG.remove(mg.g);mg.boards.forEach(b=>b&&killBoard(b));}
const slotY=(mg,k)=>mg.y+MAG.y0+k*MAG.pitch;

/* =================================================================== machines */
const MACH=[];
function machine(o){const m=Object.assign({hoods:[],tags:[],inbox:[[],[]],busy:[false,false],state:'IDLE',done:0,outT:[],procT:[],log:[],lanesIn:[0],g:new THREE.Group()},o);
  MACH.push(m);scene.add(m.g);return m;}
const V=300; // conveyor speed mm/s

/* 1 ---- LOADER: triple-magazine line loader ---- */
const LOADER=machine({key:'loader',name:'LOADER',full:'Triple-magazine line loader',L:1450,source:true,
  specs:[['Function','Pushes bare boards out of magazines onto the line'],['Magazines','3 (1 in the elevator + 2 queued)'],['Magazine','≈ 535 × 460 × 563 mm class'],['Slots shown','20 × 24 mm pitch'],['Footprint','≈ 1450 × 1100 × 1750 mm (approx.)'],['Transport height','900 mm']],
  build(m){const e=enclosure(m,{D:1100,H:1750,labelW:700});
    const xm=-25;m.xm=xm;
    rails(m.g,115,725,LZ[0]);                                           // output conveyor
    [[1150,0],[250,0]].forEach(a=>{[-1,1].forEach(s=>{box(m.g,880,30,10,M.aluD,-285,a[0]-15,LZ[0]+s*100);box(m.g,880,4,30,beltMat,-285,a[0]-1,LZ[0]+s*100,NOSH);});});
    box(m.g,40,700,40,M.frame,xm-180,700,LZ[0]-160);box(m.g,40,700,40,M.frame,xm-180,700,LZ[0]+160);   // elevator columns
    m.lift=new THREE.Group();m.g.add(m.lift);box(m.lift,300,10,250,M.aluD,0,-5,0);box(m.lift,20,80,250,M.aluD,-160,30,0);
    m.pusher=new THREE.Group();m.g.add(m.pusher);box(m.pusher,120,40,60,M.black,-60,0,0);box(m.pusher,240,8,8,M.steel,120,0,0);box(m.pusher,10,30,80,M.steel,240,0,0);
    signal(m,e.x1-60,e.z0+60,1750);
    m.tags=[['Magazine elevator',xm,1500,LZ[0]],['Full magazines queue (top)',-430,1750,LZ[0]],['Empty magazines out (bottom)',-430,420,LZ[0]],['Board pusher',xm-200,960,LZ[0]]];},
  reset(m){m.elev=null;m.queue=[];m.pushX=0;
    for(let i=0;i<2;i++){const mg=addMag(true);mg.x=m.X(-305-280*i);mg.y=1150;mg.z=LZ[0];m.queue.push(mg);}
    m.liftY=860;m.slot=0;m.mi=0;},
  *run(m){
    while(true){
      if(!m.elev){m.state='MAGAZINE CHANGE';
        const q=m.queue.shift();yield* tw(1.4,k=>q.x=lerp(q.x0??(q.x0=q.x),m.X(m.xm),k));q.x0=undefined;m.elev=q;
        m.queue.forEach(o=>o.slide=true);
        yield* tw(.9,k=>{m.queue.forEach(o=>o.x=lerp(o.xs??(o.xs=o.x),o.xs+280,k));});m.queue.forEach(o=>o.xs=undefined);
        run(refill(m));
        yield* tw(1.2,k=>q.y=lerp(1150,860,ease(k)));m.mi++;
      }
      const mg=m.elev;let k=mg.boards.findIndex(b=>b);
      if(k<0){m.state='EMPTY MAGAZINE OUT';yield* tw(1.4,t=>mg.y=lerp(mg.ys??(mg.ys=mg.y),250,ease(t)));
        yield* tw(1.8,t=>mg.x=lerp(m.X(m.xm),m.X(-760),t));killMag(mg);m.elev=null;continue;}
      m.state='INDEX SLOT '+(k+1);const ty=CONV_Y-MAG.y0-k*MAG.pitch;yield* tw(.25,t=>mg.y=lerp(mg.y,ty,t));
      const b=mg.boards[k];mg.boards[k]=null;b.lane=0;
      m.state='PUSH BOARD';const t0=simTime;
      yield* tw(.9,t=>{m.pushX=t*200;b.x=m.X(m.xm)+t*200;});
      yield* tw(.4,t=>m.pushX=200*(1-t));
      yield* conveyTo(b,m.X(725-BW/2-10));
      m.procT.push(simTime-t0);m.busy[0]=true;yield* offer(m,b);m.busy[0]=false;m.done++;
    }},
  update(m){m.pusher.position.set(m.xm-405+m.pushX,906,LZ[0]);m.lift.position.set(m.xm,m.elev?m.elev.y:860,LZ[0]);},
  rows(m){return[['Magazine in elevator',m.elev?(MAG.slots-m.elev.boards.filter(b=>b).length)+' / '+MAG.slots+' pushed':'—'],['Full magazines queued',String(m.queue.length)],['Magazines used',String(m.mi)]];}
});
function* refill(m){yield 4;const mg=addMag(true);mg.y=1150;mg.z=LZ[0];const tx=m.X(-305-280*m.queue.length);mg.x=tx-600;m.queue.push(mg);yield* tw(1.5,k=>mg.x=lerp(tx-600,tx,k));}

/* 2 ---- DESTACKER: bare-board stack loader with suction head ---- */
const DESTACK=machine({key:'destacker',name:'DESTACKER',full:'Bare-board destacker',L:900,
  specs:[['Function','Picks bare boards off a stack and puts them on the conveyor; passes loader boards straight through'],['Stack','≈ 24 boards per load'],['Head','4 vacuum cups on a Z / up-down gantry'],['Footprint','≈ 900 × 1300 × 1650 mm (approx.)']],
  build(m){const e=enclosure(m,{D:1300,z0:-650,z1:650,H:1650});
    rails(m.g,-450,450,LZ[0]);
    m.table=new THREE.Group();m.g.add(m.table);box(m.table,300,14,240,M.aluD,0,-7,0);box(m.table,30,600,30,M.steel,0,-300,0);
    [-1,1].forEach(s=>{box(m.g,12,260,12,M.steel,s*140,1000,-260+110);box(m.g,12,260,12,M.steel,s*140,1000,-260-110);});
    box(m.g,60,60,1100,M.frame,0,1420,-80);                                   // Z gantry beam
    m.car=new THREE.Group();m.g.add(m.car);box(m.car,120,90,90,M.black,0,0,0);box(m.car,16,320,16,M.steel,0,-200,0);
    m.head=new THREE.Group();m.head.position.y=-330;m.car.add(m.head);box(m.head,220,14,160,M.aluD,0,0,0);
    m.cups=[];[[-80,-55],[80,-55],[-80,55],[80,55]].forEach(p=>{cyl(m.head,4,4,26,M.steel,p[0],-20,p[1],{seg:8});const c=new THREE.MeshStandardMaterial({color:0x2a2d31,emissive:0x40ff90,emissiveIntensity:0});m.cups.push(c);cyl(m.head,10,13,8,c,p[0],-36,p[1],{seg:16});});
    signal(m,e.x1-60,e.z0+60,1650);
    m.tags=[['Board stack on lift table',0,1050,-260],['Vacuum head (4 cups)',0,1300,-80],['Pass-through conveyor',-300,960,LZ[0]]];},
  reset(m){m.stack=[];for(let i=0;i<24;i++){const b=newBoard(0);b.x=m.X(0);b.z=-260;m.stack.push(b);}m.carZ=-260;m.carY=1150;m.vac=0;m.lastIn=simTime;m.loads=1;},
  *run(m){
    while(true){let b=null;const t0=simTime;
      if(m.inbox[0].length){b=m.inbox[0].shift();m.busy[0]=true;m.lastIn=simTime;m.state='PASS THROUGH';yield* conveyTo(b,m.X(450-BW/2-10));}
      else if(!lineMode||(simTime-m.lastIn>9&&LOADER.state=='MAGAZINE CHANGE')||simTime-m.lastIn>16){m.busy[0]=true;b=yield* pickStack(m);yield* conveyTo(b,m.X(450-BW/2-10));}
      else{m.state=lineMode?'PASS THROUGH · WAITING':'IDLE';yield FRAME;continue;}
      m.procT.push(simTime-t0);yield* offer(m,b);m.busy[0]=false;m.done++;}},
  update(m){const top=1000;m.tableY=top-m.stack.length*BT;m.table.position.set(0,m.tableY,-260);
    m.stack.forEach((b,i)=>{b.x=m.X(0);b.z=-260;b.dy=m.tableY+i*BT+BT/2-(CONV_Y+BT/2);});
    m.car.position.set(0,m.carY+370,m.carZ);m.cups.forEach(c=>c.emissiveIntensity=m.vac*1.5);
    if(m.held){m.held.x=m.X(0);m.held.z=m.carZ;m.held.dy=m.carY-BT-CONV_Y;}},
  rows(m){return[['Boards on stack',String(m.stack.length)],['Stack loads',String(m.loads)],['Mode',lineMode?'pass-through + fill gaps':'destack']];}
});
function* pickStack(m){
  if(!m.stack.length){m.state='OPERATOR LOADS STACK';yield 4;for(let i=0;i<24;i++){const b=newBoard(0);m.stack.push(b);}m.loads++;}
  m.state='PICK FROM STACK';
  yield* tw(.8,k=>m.carZ=lerp(m.carZ,-260,k));
  const topY=1000;yield* tw(.6,k=>m.carY=lerp(1150,topY,ease(k)));m.vac=1;yield .25;
  const b=m.stack.pop();m.held=b;
  yield* tw(.5,k=>m.carY=lerp(topY,1150,ease(k)));
  m.state='PLACE ON CONVEYOR';yield* tw(.9,k=>m.carZ=lerp(-260,LZ[0],ease(k)));
  yield* tw(.5,k=>m.carY=lerp(1150,CONV_Y+BT,ease(k)));m.vac=0;m.held=null;b.dy=0;b.z=LZ[0];b.lane=0;yield .2;
  run(tw(.5,k=>m.carY=lerp(CONV_Y+BT,1150,ease(k))));
  return b;}

/* 3 ---- LASER: laser marker writes a 2D code on every board ---- */
const LASER=machine({key:'laser',name:'LASER MARKER',full:'Laser marker (2D code)',L:1000,
  specs:[['Function','Marks a unique 2D data-matrix code on each bare board'],['Laser','Fibre laser with galvo scanner, class-1 enclosure'],['Mark','14 × 14 data matrix, 12 × 12 mm'],['Check','Camera reads the code back after marking'],['Footprint','≈ 1000 × 1300 × 1750 mm (approx.)']],
  build(m){const e=enclosure(m,{D:1300,z0:-650,z1:650,H:1750});
    rails(m.g,-500,500,LZ[0]);m.stop=cyl(m.g,5,5,16,M.steel,40+BW/2+7,CONV_Y-12,LZ[0],{seg:10});
    box(m.g,40,560,40,M.frame,-420,1250,-450);box(m.g,40,560,40,M.frame,420,1250,-450);box(m.g,900,50,50,M.frame,0,1520,-450);
    box(m.g,60,40,900,M.aluD,0,1480,0);                                       // Z axis for the scan head
    m.head=new THREE.Group();m.g.add(m.head);box(m.head,160,180,160,M.black,0,0,0);cyl(m.head,40,46,60,M.dark,0,-120,0);
    m.lensM=new THREE.MeshStandardMaterial({color:0x101018,emissive:0x50ff60,emissiveIntensity:0});cyl(m.head,30,30,4,m.lensM,0,-152,0,{cast:false});
    label(m.head,'LASER',140,30,0,40,80.5,{fg:'#ffffff',pw:280});
    m.beam=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,1,6),new THREE.MeshBasicMaterial({color:0x80ff90,transparent:true,opacity:.85,blending:THREE.AdditiveBlending,depthWrite:false}));m.beam.visible=false;m.g.add(m.beam);
    m.spark=new THREE.PointLight(0x9cff9c,0,260,2);m.g.add(m.spark);
    box(m.g,120,120,120,M.dark,-330,1000,-300);cyl(m.g,22,22,400,M.black,-330,1200,-300);   // fume extraction
    m.cam=new THREE.MeshStandardMaterial({color:0x111,emissive:0xffffff,emissiveIntensity:0});box(m.g,60,60,60,M.black,200,1300,LZ[0]-60);box(m.g,30,4,30,m.cam,200,1268,LZ[0]-60,NOSH);
    signal(m,e.x1-60,e.z0+60,1750);
    m.tags=[['Galvo laser head',0,1480,0],['Fume extraction',-330,1420,-300],['Code verification camera',200,1360,LZ[0]-60]];},
  reset(m){m.hz=0;m.beamP=null;m.camF=0;},
  *run(m){yield* stdRun(m,0,function*(b){
    m.state='BOARD IN';yield* conveyTo(b,m.X(40));m.state='CLAMP';yield .3;
    const tx=40+DM_X,tz=LZ[0]+DM_Z;m.state='HEAD TO MARK';yield* tw(.5,k=>m.hz=lerp(m.hz,tz,k));
    m.state='LASER MARKING';const T=3;let t=0;b.marked=true;b.code='SN2611'+String(b.sn).padStart(5,'0');
    while(t<T){const dt=yield FRAME;t+=dt;const p=Math.min(1,t/T);drawMark(b,p);const n=14,i=Math.floor(p*n*n),cx=i%n,cy=Math.floor(i/n);
      m.beamP=[tx+(cx-6.5)*DM/16,tz+(cy-6.5)*DM/16];}
    m.beamP=null;m.state='VERIFY CODE';m.camF=1;yield .25;m.camF=0;log('LASER #'+b.sn+' marked '+b.code,'ok');yield .2;
    yield* conveyTo(b,m.X(500-BW/2-10));});},
  update(m){m.head.position.set(0,1330,m.hz);const on=!!m.beamP;m.beam.visible=on;m.lensM.emissiveIntensity=on?2:0;m.spark.intensity=on?(1.2+Math.random()):0;
    if(on){const A=new THREE.Vector3(0,1330-154,m.hz),P=new THREE.Vector3(m.beamP[0],CONV_Y+BT+.1,m.beamP[1]),d=P.clone().sub(A);
      m.beam.position.copy(A).addScaledVector(d,.5);m.beam.scale.set(1,d.length(),1);m.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.spark.position.set(P.x,P.y+20,P.z);}
    m.cam.emissiveIntensity=m.camF*3;},
  rows(m){return[['Boards marked',String(m.done)],['Last code',m.lastCode||'—']];}
});

/* 4 ---- CLEANING: board surface cleaning conveyor (brush + vacuum + ionizer) ---- */
const CLEAN=machine({key:'cleaning',name:'CLEANER',full:'Board cleaning conveyor',L:1000,
  specs:[['Function','Removes dust and particles from the bare board (top and bottom) before printing'],['Cleaning','Rotating brush rollers + vacuum hood + ionizer bar'],['Pass speed','≈ 120 mm/s through the brushes'],['Length','1000 mm'],['Footprint','≈ 1000 × 900 × 1350 mm (approx.)']],
  build(m){const e=enclosure(m,{D:900,H:1350});
    rails(m.g,-500,500,LZ[0]);
    m.rolls=[];const mkRoll=(y)=>{const g=new THREE.Group();g.position.set(0,y,LZ[0]);m.g.add(g);
      const r=new THREE.Mesh(new THREE.CylinderGeometry(34,34,250,24),M.brush);r.rotation.x=PI/2;g.add(r);
      for(let i=0;i<12;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(6,6,250),std(0x50607f,.9));const a=i/12*PI*2;s.position.set(Math.cos(a)*34,Math.sin(a)*34,0);g.add(s);}
      cyl(m.g,8,8,300,M.steel,0,y,LZ[0],{rx:PI/2});m.rolls.push(g);};
    mkRoll(CONV_Y+BT+34);mkRoll(CONV_Y-34);
    box(m.g,300,120,300,M.body2,0,CONV_Y+150,LZ[0]);cyl(m.g,45,45,260,M.aluD,0,CONV_Y+340,LZ[0]);   // vacuum hood + duct
    m.ion=new THREE.MeshStandardMaterial({color:0x223,emissive:0x4fa8ff,emissiveIntensity:.6});box(m.g,30,16,260,m.ion,-180,CONV_Y+60,LZ[0]);
    m.dust=pts(160,0xd8d0b8,7);m.g.add(m.dust.p);
    m.tags=[['Brush rollers (top + bottom)',0,CONV_Y+90,LZ[0]+130],['Vacuum hood',0,CONV_Y+230,LZ[0]],['Ionizer bar',-180,CONV_Y+80,LZ[0]]];},
  reset(m){m.spin=0;m.active=0;},
  *run(m){yield* stdRun(m,0,function*(b){m.state='BOARD IN';yield* conveyTo(b,m.X(-260));m.state='BRUSH + VACUUM';m.active=1;yield* conveyTo(b,m.X(260),120);m.active=0;m.state='BOARD OUT';yield* conveyTo(b,m.X(500-BW/2-10));});},
  update(m,dt){m.spin+=dt*(m.active?14:2);m.rolls[0].rotation.z=m.spin;m.rolls[1].rotation.z=-m.spin;
    const d=m.dust;for(let i=0;i<d.n;i++){if(d.life[i]<=0&&m.active&&Math.random()<dt*12){d.life[i]=1;d.pos[i*3]=(Math.random()-.5)*60;d.pos[i*3+1]=CONV_Y+5;d.pos[i*3+2]=LZ[0]+(Math.random()-.5)*190;}
      if(d.life[i]>0){d.life[i]-=dt*.9;d.pos[i*3+1]+=dt*220;d.pos[i*3]*=.98;if(d.life[i]<=0)d.pos[i*3+1]=-1e4;}}d.p.geometry.attributes.position.needsUpdate=true;},
  rows(m){return[['Boards cleaned',String(m.done)],['Brushes',m.active?'cleaning':'idle']];}
});
function pts(n,col,size){const pos=new Float32Array(n*3).fill(-1e4),life=new Float32Array(n);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  const p=new THREE.Points(geo,new THREE.PointsMaterial({color:col,size,transparent:true,opacity:.8,depthWrite:false}));p.frustumCulled=false;return{p,pos,life,n};}

/* 5 ---- SHUTTLE: dual-track shuttle conveyor (single lane in, lane 1 or 2 out) ---- */
const SHUTTLE=machine({key:'shuttle',name:'SHUTTLE',full:'Dual-track shuttle conveyor',L:1000,
  specs:[['Function','Takes boards from the single lane and moves them sideways to lane 1 or lane 2'],['Travel','340 mm (lane 1 ↔ lane 2)'],['Lane choice','alternating, skips a lane that is full downstream'],['Footprint','≈ 1000 × 1100 × 1350 mm (approx.)']],
  build(m){const e=enclosure(m,{D:1100,H:1350});
    [-1,1].forEach(s=>{box(m.g,40,30,700,M.steel,s*380,CONV_Y-90,0);});           // Z guide rails
    m.car=new THREE.Group();m.g.add(m.car);rails(m.car,-460,460,0,CONV_Y,{legs:false});box(m.car,900,20,260,M.aluD,0,CONV_Y-60,0);[-1,1].forEach(s=>box(m.car,60,40,60,M.black,s*380,CONV_Y-70,0));
    m.tags=[['Shuttle carriage',0,CONV_Y+60,0],['Lane 1',-420,CONV_Y+40,LZ[0]],['Lane 2',-420,CONV_Y+40,LZ[1]]];},
  reset(m){m.cz=LZ[0];m.next=0;},
  *run(m){while(true){
    while(!m.inbox[0].length){m.state='WAIT AT LANE 1';yield FRAME;}
    const b=m.inbox[0].shift();m.busy[0]=true;const t0=simTime;
    m.state='BOARD IN';yield* conveyTo(b,m.X(0));
    const n=nextOf(m);let tl=m.next;if(n&&!n.accepts(tl)&&n.accepts(1-tl))tl=1-tl;m.next=1-tl;
    m.state='TRAVERSE TO LANE '+(tl+1);const z0=m.cz;yield* tw(1.1,k=>{m.cz=lerp(z0,LZ[tl],ease(k));b.z=m.cz;});b.lane=tl;
    yield* conveyTo(b,m.X(500-BW/2-10));m.procT.push(simTime-t0);
    yield* offer(m,b);
    while(b.alive&&b.x<m.X(500)+BW/2+20)yield FRAME;
    m.state='RETURN TO LANE 1';const z1=m.cz;yield* tw(1.0,k=>m.cz=lerp(z1,LZ[0],ease(k)));
    m.busy[0]=false;m.done++;}},
  update(m){m.car.position.z=m.cz;},
  rows(m){return[['Carriage at',m.cz>0?'lane 1':m.cz<-169?'lane 2':'moving'],['Boards shuttled',String(m.done)]];}
});

/* 6 ---- SCANNER: dual-track scanning conveyor reads the 2D code ---- */
const SCAN=machine({key:'scanner',name:'SCANNER',full:'Dual-track scanning conveyor',L:500,lanesIn:[0,1],
  specs:[['Function','Reads the laser-marked 2D code of every board on both lanes (traceability)'],['Readers','1 code reader per lane'],['Length','500 mm, dual track'],['Footprint','≈ 500 × 1100 × 1350 mm (approx.)']],
  build(m){const e=enclosure(m,{D:1100,H:1350,labelW:460});
    LZ.forEach(z=>rails(m.g,-250,250,z));
    box(m.g,40,40,700,M.frame,-60,1180,0);m.heads=[];m.fans=[];
    LZ.forEach((z,i)=>{const g=new THREE.Group();g.position.set(-60,1120,z+DM_Z+10);m.g.add(g);box(g,70,90,60,M.black,0,0,0);
      const lm=new THREE.MeshStandardMaterial({color:0x200,emissive:0xff2020,emissiveIntensity:0});cyl(g,14,14,4,lm,0,-46,0,{cast:false});m.heads.push(lm);
      const f=new THREE.Mesh(new THREE.ConeGeometry(30,1120-CONV_Y-48,4,1,true),new THREE.MeshBasicMaterial({color:0xff3030,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));
      f.position.set(-60,(1120-46+CONV_Y)/2,z+DM_Z+10);f.visible=false;m.g.add(f);m.fans.push(f);});
    m.tags=[['Code reader lane 1',-60,1180,LZ[0]],['Code reader lane 2',-60,1180,LZ[1]]];},
  reset(m){m.read=[0,0];m.res=['—','—'];m.fail=0;},
  *run(m,l){yield* stdRun(m,l,function*(b){m.state='READING';yield* conveyTo(b,m.X(-60-DM_X));m.read[l]=1;yield .45;
    m.res[l]=b.marked?b.code:'NO READ';if(!b.marked)m.fail++;log('SCAN L'+(l+1)+' #'+b.sn+' '+(b.marked?'read '+b.code:'NO READ'),b.marked?'ok':'ng');m.read[l]=0;
    yield* conveyTo(b,m.X(250-BW/2-10));});},
  update(m){m.heads.forEach((h,i)=>{h.emissiveIntensity=m.read[i]?2.5:.1;m.fans[i].visible=!!m.read[i];});},
  rows(m){return[['Lane 1 last read',m.res[0]],['Lane 2 last read',m.res[1]],['No-reads',String(m.fail)]];}
});

/* 7 ---- FIFO: dual-track buffer, first in first out ---- */
const NSL=8,PIT=90;
const FIFO=machine({key:'fifo',name:'FIFO BUFFER',full:'Dual-track belt FIFO buffer',L:1100,lanesIn:[0,1],
  specs:[['Function','Buffers boards on both lanes when downstream is slow or stopped; releases them in arrival order'],['Capacity','8 boards per lane (shown)'],['Slot pitch','90 mm'],['Mode','FIFO (first in, first out)'],['Footprint','≈ 1100 × 1100 × 1800 mm (approx.)']],
  build(m){const e=enclosure(m,{D:1100,H:1800,cab:250});
    LZ.forEach(z=>{rails(m.g,-550,-300,z,CONV_Y,{legBase:250});rails(m.g,300,550,z,CONV_Y,{legBase:250});});
    m.racks=LZ.map(z=>{const g=new THREE.Group();m.g.add(g);
      [-1,1].forEach(s=>{box(g,560,(NSL-1)*PIT+60,10,M.mag,0,((NSL-1)*PIT)/2,z+s*(BD/2+16));
        for(let k=0;k<NSL;k++){box(g,560,4,14,M.rubber,0,k*PIT-3,z+s*(BD/2+6),NOSH);}});
      box(g,560,10,BD+40,M.magD,0,-30,z);return g;});
    [-1,1].forEach(s=>LZ.forEach(z=>[-1,1].forEach(q=>box(m.g,30,1450,30,M.frame,s*300,975,z+q*(BD/2+40)))));
    m.tags=[['Lane 1 buffer rack',0,1800,LZ[0]],['Lane 2 buffer rack',0,1800,LZ[1]]];},
  reset(m){m.slots=[new Array(NSL).fill(null),new Array(NSL).fill(null)];m.rackY=[CONV_Y,CONV_Y];m.lock=[false,false];m.inB=[false,false];m.peak=[0,0];},
  accepts(l){return !this.inbox[l].length&&!this.inB[l]&&this.slots[l].filter(s=>s).length<NSL;},
  *run(m,l){run(fifoOut(m,l));
    while(true){while(!m.inbox[l].length)yield FRAME;const b=m.inbox[l].shift();m.inB[l]=true;
      while(m.lock[l])yield FRAME;m.lock[l]=true;
      const k=m.slots[l].findIndex(s=>!s);m.state='STORE L'+(l+1)+' → SLOT '+(k+1);
      yield* rackTo(m,l,CONV_Y-k*PIT);yield* conveyTo(b,m.X(0));m.slots[l][k]={b,t:simTime};m.inB[l]=false;m.lock[l]=false;
      m.peak[l]=Math.max(m.peak[l],m.slots[l].filter(s=>s).length);}},
  update(m){m.racks.forEach((g,l)=>{g.position.y=m.rackY[l];m.slots[l].forEach((s,k)=>{if(s){s.b.x=m.X(0);s.b.z=LZ[l];s.b.dy=m.rackY[l]+k*PIT-CONV_Y;}});});},
  rows(m){return[['Lane 1 stored',m.slots[0].filter(s=>s).length+' / '+NSL],['Lane 2 stored',m.slots[1].filter(s=>s).length+' / '+NSL],['Output',fifoGate(m)?'release':'held (downstream busy)']];}
});
function fifoGate(m){if(lineMode)return true;const c=simTime%60;return c<30;}   // single view: downstream is "stopped" half the time so the buffer fills and drains
function* rackTo(m,l,y){const y0=m.rackY[l],d=Math.abs(y-y0);if(d<.5)return;yield* tw(.15+d/450,k=>m.rackY[l]=lerp(y0,y,ease(k)));}
function* fifoOut(m,l){while(true){
  const occ=m.slots[l].map((s,k)=>s&&{k,t:s.t,b:s.b}).filter(Boolean).sort((a,b)=>a.t-b.t);
  const n=nextOf(m);
  if(!occ.length||m.lock[l]||!fifoGate(m)||(n&&!n.accepts(l))){yield FRAME;continue;}
  m.lock[l]=true;const o=occ[0];m.state='RELEASE L'+(l+1)+' ← SLOT '+(o.k+1);const t0=o.t;
  yield* rackTo(m,l,CONV_Y-o.k*PIT);m.slots[l][o.k]=null;o.b.dy=0;
  const out=conveyTo(o.b,m.X(550-BW/2-10));m.lock[l]=false;yield* out;
  m.procT.push(simTime-t0);yield* offer(m,o.b);m.done++;}}

/* 8 ---- INVERTER: X-axis board inverter (flips the board 180° about the travel axis) ---- */
const INVERT=machine({key:'inverter',name:'INVERTER',full:'X-axis board inverter',L:700,lanesIn:[0,1],
  specs:[['Function','Turns the board upside down (180° about the conveyor axis) so the bottom side can be processed'],['Rotors','1 per lane'],['Flip time','≈ 1.6 s'],['Footprint','≈ 700 × 1100 × 1350 mm (approx.)']],
  build(m){const e=enclosure(m,{D:1100,H:1350,labelW:660});
    m.rot=LZ.map(z=>{const g=new THREE.Group();g.position.set(0,CONV_Y+BT/2,z);m.g.add(g);
      [-1,1].forEach(s=>{const d=new THREE.Mesh(new THREE.TorusGeometry(150,10,8,40),M.aluD);d.rotation.y=PI/2;d.position.x=s*300;g.add(d);
        for(let a=0;a<4;a++){const sp=new THREE.Mesh(new THREE.BoxGeometry(8,300,8),M.aluD);sp.rotation.x=a*PI/4;sp.position.x=s*300;g.add(sp);}});
      [-1,1].forEach(v=>{[-1,1].forEach(s=>{box(g,600,10,12,M.alu,0,v*(BT/2+13),s*(BD/2+7));const bl=new THREE.Mesh(new THREE.BoxGeometry(600,3,6),beltMat);bl.position.set(0,v*(BT/2+2.5),s*(BD/2-2.5));g.add(bl);});});
      return g;});
    LZ.forEach(z=>{box(m.g,40,140,40,M.frame,-330,CONV_Y-100,z);box(m.g,40,140,40,M.frame,330,CONV_Y-100,z);});
    m.tags=[['Flip rotor lane 1',0,CONV_Y+200,LZ[0]],['Flip rotor lane 2',0,CONV_Y+200,LZ[1]]];},
  reset(m){m.ang=[0,0];},
  *run(m,l){yield* stdRun(m,l,function*(b){m.state='BOARD IN L'+(l+1);yield* conveyTo(b,m.X(0));yield .2;m.state='FLIP L'+(l+1);
    const a0=m.ang[l],f0=b.flip;yield* tw(1.6,k=>{m.ang[l]=a0+PI*ease(k);b.flip=f0+PI*ease(k);});b.flipped=!b.flipped;yield .2;
    m.state='BOARD OUT L'+(l+1);yield* conveyTo(b,m.X(350-BW/2-10));});},
  update(m){m.rot.forEach((g,l)=>g.rotation.x=m.ang[l]);},
  rows(m){return[['Boards flipped',String(m.done)]];}
});

/* 9 ---- UNLOADER: triple-magazine line unloader (takes both lanes) ---- */
const UNLOAD=machine({key:'unloader',name:'UNLOADER',full:'Triple-magazine line unloader',L:1450,lanesIn:[0,1],sink:true,
  specs:[['Function','Pushes finished boards into magazines; the elevator moves sideways to take lane 1 or lane 2'],['Magazines','3 (1 in the elevator + 2 empties queued)'],['Slots shown','20 × 24 mm pitch'],['Footprint','≈ 1450 × 1100 × 1750 mm (approx.)']],
  build(m){const e=enclosure(m,{D:1100,H:1750,labelW:700});
    const xm=25;m.xm=xm;LZ.forEach(z=>rails(m.g,-725,-165,z));
    [[1150,0],[250,0]].forEach(a=>{[-1,1].forEach(s=>{box(m.g,610,30,10,M.aluD,420,a[0]-15,s*100);box(m.g,610,4,30,beltMat,420,a[0]-1,s*100,NOSH);});});
    box(m.g,40,40,600,M.steel,xm,200,0);box(m.g,40,40,600,M.steel,xm,1600,0);
    m.lift=new THREE.Group();m.g.add(m.lift);box(m.lift,300,10,250,M.aluD,0,-5,0);box(m.lift,20,80,250,M.aluD,160,30,0);
    signal(m,e.x1-60,e.z0+60,1750);
    m.tags=[['Magazine elevator (moves to lane 1 / 2)',xm,1500,0],['Full magazines out (top)',430,1750,0],['Empty magazines in (bottom)',430,420,0]];},
  reset(m){m.elev=null;m.queue=[];m.mi=0;m.stored=0;
    for(let i=0;i<2;i++){const mg=addMag(false);mg.x=m.X(305+280*i);mg.y=250;mg.z=0;m.queue.push(mg);}},
  accepts(l){return !this.inbox[l].length;},
  *run(m){let turn=0;
    while(true){
      if(!m.elev){m.state='EMPTY MAGAZINE IN';const q=m.queue.shift();yield* tw(1.4,k=>q.x=lerp(m.X(305),m.X(m.xm),k));m.elev=q;
        yield* tw(.9,k=>m.queue.forEach(o=>o.x=lerp(o.xs??(o.xs=o.x),o.xs-280,k)));m.queue.forEach(o=>o.xs=undefined);run(urefill(m));
        yield* tw(1.0,k=>q.y=lerp(250,CONV_Y-MAG.y0-(MAG.slots-1)*MAG.pitch,ease(k)));m.mi++;}
      const mg=m.elev;const k=mg.boards.lastIndexOf(null);
      if(k<0){m.state='FULL MAGAZINE OUT';const z0=mg.z;yield* tw(.8,t=>mg.z=lerp(z0,0,ease(t)));const y0=mg.y;yield* tw(1.2,t=>mg.y=lerp(y0,1150,ease(t)));
        yield* tw(1.8,t=>mg.x=lerp(m.X(m.xm),m.X(780),t));m.state='OPERATOR TAKES MAGAZINE';yield lineMode?14:3;killMag(mg);m.elev=null;continue;}
      while(!m.inbox[0].length&&!m.inbox[1].length){m.state='WAIT FOR BOARD';yield FRAME;}
      let l=m.inbox[turn].length?turn:1-turn;turn=1-l;const b=m.inbox[l].shift();const t0=simTime;
      const ty=CONV_Y-MAG.y0-k*MAG.pitch;m.state='ALIGN TO LANE '+(l+1)+' · SLOT '+(k+1);const z0=mg.z,y0=mg.y;
      yield* tw(.25+Math.abs(LZ[l]-z0)/600,t=>{mg.z=lerp(z0,LZ[l],ease(t));mg.y=lerp(y0,ty,ease(t));});
      m.state='BOARD INTO MAGAZINE';yield* conveyTo(b,m.X(m.xm));mg.boards[k]=b;m.stored++;m.outT.push(simTime);m.procT.push(simTime-t0);m.done++;}},
  update(m){m.lift.position.set(m.xm,m.elev?m.elev.y:250,m.elev?m.elev.z:0);},
  rows(m){return[['Magazine in elevator',m.elev?m.elev.boards.filter(b=>b).length+' / '+MAG.slots+' filled':'—'],['Empty magazines queued',String(m.queue.length)],['Boards stored',String(m.stored)]];}
});
function* urefill(m){yield 4;const mg=addMag(false);mg.y=250;mg.z=0;const tx=m.X(305+280*m.queue.length);mg.x=tx+600;m.queue.push(mg);yield* tw(1.5,k=>mg.x=lerp(tx+600,tx,k));}

/* ---------- line layout ---------- */
const TOTAL=MACH.reduce((s,m)=>s+m.L,0);
{let x=-TOTAL/2;MACH.forEach((m,i)=>{m.i=i;m.x0=x;m.x1=x+m.L;m.cx=x+m.L/2;m.X=lx=>m.cx+lx;m.g.position.x=m.cx;m.build(m);x+=m.L;});}

/* ===================================================================
   FLOW ENGINE — coroutines; each machine hands boards to the next one
   =================================================================== */
const FRAME=-1;let cos=[];
class Co{constructor(g){this.g=g;this.wait=0;this.done=false;}
  step(dt){if(this.done)return;this.wait-=dt;let pass=dt,guard=0;
    while(this.wait<=0&&guard++<64){const r=this.g.next(pass);pass=0;if(r.done){this.done=true;return;}if(r.value===FRAME){this.wait=1e-9;return;}this.wait+=r.value;}}}
function run(g){const c=new Co(g);cos.push(c);return c;}
const lerp=(a,b,k)=>a+(b-a)*k,ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function* tw(dur,fn){let t=0;fn(0);while(t<dur){t+=yield FRAME;fn(Math.min(1,t/dur));}}
let moving=0;
function* conveyTo(b,x,v=V){moving++;while(Math.abs(b.x-x)>.01){const dt=yield FRAME;const d=x-b.x;b.x+=Math.sign(d)*Math.min(Math.abs(d),v*dt);}moving--;}
let lineMode=false,sel=0,active=[];
const nextOf=m=>{const i=active.indexOf(m);return i>=0&&i<active.length-1?active[i+1]:null;};
MACH.forEach(m=>{if(!m.accepts)m.accepts=function(l){return !this.busy[l]&&!this.inbox[l].length;};});
function* offer(m,b){const n=nextOf(m);m.outT.push(simTime);
  if(!n){run((function*(){yield* conveyTo(b,m.x1+420);killBoard(b);})());return;}
  const st=m.state;while(!n.accepts(b.lane)){m.state='WAIT FOR '+n.name;yield FRAME;}m.state=st;n.inbox[b.lane].push(b);}
function* stdRun(m,l,proc){while(true){while(!m.inbox[l].length){if(!m.busy[0]&&!m.busy[1])m.state='WAIT FOR BOARD';yield FRAME;}
  const b=m.inbox[l].shift();m.busy[l]=true;const t0=simTime;yield* proc(b);m.procT.push(simTime-t0);if(b.code)m.lastCode=b.code;yield* offer(m,b);m.busy[l]=false;m.done++;}}
/* single-machine view: boards are fed in from a stub on the left */
function* spawner(m){const last=[-99,-99];while(true){for(const l of m.lanesIn){if(m.accepts(l)&&!m.inbox[l].length&&simTime-last[l]>(m.lanesIn.length>1?5:2)){
  const b=newBoard(l);b.lane=l;b.z=LZ[l];b.x=m.x0-420;if(m.i>2)markFull(b);m.inbox[l].push(b);last[l]=simTime;}}yield FRAME;}}

let simTime=0,speed=1,paused=false;
const logEl=$('log');function log(t,c){const d=document.createElement('div');d.textContent=t;if(c)d.className=c;logEl.prepend(d);while(logEl.children.length>8)logEl.lastChild.remove();}
const stubs=[];
function clearAll(){cos=[];[...boards].forEach(b=>b.alive&&killBoard(b));boards=[];[...mags].forEach(g=>g.alive&&killMag(g));mags=[];moving=0;
  MACH.forEach(m=>{m.inbox=[[],[]];m.busy=[false,false];m.state='IDLE';m.done=0;m.outT=[];m.procT=[];m.lastCode='';m.held=null;});
  stubs.forEach(s=>scene.remove(s));stubs.length=0;logEl.innerHTML='';serial=0;}
function stub(x,text){const g=new THREE.Group();scene.add(g);stubs.push(g);box(g,640,1000,800,stubMat,x,500,0,NOSH);rails(g,x-320,x+320,LZ[0],CONV_Y,{legs:false,motor:false});
  label(g,text,560,78,x,1001,310,{rx:-PI/2,bg:'#1e6fd9',fg:'#ffffff',pw:900,size:.46});}
function start(){clearAll();simTime=0;
  active=lineMode?MACH.slice():[MACH[sel]];
  MACH.forEach(m=>{m.g.visible=lineMode||m===MACH[sel];});active.forEach(m=>m.reset(m));
  if(!lineMode){const m=MACH[sel];stub(m.x0-320,m.i?'FROM '+MACH[m.i-1].name+'  ▶':'BOARD MAGAZINES IN');stub(m.x1+320,m.i<8?'▶  TO '+MACH[m.i+1].name:'TO STORAGE / SMT LINE');
    if(!m.source)run(spawner(m));}
  active.forEach(m=>{if(m.key==='fifo'||m.key==='scanner'||m.key==='inverter')m.lanesIn.forEach(l=>run(m.run(m,l)));else run(m.run(m,0));});
  focus();ui();}

/* ---------- camera / views ---------- */
let tween=null,follow=null;
function flyTo(p,t,dur=1.2){tween={p0:camera.position.clone(),t0:controls.target.clone(),p1:new THREE.Vector3(...p),t1:new THREE.Vector3(...t),t:0,dur};follow=null;}
function focus(){const m=MACH[sel];
  if(lineMode)flyTo([1500,7400,12500],[300,500,0]);else{const S=Math.max(m.L,1150);flyTo([m.cx+S*.9+1400,2300,3700],[m.cx,950,0]);}
  const S=lineMode?TOTAL/2+900:1700;Object.assign(sun.shadow.camera,{left:-S,right:S,top:S,bottom:-S,near:200,far:16000});sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.set(lineMode?0:m.cx,0,0);sun.position.set((lineMode?0:m.cx)+900,2900,1900);scene.add(sun.target);}
const views={over:focus,
  inside:()=>{const m=MACH[sel];setHoods(1);flyTo([m.cx+250,2050,1650],[m.cx,940,0]);},
  follow:()=>{const m=MACH[sel];setHoods(1);const b=boards.filter(b=>b.alive&&b.x>m.x0-300&&b.x<m.x1+300&&Math.abs(b.dy)<5).sort((a,c)=>c.x-a.x)[0]||boards.filter(b=>b.alive&&Math.abs(b.dy)<5)[0];
    if(!b)return;flyTo([b.x-350,CONV_Y+420,b.z+700],[b.x,CONV_Y,b.z],.9);follow={b};},
  line:()=>{flyTo([0,6200,11800],[0,700,0]);},
  top:()=>{const m=MACH[sel];setHoods(1);flyTo(lineMode?[0,13000,10]:[m.cx,3600+m.L,10],[lineMode?0:m.cx,900,0]);}};
let hoodsOpen=0;
function setHoods(o){hoodsOpen=o;MACH.forEach(m=>m.hoods.forEach(h=>h.target=o));$('bHood').textContent=o?'Close covers':'Open covers';$('bHood').classList.toggle('on',!!o);}

/* ---------- UI ---------- */
function selectMachine(i,fly=true){sel=i;document.querySelectorAll('[data-m]').forEach(b=>b.classList.toggle('on',+b.dataset.m===i));
  document.querySelectorAll('#flowList span').forEach((s,k)=>s.classList.toggle('me',k===i));
  const m=MACH[i];$('specT').innerHTML=m.specs.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('');$('specH').textContent=m.full;
  document.querySelector('#title .t1').textContent=lineMode?'HANDLING LINE':m.name;
  document.querySelector('#title .t2').textContent=lineMode?'Loader → unloader, nine handling machines connected. Selected: '+m.full+'.':m.full+' — '+m.specs[0][1]+'.';
  document.querySelector('#rail .vtxt').textContent=lineMode?'HANDLING LINE':m.name;
  if(!lineMode)start();else if(fly){const S=Math.max(m.L,1150);flyTo([m.cx+S*.9+1400,2300,3700],[m.cx,950,0]);}buildTags();ui();}
function setMode(l){lineMode=l;$('bLine').classList.toggle('on',l);$('bSingle').classList.toggle('on',!l);document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('on',(b.dataset.mode==='line')===l));if(l)start();selectMachine(sel,false);}
document.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>selectMachine(+b.dataset.m));
document.querySelectorAll('#flowList span').forEach((s,k)=>{s.style.cursor='pointer';s.onclick=()=>selectMachine(k);});
$('bLine').onclick=()=>setMode(true);$('bSingle').onclick=()=>setMode(false);
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>setMode(b.dataset.mode==='line'));
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-v]').forEach(x=>x.classList.remove('on'));b.classList.add('on');views[b.dataset.v]();});
document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-s]').forEach(x=>x.classList.remove('on'));b.classList.add('on');speed=+b.dataset.s;});
$('bHood').onclick=()=>setHoods(hoodsOpen?0:1);
let xray=false;$('bXray').onclick=()=>{xray=!xray;$('bXray').classList.toggle('on',xray);shellMats.forEach(mt=>{mt.transparent=xray;mt.opacity=xray?.12:1;mt.depthWrite=!xray;mt.needsUpdate=true;});};
$('bPause').onclick=()=>{paused=!paused;$('bPause').textContent=paused?'Resume':'Pause';$('bPause').classList.toggle('on',paused);};
controls.addEventListener('start',()=>{tween=null;});
/* click a hood to open / close it */
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let downAt=null;
function hitHood(e){SMT.ndc(e,mouse);ray.setFromCamera(mouse,camera);const hs=[];MACH.forEach(m=>m.g.visible&&m.hoods.forEach(h=>hs.push(h)));
  const hit=ray.intersectObjects(hs.map(h=>h.p),true)[0];if(!hit)return null;for(let o=hit.object;o;o=o.parent){const h=hs.find(h=>h.p===o);if(h)return h;}return null;}
canvas.addEventListener('pointerdown',e=>{downAt=[e.clientX,e.clientY];});
canvas.addEventListener('pointerup',e=>{if(!downAt||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>5)return;const h=hitHood(e);if(h)h.target=h.target?0:1;});
canvas.addEventListener('pointermove',e=>{if(e.buttons)return;canvas.style.cursor=hitHood(e)?'pointer':'';});
/* tags */
let tags=[],showTags=false;
function buildTags(){$('tags').innerHTML='';tags=[];const list=lineMode?MACH.map(m=>[m,m.name,0,(m.H||1400)+80,0]):MACH[sel].tags.map(t=>[MACH[sel],t[0],t[1],t[2],t[3]]);
  list.forEach(([m,t,x,y,z])=>{const el=document.createElement('div');el.className='tag';el.textContent=t;$('tags').appendChild(el);tags.push({el,m,v:new THREE.Vector3(x,y,z)});});}
$('bLab').onclick=()=>{showTags=!showTags;$('bLab').classList.toggle('on',showTags);if(!showTags)tags.forEach(t=>t.el.style.display='none');};

function stat(m){const o=m.outT.slice(-6);const iv=[];for(let i=1;i<o.length;i++)iv.push(o[i]-o[i-1]);const avg=iv.length?iv.reduce((a,b)=>a+b,0)/iv.length:0;
  const p=m.procT.slice(-6);const pt=p.length?p.reduce((a,b)=>a+b,0)/p.length:0;return{avg,pt,last:p.length?p[p.length-1]:0};}
function pillCls(s){return /WAIT|IDLE/.test(s)?'idle':/OPERATOR|CHANGE|NO READ|HELD/.test(s)?'cl':'';}
function ui(){
  const m=MACH[sel],st=stat(m);
  if(lineMode){const u=stat(UNLOAD);
    SMT.cycle(u.avg?u.avg.toFixed(1)+' s':'—',u.avg?'line output every '+u.avg.toFixed(1)+' s · '+Math.round(3600/u.avg)+' boards/h · '+UNLOAD.stored+' boards stored':'first boards on their way','CYCLE TIME · WHOLE LINE');
    $('hud').querySelector('h2').textContent='LINE STATUS';
    $('hudBody').innerHTML=MACH.map(q=>'<div class="row lrow'+(q===m?' sel':'')+'" data-k="'+q.i+'"><span>'+(q.i+1)+' · '+q.name+'</span><span class="pill '+pillCls(q.state)+'" title="'+q.state+'">'+q.state.slice(0,22)+'</span></div>').join('')
      +'<div class="row" style="margin-top:6px"><span>Boards in the line</span><span class="big">'+boards.filter(b=>b.alive&&!mags.some(g=>g.boards.includes(b))&&!DESTACK.stack?.includes(b)).length+'</span></div>';
    $('hudBody').querySelectorAll('.lrow').forEach(r=>r.onclick=()=>selectMachine(+r.dataset.k));}
  else{SMT.cycle(st.last?st.last.toFixed(1)+' s':'—',st.avg?'output every '+st.avg.toFixed(1)+' s · '+Math.round(3600/st.avg)+' boards/h · '+m.done+' boards':'first board in progress','CYCLE TIME · '+m.name);
    $('hud').querySelector('h2').textContent=m.name+' STATUS';
    $('hudBody').innerHTML='<div class="row"><span>State</span><span class="pill '+pillCls(m.state)+'">'+m.state+'</span></div>'+m.rows(m).map(r=>'<div class="row"><span>'+r[0]+'</span><span>'+r[1]+'</span></div>').join('')
      +'<div class="row"><span>Process time (avg)</span><span>'+(st.pt?st.pt.toFixed(1)+' s':'—')+'</span></div><div class="row"><span>Boards through</span><span class="big">'+m.done+'</span></div>';}
}

/* ---------- main loop ---------- */
function resize(){const [w,h]=SMT.size();if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(SMT.stage());resize();
renderer.shadowMap.autoUpdate=false;
const clock=new THREE.Clock();let uiT=0;const _p=new THREE.Vector3();
function frame(){
  requestAnimationFrame(frame);
  const rdt=Math.min(clock.getDelta(),.05),dt=paused?0:(window.__step!==undefined?window.__step:rdt*speed);
  if(dt>0){simTime+=dt;const n=Math.max(1,Math.ceil(dt/.03));for(let i=0;i<n;i++){for(let k=0;k<cos.length;k++)cos[k].step(dt/n);}
    cos=cos.filter(c=>!c.done);if(moving>0)beltTex.offset.x-=dt*V/16;}
  MACH.forEach(m=>{if(m.g.visible&&m.update)m.update(m,dt);m.hoods.forEach(h=>{h.open+=(h.target-h.open)*Math.min(1,rdt*3);h.p.rotation.x=h.ang*h.open;});
    if(m.lamps){const run=!paused&&!/WAIT|IDLE/.test(m.state),warn=/OPERATOR|CHANGE|HELD/.test(m.state);m.lamps.g.emissiveIntensity=run?1.8:.05;m.lamps.y.emissiveIntensity=warn||paused?1.8:.05;m.lamps.r.emissiveIntensity=.05;}});
  mags.forEach(g=>{g.g.position.set(g.x,g.y,g.z);g.boards.forEach((b,k)=>{if(b){b.x=g.x;b.z=g.z;b.dy=slotY(g,k)-CONV_Y;}});});
  boards.forEach(b=>{if(!b.alive)return;b.g.position.set(b.x,CONV_Y+BT/2+b.dy,b.z);b.piv.rotation.x=b.flip;});
  if(tween){tween.t+=rdt;const k=ease(Math.min(1,tween.t/tween.dur));camera.position.lerpVectors(tween.p0,tween.p1,k);controls.target.lerpVectors(tween.t0,tween.t1,k);if(k>=1)tween=null;}
  if(follow&&!tween){if(!follow.b.alive)follow=null;else{_p.set(follow.b.x,CONV_Y,follow.b.z).sub(controls.target);camera.position.add(_p);controls.target.add(_p);}}
  controls.update();const dist=camera.position.distanceTo(controls.target);camera.near=Math.max(1.5,Math.min(10,dist*.03));camera.updateProjectionMatrix();
  const [W,H]=SMT.size();renderer.setViewport(0,0,W,H);renderer.clear();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
  if(showTags)tags.forEach(t=>{_p.copy(t.v);if(t.m)t.m.g.localToWorld(_p);_p.project(camera);const vis=t.m.g.visible&&_p.z<1&&Math.abs(_p.x)<1&&Math.abs(_p.y)<1;t.el.style.display=vis?'block':'none';if(vis){t.el.style.left=((_p.x+1)/2*W)+'px';t.el.style.top=((1-_p.y)/2*H)+'px';}});
  uiT+=rdt;if(uiT>.2){uiT=0;ui();}
}
camera.position.set(3000,2200,3600);controls.target.set(0,900,0);controls.maxDistance=26000;
window.__sim={MACH,selectMachine,setMode,views,setHoods,get time(){return simTime;},get boards(){return boards;},ff:s=>{const n=Math.round(s/.02);for(let i=0;i<n;i++){simTime+=.02;for(let k=0;k<cos.length;k++)cos[k].step(.02);cos=cos.filter(c=>!c.done);}}};
selectMachine(0,false);
frame();
