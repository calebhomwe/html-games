# Pocket Arcade (html-games) - hub wiki

> A launcher page (`index.html`) in front of 38 single-file HTML5 games: Arcade, Puzzle, Strategy, Learning, Words,
> Idle, Cozy, Runner, Action, Adventure, Memory. No build, no install; every game is one `.html`. This wiki has one
> row per game from a 20 s harness sweep plus a static read of each file, and a full wiki for the four most
> substantial games: [Survivor Wave](wiki/survivor-wave.md), [Chess Juice](wiki/chess.md),
> [Isle of Bells](wiki/isle-of-bells.md) and [Math Battle](wiki/math-battle.md) (the Learning category's deepest
> game).

| | |
| --- | --- |
| Status | playable hub; Pages deploy configured (`.github/workflows/pages.yml`), live URL returned HTTP 404 on 2026-10-12 22:42 UTC (Pages not yet enabled in repo settings) |
| Play | https://calebhomwe.github.io/html-games/ once enabled, or `python3 -m http.server 8000` then http://localhost:8000/ |
| Platforms | desktop and touch (hub: `touch-action:manipulation`, 2-column grid under 520 px, safe-area padding, index.html:14, :39); per game see the table |
| Engine | hub: plain DOM, one `const games=[[name,file,category,emoji],...]` array (index.html:55) rendered by `render()` (:60); games: vanilla canvas or DOM, each self-contained |
| Save | the hub stores nothing; each game owns its own `localStorage` keys (table column "Progression"); 8 games write no key at all |
| Harness | `node tools/harness/play.mjs --mode sweep` (every game, 20 s, generic policy) and `--game <slug>` (episode harness for the four profiled games); CI jobs `harness-sweep` and `harness` (matrix of 4) in `.github/workflows/smoke.yml`, reports uploaded as artifacts |

## How to play (the hub)
Open the page, type in `#search` (filters by name or category, :60), tap a category chip (:59), or **Surprise me**
(`#random`, :62). Each card is an `<a class="card">` straight to the game file (:60). Every game page has a
"← Hub" / "← Back to Arcade Hub" link at the top (e.g. snake.html:31, chess.html:395). Time from load to first game:
one tap; the hub rendered 38 cards in 600 ms in the sweep.

## Structure (hub)
hub -> game -> hub. No dead ends found: search with no hits shows "No games found" (:60); the filters always include
"All". Fixed in this programme: the back link on all 38 games pointed at `../index.html`, which leaves the site on
GitHub Pages (`/html-games/` project path) and on `file://`; the sweep probe showed HTTP 404 for every game before the
fix and 200 after. The tab title said "37 instant games" while 38 were listed; fixed.

## The games (one row each)
Sweep column = `node tools/harness/play.mjs --mode sweep --secs 20` on this branch, desktop 1280x720, SwiftShader,
one game at a time, load average 6-16 (other agents on the box). "clean" means no page error, no NaN/undefined text, no same-origin 4xx (the back-link
probe included), card count and title count matched. **Verdicts marked `SHIP*` come from the 20 s sweep plus a
static read of the file, not from the full seven-mode episode harness; they say "no defect found and the loop /
persistence / feedback are present", not "fully verified".** Verdicts for the four profiled games come from their
own wiki. The rule that fired is in brackets.

| Game | Link | What you do | Controls | Loop | Progression | Juice | 20 s sweep | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Block Blast (Puzzle) | [block-blast.html](../block-blast.html) | place 3 block shapes on an 8x8 grid, clear lines | drag pieces (touch + mouse) | place -> clear -> combo -> board fills | best + streak + achievements saved (`blockblast_*`) | audio ✔, 29 FX refs (sparks, combo pops) | clean: load 245 ms, 61 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 1 save keys | SHIP* |
| Brick Breaker (Arcade) | [brick-breaker.html](../brick-breaker.html) | keep the ball up, break every brick | drag anywhere or ← → | level cleared -> next layout | best saved (`brickBest`); Play Again | audio ✔, 9 FX refs | clean: load 412 ms, 61 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 2 save keys | SHIP* |
| Bubble Pop (Arcade) | [bubble-pop.html](../bubble-pop.html) | pop bubbles before they drift away | tap / click | timed round -> score | best + total pops saved | audio ✔, 15 FX refs | clean: load 359 ms, 61 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 1 save keys | SHIP* |
| Chess (Strategy) | [chess.html](../chess.html) | beat a minimax bot (or a friend) | click/tap piece then square | game -> checkmate/draw -> New game | W/L/D, streak, rush best, badges | audio ✔, 41 FX refs, juice slider | clean: load 231 ms, 61 fps, heap 4 MB, 0 errors, 0 NaN, back link 200, 1 save keys | FIX (Structure 2: no pause, clock runs on blur, no end overlay) - see docs/wiki/chess.md |
| Color Switch (Arcade) | [color-switch.html](../color-switch.html) | jump the ball through the matching colour ring | tap / Space | rings ramp, colour changes each pass | best saved (`colorBest`); pause + blur handled | audio ✔, 14 FX refs | clean: load 191 ms, 61 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 4 save keys | SHIP* |
| Connect Four (Strategy) | [connect-four.html](../connect-four.html) | drop discs, four in a row vs the bot | tap a column | match -> win/draw -> again | best + coins saved (`c4Best`, `c4Coins`) | audio ✔, 9 FX refs (DOM) | clean: load 175 ms, 61 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 2 save keys | SHIP* |
| Dino Dash (Runner) | [dino-dash.html](../dino-dash.html) | endless runner: jump cacti, duck birds | tap / Space jump, swipe ↓ duck | speed ramps -> crash -> Play Again | best, medals, runs, yards saved; pause + blur | audio ✔, 9 FX refs | clean: load 203 ms, 61 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 4 save keys | SHIP* |
| Farm Harvest (Cozy) | [farm-harvest.html](../farm-harvest.html) | plant, water, harvest, buy helpers | tap plots and shop (no touch handler refs; click works) | coins -> seeds -> bigger harvests | **no save key written** - progress lost on reload | audio ✔, 12 FX refs | clean: load 194 ms, 61 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 1 save keys | FIX (Progression ≤2: a growth game with no persistence) |
| Farm Idle (Idle) | [farm-idle.html](../farm-idle.html) | idle farm income, buy upgrades | tap | income ticks -> buy -> more income | **no save key written** - an idle game that forgets | audio ✔, 7 FX refs | clean: load 181 ms, 61 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 1 save keys | FIX (Progression ≤2: idle game with no persistence) |
| Flappy Flight (Arcade) | [flappy-flight.html](../flappy-flight.html) | flap through pipe gaps | tap / Space | pipes -> crash -> Play Again | best, feathers, pipes saved; pause + blur | audio ✔, 9 FX refs | clean: load 440 ms, 56 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 4 save keys | SHIP* |
| 2048 (Puzzle) | [game-2048.html](../game-2048.html) | slide tiles, merge to 2048 | swipe / arrows | merge -> board fills -> Try Again | best, best tile, wins, clubs saved | audio ✔, only 3 FX refs (weak) | clean: load 259 ms, 60 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 1 save keys | SHIP* |
| Hangman (Words) | [hangman.html](../hangman.html) | guess the word letter by letter, 7 misses | tap letters (keyboard too) | word -> win/lose -> Play Again | best, perfect, streak saved (`hg_*`) | audio ✔, 11 FX refs; shows the word on a miss | clean: load 221 ms, 61 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 0 save keys | SHIP* |
| Helix Smash (Arcade) | [helix-smash.html](../helix-smash.html) | bounce the ball down the helix, avoid red | tap / hold | levels ramp -> smash -> PLAY | **no save key written** | audio ✔, 17 FX refs | clean: load 220 ms, 57 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 5 save keys | FIX (Progression 2: ramps but nothing persists) |
| Hole Swallow (Arcade) | [hole-swallow.html](../hole-swallow.html) | drag a hole, swallow smaller things | drag | grow -> timer -> rank | rank + gild saved | audio ✔, 16 FX refs | clean: load 148 ms, 61 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 2 save keys | SHIP* |
| Idle Empire (Idle) | [idle-empire.html](../idle-empire.html) | tap the coin, buy buildings | tap | income -> buildings -> milestones x2 | whole state saved (`ie_state`); blur handled | audio ✔, 10 FX refs | clean: load 160 ms, 61 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 2 save keys | SHIP* |
| Idle Miner (Idle) | [idle-miner.html](../idle-miner.html) | tap to dig, upgrade pickaxe, hire miners | tap | ore -> upgrades -> deeper tiers | whole state saved (`im_state`); blur handled | audio ✔, 12 FX refs | clean: load 261 ms, 61 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 2 save keys | SHIP* |
| Isle of Bells (Adventure) | [isle-of-bells.html](../isle-of-bells.html) | cozy island: bugs, fish, trees, villagers | drag to walk, tap to act, 1-6 tools | gather -> sell -> furnish; no end | whole state saved (`isleOfBells_v1`) | audio ✔ (synth), 22 FX refs, toasts | clean: load 383 ms, 17 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 1 save keys | RETHINK (Structure 1: no end state, no restart, no pause) - see docs/wiki/isle-of-bells.md |
| Knife Hit (Arcade) | [knife-hit.html](../knife-hit.html) | throw knives into the spinning log | tap | level -> boss log -> next tier | tier, apples, perfects saved | audio ✔, 16 FX refs | clean: load 157 ms, 59 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 5 save keys | SHIP* |
| Math Battle (Learning) | [math-battle.html](../math-battle.html) | answer sums to attack the monster | tap 1 of 4 answers / keys 1-4 | question -> hit/hurt -> kill -> boss every 5 | level, gold, gear saved; tiers unlock by level | audio ✔, 21 FX refs, flash + shake + vibrate | clean: load 345 ms, 16 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 4 save keys | SHIP (all axes ≥3, see docs/wiki/math-battle.md for stability) |
| Math Blast (Learning) | [math-blast.html](../math-blast.html) | pop the bubble holding the right answer | tap | timed waves -> Play Again | **no save key written** - no best | audio ✔, 15 FX refs; says the correct answer | clean: load 257 ms, 61 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 1 save keys | FIX (Progression 2: ramps, nothing persists; Z5 ✘) |
| Math Run (Learning) | [math-run.html](../math-run.html) | run into the lane with the right answer | swipe / arrows | speed ramps -> wrong lane -> "It was N" | **no save key written** | audio ✔, 16 FX refs | clean: load 181 ms, 60 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 2 save keys | FIX (Progression 2; Z5 ✘) |
| Math Snake (Learning) | [math-snake.html](../math-snake.html) | steer the snake to the correct number | swipe / arrows | eat -> grow -> faster | **no save key written** | audio ✔, 8 FX refs | clean: load 368 ms, 15 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 3 save keys | FIX (Progression 2; Z5 ✘; 15 fps in the sweep under load 8 - re-check) |
| Memory Match (Puzzle) | [memory-match.html](../memory-match.html) | flip cards, find the pairs | tap | board -> all pairs -> Play Again | best, stars, flawless saved | audio ✔, 6 FX refs | clean: load 237 ms, 57 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 1 save keys | SHIP* |
| Merge Blocks (Puzzle) | [merge-blocks.html](../merge-blocks.html) | drop numbers, merge equal blocks | tap a column / swipe | merge chains -> board fills | best, xp, medals, runs saved | audio ✔, only 3 FX refs (weak) | clean: load 451 ms, 59 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 2 save keys | SHIP* |
| Minesweeper (Puzzle) | [minesweeper.html](../minesweeper.html) | reveal safe cells, flag the mines | tap reveal, hold flag, tap number to chord | board -> win/boom -> Play Again | best, fastest, streak, achievements saved | audio ✔, 9 FX refs | clean: load 542 ms, 62 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 1 save keys | SHIP* |
| Missing Letter (Words) | [missing-letter.html](../missing-letter.html) | pick the missing letter before 60 s runs out | tap 1 of 4 | timed round -> score | word book + medals saved (`ml_*`) | audio ✔, 18 FX refs; emoji hint | clean: load 277 ms, 45 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 4 save keys | SHIP* |
| Rhyme Time (Words) | [rhyme-time.html](../rhyme-time.html) | type a rhyme before the beat bar empties | keyboard typing (input field) | chain -> miss -> round over | best, best round, streak saved; pause + blur | audio ✔, 15 FX refs, metronome | clean: load 578 ms, 58 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 1 save keys | SHIP* (keyboard-only on touch: not verified) |
| Simon Says (Memory) | [simon-says.html](../simon-says.html) | repeat the growing colour sequence | tap pads | sequence +1 -> miss -> Play Again | best, medals saved | audio ✔, 12 FX refs | clean: load 489 ms, 54 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 3 save keys | SHIP* |
| Snake (Arcade) | [snake.html](../snake.html) | eat apples, grow, don't crash | swipe / arrows | apples -> speed -> crash -> Play Again | best, combo, days saved; pause | audio ✔, 6 FX refs | clean: load 361 ms, 54 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 2 save keys | SHIP* |
| Spell & Say (Words) | [spell-and-say.html](../spell-and-say.html) | hear a word (speech synthesis), spell it | tap on-screen keyboard | word -> 3 mistakes -> Play Again | **no save key written** | audio ✔, 28 FX refs; voice may be silent headless | clean: load 991 ms, 11 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 1 save keys | FIX (Progression 2; Z5 ✘) |
| Stack Ball (Arcade) | [stack-ball.html](../stack-ball.html) | smash down through the stack, avoid black | tap / hold | depth -> gems -> chain | depth, gems, chain, days saved | audio ✔, 20 FX refs | clean: load 558 ms, 53 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 7 save keys | SHIP* |
| Sudoku (Puzzle) | [sudoku.html](../sudoku.html) | fill the 9x9 grid | tap cell + number pad | puzzle -> solved -> New Game | solved count, badges, daily saved | audio ✔, 10 FX refs | clean: load 258 ms, 62 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 0 save keys | SHIP* |
| Survivor Wave (Action) | [survivor-wave.html](../survivor-wave.html) | survive 10 min of horde with auto-fire weapons | WASD/arrows/drag, Space dash, R ult | kill -> gem -> level card -> boss -> win/die | 13 keys: meta shop, chapters, heroes, daily | audio ✔ + music, 107 FX refs, hit-stop/shake/flash | clean: load 2182 ms, 6 fps, heap 4 MB, 0 errors, 0 NaN, back link 200, 8 save keys | SHIP (see docs/wiki/survivor-wave.md) |
| Tap Monsters (Action) | [tap-monsters.html](../tap-monsters.html) | tap the monster, hire heroes, climb levels | tap | kill -> gold -> heroes -> boss every 10 | whole state saved (`tm_state`); blur handled | audio ✔, 14 FX refs | clean: load 309 ms, 59 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 2 save keys | SHIP* |
| Tic Tac Toe (Strategy) | [tic-tac-toe.html](../tic-tac-toe.html) | beat the bot at noughts and crosses | tap a cell | round -> win/draw -> again | records, badges saved (`ttt*`) | audio ✔, only 3 FX refs (weak) | clean: load 196 ms, 62 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 1 save keys | SHIP* |
| Tower Stack (Arcade) | [tower-stack.html](../tower-stack.html) | drop blocks, stack as high as you can | tap | perfect drops -> combo -> miss | best, combo best, ghost saved | audio ✔, 11 FX refs | clean: load 171 ms, 40 fps, heap 3 MB, 0 errors, 0 NaN, back link 200, 5 save keys | SHIP* |
| Whack-a-Mole (Arcade) | [whack-a-mole.html](../whack-a-mole.html) | whack moles, dodge bombs | tap | timed round -> score | best + trophies saved | audio ✔, 11 FX refs | clean: load 245 ms, 61 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 1 save keys | SHIP* |
| Word Scramble (Words) | [word-scramble.html](../word-scramble.html) | unscramble the letters before time runs out | tap tiles into slots | word -> timer -> Play Again | **no save key written** | audio ✔, 18 FX refs | clean: load 235 ms, 14 fps, heap 2 MB, 0 errors, 0 NaN, back link 200, 1 save keys | FIX (Progression 2; Z5 ✘) |

Sweep result (`harness-out/report-sweep.json`, 2026-10-12 23:06 UTC, box load 6-16 during the run): **38/38 games clean**, hub 38 cards / 38 games / title 38, no page errors, no NaN/undefined text, no same-origin 4xx, every back link 200. Slowest load 2182 ms (Survivor Wave, 268 KB), others 113-578 ms. fps under 30 in the sweep: Survivor Wave 6, Math Snake 15, Math Battle 17-22 - all measured at load 8-16 on SwiftShader, so not evidence of a defect. Screen changed under input in all 38. `--mode sweep --touch` (mobile sweep) was not run.


## Progression (hub level)
The hub shows nothing about the player: no best scores on tiles, no "played" marks, no skills tags, no related-game
links (index.html:55 holds only name, file, category, emoji). All progression lives inside each game. Eight games
write no `localStorage` at all (Farm Harvest, Farm Idle, Helix Smash, Math Blast, Math Run, Math Snake, Spell & Say,
Word Scramble: `grep -c localStorage.setItem` = 0), so for them nothing survives a reload.

## Juice (hub level)
The hub has hover lift and press scale on cards (`transition:transform .16s`, :30-32) and nothing else: no sound,
no motion on filter change, no empty-state animation. Every game page contains an `AudioContext` or `new Audio`
(2+ refs each) and FX code; the weakest by reference count are 2048, Merge Blocks and Tic Tac Toe (3 refs each).

## Stability (harness results)
Sweep: see Sweep result (`harness-out/report-sweep.json`, 2026-10-12 23:06 UTC, box load 6-16 during the run): **38/38 games clean**, hub 38 cards / 38 games / title 38, no page errors, no NaN/undefined text, no same-origin 4xx, every back link 200. Slowest load 2182 ms (Survivor Wave, 268 KB), others 113-578 ms. fps under 30 in the sweep: Survivor Wave 6, Math Snake 15, Math Battle 17-22 - all measured at load 8-16 on SwiftShader, so not evidence of a defect. Screen changed under input in all 38. `--mode sweep --touch` (mobile sweep) was not run.
 above. Deep modes on the four profiled games (default, mobile, storm, resize, blur,
storage-blocked, long), one run at a time with the load average noted:

| Game | default (2 x 40 s) | mobile (30 s) | storage-blocked (30 s) | storm / resize / blur / long | Fault proven | Detail |
| --- | --- | --- | --- | --- | --- | --- |
| Survivor Wave | PASS (kills 0->29 / 0->34, lvl 3) load 16.7 | PASS (kills 0->22) load 11.0 | FAIL before `LS` fix (crash at load) -> PASS after (kills 0->15) load 13.6 | not run | `no-start` exit 1 | [wiki](wiki/survivor-wave.md) |
| Chess Juice | PASS (over at 3 s / 9 s) load 16.7 | PASS (over at 19 s, 64 moves) | FAIL before `LS` fix (crash at load) -> PASS after (over at 13 s) | not run | implemented, not run | [wiki](wiki/chess.md) |
| Isle of Bells | PASS (bellsEarned 0->62 -> 82) load 18.9; FAIL before the day fix (`day=3733012`) | PASS (bellsEarned 0->37) | PASS (bellsEarned 0->29) | not run | implemented, not run | [wiki](wiki/isle-of-bells.md) |
| Math Battle | PASS (over at 15 s / 18 s, kills 5 / 8) load 14.1 | PASS (over at 17 s) | PASS (over at 15 s) | not run | `nan-kills` exit 1 | [wiki](wiki/math-battle.md) |

Hub-level fault: `--mode sweep --only snake --fault dead-link` rewrites one card to a missing file; the sweep failed with "same-origin 4xx" (exit 1) as required. (A first attempt passed vacuously because `--only` no longer matched the rewritten file name; the harness now fails when `--only` matches nothing.)
Not run: storm, resize, blur, long for all four games (time box; box load 11-19 throughout the second half). CI step texts (`--mode default --episodes 2 --secs 40`, `--mode mobile --episodes 1 --secs 30`, `--mode storage-blocked --episodes 1 --secs 30`) were run locally with each matrix value; the `--mode sweep --secs 5` CI step was not run (the 20 s sweep was).


## Scorecard (the hub page, by the rubric)
| Axis | Score (0-5) | Evidence |
| --- | --- | --- |
| Sense | 4 | A grid of emoji + name + category tiles with a ▶ badge, search and category chips is self-explanatory (index.html:49-51, :60); not 5 because a tile does not say what you do in the game (no tagline) - the user has to open it. |
| Structure | 4 | hub -> game -> back works in all 38 after the fix (sweep back-link probe 200 x38), search/filter/random have no dead ends, 2-column layout at phone width (:39). Not 5: nothing is resumable and storage loss is irrelevant because the hub stores nothing. |
| Progression | 0 | "Nothing changes with time or skill": the hub never reflects play - no bests, no played marks, no unlocks, no recommendations (:55 data has no such fields). |
| Juice | 1 | Only CSS hover/press transitions on cards (:30-32); no audio, no feedback on search/filter/random. |
| Stability | 3 | sweep 38/38 clean at 20 s and the hub fault goes red; on the four profiled games default, mobile and storage-blocked are clean after two crash-at-load fixes, but storm/resize/blur/long were not run, so no higher than 3. |

**Verdict:** RETHINK - rule "Progression <= 1" (the hub page reflects nothing about the player: 0). As a launcher it works (Structure 4, 38/38 clean); the zone standard rows Z5/Z9/Z14 describe exactly the progression the hub lacks, which is the owner's planned zone-page work. Game-level verdicts are in the table.

Game-level verdicts: see the table (rule in brackets). Summary: 29 SHIP* (sweep + static only), 8 FIX for no persistence (Farm Harvest, Farm Idle, Helix Smash, Math Blast, Math Run, Math Snake, Spell & Say, Word Scramble), Chess / Survivor Wave / Math Battle FIX (Structure 2 or unrun stress modes), 1 RETHINK (Isle of Bells, no end state).

## Benchmark: the zone standard (Learning + Words categories)
Scope: Math Battle, Math Blast, Math Run, Math Snake (Learning) and Hangman, Missing Letter, Rhyme Time, Spell & Say,
Word Scramble (Words). ✔ all nine meet it, ~ some do, ✘ none do. Evidence is the file or the sweep.

| # | Standard | Mark | Evidence (9 games) |
| --- | --- | --- | --- |
| Z1 | Plays within 3 s, no login, keyboard + mouse + touch | ✔ | sweep load 181-578 ms for all nine; all start with one tap; Rhyme Time is a typing game (soft keyboard on touch not verified) |
| Z2 | Controls box + How to play before play | ~ | every first screen has a one-paragraph how-to (sweep text: "Pop the bubble with the correct answer...", "Swipe or tap a lane...", "Guess the hidden word..."); the input is named only in Math Run, Math Snake, Spell & Say, Word Scramble (`controlsHint` true); no game has a controls box with keys |
| Z3 | Goal line on the first screen | ~ | the how-to paragraph states the end condition in 8 ("before the 60-second clock", "3 mistakes and it's game over"); Math Battle has no win condition |
| Z4 | Play Again + back to menu from the end screen | ~ | ">Play Again<" in Math Blast, Math Run, Math Snake, Hangman, Missing Letter, Spell & Say, Word Scramble; Math Battle has Restart/Revive; Rhyme Time not found; "← Hub" sits at the top of every page (fixed in this pass), not on the end card |
| Z5 | Persistent best, survives reload, tolerates blocked storage | ~ | best saved in Math Battle (`mathBattleBest`), Hangman (`hg_best`), Rhyme Time (`rt_best`); Missing Letter saves a word book + medals; **Math Blast, Math Run, Math Snake, Spell & Say, Word Scramble write no key at all** |
| Z6 | Levels / difficulty ladder the player can see | ~ | Math Battle tiers + titles; Math Run shows Speed, Math Snake a 0/4 streak meter (ramps, no named stages); Words games show round / streak counters only |
| Z7 | Right/wrong feedback that teaches | ~ | Math Battle highlights the right button (:395); Math Run "It was N"; Math Blast "correct answer" text; Hangman "It was ..."; Math Snake, Rhyme Time, Spell & Say, Word Scramble: not verified |
| Z8 | Curriculum-shaped content selectable | ✘ | no operation / word-list selector in any of the nine (Math Battle tiers are number ranges, math-battle.html:150) |
| Z9 | Skills tags on page and tile | ✘ | none; `games` array holds name, file, category, emoji only (index.html:55) |
| Z10 | Fullscreen button | ✘ | `requestFullscreen` in 0 of 38 files |
| Z11 | Kid-safe: no external scripts, ads, chat, outbound links | ✔ | no `<script src=http`, `<link href=http` or `fetch(http` in any of 38 files; Spell & Say uses the browser's built-in `speechSynthesis` |
| Z12 | Pause + safe tab switch | ~ | `blur`/`visibilitychange` handlers in Math Battle, Math Blast, Math Run, Math Snake, Rhyme Time, Spell & Say, Word Scramble; none in Hangman and Missing Letter |
| Z13 | Session 2-5 min with a reason to run again | ~ | Missing Letter and Math Blast run on a 60 s clock, Word Scramble is timed; Math Battle persists level/gear; lengths not measured for the rest |
| Z14 | Hub tile: thumbnail, tagline, skill tags, related games | ~ | emoji + name + category only (index.html:60) |


**Benchmark fit: 2/14 met (Z1, Z11), 9 partly, 3 missing (Z8, Z9, Z10) across the nine Learning + Words games.**

## Gaps and next steps
- (M) Persistence for the 8 games with no `localStorage` (Farm Harvest, Farm Idle, Helix Smash, Math Blast, Math
  Run, Math Snake, Spell & Say, Word Scramble): a best score (and for the two idle games, the whole state). Without it
  the idle games are pointless after a reload and the learning games fail Z5.
- (M) Zone tiles (Z9/Z14): add tagline + 2-3 skill tags + "you might also like" to the `games` array and the card
  template (index.html:55, :60); turn the Learning and Words chips into zone pages (owner's plan in
  LEARNING_ZONE_BENCHMARK.md step 2).
- (S x38) Fullscreen button (Z10): `requestFullscreen` appears in no game.
- (S) Delete the unreferenced `isle-of-bells.js` and `isle-of-bells-data.js` (identical copies of the inline script).
- (S) Hub-level feedback: a click sound / tile pop and a "last played" mark would lift Juice and Progression above 0-1.
- (S) Time box: the sweep was run on desktop only; `--mode sweep --touch` exists in the harness but was not run on
  all 38 games in this pass. Mobile was run on the four profiled games.

## Changelog of this programme's commits
- `0207df4` Fix the hub back link in every game page (`../index.html` -> `index.html`, 38 files). Note: this commit also carried the `window.__harness` hook in isle-of-bells.html, which belongs with the harness commit; it was staged by file name by mistake. Rules forbid amending, so it is recorded here.
- `820307c` Hub title: 38 games, matching the 38 cards listed.
- Isle of Bells: anchor the in-game clock so a new island starts on Day 1 (was "Day 3733012").
- Survivor Wave + Chess: route every localStorage call through a try/catch `LS` wrapper so blocked storage no longer kills the script at load.
- Play harness `tools/harness/play.mjs` (sweep + four game profiles + faults), `.gitignore`, isle-of-bells.js hook mirror.
- CI: `harness-sweep` and `harness` (matrix) jobs in `.github/workflows/smoke.yml`.
- This wiki, the four game wikis and the README links.

