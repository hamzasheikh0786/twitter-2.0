import express from "express"
import cors from "cors"
import mongoose from "mongoose"
import dotenv from "dotenv"
import dns from "dns"
import Stripe from "stripe"
import { initializeApp, getApps, cert, applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import User from "./modals/user.js"
import Tweet from "./modals/tweet.js"
import AudioTweet from "./modals/audioTweet.js"
import { SUBSCRIPTION_PLANS, PLAN_LIMITS, getPlanLimit, canUserTweet, getPaymentWindowStatus } from "./config/subscriptionPlans.js"
import { sendInvoiceEmail, sendPaymentConfirmationEmail, sendPasswordResetEmail, sendOTPEmail, sendAudioTweetOTPEmail } from "./services/emailService.js"
import { parseUserAgent, getClientIp, isMicrosoftBrowser, isChromeBrowser, isMobileDevice, isWithinMobileLoginWindow, generateOTP, getTimeWindowStatus, isWithinAudioTweetWindow, getAudioTweetWindowStatus } from "./utils/deviceDetector.js"
import crypto from "crypto";

let firebaseAuth;

if (getApps().length === 0) {
  const projectId = process.env.FIREBASE_PROJECT_ID || "twitter-1fc13";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  try {
    if (clientEmail && privateKey) {
      initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey
        }),
        projectId
      });
    } else {
      initializeApp({
        credential: applicationDefault(),
        projectId
      });
    }
    firebaseAuth = getAuth();
  } catch (error) {
    console.warn('Firebase Admin initialization failed:', error.message);
    console.warn('Password reset via Firebase will not work. Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env');
    firebaseAuth = null;
  }
} else {
  firebaseAuth = getAuth();
}

const { ObjectId } = mongoose.Types;

dns.setServers(["8.8.8.8","8.8.4.4"]);

dotenv.config()
const app=express()
app.use(cors())
app.use(express.json())

// Ensure UTF-8 charset for all responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

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

// Login endpoint with device detection and environment-based auth
app.post('/login', async (req, res) => {
    try {
        const { email, password, firebaseUid } = req.body;
        const userAgent = req.headers['user-agent'] || '';
        const clientIp = getClientIp(req);

        // Parse device info
        const { browser, os, deviceType } = parseUserAgent(userAgent);
        const isMicrosoft = isMicrosoftBrowser(browser);
        const isChrome = isChromeBrowser(browser);
        const isMobile = isMobileDevice(deviceType);

        // Find user by email or firebaseUid
        let user;
        if (firebaseUid) {
            user = await User.findOne({ email: email.toLowerCase() });
        } else {
            user = await User.findOne({ email: email.toLowerCase() });
        }

        if (!user) {
            // Log failed attempt
            return res.status(401).send({ error: "Invalid credentials" });
        }

        // Verify password with Firebase REST API (for fallback login)
        if (password) {
            try {
                const apiKey = process.env.FIREBASE_API_KEY || "AIzaSyB5zx_b8a6s8pLmc6FOECZ0tI_KxF6FN8Q";
                const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, returnSecureToken: true })
                });
                const data = await response.json();
                if (!response.ok) {
                    return res.status(401).send({ error: data.error?.message || "Invalid credentials" });
                }
            } catch (err) {
                return res.status(401).send({ error: "Invalid credentials" });
            }
        }

        // Check mobile time window restriction
        if (isMobile && !isWithinMobileLoginWindow()) {
            const windowStatus = getTimeWindowStatus();
            
            // Log blocked attempt
            user.loginHistory.push({
                browser,
                os,
                deviceType,
                ipAddress: clientIp,
                authMethod: 'password',
                success: false,
                blockedReason: `Mobile login only allowed between ${windowStatus.windowStart} - ${windowStatus.windowEnd}`
            });
            await user.save();

            return res.status(403).send({ 
                error: `Mobile login only allowed between ${windowStatus.windowStart} - ${windowStatus.windowEnd}`,
                blocked: true,
                windowStatus,
                reason: 'mobile_time_restriction'
            });
        }

        // Microsoft browsers - allow direct login
        if (isMicrosoft) {
            // Log successful login
            user.loginHistory.push({
                browser,
                os,
                deviceType,
                ipAddress: clientIp,
                authMethod: 'microsoft',
                success: true
            });
            await user.save();

            return res.status(200).send({
                user,
                authType: 'direct',
                message: 'Login successful (Microsoft browser)'
            });
        }

        // Chrome browsers - require OTP
        if (isChrome) {
            // Generate OTP
            const otp = generateOTP(6);
            const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            user.otp = otp;
            user.otpExpiry = otpExpiry;
            user.otpAttempts = 0;
            user.pendingLogin = { browser, os, deviceType, ipAddress: clientIp, timestamp: new Date() };
            await user.save();

            // Send OTP email
            try {
                await sendOTPEmail(user, otp, { browser, os, deviceType, ipAddress: clientIp });
            } catch (emailError) {
                console.error('Failed to send OTP email:', emailError);
                return res.status(500).send({ error: 'Failed to send verification code' });
            }

            return res.status(200).send({
                requireOTP: true,
                message: 'OTP sent to your email. Please verify to complete login.',
                email: user.email
            });
        }

        // Other browsers - direct login
        user.loginHistory.push({
            browser,
            os,
            deviceType,
            ipAddress: clientIp,
            authMethod: 'password',
            success: true
        });
        await user.save();

        return res.status(200).send({
            user,
            authType: 'direct',
            message: 'Login successful'
        });

    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).send({ error: "Login failed" });
    }
});

// OTP Verification endpoint
app.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).send({ error: "Email and OTP are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        // Check if OTP exists and is valid
        if (!user.otp || !user.otpExpiry) {
            return res.status(400).send({ error: "No pending OTP verification" });
        }

        if (user.otpExpiry < new Date()) {
            user.otp = null;
            user.otpExpiry = null;
            user.otpAttempts = 0;
            user.pendingLogin = null;
            await user.save();
            return res.status(400).send({ error: "OTP expired. Please try logging in again." });
        }

        if (user.otp !== otp) {
            user.otpAttempts += 1;
            await user.save();
            
            if (user.otpAttempts >= 3) {
                user.otp = null;
                user.otpExpiry = null;
                user.otpAttempts = 0;
                user.pendingLogin = null;
                await user.save();
                return res.status(400).send({ error: "Too many failed attempts. Please try logging in again." });
            }
            
            return res.status(400).send({ error: "Invalid OTP", attemptsLeft: 3 - user.otpAttempts });
        }

        // OTP valid - clear OTP fields and log successful login
        const { browser, os, deviceType, ipAddress } = user.pendingLogin || { browser: 'Unknown', os: 'Unknown', deviceType: 'desktop', ipAddress: 'Unknown' };
        
        user.otp = null;
        user.otpExpiry = null;
        user.otpAttempts = 0;
        user.pendingLogin = null;

        user.loginHistory.push({
            browser,
            os,
            deviceType,
            ipAddress,
            authMethod: 'otp',
            success: true
        });
        await user.save();

        return res.status(200).send({
            user,
            authType: 'otp',
            message: 'Login successful with OTP verification'
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        return res.status(500).send({ error: "OTP verification failed" });
    }
});

// Get login history for user
app.get('/login-history', async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) {
            return res.status(400).send({ error: "Email is required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        // Return login history sorted by most recent first
        const history = [...user.loginHistory].sort((a, b) => new Date(b.loginTime) - new Date(a.loginTime));
        return res.status(200).send({ loginHistory: history });
    } catch (error) {
        console.error('Login history error:', error);
        return res.status(500).send({ error: "Failed to fetch login history" });
    }
});

// Mobile login window status
app.get('/mobile-login-window', (req, res) => {
    return res.status(200).send(getTimeWindowStatus());
});

// Forgot Password - Request password reset
app.post('/forgot-password', async (req, res) => {
    try {
        const { email, phone } = req.body;
        console.log('🔐 Forgot password request:', { email, phone });
        
        if (!email && !phone) {
            return res.status(400).send({ error: "Email or phone number is required" });
        }

        let user;
        if (email) {
            user = await User.findOne({ email: email.toLowerCase() });
        } else if (phone) {
            user = await User.findOne({ phone: phone });
        }

        if (!user) {
            console.log('👤 User not found for:', email || phone);
            // Don't reveal if user exists or not for security
            return res.status(200).send({ message: "If the account exists, a password reset link has been sent" });
        }

        console.log('👤 User found:', { id: user._id, email: user.email, displayName: user.displayName });

        // Check if user already requested a reset today
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        if (user.lastPasswordReset && user.lastPasswordReset >= startOfDay && user.lastPasswordReset < endOfDay) {
            console.log('⏰ Rate limited - user already requested reset today');
            return res.status(429).send({ error: "You can use this option only one time per day." });
        }

        // Generate reset token (64 chars hex)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        user.passwordResetToken = resetToken;
        user.passwordResetExpiry = resetTokenExpiry;
        await user.save();

        console.log('🔑 Reset token generated:', resetToken.substring(0, 8) + '...');

        // Send reset email
        console.log('📧 Sending reset email to:', user.email);
        await sendPasswordResetEmail(user, resetToken);

        return res.status(200).send({ message: "If the account exists, a password reset link has been sent" });
    } catch (error) {
        console.error('Forgot password error:', error);
        return res.status(500).send({ error: "Failed to process password reset request" });
    }
});

// Reset Password - Validate token and set new password
app.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) {
            return res.status(400).send({ error: "Token and password are required" });
        }

        const user = await User.findOne({
            passwordResetToken: token,
            passwordResetExpiry: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).send({ error: "Invalid or expired reset token" });
        }

        try {
            // Try Firebase Admin first
            if (firebaseAuth) {
                const firebaseUser = await firebaseAuth.getUserByEmail(user.email);
                await firebaseAuth.updateUser(firebaseUser.uid, { password });
            } else {
                // Fallback to Firebase REST API
                const apiKey = process.env.FIREBASE_API_KEY || "AIzaSyB5zx_b8a6s8pLmc6FOECZ0tI_KxF6FN8Q";
                // First sign in to get idToken, then update password
                const signInResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: user.email, password, returnSecureToken: true })
                });
                const signInData = await signInResponse.json();
                if (!signInResponse.ok) {
                    throw new Error(signInData.error?.message || 'Failed to verify password');
                }
                // Update password using the idToken
                const updateResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ idToken: signInData.idToken, password, returnSecureToken: true })
                });
                const updateData = await updateResponse.json();
                if (!updateResponse.ok) {
                    throw new Error(updateData.error?.message || 'Failed to update password');
                }
            }
        } catch (firebaseError) {
            console.error('Firebase password update error:', firebaseError);
            return res.status(500).send({ error: "Failed to update password in authentication system" });
        }

        user.passwordResetToken = null;
        user.passwordResetExpiry = null;
        user.lastPasswordReset = new Date();
        await user.save();

        return res.status(200).send({ message: "Password has been reset successfully" });
    } catch (error) {
        console.error('Reset password error:', error);
        return res.status(500).send({ error: "Failed to reset password" });
    }
});

// Get subscription plans
app.get('/subscription/plans', (req, res) => {
    const plans = Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => ({
        id: key,
        ...plan,
        tweetLimit: plan.tweetLimit === -1 ? 'Unlimited' : plan.tweetLimit,
    }));
    res.status(200).send({ plans /*, paymentWindow: getPaymentWindowStatus() */ });
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

// Create Stripe checkout session (payment window check commented out)
app.post('/subscription/create-checkout',  checkPaymentWindow,  async (req, res) => {
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

// Get payment window status (COMMENTED OUT)
app.get('/subscription/payment-window', (req, res) => {
    res.status(200).send(getPaymentWindowStatus());
});

// Activate subscription after Razorpay payment is verified
app.post('/api/subscription/activate', async (req, res) => {
    try {
        const { email, plan } = req.body;
        if (!email || !plan) {
            return res.status(400).send({ error: "Email and plan are required" });
        }
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }
        user.subscriptionPlan = plan;
        user.subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        user.tweetCount = 0;
        user.lastTweetReset = new Date();
        await user.save();
        return res.status(200).send({ message: "Subscription activated", plan });
    } catch (error) {
        console.error('Subscription activate error:', error);
        return res.status(500).send({ error: "Failed to activate subscription" });
    }
});

// Send invoice email after Razorpay payment
app.post('/api/subscription/send-invoice', async (req, res) => {
    try {
        const { email, plan, razorpayOrderId, razorpayPaymentId, amount } = req.body;
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }
        await sendPaymentConfirmationEmail(user, plan, razorpayPaymentId);
        return res.status(200).send({ message: "Invoice sent" });
    } catch (error) {
        console.error('Send invoice error:', error);
        return res.status(500).send({ error: "Failed to send invoice" });
    }
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

// Audio Tweet - Check time window
app.get('/audio-tweet/window', (req, res) => {
    res.status(200).send(getAudioTweetWindowStatus());
});

// Audio Tweet - Request OTP for audio upload
app.post('/audio-tweet/request-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).send({ error: "Email is required" });
        }

        // Check audio tweet time window
        if (!isWithinAudioTweetWindow()) {
            const windowStatus = getAudioTweetWindowStatus();
            return res.status(403).send({ 
                error: `Audio tweets only allowed between ${windowStatus.windowStart} - ${windowStatus.windowEnd} IST`,
                windowStatus,
                blocked: true
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(200).send({ message: "If the account exists, an OTP has been sent" });
        }

        // Generate OTP
        const otp = generateOTP(6);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.audioTweetOtp = otp;
        user.audioTweetOtpExpiry = otpExpiry;
        user.audioTweetOtpAttempts = 0;
        await user.save();

        // Send OTP email
        try {
            await sendAudioTweetOTPEmail(user, otp);
        } catch (emailError) {
            console.error('Failed to send audio tweet OTP email:', emailError);
            return res.status(500).send({ error: 'Failed to send verification code' });
        }

        return res.status(200).send({ 
            message: "OTP sent to your email. Please verify to upload audio tweet.",
            email: user.email
        });
    } catch (error) {
        console.error('Audio tweet OTP request error:', error);
        return res.status(500).send({ error: "Failed to process OTP request" });
    }
});

// Audio Tweet - Verify OTP and upload audio
app.post('/audio-tweet/upload', async (req, res) => {
    try {
        const { email, otp, audioUrl, audioDuration, audioSize, audioFormat, content } = req.body;
        
        if (!email || !otp || !audioUrl) {
            return res.status(400).send({ error: "Email, OTP, and audio URL are required" });
        }

        // Check audio tweet time window
        if (!isWithinAudioTweetWindow()) {
            const windowStatus = getAudioTweetWindowStatus();
            return res.status(403).send({ 
                error: `Audio tweets only allowed between ${windowStatus.windowStart} - ${windowStatus.windowEnd} IST`,
                windowStatus,
                blocked: true
            });
        }

        // Validate audio constraints
        const maxDuration = 5 * 60; // 5 minutes in seconds
        const maxSize = 100 * 1024 * 1024; // 100 MB in bytes
        
        if (audioDuration > maxDuration) {
            return res.status(400).send({ 
                error: `Audio duration exceeds 5 minutes limit. Current: ${Math.round(audioDuration / 60)} minutes` 
            });
        }
        
        if (audioSize > maxSize) {
            return res.status(400).send({ 
                error: `Audio file size exceeds 100 MB limit. Current: ${Math.round(audioSize / (1024 * 1024))} MB` 
            });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        // Verify OTP
        if (!user.audioTweetOtp || !user.audioTweetOtpExpiry) {
            return res.status(400).send({ error: "No pending OTP verification" });
        }

        if (user.audioTweetOtpExpiry < new Date()) {
            user.audioTweetOtp = null;
            user.audioTweetOtpExpiry = null;
            user.audioTweetOtpAttempts = 0;
            await user.save();
            return res.status(400).send({ error: "OTP expired. Please request a new one." });
        }

        if (user.audioTweetOtp !== otp) {
            user.audioTweetOtpAttempts += 1;
            await user.save();
            
            if (user.audioTweetOtpAttempts >= 3) {
                user.audioTweetOtp = null;
                user.audioTweetOtpExpiry = null;
                user.audioTweetOtpAttempts = 0;
                await user.save();
                return res.status(400).send({ error: "Too many failed attempts. Please request a new OTP." });
            }
            
            return res.status(400).send({ error: "Invalid OTP", attemptsLeft: 3 - user.audioTweetOtpAttempts });
        }

        // OTP valid - clear OTP fields
        user.audioTweetOtp = null;
        user.audioTweetOtpExpiry = null;
        user.audioTweetOtpAttempts = 0;
        await user.save();

        // Create audio tweet
        const audioTweet = new AudioTweet({
            author: user._id,
            audioUrl,
            audioDuration,
            audioSize,
            audioFormat,
            content: content || ""
        });

        await audioTweet.save();
        
        const populated = await audioTweet.populate("author");
        
        // Log the audio tweet in user's login history (as audio tweet activity)
        user.loginHistory.push({
            browser: 'Audio Tweet',
            os: 'Upload',
            deviceType: 'desktop',
            ipAddress: 'Audio Upload',
            authMethod: 'audio_tweet',
            success: true
        });
        await user.save();

        return res.status(201).send(populated);
    } catch (error) {
        console.error('Audio tweet upload error:', error);
        return res.status(500).send({ error: "Failed to upload audio tweet" });
    }
});

// Audio Tweet - Verify OTP
app.post('/audio-tweet/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).send({ error: "Email and OTP are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        // Check if OTP exists and is valid
        if (!user.audioTweetOtp || !user.audioTweetOtpExpiry) {
            return res.status(400).send({ error: "No pending OTP verification" });
        }

        if (user.audioTweetOtpExpiry < new Date()) {
            user.audioTweetOtp = null;
            user.audioTweetOtpExpiry = null;
            user.audioTweetOtpAttempts = 0;
            await user.save();
            return res.status(400).send({ error: "OTP expired. Please request a new one." });
        }

        if (user.audioTweetOtp !== otp) {
            user.audioTweetOtpAttempts += 1;
            await user.save();
            
            if (user.audioTweetOtpAttempts >= 3) {
                user.audioTweetOtp = null;
                user.audioTweetOtpExpiry = null;
                user.audioTweetOtpAttempts = 0;
                await user.save();
                return res.status(400).send({ error: "Too many failed attempts. Please request a new OTP." });
            }
            
            return res.status(400).send({ error: "Invalid OTP", attemptsLeft: 3 - user.audioTweetOtpAttempts });
        }

        // OTP valid - clear OTP fields
        user.audioTweetOtp = null;
        user.audioTweetOtpExpiry = null;
        user.audioTweetOtpAttempts = 0;
        await user.save();

        return res.status(200).send({ 
            message: "OTP verified successfully",
            user: { email: user.email }
        });
    } catch (error) {
        console.error('Audio tweet OTP verification error:', error);
        return res.status(500).send({ error: "OTP verification failed" });
    }
});

app.get('/post', async (req, res) => {
    try{
        const tweet = await Tweet.find().sort({ timestamp: -1 }).populate("author");
        return res.status(200).send(tweet);
    } catch (error) {
        return res.status(400).send({ error: error.message });
    };
});

// Get audio tweets
app.get('/audio-tweets', async (req, res) => {
    try {
        const audioTweets = await AudioTweet.find().sort({ timestamp: -1 }).populate("author");
        return res.status(200).send(audioTweets);
    } catch (error) {
        return res.status(400).send({ error: error.message });
    }
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

// Language change OTP - Send OTP for email (French)
app.post('/auth/send-language-otp-email', async (req, res) => {
    try {
        const { email, language } = req.body;
        if (!email || !language) {
            return res.status(400).send({ error: "Email and language are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(200).send({ message: "If the account exists, an OTP has been sent" });
        }

        // Generate OTP
        const otp = generateOTP(6);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.languageChangeOtp = otp;
        user.languageChangeOtpExpiry = otpExpiry;
        user.languageChangeOtpAttempts = 0;
        user.pendingLanguage = language;
        await user.save();

        // Send OTP email
        try {
            await sendOTPEmail(user, otp, { 
                browser: 'Language Change', 
                os: 'Settings', 
                deviceType: 'desktop', 
                ipAddress: 'Language Settings' 
            });
        } catch (emailError) {
            console.error('Failed to send language OTP email:', emailError);
            return res.status(500).send({ error: 'Failed to send verification code' });
        }

        return res.status(200).send({ 
            message: "OTP sent to your email. Please verify to change language.",
            email: user.email
        });
    } catch (error) {
        console.error('Language change OTP email error:', error);
        return res.status(500).send({ error: "Failed to process OTP request" });
    }
});

// Language change OTP - Send OTP for phone (all other languages)
app.post('/auth/send-language-otp-phone', async (req, res) => {
    try {
        const { phone, language, email } = req.body;
        if ((!phone && !email) || !language) {
            return res.status(400).send({ error: "Phone/email and language are required" });
        }

        let user;
        if (email) {
            user = await User.findOne({ email: email.toLowerCase() });
        } else if (phone) {
            user = await User.findOne({ phone: phone });
        }

        if (!user) {
            return res.status(200).send({ message: "If the account exists, an OTP has been sent" });
        }

        // Generate OTP
        const otp = generateOTP(6);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        user.languageChangeOtp = otp;
        user.languageChangeOtpExpiry = otpExpiry;
        user.languageChangeOtpAttempts = 0;
        user.pendingLanguage = language;
        await user.save();

        // For phone OTP, we would typically use an SMS service
        // For now, we'll send to email as fallback
        try {
            await sendOTPEmail(user, otp, { 
                browser: 'Language Change', 
                os: 'Settings', 
                deviceType: 'desktop', 
                ipAddress: 'Language Settings' 
            });
        } catch (emailError) {
            console.error('Failed to send language OTP:', emailError);
            return res.status(500).send({ error: 'Failed to send verification code' });
        }

        return res.status(200).send({ 
            message: "OTP sent to your phone/email. Please verify to change language.",
            phone: user.phone || user.email
        });
    } catch (error) {
        console.error('Language change OTP phone error:', error);
        return res.status(500).send({ error: "Failed to process OTP request" });
    }
});

// Language change OTP - Verify OTP and apply language change
app.post('/auth/verify-language-otp-email', async (req, res) => {
    try {
        const { email, otp, language } = req.body;
        if (!email || !otp || !language) {
            return res.status(400).send({ error: "Email, OTP, and language are required" });
        }

        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        // Check if OTP exists and is valid
        if (!user.languageChangeOtp || !user.languageChangeOtpExpiry) {
            return res.status(400).send({ error: "No pending language change verification" });
        }

        if (user.languageChangeOtpExpiry < new Date()) {
            user.languageChangeOtp = null;
            user.languageChangeOtpExpiry = null;
            user.languageChangeOtpAttempts = 0;
            user.pendingLanguage = null;
            await user.save();
            return res.status(400).send({ error: "OTP expired. Please try again." });
        }

        if (user.languageChangeOtp !== otp) {
            user.languageChangeOtpAttempts += 1;
            await user.save();
            
            if (user.languageChangeOtpAttempts >= 3) {
                user.languageChangeOtp = null;
                user.languageChangeOtpExpiry = null;
                user.languageChangeOtpAttempts = 0;
                user.pendingLanguage = null;
                await user.save();
                return res.status(400).send({ error: "Too many failed attempts. Please try again." });
            }
            
            return res.status(400).send({ error: "Invalid OTP", attemptsLeft: 3 - user.languageChangeOtpAttempts });
        }

        // OTP valid - apply language change
        user.language = language;
        user.languageChangeOtp = null;
        user.languageChangeOtpExpiry = null;
        user.languageChangeOtpAttempts = 0;
        user.pendingLanguage = null;
        await user.save();

        return res.status(200).send({ 
            message: "Language changed successfully",
            user: { email: user.email, language: user.language }
        });
    } catch (error) {
        console.error('Language change OTP verification error:', error);
        return res.status(500).send({ error: "Language change verification failed" });
    }
});

// Language change OTP - Verify OTP for phone
app.post('/auth/verify-language-otp-phone', async (req, res) => {
    try {
        const { phone, otp, language, email } = req.body;
        if ((!phone && !email) || !otp || !language) {
            return res.status(400).send({ error: "Phone/email, OTP, and language are required" });
        }

        let user;
        if (email) {
            user = await User.findOne({ email: email.toLowerCase() });
        } else if (phone) {
            user = await User.findOne({ phone: phone });
        }

        if (!user) {
            return res.status(404).send({ error: "User not found" });
        }

        // Check if OTP exists and is valid
        if (!user.languageChangeOtp || !user.languageChangeOtpExpiry) {
            return res.status(400).send({ error: "No pending language change verification" });
        }

        if (user.languageChangeOtpExpiry < new Date()) {
            user.languageChangeOtp = null;
            user.languageChangeOtpExpiry = null;
            user.languageChangeOtpAttempts = 0;
            user.pendingLanguage = null;
            await user.save();
            return res.status(400).send({ error: "OTP expired. Please try again." });
        }

        if (user.languageChangeOtp !== otp) {
            user.languageChangeOtpAttempts += 1;
            await user.save();
            
            if (user.languageChangeOtpAttempts >= 3) {
                user.languageChangeOtp = null;
                user.languageChangeOtpExpiry = null;
                user.languageChangeOtpAttempts = 0;
                user.pendingLanguage = null;
                await user.save();
                return res.status(400).send({ error: "Too many failed attempts. Please try again." });
            }
            
            return res.status(400).send({ error: "Invalid OTP", attemptsLeft: 3 - user.languageChangeOtpAttempts });
        }

        // OTP valid - apply language change
        user.language = language;
        user.languageChangeOtp = null;
        user.languageChangeOtpExpiry = null;
        user.languageChangeOtpAttempts = 0;
        user.pendingLanguage = null;
        await user.save();

        return res.status(200).send({ 
            message: "Language changed successfully",
            user: { email: user.email, language: user.language }
        });
    } catch (error) {
        console.error('Language change OTP phone verification error:', error);
        return res.status(500).send({ error: "Language change verification failed" });
    }
});

// Resend language OTP
app.post('/auth/resend-language-otp', async (req, res) => {
    try {
        const { language, type, email, phone } = req.body;
        if (!language || !type) {
            return res.status(400).send({ error: "Language and type are required" });
        }

        let user;
        if (email) {
            user = await User.findOne({ email: email.toLowerCase() });
        } else if (phone) {
            user = await User.findOne({ phone: phone });
        }

        if (!user) {
            return res.status(200).send({ message: "If the account exists, an OTP has been sent" });
        }

        // Generate new OTP
        const otp = generateOTP(6);
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

        user.languageChangeOtp = otp;
        user.languageChangeOtpExpiry = otpExpiry;
        user.languageChangeOtpAttempts = 0;
        user.pendingLanguage = language;
        await user.save();

        // Send OTP
        try {
            await sendOTPEmail(user, otp, { 
                browser: 'Language Change', 
                os: 'Settings', 
                deviceType: 'desktop', 
                ipAddress: 'Language Settings' 
            });
        } catch (emailError) {
            console.error('Failed to resend language OTP:', emailError);
            return res.status(500).send({ error: 'Failed to send verification code' });
        }

        return res.status(200).send({ message: "OTP resent successfully" });
    } catch (error) {
        console.error('Resend language OTP error:', error);
        return res.status(500).send({ error: "Failed to resend OTP" });
    }
});