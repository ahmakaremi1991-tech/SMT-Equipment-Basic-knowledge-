/* ===================================================================
   MACHINE — Rehm VisionXP+ convection reflow oven, dual lane.  Units: mm.
   Standard configuration: 9 preheat + 4 peak + 4 cooling zones,
   process (heating) length 4550 mm.  X = board flow, Z = toward operator.
   =================================================================== */
const CONV_Y=900, LANE_Z=[170,-170], BW=250, BD=200, BT=1.6;
const ZL=350,NH=13,NC=4,INF=600,OUTF=650;
const PX0=-(INF+NH*ZL+NC*ZL+OUTF)/2+INF;               // start of zone 1
const LX0=PX0-INF, LX1=PX0+(NH+NC)*ZL+OUTF;            // machine ends
const HZ=800,TOPY=1500,SILL=940,BASE=110;
const ZSET=[120,150,165,175,180,185,190,195,200,235,250,250,230,100,65,45,35];
const ZNAME=[...Array(9)].map((_,i)=>'P'+(i+1)).concat(['R1','R2','R3','R4','C1','C2','C3','C4']);
const machine=new THREE.Group();scene.add(machine);
const shellMats=[];
const sm=(c,r=.55,m=.05)=>{const x=std(c,r,m);shellMats.push(x);return x;};
const M={
  body:sm(0xe4e6e8,.45,.12), body2:sm(0xd6d9dc,.5,.15), anth:sm(0x33373d,.55,.2), band:sm(0x1f2226,.5,.25), blue:sm(0x0057a8,.45,.15),
  alu:std(0xb9c0c8,.35,.85), aluD:std(0x7d858f,.45,.8), steel:std(0xd5dadf,.22,.95), black:std(0x15171a,.55,.2),
  ss:std(0xa9afb5,.35,.8), red:std(0xc8202a,.5,.1), insul:std(0x7a7f86,.85,.1)
};
const NOSH={cast:false};
const L=LX1-LX0, CX=(LX0+LX1)/2;

/* --- base cabinet --- */
box(machine,L,800-BASE,2*HZ,M.body,CX,(800+BASE)/2,0,NOSH);
[-1,1].forEach(s=>box(machine,L,SILL-800,HZ-465,M.body,CX,(SILL+800)/2,s*(HZ+465)/2,NOSH));
[LX0+(PX0-LX0)/2,LX1-(LX1-PX0-(NH+NC)*ZL)/2].forEach(x=>box(machine,PX0-LX0-40,SILL-800-60,930,M.body,x,(SILL-60+800)/2,0,NOSH));
box(machine,L-40,BASE-20,2*HZ-60,M.anth,CX,(BASE+20)/2,0,NOSH);
for(let x=LX0+300;x<LX1-200;x+=1100)[-650,650].forEach(z=>{cyl(machine,40,46,16,M.steel,x,8,z);cyl(machine,13,13,80,M.steel,x,50,z);});
// dark band at conveyor level along the front + Rehm wordmark
box(machine,L,46,6,M.band,CX,SILL-23,HZ+3,NOSH);
// service doors along the front (one per ~2 zones)
const doors=[];
(function(){
  const segs=[[LX0+20,PX0-10]];for(let x=PX0;x<PX0+(NH+NC)*ZL-10;x+=700)segs.push([x+10,Math.min(x+690,PX0+(NH+NC)*ZL-10)]);segs.push([PX0+(NH+NC)*ZL+10,LX1-20]);
  segs.forEach((s,i)=>{const w=s[1]-s[0],g=new THREE.Group();g.position.set(s[0],0,HZ+4);machine.add(g);
    box(g,w,SILL-60-BASE-30,8,M.body2,w/2,(SILL-60+BASE+30)/2,0,NOSH);
    box(g,14,90,14,M.anth,w-40,600,10,NOSH);
    doors.push({g,dir:1,open:0,target:0,i});});
})();
// condensation trap / residue management units and blowers behind the doors
for(let i=0;i<NH+NC;i+=2){const x=PX0+i*ZL+ZL;cyl(machine,90,90,380,M.ss,x,520,HZ-260);cyl(machine,70,70,120,M.black,x,760,HZ-260);box(machine,220,120,220,M.aluD,x,240,HZ-260);}
box(machine,L-60,6,2*HZ-80,M.black,CX,BASE+30,0,NOSH);

/* --- end walls with dual-lane conveyor ports --- */
[-1,1].forEach(s=>{const x=s<0?LX0:LX1;
  box(machine,24,TOPY-SILL,2*HZ,M.body,x-s*12,(TOPY+SILL)/2,0,NOSH);
  box(machine,30,130,700,M.black,x+s*6,920,0,{cast:false});
  box(machine,34,92,640,new THREE.MeshBasicMaterial({color:0x050607}),x+s*7,916,0,NOSH);});

/* --- fixed lower tunnel (bottom heaters) --- */
const tunnel=new THREE.Group();machine.add(tunnel);
box(tunnel,(NH+NC)*ZL,30,900,M.insul,PX0+(NH+NC)*ZL/2,830,0);
[-1,1].forEach(s=>box(tunnel,(NH+NC)*ZL,120,30,M.ss,PX0+(NH+NC)*ZL/2,880,s*450));
box(tunnel,(NH+NC)*ZL,4,380,M.body2,PX0+(NH+NC)*ZL/2,SILL-2,(HZ+465)/2-40,NOSH);

/* nozzle plates (perforated, glowing with zone temperature) */
const nozT=canvasTex(256,256,(g)=>{g.fillStyle='#8c939a';g.fillRect(0,0,256,256);g.fillStyle='#1a1c1f';for(let y=10;y<256;y+=21)for(let x=(y/21)%2?10:20;x<256;x+=21){g.beginPath();g.arc(x,y,4.2,0,7);g.fill();}},{repeat:true});
nozT.repeat.set(1.3,3.4);
const zoneMats=[];
function zoneColor(t,cool){const c=new THREE.Color();if(cool){c.setRGB(.05,.25+.25*(t-30)/80,.6);return c;}const k=Math.max(0,Math.min(1,(t-100)/170));c.setRGB(1,.18+.5*(1-k)*.4,.02);return c;}
for(let i=0;i<NH+NC;i++){
  const cool=i>=NH,mt=new THREE.MeshStandardMaterial({color:cool?0x8fa4b8:0xa0a7ae,map:nozT,roughness:.6,metalness:.5,emissive:zoneColor(ZSET[i],cool),emissiveIntensity:cool?.25:.12+.75*Math.max(0,(ZSET[i]-110)/150)});
  zoneMats.push(mt);
  const x=PX0+i*ZL+ZL/2;
  box(tunnel,ZL-14,8,860,mt,x,852,0,NOSH);
  if(i>0)box(tunnel,6,70,880,M.ss,PX0+i*ZL,842,0,NOSH);
  if(cool){for(let f=-3;f<=3;f++)box(tunnel,ZL-40,22,6,std(0x6f8ea8,.4,.7),x,870,f*110,NOSH);}
}
// zone labels on the sill
for(let i=0;i<NH+NC;i++)label(machine,ZNAME[i]+'  '+ZSET[i]+'°',220,34,PX0+i*ZL+ZL/2,SILL+.5,HZ-150,{rx:-PI/2,fg:i<NH?'#c4602a':'#2a79c4',pw:440,size:.7});

/* --- pin-chain conveyors (two lanes, chains run the full length) --- */
const chainTex=canvasTex(64,16,(g)=>{g.fillStyle='#2a2d31';g.fillRect(0,0,64,16);g.fillStyle='#8a9097';for(let x=0;x<64;x+=16){g.fillRect(x+2,3,10,10);}g.fillStyle='#d8dde2';for(let x=0;x<64;x+=16)g.fillRect(x+6,6,3,4);},{repeat:true});
chainTex.repeat.set((L+300)/16,1);
const lanes=LANE_Z.map((z,i)=>{
  const g=new THREE.Group();machine.add(g);
  const T=chainTex.clone();T.needsUpdate=true;T.repeat.set((L+300)/16,1);
  const cm=std(0xffffff,.6,.5,{map:T});
  [-1,1].forEach(s=>{const rz=z+s*(BD/2+6);
    box(g,L+300,40,14,M.alu,CX,CONV_Y-22,rz);box(g,L+300,5,10,cm,CX,CONV_Y-1.5,rz-s*2,NOSH);
    box(g,L+300,8,4,M.aluD,CX,CONV_Y+8,rz+s*5,NOSH);});
  for(let x=LX0+200;x<LX1;x+=900)cyl(g,7,7,BD+40,M.steel,x,CONV_Y-36,z,{rx:PI/2,seg:10});
  label(g,'LANE '+(i+1),90,22,LX0+180,CONV_Y+12,z+(i?-130:130),{rx:-PI/2,fg:'#4fd1ff',pw:300,size:.7});
  return {i,z,g,tex:T,v:i?750/60:800/60,boards:[],last:null};
});

/* --- hood (process tunnel cover with top heaters) — hinged at the rear, lifts up --- */
const hoodPivot=new THREE.Group();hoodPivot.position.set(0,TOPY,-HZ);machine.add(hoodPivot);
const hoodTop=[];
(function(){
  const off=new THREE.Group();off.position.set(0,-TOPY,HZ);hoodPivot.add(off);
  const x0=PX0-40,x1=PX0+(NH+NC)*ZL+40,w=x1-x0,cx=(x0+x1)/2;
  box(off,w,22,2*HZ,M.body,cx,TOPY-11,0,NOSH);                                    // top
  box(off,w,TOPY-SILL-22,24,M.body,cx,(TOPY+SILL-22)/2,HZ-12,NOSH);                 // front skirt
  box(off,w,TOPY-SILL-22,24,M.body,cx,(TOPY+SILL-22)/2,-HZ+12,NOSH);
  [x0+12,x1-12].forEach(x=>box(off,24,TOPY-SILL-22,2*HZ,M.body,x,(TOPY+SILL-22)/2,0,NOSH));
  box(off,w,40,6,M.band,cx,TOPY-80,HZ+3,NOSH);                                     // dark accent line
  box(off,w,8,6,M.blue,cx,SILL+30,HZ+3,NOSH);
  // wordmarks
  const lt=canvasTex(1000,200,(g,W,H)=>{g.clearRect(0,0,W,H);g.fillStyle='#0057a8';g.font='italic 900 150px "Arial Black",Arial,sans-serif';g.textBaseline='middle';g.fillText('Rehm',10,100);g.fillStyle='#4a4f56';g.font='500 46px Arial';g.fillText('THERMAL SYSTEMS',470,72);g.font='700 60px Arial';g.fillStyle='#1f2226';g.fillText('VisionXP+',470,136);});
  const lg=new THREE.Mesh(new THREE.PlaneGeometry(900,180),new THREE.MeshStandardMaterial({map:lt,transparent:true,roughness:.5}));lg.position.set(x0+700,1240,HZ+1);off.add(lg);
  // zone strip on the front (thin LED bar per zone)
  for(let i=0;i<NH+NC;i++){const mt=new THREE.MeshBasicMaterial({color:i<NH?0xff7a20:0x40a0ff,toneMapped:false});box(off,ZL-60,10,4,mt,PX0+i*ZL+ZL/2,SILL+70,HZ+2,NOSH);}
  // insulated inner box + top heater modules with nozzle plates
  box(off,(NH+NC)*ZL,30,900,M.insul,PX0+(NH+NC)*ZL/2,1205,0);
  [-1,1].forEach(s=>box(off,(NH+NC)*ZL,250,30,M.ss,PX0+(NH+NC)*ZL/2,1070,s*450));
  for(let i=0;i<NH+NC;i++){const x=PX0+i*ZL+ZL/2;
    box(off,ZL-14,8,860,zoneMats[i],x,965,0,NOSH);
    if(i>0)box(off,6,240,880,M.ss,PX0+i*ZL,1080,0,NOSH);
    if(i<NH){box(off,ZL-80,130,300,M.ss,x,1120,0);cyl(off,60,60,90,M.black,x,TOPY+40,-300);}else{box(off,ZL-60,90,500,std(0x6f8ea8,.4,.7),x,1110,0);}
  }
})();
const hood={open:0,target:0};
// exhaust stacks (fixed on the hood top would move; put them on the rear frame)
[PX0+2*ZL,PX0+12*ZL].forEach(x=>{cyl(machine,75,75,260,M.ss,x,TOPY+130,-HZ+90);cyl(machine,90,90,20,M.ss,x,TOPY+10,-HZ+90);});

/* --- infeed / outfeed covers (glass) --- */
const glassMat=new THREE.MeshStandardMaterial({color:0x9db4c8,roughness:.05,metalness:.2,transparent:true,opacity:.22,depthWrite:false,side:THREE.DoubleSide});
[[LX0+12,PX0-40],[PX0+(NH+NC)*ZL+40,LX1-12]].forEach(s=>{const w=s[1]-s[0],cx=(s[0]+s[1])/2;
  box(machine,w,22,2*HZ,M.body,cx,TOPY-11,0,NOSH);box(machine,w,TOPY-SILL-22,22,M.body,cx,(TOPY+SILL)/2,-HZ+11,NOSH);
  const f=new THREE.Mesh(new THREE.PlaneGeometry(w-40,TOPY-SILL-80),glassMat);f.position.set(cx,(TOPY+SILL)/2,HZ-6);f.renderOrder=5;machine.add(f);
  box(machine,w,30,24,M.body,cx,TOPY-37,HZ-12,NOSH);box(machine,w,24,24,M.body,cx,SILL+12,HZ-12,NOSH);});

/* --- signal tower + operator monitor at the infeed --- */
const tower={};
(function(){
  const g=new THREE.Group();g.position.set(LX0+200,TOPY,-HZ+150);machine.add(g);
  cyl(g,9,9,260,M.steel,0,130,0);cyl(g,22,26,14,M.black,0,7,0);
  [['r',0xff2a2a,340],['y',0xffa800,300],['g',0x22e06a,260]].forEach(a=>{const mt=new THREE.MeshStandardMaterial({color:a[1],emissive:a[1],emissiveIntensity:.05,roughness:.3,transparent:true,opacity:.92});tower[a[0]]=mt;cyl(g,22,22,38,mt,0,a[2]+19,0);});
  cyl(g,23,23,8,M.dark||M.band,0,382,0);
})();
let monTex,monCtx;
(function(){
  const g=new THREE.Group();g.position.set(LX0+380,0,HZ);machine.add(g);
  box(g,60,60,240,M.body2,0,1300,120);box(g,60,260,60,M.body2,0,1400,230);
  const m=new THREE.Group();m.position.set(0,1460,290);m.rotation.y=.35;g.add(m);
  box(m,620,400,40,M.black,0,0,0);box(m,120,120,40,M.black,0,0,-36);
  const c=document.createElement('canvas');c.width=640;c.height=400;monCtx=c.getContext('2d');
  monTex=new THREE.CanvasTexture(c);monTex.encoding=THREE.sRGBEncoding;monTex.anisotropy=8;
  const scr=new THREE.Mesh(new THREE.PlaneGeometry(586,366),new THREE.MeshBasicMaterial({map:monTex,toneMapped:false}));scr.position.set(0,0,21);m.add(scr);
  const k=new THREE.Group();k.position.set(0,1180,300);k.rotation.y=.35;g.add(k);
  box(k,520,14,200,M.black,0,0,0);box(k,360,12,120,std(0x2c2f34,.6),-50,13,-10);
})();
// E-stops on both ends of the front
[LX0+120,LX1-120].forEach(x=>{box(machine,90,90,4,std(0xf2c400,.5),x,SILL-160,HZ+6,NOSH);cyl(machine,28,22,28,M.red,x,SILL-160,HZ+22,{rx:PI/2,cast:false});});

/* --- neighbours in the line --- */
[-1,1].forEach(s=>{
  box(scene,640,1000,800,std(0x262c35,.75,.1),s*(LX1+520),500,0,NOSH);
  box(scene,4,100,620,M.black,s*(LX1+199),916,0,NOSH);
  label(scene,s<0?'▶  FROM AOI':'TO UNLOADER  ▶',520,70,s*(LX1+520),1001,300,{rx:-PI/2,fg:'#9fb4cf',pw:800,size:.5});
});
const interior=machine;
const inLight=new THREE.PointLight(0xffd9b0,.6,3000,1);inLight.position.set(CX,1150,0);machine.add(inLight);
