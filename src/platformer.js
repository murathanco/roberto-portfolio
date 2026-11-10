import * as THREE from 'three';
import { monogramGeometry, monogramSVG } from './logo3d.js';

// The doodle has run off and the monogram wants it back. An endless run, the temple kind: the doodle runs on its own
// down a path that is made up as it goes, and you dodge, jump, slide and take the corners. Trip and the logo is right
// behind you; trip again before it drops back and it has you. Every few corners is a new level with its own look,
// in a little low-res 3D world dressed in TextureTown textures (textures.neocities.org, free for anyone's sites and 3D worlds).
// It opens like a film: a crane shot down to the doodle, the logo crashing down behind it, and a whip round into the chase.
// No words anywhere: just the little logos you have picked up, and the metres you have run.

const WATER = -4;
const GRAVITY = 30, JUMP = 10.2, BOUNCE = 16.5;
const R = 0.28, H = 0.9, LOW = 0.42, STEP = 0.36;   // the doodle's half-width, its height standing and sliding, and the tallest ledge it runs up
const COYOTE = 0.1, BUFFER = 0.14;                  // a jump still counts just after running off, or just before landing
const LINES = 300;                                  // drawn this many pixels tall, then scaled up blocky

const LANE = 1.5, HALF = 2.4;                       // three lanes, and half the width of the path
const LANES = [-1, 0, 1];
const V0 = 8, V1 = 16, RAMP = 1600;                 // speed at the start, top speed, and the metres it takes to get there
const SLIDE = 0.7;                                  // seconds a slide lasts
const NEAR = 3, FAR = 8.5, DANGER = 6;              // how far back the logo is after a trip, when all is well, and how close still counts as caught
const LOGO = 1.25, LOGO_Y = 0.75;                   // the logo's size, and how high it floats: low enough to see the doodle over it
const CUT = { fall: 2, land: 2.45, whip: 3.3, end: 4.6 };   // the opening, in seconds: the logo drops, lands, the camera swings round, go
const PER_LEVEL = 3;                                // corners in a level

// Each kind of block: [top, sides].
const KINDS = {
  grass: ['grass', 'stone'],
  clover: ['clover', 'brick'],
  stone: ['stone', 'stone'],
  brick: ['stone', 'brick'],
  wood: ['wood', 'wood'],
  metal: ['metal', 'metal'],
  candy: ['candy', 'candy'],
  crystal: ['amethyst', 'amethyst'],
  sand: ['sand', 'sand'],
  temple: ['mosaic', 'gold'],
  gold: ['gold', 'gold'],
  marble: ['marble', 'marble'],
  ember: ['marble', 'lava'],
  lava: ['lava', 'lava'],
  pool: ['tiles', 'tiles'],
  cobble: ['cobble', 'amethyst'],
  flowers: ['flowers', 'brick'],
  leaves: ['leaves', 'wood'],
};

// A level's look: what you run on, what you jump, what you go around, what you slide under.
const THEMES = [
  { floor: 'grass', hurdle: 'wood', pillar: 'stone', gate: 'brick' },
  { floor: 'clover', hurdle: 'wood', pillar: 'brick', gate: 'stone' },
  { floor: 'temple', hurdle: 'gold', pillar: 'marble', gate: 'gold' },
  { floor: 'sand', hurdle: 'wood', pillar: 'stone', gate: 'brick' },
  { floor: 'ember', hurdle: 'lava', pillar: 'lava', gate: 'metal' },
  { floor: 'pool', hurdle: 'metal', pillar: 'marble', gate: 'metal' },
  { floor: 'cobble', hurdle: 'crystal', pillar: 'crystal', gate: 'metal' },
  { floor: 'flowers', hurdle: 'wood', pillar: 'stone', gate: 'brick' },
  { floor: 'leaves', hurdle: 'stone', pillar: 'brick', gate: 'metal' },
  { floor: 'metal', hurdle: 'brick', pillar: 'brick', gate: 'wood' },
];

// The path only ever heads north, east or west, so it can never cross itself: [x, z] of each heading.
const HEADINGS = [[0, -1], [1, 0], [-1, 0]];
const N = 0, E = 1, W = 2;

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const chance = (p) => Math.random() < p;
const speedAt = (m) => V0 + (V1 - V0) * Math.min(1, Math.max(0, m) / RAMP);

// A box whose textures keep the same size whatever its size, hung from its top edge so each side starts with a whole row.
function boxGeometry(w, h, d, tile = 1.6) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];   // +x, -x, +y, -y, +z, -z
  for (let f = 0; f < 6; f++) {
    const [a, b] = dims[f];
    const side = f !== 2 && f !== 3;
    for (let i = f * 4; i < f * 4 + 4; i++) {
      const v = uv.getY(i);
      uv.setXY(i, (uv.getX(i) * a) / tile, side ? ((v - 1) * b) / tile : (v * b) / tile);
    }
  }
  return g;
}

export function startGame(el, { onQuit } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const root = document.createElement('div');
  root.className = 'game';
  root.tabIndex = -1;
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Endless runner');
  root.innerHTML = `
    <div class="game__hud">
      <span class="game__count">${monogramSVG()}<span class="game__n">0</span></span>
      <span class="game__m">0 m</span>
      <button class="key game__quit" type="button">quit <span class="arr">✕</span></button>
    </div>
    <div class="game__end w95" role="alertdialog" aria-labelledby="game-end" hidden>
      <div class="w95__title"><span>ROBERTO.GS</span></div>
      <div class="w95__body">
        <p class="w95__msg game__stats" id="game-end"></p>
      </div>
      <div class="w95__btns">
        <button class="w95__btn w95__btn--default" type="button" data-act="again">Again</button>
        <button class="w95__btn" type="button" data-act="quit">Done</button>
      </div>
    </div>`;
  root.prepend(renderer.domElement);
  el.append(root);
  el.classList.add('is-game');
  const wasHidden = el.getAttribute('aria-hidden');
  el.removeAttribute('aria-hidden');
  root.focus({ preventScroll: true });

  const $ = (s) => root.querySelector(s);
  const countEl = $('.game__n'), mEl = $('.game__m'), endEl = $('.game__end');

  /* ---------- the world ---------- */

  const SKY = 0xa9c8ea;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 24, 75);
  const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 400);

  const loader = new THREE.TextureLoader();
  const textures = {};
  const tex = (name) => {
    if (textures[name]) return textures[name];
    const t = loader.load(`/textures/${name}.jpg`);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
    return (textures[name] = t);
  };
  const materials = {};
  const mat = (name) => (materials[name] ??= new THREE.MeshLambertMaterial({ map: tex(name) }));
  const kindMats = (kind) => {
    const [top, side] = KINDS[kind];
    return [mat(side), mat(side), mat(top), mat(side), mat(side), mat(side)];
  };

  scene.add(new THREE.HemisphereLight(0xffffff, 0x5d6b52, 1.7));
  const sun = new THREE.DirectionalLight(0xfff4e0, 1.7);
  sun.position.set(-3, 6, 4);
  scene.add(sun);

  const skyTex = tex('sky');
  skyTex.repeat.set(4, 1.6);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(160, 24, 12), new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false }));
  scene.add(sky);

  const waterTex = tex('water');
  waterTex.repeat.set(120, 120);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(480, 480), new THREE.MeshLambertMaterial({ map: waterTex, color: 0xcfeaff }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = WATER;
  scene.add(water);

  // The monogram, big, as the one doing the chasing, and small, as the ones to pick up on the way.
  const logoFace = new THREE.MeshLambertMaterial({ color: 0xe9edf0 });
  const logoSide = new THREE.MeshLambertMaterial({ color: 0x2f4bd8 });
  const chaser = new THREE.Mesh(monogramGeometry(0.3), [logoFace, logoSide]);
  chaser.scale.setScalar(LOGO);
  scene.add(chaser);
  // The ring of dust it kicks up when it lands.
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.75, 1, 24).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }),
  );
  ring.visible = false;
  scene.add(ring);
  const bitGeo = monogramGeometry(0.22);
  const bitMats = [new THREE.MeshBasicMaterial({ map: tex('fire') }), new THREE.MeshLambertMaterial({ map: tex('rainbow') })];
  const arrowGeo = new THREE.ConeGeometry(0.42, 0.8, 4);
  const arrowMat = new THREE.MeshBasicMaterial({ map: tex('rainbow') });
  const gemGeo = new THREE.OctahedronGeometry(1);
  const shared = new Set([bitGeo, arrowGeo, gemGeo]);   // these outlive the stretch of path they sit on

  // The doodle from the footer, as a flat cut-out that always faces you, with a round shadow so you can tell where it will land.
  const doodleCanvas = document.createElement('canvas');
  doodleCanvas.width = 108; doodleCanvas.height = 132;
  const doodleTex = new THREE.CanvasTexture(doodleCanvas);
  doodleTex.colorSpace = THREE.SRGBColorSpace;
  doodleTex.wrapS = THREE.RepeatWrapping;
  const doodleImg = new Image();
  doodleImg.onload = () => { doodleCanvas.getContext('2d').drawImage(doodleImg, 0, 0, 108, 132); doodleTex.needsUpdate = true; };
  doodleImg.src = '/doodle.svg';
  const hero = new THREE.Sprite(new THREE.SpriteMaterial({ map: doodleTex, alphaTest: 0.4 }));
  hero.center.set(0.5, 0);
  scene.add(hero);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.34, 18).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  );
  scene.add(shadow);

  /* ---------- the path: made up one straight run at a time, each ending in a corner ---------- */

  const runs = [];                              // the run before the doodle's, the doodle's, and two ahead
  let solids = [], obstacles = [], bits = [];   // everything in those runs, flat, for the frame loop
  const themeOf = [];
  const themeFor = (level) => (themeOf[level] ??= level === 1 ? THEMES[0] : pick(THEMES.filter((t) => t !== themeOf[level - 1])));

  // A box in a run's own terms: s along it, l across it (right is positive), hung from its top.
  function box(run, s0, s1, l0, l1, top, t, kind) {
    const w = Math.abs(run.fx) * (s1 - s0) + Math.abs(run.rx) * (l1 - l0);
    const d = Math.abs(run.fz) * (s1 - s0) + Math.abs(run.rz) * (l1 - l0);
    const sm = (s0 + s1) / 2, lm = (l0 + l1) / 2;
    const x = run.ox + run.fx * sm + run.rx * lm, z = run.oz + run.fz * sm + run.rz * lm;
    const mesh = new THREE.Mesh(boxGeometry(w, t, d), kindMats(kind));
    mesh.position.set(x, top - t / 2, z);
    run.group.add(mesh);
    return { mesh, min: new THREE.Vector3(x - w / 2, top - t, z - d / 2), max: new THREE.Vector3(x + w / 2, top, z + d / 2) };
  }
  const at = (run, s, l, y) => new THREE.Vector3(run.ox + run.fx * s + run.rx * l, y, run.oz + run.fz * s + run.rz * l);

  // Something to trip on. It is not solid: run into it and it goes flying, and the logo catches up.
  function hazard(run, s0, s1, l0, l1, y0, y1, kind, extras = []) {
    const b = box(run, s0, s1, l0, l1, y1, y1 - y0, kind);
    const pivot = new THREE.Group();
    pivot.position.copy(b.mesh.position);
    run.group.add(pivot);
    for (const m of [b.mesh, ...extras]) { m.position.sub(pivot.position); pivot.add(m); }
    b.min.addScalar(0.06); b.max.subScalar(0.06);   // a little forgiving
    run.obstacles.push({ run, pivot, min: b.min, max: b.max, s1, tall: y1 - y0 > 1, hit: false, fly: null });
  }

  function addRun() {
    const prev = runs.at(-1);
    const i = prev ? prev.i + 1 : 0;
    const dir = !prev ? N : prev.dir !== N ? N : prev.turn > 0 ? E : W;
    const [fx, fz] = HEADINGS[dir];
    const run = {
      i, dir, fx, fz, rx: -fz, rz: fx,
      ox: prev ? prev.ox + prev.fx * prev.len : 0,
      oz: prev ? prev.oz + prev.fz * prev.len : 0,
      from: prev ? prev.from + prev.len : 0,                             // metres of path before this run
      turn: dir === N ? pick([-1, 1]) : dir === E ? -1 : 1,              // the corner at its end: -1 left, 1 right
      level: Math.floor(i / PER_LEVEL) + 1,
      group: new THREE.Group(), solids: [], obstacles: [], bits: [], arrows: [], gems: [],
      len: 0, yEnd: 0,
    };
    run.theme = themeFor(run.level);
    build(run, prev ? prev.yEnd : 0);
    scene.add(run.group);
    runs.push(run);
  }

  function build(run, y0) {
    const th = run.theme;
    const first = run.i === 0;
    let s = first ? -14 : HALF, from = s, y = y0;
    const v = () => speedAt(run.from + s);
    const ease = () => 1 - Math.min(1, (run.from + s) / RAMP);   // 1 at the start, 0 at top speed

    // The floor so far, laid down as one slab all the way into the water.
    const slab = (to = s) => {
      if (to - from > 0.01) run.solids.push(box(run, from, to, -HALF, HALF, y, y - WATER + 1, th.floor));
      from = to;
    };
    const bit = (ss, l, yy) => {
      const m = new THREE.Mesh(bitGeo, bitMats);
      m.scale.setScalar(0.5);
      m.position.copy(at(run, ss, l, yy));
      run.group.add(m);
      run.bits.push({ m, home: yy, phase: ss * 0.6, got: false, fade: 0 });
    };
    const line = (s0, s1, l, yy = y + 0.55) => { for (let ss = s0; ss <= s1 + 0.01; ss += 1.5) bit(ss, l, yy); };
    // Little logos along the way a jump goes, leaving the ground at s0 with v0 upward.
    const arc = (s0, speed, l, ground, v0, t0, t1, n = 5) => {
      for (let i = 0; i < n; i++) {
        const t = t0 + ((t1 - t0) * i) / (n - 1);
        bit(s0 + speed * t, l, ground + 0.45 + v0 * t - (GRAVITY / 2) * t * t);
      }
    };
    const rest = (d, coins = true) => {
      if (coins && d > 6 && chance(0.55)) line(s + 1.5, s + Math.min(d - 1.5, 7.5), pick(LANES) * LANE);
      s += d;
    };

    // Each one returns how many more seconds of clear floor it wants after it.
    const feats = {
      gap() {
        const vv = v(), g = vv * rnd(0.26, 0.36);
        slab();
        arc(s - (vv * 0.68 - g) / 2, vv, pick(LANES) * LANE, y, JUMP, 0.14, 0.54);
        s += g;
        y += y > 6 ? pick([-0.8, -0.4, 0]) : y < 1 ? pick([0, 0, 0.4]) : pick([-0.8, -0.4, 0, 0, 0.4]);
        from = s;
        return 0.45;
      },
      hurdle() {
        const roll = Math.random(), open = pick(LANES);
        const blocked = roll < 0.5 ? LANES : roll < 0.8 ? LANES.filter((l) => l !== open) : [pick(LANES)];
        if (blocked.length === 3) {
          hazard(run, s, s + 0.5, -HALF, HALF, y, y + 0.6, th.hurdle);
          if (chance(0.6)) arc(s + 0.25 - v() * 0.34, v(), pick(LANES) * LANE, y, JUMP, 0.14, 0.54);
        } else {
          for (const l of blocked) hazard(run, s, s + 0.5, l * LANE - 0.72, l * LANE + 0.72, y, y + 0.6, th.hurdle);
          line(s - 1.25, s + 1.75, pick(LANES.filter((l) => !blocked.includes(l))) * LANE);
        }
        s += 0.5;
        return 0.4;
      },
      pillars() {
        const open = pick(LANES);
        const shut = LANES.filter((l) => l !== open);
        const blocked = chance(0.35 + 0.4 * (1 - ease())) ? shut : [pick(shut)];
        for (const l of blocked) hazard(run, s, s + 1, l * LANE - 0.65, l * LANE + 0.65, y, y + 2.4, th.pillar);
        line(s - 1, s + 2, open * LANE);
        s += 1;
        return 0.1;
      },
      gate() {
        const feet = [-1, 1].map((k) => box(run, s, s + 0.6, k > 0 ? HALF - 0.4 : -HALF, k > 0 ? HALF : -HALF + 0.4, y + 0.62, 0.62, th.gate).mesh);
        hazard(run, s, s + 0.6, -HALF, HALF, y + 0.62, y + 2.3, th.gate, feet);
        line(s - 1.2, s + 1.8, pick(LANES) * LANE, y + 0.3);
        s += 0.6;
        return 0.3;
      },
      bridge() {
        const len = v() * rnd(1, 1.6), l = pick(LANES) * LANE;
        slab();
        run.solids.push(box(run, s, s + len, l - 0.7, l + 0.7, y, 0.35, 'wood'));
        line(s + 1, s + len - 1, l);
        s += len;
        from = s;
        return 0.2;
      },
      stairs() {
        const n = 3 + Math.floor(rnd(0, 4));
        for (let i = 0; i < n; i++) { slab(); y += 0.28; s += 1.1; }
        return 0;
      },
      drop() {
        slab();
        y -= rnd(1, 2.2);
        return 0.5;
      },
      // A candy trampoline up to a higher floor.
      pad() {
        const vv = v(), g = Math.max(0.6, vv * 0.3 - 1.4);
        const candy = box(run, s, s + 1.4, -HALF, HALF, y + 0.2, 0.2, 'candy');
        candy.bounce = true;
        run.solids.push(candy);
        arc(s - R, vv, pick(LANES) * LANE, y + 0.2, BOUNCE, 0.25, 0.8);
        s += 1.4;
        slab();
        s += g;
        y += rnd(1.5, 2.2);
        from = s;
        return 1;
      },
    };

    if (first) s = 26; else rest(v() * 0.9);
    const count = Math.floor(run.dir === N ? rnd(3, 6.99) : rnd(2, 4.99));
    for (let i = 0; i < count; i++) {
      const menu = [['gap', 3], ['hurdle', 3], ['pillars', 2.5]];
      if (!first) {
        menu.push(['gate', 2.2], ['bridge', 1.3]);
        if (y < 6) menu.push(['stairs', 0.8]);
        if (y < 5) menu.push(['pad', 0.8]);
        if (y > 1.5) menu.push(['drop', 1]);
      } else if (i > 1) menu.push(['gate', 2.2]);
      let roll = Math.random() * menu.reduce((sum, [, w]) => sum + w, 0);
      const [name] = menu.find(([, w]) => (roll -= w) < 0) ?? menu[0];
      const more = feats[name]();
      rest(v() * (0.7 + 0.35 * ease() + more + rnd(0, 0.45)));
    }
    rest(v() * 0.7, false);   // nothing in the way just before the corner
    run.len = s + HALF;       // the middle of the corner; the next run starts from here
    slab(run.len + HALF);
    run.yEnd = y;

    // Three arrows over the corner, pointing the way.
    const way = new THREE.Vector3(run.rx * run.turn, 0, run.rz * run.turn);
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(arrowGeo, arrowMat);
      m.quaternion.setFromUnitVectors(THREE.Object3D.DEFAULT_UP, way);
      m.position.copy(at(run, run.len, (i - 1) * 0.95 * run.turn, y + 2.3));
      run.group.add(m);
      run.arrows.push(m);
    }

    // Far-off islands and crystals, just to look at. Kept clear of where the path goes next.
    for (let i = Math.floor(run.len / 13); i > 0; i--) {
      const ss = rnd(8, run.len - 8), l = pick([-1, 1]) * rnd(9, 20), w = rnd(2.5, 5), top = rnd(-2, 9);
      box(run, ss - w / 2, ss + w / 2, l - w / 2, l + w / 2, top, top - WATER + 1, pick([th.floor, th.floor, th.pillar, th.gate]));
      if (chance(0.4)) {
        const gem = new THREE.Mesh(gemGeo, mat('amethyst'));
        gem.scale.setScalar(rnd(0.6, 1.2));
        gem.position.copy(at(run, ss, l, top + rnd(2.5, 5)));
        run.group.add(gem);
        run.gems.push(gem);
      }
    }
  }

  function dropRun(run) {
    scene.remove(run.group);
    run.group.traverse((o) => { if (o.geometry && !shared.has(o.geometry)) o.geometry.dispose(); });
  }
  // Keep two runs made ahead of the doodle, and one behind it for the logo to come down.
  function extend() {
    while (runs.at(-1).i < cur.i + 2) addRun();
    while (runs[0].i < cur.i - 1) dropRun(runs.shift());
    solids = runs.flatMap((r) => r.solids);
    obstacles = runs.flatMap((r) => r.obstacles);
    bits = runs.flatMap((r) => r.bits);
  }

  /* ---------- sound: a few little blips ---------- */

  let ac = null;
  const blip = (f0, f1, dur, type = 'square', vol = 0.045, delay = 0) => {
    try {
      ac ??= new AudioContext();
      const t = ac.currentTime + delay;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(ac.destination);
      o.start(t);
      o.stop(t + dur);
    } catch { /* no sound, no matter */ }
  };
  const sfx = {
    jump: () => blip(280, 560, 0.12),
    slide: () => blip(320, 110, 0.18, 'triangle', 0.05),
    turn: () => blip(520, 780, 0.07, 'triangle', 0.04),
    boing: () => blip(180, 900, 0.32, 'sine', 0.07),
    bit: () => { blip(988, 988, 0.08); blip(1319, 1319, 0.16, 'square', 0.045, 0.07); },
    trip: () => blip(170, 55, 0.24, 'sawtooth', 0.05),
    splash: () => blip(420, 50, 0.4, 'sawtooth', 0.03),
    level: () => [523, 659, 784, 1047].forEach((f, i) => blip(f, f, 0.14, 'square', 0.04, i * 0.09)),
    caught: () => [392, 330, 262, 196].forEach((f, i) => blip(f, f, 0.2, 'square', 0.045, i * 0.13)),
    go: () => { blip(523, 523, 0.09); blip(784, 784, 0.2, 'square', 0.045, 0.09); },
    // the opening: a slow swell, a whistle as the logo falls, a thud and two low notes, a whoosh as the camera swings
    swell: () => blip(98, 147, 1.6, 'triangle', 0.04),
    fall: () => blip(1500, 180, CUT.land - CUT.fall, 'sine', 0.045),
    thud: () => {
      blip(110, 28, 0.55, 'sawtooth', 0.08); blip(70, 30, 0.6, 'sine', 0.12);
      blip(196, 196, 0.16, 'square', 0.045, 0.3); blip(185, 185, 0.45, 'square', 0.045, 0.5);
    },
    whoosh: () => blip(160, 880, 0.55, 'sine', 0.035),
  };

  /* ---------- the doodle's state ---------- */

  const p = new THREE.Vector3();
  const vel = new THREE.Vector3();
  let cur = null;                        // the run under the doodle
  let lane = 0, grounded = false;
  let coyote = 0, buffer = 0, sliding = 0, slideWant = 0, turnWant = 0;
  let stun = 0, slow = 0;                // just tripped: nothing else can trip it, and it runs a little slower
  let lead = NEAR, hold = 0;             // how far behind the logo is, and how long it stays close after a trip
  const trail = [];                      // where the doodle has been, for the logo to follow: { m, x, y, z }
  let squash = 0, squashV = 0, facing = 1, walk = 0;
  let got = 0, metres = 0, shownM = 0, level = 1, state = 'intro', why = '';
  let introT = 0, introDid = 0, drop = 0;   // the opening: how far in, how many of its beats have played, how high the logo still is
  let shake = 0, ringT = 1;

  const cam = { yaw: 0, pitch: 0.38, dist: 7.5, ahead: 1.2, far: FAR };
  const focus = new THREE.Vector3(), aim = new THREE.Vector3();

  const along = (run) => (p.x - run.ox) * run.fx + (p.z - run.oz) * run.fz;
  const across = (run) => (p.x - run.ox) * run.rx + (p.z - run.oz) * run.rz;
  const tall = () => (sliding > 0 ? LOW : H);

  let overT = 0;

  function reset(first = false) {
    clearTimeout(overT);
    runs.splice(0).forEach(dropRun);
    themeOf.length = 0;
    addRun();
    cur = runs[0];
    extend();
    p.set(0, 0.01, 0);
    vel.set(0, 0, 0);
    lane = 0; grounded = false;
    coyote = buffer = sliding = slideWant = turnWant = stun = slow = hold = 0;
    lead = NEAR;
    trail.length = 0;
    for (let s = -12; s <= 0; s += 0.5) trail.push({ m: s, x: 0, y: 0.01, z: -s });
    got = 0; metres = 0; shownM = 0; level = 1; why = '';
    cam.yaw = 0;
    focus.set(0, 0.9, -cam.ahead);
    hero.visible = true;
    facing = 1; drop = 0; shake = 0;
    chaser.visible = true;
    ring.visible = false;
    countEl.textContent = '0';
    mEl.textContent = '0 m';
    endEl.hidden = true;
    // Every run starts on the film: all of it the first time, after that only the swing round to the chase.
    // With motion turned down the camera stays where it is, and there is just a moment to get ready.
    state = 'intro';
    introT = calm ? CUT.end - 0.6 : first ? 0 : CUT.whip;
    introDid = BEATS.filter((t) => t < introT).length;
    root.classList.toggle('is-cine', introT === 0);
  }

  // The opening has run its course, or a key skipped it: cut to the chase.
  function begin() {
    root.classList.remove('is-cine');
    drop = 0; facing = 1;
    chaser.visible = true;
    cam.yaw = 0;
    focus.set(p.x, p.y + 0.9, p.z - cam.ahead);
    state = 'play';
    sfx.go();
  }

  // The camera through the opening: [seconds, yaw, pitch, distance, and where it looks]. The last one is where the chase picks it up.
  const shots = () => [
    [0, 2.2, 0.85, 20, 0, 0.8, 0],                               // high and wide, ahead of the doodle, looking back at it
    [CUT.fall, 2.75, 0.1, 4.4, 0, 0.7, 0],                       // craned down low, right in front of it
    [CUT.whip, 2.9, 0.06, 5.2, 0, 1, 1],                         // easing past it, up at the logo that just landed
    [CUT.end, 0, cam.pitch, cam.dist, 0, 0.9, -cam.ahead],       // swung round behind, ready to run
  ];
  const BEATS = [0.35, CUT.fall, CUT.land, CUT.whip];
  function opening(dt) {
    introT += dt;
    const beat = (n) => introDid < n && introT >= BEATS[n - 1] && (introDid = n);
    if (beat(1)) sfx.swell();
    if (beat(2)) sfx.fall();
    if (beat(3)) {
      sfx.thud();
      shake = 0.5; ringT = 0;
      ring.position.set(chaser.position.x, 0.03, chaser.position.z);
      vel.y = 6.5; grounded = false; squashV = 6;   // the doodle jumps out of its skin
    }
    if (beat(4)) { sfx.whoosh(); root.classList.remove('is-cine'); }

    // The doodle looks about, then spins round to see what landed.
    facing = introT < CUT.land ? (Math.floor(introT / 0.7) % 2 ? -1 : 1) : introT < CUT.whip ? -1 : 1;
    // The logo: out of sight, then falling faster and faster, then a small bounce as it settles.
    const fall = (introT - CUT.fall) / (CUT.land - CUT.fall), since = introT - CUT.land;
    chaser.visible = introT >= CUT.fall;
    drop = since < 0 ? 16 * (1 - Math.max(0, fall) ** 2) : 0.5 * Math.abs(Math.sin(since * 9)) * Math.exp(-since * 5);

    const list = shots();
    const next = list.findIndex(([t]) => t > introT);
    const i = calm || next < 0 ? list.length - 1 : Math.max(1, next);
    const from = list[i - 1], to = list[i];
    let k = calm ? 1 : THREE.MathUtils.clamp((introT - from[0]) / (to[0] - from[0]), 0, 1);
    k = k * k * (3 - 2 * k);
    const mix = (n) => from[n] + (to[n] - from[n]) * k;
    cam.yaw = mix(1);
    focus.set(mix(4), mix(5), mix(6));
    if (introT >= CUT.end) begin();
    return [mix(2), mix(3)];
  }

  // The rest of the site keeps score: how far you got, and how many little logos came with you.
  const report = () => {
    dispatchEvent(new CustomEvent('rgs:run', { detail: { got, metres: Math.floor(metres) } }));
  };

  function end(reason) {
    if (state === 'over') return;
    state = 'over';
    why = reason;
    report(reason);
    if (reason === 'caught') { sfx.caught(); squashV = -9; } else { sfx.splash(); hero.visible = false; }
    overT = setTimeout(() => {
      $('.game__stats').innerHTML = `${monogramSVG()}<span>${got}</span><span>${Math.floor(metres)} m</span>`;
      endEl.hidden = false;
      endEl.querySelector('[data-act="again"]').focus({ preventScroll: true });
    }, reason === 'caught' ? 1000 : 700);
  }

  /* ---------- input: four moves, from keys or swipes ---------- */

  // Left and right change lane, except at a corner that goes that way, where they take it.
  function steer(d) {
    const s = along(cur);
    if (d === cur.turn && s > cur.len - LANE - 0.15 - speedAt(metres) * 0.4 && s <= cur.len + HALF + 0.3) { turnWant = 0.6; return; }
    lane = THREE.MathUtils.clamp(lane + d, -1, 1);
  }
  function slide() {
    sliding = SLIDE; slideWant = 0; squashV = -5;
    sfx.slide();
  }
  function act(a) {
    if (state === 'intro') { begin(); return; }
    if (state !== 'play') return;
    if (a === 'left') steer(-1);
    else if (a === 'right') steer(1);
    else if (a === 'up') buffer = BUFFER;
    else if (grounded) slide();
    else { vel.y = Math.min(vel.y, -16); slideWant = 0.35; }   // down in the air: drop fast, and slide on landing
  }

  const KEYS = {
    ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
    ArrowUp: 'up', KeyW: 'up', Space: 'up', ArrowDown: 'down', KeyS: 'down',
  };
  // Keys go to the game unless you are clearly busy with something else on the page.
  const elsewhere = () => document.activeElement?.closest?.('#content, dialog, .viewer, .fit, input, textarea, select')
    || document.documentElement.classList.contains('has-viewer')
    || document.documentElement.classList.contains('has-fit');
  const onKeyDown = (e) => {
    if (elsewhere() || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key === 'Escape') { e.preventDefault(); quit(); return; }
    if (state === 'intro') {   // any key skips the opening
      if (e.repeat || ['Tab', 'Shift', 'CapsLock'].includes(e.key)) return;
      if (e.target.closest?.('button') && (e.code === 'Space' || e.key === 'Enter')) return;
      e.preventDefault();
      begin();
      return;
    }
    const a = KEYS[e.code];
    if (!a || state === 'over') return;
    if (e.target.closest?.('button') && e.code === 'Space') return;
    e.preventDefault();
    if (!e.repeat) act(a);
  };

  const canvas = renderer.domElement;
  let swipe = null;
  const onDown = (e) => {
    if (state === 'over' || swipe) return;
    root.focus({ preventScroll: true });
    canvas.setPointerCapture(e.pointerId);
    swipe = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, done: false };
  };
  const onMove = (e) => {
    if (!swipe || e.pointerId !== swipe.id || swipe.done) return;
    const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
    swipe.done = true;
    act(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up');
  };
  const onUp = (e) => {
    if (!swipe || e.pointerId !== swipe.id) return;
    if (!swipe.done && e.type === 'pointerup' && e.timeStamp - swipe.t < 400) act('up');   // a tap jumps
    swipe = null;
  };
  const onClick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.classList.contains('game__quit') || b.dataset.act === 'quit') quit();
    else if (b.dataset.act === 'again') { reset(); root.focus({ preventScroll: true }); }
  };

  addEventListener('keydown', onKeyDown, true);
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  root.addEventListener('click', onClick);

  /* ---------- physics ---------- */

  const overlaps = (s) => p.x + R > s.min.x && p.x - R < s.max.x && p.z + R > s.min.z && p.z - R < s.max.z
    && p.y < s.max.y - 1e-4 && p.y + tall() > s.min.y + 1e-4;

  function moveFlat(axis, d, onGround) {
    p[axis] += d;
    for (const s of solids) {
      if (!overlaps(s)) continue;
      if (s.max.y - p.y <= (onGround ? STEP : 0.3)) { p.y = s.max.y; continue; }   // up a step, or just scraping a ledge
      const toMin = p[axis] + R - s.min[axis], toMax = s.max[axis] - (p[axis] - R);
      p[axis] = d > 0 || (d === 0 && toMin < toMax) ? s.min[axis] - R : s.max[axis] + R;
      vel[axis] = 0;
    }
  }

  function moveUp(d) {
    const from = p.y;
    p.y += d;
    let landed = null;
    for (const s of solids) {
      if (!overlaps(s)) continue;
      if (d <= 0 && from >= s.max.y - 0.03) { p.y = s.max.y; vel.y = 0; landed = s; }
      else if (d > 0 && from + tall() <= s.min.y + 0.05) { p.y = s.min.y - tall(); vel.y = 0; }
    }
    return landed;
  }

  function turn() {
    cur = runs[runs.indexOf(cur) + 1];
    turnWant = 0;
    lane = THREE.MathUtils.clamp(Math.round(across(cur) / LANE), -1, 1);
    sfx.turn();
    if (cur.level > level) {
      level = cur.level;   // a new look from here on, and a little fanfare for it
      sfx.level();
    }
    extend();
  }

  function trip(o) {
    const speed = speedAt(metres);
    o.hit = true;
    o.pivot.visible = true;
    o.fly = {
      v: new THREE.Vector3(cur.fx * speed * 1.25 + cur.rx * rnd(-2, 2), 7.5, cur.fz * speed * 1.25 + cur.rz * rnd(-2, 2)),
      spin: new THREE.Vector3(rnd(-6, 6), rnd(-6, 6), rnd(-6, 6)),
      t: 1.4,
    };
    if (lead < DANGER) { shake = 0.5; end('caught'); return; }
    hold = 1.2; stun = 0.6; slow = 0.3; squashV = -8; shake = 0.28;
    sfx.trip();
  }

  function step(dt) {
    if (state === 'over' && (why === 'splash' || p.y < WATER)) return;
    const playing = state === 'play';
    stun -= dt;
    slow = Math.max(0, slow - dt * 0.6);
    const speed = playing ? speedAt(metres) * (1 - slow) : 0;

    if (playing && turnWant > 0) {
      turnWant -= dt;
      const s = along(cur);
      if (s >= cur.len - LANE - 0.15 && s <= cur.len + HALF + 0.3) turn();
    }

    // Forward on its own, and across toward the lane it wants.
    const side = playing ? THREE.MathUtils.clamp((lane * LANE - across(cur)) * 18, -13, 13) : 0;
    vel.x = cur.fx * speed + cur.rx * side;
    vel.z = cur.fz * speed + cur.rz * side;
    if (Math.abs(side) > 1) facing = side > 0 ? 1 : -1;

    buffer -= dt; coyote -= dt; sliding -= dt; slideWant -= dt;
    if (buffer > 0 && coyote > 0 && playing) {
      vel.y = JUMP; buffer = 0; coyote = 0; grounded = false; sliding = 0;
      squashV = 4; sfx.jump();
    }
    vel.y = Math.max(vel.y - GRAVITY * dt, -26);

    const wasGrounded = grounded, falling = vel.y, s0 = along(cur);
    moveFlat('x', vel.x * dt, wasGrounded);
    moveFlat('z', vel.z * dt, wasGrounded);
    const landed = moveUp(vel.y * dt);
    grounded = !!landed;
    if (landed) {
      coyote = COYOTE;
      if (!wasGrounded) {
        squashV = Math.max(-7, falling * 0.35);
        if (slideWant > 0 && playing && !landed.bounce) slide();
      }
      if (landed.bounce) {
        vel.y = BOUNCE; grounded = false; coyote = 0; sliding = 0;
        squashV = 6; sfx.boing();
      }
    }

    if (playing) {
      const s = along(cur);
      if (s > s0) metres += s - s0;
      if (metres - trail.at(-1).m >= 0.2) {
        trail.push({ m: metres, x: p.x, y: p.y, z: p.z });
        while (trail.length > 2 && trail[1].m < metres - cam.far - 3) trail.shift();
      }

      const chest = p.y + tall() / 2;
      for (const b of bits) {
        if (b.got) continue;
        if (Math.hypot(b.m.position.x - p.x, b.m.position.y - chest, b.m.position.z - p.z) < 0.85) {
          b.got = true; got++;
          countEl.textContent = String(got);
          sfx.bit();
        }
      }

      const r = R * 0.75, top = p.y + tall();
      for (const o of obstacles) {
        if (o.hit) continue;
        // Once you are past the tall ones they would only stand between you and the camera.
        if (o.tall && o.run === cur && s > o.s1 + 0.4) { o.pivot.visible = false; continue; }
        if (stun > 0) continue;
        if (p.x + r > o.min.x && p.x - r < o.max.x && p.z + r > o.min.z && p.z - r < o.max.z && p.y < o.max.y && top > o.min.y) {
          trip(o);
          break;
        }
      }
    }

    // The logo: right on you after a trip, then it slowly drops back out of sight.
    if (state === 'play') {
      if (hold > 0) { hold -= dt; lead += (NEAR - lead) * (1 - Math.pow(0.002, dt)); }
      else lead = Math.min(cam.far, lead + dt * 1.2);
    } else if (state === 'over') lead += (0.3 - lead) * (1 - Math.pow(0.001, dt));

    if (p.y < WATER - 0.5 && state !== 'over') end('splash');
  }

  /* ---------- drawing ---------- */

  function animate(dt, t) {
    let pitch = cam.pitch, dist = cam.dist;
    const film = state === 'intro';
    if (film) [pitch, dist] = opening(dt);

    // the doodle: squash and stretch on a spring, a waddle while it runs, flat while it slides
    squashV += (-squash * 180 - squashV * 14) * dt;
    squash += squashV * dt;
    const s = THREE.MathUtils.clamp(squash * 0.06, -0.3, 0.3);
    const low = sliding > 0 || (state === 'over' && why === 'caught');
    const running = (state === 'play' || (film && introT > CUT.whip + 0.3)) && grounded && !low;   // it is already off as the camera comes round
    walk = running ? walk + dt * (8 + speedAt(metres) * 0.5) : 0;
    hero.scale.set(0.86 * (1 - s) * (low ? 1.25 : 1), 1.04 * (1 + s) * (low ? 0.46 : 1), 1);
    hero.position.set(p.x, p.y + (running ? Math.abs(Math.sin(walk)) * 0.09 : 0), p.z);
    hero.material.rotation = running ? Math.sin(walk) * 0.13 : low ? 0 : -facing * THREE.MathUtils.clamp(vel.y * 0.012, -0.12, 0.12);
    hero.material.opacity = stun > 0 && Math.floor(t * 18) % 2 ? 0.25 : 1;
    doodleTex.repeat.x = facing;
    doodleTex.offset.x = facing > 0 ? 0 : 1;

    let below = WATER;
    for (const b of solids) {
      if (p.x >= b.min.x && p.x <= b.max.x && p.z >= b.min.z && p.z <= b.max.z && b.max.y <= p.y + 0.05) below = Math.max(below, b.max.y);
    }
    shadow.visible = below > WATER && hero.visible;
    shadow.position.set(p.x, below + 0.005, p.z);
    shadow.scale.setScalar(THREE.MathUtils.clamp(1 - (p.y - below) * 0.08, 0.45, 1));

    // the logo, along the doodle's own trail
    const mc = metres - lead;
    let a = trail[0], b = trail[0];
    for (let i = trail.length - 1; i > 0; i--) {
      if (trail[i - 1].m <= mc) { a = trail[i - 1]; b = trail[i]; break; }
    }
    const k = b.m > a.m ? THREE.MathUtils.clamp((mc - a.m) / (b.m - a.m), 0, 1) : 0;
    const close = lead < DANGER;
    chaser.position.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k + LOGO_Y + Math.sin(t * 7) * 0.08 + drop, a.z + (b.z - a.z) * k);
    chaser.rotation.y += dt * (state === 'over' || drop > 1 ? 12 : close ? 7 : 3);
    if (ringT < 1) {
      ringT = Math.min(1, ringT + dt / 0.5);
      ring.visible = ringT < 1;
      ring.scale.setScalar(1 + ringT * 7);
      ring.material.opacity = 0.85 * (1 - ringT);
    }
    chaser.rotation.z = Math.sin(t * 9) * (close ? 0.16 : 0.06);

    for (const b of bits) {
      if (b.got) {
        if (b.fade >= 1) continue;
        b.fade = Math.min(1, b.fade + dt * 4);
        b.m.scale.setScalar(0.5 + b.fade * 0.5);
        b.m.position.y = b.home + b.fade * 0.8;
        b.m.visible = b.fade < 1;
      } else {
        b.m.rotation.y = t * 2.2 + b.phase;
        b.m.position.y = b.home + Math.sin(t * 2.4 + b.phase) * 0.1;
      }
    }
    for (const o of obstacles) {
      if (!o.fly) continue;
      o.pivot.position.addScaledVector(o.fly.v, dt);
      o.fly.v.y -= 22 * dt;
      o.pivot.rotation.x += o.fly.spin.x * dt;
      o.pivot.rotation.y += o.fly.spin.y * dt;
      o.pivot.rotation.z += o.fly.spin.z * dt;
      o.fly.t -= dt;
      if (o.fly.t <= 0) { o.pivot.visible = false; o.fly = null; }
    }
    for (const run of runs) {
      run.arrows.forEach((m, i) => m.scale.setScalar(1 + 0.4 * Math.max(0, Math.sin(t * 8 - i * 1.3))));
      run.gems.forEach((g, i) => { g.rotation.y = t * 0.5 + i; });
    }
    if (!calm) waterTex.offset.set(t * 0.02, t * 0.035);

    const m = Math.floor(metres);
    if (m !== shownM) { shownM = m; mEl.textContent = `${m} m`; }

    // The camera sits behind the doodle, looks a little past it, and swings round the corners with it.
    if (!film) {
      const want = Math.atan2(-cur.fx, -cur.fz);
      cam.yaw += (want - cam.yaw) * (1 - Math.pow(0.00003, dt));
      aim.set(p.x + cur.fx * cam.ahead, Math.max(p.y, WATER + 1) + 0.9, p.z + cur.fz * cam.ahead);
      const kf = 1 - Math.pow(0.0005, dt), ky = 1 - Math.pow(0.02, dt);
      focus.x += (aim.x - focus.x) * kf;
      focus.z += (aim.z - focus.z) * kf;
      focus.y += (aim.y - focus.y) * ky;
    }
    const cp = Math.cos(pitch);
    camera.position.set(
      focus.x + Math.sin(cam.yaw) * cp * dist,
      focus.y + Math.sin(pitch) * dist,
      focus.z + Math.cos(cam.yaw) * cp * dist,
    );
    camera.lookAt(focus);
    if (shake > 0.004) {   // a jolt when the logo lands, or you trip
      if (!calm) camera.position.add(aim.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).multiplyScalar(shake));
      shake *= Math.pow(0.003, dt);
    }
    sky.position.copy(camera.position);
    water.position.x = Math.round(camera.position.x / 4) * 4;   // the water comes along, a whole tile at a time
    water.position.z = Math.round(camera.position.z / 4) * 4;
  }

  const resize = () => {
    const w = root.clientWidth, h = root.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(1, LINES / h));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    // Far enough back to see the whole width of the path, however narrow the stage. The logo waits just behind the camera.
    const spread = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    cam.dist = Math.max(7.5, 3.1 / spread + cam.ahead);
    cam.far = Math.max(FAR, Math.cos(cam.pitch) * cam.dist - cam.ahead + 1.5);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(root);
  resize();

  let raf = 0, last = performance.now();
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const n = Math.ceil(dt / (1 / 120));
    for (let i = 0; i < n; i++) step(dt / n);
    animate(dt, now / 1000);
    renderer.render(scene, camera);
  };
  reset(true);
  raf = requestAnimationFrame(frame);

  /* ---------- leaving ---------- */

  let finishing = null;
  function quit() {
    if (finishing) return finishing;
    if (state === 'play') report('quit');
    removeEventListener('keydown', onKeyDown, true);
    clearTimeout(overT);
    const done = () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse((o) => {
        o.geometry?.dispose();
        [].concat(o.material ?? []).forEach((m) => m.dispose());
      });
      shared.forEach((g) => g.dispose());
      Object.values(materials).forEach((m) => m.dispose());
      Object.values(textures).forEach((t) => t.dispose());
      doodleTex.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      ac?.close();
      root.remove();
      if (!el.querySelector('.game')) {
        el.classList.remove('is-game');
        if (wasHidden != null) el.setAttribute('aria-hidden', wasHidden);
      }
      onQuit?.();
    };
    finishing = calm
      ? Promise.resolve().then(done)
      : root.animate(
        [{ clipPath: 'circle(75% at 50% 50%)' }, { clipPath: 'circle(0% at 50% 50%)' }],
        { duration: 380, easing: 'cubic-bezier(.7, 0, .8, .4)', fill: 'forwards' },
      ).finished.then(done, done);
    return finishing;
  }

  return { quit };
}
