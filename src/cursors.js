// Everyone else on this page, through playhtml. Their pointer is the same hand as yours, with their name on it.
// The room is the hash you are on: work, info, and each project stay separate.
import { playhtml } from 'playhtml';

const NAMES = ['ada', 'milo', 'june', 'nori', 'cleo', 'otto', 'reza', 'luna', 'nico', 'suki', 'enzo', 'kira', 'opal', 'felix', 'noor', 'hugo', 'ines', 'levi', 'mira', 'teo'];

// Must stay a plain url() — Safari is unreliable with image-set / SVG data cursors on <html>.
const HAND = `url("/cursor-sm.png") 2 0, auto`;

const pageRoom = () => {
  const slug = location.hash.replace(/^#\/?/, '').split(/[?#]/)[0];
  return slug || 'work';
};

const hand = () => {
  const img = document.createElement('img');
  img.className = 'guestcur';
  img.src = '/cursor-sm.png';
  img.alt = '';
  img.width = 36;
  img.height = 37;
  img.draggable = false;
  return img;
};

const label = (text) => {
  const name = document.createElement('div');
  name.className = 'playhtml-cursor-name';
  name.textContent = text;
  return name;
};

// playhtml stamps either its svg arrow or "auto" onto <html> on every move, which overrides the CSS hand.
// Safari is especially sticky about that inline auto. Put the hand back as soon as playhtml writes.
const keepHand = () => {
  const el = document.documentElement;
  const cur = el.style.getPropertyValue('cursor');
  if (!cur) return;
  // Info page wants the system arrow; clear playhtml's svg/auto stamp and let CSS win.
  if (document.body?.dataset.page === 'info') {
    el.style.removeProperty('cursor');
    return;
  }
  if (cur === 'auto' || /svg\+xml|image\/svg/i.test(cur)) {
    el.style.setProperty('cursor', HAND);
  }
};

playhtml.init({
  room: pageRoom,
  cursors: {
    enabled: true,
    room: pageRoom,
    onCustomCursorRender: (pid, element) => {
      element.setAttribute('aria-hidden', 'true');
      element.replaceChildren(hand());
      let person;
      try { person = playhtml.people.everyone.find((p) => p.pid === pid); } catch { person = null; }
      if (person?.name) element.append(label(person.name));
      return element;
    },
  },
}).then(() => {
  const me = playhtml.people.me;
  if (!me.name) me.name = NAMES[Math.floor(Math.random() * NAMES.length)];
  keepHand();
  new MutationObserver(keepHand).observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
  // After playhtml's pointer handler in the same tick.
  addEventListener('pointermove', () => queueMicrotask(keepHand), { passive: true });
  // Hash changes are how this site changes page. playhtml only watches history on its own.
  addEventListener('hashchange', () => { playhtml.handleNavigation(); });
}).catch(() => {});
