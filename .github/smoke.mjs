// Headless smoke test: serves the repo root, loads each page in Chromium,
// presses a few keys / clicks, and fails on uncaught page errors or same-origin 4xx/5xx.
// Usage: node .github/smoke.mjs [page.html ...]   (default: index.html)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(process.env.SMOKE_ROOT || '.');
const pages = process.argv.slice(2).length ? process.argv.slice(2) : ['index.html'];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.wasm': 'application/wasm', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let f = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
let failed = 0;
for (const p of pages) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + (e.message || e)));
  page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(base)) errors.push(`HTTP ${r.status()} ${r.url().slice(base.length - 1)}`); });
  try {
    await page.goto(base + p, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1000);
    await page.mouse.click(640, 360);
    for (const k of ['Enter', 'Space', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'KeyW']) { await page.keyboard.press(k); await page.waitForTimeout(100); }
    await page.waitForTimeout(1500);
  } catch (e) { errors.push('navigation: ' + e.message); }
  console.log(`${errors.length ? 'FAIL' : 'ok  '} ${p}`);
  for (const e of errors) console.log('     ' + e);
  if (errors.length) failed++;
  await page.close();
}
await browser.close();
server.close();
console.log(`${pages.length - failed}/${pages.length} pages passed`);
process.exit(failed ? 1 : 0);
