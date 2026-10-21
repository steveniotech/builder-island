# Builder Island — Testing & Verification Report

This report documents the automated unit/model tests and the real Google Chrome browser E2E tests for the refactored minimalist 8-step 3D playground.

---

## 1. Automated Unit & Model Tests (`tests/model-and-storage.test.mjs`)

Command:
```bash
node --test tests/model-and-storage.test.mjs
```

| Test Case | Verification Result |
| :--- | :--- |
| **Initial Uncompleted State (`1 / 8` .. `8 / 8`)** | Verified `evaluateStepMatch(createStepState(step)).matched === false` for all 8 steps; every instruction is ≤ 6 English words. |
| **Single Action Per Step & Non-Relevant Edit Blocking** | Verified Step 1 (`move`) ignores resize/rotate/lift updates; Step 2 (`length`) ignores x/y/width/height updates; Step 3 (`height`) changes height without changing `z` lift; Step 4 (`view-top`) & Step 6 (`view-front`) require only switching camera face and block all model edits; Step 5 (`rotate`) shares identical center-pivot `getBoxVertices` coordinates with target outline; Step 7 (`lift`) changes `z` elevation while keeping `height` constant (`10`); Step 8 (`width`) stretches width only. |
| **Camera & Model Independence** | Verified switching `ISO`, `TOP`, `FRONT`, `SIDE` and custom orbit angles via `setCameraInState` leaves `state.box` (`x, y, z, length, width, height, rotation`) 100% unchanged. |
| **Storage Isolation** | Verified student progress uses `builder-island.progress.v1`, while `?mode=demo` uses `builder-island.demo.v3` and `?mode=test` uses `builder-island.isolated-test.v1`. |

---

## 2. Real Google Chrome Browser E2E Tests (`tests/browser-e2e.test.mjs`)

Command:
```bash
node --test tests/browser-e2e.test.mjs
```

Executed in a real `/Applications/Google Chrome.app` instance via Chrome DevTools Protocol against a local HTTP server (`?mode=test`):

1. **Step 1 (`1 / 8` — Move Only)**:
   - Confirmed `btn-next` starts disabled and `.handle-node` count is `0` (no resize, rotate, or lift handles rendered).
   - Clicked `TOP`, `FRONT`, `SIDE`, `3D` and dragged `#orbit-bg`; verified stored `box` coordinates/dimensions/rotation remained `{ x: 14, y: 46, z: 0, length: 20, width: 20, height: 20, rotation: 0 }`.
   - Dragged `#student-box-group` onto `#target-ghost-group`; verified header showed `"Nice!"`, `#nice-badge` appeared, `btn-next` enabled, and progress stayed on `1 / 8` without auto-jumping.
2. **Step 2 (`2 / 8` — Length Only & Reset Current Step)**:
   - Confirmed only `['length']` handle rendered.
   - Dragged `[data-action="length"]` to match target outline (`"Nice!"`).
   - Clicked `#btn-reset`; verified progress remained on `2 / 8` (did not reset back to Step 1) and `btn-next` returned to disabled.
   - Re-stretched `[data-action="length"]` to complete Step 2.
3. **Step 3 (`3 / 8` — Height Only)**:
   - Confirmed only `['height']` handle rendered; dragged top white square down to target height (`4`), verified `"Nice!"`.
4. **Step 4 (`4 / 8` — TOP View Only)**:
   - Confirmed `0` model handles rendered (`[]`) and `btn-next` initially disabled; clicked `#view-btn-top` without moving the box and verified `"Nice!"` immediately enabled `btn-next`.
5. **Step 5 (`5 / 8` — Rotate Only)**:
   - Confirmed only `['rotate']` handle rendered; clicked `[data-action="rotate"]`, verified 90° center-pivot rotation matched target outline and displayed `"Nice!"`.
6. **Step 6 (`6 / 8` — FRONT View Only)**:
   - Confirmed `0` model handles rendered (`[]`) and `btn-next` initially disabled; clicked `#view-btn-front` without pulling height and verified `"Nice!"` immediately enabled `btn-next`.
7. **Step 7 (`7 / 8` — Lift Cone Only)**:
   - Confirmed only `['lift']` black cone handle rendered; dragged cone up to `z = 22`, verified `box.height` stayed `10` and displayed `"Nice!"`.
8. **Step 8 (`8 / 8` — Width Only & Post-Completion Flow)**:
   - Confirmed only `['width']` handle rendered; dragged front white square out to complete the `40 × 30 × 4 mm` Safe Robot Base (`"Nice!"` and `#little-bot-mascot` rendered on the base).
   - Clicked `#btn-next` (`Finish 🎉`); verified `#modal-complete` opened with **Review My Skills** (all 8 skills), **Try It in Tinkercad** self-check, **Change My Design** (`#btn-change-design` unlocking all 5 handles `['length', 'width', 'height', 'lift', 'rotate']` in Free Play mode), and **Replay 1 / 8** (`#btn-replay-all` resetting back to `1 / 8`).
9. **Console & Page Exceptions**:
   - `0` console errors and `0` uncaught exceptions across all 8 steps.
