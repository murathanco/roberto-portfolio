import './mexico.css';
import { projects, site } from './projects.js';

// Rest on the monogram and a few sticky notes get tossed onto the other side of the page. Rest there a bit longer and
// the cursor turns into a waving flag: Mexico's, to open the Spanish side, or Canada's, to come back to English.
// Click and the site offers the switch: the layout mirrors, the copy turns, and the monogram grows a tilde.

const $ = (s, el = document) => el.querySelector(s);
const root = document.documentElement;
const logoEl = $('#logo');
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)');
const rnd = (a, b) => a + Math.random() * (b - a);
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

let lang = 'en';

/* ---------- words ---------- */

const STR = {
  en: {
    studio: 'studio', hi: 'say hi', latest: 'latest',
    ask: 'Want to see my Mexican side?', yes: 'Yes', no: 'No',
    sulk: ['why not? :(', 'okay...'],
  },
  es: {
    studio: 'estudio', hi: 'salúdame', latest: 'lo último',
    ask: '¿Volvemos al inglés?', yes: 'Sí', no: 'No',
  },
};

// English as it appears on the page, and its Spanish. Anything missing stays in English.
const ES = {
  'Skip to content': 'Saltar al contenido',
  work: 'trabajo', contact: 'contacto', Work: 'Trabajo',
  'Your Sharp Associate': 'Tu Socio Avispado',
  Projects: 'Proyectos', Site: 'Sitio',
  'all work': 'todo el trabajo', 'next up': 'sigue', 'open project': 'abrir proyecto',
  open: 'abrir',
  'Previous image': 'Imagen anterior', 'Next image': 'Imagen siguiente', 'Image viewer': 'Visor de imágenes',
  previous: 'anterior', next: 'siguiente', close: 'cerrar', Enlarge: 'Ampliar',
  'images. Scroll sideways.': 'imágenes. Desliza de lado.', 'coming soon': 'próximamente',
  Placeholder: 'Provisional',
  'Placeholder a': 'Provisional a', 'Placeholder b': 'Provisional b', 'Placeholder c': 'Provisional c',
  'Placeholder d': 'Provisional d', 'Placeholder e': 'Provisional e',
  Year: 'Año', Client: 'Cliente', Place: 'Lugar', Discipline: 'Disciplina',
  client: 'cliente', year: 'año', place: 'lugar',
  'A few lines about the project go here: what it was, who it was for, and what got made.':
    'Aquí van unas líneas sobre el proyecto: qué fue, para quién fue y qué se hizo.',
  'Brand Design': 'Diseño de marca', Illustration: 'Ilustración', Photography: 'Fotografía', 'Public Speaking': 'Oratoria',
  Poster: 'Póster', Headline: 'Titular', detail: 'detalle', Logotype: 'Logotipo',
  'Banners & badges': 'Pancartas e insignias', Presentation: 'Presentación',
  Studio: 'Estudio', Email: 'Correo', studio: 'estudio', email: 'correo', instagram: 'instagram',
  '¡Hola! ROBERTO.GS is my creative practice. Heartily living through making stuff. Peacefully residing in Toronto, ON.':
    '¡Hola! ROBERTO.GS es mi práctica creativa. Viviendo con todo el corazón haciendo cosas. Residiendo en paz en Toronto, ON.',
  'Brought to life by Murathan Biliktu. Written in Inter.': 'Le dio vida Murathan Biliktu. Escrito en Inter.',
  'ROBERTO.GS is my creative practice.': 'ROBERTO.GS es mi práctica creativa.',
  'Heartily living through making stuff.': 'Viviendo con todo el corazón haciendo cosas.',
  'Peacefully residing in Toronto, ON. Working out of MACEL Studios at': 'Residiendo en paz en Toronto, ON. Trabajando desde MACEL Studios en',
  'Reachable through': 'Me encuentras en',
  'Website brought to life by Murathan Biliktu': 'Sitio web al que le dio vida Murathan Biliktu',
  'Powered by ______': 'Impulsado por ______',
  'Written in BM Fable & Satoshi': 'Escrito en BM Fable y Satoshi',
  'Back to work': 'Volver al trabajo',
  'Play the platformer': 'Jugar al de plataformas', Platformer: 'Juego de plataformas', quit: 'salir',
  'move: arrows or wasd · jump: space · look: drag or q e · quit: esc':
    'moverse: flechas o wasd · saltar: espacio · mirar: arrastra o q e · salir: esc',
  'move: left side · jump: tap right side · look: drag right side':
    'moverse: lado izquierdo · saltar: toca el lado derecho · mirar: arrastra el lado derecho',
  'The logo ran off. Go get it!': 'El logo se escapó. ¡Ve por él!', 'splash!': '¡splash!',
  'You got the logo back!': '¡Recuperaste el logo!', 'little logos': 'logitos', Again: 'Otra vez', Done: 'Listo',
  '¡Hola! ROBERTO.GS is my creative practice. Heartily living through making stuff. Peacefully residing in Toronto, ON. I work across brand design, editorial, illustration and photography.':
    '¡Hola! ROBERTO.GS es mi práctica creativa. Viviendo con todo el corazón haciendo cosas. Residiendo en paz en Toronto, ON. Trabajo entre diseño de marca, editorial, ilustración y fotografía.',
  'Recently,': 'Hace poco,',
  'for Voice for Deaf Kids. An identity, posters, photographs and presentations about being bold and embracing the colors of a unique world.':
    'para Voice for Deaf Kids. Una identidad, pósters, fotografías y presentaciones sobre ser audaz y abrazar los colores de un mundo único.',
  'please feel free to': 'no dudes en', write: 'escribirme',
  'This past May, I had the opportunity to volunteer for #DressLoud, an event that brings awareness for children who are Deaf and Hard of Hearing hosted by @voice4deafkids.':
    'El mayo pasado tuve la oportunidad de ser voluntario en #DressLoud, un evento organizado por @voice4deafkids que crea conciencia sobre las niñas y los niños Sordos o con hipoacusia.',
  'This project was immensely fun, rewarding, challenging and scary all at the same time. It was the first time I was able to label myself as a graphic designer out in the real world, and the first time I wasn’t afraid to be happy with the work I was producing. I was tasked with creating an image and a language for the event from scratch, which meant we got a lot of range with where we wanted to take it.':
    'Este proyecto fue inmensamente divertido, gratificante, retador y aterrador, todo al mismo tiempo. Fue la primera vez que pude llamarme diseñador gráfico en el mundo real, y la primera vez que no tuve miedo de estar contento con lo que estaba haciendo. Me tocó crear una imagen y un lenguaje para el evento desde cero, así que tuvimos mucho margen para llevarlo a donde quisiéramos.',
  'Here’s what I made! All are original illustrations (colored by the wonderful @poofy_itsme), photographs, posters, banners, badges and presentations made by yours truly! All with a brand new image that I feel captures the meaning of Dress Loud, of being bold and embracing the colors of a unique world. I have learned so much from being one half in an interabled relationship, so spreading the word through this platform felt personal and important.':
    '¡Esto es lo que hice! Ilustraciones originales (coloreadas por la maravillosa @poofy_itsme), fotografías, pósters, pancartas, insignias y presentaciones, todo hecho por su servidor. Todo con una imagen nueva que siento que captura el significado de Dress Loud: ser audaz y abrazar los colores de un mundo único. He aprendido muchísimo siendo la mitad de una pareja con capacidades distintas, así que correr la voz desde esta plataforma se sintió personal e importante.',
  'Dress Loud poster: four illustrated kids climbing over each other on a pink-to-violet gradient, with the headline “A month for self-expression and social inclusion for deaf and hard of hearing kids”.':
    'Póster de Dress Loud: cuatro niños ilustrados trepando unos sobre otros en un degradado de rosa a violeta, con el titular “Un mes de autoexpresión e inclusión social para niños sordos y con hipoacusia”.',
  'Detail of the poster headline, bold sans mixed with an italic serif.': 'Detalle del titular del póster: una sans gruesa mezclada con una serif itálica.',
  'Detail of the illustrated figures: a kid in a power wheelchair pointing ahead, another in a red turban.':
    'Detalle de las figuras ilustradas: un niño en silla de ruedas eléctrica señalando al frente, otro con un turbante rojo.',
  'Detail of the Dress Loud! logotype in navy with a gradient second line.': 'Detalle del logotipo de Dress Loud! en azul marino con una segunda línea en degradado.',
};

// Whole strings first; failing that, the pieces of "Dress Loud, Poster", "Client · Year · Place" or "(Discipline)".
function tr(s) {
  const [, lead, t, tail] = s.match(/^(\s*)([\s\S]*?)(\s*)$/);
  if (!t) return s;
  const out = ES[t] ?? t.split(/(, | — |: | · |\(|\))/).map((p) => ES[p] ?? p).join('');
  return lead + out + tail;
}

/* ---------- translating the page, and putting the English back ---------- */

const englishText = new WeakMap();
const englishAttr = new WeakMap();
const ATTRS = ['aria-label', 'alt'];
const mine = (el) => el?.closest('[data-own]');

function translatePage() {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    const el = n.parentElement;
    if (!el || mine(el) || el.closest('script, style')) continue;
    const saved = englishText.get(n);
    const en = saved != null && tr(saved) === n.nodeValue ? saved : n.nodeValue;
    const out = tr(en);
    englishText.set(n, en);
    if (n.nodeValue !== out) n.nodeValue = out;
  }
  for (const el of root.querySelectorAll('[aria-label], [alt]')) {
    if (mine(el)) continue;
    const saved = englishAttr.get(el) ?? {};
    for (const a of ATTRS) {
      const cur = el.getAttribute(a);
      if (cur == null) continue;
      const en = saved[a] != null && tr(saved[a]) === cur ? saved[a] : cur;
      saved[a] = en;
      const out = tr(en);
      if (cur !== out) el.setAttribute(a, out);
    }
    englishAttr.set(el, saved);
  }
}

function restorePage() {
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n; (n = walk.nextNode());) {
    const en = englishText.get(n);
    if (en != null && tr(en) === n.nodeValue) n.nodeValue = en;
    englishText.delete(n);
  }
  for (const el of root.querySelectorAll('[aria-label], [alt]')) {
    const saved = englishAttr.get(el);
    if (!saved) continue;
    for (const a of ATTRS) if (saved[a] != null && tr(saved[a]) === el.getAttribute(a)) el.setAttribute(a, saved[a]);
    englishAttr.delete(el);
  }
}

// The page keeps re-rendering as you move around, so keep translating whatever shows up.
new MutationObserver(() => { if (lang === 'es') translatePage(); })
  .observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });

/* ---------- the notes, stuck on the right side ---------- */

const table = document.createElement('div');
table.className = 'slips';
table.dataset.own = '';
document.body.append(table);

const latest = projects.find((p) => p.slides.some((s) => s.src));
// The address is one string. Break it where a person would: the studio, the street, then the city.
const studioLines = () => {
  const [name, street, city, ...rest] = site.studio.split(', ');
  return (rest.length ? [name, street, `${city}, ${rest.join(', ')}`] : site.studio.split(', ')).join('<br>');
};
// The whole note is the link, so the words stay plain and the paper is what you press.
const note = (href, body) => {
  const extra = href.startsWith('http') ? ' target="_blank" rel="noopener"' : '';
  return `<a class="slip__paper paper" href="${href}"${extra}>${body}</a>`;
};
const CARDS = [
  (L) => note(`mailto:${site.email}`, `<span class="slip__k">${L.hi}</span><span class="slip__v">${site.email.replace('@', '<wbr>@')}</span>`),
  (L) => note(`https://maps.google.com/?q=${encodeURIComponent(site.studio)}`, `<span class="slip__k">${L.studio}</span><span class="slip__v">${studioLines()}</span>`),
  () => note(`https://www.instagram.com/${site.instagram}/`, `<span class="slip__k">instagram</span><span class="slip__v">@${site.instagram}</span>`),
  latest && ((L) => note(`#/${latest.slug}`, `<span class="slip__k">${L.latest}</span><span class="slip__v">${latest.title}, ${latest.year}</span>`)),
].filter(Boolean);
// The far edge of the screen from the monogram, where the notes come in from and leave by.
const outerEdge = () => (lang === 'es' ? -1 : 1);
const T = ({ x, y, r, ax = 0, ay = 0, s = 1 }) => `translate(${x}px, ${y}px) rotate(${r}deg) rotateX(${ax}deg) rotateY(${ay}deg) scale(${s})`;
const cards = new Map();   // element -> where it rests: { x, y, r, w, h }
let dealt = false;
let z = 1;

function deal() {
  if (dealt) return;
  dealt = true;
  const box = table.getBoundingClientRect();
  const outer = outerEdge();
  const placed = [];
  const pool = shuffle([...CARDS]);

  for (let i = 0; i < pool.length; i++) {
    const html = pool[i];
    const el = document.createElement('div');
    el.className = 'slip';
    el.innerHTML = html(STR[lang]);
    table.append(el);
    const w = el.offsetWidth, h = el.offsetHeight;

    // Of a few dozen random spots, take the one furthest from the notes already down: scattered, never stacked.
    const left = 28, top = 28;
    const spanX = Math.max(0, box.width - w - 56), spanY = Math.max(0, box.height - h - 56);
    let best = null, bestD = -1;
    for (let k = 0; k < 40; k++) {
      const x = left + Math.random() * spanX, y = top + Math.random() * spanY;
      const d = placed.length ? Math.min(...placed.map((p) => Math.hypot(p.x - x, p.y - y))) : 0;
      if (d > bestD) { bestD = d; best = { x, y }; }
    }
    placed.push(best);
    const s = { ...best, r: rnd(0.4, 2.2) * (Math.random() < 0.5 ? -1 : 1), w, h };
    cards.set(el, s);
    el.style.zIndex = ++z;
    el.style.transform = T(s);

    if (calm) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, delay: i * 60, fill: 'backwards' }); continue; }

    // Tossed in from off the edge of the screen: airborne and close to you, it floats down, lands, skids a touch, sticks.
    const fromSide = Math.random() < 0.45;
    const x0 = fromSide ? (outer < 0 ? -w - rnd(60, 160) : box.width + rnd(60, 160)) : s.x + rnd(-160, 160);
    const y0 = fromSide ? s.y + rnd(-120, 160) : box.height + rnd(60, 180);
    const len = Math.hypot(s.x - x0, s.y - y0) || 1;
    const skid = { x: s.x + ((s.x - x0) / len) * 14, y: s.y + ((s.y - y0) / len) * 14 };
    el.animate([
      { transform: T({ x: x0, y: y0, r: s.r + rnd(-38, 38), ax: rnd(14, 26), ay: rnd(-18, 18), s: 1.16 }), '--lift': 3, easing: 'cubic-bezier(.18, .7, .28, 1)' },
      { offset: 0.74, transform: T({ ...skid, r: s.r - Math.sign(s.r) * 1.5 }), '--lift': 0, easing: 'cubic-bezier(.35, 0, .25, 1)' },
      { transform: T(s), '--lift': 0 },
    ], { duration: rnd(420, 500), delay: i * 50 + rnd(0, 16), fill: 'backwards' });
  }
}

function gather() {
  if (!dealt) return;
  dealt = false;
  flag(false);
  const box = table.getBoundingClientRect();
  const outer = outerEdge();
  [...cards].forEach(([el, s], i) => {
    cards.delete(el);
    el.style.pointerEvents = 'none';
    if (calm) { el.remove(); return; }
    // Peeled off, then flicked away the way it came — short so they clear out of the way.
    const x1 = outer < 0 ? -s.w - rnd(80, 200) : box.width + rnd(80, 200);
    const y1 = s.y + rnd(40, 220);
    el.animate([
      { transform: T(s), '--lift': 0 },
      { offset: 0.22, transform: T({ ...s, y: s.y - 8, s: 1.04 }), '--lift': 1.4, easing: 'cubic-bezier(.55, 0, .8, .35)' },
      { transform: T({ x: x1, y: y1, r: s.r + rnd(-30, 30), s: 1.06 }), '--lift': 2.2 },
    ], { duration: 280, delay: i * 22, fill: 'forwards', easing: 'cubic-bezier(.35, 0, .55, 1)' })
      .finished.then(() => el.remove(), () => el.remove());
  });
}

function clearTable() {
  dealt = false;
  cards.clear();
  table.replaceChildren();
}

/* ---------- picking a card up and putting it down somewhere else ---------- */

let held = null;
table.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.slip');
  if (!el || e.button || !cards.has(el)) return;
  const s = cards.get(el);
  el.getAnimations().forEach((a) => a.finish());
  held = { el, s, id: e.pointerId, sx: e.clientX, sy: e.clientY, x: s.x, y: s.y, lastX: e.clientX, tilt: 0, moved: false };
  el.style.zIndex = ++z;
  el.classList.add('is-held');
  el.setPointerCapture(e.pointerId);
});
table.addEventListener('pointermove', (e) => {
  if (!held || e.pointerId !== held.id) return;
  const dx = e.clientX - held.sx, dy = e.clientY - held.sy;
  if (!held.moved && Math.hypot(dx, dy) < 4) return;
  held.moved = true;
  const box = table.getBoundingClientRect();
  const { s } = held;
  s.x = Math.min(box.width - s.w * 0.4, Math.max(-s.w * 0.6, held.x + dx));
  s.y = Math.min(box.height - s.h * 0.4, Math.max(-s.h * 0.2, held.y + dy));
  // Paper drags a little behind your hand, so it leans into the move.
  held.tilt += (Math.max(-14, Math.min(14, (e.clientX - held.lastX) * 0.9)) - held.tilt) * 0.25;
  held.lastX = e.clientX;
  held.el.style.transform = T({ ...s, r: s.r + held.tilt });
});
const putDown = (e) => {
  if (!held || e.pointerId !== held.id) return;
  const { el, s, tilt, moved } = held;
  held = null;
  el.classList.remove('is-held');
  if (!moved) return;
  const from = T({ ...s, r: s.r + tilt });
  s.r += tilt * 0.4;
  el.style.transform = T(s);
  if (!calm) el.animate([{ transform: from }, { transform: T(s) }], { duration: 420, easing: 'cubic-bezier(.3, 1.45, .5, 1)' });
  el.addEventListener('click', (c) => { c.preventDefault(); c.stopPropagation(); }, { capture: true, once: true });
};
table.addEventListener('pointerup', putDown);
table.addEventListener('pointercancel', putDown);

/* ---------- the flag cursor ---------- */

// The flag on the cursor is the side you're about to open. The leaf is a few fat lobes, so it still reads as a maple at cursor size.
const MAPLE = 'M0 -11.2L2.6 -4.4L4.5 -7.6L3.8 -2.6L8.8 -0.2L3.6 1.8L5.6 4L1.5 2.4L1.15 2L1.05 6.6L-1.05 6.6L-1.15 2L-1.5 2.4L-5.6 4L-3.6 1.8L-8.8 -0.2L-3.8 -2.6L-4.5 -7.6L-2.6 -4.4Z';

function flagSVG(kind) {
  const X0 = 3, W = 52, H = 30, Y0 = 3, A = 3.4, waves = 1.15, F = 12;
  const len = W / waves;
  const yAt = (x, ph) => Y0 + A * ((x - X0) / W) * Math.sin((2 * Math.PI * (x - X0)) / len - ph);
  const xs = Array.from({ length: 15 }, (_, i) => X0 + (W * i) / 14);
  const cloth = (ph) => `M${xs.map((x) => `${x.toFixed(1)} ${yAt(x, ph).toFixed(2)}`).join('L')}L${[...xs].reverse().map((x) => `${x.toFixed(1)} ${(yAt(x, ph) + H).toFixed(2)}`).join('L')}Z`;
  const phases = Array.from({ length: F + 1 }, (_, i) => (2 * Math.PI * i) / F);
  const cx = X0 + W / 2;
  const d = phases.map(cloth).join(';');
  const bob = phases.map((ph) => `${cx} ${(yAt(cx, ph) + H / 2).toFixed(2)}`).join(';');
  const anim = (attr, values) => calm ? '' : `<animate attributeName="${attr}" dur=".8s" repeatCount="indefinite" values="${values}" />`;
  const ca = kind === 'ca';
  const stripes = ca
    ? `<stop offset=".25" stop-color="#d52b1e" /><stop offset=".25" stop-color="#fff" />
       <stop offset=".75" stop-color="#fff" /><stop offset=".75" stop-color="#d52b1e" />`
    : `<stop offset=".333" stop-color="#006847" /><stop offset=".333" stop-color="#fff" />
       <stop offset=".667" stop-color="#fff" /><stop offset=".667" stop-color="#ce1126" />`;
  const emblem = ca
    ? `<g transform="translate(0 1) scale(1.12)"><path d="${MAPLE}" fill="#d52b1e" /></g>`
    : `<ellipse rx="3" ry="3.6" fill="#7a4a1f" />
       <path d="M-4.6 2.2 Q0 7.4 4.6 2.2" fill="none" stroke="#2f7d32" stroke-width="1.4" stroke-linecap="round" />`;
  return `
    <svg viewBox="0 0 60 56" width="48" height="45" aria-hidden="true">
      <defs>
        <linearGradient id="flag-stripes" gradientUnits="userSpaceOnUse" x1="${X0}" x2="${X0 + W}">
          ${stripes}
        </linearGradient>
        <linearGradient id="flag-folds" gradientUnits="userSpaceOnUse" x1="${X0}" x2="${X0 + len}" spreadMethod="repeat">
          <stop offset="0" stop-color="#000" stop-opacity=".2" /><stop offset=".5" stop-color="#fff" stop-opacity=".18" /><stop offset="1" stop-color="#000" stop-opacity=".2" />
          ${calm ? '' : `<animateTransform attributeName="gradientTransform" type="translate" from="0 0" to="${len.toFixed(2)} 0" dur=".8s" repeatCount="indefinite" />`}
        </linearGradient>
      </defs>
      <path d="${cloth(0)}" fill="url(#flag-stripes)" stroke="rgb(0 0 0 / .28)" stroke-width=".6">${anim('d', d)}</path>
      <path d="${cloth(0)}" fill="url(#flag-folds)">${anim('d', d)}</path>
      <g transform="translate(${cx} ${Y0 + H / 2})">
        ${calm ? '' : `<animateTransform attributeName="transform" type="translate" dur=".8s" repeatCount="indefinite" values="${bob}" />`}
        ${emblem}
      </g>
      <line x1="1.6" y1="2" x2="1.6" y2="54" stroke="#3b2a1a" stroke-width="2.6" stroke-linecap="round" />
      <circle cx="1.6" cy="1.8" r="2.1" fill="#d4a72c" />
    </svg>`;
}

const flagEl = document.createElement('div');
flagEl.className = 'flagcursor';
flagEl.dataset.own = '';
flagEl.setAttribute('aria-hidden', 'true');
flagEl.innerHTML = '<div class="flagcursor__in"><div class="flagcursor__shake"></div></div>';
document.body.append(flagEl);

// English offers Mexico. Spanish offers the way back, so the cursor is Canadian.
function paintFlag() {
  flagEl.querySelector('.flagcursor__shake').innerHTML = flagSVG(lang === 'es' ? 'ca' : 'mx');
}
paintFlag();

let pointer = { x: -100, y: -100 };
let flagOn = false, flagHide = 0;
const moveFlag = () => { flagEl.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0)`; };
function flag(on) {
  if (on === flagOn) return;
  flagOn = on;
  clearTimeout(flagHide);
  if (on) moveFlag();
  flagEl.classList.toggle('is-on', on);
  // The hand stays until the flag is actually there. Hiding it on the same frame leaves a blank pointer.
  if (on) flagHide = setTimeout(() => { if (flagOn) logoEl.classList.add('is-flag'); }, 70);
  else logoEl.classList.remove('is-flag');
}
addEventListener('pointermove', (e) => {
  pointer = { x: e.clientX, y: e.clientY };
  if (flagOn) moveFlag();
}, { passive: true });

/* ---------- resting on the monogram ---------- */

// While the doodle's game has the monogram's side, it is left alone.
const playing = () => logoEl.classList.contains('is-game');

let overLogo = false, dwell = 0, sweep = 0, flagWait = 0;
logoEl.addEventListener('pointerenter', (e) => {
  if (e.pointerType !== 'mouse' || !fine.matches || playing()) return;
  overLogo = true;
  clearTimeout(sweep);
  sweep = 0;
  clearTimeout(dwell);
  if (dealt) { flag(true); return; }
  dwell = setTimeout(() => {
    deal();
    // The toss is short. The flag takes the pointer as the notes stick, not while they are still in the air.
    flagWait = setTimeout(() => { if (overLogo) flag(true); }, calm ? 180 : 440);
  }, 280);
});
logoEl.addEventListener('pointerleave', () => {
  overLogo = false;
  clearTimeout(dwell);
  clearTimeout(flagWait);
  flag(false);
});
// The notes stay up while you are on the monogram's side or on a note. Leave both and they go almost at once.
addEventListener('pointerover', (e) => {
  if (e.pointerType !== 'mouse' || !dealt) return;
  if (e.target.closest?.('#stage, .slip')) { clearTimeout(sweep); sweep = 0; }
  else if (!sweep && !held) sweep = setTimeout(() => { sweep = 0; gather(); }, 180);
});

// A click, not the end of a drag. With a mouse it takes the flag. A touch screen has nothing to rest, so the first tap
// does what resting does: the notes come in and the flag plants itself where you tapped. Tap again, with it up, to ask.
let down = null;
logoEl.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: e.timeStamp }; });
logoEl.addEventListener('click', (e) => {
  if (playing() || !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6 || e.timeStamp - down.t > 600) return;
  if (flagOn) { ask(); return; }
  if (fine.matches) return;
  pointer = { x: e.clientX, y: e.clientY };
  clearTimeout(flagWait);
  if (dealt) { flag(true); return; }
  deal();
  flagWait = setTimeout(() => { if (dealt) flag(true); }, calm ? 180 : 440);
});
// Anywhere but the monogram, a note or the question, and the notes go — click or tap.
addEventListener('pointerdown', (e) => {
  if (!dealt || e.target.closest?.('#logo, .slip, .ask')) return;
  clearTimeout(flagWait);
  clearTimeout(sweep);
  sweep = 0;
  gather();
});

/* ---------- the question, as a Windows 95 message box ---------- */

// The question-mark icon, drawn on a 32px grid: a white speech bubble with a blue ? in it, and a grey drop shadow.
const QMARK = ['.XXXX.', 'XX..XX', '....XX', '...XX.', '..XX..', '..XX..', '......', '..XX..'];
const qmark = QMARK.flatMap((row, y) => [...row].map((c, x) => (c === 'X' ? `M${10 + x * 2} ${5 + y * 2}h2v2h-2z` : ''))).join('');
const ICON = `
  <svg class="w95__icon" viewBox="0 0 32 32" width="32" height="32" shape-rendering="crispEdges" aria-hidden="true">
    <g fill="#808080" transform="translate(2 2)"><circle cx="15" cy="13" r="12" /><path d="M6 21l-3 8 8-5z" /></g>
    <circle cx="15" cy="13" r="12" fill="#fff" stroke="#000" />
    <path d="M6 21l-3 8 8-5" fill="#fff" stroke="#000" />
    <path d="M7 20h4v3h-4z" fill="#fff" />
    <path d="${qmark}" fill="#0000ff" />
  </svg>`;

const dlg = document.createElement('dialog');
dlg.className = 'ask';
dlg.dataset.own = '';
dlg.setAttribute('aria-labelledby', 'ask-q');
dlg.innerHTML = `
  <form method="dialog" class="w95">
    <div class="w95__title">
      <span>ROBERTO.GS</span>
      <button class="w95__x" value="no" aria-label="Close"></button>
    </div>
    <div class="w95__body">${ICON}<p class="w95__msg" id="ask-q"></p></div>
    <div class="w95__btns">
      <button class="w95__btn w95__btn--default" value="yes" autofocus></button>
      <button class="w95__btn" value="no"></button>
    </div>
  </form>`;
document.body.append(dlg);

// Bumped whenever the sulk should stop: the box closed, or a new question opened.
let sulkId = 0;

function ask() {
  flag(false);
  sulkId++;
  const L = STR[lang];
  $('#ask-q', dlg).textContent = L.ask;
  $('[value="yes"].w95__btn', dlg).textContent = L.yes;
  $('[value="no"].w95__btn', dlg).textContent = L.no;
  $('.w95__btns', dlg).hidden = false;
  $('.w95', dlg).style.minWidth = '';
  dlg.returnValue = '';
  dlg.showModal();
}

// No on the Mexican-side question doesn't leave. The box sulks, gives in, then goes.
$('[value="no"].w95__btn', dlg).addEventListener('click', (e) => {
  if (lang !== 'en' || !STR.en.sulk) return;
  e.preventDefault();
  const id = ++sulkId;
  const msg = $('#ask-q', dlg);
  const box = $('.w95', dlg);
  box.style.minWidth = `${box.offsetWidth}px`;
  $('.w95__btns', dlg).hidden = true;
  const beat = (text, ms) => new Promise((resolve) => {
    if (id !== sulkId || !dlg.open) { resolve(false); return; }
    msg.textContent = text;
    setTimeout(() => resolve(id === sulkId && dlg.open), ms);
  });
  const [hurt, give] = STR.en.sulk;
  beat(hurt, 1200).then((on) => on && beat(give, 900)).then((on) => { if (on) dlg.close(); });
});

dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
dlg.addEventListener('close', () => {
  sulkId++;
  if (dlg.returnValue === 'yes') flip();
});

/* ---------- the flip ---------- */

function flip() {
  const next = lang === 'es' ? 'en' : 'es';
  const apply = () => {
    clearTable();
    lang = next;
    paintFlag();
    root.lang = next;
    root.classList.toggle('is-es', next === 'es');
    if (next === 'es') translatePage(); else restorePage();
  };
  if (calm || !document.startViewTransition) { apply(); return; }
  root.dataset.flip = next;
  document.startViewTransition(apply).finished.finally(() => { delete root.dataset.flip; });
}
