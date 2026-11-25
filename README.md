# SMT Equipment – Basic Knowledge

**Online:** https://ahmakaremi1991-tech.github.io/SMT-Equipment-Basic-knowledge-/ (catalogue) · [Handling line](https://ahmakaremi1991-tech.github.io/SMT-Equipment-Basic-knowledge-/machines/handling_line.html#line)

Open `index.html` for the categorised catalogue of all machines.

The **AOI sorting line** simulator now has its own repository: https://github.com/ahmakaremi1991-tech/SMT-AOI-sorting-line (site: https://ahmakaremi1991-tech.github.io/SMT-AOI-sorting-line/).

Project history and decisions: [`docs/PROJECT_HISTORY.md`](docs/PROJECT_HISTORY.md) · how to rebuild, test and continue: [`docs/HOW_TO_CONTINUE.md`](docs/HOW_TO_CONTINUE.md)

Interactive 3D simulations of an SMT production line, one self-contained HTML file per machine (open in any browser, works offline).

| File | Machine |
|---|---|
| `machines/handling_line.html` | Board handling line: loader, destacker, laser marker, conveyor, shuttle, scanner, FIFO buffer, inverter, AOI review table, unloader. Single-machine view or whole line connected. |
| `machines/printer.html` | Solder paste stencil printer |
| `machines/spi.html` | 3D solder paste inspection (dual lane) |
| `machines/placement.html` | Dual-lane, dual-gantry placement machine |
| `machines/reflow.html` | Dual-lane convection reflow oven (thermal profile, solder joint view, circulation fans) |
| `machines/aoi.html` | Dual-lane 3D automated optical inspection |
| `machines/v1/` | Previous (slower) versions of the pages, with a comparison page `machines/v1/index.html` |

Since 2026-11-25 every page is the **v2 speed version**: parts that never move are merged, repeated parts are instanced, shadows and camera insets refresh at most 10× per second, nothing is redrawn while paused, and there is a Graphics quality switch (Auto / High / Low), a Performance overlay and a phone layout.

All pages share the same UI (White / Dark gray theme, collapsible left panel, on-screen data toggles including cycle time), the same millimetre scale, and the same 250 × 200 mm demo PCB.
Machine models are generic (no brand names) and based on manufacturer datasheets, drawings and reference photos.

`source/` holds the build scripts and source fragments used to generate the HTML files (three.js is bundled into each page).
