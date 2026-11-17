import { makePCBKit } from "./pcbkit.mjs";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import * as BGU from "three/addons/utils/BufferGeometryUtils.js";
const SMT = window.SMT;

const $ = (id) => document.getElementById(id);
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, s) => a + (b - a) * s;
const ease = (s) => s * s * s * (10 + s * (6 * s - 15));
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

// ================================================================ machine layout (metres, z up, x = board travel, front of machine at -y)
// Dual lane, independent mounting: lane 1 (front) is built by head F from the front feeder carts, lane 2 (rear) by head R from the rear carts.
const Z = { deck: 0.80, pcb: 0.9016, rest: 0.946, tape: 0.9003 };   // board top 901.6 mm, as in every machine of the line
const Y = { feed: 0.47, cam: 0.34 };
const LANE = [-0.170, 0.170];   // lane 1 (front) at +170 mm, lane 2 at -170 mm in line coordinates
const BOARD = { L: 0.25, W: 0.20, T: 0.0016, xQ: -1.5, xIn: -1.0, xOut: 1.0, xGone: 1.5, tMove: 1.4, tClamp: 0.25 };
const T = { pick: 0.07, place: 0.08, scan: 0.24 };
const NOZ = 16;
const OFF = Array.from({ length: NOZ }, (_, k) => [((k % 8) - 3.5) * 0.018, (Math.floor(k / 8) - 0.5) * 0.022]);   // nozzle offsets from head centre
const HEADS = [{ id: "f", name: "Head F", side: -1 }, { id: "r", name: "Head R", side: 1 }];
// ---------------------------------------------------------------- the shared line PCB (same board model as every other machine)
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

// ================================================================ schedule: every motion as a segment on a lane-local time axis, so the cycle can be scrubbed
let segs = [[], []], conv = [], DURATION = 1, tOut = 0, PHASE = [0, 0];
const mm = (v) => (v * 1000 >= 0 ? "+" : "") + (v * 1000).toFixed(1);
function schedule() {
  segs = [[], []]; let end = 0; const tcs = [0, 0];
  const nz = (k) => "N" + String(k + 1).padStart(2, "0");
  for (const h of [0, 1]) {
    const side = HEADS[h].side, list = segs[h]; let cur = [0, side * Y.cam], tc = 0;
    const push = (dur, kind, to, x = {}) => { const a = cur.slice(), b = to ? to.slice() : a; const s = { t0: tc, t1: tc + dur, kind, a, b, k: -1, trip: 0, zt: 0, label: "", cmd: "", ...x }; list.push(s); tc = s.t1; cur = b; return s; };
    const go = (to, x) => { const d = Math.hypot(to[0] - cur[0], to[1] - cur[1]); if (d < 1e-6) return; push(0.03 + 0.25 * Math.sqrt(d), "move", to, { cmd: `MOVE X${mm(to[0])} Y${mm(to[1])}`, ...x }); };
    for (let r = 0; r < TRIPS; r++) {
      const mine = comps.filter((c) => c.head === h && c.trip === r);
      for (const c of mine.slice().sort((p, q) => (p.src.x - OFF[p.k][0]) - (q.src.x - OFF[q.k][0]))) {
        const o = OFF[c.k];
        go([c.src.x - o[0], c.src.y - o[1]], { trip: r, label: "Travel to " + c.src.name });
        const s = push(T.pick, "pick", null, { k: c.k, trip: r, zt: c.src.z + c.h, label: `Pick ${c.place.name} from feeder ${c.src.name}`, cmd: `PICK ${nz(c.k)} <- ${c.src.name}  VAC ON` });
        c.tPick = (s.t0 + s.t1) / 2;
      }
      const sg = cur[0] >= 0 ? 1 : -1;
      go([sg * 0.11, side * Y.cam], { trip: r, label: "Travel to line camera" });
      push(T.scan, "scan", [-sg * 0.11, side * Y.cam], { trip: r, label: "Recognise parts on the fly", cmd: `SCAN LINE-CAM  ${mine.length} parts` });
      const ready = BOARD.tMove + BOARD.tClamp;
      if (tc < ready) push(ready - tc, "wait", null, { trip: r, label: "Wait: board transfer", cmd: "WAIT BOARD" });
      for (const c of mine.slice().sort((p, q) => p.u - q.u)) {
        const o = OFF[c.k];
        go([c.u - o[0], LANE[h] + c.v - o[1]], { trip: r, label: "Travel to placement" });
        const s = push(T.place, "place", null, { k: c.k, trip: r, zt: Z.pcb + c.h, label: `Place ${c.place.name}`, cmd: `PLACE ${nz(c.k)} X${mm(c.u)} Y${mm(c.v)} R${Math.round(c.rot * 180 / Math.PI)}  VAC OFF` });
        c.tPlace = (s.t0 + s.t1) / 2;
      }
    }
    go([0, side * Y.cam], { trip: TRIPS - 1, label: "Retreat from board" });
    tcs[h] = tc; end = Math.max(end, tc);
  }
  tOut = end + 0.1; DURATION = tOut + BOARD.tMove; PHASE = [0, DURATION * 0.42];
  for (const h of [0, 1]) segs[h].push({ t0: tcs[h], t1: DURATION, kind: "wait", a: [0, HEADS[h].side * Y.cam], b: [0, HEADS[h].side * Y.cam], k: -1, trip: TRIPS - 1, zt: 0, label: "Idle: board transfer", cmd: "" });
  const c0 = BOARD.tMove, c1 = c0 + BOARD.tClamp;
  conv = [
    { t0: 0, t1: c0, kind: "in", label: "Transfer board in", cmd: "CONV FWD  stopper UP" },
    { t0: c0, t1: c1, kind: "clamp", label: "Clamp board, read fiducials", cmd: "CLAMP ON" },
    { t0: c1, t1: tOut, kind: "hold", label: "Board clamped", cmd: "HOLD" },
    { t0: tOut, t1: DURATION, kind: "out", label: "Transfer board out", cmd: "CLAMP OFF  CONV FWD" },
  ];
}
schedule();
const local = (h, t) => ((t - PHASE[h]) % DURATION + DURATION) % DURATION;   // lane 2 runs out of step with lane 1
function segAt(list, t) { let lo = 0, hi = list.length - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (list[m].t1 <= t) lo = m + 1; else hi = m; } return list[lo]; }
function headPose(h, tl) {
  const s = segAt(segs[h], tl), f = s.t1 > s.t0 ? clamp((tl - s.t0) / (s.t1 - s.t0), 0, 1) : 1;
  const e = s.kind === "move" ? ease(f) : f;
  return { x: lerp(s.a[0], s.b[0], e), y: lerp(s.a[1], s.b[1], e), seg: s, f };
}
const tipZ = (pose, k) => (pose.seg.k === k && (pose.seg.kind === "pick" || pose.seg.kind === "place")) ? Z.rest - Math.sin(Math.PI * pose.f) * (Z.rest - pose.seg.zt) : Z.rest;
function boardX(tl) {
  if (tl < BOARD.tMove) return lerp(BOARD.xIn, 0, ease(tl / BOARD.tMove));
  if (tl > tOut) return lerp(0, BOARD.xOut, ease(clamp((tl - tOut) / BOARD.tMove, 0, 1)));
  return 0;
}

// ================================================================ scene
const viewport = SMT.stage();
const renderer = new THREE.WebGLRenderer({ canvas: $("c"), antialias: true, powerPreference: "high-performance" });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(34, 1, 2, 60000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.1; controls.minDistance = 40; controls.maxDistance = 14000; controls.maxPolarAngle = Math.PI * 0.52; controls.zoomSpeed = 1.2;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.03).texture;
scene.environmentIntensity = 0.45;
const sun = new THREE.DirectionalLight(0xfff6ea, 1.5);
sun.position.set(2600, 5200, 3600); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0003; sun.shadow.normalBias = 4;
Object.assign(sun.shadow.camera, { left: -2600, right: 2600, top: 2600, bottom: -2600, near: 500, far: 12000 });
scene.add(sun, sun.target); sun.target.position.set(0, 600, 0);
const hemi = new THREE.HemisphereLight(0xffffff, 0x8a8f96, 0.25); scene.add(hemi);
const world = new THREE.Group(); world.rotation.x = -Math.PI / 2; world.scale.setScalar(1000); scene.add(world);   // z-up machine frame in metres, scaled to the line's millimetres
const w2t = (x, y, z) => new THREE.Vector3(x * 1000, z * 1000, -y * 1000);   // machine metres (z up) -> line millimetres (y up)
for (const y of [-0.3, 0.3]) { const p = new THREE.PointLight(0xeaf2ff, 0.9 * Math.pow(1000, 1.4), 1800, 1.4); p.position.set(0, y, 1.38); world.add(p); }   // work-area lighting under the hood

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0, ...o });
const M = {
  floor: std(0xb9b7b3, { roughness: 0.9 }),
  white: std(0xe3e5e7, { roughness: 0.42 }), inner: std(0x2a2d32, { roughness: 0.55, metalness: 0.2 }), dark: std(0x33373d, { roughness: 0.6 }), black: std(0x121316, { roughness: 0.7 }),
  grey: std(0x9aa1a8, { roughness: 0.5 }), steel: std(0xc6cacf, { roughness: 0.28, metalness: 0.9 }), alu: std(0xd5d8dc, { roughness: 0.4, metalness: 0.7 }),
  blue: std(0x0a57a4, { roughness: 0.4 }), yellow: std(0xf2c300, { roughness: 0.5 }), red: std(0xc8201c, { roughness: 0.45 }), green: std(0x1f9a46, { roughness: 0.45 }),
  beam: std(0x1d2024, { roughness: 0.45, metalness: 0.35 }), magnet: std(0x3a3e45, { roughness: 0.3, metalness: 0.7 }), headCover: std(0xdfe1e3, { roughness: 0.4 }),
  feeder: std(0xc9cdd2, { roughness: 0.4, metalness: 0.55 }), feederCap: std(0x1c1e22, { roughness: 0.5 }), reel: std(0xf4f4f1, { roughness: 0.6 }),
  tapeW: std(0xe9e4d6, { roughness: 0.8 }), tapeB: std(0x1c1d20, { roughness: 0.6 }), pocket: std(0x0c0c0e, { roughness: 0.9 }),
  pcbEdge: std(0x0c4a27, { roughness: 0.6 }), pad: std(0xcdbb86, { roughness: 0.35, metalness: 0.8, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
  term: std(0xd4d7da, { roughness: 0.3, metalness: 0.85 }), ic: std(0x1a1b1e, { roughness: 0.45 }),
  rubber: std(0x18191b, { roughness: 0.85 }),
  coverWhite: std(0xe6e8ea, { roughness: 0.4, side: THREE.DoubleSide }), coverBlack: std(0x17191c, { roughness: 0.45 }),
  coverGlass: std(0x0b1015, { roughness: 0.06, metalness: 0.2, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }),
  lampR: std(0x5a1512, { emissive: 0xff2a1e, emissiveIntensity: 0 }), lampY: std(0x5a4a10, { emissive: 0xffc21e, emissiveIntensity: 0 }), lampG: std(0x0f4a1c, { emissive: 0x25e05a, emissiveIntensity: 0 }),
  camGlass: [0, 1].map(() => std(0x0a0c10, { roughness: 0.1, emissive: 0xbfe4ff, emissiveIntensity: 0.05 })),
};
const UNIT = new THREE.BoxGeometry(1, 1, 1);
function mesh(geo, m, parent = world, shadow = true) { const o = new THREE.Mesh(geo, m); o.castShadow = o.receiveShadow = shadow; parent.add(o); return o; }
function box(w, d, h, m, x, y, z, parent, shadow) { const o = mesh(UNIT, m, parent, shadow); o.scale.set(w, d, h); o.position.set(x, y, z); return o; }
function vcyl(r, h, m, x, y, z, parent, seg = 24, shadow) { const g = new THREE.CylinderGeometry(r, r, h, seg); g.rotateX(Math.PI / 2); const o = mesh(g, m, parent, shadow); o.position.set(x, y, z); return o; }
function xcyl(r, len, m, x, y, z, parent, seg = 24) { const g = new THREE.CylinderGeometry(r, r, len, seg); g.rotateZ(Math.PI / 2); const o = mesh(g, m, parent); o.position.set(x, y, z); return o; }
function ycyl(r, len, m, x, y, z, parent, seg = 24) { const o = mesh(new THREE.CylinderGeometry(r, r, len, seg), m, parent, false); o.position.set(x, y, z); return o; }
function inst(geo, mat, list, parent = world, shadow = true) {
  const m = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D(), c = new THREE.Color();
  list.forEach((it, i) => { o.position.set(it.p[0], it.p[1], it.p[2]); o.scale.set(...(it.s || [1, 1, 1])); o.rotation.set(0, 0, it.r || 0); o.updateMatrix(); m.setMatrixAt(i, o.matrix); if (it.c !== undefined) m.setColorAt(i, c.set(it.c)); });
  m.castShadow = m.receiveShadow = shadow; parent.add(m); return m;
}
function labelPlane(text, w, h, o = {}) {   // vertical plane facing -y
  const c = document.createElement("canvas"); c.width = 1024; c.height = Math.round(1024 * h / w);
  const g = c.getContext("2d"); g.fillStyle = o.bg || "#17191c"; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = o.fg || "#fff"; g.font = `700 ${Math.round(c.height * 0.62)}px "Segoe UI", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.fillText(text, c.width / 2, c.height * 0.54);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.45 })); p.rotation.x = Math.PI / 2; return p;
}
const YZ_TO_WORLD = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));   // shape (y, z) extruded along x
function extrudeYZ(shape, thick, m, x, parent) { const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: false, curveSegments: 20 }); geo.applyMatrix4(YZ_TO_WORLD); const o = mesh(geo, m, parent); o.position.x = x - thick / 2; return o; }

// ---------------------------------------------------------------- floor
const floorMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82 });
{ const f = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000), floorMat); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; scene.add(f);
  const lt = canvasTex(64, 64, (g) => { g.fillStyle = "#e8b923"; g.fillRect(0, 0, 64, 64); });
  for (const z of [1250, -1250]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(4600, 60), new THREE.MeshBasicMaterial({ map: lt, transparent: true, opacity: 0.55 })); m.rotation.x = -Math.PI / 2; m.position.set(0, 1, z); scene.add(m); } }
const floorTex = (dark) => { const t = canvasTex(512, 512, (g, W, H) => { g.fillStyle = dark ? "#232a34" : "#d5dae0"; g.fillRect(0, 0, W, H); g.strokeStyle = dark ? "rgba(255,255,255,.055)" : "rgba(0,0,0,.07)"; g.lineWidth = 2; g.strokeRect(0, 0, W, H); }, { repeat: true }); t.repeat.set(40, 40); return t; };
const stubMat = new THREE.MeshStandardMaterial({ color: 0x2b323d, roughness: 0.75, metalness: 0.1 });
function sceneLabel(text, w, h, x, y, z) { const t = canvasTex(900, Math.round(900 * h / w), (g, W, H) => { g.fillStyle = "#1e6fd9"; g.fillRect(0, 0, W, H); g.fillStyle = "#fff"; g.font = `700 ${Math.round(H * 0.46)}px "Segoe UI", Arial, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, W / 2, H / 2 + H * 0.04); });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); scene.add(m); }
for (const s of [-1, 1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(640, 1000, 800), stubMat); st.position.set(s * 1980, 500, 0); st.castShadow = st.receiveShadow = true; scene.add(st);
  sceneLabel(s < 0 ? "FROM SPI  ▶" : "▶  TO REFLOW", 560, 78, s * 1980, 1001, 310); }

// ---------------------------------------------------------------- base, side frames, Y rails (dark machine interior)
box(1.18, 0.88, 0.70, M.inner, 0, 0, 0.45);
for (const sx of [-1, 1]) for (const sy of [-1, 1]) { vcyl(0.035, 0.10, M.dark, sx * 0.52, sy * 0.38, 0.05); vcyl(0.055, 0.015, M.steel, sx * 0.52, sy * 0.38, 0.0075); }
box(1.18, 0.86, 0.004, M.black, 0, 0, 0.802);
for (const sx of [-1, 1]) {
  box(0.012, 0.88, 0.78, M.white, sx * 0.645, 0, 0.47);                                   // lower side skirt
  for (const sy of [-1, 1]) box(0.05, 0.42, 1.02, M.inner, sx * 0.615, sy * 0.51, 0.61);   // side-frame pillars
  box(0.05, 0.60, 0.76, M.inner, sx * 0.615, 0, 0.48);
  box(0.05, 0.60, 0.12, M.inner, sx * 0.615, 0, 1.06);
  box(0.035, 1.44, 0.02, M.magnet, sx * 0.615, 0, 1.13);                                  // Y linear-motor rail
  box(0.008, 1.44, 0.012, M.steel, sx * 0.598, 0, 1.146);
}

// ---------------------------------------------------------------- dual-lane conveyor (runs through the machine and onto line stubs on both sides)
for (const yc of LANE) {
  for (const s of [-1, 1]) {
    box(3.30, 0.012, 0.035, M.alu, 0, yc + s * 0.107, 0.8905);
    box(3.30, 0.004, 0.002, M.rubber, 0, yc + s * 0.099, 0.8974, world, false);
    for (const x of [-0.45, 0, 0.45]) box(0.03, 0.012, 0.075, M.dark, x, yc + s * 0.107, 0.8375);
  }
  box(0.27, 0.18, 0.01, M.black, 0, yc, 0.86);
  for (const x of [-0.1, 0, 0.1]) for (const y of [-0.06, 0.06]) vcyl(0.003, 0.0334, M.steel, x, yc + y, 0.8817, world, 10, false);   // board support pins
  for (const sx of [-1, 1]) { box(0.012, 0.03, 0.03, M.yellow, sx * 0.135, yc + 0.09, 0.884, world, false); }                         // board stoppers
}
for (const x of [-1.55, -0.95, 0.95, 1.55]) {
  box(0.04, 0.64, 0.03, M.grey, x, 0, 0.858);
  for (const sy of [-1, 1]) { box(0.04, 0.04, 0.845, M.grey, x, sy * 0.30, 0.4225); box(0.10, 0.10, 0.012, M.dark, x, sy * 0.30, 0.006); }
}
for (const sx of [-1, 1]) for (const sy of [-1, 1]) box(0.64, 0.03, 0.03, M.grey, sx * 1.25, sy * 0.30, 0.30);

// ---------------------------------------------------------------- line cameras and nozzle changers
for (const h of [0, 1]) {
  const s = HEADS[h].side;
  box(0.07, 0.13, 0.085, M.dark, 0, s * Y.cam, 0.8445);
  box(0.014, 0.10, 0.002, M.camGlass[h], 0, s * Y.cam, 0.888, world, false);
  box(0.13, 0.05, 0.03, M.steel, -0.24, s * Y.cam, 0.819);
  for (let i = 0; i < 6; i++) vcyl(0.005, 0.004, M.black, -0.29 + i * 0.02, s * Y.cam, 0.8345, world, 12, false);
  box(0.10, 0.07, 0.05, M.dark, 0.26, s * Y.cam, 0.829); box(0.08, 0.05, 0.002, M.black, 0.26, s * Y.cam, 0.855, world, false);   // reject box
}

// ---------------------------------------------------------------- feeder banks: four 30-slot carts
const blades = [], caps = [], reels = [], hubs = [], tapesW = [], shutters = [], holes = [];
for (const s of [-1, 1]) for (const cart of [-1, 1]) {
  const cx = cart * FEED.cart;
  for (let i = 0; i < 30; i++) {
    const x = slotX(cart, i);
    blades.push({ p: [x, s * 0.72, 0.845], s: [FEED.bw, 0.56, 0.11] });
    caps.push({ p: [x, s * 0.965, 0.925], s: [FEED.bw, 0.07, 0.05] });
    const ry = s * (i % 2 ? 0.985 : 0.82), rz = i % 2 ? 0.58 : 0.66;
    reels.push({ p: [x, ry, rz], s: [0.010, 1, 1], c: i % 7 === 3 ? 0xa9cbee : 0xf4f4f1 }); hubs.push({ p: [x, ry, rz], s: [0.012, 0.33, 0.33] });
    tapesW.push({ p: [x, s * 0.53, 0.9001], s: [0.008, 0.14, 0.0004] });
    shutters.push({ p: [x, s * 0.56, 0.9012], s: [FEED.bw * 0.92, 0.10, 0.002] });
    for (let j = 0; j < 5; j++) holes.push({ p: [x - 0.0052, s * (0.462 + j * 0.004), 0.90035], s: [0.0009, 0.0009, 0.0001] });
  }
  box(0.54, 0.62, 0.04, M.dark, cx, s * 0.84, 0.16);                                   // cart deck
  box(0.54, 0.02, 0.05, M.dark, cx, s * 0.56, 0.765);
  for (const sx of [-1, 1]) {
    for (const yy of [0.56, 1.12]) { box(0.02, 0.02, 0.62, M.steel, cx + sx * 0.262, s * yy, 0.47); xcyl(0.04, 0.03, M.rubber, cx + sx * 0.23, s * (yy < 1 ? 0.60 : 1.08), 0.04); }
    box(0.02, 0.58, 0.02, M.steel, cx + sx * 0.262, s * 0.84, 0.77); box(0.02, 0.58, 0.02, M.steel, cx + sx * 0.262, s * 0.84, 0.44);
    box(0.02, 0.06, 0.02, M.dark, cx + sx * 0.25, s * 1.14, 0.80);
  }
  xcyl(0.012, 0.52, M.steel, cx, s * 1.155, 0.80);
}
inst(UNIT, M.feeder, blades); inst(UNIT, M.feederCap, caps);
const reelGeo = new THREE.CylinderGeometry(0.09, 0.09, 1, 32); reelGeo.rotateZ(Math.PI / 2);
inst(reelGeo, M.reel, reels); inst(reelGeo, M.dark, hubs, world, false);
inst(UNIT, M.tapeW, tapesW, world, false); inst(UNIT, M.steel, shutters, world, false); inst(UNIT, M.pocket, holes, world, false);

// ---------------------------------------------------------------- components (shared line PCB parts, built in millimetres, y up)
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

// ---------------------------------------------------------------- gantries and heads
const rigs = HEADS.map((H, h) => {
  const s = H.side, beam = new THREE.Group(), g = new THREE.Group(); world.add(beam, g);
  box(1.19, 0.10, 0.13, M.beam, 0, s * 0.115, 1.235, beam);
  box(1.10, 0.006, 0.016, M.steel, 0, s * 0.063, 1.275, beam); box(1.10, 0.006, 0.016, M.steel, 0, s * 0.063, 1.195, beam);   // X linear guides
  box(1.10, 0.004, 0.04, M.magnet, 0, s * 0.064, 1.235, beam);                                                              // X linear-motor magnets
  box(1.10, 0.102, 0.012, M.yellow, 0, s * 0.115, 1.302, beam, false);                                                       // caution strip, as on the real beam
  for (const sx of [-1, 1]) box(0.07, 0.16, 0.05, M.dark, sx * 0.615, s * 0.115, 1.165, beam);
  box(1.0, 0.05, 0.02, M.black, 0, s * 0.135, 1.318, beam);                                                                  // cable chain
  box(0.16, 0.10, 0.20, M.inner, 0, s * 0.01, 1.18, g);
  box(0.164, 0.104, 0.03, M.headCover, 0, s * 0.01, 1.295, g);
  box(0.06, 0.004, 0.035, M.yellow, 0.03, -s * 0.041, 1.22, g, false);
  box(0.12, 0.004, 0.07, M.black, 0, -s * 0.041, 1.14, g, false);
  box(0.16, 0.07, 0.05, M.dark, 0, 0, 1.055, g);
  vcyl(0.012, 0.06, M.black, -0.094, 0, 1.06, g); vcyl(0.009, 0.004, M.camGlass[h], -0.094, 0, 1.028, g, 16, false);       // board (fiducial) camera
  const noz = OFF.map(([ox, oy]) => {
    const n = new THREE.Group(); n.position.set(ox, oy, Z.rest); g.add(n);
    vcyl(0.0032, 0.125, M.steel, 0, 0, 0.0775, n, 12);
    vcyl(0.0046, 0.012, M.dark, 0, 0, 0.021, n, 12);
    const tip = new THREE.CylinderGeometry(0.0022, 0.0007, 0.015, 12); tip.rotateX(Math.PI / 2); mesh(tip, M.black, n).position.z = 0.0075;
    return n;
  });
  const path = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ transparent: true, opacity: 0.8 })); path.position.z = 1.0; world.add(path);
  const trips = Array.from({ length: TRIPS }, (_, r) => { const pts = []; for (const sg of segs[h]) if (sg.trip === r && sg.kind !== "wait") { if (!pts.length) pts.push(new THREE.Vector3(sg.a[0], sg.a[1], 0)); pts.push(new THREE.Vector3(sg.b[0], sg.b[1], 0)); } return pts; });
  return { beam, g, noz, path, trips, shown: -1 };
});

// ---------------------------------------------------------------- covers, modelled on the real machine: white body, curved dark hood door on each
// operating side, white operator column with monitor and buttons beside it, feeder carts docking underneath.
const covers = new THREE.Group(); world.add(covers);
const coverMeshes = [], doors = [];
const cov = (o) => { coverMeshes.push(o); return o; };
const R = 0.26, YH = 0.50, ZT = 1.44;   // hood radius, hinge line y, top z
for (const sx of [-1, 1]) {   // side walls with the conveyor opening
  const sh = new THREE.Shape(); sh.moveTo(-(YH + R), 0.86); sh.lineTo(-(YH + R), ZT - R); sh.absarc(-YH, ZT - R, R, Math.PI, Math.PI / 2, true);
  sh.lineTo(YH, ZT); sh.absarc(YH, ZT - R, R, Math.PI / 2, 0, true); sh.lineTo(YH + R, 0.86); sh.lineTo(0.30, 0.86); sh.lineTo(0.30, 0.99); sh.lineTo(-0.30, 0.99); sh.lineTo(-0.30, 0.86); sh.closePath();
  cov(extrudeYZ(sh, 0.012, M.coverWhite, sx * 0.645, covers));
}
cov(box(1.302, YH * 2, 0.012, M.coverWhite, 0, 0, ZT - 0.006, covers));
function quarterGeo(len, n = 18) {   // quarter-cylinder shell in door coordinates: hinge at the origin, sweeping out to (-R, -R)
  const g = new THREE.PlaneGeometry(len, 1, 1, n), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const a = (0.5 - p.getY(i)) * Math.PI / 2; p.setY(i, -R * Math.sin(a)); p.setZ(i, -R + R * Math.cos(a)); }
  g.computeVertexNormals(); return g;
}
const spandrel = () => { const sh = new THREE.Shape(); sh.moveTo(-YH, ZT); sh.lineTo(-(YH + R), ZT); sh.lineTo(-(YH + R), ZT - R); sh.absarc(-YH, ZT - R, R, Math.PI, Math.PI / 2, true); sh.closePath(); return sh; };
const faces = [0, 1].map((i) => {
  const f = new THREE.Group(); f.rotation.z = i * Math.PI; covers.add(f);   // the rear face is the front one turned half a turn
  // hood door: x -0.60 .. 0.30, hinged along the top edge
  const d = new THREE.Group(); d.position.set(-0.15, -YH, ZT); f.add(d);
  const glass = cov(mesh(quarterGeo(0.90), M.coverGlass, d, false));
  const band = cov(box(0.90, 0.014, 0.14, M.coverBlack, 0, -R, -R - 0.07, d));
  const rim = [cov(box(0.90, 0.02, 0.014, M.coverWhite, 0, -0.008, -0.004, d)), cov(box(0.018, 0.016, 0.14, M.coverWhite, -0.445, -R, -R - 0.07, d)), cov(box(0.018, 0.016, 0.14, M.coverWhite, 0.445, -R, -R - 0.07, d))];
  const handle = xcyl(0.010, 0.36, M.steel, 0, -R - 0.03, -R - 0.105, d);
  for (const hx of [-0.17, 0.17]) box(0.016, 0.03, 0.016, M.steel, hx, -R - 0.016, -R - 0.105, d);
  const lab = labelPlane("PLACEMENT", 0.40, 0.075, { bg: "#1e6fd9" }); lab.position.set(-0.20, -R - 0.0075, -R - 0.07); d.add(lab);
  doors.push({ g: d, open: false, a: 0, pick: [glass, band, handle, ...rim] });
  // operator column: front panel, roof and the closing pieces above the hood curve
  cov(box(0.345, 0.05, 0.44, M.coverWhite, 0.4725, -(YH + R) - 0.025, 1.22, f));
  cov(box(0.345, R + 0.05, 0.012, M.coverWhite, 0.4725, -YH - (R + 0.05) / 2, ZT - 0.006, f));
  cov(extrudeYZ(spandrel(), 0.012, M.coverWhite, 0.306, f)); cov(extrudeYZ(spandrel(), 0.012, M.coverWhite, 0.639, f));
  // lower side columns either side of the feeder carts
  for (const sx of [-1, 1]) cov(box(0.075, 0.34, 0.92, M.coverWhite, sx * 0.6075, -0.61, 0.54, f));
  // monitor, buttons, emergency stop (always opaque)
  box(0.27, 0.03, 0.21, M.white, 0.47, -(YH + R) - 0.065, 1.31, f);
  const c = document.createElement("canvas"); c.width = 640; c.height = 480; const g = c.getContext("2d");
  g.fillStyle = "#0d1722"; g.fillRect(0, 0, 640, 480); g.fillStyle = "#1e6fd9"; g.fillRect(0, 0, 640, 56);
  g.fillStyle = "#fff"; g.font = "700 30px Segoe UI, Arial"; g.fillText("PLACEMENT   PRODUCTION", 20, 38);
  g.fillStyle = "#25e05a"; g.fillRect(20, 80, 180, 60); g.fillStyle = "#06260f"; g.font = "700 34px Segoe UI, Arial"; g.fillText("RUN", 74, 122);
  g.fillStyle = "#9fb4c8"; g.font = "22px Consolas, monospace"; ["PROGRAM  SMT-DEMO REV C", "MODE     DUAL / INDEPENDENT", i ? "HEAD R   16NH   LANE 2" : "HEAD F   16NH   LANE 1", "FEEDER   120 / 120"].forEach((t, j) => g.fillText(t, 230, 100 + j * 34));
  g.strokeStyle = "#2a4257"; g.strokeRect(20, 250, 600, 210); g.fillStyle = "#0e5a30"; g.fillRect(40, 275, 260, 70); g.fillRect(40, 365, 260, 70);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace;
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.18), new THREE.MeshBasicMaterial({ map: tx })); scr.rotation.x = Math.PI / 2; scr.position.set(0.47, -(YH + R) - 0.0805, 1.31); f.add(scr);
  const yb = -(YH + R) - 0.052;
  ycyl(0.028, 0.006, M.yellow, 0.52, yb, 1.13, f); ycyl(0.018, 0.03, M.red, 0.52, yb - 0.012, 1.13, f);
  [[0.40, M.green], [0.44, M.white], [0.40, M.black], [0.44, M.blue]].forEach(([x, m], j) => ycyl(0.011, 0.012, m, x, yb, j < 2 ? 1.15 : 1.11, f));
  for (let j = 0; j < 3; j++) ycyl(0.012, 0.01, [M.green, M.black, M.blue][j], -0.6075, -0.782, 0.62 - j * 0.05, f);
  box(0.05, 0.002, 0.03, M.yellow, -0.6075, -0.781, 0.80, f, false);
  return f;
});
const tower = new THREE.Group(); covers.add(tower);
vcyl(0.012, 0.10, M.steel, 0.55, -0.62, 1.49, tower);
vcyl(0.026, 0.04, M.lampG, 0.55, -0.62, 1.56, tower); vcyl(0.026, 0.04, M.lampY, 0.55, -0.62, 1.60, tower); vcyl(0.026, 0.04, M.lampR, 0.55, -0.62, 1.64, tower); vcyl(0.027, 0.008, M.dark, 0.55, -0.62, 1.664, tower);
let coverMode = "solid";
const tipVisible = () => { $("tip").style.display = coverMode === "solid" && !doors.some((d) => d.open) ? "" : "none"; };
function setCovers(mode) {
  coverMode = mode; covers.visible = mode !== "off";
  const ghost = mode === "ghost";
  for (const m of [M.coverWhite, M.coverBlack]) { m.transparent = ghost; m.opacity = ghost ? 0.10 : 1; m.depthWrite = !ghost; m.needsUpdate = true; }
  M.coverGlass.opacity = ghost ? 0.08 : 0.5;
  for (const o of coverMeshes) o.castShadow = !ghost && o.material !== M.coverGlass;
  document.querySelectorAll("#covers button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cover === mode)));
  tipVisible();
}
function setDoor(i, open) {
  doors[i].open = open;
  const b = $(i ? "door-r" : "door-f"); b.setAttribute("aria-pressed", String(open)); b.textContent = (open ? "Close " : "Open ") + (i ? "rear" : "front") + " door";
  tipVisible();
}

// ================================================================ camera views
const VIEWS = {
  iso: { p: [-2.9, -3.3, 2.5], t: [0, 0, 0.8] }, front: { p: [0, -5.0, 1.3], t: [0, 0, 0.85] }, side: { p: [5.2, 0, 1.3], t: [0, 0, 0.85] }, top: { p: [0, -0.02, 6.0], t: [0, 0, 0.8] },
  gantry: { p: [-0.95, -1.95, 1.75], t: [-0.12, -0.15, 0.98], door: 0 }, board: { p: [0.30, -0.95, 1.13], t: [0, -0.15, 0.9], door: 0 },
  pickf: { p: [-0.16, -0.36, 0.13], t: [0, 0, 0], follow: 0, door: 0 }, pickr: { p: [0.16, 0.36, 0.13], t: [0, 0, 0], follow: 1, door: 1 },
};
let follow = -1;
const lastTarget = new THREE.Vector3();
function setView(name) {
  const v = VIEWS[name]; follow = v.follow ?? -1;
  if (v.door !== undefined && coverMode === "solid") setDoor(v.door, true);
  if (follow >= 0) { const p = headPose(follow, local(follow, time)); lastTarget.copy(w2t(p.x, p.y, 0.95)); controls.target.copy(lastTarget); camera.position.copy(lastTarget).add(w2t(...v.p)); }
  else { camera.position.copy(w2t(...v.p)); controls.target.copy(w2t(...v.t)); }
  controls.update();
  document.querySelectorAll("#views button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === name)));
}
function resize() { const [w, h] = SMT.size(); if (!w || !h) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); drawLanes(); }

// ================================================================ UI
let time = 0, elapsed = 0, playing = true, speed = 0.5;
const perBoard = JOB.length;
document.querySelectorAll(".s-total").forEach((e) => { e.textContent = "/ " + perBoard; });
$("s-cycle").textContent = "board cycle " + DURATION.toFixed(1) + " s per lane"; $("clock-total").textContent = DURATION.toFixed(1);
const CPH = Math.round(2 * JOB.length / DURATION * 3600);
SMT.cycle(DURATION.toFixed(1) + " s", "per board per lane · " + JOB.length + " parts · " + Math.round(2 * 3600 / DURATION) + " boards/h on 2 lanes", "CYCLE TIME · BOARD");
$("s-cph").textContent = Math.round(2 * perBoard / DURATION * 3600).toLocaleString("en").replace(/,/g, " ");
$("live-sub").textContent = perBoard + " parts / board";
const nozEls = [$("noz-f"), $("noz-r")].map((el) => Array.from({ length: NOZ }, () => el.appendChild(document.createElement("div"))));
$("legend").innerHTML = Object.keys(KINDLBL).map((k) => `<span><i style="background:${KINDCOL[k]}"></i>${KINDLBL[k]}</span>`).join("");
const byPlace = [0, 1].map((h) => comps.filter((c) => c.head === h).sort((a, b) => a.tPlace - b.tPlace));
const mapKey = [-1, -1];
function drawMap(h, placed) {
  if (placed === mapKey[h]) return; mapKey[h] = placed;
  const c = $("map" + h), g = c.getContext("2d"), k = c.width / BOARD.L;
  g.fillStyle = "#0e5a30"; g.fillRect(0, 0, c.width, c.height);
  byPlace[h].forEach((p, i) => {
    const x = (p.u + BOARD.L / 2 - p.hw) * k, y = (BOARD.W / 2 - p.v - p.hh) * k, w = Math.max(3, p.hw * 2 * k), hh = Math.max(3, p.hh * 2 * k);
    if (i < placed) { g.fillStyle = KINDCOL[p.kind]; g.fillRect(x, y, w, hh); g.strokeStyle = "rgba(255,255,255,.55)"; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, hh - 1); }
    else { g.fillStyle = "rgba(205,187,134,.45)"; g.fillRect(x, y, w, hh); }
  });
  $("m" + h + "-n").textContent = placed + " / " + perBoard;
}
function drawLanes() {
  const c = $("lanes"), r = c.getBoundingClientRect(), d = devicePixelRatio || 1; if (!r.width) return;
  c.width = Math.round(r.width * d); c.height = Math.round(r.height * d);
  const g = c.getContext("2d"); g.scale(d, d);
  const W = r.width, lh = (r.height - 10) / 4, X = (t) => t / DURATION * W;
  const col = { conv: css("--conv"), 0: css("--hf"), 1: css("--hr"), amber: css("--amber"), line: css("--line") };
  const rows = [[conv, "conv", 0], [segs[0], 0, 0], [conv, "conv", 1], [segs[1], 1, 1]];
  rows.forEach(([list, key, h], i) => {
    const y = 2 + i * (lh + 2);
    g.globalAlpha = 1; g.fillStyle = col.line; g.fillRect(0, y + lh / 2 - 0.5, W, 1);
    for (const s of list) {
      const a = { pick: 0.55, place: 1, move: 0.22, scan: 1, in: 1, out: 1, clamp: 1, hold: 0.22 }[s.kind]; if (!a) continue;
      g.globalAlpha = a; g.fillStyle = s.kind === "scan" || s.kind === "clamp" ? col.amber : col[key];
      for (const sh of [PHASE[h], PHASE[h] - DURATION]) g.fillRect(X(s.t0 + sh), y, Math.max(0.6, X(s.t1) - X(s.t0)), lh);   // lane 2 wraps round the loop
    }
  });
  g.globalAlpha = 1;
}
function setPlaying(p) {
  playing = p; $("play").setAttribute("aria-label", p ? "Pause" : "Play");
  $("play-icon").innerHTML = p ? '<path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z"/>' : '<path d="M7 4.5v15l13-7.5z"/>';
}
$("play").addEventListener("click", () => { if (!playing && time >= DURATION * 0.999) time = 0; setPlaying(!playing); });
$("restart").addEventListener("click", () => { time = 0; elapsed = 0; });
document.querySelectorAll("#speeds button").forEach((b) => b.addEventListener("click", () => { speed = +b.dataset.speed; document.querySelectorAll("#speeds button").forEach((o) => o.setAttribute("aria-pressed", String(o === b))); }));
document.querySelectorAll("#views button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
document.querySelectorAll("#covers button").forEach((b) => b.addEventListener("click", () => setCovers(b.dataset.cover)));
$("door-f").addEventListener("click", () => setDoor(0, !doors[0].open));
$("door-r").addEventListener("click", () => setDoor(1, !doors[1].open));
{
  const tl = $("timeline"); let drag = false;
  const seek = (e) => { const r = tl.getBoundingClientRect(); time = clamp((e.clientX - r.left) / r.width, 0, 1) * DURATION * 0.9999; };
  tl.addEventListener("pointerdown", (e) => { drag = true; tl.setPointerCapture(e.pointerId); seek(e); });
  tl.addEventListener("pointermove", (e) => { if (drag) seek(e); });
  tl.addEventListener("pointerup", () => { drag = false; });
  tl.addEventListener("keydown", (e) => { if (e.key === "ArrowRight") time = Math.min(DURATION * 0.9999, time + 0.1); if (e.key === "ArrowLeft") time = Math.max(0, time - 0.1); });
}
addEventListener("keydown", (e) => { if (e.code === "Space" && !/INPUT|BUTTON/.test(e.target.tagName)) { e.preventDefault(); $("play").click(); } });
// Click (not drag) on a hood door toggles it.
{
  const ray = new THREE.Raycaster(), down = { x: 0, y: 0 }, el = renderer.domElement;
  const hit = (e) => {
    if (coverMode === "off") return -1;
    const r = el.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const h = ray.intersectObjects(doors.flatMap((d) => d.pick), false)[0]; return h ? doors.findIndex((d) => d.pick.includes(h.object)) : -1;
  };
  el.addEventListener("pointerdown", (e) => { down.x = e.clientX; down.y = e.clientY; });
  el.addEventListener("pointerup", (e) => { if (e.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return; const i = hit(e); if (i >= 0) setDoor(i, !doors[i].open); });
  el.addEventListener("pointermove", (e) => { if (e.buttons === 0) el.style.cursor = hit(e) >= 0 ? "pointer" : ""; });
}
const _ft = {};
function applyTheme() {
  const dark = SMT.isDark();
  scene.background = new THREE.Color(dark ? 0x10151d : 0xeef1f5);
  const k = dark ? "d" : "l"; if (!_ft[k]) _ft[k] = floorTex(dark); floorMat.map = _ft[k]; floorMat.needsUpdate = true; stubMat.color.set(dark ? 0x2b323d : 0xb7bfc9);
  scene.environmentIntensity = dark ? 0.4 : 0.5; sun.intensity = dark ? 1.35 : 1.5; hemi.intensity = dark ? 0.35 : 0.3;
  rigs[0].path.material.color.set(css("--hf")); rigs[1].path.material.color.set(css("--hr"));
  drawLanes();
}
SMT.onTheme(applyTheme);

// ================================================================ per-frame update
const nowText = {};
function setNow(id, s) { if (nowText[id] === s) return; nowText[id] = s; $("now-" + id).textContent = s.label || "Ready"; $("cmd-" + id).textContent = s.cmd || ""; }
function apply(t) {
  const tl = [local(0, t), local(1, t)], poses = [headPose(0, tl[0]), headPose(1, tl[1])], bx = [boardX(tl[0]), boardX(tl[1])];
  const placed = [0, 0], full = [new Array(NOZ).fill(false), new Array(NOZ).fill(false)];
  for (const h of [0, 1]) {
    const p = poses[h], rig = rigs[h], L = lanes[h], x = tl[h];
    boardPos(L.work, bx[h], h);
    const q = clamp((x - BOARD.tMove - 1) / 1.2, 0, 1);
    L.queue.visible = x > BOARD.tMove + 1; boardPos(L.queue, lerp(BOARD.xQ, BOARD.xIn, ease(q)), h);
    L.done.visible = x < BOARD.tMove; boardPos(L.done, lerp(BOARD.xOut, BOARD.xGone, ease(clamp(x / BOARD.tMove, 0, 1))), h);
    rig.g.position.set(p.x, p.y, 0); rig.beam.position.y = p.y;
    for (let k = 0; k < NOZ; k++) rig.noz[k].position.z = tipZ(p, k);
    M.camGlass[h].emissiveIntensity = p.seg.kind === "scan" ? 4 : 0.05;
    const show = $("trail").checked && p.seg.kind !== "wait";
    rig.path.visible = show;
    if (show && rig.shown !== p.seg.trip) { rig.shown = p.seg.trip; rig.path.geometry.dispose(); rig.path.geometry = new THREE.BufferGeometry().setFromPoints(rig.trips[p.seg.trip]); }
    setNow(h, p.seg); setNow("c" + h, segAt(conv, x));
    $(h ? "hr-trip" : "hf-trip").textContent = `trip ${p.seg.trip + 1} / ${TRIPS}`;
  }
  for (const c of comps) {
    const m = c.mesh, h = c.head, x = tl[h];
    if (x < c.tPick) m.visible = false;
    else if (x < c.tPlace) {
      const p = poses[h], o = OFF[c.k]; full[h][c.k] = true;
      m.visible = true; m.position.copy(w2t(p.x + o[0], p.y + o[1], tipZ(p, c.k) - c.h)); m.rotation.y = c.rot * ease(clamp((x - c.tPick) / (c.tPlace - c.tPick) * 1.6, 0, 1));
      rigs[h].noz[c.k].rotation.z = m.rotation.y;
    } else { placed[h]++; m.visible = true; m.position.copy(w2t(bx[h] + c.u, LANE[h] + c.v, Z.pcb)); m.rotation.y = c.rot; }
  }
  for (const w of windows) {   // tape index: the next part slides one pitch into the pick window
    const x = tl[w.h]; let last = -1; for (const tp of w.picks) if (tp <= x) last = tp; else break;
    const s = last < 0 ? 1 : clamp((x - last) / 0.12, 0, 1), dir = Math.sign(w.f.y);
    w.mesh.position.copy(w2t(w.f.x, w.f.y + dir * (1 - ease(s)) * 0.008, w.f.z)); w.mesh.visible = s > 0.15;
  }
  for (const h of [0, 1]) { nozEls[h].forEach((el, k) => { el.classList.toggle("full", full[h][k]); el.classList.toggle("act", poses[h].seg.k === k); }); $("s-p" + h).textContent = placed[h]; drawMap(h, placed[h]); }
  $("s-out").textContent = Math.floor(elapsed / DURATION) + Math.floor((elapsed + DURATION - PHASE[1]) / DURATION);
  $("clock-now").textContent = t.toFixed(1); $("playhead").style.left = (t / DURATION * 100) + "%";
  M.lampG.emissiveIntensity = playing ? 2.5 : 0; M.lampY.emissiveIntensity = playing ? 0 : 2.5;
  if (follow >= 0) { const p = poses[follow], n = w2t(p.x, p.y, 0.95), dv = n.clone().sub(lastTarget); camera.position.add(dv); controls.target.add(dv); lastTarget.copy(n); }
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.25, (now - last) / 1000); last = now;
  if (playing) { time += dt * speed; elapsed += dt * speed; if (time >= DURATION) { if ($("loop").checked) time %= DURATION; else { time = DURATION * 0.9999; setPlaying(false); } } }
  for (const d of doors) { d.a += ((d.open ? 1 : 0) - d.a) * Math.min(1, dt * 6); d.g.rotation.x = -1.25 * ease(clamp(d.a, 0, 1)); }
  apply(time);
  controls.update();
  { const dd = camera.position.distanceTo(controls.target); camera.near = clamp(dd * 0.03, 1, 10); camera.updateProjectionMatrix(); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
new ResizeObserver(resize).observe(viewport); new ResizeObserver(() => drawLanes()).observe($("timeline"));
resize(); setCovers("solid"); setView("iso"); setPlaying(true);
window.simReady = true; $("load-error").style.display = "none";
window.__sim = { comps, JOB, KIT, get time() { return time; }, seek: (t) => { time = t; }, setView, setDoor, setCovers, get duration() { return DURATION; }, pause: () => setPlaying(false), pose: (h) => headPose(h, local(h, time)) };
requestAnimationFrame(frame);
