/**
 * export_html.js — War Thunder Tech Tree Maker
 * ─────────────────────────────────────────────
 * Adds "Export HTML": a single self-contained, read-only page that can be
 * hosted anywhere static (Neocities, GitHub Pages…).
 *
 * The tree data is embedded as JSON; the viewer is a real function
 * (viewer()) that is stringified into the page, so it is ordinary,
 * lintable code rather than a giant escaped string.
 *
 * Efficiency: the page has no add-buttons, so every row is exactly
 * CARD+GAP px tall. Cards are absolutely positioned at row*ROW, which
 * removes the spacer/padding machinery of the editor. Arrow endpoints
 * are read once per draw pass from the DOM.
 */
(function () {
  'use strict';

  // ── Viewer CSS (subset of style.css that the read-only page needs) ────
  const VIEWER_CSS = `
:root{--bg:#161617;--item:#314654;--item-hover:#3a5264;--premium:#3d361c;--border:#4a6070;--text:#c8d0d4;--text-bright:#e8edf0;--text-dim:#8aa0ac;--header-bg:#36424e;--tree-box-bg:#242e33;--section-lbl:#7a9aaa;--accent:#5b9ec9;--modal-bg:#1e2a30;--modal-border:#3a5060;--col-divider:#3a5060;--folder-w:214px;--folder-flat:#405561;--folder-border:#9fbccd}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;font-size:15px;min-height:100vh}
.hidden{display:none!important}
.site-header{background:var(--header-bg);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;padding:8px 20px;position:sticky;top:0;z-index:100;height:56px}
.site-title{font-size:18px;font-weight:600;color:var(--text-bright);letter-spacing:.5px;margin-right:auto;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.btn{padding:7px 12px;border:1px solid var(--border);border-radius:3px;cursor:pointer;font-size:13px;font-family:inherit;background:#2a3040;color:var(--text-dim);white-space:nowrap}
.btn:hover{background:#354050;color:var(--text-bright)}
.btn-icon{background:none;border:none;color:var(--text-dim);padding:2px 6px;font-size:14px;cursor:pointer;border-radius:3px}
.btn-icon:hover{background:rgba(255,255,255,.08);color:var(--text-bright)}
.form-input{background:#1a2428;border:1px solid var(--modal-border);border-radius:3px;color:var(--text-bright);font-size:13px;font-family:inherit;height:34px;padding:0 10px;width:160px}
.form-input:focus{outline:none;border-color:var(--accent)}
.hide-dropdown-wrap{position:relative}
.hide-dropdown{display:none;position:absolute;top:100%;right:0;margin-top:4px;background:#1e2a30;border:1px solid var(--border);border-radius:3px;box-shadow:0 6px 18px rgba(0,0,0,.5);z-index:600;min-width:190px;padding:6px 0}
.hide-dropdown.open{display:block}
.hide-dd-item{display:flex;align-items:center;gap:8px;padding:7px 14px;cursor:pointer;font-size:13px;color:var(--text);user-select:none}
.hide-dd-item:hover{background:rgba(91,158,201,.12);color:var(--text-bright)}
.hide-dd-item input{accent-color:var(--accent);width:14px;height:14px}
.search-count-bar{display:none;height:28px;align-items:center;padding:0 20px;background:#1e2a30;border-bottom:1px solid var(--border);font-size:13px;color:var(--text-dim);position:sticky;top:56px;z-index:99}
.search-count-bar strong{color:var(--text-bright);margin-right:4px}
body.searching .search-count-bar{display:flex}
body.searching .tree-wrapper{height:calc(100vh - 84px)}

.tree-wrapper{overflow:auto;height:calc(100vh - 56px)}
.tree-scroll-area{padding:32px 48px 80px;min-width:max-content}
#treeInnerBox{background:var(--tree-box-bg);padding:0 0 20px;width:max-content;margin:0 auto}
.column-headers-row{display:flex;align-items:stretch;width:100%}
.col-header-group{display:flex;flex-direction:column;align-items:center}
.col-group-label{background:var(--col-header-bg,#36424e);color:var(--text-bright);font-size:15px;font-weight:500;padding:8px 0;text-align:center;letter-spacing:.3px}
.col-group-header-inner{display:flex;background:#36424e}
.col-header-divider,.col-track-divider{width:1px;background:var(--col-divider);align-self:stretch;flex-shrink:0}
.col-header-wrap{display:flex;flex-direction:column;align-items:stretch;border-right:1px solid var(--col-divider);background:#36424e}
.col-header-wrap:last-child{border-right:none}
.col-header-name-row{display:flex;align-items:center;justify-content:center;padding:4px 8px;min-height:28px;color:var(--text-dim);font-size:13px}
.col-track-subheaders{display:flex;border-top:1px solid var(--col-divider);background:#36424e}
.col-track-subheader{display:flex;align-items:center;justify-content:center;padding:2px 6px;font-size:11px;color:var(--text-dim);border-right:1px solid var(--col-divider);flex-shrink:0}
.col-track-subheader:last-child{border-right:none}

.rank-label-row{display:flex;align-items:center;margin-bottom:6px;padding:4px 0;border-top:1px solid var(--col-divider)}
.rank-label{color:var(--section-lbl);font-size:13px;font-weight:600;letter-spacing:.8px;text-transform:uppercase;min-width:70px;padding-left:10px}
.rank-body{display:flex}
.rank-bottom-line{height:1px;background:var(--col-divider);margin-top:10px}
.col-track{width:220px;flex-shrink:0;position:relative}

.vehicle-card{position:absolute;left:8px;width:204px;height:82px;background:var(--item);border:1px solid var(--border);cursor:pointer;overflow:hidden;transition:background .15s,border-color .15s;user-select:none}
.vehicle-card::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.38) 0%,rgba(0,0,0,.10) 45%,rgba(0,0,0,0) 75%);z-index:0;pointer-events:none}
.vehicle-card:hover{background:var(--item-hover);border-color:var(--accent)}
.vehicle-card.premium-card{background:var(--premium);border-color:#6a5830}
.card-img-area,.folder-closed-imgs{position:absolute;inset:0;display:flex;align-items:center;justify-content:flex-start;padding-left:8px;overflow:hidden;z-index:0}
.card-image{height:90%;width:auto;max-width:75%;object-fit:contain;display:block}
.card-image-placeholder,.folder-img-placeholder,.slide-placeholder{color:#fff;font-weight:700;font-family:Roboto,'Segoe UI',sans-serif;display:flex;align-items:center;justify-content:center}
.card-image-placeholder{width:60px;height:100%;font-size:34px}
.card-header-text{position:absolute;top:0;right:0;padding:4px 6px 0;display:flex;flex-direction:column;align-items:flex-end;pointer-events:none;z-index:1}
.card-name{font-family:Roboto,'Segoe UI',sans-serif;font-size:12px;color:var(--text-bright);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000;line-height:1.3}
.card-br{position:absolute;bottom:4px;right:6px;font-size:11px;color:#c8d0d4;white-space:nowrap;pointer-events:none;z-index:1;text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 0 4px rgba(0,0,0,.9);line-height:1;font-weight:600}
.card-br-wrap{position:absolute;bottom:4px;right:6px;display:flex;align-items:center;gap:3px;pointer-events:none;z-index:1}
.card-br-wrap .card-br{position:static}
.card-type-ico{display:block;flex-shrink:0;filter:drop-shadow(0 0 1px rgba(0,0,0,.8))}
.card-ribbon{position:absolute;top:0;left:0;z-index:2;pointer-events:none}
.folder-closed-imgs{padding-left:6px;gap:2px}
.folder-img-half{width:46%;height:100%;overflow:hidden;display:flex;align-items:center;justify-content:center}
.folder-img-half img{height:90%;width:auto;max-width:100%;object-fit:contain}
.folder-img-placeholder{width:68px;height:58px;font-size:28px}

.folder-open-card{position:absolute;left:3px;width:var(--folder-w);isolation:isolate}
.folder-open-card::before{content:"";position:absolute;z-index:-1;pointer-events:none;left:0;right:0;top:-2px;bottom:-2px;background:var(--folder-flat);box-shadow:inset 0 0 0 1px var(--folder-border)}
.folder-open-card>.vehicle-card{left:5px}
.folder-collapse-btn{position:absolute;top:0;right:7px;z-index:3;background:rgba(0,0,0,.45);border:none;border-radius:2px;color:var(--text-dim);font-size:11px;cursor:pointer;padding:1px 6px}
.folder-collapse-btn:hover{color:var(--text-bright)}

.search-highlight{outline:2px solid #e8c060!important;outline-offset:1px;z-index:2}
.search-dim{opacity:.3;filter:brightness(.6)}

#crossArrowSvg{position:absolute;top:0;left:0;pointer-events:none;z-index:10;overflow:visible}
body.hide-arrows-mode #crossArrowSvg{display:none}
body.hide-labels-mode .col-header-name-row,body.hide-labels-mode .col-track-subheaders{display:none}
body.hide-br-mode .card-br{display:none!important}
body.hide-type-ico-mode .card-type-ico{display:none!important}
body.hide-premium-mode .col-header-group[data-coltype="premium"],body.hide-premium-mode .col-header-divider,body.hide-premium-mode .col-track[data-premium="true"],body.hide-premium-mode .col-track-divider{display:none!important}

.modal-backdrop{display:none;position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:500;align-items:center;justify-content:center}
.modal-backdrop.open{display:flex}
.modal{background:var(--modal-bg);border:1px solid var(--modal-border);border-radius:6px;width:560px;max-width:92vw;max-height:92vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.6)}
.modal-header{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-bottom:1px solid var(--modal-border);background:rgba(0,0,0,.2)}
.modal-title{font-size:14px;font-weight:600;color:var(--text-bright)}
.wt-popup-header{background:var(--modal-bg);padding:10px 14px 8px;text-align:center;border-bottom:1px solid var(--modal-border)}
.wt-popup-name{font-family:Roboto,'Segoe UI',sans-serif;font-size:18px;font-weight:600;color:var(--text-bright);letter-spacing:.3px;margin-bottom:2px}
.wt-popup-type{font-size:14px;color:#a8c4d8;margin-bottom:4px}
.wt-popup-type svg{vertical-align:middle}
.wt-diamond{color:#d4a82a;font-size:11px}
.wt-popup-rankbr{font-size:13px;color:var(--text-dim);display:flex;align-items:center;justify-content:center;gap:6px}
.wt-popup-rankbr strong{color:var(--text-bright)}
.vm-carousel{position:relative;min-height:200px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.vm-carousel-track{display:flex;width:100%}
.vm-carousel-slide{min-width:100%;display:flex;align-items:center;justify-content:center;padding:10px}
.vm-carousel-slide img{max-height:260px;max-width:100%;object-fit:contain}
.slide-placeholder{font-size:64px}
.vm-carousel-btn{position:absolute;top:50%;transform:translateY(-50%);background:rgba(0,0,0,.5);border:1px solid var(--border);color:var(--text-bright);font-size:22px;line-height:1;padding:4px 10px;cursor:pointer;border-radius:3px;z-index:2}
.vm-carousel-btn:hover{background:rgba(0,0,0,.75)}
.vm-carousel-prev{left:6px}.vm-carousel-next{right:6px}
.vm-carousel-dots{position:absolute;bottom:28px;left:0;right:0;display:flex;justify-content:center;gap:5px}
.vm-carousel-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.3);cursor:pointer}
.vm-carousel-dot.active{background:var(--accent)}
.vm-carousel-caption{position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,.55);color:var(--text-dim);font-size:11px;padding:3px 10px;text-align:center;min-height:20px}
.vm-thumbs{display:flex;gap:4px;padding:6px 10px;flex-wrap:wrap;background:rgba(0,0,0,.15);border-bottom:1px solid var(--modal-border)}
.vm-thumb{width:54px;height:40px;object-fit:cover;border:2px solid transparent;border-radius:2px;cursor:pointer;background:rgba(0,0,0,.3)}
.vm-thumb.active{border-color:var(--accent)}
.wt-popup-weapons{padding:8px 14px;border-top:1px solid var(--modal-border)}
.wt-popup-section-header{font-size:11px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:var(--text-dim);padding:8px 16px 4px;border-top:1px solid var(--modal-border);margin-top:2px}
.wt-popup-weapons .wt-popup-section-header{border-top:none;padding:4px 0}
.wt-weapon-row{display:flex;align-items:baseline;gap:8px;font-size:13px;padding:2px 0;border-bottom:1px solid rgba(255,255,255,.04)}
.wt-weapon-row:last-child{border-bottom:none}
.wt-weapon-qty{color:var(--text-dim);min-width:36px;text-align:right;font-size:12px;flex-shrink:0}
.wt-weapon-name{color:var(--text-bright)}
.wt-weapon-sub-header{font-size:10px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--text-dim);padding:5px 0 2px;border-top:1px solid rgba(255,255,255,.06);margin-top:4px}
.wt-weapon-sub-header:first-child{border-top:none;margin-top:0;padding-top:0}
.wt-popup-desc-section{padding-bottom:8px}
.markdown-body{color:var(--text);line-height:1.7;font-size:13px;padding:4px 16px 12px}
.markdown-body p{margin-bottom:.7em}.markdown-body p:last-child{margin-bottom:0}
.markdown-body strong{color:var(--text-bright);font-weight:600}
.markdown-body em{color:#b8ccd8}
.markdown-body h1,.markdown-body h2,.markdown-body h3{color:var(--text-bright);margin:1em 0 .4em;font-weight:600;border-bottom:1px solid var(--modal-border);padding-bottom:3px}
.markdown-body h1{font-size:16px}.markdown-body h2{font-size:14px}.markdown-body h3{font-size:13px}
.markdown-body ul,.markdown-body ol{padding-left:1.4em;margin-bottom:.7em}
.markdown-body code{background:rgba(0,0,0,.3);padding:1px 5px;border-radius:3px;font-family:monospace;font-size:12px;color:#a8d8a8}
.markdown-body pre{background:rgba(0,0,0,.35);padding:10px 12px;border-radius:4px;overflow-x:auto;margin-bottom:.7em}
.markdown-body pre code{background:none;padding:0}
.markdown-body blockquote{border-left:3px solid var(--accent);padding-left:10px;color:var(--text-dim);margin:.5em 0}
.markdown-body a{color:var(--accent);text-decoration:none}.markdown-body a:hover{text-decoration:underline}
.markdown-body table{width:100%;border-collapse:collapse;margin-bottom:.7em;font-size:12px}
.markdown-body th{background:rgba(0,0,0,.25);color:var(--text-bright);padding:5px 8px;text-align:left;border:1px solid var(--modal-border)}
.markdown-body td{padding:4px 8px;border:1px solid var(--modal-border)}
::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:var(--bg)}::-webkit-scrollbar-thumb{background:#3a5060;border-radius:3px}
`;

  // ── Page shell ────────────────────────────────────────────────────────
  const SHELL = `
<header class="site-header">
  <span class="site-title" id="ttl"></span>
  <input type="text" id="q" class="form-input" placeholder="Search…" />
  <div class="hide-dropdown-wrap">
    <button class="btn" id="btnView">View ▾</button>
    <div class="hide-dropdown" id="viewDd"></div>
  </div>
</header>
<div class="search-count-bar" id="cnt"></div>
<main class="tree-wrapper"><div class="tree-scroll-area"><div id="treeInnerBox">
  <div class="column-headers-row" id="colHdr"></div>
  <div class="rank-sections" id="rankSections"></div>
</div></div></main>
<div class="modal-backdrop" id="vm"><div class="modal" id="vmBox">
  <div class="modal-header"><span class="modal-title" id="vmTitle"></span><button class="btn-icon" id="vmClose">✕</button></div>
  <div class="wt-popup-header">
    <div class="wt-popup-name" id="vmTitle2"></div>
    <div class="wt-popup-type" id="vmType"></div>
    <div class="wt-popup-rankbr"><span id="vmRank"></span><span id="vmSep" style="opacity:.5">|</span><span id="vmBR"></span></div>
  </div>
  <div class="vm-carousel" id="vmCar">
    <div class="vm-carousel-track" id="vmTrack"></div>
    <button class="vm-carousel-btn vm-carousel-prev" id="vmPrev">&#8249;</button>
    <button class="vm-carousel-btn vm-carousel-next" id="vmNext">&#8250;</button>
    <div class="vm-carousel-dots" id="vmDots"></div>
    <div class="vm-carousel-caption" id="vmCap"></div>
  </div>
  <div class="vm-thumbs" id="vmThumbs"></div>
  <div class="wt-popup-weapons hidden" id="vmWeapons"><div class="wt-popup-section-header">Weapons</div><div id="vmWList"></div></div>
  <div class="wt-popup-desc-section"><div class="wt-popup-section-header">Description</div><div class="markdown-body" id="vmDesc"></div></div>
</div></div>`;

  // ── The viewer: runs INSIDE the exported page (stringified below) ─────
  function viewer(D) {
    'use strict';
    const NS = 'http://www.w3.org/2000/svg', GAP = 36, ROW = 122; // 86 card row + 36 gap
    const $ = id => document.getElementById(id);
    const el = (tag, cls, parent, txt) => {
      const e = document.createElement(tag);
      if (cls) e.className = cls;
      if (txt != null) e.textContent = txt;
      if (parent) parent.appendChild(e);
      return e;
    };
    const T = new Map(D.types.map(t => [t.name, t]));
    const prem = v => v.premium === true || v.premium === 'true';
    const baseColor = v => v.color || (prem(v) ? '#3d361c' : '#314654');
    const shade = (hex, a) => '#' + [1, 3, 5].map(i =>
      Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) + a)).toString(16).padStart(2, '0')).join('');
    const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rs = $('rankSections');

    // Normalise (same guards as the editor's loader)
    Object.values(D.folders).forEach(f => { f.vehicleIds = (f.vehicleIds || []).filter(id => D.vehicles[id]); });
    D.columns.forEach(c => { if (!c.tracks || !c.tracks.length) c.tracks = [{ id: 't1', name: '' }]; });
    const secName = new Map(D.sections.map(s => [s.id, s.name]));

    // vehicleId -> {sec, fid}
    const LOC = new Map();
    D.sections.forEach(sec => D.columns.forEach(col => col.tracks.forEach(tr => {
      (D.grid[sec.id]?.[col.id]?.[tr.id] || []).forEach(e => {
        if (e?.type === 'vehicle' && D.vehicles[e.id]) LOC.set(e.id, { sec: sec.id, fid: null });
        else if (e?.type === 'folder' && D.folders[e.id]) D.folders[e.id].vehicleIds.forEach(id => LOC.set(id, { sec: sec.id, fid: e.id }));
      });
    })));

    function typeIcon(name, w, h, cls) {
      const t = T.get(name); if (!t) return null;
      const s = document.createElementNS(NS, 'svg');
      s.setAttribute('width', w); s.setAttribute('height', h); s.setAttribute('viewBox', '0 0 21 15');
      if (cls) s.setAttribute('class', cls);
      s.innerHTML = t.svg; return s;
    }

    let rid = 0;
    function ribbon(S = 48) {
      const g = 'rg' + rid, k = 'rc' + rid++;
      const ow = Math.round(S * .354), sw = Math.round(S * .271);
      const s = document.createElementNS(NS, 'svg');
      s.setAttribute('class', 'card-ribbon'); s.setAttribute('width', S); s.setAttribute('height', S);
      s.setAttribute('viewBox', `0 0 ${S} ${S}`);
      const ln = (a, b, c, d, st, w) => `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${st}" stroke-width="${w}" clip-path="url(#${k})"/>`;
      s.innerHTML = `<defs><linearGradient id="${g}" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ede0ab"/><stop offset="55%" stop-color="#c8a050"/><stop offset="100%" stop-color="#886231"/></linearGradient><clipPath id="${k}"><polygon points="0,0 ${S},0 0,${S}"/></clipPath></defs>`
        + ln(0, S * .62, S * .62, 0, '#111', ow) + ln(0, S * .62, S * .62, 0, `url(#${g})`, sw)
        + ln(0, S * .52, S * .52, 0, 'rgba(255,255,240,0.4)', 2);
      return s;
    }

    function folderName(f) {
      if (f.customName) return f.customName;
      const names = f.vehicleIds.map(id => D.vehicles[id].name);
      if (!names.length) return 'Empty Folder';
      if (names.length === 1) return names[0];
      let p = names[0];
      for (let i = 1; i < names.length && p; i++) while (!names[i].startsWith(p)) p = p.slice(0, -1);
      const minLen = Math.min(...names.map(n => n.length));
      if (p.length >= Math.ceil(minLen / 2)) {
        const suf = names.map(n => n.slice(p.length));
        if (suf.every(s => s.length <= 6)) return p + suf.join('/');
      }
      return names.join('/');
    }

    const thumb = v => v.images?.[0]?.src || null;
    const brText = v => parseFloat(v.br).toFixed(1) + (v.reserve ? ' (Reserve)' : '');

    function placeholder(cls) { return el('div', cls, null, '?'); }
    function img(src, alt, cls, fallbackCls) {
      const i = document.createElement('img');
      if (cls) i.className = cls;
      i.src = src; i.alt = alt; i.decoding = 'async'; i.loading = 'lazy';
      i.onerror = () => i.replaceWith(placeholder(fallbackCls));
      return i;
    }

    // ── Cards ──────────────────────────────────────────────────────────
    function card(v) {
      const p = prem(v);
      const c = el('div', 'vehicle-card' + (p ? ' premium-card' : '')); c.dataset.vid = v.id;
      if (v.color && v.color !== (p ? '#3d361c' : '#314654')) c.style.background = v.color;
      if (v.newItem) c.appendChild(ribbon());
      el('span', 'card-name', el('div', 'card-header-text', c), (v.prefix ? v.prefix + ' ' : '') + v.name);
      if (v.br) {
        const w = el('div', 'card-br-wrap', c);
        const ic = v.type && typeIcon(v.type, 13, 9, 'card-type-ico'); if (ic) w.appendChild(ic);
        el('span', 'card-br', w, brText(v));
      }
      const area = el('div', 'card-img-area', c);
      const t = thumb(v);
      area.appendChild(t ? img(t, v.name, 'card-image', 'card-image-placeholder') : placeholder('card-image-placeholder'));
      c.addEventListener('click', () => openModal(v.id));
      return c;
    }

    function closedCard(f, sec) {
      const vs = f.vehicleIds.map(id => D.vehicles[id]);
      const c = el('div', 'vehicle-card folder-closed-card'); c.dataset.fid = f.id;
      const col = baseColor(vs[0]);
      c.style.background = col; c.style.borderColor = shade(col, 28);
      if (prem(vs[0])) c.classList.add('premium-card');
      el('span', 'card-name', el('div', 'card-header-text', c), folderName(f));
      const brs = vs.map(v => parseFloat(v.br)).filter(n => n > 0);
      if (brs.length) {
        const lo = Math.min(...brs), hi = Math.max(...brs);
        el('span', 'card-br', c, Math.abs(lo - hi) < .05 ? lo.toFixed(1) : lo.toFixed(1) + '-' + hi.toFixed(1));
      }
      const area = el('div', 'folder-closed-imgs', c);
      vs.slice(0, 2).forEach(v => {
        const h = el('div', 'folder-img-half', area), t = thumb(v);
        h.appendChild(t ? img(t, v.name, '', 'folder-img-placeholder') : placeholder('folder-img-placeholder'));
      });
      c.addEventListener('click', () => toggleFolder(f, sec));
      return c;
    }

    function openFolder(f, sec, top) {
      const n = f.vehicleIds.length;
      const w = el('div', 'folder-open-card');
      w.style.top = (top + 2) + 'px'; w.style.height = (n * ROW - GAP - 4) + 'px';
      const b = el('button', 'folder-collapse-btn', w, '▲'); b.title = 'Collapse folder';
      b.addEventListener('click', e => { e.stopPropagation(); toggleFolder(f, sec); });
      f.vehicleIds.forEach((id, j) => {
        const c = card(D.vehicles[id]); c.style.top = (j * ROW) + 'px'; w.appendChild(c);
      });
      return w;
    }

    function toggleFolder(f, sec) {
      f.open = !f.open;
      rs.querySelector(`[data-sec-id="${sec.id}"]`).replaceWith(renderSection(sec));
      applySearch(); scheduleArrows();
    }

    // ── Layout: absolute row index of every slot (optionally "snap to row")
    function layout(sec) {
      const list = []; let maxN = 0;
      D.columns.forEach(col => col.tracks.forEach(tr => {
        const slots = D.grid[sec.id]?.[col.id]?.[tr.id] || [];
        const k = slots.map(e => {
          const f = e?.type === 'folder' && D.folders[e.id];
          return f && f.open ? Math.max(1, f.vehicleIds.length) : 1;
        });
        if (slots.length > maxN) maxN = slots.length;
        list.push({ col, slots, k, st: [] });
      }));
      if (D.snap) {
        let band = 0;
        for (let j = 0; j < maxN; j++) {
          let m = 1;
          list.forEach(t => { if (j < t.k.length && t.k[j] > m) m = t.k[j]; });
          list.forEach(t => { if (j < t.k.length) t.st[j] = band; });
          band += m;
        }
      } else list.forEach(t => { let r = 0; t.k.forEach((k, i) => { t.st[i] = r; r += k; }); });
      let rows = 0;
      list.forEach(t => { const n = t.k.length; if (n) rows = Math.max(rows, t.st[n - 1] + t.k[n - 1]); });
      return { list, rows };
    }

    function renderSection(sec) {
      const { list, rows } = layout(sec);
      const H = rows ? rows * ROW - GAP + 4 : 8;
      const s = el('div', 'rank-section'); s.dataset.secId = sec.id;
      el('span', 'rank-label', el('div', 'rank-label-row', s), sec.name);
      const body = el('div', 'rank-body', s);
      const track = t => {
        const tk = el('div', 'col-track'); tk.style.height = H + 'px';
        if (t.col.type === 'premium') tk.dataset.premium = 'true';
        t.slots.forEach((e, i) => {
          const top = t.st[i] * ROW;
          if (e?.type === 'vehicle' && D.vehicles[e.id]) {
            const c = card(D.vehicles[e.id]); c.style.top = (top + 2) + 'px'; tk.appendChild(c);
          } else if (e?.type === 'folder' && D.folders[e.id]?.vehicleIds.length) {
            const f = D.folders[e.id];
            if (f.open) tk.appendChild(openFolder(f, sec, top));
            else { const c = closedCard(f, sec); c.style.top = (top + 2) + 'px'; tk.appendChild(c); }
          }
        });
        return tk;
      };
      const res = list.filter(t => t.col.type === 'research'), pre = list.filter(t => t.col.type === 'premium');
      res.forEach(t => body.appendChild(track(t)));
      if (res.length && pre.length) el('div', 'col-track-divider', body);
      pre.forEach(t => body.appendChild(track(t)));
      el('div', 'rank-bottom-line', s);
      return s;
    }

    // ── Column headers ─────────────────────────────────────────────────
    function renderHeaders() {
      const row = $('colHdr');
      const group = (cols, label) => {
        const g = el('div', 'col-header-group'); g.dataset.coltype = cols[0].type;
        const n = cols.reduce((a, c) => a + c.tracks.length, 0);
        const lb = el('div', 'col-group-label', g, label); lb.style.width = (n * 220) + 'px';
        const inner = el('div', 'col-group-header-inner', g);
        cols.forEach(col => {
          const w = el('div', 'col-header-wrap', inner); w.style.width = (col.tracks.length * 220) + 'px';
          el('span', '', el('div', 'col-header-name-row', w), col.name);
          if (col.tracks.length > 1) {
            const tr = el('div', 'col-track-subheaders', w);
            col.tracks.forEach(t => { const th = el('div', 'col-track-subheader', tr, t.name || 'Track'); th.style.width = '220px'; });
          }
        });
        return g;
      };
      const r = D.columns.filter(c => c.type === 'research'), p = D.columns.filter(c => c.type === 'premium');
      if (r.length) row.appendChild(group(r, 'Researchable vehicles'));
      if (r.length && p.length) el('div', 'col-header-divider', row);
      if (p.length) row.appendChild(group(p, 'Premium vehicles'));
    }

    // ── Arrows (T-junction routing, identical to the editor) ───────────
    let arrowRaf = 0;
    function scheduleArrows() { if (!arrowRaf) arrowRaf = requestAnimationFrame(() => { arrowRaf = 0; drawArrows(); }); }

    function collectGroups() {
      const groups = Object.create(null);
      const key = id => { const l = LOC.get(id); return (l && l.fid && !D.folders[l.fid].open) ? 'f:' + l.fid : 'v:' + id; };
      const blocked = (a, b) => (D.blocked[a] || []).includes(b);
      const add = (from, to, explicit, color) => {
        const g = groups[from] || (groups[from] = { t: [], k: new Set() });
        const k = key(to);
        if (explicit || !g.k.has(k)) { g.k.add(k); g.t.push({ to, color: color || null }); }
      };
      const ids = e => e ? (e.type === 'vehicle' ? [e.id] : (D.folders[e.id]?.vehicleIds || [])) : [];
      const first = e => ids(e)[0] || null, last = e => { const a = ids(e); return a[a.length - 1] || null; };

      for (const from in D.connections) {
        if (!LOC.has(from)) continue;
        const c = D.connections[from], tg = c.targets || [c.next, c.branch].filter(Boolean), cols = c.colors || [];
        tg.forEach((to, i) => { if (to && LOC.has(to)) add(from, to, true, cols[i]); });
      }
      const nonPrem = D.columns.filter(c => c.type !== 'premium');
      D.sections.forEach((sec, si) => nonPrem.forEach(col => col.tracks.forEach(tr => {
        const slots = D.grid[sec.id]?.[col.id]?.[tr.id] || [];
        if (!slots.length) return;
        for (let i = 0; i < slots.length - 1; i++) {
          const a = last(slots[i]), b = first(slots[i + 1]);
          if (a && b && !D.connections[a] && !blocked(a, b) && LOC.has(a) && LOC.has(b)) add(a, b, false);
        }
        const tail = last(slots[slots.length - 1]);
        if (!tail || D.connections[tail]) return;
        for (let ni = si + 1; ni < D.sections.length; ni++) {
          const ns = D.grid[D.sections[ni].id]?.[col.id]?.[tr.id] || [];
          if (!ns.length) continue;
          const to = first(ns[0]);
          if (to && !blocked(tail, to) && LOC.has(tail) && LOC.has(to)) add(tail, to, false);
          break;
        }
      })));
      Object.values(D.folders).forEach(f => {
        if (!f.open) return;
        for (let i = 0; i < f.vehicleIds.length - 1; i++) {
          const a = f.vehicleIds[i], b = f.vehicleIds[i + 1];
          if (!D.connections[a] && !blocked(a, b)) add(a, b, false);
        }
      });
      return groups;
    }

    function drawArrows() {
      const old = $('crossArrowSvg'); if (old) old.remove();
      const groups = collectGroups();
      const els = new Map();
      rs.querySelectorAll('[data-vid]').forEach(e => els.set(e.dataset.vid, e));
      rs.querySelectorAll('[data-fid]').forEach(e => D.folders[e.dataset.fid].vehicleIds.forEach(id => { if (!els.has(id)) els.set(id, e); }));
      const rr = rs.getBoundingClientRect(), pos = new Map();
      const get = id => {
        if (pos.has(id)) return pos.get(id);
        const e = els.get(id); let r = null;
        if (e) { const b = e.getBoundingClientRect(); if (b.width) r = { x: Math.round(b.left - rr.left + b.width / 2), top: Math.round(b.top - rr.top), bottom: Math.round(b.bottom - rr.top) }; }
        pos.set(id, r); return r;
      };

      const MAIN = D.arrow || '#6a8ea0', STROKE = 8;
      const svg = document.createElementNS(NS, 'svg'); svg.id = 'crossArrowSvg';
      svg.setAttribute('width', rs.scrollWidth); svg.setAttribute('height', rs.scrollHeight);
      const defs = document.createElementNS(NS, 'defs'); svg.appendChild(defs);
      const markers = new Set();
      const marker = color => {
        const id = 'ar_' + color.replace('#', '');
        if (!markers.has(id)) {
          markers.add(id);
          defs.insertAdjacentHTML('beforeend', `<marker id="${id}" markerUnits="userSpaceOnUse" markerWidth="18" markerHeight="14" refX="9" refY="0" orient="0deg"><polygon points="0,0 18,0 9,14" fill="${color}"/></marker>`);
        }
        return id;
      };
      const path = (d, color, arrow) => {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', color); p.setAttribute('stroke-width', STROKE);
        if (arrow) p.setAttribute('marker-end', `url(#${marker(color)})`);
        svg.appendChild(p);
      };

      for (const from in groups) {
        const s = get(from); if (!s) continue;
        const tg = [];
        groups[from].t.forEach(t => { const e = get(t.to); if (e && e.top > s.bottom) tg.push({ x: e.x, y2: e.top, color: t.color || MAIN }); });
        if (!tg.length) continue;
        const minY = Math.min(...tg.map(t => t.y2));
        const busY = Math.round(s.bottom + (minY - s.bottom) * .5);
        if (tg.length === 1) {
          const t = tg[0], ey = t.y2 - 14;
          path(Math.abs(s.x - t.x) < 6 ? `M ${s.x} ${s.bottom} L ${t.x} ${ey}`
            : `M ${s.x} ${s.bottom} L ${s.x} ${busY} L ${t.x} ${busY} L ${t.x} ${ey}`, t.color, true);
          continue;
        }
        const xs = tg.map(t => t.x), l = Math.min(s.x, ...xs), r = Math.max(s.x, ...xs);
        path(`M ${s.x} ${s.bottom} L ${s.x} ${busY}`, MAIN);
        if (l < r) path(`M ${l} ${busY} L ${r} ${busY}`, MAIN);
        tg.forEach(t => path(`M ${t.x} ${busY} L ${t.x} ${t.y2 - 14}`, t.color, true));
      }
      rs.appendChild(svg);
    }

    // ── Vehicle popup ──────────────────────────────────────────────────
    let ci = 0;
    function slide(n, imgs) {
      const len = imgs.length; if (!len) return;
      ci = ((n % len) + len) % len;
      $('vmTrack').style.transform = `translateX(-${ci * 100}%)`;
      document.querySelectorAll('.vm-carousel-dot').forEach((d, i) => d.classList.toggle('active', i === ci));
      document.querySelectorAll('.vm-thumb').forEach((t, i) => t.classList.toggle('active', i === ci));
      $('vmCap').textContent = imgs[ci].caption || '';
    }

    function openModal(vid) {
      const v = D.vehicles[vid]; if (!v) return;
      const name = [v.prefix, v.manufacturer, v.name].filter(Boolean).join(' ');
      $('vmTitle').textContent = $('vmTitle2').textContent = name;

      const te = $('vmType'), t = T.get(v.type);
      te.innerHTML = ''; te.style.display = v.type ? '' : 'none';
      if (v.type) {
        if (prem(v)) te.insertAdjacentHTML('beforeend', '<span class="wt-diamond">♦</span> ');
        const ic = typeIcon(v.type, 21, 15); if (ic) { te.appendChild(ic); te.append(' '); }
        const col = t ? t.color : '#c8d0d4';
        te.insertAdjacentHTML('beforeend', `<span style="color:${col}">${esc(v.type)}</span>` + (v.subType ? ` <span style="color:${col};opacity:.85">/ ${esc(v.subType)}</span>` : ''));
      }

      const loc = LOC.get(vid), sn = loc && secName.get(loc.sec);
      const m = sn && sn.match(/([IVXLCDM]+)\s*$/i);
      $('vmRank').innerHTML = sn ? 'Rank: <strong>' + esc(m ? m[1].toUpperCase() : sn) + '</strong>' : '';
      $('vmSep').style.display = sn && v.br ? '' : 'none';
      $('vmBR').innerHTML = v.br ? 'Battle rating: <strong>' + esc(brText(v)) + '</strong>' : '';

      const bg = baseColor(v);
      $('vmBox').style.background = bg; $('vmBox').style.borderColor = shade(bg, -10);
      document.querySelector('#vm .modal-header').style.background = shade(bg, -18);
      document.querySelector('#vm .wt-popup-header').style.background = shade(bg, -12);
      $('vmCar').style.background = bg;

      const imgs = (v.images || []).filter(i => i.src);
      const track = $('vmTrack'), dots = $('vmDots'), th = $('vmThumbs');
      track.innerHTML = dots.innerHTML = th.innerHTML = ''; track.style.transform = '';
      $('vmPrev').style.display = $('vmNext').style.display = imgs.length > 1 ? '' : 'none';
      th.style.display = imgs.length ? '' : 'none';
      if (!imgs.length) { el('div', 'vm-carousel-slide', track).appendChild(placeholder('slide-placeholder')); $('vmCap').textContent = ''; }
      imgs.forEach((im, i) => {
        const sl = el('div', 'vm-carousel-slide', track), si = el('img', '', sl); si.src = im.src; si.alt = im.caption || '';
        el('div', 'vm-carousel-dot', dots).addEventListener('click', () => slide(i, imgs));
        const tm = el('img', 'vm-thumb', th); tm.src = im.src; tm.alt = im.caption || '';
        tm.addEventListener('click', () => slide(i, imgs));
      });
      $('vmPrev').onclick = () => slide(ci - 1, imgs);
      $('vmNext').onclick = () => slide(ci + 1, imgs);
      slide(0, imgs);

      const ws = v.weapons || [], wl = $('vmWList'); wl.innerHTML = '';
      $('vmWeapons').classList.toggle('hidden', !ws.length);
      const main = ws.filter(w => !w.secondary), sec = ws.filter(w => w.secondary);
      const group = (label, arr) => {
        if (label) el('div', 'wt-weapon-sub-header', wl, label);
        arr.forEach(w => { const r = el('div', 'wt-weapon-row', wl); el('span', 'wt-weapon-qty', r, (w.qty || 1) + 'x'); el('span', 'wt-weapon-name', r, w.name || ''); });
      };
      if (main.length) group(sec.length ? 'Main Weapons' : '', main);
      if (sec.length) group('Secondary Weapons', sec);

      const d = $('vmDesc'), raw = v.desc || '';
      if (raw && typeof marked !== 'undefined') d.innerHTML = marked.parse(raw);
      else { d.textContent = raw; d.style.whiteSpace = 'pre-wrap'; }
      $('vm').classList.add('open');
    }
    const closeModal = () => $('vm').classList.remove('open');
    $('vmClose').addEventListener('click', closeModal);
    $('vm').addEventListener('click', e => { if (e.target === $('vm')) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // ── Search ─────────────────────────────────────────────────────────
    const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const q = $('q'), cnt = $('cnt');
    function applySearch() {
      document.querySelectorAll('.search-highlight,.search-dim').forEach(e => e.classList.remove('search-highlight', 'search-dim'));
      const toks = norm(q.value).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
      document.body.classList.toggle('searching', !!toks.length);
      if (!toks.length) { cnt.textContent = ''; return; }
      const hit = new Set();
      for (const id in D.vehicles) {
        const v = D.vehicles[id], hay = norm([v.prefix, v.manufacturer, v.name].filter(Boolean).join(' ')), flat = hay.replace(/[^\p{L}\p{N}]+/gu, '');
        if (toks.every(t => hay.includes(t) || flat.includes(t))) hit.add(id);
      }
      cnt.innerHTML = `<strong>${hit.size}</strong> ${hit.size === 1 ? 'Vehicle' : 'Vehicles'}`;
      rs.querySelectorAll('[data-vid]').forEach(e => { const h = hit.has(e.dataset.vid); e.classList.toggle('search-highlight', h); e.classList.toggle('search-dim', !h); });
      rs.querySelectorAll('[data-fid]').forEach(e => { const h = D.folders[e.dataset.fid].vehicleIds.some(id => hit.has(id)); e.classList.toggle('search-highlight', h); e.classList.toggle('search-dim', !h); });
    }
    let st = 0;
    q.addEventListener('input', () => { clearTimeout(st); st = setTimeout(applySearch, 120); });
    q.addEventListener('keydown', e => { if (e.key === 'Escape') { q.value = ''; applySearch(); } });

    // ── View toggles ───────────────────────────────────────────────────
    const dd = $('viewDd');
    [['hideLabels', 'hide-labels-mode', 'Hide column labels'], ['hideArrows', 'hide-arrows-mode', 'Hide arrows'],
     ['hideBR', 'hide-br-mode', 'Hide BR'], ['hideTypeIco', 'hide-type-ico-mode', 'Hide type symbols'],
     ['hidePremium', 'hide-premium-mode', 'Hide premium track']].forEach(([key, cls, label]) => {
      const lb = el('label', 'hide-dd-item', dd), cb = el('input', '', lb); cb.type = 'checkbox';
      lb.append(' ' + label);
      cb.checked = !!D.opts[key]; document.body.classList.toggle(cls, cb.checked);
      cb.addEventListener('change', () => { document.body.classList.toggle(cls, cb.checked); scheduleArrows(); });
    });
    $('btnView').addEventListener('click', e => { e.stopPropagation(); dd.classList.toggle('open'); });
    dd.addEventListener('click', e => e.stopPropagation());
    document.addEventListener('click', () => dd.classList.remove('open'));

    // ── Boot ───────────────────────────────────────────────────────────
    $('ttl').textContent = D.title;
    renderHeaders();
    const frag = document.createDocumentFragment();
    D.sections.forEach(s => frag.appendChild(renderSection(s)));
    rs.style.position = 'relative'; rs.appendChild(frag);
    drawArrows();
    window.addEventListener('resize', scheduleArrows);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleArrows);
  }

  // ── Build the final document ──────────────────────────────────────────
  function buildHtml() {
    const data = {
      title:       state.title || 'Tech Tree',
      columns:     state.columns,
      sections:    state.sections,
      vehicles:    state.vehicles,
      folders:     state.folders,
      grid:        state.grid,
      connections: state.connections || {},
      blocked:     state.blockedLinks || {},
      arrow:       state.arrowColor,
      opts:        state.viewOptions || {},
      snap:        typeof snapToRowOn === 'function' && snapToRowOn(),
      types:       VEHICLE_TYPES.map(({ name, color, svg }) => ({ name, color, svg })),
    };
    // "<" and U+2028/9 escaped so user text can never end the <script> early
    const json = JSON.stringify(data)
      .replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    const title = String(data.title).replace(/&/g, '&amp;').replace(/</g, '&lt;');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;600;700&display=swap" rel="stylesheet">
<style>${VIEWER_CSS}</style>
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/9.1.6/marked.min.js"></script>
</head>
<body>
${SHELL}
<script type="application/json" id="treeData">${json}</script>
<script>
(${viewer.toString()})(JSON.parse(document.getElementById('treeData').textContent));
</script>
</body>
</html>`;
  }

  async function exportHtml() {
    const html = buildHtml();
    const name = (state.title || 'tech-tree').replace(/[^a-zA-Z0-9_\-. ]/g, '_') + '.html';
    const blob = new Blob([html], { type: 'text/html' });
    if (window.showSaveFilePicker) {
      try {
        const fh = await window.showSaveFilePicker({ suggestedName: name, types: [{ description: 'HTML file', accept: { 'text/html': ['.html'] } }] });
        const w = await fh.createWritable(); await w.write(blob); await w.close();
        return;
      } catch (e) { if (e.name === 'AbortError') return; }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const btn = document.getElementById('btnExportHtml');
  if (btn) btn.addEventListener('click', () => {
    try { exportHtml(); }
    catch (err) { console.error('[export_html] failed:', err); alert('HTML export failed: ' + err.message); }
  });
})();