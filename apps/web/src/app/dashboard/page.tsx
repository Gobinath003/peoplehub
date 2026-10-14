'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL } from '../../config/api';
import Link from 'next/link';
import { 
  Users, CheckCircle2, ChevronRight, 
  Scissors, Calendar, Clock, ArrowRight,
  Coins, UserCheck, UserX, AlertCircle, Sparkles
} from 'lucide-react';
import { EmployeeDto, PieceRateLogDto } from '@people-hub/shared-types';

export default function DashboardHome() {
  const { user, activeTenant, accessToken, isSuperAdmin, activeBranchScope, enabledModules } = useApp();

  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [recentLogs, setRecentLogs] = useState<PieceRateLogDto[]>([]);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
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

        const [empRes, logsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/employees`, { headers }).catch(() => null),
          isGarments ? fetch(`${API_BASE_URL}/api/v1/piece-rate/logs`, { headers }).catch(() => null) : Promise.resolve(null)
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
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-6">
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
                <span>Scope: <strong className="text-slate-700">{activeBranchScope}</strong></span>
              </>
            )}
            <span>•</span>
            <span className="text-slate-500 font-semibold">Noltrion Innovations Platform</span>
          </div>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
            <span className="text-slate-400 font-medium block text-[10px] uppercase">Registered Headcount</span>
            <span className="font-black text-slate-900 text-sm">{totalStaffCount} Staff Members</span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* CORE EXECUTIVE OPERATIONS: ATTENDANCE & PAYROLL          */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-7">
        
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
                    Daily employee presence and floor muster verification
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {attendanceRate}% Present
              </span>
            </div>

            {/* Attendance Metrics Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                  Total Staff
                </span>
                <span className="text-xl font-black text-slate-900">{totalStaffCount}</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-center">
                <span className="text-[10px] uppercase tracking-wider text-emerald-700 font-bold block mb-1">
                  Present
                </span>
                <span className="text-xl font-black text-emerald-800">{presentCount}</span>
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 text-center">
                <span className="text-[10px] uppercase tracking-wider text-rose-700 font-bold block mb-1">
                  Absent
                </span>
                <span className="text-xl font-black text-rose-800">{absentCount}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Verify attendance, mark floor operators Present or Absent, and reconcile shift rosters on the unified single-view sheet.
            </p>
          </div>

          {/* Action Button */}
          <div className="pt-6">
            <Link
              href={isGarments ? '/dashboard/piece-rate' : '/dashboard/employees'}
              className="w-full py-3 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
            >
              <span>{isGarments ? 'Open Attendance & Production Sheet' : 'View Attendance & Staff Roster'}</span>
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
                    Monthly salary processing and wage reconciliation
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentMonthName}
              </span>
            </div>

            {/* Payroll Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
                  Active Pay Period
                </span>
                <span className="text-sm font-extrabold text-slate-800">{currentMonthName}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Standard 30 Days</span>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                <span className="text-[10px] uppercase tracking-wider text-indigo-700 font-bold block mb-1">
                  {isGarments ? 'Accrued Production Wages' : 'Compensation Engine'}
                </span>
                <span className="text-base font-black text-indigo-900">
                  {totalEarnings > 0 ? `₹${totalEarnings.toLocaleString()}` : 'Ready for Run'}
                </span>
                <span className="text-[10px] text-indigo-600/80 block mt-0.5">
                  {totalStaffCount} staff eligible
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Process monthly compensations, calculate piece-rate output accumulations, and generate statutory PDF payslips for disbursement.
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

      </div>

    </div>
  );
}
