"use client";
import { useEffect, useId, useRef, useState } from "react";
import SmartImage from "@/components/ui/SmartImage";
import { IMAGE_ACCEPT, validateImageFile } from "@/lib/images";
/**
 * Admin image input with previews.
 *  - Shows the currently saved image (if any) and, after choosing a file, a local preview of the new one.
 *  - Validates type + size in the browser (the server validates again) and clears an invalid choice.
 *  - Leaving the file empty KEEPS the saved image; `removeName` adds an explicit "remove" checkbox.
 *  - Blob preview URLs are revoked when replaced and on unmount.
 */
export default function ImageField({ name, label, currentUrl, alt = "", multiple = false, removeName, help }) {
    const id = useId();
    const input = useRef(null);
    const [previews, setPreviews] = useState([]);
    const [error, setError] = useState("");
    useEffect(() => () => { previews.forEach((p) => URL.revokeObjectURL(p.src)); }, [previews]);
    function onChange(e) {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) {
            setPreviews([]);
            setError("");
            return;
        }
        const bad = files.map((f) => validateImageFile(f)).find(Boolean);
        if (bad) {
            e.target.value = "";
            setPreviews([]);
            setError(bad);
            return;
        }
        setError("");
        setPreviews(files.map((f) => ({ src: URL.createObjectURL(f), name: f.name })));
    }
    const hasNew = previews.length > 0;
    return (<div className="space-y-2">
      <label htmlFor={id} className="block text-sm">{label}</label>
      <div className="flex flex-wrap items-start gap-3">
        {currentUrl && (<figure className={hasNew ? "opacity-50" : ""}>
            <SmartImage src={currentUrl} alt={alt || label} sizes="96px" frameClassName="h-24 w-24 border border-sand bg-cream" fallback={<div className="flex h-24 w-24 items-center justify-center border border-sand text-[10px] text-taupe">Image not available</div>}/>
            <figcaption className="mt-1 text-[11px] text-taupe">{hasNew ? "Current (will be replaced)" : "Current image"}</figcaption>
          </figure>)}
        {previews.map((p) => (<figure key={p.src}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.src} alt={`Preview of ${p.name}`} className="h-24 w-24 border border-charcoal object-cover"/>
            <figcaption className="mt-1 max-w-24 truncate text-[11px] text-umber">New: {p.name}</figcaption>
          </figure>))}
      </div>
      <input ref={input} id={id} name={name} type="file" accept={IMAGE_ACCEPT} multiple={multiple} onChange={onChange} aria-describedby={`${id}-help`} className="block text-sm"/>
      <p id={`${id}-help`} className="text-xs text-taupe">
        {help ?? (currentUrl ? "Choose a file to replace the current image. Leave empty to keep it." : "Optional.")} JPG, PNG or WEBP, max 5 MB{multiple ? " each" : ""}.
      </p>
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      {removeName && currentUrl && !hasNew && (<label className="flex items-center gap-2 text-sm"><input type="checkbox" name={removeName} className="h-4 w-4"/>Remove current image</label>)}
    </div>);
}
