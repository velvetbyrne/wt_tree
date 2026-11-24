// STORAGE — IndexedDB (no 5 MB cap), localStorage fallback + migration
// ─────────────────────────────────────────────
const IDB_DB = 'wt_tech_tree_maker', IDB_STORE = 'kv', IDB_KEY = 'state_v3';
let _idbPromise = null;
function idbOpen(){
  if(_idbPromise) return _idbPromise;
  _idbPromise = new Promise((res,rej)=>{
    if(!window.indexedDB){ rej(new Error('IndexedDB unavailable')); return; }
    const r = indexedDB.open(IDB_DB,1);
    r.onupgradeneeded = ()=>r.result.createObjectStore(IDB_STORE);
    r.onsuccess = ()=>res(r.result);
    r.onerror   = ()=>rej(r.error);
    r.onblocked = ()=>rej(new Error('IndexedDB blocked'));
  });
  return _idbPromise;
}
async function idbGet(key){
  const db = await idbOpen();
  return new Promise((res,rej)=>{
    const q = db.transaction(IDB_STORE,'readonly').objectStore(IDB_STORE).get(key);
    q.onsuccess = ()=>res(q.result);
    q.onerror   = ()=>rej(q.error);
  });
}
async function idbSet(key,val){
  const db = await idbOpen();
  return new Promise((res,rej)=>{
    const tx = db.transaction(IDB_STORE,'readwrite');
    tx.objectStore(IDB_STORE).put(val,key);
    tx.oncomplete = ()=>res();
    tx.onerror = tx.onabort = ()=>rej(tx.error);
  });
}

// Debounced: coalesces rapid edits into one write.
let _saveTimer = null, _legacyCleared = false;
function saveToStorage(){
  if(_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(_saveToStorageNow, 400);
}
async function _saveToStorageNow(){
  _saveTimer = null;
  try{
    await idbSet(IDB_KEY, state);
    if(!_legacyCleared){
      _legacyCleared = true;
      try{ localStorage.removeItem('wt_tree_state_v3'); }catch(e){}
    }
  }catch(e){
    try{ localStorage.setItem('wt_tree_state_v3', JSON.stringify(state)); }catch(_){}
  }
}
function flushSaveToStorage(){
  if(_saveTimer){ clearTimeout(_saveTimer); _saveToStorageNow(); }
}
window.addEventListener('beforeunload', flushSaveToStorage);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') flushSaveToStorage(); });

// Renamed vehicle types (old name -> new name). Lives HERE, next to the code
// that uses it, so storage never depends on another file defining it.
// Applied to saved vehicles on load/import; also renames the entry in
// VEHICLE_TYPES itself if an older types.js still has the old name.
function migrateVehicleTypes(){
  const renames = { 'Fleet Oiler':'Auxiliary', 'Tank Destroyer':'SPG' };
  if(typeof VEHICLE_TYPES !== 'undefined'){
    for(const oldName in renames){
      const newName = renames[oldName];
      const t = VEHICLE_TYPES.find(x=>x.name===oldName);
      if(t && !VEHICLE_TYPES.some(x=>x.name===newName)) t.name = newName;
    }
  }
  Object.values(state.vehicles).forEach(v=>{
    if(v && renames[v.type]) v.type = renames[v.type];
  });
}

// Applies a saved/imported tree object onto the live `state`, normalising
// every older format (single-image vehicles, flat grids, missing tracks,
// renamed vehicle types, missing optional fields).
function applyLoadedState(d){
  state.columns      = Array.isArray(d.columns)  && d.columns.length  ? d.columns  : state.columns;
  state.sections     = Array.isArray(d.sections) && d.sections.length ? d.sections : state.sections;
  state.vehicles     = d.vehicles     || {};
  state.folders      = d.folders      || {};
  state.grid         = d.grid         || {};
  state.connections  = d.connections  || {};
  state.blockedLinks = d.blockedLinks || {};
  state.viewOptions  = d.viewOptions  || {};
  state.arrowColor   = d.arrowColor   || state.arrowColor || '#6a8ea0';
  state.title        = d.title        || '';
  Object.values(state.vehicles).forEach(v=>{
    if(!v) return;
    if(!v.images){ v.images = v.img ? [{src:v.img, caption:''}] : []; delete v.img; }
    if(v.weapons) v.weapons = v.weapons.map(w=>({secondary:false,...w}));
  });
  Object.values(state.folders).forEach(f=>{ if(f && !Array.isArray(f.vehicleIds)) f.vehicleIds=[]; });
  migrateVehicleTypes();
  migrateGrid();
  syncGrid();
  [...state.columns.map(c=>c.id), ...state.sections.map(s=>s.id),
   ...Object.keys(state.vehicles), ...Object.keys(state.folders)].forEach(id=>{
     const n = parseInt((String(id).split('_')[1])||'0');
     if(!isNaN(n) && n>=nextId) nextId = n+1;
   });
  _rankRange.clear();
}

async function loadFromStorage(){
  let d = null;
  try{ d = await idbGet(IDB_KEY); }catch(e){}
  if(!d){
    try{
      const raw = localStorage.getItem('wt_tree_state_v3') || localStorage.getItem('wt_tree_state');
      if(raw) d = JSON.parse(raw);
    }catch(e){}
  }
  if(!d) return;
  try{ applyLoadedState(d); }
  catch(e){ console.error('[storage] could not load saved tree:', e); }
}

function syncGrid(){
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

function migrateGrid(){
  state.columns.forEach(col=>{
    if(!col.tracks||!col.tracks.length) col.tracks=[{id:'t1',name:''}];
  });
  state.sections.forEach(sec=>{
    if(!state.grid[sec.id]) return;
    state.columns.forEach(col=>{
      const cell=state.grid[sec.id][col.id];
      if(Array.isArray(cell)) state.grid[sec.id][col.id]={t1:cell};
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
      grid:{},
      connections:{}, blockedLinks:{}, viewOptions:state.viewOptions||{},
      arrowColor: state.arrowColor||'#6a8ea0', title:'',
    };
    syncGrid();
    nextId=1;
    _rankRange.clear();
    const td=document.getElementById('treeTitleDisplay'); if(td) td.textContent='Tech Tree Name';
    saveToStorage();
    renderAll();
  });
}

let hideLabelsMode = false;

// ─────────────────────────────────────────────
// INIT
// Every step is isolated so one failure can never stop the others from
// running (previously a single exception left the header/Dev Tools dead).
// ─────────────────────────────────────────────
function _step(name, fn){
  try{ fn(); }catch(e){ console.error('[init] '+name+' failed:', e); }
}

function bindTreeTitle(){
  const _titleDisplay=document.getElementById('treeTitleDisplay');
  const _titleInput=document.getElementById('treeTitleInput');
  if(!_titleDisplay || !_titleInput) return;
  const _syncTitle=()=>{ _titleDisplay.textContent=state.title||'Tech Tree Name'; };
  _syncTitle();
  _titleDisplay.addEventListener('dblclick',()=>{
    _titleInput.value=state.title||'';
    _titleDisplay.style.display='none';
    _titleInput.style.display='';
    _titleInput.focus(); _titleInput.select();
  });
  const _commitTitle=()=>{
    state.title=_titleInput.value.trim();
    saveToStorage();
    _syncTitle();
    _titleInput.style.display='none';
    _titleDisplay.style.display='';
  };
  _titleInput.addEventListener('blur',_commitTitle);
  _titleInput.addEventListener('keydown',e=>{if(e.key==='Enter')_commitTitle();if(e.key==='Escape'){_titleInput.style.display='none';_titleDisplay.style.display='';} });
}

document.addEventListener('DOMContentLoaded', async () => {
  // Bind every control FIRST (none of them depend on the saved tree), so the
  // UI is responsive even while the tree loads from IndexedDB.
  _step('modal close buttons', bindModalCloseButtons);
  _step('context menu',        bindContextMenuDismiss);
  _step('vehicle modal',       bindVehicleModal);
  _step('add-vehicle modal',   bindAddVehicleModal);
  _step('connection modal',    bindConnectionModal);
  _step('add-rank modal',      bindAddSectionModal);
  _step('add-column modal',    bindAddColumnModal);
  _step('export/import',       bindExportImport);
  _step('reset',               bindReset);
  _step('screenshot',          bindScreenshot);
  _step('hide labels',         bindHideLabels);
  _step('hide headers',        bindSsHideHeaders);
  _step('folder rename',       bindFolderRenameModal);
  _step('virtual scroll',      bindVirtualScroll);

  await loadFromStorage();

  _step('type pickers',  initTypePickers);
  _step('view options',  applyViewOptionsToUI);
  _step('arrow colour',  bindArrowColor);
  _step('search',        bindSearch);
  _step('stats',         bindStats);
  _step('tree title',    bindTreeTitle);
  _step('first render',  renderAll);
  _step('dev tools',     ()=>{ if(window.WT_DEV && window.WT_DEV.mount) window.WT_DEV.mount(); });
});
