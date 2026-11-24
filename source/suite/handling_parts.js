
/* ===================================================================
   BOARD HANDLING LINE — nine handling machines, one page.
   Units mm.  X = board flow, Y = up, Z = toward the operator.
   Board top at 901.6 mm; lane 1 at z = +170, lane 2 at z = -170.
   Single-lane machines run on lane 1 (as the line printer does).
   =================================================================== */
const CONV_Y=950,BT=1.6,LZ=[170,-170],NOSH={cast:false};
let BW=250,BD=200,PSCALE=1;          // panel length / width (mm) and scale; the sorting line sets them from the magazine width
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
  if(PSCALE!==1)g.scale.setScalar(PSCALE);
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


/* ===================================================================
   MACHINES — modelled on manufacturer data (sizes in mm, L along the
   line, W front-to-back, H).  Source noted per machine.
   =================================================================== */
const MACH=[];
function machine(o){const m=Object.assign({hoods:[],tags:[],inbox:[[],[]],busy:[false,false],state:'IDLE',done:0,outT:[],procT:[],lanesIn:[0],gap:0,g:new THREE.Group()},o);
  MACH.push(m);scene.add(m.g);return m;}
const V=233;                       // belt speed 14 m/min (manufacturer datasheets)
const RAIL_F=LZ[0]+200/2+7;         // fixed (front) rail position, z
M.ral=sm(0xdcdcd2,.55,.05);M.ral2=sm(0xcfcfc4,.55,.06);M.ralD=sm(0x9fa19b,.5,.1);
M.pnl=sm(0xe6e8ea,.5,.06);M.pnlD=sm(0x4f555d,.5,.2);M.inox=sm(0xc9ced3,.3,.8);
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
const MG={L:355,W:208,H:570,base:40,pitch:20,tooth:10,slots:25,use:20,tag:'164'};   // 355 long; width set to the board; comb rails every 10 mm, a board every 2nd slot (20 mm) so the gap is visible; top 5 positions empty
M.magW=std(0xd9dbd7,.62,.05);M.comb=std(0x18191b,.7,.05);
const _magGeo={};
function magGeo(W){                           // open-frame magazine for inner width W, merged per material and cached
  if(_magGeo[W])return _magGeo[W];
  const parts={w:[],c:[]};const L=MG.L,H=MG.H;
  const add=(k,w,h,d,x,y,z,rx=0,rz=0)=>{const g=new THREE.BoxGeometry(w,h,d);if(rx)g.rotateX(rx);if(rz)g.rotateZ(rz);g.translate(x,y,z);parts[k].push(g);};
  [-1,1].forEach(s=>{const zw=s*(W/2+12);
    [-1,1].forEach(e=>add('w',36,H,10,e*(L/2-18),H/2,zw));
    add('w',L,34,10,0,H-17,zw);add('w',L,30,10,0,15,zw);
    const dl=Math.hypot(L-72,H-64),an=Math.atan2(H-64,L-72);
    add('w',dl,9,5,0,H/2,s*(W/2+19),0,an);add('w',dl,9,5,0,H/2,s*(W/2+19),0,-an);
    add('c',L-80,H-70,3,0,H/2,s*(W/2+6));
    for(let j=0;j<(H-90)/MG.tooth;j++)add('c',L-84,2.6,10,0,MG.base+j*MG.tooth-BT/2-1.3,s*(W/2));
    for(let j=0;j<(H-90)/MG.tooth;j+=2)[-1,1].forEach(e=>add('c',8,1.6,1,e*(L/2-18),MG.base+j*MG.tooth,s*(W/2+17.5)));
  });
  [-1,1].forEach(e=>{add('w',36,30,W+34,e*(L/2-18),H-15,0);add('w',36,24,W+34,e*(L/2-18),12,0);});
  add('w',L-40,6,W+10,0,3,0);
  add('w',20,20,W-20,0,H+30,0);[-1,1].forEach(q=>add('w',16,34,16,0,H+12,q*(W/2-20)));
  const out={};for(const k in parts){out[k]=BGU.mergeBufferGeometries(parts[k],false);parts[k].forEach(g=>g.dispose());}return _magGeo[W]=out;}
function magMesh(par,face){const g=new THREE.Group();par.add(g);
  const G=magGeo(MG.W);[['w',M.magW],['c',M.comb]].forEach(([k,mt])=>{const m=new THREE.Mesh(G[k],mt);m.castShadow=true;m.receiveShadow=true;g.add(m);});
  label(g,MG.tag,70,30,face*(MG.L/2+.5),MG.H-15,0,{bg:'#1b1d20',fg:'#ffffff',pw:180,size:.72,ry:face*PI/2});
  return g;}
function buildMagHandler(m,isLoader){
  const L=m.L,x0=-L/2,x1=L/2,z1=m.z1,z0=m.z0,H=1750,s=isLoader?1:-1;
  // magazine bay on the free end (upstream for the loader, downstream for the unloader), shuttle housing towards the line
  const bx0=isLoader?x0:20,bx1=isLoader?-20:x1,hx0=isLoader?-20:x0,hx1=isLoader?x1:20;
  m.magX=(bx0+bx1)/2;m.shX=(hx0+hx1)/2;
  feet(m.g,x0,x1,z0,z1);
  // bay: plinth, platform lifter columns, upper panel, side walls
  P(m.g,bx1-bx0,260,z1-z0,M.ral,(bx0+bx1)/2,180,(z0+z1)/2);
  P(m.g,bx1-bx0,240,z1-z0,M.ral,(bx0+bx1)/2,H-120,(z0+z1)/2);                       // upper beam panel (documents hang here)
  P(m.g,bx1-bx0,H-310,24,M.ral,(bx0+bx1)/2,(H+310)/2,z1-12);P(m.g,bx1-bx0,H-310,24,M.ral,(bx0+bx1)/2,(H+310)/2,z0+12);
  [z0+70,z1-70].forEach(z=>P(m.g,60,1100,60,M.ralD,m.magX+(isLoader?150:-150),860,z));
  [0,1].forEach(i=>{const t=canvasTex(220,160,(c)=>{c.fillStyle='#fff';c.fillRect(0,0,160,220);c.fillStyle='#bbb';for(let k=0;k<9;k++)c.fillRect(14,20+k*18,132-(k%3)*20,6);c.strokeStyle='#111';c.lineWidth=10;c.strokeRect(0,0,160,220);});
    const d=new THREE.Mesh(new THREE.PlaneGeometry(206,150),new THREE.MeshBasicMaterial({map:t}));d.position.set(isLoader?bx0-1:bx1+1,H-120,z0+(z1-z0)*(i?0.72:0.28));d.rotation.y=isLoader?-PI/2:PI/2;m.g.add(d);});
  m.plat=new THREE.Group();m.g.add(m.plat);P(m.plat,bx1-bx0-40,20,z1-z0-240,M.ralD,m.magX,-10,(z0+z1)/2);
  m.magZ=[z1-213-225,z1-213-225-450,z1-213-225-900];                                 // 3 magazines side by side (drawing pitch ≈ 450 mm)
  m.magG=m.magZ.map(z=>{const g=magMesh(m.plat,isLoader?-1:1);g.position.set(m.magX,0,z);return g;});
  // shuttle housing: cabinet with three hinged top covers (as on the technical drawing)
  const hy=1180;shell(m.g,hx0,hx1,z0,z1,80,hy,M.ral,{noTop:true,left:isLoader?false:LZ,right:isLoader?[LZ[0]]:false});
  const cw=hx1-hx0-20,seg=(z1-z0-20)/3;for(let i=0;i<3;i++)hinged(m,'lid',cw,seg-6,m.shX,hy,z0+10+i*seg,i==2?false:true,M.ral);
  touch(m.g,m.shX+(isLoader?-120:120),1010,z1);estop(m.g,m.shX+(isLoader?120:-120),1020,z1);handle(m.g,m.shX,600,z1);vents(m.g,m.shX-80,180,z1);
  fnLabel(m.g,m.name,Math.min(470,cw-20),m.shX,1120,z1+1);
  estop(m.g,isLoader?bx0+40:bx1-40,1150,z1);signal(m,isLoader?bx0+60:bx1-60,z0+80,H);
  // shuttle carriage: Z linear rails + conveyor + puller/pusher cylinder
  [-1,1].forEach(q=>P(m.g,30,30,z1-z0-120,M.steel,m.shX+q*190,720,(z0+z1)/2));
  m.car=new THREE.Group();m.g.add(m.car);
  rails(m.car,m.shX-250,m.shX+250,0,CONV_Y,{legs:false});P(m.car,440,40,BD+60,M.aluD,m.shX,CONV_Y-80,0);P(m.car,80,170,80,M.dark,m.shX,CONV_Y-180,0);
  // board mover: a rodless actuator beside the conveyor; its finger runs 13 mm above the board, i.e. through the gap between two boards
  const zs=isLoader?-(BD/2+48):(BD/2+48),pa=isLoader?[-20,540]:[-540,20];
  m.reach=isLoader?440:140;
  P(m.car,pa[1]-pa[0],34,30,M.black,(pa[0]+pa[1])/2,CONV_Y+34,zs);
  if(!isLoader)P(m.car,pa[1]-pa[0]-20,8,2,M.red,(pa[0]+pa[1])/2,CONV_Y+34,zs-16);
  m.rod=new THREE.Group();m.car.add(m.rod);
  P(m.rod,60,46,46,M.dark,m.reach,CONV_Y+34,zs);
  if(isLoader){P(m.rod,20,10,Math.abs(zs),M.aluD,m.reach,CONV_Y-58,zs/2);P(m.rod,20,48,20,M.aluD,m.reach,CONV_Y-36,0);
    cyl(m.rod,7,7,m.reach,M.magW,m.reach/2,CONV_Y-13,0,{rz:PI/2,seg:14});}                 // white puller rod runs UNDER the panel
  else{P(m.rod,20,10,Math.abs(zs),M.aluD,m.reach,CONV_Y+20,zs/2);P(m.rod,m.reach,8,30,M.aluD,m.reach/2,CONV_Y+13,0);}
  m.finger=new THREE.Group();m.rod.add(m.finger);m.finger.position.y=isLoader?CONV_Y-13:CONV_Y+13;
  if(isLoader){P(m.finger,10,22,60,M.magW,0,8,0);P(m.finger,14,4,64,M.rubber,0,19,0);}       // finger flips UP behind the far edge
  else{P(m.finger,10,22,60,M.yellow,0,-8,0);P(m.finger,14,4,64,M.rubber,0,-19,0);}
  m.sensor=new THREE.MeshStandardMaterial({color:0x553300,emissive:0xff9a20,emissiveIntensity:.05});
  P(m.car,16,16,16,m.sensor,isLoader?m.shX-250+8:m.shX+250-8,CONV_Y+22,-(BD/2+18));       // end-of-conveyor sensor
  m.hook=0;
  m.H=H;
  m.tags=[['Magazine lift platform (3 magazines)',m.magX,1350,m.magZ[1]],['Shuttle conveyor (moves front ↔ back)',m.shX,1240,0],[isLoader?'Puller rod (under the panel, finger up)':'Pusher (belt actuator + finger)',m.shX,CONV_Y+120,isLoader?-160:160],['Hinged covers',m.shX,1240,z1-200]];}
function magBoardsUpdate(m){const off=m.platY;m.plat.position.y=off;
  m.mags.forEach((mg,i)=>{const g=m.magG[i];g.visible=mg.present;g.position.y=mg.lift||0;
    mg.boards.forEach((b,k)=>{if(b&&b.inMag){b.x=m.X(m.magX);b.z=m.magZ[i];b.dy=off+(mg.lift||0)+MG.base+k*MG.pitch-CONV_Y;}});});
  m.car.position.z=m.cz;m.rod.position.x=m.rodX;if(m.sensor)m.sensor.emissiveIntensity=m.sens?2.5:.05;m.finger.rotation.z=(m.key==='loader'?1:-1)*(1-m.hook)*1.3;}
const rodRest=m=>m.key==='loader'?60:m.shX-140;   // finger reference position (machine-local x)
const slotPlat=k=>CONV_Y-MG.base-k*MG.pitch;
function* swapMag(m,i,full){const mg=m.mags[i];mg.busy=true;yield 2.5;m.ops++;
  yield* tw(1.2,k=>mg.lift=k*900);mg.present=false;mg.boards.forEach(b=>b&&killBoard(b));mg.boards=new Array(MG.slots).fill(null);
  if(full)for(let k=0;k<MG.use;k++){const b=newBoard(0);b.inMag=true;mg.boards[k]=b;}
  yield 1.5;mg.present=true;yield* tw(1.2,k=>mg.lift=(1-k)*900);mg.lift=0;mg.busy=false;
  log((m.key==='loader'?'LOADER: full':'UNLOADER: empty')+' magazine placed in position '+(i+1),'cl');}


/* ---------- machine bodies shared by the handling line and the sorting line ---------- */
function buildScannerBody(m,lanes=LZ){const x0=-250,x1=250,z1=m.z1,z0=LZ[1]-BD/2-7-160;m.z0=z0;feet(m.g,x0,x1,z0,z1);
    P(m.g,x1-x0,CONV_Y-140,z1-z0,M.ral,0,(CONV_Y-140)/2+40,(z0+z1)/2);P(m.g,x1-x0,100,z1-z0,M.ral,0,CONV_Y-100,(z0+z1)/2);
    lanes.forEach(z=>rails(m.g,x0,x1,z,CONV_Y,{legs:false,motor:false}));
    [-1,1].forEach(q=>P(m.g,x1-x0,330,14,M.ral,0,CONV_Y+145,q>0?z1-7:z0+7));hinged(m,'lid',x1-x0-10,z1-z0-20,0,CONV_Y+315,z0+10,true,M.ral);
    knob(m.g,-140,CONV_Y-100,z1);knob(m.g,140,CONV_Y-100,z1);estop(m.g,180,CONV_Y-30,z1);[0,1,2].forEach(i=>P(m.g,24,24,8,[M.yellow,M.blue,M.red][i],-30+i*34,CONV_Y-30,z1+4));
    handle(m.g,-180,450,z1);vents(m.g,-140,120,z1);fnLabel(m.g,m.name,420,0,CONV_Y+60,z1+1);
    m.heads=[];m.fans=[];lanes.forEach((z,i)=>{P(m.g,60,80,60,M.black,DM_X,CONV_Y+230,z+DM_Z);const lm=new THREE.MeshStandardMaterial({color:0x200,emissive:0xff2020,emissiveIntensity:0});cyl(m.g,14,14,4,lm,DM_X,CONV_Y+188,z+DM_Z,{cast:false});m.heads.push(lm);
      const f=new THREE.Mesh(new THREE.ConeGeometry(28,186,4,1,true),new THREE.MeshBasicMaterial({color:0xff3030,transparent:true,opacity:.18,side:THREE.DoubleSide,depthWrite:false,blending:THREE.AdditiveBlending}));f.position.set(DM_X,CONV_Y+95,z+DM_Z);f.visible=false;m.g.add(f);m.fans.push(f);});
    signal(m,x1-40,z0+40,CONV_Y+320);
    m.tags=[['Code reader lane 1',DM_X,CONV_Y+290,LZ[0]],['Code reader lane 2',DM_X,CONV_Y+290,LZ[1]],['Lane-width knobs',0,CONV_Y-60,z1]];}
function buildInverterBody(m,lanes=LZ){const x0=-250,x1=250,z1=m.z1,z0=LZ[1]-BD/2-7-345;m.z0=z0;feet(m.g,x0,x1,z0,z1);
    shell(m.g,x0,x1,z0,z1,70,1330,M.ral,{noFront:true,left:LZ,right:LZ});
    P(m.g,x1-x0,820,12,M.ral,0,480,z1-6);P(m.g,x1-x0,90,12,M.ral,0,1285,z1-6);P(m.g,40,340,12,M.ral,x0+20,1060,z1-6);P(m.g,40,340,12,M.ral,x1-20,1060,z1-6);
    hinged(m,'door',x1-x0-60,330,0,1235,z1+2,true,M.ral);touch(m.g,130,1290,z1,110,70);handle(m.g,-190,500,z1);vents(m.g,-170,120,z1);estop(m.g,180,820,z1);
    fnLabel(m.g,m.name,440,0,860,z1+1);
    m.rot=lanes.map(z=>{const g=new THREE.Group();g.position.set(0,CONV_Y+BT/2,z);m.g.add(g);
      [-1,1].forEach(s=>{const d=new THREE.Mesh(new THREE.TorusGeometry(140,9,8,40),M.aluD);d.rotation.y=PI/2;d.position.x=s*210;g.add(d);
        for(let a=0;a<4;a++){const sp=new THREE.Mesh(new THREE.BoxGeometry(8,280,8),M.aluD);sp.rotation.x=a*PI/4;sp.position.x=s*210;g.add(sp);}});
      [-1,1].forEach(v=>{[-1,1].forEach(s=>{P(g,440,10,12,M.alu,0,v*(BT/2+13),s*(BD/2+7));const bl=new THREE.Mesh(new THREE.BoxGeometry(440,3,6),beltMat);bl.position.set(0,v*(BT/2+2.5),s*(BD/2-2.5));g.add(bl);});});
      return g;});
    signal(m,x1-40,z0+40,1330);
    m.tags=[['Flip unit lane 1',0,CONV_Y+190,LZ[0]],['Flip unit lane 2',0,CONV_Y+190,LZ[1]]];}
