"""v2 (speed) version of the placement page (ES module, three r186) as one self-contained HTML file.
Runs the v1 builder npm.py with these changes: v2 layer (v2/perf.js + v2/v2shim.js) added to the module,
shadows refreshed by the scheduler, static parts merged (moving parts from v2/dyn/placement.json)."""
import os,sys,json
D=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,D)
OUT=os.environ.get('V2_OUT','/home/user/smt_v2');os.makedirs(OUT,exist_ok=True)
rd=lambda p:open(p,encoding='utf-8').read()
_argv=sys.argv;sys.argv=['build_v2','__none__']
import build_v2 as B          # page2(), QUALITY, CSS (builds nothing with this argv)
sys.argv=_argv
dynf=os.path.join(D,'v2','dyn','placement.json');PATHS=rd(dynf) if os.path.exists(dynf) else '[]'
V2=(B.V2JS+"""
renderer.shadowMap.autoUpdate=false;window.__v2objs={scene,world};
v2Init({roots:[scene],paths:%s,dyn:()=>[],keepMats:()=>[M.coverWhite,M.coverBlack,M.coverGlass,M.lampG,M.lampY,...(M.camGlass||[]),floorMat,stubMat],shell:[],paused:()=>!playing});
coverMeshes.length=0;covers.traverse(o=>{if(o.isMesh&&[M.coverWhite,M.coverBlack,M.coverGlass].includes(o.material))coverMeshes.push(o);});   // merged cover parts follow the Ghost / Solid switch
""")%PATHS
V2+=rd(os.path.join(D,'v2','placement_extra.js'))
if os.environ.get('V2_PROBE'):V2=V2.replace('roots:[scene]','roots:[]')     # unmerged build for the probe
src=rd(os.path.join(D,'npm.py')).replace("from page import page\n","")
a="open(os.path.join(D,'npm.entry.js'),'w').write('import { makePCBKit } from \"./pcbkit.mjs\";\\n'+s)"
assert a in src
src=src.replace(a,"""i=s.rindex('\\nrequestAnimationFrame(frame);');s=s[:i]+'\\n'+V2+s[i:]
s=s.replace('  renderer.render(scene, camera);\\n  requestAnimationFrame(frame);','  renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera);\\n  requestAnimationFrame(frame);')
s=s.replace('  apply(time);\\n  controls.update();','  apply(time); v2Placed();\\n  controls.update();')
assert 'v2Placed();' in s and 'shadowMap.needsUpdate = true' in s
open(os.path.join(D,'npm.entry.v2.js'),'w').write('import { makePCBKit } from "./pcbkit.mjs";\\n'+s)""")
src=src.replace("os.path.join(D,'npm.entry.js'),'--bundle'","os.path.join(D,'npm.entry.v2.js'),'--bundle'").replace("'--outfile='+os.path.join(D,'npm.bundle.js')","'--outfile='+os.path.join(D,'npm.bundle.v2.js')").replace("rd('npm.bundle.js')","rd('npm.bundle.v2.js')")
src=src.replace("open('/home/user/smt_placement.html','w',encoding='utf-8').write(html);print('/home/user/smt_placement.html',len(html)//1024,'KB')","open(OUTFILE,'w',encoding='utf-8').write(html);print(OUTFILE,len(html)//1024,'KB')")
assert 'OUTFILE' in src and 'npm.bundle.v2.js' in src
exec(compile(src,'npm_v2','exec'),{'__file__':os.path.join(D,'npm.py'),'page':lambda c:B.page2(c,'placement'),'V2':V2,'OUTFILE':os.path.join(OUT,'placement.html'),'__name__':'v2'})
