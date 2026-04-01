/**
 * WAR THUNDER TECH TREE MAKER — app.js v3
 *
 * Fixes & new features:
 *  - Reset button with confirm dialog
 *  - Thicker arrows (handled in CSS via stroke-width)
 *  - Manufacturer field (popup-only)
 *  - Folder rename (custom name override)
 *  - Column drag-and-drop reorder
 *  - Branch columns now rendered (cross-column arrows via SVG overlay)
 *  - No arrows on premium columns
 *  - Screenshot mode
 *  - Name + BR top-right, image below header text
 *  - Multi-image upload with carousel & captions
 */

// ─────────────────────────────────────────────
// DATA MODEL
// ─────────────────────────────────────────────
let state = {
  columns: [
    { id:'c1', name:'Fighters',  type:'research', tracks:[{id:'t1',name:'Fighters 1'},{id:'t_1_1773989444188',name:'Fighters 2'}] },
    { id:'c2', name:'Attackers', type:'research', tracks:[{id:'t1',name:'Attackers'}] },
    { id:'c3', name:'Bombers',   type:'research', tracks:[{id:'t_2_1773989445074',name:'Bombers'}] },
    { id:'c4', name:'Premium',   type:'premium',  tracks:[{id:'t1',name:''},{id:'t_3_1773989446244',name:'Track 2'}] },
  ],
  sections: [
    { id:'s1', name:'Rank I'   },
    { id:'s2', name:'Rank II'  },
    { id:'s_4_1774000011521', name:'Rank III'  },
    { id:'s_5_1774000014208', name:'Rank IV'   },
    { id:'s_6_1774000016455', name:'Rank V'    },
    { id:'s_7_1774000018709', name:'Rank VI'   },
    { id:'s_8_1774000021924', name:'Rank VII'  },
    { id:'s_9_1774000026183', name:'Rank VIII' },
  ],
  vehicles:    {},
  folders:     {},
  grid: {
    s1:                {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s2:                {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s_4_1774000011521: {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s_5_1774000014208: {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s_6_1774000016455: {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s_7_1774000018709: {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s_8_1774000021924: {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s_9_1774000026183: {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
  },
  connections: {},
  arrowColor: '#6a8ea0',
  title: '',
};

let nextId = 1;
function uid(p){ return `${p}_${nextId++}_${Date.now()}`; }

let screenshotMode = false;
let carouselIndex  = 0;  // current slide in open vehicle modal


// ─────────────────────────────────────────────
// VEHICLE TYPES  (name, color, svg, category)
// ─────────────────────────────────────────────
const VEHICLE_TYPES = [
  { cat:'Aviation', name:'Fighter',           color:'#ffac6f', svg:'<path d="m0,7.5l10.5,-7.5l10.5,7.5l-10.5,7.5l-10.5,-7.5z" fill="#ffac6f"/>' },
  { cat:'Aviation', name:'Attacker',          color:'#bde9b5', svg:'<path d="m0,7.5l10.5,-5l10.5,5l-10.5,5l-10.5,-5z" fill="#bde9b5"/>' },
  { cat:'Aviation', name:'Bomber',            color:'#a3b1ff', svg:'<rect height="7.5" width="21" y="0" x="0" fill="#a3b1ff"/><path d="m0,7.5l10.5,-7.5l10.5,7.5l-10.5,7.5l-10.5,-7.5z" fill="#a3b1ff"/>' },
  { cat:'Helicopter', name:'Attack Helicopter',   color:'#f2f266', svg:'<path d="m0,7.5l10.5,-5l10.5,5l-10.5,5l-10.5,-5z" fill="#f2f266"/>' },
  { cat:'Helicopter', name:'Utility Helicopter',  color:'#9bf266', svg:'<rect height="7.5" width="21" y="0" x="0" fill="#9bf266"/><path d="m0,7.5l10.5,-7.5l10.5,7.5l-10.5,7.5l-10.5,-7.5z" fill="#9bf266"/>' },
  { cat:'Ground Vehicles', name:'Light Tank',     color:'#ffeeee', svg:'<rect height="9" width="21" y="3" x="0" fill="#ffeeee"/>' },
  { cat:'Ground Vehicles', name:'Medium Tank',    color:'#ffaaaa', svg:'<rect height="9" width="21" y="3" x="0" fill="#ffaaaa"/><rect height="4" width="6" y="11" x="0" fill="#ffaaaa"/><rect height="4" width="6" y="11" x="15" fill="#ffaaaa"/>' },
  { cat:'Ground Vehicles', name:'Heavy Tank',     color:'#ff6666', svg:'<rect height="9" width="21" y="3" x="0" fill="#ff6666"/><rect height="4" width="6" y="11" x="0" fill="#ff6666"/><rect height="4" width="6" y="11" x="15" fill="#ff6666"/><rect height="4" width="7" y="0" x="7" fill="#ff6666"/>' },
  { cat:'Ground Vehicles', name:'Tank Destroyer',  color:'#bde9b5', svg:'<rect height="5" width="21" y="10" x="0" fill="#bde9b5"/><line y2="10" x2="0" y1="0" x1="21" stroke-width="3" stroke="#bde9b5"/>' },
  { cat:'Ground Vehicles', name:'SPAA',            color:'#c6a0ff', svg:'<rect height="5" width="21" y="10" x="0" fill="#c6a0ff"/><rect height="11" width="4" y="0" x="4" fill="#c6a0ff"/><rect height="11" width="4" y="0" x="13" fill="#c6a0ff"/>' },
  { cat:'Coastal Fleet', name:'Torpedo Boat',  color:'#01d1de', svg:'<path stroke-width="2" d="M20 1L.75 7 20 13z" stroke="#01d1de" fill="none"/>' },
  { cat:'Coastal Fleet', name:'Gun Boat',      color:'#a3b1ff', svg:'<path stroke-width="2" d="M20 1L.75 7 20 13z" stroke="#a3b1ff" fill="#a3b1ff"/>' },
  { cat:'Coastal Fleet', name:'Barge',         color:'#f8cdae', svg:'<path stroke-width="2" d="M1 1h19v12H1z" stroke="#f8cdae" fill="none"/>' },
  { cat:'Bluewater Fleet', name:'Frigate/Destroyer', color:'#f8a86d', svg:'<path stroke-width="2" d="M20 1H7L.75 7 7 13h13z" stroke="#f8a86d" fill="none"/>' },
  { cat:'Bluewater Fleet', name:'Light Cruiser',     color:'#f8a6a6', svg:'<path stroke-width="2" d="M20 1H7L.75 7 7 13h13z" stroke="#f8a6a6" fill="none"/><path stroke-width="2" d="M15.75 1v12" stroke="#f8a6a6"/>' },
  { cat:'Bluewater Fleet', name:'Heavy Cruiser',     color:'#ffaaaa', svg:'<path stroke-width="2" d="M20 1H7L.75 7 7 13h13z" stroke="#ffaaaa" fill="none"/><path stroke-width="2" d="M16 1H20v12h-4z" stroke="#ffaaaa" fill="#ffaaaa"/>' },
  { cat:'Bluewater Fleet', name:'Battlecruiser',     color:'#fda9a9', svg:'<path stroke-width="2" d="M20 1H7L.75 7 7 13h13z" stroke="#fda9a9" fill="none"/><path stroke-width="2" d="M18 1H20v12h-2z" stroke="#fda9a9" fill="#ffaaaa"/><path stroke-width="2" d="M11 1H13v12h-2z" stroke="#fda9a9" fill="#ffaaaa"/>' },
  { cat:'Bluewater Fleet', name:'Battleship',        color:'#fd6565', svg:'<path stroke-width="2" d="M20 1H7L.75 7 7 13h13z" stroke="#fd6565" fill="none"/><path stroke-width="2" d="M16 1v12" stroke="#fd6565"/><path stroke-width="2" d="M12 1v12" stroke="#fd6565"/><path stroke-width="2" d="M8 1v12" stroke="#fd6565"/>' },
];

function typeIcon(t){
  return `<svg width="21" height="15" xmlns="http://www.w3.org/2000/svg">${t.svg}</svg>`;
}

function buildTypePicker(btnId, dropId, hiddenId){
  const btn = document.getElementById(btnId);
  const drop = document.getElementById(dropId);
  const hidden = document.getElementById(hiddenId);
  if(!btn||!drop||!hidden) return;

  // Build dropdown content grouped by category
  drop.innerHTML = '';
  let lastCat = '';
  VEHICLE_TYPES.forEach(t => {
    if(t.cat !== lastCat){
      lastCat = t.cat;
      const hdr = document.createElement('div');
      hdr.className = 'type-picker-header';
      hdr.textContent = t.cat;
      drop.appendChild(hdr);
    }
    const opt = document.createElement('div');
    opt.className = 'type-picker-option';
    opt.dataset.value = t.name;
    opt.innerHTML = typeIcon(t) + `<span style="color:${t.color}">${t.name}</span>`;
    opt.addEventListener('click', e => {
      e.stopPropagation();
      setTypePicker(btnId, dropId, hiddenId, t.name);
      drop.style.display = 'none';
    });
    drop.appendChild(opt);
  });

  btn.addEventListener('click', e => {
    e.stopPropagation();
    const isOpen = drop.style.display !== 'none';
    // Close all open type pickers
    document.querySelectorAll('.type-picker-dropdown').forEach(d => d.style.display='none');
    if(!isOpen) drop.style.display = '';
  });

  // Close on outside click
  document.addEventListener('click', () => { drop.style.display='none'; });
}

function setTypePicker(btnId, dropId, hiddenId, value){
  const btn = document.getElementById(btnId);
  const drop = document.getElementById(dropId);
  const hidden = document.getElementById(hiddenId);
  if(!btn||!hidden) return;
  hidden.value = value;
  const t = VEHICLE_TYPES.find(x => x.name === value);
  if(t){
    btn.innerHTML = typeIcon(t) + `<span style="color:${t.color}">${t.name}</span>`;
  } else {
    btn.textContent = value || '— select type —';
  }
  // Mark selected option
  if(drop) drop.querySelectorAll('.type-picker-option').forEach(o => {
    o.classList.toggle('selected', o.dataset.value === value);
  });
}

function initTypePickers(){
  buildTypePicker('vmEditTypeBtn','vmEditTypeDropdown','vmEditType');
  buildTypePicker('avTypeBtn','avTypeDropdown','avType');
}

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadFromStorage();
  initTypePickers();
  renderAll();
  bindModalCloseButtons();
  bindContextMenuDismiss();
  bindVehicleModal();
  bindAddVehicleModal();
  bindConnectionModal();
  bindAddSectionModal();
  bindAddColumnModal();
  bindExportImport();
  bindReset();
  bindScreenshot();
  bindHideLabels();
  bindSsHideHeaders();
  bindArrowColor();
  // Bind title input
  const _titleInput=document.getElementById('treeTitleInput');
  if(_titleInput){
    _titleInput.value=state.title||'';
    _titleInput.addEventListener('input',()=>{ state.title=_titleInput.value.trim(); saveToStorage(); });
  }
  bindFolderRenameModal();
});

// ─────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────
function saveToStorage(){
  try{ localStorage.setItem('wt_tree_state_v3', JSON.stringify(state)); }catch(e){}
}
function loadFromStorage(){
  try{
    const raw = localStorage.getItem('wt_tree_state_v3')
             || localStorage.getItem('wt_tree_state'); // migrate old key
    if(!raw) return;
    const d = JSON.parse(raw);
    state.columns     = d.columns     || state.columns;
    state.sections    = d.sections    || state.sections;
    state.vehicles    = d.vehicles    || {};
    state.folders     = d.folders     || {};
    state.grid        = d.grid        || {};
    state.connections = d.connections || {};
    // Migrate old single-image vehicles to images array
    Object.values(state.vehicles).forEach(v=>{
      if(!v.images){
        v.images = v.img ? [{src:v.img, caption:''}] : [];
        delete v.img;
      }
    });
    migrateGrid();
    syncGrid();
    if(!state.arrowColor) state.arrowColor='#6a8ea0';
    if(!state.title) state.title='';
    // Sync nextId
    [...state.columns.map(c=>c.id), ...state.sections.map(s=>s.id),
     ...Object.keys(state.vehicles), ...Object.keys(state.folders)].forEach(id=>{
       const n = parseInt((id.split('_')[1])||'0');
       if(!isNaN(n) && n>=nextId) nextId = n+1;
     });
  }catch(e){}
}
function syncGrid(){
  // Ensure every column has at least 1 track
  state.columns.forEach(col=>{
    if(!col.tracks||!col.tracks.length) col.tracks=[{id:'t1',name:''}];
  });
  state.sections.forEach(sec=>{
    if(!state.grid[sec.id]) state.grid[sec.id]={};
    state.columns.forEach(col=>{
      if(!state.grid[sec.id][col.id]) state.grid[sec.id][col.id]={};
      col.tracks.forEach(tr=>{
        if(!state.grid[sec.id][col.id][tr.id]) state.grid[sec.id][col.id][tr.id]=[];
      });
    });
  });
}

// Migration: old flat grid[secId][colId]=[] → new grid[secId][colId][t1]=[]
function migrateGrid(){
  state.columns.forEach(col=>{
    if(!col.tracks||!col.tracks.length) col.tracks=[{id:'t1',name:''}];
  });
  state.sections.forEach(sec=>{
    if(!state.grid[sec.id]) return;
    state.columns.forEach(col=>{
      const cell=state.grid[sec.id][col.id];
      if(Array.isArray(cell)){
        // Old flat format — wrap into t1
        state.grid[sec.id][col.id]={t1:cell};
      }
    });
  });
}

// ─────────────────────────────────────────────
// RESET
// ─────────────────────────────────────────────
function bindReset(){
  document.getElementById('btnReset').addEventListener('click',()=>{
    if(!confirm('Reset the entire tech tree? This cannot be undone.')) return;
    state = {
      columns:[
        {id:'c1',name:'Fighters',type:'research',tracks:[{id:'t1',name:'Fighters 1'},{id:'t_1_1773989444188',name:'Fighters 2'}]},
        {id:'c2',name:'Attackers',type:'research',tracks:[{id:'t1',name:'Attackers'}]},
        {id:'c3',name:'Bombers',type:'research',tracks:[{id:'t_2_1773989445074',name:'Track 2'}]},
        {id:'c4',name:'Premium',type:'premium',tracks:[{id:'t1',name:''},{id:'t_3_1773989446244',name:'Track 2'}]},
      ],
      sections:[
        {id:'s1',name:'Rank I'},{id:'s2',name:'Rank II'},
        {id:'s_4_1774000011521',name:'Rank III'},{id:'s_5_1774000014208',name:'Rank IV'},
        {id:'s_6_1774000016455',name:'Rank V'},{id:'s_7_1774000018709',name:'Rank VI'},
        {id:'s_8_1774000021924',name:'Rank VII'},{id:'s_9_1774000026183',name:'Rank VIII'},
      ],
      vehicles:{}, folders:{},
      grid:{
        s1:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s2:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s_4_1774000011521:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s_5_1774000014208:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s_6_1774000016455:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s_7_1774000018709:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s_8_1774000021924:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s_9_1774000026183:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
      },
      connections:{},
        };
    nextId=1;
    saveToStorage();
    renderAll();
  });
}

// ─────────────────────────────────────────────
// SCREENSHOT MODE
// ─────────────────────────────────────────────
let hideLabelsMode = false;

function bindScreenshot(){
  document.getElementById('btnScreenshot').addEventListener('click',()=>{
    screenshotMode = !screenshotMode;
    document.body.classList.toggle('screenshot-mode', screenshotMode);
    document.getElementById('btnScreenshot').classList.toggle('active', screenshotMode);
    // Show/hide the hide-headers checkbox
    const hc=document.getElementById('ssHideHeadersWrap');
    if(hc) hc.style.display=screenshotMode?'flex':'none';
    renderAll();
  });
}

function bindSsHideHeaders(){
  const cb=document.getElementById('ssHideHeadersCb');
  if(!cb) return;
  cb.addEventListener('change',()=>{
    document.body.classList.toggle('screenshot-hide-headers', cb.checked);
  });
}

function bindHideLabels(){
  document.getElementById('btnHideLabels').addEventListener('click',()=>{
    hideLabelsMode = !hideLabelsMode;
    document.body.classList.toggle('hide-labels-mode', hideLabelsMode);
    document.getElementById('btnHideLabels').classList.toggle('active', hideLabelsMode);
    document.getElementById('btnHideLabels').textContent = hideLabelsMode ? 'Show labels' : 'Hide labels';
  });
}

function bindArrowColor(){
  const picker=document.getElementById('arrowColorPicker');
  if(!picker) return;
  picker.value = state.arrowColor||'#6a8ea0';
  picker.addEventListener('input',()=>{
    state.arrowColor=picker.value;
    saveToStorage();
    requestAnimationFrame(drawAllArrows);
  });
}

// ─────────────────────────────────────────────
// RENDER ALL
// ─────────────────────────────────────────────
function renderAll(){
  renderColumnHeaders();
  renderRankSections();
  requestAnimationFrame(drawAllArrows);
}


// COMPLETE REWRITE of SVG arrow system
// Paste this between the getSvgOrigin function and the getCardEl function

// ─────────────────────────────────────────────
// SVG ARROW SYSTEM — COMPLETE REWRITE
// ─────────────────────────────────────────────

/**
 * Get the position of an element relative to #rankSections,
 * walking the full offsetParent chain but also accounting for
 * elements whose offsetParent jumps over intermediate containers.
 * We walk EVERY ancestor (not just offsetParent) summing scrollLeft/scrollTop
 * so that scroll containers are properly accounted for.
 */
function getPos(el){
  const rs = document.getElementById('rankSections');
  let x = 0, y = 0;
  let cur = el;
  while(cur && cur !== rs){
    x += cur.offsetLeft || 0;
    y += cur.offsetTop  || 0;
    // When offsetParent skips elements, we need to account for
    // the scroll offset of every scrollable ancestor up to rs
    let scrollNode = cur.parentElement;
    while(scrollNode && scrollNode !== cur.offsetParent && scrollNode !== rs){
      x -= scrollNode.scrollLeft || 0;
      y -= scrollNode.scrollTop  || 0;
      scrollNode = scrollNode.parentElement;
    }
    cur = cur.offsetParent;
    if(!cur || !rs.contains(cur)) break;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

function buildArrowSvg(){
  const rs = document.getElementById('rankSections');
  const old = document.getElementById('crossArrowSvg');
  if(old) old.remove();

  rs.style.position = 'relative';

  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.id = 'crossArrowSvg';
  svg.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:10;overflow:visible';
  svg.setAttribute('width',  rs.scrollWidth  || 2000);
  svg.setAttribute('height', rs.scrollHeight || 4000);

  const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');

  // Down-pointing filled triangle arrowhead.
  // Path ends going downward. Tip is at the path endpoint.
  // Triangle: left-top(0,0) → right-top(14,0) → tip(7,10)
  // refX=7 (horizontal centre), refY=0 (BASE at path end, tip extends DOWN below it)
  // Wait — we want the TIP at the path end, not the base.
  // So: refY=10 puts the tip at the path endpoint.
  // The triangle then sits ABOVE the endpoint with tip touching it.
  // Marker: down-pointing triangle, NO rotation tricks.
  // Triangle in screen coords: base at y=0 (top), tip at y=14 (bottom).
  // refX=9 (horizontal centre), refY=0 (BASE at path endpoint).
  // Tip extends 14px BELOW path endpoint.
  // Path must end 14px above card top so tip lands on card edge.
  // Base width=18px, height=14px. Stroke=8px.
  function mkMarker(id, color){
    const m = document.createElementNS('http://www.w3.org/2000/svg','marker');
    m.setAttribute('id', id);
    m.setAttribute('markerUnits', 'userSpaceOnUse');
    m.setAttribute('markerWidth', '18');
    m.setAttribute('markerHeight','14');
    m.setAttribute('refX', '9');
    m.setAttribute('refY', '0');
    m.setAttribute('orient', '0deg');
    const p = document.createElementNS('http://www.w3.org/2000/svg','polygon');
    p.setAttribute('points','0,0 18,0 9,14');
    p.setAttribute('fill', color);
    m.appendChild(p);
    return m;
  }

  // Default markers (used when no per-connection color is set)
  defs.appendChild(mkMarker('arrowMain',   state.arrowColor||'#6a8ea0'));
  defs.appendChild(mkMarker('arrowBranch', state.arrowColor||'#6a8ea0'));
  svg.appendChild(defs);
  rs.appendChild(svg);
  return svg;
}

function getCardEl(vehicleId){
  const direct = document.querySelector('[data-vehicle-id="'+vehicleId+'"]');
  if(direct) return direct;
  for(const fid of Object.keys(state.folders)){
    const f = state.folders[fid];
    if(f && f.vehicleIds && f.vehicleIds.includes(vehicleId)){
      const folderEl = document.querySelector('[data-folder-id="'+fid+'"]');
      if(folderEl) return folderEl;
    }
  }
  return null;
}

/**
 * Draw connections for a group of targets sharing the same source card.
 * Uses a T-junction routing:
 *   1. One vertical stem down from source bottom-centre to busY
 *   2. One horizontal bus line spanning all target x positions
 *   3. Vertical drops from busY down to each target top-centre, each with arrowhead
 *
 * This produces ONE exit line from the source regardless of how many targets there are.
 */
function drawSourceGroup(svg, fromEl, targets){
  const STROKE = 8;
  const GAP    = 18; // px below source card before horizontal bus
  const COLOR_MAIN   = state.arrowColor||'#6a8ea0';
  const COLOR_BRANCH = COLOR_MAIN; // all same color, differentiated by line style
  const ns = 'http://www.w3.org/2000/svg';

  const fp = getPos(fromEl);
  const srcX = Math.round(fp.x + fp.w / 2);
  const srcY = Math.round(fp.y + fp.h);
  // For each group, use the midpoint between source bottom and the lowest target top
  // so the horizontal bus sits cleanly in the visual gap between cards/ranks.
  // Minimum GAP below source to avoid overlapping the source card itself.
  const minTargetY = targets.reduce((min, {toEl}) => {
    const tp = getPos(toEl);
    return Math.min(min, Math.round(tp.y));
  }, Infinity);
  const busY = minTargetY > srcY
    ? Math.round(srcY + (minTargetY - srcY) * 0.5)
    : srcY + GAP;

  // Gather target positions
  const tgts = targets.map(({toEl, isBranch, color: tColor}) => {
    const tp = getPos(toEl);
    return {
      x:  Math.round(tp.x + tp.w / 2),
      y2: Math.round(tp.y),
      isBranch,
      color: tColor||COLOR_MAIN,
    };
  }).filter(t => t.y2 > srcY); // safety: only draw downward

  if(!tgts.length) return;

  // Single-target: simple L or straight line
  if(tgts.length === 1){
    const t = tgts[0];
    const color    = t.color||COLOR_MAIN;
    const markerId = 'arrowMain';
    const path = document.createElementNS(ns,'path');
    let d;
    const ey = t.y2 - 14; // path ends 14px above card (marker height), tip lands on card
    if(Math.abs(srcX - t.x) < 6){
      // Pure vertical
      d = `M ${srcX} ${srcY} L ${t.x} ${ey}`;
    } else {
      d = `M ${srcX} ${srcY} L ${srcX} ${busY} L ${t.x} ${busY} L ${t.x} ${ey}`;
    }
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', STROKE);
    path.setAttribute('stroke-linejoin', 'miter');
    path.setAttribute('marker-end', 'url(#'+markerId+')');
    svg.appendChild(path);
    return;
  }

  // Multiple targets: T-junction routing
  const xs = tgts.map(t => t.x);
  const busLeft  = Math.min(srcX, ...xs);
  const busRight = Math.max(srcX, ...xs);

  // 1. Vertical stem from source down to bus
  addLine(svg, ns, srcX, srcY, srcX, busY, COLOR_MAIN, STROKE);

  // 2. Horizontal bus
  if(busLeft < busRight){
    addLine(svg, ns, busLeft, busY, busRight, busY, COLOR_MAIN, STROKE);
  }

  // 3. Drop to each target with arrowhead — use per-connection color
  tgts.forEach(t => {
    const color = t.color||COLOR_MAIN;
    // Create a unique marker id per color to support multiple colors on same SVG
    const safeId = 'arrow_'+color.replace('#','');
    if(!svg.querySelector('#'+safeId)){
      const defs2 = svg.querySelector('defs');
      const m2 = document.createElementNS(ns,'marker');
      m2.setAttribute('id',safeId);
      m2.setAttribute('markerUnits','userSpaceOnUse');
      m2.setAttribute('markerWidth','18'); m2.setAttribute('markerHeight','14');
      m2.setAttribute('refX','9'); m2.setAttribute('refY','0');
      m2.setAttribute('orient','0deg');
      const p2 = document.createElementNS(ns,'polygon');
      p2.setAttribute('points','0,0 18,0 9,14');
      p2.setAttribute('fill',color);
      m2.appendChild(p2); defs2.appendChild(m2);
    }
    const path = document.createElementNS(ns,'path');
    const ey2 = t.y2 - 14;
    path.setAttribute('d', `M ${t.x} ${busY} L ${t.x} ${ey2}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', STROKE);
    path.setAttribute('marker-end', 'url(#'+safeId+')');
    svg.appendChild(path);
  });
}

function addLine(svg, ns, x1, y1, x2, y2, color, width){
  const line = document.createElementNS(ns,'line');
  line.setAttribute('x1',x1); line.setAttribute('y1',y1);
  line.setAttribute('x2',x2); line.setAttribute('y2',y2);
  line.setAttribute('stroke',color);
  line.setAttribute('stroke-width',width);
  svg.appendChild(line);
}

// ── UNIFIED SVG ARROW DRAWING (always on) ──
function drawAllArrows(){
  const groups={};

  // Build groups from explicit connections
  Object.entries(state.connections).forEach(([fromId,conn])=>{
    const targets=conn.targets||[conn.next,conn.branch].filter(Boolean);
    // Per-connection colors: conn.colors is an array matching targets indices
    const colors=conn.colors||[];
    targets.forEach((toId,i)=>{
      if(!toId) return;
      const toEl=getCardEl(toId); if(!toEl) return;
      const fromEl=getCardEl(fromId); if(!fromEl) return;
      if(!groups[fromId]) groups[fromId]={fromEl,targets:[]};
      groups[fromId].targets.push({toEl,isBranch:i>0,explicit:true,color:colors[i]||null});
    });
  });

  // Build groups from implicit consecutive-slot connections (same track, adjacent slots)
  state.sections.forEach(sec=>{
    state.columns.filter(c=>c.type!=='premium').forEach(col=>{
      const tracks=col.tracks||[{id:'t1'}];
      tracks.forEach(tr=>{
        const slots=state.grid[sec.id]?.[col.id]?.[tr.id]||[];
        for(let i=0;i<slots.length-1;i++){
          const fromEntry=slots[i]; const toEntry=slots[i+1];
          // Get lead vehicle ids
          const fromId=fromEntry.type==='vehicle'?fromEntry.id:
            (state.folders[fromEntry.id]?.vehicleIds?.[0]||null);
          const toId=toEntry.type==='vehicle'?toEntry.id:
            (state.folders[toEntry.id]?.vehicleIds?.[0]||null);
          if(!fromId||!toId) continue;
          // Skip if an explicit connection already handles fromId
          if(state.connections[fromId]) continue;
          const fromEl=getCardEl(fromId); const toEl=getCardEl(toId);
          if(!fromEl||!toEl) continue;
          if(!groups[fromId]) groups[fromId]={fromEl,targets:[]};
          // Only add if not already in targets
          if(!groups[fromId].targets.some(t=>t.toEl===toEl))
            groups[fromId].targets.push({toEl,isBranch:false,explicit:false});
        }
      });
    });
  });

  // Draw trailing arrow from last slot in each rank to first slot in the NEXT rank
  // that actually has vehicles (skipping empty ranks).
  state.sections.forEach((sec,si)=>{
    state.columns.filter(c=>c.type!=='premium').forEach(col=>{
      const tracks=col.tracks||[{id:'t1'}];
      tracks.forEach(tr=>{
        const slots=state.grid[sec.id]?.[col.id]?.[tr.id]||[];
        if(!slots.length) return;
        const lastEntry=slots[slots.length-1];
        const fromId=lastEntry.type==='vehicle'?lastEntry.id:
          (state.folders[lastEntry.id]?.vehicleIds?.[0]||null);
        if(!fromId) return;
        if(state.connections[fromId]) return; // explicit connection handles it
        // Scan AHEAD through all subsequent ranks to find the next one with vehicles
        for(let ni=si+1; ni<state.sections.length; ni++){
          const nSec=state.sections[ni];
          const nextSlots=state.grid[nSec.id]?.[col.id]?.[tr.id]||[];
          if(!nextSlots.length) continue; // rank is empty, keep scanning
          const nextEntry=nextSlots[0];
          const toId=nextEntry.type==='vehicle'?nextEntry.id:
            (state.folders[nextEntry.id]?.vehicleIds?.[0]||null);
          if(!toId) break;
          const fromEl=getCardEl(fromId); const toEl=getCardEl(toId);
          if(!fromEl||!toEl) break;
          if(!groups[fromId]) groups[fromId]={fromEl,targets:[]};
          if(!groups[fromId].targets.some(t=>t.toEl===toEl))
            groups[fromId].targets.push({toEl,isBranch:false,explicit:false});
          break; // only connect to the nearest non-empty rank
        }
      });
    });
  });

  const anyGroups=Object.keys(groups).length>0;
  if(!anyGroups){const o=document.getElementById('crossArrowSvg');if(o)o.remove();return;}

  const svg=buildArrowSvg();
  Object.values(groups).forEach(({fromEl,targets})=>{
    if(!fromEl||!targets.length) return;
    drawSourceGroup(svg,fromEl,targets);
  });
}

// ── Legacy wrappers (keep for compatibility) ──
function drawCrossArrows(){ drawAllArrows(); }
function drawMapArrows(){
  // Build groups: fromId → [{toEl, isBranch}]
  const groups = {};
  Object.entries(state.connections).forEach(([fromId,conn])=>{
    const targets = conn.targets || [conn.next,conn.branch].filter(Boolean);
    targets.forEach((toId,i)=>{
      if(!toId) return;
      const fromLoc = findVehicleLocation(fromId);
      const toLoc   = findVehicleLocation(toId);
      if(!fromLoc||!toLoc) return;
      // Skip consecutive same-track same-rank (handled by inline DOM arrows)
      if(fromLoc.colId===toLoc.colId && fromLoc.trId===toLoc.trId &&
         fromLoc.secId===toLoc.secId) return;
      // Skip adjacent slots in same track (inline arrows)
      if(fromLoc.colId===toLoc.colId && fromLoc.trId===toLoc.trId &&
         Math.abs(fromLoc.slotIndex-toLoc.slotIndex)===1) return;
      const toEl = getCardEl(toId);
      if(!toEl) return;
      if(!groups[fromId]) groups[fromId]={fromEl:null,targets:[]};
      if(!groups[fromId].fromEl) groups[fromId].fromEl = getCardEl(fromId);
      groups[fromId].targets.push({toEl, isBranch:i>0});
    });
  });

  const anyGroups = Object.keys(groups).length > 0;
  if(!anyGroups){ const o=document.getElementById('crossArrowSvg');if(o)o.remove();return;}

  const svg = buildArrowSvg();
  Object.values(groups).forEach(({fromEl,targets})=>{
    if(!fromEl||!targets.length) return;
    drawSourceGroup(svg, fromEl, targets);
  });
}

// ── MAP MODE ──
function drawMapArrows(){
  const groups = {};
  Object.entries(state.connections).forEach(([fromId,conn])=>{
    const targets = conn.targets || [conn.next,conn.branch].filter(Boolean);
    targets.forEach((toId,i)=>{
      if(!toId) return;
      const toEl = getCardEl(toId);
      if(!toEl) return;
      if(!groups[fromId]) groups[fromId]={fromEl:null,targets:[]};
      if(!groups[fromId].fromEl) groups[fromId].fromEl = getCardEl(fromId);
      groups[fromId].targets.push({toEl, isBranch:i>0});
    });
  });

  const anyGroups = Object.keys(groups).length > 0;
  if(!anyGroups){ const o=document.getElementById('crossArrowSvg');if(o)o.remove();return;}

  const svg = buildArrowSvg();
  Object.values(groups).forEach(({fromEl,targets})=>{
    if(!fromEl||!targets.length) return;
    drawSourceGroup(svg, fromEl, targets);
  });
}


// ─────────────────────────────────────────────
// COLUMN HEADERS  (with drag-to-reorder)
// ─────────────────────────────────────────────
let _dragColId = null;

function renderColumnHeaders(){
  const row = document.getElementById('columnHeadersRow');
  row.innerHTML = '';
  const rCols = state.columns.filter(c=>c.type==='research');
  const pCols = state.columns.filter(c=>c.type==='premium');
  if(rCols.length) row.appendChild(makeColGroupHeader(rCols,'Researchable vehicles'));
  if(rCols.length && pCols.length){
    const div=document.createElement('div');
    div.className='col-header-divider'; row.appendChild(div);
  }
  if(pCols.length) row.appendChild(makeColGroupHeader(pCols,'Premium vehicles'));
}

function totalTrackCount(cols){ return cols.reduce((s,c)=>s+(c.tracks||[{id:'t1'}]).length,0); }
const COL_W = 220; // must match CSS .col-header width

function makeColGroupHeader(cols, label){
  const g=document.createElement('div'); g.className='col-header-group';
  const lbl=document.createElement('div'); lbl.className='col-group-label';
  lbl.style.width=(totalTrackCount(cols)*COL_W)+'px'; lbl.textContent=label; g.appendChild(lbl);
  const inner=document.createElement('div'); inner.className='col-group-header-inner';
  cols.forEach(col=>inner.appendChild(makeColHeader(col)));
  g.appendChild(inner); return g;
}

function makeColHeader(col){
  const tracks=col.tracks||[{id:'t1',name:''}];
  // Outer wrapper spans all tracks of this column
  const wrap=document.createElement('div');
  wrap.className='col-header-wrap'; wrap.dataset.colId=col.id;
  wrap.style.width=(tracks.length*COL_W)+'px';
  wrap.draggable=!screenshotMode;

  // Column name label row
  const nameRow=document.createElement('div'); nameRow.className='col-header-name-row';
  const name=document.createElement('span'); name.className='col-header-name'; name.textContent=col.name;
  name.title='Click to rename; drag to reorder';
  name.addEventListener('click',()=>startRenameCol(col.id,name));
  nameRow.appendChild(name);

  if(!screenshotMode){
    const del=document.createElement('button');
    del.className='col-del-btn'; del.textContent='✕'; del.title='Delete column';
    del.addEventListener('click',e=>{e.stopPropagation();deleteColumn(col.id);});
    nameRow.appendChild(del);

    const addTrack=document.createElement('button');
    addTrack.className='col-add-track-btn'; addTrack.textContent='+'; addTrack.title='Add track to this column';
    addTrack.addEventListener('click',e=>{e.stopPropagation();addTrackToColumn(col.id);});
    nameRow.appendChild(addTrack);

    wrap.addEventListener('dragstart',e=>{
      _dragColId=col.id;
      e.dataTransfer.setData('text/plain','col:'+col.id);
      e.dataTransfer.effectAllowed='move';
    });
    wrap.addEventListener('dragover',e=>{
      if(!_dragColId||_dragColId===col.id) return;
      e.preventDefault(); wrap.style.outline='2px solid var(--accent)';
    });
    wrap.addEventListener('dragleave',()=>wrap.style.outline='');
    wrap.addEventListener('drop',e=>{
      e.preventDefault(); wrap.style.outline='';
      if(!_dragColId||_dragColId===col.id) return;
      reorderColumn(_dragColId, col.id); _dragColId=null;
    });
    wrap.addEventListener('dragend',()=>{ _dragColId=null; wrap.style.outline=''; });
  }
  wrap.appendChild(nameRow);

  // Per-track sub-headers
  if(tracks.length>1){
    const trackRow=document.createElement('div'); trackRow.className='col-track-subheaders';
    tracks.forEach(tr=>{
      const th=document.createElement('div'); th.className='col-track-subheader';
      th.style.width=COL_W+'px';
      const tn=document.createElement('span'); tn.textContent=tr.name||'Track';
      tn.style.cursor='pointer';
      tn.addEventListener('click',()=>renameTrack(col.id,tr.id,tn));
      th.appendChild(tn);
      if(!screenshotMode && tracks.length>1){
        const dt=document.createElement('button'); dt.className='col-del-btn'; dt.textContent='✕'; dt.title='Delete track';
        dt.style.display='inline';
        dt.addEventListener('click',e=>{e.stopPropagation();deleteTrack(col.id,tr.id);});
        th.appendChild(dt);
      }
      trackRow.appendChild(th);
    });
    wrap.appendChild(trackRow);
  }
  return wrap;
}

function addTrackToColumn(colId){
  const col=state.columns.find(c=>c.id===colId); if(!col) return;
  const trId=uid('t');
  col.tracks.push({id:trId,name:'Track '+(col.tracks.length+1)});
  // Add grid entries for all sections
  state.sections.forEach(sec=>{
    if(!state.grid[sec.id]) state.grid[sec.id]={};
    if(!state.grid[sec.id][colId]) state.grid[sec.id][colId]={};
    state.grid[sec.id][colId][trId]=[];
  });
  renderAll(); saveToStorage();
}

function deleteTrack(colId,trId){
  const col=state.columns.find(c=>c.id===colId); if(!col||col.tracks.length<=1) return;
  if(!confirm('Delete this track and all its vehicles?')) return;
  state.sections.forEach(sec=>{
    const slots=state.grid[sec.id]?.[colId]?.[trId]||[];
    slots.forEach(entry=>{
      if(entry.type==='vehicle') deleteVehicleData(entry.id);
      else if(entry.type==='folder') deleteFolderData(entry.id);
    });
    if(state.grid[sec.id]?.[colId]) delete state.grid[sec.id][colId][trId];
  });
  col.tracks=col.tracks.filter(t=>t.id!==trId);
  renderAll(); saveToStorage();
}

function renameTrack(colId,trId,spanEl){
  const col=state.columns.find(c=>c.id===colId); if(!col) return;
  const tr=col.tracks.find(t=>t.id===trId); if(!tr) return;
  const inp=document.createElement('input'); inp.className='inline-edit-input'; inp.value=tr.name||'';
  inp.style.width='80px';
  spanEl.replaceWith(inp); inp.focus(); inp.select();
  const finish=()=>{tr.name=inp.value.trim()||tr.name;renderAll();saveToStorage();};
  inp.addEventListener('blur',finish);
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')finish();if(e.key==='Escape')renderAll();});
}

function reorderColumn(fromId, toId){
  const fi=state.columns.findIndex(c=>c.id===fromId);
  const ti=state.columns.findIndex(c=>c.id===toId);
  if(fi<0||ti<0) return;
  const [col]=state.columns.splice(fi,1);
  state.columns.splice(ti,0,col);
  renderAll(); saveToStorage();
}

function startRenameCol(colId, spanEl){
  const col=state.columns.find(c=>c.id===colId); if(!col) return;
  const inp=document.createElement('input'); inp.className='inline-edit-input'; inp.value=col.name;
  spanEl.replaceWith(inp); inp.focus(); inp.select();
  const finish=()=>{const v=inp.value.trim();if(v)col.name=v;renderAll();saveToStorage();};
  inp.addEventListener('blur',finish);
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')finish();if(e.key==='Escape')renderAll();});
}

function deleteColumn(colId){
  if(state.columns.length<=1){alert('Cannot delete the last column.');return;}
  if(!confirm('Delete this column and all its vehicles?')) return;
  state.sections.forEach(sec=>{
    const colGrid=state.grid[sec.id]?.[colId]||{};
    Object.values(colGrid).forEach(slots=>{
      if(!Array.isArray(slots)) return;
      slots.forEach(entry=>{ if(entry?.type==='vehicle') deleteVehicleData(entry.id);
                              else if(entry?.type==='folder') deleteFolderData(entry.id); });
    });
    if(state.grid[sec.id]) delete state.grid[sec.id][colId];
  });
  state.columns=state.columns.filter(c=>c.id!==colId);
  renderAll(); saveToStorage();
}

// ─────────────────────────────────────────────
// RANK SECTIONS
// ─────────────────────────────────────────────
function renderRankSections(){
  const container=document.getElementById('rankSections');
  container.innerHTML='';
  state.sections.forEach(sec=>container.appendChild(makeSectionEl(sec)));
}

function makeSectionEl(sec){
  const secEl=document.createElement('div');
  secEl.className='rank-section'; secEl.dataset.secId=sec.id;

  const lr=document.createElement('div'); lr.className='rank-label-row';
  const lbl=document.createElement('span'); lbl.className='rank-label'; lbl.textContent=sec.name; lr.appendChild(lbl);

  if(!screenshotMode){
    const ren=document.createElement('button'); ren.className='rank-rename-btn'; ren.textContent='— rename';
    ren.addEventListener('click',()=>startRenameSection(sec.id,lbl)); lr.appendChild(ren);
    const del=document.createElement('button'); del.className='rank-del-btn'; del.textContent='✕';
    del.addEventListener('click',()=>deleteSection(sec.id)); lr.appendChild(del);
  }
  secEl.appendChild(lr);

  const body=document.createElement('div'); body.className='rank-body';
  body.dataset.secId=sec.id;
  const rCols=state.columns.filter(c=>c.type==='research');
  const pCols=state.columns.filter(c=>c.type==='premium');
  rCols.forEach(col=>{
    const tracks=col.tracks||[{id:'t1',name:''}];
    tracks.forEach(tr=>body.appendChild(makeColTrack(sec,col,tr)));
  });
  if(rCols.length&&pCols.length){
    const div=document.createElement('div'); div.className='col-track-divider'; body.appendChild(div);
  }
  pCols.forEach(col=>{
    const tracks=col.tracks||[{id:'t1',name:''}];
    tracks.forEach(tr=>body.appendChild(makeColTrack(sec,col,tr)));
  });
  secEl.appendChild(body);

  const bl=document.createElement('div'); bl.className='rank-bottom-line'; secEl.appendChild(bl);
  return secEl;
}

function startRenameSection(secId,labelEl){
  const sec=state.sections.find(s=>s.id===secId); if(!sec) return;
  const inp=document.createElement('input'); inp.className='inline-edit-input'; inp.value=sec.name; inp.style.width='80px';
  labelEl.replaceWith(inp); inp.focus(); inp.select();
  const finish=()=>{const v=inp.value.trim();if(v)sec.name=v;renderAll();saveToStorage();};
  inp.addEventListener('blur',finish);
  inp.addEventListener('keydown',e=>{if(e.key==='Enter')finish();if(e.key==='Escape')renderAll();});
}

function deleteSection(secId){
  if(state.sections.length<=1){alert('Cannot delete last section.');return;}
  if(!confirm('Delete this rank and all its vehicles?')) return;
  Object.values(state.grid[secId]||{}).forEach(colGrid=>{
    if(!colGrid||typeof colGrid!=='object') return;
    Object.values(colGrid).forEach(slots=>{
      if(!Array.isArray(slots)) return;
      slots.forEach(entry=>{
        if(entry?.type==='vehicle') deleteVehicleData(entry.id);
        else if(entry?.type==='folder') deleteFolderData(entry.id);
      });
    });
  });
  delete state.grid[secId];
  state.sections=state.sections.filter(s=>s.id!==secId);
  renderAll(); saveToStorage();
}

// ─────────────────────────────────────────────
// COLUMN TRACK
// ─────────────────────────────────────────────
function makeColTrack(sec, col, tr){
  const trId=tr.id;
  if(!state.grid[sec.id]) state.grid[sec.id]={};
  if(!state.grid[sec.id][col.id]) state.grid[sec.id][col.id]={};
  if(!state.grid[sec.id][col.id][trId]) state.grid[sec.id][col.id][trId]=[];

  const track=document.createElement('div');
  track.className='col-track';
  track.dataset.secId=sec.id; track.dataset.colId=col.id; track.dataset.trId=trId;

  const slots=state.grid[sec.id][col.id][trId];
  const isPremiumCol = col.type==='premium';

  for(let i=0;i<slots.length;i++){
    track.appendChild(makeSlotEl(sec.id, col.id, trId, i, slots[i]));
    if(i<slots.length-1){
      // Spacer where DOM arrow used to be — SVG arrows handle all connections now
      const sp=document.createElement('div'); sp.style.height='36px'; track.appendChild(sp);
    }
  }

  const bottom=document.createElement('div'); bottom.className='track-bottom';
  // Small spacer for breathing room
  const sp=document.createElement('div'); sp.style.height='4px'; bottom.appendChild(sp);

  if(!screenshotMode){
    const addBtn=document.createElement('button');
    addBtn.className='add-vehicle-btn-compact'; addBtn.innerHTML='<span>+</span>';
    addBtn.title='Add vehicle';
    addBtn.addEventListener('click',()=>openAddVehicleModal(sec.id,col.id,null,trId));
    bottom.appendChild(addBtn);

    bottom.addEventListener('dragover',e=>e.preventDefault());
    bottom.addEventListener('drop',e=>{
      e.preventDefault();
      const raw=e.dataTransfer.getData('text/plain'); if(!raw||raw.startsWith('col:')) return;
      let data; try{data=JSON.parse(raw);}catch{return;}
      const srcTrId2=data.trId||'t1';
      const src=state.grid[data.srcSec]?.[data.srcCol]?.[srcTrId2]; if(!src) return;
      const dragged=src.splice(data.srcSlot,1)[0];
      state.grid[sec.id][col.id][trId].push(dragged);
      // Auto-set premium based on destination column type
      if(dragged?.type==='vehicle'){
        const veh=state.vehicles[dragged.id];
        if(veh){
          const isPremCol=col.type==='premium';
          veh.premium=isPremCol;
          if(isPremCol && veh.color==='#314654') veh.color='#3d361c';
          if(!isPremCol && veh.color==='#3d361c') veh.color='#314654';
        }
      }
      renderAll(); saveToStorage();
    });
  }
  track.appendChild(bottom);
  return track;
}

// ─────────────────────────────────────────────
// SLOT
// ─────────────────────────────────────────────
function makeSlotEl(secId, colId, trId, slotIndex, entry){
  const slotEl=document.createElement('div'); slotEl.className='slot';
  slotEl.dataset.secId=secId; slotEl.dataset.colId=colId; slotEl.dataset.trId=trId;
  slotEl.dataset.slotIndex=slotIndex;
  const dz=document.createElement('div'); dz.className='slot-drop-zone'; slotEl.appendChild(dz);

  let inner=null;
  if(entry?.type==='vehicle'){
    const v=state.vehicles[entry.id]; if(v) inner=makeVehicleCard(v,secId,colId,trId,slotIndex);
  } else if(entry?.type==='folder'){
    const f=state.folders[entry.id]; if(f) inner=makeFolderCard(f,secId,colId,trId,slotIndex);
  }
  if(inner) slotEl.appendChild(inner);

  slotEl.addEventListener('dragover',e=>{e.preventDefault();slotEl.classList.add('drag-over');});
  slotEl.addEventListener('dragleave',()=>slotEl.classList.remove('drag-over'));
  slotEl.addEventListener('drop',e=>{
    e.preventDefault(); slotEl.classList.remove('drag-over');
    const raw=e.dataTransfer.getData('text/plain'); if(!raw||raw.startsWith('col:')) return;
    handleDrop(e,secId,colId,trId,slotIndex,entry);
  });
  return slotEl;
}

// ─────────────────────────────────────────────
// VEHICLE CARD
// ─────────────────────────────────────────────
function makeVehicleCard(v, secId, colId, trId, slotIndex){
  const isPremium = v.premium===true||v.premium==='true';
  const card=document.createElement('div');
  card.className='vehicle-card'+(isPremium?' premium-card':'');
  card.dataset.vehicleId=v.id;
  if(v.color && v.color!==(isPremium?'#3d361c':'#314654')) card.style.background=v.color;
  card.draggable=true;

  // Top-right: name only
  const headerText=document.createElement('div'); headerText.className='card-header-text';
  const nameEl=document.createElement('span'); nameEl.className='card-name'; nameEl.textContent=v.name;
  headerText.appendChild(nameEl);
  card.appendChild(headerText);

  // BR bottom-right: optional type icon + BR value
  if(v.br){
    const brWrap=document.createElement('div'); brWrap.className='card-br-wrap';
    if(v.type){
      const tDef=VEHICLE_TYPES.find(x=>x.name===v.type);
      if(tDef){
        const ico=document.createElementNS('http://www.w3.org/2000/svg','svg');
        ico.setAttribute('width','13'); ico.setAttribute('height','9');
        ico.setAttribute('viewBox','0 0 21 15');
        ico.setAttribute('xmlns','http://www.w3.org/2000/svg');
        ico.innerHTML=tDef.svg; ico.className='card-type-ico';
        brWrap.appendChild(ico);
      }
    }
    const brEl=document.createElement('span'); brEl.className='card-br';
    const brVal = parseFloat(v.br).toFixed(1);
    brEl.textContent = v.reserve ? brVal+' (Reserve)' : brVal;
    brWrap.appendChild(brEl);
    card.appendChild(brWrap);
  }

  // Image below header text
  const imgArea=document.createElement('div'); imgArea.className='card-img-area';
  const thumb=v.images?.[0]?.src||null;
  if(thumb){
    const img=document.createElement('img'); img.className='card-image'; img.src=thumb; img.alt=v.name;
    img.onerror=()=>img.replaceWith(makePlaceholder()); imgArea.appendChild(img);
  } else {
    imgArea.appendChild(makePlaceholder());
  }
  card.appendChild(imgArea);

  card.addEventListener('click',e=>{e.stopPropagation();openVehicleModal(v.id);});
  card.addEventListener('contextmenu',e=>{
    e.preventDefault();
    showContextMenu(e,[
      {label:'Edit',              action:()=>openVehicleModal(v.id,true)},
      {label:'Edit Connection',   action:()=>openConnectionModal(v.id)},
      {sep:true},
      {label:'Merge into folder…',action:()=>startMergeMode(v.id,secId,colId,trId,slotIndex)},
      {sep:true},
      {label:'Delete',cls:'danger',action:()=>deleteVehicle(v.id,secId,colId,trId,slotIndex)},
    ]);
  });
  card.addEventListener('dragstart',e=>{
    e.dataTransfer.setData('text/plain',JSON.stringify({type:'vehicle',id:v.id,srcSec:secId,srcCol:colId,trId:trId,srcSlot:slotIndex}));
    setTimeout(()=>card.classList.add('dragging'),0);
  });
  card.addEventListener('dragend',()=>card.classList.remove('dragging'));
  return card;
}

function makePlaceholder(){
  const ph=document.createElement('div'); ph.className='card-image-placeholder'; ph.textContent='✈'; return ph;
}

// ─────────────────────────────────────────────
// FOLDER NAME HELPER
// ─────────────────────────────────────────────
function folderDisplayName(folder){
  if(folder.customName) return folder.customName;
  const names=(folder.vehicleIds||[]).map(id=>state.vehicles[id]?.name).filter(Boolean);
  if(!names.length) return 'Empty Folder';
  if(names.length===1) return names[0];
  // Find common prefix
  let prefix=names[0];
  for(let i=1;i<names.length;i++){
    while(!names[i].startsWith(prefix)) prefix=prefix.slice(0,-1);
    if(!prefix) break;
  }
  const minLen=Math.min(...names.map(n=>n.length));
  if(prefix.length>=Math.ceil(minLen/2)){
    const suffixes=names.map(n=>n.slice(prefix.length));
    if(suffixes.every(s=>s.length<=6)) return prefix+suffixes.join('/');
  }
  return names.join('/');
}

// ─────────────────────────────────────────────
// FOLDER CARDS
// ─────────────────────────────────────────────
function makeFolderCard(folder,secId,colId,trId,slotIndex){
  return folder.open ? makeFolderOpen(folder,secId,colId,trId,slotIndex)
                     : makeFolderClosed(folder,secId,colId,trId,slotIndex);
}

function folderBRDisplay(vehicles){
  const brs=vehicles.map(v=>parseFloat(v.br)).filter(n=>!isNaN(n)&&n>0);
  if(!brs.length) return null;
  const lo=Math.min(...brs), hi=Math.max(...brs);
  if(Math.abs(lo-hi)<0.05) return lo.toFixed(1); // same BR
  return lo.toFixed(1)+'-'+hi.toFixed(1);
}

function makeFolderClosed(folder,secId,colId,trId,slotIndex){
  const vehicles=(folder.vehicleIds||[]).map(id=>state.vehicles[id]).filter(Boolean);
  const card=document.createElement('div');
  card.className='vehicle-card folder-closed-card'; card.dataset.folderId=folder.id; card.draggable=true;
  // Color folder card to match its first vehicle (premium = golden, custom = custom, else default)
  const fv=vehicles[0];
  if(fv){
    const isPremFv=fv.premium===true||fv.premium==='true';
    const fvColor=fv.color||(isPremFv?'#3d361c':'#314654');
    card.style.background=fvColor;
    card.style.borderColor=lightenHex(fvColor,28);
    if(isPremFv) card.classList.add('premium-card');
  }

  // Header text top-right — name only
  const headerText=document.createElement('div'); headerText.className='card-header-text';
  const nameEl=document.createElement('span'); nameEl.className='card-name'; nameEl.textContent=folderDisplayName(folder);
  headerText.appendChild(nameEl);
  card.appendChild(headerText);

  // BR range bottom-right
  const brStr=folderBRDisplay(vehicles);
  if(brStr){
    const brEl=document.createElement('span'); brEl.className='card-br'; brEl.textContent=brStr;
    card.appendChild(brEl);
  }

  // Two images
  const imgArea=document.createElement('div'); imgArea.className='folder-closed-imgs';
  vehicles.slice(0,2).forEach(v=>{
    const half=document.createElement('div'); half.className='folder-img-half';
    const thumb=v.images?.[0]?.src||null;
    if(thumb){ const img=document.createElement('img');img.src=thumb;img.alt=v.name;img.onerror=()=>img.replaceWith(mkFolderPh());half.appendChild(img); }
    else half.appendChild(mkFolderPh());
    imgArea.appendChild(half);
  });
  card.appendChild(imgArea);

  card.addEventListener('click',e=>{e.stopPropagation();folder.open=true;renderAll();saveToStorage();});
  card.addEventListener('contextmenu',e=>{
    e.preventDefault();
    showContextMenu(e,[
      {label:'Open Folder',          action:()=>{folder.open=true;renderAll();saveToStorage();}},
      {label:'Rename Folder',        action:()=>openFolderRenameModal(folder.id)},
      {label:'Dissolve Folder',      action:()=>dissolveFolder(folder.id,secId,colId,trId,slotIndex)},
      {sep:true},
      {label:'Delete All',cls:'danger',action:()=>deleteFolderAll(folder.id,secId,colId,trId,slotIndex)},
    ]);
  });
  card.addEventListener('dragstart',e=>{
    e.dataTransfer.setData('text/plain',JSON.stringify({type:'folder',id:folder.id,srcSec:secId,srcCol:colId,trId:trId,srcSlot:slotIndex}));
  });
  return card;
}

function mkFolderPh(){
  const ph=document.createElement('div'); ph.className='folder-img-placeholder'; ph.textContent='✈'; return ph;
}


function lightenHex(hex, amt){
  let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  r=Math.min(255,r+amt); g=Math.min(255,g+amt); b=Math.min(255,b+amt);
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
function makeFolderOpen(folder,secId,colId,trId,slotIndex){
  const vehicles=(folder.vehicleIds||[]).map(id=>state.vehicles[id]).filter(Boolean);
  const wrap=document.createElement('div'); wrap.className='folder-open-card'; wrap.dataset.folderId=folder.id;
  wrap.draggable=true;
  wrap.addEventListener('dragstart',e=>{
    if(e.target.closest('.folder-vehicle-item')) return; // let item drag take over
    e.dataTransfer.setData('text/plain',JSON.stringify({type:'folder',id:folder.id,srcSec:secId,srcCol:colId,trId:trId,srcSlot:slotIndex}));
    e.stopPropagation();
    setTimeout(()=>wrap.style.opacity='0.5',0);
  });
  wrap.addEventListener('dragend',()=>wrap.style.opacity='');
  // Match open folder bg to first vehicle color
  const fv0=vehicles[0];
  const _folderBaseColor = fv0 ? (fv0.color||((fv0.premium===true||fv0.premium==='true')?'#3d361c':'#314654')) : '#2a3c48';
  wrap.style.background = _folderBaseColor;
  wrap.style.borderColor = lightenHex(_folderBaseColor, 28);

  const bar=document.createElement('div'); bar.className='folder-header-bar';
  const title=document.createElement('span'); title.textContent='📁 '+folderDisplayName(folder); bar.appendChild(title);

  const renBtn=document.createElement('button'); renBtn.className='folder-rename-btn'; renBtn.textContent='✏'; renBtn.title='Rename folder';
  renBtn.addEventListener('click',e=>{e.stopPropagation();openFolderRenameModal(folder.id);});
  bar.appendChild(renBtn);

  const closeSpan=document.createElement('span'); closeSpan.textContent='▲'; closeSpan.style.marginLeft='6px'; bar.appendChild(closeSpan);
  bar.addEventListener('click',()=>{folder.open=false;renderAll();saveToStorage();}); wrap.appendChild(bar);

  const items=document.createElement('div'); items.className='folder-items';
  vehicles.forEach(v=>{
    const item=document.createElement('div'); item.className='folder-vehicle-item';
    // Tint item row to match vehicle color, outline = lighter shade
    const _fvIsPrem=v.premium===true||v.premium==='true';
    const _fvColor=v.color||(_fvIsPrem?'#3d361c':'#314654');
    const _fvBorder=lightenHex(_fvColor,30);
    item.style.background=_fvColor; item.style.borderColor=_fvBorder;
    const thumb=v.images?.[0]?.src||null;
    if(thumb){const img=document.createElement('img');img.src=thumb;img.alt=v.name;img.onerror=()=>img.replaceWith(mkFVPh());item.appendChild(img);}
    else item.appendChild(mkFVPh());
    const info=document.createElement('div'); info.className='fv-info';
    const ne=document.createElement('div');ne.className='fv-name';ne.textContent=v.name;info.appendChild(ne);
    if(v.br){
      const brRow=document.createElement('div'); brRow.className='fv-br-row';
      // Type icon left of BR
      if(v.type){
        const tDef=VEHICLE_TYPES.find(x=>x.name===v.type);
        if(tDef){
          const ico=document.createElementNS('http://www.w3.org/2000/svg','svg');
          ico.setAttribute('width','13'); ico.setAttribute('height','9');
          ico.setAttribute('viewBox','0 0 21 15');
          ico.setAttribute('xmlns','http://www.w3.org/2000/svg');
          ico.innerHTML=tDef.svg; ico.className='fv-type-ico';
          brRow.appendChild(ico);
        }
      }
      const be=document.createElement('span');be.className='fv-br';
      be.textContent=v.reserve?parseFloat(v.br).toFixed(1)+' (Reserve)':parseFloat(v.br).toFixed(1);
      brRow.appendChild(be);
      info.appendChild(brRow);
    }
    item.appendChild(info);
    // Drag to reorder inside folder
    item.draggable=true;
    item.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('text/plain',JSON.stringify({type:'folder-item',vehicleId:v.id,folderId:folder.id}));
      e.stopPropagation();
      setTimeout(()=>item.style.opacity='0.4',0);
    });
    item.addEventListener('dragend',()=>item.style.opacity='');
    item.addEventListener('dragover',e=>{e.preventDefault();e.stopPropagation();item.style.outline='2px solid var(--accent)';});
    item.addEventListener('dragleave',()=>item.style.outline='');
    item.addEventListener('drop',e=>{
      e.preventDefault();e.stopPropagation();item.style.outline='';
      const raw=e.dataTransfer.getData('text/plain'); if(!raw) return;
      let data; try{data=JSON.parse(raw);}catch{return;}
      if(data.type!=='folder-item'||data.folderId!==folder.id||data.vehicleId===v.id) return;
      // Reorder: move dragged vehicle to position of drop target
      const ids=folder.vehicleIds;
      const fromIdx=ids.indexOf(data.vehicleId);
      const toIdx=ids.indexOf(v.id);
      if(fromIdx<0||toIdx<0) return;
      ids.splice(fromIdx,1); ids.splice(toIdx,0,data.vehicleId);
      renderAll();saveToStorage();
    });
    item.addEventListener('click',e=>{e.stopPropagation();openVehicleModal(v.id);});
    item.addEventListener('contextmenu',e=>{
      e.preventDefault();
      showContextMenu(e,[
        {label:'Edit',action:()=>openVehicleModal(v.id,true)},
        {label:'Remove from folder',action:()=>removeFromFolder(v.id,folder.id,secId,colId,trId,slotIndex)},
        {sep:true},
        {label:'Delete',cls:'danger',action:()=>{
          deleteVehicleData(v.id);
          folder.vehicleIds=folder.vehicleIds.filter(id=>id!==v.id);
          if(!folder.vehicleIds.length){state.grid[secId][colId][trId].splice(slotIndex,1);delete state.folders[folder.id];}
          renderAll();saveToStorage();
        }},
      ]);
    });
    items.appendChild(item);
  });

  if(!screenshotMode){
    const addBtn=document.createElement('button'); addBtn.className='btn btn-secondary folder-add-btn';
    addBtn.textContent='+ Add vehicle to folder';
    addBtn.style.background=lightenHex(_folderBaseColor,14);
    addBtn.style.borderColor=lightenHex(_folderBaseColor,35);
    addBtn.style.color='#c8d0d4';
    addBtn.addEventListener('click',e=>{e.stopPropagation();openAddVehicleModal(secId,colId,folder.id);});
    items.appendChild(addBtn);
  }
  wrap.appendChild(items);
  return wrap;
}

function mkFVPh(){
  const ph=document.createElement('div');ph.className='fv-placeholder';ph.textContent='✈';return ph;
}

// ─────────────────────────────────────────────
// FOLDER RENAME MODAL
// ─────────────────────────────────────────────
let _renameFolderId=null;
function openFolderRenameModal(folderId){
  _renameFolderId=folderId;
  const f=state.folders[folderId]; if(!f) return;
  document.getElementById('folderNameInput').value=f.customName||'';
  openModal('renameFolderModal');
  document.getElementById('folderNameInput').focus();
}
function bindFolderRenameModal(){
  document.getElementById('folderRenameSaveBtn').addEventListener('click',()=>{
    const f=state.folders[_renameFolderId]; if(!f) return;
    const val=document.getElementById('folderNameInput').value.trim();
    f.customName=val||null;
    closeModal('renameFolderModal');
    renderAll();saveToStorage();
  });
}

// ─────────────────────────────────────────────
// ARROWS  — thicker, no arrows on premium
// ─────────────────────────────────────────────
function makeArrowEl(fromEntry, _toEntry, secId, colId, trId){
  const row=document.createElement('div'); row.className='arrow-row';
  let fromId=null;
  if(fromEntry?.type==='vehicle') fromId=fromEntry.id;
  else if(fromEntry?.type==='folder'){
    const f=state.folders[fromEntry.id];
    fromId=f?.vehicleIds?.[0]||null;
  }
  const conn=fromId?(state.connections[fromId]||{}):{};
  const hasBranch=!!(conn.targets?.length>1 || conn.branch);

  const btn=document.createElement('button');
  btn.className='arrow-btn'+(hasBranch?' has-branch':'');
  btn.title=fromId?'Click to edit connection':'';
  btn.innerHTML=`<svg viewBox="0 0 20 34" xmlns="http://www.w3.org/2000/svg">
    <line x1="10" y1="0" x2="10" y2="24" class="arrow-shaft"/>
    <polygon points="10,34 2,20 18,20" class="arrow-head"/>
  </svg>`;
  if(fromId) btn.addEventListener('click',e=>{e.stopPropagation();openConnectionModal(fromId);});
  row.appendChild(btn);
  return row;
}

// ─────────────────────────────────────────────
// DRAG & DROP  (vehicles / folders)
// ─────────────────────────────────────────────
function handleDrop(e, secId, colId, trId, slotIndex, targetEntry){
  const raw=e.dataTransfer.getData('text/plain'); if(!raw) return;
  let data; try{data=JSON.parse(raw);}catch{return;}

  if(data.type==='vehicle'){
    const srcTrId = data.trId || 't1';
    if(targetEntry?.type==='vehicle' && targetEntry.id!==data.id){
      // Determine intent by drop Y position relative to target element
      const targetEl=e.currentTarget;
      const rect=targetEl.getBoundingClientRect();
      const dropY=e.clientY-rect.top;
      const isTopHalf=dropY < rect.height/2;

      if(isTopHalf){
        // INSERT ABOVE target (reorder)
        const srcSlots=state.grid[data.srcSec]?.[data.srcCol]?.[srcTrId]; if(!srcSlots) return;
        const [dragged]=srcSlots.splice(data.srcSlot,1);
        const dest=state.grid[secId][colId][trId];
        let ins=slotIndex;
        if(data.srcSec===secId&&data.srcCol===colId&&srcTrId===trId&&data.srcSlot<slotIndex) ins--;
        dest.splice(ins,0,dragged);
        renderAll();saveToStorage(); return;
      } else {
        // DROP ON BOTTOM HALF → merge into folder (always, any track)
        const srcSlots=state.grid[data.srcSec]?.[data.srcCol]?.[srcTrId]; if(!srcSlots) return;
        srcSlots.splice(data.srcSlot,1);
        let adj=slotIndex;
        if(data.srcSec===secId&&data.srcCol===colId&&srcTrId===trId&&data.srcSlot<slotIndex) adj--;
        // If target is already in a folder slot, add to that folder
        mergeIntoFolder([targetEntry.id,data.id],secId,colId,trId,adj);
        renderAll();saveToStorage(); return;
      }
    }
    // Move vehicle to new slot
    const srcSlots=state.grid[data.srcSec]?.[data.srcCol]?.[srcTrId]; if(!srcSlots) return;
    const dragged=srcSlots.splice(data.srcSlot,1)[0]; if(!dragged) return;
    const dest=state.grid[secId][colId][trId];
    let ins=slotIndex;
    if(data.srcSec===secId&&data.srcCol===colId&&srcTrId===trId&&data.srcSlot<slotIndex) ins--;
    dest.splice(ins,0,dragged);
    // Auto-set premium based on destination column type
    const destCol=state.columns.find(c=>c.id===colId);
    if(destCol && dragged.type==='vehicle'){
      const veh=state.vehicles[dragged.id];
      if(veh){
        const isPremCol=destCol.type==='premium';
        veh.premium=isPremCol;
        if(isPremCol && veh.color==='#314654') veh.color='#3d361c';
        if(!isPremCol && veh.color==='#3d361c') veh.color='#314654';
      }
    }
    renderAll();saveToStorage();
  } else if(data.type==='folder'){
    const srcTrId = data.trId || 't1';
    const srcSlots=state.grid[data.srcSec]?.[data.srcCol]?.[srcTrId]; if(!srcSlots) return;
    const dragged=srcSlots.splice(data.srcSlot,1)[0]; if(!dragged) return;
    const dest=state.grid[secId][colId][trId];
    let ins=slotIndex;
    if(data.srcSec===secId&&data.srcCol===colId&&srcTrId===trId&&data.srcSlot<slotIndex) ins--;
    dest.splice(ins,0,dragged);
    renderAll();saveToStorage();
  }
}

// ─────────────────────────────────────────────
// MERGE INTO FOLDER
// ─────────────────────────────────────────────
function mergeIntoFolder(vehicleIds,secId,colId,trId,slotIndex){
  const fid=uid('folder');
  state.folders[fid]={id:fid,vehicleIds:[...new Set(vehicleIds)],open:false,customName:null};
  state.grid[secId][colId][trId][slotIndex]={type:'folder',id:fid};
}

let _mergeMode=null;
function startMergeMode(vehicleId,secId,colId,trId,slotIndex){
  _mergeMode={vehicleId,secId,colId,slotIndex};
  document.querySelectorAll('.vehicle-card').forEach(c=>{
    if(c.dataset.vehicleId!==vehicleId){c.classList.add('merge-target');c.style.cursor='crosshair';}
  });
  function handler(e){
    if(!_mergeMode){document.removeEventListener('click',handler);return;}
    const t=e.target.closest('.vehicle-card.merge-target');
    clearMergeMode(); document.removeEventListener('click',handler);
    if(!t) return;
    const tid=t.dataset.vehicleId; const loc=findVehicleLocation(tid); if(!loc) return;
    state.grid[secId][colId][trId].splice(slotIndex,1);
    let adj=loc.slotIndex;
    if(loc.secId===secId&&loc.colId===colId&&slotIndex<loc.slotIndex) adj--;
    mergeIntoFolder([tid,vehicleId],loc.secId,loc.colId,loc.trId,adj);
    renderAll();saveToStorage();
  }
  setTimeout(()=>document.addEventListener('click',handler),50);
}
function clearMergeMode(){
  _mergeMode=null;
  document.querySelectorAll('.vehicle-card.merge-target').forEach(c=>{c.classList.remove('merge-target');c.style.cursor='';});
}
function findVehicleLocation(vid){
  for(const sec of Object.keys(state.grid)){
    for(const colId of Object.keys(state.grid[sec])){
      const colGrid=state.grid[sec][colId];
      if(!colGrid||typeof colGrid!=='object') continue;
      for(const trId of Object.keys(colGrid)){
        const slots=colGrid[trId];
        if(!Array.isArray(slots)) continue;
        for(let i=0;i<slots.length;i++){
          if(slots[i]?.type==='vehicle'&&slots[i].id===vid) return{secId:sec,colId,trId,slotIndex:i};
          if(slots[i]?.type==='folder'){
            const f=state.folders[slots[i].id];
            if(f&&f.vehicleIds.includes(vid)) return{secId:sec,colId,trId,slotIndex:i};
          }
        }
      }
    }
  }
  return null;
}

function removeFromFolder(vehicleId,folderId,secId,colId,trId,slotIndex){
  const f=state.folders[folderId]; if(!f) return;
  f.vehicleIds=f.vehicleIds.filter(id=>id!==vehicleId);
  if(!f.vehicleIds.length){state.grid[secId][colId][trId].splice(slotIndex,1);delete state.folders[folderId];}
  else if(f.vehicleIds.length===1){
    const rem=f.vehicleIds[0];
    state.grid[secId][colId][trId][slotIndex]={type:'vehicle',id:rem};
    delete state.folders[folderId];
    state.grid[secId][colId][trId].splice(slotIndex+1,0,{type:'vehicle',id:vehicleId});
  } else {
    state.grid[secId][colId][trId].splice(slotIndex+1,0,{type:'vehicle',id:vehicleId});
  }
  renderAll();saveToStorage();
}
function dissolveFolder(fid,secId,colId,trId,slotIndex){
  const f=state.folders[fid]; if(!f) return;
  const entries=f.vehicleIds.map(id=>({type:'vehicle',id}));
  state.grid[secId][colId][trId].splice(slotIndex,1,...entries);
  delete state.folders[fid]; renderAll();saveToStorage();
}
function deleteFolderAll(fid,secId,colId,trId,slotIndex){
  if(!confirm('Delete all vehicles in this folder?')) return;
  const f=state.folders[fid]; if(!f) return;
  f.vehicleIds.forEach(id=>deleteVehicleData(id));
  state.grid[secId][colId][trId].splice(slotIndex,1);
  delete state.folders[fid]; renderAll();saveToStorage();
}

// ─────────────────────────────────────────────
// VEHICLE DATA CRUD
// ─────────────────────────────────────────────
function deleteVehicleData(vid){
  delete state.vehicles[vid]; delete state.connections[vid];
  Object.keys(state.connections).forEach(k=>{
    const c=state.connections[k];
    if(c.next===vid)   c.next=null;
    if(c.branch===vid) c.branch=null;
    if(c.targets) c.targets=c.targets.filter(id=>id!==vid);
  });
}
function deleteFolderData(fid){
  const f=state.folders[fid]; if(!f) return;
  f.vehicleIds.forEach(id=>deleteVehicleData(id)); delete state.folders[fid];
}
function deleteVehicle(vid,secId,colId,trId,slotIndex){
  if(!confirm('Delete this vehicle?')) return;
  deleteVehicleData(vid); state.grid[secId][colId][trId].splice(slotIndex,1);
  renderAll();saveToStorage();
}

// ─────────────────────────────────────────────
// IMAGE HELPERS
// ─────────────────────────────────────────────
function readFilesAsDataURLs(files){
  return Promise.all([...files].map(f=>new Promise(res=>{
    const r=new FileReader();
    r.onload=ev=>res({src:ev.target.result,caption:''});
    r.readAsDataURL(f);
  })));
}

function parseUrlLines(text){
  return text.split('\n').map(s=>s.trim()).filter(Boolean).map(src=>({src,caption:''}));
}

// ─────────────────────────────────────────────
// VEHICLE MODAL — VIEW
// ─────────────────────────────────────────────
let _currentVehicleId=null;

function openVehicleModal(vid, editMode=false){
  _currentVehicleId=vid;
  const v=state.vehicles[vid]; if(!v) return;
  carouselIndex=0;

  // WT-style popup header
  document.getElementById('vmTitle').textContent  = v.manufacturer ? v.manufacturer+' '+v.name : v.name;
  document.getElementById('vmTitle2').textContent = v.manufacturer ? v.manufacturer+' '+v.name : v.name;

  // Type line: SVG icon + colored name + optional subtype
  const typeEl=document.getElementById('vmTypeDisplay');
  const isPrem=v.premium===true||v.premium==='true';
  if(v.type){
    const tDef=VEHICLE_TYPES.find(x=>x.name===v.type);
    const color=tDef?tDef.color:'#c8d0d4';
    const icon=tDef?`<svg width="21" height="15" xmlns="http://www.w3.org/2000/svg">${tDef.svg}</svg> `:'';
    const diamond=isPrem?'<span class="wt-diamond">♦</span> ':'';
    const sub=v.subType?` <span style="color:${color};opacity:.85">/ ${escHtml(v.subType)}</span>`:'';
    typeEl.innerHTML=`${diamond}${icon}<span style="color:${color}">${escHtml(v.type)}</span>${sub}`;
    typeEl.style.display='';
  } else {
    typeEl.innerHTML=''; typeEl.style.display='none';
  }

  // Rank + BR row
  const sectionName = findVehicleRankName(v.id);
  const rankEl = document.getElementById('vmRankDisplay');
  const brEl   = document.getElementById('vmBRDisplay');
  const sepEl  = document.getElementById('vmRankBRSep');
  if(sectionName){
    rankEl.innerHTML = 'Rank: <strong>' + escHtml(toRomanRank(sectionName)) + '</strong>';
    rankEl.style.display='';
    sepEl.style.display='';
  } else {
    rankEl.style.display='none';
    sepEl.style.display='none';
  }
  if(v.br){
    const brVal = parseFloat(v.br).toFixed(1) + (v.reserve ? ' (Reserve)' : '');
    brEl.innerHTML = 'Battle rating: <strong>' + escHtml(brVal) + '</strong>';
    brEl.style.display='';
  } else {
    brEl.style.display='none';
  }

  // Carousel — pass card color so bg can be set inside buildCarousel
  const isPremCar=v.premium===true||v.premium==='true';
  const cardBgColor=v.color||(isPremCar?'#3d361c':'#314654');
  buildCarousel(v.images||[], cardBgColor);

  // Tint the modal itself: body = card color slightly darkened, header = darker still
  function darken(hex, amt){
    let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
    r=Math.max(0,r-amt); g=Math.max(0,g-amt); b=Math.max(0,b-amt);
    return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
  }
  const modalEl=document.querySelector('#vehicleModal .modal');
  const modalHdr=document.querySelector('#vehicleModal .modal-header');
  const popupHdr=document.querySelector('#vehicleModal .wt-popup-header');
  if(modalEl){ modalEl.style.background=cardBgColor; modalEl.style.borderColor=darken(cardBgColor,10); }
  if(modalHdr){ modalHdr.style.background=darken(cardBgColor,18); modalHdr.style.borderBottomColor=darken(cardBgColor,28); }
  if(popupHdr){ popupHdr.style.background=darken(cardBgColor,12); popupHdr.style.borderBottomColor=darken(cardBgColor,22); }

  // Edit button: styled to match card color
  const editBtnEl=document.getElementById('vmEditBtn');
  if(editBtnEl){
    editBtnEl.style.background=darken(cardBgColor,8);
    editBtnEl.style.borderColor=darken(cardBgColor,22);
    editBtnEl.style.color='#c8d0d4';
  }

  // Manufacturer
  const mfgRow=document.getElementById('vmManufacturerRow');
  const mfg=document.getElementById('vmManufacturer');
  mfgRow.style.display='none'; // manufacturer shown in header title instead

  // Weapons
  buildWeaponsView(v.weapons||[]);

  // Legacy hidden elements
  const brDisplay = v.br ? parseFloat(v.br).toFixed(1) + (v.reserve ? ' (Reserve)' : '') : '—';
  document.getElementById('vmBR').textContent = brDisplay;
  document.getElementById('vmType').textContent    = v.type || '—';
  document.getElementById('vmPremium').textContent = (v.premium===true||v.premium==='true')?'Yes':'No';
  // Render description as Markdown if marked is available
  const descEl=document.getElementById('vmDescription');
  const rawDesc=v.desc||'';
  if(rawDesc && typeof marked !== 'undefined'){
    descEl.innerHTML=marked.parse(rawDesc);
  } else {
    descEl.textContent=rawDesc;
  }

  document.getElementById('vmViewMode').classList.remove('hidden');
  document.getElementById('vmEditMode').classList.add('hidden');
  openModal('vehicleModal');
  if(editMode) switchToEditMode();
}

function escHtml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function findVehicleRankName(vid){
  for(const sec of state.sections){
    const grid=state.grid[sec.id]||{};
    for(const colGrid of Object.values(grid)){
      if(!colGrid||typeof colGrid!=='object') continue;
      for(const slots of Object.values(colGrid)){
        if(!Array.isArray(slots)) continue;
        for(const entry of slots){
          if(entry?.type==='vehicle'&&entry.id===vid) return sec.name;
          if(entry?.type==='folder'){
            const f=state.folders[entry.id];
            if(f&&f.vehicleIds.includes(vid)) return sec.name;
          }
        }
      }
    }
  }
  return null;
}

// Extract the Roman numeral from rank names like "Rank II" → "II"
function toRomanRank(name){
  const m=name.match(/([IVXLCDM]+)\s*$/i);
  return m ? m[1].toUpperCase() : name;
}

function buildWeaponsView(weapons){
  const section=document.getElementById('vmWeaponsSection');
  const list=document.getElementById('vmWeaponsList');
  list.innerHTML='';
  if(!weapons||!weapons.length){ section.classList.add('hidden'); return; }
  section.classList.remove('hidden');
  weapons.forEach(w=>{
    const row=document.createElement('div'); row.className='wt-weapon-row';
    const qty=document.createElement('span'); qty.className='wt-weapon-qty';
    qty.textContent=(w.qty||1)+'x';
    const name=document.createElement('span'); name.className='wt-weapon-name';
    name.textContent=w.name||'';
    row.appendChild(qty); row.appendChild(name);
    list.appendChild(row);
  });
}

function buildCarousel(images, cardBgColor){
  const track=document.getElementById('vmCarouselTrack');
  const dots=document.getElementById('vmCarouselDots');
  const thumbs=document.getElementById('vmThumbs');
  const cap=document.getElementById('vmCarouselCaption');
  track.innerHTML=''; dots.innerHTML=''; thumbs.innerHTML='';

  const carousel=document.getElementById('vmCarousel');
  carousel.style.background = cardBgColor||'#314654';
  const prev=document.getElementById('vmCarouselPrev');
  const next=document.getElementById('vmCarouselNext');

  if(!images||!images.length){
    // No images: show placeholder
    const slide=document.createElement('div'); slide.className='vm-carousel-slide';
    const ph=document.createElement('div'); ph.className='slide-placeholder'; ph.textContent='✈';
    slide.appendChild(ph); track.appendChild(slide);
    prev.style.display='none'; next.style.display='none';
    cap.textContent=''; thumbs.style.display='none';
    return;
  }

  thumbs.style.display='';
  images.forEach((img,i)=>{
    // Slide
    const slide=document.createElement('div'); slide.className='vm-carousel-slide';
    const si=document.createElement('img'); si.src=img.src; si.alt=img.caption||'';
    slide.appendChild(si); track.appendChild(slide);

    // Dot
    const dot=document.createElement('div'); dot.className='vm-carousel-dot'+(i===0?' active':'');
    dot.addEventListener('click',()=>goToSlide(images,i));
    dots.appendChild(dot);

    // Thumb
    const th=document.createElement('img'); th.className='vm-thumb'+(i===0?' active':'');
    th.src=img.src; th.alt=img.caption||'';
    th.addEventListener('click',()=>goToSlide(images,i));
    thumbs.appendChild(th);
  });

  cap.textContent=images[0]?.caption||'';
  prev.style.display=images.length>1?'':'none';
  next.style.display=images.length>1?'':'none';

  prev.onclick=()=>goToSlide(images,carouselIndex-1);
  next.onclick=()=>goToSlide(images,carouselIndex+1);
  goToSlide(images,0,false);
}

function goToSlide(images,idx,animate=true){
  const n=images.length; if(!n) return;
  carouselIndex=((idx%n)+n)%n;
  const track=document.getElementById('vmCarouselTrack');
  track.style.transition=animate?'transform .3s ease':'none';
  track.style.transform=`translateX(-${carouselIndex*100}%)`;
  document.querySelectorAll('.vm-carousel-dot').forEach((d,i)=>d.classList.toggle('active',i===carouselIndex));
  document.querySelectorAll('.vm-thumb').forEach((t,i)=>t.classList.toggle('active',i===carouselIndex));
  document.getElementById('vmCarouselCaption').textContent=images[carouselIndex]?.caption||'';
}

// ─────────────────────────────────────────────
// VEHICLE MODAL — EDIT
// ─────────────────────────────────────────────
let _editImages=[]; // working copy of images array during edit

function switchToEditMode(){
  const v=state.vehicles[_currentVehicleId]; if(!v) return;
  _editImages=(v.images||[]).map(img=>({...img})); // deep copy

  document.getElementById('vmEditName').value         = v.name||'';
  document.getElementById('vmEditManufacturer').value = v.manufacturer||'';
  document.getElementById('vmEditBR').value           = v.br||'';
  document.getElementById('vmEditReserve').checked    = v.reserve||false;
  document.getElementById('vmEditType').value         = v.type||'';
  setTypePicker('vmEditTypeBtn','vmEditTypeDropdown','vmEditType', v.type||'');
  document.getElementById('vmEditSubType').value       = v.subType||'';
  document.getElementById('vmEditDesc').value         = v.desc||'';
  document.getElementById('vmEditPremium').value      = (v.premium===true||v.premium==='true')?'true':'false';
  document.getElementById('vmEditColor').value        = v.color||'#314654';

  _editWeapons=(v.weapons||[]).map(w=>({...w}));
  renderImgList();
  renderWeaponEditorList('vmWeaponList', _editWeapons, ()=>renderWeaponEditorList('vmWeaponList',_editWeapons,()=>{}));
  document.getElementById('vmViewMode').classList.add('hidden');
  document.getElementById('vmEditMode').classList.remove('hidden');
}

// Pending upload trigger tracking
let _pendingUploadIndex = -1;
let _pendingUploadTarget = null; // 'vm' or 'av'

function renderImgList(){
  renderImgEditorList('vmImgList', _editImages, ()=>renderImgList());
}

function renderImgEditorList(listId, arr, refreshFn, fileInputId){
  const list=document.getElementById(listId);
  if(!list) return;
  list.innerHTML='';

  arr.forEach((img,i)=>{
    const row=document.createElement('div'); row.className='img-editor-row';

    // Number
    const num=document.createElement('span'); num.className='img-editor-num'; num.textContent=(i+1)+'.';
    row.appendChild(num);

    // Delete X
    const del=document.createElement('button'); del.className='img-list-del'; del.textContent='✕';
    del.addEventListener('click',()=>{ arr.splice(i,1); refreshFn(); });
    row.appendChild(del);

    // Fields column
    const fields=document.createElement('div'); fields.className='img-editor-fields';

    // URL row
    const urlRow=document.createElement('div'); urlRow.className='img-editor-field-row';
    const urlLbl=document.createElement('span'); urlLbl.className='img-editor-lbl'; urlLbl.textContent='URL:';
    const urlInp=document.createElement('input'); urlInp.className='form-input img-editor-input';
    urlInp.placeholder='https://…'; urlInp.value=(img.src&&!img.src.startsWith('data:'))?img.src:'';
    urlInp.addEventListener('input',()=>{ if(urlInp.value.trim()){arr[i].src=urlInp.value.trim();}});
    // Upload button
    const uploadBtn=document.createElement('button'); uploadBtn.className='btn-upload-img'; uploadBtn.textContent='⬆';
    uploadBtn.title='Upload from file';
    uploadBtn.addEventListener('click',()=>{
      _pendingUploadIndex=i;
      _pendingUploadTarget=fileInputId||'vmEditImgFileHidden';
      document.getElementById(_pendingUploadTarget).click();
    });
    urlRow.appendChild(urlLbl); urlRow.appendChild(urlInp); urlRow.appendChild(uploadBtn);
    fields.appendChild(urlRow);

    // Caption row
    const capRow=document.createElement('div'); capRow.className='img-editor-field-row';
    const capLbl=document.createElement('span'); capLbl.className='img-editor-lbl'; capLbl.textContent='Caption:';
    const capInp=document.createElement('input'); capInp.className='form-input img-editor-input';
    capInp.placeholder='Caption…'; capInp.value=img.caption||'';
    capInp.addEventListener('input',()=>{ arr[i].caption=capInp.value; });
    capRow.appendChild(capLbl); capRow.appendChild(capInp);
    fields.appendChild(capRow);

    // Show if src is a data URL (uploaded)
    if(img.src&&img.src.startsWith('data:')){
      const note=document.createElement('span'); note.className='img-editor-uploaded-note';
      note.textContent='📎 local file uploaded'; fields.appendChild(note);
    }

    row.appendChild(fields);

    // Up/down
    if(arr.length>1){
      const mv=document.createElement('div'); mv.className='img-editor-move';
      const up=document.createElement('button'); up.className='img-list-move'; up.textContent='↑';
      up.addEventListener('click',()=>{ if(i>0){[arr[i-1],arr[i]]=[arr[i],arr[i-1]];refreshFn();} });
      const dn=document.createElement('button'); dn.className='img-list-move'; dn.textContent='↓';
      dn.addEventListener('click',()=>{ if(i<arr.length-1){[arr[i],arr[i+1]]=[arr[i+1],arr[i]];refreshFn();} });
      mv.appendChild(up); mv.appendChild(dn); row.appendChild(mv);
    }

    list.appendChild(row);
  });
}

function mkListThPh(){
  const ph=document.createElement('div'); ph.className='img-list-thumb-ph'; ph.textContent='✈'; return ph;
}

// ─ Weapon list editor ─
let _editWeapons = [];
let _avEditWeapons = [];

function renderWeaponEditorList(listId, arr, refreshFn){
  const list=document.getElementById(listId); if(!list) return;
  list.innerHTML='';
  arr.forEach((w,i)=>{
    const row=document.createElement('div'); row.className='weapon-editor-row';
    const num=document.createElement('span'); num.className='img-editor-num'; num.textContent=(i+1)+'.';
    row.appendChild(num);
    const del=document.createElement('button'); del.className='img-list-del'; del.textContent='✕';
    del.addEventListener('click',()=>{ arr.splice(i,1); refreshFn(); });
    row.appendChild(del);
    const fields=document.createElement('div'); fields.className='img-editor-fields';

    // Qty × Name
    const qtyRow=document.createElement('div'); qtyRow.className='img-editor-field-row weapon-row';
    const qtyInp=document.createElement('input'); qtyInp.className='form-input weapon-qty-input';
    qtyInp.type='number'; qtyInp.min='1'; qtyInp.value=w.qty||1; qtyInp.placeholder='Qty';
    qtyInp.addEventListener('input',()=>{ arr[i].qty=parseInt(qtyInp.value)||1; });
    const xLbl=document.createElement('span'); xLbl.className='weapon-x-lbl'; xLbl.textContent='×';
    const nameInp=document.createElement('input'); nameInp.className='form-input weapon-name-input';
    nameInp.placeholder='Weapon name…'; nameInp.value=w.name||'';
    nameInp.addEventListener('input',()=>{ arr[i].name=nameInp.value; });
    qtyRow.appendChild(qtyInp); qtyRow.appendChild(xLbl); qtyRow.appendChild(nameInp);
    fields.appendChild(qtyRow);
    row.appendChild(fields);
    list.appendChild(row);
  });
}

function bindVehicleModal(){
  document.getElementById('vmEditBtn').addEventListener('click',()=>switchToEditMode());
  document.getElementById('vmCancelEdit').addEventListener('click',()=>{
    document.getElementById('vmViewMode').classList.remove('hidden');
    document.getElementById('vmEditMode').classList.add('hidden');
  });
  document.getElementById('vmPresetResearch').addEventListener('click',()=>{ document.getElementById('vmEditColor').value='#314654'; });
  document.getElementById('vmPresetPremium').addEventListener('click',()=>{  document.getElementById('vmEditColor').value='#3d361c'; });

  document.getElementById('vmSaveBtn').addEventListener('click',async()=>{
    const v=state.vehicles[_currentVehicleId]; if(!v) return;
    v.name         = document.getElementById('vmEditName').value.trim()||v.name;
    v.manufacturer = document.getElementById('vmEditManufacturer').value.trim();
    v.br           = document.getElementById('vmEditBR').value;
    v.reserve      = document.getElementById('vmEditReserve').checked;
    v.type         = document.getElementById('vmEditType').value;
    v.subType      = document.getElementById('vmEditSubType').value.trim();
    v.desc         = document.getElementById('vmEditDesc').value;
    // Premium determined by which column the vehicle is in (not a manual field)
    const _editLoc=findVehicleLocation(v.id);
    const _editCol=_editLoc?state.columns.find(c=>c.id===_editLoc.colId):null;
    v.premium=_editCol?.type==='premium'||false;
    v.color        = document.getElementById('vmEditColor').value;

    v.weapons=_editWeapons.filter(w=>w.name&&w.name.trim());
    v.images=_editImages.filter(img=>img.src&&img.src.trim());
    renderAll();saveToStorage();
    openVehicleModal(v.id);
  });

  // "Add image" button
  document.getElementById('vmAddImgBtn').addEventListener('click',()=>{
    _editImages.push({src:'',caption:''});
    renderImgList();
  });

  // "Add weapon" button
  document.getElementById('vmAddWeaponBtn').addEventListener('click',()=>{
    _editWeapons.push({qty:1,name:''});
    renderWeaponEditorList('vmWeaponList',_editWeapons,()=>renderWeaponEditorList('vmWeaponList',_editWeapons,()=>{}));
  });

  // Hidden file input for per-image upload
  document.getElementById('vmEditImgFileHidden').addEventListener('change',async function(){
    if(!this.files.length) return;
    const [result]=await readFilesAsDataURLs([this.files[0]]);
    if(_pendingUploadIndex>=0 && _pendingUploadIndex<_editImages.length){
      _editImages[_pendingUploadIndex].src=result.src;
    }
    this.value='';
    _pendingUploadIndex=-1;
    renderImgList();
  });

  document.getElementById('vmDeleteBtn').addEventListener('click',()=>{
    if(!_currentVehicleId||!confirm('Delete this vehicle?')) return;
    const loc=findVehicleLocation(_currentVehicleId);
    if(loc) deleteVehicle(_currentVehicleId,loc.secId,loc.colId,loc.trId||'t1',loc.slotIndex);
    else{deleteVehicleData(_currentVehicleId);renderAll();saveToStorage();}
    closeModal('vehicleModal');
  });
}

// ─────────────────────────────────────────────
// ADD VEHICLE MODAL
// ─────────────────────────────────────────────
let _addVehicleContext=null;

function openAddVehicleModal(secId,colId,folderId=null,trId='t1'){
  _addVehicleContext={secId,colId,folderId,trId};
  document.getElementById('avName').value='';
  setTypePicker('avTypeBtn','avTypeDropdown','avType','');
  const _avSt=document.getElementById('avSubType'); if(_avSt) _avSt.value='';
  document.getElementById('avManufacturer').value='';
  document.getElementById('avBR').value='1.0';
  document.getElementById('avType').value='';
  _avEditImages=[];
  _avEditWeapons=[];
  renderImgEditorList('avImgList',_avEditImages,()=>renderImgEditorList('avImgList',_avEditImages,()=>{},'avEditImgFileHidden'),'avEditImgFileHidden');
  renderWeaponEditorList('avWeaponList',_avEditWeapons,()=>renderWeaponEditorList('avWeaponList',_avEditWeapons,()=>{}));
  document.getElementById('avDesc').value='';
  document.getElementById('avPremium').value='false';
  document.getElementById('avReserve').checked=false;
  const col=state.columns.find(c=>c.id===colId);
  document.getElementById('avColor').value=col?.type==='premium'?'#3d361c':'#314654';
  openModal('addVehicleModal');
  document.getElementById('avName').focus();
}

let _avEditImages=[];

function bindAddVehicleModal(){
  document.getElementById('avPresetResearch').addEventListener('click',()=>{ document.getElementById('avColor').value='#314654'; });
  document.getElementById('avPresetPremium').addEventListener('click',()=>{  document.getElementById('avColor').value='#3d361c'; });

  document.getElementById('avAddImgBtn').addEventListener('click',()=>{
    _avEditImages.push({src:'',caption:''});
    renderImgEditorList('avImgList',_avEditImages,()=>renderImgEditorList('avImgList',_avEditImages,()=>{},'avEditImgFileHidden'),'avEditImgFileHidden');
  });

  document.getElementById('avAddWeaponBtn').addEventListener('click',()=>{
    _avEditWeapons.push({qty:1,name:''});
    renderWeaponEditorList('avWeaponList',_avEditWeapons,()=>renderWeaponEditorList('avWeaponList',_avEditWeapons,()=>{}));
  });

  document.getElementById('avEditImgFileHidden').addEventListener('change',async function(){
    if(!this.files.length) return;
    const [result]=await readFilesAsDataURLs([this.files[0]]);
    if(_pendingUploadIndex>=0 && _pendingUploadIndex<_avEditImages.length){
      _avEditImages[_pendingUploadIndex].src=result.src;
    }
    this.value='';
    _pendingUploadIndex=-1;
    renderImgEditorList('avImgList',_avEditImages,()=>renderImgEditorList('avImgList',_avEditImages,()=>{},'avEditImgFileHidden'),'avEditImgFileHidden');
  });

  document.getElementById('avSaveBtn').addEventListener('click',async()=>{
    const name=document.getElementById('avName').value.trim();
    if(!name){alert('Name is required.');return;}
    const ctx=_addVehicleContext; if(!ctx) return;

    const vId=uid('v');
    const images=_avEditImages.filter(img=>img.src&&img.src.trim());

    const v={
      id:vId, name,
      manufacturer:document.getElementById('avManufacturer').value.trim(),
      br:document.getElementById('avBR').value,
      reserve:document.getElementById('avReserve').checked,
      type:document.getElementById('avType').value,
      subType:document.getElementById('avSubType').value.trim(),
      images,
      weapons:_avEditWeapons.filter(w=>w.name&&w.name.trim()),
      desc:document.getElementById('avDesc').value,
      premium:ctx.colId?state.columns.find(c=>c.id===ctx.colId)?.type==='premium'||false:false,
      color:document.getElementById('avColor').value,
    };

    state.vehicles[vId]=v;
    if(ctx.folderId){
      state.folders[ctx.folderId].vehicleIds.push(vId);
    } else {
      if(!state.grid[ctx.secId]) state.grid[ctx.secId]={};
      if(!state.grid[ctx.secId][ctx.colId]) state.grid[ctx.secId][ctx.colId]={};
      const trId=ctx.trId||'t1';
      if(!state.grid[ctx.secId][ctx.colId][trId]) state.grid[ctx.secId][ctx.colId][trId]=[];
      state.grid[ctx.secId][ctx.colId][trId].push({type:'vehicle',id:vId});
    }
    closeModal('addVehicleModal');
    renderAll();saveToStorage();
  });
}

// ─────────────────────────────────────────────
// CONNECTION MODAL
// ─────────────────────────────────────────────
let _connVehicleId=null;

function openConnectionModal(vid){
  _connVehicleId=vid;
  const v=state.vehicles[vid];
  if(!v){ console.warn('openConnectionModal: vehicle not found', vid); return; }
  try{
  document.getElementById('connFromName').textContent=v.name;

  // Get current connected IDs (support both old {next,branch} and new {targets:[]} format)
  const conn=state.connections[vid]||{};
  const currentTargets=new Set(conn.targets||[conn.next,conn.branch].filter(Boolean));

  // Build checkbox list grouped by rank
  const list=document.getElementById('connCheckList');
  list.innerHTML='';

  // Build a map: rankName → [vehicle]
  const rankMap=[];
  state.sections.forEach(sec=>{
    const vInSec=[];
    const colGrid=state.grid[sec.id]||{};
    Object.values(colGrid).forEach(trackMap=>{
      if(!trackMap||typeof trackMap!=='object') return;
      Object.values(trackMap).forEach(slots=>{
        if(!Array.isArray(slots)) return;
        slots.forEach(entry=>{
          if(entry?.type==='vehicle' && entry.id!==vid){
            const vv=state.vehicles[entry.id];
            if(vv) vInSec.push(vv);
          }
          if(entry?.type==='folder'){
            const f=state.folders[entry.id];
            if(f) f.vehicleIds.forEach(fvid=>{
              if(fvid===vid) return;
              const vv=state.vehicles[fvid];
              if(vv) vInSec.push(vv);
            });
          }
        });
      });
    });
    // Deduplicate within section
    const seen=new Set();
    const deduped=vInSec.filter(vv=>{ if(seen.has(vv.id)) return false; seen.add(vv.id); return true; });
    if(deduped.length) rankMap.push({secName:sec.name, vehicles:deduped});
  });

  if(!rankMap.length){
    const empty=document.createElement('div');
    empty.style.cssText='padding:10px 14px;color:var(--text-dim);font-size:13px';
    empty.textContent='No other vehicles found.';
    list.appendChild(empty);
  } else {
    rankMap.forEach(({secName,vehicles})=>{
      // Rank header
      const hdr=document.createElement('div'); hdr.className='conn-rank-header';
      hdr.textContent=secName; list.appendChild(hdr);
      // Vehicles as checkboxes
      vehicles.forEach(vv=>{
        const row=document.createElement('label'); row.className='conn-check-row';
        const cb=document.createElement('input'); cb.type='checkbox'; cb.value=vv.id;
        cb.checked=currentTargets.has(vv.id);
        const span=document.createElement('span');
        span.textContent=vv.name+(vv.br?' ('+parseFloat(vv.br).toFixed(1)+')':'');
        row.appendChild(cb); row.appendChild(span);
        // Per-connection color picker (prevents label-click toggle via stopPropagation)
        const cp=document.createElement('input'); cp.type='color'; cp.className='conn-row-color';
        cp.dataset.targetId=vv.id;
        const existingColors=conn.colors||[];
        const tgtsArr=conn.targets||[conn.next,conn.branch].filter(Boolean);
        const existingIdx=tgtsArr.indexOf(vv.id);
        cp.value=(existingIdx>=0&&existingColors[existingIdx])||state.arrowColor||'#6a8ea0';
        cp.addEventListener('click',e=>e.stopPropagation());
        row.appendChild(cp);
        list.appendChild(row);
      });
    });
  }

  } catch(err){ console.error('openConnectionModal error:', err); }
  openModal('connectionModal');
}

function bindConnectionModal(){
  document.getElementById('connSaveBtn').addEventListener('click',()=>{
    if(!_connVehicleId) return;
    const checked=[...document.querySelectorAll('#connCheckList input[type=checkbox]:checked')]
                    .map(cb=>cb.value);
    if(checked.length===0){
      delete state.connections[_connVehicleId];
    } else {
      // Collect per-target colors from color pickers
      const colorInputs=document.querySelectorAll('#connCheckList .conn-row-color');
      const colorMap={};
      colorInputs.forEach(inp=>{ if(inp.dataset.targetId) colorMap[inp.dataset.targetId]=inp.value; });
      const colors=checked.map(id=>colorMap[id]||null);
      state.connections[_connVehicleId]={
        targets: checked,
        colors,
        next:    checked[0]||null,
        branch:  checked[1]||null,
      };
    }
    closeModal('connectionModal');
    renderAll();saveToStorage();
  });
  document.getElementById('connRemoveBtn').addEventListener('click',()=>{
    if(!_connVehicleId) return;
    delete state.connections[_connVehicleId];
    closeModal('connectionModal');
    renderAll();saveToStorage();
  });
}

// ─────────────────────────────────────────────
// ADD RANK SECTION
// ─────────────────────────────────────────────
function bindAddSectionModal(){
  document.getElementById('btnAddSection').addEventListener('click',()=>{
    document.getElementById('sectionName').value=`Rank ${toRoman(state.sections.length+1)}`;
    openModal('addSectionModal');
    document.getElementById('sectionName').focus();
  });
  document.getElementById('sectionSaveBtn').addEventListener('click',()=>{
    const name=document.getElementById('sectionName').value.trim(); if(!name) return;
    const id=uid('s');
    state.sections.push({id,name});
    state.grid[id]={};
    state.columns.forEach(col=>{
      state.grid[id][col.id]={};
      (col.tracks||[{id:'t1'}]).forEach(tr=>{ state.grid[id][col.id][tr.id]=[]; });
    });
    closeModal('addSectionModal');
    renderAll();saveToStorage();
  });
}

function toRoman(n){
  const vals=[1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms=['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let r=''; vals.forEach((v,i)=>{while(n>=v){r+=syms[i];n-=v;}}); return r;
}

// ─────────────────────────────────────────────
// ADD COLUMN
// ─────────────────────────────────────────────
function bindAddColumnModal(){
  document.getElementById('btnAddColumn').addEventListener('click',()=>{
    document.getElementById('colName').value='';
    openModal('addColumnModal');
    document.getElementById('colName').focus();
  });
  document.getElementById('colSaveBtn').addEventListener('click',()=>{
    const name=document.getElementById('colName').value.trim(); if(!name) return;
    const type=document.getElementById('colType').value;
    const id=uid('c');
    state.columns.push({id,name,type,tracks:[{id:'t1',name:''}]});
    state.sections.forEach(sec=>{
      if(!state.grid[sec.id]) state.grid[sec.id]={};
      if(!state.grid[sec.id][id]) state.grid[sec.id][id]={t1:[]};
    });
    closeModal('addColumnModal');
    renderAll();saveToStorage();
  });
}

// ─────────────────────────────────────────────
// EXPORT / IMPORT
// ─────────────────────────────────────────────
function bindExportImport(){
  // Export dropdown toggle
  document.getElementById('btnExport').addEventListener('click',e=>{
    e.stopPropagation();
    const dd=document.getElementById('exportDropdown');
    dd.classList.toggle('open');
  });
  document.addEventListener('click',()=>document.getElementById('exportDropdown')?.classList.remove('open'));

  document.getElementById('btnExportJson').addEventListener('click',async()=>{
    document.getElementById('exportDropdown').classList.remove('open');
    const safeName=(state.title||'tech-tree').replace(/[^a-zA-Z0-9_\-. ]/g,'_');
    const content=JSON.stringify(state,null,2);
    if(window.showSaveFilePicker){
      try{
        const fh=await window.showSaveFilePicker({
          suggestedName:safeName+'.json',
          types:[{description:'JSON file',accept:{'application/json':['.json']}}],
        });
        const w=await fh.createWritable(); await w.write(content); await w.close(); return;
      }catch(e){ if(e.name==='AbortError') return; }
    }
    const blob=new Blob([content],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=safeName+'.json'; a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('btnExportPng').addEventListener('click',async()=>{
    document.getElementById('exportDropdown').classList.remove('open');
    const safeName=(state.title||'tech-tree').replace(/[^a-zA-Z0-9_\-. ]/g,'_');
    const box=document.getElementById('treeInnerBox');
    if(!box){ alert('Cannot find tree element.'); return; }
    // Temporarily enter screenshot mode for clean export
    const wasSs=screenshotMode;
    if(!wasSs){ screenshotMode=true; document.body.classList.add('screenshot-mode'); renderAll(); await new Promise(r=>setTimeout(r,120)); }
    try{
      if(window.html2canvas){
        const canvas=await html2canvas(box,{backgroundColor:'#242e33',scale:2,useCORS:true,allowTaint:true,logging:false});
        canvas.toBlob(async blob=>{
          if(window.showSaveFilePicker){
            try{
              const fh=await window.showSaveFilePicker({suggestedName:safeName+'.png',types:[{description:'PNG image',accept:{'image/png':['.png']}}]});
              const w=await fh.createWritable(); await w.write(blob); await w.close(); return;
            }catch(e){ if(e.name==='AbortError') return; }
          }
          const url=URL.createObjectURL(blob);
          const a=document.createElement('a'); a.href=url; a.download=safeName+'.png'; a.click();
          URL.revokeObjectURL(url);
        },'image/png');
      } else { alert('html2canvas not loaded — PNG export is unavailable.'); }
    } finally {
      if(!wasSs){ screenshotMode=false; document.body.classList.remove('screenshot-mode'); renderAll(); }
    }
  });

  document.getElementById('exportConfirmBtn').addEventListener('click',async()=>{
    const filename=(document.getElementById('exportFileName').value.trim()||'tech-tree')
                    .replace(/\.json$/i,'')+'.json';
    const content=JSON.stringify(state,null,2);
    // Use File System Access API for directory picker if available
    if(window.showSaveFilePicker){
      try{
        const fh=await window.showSaveFilePicker({
          suggestedName:filename,
          types:[{description:'JSON file',accept:{'application/json':['.json']}}],
        });
        const writable=await fh.createWritable();
        await writable.write(content);
        await writable.close();
        closeModal('exportModal');
        return;
      }catch(e){ if(e.name==='AbortError') return; /* fall through */ }
    }
    // Fallback: standard download
    const blob=new Blob([content],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a'); a.href=url; a.download=filename; a.click();
    URL.revokeObjectURL(url);
    closeModal('exportModal');
  });
  document.getElementById('btnImport').addEventListener('click',()=>document.getElementById('importFile').click());
  document.getElementById('importFile').addEventListener('change',e=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const d=JSON.parse(ev.target.result);
        state.columns=d.columns||state.columns;
        state.sections=d.sections||state.sections;
        state.vehicles=d.vehicles||{};
        state.folders=d.folders||{};
        state.grid=d.grid||{};
        state.connections=d.connections||{};
        // Migrate old single-image format
        Object.values(state.vehicles).forEach(v=>{
          if(!v.images){ v.images=v.img?[{src:v.img,caption:''}]:[]; delete v.img; }
        });
        syncGrid(); renderAll(); saveToStorage();
        const _ti=document.getElementById('treeTitleInput'); if(_ti) _ti.value=state.title||'';
      }catch{alert('Invalid JSON file.');}
    };
    reader.readAsText(file);
    e.target.value='';
  });
}

// ─────────────────────────────────────────────
// MODAL UTILITIES
// ─────────────────────────────────────────────
function openModal(id){ const el=document.getElementById(id); if(el) el.classList.add('open'); }
function closeModal(id){ const el=document.getElementById(id); if(el) el.classList.remove('open'); }

function bindModalCloseButtons(){
  document.querySelectorAll('.modal-close').forEach(btn=>{
    btn.addEventListener('click',()=>{ const m=btn.getAttribute('data-modal'); if(m) closeModal(m); });
  });
  document.querySelectorAll('.modal-backdrop').forEach(bd=>{
    bd.addEventListener('click',e=>{ if(e.target===bd) bd.classList.remove('open'); });
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      document.querySelectorAll('.modal-backdrop.open').forEach(el=>el.classList.remove('open'));
      hideContextMenu();
    }
  });
}

// ─────────────────────────────────────────────
// CONTEXT MENU
// ─────────────────────────────────────────────
function showContextMenu(e,items){
  const menu=document.getElementById('contextMenu');
  const list=document.getElementById('contextMenuList');
  list.innerHTML='';
  items.forEach(item=>{
    if(item.sep){ const li=document.createElement('li');li.className='ctx-sep';list.appendChild(li);return; }
    const li=document.createElement('li'); li.textContent=item.label;
    if(item.cls) li.classList.add(item.cls);
    li.addEventListener('click',()=>{hideContextMenu();item.action();});
    list.appendChild(li);
  });
  const x=Math.min(e.clientX,window.innerWidth-190);
  const y=Math.min(e.clientY,window.innerHeight-(items.length*30+20));
  menu.style.left=x+'px'; menu.style.top=y+'px';
  menu.classList.add('open');
}
function hideContextMenu(){ document.getElementById('contextMenu').classList.remove('open'); }
function bindContextMenuDismiss(){
  document.addEventListener('click',e=>{ if(!e.target.closest('#contextMenu')) hideContextMenu(); });
  document.addEventListener('contextmenu',e=>{
    if(!e.target.closest('.vehicle-card')&&!e.target.closest('.folder-open-card')) hideContextMenu();
  });
}
