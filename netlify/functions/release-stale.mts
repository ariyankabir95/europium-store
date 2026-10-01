import type { Config } from "@netlify/functions";
// Releases stock held by unpaid pending orders older than 60 minutes. Needs Supabase env vars set in Netlify.
export default async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Response("not configured", { status: 200 });
  const r = await fetch(`${url}/rest/v1/rpc/release_stale_orders`, { method: "POST", headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_minutes: 60 }) });
  return new Response(await r.text(), { status: r.status });
};
export const config: Config = { schedule: "*/30 * * * *" };
