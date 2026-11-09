/* Push reminders.
   Each device that turns reminders on registers a push subscription (table push_subs).
   Every device keeps the reminder plan (table push_plan) up to date: what becomes due when, worked out
   from the same rules as the "To do now" card. A Supabase Edge Function (supabase/functions/push-reminders)
   runs every 5 minutes and sends what is due. Ticking something off updates the plan, so done things
   are never reminded. */
(function(){
'use strict';
const LD=window.LD,C=window.LD_CONFIG||{};
if(!LD)return;
const LOCAL=LD.KEY+'.push';
let local=(()=>{try{return JSON.parse(localStorage.getItem(LOCAL)||'null')||{};}catch(e){return{};}})();
const saveLocal=()=>{try{localStorage.setItem(LOCAL,JSON.stringify(local));}catch(e){}};
const supported=('serviceWorker' in navigator)&&('PushManager' in window)&&('Notification' in window);
const isIOS=/iPhone|iPad|iPod/.test(navigator.userAgent);
const standalone=!!(navigator.standalone||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches));
let planT=null,lastErr='';

const sync=()=>window.LDSync;
const user=()=>sync()&&sync().user();
const client=()=>sync()&&sync().client();
function b64ToU8(b){const p='='.repeat((4-b.length%4)%4),s=atob((b+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(s,c=>c.charCodeAt(0));}
function device(){const u=navigator.userAgent;return /iPhone/.test(u)?'iPhone':/iPad/.test(u)?'iPad':/Windows/.test(u)?'Windows':/Android/.test(u)?'Android':/Mac/.test(u)?'Mac':'Browser';}
async function getReg(){
  const r=await navigator.serviceWorker.getRegistration();
  if(!r)throw new Error('Offline mode is not active yet. Close and reopen the app once, then try again.');
  return navigator.serviceWorker.ready;
}

/* ---------- plan upload ---------- */
async function uploadPlan(force,extra){
  const sb=client(),u=user();
  if(!sb||!u||!LD.state.settings.pushOn||!navigator.onLine)return;
  const plan=LD.reminderPlan().concat(extra||[]),js=JSON.stringify(plan);
  if(!force&&js===local.lastPlan)return;
  const r=await sb.from('push_plan').upsert({user_id:u.id,items:plan});
  if(r.error){lastErr=r.error.message;return;}
  lastErr='';local.lastPlan=js;saveLocal();
}
const schedule=()=>{clearTimeout(planT);planT=setTimeout(()=>{uploadPlan(false).catch(()=>{});},4000);};

/* ---------- turn on / off ---------- */
async function enable(){
  // must be the first thing in the tap handler: iPhone only asks for permission on a direct tap
  const perm=await Notification.requestPermission();
  if(perm!=='granted')throw new Error(perm==='denied'?'Notifications are blocked for this app in the system settings.':'Notifications were not allowed.');
  const sb=client(),u=user();
  if(!sb||!u)throw new Error('Sign in under “Sync between devices” first.');
  const r=await getReg();
  let sub=await r.pushManager.getSubscription();
  if(!sub)sub=await r.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(C.vapidPublicKey)});
  const j=sub.toJSON();
  const res=await sb.from('push_subs').upsert({endpoint:j.endpoint,user_id:u.id,sub:j,device:device()});
  if(res.error)throw res.error;
  local.endpoint=j.endpoint;saveLocal();
  if(!LD.state.settings.pushOn){LD.state.settings.pushOn=true;LD.save();}
  await uploadPlan(true);
}
async function disable(){
  try{
    const r=await navigator.serviceWorker.getRegistration();
    const sub=r&&await r.pushManager.getSubscription();
    if(sub)await sub.unsubscribe();
  }catch(e){}
  const sb=client();
  if(sb&&local.endpoint)await sb.from('push_subs').delete().eq('endpoint',local.endpoint);
  local.endpoint=null;saveLocal();
}

/* ---------- UI (More → Setup) ---------- */
function nextText(){
  const p=LD.reminderPlan()[0];if(!p)return '';
  const d=new Date(p.at),s=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  return 'Next: '+(s===LD.T()?'today':LD.fmtD(s))+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0')+' · '+p.title;
}
function html(){
  let h='<section class="card"><div class="lab">Reminders</div>';
  const msg=t=>h+'<p class="muted">'+t+'</p></section>';
  if(!C.vapidPublicKey)return msg('Not set up yet. Follow README step 8 to get reminders on your phone and PC, even when the app is closed.');
  if(isIOS&&!standalone)return msg('On the iPhone, reminders only work in the app opened from the <b>home-screen icon</b>, not in a Safari tab.');
  if(!supported)return msg('This browser cannot receive notifications. Use Safari on the iPhone (home-screen app) or Edge/Chrome on the PC.');
  if(!user())return msg('Sign in under “Sync between devices” above first; reminders use the same account.');
  if(Notification.permission==='denied')return msg('Notifications are blocked. '+(isIOS?'iPhone Settings → Notifications → Life → Allow Notifications.':'Click the lock icon next to the address (or the app’s ⋯ menu → App settings) and allow notifications.'));
  if(local.endpoint&&Notification.permission==='granted'){
    h+='<p class="sm"><span class="sdot ok"></span>On for this device ('+LD.esc(device())+')</p><p class="muted sm">You get a notice when something becomes due and is not ticked yet, plus one at 21:30 if several checks are still open. '+LD.esc(nextText())+'</p>';
    if(lastErr)h+='<p class="sm" style="color:var(--bad)">'+LD.esc(lastErr)+'</p>';
    return h+'<div class="btns"><button class="btn ghost" data-a="pushTest">Send a test</button><button class="btn ghost" data-a="pushOff">Turn off here</button></div></section>';
  }
  return h+'<p class="muted">Get a notification when something is due and not ticked yet: wake-up, weigh-in, training, water, supplements, lights out. Works when the app is closed. Turn it on separately on each device.</p><div class="btns"><button class="btn" data-a="pushOn">Turn on reminders</button></div></section>';
}
Object.assign(LD.ACT,{
  pushOn:async()=>{
    try{await enable();LD.toast('Reminders on');}catch(e){LD.toast((e&&e.message)||String(e));}
    LD.render();
  },
  pushOff:async()=>{await disable();LD.toast('Reminders off on this device');LD.render();},
  pushTest:async()=>{
    try{
      const r=await getReg();
      await r.showNotification('Notifications work',{body:'A test from the server follows in about 1–6 minutes.',icon:'icons/icon-192.png',tag:'ld-test-local'});
      const t=new Date(Date.now()+60000);
      await uploadPlan(true,[{key:'test|'+t.getTime(),at:t.toISOString(),tag:'ld-test',title:'Test reminder',body:'Server push works. You can close the app now.'}]);
      LD.toast(lastErr?'Plan upload failed: '+lastErr:'Test scheduled');
    }catch(e){LD.toast((e&&e.message)||String(e));}
  }
});

/* ---------- wiring ---------- */
window.LDPush={html:html,uploadPlan:uploadPlan};
LD.hooks.save.push(schedule);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule();});
setInterval(()=>{if(document.visibilityState==='visible')uploadPlan(false).catch(()=>{});},10*60000);
// once the sign-in is restored after start: refresh the plan and check this device's subscription
(function waitForUser(n){
  if(user()){
    uploadPlan(true).catch(()=>{});
    if(local.endpoint&&supported)navigator.serviceWorker.getRegistration().then(r=>r&&r.pushManager.getSubscription()).then(s=>{
      if(s===null){local.endpoint=null;saveLocal();LD.render();} // subscription expired or permission removed
    }).catch(()=>{});
    return;
  }
  if(n<40)setTimeout(()=>waitForUser(n+1),500);
})(0);
LD.render();
})();
