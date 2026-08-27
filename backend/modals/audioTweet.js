import mongoose from "mongoose";

const AudioTweetSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    audioUrl: { type: String, required: true },
    audioDuration: { type: Number, required: true }, // in seconds
    audioSize: { type: Number, required: true }, // in bytes
    audioFormat: { type: String, required: true }, // mp3, wav, etc.
    content: { type: String, default: "" }, // optional text content
    likes: { type: Number, default: 0 },
    retweets: { type: Number, default: 0 },
    replies: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    retweetedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    timestamp: { type: Date, default: Date.now },
    isAudioTweet: { type: Boolean, default: true },
});

export default mongoose.model("AudioTweet", AudioTweetSchema);