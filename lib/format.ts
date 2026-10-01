export const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
export const discount = (p: number, s?: number) => (s ? Math.round(((p - s) / p) * 100) : 0);
