# Builder Island — Minimalist 3D Practice Playground

**Builder Island** is an ultra-minimal, hands-on 3D practice playground for Grade 4 beginners. Kids learn spatial 3D actions—**clicking, dragging, resizing, rotating, lifting, and viewing different faces**—directly inside a single 3D workspace without reading long manuals.

---

## Minimalist Main Interface

The main screen contains only 5 elements:
1. **Short Progress Badge**: `1 / 8` to `8 / 8`
2. **One Short English Instruction** (≤ 6 words per step):
   - `1 / 8`: *"Drag the box to the target."*
   - `2 / 8`: *"Stretch the box to fit."*
   - `3 / 8`: *"Push the top handle down."*
   - `4 / 8`: *"Look from the TOP view."*
   - `5 / 8`: *"Rotate the box to fit."*
   - `6 / 8`: *"Look from the FRONT view."*
   - `7 / 8`: *"Lift the block up high."*
   - `8 / 8`: *"Pull the front handle out."* (completes the `40 × 30 × 4 mm` Safe Robot Base with Little Bot)
3. **Single Large 3D Interactive Workspace** (`#workspace-3d`) with:
   - Strictly single-action relevant handle rendered per step (move, right length square, top height square, TOP view button, `↻` rotate handle, FRONT view button, top lift cone, front width square)
   - ViewCube face buttons (`3D`, `TOP`, `FRONT`, `SIDE`) and background drag orbit (100% independent of model state)
   - Translucent green target outline on the workplane sharing the exact center-pivot 3D coordinate basis
4. **Small Target Preview Card** (`#target-mini-svg`) in the top-right corner of the 3D stage
5. **Bottom Action Bar**: `↺ Reset` (resets current step only), `💡 Hint`, and `Next →` / `Finish 🎉` (unlocks when matched; clicking `Finish 🎉` on Step 8 opens the **Completion Modal** with **Review My Skills**, **Try It in Tinkercad** student self-check, **Change My Design** free-build sandbox, and **Replay 1 / 8**)

*Note: The full Island Story, Teacher Notes (`"Practice model — not the Tinkercad editor."`), and Optional Real Screenshot Checklist are tucked inside the separate `ℹ️ Story & Teacher` modal so they never clutter the main practice screen.*

---

## Running Locally

```bash
python3 -m http.server 8080 --bind 127.0.0.1
```

- **Student Entry:** `http://127.0.0.1:8080/index.html` (saves to `builder-island.progress.v1`)
- **Isolated Demo Mode:** `http://127.0.0.1:8080/index.html?mode=demo` (isolated from student progress)
- **Isolated Test Mode:** `http://127.0.0.1:8080/index.html?mode=test`
