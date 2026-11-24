// ARROWS — SVG overlay, viewport-culled.
// Endpoints of rendered cards are read from the DOM; endpoints of virtualized
// (not rendered) cards are computed from the cached rank layout.
// ─────────────────────────────────────────────
let _posCache = null;
let _cardElCache = null;
let _locIndex = null;      // vehicleId -> location (invalidated by invalidateLayout)
let _arrowBand = null;     // {top,bottom} in #rankSections coordinates of last draw
let _arrowRaf = 0;

function scheduleArrows(){
  if(_arrowRaf) return;
  _arrowRaf = requestAnimationFrame(()=>{ _arrowRaf = 0; drawAllArrows(); });
}

function getPos(el){
  if(_posCache && _posCache.has(el)) return _posCache.get(el);
  const rs = document.getElementById('rankSections');
  let x = 0, y = 0;
  let cur = el;
  while(cur && cur !== rs){
    x += cur.offsetLeft || 0;
    y += cur.offsetTop  || 0;
    let scrollNode = cur.parentElement;
    while(scrollNode && scrollNode !== cur.offsetParent && scrollNode !== rs){
      x -= scrollNode.scrollLeft || 0;
      y -= scrollNode.scrollTop  || 0;
      scrollNode = scrollNode.parentElement;
    }
    cur = cur.offsetParent;
    if(!cur || !rs.contains(cur)) break;
  }
  const result = { x, y, w: el.offsetWidth, h: el.offsetHeight };
  if(_posCache) _posCache.set(el, result);
  return result;
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
  // Down-pointing triangle: base at path end (refY=0), tip 14px below.
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
  defs.appendChild(mkMarker('arrowMain',   state.arrowColor||'#6a8ea0'));
  defs.appendChild(mkMarker('arrowBranch', state.arrowColor||'#6a8ea0'));
  svg.appendChild(defs);
  rs.appendChild(svg);

  svg.addEventListener('contextmenu', handleArrowContextMenu);
  return svg;
}

function handleArrowContextMenu(e){
  const hit = e.target.closest('.arrow-hit-area');
  if(!hit) return;
  e.preventDefault();
  e.stopPropagation();

  const fromId   = hit.dataset.fromId;
  const toId     = hit.dataset.toId;
  const explicit = hit.dataset.explicit === 'true';

  if(!explicit){
    showContextMenu(e,[
      {label:'Remove automatic connection', cls:'danger', action:()=>{
        if(!fromId||!toId) return;
        blockLink(fromId,toId);
        scheduleArrows(); saveToStorage();
      }},
    ]);
    return;
  }

  showContextMenu(e,[
    {label:'Remove this connection', cls:'danger', action:()=>{
      const conn = state.connections[fromId];
      if(!conn) return;
      const targets = conn.targets||[conn.next,conn.branch].filter(Boolean);
      const colors  = conn.colors||[];
      const idx = targets.indexOf(toId);
      if(idx===-1) return;
      targets.splice(idx,1);
      colors.splice(idx,1);
      if(targets.length===0){
        delete state.connections[fromId];
      } else {
        state.connections[fromId] = {
          targets, colors,
          next:   targets[0]||null,
          branch: targets[1]||null,
        };
      }
      scheduleArrows(); saveToStorage();
    }},
  ]);
}

// vehicleId -> rendered element (standalone card / open-folder item), or the
// closed folder card for members of closed folders. Only RENDERED cards exist.
function _buildCardElCache(){
  const map = new Map();
  document.querySelectorAll('[data-vehicle-id]').forEach(el=>{
    map.set(el.dataset.vehicleId, el);
  });
  document.querySelectorAll('[data-folder-id]').forEach(el=>{
    const f = state.folders[el.dataset.folderId];
    if(f && f.vehicleIds) f.vehicleIds.forEach(vid=>{
      if(!map.has(vid)) map.set(vid, el);
    });
  });
  return map;
}

// ── Location index: vehicleId -> where it lives in the grid ────────────
function getLocIndex(){
  if(_locIndex) return _locIndex;
  const m = new Map();
  for(const sec of state.sections){
    const sg = state.grid[sec.id]; if(!sg) continue;
    for(const colId in sg){
      const cg = sg[colId]; if(!cg||typeof cg!=='object') continue;
      for(const trId in cg){
        const slots = cg[trId]; if(!Array.isArray(slots)) continue;
        for(let i=0;i<slots.length;i++){
          const e = slots[i];
          if(e?.type==='vehicle'){
            if(state.vehicles[e.id]) m.set(e.id,{secId:sec.id,colId,trId,slot:i,fid:null,open:false,fi:-1,fn:0});
          } else if(e?.type==='folder'){
            const f = state.folders[e.id]; if(!f) continue;
            const ids = f.vehicleIds||[], open = !!f.open;
            for(let fi=0;fi<ids.length;fi++){
              if(state.vehicles[ids[fi]]) m.set(ids[fi],{secId:sec.id,colId,trId,slot:i,fid:e.id,open,fi,fn:ids.length});
            }
          }
        }
      }
    }
  }
  return (_locIndex = m);
}

// ── Endpoint resolution ────────────────────────────────────────────────
function _origin(ctx, key){
  let o = ctx.origins.get(key);
  if(o !== undefined) return o;
  const el = ctx.trackEls.get(key);
  if(!el){ ctx.origins.set(key,null); return null; }
  const p = getPos(el);
  o = { x:p.x, y:p.y, w:p.w };
  ctx.origins.set(key,o);
  return o;
}

// Measures the real card offset vs the layout model once per pass, so the
// computed positions of virtualized cards line up with rendered ones.
function _calibrate(ctx){
  const cal = { dx:0, dy:2, h:82, fdy:null };
  let gotS=false, gotF=false;
  const nodes = document.querySelectorAll('[data-vehicle-id]');
  for(let i=0;i<nodes.length && !(gotS&&gotF);i++){
    const el = nodes[i];
    const l = ctx.loc.get(el.dataset.vehicleId); if(!l) continue;
    const o = _origin(ctx, l.secId+'|'+l.colId+'|'+l.trId); if(!o) continue;
    const L = ctx.getL(l.secId); if(!L) continue;
    const info = L.tracks.get(l.colId+'|'+l.trId); if(!info) continue;
    const st = info.starts[l.slot]; if(st===undefined) continue;
    const row = st + (l.open ? l.fi : 0);
    if(L.rowTop[row]===undefined) continue;
    const p = getPos(el);
    const base = o.y + L.rowTop[row];
    if(l.open){
      if(!gotF){ cal.fdy = p.y - base; gotF = true; }
    } else if(!gotS){
      cal.dy = p.y - base;
      cal.dx = (p.x + p.w/2) - (o.x + o.w/2);
      cal.h  = p.h;
      gotS = true;
    }
  }
  if(!gotF) cal.fdy = cal.dy;
  return cal;
}

function _domEndpoint(el, lastInOpenFolder){
  const p = getPos(el);
  let bottom = Math.round(p.y + p.h);
  // Last card of an open folder: the "+ Add vehicle" button sits right below,
  // so start the arrow beneath it.
  if(lastInOpenFolder && !screenshotMode){
    const wrap = el.closest && el.closest('.folder-open-card');
    const btn = wrap && wrap.querySelector('.folder-add-btn');
    if(btn){
      const bp = getPos(btn);
      const bb = Math.round(bp.y + bp.h);
      if(bb > bottom) bottom = bb;
    }
  }
  return { x:Math.round(p.x + p.w/2), top:Math.round(p.y), bottom };
}

function _analyticEndpoint(ctx, vid){
  const l = ctx.loc.get(vid); if(!l) return null;
  const o = _origin(ctx, l.secId+'|'+l.colId+'|'+l.trId); if(!o) return null;
  const L = ctx.getL(l.secId); if(!L) return null;
  const info = L.tracks.get(l.colId+'|'+l.trId);
  if(!info || info.starts[l.slot]===undefined) return null;
  const row = info.starts[l.slot] + (l.open ? l.fi : 0);
  const rt = L.rowTop[row]; if(rt===undefined) return null;
  const cal = ctx.getCal();
  const y = o.y + rt + (l.open ? cal.fdy : cal.dy);
  let bottom = y + cal.h;
  if(l.open && l.fi===l.fn-1 && !screenshotMode) bottom += 2 + 8 + FOLDER_ADD_BTN_HEIGHT;
  return { x:Math.round(o.x + o.w/2 + cal.dx), top:Math.round(y), bottom:Math.round(bottom) };
}

function _resolve(ctx, vid){
  if(ctx.res.has(vid)) return ctx.res.get(vid);
  let r;
  const el = ctx.cardEls.get(vid);
  if(el){
    const l = ctx.loc.get(vid);
    r = _domEndpoint(el, !!(l && l.open && l.fi===l.fn-1));
  } else {
    r = _analyticEndpoint(ctx, vid);
  }
  ctx.res.set(vid, r);
  return r;
}

/**
 * Draw connections for one source: T-junction routing
 *   1. vertical stem from source bottom-centre to busY
 *   2. horizontal bus spanning all targets
 *   3. vertical drops to each target with arrowhead
 * src = {x, y(bottom)}, targets = [{x, y2(top), color, toId, explicit}]
 */
function drawSourceGroup(svg, src, targets, fromId){
  const STROKE = 8;
  const HIT_STROKE = 22;
  const GAP    = 18;
  const COLOR_MAIN = state.arrowColor||'#6a8ea0';
  const ns = 'http://www.w3.org/2000/svg';

  const srcX = src.x, srcY = src.y;
  let minTargetY = Infinity;
  for(const t of targets) if(t.y2 < minTargetY) minTargetY = t.y2;
  const busY = minTargetY > srcY
    ? Math.round(srcY + (minTargetY - srcY) * 0.5)
    : srcY + GAP;

  const tgts = targets.filter(t => t.y2 > srcY); // only draw downward
  if(!tgts.length) return;

  function addHitOverlay(d, tId, isExplicit){
    const hit = document.createElementNS(ns,'path');
    hit.setAttribute('d', d);
    hit.setAttribute('fill', 'none');
    hit.setAttribute('stroke', '#000');
    hit.setAttribute('stroke-opacity', '0');
    hit.setAttribute('stroke-width', HIT_STROKE);
    hit.setAttribute('class', 'arrow-hit-area');
    hit.style.pointerEvents = 'stroke';
    hit.style.cursor = isExplicit ? 'context-menu' : 'default';
    hit.dataset.fromId = fromId||'';
    hit.dataset.toId = tId||'';
    hit.dataset.explicit = isExplicit ? 'true' : 'false';
    svg.appendChild(hit);
  }

  if(tgts.length === 1){
    const t = tgts[0];
    const color = t.color||COLOR_MAIN;
    const path = document.createElementNS(ns,'path');
    let d;
    const ey = t.y2 - 14;
    if(Math.abs(srcX - t.x) < 6){
      d = `M ${srcX} ${srcY} L ${t.x} ${ey}`;
    } else {
      d = `M ${srcX} ${srcY} L ${srcX} ${busY} L ${t.x} ${busY} L ${t.x} ${ey}`;
    }
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', STROKE);
    path.setAttribute('stroke-linejoin', 'miter');
    path.setAttribute('marker-end', 'url(#arrowMain)');
    svg.appendChild(path);
    addHitOverlay(d, t.toId, t.explicit);
    return;
  }

  const xs = tgts.map(t => t.x);
  const busLeft  = Math.min(srcX, ...xs);
  const busRight = Math.max(srcX, ...xs);

  addLine(svg, ns, srcX, srcY, srcX, busY, COLOR_MAIN, STROKE);
  if(busLeft < busRight) addLine(svg, ns, busLeft, busY, busRight, busY, COLOR_MAIN, STROKE);

  tgts.forEach(t => {
    const color = t.color||COLOR_MAIN;
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
    const d2 = `M ${t.x} ${busY} L ${t.x} ${t.y2 - 14}`;
    path.setAttribute('d', d2);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', STROKE);
    path.setAttribute('marker-end', 'url(#'+safeId+')');
    svg.appendChild(path);
    addHitOverlay(d2, t.toId, t.explicit);
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

// ── Blocked automatic links ────────────────────────────────────────────
function isLinkBlocked(fromId, toId){
  const blocked = state.blockedLinks?.[fromId];
  return Array.isArray(blocked) && blocked.includes(toId);
}
function blockLink(fromId, toId){
  if(!state.blockedLinks) state.blockedLinks={};
  if(!state.blockedLinks[fromId]) state.blockedLinks[fromId]=[];
  if(!state.blockedLinks[fromId].includes(toId)) state.blockedLinks[fromId].push(toId);
}

// ── Edge collection (pure data — no DOM) ───────────────────────────────
function _collectGroups(loc){
  const groups = Object.create(null);
  const nodeKey = id => { const l=loc.get(id); return (l&&l.fid&&!l.open) ? 'f:'+l.fid : 'v:'+id; };
  const add = (fromId,toId,isBranch,explicit,color)=>{
    let g = groups[fromId];
    if(!g) g = groups[fromId] = { targets:[], keys:new Set() };
    const k = nodeKey(toId);
    if(explicit || !g.keys.has(k)){
      g.keys.add(k);
      g.targets.push({ toId, isBranch, explicit, color:color||null });
    }
  };
  const firstId = e => {
    if(!e) return null;
    if(e.type==='vehicle') return e.id;
    const ids = state.folders[e.id]?.vehicleIds;
    return ids && ids.length ? ids[0] : null;
  };
  const lastId = e => {
    if(!e) return null;
    if(e.type==='vehicle') return e.id;
    const ids = state.folders[e.id]?.vehicleIds;
    return ids && ids.length ? ids[ids.length-1] : null;
  };

  // 1. Explicit connections
  for(const fromId in state.connections){
    if(!loc.has(fromId)) continue;
    const conn = state.connections[fromId];
    const targets = conn.targets||[conn.next,conn.branch].filter(Boolean);
    const colors  = conn.colors||[];
    targets.forEach((toId,i)=>{
      if(!toId || !loc.has(toId)) return;
      add(fromId,toId,i>0,true,colors[i]);
    });
  }

  // 2. Implicit: adjacent slots in a track + trailing link to next non-empty rank
  const nonPrem = state.columns.filter(c=>c.type!=='premium');
  state.sections.forEach((sec,si)=>{
    nonPrem.forEach(col=>{
      (col.tracks||[{id:'t1'}]).forEach(tr=>{
        const slots = state.grid[sec.id]?.[col.id]?.[tr.id]||[];
        if(!slots.length) return;

        for(let i=0;i<slots.length-1;i++){
          const fromId = lastId(slots[i]), toId = firstId(slots[i+1]);
          if(!fromId||!toId||state.connections[fromId]) continue;
          if(isLinkBlocked(fromId,toId)) continue;
          if(!loc.has(fromId)||!loc.has(toId)) continue;
          add(fromId,toId,false,false,null);
        }

        const tailId = lastId(slots[slots.length-1]);
        if(!tailId||state.connections[tailId]) return;
        for(let ni=si+1; ni<state.sections.length; ni++){
          const nextSlots = state.grid[state.sections[ni].id]?.[col.id]?.[tr.id]||[];
          if(!nextSlots.length) continue;
          const toId = firstId(nextSlots[0]);
          if(!toId) break;
          if(isLinkBlocked(tailId,toId)) break;
          if(!loc.has(tailId)||!loc.has(toId)) break;
          add(tailId,toId,false,false,null);
          break;
        }
      });
    });
  });

  // 3. Implicit chain inside OPEN folders
  Object.values(state.folders).forEach(folder=>{
    if(!folder || !folder.open) return;
    const ids = folder.vehicleIds||[];
    for(let i=0;i<ids.length-1;i++){
      const fromId = ids[i], toId = ids[i+1];
      if(!fromId||!toId||state.connections[fromId]) continue;
      if(isLinkBlocked(fromId,toId)) continue;
      if(!loc.has(fromId)||!loc.has(toId)) continue;
      add(fromId,toId,false,false,null);
    }
  });
  return groups;
}

// ── Draw (viewport-culled) ─────────────────────────────────────────────
function drawAllArrows(){
  const rs = document.getElementById('rankSections'); if(!rs) return;
  rs.style.position = 'relative';
  _posCache = new Map();
  _cardElCache = _buildCardElCache();
  try{ _drawArrowsPass(rs); }
  finally { _posCache = null; _cardElCache = null; }
}

function _drawArrowsPass(rs){
  const vh = window.innerHeight || 800;
  const vTop = -rs.getBoundingClientRect().top;
  const band = _forceFullRender
    ? { top:-Infinity, bottom:Infinity }
    : { top:vTop - 2*vh, bottom:vTop + 3*vh };
  _arrowBand = band;

  const loc = getLocIndex();
  const secById = new Map(state.sections.map(s=>[s.id,s]));
  const trackEls = new Map();
  rs.querySelectorAll('.col-track').forEach(el=>{
    trackEls.set(el.dataset.secId+'|'+el.dataset.colId+'|'+el.dataset.trId, el);
  });
  let cal = null;
  const ctx = {
    loc, trackEls, cardEls:_cardElCache,
    origins:new Map(), res:new Map(),
    getL: id => { const s=secById.get(id); return s ? getRankLayout(s) : null; },
    getCal: () => cal || (cal = _calibrate(ctx)),
  };

  const groups = _collectGroups(loc);
  let svg = null;
  for(const fromId in groups){
    const s = _resolve(ctx, fromId); if(!s) continue;
    if(s.bottom > band.bottom) continue;               // cheap early reject
    const tg = [];
    let maxTop = -Infinity;
    for(const t of groups[fromId].targets){
      const e = _resolve(ctx, t.toId); if(!e) continue;
      tg.push({ x:e.x, y2:e.top, isBranch:t.isBranch, color:t.color, toId:t.toId, explicit:t.explicit });
      if(e.top > maxTop) maxTop = e.top;
    }
    if(!tg.length || maxTop < band.top) continue;      // entirely outside the band
    if(!svg) svg = buildArrowSvg();
    drawSourceGroup(svg, { x:s.x, y:s.bottom }, tg, fromId);
  }
  if(!svg){ const o = document.getElementById('crossArrowSvg'); if(o) o.remove(); }
}

// True while the current viewport is still comfortably inside the drawn band.
function arrowBandOK(){
  if(!_arrowBand) return false;
  const rs = document.getElementById('rankSections'); if(!rs) return true;
  const vh = window.innerHeight || 800;
  const vTop = -rs.getBoundingClientRect().top;
  const m = vh * 0.5;
  return (_arrowBand.top <= 0 || vTop - _arrowBand.top >= m)
      && (_arrowBand.bottom >= rs.scrollHeight || _arrowBand.bottom - (vTop + vh) >= m);
}
