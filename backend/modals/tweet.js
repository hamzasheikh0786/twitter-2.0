import mongoose from "mongoose";
const TweetSchema = new mongoose.Schema({
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    likes: { type: Number, default: 0 } ,
    retweets: { type: Number, default: 0 },
    comments: { type:Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    retweetedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    image: { type: String, default: null },
    audioUrl: { type: String, default: null },
    audioDuration: { type: Number, default: null },
    audioSize: { type: Number, default: null },
    audioFormat: { type: String, default: null },
    isAudioTweet: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Tweet", TweetSchema);