# Survivor Wave - game wiki

> Top-down auto-shooter survival (Vampire Survivors shape): survive a 10-minute horde timer with an auto-firing
> arsenal, level up between kills, pick weapon / passive cards, evolve weapons, beat elites and bosses. A full run is
> 600 s (`runGoal=600`, survivor-wave.html:1095); most deaths come earlier.

| | |
| --- | --- |
| Status | playable (hub game, largest page in the repo: 268 KB single file) |
| Play | https://calebhomwe.github.io/html-games/survivor-wave.html, or `python3 -m http.server 8000` then http://localhost:8000/survivor-wave.html |
| Platforms | desktop keyboard (WASD / arrows, Space dash, R ult, T/G/F turrets, Q mortar, P pause: survivor-wave.html:990-1001), mouse drag (`cv mousedown` :1031), touch joystick (`tStart` :1007) plus on-screen DASH/ULT buttons (:207-208), gamepad polled at :1532 (not verified on hardware) |
| Engine | vanilla 2D canvas, `requestAnimationFrame` loop, WebAudio synth SFX + generated music (`Music.start` :1102) |
| Save | 13 `localStorage` keys: `survivorBest2`, `survivorMeta`, `survivorGold`, `survivorChapters`, `survivorHero`, `survivorMute`, `survivorSettings`, `survivorTut`, `survivorAchievements`, `survivorMissions`, `survivorDaily`, `survivorEchoBest`, `siop`. Meta is parsed inside try/catch and non-finite values are dropped (:537); `best` is read bare at :739 (see Stability: storage-blocked) |
| Harness | `node tools/harness/play.mjs --game survivor-wave [--mode ...]` - reads `state`, `player`, `enemies`, `gems`, `gameTime`, `score`, `gold` straight from the page's top-level bindings; CI job `harness` (matrix `survivor-wave`) in `.github/workflows/smoke.yml` |

## How to play
| Action | Desktop | Touch | Gamepad |
| --- | --- | --- | --- |
| Move | WASD / arrows (`keys[]` read at :1520-1523) or hold-drag the mouse (:1031) | drag anywhere on the canvas = virtual stick (:1007-1019) | left stick (:1532, not verified) |
| Dash | Space (:995) | ⚡ `#dashBtn` | not verified |
| Ultimate | R (:996) | `#ultBtn` | not verified |
| Turret place / cycle / upgrade | T / G / F (:997-999) | - | - |
| Mortar strike | Q (:1000) | - | - |
| Pause | P (:994); auto-pause on `blur` and `visibilitychange` (:1005-1006) | `#setBtn` menu | - |
| Start | Space / Enter on the start screen (:1001) or ▶ FIGHT `#playBtn` (:5294) | tap ▶ FIGHT | - |

Page load to first meaningful action: the start overlay is up after `load` + ~1.2 s and ▶ FIGHT begins play at once
(harness ep0 reached `phase=playing` on the first tick after `start`). The start screen lists the controls
("WASD / Arrows", "or drag to move", "SPACE = dash", "P = pause", "Gamepad OK", :215) and the goal ("You have 10
minutes ... one job: survive", :213).

## Core loop
Every ~10 s: steer away from the nearest critter pack, drift over green XP gems to level, read the LEVEL N card and
pick one of three upgrades (weapon level, new weapon, passive, EVO when a weapon is maxed with its passive, or Roast
Chicken heal; `drawChoices` :2161, `applyChoice` :2240-2251), dash out of a pinch, drop a turret.
Run arc: 0-70 s basic spawns ramping; elites from 70 s (`nextElite` :742, then every 50 s / 35 s after 240 s :1335);
hordes from 80 s every 70 s (:1340); bosses from 150 s every 130 s (110 s after 300 s :1347-1348); rush at 210 s;
NIGHT FALLS / STORM ROLLS IN world events (:1313-1317); survive to 600 s for the VICTORY screen (:1310 -> `victory`
:1214) with an ENDLESS continue (:5297).

## Structure (screens and states)
`state` (survivor-wave.html:738) owns the phase: `ready` (start overlay `#start`) -> `play` -> `levelup` (`#lvlup`,
`showLevelUp` :2165) / `chest` (`#chestOv`, :2265) -> `play` -> `paused` (`#pause`, `togglePause` :1253) ->
`play`; `over` (`#over`, `gameOver` :1190) or `win` (`#win`, `victory` :1214) -> `play` via Try Again / `startGame`
(:5295-5296) or `ready` via pause-menu QUIT (:5302). Sub-screens from the start overlay: CHAPTERS (`#chaptersOv`),
ARMORY (`#shopOv`, meta shop), ENDER'S ECHO (`#echoOv`, daily endless), DAILY (`#dailyOv`), hero cards
(`renderHeroes` :602), settings (`#settingsOv`). Revive from the death screen costs a stored revive or 150 gold
(`tryRevive` :1167). Session length: up to 10 min + endless.
Harness: all transitions observed were legal under `transitions` (menu->playing, playing->over, over->playing); see
Stability.

## Progression
- Within a run: `difficulty=(1+gameTime/26)` (:1308), spawn interval `max(0.18, 1.05-gameTime*0.011)` s (:1322),
  elite / horde / boss cadences above, player XP curve `xpNext` grows per level (:1072). Weapons level to EVO.
- Across runs: gold (`goldEarned` :599) buys 12 permanent META upgrades (:522-534: Power +6 % dmg, Vitality +25 HP,
  Agility, Greed, Head Start, Deadeye, Armor Plating, Nano Meds, Tactics Manual, Guardian Angel, Tactical Mind,
  Sanguine Charm; costs `60*2.5^l`-style); 12 chapters with stars (`sioc.stage` advances on a clear, :1237);
  heroes; achievements; missions; daily login tiles; patrol gold while away.
- Harness evidence: default mode, 3 episodes: see Stability table (`kills` and `level` both rose every episode).

## Win / lose / fail
- Death: `player.hp<=0` -> `gameOver` (:1190): `sfx('lose')`, music stops, `#over` shows TIME / KILLS / LEVEL / SCORE
  / BEST / GOLD, NEW BEST badge, Revive or Try Again (-> `startGame`).
- Victory at 600 s (:1310): `sfx('win')`, 80 confetti (:1246), stars for first clear / boss slayer, +2000 score,
  +400 gold, ENDLESS or Play Again.
- Quit from pause returns to the start overlay (:5302).

## Scoring and economy
- `finalScore = floor(kills*12 + level*50 + gameTime*8 + eliteCount*200 + bossCount*1000)` (:1249-1251).
- `goldEarned = floor((kills*0.30 + eliteCount*20 + bossCount*100 + level*6 + gameTime*0.45) * goldMul)` (:599-600);
  victory adds 400 and `80+40*chapter` on first clear (:1232).
- Meta costs are exponential per level (:523-534). Nothing observed going negative or NaN in the harness (every tick
  checks `hp, maxHp, level, kills, time, score, gold` for finiteness).

## Juice inventory
| Event | Visual FX | SFX | Music/ducking | Camera/shake | UI/text pop | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| hit / damage taken | red flash, i-frames | `buzz` | - | `shake`, `hitStop` (:711 hitStop 0.22, shake 10) | - | :711, :741 |
| kill / score | particles, corpses, decals, kill pulse | `pop`/`boom` | - | small shake | damage floaters | :736, :741 |
| pickup / gem | particles | `tick` | - | - | - | :1570 |
| level up | white flash, level card | `levelup` (7 calls) | music keeps playing | slow-mo `levelSlow` (:2122) | LEVEL N title, EVO banner (:2256) | :2122, :2165 |
| boss / event | `warn` banner ('NIGHT FALLS', 'STORM ROLLS IN') | `buzz` | - | white flash | banner | :1313-1317 |
| death / run end | - | `lose` | music stop | - | result card, NEW BEST | :1190-1212 |
| victory | 80 confetti | `win` | music stop | - | stars, gold note | :1214-1247 |
| menu / button press | hero card select | `tick`/`tap` | music start on play | - | achievement toast `#achToast` | :610, :352 |
86 `sfx()` calls in total (tick 17, buzz 13, boom 13, win 9, whoosh 8, levelup 7, tap 6, coin 6, pop 5). A LOW FX
mode switches itself on when frame time exceeds 26 ms for 150 frames (:5286).

## Stability (harness results)
Box: 4 shared CPUs, SwiftShader. Load averages quoted per run. Commit `HEAD` of this branch.

| Mode | Episodes | Result | Progression / end state | fps (SwiftShader) | Load avg (1 min) | Report |
| --- | --- | --- | --- | --- | --- | --- |
| default (smoke) | 1 x 25 s | PASS | playing; kills 0->21, level 1->3 | 30/31 | 3.4 | harness-out/report-survivor-wave-default.json (first run) |
| default | 2 x 40 s | PASS | ep0 kills 0->29 lvl 1->3; ep1 (reload+start) kills 0->34 lvl 1->3; no end screen in 40 s | 29/11/27/19/18/18/17 | 16.7 | report-survivor-wave-default.json |
| mobile (390x844, touch joystick via CDP touch drag, taps) | 1 x 30 s | PASS | kills 0->22, level 1->3 | 48/52/20 | 11.0 | report-survivor-wave-mobile.json |
| storage-blocked | 1 x 30 s | **FAIL before fix**: page error, `state is not defined` (script aborted at a bare `localStorage.getItem`), could not start | - | 43/35 | 11.1 | (log hg-chain) |
| storage-blocked (after `LS` wrapper fix) | 1 x 30 s | PASS | kills 0->15, level 1->2 | 27/5 | 13.6 | report-survivor-wave-storage-blocked.json |
| fault `no-start` (playBtn id renamed) | 1 x 20 s | FAIL as required (exit 1): page error, could not start | menu for 21 s | - | 9.2 | report-survivor-wave-default-fault-no-start.json |

Not run in this pass (110-minute hub time box; the box load average was 11-19 for the whole second half, see QUALITY_BAR rule on load): storm, resize, blur, long. The harness supports them (`--mode storm|resize|blur|long`); run them to lift Stability above 3.

## Scorecard
| Axis | Score (0-5) | Evidence |
| --- | --- | --- |
| Sense | 4 | Goal and controls are on the start screen (:213-215); HUD shows HP, XP, timer, kills; floaters say what hit you and the level card says what you earned (:2240). Not 5: EVO pairings and turret keys (T/G/F/Q) are only discoverable from the keys line, not by play. |
| Structure | 4 | menu -> run -> levelup/chest -> pause -> over/win -> again/quit all exercised by the harness; pause on blur (:1005); chapters/armory/echo/daily/settings navigable. Not 5: no resumable mid-run save (reload = run lost, `state` is not persisted). |
| Progression | 5 | In-run ramp (:1308, :1322, :1335-1348), named chapters 1-12 with stars (:1237), 12 META upgrades bought with gold between runs (:522), heroes, achievements, daily. Harness: `kills` and `level` rose every episode. |
| Juice | 5 | Every key event has visual + audio + screen effect: hitStop/shake/flash (:711), slow-mo level-up (:2122), banners, floaters, confetti, music start/stop, achievement toasts; LOW FX auto mode keeps it from obscuring play (:5286). |
| Stability | 3 | default, mobile and storage-blocked clean after the `LS` fix (storage-blocked crashed at load before it); storm, resize, blur and long not run in the time box, so the score cannot be 4 or 5 yet. fps 11-29 at load 17 is not evidence of a defect. |

**Verdict:** FIX - rule "Stability < 4": the four unrun stress modes cap Stability at 3. Everything else is SHIP-grade (all other axes >= 4); re-run `--mode storm|resize|blur|long` to settle it.

## Benchmark: not a learning game
Survivor Wave is in the hub's Action category; the zone checklist does not apply.

## Gaps and next steps
- (M) Resumable run: persist `state`/`player`/`gameTime` on `visibilitychange` so a phone tab swap does not lose a
  10-minute run; today only meta is saved.
- (S) The turret keys T/G/F and mortar Q have no touch equivalent (only DASH and ULT buttons exist :207-208), so the
  turret system is desktop-only.
- (S) `renderHeroes` appends each hero card twice (`row.appendChild(c); row.appendChild(c);` :613) - harmless
  (same node) but dead code.
- (S) Fullscreen button (zone standard Z10) - none in any hub game.

## Changelog of this programme's commits
See docs/GAME_WIKI.md (hub-level list).
