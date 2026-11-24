function bindScreenshot(){
  document.getElementById('btnScreenshot').addEventListener('click',()=>{
    screenshotMode = !screenshotMode;
    document.body.classList.toggle('screenshot-mode', screenshotMode);
    document.getElementById('btnScreenshot').classList.toggle('active', screenshotMode);
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
  document.getElementById('btnHideLabels').addEventListener('click',e=>{
    e.stopPropagation();
    document.getElementById('hideDropdown').classList.toggle('open');
  });
  document.getElementById('hideDropdown')?.addEventListener('click',e=>e.stopPropagation());
  document.addEventListener('click',()=>document.getElementById('hideDropdown')?.classList.remove('open'));

  function bindCb(id, cls, optKey){
    const cb=document.getElementById(id);
    if(!cb) return;
    cb.addEventListener('change',()=>{
      document.body.classList.toggle(cls, cb.checked);
      if(!state.viewOptions) state.viewOptions={};
      state.viewOptions[optKey]=cb.checked;
      saveToStorage();
    });
  }
  bindCb('cbHideLabels',   'hide-labels-mode',   'hideLabels');
  bindCb('cbHideArrows',   'hide-arrows-mode',   'hideArrows');
  bindCb('cbHideBR',       'hide-br-mode',       'hideBR');
  bindCb('cbHideTypeIco',  'hide-type-ico-mode', 'hideTypeIco');
  bindCb('cbHidePremium',  'hide-premium-mode',  'hidePremium');
}

function applyViewOptionsToUI(){
  const opts = state.viewOptions || {};
  const map = [
    ['cbHideLabels',  'hide-labels-mode',   'hideLabels'],
    ['cbHideArrows',  'hide-arrows-mode',   'hideArrows'],
    ['cbHideBR',      'hide-br-mode',       'hideBR'],
    ['cbHideTypeIco', 'hide-type-ico-mode', 'hideTypeIco'],
    ['cbHidePremium', 'hide-premium-mode',  'hidePremium'],
  ];
  map.forEach(([cbId,cls,key])=>{
    const cb=document.getElementById(cbId);
    const on=!!opts[key];
    if(cb) cb.checked=on;
    document.body.classList.toggle(cls,on);
  });
  if(window.WT_DEV && window.WT_DEV.syncUI) window.WT_DEV.syncUI();
}

function bindArrowColor(){
  const picker=document.getElementById('arrowColorPicker');
  if(!picker) return;
  picker.value = state.arrowColor||'#6a8ea0';
  picker.addEventListener('input',()=>{
    state.arrowColor=picker.value;
    saveToStorage();
    scheduleArrows();
  });
}

// ─────────────────────────────────────────────
// RENDER
//  renderAll()         — structural changes (columns/tracks/ranks/import/reset)
//  renderRankSection() — any change confined to one rank
// Both only materialise the slots near the viewport (see updateVirtualWindow).
// ─────────────────────────────────────────────
function renderAll(){
  invalidateLayout();
  renderColumnHeaders();
  renderRankSections();
  updateVirtualWindow();
  scheduleArrows();
}

function renderRankSection(secId, skipArrowRedraw=false){
  invalidateLayout(secId);
  const secEl = document.querySelector(`.rank-section[data-sec-id="${secId}"]`);
  const sec = state.sections.find(s=>s.id===secId);
  if(!secEl || !sec){ renderAll(); return; }
  secEl.replaceWith(makeSectionEl(sec));
  updateVirtualWindow();
  if(!skipArrowRedraw) scheduleArrows();
}

function renderRanks(...secIds){
  const seen=new Set();
  secIds.forEach(secId=>{
    if(!secId || seen.has(secId)) return;
    seen.add(secId);
    renderRankSection(secId, true);
  });
  scheduleArrows();
}

// ─────────────────────────────────────────────
// VIRTUAL WINDOW
// Every rank keeps its full height (spacers). Only the rows near the viewport
// have real slot DOM. Scrolling adds/removes slots at the edges of each track.
// ─────────────────────────────────────────────
let _vwRaf = 0;
let _vwDragging = false;

function scheduleVirtualUpdate(){
  if(_vwRaf) return;
  _vwRaf = requestAnimationFrame(()=>{ _vwRaf = 0; updateVirtualWindow(); });
}

// rows of a rank intersecting [ylo,yhi] (rank coordinates), or null
function rowsIn(L, ylo, yhi){
  const n = L.nRows;
  if(!n || yhi < 0 || ylo > L.rowTop[n]) return null;
  let a=0, b=n-1;
  while(a<b){ const m=(a+b)>>1; if(L.rowTop[m+1] > ylo) b=m; else a=m+1; }
  const lo = a;
  a = lo; b = n-1;
  while(a<b){ const m=(a+b+1)>>1; if(L.rowTop[m] <= yhi) a=m; else b=m-1; }
  return { lo, hi:a };
}

function quantizeRows(r, n){
  const CH = VW_CHUNK;
  return {
    lo: Math.max(0, Math.floor(r.lo/CH)*CH - CH),
    hi: Math.min(n-1, Math.ceil((r.hi+1)/CH)*CH - 1 + CH),
  };
}

function updateVirtualWindow(){
  if(_forceFullRender) return;
  const vh = window.innerHeight || 800;
  const B  = Math.max(500, vh*0.6);
  const jobs = [];
  const secById = new Map(state.sections.map(s=>[s.id,s]));

  document.querySelectorAll('#rankSections > .rank-section').forEach(secEl=>{
    const sec = secById.get(secEl.dataset.secId); if(!sec) return;
    const firstTrack = secEl.querySelector('.col-track'); if(!firstTrack) return;
    const L = getRankLayout(sec);
    const top = firstTrack.getBoundingClientRect().top;
    const need = rowsIn(L, -top - B,   vh - top + B);
    const keep = rowsIn(L, -top - 3*B, vh - top + 3*B);
    const cur  = _rankRange.get(sec.id) || null;
    let next = cur, change = false;

    if(!need){
      if(cur && !keep && !_vwDragging){ next = null; change = true; }
    } else if(!cur || need.lo < cur.lo || need.hi > cur.hi){
      next = quantizeRows(need, L.nRows);
      if(_vwDragging && cur) next = { lo:Math.min(next.lo,cur.lo), hi:Math.max(next.hi,cur.hi) };
      change = !cur || next.lo!==cur.lo || next.hi!==cur.hi;
    } else if(!_vwDragging && keep && (cur.lo < keep.lo || cur.hi > keep.hi)){
      next = quantizeRows(need, L.nRows);   // scrolled far away: free memory
      change = true;
    }
    if(change) jobs.push({ secEl, sec, next });
  });

  jobs.forEach(({secEl,sec,next})=>{
    _rankRange.set(sec.id, next);
    const lo = next ? next.lo : null, hi = next ? next.hi : null;
    secEl.querySelectorAll('.col-track').forEach(t=>applyTrackRows(t, lo, hi, !_vwDragging));
  });

  if(jobs.length || !arrowBandOK()) scheduleArrows();
}

function bindVirtualScroll(){
  // scroll doesn't bubble, so capture it (works for whichever element scrolls)
  document.addEventListener('scroll', scheduleVirtualUpdate, { capture:true, passive:true });
  window.addEventListener('resize', scheduleVirtualUpdate);
  // While dragging, only ever ADD slots so the drag source is never removed.
  document.addEventListener('dragstart', ()=>{ _vwDragging = true; }, true);
  const end = ()=>{ if(_vwDragging){ _vwDragging = false; scheduleVirtualUpdate(); } };
  document.addEventListener('dragend', end, true);
  document.addEventListener('drop', end, true);
}

// ─────────────────────────────────────────────
// Re-render just one vehicle card in place (field-only edits).
// ─────────────────────────────────────────────
function refreshVehicleCard(vid){
  const v = state.vehicles[vid]; if(!v) return;
  const el = document.querySelector(`[data-vehicle-id="${vid}"]`);
  if(el){
    const slotEl = el.closest('.slot');
    if(slotEl){
      const {secId,colId,trId,slotIndex} = slotEl.dataset;
      const fresh = makeVehicleCard(v, secId, colId, trId, Number(slotIndex));
      el.replaceWith(fresh);
      scheduleArrows();
      return;
    }
    const folderWrap = el.closest('[data-folder-id]');
    const fid = folderWrap?.dataset.folderId;
    const secId = fid ? findFolderRankId(fid) : null;
    if(secId){ renderRankSection(secId); return; }
  }
  // Not rendered (virtualized away) or inside a closed folder: patch its rank.
  const loc = findVehicleLocation(vid);
  if(loc){ renderRankSection(loc.secId); return; }
  renderAll();
}

function findFolderRankId(fid){
  for(const secId of Object.keys(state.grid)){
    const colGrid = state.grid[secId];
    for(const colId of Object.keys(colGrid||{})){
      const trackMap = colGrid[colId];
      if(!trackMap||typeof trackMap!=='object') continue;
      for(const trId of Object.keys(trackMap)){
        const slots = trackMap[trId];
        if(!Array.isArray(slots)) continue;
        if(slots.some(entry=>entry?.type==='folder'&&entry.id===fid)) return secId;
      }
    }
  }
  return null;
}
