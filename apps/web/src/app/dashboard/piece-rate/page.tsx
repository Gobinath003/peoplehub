'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { 
  Scissors, Plus, Calendar, Check, X, 
  Trash2, Filter, Search, Layers, TrendingUp, 
  AlertCircle, Sparkles, Tag, Clock, CheckCircle2, 
  ChevronRight, ChevronLeft, Save, Download, Printer,
  UserCheck, FileText, Building2, ArrowRight, PlusCircle, 
  Edit3, DollarSign, Award, Users, Eye
} from 'lucide-react';
import { exportToExcel } from '../../../utils/excelExport';
import { 
  PieceRateActivityDto, 
  PieceRateLogDto, 
  EmployeeDto 
} from '@people-hub/shared-types';
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

interface SkillLineItem {
  activityId: string;
  quantity: number;
  unitRate: number;
  remarks: string;
}

interface EmployeeWorkRow {
  employee: EmployeeDto;
  logs: PieceRateLogDto[];
  totalUnits: number;
  totalWages: number;
  activitiesSummary: Array<{ name: string; unit: string; qty: number; rate: number; total: number }>;
  hasWork: boolean;
}

// Convert numbers to Indian Rupees in words for formal wage disbursement ledgers
function numberToWordsINR(num: number): string {
  if (!num || num === 0) return 'Zero Rupees Only';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n >= 10000000) {
      str += inWords(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    if (n >= 100000) {
      str += inWords(Math.floor(n / 100000)) + ' Lakh ';
      n %= 100000;
    }
    if (n >= 1000) {
      str += inWords(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    if (n >= 100) {
      str += inWords(Math.floor(n / 100)) + ' Hundred ';
      n %= 100;
    }
    if (n > 0) {
      if (str !== '') str += 'and ';
      if (n < 20) str += a[n] + ' ';
      else str += b[Math.floor(n / 10)] + ' ' + a[n % 10] + ' ';
    }
    return str.trim();
  };

  const words = inWords(Math.floor(num));
  return `${words} Rupees Only`.replace(/\s+/g, ' ');
}

export default function PieceRatePage() {
  const { activeTenant, accessToken, activeBranchScope } = useApp();
  
  // Tabs: 'sheet' (Daily Work Entry) | 'activities' (Operations & Rates/Unit) | 'history' (Production History)
  const [activeTab, setActiveTab] = useState<'sheet' | 'activities' | 'history'>('sheet');
  
  // Master data
  const [activities, setActivities] = useState<PieceRateActivityDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [logs, setLogs] = useState<PieceRateLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Period filter: Daily | Weekly | Monthly
  const [periodType, setPeriodType] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // Search and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const pageSize = 10;

  // Add/Edit Multi-Skills Modal
  const [skillsModalOpen, setSkillsModalOpen] = useState(false);
  const [selectedEmpForSkills, setSelectedEmpForSkills] = useState<EmployeeDto | null>(null);
  const [skillItems, setSkillItems] = useState<SkillLineItem[]>([]);
  const [savingSkills, setSavingSkills] = useState(false);

  // Single Row Bill / Slip Print Modal (Restaurant-style bill)
  const [slipModalOpen, setSlipModalOpen] = useState(false);
  const [slipEmp, setSlipEmp] = useState<EmployeeDto | null>(null);

  // Skills & Operations Breakdown Details Popup Modal
  const [detailsModalRow, setDetailsModalRow] = useState<EmployeeWorkRow | null>(null);

  // Common Daily Ledger Print Modal (Organization summary)
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);

  // Create Operation Modal
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('piece');
  const [newRate, setNewRate] = useState('20');
  const [newDesc, setNewDesc] = useState('');

  // Effective Tenant ID for Garments Piece-Rate operations
  const effectiveTenantId = activeTenant?.id === '23ee8399-e03c-4521-9e50-0332e1e1a9e7' || !activeTenant?.id
    ? '7837a312-ed38-4859-9748-9cbad20d1863'
    : activeTenant.id;

  // Fetch all data from API/DB
  const fetchData = async () => {
    if (!activeTenant || !accessToken) return;
    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'x-tenant-id': effectiveTenantId
      };

      const [actRes, empRes, logRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/piece-rate/activities`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/v1/employees`, { headers }).catch(() => null),
        fetch(`${API_BASE_URL}/api/v1/piece-rate/logs`, { headers }).catch(() => null)
      ]);

      if (actRes && actRes.ok) {
        const acts = await actRes.json();
        setActivities(Array.isArray(acts) ? acts : []);
      }
      if (empRes && empRes.ok) {
        const emps = await empRes.json();
        setEmployees(Array.isArray(emps) ? emps : []);
      }
      if (logRes && logRes.ok) {
        const lgs = await logRes.json();
        setLogs(Array.isArray(lgs) ? lgs : []);
      }
    } catch (e) {
      console.error('API fetch error in PieceRatePage:', e);
      setErrorMsg('Failed to load piece-rate operations from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTenant?.id, accessToken]);

  // Compute date range for weekly view
  const weekRange = useMemo(() => {
    const cur = new Date(selectedDate);
    const dayOfWeek = cur.getDay(); // 0 is Sunday, 1 is Monday
    const diffToMonday = cur.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(cur.setDate(diffToMonday));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      startStr: monday.toISOString().split('T')[0],
      endStr: sunday.toISOString().split('T')[0],
      display: `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    };
  }, [selectedDate]);

  // Filter logs according to active period filter (DAILY, WEEKLY, MONTHLY)
  const periodFilteredLogs = useMemo(() => {
    return logs.filter(l => {
      if (!l.logDate) return false;
      const logDay = l.logDate.split('T')[0];

      if (periodType === 'DAILY') {
        return logDay === selectedDate;
      } else if (periodType === 'WEEKLY') {
        return logDay >= weekRange.startStr && logDay <= weekRange.endStr;
      } else if (periodType === 'MONTHLY') {
        const d = new Date(l.logDate);
        return d.getMonth() + 1 === selectedMonth && d.getFullYear() === selectedYear;
      }
      return true;
    });
  }, [logs, periodType, selectedDate, weekRange, selectedMonth, selectedYear]);

  // Group work entries per employee for the active period
  const employeeWorkRows = useMemo(() => {
    return employees.map(emp => {
      const empLogs = periodFilteredLogs.filter(l => l.employeeId === emp.id);
      const totalUnits = empLogs.reduce((sum, l) => sum + (Number(l.quantity) || 0), 0);
      const totalWages = empLogs.reduce((sum, l) => sum + (Number(l.totalAmount) || 0), 0);
      
      // Group multiple logs by activity for summary display
      const activityMap = new Map<string, { name: string; unit: string; qty: number; rate: number; total: number }>();
      for (const log of empLogs) {
        const actName = log.activityName || 'Operation';
        const unit = log.unit || 'piece';
        const existing = activityMap.get(log.activityId) || { name: actName, unit, qty: 0, rate: log.unitRate, total: 0 };
        existing.qty += Number(log.quantity) || 0;
        existing.total += Number(log.totalAmount) || 0;
        activityMap.set(log.activityId, existing);
      }

      const activitiesSummary = Array.from(activityMap.values());

      return {
        employee: emp,
        logs: empLogs,
        totalUnits,
        totalWages,
        activitiesSummary,
        hasWork: totalUnits > 0
      };
    });
  }, [employees, periodFilteredLogs]);

  // Filter rows by employee search query
  const searchedRows = useMemo(() => {
    if (!searchQuery.trim()) return employeeWorkRows;
    const q = searchQuery.toLowerCase();
    return employeeWorkRows.filter(r => 
      r.employee.firstName.toLowerCase().includes(q) ||
      r.employee.lastName.toLowerCase().includes(q) ||
      r.employee.employeeCode.toLowerCase().includes(q) ||
      r.employee.department.toLowerCase().includes(q)
    );
  }, [employeeWorkRows, searchQuery]);

  // Summary Metrics for the active period
  const totalRosterCount = employees.length;
  const activeOperatorCount = employeeWorkRows.filter(r => r.hasWork).length;
  const inactiveOperatorCount = totalRosterCount - activeOperatorCount;
  const grandTotalUnits = employeeWorkRows.reduce((sum, r) => sum + r.totalUnits, 0);
  const grandTotalWages = employeeWorkRows.reduce((sum, r) => sum + r.totalWages, 0);

  // Tabs Definition
  const pieceRateTabs: EnterpriseTabItem<'sheet' | 'activities' | 'history'>[] = [
    { key: 'sheet', label: 'Daily Work Entry', icon: Layers },
    { key: 'activities', label: 'Operations & Rates/Unit', count: activities.length, icon: Tag },
    { key: 'history', label: 'Production History', count: logs.length, icon: Clock },
  ];

  // Open Multi-Skills Modal for an Employee
  const handleOpenSkillsModal = (emp: EmployeeDto) => {
    setSelectedEmpForSkills(emp);
    
    // Find this employee's logs for the selected date
    const dayLogs = logs.filter(l => l.employeeId === emp.id && l.logDate && l.logDate.startsWith(selectedDate));
    
    if (dayLogs.length > 0) {
      setSkillItems(dayLogs.map(l => ({
        activityId: l.activityId,
        quantity: l.quantity,
        unitRate: l.unitRate,
        remarks: l.remarks || ''
      })));
    } else {
      // Default initial row with first activity
      const defaultAct = activities[0];
      setSkillItems([
        {
          activityId: defaultAct?.id || '',
          quantity: 0,
          unitRate: defaultAct?.ratePerUnit || 20,
          remarks: ''
        }
      ]);
    }

    setSkillsModalOpen(true);
  };

  // Add another skill row inside modal
  const handleAddSkillLine = () => {
    const defaultAct = activities[0];
    setSkillItems([
      ...skillItems,
      {
        activityId: defaultAct?.id || '',
        quantity: 0,
        unitRate: defaultAct?.ratePerUnit || 20,
        remarks: ''
      }
    ]);
  };

  // Update a skill row inside modal
  const handleSkillItemChange = (index: number, field: keyof SkillLineItem, value: any) => {
    setSkillItems(prev => prev.map((item, i) => {
      if (i !== index) return item;
      if (field === 'activityId') {
        const act = activities.find(a => a.id === value);
        return {
          ...item,
          activityId: value,
          unitRate: act ? act.ratePerUnit : item.unitRate
        };
      }
      return {
        ...item,
        [field]: value
      };
    }));
  };

  // Remove a skill row inside modal
  const handleRemoveSkillLine = (index: number) => {
    setSkillItems(prev => prev.filter((_, i) => i !== index));
  };

  // Save Multi-Skills Work Entry for an Employee strictly to DB
  const handleSaveEmployeeSkills = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpForSkills || !activeTenant || !accessToken) return;

    setSavingSkills(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Filter items with valid quantity > 0
    const validItems = skillItems.filter(item => Number(item.quantity) > 0 && item.activityId);

    const payload = {
      employeeId: selectedEmpForSkills.id,
      logDate: selectedDate,
      items: validItems.map(item => ({
        activityId: item.activityId,
        quantity: Number(item.quantity),
        unitRate: Number(item.unitRate),
        remarks: item.remarks.trim() || undefined
      }))
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/piece-rate/employee-day-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': effectiveTenantId
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const empName = `${selectedEmpForSkills.firstName} ${selectedEmpForSkills.lastName}`;
        const totalUnitsLogged = validItems.reduce((sum, it) => sum + Number(it.quantity), 0);
        const totalWagesLogged = validItems.reduce((sum, it) => sum + (Number(it.quantity) * Number(it.unitRate)), 0);

        setSuccessMsg(
          validItems.length > 0
            ? `Updated ${validItems.length} skills for ${empName} (${totalUnitsLogged} units, ₹${totalWagesLogged.toLocaleString()}) on ${selectedDate}!`
            : `Cleared work entries for ${empName} on ${selectedDate}.`
        );
        setTimeout(() => setSuccessMsg(null), 4000);
        setSkillsModalOpen(false);
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || 'Failed to save employee skills to database.');
      }
    } catch (err) {
      console.error('Error saving employee skills to DB:', err);
      setErrorMsg('Could not save work entries. Please verify database connection.');
    } finally {
      setSavingSkills(false);
    }
  };

  // Open Restaurant-style Receipt Slip Modal
  const handleOpenSlip = (emp: EmployeeDto) => {
    setSlipEmp(emp);
    setSlipModalOpen(true);
  };

  // Trigger Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Create New Operation Catalog Item
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !accessToken) return;
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      unit: newUnit.trim().toLowerCase(),
      ratePerUnit: Number(newRate),
      description: newDesc.trim() || undefined
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/piece-rate/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': effectiveTenantId
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg(`Operation "${payload.name}" created at ₹${payload.ratePerUnit}/${payload.unit}!`);
        setTimeout(() => setSuccessMsg(null), 3500);
        setActivityModalOpen(false);
        setNewCode('');
        setNewName('');
        setNewRate('20');
        setNewDesc('');
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || 'Failed to create operation.');
      }
    } catch (err) {
      console.error('Error creating activity:', err);
      setErrorMsg('Could not create operation in database.');
    } finally {
      setSaving(false);
    }
  };

  // Excel Export Handler
  const handleExportExcel = () => {
    const dateStr = new Date().toISOString().split('T')[0];
    const tenantSlug = activeTenant?.slug || 'export';

    if (activeTab === 'activities') {
      if (activities.length === 0) return;
      exportToExcel({
        filename: `Operations_Rates_${tenantSlug}_${dateStr}`,
        sheetName: 'Operations Catalog',
        columns: [
          { header: 'Operation Code', accessor: 'code' },
          { header: 'Operation Name', accessor: 'name' },
          { header: 'Billing Unit', accessor: 'unit' },
          { header: 'Rate Per Unit (₹)', accessor: 'ratePerUnit' },
          { header: 'Status', accessor: (r) => r.isActive ? 'Active' : 'Inactive' },
          { header: 'Description', accessor: (r) => r.description || '-' },
        ],
        data: activities,
      });
    } else if (activeTab === 'history') {
      if (logs.length === 0) return;
      exportToExcel({
        filename: `Production_Logs_History_${tenantSlug}_${dateStr}`,
        sheetName: 'Production History',
        columns: [
          { header: 'Date', accessor: (r) => r.logDate ? r.logDate.split('T')[0] : '-' },
          { header: 'Employee Code', accessor: 'employeeCode' },
          { header: 'Employee Name', accessor: 'employeeName' },
          { header: 'Operation / Skill', accessor: 'activityName' },
          { header: 'Quantity Produced', accessor: 'quantity' },
          { header: 'Unit Rate (₹)', accessor: 'unitRate' },
          { header: 'Total Wage (₹)', accessor: 'totalAmount' },
          { header: 'Remarks', accessor: (r) => r.remarks || '-' },
        ],
        data: logs,
      });
    } else {
      // Export current work entry sheet
      if (searchedRows.length === 0) return;
      exportToExcel({
        filename: `Work_Entry_${periodType}_${selectedDate}_${tenantSlug}`,
        sheetName: 'Daily Work Ledger',
        columns: [
          { header: 'Employee Code', accessor: (r) => r.employee.employeeCode },
          { header: 'Employee Name', accessor: (r) => `${r.employee.firstName} ${r.employee.lastName}` },
          { header: 'Department', accessor: (r) => r.employee.department },
          { header: 'Operations Breakdown', accessor: (r) => r.activitiesSummary.map(a => `${a.name}: ${a.qty} ${a.unit} @ ₹${a.rate} (₹${a.total})`).join(' | ') || 'None' },
          { header: 'Total Pieces Produced', accessor: 'totalUnits' },
          { header: 'Total Wages (₹)', accessor: 'totalWages' },
          { header: 'Status', accessor: (r) => r.hasWork ? 'Present / Active' : 'No Output' },
        ],
        data: searchedRows,
      });
    }
  };

  return (
    <div className="space-y-2 pb-6">
      {/* Enterprise Toolbar */}
      <EnterpriseToolbar
        title="Attendance & Daily Work Ledger"
        tenantName={activeTenant?.name}
        primaryActionLabel={activeTab === 'sheet' ? 'Record Floor Work' : undefined}
        onPrimaryAction={activeTab === 'sheet' ? () => {
          if (searchedRows.length > 0) {
            handleOpenSkillsModal(searchedRows[0].employee);
          } else if (employees.length > 0) {
            handleOpenSkillsModal(employees[0]);
          }
        } : undefined}
        filters={
          <div className="flex items-center gap-2">
            {activeTab === 'sheet' && (
              <button
                type="button"
                onClick={() => setLedgerModalOpen(true)}
                title="Print Entire Day Summary as Ledger"
                className="px-3 py-1.5 border border-slate-300 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 text-xs font-semibold shadow-xs"
              >
                <Printer className="w-3.5 h-3.5 text-emerald-400" />
                <span>Print Daily Ledger</span>
              </button>
            )}

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
      />

      {/* Enterprise Tabs */}
      <EnterpriseTabs
        tabs={pieceRateTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Notifications */}
      {successMsg && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: DAILY WORK ENTRY (Attendance & Multi-Skill Output) */}
      {/* ======================================================== */}
      {activeTab === 'sheet' && (
        <div className="space-y-2">
          {/* Unified Compact Controls & KPI Summary Bar */}
          <div className="bg-white p-2.5 px-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
            {/* Row 1: Period Toggle + Date Selector + Search Input */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                {/* Period Type Segmented Toggle */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setPeriodType('DAILY')}
                    className={`px-2.5 py-1 rounded-md transition ${periodType === 'DAILY' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Daily
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('WEEKLY')}
                    className={`px-2.5 py-1 rounded-md transition ${periodType === 'WEEKLY' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Weekly
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('MONTHLY')}
                    className={`px-2.5 py-1 rounded-md transition ${periodType === 'MONTHLY' ? 'bg-white text-slate-900 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    Monthly
                  </button>
                </div>

                {/* Date Controls */}
                {periodType === 'DAILY' && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-semibold text-slate-600">Date:</span>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                )}

                {periodType === 'WEEKLY' && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-slate-500 font-medium">Week:</span>
                    <strong className="text-slate-900">{weekRange.display}</strong>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="bg-transparent text-xs text-slate-400 font-mono focus:outline-none ml-1"
                    />
                  </div>
                )}

                {periodType === 'MONTHLY' && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-xs">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(Number(e.target.value))}
                      className="bg-transparent font-bold text-slate-900 focus:outline-none text-xs"
                    >
                      {[
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                      ].map((m, idx) => (
                        <option key={m} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="bg-transparent font-bold text-slate-900 focus:outline-none text-xs"
                    >
                      {[2024, 2025, 2026, 2027].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Search Input */}
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search operator, code, dept..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 rounded-lg border border-slate-200 text-xs focus:ring-1 focus:ring-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Row 2: Sleek Single-Line KPI Metrics Strip */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-y-1.5 gap-x-3 text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Roster:</span>
                  <span className="font-mono font-black text-slate-800">{totalRosterCount}</span>
                  <span className="text-[10px] text-slate-400">Operators</span>
                </div>

                <div className="h-3 w-px bg-slate-200 hidden sm:block"></div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-emerald-700">Present / Active:</span>
                  <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">{activeOperatorCount}</span>
                  <span className="text-[10px] text-emerald-600">With Output</span>
                </div>

                <div className="h-3 w-px bg-slate-200 hidden sm:block"></div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400">No Output:</span>
                  <span className="font-mono font-bold text-slate-600">{inactiveOperatorCount}</span>
                </div>

                <div className="h-3 w-px bg-slate-200 hidden sm:block"></div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold text-indigo-700">Total Pieces:</span>
                  <span className="font-mono font-black text-indigo-900 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">{grandTotalUnits.toLocaleString()} pcs</span>
                </div>
              </div>

              {/* Floor Wages Total Pill */}
              <div className="flex items-center gap-1.5 bg-emerald-50/80 border border-emerald-200 px-2.5 py-0.5 rounded-lg ml-auto">
                <span className="text-[10px] uppercase font-bold text-emerald-700">Floor Wages:</span>
                <span className="font-mono font-black text-emerald-800 text-xs">₹{grandTotalWages.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Unified Daily Work Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            {loading ? (
              <div className="p-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : searchedRows.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No operators found. Register employees from the Workforce & Employees menu.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-2.5 px-3 text-center w-10">#</th>
                      <th className="py-2.5 px-3">Operator</th>
                      <th className="py-2.5 px-3">Skills & Operations Summary</th>
                      <th className="py-2.5 px-3 text-center w-28">Pieces Produced</th>
                      <th className="py-2.5 px-3 text-right w-32">Total Wages (₹)</th>
                      <th className="py-2.5 px-3 text-right w-40">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {searchedRows.map((row, index) => {
                      const emp = row.employee;
                      const hasWork = row.hasWork;

                      return (
                        <tr 
                          key={emp.id} 
                          className="hover:bg-slate-50/70 transition"
                        >
                          {/* Row Number */}
                          <td className="py-2 px-3 text-center font-bold text-slate-400">
                            {index + 1}
                          </td>

                          {/* Operator Details */}
                          <td className="py-2 px-3">
                            <div className="font-extrabold text-slate-900 leading-snug">
                              {emp.firstName} {emp.lastName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {emp.employeeCode} • {emp.department}
                            </div>
                          </td>

                          {/* Summary of Skills / Operations */}
                          <td className="py-2 px-3">
                            {row.activitiesSummary.length > 0 ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setDetailsModalRow(row)}
                                  className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50/80 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-950 text-xs font-semibold transition group shadow-2xs text-left"
                                  title="Click to view full skills & operations breakdown popup"
                                >
                                  <span className="inline-flex items-center justify-center px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[10px] font-black shrink-0 shadow-2xs">
                                    {row.activitiesSummary.length} {row.activitiesSummary.length === 1 ? 'Skill' : 'Skills'}
                                  </span>
                                  <span className="text-slate-600 group-hover:text-indigo-900 text-[11px] font-medium truncate max-w-[180px] sm:max-w-[240px]">
                                    {row.activitiesSummary.map(a => `${a.name} (${a.qty})`).join(', ')}
                                  </span>
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 group-hover:underline ml-1 shrink-0">
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Details</span>
                                  </span>
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">
                                No work operations recorded
                              </span>
                            )}
                          </td>

                          {/* Total Units Produced */}
                          <td className="py-2 px-3 text-center">
                            <span className={`font-mono text-xs font-black ${hasWork ? 'text-slate-900' : 'text-slate-300'}`}>
                              {row.totalUnits.toLocaleString()} pcs
                            </span>
                          </td>

                          {/* Total Accrued Wages */}
                          <td className="py-2 px-3 text-right">
                            <span className={`font-mono text-sm font-black ${hasWork ? 'text-emerald-700' : 'text-slate-300'}`}>
                              ₹{row.totalWages.toLocaleString()}
                            </span>
                          </td>

                          {/* Actions: Add/Edit Skills + Restaurant Bill Print Slip */}
                          <td className="py-2 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Open Skills Modal with prominent + Add Work button */}
                              <button
                                type="button"
                                onClick={() => handleOpenSkillsModal(emp)}
                                title="Add or update operations/skills for this operator"
                                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 shadow-2xs ${
                                  hasWork
                                    ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold'
                                }`}
                              >
                                <Plus className={`w-3 h-3 ${hasWork ? 'text-indigo-600' : 'text-emerald-700'}`} />
                                <span>{hasWork ? 'Edit Work' : 'Add Work'}</span>
                              </button>

                              {/* Single Row Print Slip (Restaurant Bill Style) */}
                              <button
                                type="button"
                                onClick={() => handleOpenSlip(emp)}
                                title="Print itemized wage slip (restaurant bill style)"
                                className={`p-1 rounded-lg border transition ${
                                  hasWork 
                                    ? 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs' 
                                    : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                                }`}
                                disabled={!hasWork}
                              >
                                <Printer className="w-3.5 h-3.5 text-slate-600" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: OPERATIONS & RATES/UNIT CATALOG                   */}
      {/* ======================================================== */}
      {activeTab === 'activities' && (
        <div className="space-y-2.5">
          <EnterpriseToolbar
            title="Operations & Rates/Unit Catalog"
            totalCount={activities.length}
            primaryActionLabel="Add Operation"
            onPrimaryAction={() => setActivityModalOpen(true)}
          />

          <EnterpriseTable
            loading={loading}
            isEmpty={activities.length === 0}
            emptyMessage="No garment piece-rate operations configured yet."
          >
            <table className="w-full text-left border-collapse text-xs">
              <EnterpriseTableHeader>
                <EnterpriseTableTh>Code</EnterpriseTableTh>
                <EnterpriseTableTh>Operation / Skill Name</EnterpriseTableTh>
                <EnterpriseTableTh>Description</EnterpriseTableTh>
                <EnterpriseTableTh>Billing Unit</EnterpriseTableTh>
                <EnterpriseTableTh align="right">Rate per Unit</EnterpriseTableTh>
                <EnterpriseTableTh align="center">Status</EnterpriseTableTh>
              </EnterpriseTableHeader>
              <EnterpriseTableBody>
                {activities.map(act => (
                  <EnterpriseTableRow key={act.id}>
                    <EnterpriseTableTd className="font-semibold text-slate-900 font-mono">{act.code}</EnterpriseTableTd>
                    <EnterpriseTableTd className="font-medium text-slate-900">{act.name}</EnterpriseTableTd>
                    <EnterpriseTableTd className="text-slate-500 text-xs">{act.description || '—'}</EnterpriseTableTd>
                    <EnterpriseTableTd>
                      <span className="font-medium text-slate-600 text-xs capitalize">
                        {act.unit}
                      </span>
                    </EnterpriseTableTd>
                    <EnterpriseTableTd align="right" className="font-semibold text-slate-900 text-xs font-mono">
                      ₹{act.ratePerUnit} <span className="text-[10px] text-slate-400 font-normal">/ {act.unit}</span>
                    </EnterpriseTableTd>
                    <EnterpriseTableTd align="center">
                      <EnterpriseBadge variant="success">Active</EnterpriseBadge>
                    </EnterpriseTableTd>
                  </EnterpriseTableRow>
                ))}
              </EnterpriseTableBody>
            </table>
          </EnterpriseTable>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PRODUCTION LOGS HISTORY                          */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <EnterpriseTable
          loading={loading}
          isEmpty={logs.length === 0}
          emptyMessage="No historical production logs recorded yet."
          footer={
            logs.length > pageSize && (
              <EnterprisePagination
                currentPage={historyPage}
                totalItems={logs.length}
                pageSize={pageSize}
                onPageChange={setHistoryPage}
                itemLabel="records"
              />
            )
          }
        >
          <table className="w-full text-left border-collapse text-xs">
            <EnterpriseTableHeader>
              <EnterpriseTableTh>Operator</EnterpriseTableTh>
              <EnterpriseTableTh>Operation / Skill</EnterpriseTableTh>
              <EnterpriseTableTh>Log Date</EnterpriseTableTh>
              <EnterpriseTableTh align="right">Units Produced</EnterpriseTableTh>
              <EnterpriseTableTh align="right">Accrued Wage</EnterpriseTableTh>
              <EnterpriseTableTh>Remarks</EnterpriseTableTh>
            </EnterpriseTableHeader>
            <EnterpriseTableBody>
              {logs.slice((historyPage - 1) * pageSize, historyPage * pageSize).map(log => (
                <EnterpriseTableRow key={log.id}>
                  <EnterpriseTableTd>
                    <div className="font-semibold text-slate-900 text-xs">{log.employeeName}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{log.employeeCode}</div>
                  </EnterpriseTableTd>
                  <EnterpriseTableTd className="font-medium text-slate-800">{log.activityName}</EnterpriseTableTd>
                  <EnterpriseTableTd className="text-slate-500 font-mono">{log.logDate ? log.logDate.split('T')[0] : '-'}</EnterpriseTableTd>
                  <EnterpriseTableTd align="right" className="font-semibold text-slate-900 font-mono">{log.quantity} {log.unit || 'pcs'}</EnterpriseTableTd>
                  <EnterpriseTableTd align="right" className="font-bold text-emerald-700 font-mono">₹{log.totalAmount.toLocaleString()}</EnterpriseTableTd>
                  <EnterpriseTableTd className="text-slate-400">{log.remarks || '—'}</EnterpriseTableTd>
                </EnterpriseTableRow>
              ))}
            </EnterpriseTableBody>
          </table>
        </EnterpriseTable>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: MULTI-SKILLS WORK ENTRY MODAL                   */}
      {/* ======================================================== */}
      {skillsModalOpen && selectedEmpForSkills && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-black text-slate-900 text-sm">
                  Record Skills & Work Output: {selectedEmpForSkills.firstName} {selectedEmpForSkills.lastName}
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Operator Code: <strong className="text-slate-700">{selectedEmpForSkills.employeeCode}</strong> • Dept: {selectedEmpForSkills.department} • Date: <strong className="text-slate-800">{selectedDate}</strong>
                </p>
              </div>
              <button 
                onClick={() => setSkillsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveEmployeeSkills} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700 text-xs">Work Operations & Skills Logged</span>
                  <button
                    type="button"
                    onClick={handleAddSkillLine}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Another Skill</span>
                  </button>
                </div>

                {skillItems.map((item, idx) => {
                  const lineTotal = Number(item.quantity || 0) * Number(item.unitRate || 0);

                  return (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
                      <div className="grid grid-cols-12 gap-2.5 items-end">
                        {/* Operation Selector */}
                        <div className="col-span-5">
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                            Skill / Operation *
                          </label>
                          <select
                            value={item.activityId}
                            onChange={(e) => handleSkillItemChange(idx, 'activityId', e.target.value)}
                            required
                            className="w-full border border-slate-300 rounded-lg p-2 bg-white text-xs font-semibold focus:outline-none"
                          >
                            <option value="">Select Operation</option>
                            {activities.map(a => (
                              <option key={a.id} value={a.id}>
                                {a.name} (₹{a.ratePerUnit}/{a.unit})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Rate / Unit (Editable) */}
                        <div className="col-span-2">
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                            Rate (₹)
                          </label>
                          <input
                            type="number"
                            step="0.5"
                            value={item.unitRate}
                            onChange={(e) => handleSkillItemChange(idx, 'unitRate', Number(e.target.value))}
                            className="w-full border border-slate-300 rounded-lg p-2 bg-white text-xs font-mono font-bold focus:outline-none"
                          />
                        </div>

                        {/* Quantity Produced */}
                        <div className="col-span-2">
                          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                            Pieces *
                          </label>
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={item.quantity === 0 ? '' : item.quantity}
                            onChange={(e) => handleSkillItemChange(idx, 'quantity', e.target.value)}
                            className="w-full border border-slate-300 rounded-lg p-2 bg-white text-xs font-mono font-bold focus:outline-none"
                          />
                        </div>

                        {/* Calculated Amount */}
                        <div className="col-span-2 text-right">
                          <span className="block text-[10px] uppercase font-bold text-slate-400 mb-1">
                            Total
                          </span>
                          <span className="text-sm font-black text-emerald-700 font-mono block pt-1">
                            ₹{lineTotal.toLocaleString()}
                          </span>
                        </div>

                        {/* Delete line */}
                        <div className="col-span-1 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveSkillLine(idx)}
                            disabled={skillItems.length === 1}
                            className="p-2 text-slate-400 hover:text-rose-600 disabled:opacity-30 transition"
                            title="Remove this line"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Line Remarks */}
                      <div>
                        <input
                          type="text"
                          placeholder="Optional remarks (e.g. Line 1, Batch #12, Morning shift)..."
                          value={item.remarks}
                          onChange={(e) => handleSkillItemChange(idx, 'remarks', e.target.value)}
                          className="w-full border border-slate-200 rounded-lg py-1 px-2.5 text-[11px] bg-white text-slate-700 focus:outline-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Summary Footer Box */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-950">
                <div className="flex items-center gap-3">
                  <span>Total Output: <strong className="text-emerald-800 font-black font-mono">{skillItems.reduce((s, it) => s + (Number(it.quantity) || 0), 0)} pieces</strong></span>
                  <span>•</span>
                  <span>Skills: <strong>{skillItems.filter(it => Number(it.quantity) > 0).length} active</strong></span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-700 font-semibold mr-1">Grand Total Wages:</span>
                  <span className="text-base font-black text-emerald-800 font-mono">
                    ₹{skillItems.reduce((s, it) => s + ((Number(it.quantity) || 0) * (Number(it.unitRate) || 0)), 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSkillsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSkills}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{savingSkills ? 'Saving...' : 'Save Work Activities'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1B: SKILLS & OPERATIONS DETAILS POPUP MODAL        */}
      {/* ======================================================== */}
      {detailsModalRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">
                    Skills & Operations Breakdown
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                    {detailsModalRow.employee.firstName} {detailsModalRow.employee.lastName} • <span className="font-mono font-bold text-slate-700">{detailsModalRow.employee.employeeCode}</span> • {detailsModalRow.employee.department}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailsModalRow(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Period Context Badge Strip */}
              <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 rounded-xl border border-slate-200 text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span className="font-semibold text-slate-700">Period:</span>
                  <span className="font-bold text-slate-900">
                    {periodType === 'DAILY' ? selectedDate : periodType === 'WEEKLY' ? weekRange.display : `Month ${selectedMonth}/${selectedYear}`}
                  </span>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-md border border-indigo-100">
                  {detailsModalRow.activitiesSummary.length} {detailsModalRow.activitiesSummary.length === 1 ? 'Operation Logged' : 'Operations Logged'}
                </span>
              </div>

              {/* Itemized Operations Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="py-2.5 px-3 text-center w-8">#</th>
                      <th className="py-2.5 px-3">Operation / Skill</th>
                      <th className="py-2.5 px-3 text-center">Unit</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate</th>
                      <th className="py-2.5 px-3 text-center">Pieces</th>
                      <th className="py-2.5 px-3 text-right">Total Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailsModalRow.activitiesSummary.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-3 text-center text-slate-500 capitalize font-mono text-[11px]">{item.unit}</td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">₹{item.rate}</td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-900">{item.qty} {item.unit}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">₹{item.total.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
                      <td colSpan={4} className="py-2.5 px-3 text-right uppercase text-[10px] text-slate-500 tracking-wider">Total Output & Wages:</td>
                      <td className="py-2.5 px-3 text-center font-mono font-black text-slate-900">{detailsModalRow.totalUnits} pcs</td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700 text-sm">₹{detailsModalRow.totalWages.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Remarks Breakdown if any */}
              {detailsModalRow.logs.some(l => l.remarks) && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-600 block">Operation Remarks:</span>
                  <div className="space-y-1">
                    {detailsModalRow.logs.filter(l => l.remarks).map((log, i) => (
                      <div key={i} className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200">
                        <strong className="text-slate-800">{log.activityName}:</strong> {log.remarks}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const emp = detailsModalRow.employee;
                    setDetailsModalRow(null);
                    handleOpenSkillsModal(emp);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
                >
                  <Edit3 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Edit Work</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const emp = detailsModalRow.employee;
                    setDetailsModalRow(null);
                    handleOpenSlip(emp);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition shadow-2xs"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print Slip</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setDetailsModalRow(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: RESTAURANT-STYLE BILL / ITEMIZED WORK RECEIPT   */}
      {/* ======================================================== */}
      {slipModalOpen && slipEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden flex flex-col">
            {/* Action Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50 print:hidden">
              <span className="text-xs font-bold text-slate-700">Piece-Rate Operator Slip</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                >
                  <Printer className="w-3 h-3 text-emerald-400" />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSlipModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Receipt (Restaurant Bill Design) */}
            <div id="printable-receipt" className="p-6 bg-white text-slate-900 font-mono text-xs space-y-4">
              {/* Header with Official Company Details */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                <div className="font-black text-base tracking-tight uppercase">{activeTenant?.name || 'Company Name'}</div>
                {activeTenant?.address && (
                  <div className="text-[10px] text-slate-600 font-sans font-medium">{activeTenant.address}</div>
                )}
                <div className="text-[9px] text-slate-500 font-sans">
                  {activeTenant?.phone && <span>Ph: {activeTenant.phone} </span>}
                  {activeTenant?.email && <span>• {activeTenant.email} </span>}
                  {activeTenant?.taxId && <span>• GSTIN: {activeTenant.taxId}</span>}
                </div>
                <div className="text-[10px] text-slate-600 font-sans font-bold">
                  {activeBranchScope ? `Operating Branch: ${activeBranchScope}` : 'Garment Line Production Facility'}
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-900 pt-1 border-t border-dotted border-slate-300 mt-1">
                  *** PIECE-RATE WORK WAGE VOUCHER ***
                </div>
              </div>

              {/* Meta Details */}
              <div className="text-[11px] space-y-1 pb-2 border-b border-dashed border-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt #:</span>
                  <span className="font-bold">RCPT-{selectedDate.replace(/-/g, '')}-{slipEmp.employeeCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="font-bold">{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Operator:</span>
                  <span className="font-bold">{slipEmp.firstName} {slipEmp.lastName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Code / Dept:</span>
                  <span>{slipEmp.employeeCode} ({slipEmp.department})</span>
                </div>
              </div>

              {/* Itemized Skills Table (Like a Restaurant Bill) */}
              <div className="space-y-1.5 pb-3 border-b border-dashed border-slate-300">
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 pb-1">
                  <span>Item / Skill</span>
                  <span className="text-right">Rate x Qty = Total</span>
                </div>

                {periodFilteredLogs
                  .filter(l => l.employeeId === slipEmp.id)
                  .map((item, idx) => (
                    <div key={idx} className="flex justify-between items-baseline text-[11px]">
                      <div>
                        <div className="font-bold text-slate-800">{item.activityName}</div>
                        {item.remarks && (
                          <div className="text-[9px] text-slate-400 italic">{item.remarks}</div>
                        )}
                      </div>
                      <div className="text-right font-mono">
                        <span className="text-slate-500">₹{item.unitRate} x {item.quantity} = </span>
                        <span className="font-black text-slate-900">₹{item.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Grand Total */}
              {(() => {
                const empLogs = periodFilteredLogs.filter(l => l.employeeId === slipEmp.id);
                const totalUnits = empLogs.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
                const totalAmt = empLogs.reduce((s, l) => s + (Number(l.totalAmount) || 0), 0);

                return (
                  <div className="space-y-1.5 pb-3 border-b border-dashed border-slate-300">
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>Total Units Produced:</span>
                      <span>{totalUnits} pcs</span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-1">
                      <span>NET EARNINGS:</span>
                      <span className="text-emerald-700 font-mono">₹{totalAmt.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Signatures */}
              <div className="pt-4 grid grid-cols-2 gap-4 text-center text-[10px] text-slate-500">
                <div className="border-t border-slate-300 pt-1">
                  <span>Operator Sign</span>
                </div>
                <div className="border-t border-slate-300 pt-1">
                  <span>Supervisor Sign</span>
                </div>
              </div>

              <div className="text-center text-[9px] text-slate-400 pt-2 font-sans">
                Generated via PeopleHub HRMS • {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: FULL DAY PRODUCTION SUMMARY LEDGER PRINT MODAL  */}
      {/* ======================================================== */}
      {ledgerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[96vh]">
            {/* Modal Controls */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 bg-slate-50 print:hidden">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Organization Daily Production & Wage Ledger</h3>
                <p className="text-[11px] text-slate-500">Official statutory wage disbursement register for {periodType === 'DAILY' ? selectedDate : periodType === 'WEEKLY' ? weekRange.display : `Month ${selectedMonth}/${selectedYear}`}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Print Master Ledger</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLedgerModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Master Ledger View */}
            <div id="printable-ledger" className="p-6 md:p-8 bg-white text-slate-900 space-y-4 overflow-y-auto">
              {/* Formal Ledger Document Header */}
              <div className="border-b-2 border-slate-900 pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5 flex-1">
                    <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                      {activeTenant?.name || 'Company Name'}
                    </h1>
                    {activeTenant?.address && (
                      <p className="text-[11px] text-slate-700 font-medium max-w-xl leading-snug">
                        {activeTenant.address}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 text-[10px] text-slate-600 font-medium pt-0.5">
                      {activeTenant?.taxId && <span><strong>GSTIN:</strong> {activeTenant.taxId}</span>}
                      {activeTenant?.registrationNo && <span><strong>CIN:</strong> {activeTenant.registrationNo}</span>}
                      {activeTenant?.phone && <span><strong>Ph:</strong> {activeTenant.phone}</span>}
                      {activeTenant?.email && <span><strong>Email:</strong> {activeTenant.email}</span>}
                      <span><strong>Branch:</strong> {activeBranchScope || 'Garment Production Facility'}</span>
                    </div>
                  </div>

                  {/* Metadata Block Right */}
                  <div className="text-right text-xs border border-slate-400 rounded-md p-2 bg-slate-50/80 min-w-[210px] shrink-0 font-sans">
                    <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Register Reference</div>
                    <div className="font-mono font-black text-slate-900 text-xs mt-0.5">
                      PRL-{selectedDate.replace(/-/g, '')}
                    </div>
                    <div className="mt-1 pt-1 border-t border-slate-300 text-[10px] text-slate-700 space-y-0.5 text-left">
                      <div><strong>Date / Period:</strong> {periodType === 'DAILY' ? selectedDate : periodType === 'WEEKLY' ? weekRange.display : `Month ${selectedMonth}/${selectedYear}`}</div>
                      <div><strong>Generated:</strong> {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                </div>

                {/* Formal Title Banner */}
                <div className="mt-3 py-1.5 px-3 bg-slate-900 text-white text-center rounded-sm font-black text-xs uppercase tracking-wider flex items-center justify-between">
                  <span>DAILY PRODUCTION & PIECE-RATE WAGE DISBURSEMENT REGISTER</span>
                  <span className="text-[10px] font-normal tracking-normal text-slate-300">Form No. 25 (Piece-Rate Register)</span>
                </div>
              </div>

              {/* Compact Key Metrics Strip (Clean Accounting Grid) */}
              <div className="grid grid-cols-4 border border-slate-400 bg-slate-50 divide-x divide-slate-400 text-center text-xs">
                <div className="py-2 px-3">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Total Operators</span>
                  <span className="font-black text-slate-900 text-sm font-mono">{totalRosterCount}</span>
                </div>
                <div className="py-2 px-3">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Present & Active</span>
                  <span className="font-black text-slate-900 text-sm font-mono">{activeOperatorCount}</span>
                </div>
                <div className="py-2 px-3">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Total Pieces Produced</span>
                  <span className="font-black text-slate-900 text-sm font-mono">{grandTotalUnits.toLocaleString()} pcs</span>
                </div>
                <div className="py-2 px-3 bg-slate-100/80">
                  <span className="text-[9px] uppercase font-bold text-slate-700 tracking-wider block">Total Wages Accrued</span>
                  <span className="font-black text-slate-900 text-sm font-mono">₹{grandTotalWages.toLocaleString()}</span>
                </div>
              </div>

              {/* Master Ledger Grid Table */}
              <div className="border border-slate-400 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] font-black text-slate-900 uppercase border-b-2 border-slate-900 divide-x divide-slate-300">
                      <th className="py-2 px-2 text-center w-8">#</th>
                      <th className="py-2 px-3 w-20">Emp ID</th>
                      <th className="py-2 px-3 w-40">Operator Name</th>
                      <th className="py-2 px-3 w-32">Department</th>
                      <th className="py-2 px-3">Itemized Operations, Rates & Quantity</th>
                      <th className="py-2 px-3 text-right w-24">Total Units</th>
                      <th className="py-2 px-3 text-right w-28">Wage (₹)</th>
                      <th className="py-2 px-3 text-center w-28">Signature / Thumb</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-300">
                    {employeeWorkRows.filter(r => r.hasWork).length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-6 text-center text-slate-400 italic">
                          No production output recorded for this period.
                        </td>
                      </tr>
                    ) : (
                      employeeWorkRows
                        .filter(r => r.hasWork)
                        .map((row, idx) => (
                          <tr key={row.employee.id} className="text-xs divide-x divide-slate-300 align-top hover:bg-slate-50/50">
                            {/* Serial Number */}
                            <td className="py-2 px-2 text-center text-slate-500 font-bold">
                              {idx + 1}
                            </td>

                            {/* Employee Code */}
                            <td className="py-2 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                              {row.employee.employeeCode}
                            </td>

                            {/* Operator Name */}
                            <td className="py-2 px-3 font-bold text-slate-900">
                              {row.employee.firstName} {row.employee.lastName}
                            </td>

                            {/* Department */}
                            <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                              {row.employee.department}
                            </td>

                            {/* Nested Operations Table (Structured, Non-Wrapping) */}
                            <td className="p-0">
                              <table className="w-full text-[11px] border-collapse">
                                <thead>
                                  <tr className="text-[9px] uppercase font-bold text-slate-400 border-b border-slate-200 bg-slate-50/60">
                                    <th className="text-left font-bold py-1 px-2">Operation / Skill</th>
                                    <th className="text-right font-bold py-1 px-2 w-24">Rate / Unit</th>
                                    <th className="text-right font-bold py-1 px-2 w-20">Quantity</th>
                                    <th className="text-right font-bold py-1 px-2 w-24">Subtotal</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                  {row.activitiesSummary.map((a, i) => (
                                    <tr key={i}>
                                      <td className="py-1 px-2 font-medium text-slate-800">
                                        {a.name}
                                      </td>
                                      <td className="py-1 px-2 text-right font-mono text-slate-600 whitespace-nowrap">
                                        ₹{a.rate}/{a.unit}
                                      </td>
                                      <td className="py-1 px-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                        {a.qty} {a.unit}
                                      </td>
                                      <td className="py-1 px-2 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                                        ₹{a.total.toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>

                            {/* Total Units */}
                            <td className="py-2 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                              {row.totalUnits.toLocaleString()} pcs
                            </td>

                            {/* Total Wage */}
                            <td className="py-2 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                              ₹{row.totalWages.toLocaleString()}
                            </td>

                            {/* Signature Line */}
                            <td className="py-2 px-3 text-center">
                              <div className="flex flex-col items-center justify-end h-10 pb-0.5">
                                <div className="w-20 border-b border-slate-400"></div>
                                <span className="text-[8px] uppercase tracking-wider text-slate-400 mt-1">Sign / Thumb</span>
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                  <tfoot>
                    {/* Grand Total Row */}
                    <tr className="border-t-2 border-slate-900 font-black text-xs bg-slate-100 divide-x divide-slate-300">
                      <td colSpan={5} className="py-2.5 px-3 text-right uppercase tracking-wider text-slate-800">
                        GRAND TOTAL (ALL ACTIVE OPERATORS):
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-slate-900 whitespace-nowrap">
                        {grandTotalUnits.toLocaleString()} pcs
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-slate-900 whitespace-nowrap">
                        ₹{grandTotalWages.toLocaleString()}
                      </td>
                      <td className="bg-slate-100"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Amount in Words Box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 bg-slate-50 border border-slate-300 rounded-sm text-xs gap-1">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 mr-2">Amount in Words:</span>
                  <strong className="font-mono text-slate-900 font-bold">{numberToWordsINR(grandTotalWages)}</strong>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Active Operators Logged: <strong className="text-slate-800">{employeeWorkRows.filter(r => r.hasWork).length}</strong>
                </div>
              </div>

              {/* Statutory Sign-off Block */}
              <div className="pt-6 grid grid-cols-3 gap-8 text-center text-xs">
                <div className="space-y-1">
                  <div className="h-9"></div>
                  <div className="border-t-2 border-slate-800 pt-1 font-bold text-slate-800">
                    Prepared by (Floor Supervisor)
                  </div>
                  <div className="text-[10px] text-slate-500">Signature & Date</div>
                </div>
                <div className="space-y-1">
                  <div className="h-9"></div>
                  <div className="border-t-2 border-slate-800 pt-1 font-bold text-slate-800">
                    Verified by (Quality In-Charge)
                  </div>
                  <div className="text-[10px] text-slate-500">Signature & Date</div>
                </div>
                <div className="space-y-1">
                  <div className="h-9"></div>
                  <div className="border-t-2 border-slate-800 pt-1 font-bold text-slate-800">
                    Approved by (Accounts / Factory Manager)
                  </div>
                  <div className="text-[10px] text-slate-500">Signature & Date</div>
                </div>
              </div>

              {/* Ledger Compliance Footer */}
              <div className="text-center text-[9px] text-slate-400 pt-2 border-t border-slate-200">
                Official Piece-Rate Output & Wage Disbursement Ledger • Generated via PeopleHub HRMS • Confidential & For Internal Audit
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: CREATE OPERATION CATALOG ITEM                   */}
      {/* ======================================================== */}
      {activityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm">Add Operation & Rate</h3>
              <button onClick={() => setActivityModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operation Code *</label>
                <input
                  type="text"
                  required
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  placeholder="e.g. COLLAR_STITCH"
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-mono uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operation / Skill Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Collar Attachment & Assembly"
                  className="w-full border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rate per Unit (₹) *</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit of Measure</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 bg-white capitalize"
                  >
                    <option value="piece">piece</option>
                    <option value="bundle">bundle</option>
                    <option value="meter">meter</option>
                    <option value="dozen">dozen</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Optional details or machine requirements..."
                  className="w-full border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActivityModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800"
                >
                  {saving ? 'Saving...' : 'Add Operation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: landscape;
            margin: 8mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body * {
            visibility: hidden;
          }
          #printable-receipt, #printable-receipt *,
          #printable-ledger, #printable-ledger * {
            visibility: visible;
          }
          #printable-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-width: 400px;
            background: white !important;
            color: black !important;
            padding: 16px;
          }
          #printable-ledger {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 0 !important;
          }
          #printable-ledger table {
            page-break-inside: auto;
          }
          #printable-ledger tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>
    </div>
  );
}
