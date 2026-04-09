// SEARCH & FILTER
// ─────────────────────────────────────────────
let _searchQuery = '';
const _filterTypes = new Set(); // selected type filters

function buildTypeFilterDropdown(){
  const wrap = document.getElementById('searchTypeFilter');
  if(!wrap) return;
  wrap.innerHTML='';
  wrap.style.display='';

  // Button
  const btn=document.createElement('button');
  btn.className='btn btn-secondary type-filter-btn'; btn.id='typeFilterBtn';
  btn.textContent='Filter by type ▾';
  wrap.appendChild(btn);

  // Dropdown
  const dd=document.createElement('div');
  dd.className='type-filter-dropdown'; dd.id='typeFilterDropdown';

  let lastCat='';
  VEHICLE_TYPES.forEach(t=>{
    if(t.cat!==lastCat){
      lastCat=t.cat;
      const hdr=document.createElement('div'); hdr.className='type-picker-header';
      hdr.textContent=t.cat; dd.appendChild(hdr);
    }
    const row=document.createElement('label'); row.className='type-filter-row';
    const cb=document.createElement('input'); cb.type='checkbox'; cb.value=t.name;
    cb.addEventListener('change',()=>{
      if(cb.checked) _filterTypes.add(t.name);
      else _filterTypes.delete(t.name);
      const count=_filterTypes.size;
      btn.textContent=count?`Filter by type (${count}) ▾`:'Filter by type ▾';
      applySearchHighlight();
    });
    const ico=document.createElement('span'); ico.innerHTML=typeIcon(t);
    const lbl=document.createElement('span'); lbl.style.color=t.color; lbl.textContent=t.name;
    row.appendChild(cb); row.appendChild(ico); row.appendChild(lbl);
    dd.appendChild(row);
  });
  wrap.appendChild(dd);

  btn.addEventListener('click',e=>{e.stopPropagation(); dd.classList.toggle('open');});
  dd.addEventListener('click',e=>e.stopPropagation());
  document.addEventListener('click',()=>dd.classList.remove('open'));
}

function bindSearch(){
  const inp = document.getElementById('searchInput');
  if(!inp) return;
  buildTypeFilterDropdown();
  inp.addEventListener('input', ()=>{
    _searchQuery = inp.value.trim().toLowerCase();
    applySearchHighlight();
  });
  inp.addEventListener('keydown', e=>{
    if(e.key==='Escape'){ inp.value=''; _searchQuery=''; _filterTypes.clear(); applySearchHighlight(); }
  });
}

function applySearchHighlight(){
  // Remove all existing highlights
  document.querySelectorAll('.search-highlight,.search-dim').forEach(el=>{
    el.classList.remove('search-highlight','search-dim');
  });
  if(!_searchQuery && _filterTypes.size===0) return;

  // Check every vehicle card
  document.querySelectorAll('[data-vehicle-id]').forEach(cardEl=>{
    const vid = cardEl.dataset.vehicleId;
    const v = state.vehicles[vid]; if(!v) return;
    const matches = vehicleMatchesSearch(v);
    cardEl.classList.toggle('search-highlight', matches);
    cardEl.classList.toggle('search-dim', !matches);
  });
  // Also check folder closed cards — highlight if any vehicle in folder matches
  document.querySelectorAll('[data-folder-id]').forEach(cardEl=>{
    const fid = cardEl.dataset.folderId;
    const f = state.folders[fid]; if(!f) return;
    const anyMatch = (f.vehicleIds||[]).some(vid=>vehicleMatchesSearch(state.vehicles[vid]));
    cardEl.classList.toggle('search-highlight', anyMatch);
    cardEl.classList.toggle('search-dim', !anyMatch);
  });
}

function vehicleMatchesSearch(v){
  if(!v) return false;
  const typeMatch = _filterTypes.size===0 || (v.type && _filterTypes.has(v.type));
  if(!_searchQuery) return typeMatch;
  const hay = [v.prefix, v.manufacturer, v.name].filter(Boolean).join(' ').toLowerCase();
  return typeMatch && hay.includes(_searchQuery);
}


// ─────────────────────────────────────────────
// STATISTICS
// ─────────────────────────────────────────────
function bindStats(){
  document.getElementById('btnStats').addEventListener('click',()=>{
    showStats();
    openModal('statsModal');
  });
}

function showStats(){
  const content = document.getElementById('statsContent');
  if(!content) return;

  const all  = Object.values(state.vehicles);
  const prem = all.filter(v=>v.premium===true||v.premium==='true');
  const res  = all.filter(v=>!(v.premium===true||v.premium==='true'));

  // vehicleId → rank name
  const rankOf = {};
  state.sections.forEach(sec=>{
    Object.values(state.grid[sec.id]||{}).forEach(tm=>{
      if(!tm||typeof tm!=='object') return;
      Object.values(tm).forEach(slots=>{
        if(!Array.isArray(slots)) return;
        slots.forEach(e=>{
          if(e?.type==='vehicle') rankOf[e.id]=sec.name;
          if(e?.type==='folder'){
            const f=state.folders[e.id];
            if(f)(f.vehicleIds||[]).forEach(vid=>{ rankOf[vid]=sec.name; });
          }
        });
      });
    });
  });

  function countByRank(vs){
    const m={};
    vs.forEach(v=>{ const r=rankOf[v.id]||'?'; m[r]=(m[r]||0)+1; });
    return state.sections.filter(s=>m[s.name]).map(s=>[s.name,m[s.name]]);
  }
  function countByType(vs){
    const m={};
    vs.forEach(v=>{ const t=v.type||'(No type)'; m[t]=(m[t]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]);
  }

  function makeTable(rows){ // rows = [[label,val,bold?], ...]
    const tbl=document.createElement('table');
    tbl.style.cssText='width:100%;border-collapse:collapse';
    rows.forEach(([label,val,bold])=>{
      const tr=document.createElement('tr');
      const td1=document.createElement('td'); td1.textContent=label;
      td1.style.cssText='color:var(--text-dim);padding:2px 0';
      const td2=document.createElement('td'); td2.textContent=val;
      td2.style.cssText='text-align:right;'+(bold?'font-weight:600;color:var(--text-bright)':'color:var(--text)');
      tr.appendChild(td1); tr.appendChild(td2); tbl.appendChild(tr);
    });
    return tbl;
  }

  function makeTypeTable(vs){
    const entries=countByType(vs); if(!entries.length) return null;
    const tbl=document.createElement('table');
    tbl.style.cssText='width:100%;border-collapse:collapse';
    entries.forEach(([type,count])=>{
      const tDef=VEHICLE_TYPES.find(x=>x.name===type);
      const color=tDef?tDef.color:'var(--text)';
      const tr=document.createElement('tr');
      const td1=document.createElement('td'); td1.style.cssText='padding:2px 0;color:'+color;
      if(tDef){
        const ico=document.createElementNS('http://www.w3.org/2000/svg','svg');
        ico.setAttribute('width','16'); ico.setAttribute('height','11');
        ico.setAttribute('viewBox','0 0 21 15');
        ico.style.cssText='vertical-align:middle;margin-right:4px';
        ico.innerHTML=tDef.svg; td1.appendChild(ico);
      }
      td1.appendChild(document.createTextNode(type));
      const td2=document.createElement('td'); td2.textContent=count;
      td2.style.cssText='text-align:right;font-weight:600;color:var(--text-bright)';
      tr.appendChild(td1); tr.appendChild(td2); tbl.appendChild(tr);
    });
    return tbl;
  }

  function makeTabber(tabLabels, tabContents){
    const wrap=document.createElement('div');
    const tabRow=document.createElement('div'); tabRow.className='stat-tabs';
    const paneWrap=document.createElement('div');
    tabLabels.forEach((lbl,i)=>{
      const tbl=tabContents[i]; if(!tbl) return;
      const btn=document.createElement('button'); btn.className='stat-tab'+(i===0?' active':'');
      btn.textContent=lbl;
      const pane=document.createElement('div'); pane.className='stat-pane'+(i===0?'':' hidden');
      if(i!==0) pane.classList.add('hidden');
      pane.appendChild(tbl);
      btn.addEventListener('click',()=>{
        tabRow.querySelectorAll('.stat-tab').forEach(b=>b.classList.remove('active'));
        paneWrap.querySelectorAll('.stat-pane').forEach(p=>p.classList.add('hidden'));
        btn.classList.add('active'); pane.classList.remove('hidden');
      });
      tabRow.appendChild(btn); paneWrap.appendChild(pane);
    });
    wrap.appendChild(tabRow); wrap.appendChild(paneWrap);
    return wrap;
  }

  function sectionTitle(text){
    const d=document.createElement('div');
    d.textContent=text;
    d.style.cssText='font-size:14px;font-weight:600;color:var(--text-bright);margin-bottom:6px;margin-top:12px;padding-top:12px;border-top:1px solid var(--border)';
    return d;
  }

  // Render
  content.innerHTML='';

  // Total vehicles
  const ttlTitle=document.createElement('div');
  ttlTitle.textContent='Total Vehicles';
  ttlTitle.style.cssText='font-size:14px;font-weight:600;color:var(--text-bright);margin-bottom:6px';
  content.appendChild(ttlTitle);
  content.appendChild(makeTable([
    ['All vehicles',       all.length,  true],
    ['Research vehicles',  res.length,  false],
    ['Premium vehicles',   prem.length, false],
  ]));

  // Combined By Rank + By Type in a single tabber (All / Research / Premium tabs)
  // Each tab pane shows By Rank table then By Type table
  const makeRankTable = vs=>{
    const entries=countByRank(vs); if(!entries.length) return null;
    return makeTable(entries.map(([r,c])=>[r,c,false]));
  };

  function makeCombinedPane(vs){
    const rankTbl = makeRankTable(vs);
    const typeTbl = makeTypeTable(vs);
    if(!rankTbl && !typeTbl) return null;
    const wrap = document.createElement('div');
    if(rankTbl){
      const lbl=document.createElement('div');
      lbl.textContent='By Rank';
      lbl.style.cssText='font-size:12px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin:8px 0 4px';
      wrap.appendChild(lbl);
      wrap.appendChild(rankTbl);
    }
    if(typeTbl){
      const lbl=document.createElement('div');
      lbl.textContent='By Type';
      lbl.style.cssText='font-size:12px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;margin:10px 0 4px';
      wrap.appendChild(lbl);
      wrap.appendChild(typeTbl);
    }
    return wrap;
  }

  const pAll  = makeCombinedPane(all);
  const pRes  = makeCombinedPane(res);
  const pPrem = makeCombinedPane(prem);
  if(pAll||pRes||pPrem){
    content.appendChild(sectionTitle('Breakdown'));
    content.appendChild(makeTabber(['All','Research','Premium'],[pAll,pRes,pPrem]));
  }
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
  bindSearch();
  bindStats();
  // Bind title input
  // Editable tree title
  const _titleDisplay=document.getElementById('treeTitleDisplay');
  const _titleInput=document.getElementById('treeTitleInput');
  if(_titleDisplay && _titleInput){
    const _syncTitle=()=>{
      _titleDisplay.textContent=state.title||'Tech Tree Name';
    };
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
