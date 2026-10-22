# Builder Island — Minimalist 3D Practice Playground

**Builder Island** is an ultra-minimal, hands-on 3D practice playground for Grade 4 beginners. Kids learn spatial 3D actions—**clicking, dragging, resizing, hold-to-turn rotating, lifting, viewing different faces, matching directional markers, and combining multiple blocks**—directly inside a single 3D workspace without reading long manuals.

---

## Four Stages (32 Spatial Tasks Total)

Students can freely choose and switch between four stages at any time (progress is saved independently per stage):

### Stage 1 — Basics (8 Single-Action Steps)
Each step practices strictly one primary action and enables only its relevant control:
- `1 / 8`: *"Drag the box to the target."* (Move only)
- `2 / 8`: *"Stretch the box to fit."* (Length resize only)
- `3 / 8`: *"Push the top handle down."* (Height resize only)
- `4 / 8`: *"Look from the TOP view."* (TOP view only)
- `5 / 8`: *"Rotate the box to fit."* (Hold `↻` and turn 90°)
- `6 / 8`: *"Look from the FRONT view."* (FRONT view only)
- `7 / 8`: *"Lift the block up high."* (Z-lift cone only)
- `8 / 8`: *"Pull the front handle out."* (Completes the `40 × 30 × 4 mm` Safe Robot Base with Little Bot)

### Stage 2 — Challenge (8 Progressive Spatial Tasks)
Focuses on combining move + hold-to-turn rotation, 360° directional markers, and multi-block assembly (order-independent):
- `1 / 8` (**Turn and Move**): *"Turn and move the block to match the target."* (1 block, move + turn 90°)
- `2 / 8` (**Match the Direction**): *"Match the direction, then move to the target."* (1 block with directional stripe & arrow, turn 180° + move)
- `3 / 8` (**Find the Turn**): *"Turn the block to match the target."* (1 directional block, turn 270° / `-90°` clockwise or counter-clockwise + move)
- `4 / 8` (**Look and Match**): *"Look closely. Match the position and direction."* (1 directional block, observe target position & direction; optional `💡 Hint`)
- `5 / 8` (**Two Blocks**): *"Move both blocks to their matching targets."* (2 blocks `1 ★` and `2 ◆` with distinct colors & symbols, move only)
- `6 / 8` (**One Needs a Turn**): *"One block needs a turn. Match both targets."* (2 blocks `1 ★` and `2 ◆`, both move, `1 ★` turns 90°)
- `7 / 8` (**Turn Both**): *"Turn and move both blocks to match."* (2 blocks: `1 ★` turns 90°, directional `2 ▶` turns 180°)
- `8 / 8` (**Build the Shape**): *"Build the whole shape. Match all three blocks."* (3 blocks `1 ★`, `2 ◆`, `3 ▶` forming a 3-piece arch on the workplane; all 3 move, 2 turn 90°)

---

### Stage 3 — Size & Lift (8 Tasks)

Each task has one block and one target. Only the permitted controls appear; there is no move or rotation control in this stage.

| Task | Controls | Initial → target (length × width × block height; above ground), mm |
| --- | --- | --- |
| 1. Make It Bigger | Square corner: proportional scale | 20 × 16 × 12; 0 → 40 × 32 × 24; 0 |
| 2. Make It Smaller | Square corner: proportional scale | 40 × 32 × 24; 0 → 20 × 16 × 12; 0 |
| 3. Make It Longer | Length edge midpoint | 24 × 20 × 12; 0 → 48 × 20 × 12; 0 |
| 4. Make It Narrower | Width edge midpoint | 36 × 36 × 12; 0 → 36 × 18 × 12; 0 |
| 5. Match Two Dimensions | Length + width edge midpoints | 24 × 32 × 12; 0 → 48 × 20 × 12; 0 |
| 6. Lift It Up | Black top triangle | 32 × 24 × 12; 0 → 32 × 24 × 12; 24 |
| 7. Resize and Lift | Square corner + black triangle | 20 × 16 × 12; 0 → 30 × 24 × 18; 20 |
| 8. Size and Lift Challenge | Length + width midpoints + black triangle | 24 × 32 × 12; 0 → 44 × 20 × 12; 24 |

**Controls and anchor:** Drag the white square at the visible bottom corner outward to enlarge, inward to shrink, preserving all three dimension ratios. Black square edge-midpoint controls change only their respective dimension. Horizontal resizing stays centered on the fixed bottom-face center `(50, 40)`; block height grows upward from its bottom, without changing its distance above ground. Drag the black triangle upward/downward to lift/lower the entire block, preserving its dimensions. A click alone changes nothing. The white corner control sits directly on a projected vertex without a connector line; black midpoint controls retain their guide lines. Controls have at least a 44 CSS-pixel hit area in Stage 3.

Dimensions remain positive: minimum 6 mm; maximum length 80 mm, width 60 mm, block height 30 mm, and lift 28 mm. Uniform scale respects the intersection of these limits. The target uses the same center anchor. Stage 3 checks **length, width, block height, and lift individually within 2.5 mm**, in addition to the shared geometric match. Size snapping is proportional for the corner, single-axis for midpoints, and independent for lift. Tasks 7–8 allow either operation order.

A floor grid, lifted-block shadow and vertical ground guide distinguish block height from distance above ground. Live values show both. Matching enables Next without advancing automatically; moving away disables Next again despite historical completion. Reset affects only the active task. Stage 3 completion offers stage selection and replay; unrestricted Free Play remains available in Stages 1–2.

### Stage 4 — Rotate in 3D (8 Tasks)

Enter with the **Stage 4 — Rotate in 3D** button, or open `http://127.0.0.1:8080/index.html?mode=test&stage=4`. The closable **Three Ways to Turn** introduction uses small local diagrams; reopen it with the workspace help button. No lift triangle is available in this stage: **black triangle = lift; curved arrows = rotate**.

The existing engine is **Z-up**, with the unrotated block's **front at +Y** and **right at +X**. Stage 4 uses fixed world axes, a fixed ISO camera, and the same view for model and target:

| Action | World axis | Meaning |
| --- | --- | --- |
| Spin | Z | Turn on the workplane; +90° sends +X toward +Y |
| Tip Forward / Back | X | Forward is −90°: the original top (+Z) tips toward the front (+Y) |
| Tip Sideways | Y | Right is +90°: the original top (+Z) tips toward the right (+X) |

Select a named curved arrow, hold and drag: Spin and Sideways use horizontal dragging, Forward/Back uses vertical dragging (down tips forward). A click does not rotate. The active arrow highlights, other arrows fade, and a fixed world-axis line and reference ring show the selected action. Handle placement follows the projected model bounds; it does not define or change the axis. Angles update continuously with mild snapping within 5° of quarter turns. Passing uses a 6° shortest orientation-angle tolerance, not turn counts or separate Euler components.

| Task | Target / one valid world-axis solution | Visible arrows |
| --- | --- | --- |
| 1. Spin to Match | Z +90° | Spin |
| 2. Spin the Other Way | Z −90° (or equivalent +270°) | Spin |
| 3. Tip Forward | X −90° | Forward / Back |
| 4. Tip Backward | X +90° | Forward / Back |
| 5. Tip Sideways | Y +90° | Sideways |
| 6. Tip the Other Way | Y −90° | Sideways |
| 7. Choose the Right Arrow | X +90° (backward, different from Q6's sideways target) | All three, initially unhighlighted |
| 8. Two-Turn Challenge | Z +90°, **then world X −90°** | All three |

Q8 also accepts world Y +90°, then world Z +90°, and any other path to the same final orientation. Wrong-axis attempts do not deduct points or automatically reset the block. The first Hint for Q8 asks students to inspect the front arrow/top star; a second click gives the two-step example.

The block is a marked **32 × 22 × 16 mm** cuboid, with a top star, front arrow and side diamond, plus distinct underside/back/left patterns. Marks are attached geometry and only render when their face points toward the camera. The translucent target and solid target thumbnail use the same face marks. A fixed center `(50, 40, 34)` gives **13 mm minimum ground clearance at every orientation**; there is no automatic lift or center movement. Size edits, translation, camera orbit and manual lift are disabled only in Stage 4. Back, Reset, current-match gating, completion, stage selection and replay reuse the existing flow.

Orientation is a normalized `[w, x, y, z]` quaternion. A world turn **left-multiplies** the current orientation, preserving order. Quaternion sign and 360° equivalence are handled by the absolute dot product; identical bounding boxes with different face directions do not match.

## Minimalist Main Interface

1. **Stage Switcher & Progress Bar**: Switch between `Stage 1 — Basics`, `Stage 2 — Challenge`, `Stage 3 — Size & Lift`, and `Stage 4 — Rotate in 3D`, showing both the active stage name and step progress (`1 / 8` .. `8 / 8`).
2. **Short English Instruction**: Clear, beginner-friendly prompt at the top.
3. **Single Large 3D Interactive Workspace** (`#workspace-3d`) with ViewCube buttons (`3D`, `TOP`, `FRONT`, `SIDE`), background drag orbit, translucent target ghosts, 3D directional arrows, and multi-block selection halos.
4. **Small Target Preview Card** (`#target-mini-svg`) in the top-right corner of the 3D stage.
5. **Bottom Action Bar**: `← Back`, `↺ Reset` (resets current step only), `💡 Hint`, and `Next →` / `Finish 🎉` (completing Step 8 opens the **Completion Modal** with **Choose Stage**, **Change My Design**, and **Replay 1 / 8**).

---

## Running Locally

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

- **Student Entry:** `http://127.0.0.1:8080/index.html` (saves to `builder-island.progress.v1`)
- **Offline Single-File Bundle:** `Builder-Island-Student.html`
- **Isolated Demo Mode:** `http://127.0.0.1:8080/index.html?mode=demo`
- **Isolated Test Mode:** `http://127.0.0.1:8080/index.html?mode=test`


## Progress Compatibility and Offline Bundle

The existing student/demo/test storage keys are retained. Version 5 stores independent snapshots under `stages[1]` through `stages[4]`; saving one stage preserves the others. Version 3 progress migrates as Stage 1; version 4 snapshots retain their existing Stage 1–3 meanings. Stage 4 box orientation has `orientationVersion: 1`. Old scalar `rotation` data is restored only under the original stage semantics and is never reinterpreted as a Stage 4 quaternion. Old saves without a Stage 3/4 snapshot start the missing stage at Task 1 with no completed tasks. Missing, invalid or unknown-schema Stage 4 orientations fall back to the default orientation. Restoring Stage 3 normalizes the center anchor, dimensions and lift through the same restrictions used for live editing; a partial proportional scale retains its ratios and precision.

HTTP and `file://` have different browser storage contexts; progress does not automatically transfer between them. If storage is unavailable, the app uses in-memory practice mode and displays a warning.

Rebuild/check the offline single-file version locally, without dependencies:

```bash
node scripts/build-offline.mjs
node scripts/build-offline.mjs --check
```

See [TESTING.md](TESTING.md) for executed checks, commands and unverified device coverage. No external services, accounts, physics, collision, stacking or duplication were added.


Stage 4 known limits: this is an orthographic teaching model, not a physical simulator or general 3D editor. Rotation uses named drag controls and fixed world axes; it does not provide arbitrary camera orbit or keyboard rotation. Real phones/iPads, Safari and Firefox remain unverified; mobile viewport touch simulation and local Chrome results are documented in TESTING.md. “HTTP” means local preview, not a published GitHub Pages update.
