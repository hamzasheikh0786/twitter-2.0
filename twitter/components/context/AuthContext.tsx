"use client";

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import React, { createContext, useContext, useState, useEffect } from "react";
import { auth } from "@/components/context/firebase";
import axiosInstance from "@/Lib/axiosInstance";

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

interface User {
  _id: string;
  username: string;
  displayName: string;
  avatar: string;
  bio?: string;
  joinedDate: string;
  email: string;
  website: string;
  location: string;
  loginHistory?: LoginHistoryEntry[];
  notificationEnabled?: boolean;
  language?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithBackendUser: (userData: User) => void;
  signup: (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => Promise<void>;
  updateProfile: (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
    language?: string;
  }) => Promise<void>;
  updateNotificationPreference: (enabled: boolean) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  googlesignin: () => void;
  fetchLoginHistory: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const unsubcribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser?.email) {
        try {
          const res = await axiosInstance.get("/loggedinuser", {
            params: { email: firebaseUser.email },
          });

          if (res.data) {
            setUser(res.data);
            localStorage.setItem("twitter-user", JSON.stringify(res.data));
          }
        } catch (err) {
          console.log("Failed to fetch user:", err);
        }
      } else {
        setUser(null);
        localStorage.removeItem("twitter-user");
      }
      setIsLoading(false);
    });
    return () => unsubcribe();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const usercred = await signInWithEmailAndPassword(auth, email, password);
      const firebaseuser = usercred.user;
      const res = await axiosInstance.get("/loggedinuser", {
        params: { email: firebaseuser.email },
      });
      if (res.data) {
        setUser(res.data);
        localStorage.setItem("twitter-user", JSON.stringify(res.data));
      }
    } catch (err) {
      console.log("Failed to fetch user:", err);
    }
    setIsLoading(false);
  };

  const loginWithBackendUser = (userData: User) => {
    console.log('🔐 loginWithBackendUser called with:', userData);
    setIsLoading(false);
    setUser(userData);
    localStorage.setItem("twitter-user", JSON.stringify(userData));
    console.log('🔐 User set in context');
  };

  const fetchLoginHistory = async () => {
    if (!user?.email) return;
    try {
      const res = await axiosInstance.get("/login-history", {
        params: { email: user.email },
      });
      if (res.data?.loginHistory) {
        setUser(prev => prev ? { ...prev, loginHistory: res.data.loginHistory } : null);
      }
    } catch (err) {
      console.log("Failed to fetch login history:", err);
    }
  };

  const signup = async (
    email: string,
    password: string,
    username: string,
    displayName: string
  ) => {
    setIsLoading(true);
    try {
      const usercred = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = usercred.user;
      const newUser = {
        username,
        displayName,
        avatar: user.photoURL || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
        email: user.email,
      };
      const res = await axiosInstance.post("/register", newUser);
      if (res.data) {
        setUser(res.data);
        localStorage.setItem("twitter-user", JSON.stringify(res.data));
      }
    } catch (err: any) {
      console.log('🔥 RAW FIREBASE ERROR:', err.code, err.message, err);
      if (err.code === 'auth/email-already-in-use') {
        throw new Error('Email already in use. Please sign in instead.');
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setUser(null);
    await signOut(auth);
    localStorage.removeItem("twitter-user");
  };

  const updateProfile = async (profileData: {
    displayName: string;
    bio: string;
    location: string;
    website: string;
    avatar: string;
  }) => {
    if (!user) return;

    setIsLoading(true);
    // Mock API call - in real app, this would call an API
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const updatedUser: User = {
      ...user,
      ...profileData,
    };
    const res = await axiosInstance.patch(
      `/userupdate/${user.email}`,
      updatedUser
    );
    if (res.data) {
      setUser(updatedUser);
      localStorage.setItem("twitter-user", JSON.stringify(updatedUser));
    }

    setIsLoading(false);
  };

  const updateNotificationPreference = async (enabled: boolean) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const updatedUser: User = {
        ...user,
        notificationEnabled: enabled,
      };
      const res = await axiosInstance.patch(
        `/userupdate/${user.email}`,
        updatedUser
      );
      if (res.data) {
        setUser(updatedUser);
        localStorage.setItem("twitter-user", JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.log("Failed to update notification preference:", err);
    }
    setIsLoading(false);
  };

  const googlesignin = async () => {
    setIsLoading(true);

    try {
      const googleauthprovider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, googleauthprovider);
      const firebaseuser = result.user;

      if (!firebaseuser?.email) {
        throw new Error("No email found in Google account");
      }

      let userData;

      try {
        const res = await axiosInstance.get("/loggedinuser", {
          params: { email: firebaseuser.email },
        });
        userData = res.data;
      } catch (err) {
        const newUser = {
          username: firebaseuser.email.split("@")[0],
          displayName: firebaseuser.displayName || "User",
          avatar: firebaseuser.photoURL || "https://images.pexels.com/photos/1139743/pexels-photo-1139743.jpeg?auto=compress&cs=tinysrgb&w=400",
          email: firebaseuser.email,
        };

        const registerRes = await axiosInstance.post("/register", newUser);
        userData = registerRes.data;
      }

      if (userData) {
        setUser(userData);
        localStorage.setItem("twitter-user", JSON.stringify(userData));
      } else {
        throw new Error("Login/Register failed: No user data returned");
      }
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      console.error("Google Sign-In Error:", error);
      alert(err.response?.data?.message || err.message || "Login failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        loginWithBackendUser,
        signup,
        updateProfile,
        updateNotificationPreference,
        logout,
        isLoading,
        googlesignin,
        fetchLoginHistory,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};