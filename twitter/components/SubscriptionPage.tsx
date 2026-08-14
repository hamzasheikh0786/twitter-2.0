"use client";

import React, { useState } from "react";
import { useAuth } from "@/components/context/AuthContext";
import { useSubscription, SUBSCRIPTION_PLANS, SubscriptionPlan } from "@/components/context/SubscriptionContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, X, Lock, CreditCard, Clock, Info, AlertCircle } from "lucide-react";

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayErrorResponse {
  error: {
    description: string;
    code: string;
    reason: string;
  };
}

interface WindowWithRazorpay extends Window {
  Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill: {
    email: string;
    name: string;
  };
  theme: {
    color: string;
  };
  modal: {
    ondismiss: () => void;
  };
}

interface RazorpayInstance {
  on: (event: string, handler: (response: RazorpayErrorResponse) => void) => void;
  open: () => void;
}

interface SubscriptionPageProps {
  onClose?: () => void;
  user?: {
    email: string;
    displayName: string;
    _id: string;
  };
}

const SubscriptionPage = ({ onClose, user: userProp }: SubscriptionPageProps) => {
  const { user: authUser } = useAuth();
  const user = userProp || authUser;
  const { subscription, upgradePlan, verifyPayment, isLoading } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [showPaymentWindowInfo, setShowPaymentWindowInfo] = useState(false);

  const currentPlan = subscription?.plan || "free";
  const planDetails = SUBSCRIPTION_PLANS[currentPlan];

  const handleUpgrade = async (plan: SubscriptionPlan) => {
    if (plan === "free") return;
    
    setSelectedPlan(plan);
    setPaymentError("");
    setIsProcessing(true);

    try {
      const { orderId, amount } = await upgradePlan(plan);
      const razorpayKey= process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
      if (!razorpayKey) {
        throw new Error("Razorpay key is not set in environment variables");
      }
      
      const options = {
        key: razorpayKey,
        amount: amount,
        currency: "INR",
        name: "X Clone",
        description: `${SUBSCRIPTION_PLANS[plan].name} Plan Subscription`,
        order_id: orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            await verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              plan,
            });
            alert("Subscription upgraded successfully!");
            setSelectedPlan(null);
          } catch {
            setPaymentError("Payment verification failed. Please contact support.");
          }
        },
        prefill: {
          email: user?.email || "",
          name: user?.displayName || "",
        },
        theme: {
          color: "#1da1f2",
        },
        modal: {
          ondismiss: () => {
            setSelectedPlan(null);
            setIsProcessing(false);
          },
        },
      };

      const rzp = new (window as unknown as WindowWithRazorpay).Razorpay(options);
      rzp.on("payment.failed", (response: RazorpayErrorResponse) => {
        setPaymentError(response.error.description || "Payment failed. Please try again.");
        setIsProcessing(false);
      });
      rzp.open();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      if (err.response?.data?.error?.includes("10:00 AM and 11:00 AM")) {
        setShowPaymentWindowInfo(true);
      } else {
        setPaymentError(err.response?.data?.error || "Failed to initiate payment");
      }
      setIsProcessing(false);
    }
  };

  const isPaymentWindowOpen = () => {
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(now.getTime() + istOffset);
    const hours = istTime.getUTCHours();
    const minutes = istTime.getUTCMinutes();
    return hours === 10 && minutes >= 0 && minutes < 60;
  };

  const paymentWindowOpen = isPaymentWindowOpen();

  const plans = [
    { key: "free" as SubscriptionPlan, popular: false },
    { key: "bronze" as SubscriptionPlan, popular: false },
    { key: "silver" as SubscriptionPlan, popular: true },
    { key: "gold" as SubscriptionPlan, popular: false },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Card className="bg-gray-900 border-gray-800 max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Sign in to view subscriptions</h2>
            <p className="text-gray-400 mb-6">Please sign in to manage your subscription plan.</p>
            <Button className="w-full" onClick={() => window.location.href = "/login"}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-4xl font-bold mb-4">X</div>
          <div className="text-gray-400">Loading subscription...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black text-white rounded-xl">
      {onClose && (
        <div className="flex justify-between items-center p-4 border-b border-gray-800 sticky top-0 bg-black/95 backdrop-blur z-10 rounded-t-xl">
          <h1 className="text-2xl font-bold">Subscription Plans</h1>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </div>
      )}
      {!onClose && (
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-3xl font-bold mb-2">Subscription Plans</h1>
          <p className="text-gray-400">Choose a plan that fits your tweeting needs</p>
        </div>
      )}
      <div className="p-4 max-h-[70vh] overflow-y-auto">

        {showPaymentWindowInfo && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-800 rounded-lg flex items-start space-x-3">
            <Info className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-300">Payment Time Restriction</h3>
              <p className="text-gray-400 text-sm mt-1">
                Payments are only allowed between 10:00 AM and 11:00 AM IST. 
                Please try again during this window.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowPaymentWindowInfo(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {paymentError && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center space-x-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-300">{paymentError}</span>
            <Button variant="ghost" size="sm" onClick={() => setPaymentError("")}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {plans.map(({ key: planKey, popular }) => {
            const plan = SUBSCRIPTION_PLANS[planKey];
            const isCurrentPlan = currentPlan === planKey;

            return (
              <Card
                key={planKey}
                className={`bg-gray-900 border-gray-800 transition-all ${
                  isCurrentPlan ? "border-blue-500 ring-2 ring-blue-500/20" : "hover:border-gray-700"
                } ${popular ? "relative" : ""}`}
              >
                {popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <div className="mt-2">
                    {plan.price === 0 ? (
                      <span className="text-3xl font-bold text-white">Free</span>
                    ) : (
                      <span className="text-3xl font-bold text-white">₹{plan.price}</span>
                    )}
                    <span className="text-gray-400">/month</span>
                  </div>
                  {isCurrentPlan && (
                    <span className="inline-block mt-2 px-3 py-1 bg-blue-500/20 text-blue-400 text-sm font-medium rounded-full">
                      Current Plan
                    </span>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-3 text-sm">
                        {planKey === "free" && index >= 1 ? (
                          <X className="h-5 w-5 text-gray-600" />
                        ) : (
                          <Check className="h-5 w-5 text-green-400" />
                        )}
                        <span className={planKey === "free" && index >= 1 ? "text-gray-500 line-through" : "text-gray-300"}>
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    className="w-full"
                    disabled={isCurrentPlan || isProcessing}
                    onClick={() => handleUpgrade(planKey)}
                    variant={isCurrentPlan ? "outline" : "default"}
                    style={{ backgroundColor: popular ? "#1da1f2" : undefined }}
                  >
                    {isCurrentPlan 
                      ? "Current Plan" 
                      : isProcessing && selectedPlan === planKey
                      ? "Processing..."
                      : plan.price === 0
                      ? "Free Plan"
                      : `Upgrade to ${plan.name} - ₹${plan.price}/month`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-xl">Current Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <div className="text-3xl font-bold text-white">
                  {planDetails.tweetLimit === -1 ? "∞" : planDetails.tweetLimit}
                </div>
                <div className="text-gray-400 text-sm">Monthly Tweet Limit</div>
              </div>
              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <div className="text-3xl font-bold text-white">
                  {subscription?.tweetsUsed || 0}
                </div>
                <div className="text-gray-400 text-sm">Tweets Used This Month</div>
              </div>
              <div className="text-center p-4 bg-gray-800 rounded-lg">
                <div className="text-3xl font-bold text-white">
                  {subscription?.plan === "gold" ? "Unlimited" : 
                  Math.max(0, (planDetails.tweetLimit === -1 ? 0 : planDetails.tweetLimit) - (subscription?.tweetsUsed || 0))}
                </div>
                <div className="text-gray-400 text-sm">Tweets Remaining</div>
              </div>
            </div>

            {subscription?.paymentHistory && subscription.paymentHistory.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Payment History</h3>
                <div className="space-y-3">
                  {subscription.paymentHistory.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                          <CreditCard className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">{SUBSCRIPTION_PLANS[payment.plan].name} Plan</p>
                          <p className="text-sm text-gray-400">{new Date(payment.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">₹{payment.amount}</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          payment.status === "success" ? "bg-green-500/20 text-green-400" :
                          payment.status === "failed" ? "bg-red-500/20 text-red-400" :
                          "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {payment.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center space-x-3 text-gray-400 text-sm">
            <Clock className="h-5 w-5" />
            <span>
              Payment processing is available only between <strong>10:00 AM - 11:00 AM IST</strong> daily.
              {paymentWindowOpen ? " ✓ Window is currently OPEN" : " ✕ Window is currently CLOSED"}
            </span>
          </div>
          <div className="mt-2 flex items-center space-x-3 text-gray-400 text-sm">
            <Lock className="h-5 w-5" />
            <span>All payments are secured by Razorpay. Invoice will be emailed after successful payment.</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;