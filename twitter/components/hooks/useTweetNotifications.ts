"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/components/context/AuthContext";
import { useNotification } from "@/components/context/NotificationContext";

const KEYWORDS = ["cricket", "science"];

interface Tweet {
  _id: string;
  content: string;
  author: {
    displayName: string;
    username: string;
  };
}

export const useTweetNotifications = (tweets: Tweet[]) => {
  const { user } = useAuth();
  const { showNotification, permission, requestPermission } = useNotification();
  const prevTweetCount = useRef(0);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!user?.notificationEnabled || permission !== "granted") return;
  }, [user?.notificationEnabled, permission]);

  useEffect(() => {
    if (!user?.notificationEnabled || permission !== "granted" || tweets.length === 0) return;

    if (isInitialLoad.current) {
      prevTweetCount.current = tweets.length;
      isInitialLoad.current = false;
      return;
    }

    if (tweets.length > prevTweetCount.current) {
      const newTweets = tweets.slice(0, tweets.length - prevTweetCount.current);
      
      newTweets.forEach((tweet) => {
        const content = tweet.content.toLowerCase();
        const hasKeyword = KEYWORDS.some((keyword) => content.includes(keyword));

        if (hasKeyword) {
          const matchedKeyword = KEYWORDS.find((keyword) => content.includes(keyword));
          showNotification(
            `New tweet about ${matchedKeyword}`,
            `${tweet.author.displayName} (@${tweet.author.username}): ${tweet.content}`,
            `tweet-${tweet._id}`
          );
        }
      });
      
      prevTweetCount.current = tweets.length;
    }
  }, [tweets, user?.notificationEnabled, permission, showNotification]);

  const enableNotifications = async () => {
    if (permission !== "granted") {
      await requestPermission();
    }
  };

  return { enableNotifications };
};