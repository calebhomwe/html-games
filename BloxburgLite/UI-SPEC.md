# BloxburgLite — UI Spec (Batch D deliverable)

| | |
|---|---|
| **Author** | Joon — Senior UX Engineer |
| **Status** | BINDING for batch D |
| **Date** | 2026-08-26 |
| **Inputs** | `HANDOFF.md` (input map frozen), `DESIGN.md` §6–§8 (catalog, money, ghost rules locked) |

**Audience:** the batch D engineer filling `Assets/Scripts/UI/CatalogController.cs`. Everything below is implementable as written; if a detail is unstated, the answer is "don't build it."

**Three principles, in priority order:**
1. The ghost is the primary UI. Panels are secondary.
2. No state is ever communicated by color alone — always paired with text or geometry.
3. Nothing moves unless the player moved it. Zero tweens, zero pulses.

---

## 1. HUD (Play Mode)

Two elements. Nothing else. No mode banner, no minimap, no portrait, no version string.

| Element | Content | Anchor / Pivot | Pos @1920×1080 ref | Size | Type style |
|---|---|---|---|---|---|
| `HUD_Money` | `$1000` (integer, no separators, matches DESIGN §8) | min=max=(0,1), pivot=(0,1) | (24, −20) | 240×40 | TMP 32 SemiBold, white, left-aligned, on black 55% plate |
| `HUD_Hint` | `Tab = Build` | min=max=(0.5,0), pivot=(0.5,0) | (0, +18), centered | 300×34 | TMP 20 Regular, white, on black 55% plate |

- Plates are flat rectangles using the built-in UI sprite. No rounded corners, no art imports — there is no art pipeline in this project and we do not invent one.
- **Contrast rationale:** batch C picks the grass color and it is out of my control, so both labels carry their own black 55% plate. Effective backdrop luminance stays under ~0.10 even over the brightest ground, putting white text at **≥ 7:1 measured worst-case** against our **≥ 4.5:1 (WCAG AA)** target. The plate makes the HUD immune to any future ground texture without a retuning pass.
- Reference resolution **1920×1080**; CanvasScaler = *Scale With Screen Size*, match = 0.5.
- Money text **snaps** to its new value the frame it changes. No counting animation — the number is a fact, not a flourish.
- `HUD_Hint` is one shared object whose text swaps per mode (see §2). One object, one truth — never two hints fighting for the same pixels.

## 2. Build Mode Overlay

One root, `BuildOverlay`, active only in build mode. **The money readout stays visible top-left — never hide the budget while the player is spending it.**

Stack, bottom-up (all coordinates @1080p ref, all anchored to bottom-center unless noted):

| Element | Geometry | Style |
|---|---|---|
| `Catalog_Strip` | bottom offset 24, height 88, width 688 (content-driven) | HorizontalLayoutGroup, spacing 12 |
| `Slot_N` ×5 (exact order: Chair, Table, Bed, Sofa, Lamp) | 128×88 each | plate `#12161B` @ 85%; child `Name` TMP 18 Bold white; child `Cost` TMP 18 white 85% (`$50`) |
| `Selection_Label` | y 116..152, centered | TMP 26 SemiBold white on black 55% plate; format exactly `{Name} — ${Cost}`, e.g. `Bed — $300` |
| `Invalid_Reason` | y 156..192, centered, default hidden | TMP 24 Bold white on black 70% plate (content: §3) |
| `ExitHint` | bottom-right: anchor (1,0), pivot (1,0), offset (−24, +18) | **This is `HUD_Hint` reused**, text swapped to `Tab = Done`. Not a second object. |

**Selected-slot highlight:** lighten plate to 100% + 4px solid white frame (a sibling stretched Image, enabled only on the selected slot) + slot scale 1.06. Shape + brightness + geometry, so selection survives any form of color vision deficiency.

**Insufficient-funds slot state:** whole slot drops to 55% alpha AND cost text is replaced with `NEED $300` in `#E05252`. Three signals: dimming, literal text, hue. The text carries the meaning; red is reinforcement. A colorblind player loses nothing.

**Hard rules:** the strip never scrolls or paginates (5 items fit by definition). There is no close button, no X, no icon row. Tab is the entire navigation model for entering and leaving.

## 3. Ghost Feedback States

World-space, not UI. Batch C computes the state; `CatalogController` only renders what it is told (strict display-only boundary — see §4).

| State | Mesh treatment | Companion UI |
|---|---|---|
| **VALID** | uniform tint `#BFEFC4` (soft green over white base), **alpha 0.50** | none. Fully static — no breathing, no pulse |
| **INVALID** | fill `#D93636` at **alpha 0.30** + footprint outline `#FF4D4D` at **alpha 1.00**, 0.06u thick, drawn at exact tile bounds | `Invalid_Reason` label mandatory, same frame |
| **HIDDEN** | renderers disabled (all of play mode) | reason plate cleared |

- Global alpha cap on the ghost: **0.60**, so tiles and placed items stay legible beneath it.
- Out-of-bounds cursor: render the ghost at the **raw** (unclamped) cursor position with reason `OUT OF BOUNDS`. Raw position is honest; snapping the ghost to the edge would lie about where things stand.
- **Reason strings, exact, uppercase:** `OUT OF BOUNDS` | `BLOCKED` | `NO FUNDS`. Precedence when multiple apply: OUT OF BOUNDS > BLOCKED > NO FUNDS (teach the boundary first).
- Reason label position is **fixed** (centered above the strip, per §2). It does not chase the cursor — trailing text is noise, not feedback.
- `NO FUNDS` additionally mirrors in the strip: the selected slot shows `NEED $X` (§2). Two views of one fact, neither relying on hue.
- Rotation (`R`): footprint swap renders the **same frame**. No transition.

## 4. Component Inventory

**Text decision: TextMeshPro.** TMP ships inside Unity 6's uGUI package (zero import step — headless-CLI friendly) and SDF glyphs stay crisp at our 18–32px range from 720p to 4K.

**Exact GameObject list — 27 total, built at runtime by `CatalogController`** (plate = parent Image, text = child TMP; never two Graphics on one GO):

```
CatalogRoot (CatalogController)                                  1
  UICanvas (Canvas + CanvasScaler + GraphicRaycaster)            1
    HUD_Money (Image) > Money_Text (TMP)                         2
    HUD_Hint (Image) > Hint_Text (TMP)                           2
    BuildOverlay (full-stretch RectTransform, default INACTIVE)  1
      Catalog_Strip (Image + HorizontalLayoutGroup)              1
        Slot_0_Chair .. Slot_4_Lamp (Image)                      5
          > Name (TMP)                                           5
          > Cost (TMP)                                           5
      Selection_Label (Image) > Sel_Text (TMP)                   2
      Invalid_Reason (Image) > Reason_Text (TMP)                 2
                                                                 ----
                                                                 27
```

**`CatalogController` responsibilities — complete list (namespace `BloxburgLite.UI`, display-only):**

- `Bootstrap()` — `[RuntimeInitializeOnLoadMethod]` entry point; creates `CatalogRoot` + component. Zero scene-file dependency.
- `Awake()` — constructs all 27 GameObjects programmatically, caches every TMP/Image ref into arrays, sets initial `$1000`, deactivates `BuildOverlay`.
- `SetMoney(int amount)` — updates money text; recomputes all 5 affordability states; dirty-checked no-op if unchanged.
- `SetBuildMode(bool on)` — toggles `BuildOverlay`; swaps hint text `Tab = Build` <-> `Tab = Done`.
- `SetSelection(int index)` — moves selection frame; updates `Selection_Label` to `{Name} — ${Cost}`.
- `RefreshAffordability()` — applies idle/unaffordable slot styles from cached balance (invoked internally by SetMoney/SetSelection).
- `ShowGhostState(GhostValidity state)` — Valid: hide reason. Invalid: set reason string per §3 precedence, show plate.
- `HideGhostFeedback()` — clears reason plate (mode exit).
- `private static string FormatMoney(int)` — `"$" + invariant int`, no thousands separator (matches DESIGN §8 `$1000`).
- Defines `enum GhostValidity { Valid, OutOfBounds, Blocked, NoFunds }`.
- Owns `static readonly BuildItem[5]` mirroring DESIGN §7 exactly (id, displayName, cost). Footprints are batch C's concern; v0 slots are text-only, no footprint icons.

**Explicitly OUT of scope for this component:** raycasts, input polling, placement/delete logic, save/load, camera, anything in `Update()`. There is **no Update method** — purely event-driven, per the project perf baseline. Steady-state allocations: zero (refs cached, `.text` set only on change).

**Contract for batch C (call sites they implement):**
- `SetMoney` after boot-load, place, delete-refund.
- `SetBuildMode` on Tab toggle.
- `SetSelection` on scroll cycle (caller wraps 0..4).
- `ShowGhostState` on every aim tick **only when the state changed**; `HideGhostFeedback` on mode exit.

## 5. Input Conflicts

**Scroll wheel — confirmed build-mode only:**
- Build mode: cycles selection ±1 with wraparound (Lamp -> Chair). New affordability + ghost validity resolve the same frame (batch C's push).
- Play mode: **inert by omission** — the scroll handler is simply not subscribed outside build mode. Camera distance is locked at 6u (DESIGN §5); scrolling does nothing, logs nothing, throws nothing. Zoom is not a v0 feature and is not "temporarily" wired.

**ESC — decided for v0 (this is the pick, not a proposal):**
- Play mode: releases pointer lock (pause placeholder, per DESIGN §5 — unchanged).
- Build mode: **exits build mode** — an exact alias of Tab.
- Rationale: one consistent mental model — *"Esc steps back one level."* No pause menu exists in v0 and this spec does not create one. Cursor discipline: entering build unlocks the cursor; leaving via Tab or Esc re-locks it. Both exits behave identically.

**Other edges:**
- Tab in the Editor's Game view can traverse focus — capture Tab explicitly in the input layer; standalone builds are unaffected. Verify the toggle in a real build, not only the Editor.
- Leak rule: no input acts in the wrong mode. RMB in play mode = no-op. LMB while broke = no-op, but `NO FUNDS` is already on screen — **a silent failure without a visible reason is a bug**.

## 6. Accessibility Notes

- **Minimum interactive target: 44×44 px** @1080p ref (Apple HIG floor; ~Android 48dp). v0 ships zero clickable UI — slots are indicators, not buttons. If any become clickable post-v0, slot geometry (128×88) already clears the floor.
- **Contrast target: ≥ 4.5:1** for all text against its actual rendered backdrop (plates guarantee ≥ 7:1, see §1). Large text (≥24px) may use the 3:1 AA-large floor; we don't need it.
- **Never color-only:** slot states pair hue with text/geometry (§2); ghost invalidity always carries its reason word (§3). A protanope or deuteranope player gets 100% of the information.
- **No time pressure anywhere:** no timers, countdowns, decays, auto-dismissing hints, or blinking elements (max flash rate: 0 Hz). Hints persist until mode change. Money only leaves via the player's own placement. This is a cozy builder — the UI never hurries anyone.
- **Motion safety:** zero tweens, shakes, or pulses in UI and ghost layers; all transitions are same-frame cuts. Vestibular-safe by construction.
- **Text floor:** nothing under 18px @1080p ref; smallest strings (slot name/cost, 18px) are short and stable.
- **Known v0 gap, deliberately deferred under change control:** catalog cycling is scroll-only with no keyboard alternate (Q/E would serve, but the input map is frozen in HANDOFF). Flagged for v1; do not fix unilaterally.

## 7. Implementation Plan — Batch D

**Approach (one pick): runtime-instantiated UI, constructed by `CatalogController` code.** Justification: this project is authored headless via Unity CLI (`-batchmode -nographics`), where nobody hand-places scene objects; code-built UI diffs cleanly as `.cs` (scene YAML is merge-hostile across parallel batches C/D), and a `-executeMethod` smoke can assert the whole hierarchy without opening the Editor. Scene-file authoring is rejected.

Ordered checklist:

1. [ ] `Assets/Scripts/UI/CatalogController.cs` — skeleton: namespace, `GhostValidity` enum, `static readonly BuildItem[5]` per DESIGN §7, no serialized fields (all runtime-built).
2. [ ] `Bootstrap()` + `Awake()` — construct all 27 GameObjects per §4; assert counts, log once on mismatch, never throw in player.
3. [ ] Play-mode HUD — money text + shared hint (`Tab = Build`); `SetMoney` with dirty-check.
4. [ ] Build overlay — strip, 5 slots with Name/Cost children, selection frame + `Selection_Label`; `SetSelection` / `RefreshAffordability` incl. `NEED $X` styling.
5. [ ] Ghost plumbing — `ShowGhostState` / `HideGhostFeedback` driving `Invalid_Reason` with §3 strings + precedence.
6. [ ] Mode plumbing — `SetBuildMode`: overlay toggle + hint swap to `Tab = Done`.
7. [ ] Perf pass — confirm: no `Update()`, no steady-state allocations, all refs cached, text writes only on change.
8. [ ] Compile gate — `-batchmode -nographics -quit` run: exit code 0, log tail shows `return code 0`, zero CS errors.
9. [ ] Smoke test — temporary `-executeMethod BloxburgLite.UI.CatalogSmoke.Run` asserting: 27 GOs, 5 slots, money reads `$1000`, `BuildOverlay` inactive at boot -> exit 0; delete the smoke class afterward.
10. [ ] Handoff — update `HANDOFF.md` roster (batch D -> DONE) and tick the "HUD updates" DoD line once integrated with batch C.

---

*Joon sign-off: the catalog tells you what you bought; the ghost tells you why you can't. Ship both, ship them quiet.*
