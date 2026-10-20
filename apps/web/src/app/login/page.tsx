'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '../../context/AppContext';
import {
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Eye,
  EyeOff,
  HelpCircle,
  User
} from 'lucide-react';

function LoginContent() {
  const { login, loading } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const performLogin = async (loginEmail: string, loginPass: string) => {
    setError(null);
    setIsSubmitting(true);
    try {
      const success = await login(loginEmail, loginPass);
      if (!success) {
        setError('Invalid corporate credentials. Please check your email or password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to connect to the authentication server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both your corporate email and password.');
      return;
    }
    await performLogin(email, password);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50/80 font-sans antialiased text-slate-900 px-4 py-8 sm:py-12 relative overflow-hidden">
      
      {/* Background Subtle Gradient & Grid Accents */}
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none"></div>
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-slate-200/50 to-transparent blur-3xl pointer-events-none"></div>

      {/* Main Authentication Card */}
      <div className="relative z-10 max-w-md w-full my-auto">
        <div className="bg-white rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.06)] border border-slate-200/90 p-8 sm:p-10">
          
          {/* Brand Header Inside Widget */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className="mb-3.5 flex items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex items-center justify-center p-2.5">
                <img 
                  src="/noltrion-icon.png" 
                  alt="Noltrion Innovations" 
                  className="w-full h-full object-contain" 
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900 tracking-tight">PeopleHub</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Sign in to your workspace
            </p>
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-xs text-rose-800">
              <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0"></span>
              <div className="font-semibold">{error}</div>
            </div>
          )}

          {/* Standard Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email, Employee ID or Mobile
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <User className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 pr-4 w-full rounded-xl border border-slate-300 bg-white py-3 px-3 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-slate-900 text-xs font-semibold placeholder:text-slate-400 transition"
                  placeholder="e.g. priya@garments.com or EMP-101"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-400" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 w-full rounded-xl border border-slate-300 bg-white py-3 px-3 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 text-slate-900 text-xs font-semibold placeholder:text-slate-400 transition"
                  placeholder="••••••••••••"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl transition duration-150 text-xs shadow-md shadow-slate-900/10 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting || loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <span>Sign In to Workspace</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                </>
              )}
            </button>
          </form>

          {/* Security & Compliance Callout */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>256-Bit SSL Encryption • SOC-2 Type II Compliant</span>
          </div>

        </div>
      </div>

      {/* Page Footer */}
      <div className="relative z-10 max-w-md w-full mx-auto text-center mt-6 text-[11px] text-slate-400 space-y-2">
        <p className="font-semibold text-slate-500">
          © 2026 Noltrion Innovations. All rights reserved.
        </p>
        <p className="text-[10px] text-slate-400">
          Protected by PeopleHub Enterprise Guard. Unauthorized access is monitored.
        </p>
        <div className="flex items-center justify-center gap-4 text-slate-500 font-semibold text-[10px] pt-1">
          <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('PeopleHub adheres strictly to GDPR, SOC-2, and international workforce data compliance.'); }} className="hover:text-slate-800 transition hover:underline">Privacy Policy</a>
          <span>•</span>
          <a href="#terms" onClick={(e) => { e.preventDefault(); alert('Terms of Service: Standard SaaS Enterprise Agreement.'); }} className="hover:text-slate-800 transition hover:underline">Terms of Service</a>
          <span>•</span>
          <a href="#support" onClick={(e) => { e.preventDefault(); alert('For enterprise assistance, contact support@peoplehub.com.'); }} className="hover:text-slate-800 transition hover:underline">Enterprise Support</a>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-900 flex items-center justify-center mx-auto">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Corporate Password Recovery</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                For corporate security in multi-tenant environments, password resets must be initiated by your Organization Tenant Administrator.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition"
            >
              Back to Login
            </button>
          </div>
        </div>
      )}

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
