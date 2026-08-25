"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Link as LinkIcon,
  MoreHorizontal,
  Camera,
  Shield,
  Clock,
  Globe,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/components/context/AuthContext";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import TweetCard from "./TweetCard";
import { Card, CardContent } from "./ui/card";
import Editprofile from "./Editprofile";
import axiosInstance from "../Lib/axiosInstance";

interface Tweet {
  _id: string;
  author: {
    _id: string;
    username: string;
    displayName: string;
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
}

interface LoginHistoryEntry {
  _id?: string;
  browser: string;
  os: string;
  deviceType: 'desktop' | 'laptop' | 'mobile';
  ipAddress: string;
  loginTime: string;
  authMethod: 'password' | 'google' | 'otp' | 'microsoft';
  success: boolean;
  blockedReason?: string | null;
}

export default function ProfilePage() {
  const { user, fetchLoginHistory } = useAuth();
  const [activeTab, setActiveTab] = useState("posts");
  const [showEditModal, setShowEditModal] = useState(false);
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchTweets = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await axiosInstance.get("/post");
      setTweets(res.data);
    } catch {
      // Failed to fetch tweets
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadLoginHistory = useCallback(async () => {
    if (!user?.email) return;
    setHistoryLoading(true);
    try {
      const res = await axiosInstance.get("/login-history", {
        params: { email: user.email },
      });
      if (res.data?.loginHistory) {
        setLoginHistory(res.data.loginHistory);
      }
    } catch {
      // Failed to fetch login history
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTweets();
  }, [fetchTweets]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadLoginHistory();
  }, [loadLoginHistory]);

  const userTweets = tweets.filter((tweet) => tweet.author._id === user?._id);

  const handleTweetDeleted = (id: string) => {
    setTweets((prev) => prev.filter((t) => t._id !== id));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen">
      
      <div className="sticky top-0 bg-black/90 backdrop-blur-md border-b border-gray-800 z-10">
        <div className="flex items-center px-4 py-3 space-x-8">
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-full hover:bg-gray-900"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">{user.displayName}</h1>
            <p className="text-sm text-gray-400">{userTweets.length} posts</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600 relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 p-2 rounded-full bg-black/50 hover:bg-black/70"
          >
            <Camera className="h-5 w-5 text-white" />
          </Button>
        </div>

        <div className="absolute -bottom-16 left-4">
          <div className="relative">
            <Avatar className="h-32 w-32 border-4 border-black">
              <AvatarImage src={user.avatar} alt={user.displayName} />
              <AvatarFallback className="text-2xl">
                {user.displayName[0]}
              </AvatarFallback>
            </Avatar>
            <Button
              variant="ghost"
              size="sm"
              className="absolute bottom-2 right-2 p-2 rounded-full bg-black/70 hover:bg-black/90"
            >
              <Camera className="h-4 w-4 text-white" />
            </Button>
          </div>
        </div>

        <div className="flex justify-end p-4">
          <Button
            variant="outline"
            className="border-gray-600 text-white bg-gray-950 font-semibold rounded-full px-6"
            onClick={() => setShowEditModal(true)}
          >
            Edit profile
          </Button>
        </div>
      </div>

      <div className="px-4 pb-4 mt-12">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-white">
              {user.displayName}
            </h1>
            <p className="text-gray-400">@{user.username}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 rounded-full hover:bg-gray-900"
          >
            <MoreHorizontal className="h-5 w-5 text-gray-400" />
          </Button>
        </div>

        {user.bio && (
          <p className="text-white mb-3 leading-relaxed">{user.bio}</p>
        )}

        <div className="flex items-center space-x-4 text-gray-400 text-sm mb-3">
          <div className="flex items-center space-x-1">
            <MapPin className="h-4 w-4" />
            <span>{user.location ? user.location : "Earth"}</span>
          </div>
          <div className="flex items-center space-x-1">
            <LinkIcon className="h-4 w-4" />
            <span className="text-blue-400">
              {user.website ? user.website : "example.com"}
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <Calendar className="h-4 w-4" />
            <span>
              Joined{" "}
              {user.joinedDate &&
                new Date(user.joinedDate).toLocaleDateString("en-us", {
                  month: "long",
                  year: "numeric",
                })}
            </span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-transparent border-b border-gray-800 rounded-none h-auto">
          <TabsTrigger
            value="posts"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            Posts
          </TabsTrigger>
          <TabsTrigger
            value="replies"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            Replies
          </TabsTrigger>
          <TabsTrigger
            value="highlights"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            Highlights
          </TabsTrigger>
          <TabsTrigger
            value="articles"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            Articles
          </TabsTrigger>
          <TabsTrigger
            value="media"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            Media
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:rounded-none text-gray-400 hover:bg-gray-900/50 py-4 font-semibold"
          >
            <Shield className="h-4 w-4 inline mr-1" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="media" className="mt-0">
          <Card className="bg-black border-none">
            <CardContent className="py-12 text-center">
              <div className="text-gray-400">
                <h3 className="text-2xl font-bold mb-2">
                  Lights, camera &hellip; attachments!
                </h3>
                <p>When you post photos or videos, they will show up here.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-0">
          <div className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Shield className="h-6 w-6 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Login History</h3>
                    <p className="text-gray-400 text-sm">Track all login activity on your account</p>
                  </div>
                </div>

                {historyLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="text-gray-400">Loading login history...</div>
                  </div>
                ) : loginHistory.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <Shield className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-lg">No login history found</p>
                    <p className="text-sm mt-1">Your login activity will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {loginHistory.map((entry, index) => (
                      <div
                        key={`${entry._id || index}-${entry.loginTime}`}
                        className="flex items-center space-x-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-700/50 transition-colors"
                      >
                        <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center">
                          {entry.authMethod === 'otp' && <CheckCircle className="h-6 w-6 text-green-400" />}
                          {entry.authMethod === 'microsoft' && <Globe className="h-6 w-6 text-blue-400" />}
                          {entry.authMethod === 'password' && <Clock className="h-6 w-6 text-gray-400" />}
                          {entry.authMethod === 'google' && <CheckCircle className="h-6 w-6 text-yellow-400" />}
                          {!entry.success && <AlertTriangle className="h-6 w-6 text-red-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-white capitalize">{entry.authMethod}</span>
                            {!entry.success && (
                              <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">Failed</span>
                            )}
                          </div>
                          <div className="flex items-center space-x-3 text-sm text-gray-400 mt-1 flex-wrap">
                            <span className="flex items-center space-x-1">
                              <Globe className="h-3.5 w-3.5" />
                              <span>{entry.browser}</span>
                            </span>
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{entry.os}</span>
                            </span>
                            <span className="flex items-center space-x-1 capitalize">
                              <span className="flex items-center space-x-1">
                                <Clock className="h-3.5 w-3.5" />
                                <span>{entry.deviceType}</span>
                              </span>
                            </span>
                            <span className="font-mono">{entry.ipAddress}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(entry.loginTime).toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                        {!entry.success && entry.blockedReason && (
                          <div className="text-red-400 text-sm px-3 py-1 bg-red-500/10 rounded">
                            {entry.blockedReason}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-blue-400" />
                  <span>Security Settings</span>
                </h3>
                <div className="space-y-4 text-sm text-gray-400">
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="font-medium text-white mb-2">Two-Factor Authentication</p>
                    <p>Enabled for Chrome browser logins via email OTP</p>
                  </div>
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="font-medium text-white mb-2">Microsoft Browser Access</p>
                    <p>Direct login allowed for Microsoft Edge and Internet Explorer</p>
                  </div>
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="font-medium text-white mb-2">Mobile Login Restrictions</p>
                    <p>Mobile access restricted to 10:00 AM - 1:00 PM daily</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
      <Editprofile
        isopen={showEditModal}
        onclose={() => setShowEditModal(false)}
      />
    </div>
  );
}