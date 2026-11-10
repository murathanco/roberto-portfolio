import * as THREE from 'three';

// A first-person walk through a small stone keep. Each project hangs in its own room:
// step in, look at it, and enter to open it on the right.
// Wall and floor are from TextureTown, Melon King's texture archive
// (textures.neocities.org, linked from melonking.net): the fieldstone wall
// and a cracked stone floor. The frames use the same archive's wood.

const CELL = 2;
const WALL_H = 2.7;
const EYE = 1.58;
const RAD = 0.32;
const SPEED = 3.45;

const MAP = [
  '#################',
  '#1..#2..#3..#...#',
  '#...#...#...#...#',
  '###.#.#.#.#.###.#',
  '#...............#',
  '#.......S.......#',
  '###.#.#.#.#.###.#',
  '#...#...#...#...#',
  '#4..#5..#6..#...#',
  '#################',
];
const ROWS = MAP.length;
const COLS = MAP[0].length;

const COLORS = {
  lilac: 0xb79dff,
  mint: 0x45d98a,
  tomato: 0xff5330,
  peach: 0xff9f43,
  sky: 0x55b9ff,
  pink: 0xff86c8,
};

const solid = (c, r) => c < 0 || r < 0 || c >= COLS || r >= ROWS || MAP[r][c] === '#';

function pushOut(x, z) {
  for (let pass = 0; pass < 4; pass++) {
    const c0 = Math.floor((x - RAD) / CELL);
    const c1 = Math.floor((x + RAD) / CELL);
    const r0 = Math.floor((z - RAD) / CELL);
    const r1 = Math.floor((z + RAD) / CELL);
    let hit = false;
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (!solid(c, r)) continue;
        const minX = c * CELL, maxX = minX + CELL;
        const minZ = r * CELL, maxZ = minZ + CELL;
        const qx = Math.max(minX, Math.min(x, maxX));
        const qz = Math.max(minZ, Math.min(z, maxZ));
        const dx = x - qx, dz = z - qz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= RAD * RAD) continue;
        hit = true;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          const k = (RAD - d) / d;
          x += dx * k;
          z += dz * k;
        } else {
          const left = x - minX, right = maxX - x, back = z - minZ, fore = maxZ - z;
          const m = Math.min(left, right, back, fore);
          if (m === left) x = minX - RAD;
          else if (m === right) x = maxX + RAD;
          else if (m === back) z = minZ - RAD;
          else z = maxZ + RAD;
        }
      }
    }
    if (!hit) break;
  }
  return [x, z];
}

function canvasTex(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  return tex;
}

function fitFont(g, text, max, start) {
  let size = start;
  g.font = `${size}px "Times New Roman", Times, serif`;
  while (g.measureText(text).width > max && size > 22) {
    size -= 2;
    g.font = `${size}px "Times New Roman", Times, serif`;
  }
}

export function startDungeon(el, { projects = [], onOpen, onQuit } = {}) {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(hover: none), (pointer: coarse), (max-width: 900px)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x16110e);

  const root = document.createElement('div');
  root.className = 'game dun';
  root.tabIndex = -1;
  root.setAttribute('role', 'region');
  root.setAttribute('aria-label', 'Dungeon');
  if (coarse) root.classList.add('is-touch');
  root.innerHTML = `
    <div class="dun__cross" aria-hidden="true"></div>
    <div class="dun__well" aria-hidden="true"><span class="dun__nub"></span></div>
    <button class="dun__go" type="button" hidden>enter</button>
    <div class="dun__hud">
      <p class="dun__hint" aria-live="polite">${coarse ? 'left walk · right look' : 'wasd to walk · drag to look'}</p>
      <button class="key dun__quit" type="button">quit <span class="arr">✕</span></button>
    </div>`;
  root.prepend(renderer.domElement);
  el.append(root);
  el.classList.add('is-game');
  const wasHidden = el.getAttribute('aria-hidden');
  el.removeAttribute('aria-hidden');
  root.focus({ preventScroll: true });

  const hint = root.querySelector('.dun__hint');
  const cross = root.querySelector('.dun__cross');
  const nub = root.querySelector('.dun__nub');
  const go = root.querySelector('.dun__go');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x16110e);
  scene.fog = new THREE.FogExp2(0x16110e, 0.085);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.08, 48);
  camera.rotation.order = 'YXZ';
  scene.add(camera);

  const loader = new THREE.TextureLoader();
  const tile = (url, rx, ry) => {
    const t = loader.load(url);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestMipmapLinearFilter;
    return t;
  };
  const wallTex = tile('/textures/dungeon/wall.jpg', 1, 1);
  const ceilTex = tile('/textures/dungeon/wall.jpg', COLS * 0.45, ROWS * 0.45);
  const floorTex = tile('/textures/dungeon/floor.jpg', COLS * 0.5, ROWS * 0.5);
  const woodTex = tile('/textures/wood.jpg', 1, 1);
  const wallMat = new THREE.MeshLambertMaterial({ map: wallTex });
  const woodMat = new THREE.MeshLambertMaterial({ map: woodTex });
  const floorMat = new THREE.MeshLambertMaterial({ map: floorTex });
  const ceilMat = new THREE.MeshLambertMaterial({ map: ceilTex, color: 0x6a6158 });

  scene.add(new THREE.AmbientLight(0xb7a28e, 1.35));
  const lantern = new THREE.PointLight(0xffe2b8, 18, 9, 2);
  lantern.position.set(0.15, -0.25, -0.15);
  camera.add(lantern);

  let wallsN = 0;
  let startX = CELL * 1.5, startZ = CELL * 1.5;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (MAP[r][c] === '#') wallsN += 1;
      else if (MAP[r][c] === 'S') { startX = (c + 0.5) * CELL; startZ = (r + 0.5) * CELL; }
    }
  }
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, WALL_H, CELL), wallMat, wallsN);
  const dummy = new THREE.Object3D();
  let wi = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (MAP[r][c] !== '#') continue;
      dummy.position.set((c + 0.5) * CELL, WALL_H / 2, (r + 0.5) * CELL);
      dummy.updateMatrix();
      walls.setMatrixAt(wi++, dummy.matrix);
    }
  }
  walls.instanceMatrix.needsUpdate = true;
  walls.computeBoundingSphere();
  scene.add(walls);

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL), floorMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(COLS * CELL / 2, 0, ROWS * CELL / 2);
  scene.add(ground);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(COLS * CELL, ROWS * CELL), ceilMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(COLS * CELL / 2, WALL_H, ROWS * CELL / 2);
  scene.add(ceiling);

  const shrines = [];
  const labelOf = (p) => {
    const shared = projects.filter((x) => x.title === p.title).length > 1;
    return (shared ? `${p.title} ${p.slug.slice(-1)}` : p.title).toLowerCase();
  };
  const frameH = new THREE.BoxGeometry(1, 0.07, 0.07);
  const frameV = new THREE.BoxGeometry(0.07, 1, 0.07);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = MAP[r][c];
      if (ch < '1' || ch > '6') continue;
      const project = projects[Number(ch) - 1];
      if (!project) continue;
      const north = r < ROWS / 2;
      const cx = (c + 1.5) * CELL;
      const roomZ = north ? (r + 1) * CELL : r * CELL;
      const wallZ = north ? r * CELL + 0.055 : (r + 1) * CELL - 0.055;
      const slide = project.slides?.[0];
      let pw = 1.12, ph = 1.48;
      if (slide?.w && slide?.h) {
        const a = slide.w / slide.h;
        if (a > pw / ph) ph = pw / a;
        else pw = ph * a;
      }
      const label = labelOf(project);
      const color = COLORS[project.color] ?? 0xd9d9d5;
      const picTex = slide?.src
        ? loader.load(slide.src)
        : canvasTex(512, 640, (g) => {
          g.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
          g.fillRect(0, 0, 512, 640);
          g.fillStyle = '#101012';
          g.textAlign = 'center';
          g.textBaseline = 'middle';
          fitFont(g, label, 440, 68);
          g.fillText(label, 256, 320);
        });
      if (slide?.src) {
        picTex.colorSpace = THREE.SRGBColorSpace;
        picTex.magFilter = THREE.LinearFilter;
        picTex.minFilter = THREE.LinearMipmapLinearFilter;
      }
      const group = new THREE.Group();
      group.position.set(cx, 1.46, wallZ);
      group.rotation.y = north ? 0 : Math.PI;
      const pic = new THREE.Mesh(
        new THREE.PlaneGeometry(pw, ph),
        new THREE.MeshBasicMaterial({ map: picTex }),
      );
      group.add(pic);
      const top = new THREE.Mesh(frameH, woodMat);
      top.scale.set(pw + 0.16, 1, 1);
      top.position.set(0, ph / 2 + 0.035, 0.03);
      const bot = top.clone();
      bot.position.y = -ph / 2 - 0.035;
      const left = new THREE.Mesh(frameV, woodMat);
      left.scale.set(1, ph, 1);
      left.position.set(-pw / 2 - 0.035, 0, 0.03);
      const right = left.clone();
      right.position.x = pw / 2 + 0.035;
      group.add(top, bot, left, right);
      const plaque = new THREE.Mesh(
        new THREE.PlaneGeometry(Math.min(pw, 1.15), 0.24),
        new THREE.MeshBasicMaterial({
          map: canvasTex(512, 96, (g) => {
            g.fillStyle = '#101012';
            g.fillRect(0, 0, 512, 96);
            g.fillStyle = '#ffffff';
            g.textAlign = 'center';
            g.textBaseline = 'middle';
            fitFont(g, label, 470, 44);
            g.fillText(label, 256, 52);
          }),
        }),
      );
      plaque.position.set(0, -ph / 2 - 0.22, 0.03);
      group.add(plaque);
      scene.add(group);

      const rug = new THREE.Mesh(
        new THREE.PlaneGeometry(1.55, 1.35),
        new THREE.MeshBasicMaterial({ color }),
      );
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(cx, 0.025, roomZ);
      scene.add(rug);

      shrines.push({
        slug: project.slug,
        title: label,
        color: project.color,
        point: new THREE.Vector3(cx, 1.46, wallZ),
      });
    }
  }

  const pos = { x: startX, z: startZ };
  let yaw = -Math.PI / 2;
  let pitch = 0;
  let gait = 0;
  let bob = 0;
  let aimed = null;
  let shown = null;
  const held = new Set();
  const pointers = new Map();
  const to = new THREE.Vector3();
  const dir = new THREE.Vector3();

  const overlayOpen = () => ['flip', 'fit', 'viewer'].some((id) => {
    const node = document.getElementById(id);
    return node && !node.hidden;
  });
  const busy = () => overlayOpen() || !!document.querySelector('dialog[open]')
    || !!document.activeElement?.closest?.('#content, input, textarea, select, .flip, .fit, .viewer');

  const paintHint = () => {
    const key = aimed?.slug ?? '';
    if (key === shown) return;
    shown = key;
    if (aimed) {
      hint.textContent = coarse ? aimed.title : `${aimed.title} · enter`;
      hint.dataset.c = aimed.color;
      cross.dataset.c = aimed.color;
      go.dataset.c = aimed.color;
      go.setAttribute('aria-label', `Open ${aimed.title}`);
      go.hidden = !coarse;
    } else {
      hint.textContent = coarse ? 'left walk · right look' : 'wasd to walk · drag to look';
      delete hint.dataset.c;
      delete cross.dataset.c;
      delete go.dataset.c;
      go.hidden = true;
    }
  };

  const openAimed = () => { if (aimed) onOpen?.(aimed.slug); };

  const onKeyDown = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (busy()) { held.clear(); return; }
    if (e.key === 'Escape') { e.preventDefault(); quit(); return; }
    if (e.code === 'Enter' || e.code === 'KeyE') {
      if (e.target.closest?.('button')) return;
      if (!aimed) return;
      e.preventDefault();
      openAimed();
      return;
    }
    const move = e.code === 'KeyW' || e.code === 'KeyA' || e.code === 'KeyS' || e.code === 'KeyD'
      || e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight';
    if (!move) return;
    e.preventDefault();
    held.add(e.code);
  };
  const onKeyUp = (e) => held.delete(e.code);

  const stickFrom = () => {
    const box = root.querySelector('.dun__well').getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  };
  const onDown = (e) => {
    if (e.target.closest('.dun__hud, .dun__go')) return;
    root.focus({ preventScroll: true });
    const rect = root.getBoundingClientRect();
    const touch = e.pointerType === 'touch';
    const look = !touch || (e.clientX - rect.left) >= rect.width * 0.46;
    const origin = look || !coarse ? { x: e.clientX, y: e.clientY } : stickFrom();
    pointers.set(e.pointerId, {
      look, drag: 0,
      lastX: e.clientX, lastY: e.clientY,
      originX: origin.x, originY: origin.y,
      sx: 0, sy: 0,
    });
    if (!look && coarse) {
      const dx = e.clientX - origin.x, dy = e.clientY - origin.y;
      nub.style.transform = `translate(${THREE.MathUtils.clamp(dx, -36, 36)}px, ${THREE.MathUtils.clamp(dy, -36, 36)}px)`;
    }
    try { root.setPointerCapture(e.pointerId); } catch { /* the pointer can already be gone */ }
  };
  const onMove = (e) => {
    const p = pointers.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.lastX, dy = e.clientY - p.lastY;
    p.drag += Math.abs(dx) + Math.abs(dy);
    if (p.look) {
      const sens = e.pointerType === 'touch' ? 0.0046 : 0.0033;
      yaw -= dx * sens;
      pitch = THREE.MathUtils.clamp(pitch - dy * sens * 0.82, -1.02, 1.02);
      p.lastX = e.clientX;
      p.lastY = e.clientY;
    } else {
      const mx = e.clientX - p.originX, my = e.clientY - p.originY;
      p.sx = THREE.MathUtils.clamp(mx / 48, -1, 1);
      p.sy = THREE.MathUtils.clamp(my / 48, -1, 1);
      if (coarse) nub.style.transform = `translate(${p.sx * 36}px, ${p.sy * 36}px)`;
      p.lastX = e.clientX;
      p.lastY = e.clientY;
    }
  };
  const onUp = (e) => {
    const p = pointers.get(e.pointerId);
    pointers.delete(e.pointerId);
    if (p && !p.look && ![...pointers.values()].some((q) => !q.look)) nub.style.transform = 'none';
    if (!p?.look || p.drag >= (e.pointerType === 'touch' ? 14 : 7)) return;
    if (e.pointerType !== 'touch') openAimed();
  };

  addEventListener('keydown', onKeyDown, true);
  addEventListener('keyup', onKeyUp, true);
  root.addEventListener('pointerdown', onDown);
  root.addEventListener('pointermove', onMove);
  root.addEventListener('pointerup', onUp);
  root.addEventListener('pointercancel', onUp);
  root.addEventListener('contextmenu', (e) => e.preventDefault());
  root.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });
  root.addEventListener('click', (e) => {
    if (e.target.closest('.dun__quit')) quit();
    if (e.target.closest('.dun__go')) openAimed();
  });
  root.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

  const resize = () => {
    const w = root.clientWidth, h = root.clientHeight;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(1, 320 / h));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const hfov = 76 * Math.PI / 180;
    const vfov = 2 * Math.atan(Math.tan(hfov / 2) / Math.max(0.35, camera.aspect));
    camera.fov = Math.min(104, THREE.MathUtils.radToDeg(vfov));
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(root);
  resize();

  let raf = 0;
  let last = performance.now();
  const frame = (now) => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;

    if (busy()) held.clear();
    let ix = 0, iz = 0;
    if (held.has('KeyW') || held.has('ArrowUp')) iz += 1;
    if (held.has('KeyS') || held.has('ArrowDown')) iz -= 1;
    if (held.has('KeyA')) ix -= 1;
    if (held.has('KeyD')) ix += 1;
    if (held.has('ArrowLeft')) yaw += 2.15 * dt;
    if (held.has('ArrowRight')) yaw -= 2.15 * dt;
    for (const p of pointers.values()) if (!p.look) { ix += p.sx; iz -= p.sy; }
    ix = THREE.MathUtils.clamp(ix, -1, 1);
    iz = THREE.MathUtils.clamp(iz, -1, 1);

    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const mag = Math.hypot(ix, iz);
    if (mag > 0.04) {
      const k = SPEED * dt / mag;
      let nx = pos.x + (right.x * ix + forward.x * iz) * k;
      let nz = pos.z;
      [nx, nz] = pushOut(nx, nz);
      pos.x = nx;
      nz = pos.z + (right.z * ix + forward.z * iz) * k;
      [pos.x, pos.z] = pushOut(pos.x, nz);
      gait += dt * (calm ? 0 : 8.5);
    }
    const sway = !calm && mag > 0.04 ? Math.sin(gait) * 0.04 : 0;
    bob += (sway - bob) * Math.min(1, dt * 8);

    camera.position.set(pos.x, EYE + bob, pos.z);
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
    camera.rotation.z = 0;
    camera.updateMatrixWorld();

    camera.getWorldDirection(dir);
    aimed = null;
    let best = 0.5;
    for (const s of shrines) {
      to.copy(s.point).sub(camera.position);
      const dist = to.length();
      if (dist > 8.5 || dist < 0.05) continue;
      const flat = Math.hypot(s.point.x - pos.x, s.point.z - pos.z);
      const steps = Math.max(1, Math.ceil(flat / (CELL * 0.45)));
      let wall = false;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const x = pos.x + (s.point.x - pos.x) * t;
        const z = pos.z + (s.point.z - pos.z) * t;
        if (solid(Math.floor(x / CELL), Math.floor(z / CELL))) { wall = true; break; }
      }
      if (wall) continue;
      to.multiplyScalar(1 / dist);
      const dot = dir.dot(to);
      if (dot > best) { best = dot; aimed = s; }
    }
    paintHint();
    renderer.render(scene, camera);
  };
  raf = requestAnimationFrame(frame);

  let finishing = null;
  function quit() {
    if (finishing) return finishing;
    removeEventListener('keydown', onKeyDown, true);
    removeEventListener('keyup', onKeyUp, true);
    held.clear();
    const done = () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      const geos = new Set();
      const mats = new Set();
      scene.traverse((o) => {
        if (o.geometry) geos.add(o.geometry);
        const list = o.material ? [].concat(o.material) : [];
        list.forEach((m) => mats.add(m));
      });
      geos.forEach((g) => g.dispose());
      const maps = new Set();
      mats.forEach((m) => {
        if (m.map) maps.add(m.map);
        m.dispose();
      });
      maps.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
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
