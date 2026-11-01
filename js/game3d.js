/* ===================================================================
   সবজির ট্রাক — 3D Game Engine  (game3d.js)
   Three.js r128 | No ES modules | Global THREE object
   =================================================================== */
'use strict';

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const CFG = {
  ROAD_LEN : 820,
  ROAD_W   : 9,
  TRUCK: {
    ACCEL      : 18,
    BRAKE      : 30,
    MAX_SPD    : 100,   // km/h equiv
    FRICTION   : 6,
    FUEL_BURN  : 0.012, // per unit distance
    BOOST_MULT : 1.6,
    BOOST_DUR  : 4,
  },
  ECO: {
    BUY_PRICE    : 10,
    SELL_PRICE   : 17,
    START_CASH   : 10000,
    FINE_MINOR   : 500,
    FINE_MAJOR   : 1500,
  },
  ZONES: [
    { z: 0,   name_bn: 'ক্ষেতের ফার্ম',    name_en: 'Farm',          icon: '🌾', sky: 0x8fafc0, fog: 0x8fafc0 },
    { z: 200, name_bn: 'গ্রামের পথ',       name_en: 'Village Road',  icon: '🏡', sky: 0x7da0b0, fog: 0x7da0b0 },
    { z: 380, name_bn: 'মহাসড়ক',           name_en: 'Highway',       icon: '🛣️', sky: 0x6688a0, fog: 0x6688a0 },
    { z: 560, name_bn: 'শহরতলী',           name_en: 'City Outskirts', icon: '🏙️', sky: 0x4e697a, fog: 0x4e697a },
    { z: 720, name_bn: 'কাওরান বাজার',     name_en: 'Kawran Bazar',  icon: '🛒', sky: 0x3a5060, fog: 0x3a5060 },
  ],
  OBSTACLES: [
    { id:'chanda1', z3d:134, icon:'💰', type:'chanda',
      title_bn:'চাঁদা — স্থানীয় দল', title_en:'Extortion — Local Gang',
      instr_bn:'পথ আটকে চাঁদা চাইছে!', instr_en:'Road blocked! Pay up or else!',
      demand: 800 },
    { id:'railway', z3d:234, icon:'🚂', type:'railway',
      title_bn:'রেলগেট', title_en:'Railway Crossing',
      instr_bn:'ট্রেন আসছে! অপেক্ষা করুন।', instr_en:'Train incoming! Wait or risk it.' },
    { id:'chanda2', z3d:340, icon:'💰', type:'chanda',
      title_bn:'\u099a\u09be\u0981\u09a6\u09be \u2014 \u09b8\u09a8\u09cd\u09a4\u09cd\u09b0\u09be\u09b8\u09c0 \u09ac\u09be\u09b9\u09bf\u09a8\u09c0', title_en:'Extortion \u2014 Syndicate Gang',
      instr_bn:'আবার চাঁদা! এবার বেশি।', instr_en:'Toll again! Bigger demand this time.',
      demand: 1200 },
    { id:'toll1', z3d:433, icon:'🚧', type:'toll',
      title_bn:'টোল — জাতীয় সড়ক', title_en:'Highway Toll',
      instr_bn:'সরকারি টোল। দিতেই হবে।', instr_en:'Government toll. Must pay.',
      demand: 300 },
    { id:'police', z3d:532, icon:'👮', type:'police',
      title_bn:'পুলিশ চেকপয়েন্ট', title_en:'Police Checkpoint',
      instr_bn:'কাগজপত্র দেখাও! নইলে ঘুষ!', instr_en:'Show papers or pay bribe!' },
    { id:'chanda3', z3d:617, icon:'💰', type:'chanda',
      title_bn:'চাঁদা — শেষবার', title_en:'Extortion — Final Checkpoint',
      instr_bn:'শেষ চাঁদা পয়েন্ট।', instr_en:'Last extortion point before city.',
      demand: 1500 },
    { id:'toll2', z3d:689, icon:'🚧', type:'toll',
      title_bn:'টোল — সিটি এন্ট্রি', title_en:'City Entry Toll',
      instr_bn:'শহরের টোল। দিয়ে যান।', instr_en:'City entry toll.',
      demand: 500 },
    { id:'arot', z3d:760, icon:'🏪', type:'arot',
      title_bn:'আড়ৎদার', title_en:'Market Broker (Arotdar)',
      instr_bn:'আড়ৎদার কমিশন চাইছে।', instr_en:'The broker wants his cut.' },
  ],
  MARKETS: [
    { id:"mkt1", z3d:75,  icon:"\uD83C\uDFEA", name_bn:"\u09AA\u09CD\u09B0\u09A5\u09AE \u09AC\u09BE\u099C\u09BE\u09B0", name_en:"Roadside Market 1",  priceHigh:15, priceLow:11, maxKg:400 },
    { id:"mkt2", z3d:285, icon:"\uD83C\uDFEA", name_bn:"\u09AE\u09BE\u099D\u09AA\u09A5\u09C7\u09B0 \u09AC\u09BE\u099C\u09BE\u09B0", name_en:"Midway Market",       priceHigh:14, priceLow:10, maxKg:500 },
    { id:"mkt3", z3d:490, icon:"\uD83C\uDFEA", name_bn:"\u09B6\u09B9\u09B0\u09A4\u09B2\u09C0 \u09AC\u09BE\u099C\u09BE\u09B0", name_en:"City-edge Market",    priceHigh:13, priceLow:10, maxKg:300 },
  ],
  DEST_Z   : 810,
};

// ─── GAME STATE ───────────────────────────────────────────────────────────────
const GS = {
  state      : 'menu',   // menu | driving | obstacle | result | paused
  truckZ     : 10,
  truckSpd   : 0,        // km/h
  truckFuel  : 100,
  cash       : CFG.ECO.START_CASH,
  cargo      : 0,        // kg
  buyCost    : 0,
  obstaclesPassed: [],
  ledger     : [],
  isRaining  : false,
  rainTimer  : 0,
  paused     : false,
  boostTimer : 0,
  obstacles  : [],       // cloned from CFG.OBSTACLES with .passed flag
  zoneIdx    : 0,
  lastTs     : 0,
  keys       : { right: false, left: false, space: false },
  shopQty    : 500,
  currentObs : null,
  truckGroup : null,
  vegGroup    : null,
  veggiesLoaded: false,
  exhaustPoints: null,
  rainLines  : null,
  rainPositions: null,
  renderer   : null,
  scene      : null,
  camera     : null,
  routeIcons : [],
  obstacleMeshes: {},
};


// --- BENGALI NUMBER FORMATTER -----------------------------------------------
function bn(n) {
  // Convert number to Bengali digit string with commas (Indian system)
  try { return Math.floor(n).toLocaleString('bn-BD'); } catch(e) { return String(Math.floor(n)); }
}
function bnMoney(n) { return '?' + bn(n); }
// ─── SEEDED RNG ───────────────────────────────────────────────────────────────
function SeededRng(seed) {
  let s = seed;
  return function() {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

// ─── SCENE SETUP ──────────────────────────────────────────────────────────────
function setupScene() {
  const canvas = document.getElementById('c');
  GS.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  GS.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  GS.renderer.shadowMap.enabled = true;
  GS.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  function resize() {
    GS.renderer.setSize(window.innerWidth, window.innerHeight);
    if (GS.camera) {
      GS.camera.aspect = window.innerWidth / window.innerHeight;
      GS.camera.updateProjectionMatrix();
    }
  }
  window.addEventListener('resize', resize);

  GS.scene = new THREE.Scene();
  GS.scene.background = new THREE.Color(0x8fafc0);
  GS.scene.fog = new THREE.Fog(0x8fafc0, 60, 200);

  // Lights
  const ambient = new THREE.AmbientLight(0xffffff, 0.6);
  GS.scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xfff8e0, 1.0);
  sun.position.set(20, 50, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 300;
  sun.shadow.camera.left = -80;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 80;
  sun.shadow.camera.bottom = -80;
  GS.scene.add(sun);
  GS.sun = sun;

  GS.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 500);
  GS.camera.position.set(0, 6, -1);

  resize();
}

// ─── ENVIRONMENT ──────────────────────────────────────────────────────────────
function buildEnvironment() {
  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(500, CFG.ROAD_LEN + 40),
    new THREE.MeshLambertMaterial({ color: 0x4a7c3f })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, CFG.ROAD_LEN / 2);
  ground.receiveShadow = true;
  GS.scene.add(ground);

  // Road
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(CFG.ROAD_W, CFG.ROAD_LEN),
    new THREE.MeshLambertMaterial({ color: 0x8B6B4A })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.01, CFG.ROAD_LEN / 2);
  road.receiveShadow = true;
  GS.scene.add(road);

  // Road edges (white stripes)
  [-CFG.ROAD_W / 2 + 0.3, CFG.ROAD_W / 2 - 0.3].forEach(x => {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(0.25, CFG.ROAD_LEN),
      new THREE.MeshLambertMaterial({ color: 0xeeeecc })
    );
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(x, 0.02, CFG.ROAD_LEN / 2);
    GS.scene.add(stripe);
  });

  // Center dashes
  for (let z = 10; z < CFG.ROAD_LEN; z += 12) {
    const dash = new THREE.Mesh(
      new THREE.PlaneGeometry(0.18, 6),
      new THREE.MeshLambertMaterial({ color: 0xeeeecc })
    );
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(0, 0.02, z + 3);
    GS.scene.add(dash);
  }

  spawnTrees();
  spawnHaystacks();
  spawnBillboards();
  spawnCropPatches();
  buildFarmMarket();
}

// ─── TREES ────────────────────────────────────────────────────────────────────
function makeTree(rng, type) {
  const group = new THREE.Group();
  const treeType = type || (rng() > 0.5 ? 'cone' : 'round');
  const trunkH = 0.8 + rng() * 0.6;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.18, trunkH, 6),
    new THREE.MeshLambertMaterial({ color: 0x5c3d1a })
  );
  trunk.position.y = trunkH / 2;
  trunk.castShadow = true;
  group.add(trunk);

  const green = 0x2d6a2d + Math.floor(rng() * 0x103010);
  if (treeType === 'cone') {
    const foliageH = 1.4 + rng() * 1.2;
    for (let i = 0; i < 2; i++) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(0.7 - i * 0.15, foliageH * (0.7 + i * 0.15), 6),
        new THREE.MeshLambertMaterial({ color: green })
      );
      cone.position.y = trunkH + foliageH * (0.35 + i * 0.3);
      cone.castShadow = true;
      group.add(cone);
    }
  } else {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.7 + rng() * 0.4, 6, 5),
      new THREE.MeshLambertMaterial({ color: green })
    );
    sphere.position.y = trunkH + 0.65;
    sphere.castShadow = true;
    group.add(sphere);
  }
  return group;
}

function spawnTrees() {
  const rng = SeededRng(42);
  const HALF = CFG.ROAD_W / 2;
  let z = 5;
  while (z < CFG.ROAD_LEN - 10) {
    const gap = 8 + rng() * 14;
    // Left side
    const tL = makeTree(rng);
    const xL = -(HALF + 2.5 + rng() * 8);
    tL.position.set(xL, 0, z);
    tL.scale.setScalar(0.7 + rng() * 0.8);
    tL.rotation.y = rng() * Math.PI * 2;
    GS.scene.add(tL);
    // Right side
    const tR = makeTree(rng);
    const xR = HALF + 2.5 + rng() * 8;
    tR.position.set(xR, 0, z + gap * 0.5);
    tR.scale.setScalar(0.7 + rng() * 0.8);
    tR.rotation.y = rng() * Math.PI * 2;
    GS.scene.add(tR);
    z += gap;
  }
}

// ─── HAYSTACKS ────────────────────────────────────────────────────────────────
function makeHaystack() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.7, 0.9),
    new THREE.MeshLambertMaterial({ color: 0xb8860b })
  );
  base.position.y = 0.35;
  base.castShadow = true;
  g.add(base);
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.5, 0.7),
    new THREE.MeshLambertMaterial({ color: 0xdaa520 })
  );
  top.position.y = 0.95;
  top.castShadow = true;
  g.add(top);
  return g;
}

function spawnHaystacks() {
  const rng = SeededRng(99);
  for (let i = 0; i < 18; i++) {
    const hs = makeHaystack();
    const side = rng() > 0.5 ? 1 : -1;
    hs.position.set(side * (CFG.ROAD_W / 2 + 2 + rng() * 6), 0, 20 + rng() * (CFG.ROAD_LEN - 40));
    hs.rotation.y = rng() * Math.PI * 2;
    GS.scene.add(hs);
  }
}

// ─── BILLBOARDS ───────────────────────────────────────────────────────────────
const BILLBOARD_DATA = [
  { z: 80,  side: 1,  line1: 'bKash', line2: '\u09b8\u09b9\u099c\u09c7 \u09aa\u09be\u09a0\u09be\u09a8', bg: '#e2136e', fg: '#fff' },
  { z: 200, side:-1,  line1: '\u09a8\u0997\u09a6', line2: '\u09a6\u09cd\u09b0\u09c1\u09a4 \u09a1\u09bf\u099c\u09bf\u099f\u09be\u09b2 \u09aa\u09b0\u09bf\u09b7\u09c7\u09ac\u09be', bg: '#f7931e', fg: '#fff' },
  { z: 380, side: 1,  line1: 'Grameenphone', line2: '\u09b8\u09ac\u09be\u09b0 \u099c\u09a8\u09cd\u09af GP', bg: '#00b140', fg: '#fff' },
  { z: 550, side:-1,  line1: 'BRAC', line2: '\u09ae\u09be\u09a8\u09c1\u09b7\u09c7\u09b0 \u09aa\u09be\u09b6\u09c7', bg: '#003087', fg: '#fff' },
  { z: 680, side: 1,  line1: '\u09b8\u09ac\u099c\u09bf\u09b0 \u099f\u09cd\u09b0\u09be\u0995', line2: '\u09a4\u09be\u099c\u09be \u09b8\u09ac\u099c\u09bf \u09b8\u09b0\u09be\u09b8\u09b0\u09bf', bg: '#8B0000', fg: '#ffd700' },
];

function makeBillboard(data) {
  const group = new THREE.Group();

  // Canvas texture
  const cw = 256, ch = 160;
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = data.bg;
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = data.fg;
  ctx.font = 'bold 32px \u0027Hind Siliguri\u0027, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(data.line1, cw / 2, ch * 0.38);
  ctx.font = '20px \u0027Hind Siliguri\u0027, Arial';
  ctx.fillText(data.line2, cw / 2, ch * 0.68);
  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, cw - 6, ch - 6);

  const tex = new THREE.CanvasTexture(cv);
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 3.2),
    new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide })
  );
  board.position.y = 4.5;
  group.add(board);

  // Poles
  [-1.5, 1.5].forEach(dx => {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, 4.5, 6),
      new THREE.MeshLambertMaterial({ color: 0x555555 })
    );
    pole.position.set(dx, 2.25, 0);
    group.add(pole);
  });

  const HALF = CFG.ROAD_W / 2;
  const x = data.side * (HALF + 6);
  group.position.set(x, 0, data.z);
  // Face toward road
  group.rotation.y = data.side > 0 ? Math.PI * 1.05 : Math.PI * -0.05;
  GS.scene.add(group);
}

function spawnBillboards() {
  BILLBOARD_DATA.forEach(b => makeBillboard(b));
}

// ─── CROP PATCHES ─────────────────────────────────────────────────────────────
function spawnCropPatches() {
  const rng = SeededRng(17);
  const colors = [0x7ab648, 0x5a9a2a, 0x8fbc44, 0xa0c060];
  for (let i = 0; i < 12; i++) {
    const side = rng() > 0.5 ? 1 : -1;
    const patch = new THREE.Mesh(
      new THREE.PlaneGeometry(4 + rng() * 6, 3 + rng() * 4),
      new THREE.MeshLambertMaterial({ color: colors[Math.floor(rng() * colors.length)] })
    );
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(side * (CFG.ROAD_W / 2 + 8 + rng() * 10), 0.015, 40 + rng() * 400);
    GS.scene.add(patch);
  }
}

// ─── OBSTACLE MARKERS ─────────────────────────────────────────────────────────
// ─── FARM MARKET ─────────────────────────────────────────────────────────────
function buildFarmMarket() {
  const ROAD_HALF = CFG.ROAD_W / 2;

  // ── Market entrance arch ──────────────────────────────────────────────────
  const archGrp = new THREE.Group();
  // Two bamboo columns
  [-5.5, 5.5].forEach(function(x) {
    var col = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.18, 5.5, 6),
      new THREE.MeshLambertMaterial({ color: 0xc8a84b })
    );
    col.position.set(x, 2.75, 0);
    archGrp.add(col);
  });
  // Horizontal beam
  var beam = new THREE.Mesh(
    new THREE.BoxGeometry(11.2, 0.3, 0.3),
    new THREE.MeshLambertMaterial({ color: 0xb8963a })
  );
  beam.position.set(0, 5.5, 0);
  archGrp.add(beam);
  // Market sign canvas
  var sigCv = document.createElement('canvas');
  sigCv.width = 320; sigCv.height = 80;
  var sigCtx = sigCv.getContext('2d');
  sigCtx.fillStyle = '#2e7d32';
  sigCtx.fillRect(0, 0, 320, 80);
  sigCtx.strokeStyle = '#ffd700';
  sigCtx.lineWidth = 4;
  sigCtx.strokeRect(4, 4, 312, 72);
  sigCtx.fillStyle = '#ffd700';
  sigCtx.font = "bold 28px 'Hind Siliguri', Arial";
  sigCtx.textAlign = 'center';
  sigCtx.textBaseline = 'middle';
  sigCtx.fillText('\u0995\u09cd\u09b7\u09c7\u09a4\u09c7\u09b0 \u09b9\u09be\u099f', 160, 30);
  sigCtx.font = "16px 'Hind Siliguri', Arial";
  sigCtx.fillStyle = '#c8f0c8';
  sigCtx.fillText('Vegetable Farm Market \u2014 \u09b8\u09ac\u099c\u09bf\u09b0 \u09ac\u09be\u099c\u09be\u09b0', 160, 58);
  var sigTex = new THREE.CanvasTexture(sigCv);
  var sign = new THREE.Mesh(
    new THREE.PlaneGeometry(9, 2.2),
    new THREE.MeshLambertMaterial({ map: sigTex, side: THREE.DoubleSide })
  );
  sign.position.set(0, 5.3, 0.2);
  archGrp.add(sign);
  // Hanging decorative flags
  var flagColors = [0xff2222, 0xffcc00, 0x22aa22, 0xff6600, 0x2266ff];
  for (var fi = 0; fi < 5; fi++) {
    var flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.7),
      new THREE.MeshLambertMaterial({ color: flagColors[fi], side: THREE.DoubleSide })
    );
    flag.position.set(-4.4 + fi * 2.2, 5.0, 0);
    flag.rotation.z = (Math.random() - 0.5) * 0.3;
    archGrp.add(flag);
  }
  archGrp.position.set(0, 0, 18);
  GS.scene.add(archGrp);

  // ── Market stalls — left side ─────────────────────────────────────────────
  var stallPositions = [
    { x: -(ROAD_HALF + 3.5), z: 28, rot: Math.PI * 0.5 },
    { x: -(ROAD_HALF + 3.5), z: 40, rot: Math.PI * 0.5 },
    { x: -(ROAD_HALF + 3.5), z: 52, rot: Math.PI * 0.5 },
    { x:  (ROAD_HALF + 3.5), z: 28, rot: -Math.PI * 0.5 },
    { x:  (ROAD_HALF + 3.5), z: 40, rot: -Math.PI * 0.5 },
    { x:  (ROAD_HALF + 3.5), z: 52, rot: -Math.PI * 0.5 },
  ];
  stallPositions.forEach(function(sp) {
    var stall = makeMarketStall(sp.rot > 0);
    stall.position.set(sp.x, 0, sp.z);
    stall.rotation.y = sp.rot;
    GS.scene.add(stall);
  });

  // ── Vegetable field patches beside road ──────────────────────────────────
  var vegColors = [0x5aad3c, 0xf7b731, 0xeb4d4b, 0xa29bfe, 0x6ab04c];
  var vegNames  = ['\u09b6\u09be\u0995', '\u09b2\u09be\u0989', '\u099f\u09ae\u09c7\u099f\u09cb', '\u09ac\u09c7\u0997\u09c1\u09a8', '\u09aa\u09be\u09b2\u0982'];
  for (var vi = 0; vi < 5; vi++) {
    var side = vi % 2 === 0 ? -1 : 1;
    var field = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 5),
      new THREE.MeshLambertMaterial({ color: vegColors[vi] })
    );
    field.rotation.x = -Math.PI / 2;
    field.position.set(side * (ROAD_HALF + 8), 0.02, 28 + vi * 10);
    GS.scene.add(field);
  }

  // ── Vegetable crates scattered near road ─────────────────────────────────
  var crateData = [
    { x: -(ROAD_HALF + 0.8), z: 24, col: 0x6ab04c },
    { x:  (ROAD_HALF + 0.8), z: 26, col: 0xf7b731 },
    { x: -(ROAD_HALF + 1.2), z: 35, col: 0xeb4d4b },
    { x:  (ROAD_HALF + 1.0), z: 38, col: 0x6ab04c },
    { x: -(ROAD_HALF + 0.9), z: 48, col: 0xf7b731 },
    { x:  (ROAD_HALF + 1.1), z: 50, col: 0xeb4d4b },
  ];
  crateData.forEach(function(cd) {
    var grp = new THREE.Group();
    var crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.55, 0.8),
      new THREE.MeshLambertMaterial({ color: 0x8B4513 })
    );
    crate.position.y = 0.275;
    grp.add(crate);
    var veg = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 6, 5),
      new THREE.MeshLambertMaterial({ color: cd.col })
    );
    veg.position.y = 0.62;
    grp.add(veg);
    grp.position.set(cd.x, 0, cd.z);
    grp.rotation.y = Math.random() * Math.PI;
    GS.scene.add(grp);
  });

  // ── Vendor figures ────────────────────────────────────────────────────────
  var vendorPositions = [
    { x: -(ROAD_HALF + 1.5), z: 30 },
    { x:  (ROAD_HALF + 1.5), z: 42 },
    { x: -(ROAD_HALF + 1.5), z: 54 },
  ];
  vendorPositions.forEach(function(vp) {
    GS.scene.add(makeVendor(vp.x, vp.z));
  });
}

// Bamboo+thatch market stall
function makeMarketStall(facingLeft) {
  var grp = new THREE.Group();
  var roofColor = 0xc8a060;
  var wallColor = 0xf5deb3;

  // Back wall
  var wall = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 2.2, 0.15),
    new THREE.MeshLambertMaterial({ color: wallColor })
  );
  wall.position.set(0, 1.1, 0);
  grp.add(wall);

  // Counter
  var counter = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 0.12, 0.9),
    new THREE.MeshLambertMaterial({ color: 0xa0522d })
  );
  counter.position.set(0, 0.9, 0.5);
  grp.add(counter);

  // Thatched roof (slanted box)
  var roof = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 0.22, 1.8),
    new THREE.MeshLambertMaterial({ color: roofColor })
  );
  roof.position.set(0, 2.3, 0.3);
  roof.rotation.x = -0.15;
  grp.add(roof);

  // Roof supports (poles)
  [[-1.4, 0.6], [1.4, 0.6]].forEach(function(pos) {
    var pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 2.3, 6),
      new THREE.MeshLambertMaterial({ color: 0xc8a84b })
    );
    pole.position.set(pos[0], 1.15, pos[1]);
    grp.add(pole);
  });

  // Produce display on counter (colourful small items)
  var produceColors = [0xeb4d4b, 0x6ab04c, 0xf7b731, 0xa29bfe];
  produceColors.forEach(function(col, idx) {
    var item = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 5, 4),
      new THREE.MeshLambertMaterial({ color: col })
    );
    item.position.set(-0.9 + idx * 0.6, 1.06, 0.5);
    grp.add(item);
  });

  // Price sign canvas
  var cv = document.createElement('canvas');
  cv.width = 128; cv.height = 64;
  var ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff8dc';
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = '#8B0000';
  ctx.font = "bold 18px 'Hind Siliguri', Arial";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('\u09b6\u09be\u0995\u09b8\u09ac\u099c\u09bf', 64, 22);
  ctx.font = "14px 'Hind Siliguri', Arial";
  ctx.fillStyle = '#2e7d32';
  ctx.fillText('\u09f3\u00b9\u0966/\u0995\u09c7\u099c\u09bf', 64, 46);
  var tex = new THREE.CanvasTexture(cv);
  var signMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(1.4, 0.7),
    new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide })
  );
  signMesh.position.set(0, 1.65, 0.09);
  grp.add(signMesh);

  return grp;
}

// Simple vendor figure
function makeVendor(x, z) {
  var grp = new THREE.Group();
  var skinCol  = 0xc68642;
  var clothCol = [0xd63031, 0x0984e3, 0x00b894][Math.floor(Math.random()*3)];

  var body = new THREE.Mesh(
    new THREE.BoxGeometry(0.38, 0.85, 0.28),
    new THREE.MeshLambertMaterial({ color: clothCol })
  );
  body.position.y = 0.55;
  grp.add(body);

  var head = new THREE.Mesh(
    new THREE.SphereGeometry(0.19, 6, 5),
    new THREE.MeshLambertMaterial({ color: skinCol })
  );
  head.position.y = 1.1;
  grp.add(head);

  // Gamcha (head cloth)
  var gamcha = new THREE.Mesh(
    new THREE.CylinderGeometry(0.2, 0.2, 0.1, 7),
    new THREE.MeshLambertMaterial({ color: 0xff6b6b })
  );
  gamcha.position.y = 1.24;
  grp.add(gamcha);

  // Basket in hand
  var basket = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.1, 0.22, 7),
    new THREE.MeshLambertMaterial({ color: 0xb8860b })
  );
  basket.position.set(0.3, 0.55, 0);
  grp.add(basket);

  grp.position.set(x, 0, z);
  grp.rotation.y = x > 0 ? -Math.PI * 0.6 : Math.PI * 0.6;
  return grp;
}

function buildObstacleMarkers() {
  GS.obstacles.forEach(obs => {
    const group = new THREE.Group();
    group.position.z = obs.z3d;
    group.visible = true;

    if (obs.type === 'chanda') {
      // Bamboo poles with red bar
      [-2.5, 2.5].forEach(x => {
        const pole = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.06, 3, 5),
          new THREE.MeshLambertMaterial({ color: 0xc8b060 })
        );
        pole.position.set(x, 1.5, 0);
        group.add(pole);
      });
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(5.2, 0.18, 0.18),
        new THREE.MeshLambertMaterial({ color: 0xdd2222 })
      );
      bar.position.set(0, 2.8, 0);
      group.add(bar);
      // Guard figure
      const guard = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.9, 0.3),
        new THREE.MeshLambertMaterial({ color: 0x1a237e }));
      body.position.y = 0.45;
      guard.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5),
        new THREE.MeshLambertMaterial({ color: 0xf4a460 }));
      head.position.y = 1.05;
      guard.add(head);
      guard.position.set(-3.5, 0, 0);
      group.add(guard);

    } else if (obs.type === 'railway') {
      // Rail tracks
      [-0.8, 0.8].forEach(x => {
        const rail = new THREE.Mesh(
          new THREE.BoxGeometry(0.12, 0.12, 16),
          new THREE.MeshLambertMaterial({ color: 0x888888 })
        );
        rail.position.set(x, 0.06, 0);
        group.add(rail);
      });
      // Sleepers
      for (let i = -7; i <= 7; i++) {
        const sl = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 0.1, 0.35),
          new THREE.MeshLambertMaterial({ color: 0x5c3d1a })
        );
        sl.position.set(0, 0.05, i * 1.0);
        group.add(sl);
      }
      // Gate arm
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.16, 0.16),
        new THREE.MeshLambertMaterial({ color: 0xdd2222 })
      );
      arm.position.set(-0.4, 2.4, -4);
      arm.rotation.z = Math.PI * 0.06;
      group.add(arm);
      // Gate post
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.12, 0.12, 3, 6),
        new THREE.MeshLambertMaterial({ color: 0x333333 })
      );
      post.position.set(-3, 1.5, -4);
      group.add(post);
      GS.railwayGroup = group;

    } else if (obs.type === 'toll') {
      // Toll booth
      const booth = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 2.2, 1.4),
        new THREE.MeshLambertMaterial({ color: 0xf5c518 })
      );
      booth.position.set(-5, 1.1, 0);
      group.add(booth);
      const roof = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.2, 1.8),
        new THREE.MeshLambertMaterial({ color: 0xdd9900 })
      );
      roof.position.set(-5, 2.3, 0);
      group.add(roof);
      // Barrier
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(4, 0.12, 0.12),
        new THREE.MeshLambertMaterial({ color: 0xdd2222 })
      );
      bar.position.set(-1.5, 1.2, 0);
      group.add(bar);

    } else if (obs.type === 'police') {
      // Sign
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(1.5, 1, 0.08),
        new THREE.MeshLambertMaterial({ color: 0x1565c0 })
      );
      sign.position.set(-4, 2.2, 0);
      group.add(sign);
      const signPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 2.5, 5),
        new THREE.MeshLambertMaterial({ color: 0x555 })
      );
      signPost.position.set(-4, 1.25, 0);
      group.add(signPost);
      // Officer
      const officer = new THREE.Group();
      const obody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.0, 0.3),
        new THREE.MeshLambertMaterial({ color: 0x1a5c1a }));
      obody.position.y = 0.5;
      officer.add(obody);
      const ohead = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5),
        new THREE.MeshLambertMaterial({ color: 0xf4a460 }));
      ohead.position.y = 1.15;
      officer.add(ohead);
      const ohat = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 7),
        new THREE.MeshLambertMaterial({ color: 0x0d3d0d }));
      ohat.position.y = 1.3;
      officer.add(ohat);
      officer.position.set(-3, 0, 0);
      group.add(officer);
      // Barrier rope
      const rope = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.06, 0.06),
        new THREE.MeshLambertMaterial({ color: 0xff8800 })
      );
      rope.position.set(-0.5, 1.0, 0);
      group.add(rope);

    } else if (obs.type === 'arot') {
      // Market stall
      const stall = new THREE.Mesh(
        new THREE.BoxGeometry(4, 2.5, 2),
        new THREE.MeshLambertMaterial({ color: 0x6a0dad })
      );
      stall.position.set(-6, 1.25, 0);
      group.add(stall);
      const canopy = new THREE.Mesh(
        new THREE.BoxGeometry(5, 0.2, 2.8),
        new THREE.MeshLambertMaterial({ color: 0x9c27b0 })
      );
      canopy.position.set(-6, 2.7, 0);
      group.add(canopy);
      // Crates of vegetables
      [[0.5,0.3,-5.5],[1.2,0.3,-5.0],[-0.2,0.3,-5.5]].forEach(([x,y,z]) => {
        const crate = new THREE.Mesh(
          new THREE.BoxGeometry(0.6,0.6,0.6),
          new THREE.MeshLambertMaterial({ color: 0x8B4513 })
        );
        crate.position.set(x, y, z + obs.z3d);
        // offset relative to group
        crate.position.set(x, y, z);
        group.add(crate);
      });
    }

    GS.obstacleMeshes[obs.id] = group;
    GS.scene.add(group);
  });

  // Destination gate
  addDestinationGate();
}

function addDestinationGate() {
  const group = new THREE.Group();
  group.position.z = CFG.DEST_Z;

  // Arch columns
  [-4.5, 4.5].forEach(x => {
    const col = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 5, 0.7),
      new THREE.MeshLambertMaterial({ color: 0xff6600 })
    );
    col.position.set(x, 2.5, 0);
    group.add(col);
  });
  // Arch top
  const top = new THREE.Mesh(
    new THREE.BoxGeometry(9.7, 0.7, 0.7),
    new THREE.MeshLambertMaterial({ color: 0xff6600 })
  );
  top.position.set(0, 5.35, 0);
  group.add(top);

  // Sign canvas
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 64;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#ff6600';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px \u0027Hind Siliguri\u0027, Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('কাওরান বাজার', 128, 26);
  ctx.font = '16px \u0027Hind Siliguri\u0027, Arial';
  ctx.fillText('Kawran Bazar Market', 128, 50);
  const tex = new THREE.CanvasTexture(cv);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(7, 1.8),
    new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide })
  );
  sign.position.set(0, 4.8, 0.35);
  group.add(sign);

  GS.scene.add(group);
}

// ============================================================
//  ROADSIDE MARKET STALLS (3D scene objects)
// ============================================================
function buildMarketStalls() {
  GS.marketMeshes = {};
  CFG.MARKETS.forEach(mkt => {
    const g = new THREE.Group();
    g.position.z = mkt.z3d;

    // Canopy / tent (bright orange-red)
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(5.0, 0.18, 3.2),
      new THREE.MeshLambertMaterial({ color: 0xe65100 })
    );
    canopy.position.set(5.5, 2.8, 0);
    g.add(canopy);

    // Tent legs
    [[4.0, 0, -1.4],[4.0, 0, 1.4],[7.0, 0, -1.4],[7.0, 0, 1.4]].forEach(([x,y,z]) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.06, 2.8, 6),
        new THREE.MeshLambertMaterial({ color: 0x4e342e })
      );
      leg.position.set(x, 1.4, z);
      g.add(leg);
    });

    // Stall table
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(4.6, 0.12, 1.4),
      new THREE.MeshLambertMaterial({ color: 0x6d4c41 })
    );
    table.position.set(5.5, 1.05, 0);
    g.add(table);

    // Vegetable piles on table (colorful boxes)
    const vegs = [
      [0xe53935, 4.2, 1.2, -0.3],
      [0x43a047, 5.0, 1.2,  0.2],
      [0xff8f00, 5.8, 1.2, -0.2],
      [0x7b1fa2, 6.6, 1.2,  0.1],
      [0xf5f5f5, 7.2, 1.2, -0.3],
    ];
    vegs.forEach(([col, x, y, z]) => {
      const v = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 7, 6),
        new THREE.MeshLambertMaterial({ color: col })
      );
      v.position.set(x, y, z);
      g.add(v);
    });

    // Sign board canvas
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = 80;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#e65100';
    ctx.fillRect(0, 0, 256, 80);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px \'Hind Siliguri\', Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mkt.name_bn, 128, 30);
    ctx.font = '16px Arial';
    ctx.fillStyle = '#ffe082';
    ctx.fillText('\u09A6\u09B0 \u09A6\u09B0 \u0995\u09B0\u09C1\u09A8! | Bargain here!', 128, 58);
    const tex = new THREE.CanvasTexture(cv);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 0.95),
      new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide })
    );
    sign.position.set(5.5, 3.55, 0);
    g.add(sign);

    // Vendor figure
    const vendor = new THREE.Group();
    const vBody = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.85, 0.28),
      new THREE.MeshLambertMaterial({ color: 0xfb8c00 }));
    vBody.position.y = 0.42;
    vendor.add(vBody);
    const vHead = new THREE.Mesh(new THREE.SphereGeometry(0.18, 7, 6),
      new THREE.MeshLambertMaterial({ color: 0xf4a460 }));
    vHead.position.y = 1.05;
    vendor.add(vHead);
    vendor.position.set(3.5, 0, 0);
    g.add(vendor);

    g.visible = true;
    GS.scene.add(g);
    GS.marketMeshes[mkt.id] = g;
  });
}

// ─── TRUCK ────────────────────────────────────────────────────────────────────
function buildTruck() {
  const group = new THREE.Group();
  const mk = (geo, col, rough, met) => {
    const m = new THREE.MeshStandardMaterial({ color: col, roughness: (rough===undefined?0.7:rough), metalness: (met===undefined?0:met) });
    return new THREE.Mesh(geo, m);
  };

  // ─── CHASSIS ────────────────────────────────────────────────
  const chassis = mk(new THREE.BoxGeometry(3.2, 0.28, 7.0), 0x2d2d2d, 0.8);
  chassis.position.set(0, 0.44, 0);
  chassis.castShadow = true;
  group.add(chassis);

  // Side skirts
  [-1.52, 1.52].forEach(x => {
    const sk = mk(new THREE.BoxGeometry(0.1, 0.18, 6.6), 0x212121, 0.9);
    sk.position.set(x, 0.34, 0);
    group.add(sk);
  });

  // ─── CARGO BOX ───────────────────────────────────────────────
  const cargoMat = new THREE.MeshStandardMaterial({ color: 0x2e8b2e, roughness: 0.6 });
  const cargoMesh = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.8, 5.6), cargoMat);
  cargoMesh.position.set(0, 2.1, -0.3);
  cargoMesh.castShadow = true;
  group.add(cargoMesh);

  // Corrugated vertical stripes on cargo sides (darker green)
  for (let i = 0; i < 8; i++) {
    const z = -3.0 + i * 0.8;
    [-1.72, 1.72].forEach(x => {
      const stripe = mk(new THREE.BoxGeometry(0.08, 2.85, 0.18), 0x226022, 0.7);
      stripe.position.set(x, 2.1, z);
      group.add(stripe);
    });
  }

  // Cargo top frame / border
  const topFrame = mk(new THREE.BoxGeometry(3.5, 0.14, 5.7), 0x1a5c1a, 0.6);
  topFrame.position.set(0, 3.55, -0.3);
  group.add(topFrame);

  // ─── REAR PANEL (canvas texture) ────────────────────────────
  {
    const c = document.createElement('canvas');
    c.width = 512; c.height = 384;
    const ctx = c.getContext('2d');
    // Green background
    ctx.fillStyle = '#2e8b2e';
    ctx.fillRect(0, 0, 512, 384);
    // Vertical stripes
    ctx.fillStyle = '#226022';
    for (let i = 0; i < 8; i++) { ctx.fillRect(i*64, 0, 10, 384); }
    // White banner strip
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(20, 20, 472, 80);
    // Bengali title
    ctx.fillStyle = '#1a5c1a';
    ctx.font = 'bold 52px Hind Siliguri, Arial';
    ctx.textAlign = 'center';
    ctx.fillText('\u09b8\u09ac\u099c\u09bf\u09b0 \u099f\u09cd\u09b0\u09be\u0995', 256, 80);
    // Leaf icon
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.ellipse(256, 230, 60, 85, -0.3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#2e8b2e';
    ctx.beginPath(); ctx.ellipse(256, 230, 36, 65, -0.3, 0, Math.PI*2); ctx.fill();
    // Leaf vein
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(256, 160); ctx.lineTo(256, 310); ctx.stroke();
    // Red rear lights slots
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(20, 330, 80, 40);
    ctx.fillRect(412, 330, 80, 40);

    const tex = new THREE.CanvasTexture(c);
    const rearPanel = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.8), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 }));
    rearPanel.position.set(0, 2.1, -3.11);
    rearPanel.rotation.y = Math.PI;
    group.add(rearPanel);
  }

  // --- VEGETABLES ON TOP (hidden until purchased) ---
  const vegGroup = new THREE.Group();
  GS.vegGroup = vegGroup;
  vegGroup.visible = false;
  const addVeg = (geo, col, x, y, z) => {
    const v = mk(geo, col, 0.8);
    v.position.set(x, y, z);
    v.castShadow = true;
    vegGroup.add(v);
    return v;
  };
  const addStem = (x, y, z) => {
    const s = mk(new THREE.CylinderGeometry(0.04, 0.04, 0.3, 6), 0x33691e, 0.9);
    s.position.set(x, y + 0.22, z);
    vegGroup.add(s);
  };

  const vegY = 3.72;
  // Tomatoes (red spheres)
  addVeg(new THREE.SphereGeometry(0.28, 10, 8), 0xe53935, -0.7, vegY + 0.28, -0.5);  addStem(-0.7, vegY+0.28, -0.5);
  addVeg(new THREE.SphereGeometry(0.24, 10, 8), 0xe53935, 0.2,  vegY + 0.24, -1.2);  addStem(0.2, vegY+0.24, -1.2);
  addVeg(new THREE.SphereGeometry(0.26, 10, 8), 0xc62828, -0.1, vegY + 0.26, 0.1);   addStem(-0.1, vegY+0.26, 0.1);

  // Carrots (orange cylinders)
  const c1 = addVeg(new THREE.CylinderGeometry(0.08, 0.18, 0.8, 8), 0xff7043, 0.6, vegY + 0.5, -0.6);
  c1.rotation.z = 0.4;
  const c2 = addVeg(new THREE.CylinderGeometry(0.07, 0.16, 0.75, 8), 0xff8f00, -0.4, vegY + 0.5, -1.4);
  c2.rotation.z = -0.5; c2.rotation.x = 0.2;
  // Carrot greens
  addVeg(new THREE.SphereGeometry(0.15, 6, 5), 0x33691e, 0.6 + 0.25, vegY + 0.85, -0.6);
  addVeg(new THREE.SphereGeometry(0.13, 6, 5), 0x33691e, -0.4 - 0.2, vegY + 0.88, -1.4);

  // Broccoli (large green sphere + stalk)
  addVeg(new THREE.SphereGeometry(0.38, 10, 8), 0x388e3c, 1.0, vegY + 0.55, 0.4);
  addVeg(new THREE.CylinderGeometry(0.1, 0.12, 0.4, 7), 0x2e7d32, 1.0, vegY + 0.2, 0.4);
  // Broccoli florets
  addVeg(new THREE.SphereGeometry(0.22, 8, 6), 0x43a047, 0.75, vegY + 0.85, 0.2);
  addVeg(new THREE.SphereGeometry(0.20, 8, 6), 0x43a047, 1.2, vegY + 0.82, 0.5);

  // Cucumber (dark green long cylinder)
  const cu = addVeg(new THREE.CylinderGeometry(0.12, 0.12, 1.1, 9), 0x558b2f, -1.0, vegY + 0.55, -0.2);
  cu.rotation.z = 0.6;
  addVeg(new THREE.SphereGeometry(0.12, 7, 6), 0x33691e, -1.0+0.55, vegY + 0.85, -0.2);

  // Eggplant / Brinjal (purple)
  const eg = addVeg(new THREE.SphereGeometry(0.26, 10, 8), 0x7b1fa2, 0.9, vegY + 0.42, -1.5);
  eg.scale.y = 1.45;
  addStem(0.9, vegY + 0.75, -1.5);
  addVeg(new THREE.SphereGeometry(0.10, 7, 6), 0x4a148c, 0.9, vegY + 0.72, -1.5);

  // Bell pepper (orange)
  addVeg(new THREE.SphereGeometry(0.24, 10, 8), 0xf57c00, -0.3, vegY + 0.34, -2.0); addStem(-0.3, vegY+0.34, -2.0);
  addVeg(new THREE.SphereGeometry(0.22, 10, 8), 0xffa000, 0.5, vegY + 0.32, -2.2);  addStem(0.5, vegY+0.32, -2.2);

  // Cauliflower (white)
  addVeg(new THREE.SphereGeometry(0.32, 9, 7), 0xf5f5f5, -0.8, vegY + 0.32, -2.1);
  addVeg(new THREE.SphereGeometry(0.18, 8, 6), 0xeeeeee, -0.5, vegY + 0.38, -2.3);
  addVeg(new THREE.CylinderGeometry(0.08, 0.1, 0.3, 7), 0xc8e6c9, -0.8, vegY + 0.06, -2.1);

  // Green onion tops
  addVeg(new THREE.CylinderGeometry(0.05, 0.05, 0.7, 7), 0x1b5e20, 1.1, vegY + 0.55, -2.0);
  addVeg(new THREE.CylinderGeometry(0.05, 0.05, 0.65, 7), 0x1b5e20, 1.3, vegY + 0.55, -1.7);

  group.add(vegGroup);

  // ─── CAB (white) ─────────────────────────────────────────────
  const cabMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.4 });
  const cab = new THREE.Mesh(new THREE.BoxGeometry(3.1, 2.4, 2.2), cabMat);
  cab.position.set(0, 1.9, 2.8);
  cab.castShadow = true;
  group.add(cab);

  // Cab roof (slightly rounded look via bevel-like layer)
  const roof = mk(new THREE.BoxGeometry(3.0, 0.22, 2.1), 0xe0e0e0, 0.5);
  roof.position.set(0, 3.15, 2.8);
  group.add(roof);

  // Cab-to-cargo connector
  const conn = mk(new THREE.BoxGeometry(3.1, 2.4, 0.2), 0xf5f5f5, 0.5);
  conn.position.set(0, 1.9, 1.7);
  group.add(conn);

  // Door outlines (dark strip both sides)
  [-1.51, 1.51].forEach(x => {
    const door = mk(new THREE.BoxGeometry(0.06, 1.8, 1.8), 0x616161, 0.7);
    door.position.set(x, 1.8, 2.8);
    group.add(door);
    // Door handle
    const handle = mk(new THREE.BoxGeometry(0.08, 0.1, 0.35), 0x9e9e9e, 0.4, 0.3);
    handle.position.set(x * 1.03, 1.75, 2.3);
    group.add(handle);
  });

  // ─── WINDSHIELD — kawaii face canvas ────────────────────────
  {
    const wc = document.createElement('canvas');
    wc.width = 512; wc.height = 384;
    const wx = wc.getContext('2d');
    // Sky-blue gradient background
    const grad = wx.createLinearGradient(0, 0, 0, 384);
    grad.addColorStop(0, '#87ceeb');
    grad.addColorStop(1, '#b0e2ff');
    wx.fillStyle = grad;
    wx.roundRect ? wx.roundRect(20, 20, 472, 344, 40) : wx.fillRect(20, 20, 472, 344);
    wx.fill();
    // Shine glare
    wx.fillStyle = 'rgba(255,255,255,0.35)';
    wx.beginPath(); wx.ellipse(160, 100, 70, 30, -0.5, 0, Math.PI*2); wx.fill();
    // Eyes (big dark ovals)
    wx.fillStyle = '#1a1a2e';
    wx.beginPath(); wx.ellipse(168, 200, 52, 65, 0, 0, Math.PI*2); wx.fill();
    wx.beginPath(); wx.ellipse(344, 200, 52, 65, 0, 0, Math.PI*2); wx.fill();
    // Eye whites / shine
    wx.fillStyle = '#ffffff';
    wx.beginPath(); wx.ellipse(152, 178, 18, 22, -0.3, 0, Math.PI*2); wx.fill();
    wx.beginPath(); wx.ellipse(328, 178, 18, 22, -0.3, 0, Math.PI*2); wx.fill();
    // Tiny pupils
    wx.fillStyle = '#0d0d1a';
    wx.beginPath(); wx.ellipse(175, 205, 22, 28, 0, 0, Math.PI*2); wx.fill();
    wx.beginPath(); wx.ellipse(351, 205, 22, 28, 0, 0, Math.PI*2); wx.fill();
    // Rosy cheeks
    wx.fillStyle = 'rgba(255,100,100,0.38)';
    wx.beginPath(); wx.ellipse(110, 280, 50, 28, 0, 0, Math.PI*2); wx.fill();
    wx.beginPath(); wx.ellipse(402, 280, 50, 28, 0, 0, Math.PI*2); wx.fill();
    // Smile
    wx.strokeStyle = '#1a1a2e'; wx.lineWidth = 12; wx.lineCap = 'round';
    wx.beginPath(); wx.arc(256, 260, 70, 0.2, Math.PI - 0.2); wx.stroke();

    const wtex = new THREE.CanvasTexture(wc);
    const wind = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 2.0), new THREE.MeshStandardMaterial({ map: wtex, roughness: 0.3, transparent: true, opacity: 0.92 }));
    wind.position.set(0, 1.92, 1.91);
    group.add(wind);
  }

  // ─── FRONT GRILLE ────────────────────────────────────────────
  const grille = mk(new THREE.BoxGeometry(2.6, 0.55, 0.08), 0x212121, 0.8);
  grille.position.set(0, 1.05, 3.92);
  group.add(grille);
  // Grille bars
  for (let i = -3; i <= 3; i++) {
    const bar = mk(new THREE.BoxGeometry(0.07, 0.5, 0.1), 0x424242, 0.7);
    bar.position.set(i * 0.38, 1.05, 3.93);
    group.add(bar);
  }

  // ─── FRONT BUMPER ────────────────────────────────────────────
  const fBumper = mk(new THREE.BoxGeometry(3.15, 0.36, 0.22), 0x424242, 0.7);
  fBumper.position.set(0, 0.62, 3.91);
  group.add(fBumper);

  // ─── HEADLIGHTS ──────────────────────────────────────────────
  [[-1.0, 1.45, 3.92], [1.0, 1.45, 3.92]].forEach(([x, y, z]) => {
    // Surround
    const sur = mk(new THREE.BoxGeometry(0.72, 0.52, 0.1), 0x2d2d2d, 0.6);
    sur.position.set(x, y, z - 0.01);
    group.add(sur);
    // Lens (amber/yellow)
    const lens = mk(new THREE.BoxGeometry(0.58, 0.38, 0.12), 0xffb300, 0.2, 0.1);
    lens.position.set(x, y, z + 0.01);
    group.add(lens);
    // Inner bright spot
    const spot = mk(new THREE.BoxGeometry(0.3, 0.22, 0.12), 0xfff176, 0.1);
    spot.position.set(x, y, z + 0.02);
    group.add(spot);
  });

  // Side mirrors
  [-1.62, 1.62].forEach(x => {
    const mir = mk(new THREE.BoxGeometry(0.08, 0.22, 0.38), 0x424242, 0.6);
    mir.position.set(x, 2.85, 2.4);
    group.add(mir);
    const mirFace = mk(new THREE.BoxGeometry(0.1, 0.2, 0.3), 0x9ecfec, 0.2);
    mirFace.position.set(x * 1.03, 2.85, 2.38);
    group.add(mirFace);
  });

  // ─── REAR BUMPER ─────────────────────────────────────────────
  const rBumper = mk(new THREE.BoxGeometry(3.15, 0.36, 0.22), 0x424242, 0.7);
  rBumper.position.set(0, 0.62, -3.22);
  group.add(rBumper);

  // Rear lights (red)
  [[-1.2, 0.95, -3.24], [1.2, 0.95, -3.24]].forEach(([x, y, z]) => {
    const rl = mk(new THREE.BoxGeometry(0.42, 0.28, 0.1), 0xff1744, 0.3, 0.05);
    rl.position.set(x, y, z);
    group.add(rl);
  });

  // ─── WHEELS (4) ──────────────────────────────────────────────
  GS.wheels = [];
  const wheelPos = [
    [-1.7, 0.46,  2.3],
    [ 1.7, 0.46,  2.3],
    [-1.7, 0.46, -2.0],
    [ 1.7, 0.46, -2.0],
  ];
  wheelPos.forEach(([wx, wy, wz]) => {
    const wg = new THREE.Group();
    // Tyre
    const tyre = new THREE.Mesh(
      new THREE.CylinderGeometry(0.46, 0.46, 0.38, 16),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 })
    );
    tyre.rotation.z = Math.PI / 2;
    wg.add(tyre);
    // Rim
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(0.30, 0.30, 0.40, 14),
      new THREE.MeshStandardMaterial({ color: 0xbdbdbd, roughness: 0.3, metalness: 0.5 })
    );
    rim.rotation.z = Math.PI / 2;
    wg.add(rim);
    // Hub cap
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.10, 0.10, 0.42, 8),
      new THREE.MeshStandardMaterial({ color: 0xe0e0e0, roughness: 0.3, metalness: 0.6 })
    );
    hub.rotation.z = Math.PI / 2;
    wg.add(hub);
    // Lug bolts
    for (let b = 0; b < 5; b++) {
      const ang = (b / 5) * Math.PI * 2;
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.025, 0.025, 0.44, 5),
        new THREE.MeshStandardMaterial({ color: 0x616161, roughness: 0.4, metalness: 0.7 })
      );
      bolt.rotation.z = Math.PI / 2;
      bolt.position.set(0, Math.sin(ang) * 0.18, Math.cos(ang) * 0.18);
      wg.add(bolt);
    }
    wg.position.set(wx, wy, wz);
    wg.castShadow = true;
    group.add(wg);
    GS.wheels.push(wg);
  });

  // ─── EXHAUST PIPE ────────────────────────────────────────────
  const exhaust = mk(new THREE.CylinderGeometry(0.07, 0.07, 1.2, 8), 0x424242, 0.6, 0.3);
  exhaust.position.set(-1.3, 3.35, 1.65);
  group.add(exhaust);

  group.position.set(0, 0, 0);
  GS.truckGroup = group;
  GS.scene.add(group);

  buildExhaustSmoke();
}

// ─── EXHAUST SMOKE ────────────────────────────────────────────────────────────
function buildExhaustSmoke() {
  const count = 40;
  const positions = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.3, transparent: true, opacity: 0.5 });
  const pts = new THREE.Points(geo, mat);
  pts.position.set(-1.4, 3.6, 1.8);
  GS.truckGroup.add(pts);
  GS.exhaustPoints = pts;
  GS.exhaustPositions = positions;
  GS.exhaustCount = count;
  // Initialize random
  for (let i = 0; i < count; i++) {
    positions[i*3]   = (Math.random()-0.5)*0.2;
    positions[i*3+1] = Math.random() * 3;
    positions[i*3+2] = (Math.random()-0.5)*0.2;
  }
}

function updateExhaust(dt) {
  if (!GS.exhaustPoints) return;
  const p = GS.exhaustPositions;
  const spd = GS.truckSpd / CFG.TRUCK.MAX_SPD;
  for (let i = 0; i < GS.exhaustCount; i++) {
    p[i*3+1] += dt * (1.5 + spd * 2);
    p[i*3]   += (Math.random()-0.5) * 0.04;
    if (p[i*3+1] > 4) {
      p[i*3]   = (Math.random()-0.5)*0.2;
      p[i*3+1] = 0;
      p[i*3+2] = (Math.random()-0.5)*0.2;
    }
  }
  GS.exhaustPoints.geometry.attributes.position.needsUpdate = true;
  GS.exhaustPoints.material.opacity = 0.2 + spd * 0.4;
}

// ─── RAIN ─────────────────────────────────────────────────────────────────────
function buildRain() {
  const count = 2000;
  const positions = new Float32Array(count * 6); // 2 points per line
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 60;
    const y = Math.random() * 30;
    const z = (Math.random() - 0.5) * 60;
    positions[i*6]   = x;
    positions[i*6+1] = y;
    positions[i*6+2] = z;
    positions[i*6+3] = x;
    positions[i*6+4] = y - 0.8;
    positions[i*6+5] = z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0x8ab4d0, transparent: true, opacity: 0.55 });
  const lines = new THREE.LineSegments(geo, mat);
  lines.visible = false;
  GS.scene.add(lines);
  GS.rainLines = lines;
  GS.rainPositions = positions;
  GS.rainCount = count;
}

function updateRain(dt) {
  if (!GS.rainLines) return;
  GS.rainLines.visible = GS.isRaining;
  if (!GS.isRaining) return;

  // Follow truck
  GS.rainLines.position.x = GS.truckGroup ? GS.truckGroup.position.x : 0;
  GS.rainLines.position.z = GS.truckZ;

  const p = GS.rainPositions;
  const speed = 18;
  for (let i = 0; i < GS.rainCount; i++) {
    p[i*6+1]   -= dt * speed;
    p[i*6+3+1] -= dt * speed;
    if (p[i*6+1] < -2) {
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      p[i*6]   = x;
      p[i*6+1] = 28;
      p[i*6+2] = z;
      p[i*6+3] = x;
      p[i*6+4] = 28 - 0.8;
      p[i*6+5] = z;
    }
  }
  GS.rainLines.geometry.attributes.position.needsUpdate = true;
}

// ─── ATMOSPHERE ───────────────────────────────────────────────────────────────
function updateAtmosphere() {
  // Find current zone
  let zIdx = 0;
  for (let i = CFG.ZONES.length - 1; i >= 0; i--) {
    if (GS.truckZ >= CFG.ZONES[i].z) { zIdx = i; break; }
  }
  GS.zoneIdx = zIdx;
  const zone = CFG.ZONES[zIdx];

  let skyColor = zone.sky;
  let fogColor = zone.fog;
  if (GS.isRaining) {
    // Darken sky when raining
    skyColor = (skyColor & 0xfefefe) >> 1;
    fogColor = skyColor;
  }

  GS.scene.background.setHex(skyColor);
  GS.scene.fog.color.setHex(fogColor);

  // Sun direction tweaks per zone
  if (GS.sun) {
    const t = zIdx / (CFG.ZONES.length - 1);
    GS.sun.intensity = 1.0 - t * 0.3;
  }
}

// ─── CAMERA ───────────────────────────────────────────────────────────────────
function updateCamera() {
  if (!GS.camera || !GS.truckGroup) return;
  const tz = GS.truckZ;
  // No camera bob — keeps truck steady on screen
  GS.camera.position.set(0, 6, tz - 11);
  GS.camera.lookAt(0, 1.5, tz + 12);
}

// ─── PHYSICS ──────────────────────────────────────────────────────────────────
function updatePhysics(dt) {
  if (GS.state !== 'driving') return;

  const K = CFG.TRUCK;
  const accel = GS.keys.right;
  const brake  = GS.keys.left;

  // Boost
  if (GS.boostTimer > 0) GS.boostTimer -= dt;
  const bMult = GS.boostTimer > 0 ? K.BOOST_MULT : 1;

  if (accel) {
    GS.truckSpd += dt * K.ACCEL * bMult;
  } else if (brake) {
    GS.truckSpd -= dt * K.BRAKE;
    if (GS.truckSpd < -8) GS.truckSpd = -8;
  } else {
    // Friction
    if (GS.truckSpd > 0) {
      GS.truckSpd -= dt * K.FRICTION;
      if (GS.truckSpd < 0) GS.truckSpd = 0;
    } else if (GS.truckSpd < 0) {
      GS.truckSpd += dt * K.FRICTION;
      if (GS.truckSpd > 0) GS.truckSpd = 0;
    }
  }
  GS.truckSpd = Math.max(-8, Math.min(K.MAX_SPD, GS.truckSpd));

  // Move truck
  const dist = GS.truckSpd * dt * 0.5;  // scale to 3D units/s
  GS.truckZ += dist;
  GS.truckZ = Math.max(10, GS.truckZ);

  // Update truck group position
  if (GS.truckGroup) {
    GS.truckGroup.position.z = GS.truckZ;
    // Truck stays upright for stable camera view
    GS.truckGroup.rotation.z = 0;
  }

  // Animate wheels
  const wheelSpin = GS.truckSpd * dt * 1.5;
  GS.wheels.forEach(w => { w.children[0].rotation.x += wheelSpin; });

  // Fuel
  GS.truckFuel -= Math.abs(dist) * K.FUEL_BURN;
  if (GS.truckFuel < 0) GS.truckFuel = 0;
  if (GS.truckFuel === 0) {
    showGameOver('জ্বালানি শেষ!', 'Out of fuel! Game over.');
    return;
  }

  // Rain toggle
  GS.rainTimer -= dt;
  if (GS.rainTimer <= 0) {
    GS.isRaining = Math.random() < 0.3;
    GS.rainTimer = 20 + Math.random() * 40;
    document.getElementById('h-weather-txt').textContent = GS.isRaining ? '🌧️' : '☀️';
    if (window.Audio && Audio.startRain) {
      if (GS.isRaining) Audio.startRain();
      else Audio.stopRain();
    }
  }

  // Audio engine sound
  if (window.Audio && Audio.updateEngine) {
    Audio.updateEngine(GS.truckSpd / CFG.TRUCK.MAX_SPD);
  }

  // Check obstacle triggers
  for (const obs of GS.obstacles) {
    if (!obs.passed && !obs.triggered && GS.truckZ >= obs.z3d - 9) {
      obs.triggered = true;
      GS.truckSpd = 0;
      GS.state = 'obstacle';
      GS.currentObs = obs;
      if (window.Audio && Audio.obstacleAlert) Audio.obstacleAlert();
      showObstacleDialog(obs);
      return;
    }
  }

  // Check roadside market triggers
  for (const mkt of GS.markets) {
    if (!mkt.visited && !mkt.triggered && GS.truckZ >= mkt.z3d - 12) {
      mkt.triggered = true;
      GS.truckSpd = 0;
      GS.state = 'obstacle';
      GS.currentMkt = mkt;
      showMarketBargain(mkt);
      return;
    }
  }

  // Check destination
  if (GS.truckZ >= CFG.DEST_Z) {
    showResult();
    return;
  }
}

// ─── HUD ─────────────────────────────────────────────────────────────────────
function updateHUD() {
  document.getElementById('h-money').textContent = '৳' + Math.floor(GS.cash).toLocaleString('bn-BD');
  document.getElementById('h-cargo').textContent = GS.cargo + ' কেজি';
  document.getElementById('h-fuel-mini').style.width = GS.truckFuel + '%';
  document.getElementById('h-spd-txt').textContent = Math.round(Math.abs(GS.truckSpd)) + ' km/h';

  const zone = CFG.ZONES[GS.zoneIdx];
  document.getElementById('h-phase-icon').textContent = zone.icon;
  document.getElementById('h-phase-name').textContent = zone.name_bn + ' — ' + zone.name_en;

  drawSpeedometer(Math.abs(GS.truckSpd), CFG.TRUCK.MAX_SPD);
  updateRouteBar();
}

// ─── SPEEDOMETER ─────────────────────────────────────────────────────────────
function drawSpeedometer(speedKmh, maxKmh) {
  const canvas = document.getElementById('speedo');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const cx = W / 2, cy = H / 2, R = W * 0.44;
  ctx.clearRect(0, 0, W, H);

  // Background circle
  const bg = ctx.createRadialGradient(cx, cy, R*0.2, cx, cy, R);
  bg.addColorStop(0, '#1a1a1a');
  bg.addColorStop(1, '#0a0a0a');
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Color arc (green->orange->red), start=225deg, sweep=270deg
  const startA = (225 * Math.PI) / 180;
  const sweepA = (270 * Math.PI) / 180;
  const segCount = 120;
  for (let i = 0; i < segCount; i++) {
    const t = i / segCount;
    const angle = startA + t * sweepA;
    const nangle = startA + (i+1)/segCount * sweepA;
    const r = t < 0.5 ? [Math.floor(255*t*2), 200, 0] : [255, Math.floor(200*(1-t)*2), 0];
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle)*(R*0.62), cy + Math.sin(angle)*(R*0.62));
    ctx.arc(cx, cy, R*0.74, angle, nangle);
    ctx.lineTo(cx + Math.cos(nangle)*(R*0.62), cy + Math.sin(nangle)*(R*0.62));
    ctx.arc(cx, cy, R*0.62, nangle, angle, true);
    ctx.closePath();
    ctx.fillStyle = `rgb(${r[0]},${r[1]},${r[2]})`;
    ctx.fill();
  }

  // Tick marks
  for (let v = 0; v <= maxKmh; v += 10) {
    const t = v / maxKmh;
    const angle = startA + t * sweepA;
    const isMajor = v % 20 === 0;
    const r1 = isMajor ? R * 0.56 : R * 0.60;
    const r2 = R * 0.76;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle)*r1, cy + Math.sin(angle)*r1);
    ctx.lineTo(cx + Math.cos(angle)*r2, cy + Math.sin(angle)*r2);
    ctx.strokeStyle = isMajor ? '#fff' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = isMajor ? 2 : 1;
    ctx.stroke();

    if (isMajor) {
      ctx.fillStyle = '#ccc';
      ctx.font = `${Math.round(R*0.18)}px 'Hind Siliguri', Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lr = R * 0.47;
      ctx.fillText(bn(v), cx + Math.cos(angle)*lr, cy + Math.sin(angle)*lr);
    }
  }

  // Needle
  const needleT = Math.min(speedKmh / maxKmh, 1);
  const needleA = startA + needleT * sweepA;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(needleA);
  // Needle shadow
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.moveTo(0, R*0.07);
  ctx.lineTo(R*0.68, 0);
  ctx.lineTo(0, -R*0.04);
  ctx.closePath();
  ctx.fillStyle = '#ff2222';
  ctx.fill();
  ctx.restore();

  // Center hub
  ctx.beginPath();
  ctx.arc(cx, cy, R*0.09, 0, Math.PI*2);
  ctx.fillStyle = '#333';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, R*0.055, 0, Math.PI*2);
  ctx.fillStyle = '#ff4444';
  ctx.fill();

  // Speed readout
  ctx.fillStyle = '#ffd700';
  ctx.font = `bold ${Math.round(R*0.26)}px 'Hind Siliguri', Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(bn(Math.round(speedKmh)), cx, cy + R * 0.28);
  ctx.fillStyle = '#aaa';
  ctx.font = `${Math.round(R*0.14)}px 'Hind Siliguri', Arial`;
  ctx.fillText('??.??/?.', cx, cy + R * 0.44);
  ctx.fillText('গতি', cx, cy + R * 0.55);
}

// ─── ROUTE BAR ────────────────────────────────────────────────────────────────
function buildObstacleRouteBar() {
  const inner = document.getElementById('h-route-inner');
  if (!inner) return;
  inner.innerHTML = '';
  GS.routeIcons = [];

  // Combine markets + obstacles into a single sorted list by z3d
  const allStops = [
    ...CFG.MARKETS.map(m => ({ ...m, isMarket: true })),
    ...GS.obstacles.map(o => ({ ...o, isMarket: false }))
  ].sort((a, b) => a.z3d - b.z3d);

  allStops.forEach(stop => {
    const span = document.createElement('span');
    span.className = 'route-icon' + (stop.isMarket ? ' route-market' : '');
    span.id = 'ri-' + stop.id;
    span.textContent = stop.icon;
    span.title = stop.isMarket ? stop.name_bn : stop.title_bn;
    inner.appendChild(span);
    GS.routeIcons.push(span);
  });
}

function updateRouteBar() {
  const bar = document.getElementById('h-route-bar');
  if (!bar) return;
  const truck = document.getElementById('h-route-truck');
  const progress = GS.truckZ / CFG.DEST_Z;
  const barW = bar.clientWidth || 280;
  truck.style.left = Math.max(4, Math.min(barW - 20, progress * barW)) + 'px';

  GS.obstacles.forEach(obs => {
    const el = document.getElementById('ri-' + obs.id);
    if (el) {
      if (obs.passed) el.classList.add('passed');
      else el.classList.remove('passed');
    }
  });
  GS.markets.forEach(mkt => {
    const el = document.getElementById('ri-' + mkt.id);
    if (el) {
      if (mkt.visited) el.classList.add('passed');
      else el.classList.remove('passed');
    }
  });
}


// ─── OBSTACLE DIALOG ─────────────────────────────────────────────────────────
function showObstacleDialog(obs) {
  showScreen('s-obstacle');
  document.getElementById('obs-icon').textContent = obs.icon;
  document.getElementById('obs-title-bn').textContent = obs.title_bn;
  document.getElementById('obs-title-en').textContent = obs.title_en;

  const body = document.getElementById('obs-body');
  const btns = document.getElementById('obs-btns');
  body.innerHTML = `<p class="bn">${obs.instr_bn}</p><p class="en">${obs.instr_en}</p>`;
  btns.innerHTML = '';

  function addBtn(label_bn, label_en, cls, action) {
    const b = document.createElement('button');
    b.className = 'obs-btn ' + cls;
    b.innerHTML = `${label_bn}<br><small style="opacity:.75;font-weight:normal">${label_en}</small>`;
    b.onclick = () => { if (window.Audio && Audio.click) Audio.click(); handleChoice(obs.id, action); };
    btns.appendChild(b);
  }

  if (obs.type === 'chanda') {
    const demand = obs.demand || 1000;
    body.innerHTML += `<p style="color:#f5c518;margin-top:8px;font-weight:bold">দাবি: ৳${demand} | Demand: ৳${demand}</p>`;
    addBtn(`💵 চাঁদা দিন (৳${demand})`, `Pay ৳${demand}`, 'obs-btn pay', 'pay');
    addBtn('💪 প্রতিরোধ করুন', 'Resist! Fight back', 'obs-btn fight', 'break');
    addBtn('📞 সাংবাদিক ডাকুন', 'Call journalist (risky)', 'obs-btn wait', 'rush');
  } else if (obs.type === 'railway') {
    addBtn('⏳ ট্রেন পার হওয়া পর্যন্ত অপেক্ষা করুন', 'Wait for train to pass', 'obs-btn wait', 'wait');
    addBtn('🚀 ঝুঁকি নিয়ে পার হন!', 'Risk it! Cross now (DANGEROUS)', 'obs-btn rush', 'rush');
  } else if (obs.type === 'toll') {
    const demand = obs.demand || 400;
    body.innerHTML += `<p style="color:#f5c518;margin-top:8px;font-weight:bold">টোল: ৳${demand}</p>`;
    addBtn(`💵 টোল দিন (৳${demand})`, `Pay toll ৳${demand}`, 'obs-btn pay', 'pay');
    addBtn('🚀 জোরে চালিয়ে পার হন', 'Rush through (risky)', 'obs-btn rush', 'rush');
  } else if (obs.type === 'police') {
    addBtn('📄 কাগজ দেখান', 'Show papers (must be clean)', 'obs-btn talk', 'papers');
    addBtn('💰 ঘুষ দিন (৳800)', 'Pay bribe (৳800)', 'obs-btn pay', 'pay');
    addBtn('😠 তর্ক করুন', 'Argue (risky)', 'obs-btn fight', 'angry');
    addBtn('📞 DSP কে কল করুন', 'Call DSP (gamble)', 'obs-btn wait', 'call');
  } else if (obs.type === 'arot') {
    const cut = Math.floor(GS.cargo * 0.08 * CFG.ECO.SELL_PRICE);
    body.innerHTML += `<p style="color:#f5c518;margin-top:8px;font-weight:bold">কমিশন: ৳${cut} (৮%)</p>`;
    addBtn(`💰 কমিশন দিন (৳${cut})`, `Pay commission ৳${cut} (8%)`, 'obs-btn pay', 'arot_pay');
    addBtn('🤝 সরাসরি বিক্রি করুন', 'Sell direct, skip broker', 'obs-btn talk', 'arot_other');
  }
}

// ─── CHOICE HANDLER ──────────────────────────────────────────────────────────
function handleChoice(obsId, action) {
  const obs = GS.obstacles.find(o => o.id === obsId);
  if (!obs) return;

  if (obs.type === 'chanda') {
    const demand = obs.demand || 1000;
    if (action === 'pay') {
      if (GS.cash >= demand) {
        GS.cash -= demand;
        GS.ledger.push({ lbl_bn: obs.title_bn + ' চাঁদা', val: -demand });
        if (window.Audio && Audio.payCoin) Audio.payCoin();
        resolve3d(obs, `চাঁদা দিলেন। পথ পরিষ্কার। | Paid ৳${demand}. Road clear.`);
      } else {
        resolve3d(obs, `টাকা নেই! জোর করে পার হচ্ছেন… | Not enough cash! Forcing through…`, true, 300);
        triggerDamage(400, 'চাঁদাবাজ মার দিল!');
      }
    } else if (action === 'break') {
      const lucky = Math.random() < 0.4;
      if (lucky) {
        resolve3d(obs, 'প্রতিরোধ সফল! পালিয়ে গেল। | Resistance worked! They fled.');
      } else {
        triggerDamage(800, 'মার খেলেন! | Got beaten!');
        resolve3d(obs, 'প্রতিরোধে ব্যর্থ! মাল নষ্ট হলো। | Failed! Cargo damaged.', true, 600);
        GS.cargo = Math.floor(GS.cargo * 0.8);
      }
    } else { // rush / journalist
      const lucky = Math.random() < 0.5;
      if (lucky) {
        resolve3d(obs, 'সাংবাদিক আসছেন! সরে গেল। | Journalist worked! They left.');
      } else {
        triggerDamage(600, 'আটকে দিল! | Blocked!');
        GS.cash -= 600;
        GS.ledger.push({ lbl_bn: 'জরিমানা', val: -600 });
        resolve3d(obs, 'কাজ হলো না। জরিমানা দিতে হলো। | Failed. Fine paid.', true, 600);
      }
    }

  } else if (obs.type === 'railway') {
    if (action === 'wait') {
      resolve3d(obs, 'ট্রেন গেল। এখন পার হওয়া যাবে। | Train passed. All clear.', false, 1000);
    } else {
      const lucky = Math.random() < 0.3;
      if (lucky) {
        resolve3d(obs, '😮 辛운좋게 পার হলেন! | Lucky! Made it across!');
      } else {
        if (window.Audio && Audio.crashBreak) Audio.crashBreak();
        triggerDamage(2000, '🚂 ট্রেনের ধাক্কা! | Hit by train!');
        GS.cargo = Math.floor(GS.cargo * 0.5);
        GS.ledger.push({ lbl_bn: 'ট্রেনে ক্ষতি', val: -2000 });
        GS.cash -= 2000;
        resolve3d(obs, 'ট্রেনে আঘাত! ভয়াবহ ক্ষতি! | Train hit! Massive damage!', true, 800);
      }
    }

  } else if (obs.type === 'toll') {
    const demand = obs.demand || 400;
    if (action === 'pay') {
      GS.cash -= demand;
      GS.ledger.push({ lbl_bn: 'টোল ফি', val: -demand });
      if (window.Audio && Audio.payCoin) Audio.payCoin();
      resolve3d(obs, `টোল দিলেন ৳${demand}। এগিয়ে যান! | Toll paid. Move on!`);
    } else {
      if (Math.random() < 0.5) {
        resolve3d(obs, 'জোরে পার হলেন! | Rushed through!');
        GS.boostTimer = CFG.TRUCK.BOOST_DUR;
      } else {
        const fine = demand * 4;
        GS.cash -= fine;
        GS.ledger.push({ lbl_bn: 'টোল জরিমানা', val: -fine });
        triggerDamage(300, `ধরা পড়লেন! জরিমানা ৳${fine}`);
        resolve3d(obs, `ধরা পড়লেন! জরিমানা ৳${fine} | Caught! Fine ৳${fine}`, true, 600);
      }
    }

  } else if (obs.type === 'police') {
    if (action === 'papers') {
      const ok = Math.random() < 0.65;
      if (ok) {
        resolve3d(obs, 'কাগজ ঠিক আছে। যান! | Papers OK. Go ahead!');
      } else {
        const fine = CFG.ECO.FINE_MINOR;
        GS.cash -= fine;
        GS.ledger.push({ lbl_bn: 'পুলিশ জরিমানা', val: -fine });
        triggerDamage(300, `কাগজে সমস্যা! জরিমানা ৳${fine}`);
        resolve3d(obs, `কাগজে সমস্যা! জরিমানা ৳${fine} | Papers issue! Fine paid.`, true, 700);
      }
    } else if (action === 'pay') {
      GS.cash -= 800;
      GS.ledger.push({ lbl_bn: 'পুলিশ ঘুষ', val: -800 });
      if (window.Audio && Audio.payCoin) Audio.payCoin();
      resolve3d(obs, 'ঘুষ দিলেন ৳৮০০। পথ পরিষ্কার! | Bribe paid ৳800. Clear!');
    } else if (action === 'angry') {
      const fine = CFG.ECO.FINE_MAJOR;
      GS.cash -= fine;
      GS.ledger.push({ lbl_bn: 'মামলা জরিমানা', val: -fine });
      triggerDamage(500, `মামলা হলো! ৳${fine}`);
      resolve3d(obs, `তর্কে মামলা খেলেন! ৳${fine} | Argued — got fined ৳${fine}!`, true, 800);
    } else { // call DSP
      if (Math.random() < 0.45) {
        resolve3d(obs, 'DSP কে চেনেন? ছেড়ে দিল! | DSP connection worked!');
      } else {
        const fine = 700;
        GS.cash -= fine;
        GS.ledger.push({ lbl_bn: 'পুলিশ জরিমানা', val: -fine });
        resolve3d(obs, `কাজ হয়নি। ৳${fine} জরিমানা। | Didn't work. Fine ৳${fine}.`, true, 700);
      }
    }

  } else if (obs.type === 'arot') {
    const cut = Math.floor(GS.cargo * 0.08 * CFG.ECO.SELL_PRICE);
    if (action === 'arot_pay') {
      GS.cash -= cut;
      GS.ledger.push({ lbl_bn: 'আড়ৎ কমিশন', val: -cut });
      if (window.Audio && Audio.payCoin) Audio.payCoin();
      resolve3d(obs, `আড়ৎদার খুশি। ৳${cut} কমিশন দিলেন। | Broker happy. ৳${cut} paid.`);
    } else {
      resolve3d(obs, 'সরাসরি বিক্রির চেষ্টা। সময় লাগবে। | Selling direct. Takes longer.');
      GS.truckFuel -= 8;
    }
  }
}

// ─── RESOLVE / DAMAGE / RESULT ─────────────────────────────────────────────
function triggerDamage(amount, msgBn) {
  if (window.Audio && Audio.damage) Audio.damage();
  const flash = document.getElementById('dmg-flash');
  if (flash) {
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 400);
  }
  if (amount > 0 && GS.cargo > 0) {
    const lostKg = Math.floor(GS.cargo * Math.min(0.15, amount / 8000));
    GS.cargo -= lostKg;
  }
}

function resolve3d(obs, message, _ignore, delayMs) {
  obs.passed = true;
  obs.triggered = true;

  // Hide obstacle marker after passing
  if (GS.obstacleMeshes[obs.id]) {
    setTimeout(() => {
      if (GS.obstacleMeshes[obs.id]) GS.obstacleMeshes[obs.id].visible = false;
    }, 800);
  }

  const delay = delayMs || 0;
  setTimeout(() => {
    hideScreen('s-obstacle');

    // Show message briefly in h-instr
    const instr = document.getElementById('h-instr');
    if (instr) {
      instr.textContent = message;
      setTimeout(() => {
        instr.textContent = '→ চাপুন বা ডান বোতাম দিয়ে এগিয়ে যান';
      }, 2500);
    }

    resumeDriving();
  }, delay + 200);
}

function resumeDriving() {
  GS.state = 'driving';
  GS.currentObs = null;
  showScreen(null); // hide all overlays
  showHUD(true);
  // Give a small speed boost to prevent re-triggering
  if (GS.truckSpd < 5) GS.truckSpd = 5;
}

function showHUD(visible) {
  const hud    = document.getElementById('hud');
  const mob    = document.getElementById('mob-ctrl');
  const speedo = document.getElementById('speedo');
  if (visible) {
    hud.classList.remove('hidden');
    if (speedo) speedo.style.display = 'block';
    if ('ontouchstart' in window) mob.classList.remove('hidden');
  } else {
    hud.classList.add('hidden');
    if (speedo) speedo.style.display = 'none';
    mob.classList.add('hidden');
  }
}

function showResult() {
  GS.state = 'result';
  showHUD(false);
  if (window.Audio && Audio.winJingle) Audio.winJingle();

  const sellPrice = CFG.ECO.SELL_PRICE;
  const revenue = GS.cargo * sellPrice;
  GS.cash += revenue;
  GS.ledger.push({ lbl_bn: `কাওরান বাজার বিক্রি (${GS.cargo}কেজি × ৳${sellPrice})`, val: revenue, cls: 'pos' });

  const netProfit = GS.cash - CFG.ECO.START_CASH;

  document.getElementById('res-emoji').textContent = netProfit >= 0 ? '🎉' : '😔';
  document.getElementById('res-title-bn').textContent = netProfit >= 0 ? 'কাওরান বাজারে পৌঁছেছেন!' : 'লোকসান হয়েছে!';
  document.getElementById('res-title-en').textContent = netProfit >= 0 ? 'Reached Kawran Bazar!' : 'You ran at a loss!';

  let ledgerHtml = '';
  GS.ledger.forEach(row => {
    const cls = row.cls ? row.cls : (row.val >= 0 ? 'pos' : 'neg');
    const sign = row.val >= 0 ? '+' : '';
    ledgerHtml += `<div class="ledger-row"><span class="lbl">${row.lbl_bn}</span><span class="val ${cls}">${sign}৳${bn(Math.abs(row.val))}</span></div>`;
  });
  ledgerHtml += `<div class="ledger-row total"><span class="lbl">মোট নগদ | Total Cash</span><span class="val ${netProfit >= 0 ? 'pos' : 'neg'}">৳${bn(GS.cash)}</span></div>`;
  document.getElementById('res-ledger').innerHTML = ledgerHtml;

  const comments = netProfit > 5000
    ? ['চমৎকার! আপনি একজন দক্ষ ব্যবসায়ী। | Excellent! You are a skilled trader.']
    : netProfit > 0
    ? ['ভালো করেছেন! লাভ আছে। | Good job! You made a profit.']
    : ['এবার লোকসান। আবার চেষ্টা করুন। | Loss this time. Try again!'];
  document.getElementById('res-comment').textContent = comments[0];

  showScreen('s-result');
}

function showGameOver(bn, en) {
  GS.state = 'result';
  showHUD(false);
  if (window.Audio && Audio.gameOver) Audio.gameOver();

  document.getElementById('res-emoji').textContent = '💀';
  document.getElementById('res-title-bn').textContent = bn;
  document.getElementById('res-title-en').textContent = en;
  document.getElementById('res-ledger').innerHTML = '<div class="ledger-row"><span class="lbl">নগদ</span><span class="val">৳' + Math.floor(GS.cash) + '</span></div>';
  document.getElementById('res-comment').textContent = 'দুর্ভাগ্য! আবার চেষ্টা করুন। | Bad luck! Try again.';
  showScreen('s-result');
}

// ─── SCREEN HELPERS ──────────────────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  if (id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('active');
  }
}
function hideScreen(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

// ─── INPUT ────────────────────────────────────────────────────────────────────
function setupInput() {
  document.addEventListener('keydown', function(e) {
    var nav = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'];
    if (nav.indexOf(e.code) !== -1) e.preventDefault();
    if (e.code === 'ArrowUp'    || e.code === 'KeyW' ||
        e.code === 'ArrowRight'  || e.code === 'KeyD') GS.keys.right = true;
    if (e.code === 'ArrowDown'  || e.code === 'KeyS' ||
        e.code === 'ArrowLeft'   || e.code === 'KeyA') GS.keys.left  = true;
    if (e.code === 'Space') honk();
  });
  document.addEventListener('keyup', function(e) {
    if (e.code === 'ArrowUp'    || e.code === 'KeyW' ||
        e.code === 'ArrowRight'  || e.code === 'KeyD') GS.keys.right = false;
    if (e.code === 'ArrowDown'  || e.code === 'KeyS' ||
        e.code === 'ArrowLeft'   || e.code === 'KeyA') GS.keys.left  = false;
  });

  // Mobile
  const mbL = document.getElementById('mb-left');
  const mbR = document.getElementById('mb-right');
  if (mbL) {
    mbL.addEventListener('touchstart', e => { e.preventDefault(); GS.keys.left  = true;  }, { passive:false });
    mbL.addEventListener('touchend',   e => { e.preventDefault(); GS.keys.left  = false; }, { passive:false });
    mbR.addEventListener('touchstart', e => { e.preventDefault(); GS.keys.right = true;  }, { passive:false });
    mbR.addEventListener('touchend',   e => { e.preventDefault(); GS.keys.right = false; }, { passive:false });
  }
}

function honk() {
  if (GS.state !== 'driving') return;
  if (window.Audio && Audio.honk) Audio.honk();
  const pop = document.getElementById('honk-pop');
  if (pop) {
    pop.style.display = 'block';
    clearTimeout(GS._honkT);
    GS._honkT = setTimeout(() => { pop.style.display = 'none'; }, 600);
  }
}

// ============================================================
//  BARGAIN / SHOP SYSTEM
// ============================================================
// Vendor prices (tk/kg): starts high, player haggles down
const VENDOR_PRICES = [16, 14, 13, 12, 11];  // round 0..4
// Vendor dialog lines (Bengali, indexed by round + player action)
const VENDOR_DIALOG = {
  open: [
    '\u09ad\u09be\u0987, \u0986\u099c\u0995\u09c7\u09b0 \u09a6\u09be\u09ae \u09e7\u09ec \u099f\u09be\u0995\u09be \u0995\u09c7\u099c\u09bf! \u09ae\u09be\u09b2 \u098f\u0995\u09a6\u09ae \u09a4\u09be\u099c\u09be \u09b9\u09c7\u0981\u09df\u09be\u09a4\u09c7\u09b0 \u09b8\u09ac\u099c\u09bf\u0964',
    '\u09ad\u09be\u0987, \u09ac\u09be\u099c\u09be\u09b0\u09c7 \u09a6\u09be\u09ae \u09ac\u09c7\u09dc\u09c7 \u0997\u09c7\u099b\u09c7! \u09e7\u09ec/\u0995\u09c7\u099c\u09bf \u09a6\u09be\u09ae \u09a8\u09bf\u09df\u09c7 \u09a6\u09bf\u09a4\u09c7\u099b\u09bf\u0964',
    '\u09b8\u09be\u09b0, \u0986\u099c \u09b8\u0995\u09be\u09b2\u09c7 \u09a4\u09cb\u09b2\u09be\u0964 \u09a6\u09be\u09ae \u09e7\u09ec \u099f\u09be\u0995\u09be \u09aa\u09dc\u09ac\u09c7\u0964',
  ],
  haggle: [
    '\u0986\u09a7\u09be \u0986\u09a7\u09be! \u09a0\u09bf\u0995 \u0986\u099b\u09c7, \u09e7\u09ea \u099f\u09be\u0995\u09be \u09a6\u09c7\u09a8\u0964 \u0986\u09b0 \u0995\u09ae \u09b9\u09ac\u09c7 \u09a8\u09be\u0964',
    '\u09ad\u09be\u0987, \u09b2\u09cb\u0995\u09b8\u09be\u09a8 \u09a6\u09bf\u09df\u09c7 \u09ac\u09c7\u099a\u09a4\u09c7 \u09aa\u09be\u09b0\u09bf \u09a8\u09be! \u09e7\u09e9 \u099f\u09be\u0995\u09be \u09a6\u09bf\u09df\u09c7 \u09a8\u09bf\u09a8\u0964',
    '\u09a0\u09bf\u0995 \u0986\u099b\u09c7 \u09a6\u09be\u09a6\u09be, \u09e7\u09e8 \u099f\u09be\u0995\u09be\u09df \u09a6\u09bf\u09a4\u09c7\u099b\u09bf\u0964 \u09ad\u09be\u09b2\u09cb \u09ae\u09be\u09b2, \u09a0\u0995\u09be\u09df \u09a8\u09be\u0964',
    '\u0986\u09b0 \u09b8\u09be\u09a7\u09cd\u09af \u09a8\u09be\u0987! \u09e7\u09e7 \u09a4\u09c7 \u09a8\u09bf\u09a8\u0964',
  ],
  accept: [
    '\u099c\u09be\u099c\u09be\u0995\u09be\u09b2\u09cd\u09b2\u09be\u09b9! \u09ac\u09c1\u099d\u09a6\u09be\u09b0 \u09ae\u09be\u09a8\u09c1\u09b7\u0964 \u09ae\u09be\u09b2 \u09ad\u09be\u09b0 \u0995\u09b0\u09c7 \u09a6\u09c7\u0993\u09df\u09be \u09b9\u09ac\u09c7\u0964',
    '\u09a6\u09bf\u09b2\u09be\u09ae \u09ad\u09be\u0987! \u09b8\u09c7\u09b0\u09be \u09b8\u09ac\u099c\u09bf \u09aa\u09be\u099a\u09cd\u099b\u09c7\u09a8 \u0986\u09aa\u09a8\u09bf\u0964',
  ],
  walk: '\u09ad\u09be\u0987, \u09a6\u09be\u09ae \u0986\u09b0 \u0995\u09ae\u09be\u09a4\u09c7 \u09aa\u09be\u09b0\u09ac \u09a8\u09be! \u0985\u09a8\u09cd\u09af\u09a5\u09be\u09df \u09a6\u09c7\u0996\u09c1\u09a8\u0964',
};

// Bargain state
let BG = {
  round: 0,
  currentPrice: 16,
  qty: 500,
  maxRounds: 4,
};

function rndPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function startBargain() {
  BG.round = 0;
  BG.mktMode = false;
  BG.currentPrice = VENDOR_PRICES[0];
  BG.qty = Math.min(500, Math.floor(GS.cash / BG.currentPrice));
  if (BG.qty < 100) BG.qty = 100;
  // Hide market banner, show field-market header
  const banner = document.getElementById('mkt-banner');
  if (banner) banner.style.display = 'none';
  renderBargainUI();
}

function renderBargainUI() {
  const el = id => document.getElementById(id);
  const price = BG.currentPrice;
  const qty   = BG.qty;
  const cost  = qty * price;
  const sell  = qty * CFG.ECO.SELL_PRICE;
  const profit = sell - cost;
  const canHaggle = BG.round < BG.maxRounds;

  // Vendor dialog
  let dialog;
  if (BG.round === 0) {
    dialog = rndPick(VENDOR_DIALOG.open);
  } else {
    dialog = BG.lastAction === 'haggle'
      ? (VENDOR_DIALOG.haggle[BG.round - 1] || VENDOR_DIALOG.haggle[VENDOR_DIALOG.haggle.length - 1])
      : rndPick(VENDOR_DIALOG.accept);
  }

  el('bg-dialog').textContent = dialog;
  el('bg-price').textContent  = price;
  el('bg-qty').textContent    = bn(qty);
  el('bg-cost').textContent   = bn(cost);
  el('bg-sell').textContent   = bn(sell);
  el('bg-profit').textContent = bn(profit);
  el('bg-balance').textContent= bn(GS.cash);
  el('bg-round').textContent  = `\u09a6\u09b0 \u09a6\u09b0 ${BG.round + 1}/${BG.maxRounds + 1}`;

  // Qty buttons
  el('bg-minus').onclick = () => {
    BG.qty = Math.max(100, BG.qty - 100);
    renderBargainUI();
  };
  el('bg-plus').onclick = () => {
    BG.qty = Math.min(Math.floor(GS.cash / price), Math.min(2000, BG.qty + 100));
    renderBargainUI();
  };

  // Haggle button
  const haggleBtn = el('bg-haggle');
  if (canHaggle) {
    haggleBtn.disabled = false;
    haggleBtn.classList.remove('disabled');
    const nextPrice = VENDOR_PRICES[BG.round + 1] || price;
    haggleBtn.textContent = `\u09a6\u09b0 \u0995\u09ae\u09be\u09a8\u09cb (${nextPrice}\u09a4\u0995\u09be/\u0995\u09c7\u099c\u09bf) | Haggle`;
    haggleBtn.onclick = () => { doHaggle(); };
  } else {
    haggleBtn.disabled = true;
    haggleBtn.textContent = '\u0986\u09b0 \u0995\u09ae\u09be\u09a8\u09cb \u09af\u09be\u09ac\u09c7 \u09a8\u09be | Final Price';
  }

  // Accept button label
  el('bg-accept').textContent = `\u09b0\u09be\u099c\u09bf! ${price}\u09a4\u0995\u09be/\u0995\u09c7\u099c\u09bf\u09a4\u09c7 \u0995\u09bf\u09a8\u09bf | Buy @ \u09f3${price}/kg`;
}

function doHaggle() {
  if (BG.round >= BG.maxRounds) return;
  if (window.Audio && Audio.click) Audio.click();
  BG.round++;
  BG.lastAction = 'haggle';
  BG.currentPrice = VENDOR_PRICES[BG.round];
  renderBargainUI();
}

function doAccept() {
  if (window.Audio && Audio.payCoin) Audio.payCoin();
  const price = BG.currentPrice;
  const qty   = BG.qty;
  const cost  = qty * price;
  if (GS.cash < cost) {
    document.getElementById('bg-dialog').textContent =
      '\u09ad\u09be\u0987, \u0986\u09aa\u09a8\u09be\u09b0 \u0995\u09be\u099b\u09c7 \u09af\u09a5\u09c7\u09b7\u09cd\u099f \u099f\u09be\u0995\u09be \u09a8\u09c7\u0987! | Not enough cash!';
    return;
  }
  GS.cash     -= cost;
  GS.cargo     = qty;
  GS.buyCost   = cost;
  GS.shopQty   = qty;
  GS.ledger    = [{ lbl_bn: '\u09b8\u09ac\u099c\u09bf \u0995\u09c7\u09a8\u09be (' + qty + '\u0995\u09c7\u099c\u09bf)', val: -cost, cls: 'neg' }];
  // Show vegetables on truck!
  if (GS.vegGroup) GS.vegGroup.visible = true;
  GS.veggiesLoaded = true;
  // Reset truck & start
  GS.truckZ    = 10;
  GS.truckSpd  = 0;
  GS.truckFuel = 100;
  GS.boostTimer = 0;
  GS.rainTimer  = 15;
  GS.zoneIdx   = 0;
  GS.obstacles = CFG.OBSTACLES.map(o => Object.assign({}, o, { passed: false, triggered: false }));
  GS.markets   = CFG.MARKETS.map(m => Object.assign({}, m, { visited: false, triggered: false }));
  Object.values(GS.marketMeshes).forEach(m => { m.visible = true; });
  Object.values(GS.obstacleMeshes).forEach(m => { m.visible = true; });
  buildObstacleRouteBar();
  showScreen(null);
  showHUD(true);
  GS.state = 'driving';
  if (window.Audio && Audio.init) Audio.init();
}

// ============================================================
//  ROADSIDE MARKET BARGAIN (mid-drive)
// ============================================================
function showMarketBargain(mkt) {
  // Reuse the shop screen but configure it for roadside purchase
  BG.round = 0;
  BG.currentPrice = mkt.priceHigh;
  BG.qty = Math.min(mkt.maxKg, Math.floor(GS.cash / BG.currentPrice));
  if (BG.qty < 50) BG.qty = 50;
  BG.mktMode = true;
  BG.mkt = mkt;
  // Patch vendor prices for this market
  BG._mktPrices = [];
  const steps = 4;
  for (let s = 0; s <= steps; s++) {
    BG._mktPrices.push(Math.round(mkt.priceHigh - s * (mkt.priceHigh - mkt.priceLow) / steps));
  }
  // Patch VENDOR_PRICES temporarily
  BG._savedPrices = VENDOR_PRICES.slice();
  for (let i = 0; i < VENDOR_PRICES.length; i++) VENDOR_PRICES[i] = BG._mktPrices[i] || mkt.priceLow;

  // Update market header text
  document.getElementById('bg-dialog').textContent =
    '\u09ad\u09be\u0987, \u0986\u09ae\u09be\u09b0 \u09ac\u09be\u099c\u09be\u09b0\u09c7 \u09ad\u09be\u09b2\u09cb \u09b8\u09ac\u099c\u09bf \u0986\u099b\u09c7! \u09a6\u09be\u09ae ' + mkt.priceHigh + ' \u099f\u09be\u0995\u09be \u0995\u09c7\u099c\u09bf\u0964';
  renderBargainUI();
  showScreen('s-shop');
  const mktBanner = document.getElementById('mkt-banner');
  if (mktBanner) { mktBanner.style.display = 'block'; mktBanner.textContent = '\uD83C\uDFEA ' + mkt.name_bn + ' \u2014 ' + mkt.name_en; }
  // Override accept to do market buy
  document.getElementById('bg-accept').onclick = () => doMarketBuy();
  document.getElementById('btn-shop-back').onclick = () => skipMarket();
}

function doMarketBuy() {
  if (window.Audio && Audio.payCoin) Audio.payCoin();
  const price = BG.currentPrice;
  const qty   = BG.qty;
  const cost  = qty * price;
  if (GS.cash < cost) {
    document.getElementById('bg-dialog').textContent = '\u09ad\u09be\u0987, \u0986\u09aa\u09a8\u09be\u09b0 \u0995\u09be\u099b\u09c7 \u09af\u09a5\u09c7\u09b7\u09cd\u099f \u099f\u09be\u0995\u09be \u09a8\u09c7\u0987!';
    return;
  }
  GS.cash  -= cost;
  GS.cargo += qty;
  GS.ledger.push({ lbl_bn: (BG.mkt ? BG.mkt.name_bn : '\u09b0\u09be\u09b8\u09cd\u09a4\u09be\u09df \u0995\u09c7\u09a8\u09be') + ' (' + qty + '\u0995\u09c7\u099c\u09bf)', val: -cost, cls: 'neg' });
  // Show veggies if not yet visible
  if (GS.vegGroup) GS.vegGroup.visible = true;
  GS.veggiesLoaded = true;
  // Restore prices
  if (BG._savedPrices) for (let i = 0; i < VENDOR_PRICES.length; i++) VENDOR_PRICES[i] = BG._savedPrices[i];
  finishMarket();
}

function skipMarket() {
  // Player skips market without buying
  if (BG._savedPrices) for (let i = 0; i < VENDOR_PRICES.length; i++) VENDOR_PRICES[i] = BG._savedPrices[i];
  finishMarket();
}

function finishMarket() {
  BG.mktMode = false;
  const _b = document.getElementById('mkt-banner'); if (_b) _b.style.display = 'none';
  if (GS.currentMkt) GS.currentMkt.visited = true;
  GS.currentMkt = null;
  // Rewire accept button back to normal
  document.getElementById('bg-accept').onclick = () => doAccept();
  document.getElementById('btn-shop-back').onclick = () => Game.showMenu();
  showScreen(null);
  showHUD(true);
  GS.state = 'driving';
}

// ============================================================
//  BUTTON WIRING
// ============================================================
function wireButtons() {
  // Menu
  document.getElementById('btn-play').onclick   = () => { if (window.Audio && Audio.click) Audio.click(); Game.showShop(); };
  document.getElementById('btn-howto').onclick  = () => { if (window.Audio && Audio.click) Audio.click(); Game.showHowTo(); };
  document.getElementById('btn-howto-ok').onclick   = () => Game.showShop();
  document.getElementById('btn-howto-back').onclick = () => Game.showMenu();
  document.getElementById('btn-shop-back').onclick  = () => Game.showMenu();
  document.getElementById('btn-restart').onclick    = () => Game.restart();

  // Bargain buttons
  document.getElementById('bg-accept').onclick = () => doAccept();
  document.getElementById('bg-haggle').onclick  = () => doHaggle();

  // HUD controls
  const muteBtn = document.getElementById('h-mute');
  if (muteBtn) {
    muteBtn.onclick = () => {
      if (window.Audio && Audio.toggleMute) {
        const muted = Audio.toggleMute();
        muteBtn.textContent = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
        muteBtn.classList.toggle('muted', muted);
      }
    };
  }
  const pauseBtn = document.getElementById('h-pause');
  if (pauseBtn) {
    pauseBtn.onclick = () => {
      GS.paused = !GS.paused;
      pauseBtn.textContent = GS.paused ? '\u25B6' : '\u23F8';
    };
  }
}

// ============================================================
//  GAME OBJECT (PUBLIC API)
// ============================================================
const Game = {
  showMenu() {
    GS.state = 'menu';
    showHUD(false);
    showScreen('s-menu');
  },

  showHowTo() {
    showScreen('s-howto');
  },

  showShop() {
    startBargain();
    showScreen('s-shop');
  },

  restart() {
    GS.cash  = CFG.ECO.START_CASH;
    GS.cargo = 0;
    GS.ledger = [];
    GS.obstacles = [];
    GS.truckZ = 10;
    GS.truckSpd = 0;
    GS.isRaining = false;
    GS.veggiesLoaded = false;
    if (GS.vegGroup) GS.vegGroup.visible = false;
    GS.markets = CFG.MARKETS.map(m => Object.assign({}, m, { visited: false, triggered: false }));
    Object.values(GS.marketMeshes || {}).forEach(m => { m.visible = true; });
    if (window.Audio && Audio.stopEngine) Audio.stopEngine && Audio.stopEngine();
    Game.showMenu();
  }
};


// ─── MAIN LOOP ────────────────────────────────────────────────────────────────
function loop(ts) {
  requestAnimationFrame(loop);

  const dt = Math.min((ts - (GS.lastTs || ts)) / 1000, 0.05);
  GS.lastTs = ts;

  if (!GS.paused) {
    updatePhysics(dt);
    updateRain(dt);
    updateExhaust(dt);
    updateAtmosphere();
    updateCamera();

    if (GS.state === 'driving') {
      updateHUD();
    } else if (GS.state === 'obstacle') {
      drawSpeedometer(Math.abs(GS.truckSpd), CFG.TRUCK.MAX_SPD);
    }
  }

  GS.renderer.render(GS.scene, GS.camera);
}

// --- INIT ---
function init() {
  setupScene();
  buildEnvironment();
  buildTruck();
  buildRain();
  setupInput();
  wireButtons();

  // Initialize obstacles array (empty until game starts)
  GS.obstacles = CFG.OBSTACLES.map(o => Object.assign({}, o, { passed: false, triggered: false }));
  GS.markets   = CFG.MARKETS.map(m => Object.assign({}, m, { visited: false, triggered: false }));
  buildMarketStalls();
  buildObstacleRouteBar();

  // Kickoff render loop
  requestAnimationFrame(loop);

  // Show menu
  Game.showMenu();
}

// ─── EXPOSE GLOBALS ───────────────────────────────────────────────────────────
window.Game = Game;
window.handleChoice = handleChoice;

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
