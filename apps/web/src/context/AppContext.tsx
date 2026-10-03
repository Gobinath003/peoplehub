'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  UserContext, 
  TenantContext, 
  ActiveRoleContext,
  IndustryType,
  ScopeType
} from '@people-hub/shared-types';
import { API_BASE_URL } from '../config/api';

interface AppContextProps {
  user: UserContext | null;
  activeTenant: TenantContext | null;
  tenants: TenantContext[];
  roles: ActiveRoleContext[];
  permissions: string[];
  enabledModules: string[];
  accessToken: string | null;
  loading: boolean;
  isSuperAdmin: boolean;
  isHRManager: boolean;
  activeBranchScope: string | null;
  login: (email: string, passwordHash: string) => Promise<boolean>;
  logout: () => void;
  switchTenant: (tenantId: string) => Promise<void>;
  updateEnabledModules: (modules: string[]) => void;
  refreshTenants: () => Promise<void>;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserContext | null>(null);
  const [activeTenant, setActiveTenant] = useState<TenantContext | null>(null);
  const [tenants, setTenants] = useState<TenantContext[]>([]);
  const [roles, setRoles] = useState<ActiveRoleContext[]>([]);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Derived role properties
  const isSuperAdmin = roles.some(r => r.roleCode === 'TENANT_ADMIN') || user?.email === 'admin@peoplehub.com';
  const isHRManager = roles.some(r => r.roleCode === 'HR_MANAGER');
  const branchRole = roles.find(r => r.scopeType === ScopeType.BRANCH);
  const activeBranchScope = branchRole ? branchRole.scopeId : null;

  // Load context from local storage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('ph_user');
    const savedActiveTenant = localStorage.getItem('ph_active_tenant');
    const savedTenants = localStorage.getItem('ph_tenants');
    const savedRoles = localStorage.getItem('ph_roles');
    const savedPermissions = localStorage.getItem('ph_permissions');
    const savedModules = localStorage.getItem('ph_modules');
    const savedToken = localStorage.getItem('ph_token');

    if (savedUser && savedToken) {
      setUser(JSON.parse(savedUser));
      setAccessToken(savedToken);
      if (savedActiveTenant) setActiveTenant(JSON.parse(savedActiveTenant));
      if (savedTenants) setTenants(JSON.parse(savedTenants));
      if (savedRoles) setRoles(JSON.parse(savedRoles));
      if (savedPermissions) setPermissions(JSON.parse(savedPermissions));
      if (savedModules) setEnabledModules(JSON.parse(savedModules));
    }
    setLoading(false);
  }, []);

  const login = async (email: string, passwordHash: string): Promise<boolean> => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passwordHash })
      });

      if (response.ok) {
        const data = await response.json();
        saveSession(data);
        router.push('/dashboard');
        return true;
      }
    } catch (e) {
      console.warn('Backend API connection failed, falling back to client-side mock login credentials.', e);
    }

    // Client-Side Mock Fallback
    if (email && passwordHash) {
      const mockUser: UserContext = {
        id: 'u1111111-1111-1111-1111-111111111111',
        email,
        firstName: email.includes('admin') ? 'Super' : 'Priya',
        lastName: email.includes('admin') ? 'Admin' : 'Sharma'
      };
      const mockTenants: TenantContext[] = [
        {
          id: '23ee8399-e03c-4521-9e50-0332e1e1a9e7',
          name: 'ABC Garments Ltd',
          slug: 'abc-garments',
          industry: IndustryType.GARMENTS
        },
        {
          id: 't3333333-3333-3333-3333-333333333333',
          name: 'Chennai Logistics Co',
          slug: 'chennai-logistics',
          industry: IndustryType.LOGISTICS
        }
      ];
      const mockRoles: ActiveRoleContext[] = email.includes('admin') ? [
        {
          roleId: 'r-admin',
          roleCode: 'TENANT_ADMIN',
          scopeType: ScopeType.TENANT,
          scopeId: null
        }
      ] : [
        {
          roleId: 'r-hrm',
          roleCode: 'HR_MANAGER',
          scopeType: ScopeType.BRANCH,
          scopeId: 'Chennai Branch'
        }
      ];
      const mockPermissions = [
        'EMPLOYEE_VIEW', 'EMPLOYEE_CREATE', 'EMPLOYEE_EDIT', 'EMPLOYEE_DELETE',
        'ATTENDANCE_VIEW', 'ATTENDANCE_EDIT', 'ATTENDANCE_REGULARIZE', 'ATTENDANCE_APPROVE',
        'LEAVE_VIEW', 'LEAVE_APPLY', 'LEAVE_APPROVE',
        'PAYROLL_VIEW', 'PAYROLL_PROCESS', 'PAYROLL_APPROVE',
        'TENANT_SETTINGS_VIEW', 'TENANT_SETTINGS_EDIT', 'MODULE_MANAGE', 'AUDIT_LOG_VIEW'
      ];
      const mockModules = [
        'ORGANIZATION', 'EMPLOYEES', 'ATTENDANCE', 'LEAVE', 'SHIFTS', 'PAYROLL', 'DOCUMENTS', 'EXPENSES', 'REPORTS', 'AUDIT', 'PIECE_RATE'
      ];

      const session = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: mockUser,
        activeTenant: mockTenants[0],
        tenants: mockTenants,
        roles: mockRoles,
        permissions: mockPermissions,
        enabledModules: mockModules
      };

      saveSession(session);
      router.push('/dashboard');
      setLoading(false);
      return true;
    }

    setLoading(false);
    return false;
  };

  const logout = () => {
    localStorage.removeItem('ph_user');
    localStorage.removeItem('ph_active_tenant');
    localStorage.removeItem('ph_tenants');
    localStorage.removeItem('ph_roles');
    localStorage.removeItem('ph_permissions');
    localStorage.removeItem('ph_modules');
    localStorage.removeItem('ph_token');
    
    setUser(null);
    setActiveTenant(null);
    setTenants([]);
    setRoles([]);
    setPermissions([]);
    setEnabledModules([]);
    setAccessToken(null);

    router.push('/login');
  };

  const switchTenant = async (tenantId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/auth/switch-tenant`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ tenantId })
      });

      if (response.ok) {
        const data = await response.json();
        saveSession(data);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API Switch tenant failed, performing client-side mock switch.', e);
    }

    // Mock Switch fallback
    const target = tenants.find(t => t.id === tenantId);
    if (target) {
      setActiveTenant(target);
      localStorage.setItem('ph_active_tenant', JSON.stringify(target));
      
      let modules = ['ORGANIZATION', 'EMPLOYEES', 'ATTENDANCE', 'LEAVE', 'SHIFTS', 'PAYROLL', 'DOCUMENTS', 'EXPENSES', 'REPORTS', 'AUDIT'];
      if (target.industry === IndustryType.GARMENTS) modules.push('PIECE_RATE');
      if (target.industry === IndustryType.LOGISTICS) modules.push('DRIVER_ROSTER');

      setEnabledModules(modules);
      localStorage.setItem('ph_modules', JSON.stringify(modules));
    }
    setLoading(false);
  };

  const refreshTenants = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/tenants`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        }
      });
      if (response.ok) {
        const list = await response.json();
        const mappedTenants: TenantContext[] = list.map((t: any) => ({
          id: t.id,
          name: t.name,
          slug: t.slug,
          industry: t.industry
        }));
        setTenants(mappedTenants);
        localStorage.setItem('ph_tenants', JSON.stringify(mappedTenants));
      }
    } catch (e) {
      console.warn('Failed to refresh tenants list', e);
    }
  };

  const updateEnabledModules = (modules: string[]) => {
    setEnabledModules(modules);
    localStorage.setItem('ph_modules', JSON.stringify(modules));
  };

  const saveSession = (data: any) => {
    setUser(data.user);
    setActiveTenant(data.activeTenant);
    setTenants(data.tenants || []);
    setRoles(data.roles || []);
    setPermissions(data.permissions || []);
    setEnabledModules(data.enabledModules || []);
    setAccessToken(data.accessToken);

    localStorage.setItem('ph_user', JSON.stringify(data.user));
    localStorage.setItem('ph_active_tenant', JSON.stringify(data.activeTenant));
    localStorage.setItem('ph_tenants', JSON.stringify(data.tenants || []));
    localStorage.setItem('ph_roles', JSON.stringify(data.roles || []));
    localStorage.setItem('ph_permissions', JSON.stringify(data.permissions || []));
    localStorage.setItem('ph_modules', JSON.stringify(data.enabledModules || []));
    localStorage.setItem('ph_token', data.accessToken);
  };

  return (
    <AppContext.Provider value={{
      user,
      activeTenant,
      tenants,
      roles,
      permissions,
      enabledModules,
      accessToken,
      loading,
      isSuperAdmin,
      isHRManager,
      activeBranchScope,
      login,
      logout,
      switchTenant,
      updateEnabledModules,
      refreshTenants
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
