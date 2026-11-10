/* The painted scrollbar. The page still scrolls natively; this is the thing you see and drag. */

const root = document.documentElement;
const bar = document.getElementById('sbar');
const track = bar.querySelector('.sbar__track');
const thumb = bar.querySelector('.sbar__thumb');
const up = bar.querySelector('.sbar__up');
const down = bar.querySelector('.sbar__down');
const scroller = () => (root.classList.contains('has-fit') ? document.getElementById('fit') : document.scrollingElement);
const listenOn = (el) => (el === document.scrollingElement || el === document.body ? window : el);

let listening = null;
let hideTimer = 0;
const home = () => document.body.dataset.page === 'work';

/* The bar is painted only while the work page is actually moving, then it steps back. */
function reveal() {
  if (!home() || bar.hidden) return;
  bar.classList.add('is-live');
  bar.removeAttribute('aria-hidden');
  clearTimeout(hideTimer);
  hideTimer = setTimeout(conceal, 900);
}
function conceal() {
  if (!home()) return;
  if (thumb.classList.contains('is-drag') || bar.matches(':hover')) {
    hideTimer = setTimeout(conceal, 900);
    return;
  }
  bar.classList.remove('is-live');
  bar.setAttribute('aria-hidden', 'true');
}

function onScroll() {
  draw();
  reveal();
}

function draw() {
  const el = scroller();
  const max = el.scrollHeight - el.clientHeight;
  const show = max > 2 && !root.classList.contains('has-fit');
  root.classList.toggle('has-sbar', show);
  bar.hidden = !show;
  if (!home()) {
    bar.classList.remove('is-live');
    bar.removeAttribute('aria-hidden');
  } else if (show && !bar.classList.contains('is-live')) {
    bar.setAttribute('aria-hidden', 'true');
  }
  if (!show) return;
  const trackH = track.clientHeight;
  const thumbH = Math.max(32, Math.round(trackH * (el.clientHeight / el.scrollHeight)));
  const travel = Math.max(0, trackH - thumbH);
  thumb.style.height = `${thumbH}px`;
  thumb.style.top = `${max <= 0 || travel <= 0 ? 0 : (el.scrollTop / max) * travel}px`;
  thumb.setAttribute('aria-valuenow', String(max <= 0 ? 0 : Math.round((el.scrollTop / max) * 100)));
  const target = listenOn(el);
  if (listening !== target) {
    listening?.removeEventListener('scroll', onScroll);
    target.addEventListener('scroll', onScroll, { passive: true });
    listening = target;
  }
}

function scrollBy(px) {
  const el = scroller();
  if (el === document.scrollingElement) window.scrollBy(0, px);
  else el.scrollTop += px;
}

function hold(button, dir) {
  let wait, tick;
  const stop = () => { clearTimeout(wait); clearInterval(tick); wait = tick = null; };
  button.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    e.preventDefault();
    scrollBy(dir * 64);
    wait = setTimeout(() => { tick = setInterval(() => scrollBy(dir * 64), 40); }, 280);
  });
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointerleave', stop);
  button.addEventListener('pointercancel', stop);
}
hold(up, -1);
hold(down, 1);

track.addEventListener('pointerdown', (e) => {
  if (e.target === thumb || e.button) return;
  const y = e.clientY - track.getBoundingClientRect().top;
  const thumbTop = thumb.offsetTop;
  const page = scroller().clientHeight * 0.86;
  scrollBy(y < thumbTop ? -page : page);
});

thumb.addEventListener('pointerdown', (e) => {
  if (e.button) return;
  e.preventDefault();
  e.stopPropagation();
  const el = scroller();
  const max = el.scrollHeight - el.clientHeight;
  const travel = track.clientHeight - thumb.offsetHeight;
  const startY = e.clientY;
  const start = el.scrollTop;
  thumb.classList.add('is-drag');
  thumb.setPointerCapture(e.pointerId);
  const move = (ev) => {
    if (travel <= 0) return;
    el.scrollTop = start + ((ev.clientY - startY) / travel) * max;
  };
  const upEv = () => {
    thumb.classList.remove('is-drag');
    thumb.removeEventListener('pointermove', move);
    thumb.removeEventListener('pointerup', upEv);
    thumb.removeEventListener('pointercancel', upEv);
  };
  thumb.addEventListener('pointermove', move);
  thumb.addEventListener('pointerup', upEv);
  thumb.addEventListener('pointercancel', upEv);
});

addEventListener('resize', draw);
const fit = document.getElementById('fit');
fit.addEventListener('load', draw, true);
new MutationObserver(draw).observe(fit, { childList: true, subtree: true });
new MutationObserver(draw).observe(document.getElementById('content'), { childList: true });
new MutationObserver(draw).observe(root, { attributes: true, attributeFilter: ['class', 'data-scroll'] });
new MutationObserver(draw).observe(document.body, { attributes: true, attributeFilter: ['data-page'] });
draw();
