'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '../../context/AppContext';
import { Mail, Lock, ArrowRight, ShieldCheck, Scissors } from 'lucide-react';

function LoginContent() {
  const { login, loading } = useApp();
  const [email, setEmail] = useState('priya@garments.com');
  const [password, setPassword] = useState('hr123');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const success = await login(loginEmail, loginPass);
      if (!success) {
        setError('Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    await performLogin(email, password);
  };

  const handleQuickLogin = async (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    await performLogin(userEmail, userPass);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FE] px-4 py-8 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-[0_18px_40px_rgba(112,144,176,0.12)] p-8 border border-slate-100 space-y-6">
        
        {/* Brand Logo & Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#5D5FEF] flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-indigo-200 mb-3">
            u
          </div>
          <div className="flex items-baseline gap-1.5 justify-center">
            <span className="text-2xl font-black text-slate-900 tracking-tight">HUB</span>
            <span className="w-2 h-2 rounded-full bg-[#5D5FEF]"></span>
          </div>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Enterprise Workforce & Garment Production Platform
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Mail className="w-4 h-4 text-[#5D5FEF]" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 px-3 focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/30 focus:border-[#5D5FEF] text-slate-800 text-xs font-semibold transition"
                placeholder="user@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Lock className="w-4 h-4 text-[#5D5FEF]" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pl-10 w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 px-3 focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/30 focus:border-[#5D5FEF] text-slate-800 text-xs font-semibold transition"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full bg-[#5D5FEF] hover:bg-[#4B4DDB] text-white font-black py-3 rounded-2xl transition duration-200 text-xs shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting || loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Quick Access Accounts */}
        <div className="border-t border-slate-100 pt-5 space-y-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">
            One-Click Demo Access
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* HR Manager Account */}
            <button
              type="button"
              onClick={() => handleQuickLogin('priya@garments.com', 'hr123')}
              className="p-3 rounded-2xl border border-indigo-100 bg-[#EEF0FD]/60 hover:bg-[#EEF0FD] text-left transition flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-extrabold text-[#5D5FEF]">HR Manager</span>
                <Scissors className="w-3.5 h-3.5 text-[#5D5FEF]" />
              </div>
              <div className="text-[10px] text-slate-500 font-medium truncate">priya@garments.com</div>
              <div className="text-[9px] text-[#5D5FEF] font-bold mt-1 group-hover:underline">1-Click Sign In →</div>
            </button>

            {/* Super Admin Account */}
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@peoplehub.com', 'admin123')}
              className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-left transition flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-extrabold text-slate-800">Super Admin</span>
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <div className="text-[10px] text-slate-500 font-medium truncate">admin@peoplehub.com</div>
              <div className="text-[9px] text-slate-600 font-bold mt-1 group-hover:underline">1-Click Sign In →</div>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <AppProvider>
      <LoginContent />
    </AppProvider>
  );
}
