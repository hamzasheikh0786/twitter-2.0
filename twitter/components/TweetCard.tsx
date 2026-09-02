"use client";

import React, { useState } from "react";
import axiosInstance from "@/Lib/axiosInstance";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  Heart,
  MessageCircle,
  Repeat2,
  Share,
  MoreHorizontal,
  Mic,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useAuth } from "@/components/context/AuthContext";

interface Tweet {
  _id: string;
  author: {
    _id: string;
    displayName: string;
    username: string;
    avatar: string;
    verified?: boolean;
  };
  content: string;
  timestamp: string;
  likes: number;
  retweets: number;
  replies: number;
  comments: number;
  likedBy: string[];
  retweetedBy: string[];
  image?: string;
  audioUrl?: string;
  audioDuration?: number;
  audioFormat?: string;
  isAudioTweet?: boolean;
}

interface TweetCardProps {
  tweet: Tweet;
  onTweetDeleted?: (id: string) => void;
}

export default function TweetCard({ tweet, onTweetDeleted }: TweetCardProps) {
  const { user } = useAuth();
  const [tweetState, setTweetState] = useState<Tweet>(tweet);

  const likeTweet = async (tweetId: string) => {
    try {
      const res = await axiosInstance.post(`/api/like/${tweetId}`, {
        userId: user?._id,
      });
      setTweetState(res.data);
    } catch {
    }
  };

  const retweetTweet = async (tweetId: string) => {
    try {
      const res = await axiosInstance.post(`/api/retweet/${tweetId}`, {
        userId: user?._id,
      });
      setTweetState(res.data);
    } catch {
    }
  };

  const deleteTweet = async (tweetId: string) => {
    try {
      await axiosInstance.delete(`/api/tweet/${tweetId}`, {
        data: { userId: user?._id },
      });
      onTweetDeleted?.(tweetId);
    } catch {
    }
  };

  const formatNumber = (num: number) => {
    if (!num) return "0";
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };
  const isLiked = tweetState.likedBy?.some((id: string) => id === user?._id);
  const isRetweet = tweetState.retweetedBy?.some((id: string) => id === user?._id);
  const isOwner = tweetState.author?._id === user?._id;
  return (
    <Card className="bg-black border-gray-800 border-x-0 border-t-0 rounded-none hover:bg-gray-950/50 transition-colors cursor-pointer">
      <CardContent className="p-4">
        <div className="flex space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={tweetState.author.avatar}
              alt={tweetState.author.displayName}
            />
            <AvatarFallback>{tweetState.author.displayName}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <span className="font-bold text-white">
                {tweetState.author.displayName}
              </span>
              {tweetState.author.verified && (
                <div className="bg-blue-500 rounded-full p-0.5">
                  <svg
                    className="h-4 w-4 text-white fill-current"
                    viewBox="0 0 20 20"
                  >
                    <path d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                  </svg>
                </div>
              )}
              <span className="text-gray-500">
                @{tweetState.author.username}
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-gray-500">
                {tweetState.timestamp &&
                  new Date(tweetState.timestamp).toLocaleDateString("en-us", {
                    month: "long",
                    year: "numeric",
                  })}
              </span>
              {isOwner && (
                <div className="ml-auto">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1 rounded-full hover:bg-red-900/20 text-gray-500 hover:text-red-400 mr-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTweet(tweetState._id);
                    }}
                  >
                    Delete
                  </Button>
                  <Button
                  variant="ghost"
                  size="sm"
                  className="p-1 rounded-full hover:bg-gray-900">
                  <MoreHorizontal className="h-5 w-5 text-gray-500" />
                </Button>
              </div>
              )}</div>

            <div className="text-white mb-3 leading-relaxed pr-4">
              {tweetState.content}
            </div>

            {tweetState.image && (
              <div className="mb-3 rounded-2xl overflow-hidden">
                <img
                  src={tweetState.image}
                  alt="Tweet image"
                  className="w-full h-auto max-h-96 object-cover"
                />
              </div>
            )}

            {tweetState.isAudioTweet && tweetState.audioUrl && (
              <div className="mb-3 rounded-2xl overflow-hidden bg-gray-800 p-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mic className="h-6 w-6 text-purple-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-white">Audio Tweet</span>
                      {tweetState.audioDuration && (
                        <span className="text-xs text-gray-500">
                          {Math.floor(tweetState.audioDuration / 60)}:{String(tweetState.audioDuration % 60).padStart(2, '0')}
                        </span>
                      )}
                    </div>
                    <audio
                      src={tweetState.audioUrl}
                      controls
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between w-full">
              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 p-2 rounded-full hover:bg-blue-900/20 text-gray-500 hover:text-blue-400 group"
              >
                <MessageCircle className="h-5 w-5 group-hover:text-blue-400" />
                <span className="text-sm">
                  {formatNumber(tweetState.comments)}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center space-x-2 p-2 rounded-full hover:bg-green-900/20 group ${
                  isRetweet
                    ? "text-green-400"
                    : "text-gray-500 hover:text-green-400"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  retweetTweet(tweetState._id);
                }}
              >
                <Repeat2
                  className={`h-5 w-5 ${
                    isRetweet
                      ? "text-green-400"
                      : "group-hover:text-green-400"
                  }`}
                />
                <span className="text-sm">
                  {formatNumber(tweetState.retweets)}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`flex items-center space-x-2 p-2 rounded-full hover:bg-red-900/20 group ${
                  isLiked ? "text-red-500" : "text-gray-500 hover:text-red-400"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  likeTweet(tweetState._id);
                }}
              >
                <Heart
                  className={`h-5 w-5 ${
                    isLiked
                      ? "text-red-500 fill-current"
                      : "group-hover:text-red-400"
                  }`}
                />
                <span className="text-sm">
                  {formatNumber(tweetState.likes)}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="flex items-center space-x-2 p-2 rounded-full hover:bg-blue-900/20 text-gray-500 hover:text-blue-400 group"
              >
                <Share className="h-5 w-5 group-hover:text-blue-400" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}