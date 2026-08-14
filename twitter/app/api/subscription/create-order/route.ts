import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  bronze: 100,
  silver: 300,
  gold: 1000,
};

function isPaymentWindowOpen(): boolean {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  return hours === 10 && minutes >= 0 && minutes < 60;
}

export async function POST(req: NextRequest) {
  try {
    if (!isPaymentWindowOpen()) {
      return NextResponse.json(
        { error: "Payments are only allowed between 10:00 AM and 11:00 AM IST" },
        { status: 403 }
      );
    }

    const { plan } = await req.json();
    const amount = PLAN_PRICES[plan];

    if (!amount || amount === 0) {
      return NextResponse.json(
        { error: "Invalid plan or free plan selected" },
        { status: 400 }
      );
    }

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt: `sub_${plan}_${Date.now()}`,
      notes: { plan },
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 }
    );
  }
}