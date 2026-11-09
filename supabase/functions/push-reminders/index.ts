// Supabase Edge Function "push-reminders".
// Called every 5 minutes by pg_cron (see supabase/push.sql). Sends every reminder from push_plan
// whose time has come (within the last 20 minutes) and that was not sent yet, to all devices of that user.
//
// Secrets (Edge Functions → Secrets): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (e.g. mailto:you@example.com)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:reminders@example.com",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

type Item = { key: string; at: string; tag?: string; title: string; body?: string };
const WINDOW_MS = 20 * 60 * 1000;

Deno.serve(async () => {
  const now = Date.now();
  let sent = 0, failed = 0;

  const { data: plans, error } = await sb.from("push_plan").select("user_id, items");
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  for (const plan of plans ?? []) {
    const due = ((plan.items ?? []) as Item[]).filter((i) => {
      const t = Date.parse(i.at);
      return t <= now && t > now - WINDOW_MS;
    });
    if (!due.length) continue;

    const { data: done } = await sb.from("push_sent").select("key")
      .eq("user_id", plan.user_id).in("key", due.map((i) => i.key));
    const doneKeys = new Set((done ?? []).map((d) => d.key));
    const todo = due.filter((i) => !doneKeys.has(i.key));
    if (!todo.length) continue;

    const { data: subs } = await sb.from("push_subs").select("endpoint, sub").eq("user_id", plan.user_id);
    for (const item of todo) {
      // mark first: if two runs overlap, the second insert fails and that run skips the item
      const mark = await sb.from("push_sent").insert({ user_id: plan.user_id, key: item.key });
      if (mark.error) continue;
      const payload = JSON.stringify({ title: item.title, body: item.body ?? "", tag: item.tag ?? item.key });
      for (const s of subs ?? []) {
        try {
          await webpush.sendNotification(s.sub, payload, { TTL: 60 * 60, urgency: "high" });
          sent++;
        } catch (e) {
          failed++;
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) await sb.from("push_subs").delete().eq("endpoint", s.endpoint); // device unsubscribed
          else console.error("push failed", code, (e as Error).message);
        }
      }
    }
  }

  await sb.from("push_sent").delete().lt("sent_at", new Date(now - 3 * 864e5).toISOString());
  return new Response(JSON.stringify({ sent, failed }), { headers: { "Content-Type": "application/json" } });
});
