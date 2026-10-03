'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { API_BASE_URL } from '../../config/api';
import Link from 'next/link';
import { 
  Users, CheckCircle2, ChevronRight, ChevronLeft, 
  MoreHorizontal, Edit2, Calendar, Phone, Mail, 
  RotateCcw, SlidersHorizontal, ArrowUpRight, 
  Check, X, Briefcase, Scissors, Layers, Building2,
  Clock, Award, AlertCircle, Sparkles
} from 'lucide-react';

export default function DashboardHome() {
  const { user, activeTenant, accessToken, isSuperAdmin, isHRManager } = useApp();

  // Selected Day in Calendar Strip
  const [selectedDay, setSelectedDay] = useState(3); // Thursday 23 (matches screenshot)

  // Recent Activity Tab
  const [activeTab, setActiveTab] = useState<'recent' | 'upcoming'>('recent');

  // Interactive toggles for rows & checklist
  const [rowToggles, setRowToggles] = useState<Record<string, boolean>>({
    row1: true,
    row2: false,
  });

  const [checklistToggles, setChecklistToggles] = useState<Record<string, boolean>>({
    item1: true,
    item2: true,
    item3: true,
    item4: false,
    item5: false,
    item6: false,
    item7: false,
  });

  // Onboarding segmented toggle
  const [onboardingTab, setOnboardingTab] = useState<'new' | 'existing'>('new');
  const [onboardingRequestToggle, setOnboardingRequestToggle] = useState(true);

  // Live Stats from API
  const [stats, setStats] = useState({
    employeeCount: 12,
    completedUnits: '100K',
    activeTasks: 15,
    totalTasks: 20,
    incompleteTasks: 15,
  });

  useEffect(() => {
    if (!activeTenant || !accessToken) return;

    const fetchSummary = async () => {
      try {
        const [empRes, pieceRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/v1/employees`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'x-tenant-id': activeTenant.id
            }
          }),
          fetch(`${API_BASE_URL}/api/v1/piece-rate/summary`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'x-tenant-id': activeTenant.id
            }
          })
        ]);

        if (empRes.ok) {
          const emps = await empRes.json();
          setStats(prev => ({
            ...prev,
            employeeCount: emps.length,
          }));
        }

        if (pieceRes.ok) {
          const summary = await pieceRes.json();
          if (summary && summary.totalUnits) {
            setStats(prev => ({
              ...prev,
              completedUnits: `${summary.totalUnits.toLocaleString()}`,
            }));
          }
        }
      } catch (e) {
        // Safe fallback
      }
    };

    fetchSummary();
  }, [activeTenant, accessToken]);

  const daysOfWeek = [
    { name: 'Monday', short: 'Mon', date: 20 },
    { name: 'Tuesday', short: 'Tue', date: 21 },
    { name: 'Wednesday', short: 'Wed', date: 22 },
    { name: 'Thursday', short: 'Thu', date: 23 },
    { name: 'Friday', short: 'Fri', date: 24 },
    { name: 'Saturday', short: 'Sat', date: 25 },
    { name: 'Sunday', short: 'Sun', date: 26 },
  ];

  return (
    <div className="space-y-7 max-w-[1600px] mx-auto">
      {/* 2-Column Responsive Layout: Main 3/4 Area + Right Sidebar 1/4 Area */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-7 items-start">
        
        {/* ======================================================== */}
        {/* LEFT / CENTER COLUMN (xl:col-span-9)                      */}
        {/* ======================================================== */}
        <div className="xl:col-span-9 space-y-7">
          
          {/* 1. Greeting & Progress Subtitle */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                {user?.firstName || 'David'}, today you have to work
              </h1>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs font-bold text-slate-400">On 3rd task</span>
                {/* Orange Gradient Progress Bar */}
                <div className="w-48 h-2.5 bg-slate-200/80 rounded-full overflow-hidden flex items-center">
                  <div className="w-[60%] h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"></div>
                </div>
                <span className="text-xs font-black text-slate-700">60%</span>
              </div>
            </div>

            {/* Quick Context Tag */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400">Current Unit:</span>
              <span className="text-xs font-black text-[#5D5FEF] bg-[#EEF0FD] px-3 py-1.5 rounded-full border border-indigo-100">
                {activeTenant?.name || 'ABC Garments Ltd'}
              </span>
            </div>
          </div>

          {/* 2. Top Row: Calendar / Schedule (Left) + Profile Info Card (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Calendar / Schedule Widget (lg:col-span-6) */}
            <div className="lg:col-span-6 bg-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(112,144,176,0.06)] border border-slate-100/80 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">
                  Calendar / Schedule
                </h2>
                <button className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-50 transition">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* 7 Vertical Capsule Day Pills */}
              <div className="grid grid-cols-7 gap-2.5">
                {daysOfWeek.map((day, idx) => {
                  const isActive = selectedDay === idx;
                  return (
                    <button
                      key={day.name}
                      onClick={() => setSelectedDay(idx)}
                      className={`
                        py-4 px-1 rounded-2xl flex flex-col items-center justify-between transition-all duration-200
                        ${isActive 
                          ? 'bg-[#5D5FEF] text-white shadow-lg shadow-indigo-300/60 scale-105' 
                          : 'bg-slate-50/70 hover:bg-slate-100 text-slate-500'}
                      `}
                    >
                      <span className={`text-[10px] font-semibold tracking-wider ${isActive ? 'text-white' : 'text-slate-400'}`}>
                        {day.short}
                      </span>
                      <span className={`text-sm font-extrabold mt-3 ${isActive ? 'text-white' : 'text-slate-800'}`}>
                        {day.date}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Profile / Personal Information Card (lg:col-span-6) */}
            <div className="lg:col-span-6 bg-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(112,144,176,0.06)] border border-slate-100/80 flex flex-col justify-between">
              {/* Header with avatar & name */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-400 text-white font-black flex items-center justify-center text-base shadow-sm">
                    {user?.firstName?.[0] || 'D'}{user?.lastName?.[0] || 'M'}
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900">
                      {user?.firstName || 'David'} {user?.lastName || 'More'}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      {isSuperAdmin ? 'Super Administrator' : isHRManager ? 'HR Operations Manager' : 'Garment Cutting Master'}
                    </p>
                  </div>
                </div>

                <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-50">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Personal Information Grid */}
              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-800">Personal information</span>
                  <button className="text-slate-400 hover:text-[#5D5FEF] transition">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">First Name</span>
                    <span className="font-extrabold text-slate-800">{user?.firstName || 'David'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Last Name</span>
                    <span className="font-extrabold text-slate-800">{user?.lastName || 'More'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Email Address</span>
                    <span className="font-bold text-slate-700 truncate block">{user?.email || 'davidmore@gmail.com'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Phone</span>
                    <span className="font-bold text-slate-700 block">+91 98401 23456</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-[10px] text-slate-400 block font-medium">Role</span>
                    <span className="font-bold text-slate-800">
                      {isSuperAdmin ? 'Enterprise Super Admin' : 'Senior HR & Payroll Executive'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* 3. Middle Row: Summary 2x2 Grid + Team Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* 4 Pastel Soft Metric Cards (lg:col-span-6) */}
            <div className="lg:col-span-6 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Summary</h2>
              </div>

              <div className="grid grid-cols-2 gap-4">
                
                {/* 1. Mint Green: Total Completed */}
                <div className="bg-[#E8FAF0] rounded-3xl p-5 border border-emerald-100 flex items-center gap-4 transition hover:shadow-md">
                  <div className="w-12 h-12 rounded-2xl bg-white text-emerald-500 flex items-center justify-center shadow-sm shrink-0">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-emerald-700/80">Total Completed</div>
                    <div className="text-lg font-black text-slate-900">{stats.completedUnits} Completed</div>
                  </div>
                </div>

                {/* 2. Lavender Purple: In Progress */}
                <div className="bg-[#F0F2FF] rounded-3xl p-5 border border-indigo-100 flex items-center gap-4 transition hover:shadow-md">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm shrink-0">
                    <div className="w-6 h-6 rounded-full border-4 border-[#5D5FEF] border-t-transparent animate-spin-slow"></div>
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-indigo-700/80">In Progress</div>
                    <div className="text-lg font-black text-slate-900">{stats.activeTasks} Tasks</div>
                  </div>
                </div>

                {/* 3. Peach Amber: Total Tasks */}
                <div className="bg-[#FFF8E7] rounded-3xl p-5 border border-amber-100 flex items-center gap-4 transition hover:shadow-md">
                  <div className="w-12 h-12 rounded-2xl bg-white text-amber-500 flex items-center justify-center shadow-sm shrink-0">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-amber-700/80">Total Tasks</div>
                    <div className="text-lg font-black text-slate-900">{stats.totalTasks} Tasks</div>
                  </div>
                </div>

                {/* 4. Rose Pink: Incomplete Tasks */}
                <div className="bg-[#FFF0F0] rounded-3xl p-5 border border-rose-100 flex items-center gap-4 transition hover:shadow-md">
                  <div className="w-12 h-12 rounded-2xl bg-white text-rose-500 flex items-center justify-center shadow-sm shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-rose-700/80">Incomplete Task</div>
                    <div className="text-lg font-black text-slate-900">{stats.incompleteTasks} Tasks</div>
                  </div>
                </div>

              </div>
            </div>

            {/* Team Section (lg:col-span-6) */}
            <div className="lg:col-span-6 bg-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(112,144,176,0.06)] border border-slate-100/80 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Team</h2>
                <button className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-50">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* 3 Team Cards with Vibrant Background blocks */}
              <div className="grid grid-cols-3 gap-3.5">
                
                {/* Team Member 1 */}
                <div className="flex flex-col items-center text-center group">
                  <div className="w-full h-24 rounded-2xl bg-amber-400 flex items-center justify-center text-white shadow-sm transition group-hover:scale-105">
                    <span className="text-2xl font-black">MM</span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-xs font-extrabold text-slate-800">Mason Manson</div>
                    <div className="text-[10px] text-slate-400 font-medium">Human Resources</div>
                  </div>
                </div>

                {/* Team Member 2 */}
                <div className="flex flex-col items-center text-center group">
                  <div className="w-full h-24 rounded-2xl bg-[#5D5FEF] flex items-center justify-center text-white shadow-sm transition group-hover:scale-105">
                    <span className="text-2xl font-black">WL</span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-xs font-extrabold text-slate-800">Wardell Lauren</div>
                    <div className="text-[10px] text-slate-400 font-medium">Garment Manager</div>
                  </div>
                </div>

                {/* Team Member 3 */}
                <div className="flex flex-col items-center text-center group">
                  <div className="w-full h-24 rounded-2xl bg-[#05CD99] flex items-center justify-center text-white shadow-sm transition group-hover:scale-105">
                    <span className="text-2xl font-black">MM</span>
                  </div>
                  <div className="mt-2.5">
                    <div className="text-xs font-extrabold text-slate-800">Mathew Marshall</div>
                    <div className="text-[10px] text-slate-400 font-medium">Cutting Lead</div>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* 4. Task Board / Pipeline (4 Columns) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Task Board</h2>
              <Link 
                href="/dashboard/piece-rate" 
                className="text-xs font-bold text-[#5D5FEF] hover:underline"
              >
                See More
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Column 1: TO Do */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
                    <span>TO Do</span>
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-[0_6px_20px_rgba(112,144,176,0.06)] border border-slate-100 space-y-3 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-extrabold text-slate-800">Work Tool</span>
                    <button className="text-slate-300 hover:text-slate-500">
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                      Draft
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[10px] text-slate-400">
                    <div className="flex -space-x-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-400 text-white font-bold flex items-center justify-center text-[9px] border-2 border-white">M</span>
                      <span className="w-5 h-5 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center text-[9px] border-2 border-white">P</span>
                    </div>
                    <span>12 subtasks</span>
                  </div>
                </div>
              </div>

              {/* Column 2: In-Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
                    <span>In-Progress</span>
                    <span className="w-2 h-2 rounded-full bg-[#5D5FEF]"></span>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-[0_6px_20px_rgba(112,144,176,0.06)] border border-slate-100 space-y-3 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-extrabold text-slate-800">Introduction To Management</span>
                    <button className="text-slate-300 hover:text-slate-500">
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold bg-[#EEF0FD] text-[#5D5FEF] px-2 py-0.5 rounded-full">
                      In process
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[10px] text-slate-400">
                    <div className="flex -space-x-1.5">
                      <span className="w-5 h-5 rounded-full bg-purple-500 text-white font-bold flex items-center justify-center text-[9px] border-2 border-white">W</span>
                    </div>
                    <span>8 subtasks</span>
                  </div>
                </div>
              </div>

              {/* Column 3: Completed */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
                    <span>Completed</span>
                    <span className="w-2 h-2 rounded-full bg-[#05CD99]"></span>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-[0_6px_20px_rgba(112,144,176,0.06)] border border-slate-100 space-y-3 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-extrabold text-slate-800">Office Tour</span>
                    <button className="text-slate-300 hover:text-slate-500">
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full">
                      Office Tour
                    </span>
                    <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                      Completed
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[10px] text-slate-400">
                    <div className="flex -space-x-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-[9px] border-2 border-white">K</span>
                    </div>
                    <span className="text-emerald-600 font-bold">100% Done</span>
                  </div>
                </div>
              </div>

              {/* Column 4: Incomplete */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
                    <span>Incomplete</span>
                    <span className="w-2 h-2 rounded-full bg-[#EE5D50]"></span>
                  </div>
                  <button className="text-slate-400 hover:text-slate-600">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-4 shadow-[0_6px_20px_rgba(112,144,176,0.06)] border border-slate-100 space-y-3 hover:shadow-md transition">
                  <div className="flex items-start justify-between">
                    <span className="text-xs font-extrabold text-slate-800">Incomplete Tasks</span>
                    <button className="text-slate-300 hover:text-slate-500">
                      <MoreHorizontal className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                      Pending
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-50 text-[10px] text-slate-400">
                    <div className="flex -space-x-1.5">
                      <span className="w-5 h-5 rounded-full bg-rose-400 text-white font-bold flex items-center justify-center text-[9px] border-2 border-white">S</span>
                    </div>
                    <span>4 pending</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Pagination / Dots indicator */}
            <div className="flex items-center justify-center gap-3 pt-2">
              <button className="text-slate-400 hover:text-slate-700 p-1">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#5D5FEF]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              </div>
              <button className="text-slate-400 hover:text-slate-700 p-1">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 5. Recent Activity & Upcoming Section with Switches */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(112,144,176,0.06)] border border-slate-100/80 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              {/* Tabs */}
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setActiveTab('recent')}
                  className={`text-sm font-extrabold pb-1 transition relative ${
                    activeTab === 'recent' 
                      ? 'text-slate-900 border-b-2 border-[#5D5FEF]' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Recent Activity
                </button>
                <button
                  onClick={() => setActiveTab('upcoming')}
                  className={`text-sm font-extrabold pb-1 transition relative ${
                    activeTab === 'upcoming' 
                      ? 'text-slate-900 border-b-2 border-[#5D5FEF]' 
                      : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  Upcoming
                </button>
              </div>

              {/* Date Filter Pill */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-2xl px-3.5 py-1.5 text-xs text-slate-600 font-semibold shadow-sm">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>20 Sep 2026 - 20 Oct 2026</span>
                </div>
                <button className="w-8 h-8 rounded-xl bg-[#5D5FEF] text-white flex items-center justify-center shadow-md shadow-indigo-200">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Activity Table / Rows */}
            <div className="space-y-3">
              {/* Row 1 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 transition">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#05CD99]"></span>
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">Office Tour</div>
                    <div className="text-[10px] text-slate-400">Worker Direction & Station Setup</div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs font-semibold">
                  <div className="text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Goal</span>
                    <span className="text-emerald-600 font-extrabold">Good (4/10 hrs)</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Total</span>
                    <span className="text-slate-700 font-bold">50 Units</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Performed</span>
                    <span className="text-slate-900 font-extrabold">50 Done</span>
                  </div>

                  {/* iOS Style Switch */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRowToggles(prev => ({ ...prev, row1: !prev.row1 }))}
                      className={`
                        w-11 h-6 rounded-full transition-colors relative p-0.5
                        ${rowToggles.row1 ? 'bg-[#5D5FEF]' : 'bg-slate-300'}
                      `}
                    >
                      <span className={`
                        block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform
                        ${rowToggles.row1 ? 'translate-x-5' : 'translate-x-0'}
                      `} />
                    </button>
                    <span className="text-[11px] font-bold text-slate-600 min-w-[50px]">
                      {rowToggles.row1 ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50/50 hover:bg-slate-50 border border-slate-100 transition">
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EE5D50]"></span>
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-extrabold text-slate-900">Intro & Tool Briefing</div>
                    <div className="text-[10px] text-slate-400">Overlock Machine Calibration</div>
                  </div>
                </div>

                <div className="flex items-center gap-6 text-xs font-semibold">
                  <div className="text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Goal</span>
                    <span className="text-amber-600 font-extrabold">Good (2/10 hrs)</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Total</span>
                    <span className="text-slate-700 font-bold">30 Units</span>
                  </div>
                  <div className="text-center">
                    <span className="text-[9px] text-slate-400 uppercase font-bold block">Performed</span>
                    <span className="text-slate-900 font-extrabold">12 Done</span>
                  </div>

                  {/* iOS Style Switch */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setRowToggles(prev => ({ ...prev, row2: !prev.row2 }))}
                      className={`
                        w-11 h-6 rounded-full transition-colors relative p-0.5
                        ${rowToggles.row2 ? 'bg-[#5D5FEF]' : 'bg-slate-300'}
                      `}
                    >
                      <span className={`
                        block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform
                        ${rowToggles.row2 ? 'translate-x-5' : 'translate-x-0'}
                      `} />
                    </button>
                    <span className="text-[11px] font-bold text-slate-400 min-w-[50px]">
                      {rowToggles.row2 ? 'Active' : 'Not - Active'}
                    </span>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN RAIL (xl:col-span-3)                          */}
        {/* ======================================================== */}
        <div className="xl:col-span-3 space-y-7">
          
          {/* Card 1: Onboarding */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(112,144,176,0.06)] border border-slate-100/80 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Onboarding</h3>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Segmented Pill Toggle: New Employee vs Existing Employee */}
            <div className="p-1 bg-slate-100 rounded-2xl flex items-center text-xs font-bold text-slate-600">
              <button
                onClick={() => setOnboardingTab('new')}
                className={`flex-1 py-2 rounded-xl text-center transition ${
                  onboardingTab === 'new' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                New Employee
              </button>
              <button
                onClick={() => setOnboardingTab('existing')}
                className={`flex-1 py-2 rounded-xl text-center transition ${
                  onboardingTab === 'existing' 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                Existing Employee
              </button>
            </div>

            {/* Date Pill */}
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/80 rounded-2xl px-4 py-2 text-xs text-slate-600 font-semibold">
              <span className="text-[11px] font-bold">20.10.2026 - 30.10.2026</span>
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
            </div>

            {/* Onboarding Request Switch */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs font-bold text-slate-700">Onboarding Request</span>
              <button
                onClick={() => setOnboardingRequestToggle(!onboardingRequestToggle)}
                className={`
                  w-11 h-6 rounded-full transition-colors relative p-0.5
                  ${onboardingRequestToggle ? 'bg-[#5D5FEF]' : 'bg-slate-300'}
                `}
              >
                <span className={`
                  block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform
                  ${onboardingRequestToggle ? 'translate-x-5' : 'translate-x-0'}
                `} />
              </button>
            </div>

            {/* Onboarding Status Progress */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-400">Onboarding Status</span>
                <span className="text-slate-800">25%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="w-[25%] h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Card 2: Checklist */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(112,144,176,0.06)] border border-slate-100/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Checklist</h3>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">10/12 DONE</span>
            </div>

            {/* Checklist Items with colored tags and iOS switches */}
            <div className="space-y-3">
              
              {/* Item 1 */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Office Tour</span>
                  <span className="text-[9px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md">Done</span>
                </div>
                <button
                  onClick={() => setChecklistToggles(prev => ({ ...prev, item1: !prev.item1 }))}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${checklistToggles.item1 ? 'bg-[#05CD99]' : 'bg-slate-300'}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${checklistToggles.item1 ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Item 2 */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Introduction to Management</span>
                  <span className="text-[9px] font-bold bg-[#EEF0FD] text-[#5D5FEF] px-1.5 py-0.5 rounded-md">In progress</span>
                </div>
                <button
                  onClick={() => setChecklistToggles(prev => ({ ...prev, item2: !prev.item2 }))}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${checklistToggles.item2 ? 'bg-[#5D5FEF]' : 'bg-slate-300'}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${checklistToggles.item2 ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Item 3 */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-800">Work Tool</span>
                  <span className="text-[9px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">Draft</span>
                </div>
                <button
                  onClick={() => setChecklistToggles(prev => ({ ...prev, item3: !prev.item3 }))}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${checklistToggles.item3 ? 'bg-amber-400' : 'bg-slate-300'}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${checklistToggles.item3 ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Item 4 */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Intro to Colleagues</span>
                <button
                  onClick={() => setChecklistToggles(prev => ({ ...prev, item4: !prev.item4 }))}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${checklistToggles.item4 ? 'bg-[#5D5FEF]' : 'bg-slate-200'}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${checklistToggles.item4 ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Item 5 */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Job Responsibilities</span>
                <button
                  onClick={() => setChecklistToggles(prev => ({ ...prev, item5: !prev.item5 }))}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${checklistToggles.item5 ? 'bg-[#5D5FEF]' : 'bg-slate-200'}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${checklistToggles.item5 ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Item 6 */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Keycard Handling</span>
                <button
                  onClick={() => setChecklistToggles(prev => ({ ...prev, item6: !prev.item6 }))}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${checklistToggles.item6 ? 'bg-[#5D5FEF]' : 'bg-slate-200'}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${checklistToggles.item6 ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

              {/* Item 7 */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">Activities Training</span>
                <button
                  onClick={() => setChecklistToggles(prev => ({ ...prev, item7: !prev.item7 }))}
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${checklistToggles.item7 ? 'bg-[#5D5FEF]' : 'bg-slate-200'}`}
                >
                  <span className={`block w-4 h-4 rounded-full bg-white shadow transform transition-transform ${checklistToggles.item7 ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
              </div>

            </div>

            {/* Footer actions: Edit, Delete */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold">
              <button className="text-slate-400 hover:text-slate-700">Edit</button>
              <button className="text-rose-500 hover:text-rose-700">Delete</button>
            </div>
          </div>

          {/* Card 3: Donut Chart / Progress Graph */}
          <div className="bg-white rounded-3xl p-6 shadow-[0_10px_30px_rgba(112,144,176,0.06)] border border-slate-100/80 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Graph</h3>
              <button className="text-slate-400 hover:text-[#5D5FEF]">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Multi-segmented Donut Chart SVG */}
            <div className="relative flex items-center justify-center py-2">
              <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 160 160">
                {/* Background Ring */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  stroke="#F1F5F9"
                  strokeWidth="18"
                  fill="transparent"
                />
                {/* Segment 1: Violet (#5D5FEF) - 35% */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  stroke="#5D5FEF"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray="389.5"
                  strokeDashoffset="253"
                  strokeLinecap="round"
                />
                {/* Segment 2: Emerald Mint (#05CD99) - 25% */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  stroke="#05CD99"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray="389.5"
                  strokeDashoffset="292"
                  transform="rotate(130 80 80)"
                  strokeLinecap="round"
                />
                {/* Segment 3: Rose Pink (#EE5D50) - 15% */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  stroke="#EE5D50"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray="389.5"
                  strokeDashoffset="331"
                  transform="rotate(230 80 80)"
                  strokeLinecap="round"
                />
                {/* Segment 4: Amber (#FFB547) - 15% */}
                <circle
                  cx="80"
                  cy="80"
                  r="62"
                  stroke="#FFB547"
                  strokeWidth="18"
                  fill="transparent"
                  strokeDasharray="389.5"
                  strokeDashoffset="331"
                  transform="rotate(295 80 80)"
                  strokeLinecap="round"
                />
              </svg>

              {/* Center Progress Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-slate-900">60%</span>
                <span className="text-[10px] font-bold text-slate-400">Total Progress</span>
              </div>
            </div>

            {/* Mini Legend */}
            <div className="grid grid-cols-2 gap-2 pt-2 text-[10px] font-bold text-slate-600">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#5D5FEF]"></span>
                <span>Production</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#05CD99]"></span>
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FFB547]"></span>
                <span>Work Tools</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EE5D50]"></span>
                <span>Incomplete</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
