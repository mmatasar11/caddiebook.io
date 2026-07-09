/* ============================================================
   THEME — single place to restyle the whole app
   ============================================================
   Every color, radius, shadow and font in the app is a CSS
   custom property (see src/css/theme.css for the defaults).
   The THEME object below is an OVERRIDE LAYER applied at boot:
   put any subset of those variables here and they win, without
   ever touching the CSS.

   HOW TO USE
   ----------
   1. Change a color everywhere:      THEME['--turf'] = '#0E5A8A';
   2. Rounder buttons everywhere:     THEME['--r'] = '22px';
   3. Different number font:          THEME['--mono'] = 'Menlo, monospace';
   Then rebuild (node build.js) or just edit + refresh if testing.

   The full list of themeable variables lives at the top of
   src/css/theme.css, grouped and commented.

   EXTENSION POINT: add your own variables here AND reference
   them in CSS as var(--your-name) — applyTheme() injects every
   key in this object, known or new.
   ============================================================ */
const THEME = {
  // Examples (commented out = CSS defaults apply):
  // '--turf':      '#1B6B41',   // primary green
  // '--flag':      '#D93A2B',   // the "5 = pure" accent red
  // '--r':         '16px',      // large corner radius (cards, sheets)
  // '--tap':       '52px',      // minimum touch-target height
};

/** Push every THEME override onto <html> as an inline CSS variable.
 *  Called once at boot (see init module). Safe to call again at
 *  runtime if you ever build a live theme editor. */
function applyTheme(){
  const root = document.documentElement;
  for(const [k,v] of Object.entries(THEME)) root.style.setProperty(k, v);
}
