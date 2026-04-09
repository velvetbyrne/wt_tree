// VEHICLE MODAL — VIEW
// ─────────────────────────────────────────────
let _currentVehicleId=null;

function openVehicleModal(vid, editMode=false){
  _currentVehicleId=vid;
  const v=state.vehicles[vid]; if(!v) return;
  carouselIndex=0;

  // WT-style popup header
  // Build display name: [prefix] [manufacturer] [name]
  const _dispName = [v.prefix, v.manufacturer, v.name].filter(Boolean).join(' ');
  document.getElementById('vmTitle').textContent  = _dispName;
  document.getElementById('vmTitle2').textContent = _dispName;

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
  document.getElementById('vmEditPrefix').value        = v.prefix||'';
  document.getElementById('vmEditManufacturer').value = v.manufacturer||'';
  document.getElementById('vmEditBR').value           = v.br||'';
  document.getElementById('vmEditReserve').checked    = v.reserve||false;
  document.getElementById('vmEditNewItem').checked    = v.newItem||false;
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

    // URL row — shows URL input OR "local file" indicator
    const urlRow=document.createElement('div'); urlRow.className='img-editor-field-row';
    const urlLbl=document.createElement('span'); urlLbl.className='img-editor-lbl'; urlLbl.textContent='URL:';
    const isLocal=img.src&&img.src.startsWith('data:');
    if(isLocal){
      // Show local indicator instead of URL input
      const localTag=document.createElement('span'); localTag.className='img-local-tag';
      localTag.textContent='Local file uploaded';
      const clearBtn=document.createElement('button'); clearBtn.className='btn-upload-img'; clearBtn.textContent='✕';
      clearBtn.title='Remove and enter URL instead';
      clearBtn.addEventListener('click',()=>{ arr[i].src=''; refreshFn(); });
      urlRow.appendChild(urlLbl); urlRow.appendChild(localTag); urlRow.appendChild(clearBtn);
    } else {
      const urlInp=document.createElement('input'); urlInp.className='form-input img-editor-input';
      urlInp.placeholder='https://…'; urlInp.value=img.src||'';
      urlInp.addEventListener('input',()=>{ arr[i].src=urlInp.value.trim(); });
      // Upload button
      const uploadBtn=document.createElement('button'); uploadBtn.className='btn-upload-img'; uploadBtn.textContent='⬆';
      uploadBtn.title='Upload from file';
      uploadBtn.addEventListener('click',()=>{
        _pendingUploadIndex=i;
        _pendingUploadTarget=fileInputId||'vmEditImgFileHidden';
        document.getElementById(_pendingUploadTarget).click();
      });
      urlRow.appendChild(urlLbl); urlRow.appendChild(urlInp); urlRow.appendChild(uploadBtn);
    }
    fields.appendChild(urlRow);

    // Caption row
    const capRow=document.createElement('div'); capRow.className='img-editor-field-row';
    const capLbl=document.createElement('span'); capLbl.className='img-editor-lbl'; capLbl.textContent='Caption:';
    const capInp=document.createElement('input'); capInp.className='form-input img-editor-input';
    capInp.placeholder='Caption…'; capInp.value=img.caption||'';
    capInp.addEventListener('input',()=>{ arr[i].caption=capInp.value; });
    capRow.appendChild(capLbl); capRow.appendChild(capInp);
    fields.appendChild(capRow);



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
    qtyInp.type='text'; qtyInp.value=String(w.qty||1); qtyInp.placeholder='Qty';
    qtyInp.style.width='44px';
    qtyInp.addEventListener('input',()=>{ const v=qtyInp.value.trim(); arr[i].qty = v==='?'?'?':(parseInt(v)||1); });
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
  document.getElementById('vmPresetWarbonds')?.addEventListener('click',()=>{ document.getElementById('vmEditColor').value='#344c30'; });

  document.getElementById('vmSaveBtn').addEventListener('click',async()=>{
    const v=state.vehicles[_currentVehicleId]; if(!v) return;
    v.name         = document.getElementById('vmEditName').value.trim()||v.name;
    v.prefix       = document.getElementById('vmEditPrefix').value.trim();
    v.manufacturer = document.getElementById('vmEditManufacturer').value.trim();
    v.br           = document.getElementById('vmEditBR').value;
    v.reserve      = document.getElementById('vmEditReserve').checked;
    v.newItem      = document.getElementById('vmEditNewItem').checked;
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
  const _avPfx=document.getElementById('avPrefix'); if(_avPfx) _avPfx.value='';
  const _avNI=document.getElementById('avNewItem'); if(_avNI) _avNI.checked=false;
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
  document.getElementById('avPresetWarbonds')?.addEventListener('click',()=>{ document.getElementById('avColor').value='#344c30'; });

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
      prefix:document.getElementById('avPrefix').value.trim(),
      manufacturer:document.getElementById('avManufacturer').value.trim(),
      br:document.getElementById('avBR').value,
      reserve:document.getElementById('avReserve').checked,
      newItem:document.getElementById('avNewItem').checked,
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
        // Convert all URL images to data URLs so html2canvas can capture them
        const imgs=[...box.querySelectorAll('img')];
        await Promise.all(imgs.map(async img=>{
          if(!img.src||img.src.startsWith('data:')) return; // already a data URL
          try{
            await new Promise((res,rej)=>{
              if(img.complete&&img.naturalWidth) res();
              else{ img.onload=res; img.onerror=res; }
            });
            // Draw to offscreen canvas → data URL (bypasses CORS taint for display)
            const cvs=document.createElement('canvas');
            cvs.width=img.naturalWidth||img.width;
            cvs.height=img.naturalHeight||img.height;
            cvs.getContext('2d').drawImage(img,0,0);
            img.src=cvs.toDataURL();
          }catch(e){}
        }));
        const canvas=await html2canvas(box,{backgroundColor:'#242e33',scale:2,useCORS:true,allowTaint:true,logging:false,imageTimeout:15000});
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
        const _td=document.getElementById('treeTitleDisplay'); if(_td) _td.textContent=state.title||'Tech Tree Name';
        const _ti=document.getElementById('treeTitleInput'); if(_ti) _ti.value=state.title||'';
      }catch{alert('Invalid JSON file.');}
    };
    reader.readAsText(file);
    e.target.value='';
  });
}

// ─────────────────────────────────────────────
