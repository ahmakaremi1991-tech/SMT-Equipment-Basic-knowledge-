/* ===================================================================
   RUNTIME — stencil, boards, print cycle, UI
   =================================================================== */
const foilMats=[];
(function(){ // stainless foil with laser-cut apertures taken from the board's pad layout
  const S=10,tex=canvasTex(BW*S,BD*S,(g,W,H)=>{
    g.fillStyle='#b3b8bd';g.fillRect(0,0,W,H);
    for(let i=0;i<2600;i++){g.fillStyle='rgba('+(Math.random()<.5?'255,255,255':'60,66,72')+','+(Math.random()*.07)+')';g.fillRect(0,Math.random()*H,W,1);}
    g.fillStyle='#0b0c0e';board.pads.forEach(p=>g.fillRect((p[0]-p[2]/2+BW/2)*S,(p[1]-p[3]/2+BD/2)*S,p[2]*S,p[3]*S));
    FIDS.forEach(f=>{g.fillStyle='#4a4f55';g.beginPath();g.arc((f.x+BW/2)*S,(f.z+BD/2)*S,5,0,7);g.fill();});
    g.fillStyle='#868c92';g.font='600 22px Arial';g.fillText('EKRA  ·  MV9-TV1 REV C  ·  T = 0.13 mm  ·  TOP SIDE',(-100+BW/2)*S,(97+BD/2)*S);
    g.strokeStyle='rgba(60,66,72,.35)';g.lineWidth=2;g.strokeRect(1,1,W-2,H-2);});
  const m1=new THREE.MeshStandardMaterial({map:tex,roughness:.38,metalness:.75,side:THREE.DoubleSide,envMapIntensity:.9});
  const bt=canvasTex(256,256,(g)=>{g.fillStyle='#b3b8bd';g.fillRect(0,0,256,256);for(let i=0;i<700;i++){g.fillStyle='rgba('+(Math.random()<.5?'255,255,255':'60,66,72')+','+(Math.random()*.07)+')';g.fillRect(0,Math.random()*256,256,1);}},{repeat:true});bt.repeat.set(.004,.004);
  const m2=new THREE.MeshStandardMaterial({map:bt,roughness:.38,metalness:.75,side:THREE.DoubleSide,envMapIntensity:.9});
  foilMats.push(m1,m2);
  const c=new THREE.Mesh(FLAT(BW,BD),m1);c.position.y=.1;c.receiveShadow=true;stencil.add(c);
  const sh=new THREE.Shape();sh.moveTo(-330,-330);sh.lineTo(330,-330);sh.lineTo(330,330);sh.lineTo(-330,330);sh.closePath();
  const ho=new THREE.Path();ho.moveTo(-BW/2,-BD/2);ho.lineTo(BW/2,-BD/2);ho.lineTo(BW/2,BD/2);ho.lineTo(-BW/2,BD/2);ho.closePath();sh.holes.push(ho);
  const og=new THREE.ShapeGeometry(sh);og.rotateX(-PI/2);const o=new THREE.Mesh(og,m2);o.position.y=.1;o.receiveShadow=true;stencil.add(o);
})();
const pasteMat=std(0x8f9296,.82,.35);
let serial=4200;
function makeBoard(x){
  const g=new THREE.Group();
  board.static.children.forEach(m=>{const c=new THREE.Mesh(m.geometry,m.material);c.position.copy(m.position);c.receiveShadow=true;c.castShadow=m.castShadow;g.add(c);});
  const p=new THREE.Mesh(board.pasteGeo,pasteMat);p.visible=false;p.receiveShadow=true;g.add(p);
  g.position.set(x,CONV_Y,LZ);interior.add(g);return{g,x,paste:p,sn:++serial};
}

/* ---------- tiny coroutine scheduler ---------- */
const FRAME=-1,cos=[];
class Co{constructor(g){this.g=g;this.wait=0;this.done=false;}
  step(dt){if(this.done)return;this.wait-=dt;let pass=dt,guard=0;
    while(this.wait<=0&&guard++<64){const r=this.g.next(pass);pass=0;if(r.done){this.done=true;return;}if(r.value===FRAME){this.wait=1e-9;return;}this.wait+=r.value;}}}
function run(g){const c=new Co(g);cos.push(c);return c;}
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
function* tween(dur,fn,lin){let t=0;while(t<dur){t+=yield FRAME;const k=Math.min(1,t/dur);fn(lin?k:ease(k));}}

/* ---------- state ---------- */
const STEPS=['LOAD','CLAMP','ALIGN','LIFT','PRINT','SEPARATE','INSPECT','UNLOAD'];
const CLEAN_EVERY=4,PRINT_V=80;
const st={step:-1,name:'IDLE',sub:'—',printed:0,ct:0,sinceClean:0,cleans:0,off:null,force:0,speed:0,lift:0,clamp:0,dir:-1,down:[0,0],clz:640,clup:0,osc:false,cur:null,stopUp:true,rollZ:358,cov:0};
const camFx={c:new THREE.Color(1,1,1),p:0};
let simTime=0,speed=1,paused=false,moving=0;
const logEl=$('log');
function addLog(t,cls){const d=document.createElement('div');d.textContent=t;if(cls)d.className=cls;logEl.prepend(d);while(logEl.children.length>7)logEl.lastChild.remove();}
function setStep(i,sub){st.step=i;st.name=STEPS[i];st.sub=sub||'—';}
const BELT_V=330;
function* conveyTo(b,x){moving++;while(b.x<x){const dt=yield FRAME;b.x=Math.min(x,b.x+BELT_V*dt);b.g.position.x=b.x;}moving--;}
function* exitScript(b){yield* conveyTo(b,610);yield 1.3;yield* conveyTo(b,1180);interior.remove(b.g);}
function* camTo(x,z){const x0=cam.x,z0=cam.zb,zb=z-54,d=Math.hypot(x-x0,zb-z0);yield* tween(Math.max(.15,d/900+.08),k=>{cam.x=x0+(x-x0)*k;cam.zb=z0+(zb-z0)*k;});}
function* flash(col,dur){camFx.c.setHex(col);camFx.p=1;yield dur;camFx.p=0;yield .04;}
function* clean(){
  st.step=-1;st.name='CLEAN';st.sub='CLEANER TO STENCIL';
  yield* tween(.8,k=>st.clz=640+(372-640)*k);
  st.sub='WET WIPE · OSCILLATING';yield* tween(.15,k=>st.clup=k);st.osc=true;
  yield* tween(2.6,k=>st.clz=372+(118-372)*k,true);
  st.sub='DRY WIPE + VACUUM';yield* tween(2.2,k=>st.clz=118+(372-118)*k,true);
  st.osc=false;yield* tween(.15,k=>st.clup=1-k);st.sub='CLEANER PARK';
  yield* tween(.8,k=>st.clz=372+(640-372)*k);
  st.sinceClean=0;st.cleans++;addLog('Stencil underside cleaned (#'+st.cleans+')','cl');
}
function* main(){
  yield .3;let b=makeBoard(-1160);
  while(true){
    const t0=simTime;
    setStep(0,'BOARD TO PRINT NEST');st.stopUp=true;yield* conveyTo(b,0);
    const nb=makeBoard(-1160),pre=run(conveyTo(nb,-565));
    setStep(1,'SIDE + TOP CLAMP');st.cur=b;yield* tween(.3,k=>st.clamp=k);
    setStep(2,'EVA CAMERA');
    for(const f of [FIDS[1],FIDS[2]]){yield* camTo(f.x,LZ+f.z);st.sub='STENCIL FIDUCIAL ▲';yield* flash(0xff3020,.13);st.sub='BOARD FIDUCIAL ▼';yield* flash(0xffffff,.13);}
    st.off=[(Math.random()-.5)*90,(Math.random()-.5)*90,(Math.random()-.5)*.04];st.sub='TABLE X / Y / θ CORRECTION';
    yield* camTo(-300,-56);yield .2;
    setStep(3,'TABLE UP TO STENCIL');yield* tween(.55,k=>st.lift=k*LIFT);
    const dir=st.dir,bi=dir<0?0:1,z0=dir<0?325:150,z1=dir<0?85:390,zs=sq.z;
    setStep(4,dir<0?'SQUEEGEE FRONT → REAR':'SQUEEGEE REAR → FRONT');
    yield* tween(.3,k=>sq.z=zs+(z0-zs)*k);
    yield* tween(.2,k=>st.down[bi]=k);st.force=60+Math.round(Math.random()*4);st.speed=PRINT_V;
    yield* tween(Math.abs(z1-z0)/PRINT_V,k=>sq.z=z0+(z1-z0)*k,true);
    st.speed=0;yield* tween(.2,k=>st.down[bi]=1-k);st.force=0;st.dir=-dir;
    setStep(5,'SLOW SNAP-OFF');b.paste.visible=true;
    yield* tween(.5,k=>st.lift=LIFT-3*k,true);yield* tween(.45,k=>st.lift=(LIFT-3)*(1-k));
    setStep(6,'2D PASTE INSPECTION');
    for(const s of [[-65,40],[-5,-50]]){yield* camTo(s[0],LZ+s[1]);yield* flash(0xffffff,.14);}
    st.cov=96+Math.random()*3.5;st.sub='COVERAGE '+st.cov.toFixed(1)+' %  OK';
    yield* camTo(-300,-56);
    setStep(7,'RELEASE + TRANSFER');yield* tween(.25,k=>st.clamp=1-k);st.cur=null;st.stopUp=false;
    st.printed++;st.sinceClean++;st.ct=simTime-t0;
    addLog('#'+b.sn+'  printed  '+st.ct.toFixed(1)+' s  ·  '+st.cov.toFixed(1)+' %','ok');
    const ex=run(exitScript(b));
    if(st.sinceClean>=CLEAN_EVERY){while(b.x<200)yield FRAME;yield* clean();}
    while(b.x<330||!pre.done)yield FRAME;
    b=nb;
  }
}
run(main());

/* ---------- inset: what the EVA camera sees (looking down at the board) ---------- */
const insetCam=new THREE.OrthographicCamera(-15*255/253,15*255/253,15,-15,.5,70);insetCam.up.set(0,0,-1);

/* ---------- labels ---------- */
const tags=[];
function tag(text,obj,x,y,z){const el=document.createElement('div');el.className='tag';el.textContent=text;$('tags').appendChild(el);tags.push({el,obj,v:new THREE.Vector3(x,y,z)});}
tag('Closed-loop squeegee head',sqBeam,0,STEN_Y+235,100);
tag('Stencil in 29" frame',stencil,-250,34,300);
tag('Solder paste roll',pasteRoll,0,12,0);
tag('EVA alignment camera',camHead,0,955,54);
tag('Stencil underside cleaner',cleaner,-200,960,0);
tag('Lifting print nest',nest,0,905,LZ+120);
tag('Pneumatics',interior,130,1390,-HZ+60);
tag('Hood — click to open',machine,40,1480,HZ+20);
tag('Touch screen',machine,(HX+WX1)/2+360,1560,HZ+230);
let showTags=false;

/* ---------- UI ---------- */
let tween3=null;
function flyTo(p,t,dur=1.2){tween3={p0:camera.position.clone(),t0:controls.target.clone(),p1:new THREE.Vector3(...p),t1:new THREE.Vector3(...t),t:0,dur};}
function setHood(o){hood.target=o?1:0;$('bHood').textContent=o?'Close hood':'Open hood';$('bHood').classList.toggle('on',!!o);}
let seeThru=false;
function setSten(o){seeThru=o;$('bSten').classList.toggle('on',o);foilMats.forEach(m=>{m.transparent=o;m.opacity=o?.22:1;m.depthWrite=!o;m.needsUpdate=true;});}
const views={
  over:()=>{flyTo([-2450,1950,3600],[0,880,120]);},
  inside:()=>{setHood(1);flyTo([-330,2050,2250],[0,960,250]);},
  head:()=>{setHood(1);flyTo([-520,1330,1050],[0,1010,250]);},
  nest:()=>{setHood(1);setSten(true);flyTo([-330,1130,720],[0,925,250]);},
  out:()=>{flyTo([760,1040,520],[610,902,255]);},
  top:()=>{setHood(1);flyTo([0,4300,LZ+5],[0,900,LZ]);}
};
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-v]').forEach(x=>x.classList.remove('on'));b.classList.add('on');views[b.dataset.v]();});
document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-s]').forEach(x=>x.classList.remove('on'));b.classList.add('on');speed=+b.dataset.s;});
$('bHood').onclick=()=>setHood(!hood.target);
$('bSten').onclick=()=>setSten(!seeThru);
let xray=false;
$('bXray').onclick=()=>{xray=!xray;$('bXray').classList.toggle('on',xray);shellMats.forEach(m=>{m.transparent=xray;m.opacity=xray?.1:1;m.depthWrite=!xray;m.needsUpdate=true;});};
$('bLab').onclick=()=>{showTags=!showTags;$('bLab').classList.toggle('on',showTags);if(!showTags)tags.forEach(t=>t.el.style.display='none');};
$('bPause').onclick=()=>{paused=!paused;$('bPause').textContent=paused?'Resume':'Pause';$('bPause').classList.toggle('on',paused);};
$('specBtn').onclick=()=>{const s=$('spec'),o=s.style.display!='block';s.style.display=o?'block':'none';$('specBtn').textContent=(o?'▾':'▸')+' Machine specifications';};
controls.addEventListener('start',()=>{tween3=null;});
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let downAt=null;
function hitHood(e){mouse.set(e.clientX/window.innerWidth*2-1,-(e.clientY/window.innerHeight)*2+1);ray.setFromCamera(mouse,camera);return ray.intersectObject(hoodPivot,true).length>0;}
canvas.addEventListener('pointerdown',e=>{downAt=[e.clientX,e.clientY];});
canvas.addEventListener('pointerup',e=>{if(!downAt||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>5)return;if(hitHood(e))setHood(!hood.target);});
canvas.addEventListener('pointermove',e=>{if(e.buttons)return;canvas.style.cursor=hitHood(e)?'pointer':'';});

function updateHud(){
  const hs=$('hState');hs.textContent=st.name;hs.className='pill '+(st.name=='CLEAN'?'cl':st.name=='IDLE'?'idle':'');
  $('phase').textContent=st.sub;
  $('stepN').textContent=st.step>=0?(st.step+1)+' / '+STEPS.length:'—';$('stepBar').style.width=(st.step>=0?(st.step+1)/STEPS.length*100:0)+'%';
  $('force').textContent=st.force?st.force+' N':'—';$('spd').textContent=st.speed?st.speed+' mm/s':'—';
  $('offs').textContent=st.off?(st.off[0]>=0?'+':'')+st.off[0].toFixed(0)+' / '+(st.off[1]>=0?'+':'')+st.off[1].toFixed(0)+' µm / '+(st.off[2]*1000).toFixed(0)+' m°':'—';
  $('nPr').textContent=st.printed;$('ct').textContent=st.ct?st.ct.toFixed(1)+' s':'—';
  $('sc').textContent=st.sinceClean+' / '+CLEAN_EVERY;$('ncl').textContent=st.cleans;
  $('insL').textContent=camFx.p>0?'CAPTURE':'LIVE';$('rec').style.opacity=camFx.p>0?1:.25;
}
function drawMon(){
  const g=monCtx,W=640,H=400;g.fillStyle='#14171c';g.fillRect(0,0,W,H);
  g.fillStyle='#22262d';g.fillRect(0,0,W,42);g.fillStyle='#d4006c';g.fillRect(0,42,W,4);
  g.fillStyle='#fff';g.font='700 20px Arial';g.textAlign='left';g.textBaseline='middle';g.fillText('SIMPLEX  ·  SERIO 5000',14,22);
  g.font='500 14px Arial';g.textAlign='right';g.fillText(paused?'PAUSED':'AUTOMATIC',W-14,22);g.textAlign='left';
  STEPS.forEach((s,i)=>{const y=62+i*34,on=i==st.step;g.fillStyle=on?'#d4006c':(i<st.step?'#2a4a38':'#22262d');g.fillRect(16,y,170,28);g.fillStyle=on||i<st.step?'#fff':'#8fa3bd';g.font=(on?'700 ':'500 ')+'15px Arial';g.fillText((i+1)+'  '+s,26,y+15);});
  if(st.name=='CLEAN'){g.fillStyle='#e8a020';g.fillRect(16,62+8*34-2,170,28);g.fillStyle='#111';g.font='700 15px Arial';g.fillText('STENCIL CLEAN',26,62+8*34+13);}
  const bx=214,by=64,bw=270,bh=216;g.fillStyle='#0f5a31';g.fillRect(bx,by,bw,bh);g.strokeStyle='#d9b85c';g.lineWidth=2;g.strokeRect(bx,by,bw,bh);
  g.strokeStyle='#fff';g.lineWidth=2;[FIDS[1],FIDS[2]].forEach(f=>{const x=bx+(f.x+BW/2)/BW*bw,y=by+(f.z+BD/2)/BD*bh;g.beginPath();g.moveTo(x-9,y);g.lineTo(x+9,y);g.moveTo(x,y-9);g.lineTo(x,y+9);g.stroke();});
  if(st.step==4){const z=sq.z+(st.dir<0?45:-45)-LZ,y=by+(z+BD/2)/BD*bh;if(y>by&&y<by+bh){g.fillStyle='rgba(220,225,230,.9)';g.fillRect(bx+6,y-3,bw-12,6);}}
  g.fillStyle='#8fa3bd';g.font='500 13px Arial';g.fillText('SQUEEGEE FORCE',504,76);g.fillText('PRINT SPEED',504,128);g.fillText('BOARDS',504,180);g.fillText('CYCLE',504,232);
  g.fillStyle='#fff';g.font='700 21px Arial';g.fillText(st.force?st.force+' N':'—',504,100);g.fillText(st.speed?st.speed+' mm/s':'—',504,152);g.fillText(String(st.printed),504,204);g.fillText(st.ct?st.ct.toFixed(1)+' s':'—',504,256);
  g.fillStyle='#8fa3bd';g.font='500 14px Arial';g.fillText(st.sub,214,304);
  g.fillText('PRINTS SINCE CLEAN  '+st.sinceClean+' / '+CLEAN_EVERY+'      CLEANS  '+st.cleans,214,372);
  monTex.needsUpdate=true;
}

/* ---------- main loop ---------- */
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();
renderer.shadowMap.autoUpdate=false;
camera.position.set(-2450,1950,3600);controls.target.set(0,880,120);
const clock=new THREE.Clock();let hudT=0,monT=0;const _p=new THREE.Vector3();
function frame(){
  requestAnimationFrame(frame);
  const rdt=Math.min(clock.getDelta(),.05),dt=paused?0:(window.__step!==undefined?window.__step:rdt*speed);
  if(dt>0){simTime+=dt;
    const n=Math.max(1,Math.ceil(dt/.02));for(let i=0;i<n;i++){for(let k=0;k<cos.length;k++)cos[k].step(dt/n);}
    for(let k=cos.length-1;k>=0;k--)if(cos[k].done)cos.splice(k,1);
    if(moving>0)beltTex.offset.x-=dt*BELT_V/20;
    const ty=st.stopUp?CONV_Y+3:CONV_Y-12;stopPin.position.y+=(ty-stopPin.position.y)*Math.min(1,dt*14);
  }
  // poses
  nest.position.y=st.lift;if(st.cur)st.cur.g.position.y=CONV_Y+st.lift;
  clamps.forEach(c=>c.position.z=LZ+c.userData.s*(BD/2+4-5.5*st.clamp));
  sqBeam.position.z=sq.z;blades.forEach((b,i)=>b.mv.position.y=38*(1-st.down[i]));
  if(st.down[0]>.9)st.rollZ=Math.min(st.rollZ,sq.z+33);if(st.down[1]>.9)st.rollZ=Math.max(st.rollZ,sq.z-33);
  pasteRoll.position.set(0,STEN_Y+7.4,st.rollZ);
  camBeam.position.z=cam.zb;camHead.position.x=cam.x;
  camLeds.forEach(m=>{m.emissive.copy(camFx.c);m.emissiveIntensity=camFx.p*3;});camLight.color.copy(camFx.c);camLight.intensity=camFx.p*2.2;
  cleaner.position.set(st.osc?Math.sin(simTime*42)*4:0,0,st.clz);wipeBar.position.y=st.clup*6;
  hood.open+=(hood.target-hood.open)*Math.min(1,rdt*3.2);hoodPivot.rotation.x=-hood.open*1.15;
  const blink=(performance.now()%700)<350,cl=st.name=='CLEAN';
  tower.g.emissiveIntensity=(!paused&&!cl)?1.8:.05;tower.y.emissiveIntensity=(paused||(cl&&blink))?1.8:.05;tower.r.emissiveIntensity=.05;
  // camera
  if(tween3){tween3.t+=rdt;const k=ease(Math.min(1,tween3.t/tween3.dur));camera.position.lerpVectors(tween3.p0,tween3.p1,k);controls.target.lerpVectors(tween3.t0,tween3.t1,k);if(k>=1)tween3=null;}
  controls.update();
  const dist=camera.position.distanceTo(controls.target);camera.near=Math.max(1.5,Math.min(10,dist*.03));camera.updateProjectionMatrix();
  const W=window.innerWidth,H=window.innerHeight;
  renderer.setScissorTest(false);renderer.setViewport(0,0,W,H);renderer.clear();
  renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
  if(W>900){
    insetCam.position.set(cam.x,917,cam.zb+54);insetCam.lookAt(cam.x,0,cam.zb+54);
    renderer.setScissorTest(true);renderer.setViewport(15,15,255,253);renderer.setScissor(15,15,255,253);renderer.clear();renderer.render(scene,insetCam);renderer.setScissorTest(false);
  }
  if(showTags)tags.forEach(t=>{_p.copy(t.v);t.obj.localToWorld(_p);_p.project(camera);const vis=_p.z<1&&Math.abs(_p.x)<1&&Math.abs(_p.y)<1;t.el.style.display=vis?'block':'none';if(vis){t.el.style.left=((_p.x+1)/2*W)+'px';t.el.style.top=((1-_p.y)/2*H)+'px';}});
  hudT+=rdt;if(hudT>.08){hudT=0;updateHud();}
  monT+=rdt;if(monT>.2){monT=0;drawMon();}
}
window.__sim={st,sq,cam,board,views,setHood,setSten,get time(){return simTime;},setSpeed:s=>speed=s,ff:s=>{const n=Math.round(s/.01);for(let i=0;i<n;i++){simTime+=.01;for(let k=0;k<cos.length;k++)cos[k].step(.01);}}};
frame();

