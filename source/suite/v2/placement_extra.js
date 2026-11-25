/* v2 placement: components already placed on a board are drawn from one merged layer per material and lane
   (≈ 400 component groups → a few draw calls).  The layer is sorted by placement time, so the number of
   placed parts simply sets how much of it is drawn; it moves with the board.  Parts on the nozzles stay as before. */
const PLAYER=[0,1].map(h=>{
  const list=comps.filter(c=>c.head===h).sort((a,b)=>a.tPlace-b.tPlace),g=new THREE.Group();partRoot.add(g);
  const byMat=new Map(),Y=new THREE.Vector3(0,1,0),one=new THREE.Vector3(1,1,1),q=new THREE.Quaternion(),M4=new THREE.Matrix4(),L4=new THREE.Matrix4();
  list.forEach((c,i)=>{M4.compose(w2t(c.u,LANE[h]+c.v,Z.pcb),q.setFromAxisAngle(Y,c.rot),one);
    c.mesh.children.forEach(o=>{if(!o.isMesh)return;o.updateMatrix();const geo=(o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone());
      geo.applyMatrix4(L4.multiplyMatrices(M4,o.matrix));for(const k of Object.keys(geo.attributes))if(!['position','normal','uv'].includes(k))geo.deleteAttribute(k);if(!geo.attributes.uv)return;
      let e=byMat.get(o.material);if(!e)byMat.set(o.material,e={geos:[],cum:new Array(list.length).fill(-1),n:0,cast:o.castShadow});
      e.geos.push(geo);e.n+=geo.attributes.position.count;e.cum[i]=e.n;});});
  const layers=[];
  for(const [mat,e] of byMat){let last=0;e.cum=e.cum.map(v=>v<0?last:(last=v));
    const geo=(BGU.mergeGeometries||BGU.mergeBufferGeometries)(e.geos,false);e.geos.forEach(x=>x.dispose());if(!geo)continue;
    geo.setDrawRange(0,0);const m=new THREE.Mesh(geo,mat);m.castShadow=e.cast;m.receiveShadow=true;m.frustumCulled=false;g.add(m);layers.push({m,cum:e.cum});}
  return{h,list,g,layers,n:-1};});
function v2Placed(){for(const L of PLAYER){const x=local(L.h,time);let n=0;while(n<L.list.length&&L.list[n].tPlace<=x)n++;
    for(let i=0;i<n;i++)L.list[i].mesh.visible=false;               // drawn by the merged layer instead
    L.g.position.copy(w2t(boardX(x),0,0));
    if(n!==L.n){L.n=n;for(const y of L.layers)y.m.geometry.setDrawRange(0,n?y.cum[n-1]:0);}}}
