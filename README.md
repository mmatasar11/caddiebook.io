# mmatasar.caddiebook.io

# Caddie Book

A single-file, offline-first golf scoring, data, and practice app. One HTML file, zero network dependencies, all data on-device.

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
