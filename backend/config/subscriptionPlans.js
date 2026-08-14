export const SUBSCRIPTION_PLANS = {
    free: {
        name: 'Free',
        price: 0,
        currency: 'INR',
        tweetLimit: 1,
        features: ['1 tweet per month', 'Basic profile', 'View tweets'],
        stripePriceId: null,
    },
    bronze: {
        name: 'Bronze',
        price: 100,
        currency: 'INR',
        tweetLimit: 3,
        features: ['3 tweets per month', 'Basic profile', 'View tweets', 'Priority support'],
        stripePriceId: process.env.STRIPE_BRONZE_PRICE_ID,
    },
    silver: {
        name: 'Silver',
        price: 300,
        currency: 'INR',
        tweetLimit: 5,
        features: ['5 tweets per month', 'Enhanced profile', 'View tweets', 'Priority support', 'Analytics'],
        stripePriceId: process.env.STRIPE_SILVER_PRICE_ID,
    },
    gold: {
        name: 'Gold',
        price: 1000,
        currency: 'INR',
        tweetLimit: -1,
        features: ['Unlimited tweets', 'Premium profile', 'View tweets', '24/7 Support', 'Advanced Analytics', 'Verified badge'],
        stripePriceId: process.env.STRIPE_GOLD_PRICE_ID,
    },
};

export const PLAN_LIMITS = {
    free: 1,
    bronze: 3,
    silver: 5,
    gold: -1,
};

export const PAYMENT_WINDOW = {
    startHour: 10,
    endHour: 11,
    timezone: 'Asia/Kolkata',
};

export function getPlanLimit(plan) {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

export function isWithinPaymentWindow() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const hour = istTime.getHours();
    return hour >= PAYMENT_WINDOW.startHour && hour < PAYMENT_WINDOW.endHour;
}

export function getPaymentWindowStatus() {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const hour = istTime.getHours();
    const minutes = istTime.getMinutes();
    
    if (hour >= PAYMENT_WINDOW.startHour && hour < PAYMENT_WINDOW.endHour) {
        const minutesLeft = (PAYMENT_WINDOW.endHour * 60) - (hour * 60 + minutes);
        return {
            isOpen: true,
            message: `Payment window open. ${minutesLeft} minutes remaining.`,
            closesAt: `${PAYMENT_WINDOW.endHour}:00 IST`,
        };
    }
    
    let nextOpenHour = PAYMENT_WINDOW.startHour;
    let nextOpenDay = 'today';
    if (hour >= PAYMENT_WINDOW.endHour) {
        nextOpenDay = 'tomorrow';
    }
    
    return {
        isOpen: false,
        message: `Payments only allowed between ${PAYMENT_WINDOW.startHour}:00 - ${PAYMENT_WINDOW.endHour}:00 IST. Next window opens ${nextOpenDay} at ${PAYMENT_WINDOW.startHour}:00 IST.`,
        opensAt: `${nextOpenDay} ${PAYMENT_WINDOW.startHour}:00 IST`,
    };
}

export function canUserTweet(user) {
    const plan = user.subscriptionPlan || 'free';
    const limit = getPlanLimit(plan);
    
    if (limit === -1) return { canTweet: true, remaining: -1 };
    
    const now = new Date();
    const lastReset = new Date(user.lastTweetReset || user.joinedDate);
    
    const isNewMonth = now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear();
    
    if (isNewMonth) {
        return { canTweet: true, remaining: limit, resetNeeded: true };
    }
    
    const remaining = Math.max(0, limit - (user.tweetCount || 0));
    return { canTweet: remaining > 0, remaining, resetNeeded: false };
}