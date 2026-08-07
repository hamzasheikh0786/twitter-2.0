import mongoose from "mongoose";
const TweetSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    likes: { type: Number, default: 0 } ,
    retweets: { type: Number, default: 0 },
    comments: { type:Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    retweetedby: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    images: { type: String, default: null },
    timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Tweet", TweetSchema);