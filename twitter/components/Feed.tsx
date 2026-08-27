import React, { useEffect, useState, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent } from "./ui/card";
import LoadingSpinner from "./loading-spinner";
import axiosInstance from "@/Lib/axiosInstance";
import TweetComposer from "./TweetComposer";
import TweetCard from "./TweetCard";
import { useTweetNotifications } from "@/components/hooks/useTweetNotifications";

interface Tweet {
  _id: string;
  author: {
    _id: string;
    displayName: string;
    username: string;
    avatar: string;
  };
  content: string;
  image?: string;
  likes: number;
  retweets: number;
  replies: number;
  comments: number;
  likedBy: string[];
  retweetedBy: string[];
  timestamp: string;
}

const Feed = () => {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);

  useTweetNotifications(tweets);

  const fetchTweets = useCallback(async () => {
    try {
      setLoading(true);
      const res = await axiosInstance.get("/post");
      setTweets(res.data);
    } catch {
      // Failed to fetch tweets
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTweets();
  }, [fetchTweets]);

  const handleNewTweet = (newTweet: Tweet) => {
    setTweets((prev) => [newTweet, ...prev]);
  };

  const handleTweetDeleted = (id: string) => {
    setTweets((prev) => prev.filter((t) => t._id !== id));
  };

  return (
    <div className="min-h-screen">
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="px-4 py-3">
          <h1 className="text-xl font-bold text-white">Home</h1>
        </div>

        <Tabs defaultValue="foryou" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-transparent border-b border-gray-800 rounded-none h-auto">
            <TabsTrigger
              value="foryou"
              className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-1 data-[state=active]:border-blue-100 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
            >
              For you
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-1 data-[state=active]:border-blue-100 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
            >
              Following
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <TweetComposer onTweetPosted={handleNewTweet} />
      <div className="divide-y divide-gray-800">
        {loading ? (
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400 mb-4">
                <LoadingSpinner size="lg" className="mx-auto mb-4" />
                <p>Loading tweets...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          tweets.map((tweet) => (
            <TweetCard key={tweet._id} tweet={tweet} onTweetDeleted={handleTweetDeleted} />
          ))
        )}
      </div>
    </div>
  );
};

export default Feed;