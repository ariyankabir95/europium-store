"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AuthForm, { safeNext } from "@/components/auth/AuthForm";
import { useStore } from "@/lib/store";
import { withPending } from "@/lib/cart-pending";
/** Sign in / create account popup. Signing in keeps the visitor on the page they were on (product, cart or checkout). */
export default function AuthModal() {
    const { authOpen, closeAuth, finishAuth, authReason, authReturnTo, authPending, refreshCart } = useStore();
    const router = useRouter();
    const [mode, setMode] = useState("login");
    const box = useRef(null);
    useEffect(() => {
        if (!authOpen)
            return;
        setMode("login");
        const first = box.current?.querySelector("input,button");
        first?.focus();
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const k = (e) => {
            if (e.key === "Escape")
                return closeAuth();
            if (e.key !== "Tab" || !box.current)
                return;
            const f = box.current.querySelectorAll("a[href],button:not([disabled]),input:not([disabled])");
            if (!f.length)
                return;
            const a = f[0], z = f[f.length - 1];
            if (e.shiftKey && document.activeElement === a) {
                e.preventDefault();
                z.focus();
            }
            else if (!e.shiftKey && document.activeElement === z) {
                e.preventDefault();
                a.focus();
            }
        };
        addEventListener("keydown", k);
        return () => { removeEventListener("keydown", k); document.body.style.overflow = prev; };
    }, [authOpen, closeAuth]);
    const title = mode === "login" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password";
    return (<>
      <div onClick={closeAuth} aria-hidden="true" className={`fixed inset-0 z-[90] bg-charcoal/50 transition-opacity duration-300 ${authOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}/>
      <div ref={box} role="dialog" aria-modal="true" aria-label={title} aria-hidden={!authOpen} className={`fixed left-1/2 top-1/2 z-[91] max-h-[90vh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-sand bg-warm p-6 shadow-xl transition-opacity duration-300 md:p-8 ${authOpen ? "opacity-100" : "invisible opacity-0"}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div><h2 className="font-serif text-2xl">{title}</h2>{authReason && mode !== "forgot" && <p className="mt-2 text-sm text-umber">{authReason}</p>}</div>
          <button type="button" onClick={closeAuth} className="min-h-11 px-2 text-sm underline">Close</button>
        </div>
        {authOpen && <AuthForm mode={mode} onModeChange={setMode} getNext={() => safeNext(withPending(authReturnTo, authPending), "/account")} onSignedIn={() => { finishAuth(); void refreshCart(); router.refresh(); }}/>}
      </div>
    </>);
}
