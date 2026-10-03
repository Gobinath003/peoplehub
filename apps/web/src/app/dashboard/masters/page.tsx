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
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

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
      console.warn('API fetch failed, fallback to mock masters', e);
    }

    // Mock initial fallback if API is unreachable
    setBundle({
      departments: [
        { id: 'd1', tenantId: activeTenant.id, code: 'DEPT-CUT', name: 'Cutting & Pattern Making', description: 'Fabric cutting and pattern master division', isActive: true, employeeCount: 2, createdAt: new Date().toISOString() },
        { id: 'd2', tenantId: activeTenant.id, code: 'DEPT-SEW', name: 'Sewing & Stitching', description: 'Assembly line sewing and garment tailoring', isActive: true, employeeCount: 1, createdAt: new Date().toISOString() },
        { id: 'd3', tenantId: activeTenant.id, code: 'DEPT-QC', name: 'Quality Control & Inspection', description: 'Fabric and finished garment defect inspection', isActive: true, employeeCount: 0, createdAt: new Date().toISOString() },
        { id: 'd4', tenantId: activeTenant.id, code: 'DEPT-HR', name: 'Human Resources & Administration', description: 'Workforce management, attendance, and payroll', isActive: true, employeeCount: 0, createdAt: new Date().toISOString() },
      ],
      designations: [
        { id: 'des1', tenantId: activeTenant.id, departmentId: 'd1', departmentName: 'Cutting & Pattern Making', code: 'DESIG-CM', name: 'Cutting Master', description: 'Master fabric layout cutter', isActive: true, employeeCount: 1, createdAt: new Date().toISOString() },
        { id: 'des2', tenantId: activeTenant.id, departmentId: 'd1', departmentName: 'Cutting & Pattern Making', code: 'DESIG-PAT', name: 'Pattern Specialist', description: 'CAD and manual pattern grading', isActive: true, employeeCount: 1, createdAt: new Date().toISOString() },
        { id: 'des3', tenantId: activeTenant.id, departmentId: 'd2', departmentName: 'Sewing & Stitching', code: 'DESIG-STITCH', name: 'Senior Tailor Master', description: 'Single needle and overlock operator', isActive: true, employeeCount: 1, createdAt: new Date().toISOString() },
      ],
      branches: [
        { id: 'b1', tenantId: activeTenant.id, code: 'BR-CHN-HQ', name: 'Chennai Head Office', type: 'HEAD_OFFICE', city: 'Chennai', state: 'Tamil Nadu', address: 'Guindy Industrial Estate', isActive: true, employeeCount: 2, createdAt: new Date().toISOString() },
        { id: 'b2', tenantId: activeTenant.id, code: 'BR-TPR-UNIT1', name: 'Tirupur Garment Unit 1', type: 'FACTORY_UNIT', city: 'Tirupur', state: 'Tamil Nadu', address: 'Avinashi Road Textile Hub', isActive: true, employeeCount: 1, createdAt: new Date().toISOString() },
      ],
      shifts: [
        { id: 's1', tenantId: activeTenant.id, code: 'SH-GEN', name: 'General Shift', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isActive: true, employeeCount: 2, createdAt: new Date().toISOString() },
        { id: 's2', tenantId: activeTenant.id, code: 'SH-MORN', name: 'Morning Shift (Factory)', startTime: '06:00', endTime: '14:00', breakMinutes: 30, isActive: true, employeeCount: 1, createdAt: new Date().toISOString() },
      ],
      employmentTypes: [
        { id: 'et1', tenantId: activeTenant.id, code: 'ET-PERM', name: 'Permanent Full-Time', description: 'Standard regular on-roll employee', isActive: true, employeeCount: 2, createdAt: new Date().toISOString() },
        { id: 'et2', tenantId: activeTenant.id, code: 'ET-CONT', name: 'Contract / Piece-Rate Worker', description: 'Daily wage or piece-rate garment producer', isActive: true, employeeCount: 1, createdAt: new Date().toISOString() },
      ],
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

  return (
    <div className="space-y-6">
      {/* Enterprise Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Master Data Management</h1>
            <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-0.5 rounded-lg text-xs border border-indigo-200">
              {activeTenant?.name}
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Maintain pre-defined organizational masters. Values configured here automatically populate all employee creation and payroll dropdowns.
          </p>
        </div>

        <button
          onClick={() => openCreateModal(activeTab)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>
            {activeTab === 'departments' && 'Add Department'}
            {activeTab === 'designations' && 'Add Designation'}
            {activeTab === 'branches' && 'Add Branch / Unit'}
            {activeTab === 'shifts' && 'Add Shift'}
            {activeTab === 'employmentTypes' && 'Add Employment Type'}
          </span>
        </button>
      </div>

      {/* Success / Error Banners */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded-lg text-xs flex items-center justify-between font-semibold">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded-lg text-xs flex items-center justify-between font-semibold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Masters Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab('departments')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'departments'
              ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
              : 'bg-white/70 border-slate-200 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
            <span className="text-lg font-black text-slate-800 font-mono">{bundle.departments.length}</span>
          </div>
          <div className="text-xs font-bold text-slate-800 mt-2">Departments</div>
          <div className="text-[10px] text-slate-400">Org business units</div>
        </button>

        <button
          onClick={() => setActiveTab('designations')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'designations'
              ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
              : 'bg-white/70 border-slate-200 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Briefcase className="w-4 h-4" />
            </div>
            <span className="text-lg font-black text-slate-800 font-mono">{bundle.designations.length}</span>
          </div>
          <div className="text-xs font-bold text-slate-800 mt-2">Designations</div>
          <div className="text-[10px] text-slate-400">Job roles & titles</div>
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'branches'
              ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
              : 'bg-white/70 border-slate-200 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <MapPin className="w-4 h-4" />
            </div>
            <span className="text-lg font-black text-slate-800 font-mono">{bundle.branches.length}</span>
          </div>
          <div className="text-xs font-bold text-slate-800 mt-2">Branches & Units</div>
          <div className="text-[10px] text-slate-400">Factories & locations</div>
        </button>

        <button
          onClick={() => setActiveTab('shifts')}
          className={`p-4 rounded-2xl border text-left transition-all ${
            activeTab === 'shifts'
              ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
              : 'bg-white/70 border-slate-200 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-lg font-black text-slate-800 font-mono">{bundle.shifts.length}</span>
          </div>
          <div className="text-xs font-bold text-slate-800 mt-2">Work Shifts</div>
          <div className="text-[10px] text-slate-400">Work timings & breaks</div>
        </button>

        <button
          onClick={() => setActiveTab('employmentTypes')}
          className={`p-4 rounded-2xl border text-left transition-all col-span-2 sm:col-span-1 ${
            activeTab === 'employmentTypes'
              ? 'bg-white border-indigo-500 shadow-md ring-2 ring-indigo-500/10'
              : 'bg-white/70 border-slate-200 hover:bg-white'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Tag className="w-4 h-4" />
            </div>
            <span className="text-lg font-black text-slate-800 font-mono">{bundle.employmentTypes.length}</span>
          </div>
          <div className="text-xs font-bold text-slate-800 mt-2">Employment Types</div>
          <div className="text-[10px] text-slate-400">Contract, Perm, Piece</div>
        </button>
      </div>

      {/* Search and Action Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-mono font-bold">
            {activeTab === 'departments' && `${filteredDepartments.length} Departments`}
            {activeTab === 'designations' && `${filteredDesignations.length} Designations`}
            {activeTab === 'branches' && `${filteredBranches.length} Branches / Units`}
            {activeTab === 'shifts' && `${filteredShifts.length} Shifts`}
            {activeTab === 'employmentTypes' && `${filteredEmploymentTypes.length} Employment Categories`}
          </span>
        </div>
      </div>

      {/* Main Masters Content Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div>
            {/* TAB 1: DEPARTMENTS */}
            {activeTab === 'departments' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Dept Code</th>
                      <th className="py-3.5 px-6">Department Name</th>
                      <th className="py-3.5 px-6">Division Details</th>
                      <th className="py-3.5 px-6 text-center">Headcount</th>
                      <th className="py-3.5 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDepartments.map((dept) => (
                      <tr key={dept.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-6 font-mono font-bold text-indigo-700">{dept.code}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">{dept.name}</td>
                        <td className="py-4 px-6 text-slate-500">{dept.description || '—'}</td>
                        <td className="py-4 px-6 text-center font-mono">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                            {dept.employeeCount || 0} employees
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: DESIGNATIONS */}
            {activeTab === 'designations' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Role Code</th>
                      <th className="py-3.5 px-6">Designation Title</th>
                      <th className="py-3.5 px-6">Department Mapping</th>
                      <th className="py-3.5 px-6">Job Description</th>
                      <th className="py-3.5 px-6 text-center">Headcount</th>
                      <th className="py-3.5 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredDesignations.map((desig) => (
                      <tr key={desig.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-6 font-mono font-bold text-purple-700">{desig.code}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">{desig.name}</td>
                        <td className="py-4 px-6">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded text-[11px] font-semibold">
                            {desig.departmentName || 'All Departments'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500">{desig.description || '—'}</td>
                        <td className="py-4 px-6 text-center font-mono">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                            {desig.employeeCount || 0} employees
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 3: BRANCHES & UNITS */}
            {activeTab === 'branches' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Unit Code</th>
                      <th className="py-3.5 px-6">Branch / Unit Name</th>
                      <th className="py-3.5 px-6">Facility Type</th>
                      <th className="py-3.5 px-6">Location (City, State)</th>
                      <th className="py-3.5 px-6">Address</th>
                      <th className="py-3.5 px-6 text-center">Assigned Workforce</th>
                      <th className="py-3.5 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBranches.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-6 font-mono font-bold text-emerald-700">{b.code}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">{b.name}</td>
                        <td className="py-4 px-6">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            b.type === 'FACTORY_UNIT'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : b.type === 'HEAD_OFFICE'
                              ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {b.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-6 font-medium text-slate-700">
                          {b.city ? `${b.city}, ${b.state || ''}` : '—'}
                        </td>
                        <td className="py-4 px-6 text-slate-500">{b.address || '—'}</td>
                        <td className="py-4 px-6 text-center font-mono">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                            {b.employeeCount || 0} employees
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 4: SHIFTS */}
            {activeTab === 'shifts' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Shift Code</th>
                      <th className="py-3.5 px-6">Shift Name</th>
                      <th className="py-3.5 px-6">Working Hours</th>
                      <th className="py-3.5 px-6">Break Duration</th>
                      <th className="py-3.5 px-6 text-center">Assigned Employees</th>
                      <th className="py-3.5 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredShifts.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-6 font-mono font-bold text-amber-700">{s.code}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">{s.name}</td>
                        <td className="py-4 px-6 font-mono font-semibold text-slate-700">
                          {s.startTime} — {s.endTime}
                        </td>
                        <td className="py-4 px-6 text-slate-500">{s.breakMinutes} mins</td>
                        <td className="py-4 px-6 text-center font-mono">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                            {s.employeeCount || 0} employees
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 5: EMPLOYMENT TYPES */}
            {activeTab === 'employmentTypes' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3.5 px-6">Category Code</th>
                      <th className="py-3.5 px-6">Employment Category</th>
                      <th className="py-3.5 px-6">Description</th>
                      <th className="py-3.5 px-6 text-center">Assigned Workforce</th>
                      <th className="py-3.5 px-6 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredEmploymentTypes.map((et) => (
                      <tr key={et.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-6 font-mono font-bold text-rose-700">{et.code}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">{et.name}</td>
                        <td className="py-4 px-6 text-slate-500">{et.description || '—'}</td>
                        <td className="py-4 px-6 text-center font-mono">
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-bold">
                            {et.employeeCount || 0} employees
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

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
                      className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                      className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                      className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                      className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
                      className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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
