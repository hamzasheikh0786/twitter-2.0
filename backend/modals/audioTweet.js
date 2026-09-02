import mongoose from "mongoose";

const AudioTweetSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    audioUrl: { type: String, required: true },
    audioDuration: { type: Number, required: true },
    audioSize: { type: Number, required: true },
    audioFormat: { type: String, required: true },
    content: { type: String, default: "" },
    likes: { type: Number, default: 0 },
    retweets: { type: Number, default: 0 },
    replies: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    retweetedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    timestamp: { type: Date, default: Date.now },
    isAudioTweet: { type: Boolean, default: true },
});

export default mongoose.model("AudioTweet", AudioTweetSchema);