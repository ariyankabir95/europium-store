"use client";
import { useActionState } from "react";
import SubmitButton from "./SubmitButton";
/** Order-status/payment/tracking form for the admin orders list. Surfaces the server action's
 *  returned error (e.g. "insufficient_stock" from admin_set_order_status) instead of discarding it. */
export default function OrderStatusForm({ order, action, statusOptions, payOptions, selectClass }) {
    const [state, formAction] = useActionState(action, { error: null });
    return (<form action={formAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={order.id}/>
      <select name="status" defaultValue={order.status} aria-label="Order status" className={selectClass}>{statusOptions.map((s) => <option key={s}>{s}</option>)}</select>
      <select name="payment_status" defaultValue={order.payment_status} aria-label="Payment status" className={selectClass}>{payOptions.map((s) => <option key={s}>{s}</option>)}</select>
      <input name="tracking" defaultValue={order.tracking_number ?? ""} placeholder="Tracking number" aria-label="Tracking number" className={selectClass}/>
      <SubmitButton className="btn-line min-h-11 px-4">Save</SubmitButton>
      {state?.error ? <p role="status" className="w-full text-sm text-red-800">{state.error}</p> : null}
    </form>);
}
