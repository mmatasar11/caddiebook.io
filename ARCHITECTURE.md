# Caddie Book — Architecture

One principle drives everything: **the app ships as a single HTML file** (that is what makes offline bulletproof), but **the source is a modular project**. `node build.js` concatenates the manifest into `dist/caddiebook.html`.

## Directory layout

```
golf/
├── build.js              the assembler; its MANIFEST arrays define load order
├── src/
│   ├── shell-head.html   <head>: viewport, PWA meta, home-screen icon
│   ├── css/
│   │   ├── theme.css     ALL design tokens, commented per token + hi-vis theme
│   │   └── app.css       layout & components (never hardcodes a color)
│   └── js/
│       ├── 01-core.js        storage primitives + utilities
│       ├── 02-store.js       state object S: full schema doc, seeds, load/save
│       ├── 03-notation.js    the 1-9 notation constants + club helpers
│       ├── 04-engine.js      per-hole/per-round derivation (rules documented)
│       ├── 05-handicap.js    WHS math + global stat filters
│       ├── theme.js          THEME override object (restyle without CSS)
│       ├── components.js     ui.* reusable HTML builders
│       ├── 06-router.js      TABS registry + render()
│       ├── 07-play-home.js   Play hub, history, course pages
│       ├── 08-course-editor.js  manual grid, paste parser, online lookup
│       ├── 09-hole.js        hole screen: Shots + Quick modes
│       ├── 10-shot-sheet.js  the tap-first entry sheet
│       ├── 11-round-views.js overview, finish, past-round detail
│       ├── 12-stats.js       dashboard, heatmaps, yardages, insights
│       ├── 13-practice.js    drills, sessions, TrackMan
│       ├── 14-tips.js        tips library
│       ├── 15-more.js        bag, courses, settings, golf-isms
│       ├── 16-data.js        JSON/CSV/AI exports, 18Birdies import
│       └── 17-init.js        sheet/toast plumbing, boot, console bridge
├── dist/caddiebook.html  the deployable artifact
├── docs/                 this file + CUSTOMIZING.md
└── test.js, test_import.js, test_v3.js   48 jsdom tests (run: node test.js)
```

## The three layers

**Data (01-05).** One plain object `S`, autosaved as JSON after every interaction. The schema is documented at the top of `02-store.js` and mirrors relational tables on purpose. Nothing derived is ever stored: `04-engine.js` computes score/putts/FIR/GIR/scrambling from the shot list on demand, with per-hole overrides in `h.ov` (which is also where Quick mode writes). Change a rule (say, what counts as a sand save) in the engine and every screen, export, and stat follows.

**UI primitives (theme.js, components.js, css).** All colors/radii/fonts are CSS custom properties in `theme.css`; `theme.js` is a JS override layer applied at boot. `components.js` exposes `ui.btn / chip / card / seg / stat / listRow / field` — string builders so views stay consistent. `vMoreMenu()` and `backBtn()` in `15-more.js` are worked examples.

**Views (06-17).** Every screen is a pure function returning an HTML string. There is exactly one draw call, `render()` in the router: it paints the nav from the `TABS` registry, calls the active tab's view, then saves. Event handlers are global functions referenced from inline `onclick` — deliberately simple and debuggable from Safari's Web Inspector (the console bridge in `17-init.js` exposes `S`, `HM`, etc. on `window`).

## Data-flow in one sentence

Tap → a global handler mutates `S` (or a draft like `SH`/`CE`) → `render()` → view functions read `S` through the engine → HTML string → autosave.

## Invariants worth protecting

- **No network in a core path.** Online course lookup and anything future must degrade to a fully offline path.
- **Digits are meaningless without their pad.** Always carry `fType`/`shape` context; exports suffix `g/p/s`.
- **Never block a save on an optional field.** Speed of entry is the product.
- **Derive, don't duplicate.** New stats read from `deriveHole`/`deriveRound`, not from new stored fields.
- **Migrations are additive.** New state = default in `defaultState()` + backfill in `loadState()`. Never rename stored keys casually; old backups must import.

## Tests

`node test.js && node test_import.js && node test_v3.js` — 48 assertions covering the round lifecycle, derivation math, WHS handicap, 9/18 normalization, Quick mode, imports, and all export formats. They run jsdom against the *built* file, so run `node build.js` first. Add a test whenever you touch the engine; the helpers `uiText()`/`uiHTML()` read only rendered containers (never the inline script).
