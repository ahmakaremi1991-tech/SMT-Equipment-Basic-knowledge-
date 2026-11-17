/* ===================================================================
   SHARED PCB KIT — the one demo board every machine in the line uses.
   250 x 200 x 1.6 mm, 289 SMD parts.  Units mm, board top at y = BT.
   =================================================================== */
function makePCBKit(THREE,merge,canvasTex){
const PI=Math.PI;let seed=20261;
function rnd(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}
const rr=(a,b)=>a+(b-a)*rnd(), pick=a=>a[Math.floor(rnd()*a.length)];
const std=(color,rough=.6,metal=0,extra={})=>new THREE.MeshStandardMaterial(Object.assign({color,roughness:rough,metalness:metal,envMapIntensity:metal>.5?1.1:.5},extra));
const BW=250,BD=200,BT=1.6,BALLS=[];
