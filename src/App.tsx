/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LanguageProvider } from "./components/LanguageContext";
import Storefront from "./components/Storefront";
import AdminDashboard from "./components/AdminDashboard";
import LiveChatWidget from "./components/LiveChatWidget";

function RootContainer() {
  const [view, setView] = useState<"storefront" | "admin">("storefront");
  
  // Auth state management
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return localStorage.getItem("aura_user_email");
  });
  const [userToken, setUserToken] = useState<string | null>(() => {
    return localStorage.getItem("aura_user_token");
  });
  const [userRole, setUserRole] = useState<string | null>(() => {
    return localStorage.getItem("aura_user_role");
  });

  const handleLoginSuccess = (email: string, token: string, role: string) => {
    setUserEmail(email);
    setUserToken(token);
    setUserRole(role);
    localStorage.setItem("aura_user_email", email);
    localStorage.setItem("aura_user_token", token);
    localStorage.setItem("aura_user_role", role);
  };

  const handleLogout = () => {
    setUserEmail(null);
    setUserToken(null);
    setUserRole(null);
    localStorage.removeItem("aura_user_email");
    localStorage.removeItem("aura_user_token");
    localStorage.removeItem("aura_user_role");
    setView("storefront");
  };

  // If user is admin during mount, let them switch, otherwise stick to storefront
  return (
    <div className="w-full min-h-screen bg-[#0B0B0B]">
      {/* Dynamic Navigation Switcher specifically for admins to jump between Store & Dashboard */}
      {userRole === "admin" && (
        <div className="fixed top-4 left-4 z-50 font-sans">
          <div className="flex gap-1.5 p-1 bg-black/60 border border-[#D4AF37]/30 rounded-lg backdrop-blur shadow-lg">
            <button
              onClick={() => setView("storefront")}
              className={`px-3 py-1.5 rounded text-xs transition-colors font-semibold ${view === "storefront" ? "bg-[#D4AF37] text-black" : "text-gray-400 hover:text-white"}`}
            >
              Public View
            </button>
            <button
              onClick={() => setView("admin")}
              className={`px-3 py-1.5 rounded text-xs transition-colors font-semibold ${view === "admin" ? "bg-[#D4AF37] text-black" : "text-gray-400 hover:text-white"}`}
            >
              Admin Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Main Container router */}
      {view === "admin" && userRole === "admin" && userToken ? (
        <AdminDashboard token={userToken} onLogout={handleLogout} />
      ) : (
        <Storefront
          onLoginSuccess={handleLoginSuccess}
          currentUserEmail={userEmail}
          currentUserToken={userToken}
          onOpenAdminLink={() => setView("admin")}
        />
      )}

      {/* Floating Concierge Chat Widget enabled for all non-admins */}
      {userRole !== "admin" && (
        <LiveChatWidget currentUserEmail={userEmail} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <RootContainer />
    </LanguageProvider>
  );
}
