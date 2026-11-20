// Playlist Queue — github.com/veraetogrex-portfolio · zero dependencies
// A player and its queue. Pick a song up by its handle: the row lifts, the songs it passes step aside, it settles in.
// Whatever lands first in the queue is "Playing next": its cover lifts off the row and flies, growing, into the place beside the album.
// Keyboard: focus a handle, ↑ ↓ move the song, Home sends it to the top, End to the bottom.

const NOW = { title: 'Low Tide', artist: 'Ines Calder', art: 'tide' };
const SONGS = [
  { title: 'Paper Moons',  artist: 'Odd Harbor',  time: '3:41', art: 'moons' },
  { title: 'Night Bus',    artist: 'Teo Marsh',   time: '4:05', art: 'bus' },
  { title: 'Copper Field', artist: 'Mara Velde',  time: '3:22', art: 'field' },
  { title: 'Glass Garden', artist: 'Juno Ferns',  time: '4:12', art: 'garden' },
];
// album art, drawn: one colour and one shape per record
const ART = {
  tide:   '<rect width="100" height="100" fill="#1f5f6f"/><circle cx="50" cy="52" r="23" fill="#ebddbf"/><rect y="58" width="100" height="42" fill="#164858"/><rect x="14" y="68" width="44" height="4" rx="2" fill="#2d7789"/><rect x="42" y="79" width="46" height="4" rx="2" fill="#2d7789"/><rect x="22" y="90" width="28" height="4" rx="2" fill="#2d7789"/>',
  moons:  '<rect width="100" height="100" fill="#e7dfce"/><circle cx="21" cy="46" r="12" fill="#2b2b35"/><circle cx="26" cy="46" r="11" fill="#e7dfce"/><circle cx="50" cy="46" r="12" fill="#2b2b35"/><circle cx="79" cy="46" r="12" fill="#2b2b35"/><circle cx="74" cy="46" r="11" fill="#e7dfce"/><rect x="14" y="72" width="72" height="2.4" fill="#2b2b35"/>',
  bus:    '<rect width="100" height="100" fill="#1c2546"/><rect x="10" y="38" width="80" height="32" rx="8" fill="#4459a0"/><rect x="17" y="44" width="11" height="11" rx="2" fill="#f2d58a"/><rect x="32" y="44" width="11" height="11" rx="2" fill="#f2d58a"/><rect x="47" y="44" width="11" height="11" rx="2" fill="#2a3566"/><rect x="62" y="44" width="11" height="11" rx="2" fill="#f2d58a"/><rect x="77" y="44" width="7" height="20" rx="2" fill="#f2d58a"/><circle cx="28" cy="71" r="6.5" fill="#0d1226"/><circle cx="72" cy="71" r="6.5" fill="#0d1226"/><rect y="78" width="100" height="2" fill="#33407a"/>',
  field:  '<rect width="100" height="100" fill="#b4472a"/><path d="M22 58a28 28 0 0 1 56 0z" fill="#f1dab4"/><rect y="58" width="100" height="42" fill="#8a3018"/><path d="M50 58-30 100M50 58 10 100M50 58 50 100M50 58 90 100M50 58 130 100" stroke="#c4603a" stroke-width="5"/>',
  garden: '<rect width="100" height="100" fill="#8ea67f"/><path d="M30 84C16 62 22 38 32 22c10 16 14 40-2 62zM52 84C40 58 44 32 54 14c10 18 12 44-2 70zM73 84C62 64 66 44 74 30c8 14 12 34-1 54z" fill="#2e4a35"/>',
};
const GRIP = '<svg viewBox="0 0 22 36" aria-hidden="true"><circle cx="5" cy="6" r="3"/><circle cx="17" cy="6" r="3"/><circle cx="5" cy="18" r="3"/><circle cx="17" cy="18" r="3"/><circle cx="5" cy="30" r="3"/><circle cx="17" cy="30" r="3"/></svg>';
const ROW = 128, GAP = 14, STEP = ROW + GAP, LANE = SONGS.length * STEP - GAP;   // px

const root = document.querySelector('#queue');
const list = root.querySelector('.pq-list');
const slot = root.querySelector('.pq-slot');
const stack = root.querySelector('.pq-stack');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const recs = [...root.querySelectorAll('.pq-rec')];
const caps = [...root.querySelectorAll('.pq-cap')];
const live = root.querySelector('.pq-sr');
const svg = id => `<svg viewBox="0 0 100 100" aria-hidden="true">${ART[id]}</svg>`;

root.querySelector('.pq-cover').innerHTML = svg(NOW.art);
root.querySelector('.pq-cover').setAttribute('aria-label', `${NOW.title} album cover`);
root.querySelector('.pq-song-t').textContent = NOW.title;
root.querySelector('.pq-song-a').textContent = NOW.artist;
root.querySelector('.pq-count').textContent = `${SONGS.length} songs, ${Math.round(SONGS.reduce((s, x) => s + +x.time.split(':')[0] * 60 + +x.time.split(':')[1], 0) / 60)} min`;
list.innerHTML = SONGS.map((s, i) => `<li class="pq-row" data-id="${i}"><div class="pq-card">
  <span class="pq-art">${svg(s.art)}</span>
  <span class="pq-meta"><b class="pq-title">${s.title}</b><span class="pq-artist">${s.artist}</span></span>
  <span class="pq-time">${s.time}</span>
  <button class="pq-grip" aria-label="Move ${s.title}">${GRIP}</button></div></li>`).join('');
const rows = [...list.children];
const grips = rows.map(r => r.querySelector('.pq-grip'));

let order = [0, 1, 2, 3];   // song ids, top to bottom
let next = -1, rec = 0, cap = 0, held = null;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const at = (el, y) => { el.style.transform = `translateY(${y}px)`; };
const lay = (ids, skip) => ids.forEach((id, pos) => { if (id !== skip) at(rows[id], pos * STEP); });

// ── pick up: the row lifts, a hole opens where it was ──
function pick(id, y) {
  const from = order.indexOf(id);
  held = { id, from, to: from, y0: y, k: list.getBoundingClientRect().height / LANE, ids: order };
  rows[id].classList.add('is-carried');
  at(slot, from * STEP); slot.classList.add('is-on');
}
// ── carry: the row follows the pointer; once past a neighbour's middle, that neighbour steps aside ──
function carry(y) {
  const { id, from } = held;
  const top = clamp(from * STEP + (y - held.y0) / held.k, -18, (SONGS.length - 1) * STEP + 18);
  at(rows[id], top);
  const to = clamp(Math.round(top / STEP), 0, SONGS.length - 1);
  if (to === held.to) return;
  held.to = to;
  held.ids = order.filter(i => i !== id); held.ids.splice(to, 0, id);
  lay(held.ids, id); at(slot, to * STEP);
}
// ── let go: the row settles into the hole; the first song of the queue becomes "Playing next" ──
function drop() {
  const { id, to, ids } = held; held = null;
  order = ids;
  rows[id].classList.replace('is-carried', 'is-landing');
  at(rows[id], to * STEP); slot.classList.remove('is-on');
  setTimeout(() => { rows[id].classList.remove('is-landing'); settle(); }, 360);
  playNext(order[0]);
  live.textContent = `${SONGS[id].title}, position ${to + 1} of ${SONGS.length}. Playing next: ${SONGS[order[0]].title}.`;
}

// "Playing next": the old record slides back behind the album, the song's cover lifts off its row and flies into the place
function playNext(id, now = false) {
  if (id === next) return;
  next = id;
  const out = recs[rec], inn = recs[rec = 1 - rec], art = inn.querySelector('.pq-rec-art');
  out.classList.remove('is-on', 'is-top');
  art.innerHTML = svg(SONGS[id].art);
  inn.classList.add('is-top', 'is-on');
  if (!now) {   // start exactly on top of the row's cover, at its size, then fly on an arc and grow
    const a = rows[id].querySelector('.pq-art').getBoundingClientRect(), b = stack.getBoundingClientRect(), k = b.width / stack.offsetWidth;
    inn.classList.add('is-lifting');
    inn.style.transform = `translateX(${(a.left - b.left) / k - inn.offsetLeft}px)`;
    art.style.transform = `translateY(${(a.top - b.top) / k - inn.offsetTop}px) scale(${a.width / k / inn.offsetWidth})`;
    void inn.offsetWidth;
    inn.classList.remove('is-lifting'); inn.style.transform = art.style.transform = '';
    if (!REDUCED) inn.firstElementChild.animate([{ transform: 'none' }, { transform: 'translateY(30px)', offset: .45 },   // dips under the label on its way,
      { transform: 'scale(1.05)', offset: .82 }, { transform: 'none' }], { duration: 780, easing: 'ease-in-out' });   // and lands with a small settle
  }
  // the name and artist under the place change as one block as the record lands
  const old = caps[cap], cur = caps[cap = 1 - cap];
  cur.innerHTML = `${SONGS[id].title}<small>${SONGS[id].artist}</small>`;
  cur.style.transitionDelay = now ? '' : '.56s';
  cur.classList.add('is-below'); void cur.offsetWidth; cur.classList.remove('is-below');
  old.style.transitionDelay = now ? '' : '.4s';
  old.classList.add('is-above'); cur.classList.remove('is-above');
}

// pointer: press anywhere on a row (the handle shows where), drag, release
rows.forEach((r, id) => r.addEventListener('pointerdown', e => {
  if (held || e.button !== 0) return;
  e.preventDefault(); pick(id, e.clientY);
  try { r.setPointerCapture(e.pointerId); } catch (_) {}
}));
addEventListener('pointermove', e => { if (held) carry(e.clientY); });
addEventListener('pointerup', () => { if (held) drop(); });
addEventListener('pointercancel', () => { if (held) { held.ids = order; held.to = held.from; drop(); } });

// keyboard: the same move, one slot at a time
function move(id, to) {
  to = clamp(to, 0, SONGS.length - 1);
  const from = order.indexOf(id); if (to === from) return;
  held = { id, from, to, ids: order.filter(i => i !== id) }; held.ids.splice(to, 0, id);
  rows[id].classList.add('is-carried'); lay(held.ids, id);
  drop(); grips[id].focus({ preventScroll: true });
}
grips.forEach((g, id) => g.addEventListener('keydown', e => {
  const pos = order.indexOf(id);
  const to = { ArrowUp: pos - 1, ArrowDown: pos + 1, Home: 0, End: SONGS.length - 1 }[e.key];
  if (to === undefined) return;
  e.preventDefault(); move(id, to);
}));

// once the rows are at rest, the list items follow the order on screen, so Tab and screen readers go down the queue
function settle() {
  if (held) return;
  if (list.getAnimations({ subtree: true }).length) return setTimeout(settle, 100);
  const f = document.activeElement;
  order.forEach(id => list.append(rows[id]));
  if (f !== document.activeElement && list.contains(f)) f.focus({ preventScroll: true });
}

// play / pause: the button swaps its icon and its label
const play = root.querySelector('.pq-play');
const ICON = { Pause: play.innerHTML, Play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.6v12.8a1 1 0 0 0 1.53.85l10.1-6.4a1 1 0 0 0 0-1.7L9.53 4.75A1 1 0 0 0 8 5.6z"/></svg>' };
const setPlay = label => { play.setAttribute('aria-label', label); play.innerHTML = ICON[label]; };
play.addEventListener('click', () => setPlay(play.getAttribute('aria-label') === 'Pause' ? 'Play' : 'Pause'));

function reset() {
  root.classList.add('is-reset');
  held = null; order = [0, 1, 2, 3]; next = -1;
  rows.forEach(r => r.classList.remove('is-carried', 'is-landing')); slot.classList.remove('is-on');
  recs.forEach(r => { r.classList.remove('is-on', 'is-top', 'is-lifting'); r.style.transform = r.querySelector('.pq-rec-art').style.transform = ''; r.firstElementChild.getAnimations().forEach(x => x.cancel()); });
  caps.forEach(c => c.classList.remove('is-above', 'is-below'));
  lay(order); settle(); playNext(order[0], true); live.textContent = ''; setPlay('Pause');
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('is-reset')));
}

reset();
root.queue = { reset, grip: id => grips[id], gripAt: pos => grips[order[pos]], order: () => order.slice(), step: STEP };   // for scripted demos
