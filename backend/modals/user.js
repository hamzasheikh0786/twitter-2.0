import mongoose from "mongoose";

const LoginHistorySchema = new mongoose.Schema({
    browser: { type: String, required: true },
    os: { type: String, required: true },
    deviceType: { type: String, enum: ['desktop', 'laptop', 'mobile'], required: true },
    ipAddress: { type: String, required: true },
    loginTime: { type: Date, default: Date.now },
    authMethod: { type: String, enum: ['password', 'google', 'otp', 'microsoft'], required: true },
    success: { type: Boolean, default: true },
    blockedReason: { type: String, default: null },
});

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    displayName: { type: String, required: true },
    avatar: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, default: "" },
    bio: { type: String, default: "" },
    location: { type: String, default: "" },
    website: { type: String, default: "" },
    joinedDate: { type: Date, default: Date.now },
    subscriptionPlan: { 
        type: String, 
        enum: ['free', 'bronze', 'silver', 'gold'], 
        default: 'free' 
    },
    tweetCount: { type: Number, default: 0 },
    subscriptionExpiry: { type: Date, default: null },
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    lastTweetReset: { type: Date, default: Date.now },
    passwordResetToken: { type: String, default: null },
    passwordResetExpiry: { type: Date, default: null },
    lastPasswordReset: { type: Date, default: null },
    loginHistory: [LoginHistorySchema],
    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    pendingLogin: {
        browser: String,
        os: String,
        deviceType: String,
        ipAddress: String,
        timestamp: Date,
    },
    audioTweetOtp: { type: String, default: null },
    audioTweetOtpExpiry: { type: Date, default: null },
    audioTweetOtpAttempts: { type: Number, default: 0 },
    language: { type: String, default: "en" },
    languageChangeOtp: { type: String, default: null },
    languageChangeOtpExpiry: { type: Date, default: null },
    languageChangeOtpAttempts: { type: Number, default: 0 },
    pendingLanguage: { type: String, default: null },
});

export default mongoose.model("User", UserSchema);