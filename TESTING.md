# Builder Island — Local Testing & Verification

This report describes checks actually executed during local development through Stage 4 on 2026-10-22. Documentation claims are not a substitute for running the tests. No dependencies were installed, and no commit, push or deployment was performed.

## Environment

- Node.js v26.8.1, Python 3.14.7, macOS Google Chrome.
- Browser harness uses Node built-ins, global `fetch`/`WebSocket`, a loopback HTTP server, and Chrome DevTools Protocol (CDP).
- Chrome executable: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`.
- Every browser test uses a disposable profile in the OS temporary directory and `?mode=test`; it does not use the normal Chrome profile or student progress key.
- Starting the local HTTP server / Chrome may require sandbox permission. No network service is needed.

## Commands

Run from the project root:

```bash
# Logic and storage regression (20 tests)
node --test tests/model-and-storage.test.mjs tests/storage-regression.test.mjs tests/stage3-model.test.mjs tests/stage4-model.test.mjs

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
| Logic/storage, Stages 1–4 | 20 passed, 0 failed |
| Original Stage 1–2 HTTP flows | 2 passed, 0 failed |
| Original Stage 1–2 file:// flows | 2 passed, 0 failed |
| Stage 2 native mouse supplement, HTTP/file:// | 2 passed, 0 failed |
| Stage 3 native mouse/touch, HTTP/file:// | 4 passed, 0 failed |
| Stage 4 native mouse/touch, HTTP/file:// | 4 passed, 0 failed |
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
