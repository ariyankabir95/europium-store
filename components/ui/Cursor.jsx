"use client";
import { useEffect, useRef } from "react";
/** Desktop-only, decorative; the native cursor is never hidden. Skipped on touch and reduced-motion. */
export default function Cursor() {
    const ref = useRef(null);
    useEffect(() => {
        if (!matchMedia("(hover: hover) and (pointer: fine)").matches || matchMedia("(prefers-reduced-motion: reduce)").matches)
            return;
        const el = ref.current;
        el.hidden = false;
        let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
        const move = (e) => { tx = e.clientX; ty = e.clientY; el.dataset.hover = e.target.closest("a,button,input,select,textarea,summary") ? "1" : "0"; };
        const loop = () => { x += (tx - x) * 0.2; y += (ty - y) * 0.2; el.style.transform = `translate(${x - 10}px,${y - 10}px)`; raf = requestAnimationFrame(loop); };
        addEventListener("pointermove", move);
        raf = requestAnimationFrame(loop);
        return () => { removeEventListener("pointermove", move); cancelAnimationFrame(raf); };
    }, []);
    return <div ref={ref} hidden aria-hidden="true" className="group pointer-events-none fixed left-0 top-0 z-[60]"><span className="block h-5 w-5 rounded-full border border-white mix-blend-difference transition-transform duration-200 group-data-[hover='1']:scale-150"/></div>;
}
