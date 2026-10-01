import { revalidatePath } from "next/cache";
import { requireAdmin, str } from "@/lib/admin";
import { DEFAULT_SETTINGS, getSettings } from "@/lib/cms";
const HEX = /^#[0-9a-fA-F]{6}$/;
const safeHex = (v: string, fallback: string) => HEX.test(v) ? v : fallback;
const SANS = ["system", "arial", "helvetica", "asap"] as const;
const SERIF = ["georgia", "times", "system"] as const;
async function save(fd: FormData) {
  "use server";
  const sb = await requireAdmin();
  await sb.from("site_settings").upsert({ key: "general", value: {
    store_name: str(fd, "store_name", 80), contact_email: str(fd, "contact_email", 254), phone: str(fd, "phone", 40), instagram_url: str(fd, "instagram_url", 300),
    bkash_number: str(fd, "bkash_number", 40), bkash_instructions: str(fd, "bkash_instructions", 500),
    warm: safeHex(str(fd, "warm", 20), DEFAULT_SETTINGS.warm), cream: safeHex(str(fd, "cream", 20), DEFAULT_SETTINGS.cream), sand: safeHex(str(fd, "sand", 20), DEFAULT_SETTINGS.sand),
    taupe: safeHex(str(fd, "taupe", 20), DEFAULT_SETTINGS.taupe), umber: safeHex(str(fd, "umber", 20), DEFAULT_SETTINGS.umber), charcoal: safeHex(str(fd, "charcoal", 20), DEFAULT_SETTINGS.charcoal), ink: safeHex(str(fd, "ink", 20), DEFAULT_SETTINGS.ink),
    font_sans: SANS.includes(str(fd, "font_sans") as (typeof SANS)[number]) ? str(fd, "font_sans") : DEFAULT_SETTINGS.font_sans,
font_display: ["georgia", "times", "asap", "bebas"].includes(str(fd, "font_display"))
  ? (str(fd, "font_display") as "georgia" | "times" | "asap" | "bebas")
  : DEFAULT_SETTINGS.font_display,
font_serif: SERIF.includes(str(fd, "font_serif") as (typeof SERIF)[number]) ? str(fd, "font_serif") : DEFAULT_SETTINGS.font_serif,
  } });
  revalidatePath("/"); revalidatePath("/contact"); revalidatePath("/checkout");
}
const input = "min-h-11 w-full border border-sand bg-transparent px-3";
const colors = [["warm", "Background"], ["cream", "Surface"], ["sand", "Border"], ["taupe", "Muted"], ["umber", "Secondary text"], ["charcoal", "Primary"], ["ink", "Primary hover"]] as const;
export default async function Settings() {
  await requireAdmin(); const s = await getSettings();
  return (<><h1 className="mb-6 font-serif text-4xl">Settings</h1><form action={save} className="max-w-2xl space-y-8">
    <section className="space-y-4"><h2 className="text-xs tracking-[0.18em] uppercase">Store</h2>{([['store_name','Store name'],['contact_email','Contact email'],['phone','Phone'],['instagram_url','Instagram URL']] as const).map(([k,l]) => <div key={k}><label htmlFor={k} className="mb-1 block text-sm">{l}</label><input id={k} name={k} defaultValue={s[k]} className={input} /></div>)}</section>
    <section className="space-y-4"><h2 className="text-xs tracking-[0.18em] uppercase">Theme</h2><div className="grid gap-4 sm:grid-cols-2">{colors.map(([k,l]) => <div key={k} className="flex items-center gap-3 border border-sand p-3"><input type="color" id={k} name={k} defaultValue={s[k]} className="h-11 w-14 shrink-0 cursor-pointer bg-transparent" /><div><label htmlFor={k} className="block text-sm">{l}</label><p className="text-xs text-taupe">{s[k]}</p></div></div>)}</div><div className="grid gap-4 sm:grid-cols-3">
  <div>
    <label htmlFor="font_sans" className="mb-1 block text-sm">
      Sans font
    </label>
    <select
      id="font_sans"
      name="font_sans"
      defaultValue={s.font_sans}
      className={input}
    >
      <option value="system">System</option>
      <option value="arial">Arial</option>
      <option value="helvetica">Helvetica</option>
      <option value="asap">ASAP</option>
    </select>
  </div>

  <div>
    <label htmlFor="font_serif" className="mb-1 block text-sm">
      Serif font
    </label>
    <select
      id="font_serif"
      name="font_serif"
      defaultValue={s.font_serif}
      className={input}
    >
      <option value="georgia">Georgia</option>
      <option value="times">Times New Roman</option>
      <option value="system">System</option>
    </select>
  </div>

  <div>
    <label htmlFor="font_display" className="mb-1 block text-sm">
      Display font
    </label>
    <select
      id="font_display"
      name="font_display"
      defaultValue={s.font_display}
      className={input}
    >
      <option value="bebas">Bebas Neue</option>
      <option value="asap">ASAP</option>
      <option value="georgia">Georgia</option>
      <option value="times">Times New Roman</option>
    </select>
  </div>
</div></section>
    <section className="space-y-4"><h2 className="text-xs tracking-[0.18em] uppercase">Manual bKash</h2><div><label htmlFor="bkash_number" className="mb-1 block text-sm">bKash number</label><input id="bkash_number" name="bkash_number" defaultValue={s.bkash_number} placeholder="01XXXXXXXXX" className={input} /></div><div><label htmlFor="bkash_instructions" className="mb-1 block text-sm">Payment instructions</label><textarea id="bkash_instructions" name="bkash_instructions" defaultValue={s.bkash_instructions} rows={4} className="w-full border border-sand bg-transparent px-3 py-2" /></div><p className="text-xs text-taupe">Customers will see this number and instruction on checkout. Orders stay unpaid until you verify the transaction ID in Admin → Orders.</p></section>
    <button className="btn-dark">Save settings</button>
  </form></>);
}
