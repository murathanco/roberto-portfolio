import * as THREE from 'three';
import mono from './monogram.json';

// Pose 0 is home; each project gets the next one. The monogram turns to it when that project is opened or pointed at.
const POSES = [
  [-0.2, -0.5, 0.0],     // home
  [-0.5, -0.42, 0.4],
  [-0.62, 0.3, 0.22],
  [0.22, -0.6, -0.12],
  [-0.3, 0.55, -0.3],
];

const ringPath = (r) => 'M' + r.map(([x, y]) => `${x} ${y}`).join('L') + 'Z';

export function monogramSVG() {
  const d = mono.shapes.map((s) => [s.outer, ...s.holes].map(ringPath).join('')).join('');
  return `<svg viewBox="0 0 ${mono.w} ${mono.h}" xmlns="http://www.w3.org/2000/svg"><path fill="currentColor" fill-rule="evenodd" d="${d}"/></svg>`;
}

export function mountLogo(el) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    el.innerHTML = monogramSVG();
    el.classList.add('is-flat');
    return { setPose() {} };
  }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 50);

  const S = 1 / mono.w;
  const pt = ([x, y]) => new THREE.Vector2((x - mono.w / 2) * S, -(y - mono.h / 2) * S);
  const shapes = mono.shapes.map((s) => {
    const shape = new THREE.Shape(s.outer.map(pt));
    shape.holes = s.holes.map((h) => new THREE.Path(h.map(pt)));
    return shape;
  });
  const depth = 0.3;
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2,
  });
  geo.translate(0, 0, -depth / 2);

  const face = new THREE.MeshStandardMaterial({ color: 0xe9edf0, roughness: 0.6, metalness: 0.05 });
  const side = new THREE.MeshStandardMaterial({ color: 0x2f4bd8, roughness: 0.4, metalness: 0.1 });
  const mesh = new THREE.Mesh(geo, [face, side]);
  const group = new THREE.Group();
  group.add(mesh);
  scene.add(group);

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

  const draw = () => renderer.render(scene, camera);

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
  const tick = (t) => {
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
    draw();
    requestAnimationFrame(tick);
  };

  new ResizeObserver(resize).observe(el);
  resize();
  if (!reduce) requestAnimationFrame(tick);

  return {
    setPose(i) {
      const p = POSES[i % POSES.length];
      target.x = p[0]; target.y = p[1]; target.z = p[2];
      if (reduce) { r.set(...p); draw(); }
    },
  };
}
