// Recorded sounds, all CC0, from OpenGameArt: artisticdude's RPG Sound Pack, rubberduck's RPG and creature packs,
// Kenney's RPG sounds, a set of swishes and fvcalderan's fanfare. Each key has a few takes, picked at random.

const SETS = {
  swing: 3, miss: 3, hit: 3, crit: 2, dodge: 3, hurt: 3, death: 1,
  achieve: 2, click: 1, open: 1, close: 1, coin: 3,
  'ogre-growl': 4, 'ogre-pain': 3, 'ogre-die': 2,
  'beast-growl': 4, 'beast-pain': 3, 'beast-die': 2,
  'giant-growl': 3, 'giant-pain': 2, 'giant-die': 1,
};
const VOL = { dodge: 0.5, miss: 0.6, achieve: 0.55, click: 0.45, open: 0.55, close: 0.5, coin: 0.4 };
const MASTER = 0.6;

let ac = null, out = null;
const bufs = new Map();
const last = {};

const ctx = () => {
  try {
    if (!ac) {
      ac = new AudioContext();
      out = ac.createGain();
      out.gain.value = MASTER;
      out.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  } catch { return null; }
};

const url = (key, i) => `/sounds/rpg/${key}-${i}.m4a`;

function load(u) {
  if (bufs.has(u)) return bufs.get(u);
  const p = fetch(u).then((r) => r.arrayBuffer()).then((b) => ac.decodeAudioData(b))
    .then((buf) => { bufs.set(u, buf); return buf; }, () => { bufs.delete(u); return null; });
  bufs.set(u, p);
  return p;
}

let warmed = false;
function warm() {
  if (ac?.state === 'suspended') ac.resume();
  if (warmed || !ctx()) return;
  warmed = true;
  const all = Object.entries(SETS).flatMap(([k, n]) => Array.from({ length: n }, (_, i) => url(k, i)));
  const next = () => { const u = all.shift(); if (u) Promise.resolve(load(u)).finally(next); };
  (window.requestIdleCallback ?? setTimeout)(() => { next(); next(); });
}
['pointerdown', 'keydown'].forEach((t) => addEventListener(t, warm, { passive: true }));

function play(key, { delay = 0, vol = 1 } = {}) {
  const n = SETS[key];
  const a = ctx();
  if (!n || !a) return;
  let i = Math.floor(Math.random() * n);
  if (n > 1 && i === last[key]) i = (i + 1) % n;
  last[key] = i;
  const at = a.currentTime + delay;
  const start = (buf) => {
    if (!buf) return;
    const src = a.createBufferSource(), g = a.createGain();
    src.buffer = buf;
    src.playbackRate.value = 0.94 + Math.random() * 0.12;
    g.gain.value = (VOL[key] ?? 0.75) * vol;
    src.connect(g).connect(out);
    src.start(Math.max(at, a.currentTime));
  };
  const b = load(url(key, i));
  b instanceof AudioBuffer ? start(b) : b.then(start);
}

export const sfx = {
  swing: () => play('swing'),
  hit: () => play('hit'),
  crit: () => { play('crit'); play('hit', { vol: 0.6 }); },
  miss: () => play('miss'),
  dodge: () => play('dodge'),
  hurt: () => { play('hurt'); play('hit', { vol: 0.5 }); },
  death: () => play('death'),
  growl: (voice = 'ogre') => play(`${voice}-growl`),
  pain: (voice = 'ogre') => play(`${voice}-pain`, { vol: 0.8 }),
  slain: (voice = 'ogre') => play(`${voice}-die`),
  achieve: () => { play('achieve'); play('coin', { delay: 0.05, vol: 0.7 }); },
  click: () => play('click'),
  open: () => play('open'),
  close: () => play('close'),
  coin: () => play('coin'),
};
