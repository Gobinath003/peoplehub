'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { 
  Building, Landmark, Plus, Check, X, Users, 
  ExternalLink, Sparkles, Shield, AlertCircle, Search, Download,
  MapPin, Phone, Mail, Globe, FileText, SlidersHorizontal, DollarSign, Clock, Scissors, Banknote
} from 'lucide-react';
import { IndustryType, SalaryType } from '@people-hub/shared-types';
import { exportToExcel } from '../../../utils/excelExport';
import {
  EnterpriseToolbar,
  EnterpriseTable,
  EnterpriseTableHeader,
  EnterpriseTableTh,
  EnterpriseTableBody,
  EnterpriseTableRow,
  EnterpriseTableTd,
  EnterprisePagination,
  EnterpriseBadge,
} from '../../../components/enterprise';

interface CompanyTenant {
  id: string;
  name: string;
  slug: string;
  industry: IndustryType;
  status: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxId?: string | null;
  registrationNo?: string | null;
  createdAt: string;
  employeeCount?: number;
  userCount?: number;
  enabledModules?: string[];
  enabledSalaryTypes?: string[];
  managers?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }[];
}

const PLATFORM_MODULE_CATALOG = [
  { code: 'ORGANIZATION', name: 'Organization Masters', category: 'Core', description: 'Departments, designations, branches & shifts' },
  { code: 'EMPLOYEES', name: 'Workforce & Employees', category: 'Core', description: 'Employee directory, reporting hierarchy & logins' },
  { code: 'LEAVE', name: 'Leave Management', category: 'Core', description: 'Leave types, availability, requests & manager approvals' },
  { code: 'PAYROLL', name: 'Payroll & Compensation', category: 'Core', description: 'Salary structures & automated monthly payslips' },
  { code: 'ACCOUNTS', name: 'Accounts & Ledger', category: 'Finance', description: 'Income, expenses, petty cash & salary advances' },
  { code: 'ATTENDANCE', name: 'Attendance Tracking', category: 'Workforce', description: 'Daily check-in/out logs & attendance tracking' },
  { code: 'SHIFTS', name: 'Shift Scheduling', category: 'Workforce', description: 'Work shift rosters & timings' },
  { code: 'AUDIT', name: 'Audit Trail', category: 'Compliance', description: 'Immutable security & change logs' },
  { code: 'PIECE_RATE', name: 'Piece-Rate & Production', category: 'Industry', description: 'Garment activity rate masters & daily work sheets' },
  { code: 'DRIVER_ROSTER', name: 'Driver Roster & Trips', category: 'Industry', description: 'Fleet logistics trips & driver roster' },
  { code: 'TIMESHEET', name: 'Timesheets', category: 'Industry', description: 'Consultancy billable hours logging' },
  { code: 'MUSTER_ROLL', name: 'Muster Roll', category: 'Industry', description: 'Industrial muster roll & contractor attendance' },
];

function getDefaultModulesForIndustry(industry: IndustryType): string[] {
  const base = ['ORGANIZATION', 'EMPLOYEES', 'LEAVE', 'ATTENDANCE', 'SHIFTS', 'PAYROLL', 'ACCOUNTS', 'AUDIT'];
  if (industry === IndustryType.GARMENTS) return [...base, 'PIECE_RATE'];
  if (industry === IndustryType.LOGISTICS) return [...base, 'DRIVER_ROSTER'];
  if (industry === IndustryType.CONSULTANCY) return [...base, 'TIMESHEET'];
  if (industry === IndustryType.MANUFACTURING || industry === IndustryType.LABOUR) return [...base, 'MUSTER_ROLL'];
  return base;
}

const SALARY_TYPE_CATALOG = [
  { code: SalaryType.MONTHLY_FIXED, name: 'Monthly Fixed Salary', sector: 'IT & Corporate', description: 'Standard fixed monthly salary with Basic, HRA, Allowances & PF/TDS' },
  { code: SalaryType.HOURLY, name: 'Hourly Rate Salary', sector: 'IT / Shift / Part-Time', description: 'Hourly rate billing with logged regular & overtime hours multiplier' },
  { code: SalaryType.PIECE_RATE, name: 'Piece-Rate Output Salary', sector: 'Garments & Production', description: 'Computed from daily verified garment units / piece operations' },
  { code: SalaryType.DAILY_WAGE, name: 'Daily Wage Salary', sector: 'Labour, Logistics & Field', description: 'Fixed per-day wage rate multiplied by days worked in pay cycle' },
];

function getDefaultSalaryTypesForIndustry(industry: IndustryType): string[] {
  switch (industry) {
    case IndustryType.GARMENTS:
      return [SalaryType.MONTHLY_FIXED, SalaryType.PIECE_RATE];
    case IndustryType.CONSULTANCY:
    case IndustryType.CORPORATE:
      return [SalaryType.MONTHLY_FIXED, SalaryType.HOURLY];
    case IndustryType.MANUFACTURING:
      return [SalaryType.MONTHLY_FIXED, SalaryType.HOURLY, SalaryType.PIECE_RATE, SalaryType.DAILY_WAGE];
    case IndustryType.LABOUR:
    case IndustryType.LOGISTICS:
      return [SalaryType.MONTHLY_FIXED, SalaryType.HOURLY, SalaryType.DAILY_WAGE];
    default:
      return [SalaryType.MONTHLY_FIXED, SalaryType.HOURLY];
  }
}

export default function TenantsManagementPage() {
  const router = useRouter();
  const { accessToken, activeTenant, switchTenant, refreshTenants, updateEnabledModules, updateTenantSalaryTypes, isSuperAdmin, loading: authLoading } = useApp();
  const [tenants, setTenants] = useState<CompanyTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.replace('/dashboard/users');
    }
  }, [authLoading, isSuperAdmin, router]);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [industry, setIndustry] = useState<IndustryType>(IndustryType.GARMENTS);
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [taxId, setTaxId] = useState('');
  const [registrationNo, setRegistrationNo] = useState('');

  // Primary HR Manager State
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('manager_pass');
  const [selectedModules, setSelectedModules] = useState<string[]>(getDefaultModulesForIndustry(IndustryType.GARMENTS));
  const [selectedSalaryTypes, setSelectedSalaryTypes] = useState<string[]>(getDefaultSalaryTypesForIndustry(IndustryType.GARMENTS));

  // Existing Tenant Salary Category Configuration Modal State
  const [salaryModalTenant, setSalaryModalTenant] = useState<CompanyTenant | null>(null);
  const [modalSalaryTypes, setModalSalaryTypes] = useState<string[]>([]);
  const [loadingSalaryTypes, setLoadingSalaryTypes] = useState(false);
  const [savingSalaryTypes, setSavingSalaryTypes] = useState(false);

  // Existing Tenant Module Configuration Modal State
  const [moduleModalTenant, setModuleModalTenant] = useState<CompanyTenant | null>(null);
  const [modalModules, setModalModules] = useState<string[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [savingModules, setSavingModules] = useState(false);

  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/tenants`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTenants(Array.isArray(data) ? data : []);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API fetch tenants failed', e);
    }

    setTenants([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTenants();
  }, [accessToken]);

  const resetForm = () => {
    setName('');
    setSlug('');
    setIndustry(IndustryType.GARMENTS);
    setAddress('');
    setPhone('');
    setCompanyEmail('');
    setWebsite('');
    setTaxId('');
    setRegistrationNo('');
    setAdminFirstName('');
    setAdminLastName('');
    setAdminEmail('');
    setAdminPassword('manager_pass');
    setSelectedModules(getDefaultModulesForIndustry(IndustryType.GARMENTS));
    setSelectedSalaryTypes(getDefaultSalaryTypesForIndustry(IndustryType.GARMENTS));
  };

  const toggleCreateSalaryType = (code: string) => {
    setSelectedSalaryTypes((prev) => {
      if (prev.includes(code)) {
        if (prev.length <= 1) return prev; // keep at least one compensation model
        return prev.filter((c) => c !== code);
      }
      return [...prev, code];
    });
  };

  const handleOpenSalaryConfig = async (tenant: CompanyTenant) => {
    setSalaryModalTenant(tenant);
    setModalSalaryTypes(tenant.enabledSalaryTypes || getDefaultSalaryTypesForIndustry(tenant.industry));
    setErrorMsg(null);
    setLoadingSalaryTypes(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenant.id}/salary-types`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.enabledSalaryTypes) && data.enabledSalaryTypes.length > 0) {
          setModalSalaryTypes(data.enabledSalaryTypes);
        }
      }
    } catch (e) {
      console.warn('Failed to load tenant salary types', e);
    } finally {
      setLoadingSalaryTypes(false);
    }
  };

  const handleSaveSalaryConfig = async () => {
    if (!salaryModalTenant || modalSalaryTypes.length === 0) return;
    setSavingSalaryTypes(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${salaryModalTenant.id}/salary-types`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ enabledSalaryTypes: modalSalaryTypes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update tenant salary categories');
      }
      const data = await res.json();
      const savedTypes = Array.isArray(data?.enabledSalaryTypes) ? data.enabledSalaryTypes : modalSalaryTypes;
      updateTenantSalaryTypes(salaryModalTenant.id, savedTypes);
      setSuccessMsg(`Updated salary categories for "${salaryModalTenant.name}" (${savedTypes.length} active pay models).`);
      setSalaryModalTenant(null);
      await fetchTenants();
      await refreshTenants();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to update salary categories');
    } finally {
      setSavingSalaryTypes(false);
    }
  };

  const toggleCreateModule = (code: string) => {
    setSelectedModules((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleOpenModuleConfig = async (tenant: CompanyTenant) => {
    setModuleModalTenant(tenant);
    setModalModules(tenant.enabledModules || []);
    setLoadingModules(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${tenant.id}/modules`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (res.ok) {
        const list = await res.json();
        setModalModules(
          Array.isArray(list) ? list.filter((m: any) => m.isEnabled).map((m: any) => m.moduleCode) : []
        );
      }
    } catch (e) {
      console.warn('Failed to load tenant modules', e);
    } finally {
      setLoadingModules(false);
    }
  };

  const handleSaveModuleConfig = async () => {
    if (!moduleModalTenant) return;
    setSavingModules(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/tenants/${moduleModalTenant.id}/modules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ enabledModules: modalModules }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to update tenant module visibility');
      }
      if (activeTenant?.id === moduleModalTenant.id) {
        updateEnabledModules(modalModules);
      }
      setSuccessMsg(`Updated module visibility for "${moduleModalTenant.name}" (${modalModules.length} active modules).`);
      setModuleModalTenant(null);
      await fetchTenants();
      await refreshTenants();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to update module visibility');
    } finally {
      setSavingModules(false);
    }
  };

  // Automatically open creation modal if ?create=true is in URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('create') === 'true') {
        resetForm();
        setModalOpen(true);
      }
    }
  }, []);

  // Auto-generate slug from name
  const handleNameChange = (val: string) => {
    setName(val);
    const generatedSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    setSlug(generatedSlug);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      industry,
      address: address.trim() || undefined,
      phone: phone.trim() || undefined,
      email: companyEmail.trim() || undefined,
      website: website.trim() || undefined,
      taxId: taxId.trim() || undefined,
      registrationNo: registrationNo.trim() || undefined,
      adminFirstName: adminFirstName.trim(),
      adminLastName: adminLastName.trim(),
      adminEmail: adminEmail.trim(),
      adminPassword: adminPassword.trim(),
      enabledModules: selectedModules,
      enabledSalaryTypes: selectedSalaryTypes,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/tenants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg(`Company "${name}" and HR Manager account created successfully!`);
        await fetchTenants();
        await refreshTenants();
        setModalOpen(false);
        resetForm();
        setSaving(false);
        return;
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || 'Failed to create company');
        setSaving(false);
        return;
      }
    } catch (e: any) {
      console.warn('API error creating tenant', e);
      setErrorMsg(e.message || 'Failed to create company via API');
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center max-w-md shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-800 mx-auto mb-4">
            <Shield className="w-6 h-6 text-slate-700" />
          </div>
          <h2 className="text-lg font-black text-slate-900 mb-2">Access Restricted</h2>
          <p className="text-xs text-slate-500 font-medium mb-4">
            Tenant provisioning and global multi-tenant management are restricted to Platform Super Administrators.
          </p>
          <button
            onClick={() => router.replace('/dashboard/users')}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            Go to Users & Roles
          </button>
        </div>
      </div>
    );
  }

  // Filtered tenants calculation
  const filteredTenants = tenants.filter((t) => {
    const query = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(query) ||
      t.slug.toLowerCase().includes(query) ||
      t.industry.toLowerCase().includes(query) ||
      (t.address && t.address.toLowerCase().includes(query)) ||
      (t.taxId && t.taxId.toLowerCase().includes(query)) ||
      (t.managers && t.managers.some((m) => `${m.firstName} ${m.lastName}`.toLowerCase().includes(query) || m.email.toLowerCase().includes(query)))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const paginatedTenants = filteredTenants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExportExcel = () => {
    if (filteredTenants.length === 0) return;
    exportToExcel({
      filename: `Tenants_Directory_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Tenants Directory',
      reportTitle: 'Multi-Tenant Company Master Directory',
      columns: [
        { header: 'Company Name', accessor: 'name' },
        { header: 'URL Slug', accessor: 'slug' },
        { header: 'Industry Vertical', accessor: 'industry' },
        { header: 'Registered Address', accessor: (r) => r.address || '-' },
        { header: 'Official Phone', accessor: (r) => r.phone || '-' },
        { header: 'Official Email', accessor: (r) => r.email || '-' },
        { header: 'GSTIN / Tax ID', accessor: (r) => r.taxId || '-' },
        { header: 'CIN / Reg No', accessor: (r) => r.registrationNo || '-' },
        { header: 'Website', accessor: (r) => r.website || '-' },
        { header: 'Headcount', accessor: (r) => r.employeeCount || 0 },
        { header: 'Primary HR Manager', accessor: (r) => r.managers?.[0]?.email || 'Unassigned' },
        { header: 'Status', accessor: 'status' },
      ],
      data: filteredTenants,
    });
  };

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Tenant Management & Creation
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Provision and create enterprise client companies with complete legal profile, address, phone, email, and administrator credentials.
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setModalOpen(true);
          }}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>+ Create New Tenant</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Action Toolbar */}
      <EnterpriseToolbar
        title="Enterprise Tenants"
        totalCount={filteredTenants.length}
        searchPlaceholder="Search companies by name, slug, address, GSTIN, manager..."
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        filters={
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={filteredTenants.length === 0}
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 text-xs font-medium shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Excel</span>
          </button>
        }
      />

      {/* Companies Enterprise Table */}
      <EnterpriseTable
        loading={loading}
        isEmpty={filteredTenants.length === 0}
        emptyMessage="No companies registered in platform matching search."
        footer={
          filteredTenants.length > 0 && (
            <EnterprisePagination
              currentPage={currentPage}
              totalItems={filteredTenants.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          )
        }
      >
        <table className="w-full text-left border-collapse text-xs">
          <EnterpriseTableHeader>
            <EnterpriseTableTh>Company Organization</EnterpriseTableTh>
            <EnterpriseTableTh>Registered Contact & Address</EnterpriseTableTh>
            <EnterpriseTableTh>Industry Domain</EnterpriseTableTh>
            <EnterpriseTableTh>Headcount</EnterpriseTableTh>
            <EnterpriseTableTh>Primary HR Administrator</EnterpriseTableTh>
            <EnterpriseTableTh>Status</EnterpriseTableTh>
            <EnterpriseTableTh align="right">Modules & Context</EnterpriseTableTh>
          </EnterpriseTableHeader>
          <EnterpriseTableBody>
            {paginatedTenants.map((t) => {
              const isCurrent = activeTenant?.id === t.id;
              const manager = t.managers?.[0];
              return (
                <EnterpriseTableRow key={t.id} className={isCurrent ? 'bg-slate-50/50' : ''}>
                  <EnterpriseTableTd>
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200 mt-0.5">
                        <Building className="w-4 h-4 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate">
                          {t.name}
                        </div>
                        <div className="text-slate-400 text-[10px] font-mono">
                          /{t.slug}
                        </div>
                        {t.taxId && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            <span className="font-semibold text-slate-600">GSTIN:</span> {t.taxId}
                          </div>
                        )}
                      </div>
                    </div>
                  </EnterpriseTableTd>

                  <EnterpriseTableTd>
                    <div className="space-y-0.5 max-w-xs">
                      {t.address ? (
                        <div className="text-slate-700 text-[11px] truncate flex items-center gap-1" title={t.address}>
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{t.address}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[10px]">No address registered</span>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-slate-500">
                        {t.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-2.5 h-2.5 text-slate-400" />
                            <span>{t.phone}</span>
                          </span>
                        )}
                        {t.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-2.5 h-2.5 text-slate-400" />
                            <span>{t.email}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </EnterpriseTableTd>

                  <EnterpriseTableTd>
                    <EnterpriseBadge
                      variant={
                        t.industry === IndustryType.GARMENTS
                          ? 'warning'
                          : t.industry === IndustryType.LOGISTICS
                          ? 'info'
                          : 'neutral'
                      }
                    >
                      {t.industry?.toLowerCase()}
                    </EnterpriseBadge>
                  </EnterpriseTableTd>

                  <EnterpriseTableTd>
                    <span className="font-semibold text-slate-800 text-xs">
                      {t.employeeCount || 0}
                    </span>
                    <span className="text-[11px] text-slate-400 ml-1">staff</span>
                  </EnterpriseTableTd>

                  <EnterpriseTableTd>
                    {manager ? (
                      <div>
                        <span className="font-medium text-slate-800 block text-xs">
                          {manager.firstName} {manager.lastName}
                        </span>
                        <span className="text-slate-400 text-[10px] block">
                          {manager.email}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                    )}
                  </EnterpriseTableTd>

                  <EnterpriseTableTd>
                    {t.status === 'ACTIVE' ? (
                      <EnterpriseBadge variant="success">Active</EnterpriseBadge>
                    ) : (
                      <EnterpriseBadge variant="neutral">{t.status}</EnterpriseBadge>
                    )}
                  </EnterpriseTableTd>

                  <EnterpriseTableTd align="right">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenModuleConfig(t)}
                        title="Configure Enabled Modules"
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 transition inline-flex items-center gap-1 shadow-2xs"
                      >
                        <SlidersHorizontal className="w-3 h-3 text-emerald-600" />
                        <span>{t.enabledModules ? `${t.enabledModules.length} Modules` : 'Modules'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenSalaryConfig(t)}
                        title="Configure Allowed Employee Salary Categories"
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 transition inline-flex items-center gap-1 shadow-2xs"
                      >
                        <DollarSign className="w-3 h-3 text-indigo-600" />
                        <span>{t.enabledSalaryTypes ? `${t.enabledSalaryTypes.length} Pay Models` : 'Pay Models'}</span>
                      </button>
                      {isCurrent ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Active Context</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => switchTenant(t.id)}
                          className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 transition inline-flex items-center gap-1.5 shadow-2xs"
                        >
                          <span>Switch</span>
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </button>
                      )}
                    </div>
                  </EnterpriseTableTd>
                </EnterpriseTableRow>
              );
            })}
          </EnterpriseTableBody>
        </table>
      </EnterpriseTable>

      {/* Modal: Provision Company Tenant */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Create New Company Tenant</h3>
                  <p className="text-[11px] text-slate-400">Configure complete company profile, address, contact details, tax IDs, and primary administrator</p>
                </div>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateCompany} className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
              {/* Section 1: Organization & Identity */}
              <div className="space-y-3">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-indigo-600" />
                  <span>1. Organization & Legal Identity</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. Apex Textiles Ltd"
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">URL Identifier / Slug *</label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="e.g. apex-textiles"
                      className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Industry Vertical *</label>
                    <select
                      value={industry}
                      onChange={(e) => {
                        const nextInd = e.target.value as IndustryType;
                        setIndustry(nextInd);
                        setSelectedModules(getDefaultModulesForIndustry(nextInd));
                        setSelectedSalaryTypes(getDefaultSalaryTypesForIndustry(nextInd));
                      }}
                      className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    >
                      <option value={IndustryType.GARMENTS}>Garments & Apparel</option>
                      <option value={IndustryType.MANUFACTURING}>Manufacturing</option>
                      <option value={IndustryType.LOGISTICS}>Logistics & Transport</option>
                      <option value={IndustryType.CONSULTANCY}>Consultancy & IT</option>
                      <option value={IndustryType.LABOUR}>Labour Intensive</option>
                      <option value={IndustryType.CORPORATE}>Corporate / Office</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">GSTIN / Tax ID</label>
                    <input
                      type="text"
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value.toUpperCase())}
                      placeholder="e.g. 33AABCA1234F1Z8"
                      className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">CIN / Registration No</label>
                    <input
                      type="text"
                      value={registrationNo}
                      onChange={(e) => setRegistrationNo(e.target.value.toUpperCase())}
                      placeholder="e.g. U18101TN2020PTC123456"
                      className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Registered Address & Communication */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>2. Registered Office & Communication Details</span>
                </h4>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Registered Address / Facility Location</label>
                  <textarea
                    rows={2}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Plot No. 42-45, Guindy Industrial Estate, Chennai - 600032, Tamil Nadu"
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Official Phone</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g. +91 44 2250 1890"
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Official Company Email</label>
                    <input
                      type="email"
                      value={companyEmail}
                      onChange={(e) => setCompanyEmail(e.target.value)}
                      placeholder="e.g. info@apextextiles.com"
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Website URL</label>
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="e.g. https://www.apextextiles.com"
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Primary HR Administrator Credentials */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-600" />
                  <span>3. Primary HR Administrator Credentials</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={adminFirstName}
                      onChange={(e) => setAdminFirstName(e.target.value)}
                      placeholder="e.g. Rajesh"
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={adminLastName}
                      onChange={(e) => setAdminLastName(e.target.value)}
                      placeholder="e.g. Kumar"
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Manager Login Email *</label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="e.g. hr.rajesh@apextextiles.com"
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Initial Password *</label>
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Feature & Module Visibility Controls */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" />
                      <span>4. Module Visibility for Tenant Admin & Users</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Select which modules appear in navigation and features for this tenant&apos;s administrators and workforce ({selectedModules.length} of {PLATFORM_MODULE_CATALOG.length} active).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedModules(PLATFORM_MODULE_CATALOG.map((m) => m.code))}
                      className="px-2 py-1 text-[10px] font-bold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModules(getDefaultModulesForIndustry(industry))}
                      className="px-2 py-1 text-[10px] font-bold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      Industry Default
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedModules(['ORGANIZATION', 'EMPLOYEES', 'LEAVE'])}
                      className="px-2 py-1 text-[10px] font-bold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      Core + Leave Only
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {PLATFORM_MODULE_CATALOG.map((mod) => {
                    const checked = selectedModules.includes(mod.code);
                    return (
                      <button
                        key={mod.code}
                        type="button"
                        onClick={() => toggleCreateModule(mod.code)}
                        className={`text-left p-2.5 rounded-xl border transition flex items-start gap-2.5 ${
                          checked
                            ? 'border-emerald-500 bg-emerald-50/60 text-slate-900 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          checked ? 'bg-slate-900 border-slate-900 text-emerald-400' : 'border-slate-300 bg-white'
                        }`}>
                          {checked && <Check className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-[11px] truncate text-slate-800">{mod.name}</div>
                          <div className="text-[10px] text-slate-500 truncate">{mod.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Section 5: Employee Compensation & Salary Categories */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                      <span>5. Employee Compensation &amp; Salary Categories</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Choose which salary options are available during Employee Creation &amp; Payroll ({selectedSalaryTypes.length} of {SALARY_TYPE_CATALOG.length} active).
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedSalaryTypes(SALARY_TYPE_CATALOG.map((s) => s.code))}
                      className="px-2 py-1 text-[10px] font-bold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      Enable All 4
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSalaryTypes(getDefaultSalaryTypesForIndustry(industry))}
                      className="px-2 py-1 text-[10px] font-bold rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      Industry Default
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SALARY_TYPE_CATALOG.map((stype) => {
                    const checked = selectedSalaryTypes.includes(stype.code);
                    return (
                      <button
                        key={stype.code}
                        type="button"
                        onClick={() => toggleCreateSalaryType(stype.code)}
                        className={`text-left p-2.5 rounded-xl border transition flex items-start gap-2.5 ${
                          checked
                            ? 'border-indigo-500 bg-indigo-50/70 text-slate-900 shadow-2xs'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          checked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {checked && <Check className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-[11px] text-slate-800">{stype.name}</span>
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{stype.sector}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{stype.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 shadow text-xs transition"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Create & Provision Tenant</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Configure Enabled Modules for Existing Tenant */}
      {moduleModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 text-emerald-400 rounded-lg">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Module Visibility — {moduleModalTenant.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add or remove modules visible to Tenant Admin and employees in this tenant.
                  </p>
                </div>
              </div>
              <button onClick={() => setModuleModalTenant(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-600 font-semibold">
                  {modalModules.length} of {PLATFORM_MODULE_CATALOG.length} modules enabled
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setModalModules(PLATFORM_MODULE_CATALOG.map((m) => m.code))}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Enable All
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalModules(getDefaultModulesForIndustry(moduleModalTenant.industry))}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Reset Industry Default
                  </button>
                </div>
              </div>

              {loadingModules ? (
                <div className="py-10 text-center text-slate-400 font-medium">Loading registered tenant modules...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[55vh] overflow-y-auto pr-1">
                  {PLATFORM_MODULE_CATALOG.map((mod) => {
                    const active = modalModules.includes(mod.code);
                    return (
                      <button
                        key={mod.code}
                        type="button"
                        onClick={() =>
                          setModalModules((prev) =>
                            prev.includes(mod.code) ? prev.filter((c) => c !== mod.code) : [...prev, mod.code]
                          )
                        }
                        className={`text-left p-3 rounded-xl border transition flex items-start gap-2.5 ${
                          active
                            ? 'border-emerald-500 bg-emerald-50/70 text-slate-900'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          active ? 'bg-slate-900 border-slate-900 text-emerald-400' : 'border-slate-300 bg-white'
                        }`}>
                          {active && <Check className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-800">{mod.name}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{mod.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModuleModalTenant(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingModules || loadingModules}
                  onClick={handleSaveModuleConfig}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 shadow text-xs transition"
                >
                  {savingModules ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Check className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Save Module Configuration</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Configure Allowed Salary Categories for Existing Tenant */}
      {salaryModalTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Salary Categories — {salaryModalTenant.name}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add or remove compensation models shown during Employee Creation &amp; Payroll.
                  </p>
                </div>
              </div>
              <button onClick={() => setSalaryModalTenant(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-600 font-semibold">
                  {modalSalaryTypes.length} of {SALARY_TYPE_CATALOG.length} pay models enabled
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setModalSalaryTypes(SALARY_TYPE_CATALOG.map((s) => s.code))}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Enable All 4
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalSalaryTypes([SalaryType.MONTHLY_FIXED, SalaryType.HOURLY])}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Fixed + Hourly
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalSalaryTypes(getDefaultSalaryTypesForIndustry(salaryModalTenant.industry))}
                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Industry Default
                  </button>
                </div>
              </div>

              {loadingSalaryTypes ? (
                <div className="py-10 text-center text-slate-400 font-medium">Loading tenant compensation configuration...</div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {SALARY_TYPE_CATALOG.map((stype) => {
                    const active = modalSalaryTypes.includes(stype.code);
                    return (
                      <button
                        key={stype.code}
                        type="button"
                        onClick={() =>
                          setModalSalaryTypes((prev) => {
                            if (prev.includes(stype.code)) {
                              if (prev.length <= 1) return prev;
                              return prev.filter((c) => c !== stype.code);
                            }
                            return [...prev, stype.code];
                          })
                        }
                        className={`text-left p-3.5 rounded-xl border transition flex items-start gap-3 ${
                          active
                            ? 'border-indigo-500 bg-indigo-50/70 text-slate-900'
                            : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                          active ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {active && <Check className="w-3 h-3" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs text-slate-800">{stype.name}</span>
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500">
                              {stype.sector}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{stype.description}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setSalaryModalTenant(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingSalaryTypes || loadingSalaryTypes || modalSalaryTypes.length === 0}
                  onClick={handleSaveSalaryConfig}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow text-xs transition"
                >
                  {savingSalaryTypes ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Check className="w-4 h-4 text-white" />
                  )}
                  <span>Save Salary Categories</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
