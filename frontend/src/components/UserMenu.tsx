"use client";

import React, { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "@/components/ThemeProvider";
import {
  LogOut,
  Settings,
  Moon,
  Sun,
  Key,
  User,
  ChevronDown,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card } from "./ui/FormElements";
import { Button } from "./ui/Button";
import { createPortal } from "react-dom";


export const UserMenu = () => {
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);


  // Password Change State
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match");
      return;
    }

    setStatus("loading");
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${baseUrl}/api/auth/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: (session?.user as any).id,
          old_password: oldPassword,
          new_password: newPassword,
        }),
      });

      if (response.ok) {
        setStatus("success");
        setMessage("Password updated successfully");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setIsModalOpen(false), 2000);
      } else {
        const err = await response.json();
        setStatus("error");
        setMessage(err.detail || "Failed to update password");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Connection error");
    }
  };

  if (!session?.user) return null;

  return (
    <div className="relative">
      {/* Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-3 p-1 pr-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
      >
        <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shadow-sm">
          {session.user.name?.substring(0, 2).toUpperCase() || "U"}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-[10px] font-black text-slate-400 dark:text-white/40 uppercase tracking-widest leading-none mb-1">
            {(session.user as any).role || 'User'}
          </p>
          <p className="text-sm font-bold text-slate-900 dark:text-white leading-none flex items-center gap-1">
            {session.user.name?.split(' ')[0]}
            <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </p>
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {mounted && createPortal(
            <div className="fixed inset-0 z-[60]" onClick={() => setIsOpen(false)} />,
            document.body
          )}
          <div className="absolute right-0 mt-3 w-72 bg-white dark:bg-[#1A1A3A] border border-slate-100 dark:border-white/10 rounded-2xl shadow-2xl z-[61] py-2 animate-in fade-in zoom-in-95 duration-200">
            <div className="px-4 py-4 border-b border-slate-50 dark:border-white/5 mb-2">
              <p className="text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] mb-2">Account Access</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                  {session.user.name?.substring(0, 1).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{session.user.name}</p>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-white/40 truncate">{session.user.email}</p>
                </div>
              </div>
            </div>

            <div className="px-2 space-y-1">
              <button
                onClick={toggleTheme}
                className="w-full px-3 py-2.5 flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                  {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                {theme === "light" ? "Dark Appearance" : "Light Appearance"}
              </button>

              <button
                onClick={() => { setIsModalOpen(true); setIsOpen(false); }}
                className="w-full px-3 py-2.5 flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-white/70 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-slate-50 dark:bg-white/5 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                Security Settings
              </button>
            </div>

            <div className="h-[1px] bg-slate-50 dark:bg-white/5 my-2 mx-4" />

            <div className="px-2">
              <button
                onClick={() => { setIsLogoutModalOpen(true); setIsOpen(false); }}
                className="w-full px-3 py-2.5 flex items-center gap-3 text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-xl transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-rose-50 dark:bg-rose-500/5 flex items-center justify-center">
                  <LogOut className="w-4 h-4" />
                </div>
                Log Out Session
              </button>
            </div>
          </div>
        </>
      )}

      {/* Change Password Modal - PORTALED */}
      {mounted && isModalOpen && createPortal(
        <div className="fixed top-0 left-0 w-screen h-screen z-[100] grid place-items-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 animate-in fade-in duration-100"
            style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={() => setIsModalOpen(false)}
          />
          <Card className="w-full max-w-md p-6 relative shadow-2xl dark:bg-[#1A1A3A] dark:border-white/10 animate-in zoom-in-95 duration-200 z-[101]">

            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-6">
              <div className="bg-indigo-50 dark:bg-indigo-500/10 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 text-indigo-600">
                <Key className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">Security Settings</h3>
              <p className="text-slate-500 dark:text-white/60 text-xs mt-1">Manage your account protection</p>
            </div>

            {status === "success" ? (
              <div className="text-center py-8 space-y-4 animate-in fade-in zoom-in">
                <div className="h-20 w-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <p className="text-emerald-600 font-bold">{message}</p>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 tracking-widest ml-1">Current Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-5 py-2.5 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 tracking-widest ml-1">New Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-5 py-2.5 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-white/40 tracking-widest ml-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    className="w-full px-5 py-2.5 rounded-xl border border-slate-100 dark:border-white/10 bg-slate-50 dark:bg-white/5 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>

                {status === "error" && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-600 rounded-xl flex items-center gap-2 text-xs font-bold animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {message}
                  </div>
                )}

                <Button type="submit" className="w-full h-12" isLoading={status === "loading"}>
                  Update Password
                </Button>
              </form>
            )}
          </Card>
        </div>,
        document.body
      )}

      {/* Logout Confirmation Modal - PORTALED */}
      {mounted && isLogoutModalOpen && createPortal(
        <div className="fixed top-0 left-0 w-screen h-screen z-[100] grid place-items-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 animate-in fade-in duration-100"
            style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            onClick={() => setIsLogoutModalOpen(false)}
          />
          <Card className="w-full max-w-sm p-8 relative shadow-2xl dark:bg-[#1A1A3A] dark:border-white/10 animate-in zoom-in-95 duration-200 z-[101]">

            <div className="text-center space-y-6">
              <div className="bg-rose-50 dark:bg-rose-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
                <LogOut className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Confirm Log Out</h3>
                <p className="text-slate-500 dark:text-white/60 text-sm mt-2">Are you sure you want to end your current session?</p>
              </div>
              <div className="flex gap-4 pt-2">
                <Button variant="outline" className="flex-1 h-12" onClick={() => setIsLogoutModalOpen(false)}>Cancel</Button>
                <Button variant="primary" className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 border-none text-white" onClick={() => signOut({ callbackUrl: "/" })}>Log Out</Button>
              </div>
            </div>
          </Card>
        </div>,
        document.body
      )}

    </div>
  );
};
