"use client";
import { useState } from "react";
import { money, discount, FREE_SHIPPING_MIN_BDT, SHIPPING_FEE_BDT } from "@/lib/format";
import { useStore } from "@/lib/store";
import Placeholder from "@/components/ui/Placeholder";
import SmartImage from "@/components/ui/SmartImage";
export default function ProductDetail({ product: p }) {
    const { add, wish, toggleWish, currency } = useStore();
    const [img, setImg] = useState(0);
const [size, setSize] = useState("");
const [color, setColor] = useState(p.colors[0]?.name ?? "");

const galleryImages = p.colorImages?.[color]?.length
  ? p.colorImages[color]
  : p.images;
    const [qty, setQty] = useState(1);
    const [z, setZ] = useState(null);
    const [msg, setMsg] = useState("");
    // p.variants lists only active size+color combinations that actually exist; a pair missing from it is not a real variant, just unavailable.
    const variantFor = (s, c) => p.variants.find((v) => v.size === s && v.color === c);
    const comboExists = (s, c) => !!variantFor(s, c);
    const sizeDisabled = (s) => !!color && !comboExists(s, color);
    const colorDisabled = (c) => !!size && !comboExists(size, c);
    const selected = size && color ? variantFor(size, color) : undefined;
    const canAdd = !!selected && selected.available;
    const pickSize = (s) => { setSize(s); if (color && !comboExists(s, color))
        setColor(""); setMsg(""); };
    const pickColor = (c) => {
  setColor(c);
  setImg(0);

  if (size && !comboExists(size, c)) {
    setSize("");
  }

  setMsg("");
};
    const submit = async () => {
        if (!size || !color)
            return setMsg("Choose a size and color.");
        if (!selected)
            return setMsg("That size and color aren't offered together.");
        if (!selected.available)
            return setMsg("That size and color combination is currently out of stock.");
        const r = await add({ productId: p.id, size, color, qty });
        if (r.status === "ok")
            setMsg("Added to your cart.");
        else if (r.status === "auth")
            setMsg("Sign in or create an account and this item will be added to your cart automatically.");
        else
            setMsg(r.message);
    };
    const chip = (on, disabled) => `min-h-11 min-w-11 border px-3 text-sm ${on ? "border-charcoal bg-charcoal text-warm" : "border-sand"} ${disabled ? "cursor-not-allowed opacity-30" : ""}`;
    return (<div className="grid gap-10 md:grid-cols-2 md:gap-16">
      <div><div className="aspect-[4/5] overflow-hidden" onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZ({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }} onMouseLeave={() => setZ(null)}><div className="relative h-full transition-transform duration-200" style={{ transform: z ? "scale(1.8)" : "none", transformOrigin: z ? `${z.x}% ${z.y}%` : "center" }}><SmartImage key={galleryImages[img] ?? "none"} src={galleryImages[img]} alt={`${p.name} – view ${img + 1}`} priority={img === 0} sizes="(min-width: 768px) 50vw, 100vw" fallback={<Placeholder label={`${p.name} – view ${img + 1}`}/>}/></div></div>
        <div className="mt-3 flex flex-wrap gap-3">{(galleryImages.length ? galleryImages.map((_, k) => k) : [0, 1]).map((i) => <button key={i} onClick={() => setImg(i)} aria-label={`Show image ${i + 1}`} aria-pressed={img === i} className={`relative h-24 w-20 overflow-hidden border ${img === i ? "border-charcoal" : "border-sand"}`}><SmartImage src={galleryImages[i]} alt="" sizes="80px" fallback={<Placeholder label="" tone={i ? "cream" : "sand"}/>}/></button>)}</div></div>
      <div>
        <h1 className="font-display text-4xl md:text-5xl">{p.name}</h1>
        <p className="mt-2 text-sm text-taupe">★ {p.rating.toFixed(1)} ({p.reviewCount} reviews)</p>
        <p className="mt-4 flex gap-3 text-xl">{p.salePrice ? (<><span>{money(p.salePrice, currency)}</span><span className="text-taupe line-through">{money(p.price, currency)}</span><span className="text-umber">−{discount(p.price, p.salePrice)}%</span></>) : money(p.price, currency)}</p>
        <p className="mt-6 text-umber">{p.description}</p>
        <fieldset className="mt-8"><legend className="mb-2 text-xs tracking-[0.18em] uppercase">Size</legend><div className="flex gap-2">{p.sizes.map((s) => { const d = sizeDisabled(s); return <button key={s} disabled={d} aria-pressed={size === s} aria-disabled={d} onClick={() => pickSize(s)} className={chip(size === s, d)}>{s}</button>; })}</div></fieldset>
        <fieldset className="mt-6"><legend className="mb-2 text-xs tracking-[0.18em] uppercase">Color: {color}</legend><div className="flex gap-2">{p.colors.map((c) => { const d = colorDisabled(c.name); return <button key={c.name} disabled={d} aria-label={c.name} aria-pressed={color === c.name} aria-disabled={d} onClick={() => pickColor(c.name)} style={{ background: c.hex }} className={`h-11 w-11 border-2 ${color === c.name ? "border-charcoal" : "border-sand"} ${d ? "cursor-not-allowed opacity-30" : ""}`}/>; })}</div></fieldset>
        <div className="mt-6 flex items-center gap-3"><label htmlFor="qty" className="text-xs tracking-[0.18em] uppercase">Quantity</label><input id="qty" type="number" min={1} max={10} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(10, +e.target.value || 1)))} className="min-h-11 w-20 border border-sand bg-transparent px-3"/></div>
        {p.inStock === false && <p className="mt-6 text-sm text-red-800">Currently out of stock.</p>}<div className="mt-8 flex gap-3"><button onClick={() => { void submit(); }} disabled={!canAdd} className="btn-dark flex-1">Add to cart</button><button onClick={() => toggleWish(p.id)} aria-pressed={wish.includes(p.id)} className="btn-line">{wish.includes(p.id) ? "Saved" : "Save"}</button></div>
        <p role="status" className="mt-3 min-h-5 text-sm text-umber">{msg}</p>
        <div className="mt-8 divide-y divide-sand border-y border-sand text-sm">
          {[["Materials", p.materials], ["Care", p.care], ["Shipping", `Free shipping over ${money(FREE_SHIPPING_MIN_BDT, currency)}. Otherwise ${money(SHIPPING_FEE_BDT, currency)}.`], ["Returns", "Free returns within 30 days on unworn items."]].map(([t, b]) => <details key={t} className="py-4"><summary className="cursor-pointer text-xs tracking-[0.18em] uppercase">{t}</summary><p className="mt-3 text-umber">{b}</p></details>)}
        </div>
      </div>
    </div>);
}
