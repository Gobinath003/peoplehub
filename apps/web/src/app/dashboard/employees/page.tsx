'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { 
  Users, Plus, Search, Filter, Check, X, 
  Building2, Briefcase, Calendar, Phone, Mail, 
  BadgeCheck, DollarSign, ChevronRight, AlertCircle, Scissors, Layers 
} from 'lucide-react';
import { EmployeeDto, MasterBundleDto } from '@people-hub/shared-types';

const DEFAULT_GARMENT_MASTERS: MasterBundleDto = {
  departments: [
    { id: 'dept-cut', tenantId: '', code: 'DEPT-CUT', name: 'Cutting & Pattern Making', description: 'Fabric cutting and pattern master division', isActive: true, employeeCount: 1, createdAt: '' },
    { id: 'dept-sew', tenantId: '', code: 'DEPT-SEW', name: 'Sewing & Stitching', description: 'Assembly line sewing and garment tailoring', isActive: true, employeeCount: 2, createdAt: '' },
    { id: 'dept-qc', tenantId: '', code: 'DEPT-QC', name: 'Quality Control & Inspection', description: 'Fabric and finished garment defect inspection', isActive: true, employeeCount: 1, createdAt: '' },
    { id: 'dept-hr', tenantId: '', code: 'DEPT-HR', name: 'Human Resources & Administration', description: 'Workforce management, attendance, and payroll', isActive: true, employeeCount: 1, createdAt: '' },
  ],
  designations: [
    { id: 'desig-cm', tenantId: '', departmentId: 'dept-cut', departmentName: 'Cutting & Pattern Making', code: 'DESIG-CM', name: 'Cutting Master', description: 'Master fabric layout cutter & multi-skill artisan', isActive: true, employeeCount: 1, createdAt: '' },
    { id: 'desig-pat', tenantId: '', departmentId: 'dept-cut', departmentName: 'Cutting & Pattern Making', code: 'DESIG-PAT', name: 'Pattern Specialist', description: 'CAD and manual pattern grading', isActive: true, employeeCount: 0, createdAt: '' },
    { id: 'desig-tailor', tenantId: '', departmentId: 'dept-sew', departmentName: 'Sewing & Stitching', code: 'DESIG-STITCH', name: 'Senior Tailor Master', description: 'Overlock and single needle operator', isActive: true, employeeCount: 2, createdAt: '' },
    { id: 'desig-qc', tenantId: '', departmentId: 'dept-qc', departmentName: 'Quality Control & Inspection', code: 'DESIG-QC', name: 'Fabric Quality Inspector', description: 'Quality inspection and defect auditor', isActive: true, employeeCount: 1, createdAt: '' },
  ],
  branches: [
    { id: 'br-chn', tenantId: '', code: 'BR-CHN-HQ', name: 'Chennai Head Office', type: 'HEAD_OFFICE', city: 'Chennai', state: 'Tamil Nadu', address: 'Guindy Industrial Estate', isActive: true, employeeCount: 2, createdAt: '' },
    { id: 'br-tpr', tenantId: '', code: 'BR-TPR-UNIT1', name: 'Tirupur Garment Unit 1', type: 'FACTORY_UNIT', city: 'Tirupur', state: 'Tamil Nadu', address: 'Avinashi Road Textile Hub', isActive: true, employeeCount: 1, createdAt: '' },
  ],
  shifts: [
    { id: 'sh-morn', tenantId: '', code: 'SH-MORN', name: 'Morning Shift (Factory) (06:00 - 14:00)', startTime: '06:00', endTime: '14:00', breakMinutes: 30, isActive: true, employeeCount: 1, createdAt: '' },
    { id: 'sh-gen', tenantId: '', code: 'SH-GEN', name: 'General Shift (09:00 - 18:00)', startTime: '09:00', endTime: '18:00', breakMinutes: 60, isActive: true, employeeCount: 2, createdAt: '' },
  ],
  employmentTypes: [
    { id: 'et-perm', tenantId: '', code: 'ET-PERM', name: 'Permanent Full-Time', description: 'Standard regular on-roll employee', isActive: true, employeeCount: 2, createdAt: '' },
    { id: 'et-cont', tenantId: '', code: 'ET-CONT', name: 'Contract / Piece-Rate Worker', description: 'Daily wage or piece-rate garment producer', isActive: true, employeeCount: 1, createdAt: '' },
  ]
};

export default function EmployeesPage() {
  const { activeTenant, accessToken, isHRManager, activeBranchScope } = useApp();
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [masterBundle, setMasterBundle] = useState<MasterBundleDto>(DEFAULT_GARMENT_MASTERS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State with Master IDs
  const [salaryType, setSalaryType] = useState('MONTHLY_FIXED');
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState(DEFAULT_GARMENT_MASTERS.departments[0].id);
  const [selectedDesigId, setSelectedDesigId] = useState(DEFAULT_GARMENT_MASTERS.designations[0].id);
  const [selectedBranchId, setSelectedBranchId] = useState(DEFAULT_GARMENT_MASTERS.branches[0].id);
  const [selectedShiftId, setSelectedShiftId] = useState(DEFAULT_GARMENT_MASTERS.shifts[0].id);
  const [selectedEmpTypeId, setSelectedEmpTypeId] = useState(DEFAULT_GARMENT_MASTERS.employmentTypes[0].id);
  const [department, setDepartment] = useState(DEFAULT_GARMENT_MASTERS.departments[0].name);
  const [designation, setDesignation] = useState(DEFAULT_GARMENT_MASTERS.designations[0].name);
  const [branch, setBranch] = useState(DEFAULT_GARMENT_MASTERS.branches[0].name);
  const [joiningDate, setJoiningDate] = useState('2026-01-15');
  const [basicSalary, setBasicSalary] = useState('22000');
  const [hra, setHra] = useState('8000');
  const [specialAllowance, setSpecialAllowance] = useState('2500');
  const [conveyanceAllowance, setConveyanceAllowance] = useState('1500');
  const [pfDeduction, setPfDeduction] = useState('1800');
  const [taxDeduction, setTaxDeduction] = useState('1000');

  const fetchMasters = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/masters/bundle`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        }
      });
      if (res.ok) {
        const bundleData: MasterBundleDto = await res.json();
        if (bundleData && bundleData.departments && bundleData.departments.length > 0) {
          setMasterBundle(bundleData);
          setSelectedDeptId(bundleData.departments[0].id);
          setDepartment(bundleData.departments[0].name);
          if (bundleData.designations.length > 0) {
            setSelectedDesigId(bundleData.designations[0].id);
            setDesignation(bundleData.designations[0].name);
          }
          if (bundleData.branches.length > 0) {
            setSelectedBranchId(bundleData.branches[0].id);
            setBranch(bundleData.branches[0].name);
          }
          if (bundleData.shifts.length > 0) {
            setSelectedShiftId(bundleData.shifts[0].id);
          }
          if (bundleData.employmentTypes.length > 0) {
            setSelectedEmpTypeId(bundleData.employmentTypes[0].id);
          }
        }
      }
    } catch (e) {
      console.warn('Could not fetch master bundle from API, using robust default garment masters', e);
    }
  };

  const fetchEmployees = async () => {
    if (!activeTenant) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/employees`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEmployees(data);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API error fetching employees, using mock', e);
    }

    // Mock initial data
    const mockEmployees: EmployeeDto[] = [
      {
        id: 'e1',
        tenantId: activeTenant.id,
        userId: null,
        employeeCode: 'EMP-101',
        firstName: 'Kavitha',
        lastName: 'Ramesh',
        email: 'kavitha.r@garments.com',
        phone: '+91 98401 23456',
        department: 'Sewing & Stitching',
        designation: 'Senior Tailor Master',
        branch: 'Chennai Branch',
        salaryType: 'MONTHLY_FIXED',
        joiningDate: '2025-06-01T00:00:00Z',
        status: 'ACTIVE',
        createdAt: '2025-06-01T00:00:00Z',
        salaryStructure: {
          id: 's1',
          employeeId: 'e1',
          basicSalary: 25000,
          hra: 10000,
          specialAllowance: 3000,
          conveyanceAllowance: 2000,
          pfDeduction: 1800,
          taxDeduction: 1200,
          otherDeductions: 0,
          grossSalary: 40000,
          netSalary: 37000,
          currency: 'INR',
          effectiveDate: '2025-06-01T00:00:00Z'
        }
      },
      {
        id: 'e2',
        tenantId: activeTenant.id,
        userId: null,
        employeeCode: 'EMP-102',
        firstName: 'Anand',
        lastName: 'Murugan',
        email: 'anand.m@garments.com',
        phone: '+91 98402 34567',
        department: 'Cutting & Tailoring',
        designation: 'Cutting Master & Multi-Skill Artisan',
        branch: 'Chennai Branch',
        salaryType: 'PIECE_RATE',
        joiningDate: '2025-09-15T00:00:00Z',
        status: 'ACTIVE',
        createdAt: '2025-09-15T00:00:00Z',
        salaryStructure: {
          id: 's2',
          employeeId: 'e2',
          basicSalary: 0,
          hra: 0,
          specialAllowance: 1500,
          conveyanceAllowance: 1000,
          pfDeduction: 1200,
          taxDeduction: 500,
          otherDeductions: 0,
          grossSalary: 2500,
          netSalary: 800,
          currency: 'INR',
          effectiveDate: '2025-09-15T00:00:00Z'
        }
      },
      {
        id: 'e3',
        tenantId: activeTenant.id,
        userId: null,
        employeeCode: 'EMP-103',
        firstName: 'Suresh',
        lastName: 'Babu',
        email: 'suresh.b@garments.com',
        phone: '+91 98403 45678',
        department: 'Cutting & Pattern',
        designation: 'Pattern Specialist',
        branch: 'Tirupur Unit',
        salaryType: 'MONTHLY_FIXED',
        joiningDate: '2026-02-01T00:00:00Z',
        status: 'ACTIVE',
        createdAt: '2026-02-01T00:00:00Z',
        salaryStructure: {
          id: 's3',
          employeeId: 'e3',
          basicSalary: 22000,
          hra: 8800,
          specialAllowance: 2500,
          conveyanceAllowance: 1500,
          pfDeduction: 1800,
          taxDeduction: 800,
          otherDeductions: 0,
          grossSalary: 34800,
          netSalary: 32200,
          currency: 'INR',
          effectiveDate: '2026-02-01T00:00:00Z'
        }
      }
    ];

    setEmployees(mockEmployees);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
    fetchMasters();
  }, [activeTenant, accessToken]);

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      employeeCode: employeeCode.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      department: department.trim(),
      designation: designation.trim(),
      branch: branch.trim(),
      departmentId: selectedDeptId || undefined,
      designationId: selectedDesigId || undefined,
      branchId: selectedBranchId || undefined,
      shiftId: selectedShiftId || undefined,
      employmentTypeId: selectedEmpTypeId || undefined,
      salaryType,
      joiningDate,
      status: 'ACTIVE',
      basicSalary: Number(basicSalary) || 0,
      hra: Number(hra) || 0,
      specialAllowance: Number(specialAllowance) || 0,
      conveyanceAllowance: Number(conveyanceAllowance) || 0,
      pfDeduction: Number(pfDeduction) || 0,
      taxDeduction: Number(taxDeduction) || 0,
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg(`Employee "${payload.firstName} ${payload.lastName}" (${payload.employeeCode}) added successfully with ${salaryType === 'PIECE_RATE' ? 'Piece-Rate' : 'Monthly Fixed'} salary!`);
        await fetchEmployees();
        setModalOpen(false);
        resetForm();
        setSaving(false);
        return;
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to create employee');
        setSaving(false);
        return;
      }
    } catch (e) {
      console.warn('API error, using local fallback', e);
    }

    // Local fallback
    const gross = payload.basicSalary + payload.hra + payload.specialAllowance + payload.conveyanceAllowance;
    const net = gross - (payload.pfDeduction + payload.taxDeduction);

    const newEmp: EmployeeDto = {
      id: `e-${Date.now()}`,
      tenantId: activeTenant?.id || '',
      userId: null,
      employeeCode: payload.employeeCode,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      department: payload.department,
      designation: payload.designation,
      branch: payload.branch,
      departmentId: payload.departmentId,
      designationId: payload.designationId,
      branchId: payload.branchId,
      shiftId: payload.shiftId,
      employmentTypeId: payload.employmentTypeId,
      salaryType: payload.salaryType,
      joiningDate: payload.joiningDate,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      salaryStructure: {
        id: `s-${Date.now()}`,
        employeeId: `e-${Date.now()}`,
        basicSalary: payload.basicSalary,
        hra: payload.hra,
        specialAllowance: payload.specialAllowance,
        conveyanceAllowance: payload.conveyanceAllowance,
        pfDeduction: payload.pfDeduction,
        taxDeduction: payload.taxDeduction,
        otherDeductions: 0,
        grossSalary: gross,
        netSalary: net,
        currency: 'INR',
        effectiveDate: payload.joiningDate
      }
    };

    setEmployees([newEmp, ...employees]);
    setSuccessMsg(`Employee ${newEmp.employeeCode} onboarded with gross salary ₹${gross.toLocaleString()}!`);
    setModalOpen(false);
    resetForm();
    setSaving(false);
  };

  const resetForm = () => {
    setEmployeeCode('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    if (masterBundle.departments.length > 0) {
      setSelectedDeptId(masterBundle.departments[0].id);
      setDepartment(masterBundle.departments[0].name);
    } else {
      setDepartment('Production');
    }
    if (masterBundle.designations.length > 0) {
      setSelectedDesigId(masterBundle.designations[0].id);
      setDesignation(masterBundle.designations[0].name);
    } else {
      setDesignation('Tailor');
    }
    if (masterBundle.branches.length > 0) {
      setSelectedBranchId(masterBundle.branches[0].id);
      setBranch(masterBundle.branches[0].name);
    } else {
      setBranch(activeBranchScope || 'Chennai Branch');
    }
    if (masterBundle.shifts.length > 0) {
      setSelectedShiftId(masterBundle.shifts[0].id);
    }
    if (masterBundle.employmentTypes.length > 0) {
      setSelectedEmpTypeId(masterBundle.employmentTypes[0].id);
    }
    setBasicSalary('22000');
    setHra('8000');
  };

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.designation.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDept = selectedDept === 'ALL' || emp.department === selectedDept;
    return matchesSearch && matchesDept;
  });

  const departments = ['ALL', ...Array.from(new Set([
    ...masterBundle.departments.map(d => d.name),
    ...employees.map(e => e.department)
  ]))];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800">Employee Directory</h1>
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-xs border border-emerald-200">
              {activeTenant?.name}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Maintain organizational headcount, job designations, branch scopes, and employee salary profiles.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow flex items-center gap-2 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Employee</span>
        </button>
      </div>

      {/* Success Banner */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded-lg text-xs flex items-center justify-between font-semibold">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by code, name, designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-slate-500 font-semibold">Department:</span>
          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {departments.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No employees found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-6">Department & Role</th>
                  <th className="py-3.5 px-6">Branch Scope</th>
                  <th className="py-3.5 px-6">Compensation Profile</th>
                  <th className="py-3.5 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    {/* Employee Info */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{emp.firstName} {emp.lastName}</div>
                          <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded">{emp.employeeCode}</span>
                            <span>•</span>
                            <span>{emp.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Department & Role */}
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-700">{emp.designation}</div>
                      <div className="text-slate-400 text-[11px] flex items-center gap-1 mt-0.5">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        <span>{emp.department}</span>
                      </div>
                    </td>

                    {/* Branch */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-semibold px-2.5 py-1 rounded-full text-[11px] border border-slate-200">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{emp.branch || 'Global Branch'}</span>
                      </span>
                    </td>

                    {/* Compensation */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        {emp.salaryType === 'PIECE_RATE' ? (
                          <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded text-[10px] border border-amber-200 inline-flex items-center gap-1">
                            <Scissors className="w-3 h-3 text-amber-600" />
                            <span>Piece-Rate Worker</span>
                          </span>
                        ) : (
                          <span className="bg-blue-50 text-blue-800 font-bold px-2 py-0.5 rounded text-[10px] border border-blue-200">
                            Monthly Fixed
                          </span>
                        )}
                      </div>
                      {emp.salaryType === 'PIECE_RATE' ? (
                        <div className="text-[11px] text-slate-500 font-medium">
                          Daily unit output logged at month-end
                        </div>
                      ) : emp.salaryStructure ? (
                        <div>
                          <div className="font-bold text-emerald-700 text-xs">
                            ₹{emp.salaryStructure.grossSalary.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ mo (Gross)</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Net: ₹{emp.salaryStructure.netSalary.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-semibold border border-amber-200">
                          Pending Setup
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Add Employee (Wider Enterprise ERP Layout) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-primary-100 text-primary-700 rounded-xl shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Add New Employee</h3>
                  <p className="text-xs text-slate-500">Register employee and allocate pre-defined company master data</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="mx-8 mt-4 p-3.5 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded-lg font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleAddEmployee} className="p-8 space-y-6 text-xs overflow-y-auto flex-1">
              {/* 1. Profile & Basic Details */}
              <div className="space-y-4">
                <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-extrabold">1</span>
                  <span>Personal & Contact Information</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Employee Code *</label>
                    <input
                      type="text"
                      required
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                      placeholder="e.g. EMP-104"
                      className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none bg-slate-50/50"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Meena"
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Kumari"
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. meena@garments.com"
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98400 00000"
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Date of Joining *</label>
                    <input
                      type="date"
                      required
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Enterprise Master Allocation (Pure Dropdowns from Masters) */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-primary-100 text-primary-700 rounded-xl">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Company Master Allocation</h4>
                      <p className="text-[11px] text-slate-500">Pre-defined master values loaded from active company database</p>
                    </div>
                  </div>
                  <Link 
                    href="/dashboard/masters" 
                    target="_blank"
                    className="text-xs text-primary-600 hover:text-primary-700 font-bold hover:underline flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-xl border border-primary-200 shadow-xs"
                  >
                    <span>Manage Masters Hub</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Department Master Dropdown */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Department *</span>
                      <span className="text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded font-medium border border-primary-200">Master</span>
                    </label>
                    <select
                      required
                      value={selectedDeptId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedDeptId(val);
                        const found = masterBundle.departments.find(d => d.id === val);
                        if (found) setDepartment(found.name);
                      }}
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-xs"
                    >
                      {masterBundle.departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Designation Master Dropdown */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Designation / Role *</span>
                      <span className="text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded font-medium border border-primary-200">Master</span>
                    </label>
                    <select
                      required
                      value={selectedDesigId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedDesigId(val);
                        const found = masterBundle.designations.find(d => d.id === val);
                        if (found) setDesignation(found.name);
                      }}
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-xs"
                    >
                      {masterBundle.designations.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Branch Master Dropdown */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Branch / Factory Unit *</span>
                      <span className="text-[10px] bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded font-medium border border-primary-200">Master</span>
                    </label>
                    <select
                      required
                      value={selectedBranchId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedBranchId(val);
                        const found = masterBundle.branches.find(b => b.id === val);
                        if (found) setBranch(found.name);
                      }}
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-xs"
                    >
                      {masterBundle.branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  {/* Shift Schedule Master Dropdown */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Work Shift Schedule</span>
                      <span className="text-[10px] text-slate-400 font-normal">Timing Master</span>
                    </label>
                    <select
                      value={selectedShiftId}
                      onChange={(e) => setSelectedShiftId(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-xs"
                    >
                      {masterBundle.shifts.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                      ))}
                    </select>
                  </div>

                  {/* Employment Category Master Dropdown */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                      <span>Employment Category</span>
                      <span className="text-[10px] text-slate-400 font-normal">Classification Master</span>
                    </label>
                    <select
                      value={selectedEmpTypeId}
                      onChange={(e) => setSelectedEmpTypeId(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none shadow-xs"
                    >
                      {masterBundle.employmentTypes.map(et => (
                        <option key={et.id} value={et.id}>{et.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Compensation & Salary System */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-extrabold">3</span>
                    <span>Salary System & Compensation</span>
                  </h4>
                  {salaryType === 'MONTHLY_FIXED' && (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                      <span>Gross: ₹{((Number(basicSalary)||0) + (Number(hra)||0) + (Number(specialAllowance)||0) + (Number(conveyanceAllowance)||0)).toLocaleString()}</span>
                      <span>•</span>
                      <span>Net: ₹{(((Number(basicSalary)||0) + (Number(hra)||0) + (Number(specialAllowance)||0) + (Number(conveyanceAllowance)||0)) - ((Number(pfDeduction)||0) + (Number(taxDeduction)||0))).toLocaleString()}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setSalaryType('MONTHLY_FIXED')}
                    className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                      salaryType === 'MONTHLY_FIXED'
                        ? 'border-primary-500 bg-primary-50/70 text-primary-950 ring-2 ring-primary-500/20 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl mt-0.5 ${salaryType === 'MONTHLY_FIXED' ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800">Monthly Fixed Salary</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Fixed monthly basic salary with allowances and statutory PF/TDS deductions.</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSalaryType('PIECE_RATE')}
                    className={`p-4 rounded-2xl border text-left transition flex items-start gap-3.5 ${
                      salaryType === 'PIECE_RATE'
                        ? 'border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl mt-0.5 ${salaryType === 'PIECE_RATE' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      <Scissors className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-slate-800">Piece-Rate Output Salary</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Computed from daily unit logs (cutting, stitching, stretching) submitted to HR.</div>
                    </div>
                  </button>
                </div>

                {salaryType === 'PIECE_RATE' ? (
                  <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-950 text-xs space-y-1 leading-relaxed">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900">
                      <Scissors className="w-4 h-4 text-amber-600" />
                      <span>Garment Production Piece Wage Mode</span>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      This employee's monthly basic pay will automatically be computed by the payroll engine aggregating all daily production logs (e.g. 50 cutting units @ ₹20/pc, 30 stitching units @ ₹35/pc). You can optionally set fixed allowances or deductions below.
                    </p>
                  </div>
                ) : null}

                {/* Compensation Input Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {salaryType === 'PIECE_RATE' ? 'Base Retainer (₹)' : 'Basic Salary (₹) *'}
                    </label>
                    <input
                      type="number"
                      required={salaryType !== 'PIECE_RATE'}
                      value={basicSalary}
                      onChange={(e) => setBasicSalary(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">HRA (₹)</label>
                    <input
                      type="number"
                      value={hra}
                      onChange={(e) => setHra(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Special Allowance (₹)</label>
                    <input
                      type="number"
                      value={specialAllowance}
                      onChange={(e) => setSpecialAllowance(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Conveyance (₹)</label>
                    <input
                      type="number"
                      value={conveyanceAllowance}
                      onChange={(e) => setConveyanceAllowance(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">PF Deduction (₹)</label>
                    <input
                      type="number"
                      value={pfDeduction}
                      onChange={(e) => setPfDeduction(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">TDS / Income Tax (₹)</label>
                    <input
                      type="number"
                      value={taxDeduction}
                      onChange={(e) => setTaxDeduction(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-bold transition text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-md transition text-xs"
                >
                  {saving ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Save Employee Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
