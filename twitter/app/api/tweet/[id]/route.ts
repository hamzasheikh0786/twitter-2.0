import { NextRequest, NextResponse } from "next/server";

interface Tweet {
  _id: string;
  content: string;
  author: {
    _id: string;
    displayName: string;
    username: string;
    avatar: string;
  };
  likes: number;
  likedBy: string[];
  retweets: number;
  retweetedBy: string[];
  comments: number;
  image?: string;
  timestamp: string;
}

const mockTweets: Record<string, Tweet> = {
  "6a7630ac7fc41698b6c66253": {
    _id: "6a7630ac7fc41698b6c66253",
    content: "Hello world! This is my first tweet.",
    author: {
      _id: "user1",
      displayName: "John Doe",
      username: "johndoe",
      avatar: "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
    },
    likes: 5,
    likedBy: ["user2", "user3"],
    retweets: 2,
    retweetedBy: ["user4"],
    comments: 3,
    timestamp: new Date().toISOString(),
  },
};

function getTweet(id: string): Tweet | undefined {
  return mockTweets[id];
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const tweet = getTweet(id);
    if (!tweet) {
      return NextResponse.json({ error: "Tweet not found" }, { status: 404 });
    }

    if (tweet.author._id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    delete mockTweets[id];

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting tweet:", error);
    return NextResponse.json({ error: "Failed to delete tweet" }, { status: 500 });
  }
}