/* ===================================================================
   PERF — reusable performance helpers for every SMT 3D page.
   freezeStatic · ShadowSched · RenderGate · Quality · PerfHUD ·
   instanceRepeat · machineLOD
   Loaded after common.js (renderer, scene, camera, sun, BGU).
   =================================================================== */

/* ---------- 1. merge parts that never move ----------
   Per parent group: sibling meshes with the same material, shadow flags,
   layers and render order become one mesh.  A group that moves keeps its
   transform — only the meshes inside it are merged — so hoods, shuttles,
   rotors and the AOI head still animate.  Objects flagged userData.keep
   (or listed in `skip`) are left untouched. */
const FROZEN=[];                                   // merged geometries (disposed on rebuild)
/* dyn: Set of groups that move (hoods, shuttles, rotors …). Every other sub-group is treated as
   rigid and flattened into the nearest moving ancestor (or the root). */
function freezeStatic(root,dyn){
  dyn=dyn||new Set();const roots=[root];let before=0,after=0;const _m=new THREE.Matrix4();
  while(roots.length){const R=roots.pop();const buckets=new Map();
    const walk=(node,M)=>{for(const c of node.children){
        if(dyn.has(c)||!c.visible){roots.push(c);continue;}
        c.updateMatrix();const CM=new THREE.Matrix4().multiplyMatrices(M,c.matrix);
        if(c.isMesh&&!c.isInstancedMesh&&!c.isSkinnedMesh&&!c.userData.keep&&!Array.isArray(c.material)){
          const g=c.geometry;before++;
          const k=c.material.uuid+'|'+c.castShadow+'|'+c.receiveShadow+'|'+c.renderOrder+'|'+c.layers.mask+'|'+!!g.index+'|'+Object.keys(g.attributes).sort().join(',')+'|'+c.frustumCulled;
          let l=buckets.get(k);if(!l)buckets.set(k,l=[]);l.push([c,CM]);}
        if(c.children.length)walk(c,CM);}};
    walk(R,_m.identity().clone());
    for(const list of buckets.values()){
      if(list.length<2||list.some(([c])=>c.children.length)){after+=list.length;continue;}
      const geos=list.map(([c,M])=>{const g=c.geometry.clone();g.applyMatrix4(M);g.clearGroups();g.morphAttributes={};return g;});
      const merged=(BGU.mergeGeometries||BGU.mergeBufferGeometries)(geos,false);geos.forEach(g=>g.dispose());
      if(!merged){after+=list.length;continue;}
      merged.computeBoundingSphere();
      const s=list[0][0],mm=new THREE.Mesh(merged,s.material);
      mm.castShadow=s.castShadow;mm.receiveShadow=s.receiveShadow;mm.renderOrder=s.renderOrder;mm.layers.mask=s.layers.mask;mm.frustumCulled=s.frustumCulled;mm.userData.frozen=true;
      list.forEach(([c])=>c.parent.remove(c));R.add(mm);FROZEN.push(merged);after++;}
  }
  return{before,after};
}
function disposeFrozen(){FROZEN.forEach(g=>g.dispose());FROZEN.length=0;}

/* ---------- 1b. share identical materials ----------
   Many parts create their own material with the same colour and finish; identical
   ones are replaced by one shared material so freezeStatic can merge them.
   Materials that are animated (emissive lamps, rings, sensors), transparent or
   textured stay untouched. */
function shareMaterials(root,shell,keep){const pool=new Map();let n=0;
  root.traverse(o=>{if(!o.isMesh||Array.isArray(o.material))return;const m=o.material;
    if(!m.isMeshStandardMaterial||m.transparent||m.map||m.emissive.getHex()!==0||m.userData.keep||(keep&&keep.has(m)))return;
    const k=[m.color.getHex(),m.roughness,m.metalness,m.envMapIntensity,m.side,m.flatShading,m.wireframe,m.depthWrite,m.polygonOffset,shell&&shell.includes(m)?'S':''].join('|');
    const q=pool.get(k);if(!q){pool.set(k,m);return;}if(q!==m){o.material=q;n++;}});return n;}

/* ---------- 2. repeated parts as one instanced mesh (feeders, feet, combs …) ---------- */
function instanceRepeat(par,geo,mat,matrices,o={}){
  const im=new THREE.InstancedMesh(geo,mat,matrices.length);matrices.forEach((m,i)=>im.setMatrixAt(i,m));
  im.instanceMatrix.needsUpdate=true;im.castShadow=o.cast!==false;im.receiveShadow=true;par.add(im);return im;}

/* ---------- 3. level of detail per machine ----------
   detail: group that is only shown when the camera is close or the covers are open.
   build: optional function that builds the detail the first time it is needed. */
const LODS=[];
function machineLOD(m,detail,o={}){const L={m,detail,near:o.near||4200,build:o.build||null,built:!o.build,needOpen:!!o.needOpen,always:o.always||null};LODS.push(L);return L;}
const _lv=new THREE.Vector3();
function updateLOD(){
  for(const L of LODS){L.m.g.getWorldPosition(_lv);const d=camera.position.distanceTo(_lv)-(L.m.L||0)/2;
    const open=L.m.hoods.some(h=>h.open>.05);let show=d<L.near||open;if(L.needOpen&&!open&&d>L.near*.6)show=false;if(L.always&&L.always())show=true;
    if(show&&!L.built){L.build(L);L.built=true;}
    if(L.detail.visible!==show){L.detail.visible=show;ShadowSched.force=true;RenderGate.dirty=true;}}}

/* ---------- 4. shadows: recalculated only when something big moves ---------- */
const ShadowSched={sig:'',t:-1,force:true,pending:false,
  update(sig,now){if(sig!==this.sig){this.sig=sig;this.pending=true;}
    if(this.force||(this.pending&&now-this.t>=.1)){renderer.shadowMap.needsUpdate=true;this.t=now;this.pending=false;this.force=false;return true;}return false;}};

/* ---------- 5. draw only when needed ---------- */
const RenderGate={dirty:true,frames:0,skipped:0,
  init(){const d=()=>{this.dirty=true;};controls.addEventListener('change',d);addEventListener('resize',d);
    ['pointerdown','pointerup','wheel','keydown','click','touchstart'].forEach(e=>addEventListener(e,d,{passive:true}));
    document.addEventListener('visibilitychange',d);SMT.onTheme(()=>{this.dirty=true;ShadowSched.force=true;});}};

/* ---------- 6. adaptive quality: Auto / High / Low ---------- */
const Quality={mode:(()=>{try{return localStorage.getItem('smt-quality')||'auto';}catch(e){return 'auto';}})(),level:'high',
  win:[],onChange:null,
  set(mode){this.mode=mode;try{localStorage.setItem('smt-quality',mode);}catch(e){}this.apply(mode==='low'?'low':'high');this.win=[];},
  apply(level){this.level=level;const hi=level==='high';sun.castShadow=hi;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,hi?1.5:1));
    ShadowSched.force=true;RenderGate.dirty=true;if(this.onChange)this.onChange();},
  sample(dt){if(this.mode!=='auto'||this.level==='low')return;this.win.push(dt);
    let s=0;for(const x of this.win)s+=x;if(s<2)return;const fps=this.win.length/s;this.win=[];
    if(fps<28)this.apply('low');}};

/* ---------- 7. on-screen performance figures ---------- */
const PerfHUD={el:null,t:0,n:0,acc:0,fps:0,build:0,calls:0,tris:0,
  init(el){this.el=el;},
  frame(dt,rendered){if(rendered){this.n++;this.acc+=dt;this.calls=renderer.info.render.calls;this.tris=renderer.info.render.triangles;}
    this.t+=dt;if(this.t<.5||!this.el)return;this.fps=this.acc>0?this.n/this.acc:0;this.t=0;this.n=0;this.acc=0;
    if(this.el.offsetParent===null)return;
    this.el.innerHTML='<b>'+(this.fps?this.fps.toFixed(0):'idle')+'</b> fps · <b>'+this.calls+'</b> draw calls · '+(this.tris/1000).toFixed(1)+'k triangles<br>'+
      renderer.info.programs.length+' shaders · quality '+Quality.level+(Quality.mode==='auto'?' (auto)':'')+' · build '+this.build.toFixed(0)+' ms';}};
