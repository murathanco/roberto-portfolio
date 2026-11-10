import { projects, site } from './projects.js';
import { mountLogo } from './logo3d.js';
import { mountFlip } from './flip3d.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const arr = (a) => `<span class="arr">${a}</span>`;
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = matchMedia('(max-width: 900px)');

const panel = $('#content');
const logo = mountLogo($('#logo'));
const mail = `mailto:${site.email}`;
const bySlug = (slug) => projects.find((p) => p.slug === slug) ?? null;

/* ---------- left: it reacts to the project you point at, or the one that is open ---------- */

let current = null;   // the project that is open, if any
let shown;            // the project the left side is showing right now

function react(p = current) {
  if (!p && small.matches) { follow(); return; }
  if (p === shown) return;
  shown = p;
  logo.setPose(p ? projects.indexOf(p) + 1 : 0);
}

// A phone has nothing to point with, so the monogram follows the scroll instead. It holds the pose of whichever
// project is in view, turns toward the next one as that comes up, and rolls a little with every flick.
const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
function follow() {
  shown = undefined;
  const rows = page === 'work' ? $$('.entry', panel) : [];
  const top = $('#stage').getBoundingClientRect().bottom;
  const line = top + (innerHeight - top) * 0.35;
  const i = rows.findLastIndex((el) => el.getBoundingClientRect().top <= line);
  if (i < 0) { logo.setPose(0); return; }
  const box = rows[i].getBoundingClientRect();
  const f = i < rows.length - 1 ? smooth(0.55, 1, (line - box.top) / box.height) : 0;
  logo.setTurn(projects.indexOf(bySlug(rows[i].dataset.slug)) + f);
}
let lastY = scrollY;
addEventListener('scroll', () => {
  const dy = scrollY - lastY;
  lastY = scrollY;
  if (!small.matches) return;
  logo.nudge(dy);
  if (!current) follow();
}, { passive: true });
small.addEventListener('change', () => { shown = undefined; react(); });

const pointed = (e) => e.target.closest('[data-slug]');
const watch = (root) => {
  root.addEventListener('pointerover', (e) => { const el = pointed(e); if (el && e.pointerType === 'mouse') react(bySlug(el.dataset.slug)); });
  root.addEventListener('pointerout', (e) => { const el = pointed(e); if (el && !el.contains(e.relatedTarget)) react(); });
  root.addEventListener('focusin', (e) => { const el = pointed(e); if (el) react(bySlug(el.dataset.slug)); });
  root.addEventListener('focusout', (e) => { if (pointed(e)) react(); });
};
watch(panel);
watch($('.edges'));

// The works frame the right half, the way the old edges did: a run across the top,
// the outer side, and the bottom. Repeated titles get their slug's last letter.
const edgeName = (p) => {
  const shared = projects.filter((x) => x.title === p.title).length > 1;
  return shared ? `${p.title} ${p.slug.slice(-1)}` : p.title;
};
// The stack icon sits just outside the placeholder a box, not in the label.
const flipIcon = `<svg class="flipico" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6"><rect x="0.8" y="1.2" width="7" height="4.8"/><rect x="3.2" y="3.6" width="7" height="4.8"/><rect x="5.6" y="6.1" width="9" height="8"/></g><path fill="currentColor" d="M5.6 6.1h9v1.9h-9z"/></svg>`;
const doorIcon = `<svg class="flipico" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M3.2 14.2h9.6V5.8c0-2.6-2-4-4.8-4s-4.8 1.4-4.8 4v8.4z"/><path fill="currentColor" d="M9.15 8.15h1.45v1.55H9.15z"/></svg>`;
const edgeLink = (p) =>
  `<a class="edge" href="#/${p.slug}" data-slug="${p.slug}" data-c="${p.color}"><span>${esc(edgeName(p))}</span></a>`;
const edgeItem = (p) => {
  const link = edgeLink(p);
  if (p.slug !== 'placeholder-a') return link;
  return `<div class="edgebox" data-slug="${p.slug}"><button class="edgeflip" id="flip-open" type="button" aria-haspopup="dialog" aria-controls="flip" aria-expanded="false" aria-label="Flip through the projects">${flipIcon}</button><button class="edgeflip" id="dungeon-open" type="button" aria-pressed="false" aria-label="Walk the dungeon">${doorIcon}</button>${link}</div>`;
};
const frame = (n) => {
  if (n <= 1) return [n, 0, 0];
  if (n === 2) return [1, 1, 0];
  const top = Math.min(3, n - 2);
  const rest = n - top;
  const side = Math.ceil(rest / 2);
  return [top, side, rest - side];
};
const [topN, sideN] = frame(projects.length);
$('.edges__top').innerHTML = projects.slice(0, topN).map(edgeItem).join('');
$('.edges__side').innerHTML = projects.slice(topN, topN + sideN).map(edgeItem).join('');
$('.edges__foot').innerHTML = projects.slice(topN + sideN).map(edgeItem).join('');
mountFlip(projects, $('#flip-open'));

/* ---------- the left stage can be a chase, or a dungeon you walk ---------- */

const toy = $('#toy');
const dungeonBtn = $('#dungeon-open');
let game = null, booting = false;
let dungeon = null, dungeonBoot = false;
let handoff = false;

function restoreStage() {
  if (game || dungeon || booting || dungeonBoot || handoff) return;
  logo.setAscii(document.body.dataset.page === 'info');
  logo.resume();
}

toy.addEventListener('click', async () => {
  if (game) { game.quit(); return; }
  if (booting) return;
  booting = true;
  let failed = false;
  if (dungeon) handoff = true;
  try {
    if (dungeon) await dungeon.quit();
    const { startGame } = await import('./platformer.js');
    logo.pause();
    logo.setAscii(false);
    game = startGame($('#logo'), {
      onQuit() {
        game = null;
        toy.setAttribute('aria-pressed', 'false');
        restoreStage();
        if (!dungeon && (!document.activeElement || document.activeElement === document.body)) toy.focus({ preventScroll: true });
      },
    });
    toy.setAttribute('aria-pressed', 'true');
  } catch {
    failed = true;
  }
  booting = false;
  handoff = false;
  if (failed) restoreStage();
});

dungeonBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (dungeon) { dungeon.quit(); return; }
  if (dungeonBoot) return;
  dungeonBoot = true;
  let failed = false;
  if (game) handoff = true;
  try {
    if (game) await game.quit();
    const { startDungeon } = await import('./dungeon.js');
    logo.pause();
    logo.setAscii(false);
    dungeon = startDungeon($('#logo'), {
      projects,
      onOpen(slug) { location.hash = `#/${slug}`; },
      onQuit() {
        dungeon = null;
        dungeonBtn.setAttribute('aria-pressed', 'false');
        restoreStage();
        if (!game && (!document.activeElement || document.activeElement === document.body)) dungeonBtn.focus({ preventScroll: true });
      },
    });
    dungeonBtn.setAttribute('aria-pressed', 'true');
  } catch {
    failed = true;
  }
  dungeonBoot = false;
  handoff = false;
  if (failed) restoreStage();
});

/* ---------- Toronto: hover or click, and a Pixel Sea clock tells the local time ---------- */

const place = $('#place');
const placeBox = place.closest('.place');
const tick = $('#tick');
const tickTime = $('#tick-time');
const tickDate = $('#tick-date');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const clockCur = document.createElement('img');
clockCur.className = 'clockcur';
clockCur.dataset.own = '';
clockCur.alt = '';
clockCur.width = 19;
clockCur.height = 19;
clockCur.src = '/icons/clock.gif';
document.body.append(clockCur);

const clockTime = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Toronto', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
});
const clockDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Toronto', weekday: 'short', month: 'short', day: 'numeric',
});
const clockZone = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Toronto', timeZoneName: 'short' });

let clockHold = false;
let clockOver = false;
let clockTimer = 0;

function paintClock() {
  const now = new Date();
  const zone = clockZone.formatToParts(now).find((p) => p.type === 'timeZoneName')?.value ?? 'ET';
  tickTime.textContent = clockTime.format(now);
  tickDate.textContent = `${clockDate.format(now)} · ${zone}`;
}
function runClock(on) {
  if (on) {
    paintClock();
    if (!clockTimer) {
      const again = () => { paintClock(); clockTimer = setTimeout(again, 1000 - (Date.now() % 1000)); };
      clockTimer = setTimeout(again, 1000 - (Date.now() % 1000));
    }
    return;
  }
  clearTimeout(clockTimer);
  clockTimer = 0;
}
function showClock() {
  const on = clockHold || clockOver;
  tick.hidden = !on;
  place.setAttribute('aria-expanded', String(on));
  runClock(on);
}
function aimClock(x, y) {
  clockCur.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}
let clockTouch = 0;
addEventListener('touchstart', () => { clockTouch = Date.now(); }, { passive: true });
placeBox.addEventListener('pointerenter', (e) => {
  if (!finePointer.matches || e.pointerType === 'touch' || Date.now() - clockTouch < 700) return;
  clockOver = true;
  aimClock(e.clientX, e.clientY);
  placeBox.classList.add('is-hot');
  clockCur.classList.add('is-on');
  showClock();
});
placeBox.addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'touch') return;
  clockOver = false;
  placeBox.classList.remove('is-hot');
  clockCur.classList.remove('is-on');
  showClock();
});
addEventListener('pointermove', (e) => {
  if (clockCur.classList.contains('is-on')) aimClock(e.clientX, e.clientY);
}, { passive: true });
place.addEventListener('click', () => {
  clockHold = !clockHold;
  if (!clockHold) clockOver = false;
  showClock();
});
place.addEventListener('focusin', () => { clockOver = true; showClock(); });
place.addEventListener('focusout', () => { clockOver = false; showClock(); });
addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || tick.hidden) return;
  clockHold = false;
  clockOver = false;
  showClock();
});
addEventListener('pointerdown', (e) => {
  if (!clockHold || placeBox.contains(e.target)) return;
  clockHold = false;
  showClock();
});

/* ---------- right: the work list, or the info page. A project never leaves this side. ---------- */

const openIcon = `<svg class="openico" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.6" d="M6.2 2.5H2.5v3.7M9.8 2.5h3.7v3.7M6.2 13.5H2.5V9.8M9.8 13.5h3.7V9.8"/></svg>`;
const fitBtn = (p) =>
  `<button class="entry__open" type="button" data-fit="${p.slug}" aria-label="${esc(p.title)} — open">${openIcon}<span>open</span></button>`;
const specHTML = (p) => {
  const spec = [['client', p.client], ['year', p.year], ['place', p.place], ['work', p.disciplines]];
  return `<dl class="spec">${spec.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
};

function viewWork() {
  const row = (p) => {
    const frames = p.slides.map((s, k) => slideHTML(s, k));
    const intro = p.text[0]
      ? `<div class="entry__intro"><p class="entry__copy">${esc(p.text[0])}</p></div>`
      : '';
    const facts = [p.client, p.year].filter(Boolean);
    // Images only in the strip — the blurb sits above so the work can breathe.
    return `
      <article class="entry" data-slug="${p.slug}" data-c="${p.color}">
        <header class="entry__bar">
          <h2 class="entry__title">${esc(p.title)}</h2>
          ${fitBtn(p)}
          ${facts.length ? `<p class="entry__facts">${facts.map((v) => `<span>${esc(v)}</span>`).join('')}</p>` : ''}
        </header>
        ${intro}
        <div class="entry__stage">
          <div class="strip" tabindex="0" role="region" aria-label="${esc(p.title)}, images. Scroll sideways.">
            ${frames.join('')}
          </div>
        </div>
      </article>`;
  };

  return `
    <section class="index" aria-label="Work">
      ${projects.map(row).join('')}
      <footer class="entry__end">
        <div class="entry__end-page">
          <img class="entry__end-mark" src="/icons/the-end.gif" alt="The End" width="248" height="58" />
          <p class="entry__end-story">You have reached the bottom of the work.</p>
          <p class="entry__end-ask">What will you do?</p>
          <a class="entry__end-choice" href="${mail}">
            <img src="/icons/write.gif" alt="" width="32" height="32" />
            <span>1. Write a letter</span>
          </a>
        </div>
      </footer>
    </section>`;
}

function slideHTML(s, i) {
  if (!s.src) return `
      <div class="slide slide--empty" style="--ar:${(s.w ?? 4) / (s.h ?? 5)}" data-slide>
        ${s.placeholder ? `<span class="tag">${esc(s.placeholder)}, coming soon</span>` : ''}
      </div>`;
  return `
      <figure class="slide" style="--ar:${s.w / s.h}" data-slide>
        <img src="${s.src}" width="${s.w}" height="${s.h}" alt="${esc(s.alt)}" ${i ? 'loading="lazy"' : ''} decoding="async" draggable="false" />
        <figcaption class="tag">${esc(s.caption)}</figcaption>
      </figure>`;
}

// The info page is one ASCII sheet. Escape still steps back.
function viewInfo() {
  const address = site.studio.replace(/^MACEL Studios,\s*/, '');
  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.studio)}`;
  const email = esc(site.email).replace('@', '<wbr>@');
  const row = (href, label, value, extra = '') => `
      <a class="info__row" href="${href}"${extra}>
        <span class="info__label">${label}</span>
        <span class="info__value">${value} ${arr('-&gt;')}</span>
      </a>`;
  return `
    <section class="info" aria-label="Info">
      <h2 class="info__head">info</h2>
      <p class="info__rule" aria-hidden="true"></p>
      <header class="info__hello">
        <p class="info__lead">¡Hola!</p>
        <p class="info__lead">ROBERTO.GS is my creative practice.</p>
        <p class="info__lead">Heartily living through making stuff.</p>
        <p class="info__where">Peacefully residing in Toronto, ON. Working out of MACEL Studios at</p>
      </header>
      ${row(map, 'studio', esc(address), ' target="_blank" rel="noopener"')}
      <p class="info__rule" aria-hidden="true"></p>
      <p class="info__reach">Reachable through</p>
      ${row(mail, 'email', email)}
      ${row(`https://www.instagram.com/${site.instagram}/`, 'instagram', `@${esc(site.instagram)}`, ' target="_blank" rel="noopener"')}
      <p class="info__rule" aria-hidden="true"></p>
      <footer class="info__foot">
        <p>Website brought to life by Murathan Biliktu</p>
        <p>Powered by ______</p>
        <p>Written in BM Fable &amp; Satoshi</p>
        <p class="info__year">2026 (tm)</p>
      </footer>
    </section>`;
}
addEventListener('keydown', (e) => { if (e.key === 'Escape' && page === 'info' && !fitOpen) location.hash = '#/'; });

/* ---------- a project's strip: arrows, arrow keys, or grab and pull ---------- */

let drag = null;

function wire(section) {
  const step = (strip, d) => {
    const slides = $$(':scope > *', strip);
    const x = strip.scrollLeft;
    const lefts = slides.map((el) => el.offsetLeft - strip.offsetLeft);
    const to = d > 0 ? lefts.find((l) => l > x + 2) : lefts.findLast((l) => l < x - 2);
    if (to !== undefined) strip.scrollTo({ left: to, behavior: calm ? 'auto' : 'smooth' });
  };
  section.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    const strip = b?.closest('.project, .entry')?.querySelector('.strip');
    if (strip) step(strip, +b.dataset.step);
  });
  $$('.strip', section).forEach((strip) => {
    strip.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') strip.dataset.moved = '1';
      if (e.key === 'ArrowRight') { step(strip, 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { step(strip, -1); e.preventDefault(); }
    });
    // Mouse only. Trackpads and touch already scroll sideways on their own.
    strip.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse' || e.button || e.target.closest('a, button')) return;
      drag = { strip, x: e.clientX, left: strip.scrollLeft, moved: false };
    });
    const moved = () => { strip.dataset.moved = '1'; };
    strip.addEventListener('wheel', moved, { passive: true });
    strip.addEventListener('touchmove', moved, { passive: true });
    strip.querySelectorAll('img').forEach((img) => {
      if (img.complete) return;
      img.addEventListener('load', () => { if (!strip.dataset.moved && strip.scrollLeft) strip.scrollLeft = 0; }, { once: true });
    });
  });
}
addEventListener('pointermove', (e) => {
  if (!drag) return;
  const dx = e.clientX - drag.x;
  if (!drag.moved && Math.abs(dx) > 4) { drag.moved = true; drag.strip.dataset.moved = '1'; drag.strip.classList.add('is-dragging'); }
  if (drag.moved) drag.strip.scrollLeft = drag.left - dx;
});
let dragged = false;
addEventListener('pointerup', () => {
  dragged = !!drag?.moved;
  drag?.strip.classList.remove('is-dragging');
  drag = null;
});
addEventListener('click', (e) => {
  if (!dragged) return;
  dragged = false;
  e.preventDefault();
  e.stopPropagation();
}, true);

/* ---------- routing: #/ is the work, #/info the info page. A project hash only scrolls to it. ---------- */

let page = null;

let sizing = false;
function sizeRows() {
  if (sizing) return;
  const index = panel.querySelector('.index');
  if (!index) return;
  sizing = true;
  for (const strip of index.querySelectorAll('.strip')) {
    strip.style.height = '';
    // Picture loads can shove a sideways strip off its cover. Stay put until someone actually scrolls it.
    if (!strip.dataset.moved && strip.scrollLeft) strip.scrollLeft = 0;
  }
  sizing = false;
}
addEventListener('resize', sizeRows);

function route(first) {
  const slug = location.hash.replace(/^#\/?/, '');
  const project = bySlug(slug);
  const next = slug === 'info' ? 'info' : 'work';
  const same = next === page && panel.querySelector(next === 'info' ? '.info' : '.index');
  page = next;
  current = null;

  closeFit();
  if (!same) {
    panel.innerHTML = page === 'info' ? viewInfo() : viewWork();
    document.body.dataset.page = page;
    document.title = `${page === 'info' ? 'Info' : 'Work'} — Roberto Gonzalez Sosa`;
    $$('[data-nav]').forEach((a) => {
      if (a.dataset.nav === page) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    if (panel.querySelector('.strip')) wire(panel.firstElementChild);
    sizeRows();
  }
  $$('.edges .edge').forEach((el) => {
    const link = el.matches('a') ? el : el.querySelector('.edge__hit');
    if (project && el.dataset.slug === project.slug) link?.setAttribute('aria-current', 'page');
    else link?.removeAttribute('aria-current');
  });
  if (game || dungeon || booting || dungeonBoot || handoff) logo.setAscii(false);
  else {
    logo.setAscii(page === 'info');
    logo.resume();
  }
  react();

  const target = project && panel.querySelector(`.entry[data-slug="${CSS.escape(project.slug)}"]`);
  if (target) target.scrollIntoView({ behavior: first || calm ? 'auto' : 'smooth', block: 'start' });
  else if (!first) {
    scrollTo({ top: small.matches ? panel.offsetTop : 0, behavior: 'auto' });
    panel.focus({ preventScroll: true });
  }
}
addEventListener('hashchange', () => route(false));
// Clicking the link for the page you are already on takes you back to its top.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#/"]');
  if (a && a.getAttribute('href') === (location.hash || '#/')) route(false);
});

panel.addEventListener('click', (e) => {
  const fitButton = e.target.closest('[data-fit]');
  if (!fitButton) return;
  const project = bySlug(fitButton.dataset.fit);
  if (!project) return;
  e.preventDefault();
  e.stopPropagation();
  openFit(project, fitButton);
});

/* ---------- full size: the project on its own. Every piece fits the screen, the note stays beside them ---------- */

const fit = $('#fit');
const fitScroll = $('#fit-scroll');
const fitClose = $('#fit-close');
let fitOpen = false;
let fitFrom = null;

function fitHTML(p) {
  const total = String(p.slides.length).padStart(2, '0');
  const frames = p.slides.map((s, i) => {
    const ar = (s.w ?? 4) / (s.h ?? 5);
    const pic = s.src
      ? `<img src="${s.src}" width="${s.w}" height="${s.h}" alt="${esc(s.alt)}" ${i > 1 ? 'loading="lazy"' : ''} decoding="async" />`
      : `<div class="fit__empty">${s.placeholder ? '<span class="tag">coming soon</span>' : ''}</div>`;
    const cap = s.src ? s.caption : s.placeholder;
    return `
      <figure class="fit__frame" style="--ar:${ar}">
        ${pic}
        <figcaption class="fit__cap"><span class="fit__num">${String(i + 1).padStart(2, '0')} / ${total}</span>${cap ? ` ${esc(cap)}` : ''}</figcaption>
      </figure>`;
  }).join('');
  return `
    <div class="fit__body">
      <aside class="fit__about" aria-label="About ${esc(p.title)}">
        ${specHTML(p)}
        <div class="fit__copy">${p.text.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
      </aside>
      <div class="fit__frames">${frames}</div>
    </div>`;
}
// Up and down move one whole piece at a time, centred under the bar.
function stepFit(d) {
  const top = $('.fit__bar', fit).getBoundingClientRect().bottom;
  const mid = (top + fit.clientHeight) / 2;
  const centers = $$('.fit__frame', fitScroll).map((el) => {
    const r = el.getBoundingClientRect();
    return { el, c: r.top + r.height / 2 };
  });
  const next = d > 0 ? centers.find((f) => f.c > mid + 4) : centers.findLast((f) => f.c < mid - 4);
  if (next) next.el.scrollIntoView({ block: 'center', behavior: calm ? 'auto' : 'smooth' });
  else fit.scrollTo({ top: d > 0 ? fit.scrollHeight : 0, behavior: calm ? 'auto' : 'smooth' });
}
function openFit(p, from) {
  fitScroll.innerHTML = fitHTML(p);
  fit.dataset.c = p.color;
  $('#fit-title').textContent = p.title;
  $('#fit-meta').innerHTML = `<span>${esc(p.client)}</span><span>${esc(p.year)}</span>`;
  fit.hidden = false;
  fit.scrollTop = 0;
  document.documentElement.classList.add('has-fit');
  fitOpen = true;
  fitFrom = from;
  fitClose.focus();
}
function closeFit() {
  if (!fitOpen) return;
  fit.hidden = true;
  fitScroll.innerHTML = '';
  document.documentElement.classList.remove('has-fit');
  fitOpen = false;
  const back = fitFrom;
  fitFrom = null;
  back?.focus({ preventScroll: true });
}
fitClose.addEventListener('click', closeFit);
addEventListener('hashchange', closeFit);
addEventListener('keydown', (e) => {
  if (!fitOpen) return;
  if (e.key === 'Escape') { e.preventDefault(); closeFit(); }
  if (e.key === 'Tab') { e.preventDefault(); fitClose.focus(); }
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); stepFit(e.key === 'ArrowDown' ? 1 : -1); }
});

route(true);
