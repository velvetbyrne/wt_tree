// STORAGE
// ─────────────────────────────────────────────
function saveToStorage(){
  try{ localStorage.setItem('wt_tree_state_v3', JSON.stringify(state)); }catch(e){}
}
function loadFromStorage(){
  try{
    const raw = localStorage.getItem('wt_tree_state_v3')
             || localStorage.getItem('wt_tree_state'); // migrate old key
    if(!raw) return;
    const d = JSON.parse(raw);
    state.columns     = d.columns     || state.columns;
    state.sections    = d.sections    || state.sections;
    state.vehicles    = d.vehicles    || {};
    state.folders     = d.folders     || {};
    state.grid        = d.grid        || {};
    state.connections = d.connections || {};
    // Migrate old single-image vehicles to images array
    Object.values(state.vehicles).forEach(v=>{
      if(!v.images){
        v.images = v.img ? [{src:v.img, caption:''}] : [];
        delete v.img;
      }
    });
    migrateGrid();
    syncGrid();
    if(!state.arrowColor) state.arrowColor='#6a8ea0';
    if(!state.title) state.title='';
    // Sync nextId
    [...state.columns.map(c=>c.id), ...state.sections.map(s=>s.id),
     ...Object.keys(state.vehicles), ...Object.keys(state.folders)].forEach(id=>{
       const n = parseInt((id.split('_')[1])||'0');
       if(!isNaN(n) && n>=nextId) nextId = n+1;
     });
  }catch(e){}
}
function syncGrid(){
  // Ensure every column has at least 1 track
  state.columns.forEach(col=>{
    if(!col.tracks||!col.tracks.length) col.tracks=[{id:'t1',name:''}];
  });
  state.sections.forEach(sec=>{
    if(!state.grid[sec.id]) state.grid[sec.id]={};
    state.columns.forEach(col=>{
      if(!state.grid[sec.id][col.id]) state.grid[sec.id][col.id]={};
      col.tracks.forEach(tr=>{
        if(!state.grid[sec.id][col.id][tr.id]) state.grid[sec.id][col.id][tr.id]=[];
      });
    });
  });
}

// Migration: old flat grid[secId][colId]=[] → new grid[secId][colId][t1]=[]
function migrateGrid(){
  state.columns.forEach(col=>{
    if(!col.tracks||!col.tracks.length) col.tracks=[{id:'t1',name:''}];
  });
  state.sections.forEach(sec=>{
    if(!state.grid[sec.id]) return;
    state.columns.forEach(col=>{
      const cell=state.grid[sec.id][col.id];
      if(Array.isArray(cell)){
        // Old flat format — wrap into t1
        state.grid[sec.id][col.id]={t1:cell};
      }
    });
  });
}

// ─────────────────────────────────────────────
// RESET
// ─────────────────────────────────────────────
function bindReset(){
  document.getElementById('btnReset').addEventListener('click',()=>{
    if(!confirm('Reset the entire tech tree? This cannot be undone.')) return;
    state = {
      columns:[
        {id:'c1',name:'Fighters',type:'research',tracks:[{id:'t1',name:'Fighters 1'},{id:'t_1_1773989444188',name:'Fighters 2'}]},
        {id:'c2',name:'Attackers',type:'research',tracks:[{id:'t1',name:'Attackers'}]},
        {id:'c3',name:'Bombers',type:'research',tracks:[{id:'t_2_1773989445074',name:'Track 2'}]},
        {id:'c4',name:'Premium',type:'premium',tracks:[{id:'t1',name:''},{id:'t_3_1773989446244',name:'Track 2'}]},
      ],
      sections:[
        {id:'s1',name:'Rank I'},{id:'s2',name:'Rank II'},
        {id:'s_4_1774000011521',name:'Rank III'},{id:'s_5_1774000014208',name:'Rank IV'},
        {id:'s_6_1774000016455',name:'Rank V'},{id:'s_7_1774000018709',name:'Rank VI'},
        {id:'s_8_1774000021924',name:'Rank VII'},{id:'s_9_1774000026183',name:'Rank VIII'},
      ],
      vehicles:{}, folders:{},
      grid:{
        s1:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s2:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s_4_1774000011521:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s_5_1774000014208:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s_6_1774000016455:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s_7_1774000018709:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s_8_1774000021924:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
        s_9_1774000026183:{c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[],t_38_1774108061189:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
      },
      connections:{},
        };
    nextId=1;
    saveToStorage();
    renderAll();
  });
}

// ─────────────────────────────────────────────
// SCREENSHOT MODE
// ─────────────────────────────────────────────
let hideLabelsMode = false;
