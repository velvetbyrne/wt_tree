// SEARCH & FILTER
// ─────────────────────────────────────────────
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
  // Register the outside-click closer once (function may be re-run after dev types load)
  if(!window._typeFilterOutsideBound){
    window._typeFilterOutsideBound=true;
    document.addEventListener('click',()=>document.getElementById('typeFilterDropdown')?.classList.remove('open'));
  }
}

// ── FUZZY MATCHING ──
// Per query token, in order of cost:
//   1. substring of the compacted name ("bf109" matches "Bf 109")
//   2. typo-tolerant approximate substring (Sellers; 1 error for 4-6 chars, 2 for 7+)
//   3. in-order abbreviation inside a single word ("spt" -> "Spitfire")
const _norm = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const _NONWORD = /[^\p{L}\p{N}]+/u;
let _searchTokens = [];
let _searchTimer = null;

function _approxIncludes(text, pat, k){
  const m = pat.length;
  const col = new Array(m+1);
  for(let i=0;i<=m;i++) col[i]=i;
  for(let j=0;j<text.length;j++){
    let diag = col[0]; col[0] = 0;
    for(let i=1;i<=m;i++){
      const up = col[i];
      col[i] = Math.min(col[i]+1, col[i-1]+1, diag + (pat[i-1]===text[j]?0:1));
      diag = up;
    }
    if(col[m] <= k) return true;
  }
  return false;
}
function _subseq(word, t){
  let i=0;
  for(let j=0;j<word.length;j++){ if(word[j]===t[i] && ++i===t.length) return true; }
  return false;
}
function _tokenMatches(tok, words, compact){
  if(compact.includes(tok)) return true;
  if(tok.length < 3) return false;
  const k = tok.length >= 7 ? 2 : tok.length >= 4 ? 1 : 0;
  if(k && _approxIncludes(compact, tok, k)) return true;
  return words.some(w => w[0]===tok[0] && _subseq(w, tok));
}

function bindSearch(){
  const inp = document.getElementById('searchInput');
  if(!inp) return;
  buildTypeFilterDropdown();
  const run = ()=>{
    _searchTokens = _norm(inp.value).split(_NONWORD).filter(Boolean);
    applySearchHighlight();
  };
  inp.addEventListener('input', ()=>{
    clearTimeout(_searchTimer);
    _searchTimer = setTimeout(run, 120); // debounce typing
  });
  inp.addEventListener('keydown', e=>{
    if(e.key==='Escape'){
      inp.value=''; _searchTokens=[]; _filterTypes.clear();
      buildTypeFilterDropdown(); // resets checkboxes + button label
      applySearchHighlight();
    }
  });
}

let _searchMatched = null;   // Set of matching vehicle ids, or null when no search is active
function searchClassFor(vid){
  if(!_searchMatched) return '';
  return _searchMatched.has(vid) ? 'search-highlight' : 'search-dim';
}
function folderSearchClass(f){
  if(!_searchMatched) return '';
  return (f.vehicleIds||[]).some(id=>_searchMatched.has(id)) ? 'search-highlight' : 'search-dim';
}

function applySearchHighlight(){
  document.querySelectorAll('.search-highlight,.search-dim').forEach(el=>{
    el.classList.remove('search-highlight','search-dim');
  });
  const active = _searchTokens.length>0 || _filterTypes.size>0;
  document.body.classList.toggle('searching', active);
  const bar = document.getElementById('searchCountBar');
  if(!active){ _searchMatched = null; if(bar) bar.textContent=''; return; }

  // Evaluate each vehicle once; reuse for cards, folders and the count.
  const matched = new Set();
  for(const id in state.vehicles){
    if(vehicleMatchesSearch(state.vehicles[id])) matched.add(id);
  }
  _searchMatched = matched;
  if(bar){
    const n = matched.size;
    bar.innerHTML = `<strong>${n}</strong> ${n===1?'Vehicle':'Vehicles'}`;
  }

  document.querySelectorAll('[data-vehicle-id]').forEach(el=>{
    const hit = matched.has(el.dataset.vehicleId);
    el.classList.toggle('search-highlight', hit);
    el.classList.toggle('search-dim', !hit);
  });
  document.querySelectorAll('[data-folder-id]').forEach(el=>{
    const f = state.folders[el.dataset.folderId]; if(!f) return;
    const hit = (f.vehicleIds||[]).some(id=>matched.has(id));
    el.classList.toggle('search-highlight', hit);
    el.classList.toggle('search-dim', !hit);
  });
}

function vehicleMatchesSearch(v){
  if(!v) return false;
  if(_filterTypes.size && !(v.type && _filterTypes.has(v.type))) return false;
  if(!_searchTokens.length) return true;
  const words = _norm([v.prefix, v.manufacturer, v.name].filter(Boolean).join(' '))
                  .split(_NONWORD).filter(Boolean);
  const compact = words.join('');
  return _searchTokens.every(t => _tokenMatches(t, words, compact));
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


// (storage/save/load/reset functions live in storage.js — not duplicated here)
