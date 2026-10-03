'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { 
  FileText, DollarSign, Calendar, Check, X, 
  Printer, Play, Search, Filter, Building2, 
  Briefcase, ArrowUpRight, Award, ShieldCheck, 
  ChevronRight, Edit3, Scissors 
} from 'lucide-react';
import { PayslipDto, SalaryStructureDto } from '@people-hub/shared-types';

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
  const { activeTenant, accessToken } = useApp();
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
  const [genMonth, setGenMonth] = useState(9); // September
  const [genYear, setGenYear] = useState(2026);
  const [generating, setGenerating] = useState(false);

  // Printable Payslip Modal State
  const [viewPayslip, setViewPayslip] = useState<PayslipDto | null>(null);

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
      console.warn('API error fetching payroll, falling back to mock data', e);
    }

    // Mock Fallback
    const mockStructures: EmployeeSalaryRow[] = [
      {
        employeeId: 'e1',
        employeeCode: 'EMP-101',
        employeeName: 'Kavitha Ramesh',
        department: 'Sewing & Stitching',
        designation: 'Senior Tailor Master',
        branch: 'Chennai Branch',
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
          effectiveDate: '2026-01-01'
        }
      },
      {
        employeeId: 'e2',
        employeeCode: 'EMP-102',
        employeeName: 'Anand Murugan',
        department: 'Quality Control',
        designation: 'Fabric Quality Inspector',
        branch: 'Chennai Branch',
        salaryStructure: {
          id: 's2',
          employeeId: 'e2',
          basicSalary: 28000,
          hra: 11000,
          specialAllowance: 4000,
          conveyanceAllowance: 2000,
          pfDeduction: 2160,
          taxDeduction: 1500,
          otherDeductions: 0,
          grossSalary: 45000,
          netSalary: 41340,
          currency: 'INR',
          effectiveDate: '2026-01-01'
        }
      }
    ];

    const mockSlips: PayslipDto[] = [
      {
        id: 'p1',
        tenantId: activeTenant.id,
        employeeId: 'e1',
        employeeCode: 'EMP-101',
        employeeName: 'Kavitha Ramesh',
        department: 'Sewing & Stitching',
        designation: 'Senior Tailor Master',
        branch: 'Chennai Branch',
        companyName: activeTenant.name,
        payPeriod: 'August 2026',
        month: 8,
        year: 2026,
        workingDays: 31,
        presentDays: 31,
        paidDays: 31,
        basicSalary: 25000,
        hra: 10000,
        allowances: 5000,
        grossEarnings: 40000,
        pfDeduction: 1800,
        taxDeduction: 1200,
        otherDeductions: 0,
        totalDeductions: 3000,
        netPayable: 37000,
        status: 'PAID',
        paymentDate: '2026-08-31T00:00:00Z',
        remarks: 'Processed for August 2026',
        createdAt: '2026-08-31T00:00:00Z'
      }
    ];

    setStructures(mockStructures);
    setPayslips(mockSlips);
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

    // Local fallback
    const gross = payload.basicSalary + payload.hra + payload.specialAllowance + payload.conveyanceAllowance;
    const net = gross - (payload.pfDeduction + payload.taxDeduction);

    setStructures(prev => prev.map(item => {
      if (item.employeeId === selectedEmp.employeeId) {
        return {
          ...item,
          salaryStructure: {
            id: `s-mock-${Date.now()}`,
            employeeId: item.employeeId,
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
            effectiveDate: new Date().toISOString()
          }
        };
      }
      return item;
    }));

    setSuccessMsg(`Salary structure updated for ${selectedEmp.employeeName} (Net: ₹${net.toLocaleString()})`);
    setEditModalOpen(false);
    setSavingSalary(false);
  };

  const handleGeneratePayslips = async () => {
    setGenerating(true);
    setErrorMsg(null);

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const payPeriod = `${monthNames[genMonth - 1]} ${genYear}`;

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
          payPeriod,
          workingDays: 30
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

    // Local fallback generation
    const newSlips: PayslipDto[] = structures
      .filter(s => s.salaryStructure !== null)
      .map((s, idx) => {
        const st = s.salaryStructure!;
        const allowances = st.specialAllowance + st.conveyanceAllowance;
        const deductions = st.pfDeduction + st.taxDeduction;
        return {
          id: `ps-${Date.now()}-${idx}`,
          tenantId: activeTenant?.id || '',
          employeeId: s.employeeId,
          employeeCode: s.employeeCode,
          employeeName: s.employeeName,
          department: s.department,
          designation: s.designation,
          branch: s.branch,
          companyName: activeTenant?.name,
          payPeriod,
          month: genMonth,
          year: genYear,
          workingDays: 30,
          presentDays: 30,
          paidDays: 30,
          basicSalary: st.basicSalary,
          hra: st.hra,
          allowances,
          grossEarnings: st.grossSalary,
          pfDeduction: st.pfDeduction,
          taxDeduction: st.taxDeduction,
          otherDeductions: 0,
          totalDeductions: deductions,
          netPayable: st.netSalary,
          status: 'GENERATED',
          paymentDate: new Date().toISOString(),
          remarks: `Automated payroll execution for ${payPeriod}`,
          createdAt: new Date().toISOString()
        };
      });

    setPayslips([...newSlips, ...payslips]);
    setSuccessMsg(`Successfully generated ${newSlips.length} payslips for ${payPeriod}!`);
    setActiveTab('history');
    setGenerating(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800">Payroll & Payslip Management</h1>
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-xs border border-emerald-200">
              {activeTenant?.name}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Establish employee salary structures, execute monthly payroll runs, and generate print-ready payslips.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold self-start md:self-auto">
          <button
            onClick={() => setActiveTab('structures')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'structures' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Salary Structures
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'generate' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Run Monthly Payroll
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Generated Payslips ({payslips.length})
          </button>
        </div>
      </div>

      {/* Success / Error alerts */}
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

      {errorMsg && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-800 rounded-lg text-xs flex items-center justify-between font-semibold">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-600 hover:text-red-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: SALARY STRUCTURES */}
      {activeTab === 'structures' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Staff Compensation Directory</span>
            <span className="text-slate-400">Click &quot;Configure Salary&quot; on any employee to update compensation breakdown</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Employee</th>
                  <th className="py-3.5 px-6">Basic Salary</th>
                  <th className="py-3.5 px-6">Allowances (HRA + Special)</th>
                  <th className="py-3.5 px-6">Deductions (PF + Tax)</th>
                  <th className="py-3.5 px-6">Gross / Net Monthly</th>
                  <th className="py-3.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {structures.map(emp => {
                  const st = emp.salaryStructure;
                  return (
                    <tr key={emp.employeeId} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800 text-sm">{emp.employeeName}</div>
                        <div className="text-slate-400 text-[11px]">
                          <span className="font-mono bg-slate-100 px-1 rounded">{emp.employeeCode}</span>
                          <span className="mx-1.5">•</span>
                          <span>{emp.designation}</span>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono font-semibold text-slate-700">
                        {st ? `₹${st.basicSalary.toLocaleString()}` : '—'}
                      </td>

                      <td className="py-4 px-6 text-slate-600">
                        {st ? (
                          <div>
                            <span className="font-mono">₹{(st.hra + st.specialAllowance + st.conveyanceAllowance).toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">HRA: ₹{st.hra.toLocaleString()}</span>
                          </div>
                        ) : '—'}
                      </td>

                      <td className="py-4 px-6 text-red-600 font-mono">
                        {st ? (
                          <div>
                            <span>₹{(st.pfDeduction + st.taxDeduction).toLocaleString()}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">PF: ₹{st.pfDeduction.toLocaleString()}</span>
                          </div>
                        ) : '—'}
                      </td>

                      <td className="py-4 px-6">
                        {st ? (
                          <div>
                            <div className="font-black text-emerald-700 text-sm font-mono">
                              ₹{st.netSalary.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">Net</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Gross: ₹{st.grossSalary.toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200">
                            Not Configured
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => openEditSalary(emp)}
                          className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1 ml-auto bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 transition"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{st ? 'Edit Salary' : 'Setup Salary'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: RUN MONTHLY PAYROLL */}
      {activeTab === 'generate' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 space-y-6 max-w-2xl">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Play className="w-5 h-5 text-emerald-600" />
              <span>Execute Monthly Payroll</span>
            </h2>
            <p className="text-xs text-slate-500">
              Run automated compensation calculation and generate official payslips for all active employees.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pay Month</label>
              <select
                value={genMonth}
                onChange={(e) => setGenMonth(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              >
                <option value={1}>January</option>
                <option value={2}>February</option>
                <option value={3}>March</option>
                <option value={4}>April</option>
                <option value={5}>May</option>
                <option value={6}>June</option>
                <option value={7}>July</option>
                <option value={8}>August</option>
                <option value={9}>September</option>
                <option value={10}>October</option>
                <option value={11}>November</option>
                <option value={12}>December</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pay Year</label>
              <input
                type="number"
                value={genYear}
                onChange={(e) => setGenYear(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5">
            <span className="font-bold text-slate-700 block">Pre-run Summary:</span>
            <div className="flex justify-between text-slate-600">
              <span>Configured Employees in {activeTenant?.name}:</span>
              <span className="font-bold font-mono">{structures.length} Total Staff</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Standard Monthly Working Days:</span>
              <span className="font-bold font-mono">30 Days</span>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-relaxed space-y-1">
              <strong className="flex items-center gap-1.5 font-bold">
                <Scissors className="w-3.5 h-3.5 text-amber-700" />
                <span>Dual Salary System Processing:</span>
              </strong>
              <div className="text-amber-800">
                • <strong>Monthly Fixed Staff:</strong> Basic salary & configured allowances applied.<br />
                • <strong>Piece-Rate Workers:</strong> Automatically calculates wages by aggregating daily production logs (Cutting, Stitching, etc.) for this month.
              </div>
            </div>
          </div>

          <button
            onClick={handleGeneratePayslips}
            disabled={generating}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl transition shadow flex items-center justify-center gap-2"
          >
            {generating ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <Play className="w-4 h-4" />
            )}
            <span>Generate Payslips for {activeTenant?.name}</span>
          </button>
        </div>
      )}

      {/* TAB 3: GENERATED PAYSLIPS */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">Issued Employee Payslips</span>
            <span className="text-slate-400">Click &quot;View &amp; Print&quot; to inspect official employee payslip</span>
          </div>

          {payslips.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No payslips generated yet. Go to &quot;Run Monthly Payroll&quot; tab to issue payslips.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Employee</th>
                    <th className="py-3.5 px-6">Pay Period</th>
                    <th className="py-3.5 px-6">Gross Earnings</th>
                    <th className="py-3.5 px-6">Total Deductions</th>
                    <th className="py-3.5 px-6">Net Payout</th>
                    <th className="py-3.5 px-6">Status</th>
                    <th className="py-3.5 px-6 text-right">Payslip Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payslips.map(ps => (
                    <tr key={ps.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 text-sm">{ps.employeeName}</span>
                          {ps.salaryType === 'PIECE_RATE' ? (
                            <span className="bg-amber-50 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[9px] border border-amber-200 inline-flex items-center gap-0.5">
                              <Scissors className="w-2.5 h-2.5 text-amber-600" />
                              <span>Piece-Rate</span>
                            </span>
                          ) : (
                            <span className="bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded text-[9px] border border-blue-200">
                              Fixed
                            </span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px] mt-0.5">
                          <span className="font-mono bg-slate-100 px-1 rounded">{ps.employeeCode}</span>
                          <span className="mx-1.5">•</span>
                          <span>{ps.department}</span>
                          {ps.pieceRateUnits ? (
                            <span className="ml-1.5 text-amber-800 font-mono font-bold">({ps.pieceRateUnits} units)</span>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-4 px-6 font-semibold text-slate-700">
                        {ps.payPeriod}
                      </td>

                      <td className="py-4 px-6 font-mono text-slate-700">
                        ₹{ps.grossEarnings.toLocaleString()}
                      </td>

                      <td className="py-4 px-6 font-mono text-red-600">
                        -₹{ps.totalDeductions.toLocaleString()}
                      </td>

                      <td className="py-4 px-6 font-mono font-black text-emerald-700 text-sm">
                        ₹{ps.netPayable.toLocaleString()}
                      </td>

                      <td className="py-4 px-6">
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                          {ps.status}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setViewPayslip(ps)}
                          className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 ml-auto bg-primary-50 px-3 py-1.5 rounded-lg border border-primary-100 hover:bg-primary-100 transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View & Print</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Official Payslip Document
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.print()}
                  className="bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition shadow"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document</span>
                </button>
                <button onClick={() => setViewPayslip(null)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Payslip Body */}
            <div id="printable-payslip" className="p-8 text-slate-800 space-y-6 text-xs bg-white">
              {/* Company Header */}
              <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                  {viewPayslip.companyName || activeTenant?.name}
                </h2>
                <p className="text-slate-500 text-xs">
                  Branch: {viewPayslip.branch || 'Head Office'} • Industry Vertical: {activeTenant?.industry}
                </p>
                <div className="inline-block bg-slate-100 text-slate-800 font-bold px-3 py-1 rounded text-xs mt-2 border border-slate-300">
                  PAYSLIP FOR THE MONTH OF {viewPayslip.payPeriod?.toUpperCase()}
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
