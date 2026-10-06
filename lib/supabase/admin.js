import "server-only";
import { createClient } from "@supabase/supabase-js";
// Service-role client: server code only (order creation, payments webhooks). Bypasses RLS.
export const supabaseAdmin = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
