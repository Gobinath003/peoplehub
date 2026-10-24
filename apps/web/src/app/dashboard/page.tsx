'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL } from '../../config/api';
import Link from 'next/link';
import { 
  Calendar, Clock, UserCheck, BarChart3
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
  const todayStr = now.toISOString().split('T')[0];
  const loggedEmployeeIdsToday = new Set(
    recentLogs
      .filter(l => l.logDate && l.logDate.startsWith(todayStr))
      .map(l => l.employeeId)
  );

  const presentCount = employees.length > 0 ? loggedEmployeeIdsToday.size : 0;
  const absentCount = Math.max(0, totalStaffCount - presentCount);
  const attendanceRate = totalStaffCount > 0 ? Math.round((presentCount / totalStaffCount) * 100) : 0;
  const activeFloorOperators = loggedEmployeeIdsToday.size;

  // Piece-rate Production Metrics
  const totalProductionUnits = useMemo(() => {
    return recentLogs.reduce((acc, l) => acc + (l.quantity || 0), 0);
  }, [recentLogs]);

  // Weekly production output trend (Mon - Sat)
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyProductionData = useMemo(() => {
    const dayTotals: { [key: string]: number } = {};
    daysOfWeek.forEach(d => { dayTotals[d] = 0; });

    if (recentLogs.length > 0) {
      recentLogs.forEach(l => {
        if (l.logDate) {
          const d = new Date(l.logDate);
          const dayName = daysOfWeek[(d.getDay() + 6) % 7] || 'Mon';
          if (dayTotals[dayName] !== undefined) {
            dayTotals[dayName] += (l.quantity || 0);
          }
        }
      });
    }

    return daysOfWeek.map((day) => {
      const units = dayTotals[day] || 0;
      return {
        day,
        units,
        isPeak: units >= 800,
        heightPct: units > 0 ? Math.min(100, Math.round((units / 900) * 100)) : 0
      };
    });
  }, [recentLogs]);

  const weeklyTotalUnits = weeklyProductionData.reduce((acc, d) => acc + d.units, 0);

  // Donut SVG circumference math
  // radius = 38, circumference = 2 * PI * 38 = ~238.76
  const radius = 38;
  const circ = 2 * Math.PI * radius;
  const presentOffset = circ - (circ * (attendanceRate / 100));

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      
      {/* ======================================================== */}
      {/* 1. DASHBOARD HEADER                                      */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Operational analytics and visual floor intelligence for <strong className="text-slate-800">{activeTenant?.name || 'Company'}</strong>.
          </p>
        </div>

        {/* Date & Shift Context */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-2xs self-start sm:self-auto">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{todayFormatted}</span>
          {activeBranchScope && (
            <>
              <span className="text-slate-300">•</span>
              <span className="text-slate-700 font-bold">{activeBranchScope}</span>
            </>
          )}
          <span className="text-slate-300">•</span>
          <span className="text-emerald-600 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Operations
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. VISUAL CHARTS: ATTENDANCE & FLOOR PRODUCTION TRENDS   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* CHART 1: ATTENDANCE DISTRIBUTION DONUT & OPERATIONS */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Workforce Attendance Distribution
                  </h2>
                  <p className="text-[11px] text-slate-400">Floor presence & active shifts</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {attendanceRate}% Present
              </span>
            </div>

            {/* Visual Donut Ring & Status Breakdown */}
            <div className="mt-5 flex flex-col sm:flex-row items-center gap-6">
              {/* Circular SVG Donut Chart */}
              <div className="relative w-36 h-36 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  {/* Background Track (Slate) */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#F1F5F9"
                    strokeWidth="11"
                  />
                  {/* Absent Arc (Rose) */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#F43F5E"
                    strokeWidth="11"
                    strokeDasharray={circ}
                    strokeDashoffset={0}
                  />
                  {/* Present Arc (Emerald) */}
                  <circle
                    cx="50"
                    cy="50"
                    r={radius}
                    fill="transparent"
                    stroke="#10B981"
                    strokeWidth="11"
                    strokeDasharray={circ}
                    strokeDashoffset={presentOffset}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                {/* Donut Center Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-slate-900 tracking-tight">{attendanceRate}%</span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 font-extrabold">PRESENT</span>
                </div>
              </div>

              {/* Attendance Categories Legend */}
              <div className="flex-1 w-full space-y-2.5">
                {/* Present */}
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="font-semibold text-slate-800">Present on Floor</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900">{presentCount}</span>
                    <span className="text-[10px] text-slate-400">({attendanceRate}%)</span>
                  </div>
                </div>

                {/* Floor Operators */}
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0" />
                    <span className="font-semibold text-slate-800">Active Piece-rate Line</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-slate-900">{activeFloorOperators}</span>
                    <span className="text-[10px] text-indigo-600 font-semibold">Logging</span>
                  </div>
                </div>

                {/* Absent */}
                <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                    <span className="font-semibold text-slate-800">Absent / Unmarked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-rose-700">{absentCount}</span>
                    <span className="text-[10px] text-slate-400">({100 - attendanceRate}%)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Shift Details Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Shift 1 (08:30 - 17:30 IST)</span>
            </span>
            <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 text-[11px]">
              Full Shift Active
            </span>
          </div>
        </div>

        {/* CHART 2: WEEKLY FLOOR PRODUCTION OUTPUT TREND (BAR CHART) */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-extrabold text-slate-900">
                    Weekly Production Output Trend
                  </h2>
                  <p className="text-[11px] text-slate-400">Mon - Sat completed garment units</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {weeklyTotalUnits.toLocaleString()} Units Total
              </span>
            </div>

            {/* Visual Multi-Bar Chart */}
            <div className="mt-5">
              {/* Target Line Legend */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2">
                <span>Production Target: <strong>600 Units/Day</strong></span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Peak Output
                  <span className="w-2.5 h-2.5 rounded bg-indigo-500 ml-2" /> Daily Volume
                </span>
              </div>

              {/* Bars Container */}
              <div className="h-52 flex items-end justify-between gap-2 pt-8 pb-2 border-b border-slate-200 relative">
                {/* Horizontal Target Line at ~33% from top of bar chart area */}
                <div className="absolute left-0 right-0 top-[38%] border-b border-dashed border-slate-300 z-0 pointer-events-none" />

                {weeklyProductionData.map((d) => (
                  <div key={d.day} className="flex-1 flex flex-col items-center justify-end z-10 group min-w-0">
                    {/* Tooltip / Value on Top */}
                    <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded shadow-2xs transition whitespace-nowrap mb-1.5 tabular-nums ${
                      d.isPeak 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : 'bg-slate-100 text-slate-700 group-hover:bg-indigo-100 group-hover:text-indigo-800'
                    }`}>
                      {d.units}
                    </span>

                    {/* Bar */}
                    <div className="w-full max-w-[36px] bg-slate-100 rounded-t-lg h-32 flex items-end overflow-hidden">
                      <div
                        style={{ height: `${d.heightPct}%` }}
                        className={`w-full rounded-t-lg transition-all duration-500 ${
                          d.isPeak
                            ? 'bg-gradient-to-t from-emerald-600 to-emerald-500 shadow-sm'
                            : 'bg-gradient-to-t from-indigo-600 to-indigo-500 group-hover:from-indigo-500 group-hover:to-indigo-400'
                        }`}
                      />
                    </div>

                    {/* Day Label */}
                    <span className="text-[11px] font-bold text-slate-600 mt-2">
                      {d.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bar Chart Summary Footer */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-700">
              Avg Daily Run: <strong>{Math.round(weeklyTotalUnits / 6)} Units/Day</strong>
            </span>
            <span className="text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60 text-[11px]">
              Live Shift Data
            </span>
          </div>
        </div>

      </div>

    </div>
  );
}
