export const CURRENCIES = ["BDT", "USD"];
export const BASE_CURRENCY = "BDT";
export const DEFAULT_CURRENCY = "BDT";
export const CURRENCY_STORAGE_KEY = "europium-currency";
/** Exchange rate used for display only: 1 USD = 120 BDT. Change this one number to update every USD price. */
export const BDT_PER_USD = 120;
export const CURRENCY_META = {
    BDT: { symbol: "৳", label: "BDT ৳" },
    USD: { symbol: "$", label: "USD $" },
};
/** Shipping rule in BASE BDT. Mirrors create_order() in supabase/migrations (20000 / 1200 cents); the server stays authoritative. */
export const FREE_SHIPPING_MIN_BDT = 200;
export const SHIPPING_FEE_BDT = 12;
export const isCurrency = (v) => v === "BDT" || v === "USD";
/** Converts a BASE BDT amount into the display currency. Returns a plain number; no rounding. */
export const convertFromBDT = (amountInBDT, currency = DEFAULT_CURRENCY) => currency === "USD" ? amountInBDT / BDT_PER_USD : amountInBDT;
const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const usdSmall = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const bdt = new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
/**
 * Formats a BASE BDT amount for display: ৳2,500 or $21 (2500 BDT / 120, rounded to whole dollars).
 * Amounts under $1 keep cents so small values like shipping never show as "$0".
 */
export function money(amountInBDT, currency = DEFAULT_CURRENCY) {
    const base = Number(amountInBDT) || 0;
    if (currency === "USD") {
        const v = convertFromBDT(base, "USD");
        const f = Math.abs(v) < 1 && v !== 0 ? usdSmall : usd;
        return f.format(Math.abs(v) < 0.005 ? 0 : v);
    }
    return `${base < 0 ? "-" : ""}${CURRENCY_META.BDT.symbol}${bdt.format(Math.abs(base))}`;
}
/** Discount % is always computed from the BASE BDT prices, so it never changes with the selected currency. */
export const discount = (p, s) => (s ? Math.round(((p - s) / p) * 100) : 0);
