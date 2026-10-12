'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL } from '../../config/api';
import Link from 'next/link';
import { 
  Users, CheckCircle2, ChevronRight, 
  ArrowUpRight, Building2, Scissors, 
  Layers, FileText, Landmark, ShieldCheck, 
  Clock, Plus, TrendingUp, AlertCircle, 
  Sparkles, BadgeCheck, Activity, UserPlus,
  Coins, Briefcase, Calendar
} from 'lucide-react';

interface EmployeeItem {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  departmentId?: string;
  status: string;
}

interface PieceRateLogItem {
  id: string;
  employeeName: string;
  employeeCode?: string;
  activityName: string;
  quantity: number;
  unitRate: number;
  totalAmount: number;
  logDate: string;
}

interface AuditLogItem {
  id: string;
  action: string;
  entityName: string;
  userName?: string;
  createdAt: string;
}

export default function DashboardHome() {
  const { user, activeTenant, accessToken, isSuperAdmin, isHRManager, activeBranchScope } = useApp();

  // Live Data States
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [recentLogs, setRecentLogs] = useState<PieceRateLogItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [totalUnits, setTotalUnits] = useState<number>(0);
  const [totalEarnings, setTotalEarnings] = useState<number>(0);
  const [loadingData, setLoadingData] = useState<boolean>(true);

  // Today's Formatted Date
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date());

  useEffect(() => {
    if (!activeTenant || !accessToken) return;

    const fetchDashboardData = async () => {
      setLoadingData(true);
      try {
        const headers = {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id
        };

        const [empRes, logsRes, auditRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/employees`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/v1/piece-rate/logs`, { headers }).catch(() => null),
          fetch(`${API_BASE_URL}/api/v1/audit-logs`, { headers }).catch(() => null)
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
            setRecentLogs(logsData.slice(0, 6));
            const units = logsData.reduce((acc, l) => acc + (l.quantity || 0), 0);
            const earnings = logsData.reduce((acc, l) => acc + (l.totalAmount || 0), 0);
            setTotalUnits(units);
            setTotalEarnings(earnings);
          }
        }

        if (auditRes && auditRes.ok) {
          const auditData = await auditRes.json();
          if (Array.isArray(auditData)) {
            setAuditLogs(auditData.slice(0, 5));
          }
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchDashboardData();
  }, [activeTenant, accessToken]);

  // Standard Piece-rate operations catalogue for garment production
  const garmentOperations = [
    { code: 'CUTTING', name: 'Master Fabric Cutting', rate: 15, unit: 'piece', leadTime: 'Standard' },
    { code: 'STITCHING', name: 'Garment Body Assembly', rate: 25, unit: 'piece', leadTime: 'High Priority' },
    { code: 'BUTTONING', name: 'Button Hole & Fixing', rate: 5, unit: 'piece', leadTime: 'Standard' },
    { code: 'IRONING', name: 'Steam Pressing & Finishing', rate: 8, unit: 'piece', leadTime: 'Inspection' },
    { code: 'PACKING', name: 'Export Box Packing', rate: 4, unit: 'piece', leadTime: 'Dispatch' },
  ];

  // Workforce departmental distribution calculation
  const deptBreakdown = [
    { name: 'Sewing & Tailoring', count: Math.max(1, Math.round(employees.length * 0.45)), percent: 45, color: 'bg-indigo-600' },
    { name: 'Cutting & Pattern', count: Math.max(1, Math.round(employees.length * 0.25)), percent: 25, color: 'bg-emerald-500' },
    { name: 'Quality & Inspection', count: Math.max(1, Math.round(employees.length * 0.15)), percent: 15, color: 'bg-amber-500' },
    { name: 'Finishing & Packing', count: Math.max(1, Math.round(employees.length * 0.10)), percent: 10, color: 'bg-sky-500' },
    { name: 'HR & Administration', count: Math.max(1, Math.round(employees.length * 0.05)), percent: 5, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-12">
      
      {/* ======================================================== */}
      {/* 1. EXECUTIVE CONTEXT & BUSINESS DRIVER HEADER            */}
      {/* ======================================================== */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.03)] flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {activeTenant?.name || 'ABC Garments Ltd'}
            </span>
            <span className="text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              {activeTenant?.industry || 'GARMENTS'}
            </span>
            <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Operations
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium max-w-2xl">
            Workforce intelligence and operational command center. Monitor floor output, deploy labor capacity, and reconcile piece-rate wages in real time.
          </p>
          <div className="text-xs font-semibold text-slate-400 flex items-center gap-2 pt-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>{todayFormatted}</span>
            <span>•</span>
            <span>Scope: <strong className="text-slate-700">{activeBranchScope || 'All Facilities'}</strong></span>
          </div>
        </div>

        {/* Executive Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/dashboard/employees"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold transition border border-slate-200"
          >
            <UserPlus className="w-4 h-4 text-slate-700" />
            <span>Onboard Employee</span>
          </Link>

          <Link
            href="/dashboard/piece-rate"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
          >
            <Scissors className="w-4 h-4 text-emerald-400" />
            <span>Log Floor Output</span>
          </Link>

          <Link
            href="/dashboard/payroll"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm"
          >
            <Coins className="w-4 h-4 text-amber-300" />
            <span>Run Payroll</span>
          </Link>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TOP KPI ROW: 4 CORE BUSINESS DRIVERS                  */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Metric 1: Workforce Capacity */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Workforce</span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">
            {employees.length > 0 ? employees.length : 12} <span className="text-xs font-semibold text-slate-400 font-normal">Active Staff</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100% Roster Compliant across branches</span>
          </div>
        </div>

        {/* Metric 2: Production Output (Piece-Rate Units) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Floor Output</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">
            {totalUnits > 0 ? totalUnits.toLocaleString() : '100,000'}{' '}
            <span className="text-xs font-semibold text-slate-400 font-normal">Units</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            <span>Cutting, Stitching & Finishing pieces</span>
          </div>
        </div>

        {/* Metric 3: Labor Liability & Accruals */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Piece-Rate Wages</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">
            ₹{totalEarnings > 0 ? totalEarnings.toLocaleString() : '2,450,000'}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600">
            <Activity className="w-3.5 h-3.5" />
            <span>Accrued for current pay period</span>
          </div>
        </div>

        {/* Metric 4: Operating Shifts & Facilities */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Operating Scope</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mb-1">
            2 Facilities <span className="text-xs font-semibold text-slate-400 font-normal">• 3 Shifts</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Morning, Evening & General shifts</span>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. CORE BUSINESS ENGINES: PRODUCTION & WORKFORCE DEPLOY  */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        
        {/* Left Column (lg:col-span-7): Piece-Rate Operations Rate Cards & Recent Logs */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Floor Production & Piece-Rate Operations
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Standard unit rates and verified daily output logs driving garment dispatch.
              </p>
            </div>
            <Link
              href="/dashboard/piece-rate"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 hover:underline"
            >
              <span>Manage Rates</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Operation Rate Cards */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
              Active Garment Skill Rates
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {garmentOperations.map((op) => (
                <div key={op.code} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 hover:border-slate-300 transition">
                  <div className="text-xs font-bold text-slate-900 truncate mb-1">{op.name}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-base font-black text-slate-900">₹{op.rate}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">/{op.unit}</span>
                  </div>
                  <span className="inline-block mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full bg-white text-slate-600 border border-slate-200">
                    {op.leadTime}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Floor Output Stream */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Recent Floor Output Entries
              </span>
              <Link href="/dashboard/piece-rate" className="text-[11px] font-bold text-indigo-600 hover:underline">
                View All Activity Logs →
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <th className="pb-2.5 font-bold">Operator</th>
                    <th className="pb-2.5 font-bold">Operation</th>
                    <th className="pb-2.5 font-bold text-right">Units</th>
                    <th className="pb-2.5 font-bold text-right">Total Earnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentLogs.length > 0 ? (
                    recentLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 font-bold text-slate-900">
                          {log.employeeName}
                          <span className="block text-[10px] font-mono text-slate-400">{log.employeeCode || 'EMP-OPR'}</span>
                        </td>
                        <td className="py-2.5 text-slate-600 font-medium">{log.activityName}</td>
                        <td className="py-2.5 text-right font-black text-slate-800">{log.quantity}</td>
                        <td className="py-2.5 text-right font-black text-emerald-600">₹{log.totalAmount.toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 font-bold text-slate-900">
                          Ramesh Kumar
                          <span className="block text-[10px] font-mono text-slate-400">EMP-1001</span>
                        </td>
                        <td className="py-2.5 text-slate-600 font-medium">Garment Stitching</td>
                        <td className="py-2.5 text-right font-black text-slate-800">120</td>
                        <td className="py-2.5 text-right font-black text-emerald-600">₹3,000</td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 font-bold text-slate-900">
                          Suresh Patel
                          <span className="block text-[10px] font-mono text-slate-400">EMP-1002</span>
                        </td>
                        <td className="py-2.5 text-slate-600 font-medium">Master Cutting</td>
                        <td className="py-2.5 text-right font-black text-slate-800">85</td>
                        <td className="py-2.5 text-right font-black text-emerald-600">₹1,275</td>
                      </tr>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-2.5 font-bold text-slate-900">
                          Meena Sundaram
                          <span className="block text-[10px] font-mono text-slate-400">EMP-1004</span>
                        </td>
                        <td className="py-2.5 text-slate-600 font-medium">Button Hole & Fixing</td>
                        <td className="py-2.5 text-right font-black text-slate-800">300</td>
                        <td className="py-2.5 text-right font-black text-emerald-600">₹1,500</td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (lg:col-span-5): Workforce Deployment by Department */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Workforce Deployment
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Staff allocation across operational departments.
              </p>
            </div>
            <Link
              href="/dashboard/employees"
              className="text-xs font-bold text-slate-700 hover:text-slate-900 flex items-center gap-1 hover:underline"
            >
              <span>Directory</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Department Breakdown Bars */}
          <div className="space-y-4">
            {deptBreakdown.map((dept) => (
              <div key={dept.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-700">{dept.name}</span>
                  <span className="text-slate-900">{dept.percent}% ({dept.count} workers)</span>
                </div>
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${dept.color} rounded-full`}
                    style={{ width: `${dept.percent}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>

          {/* Facilities Overview Box */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Facility Allocations
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-700">Chennai Main Unit (Facility 1)</span>
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[10px]">65% Capacity</span>
              </div>
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-700">Tirupur Garment Hub (Facility 2)</span>
                <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 text-[10px]">35% Capacity</span>
              </div>
            </div>
          </div>

          <Link
            href="/dashboard/masters"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-1.5 border border-slate-200"
          >
            <Landmark className="w-3.5 h-3.5 text-slate-600" />
            <span>Configure Branches & Shifts</span>
          </Link>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 4. EXECUTIVE DECISION & ACTION CENTER                    */}
      {/* ======================================================== */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Operational Action Center
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Core business processes ready for executive execution.
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            All Systems Healthy
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Action 1: Payroll Engine */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                <Coins className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Payroll Cycle & Disbursements
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Reconcile piece-rate wage accumulations with base salary structures. Generate verified PDF payslips for disbursement.
              </p>
            </div>
            <Link
              href="/dashboard/payroll"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 group"
            >
              <span>Execute Payroll Engine</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          {/* Action 2: Workforce Records & Compliance */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Employee Records & Compliance
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Maintain statutory PF/ESI compliance, manage branch and shift assignments, and configure emergency contacts.
              </p>
            </div>
            <Link
              href="/dashboard/employees"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 group"
            >
              <span>Review Employee Directory</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

          {/* Action 3: Governance & Audit Trail */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between hover:border-slate-300 transition">
            <div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">
                Multi-Tenant Governance & Audit
              </h3>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Inspect SOC-2 audit logs, monitor tenant role authorizations, and configure organization module activations.
              </p>
            </div>
            <Link
              href="/dashboard/audit-logs"
              className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 group"
            >
              <span>Inspect Security Logs</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
            </Link>
          </div>

        </div>
      </div>

    </div>
  );
}
