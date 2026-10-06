import LinkFields from "@/components/admin/LinkFields";
import { cBool, cList, cNum, cStr } from "@/lib/cms-schema";
const input = "min-h-11 w-full border border-sand bg-transparent px-3";
const area = "w-full border border-sand bg-transparent px-3 py-2";
function Checklist({ name, options, selected }) {
    if (!options.length)
        return <p className="text-xs text-taupe">Nothing available yet.</p>;
    return (<div className="max-h-48 space-y-1 overflow-y-auto border border-sand p-3">
      {options.map(([v, l]) => <label key={v} className="flex items-center gap-2 text-sm"><input type="checkbox" name={name} value={v} defaultChecked={selected.includes(v)} className="h-4 w-4"/>{l}</label>)}
    </div>);
}
function Field({ f, c, lookups, uid }) {
    const label = <label htmlFor={`${uid}-${f.key}`} className="mb-1 block text-sm">{f.label}</label>;
    const help = f.help ? <p className="mt-1 text-xs text-taupe">{f.help}</p> : null;
    switch (f.kind) {
        case "text": return <div>{label}<input id={`${uid}-${f.key}`} name={f.key} defaultValue={cStr(c, f.key)} maxLength={f.max} className={input}/>{help}</div>;
        case "textarea": return <div>{label}<textarea id={`${uid}-${f.key}`} name={f.key} defaultValue={cStr(c, f.key)} rows={f.key === "body" ? 4 : 2} maxLength={f.max} className={area}/>{help}</div>;
        case "image": {
            const url = cStr(c, f.key);
            return (<div className="space-y-2">{label}
          {url && <img src={url} alt="" className="h-24 w-24 border border-sand object-cover"/>}
          <input id={`${uid}-${f.key}`} name={f.key} defaultValue={url} placeholder="Image URL (or upload below)" className={input}/>
          <input type="file" name={`${f.key}_file`} accept="image/jpeg,image/png,image/webp" aria-label={`Upload ${f.label}`} className="block text-sm"/>
          <p className="text-xs text-taupe">Upload replaces the URL. Max 5 MB (JPG, PNG or WEBP). Clear the URL to remove the image.</p>
        </div>);
        }
        case "select": return <div>{label}<select id={`${uid}-${f.key}`} name={f.key} defaultValue={cStr(c, f.key, String(f.fallback ?? ""))} className={input}>{(f.options ?? []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>{help}</div>;
        case "number": return <div>{label}<input id={`${uid}-${f.key}`} name={f.key} type="number" min={f.min} max={f.max} defaultValue={cNum(c, f.key, Number(f.fallback ?? f.min ?? 0))} className={input}/>{help}</div>;
        case "checkbox": return <label className="flex items-center gap-2 text-sm"><input type="checkbox" name={f.key} defaultChecked={cBool(c, f.key)} className="h-5 w-5"/>{f.label}</label>;
        case "link": return <LinkFields name={f.key} label={f.label} type={cStr(c, `${f.key}_type`, "route")} target={cStr(c, `${f.key}_target`)} options={lookups}/>;
        case "products": return <div><p className="mb-1 text-sm">{f.label}</p><Checklist name={f.key} options={lookups.products} selected={cList(c, f.key)}/>{help}</div>;
        case "categories": return <div><p className="mb-1 text-sm">{f.label}</p><Checklist name={f.key} options={lookups.categories.filter(([s]) => s !== "clothing" && s !== "footwear")} selected={cList(c, f.key)}/>{help}</div>;
        case "collections": return <div><p className="mb-1 text-sm">{f.label}</p><Checklist name={f.key} options={lookups.collections} selected={cList(c, f.key)}/>{help}</div>;
        case "category": return <div>{label}<select id={`${uid}-${f.key}`} name={f.key} defaultValue={cStr(c, f.key)} className={input}><option value="">— none —</option>{lookups.categories.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>;
        case "collection": return <div>{label}<select id={`${uid}-${f.key}`} name={f.key} defaultValue={cStr(c, f.key)} className={input}><option value="">— none —</option>{lookups.collections.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>;
        default: return null;
    }
}
/** Generates the edit form fields for a section from its schema definition. */
export default function SectionFields({ def, content, lookups, uid }) {
    return <div className="grid gap-4 md:grid-cols-2">{def.fields.map((f) => <div key={f.key} className={f.kind === "textarea" || f.kind === "image" || f.kind === "link" || f.kind === "products" ? "md:col-span-2" : ""}><Field f={f} c={content} lookups={lookups} uid={uid}/></div>)}</div>;
}
