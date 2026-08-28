# Survivor Wave — Engineering Handoff

Single-file HTML5 canvas game: `games/survivor-wave.html` (~1750 lines, no dependencies, no build step).
Open directly in any browser. Linked from the hub as `games/survivor-wave.html`.

## What it is
A Survivor.io-style top-down horde survival roguelite. Move (WASD/arrows/drag/gamepad), dash (SPACE),
weapons auto-fire, level up via XP gems, pick upgrades, evolve maxed weapons, survive 10:00.
Night falls at 5:00. Bosses at ~2:10 intervals, elites every 50s, horde surges every 70s.
Meta layer: 3 selectable heroes (different starting weapon + stat bias), gold earned per run,
persistent Armory upgrades (Power/Vitality/Agility/Greed/Head Start) in localStorage.

## Meta / persistence (keys)
- `survivorGold` — total gold; `goldEarned()` pays on death & victory (+300 win bonus)
- `survivorMeta` — JSON {power,vitality,agility,greed,head} levels; costs in `META` table (base×1.7^lvl, head ×2)
- `survivorHero` — selected hero key; `HEROES` table (survivor/soldier/scout) defines weapon + bonuses
- Applied in `startGame` (hero fields, metaAtk, goldMul, head-start levels); `player.metaAtk` multiplies all damage in `weaponStats`

## File map (all inside survivor-wave.html)
| Section | What lives there |
|---|---|
| CSS | Fonts (`@font-face` Luckiest Guy + Baloo 2), overlays, level-up cards, chest, EVO banner, dash button |
| ASSETS | `IMGS` sprite loader (graceful fallback to procedural drawing), font preload, `sprFor(e)` maps enemy→sprite key |
| PLAYER / GAME FLOW | `player` object, `startGame`, `gameOver`, `victory`, `togglePause`, `tryDash` |
| SKILL DEFS | `WEAPONS` (7), `PASSIVES` (8), `weaponStats()`, `weaponCd()` |
| SPAWNING / DIRECTOR | `makeEnemy(type)`, `directorTick(dt)` (all spawn cadence), `horde()`, `spawnBoss()` |
| COMBAT HELPERS | `nearestEnemy`, `dealDamage`, `strikeLightning`, `killEnemy`, `dropGem` |
| UPDATE | movement + dash, weapon firing loop (special-cases `guardian` and `forcefield`), projectile physics (`brick` boomerang), burn zones, enemy AI + boss FSM (`updateBoss`), gems/pickups, crowd separation grid |
| XP / LEVELUP | `gainXP`, `buildPool` (weighted card pool incl. EVO gating), `drawChoices`, `renderChoices`, `applyChoice` |
| CHEST | `openChest` (DOM slot-machine), `chestReward` |
| AUDIO | `SFXP` wav pool from `assets/sfx/`, 50ms per-name rate gate |
| RENDER | ground (grass pattern + decor + dusk tint), zones, gems, pickups, y-sorted actors, projectiles (dart/shuriken/blade/laser/brick), drones, forcefield orbs, lightning bolts, additive particles, floaters, vignette/low-HP pulse, `renderHUD`, `drawSkillChip` |
| LOOP | rAF, dt clamped to 0.05, hitStop slow-mo factor |

## Content inventory (current)
- **10 weapons**, each 5 levels + EVO: Kunai→Spirit Shuriken, Lightchaser→Eternal Light, Lightning→Thunderbolt,
  ForceField→Death Ray, Molotov→Sea of Fire, Brick→Demolition Brick, Guardian→Twin Laser Drones,
  Shotgun→Gatling (rapid single pellets), Baseball Bat→Lucille (arc swing, heavy kb + stun), Void Power→Gloom Nova (black hole: pulls, implode burst).
- **10 passives** (cap 8/run): Koga Scroll, Ronin Oyoroi, Battery, Energy Cube, Shoes, Fuel Tank, Weight Belt,
  Magnet Glove, Hi-Power Bullet (+proj dmg/speed), Exo-Bracer (+area, -cd).
- **Armory (localStorage)**: Power, Vitality, Agility, Greed, Head Start, Deadeye (crit), Armor Plating (dmg reduction via hurtPlayer()),
  Nano Meds (regen), Tactics Manual (+rerolls), Guardian Angel (free revive), Tactical Mind (4th level-up card).
- **Events**: elites (chest+coins), horde surges, bosses (Brute slam/charge, Devourer ring-spitter), storm after nightfall, GOLD RUSH (gold-tinted fast zombies spray coins).

## How to add things
**New weapon:** add entry to `WEAPONS` (see `brick` for a cooldown-thrower, `guardian` for an
always-on special-case). Give it `passive:'<id>'` + `evoName/evoIcon` + `lvlDesc` + `fire(w,st)`.
Add damage base in `weaponStats`, an `iconK` case in `paintIcon`, and the key to the iconCV forEach list.
If always-on (no cooldown), branch it in the update weapons loop.
**New passive:** entry in `PASSIVES`; wire stat effects where referenced (`weaponStats`, `weaponCd`,
`update` movement/pickupR, `dealDamage` knockback). Cap check is `Object.keys(player.passives).length<8` in `buildPool`.
**New enemy:** branch in `makeEnemy`; AI in the enemies loop; sprite key in `sprFor`.
**New boss:** add `kind` in `makeEnemy('boss')` + behavior branch in `updateBoss` (see devourer ring-spitter vs brute slam/charge FSM).

## EVO rules (core loop, don't break)
Weapon reaches Lv.5 + player owns its matching passive (any level) → gold EVO card enters the
level-up pool with weight 100. `applyChoice` sets `w.evo=true`; visuals/damage check `w.evo`.

## Balance knobs (all in-code, grep these)
- `difficulty=1+gameTime/26` — global scaling slope
- `spawnT=Math.max(0.18,1.05-gameTime*0.011)` + `count=Math.min(9,...)` — spawn cadence
- `makeEnemy` — per-type hp/speed/dmg/xp curves
- `nextElite=70 / nextHorde=80 / nextBoss=150` (+50/+70/+130) — event cadence, reset in `startGame`
- `xpNext=floor(4+lvl*3+lvl^2*0.42)` — leveling pace
- `weaponStats` — per-weapon damage bases & passive multipliers; combo dmg bonus `min(0.30, combo*0.01)`
- Boss HP: brute `900+n*680`, devourer `760+n*680` (+difficulty scaling)
- Player: speed 210 base, crit 15% ×2, dash 0.18s @ ×3.4 speed, 3s cd, 0.3s i-frames

## Environment rendering (chunked painter)
512px chunks (`getChunk(cx,cy)`, Map cache ~48) are pre-rendered once: smooth-noise grass variation,
dirt wear patches, a crossroads of asphalt roads (yellow lane dashes) with tiled sidewalks,
and deterministic props per chunk (layered trees, bushes, faceted rocks, crates, barrels, flowers,
grass tufts; big landmark trees in ~20% of chunks). Runtime layers on top: drifting cloud shadows
(pre-rendered blob), day pollen / night fireflies (stateless, time-driven), warm day / cool night
grade overlays + vignette. Character sprites get baked dark outlines (`outlined()` at load) and are
drawn ~3.1-3.3× scale. All stateless — no per-frame env cost beyond chunk blits.

## Assets
- `assets/survivor/*.png` — Kenney "Top-down Shooter" pack (CC0, no attribution required).
  hero/zombie/fast/tank/spitter/elite + grass tile. Sprites face RIGHT → rotate by angle directly.
  Full pack (580+ files incl. all tiles/poses) also extracted under `assets/survivor/PNG/`.
- `assets/fonts/*.woff2` — Google Fonts: Luckiest Guy + Baloo 2 (self-hosted, font-display:swap).
- `assets/sfx/*.wav` — shared hub sound pool.

## Test harness (works headless, no npm deps)
1. Serve the games dir + a wrapper dir on one origin (top-level `let/const` aren't window props —
   must drive the game via `iframe.contentWindow.eval(...)`):
   `node server.js` (small http server, port 8123, maps /wrap* to a temp dir).
2. Wrapper HTML: iframe the game, `eval` scripted scenarios (startGame, force weapons/levels,
   run `update(0.033)` N times, click cards via DOM, pixel-sample via `getImageData`).
3. Run Edge headless:
   `msedge --headless=new --disable-gpu --virtual-time-budget=20000 --user-data-dir=<tmp> --dump-dom http://localhost:8123/wrapper.html`
   Grep stderr for `Uncaught|TypeError` (filter GPU/dbus noise); read results from a `#res` div; `--screenshot=` for visuals.

## Known limitations / suggested next steps
- Projectile↔enemy collision is O(P×E); fine at current caps (≤300 enemies) — needs a spatial hash before raising caps.
- Particles/floaters use array filters each frame; pooling would help low-end mobile.
- Audio uses one `Audio` element per wav (no pooling/WebAudio mixing).
- Sprites are single-frame; no walk-cycle sheet (Kenney pack has multi-pose variants in `PNG/*/`).
- Boss devourer ring pattern is static; could aim gaps at player.
- Gamepad: left stick + A-button dash only (no start/pause mapping, no rumble).
- Natural next: chapter themes per 10-min win, more heroes, equipment drops, daily-seed mode.
- If migrating to WebGL for 10x particle counts: PixiJS v8 fits this 2D sprite workload better than Three.js; keep the update/director logic as-is and swap the RENDER section only.

## Verification status (as of handoff)
Headless-verified: boot, start, 30s+ combat, level-up + reroll, all EVO cards, chest open/close,
death screen, victory screen, dusk switch (pixel-sampled), crowd separation, dash, fonts + all 7
sprites loading, hero select & application, gold payout & persistence, shop buy & persistence,
meta stat application, gamepad code path (guarded). Zero console errors across all runs.
