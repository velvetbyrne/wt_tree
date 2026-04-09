// CONTEXT MENU
// ─────────────────────────────────────────────
function showContextMenu(e,items){
  const menu=document.getElementById('contextMenu');
  const list=document.getElementById('contextMenuList');
  list.innerHTML='';
  items.forEach(item=>{
    if(item.sep){ const li=document.createElement('li');li.className='ctx-sep';list.appendChild(li);return; }
    const li=document.createElement('li'); li.textContent=item.label;
    if(item.cls) li.classList.add(item.cls);
    li.addEventListener('click',()=>{hideContextMenu();item.action();});
    list.appendChild(li);
  });
  const x=Math.min(e.clientX,window.innerWidth-190);
  const y=Math.min(e.clientY,window.innerHeight-(items.length*30+20));
  menu.style.left=x+'px'; menu.style.top=y+'px';
  menu.classList.add('open');
}
function hideContextMenu(){ document.getElementById('contextMenu').classList.remove('open'); }
function bindContextMenuDismiss(){
  document.addEventListener('click',e=>{ if(!e.target.closest('#contextMenu')) hideContextMenu(); });
  document.addEventListener('contextmenu',e=>{
    if(!e.target.closest('.vehicle-card')&&!e.target.closest('.folder-open-card')) hideContextMenu();
  });
}
