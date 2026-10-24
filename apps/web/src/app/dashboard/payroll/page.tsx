'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { 
  FileText, DollarSign, Calendar, Check, X, 
  Printer, Play, Search, Filter, Building2, 
  Briefcase, ArrowUpRight, Award, ShieldCheck, 
  ChevronRight, ChevronLeft, Edit3, Scissors, AlertCircle, Download, Clock
} from 'lucide-react';
import { PayslipDto, SalaryStructureDto } from '@people-hub/shared-types';
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

interface EmployeeSalaryRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  designation: string;
  branch: string | null;
  salaryType?: string;
  salaryStructure: SalaryStructureDto | null;
}

export default function PayrollPage() {
  const { activeTenant, accessToken, activeBranchScope } = useApp();
  const [activeTab, setActiveTab] = useState<'structures' | 'generate' | 'history'>('structures');
  const [structures, setStructures] = useState<EmployeeSalaryRow[]>([]);
  const [payslips, setPayslips] = useState<PayslipDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Edit Salary Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<EmployeeSalaryRow | null>(null);
  const [basicSalary, setBasicSalary] = useState('25000');
  const [hra, setHra] = useState('10000');
  const [specialAllowance, setSpecialAllowance] = useState('3000');
  const [conveyanceAllowance, setConveyanceAllowance] = useState('2000');
  const [pfDeduction, setPfDeduction] = useState('1800');
  const [taxDeduction, setTaxDeduction] = useState('1200');
  const [savingSalary, setSavingSalary] = useState(false);

  // Generate Payslip State
  const [cycleType, setCycleType] = useState<'MONTHLY' | 'WEEKLY'>('MONTHLY');
  const [genMonth, setGenMonth] = useState(10); // October
  const [genYear, setGenYear] = useState(2026);
  const [genWeek, setGenWeek] = useState(42); // Current Week
  const [generating, setGenerating] = useState(false);

  // Helper for week date range
  const weekDateRange = useMemo(() => {
    const daysOffset = (genWeek - 1) * 7;
    const start = new Date(genYear, 0, 1 + daysOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      startStr: start.toISOString().split('T')[0],
      endStr: end.toISOString().split('T')[0],
      display: `${formatDate(start)} - ${formatDate(end)}, ${genYear}`
    };
  }, [genWeek, genYear]);

  // Pre-Run live salary breakdown for all eligible staff
  const preRunSalaries = useMemo(() => {
    const isWeekly = cycleType === 'WEEKLY';
    const ratio = isWeekly ? (6 / 30) : 1;
    return structures.map(emp => {
      const st = emp.salaryStructure;
      const isPieceRate = emp.salaryType === 'PIECE_RATE';
      const base = st ? Math.round(st.basicSalary * ratio) : (isPieceRate ? Math.round(22000 * ratio) : 0);
      const hra = st ? Math.round(st.hra * ratio) : 0;
      const allowances = st ? Math.round((st.specialAllowance + st.conveyanceAllowance) * ratio) : 0;
      const pf = st ? Math.round(st.pfDeduction * ratio) : 0;
      const tax = st ? Math.round(st.taxDeduction * ratio) : 0;
      const other = st ? Math.round(st.otherDeductions * ratio) : 0;

      const grossEarnings = base + hra + allowances;
      const totalDeductions = pf + tax + other;
      const netPayable = grossEarnings - totalDeductions;

      return {
        ...emp,
        base,
        hra,
        allowances,
        totalAllowances: hra + allowances,
        pf,
        tax,
        totalDeductions,
        grossEarnings,
        netPayable,
        isConfigured: !!st || isPieceRate
      };
    });
  }, [structures, cycleType]);

  const preRunTotals = useMemo(() => {
    const eligible = preRunSalaries.filter(s => s.isConfigured);
    const totalGross = eligible.reduce((acc, s) => acc + s.grossEarnings, 0);
    const totalDeductions = eligible.reduce((acc, s) => acc + s.totalDeductions, 0);
    const totalNet = eligible.reduce((acc, s) => acc + s.netPayable, 0);
    return {
      count: eligible.length,
      totalGross,
      totalDeductions,
      totalNet
    };
  }, [preRunSalaries]);

  // Printable Payslip Modal State
  const [viewPayslip, setViewPayslip] = useState<PayslipDto | null>(null);

  // Close payslip on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setViewPayslip(null);
        setEditModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchPayrollData = async () => {
    if (!activeTenant) return;
    setLoading(true);
    try {
      const [structRes, slipsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/payroll/structures`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-tenant-id': activeTenant.id
          }
        }),
        fetch(`${API_BASE_URL}/api/v1/payroll/payslips`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-tenant-id': activeTenant.id
          }
        })
      ]);

      if (structRes.ok && slipsRes.ok) {
        const structs = await structRes.json();
        const slips = await slipsRes.json();
        setStructures(structs);
        setPayslips(slips);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API error fetching payroll', e);
    }

    setStructures([]);
    setPayslips([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchPayrollData();
  }, [activeTenant, accessToken]);

  const openEditSalary = (emp: EmployeeSalaryRow) => {
    setSelectedEmp(emp);
    if (emp.salaryStructure) {
      setBasicSalary(emp.salaryStructure.basicSalary.toString());
      setHra(emp.salaryStructure.hra.toString());
      setSpecialAllowance(emp.salaryStructure.specialAllowance.toString());
      setConveyanceAllowance(emp.salaryStructure.conveyanceAllowance.toString());
      setPfDeduction(emp.salaryStructure.pfDeduction.toString());
      setTaxDeduction(emp.salaryStructure.taxDeduction.toString());
    } else {
      setBasicSalary('20000');
      setHra('8000');
      setSpecialAllowance('2000');
      setConveyanceAllowance('1000');
      setPfDeduction('1800');
      setTaxDeduction('500');
    }
    setEditModalOpen(true);
  };

  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    setSavingSalary(true);

    const payload = {
      basicSalary: Number(basicSalary) || 0,
      hra: Number(hra) || 0,
      specialAllowance: Number(specialAllowance) || 0,
      conveyanceAllowance: Number(conveyanceAllowance) || 0,
      pfDeduction: Number(pfDeduction) || 0,
      taxDeduction: Number(taxDeduction) || 0,
      otherDeductions: 0
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/payroll/structures/${selectedEmp.employeeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg(`Salary structure updated for ${selectedEmp.employeeName}!`);
        await fetchPayrollData();
        setEditModalOpen(false);
        setSavingSalary(false);
        return;
      }
    } catch (e) {
      console.warn('API error, updating locally', e);
    }

    setErrorMsg('Failed to update salary structure via API');
    setSavingSalary(false);
  };

  const handleGeneratePayslips = async () => {
    setGenerating(true);
    setErrorMsg(null);

    const isWeekly = cycleType === 'WEEKLY';
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const payPeriod = isWeekly
      ? `Week ${genWeek} (${weekDateRange.display})`
      : `${monthNames[genMonth - 1]} ${genYear}`;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/payroll/payslips/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        },
        body: JSON.stringify({
          month: genMonth,
          year: genYear,
          cycleType,
          weekNumber: genWeek,
          startDate: isWeekly ? weekDateRange.startStr : undefined,
          endDate: isWeekly ? weekDateRange.endStr : undefined,
          payPeriod,
          workingDays: isWeekly ? 6 : 30
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(`Generated ${data.generatedCount} payslips for ${payPeriod}!`);
        await fetchPayrollData();
        setActiveTab('history');
        setGenerating(false);
        return;
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to generate payslips');
        setGenerating(false);
        return;
      }
    } catch (e) {
      console.warn('API error generating payslips, simulating locally', e);
    }

    setErrorMsg('Failed to generate payslips via API');
    setGenerating(false);
  };

  // Pagination States
  const [structPage, setStructPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const pageSize = 10;

  const totalStructPages = Math.max(1, Math.ceil(structures.length / pageSize));
  const paginatedStructures = structures.slice((structPage - 1) * pageSize, structPage * pageSize);

  const totalHistoryPages = Math.max(1, Math.ceil(payslips.length / pageSize));
  const paginatedPayslips = payslips.slice((historyPage - 1) * pageSize, historyPage * pageSize);

  const payrollTabs: EnterpriseTabItem<'structures' | 'generate' | 'history'>[] = [
    { key: 'structures', label: 'Salary Structures', count: structures.length, icon: DollarSign },
    { key: 'generate', label: 'Run Payroll', icon: Play },
    { key: 'history', label: 'Payslips', count: payslips.length, icon: FileText },
  ];

  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const tenantSlug = activeTenant?.slug || 'export';

    if (activeTab === 'history') {
      if (payslips.length === 0) return;
      exportToExcel({
        filename: `Payslips_History_${tenantSlug}_${dateStr}`,
        sheetName: 'Payslips',
        columns: [
          { header: 'Employee Code', accessor: 'employeeCode' },
          { header: 'Employee Name', accessor: 'employeeName' },
          { header: 'Pay Period', accessor: (r) => `${r.month}/${r.year}` },
          { header: 'Gross Salary (₹)', accessor: 'grossEarnings' },
          { header: 'Total Deductions (₹)', accessor: 'totalDeductions' },
          { header: 'Net Salary (₹)', accessor: 'netPayable' },
          { header: 'Status', accessor: 'status' },
          { header: 'Payment Date', accessor: (r) => r.paymentDate ? r.paymentDate.split('T')[0] : '-' },
        ],
        data: payslips,
      });
    } else {
      if (structures.length === 0) return;
      exportToExcel({
        filename: `Salary_Structures_${tenantSlug}_${dateStr}`,
        sheetName: 'Salary Structures',
        columns: [
          { header: 'Employee Code', accessor: 'employeeCode' },
          { header: 'Employee Name', accessor: 'employeeName' },
          { header: 'Department', accessor: 'department' },
          { header: 'Designation', accessor: 'designation' },
          { header: 'Salary Type', accessor: 'salaryType' },
          { header: 'Basic Salary (₹)', accessor: (r) => r.salaryStructure?.basicSalary ?? 0 },
          { header: 'HRA (₹)', accessor: (r) => r.salaryStructure?.hra ?? 0 },
          { header: 'Gross Salary (₹)', accessor: (r) => r.salaryStructure?.grossSalary ?? 0 },
          { header: 'PF Deduction (₹)', accessor: (r) => r.salaryStructure?.pfDeduction ?? 0 },
          { header: 'Net Salary (₹)', accessor: (r) => r.salaryStructure?.netSalary ?? 0 },
        ],
        data: structures,
      });
    }
  };

  return (
    <div className="space-y-3">
      {/* Enterprise Toolbar */}
      <EnterpriseToolbar
        title="Payroll & Compensation"
        tenantName={activeTenant?.name}
        totalCount={activeTab === 'structures' ? structures.length : activeTab === 'history' ? payslips.length : undefined}
        filters={
          activeTab !== 'generate' && (
            <button
              type="button"
              onClick={handleExportExcel}
              title="Download Excel (.xlsx)"
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 text-xs font-medium shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Excel</span>
            </button>
          )
        }
      />

      {/* Enterprise Tabs */}
      <EnterpriseTabs
        tabs={payrollTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Success / Error alerts */}
      {successMsg && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between font-medium">
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
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: SALARY STRUCTURES */}
      {activeTab === 'structures' && (
        <EnterpriseTable
          loading={loading}
          isEmpty={structures.length === 0}
          emptyMessage="No employee salary structures found."
          footer={
            structures.length > 0 && (
              <EnterprisePagination
                currentPage={structPage}
                totalItems={structures.length}
                pageSize={pageSize}
                onPageChange={setStructPage}
                itemLabel="staff"
              />
            )
          }
        >
          <table className="w-full text-left border-collapse text-xs">
            <EnterpriseTableHeader>
              <EnterpriseTableTh>Employee</EnterpriseTableTh>
              <EnterpriseTableTh>Payroll Type</EnterpriseTableTh>
              <EnterpriseTableTh>Basic Salary</EnterpriseTableTh>
              <EnterpriseTableTh>Allowances (HRA + Special)</EnterpriseTableTh>
              <EnterpriseTableTh>Deductions (PF + Tax)</EnterpriseTableTh>
              <EnterpriseTableTh>Gross / Net Monthly</EnterpriseTableTh>
              <EnterpriseTableTh align="right">Action</EnterpriseTableTh>
            </EnterpriseTableHeader>
            <EnterpriseTableBody>
              {paginatedStructures.map(emp => {
                const st = emp.salaryStructure;
                return (
                  <EnterpriseTableRow key={emp.employeeId}>
                    <EnterpriseTableTd>
                      <div className="font-semibold text-slate-900 text-xs">{emp.employeeName}</div>
                      <div className="text-slate-500 text-[10px] flex items-center gap-1.5">
                        <span className="font-medium text-slate-600">{emp.employeeCode}</span>
                        <span>•</span>
                        <span>{emp.designation}</span>
                      </div>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      <EnterpriseBadge variant={emp.salaryType === 'PIECE_RATE' ? 'warning' : 'info'}>
                        {emp.salaryType === 'PIECE_RATE' ? 'Piece-Rate' : 'Monthly Fixed'}
                      </EnterpriseBadge>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd className="font-semibold text-slate-800">
                      {st ? `₹${st.basicSalary.toLocaleString()}` : '—'}
                    </EnterpriseTableTd>

                    <EnterpriseTableTd className="text-slate-700">
                      {st ? (
                        <div>
                          <span className="font-medium text-slate-800">₹{(st.hra + st.specialAllowance + st.conveyanceAllowance).toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 block">HRA: ₹{st.hra.toLocaleString()}</span>
                        </div>
                      ) : '—'}
                    </EnterpriseTableTd>

                    <EnterpriseTableTd className="text-rose-600">
                      {st ? (
                        <div>
                          <span className="font-medium">-₹{(st.pfDeduction + st.taxDeduction).toLocaleString()}</span>
                          <span className="text-[10px] text-slate-400 block">PF: ₹{st.pfDeduction.toLocaleString()}</span>
                        </div>
                      ) : '—'}
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      {st ? (
                        <div>
                          <div className="font-bold text-emerald-700 text-xs">
                            ₹{st.netSalary.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">Net</span>
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Gross: ₹{st.grossSalary.toLocaleString()}
                          </div>
                        </div>
                      ) : (
                        <EnterpriseBadge variant="warning">
                          Not Configured
                        </EnterpriseBadge>
                      )}
                    </EnterpriseTableTd>

                    <EnterpriseTableTd align="right">
                      <button
                        onClick={() => openEditSalary(emp)}
                        className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 transition inline-flex items-center gap-1 shadow-2xs"
                      >
                        <Edit3 className="w-3 h-3 text-slate-500" />
                        <span>{st ? 'Edit' : 'Setup'}</span>
                      </button>
                    </EnterpriseTableTd>
                  </EnterpriseTableRow>
                );
              })}
            </EnterpriseTableBody>
          </table>
        </EnterpriseTable>
      )}

      {/* TAB 2: RUN PAYROLL (COMPACT HIGH-DENSITY WORKBENCH) */}
      {activeTab === 'generate' && (
        <div className="space-y-3">
          {/* Integrated Control & Execution Bar */}
          <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs p-2.5 sm:p-3 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Cycle Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setCycleType('MONTHLY')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                    cycleType === 'MONTHLY'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Monthly</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCycleType('WEEKLY')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold transition flex items-center gap-1.5 ${
                    cycleType === 'WEEKLY'
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Weekly</span>
                </button>
              </div>

              {/* Inline Month / Week Picker */}
              {cycleType === 'MONTHLY' ? (
                <div className="flex items-center gap-1.5">
                  <select
                    value={genMonth}
                    onChange={(e) => setGenMonth(Number(e.target.value))}
                    className="border border-slate-200 rounded-lg px-2.5 py-1 bg-white font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  >
                    {[
                      'January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'
                    ].map((m, idx) => (
                      <option key={m} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={genYear}
                    onChange={(e) => setGenYear(Number(e.target.value))}
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1 font-mono font-semibold text-slate-800 text-xs text-center focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                  <span className="text-[11px] text-slate-400 font-medium hidden sm:inline px-1">
                    (Standard 30 Days)
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <select
                    value={genWeek}
                    onChange={(e) => setGenWeek(Number(e.target.value))}
                    className="border border-slate-200 rounded-lg px-2.5 py-1 bg-white font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  >
                    {Array.from({ length: 52 }, (_, i) => i + 1).map((w) => (
                      <option key={w} value={w}>Week {w}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    value={genYear}
                    onChange={(e) => setGenYear(Number(e.target.value))}
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1 font-mono font-semibold text-slate-800 text-xs text-center focus:ring-1 focus:ring-slate-900 focus:outline-none"
                  />
                  <span className="text-[11px] font-bold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 font-mono">
                    {weekDateRange.display}
                  </span>
                </div>
              )}
            </div>

            {/* Run / Generate Button in Top Toolbar */}
            <button
              type="button"
              onClick={handleGeneratePayslips}
              disabled={generating || preRunTotals.count === 0}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-lg transition shadow-2xs flex items-center gap-1.5 shrink-0"
            >
              {generating ? (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              <span>Generate Payslips (₹{preRunTotals.totalNet.toLocaleString()})</span>
            </button>
          </div>

          {/* Compact Summary KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Eligible Staff</span>
                <span className="text-[10px] text-slate-500 font-medium">{cycleType === 'WEEKLY' ? 'Weekly Line' : 'Monthly Workforce'}</span>
              </div>
              <span className="text-sm font-black text-slate-900 font-mono">{preRunTotals.count}</span>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Gross Earnings</span>
                <span className="text-[10px] text-slate-500 font-medium">Base + Allowances</span>
              </div>
              <span className="text-sm font-black text-slate-900 font-mono">₹{preRunTotals.totalGross.toLocaleString()}</span>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Deductions</span>
                <span className="text-[10px] text-slate-500 font-medium">PF & Tax</span>
              </div>
              <span className="text-sm font-black text-rose-600 font-mono">-₹{preRunTotals.totalDeductions.toLocaleString()}</span>
            </div>
            <div className="bg-emerald-50/70 px-3 py-1.5 rounded-lg border border-emerald-200/80 shadow-2xs flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-emerald-800 block leading-tight">Net Payout</span>
                <span className="text-[10px] text-emerald-700 font-medium">Net Take-Home</span>
              </div>
              <span className="text-sm font-black text-emerald-900 font-mono">₹{preRunTotals.totalNet.toLocaleString()}</span>
            </div>
          </div>

          {/* PRE-RUN SALARY DETAILS TABLE */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Pre-Run Salary Breakdown ({preRunSalaries.length} Employees)
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                Period: <strong className="text-slate-800">{cycleType === 'WEEKLY' ? `Week ${genWeek} (${weekDateRange.display})` : `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][genMonth-1]} ${genYear}`}</strong>
              </span>
            </div>

            <EnterpriseTable
              loading={loading}
              isEmpty={preRunSalaries.length === 0}
              emptyMessage="No employees found for payroll calculation."
            >
              <table className="w-full text-left border-collapse text-xs">
                <EnterpriseTableHeader>
                  <EnterpriseTableTh>Employee</EnterpriseTableTh>
                  <EnterpriseTableTh>Payroll Type</EnterpriseTableTh>
                  <EnterpriseTableTh align="right">Base / Output</EnterpriseTableTh>
                  <EnterpriseTableTh align="right">Allowances</EnterpriseTableTh>
                  <EnterpriseTableTh align="right">Deductions</EnterpriseTableTh>
                  <EnterpriseTableTh align="right">Net Payout</EnterpriseTableTh>
                  <EnterpriseTableTh align="center">Calculation Status</EnterpriseTableTh>
                </EnterpriseTableHeader>
                <EnterpriseTableBody>
                  {preRunSalaries.map((s) => (
                    <EnterpriseTableRow key={s.employeeId}>
                      <EnterpriseTableTd>
                        <div className="font-semibold text-slate-900 text-xs">{s.employeeName}</div>
                        <div className="text-slate-500 text-[10px] flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-600 font-mono">{s.employeeCode}</span>
                          <span>•</span>
                          <span>{s.department}</span>
                        </div>
                      </EnterpriseTableTd>

                      <EnterpriseTableTd>
                        <EnterpriseBadge variant={s.salaryType === 'PIECE_RATE' ? 'warning' : 'info'}>
                          {s.salaryType === 'PIECE_RATE' ? (
                            <>
                              <Scissors className="w-2.5 h-2.5 text-amber-600 inline mr-0.5" />
                              Piece-Rate
                            </>
                          ) : (
                            'Monthly Fixed'
                          )}
                        </EnterpriseBadge>
                      </EnterpriseTableTd>

                      <EnterpriseTableTd align="right" className="font-mono text-slate-800 font-semibold">
                        ₹{s.base.toLocaleString()}
                      </EnterpriseTableTd>

                      <EnterpriseTableTd align="right" className="font-mono text-slate-700">
                        {s.totalAllowances > 0 ? `+₹${s.totalAllowances.toLocaleString()}` : '—'}
                      </EnterpriseTableTd>

                      <EnterpriseTableTd align="right" className="font-mono text-rose-600">
                        {s.totalDeductions > 0 ? `-₹${s.totalDeductions.toLocaleString()}` : '—'}
                      </EnterpriseTableTd>

                      <EnterpriseTableTd align="right">
                        <span className="font-mono font-bold text-emerald-700 text-xs bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ₹{s.netPayable.toLocaleString()}
                        </span>
                      </EnterpriseTableTd>

                      <EnterpriseTableTd align="center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Ready
                        </span>
                      </EnterpriseTableTd>
                    </EnterpriseTableRow>
                  ))}
                </EnterpriseTableBody>
              </table>
            </EnterpriseTable>
          </div>
        </div>
      )}

      {/* TAB 3: GENERATED PAYSLIPS */}
      {activeTab === 'history' && (
        <EnterpriseTable
          loading={loading}
          isEmpty={payslips.length === 0}
          emptyMessage="No payslips generated yet. Go to 'Run Payroll' tab to issue payslips."
          footer={
            payslips.length > 0 && (
              <EnterprisePagination
                currentPage={historyPage}
                totalItems={payslips.length}
                pageSize={pageSize}
                onPageChange={setHistoryPage}
                itemLabel="payslips"
              />
            )
          }
        >
          <table className="w-full text-left border-collapse text-xs">
            <EnterpriseTableHeader>
              <EnterpriseTableTh>Employee</EnterpriseTableTh>
              <EnterpriseTableTh>Payroll Type</EnterpriseTableTh>
              <EnterpriseTableTh>Pay Period</EnterpriseTableTh>
              <EnterpriseTableTh>Gross Earnings</EnterpriseTableTh>
              <EnterpriseTableTh>Total Deductions</EnterpriseTableTh>
              <EnterpriseTableTh>Net Payout</EnterpriseTableTh>
              <EnterpriseTableTh>Status</EnterpriseTableTh>
              <EnterpriseTableTh align="right">Document</EnterpriseTableTh>
            </EnterpriseTableHeader>
            <EnterpriseTableBody>
              {paginatedPayslips.map(ps => (
                <EnterpriseTableRow key={ps.id}>
                  <EnterpriseTableTd>
                    <div className="font-semibold text-slate-900 text-xs">{ps.employeeName}</div>
                    <div className="text-slate-500 text-[10px] flex items-center gap-1.5 mt-0.5">
                      <span className="font-medium text-slate-600">{ps.employeeCode}</span>
                      <span>•</span>
                      <span>{ps.department}</span>
                    </div>
                  </EnterpriseTableTd>

                  <EnterpriseTableTd>
                    {ps.salaryType === 'PIECE_RATE' ? (
                      <EnterpriseBadge variant="warning">
                        <Scissors className="w-2.5 h-2.5 text-amber-600 inline mr-0.5" />
                        Piece-Rate {ps.pieceRateUnits ? `(${ps.pieceRateUnits} pcs)` : ''}
                      </EnterpriseBadge>
                    ) : (
                      <EnterpriseBadge variant="info">Monthly Fixed</EnterpriseBadge>
                    )}
                  </EnterpriseTableTd>

                  <EnterpriseTableTd className="font-medium text-slate-700">
                    {ps.payPeriod}
                  </EnterpriseTableTd>

                  <EnterpriseTableTd className="font-semibold text-slate-800">
                    ₹{ps.grossEarnings.toLocaleString()}
                  </EnterpriseTableTd>

                  <EnterpriseTableTd className="text-rose-600 font-medium">
                    -₹{ps.totalDeductions.toLocaleString()}
                  </EnterpriseTableTd>

                  <EnterpriseTableTd className="font-bold text-emerald-700 text-xs">
                    ₹{ps.netPayable.toLocaleString()}
                  </EnterpriseTableTd>

                  <EnterpriseTableTd>
                    <EnterpriseBadge variant="success">
                      {ps.status}
                    </EnterpriseBadge>
                  </EnterpriseTableTd>

                  <EnterpriseTableTd align="right">
                    <button
                      onClick={() => setViewPayslip(ps)}
                      className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 transition inline-flex items-center gap-1 shadow-2xs"
                    >
                      <Printer className="w-3 h-3 text-slate-500" />
                      <span>Print</span>
                    </button>
                  </EnterpriseTableTd>
                </EnterpriseTableRow>
              ))}
            </EnterpriseTableBody>
          </table>
        </EnterpriseTable>
      )}

      {/* MODAL 1: EDIT SALARY */}
      {editModalOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary-100 text-primary-700 rounded-lg">
                  <DollarSign className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Salary Configuration</h3>
                  <p className="text-[11px] text-slate-400">{selectedEmp.employeeName} ({selectedEmp.employeeCode})</p>
                </div>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSalary} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Basic Salary (₹) *</label>
                  <input
                    type="number"
                    required
                    value={basicSalary}
                    onChange={(e) => setBasicSalary(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HRA (₹)</label>
                  <input
                    type="number"
                    value={hra}
                    onChange={(e) => setHra(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Special Allowance (₹)</label>
                  <input
                    type="number"
                    value={specialAllowance}
                    onChange={(e) => setSpecialAllowance(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Conveyance (₹)</label>
                  <input
                    type="number"
                    value={conveyanceAllowance}
                    onChange={(e) => setConveyanceAllowance(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">PF Deduction (₹)</label>
                  <input
                    type="number"
                    value={pfDeduction}
                    onChange={(e) => setPfDeduction(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tax / TDS (₹)</label>
                  <input
                    type="number"
                    value={taxDeduction}
                    onChange={(e) => setTaxDeduction(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Calculated Preview */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                <div className="flex justify-between text-emerald-900 font-medium">
                  <span>Gross Earnings:</span>
                  <span className="font-mono font-bold">
                    ₹{(Number(basicSalary) + Number(hra) + Number(specialAllowance) + Number(conveyanceAllowance)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-900 font-medium">
                  <span>Total Deductions:</span>
                  <span className="font-mono text-red-600">
                    -₹{(Number(pfDeduction) + Number(taxDeduction)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-950 font-bold border-t border-emerald-200 pt-1 text-sm">
                  <span>Net Take Home:</span>
                  <span className="font-mono">
                    ₹{((Number(basicSalary) + Number(hra) + Number(specialAllowance) + Number(conveyanceAllowance)) - (Number(pfDeduction) + Number(taxDeduction))).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSalary}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-2 shadow"
                >
                  {savingSalary ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  <span>Save Structure</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: PRINTABLE OFFICIAL PAYSLIP */}
      {viewPayslip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Sticky Header with Always-Visible Print & Close buttons */}
            <div className="shrink-0 flex items-center justify-between px-5 py-2.5 bg-slate-900 text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Official Payslip
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  • {viewPayslip.employeeCode} - {viewPayslip.employeeName}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewPayslip(null)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  title="Close (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Printable Payslip Body */}
            <div id="printable-payslip" className="overflow-y-auto flex-1 p-5 sm:p-6 text-slate-800 space-y-4 text-xs bg-white">
              {/* Company Header with Full Legal, Address & Tax Info */}
              <div className="text-center pb-5 border-b-2 border-slate-900 space-y-1.5">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {viewPayslip.companyName || activeTenant?.name}
                </h2>
                {activeTenant?.address && (
                  <p className="text-slate-600 text-xs font-medium max-w-xl mx-auto leading-relaxed">
                    {activeTenant.address}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium">
                  {activeTenant?.phone && <span><strong>Phone:</strong> {activeTenant.phone}</span>}
                  {activeTenant?.email && <span>• <strong>Email:</strong> {activeTenant.email}</span>}
                  {activeTenant?.website && <span>• <strong>Web:</strong> {activeTenant.website}</span>}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-600 font-semibold">
                  {activeTenant?.taxId && <span><strong>GSTIN / Tax ID:</strong> {activeTenant.taxId}</span>}
                  {activeTenant?.registrationNo && <span>• <strong>CIN:</strong> {activeTenant.registrationNo}</span>}
                  <span>• <strong>Branch:</strong> {viewPayslip.branch || activeBranchScope || 'Head Office'}</span>
                </div>
                <div className="inline-block bg-slate-900 text-white font-black px-4 py-1 rounded-md text-xs mt-2 uppercase tracking-wider">
                  PAYSLIP FOR {viewPayslip.payPeriod?.toUpperCase()}
                </div>
              </div>

              {/* Employee & Pay Details Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="space-y-1.5">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Employee Code:</span>
                    <span className="font-mono font-bold text-slate-800 ml-2">{viewPayslip.employeeCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Employee Name:</span>
                    <span className="font-bold text-slate-800 ml-2">{viewPayslip.employeeName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Designation:</span>
                    <span className="font-medium text-slate-700 ml-2">{viewPayslip.designation}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Salary System:</span>
                    <span className={`ml-2 px-2 py-0.5 rounded text-[10px] font-bold ${
                      viewPayslip.salaryType === 'PIECE_RATE'
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        : 'bg-slate-200 text-slate-700'
                    }`}>
                      {viewPayslip.salaryType === 'PIECE_RATE' ? 'Piece-Rate (Garment Skills)' : 'Monthly Fixed Salary'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Department:</span>
                    <span className="font-medium text-slate-700 ml-2">{viewPayslip.department}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">
                      {viewPayslip.salaryType === 'PIECE_RATE' ? 'Total Units Done:' : 'Working Days:'}
                    </span>
                    <span className="font-bold font-mono text-slate-800 ml-2">
                      {viewPayslip.salaryType === 'PIECE_RATE'
                        ? `${(viewPayslip.pieceRateUnits || 0).toLocaleString()} pcs`
                        : `${viewPayslip.workingDays} days`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Payment Status:</span>
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px] ml-2">
                      {viewPayslip.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Piece-Rate Activity Breakdown Table (For Piece-Rate Garment Workers) */}
              {viewPayslip.salaryType === 'PIECE_RATE' && (
                <div className="border border-indigo-200 rounded-xl overflow-hidden bg-indigo-50/20">
                  <div className="bg-indigo-50 px-4 py-2 font-bold text-indigo-900 text-[11px] uppercase border-b border-indigo-100 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Scissors className="w-3.5 h-3.5 text-indigo-600" />
                      Daily Production Output Breakdown (Itemized Garment Operations)
                    </span>
                    <span className="font-mono text-xs text-indigo-700 font-bold">
                      {viewPayslip.pieceRateUnits || 0} Total Units
                    </span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100/75 text-slate-600 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="px-3 py-1.5">Operation / Skill Activity</th>
                        <th className="px-3 py-1.5 text-right">Units Completed</th>
                        <th className="px-3 py-1.5 text-right">Rate / Unit</th>
                        <th className="px-3 py-1.5 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {viewPayslip.pieceRateDetails && viewPayslip.pieceRateDetails.length > 0 ? (
                        viewPayslip.pieceRateDetails.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-3 py-1.5 font-sans font-medium text-slate-800">{item.activityName}</td>
                            <td className="px-3 py-1.5 text-right text-indigo-700 font-bold">{item.units.toLocaleString()} pcs</td>
                            <td className="px-3 py-1.5 text-right text-slate-600">₹{item.rate.toLocaleString()}</td>
                            <td className="px-3 py-1.5 text-right font-bold text-slate-900">₹{item.total.toLocaleString()}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-3 py-2 text-center text-slate-400 font-sans italic">
                            No itemized production breakdown logs recorded for this period.
                          </td>
                        </tr>
                      )}
                      <tr className="bg-indigo-100/50 font-bold text-indigo-950">
                        <td className="px-3 py-2 font-sans">Total Production Wage Earnings</td>
                        <td className="px-3 py-2 text-right">{(viewPayslip.pieceRateUnits || 0).toLocaleString()} pcs</td>
                        <td className="px-3 py-2 text-right">-</td>
                        <td className="px-3 py-2 text-right text-indigo-900">₹{viewPayslip.basicSalary.toLocaleString()}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {/* Earnings & Deductions Tables */}
              <div className="grid grid-cols-2 gap-4">
                {/* Earnings Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700 text-[11px] uppercase border-b border-slate-200">
                    Earnings
                  </div>
                  <div className="divide-y divide-slate-100 p-2 text-xs space-y-1">
                    <div className="flex justify-between py-1 px-2">
                      <span className="text-slate-600">
                        {viewPayslip.salaryType === 'PIECE_RATE' ? 'Piece Production Wage' : 'Basic Salary'}
                      </span>
                      <span className="font-mono font-semibold">₹{viewPayslip.basicSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2">
                      <span className="text-slate-600">House Rent Allowance (HRA)</span>
                      <span className="font-mono font-semibold">₹{viewPayslip.hra.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2">
                      <span className="text-slate-600">Special & Other Allowances</span>
                      <span className="font-mono font-semibold">₹{viewPayslip.allowances.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 px-2 font-bold text-slate-900 border-t-2 border-slate-200 bg-slate-50/50">
                      <span>Total Earnings (Gross)</span>
                      <span className="font-mono">₹{viewPayslip.grossEarnings.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Deductions Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700 text-[11px] uppercase border-b border-slate-200">
                    Deductions
                  </div>
                  <div className="divide-y divide-slate-100 p-2 text-xs space-y-1">
                    <div className="flex justify-between py-1 px-2">
                      <span className="text-slate-600">Provident Fund (PF)</span>
                      <span className="font-mono font-semibold text-red-600">₹{viewPayslip.pfDeduction.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2">
                      <span className="text-slate-600">Income Tax (TDS)</span>
                      <span className="font-mono font-semibold text-red-600">₹{viewPayslip.taxDeduction.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-1 px-2">
                      <span className="text-slate-600">Other Deductions</span>
                      <span className="font-mono font-semibold text-red-600">₹{(viewPayslip.otherDeductions || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 px-2 font-bold text-slate-900 border-t-2 border-slate-200 bg-slate-50/50">
                      <span>Total Deductions</span>
                      <span className="font-mono text-red-600">₹{viewPayslip.totalDeductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {viewPayslip.remarks && (
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                  <span className="font-bold text-slate-700">Remarks:</span> {viewPayslip.remarks}
                </div>
              )}

              {/* Net Payable Highlight Banner */}
              <div className="bg-emerald-50 border-2 border-emerald-500/40 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider block">
                    Net Take-Home Salary
                  </span>
                  <span className="text-xs text-slate-500 italic mt-0.5 block">
                    Direct bank disbursement via NEFT / Automated payroll
                  </span>
                </div>
                <div className="text-2xl font-black text-emerald-900 font-mono">
                  ₹{viewPayslip.netPayable.toLocaleString()}
                </div>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-xs text-slate-500">
                <div className="border-t border-slate-300 pt-2 text-center">
                  <p className="font-semibold text-slate-700">Employer Authorized Signatory</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">HR & Payroll Department</p>
                </div>
                <div className="border-t border-slate-300 pt-2 text-center">
                  <p className="font-semibold text-slate-700">Employee Signature</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{viewPayslip.employeeName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
