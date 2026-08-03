// Import the functions you need from the SDKs you need
import { initializeApp , getApps ,getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB5zx_b8a6s8pLmc6FOECZ0tI_KxF6FN8Q",
  authDomain: "twitter-1fc13.firebaseapp.com",
  projectId: "twitter-1fc13",
  storageBucket: "twitter-1fc13.firebasestorage.app",
  messagingSenderId: "584438697715",
  appId: "1:584438697715:web:31ecb165f933949703b186",
  measurementId: "G-8JR6YRH6GN"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export let analytics: any;
if(typeof window !== "undefined") {
  import("firebase/analytics").then(({ getAnalytics}) => {
    analytics = getAnalytics(app);
  });
}
