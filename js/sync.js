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
let sb=null,user=null,status='off',lastMsg='',pushT=null,busy=false,again=false,otpEmail='';

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
      else if(tp(remote.updated_at)>tp(meta.localAt)){
        // Both sides changed while apart: the newer edit wins, the other one is kept as a spare copy.
        keepSpare(clone(LD.state),'Your changes on this device were older than the cloud');
        adopt(remote);
        LD.toast('Newer data from your other device loaded');
      }else{
        keepSpare(remote.state,'The cloud version was older than this device');
        await pushNow();
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

/* ---------- auth (e-mail code, works inside the home-screen app) ---------- */
async function sendCode(email){
  const r=await sb.auth.signInWithOtp({email:email,options:{shouldCreateUser:true}});
  if(r.error)throw r.error;
}
async function verifyCode(email,code){
  const r=await sb.auth.verifyOtp({email:email,token:code,type:'email'});
  if(r.error)throw r.error;
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
  if(otpEmail){
    return h+'<p class="muted">We sent a code to <b>'+LD.esc(otpEmail)+'</b>. Type it here (the link in the e-mail also works, but only in the browser, not in the home-screen app).</p><input class="in otp" id="sync-code" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="code"><div class="btns"><button class="btn" data-a="syncVerify">Sign in</button><button class="btn ghost" data-a="syncBack">Other e-mail</button></div></section>';
  }
  return h+'<p class="muted">Sign in with your e-mail to keep iPhone and PC in step. No password: you get a one-time code by e-mail.</p><input class="in" id="sync-mail" type="email" inputmode="email" autocomplete="email" placeholder="you@example.com"><div class="btns"><button class="btn" data-a="syncSend">Send code</button></div></section>';
}
Object.assign(LD.ACT,{
  syncSend:async()=>{
    const v=((document.getElementById('sync-mail')||{}).value||'').trim();
    if(!/^\S+@\S+\.\S+$/.test(v)){LD.toast('Enter your e-mail');return;}
    try{await sendCode(v);otpEmail=v;LD.render();LD.toast('Code sent');}catch(e){LD.toast('Could not send: '+(e.message||e));}
  },
  syncVerify:async()=>{
    const v=((document.getElementById('sync-code')||{}).value||'').replace(/\s/g,'');
    if(!/^\d{6,10}$/.test(v)){LD.toast('Enter the code from the e-mail');return;}
    try{await verifyCode(otpEmail,v);otpEmail='';}catch(e){LD.toast('Code not accepted: '+(e.message||e));}
  },
  syncBack:()=>{otpEmail='';LD.render();},
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
  syncOnce:syncOnce
};
LD.hooks.save.push(schedulePush);

if(configured&&window.supabase&&window.supabase.createClient){
  sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
  sb.auth.onAuthStateChange((ev,session)=>{
    const was=user&&user.id;
    user=session?session.user:null;
    if(!user){setStatus('off');if(was){meta.remoteAt=null;saveMeta();}LD.render();return;}
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
  window.addEventListener('online',()=>syncOnce());
  window.addEventListener('offline',()=>setStatus('offline'));
}
LD.render();
})();
