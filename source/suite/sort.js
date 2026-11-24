
/* ===================================================================
   AOI SORTING LINE — offline automatic sorting of suspect panels.
   Loader → Flipper 1 → Scanner → AOI → Flipper 2 → Unloader
   Unloader magazines: Mag 1 (good), Mag 2 (good), Mag 3 (defects).
   Single lane (lane 1, z = +170).  Units mm, transport height 950 mm.
   Every panel is GOOD unless the operator marks it in the AOI and
   then judges it PASS (good) or FAIL (bad).
   =================================================================== */

/* ---------- 1. config ---------- */
const WIDTHS=[164,175,190,212],PITCHES=[3,4,5],PROGRAMS=['Program 1','Program 2','Program 3','Program 4','Program 5'];
const DEFAULTS={side:'TOP',prog:'Program 1',magW:212,pitch:3,count:20,cap:10};   // used when the line setup is not activated
const USABLE_SLOTS=45;                                                          // 50 comb slots, top 5 stay empty

/* ---------- 2. language (EN / RO) ---------- */
const I18N={
 en:{title:'AOI SORTING LINE',sub:'Offline automatic sorting: suspect panels are loaded in magazines, inspected by the AOI and sorted into good and defect magazines. Every panel is good unless you mark it in the AOI and judge it.',
  lang:'Language',setup:'Line setup',setAct:'Activate line setup',setOff:'Setup off — defaults: TOP side, flippers bypass, magazine 212 mm, pitch 3, Program 1.',
  side:'Inspection side',prog:'AOI program',choose:'— choose —',magW:'Magazine width (mm)',pitch:'Magazine pitch',convW:'Conveyor / flipper width',flipMode:'Flippers',
  flip:'FLIP',bypass:'BYPASS',count:'Panels in loader',cap:'Magazine capacity',need:'Choose side, program, width and pitch to enable START.',locked:'Settings are locked while the line runs — use RESET to change them.',
  counters:'Counters',c_load:'Loaded',c_ins:'Inspected',c_good:'Good',c_bad:'Defect',c_judge:'Operator judgements',c_left:'Left in loader',
  mags:'Magazines',mag1:'Mag 1 · Good',mag2:'Mag 2 · Good',mag3:'Mag 3 · Defects',slots:'positions per magazine',
  START:'START',PAUSE:'PAUSE',RESUME:'RESUME',STOP:'STOP',RESET:'RESET',mark:'Mark panel for judgement',replace:'Replace magazine',
  covers:'Open covers',close:'Close covers',xray:'X-ray',labels:'Labels',speed:'Speed',over:'Overview',vLoader:'Loader',vAoi:'AOI',vUnl:'Unloader',follow:'Follow panel',vTop:'Top',
  judgeT:'Operator judgement',judgeMsg:'{sn} was marked for judgement – operator decision required.',pass:'PASS · GOOD',fail:'FAIL · BAD',judgeHint:'GOOD → Magazine 1 / 2 · BAD → Magazine 3 (defects)',
  fullGood:'Both good magazines are full – line stopped. Replace the magazines to continue.',fullBad:'Magazine 3 (defects) is full – line stopped. Replace it to continue.',
  doneT:'Run complete',doneClose:'Close',pctNok:'NOK',
  status:'Line',st_ready:'READY',st_run:'RUNNING',st_pause:'PAUSED',st_stop:'STOPPED',st_judge:'WAITING FOR OPERATOR',st_full:'MAGAZINE FULL',st_done:'RUN COMPLETE',
  m_loader:'LOADER',m_flip1:'FLIPPER 1',m_scan:'SCANNER',m_aoi:'AOI',m_flip2:'FLIPPER 2',m_unl:'UNLOADER',
  s_idle:'IDLE',s_wait:'WAITING',s_shuttle:'SHUTTLE TO MAGAZINE',s_pull:'PULLING PANEL',s_out:'PANEL OUT',s_in:'PANEL IN',s_flip:'FLIPPING 180°',s_bypass:'BYPASS',s_read:'READING CODE',
  s_insp:'INSPECTING',s_judge:'OPERATOR JUDGEMENT',s_sensor:'PANEL AT END SENSOR',s_push:'PUSHING INTO MAGAZINE',s_full:'MAGAZINE FULL',s_swap:'MAGAZINE CHANGE',s_empty:'EMPTY',
  z_in:'unsorted parts',z_out:'sorted parts',z_an:'ANALYSIS AREA',z_an2:'defect panels (Mag 3)',
  l_start:'Line started · {side} · {prog} · width {w} mm · pitch {p}',l_load:'{sn} out of loader (magazine {m}, position {s})',l_flip:'{sn} flipped at {f}',l_bypass:'{sn} bypass at {f}',
  l_scan:'{sn} code read',l_aoi:'{sn} AOI result: {r}',l_mark:'{sn} marked for judgement',l_dec:'{sn} operator decision: {d}',l_store:'{sn} → Magazine {n}',l_full:'Magazine {n} full – line stopped',
  l_repl:'Magazine {n} replaced',l_done:'Run complete: {g} good, {b} defect',GOOD:'GOOD',BAD:'BAD',sum_side:'Side',sum_prog:'Program',sum_w:'Width',
  stTitle:'LINE STATUS',pw:'pitch',cp:'capacity',cycK:'CYCLE TIME · SORTING',cyc1:'{n} panels/h · lead time {t} s',cyc0:'first panel in progress',hint:'Drag = rotate · Wheel = zoom · Right-drag = pan · Mark a panel while it is inside the AOI'},
 ro:{title:'LINIE DE SORTARE AOI',sub:'Sortare automată offline: plăcile suspecte sunt încărcate în magazii, inspectate de AOI și sortate în magazii pentru plăci bune și defecte. Fiecare placă este bună, cu excepția celor marcate în AOI și evaluate de operator.',
  lang:'Limbă',setup:'Configurare linie',setAct:'Activează configurarea liniei',setOff:'Configurare dezactivată — implicit: față TOP, flippere în bypass, magazie 212 mm, pas 3, Program 1.',
  side:'Fața inspectată',prog:'Program AOI',choose:'— alegeți —',magW:'Lățime magazie (mm)',pitch:'Pas magazie',convW:'Lățime conveior / flipper',flipMode:'Flippere',
  flip:'ÎNTOARCERE',bypass:'BYPASS',count:'Plăci în încărcător',cap:'Capacitate magazie',need:'Alegeți fața, programul, lățimea și pasul pentru a activa START.',locked:'Setările sunt blocate cât timp linia funcționează — folosiți RESET pentru a le modifica.',
  counters:'Contoare',c_load:'Încărcate',c_ins:'Inspectate',c_good:'Bune',c_bad:'Defecte',c_judge:'Decizii operator',c_left:'Rămase în încărcător',
  mags:'Magazii',mag1:'Mag 1 · Bune',mag2:'Mag 2 · Bune',mag3:'Mag 3 · Defecte',slots:'poziții pe magazie',
  START:'START',PAUSE:'PAUZĂ',RESUME:'CONTINUĂ',STOP:'STOP',RESET:'RESET',mark:'Marchează placa pentru evaluare',replace:'Înlocuiește magazia',
  covers:'Deschide capacele',close:'Închide capacele',xray:'Transparent',labels:'Etichete',speed:'Viteză',over:'Vedere generală',vLoader:'Încărcător',vAoi:'AOI',vUnl:'Descărcător',follow:'Urmărește placa',vTop:'De sus',
  judgeT:'Evaluare operator',judgeMsg:'{sn} a fost marcată pentru evaluare – este necesară decizia operatorului.',pass:'TRECE · BUNĂ',fail:'RESPINSĂ · DEFECTĂ',judgeHint:'BUNĂ → Magazia 1 / 2 · DEFECTĂ → Magazia 3 (defecte)',
  fullGood:'Ambele magazii pentru plăci bune sunt pline – linia s-a oprit. Înlocuiți magaziile pentru a continua.',fullBad:'Magazia 3 (defecte) este plină – linia s-a oprit. Înlocuiți-o pentru a continua.',
  doneT:'Rulare finalizată',doneClose:'Închide',pctNok:'NOK',
  status:'Linie',st_ready:'PREGĂTITĂ',st_run:'ÎN FUNCȚIUNE',st_pause:'PAUZĂ',st_stop:'OPRITĂ',st_judge:'AȘTEAPTĂ OPERATORUL',st_full:'MAGAZIE PLINĂ',st_done:'FINALIZATĂ',
  m_loader:'ÎNCĂRCĂTOR',m_flip1:'FLIPPER 1',m_scan:'SCANER',m_aoi:'AOI',m_flip2:'FLIPPER 2',m_unl:'DESCĂRCĂTOR',
  s_idle:'INACTIV',s_wait:'AȘTEAPTĂ',s_shuttle:'NAVETA LA MAGAZIE',s_pull:'EXTRAGE PLACA',s_out:'PLACA IESE',s_in:'PLACA INTRĂ',s_flip:'ÎNTOARCE 180°',s_bypass:'BYPASS',s_read:'CITEȘTE CODUL',
  s_insp:'INSPECTEAZĂ',s_judge:'EVALUARE OPERATOR',s_sensor:'PLACA LA SENZORUL FINAL',s_push:'ÎMPINGE ÎN MAGAZIE',s_full:'MAGAZIE PLINĂ',s_swap:'SCHIMB MAGAZIE',s_empty:'GOL',
  z_in:'piese nesortate',z_out:'piese sortate',z_an:'ZONA DE ANALIZĂ',z_an2:'plăci defecte (Mag 3)',
  l_start:'Linie pornită · {side} · {prog} · lățime {w} mm · pas {p}',l_load:'{sn} scoasă din încărcător (magazia {m}, poziția {s})',l_flip:'{sn} întoarsă la {f}',l_bypass:'{sn} bypass la {f}',
  l_scan:'{sn} cod citit',l_aoi:'{sn} rezultat AOI: {r}',l_mark:'{sn} marcată pentru evaluare',l_dec:'{sn} decizia operatorului: {d}',l_store:'{sn} → Magazia {n}',l_full:'Magazia {n} plină – linia s-a oprit',
  l_repl:'Magazia {n} înlocuită',l_done:'Rulare finalizată: {g} bune, {b} defecte',GOOD:'BUNĂ',BAD:'DEFECTĂ',sum_side:'Față',sum_prog:'Program',sum_w:'Lățime',
  stTitle:'STARE LINIE',pw:'pas',cp:'capacitate',cycK:'TIMP DE CICLU · SORTARE',cyc1:'{n} plăci/h · timp de tranzit {t} s',cyc0:'prima placă în lucru',hint:'Trageți = rotire · Rotiță = zoom · Clic dreapta = deplasare · Marcați o placă cât timp este în AOI'}
};
let LANG=(()=>{try{return localStorage.getItem('smt-lang')||'en';}catch(e){return 'en';}})();
const T=(k,o)=>{let s=(I18N[LANG][k]??I18N.en[k]??k);if(o)for(const q in o)s=s.split('{'+q+'}').join(o[q]);return s;};

/* ---------- 3. state ---------- */
const SET={active:false,side:null,prog:null,magW:null,pitch:null,count:20,cap:10};
function eff(){const s=SET.active?SET:DEFAULTS;const pitch=s.pitch||3,use=Math.floor(USABLE_SLOTS/pitch);
  return{side:s.side||'TOP',prog:s.prog||'Program 1',magW:s.magW||212,pitch,use,count:Math.min(SET.active?SET.count:DEFAULTS.count,3*use),cap:Math.min(SET.active?SET.cap:DEFAULTS.cap,use)};}
const setupValid=()=>!SET.active||(SET.side&&SET.prog&&SET.magW&&SET.pitch);
let E=eff();                                   // parameters of the built line
let started=false,userPause=false,stopped=false,hold=null,runDone=false;   // hold: null | 'judge' | 'full'
let simTime=0,speed=1;
const CNT={total:0,loaded:0,inspected:0,good:0,bad:0,judged:0};
let LINE=[],LOADER_,FLIP1,SCANR,AOI_,FLIP2,UNL;
const RECORDS=[];                              // one record per panel: id, aoi, decision, magazine
const logEl=$('log');
function log(t,c){const d=document.createElement('div');d.textContent=new Date(simTime*1000).toISOString().substr(14,5)+'  '+t;if(c)d.className=c;logEl.prepend(d);while(logEl.children.length>60)logEl.lastChild.remove();}

/* ---------- 4. coroutines ---------- */
const FRAME=-1;let cos=[],svc=[];             // cos: line work (frozen by holds), svc: service animations (magazine change)
class Co{constructor(g){this.g=g;this.wait=0;this.done=false;}
  step(dt){if(this.done)return;this.wait-=dt;let pass=dt,guard=0;
    while(this.wait<=0&&guard++<64){const r=this.g.next(pass);pass=0;if(r.done){this.done=true;return;}if(r.value===FRAME){this.wait=1e-9;return;}this.wait+=r.value;}}}
function run(g){const c=new Co(g);cos.push(c);return c;}
function runSvc(g){const c=new Co(g);svc.push(c);return c;}
const lerp=(a,b,k)=>a+(b-a)*k,ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function* tw(dur,fn){let t=0;fn(0);while(t<dur){t+=yield FRAME;fn(Math.min(1,t/dur));}}
let moving=0;
function* conveyTo(b,x,v=V){moving++;while(Math.abs(b.x-x)>.01){const dt=yield FRAME;const d=x-b.x;b.x+=Math.sign(d)*Math.min(Math.abs(d),v*dt);}moving--;}
const nextOf=m=>LINE[LINE.indexOf(m)+1]||null;
function* hand(m,b){const n=nextOf(m);while(n.busy||n.inbox.length)yield FRAME;n.busy=true;n.inbox.push(b);}

/* ---------- 5. the AOI model (wrapped page model, transport 900 → placed at +50 mm) ---------- */
/*__AOI_MODEL__*/

/* ---------- 6. equipment ---------- */
function stationBase(o){const m=machine(Object.assign({inbox:[],busy:false,st:'s_idle'},o));m.inbox=[];return m;}
function buildLine(){
  E=eff();
  // panel and magazine follow the chosen magazine width; conveyors / flippers adjust their width to it
  MG.W=E.magW;MG.tag=String(E.magW);MG.pitch=10*E.pitch;MG.use=E.use;
  BD=E.magW-8;PSCALE=BD/200;BW=250*PSCALE;
  LOADER_=stationBase({key:'loader',name:T('m_loader'),L:1080,z1:RAIL_F+380,build(m){m.z0=m.z1-1750;buildMagHandler(m,true);}});
  FLIP1=stationBase({key:'flip1',name:T('m_flip1'),L:500,z1:RAIL_F+256,build(m){buildInverterBody(m,[LZ[0]]);}});
  SCANR=stationBase({key:'scanner',name:T('m_scan'),L:500,z1:RAIL_F+168,build(m){buildScannerBody(m,[LZ[0]]);}});
  AOI_=stationBase({key:'aoi',name:T('m_aoi'),L:1250,build(m){const A=buildAOI(m.g,BW,BD);A.machine.position.y=50;m.A=A;A.shellMats.forEach(x=>shellMats.push(x));
    m.hoods.push({p:A.hoodPivot,open:0,target:0,ang:-1.05});m.lamps=A.tower;m.H=1600;
    m.tags=[['15 MP camera, light dome, moiré projectors',0,1380,0],['Lane 1 (used)',-500,960,LZ[0]],['Lane 2 (not used on this line)',-500,960,LZ[1]]];}});
  FLIP2=stationBase({key:'flip2',name:T('m_flip2'),L:500,z1:RAIL_F+256,build(m){buildInverterBody(m,[LZ[0]]);}});
  UNL=stationBase({key:'unloader',name:T('m_unl'),L:1080,z1:RAIL_F+380,build(m){m.z0=m.z1-1750;buildMagHandler(m,false);
    m.magG.forEach((g,i)=>label(g,T('mag'+(i+1)),220,40,0,MG.H-80,MG.W/2+22,{bg:i===2?'#c8202a':'#1f9e55',fg:'#fff',pw:440,size:.62}));}});
  LINE=[LOADER_,FLIP1,SCANR,AOI_,FLIP2,UNL];
  const total=LINE.reduce((s,m)=>s+m.L,0);let x=-total/2;
  LINE.forEach((m,i)=>{m.i=i;m.x0=x;m.x1=x+m.L;m.cx=x+m.L/2;m.X=lx=>m.cx+lx;m.g.position.x=m.cx;m.build(m);x+=m.L;});
  buildZones(total);
  // loader magazines: panels fill magazine 1, then 2, then 3 (bottom to top)
  LOADER_.mags=[0,1,2].map(()=>({present:true,boards:new Array(MG.slots).fill(null),lift:0,busy:false}));
  let n=0;for(let i=0;i<3;i++)for(let k=0;k<MG.use&&n<E.count;k++){const b=newBoard(0);b.inMag=true;b.id='PCB-'+String(++n).padStart(4,'0');b.code=b.id;b.marked=true;drawMark(b,1);b.result='GOOD';LOADER_.mags[i].boards[k]=b;}
  CNT.total=n;
  LOADER_.platY=slotPlat(0);LOADER_.cz=LZ[0];LOADER_.rodX=rodRest(LOADER_);LOADER_.hook=0;LOADER_.sens=0;
  UNL.mags=[0,1,2].map(()=>({present:true,boards:new Array(MG.slots).fill(null),lift:0,busy:false,n:0}));
  UNL.platY=slotPlat(E.cap-1);UNL.cz=LZ[0];UNL.rodX=rodRest(UNL);UNL.hook=0;UNL.sens=0;
  [FLIP1,FLIP2].forEach(m=>{m.ang=0;m.flips=0;});SCANR.read=[0];SCANR.last='—';
  AOI_.fx={color:new THREE.Color(1,1,1),ring:-1,moire:-1,power:0};AOI_.gx=0;AOI_.gz=LZ[0];AOI_.cur=null;AOI_.canMark=false;
}

/* ---------- 7. floor zones: input lane, output lane, analysis area ---------- */
let ZONES=[],zoneStore={out:[],an:[]};
function sign(par,main,subTxt,x,z,col){const g=new THREE.Group();g.position.set(x,0,z);par.add(g);
  box(g,30,2100,30,M.steel,0,1050,-300);box(g,900,10,10,M.steel,0,2100,-300);
  label(g,main,820,150,0,1900,-278,{bg:col,fg:'#fff',pw:1100,size:.5,weight:'900'});label(g,subTxt,820,60,0,1790,-278,{bg:'#1d2128',fg:'#dfe8f5',pw:1100,size:.55});return g;}
function crates(g,x,z,n,col){const mt=std(col,.7,.05);for(let i=0;i<n;i++){const cx=x+(i%3)*330,cy=Math.floor(i/3);box(g,300,190,420,mt,cx,95+cy*195,z);box(g,260,20,380,std(0x1d2128,.7),cx,193+cy*195,z,NOSH);}}
function buildZones(total){const g=new THREE.Group();scene.add(g);ZONES=[g];zoneStore={out:[],an:[]};
  const xl=-total/2-1350,xr=total/2+1350;
  const fl=(x,z,w,d,c)=>{const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.18,depthWrite:false}));m.rotation.x=-PI/2;m.position.set(x,2,z);g.add(m);};
  fl(xl,250,1500,1300,0x1e6fd9);fl(xr,500,1500,1100,0x1f9e55);fl(xr,-950,1500,900,0xc8202a);
  sign(g,'PENTRU SORTARE',T('z_in'),xl,250,'#1e6fd9');crates(g,xl-330,350,5,0x5b6676);
  sign(g,'SORTATE',T('z_out'),xr,500,'#1f9e55');crates(g,xr-330,650,2,0x5b6676);
  sign(g,T('z_an'),T('z_an2'),xr,-950,'#c8202a');box(g,1100,40,700,std(0x3a3f47,.6,.2),xr,780,-950);[[-500,-300],[500,-300],[-500,300],[500,300]].forEach(p=>box(g,40,760,40,M.steel,xr+p[0],380,-950+p[1]));
  ZONES.xr=xr;}

/* ---------- 8. station programs ---------- */
function* loaderRun(m){
  while(true){
    const i=m.mags.findIndex(g=>g.boards.some(b=>b));
    if(i<0){m.st='s_empty';return;}
    const mg=m.mags[i],k=mg.boards.findIndex(b=>b);                              // bottom to top
    m.st='s_shuttle';const z0=m.cz,p0=m.platY;yield* tw(.25+Math.abs(m.magZ[i]-z0)/900,t=>{m.cz=lerp(z0,m.magZ[i],ease(t));m.platY=lerp(p0,slotPlat(k),ease(t));});
    const far=m.magX-BW/2-8;m.st='s_pull';m.hook=0;yield* tw(.9,t=>m.rodX=lerp(rodRest(m),far,ease(t)));yield* tw(.3,t=>m.hook=t);
    const b=mg.boards[k];mg.boards[k]=null;b.inMag=false;b.z=m.magZ[i];b.dy=0;b.t0=simTime;
    yield* tw(1.5,t=>{m.rodX=lerp(far,rodRest(m),t);b.x=m.X(m.rodX+BW/2+8);});yield* tw(.25,t=>m.hook=1-t);
    m.st='s_out';const zb=m.cz;yield* tw(.25+Math.abs(LZ[0]-zb)/900,t=>{m.cz=lerp(zb,LZ[0],ease(t));b.z=m.cz;});
    CNT.loaded++;log(T('l_load',{sn:b.id,m:i+1,s:k+1}));RECORDS.push({id:b.id,aoi:'',dec:'',mag:0,b});
    yield* conveyTo(b,m.X(m.L/2-BW/2-10));yield* hand(m,b);
    while(b.alive&&b.x<m.x1)yield FRAME;}}
function* flipRun(m){
  while(true){while(!m.inbox.length){m.st='s_wait';yield FRAME;}const b=m.inbox.shift();m.busy=true;
    m.st='s_in';yield* conveyTo(b,m.X(0));yield .2;
    if(E.side==='BOT'){m.st='s_flip';const a0=m.ang,f0=b.flip;yield* tw(2.0,k=>{m.ang=a0+PI*ease(k);b.flip=f0+PI*ease(k);});m.flips++;log(T('l_flip',{sn:b.id,f:m.name}));yield .2;}
    else{m.st='s_bypass';log(T('l_bypass',{sn:b.id,f:m.name}));}
    m.st='s_out';yield* conveyTo(b,m.X(m.L/2-BW/2-10));yield* hand(m,b);while(b.alive&&b.x<m.x1)yield FRAME;m.busy=false;}}
function* scanRun(m){
  while(true){while(!m.inbox.length){m.st='s_wait';yield FRAME;}const b=m.inbox.shift();m.busy=true;
    m.st='s_in';yield* conveyTo(b,m.X(DM_X-DM_X*PSCALE));m.st='s_read';m.read[0]=1;yield .6;m.read[0]=0;m.last=b.id;log(T('l_scan',{sn:b.id}),'ok');
    m.st='s_out';yield* conveyTo(b,m.X(m.L/2-BW/2-10));yield* hand(m,b);while(b.alive&&b.x<m.x1)yield FRAME;m.busy=false;}}
function* aoiCapture(m){const fx=m.fx;
  for(const c of [[0xff4a4a,1],[0x4aff7a,2],[0x5a8aff,3],[0xffffff,0]]){fx.color.setHex(c[0]);fx.ring=c[1];fx.moire=-1;fx.power=1;yield .04;fx.power=0;yield .012;}
  for(let k=0;k<2;k++){fx.color.setHex(0xbfe0ff);fx.ring=-1;fx.moire=k*2;fx.power=.5;yield .06;}fx.moire=-1;fx.power=0;}
function* aoiRun(m){
  while(true){while(!m.inbox.length){m.st='s_wait';yield FRAME;}const b=m.inbox.shift();m.busy=true;
    m.st='s_in';yield* conveyTo(b,m.X(0));m.cur=b;m.canMark=true;m.st='s_insp';
    const nx=3,nz=2,sx=(BW-58.56)/Math.max(1,nx-1),sz=(BD-58.56)/Math.max(1,nz-1);
    for(let r=0;r<nz;r++)for(let c=0;c<nx;c++){const cc=r%2?nx-1-c:c,tx=-BW/2+29.28+cc*sx,tz=LZ[0]-BD/2+29.28+r*sz,x0=m.gx,z0=m.gz;
      yield* tw(.08,k=>{m.gx=lerp(x0,tx,k);m.gz=lerp(z0,tz,k);});yield* aoiCapture(m);}
    m.canMark=false;CNT.inspected++;const rec=RECORDS.find(r=>r.b===b);rec.aoi=b.judged?T('BAD'):T('GOOD');
    if(!b.judged)log(T('l_aoi',{sn:b.id,r:T('GOOD')}),'ok');
    m.cur=null;m.st='s_out';const x0=m.gx,z0=m.gz;run(tw(.4,k=>{m.gx=lerp(x0,0,k);m.gz=lerp(z0,LZ[0],k);}));
    yield* conveyTo(b,m.X(m.L/2-BW/2-10));yield* hand(m,b);while(b.alive&&b.x<m.x1)yield FRAME;m.busy=false;}}
function magCount(mg){return mg.boards.filter(Boolean).length;}
function pickMag(b){const c=E.cap;if(b.result==='BAD')return magCount(UNL.mags[2])<c?2:-1;return magCount(UNL.mags[0])<c?0:magCount(UNL.mags[1])<c?1:-1;}
function* unloaderRun(m){
  while(true){while(!m.inbox.length){m.st='s_wait';yield FRAME;}const b=m.inbox.shift();m.busy=true;
    m.st='s_in';yield* conveyTo(b,m.X(m.shX+250-BW/2-6));m.sens=1;m.st='s_sensor';
    let i;while((i=pickMag(b))<0){if(hold!=='full'){hold='full';m.st='s_full';const bad=b.result==='BAD';showWarn(T(bad?'fullBad':'fullGood'));log(T('l_full',{n:bad?3:'1 + 2'}),'ng');}yield FRAME;}
    const mg=m.mags[i];let k=E.cap-1;while(k>0&&mg.boards[k])k--;                     // top to bottom
    m.st='s_shuttle';const zb=m.cz,p0=m.platY;yield* tw(.25+Math.abs(m.magZ[i]-zb)/900,t=>{m.cz=lerp(zb,m.magZ[i],ease(t));b.z=m.cz;m.platY=lerp(p0,slotPlat(k),ease(t));});
    const ref=rodRest(m),edge=b.x-m.cx-BW/2-5,end=m.magX-BW/2-4;
    m.st='s_push';yield* tw(.25,t=>m.hook=t);yield* tw(.6,t=>m.rodX=lerp(ref,edge,t));m.sens=0;
    yield* tw(1.4,t=>{m.rodX=lerp(edge,end,t);b.x=m.X(m.rodX+BW/2+5);});b.inMag=true;mg.boards[k]=b;
    yield* tw(.25,t=>m.hook=1-t);const r1=m.rodX;yield* tw(.9,t=>m.rodX=lerp(r1,ref,ease(t)));
    const rec=RECORDS.find(r=>r.b===b);rec.mag=i+1;b.result==='BAD'?CNT.bad++:CNT.good++;m.outT.push(simTime);m.procT.push(simTime-b.t0);
    log(T('l_store',{sn:b.id,n:i+1}),b.result==='BAD'?'ng':'ok');
    const zc=m.cz;yield* tw(.25+Math.abs(LZ[0]-zc)/900,t=>m.cz=lerp(zc,LZ[0],ease(t)));m.busy=false;
    if(CNT.good+CNT.bad>=CNT.total)finishRun();}}

/* ---------- 9. operator actions ---------- */
function markPanel(){if(!started||!AOI_.cur||!AOI_.canMark||hold||userPause||stopped)return;
  const b=AOI_.cur;hold='judge';AOI_.st='s_judge';log(T('l_mark',{sn:b.id}),'cl');
  $('jMsg').textContent=T('judgeMsg',{sn:b.id});$('judge').classList.add('show');}
function decide(good){const b=AOI_.cur;if(hold!=='judge'||!b)return;b.judged=true;b.result=good?'GOOD':'BAD';CNT.judged++;
  log(T('l_dec',{sn:b.id,d:T(good?'GOOD':'BAD')}),good?'ok':'ng');$('judge').classList.remove('show');hold=null;AOI_.st='s_insp';}
function replaceMags(){if(hold!=='full')return;const full=UNL.mags.map((g,i)=>magCount(g)>=E.cap?i:-1).filter(i=>i>=0);
  UNL.st='s_swap';hideWarn();
  runSvc((function*(){
    for(const i of full){const mg=UNL.mags[i];mg.busy=true;yield .6;yield* tw(1.0,k=>mg.lift=k*900);
      const kept=magMesh(ZONES[0],1),bad=i===2,list=bad?zoneStore.an:zoneStore.out,n=list.length;
      kept.position.set(ZONES.xr-350+(n%3)*330,bad?800:0,(bad?-950:450)+Math.floor(n/3)*-10+(bad?0:-200));list.push(kept);
      mg.present=false;mg.boards.forEach(b=>b&&killBoard(b));mg.boards=new Array(MG.slots).fill(null);yield .5;mg.present=true;
      yield* tw(1.0,k=>mg.lift=(1-k)*900);mg.lift=0;mg.busy=false;log(T('l_repl',{n:i+1}),'cl');}
    hold=null;UNL.st='s_wait';})());}
function finishRun(){if(runDone)return;runDone=true;const tot=CNT.good+CNT.bad;
  log(T('l_done',{g:CNT.good,b:CNT.bad}),'ok');
  $('dBody').innerHTML=[[T('c_load'),CNT.loaded],[T('c_ins'),CNT.inspected],[T('c_good'),CNT.good],[T('c_bad'),CNT.bad],[T('c_judge'),CNT.judged],['% '+T('pctNok'),(tot?(CNT.bad/tot*100).toFixed(1):'0.0')+' %'],
    [T('sum_side'),E.side],[T('sum_prog'),E.prog],[T('sum_w'),E.magW+' mm · '+T('pw')+' '+E.pitch]].map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('');
  $('done').classList.add('show');}

/* ---------- 10. run control ---------- */
function rebuild(){cos=[];svc=[];[...boards].forEach(b=>b.alive&&killBoard(b));boards=[];MACH.forEach(m=>scene.remove(m.g));MACH.length=0;ZONES.forEach(z=>scene.remove(z));
  shellMats.length=SHELL0;
  RECORDS.length=0;Object.keys(CNT).forEach(k=>CNT[k]=0);started=false;userPause=false;stopped=false;hold=null;runDone=false;simTime=0;moving=0;
  logEl.innerHTML='';hideWarn();$('judge').classList.remove('show');$('done').classList.remove('show');
  buildLine();if(xray)applyXray();setHoods(hoodsOpen);buildTags();ui(true);}
function start(){if(stopped&&started){stopped=false;ui(true);return;}if(started||!setupValid())return;
  started=true;log(T('l_start',{side:E.side,prog:E.prog,w:E.magW,p:E.pitch}));
  run(loaderRun(LOADER_));run(flipRun(FLIP1));run(scanRun(SCANR));run(aoiRun(AOI_));run(flipRun(FLIP2));run(unloaderRun(UNL));ui(true);}
function lineState(){return !started?'st_ready':runDone?'st_done':stopped?'st_stop':userPause?'st_pause':hold==='judge'?'st_judge':hold==='full'?'st_full':'st_run';}
function showWarn(t){$('wMsg').textContent=t;$('warn').classList.add('show');}
function hideWarn(){$('warn').classList.remove('show');}

/* ---------- 11. UI: setup panel, buttons, counters, language ---------- */
const SHELL0=shellMats.length;let hoodsOpen=0,xray=false,showTags=false,tags=[];
function setHoods(o){hoodsOpen=o;MACH.forEach(m=>m.hoods.forEach(h=>h.target=o));}
function applyXray(){shellMats.forEach(mt=>{mt.transparent=xray;mt.opacity=xray?.12:1;mt.depthWrite=!xray;mt.needsUpdate=true;});}
function buildTags(){$('tags').innerHTML='';tags=[];MACH.forEach(m=>(m.tags||[]).forEach(t=>{const el=document.createElement('div');el.className='tag';el.textContent=t[0];$('tags').appendChild(el);tags.push({el,m,v:new THREE.Vector3(t[1],t[2],t[3])});}));}
const SHELL_RO={'Theme':'Temă','On-screen data':'Date pe ecran','Title':'Titlu','Cycle time':'Timp de ciclu','Line status':'Stare linie','Event log':'Jurnal evenimente','Mouse hint':'Indicație mouse',
  'White':'Alb','Dark gray':'Gri închis','Sorting line':'Linie de sortare','LOADER':'ÎNCĂRCĂTOR','SCANNER':'SCANER','UNLOADER':'DESCĂRCĂTOR'};
function i18nShell(){document.querySelectorAll('#sideBody .sec h3:not([data-t]),#sideBody .chk span:not([data-t]),[data-theme-btn],.flow span').forEach(e=>{if(!e.dataset.en)e.dataset.en=e.textContent;
  e.textContent=LANG==='ro'&&SHELL_RO[e.dataset.en]?SHELL_RO[e.dataset.en]:e.dataset.en;});}
function i18nDom(){document.documentElement.lang=LANG;i18nShell();document.querySelectorAll('[data-t]').forEach(e=>e.textContent=T(e.dataset.t));
  document.querySelector('#title .t1').textContent=T('title');document.querySelector('#title .t2').textContent=T('sub');
  document.querySelector('#sideBody .fn').textContent=T('title');document.querySelector('#sideBody .fn-sub').textContent=T('sub');document.querySelector('#rail .vtxt').textContent=T('title');
  $('hint').textContent=T('hint');$('progSel').options[0].textContent=T('choose');
  document.querySelectorAll('[data-lang]').forEach(b=>b.classList.toggle('on',b.dataset.lang===LANG));}
function setLang(l){LANG=l;try{localStorage.setItem('smt-lang',l);}catch(e){}i18nDom();if(!started)rebuild();else{ui(true);}}
function setupDom(){const act=SET.active,lock=started;
  $('setAct').checked=act;$('setAct').disabled=lock;$('setFields').classList.toggle('off',!act||lock);
  document.querySelectorAll('[data-side]').forEach(b=>b.classList.toggle('on',(act?SET.side:null)===b.dataset.side));
  document.querySelectorAll('[data-w]').forEach(b=>b.classList.toggle('on',(act?SET.magW:null)===+b.dataset.w));
  document.querySelectorAll('[data-p]').forEach(b=>b.classList.toggle('on',(act?SET.pitch:null)===+b.dataset.p));
  $('progSel').value=act?(SET.prog||''):'';
  const e=eff();$('cntIn').max=3*e.use;$('capIn').max=e.use;$('cntIn').value=act?Math.min(SET.count,3*e.use):e.count;$('capIn').value=act?Math.min(SET.cap,e.use):e.cap;
  $('wOut').textContent=(e.magW-8)+' mm';$('fOut').textContent=e.side==='BOT'?T('flip'):T('bypass');$('useOut').textContent=e.use+' '+T('slots');
  $('setNote').textContent=lock?T('locked'):!act?T('setOff'):!setupValid()?T('need'):'';
  ['setFields'].forEach(id=>$(id).querySelectorAll('button,select,input').forEach(x=>x.disabled=!act||lock));}
function changed(){if(started)return;const e=eff();SET.count=Math.min(SET.count,3*e.use);SET.cap=Math.min(SET.cap,e.use);rebuild();}
$('setAct').onchange=()=>{SET.active=$('setAct').checked;changed();};
document.querySelectorAll('[data-side]').forEach(b=>b.onclick=()=>{SET.side=b.dataset.side;changed();});
document.querySelectorAll('[data-w]').forEach(b=>b.onclick=()=>{SET.magW=+b.dataset.w;changed();});
document.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{SET.pitch=+b.dataset.p;changed();});
$('progSel').onchange=()=>{SET.prog=$('progSel').value||null;changed();};
$('cntIn').onchange=()=>{SET.count=Math.max(1,+$('cntIn').value||1);changed();};
$('capIn').onchange=()=>{SET.cap=Math.max(1,+$('capIn').value||1);changed();};
document.querySelectorAll('[data-lang]').forEach(b=>b.onclick=()=>setLang(b.dataset.lang));
$('bStart').onclick=start;
$('bPause').onclick=()=>{if(!started||stopped)return;userPause=!userPause;ui(true);};
$('bStop').onclick=()=>{if(!started)return;stopped=true;userPause=false;ui(true);};
$('bReset').onclick=()=>rebuild();
$('bMark').onclick=markPanel;$('bRepl').onclick=replaceMags;
$('jPass').onclick=()=>decide(true);$('jFail').onclick=()=>decide(false);
$('dClose').onclick=()=>$('done').classList.remove('show');
document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-s]').forEach(x=>x.classList.remove('on'));b.classList.add('on');speed=+b.dataset.s;});
$('bHood').onclick=()=>setHoods(hoodsOpen?0:1);
$('bXray').onclick=()=>{xray=!xray;applyXray();ui(true);};
$('bLab').onclick=()=>{showTags=!showTags;if(!showTags)tags.forEach(t=>t.el.style.display='none');ui(true);};
let tween=null,follow=null;
function flyTo(p,t,dur=1.2){tween={p0:camera.position.clone(),t0:controls.target.clone(),p1:new THREE.Vector3(...p),t1:new THREE.Vector3(...t),t:0,dur};follow=null;}
const views={over:()=>flyTo([400,4300,8600],[0,700,-200]),
  loader:()=>{const m=LOADER_;setHoods(1);flyTo([m.cx-1300,2300,2300],[m.cx,1000,-350]);},
  aoi:()=>{const m=AOI_;setHoods(1);flyTo([m.cx+650,1950,1650],[m.cx,960,120]);},
  unloader:()=>{const m=UNL;setHoods(1);flyTo([m.cx+1300,2300,2300],[m.cx,1000,-350]);},
  follow:()=>{setHoods(1);const b=boards.filter(b=>b.alive&&!b.inMag).sort((a,c)=>c.x-a.x)[0];if(b){flyTo([b.x-350,CONV_Y+450,b.z+720],[b.x,CONV_Y,b.z],.9);follow={b};}},
  top:()=>{setHoods(1);flyTo([0,9000,10],[0,900,0]);}};
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-v]').forEach(x=>x.classList.remove('on'));b.classList.add('on');views[b.dataset.v]();});
controls.addEventListener('start',()=>{tween=null;});
/* click a hood to open / close it */
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let downAt=null;
function hitHood(e){SMT.ndc(e,mouse);ray.setFromCamera(mouse,camera);const hs=[];MACH.forEach(m=>m.hoods.forEach(h=>hs.push(h)));
  const hit=ray.intersectObjects(hs.map(h=>h.p),true)[0];if(!hit)return null;for(let o=hit.object;o;o=o.parent){const h=hs.find(h=>h.p===o);if(h)return h;}return null;}
canvas.addEventListener('pointerdown',e=>{downAt=[e.clientX,e.clientY];});
canvas.addEventListener('pointerup',e=>{if(!downAt||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>5)return;const h=hitHood(e);if(h)h.target=h.target?0:1;});
canvas.addEventListener('pointermove',e=>{if(e.buttons)return;canvas.style.cursor=hitHood(e)?'pointer':'';});

const pillCls=k=>/s_wait|s_idle|s_empty/.test(k)?'idle':/s_full|s_judge/.test(k)?'ng':/s_swap|s_sensor/.test(k)?'cl':'';
let _uiKey='';
function ui(force){
  const ls=lineState();
  const bar=(id,v,max)=>{$(id).style.width=(max?Math.min(100,v/max*100):0)+'%';};
  // buttons
  $('bStart').disabled=(started&&!stopped)||runDone||!setupValid();$('bPause').disabled=!started||stopped||runDone;$('bStop').disabled=!started||stopped||runDone;
  $('bPause').textContent=T(userPause?'RESUME':'PAUSE');$('bPause').classList.toggle('on',userPause);
  $('bMark').disabled=!(started&&AOI_.cur&&AOI_.canMark&&!hold&&!userPause&&!stopped);$('bRepl').disabled=hold!=='full'||!!svc.length;
  $('bHood').textContent=T(hoodsOpen?'close':'covers');$('bHood').classList.toggle('on',!!hoodsOpen);$('bXray').classList.toggle('on',xray);$('bLab').classList.toggle('on',showTags);
  // status
  $('lineSt').textContent=T(ls);$('lineSt').className='pill '+(ls==='st_run'?'ok':ls==='st_ready'||ls==='st_done'?'idle':ls==='st_pause'||ls==='st_judge'?'cl':'ng');
  $('setLine').textContent=E.side+' · '+(E.side==='BOT'?T('flip'):T('bypass'))+' · '+E.prog+' · '+E.magW+' mm · '+T('pw')+' '+E.pitch+' · '+T('cp')+' '+E.cap;
  $('stList').innerHTML=LINE.map(m=>'<div class="row"><span>'+m.name+'</span><span class="pill '+pillCls(m.st)+'">'+T(m.st)+'</span></div>').join('');
  const left=LOADER_.mags.reduce((s,g)=>s+magCount(g),0);
  [['cLoad',CNT.loaded+' / '+CNT.total],['cIns',CNT.inspected],['cGood',CNT.good],['cBad',CNT.bad],['cJudge',CNT.judged],['cLeft',left]].forEach(([id,v])=>$(id).textContent=v);
  UNL.mags.forEach((g,i)=>{const n=magCount(g);$('m'+(i+1)+'n').textContent=n+' / '+E.cap;bar('m'+(i+1)+'b',n,E.cap);});
  // cycle time
  const o=UNL.outT.slice(-6),iv=[];for(let i=1;i<o.length;i++)iv.push(o[i]-o[i-1]);const avg=iv.length?iv.reduce((a,b)=>a+b,0)/iv.length:0;const pt=UNL.procT.length?UNL.procT[UNL.procT.length-1]:0;
  SMT.cycle(avg?avg.toFixed(1)+' s':'—',avg?T('cyc1',{n:Math.round(3600/avg),t:pt.toFixed(1)}):(started?T('cyc0'):T('st_ready')),T('cycK'));
  if(force)setupDom();
}

/* ---------- 12. main loop ---------- */
function resize(){const [w,h]=SMT.size();if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
new ResizeObserver(resize).observe(SMT.stage());resize();
renderer.shadowMap.autoUpdate=false;
const clock=new THREE.Clock();let uiT=0;const _p=new THREE.Vector3();
function stepSim(dt){
  const n=Math.max(1,Math.ceil(dt/.03));
  for(let i=0;i<n;i++){const d=dt/n;if(started&&!hold){simTime+=d;for(let k=0;k<cos.length;k++)cos[k].step(d);}for(let k=0;k<svc.length;k++)svc[k].step(d);}
  cos=cos.filter(c=>!c.done);svc=svc.filter(c=>!c.done);}
function frame(){
  requestAnimationFrame(frame);
  const rdt=Math.min(clock.getDelta(),.05),frozen=userPause||stopped,dt=frozen?0:(window.__step!==undefined?window.__step:rdt*speed);
  if(dt>0){stepSim(dt);if(moving>0&&!hold){beltTex.offset.x-=dt*V/16;if(AOI_.A)AOI_.A.lanes[0].beltTex.offset.x-=dt*V/20;}}
  // equipment poses
  magBoardsUpdate(LOADER_);magBoardsUpdate(UNL);
  [FLIP1,FLIP2].forEach(m=>m.rot[0].rotation.x=m.ang);
  SCANR.heads[0].emissiveIntensity=SCANR.read[0]?2.5:.1;SCANR.fans[0].visible=!!SCANR.read[0];
  {const A=AOI_.A,fx=AOI_.fx,p=fx.power;A.head.position.set(AOI_.gx,0,AOI_.gz);A.beam.position.z=AOI_.gz-133;
   if(fx.moire>=0&&dt>0)A.stripeTex.offset.x+=dt*7;
   A.flashSpot.intensity=fx.moire>=0?0:p*2.4;A.flashSpot.color.copy(fx.color);A.glowSprite.material.opacity=p*.5;A.glowSprite.material.color.copy(fx.color);
   A.fovGlow.material.opacity=fx.moire<0?p*.1:0;A.fovGlow.material.color.copy(fx.color);
   A.rings.forEach((m,i)=>m.emissiveIntensity=(p>0&&(fx.ring===i||fx.ring===9))?2.4:.04);
   for(let i=0;i<4;i++){A.projLens[i].emissiveIntensity=fx.moire===i?2.5:0;A.projBeams[i].visible=fx.moire===i;}
   A.fovStripe.visible=fx.moire>=0;if(fx.moire>=0)A.stripeTex.rotation=fx.moire*PI/2;A.head.userData.frame.material.opacity=AOI_.cur?.9:.25;}
  // lamps: green running · yellow paused / waiting for the operator · red stopped / magazine full
  const ls=lineState(),G=ls==='st_run',Y=ls==='st_pause'||ls==='st_judge'||ls==='st_ready'||ls==='st_done',R=ls==='st_stop'||ls==='st_full',blink=(performance.now()%700)<350;
  MACH.forEach(m=>{m.hoods.forEach(h=>{h.open+=(h.target-h.open)*Math.min(1,rdt*3);h.p.rotation.x=h.ang*h.open;});
    if(m.lamps){m.lamps.g.emissiveIntensity=G?1.8:.05;m.lamps.y.emissiveIntensity=Y&&(ls!=='st_judge'||blink)?1.8:.05;m.lamps.r.emissiveIntensity=R&&blink?1.8:.05;}});
  boards.forEach(b=>{if(!b.alive)return;b.g.position.set(b.x,CONV_Y+BT/2*PSCALE+b.dy,b.z);b.piv.rotation.x=b.flip;});
  if(tween){tween.t+=rdt;const k=ease(Math.min(1,tween.t/tween.dur));camera.position.lerpVectors(tween.p0,tween.p1,k);controls.target.lerpVectors(tween.t0,tween.t1,k);if(k>=1)tween=null;}
  if(follow&&!tween){if(!follow.b.alive||follow.b.inMag)follow=null;else{_p.set(follow.b.x,CONV_Y,follow.b.z).sub(controls.target);camera.position.add(_p);controls.target.add(_p);}}
  controls.update();const dist=camera.position.distanceTo(controls.target);camera.near=Math.max(1.5,Math.min(10,dist*.03));camera.updateProjectionMatrix();
  const [W,H]=SMT.size();renderer.setViewport(0,0,W,H);renderer.clear();renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
  if(showTags)tags.forEach(t=>{_p.copy(t.v);t.m.g.localToWorld(_p);_p.project(camera);const vis=_p.z<1&&Math.abs(_p.x)<1&&Math.abs(_p.y)<1;t.el.style.display=vis?'block':'none';if(vis){t.el.style.left=((_p.x+1)/2*W)+'px';t.el.style.top=((1-_p.y)/2*H)+'px';}});
  uiT+=rdt;if(uiT>.15){uiT=0;ui(false);}
  if(AOI_.A&&(AOI_._mt=(AOI_._mt||0)+rdt)>.4){AOI_._mt=0;drawAoiMonitor();}
}
function drawAoiMonitor(){const g=AOI_.A.monCtx,W=640,H=400;if(!g)return;g.fillStyle='#0b1220';g.fillRect(0,0,W,H);
  g.fillStyle='#1557b8';g.fillRect(0,0,W,40);g.fillStyle='#fff';g.font='700 20px Arial';g.textAlign='left';g.textBaseline='middle';g.fillText('AOI · '+E.prog+' · '+E.side,14,21);
  const b=AOI_.cur;g.font='600 26px Arial';g.fillStyle='#dfe8f5';g.fillText(b?b.id:'—',20,90);
  g.font='800 54px Arial';g.fillStyle=b&&b.judged?(b.result==='BAD'?'#ff4d5a':'#3ddc84'):'#9fb4cf';g.fillText(b?(b.judged?T(b.result):T('s_insp')):T('s_wait'),20,160);
  g.font='500 18px Arial';g.fillStyle='#8fa3bd';g.fillText(T('c_ins')+' '+CNT.inspected+'   '+T('c_good')+' '+CNT.good+'   '+T('c_bad')+' '+CNT.bad,20,360);AOI_.A.monTex.needsUpdate=true;}
camera.position.set(400,4300,8600);controls.target.set(0,700,-200);controls.maxDistance=20000;
window.__sim={get E(){return E;},SET,CNT,RECORDS,get LINE(){return LINE;},get started(){return started;},get hold(){return hold;},get state(){return lineState();},
  endTween:()=>{if(tween)tween.t=tween.dur;},start,rebuild,markPanel,decide,replaceMags,setLang,views,setHoods,
  ff:s=>{const n=Math.round(s/.02);for(let i=0;i<n;i++)stepSim(.02);},
  pause:()=>{userPause=!userPause;},stop:()=>{stopped=true;},magCount:i=>magCount(UNL.mags[i])};
i18nDom();rebuild();
frame();
