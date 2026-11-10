// Vista-style flip: every project is a window, stacked on a diagonal.
// Scrolling, dragging, or the arrow keys walks the stack. The one in front is the one you're on.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const EXIT = 0.72;

const root = document.querySelector('#flip');
const deck = document.querySelector('#flip-deck');
const stage = root.querySelector('.flip__stage');
const closeBtn = document.querySelector('#flip-close');

let projects = [];
let trigger = null;
let focus = 0;
let shown = 0;
let fan = 1;
let fanTo = 1;
let raf = 0;
let open = false;
let token = 0;
let drag = null;
let suppressClick = false;
let pace = { x: 18, y: -24, z: -90, lift: 32 };

const mod = (a, n) => ((a % n) + n) % n;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
function label(p) {
  const shared = projects.filter((x) => x.title === p.title).length > 1;
  return (shared ? `${p.title} ${p.slug.slice(-1)}` : p.title).toLowerCase();
}

// d is how far a window sits behind the front one. Just past the front it goes
// negative (toward the camera) and fades, then reappears at the back of the stack.
function delta(i, at, n) {
  let d = i - at;
  d -= n * Math.floor((d + EXIT) / n);
  return d;
}

function opacityFor(d, n) {
  if (d < 0) return clamp(1 + d / EXIT, 0, 1);
  if (d > n - 1) return clamp((n - EXIT - d) / (1 - EXIT), 0, 1);
  return 1;
}

function measure() {
  const vw = root.clientWidth || innerWidth;
  const vh = root.clientHeight || innerHeight;
  const narrow = vw < 760;
  const w = Math.round(Math.min(narrow ? vw * 0.7 : 620, vw * 0.48));
  const h = Math.round(Math.min(narrow ? vh * 0.44 : 390, vh * 0.46));
  deck.style.setProperty('--win-w', `${w}px`);
  deck.style.setProperty('--win-h', `${h}px`);
  // A real diagonal: each window behind shows its caption, and depth does the rest.
  pace.x = Math.round(w * 0.03);
  pace.y = Math.round(-h * 0.062);
  pace.z = Math.round(-w * 0.15);
  pace.lift = Math.round(h * 0.09);
  deck.style.setProperty('--step-x', `${pace.x}px`);
  deck.style.setProperty('--step-y', `${pace.y}px`);
  deck.style.setProperty('--step-z', `${pace.z}px`);
  deck.style.left = narrow ? '52%' : '57%';
  deck.style.top = narrow ? '48%' : '50%';
  deck.style.setProperty('--pitch', `${narrow ? -12 : -15}deg`);
  deck.style.setProperty('--yaw', `${narrow ? 30 : 38}deg`);
  stage.style.perspective = `${Math.round(Math.max(1400, vw * 1.55))}px`;
}

// Each window is a glass frame around the same project row the page already shows.
function build() {
  const n = projects.length;
  deck.innerHTML = projects.map((p, i) => `
    <div class="flip__slot" data-i="${i}" style="--d:${i}">
      <div class="flip__win" role="button" tabindex="0" data-slug="${p.slug}" aria-label="Open ${esc(label(p))}, ${i + 1} of ${n}">
        <span class="flip__glass" aria-hidden="true"><span class="flip__caption">${esc(label(p))}</span><span class="flip__aero"><span class="flip__min"></span><span class="flip__max"></span><span class="flip__x"></span></span></span>
        <span class="flip__face"></span>
      </div>
    </div>`).join('');
}

function pour() {
  for (const win of deck.querySelectorAll('.flip__win')) {
    const live = document.querySelector(`.panel .entry[data-slug="${CSS.escape(win.dataset.slug)}"]`);
    const face = win.querySelector('.flip__face');
    if (!live) { face.replaceChildren(); continue; }
    const clone = live.cloneNode(true);
    clone.querySelectorAll('[id]').forEach((el) => el.removeAttribute('id'));
    face.replaceChildren(clone);
    const liveW = live.getBoundingClientRect().width || win.clientWidth;
    const frame = 7;
    const inner = Math.max(1, win.clientWidth - frame * 2);
    clone.style.width = `${liveW}px`;
    clone.style.transformOrigin = '0 0';
    clone.style.transform = `scale(${inner / liveW})`;
  }
}

function draw() {
  const n = projects.length;
  if (!n) return;
  const slots = deck.children;
  for (let i = 0; i < n; i++) {
    const d = delta(i, shown, n) * fan;
    const o = opacityFor(d / Math.max(fan, 0.001), n);
    const slot = slots[i];
    // fan gathers the windows onto the front one, then lets them spread down the diagonal.
    const leave = Math.min(d, 0);
    slot.style.setProperty('--d', d.toFixed(4));
    slot.style.transform = `translate3d(${(d * pace.x).toFixed(1)}px, ${(d * pace.y + leave * pace.lift).toFixed(1)}px, ${(d * pace.z).toFixed(1)}px) scale(${(1 - leave * 0.16).toFixed(3)})`;
    slot.style.zIndex = String(1000 - Math.round(d * 100));
    const win = slot.firstElementChild;
    win.style.setProperty('--o', o.toFixed(3));
    win.style.pointerEvents = o < 0.35 ? 'none' : '';
    win.tabIndex = o < 0.35 ? -1 : 0;
  }
}

function tick() {
  const diff = focus - shown;
  const fanDiff = fanTo - fan;
  if (calm || (Math.abs(diff) < 0.0008 && Math.abs(fanDiff) < 0.001)) {
    shown = focus;
    fan = fanTo;
    draw();
    raf = 0;
    return;
  }
  shown += diff * 0.24;
  fan += fanDiff * 0.16;
  draw();
  raf = requestAnimationFrame(tick);
}

function kick() {
  if (raf) return;
  if (calm) { shown = focus; draw(); return; }
  raf = requestAnimationFrame(tick);
}

const backgrounds = () => ['#stage', '#content', '.edges', '#sbar', '#fit', '#viewer']
  .map((s) => document.querySelector(s))
  .filter(Boolean);

function go(i) {
  const slug = projects[i]?.slug;
  if (!slug) return;
  hide();
  const next = `#/${slug}`;
  if ((location.hash || '#/') !== next) location.hash = next;
  else document.querySelector(`.entry[data-slug="${CSS.escape(slug)}"]`)?.scrollIntoView({ behavior: calm ? 'auto' : 'smooth', block: 'start' });
}

function show() {
  token += 1;
  open = true;
  fanTo = 1;
  trigger?.setAttribute('aria-expanded', 'true');
  // Reopening while it is still folding just reverses the same move.
  if (!root.hidden && deck.children.length) {
    root.classList.add('is-on');
    closeBtn.focus({ preventScroll: true });
    kick();
    return;
  }
  focus = 0;
  shown = 0;
  fan = calm ? 1 : 0.28;
  if (!document.querySelector('.panel .entry')) location.hash = '#/';
  document.documentElement.classList.add('has-flip');
  backgrounds().forEach((el) => { el.inert = true; });
  root.hidden = false;
  measure();
  build();
  pour();
  draw();
  root.getBoundingClientRect();
  root.classList.add('is-on');
  closeBtn.focus({ preventScroll: true });
  kick();
}

function release() {
  document.documentElement.classList.remove('has-flip');
  backgrounds().forEach((el) => { el.inert = false; });
  trigger?.setAttribute('aria-expanded', 'false');
  if (trigger && document.contains(trigger)) trigger.focus({ preventScroll: true });
}

function hide() {
  if (!open && root.hidden) return;
  open = false;
  fanTo = 0.28;
  kick();
  const mine = ++token;
  const finish = () => {
    if (mine !== token || root.hidden) return;
    cancelAnimationFrame(raf);
    raf = 0;
    root.hidden = true;
    release();
  };
  root.classList.remove('is-on');
  if (calm) { finish(); return; }
  deck.addEventListener('transitionend', function onEnd(e) {
    if (e.target !== deck || e.propertyName !== 'transform') return;
    deck.removeEventListener('transitionend', onEnd);
    finish();
  });
  setTimeout(finish, 760);
}

function step(by) {
  focus += by;
  kick();
}

root.addEventListener('wheel', (e) => {
  if (root.hidden || e.ctrlKey) return;
  e.preventDefault();
  if (!open) return;
  let dy = e.deltaY;
  let dx = e.deltaX;
  if (e.deltaMode === 1) { dy *= 16; dx *= 16; }
  else if (e.deltaMode === 2) { dy *= root.clientHeight; dx *= root.clientWidth; }
  const delta = Math.abs(dy) >= Math.abs(dx) ? dy : dx;
  step(delta / 150);
}, { passive: false });

stage.addEventListener('pointerdown', (e) => {
  if (!open || e.button) return;
  drag = { x: e.clientX, y: e.clientY, f: focus, id: e.pointerId, moved: false };
});
stage.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = drag.x - e.clientX;
  const dy = drag.y - e.clientY;
  if (!drag.moved && Math.hypot(dx, dy) < 6) return;
  drag.moved = true;
  focus = drag.f + (dy * 1.05 + dx * 0.45) / 150;
  kick();
});
function endDrag(e) {
  if (!drag || (e && e.pointerId !== drag.id)) return;
  suppressClick = drag.moved;
  drag = null;
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);

function picked(e) {
  const win = e.target.closest('.flip__win');
  if (!win || !open) return;
  const i = projects.findIndex((p) => p.slug === win.dataset.slug);
  if (i >= 0) go(i);
}
deck.addEventListener('click', (e) => {
  if (suppressClick) { suppressClick = false; return; }
  picked(e);
});
deck.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  if (!e.target.closest('.flip__win')) return;
  e.preventDefault();
  picked(e);
});

root.addEventListener('keydown', (e) => {
  if (!open) return;
  if (e.key === 'Escape') { e.preventDefault(); hide(); return; }
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); step(1); return; }
  if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); step(-1); return; }
  if (e.key === 'Home') { e.preventDefault(); step(-mod(focus, projects.length)); return; }
  if (e.key === 'End') { e.preventDefault(); step((projects.length - 1) - mod(focus, projects.length)); return; }
  if (e.key !== 'Tab') return;
  const items = [...root.querySelectorAll('button, [role="button"]')].filter((b) => b.tabIndex >= 0);
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

closeBtn.addEventListener('click', hide);
addEventListener('resize', () => { if (open) measure(); });

export function mountFlip(list, button) {
  projects = list;
  trigger = button;
  button?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (open) hide();
    else show();
  });
}
