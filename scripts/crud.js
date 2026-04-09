// IMAGE HELPERS
// ─────────────────────────────────────────────
function readFilesAsDataURLs(files){
  return Promise.all([...files].map(f=>new Promise(res=>{
    const r=new FileReader();
    r.onload=ev=>res({src:ev.target.result,caption:''});
    r.readAsDataURL(f);
  })));
}

function parseUrlLines(text){
  return text.split('\n').map(s=>s.trim()).filter(Boolean).map(src=>({src,caption:''}));
}

// ─────────────────────────────────────────────
