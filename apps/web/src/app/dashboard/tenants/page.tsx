'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { 
  Building, Landmark, Plus, Check, X, Users, 
  ExternalLink, Sparkles, Shield, AlertCircle, Search 
} from 'lucide-react';
import { IndustryType } from '@people-hub/shared-types';
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
  createdAt: string;
  employeeCount?: number;
  userCount?: number;
  managers?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  }[];
}

export default function TenantsManagementPage() {
  const router = useRouter();
  const { accessToken, activeTenant, switchTenant, refreshTenants, isSuperAdmin, loading: authLoading } = useApp();
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
  const [adminFirstName, setAdminFirstName] = useState('');
  const [adminLastName, setAdminLastName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('manager_pass');

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
        setTenants(data);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API fetch tenants failed, using fallback list', e);
    }

    // Mock fallback
    const mockList: CompanyTenant[] = [
      {
        id: 't2222222-2222-2222-2222-222222222222',
        name: 'ABC Garments Ltd',
        slug: 'abc-garments',
        industry: IndustryType.GARMENTS,
        status: 'ACTIVE',
        createdAt: '2026-08-01T00:00:00Z',
        employeeCount: 45,
        userCount: 3,
        managers: [{ id: '1', email: 'priya@garments.com', firstName: 'Priya', lastName: 'Sharma' }]
      },
      {
        id: 't3333333-3333-3333-3333-333333333333',
        name: 'Chennai Logistics Co',
        slug: 'chennai-logistics',
        industry: IndustryType.LOGISTICS,
        status: 'ACTIVE',
        createdAt: '2026-08-10T00:00:00Z',
        employeeCount: 28,
        userCount: 2,
        managers: [{ id: '2', email: 'logistics.admin@peoplehub.com', firstName: 'Ravi', lastName: 'Varma' }]
      }
    ];
    setTenants(mockList);
    setLoading(false);
  };

  useEffect(() => {
    fetchTenants();
  }, [accessToken]);

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
      adminFirstName: adminFirstName.trim(),
      adminLastName: adminLastName.trim(),
      adminEmail: adminEmail.trim(),
      adminPassword: adminPassword.trim(),
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
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to create company');
        setSaving(false);
        return;
      }
    } catch (e: any) {
      console.warn('API error creating tenant, simulating in UI', e);
    }

    // Local mock creation
    const newCompany: CompanyTenant = {
      id: `t-mock-${Date.now()}`,
      name: payload.name,
      slug: payload.slug,
      industry: payload.industry,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      employeeCount: 0,
      userCount: 1,
      managers: [{ id: 'm-1', email: payload.adminEmail, firstName: payload.adminFirstName, lastName: payload.adminLastName }]
    };

    setTenants([newCompany, ...tenants]);
    setSuccessMsg(`Company "${name}" created in test mode! HR Login: ${payload.adminEmail}`);
    setModalOpen(false);
    resetForm();
    setSaving(false);
  };

  const resetForm = () => {
    setName('');
    setSlug('');
    setIndustry(IndustryType.GARMENTS);
    setAdminFirstName('');
    setAdminLastName('');
    setAdminEmail('');
    setAdminPassword('manager_pass');
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

  const filteredTenants = tenants.filter(t => {
    const q = searchQuery.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.slug.toLowerCase().includes(q) ||
      (t.industry || '').toLowerCase().includes(q) ||
      (t.managers || []).some(m => `${m.firstName} ${m.lastName} ${m.email}`.toLowerCase().includes(q))
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / pageSize));
  const paginatedTenants = filteredTenants.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-3">
      {/* Enterprise Toolbar */}
      <EnterpriseToolbar
        title="Tenant Organizations"
        totalCount={filteredTenants.length}
        searchPlaceholder="Search company, slug, manager..."
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        primaryActionLabel="Create Company"
        onPrimaryAction={() => setModalOpen(true)}
      >
        <EnterpriseBadge variant="purple">Super Admin</EnterpriseBadge>
      </EnterpriseToolbar>

      {/* Success / Error Banners */}
      {successMsg && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Enterprise Tenants Table */}
      <EnterpriseTable
        loading={loading}
        isEmpty={filteredTenants.length === 0}
        emptyMessage="No company tenants found matching criteria."
        footer={
          filteredTenants.length > 0 && (
            <EnterprisePagination
              currentPage={currentPage}
              totalItems={filteredTenants.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="companies"
            />
          )
        }
      >
        <table className="w-full text-left border-collapse text-xs">
          <EnterpriseTableHeader>
            <EnterpriseTableTh>Company Organization</EnterpriseTableTh>
            <EnterpriseTableTh>Industry Domain</EnterpriseTableTh>
            <EnterpriseTableTh>Workforce Headcount</EnterpriseTableTh>
            <EnterpriseTableTh>Primary HR Administrator</EnterpriseTableTh>
            <EnterpriseTableTh>Status</EnterpriseTableTh>
            <EnterpriseTableTh align="right">Context Switch</EnterpriseTableTh>
          </EnterpriseTableHeader>
          <EnterpriseTableBody>
            {paginatedTenants.map((t) => {
              const isCurrent = activeTenant?.id === t.id;
              const manager = t.managers?.[0];
              return (
                <EnterpriseTableRow key={t.id} className={isCurrent ? 'bg-slate-50/50' : ''}>
                  <EnterpriseTableTd>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 border border-slate-200">
                        <Building className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 text-xs truncate">
                          {t.name}
                        </div>
                        <div className="text-slate-400 text-[10px]">
                          /{t.slug}
                        </div>
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
                  </EnterpriseTableTd>
                </EnterpriseTableRow>
              );
            })}
          </EnterpriseTableBody>
        </table>
      </EnterpriseTable>

      {/* Modal: Create Company */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary-100 text-primary-700 rounded-lg">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Provision New Company Tenant</h3>
                  <p className="text-[11px] text-slate-400">Set up company profile and primary HR manager</p>
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

            <form onSubmit={handleCreateCompany} className="p-6 space-y-4 text-xs">
              {/* Section 1: Company Info */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">1. Organization Profile</h4>
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">URL Slug *</label>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="e.g. apex-textiles"
                      className="w-full border border-slate-300 rounded-lg p-2.5 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Industry Vertical *</label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value as IndustryType)}
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
                </div>
              </div>

              {/* Section 2: Initial HR Manager Account */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">2. Primary HR Manager Credentials</h4>
                <div className="grid grid-cols-2 gap-3">
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

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="e.g. hr@apextextiles.com"
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Temporary Password *</label>
                    <input
                      type="password"
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-2 shadow"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )}
                  <span>Create Company</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
