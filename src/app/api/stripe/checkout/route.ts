import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStripe, PRICE_AMOUNT, CURRENCY } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, stripeCustomerId: true, hasPaid: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.hasPaid) {
    return NextResponse.json({ error: "Already subscribed" }, { status: 400 });
  }

  // Create or reuse Stripe customer
  const stripe = getStripe();
  let customerId = user.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: user.name ?? undefined,
      metadata: { userId: user.id },
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });
    customerId = customer.id;
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: CURRENCY,
          product_data: {
            name: "Grapplers List Pro",
            description: "Lifetime access — unlock all competition filters",
          },
          unit_amount: PRICE_AMOUNT,
        },
        quantity: 1,
      },
    ],
    success_url: `${APP_URL}?payment=success`,
    cancel_url: `${APP_URL}?payment=cancelled`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
