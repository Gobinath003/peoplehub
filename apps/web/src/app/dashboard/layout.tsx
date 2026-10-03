'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '../../context/AppContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutGrid, ListTodo, UserCircle, Shield, 
  Settings, MessageSquare, Mail, LogOut, 
  Search, RotateCcw, Building, ChevronRight, 
  Menu, X, BadgeCheck, FileText, Landmark, 
  Scissors, SlidersHorizontal, UserCheck, Bell
} from 'lucide-react';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { 
    user, 
    loading,
    activeTenant, 
    tenants, 
    switchTenant, 
    logout, 
    isSuperAdmin, 
    isHRManager, 
    activeBranchScope 
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  // Immediately redirect to login if unauthenticated
  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE]">
        <div className="flex flex-col items-center gap-4 text-center p-8 bg-white rounded-3xl shadow-[0_10px_30px_rgba(112,144,176,0.08)] border border-slate-100 max-w-sm w-full mx-4">
          <div className="w-12 h-12 rounded-2xl bg-[#5D5FEF] flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-200">
            u
          </div>
          <div className="w-8 h-8 border-4 border-[#5D5FEF] border-t-transparent rounded-full animate-spin mt-2"></div>
          <p className="text-slate-700 font-extrabold text-sm">Redirecting to login...</p>
          <a
            href="/login"
            className="text-xs font-bold text-[#5D5FEF] hover:underline"
          >
            Click here if not redirected automatically
          </a>
        </div>
      </div>
    );
  }

  // Navigation matching the reference UI design
  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid, show: true },
    { name: 'Tasks', path: '/dashboard/piece-rate', icon: ListTodo, show: true, badge: 'Piece-Rate' },
    { name: 'Profiles', path: '/dashboard/employees', icon: UserCircle, show: true, badge: 'Employees' },
    { name: 'Roll And Permission', path: '/dashboard/masters', icon: Shield, show: true, badge: 'Masters' },
    { name: 'Admin Settings', path: isSuperAdmin ? '/dashboard/tenants' : '/dashboard/settings/modules', icon: Settings, show: true },
    { name: 'Payroll & Slips', path: '/dashboard/payroll', icon: FileText, show: true, badge: 'Payroll' },
    { name: 'Chat', path: '#chat', icon: MessageSquare, show: true, comingSoon: true },
    { name: 'Messages', path: '#messages', icon: Mail, show: true, comingSoon: true },
  ];

  // Garment Department / Project categories
  const projectCategories = [
    { name: 'Cutting & Pattern', color: 'bg-[#4318FF]', path: '/dashboard/masters' },
    { name: 'Sewing & Tailoring', color: 'bg-[#EE5D50]', path: '/dashboard/piece-rate' },
    { name: 'Quality Inspection', color: 'bg-[#FFB547]', path: '/dashboard/masters' },
    { name: 'HR & Administration', color: 'bg-[#05CD99]', path: '/dashboard/employees' },
  ];

  return (
    <div className="min-h-screen flex bg-[#F4F7FE] font-sans antialiased text-slate-800">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Modern White Left Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-slate-100/90 shadow-[4px_0_24px_rgba(112,144,176,0.06)] transition-transform duration-300 lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Logo: Violet icon with "U" + "HUB" */}
        <div className="flex h-20 items-center justify-between px-7">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#5D5FEF] flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-indigo-200">
              u
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-slate-900 tracking-tight">HUB</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5D5FEF]"></span>
            </div>
          </Link>
          <button className="lg:hidden text-slate-400 hover:text-slate-600" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-2 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            if (item.comingSoon) {
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-semibold text-slate-400 opacity-60 cursor-not-allowed"
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className="w-4 h-4 text-slate-400" />
                    <span>{item.name}</span>
                  </div>
                  <span className="text-[10px] bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full font-bold">Soon</span>
                </div>
              );
            }

            return (
              <div key={item.name} className="relative">
                {/* Active Purple Indicator Curve */}
                {isActive && (
                  <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-2.5 h-7 bg-[#5D5FEF] rounded-r-full shadow-sm"></div>
                )}
                <Link
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group flex items-center justify-between px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-200
                    ${isActive 
                      ? 'text-[#5D5FEF] bg-[#EEF0FD]/60' 
                      : 'text-slate-400 hover:text-slate-800 hover:bg-slate-50/80'}
                  `}
                >
                  <div className="flex items-center gap-3.5">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#5D5FEF]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                    <span className="tracking-tight">{item.name}</span>
                  </div>
                  {item.badge && !isActive && (
                    <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </div>
            );
          })}

          {/* PROJECTS Section */}
          <div className="pt-6 pb-2 px-3">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3 px-1">
              PROJECTS
            </div>
            <div className="space-y-2.5">
              {projectCategories.map((proj) => (
                <Link
                  key={proj.name}
                  href={proj.path}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${proj.color} shadow-sm shrink-0`}></span>
                  <span className="truncate">{proj.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </nav>

        {/* Footer: User profile + Logout */}
        <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-2xl bg-amber-400 text-white font-black flex items-center justify-center text-xs shadow-sm">
                {user.firstName[0]}{user.lastName[0]}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-800 truncate">{user.firstName} {user.lastName}</div>
              <div className="text-[10px] text-slate-400 font-medium truncate capitalize">
                {isSuperAdmin ? 'Super Admin' : (activeTenant?.name || 'Manager')}
              </div>
            </div>
          </div>

          <button
            onClick={logout}
            title="Log Out"
            className="p-2 text-slate-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-20 items-center justify-between px-6 md:px-8 bg-transparent">
          {/* Left: Mobile Toggle & Rounded Pill Search Bar */}
          <div className="flex items-center gap-4 flex-1 max-w-xl">
            <button 
              className="text-slate-600 lg:hidden p-2 rounded-xl bg-white shadow-sm"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Pill Search Input */}
            <div className="relative w-full max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-[#5D5FEF]" />
              </div>
              <input 
                type="text"
                placeholder="Search for stats, tasks, employees..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-slate-100/90 shadow-[0_4px_20px_rgba(112,144,176,0.06)] text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#5D5FEF]/30 focus:border-[#5D5FEF] transition"
              />
            </div>
          </div>

          {/* Right Controls: Refresh Button, Tenant Switcher, Profile */}
          <div className="flex items-center gap-3">
            {/* Refresh Button matching screenshot circle icon */}
            <button
              onClick={() => window.location.reload()}
              title="Refresh"
              className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-[0_4px_20px_rgba(112,144,176,0.06)] flex items-center justify-center text-slate-500 hover:text-[#5D5FEF] hover:shadow transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Tenant Switcher Dropdown */}
            <div className="relative">
              <button
                onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
                className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-[0_4px_20px_rgba(112,144,176,0.06)] hover:bg-slate-50 focus:outline-none transition"
              >
                <Building className="w-3.5 h-3.5 text-[#5D5FEF]" />
                <span className="max-w-[120px] truncate">{activeTenant?.name || 'Company'}</span>
                <span className="text-[9px] bg-[#EEF0FD] text-[#5D5FEF] px-1.5 py-0.5 rounded-md font-extrabold">Switch</span>
              </button>

              {tenantDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-slate-100 bg-white shadow-xl z-50 py-2">
                  <div className="px-4 py-2 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Active Company</span>
                    {isSuperAdmin && (
                      <Link 
                        href="/dashboard/tenants" 
                        onClick={() => setTenantDropdownOpen(false)}
                        className="text-[#5D5FEF] hover:underline text-[10px] font-bold"
                      >
                        + New
                      </Link>
                    )}
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {tenants.map(t => (
                      <button
                        key={t.id}
                        onClick={async () => {
                          setTenantDropdownOpen(false);
                          await switchTenant(t.id);
                        }}
                        className={`
                          w-full text-left px-4 py-2.5 text-xs flex flex-col hover:bg-slate-50 transition border-b border-slate-50 last:border-0
                          ${activeTenant?.id === t.id ? 'bg-[#EEF0FD]/60 font-bold text-[#5D5FEF]' : 'text-slate-700'}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{t.name}</span>
                          {activeTenant?.id === t.id && (
                            <span className="text-[9px] text-[#5D5FEF] font-black">Active</span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal mt-0.5 capitalize">{t.industry?.toLowerCase()} Industry</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar with Warm Orange Halo */}
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-10 h-10 rounded-2xl bg-amber-400 text-white font-black flex items-center justify-center text-sm shadow-md shadow-amber-200 border-2 border-white transition hover:scale-105"
              >
                {user.firstName[0]}{user.lastName[0]}
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-100 bg-white shadow-xl z-50 py-2">
                  <div className="px-4 py-2.5 border-b border-slate-100 text-xs">
                    <div className="font-extrabold text-slate-800">{user.firstName} {user.lastName}</div>
                    <div className="text-slate-400 text-[11px] truncate mt-0.5">{user.email}</div>
                    <div className="mt-1.5 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF0FD] text-[#5D5FEF]">
                      {isSuperAdmin ? 'Super Administrator' : 'HR Manager'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Content Container */}
        <main className="flex-1 overflow-y-auto px-6 md:px-8 pb-10">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </AppProvider>
  );
}
