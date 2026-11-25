/* v2 handling line: every panel is drawn with one instanced mesh per panel part (board, components, bottom side)
   — 60+ panels in magazines × 4 parts become 4 draw calls.  The per-panel meshes stay (positions, picking) but are hidden. */
const BI={parts:null,inst:[],max:512,
  adopt(b){const ps=[];b.piv.traverse(o=>{if(o.isMesh&&o!==b.dec)ps.push(o);});
    if(!this.parts){this.parts=ps.map(o=>o.geometry.uuid+o.material.uuid);
      this.inst=ps.map(o=>{const im=new THREE.InstancedMesh(o.geometry,o.material,this.max);im.count=0;im.castShadow=false;im.receiveShadow=true;im.frustumCulled=false;im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);scene.add(im);return im;});}
    const same=ps.length===this.parts.length&&ps.every((o,i)=>o.geometry.uuid+o.material.uuid===this.parts[i]);
    b.parts=same?ps:null;if(same)ps.forEach(o=>o.visible=false);b.g.traverse(o=>{o.castShadow=false;});},
  update(){if(!this.parts)return;let n=0;
    for(const b of boards){if(!b.alive||!b.parts)continue;
      let vis=true;for(let q=b.g;q;q=q.parent)if(!q.visible){vis=false;break;}if(!vis||!b.g.parent)continue;if(n>=this.max)break;
      // the 2D code label is hidden while the panel sits in a magazine (unreadable there) and comes back when it leaves
      if(b.inMag){if(b.dec.visible){b.dec.visible=false;b.dec.userData.v2hid=true;}}else if(b.dec.userData.v2hid){b.dec.visible=true;b.dec.userData.v2hid=false;}
      b.g.updateMatrixWorld(true);b.parts.forEach((o,k)=>this.inst[k].setMatrixAt(n,o.matrixWorld));n++;}
    this.inst.forEach(im=>{im.count=n;im.instanceMatrix.needsUpdate=true;});}};
const _newBoardV1=newBoard;newBoard=function(l){const b=_newBoardV1(l);BI.adopt(b);return b;};
