"use client";
import { useStore } from "@/lib/store";
import { money } from "@/lib/format";
/** Renders a BASE BDT amount in the customer's selected currency. Usable inside server components. */
export default function Price({ amount }) {
    const { currency } = useStore();
    return <>{money(amount, currency)}</>;
}
