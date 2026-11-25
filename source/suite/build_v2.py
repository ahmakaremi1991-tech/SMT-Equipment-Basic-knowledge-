"""Build the v2 (speed) versions of the catalogue machine pages as single self-contained HTML files.

The current pages and their sources are not changed: this script imports the v1 builders, keeps their
output, and adds the v2 layer (v2/perf.js + v2/v2shim.js) plus a per-page setup call.  The list of parts
that move comes from tests/probe_dyn.js (v2/dyn/<page>.json), so only parts that never move are merged.
Usage: python3 build_v2.py [printer spi aoi reflow handling_line] -> OUT/<page>.html"""
import os,sys,json
D=os.path.dirname(os.path.abspath(__file__));sys.path.insert(0,D)
OUT=os.environ.get('V2_OUT','/home/user/smt_v2');os.makedirs(OUT,exist_ok=True)
rd=lambda p:open(p,encoding='utf-8').read()
want=sys.argv[1:] or ['printer','spi','aoi','reflow','handling_line']
_argv=sys.argv;sys.argv=['build4','__none__']
import build4,page as pagemod
sys.argv=_argv
V2JS=rd(os.path.join(D,'v2','perf.js'))+rd(os.path.join(D,'v2','v2shim.js'))
dyn=lambda k:rd(os.path.join(D,'v2','dyn',k+'.json'))

# per page: roots, extra moving parts the probe can miss (short flashes), materials changed per object, pause flag
SETUP={
 'printer':"v2Init({roots:[machine],paths:%s,dyn:()=>[],keepMats:()=>[...foilMats,...camLeds],shell:shellMats,paused:()=>paused});",
 'spi':"v2Init({roots:[machine],paths:%s,dyn:()=>[fovStripe,fovGlow,...projBeams],keepMats:()=>[...rings,...projLens],shell:shellMats,paused:()=>paused});",
 'aoi':"v2Init({roots:[machine],paths:%s,dyn:()=>[fovStripe,fovGlow,...projBeams],keepMats:()=>[...rings,...projLens],shell:shellMats,paused:()=>paused});",
 'reflow':"v2Init({roots:[machine],paths:%s,dyn:()=>[],keepMats:()=>[...topPlates],shell:shellMats,paused:()=>paused});",
 'handling_line':"v2Init({roots:MACH.map(m=>m.g),paths:%s,dyn:()=>MACH.flatMap(m=>[...(m.fans||[]),m.beam,m.spark,m.spot,m.fov].filter(Boolean)),keepMats:()=>[],shell:shellMats,paused:()=>paused,beforeRender:()=>BI.update()});",
}
QUALITY=('<div class="sec"><h3>Graphics quality</h3><div class="seg2 segQ"><button data-q="auto">Auto</button><button data-q="high">High</button><button data-q="low">Low</button></div>'
         '<p class="note">Auto switches to Low (no shadows, lower resolution) if the device is too slow. v2: parts that never move are merged, shadows and camera insets refresh up to 10× per second, nothing is redrawn while paused.</p></div>')
LOADING='<div id="loading"><div class="lcard"><div class="lt">{fn}</div><div class="lbar"><i></i></div><div class="ldT">Loading 3D…</div></div></div><div id="perf" class="panel" data-ov="perf"></div>'
CSS="""
#loading{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:var(--scene,#10151d);transition:opacity .4s}
#loading.done{opacity:0;pointer-events:none}#loading .lcard{width:min(360px,80vw);text-align:center}#loading .lt{font-weight:900;letter-spacing:1.5px;margin-bottom:14px;font-size:18px}
#loading .lbar{height:6px;border-radius:4px;background:var(--btn);overflow:hidden}#loading .lbar i{display:block;height:100%;width:40%;background:linear-gradient(90deg,var(--acc),var(--cy));animation:ld 1.1s ease-in-out infinite alternate}
@keyframes ld{from{margin-left:0}to{margin-left:60%}}#loading .ldT{margin-top:10px;font-size:12px;color:var(--mut)}
#perf{left:12px;top:142px;padding:6px 10px;font:11px/1.5 Consolas,Menlo,monospace;color:var(--mut)}#perf b{color:var(--txt)}
.segQ{display:grid;grid-template-columns:repeat(3,1fr)}
@media (max-width:820px){
 #hud{width:auto;left:auto;right:8px;top:8px;max-width:54vw;padding:8px 10px}#hud h2{cursor:pointer}
 #cycle{top:8px;left:8px;transform:none;min-width:0;max-width:36vw;padding:6px 10px}#cycle .v{font-size:20px}#cycle .s{display:none}
 #bar{left:6px;right:6px;bottom:6px;padding:5px;gap:4px}#bar button{padding:9px 10px;font-size:12px}#bar .lbl,#bar .sep{display:none}
 #perf,.inset,#insetR{display:none}
}"""
def page2(c,key):
    c=dict(c);c['extra_side']=c.get('extra_side','')+QUALITY
    c['stage_html']=LOADING.replace('{fn}',c['fn'])+c['stage_html'];c['css']=c.get('css','')+CSS
    c['overlays']=list(c['overlays'])+[('perf','Performance',False)]
    c['title']=c['title'].replace(' · SMT',' · v2 · SMT',1) if ' · SMT' in c['title'] else c['title']+' · v2'
    # phones: start with the side panel closed
    c['libs']=c['libs']+"<script>if(innerWidth<820&&(function(){try{return localStorage.getItem('smt-side')===null;}catch(e){return true;}})())document.getElementById('side').classList.add('min');</script>\n"
    return pagemod.page(c)
def inject(script,key):
    """add the v2 layer before the page's runtime and call v2Init just before the main loop starts"""
    tail="\nframe();"
    i=script.rindex(tail);assert i>0,key
    return script[:i]+"\n"+(SETUP[key]%dyn(key))+script[i:]

done=[]
for key in [k for k in ['printer','spi','aoi','reflow'] if k in want]:
    cfg=dict(build4.BASE[key]);orig_rt=cfg['runtime']
    cfg['runtime']=lambda r,orig=orig_rt:V2JS+orig(r)
    build4.page=lambda c,key=key:page2(c,key)
    js_holder={}
    _b=build4.build
    out=os.path.join(OUT,key+'.html')
    # build() writes the page; patch the script inside the written html (v2Init before the final frame())
    build4.build(key,out,cfg)
    h=rd(out);h=inject(h[:h.rindex('</script>')],key)+h[h.rindex('</script>'):];open(out,'w',encoding='utf-8').write(h);done.append(out)

if 'handling_line' in want:
    src=rd(os.path.join(D,'hnd_build.py')).replace("from page import page\n","")
    src=src.replace("rd(os.path.join(D,'hnd2.js'))","(V2JS+rd(os.path.join(D,'v2','handling_extra.js'))+rd(os.path.join(D,'hnd2.js')))")
    out=os.path.join(OUT,'handling_line.html')
    src=src.replace("out='/home/user/smt_handling_line.html'","out=OUTFILE")
    g={'__file__':os.path.join(D,'hnd_build.py'),'page':lambda c:page2(c,'handling_line'),'V2JS':V2JS,'OUTFILE':out,'__name__':'v2'}
    exec(compile(src,'hnd_build_v2','exec'),g)
    h=rd(out);h=inject(h[:h.rindex('</script>')],'handling_line')+h[h.rindex('</script>'):];open(out,'w',encoding='utf-8').write(h);done.append(out)
print('v2 pages:',' '.join(os.path.basename(x)+' '+str(os.path.getsize(x)//1024)+'KB' for x in done))
