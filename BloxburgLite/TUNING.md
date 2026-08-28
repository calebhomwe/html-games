# BloxburgLite — TUNING.md (Mechanics Validation)

| | |
|---|---|
| **Author** | Will — Systems Design (Sims/Valve pedigree) |
| **Status** | LOCKED — batch C implements this literally |
| **Date** | 2026-08-26 |
| **Refs** | `DESIGN.md` (Producer GDD, cited as §N), `HANDOFF.md` (frozen decisions) |

> Every number in this document is a requirement, not a suggestion. Where interpretation room existed, this doc closes it and names the ruling section.

---

## 0. Conventions (read first — everything below depends on these)

- Tiles `(x, z)` with `x,z ∈ [0..9]` (integer). Tile `(x,z)` spans world `[x, x+1) × [z, z+1)`; its center is `(x+0.5, z+0.5)`. Ground plane `y=0`.
- Stored item record: `{catalogId, x, z, rot}`. `(x,z)` is **always the min-corner** of the occupied bounding box, regardless of rotation.
- Effective footprint `Weff × Deff`: rot 0/180 use catalog `W×D` verbatim; rot 90/270 swap to `D×W`.
- Occupied tiles: `[x .. x+Weff−1] × [z .. z+Deff−1]`. Item transform position = `(x + Weff·0.5, 0, z + Deff·0.5)` (center of occupied box). Worked example: bed rot 90 at `(6,1)` occupies `x6..8 × z1..2`, mesh at `(7.5, 0, 2.0)`.
- **Rotation never mutates `(x,z)`.** `R` swings the footprint around the min corner. Ruling: DESIGN §6 (min-corner origins, "rotation re-computes footprint immediately"). Known feel tradeoff — pivot is corner, not visual center — accepted because the ghost shows the landing spot the same frame and `R` is free, instant, and wraps. Center-pivot auto-refit is ambiguous (which tile wins?) and rejected for v0.
- Placement is legal iff **all four** hold:
  - (a) **Bounds**: `0 ≤ x`, `x+Weff−1 ≤ 9`, `0 ≤ z`, `z+Deff−1 ≤ 9`
  - (b) **Overlap**: every occupied tile is currently empty (one item max per tile; self-overlap impossible by construction)
  - (c) **Funds**: `money ≥ cost` (equality allowed)
  - (d) **Cap**: live item count `< 64` (see FT-4)
- **Money conservation invariant**: after every place, delete, save-write, and load, `money + Σ(cost of live items) ≡ 1000`. If any code path breaks this invariant, that path is buggy. AT-5 tests it directly.

---

## 1. Placement Rules Table

| item | cost | rot 0 | rot 90 | rot 180 | rot 270 | refund on delete |
|---|---|---|---|---|---|---|
| `chair` | $50 | 1×1 | 1×1 | 1×1 | 1×1 | $50 (100%) |
| `table` | $120 | 2×2 | 2×2 | 2×2 | 2×2 | $120 (100%) |
| `bed` | $300 | 2×3 | 3×2 | 2×3 | 3×2 | $300 (100%) |
| `sofa` | $250 | 3×1 | 1×3 | 3×1 | 1×3 | $250 (100%) |
| `lamp` | $75 | 1×1 | 1×1 | 1×1 | 1×1 | $75 (100%) |

Anchor behavior (uniform for all five): `(x,z)` = min corner of occupied box, per §0. Rotation changes only `Weff/Deff`.

Blocked = any of (a)–(d) in §0 fails. Ghost tint: green iff all pass, red otherwise; red ghosts cannot be placed (`LMB` ignored — DESIGN §6).

Refund ruling — **full 100%, all five items, no exceptions. Why:** v0 has zero income sources (DESIGN §8: "When you're broke, you delete things"). Any depreciation is therefore a permanent, unrecoverable money sink: a player who misplaces early gets poorer forever, which reads as unfair punishment for experimenting — the exact opposite of what a build sandbox wants. Full refund enforces the conservation invariant in §0, makes delete a first-class creative tool instead of a penalty, and matches DESIGN §8 verbatim ("deletion refunds 100%, no depreciation"). Revisit only when income exists (v1 jobs).

Targeting rules:
- **Place** (`LMB`): fires on mouse-button-down edge only — no hold-to-repeat, no drag-place, no cooldown timer. A double-click's second press lands on the now-occupied tile and self-rejects via (b) (see EC-13).
- **Delete** (`RMB`): raycast to tile `t`; if a live item claims `t`, delete exactly that item (occupancy exclusivity guarantees uniqueness). Empty tile or off-plane ray = no-op. **No confirmation dialog** — full refund makes delete risk-free, so a confirm step is pure friction.
- **Rotate** (`R`): one 90° CW step per key-down edge, gated to one step per 150 ms (OS key-repeat protection; prevents accidental full spins). Wraps 270→0.

Worked examples (implementer: make these pass exactly):

| case | anchor | rot | occupied tiles | transform pos | verdict at $1000, empty plot |
|---|---|---|---|---|---|
| chair | (4,4) | 0 | {(4,4)} | (4.5, 0, 4.5) | PLACE, $950 |
| table | (4,4) | 90 | x4..5 × z4..5 | (5.0, 0, 5.0) | PLACE, $880 |
| bed | (6,1) | 0 | x6..7 × z1..3 | (7.0, 0, 2.5) | PLACE, $700 |
| bed | (6,1) | 90 | x6..8 × z1..2 | (7.5, 0, 2.0) | PLACE, $700 |
| sofa | (0,9) | 0 | x0..2 × z9 | (1.5, 0, 9.5) | PLACE, $750 |
| sofa | (0,9) | 90 | z9..11 → out of bounds | — | REJECT (a) |
| bed | (9,0) | 0 | x9..10 → out of bounds | — | REJECT (a) |
| lamp | (9,9) | any | {(9,9)} | (9.5, 0, 9.5) | PLACE, $925 |

---

## 2. Edge Cases

All cases assume boot state `$1000`, empty plot, unless stated. "Autosave" refers to the DESIGN §9 write-through file.

| # | Setup | Action | Expected outcome |
|---|---|---|---|
| EC-01 | empty plot | select bed rot 0, aim ghost at x=9,z=0 (needs x9..10) | ghost RED everywhere it violates bounds; `LMB` no-op; money stays $1000; no autosave |
| EC-02 | empty plot | place bed rot 270 at (7,8) → x7..9 × z8..9 | exact fit at far corner: ghost GREEN, places, money 1000→700, autosave written |
| EC-03 | table placed at (2,2) [owns x2..3 × z2..3], money $880 | attempt chair at (3,3) | tile (3,3) owned → ghost RED; `LMB` ignored; money stays $880 |
| EC-04 | bed rot 0 at (8,0) placed (fits x8..9 × z0..2) | re-select bed, anchor (8,0), press `R` once, then again | after 1st press: rot 90 needs x8..10 → RED. After 2nd: rot 180 → GREEN again (same tiles as rot 0). `(x,z)` unchanged by both presses |
| EC-05 | money forced to $60 | select table ($120), sweep ghost across whole plot | ghost RED on **every** tile (funds are part of validity); `LMB` ignored; HUD surfaces insufficient-funds state within 1 frame (visual design owned by UI-SPEC.md) |
| EC-06 | money exactly $120 | place table | SUCCEEDS — equality passes rule (c); balance exactly $0; every further placement now RED (min catalog price $50) |
| EC-07 | empty plot | `RMB` on empty tile (4,4), then `RMB` aimed off-plot | both no-ops: no refund, no autosave, no error, no state change |
| EC-08 | start $1000 | place chair (5,5) [−$50] → `RMB` it [+$50] → place lamp (5,5) [−$75] | all three succeed in sequence; final money = $925; tile (5,5) ends owned by lamp; invariant holds throughout |
| EC-09 | build mode active: catalog cycled to bed, rot 90, ghost hovering | kill the process mid-hover; relaunch | restore last **committed** state: no bed, money = pre-placement value; catalog selection reset to chair rot 0; no orphan ghost; play mode active. Ghost/selection state is never saved |
| EC-10a | hand-edited save: chairs at (1,1) and (5,5) | boot + load | BOTH load — duplicate catalog ids at distinct tiles are legal (ids are not unique keys; DESIGN §9) |
| EC-10b | hand-edited save: two chairs both at (1,1) | boot + load | first entry in array order loads, second dropped as overlap; no crash; money unaffected by drops; warning logged |
| EC-11 | save contains `{"id":"jacuzzi","x":0,"z":0,"rot":0}` | boot + load | unknown id → that item dropped, remaining valid items load, warning logged (DESIGN §9) |
| EC-12 | build mode, catalog/HUD panel rendered | move cursor over the panel | ghost hidden; `LMB`/`RMB`/`R`/scroll all suppressed while over UI; **`Tab` still works** (mode escape is never blocked); cursor back over ground → ghost reappears same frame |
| EC-13 | empty tile (4,4), ghost green | double-click `LMB` (~80 ms apart) | EXACTLY one chair placed, one $50 deduction; second press rejected silently (tile now occupied → rule (b)); no error toast spam |
| EC-14 | ghost hovering red at (7,7) | press `Tab`, even in the same frame as an `LMB`-down | build mode exits that frame; ghost destroyed; the same-frame `LMB` is discarded; WASD restored; money unchanged. Placement is event-driven only — nothing is ever queued |
| EC-15a | save file truncated to `{"version":1,` | boot | parse failure → discard entire save → fresh boot: $1000, empty plot, no exception; next successful mutation writes a clean v1 file |
| EC-15b | save contains `"money":-50` | boot | schema violation (negative money) → discard entire file → fresh $1000. Whole-file discard applies to: unparseable JSON, missing/wrong `version` (≠1), missing/non-integer/negative `money`, `plot` ≠ 10×10, `items` not an array. Per-item discard (id/x/z/rot checks, load-order overlap) drops only the bad item |

Load-order rule (makes EC-10/11 deterministic): iterate `items[]` in array order; validate each against occupancy built so far; first valid entry wins; drop failures silently-but-logged. Same result every run.

---

## 3. Money Pacing Check

Catalog total: 50 + 120 + 300 + 250 + 75 = **$795** ≤ $1000 start (DESIGN §7 sanity check confirmed).

Fresh-player spending paths from $1000:

| path | purchases | items | money left |
|---|---|---|---|
| one of everything + extras | full set $795, then 4 × chair $200 | 9 | $5 |
| chairs only | 20 × $50 = $1000 | 20 | $0 (exact) |
| sofas only | 4 × $250 = $1000 | 4 | $0 (exact) |
| beds + chairs | 3 × $300 + 2 × $50 = $1000 | 5 | $0 (exact) |
| beds only | 3 × $300 = $900 | 3 | $100 → +1 lamp = $25 stranded |
| tables only | 8 × $120 = $960 | 8 | $40 stranded |

Findings:

- **Money binds before space, by a wide margin.** Cheapest tile-fill is chair at $50/tile → filling all 100 tiles costs $5000, 5× the starting budget. Players hit $0 with the plot mostly empty. Correct pressure for v0: it forces the delete-and-refund loop (a MUST-list mechanic) instead of letting players sprawl mindlessly.
- **Time-to-broke:** the richest path (full set + 4 chairs) is 9 placements ≈ 45–60 s of deliberate building; broke state reliably reached inside 2 minutes. That is intentional: it guarantees every player experiences refund/rearrange, the third beat of the core loop.
- **Exact-zero builds exist** (20 chairs; 4 sofas; 3 beds + 2 chairs) — great for deterministic testing of the $0 boundary.
- **Verdict: $1000 is correct for v0.** Enough for the full set plus ~4 discretionary buys (meaningful choice), small enough to reach the floor quickly. Raise only alongside an income source in v1.
- **Verdict: refund-full is correct for v0** — with no income, partial refunds are an unrecoverable sink and a perceived-fairness disaster (see §1 ruling). Conservation invariant is the design guarantee: the player's budget is never destroyed by the system itself.

---

## 4. Feel Targets

- **FT-1 Snap.** Direct tile picking, not proximity magnetism: build-mode cursor raycasts the y=0 plane every frame; target tile = `(floor(hit.x), floor(hit.z))`. Snap zone = the entire tile (cursor within ±0.5 u of tile center). No hysteresis, no smoothing on the ghost — it teleports between tiles the same frame. Laggy ghosts are the #1 builder-feel killer; grid snapping is instant or it feels broken.
- **FT-2 Rotate.** 90° CW per `R` edge with a 150 ms repeat gate; visual updates instantly (no tween); wraps 270→0; never mutates `(x,z)` (§0).
- **FT-3 Cycle.** One scroll notch = one catalog step. Scroll-down = forward through chair → table → bed → sofa → lamp → chair (wraps); scroll-up = reverse. Selection resets to chair/rot 0 on entering build mode and after any load.
- **FT-4 Max items: 64.** Justification: the v0 economy organically caps live items at 20 (twenty $50 chairs spends exactly $1000), so 64 is a pure guard rail at 3.2× headroom. Storage is a 100-slot tile-ownership array (int[100]): a place/delete touches only its own W×D cells — O(W·D) per mutation, **zero** per-frame cost, satisfying the HANDOFF no-allocation DoD. Rendering ≤64 static simple meshes is trivial on the built-in pipeline. Worst-case autosave payload ≈ 20 items ≈ 2 KB. At cap: ghost RED, `LMB` no-op, "Plot full" toast. Unreachable today; implement the branch anyway — it is 5 lines of insurance against future economy changes.
- **FT-5 Camera collision: IGNORE for v0.** Rationale: no walls until v1+, furniture tops out around 1.2–1.5 u, and the orbit rig (radius 6 u, pitch clamp 10–70°) only dips to ~1.04 u height at pitch 10° — occasional furniture occluding the player is cosmetically annoying, not gameplay-breaking, and a free yaw drag clears it. Proper collision means a per-frame sphere-cast in the hot path plus tunneling edge cases: real complexity, zero v0 payoff. Revisit trigger: walls shipping in v1.
- **FT-6 Save cadence.** Synchronous JSON write after **every successful** place or delete, plus on quit. Never on failed attempts, ghost moves, rotation, or cycling. At ≤1 mutation/sec and ~2 KB per write, sync I/O is imperceptible and eliminates dirty-state-on-crash windows.
- **FT-7 Placement latency.** `LMB`-down commits everything in that same frame: mesh spawns, occupancy writes, money deducts, HUD updates, autosave fires. No animation lock, no delayed confirm. Perceived responsiveness beats perceived ceremony in a click-driven builder.

---

## 5. Acceptance Tests (map 1:1 to HANDOFF v0 DoD)

| # | DoD item covered | Manual steps | Pass criteria |
|---|---|---|---|
| AT-1 | Headless compile exit 0; playable scene | Launch the built scene | Console clean (no errors/warnings); 10×10 plot visible; HUD reads `$1000`; player character stands on plot |
| AT-2 | Playable scene: player + camera | Walk a straight 10 u line with `W`; repeat holding `Shift`; press `Esc`; drag pitch to both extremes | 10 u takes ~3.3 s walking, ~1.7 s running (±10% human tolerance); `Esc` releases cursor; pitch stops exactly at 10° and 70°; jump input does nothing |
| AT-3 | Tab toggle works | Toggle `Tab` 10× rapidly; after each odd toggle try `WASD` + `LMB`; after each even toggle walk | Odd states: cursor visible, WASD dead, no movement. Even states: WASD live, no ghost rendered. Zero stuck ghosts, zero leaked inputs across all 10 toggles |
| AT-4 | Ghost snaps; place/delete/rotate work | Enter build mode; scroll through all 5 items at anchor (4,4); press `R` on bed and sofa at several anchors; compare ghost tiles against §1 worked-example table | Footprints match §1 exactly for every item × rotation; bed at (8,0) goes green→red→green across three `R` presses (EC-04); ghost tint matches validity in 100% of probes |
| AT-5 | Money deduct/refund correct | Place the full set (any legal spots); note HUD; delete all five; then perform 10 random mixed place/deletes, checking HUD after each | Exactly $205 after full set; exactly $1000 after deleting all; after **every** step: `money + Σ(live costs) = 1000` (§0 invariant); HUD never negative |
| AT-6 | Autosave JSON round-trips | Place chair(2,4,rot0), bed(6,1,rot90), lamp(9,9,rot0) → money $575; quit app; relaunch; delete the bed | After relaunch: same 3 items, same tiles, bed still rot 90, money $575; after delete: 2 items, $875; second relaunch confirms the deletion persisted |
| AT-7 | Corrupt/missing handled gracefully | Overwrite save file contents with `{bad json`; relaunch; place one chair | Boots to fresh $1000 empty plot with no crash (EC-15a); placing the chair succeeds and a valid parseable v1 save file exists afterward |
| AT-8 | No per-frame allocations in hot paths | Place 20 chairs (exactly $1000 spent); in build mode orbit camera and sweep the ghost continuously for 30 s with the Profiler attached | GC Alloc column reads 0 B per frame in hot paths throughout; frame time ≤16.7 ms sustained; attempting a 21st chair yields red ghost + silent reject, no error |

---

*TUNING sign-off: the grid is a promise — every click lands exactly where the ghost says, every dollar comes back. Break the invariant, break the game.*
