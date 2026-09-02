import { useAuth } from "@/components/context/AuthContext";
import { useSubscription } from "@/components/context/SubscriptionContext";
import React, { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { Image, Smile, Calendar, MapPin, BarChart3, Globe, AlertCircle, ArrowUpRight, X, Mic, MicOff } from "lucide-react";
import { Separator } from "./ui/separator";
import axios from "axios";
import axiosInstance from "@/Lib/axiosInstance";
import AudioRecorder from "./AudioRecorder";
import AudioTweetOTPModal from "./AudioTweetOTPModal";

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

interface TweetComposerProps {
  onTweetPosted: (tweet: Tweet) => void;
}

const TweetComposer = ({ onTweetPosted }: TweetComposerProps) => {
  const { user } = useAuth();
  const { canPostTweet, getRemainingTweets, subscription, fetchSubscription } = useSubscription();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageurl, setimageurl] = useState("");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [audioData, setAudioData] = useState<{ url: string; duration: number; size: number; format: string } | null>(null);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [showAudioOTP, setShowAudioOTP] = useState(false);
  const [audioOTPEmail, setAudioOTPEmail] = useState('');
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isAudioVerified, setIsAudioVerified] = useState(false);
  const [audioPostError, setAudioPostError] = useState('');
  const maxLength = 200;
  const remainingTweets = getRemainingTweets();
  const canPost = canPostTweet();

const handleAudioReady = async (url: string, duration: number, size: number, format: string) => {
    setAudioData({ url, duration, size, format });
    setIsAudioVerified(false);
    setShowAudioRecorder(false);
    if (!user?.email) return;
    try {
      await axiosInstance.post('/audio-tweet/request-otp', { email: user.email });
      setAudioOTPEmail(user.email);
      setShowAudioOTP(true);
    } catch (error: any) {
      console.error('Failed to send audio tweet OTP:', error);
      setAudioData(null);
      setAudioPostError(
        error?.response?.data?.error || 'Failed to send verification code. Please try again.'
      );
    }
  };

const handleAudioVerified = () => {
    setIsAudioVerified(true);
    setTimeout(() => {
      setAudioOTPEmail('');
      setShowAudioOTP(false);
    }, 1200);
};

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!content.trim() && !(audioData && isAudioVerified))) return;
    
    if (!canPost) {
      setShowUpgradeModal(true);
      return;
    }
    
    try {
      const tweetdata: any = {
        author: user?._id,
        content: content.trim() || "Audio Tweet",
        image: imageurl
      }
      if (audioData && isAudioVerified) {
        tweetdata.audioUrl = audioData.url;
        tweetdata.audioDuration = audioData.duration;
        tweetdata.audioSize = audioData.size;
        tweetdata.audioFormat = audioData.format;
        tweetdata.isAudioTweet = true;
      }

      const res = await axiosInstance.post('/tweet', tweetdata)
      onTweetPosted(res.data)
      
      await fetchSubscription();
      
      setContent("")
      setimageurl("")
      setAudioData(null)
      setIsAudioVerified(false)
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoading(false)
    }
  };

  const characterCount = content.length;
  const isOverLimit = characterCount > maxLength;
  const isNearLimit = characterCount > maxLength * 0.8;
  if (!user) return null;
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsLoading(true);
    const image = e.target.files[0];
    const formdataimg = new FormData();
    formdataimg.set("image", image);
    try {
      const res = await axios.post(
        "https://api.imgbb.com/1/upload?key=97f3fb960c3520d6a88d7e29679cf96f",
        formdataimg
      );
      const url = res.data.data.display_url;
      if (url) {
        setimageurl(url);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <Card className="bg-black border-gray-800 border-x-0 border-t-0 rounded-none">
      <CardContent className="p-4">
        <div className="flex space-x-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.avatar} alt={user.displayName} />
            <AvatarFallback>{user.displayName[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <form onSubmit={handleSubmit}>
                            <Textarea
                placeholder="What's happening?"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="bg-transparent border-none text-xl text-white placeholder-gray-500 resize-none min-h-[120px] focus-visible:ring-0 focus-visible:ring-offset-0"
              />

              {audioData && isAudioVerified && (
                <div className="mb-2 flex items-center justify-between bg-purple-900/20 border border-purple-800 rounded-lg px-3 py-2 text-sm text-purple-300">
                  <span>🎤 Voice recording attached ({audioData.duration}s) — ready to post</span>
                  <button
                    type="button"
                    onClick={() => { setAudioData(null); setIsAudioVerified(false); }}
                    className="text-purple-400 hover:text-white"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-4 text-blue-400">
                  <label
                    htmlFor="tweetImage"
                    className="p-2 rounded-full hover:bg-blue-900/20 cursor-pointer"
                  >
                    <Image className="h-5 w-5" />
                    <input
                      type="file"
                      accept="image/*"
                      id="tweetImage"
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={isLoading}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <BarChart3 className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <Smile className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <Calendar className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="p-2 rounded-full hover:bg-blue-900/20"
                  >
                    <MapPin className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={`p-2 rounded-full hover:bg-purple-900/20 text-purple-400 ${showAudioRecorder ? 'bg-purple-900/30' : ''}`}
                    onClick={() => {
                      if (!canPost) {
                        setShowUpgradeModal(true);
                        return;
                      }
                      setShowAudioRecorder(!showAudioRecorder);
                    }}
                    disabled={isLoading}
                    title="Add audio tweet"
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-blue-400 font-semibold">
                      Everyone can reply
                    </span>
                  </div>
                  <div className="flex items-center space-x-3 flex-wrap">
                    {characterCount > 0 && (
                      <div className="flex items-center space-x-2">
                        <div className="relative w-8 h-8">
                          <svg className="w-8 h-8 transform -rotate-90">
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              className="text-gray-700"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r="14"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                              strokeDasharray={`${2 * Math.PI * 14}`}
                              strokeDashoffset={`${
                                2 *
                                Math.PI *
                                14 *
                                (1 - characterCount / maxLength)
                              }`}
                              className={
                                isOverLimit
                                  ? "text-red-500"
                                  : isNearLimit
                                  ? "text-yellow-500"
                                  : "text-blue-500"
                              }
                            />
                          </svg>
                        </div>
                        {isNearLimit && (
                          <span
                            className={`text-sm ${
                              isOverLimit ? "text-red-500" : "text-yellow-500"
                            }`}
                          >
                            {maxLength - characterCount}
                          </span>
                        )}
                      </div>
                    )}
                    <Separator
                      orientation="vertical"
                      className="h-6 bg-gray-700"
                    />
                    
                    {remainingTweets !== Infinity && (
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <AlertCircle className="h-4 w-4" />
                        <span>{remainingTweets} tweet{remainingTweets !== 1 ? 's' : ''} remaining this month</span>
                      </div>
                    )}
                    
                    {subscription?.plan === 'gold' && (
                      <div className="flex items-center space-x-2 text-sm text-yellow-400">
                        <span>Unlimited tweets</span>
                      </div>
                    )}

                    <Button
                      type="submit"
                      disabled={!content.trim() && !(audioData && isAudioVerified) || isOverLimit || isLoading || !canPost}
                      className={`bg-blue-500 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-full whitespace-nowrap flex shrink-0 px-4 text-sm`}
                    >
                      {canPost ? 'Post' : 'Upgrade to Post'}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
            
            {showUpgradeModal && (
              <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
                <Card className="w-full max-w-md bg-black border-gray-800 text-white">
                  <CardContent className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xl font-bold">Tweet Limit Reached</h3>
                      <Button variant="ghost" size="icon" onClick={() => setShowUpgradeModal(false)}>
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                    <p className="text-gray-400">You&apos;ve reached your monthly tweet limit on the {subscription?.plan || 'Free'} plan.</p>
                    <Button 
                      className="w-full bg-blue-500 hover:bg-blue-600"
                      onClick={() => {
                        setShowUpgradeModal(false);
                        window.location.href = '/subscription';
                      }}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {audioPostError && (
              <div className="mt-3 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm flex items-center justify-between">
                <span>{audioPostError}</span>
                <button onClick={() => setAudioPostError('')}>
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            
            {showAudioRecorder && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
                <div className="w-full max-w-lg">
                  <AudioRecorder
                    onAudioReady={handleAudioReady}
                    onClose={() => setShowAudioRecorder(false)}
                    maxDuration={300}
                    maxSize={100 * 1024 * 1024}
                  />
                </div>
              </div>
            )}
            
            {showAudioOTP && audioOTPEmail && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60" style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0}}>
                <AudioTweetOTPModal
                  isOpen={showAudioOTP}
                  onClose={() => {
                    setShowAudioOTP(false);
                    setAudioOTPEmail('');
                    if (!isAudioVerified) {
                      setAudioData(null);
                    }
                  }}
                  onSuccess={handleAudioVerified}
                  email={audioOTPEmail}
                />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TweetComposer;