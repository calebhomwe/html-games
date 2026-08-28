# BloxburgLite — v0 Vertical Slice Design

| | |
|---|---|
| **Producer** | Takahashi-san |
| **Status** | LOCKED — scope freeze for v0 |
| **Date** | 2026-08-26 |
| **Engine** | Unity 6, built-in render pipeline (no URP upgrade) |

> **Change control:** If a feature is not in Section 3, it does not exist in v0. Any addition requires a re-scope meeting with the producer. No exceptions, no "it's just one small thing."

---

## 1. Elevator Pitch

BloxburgLite is a cozy third-person build-and-decorate slice: you spawn on a 10×10 grass plot with $1,000 and a catalog of five furniture pieces. Walk your plot, flip into build mode, and snap chairs, tables, beds, sofas, and lamps to the tile grid — every placement costs money, every deletion refunds it, and your finished layout persists to JSON so it's exactly where you left it next session. It is the tight, satisfying core of a life-sim builder with zero filler around it.

## 2. Core Loop

- **Survey** — walk the plot in third person to plan where things go.
- **Build** — toggle build mode, cycle the catalog, rotate, and place snapped furniture.
- **Budget** — spend down from $1,000; delete mistakes for a full refund.
- **Persist** — layout auto-saves as JSON; reload restores it tile-for-tile.

That's the whole loop. Four beats, all functional in v0.

## 3. v0 MUST List

1. Third-person player controller (WASD walk, Shift run, mouse orbit camera, **no jump**)
2. Grid-snap build mode (Tab toggle, ghost preview, LMB place, RMB delete, R rotate, scroll cycles item)
3. Grid: 1 unit = 1 tile; plot is 10×10 tiles on a grass ground plane
4. Five furniture items: chair, table, bed, sofa, lamp
5. Money system (start $1,000, deduct on place, refund on delete)
6. JSON save/load of plot layout

## 4. v1+ Backlog — OUT OF SCOPE FOR v0

Everything below is explicitly **rejected for v0**. Do not prototype, stub, or "prep" any of it.

| Item | Target |
|---|---|
| Jobs / earning money through gameplay | v1+ |
| NPCs / other characters | v1+ |
| Multiplayer / social visits | v2+ |
| Premium currency, microtransactions | Never without a business case |
| Day/night cycle | v1+ |
| URP upgrade, fancy graphics, post-processing | Deferred indefinitely |
| Additional furniture, walls, floors, multi-story | v1+ |
| Audio/music | v1+ |
| Mobile/touch controls, localization | v1+ |

## 5. Player Controller Spec

Third-person, capsule-driven, gravity-locked to y=0 ground plane.

| Input | Action |
|---|---|
| `W` / `A` / `S` / `D` | Walk forward/left/back/right, **camera-relative** (yaw only) |
| `Left Shift` (hold) | Run modifier |
| Mouse move (play mode, pointer locked) | Orbit camera around player |
| `Esc` | Release cursor (pause placeholder; no pause menu in v0) |
| `Tab` | Toggle build mode (see §6) |

- Speeds: walk **3 u/s**, run **6 u/s** (instant accel/decel — no inertia tuning in v0).
- Camera: orbit distance **6 u**, default pitch **35°**, pitch clamped **10°–70°**, yaw unclamped, smoothing ~0.1 s.
- **No jump. Not now, not "later in the sprint."**

## 6. Build Mode UX Spec

`Tab` enters and exits build mode from anywhere.

### Input map (build mode)

| Input | Action |
|---|---|
| Mouse move | Aim ghost (raycast onto y=0 ground plane); cursor visible, pointer unlocked |
| `LMB` (click) | Place item at ghost position — only if placement is valid |
| `RMB` (click) | Delete placed item under cursor — full refund |
| `R` | Rotate ghost **90° clockwise** (wraps 0→90→180→270→0) |
| Scroll wheel | Cycle catalog: chair → table → bed → sofa → lamp → chair (wraps) |
| `MMB` (hold-drag) | Orbit camera (player character stays put; WASD disabled in build mode) |
| `Tab` | Exit build mode, restore play mode |

### Ghost behavior

- Semi-transparent preview mesh at cursor's snapped position.
- **Green tint** = valid; **red tint** = invalid. Invalid ghosts cannot be placed (LMB is ignored).
- Rotation re-computes footprint immediately (a 2×3 bed rotated 90° occupies 3×2).

### Snap rules

- Tiles addressed by integer coords `(x, z)`, `x,z ∈ [0..9]`.
- An item with footprint `W×D` at rot 0 occupies tiles `[x .. x+W−1] × [z .. z+D−1]`; its origin sits at the min-corner tile center.
- Placement is valid iff: **(a)** all occupied tiles lie inside the 10×10 plot, **(b)** no occupied tile collides with another item, **(c)** money ≥ cost.

## 7. Furniture Catalog

| id | displayName | cost ($) | footprint (tiles, W×D @ rot 0) |
|---|---|---|---|
| `chair` | Chair | 50 | 1×1 |
| `table` | Table | 120 | 2×2 |
| `bed` | Bed | 300 | 2×3 |
| `sofa` | Sofa | 250 | 3×1 |
| `lamp` | Lamp | 75 | 1×1 |

*Sanity check: one of everything = $795 ≤ $1,000 starting budget. Intentional.*

## 8. Money Rules

- Start balance: **$1,000**, shown top-left HUD (`$1000`).
- Placement deducts full cost atomically; deletion refunds **100%**, no depreciation.
- Balance can never go negative — insufficient funds blocks placement (ghost turns red).
- **No earning mechanism in v0.** When you're broke, you delete things.
- Balance persists inside the save file (see §9).

## 9. Save Format Sketch

Path: `Application.persistentDataPath/bloxburglite_save.json`. **Write-through autosave** after every successful place/delete and on quit; **auto-load at startup**. No manual save UI in v0.

```json
{
  "version": 1,
  "money": 730,
  "plot": { "sizeX": 10, "sizeZ": 10 },
  "items": [
    { "id": "chair", "x": 2, "z": 4, "rot": 0 },
    { "id": "bed",   "x": 6, "z": 1, "rot": 90 },
    { "id": "lamp",  "x": 9, "z": 9, "rot": 0 }
  ]
}
```

Contract notes:

- `rot` ∈ `{0, 90, 180, 270}` degrees, integer.
- `x`, `z` are min-corner tile indices (see §6).
- `items` order is irrelevant; loader must tolerate duplicates of the same `id`.
- Missing/corrupt file → start fresh ($1,000, empty plot). Never crash on bad save data.
- Unknown `id` or out-of-bounds tile on load → drop that item, keep loading the rest.

## 10. Definition of Done — v0 Checklist

- [ ] Player walks/runs camera-relative with WASD + Shift; jump does not exist
- [ ] Mouse orbits camera smoothly in play mode; pitch clamp works
- [ ] Tab toggles build mode cleanly both directions (input maps don't leak between modes)
- [ ] Ghost previews all 5 items, snaps to grid, follows rotation correctly
- [ ] Ghost green/red validity correct at plot edges, overlaps, and when broke
- [ ] All 5 items place, rotate, and delete; footprints match §7 exactly
- [ ] Money deducts/refunds correctly; HUD updates; balance never negative
- [ ] Save file survives an app restart; loaded layout is identical incl. rotations and money
- [ ] Corrupt/missing save handled gracefully (fresh $1,000, no crash)
- [ ] Scope audit passed: zero shipped features outside §3

---

*Takahashi-san sign-off: ship the loop, nothing else. See you in v1.*
