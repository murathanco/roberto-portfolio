import { projects, site } from '../projects.js';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n, total) => `${String(n).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

// Shorter, client-facing blurbs for this private view only.
const blurbs = {
  'dress-loud':
    'Identity, illustration and campaign materials for Dress Loud, an awareness event for Deaf and hard of hearing kids hosted by Voice for Deaf Kids.',
};

const selected = projects.filter((p) => p.slides?.some((s) => s.src));

$('#year').textContent = String(new Date().getFullYear());

const list = $('#work-list');
list.innerHTML = selected.map((p, i) => {
  const images = p.slides.filter((s) => s.src);
  const pending = p.slides.filter((s) => !s.src && s.placeholder).length;
  const cover = images.slice(0, 3);
  const blurb = blurbs[p.slug] ?? p.text?.[0] ?? '';
  const shots = cover.map((s, k) => `
    <figure class="shot">
      <button type="button" data-open="${i}:${k}" aria-label="Enlarge: ${esc(s.caption || p.title)}">
        <img src="${s.src}" width="${s.w}" height="${s.h}" alt="${esc(s.alt || '')}" ${k ? 'loading="lazy"' : ''} decoding="async" />
      </button>
      <figcaption>${esc(s.caption || '')}</figcaption>
    </figure>`).join('');

  return `
    <article class="project" id="${esc(p.slug)}">
      <div class="project__meta">
        <p class="project__eyebrow">${pad(i + 1, selected.length)}</p>
        <h3 class="project__title">${esc(p.title)}</h3>
        <p class="project__client">${esc(p.client)} · ${esc(p.year)}</p>
        ${blurb ? `<p class="project__text">${esc(blurb)}</p>` : ''}
        <p class="project__specs">
          <span>${esc(p.place)}</span>
          <span>${esc(p.disciplines)}</span>
        </p>
      </div>
      <div class="project__gallery">${shots}</div>
      ${pending ? `<p class="project__more">Additional deliverables available on request.</p>` : ''}
    </article>`;
}).join('');

const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.studio)}`;
const address = site.studio.replace(/^MACEL Studios,\s*/, '');
$('#contact-list').innerHTML = `
  <li>
    <a href="mailto:${esc(site.email)}">
      <span class="label">Email</span>
      <span class="value">${esc(site.email)}</span>
      <span class="go" aria-hidden="true">→</span>
    </a>
  </li>
  <li>
    <a href="https://www.instagram.com/${esc(site.instagram)}/" target="_blank" rel="noopener">
      <span class="label">Instagram</span>
      <span class="value">@${esc(site.instagram)}</span>
      <span class="go" aria-hidden="true">→</span>
    </a>
  </li>
  <li>
    <a href="${map}" target="_blank" rel="noopener">
      <span class="label">Studio</span>
      <span class="value">${esc(address)}</span>
      <span class="go" aria-hidden="true">→</span>
    </a>
  </li>`;

/* ---------- sticky header state ---------- */

const top = $('.top');
const syncTop = () => top.classList.toggle('is-scrolled', scrollY > 8);
syncTop();
addEventListener('scroll', syncTop, { passive: true });

/* ---------- image viewer ---------- */

const viewer = $('#viewer');
const viewerImg = $('#viewer-img');
const viewerCap = $('#viewer-cap');
let pack = [];
let at = 0;

const albums = selected.map((p) => p.slides.filter((s) => s.src));

function show(i) {
  at = (i + pack.length) % pack.length;
  const s = pack[at];
  viewerImg.src = s.src;
  viewerImg.width = s.w;
  viewerImg.height = s.h;
  viewerImg.alt = s.alt || '';
  viewerCap.textContent = s.caption || '';
}

function open(album, index) {
  pack = album;
  show(index);
  viewer.hidden = false;
  document.body.style.overflow = 'hidden';
  $('#viewer-close').focus();
}

function close() {
  viewer.hidden = true;
  document.body.style.overflow = '';
  pack = [];
}

list.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-open]');
  if (!btn) return;
  const [pi, si] = btn.dataset.open.split(':').map(Number);
  open(albums[pi], si);
});

$('#viewer-close').addEventListener('click', close);
$('#viewer-prev').addEventListener('click', () => show(at - 1));
$('#viewer-next').addEventListener('click', () => show(at + 1));
viewer.addEventListener('click', (e) => { if (e.target === viewer) close(); });

addEventListener('keydown', (e) => {
  if (viewer.hidden) return;
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowLeft') show(at - 1);
  if (e.key === 'ArrowRight') show(at + 1);
});
