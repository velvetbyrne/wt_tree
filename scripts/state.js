/**
 * WAR THUNDER TECH TREE MAKER — app.js v3
 *
 * Fixes & new features:
 *  - Reset button with confirm dialog
 *  - Thicker arrows (handled in CSS via stroke-width)
 *  - Manufacturer field (popup-only)
 *  - Folder rename (custom name override)
 *  - Column drag-and-drop reorder
 *  - Branch columns now rendered (cross-column arrows via SVG overlay)
 *  - No arrows on premium columns
 *  - Screenshot mode
 *  - Name + BR top-right, image below header text
 *  - Multi-image upload with carousel & captions
 */

// ─────────────────────────────────────────────
// DATA MODEL
// ─────────────────────────────────────────────
let state = {
  columns: [
    { id:'c1', name:'Fighters',  type:'research', tracks:[{id:'t1',name:'Fighters 1'},{id:'t_1_1773989444188',name:'Fighters 2'}] },
    { id:'c2', name:'Attackers', type:'research', tracks:[{id:'t1',name:'Attackers'}] },
    { id:'c3', name:'Bombers',   type:'research', tracks:[{id:'t_2_1773989445074',name:'Bombers'}] },
    { id:'c4', name:'Premium',   type:'premium',  tracks:[{id:'t1',name:''},{id:'t_3_1773989446244',name:'Track 2'}] },
  ],
  sections: [
    { id:'s1', name:'Rank I'   },
    { id:'s2', name:'Rank II'  },
    { id:'s_4_1774000011521', name:'Rank III'  },
    { id:'s_5_1774000014208', name:'Rank IV'   },
    { id:'s_6_1774000016455', name:'Rank V'    },
    { id:'s_7_1774000018709', name:'Rank VI'   },
    { id:'s_8_1774000021924', name:'Rank VII'  },
    { id:'s_9_1774000026183', name:'Rank VIII' },
  ],
  vehicles:    {},
  folders:     {},
  grid: {
    s1:                {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s2:                {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s_4_1774000011521: {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s_5_1774000014208: {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s_6_1774000016455: {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s_7_1774000018709: {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s_8_1774000021924: {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
    s_9_1774000026183: {c1:{t1:[],t_1_1773989444188:[]},c2:{t1:[]},c3:{t_2_1773989445074:[]},c4:{t1:[],t_3_1773989446244:[]}},
  },
  connections: {},
  arrowColor: '#6a8ea0',
  title: '',
};

let nextId = 1;
function uid(p){ return `${p}_${nextId++}_${Date.now()}`; }

let screenshotMode = false;
let carouselIndex  = 0;  // current slide in open vehicle modal
