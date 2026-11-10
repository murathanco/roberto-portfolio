import './finds.css';
import { projects } from './projects.js';
import { sfx } from './rpg/sound.js';

// Site achievements — Melonking-flavoured trophy case.
// Icons: Pixel Sea (pixelsea.neocities.org). Wood/paper/metal: TextureTown (textures.neocities.org).
// Click a toast (or the corner plaque) to open your collection.

const KEY = 'rgs-finds';
const VERSION = 1;
const ICO = '/icons/finds';

/** hint = locked teaser. icon = Pixel Sea gif. */
const FINDS = {
  welcome: { name: 'Outlander', hint: 'Arrive.', icon: 'arrive.gif' },
  returning: { name: 'Returning', hint: 'Visit on three days.', icon: 'globe-0001.gif' },
  nightowl: { name: 'Night Owl', hint: 'Visit late, Toronto time.', icon: 'owl.gif' },
  info: { name: 'Know Thy Associate', hint: 'Find out who runs this place.', icon: 'book.gif' },
  curator: { name: 'Curator', hint: 'See a project full size.', icon: 'camera.gif' },
  inspect: { name: 'Close Look', hint: 'Open a project full size.', icon: 'eye.gif' },
  gallery: { name: 'Gallery Crawl', hint: 'See every image of a project.', icon: 'star.gif' },
  cartographer: { name: 'Cartographer', hint: 'Find every project.', icon: 'map.gif' },
  bottom: { name: 'The Very End', hint: 'Keep scrolling.', icon: 'secret.gif' },
  hola: { name: '¡Hola!', hint: 'Take the flag.', icon: 'flag.gif' },
  courier: { name: 'Courier', hint: 'Get in touch.', icon: 'mail.gif' },
  runner: { name: 'Run, Doodle', hint: 'Click the doodle.', icon: 'shoe-0056.gif' },
  marathon: { name: 'Marathon', hint: 'Run 500 m.', icon: 'walk.gif' },
  delver: { name: 'Delver', hint: 'Walk the dungeon.', icon: 'doorway.gif' },
  firstblood: { name: 'First Blood', hint: 'Win a fight.', icon: 'sword.gif' },
  hunter: { name: 'Monster Hunter', hint: 'Win ten fights.', icon: 'angry-monster.gif' },
  boss: { name: 'Ogro Slayer', hint: 'Beat the Blood Ogro.', icon: 'fire-award.gif' },
  idle: { name: 'Idle Hands', hint: 'Do nothing. For a while.', icon: 'sleep-0006.gif' },
  death: { name: 'Back From the Dead', hint: 'Lose a fight.', icon: 'skull.gif' },
  coward: { name: 'Discretion', hint: 'Run away.', icon: 'ghost.gif' },
};

const IDS = Object.keys(FINDS);
const LOCKED_ICON = `${ICO}/lock.gif`;
const AWARD_ICON = `${ICO}/award.gif`;

function fresh() {
  return { v: VERSION, got: {}, seen: {}, kills: 0, days: [] };
}

function migrate() {
  const base = fresh();
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    if (raw?.v === VERSION) {
      return {
        ...base,
        got: { ...raw.got },
        seen: { ...raw.seen },
        kills: Number(raw.kills) || 0,
        days: Array.isArray(raw.days) ? raw.days.slice(-30) : [],
      };
    }
  } catch { /* */ }
  try {
    const old = JSON.parse(localStorage.getItem('rgs-rpg'));
    if (old?.ach) {
      for (const id of IDS) {
        if (old.ach[id]) base.got[id] = old.ach[id];
      }
      if (old.seen) base.seen = { ...old.seen };
      if (old.days) base.days = old.days.slice(-30);
      const kills = old.kills && typeof old.kills === 'object'
        ? Object.values(old.kills).reduce((a, b) => a + Number(b || 0), 0)
        : 0;
      base.kills = kills;
    }
  } catch { /* */ }
  return base;
}

let S = migrate();
let saveT = 0;
function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* */ }
  }, 200);
}
addEventListener('pagehide', () => {
  try { localStorage.setItem(KEY, JSON.stringify(S)); } catch { /* */ }
});

const earned = () => IDS.filter((id) => S.got[id]).length;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const iconSrc = (id, on) => (on ? `${ICO}/${FINDS[id].icon}` : LOCKED_ICON);

/* ---------- corner plaque + toast + collection ---------- */

const openBtn = document.createElement('button');
openBtn.type = 'button';
openBtn.className = 'finds-open';
openBtn.setAttribute('aria-label', 'Open achievements');
openBtn.innerHTML = `<img src="${AWARD_ICON}" alt="" width="28" height="28" />`;
document.body.append(openBtn);

const toastEl = document.createElement('button');
toastEl.type = 'button';
toastEl.className = 'finds-toast';
toastEl.setAttribute('aria-live', 'polite');
toastEl.hidden = true;
document.body.append(toastEl);

const journal = document.createElement('div');
journal.className = 'finds';
journal.hidden = true;
journal.setAttribute('role', 'dialog');
journal.setAttribute('aria-modal', 'true');
journal.setAttribute('aria-label', 'Achievements');
journal.innerHTML = `
  <div class="finds__case">
    <div class="finds__titlebar">
      <img src="${AWARD_ICON}" alt="" width="22" height="22" />
      <h2 class="finds__title">Achievements</h2>
      <span class="finds__count" data-count></span>
      <button type="button" class="finds__x" data-close aria-label="Close"></button>
    </div>
    <div class="finds__body">
      <div class="finds__scroll">
        <ul class="finds__list" id="finds-list" data-list></ul>
        <div class="finds__sbar" data-sbar hidden>
          <button type="button" class="finds__up" data-up aria-label="Scroll up"></button>
          <div class="finds__track" data-track>
            <div class="finds__thumb" data-thumb role="scrollbar" tabindex="0" aria-controls="finds-list" aria-orientation="vertical" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" aria-label="Achievements"></div>
          </div>
          <button type="button" class="finds__down" data-down aria-label="Scroll down"></button>
        </div>
      </div>
      <details class="finds__credit">
        <summary>credits</summary>
        <p>
          Icons from <a href="https://pixelsea.neocities.org/" target="_blank" rel="noopener noreferrer">Pixel Sea</a>
          · textures from <a href="https://textures.neocities.org/" target="_blank" rel="noopener noreferrer">TextureTown</a>
        </p>
      </details>
    </div>
  </div>`;
document.body.append(journal);

const listEl = journal.querySelector('[data-list]');
const countEl = journal.querySelector('[data-count]');
const closeBtn = journal.querySelector('[data-close]');

/* Painted bar. The list still scrolls natively; a Mac overlay bar will not take a texture. */
const sbar = journal.querySelector('[data-sbar]');
const sTrack = sbar.querySelector('[data-track]');
const sThumb = sbar.querySelector('[data-thumb]');

function drawBar() {
  if (journal.hidden) return;
  const max = listEl.scrollHeight - listEl.clientHeight;
  const show = max > 2;
  sbar.hidden = !show;
  if (!show) return;
  const trackH = sTrack.clientHeight;
  const thumbH = Math.max(36, Math.round(trackH * (listEl.clientHeight / listEl.scrollHeight)));
  const travel = Math.max(0, trackH - thumbH);
  sThumb.style.height = `${thumbH}px`;
  sThumb.style.top = `${travel <= 0 ? 0 : (listEl.scrollTop / max) * travel}px`;
  sThumb.setAttribute('aria-valuenow', String(Math.round((listEl.scrollTop / max) * 100)));
}

function scrollList(px) {
  listEl.scrollTop += px;
  drawBar();
}

function holdBtn(button, dir) {
  let wait, tick;
  const stop = () => { clearTimeout(wait); clearInterval(tick); wait = tick = null; };
  button.addEventListener('pointerdown', (e) => {
    if (e.button) return;
    e.preventDefault();
    scrollList(dir * 48);
    wait = setTimeout(() => { tick = setInterval(() => scrollList(dir * 48), 40); }, 280);
  });
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointerleave', stop);
  button.addEventListener('pointercancel', stop);
}
holdBtn(sbar.querySelector('[data-up]'), -1);
holdBtn(sbar.querySelector('[data-down]'), 1);

sTrack.addEventListener('pointerdown', (e) => {
  if (e.target === sThumb || e.button) return;
  const y = e.clientY - sTrack.getBoundingClientRect().top;
  const page = listEl.clientHeight * 0.86;
  scrollList(y < sThumb.offsetTop ? -page : page);
});

sThumb.addEventListener('pointerdown', (e) => {
  if (e.button) return;
  e.preventDefault();
  e.stopPropagation();
  const max = listEl.scrollHeight - listEl.clientHeight;
  const travel = sTrack.clientHeight - sThumb.offsetHeight;
  const startY = e.clientY;
  const start = listEl.scrollTop;
  sThumb.classList.add('is-drag');
  const move = (ev) => {
    if (travel <= 0) return;
    listEl.scrollTop = start + ((ev.clientY - startY) / travel) * max;
    drawBar();
  };
  const end = () => {
    sThumb.classList.remove('is-drag');
    sThumb.removeEventListener('pointermove', move);
    sThumb.removeEventListener('pointerup', end);
    sThumb.removeEventListener('pointercancel', end);
  };
  sThumb.addEventListener('pointermove', move);
  sThumb.addEventListener('pointerup', end);
  sThumb.addEventListener('pointercancel', end);
  sThumb.setPointerCapture(e.pointerId);
});

sThumb.addEventListener('keydown', (e) => {
  const page = listEl.clientHeight * 0.86;
  const key = {
    ArrowDown: 48,
    ArrowUp: -48,
    PageDown: page,
    PageUp: -page,
    Home: -listEl.scrollHeight,
    End: listEl.scrollHeight,
  }[e.key];
  if (key == null) return;
  e.preventDefault();
  scrollList(key);
});

listEl.addEventListener('scroll', drawBar, { passive: true });
new ResizeObserver(drawBar).observe(listEl);

let toastT = 0;
function toast(id) {
  const a = FINDS[id];
  if (!a) return;
  clearTimeout(toastT);
  toastEl.innerHTML = `
    <span class="finds-toast__ico"><img src="${ICO}/${a.icon}" alt="" width="28" height="28" /></span>
    <span>
      <span class="finds-toast__k">Achievement</span>
      <span class="finds-toast__n">${esc(a.name)}</span>
      <span class="finds-toast__go">open collection →</span>
    </span>`;
  toastEl.hidden = false;
  requestAnimationFrame(() => toastEl.classList.add('is-on'));
  toastT = setTimeout(() => {
    toastEl.classList.remove('is-on');
    setTimeout(() => { toastEl.hidden = true; }, 240);
  }, 4200);
}

function paint() {
  countEl.textContent = `${earned()} / ${IDS.length}`;
  listEl.innerHTML = IDS.map((id) => {
    const a = FINDS[id];
    const on = !!S.got[id];
    return `<li class="finds__row${on ? ' is-on' : ' is-out'}" data-id="${id}">
      <span class="finds__badge"><img src="${iconSrc(id, on)}" alt="" width="32" height="32" /></span>
      <span class="finds__copy">
        <span class="finds__name">${esc(on ? a.name : 'Still locked')}</span>
        <span class="finds__hint">${esc(on ? 'Unlocked' : a.hint)}</span>
      </span>
    </li>`;
  }).join('');
  drawBar();
}

function openJournal() {
  paint();
  clearTimeout(toastT);
  toastEl.classList.remove('is-on');
  toastEl.hidden = true;
  journal.hidden = false;
  document.documentElement.classList.add('has-finds');
  sfx.open?.();
  requestAnimationFrame(() => {
    journal.classList.add('is-on');
    drawBar();
  });
  closeBtn.focus({ preventScroll: true });
}

function closeJournal() {
  if (journal.hidden) return;
  sfx.close?.();
  journal.classList.remove('is-on');
  document.documentElement.classList.remove('has-finds');
  setTimeout(() => { journal.hidden = true; }, 200);
}

openBtn.addEventListener('click', openJournal);
toastEl.addEventListener('click', openJournal);
closeBtn.addEventListener('click', closeJournal);
journal.addEventListener('click', (e) => { if (e.target === journal) closeJournal(); });

addEventListener('keydown', (e) => {
  if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
  if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
  if (e.key === 'Escape' && !journal.hidden) {
    e.preventDefault();
    closeJournal();
    return;
  }
  if (e.key.toLowerCase() !== 'j') return;
  if (document.documentElement.classList.contains('amb-lock')) return;
  if (document.querySelector('dialog[open], .amb:not([hidden])')) return;
  e.preventDefault();
  if (journal.hidden) openJournal();
  else closeJournal();
});

/* ---------- unlock ---------- */

export function unlock(id) {
  const a = FINDS[id];
  if (!a || S.got[id]) return false;
  S.got[id] = Date.now();
  save();
  sfx.achieve?.();
  toast(id);
  if (!journal.hidden) paint();
  return true;
}

function note(key) {
  if (S.seen[key]) return false;
  S.seen[key] = 1;
  save();
  return true;
}

/* ---------- site hooks ---------- */

const $ = (s, el = document) => el.querySelector(s);
const html = document.documentElement;
const panel = $('#content');

const waiting = new Map();
const foundProject = (slug) => {
  waiting.delete(slug);
  if (!projects.some((x) => x.slug === slug) || !note(`p:${slug}`)) return;
  if (projects.every((x) => S.seen[`p:${x.slug}`])) unlock('cartographer');
};

const io = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.target.matches('.entry__end')) {
      if (e.isIntersecting) unlock('bottom');
      continue;
    }
    const slug = e.target.dataset.slug;
    if (!slug) continue;
    if (e.isIntersecting && !S.seen[`p:${slug}`] && !waiting.has(slug)) {
      waiting.set(slug, setTimeout(() => foundProject(slug), 1200));
    }
    if (!e.isIntersecting) {
      clearTimeout(waiting.get(slug));
      waiting.delete(slug);
    }
  }
}, { threshold: 0.3 });

const watchPanel = () => {
  io.disconnect();
  waiting.forEach(clearTimeout);
  waiting.clear();
  panel?.querySelectorAll('.entry, .entry__end').forEach((el) => io.observe(el));
};
if (panel) {
  new MutationObserver(watchPanel).observe(panel, { childList: true });
  watchPanel();
}

const route = () => {
  if (location.hash.replace(/^#\/?/, '') === 'info') unlock('info');
};
addEventListener('hashchange', route);
route();

new MutationObserver(() => {
  if (html.classList.contains('has-fit')) {
    unlock('curator');
    unlock('inspect');
    note(`fit:${$('#fit')?.getAttribute('aria-label') || ''}`);
  }
  if (html.classList.contains('is-es')) unlock('hola');
}).observe(html, { attributes: true, attributeFilter: ['class'] });

const fitScroll = $('#fit-scroll');
if (fitScroll) {
  const markFitImages = () => {
    for (const img of fitScroll.querySelectorAll('.fit__frame img[src]')) {
      const src = img.getAttribute('src');
      if (!src || !note(`img:${src}`)) continue;
      const all = (p) => {
        const s = p.slides.filter((x) => x.src);
        return s.length > 1 && s.every((x) => S.seen[`img:${x.src}`]);
      };
      if (projects.some(all)) unlock('gallery');
    }
  };
  new MutationObserver(markFitImages).observe(fitScroll, { childList: true, subtree: true });
}

document.addEventListener('click', (e) => {
  if (e.target.closest?.('a[href^="mailto:"], a[href*="instagram.com"], a[href*="maps"]')) {
    unlock('courier');
  }
}, true);

const toy = $('#toy');
if (toy) {
  new MutationObserver(() => {
    if (toy.getAttribute('aria-pressed') === 'true') unlock('runner');
  }).observe(toy, { attributes: true, attributeFilter: ['aria-pressed'] });
}

const dungeonBtn = $('#dungeon-open');
if (dungeonBtn) {
  new MutationObserver(() => {
    if (dungeonBtn.getAttribute('aria-pressed') === 'true') unlock('delver');
  }).observe(dungeonBtn, { attributes: true, attributeFilter: ['aria-pressed'] });
}

addEventListener('rgs:run', (e) => {
  const metres = Number(e.detail?.metres) || 0;
  if (metres >= 500) unlock('marathon');
});

addEventListener('rgs:ambush-start', () => unlock('idle'));
addEventListener('rgs:ambush-win', (e) => {
  S.kills += 1;
  save();
  unlock('firstblood');
  if (S.kills >= 10) unlock('hunter');
  if (e.detail?.boss) unlock('boss');
});
addEventListener('rgs:ambush-lose', () => unlock('death'));
addEventListener('rgs:ambush-flee', () => unlock('coward'));

/* ---------- quiet arrival ---------- */

const today = new Date().toLocaleDateString('en-CA');
if (!S.days.includes(today)) {
  S.days.push(today);
  if (S.days.length > 30) S.days.shift();
  save();
}

setTimeout(() => {
  unlock('welcome');
  if (S.days.length >= 3) setTimeout(() => unlock('returning'), 25_000);
  const hour = Number(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto', hour: 'numeric', hourCycle: 'h23',
  }).format(new Date()));
  if (hour < 4) setTimeout(() => unlock('nightowl'), 45_000);
}, 35_000);
