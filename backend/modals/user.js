import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true },
    displayName: { type: String, required: true },
    avatar: { type: String, required: true },
    email: { type: String, required: true, unique: true },
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
});

export default mongoose.model("User", UserSchema);