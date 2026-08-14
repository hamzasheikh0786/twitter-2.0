import express from "express"
import cors from "cors"
import mongoose from "mongoose"
import dotenv from "dotenv"
import dns from "dns"
import Stripe from "stripe"
import User from "./modals/user.js"
import Tweet from "./modals/tweet.js"
import { SUBSCRIPTION_PLANS, PLAN_LIMITS, PAYMENT_WINDOW, getPlanLimit, isWithinPaymentWindow, getPaymentWindowStatus, canUserTweet } from "./config/subscriptionPlans.js"
import { sendInvoiceEmail, sendPaymentConfirmationEmail } from "./services/emailService.js"

const { ObjectId } = mongoose.Types;

dns.setServers(["8.8.8.8","8.8.4.4"]);

dotenv.config()
const app=express()
app.use(cors())
app.use(express.json())

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2024-04-10',
});

app.get("/",(req,res)=> {
    res.send("Twitter backend is running succesfully")
});

const port = process.env.PORT || 5000;
const url =process.env.MONGODB_URL;

mongoose
    .connect(url)
    .then(() => {
        console.log("Connected to the DB");
        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
        });
    })
    .catch((err) => {
        console.log("error:",err.message)
    })

// Middleware to check tweet limits
const checkTweetLimit = async (req, res, next) => {
    try {
        const { author } = req.body;
        if (!author) {
            return res.status(400).send({ error: "Author ID is required" });
        }
        
        const user = await User.findById(author);
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        const tweetCheck = canUserTweet(user);
        
        if (tweetCheck.resetNeeded) {
            await User.findByIdAndUpdate(author, {
                tweetCount: 0,
                lastTweetReset: new Date(),
            });
            return next();
        }

        if (!tweetCheck.canTweet) {
            const plan = user.subscriptionPlan || 'free';
            const limit = getPlanLimit(plan);
            return res.status(403).send({ 
                error: `Tweet limit reached for ${SUBSCRIPTION_PLANS[plan].name} plan (${limit} tweets/month)`,
                plan: plan,
                limit: limit,
                used: user.tweetCount || 0,
                remaining: 0,
                upgradeUrl: '/subscription'
            });
        }

        req.user = user;
        req.tweetCheck = tweetCheck;
        next();
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
};

// Middleware to check payment window
const checkPaymentWindow = (req, res, next) => {
    const windowStatus = getPaymentWindowStatus();
    if (!windowStatus.isOpen) {
        return res.status(403).send({ 
            error: "Payments are only allowed between 10:00 AM - 11:00 AM IST",
            paymentWindow: windowStatus
        });
    }
    next();
};

app.post('/register', async (req, res) => {
    try{
        const existinguser =await User.findOne({ email: req.body.email });
        if (existinguser) {
            return res.status(200).send(existinguser);
        }
        const newUser = new User(req.body);
        await newUser.save()
        return res.status(201).send(newUser);
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
})

app.get('/loggedinuser', async (req, res) => {
    try{
        const { email } = req.query;
        if (!email) {
            return res.status(400).send({ error: "Email is required" });
        }
        const user = await User.findOne({ email : email });
        return res.status(200).send(user);
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
});

app.patch('/userupdate/:email', async (req, res) => {
    try{
        const { email } = req.params;
        const updatedUser = await User.findOneAndUpdate(
            { email: email }, 
            { $set: req.body }, 
            { new: true, upsert:false }
        );
        return res.status(200).send(updatedUser);
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
})

// Get subscription plans
app.get('/subscription/plans', (req, res) => {
    const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
        id: key,
        ...plan,
        tweetLimit: plan.tweetLimit === -1 ? 'Unlimited' : plan.tweetLimit,
    }));
    res.status(200).send({ plans, paymentWindow: getPaymentWindowStatus() });
});

// Get user's current subscription status
app.get('/subscription/status', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).send({ error: "Email is required" });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        const tweetCheck = canUserTweet(user);
        const plan = user.subscriptionPlan || 'free';
        
        res.status(200).send({
            plan: plan,
            planName: SUBSCRIPTION_PLANS[plan].name,
            tweetLimit: getPlanLimit(plan),
            tweetsUsed: user.tweetCount || 0,
            tweetsRemaining: tweetCheck.remaining,
            subscriptionExpiry: user.subscriptionExpiry,
            canTweet: tweetCheck.canTweet,
            paymentWindow: getPaymentWindowStatus(),
        });
    } catch (error) {
        return res.status(500).send({ error: error.message });
    }
});

// Create Stripe checkout session
app.post('/subscription/create-checkout', checkPaymentWindow, async (req, res) => {
    try {
        const { email, planId } = req.body;
        
        if (!email || !planId) {
            return res.status(400).send({ error: "Email and planId are required" });
        }

        if (!SUBSCRIPTION_PLANS[planId] || planId === 'free') {
            return res.status(400).send({ error: "Invalid plan selected" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        const plan = SUBSCRIPTION_PLANS[planId];
        
        let customerId = user.stripeCustomerId;
        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                name: user.displayName,
                metadata: { userId: user._id.toString() },
            });
            customerId = customer.id;
            user.stripeCustomerId = customerId;
            await user.save();
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'inr',
                        product_data: {
                            name: `${plan.name} Plan - Twitter Clone`,
                            description: plan.features.join(', '),
                        },
                        unit_amount: plan.price * 100,
                        recurring: { interval: 'month' },
                    },
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/subscription/cancel`,
            metadata: {
                userId: user._id.toString(),
                planId: planId,
            },
        });

        await sendInvoiceEmail(user, planId, { sessionId: session.id, amount: plan.price });

        res.status(200).send({ 
            sessionId: session.id, 
            url: session.url,
            paymentWindow: getPaymentWindowStatus(),
        });
    } catch (error) {
        console.error('Checkout session error:', error);
        return res.status(500).send({ error: error.message });
    }
});

// Stripe webhook handler
app.post('/subscription/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata.userId;
                const planId = session.metadata.planId;
                
                const user = await User.findById(userId);
                if (user) {
                    user.subscriptionPlan = planId;
                    user.stripeSubscriptionId = session.subscription;
                    user.subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                    user.tweetCount = 0;
                    user.lastTweetReset = new Date();
                    await user.save();
                    
                    await sendPaymentConfirmationEmail(user, planId, session.payment_intent);
                }
                break;
            }
            case 'customer.subscription.updated': {
                const subscription = event.data.object;
                const user = await User.findOne({ stripeCustomerId: subscription.customer });
                if (user) {
                    user.subscriptionExpiry = new Date(subscription.current_period_end * 1000);
                    if (subscription.status === 'canceled' || subscription.status === 'past_due') {
                        user.subscriptionPlan = 'free';
                    }
                    await user.save();
                }
                break;
            }
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const user = await User.findOne({ stripeCustomerId: subscription.customer });
                if (user) {
                    user.subscriptionPlan = 'free';
                    user.stripeSubscriptionId = null;
                    user.subscriptionExpiry = null;
                    await user.save();
                }
                break;
            }
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const user = await User.findOne({ stripeCustomerId: invoice.customer });
                if (user) {
                    console.log(`Payment failed for user ${user.email}`);
                }
                break;
            }
        }
        res.status(200).send({ received: true });
    } catch (error) {
        console.error('Webhook handler error:', error);
        res.status(500).send({ error: error.message });
    }
});

// Get payment window status
app.get('/subscription/payment-window', (req, res) => {
    res.status(200).send(getPaymentWindowStatus());
});

app.post('/tweet', checkTweetLimit, async (req, res) => {
    try{
        const tweet = new Tweet(req.body);
        await tweet.save()
        
        if (req.user && req.tweetCheck.remaining !== -1) {
            await User.findByIdAndUpdate(req.user._id, {
                $inc: { tweetCount: 1 },
            });
        }
        
        const populated = await tweet.populate("author"); 
        return res.status(201).send(populated);
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
})

app.get('/post', async (req, res) => {
    try{
        const tweet = await Tweet.find().sort({ timestamp: -1 }).populate("author");
        return res.status(200).send(tweet);
    } catch (error) {
        return res.status(400).send({ error: error.message });
    };
});

app.post("/api/retweet/:tweetid", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).send({ error: "userId is required" });

        const tweet = await Tweet.findById(req.params.tweetid);
        if (!tweet) return res.status(404).send({ error: "Tweet not found" });
        const userObjectId = new ObjectId(userId);
        const alreadyRetweeted = (tweet.retweetedBy || []).some((id) => id.toString() === userId);
        const updated = await Tweet.findByIdAndUpdate(
            req.params.tweetid,
            alreadyRetweeted
                ? { $pull: { retweetedBy: userObjectId }, $inc: { retweets: -1 } }
                : { $addToSet: { retweetedBy: userObjectId }, $inc: { retweets: 1 } },
            { new: true }
        ).populate("author");

        return res.status(200).send(updated);
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
});

app.post("/api/like/:tweetid", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) return res.status(400).send({ error: "userId is required" });

        const tweet = await Tweet.findById(req.params.tweetid);
        if (!tweet) return res.status(404).send({ error: "Tweet not found" });
        const userObjectId = new ObjectId(userId);
        const alreadyLiked = (tweet.likedBy || []).some(
            (id) => id.toString() === userId
        );
        const updated = await Tweet.findByIdAndUpdate(
            req.params.tweetid,
            alreadyLiked
                ? { $pull: { likedBy: userObjectId }, $inc: { likes: -1 } }
                : { $addToSet: { likedBy: userObjectId }, $inc: { likes: 1 } },
            { new: true }
        ).populate("author");
        return res.status(200).send(updated);
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
});

app.delete("/api/tweet/:tweetid", async (req, res) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).send({ error: "userId is required" });
        }

        const tweet = await Tweet.findById(req.params.tweetid);
        if (!tweet) {
            return res.status(404).send({ error: "Tweet not found" });
        }

        if (tweet.author.toString() !== userId) {
            return res.status(403).send({ error: "You can only delete your own posts" });
        }

        await Tweet.findByIdAndDelete(req.params.tweetid);
        return res.status(200).send({ deletedId: req.params.tweetid });
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
});