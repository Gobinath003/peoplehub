'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import {
  DepartmentDto,
  DesignationDto,
  BranchDto,
  ShiftDto,
  EmploymentTypeDto,
  MasterBundleDto,
} from '@people-hub/shared-types';
import {
  Building2,
  Briefcase,
  MapPin,
  Clock,
  Tag,
  Plus,
  Search,
  Check,
  X,
  Layers,
  AlertCircle,
  Users,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  SlidersHorizontal,
  Download,
} from 'lucide-react';
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
  EnterpriseTabs,
  EnterpriseTabItem,
} from '../../../components/enterprise';

type MasterTab = 'departments' | 'designations' | 'branches' | 'shifts' | 'employmentTypes';

export default function MastersPage() {
  const { activeTenant, accessToken } = useApp();
  const [activeTab, setActiveTab] = useState<MasterTab>('departments');
  const [bundle, setBundle] = useState<MasterBundleDto>({
    departments: [],
    designations: [],
    branches: [],
    shifts: [],
    employmentTypes: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<MasterTab>('departments');

  // Department Form
  const [deptCode, setDeptCode] = useState('');
  const [deptName, setDeptName] = useState('');
  const [deptDesc, setDeptDesc] = useState('');

  // Designation Form
  const [desigCode, setDesigCode] = useState('');
  const [desigName, setDesigName] = useState('');
  const [desigDeptId, setDesigDeptId] = useState('');
  const [desigDesc, setDesigDesc] = useState('');

  // Branch Form
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchType, setBranchType] = useState('FACTORY_UNIT');
  const [branchCity, setBranchCity] = useState('');
  const [branchState, setBranchState] = useState('');
  const [branchAddress, setBranchAddress] = useState('');

  // Shift Form
  const [shiftCode, setShiftCode] = useState('');
  const [shiftName, setShiftName] = useState('');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('18:00');
  const [shiftBreak, setShiftBreak] = useState('60');

  // Employment Type Form
  const [empTypeCode, setEmpTypeCode] = useState('');
  const [empTypeName, setEmpTypeName] = useState('');
  const [empTypeDesc, setEmpTypeDesc] = useState('');

  const [saving, setSaving] = useState(false);

  // Fetch all master data
  const fetchMasters = async () => {
    if (!activeTenant) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/masters/bundle`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id,
        },
      });

      if (res.ok) {
        const data: MasterBundleDto = await res.json();
        setBundle(data);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API fetch failed for masters', e);
    }

    setBundle({
      departments: [],
      designations: [],
      branches: [],
      shifts: [],
      employmentTypes: [],
    });
    setLoading(false);
  };

  useEffect(() => {
    fetchMasters();
  }, [activeTenant, accessToken]);

  const openCreateModal = (type: MasterTab) => {
    setModalType(type);
    if (type === 'departments') {
      setDeptCode(`DEPT-${(bundle.departments.length + 1).toString().padStart(2, '0')}`);
      setDeptName('');
      setDeptDesc('');
    } else if (type === 'designations') {
      setDesigCode(`DESIG-${(bundle.designations.length + 1).toString().padStart(2, '0')}`);
      setDesigName('');
      setDesigDeptId(bundle.departments[0]?.id || '');
      setDesigDesc('');
    } else if (type === 'branches') {
      setBranchCode(`BR-${(bundle.branches.length + 1).toString().padStart(2, '0')}`);
      setBranchName('');
      setBranchType('FACTORY_UNIT');
      setBranchCity('');
      setBranchState('Tamil Nadu');
      setBranchAddress('');
    } else if (type === 'shifts') {
      setShiftCode(`SH-${(bundle.shifts.length + 1).toString().padStart(2, '0')}`);
      setShiftName('');
      setShiftStart('09:00');
      setShiftEnd('18:00');
      setShiftBreak('60');
    } else if (type === 'employmentTypes') {
      setEmpTypeCode(`ET-${(bundle.employmentTypes.length + 1).toString().padStart(2, '0')}`);
      setEmpTypeName('');
      setEmpTypeDesc('');
    }
    setModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    setSaving(true);
    setErrorMsg(null);

    let endpoint = '';
    let body: any = {};

    if (modalType === 'departments') {
      endpoint = `${API_BASE_URL}/api/v1/masters/departments`;
      body = { code: deptCode, name: deptName, description: deptDesc };
    } else if (modalType === 'designations') {
      endpoint = `${API_BASE_URL}/api/v1/masters/designations`;
      body = { code: desigCode, name: desigName, departmentId: desigDeptId || undefined, description: desigDesc };
    } else if (modalType === 'branches') {
      endpoint = `${API_BASE_URL}/api/v1/masters/branches`;
      body = { code: branchCode, name: branchName, type: branchType, city: branchCity, state: branchState, address: branchAddress };
    } else if (modalType === 'shifts') {
      endpoint = `${API_BASE_URL}/api/v1/masters/shifts`;
      body = { code: shiftCode, name: shiftName, startTime: shiftStart, endTime: shiftEnd, breakMinutes: Number(shiftBreak) };
    } else if (modalType === 'employmentTypes') {
      endpoint = `${API_BASE_URL}/api/v1/masters/employment-types`;
      body = { code: empTypeCode, name: empTypeName, description: empTypeDesc };
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to create master entry');
      }

      setSuccessMsg(`Successfully created new ${modalType.slice(0, -1)} master record!`);
      setModalOpen(false);
      await fetchMasters();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error creating master entry');
    } finally {
      setSaving(false);
    }
  };

  // Filter items by search
  const filteredDepartments = bundle.departments.filter(
    (d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDesignations = bundle.designations.filter(
    (d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()) || d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBranches = bundle.branches.filter(
    (b) => b.name.toLowerCase().includes(searchQuery.toLowerCase()) || b.code.toLowerCase().includes(searchQuery.toLowerCase()) || (b.city && b.city.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredShifts = bundle.shifts.filter(
    (s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredEmploymentTypes = bundle.employmentTypes.filter(
    (e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()) || e.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const getActiveList = () => {
    switch (activeTab) {
      case 'departments': return filteredDepartments;
      case 'designations': return filteredDesignations;
      case 'branches': return filteredBranches;
      case 'shifts': return filteredShifts;
      case 'employmentTypes': return filteredEmploymentTypes;
    }
  };

  const activeList = getActiveList();
  const totalPages = Math.max(1, Math.ceil(activeList.length / pageSize));
  const paginatedDepartments = filteredDepartments.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedDesignations = filteredDesignations.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedBranches = filteredBranches.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedShifts = filteredShifts.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const paginatedEmploymentTypes = filteredEmploymentTypes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tabs = [
    { key: 'departments' as MasterTab, label: 'Departments', count: bundle.departments.length, icon: Building2 },
    { key: 'designations' as MasterTab, label: 'Designations', count: bundle.designations.length, icon: Briefcase },
    { key: 'branches' as MasterTab, label: 'Branches & Units', count: bundle.branches.length, icon: MapPin },
    { key: 'shifts' as MasterTab, label: 'Work Shifts', count: bundle.shifts.length, icon: Clock },
    { key: 'employmentTypes' as MasterTab, label: 'Employment Types', count: bundle.employmentTypes.length, icon: Tag },
  ];

  const getActionLabel = () => {
    switch (activeTab) {
      case 'departments': return 'Add Department';
      case 'designations': return 'Add Designation';
      case 'branches': return 'Add Branch';
      case 'shifts': return 'Add Shift';
      case 'employmentTypes': return 'Add Type';
    }
  };

  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const tenantSlug = activeTenant?.slug || 'export';

    switch (activeTab) {
      case 'departments':
        exportToExcel({
          filename: `Departments_${tenantSlug}_${dateStr}`,
          sheetName: 'Departments',
          columns: [
            { header: 'Code', accessor: 'code' },
            { header: 'Name', accessor: 'name' },
            { header: 'Description', accessor: (r) => r.description || '-' },
            { header: 'Headcount', accessor: (r) => r.employeeCount ?? 0 },
            { header: 'Status', accessor: (r) => r.isActive ? 'Active' : 'Inactive' },
          ],
          data: filteredDepartments,
        });
        break;
      case 'designations':
        exportToExcel({
          filename: `Designations_${tenantSlug}_${dateStr}`,
          sheetName: 'Designations',
          columns: [
            { header: 'Code', accessor: 'code' },
            { header: 'Name', accessor: 'name' },
            { header: 'Department', accessor: (r) => r.departmentName || '-' },
            { header: 'Description', accessor: (r) => r.description || '-' },
            { header: 'Headcount', accessor: (r) => r.employeeCount ?? 0 },
            { header: 'Status', accessor: (r) => r.isActive ? 'Active' : 'Inactive' },
          ],
          data: filteredDesignations,
        });
        break;
      case 'branches':
        exportToExcel({
          filename: `Branches_${tenantSlug}_${dateStr}`,
          sheetName: 'Branches',
          columns: [
            { header: 'Code', accessor: 'code' },
            { header: 'Name', accessor: 'name' },
            { header: 'Type', accessor: (r) => r.type?.replace('_', ' ') || '-' },
            { header: 'City', accessor: (r) => r.city || '-' },
            { header: 'State', accessor: (r) => r.state || '-' },
            { header: 'Address', accessor: (r) => r.address || '-' },
            { header: 'Headcount', accessor: (r) => r.employeeCount ?? 0 },
            { header: 'Status', accessor: (r) => r.isActive ? 'Active' : 'Inactive' },
          ],
          data: filteredBranches,
        });
        break;
      case 'shifts':
        exportToExcel({
          filename: `Shifts_${tenantSlug}_${dateStr}`,
          sheetName: 'Shifts',
          columns: [
            { header: 'Code', accessor: 'code' },
            { header: 'Name', accessor: 'name' },
            { header: 'Start Time', accessor: 'startTime' },
            { header: 'End Time', accessor: 'endTime' },
            { header: 'Break (mins)', accessor: 'breakMinutes' },
            { header: 'Headcount', accessor: (r) => r.employeeCount ?? 0 },
            { header: 'Status', accessor: (r) => r.isActive ? 'Active' : 'Inactive' },
          ],
          data: filteredShifts,
        });
        break;
      case 'employmentTypes':
        exportToExcel({
          filename: `Employment_Types_${tenantSlug}_${dateStr}`,
          sheetName: 'Employment Types',
          columns: [
            { header: 'Code', accessor: 'code' },
            { header: 'Name', accessor: 'name' },
            { header: 'Description', accessor: (r) => r.description || '-' },
            { header: 'Headcount', accessor: (r) => r.employeeCount ?? 0 },
            { header: 'Status', accessor: (r) => r.isActive ? 'Active' : 'Inactive' },
          ],
          data: filteredEmploymentTypes,
        });
        break;
    }
  };

  return (
    <div className="space-y-3">
      {/* Enterprise Toolbar */}
      <EnterpriseToolbar
        title="Organization Masters"
        totalCount={activeList.length}
        tenantName={activeTenant?.name}
        searchPlaceholder={`Search ${activeTab}...`}
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        filters={
          <button
            type="button"
            onClick={handleExportExcel}
            title="Download Excel (.xlsx)"
            className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 text-xs font-medium shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export Excel</span>
          </button>
        }
        primaryActionLabel={getActionLabel()}
        onPrimaryAction={() => openCreateModal(activeTab)}
      />

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

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Enterprise Tabs */}
      <EnterpriseTabs
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabKey) => {
          setActiveTab(tabKey);
          setCurrentPage(1);
        }}
      />

      {/* Enterprise Master Content Table */}
      <EnterpriseTable
        loading={loading}
        isEmpty={activeList.length === 0}
        emptyMessage={`No ${activeTab} records found matching criteria.`}
        footer={
          activeList.length > 0 && (
            <EnterprisePagination
              currentPage={currentPage}
              totalItems={activeList.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel={activeTab}
            />
          )
        }
      >
        {/* TAB 1: DEPARTMENTS */}
        {activeTab === 'departments' && (
          <table className="w-full text-left border-collapse text-xs">
            <EnterpriseTableHeader>
              <EnterpriseTableTh>Dept Code</EnterpriseTableTh>
              <EnterpriseTableTh>Department Name</EnterpriseTableTh>
              <EnterpriseTableTh>Division Details</EnterpriseTableTh>
              <EnterpriseTableTh align="center">Headcount</EnterpriseTableTh>
              <EnterpriseTableTh align="center">Status</EnterpriseTableTh>
            </EnterpriseTableHeader>
            <EnterpriseTableBody>
              {paginatedDepartments.map((dept) => (
                <EnterpriseTableRow key={dept.id}>
                  <EnterpriseTableTd className="font-semibold text-slate-900">{dept.code}</EnterpriseTableTd>
                  <EnterpriseTableTd className="font-medium text-slate-900">{dept.name}</EnterpriseTableTd>
                  <EnterpriseTableTd className="text-slate-500 text-xs">{dept.description || '—'}</EnterpriseTableTd>
                  <EnterpriseTableTd align="center">
                    <span className="text-slate-600 font-medium text-xs">
                      {dept.employeeCount || 0} employees
                    </span>
                  </EnterpriseTableTd>
                  <EnterpriseTableTd align="center">
                    <EnterpriseBadge variant="success">Active</EnterpriseBadge>
                  </EnterpriseTableTd>
                </EnterpriseTableRow>
              ))}
            </EnterpriseTableBody>
          </table>
        )}

        {/* TAB 2: DESIGNATIONS */}
        {activeTab === 'designations' && (
          <table className="w-full text-left border-collapse text-xs">
            <EnterpriseTableHeader>
              <EnterpriseTableTh>Role Code</EnterpriseTableTh>
              <EnterpriseTableTh>Designation Title</EnterpriseTableTh>
              <EnterpriseTableTh>Department Mapping</EnterpriseTableTh>
              <EnterpriseTableTh>Job Description</EnterpriseTableTh>
              <EnterpriseTableTh align="center">Headcount</EnterpriseTableTh>
              <EnterpriseTableTh align="center">Status</EnterpriseTableTh>
            </EnterpriseTableHeader>
            <EnterpriseTableBody>
              {paginatedDesignations.map((desig) => (
                <EnterpriseTableRow key={desig.id}>
                  <EnterpriseTableTd className="font-semibold text-slate-900">{desig.code}</EnterpriseTableTd>
                  <EnterpriseTableTd className="font-medium text-slate-900">{desig.name}</EnterpriseTableTd>
                  <EnterpriseTableTd>
                    <span className="text-slate-600 font-medium text-xs">
                      {desig.departmentName || 'All Departments'}
                    </span>
                  </EnterpriseTableTd>
                  <EnterpriseTableTd className="text-slate-500 text-xs">{desig.description || '—'}</EnterpriseTableTd>
                  <EnterpriseTableTd align="center">
                    <span className="text-slate-600 font-medium text-xs">
                      {desig.employeeCount || 0} employees
                    </span>
                  </EnterpriseTableTd>
                  <EnterpriseTableTd align="center">
                    <EnterpriseBadge variant="success">Active</EnterpriseBadge>
                  </EnterpriseTableTd>
                </EnterpriseTableRow>
              ))}
            </EnterpriseTableBody>
          </table>
        )}

        {/* TAB 3: BRANCHES & UNITS */}
        {activeTab === 'branches' && (
          <table className="w-full text-left border-collapse text-xs">
            <EnterpriseTableHeader>
              <EnterpriseTableTh>Unit Code</EnterpriseTableTh>
              <EnterpriseTableTh>Branch / Unit Name</EnterpriseTableTh>
              <EnterpriseTableTh>Facility Type</EnterpriseTableTh>
              <EnterpriseTableTh>Location</EnterpriseTableTh>
              <EnterpriseTableTh>Address</EnterpriseTableTh>
              <EnterpriseTableTh align="center">Workforce</EnterpriseTableTh>
              <EnterpriseTableTh align="center">Status</EnterpriseTableTh>
            </EnterpriseTableHeader>
            <EnterpriseTableBody>
              {paginatedBranches.map((b) => (
                <EnterpriseTableRow key={b.id}>
                  <EnterpriseTableTd className="font-semibold text-slate-900">{b.code}</EnterpriseTableTd>
                  <EnterpriseTableTd className="font-medium text-slate-900">{b.name}</EnterpriseTableTd>
                  <EnterpriseTableTd>
                    <EnterpriseBadge
                      variant={
                        b.type === 'FACTORY_UNIT'
                          ? 'warning'
                          : b.type === 'HEAD_OFFICE'
                          ? 'info'
                          : 'neutral'
                      }
                    >
                      {b.type.replace('_', ' ')}
                    </EnterpriseBadge>
                  </EnterpriseTableTd>
                  <EnterpriseTableTd className="font-medium text-slate-700">
                    {b.city ? `${b.city}, ${b.state || ''}` : '—'}
                  </EnterpriseTableTd>
                  <EnterpriseTableTd className="text-slate-500 text-xs">{b.address || '—'}</EnterpriseTableTd>
                  <EnterpriseTableTd align="center">
                    <span className="text-slate-600 font-medium text-xs">
                      {b.employeeCount || 0} employees
                    </span>
                  </EnterpriseTableTd>
                  <EnterpriseTableTd align="center">
                    <EnterpriseBadge variant="success">Active</EnterpriseBadge>
                  </EnterpriseTableTd>
                </EnterpriseTableRow>
              ))}
            </EnterpriseTableBody>
          </table>
        )}

        {/* TAB 4: SHIFTS */}
        {activeTab === 'shifts' && (
          <table className="w-full text-left border-collapse text-xs">
            <EnterpriseTableHeader>
              <EnterpriseTableTh>Shift Code</EnterpriseTableTh>
              <EnterpriseTableTh>Shift Name</EnterpriseTableTh>
              <EnterpriseTableTh>Working Hours</EnterpriseTableTh>
              <EnterpriseTableTh>Break</EnterpriseTableTh>
              <EnterpriseTableTh align="center">Assigned Employees</EnterpriseTableTh>
              <EnterpriseTableTh align="center">Status</EnterpriseTableTh>
            </EnterpriseTableHeader>
            <EnterpriseTableBody>
              {paginatedShifts.map((s) => (
                <EnterpriseTableRow key={s.id}>
                  <EnterpriseTableTd className="font-semibold text-slate-900">{s.code}</EnterpriseTableTd>
                  <EnterpriseTableTd className="font-medium text-slate-900">{s.name}</EnterpriseTableTd>
                  <EnterpriseTableTd className="font-medium text-slate-700">
                    {s.startTime} — {s.endTime}
                  </EnterpriseTableTd>
                  <EnterpriseTableTd className="text-slate-500 text-xs">{s.breakMinutes} mins</EnterpriseTableTd>
                  <EnterpriseTableTd align="center">
                    <span className="text-slate-600 font-medium text-xs">
                      {s.employeeCount || 0} employees
                    </span>
                  </EnterpriseTableTd>
                  <EnterpriseTableTd align="center">
                    <EnterpriseBadge variant="success">Active</EnterpriseBadge>
                  </EnterpriseTableTd>
                </EnterpriseTableRow>
              ))}
            </EnterpriseTableBody>
          </table>
        )}

        {/* TAB 5: EMPLOYMENT TYPES */}
        {activeTab === 'employmentTypes' && (
          <table className="w-full text-left border-collapse text-xs">
            <EnterpriseTableHeader>
              <EnterpriseTableTh>Category Code</EnterpriseTableTh>
              <EnterpriseTableTh>Employment Category</EnterpriseTableTh>
              <EnterpriseTableTh>Description</EnterpriseTableTh>
              <EnterpriseTableTh align="center">Assigned Workforce</EnterpriseTableTh>
              <EnterpriseTableTh align="center">Status</EnterpriseTableTh>
            </EnterpriseTableHeader>
            <EnterpriseTableBody>
              {paginatedEmploymentTypes.map((et) => (
                <EnterpriseTableRow key={et.id}>
                  <EnterpriseTableTd className="font-semibold text-slate-900">{et.code}</EnterpriseTableTd>
                  <EnterpriseTableTd className="font-medium text-slate-900">{et.name}</EnterpriseTableTd>
                  <EnterpriseTableTd className="text-slate-500 text-xs">{et.description || '—'}</EnterpriseTableTd>
                  <EnterpriseTableTd align="center">
                    <span className="text-slate-600 font-medium text-xs">
                      {et.employeeCount || 0} employees
                    </span>
                  </EnterpriseTableTd>
                  <EnterpriseTableTd align="center">
                    <EnterpriseBadge variant="success">Active</EnterpriseBadge>
                  </EnterpriseTableTd>
                </EnterpriseTableRow>
              ))}
            </EnterpriseTableBody>
          </table>
        )}
      </EnterpriseTable>

      {/* CREATE MASTER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="bg-indigo-600 px-6 py-4 flex items-center justify-between text-white">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span>
                  {modalType === 'departments' && 'Add New Department'}
                  {modalType === 'designations' && 'Add New Designation'}
                  {modalType === 'branches' && 'Add Branch / Factory Unit'}
                  {modalType === 'shifts' && 'Add Work Shift'}
                  {modalType === 'employmentTypes' && 'Add Employment Category'}
                </span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-indigo-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 text-xs">
              {/* DEPARTMENTS FORM */}
              {modalType === 'departments' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Department Code *</label>
                    <input
                      type="text"
                      required
                      value={deptCode}
                      onChange={(e) => setDeptCode(e.target.value)}
                      placeholder="e.g. DEPT-CUT"
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Department Name *</label>
                    <input
                      type="text"
                      required
                      value={deptName}
                      onChange={(e) => setDeptName(e.target.value)}
                      placeholder="e.g. Cutting & Pattern Making"
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={deptDesc}
                      onChange={(e) => setDeptDesc(e.target.value)}
                      placeholder="Division responsibilities..."
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* DESIGNATIONS FORM */}
              {modalType === 'designations' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Designation Code *</label>
                    <input
                      type="text"
                      required
                      value={desigCode}
                      onChange={(e) => setDesigCode(e.target.value)}
                      placeholder="e.g. DESIG-CM"
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Designation Title *</label>
                    <input
                      type="text"
                      required
                      value={desigName}
                      onChange={(e) => setDesigName(e.target.value)}
                      placeholder="e.g. Cutting Master"
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assigned Department</label>
                    <select
                      value={desigDeptId}
                      onChange={(e) => setDesigDeptId(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">-- All Departments --</option>
                      {bundle.departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={desigDesc}
                      onChange={(e) => setDesigDesc(e.target.value)}
                      placeholder="Job description / role profile..."
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* BRANCHES FORM */}
              {modalType === 'branches' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Branch / Unit Code *</label>
                    <input
                      type="text"
                      required
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value)}
                      placeholder="e.g. BR-TPR-UNIT1"
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Branch / Unit Name *</label>
                    <input
                      type="text"
                      required
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      placeholder="e.g. Tirupur Garment Unit 1"
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Facility Type</label>
                    <select
                      value={branchType}
                      onChange={(e) => setBranchType(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="FACTORY_UNIT">Factory / Manufacturing Unit</option>
                      <option value="HEAD_OFFICE">Head Office</option>
                      <option value="BRANCH_OFFICE">Branch Office</option>
                      <option value="WAREHOUSE">Warehouse / Logistics</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">City</label>
                      <input
                        type="text"
                        value={branchCity}
                        onChange={(e) => setBranchCity(e.target.value)}
                        placeholder="e.g. Tirupur"
                        className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">State</label>
                      <input
                        type="text"
                        value={branchState}
                        onChange={(e) => setBranchState(e.target.value)}
                        placeholder="e.g. Tamil Nadu"
                        className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Full Address</label>
                    <input
                      type="text"
                      value={branchAddress}
                      onChange={(e) => setBranchAddress(e.target.value)}
                      placeholder="e.g. Avinashi Road Textile Park"
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* SHIFTS FORM */}
              {modalType === 'shifts' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Shift Code *</label>
                    <input
                      type="text"
                      required
                      value={shiftCode}
                      onChange={(e) => setShiftCode(e.target.value)}
                      placeholder="e.g. SH-MORN"
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Shift Name *</label>
                    <input
                      type="text"
                      required
                      value={shiftName}
                      onChange={(e) => setShiftName(e.target.value)}
                      placeholder="e.g. Morning Shift"
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Start Time *</label>
                      <input
                        type="time"
                        required
                        value={shiftStart}
                        onChange={(e) => setShiftStart(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">End Time *</label>
                      <input
                        type="time"
                        required
                        value={shiftEnd}
                        onChange={(e) => setShiftEnd(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Break Duration (Minutes)</label>
                    <input
                      type="number"
                      value={shiftBreak}
                      onChange={(e) => setShiftBreak(e.target.value)}
                      placeholder="60"
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* EMPLOYMENT TYPES FORM */}
              {modalType === 'employmentTypes' && (
                <>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category Code *</label>
                    <input
                      type="text"
                      required
                      value={empTypeCode}
                      onChange={(e) => setEmpTypeCode(e.target.value)}
                      placeholder="e.g. ET-CONT"
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Category Name *</label>
                    <input
                      type="text"
                      required
                      value={empTypeName}
                      onChange={(e) => setEmpTypeName(e.target.value)}
                      placeholder="e.g. Contract / Piece-Rate Worker"
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={empTypeDesc}
                      onChange={(e) => setEmpTypeDesc(e.target.value)}
                      placeholder="Contractual or employment terms..."
                      className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {/* Submit Button */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow transition flex items-center gap-2"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                  <span>Save Master Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
