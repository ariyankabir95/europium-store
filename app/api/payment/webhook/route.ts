import { NextResponse } from "next/server";
import { paymentProvider, applyPaymentEvent } from "@/lib/payment";
export async function POST(req: Request) {
  const provider = paymentProvider();
  if (!provider || !process.env.PAYMENT_WEBHOOK_SECRET) return NextResponse.json({ error: "Payments are not configured." }, { status: 501 });
  const event = provider.verifyWebhook(await req.text(), req.headers);
  if (!event) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  await applyPaymentEvent(event);
  return NextResponse.json({ received: true });
}
