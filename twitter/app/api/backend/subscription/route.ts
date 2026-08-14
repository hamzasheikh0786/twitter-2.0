import { NextRequest, NextResponse } from "next/server";

interface SubscriptionData {
  plan: string;
  tweetsUsed: number;
  tweetsResetDate: string;
  isActive: boolean;
  paymentHistory: PaymentRecord[];
}

interface PaymentRecord {
  id: string;
  plan: string;
  amount: number;
  date: string;
  status: "success" | "failed" | "pending";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

const mockSubscriptions: Record<string, SubscriptionData> = {};

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    let subscription = mockSubscriptions[email];
    
    if (!subscription) {
      subscription = {
        plan: "free",
        tweetsUsed: 0,
        tweetsResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        isActive: true,
        paymentHistory: [],
      };
      mockSubscriptions[email] = subscription;
    }

    const resetDate = new Date(subscription.tweetsResetDate);
    if (resetDate < new Date()) {
      subscription.tweetsUsed = 0;
      subscription.tweetsResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, plan, razorpayOrderId, razorpayPaymentId, amount } = await req.json();
    
    if (!email || !plan) {
      return NextResponse.json({ error: "Email and plan required" }, { status: 400 });
    }

    const subscription = mockSubscriptions[email] || {
      plan: "free",
      tweetsUsed: 0,
      tweetsResetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      isActive: true,
      paymentHistory: [],
    };

    subscription.plan = plan;
    subscription.tweetsUsed = 0;
    subscription.tweetsResetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    subscription.isActive = true;
    
    subscription.paymentHistory.push({
      id: `pay_${Date.now()}`,
      plan,
      amount,
      date: new Date().toISOString(),
      status: "success",
      razorpayOrderId,
      razorpayPaymentId,
    });

    mockSubscriptions[email] = subscription;

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error("Error activating subscription:", error);
    return NextResponse.json(
      { error: "Failed to activate subscription" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { email, incrementTweet } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const subscription = mockSubscriptions[email];
    
    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    }

    if (incrementTweet) {
      subscription.tweetsUsed += 1;
    }

    mockSubscriptions[email] = subscription;

    return NextResponse.json({ success: true, subscription });
  } catch (error) {
    console.error("Error updating subscription:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}