/* Garmin values in the app.
   A GitHub Action (garmin/sync.py) copies your Garmin Connect data into the Supabase table garmin_daily.
   This file reads that table and fills in weight, sleep, resting HR, VO2max and cardio sessions,
   but never overwrites something you typed yourself. */
(function(){
'use strict';
const LD=window.LD;
if(!LD)return;
const CACHE=LD.KEY+'.garmin';
let cache=(()=>{try{return JSON.parse(localStorage.getItem(CACHE)||'null')||{rows:{},at:null};}catch(e){return{rows:{},at:null};}})();
const saveCache=()=>{try{localStorage.setItem(CACHE,JSON.stringify(cache));}catch(e){}};
const num=v=>(v==null||v===''||isNaN(+v))?null:+v;

/* Garmin activity type → the app's cardio kinds. null = not imported (strength is logged in the app). */
function kindFor(a,date){
  const t=String(a.type||'').toLowerCase(),min=num(a.min)||0;
  if(/strength|yoga|pilates|breath|meditation|stretch|mobility/.test(t))return null;
  if(/virtual_ride|indoor_cycling|virtual_cycling/.test(t))return 'Zwift ride';
  if(/cycl|biking|ride/.test(t))return 'Road ride';
  if(/run/.test(t))return 'Run';
  if(/swim/.test(t))return 'Swim';
  if(/soccer|football/.test(t)){const d=new Date(date+'T12:00:00').getDay();return (d===0||d===6)?'Match':'Football training';}
  if(/hik|walk/.test(t))return min>=45?'Walk / hike':null;
  return min>=20?'Other':null;
}

/* Copy Garmin rows into the app state. Returns true when something changed. */
function merge(){
  const st=LD.state,rows=cache.rows,dates=Object.keys(rows).sort();
  if(!dates.length)return false;
  st.gsrc=st.gsrc||{};st.gdel=st.gdel||{};st.bench=st.bench||{};
  let ch=false;
  const setIf=(path,get,set,v)=>{
    if(v==null)return;
    const cur=get();
    if(cur!=null&&!st.gsrc[path])return; // typed by hand
    if(cur!==v){set(v);ch=true;}
    if(!st.gsrc[path]){st.gsrc[path]=true;ch=true;}
  };
  const weeks={};
  dates.forEach(d=>{
    const r=rows[d]||{};
    // weight and sleep
    setIf('weights|'+d,()=>st.weights[d],v=>{st.weights[d]=v;},num(r.weight_kg)!=null?LD.r1(+r.weight_kg):null);
    setIf('days|'+d+'|sleep',()=>(st.days[d]||{}).sleep,v=>{(st.days[d]=st.days[d]||{}).sleep=v;},num(r.sleep_h)!=null?LD.r1(+r.sleep_h):null);
    // VO2max: a new benchmark entry whenever Garmin's value changes
    const vo2=num(r.vo2);
    if(vo2!=null){
      const es=st.bench.vo2=st.bench.vo2||[];
      const same=es.find(e=>e.date===d);
      if(same){if(same.g&&same.v!==vo2){same.v=vo2;ch=true;}}
      else{const prev=es.filter(e=>e.date<d).pop();if(!prev||prev.v!==vo2){es.push({date:d,v:vo2,note:'Garmin',g:1});es.sort((a,b)=>a.date<b.date?-1:1);ch=true;}}
    }
    // resting HR: collected per week, one 7-day average entry per week
    const rhr=num(r.rhr);
    if(rhr!=null){const m=LD.monday(d);(weeks[m]=weeks[m]||[]).push({d:d,v:rhr});}
    // cardio sessions
    (r.activities||[]).forEach(a=>{
      const gid=String(a.id||'');if(!gid||st.gdel[gid])return;
      if(st.sessions.some(z=>z.gid===gid))return;
      const kind=kindFor(a,d);if(!kind)return;
      st.sessions.push({id:'g'+gid,gid:gid,date:d,type:'cardio',kind:kind,min:num(a.min)!=null?Math.round(a.min):null,dist:num(a.km)!=null?LD.r1(+a.km):null,w:num(a.watts)!=null?Math.round(a.watts):null,hr:num(a.hr)!=null?Math.round(a.hr):null,feel:null,note:(a.name||'')+' · Garmin'});
      ch=true;
    });
  });
  Object.keys(weeks).forEach(m=>{
    const es=st.bench.rhr=st.bench.rhr||[],end=LD.add(m,6),inWk=es.filter(e=>e.date>=m&&e.date<=end);
    if(inWk.some(e=>!e.g))return; // you entered one by hand this week
    const list=weeks[m],v=Math.round(list.reduce((a,x)=>a+x.v,0)/list.length),last=list[list.length-1].d;
    const old=inWk[0];
    if(old&&old.v===v&&old.date===last&&inWk.length===1)return;
    st.bench.rhr=es.filter(e=>!(e.date>=m&&e.date<=end));
    st.bench.rhr.push({date:last,v:v,note:'Garmin · '+list.length+'-day average',g:1});
    st.bench.rhr.sort((a,b)=>a.date<b.date?-1:1);
    ch=true;
  });
  if(ch){LD.save();LD.safeRender();}
  return ch;
}

async function refresh(){
  const sync=window.LDSync,sb=sync&&sync.client(),user=sync&&sync.user();
  if(!sb||!user||!navigator.onLine)return;
  try{
    const from=LD.add(LD.T(),-45);
    const r=await sb.from('garmin_daily').select('date,data').eq('user_id',user.id).gte('date',from).order('date');
    if(r.error)throw r.error;
    const rows={};(r.data||[]).forEach(x=>{rows[x.date]=x.data||{};});
    // keep older cached rows (outside the 45-day window) so the history card stays filled
    Object.keys(cache.rows).forEach(d=>{if(d<from)rows[d]=cache.rows[d];});
    cache={rows:rows,at:new Date().toISOString(),err:null};saveCache();
    if(!merge())LD.safeRender();
  }catch(e){cache.err=(e&&e.message)||String(e);saveCache();}
}

function latestDate(){const ds=Object.keys(cache.rows).sort();return ds[ds.length-1]||null;}
function todayHtml(s){
  const r=cache.rows[s],last=latestDate();
  if(!last)return '';
  const t=LD.T();
  let warn='';
  if(s===t&&last<LD.add(t,-1))warn='<p class="sm" style="color:var(--warn);margin-top:8px">Garmin data missing since '+LD.esc(LD.fmtS(LD.add(last,1)))+'. Open the Garmin Connect app to sync your watch; if that does not help, check the GitHub Action.</p>';
  if(!r)return warn?'<section class="card"><div class="lab">Garmin</div>'+warn+'</section>':'';
  const box=(v,l)=>v==null?'':'<div><b>'+LD.esc(v)+'</b><small>'+l+'</small></div>';
  const sl=num(r.sleep_h)!=null?LD.r1(+r.sleep_h)+' h':null;
  const items=[
    box(sl,'sleep'+(num(r.sleep_score)!=null?' · score '+Math.round(r.sleep_score):'')),
    box(num(r.rhr),'resting HR'),
    box(num(r.hrv),'HRV (ms)'+(r.hrv_status?' · '+String(r.hrv_status).toLowerCase():'')),
    box(num(r.bb_high)!=null?(num(r.bb_now)!=null?r.bb_now+' / '+r.bb_high:r.bb_high):null,'body battery'),
    box(num(r.steps)!=null?Math.round(r.steps).toLocaleString('de-CH'):null,'steps'),
    box(num(r.vo2),'VO₂max')
  ].join('');
  if(!items&&!warn)return '';
  return '<section class="card gmc"><div class="lab">Garmin</div><div class="gm">'+items+'</div>'+warn+'</section>';
}
function setupHtml(){
  const sync=window.LDSync;
  if(!sync||!sync.user())return '';
  const last=latestDate();
  return '<section class="card"><div class="lab">Garmin</div><p class="muted">'+(last?'Latest Garmin day: '+LD.esc(LD.fmtD(last))+'.':'No Garmin data yet. Set up the GitHub Action (README, step 4).')+(cache.err?' Last error: '+LD.esc(cache.err):'')+'</p><p class="muted sm">Imported automatically: weight, sleep, resting HR (weekly average), VO₂max and cardio sessions. Values you type yourself always win; a deleted Garmin session stays deleted.</p><div class="btns"><button class="btn ghost" data-a="garminRefresh">Load Garmin data</button></div></section>';
}
LD.ACT.garminRefresh=()=>{refresh().then(()=>{LD.toast(cache.err?'Garmin: '+cache.err:'Garmin data loaded');LD.render();});};

window.LDGarmin={merge:merge,refresh:refresh,hasData:()=>!!latestDate(),todayHtml:todayHtml,setupHtml:setupHtml};
LD.render();
})();
