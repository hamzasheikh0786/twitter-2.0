"use client";
import { useAuth } from "@/components/context/AuthContext";
import React, { useState } from "react";
import LoadingSpinner from "../loading-spinner";
import Sidebar from "@/components/layout/Sidebar";
import RightSidebar from "@/components/layout/Rightsidebar";
import ProfilePage from "@/components/ProfilePage";
import SettingsPage from "@/components/SettingsPage";

const Mainlayout = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState("home");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-4xl font-bold mb-4">X</div>
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      <div className="w-64 border-r border-gray-800 flex-shrink-0">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      </div>
      <main className="flex-1 max-w-2xl border-x border-gray-800 flex-shrink-0">
        {currentPage === "profile" ? (
          <ProfilePage />
        ) : currentPage === "settings" ? (
          <SettingsPage onBack={() => setCurrentPage("home")} />
        ) : (
          children
        )}
      </main>
      <div className="hidden lg:block w-80 flex-shrink-0">
        <RightSidebar />
      </div>
    </div>
  );
};

export default Mainlayout;