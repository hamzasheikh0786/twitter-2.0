import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
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

export async function POST(req: NextRequest) {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, plan } = await req.json();

    const body = razorpayOrderId + "|" + razorpayPaymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpaySignature) {
      return NextResponse.json(
        { error: "Invalid payment signature" },
        { status: 400 }
      );
    }

    const payment = await razorpay.payments.fetch(razorpayPaymentId);
    
    if (payment.status !== "captured") {
      return NextResponse.json(
        { error: "Payment not captured" },
        { status: 400 }
      );
    }
    
const order = await razorpay.orders.fetch(razorpayOrderId);
const orderPlan = order.notes?.plan;

if (!orderPlan || orderPlan !== plan) {
  return NextResponse.json(
    { error: "Plan mismatch between order and verification request" },
    { status: 400 }
  );
}

if (payment.amount !== PLAN_PRICES[plan] * 100) {
  return NextResponse.json(
    { error: "Payment amount does not match plan price" },
    { status: 400 }
  );
}

    const userEmail = req.headers.get("x-user-email");
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not provided" },
        { status: 400 }
      );
    }

    await fetch(`${process.env.BACKEND_URL}/api/subscription/activate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userEmail,
        plan,
        razorpayOrderId,
        razorpayPaymentId,
        amount: PLAN_PRICES[plan],
      }),
    });

    await fetch(`${process.env.BACKEND_URL}/api/subscription/send-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: userEmail,
        plan,
        amount: PLAN_PRICES[plan],
        razorpayOrderId,
        razorpayPaymentId,
      }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error verifying payment:", error);
    return NextResponse.json(
      { error: "Failed to verify payment" },
      { status: 500 }
    );
  }
}