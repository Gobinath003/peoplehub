'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '../../context/AppContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutGrid, ListTodo, UserCircle, Shield, 
  Settings, MessageSquare, Mail, LogOut, 
  Search, Building, ChevronRight, ChevronDown,
  Menu, X, BadgeCheck, FileText, Landmark, 
  Scissors, SlidersHorizontal, UserCheck, Bell, Building2,
  Wallet, Plus
} from 'lucide-react';

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const rawPathname = usePathname();
  const pathname = rawPathname || '';
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
    activeBranchScope,
    enabledModules 
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mastersMenuOpen, setMastersMenuOpen] = useState(false);

  const profileDropdownRef = React.useRef<HTMLDivElement>(null);
  const tenantDropdownRef = React.useRef<HTMLDivElement>(null);

  const isMasterActive = Boolean(
    pathname && (
      pathname.startsWith('/dashboard/employees') || 
      pathname.startsWith('/dashboard/masters') || 
      pathname.startsWith('/dashboard/users')
    )
  );

  // Auto-expand Masters menu if active route is inside Masters
  React.useEffect(() => {
    if (isMasterActive) {
      setMastersMenuOpen(true);
    }
  }, [isMasterActive]);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
      if (
        tenantDropdownRef.current &&
        !tenantDropdownRef.current.contains(event.target as Node)
      ) {
        setTenantDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Immediately redirect to login if unauthenticated
  React.useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [loading, user, router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE]">
        <div className="flex flex-col items-center gap-4 text-center p-8 bg-white rounded-3xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] border border-slate-200 max-w-sm w-full mx-4">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs p-2">
            <img 
              src="/noltrion-icon.png" 
              alt="Noltrion Innovations" 
              className="w-full h-full object-contain" 
            />
          </div>
          <div className="w-7 h-7 border-3 border-slate-900 border-t-transparent rounded-full animate-spin mt-1"></div>
          <div>
            <p className="text-slate-900 font-extrabold text-sm">PeopleHub Enterprise</p>
            <p className="text-slate-500 font-semibold text-xs mt-0.5">Noltrion Innovations</p>
          </div>
          <a
            href="/login"
            className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline"
          >
            Click here if not redirected automatically
          </a>
          <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 w-full">
            © 2026 Noltrion Innovations. All rights reserved.
          </p>
        </div>
      </div>
    );
  }

  const isGarments = activeTenant?.industry === 'GARMENTS' || enabledModules?.includes('PIECE_RATE');

  // Top-level Navigation Items
  const topNavItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid, show: true },
    { 
      name: 'Tenant Management', 
      path: '/dashboard/tenants', 
      icon: Building2, 
      show: isSuperAdmin,
      quickCreate: true
    },
    { name: 'Attendance & Production', path: '/dashboard/piece-rate', icon: Scissors, show: isGarments },
    { name: 'Payroll & Compensation', path: '/dashboard/payroll', icon: FileText, show: true },
    { name: 'Accounts', path: '/dashboard/accounts', icon: Wallet, show: true },
  ].filter(item => item.show);

  // Masters Sub-Items
  const masterSubItems = [
    { name: 'Workforce & Employees', path: '/dashboard/employees', icon: UserCheck, show: true },
    { name: 'Organization Masters', path: '/dashboard/masters', icon: Landmark, show: true },
    { name: 'Tenants & RBAC', path: '/dashboard/tenants', icon: Building2, show: isSuperAdmin },
    { name: 'Users & Roles', path: '/dashboard/users', icon: Shield, show: true },
  ].filter(item => item.show);

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] font-sans antialiased text-slate-800">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Modern Corporate Left Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-slate-200 transition-transform duration-200 lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-slate-100">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs p-1.5 group-hover:border-slate-300 transition">
              <img 
                src="/noltrion-icon.png" 
                alt="PeopleHub" 
                className="w-full h-full object-contain" 
              />
            </div>
            <span className="text-base font-extrabold text-slate-900 tracking-tight">PeopleHub</span>
          </Link>
          <button className="lg:hidden text-slate-400 hover:text-slate-600" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {topNavItems.map((item: any) => {
            const Icon = item.icon;
            const isActive = Boolean(
              pathname && (
                pathname === item.path || 
                (item.path !== '/dashboard' && pathname.startsWith(item.path))
              )
            );

            return (
              <div key={item.name} className="relative flex items-center group/nav">
                <Link
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex-1 flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors
                    ${isActive 
                      ? 'text-white bg-slate-900 font-semibold shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}
                  `}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover/nav:text-slate-700'}`} />
                    <span className="tracking-tight truncate">{item.name}</span>
                  </div>
                  {isActive && !item.quickCreate && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                  )}
                </Link>
                {item.quickCreate && (
                  <Link
                    href="/dashboard/tenants?create=true"
                    onClick={() => setSidebarOpen(false)}
                    title="Create New Tenant"
                    className="ml-1 p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white border border-emerald-200 hover:border-emerald-600 transition shadow-2xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            );
          })}

          {/* Masters Menu */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setMastersMenuOpen(!mastersMenuOpen)}
              className={`
                w-full group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors
                ${isMasterActive 
                  ? 'text-slate-900 bg-slate-100 font-semibold' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}
              `}
            >
              <div className="flex items-center gap-2.5">
                <Landmark className={`w-4 h-4 transition-colors ${isMasterActive ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-700'}`} />
                <span className="tracking-tight">Masters</span>
              </div>
              <div className="flex items-center gap-1.5">
                {mastersMenuOpen ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </div>
            </button>

            {mastersMenuOpen && (
              <div className="ml-3 pl-2.5 border-l border-slate-200 mt-0.5 space-y-0.5">
                {masterSubItems.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = pathname === sub.path;
                  return (
                    <Link
                      key={sub.name}
                      href={sub.path}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-colors
                        ${isSubActive 
                          ? 'text-white bg-slate-900 font-semibold shadow-xs' 
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <SubIcon className={`w-3.5 h-3.5 transition-colors ${isSubActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
                        <span className="tracking-tight">{sub.name}</span>
                      </div>
                      {isSubActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* ACTIVE WORKSPACE CONTEXT - Only for platform Super Admin managing multiple client tenants */}
          {isSuperAdmin && (
            <div className="pt-5 pb-2 px-2">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">
                Active Organization
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 truncate">
                    {activeTenant?.name || 'Platform Scope'}
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Industry: <strong className="text-slate-700">{activeTenant?.industry || 'PLATFORM'}</strong>
                </div>
                <div className="text-[10px] text-slate-500 font-medium">
                  Scope: <strong className="text-slate-700">{activeBranchScope || 'All Branches'}</strong>
                </div>

                {/* Company Switcher inside sidebar for Super Admin */}
                {tenants && tenants.length > 1 && (
                  <div className="pt-1">
                    <select
                      value={activeTenant?.id || ''}
                      onChange={(e) => switchTenant(e.target.value)}
                      className="w-full text-[10px] font-bold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      title="Switch active organization context"
                    >
                      {tenants.map(t => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] font-bold">
                  <Link
                    href="/dashboard/tenants"
                    className="text-slate-600 hover:text-slate-900 hover:underline"
                  >
                    All Tenants ({(tenants && tenants.length) || 0})
                  </Link>
                  <Link
                    href="/dashboard/tenants?create=true"
                    className="text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 transition"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>Create</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </nav>

        {/* User Profile Section at bottom of the menu bar */}
        <div className="p-3 border-t border-slate-200/80 bg-slate-50/50" ref={profileDropdownRef}>
          <div className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-white border border-transparent hover:border-slate-200 transition text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {(user?.firstName?.[0] || 'U')}{(user?.lastName?.[0] || '')}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">
                  {user?.firstName || ''} {user?.lastName || ''}
                </div>
                <div className="text-[10px] text-slate-500 font-medium truncate" title={`${activeTenant?.name || 'Company'}${activeBranchScope ? ` • ${activeBranchScope}` : ''}`}>
                  {activeTenant?.name || 'Company'}
                  {activeBranchScope && ` • ${activeBranchScope}`}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
            </button>

            {/* Profile Dropdown Popup (Opens upward from bottom of sidebar) */}
            {profileDropdownOpen && (
              <div className="absolute left-0 right-0 bottom-full mb-2 rounded-xl border border-slate-200 bg-white shadow-xl z-50 py-1.5 text-xs">
                {/* User Info Header */}
                <div className="px-3.5 py-2 border-b border-slate-100">
                  <div className="font-extrabold text-slate-900 text-sm">
                    {user?.firstName || ''} {user?.lastName || ''}
                  </div>
                  <div className="text-slate-400 text-[11px] truncate mt-0.5">
                    {user?.email || ''}
                  </div>
                </div>

                {/* Company & Branch Scope Info */}
                <div className="px-3.5 py-2.5 border-b border-slate-100 bg-slate-50/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Organization</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">Active</span>
                  </div>
                  <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{activeTenant?.name || 'Company'}</span>
                  </div>
                  {activeBranchScope && (
                    <div className="text-[11px] text-slate-600 font-medium flex items-center gap-1.5">
                      <span className="text-slate-400 text-[10px] font-bold">Branch:</span>
                      <strong className="text-slate-800">{activeBranchScope}</strong>
                    </div>
                  )}
                  <div className="pt-0.5">
                    <span className="inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {isSuperAdmin ? 'Platform Super Admin' : 'Tenant Admin'}
                    </span>
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold transition mt-0.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile-Only Header Bar (Hidden on Desktop) */}
        <header className="flex lg:hidden items-center justify-between px-4 h-11 bg-white border-b border-slate-200/80">
          <button 
            className="text-slate-600 p-1.5 rounded-lg bg-white border border-slate-200"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open Navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-800 truncate">{activeTenant?.name || 'PeopleHub'}</span>
        </header>

        {/* Dynamic Content Container with Bottom Copyright Footer */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-6 flex flex-col justify-between">
          <div className="flex-1">
            {children}
          </div>
          <footer className="mt-6 pt-3 pb-1 border-t border-slate-200/60 text-center text-[10px] text-slate-400 shrink-0">
            © 2026 Noltrion Innovations. All rights reserved.
          </footer>
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
