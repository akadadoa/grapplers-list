import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[Stripe webhook] Invalid signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.customer as string;

      if (customerId) {
        await prisma.user.update({
          where: { stripeCustomerId: customerId },
          data: { hasPaid: true },
        });
        console.log(`[Stripe] Payment confirmed for customer ${customerId}`);
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const customerId = charge.customer as string;

      if (customerId) {
        await prisma.user.update({
          where: { stripeCustomerId: customerId },
          data: { hasPaid: false },
        });
        console.log(`[Stripe] Access revoked after refund for customer ${customerId}`);
      }
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}
