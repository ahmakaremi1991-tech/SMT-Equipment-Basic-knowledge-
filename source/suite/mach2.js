
/* ===================================================================
   MACHINES — modelled on manufacturer data (sizes in mm, L along the
   line, W front-to-back, H).  Source noted per machine.
   =================================================================== */
const MACH=[];
function machine(o){const m=Object.assign({hoods:[],tags:[],inbox:[[],[]],busy:[false,false],state:'IDLE',done:0,outT:[],procT:[],lanesIn:[0],gap:0,g:new THREE.Group()},o);
  MACH.push(m);scene.add(m.g);return m;}
const V=233;                       // belt speed 14 m/min (manufacturer datasheets)
const RAIL_F=LZ[0]+BD/2+7;         // fixed (front) rail position, z
M.ral=sm(0xdcdcd2,.55,.05);M.ral2=sm(0xcfcfc4,.55,.06);M.ralD=sm(0x9fa19b,.5,.1);
M.asys=sm(0xe6e8ea,.5,.06);M.asysD=sm(0x4f555d,.5,.2);M.inox=sm(0xc9ced3,.3,.8);
M.smoke=new THREE.MeshStandardMaterial({color:0x1a2026,roughness:.08,metalness:.3,transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide});
M.orange=std(0xf07a1c,.5,.05);

/* ---------- small parts ---------- */
const P=(g,w,h,d,mat,x,y,z)=>box(g,w,h,d,mat,x,y,z,NOSH);
function feet(g,x0,x1,z0,z1){[[x0+50,z0+50],[x1-50,z0+50],[x0+50,z1-50],[x1-50,z1-50]].forEach(p=>{cyl(g,26,30,10,M.steel,p[0],5,p[1]);cyl(g,9,9,60,M.steel,p[0],40,p[1]);});}
function touch(g,x,y,z,w=190,h=120){P(g,w,h,14,M.black,x,y,z+7);
  const t=canvasTex(256,160,(c)=>{c.fillStyle='#103a20';c.fillRect(0,0,256,160);c.fillStyle='#2ee068';c.fillRect(8,8,240,144);c.fillStyle='#0c2e18';c.font='700 20px Arial';c.fillText('RUN',16,34);c.fillRect(16,48,224,4);c.fillRect(16,64,140,4);c.fillRect(16,80,180,4);});
  const s=new THREE.Mesh(new THREE.PlaneGeometry(w-24,h-24),new THREE.MeshBasicMaterial({map:t,toneMapped:false}));s.position.set(x,y,z+14.5);g.add(s);}
function estop(g,x,y,z){P(g,70,70,4,M.yellow,x,y,z+2);cyl(g,22,18,22,M.red,x,y,z+14,{rx:PI/2,cast:false});}
function knob(g,x,y,z){P(g,60,60,10,M.orange,x,y,z+5);cyl(g,15,15,22,M.black,x,y,z+18,{rx:PI/2,cast:false});}
function vents(g,x,y,z,w=140){for(let i=0;i<4;i++)P(g,w,5,3,M.black,x,y+i*14,z+1.5);}
function handle(g,x,y,z,h=110){P(g,26,h,16,M.black,x,y,z+8);}
function fnLabel(g,text,w,x,y,z,ry=0){label(g,text,w,70,x,y,z,{bg:'#1e6fd9',fg:'#ffffff',pw:Math.round(w*2.2),size:.6,weight:'900',ry});}
function signal(m,x,z,H){const g=new THREE.Group();g.position.set(x,H,z);m.g.add(g);cyl(g,7,7,190,M.steel,0,95,0);
  const L={};[['r',0xff2a2a,244],['y',0xffa800,216],['g',0x22e06a,188]].forEach(a=>{const mt=new THREE.MeshStandardMaterial({color:a[1],emissive:a[1],emissiveIntensity:.05,roughness:.3});L[a[0]]=mt;cyl(g,16,16,26,mt,0,a[2]+13,0);});m.lamps=L;}
/* hinged lid / door. kind 'lid': hinge at rear-top edge, lid extends +z.  kind 'door': hinge at top-front edge, door hangs down. */
function hinged(m,kind,w,d,x,y,z,glass=true,mat=M.ral){const p=new THREE.Group();p.position.set(x,y,z);m.g.add(p);
  if(kind==='lid'){P(p,w,12,30,mat,0,0,15);P(p,w,12,30,mat,0,0,d-15);P(p,30,12,d,mat,-w/2+15,0,d/2);P(p,30,12,d,mat,w/2-15,0,d/2);
    const gl=new THREE.Mesh(new THREE.BoxGeometry(w-60,4,d-60),glass?M.smoke:mat);gl.position.set(0,0,d/2);gl.renderOrder=5;p.add(gl);P(p,Math.min(240,w*.5),12,14,M.steel,0,10,d-10);}
  else{P(p,w,26,14,mat,0,-13,0);P(p,w,26,14,mat,0,-d+13,0);P(p,26,d,14,mat,-w/2+13,-d/2,0);P(p,26,d,14,mat,w/2-13,-d/2,0);
    const gl=new THREE.Mesh(new THREE.BoxGeometry(w-52,d-52,4),glass?M.smoke:mat);gl.position.set(0,-d/2,0);gl.renderOrder=5;p.add(gl);P(p,Math.min(260,w*.5),14,14,M.steel,0,-d+40,16);}
  m.hoods.push({p,open:0,target:0,ang:kind==='lid'?-1.2:-1.1});return p;}
/* end-wall with a slot opening for the conveyor at given lanes */
function endWall(g,x,z0,z1,y0,y1,lanes,mat=M.ral){const segs=[];let zc=z0;lanes.slice().sort((a,b)=>a-b).forEach(l=>{segs.push([zc,l-135]);zc=l+135;});segs.push([zc,z1]);
  segs.forEach(s=>{if(s[1]-s[0]>2)P(g,12,y1-y0,s[1]-s[0],mat,x,(y0+y1)/2,(s[0]+s[1])/2);});
  lanes.forEach(l=>{P(g,12,CONV_Y-60-y0,270,mat,x,(CONV_Y-60+y0)/2,l);P(g,12,y1-CONV_Y-80,270,mat,x,(y1+CONV_Y+80)/2,l);});}
function shell(g,x0,x1,z0,z1,y0,y1,mat,o={}){ // closed box with optional open faces and end-wall conveyor slots
  if(!o.noFront)P(g,x1-x0,y1-y0,12,mat,(x0+x1)/2,(y0+y1)/2,z1-6);
  if(!o.noRear)P(g,x1-x0,y1-y0,12,mat,(x0+x1)/2,(y0+y1)/2,z0+6);
  if(!o.noTop)P(g,x1-x0,12,z1-z0,mat,(x0+x1)/2,y1-6,(z0+z1)/2);
  [[x0+6,o.left],[x1-6,o.right]].forEach(([x,ln])=>{if(ln===false)return;if(ln&&ln.length)endWall(g,x,z0,z1,y0,y1,ln,mat);else P(g,12,y1-y0,z1-z0,mat,x,(y0+y1)/2,(z0+z1)/2);});}

/* ---------- triple-magazine handler (loader / unloader share the design) ---------- */
const MG={L:355,W:320,H:570,base:40,pitch:20,slots:25,use:20};   // max magazine 355 x 320 x 570 (M size), top 5 slots empty
function magMesh(par){const g=new THREE.Group();par.add(g);
  [-1,1].forEach(s=>{P(g,MG.L,MG.H,8,M.mag,0,MG.H/2,s*(MG.W/2-4));for(let k=0;k<MG.slots;k++)P(g,MG.L-30,3,10,M.magD,0,MG.base+k*MG.pitch-3,s*(MG.W/2-12));
    P(g,40,MG.H,MG.W,M.mag,s*(MG.L/2-20),MG.H/2,0);});
  [-1,1].forEach(s=>P(g,MG.L-80,MG.H,6,M.mag,0,MG.H/2,0).visible=false);
  P(g,MG.L,10,MG.W,M.magD,0,5,0);P(g,MG.L,10,MG.W,M.magD,0,MG.H-5,0);P(g,80,24,30,M.black,0,MG.H+12,0);
  const tag=label(g,'175',60,24,0,MG.H-30,MG.W/2+1,{bg:'#e3a52a',fg:'#222',pw:120,size:.7});return g;}
function buildMagHandler(m,isLoader){
  const L=m.L,x0=-L/2,x1=L/2,z1=m.z1,z0=m.z0,H=1750,s=isLoader?1:-1;
  // magazine bay on the free end (upstream for the loader, downstream for the unloader), shuttle housing towards the line
  const bx0=isLoader?x0:20,bx1=isLoader?-20:x1,hx0=isLoader?-20:x0,hx1=isLoader?x1:20;
  m.magX=(bx0+bx1)/2;m.shX=(hx0+hx1)/2;
  feet(m.g,x0,x1,z0,z1);
  // bay: plinth, platform lifter columns, upper panel, side walls
  P(m.g,bx1-bx0,260,z1-z0,M.ral,(bx0+bx1)/2,180,(z0+z1)/2);
  P(m.g,bx1-bx0,380,z1-z0,M.ral,(bx0+bx1)/2,H-190,(z0+z1)/2);                       // upper beam panel (documents hang here)
  P(m.g,bx1-bx0,H-310,24,M.ral,(bx0+bx1)/2,(H+310)/2,z1-12);P(m.g,bx1-bx0,H-310,24,M.ral,(bx0+bx1)/2,(H+310)/2,z0+12);
  [z0+70,z1-70].forEach(z=>P(m.g,60,1100,60,M.ralD,m.magX+(isLoader?150:-150),860,z));
  [0,1].forEach(i=>{const t=canvasTex(160,220,(c)=>{c.fillStyle='#fff';c.fillRect(0,0,160,220);c.fillStyle='#bbb';for(let k=0;k<9;k++)c.fillRect(14,20+k*18,132-(k%3)*20,6);c.strokeStyle='#111';c.lineWidth=10;c.strokeRect(0,0,160,220);});
    const d=new THREE.Mesh(new THREE.PlaneGeometry(150,206),new THREE.MeshBasicMaterial({map:t}));d.position.set(isLoader?bx0-1:bx1+1,H-200,z0+(z1-z0)*(i?0.72:0.28));d.rotation.y=isLoader?-PI/2:PI/2;m.g.add(d);});
  m.plat=new THREE.Group();m.g.add(m.plat);P(m.plat,bx1-bx0-40,20,z1-z0-240,M.ralD,m.magX,-10,(z0+z1)/2);
  m.magZ=[z1-213-225,z1-213-225-450,z1-213-225-900];                                 // 3 magazines side by side (drawing pitch ≈ 450 mm)
  m.magG=m.magZ.map(z=>{const g=magMesh(m.plat);g.position.set(m.magX,0,z);return g;});
  // shuttle housing: cabinet with three hinged top covers (as on the technical drawing)
  const hy=1180;shell(m.g,hx0,hx1,z0,z1,80,hy,M.ral,{noTop:true,left:isLoader?false:LZ,right:isLoader?[LZ[0]]:false});
  if(isLoader)P(m.g,12,hy-80,z1-z0,M.ral,hx0+6,(hy+80)/2,(z0+z1)/2);else P(m.g,12,hy-80,z1-z0,M.ral,hx1-6,(hy+80)/2,(z0+z1)/2);
  const cw=hx1-hx0-20,seg=(z1-z0-20)/3;for(let i=0;i<3;i++)hinged(m,'lid',cw,seg-6,m.shX,hy,z0+10+i*seg,i==2?false:true,M.ral);
  touch(m.g,m.shX+(isLoader?-120:120),1010,z1);estop(m.g,m.shX+(isLoader?120:-120),1020,z1);handle(m.g,m.shX,600,z1);vents(m.g,m.shX-80,180,z1);
  fnLabel(m.g,m.name,Math.min(470,cw-20),m.shX,1120,z1+1);
  estop(m.g,isLoader?bx0+40:bx1-40,1150,z1);signal(m,isLoader?bx0+60:bx1-60,z0+80,H);
  // shuttle carriage: Z linear rails + conveyor + puller/pusher cylinder
  [-1,1].forEach(q=>P(m.g,30,30,z1-z0-120,M.steel,m.shX+q*190,720,(z0+z1)/2));
  m.car=new THREE.Group();m.g.add(m.car);
  rails(m.car,m.shX-250,m.shX+250,0,CONV_Y,{legs:false});P(m.car,440,40,BD+60,M.aluD,m.shX,CONV_Y-80,0);P(m.car,80,170,80,M.dark,m.shX,CONV_Y-180,0);
  m.cyl=new THREE.Group();m.car.add(m.cyl);
  cyl(m.cyl,14,14,460,M.alu,m.shX,CONV_Y+70,-BD/2-30,{rz:PI/2});           // pneumatic cylinder alongside the conveyor
  m.rod=new THREE.Group();m.cyl.add(m.rod);P(m.rod,40,30,40,M.black,0,CONV_Y+70,-BD/2-30);P(m.rod,24,24,BD/2+30,M.steel,0,CONV_Y+70,-BD/4-15);P(m.rod,18,60,16,M.yellow,0,CONV_Y+40,-6);
  m.H=H;
  m.tags=[['Magazine lift platform (3 magazines)',m.magX,1350,m.magZ[1]],['Shuttle conveyor (moves front ↔ back)',m.shX,1240,0],[isLoader?'Puller cylinder':'Pusher cylinder',m.shX,CONV_Y+140,-160],['Hinged covers',m.shX,1240,z1-200]];}
function magBoardsUpdate(m){const off=m.platY;m.plat.position.y=off;
  m.mags.forEach((mg,i)=>{const g=m.magG[i];g.visible=mg.present;g.position.y=mg.lift||0;
    mg.boards.forEach((b,k)=>{if(b&&b.inMag){b.x=m.X(m.magX);b.z=m.magZ[i];b.dy=off+(mg.lift||0)+MG.base+k*MG.pitch-CONV_Y;}});});
  m.car.position.z=m.cz;m.rod.position.x=m.rodX;}
const slotPlat=k=>CONV_Y-MG.base-k*MG.pitch;
function* swapMag(m,i,full){const mg=m.mags[i];mg.busy=true;yield 2.5;m.ops++;
  yield* tw(1.2,k=>mg.lift=k*900);mg.present=false;mg.boards.forEach(b=>b&&killBoard(b));mg.boards=new Array(MG.slots).fill(null);
  if(full)for(let k=0;k<MG.use;k++){const b=newBoard(0);b.inMag=true;mg.boards[k]=b;}
  yield 1.5;mg.present=true;yield* tw(1.2,k=>mg.lift=(1-k)*900);mg.lift=0;mg.busy=false;
  log((m.key==='loader'?'LOADER: full':'UNLOADER: empty')+' magazine placed in position '+(i+1),'cl');}

/* 1 ---- LOADER  (triple-magazine line loader, M size) ---- */
const LOADER=machine({key:'loader',name:'LOADER',full:'Triple-magazine line loader',L:1080,source:true,z1:RAIL_F+380,
  specs:[['Size (L × W × H)','1080 × 1750 × 1750 mm'],['Magazines','3 side by side on one servo lift platform'],['Max magazine','355 × 320 × 570 mm, 50 kg each'],['Board out','puller cylinder pulls the board onto a shuttle conveyor that moves sideways to the line'],['Loading time','≈ 18–24 s per board (rear magazine)'],['Pitch','top 5 slots stay empty; shown 20 boards × 20 mm'],['Belt speed','14 m/min'],['Source','manufacturer product page, technical drawing and brochure + your video']],
  build(m){m.z0=m.z1-1750;buildMagHandler(m,true);},
  reset(m){m.mags=[0,1,2].map(()=>({present:true,boards:new Array(MG.slots).fill(null),lift:0,busy:false}));
    m.mags.forEach(mg=>{for(let k=0;k<MG.use;k++){const b=newBoard(0);b.inMag=true;mg.boards[k]=b;}});
    m.platY=slotPlat(MG.use-1);m.cz=LZ[0];m.rodX=0;m.ops=0;},
  *run(m){const xr=m.shX-170,xIn=m.magX-MG.L/2-10;
    while(true){const i=m.mags.findIndex(g=>g.present&&!g.busy&&g.boards.some(b=>b));
      if(i<0){m.state='OPERATOR: LOAD FULL MAGAZINE';yield FRAME;continue;}
      const mg=m.mags[i],k=mg.boards.reduce((a,b,j)=>b?j:a,-1);   // top to bottom
      m.state='SHUTTLE TO MAGAZINE '+(i+1)+' · SLOT '+(k+1);const z0=m.cz,p0=m.platY,p1=slotPlat(k);
      yield* tw(.25+Math.abs(m.magZ[i]-z0)/900,t=>{m.cz=lerp(z0,m.magZ[i],ease(t));m.platY=lerp(p0,p1,ease(t));});
      m.state='PULLER INTO MAGAZINE';const reach=xIn-xr+(m.L/2+m.magX)*0;yield* tw(.6,t=>m.rodX=lerp(0,(m.magX-MG.L/2-15)-xr,ease(t)));
      const b=mg.boards[k];mg.boards[k]=null;b.inMag=false;b.z=m.magZ[i];b.dy=0;const t0=simTime;
      m.state='PULL BOARD ONTO SHUTTLE';const bx0=m.X(m.magX),bx1=m.X(m.shX);const r0=m.rodX;
      yield* tw(1.4,t=>{m.rodX=lerp(r0,0,t);b.x=lerp(bx0,bx1,t);});
      if(!mg.boards.some(x=>x))run(swapMag(m,i,true));
      m.state='SHUTTLE TO LINE';const zb=m.cz;yield* tw(.25+Math.abs(LZ[0]-zb)/900,t=>{m.cz=lerp(zb,LZ[0],ease(t));b.z=m.cz;});
      m.state='BOARD OUT';yield* conveyTo(b,m.X(m.L/2-BW/2-10));m.procT.push(simTime-t0);m.busy[0]=true;yield* offer(m,b);m.busy[0]=false;m.done++;}},
  update(m){magBoardsUpdate(m);},
  rows(m){return[['Magazine 1 / 2 / 3',m.mags.map(g=>g.present?g.boards.filter(b=>b).length:'—').join(' / ')+' boards'],['Magazine changes (operator)',String(m.ops)]];}
});

/* 2 ---- DESTACKER  (logistics loader: batch buffer + separator) ---- */
const DESTACK=machine({key:'destacker',name:'DESTACKER',full:'Logistics loader / destacker (batch buffer + separator)',L:1100,z1:RAIL_F+170,
  specs:[['Function','Loads bare boards from stacks (batches) onto the line; passes boards from the loader through'],['Batch buffer','8 batches of 60 mm, FIFO; loaded without stopping production'],['Separator','takes boards off the top of the stack with a clamp mechanism'],['Size','≈ 1100 × 900 × 1050 mm (estimated from photo — no datasheet available)'],['Source','dealer listing (manufacturer description) + photo']],
  build(m){const x0=-550,x1=550,z1=m.z1,z0=z1-900;m.z0=z0;feet(m.g,x0,x1,z0,z1);
    shell(m.g,x0,x1,z0,z1,70,1050,M.asys,{noTop:true,left:[LZ[0]],right:[LZ[0]]});
    P(m.g,10,1050-70,z1-z0,M.asys,0,560,(z0+z1)/2);P(m.g,x1-x0,12,z1-z0,M.asys,0,860,(z0+z1)/2).visible=false;
    hinged(m,'lid',540,z1-z0-20,-275,1050,z0+10,true,M.asys);hinged(m,'lid',540,(z1-z0)*.55,275,1050,z0+10,true,M.asys);
    P(m.g,540,40,(z1-z0)*.45-10,M.inox,275,1030,z1-((z1-z0)*.45)/2-5);
    P(m.g,190,80,12,M.asysD,-120,960,z1+2);touch(m.g,-150,960,z1+6,100,64);for(let i=0;i<6;i++)P(m.g,14,14,6,M.black,-70+(i%3)*18,950+Math.floor(i/3)*18,z1+10);
    estop(m.g,-480,960,z1);handle(m.g,-20,560,z1);handle(m.g,20,560,z1);fnLabel(m.g,m.name,340,-330,860,z1+1);
    rails(m.g,x0,x1,LZ[0],CONV_Y,{legs:false});
    // batch buffer (left, rear): 8 trays on an elevator; separator lift (right, rear); clamp gripper on a Z axis
    m.bz=-230;m.rack=new THREE.Group();m.g.add(m.rack);[-1,1].forEach(q=>P(m.g,20,820,20,M.steel,-275+q*170,520,m.bz-140));
    m.trays=[];for(let i=0;i<8;i++){const t=new THREE.Group();m.g.add(t);P(t,300,8,240,M.ralD,0,-4,0);
      const st=new THREE.Mesh(new THREE.BoxGeometry(BW,1,BD),std(0x0f5a31,.6,.05));st.position.y=.5;t.add(st);t.userData.st=st;m.trays.push(t);}
    [-1,1].forEach(q=>P(m.g,20,820,20,M.steel,275+q*170,520,m.bz-140));
    m.gz=new THREE.Group();m.g.add(m.gz);P(m.g,40,40,900,M.alu,275,1000,(z0+z1)/2);
    P(m.gz,90,60,70,M.black,0,0,0);P(m.gz,16,90,16,M.steel,0,-70,0);m.jaw=[-1,1].map(q=>{const j=new THREE.Group();m.gz.add(j);P(j,BW+10,10,14,M.dark,0,-112,0);P(j,BW+10,30,8,M.dark,0,-125,q*4);return j;});
    signal(m,x1-60,z0+60,1050);
    m.tags=[['Batch buffer (8 stacks, FIFO)',-275,1080,m.bz],['Separator lift',275,880,m.bz],['Clamp gripper',275,1100,0],['Pass-through conveyor',-430,CONV_Y+60,LZ[0]]];},
  reset(m){m.batches=[];for(let i=0;i<8;i++)m.batches.push({n:37,lev:i});m.sep=null;m.loads=8;m.gzz=m.bz;m.gy=CONV_Y+70;m.clamp=0;m.lastIn=simTime;m.held=null;},
  *run(m){run(destackFeeder(m));
    while(true){let b=null;const t0=simTime;
      if(m.inbox[0].length){b=m.inbox[0].shift();m.busy[0]=true;m.lastIn=simTime;m.state='PASS THROUGH (LOADER BOARD)';yield* conveyTo(b,m.X(550-BW/2-10));}
      else if(m.sep&&m.sep.n>0&&(!lineMode||(simTime-m.lastIn>9&&LOADER.state.startsWith('OPERATOR'))||simTime-m.lastIn>18)){m.busy[0]=true;b=yield* separate(m);yield* conveyTo(b,m.X(550-BW/2-10));}
      else{m.state=lineMode?'PASS THROUGH · STANDBY':(m.sep?'IDLE':'WAIT FOR BATCH');yield FRAME;continue;}
      m.procT.push(simTime-t0);yield* offer(m,b);m.busy[0]=false;m.done++;}},
  update(m){m.batches.forEach(bt=>{});m.trays.forEach((t,i)=>{const bt=m.batches[i];t.visible=!!bt&&!bt.gone;if(!bt)return;
      const sep=bt===m.sep;t.position.set(sep?275:-275,sep?m.sepY:210+bt.lev*90,m.bz);t.userData.st.scale.y=Math.max(.01,bt.n*BT);t.userData.st.position.y=bt.n*BT/2;});
    m.gz.position.set(275,m.gy+130,m.gzz);m.jaw.forEach((j,q)=>j.position.z=(q?1:-1)*(BD/2+12)*(1-m.clamp*.06));
    if(m.held){m.held.x=m.X(275);m.held.z=m.gzz;m.held.dy=m.gy-CONV_Y;}},
  rows(m){return[['Batches in buffer',String(m.batches.filter(b=>!b.gone&&b!==m.sep).length)+' / 8'],['Boards on separator stack',m.sep?String(m.sep.n):'—'],['Mode',lineMode?'pass-through + fills gaps':'destacking']];}
});
function* destackFeeder(m){while(true){
  if(!m.sep){const q=m.batches.filter(b=>!b.gone).sort((a,b)=>a.lev-b.lev)[0];
    if(!q){m.state='OPERATOR: LOAD BATCHES';yield 5;for(let i=0;i<8;i++){m.batches[i]={n:37,lev:i};}m.loads+=8;continue;}
    m.sep=q;const y0=210+q.lev*90;m.sepY=y0;yield* tw(1.2,k=>m.sepY=y0);   // transfer to the separator
    m.batches.filter(b=>!b.gone&&b!==q).forEach(b=>b.lev--);}
  m.sepY+=(CONV_Y-10-m.sep.n*BT-m.sepY)*.1;                                   // lift keeps the top board at the clamp height
  if(m.sep.n<=0){m.sep.gone=true;m.sep=null;}
  yield FRAME;}}
function* separate(m){m.state='CLAMP TOP BOARD';
  const topY=m.sepY+m.sep.n*BT;yield* tw(.5,k=>{m.gzz=m.bz;m.gy=lerp(CONV_Y+70,topY,ease(k));});m.clamp=1;yield .2;
  const b=newBoard(0);m.sep.n--;m.held=b;
  m.state='LIFT + MOVE TO CONVEYOR';yield* tw(.4,k=>m.gy=lerp(topY,CONV_Y+70,ease(k)));yield* tw(.8,k=>m.gzz=lerp(m.bz,LZ[0],ease(k)));
  yield* tw(.4,k=>m.gy=lerp(CONV_Y+70,CONV_Y,ease(k)));m.clamp=0;m.held=null;b.z=LZ[0];b.dy=0;yield .15;
  run(tw(.9,k=>{m.gy=lerp(CONV_Y,CONV_Y+70,ease(k));m.gzz=lerp(LZ[0],m.bz,ease(k));}));m.state='BOARD OUT';return b;}

/* 3 ---- LASER MARKER ---- */
const LASER=machine({key:'laser',name:'LASER MARKER',full:'Inline laser marking system',L:830,z1:RAIL_F+400,
  specs:[['Size (L × W × H)','830 × 1565 × 1550 mm'],['Transport height','920 ± 50 mm'],['Panel size','70–508 × 50–508 mm, 0.8–4 mm'],['Laser','CO2 or fibre, on a linear X/Y axis above the transport'],['Positioning','board clamped by an integrated side clamp'],['Laser window','max 80 × 80 mm'],['Verification','high-resolution camera reads the code back'],['Accuracy','± 100 µm @ 5σ'],['Source','manufacturer datasheet']],
  build(m){const x0=-415,x1=415,z1=m.z1,z0=z1-1300;m.z0=z0;feet(m.g,x0,x1,z0,z1);
    shell(m.g,x0,x1,z0,z1,70,1550,M.asys,{noFront:true,left:[LZ[0]],right:[LZ[0]]});
    P(m.g,x1-x0,860,12,M.asys,0,500,z1-6);P(m.g,x1-x0,120,12,M.asys,0,1490,z1-6);P(m.g,40,560,12,M.asys,x0+20,1150,z1-6);P(m.g,40,560,12,M.asys,x1-20,1150,z1-6);
    hinged(m,'door',x1-x0-80,560,0,1430,z1+2,true,M.asysD);
    P(m.g,x1-x0-60,40,10,M.asysD,0,880,z1+3);handle(m.g,-60,560,z1);handle(m.g,60,560,z1);vents(m.g,-200,140,z1);fnLabel(m.g,m.name,520,0,780,z1+1);
    const arm=new THREE.Group();arm.position.set(x1-30,0,z1);m.g.add(arm);P(arm,40,40,260,M.asysD,0,1250,130);P(arm,60,200,60,M.asysD,0,1170,260);touch(arm,-40,1330,260,300,210);
    rails(m.g,x0,x1,LZ[0],CONV_Y,{legs:false});m.clampBar=P(m.g,300,14,10,M.steel,0,CONV_Y+10,LZ[0]-BD/2-16);
    [-1,1].forEach(q=>P(m.g,40,40,1100,M.alu,q*330,1320,(z0+z1)/2-40));m.xb=new THREE.Group();m.g.add(m.xb);P(m.xb,720,50,60,M.alu,0,1300,0);
    m.head=new THREE.Group();m.g.add(m.head);P(m.head,150,210,150,M.black,0,0,0);cyl(m.head,36,44,70,M.dark,0,-130,0);
    m.lensM=new THREE.MeshStandardMaterial({color:0x101018,emissive:0xff6020,emissiveIntensity:0});cyl(m.head,28,28,4,m.lensM,0,-167,0,{cast:false});
    m.camM=new THREE.MeshStandardMaterial({color:0x111,emissive:0xffffff,emissiveIntensity:0});P(m.head,60,60,60,M.dark,100,-60,0);P(m.head,30,4,30,m.camM,100,-92,0);
    m.beam=new THREE.Mesh(new THREE.CylinderGeometry(.9,.9,1,6),new THREE.MeshBasicMaterial({color:0xff7a30,transparent:true,opacity:.8,blending:THREE.AdditiveBlending,depthWrite:false}));m.beam.visible=false;m.g.add(m.beam);
    m.spark=new THREE.PointLight(0xffa060,0,260,2);m.g.add(m.spark);
    cyl(m.g,45,45,420,M.ralD,-250,1700,z0+200);signal(m,x0+60,z0+60,1550);
    m.tags=[['Laser on X/Y linear axes',0,1420,0],['Code-verification camera',100,1330,0],['Side clamp',0,CONV_Y+40,LZ[0]-BD/2-20],['Operator monitor',x1,1560,z1+260],['Fume extraction',-250,1930,z0+200]];},
  reset(m){m.hx=0;m.hz=0;m.beamP=null;m.camF=0;m.clamp=0;},
  *run(m){yield* stdRun(m,0,function*(b){
    m.state='BOARD IN';yield* conveyTo(b,m.X(0));m.state='SIDE CLAMP';yield* tw(.3,k=>m.clamp=k);
    const tx=DM_X,tz=LZ[0]+DM_Z;m.state='X/Y AXES TO MARK POSITION';const hx0=m.hx,hz0=m.hz;yield* tw(.6,k=>{m.hx=lerp(hx0,tx,ease(k));m.hz=lerp(hz0,tz,ease(k));});
    m.state='LASER MARKING';const T=2.4;let t=0;b.marked=true;b.code='SN2611'+String(b.sn).padStart(5,'0');
    while(t<T){const dt=yield FRAME;t+=dt;const p=Math.min(1,t/T);drawMark(b,p);const n=14,i=Math.floor(p*n*n),cx=i%n,cy=Math.floor(i/n);m.beamP=[tx+(cx-6.5)*DM/16,tz+(cy-6.5)*DM/16];}
    m.beamP=null;m.state='VERIFY CODE (CAMERA)';yield* tw(.3,k=>m.hx=lerp(tx,tx-100,k));m.camF=1;yield .25;m.camF=0;log('LASER #'+b.sn+' marked '+b.code+' · verified','ok');
    yield* tw(.3,k=>m.clamp=1-k);m.state='BOARD OUT';yield* conveyTo(b,m.X(415-BW/2-10));});},
  update(m){m.xb.position.z=m.hz;m.head.position.set(m.hx,1300-40,m.hz);m.clampBar.position.z=LZ[0]-BD/2-16+m.clamp*6;
    const on=!!m.beamP;m.beam.visible=on;m.lensM.emissiveIntensity=on?2:0;m.spark.intensity=on?(1.1+Math.random()):0;m.camM.emissiveIntensity=m.camF*3;
    if(on){const A=new THREE.Vector3(m.hx,1260-169,m.hz),Pp=new THREE.Vector3(m.beamP[0],CONV_Y+BT+.1,m.beamP[1]),d=Pp.clone().sub(A);
      m.beam.position.copy(A).addScaledVector(d,.5);m.beam.scale.set(1,d.length(),1);m.beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());m.spark.position.set(Pp.x,Pp.y+20,Pp.z);}},
  rows(m){return[['Boards marked',String(m.done)],['Last code',m.lastCode||'—']];}
});

/* 4 ---- CONVEYOR  (linking conveyor, 1000 mm, 2 zones of 500 mm) ---- */
const CONV=machine({key:'cleaning',name:'CONVEYOR',full:'Linking conveyor, 1000 mm, 2 zones',L:1000,z1:RAIL_F+168,
  specs:[['Size (L × W × H)','1000 × 570 × 985 mm (M size)'],['Zones','2 × 500 mm (each holds one board)'],['Belt speed','14 m/min, ESD belt'],['Cleaning','none (as confirmed)'],['Source','manufacturer product page']],
  build(m){const x0=-500,x1=500,z1=m.z1,z0=z1-570;m.z0=z0;feet(m.g,x0,x1,z0,z1);
    P(m.g,x1-x0-40,560,z1-z0-60,M.ral,0,370,(z0+z1)/2);P(m.g,x1-x0-60,6,z1-z0-80,M.ralD,0,652,(z0+z1)/2);
    [x0+60,x1-60].forEach(x=>P(m.g,60,CONV_Y-60-650,60,M.ral2,x,(CONV_Y-60+650)/2,(z0+z1)/2));
    rails(m.g,x0,x1,LZ[0],CONV_Y,{legs:false});P(m.g,x1-x0,60,z1-z0,M.ral,0,CONV_Y-70,(z0+z1)/2);
    P(m.g,300,90,14,M.ral2,-250,CONV_Y-70,z1+6);[0,1,2].forEach(i=>P(m.g,24,24,8,[M.green,M.black,M.blue][i],-320+i*50,CONV_Y-70,z1+16));knob(m.g,150,CONV_Y-70,z1+6);
    fnLabel(m.g,m.name,420,0,520,z1-29);
    m.stops=[-10,490].map(x=>cyl(m.g,5,5,16,M.steel,x-BW/2+125-125,CONV_Y-12,LZ[0],{seg:10}));
    m.tags=[['Zone 1 (500 mm)',-250,CONV_Y+60,LZ[0]],['Zone 2 (500 mm)',250,CONV_Y+60,LZ[0]],['Width crank',150,CONV_Y-70,z1+20]];},
  reset(m){m.z1b=null;m.z2b=null;},
  accepts(l){return l===0&&!this.inbox[0].length&&!this.z1b;},
  *run(m){run(convZone2(m));
    while(true){while(!m.inbox[0].length){m.state=m.z2b?'ZONE 2 OCCUPIED':'WAIT FOR BOARD';yield FRAME;}
      const b=m.inbox[0].shift();m.z1b=b;b.t0=simTime;m.state='ZONE 1';yield* conveyTo(b,m.X(-250));
      while(m.z2b)yield FRAME;m.z2b=b;m.z1b=null;}},
  update(m){},
  rows(m){return[['Zone 1',m.z1b?'#'+m.z1b.sn:'free'],['Zone 2',m.z2b?'#'+m.z2b.sn:'free']];}
});
function* convZone2(m){while(true){while(!m.z2b)yield FRAME;const b=m.z2b;yield* conveyTo(b,m.X(500-BW/2-10));m.procT.push(simTime-b.t0);yield* offer(m,b);
  while(b.alive&&b.x<m.x1+BW/2-40&&b.x>m.x0)yield FRAME;m.z2b=null;m.done++;}}

/* 5 ---- SHUTTLE  (dual-track shuttle conveyor with extending input section) ---- */
const SHUTTLE=machine({key:'shuttle',name:'SHUTTLE',full:'Dual-track shuttle conveyor (traverser)',L:500,gap:500,z1:RAIL_F+256,
  specs:[['Size (L × W × H)','500 × 1750 × 1130 mm (M size)'],['Function','one line in → two lanes out; conveyor traverses sideways'],['Input section','extends 500 mm towards the upstream machine to take the board, then retracts with it'],['Traverse','servo driven; lanes 340 mm apart here (customised distance)'],['Belt speed','14 m/min'],['Source','manufacturer brochure + your description of the extension']],
  build(m){const x0=-250,x1=250,z1=m.z1,z0=z1-1750;m.z0=z0;feet(m.g,x0,x1,z0,z1);
    shell(m.g,x0,x1,z0,z1,70,1130,M.ral,{noTop:true,left:[LZ[0]],right:LZ});
    P(m.g,x1-x0,12,z1-z0-700,M.ral,0,1124,z0+(z1-z0-700)/2);hinged(m,'lid',x1-x0-20,690,0,1130,z1-700,true,M.ral);
    touch(m.g,-80,1000,z1);estop(m.g,140,1010,z1);handle(m.g,180,560,z1);vents(m.g,-60,150,z1);fnLabel(m.g,m.name,420,0,880,z1+1);
    [-1,1].forEach(q=>P(m.g,30,30,1500,M.steel,q*170,700,(z0+z1)/2));
    m.car=new THREE.Group();m.g.add(m.car);rails(m.car,-240,240,0,CONV_Y,{legs:false});P(m.car,420,40,BD+60,M.aluD,0,CONV_Y-80,0);P(m.car,80,170,80,M.dark,0,CONV_Y-180,0);
    m.ext=new THREE.Group();m.car.add(m.ext);rails(m.ext,-250,250,0,CONV_Y-1,{legs:false,motor:false});P(m.ext,480,20,BD+20,M.ralD,0,CONV_Y-50,0);
    signal(m,x1-50,z0+60,1130);
    m.tags=[['Traversing carriage',0,CONV_Y+90,0],['Extending input section',-400,CONV_Y+60,LZ[0]],['Lane 1 out',260,CONV_Y+60,LZ[0]],['Lane 2 out',260,CONV_Y+60,LZ[1]]];},
  reset(m){m.cz=LZ[0];m.ex=0;m.next=0;},
  accepts(l){return l===0&&this.ready&&!this.inbox[0].length;},
  *run(m){while(true){
      m.state='EXTEND TOWARDS UPSTREAM';m.ready=false;if(Math.abs(m.cz-LZ[0])>1){const z0=m.cz;yield* tw(1,k=>m.cz=lerp(z0,LZ[0],ease(k)));}
      yield* tw(.8,k=>m.ex=-500*ease(k));m.ready=true;
      while(!m.inbox[0].length){m.state='EXTENDED · WAIT FOR BOARD';yield FRAME;}
      const b=m.inbox[0].shift();m.ready=false;m.busy[0]=true;const t0=simTime;
      m.state='BOARD ONTO EXTENSION';yield* conveyTo(b,m.X(-500));
      m.state='RETRACT WITH BOARD';yield* tw(1,k=>{m.ex=-500*(1-ease(k));b.x=m.X(m.ex);});
      const n=nextOf(m);let tl=m.next;if(n&&!n.accepts(tl)&&n.accepts(1-tl))tl=1-tl;m.next=1-tl;
      m.state='TRAVERSE TO LANE '+(tl+1);const z0=m.cz;yield* tw(.3+Math.abs(LZ[tl]-z0)/500,k=>{m.cz=lerp(z0,LZ[tl],ease(k));b.z=m.cz;});b.lane=tl;
      m.state='BOARD OUT LANE '+(tl+1);yield* conveyTo(b,m.X(250-BW/2-10));m.procT.push(simTime-t0);yield* offer(m,b);
      while(b.alive&&b.x<m.x1+BW/2-40)yield FRAME;m.busy[0]=false;m.done++;}},
  update(m){m.car.position.z=m.cz;m.ext.position.x=m.ex;},
  rows(m){return[['Carriage at',Math.abs(m.cz-LZ[0])<2?'lane 1':Math.abs(m.cz-LZ[1])<2?'lane 2':'traversing'],['Input section',m.ex<-490?'extended':m.ex>-10?'retracted':'moving'],['Boards shuttled',String(m.done)]];}
});

/* 6 ---- SCANNER  (dual-track linking conveyor 500 mm with code readers) ---- */
const SCAN=machine({key:'scanner',name:'SCANNER',full:'Dual-track scanning conveyor, 500 mm',L:500,lanesIn:[0,1],z1:RAIL_F+168,
  specs:[['Length','500 mm, dual track'],['Function','reads the 2D code of every board on both lanes'],['Hood','hinged smoked-glass cover (your photo)'],['Controls','lane-width knob per lane, E-stop, buttons'],['Source','manufacturer linking-conveyor data + your photo']],
  build(m){const x0=-250,x1=250,z1=m.z1,z0=LZ[1]-BD/2-7-160;m.z0=z0;feet(m.g,x0,x1,z0,z1);
    P(m.g,x1-x0,CONV_Y-140,z1-z0,M.ral,0,(CONV_Y-140)/2+40,(z0+z1)/2);P(m.g,x1-x0,100,z1-z0,M.ral,0,CONV_Y-100,(z0+z1)/2);
    LZ.forEach(z=>rails(m.g,x0,x1,z,CONV_Y,{legs:false,motor:false}));
    [-1,1].forEach(q=>P(m.g,x1-x0,330,14,M.ral,0,CONV_Y+145,q>0?z1-7:z0+7));hinged(m,'lid',x1-x0-10,z1-z0-20,0,CONV_Y+315,z0+10,true,M.ral);
    knob(m.g,-140,CONV_Y-100,z1);knob(m.g,140,CONV_Y-100,z1);estop(m.g,180,CONV_Y-30,z1);[0,1,2].forEach(i=>P(m.g,24,24,8,[M.yellow,M.blue,M.red][i],-30+i*34,CONV_Y-30,z1+4));
    handle(m.g,-180,450,z1);vents(m.g,-140,120,z1);fnLabel(m.g,m.name,420,0,CONV_Y+60,z1+1);
    m.heads=[];m.fans=[];LZ.forEach((z,i)=>{P(m.g,60,80,60,M.black,DM_X,CONV_Y+230,z+DM_Z);const lm=new THREE.MeshStandardMaterial({color:0x200,emissive:0xff2020,emissiveIntensity:0});cyl(m.g,14,14,4,lm,DM_X,CONV_Y+188,z+DM_Z,{cast:false});m.heads.push(lm);
      const f=new THREE.Mesh(new THREE.ConeGeometry(28,186,4,1,true),new THREE.MeshBasicMaterial({color:0xff3030,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));f.position.set(DM_X,CONV_Y+95,z+DM_Z);f.visible=false;m.g.add(f);m.fans.push(f);});
    signal(m,x1-40,z0+40,CONV_Y+320);
    m.tags=[['Code reader lane 1',DM_X,CONV_Y+290,LZ[0]],['Code reader lane 2',DM_X,CONV_Y+290,LZ[1]],['Lane-width knobs',0,CONV_Y-60,z1]];},
  reset(m){m.read=[0,0];m.res=['—','—'];m.fail=0;},
  *run(m,l){yield* stdRun(m,l,function*(b){m.state='READING L'+(l+1);yield* conveyTo(b,m.X(0));m.read[l]=1;yield .45;
    m.res[l]=b.marked?b.code:'NO READ';if(!b.marked)m.fail++;log('SCAN L'+(l+1)+' #'+b.sn+' '+(b.marked?'read '+b.code:'NO READ'),b.marked?'ok':'ng');m.read[l]=0;
    yield* conveyTo(b,m.X(250-BW/2-10));});},
  update(m){m.heads.forEach((h,i)=>{h.emissiveIntensity=m.read[i]?2.5:.1;m.fans[i].visible=!!m.read[i];});},
  rows(m){return[['Lane 1 last read',m.res[0]],['Lane 2 last read',m.res[1]],['No-reads',String(m.fail)]];}
});

/* 7 ---- BELT FIFO  (dual track: two belt-segment stacks side by side) ---- */
const NSL=20,PIT=27;
const FIFO=machine({key:'fifo',name:'FIFO BUFFER',full:'Dual-track belt FIFO buffer',L:500,lanesIn:[0,1],z1:RAIL_F+354,
  specs:[['Size','500 mm long (M), 1700 mm high; single-track model 500 × 1050 × 1700 mm'],['Principle','individual belt segments support each board over its full length; a drive engages the selected segment to move the board in or out'],['Capacity','20 boards per lane at 27 mm pitch'],['Lanes','two stacks side by side, one per lane (as confirmed)'],['Modes','FIFO / LIFO / bypass'],['Source','manufacturer product page + brochure + your photo']],
  build(m){const x0=-250,x1=250,z1=m.z1,z0=LZ[1]-BD/2-7-482;m.z0=z0;feet(m.g,x0,x1,z0,z1);
    shell(m.g,x0,x1,z0,z1,70,1700,M.ral,{noFront:true,left:LZ,right:LZ});
    P(m.g,x1-x0,1020,12,M.ral,0,560,z1-6);P(m.g,x1-x0,90,12,M.ral,0,1655,z1-6);P(m.g,60,540,12,M.ral,x0+30,1340,z1-6);P(m.g,60,540,12,M.ral,x1-30,1340,z1-6);
    hinged(m,'door',x1-x0-120,520,0,1600,z1+2,true,M.ral);
    touch(m.g,0,1000,z1,180,90);handle(m.g,-190,560,z1);estop(m.g,190,1120,z1);P(m.g,180,240,4,M.black,60,560,z1+2);P(m.g,164,224,4,M.white||M.ral2,60,560,z1+4);vents(m.g,-170,100,z1);vents(m.g,170,100,z1,100);
    fnLabel(m.g,m.name,440,0,860,z1+1);
    m.racks=LZ.map(z=>{const g=new THREE.Group();m.g.add(g);
      [-1,1].forEach(s=>P(g,440,(NSL-1)*PIT+40,10,M.mag,0,((NSL-1)*PIT)/2,z+s*(BD/2+28)));
      for(let k=0;k<NSL;k++){[-1,1].forEach(s=>P(g,420,3,10,M.rubber,0,k*PIT-3,z+s*(BD/2-2)));}
      P(g,440,10,BD+70,M.magD,0,-20,z);return g;});
    LZ.forEach(z=>{rails(m.g,x0,x0+40,z,CONV_Y,{legs:false,motor:false});rails(m.g,x1-40,x1,z,CONV_Y,{legs:false,motor:false});});
    m.drive=LZ.map(z=>P(m.g,40,30,BD,M.dark,-200,CONV_Y-20,z));
    signal(m,x1-50,z0+60,1700);
    m.tags=[['Lane 1 belt-segment stack',0,1500,LZ[0]],['Lane 2 belt-segment stack',0,1500,LZ[1]],['Segment drive',-200,CONV_Y-60,0]];},
  reset(m){m.slots=[new Array(NSL).fill(null),new Array(NSL).fill(null)];m.rackY=[CONV_Y,CONV_Y];m.lock=[false,false];m.inB=[false,false];},
  accepts(l){return !this.inbox[l].length&&!this.inB[l]&&this.slots[l].filter(s=>s).length<NSL;},
  *run(m,l){run(fifoOut(m,l));
    while(true){while(!m.inbox[l].length)yield FRAME;const b=m.inbox[l].shift();m.inB[l]=true;
      while(m.lock[l])yield FRAME;m.lock[l]=true;
      const k=m.slots[l].findIndex(s=>!s);m.state='STORE L'+(l+1)+' → SEGMENT '+(k+1);
      yield* rackTo(m,l,CONV_Y-k*PIT);yield* conveyTo(b,m.X(0));m.slots[l][k]={b,t:simTime};m.inB[l]=false;m.lock[l]=false;}},
  update(m){m.racks.forEach((g,l)=>{g.position.y=m.rackY[l];m.slots[l].forEach((s,k)=>{if(s){s.b.x=m.X(0);s.b.z=LZ[l];s.b.dy=m.rackY[l]+k*PIT-CONV_Y;}});});},
  rows(m){return[['Lane 1 stored',m.slots[0].filter(s=>s).length+' / '+NSL],['Lane 2 stored',m.slots[1].filter(s=>s).length+' / '+NSL],['Output',fifoGate(m)?'release':'held (downstream busy)']];}
});
function fifoGate(m){if(lineMode)return true;return simTime%80<40;}   // single view: downstream "stopped" half the time so the buffer fills and drains
function* rackTo(m,l,y){const y0=m.rackY[l],d=Math.abs(y-y0);if(d<.5)return;yield* tw(.2+d/400,k=>m.rackY[l]=lerp(y0,y,ease(k)));}
function* fifoOut(m,l){while(true){
  const occ=m.slots[l].map((s,k)=>s&&{k,t:s.t,b:s.b}).filter(Boolean).sort((a,b)=>a.t-b.t);const n=nextOf(m);
  if(!occ.length||m.lock[l]||!fifoGate(m)||(n&&!n.accepts(l))){yield FRAME;continue;}
  m.lock[l]=true;const o=occ[0];m.state='RELEASE L'+(l+1)+' ← SEGMENT '+(o.k+1);const t0=o.t;
  yield* rackTo(m,l,CONV_Y-o.k*PIT);m.slots[l][o.k]=null;o.b.dy=0;yield* conveyTo(o.b,m.X(250-BW/2-10));m.lock[l]=false;
  m.procT.push(simTime-t0);yield* offer(m,o.b);m.done++;}}

/* 8 ---- INVERTER  (X-axis inverter: flips the board about the travel axis) ---- */
const INVERT=machine({key:'inverter',name:'INVERTER',full:'X-axis board inverter',L:500,lanesIn:[0,1],z1:RAIL_F+256,
  specs:[['Function','turns the board 180° about the travel (X) axis for double-sided production'],['Cycle time','≈ 8 s'],['Safety','built-in torque limiter'],['Size','single-lane class 500 × 815 × 1330 mm; shown with one flip unit per lane (dual track, as it sits between dual-track machines — please confirm)'],['Source','distributor product page + manufacturer brochure (inverter range)']],
  build(m){const x0=-250,x1=250,z1=m.z1,z0=LZ[1]-BD/2-7-345;m.z0=z0;feet(m.g,x0,x1,z0,z1);
    shell(m.g,x0,x1,z0,z1,70,1330,M.ral,{noFront:true,left:LZ,right:LZ});
    P(m.g,x1-x0,820,12,M.ral,0,480,z1-6);P(m.g,x1-x0,90,12,M.ral,0,1285,z1-6);P(m.g,40,340,12,M.ral,x0+20,1060,z1-6);P(m.g,40,340,12,M.ral,x1-20,1060,z1-6);
    hinged(m,'door',x1-x0-60,330,0,1235,z1+2,true,M.ral);touch(m.g,130,1290,z1,110,70);handle(m.g,-190,500,z1);vents(m.g,-170,120,z1);estop(m.g,180,820,z1);
    fnLabel(m.g,m.name,440,0,860,z1+1);
    m.rot=LZ.map(z=>{const g=new THREE.Group();g.position.set(0,CONV_Y+BT/2,z);m.g.add(g);
      [-1,1].forEach(s=>{const d=new THREE.Mesh(new THREE.TorusGeometry(140,9,8,40),M.aluD);d.rotation.y=PI/2;d.position.x=s*210;g.add(d);
        for(let a=0;a<4;a++){const sp=new THREE.Mesh(new THREE.BoxGeometry(8,280,8),M.aluD);sp.rotation.x=a*PI/4;sp.position.x=s*210;g.add(sp);}});
      [-1,1].forEach(v=>{[-1,1].forEach(s=>{P(g,440,10,12,M.alu,0,v*(BT/2+13),s*(BD/2+7));const bl=new THREE.Mesh(new THREE.BoxGeometry(440,3,6),beltMat);bl.position.set(0,v*(BT/2+2.5),s*(BD/2-2.5));g.add(bl);});});
      return g;});
    signal(m,x1-40,z0+40,1330);
    m.tags=[['Flip unit lane 1',0,CONV_Y+190,LZ[0]],['Flip unit lane 2',0,CONV_Y+190,LZ[1]]];},
  reset(m){m.ang=[0,0];},
  *run(m,l){yield* stdRun(m,l,function*(b){m.state='BOARD IN L'+(l+1);yield* conveyTo(b,m.X(0));yield .3;m.state='FLIP 180° L'+(l+1);
    const a0=m.ang[l],f0=b.flip;yield* tw(2.2,k=>{m.ang[l]=a0+PI*ease(k);b.flip=f0+PI*ease(k);});b.flipped=!b.flipped;yield .3;
    m.state='BOARD OUT L'+(l+1);yield* conveyTo(b,m.X(250-BW/2-10));});},
  update(m){m.rot.forEach((g,l)=>g.rotation.x=m.ang[l]);},
  rows(m){return[['Boards flipped',String(m.done)]];}
});

/* 9 ---- UNLOADER  (triple-magazine line unloader, M size) ---- */
const UNLOAD=machine({key:'unloader',name:'UNLOADER',full:'Triple-magazine line unloader',L:1080,lanesIn:[0,1],sink:true,z1:RAIL_F+380,
  specs:[['Size (L × W × H)','1080 × 1750 × 1750 mm'],['Magazines','3 side by side on one servo lift platform'],['Board in','shuttle conveyor lines up with lane 1 or 2, then a pusher cylinder pushes the board into the magazine'],['Unloading time','≈ 18–22 s per board (rear magazine)'],['Filling','top to bottom'],['Source','manufacturer product page, technical drawing and brochure + your photo and video']],
  build(m){m.z0=m.z1-1750;buildMagHandler(m,false);},
  reset(m){m.mags=[0,1,2].map(()=>({present:true,boards:new Array(MG.slots).fill(null),lift:0,busy:false}));m.platY=slotPlat(MG.use-1);m.cz=LZ[0];m.rodX=0;m.ops=0;m.stored=0;},
  accepts(l){return !this.inbox[0].length&&!this.inbox[1].length&&!this.busy[0];},
  *run(m){const xr=m.shX-170;
    while(true){while(!m.inbox[0].length&&!m.inbox[1].length){m.state='WAIT FOR BOARD';yield FRAME;}
      const l=m.inbox[0].length?0:1,b=m.inbox[l].shift();m.busy[0]=true;const t0=simTime;
      m.state='SHUTTLE TO LANE '+(l+1);const z0=m.cz;yield* tw(.25+Math.abs(LZ[l]-z0)/900,t=>m.cz=lerp(z0,LZ[l],ease(t)));
      m.state='BOARD ONTO SHUTTLE';yield* conveyTo(b,m.X(m.shX));
      let i;while((i=m.mags.findIndex(g=>g.present&&!g.busy&&g.boards.slice(0,MG.use).some(x=>!x)))<0){m.state='OPERATOR: PLACE EMPTY MAGAZINE';yield FRAME;}
      const mg=m.mags[i];let k=-1;for(let j=MG.use-1;j>=0;j--)if(!mg.boards[j]){k=j;break;}
      m.state='SHUTTLE TO MAGAZINE '+(i+1)+' · SLOT '+(k+1);const zb=m.cz,p0=m.platY;
      yield* tw(.25+Math.abs(m.magZ[i]-zb)/900,t=>{m.cz=lerp(zb,m.magZ[i],ease(t));b.z=m.cz;m.platY=lerp(p0,slotPlat(k),ease(t));});
      m.state='PUSH BOARD INTO MAGAZINE';const bx0=b.x,bx1=m.X(m.magX);yield* tw(1.3,t=>{m.rodX=lerp(0,m.magX-m.shX-BW/2+30+170,t)*1;b.x=lerp(bx0,bx1,t);});
      b.inMag=true;mg.boards[k]=b;yield* tw(.5,t=>m.rodX=lerp(m.rodX,0,t));
      m.stored++;m.outT.push(simTime);m.procT.push(simTime-t0);m.done++;m.busy[0]=false;
      if(mg.boards.slice(0,MG.use).every(x=>x))run(swapMag(m,i,false));}},
  update(m){magBoardsUpdate(m);},
  rows(m){return[['Magazine 1 / 2 / 3',m.mags.map(g=>g.present?g.boards.filter(b=>b).length+'/'+MG.use:'—').join(' · ')],['Boards stored',String(m.stored)],['Magazine changes (operator)',String(m.ops)]];}
});

/* ---------- line layout (gap before the shuttle for its extending input section) ---------- */
const TOTAL=MACH.reduce((s,m)=>s+m.L+m.gap,0);
{let x=-TOTAL/2;MACH.forEach((m,i)=>{m.i=i;x+=m.gap;m.x0=x;m.x1=x+m.L;m.cx=x+m.L/2;m.X=lx=>m.cx+lx;m.g.position.x=m.cx;m.build(m);x+=m.L;});}
