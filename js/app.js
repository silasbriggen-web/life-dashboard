(function(){
'use strict';

/* ================= helpers ================= */
const KEY='silas.life.v1';
const START='2026-11-07';
const TRACK='2026-11-09'; // points, streaks and stats count from this day (fresh start)
const $=(s,r)=>(r||document).querySelector(s);
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const ds=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const pd=s=>{const a=s.split('-').map(Number);return new Date(a[0],a[1]-1,a[2]);};
const add=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return ds(d);};
const dow=s=>(pd(s).getDay()+6)%7;
const monday=s=>add(s,-dow(s));
const T=()=>ds(new Date());
const diff=(a,b)=>Math.round((pd(b)-pd(a))/864e5);
const MON=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const fmtD=s=>DAY[dow(s)]+' '+pd(s).getDate()+' '+MON[pd(s).getMonth()];
const fmtS=s=>pd(s).getDate()+' '+MON[pd(s).getMonth()];
function isoWeek(s){const d=pd(s);d.setDate(d.getDate()+3-((d.getDay()+6)%7));const w1=new Date(d.getFullYear(),0,4);return 1+Math.round(((d-w1)/864e5-3+((w1.getDay()+6)%7))/7);}
const pnum=v=>{if(v==null)return null;const t=String(v).trim().replace(',','.');if(t==='')return null;const n=parseFloat(t);return isNaN(n)?null:n;};
const r1=n=>Math.round(n*10)/10;
const fmtT=sec=>Math.floor(sec/60)+':'+pad(Math.round(sec%60));
const parseT=v=>{const m=String(v).trim().match(/^(\d{1,2}):(\d{2})$/);return m?(+m[1])*60+(+m[2]):null;};
const chf=n=>{n=Math.round(n*100)/100;const s=n.toLocaleString('en-US',{minimumFractionDigits:(Math.round(n*100)%100===0)?0:2,maximumFractionDigits:2});return 'CHF\u00a0'+s.replace(/,/g,'’');};
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;

/* ================= constants ================= */
const CHK=[
 {id:'up',s:'Up on time',t:'Up on time, phone off until breakfast'},
 {id:'am',s:'Morning',t:'Morning routine complete'},
 {id:'tr',s:'Training',t:'Training done as planned'},
 {id:'pr',s:'Protein',t:'Protein ≥ 130 g (rough)'},
 {id:'wa',s:'Water',t:'Water: 3 bottles'},
 {id:'su',s:'Supps',t:'Supplements morning + evening'},
 {id:'le',s:'Learning',t:'Learning block (Mon–Thu)'},
 {id:'ig',s:'Instagram',t:'Instagram ≤ 30 min'},
 {id:'ev',s:'Evening',t:'Evening discipline'},
 {id:'li',s:'Lights out',t:'Lights out 22:00 ± 15 min'}
];
const PT={
 A:{t:'Strength A · squat + push',d:'06:00 kfit · about 60 min. Squat, bench, row, split squat, lateral raise, leg raise.',k:'s',tm:'A'},
 B:{t:'Strength B · pull + upper body',d:'06:00 kfit · about 60 min. Pull-ups, incline press, row, shoulder press, face pulls, arms.',k:'s',tm:'B'},
 C:{t:'Strength C · hips + full body',d:'06:00 kfit · about 60 min. RDL, leg press, dips, pulldown, calves, core.',k:'s',tm:'C'},
 FB:{t:'Football training',d:'19:00–20:20. Eat by 18:00, shower and snack after.',k:'c'},
 MATCH:{t:'Match day',d:'Play the match. Next day is rest or a very easy walk.',k:'c'},
 RIDE:{t:'Long easy ride (Zwift / road)',d:'90 min in November, building to 180 min by January. Zone 2. On match weekends: play the match instead.',k:'c'},
 RUN_E:{t:'Easy run',d:'40–60 min, Zone 2: you can speak in full sentences. Then 10 min mobility.',k:'c'},
 RUN_I:{t:'Run intervals',d:'15 min easy, 5 × 3 min hard / 2 min jog, 10 min cool-down. Below 0 °C do it indoors.',k:'c'},
 ZW_SS:{t:'Zwift sweet spot',d:'15 min warm-up, 3 × 10 min at 88–93 % FTP with 5 min easy between, 10 min cool-down.',k:'c'},
 DELOAD:{t:'Travel / deload',d:'Max. 2–3 short bodyweight sessions (25 min: push-ups, split squats, pull-ups if there is a bar). Walk a lot, keep protein and creatine.',k:'r'},
 REST:{t:'Rest day',d:'Walk, mobility, sleep.',k:'r'},
 PREP:{t:'Prep day',d:'Print the routines, order supplements, set phone limits, pack for Budapest.',k:'r'},
 TRIP:{t:'Budapest · enjoy it',d:'No training pressure. Walk a lot. On the last evening: unpack, wash, set the alarm for Saturday.',k:'r'}
};
Object.keys(PT).forEach(k=>{PT[k].id=k;});
const TEST={
 '2026-11-07':{t:'Easy ride · Zwift 60 min',d:'Zone 2. Roll out after Budapest.',k:'c'},
 '2026-11-08':{t:'Easy run · 30 min',d:'Zone 2. Gentle start.',k:'c'},
 '2026-11-09':{t:'Test day 1 · body + strength',d:'Fasted at home: weight, circumferences, 3 photos, Garmin values. 06:00 kfit: squat 5RM, bench 5RM, push-ups max. Stop a set at RPE 9, never grind.',k:'s',tests:['rhr','vo2','sq5','bp5','pushups']},
 '2026-11-10':{t:'Football + job interview',d:'Training 19:00 as normal. No test.',k:'c'},
 '2026-11-11':{t:'Test day 2 · pull + hinge',d:'06:00 kfit: pull-ups max, RDL 8RM, shoulder press 8RM, cable row 10RM, plank.',k:'s',tests:['pullups','rdl8','sp8','row10','plank']},
 '2026-11-12':{t:'Football (+ Python block)',d:'19:00–20:20. No test.',k:'c'},
 '2026-11-13':{t:'Test day 3 · athletics + FTP',d:'06:00: mobility check (table in the Training week doc) and standing jump. Evening: Zwift ramp test for your FTP.',k:'s',tests:['sj','ftp']},
 '2026-11-14':{t:'Match, or very easy 30 min',d:'If you play a match, move the 5 km test to Sat 21 Nov.',k:'c'},
 '2026-11-15':{t:'5 km test + check-in',d:'Morning: 5 km on time (flat, 15 min warm-up). 17:00: weekly check-in with all test results.',k:'c',tests:['k5']}
};
Object.keys(TEST).forEach(k=>{TEST[k].id='T'+k;});
const EX={
 A:[
  {id:'sq',wu:'bar',n:'Back squat',s:4,r:[5,8],low:1,rest:'2–3 min'},
  {id:'bp',wu:'bar',n:'Bench press (barbell)',s:4,r:[6,8],rest:'2–3 min'},
  {id:'cr',n:'Chest-supported row',s:3,r:[8,12],rest:'90 s'},
  {id:'bss',n:'Bulgarian split squat (DB, per leg)',s:3,r:[8,10],low:1,rest:'90 s'},
  {id:'lr',n:'Lateral raise',s:3,r:[12,15],rest:'60 s'},
  {id:'hlr',n:'Hanging leg raise',s:3,r:[10,15],bw:1,rest:'60 s'}],
 B:[
  {id:'pu',n:'Pull-ups (added weight)',s:4,r:[5,8],bw:1,rest:'2–3 min'},
  {id:'idb',wu:'db',n:'Incline DB press (30°)',s:4,r:[8,10],rest:'2 min'},
  {id:'cab',n:'Seated cable row',s:3,r:[8,10],rest:'90 s'},
  {id:'sp',n:'Seated DB shoulder press',s:3,r:[8,10],rest:'90 s'},
  {id:'fp',n:'Face pulls',s:3,r:[12,15],rest:'60 s'},
  {id:'cp',n:'Curls + triceps pushdown (superset)',s:3,r:[10,12],rest:'60 s'}],
 C:[
  {id:'rdl',wu:'bar',n:'Romanian deadlift',s:4,r:[6,8],low:1,rest:'2–3 min'},
  {id:'lp',n:'Leg press',s:3,r:[10,12],low:1,rest:'2 min'},
  {id:'dip',n:'Dips (added weight)',s:3,r:[6,10],bw:1,rest:'2 min'},
  {id:'lat',n:'Close-grip lat pulldown',s:3,r:[10,12],rest:'90 s'},
  {id:'calf',n:'Standing calf raise',s:3,r:[12,15],low:1,rest:'60 s'},
  {id:'pal',n:'Pallof press / plank (seconds)',s:3,r:[30,45],sec:1,rest:'60 s'}]
};
const TNAME={A:'Squat + push',B:'Pull + upper body',C:'Hips + full body'};
const EXALL={};['A','B','C'].forEach(k=>EX[k].forEach(e=>{EXALL[e.id]=e;}));
const BM2EX={sq5:'sq',bp5:'bp',rdl8:'rdl',sp8:'sp',row10:'cab'};
const BM=[
 {id:'sq5',n:'Back squat 5RM',u:'kg',reps:5,base:'Before RS: about 80 kg (1 rep max)'},
 {id:'bp5',n:'Bench press 5RM',u:'kg',reps:5,base:'Before RS: about 70 kg (1 rep max)'},
 {id:'rdl8',n:'Romanian deadlift 8RM',u:'kg',reps:8},
 {id:'sp8',n:'DB shoulder press 8RM',u:'kg per hand',reps:8},
 {id:'row10',n:'Cable row 10RM',u:'kg',reps:10},
 {id:'pullups',n:'Pull-ups max',u:'reps',base:'Before RS: 8 clean reps'},
 {id:'pushups',n:'Push-ups max',u:'reps'},
 {id:'plank',n:'Plank',u:'sec'},
 {id:'sj',n:'Standing jump',u:'cm'},
 {id:'ftp',n:'Zwift FTP',u:'W'},
 {id:'k5',n:'5 km time',u:'m:ss',time:1,low:1,base:'Garmin forecast 21:43. Goal: under 22:00 by January, under 21:00 by summer.'},
 {id:'vo2',n:'VO₂max (Garmin)',u:''},
 {id:'rhr',n:'Resting heart rate',u:'bpm',low:1}
];
const BMD={};BM.forEach(b=>{BMD[b.id]=b;});
const LW=[
 {n:1,s:'2026-11-09',days:[1,2,3],topic:'Variables, data types, input, if/else',proj:'Protein calculator: body weight → daily and per-meal protein target'},
 {n:2,s:'2026-11-16',days:[4,5],topic:'Lists, random, for loops',proj:'Pace calculator: time + distance → min/km and 5 / 10 km predictions'},
 {n:3,s:'2026-11-23',days:[7,8],topic:'Functions with parameters, while loops (day 6 optional)',proj:'1RM calculator: weight × reps → estimated max, table at 70–90 %'},
 {n:4,s:'2026-11-30',days:[9,10],topic:'Dictionaries, return values',proj:'Logbook v1: enter exercises and sets in the terminal, stored as a dictionary'},
 {n:5,s:'2026-12-07',days:[12,15],topic:'Scope, planning a program step by step',proj:'Savings calculator: monthly amount, return, years → final amount with compounding'},
 {n:6,s:'2026-12-14',days:[16,17],topic:'Object-oriented programming: classes, objects, methods',proj:'Logbook v2: classes Exercise and Workout'},
 {n:7,s:'2026-12-21',days:[24],topic:'Reading and writing files, paths',proj:'Logbook v3: saves every workout to a text file'},
 {n:8,s:'2026-12-28',days:[],topic:'New Year trip: free week, or just review',proj:null},
 {n:9,s:'2027-01-04',days:[25,26],topic:'CSV, pandas basics, list/dict comprehensions',proj:'Logbook v4: CSV file + average and best per exercise with pandas'},
 {n:10,s:'2027-01-11',days:[30,32],topic:'Error handling, JSON, e-mail with smtplib, datetime',proj:'Sunday mail: a script e-mails you a weekly summary from the logbook'},
 {n:11,s:'2027-01-18',days:[33,35],topic:'APIs, requests, API keys, environment variables',proj:'Morning briefing: weather for Thun (Open-Meteo, free) + today’s workout by e-mail'},
 {n:12,s:'2027-01-25',days:[37,38],topic:'POST/PUT requests, workout tracking with Google Sheets',proj:'Digital tracker: the weekly tracker as a table, points counted automatically'},
 {n:13,s:'2027-02-01',days:[45,47],topic:'Web scraping with BeautifulSoup, price tracker',proj:'Supplement price tracker: alerts when whey or creatine gets cheaper'},
 {n:14,s:'2027-02-08',days:[72,73],topic:'pandas analysis, charts with Matplotlib',proj:'Finance tracker: bank CSV (BEKB / Yuh), spending by category, savings-rate chart'}
];
let COURSE_TOTAL=LW.reduce((a,w)=>a+w.days.length,0);
let PROJ_TOTAL=LW.filter(w=>w.proj).length;
const KINDS=['Zwift ride','Road ride','Run','Football training','Match','Swim','Walk / hike','Other'];
const PLAN_OPTS=['A','B','C','FB','MATCH','RIDE','RUN_E','RUN_I','ZW_SS','REST'];
/* ---------- plan overrides (from your Claude project, see More → Claude) ----------
   The built-in plan above is the default. state.custom can replace or add session templates, strength exercises,
   the weekly rhythm (also in phases from a date on), fuel tips, the learning plan and a plan note.
   It lives in your private data (synced), not in this public code. Applied on load and after every sync. */
const DEF={PT:JSON.parse(JSON.stringify(PT)),EX:JSON.parse(JSON.stringify(EX)),TNAME:Object.assign({},TNAME),LW:JSON.parse(JSON.stringify(LW)),PLAN_OPTS:PLAN_OPTS.slice()};
const WEEK_FB=['A','FB','B','FB','C','RIDE','RUN_E'],WEEK_NOFB=['A','RUN_I','B','ZW_SS','C','RIDE','RUN_E'];
function applyCustom(){
  const c=(typeof state!=='undefined'&&state&&state.custom)||{};
  const cp=o=>JSON.parse(JSON.stringify(o));
  Object.keys(PT).forEach(k=>delete PT[k]);
  Object.keys(DEF.PT).forEach(k=>{PT[k]=cp(DEF.PT[k]);});
  Object.keys(c.sessions||{}).forEach(k=>{const v=c.sessions[k];if(v&&v.t)PT[k]=Object.assign({},PT[k]||{},cp(v),{id:k});});
  Object.keys(EX).forEach(k=>delete EX[k]);
  Object.keys(DEF.EX).forEach(k=>{EX[k]=cp(DEF.EX[k]);});
  Object.keys(c.exercises||{}).forEach(k=>{if(Array.isArray(c.exercises[k])&&c.exercises[k].length)EX[k]=cp(c.exercises[k]);});
  Object.keys(TNAME).forEach(k=>delete TNAME[k]);Object.assign(TNAME,DEF.TNAME);
  Object.keys(EX).forEach(k=>{
    if(!TNAME[k]||(c.sessions&&c.sessions[k]))TNAME[k]=(PT[k]&&PT[k].t&&PT[k].t.indexOf(' · ')>0?PT[k].t.split(' · ').slice(1).join(' · '):'')||TNAME[k]||'Strength '+k;
    if(PT[k]&&PT[k].k==='s'&&!PT[k].tm)PT[k].tm=k;
  });
  Object.keys(EXALL).forEach(k=>delete EXALL[k]);
  Object.keys(EX).forEach(k=>EX[k].forEach(e=>{EXALL[e.id]=e;}));
  LW.length=0;(Array.isArray(c.learn)&&c.learn.length?c.learn:DEF.LW).forEach(w=>LW.push(cp(w)));
  COURSE_TOTAL=LW.reduce((a,w)=>a+(w.days||[]).length,0);PROJ_TOTAL=LW.filter(w=>w.proj).length;
  PLAN_OPTS.length=0;DEF.PLAN_OPTS.concat(Object.keys(c.sessions||{})).forEach(k=>{if(PT[k]&&PLAN_OPTS.indexOf(k)<0&&['PREP','TRIP','DELOAD'].indexOf(k)<0)PLAN_OPTS.push(k);});
}
/* the weekly rhythm for day s: the latest phase that has started, else the custom week, else the built-in one */
function weekFor(s){
  const c=state.custom||{},fb=s<state.settings.footballEnd;
  let w=c.week?{week:c.week,weekAfterFootball:c.weekAfterFootball}:null;
  (c.phases||[]).filter(p=>p&&p.from&&p.from<=s).sort((a,b)=>a.from<b.from?-1:1).forEach(p=>{w=p;});
  const pick=w?(fb?w.week:(w.weekAfterFootball||w.week)):null;
  return Array.isArray(pick)&&pick.length===7?pick:(fb?WEEK_FB:WEEK_NOFB);
}
const fuelFor=p=>p.fuel||((state.custom||{}).fuel||{})[p.id]||FUEL[p.id]||'';
const ICONS={
 today:'<circle cx="10" cy="10" r="8"/><path d="M6 10.2l2.7 2.8L14 7.2"/>',
 cal:'<rect x="3" y="4" width="14" height="13" rx="2"/><path d="M3 8.5h14M7 2.5v3M13 2.5v3"/>',
 week:'<rect x="3" y="3" width="14" height="14" rx="2"/><path d="M3 8h14M3 12.5h14M8.5 8v9"/>',
 train:'<path d="M2.5 10h15M5 6v8M15 6v8M3 8v4M17 8v4"/>',
 prog:'<path d="M2 15l5-5 3 3 7.5-8.5"/>',
 learn:'<path d="M7 6l-4 4 4 4M13 6l4 4-4 4"/>',
 more:'<circle cx="4.5" cy="10" r="1.2"/><circle cx="10" cy="10" r="1.2"/><circle cx="15.5" cy="10" r="1.2"/>',
 todo:'<path d="M3.5 5.5l1.5 1.5 2.5-3M3.5 11.5l1.5 1.5 2.5-3M10 6h6.5M10 12h6.5M3.5 16.5h13"/>',
 review:'<path d="M4 16l1-4L13.5 3.5a1.5 1.5 0 012 2L7 14l-3 2zM11.5 5.5l2 2"/>',
 money:'<circle cx="10" cy="10" r="7.5"/><path d="M12.5 7.3c-.6-.8-1.5-1.2-2.5-1.2-1.4 0-2.5.8-2.5 1.9 0 2.6 5 1.4 5 4 0 1.1-1.1 1.9-2.5 1.9-1.1 0-2-.4-2.6-1.2M10 4.5v11"/>',
 stock:'<path d="M3 6.5L10 3l7 3.5v7L10 17l-7-3.5zM3 6.5l7 3.5 7-3.5M10 10v7"/>',
 claude:'<path d="M10 2.5l1.6 4.4 4.4 1.6-4.4 1.6L10 14.5l-1.6-4.4L4 8.5l4.4-1.6zM15.5 13l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
 gear:'<circle cx="10" cy="10" r="2.6"/><path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1L4.7 4.7"/>'
};
const TABS=[['today','Today'],['cal','Plan'],['train','Train'],['prog','Progress'],['more','More']];

const RW_DEF=[['w1','What was my biggest win this week?'],['w2','What cost me the most time or energy?'],['w3','What did I learn (training, Python, life)?'],['w4','How are my body, sleep and energy? (numbers are above)'],['w5','How are things with my girlfriend, family and friends?'],['w6','What is the one thing I change next week?'],['w7','My 3 goals for next week']];
const RM_DEF=[['m1','What am I proudest of this month?'],['m2','Biggest time or energy drain?'],['m3','How do I look and feel? (photos, measurements, mirror)'],['m4','Strength and endurance: what moved, what stalled?'],['m5','Python and learning: what did I build?'],['m6','Money: did I save what I planned?'],['m7','Relationships and free time'],['m8','What do I start, stop and keep?'],['m9','One system change for next month'],['m10','Main focus for next month']];
/* ================= state ================= */
let storageOK=true;
function defaults(){return{
 v:1,
 settings:{theme:'auto',footballEnd:'2026-12-07',startWeight:74,lastExport:null,schedOpen:true,revW:RW_DEF.map(x=>({id:x[0],q:x[1]})),revM:RM_DEF.map(x=>({id:x[0],q:x[1]})),work:{on:false,start:'08:00',end:'17:00'}},
 events:[],hiddenFixed:{},reviews:{},
 supp:[{id:'cr',n:'Creatine',unit:'g',stock:1000,use:5,date:'2026-11-07'},{id:'wh',n:'Whey and protein powders',unit:'g',stock:4048,use:40,date:'2026-11-07'},{id:'om',n:'Omega-3',unit:'capsules',stock:240,use:2,date:'2026-11-07'},{id:'mg',n:'Magnesium',unit:'capsules',stock:240,use:2,date:'2026-11-07'},{id:'d3',n:'Vitamin D3 + K2',unit:'drops',stock:null,use:null,date:'2026-11-07'}],
 days:{},weights:{},measures:[],
 bench:{vo2:[{date:'2026-10-31',v:57,note:'Garmin value, before the plan'}]},
 sessions:[],targets:{},weeks:{},
 learn:{days:{},projects:{}},
 /* Personal balances are not part of the public code: they come from your backup or the cloud sync. */
 money:{shown:false,snaps:[],calc:{net:null,life:400,tax:7,study:150},accounts:[
  {name:'Private account',bal:null,target:null},
  {name:'Savings · travel',bal:null,target:4000},
  {name:'Savings · emergency fund',bal:null,target:3000},
  {name:'Study start fund',bal:null,target:1500},
  {name:'ETF · equities',bal:null,target:null},
  {name:'ETF · bonds',bal:null,target:null}
 ]},
 countdowns:[
  {label:'Plan starts',date:'2026-11-07'},
  {label:'New Year trip',date:'2026-12-26'},
  {label:'University starts (approx., edit)',date:'2027-09-20'}
 ],
 todos:[],
 goals:[
  {id:'g1',t:'5 km under 22:00',k:'bench',b:'k5',target:1320,by:'2027-01-31',created:'2026-11-07'},
  {id:'g2',t:'5 km under 21:00',k:'bench',b:'k5',target:1260,by:'2027-06-30',created:'2026-11-07'},
  {id:'g3',t:'Python course finished',k:'learn',target:COURSE_TOTAL,by:'2027-02-14',created:'2026-11-07'}
 ],
 gsrc:{},gdel:{},
 tomb:{} // ids of deleted to-dos, appointments and sessions, so a sync merge does not bring them back
};}
function load(){
  try{localStorage.setItem(KEY+'.probe','1');localStorage.removeItem(KEY+'.probe');}catch(e){storageOK=false;return null;}
  try{const s=localStorage.getItem(KEY);if(s)return JSON.parse(s);}catch(e){}
  return null;
}
const hooks={save:[]};
function saveLocal(){try{localStorage.setItem(KEY,JSON.stringify(state));}catch(e){storageOK=false;}}
function save(){saveLocal();hooks.save.forEach(f=>{try{f();}catch(e){}});}
let state=load()||defaults();
function migrate(){
  const d=defaults();
  Object.keys(d).forEach(k=>{if(state[k]==null)state[k]=d[k];});
  ['settings','learn','money'].forEach(k=>{Object.keys(d[k]).forEach(kk=>{if(state[k][kk]==null)state[k][kk]=d[k][kk];});});
  freshStart();
  // done to-dos older than 30 days are removed for good (they are hidden after one day anyway)
  if(Array.isArray(state.todos))state.todos=state.todos.filter(x=>!x.done||x.done>=add(T(),-30));
  Object.keys(state.tomb||{}).forEach(k=>{if(state.tomb[k]<add(T(),-120))delete state.tomb[k];});
  applyCustom();
}
const tombstone=id=>{state.tomb=state.tomb||{};state.tomb[id]=T();};
/* One-time fresh start: everything entered before TRACK goes (checks, notes, sessions, tests, reviews, measurements),
   while values that Garmin or the scale filled in stay. Runs once per data set; the flag travels with the sync,
   so the other device does the same when it loads the old copy. Money, stock, appointments, goals and to-dos are kept. */
function freshStart(){
  if(state.settings.fresh===TRACK)return;
  const g=state.gsrc||{};
  Object.keys(state.days).forEach(k=>{
    if(k>=TRACK)return;
    const sl=state.days[k]&&state.days[k].sleep;
    if(sl!=null&&g['days|'+k+'|sleep'])state.days[k]={sleep:sl};else delete state.days[k];
  });
  Object.keys(state.weights).forEach(k=>{if(k<TRACK&&!g['weights|'+k])delete state.weights[k];});
  state.sessions=state.sessions.filter(z=>z.date>=TRACK||z.gid);
  Object.keys(state.bench).forEach(id=>{state.bench[id]=(state.bench[id]||[]).filter(e=>e.date>=TRACK||e.g||/garmin/i.test(e.note||''));});
  state.measures=state.measures.filter(x=>x.date>=TRACK);
  Object.keys(state.weeks).forEach(k=>{if(k<TRACK)delete state.weeks[k];});
  Object.keys(state.reviews).forEach(k=>{const dt=k.slice(2);if(k[0]==='w'?dt<TRACK:dt<TRACK.slice(0,7))delete state.reviews[k];});
  state.settings.fresh=TRACK;
}
migrate();
let qt=null;
const queueSave=()=>{clearTimeout(qt);qt=setTimeout(save,250);};
const ui={tab:'today',date:T(),cw:monday(T()),wAny:null,feel:false,misc:false,pmode:'sched',rmode:'w',rmon:T().slice(0,8)+'01',mmode:'learn',grp:{},sopen:null,revEdit:false,rv:'',cm:T().slice(0,8)+'01',cdate:T(),modal:null,wm:monday(T()),tmode:'A',armed:null,at:null,ci:'',mo:'',bopen:null,lopen:null,boxToday:T()};

function getPath(p){return p.split('|').reduce((o,k)=>o==null?o:o[k],state);}
function setPath(p,v){
  const ks=p.split('|');let o=state;
  for(let i=0;i<ks.length-1;i++){
    const k=ks[i];
    if(o[k]==null||typeof o[k]!=='object')o[k]=/^\d+$/.test(ks[i+1])?[]:{};
    o=o[k];
  }
  o[ks[ks.length-1]]=v;
}

/* ================= plan + scoring ================= */
function planAuto(s){
  if(TEST[s])return TEST[s];
  if(s<'2026-11-01')return PT.PREP;
  if(s<START)return PT.TRIP;
  if(s>='2026-12-26'&&s<='2027-01-01')return PT.DELOAD;
  const fb=s<state.settings.footballEnd;
  return PT[weekFor(s)[dow(s)]]||PT[(fb?WEEK_FB:WEEK_NOFB)[dow(s)]];
}
function planFor(s){
  const o=(state.days[s]||{}).plan;
  return (o&&PT[o])?PT[o]:planAuto(s);
}
function sessHasData(z){
  if(z.type==='cardio')return true;
  return Object.keys(z.sets||{}).some(k=>(z.sets[k]||[]).some(x=>x&&x.reps!=null));
}
function testsLogged(s){
  return Object.keys(state.bench).some(id=>(state.bench[id]||[]).some(e=>e.date===s&&s>=START&&!e.g)); // Garmin imports (g) are not a workout
}
function dayChecks(s){
  const c=(state.days[s]||{}).c||{},p=planFor(s),out={};
  CHK.forEach(x=>{out[x.id]={on:!!c[x.id],auto:false};});
  out.wa={on:(+((state.days[s]||{}).water)||0)>=3,auto:false};
  if(state.sessions.some(z=>z.date===s&&sessHasData(z))||testsLogged(s))out.tr={on:true,auto:true};
  else if(p.k==='r')out.tr={on:true,auto:true};
  if(dow(s)>=4||(s>='2026-12-26'&&s<='2027-01-01'))out.le={on:true,auto:true};
  return out;
}
const cnt=c=>CHK.filter(x=>c[x.id].on).length;
const weekDays=m=>[0,1,2,3,4,5,6].map(i=>add(m,i));
const dayScore=s=>s<TRACK?null:cnt(dayChecks(s));
function weekScore(m){
  let sc=0,mx=0;const t=T();
  weekDays(m).forEach(s=>{const d=dayScore(s);if(d!=null){mx+=10;if(s<=t)sc+=d;}});
  return{sc,mx,goal:Math.round(mx*55/70)};
}
function wAvg(m){return avg(weekDays(m).map(s=>state.weights[s]).filter(v=>v!=null));}
function dayStat(m,f){return avg(weekDays(m).map(s=>((state.days[s]||{})[f])).filter(v=>v!=null));}
function streaks(){
  const t=T();
  const defs=[
   {k:'Strength sessions',sched:s=>planFor(s).k==='s',done:s=>dayChecks(s).tr.on},
   {k:'Learning blocks',sched:s=>dow(s)<=3&&s>='2026-11-09',done:s=>dayChecks(s).le.on},
   {k:'Instagram limit',sched:()=>true,done:s=>dayChecks(s).ig.on}
  ];
  return defs.map(d=>{
    let run=0,best=0;
    for(let s=TRACK;s<=t;s=add(s,1)){
      if(!d.sched(s))continue;
      if(d.done(s)){run++;if(run>best)best=run;}
      else if(s!==t)run=0;
    }
    return{k:d.k,cur:run,best};
  });
}
/* ---------- side quests: 3 optional life-optimisation challenges per day ----------
   The pick is fixed per date (same on every device), from 3 different categories, never yesterday's.
   Each quest: [id, title, how, category, flag, why, when]. Flags: we = weekend only, wd = weekdays only.
   They don't count towards the day's points. Ids never change, so old ticks keep counting. */
const SQ=[
 // body
 ['cold','Cold shower','Finish your shower with 2 minutes as cold as it goes. Breathe out long and slow, don’t hold your breath.','body','','A strong lift in alertness and mood for 1–3 hours, and practice in staying calm when something is unpleasant.','Morning. Not in the 6 hours after a strength session: cold right after lifting dampens the muscle-building signal.'],
 ['plunge','Ice bath','2–4 minutes up to the chest in a lake, river or a tub with ice. Get out when the shivering gets strong.','body','we','A big release of noradrenaline and dopamine (focus and mood for hours) and less soreness after hard endurance days.','Morning, or after a long ride or run – not after strength training. Never alone in open water. Warm up by moving, not with a hot shower straight away.'],
 ['sun','Morning light','10 minutes outside within 30 minutes of waking, no sunglasses. On grey days 20 minutes.','body','','Sets your body clock: more awake during the day, sleepier at the right time tonight.','In the first hour after waking. Combine it with the walk to the station or a coffee on the balcony.'],
 ['walk','Walk after lunch','10–15 minutes of easy walking right after eating.','body','','Flattens the blood-sugar spike, helps digestion and beats the afternoon dip.','Right after lunch (or dinner).'],
 ['mob','Mobility 10 min','Hips, upper back and ankles: 90/90 hip switches, cat-cow, deep squat hold, wall ankle stretch.','body','','Keeps squat and running technique clean and prevents the small niggles that stop training.','Evening, or as a warm-up before training.'],
 ['stairs','Stairs only','No lifts or escalators all day, whatever the floor.','body','','Free extra movement and a little leg and heart work without planning anything.','All day.'],
 ['steps','12 000 steps','Easy steps on top of training. Garmin counts them for you.','body','','Easy movement speeds up recovery, helps sleep and lifts mood – without adding fatigue.','Spread over the day: walk calls, get off one stop early.'],
 ['stretch','Stretch before bed','10 calm minutes: hamstrings, hip flexors, chest, slow breathing.','body','','Calms the nervous system so you fall asleep faster; long-term more mobility.','The last 30 minutes before lights out.'],
 ['hang','Dead hang 3 × 30 s','Hang from a bar with straight arms, shoulders gently active.','body','','Grip strength (helps pull-ups and deadlifts) and healthier shoulders.','Any time you pass a bar; not right before a heavy pull day.'],
 ['squat5','5 minutes in a deep squat','Collect 5 minutes in a deep squat over the day, heels down (hold something if needed).','body','','Opens hips and ankles – the positions that desk days slowly take away.','In short bits: while brushing teeth, on a call, watching something.'],
 ['sauna','Sauna','2–3 rounds of 10–15 minutes, cool down and drink between rounds.','body','we','Deep relaxation, better sleep and a cardiovascular workout while sitting still.','Evening or a rest day. Not with a cold or right after a very hard session.'],
 ['sleep9','9 hours in bed','Be in bed 9 hours before your alarm. Screens off, room cool and dark.','body','','Sleep is your biggest lever for strength, endurance, mood and learning – more than any supplement.','Tonight: work backwards from the alarm and set a “go to bed” reminder.'],
 ['eyes','20-20-20 for your eyes','During screen time: every 20 minutes look 20 m away for 20 seconds.','body','wd','Less eye strain and fewer headaches on long screen days.','Work and study blocks.'],
 ['posture','Hourly posture reset','Every hour: stand up, roll the shoulders back, 5 deep breaths, 10 squats.','body','wd','Breaks up long sitting – back, neck and energy stay better.','Set an hourly reminder for the working day.'],
 ['nap20','Power nap 20 min','Lie down, eyes closed, alarm at 20 minutes – even if you don’t fall asleep.','body','','Restores alertness and reaction time without the grogginess of a long nap.','Between 13:00 and 15:00. Not after 16:00 or it costs night sleep.'],
 // food
 ['nosug','No added sugar','No sweets, soft drinks or desserts today. Fruit is fine.','food','','Steadier energy, fewer cravings tomorrow, and you notice how often sugar sneaks in.','All day – plan a sweet alternative (fruit, yoghurt) for the usual moments.'],
 ['nocaf','No caffeine after 13:00','Last coffee, cola or energy drink before 13:00.','food','','Caffeine stays in your body for 6+ hours: deeper sleep tonight, even if you fall asleep fine.','From 13:00 on.'],
 ['veg','Veggies at every meal','Something green or colourful with breakfast, lunch and dinner.','food','','Fibre and micronutrients for recovery and digestion; easier to eat enough without junk.','Every meal – breakfast is the hard one: cucumber, tomatoes, spinach in eggs.'],
 ['prob','40 g protein breakfast','Eggs, skyr, cottage cheese, a shake – reach 40 g at breakfast.','food','','Makes the 130 g/day goal easy, keeps you full until lunch and supports muscle gain.','Breakfast.'],
 ['colors','Eat 5 colours','Fruit and veg in 5 different colours today.','food','','Different colours mean different micronutrients and antioxidants.','Spread over the day; berries and peppers make it easy.'],
 ['home','No takeaway today','Every meal homemade or from the canteen salad bar – no fast food, no delivery.','food','','You control protein, fat and salt, and it saves money.','All day. Decide lunch the evening before.'],
 ['nojunk','No ultra-processed snacks','No chips, sweets, energy bars or packaged pastries.','food','','Better appetite control and steadier energy – snacks are where most hidden calories hide.','All day. Have nuts, fruit or skyr ready instead.'],
 ['fish','Fish or omega-3 meal','Salmon, sardines, mackerel or trout for one meal.','food','','Omega-3 fats support heart, joints, brain and recovery.','Lunch or dinner.'],
 ['slow','Slow dinner','20 minutes for dinner, no screen, put the fork down between bites.','food','','Better digestion and you notice when you’re full.','Dinner.'],
 ['prep','Meal prep','Cook protein and a carb for the next 2–3 days and portion it.','food','we','Saves time and money and makes eating enough protein automatic on busy days.','Sunday afternoon is ideal.'],
 ['newveg','A vegetable you never buy','Buy and cook one vegetable you normally ignore.','food','','More variety for your gut and you might find a new favourite.','Grocery shopping today.'],
 ['water3','3 bottles by 16:00','All three bottles (2.25 l) before 16:00.','food','','Even mild dehydration lowers focus and training performance; front-loading avoids night-time toilet trips.','Morning and early afternoon.'],
 ['noalc','No alcohol this weekend','Not a drop, even at parties – a fun drink without alcohol is fine.','food','we','Alcohol wrecks sleep quality and recovery for 1–2 nights, even in small amounts.','Friday to Sunday.'],
 ['newfood','Try a new food','Order or cook something you have never eaten.','food','','Curiosity and variety – and a story to tell.','Lunch or dinner.'],
 // mind
 ['med','Meditate 15 min','Sit, eyes closed, follow the breath. When thoughts come, notice and return. An app is fine.','mind','','Trains attention and lowers stress; after a few weeks you react calmer.','Morning before the phone, or after training.'],
 ['journ','Journal one page','What happened, what you felt, what you learned.','mind','','Writing clears your head and shows patterns you don’t see otherwise.','Evening.'],
 ['grat','3 things you are grateful for','Write down 3 specific things from today – the more concrete the better.','mind','','Shifts attention to what works; regular practice measurably improves mood.','Before sleep.'],
 ['breath','Box breathing 5 min','4 s in, 4 s hold, 4 s out, 4 s hold.','mind','','Calms the stress response within minutes – useful before exams, interviews and sleep.','Whenever you feel tense, or before something important.'],
 ['read','Read 20 pages','A book, not a feed.','mind','','Deep focus practice, new ideas and a calmer evening than scrolling.','Evening instead of the phone.'],
 ['nsdr','Yoga nidra / NSDR 20 min','Lie down and follow a yoga nidra or NSDR recording.','mind','','Restores energy almost like a nap and helps you fall asleep later.','After lunch, or when you slept badly.'],
 ['bored','10 minutes of nothing','Sit or walk 10 minutes with no input: no phone, music or podcast.','mind','','Boredom is where ideas and calm come from; it retrains your attention span.','Any time – waiting for the bus counts.'],
 ['dump','Brain dump','10 minutes: write down everything on your mind, then circle the 3 that matter.','mind','','Empties working memory; you stop carrying open loops around.','Evening, or when you feel overwhelmed.'],
 ['visual','Visualise it','5 minutes: picture tomorrow’s training, interview or exam going well, in detail.','mind','','Mental rehearsal improves performance and lowers nerves.','Evening before the event.'],
 ['scan','Body scan before sleep','10 minutes: move attention slowly from toes to head, relaxing each part.','mind','','Switches the body into rest mode – you fall asleep faster.','In bed, lights off.'],
 ['silent','15 minutes of silence','No talking, no sound, no screen for 15 minutes.','mind','','A reset for an overloaded head.','Afternoon or evening.'],
 ['wins','Write down 3 wins','3 things you did well today, however small.','mind','','Builds confidence and keeps you motivated on long plans.','Evening.'],
 ['thanks','Thank-you message','Write someone a message thanking them for something specific.','mind','','Makes them and you feel good, strengthens the relationship.','Any time today.'],
 // focus
 ['nophone2','2 hours without phone','Flight mode or phone in another room. Pick the block now.','focus','','Shows you how often you reach for it out of habit, and gives you 2 hours of real focus.','A study, work or family block.'],
 ['wake','First hour phone-free','No phone for 60 minutes after waking.','focus','','You start the day on your terms instead of in other people’s messages.','Morning – charge it outside the bedroom.'],
 ['nosoc','No social media today','Instagram, TikTok, YouTube shorts: all off.','focus','','More time, calmer head, and it resets the urge to check.','All day. Log out or move the apps off the home screen.'],
 ['deep','90 min deep work','One task, notifications off, timer on.','focus','','Hard things (Python, applications, studying) only move in long focused blocks.','Your best energy time – mostly morning.'],
 ['screens','No screens 1 h before bed','Read, stretch, talk or prepare tomorrow instead.','focus','','Less light and less stimulation: you fall asleep faster and sleep deeper.','The last hour before lights out.'],
 ['grey','Phone in greyscale','Settings → Accessibility → Display → Colour filters → Greyscale, all day.','focus','','Apps lose their pull – scrolling gets boring fast.','All day.'],
 ['dread','Do the dreaded task','The thing you keep postponing. Start with 5 minutes.','focus','','Postponed tasks cost energy every day; getting it done is a relief.','First thing in your day, before anything else.'],
 ['sab','Half-day phone sabbath','4 hours without your phone.','focus','we','A real break from being reachable – you notice the world again.','Saturday or Sunday, morning or afternoon.'],
 ['inbox','Inbox zero','Clear e-mails and messages: reply, archive or turn into a to-do.','focus','wd','Nothing important gets lost and your head is lighter.','One 30-minute block, not all day.'],
 ['single','Single-task day','One app, one tab, one task at a time – all day.','focus','','Multitasking costs time and errors; single-tasking feels slower but is faster.','All day.'],
 ['nostream','No streaming today','No YouTube, Netflix or similar – read, train, meet people instead.','focus','','Frees 1–3 hours you usually don’t notice losing.','All day.'],
 ['pomo','4 Pomodoros','4 × 25 minutes focused work, 5 minutes break between.','focus','wd','A simple structure that gets you started and keeps the pace.','Python or study time.'],
 ['notif','Notification clean-up','Turn off every notification that isn’t from a person.','focus','','Fewer interruptions every day, permanently.','15 minutes, once.'],
 ['bedph','Phone sleeps outside','The phone charges outside the bedroom tonight. Use a real alarm clock or the watch.','focus','','No late scrolling, no checking at night or first thing in the morning.','Tonight.'],
 ['block','Time-block tomorrow','Put tomorrow’s tasks as blocks in the calendar.','focus','','Decisions made in advance – tomorrow you just follow the plan.','Evening, 10 minutes.'],
 ['twomin','2-minute sweep','15 minutes: do every task that takes under 2 minutes.','focus','','Clears dozens of tiny open loops at once.','Afternoon low-energy time.'],
 ['nopod','No headphones all day','No music or podcasts on the way – just think or look around.','focus','','Space for your own thoughts; you notice more around you.','All day.'],
 // social
 ['call','Call someone','A friend or family member. A real call, not texting.','social','','Voice connects much more than text; it costs 10 minutes and makes both days better.','On a walk or the way home.'],
 ['old','Reach out to an old friend','Someone you haven’t talked to in 6+ months.','social','','Old friendships fade without contact – one message often revives them.','Any time today.'],
 ['compl','Give a real compliment','To a colleague, friend or stranger – specific and honest.','social','','Makes someone’s day and trains you to notice the good in people.','Any time today.'],
 ['new','Talk to someone new','Start a conversation with someone you don’t know.','social','','Builds social confidence; most people are friendlier than expected.','Training, café, queue, uni info day.'],
 ['favor','Unasked favour','Help someone without being asked.','social','','Helping others is one of the most reliable mood boosts there is.','Any time today.'],
 ['plan','Plan a meetup','Fix a date with friends for this week or next – actually in the calendar.','social','','Time with friends doesn’t happen by itself; planning it does.','Today, by message.'],
 ['eat','Eat with someone, no phones','A meal with people, phones away.','social','','Real conversation, better digestion, closer relationships.','Lunch or dinner.'],
 ['cookf','Cook for friends','Invite people over and cook.','social','we','Hosting builds friendships faster than anything else.','Saturday or Sunday evening.'],
 ['story','Ask for a story','Ask a parent or grandparent about their life – something you don’t know yet.','social','','You learn where you come from, and they love being asked.','Next time you see or call them.'],
 ['surprise','Small surprise for your girlfriend','A note, her favourite snack, a plan for the weekend – something small and unexpected.','social','','Small gestures keep a relationship warm more than big occasions.','Any time today.'],
 ['listen','Only listen','In one conversation: ask questions and listen, don’t talk about yourself.','social','','People feel understood, and you learn more.','Any conversation today.'],
 ['trainbud','Train with someone','Invite a friend to a session or a run.','social','','More fun, more effort, and a fixed date makes you show up.','Your next session.'],
 ['familyc','Cook for the family','Make dinner for your family.','social','wd','A real help at home and good cooking practice.','Dinner.'],
 ['voice','3 voice messages','Send three friends a short voice message: how are you, what’s new.','social','','Keeps friendships alive with almost no effort.','On a walk.'],
 ['games','Game night','Board game, cards or a quiz with people – screens off.','social','we','Laughing together is the best stress relief.','Evening.'],
 ['teach','Teach someone something','Show someone a skill you have: a Python trick, an exercise, a recipe.','social','','Teaching is the fastest way to learn something properly yourself.','Any time today.'],
 // outside
 ['nohead','30 min outside, no headphones','Just walk and look around.','outside','','Nature and quiet lower stress; ideas come on their own.','Lunch break or evening.'],
 ['sunset','Watch the sunset','10 minutes, no photos, just watch.','outside','','A daily pause – and evening light helps your body clock wind down.','Check the time: around 17:00 in winter.'],
 ['newpl','Go somewhere new','A street, park, café or trail you have never been to.','outside','','New places make days memorable instead of blurring together.','Afternoon or evening.'],
 ['hike','Hike 2+ hours','Into the mountains or the woods.','outside','we','Long easy movement in nature: endurance, recovery and a clear head.','Saturday or Sunday morning. Check the weather and daylight.'],
 ['bike','Ride instead of driving','Bike or walk one trip you would normally drive or take the bus for.','outside','','Free training minutes, fresh air, and it’s often just as fast.','One trip today.'],
 ['forest','30 minutes in the forest','Walk slowly in the forest, phone in the pocket.','outside','','Time among trees lowers stress hormones and blood pressure.','Any time with daylight.'],
 ['sunrise','Watch the sunrise','Be outside when the sun comes up.','outside','we','A calm, special start that resets your sense of time.','Around 07:30–08:00 in winter.'],
 ['stars','Look at the stars','10 minutes outside on a clear night, away from lights.','outside','','Perspective – and a quiet end to the day.','Clear evening.'],
 ['barefoot','Barefoot on grass','10 minutes barefoot on grass or sand.','outside','','Strengthens feet and ankles and simply feels good.','A dry, mild day.'],
 ['outmeal','Eat outside','Have one meal outside, even if it’s cold – bring a jacket.','outside','','Daylight and fresh air turn a normal meal into a break.','Lunch.'],
 ['newrun','New running route','Run or ride a route you have never done.','outside','','Keeps training fun and makes the time pass faster.','Your next easy run or ride.'],
 ['photo','Photo walk','30 minutes, take 10 photos of interesting details (the Charmera is perfect).','outside','','You start seeing your surroundings with fresh eyes.','Golden hour, late afternoon.'],
 ['swim','Go swimming','Pool or lake – 20 minutes of easy swimming.','outside','','Easy endurance that is gentle on joints and good for breathing.','A rest or easy day.'],
 // growth
 ['decl','Declutter 15 min','One drawer, your desk or your downloads folder.','growth','','Less stuff, less searching, calmer room.','Any time today.'],
 ['cook','Cook a new recipe','Something you have never made.','growth','','Cooking well is a life skill that pays off every day.','Dinner.'],
 ['comf','Comfort zone challenge','Do one thing that feels a bit awkward or scary.','growth','','Confidence grows by doing slightly scary things, not by thinking about them.','Today – decide what it is now.'],
 ['lect','Learn something for 20 min','A lecture, podcast or tutorial outside your field.','growth','','Curiosity outside your lane – the best ideas come from combining fields.','Commute or lunch.'],
 ['money','Money check 10 min','Look at spending, savings and one subscription you could cancel.','growth','wd','Knowing where money goes is the first step to saving for travel and university.','Evening.'],
 ['tmrw','Plan tomorrow tonight','5 minutes: the 3 most important things for tomorrow.','growth','','You start tomorrow knowing what matters.','Evening.'],
 ['no','Say no to one thing','Protect your time once today.','growth','','Every yes to something unimportant is a no to your priorities.','Whenever something comes up.'],
 ['french','10 French words','Learn 10 French words or phrases (Fribourg is bilingual).','growth','','Useful for uni in Fribourg and travel; a small daily dose adds up.','Commute or waiting time.'],
 ['skill','20 minutes of a new skill','Juggling, drawing, an instrument, a card trick – anything new.','growth','','Learning motor skills keeps the brain flexible and is fun.','Evening.'],
 ['write','Write 300 words','About something you think about: a plan, an opinion, an idea.','growth','','Writing makes thinking clearer – and it’s practice for uni.','Evening.'],
 ['uni','Uni research 20 min','Study plans, info days, requirements for Bern or Fribourg.','growth','wd','Your uni decision gets easier the more you know.','A focused 20-minute block.'],
 ['cv','Update your CV','15 minutes on your CV or LinkedIn: one new skill or project.','growth','wd','Ready when an opportunity comes up.','Any time today.'],
 ['sell','Sell or donate 3 things','Three things you don’t use: sell them online or give them away.','growth','','Less clutter, a bit of money, and someone else uses it.','Take the photos today.'],
 ['fix','Fix something broken','The thing you’ve been ignoring: a tyre, a button, a wobbly chair.','growth','','Small repairs remove daily annoyances and teach you something.','Any time today.'],
 ['invest','Read about investing','15 minutes on ETFs, interest or budgeting.','growth','','Small knowledge, big long-term effect on your money.','Evening.'],
 ['english','10 pages in English','Read 10 pages of an English book.','growth','','Prepares the English test and builds vocabulary without effort.','Before sleep.'],
 ['goals3','Goal check','Look at your goals in Progress and do one small step for one of them.','growth','','Goals only move when you touch them regularly.','Evening.'],
 ['typing','10 minutes touch typing','Practise typing without looking (e.g. keybr.com).','growth','wd','Faster coding and writing for the rest of your life.','Before a Python block.'],
 // fun
 ['album','Listen to a full album','Start to finish, doing nothing else.','fun','','Music as an experience instead of background noise.','Evening.'],
 ['create','Make something','Draw, film, build, write a song – anything with your hands or head.','fun','','Creating instead of consuming is deeply satisfying.','Free evening time.'],
 ['museum','Museum or exhibition','Visit a museum, gallery or exhibition.','fun','we','New impressions and ideas, and a good date idea.','Saturday or Sunday.'],
 ['sport','Play a sport for fun','Football, table tennis, climbing – no training plan, just play.','fun','','Play keeps sport fun and uses your body in new ways.','Afternoon or evening.'],
 ['trip','Plan one trip day','Plan one day of your next trip (Malaysia?) – places, food, route.','fun','','Anticipation is half the fun of travelling.','Evening.'],
 ['cardtrick','Learn a magic trick','Learn one card or coin trick and show it to someone.','fun','','Fun to learn and a great icebreaker.','Evening.']
];
const SQ_BY={};SQ.forEach(q=>SQ_BY[q[0]]=q);
const SQ_CAT={body:['💪','Body'],food:['🥗','Food'],mind:['🧠','Mind'],focus:['🎯','Focus'],social:['🤝','Social'],outside:['🌲','Outside'],growth:['📈','Growth'],fun:['🎉','Fun']};
function sqRng(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619);}return function(){h+=0x6D2B79F5;let t=h;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function sqOk(q,s){const we=dow(s)>=5;/* dow: 0 = Monday … 6 = Sunday */return !(q[4]==='we'&&!we)&&!(q[4]==='wd'&&we);}
function sqBase(s,skip){
  const r=sqRng('sq'+s),all=SQ.slice();
  for(let i=all.length-1;i>0;i--){const j=Math.floor(r()*(i+1));const x=all[i];all[i]=all[j];all[j]=x;}
  const pool=all.filter(q=>sqOk(q,s)&&!(skip&&skip.indexOf(q[0])>=0)); // shuffle first, then filter: the order stays stable
  const out=[],cats=[];
  // weekends: one of the bigger weekend quests (ice bath, hike, …) is always in
  const big=pool.find(q=>q[4]==='we');if(big&&dow(s)>=5){out.push(big[0]);cats.push(big[3]);}
  pool.forEach(q=>{if(out.length<3&&cats.indexOf(q[3])<0){out.push(q[0]);cats.push(q[3]);}});
  return out;
}
function sqPicks(s){
  const base=sqBase(s,sqBase(add(s,-1))),sw=((state.days[s]||{}).sqs)||{};
  return base.map((id,i)=>SQ_BY[sw[i]]?sw[i]:id);
}
function sqDone(s){return((state.days[s]||{}).sqd)||[];}
function sqCount(from,to){let n=0;Object.keys(state.days).forEach(s=>{if(s>=from&&s<=to)n+=sqDone(s).filter(id=>SQ_BY[id]).length;});return n;}
/* A swipeable card per quest, with dots below. ui.sqi remembers the visible card across re-renders. */
function sqHtml(s){
  const ids=sqPicks(s),dn=sqDone(s),n=ids.filter(id=>dn.indexOf(id)>=0).length;
  if(ui.sqDay!==s){ui.sqDay=s;const f=ids.findIndex(id=>dn.indexOf(id)<0);ui.sqi=f<0?0:f;}
  let h='<section class="card sq"><div class="sqhd"><div class="lab" style="margin:0">Side quests <span class="muted">· '+(n===3?'<b style="color:var(--ok)">all 3 done ✓</b>':n+' of 3')+'</span></div>'
    +'<div class="sqnav"><button class="ib" data-a="sqGo" data-d="-1" aria-label="Previous">‹</button><button class="ib" data-a="sqGo" data-d="1" aria-label="Next">›</button></div></div><div class="sqc">';
  ids.forEach((id,i)=>{
    const q=SQ_BY[id],on=dn.indexOf(id)>=0,c=SQ_CAT[q[3]]||['✨',''];
    h+='<div class="sqs'+(on?' done':'')+'" data-i="'+i+'"><div class="sqcat">'+c[0]+' '+esc(c[1])+(q[4]==='we'?' · weekend':'')+'</div>'
      +'<div class="sqt">'+esc(q[1])+'</div><p class="sqhow">'+esc(q[2])+'</p>'
      +(q[5]?'<div class="sqi"><b>Why</b><span>'+esc(q[5])+'</span></div>':'')
      +(q[6]?'<div class="sqi"><b>When</b><span>'+esc(q[6])+'</span></div>':'')
      +'<div class="sqb"><button class="btn'+(on?' ghost':'')+'" data-a="sqTog" data-id="'+id+'">'+(on?'✓ Done · undo':'Done')+'</button>'
      +(on?'':'<button class="btn ghost" data-a="sqSwap" data-i="'+i+'">↻ Swap</button>')+'</div></div>';
  });
  h+='</div><div class="sqdots">'+ids.map((id,i)=>'<button class="sqd'+(i===ui.sqi?' on':'')+(dn.indexOf(id)>=0?' ok':'')+'" data-a="sqGo" data-i="'+i+'" aria-label="Quest '+(i+1)+'"></button>').join('')+'</div>';
  return h+'</section>';
}
function sqSet(i){ui.sqi=i;document.querySelectorAll('#view .sqd').forEach((d,k)=>d.classList.toggle('on',k===i));}
function sqSync(c){const w=c.clientWidth||1,i=Math.max(0,Math.min(2,Math.round(c.scrollLeft/w)));if(i!==ui.sqi)sqSet(i);}
function sqRestore(){const c=document.querySelector('#view .sqc');if(c)c.scrollLeft=(ui.sqi||0)*c.clientWidth;}
function lastSession(tm,before){
  return state.sessions.filter(z=>z.type===tm&&z.date<before&&sessHasData(z)).sort((a,b)=>a.date<b.date?1:-1)[0];
}
function hintFor(ex,last){
  if(!last)return null;
  const sets=(last.sets[ex.id]||[]).filter(x=>x&&x.reps!=null);
  if(!sets.length)return null;
  const hi=ex.r[1];
  const top=sets.length>=ex.s&&sets.every(x=>x.reps>=hi);
  if(top){
    if(ex.sec)return{up:true,text:'↑ add 5 s next time'};
    const inc=ex.low?5:2.5,kg=Math.max.apply(null,sets.map(x=>x.kg||0));
    return{up:true,text:'↑ +'+inc+' kg → '+r1(kg+inc)+(ex.bw?' kg added':' kg')};
  }
  return{up:false,text:'Hold the weight, aim for '+hi+(ex.sec?' s':' reps')+' in every set'};
}
function setsTxt(ex,sets){
  return (sets||[]).filter(x=>x&&x.reps!=null).map(x=>ex.sec?x.reps+'s':((x.kg!=null?x.kg:0)+'×'+x.reps)).join(', ');
}

/* ================= small UI pieces ================= */
function ring(val,max,size,label,sub){
  const r=size/2-9,c=2*Math.PI*r,p=max>0?Math.min(1,val/max):0,h=size/2;
  return '<div class="ring" style="width:'+size+'px;height:'+size+'px"><svg viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'">'+
   '<circle cx="'+h+'" cy="'+h+'" r="'+r+'" fill="none" stroke="var(--track)" stroke-width="11"/>'+
   '<circle cx="'+h+'" cy="'+h+'" r="'+r+'" fill="none" stroke="var(--accent)" stroke-width="11" stroke-opacity="'+(p>0?1:0)+'" stroke-linecap="round" stroke-dasharray="'+(c*p).toFixed(1)+' '+c.toFixed(1)+'" transform="rotate(-90 '+h+' '+h+')"/></svg>'+
   '<div class="rc"><b>'+label+'</b><small>'+(sub||'')+'</small></div></div>';
}
const bar=p=>'<div class="bar"><i style="width:'+Math.max(0,Math.min(100,p))+'%"></i></div>';
const head=(title,sub,nav)=>'<div class="hd"><div><h1>'+title+'</h1>'+(sub?'<div class="muted">'+sub+'</div>':'')+'</div>'+(nav||'')+'</div>';
const dnav=()=>'<div class="nav"><button class="ib" data-a="dprev" aria-label="Previous day">‹</button>'+(ui.date!==T()?'<button class="ib t" data-a="dtoday">Today</button>':'')+'<button class="ib" data-a="dnext" aria-label="Next day">›</button></div>';
function armBtn(key,act,attrs,label){
  const on=ui.armed===key;
  return '<button class="ib '+(on?'warn':'')+'" data-a="'+act+'" '+attrs+' aria-label="Delete">'+(on?'Sure?':'×')+'</button>';
}
function arm(key){
  if(ui.armed===key){ui.armed=null;clearTimeout(ui.at);return true;}
  ui.armed=key;clearTimeout(ui.at);
  ui.at=setTimeout(()=>{ui.armed=null;render();},3000);
  render();return false;
}
function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),2200);}
function storageBanner(){return storageOK?'':'<section class="card warn"><b>Storage is blocked in this browser.</b><p class="muted">Your entries only live until you close the page. Use More → Export backup often, or open the dashboard in your normal browser.</p></section>';}
function hasData(){return Object.keys(state.days).length>=5||state.sessions.length>=3;}
function backupBanner(){
  if(!hasData()||(window.LDSync&&window.LDSync.active()))return '';
  const le=state.settings.lastExport,age=le?diff(le,T()):999;
  if(age<14)return '';
  return '<section class="card warn"><b>Back up your data</b><p class="muted">'+(le?'Last backup '+age+' days ago.':'No backup yet.')+' Everything lives on this device only.</p><div class="btns"><button class="btn" data-a="export">Export backup</button></div></section>';
}

/* ================= TODAY ================= */
function testsHtml(p,s){
  return '<div class="tests">'+p.tests.map(id=>{
    const b=BMD[id],e=(state.bench[id]||[]).find(x=>x.date===s);
    const v=e?(b.time?fmtT(e.v):e.v):'';
    return '<label class="trow"><span>'+esc(b.n)+'<small>'+esc(b.u)+'</small></span><input class="in" inputmode="'+(b.time?'text':'decimal')+'" placeholder="'+(b.time?'m:ss':(b.u||'value'))+'" data-chg="testin" data-id="'+id+'" data-date="'+s+'" value="'+esc(v)+'"></label>';
  }).join('')+'</div>';
}
const F_S='Before: a banana or 2 rice cakes with honey and 500 ml water. After: a shake with your breakfast.';
const F_FB='Eat your main meal by 18:00. After training: shower, then quark or a shake with a banana.';
const F_E='Easy session: water is enough. Normal protein at every meal.';
const F_H='Hard session: light snack (banana or toast) 60–90 min before. Water; no sports drink needed under 75 min.';
const F_L='Long ride: per hour 500 ml water + 30 g maltodextrin or sugar + 1 g salt (your Isostar works too). Real food and protein right after.';
const FUEL={A:F_S,B:F_S,C:F_S,FB:F_FB,MATCH:'Carb-rich breakfast 3 h before (oats, bread). A shake and a proper meal afterwards.',RIDE:F_L,RUN_E:F_E,RUN_I:F_H,ZW_SS:F_H,REST:'Protein at every meal, a walk, mobility.',DELOAD:'Travel: protein with every meal, creatine daily, lots of walking.',TRIP:'Enjoy the food. One real protein source per meal, creatine daily.',
 'T2026-11-07':F_E,'T2026-11-08':F_E,'T2026-11-09':F_S,'T2026-11-10':F_FB,'T2026-11-11':F_S,'T2026-11-12':F_FB,'T2026-11-13':F_S,'T2026-11-14':F_E,
 'T2026-11-15':'5 km test: oats or toast 2–3 h before, water. Use your inhaler as your doctor planned and warm up 15 min.'};
const SUN_ALL=[['gear','Wash gym and football clothes, pack the gym bag for Monday'],['food','Check supplements and snacks (rice cakes, bananas, whey)'],['bike','Bike check: tyres, lights charged'],['score','Weekly review + 3 goals for next week (Plan → Review)'],['cal','Enter next week’s appointments (Plan → Schedule)'],['ci','17:00 check-in: Plan → Review → Copy text, paste it into the chat'],['bak','Export a backup (More → Setup)']];
/* with sync on, the backup item is not needed */
function sunList(){return SUN_ALL.filter(x=>x[0]!=='bak'||!(window.LDSync&&window.LDSync.active()));}
function sunDone(s){const sd=((state.days[s]||{}).sun)||{};return sunList().filter(x=>sd[x[0]]).length;}
function chkText(id,s){
  const w=dow(s),p=planFor(s);
  if(id==='up')return w<=4?'Up at '+(w%2===0?'05:40':'05:45')+', phone off until breakfast':'Up by '+(w===5?'07:30':'08:00')+', phone off until breakfast';
  if(id==='tr')return 'Training done: '+p.t;
  if(id==='le')return 'Python block done ('+((w===0||w===2)?'17:15':'06:00')+(w===3?', project':'')+')';
  return CHK.find(x=>x.id===id).t;
}
const lrow=(title,sub,right,attrs,cls)=>'<button class="lr" '+attrs+'><span class="lrt"><b>'+esc(title)+'</b>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</span><span class="lrr '+(cls||'')+'">'+right+'</span></button>';
function learnInfo(s){
  const w=dow(s);
  if(w>3||s<'2026-11-09'||(s>='2026-12-26'&&s<='2027-01-01'))return null;
  const lw=LW.slice().reverse().find(x=>x.s<=monday(s));
  if(!lw)return null;
  if(!lw.days.length&&!lw.proj)return{lw:lw,title:'Python · free week',sub:'Repeat what you built, or rest',done:false};
  const tm=(w===0||w===2)?'17:15':'06:00';
  if(w<=2){
    const d=lw.days[w];
    if(d!=null)return{lw:lw,title:'Python · course day '+d,sub:'45 min · '+tm+' · '+lw.topic,done:!!state.learn.days[d]};
    return{lw:lw,title:'Python · catch-up',sub:'45 min · '+tm+' · finish earlier days or start the project',done:false};
  }
  return{lw:lw,title:'Python · project',sub:'45 min · '+tm+' · '+(lw.proj||'no project this week'),done:!!state.learn.projects[lw.n]};
}
function nextUp(s){
  const nm=(()=>{const n=new Date();return n.getHours()*60+n.getMinutes();})();
  const list=dayItems(s).filter(x=>x.start!=null&&(s!==T()||x.end>nm)).sort((a,b)=>a.start-b.start);
  return list[0]||null;
}
function dayHtml(s,inline){
  const p=planFor(s),d=state.days[s]||{};
  const note=(state.custom||{}).note;
  let h=(note?'<section class="card note"><b>Plan note</b><p class="sm" style="margin:4px 0 0">'+esc(note)+'</p></section>':'')+'<section class="card"><div class="lab">Plan for this day</div><div class="ttl">'+esc(p.t)+'</div><p class="muted">'+esc(p.d)+'</p>';
  if(fuelFor(p))h+='<p class="sm"><b>Fuel:</b> '+esc(fuelFor(p))+'</p>';
  h+='<div class="btns">'+(inline?'':p.k==='s'&&p.tm?'<button class="btn" data-a="tmode" data-m="'+p.tm+'">Log strength '+p.tm+'</button>':p.k==='c'?'<button class="btn" data-a="tmode" data-m="cardio">Log cardio</button>':'')+'<select class="sel" data-chg="planSel" aria-label="Change session"><option value="">Auto plan</option>'+PLAN_OPTS.map(k=>'<option value="'+k+'"'+(d.plan===k?' selected':'')+'>'+esc(PT[k].t)+'</option>').join('')+'</select></div></section>';
  if(p.tests)h+='<section class="card"><div class="lab">Test results</div>'+testsHtml(p,s)+'</section>';
  return h;
}
function vToday(){
  const s=ui.date,t=T(),w=dow(s),p=planFor(s),c=dayChecks(s),sc=cnt(c),d=state.days[s]||{};
  const ws=weekScore(monday(s));
  let sub;
  if(s<START){const n=diff(s,START);sub=n===1?'Plan starts tomorrow':'Plan starts in '+n+' days';}
  else sub='Day '+(diff(START,s)+1)+' · week '+isoWeek(s)+(s<='2026-11-15'?' · test week':'');
  let h=head(fmtD(s),sub,dnav())+storageBanner();
  // Today: only what needs you now or soon. Automatic things (Garmin, auto checks) stay off this page.
  if(s===t)return h+nowHtml(s)+comingHtml(s)+todoHtml(s)+sqHtml(s);
  // Other days: score overview, that day's to-dos and plan, and the full tracker
  h+='<section class="card ringc">'+ring(sc,10,88,sc+'/10',s<t?'that day':'planned')+'<div class="rtxt"><div class="big">'+(ws.mx?ws.sc+'/'+ws.mx:'–')+'</div><div class="muted">week points'+(ws.mx?' · goal '+ws.goal:'')+'</div>'+bar(ws.mx?ws.sc/ws.mx*100:0)+'</div></section>';
  const wDay=w===0||w===2||w===4;
  h+=todoHtml(s)+sqHtml(s)+agendaHtml(s);
  h+='<section class="card lrs"><div class="lab" style="padding-top:12px;margin-bottom:0">Daily tracker</div>'+checksHtml(s)+'</section>';
  const fsum=[d.sleep!=null?d.sleep+' h sleep':null,d.energy!=null?'energy '+d.energy+'/10':null].filter(Boolean).join(' · ')||'Sleep, energy, a note';
  h+='<section class="card lrs"><button class="lr" data-a="feelTog"><span class="lrt"><b>Sleep, energy and note</b><small>'+esc(fsum)+'</small></span><span class="lrr">'+(ui.feel?'▴':'▾')+'</span></button>';
  if(ui.feel)h+='<div style="padding:2px 0 14px"><div class="fgrid">'+
   [['sleep','Sleep h','decimal'],['energy','Energy 1–10','numeric']].map(f=>'<label>'+f[1]+'<input class="in" inputmode="'+f[2]+'" data-bind="days|'+s+'|'+f[0]+'" data-t="n" value="'+esc(d[f[0]]!=null?d[f[0]]:'')+'"></label>').join('')+
   '</div><input class="in full" placeholder="Note (optional)" data-bind="days|'+s+'|note" data-t="t" value="'+esc(d.note||'')+'">'+
   ((!wDay&&state.weights[s]==null&&ui.wAny!==s)?'<div class="btns"><button class="ib t" data-a="wAny">Log weight anyway</button></div>':'')+'</div>';
  return h+'</section>';
}
/* All checks of a day in their groups (folded groups on today, open on other days). */
function checksHtml(s){
  const c=dayChecks(s),d=state.days[s]||{},t=T();
  const grpOpen=g=>ui.grp[g]!==undefined?ui.grp[g]:(s!==t);
  let h='';
  GR.forEach(g=>{
    const ids=g[2].filter(id=>!c[id].auto),done=ids.filter(id=>id==='wa'?(+d.water||0)>=3:c[id].on).length,open=grpOpen(g[0]),all=done===ids.length;
    if(!ids.length)return;
    h+='<button class="lr sub" data-a="grpTog" data-g="'+g[0]+'"><span class="lrt"><b>'+g[1]+'</b><small>'+done+' of '+ids.length+' done</small></span><span class="lrr '+(all?'ok':'')+'">'+(all?'✓':(open?'▴':'▾'))+'</span></button>';
    if(!open)return;
    ids.forEach(id=>{
      if(id==='wa'){
        const wn=+d.water||0;
        h+='<div class="lr sub"><span class="lrt"><b>Water</b><small>'+wn+' of 3 bottles (750 ml each)</small></span><span class="lrr"><button class="ib" data-a="waterAdj" data-d="-1" aria-label="Less">−</button><b style="color:var(--fg);min-width:16px;text-align:center">'+wn+'</b><button class="ib" data-a="waterAdj" data-d="1" aria-label="More">＋</button></span></div>';
        return;
      }
      const k=c[id];
      h+='<button class="chk '+(k.on?'on':'')+'" data-a="chk" data-id="'+id+'"><span class="bx">'+(k.on?'✓':'')+'</span><span>'+esc(chkText(id,s))+'</span></button>';
    });
    if(g[0]==='eve'&&s!==t)h+=prepHtml(s);
  });
  return h;
}
/* Today: what comes next (the next few blocks and appointments), and after 19:30 how tomorrow starts. */
function comingHtml(s){
  const nm=nowMin(),p=planFor(s),c=dayChecks(s),tmode=(p.k==='s'&&p.tm)?p.tm:(p.k==='c'?'cardio':'day');
  const row=(x,day)=>{
    const time='<span class="cu-t">'+(x.start!=null?mstr(x.start):'all day')+'</span>';
    let attrs='',sub='';
    if(x.kind==='todo')attrs='data-a="goTodos"';
    else if(x.kind!=='routine')attrs='data-a="evedit" data-id="'+esc(x.id)+'" data-src="'+x.kind+'"';
    else if(!day&&x.title===p.t&&(p.k==='s'||p.k==='c')){attrs='data-a="goTrain" data-m="'+tmode+'"';if(fuelFor(p)&&!c.tr.on)sub=fuelFor(p).split(/\.\s/)[0];}
    else if(!day&&/^Python/.test(x.title)){const li=learnInfo(s);if(li){attrs='data-a="goLearn" data-n="'+li.lw.n+'"';sub=li.title.replace('Python · ','');}}
    const inner=time+'<span class="lrt"><b>'+esc(x.title)+'</b>'+(sub?'<small>'+esc(sub)+'</small>':'')+'</span>'+(attrs?'<span class="lrr">›</span>':'');
    return attrs?'<button class="lr cu '+x.kind+'" '+attrs+'>'+inner+'</button>':'<div class="lr cu '+x.kind+'">'+inner+'</div>';
  };
  const items=dayItems(s).concat(todoTimed(s));
  const allday=items.filter(x=>x.start==null&&x.kind!=='routine');
  const next=items.filter(x=>x.start!=null&&x.start>nm).sort((a,b)=>a.start-b.start).slice(0,3);
  let rows=allday.map(x=>row(x)).join('')+next.map(x=>row(x)).join('');
  if(nm>=1170){
    const n=add(s,1),tn=dayItems(n).filter(x=>x.start!=null).sort((a,b)=>a.start-b.start).slice(0,2);
    const tad=dayItems(n).filter(x=>x.start==null&&x.kind!=='routine');
    if(tn.length||tad.length)rows+='<div class="cu-day">Tomorrow · '+esc(planName(planFor(n)))+'</div>'+tad.map(x=>row(x,true)).join('')+tn.map(x=>row(x,true)).join('');
  }
  if(!rows)return '';
  return '<section class="card lrs coming"><div class="lab" style="padding-top:12px;margin-bottom:0">Coming up</div>'+rows+'<button class="lr cu-more" data-a="goPlanDay" data-date="'+s+'"><span class="lrt"><small>Whole day in the plan</small></span><span class="lrr">›</span></button></section>';
}
/* ---------- to-dos ----------
   state.todos: {id, t, due: 'YYYY-MM-DD' | null, time: 'HH:MM' | null, on: true = fixed date (an event, e.g. lunch at grandma's),
   otherwise a deadline ("by …"), month: true = only the month is known, done: 'YYYY-MM-DD' | null}.
   Sorted by urgency. Today shows what is overdue or due today, plus deadlines in the next 3 days.
   Done items stay visible for the rest of the day and the next, then they disappear. */
const MONTHS_DE=['januar','februar','märz','april','mai','juni','juli','august','september','oktober','november','dezember'];
const MONTHS_EN=['january','february','march','april','may','june','july','august','september','october','november','december'];
const todoOpen=()=>state.todos.filter(x=>!x.done);
const todoSort=(a,b)=>{const da=a.due||'9999',db=b.due||'9999';if(da!==db)return da<db?-1:1;const ta=a.time||'99',tb=b.time||'99';return ta<tb?-1:ta>tb?1:0;};
const todoVisibleDone=x=>x.done&&x.done>=add(T(),-1);
function todoWhen(x){
  const t=T();
  if(!x.due)return {txt:'',cls:''};
  const n=diff(t,x.due);
  let rel=n<0?(n===-1?'yesterday':(-n)+' days ago'):n===0?'today':n===1?'tomorrow':n<7?DAY[dow(x.due)]+' '+pd(x.due).getDate():fmtS(x.due);
  if(x.month&&n>=0)rel=MON[pd(x.due).getMonth()]+(pd(x.due).getFullYear()!==pd(t).getFullYear()?' '+pd(x.due).getFullYear():'');
  else if(n>=7&&pd(x.due).getFullYear()!==pd(t).getFullYear())rel+=' '+pd(x.due).getFullYear();
  const txt=(n>0&&!x.on&&!x.month?'by ':'')+rel+(x.time?' · '+x.time:'');
  return {txt:txt,cls:n<0?'late':n<=2?'soon':''};
}
/* full = the list in Plan → To-dos: tap the date (or ✎) to change the date or delete */
function todoRow(x,full){
  const i=state.todos.indexOf(x),w=todoWhen(x),ed=full&&ui.tdEdit===x.id;
  const chk='<button class="chk'+(x.done?' on':'')+'" data-a="todoTog" data-id="'+esc(x.id)+'"><span class="bx">'+(x.done?'✓':'')+'</span><span class="tdt">'+esc(x.t)+'</span>'+(!full&&!x.done&&w.txt?'<span class="tdb '+w.cls+'">'+esc(w.txt)+'</span>':'')+'</button>';
  if(!full)return '<div class="tdr'+(x.done?' done':'')+'">'+chk+'</div>';
  const edBtn='<button class="tdb tde '+w.cls+'" data-a="tdEdit" data-id="'+esc(x.id)+'" aria-label="Change date">'+esc(x.done?'undo':(w.txt||'✎'))+'</button>';
  let h='<div class="tdr full'+(x.done?' done':'')+(ed?' ed':'')+'">'+chk+(x.done?'':edBtn);
  if(ed)h+='<div class="tdl"><input class="in tdd" type="date" data-bind="todos|'+i+'|due" data-t="t" value="'+esc(x.due||'')+'" aria-label="Date"><input class="in tdd tdtm" type="time" data-bind="todos|'+i+'|time" data-t="t" value="'+esc(x.time||'')+'" aria-label="Time"><button class="ib t warn" data-a="todoDel" data-id="'+esc(x.id)+'">Delete</button></div>';
  return h+'</div>';
}
function todoAddRow(base){
  return '<div class="qa tda"><input class="in" id="td-new" data-base="'+base+'" placeholder="New to-do, e.g. Call the bank Fr" autocomplete="off"><button class="btn" data-a="todoAdd" data-base="'+base+'">Add</button></div>';
}
function todoHtml(s){
  const t=T(),today=s===t;
  const open=todoOpen().filter(x=>today?(x.due&&x.due<=s):x.due===s).sort(todoSort);
  const soon=today?todoOpen().filter(x=>x.due&&x.due>t&&x.due<=add(t,3)).sort(todoSort):[];
  const doneHere=state.todos.filter(x=>x.done===s);
  const rest=today?todoOpen().length-open.length-soon.length:0;
  let h='<section class="card lrs todo"><div class="lab" style="padding-top:12px;margin-bottom:0">To-dos'+(open.length?' <span class="muted">· '+open.length+'</span>':'')+'</div>';
  h+=open.map(x=>todoRow(x)).join('');
  if(!open.length)h+='<p class="muted sm" style="margin:6px 0 4px">'+(today?'Nothing due today.':'Nothing due this day.')+'</p>';
  if(soon.length)h+='<div class="cu-day">Next 3 days</div>'+soon.map(x=>todoRow(x)).join('');
  if(doneHere.length){
    h+='<button class="lr sub ndone" data-a="tdnTog"><span class="lrt"><b>✓ '+doneHere.length+' done</b><small>'+esc(doneHere.map(x=>x.t).join(' · '))+'</small></span><span class="lrr">'+(ui.tdn?'▴':'▾')+'</span></button>';
    if(ui.tdn)h+=doneHere.map(x=>todoRow(x)).join('');
  }
  h+=todoAddRow(s);
  h+='<button class="lr cu-more" data-a="goTodos"><span class="lrt"><small>All to-dos'+(rest>0?' · '+rest+' more':'')+'</small></span><span class="lrr">›</span></button>';
  return h+'</section>';
}
/* Plan → To-dos: everything, by urgency */
function vTodos(){
  const t=T(),open=todoOpen(),d=x=>x.due?diff(t,x.due):null;
  const grp=[
    ['Overdue',x=>x.due&&x.due<t],
    ['Today',x=>x.due===t],
    ['Tomorrow',x=>d(x)===1],
    ['This week',x=>d(x)>=2&&d(x)<=7],
    ['Next 4 weeks',x=>d(x)>=8&&d(x)<=31],
    ['Later',x=>d(x)>31],
    ['Someday',x=>!x.due]
  ];
  let h='<section class="card lrs todo"><div class="lab" style="padding-top:12px;margin-bottom:0">Add a to-do</div>'+todoAddRow('')
    +'<p class="muted sm" style="margin:0 0 6px">A date in the text sets it: “Fr”, “morgen”, “17.11.”. Without a date it goes to Someday.</p>'
    +'<button class="lr cu-more" data-a="tdBulkTog"><span class="lrt"><small>Paste a whole list</small></span><span class="lrr">'+(ui.tdBulk?'▴':'▾')+'</span></button>';
  if(ui.tdBulk)h+='<textarea id="td-bulk" class="in full" placeholder="One to-do per line, e.g.&#10;- [ ] Buy a microSD card — bis 12.11.&#10;- [ ] Lunch at grandma’s — 11.11.&#10;- [ ] Interview — 10.11., 13:30&#10;- [ ] Plan the app — keine Deadline"></textarea><div class="btns" style="margin-bottom:10px"><button class="btn" data-a="todoBulk">Add all</button><span class="muted sm">Dates, times, “bis”, months and “keine Deadline” are recognised. Duplicates are skipped.</span></div>';
  h+='</section>';
  grp.forEach(g=>{
    const L=open.filter(g[1]).sort(todoSort);
    if(!L.length)return;
    h+='<section class="card lrs todo"><div class="lab" style="padding-top:12px;margin-bottom:0">'+g[0]+' <span class="muted">· '+L.length+'</span></div>'+L.map(x=>todoRow(x,true)).join('')+'</section>';
  });
  if(!open.length)h+='<p class="muted" style="margin:4px">No open to-dos.</p>';
  const done=state.todos.filter(todoVisibleDone).sort((a,b)=>a.done<b.done?1:-1);
  if(done.length)h+='<section class="card lrs todo"><div class="lab" style="padding-top:12px;margin-bottom:0">Done <span class="muted">· disappears after a day</span></div>'+done.map(x=>todoRow(x,true)).join('')+'</section>';
  return h;
}
/* One line of a pasted list → a to-do. Understands "— bis 12.11.", "— 10.11., 13:30", "— Dezember", "— 31.3.2027",
   "— keine Deadline", leading "- [ ]" / "[x]" and **bold** markers. */
function parseTodoLine(line){
  let s=String(line).replace(/\*\*/g,'').trim();
  if(!s||/^#/.test(s))return null;
  const done=/^[-*•]?\s*\[[xX]\]/.test(s);
  s=s.replace(/^[-*•]\s*/,'').replace(/^\[[ xX]?\]\s*/,'').replace(/^[-*•]\s*/,'').trim();
  if(!s)return null;
  let title=s,when='';
  for(const sep of [' — ',' – ',' - ']){const i=s.lastIndexOf(sep);if(i>0){title=s.slice(0,i).trim();when=s.slice(i+sep.length).trim();break;}}
  const t=T(),y0=pd(t).getFullYear();
  const out={t:title,due:null,time:null,on:false,month:false,done:done};
  const w=when.toLowerCase().replace(/[()]/g,'').trim();
  const pick=(y,m,d,hasYear)=>{const x=new Date(y,m,d);if(x.getMonth()!==m)return null;let r=ds(x);if(!hasYear&&r<add(t,-60))r=ds(new Date(y+1,m,d));return r;};
  if(!w){
    // no separator: let the quick parser find a date inside the text
    const q=parseQuick(s.replace(/\s(mo|di|mi|do|fr|sa|so)\.?$/i,' $1.'),t);
    if(q.hadDate){out.t=q.title||s;out.due=q.date;out.time=q.start!=null?mstr(q.start):null;}
    return out;
  }
  if(/keine\s+deadline|no\s+deadline|irgendwann|someday/.test(w))return out;
  const by=/^(bis|by|until|spätestens)\b/.test(w);
  const rest=w.replace(/^(bis|by|until|spätestens)\s*/,'');
  const tm=rest.match(/(\d{1,2})[:](\d{2})\s*(uhr)?\s*$/);
  if(tm&&+tm[1]<24)out.time=String(+tm[1]).padStart(2,'0')+':'+tm[2];
  const dm=rest.match(/(\d{1,2})\.(\d{1,2})\.?(\d{4})?/);
  if(dm){out.due=pick(dm[3]?+dm[3]:y0,+dm[2]-1,+dm[1],!!dm[3]);}
  else{
    const mi=MONTHS_DE.concat(MONTHS_EN).findIndex(m=>rest.indexOf(m)===0||rest.indexOf(m.slice(0,3))===0);
    if(mi>=0){
      const m=mi%12,ym=rest.match(/(\d{4})/),yy=ym?+ym[1]:(new Date(y0,m+1,0)<pd(t)?y0+1:y0);
      out.due=ds(new Date(yy,m+1,0));out.month=true;
    }else{const q=parseQuick(when,t);if(q.hadDate){out.due=q.date;if(q.start!=null)out.time=mstr(q.start);}}
  }
  if(out.due&&!by&&!out.month)out.on=true; // a plain date (no "bis") is a fixed day
  if(out.time&&!out.due)out.time=null;
  return out;
}
/* The day's plan as one list: training, Python, appointments, and whatever this day needs. */
function agendaHtml(s){
  const t=T(),w=dow(s),p=planFor(s),c=dayChecks(s),rows=[],done=[];
  const short=(x,n)=>{const f=String(x).split(/\.\s|\.$/)[0],m=n||70;return f.length>m?f.slice(0,m-1)+'…':f;};
  const tmode=(p.k==='s'&&p.tm)?p.tm:(p.k==='c'?'cardio':'day');
  // finished things leave the list and only show up in the "Done" line at the bottom
  const row=(ok,title,html)=>{if(ok)done.push(title);else rows.push(html);};
  row(c.tr.on&&p.k!=='r',planName(p),lrow(planName(p),short(p.d),'›','data-a="goTrain" data-m="'+tmode+'"'));
  const li=learnInfo(s);
  if(li)row(li.done,li.title.replace('Python · ','Python '),lrow(li.title,li.sub,'›','data-a="goLearn" data-n="'+li.lw.n+'"'));
  if(p.tests){
    const n=p.tests.filter(id=>(state.bench[id]||[]).some(e=>e.date===s)).length;
    row(n===p.tests.length,'Test results',lrow('Test results',n+' of '+p.tests.length+' entered','›','data-a="goTrain" data-m="day"'));
  }
  const wDay=w===0||w===2||w===4,wInNow=s===t&&wDay&&nowMin()>=wakeMin(s); // then it sits in "To do now"
  if(state.weights[s]!=null){if(s!==t)done.push('Weigh-in '+state.weights[s]+' kg');}
  else if((wDay||ui.wAny===s)&&!wInNow){
    const wl=Object.keys(state.weights).filter(k=>state.weights[k]!=null&&k<s).sort().pop();
    rows.push('<div class="lr"><span class="lrt"><b>Weigh-in</b><small>Fasted'+(wl?' · last '+state.weights[wl]+' kg':'')+'</small></span><input class="in w" inputmode="decimal" placeholder="kg" data-bind="weights|'+s+'" data-t="n"></div>');
  }
  if(w===6&&s>=START){const n=sunDone(s),N=sunList().length;row(n===N,'Sunday reset',lrow('Sunday reset and check-in',n+' of '+N+' done · check-in at 17:00','›','data-a="goWeek"'));}
  if(w===6&&s>=START&&pd(s).getDate()<=7&&s>='2026-12-01')rows.push(lrow('Monthly check-in','+30 min · measurements, photos, benchmarks','›','data-a="goBody"'));
  dayItems(s).filter(x=>x.kind!=='routine').sort((a,b)=>(a.start==null?-1:a.start)-(b.start==null?-1:b.start)).forEach(x=>{
    rows.push(lrow(x.title,x.start!=null?mstr(x.start)+(x.end!=null?'–'+mstr(x.end):''):(x.multi?'until '+fmtS(x.ref.until):'all day'),'›','data-a="evedit" data-id="'+esc(x.id)+'" data-src="'+x.kind+'"'));
  });
  if(fuelFor(p))rows.push('<div class="lr"><span class="lrt"><b>Fuel</b><small>'+esc(fuelFor(p))+'</small></span></div>');
  rows.push(lrow('Add appointment','For this day','＋','data-a="evnew"'));
  if(done.length)rows.push('<div class="lr adone"><span class="lrt"><b>✓ Done</b><small>'+esc(done.join(' · '))+'</small></span></div>');
  return '<section class="card lrs agenda"><div class="lab" style="padding-top:12px;margin-bottom:0">'+(s===t?'Today’s plan':'Plan for this day')+'</div>'+rows.join('')+'</section>';
}

/* ================= WEEK ================= */
function weekQuotas(m){
  const days=weekDays(m).filter(s=>s>=TRACK);
  const sd=days.filter(s=>planFor(s).k==='s'),cd=days.filter(s=>planFor(s).k==='c'),ld=days.filter(s=>dow(s)<=3);
  return{
    sN:sd.length,sD:sd.filter(s=>dayChecks(s).tr.on).length,
    cN:cd.length,cD:cd.filter(s=>dayChecks(s).tr.on).length,
    lN:ld.length,lD:ld.filter(s=>dayChecks(s).le.on).length
  };
}
function vWeek(){
  const m=ui.wm,days=weekDays(m),t=T(),ws=weekScore(m),q=weekQuotas(m),lw=LW.find(w=>w.s===m),wk=state.weeks[m]||{};
  let h='';
  h+='<section class="card ringc">'+ring(ws.sc,ws.mx||70,96,ws.sc+'/'+(ws.mx||70),'points')+'<div class="rtxt"><div class="big">'+(ws.mx?Math.round(ws.sc/ws.mx*100)+'%':'–')+'</div><div class="muted">'+(ws.mx?'goal '+ws.goal+' of '+ws.mx+' points (79 %)':'The plan starts on Sat 7 Nov')+'</div></div></section>';
  h+='<section class="card"><div class="lab">Tracker</div><div class="gridw"><table class="grid"><thead><tr><th></th>'+days.map(s=>'<th class="'+(s===t?'tod':'')+'"><button class="lnk" data-a="gotoDay" data-date="'+s+'">'+DAY[dow(s)][0]+'<small>'+pd(s).getDate()+'</small></button></th>').join('')+'</tr></thead><tbody>';
  CHK.forEach(x=>{
    h+='<tr><td class="gl">'+x.s+'</td>'+days.map(s=>{
      if(s<TRACK)return '<td class="gx">·</td>';
      const c=dayChecks(s)[x.id];
      return '<td><button class="gc '+(c.on?'on':'')+(c.auto?' auto':'')+'" data-a="wchk" data-date="'+s+'" data-id="'+x.id+'" '+(c.auto?'disabled':'')+' aria-label="'+esc(x.t)+'">'+(c.on?'✓':'')+'</button></td>';
    }).join('')+'</tr>';
  });
  h+='<tr class="tot"><td class="gl">Points</td>'+days.map(s=>{const d=dayScore(s);return '<td>'+(d==null?'·':d)+'</td>';}).join('')+'</tr></tbody></table></div></section>';
  const qrow=(l,a,b)=>'<div class="q"><span>'+l+'</span><b class="'+(b>0&&a>=b?'ok':'')+'">'+a+' / '+b+'</b></div>';
  const wa=wAvg(m),pw=wAvg(add(m,-7)),sl=dayStat(m,'sleep'),en=dayStat(m,'energy');
  h+='<section class="card"><div class="lab">This week</div>'+qrow('Strength sessions',q.sD,q.sN)+qrow('Cardio / football',q.cD,q.cN)+qrow('Learning blocks',q.lD,q.lN);
  if(lw&&lw.proj)h+='<div class="q"><span>Python project: '+esc(lw.proj.split(':')[0])+'</span><button class="chip '+(state.learn.projects[lw.n]?'on':'')+'" data-a="lproj" data-n="'+lw.n+'" style="margin:0">'+(state.learn.projects[lw.n]?'Done':'Open')+'</button></div>';
  h+='<div class="q"><span>Time with your girlfriend</span><button class="chip '+(wk.gf?'on':'')+'" data-a="wgf" style="margin:0">'+(wk.gf?'Yes':'Not yet')+'</button></div>';
  h+='<div class="q"><span>Weight average</span><b>'+(wa!=null?r1(wa)+' kg':'–')+(wa!=null&&pw!=null?' <span class="d '+(wa-pw>=0?'up':'dn')+'">'+(wa-pw>=0?'+':'')+r1(wa-pw)+'</span>':'')+'</b></div>';
  h+='<div class="q"><span>Sleep · energy (average)</span><b>'+(sl!=null?r1(sl)+' h':'–')+' · '+(en!=null?r1(en)+'/10':'–')+'</b></div></section>';
  const su=add(m,6),sd=((state.days[su]||{}).sun)||{};
  h+='<section class="card"><div class="lab">Sunday reset · '+fmtD(su)+'</div>'+sunList().map(x=>{const on=!!sd[x[0]];return '<button class="chk '+(on?'on':'')+'" data-a="sunTog" data-date="'+su+'" data-id="'+x[0]+'"><span class="bx">'+(on?'✓':'')+'</span><span>'+esc(x[1])+'</span></button>';}).join('')+'</section>';
  return h;
}
function buildCheckin(m){
  const days=weekDays(m),e=days[6],L=[];
  L.push('Check-in week '+isoWeek(m)+' ('+fmtS(m)+' – '+fmtS(e)+' '+pd(e).getFullYear()+')');
  const ss=state.sessions.filter(z=>z.type!=='cardio'&&days.indexOf(z.date)>=0&&sessHasData(z)).sort((a,b)=>a.date<b.date?-1:1);
  L.push('1. Strength:'+(ss.length?'':' none logged'));
  ss.forEach(z=>{
    const parts=(EX[z.type]||[]).map(ex=>{const t=setsTxt(ex,z.sets[ex.id]);return t?ex.n+' '+t:null;}).filter(Boolean);
    L.push('   '+DAY[dow(z.date)]+' '+z.type+': '+parts.join(' | ')+(z.note?' — '+z.note:''));
  });
  const tests=[];
  BM.forEach(b=>{(state.bench[b.id]||[]).forEach(en=>{if(days.indexOf(en.date)>=0)tests.push(b.n+' '+(b.time?fmtT(en.v):en.v)+(b.u&&!b.time?' '+b.u:''));});});
  if(tests.length)L.push('   Tests: '+tests.join(', '));
  const cs=state.sessions.filter(z=>z.type==='cardio'&&days.indexOf(z.date)>=0).sort((a,b)=>a.date<b.date?-1:1);
  L.push('2. Endurance:'+(cs.length?'':' none logged'));
  cs.forEach(z=>{
    const b=[DAY[dow(z.date)]+' '+z.kind];
    if(z.min)b.push(z.min+' min');if(z.dist)b.push(z.dist+' km');if(z.w)b.push(z.w+' W');if(z.hr)b.push('avg HR '+z.hr);if(z.feel)b.push('feel '+z.feel+'/10');
    L.push('   '+b.join(', ')+(z.note?' — '+z.note:''));
  });
  const wa=wAvg(m),pw=wAvg(add(m,-7));
  L.push('3. Weight: '+(wa!=null?'avg '+r1(wa)+' kg'+(pw!=null?' (previous week '+r1(pw)+' kg)':''):'no entries'));
  const sl=dayStat(m,'sleep'),en=dayStat(m,'energy');
  L.push('4. Sleep '+(sl!=null?'avg '+r1(sl)+' h':'–')+' · energy '+(en!=null?'avg '+r1(en)+'/10':'–'));
  const ws=weekScore(m);
  L.push('5. Weekly tracker: '+ws.sc+'/'+ws.mx+' · side quests '+sqCount(m,e));
  const q=weekQuotas(m),lw=LW.find(w=>w.s===m);
  const cd=Object.keys(state.learn.days).filter(k=>state.learn.days[k]).length;
  L.push('6. Learning: blocks '+q.lD+'/'+q.lN+' · course days '+cd+'/'+COURSE_TOTAL+(lw&&lw.proj?' · project “'+lw.proj.split(':')[0]+'” '+(state.learn.projects[lw.n]?'done':'not done'):''));
  const sp=(state.weeks[m]||{}).special;
  const nx=[];weekDays(add(m,7)).forEach(s=>{dayItems(s).forEach(x=>{if(x.kind==='routine')return;if(x.multi&&x.ref.date!==s&&s!==add(m,7))return;nx.push(DAY[dow(s)]+' '+(x.start!=null?mstr(x.start)+' ':'')+x.title);});});
  L.push('7. Next week special: '+(((sp?sp+'; ':'')+nx.join('; '))||'nothing'));
  L.push('/silas');
  return L.join('\n');
}

/* ================= TRAIN ================= */
function ensureSession(s,tm){
  let z=state.sessions.find(x=>x.date===s&&x.type===tm);
  if(!z){z={id:'s'+Date.now(),date:s,type:tm,sets:{},note:''};state.sessions.push(z);}
  return z;
}
function strengthHtml(tm,s){
  if(!EX[tm])return '<p class="muted">This session is not in the plan any more.</p>';
  const sess=state.sessions.find(z=>z.date===s&&z.type===tm),last=lastSession(tm,s);
  let h='<section class="card"><div class="lab">Strength '+tm+' · '+TNAME[tm]+'</div><p class="muted">Warm up 8 min first. Leave 1–2 reps in reserve on the main lifts (RPE 7–8).'+(last?' Last time: '+fmtS(last.date)+'.':' First time: start light.')+'</p></section>';
  EX[tm].forEach(ex=>{
    const cur=(sess&&sess.sets[ex.id])||[],hn=hintFor(ex,last),lt=last?setsTxt(ex,last.sets[ex.id]):'';
    h+='<div class="ex"><div class="exh"><span><b>'+esc(ex.n)+'</b><span id="pr-'+ex.id+'">'+prHtml(ex,s)+'</span></span><span class="muted sm">'+ex.s+' × '+ex.r[0]+'–'+ex.r[1]+(ex.sec?' s':'')+' · rest '+ex.rest+'</span></div>';
    const canFill=!ex.sec&&lt&&!cur.some(x=>x&&x.kg!=null);
    h+='<div class="exm"><span>'+(lt?'Last: '+esc(lt):'No previous session')+'</span>'+(ex.sec?'':'<label>Target <input class="in" inputmode="decimal" placeholder="kg" data-bind="targets|'+ex.id+'" data-t="n" value="'+esc(state.targets[ex.id]!=null?state.targets[ex.id]:'')+'"></label>')+'</div>';
    if(hn||canFill)h+='<div class="exm" style="margin-top:4px">'+(hn?'<span class="sm '+(hn.up?'hint':'hint hold')+'">'+esc(hn.text)+'</span>':'<span></span>')+(canFill?'<button class="ib t" data-a="useLast" data-ex="'+ex.id+'">Fill in weights</button>':'')+'</div>';
    h+=warmHtml(ex);
    const ls=(last&&last.sets[ex.id])||[];
    for(let i=0;i<ex.s;i++){
      const v=cur[i]||{},pv=ls[i]||{};
      h+='<div class="set"><span>'+(i+1)+'</span>';
      if(ex.sec)h+='<input class="in sin" style="grid-column:span 2" inputmode="numeric" placeholder="'+(pv.reps!=null?pv.reps+' s last time':'seconds')+'" data-ex="'+ex.id+'" data-i="'+i+'" data-f="reps" value="'+esc(v.reps!=null?v.reps:'')+'">';
      else h+='<input class="in sin" inputmode="decimal" placeholder="'+(pv.kg!=null?pv.kg+' kg':(ex.bw?'+kg':'kg'))+'" data-ex="'+ex.id+'" data-i="'+i+'" data-f="kg" value="'+esc(v.kg!=null?v.kg:'')+'"><input class="in sin" inputmode="numeric" placeholder="'+ex.r[0]+'–'+ex.r[1]+' reps" data-ex="'+ex.id+'" data-i="'+i+'" data-f="reps" value="'+esc(v.reps!=null?v.reps:'')+'">';
      h+='</div>';
    }
    h+='</div>';
  });
  h+='<section class="card"><div class="lab">Session note</div><input class="in" data-sn="1" placeholder="How did it feel?" value="'+esc(sess?sess.note:'')+'"></section>';
  return h;
}
function cardioHtml(s){
  let h='<section class="card"><div class="lab">Add cardio · '+fmtD(s)+'</div><div class="fgrid"><label>Type<select class="sel" id="cd-k">'+KINDS.map(k=>'<option>'+k+'</option>').join('')+'</select></label><label>Minutes<input class="in" id="cd-m" inputmode="numeric"></label><label>Distance (km)<input class="in" id="cd-d" inputmode="decimal"></label><label>Avg watts<input class="in" id="cd-w" inputmode="numeric"></label><label>Avg heart rate<input class="in" id="cd-h" inputmode="numeric"></label><label>Feel 1–10<input class="in" id="cd-f" inputmode="numeric"></label></div><input class="in full" id="cd-n" placeholder="Note (optional)"><div class="btns"><button class="btn" data-a="addCardio">Save</button></div></section>';
  const list=state.sessions.filter(z=>z.type==='cardio'&&z.date===s);
  if(list.length)h+='<section class="card"><div class="lab">Logged this day</div>'+list.map(z=>'<div class="hist"><span>'+esc(z.kind)+' · '+(z.min||'?')+' min'+(z.dist?' · '+z.dist+' km':'')+(z.w?' · '+z.w+' W':'')+(z.feel?' · feel '+z.feel:'')+'</span>'+armBtn('sess'+z.id,'delSess','data-id="'+z.id+'"')+'</div>').join('')+'</section>';
  return h;
}
function histHtml(){
  const all=state.sessions.filter(sessHasData).sort((a,b)=>a.date<b.date?1:-1).slice(0,20);
  if(!all.length)return '<section class="card"><p class="muted">Nothing logged yet.</p></section>';
  return '<section class="card"><div class="lab">Recent sessions</div>'+all.map(z=>{
    let txt;
    if(z.type==='cardio')txt=z.kind+' · '+(z.min||'?')+' min'+(z.dist?' · '+z.dist+' km':'');
    else{const n=(EX[z.type]||[]).filter(ex=>setsTxt(ex,z.sets[ex.id])).length;txt='Strength '+z.type+' · '+n+' exercises';}
    return '<div class="hist"><span><b>'+fmtD(z.date)+'</b> · '+esc(txt)+'</span>'+armBtn('sess'+z.id,'delSess','data-id="'+z.id+'"')+'</div>';
  }).join('')+'</section>';
}
function vTrainPhone(){
  const s=ui.date,p=planFor(s),t=T(),days=weekDays(monday(s));
  let h=head('Training',fmtD(s),dnav())+storageBanner();
  h+='<section class="card lrs tweek"><div class="lab" style="padding-top:12px;margin-bottom:0">This week</div>'+days.map(d=>{
    const q=planFor(d),c=dayChecks(d),done=c.tr.on&&q.k!=='r';
    const st=q.k==='r'?'<span class="tw-r">rest</span>':done?'<span class="tw-ok">✓</span>':d<t?'<span class="tw-miss">–</span>':'';
    return '<button class="lr tw'+(d===s?' sel':'')+(d===t?' td':'')+'" data-a="gotoTrainDay" data-date="'+d+'"><span class="tw-d">'+DAY[dow(d)]+'<small>'+pd(d).getDate()+'</small></span><span class="lrt"><b>'+esc(planName(q))+'</b></span><span class="lrr">'+st+'</span></button>';
  }).join('')+'</section>';
  h+=dayHtml(s,true);
  if(p.k==='s'&&p.tm&&EX[p.tm]){ui.tmode=p.tm;h+=strengthHtml(p.tm,s);}
  else if(p.k==='c')h+=cardioHtml(s);
  return h;
}
function vTrain(){
  if(isPhone())return vTrainPhone();
  const s=ui.date,m=ui.tmode,p=planFor(s);
  let h=head('Training',fmtD(s),dnav())+storageBanner();
  h+='<div class="seg">'+['day'].concat(Object.keys(EX),['cardio','hist']).map(k=>'<button class="'+(m===k?'on':'')+'" data-a="tmode" data-m="'+k+'">'+(k==='day'?'Day':k==='cardio'?'Cardio':k==='hist'?'History':k)+'</button>').join('')+'</div>';
  h+='<p class="muted sm" style="margin:-4px 2px 10px">Plan for this day: '+esc(p.t)+'</p>';
  if(m==='day')h+=dayHtml(s);else if(m==='cardio')h+=cardioHtml(s);else if(m==='hist')h+=histHtml();else h+=strengthHtml(m,s);
  return h;
}

/* ================= BODY ================= */
function wChartInner(){
  const ks=Object.keys(state.weights).filter(k=>state.weights[k]!=null).sort();
  if(!ks.length)return '<p class="muted">Log your weight three times a week (Mon, Wed, Fri, fasted). The trend line appears here.'+(state.settings.startWeight?' Start: about '+state.settings.startWeight+' kg.':'')+'</p>';
  const vals=ks.map(k=>state.weights[k]);
  const av=ks.map(k=>{const lo=add(k,-6);return avg(ks.filter(x=>x>=lo&&x<=k).map(x=>state.weights[x]));});
  const span=Math.max(14,diff(ks[0],ks[ks.length-1]));
  const all=vals.concat(av);let mn=Math.min.apply(null,all)-.6,mx=Math.max.apply(null,all)+.6;
  if(mx-mn<2){const c=(mx+mn)/2;mn=c-1;mx=c+1;}
  const W=340,H=150,L=32,R=8,Tp=8,B=20;
  const X=k=>L+(diff(ks[0],k)/span)*(W-L-R),Y=v=>Tp+(1-(v-mn)/(mx-mn))*(H-Tp-B);
  let g='';
  [mn,(mn+mx)/2,mx].forEach(v=>{g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/><text x="'+(L-4)+'" y="'+(Y(v)+3).toFixed(1)+'" text-anchor="end">'+r1(v)+'</text>';});
  const sw=state.settings.startWeight;
  if(sw&&sw>mn&&sw<mx)g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(sw).toFixed(1)+'" y2="'+Y(sw).toFixed(1)+'" stroke="var(--muted)" stroke-dasharray="3 4"/>';
  const line=ks.map((k,i)=>(i?'L':'M')+X(k).toFixed(1)+' '+Y(av[i]).toFixed(1)).join(' ');
  g+='<path d="'+line+'" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
  ks.forEach((k,i)=>{g+='<circle cx="'+X(k).toFixed(1)+'" cy="'+Y(vals[i]).toFixed(1)+'" r="2.6" fill="var(--accent)" fill-opacity=".35"/>';});
  g+='<text x="'+L+'" y="'+(H-5)+'">'+fmtS(ks[0])+'</text><text x="'+(W-R)+'" y="'+(H-5)+'" text-anchor="end">'+fmtS(ks[ks.length-1])+'</text>';
  let rows='';
  const mons={};ks.forEach(k=>{mons[monday(k)]=1;});
  const ms=Object.keys(mons).sort().slice(-6).reverse();
  ms.forEach(m=>{const a=wAvg(m),p=wAvg(add(m,-7));rows+='<div class="q"><span>Week '+isoWeek(m)+' · '+fmtS(m)+'</span><b>'+r1(a)+' kg'+(p!=null?' <span class="d '+(a-p>=0?'up':'dn')+'">'+(a-p>=0?'+':'')+r1(a-p)+'</span>':'')+'</b></div>';});
  return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Weight trend">'+g+'</svg><p class="muted sm">Dots: single weigh-ins · line: 7-day average · dashed: start weight. Target for the build phase: +0.2 to +0.25 kg per week.</p><div style="margin-top:6px">'+rows+'</div>';
}
function spark(vals){
  if(vals.length<2)return '';
  const mn=Math.min.apply(null,vals),mx=Math.max.apply(null,vals),W=70,H=26,rg=(mx-mn)||1;
  const pts=vals.map((v,i)=>(i*(W-4)/(vals.length-1)+2).toFixed(1)+','+(H-3-(v-mn)/rg*(H-6)).toFixed(1));
  return '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'"><polyline points="'+pts.join(' ')+'" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
function benchHtml(){
  return BM.map(b=>{
    const es=state.bench[b.id]||[],last=es[es.length-1],first=es[0];
    const f=v=>b.time?fmtT(v):r1(v)+(b.u&&b.u!=='m:ss'?' '+b.u:'');
    let dl='';
    if(es.length>1){const dv=last.v-first.v,good=b.low?dv<0:dv>0;dl='<span class="d '+(dv===0?'':good?'up':'dn')+'">'+(dv>0?'+':'')+(b.time?(dv<0?'-':'+')+fmtT(Math.abs(dv)):r1(dv))+'</span>';}
    const e1=(last&&b.reps&&/^kg/.test(b.u))?' · e1RM '+r1(last.v*(1+b.reps/30))+' kg':'';
    let h='<div class="bm"><button class="bmh" data-a="bopen" data-id="'+b.id+'"><div class="nm"><b>'+esc(b.n)+'</b><div class="muted sm">'+(last?fmtS(last.date)+e1:'no entry yet')+'</div></div>'+spark(es.map(x=>x.v))+'<div class="v">'+(last?f(last.v):'–')+'<br>'+dl+'</div></button>';
    if(ui.bopen===b.id){
      h+='<div style="margin-top:10px">'+(b.base?'<p class="muted sm">'+esc(b.base)+'</p>':'')+'<div class="fgrid"><label>Date<input class="in" type="date" id="bd-'+b.id+'" value="'+T()+'"></label><label>Value'+(b.u?' ('+esc(b.u)+')':'')+'<input class="in" id="bv-'+b.id+'" inputmode="'+(b.time?'text':'decimal')+'" placeholder="'+(b.time?'m:ss':'')+'"></label></div><div class="btns"><button class="btn" data-a="addBench" data-id="'+b.id+'">Add entry</button></div>';
      h+=es.slice().reverse().slice(0,8).map((en,i)=>{const idx=es.length-1-i;return '<div class="hist"><span>'+fmtS(en.date)+' · <b>'+f(en.v)+'</b>'+(en.note?' · '+esc(en.note):'')+'</span>'+armBtn('b'+b.id+idx,'delBench','data-id="'+b.id+'" data-i="'+idx+'"')+'</div>';}).join('');
      h+='</div>';
    }
    return h+'</div>';
  }).join('');
}
function bodyHtml(){
  const t=T();
  let h='';
  h+='<section class="card"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px"><div><div class="lab" style="margin:0">Weight today</div><div class="muted sm">Fasted, after the toilet</div></div><input class="in w" inputmode="decimal" placeholder="kg" data-bind="weights|'+t+'" data-t="n" value="'+esc(state.weights[t]!=null?state.weights[t]:'')+'"></div><div id="wchart" style="margin-top:12px">'+wChartInner()+'</div></section>';
  h+='<section class="card"><div class="lab">Measurements · 1st Sunday of the month</div><div class="f4">'+[['mw','Waist'],['mc','Chest'],['ma','Arm'],['mt','Thigh']].map(f=>'<label>'+f[1]+' cm<input class="in" id="'+f[0]+'" inputmode="decimal"></label>').join('')+'</div><div class="btns"><button class="btn" data-a="addMeasure">Save today</button></div>';
  const ms=state.measures.slice().reverse().slice(0,6);
  if(ms.length)h+='<div style="margin-top:8px">'+ms.map((x,i)=>'<div class="hist"><span><b>'+fmtS(x.date)+'</b> · waist '+(x.waist!=null?x.waist:'–')+' · chest '+(x.chest!=null?x.chest:'–')+' · arm '+(x.arm!=null?x.arm:'–')+' · thigh '+(x.thigh!=null?x.thigh:'–')+'</span>'+armBtn('m'+x.date,'delMeasure','data-d="'+x.date+'"')+'</div>').join('')+'</div>';
  h+='</section>';
  return h;
}
function strHtml(){
  return '<section class="card"><div class="lab">Benchmarks</div><p class="muted sm">Tap a row to add a value or see the history. The test week fills this in.</p>'+benchHtml()+'</section>'+curvesHtml();
}
/* ================= PROGRESS ================= */
function goalsCompact(){
  if(!state.goals.length)return '';
  return '<section class="card"><div class="lab">Goals</div>'+state.goals.map(g=>{
    const i=goalInfo(g),late=!i.reached&&i.exp!=null&&i.p+0.05<i.exp;
    return '<div class="gc"><div class="gc-h"><b>'+esc(g.t)+'</b><span class="'+(i.reached?'ok':late?'warn':'muted')+'">'+(i.reached?'reached ✓':g.by?(i.left>=0?i.left+' d left':'overdue'):'')+'</span></div>'+bar(i.p*100)+'<small class="muted">now '+esc(goalFmt(g,i.cur))+' · target '+esc(goalFmt(g,g.target))+'</small></div>';
  }).join('')+'</section>';
}
function vProg(){
  if(isPhone())return head('Progress','What matters right now')+storageBanner()+goalsCompact()+overHtml(['garmin','weight','training','streaks']);
  const m=ui.gmode||'over';
  let h=head('Progress',m==='over'?'What works and what does not':'')+storageBanner();
  h+='<div class="seg">'+[['over','Overview'],['goals','Goals'],['body','Body'],['str','Strength']].map(x=>'<button class="'+(m===x[0]?'on':'')+'" data-a="gmode" data-m="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>';
  return h+(m==='goals'?goalsHtml():m==='body'?bodyHtml():m==='str'?strHtml():overHtml());
}
/* share of points per week; the running week counts only the days that are over */
function weekPct(m){
  const t=T();let d=weekDays(m).filter(s=>s>=TRACK&&s<t);
  if(!d.length)d=weekDays(m).filter(s=>s>=TRACK&&s<=t);
  if(!d.length)return null;
  return d.reduce((a,s)=>a+dayScore(s),0)/(d.length*10);
}
function barsSvg(list){
  const W=340,H=130,B=18,Tp=16,n=list.length,gw=(W-8)/Math.max(n,6),x0=(W-gw*n)/2,bw=Math.min(30,gw*.6),Y=v=>Tp+(1-v)*(H-Tp-B);
  let g='<line x1="4" x2="'+(W-4)+'" y1="'+Y(.79).toFixed(1)+'" y2="'+Y(.79).toFixed(1)+'" stroke="var(--ok)" stroke-dasharray="3 4"/>';
  list.forEach((o,i)=>{
    const x=x0+gw*i+(gw-bw)/2,y=Y(o.v);
    g+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+Math.max(1,(H-B)-y).toFixed(1)+'" rx="5" fill="var(--accent)" fill-opacity="'+(o.cur?.45:1)+'"/>'+
     '<text x="'+(x+bw/2).toFixed(1)+'" y="'+(y-4).toFixed(1)+'" text-anchor="middle">'+Math.round(o.v*100)+'</text>'+
     '<text x="'+(x+bw/2).toFixed(1)+'" y="'+(H-5)+'" text-anchor="middle">'+esc(o.l)+'</text>';
  });
  return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Points per week">'+g+'</svg>';
}
/* how often each check was hit over the last n finished days */
function habitStats(n){
  const to=add(T(),-1),f0=add(to,-(n-1)),from=f0<TRACK?TRACK:f0,out=[];
  if(to<from)return null;
  CHK.forEach(x=>{
    let on=0,of=0;
    for(let s=from;s<=to;s=add(s,1)){
      const c=dayChecks(s)[x.id];
      if((x.id==='tr'&&planFor(s).k==='r')||(x.id==='le'&&c.auto))continue; // not scheduled that day
      of++;if(c.on)on++;
    }
    if(of)out.push({id:x.id,s:x.s,t:x.t,on:on,of:of,p:on/of});
  });
  return{from:from,to:to,list:out.sort((a,b)=>a.p-b.p||a.of-b.of)};
}
/* kg per week from a straight line through the last 4 weeks of weigh-ins */
function weightTrend(){
  const t=T(),ks=Object.keys(state.weights).filter(k=>state.weights[k]!=null&&k>=add(t,-27)&&k<=t).sort();
  if(ks.length<4||diff(ks[0],ks[ks.length-1])<10)return null;
  const xs=ks.map(k=>diff(ks[0],k)),ys=ks.map(k=>state.weights[k]),mx=avg(xs),my=avg(ys);
  let nu=0,de=0;xs.forEach((x,i)=>{nu+=(x-mx)*(ys[i]-my);de+=(x-mx)*(x-mx);});
  const l7=ks.filter(k=>k>=add(t,-6)).map(k=>state.weights[k]);
  return{perWk:de?nu/de*7:0,now:l7.length?avg(l7):ys[ys.length-1],n:ks.length,days:diff(ks[0],ks[ks.length-1])};
}
function trainWeek(m){
  const days=weekDays(m),inw=z=>days.indexOf(z.date)>=0&&sessHasData(z);
  const cs=state.sessions.filter(z=>z.type==='cardio'&&inw(z));
  return{ss:state.sessions.filter(z=>z.type!=='cardio'&&inw(z)).length,cn:cs.length,min:cs.reduce((a,z)=>a+(+z.min||0),0),
    ride:cs.filter(z=>/ride/i.test(z.kind)).reduce((a,z)=>Math.max(a,+z.min||0),0)};
}
function overHtml(only){
  const t=T(),m0=monday(t),q=(l,v,cl)=>'<div class="q"><span>'+l+'</span><b'+(cl?' class="'+cl+'"':'')+'>'+v+'</b></div>';
  const want=k=>!only||only.indexOf(k)>=0;
  let h='';
  if(want('garmin')){
  // Garmin: last night and today (filled in automatically, so it is here and not on Today)
  if(window.LDGarmin)h+=window.LDGarmin.todayHtml(t)||window.LDGarmin.todayHtml(add(t,-1));
  }
  if(want('points')){
  // 1. points per week
  const wks=[];for(let i=7;i>=0;i--){const m=add(m0,-7*i),v=weekPct(m);if(v!=null)wks.push({l:'W'+isoWeek(m),v:v,cur:i===0});}
  h+='<section class="card"><div class="lab">Tracker points per week</div>';
  if(wks.length)h+=barsSvg(wks);
  h+='<p class="muted sm">In % of the possible points. Dashed line: your goal of 79 %.'+(wks.length<3?' The trend fills in over the next weeks.':'')+' Light bar: this week so far.</p></section>';
  }
  if(want('habits')){
  // 2. habits
  const hs=habitStats(14);
  h+='<section class="card"><div class="lab">Habits · last '+(hs?diff(hs.from,hs.to)+1:14)+' days</div>';
  if(!hs||!hs.list.length)h+='<p class="muted">After the first full day this shows which checks you hit and which you keep missing.</p>';
  else{
    const weak=hs.list.filter(x=>x.p<.6),top=hs.list[hs.list.length-1],nd=diff(hs.from,hs.to)+1;
    if(nd<5)h+='<p class="muted sm" style="margin:0 0 8px">Only '+nd+' day'+(nd>1?'s':'')+' so far. After a week this shows where you slip.</p>';
    else h+='<p class="sm" style="margin:0 0 8px">'+(weak.length?'<b style="color:var(--warn)">Focus: '+esc(weak[0].t)+'</b> ('+weak[0].on+' of '+weak[0].of+' days). Work on one thing at a time.':'<b style="color:var(--ok)">Every habit at 60 % or more.</b> Keep it up.')+(top&&top.p>=.8?' Strongest: '+esc(top.s)+'.':'')+'</p>';
    h+=hs.list.map(x=>'<div class="hb"><span>'+esc(x.s)+'</span><div class="bar"><i style="width:'+Math.round(x.p*100)+'%'+(x.p<.6?';background:var(--warn)':'')+'"></i></div><b>'+x.on+'/'+x.of+'</b></div>').join('');
  }
  h+='</section>';
  }
  if(want('weight')){
  // 3. weight
  const wt=weightTrend();
  h+='<section class="card"><div class="lab">Weight trend</div>';
  if(!wt)h+='<p class="muted">Needs about 2 weeks of weigh-ins (Mon, Wed, Fri). Then you see here whether you gain as planned: +0.2 to +0.25 kg per week.</p>';
  else{
    const r=wt.perWk,v=r<.1?'Slower than planned. Eat about 200 kcal more a day, e.g. a shake with a banana or 60 g oats.':r>.35?'Faster than planned, probably more fat than muscle. Eat about 150 kcal less a day.':'On track. Keep eating like this.';
    const cl=r<.1||r>.35?'warn':'ok';
    h+=q('Average last 7 days',r1(wt.now)+' kg')+q('Change per week',(r>=0?'+':'')+(Math.round(r*100)/100)+' kg',cl==='ok'?'ok':'')+q('Plan','+0.2 to +0.25 kg')+
      '<p class="sm" style="margin-top:8px;color:var(--'+cl+')"><b>'+v+'</b></p><p class="muted sm">From '+wt.n+' weigh-ins over '+wt.days+' days.</p>';
  }
  h+='</section>';
  }
  if(want('training')){
  // 4. training
  const tw=trainWeek(m0),past=[1,2,3,4].map(i=>add(m0,-7*i)).filter(m=>add(m,6)>=TRACK).map(trainWeek);
  const pa=k=>past.length?r1(avg(past.map(x=>x[k]))):null,mo=pd(t).getMonth(),rideGoal=mo===10?90:mo===11?135:180;
  const vs=(a,k)=>a+(pa(k)!=null?' <span class="muted sm">· avg '+pa(k)+'</span>':'');
  h+='<section class="card"><div class="lab">Training · this week</div>'+q('Strength sessions',vs(tw.ss,'ss'))+q('Cardio sessions',vs(tw.cn,'cn'))+q('Cardio minutes',vs(tw.min,'min'))+
    q('Longest ride',tw.ride+' min <span class="muted sm">· plan '+rideGoal+'</span>',tw.ride>=rideGoal?'ok':'')+'<p class="muted sm">“avg” is the average of the weeks before. Long ride: 90 min in November, 180 min by January.</p></section>';
  }
  if(want('sleep')){
  // 5. sleep and energy
  const dl=[];for(let s=add(t,-27);s<=t;s=add(s,1)){const d=state.days[s];if(d)dl.push({s:s,sl:d.sleep,en:d.energy});}
  const mean=(f,from)=>{const a=dl.filter(x=>x.s>=from&&x[f]!=null).map(x=>x[f]);return a.length?r1(avg(a)):null;};
  const pairs=dl.filter(x=>x.sl!=null&&x.en!=null),hi=pairs.filter(x=>x.sl>=7.5),lo=pairs.filter(x=>x.sl<7.5);
  const s7=mean('sl',add(t,-6)),s28=mean('sl',add(t,-27)),e7=mean('en',add(t,-6)),e28=mean('en',add(t,-27));
  h+='<section class="card"><div class="lab">Sleep and energy</div>'+q('Sleep · 7 days',(s7!=null?s7+' h':'–')+(s28!=null?' <span class="muted sm">· 4 weeks '+s28+' h</span>':''))+q('Energy · 7 days',(e7!=null?e7+'/10':'–')+(e28!=null?' <span class="muted sm">· 4 weeks '+e28+'</span>':''));
  if(hi.length>=3&&lo.length>=3)h+='<p class="sm" style="margin-top:8px"><b>With 7.5 h sleep or more your energy is '+r1(avg(hi.map(x=>x.en)))+'/10, with less it is '+r1(avg(lo.map(x=>x.en)))+'/10.</b></p>';
  else h+='<p class="muted sm">Log sleep and energy for a few days and this shows how much sleep changes your energy.</p>';
  h+='</section>';
  }
  if(want('streaks')){
  // 6. streaks
  h+='<section class="card"><div class="lab">Streaks</div><div class="streaks">'+streaks().map(x=>'<div class="st"><b>'+x.cur+'</b><span>'+x.k+'</span><small>best '+x.best+'</small></div>').join('')+'</div><p class="muted sm" style="margin:10px 0 0">Side quests: <b style="color:var(--fg)">'+sqCount(m0,add(m0,6))+'</b> this week · '+sqCount('2000-01-01',t)+' in total</p></section>';
  }
  return h;
}
/* goals: measured by a benchmark, the weight average, the Python course or a number you type */
function goalCur(g){
  if(g.k==='bench'){const es=state.bench[g.b]||[];return es.length?es[es.length-1].v:null;}
  if(g.k==='weight'){const ks=Object.keys(state.weights).filter(k=>state.weights[k]!=null).sort();if(!ks.length)return null;const lo=add(ks[ks.length-1],-6);return r1(avg(ks.filter(k=>k>=lo).map(k=>state.weights[k])));}
  if(g.k==='learn')return Object.keys(state.learn.days).filter(k=>state.learn.days[k]).length;
  return g.cur!=null?g.cur:null;
}
function goalFrom(g){
  const c=g.created||START;
  if(g.k==='learn')return 0;
  if(g.k==='bench'){const es=state.bench[g.b]||[],b=es.filter(e=>e.date<=c).pop()||es[0];return b?b.v:null;}
  if(g.k==='weight'){const ks=Object.keys(state.weights).filter(k=>state.weights[k]!=null).sort(),b=ks.filter(k=>k<=c).pop()||ks[0];return b?state.weights[b]:null;}
  return g.from!=null?g.from:null;
}
function goalFmt(g,v){
  if(v==null)return '–';
  if(g.k==='bench'){const b=BMD[g.b]||{};return b.time?fmtT(v):r1(v)+(b.u&&b.u!=='m:ss'?' '+b.u:'');}
  if(g.k==='weight')return r1(v)+' kg';
  if(g.k==='learn')return v+' of '+COURSE_TOTAL+' days';
  return String(r1(v));
}
function goalInfo(g){
  const cur=goalCur(g),from=goalFrom(g);
  const dir=g.k==='bench'?(BMD[g.b]&&BMD[g.b].low?-1:1):(from!=null&&from!==g.target?Math.sign(g.target-from):1);
  const reached=cur!=null&&(dir>0?cur>=g.target:cur<=g.target);
  let p=0;
  if(reached)p=1;else if(cur!=null&&from!=null&&g.target!==from)p=Math.max(0,Math.min(1,(cur-from)/(g.target-from)));
  const c=g.created||START,span=g.by?diff(c,g.by):0;
  return{cur:cur,from:from,reached:reached,p:p,left:g.by?diff(T(),g.by):null,exp:span>0?Math.max(0,Math.min(1,diff(c,T())/span)):null};
}
function goalsHtml(){
  const t=T();
  let h='<section class="card"><div class="lab">Goals</div>';
  if(!state.goals.length)h+='<p class="muted">No goals yet. Add one below.</p>';
  state.goals.forEach((g,i)=>{
    const o=goalInfo(g),sched=o.exp!=null&&o.from!=null&&(o.p>0||o.exp>.15); // too early to judge otherwise
    let st='';
    if(o.reached)st='<span class="d up">reached ✓</span>';
    else if(o.left!=null&&o.left<0)st='<span class="d dn">deadline passed</span>';
    else if(o.cur==null)st='<span class="muted">no value yet</span>';
    else if(sched)st=o.p>=o.exp-.1?'<span class="d up">on schedule</span>':'<span class="d dn">behind schedule</span>';
    h+='<div class="goal"><div class="accr"><b>'+esc(g.t)+'</b>'+armBtn('g'+g.id,'goalDel','data-id="'+g.id+'"')+'</div>'+
     '<div class="muted sm">Now '+esc(goalFmt(g,o.cur))+' · target '+esc(goalFmt(g,g.target))+(g.by?' · by '+fmtS(g.by)+(o.left>=0?' ('+o.left+' days left)':''):'')+'</div>'+bar(o.p*100)+
     '<div class="sm" style="margin-top:6px">'+st+(g.k==='bench'?(st?' · ':'')+'<button class="lnk" data-a="goStr" data-id="'+esc(g.b)+'">enter a result</button>':'')+'</div>'+
     (g.k==='manual'?'<div class="accr" style="margin-top:6px"><span class="muted sm">Current value</span><input class="in w" inputmode="decimal" data-bind="goals|'+i+'|cur" data-t="n" value="'+esc(g.cur!=null?g.cur:'')+'"></div>':'')+'</div>';
  });
  h+='</section>';
  h+='<section class="card"><div class="lab">New goal</div><div class="fgrid"><label style="grid-column:1/-1">What<input class="in" id="ng-t" placeholder="e.g. Bench 5RM 80 kg"></label><label style="grid-column:1/-1">Measured by<select class="sel" id="ng-k">'+
   BM.map(b=>'<option value="bench:'+b.id+'">Benchmark · '+esc(b.n)+'</option>').join('')+'<option value="weight">Body weight (7-day average)</option><option value="learn">Python course days</option><option value="manual">Something else (I enter the number)</option></select></label>'+
   '<label>Target<input class="in" id="ng-v" placeholder="number, or m:ss"></label><label>By<input class="in" type="date" id="ng-d"></label><label>Start value (only for “something else”)<input class="in" id="ng-f" inputmode="decimal"></label></div>'+
   '<div class="btns"><button class="btn" data-a="goalAdd">Add goal</button></div><p class="muted sm">Benchmarks, weight and the Python course update by themselves.</p></section>';
  const cds=state.countdowns.filter(x=>x.date&&x.date>=t).sort((a,b)=>a.date<b.date?-1:1);
  h+='<section class="card"><div class="lab">Dates</div>';
  if(ui.cdEdit){
    h+=state.countdowns.map((c,i)=>'<div class="cdr"><input class="in" data-bind="countdowns|'+i+'|label" data-t="t" value="'+esc(c.label)+'"><input class="in" type="date" data-bind="countdowns|'+i+'|date" data-t="t" value="'+esc(c.date)+'"><button class="ib" data-a="cdDel" data-i="'+i+'" aria-label="Remove">×</button></div>').join('')+
     '<div class="btns"><button class="btn ghost" data-a="cdAdd">Add date</button><button class="btn" data-a="cdEdit">Done</button></div>';
  }else{
    h+=(cds.length?cds.map(x=>{const n=diff(t,x.date);return '<div class="cd"><span>'+esc(x.label)+'<span class="muted sm"> · '+fmtS(x.date)+'</span></span><b>'+(n===0?'today':n+(n===1?' day':' days'))+'</b></div>';}).join(''):'<p class="muted">No upcoming dates.</p>')+
     '<div class="btns"><button class="btn ghost" data-a="cdEdit">Edit dates</button></div>';
  }
  return h+'</section>';
}
function buildMonthly(f,e){
  const now=T(),t=e&&e<now?e:now,from=f||add(t,-29),L=[];
  L.push('Monthly check-in ('+fmtS(from)+' – '+fmtS(t)+')');
  const days=[];for(let s=from;s<=t;s=add(s,1))if(s>=TRACK)days.push(s);
  const pts=days.reduce((a,s)=>a+dayScore(s),0);
  L.push('1. Tracker: '+pts+'/'+(days.length*10)+' points over '+days.length+' days');
  const inr=z=>z.date>=from&&z.date<=t&&sessHasData(z);
  L.push('2. Sessions: strength '+state.sessions.filter(z=>z.type!=='cardio'&&inr(z)).length+', cardio/football '+state.sessions.filter(z=>z.type==='cardio'&&inr(z)).length);
  const ks=Object.keys(state.weights).filter(k=>state.weights[k]!=null&&k>=from&&k<=t).sort();
  L.push('3. Weight: '+(ks.length?'first '+state.weights[ks[0]]+' kg → last '+state.weights[ks[ks.length-1]]+' kg (avg '+r1(avg(ks.map(k=>state.weights[k])))+' kg)':'no entries'));
  const m=state.measures[state.measures.length-1];
  L.push('4. Measurements'+(m?' ('+fmtS(m.date)+')':'')+': '+(m?'waist '+(m.waist!=null?m.waist:'–')+', chest '+(m.chest!=null?m.chest:'–')+', arm '+(m.arm!=null?m.arm:'–')+', thigh '+(m.thigh!=null?m.thigh:'–')+' cm':'none'));
  const bl=BM.map(b=>{const es=state.bench[b.id]||[];const l=es[es.length-1];return l?b.n+' '+(b.time?fmtT(l.v):l.v)+(b.u&&!b.time?' '+b.u:'')+' ('+fmtS(l.date)+')':null;}).filter(Boolean);
  L.push('5. Latest benchmarks: '+(bl.length?bl.join('; '):'none'));
  const cd=Object.keys(state.learn.days).filter(k=>state.learn.days[k]).length,pj=Object.keys(state.learn.projects).filter(k=>state.learn.projects[k]).length;
  L.push('6. Learning: course days '+cd+'/'+COURSE_TOTAL+', projects '+pj+'/'+PROJ_TOTAL);
  const sk=streaks();
  L.push('7. Streaks: '+sk.map(x=>x.k+' '+x.cur+' (best '+x.best+')').join(', '));
  L.push('/silas');
  return L.join('\n');
}

/* ================= LEARN ================= */
function curLearnWeek(){const t=T();let c=LW[0];LW.forEach(w=>{if(w.s<=t)c=w;});return c;}
function vLearn(){
  const cd=Object.keys(state.learn.days).filter(k=>state.learn.days[k]).length,pj=Object.keys(state.learn.projects).filter(k=>state.learn.projects[k]).length;
  const cur=curLearnWeek();
  if(ui.lopen==null)ui.lopen=cur.n;
  let h='<p class="muted" style="margin:0 2px 10px">Angela Yu · 100 Days of Code, 26 selected days</p>';
  h+='<section class="card"><div class="two"><div>'+ring(cd,COURSE_TOTAL,92,cd+'/'+COURSE_TOTAL,'course days')+'</div><div>'+ring(pj,PROJ_TOTAL,92,pj+'/'+PROJ_TOTAL,'projects')+'</div></div><p class="muted sm" style="text-align:center;margin-top:10px">4 blocks of 45 min per week: Mon + Wed evening, Tue + Thu morning. Videos at 1.25–1.5×, type every exercise yourself.</p></section>';
  LW.forEach(w=>{
    const done=w.days.filter(d=>state.learn.days[d]).length,open=ui.lopen===w.n,pd_=state.learn.projects[w.n];
    h+='<div class="wk"><button class="wkh" data-a="lopen" data-n="'+w.n+'"><span><b>Week '+w.n+'</b> · '+fmtS(w.s)+(w===cur?' · <span style="color:var(--accent)">now</span>':'')+'<br><span class="muted sm">'+esc(w.topic)+'</span></span><span class="muted sm">'+(w.days.length?done+'/'+w.days.length:'free')+(w.proj?(pd_?' · ✓':' · ○'):'')+'</span></button>';
    if(open){
      h+='<div class="wkb">';
      if(w.days.length)h+='<div class="muted sm" style="margin-bottom:6px">Course days</div>'+w.days.map(d=>'<button class="chip '+(state.learn.days[d]?'on':'')+'" data-a="lday" data-d="'+d+'">Day '+d+'</button>').join('');
      if(w.proj)h+='<div class="muted sm" style="margin:6px 0">Your project</div><div style="margin-bottom:8px">'+esc(w.proj)+'</div><button class="chip '+(pd_?'on':'')+'" data-a="lproj" data-n="'+w.n+'">'+(pd_?'Project done':'Mark project done')+'</button>';
      else h+='<p class="muted">No lessons this week. Enjoy the trip, or repeat what you built.</p>';
      h+='</div>';
    }
    h+='</div>';
  });
  h+='<section class="card"><div class="lab">Skipped on purpose</div><p class="muted">Games and graphics (days 18–23), desktop apps (27–29, 31), HTML/CSS (41–44), Flask and websites (54–71). Add them later if they interest you.</p></section>';
  return h;
}

/* ================= MORE ================= */
function moneyHtml(){
  const m=state.money;
  if(!m.shown)return '<section class="card"><div class="lab">Money</div><p class="muted">Hidden. Balances stay off the screen until you show them.</p><div class="btns"><button class="btn ghost" data-a="moneyShow">Show money</button></div></section>';
  const tot=m.accounts.reduce((a,x)=>a+(+x.bal||0),0);
  let h='<section class="card"><div class="lab">Money</div>';
  m.accounts.forEach((a,i)=>{
    const pc=a.target?Math.min(100,(+a.bal||0)/a.target*100):0;
    h+='<div class="acc"><div class="accr"><span>'+esc(a.name)+'</span><input class="in w" inputmode="decimal" data-bind="money|accounts|'+i+'|bal" data-t="n" value="'+esc(a.bal!=null?a.bal:'')+'"></div>'+(a.target?'<div class="bar"><i id="mb'+i+'" style="width:'+pc+'%"></i></div><div class="muted sm" id="mt'+i+'">'+chf(+a.bal||0)+' of '+chf(a.target)+' · '+Math.round(pc)+' %</div>':'')+'</div>';
  });
  h+='<div class="accr tot"><b>Total</b><b id="mtotal">'+chf(tot)+'</b></div><div class="btns"><button class="btn" data-a="snap">Save snapshot</button><button class="btn ghost" data-a="moneyHide">Hide</button></div>';
  const sn=m.snaps.slice().reverse().slice(0,6);
  if(sn.length)h+='<div style="margin-top:8px">'+sn.map((x,i)=>{const prev=m.snaps[m.snaps.length-2-i];const dl=prev?x.total-prev.total:null;return '<div class="hist"><span>'+fmtS(x.date)+' · <b>'+chf(x.total)+'</b>'+(dl!=null?' <span class="d '+(dl>=0?'up':'dn')+'">'+(dl>=0?'+':'')+chf(dl)+'</span>':'')+'</span>'+armBtn('sn'+x.date,'delSnap','data-d="'+x.date+'"')+'</div>';}).join('')+'</div>';
  return h+'</section>'+calcHtml();
}
function setupHtml(){
  let h='';
  h+='<section class="card"><div class="lab">General</div><div class="fgrid"><label>Theme (this device)<select class="sel" data-chg="theme"><option value="auto"'+(devTheme()==='auto'?' selected':'')+'>Like the system</option><option value="light"'+(devTheme()==='light'?' selected':'')+'>Light</option><option value="dark"'+(devTheme()==='dark'?' selected':'')+'>Dark</option></select></label><label>Football training ends<input class="in" type="date" data-bind="settings|footballEnd" data-t="t" value="'+esc(state.settings.footballEnd)+'"></label><label>Start weight (kg)<input class="in" inputmode="decimal" data-bind="settings|startWeight" data-t="n" value="'+esc(state.settings.startWeight!=null?state.settings.startWeight:'')+'"></label><label>Show work hours in the schedule<select class="sel" data-chg="workOn"><option value="0"'+(!(state.settings.work||{}).on?' selected':'')+'>No (not fixed yet)</option><option value="1"'+((state.settings.work||{}).on?' selected':'')+'>Yes</option></select></label><label>Work start<input class="in" type="time" data-bind="settings|work|start" data-t="t" value="'+esc((state.settings.work||{}).start||'08:00')+'"></label><label>Work end<input class="in" type="time" data-bind="settings|work|end" data-t="t" value="'+esc((state.settings.work||{}).end||'17:00')+'"></label></div></section>';
  if(window.LDSync)h+=window.LDSync.html();
  if(window.LDPush)h+=window.LDPush.html();
  if(window.LDGarmin)h+=window.LDGarmin.setupHtml()+window.LDGarmin.scaleHtml();
  h+='<section class="card"><div class="lab">Backup</div><p class="muted">Your data is saved on this device and works without signal'+(window.LDSync&&window.LDSync.active()?', and is synced to your account.':'. Turn on sync above to share it between iPhone and PC.')+' A backup file is still a good idea once a month.</p><div class="btns"><button class="btn" data-a="export">Export backup</button><button class="btn ghost" data-a="showBackup">Show backup text</button></div>';
  if(ui.bk)h+='<textarea id="bk" class="in full" readonly>'+esc(ui.bk)+'</textarea><div class="btns"><button class="btn ghost" data-a="copy" data-target="bk">Copy backup text</button></div>';
  h+='<div class="lab" style="margin-top:16px">Restore</div><p class="muted sm">Paste the backup text, or choose the backup file. This replaces what is on this device.</p><textarea id="imp" class="in" placeholder="Paste backup text here"></textarea><div class="btns"><button class="btn ghost" data-a="importText">Restore from text</button><input type="file" id="impf" accept=".json,application/json" data-chg="importFile" style="max-width:100%"></div>';
  h+='<div class="btns" style="margin-top:16px"><button class="btn warn" data-a="reset">'+(ui.armed==='reset'?'Tap again to erase everything':'Reset all data')+'</button></div></section>';
  return h;
}

const PNAME={A:'Strength A',B:'Strength B',C:'Strength C',FB:'Football',MATCH:'Match day',RIDE:'Long ride',RUN_E:'Easy run',RUN_I:'Run intervals',ZW_SS:'Zwift session',DELOAD:'Travel week',REST:'Rest day',PREP:'Prep day',TRIP:'Budapest','T2026-11-07':'Easy ride','T2026-11-08':'Easy run','T2026-11-09':'Test day 1','T2026-11-10':'Football','T2026-11-11':'Test day 2','T2026-11-12':'Football','T2026-11-13':'Test day 3','T2026-11-14':'Match or rest','T2026-11-15':'5 km test'};
const planName=p=>PNAME[p.id]||p.t;
/* ================= EXTRAS ================= */
const GR=[['morning','Morning',['up','am']],['day','Day',['tr','le','pr','wa','ig']],['eve','Evening',['su','ev','li']]];
function curGroup(){const n=new Date().getHours();return n<10?'morning':n<18?'day':'eve';}
function prepItems(s){
  const n=add(s,1),pn=planFor(n),pr=(state.days[s]||{}).prep||{},tn=state.days[n]||{},items=[];
  if(pn.k==='s'||pn.k==='c')items.push(['bag','Bag packed and clothes laid out: '+pn.t.split(' · ')[0]]);
  items.push(['water','Water bottle filled and ready']);
  const li=learnInfo(n);if(li)items.push(['lesson','Open tomorrow’s block: '+li.title.replace('Python · ','')]);
  items.push(['top3','Tomorrow’s to-dos written down',state.todos.some(x=>x.due===n)||!!(tn.top3&&tn.top3.some(x=>x&&x.trim()))]);
  const first=routineFor(n).find(x=>x.start!=null);
  if(first)items.push(['alarm','Alarm set for '+mstr(first.start)]);
  return items.map(it=>{const auto=it[2]!==undefined;return{id:it[0],t:it[1],auto:auto,on:auto?it[2]:!!pr[it[0]]};});
}

/* ================= TO DO NOW ================= */
/* Everything that is due at this time of day and not done yet, worked out from the routine,
   so nothing needs to be remembered. Items appear when their time has come and vanish when ticked. */
function nowMin(){const n=new Date();return n.getHours()*60+n.getMinutes();}
function wakeMin(s){const w=dow(s);return w<=4?(w%2===0?340:345):(w===5?450:480);}
function trainDueAt(s,p){
  const r=routineFor(s),hit=r.find(x=>x.title===p.t&&x.end!=null)||r.find(x=>x.title==='Football training');
  return hit?hit.end:(dow(s)>=5?16*60:18*60);
}
/* all=true: every item of day s that is still open, with the time it becomes due (used for push reminders). */
function dueList(s,all){
  const out={items:[],attn:[],yest:[],prep:false,next:null};
  if(!all&&s!==T())return out;
  const nm=all?1440:nowMin(),w=dow(s),p=planFor(s),c=dayChecks(s),d=state.days[s]||{},wk=wakeMin(s);
  const lin=learnInfo(s);
  const LBL={weight:'Weigh-in (fasted)',sleep:'Log last night’s sleep',up:'Up on time, phone off until breakfast',am:'Morning routine',tests:'Enter your test results',
    tr:'Training: '+planName(p),le:lin?lin.title:'Learning block',wa:'Water',pr:'Protein ≥ 130 g today?',feel:'How was today? Rate your energy',
    sun:'Sunday reset and check-in',su:'Supplements morning + evening',ig:'Instagram ≤ 30 min today?',ev:'Evening discipline',li:'Lights out'};
  const tag=at=>'<span class="tag'+(nm-at>=90?' late':'')+'">since '+mstr(at)+'</span>';
  const chkRow=(id,at,label,extra)=>'<div class="nwr"><button class="chk" data-a="chk" data-id="'+id+'"><span class="bx"></span><span>'+esc(label)+'</span>'+tag(at)+'</button>'+(extra||'')+'</div>';
  const add_=(k,at,html)=>{if(nm>=at)out.items.push({k:k,at:at,html:html,label:LBL[k]||k});};
  const go=(attrs,title,sub)=>'<button class="lr nwr" '+attrs+'><span class="lrt"><b>'+esc(title)+'</b><small>'+esc(sub)+'</small></span><span class="lrr">›</span></button>';
  // things that need attention whatever the time
  state.supp.forEach(x=>{const l=suppLeft(x);if(l&&l.days<=21)out.attn.push(go('data-a="goStock"','Reorder '+x.n,'Runs out '+fmtS(l.end)+(l.days<=7?' · soon!':'')));});
  const gl=window.LDGarmin&&window.LDGarmin.latest&&window.LDGarmin.latest();
  if(gl&&gl<add(T(),-1))out.attn.push(go('data-a="goSetup"','Garmin data missing since '+fmtS(add(gl,1)),'Open Garmin Connect on your phone so the watch syncs'));
  if(hasData()&&!(window.LDSync&&window.LDSync.active())){const le=state.settings.lastExport,age=le?diff(le,T()):999;if(age>=14)out.attn.push(go('data-a="export"','Back up your data',le?'Last backup '+age+' days ago':'No backup yet'));}
  if(s>=START){
    // morning
    if(state.weights[s]==null&&(w===0||w===2||w===4)){
      const wl=Object.keys(state.weights).filter(k=>state.weights[k]!=null&&k<s).sort().pop();
      add_('weight',wk,'<div class="lr nwr"><span class="lrt"><b>Weigh-in</b><small>'+((state.scale&&state.scale.token)?'Step on the scale and open Zepp Life':'Fasted, after the toilet')+(wl?' · last '+state.weights[wl]+' kg':'')+'</small></span><input class="in w" inputmode="decimal" placeholder="kg" data-bind="weights|'+s+'" data-t="n"></div>');
    }
    const gOn=!!(window.LDGarmin&&window.LDGarmin.hasData());
    if(d.sleep==null)add_('sleep',gOn?660:wk,'<div class="lr nwr"><span class="lrt"><b>Sleep last night</b><small>Hours'+(gOn?' · Garmin has not sent it yet':'')+'</small></span><input class="in w" inputmode="decimal" placeholder="h" data-bind="days|'+s+'|sleep" data-t="n"></div>');
    if(!c.up.on)add_('up',wk,chkRow('up',wk,chkText('up',s)));
    const amAt=w<=4?460:wk+90;
    if(!c.am.on)add_('am',amAt,chkRow('am',amAt,'Morning routine complete'));
    if(p.tests){
      const n=p.tests.filter(id=>(state.bench[id]||[]).some(e=>e.date===s)).length; // Garmin-filled values count too
      if(n<p.tests.length)add_('tests',360,go('data-a="goTrain" data-m="day"','Enter test results',n+' of '+p.tests.length+' entered'));
    }
    // during the day
    if(!c.tr.on&&(p.k==='s'||p.k==='c')){
      const at=trainDueAt(s,p),tm=(p.k==='s'&&p.tm)?p.tm:(p.k==='c'?'cardio':'day');
      add_('tr',at,chkRow('tr',at,'Training: '+planName(p),'<button class="ib t" data-a="goTrain" data-m="'+tm+'">Log</button>'));
    }
    const li=learnInfo(s);
    if(li&&!c.le.on&&!c.le.auto){const at=(w===0||w===2)?1080:405;add_('le',at,chkRow('le',at,li.title,'<button class="ib t" data-a="goLearn" data-n="'+li.lw.n+'">Open</button>'));}
    const wn=+d.water||0,exp=nm>=960?3:nm>=720?2:nm>=600?1:0;
    if(all)[[600,1],[720,2],[960,3]].forEach(a=>{if(wn<a[1])out.items.push({k:'wa',at:a[0],html:'',label:'Water: '+a[1]+' of 3 bottles by now'});});
    else if(wn<exp)add_('wa',[600,720,960][exp-1],'<div class="lr nwr"><span class="lrt"><b>Water</b><small>'+wn+' of 3 bottles · aim for '+exp+' by now</small></span><span class="lrr"><button class="ib" data-a="waterAdj" data-d="-1" aria-label="Less">−</button><b class="wn">'+wn+'</b><button class="ib" data-a="waterAdj" data-d="1" aria-label="More">＋</button></span></div>');
    // evening
    if(!c.pr.on)add_('pr',1140,chkRow('pr',1140,'Protein ≥ 130 g today'));
    if(d.energy==null)add_('feel',1200,'<div class="lr nwr"><span class="lrt"><b>How was today?</b><small>Energy 1–10</small></span><input class="in w" inputmode="numeric" placeholder="1–10" data-bind="days|'+s+'|energy" data-t="n"></div>');
    if(w===6){const n=sunDone(s),N=sunList().length;if(n<N)add_('sun',960,go('data-a="goWeek"','Sunday reset and check-in',n+' of '+N+' done · check-in at 17:00'));}
    if(!c.su.on)add_('su',1260,chkRow('su',1260,'Supplements morning + evening'));
    if(!c.ig.on)add_('ig',1260,chkRow('ig',1260,'Instagram ≤ 30 min today'));
    if(!c.ev.on)add_('ev',1315,chkRow('ev',1315,'Evening discipline'));
    if(!c.li.on)add_('li',1320,chkRow('li',1320,chkText('li',s)));
    if(nm>=1230&&prepItems(s).some(x=>!x.on))out.prep=true;
    // last night's checks are usually ticked the next morning
    const y=add(s,-1);
    if(y>=TRACK&&nm<720){
      const cy=dayChecks(y);
      ['pr','wa','su','ig','ev','li'].forEach(id=>{if(!cy[id].on&&!cy[id].auto)out.yest.push('<div class="nwr"><button class="chk" data-a="wchk" data-date="'+y+'" data-id="'+id+'"><span class="bx"></span><span>'+esc(CHK.find(x=>x.id===id).t)+'</span></button></div>');});
    }
  }
  out.items.sort((a,b)=>a.at-b.at);
  out.next=nextUp(s);
  return out;
}
/* What is already done today, folded into one line so the open items keep the space.
   Unfolded, ticks can be undone and values changed. */
function doneHtml(s){
  const c=dayChecks(s),d=state.days[s]||{},p=planFor(s),lab=[],rows=[];
  const val=(title,path,v,unit,mode)=>{lab.push(title+' '+v+unit);rows.push('<div class="lr nwr"><span class="lrt"><b>'+title+'</b></span><input class="in w" inputmode="'+mode+'" data-bind="'+path+'" data-t="n" value="'+esc(v)+'"></div>');};
  if(state.weights[s]!=null)val('Weigh-in','weights|'+s,state.weights[s],' kg','decimal');
  if(d.sleep!=null)val('Sleep','days|'+s+'|sleep',d.sleep,' h','decimal');
  CHK.forEach(x=>{
    const k=c[x.id];
    if(x.id==='wa'||!k.on||(k.auto&&!(x.id==='tr'&&p.k!=='r')))return; // rest days and free learning days are not "done"
    lab.push(x.s);
    rows.push('<div class="nwr"><button class="chk on'+(k.auto?' auto':'')+'" data-a="chk" data-id="'+x.id+'"><span class="bx">✓</span><span>'+esc(chkText(x.id,s))+'</span>'+(k.auto?'<span class="tag">auto</span>':'')+'</button></div>');
  });
  const wn=+d.water||0;
  if(wn>0){lab.push('Water '+wn+'/3');rows.push('<div class="lr nwr"><span class="lrt"><b>Water</b><small>'+wn+' of 3 bottles</small></span><span class="lrr"><button class="ib" data-a="waterAdj" data-d="-1" aria-label="Less">−</button><b class="wn">'+wn+'</b><button class="ib" data-a="waterAdj" data-d="1" aria-label="More">＋</button></span></div>');}
  if(d.energy!=null)val('Energy','days|'+s+'|energy',d.energy,'/10','numeric');
  if(!lab.length)return '';
  let h='<button class="lr nsub ndone" data-a="doneTog"><span class="lrt"><b>✓ '+lab.length+' done today</b><small>'+esc(lab.join(' · '))+'</small></span><span class="lrr">'+(ui.dn?'▴':'▾')+'</span></button>';
  if(ui.dn)h+='<div class="nwl">'+rows.join('')+'</div>';
  return h;
}
function nowHtml(s){
  const L=dueList(s),sc=cnt(dayChecks(s)),ws=weekScore(monday(s)),n=L.items.length+L.attn.length;
  let h='<section class="card now"><div class="nowh"><div><div class="lab" style="margin:0">'+(n?'To do now':'All caught up ✓')+'</div><div class="muted sm">'+(L.next?(L.next.start<=nowMin()?'Now: ':'Next: ')+mstr(L.next.start)+' · '+esc(L.next.title):'Nothing else scheduled today')+'</div></div><div class="nows"><b>'+sc+'/10</b><small>today'+(ws.mx?' · week '+ws.sc+'/'+ws.mx:'')+'</small></div></div>'+bar(sc*10);
  if(n)h+='<div class="nwl">'+L.attn.join('')+L.items.map(x=>x.html).join('')+'</div>';
  else h+='<p class="muted sm" style="margin:10px 0 0">Everything that is due is done. New items show up here when their time comes.</p>';
  h+=doneHtml(s);
  if(L.prep)h+=prepHtml(s);
  if(L.yest.length){
    h+='<button class="lr nsub" data-a="yTog"><span class="lrt"><b>Yesterday: '+L.yest.length+' check'+(L.yest.length>1?'s':'')+' still open</b><small>Tick what you did last night</small></span><span class="lrr">'+(ui.yo?'▴':'▾')+'</span></button>';
    if(ui.yo)h+='<div class="nwl">'+L.yest.join('')+'</div>';
  }
  // every check of the day (to tick something before it is due) and the day's note
  h+='<button class="lr nsub" data-a="allcTog"><span class="lrt"><b>All checks and note</b><small>Tick something early, or write a note</small></span><span class="lrr">'+(ui.allc?'▴':'▾')+'</span></button>';
  if(ui.allc){const d=state.days[s]||{};h+='<div class="nwl allc">'+checksHtml(s)+'<input class="in full" placeholder="Note for today (optional)" data-bind="days|'+s+'|note" data-t="t" value="'+esc(d.note||'')+'" style="margin:8px 0 4px"></div>';}
  return h+'</section>';
}
/* Push reminder plan for today and the next two days. To keep it calm, items are bundled into a few
   moments per day (wake-up, after breakfast, noon, afternoon, evening, 21:00 check, lights out); each
   notice lists what became due since the last one. Ticking something regenerates the plan, so done
   items are never reminded. */
function reminderPlan(){
  const now=Date.now(),out=[],skipSleep=!!(window.LDGarmin&&window.LDGarmin.hasData());
  const at=(s,min)=>{const d=pd(s);d.setHours(0,min,0,0);return d;};
  for(let i=0;i<3;i++){
    const s=add(T(),i);if(s<START)continue;
    const wk=wakeMin(s),M=(dow(s)<=4?[wk,465,720,960,1140,1260,1320]:[wk,720,960,1140,1260,1320]).sort((a,b)=>a-b);
    const L=dueList(s,true),slots={};
    const items=L.items.filter(x=>!(skipSleep&&x.k==='sleep'));
    if(L.prep)items.push({k:'prep',at:1230,label:'Prepare tomorrow: bag, bottle, top 3, alarm'});
    items.forEach(x=>{
      const m=M.find(v=>v>=x.at)||M[M.length-1];
      (slots[m]=slots[m]||new Map()).set(x.k,x.label); // same key twice (water) keeps the latest text
    });
    Object.keys(slots).forEach(m=>{
      const t=at(s,+m);if(t.getTime()<=now+30000)return;
      const ls=[...slots[m].values()];
      const open=+m===1260?items.filter(x=>x.at<=1260).length:0;
      out.push({key:s+'|'+m,at:t.toISOString(),tag:'ld-'+s+'-'+m,
        title:open>ls.length?'Evening check · '+open+' still open':(ls.length===1?ls[0]:ls.length+' things to tick off'),
        body:ls.length===1&&open<=1?'Tap to open the dashboard':ls.join(' · ')});
    });
  }
  return out.sort((a,b)=>a.at<b.at?-1:1);
}

function prepHtml(s){
  const n=add(s,1),pn=planFor(n);
  let h='<div style="margin:10px 0 2px;padding-top:10px;border-top:1px solid var(--line)"><div class="lab" style="margin:0">Prepare tomorrow · '+fmtD(n)+'</div><div class="muted sm">'+esc(pn.t)+'</div></div>';
  prepItems(s).forEach(it=>{h+='<button class="chk '+(it.on?'on':'')+(it.auto?' auto':'')+'" data-a="prepTog" data-id="'+it.id+'"><span class="bx">'+(it.on?'✓':'')+'</span><span>'+esc(it.t)+'</span></button>';});
  return h;
}
/* supplements stock */
function suppLeft(x){if(!(x.stock>0)||!(x.use>0))return null;const end=add(x.date,Math.floor(x.stock/x.use));return{end:end,days:diff(T(),end)};}
function suppText(x){const l=suppLeft(x);if(!l)return 'Enter stock and daily use';return 'Lasts until '+fmtS(l.end)+' · order by '+fmtS(add(l.end,-21))+(l.days<=21?' · reorder now':'');}
function updSupp(i){const el=$('#sp'+i);if(el)el.textContent=suppText(state.supp[i]);}
function suppBanner(){
  const low=state.supp.map(x=>({x:x,l:suppLeft(x)})).filter(o=>o.l&&o.l.days<=21);
  if(!low.length)return '';
  return '<section class="card warn"><b>Reorder soon</b><p class="muted">'+low.map(o=>esc(o.x.n)+' runs out '+fmtS(o.l.end)).join(' · ')+'</p><div class="btns"><button class="btn ghost" data-a="goStock">Open stock</button></div></section>';
}
function stockHtml(){
  let h='<section class="card"><div class="lab">Supplement stock</div><p class="muted sm">Enter what you have and your daily use. The app works out how long it lasts. Changing the amount restarts the count from today.</p>';
  state.supp.forEach((x,i)=>{
    h+='<div class="acc"><b>'+esc(x.n)+'</b><div class="muted sm" id="sp'+i+'">'+esc(suppText(x))+'</div><div class="fgrid" style="margin-top:6px"><label>In stock ('+esc(x.unit)+')<input class="in" inputmode="decimal" data-bind="supp|'+i+'|stock" data-t="n" value="'+esc(x.stock!=null?x.stock:'')+'"></label><label>Use per day<input class="in" inputmode="decimal" data-bind="supp|'+i+'|use" data-t="n" value="'+esc(x.use!=null?x.use:'')+'"></label></div></div>';
  });
  return h+'</section>';
}
/* salary split */
function calcRows(){
  const m=state.money,c=m.calc,net=+c.net||0,a=m.accounts,bal=i=>+a[i].bal||0;
  const life=+c.life||0,tax=net*(+c.tax||0)/100;
  let avail=net-life-tax;
  const stu=Math.max(0,Math.min(+c.study||0,Math.max(0,(a[3].target||0)-bal(3)),avail));avail-=stu;
  const em=Math.max(0,Math.min(Math.max(0,(a[2].target||0)-bal(2)),avail));avail-=em;
  const ma=Math.max(0,Math.min(Math.max(0,(a[1].target||0)-bal(1)),avail));avail-=ma;
  return [['Lifestyle budget (stays on '+a[0].name+')',life],['Tax reserve '+(c.tax||0)+' %',tax],[a[3].name,stu],[a[2].name+' (up to '+chf(a[2].target||0)+')',em],[a[1].name+' (up to '+chf(a[1].target||0)+')',ma],['ETF savings plan',Math.max(0,avail)]];
}
function calcResHtml(){
  const c=state.money.calc;
  if(!(c.net>0))return '<p class="muted">Enter your net salary to see the split.</p>';
  const rows=calcRows(),tot=rows.reduce((x,r)=>x+r[1],0);
  return rows.map(r=>'<div class="q"><span>'+esc(r[0])+'</span><b>'+chf(r[1])+'</b></div>').join('')+'<div class="q"><span><b>Total</b></span><b>'+chf(tot)+'</b></div><p class="muted sm">Saved or reserved: '+Math.round((c.net-(+c.life||0))/c.net*100)+' % of your net salary. The first months fill the savings accounts up to their targets, then the ETF gets the rest.</p>';
}
function updCalc(){const e=$('#calcres');if(e)e.innerHTML=calcResHtml();}
function calcHtml(){
  const c=state.money.calc;
  const f=(l,k)=>'<label>'+l+'<input class="in" inputmode="decimal" data-bind="money|calc|'+k+'" data-t="n" value="'+esc(c[k]!=null?c[k]:'')+'"></label>';
  return '<section class="card"><div class="lab">Salary split</div><p class="muted sm">Order: lifestyle budget, tax reserve, '+esc([3,2,1].map(i=>state.money.accounts[i].name).join(', '))+' up to their targets, then the rest into the ETF plan.</p><div class="fgrid">'+f('Net salary (CHF)','net')+f('Lifestyle budget','life')+f('Tax reserve (%)','tax')+f('Study start per month','study')+'</div><div id="calcres" style="margin-top:10px">'+calcResHtml()+'</div></section>';
}
/* strength: e1RM, PR, warm-ups, curves */
function e1Entries(exId){
  const ex=EXALL[exId],mp={};
  if(!ex||ex.sec||ex.bw)return [];
  state.sessions.forEach(z=>{
    if(z.type==='cardio'||!sessHasData(z))return;
    let best=0;((z.sets||{})[exId]||[]).forEach(x=>{if(x&&x.reps!=null&&x.kg>0){const e=x.kg*(1+x.reps/30);if(e>best)best=e;}});
    if(best>0&&(!mp[z.date]||best>mp[z.date]))mp[z.date]=best;
  });
  Object.keys(BM2EX).forEach(bid=>{if(BM2EX[bid]===exId)(state.bench[bid]||[]).forEach(e=>{const v=e.v*(1+BMD[bid].reps/30);if(!mp[e.date]||v>mp[e.date])mp[e.date]=v;});});
  return Object.keys(mp).sort().map(k=>({date:k,v:mp[k]}));
}
function prHtml(ex,s){
  if(ex.sec||ex.bw)return '';
  const es=e1Entries(ex.id),cur=es.find(e=>e.date===s),prev=es.filter(e=>e.date<s).reduce((a,e)=>Math.max(a,e.v),0);
  if(!cur)return '';
  return (prev>0&&cur.v>prev?'<span class="prb">New best</span>':'')+'<span class="e1">e1RM '+r1(cur.v)+' kg</span>';
}
function updPR(exId){const el=$('#pr-'+exId);if(el&&EXALL[exId])el.innerHTML=prHtml(EXALL[exId],ui.date);}
function warmInner(ex){
  const t=+state.targets[ex.id];
  if(!(t>0))return 'Set a target weight to see warm-up sets.';
  return 'Warm-up: '+[[.4,8],[.6,5],[.75,3]].map(f=>{const w=t*f[0],kg=ex.wu==='bar'?Math.max(20,Math.round(w/2.5)*2.5):Math.max(4,Math.round(w));return kg+' kg × '+f[1];}).join(' → ');
}
function warmHtml(ex){return ex.wu?'<div class="sm muted" id="wu-'+ex.id+'" style="margin-top:4px">'+esc(warmInner(ex))+'</div>':'';}
function curveSvg(es){
  const W=340,H=130,L=34,R=8,Tp=8,B=20,ks=es.map(e=>e.date),vals=es.map(e=>e.v);
  const span=Math.max(14,diff(ks[0],ks[ks.length-1]));
  let mn=Math.min.apply(null,vals)-2,mx=Math.max.apply(null,vals)+2;
  if(mx-mn<6){const c=(mx+mn)/2;mn=c-3;mx=c+3;}
  const X=k=>L+(diff(ks[0],k)/span)*(W-L-R),Y=v=>Tp+(1-(v-mn)/(mx-mn))*(H-Tp-B);
  let g='';
  [mn,(mn+mx)/2,mx].forEach(v=>{g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/><text x="'+(L-4)+'" y="'+(Y(v)+3).toFixed(1)+'" text-anchor="end">'+Math.round(v)+'</text>';});
  g+='<path d="'+ks.map((k,i)=>(i?'L':'M')+X(k).toFixed(1)+' '+Y(vals[i]).toFixed(1)).join(' ')+'" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
  ks.forEach((k,i)=>{g+='<circle cx="'+X(k).toFixed(1)+'" cy="'+Y(vals[i]).toFixed(1)+'" r="3" fill="var(--accent)"/>';});
  g+='<text x="'+L+'" y="'+(H-5)+'">'+fmtS(ks[0])+'</text><text x="'+(W-R)+'" y="'+(H-5)+'" text-anchor="end">'+fmtS(ks[ks.length-1])+'</text>';
  return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Estimated max">'+g+'</svg>';
}
function curvesHtml(){
  const rows=Object.keys(EXALL).map(id=>EXALL[id]).filter(e=>!e.sec&&!e.bw).map(ex=>{
    const es=e1Entries(ex.id);if(!es.length)return '';
    const best=es.reduce((a,e)=>e.v>a.v?e:a,es[0]),last=es[es.length-1],open=ui.sopen===ex.id;
    return '<div class="bm"><button class="bmh" data-a="sopen" data-id="'+ex.id+'"><div class="nm"><b>'+esc(ex.n)+'</b><div class="muted sm">best '+r1(best.v)+' kg · '+fmtS(best.date)+'</div></div>'+spark(es.map(e=>e.v))+'<div class="v">'+r1(last.v)+' kg</div></button>'+(open?'<div style="margin-top:8px">'+curveSvg(es)+'</div>':'')+'</div>';
  }).filter(Boolean);
  if(!rows.length)return '<section class="card"><div class="lab">Strength curves</div><p class="muted">After your first sessions and tests, the estimated max per exercise shows up here.</p></section>';
  return '<section class="card"><div class="lab">Strength curves · estimated max</div>'+rows.join('')+'<p class="muted sm">Estimated 1-rep max = weight × (1 + reps ÷ 30), from your logged sets and test results. Tap an exercise for the curve.</p></section>';
}
/* reviews */
function periodStats(from,to){
  const t=T(),days=[];for(let s=from;s<=to;s=add(s,1))days.push(s);
  const sc=days.filter(s=>s>=TRACK&&s<=t),inr=z=>z.date>=from&&z.date<=to&&sessHasData(z);
  const ws=days.map(s=>state.weights[s]).filter(v=>v!=null);
  return{n:sc.length,pts:sc.reduce((a,s)=>a+dayScore(s),0),mx:sc.length*10,
   str:state.sessions.filter(z=>z.type!=='cardio'&&inr(z)).length,car:state.sessions.filter(z=>z.type==='cardio'&&inr(z)).length,
   ws:ws,wAvg:avg(ws),wFirst:ws[0],wLast:ws[ws.length-1],
   sleep:avg(days.map(s=>(state.days[s]||{}).sleep).filter(v=>v!=null)),energy:avg(days.map(s=>(state.days[s]||{}).energy).filter(v=>v!=null))};
}
function statsHtml(st){
  const f=(l,v)=>'<div class="q"><span>'+l+'</span><b>'+v+'</b></div>';
  return f('Tracker points',st.mx?st.pts+' / '+st.mx+' ('+Math.round(st.pts/st.mx*100)+' %)':'–')+f('Strength sessions',st.str)+f('Cardio / football',st.car)+
   f('Weight',st.wAvg!=null?'avg '+r1(st.wAvg)+' kg'+(st.ws.length>1?' · '+(st.wLast-st.wFirst>=0?'+':'')+r1(st.wLast-st.wFirst)+' in the period':''):'–')+
   f('Sleep · energy',(st.sleep!=null?r1(st.sleep)+' h':'–')+' · '+(st.energy!=null?r1(st.energy)+'/10':'–'));
}
function revCtx(){
  if(ui.rmode==='w'){const m=ui.cw,to=add(m,6);return{key:'w:'+m,from:m,to:to,title:'Weekly review · week '+isoWeek(m)+' · '+fmtS(m)+' – '+fmtS(to),prompts:state.settings.revW,pk:'revW'};}
  const fd=pd(ui.rmon),to=ds(new Date(fd.getFullYear(),fd.getMonth()+1,0));
  return{key:'m:'+ui.rmon.slice(0,7),from:ui.rmon,to:to,title:'Monthly review · '+MON[fd.getMonth()]+' '+fd.getFullYear(),prompts:state.settings.revM,pk:'revM'};
}
/* One text for the chat: the check-in numbers (week or month) plus your answers. */
function buildReview(){
  const c=revCtx(),ans=state.reviews[c.key]||{};
  const L=[(ui.rmode==='w'?buildCheckin(c.from):buildMonthly(c.from,c.to)).replace(/\n\/silas$/,'')];
  const qa=c.prompts.filter(q=>(ans[q.id]||'').trim());
  if(qa.length){L.push('');L.push(ui.rmode==='w'?'Weekly review':'Monthly review');qa.forEach(q=>{L.push(q.q);L.push(ans[q.id].trim());L.push('');});}
  else L.push('');
  L.push('/silas');
  return L.join('\n');
}
function vReview(){
  const md=ui.rmode,c=revCtx(),st=periodStats(c.from,c.to),ans=state.reviews[c.key]||{};
  let h='<div class="seg">'+[['w','Weekly'],['m','Monthly']].map(x=>'<button class="'+(md===x[0]?'on':'')+'" data-a="rmode" data-m="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>';
  if(md==='m')h+='<div class="btns" style="margin:-4px 0 10px"><button class="ib" data-a="rprev" aria-label="Previous month">‹</button><button class="ib" data-a="rnext" aria-label="Next month">›</button></div>';
  h+='<section class="card"><div class="lab">'+esc(c.title)+'</div>'+statsHtml(st)+'</section>';
  if(ui.revEdit){
    h+='<section class="card"><div class="lab">Edit your questions</div>'+c.prompts.map((q,i)=>'<div class="cdr"><input class="in" data-bind="settings|'+c.pk+'|'+i+'|q" data-t="t" value="'+esc(q.q)+'"><button class="ib" data-a="rdel" data-i="'+i+'" aria-label="Remove">×</button></div>').join('')+'<div class="btns"><button class="btn ghost" data-a="radd">Add question</button><button class="btn" data-a="reditTog">Done</button></div></section>';
    return h;
  }
  c.prompts.forEach(q=>{
    h+='<section class="card"><div class="rq">'+esc(q.q)+'</div><textarea class="in rv" placeholder="Write freely…" data-bind="reviews|'+c.key+'|'+q.id+'" data-t="t">'+esc(ans[q.id]||'')+'</textarea></section>';
  });
  h+='<section class="card"><div class="lab">Check-in text</div><p class="muted sm">Numbers of the '+(md==='w'?'week':'month')+' plus your answers, ready to paste into the chat.</p>';
  if(md==='w')h+='<input class="in" data-bind="weeks|'+c.from+'|special" data-t="t" placeholder="Anything special next week? (work hours, trip, match)" value="'+esc((state.weeks[c.from]||{}).special||'')+'">';
  h+='<div class="btns"><button class="btn" data-a="genReview">Create text</button><button class="btn ghost" data-a="reditTog">Edit questions</button></div>';
  if(ui.rv)h+='<textarea id="rvtxt" class="in full" readonly>'+esc(ui.rv)+'</textarea><div class="btns"><button class="btn ghost" data-a="copy" data-target="rvtxt">Copy text</button></div>';
  return h+'</section>';
}
/* plan + more containers */
function vPlan(){
  ui.wm=ui.cw;
  if(isPhone()&&['sched','todo'].indexOf(ui.pmode)<0)ui.pmode='sched';
  const m=ui.cw,t=T(),md=ui.pmode;
  let h=head(isPhone()?'Plan':({sched:'Schedule',todo:'To-dos',track:'Tracker',review:'Review'}[md]||'Plan'),'Week '+isoWeek(m)+' · '+fmtS(m)+' – '+fmtS(add(m,6)),'<div class="nav"><button class="ib" data-a="cprev" aria-label="Previous week">‹</button>'+(m!==monday(t)?'<button class="ib t" data-a="ctoday">This week</button>':'')+'<button class="ib" data-a="cnext" aria-label="Next week">›</button></div>')+storageBanner();
  if(isPhone())h+='<div class="seg">'+[['sched','Schedule'],['todo','To-dos']].map(x=>'<button class="'+(md===x[0]?'on':'')+'" data-a="pmode" data-m="'+x[0]+'">'+x[1]+'</button>').join('')+'</div>';
  return h+(md==='track'?vWeek():md==='review'?vReview():md==='todo'?vTodos():vCal());
}
function vMore(){
  const m=ui.mmode;
  if(isPhone()&&m!=='setup'){ui.mmode='setup';return vMore();}
  let h=head({learn:'Learn',money:'Money',stock:'Stock',claude:'Claude',setup:'Settings'}[m]||'More','')+storageBanner();
  return h+(m==='money'?moneyHtml():m==='stock'?stockHtml():m==='setup'?setupHtml():m==='claude'?claudeHtml():vLearn());
}

/* ================= CALENDAR ================= */
const tmin=s=>{const m=String(s||'').match(/^(\d{1,2}):(\d{2})$/);return m?(+m[1])*60+(+m[2]):null;};
const mstr=n=>pad(Math.floor(n/60)%24)+':'+pad(n%60);
const calBase=()=>ui.tab==='cal'?(isPhone()?calDay():T()):ui.date;
function fixedEvents(){
  const L=[
   {id:'f-bud',title:'Budapest trip',date:'2026-11-01',until:'2026-11-06'},
   {id:'f-start',title:'Plan starts',date:'2026-11-07'},
   {id:'f-job',title:'Job interview (tap to set the time)',date:'2026-11-10'},
   {id:'f-ftp',title:'Zwift ramp test (FTP)',date:'2026-11-13',start:'18:00',end:'18:30'},
   {id:'f-fb',title:'Outdoor football training ends (approx.)',date:state.settings.footballEnd},
   {id:'f-ny',title:'New Year trip with your parents',date:'2026-12-26',until:'2027-01-01'},
   {id:'f-uni',title:'University starts (approx.)',date:'2027-09-20'}
  ];
  [[2026,12],[2027,1],[2027,2],[2027,3],[2027,4],[2027,5],[2027,6],[2027,7],[2027,8]].forEach(a=>{
    const f=a[0]+'-'+pad(a[1])+'-01',d=add(f,(6-dow(f)+7)%7);
    L.push({id:'f-mc'+d,title:'Monthly check-in (+30 min)',date:d,start:'17:30',end:'18:00'});
  });
  return L;
}
const PSHORT={A:'A',B:'B',C:'C',FB:'FB',MATCH:'Match',RIDE:'Ride',RUN_E:'Run',RUN_I:'Run int.',ZW_SS:'Zwift',DELOAD:'Trip',REST:'Rest',PREP:'Prep',TRIP:'Trip','T2026-11-07':'Ride','T2026-11-08':'Run','T2026-11-09':'Test 1','T2026-11-10':'FB','T2026-11-11':'Test 2','T2026-11-12':'FB','T2026-11-13':'Test 3','T2026-11-14':'Match','T2026-11-15':'5 km'};
const planShort=p=>PSHORT[p.id]||p.t.split(' ')[0];
function routineFor(s){
  if(s<START||(s>='2026-12-26'&&s<='2027-01-01'))return [];
  const w=dow(s),p=planFor(s),out=[],wk=state.settings.work||{},ps=planShort(p);
  const R=(t,a,b,sh)=>out.push({id:'r-'+s+'-'+out.length,title:t,short:sh||t,kind:'routine',start:tmin(a),end:tmin(b)});
  if(w<=4){
    if(w%2===0){R('Wake up, water, snack','05:40','06:00','Wake');R(p.t,'06:00','07:00',ps);R('Shower, breakfast, supplements','07:05','07:40','Shower + food');}
    else{R('Wake up, water','05:45','06:00','Wake');R('Python block','06:00','06:45','Python');R('Shower, breakfast, supplements','06:50','07:40','Shower + food');}
    if(wk.on&&tmin(wk.start)!=null&&tmin(wk.end)!=null)R('Work',wk.start,wk.end,'Work');
    if(w===0||w===2)R('Python block','17:15','18:00','Python');
    const fb=(w===1||w===3)&&(p.id==='FB'||/football/i.test(p.t));
    if(!fb&&(w===1||w===3)&&p.k==='c')R(p.t,'17:30',p.id==='RUN_I'?'18:15':'18:30',ps);
    if(fb){R('Early meal','18:00','18:40','Meal');R('Football training','19:00','20:20','Football');R('Shower and snack','20:40','21:00','Snack');}
    else R('Dinner with the family','18:30','19:15','Dinner');
    R('Evening routine','21:00','21:55','Evening');
    R('Lights out',fb?'22:15':'22:00',fb?'22:30':'22:15','Lights out');
  }else{
    R('Wake up by '+(w===5?'07:30':'08:00'),w===5?'07:30':'08:00',w===5?'07:45':'08:15','Wake');
    out.push({id:'r-'+s+'-p',title:p.t,short:ps,kind:'routine',start:null,end:null});
    if(w===6)R('Weekly check-in','17:00','17:30','Check-in');
    R('Evening routine','21:00','21:55','Evening');R('Lights out','22:00','22:15','Lights out');
  }
  return out;
}
const inRange=(e,s)=>s>=e.date&&s<=(e.until||e.date);
/* open to-dos with a time on day s, shaped like schedule items (for Coming up and the day list) */
const todoTimed=s=>state.todos.filter(x=>!x.done&&x.due===s&&x.time&&tmin(x.time)!=null).map(x=>({id:x.id,title:x.t,short:x.t,kind:'todo',start:tmin(x.time),end:tmin(x.time)+30}));
function mkItem(e,kind){const a=e.until?null:tmin(e.start),b=tmin(e.end);return{id:e.id,title:e.title,kind:kind,start:a,end:a!=null?((b!=null&&b>a)?b:a+60):null,multi:!!e.until,short:e.title,ref:e};}
function dayItems(s){
  const out=routineFor(s).slice();
  fixedEvents().forEach(e=>{if(!state.hiddenFixed[e.id]&&inRange(e,s))out.push(mkItem(e,'fixed'));});
  state.events.forEach(e=>{if(inRange(e,s))out.push(mkItem(e,'event'));});
  return out;
}
/* quick add: plain-text parser (German + English) */
const WI3={mon:0,die:1,tue:1,mit:2,wed:2,don:3,thu:3,fre:4,fri:4,sam:5,sat:5,son:6,sun:6};
const WI2={mo:0,di:1,mi:2,do:3,fr:4,sa:5,so:6};
const wdIndex=w=>{w=w.toLowerCase();return w.length>=3?WI3[w.slice(0,3)]:WI2[w];};
const WD_LONG=/\b(?:(?:next|nächsten?|naechsten?|am|on)\s+)?(montag|monday|mon|dienstag|tuesday|tues|tue|mittwoch|wednesday|wed|donnerstag|thursday|thurs|thur|thu|freitag|friday|fri|samstag|saturday|sat|sonntag|sunday|sun)\b\.?/i;
const WD_SHORT=/\b(mo|di|mi|do|fr|sa|so)\b(?:\.|(?=\s+(?:\d|um\b|at\b|ab\b|from\b)))/i;
const MNN={jan:0,feb:1,mar:2,'mär':2,apr:3,mai:4,may:4,jun:5,jul:6,aug:7,sep:8,okt:9,oct:9,nov:10,dez:11,dec:11};
const MRE='(jan|feb|mär|mar|apr|mai|may|jun|jul|aug|sep|okt|oct|nov|dez|dec)';
function parseQuick(txt,base){
  const now=T(),y0=pd(now).getFullYear();
  let t=' '+String(txt).trim()+' ',start=null,end=null,found=null,wd=-1;
  const take=(re,fn)=>{const m=t.match(re);if(!m)return false;fn(m);t=t.replace(m[0],' ');return true;};
  const mkd=(y,m,d)=>{const x=new Date(y,m,d);return(x.getFullYear()===y&&x.getMonth()===m&&x.getDate()===d)?ds(x):null;};
  const yr=(y,mo,d)=>{let r=mkd(y||y0,mo,d);if(r&&!y&&r<now)r=mkd(y0+1,mo,d);return r;};
  take(WD_LONG,m=>{wd=wdIndex(m[1]);})||take(WD_SHORT,m=>{wd=wdIndex(m[1]);});
  take(/(\d{1,2}):(\d{2})\s*(?:-|–|—|bis|to|until)\s*(\d{1,2}):(\d{2})/i,m=>{start=+m[1]*60+ +m[2];end=+m[3]*60+ +m[4];})
   ||take(/(\d{1,2}):(\d{2})/,m=>{start=+m[1]*60+ +m[2];})
   ||take(/(\d{1,2})[.](\d{2})\s*uhr\b/i,m=>{start=+m[1]*60+ +m[2];})
   ||take(/\b(\d{1,2})\s*(?:uhr|h)\b/i,m=>{start=+m[1]*60;})
   ||take(/\b(\d{1,2})\s*(am|pm)\b/i,m=>{start=((+m[1])%12+(/pm/i.test(m[2])?12:0))*60;})
   ||take(/\bum\s+(\d{1,2})\b/i,m=>{start=+m[1]*60;});
  take(/(\d{4})-(\d{2})-(\d{2})/,m=>{found=mkd(+m[1],+m[2]-1,+m[3]);})
   ||take(/\b(\d{1,2})\.(\d{1,2})\.?(?:(\d{4}|\d{2})\b)?/,m=>{const y=m[3]?(m[3].length===2?2000+(+m[3]):+m[3]):0;found=yr(y,+m[2]-1,+m[1]);})
   ||take(new RegExp('\\b(\\d{1,2})\\.?\\s*'+MRE+'[a-zäöü]*\\.?(?:\\s+(\\d{4}))?','i'),m=>{found=yr(m[3]?+m[3]:0,MNN[m[2].toLowerCase()],+m[1]);})
   ||take(new RegExp('\\b'+MRE+'[a-zäöü]*\\.?\\s+(\\d{1,2})\\b','i'),m=>{found=yr(0,MNN[m[1].toLowerCase()],+m[2]);})
   ||take(/\b(?:übermorgen|uebermorgen)\b/i,()=>{found=add(now,2);})
   ||take(/\b(?:morgen|tomorrow)\b/i,()=>{found=add(now,1);})
   ||take(/\b(?:heute|today)\b/i,()=>{found=now;});
  if(!found&&wd>=0){let n=(wd-dow(now)+7)%7;if(n===0)n=7;found=add(now,n);}
  if(start!=null&&(start<0||start>=1440))start=null;
  if(end!=null&&(start==null||end<=start||end>=1440))end=null;
  let title=t.replace(/\s+/g,' ').trim();
  for(let i=0;i<3;i++)title=title.replace(/^(?:am|um|on|at|von|ab|from|bis|to|until|den)\s+/i,'').replace(/\s+(?:am|um|on|at|von|ab|from|bis|to|until|den)$/i,'').replace(/^[\s,;:–—-]+|[\s,;:–—-]+$/g,'');
  return{date:found||base,start:start,end:end,title:title,hadDate:!!found};
}
function qaPreview(v,base){
  if(!v.trim())return 'Type it in plain words, e.g. “Dentist Tue 17 Nov 14:30”. No date means '+(base===T()?'today':fmtD(base))+'.';
  const r=parseQuick(v,base);
  return '→ '+fmtD(r.date)+(r.start!=null?' · '+mstr(r.start)+(r.end!=null?'–'+mstr(r.end):''):' · all day')+' · '+(r.title||'Appointment')+(r.hadDate?'':' (no date found, using '+fmtD(base)+')');
}
function quickAdd(){
  return '<div class="qa"><input class="in" id="qa" data-qa="1" placeholder="e.g. Dentist Tue 17 Nov 14:30" autocomplete="off"><button class="btn" data-a="qaAdd">Add</button></div><div class="qpv" id="qapv">'+esc(qaPreview('',calBase()))+'</div><div class="btns" style="margin-top:6px"><button class="btn ghost" data-a="evnew">Detailed form</button></div>';
}
function updQa(t){const pv=$('#qapv');if(pv)pv.textContent=qaPreview(t.value,calBase());}
/* A day as an ordered list: time on the left, one row per block. Overlapping blocks simply follow
   each other, long free stretches show as a gap, and on today a line marks "now". */
function dayListHtml(s,compact){
  const t=T(),nm=s===t?nowMin():-1,items=dayItems(s).concat(todoTimed(s)),pt=planFor(s).t;
  const allday=items.filter(x=>x.start==null);
  const timed=items.filter(x=>x.start!=null).sort((a,b)=>a.start-b.start||a.end-b.end);
  let h='';
  if(allday.length)h+='<div class="adr">'+allday.map(x=>x.kind==='routine'?'<span class="achip routine">'+esc(compact?x.short:x.title)+'</span>':'<button class="achip '+x.kind+'" data-a="evedit" data-id="'+esc(x.id)+'" data-src="'+x.kind+'">'+esc(compact?x.short:x.title)+'</button>').join('')+'</div>';
  if(!timed.length)return h+(allday.length?'':'<p class="muted sm" style="margin:6px 2px">Nothing scheduled.</p>');
  let prevEnd=null,nowDone=s!==t;
  const nowLine='<div class="ag-now"><span>'+mstr(Math.max(0,nm))+'</span></div>';
  timed.forEach(x=>{
    if(!nowDone&&x.start>nm){h+=nowLine;nowDone=true;}
    if(!compact&&prevEnd!=null&&x.start-prevEnd>=120){const g=x.start-prevEnd;h+='<div class="ag-gap">'+Math.floor(g/60)+' h'+(g%60?' '+g%60+' min':'')+' free</div>';}
    const past=s===t&&x.end<=nm,cur=s===t&&x.start<=nm&&x.end>nm;
    const key=x.kind==='routine'&&(x.title===pt||/^Python block|^Football training|^Weekly check-in/.test(x.title)); // the blocks that matter
    const cls='ag '+x.kind+(key?' key':'')+(past?' past':'')+(cur?' cur':'');
    const inner='<span class="ag-t"><b>'+mstr(x.start)+'</b>'+(compact?'':'<small>'+mstr(x.end)+'</small>')+'</span><span class="ag-x">'+esc(compact?x.short:x.title)+'</span>';
    h+=x.kind==='todo'?'<button class="'+cls+'" data-a="goTodos">'+inner+'</button>':x.kind!=='routine'?'<button class="'+cls+'" data-a="evedit" data-id="'+esc(x.id)+'" data-src="'+x.kind+'">'+inner+'</button>':'<div class="'+cls+'">'+inner+'</div>';
    prevEnd=prevEnd==null?x.end:Math.max(prevEnd,x.end);
  });
  if(!nowDone&&nm>=0)h+=nowLine;
  return h;
}
/* (old time-grid day view, no longer used) */
function timelineHtml(s){
  const items=dayItems(s);
  const allday=items.filter(x=>x.start==null);
  const timed=items.filter(x=>x.start!=null).sort((a,b)=>a.start-b.start||b.end-a.end);
  let h='';
  if(allday.length)h+='<div class="adr">'+allday.map(x=>x.kind==='routine'?'<span class="achip routine">'+esc(x.title)+'</span>':'<button class="achip '+x.kind+'" data-a="evedit" data-id="'+esc(x.id)+'" data-src="'+x.kind+'">'+esc(x.title)+'</button>').join('')+'</div>';
  if(!timed.length)return h+(allday.length?'':'<p class="muted">Nothing scheduled.</p>');
  const H0=Math.floor(Math.min.apply(null,timed.map(x=>x.start))/60);
  const H1=Math.max(H0+6,Math.ceil(Math.max.apply(null,timed.map(x=>x.end))/60));
  // side by side only where blocks really overlap; short blocks count as 40 min (their minimum height)
  const HP=38,VMIN=40;let cl=[],lanes=[],cEnd=-1;
  const flush=()=>{cl.forEach(x=>{x.nl=lanes.length;});cl=[];lanes=[];};
  timed.forEach(x=>{
    const ve=Math.max(x.end,x.start+VMIN);
    if(x.start>=cEnd)flush();
    let i=0;while(lanes[i]!=null&&lanes[i]>x.start)i++;lanes[i]=ve;x.lane=i;cl.push(x);cEnd=Math.max(cEnd,ve);
  });
  flush();
  let g='';
  for(let hr=H0;hr<=H1;hr++)g+='<div class="hl" style="top:'+((hr-H0)*HP)+'px"><span>'+pad(hr%24)+'</span></div>';
  timed.forEach(x=>{
    const top=(x.start-H0*60)/60*HP,hh=Math.max(24,(x.end-x.start)/60*HP-2);
    g+='<div class="blk '+x.kind+'"'+(x.kind!=='routine'?' data-a="evedit" data-id="'+esc(x.id)+'" data-src="'+x.kind+'"':'')+' style="top:'+top.toFixed(0)+'px;height:'+hh.toFixed(0)+'px;left:calc(40px + (100% - 44px) * '+(x.lane/x.nl)+');width:calc((100% - 44px) / '+x.nl+' - 3px)"><b>'+mstr(x.start)+'</b> '+esc(x.title)+'</div>';
  });
  if(s===T()){const n=new Date(),mm=n.getHours()*60+n.getMinutes();if(mm>=H0*60&&mm<=H1*60)g+='<div class="nowl" style="top:'+((mm-H0*60)/60*HP).toFixed(0)+'px"></div>';}
  return h+'<div class="dtl" style="height:'+((H1-H0)*HP)+'px">'+g+'</div>';
}
const isPhone=()=>window.innerWidth<900;
/* the selected day of the shown week (today if it is in that week, else Monday) */
function calDay(){const m=ui.cw,e=add(m,6),t=T();return(ui.cday&&ui.cday>=m&&ui.cday<=e)?ui.cday:(t>=m&&t<=e?t:m);}
function vCal(){
  const m=ui.cw,days=weekDays(m),t=T(),all=days.map(s=>dayItems(s));
  let h='';
  // phone: one day at a time (pick a day above, or swipe); desktop: the whole week as a grid
  const cd=calDay();
  h+='<section class="card dayonly"><div class="dchips">'+days.map(s=>'<button class="dchip'+(s===cd?' on':'')+(s===t?' td':'')+'" data-a="cday" data-date="'+s+'"><small>'+DAY[dow(s)]+'</small><b>'+pd(s).getDate()+'</b></button>').join('')+'</div>'+
   '<div class="dhd"><div><div class="ttl">'+fmtD(cd)+'</div><div class="muted sm">'+esc(planFor(cd).t)+'</div></div><button class="ib t" data-a="gotoDay" data-date="'+cd+'">Open day</button></div><div class="agl">'+dayListHtml(cd)+'</div></section>';
  h+='<section class="card wkonly wkl">'+days.map(s=>'<div class="wkc'+(s===t?' td':'')+'"><button class="wh'+(s===t?' td':'')+'" data-a="gotoDay" data-date="'+s+'"><b>'+DAY[dow(s)]+' '+pd(s).getDate()+'</b><small>'+esc(planShort(planFor(s)))+'</small></button><div class="agl">'+dayListHtml(s,true)+'</div></div>').join('')+'</section>';
  h+='<p class="muted sm" style="margin:0 4px 12px">Grey: routine. Blue: fixed dates. Purple: your own. Tap one of yours to edit it. <span class="wkonly">Tap a day name to open that day. </span><span class="dayonly">Swipe left or right for the next day. </span>Long-term dates belong in your calendar app.</p>';
  h+='<section class="card"><div class="lab">Add appointment</div>'+quickAdd()+'</section>';
  return h;
}
function renderModal(){
  const r=$('#modalroot'),m=ui.modal;
  if(!m){r.innerHTML='';return;}
  r.innerHTML='<div class="mback" data-a="mclose" data-self="1"><div class="modal"><h2>'+(m.src==='new'?'New appointment':'Edit appointment')+'</h2>'+
   '<label class="mlab">Title<input class="in" id="m-t" value="'+esc(m.title)+'" placeholder="e.g. Dentist"></label>'+
   '<div class="fgrid" style="margin-top:8px"><label>Date<input class="in" type="date" id="m-d" value="'+esc(m.date)+'"></label><label>Until (optional)<input class="in" type="date" id="m-u" value="'+esc(m.until)+'"></label><label>Start<input class="in" type="time" id="m-s" value="'+esc(m.start)+'"></label><label>End<input class="in" type="time" id="m-e" value="'+esc(m.end)+'"></label></div>'+
   '<p class="muted sm">No start time means all-day.'+(m.src==='fixed'?' This is a fixed date: saving makes your own copy, deleting hides it.':'')+'</p>'+
   '<div class="btns"><button class="btn" data-a="msave">Save</button><button class="btn ghost" data-a="mclose">Cancel</button>'+(m.src==='new'?'':'<button class="btn warn" data-a="mdel">Delete</button>')+'</div></div></div>';
}

/* ================= CLAUDE (More → Claude) =================
   A bridge to your Claude project: "Copy for Claude" gives the chat your real plan and recent data;
   when Claude changes something it ends its answer with a ```lifedash block, which "Import" previews and applies. */
const CLAUDE_INSTR=`Du hilfst Silas bei Training, Ernährung, Lernen (Python, Uni) und Alltag. Er nutzt eine eigene App, das "Life dashboard" (iPhone + PC). Sprich Deutsch mit ihm.

DATEN AUS DER APP
Wenn er einen Text einfügt, der mit "LIFE DASHBOARD EXPORT" beginnt, ist das sein aktueller Stand: Plan, Übungen mit IDs, letzte Trainings, Tests, Gewicht, Schlaf, Ziele, To-dos. Nimm diesen Stand als Wahrheit, auch wenn frühere Chats etwas anderes sagen.

ÄNDERUNGEN ZURÜCK IN DIE APP
Immer wenn du etwas änderst, das in die App gehört (Trainingsplan, Übungen, Wochenrhythmus, Ernährungstipps, Lernplan, To-dos, Termine, Ziele), beende deine Antwort mit genau EINEM Codeblock mit der Sprache lifedash. Er enthält gültiges JSON und NUR die Teile, die sich ändern. Silas kopiert ihn in die App (More → Claude → Import), sieht eine Vorschau und bestätigt.

Format (alle Felder optional ausser "lifedash"):
\`\`\`lifedash
{
  "lifedash": 1,
  "summary": "Kurz, was sich ändert (1 Satz)",
  "note": "Plan-Notiz, z. B. Phase und Fokus der nächsten Wochen",
  "sessions": {
    "A": {"t": "Strength A · squat + push", "d": "Beschreibung für den Tag", "k": "s"},
    "MOB": {"t": "Mobility + core", "d": "30 min ...", "k": "r", "fuel": "optional: Ernährungstipp"}
  },
  "exercises": {
    "A": [
      {"id": "sq", "n": "Back squat", "s": 4, "r": [5, 8], "rest": "2–3 min", "low": true, "wu": "bar"},
      {"id": "hlr", "n": "Hanging leg raise", "s": 3, "r": [10, 15], "rest": "60 s", "bw": true}
    ]
  },
  "week": ["A", "FB", "B", "FB", "C", "RIDE", "RUN_E"],
  "weekAfterFootball": ["A", "RUN_I", "B", "ZW_SS", "C", "RIDE", "RUN_E"],
  "phases": [{"from": "2026-12-07", "week": ["A", "RUN_I", "B", "ZW_SS", "C", "RIDE", "RUN_E"]}],
  "days": {"2026-11-21": "RUN_E"},
  "fuel": {"RIDE": "Pro Stunde 500 ml + 30 g Kohlenhydrate"},
  "todos": [{"t": "🛒 Kreatin bestellen", "due": "2026-11-20"}],
  "events": [{"title": "Physio", "date": "2026-11-18", "start": "17:30", "end": "18:15"}],
  "goals": [{"id": "g4", "t": "Squat 100 kg x 5", "k": "bench", "b": "sq5", "target": 100, "by": "2027-03-31"}]
}
\`\`\`

Regeln für den Block:
- "sessions": Einheiten-Vorlagen. Schlüssel = kurzer Code (A, B, C, FB, MATCH, RIDE, RUN_E, RUN_I, ZW_SS, REST oder neue wie MOB, D). "k": "s" = Kraft (hat Übungen unter "exercises" mit demselben Schlüssel), "c" = Ausdauer/Sport, "r" = Ruhe. "t" Titel, "d" Beschreibung. Nur geänderte oder neue Einheiten schicken.
- "exercises": pro Kraft-Einheit die KOMPLETTE neue Übungsliste in Reihenfolge. Bestehende Übungen behalten ihre "id" (die App speichert den Verlauf pro id, z. B. sq, bp, cr, bss, lr, hlr, pu, idb, cab, sp, fp, cp, rdl, lp, dip, lat, calf, pal). Neue Übungen bekommen eine neue kurze id. "s" Sätze, "r" [min, max] Wiederholungen (bei "sec": true Sekunden), "rest" Pause als Text, "low": true = Beinübung (Steigerung in 5-kg-Schritten), "bw": true = Körpergewicht + Zusatzgewicht, "wu": "bar" oder "db" = Aufwärmsätze anzeigen.
- "week": Wochenrhythmus Montag bis Sonntag (7 Codes) solange Fussballtraining läuft, "weekAfterFootball" danach. "phases": ab einem Datum gilt ein anderer Rhythmus. "days": einzelne Tage auf eine Einheit setzen.
- "todos": neue To-dos. "due" Datum (YYYY-MM-DD) oder weglassen; "time": "HH:MM" bei festen Terminen. "events": Termine im Kalender.
- "goals": Ziele (gleiche "id" = ersetzen). "k": "bench" (mit "b" = Test-id wie k5, sq5, bp5, pullups, ftp, vo2, rhr), "weight", "learn" oder "manual".
- Texte im Block (Titel, Beschreibungen) auf Englisch, weil die App englisch ist. To-dos dürfen Deutsch sein.
- Daten immer als YYYY-MM-DD. Keine Kommentare im JSON.
- Wenn nichts für die App ändert: keinen Block.`;
function claudeExport(){
  const t=T(),L=[];
  L.push('LIFE DASHBOARD EXPORT · '+fmtD(t)+' '+pd(t).getFullYear());
  L.push('Plan started '+fmtS(START)+' · day '+(diff(START,t)+1)+' · tracking since '+fmtS(TRACK));
  const c=state.custom||{};
  if(c.note)L.push('Plan note: '+c.note);
  if(c.updated)L.push('Last plan change from Claude: '+fmtS(c.updated)+(c.summary?' – '+c.summary:''));
  L.push('');
  L.push('## Next 14 days');
  for(let i=0;i<14;i++){const s=add(t,i),p=planFor(s),o=(state.days[s]||{}).plan;L.push(DAY[dow(s)]+' '+s+': '+(/^T\d/.test(p.id||'')?'TEST':(p.id||''))+' – '+p.t+(o?' (set for this day)':''));}
  L.push('Weekly rhythm now (Mon–Sun): '+weekFor(t).join(', ')+(t<state.settings.footballEnd?' · football training until '+state.settings.footballEnd:''));
  L.push('');
  L.push('## Session templates');
  Object.keys(PT).filter(k=>['PREP','TRIP'].indexOf(k)<0).forEach(k=>{const p=PT[k];L.push(k+' ['+({s:'strength',c:'cardio/sport',r:'rest'}[p.k]||p.k)+']: '+p.t+' – '+p.d+(fuelFor(p)?' | Fuel: '+fuelFor(p):''));});
  L.push('');
  L.push('## Strength exercises (id · name · sets × reps · rest · last time · hint)');
  Object.keys(EX).forEach(k=>{
    const last=lastSession(k,add(t,1));
    L.push(k+' · '+(TNAME[k]||'')+(last?' (last done '+last.date+')':' (not done yet)'));
    EX[k].forEach(ex=>{
      const lt=last?setsTxt(ex,last.sets[ex.id]):'',h=last?hintFor(ex,last):null;
      L.push('  - '+ex.id+' · '+ex.n+' · '+ex.s+'×'+ex.r[0]+'–'+ex.r[1]+(ex.sec?' s':'')+' · '+(ex.rest||'')+(ex.low?' · legs':'')+(ex.bw?' · bodyweight+':'')+(lt?' · last: '+lt:'')+(h?' · '+h.text:''));
    });
  });
  L.push('');
  L.push('## Tests (latest)');
  BM.forEach(b=>{const e=(state.bench[b.id]||[]).slice(-1)[0];if(e)L.push(b.n+': '+(b.time?fmtT(e.v):e.v)+(b.u&&!b.time?' '+b.u:'')+' ('+e.date+')');});
  L.push('');
  L.push('## This week so far');
  L.push(buildCheckin(monday(t)));
  if(monday(t)>TRACK){L.push('');L.push('## Last week');L.push(buildCheckin(add(monday(t),-7)));}
  L.push('');
  L.push('## Goals');
  state.goals.forEach(g=>{const i=goalInfo(g);L.push('- '+g.t+' · now '+goalFmt(g,i.cur)+' · target '+goalFmt(g,g.target)+(g.by?' by '+g.by:'')+(i.reached?' · reached':''));});
  const open=state.todos.filter(x=>!x.done).sort(todoSort);
  L.push('');
  L.push('## Open to-dos ('+open.length+')');
  open.slice(0,15).forEach(x=>L.push('- '+x.t+(x.due?' · '+(x.on?'on ':'by ')+x.due+(x.time?' '+x.time:''):'')));
  L.push('');
  L.push('To change the plan, end your answer with a ```lifedash block (see the project instructions).');
  return L.join('\n');
}
/* ---------- import ---------- */
function clParse(text){
  const src=String(text||'');
  let raw=null;
  const m=src.match(/```\s*lifedash\s*([\s\S]*?)```/i)||src.match(/```\s*json\s*([\s\S]*?"lifedash"[\s\S]*?)```/i);
  if(m)raw=m[1];
  else{const a=src.indexOf('{'),b=src.lastIndexOf('}');if(a>=0&&b>a)raw=src.slice(a,b+1);}
  if(!raw)return {err:'No lifedash block found. Copy Claude’s whole answer or just the block.'};
  let o;try{o=JSON.parse(raw);}catch(e){return {err:'The block is not valid JSON ('+e.message+'). Ask Claude to send it again.'};}
  if(!o||typeof o!=='object'||!o.lifedash)return {err:'This is JSON, but not a lifedash block.'};
  const out={summary:String(o.summary||''),warn:[]},isDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||''));
  const slug=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'').slice(0,8)||'ex'+Math.random().toString(36).slice(2,6);
  if(o.note!=null)out.note=String(o.note);
  if(o.sessions&&typeof o.sessions==='object'){
    out.sessions={};
    Object.keys(o.sessions).forEach(k=>{const v=o.sessions[k]||{},key=String(k).toUpperCase().replace(/[^A-Z0-9_]/g,'');if(!key||!v.t){out.warn.push('Session '+k+' skipped (no title)');return;}
      out.sessions[key]={t:String(v.t),d:String(v.d||''),k:['s','c','r'].indexOf(v.k)>=0?v.k:'c'};if(v.fuel)out.sessions[key].fuel=String(v.fuel);});
  }
  if(o.exercises&&typeof o.exercises==='object'){
    out.exercises={};
    Object.keys(o.exercises).forEach(k=>{
      const key=String(k).toUpperCase().replace(/[^A-Z0-9_]/g,''),L=o.exercises[k];
      if(!Array.isArray(L)||!L.length){out.warn.push('Exercises for '+k+' skipped (empty)');return;}
      out.exercises[key]=L.map(e=>{
        let r=Array.isArray(e.r)?e.r.map(Number):[Number(e.r)||8,Number(e.r)||8];if(r.length<2)r=[r[0],r[0]];
        const x={id:String(e.id||slug(e.n)),n:String(e.n||e.id||'Exercise'),s:Math.max(1,Math.min(10,parseInt(e.s,10)||3)),r:[r[0]||1,r[1]||r[0]||1],rest:String(e.rest||'90 s')};
        if(e.low)x.low=1;if(e.bw)x.bw=1;if(e.sec)x.sec=1;if(e.wu==='bar'||e.wu==='db')x.wu=e.wu;
        return x;
      });
    });
  }
  const knownKey=k=>!!(PT[k]||(out.sessions&&out.sessions[k]));
  const wk=(a,name)=>{if(!Array.isArray(a))return undefined;const w=a.map(x=>String(x).toUpperCase());if(w.length!==7||!w.every(knownKey)){out.warn.push(name+' skipped (needs 7 known session codes)');return undefined;}return w;};
  if(o.week)out.week=wk(o.week,'week');
  if(o.weekAfterFootball)out.weekAfterFootball=wk(o.weekAfterFootball,'weekAfterFootball');
  if(Array.isArray(o.phases)){out.phases=o.phases.map(p=>({from:p.from,week:wk(p.week,'phase week'),weekAfterFootball:p.weekAfterFootball?wk(p.weekAfterFootball,'phase weekAfterFootball'):undefined})).filter(p=>isDate(p.from)&&p.week);}
  if(o.days&&typeof o.days==='object'){out.days={};Object.keys(o.days).forEach(d=>{const k=String(o.days[d]).toUpperCase();if(isDate(d)&&knownKey(k))out.days[d]=k;else out.warn.push('Day '+d+' skipped');});}
  if(o.fuel&&typeof o.fuel==='object'){out.fuel={};Object.keys(o.fuel).forEach(k=>{out.fuel[String(k).toUpperCase()]=String(o.fuel[k]);});}
  if(Array.isArray(o.learn)&&o.learn.length)out.learn=o.learn.filter(w=>w&&isDate(w.s)).map((w,i)=>({n:w.n||i+1,s:w.s,days:Array.isArray(w.days)?w.days.map(Number):[],topic:String(w.topic||''),proj:w.proj?String(w.proj):null}));
  if(Array.isArray(o.todos))out.todos=o.todos.filter(x=>x&&x.t).map(x=>({t:String(x.t),due:isDate(x.due)?x.due:null,time:/^\d{1,2}:\d{2}$/.test(x.time||'')?x.time:null,on:!!x.on}));
  if(Array.isArray(o.events))out.events=o.events.filter(e=>e&&e.title&&isDate(e.date)).map(e=>({title:String(e.title),date:e.date,until:isDate(e.until)?e.until:'',start:/^\d{1,2}:\d{2}$/.test(e.start||'')?e.start:'',end:/^\d{1,2}:\d{2}$/.test(e.end||'')?e.end:''}));
  if(Array.isArray(o.goals))out.goals=o.goals.filter(g=>g&&g.t).map(g=>({id:String(g.id||('g'+Date.now().toString(36))),t:String(g.t),k:['bench','weight','learn','manual'].indexOf(g.k)>=0?g.k:'manual',b:g.b?String(g.b):undefined,target:g.target!=null?Number(g.target):undefined,by:isDate(g.by)?g.by:undefined}));
  return out;
}
/* what would change, as readable lines */
function clDiff(x){
  const L=[],exTxt=e=>e.n+' '+e.s+'×'+e.r[0]+'–'+e.r[1]+(e.sec?' s':'');
  if(x.note!=null)L.push('Plan note: “'+x.note+'”');
  Object.keys(x.sessions||{}).forEach(k=>{const o=PT[k],n=x.sessions[k];L.push((o?'Session '+k+' changed: ':'New session '+k+': ')+n.t+(o&&o.d!==n.d?' – '+n.d:''));});
  Object.keys(x.exercises||{}).forEach(k=>{
    const old=EX[k]||[],nw=x.exercises[k],oi={};old.forEach(e=>oi[e.id]=e);const ni={};nw.forEach(e=>ni[e.id]=e);
    const ch=[];
    nw.forEach(e=>{const o=oi[e.id];if(!o)ch.push('+ '+exTxt(e));else if(exTxt(o)!==exTxt(e)||o.rest!==e.rest)ch.push(exTxt(o)+' → '+exTxt(e)+(o.rest!==e.rest?' ('+e.rest+')':''));});
    old.forEach(e=>{if(!ni[e.id])ch.push('− '+e.n);});
    if(!ch.length&&old.map(e=>e.id).join()!==nw.map(e=>e.id).join())ch.push('new order');
    L.push((old.length?'Strength '+k+': ':'New strength '+k+': ')+(ch.length?ch.join(' · '):'no change'));
  });
  const wkLine=(name,nw,old)=>{const d=[];nw.forEach((k,i)=>{if(k!==old[i])d.push(DAY[i]+' '+old[i]+' → '+k);});L.push(name+': '+(d.length?d.join(', '):'no change'));};
  if(x.week)wkLine('Week (football season)',x.week,(state.custom&&state.custom.week)||WEEK_FB);
  if(x.weekAfterFootball)wkLine('Week (after football)',x.weekAfterFootball,(state.custom&&state.custom.weekAfterFootball)||WEEK_NOFB);
  (x.phases||[]).forEach(p=>L.push('From '+fmtS(p.from)+': '+p.week.join(', ')));
  Object.keys(x.days||{}).forEach(d=>L.push(fmtD(d)+': '+(planFor(d).id||'')+' → '+x.days[d]));
  Object.keys(x.fuel||{}).forEach(k=>L.push('Fuel '+k+': '+x.fuel[k]));
  if(x.learn)L.push('Learning plan replaced: '+x.learn.length+' weeks');
  if(x.todos&&x.todos.length)L.push(x.todos.length+' new to-do'+(x.todos.length>1?'s':'')+': '+x.todos.map(t=>t.t).slice(0,4).join(' · ')+(x.todos.length>4?' …':''));
  if(x.events&&x.events.length)L.push(x.events.length+' appointment'+(x.events.length>1?'s':'')+': '+x.events.map(e=>e.title+' '+fmtS(e.date)).join(' · '));
  (x.goals||[]).forEach(g=>L.push((state.goals.some(o=>o.id===g.id)?'Goal updated: ':'New goal: ')+g.t));
  return L;
}
function clApply(x){
  const c=state.custom=state.custom||{};
  if(x.note!=null)c.note=x.note;
  if(x.sessions)c.sessions=Object.assign({},c.sessions||{},x.sessions);
  if(x.exercises)c.exercises=Object.assign({},c.exercises||{},x.exercises);
  if(x.week)c.week=x.week;
  if(x.weekAfterFootball)c.weekAfterFootball=x.weekAfterFootball;
  if(x.phases&&x.phases.length){const ph=(c.phases||[]).filter(p=>!x.phases.some(q=>q.from===p.from));c.phases=ph.concat(x.phases);}
  Object.keys(x.days||{}).forEach(d=>{state.days[d]=state.days[d]||{};state.days[d].plan=x.days[d];});
  if(x.fuel)c.fuel=Object.assign({},c.fuel||{},x.fuel);
  if(x.learn)c.learn=x.learn;
  const have=new Set(state.todos.filter(t=>!t.done).map(t=>t.t.toLowerCase()));
  (x.todos||[]).forEach((t,i)=>{if(have.has(t.t.toLowerCase()))return;state.todos.push({id:'tdc'+Date.now().toString(36)+i,t:t.t,due:t.due,time:t.time,on:t.on||!!t.time,month:false,done:null});});
  (x.events||[]).forEach((e,i)=>{if(state.events.some(o=>o.title===e.title&&o.date===e.date))return;state.events.push(Object.assign({id:'e'+Date.now()+i},e));});
  (x.goals||[]).forEach(g=>{const i=state.goals.findIndex(o=>o.id===g.id);const ng=Object.assign({created:T()},i>=0?state.goals[i]:{},JSON.parse(JSON.stringify(g)));if(i>=0)state.goals[i]=ng;else state.goals.push(ng);});
  c.updated=T();if(x.summary)c.summary=x.summary;
  c.log=[{date:T(),summary:x.summary||clDiff(x).slice(0,2).join(' · ')}].concat(c.log||[]).slice(0,8);
  applyCustom();
}
function claudeHtml(){
  const c=state.custom||{};
  let h='<section class="card"><div class="lab">Your Claude project</div><p class="muted sm">Work on your plans in the Claude project “silas” and keep the app in step:</p>'
    +'<ol class="cl-steps"><li><b>Copy for Claude</b> and paste it into a chat in the project. Claude then sees your real plan and the last weeks.</li><li>When Claude changes something, its answer ends with a <b>lifedash</b> block.</li><li>Copy the answer (or just the block), paste it below, check the preview, apply.</li></ol>'
    +'<div class="btns"><button class="btn" data-a="clCopy">Copy for Claude</button></div>'
    +(ui.clOut?'<textarea class="in full" readonly style="margin-top:10px">'+esc(ui.clOut)+'</textarea>':'')+'</section>';
  h+='<section class="card"><div class="lab">Import from Claude</div><textarea id="cl-imp" class="in full" placeholder="Paste Claude’s answer or the ```lifedash block here"></textarea><div class="btns"><button class="btn" data-a="clCheck">Check</button>'+(ui.clPrev?'<button class="btn ghost" data-a="clCancel">Cancel</button>':'')+'</div>';
  if(ui.clErr)h+='<p class="sm" style="color:var(--bad);margin-top:10px">'+esc(ui.clErr)+'</p>';
  if(ui.clPrev){
    const d=clDiff(ui.clPrev);
    h+='<div class="cl-prev"><div class="lab" style="margin-top:12px">Preview</div>'+(ui.clPrev.summary?'<p class="sm"><b>'+esc(ui.clPrev.summary)+'</b></p>':'')
      +(d.length?'<ul class="cl-list">'+d.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'<p class="muted sm">Nothing to change.</p>')
      +(ui.clPrev.warn.length?'<p class="sm" style="color:var(--warn)">'+esc(ui.clPrev.warn.join(' · '))+'</p>':'')
      +(d.length?'<div class="btns"><button class="btn" data-a="clApply">Apply changes</button></div>':'')+'</div>';
  }
  h+='</section>';
  h+='<section class="card"><div class="lab">Plan changes</div>';
  if(c.updated){
    h+=(c.note?'<p class="sm"><b>Plan note:</b> '+esc(c.note)+'</p>':'')+'<ul class="cl-list">'+(c.log||[]).map(l=>'<li><b>'+esc(fmtS(l.date))+'</b> · '+esc(l.summary||'')+'</li>').join('')+'</ul>';
    h+='<div class="btns"><button class="btn warn" data-a="clReset">'+(ui.armed==='clReset'?'Tap again: back to the built-in plan':'Back to the built-in plan')+'</button></div><p class="muted sm">To-dos, appointments and goals stay; only sessions, exercises, rhythm, fuel and learning plan go back. Your logged sessions are kept.</p>';
  }else h+='<p class="muted sm">No changes from Claude yet – the app uses the built-in plan.</p>';
  h+='</section>';
  h+='<section class="card"><div class="lab">Set up the project once</div><p class="muted sm">claude.ai → Projects → <b>silas</b> → <b>Instructions</b> (“Set project instructions”) → paste this text → Save. From then on Claude knows the app and answers with lifedash blocks.</p><div class="btns"><button class="btn ghost" data-a="clInstr">Copy project instructions</button></div></section>';
  return h;
}
async function clClip(text,msg){
  try{await navigator.clipboard.writeText(text);ui.clOut=null;toast(msg);}
  catch(e){ui.clOut=text;render();toast('Select the text below and copy it');}
}

/* ================= render + actions ================= */
const VIEWS={today:vToday,cal:vPlan,train:vTrain,prog:vProg,more:vMore};
/* Phone: five slim tabs. Desktop: the sidebar is a table of contents with small chapters in groups. */
const NAV_PHONE=[{id:'today',l:'Today',tab:'today',ic:'today'},{id:'plan',l:'Plan',tab:'cal',ic:'cal'},{id:'train',l:'Train',tab:'train',ic:'train'},{id:'prog',l:'Progress',tab:'prog',ic:'prog'},{id:'set',l:'Settings',tab:'more',mm:'setup',ic:'gear'}];
const NAV_DESK=[
 {g:'Day'},{id:'today',l:'Today',tab:'today',ic:'today'},{id:'sched',l:'Schedule',tab:'cal',pm:'sched',ic:'cal'},{id:'todo',l:'To-dos',tab:'cal',pm:'todo',ic:'todo'},
 {g:'Training'},{id:'train',l:'Train',tab:'train',ic:'train'},{id:'prog',l:'Progress',tab:'prog',ic:'prog'},
 {g:'Reflect'},{id:'track',l:'Tracker',tab:'cal',pm:'track',ic:'week'},{id:'review',l:'Review',tab:'cal',pm:'review',ic:'review'},
 {g:'Life'},{id:'learn',l:'Learn',tab:'more',mm:'learn',ic:'learn'},{id:'money',l:'Money',tab:'more',mm:'money',ic:'money'},{id:'stock',l:'Stock',tab:'more',mm:'stock',ic:'stock'},
 {g:'System'},{id:'claude',l:'Claude',tab:'more',mm:'claude',ic:'claude'},{id:'setup',l:'Settings',tab:'more',mm:'setup',ic:'gear'}
];
const navOn=n=>ui.tab===n.tab&&(!n.pm||ui.pmode===n.pm)&&(!n.mm||ui.mmode===n.mm);
function tabsHtml(){
  const ico=k=>'<span class="ic"><svg viewBox="0 0 20 20" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+ICONS[k]+'</svg></span>';
  if(isPhone())return NAV_PHONE.map(n=>'<button class="tb '+(ui.tab===n.tab?'on':'')+'" data-a="nav" data-id="'+n.id+'" aria-label="'+n.l+'">'+ico(n.ic)+'<span class="tl">'+n.l+'</span></button>').join('');
  return NAV_DESK.map(n=>n.g?'<div class="tg">'+n.g+'</div>':'<button class="tb '+(navOn(n)?'on':'')+'" data-a="nav" data-id="'+n.id+'">'+ico(n.ic)+'<span class="tl">'+n.l+'</span></button>').join('');
}
function render(keep){
  const y=window.scrollY,v=$('#view');
  v.dataset.tab=ui.tab;
  v.innerHTML=(ui.upd?'<section class="card note upd"><b>New version ready</b><div class="btns"><button class="btn" data-a="doUpdate">Reload now</button></div></section>':'')+VIEWS[ui.tab]();
  $('#tabs').innerHTML=tabsHtml();
  sqRestore();
  if(keep!==false)window.scrollTo(0,y);
  updBadge();
}
/* Number of due items on the app icon (Windows, and iPhone once notifications are allowed) and in the tab title */
let dueSig='';
function dueInfo(){const L=dueList(T());return{n:L.items.length+L.attn.length,sig:L.items.map(x=>x.k).concat(L.attn.length,L.yest.length,L.prep,L.next?L.next.start:'').join(',')};}
function updBadge(){
  try{
    const i=dueInfo();dueSig=i.sig;
    document.title=(i.n?'('+i.n+') ':'')+'Life dashboard';
    if(navigator.setAppBadge){(i.n?navigator.setAppBadge(i.n):navigator.clearAppBadge()).catch(()=>{});}
  }catch(e){}
}
/* Theme is chosen per device (not synced): phones default to light, even when iOS is in dark mode. */
const THEME_KEY=KEY+'.theme';
function devTheme(){
  let v=null;try{v=localStorage.getItem(THEME_KEY);}catch(e){}
  if(v==='auto'||v==='light'||v==='dark')return v;
  const phone=/iPhone|iPod|Android.*Mobile/.test(navigator.userAgent)||window.matchMedia('(max-width: 899px)').matches;
  return phone?'light':'auto';
}
function applyTheme(){
  const th=devTheme(),root=document.documentElement;
  if(th==='light'||th==='dark')root.setAttribute('data-theme',th);
  else root.removeAttribute('data-theme');
  // status bar / window colour follows the chosen theme
  const dark=th==='dark'||(th==='auto'&&window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.querySelectorAll('meta[name="theme-color"]').forEach(m=>m.setAttribute('content',dark?'#0d0c1f':'#f4f5fc'));
}
function exportJson(){return JSON.stringify(state,null,2);}
async function doExport(){
  const json=exportJson(),name='life-dashboard-backup-'+T()+'.json';
  const done=()=>{state.settings.lastExport=T();save();toast('Backup saved');render();};
  try{
    const touch=window.matchMedia('(pointer:coarse)').matches;
    if(touch&&navigator.canShare&&typeof File==='function'){
      const f=new File([json],name,{type:'application/json'});
      if(navigator.canShare({files:[f]})){await navigator.share({files:[f],title:name});done();return;}
    }
    const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);
    done();
  }catch(e){
    if(e&&e.name==='AbortError')return;
    ui.bk=json;ui.tab='more';ui.mmode='setup';render();toast('Copy the backup text instead');
  }
}
function importState(txt){
  try{
    const o=JSON.parse(txt);
    if(!o||typeof o!=='object'||!o.days||!o.settings)throw new Error('bad');
    state=o;migrate();save();applyTheme();ui.armed=null;render();toast('Backup restored');
  }catch(e){toast('That is not a valid backup');}
}
async function copyText(id){
  const ta=$('#'+id);if(!ta)return;
  try{await navigator.clipboard.writeText(ta.value);toast('Copied');}
  catch(e){ta.focus();ta.select();try{document.execCommand('copy');toast('Copied');}catch(e2){toast('Select the text and copy it');}}
}
/* Rest timer: starts by itself when you enter the reps of a set, beeps when the rest is over.
   Lives outside #view so re-rendering the page does not stop it. */
const rest={end:0,iv:null,ac:null,hide:null};
function restSec(ex){const m=String(ex.rest||'').match(/(\d+)(?:\s*[–-]\s*(\d+))?\s*(min|s)/);if(!m)return 90;const a=+m[1],b=m[2]?+m[2]:a;return Math.round((a+b)/2*(m[3]==='min'?60:1));}
function restEl(){let e=$('#rest');if(!e){e=document.createElement('div');e.id='rest';e.className='rest';e.setAttribute('role','timer');document.body.appendChild(e);}return e;}
function restStart(sec){
  rest.end=Date.now()+sec*1000;clearTimeout(rest.hide);
  try{const AC=window.AudioContext||window.webkitAudioContext;if(AC){rest.ac=rest.ac||new AC();if(rest.ac.state==='suspended')rest.ac.resume();}}catch(x){}
  const e=restEl();
  e.innerHTML='<span class="rl">Rest</span><b id="restT"></b><button class="ib t" data-a="restAdd" data-d="-15">−15 s</button><button class="ib t" data-a="restAdd" data-d="30">+30 s</button><button class="ib" data-a="restStop" aria-label="Stop the timer">×</button>';
  e.className='rest show';
  clearInterval(rest.iv);rest.iv=setInterval(restTick,250);restTick();
}
function restTick(){
  const left=Math.ceil((rest.end-Date.now())/1000),el=$('#restT');
  if(left>0){if(el)el.textContent=fmtT(left);return;}
  clearInterval(rest.iv);rest.iv=null;
  const e=restEl();e.className='rest show done';
  e.innerHTML='<b>Rest over · next set</b><button class="ib t" data-a="restStop">OK</button>';
  beep();try{if(navigator.vibrate)navigator.vibrate([200,100,200]);}catch(x){}
  rest.hide=setTimeout(()=>ACT.restStop(),8000);
}
function beep(){
  const ac=rest.ac;if(!ac)return;
  try{[0,.32].forEach(o=>{const os=ac.createOscillator(),g=ac.createGain(),t0=ac.currentTime+o;os.frequency.value=880;g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(.35,t0+.02);g.gain.exponentialRampToValueAtTime(.0001,t0+.22);os.connect(g);g.connect(ac.destination);os.start(t0);os.stop(t0+.25);});}catch(x){}
}
const ACT={
 restAdd:t=>{if(!rest.iv)return;rest.end=Math.max(Date.now()+1000,rest.end+(+t.dataset.d)*1000);restTick();},
 restStop:()=>{clearInterval(rest.iv);clearTimeout(rest.hide);rest.iv=null;rest.end=0;restEl().className='rest';},
 useLast:t=>{
   const exId=t.dataset.ex,ex=EXALL[exId],last=lastSession(ui.tmode,ui.date);if(!ex||!last)return;
   const ls=(last.sets[exId]||[]).filter(x=>x&&x.reps!=null);if(!ls.length)return;
   const hn=hintFor(ex,last),up=!!(hn&&hn.up),inc=ex.low?5:2.5,top=Math.max.apply(null,ls.map(x=>x.kg||0));
   const z=ensureSession(ui.date,ui.tmode);z.sets[exId]=z.sets[exId]||[];
   for(let i=0;i<ex.s;i++){const cur=z.sets[exId][i]||{kg:null,reps:null};if(cur.kg==null){const src=ls[Math.min(i,ls.length-1)];cur.kg=up?r1(top+inc):(src.kg!=null?src.kg:null);}z.sets[exId][i]=cur;}
   save();render();toast(up?'Weights filled in · +'+inc+' kg':'Weights from last time filled in');
 },
 tab:t=>{ui.tab=t.dataset.tab;ui.armed=null;render(false);window.scrollTo(0,0);},
 nav:t=>{
   const n=(isPhone()?NAV_PHONE:NAV_DESK).find(x=>x.id===t.dataset.id);if(!n)return;
   ui.tab=n.tab;if(n.pm)ui.pmode=n.pm;if(n.mm)ui.mmode=n.mm;
   if(isPhone()&&n.tab==='cal'&&['sched','todo'].indexOf(ui.pmode)<0)ui.pmode='sched';
   ui.armed=null;render(false);window.scrollTo(0,0);
 },
 gotoTrainDay:t=>{ui.date=t.dataset.date;render();},
 cprev:()=>{ui.cday=add(calDay(),-7);ui.cw=add(ui.cw,-7);render();},
 cnext:()=>{ui.cday=add(calDay(),7);ui.cw=add(ui.cw,7);render();},
 ctoday:()=>{ui.cw=monday(T());ui.cday=T();render();},
 cday:t=>{ui.cday=t.dataset.date;render();},
 cstep:n=>{const d=add(calDay(),n);ui.cday=d;ui.cw=monday(d);render();},
 schedTog:()=>{state.settings.schedOpen=!(state.settings.schedOpen!==false);save();render();},
 wAny:()=>{ui.wAny=ui.date;render();},
 goBody:()=>{ui.tab='prog';ui.gmode='body';render(false);window.scrollTo(0,0);},
 goStr:t=>{ui.tab='prog';ui.gmode='str';ui.bopen=t.dataset.id;render(false);window.scrollTo(0,0);},
 gmode:t=>{ui.gmode=t.dataset.m;ui.armed=null;render(false);window.scrollTo(0,0);},
 cdEdit:()=>{ui.cdEdit=!ui.cdEdit;render();},
 goalAdd:()=>{
   const v=n=>(($('#'+n)||{}).value||'').trim();
   const title=v('ng-t'),kk=v('ng-k'),raw=v('ng-v'),by=v('ng-d');
   if(!title){toast('Name the goal first');return;}
   const g={id:'g'+Date.now(),t:title,created:T(),by:by};
   if(kk.indexOf('bench:')===0){g.k='bench';g.b=kk.slice(6);}else g.k=kk||'manual';
   const tm=g.k==='bench'&&BMD[g.b]&&BMD[g.b].time,target=tm?parseT(raw):pnum(raw);
   if(target==null){toast(tm?'Enter the target as m:ss':'Enter a target number');return;}
   g.target=target;
   if(g.k==='manual'){g.from=pnum(v('ng-f'));g.cur=g.from;}
   state.goals.push(g);save();render();toast('Goal added');
 },
 goalDel:t=>{if(!arm('g'+t.dataset.id))return;state.goals=state.goals.filter(x=>x.id!==t.dataset.id);save();render();},
 sunTog:t=>{const p='days|'+t.dataset.date+'|sun|'+t.dataset.id;setPath(p,!getPath(p));save();render();},
 goLearn:t=>{ui.tab='more';ui.mmode='learn';ui.lopen=+t.dataset.n;render(false);window.scrollTo(0,0);},
 goPlan:()=>{ui.tab='cal';ui.pmode='sched';ui.cw=monday(ui.date);render(false);window.scrollTo(0,0);},
 feelTog:()=>{ui.feel=!ui.feel;render();},
 grpTog:t=>{const g=t.dataset.g,s=ui.date,cur=ui.grp[g]!==undefined?ui.grp[g]:(s!==T());ui.grp[g]=!cur;render();},
 waterAdj:t=>{const p='days|'+ui.date+'|water';setPath(p,Math.max(0,(+getPath(p)||0)+(+t.dataset.d)));save();render();},
 prepTog:t=>{if(t.dataset.id==='top3')return;const p='days|'+ui.date+'|prep|'+t.dataset.id;setPath(p,!getPath(p));save();render();},
 pmode:t=>{ui.pmode=t.dataset.m;render(false);window.scrollTo(0,0);},
 mmode:t=>{ui.mmode=t.dataset.m;render(false);window.scrollTo(0,0);},
 goStock:()=>{ui.tab='more';ui.mmode='stock';render(false);window.scrollTo(0,0);},
 goSetup:()=>{ui.tab='more';ui.mmode='setup';render(false);window.scrollTo(0,0);},
 sopen:t=>{ui.sopen=ui.sopen===t.dataset.id?null:t.dataset.id;render();},
 rmode:t=>{ui.rmode=t.dataset.m;ui.rv='';render();},
 rprev:()=>{const d=pd(ui.rmon);d.setMonth(d.getMonth()-1);ui.rmon=ds(d);ui.rv='';render();},
 rnext:()=>{const d=pd(ui.rmon);d.setMonth(d.getMonth()+1);ui.rmon=ds(d);ui.rv='';render();},
 reditTog:()=>{ui.revEdit=!ui.revEdit;render();},
 radd:()=>{const k=ui.rmode==='w'?'revW':'revM';state.settings[k].push({id:'u'+Date.now(),q:'New question'});save();render();},
 rdel:t=>{const k=ui.rmode==='w'?'revW':'revM';state.settings[k].splice(+t.dataset.i,1);save();render();},
 genReview:()=>{ui.rv=buildReview();render();},
 qaAdd:()=>{
   const v=(($('#qa')||{}).value||'').trim();
   if(!v){toast('Type an appointment first');return;}
   const r=parseQuick(v,calBase());
   state.events.push({id:'e'+Date.now(),date:r.date,until:'',start:r.start!=null?mstr(r.start):'',end:r.end!=null?mstr(r.end):'',title:r.title||'Appointment'});
   save();
   if(ui.tab==='cal'){ui.cw=monday(r.date);ui.cday=r.date;}
   render();toast('Added to '+fmtD(r.date));
 },
 evnew:()=>{ui.modal={src:'new',id:null,title:'',date:calBase(),until:'',start:'',end:''};renderModal();},
 evedit:t=>{
   const id=t.dataset.id,src=t.dataset.src;
   const e=src==='fixed'?fixedEvents().find(x=>x.id===id):state.events.find(x=>x.id===id);
   if(!e)return;
   ui.modal={src:src,id:id,title:e.title,date:e.date,until:e.until||'',start:e.start||'',end:e.end||''};renderModal();
 },
 mclose:()=>{ui.modal=null;renderModal();},
 msave:()=>{
   const v=n=>(($('#'+n)||{}).value||'');
   const title=v('m-t').trim(),date=v('m-d'),until=v('m-u'),start=v('m-s'),end=v('m-e');
   if(!title){toast('Please enter a title');return;}
   if(!date){toast('Please pick a date');return;}
   const ev={id:'e'+Date.now(),title:title,date:date,until:(until&&until>date)?until:'',start:start,end:(start&&end&&tmin(end)>tmin(start))?end:''};
   const m=ui.modal;
   if(m.src==='fixed'){state.hiddenFixed[m.id]=true;state.events.push(ev);}
   else if(m.src==='event'){const i=state.events.findIndex(x=>x.id===m.id);if(i>=0){ev.id=m.id;state.events[i]=ev;}else state.events.push(ev);}
   else state.events.push(ev);
   save();
   if(ui.tab==='cal'){ui.cw=monday(date);ui.cday=date;}
   ui.modal=null;renderModal();render();toast('Saved');
 },
 mdel:()=>{
   const m=ui.modal;if(!m)return;
   if(m.src==='fixed')state.hiddenFixed[m.id]=true;
   else{tombstone(m.id);state.events=state.events.filter(x=>x.id!==m.id);}
   save();ui.modal=null;renderModal();render();toast('Deleted');
 },
 dprev:()=>{ui.date=add(ui.date,-1);render();},
 dnext:()=>{ui.date=add(ui.date,1);render();},
 dtoday:()=>{ui.date=T();render();},
 goTrain:t=>{ui.tab='train';ui.tmode=t.dataset.m;render(false);window.scrollTo(0,0);},
 goWeek:()=>{ui.tab='cal';ui.pmode='track';ui.cw=monday(ui.date);render(false);window.scrollTo(0,0);},
 gotoDay:t=>{ui.date=t.dataset.date;ui.tab='today';render(false);window.scrollTo(0,0);},
 chk:t=>{const s=ui.date,id=t.dataset.id;if(dayChecks(s)[id].auto)return;const p='days|'+s+'|c|'+id;setPath(p,!getPath(p));save();render();},
 wchk:t=>{const s=t.dataset.date,id=t.dataset.id;if(id==='wa'){const pw='days|'+s+'|water';setPath(pw,((+getPath(pw)||0)>=3)?0:3);save();render();return;}if(dayChecks(s)[id].auto)return;const p='days|'+s+'|c|'+id;setPath(p,!getPath(p));save();render();},
 t3:t=>{const p='days|'+ui.date+'|t3d|'+t.dataset.i;setPath(p,!getPath(p));save();render();},
 sqTog:t=>{
   const s=ui.date,id=t.dataset.id,p='days|'+s+'|sqd',a=(getPath(p)||[]).slice(),i=a.indexOf(id),ids=sqPicks(s);let ni=null;
   if(i>=0)a.splice(i,1);
   else{
     a.push(id);
     if(a.filter(x=>ids.indexOf(x)>=0).length===3)toast('All 3 side quests done 🏆');
     else{const k=ids.indexOf(id);for(let j=1;j<3;j++){const c=(k+j)%3;if(a.indexOf(ids[c])<0){ni=c;break;}}}
   }
   setPath(p,a);save();render();
   if(ni!=null)setTimeout(()=>{const c=$('#view .sqc');if(c){sqSet(ni);c.scrollTo({left:ni*c.clientWidth,behavior:'smooth'});}},350);
 },
 sqGo:t=>{
   const c=$('#view .sqc');if(!c)return;
   const i=t.dataset.i!=null?+t.dataset.i:Math.max(0,Math.min(2,(ui.sqi||0)+(+t.dataset.d)));
   sqSet(i);c.scrollTo({left:i*c.clientWidth,behavior:'smooth'});
 },
 sqSwap:t=>{
   const s=ui.date,i=+t.dataset.i,cur=sqPicks(s),y=sqBase(add(s,-1));
   const others=cur.filter((x,j)=>j!==i).map(x=>SQ_BY[x][3]);
   let pool=SQ.filter(q=>sqOk(q,s)&&cur.indexOf(q[0])<0&&y.indexOf(q[0])<0&&others.indexOf(q[3])<0);
   if(!pool.length)pool=SQ.filter(q=>sqOk(q,s)&&cur.indexOf(q[0])<0);
   const q=pool[Math.floor(Math.random()*pool.length)];if(!q)return;
   setPath('days|'+s+'|sqs|'+i,q[0]);save();render();
 },
 tmode:t=>{ui.tmode=t.dataset.m;ui.armed=null;render(false);window.scrollTo(0,0);},
 addCardio:()=>{
   const z={id:'s'+Date.now(),date:ui.date,type:'cardio',kind:$('#cd-k').value,min:pnum($('#cd-m').value),dist:pnum($('#cd-d').value),w:pnum($('#cd-w').value),hr:pnum($('#cd-h').value),feel:pnum($('#cd-f').value),note:$('#cd-n').value.trim()};
   state.sessions.push(z);save();render();toast('Cardio saved');
 },
 delSess:t=>{if(!arm('sess'+t.dataset.id))return;const z=state.sessions.find(x=>x.id===t.dataset.id);if(z&&z.gid)state.gdel[z.gid]=true;tombstone(t.dataset.id);state.sessions=state.sessions.filter(x=>x.id!==t.dataset.id);save();render();},
 yTog:()=>{ui.yo=!ui.yo;render();},
 doneTog:()=>{ui.dn=!ui.dn;render();},
 allcTog:()=>{ui.allc=!ui.allc;render();},
 tdnTog:()=>{ui.tdn=!ui.tdn;render();},
 clCopy:()=>clClip(claudeExport(),'Copied – paste it into your Claude chat'),
 clInstr:()=>clClip(CLAUDE_INSTR,'Instructions copied'),
 clCheck:()=>{const v=($('#cl-imp')||{}).value||'';const r=clParse(v);if(r.err){ui.clErr=r.err;ui.clPrev=null;}else{ui.clErr='';ui.clPrev=r;}render();},
 clCancel:()=>{ui.clPrev=null;ui.clErr='';render();},
 clApply:()=>{if(!ui.clPrev)return;clApply(ui.clPrev);ui.clPrev=null;save();render();toast('Plan updated from Claude');},
 clReset:()=>{if(!arm('clReset'))return;const c=state.custom||{};state.custom={log:[{date:T(),summary:'Back to the built-in plan'}].concat(c.log||[]).slice(0,8)};applyCustom();save();render();toast('Built-in plan restored');},
 tdEdit:t=>{ui.tdEdit=ui.tdEdit===t.dataset.id?null:t.dataset.id;render();},
 tdBulkTog:()=>{ui.tdBulk=!ui.tdBulk;render();if(ui.tdBulk){const el=$('#td-bulk');if(el)el.focus();}},
 todoBulk:()=>{
   const el=$('#td-bulk');if(!el||!el.value.trim()){toast('Paste your list first');return;}
   const have=new Set(todoOpen().map(x=>x.t.toLowerCase()));let n=0,skip=0,nodate=0;
   el.value.split(/\r?\n/).forEach((ln,k)=>{
     const r=parseTodoLine(ln);if(!r||!r.t)return;
     if(have.has(r.t.toLowerCase())){skip++;return;}
     have.add(r.t.toLowerCase());
     state.todos.push({id:'td'+Date.now().toString(36)+k,t:r.t,due:r.due,time:r.time,on:r.on,month:r.month,done:r.done?T():null});
     n++;if(!r.due)nodate++;
   });
   ui.tdBulk=false;save();render();window.scrollTo(0,0);
   toast(n+' to-dos added'+(skip?' · '+skip+' already there':'')+(nodate?' · '+nodate+' without date':''));
 },
 goTodos:()=>{ui.tab='cal';ui.pmode='todo';render(false);window.scrollTo(0,0);},
 goPlanDay:t=>{const d=t.dataset.date;ui.tab='cal';ui.pmode='sched';ui.cw=monday(d);ui.cday=d;render(false);window.scrollTo(0,0);},
 todoAdd:t=>{
   const el=$('#td-new'),v=el?el.value.trim():'';if(!v){if(el)el.focus();return;}
   const base=(t&&t.dataset&&t.dataset.base)||(el&&el.dataset.base)||'';
   // a short weekday at the end ("… Fr") counts as a date for to-dos
   const r=parseQuick(v.replace(/\s(mo|di|mi|do|fr|sa|so)\.?$/i,' $1.'),base||T());
   let due=r.hadDate?r.date:(base||null);
   // "5.11." typed shortly after the 5th means this year's (overdue), not next year's
   if(due&&!/\d{4}/.test(v)){const ly=(+due.slice(0,4)-1)+due.slice(4);if(ly<T()&&ly>=add(T(),-60))due=ly;}
   state.todos.push({id:'td'+Date.now().toString(36),t:r.title||v,due:due,time:r.start!=null?mstr(r.start):null,on:false,month:false,done:null});
   save();render();const n=$('#td-new');if(n)n.focus();
   toast(due&&due!==T()?'Added for '+fmtS(due):'Added');
 },
 todoTog:t=>{const x=state.todos.find(z=>z.id===t.dataset.id);if(!x)return;x.done=x.done?null:T();save();render();},
 todoDel:t=>{const i=state.todos.findIndex(z=>z.id===t.dataset.id);if(i<0)return;const x=state.todos[i];tombstone(x.id);state.todos.splice(i,1);save();render();toast('Deleted “'+x.t+'”');},
 doUpdate:()=>{const f=ui.upd;ui.upd=null;if(f)f();},
 wgf:()=>{const p='weeks|'+ui.wm+'|gf';setPath(p,!getPath(p));save();render();},
 copy:t=>copyText(t.dataset.target),
 bopen:t=>{ui.bopen=ui.bopen===t.dataset.id?null:t.dataset.id;render();},
 addBench:t=>{
   const id=t.dataset.id,b=BMD[id],d=$('#bd-'+id).value||T(),raw=$('#bv-'+id).value;
   const v=b.time?parseT(raw):pnum(raw);
   if(v==null){toast(b.time?'Enter the time as m:ss':'Enter a number');return;}
   const es=state.bench[id]||(state.bench[id]=[]);
   const ex=es.find(x=>x.date===d);if(ex)ex.v=v;else es.push({date:d,v:v});
   es.sort((a,c)=>a.date<c.date?-1:1);save();render();toast('Saved');
 },
 delBench:t=>{const id=t.dataset.id,i=+t.dataset.i;if(!arm('b'+id+i))return;state.bench[id].splice(i,1);save();render();},
 addMeasure:()=>{
   const e={date:T(),waist:pnum($('#mw').value),chest:pnum($('#mc').value),arm:pnum($('#ma').value),thigh:pnum($('#mt').value)};
   if(e.waist==null&&e.chest==null&&e.arm==null&&e.thigh==null){toast('Enter at least one value');return;}
   state.measures=state.measures.filter(x=>x.date!==e.date);state.measures.push(e);state.measures.sort((a,b)=>a.date<b.date?-1:1);save();render();toast('Saved');
 },
 delMeasure:t=>{if(!arm('m'+t.dataset.d))return;state.measures=state.measures.filter(x=>x.date!==t.dataset.d);save();render();},
 lopen:t=>{const n=+t.dataset.n;ui.lopen=ui.lopen===n?0:n;render();},
 lday:t=>{const d=t.dataset.d;state.learn.days[d]=!state.learn.days[d];save();render();},
 lproj:t=>{const n=t.dataset.n;state.learn.projects[n]=!state.learn.projects[n];save();render();},
 moneyShow:()=>{state.money.shown=true;save();render();},
 moneyHide:()=>{state.money.shown=false;save();render();},
 snap:()=>{const tot=state.money.accounts.reduce((a,x)=>a+(+x.bal||0),0);state.money.snaps=state.money.snaps.filter(x=>x.date!==T());state.money.snaps.push({date:T(),total:Math.round(tot*100)/100});save();render();toast('Snapshot saved');},
 delSnap:t=>{if(!arm('sn'+t.dataset.d))return;state.money.snaps=state.money.snaps.filter(x=>x.date!==t.dataset.d);save();render();},
 cdAdd:()=>{state.countdowns.push({label:'New countdown',date:''});save();render();},
 cdDel:t=>{state.countdowns.splice(+t.dataset.i,1);save();render();},
 export:()=>{doExport();},
 showBackup:()=>{ui.bk=ui.bk?'':exportJson();render();},
 importText:()=>{const v=($('#imp')||{}).value||'';if(!v.trim()){toast('Paste the backup text first');return;}importState(v);},
 reset:()=>{if(!arm('reset'))return;state=defaults();save();applyTheme();ui.bk='';render();toast('All data erased');}
};
const CHG={
 planSel:t=>{const s=ui.date;setPath('days|'+s+'|plan',t.value||null);save();render();},
 theme:t=>{try{localStorage.setItem(THEME_KEY,t.value);}catch(e){}applyTheme();},
 workOn:t=>{state.settings.work.on=t.value==='1';save();},
 testin:t=>{
   const id=t.dataset.id,s=t.dataset.date,b=BMD[id],raw=t.value.trim();
   const es=state.bench[id]||(state.bench[id]=[]);
   const i=es.findIndex(x=>x.date===s);
   if(raw===''){if(i>=0)es.splice(i,1);}
   else{const v=b.time?parseT(raw):pnum(raw);if(v==null)return;if(i>=0)es[i].v=v;else es.push({date:s,v:v});es.sort((a,c)=>a.date<c.date?-1:1);}
   queueSave();
 },
 importFile:t=>{
   const f=t.files&&t.files[0];if(!f)return;
   const r=new FileReader();r.onload=()=>importState(String(r.result));r.onerror=()=>toast('Could not read that file');r.readAsText(f);
 }
};
function updMoney(){
  const m=state.money;
  const tot=m.accounts.reduce((a,x)=>a+(+x.bal||0),0);
  const te=$('#mtotal');if(te)te.textContent=chf(tot);
  m.accounts.forEach((a,i)=>{
    if(!a.target)return;
    const pc=Math.min(100,(+a.bal||0)/a.target*100),b=$('#mb'+i),t=$('#mt'+i);
    if(b)b.style.width=pc+'%';
    if(t)t.textContent=chf(+a.bal||0)+' of '+chf(a.target)+' · '+Math.round(pc)+' %';
  });
}
function after(p){
  if(p.indexOf('weights|')===0){const c=$('#wchart');if(c)c.innerHTML=wChartInner();}
  if(p.indexOf('money|accounts')===0)updMoney();
  if(p.indexOf('money|calc')===0)updCalc();
  if(p.indexOf('targets|')===0){const id=p.split('|')[1],el=$('#wu-'+id);if(el&&EXALL[id])el.textContent=warmInner(EXALL[id]);}
  if(p.indexOf('supp|')===0){const a=p.split('|'),i=+a[1];if(a[2]==='stock')state.supp[i].date=T();updSupp(i);}
}
document.addEventListener('click',e=>{
  const t=e.target.closest('[data-a]');
  if(!t||t.disabled)return;
  if(t.hasAttribute('data-self')&&e.target!==t)return;
  const f=ACT[t.dataset.a];if(f)f(t,e);
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.bind){
    const p=t.dataset.bind;let v=t.value;
    if(t.dataset.t==='n')v=pnum(v);
    if(state.gsrc&&state.gsrc[p])delete state.gsrc[p]; // typed by hand: Garmin no longer overwrites it
    if(p.indexOf('weights|')===0&&v==null){delete state.weights[p.split('|')[1]];}
    else setPath(p,v);
    queueSave();after(p);
  }else if(t.classList&&t.classList.contains('sin')){
    const z=ensureSession(ui.date,ui.tmode),ex=t.dataset.ex,i=+t.dataset.i,f=t.dataset.f;
    if(!z.sets[ex])z.sets[ex]=[];
    const cur=z.sets[ex][i]||{kg:null,reps:null};
    cur[f]=pnum(t.value);
    z.sets[ex][i]=cur;queueSave();updPR(ex);
  }else if(t.dataset&&t.dataset.sn){
    ensureSession(ui.date,ui.tmode).note=t.value;queueSave();
  }else if(t.dataset&&t.dataset.chg==='testin'){CHG.testin(t);}
  else if(t.dataset&&t.dataset.qa){updQa(t);}
});
document.addEventListener('change',e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.chg&&CHG[t.dataset.chg])CHG[t.dataset.chg](t);
  // a value typed into "To do now" or the day's plan: redraw once you leave the field, so the item moves to "done"
  if(t.dataset&&t.dataset.bind&&t.closest&&t.closest('.now,.agenda,.todo'))setTimeout(safeRender,0);
  // reps of a set entered: start the rest timer
  if(t.classList&&t.classList.contains('sin')&&t.dataset.f==='reps'&&t.value.trim()&&EXALL[t.dataset.ex])restStart(restSec(EXALL[t.dataset.ex]));
});
document.addEventListener('visibilitychange',()=>{
  if(document.visibilityState==='hidden'){clearTimeout(qt);save();}
  else{const n=T();if(n!==ui.boxToday){if(ui.date===ui.boxToday)ui.date=n;ui.boxToday=n;render();}else if(ui.tab==='today'&&!ui.modal)safeRender();}
});
// While the app stays open: once a minute check whether something new became due (or the day changed).
setInterval(()=>{
  if(document.visibilityState!=='visible')return;
  const n=T();
  if(n!==ui.boxToday){if(ui.date===ui.boxToday)ui.date=n;ui.boxToday=n;if(!ui.modal)safeRender();return;}
  let i;try{i=dueInfo();}catch(e){return;}
  if(i.sig===dueSig)return;
  if(ui.tab==='today'&&ui.date===n&&!ui.modal)safeRender();else updBadge();
},60000);
window.addEventListener('pagehide',()=>{clearTimeout(qt);save();});
document.addEventListener('keydown',e=>{
  if(e.key==='Enter'&&e.target&&e.target.id==='qa'){e.preventDefault();ACT.qaAdd();return;}
  if(e.key==='Enter'&&e.target&&e.target.id==='td-new'){e.preventDefault();ACT.todoAdd(e.target);return;}
  if(e.key==='Enter'&&e.target&&e.target.tagName==='INPUT'&&e.target.closest('.now,.agenda,.todo')){e.target.blur();return;}
  if(e.key==='Escape'&&ui.modal){ACT.mclose();return;}
  // Desktop: arrow keys move between days (Today/Train) or weeks (Plan), like the swipe on the phone
  if((e.key!=='ArrowLeft'&&e.key!=='ArrowRight')||e.altKey||e.ctrlKey||e.metaKey||ui.modal)return;
  const tg=e.target;if(tg&&tg.closest&&tg.closest('input,textarea,select,[contenteditable]'))return;
  const fw=e.key==='ArrowRight';
  if(ui.tab==='today'||ui.tab==='train'){e.preventDefault();ACT[fw?'dnext':'dprev']();}
  else if(ui.tab==='cal'){e.preventDefault();ACT[fw?'cnext':'cprev']();}
});

let tx=null,ty=null;
let wasPhone=isPhone();
window.addEventListener('resize',()=>{if(isPhone()!==wasPhone){wasPhone=isPhone();render();}});
document.addEventListener('touchstart',e=>{const q=e.touches[0];tx=q.clientX;ty=q.clientY;},{passive:true});
document.addEventListener('scroll',e=>{const c=e.target;if(c&&c.classList&&c.classList.contains('sqc'))sqSync(c);},true);
document.addEventListener('touchend',e=>{
  const calSwipe=ui.tab==='cal'&&ui.pmode==='sched'&&isPhone();
  if(tx==null||(ui.tab!=='today'&&!calSwipe)||ui.modal){tx=null;return;}
  const q=e.changedTouches[0],dx=q.clientX-tx,dy=q.clientY-ty;tx=null;
  if(Math.abs(dx)<70||Math.abs(dy)>45)return;
  if(e.target&&e.target.closest&&e.target.closest('input,textarea,select,.wsc,.dchips,.sqc'))return;
  if(calSwipe){ACT.cstep(dx<0?1:-1);return;}
  ACT[dx<0?'dnext':'dprev']();
},{passive:true});
/* ================= bridge for sync.js and garmin.js ================= */
function safeRender(){
  const a=document.activeElement;
  if(a&&a.closest&&a.closest('#view')&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)){
    a.addEventListener('blur',()=>setTimeout(render,0),{once:true});return;
  }
  render();
}
window.LD={
  KEY:KEY,KINDS:KINDS,BMD:BMD,
  get state(){return state;},
  setState(o){state=o;migrate();saveLocal();applyTheme();ui.armed=null;safeRender();},
  save:save,saveLocal:saveLocal,queueSave:queueSave,hooks:hooks,ACT:ACT,ui:ui,
  render:render,safeRender:safeRender,toast:toast,
  esc:esc,T:T,add:add,diff:diff,fmtS:fmtS,fmtD:fmtD,r1:r1,monday:monday,reminderPlan:reminderPlan,
  updateReady(fn){ui.upd=fn;safeRender();}
};
try{if(navigator.storage&&navigator.storage.persist)navigator.storage.persist().catch(()=>{});}catch(e){}
applyTheme();
render(false);
})();
