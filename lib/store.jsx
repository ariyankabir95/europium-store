"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CURRENCY_STORAGE_KEY, DEFAULT_CURRENCY, isCurrency } from "@/lib/format";
import { supabaseBrowser } from "@/lib/supabase/client";
import { readPendingFromUrl } from "@/lib/cart-pending";
const StoreCtx = createContext(null);
const read = (k, d) => { try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : d;
}
catch {
    return d;
} };
const hasBrowserAuth = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
function parseItems(j) {
    if (!j || typeof j !== "object" || !Array.isArray(j.items))
        return null;
    const out = [];
    for (const r of j.items) {
        if (!r || typeof r !== "object")
            continue;
        const o = r;
        if (typeof o.productId === "string" && typeof o.size === "string" && typeof o.color === "string" && typeof o.qty === "number")
            out.push({ productId: o.productId, size: o.size, color: o.color, qty: o.qty });
    }
    return out;
}
const sameLine = (a, b) => a.productId === b.productId && a.size === b.size && a.color === b.color;
export function StoreProvider({ children, products }) {
    const [cart, setCart] = useState([]);
    const [cartStatus, setCartStatus] = useState("loading");
    const [wish, setWish] = useState([]);
    const [ready, setReady] = useState(false);
    const [open, setOpenRaw] = useState(false);
    const [synced, setSynced] = useState(false);
    const [authOpen, setAuthOpen] = useState(false);
    const [authReason, setAuthReason] = useState("");
    const [authReturnTo, setAuthReturnTo] = useState("/");
    const [authPending, setAuthPending] = useState(null);
    const [notice, setNotice] = useState("");
    const pendingRef = useRef(null);
    const pendingFromUrl = useRef(false);
    const seq = useRef(0);
    // Always starts as the default so server and first client render match; the saved choice is restored after mount.
    const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);
    useEffect(() => {
        try {
            const v = localStorage.getItem(CURRENCY_STORAGE_KEY);
            if (isCurrency(v))
                setCurrencyState(v);
        }
        catch { }
        const sync = (e) => { if (e.key === CURRENCY_STORAGE_KEY && isCurrency(e.newValue))
            setCurrencyState(e.newValue); };
        addEventListener("storage", sync);
        return () => removeEventListener("storage", sync);
    }, []);
    const setCurrency = useCallback((c) => {
        if (!isCurrency(c))
            return;
        setCurrencyState(c);
        try {
            localStorage.setItem(CURRENCY_STORAGE_KEY, c);
        }
        catch { }
    }, []);
    // ---- Auth popup ------------------------------------------------------------------------------------------------
    const openAuth = useCallback((reason = "", pending = null) => {
        pendingRef.current = pending;
        pendingFromUrl.current = false;
        setAuthPending(pending);
        setAuthReturnTo(`${location.pathname}${location.search}`);
        setAuthReason(reason);
        setAuthOpen(true);
    }, []);
    const closeAuth = useCallback(() => { pendingRef.current = null; setAuthPending(null); setAuthOpen(false); }, []);
    const finishAuth = useCallback(() => setAuthOpen(false), []);
    const notify = useCallback((message) => setNotice(message), []);
    const clearNotice = useCallback(() => setNotice(""), []);
    // ---- Cart: the server is the only source of truth; guests never have one ---------------------------------------
    const toGuest = useCallback(() => { setCart([]); setCartStatus("guest"); setOpenRaw(false); }, []);
    const refreshCart = useCallback(async () => {
        const id = ++seq.current;
        try {
            const r = await fetch("/api/cart", { cache: "no-store" });
            if (id !== seq.current)
                return;
            if (r.status === 401)
                return toGuest();
            const items = r.ok ? parseItems(await r.json()) : null;
            if (id !== seq.current)
                return;
            if (items) {
                setCart(items);
                setCartStatus("user");
            }
            else
                setCartStatus((s) => (s === "loading" ? "error" : s));
        }
        catch {
            if (id === seq.current)
                setCartStatus((s) => (s === "loading" ? "error" : s));
        }
    }, [toGuest]);
    useEffect(() => {
        // Remove any cart a previous version of the site kept in this browser: guests must not have a local cart.
        try {
            localStorage.removeItem("eu_cart");
        }
        catch { }
        // Returning from the email-confirmation link with an add-to-cart that was started before signing up.
        const back = readPendingFromUrl(location.href);
        if (back) {
            history.replaceState(null, "", back.cleanPath);
            if (back.line) {
                pendingRef.current = back.line;
                pendingFromUrl.current = true;
            }
        }
        void refreshCart();
        if (!hasBrowserAuth())
            return;
        const { data } = supabaseBrowser().auth.onAuthStateChange((event) => {
            if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED")
                return;
            setTimeout(() => { void refreshCart(); }, 0);
        });
        return () => data.subscription.unsubscribe();
    }, [refreshCart]);
    const mutate = useCallback(async (m) => {
        const id = ++seq.current;
        try {
            const r = await fetch("/api/cart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(m) });
            if (r.status === 401) {
                toGuest();
                return { status: "auth" };
            }
            const j = await r.json().catch(() => null);
            if (!r.ok) {
                const message = j && typeof j === "object" && typeof j.error === "string" ? j.error : "We couldn't update your cart. Please try again.";
                void refreshCart();
                return { status: "error", message };
            }
            const items = parseItems(j);
            if (items && id === seq.current) {
                setCart(items);
                setCartStatus("user");
            }
            else if (id !== seq.current)
                void refreshCart();
            return { status: "ok" };
        }
        catch {
            void refreshCart();
            return { status: "error", message: "Network error. Please try again." };
        }
    }, [refreshCart, toGuest]);
    const add = useCallback(async (l) => {
        const reason = "Sign in or create an account to add items to your cart.";
        // Signed-out visitor: open the popup right away and remember exactly what they wanted. Nothing is added or stored.
        if (cartStatus === "guest") {
            openAuth(reason, l);
            return { status: "auth" };
        }
        // Otherwise the server decides (and answers 401 if the session turns out to be gone).
        const res = await mutate({ op: "add", item: l });
        if (res.status === "ok")
            setOpenRaw(true);
        else if (res.status === "auth")
            openAuth(reason, l);
        return res;
    }, [cartStatus, mutate, openAuth]);
    // Finishes the add that was waiting for sign-in, so the visitor never has to click Add to cart a second time.
    useEffect(() => {
        const p = pendingRef.current;
        if (!p)
            return;
        if (cartStatus === "guest" && pendingFromUrl.current) {
            pendingRef.current = null;
            pendingFromUrl.current = false;
            return;
        }
        if (cartStatus !== "user")
            return;
        pendingRef.current = null;
        pendingFromUrl.current = false;
        setAuthPending(null);
        setAuthOpen(false);
        void mutate({ op: "add", item: p }).then((r) => {
            if (r.status === "ok")
                setOpenRaw(true);
            else if (r.status === "error")
                setNotice(r.message);
        });
    }, [cartStatus, mutate]);
    const setQty = useCallback((i, q) => {
        const line = cart[i];
        if (!line)
            return;
        const qty = Math.max(1, Math.min(10, q));
        setCart((c) => c.map((x) => (sameLine(x, line) ? { ...x, qty } : x)));
        void mutate({ op: "setQty", item: { ...line, qty } });
    }, [cart, mutate]);
    const remove = useCallback((i) => {
        const line = cart[i];
        if (!line)
            return;
        setCart((c) => c.filter((x) => !sameLine(x, line)));
        void mutate({ op: "remove", item: line });
    }, [cart, mutate]);
    const clear = useCallback(async () => { setCart([]); await mutate({ op: "clear" }); }, [mutate]);
    const signedIn = cartStatus === "user";
    const setOpen = useCallback((v) => {
        if (v && !signedIn) {
            openAuth("Sign in or create an account to view your cart.");
            return;
        }
        setOpenRaw(v);
    }, [signedIn, openAuth]);
    // ---- Wishlist (unchanged) --------------------------------------------------------------------------------------
    useEffect(() => {
        setWish(read("eu_wish", []));
        setReady(true);
        fetch("/api/wishlist").then((r) => (r.ok ? r.json() : null)).then((j) => { if (j?.slugs) {
            setWish((w) => [...new Set([...w, ...j.slugs])]);
            setSynced(true);
        } }).catch(() => { });
    }, []);
    useEffect(() => { if (!synced)
        return; const t = setTimeout(() => { fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ slugs: wish }) }).catch(() => { }); }, 500); return () => clearTimeout(t); }, [wish, synced]);
    useEffect(() => { if (!ready)
        return; try {
        localStorage.setItem("eu_wish", JSON.stringify(wish));
    }
    catch { } }, [wish, ready]);
    const toggleWish = (id) => setWish((w) => (w.includes(id) ? w.filter((x) => x !== id) : [...w, id]));
    const count = useMemo(() => (signedIn ? cart.reduce((n, l) => n + l.qty, 0) : 0), [signedIn, cart]);
    return (<StoreCtx.Provider value={{ open, setOpen, products, cart: signedIn ? cart : [], cartStatus, signedIn, refreshCart, wish, count, add, setQty, remove, toggleWish, clear, authOpen, authReason, authReturnTo, authPending, openAuth, closeAuth, finishAuth, notice, notify, clearNotice, currency, setCurrency }}>
      {children}
    </StoreCtx.Provider>);
}
export const useStore = () => { const c = useContext(StoreCtx); if (!c)
    throw new Error("useStore outside StoreProvider"); return c; };
