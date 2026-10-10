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
  CheckCircle2,
  Sparkles,
  KeyRound,
  Globe,
  Fingerprint,
  Shield,
  Activity,
  Briefcase
} from 'lucide-react';

function LoginContent() {
  const { login, loading } = useApp();
  const [email, setEmail] = useState('admin@peoplehub.com');
  const [password, setPassword] = useState('admin_pass');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'password' | 'sso'>('password');
  const [ssoDomain, setSsoDomain] = useState('');
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
      setError('Please provide both corporate email and password.');
      return;
    }
    await performLogin(email, password);
  };

  const handleQuickLogin = async (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    await performLogin(userEmail, userPass);
  };

  const handleSsoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ssoDomain) {
      setError('Please enter your corporate domain (e.g. acme-corp.com).');
      return;
    }
    setError(`Redirecting to corporate identity provider (${ssoDomain})... Demo mode: Please use standard login.`);
  };

  return (
    <div className="min-h-screen flex w-full bg-[#0B1437] font-sans antialiased text-slate-800">
      
      {/* ========================================================= */}
      {/* LEFT COLUMN: Corporate Brand & Enterprise Trust Showcase  */}
      {/* ========================================================= */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative flex-col justify-between p-12 xl:p-16 overflow-hidden bg-gradient-to-br from-[#0B1437] via-[#111C44] to-[#1B254B] border-r border-slate-800/80">
        
        {/* Subtle Ambient Glow Elements */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#5D5FEF]/20 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[#4318FF]/15 blur-3xl pointer-events-none"></div>
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none"></div>

        {/* Top: Corporate Brand Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#4318FF] to-[#7551FF] flex items-center justify-center text-white shadow-lg shadow-indigo-900/50">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-white tracking-tight">PeopleHub</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#5D5FEF]/25 text-indigo-300 border border-indigo-500/30">
                  Enterprise
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-400">Human Capital & Operations Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700/60 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[11px] font-semibold text-slate-300">Live Cloud Production</span>
          </div>
        </div>

        {/* Center: Value Propositions & Strategic Highlights */}
        <div className="relative z-10 my-auto py-12 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Next-Generation Multi-Tenant HRMS Suite</span>
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold text-white tracking-tight leading-tight mb-5">
            Empowering modern enterprises with unified workforce intelligence.
          </h1>

          <p className="text-sm xl:text-base text-slate-300/90 leading-relaxed font-normal mb-8">
            Engineered for high-volume manufacturing, piece-rate operations, and distributed enterprises. Streamline payroll, attendance, branch hierarchies, and multi-tenant compliance.
          </p>

          {/* Enterprise Pillar Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-2.5">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Multi-Tenant Isolation</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                Strict organization-level data segregation with scoped RBAC permissions.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md hover:border-slate-700 transition">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2.5">
                <Activity className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-white mb-1">Piece-Rate & Payroll</h4>
              <p className="text-[11px] text-slate-400 leading-snug">
                Real-time activity logs, rate cards, and automated payslip compilation.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: Compliance & SLA Badges */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 font-medium">
              <Shield className="w-3.5 h-3.5 text-indigo-400" />
              SOC-2 Type II Certified
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
              256-Bit TLS Encryption
            </span>
            <span className="flex items-center gap-1.5 font-medium">
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              99.99% Availability
            </span>
          </div>
          <div className="text-slate-500 font-mono text-[10px]">
            v2.4.0 (Enterprise)
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: Executive Authentication Card & Form        */}
      {/* ========================================================= */}
      <div className="w-full lg:w-1/2 xl:w-[45%] flex flex-col justify-between p-6 sm:p-10 xl:p-14 bg-[#F4F7FE] overflow-y-auto">
        
        {/* Mobile Brand Bar (Visible on mobile only) */}
        <div className="flex lg:hidden items-center justify-between mb-8 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5D5FEF] flex items-center justify-center text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-black text-slate-900 tracking-tight">PeopleHub</span>
              <p className="text-[10px] text-slate-500 font-semibold">Enterprise HRMS</p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
            Live Production
          </span>
        </div>

        {/* Main Form Container */}
        <div className="max-w-md w-full mx-auto my-auto py-6">
          
          {/* Card Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
              Sign In to Corporate Portal
            </h2>
            <p className="text-xs font-semibold text-slate-500 leading-relaxed">
              Authenticate with your corporate credentials or single sign-on (SSO) identity provider.
            </p>
          </div>

          {/* Auth Method Tabs (Standard vs Enterprise SSO) */}
          <div className="flex items-center rounded-2xl bg-slate-200/60 p-1 mb-6 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('password')}
              className={`flex-1 py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'password'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Password Authentication</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sso')}
              className={`flex-1 py-2 px-3 rounded-xl transition text-center flex items-center justify-center gap-1.5 ${
                activeTab === 'sso'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Enterprise SSO</span>
            </button>
          </div>

          {/* Error Message Box */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-800 animate-fadeIn">
              <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 flex-shrink-0"></span>
              <div className="font-semibold">{error}</div>
            </div>
          )}

          {/* Tab 1: Standard Password Form */}
          {activeTab === 'password' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Corporate Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <Mail className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 pr-4 w-full rounded-2xl border border-slate-200 bg-white py-3 px-3 focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/30 focus:border-[#5D5FEF] text-slate-900 text-xs font-semibold placeholder:text-slate-400 transition shadow-sm"
                    placeholder="user@peoplehub.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-[11px] font-bold text-[#5D5FEF] hover:underline"
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
                    className="pl-10 pr-10 w-full rounded-2xl border border-slate-200 bg-white py-3 px-3 focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/30 focus:border-[#5D5FEF] text-slate-900 text-xs font-semibold placeholder:text-slate-400 transition shadow-sm"
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-[#5D5FEF] focus:ring-[#5D5FEF] border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-600">Remember this workstation</span>
                </label>
                <span className="text-[11px] text-slate-400 font-medium">Session: 7 days</span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full bg-gradient-to-r from-[#4318FF] to-[#5D5FEF] hover:from-[#3613D4] hover:to-[#4B4DDB] text-white font-extrabold py-3.5 px-4 rounded-2xl transition duration-200 text-xs shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting || loading ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <span>Authenticate & Open Workspace</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Tab 2: Enterprise Single Sign-On (SSO) */
            <form onSubmit={handleSsoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                  Corporate Identity Domain
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                    <Globe className="w-4 h-4 text-slate-400" />
                  </span>
                  <input
                    type="text"
                    value={ssoDomain}
                    onChange={(e) => setSsoDomain(e.target.value)}
                    className="pl-10 pr-4 w-full rounded-2xl border border-slate-200 bg-white py-3 px-3 focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/30 focus:border-[#5D5FEF] text-slate-900 text-xs font-semibold placeholder:text-slate-400 transition shadow-sm"
                    placeholder="company.com"
                  />
                </div>
                <p className="text-[11px] text-slate-500 font-medium mt-1.5">
                  Enter your company domain registered with Okta, Azure Active Directory, or Google Workspace.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-[#1B254B] hover:bg-[#111C44] text-white font-extrabold py-3.5 px-4 rounded-2xl transition duration-200 text-xs shadow-md flex items-center justify-center gap-2"
              >
                <Fingerprint className="w-4 h-4 text-indigo-400" />
                <span>Continue with Corporate SSO</span>
              </button>
            </form>
          )}

          {/* Quick Access Corporate Demo Accounts */}
          <div className="mt-8 pt-6 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Authorized Seed Roles (One-Click)
              </span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                Verified Cloud DB
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Super Admin Account */}
              <button
                type="button"
                onClick={() => handleQuickLogin('admin@peoplehub.com', 'admin_pass')}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition text-left group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                    <span className="text-[11px] font-black text-slate-900">Super Admin</span>
                  </div>
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">admin@peoplehub.com</div>
                <div className="text-[9px] text-[#5D5FEF] font-bold mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                  <span>Sign In as Admin</span>
                  <span>→</span>
                </div>
              </button>

              {/* HR Manager Account */}
              <button
                type="button"
                onClick={() => handleQuickLogin('priya@garments.com', 'priya_pass')}
                className="p-3.5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition text-left group flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="text-[11px] font-black text-slate-900">HR Manager</span>
                  </div>
                  <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">priya@garments.com</div>
                <div className="text-[9px] text-emerald-600 font-bold mt-2 flex items-center gap-1 group-hover:translate-x-0.5 transition">
                  <span>Sign In as HR</span>
                  <span>→</span>
                </div>
              </button>
            </div>
          </div>

        </div>

        {/* Card Footer: Security statement & compliance */}
        <div className="max-w-md w-full mx-auto pt-6 border-t border-slate-200 text-center space-y-2">
          <p className="text-[11px] font-medium text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Authorized access only. All actions are logged and audited.</span>
          </p>
          <div className="flex items-center justify-center gap-4 text-[10px] font-semibold text-slate-500">
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert('PeopleHub Enterprise Data Protection complies with GDPR, SOC-2, and regional labor standards.'); }} className="hover:underline">Security & Privacy</a>
            <span>•</span>
            <a href="#terms" onClick={(e) => { e.preventDefault(); alert('Terms of Service: Standard SaaS Multi-Tenant Enterprise Agreement.'); }} className="hover:underline">Terms of Service</a>
            <span>•</span>
            <a href="#support" onClick={(e) => { e.preventDefault(); alert('Enterprise Support: contact support@peoplehub.com for 24/7 dedicated assistance.'); }} className="hover:underline">Help & Support</a>
          </div>
        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-[#5D5FEF] flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Corporate Password Reset</h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                For security reasons in enterprise multi-tenant deployments, password resets must be initiated by your Organization Tenant Administrator.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-600 font-medium text-left">
              💡 <strong>For Demo / Testing:</strong> Use the one-click buttons on the login card to instantly authenticate as Super Admin or HR Manager.
            </div>
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="w-full py-2.5 px-4 bg-[#5D5FEF] hover:bg-[#4B4DDB] text-white font-bold rounded-xl text-xs transition"
            >
              Return to Login
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
