/* ===================================================================
   v2 SHIM — speed layer added to an existing machine page without
   rewriting its main loop.  Needs perf.js and the page globals
   renderer, scene, camera, controls, sun, SMT.
   - shadows: the page asks for a new shadow map every frame; the shim
     grants it at most 10× per second
   - insets (small camera views): rendered into a texture at ≤10 Hz and
     only copied to the screen in between
   - while the page is paused and nothing moves, frames are skipped
   - parts that never move are merged; identical materials are shared
   - quality Auto / High / Low, performance overlay, loading screen
   =================================================================== */
const V2={cfg:null,lastShadow:-1e9,forceShadow:true,frame:0,decided:-1,skip:false,vp:[0,0,1,1],sc:[0,0,1,1],scOn:false,
  insets:new Map(),camKey:'',sigKey:'',stats:{frames:0,skipped:0,insetRenders:0,insetBlits:0},ready:false};

/* --- frame boundaries: every requestAnimationFrame callback is one frame --- */
(function(){const raf=window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame=cb=>raf(t=>{V2.frame++;cb(t);});})();

/* --- shadows: at most 10 Hz --- */
(function(){const sm=renderer.shadowMap;let nu=false;
  Object.defineProperty(sm,'needsUpdate',{configurable:true,get(){return nu;},
    set(v){if(!v){nu=false;return;}const t=performance.now();if(V2.forceShadow||t-V2.lastShadow>=100){nu=true;V2.lastShadow=t;V2.forceShadow=false;}}});})();

/* --- remember viewport / scissor so inset views can be cached --- */
(function(){const sv=renderer.setViewport.bind(renderer),ss=renderer.setScissor.bind(renderer),st=renderer.setScissorTest.bind(renderer);
  renderer.setViewport=function(x,y,w,h){if(x&&x.isVector4)V2.vp=[x.x,x.y,x.z,x.w];else V2.vp=[x,y,w,h];return sv(x,y,w,h);};
  renderer.setScissor=function(x,y,w,h){if(x&&x.isVector4)V2.sc=[x.x,x.y,x.z,x.w];else V2.sc=[x,y,w,h];return ss(x,y,w,h);};
  renderer.setScissorTest=function(b){V2.scOn=!!b;return st(b);};})();

/* --- skip whole frames while paused and nothing changes --- */
const _v2cam=new THREE.Matrix4();
function v2Signature(){let s=0;const c=V2.cfg;if(!c)return 0;
  for(const o of c._dynList||[]){const p=o.position,r=o.rotation;s+=p.x*1.3+p.y*1.7+p.z*1.9+r.x*101+r.y*103+r.z*107+(o.visible?1:0);}return s;}
function v2Decide(){if(V2.decided===V2.frame)return V2.skip;V2.decided=V2.frame;
  const c=V2.cfg;let skip=false;
  if(c&&V2.ready&&c.paused&&c.paused()){const camKey=camera.matrixWorld.elements.join(',')+camera.fov,sig=v2Signature();
    skip=!RenderGate.dirty&&camKey===V2.camKey&&sig===V2.sigKey;V2.camKey=camKey;V2.sigKey=sig;}
  else{V2.camKey='';}
  if(skip)V2.stats.skipped++;else{V2.stats.frames++;RenderGate.dirty=false;}
  V2.skip=skip;PerfHUD.frame(0,false);return skip;}

/* --- wrapped clear / render --- */
const _v2clear=renderer.clear.bind(renderer),_v2render=renderer.render.bind(renderer);
renderer.clear=function(a,b,c){if(v2Decide())return;return _v2clear(a,b,c);};
const _v2blit=(function(){const sc=new THREE.Scene(),cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
  const mat=new THREE.MeshBasicMaterial({depthTest:false,depthWrite:false});const q=new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat);q.frustumCulled=false;sc.add(q);
  return tex=>{mat.map=tex;mat.needsUpdate=mat._t!==tex;mat._t=tex;const bg=sc.background;_v2render(sc,cam);};})();
renderer.render=function(sc,cam){
  if(v2Decide())return;
  if(cam===camera&&V2.cfg&&V2.cfg.beforeRender)V2.cfg.beforeRender();
  if(cam===camera||!V2.scOn||!V2.cfg){              // main view (or an un-scissored pass): draw as the page asked
    const t=performance.now();_v2render(sc,cam);if(cam===camera){PerfHUD.calls=renderer.info.render.calls;PerfHUD.tris=renderer.info.render.triangles;v2Fps(t);}return;}
  // inset view: refresh its cached image at most 10× per second, otherwise copy the cached image
  const key=cam.uuid+(sc.overrideMaterial?sc.overrideMaterial.uuid:''),[x,y,w,h]=V2.vp,pr=renderer.getPixelRatio();
  let I=V2.insets.get(key);const W=Math.max(1,Math.round(w*pr)),H=Math.max(1,Math.round(h*pr));
  if(!I){I={rt:new THREE.WebGLRenderTarget(W,H,{samples:0}),t:-1e9};V2.insets.set(key,I);}
  if(I.rt.width!==W||I.rt.height!==H){I.rt.setSize(W,H);I.t=-1e9;}
  const now=performance.now();
  if(now-I.t>=100||V2.forceInset){I.t=now;V2.stats.insetRenders++;
    const sm=renderer.shadowMap.autoUpdate;renderer.setRenderTarget(I.rt);renderer.setScissorTest(false);renderer.setViewport(0,0,w,h);_v2clear(true,true,true);
    _v2render(sc,cam);renderer.setRenderTarget(null);renderer.setViewport(x,y,w,h);renderer.setScissor(...V2.sc);renderer.setScissorTest(true);}
  V2.stats.insetBlits++;const ov=sc.overrideMaterial;_v2blit(I.rt.texture);};

/* --- frame rate (only while frames are drawn back to back) --- */
let _v2last=0;
function v2Fps(t){const dt=_v2last?(t-_v2last)/1000:0;_v2last=t;if(dt>0&&dt<1){PerfHUD.n++;PerfHUD.acc+=dt;Quality.sample(dt);}
  PerfHUD.t+=dt;if(PerfHUD.t>=.5&&PerfHUD.el){PerfHUD.t=0;PerfHUD.fps=PerfHUD.acc>0?PerfHUD.n/PerfHUD.acc:0;PerfHUD.n=0;PerfHUD.acc=0;
    if(PerfHUD.el.offsetParent!==null)PerfHUD.el.innerHTML='<b>'+(PerfHUD.fps?PerfHUD.fps.toFixed(0):'idle')+'</b> fps · <b>'+PerfHUD.calls+'</b> draw calls (main view) · '+(PerfHUD.tris/1000).toFixed(1)+'k triangles<br>'+
      renderer.info.programs.length+' shaders · quality '+Quality.level+(Quality.mode==='auto'?' (auto)':'')+' · build '+PerfHUD.build.toFixed(0)+' ms';}}
setInterval(()=>{if(V2.skip&&PerfHUD.el&&PerfHUD.el.offsetParent!==null&&PerfHUD.fps!==0){PerfHUD.fps=0;PerfHUD.el.innerHTML=PerfHUD.el.innerHTML.replace(/<b>[\d.]+<\/b> fps/,'<b>idle</b> fps');}},600);

/* --- setup: merge static parts, quality, overlay, loading screen ---
   cfg: {roots:[...], dyn:()=>[objects that move or toggle], keepMats:()=>[materials changed per object],
         shell:[materials of the X-ray shell], paused:()=>bool} */
function v2Init(cfg){const t0=performance.now();V2.cfg=cfg;
  // moving parts found by the probe (paths of child indices from each root) + extra ones named by the page
  const fromPaths=(cfg.paths||[]).map(p=>{let o=cfg.roots[p[0]];for(let i=1;i<p.length&&o;i++)o=o.children[p[i]];return o;}).filter(Boolean);
  if(cfg.paths&&fromPaths.length!==cfg.paths.length)console.warn('v2: '+(cfg.paths.length-fromPaths.length)+' moving parts not found');
  const dynList=fromPaths.concat((cfg.dyn?cfg.dyn():[]).filter(Boolean));cfg._dynList=dynList.filter(o=>o.isObject3D);
  const dyn=new Set(cfg._dynList),keep=new Set((cfg.keepMats?cfg.keepMats():[]).filter(Boolean));
  let a=0,b=0;
  for(const r of cfg.roots){shareMaterials(r,cfg.shell||[],keep);const q=freezeStatic(r,dyn);a+=q.before;b+=q.after;}
  V2.merge={before:a,after:b};
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  PerfHUD.init(document.getElementById('perf'));RenderGate.init();
  Quality.onChange=()=>{window.dispatchEvent(new Event('resize'));V2.forceShadow=true;V2.forceInset=true;setTimeout(()=>V2.forceInset=false,50);};
  Quality.apply(Quality.mode==='low'?'low':'high');
  document.querySelectorAll('[data-q]').forEach(btn=>btn.onclick=()=>{Quality.set(btn.dataset.q);v2qDom();});v2qDom();
  const hud=document.getElementById('hud');if(hud){const h2=hud.querySelector('h2');if(h2)h2.addEventListener('click',()=>hud.classList.toggle('open'));}
  // controls / UI / theme changes make the next frame draw again
  ['pointerdown','pointerup','wheel','keydown','click','touchstart'].forEach(e=>addEventListener(e,()=>{RenderGate.dirty=true;V2.forceShadow=true;},{passive:true}));
  PerfHUD.build=performance.now()-t0;
  requestAnimationFrame(()=>requestAnimationFrame(()=>{V2.ready=true;const L=document.getElementById('loading');if(L)L.classList.add('done');}));
  window.__v2={get stats(){return V2.stats;},get merge(){return V2.merge;},setQuality:m=>Quality.set(m),get quality(){return Quality.level;}};
}
function v2qDom(){document.querySelectorAll('[data-q]').forEach(b=>b.classList.toggle('on',b.dataset.q===Quality.mode));}
