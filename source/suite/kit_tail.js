  const boardTop=std(0xffffff,.42,.12,{map:tex});
  const st=new THREE.Group();
  const body=new THREE.Mesh(new THREE.BoxGeometry(BW,BT,BD),PM.fr4);body.position.y=BT/2;body.castShadow=true;body.receiveShadow=true;st.add(body);
  const top=new THREE.Mesh(FLAT(BW,BD),boardTop);top.position.y=BT+.01;top.receiveShadow=true;st.add(top);
  const lb=new THREE.Mesh(FLAT(30,10),PM.label);lb.position.set(-68,BT+.05,-86);st.add(lb);
  const all=new Bucket(),noCand=new Bucket();
  places.forEach(p=>{const m=new THREE.Matrix4().makeRotationY(p.rot);m.setPosition(p.x,BT,p.z);
    p.ls.forEach(a=>{const mm=new THREE.Matrix4().multiplyMatrices(m,a[2]);all.add(a[0],a[1],mm);if(!p.cand)noCand.add(a[0],a[1],mm);});
    if(p.cand){const g=new THREE.Group(),b=new Bucket();p.ls.forEach(a=>b.add(a[0],a[1],a[2]));b.build(g);g.position.set(p.x,BT,p.z);g.rotation.order='YXZ';g.rotation.y=p.rot;
      cands.push({name:p.name,kind:p.info.kind,len:p.info.len||0,group:g,x:p.x,z:p.z,rot:p.rot,w:p.info.w,d:p.info.d,h:p.info.h});}});
  const compsAll=all.build(new THREE.Group()),compsNoCand=noCand.build(new THREE.Group());
  /* pad list for paste / stencil apertures: [x, z, w, d, name] (connectors are through-hole: no paste) */
  const pads=[];
  places.forEach(p=>{if(p.info.kind=='conn')return;const c=Math.cos(p.rot),s=Math.sin(p.rot),odd=Math.abs(s)>.5;
    p.pd.concat(p.balls).forEach((a,k)=>{pads.push([p.x+a[0]*c+a[1]*s,p.z-a[0]*s+a[1]*c,+((odd?a[3]:a[2])*.9).toFixed(3),+((odd?a[2]:a[3])*.9).toFixed(3),p.name+(p.pd.length>2?'.'+(k+1):'')]);});});
  function pasteGeo(skip){const pg=[];pads.forEach((q,i)=>{if(skip&&skip.has(i))return;const g=new THREE.BoxGeometry(q[2],.13,q[3]);g.translate(q[0],BT+.075,q[1]);pg.push(g);});const m=merge(pg);pg.forEach(g=>g.dispose());return m;}
  function candPadIdx(n){const idx=new Set(),stp=Math.floor(pads.length/n);for(let i=0;i<pads.length&&idx.size<n;i+=stp){let k=i;while(k<pads.length&&pads[k][2]*pads[k][3]<.25)k++;if(k<pads.length)idx.add(k);}return idx;}
  function partGroup(p){const g=new THREE.Group(),b=new Bucket();p.ls.forEach(a=>b.add(a[0],a[1],a[2]));b.build(g);g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return g;}
  /* a new Group of fresh meshes sharing geometry/material with template groups */
  function inst(...groups){const g=new THREE.Group();groups.forEach(t=>t.children.forEach(m=>{const c=new THREE.Mesh(m.geometry,m.material);c.position.copy(m.position);c.rotation.copy(m.rotation);c.receiveShadow=true;c.castShadow=m.castShadow;g.add(c);}));return g;}
  let tris=0;compsAll.traverse(o=>{if(o.isMesh)tris+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;});
  return{board:st,boardTop,compsAll,compsNoCand,cands,places,pads,pasteGeo,candPadIdx,partGroup,inst,tris:Math.round(tris)};
