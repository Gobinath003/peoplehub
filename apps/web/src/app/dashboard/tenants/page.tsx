'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { 
  Building, Landmark, Plus, Check, X, Users, 
  ExternalLink, Sparkles, Shield, AlertCircle, Search, Download,
  MapPin, Phone, Mail, Globe, FileText
} from 'lucide-react';
import { IndustryType } from '@people-hub/shared-types';
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
            <EnterpriseTableTh align="right">Context Switch</EnterpriseTableTh>
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

    </div>
  );
}
