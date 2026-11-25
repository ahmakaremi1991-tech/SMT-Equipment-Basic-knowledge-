# How to continue this project

## Open it online
- Catalogue: https://ahmakaremi1991-tech.github.io/SMT-Equipment-Basic-knowledge-/
- Any page: `…/machines/<name>.html`, for example `…/machines/handling_line.html#line`
- The AOI sorting line moved to its own repository, `SMT-AOI-sorting-line`

If the links return 404, turn on GitHub Pages: repository **Settings → Pages → Branch `main`, folder `/ (root)`**.

## Start a new Claude Code session on this project
1. Start the session with this repository selected.
2. Tell Claude: *"Read `docs/PROJECT_HISTORY.md` and `docs/HOW_TO_CONTINUE.md`, then continue."*
3. Add any new request to `docs/PROJECT_HISTORY.md` when it is done, then commit and push.

## Rebuild the pages
Every page is one self-contained HTML file. The build scripts read the sources in `source/suite/` and write the result to `/home/user/smt_*.html`; copy that file into `machines/`.

Requirements:
- Python 3
- Node.js
- three.js r147 in `source/lib/node_modules/three`:
  ```
  cd source && npm install three@0.147.0 --prefix lib
  ```
  (the placement page uses three r186 in `source/lib186`, bundled with esbuild by `npm.py`)

| Page | Command | Main sources |
|---|---|---|
| Handling line | `python3 source/suite/hnd_build.py` | `common.js`, `pcbkit.js`, `handling_parts.js`, `hnd2.js` |
| Printer / SPI / Reflow / AOI | `python3 source/suite/build4.py printer` (or `spi`, `reflow`, `aoi`) | `src/<page>.*.js` |
| Placement | `python3 source/suite/npm.py` | `npm.entry.js`, `mach2.js` |

`page.py`, `shell.css` and `shell.js` make up the shared page shell (theme, side panel, overlays, cycle-time badge).

## Test headless
The scripts in `source/suite/tests/` use the pre-installed Playwright Chromium with SwiftShader. Each page exposes `window.__sim` (`ff(seconds)` to fast-forward, `views`, `setHoods`, …). Example:
```
node source/suite/tests/check_hnd.js "a|selectMachine(0)|30"
```
Screenshots are written to `out/`, which is git-ignored.

## Machine pages = v2 speed versions (`machines/`; previous versions in `machines/v1/`)
```
cd source/suite
python3 build4.py printer && node tests/probe_dyn.js /home/user/smt_printer.html v2/dyn/printer.json "[machine]" 160   # only after a machine changes (probe the v1 build: nothing merged)
python3 build_v2.py                    # printer spi aoi reflow handling_line -> /home/user/smt_v2/*.html (V2_OUT to change)
python3 build_v2_npm.py                # placement (probe it with V2_PROBE=1 first, see the docstring)
node tests/perf_all.js ../../machines/v1 /home/user/smt_v2      # draw calls before/after
node tests/visual_v1_v2.js ../../machines/v1 /home/user/smt_v2 out/vis   # same moments, screenshots side by side
```
Copy the results into `machines/` (these are the main pages). The v2 builders reuse the v1 builders (`build4.py`, `hnd_build.py`, `npm.py`) and add `v2/perf.js` and `v2/v2shim.js`, so changes in the v1 sources reach v2 on the next build.

When a machine model changes, run `probe_dyn.js` again for that page, so the list of moving parts stays correct.
