'use strict';
/* =========================================================
   Matéo et les Nombres — jeu de plateforme 2D mathématique
   ========================================================= */

const T = 32, VW = 768, VH = 480, ROWS = 15;
const cvs = document.getElementById('game');
const ctx = cvs.getContext('2d');
const stage = document.getElementById('stage');
const $ = id => document.getElementById(id);

/* ---------- Mise à l'échelle ---------- */
function resize() {
  const s = Math.min(innerWidth / VW, innerHeight / VH);
  const dpr = window.devicePixelRatio || 1;
  stage.style.width = VW * s + 'px';
  stage.style.height = VH * s + 'px';
  cvs.style.width = VW * s + 'px';
  cvs.style.height = VH * s + 'px';
  cvs.width = Math.round(VW * s * dpr);
  cvs.height = Math.round(VH * s * dpr);
  ctx.setTransform(s * dpr, 0, 0, s * dpr, 0, 0);
  stage.style.fontSize = Math.max(11, Math.min(18, 16 * s)) + 'px';
}
addEventListener('resize', resize);
resize();

/* ---------- Utilitaires ---------- */
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const store = {
  get(k, d) { try { const v = localStorage.getItem('mateo.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mateo.' + k, JSON.stringify(v)); } catch (e) { } }
};

/* ---------- Sons (WebAudio) ---------- */
let actx = null;
function tone(f, d, type = 'square', f2 = null, delay = 0, vol = 0.08) {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime + delay;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + d);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + d + 0.02);
  } catch (e) { }
}
const SFX = {
  jump: () => tone(380, 0.18, 'square', 760, 0, 0.05),
  coin: () => { tone(988, 0.07); tone(1319, 0.22, 'square', null, 0.07); },
  stomp: () => tone(300, 0.15, 'triangle', 80, 0, 0.12),
  bump: () => tone(140, 0.08, 'square', 90, 0, 0.08),
  hurt: () => tone(400, 0.35, 'sawtooth', 90, 0, 0.07),
  good: () => { tone(523, 0.1); tone(659, 0.1, 'square', null, 0.1); tone(784, 0.25, 'square', null, 0.2); },
  bad: () => { tone(300, 0.18, 'sawtooth'); tone(220, 0.3, 'sawtooth', null, 0.18); },
  open: () => { for (let i = 0; i < 6; i++) tone(300 + i * 120, 0.12, 'triangle', null, i * 0.06, 0.1); },
  heart: () => { tone(660, 0.1, 'triangle', null, 0, 0.12); tone(880, 0.1, 'triangle', null, 0.1, 0.12); tone(1100, 0.3, 'triangle', null, 0.2, 0.12); },
  win: () => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', null, i * 0.14, 0.07)); },
  die: () => { [494, 466, 440, 415, 392].forEach((f, i) => tone(f, 0.2, 'triangle', null, i * 0.15, 0.12)); },
  life: () => { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12, 'square', null, i * 0.08, 0.06)); }
};

/* ---------- Mondes ---------- */
const LEVELS = [
  { name: 'Plaine des Additions', ops: ['+'] },
  { name: 'Collines des Soustractions', ops: ['-'] },
  { name: 'Forêt des Multiplications', ops: ['×'] },
  { name: 'Grottes des Divisions', ops: ['÷'] },
  { name: 'Désert des Mélanges', ops: ['+', '-'] },
  { name: 'Pics des Tables', ops: ['×', '÷'] },
  { name: 'Ciel des Calculs', ops: ['+', '-', '×', '÷'] },
  { name: 'Citadelle du Grand Calcul', ops: ['+', '-', '×', '÷'] },
];
const THEMES = [
  { sky: ['#5fb8ff', '#c9ecff'], far: '#a6d98f', near: '#6cbf5a', dirt: '#b86f35', dirtD: '#8f5226', grass: '#47b347' },
  { sky: ['#ff9f5a', '#ffe3b0'], far: '#e0b47a', near: '#a8c45a', dirt: '#a8653a', dirtD: '#7a4524', grass: '#7dbb3c' },
  { sky: ['#5fc4b0', '#d4f5e6'], far: '#3e8f5e', near: '#2f7a46', dirt: '#7a5232', dirtD: '#56391f', grass: '#2f9a4a', trees: true },
  { sky: ['#1d1b33', '#3b3560'], far: '#2c2848', near: '#3d3763', dirt: '#5a536e', dirtD: '#3e3850', grass: '#8b7fc4', night: true },
  { sky: ['#ffc85a', '#fff1c4'], far: '#e8b866', near: '#d99a4e', dirt: '#d9a35b', dirtD: '#b07c3a', grass: '#c9a24a' },
  { sky: ['#7aa7e0', '#e3eefc'], far: '#b6c6dc', near: '#8fa3bf', dirt: '#7d7f8f', dirtD: '#5c5e6c', grass: '#f2f7ff' },
  { sky: ['#0e1a40', '#3a4f9a'], far: '#283a78', near: '#34489a', dirt: '#4a5aa0', dirtD: '#33407a', grass: '#9ad0ff', night: true },
  { sky: ['#3a0f2e', '#8a2d4a'], far: '#5a1f3a', near: '#6e2a45', dirt: '#5c4a55', dirtD: '#3e3039', grass: '#d0607a', night: true },
];

/* ---------- Questions ---------- */
const SHOW = { '+': '+', '-': '−', '×': '×', '÷': '÷' };
function calc(a, op, b) { return op === '+' ? a + b : op === '-' ? a - b : op === '×' ? a * b : a / b; }

function basicOperands(op, d) {
  let a, b;
  if (op === '+') {
    const M = [10, 50, 200][d - 1];
    a = rand(d === 1 ? 0 : 3, M); b = rand(d === 1 ? 1 : 3, M);
  } else if (op === '-') {
    const M = [15, 60, 300][d - 1];
    a = rand(d === 1 ? 2 : 10, M); b = rand(1, a);
  } else if (op === '×') {
    if (d === 1) { a = rand(2, 5); b = rand(1, 10); }
    else if (d === 2) { a = rand(2, 10); b = rand(2, 10); }
    else { a = rand(3, 12); b = rand(3, 12); }
    if (Math.random() < 0.5) [a, b] = [b, a];
  } else {
    let q;
    if (d === 1) { b = rand(2, 5); q = rand(1, 10); }
    else if (d === 2) { b = rand(2, 10); q = rand(2, 10); }
    else { b = rand(3, 12); q = rand(3, 12); }
    a = b * q;
  }
  return [a, b];
}

function makeChoices(ans, extra = []) {
  const s = new Set([ans]);
  for (const v of shuffle(extra.slice())) { if (s.size >= 4) break; if (Number.isInteger(v) && v >= 0) s.add(v); }
  const deltas = shuffle([1, -1, 2, -2, 10, -10, 3, -3, 5, -5]);
  for (const dl of deltas) { if (s.size >= 4) break; const v = ans + dl; if (v >= 0) s.add(v); }
  let k = 1;
  while (s.size < 4) s.add(ans + 10 + k++);
  return shuffle([...s]);
}

function makeQuestion(hard) {
  const d = G.diff;
  const op = pick(LEVELS[G.level - 1].ops);
  const [a, b] = basicOperands(op, d);
  const r = calc(a, op, b);
  let text, ans, extra = [];

  if (!hard) {
    text = `${a} ${SHOW[op]} ${b} = ?`; ans = r;
    if (op === '×') extra = [a * (b + 1), a * (b - 1), (a + 1) * b, a + b];
    if (op === '÷') extra = [r + 1, r - 1, b, a - b];
    if (op === '+') extra = [r + 10, r - 10, Math.abs(a - b)];
    if (op === '-') extra = [a + b, r + 10, r - 10];
  } else if (d === 3 && Math.random() < 0.5) {
    // Priorités opératoires
    const c = rand(2, 9);
    if (Math.random() < 0.5) {
      const x = rand(2, 9), y = rand(2, 9);
      text = `${c} + ${x} × ${y} = ?`; ans = c + x * y; extra = [(c + x) * y, ans + 1, ans - x];
    } else {
      const x = rand(2, 9), y = rand(2, 9);
      text = `(${c} + ${x}) × ${y} = ?`; ans = (c + x) * y; extra = [c + x * y, ans + y, ans - y];
    }
  } else {
    // Nombre manquant
    if (Math.random() < 0.5) { text = `${a} ${SHOW[op]} ? = ${r}`; ans = b; }
    else if (op === '+' || op === '×') { text = `? ${SHOW[op]} ${b} = ${r}`; ans = a; }
    else { text = `${a} ${SHOW[op]} ? = ${r}`; ans = b; }
    extra = [ans + 1, ans - 1, r, ans + 2];
  }
  return { text, ans, choices: makeChoices(ans, extra), op };
}

/* ---------- Génération des niveaux ---------- */
const SOLID = new Set(['#', 'S', 'B', '?', 'X', 'G']);
const isSolid = c => SOLID.has(c);

function genLevel(n) {
  const r = mulberry32(n * 7919 + 1337);
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const W = 120 + n * 18;
  const t = [];
  for (let y = 0; y < ROWS; y++) t.push(new Array(W).fill(' '));
  const enemies = [];
  const ground = (x, top = 13) => { for (let y = top; y < ROWS; y++) t[y][x] = '#'; };
  const set = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < ROWS) t[y][x] = c; };

  let x = 0;
  for (; x < 14; x++) ground(x);
  const end = W - 24;
  let lastGap = false;
  while (x < end) {
    const k = r();
    if (k < 0.16 && !lastGap) {           // trou
      x += ri(2, n >= 4 ? 3 : 2); lastGap = true; continue;
    }
    const lastGapPrev = lastGap;
    lastGap = false;
    if (k < 0.32) {                        // pyramide de pierres
      const h = ri(2, Math.min(4, 2 + Math.floor(n / 3)));
      const cols = [];
      for (let i = 1; i <= h; i++) cols.push(i);
      if (r() < 0.5) cols.push(h);
      for (let i = h; i >= 1; i--) cols.push(i);
      for (const hgt of cols) { ground(x); for (let y = 13 - hgt; y < 13; y++) t[y][x] = 'S'; x++; }
      for (let i = 0; i < 2; i++) ground(x++);
    } else if (k < 0.62) {                 // terrain plat + blocs-question
      const len = ri(9, 14);
      for (let i = 0; i < len; i++) ground(x + i);
      const bx = x + ri(2, 4);
      const pattern = pick2(r, ['B?B', '?', 'B??B', '?B?', 'B?B?B']);
      for (let i = 0; i < pattern.length; i++) set(bx + i, 9, pattern[i]);
      if (r() < 0.4) set(bx + Math.floor(pattern.length / 2), 5, '?');
      if (r() < 0.6 + n * 0.04) enemies.push({ tx: x + len - 3 });
      x += len;
    } else if (k < 0.78) {                 // plateforme au-dessus d'un trou
      if (lastGapPrev) { ground(x++); }
      ground(x); ground(x + 1); x += 2;
      // pilier de pierre au milieu d'un trou
      const gap = 5;
      for (let y = 11; y < ROWS; y++) set(x + 2, y, 'S');
      for (let i = 1; i <= 3; i++) set(x + i, 8, 'C');
      if (r() < 0.5) set(x + 2, 6, '?');
      x += gap;
      for (let i = 0; i < 3; i++) ground(x++);
      lastGap = true;
    } else {                               // plat avec pièces et ennemis
      const len = ri(7, 11);
      for (let i = 0; i < len; i++) ground(x + i);
      const arc = [11, 10, 10, 11];
      const cx = x + ri(1, 3);
      for (let i = 0; i < 4; i++) set(cx + i, arc[i], 'C');
      enemies.push({ tx: x + len - 2 });
      if (n >= 3 && r() < 0.5) enemies.push({ tx: x + Math.floor(len / 2) });
      x += len;
    }
  }
  for (; x < W; x++) ground(x);

  // Portes mathématiques
  const gateCount = n >= 8 ? 3 : n >= 5 ? 2 : 1;
  const gates = [];
  for (let g = 0; g < gateCount; g++) {
    const gx = gateCount === 1 ? W - 20 : Math.floor(30 + (W - 50) * (g + 1) / gateCount);
    for (let cx = gx - 4; cx <= gx + 4; cx++) {
      for (let y = 0; y < ROWS; y++) t[y][cx] = y >= 13 ? '#' : ' ';
    }
    for (let y = 0; y < 13; y++) t[y][gx] = 'G';
    gates.push(gx);
  }
  const goalX = W - 9;
  const filtered = enemies.filter(e => e.tx > 18 && e.tx < goalX - 2 && !gates.some(g => Math.abs(g - e.tx) <= 5) && isSolid(t[13][e.tx]) && !isSolid(t[12][e.tx]));
  return { w: W, t, enemies: filtered, goalX, gates, bump: null };
}
function pick2(r, a) { return a[Math.floor(r() * a.length)]; }

/* ---------- État du jeu ---------- */
const G = {
  state: 'menu', diff: store.get('diff', 1), level: 1, lives: 3, score: 0, coins: 0,
  hearts: 3, time: 300, streak: 0, good: 0, total: 0, lvl: null, cam: 0, frame: 0,
  enemies: [], parts: [], player: null, q: null, anim: 0, banner: 0
};
let unlocked = store.get('unlocked', 1);
let best = store.get('best', 0);

function newPlayer() {
  return { x: 2 * T, y: 13 * T - 28, w: 20, h: 28, vx: 0, vy: 0, onGround: false, facing: 1, inv: 0, coyote: 0, anim: 0 };
}

function startGame(level) {
  G.lives = 3; G.score = 0; G.coins = 0; G.hearts = 3; G.streak = 0;
  startLevel(level);
}
function startLevel(n) {
  G.level = n;
  G.lvl = genLevel(n);
  G.player = newPlayer();
  G.enemies = G.lvl.enemies.map(e => ({ x: e.tx * T + 4, y: 13 * T - 24, w: 24, h: 24, vx: -(0.7 + n * 0.08), vy: 0, dead: 0, num: rand(0, 9), active: false, onGround: false }));
  G.parts = [];
  G.time = 300; G.good = 0; G.total = 0; G.cam = 0; G.banner = 150;
  G.state = 'play';
  hideAll();
  showTouch(true);
}

/* ---------- Entrées ---------- */
const keys = {};
let jumpBuf = 0;
const KEYMAP = {
  ArrowLeft: 'left', KeyA: 'left', KeyQ: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'jump', Space: 'jump', KeyW: 'jump', KeyZ: 'jump',
  ShiftLeft: 'run', ShiftRight: 'run', KeyX: 'run'
};
addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (G.state === 'question' && /^Digit[1-4]$|^Numpad[1-4]$/.test(e.code)) {
    answer(+e.code.slice(-1) - 1); e.preventDefault(); return;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') { togglePause(); e.preventDefault(); return; }
  if ((e.code === 'Enter') && G.state === 'menu') { $('playBtn').click(); return; }
  if (k) {
    if (k === 'jump' && !keys.jump) jumpBuf = 8;
    keys[k] = true; e.preventDefault();
  }
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

// Tactile
const isTouch = ('ontouchstart' in window) || matchMedia('(pointer: coarse)').matches;
document.querySelectorAll('#touch button[data-k]').forEach(b => {
  const k = b.dataset.k;
  const on = e => { e.preventDefault(); if (k === 'jump' && !keys.jump) jumpBuf = 8; keys[k] = true; b.classList.add('on'); };
  const off = e => { e.preventDefault(); keys[k] = false; b.classList.remove('on'); };
  b.addEventListener('pointerdown', on);
  b.addEventListener('pointerup', off);
  b.addEventListener('pointercancel', off);
  b.addEventListener('pointerleave', off);
});
$('pauseBtn').addEventListener('click', togglePause);
function showTouch(v) { $('touch').classList.toggle('hidden', !(v && isTouch)); }

/* ---------- Interface ---------- */
function hideAll() { ['menu', 'question', 'message'].forEach(id => $(id).classList.add('hidden')); }

function buildMenu() {
  document.querySelectorAll('#diffBtns button').forEach(b => {
    b.classList.toggle('sel', +b.dataset.d === G.diff);
    b.onclick = () => { G.diff = +b.dataset.d; store.set('diff', G.diff); buildMenu(); };
  });
  const lb = $('levelBtns'); lb.innerHTML = '';
  LEVELS.forEach((L, i) => {
    const b = document.createElement('button');
    b.innerHTML = `<span class="n">${i + 1}</span>${L.ops.map(o => SHOW[o]).join(' ')}`;
    b.title = L.name;
    b.disabled = i + 1 > unlocked;
    if (i + 1 === G.level) b.classList.add('sel');
    b.onclick = () => { G.level = i + 1; buildMenu(); };
    lb.appendChild(b);
  });
  $('bestScore').textContent = best;
}
$('playBtn').onclick = () => { tone(1, 0.01, 'sine', null, 0, 0.0001); startGame(G.level); };

function showMenu() {
  G.state = 'menu'; hideAll(); showTouch(false);
  if (G.level > unlocked) G.level = 1;
  buildMenu(); $('menu').classList.remove('hidden');
}

function showMessage(title, body, buttons) {
  $('mTitle').innerHTML = title; $('mBody').innerHTML = body;
  const mb = $('mBtns'); mb.innerHTML = '';
  for (const [label, fn, cls] of buttons) {
    const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls;
    b.onclick = fn; mb.appendChild(b);
  }
  $('message').classList.remove('hidden');
  showTouch(false);
}

function togglePause() {
  if (G.state === 'play') {
    G.state = 'pause';
    showMessage('Pause', `<p>Monde ${G.level} — ${LEVELS[G.level - 1].name}</p>`, [
      ['Reprendre ▶', togglePause, 'big'],
      ['Menu', () => { saveBest(); showMenu(); }]
    ]);
  } else if (G.state === 'pause') {
    G.state = 'play'; hideAll(); showTouch(true);
  }
}

/* ---------- Questions (déclenchement / réponse) ---------- */
function askQuestion(kind, data) {
  const q = makeQuestion(kind === 'gate');
  G.q = { ...q, kind, data, locked: false, t0: performance.now() };
  G.state = 'question';
  for (const k in keys) keys[k] = false;
  $('qTitle').textContent = kind === 'gate' ? '🔒 Porte du Savoir — réponds pour l\'ouvrir !' : 'Bloc mystère !';
  $('qText').textContent = q.text;
  $('qFeed').textContent = ''; $('qFeed').className = 'qfeed';
  const box = $('qChoices'); box.innerHTML = '';
  q.choices.forEach((c, i) => {
    const b = document.createElement('button');
    b.innerHTML = `<span class="k">${i + 1}</span>${c}`;
    b.onclick = () => answer(i);
    box.appendChild(b);
  });
  $('question').classList.remove('hidden');
  showTouch(false);
}

function answer(i) {
  const q = G.q; if (!q || q.locked) return;
  q.locked = true;
  const btns = [...$('qChoices').children];
  const ok = q.choices[i] === q.ans;
  const fast = (performance.now() - q.t0) < 6000;
  G.total++;
  btns.forEach((b, j) => { b.disabled = true; if (q.choices[j] === q.ans) b.classList.add('good'); else if (j === i) b.classList.add('bad'); });
  const fb = $('qFeed');
  let msg = '';
  if (ok) {
    G.good++; G.streak++;
    const pts = (q.kind === 'gate' ? 500 : 100) + (fast ? 50 : 0) + Math.min(G.streak - 1, 5) * 20;
    G.score += pts;
    msg = pick(['Bravo !', 'Excellent !', 'Super !', 'Génial !', 'Parfait !']) + ` +${pts}` + (fast ? ' ⚡' : '');
    if (G.streak % 3 === 0 && G.hearts < 3) { G.hearts++; msg += ' · +1 ❤'; setTimeout(SFX.heart, 300); }
    fb.className = 'qfeed good'; SFX.good();
  } else {
    G.streak = 0;
    msg = `Oups ! La bonne réponse était ${q.ans}.`;
    fb.className = 'qfeed bad'; SFX.bad();
  }
  fb.textContent = msg;
  setTimeout(() => resolveQuestion(ok), ok ? 900 : 1900);
}

function resolveQuestion(ok) {
  const q = G.q; G.q = null;
  $('question').classList.add('hidden');
  const L = G.lvl;
  if (q.kind === 'block') {
    const { tx, ty } = q.data;
    L.t[ty][tx] = 'X';
    L.bump = { tx, ty, t: 10 };
    if (ok) {
      addCoin(tx * T + 16, ty * T - 8);
      if (G.streak >= 5 && G.streak % 5 === 0) { addCoin(tx * T + 16, ty * T - 28); }
      popText(tx * T + 16, ty * T - 30, '✔', '#22c55e');
    } else {
      popText(tx * T + 16, ty * T - 20, '✘', '#ef4444');
    }
  } else if (q.kind === 'gate') {
    const gx = q.data.gx;
    if (ok) {
      for (let y = 0; y < 13; y++) {
        L.t[y][gx] = ' ';
        for (let k = 0; k < 3; k++) G.parts.push({ x: gx * T + 16, y: y * T + 16, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.8) * 6, life: 50, color: pick(['#a855f7', '#f5b82e', '#ffffff']), size: 4 });
      }
      SFX.open();
      popText(gx * T + 16, G.player.y - 10, 'Porte ouverte !', '#a855f7');
    } else {
      G.player.x = gx * T - 70; G.player.vx = 0;
      popText(G.player.x + 10, G.player.y - 10, 'Réessaie !', '#ef4444');
    }
  }
  G.state = 'play';
  showTouch(true);
}

/* ---------- Effets ---------- */
function popText(x, y, text, color) { G.parts.push({ x, y, vx: 0, vy: -0.8, life: 60, text, color }); }
function addCoin(x, y, popup = true) {
  G.coins++; G.score += 50; SFX.coin();
  G.parts.push(popup ? { x, y, vx: 0, vy: -6, life: 32, coin: true } : { x, y, vx: 0, vy: -1, life: 14, coin: true });
  if (G.coins >= 100) { G.coins -= 100; G.lives++; SFX.life(); popText(G.player.x, G.player.y - 20, '+1 VIE', '#22c55e'); }
}

/* ---------- Physique ---------- */
function tileAt(tx, ty) {
  const L = G.lvl;
  if (tx < 0 || tx >= L.w) return '#';
  if (ty < 0) return L.t[0][tx] === 'G' ? 'G' : ' ';
  if (ty >= ROWS) return ' ';
  return L.t[ty][tx];
}

function moveEnt(e, onX, onHead) {
  e.x += e.vx;
  let y0 = Math.floor(e.y / T), y1 = Math.floor((e.y + e.h - 0.01) / T);
  if (e.vx > 0) {
    const tx = Math.floor((e.x + e.w - 0.01) / T);
    for (let ty = y0; ty <= y1; ty++) if (isSolid(tileAt(tx, ty))) { e.x = tx * T - e.w; if (onX) onX(tx, ty, 1); e.vx = 0; e.hitWall = true; break; }
  } else if (e.vx < 0) {
    const tx = Math.floor(e.x / T);
    for (let ty = y0; ty <= y1; ty++) if (isSolid(tileAt(tx, ty))) { e.x = (tx + 1) * T; if (onX) onX(tx, ty, -1); e.vx = 0; e.hitWall = true; break; }
  }
  e.y += e.vy;
  e.onGround = false;
  const x0 = Math.floor(e.x / T), x1 = Math.floor((e.x + e.w - 0.01) / T);
  if (e.vy > 0) {
    const ty = Math.floor((e.y + e.h - 0.01) / T);
    for (let tx = x0; tx <= x1; tx++) if (isSolid(tileAt(tx, ty))) { e.y = ty * T - e.h; e.vy = 0; e.onGround = true; break; }
  } else if (e.vy < 0) {
    const ty = Math.floor(e.y / T);
    const cx = Math.floor((e.x + e.w / 2) / T);
    let hit = null;
    if (isSolid(tileAt(cx, ty))) hit = cx;
    else for (let tx = x0; tx <= x1; tx++) if (isSolid(tileAt(tx, ty))) { hit = tx; break; }
    if (hit !== null) { e.y = (ty + 1) * T; e.vy = 0; if (onHead) onHead(hit, ty); }
  }
}

function hurt() {
  const p = G.player;
  if (p.inv > 0) return;
  G.hearts--;
  if (G.hearts <= 0) { die(); return; }
  p.inv = 100; p.vy = -6; SFX.hurt();
}

function die() {
  if (G.state !== 'play') return;
  G.state = 'dying'; G.anim = 0;
  G.player.vy = -11; G.player.vx = 0;
  SFX.die();
}

function updatePlayer() {
  const p = G.player;
  const run = keys.run;
  const max = run ? 5.2 : 3.4;
  const acc = p.onGround ? 0.45 : 0.3;
  if (keys.left && !keys.right) { p.vx = Math.max(p.vx - acc, -max); p.facing = -1; }
  else if (keys.right && !keys.left) { p.vx = Math.min(p.vx + acc, max); p.facing = 1; }
  else { p.vx *= p.onGround ? 0.78 : 0.95; if (Math.abs(p.vx) < 0.1) p.vx = 0; }
  if (Math.abs(p.vx) > max) p.vx *= 0.92;

  if (p.onGround) p.coyote = 7; else if (p.coyote > 0) p.coyote--;
  if (jumpBuf > 0) jumpBuf--;
  if (jumpBuf > 0 && p.coyote > 0) {
    p.vy = -(11.6 + Math.abs(p.vx) * 0.25); p.coyote = 0; jumpBuf = 0; SFX.jump();
  }
  const grav = (keys.jump && p.vy < 0) ? 0.45 : 0.95;
  p.vy = Math.min(p.vy + grav, 13);

  moveEnt(p, (tx, ty, dir) => {
    if (tileAt(tx, ty) === 'G' && dir > 0 && G.state === 'play') askQuestion('gate', { gx: tx });
  }, (tx, ty) => {
    const c = tileAt(tx, ty);
    if (c === '?') { askQuestion('block', { tx, ty }); }
    else { G.lvl.bump = { tx, ty, t: 8 }; SFX.bump(); }
    // Ennemi sur le bloc tapé
    for (const e of G.enemies) {
      if (!e.dead && e.x + e.w > tx * T && e.x < tx * T + T && Math.abs((e.y + e.h) - ty * T) < 4) kill(e, true);
    }
  });
  if (Math.abs(p.vx) > 0.2 && p.onGround) p.anim += Math.abs(p.vx) * 0.12; else if (p.onGround) p.anim = 0;
  if (p.inv > 0) p.inv--;

  // Pièces
  const L = G.lvl;
  const x0 = Math.floor(p.x / T), x1 = Math.floor((p.x + p.w) / T), y0 = Math.floor(p.y / T), y1 = Math.floor((p.y + p.h) / T);
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    if (ty >= 0 && ty < ROWS && tx >= 0 && tx < L.w && L.t[ty][tx] === 'C') { L.t[ty][tx] = ' '; addCoin(tx * T + 16, ty * T + 8, false); }
  }
  // Chute
  if (p.y > VH + 40) { G.hearts = 0; die(); }
  // Arrivée
  if (p.x + p.w >= L.goalX * T + 12 && G.state === 'play') levelClear();
}

function kill(e, flip) {
  e.dead = 1; e.flip = flip; G.score += 200; SFX.stomp();
  popText(e.x + 12, e.y - 6, '+200', '#fff');
  if (flip) e.vy = -6;
}

function updateEnemies() {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.dead) {
      e.dead++;
      if (e.flip) { e.vy += 0.6; e.y += e.vy; }
      continue;
    }
    if (!e.active) { if (e.x < G.cam + VW + 64) e.active = true; else continue; }
    const sp = e.vx;
    e.vy = Math.min(e.vy + 0.8, 12);
    e.hitWall = false;
    moveEnt(e);
    if (e.hitWall) e.vx = -sp;
    else if (e.onGround) {
      const ax = sp > 0 ? e.x + e.w + 1 : e.x - 1;
      if (!isSolid(tileAt(Math.floor(ax / T), Math.floor((e.y + e.h + 2) / T)))) { e.vx = -sp; }
    }
    if (e.y > VH + 50) e.dead = 999;
    // Collision joueur
    if (p.x < e.x + e.w && p.x + p.w > e.x && p.y < e.y + e.h && p.y + p.h > e.y) {
      if (p.vy > 0 && p.y + p.h - e.y < 16) {
        kill(e, false); p.vy = keys.jump ? -11 : -7;
      } else hurt();
    }
  }
  G.enemies = G.enemies.filter(e => e.dead < 40 || (e.flip && e.y < VH + 60 && e.dead < 200));
}

function levelClear() {
  G.state = 'clear'; G.anim = 0;
  G.player.vx = 0; G.player.vy = 0;
  G.player.x = G.lvl.goalX * T + 12 - G.player.w;
  SFX.win();
}

function finishLevelScreen() {
  const timeBonus = Math.ceil(G.time) * 5;
  const pct = G.total ? Math.round(100 * G.good / G.total) : 100;
  const accBonus = pct === 100 && G.total > 0 ? 1000 : Math.round(pct * 5);
  G.score += timeBonus + accBonus;
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;
  if (G.level >= unlocked && G.level < LEVELS.length) { unlocked = G.level + 1; store.set('unlocked', unlocked); }
  saveBest();
  const last = G.level === LEVELS.length;
  const body = `
    <div style="font-size:2em;letter-spacing:4px">${'★'.repeat(stars)}<span style="color:#d1d5db">${'★'.repeat(3 - stars)}</span></div>
    <table>
      <tr><td>Bonnes réponses</td><td>${G.good} / ${G.total} (${pct}%)</td></tr>
      <tr><td>Bonus temps</td><td>+${timeBonus}</td></tr>
      <tr><td>Bonus précision</td><td>+${accBonus}</td></tr>
      <tr><td>Score</td><td>${G.score}</td></tr>
    </table>
    ${last ? '<p>🏆 <b>Tu as conquis la Citadelle du Grand Calcul !</b><br>Tu es un vrai champion des maths !</p>' : ''}`;
  showMessage(last ? 'Victoire finale !' : `Monde ${G.level} terminé !`, body, last ? [
    ['Menu', showMenu, 'big']
  ] : [
    ['Monde suivant ▶', () => { G.hearts = Math.max(G.hearts, 1); startLevel(G.level + 1); }, 'big'],
    ['Menu', showMenu]
  ]);
}

function saveBest() { if (G.score > best) { best = G.score; store.set('best', best); } }

function afterDeath() {
  G.lives--;
  if (G.lives <= 0) {
    saveBest();
    G.state = 'over';
    showMessage('Partie terminée', `<p>Score : <b>${G.score}</b><br>Meilleur score : <b>${best}</b></p><p>Bonnes réponses : ${G.good} / ${G.total}</p>`, [
      ['Rejouer ce monde', () => startGame(G.level), 'big'],
      ['Menu', showMenu]
    ]);
  } else {
    G.hearts = 3; G.streak = 0;
    startLevel(G.level);
  }
}

/* ---------- Boucle principale ---------- */
function update() {
  G.frame++;
  if (G.state === 'play') {
    updatePlayer();
    if (G.state === 'play' || G.state === 'question') updateEnemies();
    G.time -= 1 / 60;
    if (G.time <= 0) { G.time = 0; G.hearts = 0; die(); }
    if (G.banner > 0) G.banner--;
  } else if (G.state === 'dying') {
    G.anim++;
    const p = G.player;
    if (G.anim > 30) { p.vy += 0.6; p.y += p.vy; }
    if (G.anim > 150) afterDeath();
  } else if (G.state === 'clear') {
    G.anim++;
    const p = G.player;
    if (p.y + p.h < 13 * T) { p.y = Math.min(p.y + 4, 13 * T - p.h); }
    else if (G.anim > 30) { p.x += 2; p.facing = 1; p.anim += 0.25; p.onGround = true; p.vx = 2; }
    if (G.anim === 150) { finishLevelScreen(); G.state = 'cleared'; }
  }
  if (G.lvl && G.player && G.state !== 'menu') {
    const target = G.player.x + G.player.w / 2 - VW * 0.4;
    G.cam = Math.max(0, Math.min(G.lvl.w * T - VW, target));
  }
  // Particules
  for (const pt of G.parts) {
    pt.x += pt.vx; pt.y += pt.vy; pt.life--;
    if (pt.coin) pt.vy += 0.35; else if (pt.size) pt.vy += 0.15;
  }
  G.parts = G.parts.filter(pt => pt.life > 0);
  if (G.lvl && G.lvl.bump) { G.lvl.bump.t--; if (G.lvl.bump.t <= 0) G.lvl.bump = null; }
}

/* ---------- Dessin ---------- */
function theme() { return THEMES[(G.level - 1) % THEMES.length]; }

const BG_SYMBOLS = ['+', '−', '×', '÷', '=', '7', '3', '9', 'π', '%', '2', '5', '√', '8'];
function drawBackground() {
  const th = theme();
  const g = ctx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  const cam = G.cam;

  if (th.night) {
    for (let i = 0; i < 70; i++) {
      const sx = ((i * 137.5 - cam * 0.05) % VW + VW) % VW, sy = (i * 61) % 260;
      ctx.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(G.frame * 0.02 + i));
      ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy, 2, 2);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fdf6d8'; ctx.beginPath(); ctx.arc(640, 80, 30, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = 'rgba(255,240,150,.9)'; ctx.beginPath(); ctx.arc(650, 75, 34, 0, 7); ctx.fill();
  }

  // Symboles mathématiques flottants
  ctx.font = 'bold 34px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = th.night ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.35)';
  for (let i = 0; i < 18; i++) {
    const sx = ((i * 211 - cam * 0.15) % (VW + 100) + VW + 100) % (VW + 100) - 50;
    const sy = 60 + (i * 47) % 200 + Math.sin(G.frame * 0.02 + i) * 6;
    ctx.fillText(BG_SYMBOLS[i % BG_SYMBOLS.length], sx, sy);
  }

  // Nuages
  if (!th.night) {
    ctx.fillStyle = 'rgba(255,255,255,.9)';
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 290 - cam * 0.25) % (VW + 200) + VW + 200) % (VW + 200) - 100, cy = 50 + (i * 53) % 110;
      cloud(cx, cy);
    }
  }
  // Collines lointaines
  hills(cam * 0.3, th.far, 300, 70, 0.006);
  hills(cam * 0.5, th.near, 350, 50, 0.011);
  if (th.trees) {
    for (let i = 0; i < 14; i++) {
      const tx = ((i * 97 - cam * 0.5) % (VW + 80) + VW + 80) % (VW + 80) - 40;
      ctx.fillStyle = '#5a3a22'; ctx.fillRect(tx - 3, 330, 6, 40);
      ctx.fillStyle = '#226b3a'; ctx.beginPath(); ctx.arc(tx, 325, 20, 0, 7); ctx.fill();
    }
  }
}
function cloud(x, y) {
  ctx.beginPath(); ctx.arc(x, y, 18, 0, 7); ctx.arc(x + 20, y - 8, 22, 0, 7); ctx.arc(x + 44, y, 18, 0, 7); ctx.rect(x, y, 44, 18); ctx.fill();
}
function hills(off, color, base, amp, freq) {
  ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, VH);
  for (let x = 0; x <= VW; x += 8) {
    const wx = x + off;
    ctx.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(wx * freq)) - amp * 0.4 * Math.sin(wx * freq * 2.3 + 1));
  }
  ctx.lineTo(VW, VH); ctx.closePath(); ctx.fill();
}

function rr(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }

function drawTiles() {
  const L = G.lvl, th = theme(), cam = G.cam;
  const c0 = Math.max(0, Math.floor(cam / T)), c1 = Math.min(L.w - 1, Math.floor((cam + VW) / T) + 1);
  const ops = LEVELS[G.level - 1].ops;
  const sym = SHOW[ops[Math.floor(G.frame / 60) % ops.length]];
  for (let ty = 0; ty < ROWS; ty++) for (let tx = c0; tx <= c1; tx++) {
    const c = L.t[ty][tx]; if (c === ' ') continue;
    let x = tx * T - cam, y = ty * T;
    if (L.bump && L.bump.tx === tx && L.bump.ty === ty) y -= Math.sin((L.bump.t / 10) * Math.PI) * 8;
    switch (c) {
      case '#': {
        ctx.fillStyle = th.dirt; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = th.dirtD;
        ctx.fillRect(x + 6, y + 12, 4, 4); ctx.fillRect(x + 20, y + 22, 4, 4); ctx.fillRect(x + 24, y + 8, 3, 3);
        if (!isSolid(tileAt(tx, ty - 1)) || tileAt(tx, ty - 1) === 'G') {
          ctx.fillStyle = th.grass; ctx.fillRect(x, y, T, 8);
          ctx.fillRect(x + 4, y + 8, 4, 3); ctx.fillRect(x + 18, y + 8, 5, 4);
        }
        break;
      }
      case 'S':
        ctx.fillStyle = '#8a8f9c'; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = '#b4b9c4'; ctx.fillRect(x, y, T, 4); ctx.fillRect(x, y, 4, T);
        ctx.fillStyle = '#5f636e'; ctx.fillRect(x, y + T - 4, T, 4); ctx.fillRect(x + T - 4, y, 4, T);
        break;
      case 'B':
        ctx.fillStyle = '#c6532e'; ctx.fillRect(x, y, T, T);
        ctx.fillStyle = '#7a2e17';
        ctx.fillRect(x, y + 15, T, 2); ctx.fillRect(x, y + T - 2, T, 2);
        ctx.fillRect(x + 15, y, 2, 15); ctx.fillRect(x + 7, y + 17, 2, 15); ctx.fillRect(x + 23, y + 17, 2, 15);
        break;
      case '?': {
        const pulse = 0.5 + 0.5 * Math.sin(G.frame * 0.08);
        ctx.fillStyle = '#1f2937'; rr(x, y, T, T, 5); ctx.fill();
        ctx.fillStyle = `rgb(${40 + pulse * 30},${170 + pulse * 30},${200 + pulse * 30})`; rr(x + 2, y + 2, T - 4, T - 4, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(x + 5, y + 5, 4, 4);
        ctx.fillStyle = '#fff'; ctx.font = 'bold 24px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(sym, x + 16, y + 17); ctx.textBaseline = 'alphabetic';
        break;
      }
      case 'X':
        ctx.fillStyle = '#1f2937'; rr(x, y, T, T, 5); ctx.fill();
        ctx.fillStyle = '#8c6a4f'; rr(x + 2, y + 2, T - 4, T - 4, 4); ctx.fill();
        ctx.fillStyle = '#6b4f3a'; ctx.fillRect(x + 6, y + 6, 3, 3); ctx.fillRect(x + 23, y + 6, 3, 3); ctx.fillRect(x + 6, y + 23, 3, 3); ctx.fillRect(x + 23, y + 23, 3, 3);
        break;
      case 'G': {
        const glow = 0.6 + 0.4 * Math.sin(G.frame * 0.1 + ty);
        ctx.fillStyle = `rgba(124,58,237,${0.55 + 0.25 * glow})`; ctx.fillRect(x + 4, y, T - 8, T);
        ctx.fillStyle = '#c4b5fd'; ctx.fillRect(x + 8, y, 3, T); ctx.fillRect(x + 21, y, 3, T);
        ctx.fillStyle = '#4c1d95'; ctx.fillRect(x + 2, y, 3, T); ctx.fillRect(x + T - 5, y, 3, T);
        if (ty === 10) {
          ctx.fillStyle = '#f5b82e'; rr(x + 6, y + 10, 20, 16, 3); ctx.fill();
          ctx.strokeStyle = '#f5b82e'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x + 16, y + 10, 6, Math.PI, 0); ctx.stroke();
          ctx.fillStyle = '#1f2937'; ctx.font = 'bold 13px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('?', x + 16, y + 23);
        }
        break;
      }
      case 'C': {
        const w = Math.abs(Math.sin(G.frame * 0.08 + tx)) * 10 + 2;
        ctx.fillStyle = '#b7791f'; ctx.beginPath(); ctx.ellipse(x + 16, y + 16, w + 1.5, 12, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fcd34d'; ctx.beginPath(); ctx.ellipse(x + 16, y + 16, w, 10.5, 0, 0, 7); ctx.fill();
        if (w > 6) { ctx.fillStyle = '#b7791f'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('1', x + 16, y + 20); }
        break;
      }
    }
  }
  // Drapeau d'arrivée et tour
  const gx = L.goalX * T - cam;
  if (gx > -200 && gx < VW + 50) {
    ctx.fillStyle = '#e5e7eb'; ctx.fillRect(gx + 14, 3 * T, 4, 10 * T);
    ctx.fillStyle = '#f5b82e'; ctx.beginPath(); ctx.arc(gx + 16, 3 * T, 7, 0, 7); ctx.fill();
    const fy = G.state === 'clear' || G.state === 'cleared' ? Math.min(11 * T, 3 * T + 8 + G.anim * 3) : 3 * T + 8;
    const wave = Math.sin(G.frame * 0.15) * 3;
    ctx.fillStyle = '#e4572e'; ctx.beginPath(); ctx.moveTo(gx + 18, fy); ctx.lineTo(gx + 58, fy + 12 + wave); ctx.lineTo(gx + 18, fy + 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px serif'; ctx.textAlign = 'center'; ctx.fillText('π', gx + 32, fy + 18);
    // Tour
    const cx = gx + 4 * T;
    ctx.fillStyle = '#9ca3af'; ctx.fillRect(cx, 8 * T, 4 * T, 5 * T);
    for (let i = 0; i < 4; i++) ctx.fillRect(cx + i * T + 4, 7 * T + 8, T - 8, 24);
    ctx.fillStyle = '#6b7280';
    for (let r = 0; r < 5; r++) for (let i = 0; i < 4; i++) ctx.fillRect(cx + i * T + (r % 2) * 16, 8 * T + r * T + 15, 16, 2);
    ctx.fillStyle = '#1f2937'; rr(cx + 1.5 * T - 4, 11 * T - 8, T + 8, 2 * T + 8, 14); ctx.fill();
    ctx.fillStyle = '#f5b82e'; ctx.font = 'bold 22px serif'; ctx.fillText('∑', cx + 2 * T, 10 * T);
  }
}

function drawHero(p) {
  if (p.inv > 0 && Math.floor(p.inv / 4) % 2 && G.state === 'play') return;
  if ((G.state === 'clear' || G.state === 'cleared') && p.x > (G.lvl.goalX + 5.5) * T) return;
  const x = Math.round(p.x - G.cam), y = Math.round(p.y);
  ctx.save(); ctx.translate(x + p.w / 2, y);
  if (p.facing < 0) ctx.scale(-1, 1);
  const moving = p.onGround && Math.abs(p.vx) > 0.3;
  const s = moving ? Math.sin(p.anim) : 0;
  const air = !p.onGround && G.state !== 'clear';
  // sac à dos
  ctx.fillStyle = '#f5b82e'; rr(-13, 12, 6, 11, 2); ctx.fill();
  // jambes
  ctx.fillStyle = '#374151';
  if (air) { ctx.fillRect(-8, 21, 6, 5); ctx.fillRect(3, 19, 6, 5); }
  else { ctx.fillRect(-7 + s * 3, 22, 6, 4); ctx.fillRect(1 - s * 3, 22, 6, 4); }
  ctx.fillStyle = '#5b3a1e';
  if (air) { ctx.fillRect(-9, 25, 8, 3); ctx.fillRect(3, 23, 8, 3); }
  else { ctx.fillRect(-8 + s * 3, 25, 8, 3); ctx.fillRect(1 - s * 3, 25, 8, 3); }
  // corps
  ctx.fillStyle = '#2f6fde'; rr(-8, 13, 16, 11, 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('=', 1, 21);
  // bras
  ctx.fillStyle = '#f6c9a0';
  if (air) ctx.fillRect(5, 8, 4, 7); else ctx.fillRect(4 - s * 2, 15, 4, 7);
  // tête
  ctx.fillStyle = '#f6c9a0'; ctx.beginPath(); ctx.arc(0, 8, 7.5, 0, 7); ctx.fill();
  // casquette
  ctx.fillStyle = '#16a37a'; ctx.beginPath(); ctx.arc(0, 7, 8, Math.PI, 0); ctx.fill();
  ctx.fillRect(2, 5, 9, 3);
  ctx.fillStyle = '#fff'; ctx.fillRect(-3, 1, 4, 1.5); ctx.fillRect(-1.75, -0.25, 1.5, 4);
  // cheveux
  ctx.fillStyle = '#4a2f1b'; ctx.fillRect(-8, 6, 4, 4);
  // oeil + sourire
  ctx.fillStyle = '#111'; ctx.fillRect(3, 8, 2, 3);
  ctx.fillRect(2, 12.5, 4, 1);
  ctx.restore();
}

function drawEnemy(e) {
  const x = Math.round(e.x - G.cam), y = Math.round(e.y);
  if (x < -40 || x > VW + 40) return;
  ctx.save(); ctx.translate(x + e.w / 2, y + e.h);
  if (e.dead && !e.flip) ctx.scale(1.3, 0.35);
  if (e.flip) ctx.scale(1, -1), ctx.translate(0, e.h);
  const sq = e.dead ? 0 : Math.sin(G.frame * 0.25 + e.x) * 1.5;
  ctx.fillStyle = '#7c3aed';
  ctx.beginPath(); ctx.ellipse(0, -12 + sq * 0.3, 13 - sq * 0.3, 12 + sq * 0.3, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#5b21b6'; ctx.fillRect(-11, -3, 7, 3); ctx.fillRect(4, -3, 7, 3);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-5, -15, 4, 0, 7); ctx.arc(5, -15, 4, 0, 7); ctx.fill();
  const look = e.vx > 0 ? 1.5 : -1.5;
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(-5 + look, -15, 2, 0, 7); ctx.arc(5 + look, -15, 2, 0, 7); ctx.fill();
  ctx.fillStyle = '#111'; ctx.fillRect(-8, -22, 6, 2); ctx.fillRect(2, -22, 6, 2);
  ctx.fillStyle = '#fde68a'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(e.num, 0, -5);
  ctx.restore();
}

function drawParticles() {
  for (const p of G.parts) {
    const x = p.x - G.cam;
    if (p.coin) {
      const w = Math.abs(Math.sin(p.life * 0.5)) * 9 + 2;
      ctx.fillStyle = '#fcd34d'; ctx.beginPath(); ctx.ellipse(x, p.y, w, 10, 0, 0, 7); ctx.fill();
    } else if (p.text) {
      ctx.globalAlpha = Math.min(1, p.life / 20);
      ctx.font = 'bold 16px Trebuchet MS, sans-serif'; ctx.textAlign = 'center';
      ctx.strokeStyle = '#1f2937'; ctx.lineWidth = 3; ctx.strokeText(p.text, x, p.y);
      ctx.fillStyle = p.color; ctx.fillText(p.text, x, p.y);
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = Math.min(1, p.life / 20);
      ctx.fillStyle = p.color; ctx.fillRect(x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }
}

function heart(x, y, full) {
  ctx.fillStyle = full ? '#ef4444' : 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.bezierCurveTo(x, y, x - 7, y - 1, x - 7, y + 4); ctx.bezierCurveTo(x - 7, y + 8, x, y + 11, x, y + 14);
  ctx.bezierCurveTo(x, y + 11, x + 7, y + 8, x + 7, y + 4); ctx.bezierCurveTo(x + 7, y - 1, x, y, x, y + 4); ctx.fill();
}

function drawHUD() {
  ctx.fillStyle = 'rgba(15,23,42,.55)'; ctx.fillRect(0, 0, VW, 32);
  ctx.font = 'bold 15px Trebuchet MS, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = '#fff';
  ctx.fillText('SCORE ' + String(G.score).padStart(6, '0'), 10, 21);
  ctx.fillStyle = '#fcd34d'; ctx.beginPath(); ctx.ellipse(170, 16, 7, 9, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillText('× ' + G.coins, 182, 21);
  for (let i = 0; i < 3; i++) heart(245 + i * 20, 9, i < G.hearts);
  ctx.fillStyle = '#fff';
  ctx.fillText('VIES × ' + G.lives, 315, 21);
  ctx.fillText('MONDE ' + G.level, 410, 21);
  ctx.fillStyle = G.time < 50 ? '#fca5a5' : '#fff';
  ctx.fillText('⏱ ' + Math.ceil(G.time), 500, 21);
  ctx.fillStyle = '#fff';
  ctx.fillText('✔ ' + G.good + '/' + G.total, 570, 21);
  if (G.streak >= 2) { ctx.fillStyle = '#fdba74'; ctx.fillText('🔥 ×' + G.streak, 650, 21); }

  if (G.banner > 0 && G.state === 'play') {
    const a = Math.min(1, G.banner / 30);
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(15,23,42,.7)'; rr(VW / 2 - 220, 150, 440, 80, 14); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = '#fcd34d'; ctx.font = 'bold 18px Trebuchet MS, sans-serif';
    ctx.fillText('MONDE ' + G.level, VW / 2, 180);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 26px Trebuchet MS, sans-serif';
    ctx.fillText(LEVELS[G.level - 1].name, VW / 2, 213);
    ctx.globalAlpha = 1;
  }
}

function drawMenuScene() {
  // Décor animé derrière le menu
  G.cam = (G.frame * 0.8) % 100000;
  drawBackground();
  const th = theme();
  for (let x = 0; x < VW + T; x += T) {
    const sx = x - (G.cam % T);
    ctx.fillStyle = th.dirt; ctx.fillRect(sx, 13 * T, T, 2 * T);
    ctx.fillStyle = th.grass; ctx.fillRect(sx, 13 * T, T, 8);
  }
}

function render() {
  ctx.clearRect(0, 0, VW, VH);
  if (G.state === 'menu' || !G.lvl) { drawMenuScene(); return; }
  drawBackground();
  drawTiles();
  for (const e of G.enemies) drawEnemy(e);
  drawHero(G.player);
  drawParticles();
  drawHUD();
}

/* ---------- Boucle à pas fixe ---------- */
let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
  render();
  requestAnimationFrame(loop);
}
showMenu();
requestAnimationFrame(loop);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
}
