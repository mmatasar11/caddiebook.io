# Caddie Book — Customizing & Extending

Every recipe below is: edit the named file(s), run `node build.js`, refresh. Tests: `node test.js && node test_import.js && node test_v3.js`.

## 1. Change colors, fonts, shapes (30 seconds)

Two equivalent places, pick one:

**A. CSS defaults** — `src/css/theme.css`, every token commented:
```css
--turf:#1B6B41;      /* primary green: links, accents, selected pads */
--r:16px;            /* large radius: cards, sheets */
```

**B. JS overrides** — `src/js/theme.js`, wins over CSS without touching it:
```js
const THEME = {
  '--turf': '#0E5A8A',   // suddenly a blue app
  '--tap':  '58px',      // chunkier buttons everywhere
};
```

Nothing in `app.css` hardcodes a color, so a token change is global by construction.

## 2. Add a new bottom-nav tab (three edits)

1. New file `src/js/18-goals.js`:
```js
/* GOALS TAB */
function vGoals(){
  return `<div class="pageTitle"><h1>Goals</h1></div>`
    + ui.card('Season targets', `<p>Break 80 at Fossil Trace.</p>`);
}
```
2. Register it in `src/js/06-router.js`:
```js
TABS.push({id:'goals', ic:'🥅', label:'Goals', view: ()=>vGoals()});
```
3. Add `'18-goals.js'` to the `JS` manifest in `build.js` (anywhere after `components.js`).

Persistent data too? Add `goals: []` in `defaultState()` and `'goals'` to the backfill list in `loadState()` (`src/js/02-store.js`) — backups and restore then handle it automatically.

## 3. Add a stat card to the dashboard

In `src/js/12-stats.js`, inside `vStats()` you already have `rds` (derived rounds) and `agg` (summed counters). Compute, then append one card to the returned string:
```js
const bogeyTrains = rds.filter(d=>d.perHole.some((h,i)=>
  i>1 && [i,i-1,i-2].every(j=>d.perHole[j].toPar>0))).length;
// …then in the template:
${ui.card('Bogey trains', `<div class="grid2 center">
   ${bignum(bogeyTrains,'rounds with 3+ in a row')}</div>`)}
```
`hotClubsCard()` is the fully-worked model: filtered inputs, minimum sample sizes, graceful "not enough data yet" states.

## 4. Add a drill, a lie code, a strike tag, a TrackMan metric

All are one array row:
- Drill → `DRILLS` in `src/js/13-practice.js` (`{cat, name, how}`)
- Lie code → `LIES` in `src/js/03-notation.js` (two letters, collision-safe)
- Strike tag → `STRIKES`, wind → `WINDS`, same file
- TrackMan metric → `TM_METRICS` (`[key, label, unit]`) — it appears in the Settings column picker and practice tables automatically

## 5. Add a setting

`src/js/02-store.js`: give it a default in `settings{}`. `src/js/15-more.js`: one line in `vSettings()`:
```js
${setting('Confetti on birdies','Because you earned it.','confetti')}
```
Read it anywhere as `S.settings.confetti`. Existing users pick up the default on next load (see MIGRATION RULE in 02-store).

## 6. Build a new screen with the component library

```js
function vExample(){
  return `<div class="pageTitle"><h1>Example</h1></div>`
    + ui.card('Section title',
        ui.field('Name','', {id:'exName', placeholder:'…'})
        + `<div style="height:10px"></div>`
        + ui.btn('Save', 'exSave()', {kind:'primary', wide:true}),
      )
    + ui.card('', ui.listRow('Row title','subtitle',"toast('tapped')"), {tight:true});
}
```
Full builder reference with parameter docs: `src/js/components.js`. `vMoreMenu()` in `15-more.js` shows a real screen assembled this way.

## 7. Change a derivation rule

All scoring logic lives in `src/js/04-engine.js` with the rules spelled out in the header (FIR, GIR, scrambling, sand saves). Example — count scramble attempts only when a short-game shot exists, instead of every missed GIR: edit the `udA` line in `deriveHole()`. Every screen, export, and stat updates, because nothing stores derived values. **Add a test** in `test.js` mirroring the `deriveHole` steps whenever you touch this file.

## 8. Reskin the numpads

The pad is one component: `padHTML()` in `src/js/10-shot-sheet.js` renders entry pads, `heatmapCard()` renders the heat variant — both styled by the `.pad` block in `src/css/app.css`. Labels/digit meanings live in `PAD_LABELS` (`03-notation.js`). Cell size: `.pad button{min-height}`; the pure-cell dot: `.pad button.pure::after`.

## Gotchas

- **Load order matters**: the `JS` array in `build.js` is truth. Constants/engine before views.
- **User text into HTML** goes through `esc()` — always.
- **`onclick` strings** run in global scope: new handlers must be top-level `function`s, not `const` arrows inside another function.
- **localStorage budget** is ~5 MB total; big features (photos) should compress like `tipPhoto()` does.
- After any engine or export change, run all three test files before deploying.
