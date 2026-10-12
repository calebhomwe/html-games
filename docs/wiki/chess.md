# Chess Juice - game wiki

> Full chess against a minimax bot (or a second player) with "juice": particles, text pops, shake, combo sounds,
> 22 puzzles, a post-game review, a 3-minute clock mode, stats and badges. A game against the Medium bot takes
> 2-10 minutes; the harness's random legal mover is checkmated in about 15 s.

| | |
| --- | --- |
| Status | playable (154 KB single file) |
| Play | https://calebhomwe.github.io/html-games/chess.html, or `python3 -m http.server 8000` then http://localhost:8000/chess.html |
| Platforms | desktop mouse (`canvas click` chess.html:2005), touch (`touchstart` :2006, with a 400 ms guard against the synthetic click), keyboard only for Escape (closes review / learn panels :1947, :2064); gamepad: none |
| Engine | vanilla 2D canvas board + DOM panels; WebAudio synth SFX (`sfx` :527) |
| Save | `chessMetaW/L/D/Streak/BestStreak` (:889-900, bare `localStorage` calls at load), `chessRushBest` (:999, try/catch), `gamesMuted` (:424). No game-in-progress save. |
| Harness | `node tools/harness/play.mjs --game chess` - reads `game.gameOver/moveHistory/turn/captured*`, `botThinking`, `pendingPromo`, computes a random legal move for the human side from `getAllLegalMoves` (:721) and clicks its from/to squares; CI job `harness` (matrix `chess`) |

## How to play
| Action | Desktop | Touch | Gamepad |
| --- | --- | --- | --- |
| Select / move piece | click a square, then a highlighted target (`handleClick` :1388 via :2005) | tap, same flow (:2006) | - |
| Promotion | pick a piece in `#promoOverlay` (:1417) | tap | - |
| Hint / Teach mode / Flip / Undo / Clock / New game / Mute / Learn | toolbar buttons `#btnHint #btnTeach #btnFlip #btnUndo #btnClock #btnReset #btnMute #btnLearn` (:2008-2040) | tap | - |
| Opponent | `#botSel` 2P / Easy / Medium (default) / Hard = search depth 1 / 2 / 3 (:1630-1632), `#personalitySel` Balanced / Aggressive / Defensive / Tricky (:379-384) | | |
| Puzzle / Review / Stats | `#btnPuzzle` (22 FEN puzzles :841), `#btnReview`, `#btnStats` | | |
| Juice level | `#juiceSlider` 0-100, default 50 (:1098) scales shake/flash/particles | | |

A game is live the moment the page loads (`resetGame` runs at init; the harness `start` is a no-op). Time to first
move: immediate. There is no start screen, no controls box and no goal line; the only text is the tagline
"Chess.com on roids — themes, bots, puzzles, & tips" and the `#status` line ("White to move").

## Core loop
Every ~10 s: read `#status` ("White to move" / "🤖 Bot thinking..." / "CHECK!"), click a piece, click a target,
watch the capture particles and the material score `#scoreW/#scoreB` (:317), the captured-piece rows (:319) and
the move list (:320). Run arc: opening -> middlegame with CHECK! pops -> checkmate / stalemate / draw rule ->
`game.result` in `#status`, W/L/D record and streak update (`trackMatchEnd` :918), badges (`unlockBadges` :1001).

## Structure (screens and states)
There is no explicit phase variable; `game.gameOver` (chess.html:1512-1535) separates `playing` from `over`.
End detection after every move: no legal moves -> checkmate or "Stalemate — draw!"; `hasInsufficientMaterial`;
fifty-move rule (`halfmoveClock>=100`); threefold repetition (`recordPosition>=3`). Restart: `#btnReset` ->
`resetGame` (:1767) rebuilds `game`, clears timers, particles, puzzle mode. Modes: bot/2P, puzzle (`loadPuzzle` :1649,
exit :2037), review (`runReview` :1945), stats panel, learn panel, clock mode (`CLOCK_START=180` s :1051,
`clockTickFn` :1067), rush (`RUSH` :998). There is **no pause**; the game is turn-based so nothing moves without
input, but the 3-minute clock keeps running on blur (no `visibilitychange` handler anywhere in the file).

## Progression
- Within a game: material score, captured pieces, check / checkmate escalation; nothing ramps by time.
- Across games: W / L / D record, current and best streak (`#metaStats` :321, keys :889-900), rush best (:1751),
  badges (`BADGES` :989), stats panel (games, record, fastest mate, puzzles solved). No unlocks change the next game.
- Harness evidence: `moves` 0 -> 55 in one 15 s episode (random legal mover vs Medium bot) - see Stability.

## Win / lose / fail
Checkmate: `game.result = "<colour> wins by checkmate!"`, `sfxWin` or `sfxCheckmate`, `triggerShake(3)`,
`bodyShake`, 'CHECKMATE!' text pop, 8 king flashes (:1515-1524). Draws: `sfxDraw` with the rule named in
`#status` (:1526-1535). Back into a game: `#btnReset` (New game) - the toolbar is always visible; there is no end
overlay with a Play Again button.

## Scoring and economy
No points. Material count per side in `#scoreW/#scoreB`; W/L/D and streak persisted. `RUSH.cur/best` for the rush
mode. Nothing can go negative; bounds checked by the harness: `moves` 0-1000, captured 0-15 each, `clockW` 0-180.

## Juice inventory
| Event | Visual FX | SFX | Music/ducking | Camera/shake | UI/text pop | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| select piece | legal-move dots, click ring | `sfxSelect` | - | - | - | :546, :1095 |
| illegal click | - | `sfxIllegal` | - | - | - | :553 |
| move / capture | `spawnParticles` on capture | `sfxMove` / `sfxCapture`, `sfxCombo` on capture streaks | - | small `triggerShake` | material score updates | :534-536, :590, :1359 |
| castle / promote | - | `sfxCastle` (whoosh) / `sfxPromote` (levelup) | - | `triggerShake(0.5)` | promo overlay | :542-544, :1536 |
| check | king square flash | `sfxCheck` | - | - | 'CHECK!' text pop | :1502-1509 |
| checkmate / draw | 8x king flash | `sfxWin` / `sfxCheckmate` / `sfxDraw` | no music in this game | `triggerShake(3)` + body shake | 'CHECKMATE!' pop, result in `#status` | :1512-1535 |
| menu / button press | panel slide (`.show`) | - | - | - | - | :2037-2041 |
All effects scale with `juiceLevel` (:1368-1369) and are off at 0. There is no music bed.

## Stability (harness results)
Box: 4 shared CPUs, SwiftShader. Load averages quoted per run.

| Mode | Episodes | Result | Progression / end state | fps (SwiftShader) | Load avg (1 min) | Report |
| --- | --- | --- | --- | --- | --- | --- |
| default (smoke) | 1 x 25 s | PASS | over (checkmate) at 15 s, moves 0->55 | 62 | 3.4 | first run |
| default | 2 x 40 s | PASS | ep0 over at 3 s, 10 moves; ep1 (restart via #btnReset) over at 9 s, 28 moves | - | 16.7 | report-chess-default.json |
| mobile (taps) | 1 x 30 s | PASS | over at 19 s, moves 0->64 | 58 | 11.9 | report-chess-mobile.json |
| storage-blocked | 1 x 30 s | **FAIL before fix**: page error, `game is not defined` (script aborted at bare `localStorage.getItem('gamesMuted')` :424), could not start | - | 60/58 | 11.8 | (log hg-chain) |
| storage-blocked (after `LS` wrapper fix) | 1 x 30 s | PASS | over at 13 s, moves 0->42 | 61 | 16.7 | report-chess-storage-blocked.json |
| fault `no-reset` | not run | - | implemented (`id="btnReset"` renamed -> TypeError at chess.html:2026); not executed in the time box | | | |

Not run in this pass (110-minute hub time box; the box load average was 11-19 for the whole second half, see QUALITY_BAR rule on load): storm, resize, blur, long. The harness supports them (`--mode storm|resize|blur|long`); run them to lift Stability above 3.

## Scorecard
| Axis | Score (0-5) | Evidence |
| --- | --- | --- |
| Sense | 3 | Chess rules are self-evident to anyone who knows chess and `#status` says whose move it is, CHECK!/CHECKMATE! pops explain the end (:1502-1524); but nothing on the page tells a new player how to move, what Teach/Hint/Rush do or that you "always play White" except a button tooltip (:373). |
| Structure | 2 | Playing -> over -> New game is robust and the harness restarted cleanly, but there is no pause, the clock keeps running on blur (no `visibilitychange` handler), and the end state is only a status line with no Play Again overlay. Rubric: "all four reachable but fragile ... no pause" = 2. |
| Progression | 3 | No in-run ramp (turn-based), but persistent W/L/D, streaks, rush best and badges (:889-1001) plus bot difficulty tiers chosen by the player. Rubric 3 needs "in-run ramp AND persistent"; chess has no ramp by nature, so 3 is generous on the persistence side and the designed difficulty ladder (Easy/Medium/Hard) stands in for the curve. |
| Juice | 4 | Each key event has visual and audio feedback plus screen shake, flashes and text pops (:1359-1375, :1502-1524); no music bed, so not 5. |
| Stability | 3 | default, mobile and storage-blocked clean after the `LS` fix (before it the page threw at load with storage blocked); storm/resize/blur/long not run. |

**Verdict:** FIX - rules "any axis == 2" (Structure 2: no pause, clock runs on blur, no end overlay) and "Stability < 4".

## Gaps and next steps
- (S) Pause the clock on `visibilitychange` and resume on focus; today a 3-minute clock game is lost to a tab switch.
- (S) An end-of-game overlay with "Play again" and "Back to hub" instead of only the `#status` line.
- (S) A one-line controls hint ("tap a piece, then a square - you play White") on first load.
- (M) Save the game in progress (board FEN + history) so a reload resumes; everything else is persisted already.

## Changelog of this programme's commits
See docs/GAME_WIKI.md (hub-level list).
