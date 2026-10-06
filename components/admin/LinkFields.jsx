"use client";
import { useState } from "react";
import { LINK_TYPES, isLinkType } from "@/lib/cms-schema";
const box = "min-h-11 w-full border border-sand bg-transparent px-3";
/**
 * Safe link picker: choose a link TYPE (store page, CMS page, category, collection, product, custom URL) and a
 * target from a list, instead of typing URLs by hand. Submits `<name>_type` and `<name>_target`.
 */
export default function LinkFields({ name, type, target, options, label }) {
    const [t, setT] = useState(isLinkType(type) ? type : "route");
    const [v, setV] = useState(target ?? "");
    const list = t === "page" ? options.pages : t === "product" ? options.products : t === "category" ? options.categories : t === "collection" ? options.collections : t === "route" ? options.routes : null;
    const missing = list && v && !list.some(([val]) => val === v);
    return (<fieldset className="space-y-2">
      {label && <legend className="mb-1 text-sm">{label}</legend>}
      <div className="grid gap-2 sm:grid-cols-[170px_1fr]">
        <select name={`${name}_type`} aria-label={`${label ?? "Link"} type`} value={t} onChange={(e) => { const n = e.target.value; if (isLinkType(n)) {
        setT(n);
        setV("");
    } }} className={box}>
          {LINK_TYPES.map(([val, l]) => <option key={val} value={val}>{l}</option>)}
        </select>
        {list ? (<select name={`${name}_target`} aria-label={`${label ?? "Link"} target`} value={v} onChange={(e) => setV(e.target.value)} className={box}>
            <option value="">— choose —</option>
            {missing && <option value={v}>{`(not found: ${v})`}</option>}
            {list.map(([val, l]) => <option key={val} value={val}>{l}</option>)}
          </select>) : (<input name={`${name}_target`} aria-label={`${label ?? "Link"} URL`} value={v} onChange={(e) => setV(e.target.value)} placeholder="/contact or https://…" className={box}/>)}
      </div>
    </fieldset>);
}
