"use client";
import { useEffect, useRef } from "react";
import Page from "@/components/layout/Page";
import { useStore } from "@/lib/store";
/**
 * Wraps pages that need an account (cart, checkout). Guests never see cart contents: they get the sign-in popup,
 * and after signing in the same page simply renders its content (the return flow).
 */
export default function AuthGate({ title, message, children }) {
    const { cartStatus, openAuth, refreshCart } = useStore();
    const asked = useRef(false);
    useEffect(() => {
        if (cartStatus === "guest" && !asked.current) {
            asked.current = true;
            openAuth(message);
        }
        if (cartStatus === "user")
            asked.current = false;
    }, [cartStatus, openAuth, message]);
    if (cartStatus === "user")
        return <>{children}</>;
    if (cartStatus === "loading")
        return <Page title={title}><p className="text-umber" role="status">Loading…</p></Page>;
    if (cartStatus === "error")
        return <Page title={title}><p className="text-umber">We couldn&apos;t load your account just now.</p><button onClick={() => { void refreshCart(); }} className="btn-dark mt-6">Try again</button></Page>;
    return (<Page title={title}>
      <p className="max-w-md text-umber">{message}</p>
      <button onClick={() => openAuth(message)} className="btn-dark mt-6">Sign in / Create account</button>
    </Page>);
}
