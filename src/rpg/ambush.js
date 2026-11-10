import './ambush.css';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';
import { actor, setSnap } from './models.js';
import { sfx } from './sound.js';

// Sit still (or leave the tab) for half a minute and something finds you.
// Sword: "Quake Style Sword" by sndein (CC-BY 4.0, OpenGameArt) — a Quake-palette arming sword, old Western RPG look.

const IDLE = 30;
const COOLDOWN = 45;
const UNIT = 1.75 / 56;
const REACH = 2.8;
const CLOSE = 2.15;   // stop a couple metres out so they fill the view, not your nose
const SPAWN = 6.2;
const MIN = 1.55;
const WEAPON = { dmg: [6, 10], speed: 0.42 };
const SWORD_DIR = '/textures/ambush/';

const CREATURES = [
  { name: 'Bog Troll', model: 'ogro', skin: 'darkam.png', hp: 8, dmg: [3, 5], every: 1.55, voice: 'ogre' },
  { name: 'Mad Dwarf', model: 'ogro', skin: 'nabogro.png', hp: 6, dmg: [2, 4], every: 1.35, voice: 'ogre', scale: 0.78 },
  { name: 'Ratamahatta', model: 'rata', skin: 'ratamahatta.png', hp: 9, dmg: [3, 5], every: 1.45, voice: 'beast' },
  { name: 'Ash Ghoul', model: 'rata', skin: 'dead.png', hp: 10, dmg: [3, 6], every: 1.5, voice: 'beast' },
  { name: 'Blood Ogro', model: 'ogro', skin: 'khorne.png', hp: 12, dmg: [4, 6], every: 1.6, voice: 'giant', scale: 1.15 },
];

const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const rnd = (a, b) => a + Math.random() * (b - a);
const roll = ([a, b]) => Math.floor(rnd(a, b + 1));

const swordReady = (async () => {
  const mtl = await new MTLLoader().setPath(SWORD_DIR).loadAsync('q_sword.mtl');
  mtl.preload();
  const obj = await new OBJLoader().setMaterials(mtl).setPath(SWORD_DIR).loadAsync('q_sword.obj');
  return obj;
})().catch(() => null);

/* ---------- shell ---------- */

const root = document.createElement('div');
root.className = 'amb';
root.hidden = true;
root.tabIndex = -1;
root.setAttribute('role', 'dialog');
root.setAttribute('aria-modal', 'true');
root.setAttribute('aria-label', 'Ambush');
root.innerHTML = `
  <canvas aria-hidden="true"></canvas>
  <div class="amb__cross" aria-hidden="true"></div>
  <div class="amb__hurt" aria-hidden="true"></div>
  <div class="amb__dead" hidden>
    <div class="amb__card">
      <div class="amb__sheet">
        <span class="amb__badge">
          <img class="amb__mark" src="/icons/finds/dead-skull-0499.gif" alt="" width="32" height="32" />
        </span>
        <p class="amb__line" id="amb-idle">You've idled too long.</p>
        <p class="amb__who" id="amb-who">Something got you.</p>
      </div>
      <button type="button" aria-describedby="amb-idle amb-who">
        <span class="amb__rise-ico"><img src="/icons/finds/sword.gif" alt="" width="32" height="32" /></span>
        <span>Rise</span>
      </button>
    </div>
  </div>`;
document.body.append(root);

const canvas = root.querySelector('canvas');
const hurtEl = root.querySelector('.amb__hurt');
const deadEl = root.querySelector('.amb__dead');
const whoEl = root.querySelector('.amb__who');
const riseBtn = root.querySelector('.amb__card button');

let live = false;
let lastActive = Date.now();
let nextOk = Date.now() + IDLE * 1000;
let leftAt = 0;
let endFight = null;

const poke = () => { lastActive = Date.now(); };
for (const t of ['pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll']) {
  addEventListener(t, poke, { passive: true, capture: true });
}
addEventListener('pointermove', () => {
  if (Date.now() - lastActive > 400) poke();
}, { passive: true });

addEventListener('visibilitychange', () => {
  if (document.hidden) leftAt = Date.now();
  else if (leftAt && Date.now() - leftAt >= IDLE * 1000) trySpawn();
});

const blocked = () => live
  || Date.now() < nextOk
  || !!document.querySelector('.game')
  || !!document.querySelector('dialog[open]')
  || ['has-viewer', 'has-fit', 'has-flip'].some((c) => document.documentElement.classList.contains(c));

setInterval(() => {
  if (blocked() || document.hidden) return;
  if ((Date.now() - lastActive) / 1000 >= IDLE) trySpawn();
}, 1000);

function trySpawn() {
  if (blocked()) return;
  start();
}

addEventListener('rgs:ambush', () => { nextOk = 0; lastActive = 0; trySpawn(); });

/* ---------- sword viewmodel ---------- */

const REST = { x: 0.28, y: -0.32, z: -0.55, rx: 0.15, ry: 0.4, rz: 0.35 };
const STRIKE = { x: -0.05, y: -0.45, z: -0.7, rx: -1.1, ry: 0.1, rz: 1.2 };

function mountSword(camera, obj) {
  const root3 = obj.clone(true);
  root3.traverse((o) => {
    if (!o.isMesh) return;
    o.frustumCulled = false;
    o.renderOrder = 10;
    const list = [].concat(o.material);
    o.material = list.map((m) => {
      if (!m) return m;
      const map = m.map || null;
      if (map) {
        map.colorSpace = THREE.SRGBColorSpace;
        map.magFilter = map.minFilter = THREE.NearestFilter;
        map.generateMipmaps = false;
        map.needsUpdate = true;
      }
      return new THREE.MeshLambertMaterial({
        map,
        color: map ? 0xffffff : 0xb0b0b0,
        fog: false,
        depthTest: false,
        depthWrite: false,
      });
    });
    if (list.length === 1) o.material = o.material[0];
  });
  root3.scale.setScalar(0.85);
  camera.add(root3);

  let swingT = -1;
  const pose = (p) => {
    root3.position.set(p.x, p.y, p.z);
    root3.rotation.set(p.rx, p.ry, p.rz);
  };
  pose(REST);

  return {
    root: root3,
    swing() {
      swingT = 0;
    },
    update(dt) {
      if (swingT < 0) {
        const bob = calm ? 0 : Math.sin(performance.now() / 550) * 0.008;
        root3.position.y = REST.y + bob;
        return;
      }
      swingT += dt / 0.34;
      const t = Math.min(1, swingT);
      const ease = t < 0.45 ? (t / 0.45) : (1 - (t - 0.45) / 0.55);
      const k = ease * ease * (3 - 2 * ease);
      root3.position.set(
        REST.x + (STRIKE.x - REST.x) * k,
        REST.y + (STRIKE.y - REST.y) * k,
        REST.z + (STRIKE.z - REST.z) * k,
      );
      root3.rotation.set(
        REST.rx + (STRIKE.rx - REST.rx) * k,
        REST.ry + (STRIKE.ry - REST.ry) * k,
        REST.rz + (STRIKE.rz - REST.rz) * k,
      );
      if (swingT >= 1) { swingT = -1; pose(REST); }
    },
  };
}

/* ---------- one fight ---------- */

async function start() {
  if (live) return;
  live = true;

  const def = CREATURES[Math.floor(Math.random() * CREATURES.length)];
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  scene.background = null;
  const camera = new THREE.PerspectiveCamera(68, 1, 0.05, 40);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  scene.add(new THREE.HemisphereLight(0xffe2b0, 0x1a120c, 1.15));
  const lamp = new THREE.PointLight(0xffd2a0, 18, 10, 2);
  lamp.position.set(0.15, 0.05, 0.2);
  camera.add(lamp);

  const [swordObj, body] = await Promise.all([
    swordReady,
    actor(def.model, def.skin).catch(() => null),
  ]);
  if (!body) {
    live = false;
    renderer.dispose();
    nextOk = Date.now() + 10_000;
    return;
  }

  let arms = null;
  if (swordObj) arms = mountSword(camera, swordObj);

  const k = def.scale ?? 1;
  body.root.scale.setScalar(UNIT * k);
  let fx = 0, fz = -SPAWN;
  body.root.position.set(fx, 0, fz);
  body.want = 0;
  body.turn = 0;
  body.play('run');
  scene.add(body.root);

  let hp = def.hp;
  let meHp = 18;
  let cool = 0, landAt = -1, hurtT = 0, dieT = -1;
  let timer = def.every * 0.75, winding = false;
  let dead = false, won = false, ended = false;
  const size = new THREE.Vector2();
  // Fixed forward view — click / Space to swing, nothing else.
  camera.rotation.set(0.06, 0, 0);
  root.classList.remove('is-dead');
  root.setAttribute('aria-label', 'Ambush');
  deadEl.hidden = true;
  root.hidden = false;
  requestAnimationFrame(() => root.classList.add('is-on'));
  root.focus({ preventScroll: true });
  document.documentElement.classList.add('amb-lock');
  dispatchEvent(new CustomEvent('rgs:ambush-start'));
  sfx.growl(def.voice);

  const resize = () => {
    const w = root.clientWidth, h = root.clientHeight;
    if (!w || !h) return;
    const rw = Math.max(160, Math.round(w * 0.42));
    const rh = Math.max(120, Math.round(h * 0.42));
    renderer.setSize(rw, rh, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    setSnap(rw, rh);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(root);
  resize();

  function flash() {
    hurtEl.classList.remove('is-on');
    void hurtEl.offsetWidth;
    hurtEl.classList.add('is-on');
  }

  function swing() {
    if (dead || ended || cool > 0) return;
    cool = WEAPON.speed;
    landAt = 0.18;
    arms?.swing();
    sfx.swing();
  }

  function land() {
    if (won || dead) return;
    const d = Math.hypot(fx, fz) || 1;
    if (d > REACH) return;
    const dmg = roll(WEAPON.dmg);
    sfx.hit();
    hp -= dmg;
    if (hp <= 0) { slay(); return; }
    fx *= (d + 0.4) / d;
    fz *= (d + 0.4) / d;
    if (Math.random() < 0.75) sfx.pain(def.voice);
    if (!winding) body.play('pain', { once: true });
  }

  function think(dt) {
    if (won) {
      body.root.position.y -= dt * 0.1;
      return;
    }
    if (dead) return;
    // Keep them dead-center in front of the fixed camera.
    fx = 0;
    const d = Math.abs(fz);
    body.want = 0; // face the camera (+Z); Math.PI showed their backs
    if (d > CLOSE) {
      const speed = 2.2 * (winding ? 0.2 : 1);
      fz += Math.min(d - CLOSE, speed * dt); // fz is negative; move toward camera
      if (!winding && body.now !== 'pain') body.play('run');
    } else {
      fz = -CLOSE;
      if (!winding && body.now !== 'pain') body.play('stand');
    }
    if (Math.abs(fz) < MIN) fz = -MIN;
    body.root.position.set(0, 0, fz);

    if (d <= CLOSE + 0.15 || winding) {
      timer -= dt;
      if (!winding && timer < 0.45) { winding = true; body.play('attack', { once: true }); }
      if (timer <= 0) {
        winding = false;
        timer = def.every * rnd(0.85, 1.05);
        bite();
      }
    } else timer = Math.max(timer, 0.55);
  }

  function bite() {
    if (Math.abs(fz) > CLOSE + 0.35) return;
    sfx.hurt();
    flash();
    hurtT = 0.45;
    meHp = Math.max(0, meHp - roll(def.dmg));
    if (meHp <= 0) lose();
  }

  function slay() {
    won = true;
    body.play('death', { hold: true });
    sfx.slain(def.voice);
    dispatchEvent(new CustomEvent('rgs:ambush-win', {
      detail: { name: def.name, boss: def.name === 'Blood Ogro' },
    }));
    setTimeout(() => finish(true), calm ? 350 : 1100);
  }

  function lose() {
    dead = true;
    dieT = 0;
    whoEl.textContent = `The ${def.name} got you.`;
    root.setAttribute('aria-label', `You've idled too long. The ${def.name} got you.`);
    root.classList.add('is-dead');
    body.play('cheer', { once: true });
    sfx.death();
    dispatchEvent(new CustomEvent('rgs:ambush-lose'));
    setTimeout(() => sfx.growl(def.voice), 700);
    setTimeout(() => { deadEl.hidden = false; riseBtn.focus({ preventScroll: true }); }, calm ? 150 : 1000);
  }

  function finish(ok) {
    if (ended) return;
    ended = true;
    nextOk = Date.now() + (ok ? COOLDOWN : 60) * 1000;
    lastActive = Date.now();
    root.classList.remove('is-on');
    const done = () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      removeEventListener('keydown', onKey, true);
      root.removeEventListener('pointerdown', onClick);
      if (arms) camera.remove(arms.root);
      scene.remove(body.root);
      renderer.dispose();
      renderer.forceContextLoss();
      root.classList.remove('is-dead');
      root.setAttribute('aria-label', 'Ambush');
      root.hidden = true;
      deadEl.hidden = true;
      document.documentElement.classList.remove('amb-lock');
      live = false;
      endFight = null;
    };
    setTimeout(done, calm ? 0 : 280);
  }

  endFight = () => {
    if (dead) { finish(false); return; }
    if (!ended) {
      sfx.dodge();
      dispatchEvent(new CustomEvent('rgs:ambush-flee'));
      finish(true);
    }
  };

  const onKey = (e) => {
    if (!live || ended) return;
    if (e.code === 'Escape') { e.preventDefault(); endFight(); return; }
    if (dead) return;
    if (e.code === 'Space') { e.preventDefault(); swing(); }
  };
  const onClick = (e) => {
    if (dead || ended || e.target.closest('button')) return;
    swing();
  };

  addEventListener('keydown', onKey, true);
  root.addEventListener('pointerdown', onClick);
  riseBtn.onclick = () => finish(false);

  let raf = 0, last = performance.now();
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (ended) return;
    cool = Math.max(0, cool - dt);
    hurtT = Math.max(0, hurtT - dt);
    if (landAt >= 0) {
      landAt -= dt;
      if (landAt <= 0) { landAt = -1; land(); }
    }

    think(dt);
    body.update(dt);
    arms?.update(dt);

    const shake = calm ? 0 : hurtT * 0.18;
    let drop = 0;
    if (dieT >= 0) {
      dieT += dt;
      drop = Math.min(1, dieT / 0.9) ** 2 * 1.1;
    }
    camera.position.set((Math.random() - 0.5) * shake, 1.48 - drop + (Math.random() - 0.5) * shake, 0);
    camera.rotation.set(0.06, 0, 0);
    camera.updateMatrixWorld();

    renderer.getDrawingBufferSize(size);
    setSnap(size.x, size.y);
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);
}
