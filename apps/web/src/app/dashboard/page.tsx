'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL } from '../../config/api';
import Link from 'next/link';
import { 
  Users, CheckCircle2, ChevronRight, 
  Scissors, Calendar, Clock, ArrowRight,
  Coins, UserCheck, UserX, AlertCircle, Sparkles,
  Wallet
} from 'lucide-react';
import { EmployeeDto, PieceRateLogDto } from '@people-hub/shared-types';

export default function DashboardHome() {
  const { user, activeTenant, accessToken, isSuperAdmin, activeBranchScope, enabledModules } = useApp();

  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [recentLogs, setRecentLogs] = useState<PieceRateLogDto[]>([]);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [accountSummary, setAccountSummary] = useState<{
    totalIncome: number;
    totalExpense: number;
    totalAdvance: number;
    netCashflow: number;
  }>({
    totalIncome: 0,
    totalExpense: 0,
    totalAdvance: 0,
    netCashflow: 0
  });
  const [loading, setLoading] = useState<boolean>(true);

  const isGarments = activeTenant?.industry === 'GARMENTS' || enabledModules?.includes('PIECE_RATE');

  // Current Formatted Date & Month
  const now = new Date();
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(now);

  const currentMonthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(now);

  useEffect(() => {
    if (!activeTenant || !accessToken) return;

    const fetchOverviewData = async () => {
      setLoading(true);
      try {
        const headers = {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id
        };

        const [empRes, logsRes, sumRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/employees`, { headers }).catch(() => null),
          isGarments ? fetch(`${API_BASE_URL}/api/v1/piece-rate/logs`, { headers }).catch(() => null) : Promise.resolve(null),
          fetch(`${API_BASE_URL}/api/v1/accounts/summary`, { headers }).catch(() => null)
        ]);

        if (empRes && empRes.ok) {
          const empData = await empRes.json();
          if (Array.isArray(empData)) {
            setEmployees(empData);
          }
        }

        if (logsRes && logsRes.ok) {
          const logsData = await logsRes.json();
          if (Array.isArray(logsData)) {
            setRecentLogs(logsData);
            const earnings = logsData.reduce((acc: number, l: any) => acc + (l.totalAmount || 0), 0);
            setTotalEarnings(earnings);
          }
        }

        if (sumRes && sumRes.ok) {
          const sumData = await sumRes.json();
          if (sumData) {
            setAccountSummary(sumData);
          }
        }
      } catch (err) {
        console.error('Error loading overview data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [activeTenant, accessToken, isGarments]);

  // Attendance metrics based on current logged roster
  const totalStaffCount = employees.length;
  // If piece-rate logs exist for today, count unique active employees; otherwise calculate standard active count
  const todayStr = now.toISOString().split('T')[0];
  const loggedEmployeeIdsToday = new Set(
    recentLogs
      .filter(l => l.logDate && l.logDate.startsWith(todayStr))
      .map(l => l.employeeId)
  );

  const presentCount = totalStaffCount > 0 
    ? (loggedEmployeeIdsToday.size > 0 ? loggedEmployeeIdsToday.size : totalStaffCount)
    : 0;
  const absentCount = totalStaffCount > presentCount ? (totalStaffCount - presentCount) : 0;
  const attendanceRate = totalStaffCount > 0 ? Math.round((presentCount / totalStaffCount) * 100) : 100;

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      
      {/* ======================================================== */}
      {/* C. COMPANY HEADER INFORMATION                            */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.03)]">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {activeTenant?.name || 'Company Dashboard'}
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {activeTenant?.industry || 'ENTERPRISE'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Welcome back, <strong className="text-slate-800">{user?.firstName} {user?.lastName}</strong>. Executive overview and daily operations.
          </p>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-2 pt-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{todayFormatted}</span>
            {activeBranchScope && (
              <>
                <span>•</span>
                <span>Branch: <strong className="text-slate-700">{activeBranchScope}</strong></span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CORE EXECUTIVE OPERATIONS: ATTENDANCE, PAYROLL, ACCOUNTS */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* ====================================================== */}
        {/* A. VIEW ATTENDANCE CARD                                */}
        {/* ====================================================== */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Workforce Attendance
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Daily employee presence & operations
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {attendanceRate}% Present
              </span>
            </div>

            {/* Attendance Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                  Total Staff
                </span>
                <span className="text-lg font-black text-slate-900">{totalStaffCount}</span>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-center">
                <span className="text-[9px] uppercase tracking-wider text-emerald-700 font-bold block mb-0.5">
                  Present
                </span>
                <span className="text-lg font-black text-emerald-800">{presentCount}</span>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 text-center">
                <span className="text-[9px] uppercase tracking-wider text-rose-700 font-bold block mb-0.5">
                  Absent
                </span>
                <span className="text-lg font-black text-rose-800">{absentCount}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Verify attendance, track piece-rate work outputs, and record multi-skill task logs.
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-6">
            <Link
              href={isGarments ? '/dashboard/piece-rate' : '/dashboard/employees'}
              className="w-full py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{isGarments ? 'Open Attendance & Production' : 'View Attendance & Staff Roster'}</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </Link>
          </div>
        </div>

        {/* ====================================================== */}
        {/* B. RUN PAYROLL CARD                                    */}
        {/* ====================================================== */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Payroll & Compensation
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Monthly salary processing & wages
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentMonthName}
              </span>
            </div>

            {/* Payroll Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold block mb-0.5">
                  Active Period
                </span>
                <span className="text-xs font-extrabold text-slate-800 block truncate">{currentMonthName}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Standard 30 Days</span>
              </div>

              <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                <span className="text-[9px] uppercase tracking-wider text-indigo-700 font-bold block mb-0.5">
                  {isGarments ? 'Accrued Wages' : 'Comp Engine'}
                </span>
                <span className="text-sm font-black text-indigo-900 block truncate">
                  {totalEarnings > 0 ? `₹${totalEarnings.toLocaleString()}` : 'Ready for Run'}
                </span>
                <span className="text-[10px] text-indigo-600/80 block mt-0.5">
                  {totalStaffCount} staff eligible
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Process monthly compensations, calculate piece-rate output accumulations, and generate statutory PDF payslips.
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-6">
            <Link
              href="/dashboard/payroll"
              className="w-full py-3 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Run Payroll</span>
              <ArrowRight className="w-4 h-4 text-amber-300" />
            </Link>
          </div>
        </div>

        {/* ====================================================== */}
        {/* C. ACCOUNTS & FINANCIALS CARD                          */}
        {/* ====================================================== */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Accounts & Expenses
                  </h2>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    Operating cashflow, advances & expenses
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                Live Ledger
              </span>
            </div>

            {/* Financial Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <span className="text-[9px] uppercase tracking-wider text-emerald-700 font-bold block mb-0.5">
                  Total Income
                </span>
                <span className="text-sm font-black text-emerald-900 block truncate">
                  ₹{accountSummary.totalIncome.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-600/80 block mt-0.5">
                  Inflows
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100">
                <span className="text-[9px] uppercase tracking-wider text-rose-700 font-bold block mb-0.5">
                  Expenses & Adv
                </span>
                <span className="text-sm font-black text-rose-900 block truncate">
                  ₹{(accountSummary.totalExpense + accountSummary.totalAdvance).toLocaleString()}
                </span>
                <span className="text-[10px] text-rose-600/80 block mt-0.5">
                  Outflows
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Track operational expenses, record employee salary advances, manage cash settlements, and balance books.
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-6">
            <Link
              href="/dashboard/accounts"
              className="w-full py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <span>Open Accounts & Ledgers</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}
