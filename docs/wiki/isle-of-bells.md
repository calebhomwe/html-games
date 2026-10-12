# Isle of Bells - game wiki

> Cozy island life sim (Animal Crossing shape): catch bugs with the net, fish, dig fossils, shake fruit trees, water
> crops, sell to the shop for bells, buy furniture for vibe, run errands for four villagers. There is no end; a day
> lasts 8 real minutes (`MIN_PER_REAL_SEC=3`, 1440 game minutes per day) and the game saves itself.

| | |
| --- | --- |
| Status | playable (108 KB HTML with the whole game inlined; `isle-of-bells.js` / `isle-of-bells-data.js` are byte-identical copies that the HTML does not load) |
| Play | https://calebhomwe.github.io/html-games/isle-of-bells.html, or `python3 -m http.server 8000` then http://localhost:8000/isle-of-bells.html |
| Platforms | desktop keyboard + mouse, touch (pointer events: drag = stick, tap = act, isle-of-bells.js:1874-1900); gamepad: none |
| Engine | vanilla 2D canvas (24x18 tiles of 48 px, `fit()` letterboxes :275), `requestAnimationFrame` loop with dt capped at 50 ms (:2030-2036), WebAudio synth SFX + noise rain (:155, :189) |
| Save | one key `isleOfBells_v1` holding the whole `state` (`save` :68 inside try/catch). `mergeSave` (:34-66) re-validates every field with `nr()`/`clamp` so a corrupt or foreign JSON falls back field-by-field to defaults; `load` is wrapped in try/catch (:72). Offline growth is applied on load, capped at 30 min (`applyOffline` :78). |
| Harness | `node tools/harness/play.mjs --game isle-of-bells` - reads the read-only hook `window.__harness()` added at the end of the game IIFE (phase, bells, day, bag, vibe, per-activity stats and the nearest tree / bug / water tile in screen pixels); CI job `harness` (matrix `isle-of-bells`) |

## How to play
| Action | Desktop | Touch | Gamepad |
| --- | --- | --- | --- |
| Move | drag on the canvas (virtual stick, pointer :1874-1890) | drag | - |
| Walk to / use a thing | tap a tree, rock, plot, villager, gift, building or water tile (`tapWorld` :1905-1935) | tap | - |
| Act with the current tool | E or Space (`doAction` :1858) | tap next to you / toolbar | - |
| Pick tool | 1-6 = net, rod, shovel, can, axe, sling (:1851-1856) or the `#toolbar` buttons; T cycles (:1860) | toolbar | - |
| Bag / Shop / Museum / Journal | B (:1859), `#bagBtn`, `#shopBtn`, `#musBtn`, `#jBtn` | tap | - |
| Help | `#help` opens `#ovHelp` | tap | - |

First screen (`#ovIntro`): name field, avatar and shirt pickers, 🌅 Set Sail (`#playBtn` -> `startGame` :2014).
Returning players skip it (`state.seenIntro`, :2081). Time from load to first action: about 1 s (harness `start`
reached `playing` immediately after the click). The intro paragraph explains the loop ("fish bite, bugs buzz, trees
giggle when shaken and four fuzzy villagers need a friend") but the controls are only in the Help overlay.

## Core loop
Every ~10 s: tap a tree to walk over and shake it (fruit / bells, `actTree` :579-591, 40-60 s regrow), swing the
net at a bug (`stats.bugs++` :705), cast at the pond (:1918, `stats.fish++` :754), dig a sparkle spot (:678),
water / harvest a plot (:631), then sell the bag at the shop and buy furniture that raises Vibe (`calcVibe` :535
sums `FURN[].vibe` of placed items). Villagers hand out quests (`questInc` :801, `talkVillager` :817) and gifts
(`openGift` :788); awards (`AWARDS` :886) pop as toasts. Day rolls every 480 real seconds with a dawn toast
(:1110-1117) and resets rocks.

## Structure (screens and states)
No end state. Phases: `#ovIntro` visible = menu; hidden = playing. Overlays (`.ov`): shop (buy/sell tabs), bag,
museum, home (furniture placement), quest, journal (export / import save). `anyOpen()` (:927) blocks world input
while any overlay is up. Pause: none (the sim keeps running; it is real-time-clock driven so nothing is lost).
Blur: `visibilitychange` only snapshots object state (:2482); the save timer runs every 8 s (:2086).
Harness: `menu -> playing` only; every episode ended by timeout (no `over` exists) and restarted via reload (the
intro is skipped on reload because `seenIntro` is saved).

## Progression
- Within a session: bag fills (cap 20, `BAG_MAX`), bells grow, museum entries fill per category, tool unlocks
  (rod / axe / sling start locked :21), quests chain.
- Across sessions: everything persists in `isleOfBells_v1`; crops grow offline up to 30 min; trees/rocks regrow on
  timers; day counter continues.
- Harness evidence: 25 s smoke run `shakes 0->2 bugs 0->2`; full table in Stability.

## Win / lose / fail
None. There is no death, no fail, no win screen - the only "end" is closing the tab. Rubric-wise the loop is
menu -> playing with no end/restart; the harness treats a timeout as the episode end.

## Scoring and economy
- Start 500 bells (:21). Income: sell catches (FISH prices 40-700, BUGS, shells, fossils - data block), tree shakes
  (`rndi(15,45)` bells :599), gifts, quest rewards (`quest.bells`). `giveBells` adds to `stats.bellsEarned` (:513).
- Sinks: shop furniture (`FURN`), tools. Vibe = sum of placed furniture vibe (:535-539).
- Defect fixed in this programme: the day counter was `floor((offsetMin + epochSeconds*3)/1440)+1` with `offsetMin`
  never anchored, so a brand-new island showed "Day 3733012" in the HUD (:1748) and the home panel (:1048). Now
  `startOffsetMin()` anchors a new (or legacy-zero) save to Day 1 at 08:00.

## Juice inventory
| Event | Visual FX | SFX | Music/ducking | Camera/shake | UI/text pop | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| catch bug / fish | emoji `burst` (:472) | `catch` / `splash` | ambient rain / birds layer (:189) | - | toast with item name | :705, :754 |
| shake tree | leaf burst | `shake`, `coin` when bells drop | - | - | toast | :579-591 |
| dig | dust burst | `dig`, `digHit` | - | - | toast | :678 |
| buy / sell | - | `coin` / `coinBig` / `deny` (11 calls) | - | - | shop re-render | :930 |
| quest / award | - | `quest` / `complete` (=win) | - | - | toast, quest chip `#questChip` | :801, :897 |
| new day | - | `quest` | - | - | "🌅 Day N" toast | :1110-1117 |
| menu / button press | - | `click` | - | - | - | :2457 |
45 `sfx()` calls through a synth (no audio files). No screen shake, no hit-stop, no music bed: a cozy, low-key
feedback set that fits the genre but never goes beyond toasts and emoji bursts.

## Stability (harness results)
Box: 4 shared CPUs, SwiftShader. Load averages quoted per run.

| Mode | Episodes | Result | Progression / end state | fps (SwiftShader) | Load avg (1 min) | Report |
| --- | --- | --- | --- | --- | --- | --- |
| default (smoke, before day fix) | 1 x 25 s | **FAIL**: `day=3733012 outside [1,100000]` every tick | shakes 0->2, bugs 0->2 | 43/40 | 3.4 | first run |
| default (after day fix) | 1 x 25 s | PASS | shakes 0->3, bugs 0->1 (day now 1) | 51/56 | 8.5 | report-isle-of-bells-default.json (proof run) |
| default | 2 x 40 s | PASS | ep0 shakes 0->3, bellsEarned 0->62, digs 0->1; ep1 (reload, intro skipped) shakes 3->6, bellsEarned 62->82; no end state exists | 36/52/50/43/51/48/49 | 18.9 | report-isle-of-bells-default.json |
| mobile (taps + CDP touch drag) | 1 x 30 s | PASS | shakes 0->2, bugs 0->1, bellsEarned 0->37, digs 0->1 | 35/57 | 14.2 | report-isle-of-bells-mobile.json |
| storage-blocked | 1 x 30 s | PASS (save/load are try/catch :68-77) | shakes 0->5, bugs 0->1, bellsEarned 0->29 | 33/38 | 16.4 | report-isle-of-bells-storage-blocked.json |
| fault `no-sail` | not run | - | implemented (`id="playBtn"` renamed -> TypeError in bindUI); not executed in the time box | | | |

Not run in this pass (110-minute hub time box; the box load average was 11-19 for the whole second half, see QUALITY_BAR rule on load): storm, resize, blur, long. The harness supports them (`--mode storm|resize|blur|long`); run them to lift Stability above 3.

## Scorecard
| Axis | Score (0-5) | Evidence |
| --- | --- | --- |
| Sense | 3 | The intro says what the island offers and tools are iconic; tapping anything walks you there and acts (:1905-1935); "Get closer to the water edge first!" toasts teach rules (:1920). Not 4: the HUD (clock, day, bells, vibe, bag) does not explain what Vibe is for or what a villager wants until you tap them. |
| Structure | 1 | A loop exists but there is no end state and no restart; rubric 1 = "one of menu/run/end/restart is broken or unreachable". A life sim has no end by design, but the rubric is fixed; pause is also absent. |
| Progression | 3 | In-session: bag, bells, museum, tools unlock, quest chains; across sessions: everything persists, offline growth (:78). No named levels / tiers (vibe is a number), so not 4. |
| Juice | 3 | Catch / shake / dig / buy / quest each have a visual (burst or toast) and a synth sound (:472, :155); no screen effects, eased UI or music, so not 4. |
| Stability | 3 | default (after the day fix), mobile and storage-blocked clean; storm/resize/blur/long not run. |

**Verdict:** RETHINK - rule "Structure <= 1": the sim has no end state, no restart and no pause, so by the fixed rubric it needs design work (a session goal), not bug fixes. The day-counter defect is fixed.

## Gaps and next steps
- (S) Delete `isle-of-bells.js` and `isle-of-bells-data.js`: the HTML inlines the identical code and never loads
  them, so edits to the .js files do nothing (two copies had to be patched in this programme to keep them equal).
- (M) A session goal: a daily to-do from a villager with a visible reward so a 5-minute visit has an end point.
- (S) Controls line on the intro card (drag to walk, tap to act, 1-6 tools) instead of only in Help.
- (S) Fullscreen button (Z10).

## Changelog of this programme's commits
See docs/GAME_WIKI.md (hub-level list).
