'use client';

import React, { useState } from 'react';
import { AppProvider, useApp } from '../../context/AppContext';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutGrid, ListTodo, UserCircle, Shield, 
  Settings, MessageSquare, Mail, LogOut, 
  Search, RotateCcw, Building, ChevronRight, ChevronDown,
  Menu, X, BadgeCheck, FileText, Landmark, 
  Scissors, SlidersHorizontal, UserCheck, Bell, Building2,
  Wallet
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
    activeBranchScope,
    enabledModules 
  } = useApp();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [tenantDropdownOpen, setTenantDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [mastersMenuOpen, setMastersMenuOpen] = useState(false);

  const profileDropdownRef = React.useRef<HTMLDivElement>(null);
  const tenantDropdownRef = React.useRef<HTMLDivElement>(null);

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
    { name: 'Executive Overview', path: '/dashboard', icon: LayoutGrid, show: true },
    { name: 'Attendance & Production', path: '/dashboard/piece-rate', icon: Scissors, show: isGarments },
    { name: 'Payroll & Compensation', path: '/dashboard/payroll', icon: FileText, show: true },
    { name: 'Accounts', path: '/dashboard/accounts', icon: Wallet, show: true },
  ].filter(item => item.show);

  // Masters Sub-Items
  const masterSubItems = [
    { name: 'Workforce & Employees', path: '/dashboard/employees', icon: UserCheck },
    { name: 'Organization Masters', path: '/dashboard/masters', icon: Landmark },
    { 
      name: isSuperAdmin ? 'Tenants & RBAC' : 'Users & Roles', 
      path: isSuperAdmin ? '/dashboard/tenants' : '/dashboard/users', 
      icon: Shield 
    },
  ];

  const isMasterActive = pathname.startsWith('/dashboard/employees') || 
                         pathname.startsWith('/dashboard/masters') || 
                         pathname.startsWith('/dashboard/tenants') || 
                         pathname.startsWith('/dashboard/users');

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
          {topNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <div key={item.name} className="relative">
                <Link
                  href={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors
                    ${isActive 
                      ? 'text-white bg-slate-900 font-semibold shadow-xs' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'}
                  `}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'}`} />
                    <span className="tracking-tight">{item.name}</span>
                  </div>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  )}
                </Link>
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
            <div className="pt-6 pb-2 px-2">
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
              </div>
            </div>
          )}
        </nav>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-14 items-center justify-between px-6 bg-white border-b border-slate-200/80">
          {/* Left: Mobile Toggle & Rounded Pill Search Bar */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <button 
              className="text-slate-600 lg:hidden p-1.5 rounded-lg bg-white border border-slate-200"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-4 h-4" />
            </button>

            {/* Corporate Search Input */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <input 
                type="text"
                placeholder="Search staff, masters, records..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-50/70 border border-slate-200 text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-slate-800 focus:ring-1 focus:ring-slate-800 transition"
              />
            </div>
          </div>

          {/* Right Controls: Refresh Button, Tenant Switcher, Profile */}
          <div className="flex items-center gap-2.5">
            {/* Refresh Button */}
            <button
              onClick={() => window.location.reload()}
              title="Refresh"
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50 flex items-center justify-center transition shadow-2xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Tenant Switcher Dropdown - Only for Super Admin managing multiple companies */}
            {isSuperAdmin && (
              <div className="relative" ref={tenantDropdownRef}>
                <button
                  onClick={() => setTenantDropdownOpen(!tenantDropdownOpen)}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 focus:outline-none transition"
                >
                  <Building className="w-3.5 h-3.5 text-slate-500" />
                  <span className="max-w-[120px] truncate">{activeTenant?.name || 'Company'}</span>
                  <span className="text-[9px] bg-slate-100 text-slate-700 px-1 py-0.2 rounded font-bold border border-slate-200">Switch</span>
                </button>

                {tenantDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-60 rounded-xl border border-slate-200 bg-white shadow-lg z-50 py-1.5 text-xs">
                    <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                      <span>Switch Company</span>
                      <Link 
                        href="/dashboard/tenants" 
                        onClick={() => setTenantDropdownOpen(false)}
                        className="text-slate-900 hover:underline text-[10px] font-bold"
                      >
                        + New
                      </Link>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      {tenants.map(t => (
                        <button
                          key={t.id}
                          onClick={async () => {
                            setTenantDropdownOpen(false);
                            await switchTenant(t.id);
                          }}
                          className={`
                            w-full text-left px-3 py-2 text-xs flex flex-col hover:bg-slate-50 transition border-b border-slate-50 last:border-0
                            ${activeTenant?.id === t.id ? 'bg-slate-50 font-bold text-slate-900' : 'text-slate-700'}
                          `}
                        >
                          <div className="flex items-center justify-between">
                            <span className="truncate">{t.name}</span>
                            {activeTenant?.id === t.id && (
                              <span className="text-[9px] text-emerald-700 font-bold">Active</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400 font-normal mt-0.5 capitalize">{t.industry?.toLowerCase()}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Avatar */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-8 h-8 rounded-lg bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-2xs hover:bg-slate-800 transition"
              >
                {user.firstName[0]}{user.lastName[0]}
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-52 rounded-xl border border-slate-200 bg-white shadow-lg z-50 py-1 text-xs">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <div className="font-bold text-slate-900">{user.firstName} {user.lastName}</div>
                    <div className="text-slate-400 text-[11px] truncate mt-0.5">{user.email}</div>
                    <div className="mt-1 inline-block text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      {isSuperAdmin ? 'Platform Admin' : 'Tenant Admin'}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-semibold transition"
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
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-5 lg:p-6 flex flex-col justify-between">
          <div className="flex-1">
            {children}
          </div>

          {/* Corporate Footer */}
          <footer className="mt-8 pt-4 pb-2 border-t border-slate-200/80 text-center text-[11px] text-slate-400">
            <span>© 2026 Noltrion Innovations. All rights reserved.</span>
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
