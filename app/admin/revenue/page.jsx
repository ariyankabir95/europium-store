import Link from "next/link";
import { revalidatePath } from "next/cache";
import { requireAdmin, str, cents, uuid } from "@/lib/admin";
import { back } from "@/lib/cms-admin";
import { money } from "@/lib/format";
import Flash from "@/components/admin/Flash";
import SubmitButton from "@/components/admin/SubmitButton";

/*
 * Auto-calculated revenue, straight from `orders` via the admin_revenue_summary/admin_revenue_by_day
 * SQL functions (supabase/migrations/0029_revenue_tracking.sql) -- a single aggregate query each, so the
 * totals stay correct regardless of how many orders exist (never "fetch N rows and sum in JS", which
 * would silently undercount past one page of results).
 *
 * "Manual control": revenue_adjustments is a small separate ledger (admin_add_revenue_adjustment /
 * admin_delete_revenue_adjustment) for correcting the picture by hand -- an offline sale that never went
 * through the site, a write-off, a correction -- WITHOUT ever editing a real order row. Net revenue is
 * simply (paid orders total) + (sum of adjustments in range).
 */

const RANGES = [
    ["today", "Today"],
    ["last7", "Last 7 days"],
    ["month", "This month"],
    ["year", "This year"],
    ["all", "All time"],
];

/** Today's calendar date in Asia/Dhaka, as YYYY-MM-DD -- not the server's own timezone. */
function dhakaToday() {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Dhaka", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
function addDays(dateStr, delta) {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + delta);
    return d.toISOString().slice(0, 10);
}
const isDateStr = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v ?? "");

function resolveRange(sp) {
    const today = dhakaToday();
    const range = RANGES.some(([k]) => k === sp?.range) ? sp.range : (isDateStr(sp?.from) || isDateStr(sp?.to) ? "custom" : "last7");
    if (range === "today")
        return { range, from: today, to: today };
    if (range === "month")
        return { range, from: `${today.slice(0, 7)}-01`, to: today };
    if (range === "year")
        return { range, from: `${today.slice(0, 4)}-01-01`, to: today };
    if (range === "all")
        return { range, from: "2020-01-01", to: today };
    if (range === "custom") {
        const from = isDateStr(sp?.from) ? sp.from : addDays(today, -6);
        const to = isDateStr(sp?.to) ? sp.to : today;
        return from <= to ? { range, from, to } : { range, from: to, to: from };
    }
    return { range: "last7", from: addDays(today, -6), to: today };
}

function qs({ range, from, to }) {
    const p = new URLSearchParams({ range });
    if (range === "custom") {
        p.set("from", from);
        p.set("to", to);
    }
    return `?${p.toString()}`;
}

async function addAdjustment(fd) {
    "use server";
    const sb = await requireAdmin();
    const label = str(fd, "label", 200);
    const kind = str(fd, "kind");
    const note = str(fd, "note", 500);
    const date = str(fd, "date", 10);
    const back_qs = `?range=${encodeURIComponent(str(fd, "range", 20))}&from=${encodeURIComponent(str(fd, "from", 10))}&to=${encodeURIComponent(str(fd, "to", 10))}`;
    const amountCents = cents(fd, "amount");
    if (!label || !amountCents || !isDateStr(date))
        back(`/admin/revenue${back_qs}`, "error", "Please fill in a label, an amount greater than zero, and a valid date.");
    const signed = kind === "subtract" ? -Math.abs(amountCents) : Math.abs(amountCents);
    const { error } = await sb.rpc("admin_add_revenue_adjustment", { p_label: label, p_amount_cents: signed, p_note: note || null, p_date: date });
    if (error) {
        console.error("[admin/revenue] add adjustment failed", error.code, error.message);
        back(`/admin/revenue${back_qs}`, "error", "Could not save that adjustment. Please try again.");
    }
    revalidatePath("/admin/revenue");
    back(`/admin/revenue${back_qs}`, "ok", "Adjustment added.");
}

async function deleteAdjustment(fd) {
    "use server";
    const sb = await requireAdmin();
    const id = str(fd, "id");
    const back_qs = `?range=${encodeURIComponent(str(fd, "range", 20))}&from=${encodeURIComponent(str(fd, "from", 10))}&to=${encodeURIComponent(str(fd, "to", 10))}`;
    if (!uuid(id))
        back(`/admin/revenue${back_qs}`, "error", "Invalid adjustment.");
    const { error } = await sb.rpc("admin_delete_revenue_adjustment", { p_id: id });
    if (error) {
        console.error("[admin/revenue] delete adjustment failed", error.code, error.message);
        back(`/admin/revenue${back_qs}`, "error", "Could not remove that adjustment. Please try again.");
    }
    revalidatePath("/admin/revenue");
    back(`/admin/revenue${back_qs}`, "ok", "Adjustment removed.");
}

export default async function Revenue({ searchParams }) {
    const sb = await requireAdmin();
    const sp = await searchParams;
    const { range, from, to } = resolveRange(sp);

    const [{ data: summaryRows, error: summaryError }, { data: days, error: daysError }, { data: adjustments, error: adjError }] = await Promise.all([
        sb.rpc("admin_revenue_summary", { p_from: from, p_to: to }),
        sb.rpc("admin_revenue_by_day", { p_from: from, p_to: to }),
        sb.from("revenue_adjustments").select("id,label,amount_cents,note,adjustment_date,created_at").gte("adjustment_date", from).lte("adjustment_date", to).order("adjustment_date", { ascending: false }).order("created_at", { ascending: false }).limit(200),
    ]);

    if (summaryError || daysError || adjError) {
        console.error("[admin/revenue] load failed", summaryError?.code, daysError?.code, adjError?.code);
        return (<>
          <h1 className="mb-3 font-serif text-4xl">Revenue</h1>
          <p className="border border-red-800 px-4 py-3 text-sm text-red-800">Couldn&rsquo;t load revenue data. If this is the first time you&rsquo;re opening this page, make sure migration 0029_revenue_tracking.sql has been applied to the database.</p>
        </>);
    }

    const s = summaryRows?.[0] ?? { paid_orders_count: 0, paid_revenue_cents: 0, paid_subtotal_cents: 0, paid_discount_cents: 0, paid_shipping_cents: 0, pending_collection_cents: 0, pending_collection_count: 0, refunded_cents: 0, refunded_count: 0, adjustments_cents: 0, adjustments_count: 0 };
    const netCents = Number(s.paid_revenue_cents) + Number(s.adjustments_cents);
    const avgOrderCents = s.paid_orders_count > 0 ? Math.round(Number(s.paid_revenue_cents) / Number(s.paid_orders_count)) : 0;
    const maxDay = Math.max(1, ...(days ?? []).map((d) => Number(d.revenue_cents)));

    const current = { range, from, to };
    const bdt = (c) => money(Number(c) / 100, "BDT");

    const stat = (label, value, tone = "text-charcoal") => (<div className="border border-sand p-5"><dt className="text-xs tracking-[0.18em] uppercase text-umber">{label}</dt><dd className={`mt-2 font-serif text-2xl ${tone}`}>{value}</dd></div>);

    return (<>
      <h1 className="mb-3 font-serif text-4xl">Revenue</h1>
      <p className="mb-6 text-sm text-taupe">Auto-calculated from orders marked paid. Use adjustments below for anything the order system doesn&rsquo;t capture, or to correct a mistake.</p>
      <Flash ok={sp?.ok} error={sp?.error} />

      <nav aria-label="Date range" className="mb-8 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.12em]">
        {RANGES.map(([k, l]) => <Link key={k} href={`/admin/revenue${qs({ range: k, from, to })}`} className={`min-h-11 border px-4 py-2 ${range === k ? "border-charcoal bg-charcoal text-warm" : "border-sand"}`}>{l}</Link>)}
        <form action="/admin/revenue" className="flex items-center gap-2 normal-case">
          <input type="hidden" name="range" value="custom"/>
          <label className="sr-only" htmlFor="from">From</label>
          <input id="from" name="from" type="date" defaultValue={from} className="min-h-11 border border-sand bg-transparent px-2 text-sm"/>
          <span className="text-taupe">–</span>
          <label className="sr-only" htmlFor="to">To</label>
          <input id="to" name="to" type="date" defaultValue={to} className="min-h-11 border border-sand bg-transparent px-2 text-sm"/>
          <button type="submit" className="btn-line min-h-11">Go</button>
        </form>
      </nav>

      <div className="mb-10 border border-charcoal bg-charcoal p-6 text-warm">
        <p className="text-xs uppercase tracking-[0.18em] text-warm/70">Net revenue ({from === to ? from : `${from} – ${to}`})</p>
        <p className="mt-2 font-serif text-5xl">{bdt(netCents)}</p>
        <p className="mt-2 text-sm text-warm/70">{bdt(s.paid_revenue_cents)} from {s.paid_orders_count} paid {s.paid_orders_count === 1 ? "order" : "orders"}{Number(s.adjustments_cents) !== 0 ? <> {Number(s.adjustments_cents) > 0 ? "+ " : "- "}{bdt(Math.abs(s.adjustments_cents))} from {s.adjustments_count} manual {s.adjustments_count === 1 ? "adjustment" : "adjustments"}</> : null}</p>
      </div>

      <dl className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-3">
        {stat("Paid orders", s.paid_orders_count)}
        {stat("Average order", bdt(avgOrderCents))}
        {stat("Discounts given", bdt(s.paid_discount_cents))}
        {stat("Shipping collected", bdt(s.paid_shipping_cents))}
        {stat("Awaiting payment", `${bdt(s.pending_collection_cents)} · ${s.pending_collection_count} ${s.pending_collection_count === 1 ? "order" : "orders"}`, "text-umber")}
        {stat("Refunded", `${bdt(s.refunded_cents)} · ${s.refunded_count} ${s.refunded_count === 1 ? "order" : "orders"}`, "text-red-800")}
      </dl>

      <section className="mb-12">
        <h2 className="mb-4 font-serif text-2xl">Daily paid revenue</h2>
        {days?.length ? <div className="divide-y divide-sand border-y border-sand text-sm">
          {[...days].reverse().map((d) => (<div key={d.day} className="flex items-center gap-4 py-2">
            <span className="w-28 flex-none text-taupe">{d.day}</span>
            <span className="w-16 flex-none text-right text-taupe">{d.orders_count}</span>
            <span className="h-3 flex-1 bg-sand"><span className="block h-full bg-charcoal" style={{ width: `${Math.max(2, (Number(d.revenue_cents) / maxDay) * 100)}%` }}/></span>
            <span className="w-28 flex-none text-right">{bdt(d.revenue_cents)}</span>
          </div>))}
        </div> : <p className="text-sm text-umber">No paid orders in this range yet.</p>}
      </section>

      <section className="mb-12">
        <h2 className="mb-1 font-serif text-2xl">Manual adjustments</h2>
        <p className="mb-4 text-sm text-taupe">Add an entry for anything the order system doesn&rsquo;t capture, or to fix a mistake. To correct an adjustment, delete it and add a new one -- nothing here is silently edited.</p>
        <form action={addAdjustment} className="mb-6 flex flex-wrap items-end gap-3 border border-sand p-4">
          <input type="hidden" name="range" value={current.range}/>
          <input type="hidden" name="from" value={current.from}/>
          <input type="hidden" name="to" value={current.to}/>
          <div className="flex-1 basis-48"><label htmlFor="label" className="mb-1 block text-xs uppercase tracking-[0.12em]">Label</label><input id="label" name="label" required maxLength={200} placeholder="e.g. Offline market sale" className="min-h-11 w-full border border-sand bg-transparent px-3"/></div>
          <div><label htmlFor="kind" className="mb-1 block text-xs uppercase tracking-[0.12em]">Type</label><select id="kind" name="kind" className="min-h-11 border border-sand bg-transparent px-2"><option value="add">Add to revenue</option><option value="subtract">Subtract / correction</option></select></div>
          <div className="w-32"><label htmlFor="amount" className="mb-1 block text-xs uppercase tracking-[0.12em]">Amount (৳)</label><input id="amount" name="amount" type="number" min="0.01" step="0.01" required className="min-h-11 w-full border border-sand bg-transparent px-3"/></div>
          <div className="w-40"><label htmlFor="date" className="mb-1 block text-xs uppercase tracking-[0.12em]">Date</label><input id="date" name="date" type="date" defaultValue={dhakaToday()} required className="min-h-11 w-full border border-sand bg-transparent px-3"/></div>
          <div className="flex-1 basis-48"><label htmlFor="note" className="mb-1 block text-xs uppercase tracking-[0.12em]">Note (optional)</label><input id="note" name="note" maxLength={500} className="min-h-11 w-full border border-sand bg-transparent px-3"/></div>
          <SubmitButton className="btn-dark min-h-11">Add</SubmitButton>
        </form>
        {adjustments?.length ? <ul className="divide-y divide-sand border-y border-sand text-sm">
          {adjustments.map((a) => (<li key={a.id} className="flex items-center justify-between gap-4 py-3">
            <span className="flex-1"><span className="font-medium">{a.label}</span>{a.note ? <span className="text-taupe"> — {a.note}</span> : null}<br/><span className="text-xs text-taupe">{a.adjustment_date}</span></span>
            <span className={Number(a.amount_cents) < 0 ? "text-red-800" : "text-charcoal"}>{bdt(a.amount_cents)}</span>
            <form action={deleteAdjustment}>
              <input type="hidden" name="id" value={a.id}/>
              <input type="hidden" name="range" value={current.range}/>
              <input type="hidden" name="from" value={current.from}/>
              <input type="hidden" name="to" value={current.to}/>
              <SubmitButton pending="…" className="btn-line min-h-11 px-3 text-xs">Delete</SubmitButton>
            </form>
          </li>))}
        </ul> : <p className="text-sm text-umber">No manual adjustments in this range.</p>}
      </section>
    </>);
}
