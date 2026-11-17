
/* ===================================================================
   RUNTIME — boards, inspection sequence, effects, UI
   =================================================================== */
const DEF={chip:['MISSING','SHIFT','TOMBSTONE','ROTATED'],ic:['SHIFT','MISSING','LIFTED LEAD'],ecap:['POLARITY','MISSING'],tant:['POLARITY','SHIFT'],led:['MISSING','POLARITY']};
const NC=5,NR=4,SX=(BW-FOV_W)/(NC-1),SZ=(BD-FOV_D)/(NR-1),FOVS=[];for(let r=0;r<NR;r++)for(let c=0;c<NC;c++){const cc=r%2?NC-1-c:c;FOVS.push({x:-BW/2+FOV_W/2+cc*SX,z:-BD/2+FOV_D/2+r*SZ,c:cc,r});}
const redMat=new THREE.MeshBasicMaterial({color:0xff2030,toneMapped:false});
const tileOk=new THREE.MeshBasicMaterial({color:0x30ff80,transparent:true,opacity:.13,depthWrite:false});
const tileNg=new THREE.MeshBasicMaterial({color:0xff3040,transparent:true,opacity:.2,depthWrite:false});
let serial=4200;
function makeBoard(L,x){
  const g=new THREE.Group();
  board.static.children.forEach(m=>{const c=new THREE.Mesh(m.geometry,m.material);c.position.copy(m.position);c.receiveShadow=true;c.castShadow=m.castShadow;g.add(c);});
  const b={g,lane:L,x,defects:[],done:false,clamped:false,sn:++serial,ng:false};
  const R=Math.random,r=R(),nd=r<.6?0:(r<.9?1:2),idx=[];
  while(idx.length<nd){const k=Math.floor(R()*board.cands.length);if(!idx.includes(k))idx.push(k);}
  board.cands.forEach((c,k)=>{
    const o=c.group.clone();
    if(idx.includes(k)){const dl=DEF[c.kind],t=dl[Math.floor(R()*dl.length)];
      if(t=='MISSING')o.visible=false;
      else if(t=='SHIFT'){const s=Math.min(1.6,Math.max(.45,.3*Math.min(c.w,c.d)));o.position.x+=s*(R()<.5?-1:1);o.position.z+=s*.7;o.rotation.y+=.2;}
      else if(t=='TOMBSTONE'){o.rotation.z=1.05;o.position.y+=c.len/2*Math.sin(1.05)-.05;}
      else if(t=='ROTATED')o.rotation.y+=.62;
      else if(t=='POLARITY')o.rotation.y+=PI;
      else if(t=='LIFTED LEAD'){o.rotation.x=.1;o.position.y+=.32;}
      b.defects.push({name:c.name,type:t,x:c.x,z:c.z,s:Math.max(c.w,c.d)+2.2,h:c.h,found:false});}
    g.add(o);});
  g.position.set(x,CONV_Y,L.z);interior.add(g);return b;
}
function addMarker(b,d){
  const s=d.s,t=Math.max(.35,s*.06),y=BT+Math.min(d.h,3)+.6,g=new THREE.Group();
  [[0,-s/2,s+t,t],[0,s/2,s+t,t],[-s/2,0,t,s],[s/2,0,t,s]].forEach(a=>{const m=new THREE.Mesh(new THREE.BoxGeometry(a[2],.25,a[3]),redMat);m.position.set(a[0],0,a[1]);m.layers.set(1);g.add(m);});
  g.position.set(d.x,y,d.z);b.g.add(g);d.marker=g;
}
function addTile(b,f,ng){const m=new THREE.Mesh(FLAT(+(SX-1).toFixed(2),+(SZ-1).toFixed(2)),ng?tileNg:tileOk);m.position.set(f.x,BT+.22,f.z);m.layers.set(1);b.g.add(m);}

/* ---------- tiny coroutine scheduler ---------- */
const FRAME=-1,cos=[];
class Co{constructor(g){this.g=g;this.wait=0;this.done=false;}
  step(dt){if(this.done)return;this.wait-=dt;let pass=dt,guard=0;
    while(this.wait<=0&&guard++<64){const r=this.g.next(pass);pass=0;if(r.done){this.done=true;return;}if(r.value===FRAME){this.wait=1e-9;return;}this.wait+=r.value;}}}
function run(g){const c=new Co(g);cos.push(c);return c;}

/* ---------- state ---------- */
const stats={ins:0,ok:0,ng:0,ct:0};
const cur={lane:null,sn:0,fov:0,tiles:new Array(FOVS.length).fill(0),active:-1,result:'',defs:[]};
const fx={color:new THREE.Color(1,1,1),ring:-1,moire:-1,power:0,label:'—'};
let simTime=0,speed=1,paused=false,headState='IDLE',lastNgAt=-99;
const logEl=$('log');
function addLog(t,cls){const d=document.createElement('div');d.textContent=t;if(cls)d.className=cls;logEl.prepend(d);while(logEl.children.length>8)logEl.lastChild.remove();}
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;

const BELT_V=330;
function* conveyTo(b,x,L){L.moving++;while(b.x<x){const dt=yield FRAME;b.x=Math.min(x,b.x+BELT_V*dt);b.g.position.x=b.x;}L.moving--;}
function* exitScript(b,L){yield* conveyTo(b,1160,L);interior.remove(b.g);}
function* laneScript(L,delay){
  yield delay;
  let b=makeBoard(L,-1160);
  while(true){
    L.state='LOADING';L.stopUp=true;
    yield* conveyTo(b,0,L);
    L.state='CLAMPING';yield .35;b.clamped=true;L.board=b;L.state='WAITING';
    const nb=makeBoard(L,-1160),pre=run(conveyTo(nb,-770,L));
    while(!b.done)yield FRAME;
    L.board=null;L.state=b.ng?'UNLOAD · NG':'UNLOAD · OK';L.stopUp=false;yield .3;
    run(exitScript(b,L));
    while(b.x<330||!pre.done)yield FRAME;
    b=nb;
  }
}
function* moveHead(x,z){
  const x0=gantry.x,z0=gantry.z,d=Math.hypot(x-x0,z-z0),T=Math.max(.1,d/1100+.07);let t=0;
  while(t<T){t+=yield FRAME;const k=ease(Math.min(1,t/T));gantry.x=x0+(x-x0)*k;gantry.z=z0+(z-z0)*k;}
}
const PH2D=[['WHITE COAX',0xffffff,0],['RED RING',0xff4a4a,1],['GREEN RING',0x4aff7a,2],['BLUE RING',0x5a8aff,3],['SIDE CAMS ×4',0xfff0cc,9]];
function* capture(){
  for(const p of PH2D){fx.label='2D · '+p[0];fx.color.setHex(p[1]);fx.ring=p[2];fx.moire=-1;fx.power=1;yield .05;fx.power=0;yield .018;}
  for(let k=0;k<4;k++){fx.label='3D MOIRÉ · '+(k*90)+'°';fx.color.setHex(0xbfe0ff);fx.ring=-1;fx.moire=k;fx.power=.5;yield .1;}
  fx.moire=-1;fx.power=0;fx.label='ANALYSING';
}
function* inspect(L,b){
  const t0=simTime;headState='ALIGN';L.state='INSPECTING';
  Object.assign(cur,{lane:L,sn:b.sn,fov:0,active:-1,result:'',defs:[]});cur.tiles.fill(0);
  for(const f of FIDS.slice(0,2)){yield* moveHead(f.x,L.z+f.z);fx.label='FIDUCIAL MARK';fx.color.setHex(0xffffff);fx.ring=0;fx.power=1;yield .09;fx.power=0;yield .05;}
  headState='SCAN';
  for(let i=0;i<FOVS.length;i++){
    const f=FOVS[i];cur.active=i;
    yield* moveHead(f.x,L.z+f.z);yield .025;
    yield* capture();
    let ng=false;
    b.defects.forEach(d=>{if(!d.found&&Math.abs(d.x-f.x)<=FOV_W/2&&Math.abs(d.z-f.z)<=FOV_D/2){d.found=true;ng=true;addMarker(b,d);cur.defs.push(d.name+' '+d.type);addLog('L'+(L.i+1)+' #'+b.sn+'  '+d.name+'  '+d.type,'ng');lastNgAt=simTime;}});
    addTile(b,f,ng);cur.tiles[i]=ng?2:1;cur.fov=i+1;
  }
  cur.active=-1;fx.label='—';
  b.ng=b.defects.length>0;b.done=true;
  stats.ins++;b.ng?stats.ng++:stats.ok++;stats.ct=simTime-t0;cur.result=b.ng?'NG':'OK';
  if(!b.ng)addLog('L'+(L.i+1)+' #'+b.sn+'  PASS  '+stats.ct.toFixed(1)+' s','ok');
}
function* headScript(){
  let turn=0;
  while(true){
    let L=null;
    for(let i=0;i<2;i++){const c=lanes[(turn+i)%2];if(c.board&&c.board.clamped&&!c.board.done){L=c;turn=(turn+i+1)%2;break;}}
    if(!L){headState='IDLE';yield FRAME;continue;}
    yield* inspect(L,L.board);
  }
}
run(laneScript(lanes[0],.2));run(laneScript(lanes[1],7));run(headScript());

/* ---------- inset cameras (what the AOI "sees") ---------- */
const insetCam=new THREE.OrthographicCamera(-FOV_W/2*255/253,FOV_W/2*255/253,FOV_D/2,-FOV_D/2,.5,70);
insetCam.up.set(0,0,-1);insetCam.layers.enable(2);
const insetCamH=insetCam.clone();insetCamH.layers.set(0);
const heightMat=new THREE.ShaderMaterial({
  uniforms:{base:{value:CONV_Y+BT},range:{value:6}},
  vertexShader:'varying float vh;varying vec3 vn;void main(){vec4 w=modelMatrix*vec4(position,1.);vh=w.y;vn=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader:'uniform float base;uniform float range;varying float vh;varying vec3 vn;\nvec3 jet(float t){return clamp(vec3(1.5-abs(4.*t-3.),1.5-abs(4.*t-2.),1.5-abs(4.*t-1.)),0.,1.);}\nvoid main(){float t=clamp((vh-base)/range,0.,1.);t=pow(t,.55);vec3 c=mix(vec3(.02,.05,.35),jet(t),step(.001,t));float s=.7+.3*abs(normalize(vn).y);gl_FragColor=vec4(c*s,1.);}'
});

/* ---------- labels ---------- */
const tags=[];
function tag(text,obj,x,y,z){const el=document.createElement('div');el.className='tag';el.textContent=text;$('tags').appendChild(el);tags.push({el,obj,v:new THREE.Vector3(x,y,z)});}
tag('15 MP top camera + telecentric lens',head,0,1322,0);
tag('Moiré 3D projector (×4)',head,158,1100,0);
tag('Side-view camera (×4)',head,-106,1085,106);
tag('Multi-colour LED light dome',head,0,960,118);
tag('Linear-motor X beam',beam,-380,1380,0);
tag('Lane 1 — front',interior,-720,925,170);
tag('Lane 2 — rear',interior,-720,925,-170);
tag('Lift-up hood — click to open',machine,-30,1500,760);tag('Electrical bay — click doors',machine,-30,560,760);tag('Operator monitor',machine,-700,1590,840);
tag('Signal tower',machine,520,1930,-260);
let showTags=false;

/* ---------- UI ---------- */
let follow=false,tween=null;const lastHead=new THREE.Vector3();
function flyTo(p,t,dur=1.2){tween={p0:camera.position.clone(),t0:controls.target.clone(),p1:new THREE.Vector3(...p),t1:new THREE.Vector3(...t),t:0,dur};}
function setHood(o){hood.target=o?1:0;$('bHood').textContent=o?'Close hood':'Open hood';$('bHood').classList.toggle('on',!!o);}
const views={
  over:()=>{follow=false;flyTo([2450,1950,3300],[0,880,0]);},
  inside:()=>{follow=false;setHood(1);flyTo([260,1900,1850],[0,930,40]);},
  follow:()=>{setHood(1);const t=[gantry.x,935,gantry.z];flyTo([t[0]+330,t[1]+330,t[2]+560],t,.9);follow='pending';},
  board:()=>{follow=false;const z=LANE_Z[0];flyTo([-10,1010,z+215],[-45,902,z+15]);},
  top:()=>{follow=false;setHood(1);flyTo([0,3900,5],[0,900,0]);}
};
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-v]').forEach(x=>x.classList.remove('on'));b.classList.add('on');views[b.dataset.v]();});
document.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-s]').forEach(x=>x.classList.remove('on'));b.classList.add('on');speed=+b.dataset.s;});
$('bHood').onclick=()=>setHood(!hood.target);
let xray=false;
$('bXray').onclick=()=>{xray=!xray;$('bXray').classList.toggle('on',xray);shellMats.forEach(m=>{m.transparent=xray;m.opacity=xray?.1:1;m.depthWrite=!xray;m.needsUpdate=true;});glassMat.opacity=xray?.12:.74;};
$('bLab').onclick=()=>{showTags=!showTags;$('bLab').classList.toggle('on',showTags);if(!showTags)tags.forEach(t=>t.el.style.display='none');};
$('bPause').onclick=()=>{paused=!paused;$('bPause').textContent=paused?'Resume':'Pause';$('bPause').classList.toggle('on',paused);};
$('specBtn').onclick=()=>{const s=$('spec'),o=s.style.display!='block';s.style.display=o?'block':'none';$('specBtn').textContent=(o?'▾':'▸')+' Machine specifications';};
controls.addEventListener('start',()=>{tween=null;});
/* click the hood / doors directly */
const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let downAt=null;
function hitPart(e){mouse.set(e.clientX/window.innerWidth*2-1,-(e.clientY/window.innerHeight)*2+1);ray.setFromCamera(mouse,camera);
  const h=ray.intersectObjects([hoodPivot,doors[0].g,doors[1].g],true)[0];if(!h)return null;
  for(let o=h.object;o;o=o.parent){if(o===hoodPivot)return'hood';if(o===doors[0].g)return 0;if(o===doors[1].g)return 1;}return null;}
canvas.addEventListener('pointerdown',e=>{downAt=[e.clientX,e.clientY];});
canvas.addEventListener('pointerup',e=>{if(!downAt||Math.hypot(e.clientX-downAt[0],e.clientY-downAt[1])>5)return;const h=hitPart(e);if(h==='hood')setHood(!hood.target);else if(h!==null)doors[h].target=doors[h].target?0:1;});
canvas.addEventListener('pointermove',e=>{if(e.buttons)return;canvas.style.cursor=hitPart(e)!==null?'pointer':'';});

function pill(el,t){el.textContent=t;el.className='pill '+(/· NG/.test(t)?'ng':/· OK/.test(t)?'ok':/—|IDLE|WAITING/.test(t)?'idle':'');}
function updateHud(){
  pill($('hState'),headState);$('phase').textContent=fx.label;
  $('fov').textContent=cur.fov+' / '+FOVS.length+(cur.lane?'  · L'+(cur.lane.i+1):'');$('fovBar').style.width=(cur.fov/FOVS.length*100)+'%';
  pill($('l1'),lanes[0].state);pill($('l2'),lanes[1].state);
  $('nIns').textContent=stats.ins;$('nOk').textContent=stats.ok;$('nNg').textContent=stats.ng;
  $('yld').textContent=stats.ins?(stats.ok/stats.ins*100).toFixed(0)+' %':'—';
  $('ct').textContent=stats.ct?stats.ct.toFixed(1)+' s':'—';
  $('insL').textContent=fx.power>0||fx.moire>=0?fx.label:'LIVE';$('insR').textContent=fx.moire>=0?'ACQUIRING':'Z 0 – 6 mm';
  $('rec').style.opacity=(fx.power>0)?1:.25;
}
function drawMon(){
  const g=monCtx,W=640,H=400;g.fillStyle='#0b1220';g.fillRect(0,0,W,H);
  g.fillStyle='#1557b8';g.fillRect(0,0,W,40);g.fillStyle='#fff';g.font='700 20px Arial';g.textAlign='left';g.textBaseline='middle';g.fillText('MIRTEC  MV-9DL  ·  3D AOI',14,21);
  g.font='500 14px Arial';g.textAlign='right';g.fillText(paused?'PAUSED':'AUTO RUN',W-14,21);g.textAlign='left';
  const mx=18,my=58,mw=350,mh=280;g.fillStyle='#0f5a31';g.fillRect(mx,my,mw,mh);
  FOVS.forEach((f,i)=>{const x=mx+f.c*mw/NC,y=my+f.r*mh/NR,s=cur.tiles[i];
    if(s){g.fillStyle=s==2?'rgba(255,60,70,.55)':'rgba(60,230,130,.35)';g.fillRect(x+2,y+2,mw/NC-4,mh/NR-4);}
    g.strokeStyle=i==cur.active?'#fff':'rgba(255,255,255,.25)';g.lineWidth=i==cur.active?3:1;g.strokeRect(x+2,y+2,mw/NC-4,mh/NR-4);});
  g.fillStyle='#8fa3bd';g.font='500 14px Arial';g.fillText('LANE',390,70);g.fillText('BOARD S/N',390,112);g.fillText('FOV',390,154);g.fillText('RESULT',390,196);
  g.fillStyle='#fff';g.font='700 20px Arial';g.fillText(cur.lane?String(cur.lane.i+1):'—',390,92);g.fillText(cur.sn?'#'+cur.sn:'—',390,134);g.fillText(cur.fov+' / '+FOVS.length,390,176);
  if(cur.result){g.fillStyle=cur.result=='OK'?'#3ddc84':'#ff4d5a';g.font='900 54px Arial';g.fillText(cur.result,390,238);}
  g.font='500 13px Consolas,monospace';g.fillStyle='#ff9aa2';cur.defs.slice(0,4).forEach((d,i)=>g.fillText(d,390,280+i*17));
  g.fillStyle='#8fa3bd';g.font='500 14px Arial';g.fillText('INSPECTED '+stats.ins+'    PASS '+stats.ok+'    NG '+stats.ng+'    '+fx.label,18,372);
  monTex.needsUpdate=true;
}

/* ---------- main loop ---------- */
function resize(){const w=window.innerWidth,h=window.innerHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
window.addEventListener('resize',resize);resize();
renderer.shadowMap.autoUpdate=false;
const clock=new THREE.Clock();let hudT=0,monT=0;const _p=new THREE.Vector3();
function frame(){
  requestAnimationFrame(frame);
  const rdt=Math.min(clock.getDelta(),.05),dt=paused?0:(window.__step!==undefined?window.__step:rdt*speed);
  if(dt>0){simTime+=dt;
    // sub-step so strobe phases stay distinct at high speed
    const n=Math.max(1,Math.ceil(dt/.02));for(let i=0;i<n;i++){for(let k=0;k<cos.length;k++)cos[k].step(dt/n);}
    for(let k=cos.length-1;k>=0;k--)if(cos[k].done)cos.splice(k,1);
    lanes.forEach(L=>{if(L.moving>0)L.beltTex.offset.x-=dt*BELT_V/20;const ty=L.stopUp?CONV_Y+3:CONV_Y-12;L.stop.position.y+=(ty-L.stop.position.y)*Math.min(1,dt*14);});
    if(fx.moire>=0)stripeTex.offset.x+=dt*7;
  }
  // gantry pose
  head.position.set(gantry.x,0,gantry.z);beam.position.z=gantry.z-133;
  // strobe / fringe effects
  const p=fx.power;
  flashSpot.intensity=fx.moire>=0?0:p*2.4;flashSpot.color.copy(fx.color);
  glowSprite.material.opacity=p*.5;glowSprite.material.color.copy(fx.color);
  fovGlow.material.opacity=fx.moire<0?p*.1:0;fovGlow.material.color.copy(fx.color);
  rings.forEach((m,i)=>m.emissiveIntensity=(p>0&&(fx.ring===i||fx.ring===9))?2.4:.04);
  for(let i=0;i<4;i++){projLens[i].emissiveIntensity=fx.moire===i?2.5:0;projBeams[i].visible=fx.moire===i;}
  fovStripe.visible=fx.moire>=0;if(fx.moire>=0)stripeTex.rotation=fx.moire*PI/2;
  head.userData.frame.material.opacity=headState=='IDLE'?.25:.9;
  // hood + tower
  hood.open+=(hood.target-hood.open)*Math.min(1,rdt*3.2);hoodPivot.rotation.x=-hood.open*1.05;doors.forEach(d=>{d.open+=(d.target-d.open)*Math.min(1,rdt*3.2);d.g.rotation.y=-d.dir*d.open*1.8;});
  const blink=(performance.now()%700)<350,recentNg=simTime-lastNgAt<3;
  tower.g.emissiveIntensity=!paused?1.6:.05;tower.y.emissiveIntensity=(paused||(recentNg&&blink))?1.8:.05;tower.r.emissiveIntensity=.05;
  // camera
  if(tween){tween.t+=rdt;const k=ease(Math.min(1,tween.t/tween.dur));camera.position.lerpVectors(tween.p0,tween.p1,k);controls.target.lerpVectors(tween.t0,tween.t1,k);if(k>=1){tween=null;if(follow=='pending'){follow=true;lastHead.set(gantry.x,0,gantry.z);}}}
  if(follow===true){_p.set(gantry.x,0,gantry.z).sub(lastHead);camera.position.add(_p);controls.target.add(_p);lastHead.set(gantry.x,0,gantry.z);}
  controls.update();
  const dist=camera.position.distanceTo(controls.target);camera.near=Math.max(1.5,Math.min(10,dist*.03));camera.updateProjectionMatrix();
  // render main view
  const W=window.innerWidth,H=window.innerHeight;
  renderer.setScissorTest(false);renderer.setViewport(0,0,W,H);renderer.clear();
  renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);
  // render what the cameras see
  if(W>900){
    insetCam.position.set(gantry.x,927,gantry.z);insetCam.lookAt(gantry.x,0,gantry.z);
    renderer.setScissorTest(true);
    renderer.setViewport(15,15,255,253);renderer.setScissor(15,15,255,253);renderer.clear();renderer.render(scene,insetCam);
    if(W>1250){insetCamH.position.copy(insetCam.position);insetCamH.quaternion.copy(insetCam.quaternion);
      scene.overrideMaterial=heightMat;renderer.setViewport(282,15,255,253);renderer.setScissor(282,15,255,253);renderer.clear();renderer.render(scene,insetCamH);scene.overrideMaterial=null;}
    renderer.setScissorTest(false);
  }
  // overlays
  if(showTags)tags.forEach(t=>{_p.copy(t.v);t.obj.localToWorld(_p);_p.project(camera);const vis=_p.z<1&&Math.abs(_p.x)<1&&Math.abs(_p.y)<1;t.el.style.display=vis?'block':'none';if(vis){t.el.style.left=((_p.x+1)/2*W)+'px';t.el.style.top=((1-_p.y)/2*H)+'px';}});
  hudT+=rdt;if(hudT>.08){hudT=0;updateHud();}
  monT+=rdt;if(monT>.25){monT=0;drawMon();}
}
window.__sim={doors,gantry,lanes,stats,cur,fx,board,views,setHood,get time(){return simTime;},setSpeed:s=>speed=s,ff:s=>{const n=Math.round(s/.01);for(let i=0;i<n;i++){simTime+=.01;for(let k=0;k<cos.length;k++)cos[k].step(.01);}}};
frame();
