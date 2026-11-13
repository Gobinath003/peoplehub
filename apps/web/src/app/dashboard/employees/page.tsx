'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { 
  Users, Plus, Search, Filter, Check, X, 
  Building2, Briefcase, Calendar, Phone, 
  BadgeCheck, DollarSign, ChevronRight, ChevronLeft, AlertCircle, Scissors, Layers,
  Pencil, Trash2, Lock, Download, KeyRound, Clock, Banknote
} from 'lucide-react';
import { EmployeeDto, MasterBundleDto, SalaryType } from '@people-hub/shared-types';
import { CompensationFields, CompensationSummaryCell } from '../../../components/CompensationFields';
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

const EMPTY_MASTER_BUNDLE: MasterBundleDto = {
  departments: [],
  designations: [],
  branches: [],
  shifts: [],
  employmentTypes: [],
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const asUuidOrUndefined = (val?: string) => (val && UUID_RE.test(val.trim()) ? val.trim() : undefined);

const SALARY_TYPE_CATALOG = [
  { code: SalaryType.MONTHLY_FIXED, label: 'Monthly Fixed Salary', shortLabel: 'Monthly Fixed', desc: 'Fixed monthly salary with allowances and statutory deductions.' },
  { code: SalaryType.HOURLY, label: 'Hourly Rate Salary', shortLabel: 'Hourly Rate', desc: 'Hourly billing rate paid from verified daily regular & overtime hours.' },
  { code: SalaryType.PIECE_RATE, label: 'Piece-Rate Output Salary', shortLabel: 'Piece-Rate Output', desc: 'Computed purely from daily verified piece output (cutting, stitching, etc.).' },
  { code: SalaryType.DAILY_WAGE, label: 'Daily Wage Salary', shortLabel: 'Daily Wage', desc: 'Per-day wage rate multiplied by working days in the pay cycle.' },
];

export default function EmployeesPage() {
  const { activeTenant, accessToken, activeBranchScope, enabledSalaryTypes, hasPermission } = useApp();
  const canCreateEmployee = hasPermission('EMPLOYEE_CREATE');
  const canEditEmployee = hasPermission('EMPLOYEE_EDIT');
  const canDeleteEmployee = hasPermission('EMPLOYEE_DELETE');
  const [tenantSalaryTypes, setTenantSalaryTypes] = useState<string[]>(enabledSalaryTypes);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [masterBundle, setMasterBundle] = useState<MasterBundleDto>(EMPTY_MASTER_BUNDLE);
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
  const [hourlyRate, setHourlyRate] = useState('500');
  const [dailyRate, setDailyRate] = useState('800');
  const [standardHours, setStandardHours] = useState('160');
  const [overtimeMultiplier, setOvertimeMultiplier] = useState('1.5');

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
  const [editHourlyRate, setEditHourlyRate] = useState('500');
  const [editDailyRate, setEditDailyRate] = useState('800');
  const [editStandardHours, setEditStandardHours] = useState('160');
  const [editOvertimeMultiplier, setEditOvertimeMultiplier] = useState('1.5');
  const [editPfDeduction, setEditPfDeduction] = useState('0');
  const [editTaxDeduction, setEditTaxDeduction] = useState('0');
  const [editStatus, setEditStatus] = useState('ACTIVE');
  const [reportingManagerId, setReportingManagerId] = useState('');
  const [createPortalLogin, setCreatePortalLogin] = useState(false);
  const [portalPassword, setPortalPassword] = useState('Welcome@123');
  const [portalRoleCode, setPortalRoleCode] = useState('EMPLOYEE');
  const [editReportingManagerId, setEditReportingManagerId] = useState('');
  const [portalModalEmp, setPortalModalEmp] = useState<EmployeeDto | null>(null);
  const [portalLoginEmail, setPortalLoginEmail] = useState('');
  const [portalLoginPassword, setPortalLoginPassword] = useState('Welcome@123');
  const [portalLoginRole, setPortalLoginRole] = useState('EMPLOYEE');
  const [savingPortalLogin, setSavingPortalLogin] = useState(false);

  const fetchMasters = async (): Promise<MasterBundleDto> => {
    if (!activeTenant || !accessToken) return EMPTY_MASTER_BUNDLE;
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/masters/bundle`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id
        }
      });
      if (res.ok) {
        const bundleData: MasterBundleDto = await res.json();
        const normalized: MasterBundleDto = {
          departments: Array.isArray(bundleData?.departments) ? bundleData.departments : [],
          designations: Array.isArray(bundleData?.designations) ? bundleData.designations : [],
          branches: Array.isArray(bundleData?.branches) ? bundleData.branches : [],
          shifts: Array.isArray(bundleData?.shifts) ? bundleData.shifts : [],
          employmentTypes: Array.isArray(bundleData?.employmentTypes) ? bundleData.employmentTypes : [],
        };
        setMasterBundle(normalized);
        setSelectedDeptId(prev => prev || normalized.departments[0]?.id || '');
        setDepartment(prev => prev || normalized.departments[0]?.name || '');
        setSelectedDesigId(prev => prev || normalized.designations[0]?.id || '');
        setDesignation(prev => prev || normalized.designations[0]?.name || '');
        setSelectedBranchId(prev => prev || normalized.branches[0]?.id || '');
        setBranch(prev => prev || normalized.branches[0]?.name || '');
        setSelectedShiftId(prev => prev || normalized.shifts[0]?.id || '');
        setSelectedEmpTypeId(prev => prev || normalized.employmentTypes[0]?.id || '');
        return normalized;
      }
    } catch (e) {
      console.warn('Could not fetch master bundle from API', e);
    }
    return EMPTY_MASTER_BUNDLE;
  };

  const fetchEmployees = async () => {
    if (!activeTenant || !accessToken) {
      setEmployees([]);
      setLoading(false);
      return;
    }
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
        setEmployees(Array.isArray(data) ? data : []);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API error fetching employees', e);
    }

    setEmployees([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchEmployees();
    setTenantSalaryTypes(enabledSalaryTypes);
    fetchMasters();
    if (activeTenant && accessToken) {
      fetch(`${API_BASE_URL}/api/v1/tenants/salary-types`, {
        headers: { 'Authorization': `Bearer ${accessToken}`, 'x-tenant-id': activeTenant.id }
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (Array.isArray(data?.enabledSalaryTypes) && data.enabledSalaryTypes.length > 0) {
            setTenantSalaryTypes(data.enabledSalaryTypes);
          }
        })
        .catch(() => {});
    }
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

  const handleOpenAddModal = async () => {
    setErrorMsg(null);
    let currentBundle = masterBundle;
    if (currentBundle.departments.length === 0) {
      currentBundle = await fetchMasters();
    }
    const autoCode = getNextEmployeeCode();
    setEmployeeCode(autoCode);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    const defaultST = tenantSalaryTypes[0] || SalaryType.MONTHLY_FIXED;
    setSalaryType(defaultST);
    setHourlyRate('500');
    setDailyRate('800');
    setStandardHours(defaultST === SalaryType.DAILY_WAGE ? '26' : '160');
    setOvertimeMultiplier('1.5');
    setBasicSalary('22000');
    setHra('8000');
    setSpecialAllowance('2500');
    setConveyanceAllowance('1500');
    setPfDeduction('1800');
    setTaxDeduction('1000');
    setSelectedDeptId(currentBundle.departments[0]?.id || '');
    setDepartment(currentBundle.departments[0]?.name || '');
    setSelectedDesigId(currentBundle.designations[0]?.id || '');
    setDesignation(currentBundle.designations[0]?.name || '');
    setSelectedBranchId(currentBundle.branches[0]?.id || '');
    setBranch(currentBundle.branches[0]?.name || '');
    setSelectedShiftId(currentBundle.shifts[0]?.id || '');
    setSelectedEmpTypeId(currentBundle.employmentTypes[0]?.id || '');
    setReportingManagerId('');
    setCreatePortalLogin(false);
    setPortalPassword('Welcome@123');
    setPortalRoleCode('EMPLOYEE');
    setModalOpen(true);
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !accessToken) {
      setErrorMsg('Session expired. Please sign in again.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);

    const isPieceRate = salaryType === 'PIECE_RATE';

    const payload = {
      employeeCode: employeeCode.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() ? email.trim() : undefined,
      phone: phone.trim() ? phone.trim() : undefined,
      department: department.trim() || 'General',
      designation: designation.trim() || 'Staff',
      branch: branch.trim() || undefined,
      departmentId: asUuidOrUndefined(selectedDeptId),
      designationId: asUuidOrUndefined(selectedDesigId),
      branchId: asUuidOrUndefined(selectedBranchId),
      shiftId: asUuidOrUndefined(selectedShiftId),
      employmentTypeId: asUuidOrUndefined(selectedEmpTypeId),
      reportingManagerId: asUuidOrUndefined(reportingManagerId),
      createPortalLogin,
      portalPassword: createPortalLogin ? portalPassword : undefined,
      roleCode: createPortalLogin ? portalRoleCode : undefined,
      salaryType,
      joiningDate,
      status: 'ACTIVE',
      basicSalary: salaryType === SalaryType.MONTHLY_FIXED ? (Number(basicSalary) || 0) : 0,
      hra: salaryType === SalaryType.MONTHLY_FIXED ? (Number(hra) || 0) : 0,
      specialAllowance: salaryType === SalaryType.MONTHLY_FIXED ? (Number(specialAllowance) || 0) : 0,
      conveyanceAllowance: salaryType === SalaryType.MONTHLY_FIXED ? (Number(conveyanceAllowance) || 0) : 0,
      hourlyRate: salaryType === SalaryType.HOURLY ? (Number(hourlyRate) || 0) : 0,
      dailyRate: salaryType === SalaryType.DAILY_WAGE ? (Number(dailyRate) || 0) : 0,
      standardHours: salaryType === SalaryType.HOURLY || salaryType === SalaryType.DAILY_WAGE ? (Number(standardHours) || 0) : 0,
      overtimeMultiplier: salaryType === SalaryType.HOURLY ? (Number(overtimeMultiplier) || 1.5) : 1.5,
      pfDeduction: isPieceRate ? 0 : (Number(pfDeduction) || 0),
      taxDeduction: isPieceRate ? 0 : (Number(taxDeduction) || 0),
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/employees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const created: EmployeeDto = await res.json();
        setSuccessMsg(`Employee "${created.firstName} ${created.lastName}" (${created.employeeCode}) created successfully!`);
        await fetchEmployees();
        setModalOpen(false);
        setSaving(false);
        return;
      }

      const err = await res.json().catch(() => ({}));
      const msg = Array.isArray(err?.message) ? err.message.join(', ') : (err?.message || `Failed to create employee (HTTP ${res.status})`);
      setErrorMsg(msg);
      setSaving(false);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Unable to connect to the server to create employee. Please try again.');
      setSaving(false);
    }
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
      setEditHourlyRate((emp.salaryStructure.hourlyRate ?? 500).toString());
      setEditDailyRate((emp.salaryStructure.dailyRate ?? 800).toString());
      setEditStandardHours((emp.salaryStructure.standardHours ?? (emp.salaryType === SalaryType.DAILY_WAGE ? 26 : 160)).toString());
      setEditOvertimeMultiplier((emp.salaryStructure.overtimeMultiplier ?? 1.5).toString());
      setEditPfDeduction((emp.salaryStructure.pfDeduction ?? 0).toString());
      setEditTaxDeduction((emp.salaryStructure.taxDeduction ?? 0).toString());
    } else {
      setEditBasicSalary('20000');
      setEditHra('5000');
      setEditHourlyRate('500');
      setEditDailyRate('800');
      setEditStandardHours(emp.salaryType === SalaryType.DAILY_WAGE ? '26' : '160');
      setEditOvertimeMultiplier('1.5');
      setEditPfDeduction('0');
      setEditTaxDeduction('0');
    }
    setEditReportingManagerId(emp.reportingManagerId || '');
    setEditModalOpen(true);
  };

  // Submit Edit Employee
  const handleSaveEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      firstName: editFirstName.trim(),
      lastName: editLastName.trim(),
      phone: editPhone.trim() ? editPhone.trim() : undefined,
      department: editDepartment.trim() || 'General',
      designation: editDesignation.trim() || 'Staff',
      branch: editBranch.trim() ? editBranch.trim() : undefined,
      departmentId: asUuidOrUndefined(editDeptId),
      designationId: asUuidOrUndefined(editDesigId),
      branchId: asUuidOrUndefined(editBranchId),
      shiftId: asUuidOrUndefined(editShiftId),
      employmentTypeId: asUuidOrUndefined(editEmpTypeId),
      reportingManagerId: editReportingManagerId || '',
      salaryType: editSalaryType,
      status: editStatus,
      basicSalary: editSalaryType === SalaryType.MONTHLY_FIXED ? (Number(editBasicSalary) || 0) : 0,
      hra: editSalaryType === SalaryType.MONTHLY_FIXED ? (Number(editHra) || 0) : 0,
      hourlyRate: editSalaryType === SalaryType.HOURLY ? (Number(editHourlyRate) || 0) : 0,
      dailyRate: editSalaryType === SalaryType.DAILY_WAGE ? (Number(editDailyRate) || 0) : 0,
      standardHours: editSalaryType === SalaryType.HOURLY || editSalaryType === SalaryType.DAILY_WAGE ? (Number(editStandardHours) || 0) : 0,
      overtimeMultiplier: editSalaryType === SalaryType.HOURLY ? (Number(editOvertimeMultiplier) || 1.5) : 1.5,
      pfDeduction: editSalaryType === SalaryType.PIECE_RATE ? 0 : (Number(editPfDeduction) || 0),
      taxDeduction: editSalaryType === SalaryType.PIECE_RATE ? 0 : (Number(editTaxDeduction) || 0),
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
      const err = await res.json().catch(() => ({}));
      setErrorMsg(Array.isArray(err.message) ? err.message.join(', ') : (err.message || `Failed to update employee ${editEmpCode}`));
      setSaving(false);
    } catch (e: any) {
      setErrorMsg(e?.message || `Unable to update employee ${editEmpCode}. Please try again.`);
      setSaving(false);
    }
  };

  const handleOpenPortalModal = (emp: EmployeeDto) => {
    setPortalModalEmp(emp);
    setPortalLoginEmail(emp.email || '');
    setPortalLoginPassword('Welcome@123');
    setPortalLoginRole('EMPLOYEE');
    setErrorMsg(null);
  };

  const handleSavePortalLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalModalEmp || !activeTenant) return;
    setSavingPortalLogin(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/employees/${portalModalEmp.id}/portal-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id,
        },
        body: JSON.stringify({
          email: portalLoginEmail.trim() || undefined,
          password: portalLoginPassword.trim(),
          roleCode: portalLoginRole,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to provision portal login');
      }
      const updated: EmployeeDto = await res.json();
      setSuccessMsg(
        `Portal login active for ${updated.firstName} ${updated.lastName} — sign in with ID "${updated.employeeCode}" or "${updated.email || portalLoginEmail}".`
      );
      setPortalModalEmp(null);
      await fetchEmployees();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to provision portal login');
    } finally {
      setSavingPortalLogin(false);
    }
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
      const err = await res.json().catch(() => ({}));
      setErrorMsg(Array.isArray(err.message) ? err.message.join(', ') : (err.message || `Failed to delete employee (${res.status})`));
    } catch (e: any) {
      setErrorMsg(e?.message || 'Unable to delete employee due to a network error.');
    }
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

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

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / pageSize));
  const paginatedEmployees = filteredEmployees.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const departments = ['ALL', ...Array.from(new Set([
    ...masterBundle.departments.map(d => d.name),
    ...employees.map(e => e.department)
  ]))];

  const handleExportExcel = () => {
    if (filteredEmployees.length === 0) return;
    exportToExcel({
      filename: `Employees_${activeTenant?.slug || 'export'}_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Employees',
      columns: [
        { header: 'Employee Code', accessor: 'employeeCode' },
        { header: 'First Name', accessor: 'firstName' },
        { header: 'Last Name', accessor: 'lastName' },
        { header: 'Department', accessor: 'department' },
        { header: 'Designation', accessor: 'designation' },
        { header: 'Branch', accessor: (r) => r.branch || '-' },
        { header: 'Reporting Manager', accessor: (r) => r.reportingManagerName ? `${r.reportingManagerName} (${r.reportingManagerCode})` : 'Unassigned' },
        { header: 'Salary Type', accessor: 'salaryType' },
        { header: 'Compensation Rate / Gross', accessor: (r) => r.salaryType === SalaryType.HOURLY ? `₹${(r.salaryStructure?.hourlyRate || 0).toLocaleString()}/hr` : r.salaryType === SalaryType.DAILY_WAGE ? `₹${(r.salaryStructure?.dailyRate || 0).toLocaleString()}/day` : r.salaryStructure?.grossSalary ? `₹${r.salaryStructure.grossSalary.toLocaleString()}/mo` : '-' },
        { header: 'Phone', accessor: (r) => r.phone || '-' },
        { header: 'Status', accessor: 'status' },
        { header: 'Joining Date', accessor: (r) => r.joiningDate ? r.joiningDate.split('T')[0] : '-' },
      ],
      data: filteredEmployees,
    });
  };

  return (
    <div className="space-y-3">
      {/* Enterprise Toolbar */}
      <EnterpriseToolbar
        title="Employee Directory"
        totalCount={filteredEmployees.length}
        tenantName={activeTenant?.name}
        searchPlaceholder="Search code, name, phone..."
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        filters={
          <div className="flex items-center gap-1.5">
            <select
              value={selectedDept}
              onChange={(e) => {
                setSelectedDept(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              {departments.map(d => (
                <option key={d} value={d}>{d === 'ALL' ? 'All Depts' : d}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleExportExcel}
              title="Download Excel (.xlsx)"
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 text-xs font-medium shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Excel</span>
            </button>
          </div>
        }
        primaryActionLabel={canCreateEmployee ? 'Add Employee' : undefined}
        onPrimaryAction={canCreateEmployee ? handleOpenAddModal : undefined}
      />

      {/* Success / Error Banner */}
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
      {errorMsg && !modalOpen && !editModalOpen && !portalModalEmp && (
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

      {/* Enterprise Employee Table */}
      <EnterpriseTable
        loading={loading}
        isEmpty={filteredEmployees.length === 0}
        emptyMessage="No employees found matching criteria."
        footer={
          filteredEmployees.length > 0 && (
            <EnterprisePagination
              currentPage={currentPage}
              totalItems={filteredEmployees.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="employees"
            />
          )
        }
      >
        <table className="w-full text-left border-collapse text-xs">
          <EnterpriseTableHeader>
            <EnterpriseTableTh>Employee</EnterpriseTableTh>
            <EnterpriseTableTh>Department & Role</EnterpriseTableTh>
            <EnterpriseTableTh>Branch Scope</EnterpriseTableTh>
            <EnterpriseTableTh>Reporting Manager</EnterpriseTableTh>
            <EnterpriseTableTh>Compensation Profile</EnterpriseTableTh>
            <EnterpriseTableTh>Status</EnterpriseTableTh>
            <EnterpriseTableTh align="right">Actions</EnterpriseTableTh>
          </EnterpriseTableHeader>
          <EnterpriseTableBody>
            {paginatedEmployees.map(emp => (
              <EnterpriseTableRow key={emp.id}>
                {/* Employee Info - Email omitted in default visible mode */}
                <EnterpriseTableTd>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 border border-slate-200">
                      {emp.firstName[0]}{emp.lastName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 text-xs truncate">
                        {emp.firstName} {emp.lastName}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                        <span className="font-medium text-slate-600">{emp.employeeCode}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          <span>{emp.phone || 'No mobile'}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </EnterpriseTableTd>

                {/* Department & Role */}
                <EnterpriseTableTd>
                  <div className="font-medium text-slate-800 text-xs">{emp.designation}</div>
                  <div className="text-slate-400 text-[10px]">{emp.department}</div>
                </EnterpriseTableTd>

                {/* Branch */}
                <EnterpriseTableTd>
                  <span className="inline-flex items-center gap-1 text-slate-700 font-medium text-xs">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    <span>{emp.branch || 'Global Branch'}</span>
                  </span>
                </EnterpriseTableTd>

                {/* Reporting Manager */}
                <EnterpriseTableTd>
                  {emp.reportingManagerName ? (
                    <div>
                      <div className="font-semibold text-slate-800 text-xs">{emp.reportingManagerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{emp.reportingManagerCode}</div>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                  )}
                </EnterpriseTableTd>

                {/* Compensation */}
                <EnterpriseTableTd>
                  <CompensationSummaryCell
                    salaryType={emp.salaryType}
                    salaryStructure={emp.salaryStructure}
                  />
                </EnterpriseTableTd>

                {/* Status */}
                <EnterpriseTableTd>
                  {emp.status === 'ACTIVE' ? (
                    <EnterpriseBadge variant="success">Active</EnterpriseBadge>
                  ) : (
                    <EnterpriseBadge variant="neutral">{emp.status || 'Active'}</EnterpriseBadge>
                  )}
                </EnterpriseTableTd>

                {/* Action Buttons: Edit and Delete */}
                <EnterpriseTableTd align="right">
                  <div className="flex items-center justify-end gap-1">
                    {canEditEmployee && (
                      <button
                        type="button"
                        onClick={() => handleOpenPortalModal(emp)}
                        title={emp.userId ? 'Reset Portal Login Credentials' : 'Provision Portal Login'}
                        className={`p-1 rounded transition ${
                          emp.userId
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-amber-600 hover:bg-amber-50'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canEditEmployee && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(emp)}
                        title="Edit Employee"
                        className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded transition"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDeleteEmployee && (
                      <button
                        type="button"
                        onClick={() => handleDeleteEmployee(emp)}
                        title="Delete Employee"
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </EnterpriseTableTd>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </table>
      </EnterpriseTable>

      {/* ======================================================== */}
      {/* MODAL: PROVISION / RESET EMPLOYEE PORTAL LOGIN */}
      {portalModalEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 text-emerald-400 rounded-xl">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    {portalModalEmp.userId ? 'Reset Portal Login Credentials' : 'Provision Employee Portal Login'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {portalModalEmp.firstName} {portalModalEmp.lastName} ({portalModalEmp.employeeCode})
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => setPortalModalEmp(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePortalLogin} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-[11px] text-emerald-900">
                Once provisioned, this employee can sign in using their Employee ID (<strong>{portalModalEmp.employeeCode}</strong>) or Email address to view leave balances, apply for leaves, and review team requests if they are a Reporting Manager.
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Portal Email (Optional if using Employee ID)</label>
                <input
                  type="email"
                  value={portalLoginEmail}
                  onChange={(e) => setPortalLoginEmail(e.target.value)}
                  placeholder={`e.g. ${portalModalEmp.employeeCode.toLowerCase()}@company.com`}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Portal Password *</label>
                <input
                  type="text"
                  required
                  minLength={4}
                  value={portalLoginPassword}
                  onChange={(e) => setPortalLoginPassword(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Portal Access Role</label>
                <select
                  value={portalLoginRole}
                  onChange={(e) => setPortalLoginRole(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold"
                >
                  <option value="EMPLOYEE">Employee Self-Service (Leave Apply / Manager Approvals)</option>
                  <option value="HR_MANAGER">HR Manager (Workforce & Leave Admin)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPortalModalEmp(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPortalLogin}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow"
                >
                  {savingPortalLogin ? 'Saving...' : 'Save Portal Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                      className="w-full border border-slate-200 rounded-xl p-2.5 text-slate-700 text-xs font-semibold bg-slate-50 cursor-not-allowed"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">
                      Reporting Manager <span className="text-slate-400 font-normal">(Leave Approver)</span>
                    </label>
                    <select
                      value={reportingManagerId}
                      onChange={(e) => setReportingManagerId(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                    >
                      <option value="">No Reporting Manager (Routes to HR / Admin)</option>
                      {employees
                        .filter((emp) => emp.status !== 'TERMINATED')
                        .map((emp) => (
                          <option key={emp.id} value={emp.id}>
                            {emp.employeeCode} — {emp.firstName} {emp.lastName} ({emp.designation})
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="p-3 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2.5">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                        <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Enable Employee Portal Login</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={createPortalLogin}
                        onChange={(e) => setCreatePortalLogin(e.target.checked)}
                      />
                    </label>
                    {createPortalLogin && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Portal Password</label>
                          <input
                            type="text"
                            required={createPortalLogin}
                            value={portalPassword}
                            onChange={(e) => setPortalPassword(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-1.5 bg-white text-slate-800 font-mono text-[11px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 mb-1">Access Role</label>
                          <select
                            value={portalRoleCode}
                            onChange={(e) => setPortalRoleCode(e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-1.5 bg-white text-slate-800 text-[11px] font-semibold"
                          >
                            <option value="EMPLOYEE">Employee (Self-Service)</option>
                            <option value="HR_MANAGER">HR Manager</option>
                          </select>
                        </div>
                      </div>
                    )}
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

                <CompensationFields
                  allowedTypes={tenantSalaryTypes}
                  salaryType={salaryType}
                  onSalaryTypeChange={(nextType) => {
                    setSalaryType(nextType);
                    if (nextType === SalaryType.HOURLY) {
                      setStandardHours('160');
                    } else if (nextType === SalaryType.DAILY_WAGE) {
                      setStandardHours('26');
                    }
                  }}
                  values={{
                    basicSalary,
                    hra,
                    specialAllowance,
                    conveyanceAllowance,
                    hourlyRate,
                    dailyRate,
                    standardHours,
                    overtimeMultiplier,
                    pfDeduction,
                    taxDeduction,
                  }}
                  onChange={(field, val) => {
                    if (field === 'basicSalary') setBasicSalary(val);
                    else if (field === 'hra') setHra(val);
                    else if (field === 'specialAllowance') setSpecialAllowance(val);
                    else if (field === 'conveyanceAllowance') setConveyanceAllowance(val);
                    else if (field === 'hourlyRate') setHourlyRate(val);
                    else if (field === 'dailyRate') setDailyRate(val);
                    else if (field === 'standardHours') setStandardHours(val);
                    else if (field === 'overtimeMultiplier') setOvertimeMultiplier(val);
                    else if (field === 'pfDeduction') setPfDeduction(val);
                    else if (field === 'taxDeduction') setTaxDeduction(val);
                  }}
                />
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
                  <p className="text-xs text-slate-500">Employee Code: <strong className="font-semibold text-slate-800">{editEmpCode}</strong></p>
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

            {errorMsg && (
              <div className="mx-8 mt-4 p-3.5 bg-red-50 border-l-4 border-red-500 text-red-700 text-xs rounded-lg font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

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

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reporting Manager <span className="text-slate-400 font-normal">(Leave Approver)</span>
                </label>
                <select
                  value={editReportingManagerId}
                  onChange={(e) => setEditReportingManagerId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-primary-500 focus:outline-none"
                >
                  <option value="">No Reporting Manager (Routes to HR / Admin)</option>
                  {employees
                    .filter((emp) => emp.id !== editingEmpId && emp.status !== 'TERMINATED')
                    .map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} — {emp.firstName} {emp.lastName} ({emp.designation})
                      </option>
                    ))}
                </select>
              </div>

              {/* Salary System Selector */}
              <div className="space-y-3 pt-2">
                <label className="block font-bold text-slate-700">Salary System &amp; Compensation Rate</label>
                <CompensationFields
                  compact
                  allowedTypes={tenantSalaryTypes}
                  salaryType={editSalaryType}
                  onSalaryTypeChange={(nextType) => {
                    setEditSalaryType(nextType);
                    if (nextType === SalaryType.HOURLY && (!editStandardHours || editStandardHours === '26' || editStandardHours === '0')) {
                      setEditStandardHours('160');
                    } else if (nextType === SalaryType.DAILY_WAGE && (!editStandardHours || editStandardHours === '160' || editStandardHours === '0')) {
                      setEditStandardHours('26');
                    }
                  }}
                  values={{
                    basicSalary: editBasicSalary,
                    hra: editHra,
                    specialAllowance: '0',
                    conveyanceAllowance: '0',
                    hourlyRate: editHourlyRate,
                    dailyRate: editDailyRate,
                    standardHours: editStandardHours,
                    overtimeMultiplier: editOvertimeMultiplier,
                    pfDeduction: editPfDeduction,
                    taxDeduction: editTaxDeduction,
                  }}
                  onChange={(field, val) => {
                    if (field === 'basicSalary') setEditBasicSalary(val);
                    else if (field === 'hra') setEditHra(val);
                    else if (field === 'hourlyRate') setEditHourlyRate(val);
                    else if (field === 'dailyRate') setEditDailyRate(val);
                    else if (field === 'standardHours') setEditStandardHours(val);
                    else if (field === 'overtimeMultiplier') setEditOvertimeMultiplier(val);
                    else if (field === 'pfDeduction') setEditPfDeduction(val);
                    else if (field === 'taxDeduction') setEditTaxDeduction(val);
                  }}
                />
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
