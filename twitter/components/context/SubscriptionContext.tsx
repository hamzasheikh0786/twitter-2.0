"use client";
import {useAuth} from "@/components/context/AuthContext";
import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import axiosInstance from "@/Lib/axiosInstance";

export type SubscriptionPlan = "free" | "bronze" | "silver" | "gold";

export const PLAN_HIERARCHY: Record<SubscriptionPlan, number> = {
  free: 0,
  bronze: 1,
  silver: 2,
  gold: 3,
};

export interface SubscriptionPlanDetails {
  name: string;
  price: number;
  tweetLimit: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlan, SubscriptionPlanDetails> = {
  free: {
    name: "Free",
    price: 0,
    tweetLimit: 1,
    features: ["1 tweet per month", "Basic profile", "View tweets"],
  },
  bronze: {
    name: "Bronze",
    price: 100,
    tweetLimit: 3,
    features: ["3 tweets per month", "Basic profile", "View tweets", "No ads"],
  },
  silver: {
    name: "Silver",
    price: 300,
    tweetLimit: 5,
    features: ["5 tweets per month", "Enhanced profile", "View tweets", "No ads", "Analytics"],
  },
  gold: {
    name: "Gold",
    price: 1000,
    tweetLimit: -1,
    features: ["Unlimited tweets", "Premium profile", "View tweets", "No ads", "Analytics", "Priority support"],
  },
};

export interface SubscriptionData {
  plan: SubscriptionPlan;
  tweetsUsed: number;
  tweetsResetDate: string;
  isActive: boolean;
  paymentHistory: PaymentRecord[];
}

export interface PaymentRecord {
  id: string;
  plan: SubscriptionPlan;
  amount: number;
  date: string;
  status: "success" | "failed" | "pending";
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
}

interface SubscriptionContextType {
  subscription: SubscriptionData | null;
  isLoading: boolean;
  fetchSubscription: () => Promise<void>;
  upgradePlan: (plan: SubscriptionPlan) => Promise<{ orderId: string; amount: number }>;
  verifyPayment: (paymentData: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    plan: SubscriptionPlan;
  }) => Promise<void>;
  canPostTweet: () => boolean;
  getRemainingTweets: () => number;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
};

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = async () => {
    try {
      const res = await axiosInstance.get("/subscription/status",{params:{ email: user?.email },});
      if (res.data) {
        setSubscription(res.data);
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setIsLoading(false);
    }
  };

    const upgradePlan = async (plan: SubscriptionPlan) => {
    const res = await fetch("/api/subscription/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (!res.ok) throw { response: { data } };
    return data;
  };

  const verifyPayment = async (paymentData: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
    plan: SubscriptionPlan;
  }) => {
    const res = await fetch("/api/subscription/verify-payment", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-user-email": user?.email || "",
      },
      body: JSON.stringify(paymentData),
    });
    if (!res.ok) throw new Error("Payment verification failed");
    await fetchSubscription();
  };

  const canPostTweet = () => {
    if (!subscription) return false;
    const planDetails = SUBSCRIPTION_PLANS[subscription.plan];
    if (planDetails.tweetLimit === -1) return true;
    return subscription.tweetsUsed < planDetails.tweetLimit;
  };

  const getRemainingTweets = () => {
    if (!subscription) return 0;
    const planDetails = SUBSCRIPTION_PLANS[subscription.plan];
    if (planDetails.tweetLimit === -1) return Infinity;
    return Math.max(0, planDetails.tweetLimit - subscription.tweetsUsed);
  };

  useEffect(() => {
    const loadSubscription = async () => {
      if (!user?.email){
        setIsLoading(false);
        return;
      }
      await fetchSubscription();
    };
    loadSubscription();
  }, [user]);

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isLoading,
        fetchSubscription,
        upgradePlan,
        verifyPayment,
        canPostTweet,
        getRemainingTweets,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};