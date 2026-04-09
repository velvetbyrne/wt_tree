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
  if(col.type==='premium') track.dataset.premium='true';

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

      // Handle dragging a folder-item out to the track bottom
      if(data.type==='folder-item'){
        const destSlots=state.grid[sec.id][col.id][trId];
        // Reuse handleDrop logic: append at end
        handleDrop(
          {dataTransfer:{getData:()=>raw}, currentTarget:bottom, clientY:0},
          sec.id, col.id, trId, destSlots.length, null
        );
        return;
      }

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
// WT-style "new item" ribbon badge
// Diagonal gold ribbon/stripe in the top-left corner of the card, like the WT game UI
let _ribbonIdCounter = 0;
function makeRibbonBadge(SIZE=48){
  const uid_r = 'rb' + (_ribbonIdCounter++); // unique per-badge to avoid SVG id collisions
  const gradId = 'ribbonGrad_' + uid_r;
  const clipId = 'ribbonClip_' + uid_r;

  // Scale stroke widths proportionally to SIZE
  const outlineW = Math.round(SIZE * 0.354); // ~17px at 48
  const stripeW  = Math.round(SIZE * 0.271); // ~13px at 48
  const highlightW = 2;

  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('class','card-ribbon');
  svg.setAttribute('width', String(SIZE));
  svg.setAttribute('height', String(SIZE));
  svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
  svg.setAttribute('xmlns','http://www.w3.org/2000/svg');

  const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');

  // Gradient: light gold at top-left → dark gold at bottom-right
  const grad = document.createElementNS('http://www.w3.org/2000/svg','linearGradient');
  grad.setAttribute('id', gradId);
  grad.setAttribute('x1','0%'); grad.setAttribute('y1','0%');
  grad.setAttribute('x2','100%'); grad.setAttribute('y2','100%');
  const s1=document.createElementNS('http://www.w3.org/2000/svg','stop');
  s1.setAttribute('offset','0%'); s1.setAttribute('stop-color','#ede0ab');
  const s2=document.createElementNS('http://www.w3.org/2000/svg','stop');
  s2.setAttribute('offset','55%'); s2.setAttribute('stop-color','#c8a050');
  const s3=document.createElementNS('http://www.w3.org/2000/svg','stop');
  s3.setAttribute('offset','100%'); s3.setAttribute('stop-color','#886231');
  grad.appendChild(s1); grad.appendChild(s2); grad.appendChild(s3);
  defs.appendChild(grad);

  // Clip: only the top-left triangle
  const clip = document.createElementNS('http://www.w3.org/2000/svg','clipPath');
  clip.setAttribute('id', clipId);
  const clipPoly = document.createElementNS('http://www.w3.org/2000/svg','polygon');
  clipPoly.setAttribute('points', `0,0 ${SIZE},0 0,${SIZE}`);
  clip.appendChild(clipPoly);
  defs.appendChild(clip);
  svg.appendChild(defs);

  // Stripe endpoints at 62% across the triangle
  const x1 = 0,           y1 = SIZE * 0.62;
  const x2 = SIZE * 0.62, y2 = 0;

  // Black outline (drawn first, slightly wider)
  const outline = document.createElementNS('http://www.w3.org/2000/svg','line');
  outline.setAttribute('x1', String(x1)); outline.setAttribute('y1', String(y1));
  outline.setAttribute('x2', String(x2)); outline.setAttribute('y2', String(y2));
  outline.setAttribute('stroke', '#111');
  outline.setAttribute('stroke-width', String(outlineW));
  outline.setAttribute('clip-path', `url(#${clipId})`);
  svg.appendChild(outline);

  // Gold gradient stripe
  const stripe = document.createElementNS('http://www.w3.org/2000/svg','line');
  stripe.setAttribute('x1', String(x1)); stripe.setAttribute('y1', String(y1));
  stripe.setAttribute('x2', String(x2)); stripe.setAttribute('y2', String(y2));
  stripe.setAttribute('stroke', `url(#${gradId})`);
  stripe.setAttribute('stroke-width', String(stripeW));
  stripe.setAttribute('clip-path', `url(#${clipId})`);
  svg.appendChild(stripe);

  // Subtle highlight along the upper (bright) edge of the ribbon
  const hx1 = 0,           hy1 = SIZE * 0.52;
  const hx2 = SIZE * 0.52, hy2 = 0;
  const highlight = document.createElementNS('http://www.w3.org/2000/svg','line');
  highlight.setAttribute('x1', String(hx1)); highlight.setAttribute('y1', String(hy1));
  highlight.setAttribute('x2', String(hx2)); highlight.setAttribute('y2', String(hy2));
  highlight.setAttribute('stroke', 'rgba(255,255,240,0.4)');
  highlight.setAttribute('stroke-width', String(highlightW));
  highlight.setAttribute('clip-path', `url(#${clipId})`);
  svg.appendChild(highlight);

  return svg;
}

function makeVehicleCard(v, secId, colId, trId, slotIndex){
  const isPremium = v.premium===true||v.premium==='true';
  const card=document.createElement('div');
  card.className='vehicle-card'+(isPremium?' premium-card':'');
  card.dataset.vehicleId=v.id;
  if(v.color && v.color!==(isPremium?'#3d361c':'#314654')) card.style.background=v.color;
  card.draggable=true;

  // New item badge: small square badge in top-left (WT-style)
  if(v.newItem){
    card.appendChild(makeRibbonBadge());
  }

  // Top-right: name only
  const headerText=document.createElement('div'); headerText.className='card-header-text';
  const nameEl=document.createElement('span'); nameEl.className='card-name';
  nameEl.textContent = v.prefix ? v.prefix+' '+v.name : v.name;
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
        ico.innerHTML=tDef.svg; ico.setAttribute('class','card-type-ico');
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
  const fv=vehicles[0];
  if(fv){
    const isPremFv=fv.premium===true||fv.premium==='true';
    const fvColor=fv.color||(isPremFv?'#3d361c':'#314654');
    card.style.background=fvColor;
    card.style.borderColor=lightenHex(fvColor,28);
    if(isPremFv) card.classList.add('premium-card');
  }
  const headerText=document.createElement('div'); headerText.className='card-header-text';
  const nameEl=document.createElement('span'); nameEl.className='card-name'; nameEl.textContent=folderDisplayName(folder);
  headerText.appendChild(nameEl);
  card.appendChild(headerText);
  const brStr=folderBRDisplay(vehicles);
  if(brStr){
    const brEl=document.createElement('span'); brEl.className='card-br'; brEl.textContent=brStr;
    card.appendChild(brEl);
  }
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
  const title=document.createElement('span'); title.textContent=folderDisplayName(folder); bar.appendChild(title);

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
    if(v.newItem){
      const rb=makeRibbonBadge(28); rb.style.position='absolute'; rb.style.top='0'; rb.style.left='0';
      item.appendChild(rb);
    }
    const ne=document.createElement('div');ne.className='fv-name';ne.textContent=v.prefix?v.prefix+' '+v.name:v.name;info.appendChild(ne);
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
          ico.innerHTML=tDef.svg; ico.setAttribute('class','fv-type-ico');
          brRow.appendChild(ico);
        }
      }
      const be=document.createElement('span');be.className='fv-br';
      be.textContent=v.reserve?parseFloat(v.br).toFixed(1)+' (Reserve)':parseFloat(v.br).toFixed(1);
      brRow.appendChild(be);
      info.appendChild(brRow);
    }
    item.appendChild(info);
    // Drag to reorder inside folder, or drag OUT to standalone slot
    item.draggable=true;
    item.addEventListener('dragstart',e=>{
      e.dataTransfer.setData('text/plain',JSON.stringify({
        type:'folder-item',vehicleId:v.id,folderId:folder.id,
        srcSec:secId,srcCol:colId,srcTrId:trId,srcFolderSlot:slotIndex
      }));
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

    // DROP ON EXISTING FOLDER → add vehicle to that folder
    if(targetEntry?.type==='folder'){
      const f=state.folders[targetEntry.id]; if(!f) return;
      if(f.vehicleIds.includes(data.id)) return; // already in folder
      const srcSlots=state.grid[data.srcSec]?.[data.srcCol]?.[srcTrId]; if(!srcSlots) return;
      srcSlots.splice(data.srcSlot,1);
      f.vehicleIds.push(data.id);
      renderAll();saveToStorage(); return;
    }

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
        // DROP ON BOTTOM HALF → create new folder or merge
        const srcSlots=state.grid[data.srcSec]?.[data.srcCol]?.[srcTrId]; if(!srcSlots) return;
        srcSlots.splice(data.srcSlot,1);
        let adj=slotIndex;
        if(data.srcSec===secId&&data.srcCol===colId&&srcTrId===trId&&data.srcSlot<slotIndex) adj--;
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
  } else if(data.type==='folder-item'){
    // Dragging a vehicle OUT of a folder — extract it into a standalone slot
    const f=state.folders[data.folderId]; if(!f) return;
    if(!f.vehicleIds.includes(data.vehicleId)) return;
    // Remove from folder
    f.vehicleIds=f.vehicleIds.filter(id=>id!==data.vehicleId);
    // Insert vehicle as standalone in the destination slot
    const dest=state.grid[secId]?.[colId]?.[trId]; if(!dest) return;
    dest.splice(slotIndex,0,{type:'vehicle',id:data.vehicleId});
    // Clean up: if folder now has 0 or 1 vehicle, dissolve it
    const folderLoc=findFolderLocation(data.folderId);
    if(folderLoc){
      const fSlots=state.grid[folderLoc.secId][folderLoc.colId][folderLoc.trId];
      const fIdx=fSlots.findIndex(e=>e?.type==='folder'&&e.id===data.folderId);
      if(f.vehicleIds.length===0){
        if(fIdx>=0) fSlots.splice(fIdx,1);
        delete state.folders[data.folderId];
      } else if(f.vehicleIds.length===1){
        const remId=f.vehicleIds[0];
        if(fIdx>=0) fSlots[fIdx]={type:'vehicle',id:remId};
        delete state.folders[data.folderId];
      }
    }
    // Auto-set premium based on destination column
    const destCol=state.columns.find(c=>c.id===colId);
    if(destCol){
      const veh=state.vehicles[data.vehicleId];
      if(veh){
        const isPremCol=destCol.type==='premium';
        veh.premium=isPremCol;
        if(isPremCol && veh.color==='#314654') veh.color='#3d361c';
        if(!isPremCol && veh.color==='#3d361c') veh.color='#314654';
      }
    }
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

function findFolderLocation(folderId){
  for(const sec of Object.keys(state.grid)){
    for(const colId of Object.keys(state.grid[sec])){
      const colGrid=state.grid[sec][colId];
      if(!colGrid||typeof colGrid!=='object') continue;
      for(const trId of Object.keys(colGrid)){
        const slots=colGrid[trId];
        if(!Array.isArray(slots)) continue;
        for(let i=0;i<slots.length;i++){
          if(slots[i]?.type==='folder'&&slots[i].id===folderId) return{secId:sec,colId,trId,slotIndex:i};
        }
      }
    }
  }
  return null;
}

function removeFromFolder(vehicleId,folderId,secId,colId,trId,slotIndex){
  const slots=state.grid[secId][colId][trId];
  if(!f.vehicleIds.length){
    // Folder now empty: remove folder slot entirely
    slots.splice(slotIndex,1);
    delete state.folders[folderId];
    // Insert the removed vehicle at the same position
    slots.splice(slotIndex,0,{type:'vehicle',id:vehicleId});
  } else if(f.vehicleIds.length===1){
    // Only one vehicle left: dissolve folder, replace slot with that vehicle
    const rem=f.vehicleIds[0];
    slots[slotIndex]={type:'vehicle',id:rem};
    delete state.folders[folderId];
    // Insert the removed vehicle right after
    slots.splice(slotIndex+1,0,{type:'vehicle',id:vehicleId});
  } else {
    // Folder still has 2+ vehicles: insert removed vehicle right after the folder slot
    slots.splice(slotIndex+1,0,{type:'vehicle',id:vehicleId});
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
