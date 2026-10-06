"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { isOptimizableImageUrl, normalizeImageUrl } from "@/lib/images";
/*
 * One component for every stored image (products, categories, collections).
 *  - Invalid / missing URL, or an image that fails to load  -> renders `fallback` (or nothing). Never a broken icon.
 *  - Supabase-hosted URLs use next/image (optimised, host allow-listed in next.config.mjs).
 *  - Any other URL (older data, pasted external URLs, site paths) keeps a plain <img>, unchanged.
 *  - The URL is never rewritten: absolute Supabase URLs are used exactly as stored.
 *
 * Fill mode: the image is absolutely positioned, so the parent must be `relative` (or pass `frameClassName`
 * and SmartImage renders that frame itself, and hides the whole frame if there is nothing to show).
 */
export default function SmartImage({ src, alt, className = "", sizes = "100vw", priority = false, fallback = null, frameClassName }) {
    const url = normalizeImageUrl(src);
    const [failed, setFailed] = useState(false);
    const ref = useRef(null);
    useEffect(() => { setFailed(false); }, [url]);
    // An image can fail before React hydrates, in which case onError never fires: check once after mount.
    useEffect(() => { const el = ref.current; if (el && el.complete && el.naturalWidth === 0)
        setFailed(true); }, [url]);
    if (!url || failed)
        return <>{fallback}</>;
    const cls = `object-cover ${className}`;
    const img = isOptimizableImageUrl(url)
        ? <Image ref={ref} src={url} alt={alt} fill sizes={sizes} priority={priority} className={cls} onError={() => setFailed(true)}/>
        // eslint-disable-next-line @next/next/no-img-element
        : <img ref={ref} src={url} alt={alt} loading={priority ? "eager" : "lazy"} className={`absolute inset-0 h-full w-full ${cls}`} onError={() => setFailed(true)}/>;
    return frameClassName ? <div className={`relative overflow-hidden ${frameClassName}`}>{img}</div> : img;
}
