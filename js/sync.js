/* Cloud sync with Supabase.
   The whole app state is one JSON document per user (table app_state).
   Local storage stays the primary copy, so the app works offline; changes are pushed a few seconds
   after you stop typing and pulled when the app opens or comes back to the foreground.
   If two devices changed things while offline, the newer change wins and the other version is kept
   on this device as an emergency copy (More → Setup → Sync). */
(function(){
'use strict';
const LD=window.LD,C=window.LD_CONFIG||{};
if(!LD)return;
const META=LD.KEY+'.sync',SPARE=LD.KEY+'.conflict';
const configured=!!(C.supabaseUrl&&C.supabaseAnonKey);
let sb=null,user=null,status='off',lastMsg='',pushT=null,busy=false,again=false,authErr='',lastMail='';

const rd=k=>{try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;}};
const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
let meta=Object.assign({remoteAt:null,dirty:false,localAt:null,lastOk:null},rd(META)||{});
const saveMeta=()=>wr(META,meta);

function setStatus(s,msg){status=s;lastMsg=msg||'';const el=document.getElementById('syncstat');if(el)el.innerHTML=statusHtml();}
function ago(iso){
  if(!iso)return 'never';
  const s=Math.round((Date.now()-new Date(iso).getTime())/1000);
  if(s<60)return 'just now';if(s<3600)return Math.round(s/60)+' min ago';if(s<86400)return Math.round(s/3600)+' h ago';
  return LD.fmtS(iso.slice(0,10));
}
function statusHtml(){
  const m={ok:['ok','Synced '+ago(meta.lastOk)],busy:['warn','Syncing…'],offline:['warn','Offline · changes are saved here and sync later'],err:['bad','Sync problem: '+LD.esc(lastMsg)],off:['','Not signed in']}[status]||['',''];
  return '<span class="sdot '+m[0]+'"></span>'+m[1];
}

/* ---------- core ---------- */
async function fetchRemote(){
  const r=await sb.from('app_state').select('state,updated_at').eq('user_id',user.id).maybeSingle();
  if(r.error)throw r.error;
  return r.data;
}
async function pushNow(){
  const r=await sb.from('app_state').upsert({user_id:user.id,state:LD.state}).select('updated_at').single();
  if(r.error)throw r.error;
  meta.remoteAt=r.data.updated_at;meta.dirty=false;meta.lastOk=new Date().toISOString();saveMeta();
}
function keepSpare(obj,why){
  wr(SPARE,{at:new Date().toISOString(),why:why,state:obj});
}
/* Both sides changed since the last sync: merge them instead of throwing one away.
   Objects are merged key by key; lists of items with an id (to-dos, appointments, sessions, goals) are joined by id;
   where both sides have the same value slot, this device wins. Deleted ids (state.tomb) stay deleted. */
const isObj=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function mergeVal(r,l,tomb){
  if(l===undefined)return r;
  if(r===undefined)return l;
  if(Array.isArray(r)&&Array.isArray(l)){
    const idList=a=>a.length>0&&a.every(x=>isObj(x)&&x.id!=null);
    if((idList(r)||!r.length)&&(idList(l)||!l.length)&&(r.length||l.length)){
      const byId=new Map();r.forEach(x=>byId.set(String(x.id),x));
      const out=[];const seen=new Set();
      l.forEach(x=>{const k=String(x.id);seen.add(k);if(tomb[k])return;out.push(byId.has(k)?mergeVal(byId.get(k),x,tomb):x);});
      r.forEach(x=>{const k=String(x.id);if(!seen.has(k)&&!tomb[k])out.push(x);});
      return out;
    }
    return l;
  }
  if(isObj(r)&&isObj(l)){
    const o={};
    // a to-do ticked on either device stays ticked
    new Set(Object.keys(r).concat(Object.keys(l))).forEach(k=>{o[k]=k==='done'&&(r[k]||l[k])?(l[k]||r[k]):mergeVal(r[k],l[k],tomb);});
    return o;
  }
  return l;
}
function mergeState(remote,local){
  const tomb=Object.assign({},(remote&&remote.tomb)||{},(local&&local.tomb)||{});
  const m=mergeVal(remote,local,tomb);
  m.tomb=tomb;
  return m;
}
/* One sync round: pull if the cloud is newer, push if we have local changes. */
async function syncOnce(){
  if(!sb||!user)return;
  if(busy){again=true;return;}
  if(!navigator.onLine){setStatus('offline');return;}
  busy=true;setStatus('busy');
  try{
    const remote=await fetchRemote();
    const tp=s=>s?Date.parse(s):0,clone=o=>JSON.parse(JSON.stringify(o));
    const adopt=r=>{meta.dirty=false;meta.remoteAt=r.updated_at;meta.lastOk=new Date().toISOString();saveMeta();LD.setState(r.state);};
    if(!remote){
      await pushNow(); // first device: this becomes the cloud copy
    }else if(!meta.remoteAt){
      // First sync on this device: the cloud wins. Anything typed here before signing in is kept as a spare copy.
      if(meta.dirty)keepSpare(clone(LD.state),'This device had its own data before you signed in');
      adopt(remote);
    }else if(tp(remote.updated_at)>tp(meta.remoteAt)){
      if(!meta.dirty)adopt(remote);
      else{
        // Both sides changed while apart: merge them, keep this device's pre-merge copy just in case.
        keepSpare(clone(LD.state),'Before merging with your other device');
        LD.setState(mergeState(remote.state,clone(LD.state)));
        await pushNow();
        LD.toast('Changes from your other device merged');
      }
    }else if(meta.dirty){
      await pushNow();
    }else{
      meta.lastOk=new Date().toISOString();saveMeta();
    }
    setStatus('ok');
  }catch(e){
    setStatus(navigator.onLine?'err':'offline',(e&&e.message)||String(e));
  }finally{
    busy=false;
    if(again){again=false;setTimeout(syncOnce,300);}
  }
}
function schedulePush(){
  meta.dirty=true;meta.localAt=new Date().toISOString();saveMeta();
  if(!user)return;
  clearTimeout(pushT);pushT=setTimeout(syncOnce,2500);
}

/* ---------- auth (e-mail + password, once per device; the session then stays) ---------- */
function creds(){
  const m=((document.getElementById('sync-mail')||{}).value||'').trim();
  const p=(document.getElementById('sync-pw')||{}).value||'';
  if(!/^\S+@\S+\.\S+$/.test(m)){LD.toast('Enter your e-mail');return null;}
  lastMail=m;
  if(p.length<8){LD.toast('Password: at least 8 characters');return null;}
  return {email:m,password:p};
}
function authMsg(e){
  const m=(e&&e.message)||String(e);
  if(/invalid login credentials/i.test(m))return 'E-mail or password wrong. First time on any device? Tap “Create account”.';
  if(/email not confirmed/i.test(m))return 'E-mail not confirmed: in Supabase turn off “Confirm email” (README step 2), then try again.';
  if(/already registered|already exists/i.test(m))return 'This e-mail already has an account. Tap “Sign in”.';
  if(/failed to fetch|network|load failed/i.test(m))return 'No connection to Supabase. Check your internet, or the Project URL in js/config.js.';
  if(/signups? not allowed|disabled/i.test(m))return 'New accounts are switched off in Supabase. Tap “Sign in” instead.';
  return m;
}

/* ---------- UI (More → Setup) ---------- */
function html(){
  let h='<section class="card"><div class="lab">Sync between devices</div>';
  if(!configured)return h+'<p class="muted">Not set up yet. Enter your Supabase URL and key in <b>js/config.js</b> (see README) to share your data between iPhone and PC.</p></section>';
  if(!sb)return h+'<p class="muted">The sync library could not load. Check your connection and reopen the app.</p></section>';
  if(user){
    h+='<p class="sm" id="syncstat">'+statusHtml()+'</p><p class="muted sm">Signed in as '+LD.esc(user.email||'')+'</p><div class="btns"><button class="btn" data-a="syncNow">Sync now</button><button class="btn ghost" data-a="syncOut">Sign out</button></div>';
    const sp=rd(SPARE);
    if(sp)h+='<div class="acc" style="margin-top:10px"><b>Spare copy from '+LD.esc(LD.fmtS(sp.at.slice(0,10)))+'</b><p class="muted sm">'+LD.esc(sp.why)+'. Restore it only if something is missing.</p><div class="btns"><button class="btn ghost" data-a="spareUse">Restore spare copy</button><button class="btn ghost" data-a="spareDrop">Delete spare copy</button></div></div>';
    return h+'</section>';
  }
  return h+'<p class="muted">Sign in to keep iPhone and PC in step. You only do this once per device. The very first time, tap <b>Create account</b>; on every other device, <b>Sign in</b>.</p>'
    +'<input class="in" id="sync-mail" type="email" inputmode="email" autocomplete="username" autocapitalize="off" placeholder="E-mail" value="'+LD.esc(lastMail)+'">'
    +'<input class="in" id="sync-pw" type="password" autocomplete="current-password" placeholder="Password (min. 8 characters)" style="margin-top:8px">'
    +(authErr?'<p class="sm" style="color:var(--bad);margin-top:8px">'+LD.esc(authErr)+'</p>':'')
    +'<div class="btns"><button class="btn" data-a="syncIn">Sign in</button><button class="btn ghost" data-a="syncUp">Create account</button></div></section>';
}
async function doAuth(kind){
  const c=creds();if(!c)return;
  authErr='';
  try{
    const r=kind==='up'?await sb.auth.signUp(c):await sb.auth.signInWithPassword(c);
    if(r.error)throw r.error;
    if(kind==='up'&&!r.data.session){authErr='Account created, but Supabase wants an e-mail confirmation. Turn off “Confirm email” (README step 2) or click the link in the e-mail, then tap Sign in.';LD.render();}
  }catch(e){authErr=authMsg(e);LD.render();}
}
Object.assign(LD.ACT,{
  syncIn:()=>doAuth('in'),
  syncUp:()=>doAuth('up'),
  syncNow:()=>{syncOnce().then(()=>{if(window.LDGarmin)return window.LDGarmin.refresh();});},
  syncOut:async()=>{await sb.auth.signOut();},
  spareUse:()=>{const sp=rd(SPARE);if(!sp)return;const cur=JSON.parse(JSON.stringify(LD.state));LD.setState(sp.state);keepSpare(cur,'This was on screen before you restored the spare copy');LD.save();LD.toast('Spare copy restored');},
  spareDrop:()=>{try{localStorage.removeItem(SPARE);}catch(e){}LD.render();}
});

/* ---------- wiring ---------- */
window.LDSync={
  active:()=>!!user&&status!=='err',
  html:html,
  client:()=>sb,
  user:()=>user,
  syncOnce:syncOnce,
  merge:mergeState
};
LD.hooks.save.push(schedulePush);

if(configured&&window.supabase&&window.supabase.createClient){
  sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  sb.auth.onAuthStateChange((ev,session)=>{
    const was=user&&user.id;
    user=session?session.user:null;
    if(!user){setStatus('off');if(was){meta.remoteAt=null;saveMeta();}LD.render();return;}
    authErr='';
    if(was!==user.id){
      if(ev==='SIGNED_IN'&&!was)LD.toast('Signed in');
      // Run outside the auth callback (Supabase recommends not awaiting inside it).
      setTimeout(()=>{syncOnce().then(()=>{if(window.LDGarmin)window.LDGarmin.refresh();LD.render();});},0);
    }
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='visible')syncOnce().then(()=>{if(window.LDGarmin)window.LDGarmin.refresh();});
    else if(meta.dirty&&user){clearTimeout(pushT);syncOnce();}
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Enter'&&e.target&&(e.target.id==='sync-pw'||e.target.id==='sync-mail')){e.preventDefault();doAuth('in');}
  });
  window.addEventListener('online',()=>syncOnce());
  window.addEventListener('offline',()=>setStatus('offline'));
}
LD.render();
})();
