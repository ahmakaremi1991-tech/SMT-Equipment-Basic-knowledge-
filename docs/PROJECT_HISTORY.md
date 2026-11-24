# Project history — SMT Equipment, Basic Knowledge

This file records what was asked for and what was decided while the project was built with Claude Code, so the work can be picked up in any new session.
Machine models are **brand-free** on purpose: the repository is public, so no manufacturer, company or person names appear in pages or code.

## Standing rules (apply to all new work)
- **Research first.** Technical details come from real sources (manufacturer datasheets, drawings, brochures, dealer listings, the owner's photos and videos), not from memory. If a source can't be found, say so and ask for photos or video.
- **Same scale everywhere.** Units are mm. SMT process machines use a 900 mm transport height and handling machines 950 mm. Lane 1 is at z = +170 and lane 2 at z = −170. Boards flow left to right, and the demo panel is 250 × 200 mm.
- **Same UI on every page:**
  - White / Dark-gray theme
  - collapsible left panel with on-screen data toggles, including Cycle time
  - persistent bottom toolbar
  - doors and hoods that open, a gantry you can watch, zoom
- One self-contained HTML file per page (three.js inlined), so pages work offline.
- No company or person names in anything published.

## Timeline

### 2026-11-10 → 11 — SMT process machines
1. **Placement machine** (dual lane, dual gantry): 3D model, then UI options were added (zoom, open the door, watch the gantry move, closer to the real machine's appearance).
2. **AOI**: the same door / gantry / zoom options, plus a light dome, strobe colours, moiré projectors and an FOV scan.
3. **Solder paste printer**: built from video references. Decision: all machines share one scale, and every machine has its own HTML page; later they are joined into a line.
4. **SPI** (3D solder paste inspection), with the same door / gantry options.
5. **Reflow oven** (dual-lane convection), then a solder physics tab: paste soaking, flux evaporation, melting point, liquidus, and solidification in the cooling zone, shown as an icon tab. Circulation fans were added.
6. All six pages were unified into one shared shell (theme, side panel, overlays, cycle-time badge).

### 2026-11-17 — Board handling line
7. One page (`machines/handling_line.html`) holds all handling machines, with a switch between single-machine view and the whole line from loader to unloader. The machines are loader, destacker, laser marker, conveyor, shuttle, scanner, FIFO buffer, inverter and unloader.
8. **Owner feedback:** the first versions were not close enough to the real machines, so they were rebuilt from datasheets plus the owner's photos and videos. Clarifications from the owner:
   - the conveyor has no cleaning head
   - the shuttle extension extends towards the upstream machine
   - the FIFO is dual track
   - the shuttle **pushes** the board to the next machine; it does not pull it
9. The project was saved to GitHub.
10. A **catalogue site** ("SMT Equipment – Basic Knowledge", modelled on a public SMT-factory catalogue page) was added: categories, machine cards with basic knowledge, thumbnails, and GitHub Pages hosting.
11. A header guide was added: page summary, machine list, viewing perspectives and an icon explanation.

### 2026-11-24 — Details from new videos
12. **Loader magazine** became an open frame with comb slot rails every 10 mm, with a visible gap between panels.
13. **Unloader:** the pusher pushes the panel into the magazine.
14. The **FIFO buffer** got a rounded window door.
15. A new **AOI review table** was added: the operator checks the AOI false calls and decides OK or NG. Good boards go on to the unloader; NG boards are taken out by hand.
16. **Mechanics correction (owner):**
    - Unloader: fills the magazine top → bottom. The pusher waits *behind* the panel at its reference point. The conveyor carries the panel to the end sensor, then the pusher pushes it into the magazine and returns to reference.
    - Loader: the reverse. It unloads bottom → top, the puller rod goes *under* the panel, and the finger flips up behind the far edge and pulls the panel out.

### 2026-11-24 — AOI sorting line (moved to its own repository `SMT-AOI-sorting-line` the same day)
17. The owner provided a brief for an offline AOI sorting line simulator. Agreed decisions:
    - The page is in **3D** and reuses the machine models. It is a **single lane** (lane 1).
    - Line: Loader → Flipper 1 → Scanner → AOI → Flipper 2 → Unloader.
    - Unloader magazines: Mag 1 good, Mag 2 good (used after Mag 1 is full), Mag 3 defects (red).
    - **No defect rate:** every panel is good unless the operator presses *Mark panel for judgement* while the panel is in the AOI. The line then pauses and a pop-up shows the serial number. **PASS** sends the panel to Mag 1 / Mag 2, **FAIL** sends it to Mag 3.
    - **Line setup is optional.** If it is off, the defaults are: TOP side (flippers bypass), magazine 212 mm, pitch 3, Program 1.
    - If line setup is on, the user chooses:
      - magazine width 164 / 175 / 190 / 212 mm
      - loader / unloader pitch 3 / 4 / 5
      - inspection side TOP = bypass or BOT = flip (one setting for both flippers)
      - AOI program
      - number of panels
      - magazine capacity (adjustable, maximum set by the pitch)

      Conveyor and flipper width follow the magazine width, and the panel is scaled to fit. START stays disabled until the setup is complete.
    - The loader input fills 3 loader magazines in turn.
    - A full magazine stops the line, and a *Replace magazine* button lets it continue.
    - Floor areas: "PENTRU SORTARE" (unsorted input), "SORTATE" (sorted output) and an Analysis area for Mag 3.
    - Controls: START / PAUSE / RESUME / STOP / RESET, speed 0.5–4×, tower light, counters, magazine fill bars, event log, run summary, and an **EN / RO** language switch.

## Where things are
| What | Path |
|---|---|
| Catalogue | `index.html` |
| Pages | `machines/*.html` |
| Thumbnails | `img/*.jpg` |
| Build sources | `source/suite/` (see `docs/HOW_TO_CONTINUE.md`) |
| Headless test / screenshot scripts | `source/suite/tests/` |
