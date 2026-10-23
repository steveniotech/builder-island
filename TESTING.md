# Builder Island — Local Testing & Verification

This report describes checks actually executed during local development through Stages 5 and 6 on 2026-10-22. Documentation claims are not a substitute for running the tests. No dependencies were installed, and no commit, push or deployment was performed.

## Environment

- Node.js v26.8.1, Python 3.14.7, macOS Google Chrome.
- Browser harness uses Node built-ins, global `fetch`/`WebSocket`, a loopback HTTP server, and Chrome DevTools Protocol (CDP).
- Chrome executable: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
- Every browser test uses a disposable profile in the OS temporary directory and `?mode=test`; it does not use the normal Chrome profile or student progress key.
- Starting the local HTTP server / Chrome may require sandbox permission. No network service is needed.

## Commands

Run from the project root:

```bash
# Logic and storage regression (27 tests)
node --test tests/model-and-storage.test.mjs tests/storage-regression.test.mjs tests/stage3-model.test.mjs tests/stage4-model.test.mjs tests/stage5-model.test.mjs

# Original Stage 1–2 browser flows (2 tests, HTTP)
node --test tests/browser-e2e.test.mjs

# Same Stage 1–2 flows, opening the actual offline file with file:// (2 tests)
OFFLINE=1 node --test tests/browser-e2e.test.mjs

# Additional Stage 2 native mouse input + reload/isolation (2 tests: HTTP and file://)
node --test tests/stage2-native.test.mjs

# Stage 3 native input (4 tests: HTTP/file:// × desktop/mobile viewport)
node --test tests/stage3-browser.test.mjs

# Stage 4 native input (4 tests: HTTP/file:// × desktop/mobile viewport)
node --test tests/stage4-browser.test.mjs

# Stage 5 native input (4 tests: HTTP/file:// × desktop/mobile viewport)
node --test tests/stage5-browser.test.mjs

# Offline artifact regeneration and exact sync check
node scripts/build-offline.mjs
node scripts/build-offline.mjs --check

# Source syntax and whitespace checks
node --check src/model.js
node --check src/storage.js
node --check src/app.js
git diff --check
```

For manual local review:

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

Open `http://127.0.0.1:8080/index.html?mode=test`, or open `Builder-Island-Student.html?mode=test` as a file URL. Student, demo and test data use separate storage keys. HTTP and file URLs do not share a storage origin.

## Final Executed Results

| Check | Result |
| --- | --- |
| Logic/storage, Stages 1–5 | 27 passed, 0 failed |
| Original Stage 1–2 HTTP flows | 2 passed, 0 failed |
| Original Stage 1–2 file:// flows | 2 passed, 0 failed |
| Stage 2 native mouse supplement, HTTP/file:// | 2 passed, 0 failed |
| Stage 3 native mouse/touch, HTTP/file:// | 4 passed, 0 failed |
| Stage 4 native mouse/touch, HTTP/file:// | 4 passed, 0 failed |
| Stage 5 native mouse/touch, HTTP/file://, all 12 tasks per run | 4 passed, 0 failed |
| Captured browser console errors / uncaught exceptions | 0 / 0 |
| Offline exact-sync, source syntax, whitespace checks | Passed |

## Executed Coverage

### Logic tests

- Stage 1: original 8 single-action tasks, initial unmatched states, relevant-only changes, TOP/FRONT camera tasks and Free Play behavior.
- Stage 2: all 8 challenge tasks, move/turn order independence, 180° direction rejection at 0°, 270°/−90° equivalence, fixed block correspondence, partial assembly rejection, matched-block invalidation, camera independence and per-stage storage.
- Stage 3: all 8 tasks initially unmatched and solvable in either allowed operation order; wrong length, width, block height or lift rejected; completed history cannot override a current mismatch.
- Proportional scale preserves length/width/height ratios at arbitrary fractional scales and limits, the bottom center and lift. Midpoint edits preserve other dimensions; lift preserves all dimensions. Negative/oversized values clamp; non-finite values are ignored; move, rotation, block-height edits and Q8 proportional scale are blocked.
- Storage: v3 migration when Stage 2 is saved first; fresh-manager restoration of partial multi-block state, selection and camera; independent stages 1–3; old saves never inherit Stage 3 completion; fractional Stage 3 scale restores exactly; corrupt/unknown saves and unavailable storage recover without crashing.

### Desktop browser interaction

- Existing `browser-e2e.test.mjs`: actual headless Chrome runtime, but interaction is simulated with page-side `dispatchEvent(new PointerEvent(...))`. Covers all Stage 1–2 tasks in HTTP and file://, hints, handles, stage switching, completion and live Next invalidation. This validates event handling and rendering, not hardware pointer hit testing.
- Additional `stage2-native.test.mjs`: **CDP native mouse input**, without model-state writes. Physically hit-tests and drags Stage 1 Q1, then completes Stage 2 Q1 by moving and holding the rotate handle. Checks click-only rotation rejection, moving away, reload restoration, Reset, stage isolation and preservation of Stages 1–2 through Stage 3 Reset, in both HTTP and file://. Stage 2 Q2–Q8 are covered by the existing synthesized-event flows, not this native mouse supplement.
- `stage3-browser.test.mjs`: **CDP native mouse input at 1280 × 800**, HTTP and file://. All 8 tasks completed by handle drags. No direct app/model-state mutation is used to complete tasks; tests read persisted state to assert results.
- Stage 3 browser checks: permitted handles only, click-only no-op, fixed center, preserved ratios and non-target axes, unchanged camera/rotation, scale upper/lower bounds, ground lower bound, lift/resize order, wrong partial solutions rejected, matching without auto-advance, moving away disables Next, Hint, Back, Reset, switching/reload, completion, stage selection and replay isolation.

### Mobile viewport simulation

- The same Stage 3 tasks run at **390 × 844**, with Chrome touch emulation and native CDP touch start/move/end/cancel events, in HTTP and file://.
- Control centers must be hit-testable; hit areas are at least 44 CSS pixels. Stage name, task count and navigation must fit the viewport. Release/cancel ends dragging; subsequent unpressed mouse movement cannot continue the operation. Resizing does not orbit the camera or scroll the page.
- Desktop and mobile Task 8 screenshots were generated to the OS temporary directory and visually inspected. This uncovered and corrected clipped navigation / status and small handle targets.
- **This is viewport/touch simulation, not a real phone or iPad test.**

### Artifact and error checks

- The offline bundle is generated from the same HTML, CSS and three source modules; `--check` compares the entire generated artifact exactly.
- Browser tests assert no captured console errors or uncaught exceptions.
- Syntax and `git diff --check` pass.

## Unverified / Limits

- Real iPhone, Android and iPad hardware: **unverified**.
- Safari, Firefox and browsers other than the installed macOS Chrome: **unverified**.
- Mobile Stage 1–2 native touch flows: **unverified**; their existing browser flows were executed at desktop dimensions.
- Every camera angle, landscape orientation, keyboard-only use, assistive technology, multi-touch interruption and storage-quota exhaustion in a real browser: **unverified**. Logic tests cover unavailable storage, but not every browser policy.
- Offline file storage behavior varies by browser; verified only in the installed Chrome with a disposable profile. No claim that HTTP/file progress transfers automatically.
- No production deployment, remote branch state or live hosted site was tested.


## Corner Handle Acceptance Fix

The Stage 3 white proportional-scale handle now sits directly on the lowest visible projected bottom vertex, with no offset or connector line. Its position is recomputed from the rendered box while resizing and lifting. The drag scale is computed from a fixed pointer-down basis along the projected center-to-corner direction, so pressing the handle does not jump the model and outward/inward drags enlarge/shrink consistently. Stage 3 length/width controls are black; the lift triangle and its behavior remain unchanged.

`stage3-browser.test.mjs` adds per-move comparisons against actual rendered polygon vertices, including after lift; checks that pointer-down leaves rendered values unchanged; and retains ratio, lift, center and camera invariants. It also checks black axis handles and non-overlapping enabled hit regions at each task's initial state. Tasks 1, 2 and 7 complete using native mouse and simulated native touch input in HTTP and file://. These are automated desktop and mobile viewport checks, not real device testing.


## Stage 4 — Rotate in 3D

### Coordinates, representation and matching

The inherited reference is +Z up, +Y front, +X right. Spin uses the fixed world Z axis. Forward/Back uses fixed world X (forward = −90°, top +Z goes toward front +Y). Sideways uses fixed world Y (right = +90°, top +Z goes toward right +X). The fixed ISO camera is identical for the target and block; camera input and all non-rotation edits are disabled in Stage 4.

Orientations use normalized `[w,x,y,z]` quaternions. Applying a world-axis rotation left-multiplies the current orientation. Final match compares the shortest quaternion angle using the absolute dot product, with a 6° tolerance, plus unchanged dimensions and center. It does not compare Euler components, bounding boxes, drag count or a required action sequence. A mild 5° quarter-turn snap applies to the continuously dragged angle. The center `(50,40,34)` and cuboid `32×22×16` are invariant; the corner radius is 21 mm, so all orientations clear the workplane by at least 13 mm without automatic lifting.

Q8's documented solution is world Z +90°, then world X −90°. World Y +90°, then world Z +90° reaches the same orientation and is also exercised. Swapping the documented order generally gives a different result and is checked as such.

### Executed logic tests (`tests/stage4-model.test.mjs`, 8 passed)

- Both signs of 90° around all three world axes; independent vector checks for forward/right meanings.
- 360° turns, many smaller turns, quaternion sign equivalence, ordered compositions and an alternative valid Q8 path.
- All eight tasks start unmatched and solve with their configured axes, including extra full rotations. Turning away invalidates the current match despite history.
- Identical bounds with different face directions are rejected; 5° error accepted and 8° error rejected.
- Center, dimensions, minimum ground clearance and camera stay invariant under arbitrary rotations. Unavailable actions and invalid angle input cannot change the model.
- Version 5 Stage 4 orientation restore and stage isolation; invalid/missing orientation schema recovery; old scalar rotations retain Stage 1–2 semantics.
- Saving Stage 4 first into old v3/v4 progress preserves prior snapshots and completion records.

### Executed native browser tests (`tests/stage4-browser.test.mjs`, 4 passed)

The complete eight-task path runs in installed Chrome for **HTTP/file:// × 1280×800 desktop mouse / 390×844 mobile viewport touch simulation**. Native CDP input performs the turns; tests never write internal model state to complete tasks. Read-only persisted state and rendered polygons provide assertions.

- Single clicks and pointer-down cause no orientation jump. Native hold/drag continuously changes only the selected world axis; crossing 180° and 360° stays continuous.
- Active arrow highlighting, fading other arrows, English names, world-axis lines and reference rings are checked. The axis/ring geometry stays fixed throughout a drag even though the model rotates.
- Q1–6 expose exactly the permitted arrow; Q7–8 expose all three without initial highlighting. Wrong-axis attempts retain their result and can be corrected.
- Model center, dimensions and camera remain unchanged. No resize/lift handle is present and no page scrolling occurs. Mouse release and native touch cancel stop further rotation.
- All eight tasks complete by native dragging. Wrong orientation disables Next; correct orientation enables it without advancing; turning away disables it again. Extra turns and alternate valid Q8 sequences are accepted.
- Q7's axis hint appears only after Hint. Q8's first and second Hint clicks show separate levels.
- Back, Reset, reload, switching stages, completion, stage selection, replay and preservation of earlier-stage snapshots are checked.
- Back-facing face marks are absent from rendered geometry. The matched model and fixed target thumbnail expose the same expected faces.
- At every task's initial state, arrow hit regions do not overlap one another, the student block, or the target preview; navigation and controls fit the desktop/mobile viewport. Screenshots for Q1, Q3, Q5 and Q8 were captured during actual native dragging and visually reviewed. A reference label that touched an inactive arrow was moved into a separate caption area.
- Captured console errors and uncaught exceptions: **0**.

### Earlier-stage regression and test adjustment

Stage 1–2 full browser flows passed in HTTP and file://; Stage 2 native mouse supplements also passed. Stage 3's four native input variants passed, including per-move white-corner/real-vertex coincidence, scale ratios, black single-axis handles and lift behavior. The only Stage 3 test change is expecting four stage-selection cards.

One original Stage 2 synthesized-event assertion initially failed because its 180° gesture used a fixed pixel distance and the four-stage header changed SVG scale. The test helper now produces the intended tangential gesture using the live SVG transform. The existing Stage 1–2 rotation engine and match rules were not altered to make this pass. The adjusted full flows passed again for HTTP and file://.

### Compatibility and limitations

The existing storage keys remain unchanged. New writes use envelope version 5; Stage 4 boxes use `orientationVersion:1`. v3 and v4 reads remain supported, and old scalar `rotation` data is not converted into Stage 4 completion. No localStorage clearing is performed.

“HTTP” in this report means local loopback preview, **not GitHub Pages**. Real phones/iPads, Safari, Firefox, mobile Stage 1–2 native touch flows, exhaustive landscape/orientation combinations, multi-touch and keyboard-only/screen-reader use remain **unverified**. The model has no physics/collision/stacking. No dependencies, accounts, external services, commit, push or deployment were added.


## Stage 5 — Rotation Challenge

The twelve world-axis solutions and the two duplicate-target corrections are recorded in README. Stage 5 reuses Stage 4's quaternion composition, marked cuboid, camera, controls and matching. The total is configuration-driven (12 here, 8 in each earlier stage); storage envelope v5 and orientationVersion 1 remain compatible.

### Logic (`tests/stage5-model.test.mjs`)

Seven tests cover complete configuration and prompts; all three actions on every task; twelve distinct target orientations; the original Q9/Q12 duplicates and corrected targets; noncommutative Q7/Q10 order; Q12 not being a single-coordinate-axis rotation; reference solutions, full-turn/quaternion-sign equivalence and rejection of wrong face orientations; unchanged center/dimensions/camera and blocked non-rotation edits; observation/action/from-start hint layers; 12-task navigation/storage boundaries and independence; v3/v4/v5 compatibility without inventing Stage 5 completion.

### Native browser (`tests/stage5-browser.test.mjs`)

Four complete twelve-task runs use installed Chrome: local HTTP and the generated file:// bundle, each with desktop native CDP mouse at 1280×800 and mobile viewport native CDP touch simulation at 390×844. No internal state is written to complete tasks. Every task physically hit-tests and drags all three controls in both directions, then reaches the target by its reference solution.

Checks include click-only and pointer-down no-op, selected fixed-axis changes, active guides/fading and restored appearance, unchanged center/size/camera, release/touch-cancel stopping rotation, extra full turns, wrong-axis recovery, no scrolling, control/model/target separation and visible navigation. Every task checks Next disabled before matching, enabled without auto-advance, and disabled again after turning away. Hint layers leave geometry and saved orientation unchanged and explicitly label start-based advice. Back, current-task Reset, stage switching, refresh, twelve-chip completion, stage summaries and replay preserve previous-stage snapshots. Quaternion restoration is compared by orientation equivalence, allowing normalization rounding at machine precision.

Screenshots of tasks 1, 7, 10 and 12 are written only to the OS temporary directory, outside the repository. Real devices, Safari and Firefox remain **unverified**. HTTP here means local loopback preview; this task does not publish or validate a new GitHub Pages version.

Final Stage 5 local run: **27 logic/storage tests and 18 browser tests passed**, with no captured console errors or uncaught exceptions. The legacy Stage 1 synthesized rotation gesture was changed from a fixed CSS-pixel distance to a projection-scaled tangent drag so navigation wrapping does not change its intended 90° turn; application rotation behavior is unchanged. Twelve-item completion may require scrolling within the existing small-screen modal; the browser test scrolls the button into view and checks its actual hit target before clicking. Offline exact sync, source syntax and whitespace checks passed. No dependencies were installed and no commit, push or deployment was performed for Stage 5.


## Stage 6 — Align Shapes (9 retained tasks)

Stage 6 contains exactly the original tasks 1–9: X min/center/max, Y max/center/min (Front/Center/Back), Z min/center/max. The cancelled tasks and Q10 teaching-pilot implementation/tests are removed. Prior 12-task and pilot test totals do not describe this version. Stage counts come from configuration: [8, 8, 8, 8, 12, 9].

```bash
node --test tests/model-and-storage.test.mjs tests/storage-regression.test.mjs tests/stage3-model.test.mjs tests/stage4-model.test.mjs tests/stage5-model.test.mjs tests/stage6-model.test.mjs
node --test tests/stage6-browser.test.mjs tests/stage6-migration-browser.test.mjs
ALIGN_LAYOUT_REGRESSION=1 node --test tests/stage6-browser.test.mjs
node scripts/build-offline.mjs
node scripts/build-offline.mjs --check
```

The Stage 6 logic/storage tests cover each geometric alignment calculation, different dimensions, reference invariance, axis-only changes, stable repeat clicks, unchanged dimensions/orientation, pure preview, actual-operation evidence, current match versus history, selection/reference guards, Undo, Reset, all nine targets, independent storage and corrupt metadata. Generic three-model algorithm coverage remains, without retaining cancelled practice tasks.

Migration fixtures for old task numbers 10/11/12 exercise old completion lists with gaps, duplicates and cancelled entries. Loading must return exactly Q9’s own initial geometry, selection, Align/reference/Undo state; retain only valid 1–9 history; never infer completion from the old task number; and preserve all other stage snapshots and unrelated storage keys. Existing v4/v5 interpretation rules are unchanged. Browser fixture injection is used only to test legacy loading, never to claim interaction completion.

`stage6-browser.test.mjs` completes all nine tasks using native CDP mouse clicks/touch taps. It checks 1 / 9 through 9 / 9, every offered min/center/max option, wrong options, unchanged reference/other axes/size/orientation, all live 44px hit bounds and their separation from models/target, Hint without state edits, pure preview, Undo with historical completion, Reset, refresh, Back and Stage 5 round trips. Q9 Finish opens a nine-skill Stage 6 completion dialog; stage selection shows 9 / 9 and nine completed, with no Q10 navigation. Replay returns to Q1. Other-stage snapshots remain intact.

Default interaction profiles: 1280×900 mouse and 390×844 touch simulation, each via local HTTP and generated file://. The layout matrix uses 636×580 mouse/DPR2, 390×844 touch/DPR1, 1024×600 mouse/DPR1 and 844×390 landscape touch/DPR1, each via HTTP/file. All use default 100% zoom and page scale 1. Q9 resize coverage switches between 636×580 grouped controls and 390×844 projected dots; exactly three live targets remain, position/reference state stays intact, and native Top/Undo still works. The previously fixed grouped-button implementation remains; target areas are not reduced to hide overlap.

`stage6-migration-browser.test.mjs` checks all three cancelled save numbers and `step=10/11/12` legacy URL parameters in HTTP and offline Chrome. Each shows normal unmatched Q9, two configured models, Align off and Next disabled. A normal Reset confirms the rendered geometry was already the fresh Q9 setup and leaves other stage records intact. Console errors and uncaught exceptions are captured.

Real phones/iPads, Safari, Firefox, a complete keyboard-only and screen-reader flow remain unverified. Touch profiles are simulations, not real devices; local HTTP is not a GitHub Pages production check. This change does not commit, push or deploy.

Final executed results for the nine-task reduction: **36 logic/storage tests passed, 0 failed**; **26 browser tests passed, 0 failed**: 8 native nine-task flows (1280×900 mouse, 636×580 mouse/DPR2, 390×844 touch simulation, 844×390 landscape touch simulation, each HTTP/file), 2 migration/deep-link browser tests, and 16 prior-stage regression tests. Each migration browser test covers all three cancelled save numbers and all three legacy step parameters. The optional 1024×600 layout profile was not run in this change. All executed Stage 6 live target rectangles were at least 44px, non-overlapping and inside the viewport; Q9 grouped/projected resizing retained exactly three live targets. Captured console errors and uncaught exceptions: **0 / 0**. The final source/offline exact-sync, syntax and whitespace checks passed.

The 16 prior-stage tests comprise 2 HTTP complete Stage 1/2 flows, 2 Stage 2 native-mouse HTTP/file variants, and 4 mouse/touch × HTTP/file variants each for Stages 3–5. The separate `OFFLINE=1` Stage 1/2 complete-flow pair was not rerun. Browser fixture setup does not count as actual task completion; all eight nine-task Stage 6 flows use real native input on the visible controls.
