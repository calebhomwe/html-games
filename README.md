# Pocket Arcade (html-games)

38 single-file HTML5 games (arcade, puzzle, learning, words, idle) behind one hub page.
No build step and no install: every game is a standalone `.html` file.

## Play / Test

- **Play online:** https://calebhomwe.github.io/html-games/ (deployed by
  `.github/workflows/pages.yml` on every push to `main`, once Pages is enabled in
  Settings → Pages → Source: GitHub Actions).
- **Play locally:** `python3 -m http.server 8000` in this folder, then open http://localhost:8000
  (most games also open straight from `file://`).
- **Test:** `npm install --no-save playwright@1.56.1 && npx playwright install chromium && node .github/smoke.mjs $(ls *.html)`
  loads the hub and every game in headless Chromium, presses a few keys and fails on page errors
  or missing files. CI runs the same check in `.github/workflows/smoke.yml`.
- **Play harness:** `node tools/harness/play.mjs --mode sweep` drives all 38 games for 20 s each and
  checks the hub; `node tools/harness/play.mjs --game survivor-wave` (or `chess`, `isle-of-bells`,
  `math-battle`) plays whole runs with a game-specific policy, also in `--mode mobile|storm|resize|blur|storage-blocked|long`.
  Reports land in `harness-out/` (ignored by git). CI jobs `harness-sweep` and `harness` in `smoke.yml`.
- **Game wiki:** [docs/GAME_WIKI.md](docs/GAME_WIKI.md) (one row per game, scorecards, harness results) and
  `docs/wiki/` for Survivor Wave, Chess, Isle of Bells and Math Battle.

`BloxburgLite/` is a separate Unity project with a Windows build. It is not part of the web
arcade and is left out of the Pages deploy.
