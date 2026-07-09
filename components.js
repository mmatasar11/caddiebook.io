/* ============================================================
   UI COMPONENT LIBRARY — reusable HTML builders
   ============================================================
   Views in this app are plain template strings. These helpers
   are the sanctioned way to build common elements so styling
   stays consistent and future changes happen in ONE place.

   All builders return an HTML string. Event handlers are passed
   as inline `onclick` strings because the app uses global
   functions (simple, debuggable from Safari's console).

   USAGE EXAMPLES
   --------------
   ui.btn('Save round', "saveRound()", {kind:'primary', wide:true})
   ui.chip('56°', "pickClub('abc')", {on:true})
   ui.card('Wedge matrix', '<table>…</table>', {tight:true})
   ui.seg('modeSeg', [['a','Shots'],['b','Quick']], 'a', "setMode('%v')")
   ui.stat('GIR', 'Y', {good:true, onclick:"cycleOv('gir')"})

   EXTENSION POINT: add new builders here (e.g. ui.badge,
   ui.toggle) and every view can use them immediately.
   ============================================================ */
const ui = {
  /** Standard button.
   *  @param {string} label   visible text (already-safe or esc() it yourself)
   *  @param {string} onclick inline handler, e.g. "startRound()"
   *  @param {object} o       {kind:'primary'|'danger'|'ghost', sm, wide, style, disabled} */
  btn(label, onclick, o={}){
    const cls = ['btn', o.kind||'', o.sm?'sm':'', o.wide?'wide':''].filter(Boolean).join(' ');
    return `<button class="${cls}" ${o.disabled?'disabled':''} ${o.style?`style="${o.style}"`:''} onclick="${onclick}">${label}</button>`;
  },

  /** Pill chip, optionally selected. o = {on, sm, hint, style} */
  chip(label, onclick, o={}){
    const cls = ['chip', o.sm?'sm':'', o.on?'on':'', o.hint?'hint':''].filter(Boolean).join(' ');
    return `<button class="${cls}" ${o.style?`style="${o.style}"`:''} onclick="${onclick}">${label}</button>`;
  },

  /** Card shell with the standard uppercase header.
   *  @param {string} title   header text ('' for headerless)
   *  @param {string} bodyHTML
   *  @param {object} o {tight: no body padding, right: HTML for header's right side, hero: green gradient} */
  card(title, bodyHTML, o={}){
    const hd = title ? `<div class="hd"><span class="t">${title}</span>${o.right||''}</div>` : '';
    return `<div class="card ${o.hero?'hero':''}">${hd}<div class="bd ${o.tight?'tight':''}">${bodyHTML}</div></div>`;
  },

  /** Segmented control. Items = [[value,label],…]; onPick receives
   *  the value via %v substitution, e.g. "setMode('%v')". */
  seg(id, items, current, onPick){
    return `<div class="segs" id="${id}">` + items.map(([v,l])=>
      `<button ${v===current?'class="on"':''} data-v="${v}" onclick="srSeg(this);${onPick.replace('%v',v)}">${l}</button>`).join('') + `</div>`;
  },

  /** Small stat pill used on the hole screen and summaries.
   *  o = {good, bad, onclick} */
  stat(label, value, o={}){
    const cls = ['stat', o.good?'good':'', o.bad?'bad':''].filter(Boolean).join(' ');
    return `<span class="${cls}" ${o.onclick?`onclick="${o.onclick}"`:''}>${label} <b>${value}</b></span>`;
  },

  /** Tappable list row with title/subtitle and chevron. */
  listRow(title, sub, onclick, o={}){
    return `<div class="listRow" onclick="${onclick}">${o.lead||''}
      <div class="main"><div class="ti">${title}</div>${sub?`<div class="sub">${sub}</div>`:''}</div>
      ${o.trail||''}<span class="arr">›</span></div>`;
  },

  /** Labeled input. o = {id, type, placeholder, inputmode, num, onchange} */
  field(label, value, o={}){
    return `<label class="f">${label}</label>
      <input class="f ${o.num?'num':''}" ${o.id?`id="${o.id}"`:''} type="${o.type||'text'}"
        ${o.inputmode?`inputmode="${o.inputmode}"`:''} value="${value==null?'':value}"
        ${o.placeholder?`placeholder="${o.placeholder}"`:''} ${o.onchange?`onchange="${o.onchange}"`:''}>`;
  }
};
