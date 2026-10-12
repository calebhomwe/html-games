# Math Battle - game wiki

> Arithmetic RPG: a monster stands in front of you with an HP bar; answer `a + b = ?` (or −, ×, ÷) by tapping one of
> four buttons. Right = you attack (combos to ×3, 18 % crits); wrong or too slow = the monster hits you. Every 5th
> kill is a boss. Gold buys sword / shield / potion in the shop; XP levels you up and unlocks harder tiers. A run on
> EASY lasts a few minutes until HP hits 0.

| | |
| --- | --- |
| Status | playable (35 KB single file); hub category Learning |
| Play | https://calebhomwe.github.io/html-games/math-battle.html, or `python3 -m http.server 8000` then http://localhost:8000/math-battle.html |
| Platforms | touch and mouse (every button uses `pointerdown`, math-battle.html:252, :460-467), keyboard 1-4 answer, Enter/Space start / revive / resume (:469-477); gamepad: none |
| Engine | DOM + CSS animations (no canvas); SFX from `assets/sfx/*.wav` with a WebAudio tone fallback (:219-222) |
| Save | `mathBattleSave` = `{P:{level,xp,hp,gold,sword,shield}, kills}` written on every kill and purchase (:402); `mathBattleBest`, `mathBattleSharp`, `mathBattleMuted`, `mathBattleTrophies`, `mathBattleMedals`. Every read/write is inside try/catch (`saveLS` :151, `load` :403-418 with clamping, e.g. level 1-100, hp 1..maxHP) |
| Harness | `node tools/harness/play.mjs --game math-battle` - reads `state`, `P`, `kills`, `combo`, `currentAns`, `M.hp` and the four answer buttons; the policy answers correctly 75 % of the time, visits the shop every ~60 ticks; CI job `harness` (matrix `math-battle`) |

## How to play
| Action | Desktop | Touch | Gamepad |
| --- | --- | --- | --- |
| Answer | click one of 4 `#answers button` or press 1-4 (:476-477) | tap | - |
| Start / Revive / Restart | ▶ Start Adventure `#playBtn`, Revive `#reviveBtn` (-25 gold), Restart `#restartBtn`; Enter/Space does the same (:470-474) | tap | - |
| Shop | `#shopBtn` (state `shop`), buy sword / shield / potion, `#shopClose` (:460-467) | tap | - |
| Trophies / Medals | `#trophyBtn` / `#medalBtn` (:462-465) | tap | - |
| Difficulty | EASY / MEDIUM / HARD (Lv 3) / INSANE (Lv 6) / MAX MAX (Lv 10) on the start screen (`TIERS`, `UNLOCK` :152-153) | tap | - |
| Pause | automatic on `visibilitychange` (:490), Resume button or Enter (:491, :473); no manual pause, no `blur` handler | | |

Start screen (:124-131): "Lv 1 · 🎓 Rookie", one paragraph ("Answer right to attack! Chain combos up to ×3, land
crits, earn gold & XP, and defeat bosses every 5 kills. Gear up in the shop!"), best kills, tier buttons, ▶ Start
Adventure. Load to first answer: under 1 s (harness `start` -> `playing` on the next tick).

## Core loop
Every ~10 s: read `#question` ("7 × 4 = ?"), tap the right button -> `onCorrect` (:313) deals
`attack()*combo` (`attack = 5 + sword*2 + (level-1)*2` :228), crit 18 % for ×2, floaters show "-dmg" / "CRIT!",
the monster squashes and flashes; wrong -> `onWrong` (:334) costs `atk±2` HP with a red flash and a shake; every
`DIFF.gap` seconds (9 s EASY ... 3.5 s MAX, :150, timer :489) the monster hits anyway. Kill -> gold, XP, confetti,
next monster (`spawnMonster` :291: hp `20 + kills*10 + (level-1)*8`, boss every 5 kills at ×2.6 hp / ×1.4 atk).
Run arc: Slime/Rat/Bat ... -> boss at kill 5 -> shop for a sword -> level up refills HP -> tiers unlock -> death.

## Structure (screens and states)
`state` (:161) owns the phase: `ready` (`#start`) -> `play` -> `shop` (`#shop`) -> `play`; `play`/`shop` ->
`menu` (trophy or medal overlay, returns to `prevState`) ; `play` -> `pause` (`#pause`, `visibilitychange` :490) ->
`play`; `play` -> `over` (`onDeath` :379, `#over` appears after 500 ms :390) -> `play` via Revive (`revive` :443,
needs 25 gold) or Restart (`resetRun` :449 wipes `P` and kills, then `startGame`). Harness: all observed transitions
legal; the end screen was reached in 13 s on the 25 s smoke run (75 % accuracy, EASY).
Dead end found: none. Fragility: `monsterHit` keeps ticking while the shop is open (`state==='shop'` passes the
guard :302 and the interval :489), so browsing the shop costs HP.

## Progression
- Within a run: monster hp/atk scale with `kills` (:293-294), bosses every 5 kills, combo ×3, quick-answer streaks
  (:319-321), SHARP ×N for 10 kills with no mistakes (:360-363).
- Across runs: `P.level`, gold, sword, shield persist in `mathBattleSave` (:402) - a new run continues the hero;
  Restart after death wipes them (:449). Titles by level (`titleFor` :156: Rookie, Cadet 2, Adept 4, Elite 6, Master
  8, Grandmaster 10, Mythic 12); tiers unlock at Lv 3 / 6 / 10 (:153); best kills; trophies per monster name
  (`bumpTrophy` :168); medals (`runMedalCheck` :199).
- Harness evidence: smoke run `kills 0->5 xp 0->62`; full table in Stability.

## Win / lose / fail
No win. Lose when `P.hp<=0` (:379): `sfx('lose')`, 500 ms later `#over` with KILLS / LEVEL / GOLD / BEST, Revive
(disabled when gold < 25) or Restart. Enter/Space revives if affordable, else restarts (:471).

## Scoring and economy
- `attack = 5 + sword*2 + (level-1)*2` (:228); `maxHP = 50 + shield*10 + (level-1)*8` (:229);
  `xpNeed = 30 + (level-1)*18` (:230).
- Kill: gold `8-20` (boss `40-70`), xp `round((15-30 + (level-1)*4) * TIER_XP/2)` with `TIER_XP` 2/4/6/8/10 (:154,
  :352-355), +2 HP. Streak of 5 correct: +5 gold (:316).
- Shop (:426-431): sword `40 + sword*30`, shield `40 + shield*30`, potion `30 + level*5` (full heal). Revive 25.
- Problem ranges per tier `DIFF` (:150): EASY add/sub 1-9, mul/div 2-5 ... MAX add/sub 50-400, mul 12-25, div 12-19.
  Subtraction never goes negative (`b=rnd(0,a)` :234); division is exact by construction (:236).
- Nothing can go NaN: `load` coerces and clamps every saved field (:406-416).

## Juice inventory
| Event | Visual FX | SFX | Music/ducking | Camera/shake | UI/text pop | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| correct answer | green `jflash`, monster `hitflash`, hp ghost bar | `hit` / `boom` on crit / `whoosh` at ×3 | no music | `shake` on crit | "-dmg", "CRIT!", "⚡ COMBO ×3!", "🔥 QUICK ×N!" floaters | :313-332, :261, :272 |
| wrong answer | red `jflash`, correct button turns `.good`, chosen `.bad` | `hit` | - | `shake(#pstage)`, `navigator.vibrate(60)` | "-dmg" floater | :334-347, :395-398 |
| monster hits | `squash` | `hit` | - | `shake(#pstage)` | "💥 BOSS SPECIAL!" | :301-311 |
| kill | confetti 14 / 40 boss, spawn anim | `coin` | - | `shake(#mstage)` | "+gold💰", "🎯 SHARP" | :349-367 |
| level up | confetti 24 | `levelup` | - | - | "LEVEL UP! 🎉", title on start screen | :369-377 |
| death | - | `lose` | - | - | result card | :379-390 |
| menu / button press | tier button `.on` | `tap` | - | - | - | :462-465, :480 |
Every event has both visual and audio feedback, plus screen flash, shake and vibration; no music bed and no
slow-mo, so 4 not 5.

## Stability (harness results)
Box: 4 shared CPUs, SwiftShader. Load averages quoted per run.

| Mode | Episodes | Result | Progression / end state | fps (SwiftShader) | Load avg (1 min) | Report |
| --- | --- | --- | --- | --- | --- | --- |
| default (smoke) | 1 x 25 s | PASS | over at 13 s, kills 0->5, xp 0->62 | 57 | 3.4 | first run |
| default | 2 x 40 s | PASS | ep0 over at 15 s kills 0->5 xp 0->42; ep1 (Restart) over at 18 s kills 0->8 xp 0->83 | 60/61 | 14.1 | report-math-battle-default.json |
| mobile (taps on answer buttons) | 1 x 30 s | PASS | over at 17 s, kills 0->5, xp 0->48 | 39 | 17.6 | report-math-battle-mobile.json |
| storage-blocked | 1 x 30 s | PASS (every access is try/catch :151, :162, :403) | over at 15 s, kills 0->5, xp 0->45 | 59 | 17.7 | report-math-battle-storage-blocked.json |
| fault `nan-kills` (`kills++` -> `kills+=undefined`) | 1 x 30 s | FAIL as required (exit 1): `kills is NaN (x157)`, `hp is NaN`, "NaN/58" in the HP label on screen | - | 44/50 | 9.3 | report-math-battle-default-fault-nan-kills.json |

Not run in this pass (110-minute hub time box; the box load average was 11-19 for the whole second half, see QUALITY_BAR rule on load): storm, resize, blur, long. The harness supports them (`--mode storm|resize|blur|long`); run them to lift Stability above 3.

## Scorecard
| Axis | Score (0-5) | Evidence |
| --- | --- | --- |
| Sense | 4 | Goal paragraph on the start screen (:127), the question and four answers are the whole UI, floaters say what hurt you and what you earned (:261-347), the correct button is highlighted after a miss (:395). Not 5: the shop-while-timer-runs rule is unstated. |
| Structure | 3 | menu -> run -> shop -> over -> revive/restart all robust in the harness; pause exists only via tab-hide (:490) - no manual pause, no `blur` pause, and the end screen has no way back to the hub (only the top "← Hub" link). |
| Progression | 5 | In-run ramp (:293-294, bosses every 5 kills), persistent level/gold/gear (:402), named titles Rookie->Mythic (:156), tier ladder EASY->MAX MAX unlocked by level (:153), shop upgrades that change the next run (:426). Harness observed `kills` and `xp` rising and `P.level` carried into the next episode. |
| Juice | 4 | Visual + audio on every event plus flash / shake / vibrate (table above); no music, no slow-mo. |
| Stability | 3 | default, mobile and storage-blocked clean, NaN fault detected; storm/resize/blur/long not run in the time box. |

**Verdict:** FIX - rule "Stability < 4" only because four stress modes were not run; every other axis is >= 4. Re-run them to promote to SHIP.

## Benchmark: the zone standard
| # | Standard | Mark | Evidence |
| --- | --- | --- | --- |
| Z1 | Plays within 3 s, no login, keyboard + mouse + touch | ✔ | sweep load 400 ms; `pointerdown` buttons (:252), keys 1-4 (:476); mobile harness PASS |
| Z2 | Controls box + How to play before play | ~ | one how-to paragraph on `#start` (:127); no controls box, keys 1-4 never mentioned |
| Z3 | Goal line on the first screen | ~ | "Answer right to attack ... defeat bosses every 5 kills" (:127); no win condition exists |
| Z4 | Play Again + back to menu from the end screen | ~ | Revive / Restart on `#over` (:144-145); the only way back is the "← Hub" link at the top (:89) |
| Z5 | Persistent best on the menu, survives reload, tolerates blocked storage | ✔ | `#startBest` (:128), `mathBattleBest` via `saveLS` try/catch (:151); storage-blocked harness PASS |
| Z6 | Levels / difficulty ladder visible | ✔ | tiers EASY ... MAX MAX unlocked at Lv 3/6/10 (:152-153), titles Rookie -> Mythic (:156) |
| Z7 | Right/wrong feedback that teaches | ✔ | correct button gets `.good`, chosen wrong gets `.bad` (:395-398), red flash + shake + sfx (:334-347) |
| Z8 | Curriculum-shaped content selectable by level | ✘ | tiers are number ranges (:150); operations are always mixed (:232) |
| Z9 | Skills tags on page and hub tile | ✘ | none (hub tile: emoji + name + "Learning", index.html:55) |
| Z10 | Fullscreen button | ✘ | no `requestFullscreen` in the file |
| Z11 | Kid-safe: no outbound links, ads, chat, external scripts | ✔ | no `<script src>`/fetch; SFX are local `assets/sfx/*.wav` (:220) |
| Z12 | Pause + safe tab switch | ~ | `visibilitychange` pauses (:490); no manual pause, no `blur` handler |
| Z13 | Session 2-5 min with a reason to run again | ~ | harness runs ended at 13-18 s because the policy answers 25 % wrong on purpose; real length not measured; reason to return = level/gear persist (:402) |
| Z14 | Hub tile with tagline, skill tags, related games | ~ | tile has emoji + name + category only (index.html:60) |

**Benchmark fit: 5/14 met, 6 partly, 3 missing (Z8, Z9, Z10).**


## Gaps and next steps
- (S) Pause the monster timer while the shop is open (`monsterHit` runs in `shop` state :302, :489) - a kid
  reading prices loses HP.
- (S) Manual pause button + `blur` pause (Z12) and a "Back to hub" on the end screen (Z4).
- (M) Curriculum selector (Z8): let the player pick operations (e.g. ×7 table only); `genProblem` already takes
  ranges per tier (:231), so a per-op filter is a small extension.
- (S) Skills tags on the page and the hub tile (Z9/Z14): Addition / Subtraction, Multiplication / Division,
  Reaction Time.
- (S) Fullscreen button (Z10).

## Changelog of this programme's commits
See docs/GAME_WIKI.md (hub-level list).
