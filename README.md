# Caddie Book

A single-file, offline-first golf scoring, data, and practice app. One HTML file, zero network dependencies, all data on-device.

## The project (v3: modular source)

The deployable app is still one file — `dist/caddiebook.html` — but the source is now a documented, modular project you can maintain yourself:

```
node build.js     # assembles src/ → dist/caddiebook.html
node test.js && node test_import.js && node test_v3.js   # 48 tests
```

Start with `docs/ARCHITECTURE.md` (how it all fits) and `docs/CUSTOMIZING.md` (copy-paste recipes: change the theme, add a tab, add a stat card, add drills/settings, change a scoring rule). Design tokens live in `src/css/theme.css` and `src/js/theme.js`; reusable UI builders in `src/js/components.js`; every module and function is commented.

## Get it on your iPhone

The app is one file: `caddiebook.html`. Two good options.

**Option A: GitHub Pages (recommended, 2 minutes)**
1. Create a repo, drop the file in as `index.html`, enable Pages.
2. Open the URL in Safari, tap Share, then **Add to Home Screen**.
3. It launches full screen like a native app. After the first load it works in airplane mode because the file has zero external assets.

**Option B: any static host or local server**
Any host works (Netlify drop, S3, your own box). Same Add to Home Screen step.

**Important:** Add to Home Screen matters. Safari can evict website storage for sites you have not visited in 7 days. Home Screen apps are exempt. Also take a JSON backup (More → Backup & export) after any big data session. It is one tap.

## Why a single-file PWA instead of Expo / React Native

- Zero build chain, zero App Store, zero signing. You own the file.
- Offline is structural, not a feature: there are no network assets to fail.
- The data layer is one JSON document in localStorage that mirrors the relational schema, so export to MySQL is a straight mapping.
- Tradeoff: no native camera OCR API. The workaround is better than bundled Tesseract: iPhone **Live Text** does on-device OCR already. Point the camera at the scorecard, Select All, Copy, then paste into the course editor. The built-in parser pulls pars, yardages, stroke indexes, rating, and slope into the verification grid. Fully offline, no cloud.

If you later want native camera OCR and GPS, the JS is framework-free and ports to Expo + SQLite cleanly. The derivation engine and schema move as-is.

## The notation system

The governing rule everywhere: **5 is pure. The ring is the miss. Horizontal = left/right. Vertical = more/less.**

- **Lies:** T tee, FW fairway, RF rough, FR fringe, SD sand, GR green (a putt), RC recovery, HZ drop after penalty.
- **Lateral finish** (tee balls, layups): LL L C R RR.
- **Green pad:** 7 8 9 long row, 4 **5=pin high** 6, 1 2 3 short row. Digit is always relative to the pin. GIR is a separate flag.
- **Putt pad:** same geometry, 5 = holed. A hot 2 is a pace problem, a hot 6 is a read problem.
- **Shape pad:** columns = start line, rows = curve. 7 pull-draw, 5 straight, 3 push-slice. Top = draw by default, flippable in Settings.
- **Putts:** distance field flips to feet automatically on a GR lie. First-putt distance is captured on every green.
- **Tags:** t thin, h heavy, to toe, hl heel. Effort e-value or ½ / ¾ fractions for the wedge matrix.
- **Wind per hole:** H into, D down, L2R, R2L, strength 1 to 3.

## Entry speed

A typical shot is 4 to 6 taps: lie is prefilled, type the distance, the suggested club is already highlighted, tap the finish. Nothing optional ever blocks a save. Every change autosaves instantly. Kill the app mid-round and it reopens on the hole you were playing.

## What auto-derives

Score, putts, FIR, GIR, penalties, sand shots, up-and-down, sand save, 3-putt, first-putt distance. Every flag is tap-to-override on the hole screen (tap the FIR/GIR/U&D chips).

## Handicap

WHS-style. Differential = 113 / slope × (adjusted gross − rating). Adjusted gross applies net double bogey per hole using your course handicap and stroke index once an index exists, par + 5 before that. Index uses best 8 of the last 20 with the standard reduced-count table under 20 rounds. Verify against your official index; posting rules (like the 54.0 cap and exceptional score reductions) are not modeled.

## Data model → MySQL

The JSON backup maps directly:

| JSON path | Table |
|---|---|
| `data.clubs[]` | club (id, label, type, stock, sort) |
| `data.courses[]` | course (id, name) |
| `data.courses[].tees[]` | tee (id, name, rating, slope) |
| `data.courses[].tees[].holes[]` | hole_template (n, par, ydg, si) |
| `data.rounds[]` | round (id, courseId, teeId, date, weather, finished) |
| `data.rounds[].holes[]` | hole_play (n, par, ydg, windD, windS, pen, ov overrides) |
| `data.rounds[].holes[].shots[]` | shot (clubId, lie, dist, unit, fType, lat, pad, shape, effort, frac, strike, note) |
| `data.tips[]` | tip |
| `data.practice[]` | practice_session |
| `data.practice[].blocks[].shots[]` | practice_shot (carry, total, bs, cs, sm, la, spin, axis, apex, side, sideT, aa, path, face) |

Numpad digits are stored raw (1 to 9) with `fType` naming the pad (`green`, `putt`, or shape on its own field), so a green-4 and a putt-4 are never confused. The CSV export suffixes them `4g`, `4p`, `4s` for the same reason.

## What's new in v2

- **iPhone-safe layout.** Top and bottom safe-area insets so nothing hides behind the Dynamic Island or home indicator, frosted tab bar, larger touch targets.
- **Play hub.** The Play tab is now a round dashboard: resume card with live score, recent courses, and quick start. Full round history lives one tap away.
- **Course pages.** City, state, and address per course with a Google Maps link for directions. Optional online lookup: paste a free golfcourseapi.com key into Settings and "Look up online" fills name, location, rating, slope, and all 18 holes.
- **Two entry modes, switchable mid-round.** Shot-by-shot (the full notation system) or Quick score (Grint-style: score, putts, first-putt distance, fairway, approach-vs-pin pad, sand, penalties). Quick holes still feed FIR, GIR, first-putt stats, and the green heatmap.
- **Front 9 / Back 9 rounds.** Real hole numbers (10 to 18 on the back), and all scoring stats normalize to per-18 so nines stop dragging your average under 70. Nines are excluded from the handicap since 9-hole differentials need ratings we don't store.
- **Stats filters + insights.** Filter everything by time window or course. Hole history shows on each tee: times played, average, best.
- **Practice drill library.** Ten seeded drills with instructions, grouped by category, each one tap from becoming a session.
- **Tips**: link and photo attachments (photos compressed on-device to about 100 KB), plus the existing tags and search.
- **Bag**: brand and model per club, and a bench section that hides clubs from pickers while keeping their history in stats.
- **Round context**: playing partners, weather, and an on-course drinks counter.
- **Golf-isms**: who said it and what it was in reference to.

Tip photos live in browser storage alongside everything else (about 5 MB total budget), so keep taking JSON backups.

## Importing from 18Birdies

More → Backup & export → **Import 18Birdies JSON**. Request the export from 18Birdies (Settings → Account → Request My Data), then pick the file. What comes in: all played courses by name, plus every round as a summary round with hole-by-hole strokes, putts, FIR, GIR, and the birdie/par/bogey breakdown. Imported rounds show an 18B badge and feed scoring average, putts per round, FIR%, GIR%, and score distribution.

What can't come in, because 18Birdies doesn't export it: per-shot data, hole pars, and course rating/slope. So imported rounds stay out of heatmaps, first-putt stats, stock yardages, and the handicap calc. Those stats build from rounds you track shot-by-shot in Caddie Book.

Making it easier in the future: the import merges instead of replacing, and it remembers which 18Birdies round ids it has seen. Request a fresh export any time, import it, and only new rounds land. Duplicates are skipped automatically. Imported courses arrive without tee data; the first time you start a round on one, the course editor opens prefilled so you can add rating, slope, and yardages once.

## Exports

- **JSON:** full backup, restores with one tap.
- **CSV:** one row per shot plus a SUMMARY row per hole. Loads into MySQL with `LOAD DATA`.
- **AI text:** compact per-hole blocks, one tap to copy from any round:

```
H7 P4 410 windH2 | sc4 putts2 FIR-N GIR-Y pen0 sand0 ud-
 s1 Dr T 275 fin-R shp-6s
 s2 8i RF 155 fin-4g shp-2s
 s3 Pt GR 24ft fin-2p
 s4 Pt GR 3ft fin-5p
```

## Build phases delivered

Phases 1, 2, 4, and 5 from the spec are complete and tested: round flow, insights (heatmaps, stock yardages, wedge matrix, handicap), tips, practice with TrackMan logging, and full export. Phase 3 photo capture ships as the Live Text paste parser; native camera OCR is the one item that would need the Expo port.
