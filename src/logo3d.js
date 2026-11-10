import * as THREE from 'three';
import mono from './monogram.json';

// Pose 0 is home; each project gets the next one. The monogram turns to it when that project is opened or pointed at.
// The key light sits up and to the left, so every pose leans back and mostly left: turned the other way the face goes grey.
const POSES = [
  [-0.2, -0.5, 0.0],     // home
  [-0.5, -0.42, 0.4],
  [-0.62, 0.3, 0.22],
  [-0.45, -0.1, -0.4],
  [-0.8, -0.3, 0.12],
  [-0.1, -0.75, 0.25],
  [-0.25, -0.7, -0.3],
];

const ringPath = (r) => 'M' + r.map(([x, y]) => `${x} ${y}`).join('L') + 'Z';

// A thick wave with round ends: the ~ that turns the monogram into an ñ.
function tildeGeometry(depth) {
  const w = 0.62, amp = 0.062, r = 0.046, n = 48;
  const mid = [];
  for (let i = 0; i <= n; i++) {
    const a = -0.2 * Math.PI + 2.4 * Math.PI * (i / n);
    mid.push(new THREE.Vector2(-w / 2 + w * (i / n), amp * Math.sin(a)));
  }
  const tangent = (i) => mid[Math.min(n, i + 1)].clone().sub(mid[Math.max(0, i - 1)]).normalize();
  const edge = (s) => mid.map((p, i) => { const t = tangent(i); return new THREE.Vector2(p.x - t.y * r * s, p.y + t.x * r * s); });
  const end = Math.atan2(tangent(n).y, tangent(n).x);
  const start = Math.atan2(tangent(0).y, tangent(0).x);
  const shape = new THREE.Shape(edge(1));
  shape.absarc(mid[n].x, mid[n].y, r, end + Math.PI / 2, end - Math.PI / 2, true);
  edge(-1).reverse().forEach((p) => shape.lineTo(p.x, p.y));
  shape.absarc(mid[0].x, mid[0].y, r, start - Math.PI / 2, start + Math.PI / 2, true);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 16,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

// About one unit across, centred, with its face toward +z.
export function monogramGeometry(depth) {
  const S = 1 / mono.w;
  const pt = ([x, y]) => new THREE.Vector2((x - mono.w / 2) * S, -(y - mono.h / 2) * S);
  const shapes = mono.shapes.map((s) => {
    const shape = new THREE.Shape(s.outer.map(pt));
    shape.holes = s.holes.map((h) => new THREE.Path(h.map(pt)));
    return shape;
  });
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2,
  });
  geo.translate(0, 0, -depth / 2);
  return geo;
}

export function monogramSVG() {
  const d = mono.shapes.map((s) => [s.outer, ...s.holes].map(ringPath).join('')).join('');
  return `<svg viewBox="0 0 ${mono.w} ${mono.h}" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" d="${d}"/></svg>`;
}

export function mountLogo(el) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  } catch {
    el.innerHTML = monogramSVG();
    el.classList.add('is-flat');
    return { setPose() {}, setTurn() {}, nudge() {}, pause() {}, resume() {}, setAscii() {} };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 50);

  const depth = 0.3;
  const geo = monogramGeometry(depth);

  const face = new THREE.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.6, metalness: 0.05 });
  const side = new THREE.MeshStandardMaterial({ color: 0x2f4bd8, roughness: 0.4, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, [face, side]);
  const group = new THREE.Group();
  group.add(mesh);
  scene.add(group);

  // Hovering the monogram swaps its cobalt side for whatever texture the scrollbar is wearing.
  const TILES = {
    wood: 92, metal: 56, stone: 72, brick: 80, grass: 64, clover: 52,
    water: 76, sky: 140, fire: 88, candy: 96, amethyst: 80, rainbow: 180,
  };
  const loader = new THREE.TextureLoader();
  const sideTextures = {};
  const w95Tex = () => {
    const c = document.createElement('canvas');
    c.width = c.height = 2;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#c0c0c0';
    ctx.fillRect(0, 0, 2, 2);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(1, 0, 1, 1);
    ctx.fillRect(0, 1, 1, 1);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = t.minFilter = THREE.NearestFilter;
    t.repeat.set(64, 64);
    return t;
  };
  const getSideTex = (skin) => {
    if (!skin) return null;
    if (sideTextures[skin]) return sideTextures[skin];
    if (skin === 'w95') return (sideTextures.w95 = w95Tex());
    if (!TILES[skin]) return null;
    const t = loader.load(`/textures/${skin}.jpg`, () => { if (reduce) draw(); });
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const rep = 240 / TILES[skin];
    t.repeat.set(rep, rep);
    return (sideTextures[skin] = t);
  };
  let hovered = false;
  const syncSide = () => {
    const map = hovered ? getSideTex(document.documentElement.dataset.scroll) : null;
    if (side.map === map) return;
    side.map = map;
    side.color.setHex(map ? 0xffffff : 0x2f4bd8);
    side.needsUpdate = true;
    if (reduce) draw();
  };
  el.addEventListener('pointerenter', () => { hovered = true; syncSide(); });
  el.addEventListener('pointerleave', () => { hovered = false; syncSide(); });
  new MutationObserver(syncSide).observe(document.documentElement, { attributes: true, attributeFilter: ['data-scroll'] });

  // Worn while the page is in Spanish. It drops in on a spring and the monogram shrinks a little to make room.
  const tilde = new THREE.Mesh(tildeGeometry(depth), [face, side]);
  const TILDE_Y = 0.76;
  tilde.visible = false;
  group.add(tilde);
  let tildeK = 0, tildeV = 0, wantTilde = false;
  const placeTilde = () => {
    const k = Math.max(0, tildeK);
    tilde.visible = k > 0.002;
    tilde.scale.setScalar(Math.max(0.001, tildeK));
    tilde.position.set(0, TILDE_Y + (1 - tildeK) * 0.3, 0);
    tilde.rotation.z = (1 - tildeK) * 0.7;
    group.position.y = -0.11 * k;
    group.scale.setScalar(1 - 0.12 * Math.min(1, k));
  };
  const syncLang = () => {
    wantTilde = document.documentElement.lang === 'es';
    if (reduce) { tildeK = wantTilde ? 1 : 0; placeTilde(); draw(); }
  };
  new MutationObserver(syncLang).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  scene.add(new THREE.HemisphereLight(0xffffff, 0x7f86a6, 1.7));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-2, 3, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9db0ff, 1.2);
  rim.position.set(4, -1, -2);
  scene.add(rim);

  const resize = () => {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Fit a ~1.5-unit bounding sphere into the smaller side of the stage.
    const fit = 0.78 / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.set(0, 0, fit / Math.min(1, camera.aspect));
    camera.updateProjectionMatrix();
    draw();
  };

  const target = { x: POSES[0][0], y: POSES[0][1], z: POSES[0][2] };
  const look = { x: 0, y: 0 };   // pointer follow
  const spin = { x: 0, y: 0 };   // drag offset, springs back
  let dragging = false, last = null;

  // On the info page the same render is read back and printed as characters.
  // Drawn on a canvas so each cell matches the glyph, and the monogram keeps its shape.
  const plate = document.createElement('canvas');
  plate.className = 'ascii-logo';
  plate.setAttribute('aria-hidden', 'true');
  el.appendChild(plate);
  const pctx = plate.getContext('2d');
  const sample = document.createElement('canvas');
  const sctx = sample.getContext('2d', { willReadFrequently: true });
  const GLYPHS = ' .:o*#%@';
  let asciiOn = false;
  const paintAscii = () => {
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const bw = Math.max(1, Math.floor(w * dpr));
    const bh = Math.max(1, Math.floor(h * dpr));
    if (plate.width !== bw || plate.height !== bh) {
      plate.width = bw;
      plate.height = bh;
    }
    const fontPx = Math.round((h < 280 ? 9 : 16) * dpr);
    pctx.setTransform(1, 0, 0, 1, 0, 0);
    pctx.font = `400 ${fontPx}px ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace`;
    pctx.textBaseline = 'top';
    pctx.textAlign = 'left';
    const cw = Math.max(1, Math.round(pctx.measureText('M').width));
    const ch = fontPx;
    const cols = Math.max(8, Math.floor(bw / cw));
    const rows = Math.max(8, Math.floor(bh / ch));
    if (sample.width !== cols || sample.height !== rows) {
      sample.width = cols;
      sample.height = rows;
    }
    sctx.clearRect(0, 0, cols, rows);
    sctx.drawImage(renderer.domElement, 0, 0, cols, rows);
    const data = sctx.getImageData(0, 0, cols, rows).data;
    pctx.clearRect(0, 0, bw, bh);
    pctx.fillStyle = '#111';
    const max = GLYPHS.length - 1;
    const ox = Math.floor((bw - cols * cw) / 2);
    const oy = Math.floor((bh - rows * ch) / 2);
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const i = (y * cols + x) * 4;
        const a = data[i + 3] / 255;
        if (a < 0.18) continue;
        const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        const lit = Math.min(1, a < 0.98 ? lum / a : lum);
        // Pale face stays a light glyph. The cobalt side goes heavy. Gaps stay empty.
        const shade = Math.pow(1 - lit, 0.75);
        const glyph = GLYPHS[Math.max(1, Math.round(Math.min(1, Math.max(shade, 0.42)) * max))];
        if (glyph === ' ') continue;
        pctx.fillText(glyph, ox + x * cw, oy + y * ch);
      }
    }
  };
  const draw = () => {
    renderer.render(scene, camera);
    if (asciiOn) paintAscii();
  };

  addEventListener('pointermove', (e) => {
    look.x = (e.clientY / innerHeight - 0.5) * 0.35;
    look.y = (e.clientX / innerWidth - 0.5) * 0.6;
    if (dragging && last) {
      spin.y += (e.clientX - last[0]) * 0.008;
      spin.x += (e.clientY - last[1]) * 0.008;
      last = [e.clientX, e.clientY];
    }
  });
  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; last = [e.clientX, e.clientY];
    canvas.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
  });
  const release = () => { dragging = false; last = null; el.classList.remove('is-dragging'); };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  const r = group.rotation;
  r.set(target.x, target.y, target.z);
  let t0 = performance.now();
  let running = !reduce;
  const tick = (t) => {
    if (!running) return;
    const dt = Math.min(50, t - t0) / 16.67; t0 = t;
    if (!dragging) {
      // unwind whole turns so it settles the short way round
      spin.x *= Math.pow(0.94, dt); spin.y *= Math.pow(0.94, dt);
    }
    const k = 1 - Math.pow(0.92, dt);
    const bob = Math.sin(t / 2600) * 0.035;
    r.x += (target.x + look.x + spin.x + bob - r.x) * k;
    r.y += (target.y + look.y + spin.y - r.y) * k;
    r.z += (target.z - r.z) * k;
    tildeV += ((wantTilde ? 1 : 0) - tildeK) * 0.08 * dt;
    tildeV *= Math.pow(0.82, dt);
    tildeK += tildeV * dt;
    placeTilde();
    draw();
    requestAnimationFrame(tick);
  };

  new ResizeObserver(resize).observe(el);
  resize();
  if (!reduce) requestAnimationFrame(tick);

  // t is a project index and may sit between two projects, for when the dial is mid-turn.
  const setTurn = (t) => {
    const count = POSES.length - 1;
    const a = ((t % count) + count) % count;
    const i0 = Math.floor(a);
    const f = a - i0;
    const A = POSES[i0 + 1];
    const B = POSES[(i0 + 1) % count + 1];
    target.x = A[0] + (B[0] - A[0]) * f;
    target.y = A[1] + (B[1] - A[1]) * f;
    target.z = A[2] + (B[2] - A[2]) * f;
    if (reduce) { r.set(target.x, target.y, target.z); draw(); }
  };

  return {
    setPose(i) {
      if (i <= 0) {
        const p = POSES[0];
        target.x = p[0]; target.y = p[1]; target.z = p[2];
        if (reduce) { r.set(...p); draw(); }
      } else setTurn(i - 1);
    },
    setTurn,
    // A flick, from scrolling on a phone: it rolls with the page and springs back, the way a drag does.
    nudge(dy) {
      if (reduce) return;
      spin.x = THREE.MathUtils.clamp(spin.x - dy * 0.002, -0.55, 0.55);
    },
    // While something else has the stage, stop drawing.
    pause() { running = false; },
    setAscii(on) {
      asciiOn = !!on;
      el.classList.toggle('is-ascii', asciiOn);
      if (asciiOn) draw();
      else pctx.clearRect(0, 0, plate.width, plate.height);
    },
    resume() {
      if (running || reduce) return;
      running = true;
      t0 = performance.now();
      requestAnimationFrame(tick);
    },
  };
}
