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
  if(cols[0]) g.dataset.coltype=cols[0].type;
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
