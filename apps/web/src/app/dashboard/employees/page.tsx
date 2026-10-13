'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { 
  Users, Plus, Search, Filter, Check, X, 
  Building2, Briefcase, Calendar, Phone, 
  BadgeCheck, DollarSign, ChevronRight, AlertCircle, Scissors, Layers,
  Pencil, Trash2, Lock
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
  const { activeTenant, accessToken, activeBranchScope } = useApp();
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [masterBundle, setMasterBundle] = useState<MasterBundleDto>(DEFAULT_GARMENT_MASTERS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add Form State
  const [salaryType, setSalaryType] = useState('MONTHLY_FIXED');
  const [employeeCode, setEmployeeCode] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [selectedDesigId, setSelectedDesigId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedShiftId, setSelectedShiftId] = useState('');
  const [selectedEmpTypeId, setSelectedEmpTypeId] = useState('');
  const [department, setDepartment] = useState('');
  const [designation, setDesignation] = useState('');
  const [branch, setBranch] = useState('');
  const [joiningDate, setJoiningDate] = useState('2026-01-15');
  const [basicSalary, setBasicSalary] = useState('22000');
  const [hra, setHra] = useState('8000');
  const [specialAllowance, setSpecialAllowance] = useState('2500');
  const [conveyanceAllowance, setConveyanceAllowance] = useState('1500');
  const [pfDeduction, setPfDeduction] = useState('1800');
  const [taxDeduction, setTaxDeduction] = useState('1000');

  // Edit Form State
  const [editingEmpId, setEditingEmpId] = useState('');
  const [editEmpCode, setEditEmpCode] = useState('');
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDeptId, setEditDeptId] = useState('');
  const [editDesigId, setEditDesigId] = useState('');
  const [editBranchId, setEditBranchId] = useState('');
  const [editShiftId, setEditShiftId] = useState('');
  const [editEmpTypeId, setEditEmpTypeId] = useState('');
  const [editDepartment, setEditDepartment] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editSalaryType, setEditSalaryType] = useState('MONTHLY_FIXED');
  const [editBasicSalary, setEditBasicSalary] = useState('20000');
  const [editHra, setEditHra] = useState('5000');
  const [editStatus, setEditStatus] = useState('ACTIVE');

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
      console.warn('Could not fetch master bundle from API, using default masters', e);
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

    // Initial mock data if empty
    const mockEmployees: EmployeeDto[] = [
      {
        id: 'e1',
        tenantId: activeTenant.id,
        userId: null,
        employeeCode: 'EMP-0001',
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
          basicSalary: 24000,
          hra: 9600,
          specialAllowance: 2500,
          conveyanceAllowance: 1500,
          pfDeduction: 1800,
          taxDeduction: 1200,
          otherDeductions: 0,
          grossSalary: 37600,
          netSalary: 34600,
          currency: 'INR',
          effectiveDate: '2025-06-01T00:00:00Z'
        }
      },
      {
        id: 'e2',
        tenantId: activeTenant.id,
        userId: null,
        employeeCode: 'EMP-0002',
        firstName: 'Muthu',
        lastName: 'Vel',
        email: 'muthu.v@garments.com',
        phone: '+91 98402 34567',
        department: 'Sewing & Stitching',
        designation: 'Senior Tailor Master',
        branch: 'Tirupur Unit',
        salaryType: 'PIECE_RATE',
        joiningDate: '2026-01-10T00:00:00Z',
        status: 'ACTIVE',
        createdAt: '2026-01-10T00:00:00Z',
        salaryStructure: null
      }
    ];

    setEmployees(mockEmployees);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
    fetchMasters();
  }, [activeTenant, accessToken]);

  // Generate next automatic employee code
  const getNextEmployeeCode = () => {
    const codes = employees.map(e => e.employeeCode.toUpperCase());
    let nextNum = employees.length + 1;
    let generated = `EMP-${nextNum.toString().padStart(4, '0')}`;
    while (codes.includes(generated)) {
      nextNum++;
      generated = `EMP-${nextNum.toString().padStart(4, '0')}`;
    }
    return generated;
  };

  const handleOpenAddModal = () => {
    const autoCode = getNextEmployeeCode();
    setEmployeeCode(autoCode);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setSalaryType('MONTHLY_FIXED');
    setBasicSalary('22000');
    setHra('8000');
    setSpecialAllowance('2500');
    setConveyanceAllowance('1500');
    setPfDeduction('1800');
    setTaxDeduction('1000');
    if (masterBundle.departments.length > 0) {
      setSelectedDeptId(masterBundle.departments[0].id);
      setDepartment(masterBundle.departments[0].name);
    }
    if (masterBundle.designations.length > 0) {
      setSelectedDesigId(masterBundle.designations[0].id);
      setDesignation(masterBundle.designations[0].name);
    }
    if (masterBundle.branches.length > 0) {
      setSelectedBranchId(masterBundle.branches[0].id);
      setBranch(masterBundle.branches[0].name);
    }
    if (masterBundle.shifts.length > 0) {
      setSelectedShiftId(masterBundle.shifts[0].id);
    }
    if (masterBundle.employmentTypes.length > 0) {
      setSelectedEmpTypeId(masterBundle.employmentTypes[0].id);
    }
    setModalOpen(true);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const isPieceRate = salaryType === 'PIECE_RATE';

    const payload = {
      employeeCode: employeeCode.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() ? email.trim() : undefined,
      phone: phone.trim() ? phone.trim() : undefined,
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
      basicSalary: isPieceRate ? 0 : (Number(basicSalary) || 0),
      hra: isPieceRate ? 0 : (Number(hra) || 0),
      specialAllowance: isPieceRate ? 0 : (Number(specialAllowance) || 0),
      conveyanceAllowance: isPieceRate ? 0 : (Number(conveyanceAllowance) || 0),
      pfDeduction: isPieceRate ? 0 : (Number(pfDeduction) || 0),
      taxDeduction: isPieceRate ? 0 : (Number(taxDeduction) || 0),
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
        setSuccessMsg(`Employee "${payload.firstName} ${payload.lastName}" (${payload.employeeCode}) created successfully!`);
        await fetchEmployees();
        setModalOpen(false);
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
    const newEmp: EmployeeDto = {
      id: `e-${Date.now()}`,
      tenantId: activeTenant?.id || '',
      userId: null,
      employeeCode: payload.employeeCode,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email || null,
      phone: payload.phone || null,
      department: payload.department,
      designation: payload.designation,
      branch: payload.branch || null,
      departmentId: payload.departmentId || null,
      designationId: payload.designationId || null,
      branchId: payload.branchId || null,
      shiftId: payload.shiftId || null,
      employmentTypeId: payload.employmentTypeId || null,
      salaryType: payload.salaryType,
      joiningDate: payload.joiningDate,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
      salaryStructure: isPieceRate ? null : {
        id: `s-${Date.now()}`,
        employeeId: `e-${Date.now()}`,
        basicSalary: payload.basicSalary,
        hra: payload.hra,
        specialAllowance: payload.specialAllowance,
        conveyanceAllowance: payload.conveyanceAllowance,
        pfDeduction: payload.pfDeduction,
        taxDeduction: payload.taxDeduction,
        otherDeductions: 0,
        grossSalary: payload.basicSalary + payload.hra + payload.specialAllowance + payload.conveyanceAllowance,
        netSalary: (payload.basicSalary + payload.hra + payload.specialAllowance + payload.conveyanceAllowance) - (payload.pfDeduction + payload.taxDeduction),
        currency: 'INR',
        effectiveDate: payload.joiningDate
      }
    };

    setEmployees([newEmp, ...employees]);
    setSuccessMsg(`Employee ${newEmp.employeeCode} (${newEmp.firstName} ${newEmp.lastName}) onboarded successfully!`);
    setModalOpen(false);
    setSaving(false);
  };

  // Open Edit Modal with Employee Data
  const handleOpenEditModal = (emp: EmployeeDto) => {
    setEditingEmpId(emp.id);
    setEditEmpCode(emp.employeeCode);
    setEditFirstName(emp.firstName);
    setEditLastName(emp.lastName);
    setEditPhone(emp.phone || '');
    setEditDepartment(emp.department);
    setEditDesignation(emp.designation);
    setEditBranch(emp.branch || '');
    setEditDeptId(emp.departmentId || '');
    setEditDesigId(emp.designationId || '');
    setEditBranchId(emp.branchId || '');
    setEditShiftId(emp.shiftId || '');
    setEditEmpTypeId(emp.employmentTypeId || '');
    setEditSalaryType(emp.salaryType || 'MONTHLY_FIXED');
    setEditStatus(emp.status || 'ACTIVE');
    if (emp.salaryStructure) {
      setEditBasicSalary(emp.salaryStructure.basicSalary.toString());
      setEditHra(emp.salaryStructure.hra.toString());
    } else {
      setEditBasicSalary('20000');
      setEditHra('5000');
    }
    setEditModalOpen(true);
  };

  // Submit Edit Employee
  const handleSaveEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const isPieceRate = editSalaryType === 'PIECE_RATE';
    const payload = {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      phone: editPhone.trim() ? editPhone.trim() : undefined,
      department: editDepartment.trim(),
      designation: editDesignation.trim(),
      branch: editBranch.trim() ? editBranch.trim() : undefined,
      departmentId: editDeptId || undefined,
      designationId: editDesigId || undefined,
      branchId: editBranchId || undefined,
      shiftId: editShiftId || undefined,
      employmentTypeId: editEmpTypeId || undefined,
      salaryType: editSalaryType,
      status: editStatus,
      basicSalary: isPieceRate ? 0 : (Number(editBasicSalary) || 0),
      hra: isPieceRate ? 0 : (Number(editHra) || 0),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/employees/${editingEmpId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg(`Employee ${editEmpCode} updated successfully!`);
        await fetchEmployees();
        setEditModalOpen(false);
        setSaving(false);
        return;
      }
    } catch (e) {
      console.warn('API error updating employee, updating locally', e);
    }

    // Local fallback update
    setEmployees(employees.map(emp => {
      if (emp.id === editingEmpId) {
        return {
          ...emp,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phone: payload.phone || null,
          department: payload.department,
          designation: payload.designation,
          branch: payload.branch || null,
          salaryType: payload.salaryType,
          status: payload.status,
          salaryStructure: isPieceRate ? null : {
            id: emp.salaryStructure?.id || 's-edit',
            employeeId: emp.id,
            basicSalary: payload.basicSalary,
            hra: payload.hra,
            specialAllowance: 0,
            conveyanceAllowance: 0,
            pfDeduction: 0,
            taxDeduction: 0,
            otherDeductions: 0,
            grossSalary: payload.basicSalary + payload.hra,
            netSalary: payload.basicSalary + payload.hra,
            currency: 'INR',
            effectiveDate: new Date().toISOString()
          }
        };
      }
      return emp;
    }));

    setSuccessMsg(`Employee ${editEmpCode} updated successfully!`);
    setEditModalOpen(false);
    setSaving(false);
  };

  // Delete Employee
  const handleDeleteEmployee = async (emp: EmployeeDto) => {
    if (!window.confirm(`Are you sure you want to delete employee "${emp.firstName} ${emp.lastName}" (${emp.employeeCode})?`)) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/employees/${emp.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        }
      });

      if (res.ok) {
        setSuccessMsg(`Employee "${emp.firstName} ${emp.lastName}" (${emp.employeeCode}) deleted successfully.`);
        await fetchEmployees();
        return;
      }
    } catch (e) {
      console.warn('API error deleting employee, removing locally', e);
    }

    setEmployees(employees.filter(e => e.id !== emp.id));
    setSuccessMsg(`Employee "${emp.firstName} ${emp.lastName}" (${emp.employeeCode}) deleted successfully.`);
  };

  // Filtered employees
  const filteredEmployees = employees.filter(emp => {
    const matchesSearch = 
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.phone || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
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
            Maintain organizational headcount, designations, branch assignments, and employee wage profiles.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
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
            placeholder="Search by code, name, phone, designation..."
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
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map(emp => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    {/* Employee Info - Email omitted in default visible mode */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-xs">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm">{emp.firstName} {emp.lastName}</div>
                          <div className="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
                            <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded font-bold text-slate-700">{emp.employeeCode}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{emp.phone || 'No mobile'}</span>
                            </span>
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
                      <div className="flex items-center gap-1.5 mb-1">
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
                          Daily piece output rate
                        </div>
                      ) : emp.salaryStructure ? (
                        <div>
                          <div className="font-bold text-emerald-700 text-xs">
                            ₹{emp.salaryStructure.grossSalary.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/ mo</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[10px]">Standard Scale</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                        {emp.status}
                      </span>
                    </td>

                    {/* Action Buttons: Edit and Delete */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(emp)}
                          title="Edit Employee"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEmployee(emp)}
                          title="Delete Employee"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL: ADD NEW EMPLOYEE                                  */}
      {/* ======================================================== */}
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
                  <p className="text-xs text-slate-500">Employee code is automatically assigned by the system</p>
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
                  {/* Automatic Employee Code */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Employee Code</span>
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" />
                        Auto-Generated
                      </span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={employeeCode}
                      className="w-full border border-slate-200 rounded-xl p-2.5 font-mono text-slate-700 text-xs font-bold bg-slate-100 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Ramesh"
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
                      placeholder="e.g. Kumar"
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Optional for floor workers"
                      className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone / Mobile</label>
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

              {/* 2. Company Master Allocation */}
              <div className="bg-slate-50/90 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-primary-100 text-primary-700 rounded-xl">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Company Master Allocation</h4>
                      <p className="text-[11px] text-slate-500">Departments, roles, branches, and shifts</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Department */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Department *</label>
                    <select
                      required
                      value={selectedDeptId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedDeptId(val);
                        const found = masterBundle.departments.find(d => d.id === val);
                        if (found) setDepartment(found.name);
                      }}
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    >
                      {masterBundle.departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Designation */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Designation / Role *</label>
                    <select
                      required
                      value={selectedDesigId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedDesigId(val);
                        const found = masterBundle.designations.find(d => d.id === val);
                        if (found) setDesignation(found.name);
                      }}
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    >
                      {masterBundle.designations.map(d => (
                        <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                      ))}
                    </select>
                  </div>

                  {/* Branch */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Branch / Unit *</label>
                    <select
                      required
                      value={selectedBranchId}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedBranchId(val);
                        const found = masterBundle.branches.find(b => b.id === val);
                        if (found) setBranch(found.name);
                      }}
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    >
                      {masterBundle.branches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Work Shift Schedule</label>
                    <select
                      value={selectedShiftId}
                      onChange={(e) => setSelectedShiftId(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    >
                      {masterBundle.shifts.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.startTime} - {s.endTime})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Employment Category</label>
                    <select
                      value={selectedEmpTypeId}
                      onChange={(e) => setSelectedEmpTypeId(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    >
                      {masterBundle.employmentTypes.map(et => (
                        <option key={et.id} value={et.id}>{et.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Salary System & Configuration */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-extrabold">3</span>
                    <span>Salary System & Configuration</span>
                  </h4>
                  {salaryType === 'MONTHLY_FIXED' && (
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold">
                      Gross: ₹{((Number(basicSalary)||0) + (Number(hra)||0) + (Number(specialAllowance)||0) + (Number(conveyanceAllowance)||0)).toLocaleString()}
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
                      <div className="text-[11px] text-slate-500 mt-0.5">Fixed monthly salary with allowances and statutory deductions.</div>
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
                      <div className="text-[11px] text-slate-500 mt-0.5">Computed purely from daily verified piece output (cutting, stitching, etc.).</div>
                    </div>
                  </button>
                </div>

                {/* ITEM 2: When Piece-Rate is selected, fixed salary items DISAPPEAR completely */}
                {salaryType === 'PIECE_RATE' ? (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs space-y-1.5">
                    <div className="font-bold flex items-center gap-1.5 text-amber-900 text-xs">
                      <Scissors className="w-4 h-4 text-amber-600" />
                      <span>Piece-Rate Wage System Activated</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      No fixed monthly salary structure required. Monthly earnings will be computed directly from daily logged units and approved piece rates.
                    </p>
                  </div>
                ) : (
                  /* Fixed Salary Inputs (shown ONLY for Monthly Fixed Salary) */
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">Basic Salary (₹) *</label>
                        <input
                          type="number"
                          required
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
                        <label className="block font-semibold text-slate-700 mb-1">Tax Deduction (₹)</label>
                        <input
                          type="number"
                          value={taxDeduction}
                          onChange={(e) => setTaxDeduction(e.target.value)}
                          className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold text-xs flex items-center gap-2 shadow"
                >
                  {saving ? 'Creating Employee...' : 'Save & Onboard Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: EDIT EMPLOYEE                                     */}
      {/* ======================================================== */}
      {editModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Pencil className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Edit Employee Details</h3>
                  <p className="text-xs text-slate-500">Employee Code: <strong className="font-mono">{editEmpCode}</strong></p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setEditModalOpen(false)} 
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditEmployee} className="p-8 space-y-5 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone / Mobile</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="PROBATION">PROBATION</option>
                    <option value="ON_LEAVE">ON_LEAVE</option>
                    <option value="TERMINATED">TERMINATED</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={editDeptId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditDeptId(val);
                      const found = masterBundle.departments.find(d => d.id === val);
                      if (found) setEditDepartment(found.name);
                    }}
                    className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold"
                  >
                    {masterBundle.departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Designation</label>
                  <select
                    value={editDesigId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditDesigId(val);
                      const found = masterBundle.designations.find(d => d.id === val);
                      if (found) setEditDesignation(found.name);
                    }}
                    className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold"
                  >
                    {masterBundle.designations.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Branch</label>
                  <select
                    value={editBranchId}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditBranchId(val);
                      const found = masterBundle.branches.find(b => b.id === val);
                      if (found) setEditBranch(found.name);
                    }}
                    className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold"
                  >
                    {masterBundle.branches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Salary System Selector */}
              <div className="space-y-3 pt-2">
                <label className="block font-bold text-slate-700">Salary System</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="editSalaryType"
                      value="MONTHLY_FIXED"
                      checked={editSalaryType === 'MONTHLY_FIXED'}
                      onChange={() => setEditSalaryType('MONTHLY_FIXED')}
                    />
                    <span>Monthly Fixed</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold">
                    <input
                      type="radio"
                      name="editSalaryType"
                      value="PIECE_RATE"
                      checked={editSalaryType === 'PIECE_RATE'}
                      onChange={() => setEditSalaryType('PIECE_RATE')}
                    />
                    <span>Piece-Rate Output</span>
                  </label>
                </div>

                {editSalaryType === 'PIECE_RATE' ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
                    Piece-rate worker: Compensated per verified output unit. Fixed salary fields are disabled.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Basic Salary (₹)</label>
                      <input
                        type="number"
                        value={editBasicSalary}
                        onChange={(e) => setEditBasicSalary(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">HRA (₹)</label>
                      <input
                        type="number"
                        value={editHra}
                        onChange={(e) => setEditHra(e.target.value)}
                        className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 font-bold text-xs"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
