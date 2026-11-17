s=open('src/aoi.pcb.js').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:80],s.count(a)); s=s.replace(a,b)
rep("BGU.mergeBufferGeometries(this.m[k],false)","merge(this.m[k])")
rep("bga:(size,pitch)=>(ls,pd)=>{const n=Math.floor((size-1)/pitch);","bga:(size,pitch)=>(ls,pd)=>{const n=Math.floor((size-1)/pitch);for(let i=0;i<n;i++)for(let j=0;j<n;j++)BALLS.push([(i-(n-1)/2)*pitch,(j-(n-1)/2)*pitch,pitch*.5,pitch*.5]);")
rep("mk(['LM358D','2231 K7'],'#aeb3b8')","mk(['OPA-2','2231 K7'],'#aeb3b8')")
rep("mk(['74HC595','A2241'],'#aeb3b8')","mk(['SR-8','A2241'],'#aeb3b8')")
rep("mk(['ARM','MCU-F407','VGT6  2244','KOR 9A'])","mk(['MCU','U-100','2244','9A'])")
rep("mk(['SoC','MX8-QUAD','AB1234.01','2245 TW'])","mk(['SoC','4-CORE','AB1234.01','2245'])")
rep("'SN MV9DL-0042-A17'","'SN 0042-A17'")
rep("g.fillText('AOI DEMO BOARD · MV9-TV1 REV C',X(-100),Z(96.5));","g.fillText('SMT DEMO BOARD · REV C',X(-100),Z(96.5));")
rep("g.fillText('SMT LINE SIMULATION · 94V-0 · 2026-W46',X(-42),Z(96.5));","g.fillText('SMT LINE SIMULATION · 94V-0 · 2026-W46',X(-30),Z(96.5));")
a=s.index("  function place(pre,x,z,rot,builder,o={}){");b=s.index("  const R=(sz,x,z,rot,o)=>")
s=s[:a]+"""  function place(pre,x,z,rot,builder,o={}){
    BALLS.length=0;const ls=[],pd=[],info=builder(ls,pd);refs[pre]=(refs[pre]||0)+1;const name=pre+refs[pre];
    const key=info.kind+'|'+ls.map(q=>q[0]).join(',')+'|'+info.w.toFixed(2)+'x'+info.d.toFixed(2)+'x'+(+info.h).toFixed(2);
    places.push({name,x,z,rot,pd,balls:BALLS.slice(),info,ls,key,cand:!!o.cand,silk:o.silk!==false});
  }
"""+s[b:]
rep("""      g.restore();});
    // silkscreen""","""      g.restore();});
    places.forEach(p=>{if(!p.balls.length)return;g.save();g.translate(X(p.x),Z(p.z));g.rotate(-p.rot);
      p.balls.forEach(a=>{g.fillStyle='#d9b85c';g.beginPath();g.arc(a[0]*S,a[1]*S,a[2]*S*.55,0,7);g.fill();});g.restore();});
    // silkscreen""")
a=s.index("  const st=new THREE.Group();");b=s.index("})();",a)
s=s[:a]+open('kit_tail.js').read()+s[b:]
rep("const board=(function buildTemplate(){","const T=(function buildTemplate(){")
kit=open('kit_head.js').read()+s.replace("/* ===================================================================\n   PCB","/* ---",1)+"""
return Object.assign(T,{BW,BD,BT,FIDS,FLAT,PM});
}
"""
open('pcbkit.js','w').write(kit)
