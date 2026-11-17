import os,re,sys,subprocess
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from page import page
D=os.path.dirname(os.path.abspath(__file__));LIB=os.path.join(D,'..','lib186')
rd=lambda p:open(os.path.join(D,p),encoding='utf-8').read()
def rep(s,a,b,n=1):
    c=s.count(a);assert c==n,(a[:100],c);return s.replace(a,b)
def cut(s,a,b,new):
    i=s.index(a);j=s.index(b,i);return s[:i]+new+s[j:]
s=rd('src/npm.orig.js')
# ---------- imports / helpers ----------
s=rep(s,'import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";','import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";\nimport * as BGU from "three/addons/utils/BufferGeometryUtils.js";\nconst SMT = window.SMT;')
# ---------- geometry: same lanes, board and units as the rest of the line ----------
s=rep(s,'const Z = { deck: 0.80, pcb: 0.900, rest: 0.940, tape: 0.9003 };','const Z = { deck: 0.80, pcb: 0.9016, rest: 0.946, tape: 0.9003 };   // board top 901.6 mm, as in every machine of the line')
s=rep(s,'const LANE = [-0.145, 0.145];','const LANE = [-0.170, 0.170];   // lane 1 (front) at +170 mm, lane 2 at -170 mm in line coordinates')
s=rep(s,'const BOARD = { L: 0.30, W: 0.16, T: 0.0016,','const BOARD = { L: 0.25, W: 0.20, T: 0.0016,')
s=rep(s,'const TRIPS = 6, NOZ = 16;','const NOZ = 16;')
# component library + job -> the shared line PCB
a=s.index('// Component library:');b=s.index('// ================================================================ schedule')
s=s[:a]+r'''// ---------------------------------------------------------------- the shared line PCB (same board model as every other machine)
function canvasTex(w, h, draw, opt = {}) { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (opt.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const KIT = makePCBKit(THREE, (a) => BGU.mergeGeometries(a, false), canvasTex);
const KINDCOL = { chip: "#8a7a62", led: "#42c86a", ic: "#3b4250", ecap: "#b8c0c8", tant: "#d9a12a", conn: "#15171a" };
const KINDLBL = { chip: "Chip R / C", led: "LED", ic: "IC / BGA / QFP", ecap: "Electrolytic", tant: "Tantalum", conn: "Connector" };
// one feeder per part type (same set on both sides), wide parts take more slots
const KEYS = [...new Set(KIT.places.map((p) => p.key))].map((key) => { const p = KIT.places.find((q) => q.key === key); return { key, sample: p, w: Math.max(p.info.w, p.info.d) / 1000 }; }).sort((a, b) => a.w - b.w);
const FEED = { pitch: 0.0175, cart: 0.275, bw: 0.013 };
const slotX = (cart, s) => cart * FEED.cart + (s - 14.5) * FEED.pitch;
const linSlot = (j) => slotX(j < 30 ? -1 : 1, j % 30);
{ let j = 1; for (const k of KEYS) { const n = Math.max(1, Math.ceil(k.w / FEED.pitch)); k.slot = j + (n - 1) / 2; j += n; if (j >= 30 && j - n < 30) { j = 31; k.slot = j + (n - 1) / 2; j += n; } } }
const KEYIDX = Object.fromEntries(KEYS.map((k, i) => [k.key, i]));
const FEEDS = [-1, 1].map((side) => KEYS.map((k) => { const lo = Math.floor(k.slot), f = k.slot - lo; return { x: lerp(linSlot(lo), linSlot(Math.min(59, lo + 1)), f), y: side * Y.feed, z: Z.tape, key: k.key, sample: k.sample, w: k.sample.info.w / 1000, d: k.sample.info.d / 1000, name: (side < 0 ? "F" : "R") + String(Math.round(k.slot) + 1).padStart(2, "0") }; }));
// job: every part of the board, small parts first, 16 per head trip
const JOB = KIT.places.map((p) => { const odd = Math.abs(Math.sin(p.rot)) > 0.5, w = p.info.w / 1000, d = p.info.d / 1000; return { place: p, key: p.key, kind: p.info.kind, u: p.x / 1000, v: -p.z / 1000, rot: p.rot, hw: (odd ? d : w) / 2, hh: (odd ? w : d) / 2, h: p.info.h / 1000 }; })
  .sort((a, b) => (a.hw * a.hh - b.hw * b.hh) || (a.u - b.u));
JOB.forEach((j, i) => { j.trip = Math.floor(i / NOZ); j.k = i % NOZ; });
const TRIPS = Math.ceil(JOB.length / NOZ);
const comps = [0, 1].flatMap((h) => JOB.map((j) => ({ ...j, head: h, src: FEEDS[h][KEYIDX[j.key]], tPick: 0, tPlace: 0 })));

'''+s[b:]
s=rep(s,"const local = (h, t) =>","const local = (h, t) =>")
# ---------- renderer / scene in millimetres ----------
s=rep(s,'const viewport = $("viewport");','const viewport = SMT.stage();')
s=rep(s,'const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });','const renderer = new THREE.WebGLRenderer({ canvas: $("c"), antialias: true, powerPreference: "high-performance" });')
s=rep(s,'renderer.domElement.className = "main";\nviewport.prepend(renderer.domElement);\n','')
s=rep(s,'const camera = new THREE.PerspectiveCamera(34, 1, 0.01, 40);','const camera = new THREE.PerspectiveCamera(34, 1, 2, 60000);')
s=rep(s,'controls.minDistance = 0.06; controls.maxDistance = 12;','controls.minDistance = 40; controls.maxDistance = 14000;')
s=rep(s,'sun.position.set(2.6, 5.2, 3.6); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.004;','sun.position.set(2600, 5200, 3600); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 4;')
s=rep(s,'Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 2.6, bottom: -2.6, near: 0.5, far: 12 });','Object.assign(sun.shadow.camera, { left: -2600, right: 2600, top: 2600, bottom: -2600, near: 500, far: 12000 });')
s=rep(s,'sun.target.position.set(0, 0.6, 0);','sun.target.position.set(0, 600, 0);')
s=rep(s,'const hemi0 = 0;','') if 'const hemi0 = 0;' in s else s
s=rep(s,'scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8f96, 0.25));','const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8f96, 0.25); scene.add(hemi);')
s=rep(s,'const world = new THREE.Group(); world.rotation.x = -Math.PI / 2; scene.add(world);   // z-up machine frame inside y-up three.js',
        'const world = new THREE.Group(); world.rotation.x = -Math.PI / 2; world.scale.setScalar(1000); scene.add(world);   // z-up machine frame in metres, scaled to the line\'s millimetres')
s=rep(s,'const w2t = (x, y, z) => new THREE.Vector3(x, z, -y);','const w2t = (x, y, z) => new THREE.Vector3(x * 1000, z * 1000, -y * 1000);   // machine metres (z up) -> line millimetres (y up)')
s=rep(s,'const p = new THREE.PointLight(0xeaf2ff, 0.9, 1.8, 1.4);','const p = new THREE.PointLight(0xeaf2ff, 0.9 * Math.pow(1000, 1.4), 1800, 1.4);')
# floor -> suite floor (theme tinted) + line neighbours
s=rep(s,'const floor = mesh(new THREE.CircleGeometry(7, 64), M.floor); floor.castShadow = false;',r'''const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
{ const f = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), floorMat); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
  const lt = canvasTex(64, 64, (g) => { g.fillStyle = "#e8b923"; g.fillRect(0, 0, 64, 64); });
  for (const z of [1250, -1250]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(4600, 60), new THREE.MeshBasicMaterial({ map: lt, transparent: true, opacity: 0.55 })); m.rotation.x = -Math.PI / 2; m.position.set(0, 1, z); scene.add(m); } }
const floorTex = (dark) => { const t = canvasTex(512, 512, (g, W, H) => { g.fillStyle = dark ? "#232a34" : "#d5dae0"; g.fillRect(0, 0, W, H); g.strokeStyle = dark ? "rgba(255,255,255,.055)" : "rgba(0,0,0,.07)"; g.lineWidth = 2; g.strokeRect(0, 0, W, H); }, { repeat: true }); t.repeat.set(40, 40); return t; };
const stubMat = new THREE.MeshStandardMaterial({ color: 0x2b323d, roughness: 0.75, metalness: 0.1 });
function sceneLabel(text, w, h, x, y, z) { const t = canvasTex(900, Math.round(900 * h / w), (g, W, H) => { g.fillStyle = "#1e6fd9"; g.fillRect(0, 0, W, H); g.fillStyle = "#fff"; g.font = `700 ${Math.round(H * 0.46)}px "Segoe UI", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, W / 2, H / 2 + H * 0.04); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); }
for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(640, 1000, 800), stubMat); st.position.set(s * 1980, 500, 0); st.castShadow = st.receiveShadow = true; scene.add(st);
  sceneLabel(s < 0 ? "FROM SPI  ▶" : "▶  TO REFLOW", 560, 78, s * 1980, 1001, 310); }''')
# conveyor for the line lane spacing and the 250 x 200 board
s=rep(s,'box(3.30, 0.012, 0.035, M.alu, 0, yc + s * 0.086, 0.8905);','box(3.30, 0.012, 0.035, M.alu, 0, yc + s * 0.107, 0.8905);')
s=rep(s,'box(3.30, 0.004, 0.002, M.rubber, 0, yc + s * 0.078, 0.8974, world, false);','box(3.30, 0.004, 0.002, M.rubber, 0, yc + s * 0.099, 0.8974, world, false);')
s=rep(s,'for (const x of [-0.45, 0, 0.45]) box(0.03, 0.012, 0.075, M.dark, x, yc + s * 0.086, 0.8375);','for (const x of [-0.45, 0, 0.45]) box(0.03, 0.012, 0.075, M.dark, x, yc + s * 0.107, 0.8375);')
s=rep(s,'box(0.32, 0.14, 0.01, M.black, 0, yc, 0.86);','box(0.27, 0.18, 0.01, M.black, 0, yc, 0.86);')
s=rep(s,'for (const y of [-0.035, 0.035]) vcyl(0.003, 0.0334, M.steel, x, yc + y, 0.8817, world, 10, false);','for (const y of [-0.06, 0.06]) vcyl(0.003, 0.0334, M.steel, x, yc + y, 0.8817, world, 10, false);')
s=rep(s,'box(0.012, 0.03, 0.03, M.yellow, sx * 0.20, yc + 0.07, 0.884, world, false);','box(0.012, 0.03, 0.03, M.yellow, sx * 0.135, yc + 0.09, 0.884, world, false);')
s=rep(s,'  box(0.04, 0.52, 0.03, M.grey, x, 0, 0.858);\n  for (const sy of [-1, 1]) { box(0.04, 0.04, 0.845, M.grey, x, sy * 0.24, 0.4225); box(0.10, 0.10, 0.012, M.dark, x, sy * 0.24, 0.006); }',
        '  box(0.04, 0.64, 0.03, M.grey, x, 0, 0.858);\n  for (const sy of [-1, 1]) { box(0.04, 0.04, 0.845, M.grey, x, sy * 0.30, 0.4225); box(0.10, 0.10, 0.012, M.dark, x, sy * 0.30, 0.006); }')
s=rep(s,'for (const sx of [-1, 1]) for (const sy of [-1, 1]) box(0.64, 0.03, 0.03, M.grey, sx * 1.25, sy * 0.24, 0.30);','for (const sx of [-1, 1]) for (const sy of [-1, 1]) box(0.64, 0.03, 0.03, M.grey, sx * 1.25, sy * 0.30, 0.30);')
# components / feeder windows from the shared kit
a=s.index('// ---------------------------------------------------------------- components');b=s.index('// ---------------------------------------------------------------- gantries and heads')
s=s[:a]+r'''// ---------------------------------------------------------------- components (shared line PCB parts, built in millimetres, y up)
const partRoot = new THREE.Group(); scene.add(partRoot);
function makePart(p) { const g = KIT.partGroup(p); g.traverse((o) => { if (o.isMesh) o.castShadow = p.info.h > 1; }); partRoot.add(g); return g; }
for (const c of comps) c.mesh = makePart(c.place);
// Each feeder presents one part in its pick window; after a pick the tape indexes and the next part slides in.
const windows = [0, 1].flatMap((h) => FEEDS[h].map((f) => {
  if (f.w > 0.0045) box(Math.min(0.028, f.w + 0.004), 0.14, 0.0005, M.tapeB, f.x, Math.sign(f.y) * 0.53, 0.90015, world, false);
  box(f.w + 0.0008, f.d + 0.0008, 0.0002, M.pocket, f.x, f.y, 0.9002, world, false);
  return { h, f, mesh: makePart(f.sample), picks: comps.filter((c) => c.src === f).map((c) => c.tPick).sort((a, b) => a - b) };
}));
// ---------------------------------------------------------------- PCBs: per lane a board in work, a printed one queued upstream and a finished one leaving
const pasteMat = new THREE.MeshStandardMaterial({ color: 0x8f9296, roughness: 0.82, metalness: 0.35 });
const PASTE = KIT.pasteGeo();
function makeBoard(full) { const g = full ? KIT.inst(KIT.board, KIT.compsAll) : KIT.inst(KIT.board); g.add(new THREE.Mesh(PASTE, pasteMat)); scene.add(g); return g; }
const lanes = LANE.map(() => ({ work: makeBoard(false), queue: makeBoard(false), done: makeBoard(true) }));
const boardPos = (g, x, h) => g.position.set(x * 1000, Z.pcb * 1000 - KIT.BT, -LANE[h] * 1000);

'''+s[b:]
# hood label / monitor
s=rep(s,'const lab = labelPlane("NPM-W2", 0.22, 0.04); lab.position.set(-0.30, -R - 0.0075, -R - 0.045); d.add(lab);','const lab = labelPlane("PLACEMENT", 0.40, 0.075, { bg: "#1e6fd9" }); lab.position.set(-0.20, -R - 0.0075, -R - 0.07); d.add(lab);')
s=rep(s,'g.fillText("NPM-W2   PRODUCTION", 20, 38);','g.fillText("PLACEMENT   PRODUCTION", 20, 38);')
s=rep(s,'["PROGRAM  DEMO-BOARD-B",','["PROGRAM  SMT-DEMO REV C",')
s=rep(s,'g.fillStyle = "#0d1722"; g.fillRect(0, 0, 640, 480); g.fillStyle = "#0a57a4"; g.fillRect(0, 0, 640, 56);','g.fillStyle = "#0d1722"; g.fillRect(0, 0, 640, 480); g.fillStyle = "#1e6fd9"; g.fillRect(0, 0, 640, 56);')
s=rep(s,'label: `Pick ${c.type} from ${c.src.name}`','label: `Pick ${c.place.name} from feeder ${c.src.name}`')
s=rep(s,'label: `Place ${c.type}`','label: `Place ${c.place.name}`')
s=rep(s,'board: { p: [-0.02, -0.66, 1.36], t: [0, -0.05, 0.9], door: 0 },','board: { p: [0.30, -0.95, 1.13], t: [0, -0.15, 0.9], door: 0 },')
# camera near plane follows the zoom (mm scene, nozzle close-ups)
s=rep(s,'  controls.update();\n  renderer.render(scene, camera);','  controls.update();\n  { const dd = camera.position.distanceTo(controls.target); camera.near = clamp(dd * 0.03, 1, 10); camera.updateProjectionMatrix(); }\n  renderer.render(scene, camera);')
# UI: cycle / maps / legend
s=rep(s,'$("s-cycle").textContent = "board cycle " + DURATION.toFixed(1) + " s per lane"; $("clock-total").textContent = DURATION.toFixed(1);',
        '$("s-cycle").textContent = "board cycle " + DURATION.toFixed(1) + " s per lane"; $("clock-total").textContent = DURATION.toFixed(1);\nconst CPH = Math.round(2 * JOB.length / DURATION * 3600);\nSMT.cycle(DURATION.toFixed(1) + " s", "per board per lane · " + JOB.length + " parts · " + Math.round(2 * 3600 / DURATION) + " boards/h on 2 lanes", "CYCLE TIME · BOARD");')
s=rep(s,'$("legend").innerHTML = Object.values(TYPES).filter((t) => t.label).map((t) => `<span><i style="background:${t.col}"></i>${t.label}</span>`).join("");',
        '$("legend").innerHTML = Object.keys(KINDLBL).map((k) => `<span><i style="background:${KINDCOL[k]}"></i>${KINDLBL[k]}</span>`).join("");')
s=rep(s,'if (i < placed) { g.fillStyle = TYPES[p.type].col;','if (i < placed) { g.fillStyle = KINDCOL[p.kind];')
# per-frame placement in scene coordinates
s=rep(s,'    L.work.position.set(bx[h], LANE[h], Z.pcb);','    boardPos(L.work, bx[h], h);')
s=rep(s,'L.queue.visible = x > BOARD.tMove + 1; L.queue.position.set(lerp(BOARD.xQ, BOARD.xIn, ease(q)), LANE[h], Z.pcb);','L.queue.visible = x > BOARD.tMove + 1; boardPos(L.queue, lerp(BOARD.xQ, BOARD.xIn, ease(q)), h);')
s=rep(s,'L.done.visible = x < BOARD.tMove; L.done.position.set(lerp(BOARD.xOut, BOARD.xGone, ease(clamp(x / BOARD.tMove, 0, 1))), LANE[h], Z.pcb);','L.done.visible = x < BOARD.tMove; boardPos(L.done, lerp(BOARD.xOut, BOARD.xGone, ease(clamp(x / BOARD.tMove, 0, 1))), h);')
s=rep(s,'m.visible = true; m.position.set(p.x + o[0], p.y + o[1], tipZ(p, c.k) - c.h); m.rotation.z = c.rot * ease(clamp((x - c.tPick) / (c.tPlace - c.tPick) * 1.6, 0, 1));\n      rigs[h].noz[c.k].rotation.z = m.rotation.z;',
        'm.visible = true; m.position.copy(w2t(p.x + o[0], p.y + o[1], tipZ(p, c.k) - c.h)); m.rotation.y = c.rot * ease(clamp((x - c.tPick) / (c.tPlace - c.tPick) * 1.6, 0, 1));\n      rigs[h].noz[c.k].rotation.z = m.rotation.y;')
s=rep(s,'} else { placed[h]++; m.visible = true; m.position.set(bx[h] + c.u, LANE[h] + c.v, Z.pcb); m.rotation.z = c.rot; }','} else { placed[h]++; m.visible = true; m.position.copy(w2t(bx[h] + c.u, LANE[h] + c.v, Z.pcb)); m.rotation.y = c.rot; }')
s=rep(s,'w.mesh.position.set(w.f.x, w.f.y + dir * (1 - ease(s)) * 0.008, w.f.z); w.mesh.visible = s > 0.15;','w.mesh.position.copy(w2t(w.f.x, w.f.y + dir * (1 - ease(s)) * 0.008, w.f.z)); w.mesh.visible = s > 0.15;')
# theme
s=rep(s,"""function applyTheme() {
  const dark = document.documentElement.dataset.theme === "dark";
  M.floor.color.set(dark ? 0x1d2126 : 0xb9b7b3); scene.environmentIntensity = dark ? 0.35 : 0.45; sun.intensity = dark ? 1.2 : 1.5;""","""const _ft = {};
function applyTheme() {
  const dark = SMT.isDark();
  scene.background = new THREE.Color(dark ? 0x10151d : 0xeef1f5);
  const k = dark ? "d" : "l"; if (!_ft[k]) _ft[k] = floorTex(dark); floorMat.map = _ft[k]; floorMat.needsUpdate = true; stubMat.color.set(dark ? 0x2b323d : 0xb7bfc9);
  scene.environmentIntensity = dark ? 0.4 : 0.5; sun.intensity = dark ? 1.35 : 1.5; hemi.intensity = dark ? 0.35 : 0.3;""")
s=rep(s,'addEventListener("themechange", applyTheme);','SMT.onTheme(applyTheme);')
s=rep(s,'resize(); applyTheme(); setCovers("solid");','resize(); setCovers("solid");')
s=rep(s,'window.simReady = true;','window.simReady = true; $("load-error").style.display = "none";')
s=rep(s,'function resize() { const w = viewport.clientWidth, h = viewport.clientHeight;','function resize() { const [w, h] = SMT.size();')
s=rep(s,'window.__sim = { seek','window.__sim = { comps, JOB, KIT, get time() { return time; }, seek')
open(os.path.join(D,'pcbkit.mjs'),'w').write(rd('pcbkit.js')+'\nexport { makePCBKit };\n')
open(os.path.join(D,'npm.entry.js'),'w').write('import { makePCBKit } from "./pcbkit.mjs";\n'+s)
# bundle (three r186 + addons + kit) into one offline IIFE
r=subprocess.run([os.path.join(LIB,'node_modules','.bin','esbuild'),os.path.join(D,'npm.entry.js'),'--bundle','--format=iife','--minify','--legal-comments=none',
   '--outfile='+os.path.join(D,'npm.bundle.js')],cwd=LIB,capture_output=True,text=True,env=dict(os.environ,NODE_PATH=os.path.join(LIB,'node_modules')))
print(r.stdout[-500:],r.stderr[-1500:])
bundle=rd('npm.bundle.js').replace('</script','<\\/script')
CSS="""
:root{--hf:#3cc7c3;--hr:#c78af0;--conv:#9aa5b0;--amber:#f0b840;--hf-soft:color-mix(in srgb,#3cc7c3 18%,transparent);--hr-soft:color-mix(in srgb,#c78af0 18%,transparent);--conv-soft:color-mix(in srgb,#9aa5b0 18%,transparent)}
:root[data-theme=light]{--hf:#0b8484;--hr:#8a3db5;--conv:#6b7480;--amber:#c98a06}
.mono{font-family:Consolas,Menlo,monospace;font-variant-numeric:tabular-nums}
#hud.now{width:400px;left:12px;right:auto;top:132px;display:grid;gap:5px;padding:10px 12px}
.now-row{display:grid;grid-template-columns:58px 1fr;gap:8px;align-items:baseline}
.now-row .what{min-width:0}.now-row b{font-weight:600}
.now-row code{display:block;font:400 11px Consolas,monospace;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-height:14px}
.chip{justify-self:start;font:600 10px Consolas,monospace;letter-spacing:.05em;padding:2px 6px;border-radius:4px;white-space:nowrap}
.chip.conv{background:var(--conv-soft);color:var(--conv)}.chip.hf{background:var(--hf-soft);color:var(--hf)}.chip.hr{background:var(--hr-soft);color:var(--hr)}
#tl{left:12px;right:12px;bottom:calc(var(--barH,46px) + 20px);padding:6px 10px;display:flex;align-items:center;gap:12px}
.timeline{flex:1;min-width:0;position:relative;height:54px;cursor:pointer;touch-action:none}
.timeline canvas{position:absolute;inset:0;width:100%;height:100%}
.playhead{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--acc2);pointer-events:none}
.clock{flex:none;font-size:13px;color:var(--mut);min-width:96px;text-align:right}.clock b{color:var(--tx);font-weight:500}
.toggle{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--mut);cursor:pointer;user-select:none}
.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}
.stat{background:var(--btn);border-radius:10px;padding:8px 10px;min-width:0;border:1px solid var(--line)}
.stat small{display:block;font-size:11px;color:var(--mut)}
.stat .value{font:500 18px Consolas,monospace;margin-top:2px}.stat .value em{font-style:normal;font-size:11px;color:var(--mut);margin-left:3px}
.stat .sub{font-size:11px;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.maps{display:grid;gap:8px;margin-top:10px}
.maps h4{margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;display:flex;justify-content:space-between}
.maps h4.hf{color:var(--hf)}.maps h4.hr{color:var(--hr)}.maps h4 em{font:500 11px Consolas,monospace;font-style:normal;color:var(--mut)}
.maps canvas{width:100%;height:auto;display:block;border-radius:6px}
.legend{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:11.5px;color:var(--mut)}
.legend span{display:inline-flex;gap:5px;align-items:center}.legend i{width:10px;height:10px;border-radius:2px;display:inline-block}
.head h4{margin:8px 0 6px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;display:flex;justify-content:space-between}
.head h4.hf{color:var(--hf)}.head h4.hr{color:var(--hr)}.head h4 em{font:500 11px Consolas,monospace;font-style:normal;color:var(--mut)}
.nozzles{display:grid;grid-template-columns:repeat(8,1fr);gap:5px;padding:7px;border-radius:8px;background:var(--btn)}
.nozzles div{aspect-ratio:1;border-radius:50%;border:1.5px solid var(--line);background:var(--pan2)}
.nozzles.hf div.full{background:var(--hf);border-color:var(--hf)}.nozzles.hr div.full{background:var(--hr);border-color:var(--hr)}
.nozzles div.act{outline:2px solid var(--amber);outline-offset:1px}
#tip{left:50%;transform:translateX(-50%);bottom:calc(var(--barH,46px) + 94px);padding:6px 10px;font-size:12px;color:var(--mut)}#tip b{color:var(--tx)}
.load-error{position:absolute;inset:0;display:none;place-items:center;text-align:center;padding:24px;color:var(--mut)}
@media (max-width:900px){#hud.now{display:none}}
"""
EXTRA="""<div class="sec"><h3>Live state <span id="live-sub" style="text-transform:none;letter-spacing:0;font-weight:400"></span></h3>
 <div class="stats">
  <div class="stat"><small>Lane 1 placed</small><div class="value"><span id="s-p0">0</span><em class="s-total"></em></div><div class="sub">front head, front feeders</div></div>
  <div class="stat"><small>Lane 2 placed</small><div class="value"><span id="s-p1">0</span><em class="s-total"></em></div><div class="sub">rear head, rear feeders</div></div>
  <div class="stat"><small>Simulated rate</small><div class="value"><span id="s-cph">0</span><em>cph</em></div><div class="sub">slowed down to follow</div></div>
  <div class="stat"><small>Boards out</small><div class="value" id="s-out">0</div><div class="sub" id="s-cycle"></div></div>
 </div>
 <div class="maps">
  <div><h4 class="hf">Lane 1 board <em id="m0-n"></em></h4><canvas id="map0" width="500" height="400"></canvas></div>
  <div><h4 class="hr">Lane 2 board <em id="m1-n"></em></h4><canvas id="map1" width="500" height="400"></canvas></div>
 </div><div class="legend" id="legend"></div></div>
<div class="sec head"><h3>Heads · nozzle occupancy</h3>
 <h4 class="hf">Head F · 16 nozzle <em id="hf-trip"></em></h4><div class="nozzles hf" id="noz-f"></div>
 <h4 class="hr">Head R · 16 nozzle <em id="hr-trip"></em></h4><div class="nozzles hr" id="noz-r"></div>
 <p class="note">Independent mounting: each gantry builds the board on its own lane from the feeder carts on its own side.</p></div>"""
STAGE="""<div id="hud" class="panel now" data-ov="hud">
  <div class="now-row"><span class="chip conv">LANE 1</span><div class="what"><b id="now-c0">Idle</b><code id="cmd-c0"></code></div></div>
  <div class="now-row"><span class="chip hf">HEAD F</span><div class="what"><b id="now-0">Ready</b><code id="cmd-0"></code></div></div>
  <div class="now-row"><span class="chip conv">LANE 2</span><div class="what"><b id="now-c1">Idle</b><code id="cmd-c1"></code></div></div>
  <div class="now-row"><span class="chip hr">HEAD R</span><div class="what"><b id="now-1">Ready</b><code id="cmd-1"></code></div></div>
</div>
<div id="tl" class="panel" data-ov="timeline">
  <div class="timeline" id="timeline" role="slider" tabindex="0" aria-label="Board cycle time"><canvas id="lanes"></canvas><div class="playhead" id="playhead"></div></div>
  <div class="clock mono"><b id="clock-now">0.0</b> / <span id="clock-total">0.0</span> s</div>
  <label class="toggle"><input type="checkbox" id="loop" checked> Loop</label>
</div>
<div class="panel" id="tip" data-ov="hint"><b>Click the dark hood</b> to open the door</div>
<div class="load-error" id="load-error">The 3D view needs WebGL. Try another browser.</div>"""
BAR="""<button id="door-f" type="button" aria-pressed="false">Open front door</button>
<button id="door-r" type="button" aria-pressed="false">Open rear door</button>
<span id="covers" style="display:contents"><span class="lbl">Covers</span><button type="button" data-cover="solid" aria-pressed="true">Solid</button><button type="button" data-cover="ghost">Ghost</button><button type="button" data-cover="off">Off</button></span>
<div class="sep"></div>
<span id="views" style="display:contents"><button type="button" data-view="iso" aria-pressed="true">Iso</button><button type="button" data-view="front">Front</button><button type="button" data-view="side">Side</button><button type="button" data-view="top">Top</button><button type="button" data-view="gantry">Gantry</button><button type="button" data-view="board">Boards</button><button type="button" data-view="pickf">Nozzle F</button><button type="button" data-view="pickr">Nozzle R</button></span>
<div class="sep"></div>
<button id="play" type="button" aria-label="Pause" style="padding:5px 9px"><svg id="play-icon" viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg></button>
<button id="restart" type="button" aria-label="Restart">Restart</button>
<span id="speeds" style="display:contents"><button type="button" data-speed="0.25">¼×</button><button type="button" data-speed="0.5" aria-pressed="true">½×</button><button type="button" data-speed="1">1×</button><button type="button" data-speed="2">2×</button><button type="button" data-speed="5">5×</button></span>
<label class="toggle"><input type="checkbox" id="trail"> Path</label>"""
html=page(dict(title='PLACEMENT — dual-lane pick-and-place · SMT line simulation',fn='PLACEMENT',
  sub='Dual-lane, dual-gantry pick-and-place. Each 16-nozzle head picks from the feeder carts on its own side and builds the board on its own lane; boards arrive printed from the SPI and leave to the reflow oven.',
  overlays=[('title','Machine title',True),('cycle','Cycle time',True),('hud','Head / lane status',True),('timeline','Cycle timeline',True),('hint','Mouse hint',True)],
  specs=[('Footprint','1280 × 2332 × 1444 mm'),('Lanes / heads','2 / 2 (16 nozzles each)'),('Max speed','42 000 cph (class)'),('Accuracy','± 40 µm / chip'),('PCB, dual lane','50 × 50 – 750 × 260 mm'),('Feeders','4 carts × 30 slots (8 mm)'),('Demo board','250 × 200 mm, 289 parts')],
  extra_side=EXTRA,stage_html=STAGE,toolbar=BAR,libs='',script='<script>\n'+bundle+'\n</script>',css=CSS))
# the toolbar uses aria-pressed instead of .on — mirror it
html=html.replace('#bar button.on{','#bar button.on,#bar button[aria-pressed="true"]{')
open('/home/user/smt_placement.html','w',encoding='utf-8').write(html);print('/home/user/smt_placement.html',len(html)//1024,'KB')
