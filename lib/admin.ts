import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
/** Call at the top of every admin page AND every server action. */
export async function requireAdmin() {
  const sb = await supabaseServer(); const { data: { user } } = await sb.auth.getUser(); if (!user) redirect("/login");
  const { data: p } = await sb.from("profiles").select("role").eq("id", user.id).single(); if (p?.role !== "admin") redirect("/");
  return sb;
}
const IMG_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
/** Uploads an image file (admin only, via RLS) and returns its public URL, or null if missing/invalid. */
export async function uploadImage(sb: Awaited<ReturnType<typeof supabaseServer>>, bucket: string, f: FormDataEntryValue | null): Promise<string | null> {
  if (!(f instanceof File) || f.size === 0 || f.size > 5_000_000 || !IMG_TYPES.includes(f.type)) return null;
  const name = `${crypto.randomUUID()}.${f.type.split("/")[1]}`;
  const { error } = await sb.storage.from(bucket).upload(name, f, { contentType: f.type });
  return error ? null : sb.storage.from(bucket).getPublicUrl(name).data.publicUrl;
}
export const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);
export const cents = (fd: FormData, k: string) => Math.round(Number(str(fd, k) || 0) * 100);
export const uuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
