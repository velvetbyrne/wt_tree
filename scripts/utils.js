// MODAL UTILITIES
// ─────────────────────────────────────────────
function openModal(id){ const el=document.getElementById(id); if(el) el.classList.add('open'); }
function closeModal(id){ const el=document.getElementById(id); if(el) el.classList.remove('open'); }

function bindModalCloseButtons(){
  document.querySelectorAll('.modal-close').forEach(btn=>{
    btn.addEventListener('click',()=>{ const m=btn.getAttribute('data-modal'); if(m) closeModal(m); });
  });
  document.querySelectorAll('.modal-backdrop').forEach(bd=>{
    bd.addEventListener('click',e=>{ if(e.target===bd) bd.classList.remove('open'); });
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      document.querySelectorAll('.modal-backdrop.open').forEach(el=>el.classList.remove('open'));
      hideContextMenu();
    }
  });
}

// ─────────────────────────────────────────────
