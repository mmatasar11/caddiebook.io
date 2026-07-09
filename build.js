#!/usr/bin/env node
/* ============================================================
   BUILD — assemble the modular source into ONE offline file
   ============================================================
   Usage:  node build.js
   Output: dist/caddiebook.html  (and a copy at ./index.html
           so the test suites keep working unchanged)

   The MANIFEST below is the single source of truth for load
   order. Adding a module = add the filename in the right spot.
   ============================================================ */
const fs = require('fs');

const CSS = ['theme.css','app.css'];
const JS = [
  '01-core.js','02-store.js','03-notation.js','04-engine.js','05-handicap.js',
  'theme.js','components.js',
  '06-router.js','07-play-home.js','08-course-editor.js','09-hole.js',
  '10-shot-sheet.js','11-round-views.js',
  '12-stats.js','13-practice.js','14-tips.js','15-more.js','16-data.js',
  '17-init.js',
];

const head = fs.readFileSync('src/shell-head.html','utf8');
const css  = CSS.map(f=>`/* ═══ src/css/${f} ═══ */\n`+fs.readFileSync('src/css/'+f,'utf8')).join('\n');
const js   = JS .map(f=>`/* ═══════════════ src/js/${f} ═══════════════ */\n`+fs.readFileSync('src/js/'+f,'utf8')).join('\n');

const html = head + css + `</style>
</head>
<body>
<div id="view"></div>
<nav id="nav"></nav>
<div id="sheetWrap"><div id="sheet"></div></div>
<script>
` + js + `</script>
</body>
</html>
`;
fs.mkdirSync('dist',{recursive:true});
fs.writeFileSync('dist/caddiebook.html', html);
fs.writeFileSync('index.html', html);           // test suites read this path
console.log('built dist/caddiebook.html —', (html.length/1024).toFixed(0)+' KB,', JS.length, 'js modules,', CSS.length, 'css files');
