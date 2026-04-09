function bindScreenshot(){
  document.getElementById('btnScreenshot').addEventListener('click',()=>{
    screenshotMode = !screenshotMode;
    document.body.classList.toggle('screenshot-mode', screenshotMode);
    document.getElementById('btnScreenshot').classList.toggle('active', screenshotMode);
    // Show/hide the hide-headers checkbox
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
  // Toggle dropdown
  document.getElementById('btnHideLabels').addEventListener('click',e=>{
    e.stopPropagation();
    document.getElementById('hideDropdown').classList.toggle('open');
  });
  document.getElementById('hideDropdown')?.addEventListener('click',e=>e.stopPropagation());
  document.addEventListener('click',()=>document.getElementById('hideDropdown')?.classList.remove('open'));

  // Individual checkboxes
  function bindCb(id, cls){
    const cb=document.getElementById(id);
    if(!cb) return;
    cb.addEventListener('change',()=>{ document.body.classList.toggle(cls, cb.checked); });
  }
  bindCb('cbHideLabels',   'hide-labels-mode');
  bindCb('cbHideArrows',   'hide-arrows-mode');
  bindCb('cbHideBR',       'hide-br-mode');
  bindCb('cbHideTypeIco',  'hide-type-ico-mode');
  bindCb('cbHidePremium',  'hide-premium-mode');
}

function bindArrowColor(){
  const picker=document.getElementById('arrowColorPicker');
  if(!picker) return;
  picker.value = state.arrowColor||'#6a8ea0';
  picker.addEventListener('input',()=>{
    state.arrowColor=picker.value;
    saveToStorage();
    requestAnimationFrame(drawAllArrows);
  });
}

// ─────────────────────────────────────────────
// RENDER ALL
// ─────────────────────────────────────────────
function renderAll(){
  renderColumnHeaders();
  renderRankSections();
  requestAnimationFrame(drawAllArrows);
}


// COMPLETE REWRITE of SVG arrow system
// Paste this between the getSvgOrigin function and the getCardEl function

// ─────────────────────────────────────────────
// SVG ARROW SYSTEM — COMPLETE REWRITE
// ─────────────────────────────────────────────

/**
 * Get the position of an element relative to #rankSections,
 * walking the full offsetParent chain but also accounting for
 * elements whose offsetParent jumps over intermediate containers.
 * We walk EVERY ancestor (not just offsetParent) summing scrollLeft/scrollTop
 * so that scroll containers are properly accounted for.
 */
