"use client";
import { createContext, useContext } from "react";
import { FALLBACK_HEADER } from "@/lib/cms-fallback";
/**
 * Carries the CMS header menu from the root layout (server) to the Header (client).
 * Header stays a client component so existing client pages (cart, checkout, login, wishlist...) can keep rendering it.
 */
const Ctx = createContext(FALLBACK_HEADER);
export function NavProvider({ header, children }) {
    return <Ctx.Provider value={header}>{children}</Ctx.Provider>;
}
export const useHeaderNav = () => useContext(Ctx);
