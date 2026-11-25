/* 1 ---- LOADER  (triple-magazine line loader, M size) ---- */
const LOADER=machine({key:'loader',name:'LOADER',full:'Triple-magazine line loader',L:1080,source:true,z1:RAIL_F+380,
  specs:[['Size (L × W × H)','1080 × 1750 × 1750 mm'],['Magazines','3 side by side on one servo lift platform'],['Max magazine','355 × 320 × 570 mm, 50 kg each'],['Board out','unloads from the bottom slot upward: a white puller rod runs under the panel, its finger flips up behind the far edge and pulls the panel onto the shuttle conveyor; the shuttle then moves sideways to the line'],['Loading time','≈ 18–24 s per board (rear magazine)'],['Magazine','open frame with comb slot rails every 10 mm; a board in every 2nd slot (20 mm) leaves a gap for the puller; top 5 positions empty'],['Belt speed','14 m/min'],['Source','manufacturer product page, technical drawing and brochure + your video']],
  build(m){m.z0=m.z1-1750;buildMagHandler(m,true);},
  reset(m){m.mags=[0,1,2].map(()=>({present:true,boards:new Array(MG.slots).fill(null),lift:0,busy:false}));
    m.mags.forEach(mg=>{for(let k=0;k<MG.use;k++){const b=newBoard(0);b.inMag=true;mg.boards[k]=b;}});
    m.platY=slotPlat(0);m.cz=LZ[0];m.rodX=rodRest(m);m.hook=0;m.sens=0;m.ops=0;},
  *run(m){
    while(true){const i=m.mags.findIndex(g=>g.present&&!g.busy&&g.boards.some(b=>b));
      if(i<0){m.state='OPERATOR: LOAD FULL MAGAZINE';yield FRAME;continue;}
      const mg=m.mags[i],k=mg.boards.findIndex(b=>b);   // bottom to top (lowest panel first)
      m.state='SHUTTLE TO MAGAZINE '+(i+1)+' · SLOT '+(k+1);const z0=m.cz,p0=m.platY,p1=slotPlat(k);
      yield* tw(.25+Math.abs(m.magZ[i]-z0)/900,t=>{m.cz=lerp(z0,m.magZ[i],ease(t));m.platY=lerp(p0,p1,ease(t));});
      const far=m.magX-BW/2-8;
      m.state='PULLER UNDER THE PANEL INTO MAGAZINE';m.hook=0;yield* tw(1.0,t=>m.rodX=lerp(rodRest(m),far,ease(t)));
      m.state='FINGER UP BEHIND THE PANEL';yield* tw(.3,t=>m.hook=t);
      const b=mg.boards[k];mg.boards[k]=null;b.inMag=false;b.z=m.magZ[i];b.dy=0;const t0=simTime;
      m.state='PULL BOARD ONTO SHUTTLE';yield* tw(1.6,t=>{m.rodX=lerp(far,rodRest(m),t);b.x=m.X(m.rodX+BW/2+8);});
      m.state='FINGER DOWN';yield* tw(.25,t=>m.hook=1-t);
      if(!mg.boards.some(x=>x))run(swapMag(m,i,true));
      m.state='SHUTTLE TO LINE';const zb=m.cz;yield* tw(.25+Math.abs(LZ[0]-zb)/900,t=>{m.cz=lerp(zb,LZ[0],ease(t));b.z=m.cz;});
      m.state='BOARD OUT';yield* conveyTo(b,m.X(m.L/2-BW/2-10));m.procT.push(simTime-t0);m.busy[0]=true;yield* offer(m,b);m.busy[0]=false;m.done++;}},
  update(m){magBoardsUpdate(m);},
  rows(m){return[['Magazine 1 / 2 / 3',m.mags.map(g=>g.present?g.boards.filter(b=>b).length:'—').join(' / ')+' boards'],['Magazine changes (operator)',String(m.ops)]];}
});

/* 2 ---- DESTACKER  (logistics loader: batch buffer + separator) ---- */
const DESTACK=machine({key:'destacker',noSpawn:true,name:'DESTACKER',full:'Logistics loader / destacker (batch buffer + separator)',L:1100,z1:RAIL_F+170,
  specs:[['Function','Loads bare boards from stacks (batches) onto the line; passes boards from the loader through'],['Batch buffer','8 batches of 60 mm, FIFO; loaded without stopping production'],['Separator','takes boards off the top of the stack with a clamp mechanism'],['Size','≈ 1100 × 900 × 1050 mm (estimated from photo — no datasheet available)'],['Source','dealer listing (manufacturer description) + photo']],
  build(m){const x0=-550,x1=550,z1=m.z1,z0=z1-900;m.z0=z0;feet(m.g,x0,x1,z0,z1);
    shell(m.g,x0,x1,z0,z1,70,1050,M.pnl,{noTop:true,left:[LZ[0]],right:[LZ[0]]});
    P(m.g,10,1050-70,z1-z0,M.pnl,0,560,(z0+z1)/2);P(m.g,x1-x0,12,z1-z0,M.pnl,0,860,(z0+z1)/2).visible=false;
    hinged(m,'lid',540,z1-z0-20,-275,1050,z0+10,true,M.pnl);hinged(m,'lid',540,(z1-z0)*.55,275,1050,z0+10,true,M.pnl);
    P(m.g,540,40,(z1-z0)*.45-10,M.inox,275,1030,z1-((z1-z0)*.45)/2-5);
    P(m.g,190,80,12,M.pnlD,-120,960,z1+2);touch(m.g,-150,960,z1+6,100,64);for(let i=0;i<6;i++)P(m.g,14,14,6,M.black,-70+(i%3)*18,950+Math.floor(i/3)*18,z1+10);
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
  reset(m){m.batches=[];for(let i=0;i<8;i++)m.batches.push({n:37,lev:i});m.sep=null;m.loads=8;m.sepY=210;m.gzz=m.bz;m.gy=CONV_Y+70;m.clamp=0;m.lastIn=simTime;m.held=null;},
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
  const sync=()=>{if(m.held){m.held.x=m.X(275);m.held.z=m.gzz;m.held.dy=m.gy-CONV_Y;}};
  const topY=m.sepY+m.sep.n*BT;yield* tw(.5,k=>{m.gzz=m.bz;m.gy=lerp(CONV_Y+70,topY,ease(k));});m.clamp=1;yield .2;
  const b=newBoard(0);m.sep.n--;m.held=b;sync();
  m.state='LIFT + MOVE TO CONVEYOR';yield* tw(.4,k=>{m.gy=lerp(topY,CONV_Y+70,ease(k));sync();});yield* tw(.8,k=>{m.gzz=lerp(m.bz,LZ[0],ease(k));sync();});
  yield* tw(.4,k=>{m.gy=lerp(CONV_Y+70,CONV_Y,ease(k));sync();});m.clamp=0;m.held=null;b.x=m.X(275);b.z=LZ[0];b.dy=0;yield .15;
  run(tw(.9,k=>{m.gy=lerp(CONV_Y,CONV_Y+70,ease(k));m.gzz=lerp(LZ[0],m.bz,ease(k));}));m.state='BOARD OUT';return b;}

/* 3 ---- LASER MARKER ---- */
const LASER=machine({key:'laser',name:'LASER MARKER',full:'Inline laser marking system',L:830,z1:RAIL_F+400,
  specs:[['Size (L × W × H)','830 × 1565 × 1550 mm'],['Transport height','920 ± 50 mm'],['Panel size','70–508 × 50–508 mm, 0.8–4 mm'],['Laser','CO2 or fibre, on a linear X/Y axis above the transport'],['Positioning','board clamped by an integrated side clamp'],['Laser window','max 80 × 80 mm'],['Verification','high-resolution camera reads the code back'],['Accuracy','± 100 µm @ 5σ'],['Source','manufacturer datasheet']],
  build(m){const x0=-415,x1=415,z1=m.z1,z0=z1-1300;m.z0=z0;feet(m.g,x0,x1,z0,z1);
    shell(m.g,x0,x1,z0,z1,70,1550,M.pnl,{noFront:true,left:[LZ[0]],right:[LZ[0]]});
    P(m.g,x1-x0,860,12,M.pnl,0,500,z1-6);P(m.g,x1-x0,120,12,M.pnl,0,1490,z1-6);P(m.g,40,560,12,M.pnl,x0+20,1150,z1-6);P(m.g,40,560,12,M.pnl,x1-20,1150,z1-6);
    hinged(m,'door',x1-x0-80,560,0,1430,z1+2,true,M.pnlD);
    P(m.g,x1-x0-60,40,10,M.pnlD,0,880,z1+3);handle(m.g,-60,560,z1);handle(m.g,60,560,z1);vents(m.g,-200,140,z1);fnLabel(m.g,m.name,520,0,780,z1+1);
    const arm=new THREE.Group();arm.position.set(x1-30,0,z1);m.g.add(arm);P(arm,40,40,260,M.pnlD,0,1250,130);P(arm,60,200,60,M.pnlD,0,1170,260);touch(arm,-40,1330,260,300,210);
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
const SHUTTLE=machine({key:'shuttle',name:'SHUTTLE',full:'Dual-track shuttle conveyor (traverser)',L:500,gap:0,z1:RAIL_F+256,
  specs:[['Size (L × W × H)','500 × 1750 × 1130 mm (M size)'],['Function','one line in → two lanes out; conveyor traverses sideways'],['Output section','after traversing, extends 500 mm towards the downstream machine carrying the board and hands it over, then retracts'],['Traverse','servo driven; lanes 340 mm apart here (customised distance)'],['Belt speed','14 m/min'],['Source','manufacturer brochure (cantilevered output conveyor option) + your description']],
  build(m){const x0=-250,x1=250,z1=m.z1,z0=z1-1750;m.z0=z0;feet(m.g,x0,x1,z0,z1);
    shell(m.g,x0,x1,z0,z1,70,1130,M.ral,{noTop:true,left:[LZ[0]],right:LZ});
    P(m.g,x1-x0,12,z1-z0-700,M.ral,0,1124,z0+(z1-z0-700)/2);hinged(m,'lid',x1-x0-20,690,0,1130,z1-700,true,M.ral);
    touch(m.g,-80,1000,z1);estop(m.g,140,1010,z1);handle(m.g,180,560,z1);vents(m.g,-60,150,z1);fnLabel(m.g,m.name,420,0,880,z1+1);
    [-1,1].forEach(q=>P(m.g,30,30,1500,M.steel,q*170,700,(z0+z1)/2));
    m.car=new THREE.Group();m.g.add(m.car);rails(m.car,-240,240,0,CONV_Y,{legs:false});P(m.car,420,40,BD+60,M.aluD,0,CONV_Y-80,0);P(m.car,80,170,80,M.dark,0,CONV_Y-180,0);
    m.ext=new THREE.Group();m.car.add(m.ext);rails(m.ext,-250,250,0,CONV_Y-1,{legs:false,motor:false});P(m.ext,480,20,BD+20,M.ralD,0,CONV_Y-50,0);
    signal(m,x1-50,z0+60,1130);
    m.tags=[['Traversing carriage',0,CONV_Y+90,0],['Extending output section',420,CONV_Y+60,LZ[1]],['Lane 1 in',-260,CONV_Y+60,LZ[0]]];},
  reset(m){m.cz=LZ[0];m.ex=0;m.next=0;m.ready=true;},
  accepts(l){return l===0&&this.ready&&!this.inbox[0].length;},
  *run(m){while(true){
      m.ready=true;while(!m.inbox[0].length){m.state='AT LANE 1 · WAIT FOR BOARD';yield FRAME;}
      const b=m.inbox[0].shift();m.ready=false;m.busy[0]=true;const t0=simTime;
      m.state='BOARD ONTO SHUTTLE';yield* conveyTo(b,m.X(0));
      const n=nextOf(m);let tl=m.next;if(n&&!n.accepts(tl)&&n.accepts(1-tl))tl=1-tl;m.next=1-tl;
      m.state='TRAVERSE TO LANE '+(tl+1);const z0=m.cz;yield* tw(.3+Math.abs(LZ[tl]-z0)/500,k=>{m.cz=lerp(z0,LZ[tl],ease(k));b.z=m.cz;});b.lane=tl;
      if(n){const st='WAIT FOR '+n.name;while(!n.accepts(tl)){m.state=st;yield FRAME;}}
      m.state='EXTEND WITH BOARD → DOWNSTREAM';yield* tw(1,k=>{m.ex=500*ease(k);b.x=m.X(m.ex);});
      m.state='HAND OVER LANE '+(tl+1);m.procT.push(simTime-t0);yield* offer(m,b);
      while(b.alive&&b.x<m.X(500)+BW/2+20)yield FRAME;
      m.state='RETRACT';yield* tw(.8,k=>m.ex=500*(1-ease(k)));
      m.state='RETURN TO LANE 1';const z1=m.cz;yield* tw(.3+Math.abs(LZ[0]-z1)/500,k=>m.cz=lerp(z1,LZ[0],ease(k)));
      m.busy[0]=false;m.done++;}},
  update(m){m.car.position.z=m.cz;m.ext.position.x=m.ex;},
  rows(m){return[['Carriage at',Math.abs(m.cz-LZ[0])<2?'lane 1':Math.abs(m.cz-LZ[1])<2?'lane 2':'traversing'],['Output section',m.ex>490?'extended':m.ex<10?'retracted':'moving'],['Boards shuttled',String(m.done)]];}
});

/* 6 ---- SCANNER  (dual-track linking conveyor 500 mm with code readers) ---- */
const SCAN=machine({key:'scanner',name:'SCANNER',full:'Dual-track scanning conveyor, 500 mm',L:500,gap:500,lanesIn:[0,1],z1:RAIL_F+168,
  specs:[['Length','500 mm, dual track'],['Function','reads the 2D code of every board on both lanes'],['Hood','hinged smoked-glass cover (your photo)'],['Controls','lane-width knob per lane, E-stop, buttons'],['Source','manufacturer linking-conveyor data + your photo']],
  build(m){buildScannerBody(m);},
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
    P(m.g,x1-x0,1020,12,M.ral,0,560,z1-6);
    // upper front door with the rounded window (as in your video); hinged at the top, lifts up
    {const p=new THREE.Group();p.position.set(0,1700,z1+2);m.g.add(p);const w=x1-x0,h=630;
     const sh=new THREE.Shape();sh.moveTo(-w/2,-h);sh.lineTo(w/2,-h);sh.lineTo(w/2,0);sh.lineTo(-w/2,0);sh.closePath();
     const rr=60,wx=w/2-55,y0=-h+70,y1=-90,ho=new THREE.Path();ho.moveTo(-wx+rr,y0);ho.lineTo(wx-rr,y0);ho.quadraticCurveTo(wx,y0,wx,y0+rr);ho.lineTo(wx,y1-rr);ho.quadraticCurveTo(wx,y1,wx-rr,y1);
     ho.lineTo(-wx+rr,y1);ho.quadraticCurveTo(-wx,y1,-wx,y1-rr);ho.lineTo(-wx,y0+rr);ho.quadraticCurveTo(-wx,y0,-wx+rr,y0);sh.holes.push(ho);
     const pm=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth:12,bevelEnabled:false,curveSegments:8}),M.ral);pm.position.z=-12;p.add(pm);
     const gs=new THREE.Shape(ho.getPoints(8));const gl=new THREE.Mesh(new THREE.ShapeGeometry(gs),M.smoke);gl.position.z=-6;gl.renderOrder=5;p.add(gl);
     P(p,26,90,16,M.black,-w/2+30,-h/2-40,8);m.hoods.push({p,open:0,target:0,ang:-1.05});}
    const lamp=new THREE.PointLight(0xe8f0ff,.9,900,1.4);lamp.position.set(0,1350,(z0+z1)/2+150);m.g.add(lamp);
    touch(m.g,0,1015,z1,190,80);handle(m.g,-190,560,z1);estop(m.g,190,1150,z1);P(m.g,180,240,4,M.black,60,560,z1+2);P(m.g,164,224,4,M.white||M.ral2,60,560,z1+4);vents(m.g,-170,100,z1);vents(m.g,170,100,z1,100);
    fnLabel(m.g,m.name,440,0,860,z1+1);
    m.racks=LZ.map(z=>{const g=new THREE.Group();m.g.add(g);
      // each belt segment = two narrow belts (front / back edge) over two pulleys, supporting the board over its full length
      const pr=[],pb=[],pp=[];
      [-1,1].forEach(s=>{const gg=new THREE.BoxGeometry(440,(NSL-1)*PIT+60,8);gg.translate(0,((NSL-1)*PIT)/2,z+s*(BD/2+30));pr.push(gg);
        [-1,1].forEach(e=>{const c=new THREE.BoxGeometry(30,(NSL-1)*PIT+60,30);c.translate(e*205,((NSL-1)*PIT)/2,z+s*(BD/2+30));pr.push(c);});});
      for(let k=0;k<NSL;k++)[-1,1].forEach(s=>{const zc=z+s*(BD/2-4);
        const b1=new THREE.BoxGeometry(400,2.4,12);b1.translate(0,k*PIT-BT/2-1.2,zc);pb.push(b1);const b2=b1.clone();b2.translate(0,-9,0);pb.push(b2);
        [-1,1].forEach(e=>{const c=new THREE.CylinderGeometry(5.5,5.5,14,10);c.rotateX(PI/2);c.translate(e*200,k*PIT-BT/2-6,zc);pp.push(c);});
        const r=new THREE.BoxGeometry(420,4,6);r.translate(0,k*PIT-12,z+s*(BD/2+12));pr.push(r);});
      [[pr,M.mag],[pb,M.rubber],[pp,M.steel]].forEach(([a,mt])=>{const mm=new THREE.Mesh(BGU.mergeBufferGeometries(a,false),mt);mm.castShadow=true;mm.receiveShadow=true;g.add(mm);a.forEach(q=>q.dispose());});
      P(g,440,10,BD+80,M.magD,0,-30,z);return g;});
    LZ.forEach(z=>{rails(m.g,x0,x0+40,z,CONV_Y,{legs:false,motor:false});rails(m.g,x1-40,x1,z,CONV_Y,{legs:false,motor:false});});
    m.drive=LZ.map(z=>{const d=new THREE.Group();d.position.set(-205,CONV_Y-BT/2-6,z);m.g.add(d);[-1,1].forEach(s=>{const w=cyl(d,16,16,16,M.orange,0,0,s*(BD/2-4),{rx:PI/2,seg:16});});P(d,40,40,BD-30,M.dark,-30,-20,0);return d;});
    m.drv=[0,0];
    signal(m,x1-50,z0+60,1700);
    m.tags=[['Lane 1 belt-segment stack',0,1500,LZ[0]],['Lane 2 belt-segment stack',0,1500,LZ[1]],['Segment drive (engages the belt at the transfer level)',-205,CONV_Y-40,LZ[0]],['Rounded window door — click to open',0,1450,z1]];},
  reset(m){m.drv=[0,0];m.slots=[new Array(NSL).fill(null),new Array(NSL).fill(null)];m.rackY=[CONV_Y,CONV_Y];m.lock=[false,false];m.inB=[false,false];},
  accepts(l){return !this.inbox[l].length&&!this.inB[l]&&this.slots[l].filter(s=>s).length<NSL;},
  *run(m,l){run(fifoOut(m,l));
    while(true){while(!m.inbox[l].length)yield FRAME;const b=m.inbox[l].shift();m.inB[l]=true;
      while(m.lock[l])yield FRAME;m.lock[l]=true;
      const k=m.slots[l].findIndex(s=>!s);m.state='STORE L'+(l+1)+' → SEGMENT '+(k+1);
      yield* rackTo(m,l,CONV_Y-k*PIT);m.drv[l]=1;yield* conveyTo(b,m.X(0));m.drv[l]=0;m.slots[l][k]={b,t:simTime};m.inB[l]=false;m.lock[l]=false;}},
  update(m,dt){m.drive.forEach((d,l)=>{d.position.x=-205+(m.drv[l]?6:0);d.children.forEach(c=>{if(c.geometry.type==='CylinderGeometry')c.rotation.z-=m.drv[l]?dt*12:0;});});m.racks.forEach((g,l)=>{g.position.y=m.rackY[l];m.slots[l].forEach((s,k)=>{if(s){s.b.x=m.X(0);s.b.z=LZ[l];s.b.dy=m.rackY[l]+k*PIT-CONV_Y;}});});},
  rows(m){return[['Lane 1 stored',m.slots[0].filter(s=>s).length+' / '+NSL],['Lane 2 stored',m.slots[1].filter(s=>s).length+' / '+NSL],['Output',fifoGate(m)?'release':'held (downstream busy)']];}
});
function fifoGate(m){if(lineMode)return true;return simTime%80<40;}   // single view: downstream "stopped" half the time so the buffer fills and drains
function* rackTo(m,l,y){const y0=m.rackY[l],d=Math.abs(y-y0);if(d<.5)return;yield* tw(.2+d/400,k=>m.rackY[l]=lerp(y0,y,ease(k)));}
function* fifoOut(m,l){while(true){
  const occ=m.slots[l].map((s,k)=>s&&{k,t:s.t,b:s.b}).filter(Boolean).sort((a,b)=>a.t-b.t);const n=nextOf(m);
  if(!occ.length||m.lock[l]||!fifoGate(m)||(n&&!n.accepts(l))){yield FRAME;continue;}
  m.lock[l]=true;const o=occ[0];m.state='RELEASE L'+(l+1)+' ← SEGMENT '+(o.k+1);const t0=o.t;
  yield* rackTo(m,l,CONV_Y-o.k*PIT);m.slots[l][o.k]=null;o.b.dy=0;m.drv[l]=1;yield* conveyTo(o.b,m.X(250-BW/2-10));m.drv[l]=0;m.lock[l]=false;
  m.procT.push(simTime-t0);yield* offer(m,o.b);m.done++;}}

/* 8 ---- INVERTER  (X-axis inverter: flips the board about the travel axis) ---- */
const INVERT=machine({key:'inverter',name:'INVERTER',full:'X-axis board inverter',L:500,lanesIn:[0,1],z1:RAIL_F+256,
  specs:[['Function','turns the board 180° about the travel (X) axis for double-sided production'],['Cycle time','≈ 8 s'],['Safety','built-in torque limiter'],['Size','single-lane class 500 × 815 × 1330 mm; shown with one flip unit per lane (dual track, as it sits between dual-track machines — please confirm)'],['Source','distributor product page + manufacturer brochure (inverter range)']],
  build(m){buildInverterBody(m);},
  reset(m){m.ang=[0,0];},
  *run(m,l){yield* stdRun(m,l,function*(b){m.state='BOARD IN L'+(l+1);yield* conveyTo(b,m.X(0));yield .3;m.state='FLIP 180° L'+(l+1);
    const a0=m.ang[l],f0=b.flip;yield* tw(2.2,k=>{m.ang[l]=a0+PI*ease(k);b.flip=f0+PI*ease(k);});b.flipped=!b.flipped;yield .3;
    m.state='BOARD OUT L'+(l+1);yield* conveyTo(b,m.X(250-BW/2-10));});},
  update(m){m.rot.forEach((g,l)=>g.rotation.x=m.ang[l]);},
  rows(m){return[['Boards flipped',String(m.done)]];}
});


/* 9 ---- AOI REVIEW TABLE  (operator verification of AOI calls) ---- */
M.desk=std(0x1d2024,.6,.1);
function monitorTex(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=8;return{c,g:c.getContext('2d'),t};}
const AOITAB=machine({key:'aoitable',name:'AOI TABLE',full:'AOI review table (operator verification)',L:1000,lanesIn:[0,1],z1:RAIL_F+300,
  specs:[['Function','the operator checks every AOI call and gives the final decision'],['Camera','colour camera with ring light on an X/Y gantry drives to each call position'],['Screens','left: magnified image of the call · right: call list with OK / NG'],['Decision','false call → OK; real defect → NG'],['Good boards','continue to the unloader'],['NG boards','taken out of the conveyor by hand (red NG tray)'],['Source','your video of the AOI table after the AOI']],
  build(m){const x0=-500,x1=500,z1=m.z1,z0=LZ[1]-BD/2-7-200;m.z0=z0;feet(m.g,x0,x1,z0,z1);
    shell(m.g,x0,x1,z0,z1,70,1150,M.ral,{noFront:true,noTop:true,left:LZ,right:LZ});
    P(m.g,x1-x0,CONV_Y-60-70,12,M.ral,0,(CONV_Y-60+70)/2,z1-6);P(m.g,x1-x0,1150-(CONV_Y+230),12,M.ral,0,(1150+CONV_Y+230)/2,z1-6);
    P(m.g,x1-x0,14,z1-z0,M.ral,0,1143,(z0+z1)/2);P(m.g,x1-x0-40,10,30,M.steel,0,1155,z1-40);
    hinged(m,'door',x1-x0-40,290,0,CONV_Y+230,z1+2,true,M.ral);
    handle(m.g,-300,520,z1);vents(m.g,-420,120,z1);fnLabel(m.g,m.name,420,180,620,z1+1);
    // operator desk with keypad, E-stop, microscope and NG tray
    const dz=z1+170;P(m.g,x1-x0+260,24,340,M.desk,60,CONV_Y-75,dz);P(m.g,40,CONV_Y-150,40,M.desk,x1+110,(CONV_Y-150)/2+20,dz+110);
    P(m.g,170,22,110,std(0xf2f2ee,.5),40,CONV_Y-52,dz-40);
    m.keys=[['OK',0x22b35a],['NG',0xd32b35],['NEXT',0x3a78d6]].map((k,i)=>{const mt=new THREE.MeshStandardMaterial({color:k[1],emissive:k[1],emissiveIntensity:.05,roughness:.4});P(m.g,40,10,40,mt,-10+i*50,CONV_Y-38,dz-40);return mt;});
    label(m.g,'OK   NG   NEXT',150,22,40,CONV_Y-32.5,dz-6,{rx:-PI/2,fg:'#111',pw:300,size:.6});
    estop(m.g,240,CONV_Y-60,dz-80);
    P(m.g,240,90,160,std(0xc8202a,.6,.05),x1+60,CONV_Y-18,dz+40);P(m.g,220,10,140,M.black,x1+60,CONV_Y+23,dz+40);label(m.g,'NG',120,40,x1+60,CONV_Y+29,dz+40,{rx:-PI/2,fg:'#fff',pw:200,size:.7});
    m.ngTray={x:x1+60,z:dz+40,y:CONV_Y+30};
    {const a=new THREE.Group();a.position.set(x0+60,CONV_Y-60,dz-60);m.g.add(a);cyl(a,40,46,20,M.black,0,10,0);cyl(a,10,10,260,M.steel,0,140,0);P(a,30,30,260,M.black,0,260,110);
     const h=new THREE.Group();h.position.set(0,250,230);a.add(h);P(h,80,90,110,M.black,0,0,0);cyl(h,16,20,70,M.black,0,-80,10);[-1,1].forEach(q=>cyl(h,10,10,90,M.black,q*22,40,-40,{rx:-.7}));}
    // monitors + keyboard on top of the cabinet
    m.scr=[];[[-215,.12],[235,-.12]].forEach(([x,ry],i)=>{const g=new THREE.Group();g.position.set(x,1150,z1-170);g.rotation.y=ry;m.g.add(g);
      P(g,140,16,110,M.black,0,8,0);P(g,40,170,30,M.black,0,95,-10);P(g,440,300,30,M.black,0,330,0);
      const mt=monitorTex(640,430);m.scr.push(mt);const s=new THREE.Mesh(new THREE.PlaneGeometry(412,276),new THREE.MeshBasicMaterial({map:mt.t,toneMapped:false}));s.position.set(0,330,16);g.add(s);});
    P(m.g,420,16,140,M.black,-40,1158,z1-60);P(m.g,380,10,110,std(0x2c2f34,.6),-60,1168,z1-60);P(m.g,60,24,90,M.black,240,1160,z1-60);
    // dual-lane conveyor + X/Y camera gantry inside
    LZ.forEach(z=>rails(m.g,x0,x1,z,CONV_Y,{legs:false}));
    [z0+70,z1-70].forEach(z=>P(m.g,x1-x0-60,30,30,M.alu,0,CONV_Y+300,z));
    m.gx=new THREE.Group();m.g.add(m.gx);P(m.gx,40,40,z1-z0-110,M.alu,0,CONV_Y+300,(z0+z1)/2);
    m.cam=new THREE.Group();m.g.add(m.cam);P(m.cam,90,150,80,M.dark,0,CONV_Y+230,0);cyl(m.cam,22,22,70,M.black,0,CONV_Y+120,0);
    m.ringM=new THREE.MeshStandardMaterial({color:0x222,emissive:0xffffff,emissiveIntensity:.05});const rg=new THREE.Mesh(new THREE.TorusGeometry(42,7,8,32),m.ringM);rg.rotation.x=PI/2;rg.position.y=CONV_Y+85;m.cam.add(rg);
    m.spot=new THREE.SpotLight(0xffffff,0,500,.45,.6,1);m.spot.position.set(0,CONV_Y+85,0);const tg=new THREE.Object3D();tg.position.set(0,CONV_Y,0);m.cam.add(tg);m.spot.target=tg;m.cam.add(m.spot);
    m.fov=new THREE.Mesh(FLAT(40,40),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false}));m.fov.position.y=CONV_Y+BT+3;m.cam.add(m.fov);
    signal(m,x1-60,z0+60,1150);
    m.tags=[['Camera + ring light on X/Y gantry',0,CONV_Y+330,0],['Left screen: magnified call image',-215,1560,z1-170],['Right screen: AOI call list',235,1560,z1-170],['Decision keypad (OK / NG / NEXT)',40,CONV_Y-20,z1+130],['Stereo microscope',x0+60,CONV_Y+260,z1+400],['NG tray (bad boards taken out by hand)',x1+60,CONV_Y+60,z1+210]];},
  reset(m){m.cx_=0;m.cz_=0;m.light=0;m.pk=-1;m.cur=null;m.calls=[];m.ci=-1;m.stats={ok:0,ng:0,fc:0,real:0};m.drawn=0;},
  accepts(l){return !this.inbox[0].length&&!this.inbox[1].length&&!this.busy[0];},
  *run(m){
    while(true){while(!m.inbox[0].length&&!m.inbox[1].length){m.state='WAIT FOR BOARD';m.cur=null;yield FRAME;}
      const l=m.inbox[0].length?0:1,b=m.inbox[l].shift();m.busy[0]=true;const t0=simTime;
      populate(b);m.state='BOARD IN L'+(l+1);yield* conveyTo(b,m.X(0));m.cur=b;
      // AOI result for this board: a few calls, most of them false calls
      const R=Math.random,n=1+Math.floor(R()*3),pl=KIT.places.filter(p=>p.info.kind!=='conn'),real=R()<.18;
      m.calls=[];for(let i=0;i<n;i++){const p=pl[Math.floor(R()*pl.length)];m.calls.push({p,type:['SHIFT','MISSING','SOLDER','POLARITY','BRIDGE'][Math.floor(R()*5)],real:real&&i===0,res:null});}
      log('AOI TABLE L'+(l+1)+' #'+b.sn+' · '+n+' AOI call'+(n>1?'s':''),'');
      for(m.ci=0;m.ci<m.calls.length;m.ci++){const c=m.calls[m.ci];
        m.state='CAMERA TO CALL '+(m.ci+1)+'/'+n+' · '+c.p.name;const x0=m.cx_,z0=m.cz_,tx=m.X(0)-m.cx+c.p.x,tz=LZ[l]+c.p.z;
        yield* tw(.6,k=>{m.cx_=lerp(x0,tx,ease(k));m.cz_=lerp(z0,tz,ease(k));});m.light=1;
        m.state='OPERATOR CHECKS '+c.p.name;yield 1.4;
        c.res=c.real?'NG':'OK';m.pk=c.real?1:0;c.real?m.stats.real++:m.stats.fc++;yield .35;m.pk=-1;m.light=0;}
      const ng=m.calls.some(c=>c.res==='NG');m.ci=-1;
      if(ng){m.stats.ng++;m.state='NG · OPERATOR TAKES THE BOARD OUT';log('AOI TABLE #'+b.sn+' NG → removed by hand','ng');m.hoods[0].target=1;
        const bx=b.x,bz=b.z;yield* tw(.6,k=>b.dy=lerp(0,140,ease(k)));yield* tw(1.0,k=>{b.x=lerp(bx,m.X(m.ngTray.x),ease(k));b.z=lerp(bz,m.ngTray.z,ease(k));});
        yield* tw(.5,k=>b.dy=lerp(140,m.ngTray.y-CONV_Y,ease(k)));m.procT.push(simTime-t0);m.done++;m.busy[0]=false;m.cur=null;
        run((function*(){yield 4;killBoard(b);m.hoods[0].target=hoodsOpen;})());continue;}
      m.stats.ok++;m.state='GOOD → TO UNLOADER';log('AOI TABLE #'+b.sn+' OK (false calls confirmed)','ok');m.pk=2;yield .3;m.pk=-1;
      yield* conveyTo(b,m.X(500-BW/2-10));m.procT.push(simTime-t0);yield* offer(m,b);
      while(b.alive&&b.x<m.x1+BW/2-40)yield FRAME;m.busy[0]=false;m.done++;m.cur=null;}},
  update(m){m.gx.position.x=m.cx_;m.cam.position.set(m.cx_,0,m.cz_);m.ringM.emissiveIntensity=m.light?2.2:.05;m.spot.intensity=m.light*3;m.fov.material.opacity=m.light*.35;
    m.keys.forEach((k,i)=>k.emissiveIntensity=m.pk===i?2:.05);
    if((m.drawn+=1)%6===0)drawAoiScreens(m);},
  rows(m){return[['Boards checked',String(m.stats.ok+m.stats.ng)],['Good → unloader',String(m.stats.ok)],['NG → taken out',String(m.stats.ng)],['False calls / real defects',m.stats.fc+' / '+m.stats.real]];}
});
function populate(b){if(b.pop)return;b.pop=true;const c=KIT.inst(KIT.compsAll);const up=Math.cos(b.flip)>0;
  if(up)c.position.y=-BT/2;else{c.rotation.x=PI;c.position.y=BT/2;}b.piv.add(c);}
function drawAoiScreens(m){const [L,R]=m.scr,c=m.ci>=0?m.calls[m.ci]:null;
  {const g=L.g,W=640,H=430;g.fillStyle='#0b1a12';g.fillRect(0,0,W,H);
   if(c){g.save();g.beginPath();g.arc(300,215,200,0,7);g.clip();g.fillStyle='#145c34';g.fillRect(0,0,W,H);
     g.strokeStyle='#1f7a47';g.lineWidth=6;for(let i=0;i<9;i++){g.beginPath();g.moveTo(40+i*60,0);g.lineTo(120+i*40,H);g.stroke();}
     const k=c.p.info.kind,w=k==='chip'||k==='led'?150:k==='ecap'?190:230,h=k==='chip'||k==='led'?80:k==='ecap'?190:230;
     g.fillStyle='#d9b85c';[-1,1].forEach(s=>g.fillRect(300+s*(w/2+8)-22,215-h/2-6,44,h+12));
     g.fillStyle=k==='chip'?'#1d1e20':k==='ecap'?'#c9ced2':'#1a1b1e';g.fillRect(300-w/2,215-h/2,w,h);
     g.fillStyle='#e8ecef';[-1,1].forEach(s=>g.fillRect(300+s*(w/2)-(s>0?0:16),215-h/2,16,h));
     g.strokeStyle=c.res==='NG'?'#ff3040':c.res==='OK'?'#30e080':'#ffd400';g.lineWidth=6;g.strokeRect(300-w/2-34,215-h/2-24,w+68,h+48);g.restore();
     g.strokeStyle='#cfd8dc';g.lineWidth=4;g.beginPath();g.arc(300,215,200,0,7);g.stroke();
     g.fillStyle='#e9f5ee';g.font='700 26px Arial';g.fillText(c.p.name,520,60);g.font='500 20px Arial';g.fillText(c.type,520,92);
     g.fillStyle=c.res==='NG'?'#ff5060':c.res==='OK'?'#40e890':'#ffd400';g.font='800 30px Arial';g.fillText(c.res||'CHECK',520,140);}
   else{g.fillStyle='#5d7a6a';g.font='600 28px Arial';g.fillText(m.cur?'BOARD #'+m.cur.sn:'NO BOARD',40,60);}
   L.t.needsUpdate=true;}
  {const g=R.g,W=640,H=430;g.fillStyle='#dfe4ea';g.fillRect(0,0,W,H);g.fillStyle='#2b4a7a';g.fillRect(0,0,W,44);g.fillStyle='#fff';g.font='700 22px Arial';g.fillText('AOI CALLS · REVIEW',14,30);
   g.fillStyle='#1b1d20';g.font='600 18px Arial';g.fillText(m.cur?'Board #'+m.cur.sn+' · '+(m.cur.code||'no code'):'Waiting for board',14,74);
   m.calls.forEach((c,i)=>{const y=104+i*44;g.fillStyle=i===m.ci?'#fff3b0':'#ffffff';g.fillRect(14,y-26,W-28,38);g.fillStyle='#1b1d20';g.font='600 18px Consolas,monospace';
     g.fillText((i+1)+'  '+c.p.name.padEnd(6)+' '+c.type,24,y);g.fillStyle=c.res==='NG'?'#d42030':c.res==='OK'?'#1a9e52':'#8a8f96';g.font='800 18px Arial';g.fillText(c.res||'…',W-90,y);});
   g.fillStyle='#3b4250';g.font='600 17px Arial';g.fillText('OK '+m.stats.ok+'   NG '+m.stats.ng+'   false calls '+m.stats.fc+'   real '+m.stats.real,14,H-16);R.t.needsUpdate=true;}}

/* 10 ---- UNLOADER  (triple-magazine line unloader, M size) ---- */
const UNLOAD=machine({key:'unloader',name:'UNLOADER',full:'Triple-magazine line unloader',L:1080,lanesIn:[0,1],sink:true,z1:RAIL_F+380,
  specs:[['Size (L × W × H)','1080 × 1750 × 1750 mm'],['Magazines','3 side by side on one servo lift platform'],['Board in','the shuttle conveyor lines up with lane 1 or 2 and carries the panel to the end sensor; the shuttle lines up with the free slot and the belts drive the panel into the magazine as far as they reach. The pusher (a black lever on a belt actuator) then drops behind the panel, pushes it home and stops at the magazine entrance — it never goes into the magazine — then lifts and returns to its reference point'],['Unloading time','≈ 18–22 s per board (rear magazine)'],['Filling','top to bottom'],['Source','manufacturer product page, technical drawing and brochure + your photo and video']],
  build(m){m.z0=m.z1-1750;buildMagHandler(m,false);},
  reset(m){m.mags=[0,1,2].map(()=>({present:true,boards:new Array(MG.slots).fill(null),lift:0,busy:false}));m.platY=slotPlat(MG.use-1);m.cz=LZ[0];m.rodX=rodRest(m);m.hook=0;m.sens=0;m.ops=0;m.stored=0;},
  accepts(l){return !this.inbox[0].length&&!this.inbox[1].length&&!this.busy[0];},
  *run(m){
    while(true){while(!m.inbox[0].length&&!m.inbox[1].length){m.state='WAIT FOR BOARD';yield FRAME;}
      const l=m.inbox[0].length?0:1,b=m.inbox[l].shift();m.busy[0]=true;const t0=simTime;
      m.state='SHUTTLE TO LANE '+(l+1);const z0=m.cz;yield* tw(.25+Math.abs(LZ[l]-z0)/900,t=>m.cz=lerp(z0,LZ[l],ease(t)));
      m.state='BOARD TO END SENSOR (PUSHER WAITS BEHIND)';yield* conveyTo(b,m.X(m.shX+250-BW/2-6));m.sens=1;
      let i;while((i=m.mags.findIndex(g=>g.present&&!g.busy&&g.boards.slice(0,MG.use).some(x=>!x)))<0){m.state='OPERATOR: PLACE EMPTY MAGAZINE';yield FRAME;}
      const mg=m.mags[i];let k=-1;for(let j=MG.use-1;j>=0;j--)if(!mg.boards[j]){k=j;break;}
      m.state='SHUTTLE TO MAGAZINE '+(i+1)+' · SLOT '+(k+1);const zb=m.cz,p0=m.platY;
      yield* tw(.25+Math.abs(m.magZ[i]-zb)/900,t=>{m.cz=lerp(zb,m.magZ[i],ease(t));b.z=m.cz;m.platY=lerp(p0,slotPlat(k),ease(t));});
      const ref=rodRest(m),home=m.magX-MG.L/2-2;
      m.state='BELT FEEDS PANEL INTO MAGAZINE SLOT '+(k+1);yield* conveyTo(b,m.X(m.shX+250-8+BW/2));m.sens=0;
      m.state='PUSHER LEVER DOWN BEHIND THE PANEL';yield* tw(.25,t=>m.hook=t);
      const edge=b.x-m.cx-BW/2-3;m.state='PUSHER TO PANEL EDGE';yield* tw(.8,t=>m.rodX=lerp(ref,edge,ease(t)));
      m.state='PUSH PANEL HOME (PUSHER STOPS AT MAGAZINE ENTRANCE)';yield* tw(.7,t=>{m.rodX=lerp(edge,home,t);b.x=m.X(m.rodX+BW/2+3);});
      b.inMag=true;mg.boards[k]=b;m.state='PUSHER UP → BACK TO REFERENCE';yield* tw(.25,t=>m.hook=1-t);yield* tw(.9,t=>m.rodX=lerp(home,ref,ease(t)));
      m.stored++;m.outT.push(simTime);m.procT.push(simTime-t0);m.done++;m.busy[0]=false;
      if(mg.boards.slice(0,MG.use).every(x=>x))run(swapMag(m,i,false));}},
  update(m){magBoardsUpdate(m);},
  rows(m){return[['Magazine 1 / 2 / 3',m.mags.map(g=>g.present?g.boards.filter(b=>b).length+'/'+MG.use:'—').join(' · ')],['Boards stored',String(m.stored)],['Magazine changes (operator)',String(m.ops)]];}
});

/* ---------- line layout (gap before the scanner for the shuttle output section) ---------- */
const TOTAL=MACH.reduce((s,m)=>s+m.L+m.gap,0);
{let x=-TOTAL/2;MACH.forEach((m,i)=>{m.i=i;x+=m.gap;m.x0=x;m.x1=x+m.L;m.cx=x+m.L/2;m.X=lx=>m.cx+lx;m.g.position.x=m.cx;m.build(m);x+=m.L;});}
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
  const b=newBoard(l);b.lane=l;b.z=LZ[l];b.x=m.x0-m.gap-BW/2-10;if(m.i>2)markFull(b);m.inbox[l].push(b);last[l]=simTime;}}yield FRAME;}}

let simTime=0,speed=1,paused=false;
const logEl=$('log');function log(t,c){const d=document.createElement('div');d.textContent=t;if(c)d.className=c;logEl.prepend(d);while(logEl.children.length>8)logEl.lastChild.remove();}
const stubs=[];
function clearAll(){cos=[];[...boards].forEach(b=>b.alive&&killBoard(b));boards=[];moving=0;
  MACH.forEach(m=>{m.inbox=[[],[]];m.busy=[false,false];m.state='IDLE';m.done=0;m.outT=[];m.procT=[];m.lastCode='';m.held=null;});
  stubs.forEach(s=>scene.remove(s));stubs.length=0;logEl.innerHTML='';serial=0;}
function stub(x,text){const g=new THREE.Group();scene.add(g);stubs.push(g);box(g,640,900,800,stubMat,x,450,0,NOSH);rails(g,x-320,x+320,LZ[0],CONV_Y,{legs:false,motor:false});
  label(g,text,560,78,x,901,310,{rx:-PI/2,bg:'#1e6fd9',fg:'#ffffff',pw:900,size:.46});}
function start(){clearAll();simTime=0;
  active=lineMode?MACH.slice():[MACH[sel]];
  MACH.forEach(m=>{m.g.visible=lineMode||m===MACH[sel];});active.forEach(m=>m.reset(m));
  if(!lineMode){const m=MACH[sel];stub(m.x0-m.gap-320,m.i?'FROM '+MACH[m.i-1].name+'  ▶':'BOARD MAGAZINES IN');stub(m.x1+(m.i<MACH.length-1?MACH[m.i+1].gap:0)+320,m.i<MACH.length-1?'▶  TO '+MACH[m.i+1].name:'END OF LINE');
    if(!m.source&&!m.noSpawn)run(spawner(m));}
  active.forEach(m=>{if(m.key==='fifo'||m.key==='scanner'||m.key==='inverter')m.lanesIn.forEach(l=>run(m.run(m,l)));else run(m.run(m,0));});
  focus();ui();}

/* ---------- camera / views ---------- */
let tween=null,follow=null;
function flyTo(p,t,dur=1.2){tween={p0:camera.position.clone(),t0:controls.target.clone(),p1:new THREE.Vector3(...p),t1:new THREE.Vector3(...t),t:0,dur};follow=null;}
function focus(){const m=MACH[sel];
  if(lineMode)flyTo([1500,7400,12500],[300,500,0]);else{const S=Math.max(m.L,1150);flyTo([m.cx+S*.9+1500,2500,4100],[m.cx,950,-150]);}
  const S=lineMode?TOTAL/2+900:1700;Object.assign(sun.shadow.camera,{left:-S,right:S,top:S,bottom:-S,near:200,far:16000});sun.shadow.camera.updateProjectionMatrix();
  sun.target.position.set(lineMode?0:m.cx,0,0);sun.position.set((lineMode?0:m.cx)+900,2900,1900);scene.add(sun.target);}
const views={over:focus,
  inside:()=>{const m=MACH[sel];setHoods(1);flyTo([m.cx+250,2050,1650],[m.cx,940,0]);},
  follow:()=>{const m=MACH[sel];setHoods(1);const b=boards.filter(b=>b.alive&&b.x>m.x0-300&&b.x<m.x1+300&&Math.abs(b.dy)<5).sort((a,c)=>c.x-a.x)[0]||boards.filter(b=>b.alive&&Math.abs(b.dy)<5)[0];
    if(!b)return;flyTo([b.x-350,CONV_Y+420,b.z+700],[b.x,CONV_Y,b.z],.9);follow={b};},
  line:()=>{flyTo([0,6200,11800],[0,700,0]);},
  pusher:()=>{if(!lineMode&&MACH[sel]!==UNLOAD)selectMachine(MACH.indexOf(UNLOAD),false);const m=UNLOAD;setHoods(0);if(!xray)$('bXray').click();const x=m.X(-40);flyTo([x-40,CONV_Y+1650,m.cz+330],[x,CONV_Y,m.cz-30]);follow={pusher:true};},
  top:()=>{const m=MACH[sel];setHoods(1);flyTo(lineMode?[0,13000,10]:[m.cx,3600+m.L,10],[lineMode?0:m.cx,900,0]);}};
let hoodsOpen=0;
function setHoods(o){hoodsOpen=o;MACH.forEach(m=>m.hoods.forEach(h=>h.target=o));$('bHood').textContent=o?'Close covers':'Open covers';$('bHood').classList.toggle('on',!!o);}

/* ---------- UI ---------- */
function selectMachine(i,fly=true){sel=i;document.querySelectorAll('[data-m]').forEach(b=>b.classList.toggle('on',+b.dataset.m===i));
  document.querySelectorAll('#flowList span').forEach((s,k)=>s.classList.toggle('me',k===i));
  const m=MACH[i];$('specT').innerHTML=m.specs.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('');$('specH').textContent=m.full;
  document.querySelector('#title .t1').textContent=lineMode?'HANDLING LINE':m.name;
  document.querySelector('#title .t2').textContent=lineMode?'Loader → unloader, ten machines connected. Selected: '+m.full+'.':m.full+' — '+m.specs[0][1]+'.';
  document.querySelector('#rail .vtxt').textContent=lineMode?'HANDLING LINE':m.name;
  if(!lineMode)start();else if(fly){const S=Math.max(m.L,1150);flyTo([m.cx+S*.9+1500,2500,4100],[m.cx,950,-150]);}buildTags();ui();}
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
      +'<div class="row" style="margin-top:6px"><span>Boards in the line</span><span class="big">'+boards.filter(b=>b.alive&&!b.inMag).length+'</span></div>';
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
  boards.forEach(b=>{if(!b.alive)return;b.g.position.set(b.x,CONV_Y+BT/2+b.dy,b.z);b.piv.rotation.x=b.flip;});
  if(tween){tween.t+=rdt;const k=ease(Math.min(1,tween.t/tween.dur));camera.position.lerpVectors(tween.p0,tween.p1,k);controls.target.lerpVectors(tween.t0,tween.t1,k);if(k>=1)tween=null;}
  if(follow&&follow.pusher&&!tween){_p.set(UNLOAD.X(-40),CONV_Y,UNLOAD.cz-30).sub(controls.target);_p.x=0;camera.position.add(_p);controls.target.add(_p);}
  else if(follow&&!tween){if(!follow.b.alive)follow=null;else{_p.set(follow.b.x,CONV_Y,follow.b.z).sub(controls.target);camera.position.add(_p);controls.target.add(_p);}}
  controls.update();const dist=camera.position.distanceTo(controls.target);camera.near=Math.max(1.5,Math.min(10,dist*.03));camera.updateProjectionMatrix();
  const [W,H]=SMT.size();renderer.setViewport(0,0,W,H);renderer.clear();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
  if(showTags)tags.forEach(t=>{_p.copy(t.v);if(t.m)t.m.g.localToWorld(_p);_p.project(camera);const vis=t.m.g.visible&&_p.z<1&&Math.abs(_p.x)<1&&Math.abs(_p.y)<1;t.el.style.display=vis?'block':'none';if(vis){t.el.style.left=((_p.x+1)/2*W)+'px';t.el.style.top=((1-_p.y)/2*H)+'px';}});
  uiT+=rdt;if(uiT>.2){uiT=0;ui();}
}
camera.position.set(3000,2200,3600);controls.target.set(0,900,0);controls.maxDistance=26000;
window.__sim={MACH,selectMachine,setMode,views,setHoods,get time(){return simTime;},get boards(){return boards;},ff:s=>{const n=Math.round(s/.02);for(let i=0;i<n;i++){simTime+=.02;for(let k=0;k<cos.length;k++)cos[k].step(.02);cos=cos.filter(c=>!c.done);}}};
{const h=location.hash.slice(1).toLowerCase(),k=MACH.findIndex(m=>m.key===h||m.name.toLowerCase().split(' ')[0]===h);
  if(h==='line'){sel=0;setMode(true);}else selectMachine(k>=0?k:0,false);}
window.addEventListener('hashchange',()=>{const h=location.hash.slice(1).toLowerCase();if(h==='line'){setMode(true);return;}const k=MACH.findIndex(m=>m.key===h||m.name.toLowerCase().split(' ')[0]===h);if(k>=0){if(lineMode)setMode(false);selectMachine(k);}});
frame();
