import { projects, site } from './projects.js';
import { mountLogo, monogramSVG } from './logo3d.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const arr = (a) => `<span class="arr">${a}</span>`;

const panel = $('#content');
const logo = mountLogo($('#logo'));
const live = projects.filter((p) => !p.draft);
const numberOf = (p) => pad(projects.indexOf(p) + 1);

/* ---------- left: the projects as a little flow of sticky notes ---------- */

$('#list').innerHTML = `<li><a class="note note--start" href="#/"><i>top</i></a></li>` + projects.map((p, n) => {
  const inner = `<b>${numberOf(p)}</b><i>${esc(p.title)}</i>`;
  return p.draft
    ? `<li><span class="note is-soon" data-slug="${p.slug}">${inner}<em>soon</em></span></li>`
    : `<li><a class="note${n % 2 ? ' note--alt' : ''}" href="#/${p.slug}" data-slug="${p.slug}">${inner}</a></li>`;
}).join('');

/* ---------- right: the work, each project one sideways strip ---------- */

function projectHTML(p) {
  const n = numberOf(p);
  if (p.draft) return `
    <section class="project is-soon" id="${p.slug}" data-slug="${p.slug}">
      <header class="head">
        <h2><b>${n}</b>${esc(p.title)}</h2>
        <p class="head__meta">Coming soon</p>
      </header>
    </section>`;

  const images = p.slides.filter((s) => s.src);
  const slides = p.slides.map((s, i) => s.src ? `
      <figure class="slide" style="--ar:${s.w / s.h}" data-slide>
        <img src="${s.src}" width="${s.w}" height="${s.h}" alt="${esc(s.alt)}" ${i ? 'loading="lazy"' : ''} decoding="async" draggable="false" />
        <button class="plus" type="button" data-open="${images.indexOf(s)}" aria-label="Enlarge: ${esc(s.caption)}">+</button>
        <figcaption>${esc(s.caption)}</figcaption>
      </figure>` : `
      <div class="slide slide--soon" data-slide>
        <span class="cap"><b>${pad(i + 1)}</b><span>Coming soon</span></span>
        <span class="big">${esc(s.placeholder)}</span>
      </div>`);
  // The words sit in the strip right after the first image: you read them on the way past.
  slides.splice(1, 0, `
      <div class="text" tabindex="0" role="region" aria-label="About ${esc(p.title)}">
        ${p.text.map((t) => `<p>${esc(t)}</p>`).join('')}
        <p class="credit">${esc(p.client)}<br />${esc(p.place)}, ${esc(p.year)}</p>
      </div>`);

  return `
    <section class="project" id="${p.slug}" data-slug="${p.slug}">
      <header class="head">
        <h2><b>${n}</b>${esc(p.title)}</h2>
        <p class="head__meta">${esc(p.client)}, ${esc(p.year)}<span>${esc(p.disciplines)}</span></p>
        <div class="head__ctrl">
          <span class="count" aria-live="polite"><b>1</b> / ${p.slides.length}</span>
          <button type="button" data-step="-1" aria-label="Previous image">${arr('←')}</button>
          <button type="button" data-step="1" aria-label="Next image">${arr('→')}</button>
        </div>
      </header>
      <div class="strip" tabindex="-1">${slides.join('')}</div>
    </section>`;
}

function viewWork() {
  return `
    <section class="hello">
      <p>¡Hola! ROBERTO.GS is my creative practice. Heartily living through making stuff, peacefully residing in Toronto, ON. Scroll each project sideways, or <a href="mailto:${site.email}">say hi</a>.</p>
    </section>
    ${projects.map(projectHTML).join('')}
    <div class="wall">
      <a class="tile" href="mailto:${site.email}" data-bg="cobalt">
        <span class="cap"><b>@</b><span>Contact</span><em>${site.email}</em></span>
        <span class="big">say hi</span>
      </a>
      <a class="tile" href="#/info" data-bg="mist">
        <span class="cap"><b>¡!</b><span>Info</span><em>About ${arr('→')}</em></span>
        <img class="tile__doodle" src="/doodle.svg" alt="" />
      </a>
    </div>`;
}

function viewInfo() {
  return `
    <section class="hello hello--info">
      <div class="mark">${monogramSVG()}</div>
      <p>¡Hola! ROBERTO.GS is my creative practice. Heartily living through making stuff. Peacefully residing in Toronto, ON.</p>
    </section>
    <div class="wall">
      <div class="tile" data-bg="mist">
        <span class="cap"><b>01</b><span>Studio</span><em>Come by</em></span>
        <span class="say">${esc(site.studio)}</span>
      </div>
      <a class="tile" href="mailto:${site.email}" data-bg="cobalt">
        <span class="cap"><b>02</b><span>Email</span><em>Write ${arr('→')}</em></span>
        <span class="say">${site.email}</span>
      </a>
      <a class="tile" href="https://www.instagram.com/${site.instagram}/" target="_blank" rel="noopener" data-bg="ink">
        <span class="cap"><b>03</b><span>Instagram</span><em>Follow ${arr('→')}</em></span>
        <span class="big">@${site.instagram}</span>
      </a>
      <div class="tile" data-bg="mist">
        <span class="cap"><b>04</b><span>Site</span><em>2026™</em></span>
        <span class="say">Brought to life by Murathan Biliktu. Written in Inter.</span>
      </div>
      <a class="tile tile--wide tile--back" href="#/" data-bg="ink"><span class="big">${arr('←')} back to the work</span></a>
    </div>`;
}

/* ---------- one strip ---------- */

function wire(section) {
  const strip = $('.strip', section);
  if (!strip) return;
  const slides = $$('[data-slide]', strip);
  const count = $('.count b', section);
  let current = 0;

  const left = (el) => el.offsetLeft - strip.offsetLeft;
  const go = (i) => strip.scrollTo({ left: left(slides[Math.max(0, Math.min(slides.length - 1, i))]), behavior: 'smooth' });
  const update = () => {
    const end = strip.scrollLeft >= strip.scrollWidth - strip.clientWidth - 2;
    let best = 0, dist = Infinity;
    slides.forEach((s, i) => { const d = Math.abs(left(s) - strip.scrollLeft); if (d < dist) { dist = d; best = i; } });
    if (end) best = slides.length - 1;
    if (best !== current) { current = best; count.textContent = best + 1; }
  };
  let raf = 0;
  strip.addEventListener('scroll', () => { raf ||= requestAnimationFrame(() => { raf = 0; update(); }); }, { passive: true });

  section.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (b) go(current + +b.dataset.step);
  });
  section.addEventListener('keydown', (e) => {
    if (e.target.closest('.text')) return;
    if (e.key === 'ArrowRight') { go(current + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { go(current - 1); e.preventDefault(); }
  });

  // Mouse: grab and pull. (Trackpads and touch already scroll sideways on their own.)
  let down = null, moved = false;
  strip.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button || e.target.closest('.text, .plus')) return;
    down = { x: e.clientX, left: strip.scrollLeft }; moved = false;
  });
  addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - down.x;
    if (Math.abs(dx) > 4 && !moved) { moved = true; strip.classList.add('is-dragging'); }
    if (moved) strip.scrollLeft = down.left - dx;
  });
  addEventListener('pointerup', () => {
    if (!down) return;
    down = null;
    strip.classList.remove('is-dragging');
  });
}

/* ---------- routing ---------- */

let page = null;
let io = null;
const notes = () => $$('#list .note[data-slug]');
const setActive = (slug) => {
  notes().forEach((a) => a.toggleAttribute('aria-current', a.dataset.slug === slug));
  const i = projects.findIndex((p) => p.slug === slug);
  logo.setPose(i < 0 ? 0 : i + 1);
};

function route(first) {
  const slug = location.hash.replace(/^#\/?/, '');
  const next = slug === 'info' ? 'info' : 'work';
  if (next !== page) {
    page = next;
    io?.disconnect();
    panel.innerHTML = page === 'info' ? viewInfo() : viewWork();
    document.body.dataset.page = page;
    document.title = `${page === 'info' ? 'Info' : 'Work'} — Roberto Gonzalez Sosa`;
    $$('[data-nav]').forEach((a) => a.toggleAttribute('aria-current', a.dataset.nav === page));
    setActive(null);
    if (page === 'work') {
      $$('.project', panel).forEach(wire);
      io = new IntersectionObserver((entries) => {
        entries.forEach((en) => en.isIntersecting && setActive(en.target.dataset.slug));
      }, { rootMargin: '-40% 0px -55% 0px' });
      $$('.project', panel).forEach((el) => io.observe(el));
    }
    if (!first) scrollTo({ top: 0, behavior: 'auto' });
  }
  const target = page === 'work' && slug ? document.getElementById(slug) : null;
  if (target) target.scrollIntoView({ behavior: first ? 'auto' : 'smooth', block: 'start' });
  else if (!first && page === 'work') scrollTo({ top: 0, behavior: 'smooth' });
  else if (!first && matchMedia('(max-width: 900px)').matches) scrollTo({ top: panel.offsetTop, behavior: 'auto' });
}
addEventListener('hashchange', () => route(false));
// Clicking the note you are already on should still take you there.
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#/"]');
  if (a && a.getAttribute('href') === (location.hash || '#/')) route(false);
});
route(true);

/* ---------- viewer: one image, big ---------- */

const viewer = $('#viewer');
const vBody = $('#viewer-body');
let v = null;

function show() {
  const s = v.list[v.k];
  vBody.innerHTML = `<img src="${s.src}" width="${s.w}" height="${s.h}" alt="${esc(s.alt)}" />`;
  $('#viewer-count').textContent = `${v.p.title} — ${s.caption} — ${v.k + 1} of ${v.list.length}`;
}
const step = (d) => { v.k = (v.k + d + v.list.length) % v.list.length; show(); };
function open(p, k, from) {
  v = { p, list: p.slides.filter((s) => s.src), k, from };
  viewer.hidden = false;
  document.documentElement.classList.add('has-viewer');
  show();
  vBody.focus();
}
function close() {
  if (!v) return;
  viewer.hidden = true;
  document.documentElement.classList.remove('has-viewer');
  v.from?.focus({ preventScroll: true });
  v = null;
}
panel.addEventListener('click', (e) => {
  const b = e.target.closest('[data-open]');
  if (b) open(live.find((p) => p.slug === b.closest('.project').dataset.slug), +b.dataset.open, b);
});
vBody.addEventListener('click', () => step(1));
$('#viewer-next').addEventListener('click', () => step(1));
$('#viewer-prev').addEventListener('click', () => step(-1));
$('#viewer-close').addEventListener('click', close);
addEventListener('hashchange', close);
addEventListener('keydown', (e) => {
  if (!v) return;
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowRight') step(1);
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === 'Tab') {            // keep focus inside the viewer
    const f = $$('button', viewer);
    const i = f.indexOf(document.activeElement);
    e.preventDefault();
    f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
  }
});
