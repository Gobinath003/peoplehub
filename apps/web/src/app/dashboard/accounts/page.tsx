'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { 
  Wallet, Plus, TrendingUp, TrendingDown, Users, 
  ArrowUpRight, ArrowDownRight, Search, Filter, 
  Download, Calendar, CheckCircle2, Clock, AlertCircle, 
  X, RefreshCw, Trash2, Edit2, Receipt, Building2, 
  CreditCard, Banknote, DollarSign, ArrowRight
} from 'lucide-react';
import { 
  AccountTransactionDto, 
  AccountsSummaryDto, 
  AccountTransactionType, 
  PaymentMode, 
  AdvanceRecoveryStatus,
  EmployeeDto
} from '@people-hub/shared-types';
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

const INCOME_CATEGORIES = [
  'Client Project Billing',
  'Services & Consulting',
  'Product / Garment Sales',
  'Export Shipment Settlement',
  'Scrap & Material Sales',
  'Miscellaneous Income'
];

const EXPENSE_CATEGORIES = [
  'Facility Rent & Utilities',
  'Electricity & Generator Fuel',
  'Pantry & Daily Refreshments',
  'Factory Consumables & Tools',
  'Logistics & Courier Delivery',
  'Office Supplies & Stationery',
  'Repairs & Machine Maintenance',
  'Software & IT Subscriptions',
  'Staff Travel & Conveyance',
  'Miscellaneous Expense'
];

export default function AccountsPage() {
  const { activeTenant, accessToken } = useApp();

  // Active Tab: 'all' | 'incomes' | 'expenses'
  const [activeTab, setActiveTab] = useState<'all' | 'incomes' | 'expenses'>('all');

  // Data states
  const [transactions, setTransactions] = useState<AccountTransactionDto[]>([]);
  const [summary, setSummary] = useState<AccountsSummaryDto>({
    totalIncome: 0,
    totalExpense: 0,
    totalAdvance: 0,
    totalAdvanceOutstanding: 0,
    netCashflow: 0,
    transactionCount: 0
  });
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Date Range Filters & Search
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // New Transaction Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txnType, setTxnType] = useState<AccountTransactionType>(AccountTransactionType.EXPENSE);
  const [txnCategory, setTxnCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [txnAmount, setTxnAmount] = useState<string>('');
  const [txnDate, setTxnDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [txnPaymentMode, setTxnPaymentMode] = useState<string>('CASH');
  const [txnReferenceNo, setTxnReferenceNo] = useState('');
  const [txnPayeePayer, setTxnPayeePayer] = useState('');
  const [txnDescription, setTxnDescription] = useState('');
  const [txnEmployeeId, setTxnEmployeeId] = useState('');

  // Advance Recovery Modal
  const [recoveryModalOpen, setRecoveryModalOpen] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<AccountTransactionDto | null>(null);
  const [recoveryAmount, setRecoveryAmount] = useState<string>('');
  const [recoveryNotes, setRecoveryNotes] = useState('');
  const [submittingRecovery, setSubmittingRecovery] = useState(false);

  // Fetch Data strictly from DB
  const fetchData = async () => {
    if (!activeTenant || !accessToken) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const [txRes, sumRes, empRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/accounts/transactions`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-tenant-id': activeTenant.id
          }
        }),
        fetch(`${API_BASE_URL}/api/v1/accounts/summary`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-tenant-id': activeTenant.id
          }
        }),
        fetch(`${API_BASE_URL}/api/v1/employees`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-tenant-id': activeTenant.id
          }
        })
      ]);

      if (txRes.ok && sumRes.ok) {
        const txData = await txRes.json();
        const sumData = await sumRes.json();
        setTransactions(Array.isArray(txData) ? txData : []);
        setSummary(sumData || {
          totalIncome: 0,
          totalExpense: 0,
          totalAdvance: 0,
          totalAdvanceOutstanding: 0,
          netCashflow: 0,
          transactionCount: 0
        });

        if (empRes.ok) {
          const empData = await empRes.json();
          setEmployees(Array.isArray(empData) ? empData : []);
        }
      } else {
        const err = await txRes.json().catch(() => ({}));
        setErrorMsg(err.message || 'Failed to load account transactions from database.');
        setTransactions([]);
        setSummary({
          totalIncome: 0,
          totalExpense: 0,
          totalAdvance: 0,
          totalAdvanceOutstanding: 0,
          netCashflow: 0,
          transactionCount: 0
        });
      }
    } catch (err: any) {
      console.error('Error fetching accounts from DB:', err);
      setErrorMsg('Could not connect to database to fetch accounts records.');
      setTransactions([]);
      setSummary({
        totalIncome: 0,
        totalExpense: 0,
        totalAdvance: 0,
        totalAdvanceOutstanding: 0,
        netCashflow: 0,
        transactionCount: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTenant?.id, accessToken]);

  // Tab definitions
  const tabs: EnterpriseTabItem<'all' | 'incomes' | 'expenses'>[] = useMemo(() => [
    { key: 'all', label: 'All Transactions', count: transactions.length },
    { 
      key: 'incomes', 
      label: 'Incomes & Inflows', 
      count: transactions.filter(t => t.type === AccountTransactionType.INCOME).length 
    },
    { 
      key: 'expenses', 
      label: 'Expenses & Advances', 
      count: transactions.filter(t => t.type === AccountTransactionType.EXPENSE || t.type === AccountTransactionType.EMPLOYEE_ADVANCE).length 
    },
  ], [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Tab filter
      if (activeTab === 'incomes' && t.type !== AccountTransactionType.INCOME) return false;
      if (activeTab === 'expenses' && t.type !== AccountTransactionType.EXPENSE && t.type !== AccountTransactionType.EMPLOYEE_ADVANCE) return false;

      // Date Range filter
      if (startDate && t.transactionDate < startDate) return false;
      if (endDate && t.transactionDate > endDate) return false;

      // Payment mode filter
      if (filterMode !== 'ALL' && t.paymentMode !== filterMode) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCategory = t.category.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q) || false;
        const matchRef = t.referenceNo?.toLowerCase().includes(q) || false;
        const matchPayee = t.payeePayer?.toLowerCase().includes(q) || false;
        const matchEmpName = t.employeeName?.toLowerCase().includes(q) || false;
        const matchEmpCode = t.employeeCode?.toLowerCase().includes(q) || false;

        return matchCategory || matchDesc || matchRef || matchPayee || matchEmpName || matchEmpCode;
      }

      return true;
    });
  }, [transactions, activeTab, startDate, endDate, filterMode, searchQuery]);

  // Period-aware summary
  const periodSummary = useMemo(() => {
    let income = 0;
    let expense = 0;
    let advance = 0;
    let advanceDue = 0;

    for (const t of filteredTransactions) {
      const amt = Number(t.amount || 0);
      const rec = Number(t.recoveredAmount || 0);
      if (t.type === AccountTransactionType.INCOME) {
        income += amt;
      } else if (t.type === AccountTransactionType.EXPENSE) {
        expense += amt;
      } else if (t.type === AccountTransactionType.EMPLOYEE_ADVANCE) {
        advance += amt;
        advanceDue += Math.max(0, amt - rec);
      }
    }

    return {
      totalIncome: income,
      totalExpense: expense,
      totalAdvance: advance,
      totalAdvanceOutstanding: advanceDue,
      netCashflow: income - (expense + advance)
    };
  }, [filteredTransactions]);

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / pageSize) || 1;
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTransactions.slice(start, start + pageSize);
  }, [filteredTransactions, currentPage, pageSize]);

  // Open Add Transaction Modal
  const handleOpenAddModal = (presetType?: AccountTransactionType) => {
    const chosenType = presetType || (activeTab === 'incomes' ? AccountTransactionType.INCOME : AccountTransactionType.EXPENSE);
    setTxnType(chosenType);
    setTxnCategory('');
    setCustomCategory('');
    setTxnAmount('');
    setTxnDate(new Date().toISOString().split('T')[0]);
    setTxnPaymentMode('CASH');
    setTxnReferenceNo('');
    setTxnPayeePayer('');
    setTxnDescription('');
    setTxnEmployeeId(employees[0]?.id || '');
    setIsModalOpen(true);
  };

  // Submit New Transaction
  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txnAmount || Number(txnAmount) <= 0) {
      setErrorMsg('Please enter a valid positive amount.');
      return;
    }

    const finalCategory = txnType === AccountTransactionType.EMPLOYEE_ADVANCE
      ? (txnCategory || 'Salary Advance')
      : (txnCategory === 'CUSTOM' ? customCategory : txnCategory);

    if (!finalCategory.trim()) {
      setErrorMsg('Please select or enter a category.');
      return;
    }

    if (txnType === AccountTransactionType.EMPLOYEE_ADVANCE && !txnEmployeeId && employees.length > 0) {
      setErrorMsg('Please select an employee for the advance.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      type: txnType,
      category: finalCategory.trim(),
      amount: Number(txnAmount),
      transactionDate: txnDate,
      paymentMode: txnPaymentMode,
      referenceNo: txnReferenceNo.trim() || undefined,
      payeePayer: txnPayeePayer.trim() || undefined,
      description: txnDescription.trim() || undefined,
      employeeId: txnType === AccountTransactionType.EMPLOYEE_ADVANCE ? txnEmployeeId : undefined
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/accounts/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsModalOpen(false);
        setSuccessMsg('Transaction recorded successfully in database.');
        setTimeout(() => setSuccessMsg(null), 3500);
        await fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.message || 'Failed to record transaction in database.');
      }
    } catch (err) {
      console.error('Database connection error while saving transaction:', err);
      setErrorMsg('Could not save transaction to database. Please check your network connection.');
    } finally {
      setSubmitting(false);
    }
  };

  // Open Recovery Modal for an Advance
  const handleOpenRecoveryModal = (adv: AccountTransactionDto) => {
    setSelectedAdvance(adv);
    const remaining = Math.max(0, Number(adv.amount) - Number(adv.recoveredAmount || 0));
    setRecoveryAmount(remaining.toString());
    setRecoveryNotes('');
    setRecoveryModalOpen(true);
  };

  // Submit Advance Recovery strictly to DB
  const handleSubmitRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvance) return;

    const amt = Number(recoveryAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid recovery amount.');
      return;
    }

    const currentRecovered = Number(selectedAdvance.recoveredAmount || 0);
    const remaining = Math.max(0, Number(selectedAdvance.amount) - currentRecovered);
    if (amt > remaining) {
      setErrorMsg(`Recovery amount cannot exceed remaining balance of ₹${remaining.toLocaleString()}.`);
      return;
    }

    setSubmittingRecovery(true);
    setErrorMsg(null);

    const newRecovered = currentRecovered + amt;
    const isSettled = newRecovered >= Number(selectedAdvance.amount);
    const status = isSettled ? AdvanceRecoveryStatus.SETTLED : AdvanceRecoveryStatus.PARTIAL;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/accounts/advances/${selectedAdvance.id}/recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        },
        body: JSON.stringify({
          recoveredAmount: amt,
          recoveryStatus: status,
          notes: recoveryNotes.trim() || undefined
        })
      });

      if (res.ok) {
        setRecoveryModalOpen(false);
        setSuccessMsg(`₹${amt.toLocaleString()} recovery recorded for ${selectedAdvance.employeeName || selectedAdvance.payeePayer} in database.`);
        setTimeout(() => setSuccessMsg(null), 3500);
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || 'Failed to save advance recovery in database.');
      }
    } catch (err) {
      console.error('Database error while recording recovery:', err);
      setErrorMsg('Could not record advance recovery in database.');
    } finally {
      setSubmittingRecovery(false);
    }
  };

  // Delete Transaction strictly from DB
  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction record?')) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/accounts/transactions/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        }
      });
      if (res.ok) {
        setSuccessMsg('Transaction deleted from database.');
        setTimeout(() => setSuccessMsg(null), 3500);
        await fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorMsg(err.message || 'Failed to delete transaction from database.');
      }
    } catch (err) {
      console.error('Database error deleting transaction:', err);
      setErrorMsg('Could not delete transaction from database.');
    }
  };

  // Export to native Excel (.xlsx)
  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) return;
    const dateStr = new Date().toISOString().split('T')[0];
    const tenantSlug = activeTenant?.slug || 'export';

    exportToExcel({
      filename: `Accounts_Ledger_${tenantSlug}_${dateStr}`,
      sheetName: 'Accounts Ledger',
      columns: [
        { header: 'Date', accessor: 'transactionDate' },
        { header: 'Type', accessor: 'type' },
        { header: 'Category', accessor: 'category' },
        { header: 'Party / Payee / Employee', accessor: (r) => r.employeeName || r.payeePayer || '-' },
        { header: 'Payment Mode', accessor: 'paymentMode' },
        { header: 'Reference No', accessor: (r) => r.referenceNo || '-' },
        { header: 'Amount (₹)', accessor: 'amount' },
        { header: 'Recovered (₹)', accessor: (r) => r.recoveredAmount || 0 },
        { header: 'Status', accessor: 'status' },
        { header: 'Description / Notes', accessor: (r) => r.description || '' },
      ],
      data: filteredTransactions,
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Date Range Bar */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mr-1">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Date Range:</span>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <span className="text-[11px] text-slate-400 font-semibold">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg">
            <span className="text-[11px] text-slate-400 font-semibold">To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none"
            />
          </div>

          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setCurrentPage(1);
              }}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-semibold px-2 py-1 rounded-md hover:bg-slate-100 transition"
            >
              Clear Dates
            </button>
          )}
        </div>

        {/* Quick Date Range Presets */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg transition ${!startDate && !endDate ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Time
          </button>
          <button
            type="button"
            onClick={() => {
              const today = new Date().toISOString().split('T')[0];
              setStartDate(today);
              setEndDate(today);
              setCurrentPage(1);
            }}
            className={`px-2.5 py-1 rounded-lg transition ${startDate && startDate === endDate ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => {
              const now = new Date();
              const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
              const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
              setStartDate(firstDay);
              setEndDate(lastDay);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => {
              const past = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
              const today = new Date().toISOString().split('T')[0];
              setStartDate(past);
              setEndDate(today);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Financial Overview KPI Cards (Reflects Filtered Date Range) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Income */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Income</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold text-slate-900">
              ₹{periodSummary.totalIncome.toLocaleString()}
            </div>
            <span className="text-[11px] font-medium text-emerald-600 flex items-center">
              Inflows
            </span>
          </div>
        </div>

        {/* Total Expenses & Advances */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Expenses & Advances</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold text-slate-900">
              ₹{(periodSummary.totalExpense + periodSummary.totalAdvance).toLocaleString()}
            </div>
            <span className="text-[11px] font-medium text-rose-600 flex items-center">
              Outflows
            </span>
          </div>
        </div>

        {/* Employee Advances Outstanding */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Advances Outstanding</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-xl font-bold text-slate-900">
              ₹{periodSummary.totalAdvanceOutstanding.toLocaleString()}
            </div>
            <span className="text-[11px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60">
              ₹{periodSummary.totalAdvance.toLocaleString()} total given
            </span>
          </div>
        </div>

        {/* Net Cash Balance */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Cash Balance</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-800 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className={`text-xl font-bold ${periodSummary.netCashflow >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>
              ₹{periodSummary.netCashflow.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Net Balance
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="space-y-3">
        {/* Navigation Tabs */}
        <EnterpriseTabs
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={(tabId) => {
            setActiveTab(tabId as any);
            setCurrentPage(1);
          }}
        />

        {/* Toolbar */}
        <EnterpriseToolbar
          title={
            activeTab === 'incomes' ? 'Income Ledger' :
            activeTab === 'expenses' ? 'Expenses & Staff Advances' :
            'Accounts & General Ledger'
          }
          totalCount={filteredTransactions.length}
          tenantName={activeTenant?.name}
          searchPlaceholder="Search category, payee, ref #, employee..."
          searchValue={searchQuery}
          onSearchChange={(val) => {
            setSearchQuery(val);
            setCurrentPage(1);
          }}
          primaryActionLabel={
            activeTab === 'incomes' ? 'Record Income' :
            activeTab === 'expenses' ? 'Record Expense / Advance' :
            'Record Transaction'
          }
          primaryActionIcon={Plus}
          onPrimaryAction={() => handleOpenAddModal()}
          filters={
            <div className="flex items-center gap-1.5">
              {/* Payment Mode Filter */}
              <select
                value={filterMode}
                onChange={(e) => {
                  setFilterMode(e.target.value);
                  setCurrentPage(1);
                }}
                className="py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Modes</option>
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
              </select>

              {/* Export Excel (.xlsx) Button */}
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

        {/* Unified General Ledger Table */}
        <EnterpriseTable
          loading={loading}
          isEmpty={paginatedTransactions.length === 0}
          emptyMessage="No account transactions found matching criteria."
          footer={
            filteredTransactions.length > pageSize && (
              <EnterprisePagination
                currentPage={currentPage}
                totalItems={filteredTransactions.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                itemLabel="transactions"
              />
            )
          }
        >
          <table className="w-full text-left border-collapse">
            <EnterpriseTableHeader>
              <EnterpriseTableTh>Date</EnterpriseTableTh>
              <EnterpriseTableTh>Type</EnterpriseTableTh>
              <EnterpriseTableTh>Category</EnterpriseTableTh>
              <EnterpriseTableTh>Party / Payee / Employee</EnterpriseTableTh>
              <EnterpriseTableTh>Payment Mode & Ref</EnterpriseTableTh>
              <EnterpriseTableTh>Notes</EnterpriseTableTh>
              <EnterpriseTableTh align="right">Amount</EnterpriseTableTh>
              <EnterpriseTableTh align="right">Action</EnterpriseTableTh>
            </EnterpriseTableHeader>
            <EnterpriseTableBody>
              {paginatedTransactions.map((tx) => {
                const isIncome = tx.type === AccountTransactionType.INCOME;
                const isAdvance = tx.type === AccountTransactionType.EMPLOYEE_ADVANCE;
                const amount = Number(tx.amount);
                const recovered = Number(tx.recoveredAmount || 0);
                const outstanding = Math.max(0, amount - recovered);
                const isSettled = tx.recoveryStatus === AdvanceRecoveryStatus.SETTLED || (isAdvance && outstanding <= 0);

                return (
                  <EnterpriseTableRow key={tx.id}>
                    <EnterpriseTableTd>
                      <span className="font-medium text-slate-800">{tx.transactionDate}</span>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      <EnterpriseBadge
                        variant={isIncome ? 'success' : isAdvance ? 'purple' : 'danger'}
                      >
                        {isIncome ? 'Income' : isAdvance ? 'Staff Advance' : 'Expense'}
                      </EnterpriseBadge>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      <span className="font-semibold text-slate-800">{tx.category}</span>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      <div>
                        <div className="text-slate-800 font-medium">
                          {tx.employeeName || tx.payeePayer || '-'}
                        </div>
                        {tx.employeeCode && (
                          <div className="text-[11px] text-slate-400">
                            {tx.employeeCode} {tx.employeeDepartment ? `• ${tx.employeeDepartment}` : ''}
                          </div>
                        )}
                      </div>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      <div className="text-slate-600 text-[11px]">
                        <span className="capitalize">{tx.paymentMode.toLowerCase().replace('_', ' ')}</span>
                        {tx.referenceNo && (
                          <span className="text-slate-400 block">{tx.referenceNo}</span>
                        )}
                      </div>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      <span className="text-slate-500 text-[11px] truncate max-w-xs block">
                        {tx.description || '-'}
                      </span>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd align="right">
                      <div>
                        <span className={`font-semibold ${isIncome ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {isIncome ? '+' : '-'}₹{amount.toLocaleString()}
                        </span>
                        {isAdvance && (
                          <div className="text-[10px] font-medium mt-0.5">
                            {isSettled ? (
                              <span className="text-emerald-600">Settled</span>
                            ) : (
                              <span className="text-amber-700">₹{outstanding.toLocaleString()} due</span>
                            )}
                          </div>
                        )}
                      </div>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd align="right">
                      <div className="flex items-center justify-end gap-1">
                        {isAdvance && !isSettled && (
                          <button
                            type="button"
                            onClick={() => handleOpenRecoveryModal(tx)}
                            className="px-2 py-0.5 text-[11px] font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded transition mr-1"
                          >
                            Recover
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition"
                          title="Delete transaction"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </EnterpriseTableTd>
                  </EnterpriseTableRow>
                );
              })}
            </EnterpriseTableBody>
          </table>
        </EnterpriseTable>
      </div>

      {/* Record New Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full overflow-hidden my-8">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Financial Transaction</h3>
                <p className="text-[11px] text-slate-400">Add an income, operational expense, or employee advance</p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="p-5 space-y-4">
              {/* Type Selector Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Transaction Type</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTxnType(AccountTransactionType.EXPENSE);
                      setTxnCategory('');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                      txnType === AccountTransactionType.EXPENSE
                        ? 'bg-rose-50 border-rose-300 text-rose-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5" />
                    <span>Expense</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTxnType(AccountTransactionType.INCOME);
                      setTxnCategory('');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                      txnType === AccountTransactionType.INCOME
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Income</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTxnType(AccountTransactionType.EMPLOYEE_ADVANCE);
                      setTxnCategory('Salary Advance');
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 transition ${
                      txnType === AccountTransactionType.EMPLOYEE_ADVANCE
                        ? 'bg-purple-50 border-purple-300 text-purple-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Staff Advance</span>
                  </button>
                </div>
              </div>

              {/* Advance-specific: Employee Dropdown */}
              {txnType === AccountTransactionType.EMPLOYEE_ADVANCE && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Employee <span className="text-rose-500">*</span>
                  </label>
                  {employees.length > 0 ? (
                    <select
                      value={txnEmployeeId}
                      onChange={(e) => setTxnEmployeeId(e.target.value)}
                      className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      required
                    >
                      <option value="">-- Choose Employee --</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.firstName} {emp.lastName} ({emp.employeeCode} - {emp.department})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Employee Name"
                      value={txnPayeePayer}
                      onChange={(e) => setTxnPayeePayer(e.target.value)}
                      className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white text-slate-800"
                      required
                    />
                  )}
                </div>
              )}

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category <span className="text-rose-500">*</span>
                </label>
                {txnType === AccountTransactionType.EMPLOYEE_ADVANCE ? (
                  <select
                    value={txnCategory}
                    onChange={(e) => setTxnCategory(e.target.value)}
                    className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="Salary Advance">Salary Advance</option>
                    <option value="Festival Advance">Festival Advance</option>
                    <option value="Medical Need Advance">Medical Need Advance</option>
                    <option value="Travel / Site Advance">Travel / Site Advance</option>
                    <option value="Emergency Advance">Emergency Advance</option>
                  </select>
                ) : (
                  <div className="space-y-2">
                    <select
                      value={txnCategory}
                      onChange={(e) => setTxnCategory(e.target.value)}
                      className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      required
                    >
                      <option value="">-- Choose Category --</option>
                      {(txnType === AccountTransactionType.INCOME ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                      <option value="CUSTOM">+ Custom Category</option>
                    </select>

                    {txnCategory === 'CUSTOM' && (
                      <input
                        type="text"
                        placeholder="Enter custom category name..."
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white text-slate-800"
                        required
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Amount and Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g. 5000"
                    value={txnAmount}
                    onChange={(e) => setTxnAmount(e.target.value)}
                    className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={txnDate}
                    onChange={(e) => setTxnDate(e.target.value)}
                    className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    required
                  />
                </div>
              </div>

              {/* Payment Mode & Reference # */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Mode</label>
                  <select
                    value={txnPaymentMode}
                    onChange={(e) => setTxnPaymentMode(e.target.value)}
                    className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  >
                    <option value="CASH">Cash</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reference / Voucher #</label>
                  <input
                    type="text"
                    placeholder={txnType === AccountTransactionType.EMPLOYEE_ADVANCE ? 'e.g. ADV-001' : 'e.g. INV-102, Bill #'}
                    value={txnReferenceNo}
                    onChange={(e) => setTxnReferenceNo(e.target.value)}
                    className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              </div>

              {/* Payee / Payer Name (Only for normal income/expense) */}
              {txnType !== AccountTransactionType.EMPLOYEE_ADVANCE && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {txnType === AccountTransactionType.INCOME ? 'Received From (Customer / Client)' : 'Paid To (Vendor / Merchant)'}
                  </label>
                  <input
                    type="text"
                    placeholder={txnType === AccountTransactionType.INCOME ? 'e.g. AcroTex Corp' : 'e.g. Landlord, Tea Stall, Stationary Shop'}
                    value={txnPayeePayer}
                    onChange={(e) => setTxnPayeePayer(e.target.value)}
                    className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  />
                </div>
              )}

              {/* Description / Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional details or context..."
                  value={txnDescription}
                  onChange={(e) => setTxnDescription(e.target.value)}
                  className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-2xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  {submitting && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Advance Recovery Modal */}
      {recoveryModalOpen && selectedAdvance && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Advance Recovery</h3>
                <p className="text-[11px] text-slate-400">Deduct or settle employee cash advance</p>
              </div>
              <button
                type="button"
                onClick={() => setRecoveryModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRecovery} className="p-5 space-y-4">
              {/* Advance Summary info */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-semibold text-slate-900">{selectedAdvance.employeeName || selectedAdvance.payeePayer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Advance Given:</span>
                  <span className="font-semibold text-slate-900">₹{Number(selectedAdvance.amount).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Already Recovered:</span>
                  <span className="font-semibold text-emerald-700">₹{Number(selectedAdvance.recoveredAmount || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="font-semibold text-slate-700">Remaining Due:</span>
                  <span className="font-bold text-amber-800">
                    ₹{Math.max(0, Number(selectedAdvance.amount) - Number(selectedAdvance.recoveredAmount || 0)).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Recovery Amount Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Amount to Recover / Deduct Now (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={Math.max(0, Number(selectedAdvance.amount) - Number(selectedAdvance.recoveredAmount || 0))}
                    step="any"
                    value={recoveryAmount}
                    onChange={(e) => setRecoveryAmount(e.target.value)}
                    className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const due = Math.max(0, Number(selectedAdvance.amount) - Number(selectedAdvance.recoveredAmount || 0));
                      setRecoveryAmount(due.toString());
                    }}
                    className="absolute right-2 top-1.5 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded"
                  >
                    Full Balance
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Recovery Notes / Salary Cycle</label>
                <input
                  type="text"
                  placeholder="e.g. October 2026 Payroll deduction, Cash repayment"
                  value={recoveryNotes}
                  onChange={(e) => setRecoveryNotes(e.target.value)}
                  className="w-full py-2 px-3 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRecoveryModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRecovery}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition shadow-2xs flex items-center gap-1.5 disabled:opacity-60"
                >
                  {submittingRecovery && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Confirm Recovery</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
