#!/usr/bin/env node
// Play harness for Pocket Arcade (html-games). Two jobs:
//
//  1. --mode sweep        Opens the hub (index.html), reads its `games` array and drives EVERY linked game for
//                         --secs seconds (default 20) with a generic policy (keys, clicks/taps, drags, buttons).
//                         Per game it records load time, page errors, console errors, same-origin 4xx, NaN/undefined
//                         text, fps, heap, whether the screen changed under input, localStorage use and whether the
//                         "← Hub" back link resolves. Exit 1 when any game loads with an error, shows NaN/undefined,
//                         hits a same-origin 4xx (including a dead back link) or the hub renders the wrong card count.
//  2. --game <slug>       Full episode harness for one of the four profiled games (survivor-wave, chess,
//                         isle-of-bells, math-battle): start a run, act every tick from a game-specific policy,
//                         reach an end state, restart, repeat for --episodes, optionally under a stress mode.
//                         Exit 1 on page error, NaN/undefined/out-of-bounds state, illegal phase transition, stuck
//                         (playing but no state change for stuckAfterMs), no progression signal, failed restart,
//                         or heap growth past the limit in long mode.
//
//   node tools/harness/play.mjs --mode sweep [--secs 20] [--only snake,chess] [--touch]
//   node tools/harness/play.mjs --game survivor-wave [--episodes 3] [--secs 60]
//                               [--mode default|mobile|storm|resize|blur|storage-blocked|long]
//   common: [--url http://host/prefix/] [--out harness-out] [--seed 7] [--fault <name>] [--base /html-games/]
//
// The built-in server serves the repo under --base (default /html-games/, the GitHub Pages project path) so that
// relative links resolve exactly as they do on the live site.
// --fault <name> injects a known break (a rewritten served file) to prove this harness can fail. That run MUST exit 1.
// Playwright: `npm install --no-save playwright@1.56.1 && npx playwright install chromium` (same as .github/smoke.mjs).

import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const requireLocal = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = requireLocal('playwright')); }
catch { ({ chromium } = createRequire('/opt/node-tools/node_modules/')('playwright')); }

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');

// ---------------------------------------------------------------------------------------------
// Per-game profiles. Each readState runs INSIDE the page every tick and reads the game's own top-level
// bindings (`state`, `player`, `game`, ...) or the read-only window.__harness hook (isle-of-bells).
// phase is one of 'menu' | 'playing' | 'paused' | 'over'. Numeric fields are checked for NaN every tick.
// Action shapes returned by a policy: {key:'ArrowLeft', hold:120} {keys:['ArrowUp','ArrowLeft'], hold:120}
// {click:[x,y]} {tap:[x,y]} {drag:[x1,y1,x2,y2,ms]} {tdrag:[x1,y1,x2,y2,ms]} {sel:'#button'} {wheel:dy}
// ---------------------------------------------------------------------------------------------
const GAMES = {
  'survivor-wave': {
    name: 'Survivor Wave', entry: 'survivor-wave.html', viewport: { width: 1280, height: 720 },
    // survivor-wave.html:738 `let state` is 'ready'|'play'|'paused'|'levelup'|'chest'|'over'|'win'.
    readState: () => {
      const raw = state;
      const phase = raw === 'ready' ? 'menu' : raw === 'paused' ? 'paused' : (raw === 'over' || raw === 'win') ? 'over' : 'playing';
      let ne = null, ng = null;
      if (raw === 'play') {
        let bd = 1e9; for (const e of enemies) { const d = Math.hypot(e.x - player.x, e.y - player.y); if (d < bd) { bd = d; ne = { dx: Math.round(e.x - player.x), dy: Math.round(e.y - player.y), d: Math.round(d) }; } }
        bd = 1e9; for (const g of gems) { const d = Math.hypot(g.x - player.x, g.y - player.y); if (d < bd) { bd = d; ng = { dx: Math.round(g.x - player.x), dy: Math.round(g.y - player.y), d: Math.round(d) }; } }
      }
      return { phase, raw, hp: Math.round(player.hp), maxHp: player.maxHp, level: player.level, kills: player.kills, time: Math.floor(gameTime), score, gold, enemies: enemies.length, dashCd: Math.round(player.dashCd * 10) / 10, ne, ng };
    },
    transitions: { menu: ['playing'], playing: ['paused', 'over', 'menu'], paused: ['playing', 'menu'], over: ['playing', 'menu'] },
    start: async (page) => { await page.click('#playBtn', { timeout: 5000 }); },
    restart: async (page) => {
      if (await page.isVisible('#win')) await page.click('#winAgainBtn', { timeout: 5000 });
      else await page.click('#againBtn', { timeout: 5000 });
    },
    // Heuristic: flee the nearest enemy when it is close, otherwise walk to the nearest XP gem; dash when cornered;
    // pick the first level-up card; open chests; fire the ult / place a turret now and then.
    policy: (s, tick, rnd) => {
      if (s.raw === 'levelup') return [{ sel: '#lvlChoices button' }];
      if (s.raw === 'chest') return [{ sel: '#chestBtn' }];
      const acts = [];
      let dx = 0, dy = 0;
      if (s.ne && s.ne.d < 150) { dx = -s.ne.dx; dy = -s.ne.dy; if (s.ne.d < 70 && s.dashCd <= 0) acts.push({ key: 'Space' }); }
      else if (s.ng) { dx = s.ng.dx; dy = s.ng.dy; }
      else { dx = rnd() - 0.5; dy = rnd() - 0.5; }
      const keys = [];
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10 || (!s.ne && !s.ng)) {
        if (Math.abs(dx) >= Math.abs(dy) * 0.5) keys.push(dx < 0 ? 'ArrowLeft' : 'ArrowRight');
        if (Math.abs(dy) >= Math.abs(dx) * 0.5) keys.push(dy < 0 ? 'ArrowUp' : 'ArrowDown');
      }
      if (keys.length) acts.push({ keys, hold: 140 });
      if (tick % 50 === 25) acts.push({ key: 'KeyR' });
      if (tick % 80 === 40) acts.push({ key: 'KeyT' });
      return acts;
    },
    // Touch: the game's joystick is a drag anywhere on the canvas (survivor-wave.html:1007 tStart).
    touchPolicy: (s, tick, rnd, vp) => {
      if (s.raw === 'levelup') return [{ sel: '#lvlChoices button' }];
      if (s.raw === 'chest') return [{ sel: '#chestBtn' }];
      let dx = 0, dy = 0;
      if (s.ne && s.ne.d < 150) { dx = -s.ne.dx; dy = -s.ne.dy; }
      else if (s.ng) { dx = s.ng.dx; dy = s.ng.dy; }
      else { dx = rnd() - 0.5; dy = rnd() - 0.5; }
      const l = Math.hypot(dx, dy) || 1, cx = vp.width / 2, cy = vp.height * 0.6;
      const acts = [{ tdrag: [cx, cy, cx + dx / l * 70, cy + dy / l * 70, 160] }];
      if (s.ne && s.ne.d < 70 && tick % 3 === 0) acts.push({ sel: '#dashBtn' });
      return acts;
    },
    progression: ['kills', 'level'],
    bounded: { level: [1, 300], kills: [0, 1e6], enemies: [0, 2000] },
    tickMs: 100, stuckAfterMs: 15000, heapLimitMB: 80,
    faults: {
      // Breaks the FIGHT button: survivor-wave.html:5294 wires `document.getElementById('playBtn').onclick`, so the
      // page throws a TypeError at load and the harness must report "page error" + "could not start".
      'no-start': (body) => body.replace('id="playBtn"', 'id="playBtn-broken"'),
    },
  },

  chess: {
    name: 'Chess Juice', entry: 'chess.html', viewport: { width: 1280, height: 720 },
    // chess.html:878 `let game` {gameOver,result,turn,moveHistory}; a game is running as soon as the page loads.
    // Picks a random legal move for the human side (captures first) and returns its from/to pixel centres.
    readState: () => {
      const over = !!game.gameOver;
      const human = !over && !botThinking && !(botEnabled && game.turn === botColor);
      let mv = null;
      if (human && !pendingPromo) {
        const ms = getAllLegalMoves(game.board, game.turn, game.epTarget, game.castlingRights);
        if (ms.length) {
          const caps = ms.filter(m => m.capture);
          const pool = caps.length ? caps : ms;
          const m = pool[Math.floor(Math.random() * pool.length)];
          const rect = canvas.getBoundingClientRect(), sx = rect.width / canvas.width;
          const px = (sq) => { const r = row(sq), c = col(sq); const rr = flip ? 7 - r : r, cc = flip ? 7 - c : c; return [Math.round(rect.left + (padding + cc * sqSize + sqSize / 2) * sx), Math.round(rect.top + (padding + rr * sqSize + sqSize / 2) * sx)]; };
          mv = { from: px(m.from), to: px(m.to) };
        }
      }
      return { phase: over ? 'over' : 'playing', moves: game.moveHistory.length, turn: game.turn, botThinking, promo: !!pendingPromo,
        capW: game.capturedByWhite.length, capB: game.capturedByBlack.length, clockW: clockWhite, result: game.result, mv };
    },
    transitions: { playing: ['over'], over: ['playing'] },
    start: async (page) => { /* chess has no menu: a game is live at load (chess.html:1771 resetGame on init) */ },
    restart: async (page) => { await page.click('#btnReset', { timeout: 5000 }); },
    policy: (s) => {
      if (s.promo) return [{ sel: '.promo-btn' }];
      if (s.mv) return [{ click: s.mv.from }, { click: s.mv.to }];
      return [];
    },
    progression: ['moves'],
    bounded: { moves: [0, 1000], capW: [0, 15], capB: [0, 15], clockW: [0, 180] },
    tickMs: 150, stuckAfterMs: 20000, heapLimitMB: 60,
    faults: {
      // chess.html:2026 `document.getElementById('btnReset').addEventListener` -> TypeError at load.
      'no-reset': (body) => body.replace('id="btnReset"', 'id="btnReset-broken"'),
    },
  },

  'isle-of-bells': {
    name: 'Isle of Bells', entry: 'isle-of-bells.html', viewport: { width: 1280, height: 720 },
    // The game is an IIFE; it exposes the read-only window.__harness hook (isle-of-bells.html, end of the IIFE).
    readState: () => {
      const g = window.__harness && window.__harness();
      if (!g) return { phase: 'unreadable' };
      return g;
    },
    transitions: { menu: ['playing'], playing: ['menu'] },
    start: async (page) => { if (await page.isVisible('#ovIntro')) await page.click('#playBtn', { timeout: 5000 }); },
    restart: async (page) => { await page.reload({ waitUntil: 'load' }); await page.waitForTimeout(800); if (await page.isVisible('#ovIntro')) await page.click('#playBtn', { timeout: 5000 }); },
    // Heuristic: close any open drawer; otherwise walk to the nearest tree and shake it, or to the nearest bug and
    // swing the net (Space = doAction, isle-of-bells.js:1858); every so often cycle the tool (T).
    policy: (s, tick, rnd) => {
      if (s.anyOpen) return [{ sel: '.ov:not(.hidden) .x, .ov:not(.hidden) [data-close]' }];
      const acts = [];
      if (s.bugNear && s.bugNear.d < 1.6) acts.push({ key: 'Space' });
      const r = rnd();
      if (r < 0.45 && s.tree) acts.push({ click: s.tree });
      else if (r < 0.8 && s.bug) acts.push({ click: s.bug });
      else if (r < 0.9 && s.water) acts.push({ click: s.water });
      else acts.push({ key: 'Space' });
      if (tick % 120 === 60) acts.push({ key: 'KeyT' });
      return acts;
    },
    progression: ['shakes', 'bugs', 'bellsEarned', 'digs', 'fish', 'harvests'],
    bounded: { bells: [0, 1e9], bag: [0, 20], day: [1, 100000] },
    tickMs: 150, stuckAfterMs: 20000, heapLimitMB: 60,
    faults: {
      // isle-of-bells.html bindUI: `$("playBtn").addEventListener` -> TypeError at load (null element).
      'no-sail': (body) => body.replace('id="playBtn"', 'id="playBtn-broken"'),
    },
  },

  'math-battle': {
    name: 'Math Battle', entry: 'math-battle.html', viewport: { width: 1280, height: 720 },
    // math-battle.html:161 `let state` is 'ready'|'play'|'shop'|'menu'(trophy/medal overlay)|'pause'|'over'.
    readState: () => {
      const phase = state === 'ready' ? 'menu' : state === 'over' ? 'over' : state === 'pause' ? 'paused' : 'playing';
      const c = (id) => { const e = document.getElementById(id); if (!e) return null; const b = e.getBoundingClientRect(); return [Math.round(b.left + b.width / 2), Math.round(b.top + b.height / 2)]; };
      const btns = [...document.querySelectorAll('#answers button')].map(b => { const r = b.getBoundingClientRect(); return { v: +b.textContent, x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; });
      return { phase, raw: state, hp: P.hp, level: P.level, xp: P.xp, gold: P.gold, kills, combo, ans: currentAns, lock, mhp: M.hp, btns,
        shopBtn: c('shopBtn'), shopClose: c('shopClose'), buySword: c('buySword'), trophyClose: c('trophyClose'), medalClose: c('medalClose') };
    },
    transitions: { menu: ['playing'], playing: ['over', 'paused'], paused: ['playing'], over: ['playing'] },
    start: async (page) => { await page.click('#playBtn', { timeout: 5000 }); },
    restart: async (page) => { await page.click('#restartBtn', { timeout: 5000 }); },
    // Heuristic: answer the shown question (correct 75 % of the time so damage, death and revive paths are
    // exercised too), visit the shop every ~60 ticks and try to buy a sword, close trophy/medal drawers.
    policy: (s, tick, rnd) => {
      if (s.raw === 'shop') return rnd() < 0.5 ? [{ click: s.buySword }] : [{ click: s.shopClose }];
      if (s.raw === 'menu') return [{ click: s.trophyClose }, { click: s.medalClose }];
      if (s.lock || !s.btns || !s.btns.length) return [];
      if (tick % 60 === 59 && s.shopBtn) return [{ click: s.shopBtn }];
      const right = s.btns.find(b => b.v === s.ans);
      const wrong = s.btns.filter(b => b.v !== s.ans);
      const pick = (rnd() < 0.75 || !wrong.length) ? right : wrong[Math.floor(rnd() * wrong.length)];
      return pick ? [{ click: [pick.x, pick.y] }] : [];
    },
    progression: ['kills', 'xp'],
    bounded: { level: [1, 100], gold: [0, 1e9], combo: [0, 3], kills: [0, 1e6] },
    tickMs: 120, stuckAfterMs: 15000, heapLimitMB: 60,
    faults: {
      // math-battle.html:350 onKill `kills++;` -> kills becomes NaN after the first kill: readState must flag it.
      'nan-kills': (body) => body.replace('kills++;', 'kills+=undefined;'),
    },
  },
};

// Faults that break the hub itself (used with --mode sweep).
const HUB_FAULTS = {
  // Points one card at a file that does not exist: the sweep must report HTTP 404 for that game.
  'dead-link': (body) => body.replace('"snake.html"', '"snake-missing.html"'),
};

// ---------------------------------------------------------------------------------------------
const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
const has = (n) => { const i = args.indexOf(n); if (i < 0) return false; args.splice(i, 1); return true; };
const MODE = flag('--mode', 'default');
const GAME_ID = flag('--game', 'survivor-wave');
const EPISODES = +flag('--episodes', '3');
const SECS = +flag('--secs', MODE === 'long' ? '180' : MODE === 'sweep' ? '20' : '60');
const URL_ = flag('--url', null);
const OUT = path.resolve(flag('--out', 'harness-out'));
let seed = +flag('--seed', '7');
const FAULT = flag('--fault', null);
const BASE = flag('--base', '/html-games/');
const ONLY = (flag('--only', '') || '').split(',').filter(Boolean);
const TOUCH = has('--touch');
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
fs.mkdirSync(OUT, { recursive: true });

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
let server, base;
if (URL_) base = URL_.endsWith('/') ? URL_ : URL_ + '/';
else {
  // Serves the repo under BASE (like GitHub Pages at https://<user>.github.io/html-games/). Anything outside BASE is 404.
  server = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    if (!url.startsWith(BASE)) { res.writeHead(404); return res.end('not found (outside site prefix ' + BASE + ')'); }
    let f = path.join(ROOT, url.slice(BASE.length));
    if (!f.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
    if (!fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}${BASE}`;
}
let commit = 'unknown';
try { commit = execSync('git rev-parse --short HEAD', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}

const BAD_TEXT = /\bNaN\b|\bundefined\b|\[object Object\]|\bInfinity\b/;
const scanText = (page) => page.evaluate((re) => {
  const txt = document.body ? document.body.innerText : '';
  const m = txt.match(new RegExp(re, 'g')) || [];
  const samples = [];
  for (const h of [...new Set(m)].slice(0, 3)) { const i = txt.indexOf(h); samples.push(txt.slice(Math.max(0, i - 30), i + 30).replace(/\s+/g, ' ')); }
  return { count: m.length, samples };
}, BAD_TEXT.source).catch(() => ({ count: 0, samples: [] }));
const fpsSample = (page) => page.evaluate(ms => new Promise(res => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < ms) requestAnimationFrame(f); else res(Math.round(n * 1000 / ms)); }; requestAnimationFrame(f); setTimeout(() => res(0), ms + 2000); }), 1000).catch(() => null);
const heapMB = (page) => page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null).catch(() => null);
const lsKeys = (page) => page.evaluate(() => { try { return Object.keys(localStorage).length; } catch { return null; } }).catch(() => null);

// Rewrites a served file for --fault. Applied to the page BEFORE navigation.
async function installFault(page, file, fn) {
  await page.route(`**/${file}`, async (route) => {
    const body = fn((await (await route.fetch()).text()));
    await route.fulfill({ body, contentType: 'text/html' });
  });
}

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', '--enable-precise-memory-info'] });
const mobileCtx = () => browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

// Touch drag through CDP (Playwright's touchscreen only taps). Falls back to a mouse drag.
async function touchDrag(page, cdp, x1, y1, x2, y2, ms) {
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1 }] });
    const steps = 6;
    for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / steps, y: y1 + (y2 - y1) * i / steps }] }); await page.waitForTimeout(ms / steps); }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } catch {
    await page.mouse.move(x1, y1); await page.mouse.down(); await page.mouse.move(x2, y2, { steps: 6 }); await page.waitForTimeout(ms); await page.mouse.up();
  }
}
async function act(page, cdp, a, touch) {
  try {
    if (a.keys) { for (const k of a.keys) await page.keyboard.down(k); await page.waitForTimeout(a.hold || 80); for (const k of a.keys) await page.keyboard.up(k); }
    else if (a.key) { await page.keyboard.down(a.key); await page.waitForTimeout(a.hold || 80); await page.keyboard.up(a.key); }
    else if (a.sel) { if (touch) await page.tap(a.sel, { timeout: 800 }); else await page.click(a.sel, { timeout: 800 }); }
    else if (a.click) { if (touch) await page.touchscreen.tap(a.click[0], a.click[1]); else await page.mouse.click(a.click[0], a.click[1]); }
    else if (a.tap) await page.touchscreen.tap(a.tap[0], a.tap[1]);
    else if (a.tdrag) await touchDrag(page, cdp, ...a.tdrag);
    else if (a.drag) { if (touch) await touchDrag(page, cdp, ...a.drag); else { await page.mouse.move(a.drag[0], a.drag[1]); await page.mouse.down(); await page.mouse.move(a.drag[2], a.drag[3], { steps: 8 }); await page.waitForTimeout(a.drag[4] || 100); await page.mouse.up(); } }
    else if (a.wheel != null) await page.mouse.wheel(0, a.wheel);
  } catch {}
}

// =============================================================================================
// SWEEP: every game in the hub for SECS seconds with a generic policy.
// =============================================================================================
if (MODE === 'sweep') {
  const report = { kind: 'sweep', commit, url: base, secs: SECS, touch: TOUCH, fault: FAULT, hub: {}, games: [], verdict: { pass: true, reasons: [] } };
  const fail = (why) => { report.verdict.pass = false; if (!report.verdict.reasons.includes(why)) report.verdict.reasons.push(why); };
  const vp = TOUCH ? { width: 390, height: 844 } : { width: 1280, height: 720 };
  const KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'Enter', 'Digit1', 'Digit2', 'Digit3', 'Digit4'];
  const START_RE = /^(▶|play|start|fight|go|begin|continue|tap|click|new game|set sail|deal|spin|serve|launch|ok|got it|next|retry|again|resume)/i;

  // --- the hub page itself
  {
    const ctx = TOUCH ? await mobileCtx() : await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e.message || e).slice(0, 200)));
    if (FAULT) { if (!HUB_FAULTS[FAULT]) { console.error('unknown hub fault', FAULT, '(known: ' + Object.keys(HUB_FAULTS).join(', ') + ')'); process.exit(2); } await installFault(page, 'index.html', HUB_FAULTS[FAULT]); }
    const t0 = Date.now();
    await page.goto(base + 'index.html', { waitUntil: 'load', timeout: 45000 });
    await page.waitForTimeout(600);
    const hub = report.hub;
    hub.loadMs = Date.now() - t0;
    hub.title = await page.title();
    hub.games = await page.evaluate(() => games.map(g => ({ name: g[0], file: g[1], cat: g[2] })));
    hub.cards = await page.locator('#grid .card').count();
    hub.filters = await page.locator('#filters .filter').count();
    await page.fill('#search', 'math'); await page.waitForTimeout(150);
    hub.searchMathCards = await page.locator('#grid .card').count();
    await page.fill('#search', ''); await page.waitForTimeout(150);
    const words = page.locator('#filters .filter', { hasText: 'Words' });
    if (await words.count()) { await words.first().click(); await page.waitForTimeout(150); hub.wordsCards = await page.locator('#grid .card').count(); }
    hub.titleCount = +(hub.title.match(/(\d+)\s+instant/) || [])[1] || null;
    hub.pageErrors = errs;
    if (hub.cards !== hub.games.length) { fail('hub card count'); }
    // The tab title advertises a game count; it must match the number of cards actually listed.
    if (hub.titleCount != null && hub.titleCount !== hub.games.length) fail(`hub title says ${hub.titleCount} games, lists ${hub.games.length}`);
    if (errs.length) fail('hub page error');
    await ctx.close();
  }

  const list = report.hub.games.filter(g => !ONLY.length || ONLY.some(o => g.file.startsWith(o) || g.name === o));
  if (!list.length) fail('no games matched --only ' + ONLY.join(','));
  for (const g of list) {
    const ctx = TOUCH ? await mobileCtx() : await browser.newContext({ viewport: vp });
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page).catch(() => null);
    const r = { name: g.name, file: g.file, cat: g.cat, loadMs: null, title: null, pageErrors: [], consoleErrors: [], failedRequests: [], dialogs: 0, navigatedAway: null, fps: null, heapMB: null, changed: null, badText: null, lsKeys: null, canvases: 0, buttons: 0, backLink: null, controlsHint: null, bodySample: null, steps: 0, pass: true, why: [] };
    report.games.push(r);
    const gameUrl = base + g.file;
    page.on('pageerror', e => r.pageErrors.push(String(e.message || e).slice(0, 200)));
    page.on('console', m => { if (m.type() === 'error') r.consoleErrors.push(m.text().slice(0, 200)); });
    page.on('requestfailed', q => r.failedRequests.push(q.url().replace(base, '') + ' ' + (q.failure()?.errorText || '')));
    page.on('response', q => { if (q.status() >= 400 && q.url().startsWith(base.replace(BASE, '/'))) r.failedRequests.push(q.url().replace(base, '') + ' HTTP ' + q.status()); });
    page.on('dialog', d => { r.dialogs++; d.dismiss().catch(() => {}); });
    try {
      const t0 = Date.now();
      await page.goto(gameUrl, { waitUntil: 'load', timeout: 45000 });
      r.loadMs = Date.now() - t0;
      await page.waitForTimeout(900);
      r.title = await page.title();
      const body0 = await page.evaluate(() => (document.body ? document.body.innerText : '').replace(/\s+/g, ' ')).catch(() => '');
      r.bodySample = body0.slice(0, 140);
      r.controlsHint = /\b(WASD|arrow|arrows|tap|click|swipe|drag|space|keys?)\b/i.test(body0);
      r.canvases = await page.locator('canvas').count();
      r.buttons = await page.locator('button:visible').count();
      // back link to the hub: resolve against the page url and probe it the way a browser would
      r.backLink = await page.evaluate(() => {
        const a = [...document.querySelectorAll('a[href]')].find(x => /hub|back|arcade|menu|home/i.test((x.textContent || '') + ' ' + x.className));
        return a ? { href: a.getAttribute('href'), resolved: new URL(a.getAttribute('href'), location.href).href, text: (a.textContent || '').trim().slice(0, 30) } : null;
      }).catch(() => null);
      if (r.backLink) {
        try { const resp = await page.request.get(r.backLink.resolved, { timeout: 5000 }); r.backLink.status = resp.status(); }
        catch (e) { r.backLink.status = 'ERR ' + String(e.message).slice(0, 60); }
        if (r.backLink.status !== 200) { r.pass = false; r.why.push(`back link ${r.backLink.href} -> HTTP ${r.backLink.status}`); fail('dead back link'); }
      }
      const shotA = await page.screenshot();
      // start: a visible start-like <button>, then the centre
      const btns = await page.locator('button:visible').all();
      const texts = await Promise.all(btns.slice(0, 40).map(b => b.innerText().catch(() => '')));
      let idx = texts.findIndex(t => START_RE.test(t.trim()));
      if (idx >= 0) await btns[idx].click({ timeout: 800, force: true }).catch(() => {});
      await act(page, cdp, { click: [vp.width / 2, vp.height / 2] }, TOUCH);
      await page.waitForTimeout(300);
      // generic policy
      const t1 = Date.now(); let fpsDone = false;
      while (Date.now() - t1 < SECS * 1000) {
        const u = page.url();
        if (!u.startsWith(gameUrl.split('?')[0])) { r.navigatedAway = u.replace(base, ''); await page.goBack({ waitUntil: 'load', timeout: 15000 }).catch(() => {}); }
        const x = rnd(), cx = vp.width * (0.1 + 0.8 * rnd()), cy = vp.height * (0.12 + 0.76 * rnd());
        if (x < 0.35) await act(page, cdp, { key: KEYS[Math.floor(rnd() * KEYS.length)], hold: 60 + rnd() * 180 }, TOUCH);
        else if (x < 0.6) await act(page, cdp, { click: [cx, cy] }, TOUCH);
        else if (x < 0.75) {
          const vis = await page.locator('button:visible').all().catch(() => []);
          if (vis.length) { const b = vis[Math.floor(rnd() * vis.length)]; const t = (await b.innerText().catch(() => '')).trim(); if (!/reset|clear|delete|wipe/i.test(t)) await b.click({ timeout: 600, force: true }).catch(() => {}); }
        }
        else if (x < 0.9) await act(page, cdp, { drag: [cx, cy, cx + (rnd() - 0.5) * 300, cy + (rnd() - 0.5) * 300, 120] }, TOUCH);
        else await act(page, cdp, { wheel: (rnd() - 0.5) * 400 }, TOUCH);
        r.steps++;
        if (!fpsDone && Date.now() - t1 > SECS * 500) { fpsDone = true; r.fps = await fpsSample(page); }
        await page.waitForTimeout(60 + rnd() * 100);
      }
      const shotB = await page.screenshot();
      r.changed = !shotA.equals(shotB);
      r.heapMB = await heapMB(page);
      r.badText = await scanText(page);
      r.lsKeys = await lsKeys(page);
      r.phaseText = (await page.evaluate(() => (document.body ? document.body.innerText : '').replace(/\s+/g, ' ')).catch(() => '')).slice(0, 140);
      await page.screenshot({ path: path.join(OUT, `sweep-${g.file.replace(/\.html$/, '')}.png`) }).catch(() => {});
    } catch (e) { r.pageErrors.push('HARNESS: ' + String(e.message || e).slice(0, 200)); }
    if (r.pageErrors.length) { r.pass = false; r.why.push('page error'); fail('page error'); }
    if (r.badText && r.badText.count) { r.pass = false; r.why.push('NaN/undefined on screen'); fail('bad text'); }
    const http4 = r.failedRequests.filter(x => / HTTP \d+$/.test(x));
    if (http4.length) { r.pass = false; r.why.push('same-origin ' + http4[0]); fail('same-origin 4xx'); }
    console.log(`${r.pass ? 'ok  ' : 'FAIL'} ${g.file.padEnd(22)} load ${String(r.loadMs).padStart(5)}ms fps ${String(r.fps).padStart(3)} heap ${String(r.heapMB).padStart(3)}MB changed=${r.changed} ls=${r.lsKeys} back=${r.backLink ? r.backLink.status : '-'} errs=${r.pageErrors.length}/${r.consoleErrors.length}/${r.failedRequests.length} ${r.why.join('; ')}`);
    await ctx.close();
  }
  await browser.close(); server?.close();
  report.finishedAt = new Date().toISOString();
  const outFile = path.join(OUT, `report-sweep${TOUCH ? '-touch' : ''}${FAULT ? '-fault-' + FAULT : ''}.json`);
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  const failed = report.games.filter(g => !g.pass).length;
  console.log(`\nPocket Arcade sweep [${TOUCH ? 'touch' : 'desktop'} ${SECS}s/game${FAULT ? ' fault=' + FAULT : ''}] ${report.verdict.pass ? 'PASS' : 'FAIL'} ${report.verdict.reasons.join(', ')}\nhub: ${report.hub.cards} cards / ${report.hub.games.length} games / title says ${report.hub.titleCount}; ${report.games.length - failed}/${report.games.length} games clean\nreport: ${outFile}`);
  process.exit(report.verdict.pass ? 0 : 1);
}

// =============================================================================================
// EPISODE HARNESS for one profiled game.
// =============================================================================================
const GAME = GAMES[GAME_ID];
if (!GAME) { console.error('unknown --game', GAME_ID, '(known: ' + Object.keys(GAMES).join(', ') + ')'); process.exit(2); }
const entryUrl = base + GAME.entry;
const report = { game: GAME.name, mode: MODE, fault: FAULT, commit, url: entryUrl, episodes: [], pageErrors: [], consoleErrors: [], failedRequests: [], fps: [], heap: [], verdict: { pass: true, reasons: [] } };
const fail = (why) => { report.verdict.pass = false; if (!report.verdict.reasons.includes(why)) report.verdict.reasons.push(why); };

const mobile = MODE === 'mobile';
const VP = mobile ? { width: 390, height: 844 } : GAME.viewport;
const ctx = mobile ? await mobileCtx() : await browser.newContext({ viewport: GAME.viewport });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page).catch(() => null);
page.on('pageerror', e => { report.pageErrors.push(String(e.message || e).slice(0, 300)); fail('page error'); });
page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text().slice(0, 300)); });
page.on('requestfailed', r => report.failedRequests.push(r.url().replace(base, '') + ' ' + (r.failure()?.errorText || '')));
page.on('response', r => { if (r.status() >= 400) report.failedRequests.push(r.url().replace(base, '') + ' HTTP ' + r.status()); });
page.on('dialog', d => d.dismiss().catch(() => {}));

if (MODE === 'storage-blocked') {
  await page.addInitScript(() => {
    const boom = () => { throw new DOMException('The operation is insecure.', 'SecurityError'); };
    try { Object.defineProperty(window, 'localStorage', { get: boom }); Object.defineProperty(window, 'sessionStorage', { get: boom }); } catch {}
  });
}
if (FAULT) {
  if (!GAME.faults[FAULT]) { console.error('unknown fault', FAULT, '(known: ' + Object.keys(GAME.faults).join(', ') + ')'); process.exit(2); }
  await installFault(page, GAME.entry, GAME.faults[FAULT]);
}

const readState = () => page.evaluate(GAME.readState).catch(e => ({ phase: 'unreadable', error: String(e).slice(0, 120) }));
const randomAction = () => {
  const r = rnd();
  if (mobile || r < 0.3) return { tap: [20 + rnd() * (VP.width - 40), 20 + rnd() * (VP.height - 40)] };
  if (r < 0.6) return { key: ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'Escape', 'KeyP', 'KeyM'][Math.floor(rnd() * 9)], hold: 30 + rnd() * 100 };
  if (r < 0.85) return { click: [rnd() * VP.width, rnd() * VP.height] };
  return { wheel: (rnd() - 0.5) * 400 };
};
// Fields that are objects (targets for the policy) are not state for stuck detection.
const stateKey = (s) => JSON.stringify(Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v !== 'object' || v === null)));

// One line per distinct failure; repeats are counted, not re-listed.
function noteFailure(ep, msg) {
  const i = ep.invariantFailures.findIndex(m => m === msg || m.startsWith(msg + ' (x'));
  if (i < 0) ep.invariantFailures.push(msg);
  else { const n = +((ep.invariantFailures[i].match(/\(x(\d+)\)$/) || [])[1] || 1) + 1; ep.invariantFailures[i] = `${msg} (x${n})`; }
}
function checkState(prev, cur, ep) {
  for (const [k, v] of Object.entries(cur)) {
    if (typeof v === 'number' && !Number.isFinite(v)) { noteFailure(ep, `${k} is ${v}`); fail('non-finite value'); }
    if (v === undefined) { noteFailure(ep, `${k} is undefined`); fail('undefined value'); }
    const b = GAME.bounded[k];
    if (b && typeof v === 'number' && (v < b[0] || v > b[1])) { noteFailure(ep, `${k}=${v} outside [${b}]`); fail('out of bounds'); }
  }
  if (!['menu', 'playing', 'paused', 'over'].includes(cur.phase)) { noteFailure(ep, `unknown phase ${cur.phase}${cur.error ? ' (' + cur.error + ')' : ''}`); fail('unknown phase'); }
  if (prev && prev.phase !== cur.phase && GAME.transitions[prev.phase] && !GAME.transitions[prev.phase].includes(cur.phase)) {
    noteFailure(ep, `illegal transition ${prev.phase} -> ${cur.phase}`); fail('illegal transition');
  }
}

try {
  await page.goto(entryUrl, { waitUntil: 'load', timeout: 45000 });
  await page.waitForTimeout(1200);
  const heap0 = await heapMB(page); report.heap.push({ t: 0, mb: heap0 });

  for (let e = 0; e < EPISODES; e++) {
    const ep = { index: e, startedAt: Date.now(), ticks: 0, invariantFailures: [], progression: {}, stuck: false, endPhase: null, restartOk: null, restartVia: null };
    report.episodes.push(ep);
    try {
      if (e === 0) { await GAME.start(page); }
      else {
        // From the game's own end screen use GAME.restart; if the previous episode ran out of time while still
        // playing (no end screen), reload and start again instead.
        const before = await readState();
        if (before.phase === 'over') { await GAME.restart(page); ep.restartVia = 'restart'; }
        else { await page.reload({ waitUntil: 'load', timeout: 45000 }); await page.waitForTimeout(1000); await GAME.start(page); ep.restartVia = 'reload+start'; }
        await page.waitForTimeout(800);
        let s = await readState();
        if (s.phase === 'menu') { await GAME.start(page); await page.waitForTimeout(600); s = await readState(); }
        ep.restartOk = s.phase === 'playing';
        if (!ep.restartOk) { ep.invariantFailures.push(`restart did not reach playing (phase=${s.phase}, via ${ep.restartVia})`); fail('restart did not work'); }
      }
    } catch (err) { ep.invariantFailures.push('start/restart failed: ' + String(err.message).slice(0, 120)); fail(e === 0 ? 'could not start' : 'restart did not work'); }
    await page.waitForTimeout(600);
    let prev = null, lastChange = Date.now(), lastKey = '';
    const t0 = Date.now();
    let tick = 0, nextFps = 10000, nextStress = 5000;
    while (Date.now() - t0 < SECS * 1000) {
      const cur = await readState();
      checkState(prev, cur, ep);
      const key = stateKey(cur);
      if (key !== lastKey) { lastKey = key; lastChange = Date.now(); }
      if (cur.phase === 'playing' && Date.now() - lastChange > GAME.stuckAfterMs) { ep.stuck = true; fail('stuck while playing'); break; }
      for (const s of GAME.progression) if (typeof cur[s] === 'number') { const p = ep.progression[s] || (ep.progression[s] = { first: cur[s], max: cur[s], last: cur[s] }); p.max = Math.max(p.max, cur[s]); p.last = cur[s]; }
      if (cur.phase === 'over') break;
      if (e === 0 && tick === 15 && cur.phase !== 'playing') { ep.invariantFailures.push(`not playing after start (phase=${cur.phase})`); fail('start did not reach playing'); }

      let actions = cur.phase === 'playing' ? ((mobile && GAME.touchPolicy ? GAME.touchPolicy(cur, tick, rnd, VP) : GAME.policy(cur, tick, rnd, VP)) || [])
                                              : cur.phase === 'paused' ? [{ key: 'KeyP' }, { sel: '#pResume, #resumeBtn' }]
                                              : [{ key: 'Enter' }, { click: [VP.width / 2, VP.height / 2] }];
      if (MODE === 'storm') actions = actions.concat([randomAction(), randomAction()]);
      for (const a of actions) await act(page, cdp, a, mobile);

      const now = Date.now() - t0;
      if (now > nextStress) {
        nextStress += 5000;
        if (MODE === 'resize') { const small = (nextStress / 5000) % 2 === 0; await page.setViewportSize(small ? { width: 390, height: 844 } : GAME.viewport).catch(() => {}); }
        if (MODE === 'blur') await page.evaluate(() => { window.dispatchEvent(new Event('blur')); Object.defineProperty(document, 'hidden', { value: true, configurable: true }); document.dispatchEvent(new Event('visibilitychange')); setTimeout(() => { Object.defineProperty(document, 'hidden', { value: false, configurable: true }); window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); }, 400); }).catch(() => {});
      }
      if (now > nextFps) { nextFps += 10000; report.fps.push({ t: now, fps: await fpsSample(page), episode: e }); if (MODE === 'long') report.heap.push({ t: now, mb: await heapMB(page) }); }
      prev = cur; tick++; ep.ticks = tick;
      await page.waitForTimeout(GAME.tickMs);
    }
    const final = await readState();
    ep.endPhase = final.phase; ep.final = Object.fromEntries(Object.entries(final).filter(([, v]) => typeof v !== 'object' || v === null)); ep.durationMs = Date.now() - t0;
    const moved = GAME.progression.some(s => ep.progression[s] && ep.progression[s].max > ep.progression[s].first);
    if (!moved) { ep.invariantFailures.push('no progression signal moved: ' + GAME.progression.join(',')); fail('no progression'); }
    ep.badText = await scanText(page);
    if (ep.badText.count) { ep.invariantFailures.push('NaN/undefined on screen: ' + ep.badText.samples.join(' | ')); fail('bad text'); }
    await page.screenshot({ path: path.join(OUT, `${GAME_ID}-${MODE}-ep${e}-end.png`) }).catch(() => {});
  }
  if (MODE === 'long') {
    const mbs = report.heap.map(h => h.mb).filter(x => x != null);
    if (mbs.length > 2 && mbs[mbs.length - 1] - Math.min(...mbs.slice(0, 2)) > GAME.heapLimitMB) fail(`heap grew more than ${GAME.heapLimitMB} MB`);
  }
} catch (err) {
  report.pageErrors.push('HARNESS: ' + String(err.message || err).slice(0, 300)); fail('harness exception');
}

await browser.close(); server?.close();
report.finishedAt = new Date().toISOString();
const outFile = path.join(OUT, `report-${GAME_ID}-${MODE}${FAULT ? '-fault-' + FAULT : ''}.json`);
fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
const summary = report.episodes.map(e => `ep${e.index}: ${e.endPhase} ${Math.round((e.durationMs || 0) / 1000)}s ` + Object.entries(e.progression).map(([k, v]) => `${k} ${v.first}->${v.max}`).join(' ') + (e.invariantFailures.length ? ' FAIL ' + e.invariantFailures.join('; ') : '')).join('\n');
const fpsTxt = report.fps.length ? ' fps ' + report.fps.map(f => f.fps).join('/') : '';
console.log(`${GAME.name} [${MODE}${FAULT ? ' fault=' + FAULT : ''}] ${report.verdict.pass ? 'PASS' : 'FAIL'} ${report.verdict.reasons.join(', ')}${fpsTxt}\n${summary}\nreport: ${outFile}`);
process.exit(report.verdict.pass ? 0 : 1);
