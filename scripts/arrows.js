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
