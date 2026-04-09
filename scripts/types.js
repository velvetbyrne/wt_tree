// VEHICLE TYPES  (name, color, svg, category)
// ─────────────────────────────────────────────
const VEHICLE_TYPES = [
  { cat:'Aviation', name:'Fighter',           color:'#ffac6f', svg:'<path d="m0,7.5l10.5,-7.5l10.5,7.5l-10.5,7.5l-10.5,-7.5z" fill="#ffac6f"/>' },
  { cat:'Aviation', name:'Strike aircraft',   color:'#bde9b5', svg:'<path d="m0,7.5l10.5,-5l10.5,5l-10.5,5l-10.5,-5z" fill="#bde9b5"/>' },
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
