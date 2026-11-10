import * as THREE from 'three';
import { MD2Loader } from 'three/examples/jsm/loaders/MD2Loader.js';

// Real models from the period: Ogro (Magarnigal, skins by Ogro_Fix, 1998) and Ratamahatta (Brian Collins),
// both Quake II player models, with nearest-neighbour skins and vertices snapped to the pixel grid,
// the way the first PlayStation drew.

const CAST = {
  ogro: { md2: '/models/ogro/ogro.md2', skins: '/models/ogro/skins/', weapon: ['/models/ogro/weapon.md2', '/models/ogro/skins/weapon.jpg'] },
  rata: { md2: '/models/ratamahatta/ratamahatta.md2', skins: '/models/ratamahatta/skins/', weapon: ['/models/ratamahatta/weapon.md2', '/models/ratamahatta/skins/weapon.png'] },
};

// Each model names its moves its own way. Asking for 'pain' or 'death' picks one of whichever variants it has.
const ALIAS = {
  pain: ['paina', 'painb', 'painc', 'pain1', 'pain2', 'pain3', 'pain0', 'pain'],
  death: ['deatha', 'deathb', 'deathc', 'death1', 'death2', 'death3', 'death0', 'death'],
  fidget: ['taunt', 'wave', 'wavealt', 'salute', 'salute_alt', 'point', 'sniffsniff'],
  cheer: ['salute', 'salute_alt', 'taunt', 'wave', 'wavealt'],
};

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const snap = { value: new THREE.Vector2(80, 60) };
const md2 = new MD2Loader();
const textures = new THREE.TextureLoader();
const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };

export const texture = (url) => once(url, () => textures.loadAsync(url).then((t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}));

// Positions land on a coarse grid, so edges swim a little as things move.
export function psx(map, opts = {}) {
  const m = new THREE.MeshLambertMaterial(map ? { map, ...opts } : { ...opts });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSnap = snap;
    sh.vertexShader = sh.vertexShader
      .replace('void main() {', 'uniform vec2 uSnap;\nvoid main() {')
      .replace('#include <project_vertex>', '#include <project_vertex>\n\tgl_Position.xy = floor(gl_Position.xy / gl_Position.w * uSnap + 0.5) / uSnap * gl_Position.w;');
  };
  return m;
}

// Quake II frame names: stand01..40, run1..6, attack1..8, paina01.., death101.. and so on. Each run of
// numbered frames becomes one clip; pain and death keep their variants apart.
function md2Clips(geo) {
  const groups = {};
  for (const m of geo.morphAttributes.position) {
    const [, base, num] = m.name.match(/^([a-z_]+?)(\d+)$/i) ?? [, m.name, ''];
    const key = /^(pain|death)$/i.test(base) ? base + num[0] : base;
    (groups[key] ??= []).push(m);
  }
  return Object.fromEntries(Object.entries(groups).map(([k, list]) => [k, THREE.AnimationClip.CreateFromMorphTargetSequence(k, list, 10, false)]));
}
const md2Geo = (url) => once(url, () => md2.loadAsync(url).then((g) => { g.computeBoundingBox(); return { geo: g, clips: md2Clips(g) }; }));

const shadowGeo = new THREE.CircleGeometry(1, 16);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.16, depthWrite: false });

class Actor {
  constructor() {
    this.root = new THREE.Group();
    this.pivot = new THREE.Group();
    this.root.add(this.pivot);
    this.mixers = [];
    this.clips = {};
    this.now = null;
    this.next = null;
    this.height = 1;
    this.width = 1;
    this.turn = 0;
    this.want = 0;
    this.dead = false;
  }

  clip(name) {
    const opts = (ALIAS[name] ?? [name]).filter((n) => this.clips[n]);
    return opts.length ? this.clips[opts[Math.floor(Math.random() * opts.length)]] : null;
  }

  // once: play through, then go back to `then`. hold: play once and stay on the last frame.
  play(name, { once: one = false, then = 'stand', hold = false, speed = 1 } = {}) {
    if (this.dead && name !== 'stand') return;
    if (this.now === name && !one && !hold) return;
    const clip = this.clip(name);
    if (!clip) return;
    this.dead = name === 'death';
    this.now = name;
    this.next = one ? then : null;
    for (const mx of this.mixers) {
      const prev = mx._mwAction;
      const a = mx.clipAction(clip);
      a.reset();
      a.setLoop(one || hold ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
      a.clampWhenFinished = one || hold;
      a.timeScale = speed;
      a.play();
      if (prev && prev !== a) a.crossFadeFrom(prev, calm ? 0 : 0.12, false);
      mx._mwAction = a;
    }
  }

  update(dt) {
    for (const mx of this.mixers) mx.update(dt);
    const d = ((this.want - this.turn + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    this.turn += d * Math.min(1, dt * 9);
    this.pivot.rotation.y = this.turn;
  }
}

export async function actor(kind, skin) {
  const c = CAST[kind];
  const [{ geo, clips }, map] = await Promise.all([md2Geo(c.md2), texture(c.skins + skin)]);
  const a = new Actor();
  const meshes = [new THREE.Mesh(geo, psx(map))];
  if (c.weapon) {
    const [{ geo: wg }, wmap] = await Promise.all([md2Geo(c.weapon[0]), texture(c.weapon[1])]);
    meshes.push(new THREE.Mesh(wg, psx(wmap)));
  }
  // Quake models face +X with their origin at the waist; turn them to the camera and stand them on the floor.
  const box = geo.boundingBox;
  a.height = box.max.y - box.min.y;
  a.width = Math.max(box.max.x - box.min.x, box.max.z - box.min.z);
  for (const m of meshes) {
    m.position.y = -box.min.y;
    m.rotation.y = -Math.PI / 2;
    a.pivot.add(m);
    a.mixers.push(new THREE.AnimationMixer(m));
  }
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(a.height * 0.2, a.height * 0.12, 1);
  shadow.position.y = 0.2;
  a.root.add(shadow);
  a.clips = clips;
  a.mixers[0].addEventListener('finished', () => { if (a.next) a.play(a.next); });
  return a;
}

// The dungeon draws these with its own renderer; it says how many pixels it has so the snap matches them.
export const setSnap = (w, h) => snap.value.set(w / 2, h / 2);
