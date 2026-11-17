# SMT Equipment – Basic Knowledge

Open `index.html` for the categorised catalogue of all machines (also served via GitHub Pages).

Interactive 3D simulations of an SMT production line, one self-contained HTML file per machine (open in any browser, works offline).

| File | Machine |
|---|---|
| `machines/handling_line.html` | Board handling line: loader, destacker, laser marker, conveyor, shuttle, scanner, FIFO buffer, inverter, unloader. Single-machine view or whole line connected. |
| `machines/printer.html` | Solder paste stencil printer |
| `machines/spi.html` | 3D solder paste inspection (dual lane) |
| `machines/placement.html` | Dual-lane, dual-gantry placement machine |
| `machines/reflow.html` | Dual-lane convection reflow oven (thermal profile, solder joint view, circulation fans) |
| `machines/aoi.html` | Dual-lane 3D automated optical inspection |

All pages share the same UI (White / Dark gray theme, collapsible left panel, on-screen data toggles including cycle time), the same millimetre scale, and the same 250 × 200 mm demo PCB.
Machine models are generic (no brand names) and based on manufacturer datasheets, drawings and reference photos.

`source/` holds the build scripts and source fragments used to generate the HTML files (three.js is bundled into each page).
