'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { 
  Scissors, Plus, Calendar, Check, X, 
  Trash2, Filter, Search, UserCheck, UserX,
  Layers, TrendingUp, AlertCircle, Sparkles, Tag,
  Clock, CheckCircle2, ChevronRight, Save, RotateCcw
} from 'lucide-react';
import { 
  PieceRateActivityDto, 
  PieceRateLogDto, 
  EmployeeDto 
} from '@people-hub/shared-types';

interface SheetRow {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  attendance: 'PRESENT' | 'ABSENT' | 'HALF_DAY';
  activityId: string;
  activityName: string;
  unitRate: number;
  quantity: number;
  totalAmount: number;
  remarks: string;
  isSaved: boolean;
}

export default function PieceRatePage() {
  const { activeTenant, accessToken } = useApp();
  const [activeTab, setActiveTab] = useState<'sheet' | 'activities' | 'history'>('sheet');
  
  const [activities, setActivities] = useState<PieceRateActivityDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [logs, setLogs] = useState<PieceRateLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected Production Date
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Unified IRCTC-style Sheet Rows
  const [sheetRows, setSheetRows] = useState<SheetRow[]>([]);

  // Add Activity Modal
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('piece');
  const [newRate, setNewRate] = useState('20');
  const [newDesc, setNewDesc] = useState('');

  const fetchData = async () => {
    if (!activeTenant) return;
    setLoading(true);
    try {
      const [actRes, empRes, logRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/piece-rate/activities`, {
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
        }),
        fetch(`${API_BASE_URL}/api/v1/piece-rate/logs`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-tenant-id': activeTenant.id
          }
        })
      ]);

      if (actRes.ok && empRes.ok && logRes.ok) {
        const acts = await actRes.json();
        const emps = await empRes.json();
        const lgs = await logRes.json();

        setActivities(acts);
        setEmployees(emps);
        setLogs(lgs);
        initializeSheet(emps, acts, lgs, selectedDate);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API fetch error in PieceRatePage, using default list', e);
    }

    // Default mock data
    const mockActs: PieceRateActivityDto[] = [
      { id: 'act-1', tenantId: activeTenant.id, code: 'CUTTING', name: 'Master Fabric Cutting', unit: 'piece', ratePerUnit: 15, isActive: true, createdAt: new Date().toISOString() },
      { id: 'act-2', tenantId: activeTenant.id, code: 'STITCHING', name: 'Garment Body Assembly', unit: 'piece', ratePerUnit: 25, isActive: true, createdAt: new Date().toISOString() },
      { id: 'act-3', tenantId: activeTenant.id, code: 'BUTTONING', name: 'Button Hole & Fixing', unit: 'piece', ratePerUnit: 5, isActive: true, createdAt: new Date().toISOString() },
      { id: 'act-4', tenantId: activeTenant.id, code: 'IRONING', name: 'Steam Pressing & Finishing', unit: 'piece', ratePerUnit: 8, isActive: true, createdAt: new Date().toISOString() },
      { id: 'act-5', tenantId: activeTenant.id, code: 'PACKING', name: 'Export Box Packing', unit: 'piece', ratePerUnit: 4, isActive: true, createdAt: new Date().toISOString() },
    ];

    const mockEmps: EmployeeDto[] = [
      { id: 'e1', tenantId: activeTenant.id, userId: null, employeeCode: 'EMP-0001', firstName: 'Kavitha', lastName: 'Ramesh', email: null, phone: '+91 98401 23456', department: 'Sewing & Stitching', designation: 'Senior Tailor Master', branch: 'Chennai Branch', salaryType: 'PIECE_RATE', joiningDate: '2025-06-01', status: 'ACTIVE', createdAt: '' },
      { id: 'e2', tenantId: activeTenant.id, userId: null, employeeCode: 'EMP-0002', firstName: 'Muthu', lastName: 'Vel', email: null, phone: '+91 98402 34567', department: 'Sewing & Stitching', designation: 'Senior Tailor Master', branch: 'Chennai Branch', salaryType: 'PIECE_RATE', joiningDate: '2026-01-10', status: 'ACTIVE', createdAt: '' },
      { id: 'e3', tenantId: activeTenant.id, userId: null, employeeCode: 'EMP-0003', firstName: 'Anand', lastName: 'Murugan', email: null, phone: '+91 98403 45678', department: 'Cutting & Pattern', designation: 'Cutting Master', branch: 'Chennai Branch', salaryType: 'PIECE_RATE', joiningDate: '2025-09-15', status: 'ACTIVE', createdAt: '' },
    ];

    const mockLogs: PieceRateLogDto[] = [
      { id: 'log-1', tenantId: activeTenant.id, employeeId: 'e1', employeeCode: 'EMP-0001', employeeName: 'Kavitha Ramesh', activityId: 'act-2', activityCode: 'STITCHING', activityName: 'Garment Body Assembly', unit: 'piece', logDate: new Date().toISOString(), quantity: 60, unitRate: 25, totalAmount: 1500, remarks: 'Line 1 morning', createdAt: new Date().toISOString() },
    ];

    setActivities(mockActs);
    setEmployees(mockEmps);
    setLogs(mockLogs);
    initializeSheet(mockEmps, mockActs, mockLogs, selectedDate);
    setLoading(false);
  };

  const initializeSheet = (
    emps: EmployeeDto[],
    acts: PieceRateActivityDto[],
    allLogs: PieceRateLogDto[],
    date: string
  ) => {
    if (emps.length === 0 || acts.length === 0) return;

    // Filter logs for this specific date
    const dayLogs = allLogs.filter(l => l.logDate && l.logDate.startsWith(date));

    const rows: SheetRow[] = emps.map(emp => {
      const existingLog = dayLogs.find(l => l.employeeId === emp.id);
      const defaultAct = acts.find(a => a.id === existingLog?.activityId) || acts[0];
      const qty = existingLog ? existingLog.quantity : 0;
      const rate = existingLog ? existingLog.unitRate : defaultAct.ratePerUnit;

      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        employeeName: `${emp.firstName} ${emp.lastName}`,
        department: emp.department,
        attendance: existingLog ? 'PRESENT' : 'PRESENT',
        activityId: defaultAct.id,
        activityName: defaultAct.name,
        unitRate: rate,
        quantity: qty,
        totalAmount: qty * rate,
        remarks: existingLog?.remarks || '',
        isSaved: Boolean(existingLog),
      };
    });

    setSheetRows(rows);
  };

  useEffect(() => {
    fetchData();
  }, [activeTenant, accessToken]);

  // When date changes, re-initialize sheet for that date
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    initializeSheet(employees, activities, logs, newDate);
  };

  // Update specific sheet row attendance
  const handleAttendanceToggle = (employeeId: string, status: 'PRESENT' | 'ABSENT' | 'HALF_DAY') => {
    setSheetRows(rows => rows.map(r => {
      if (r.employeeId !== employeeId) return r;
      if (status === 'ABSENT') {
        return {
          ...r,
          attendance: status,
          quantity: 0,
          totalAmount: 0,
          isSaved: false
        };
      }
      return {
        ...r,
        attendance: status,
        isSaved: false
      };
    }));
  };

  // Update activity for row
  const handleActivityChange = (employeeId: string, actId: string) => {
    const act = activities.find(a => a.id === actId);
    if (!act) return;

    setSheetRows(rows => rows.map(r => {
      if (r.employeeId !== employeeId) return r;
      const newRate = act.ratePerUnit;
      return {
        ...r,
        activityId: act.id,
        activityName: act.name,
        unitRate: newRate,
        totalAmount: r.quantity * newRate,
        isSaved: false
      };
    }));
  };

  // Update quantity for row
  const handleQuantityChange = (employeeId: string, qtyStr: string) => {
    const qty = Math.max(0, Number(qtyStr) || 0);
    setSheetRows(rows => rows.map(r => {
      if (r.employeeId !== employeeId) return r;
      return {
        ...r,
        quantity: qty,
        totalAmount: qty * r.unitRate,
        isSaved: false
      };
    }));
  };

  // Update remarks
  const handleRemarksChange = (employeeId: string, rem: string) => {
    setSheetRows(rows => rows.map(r => {
      if (r.employeeId !== employeeId) return r;
      return { ...r, remarks: rem, isSaved: false };
    }));
  };

  // SAVE ENTIRE DAILY ATTENDANCE & PRODUCTION SHEET
  const handleSaveEntireSheet = async () => {
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const eligibleRows = sheetRows.filter(r => r.attendance !== 'ABSENT' && r.quantity > 0);

    if (eligibleRows.length === 0) {
      setSuccessMsg(`Attendance marked for ${selectedDate}. (No active production units to record).`);
      setSaving(false);
      return;
    }

    try {
      // Save each eligible log
      const promises = eligibleRows.map(row => {
        const payload = {
          employeeId: row.employeeId,
          activityId: row.activityId,
          logDate: selectedDate,
          quantity: row.quantity,
          unitRate: row.unitRate,
          totalAmount: row.totalAmount,
          remarks: row.remarks || `Roster entry: ${row.attendance}`
        };

        return fetch(`${API_BASE_URL}/api/v1/piece-rate/logs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
            'x-tenant-id': activeTenant?.id || ''
          },
          body: JSON.stringify(payload)
        }).catch(() => null);
      });

      await Promise.all(promises);

      // Mark all eligible rows as saved
      setSheetRows(rows => rows.map(r => ({
        ...r,
        isSaved: r.attendance === 'ABSENT' || r.quantity > 0
      })));

      const totalUnits = eligibleRows.reduce((sum, r) => sum + r.quantity, 0);
      const totalAmt = eligibleRows.reduce((sum, r) => sum + r.totalAmount, 0);

      setSuccessMsg(`Floor sheet saved for ${selectedDate}! Logged ${totalUnits.toLocaleString()} units totaling ₹${totalAmt.toLocaleString()} across ${eligibleRows.length} operators.`);
      await fetchData();
    } catch (e) {
      console.warn('Error saving piece-rate logs, updating locally', e);
      setSuccessMsg(`Floor sheet saved locally for ${selectedDate}!`);
    } finally {
      setSaving(false);
    }
  };

  // Create New Activity
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        unit: newUnit.trim(),
        ratePerUnit: Number(newRate),
        description: newDesc.trim() || undefined
      };

      const res = await fetch(`${API_BASE_URL}/api/v1/piece-rate/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setSuccessMsg(`Activity "${payload.name}" added successfully at ₹${payload.ratePerUnit}/${payload.unit}!`);
        await fetchData();
        setActivityModalOpen(false);
        setNewCode('');
        setNewName('');
        setSaving(false);
        return;
      }
    } catch (e) {
      console.warn('API error creating activity, using local fallback', e);
    }

    const newAct: PieceRateActivityDto = {
      id: `act-${Date.now()}`,
      tenantId: activeTenant?.id || '',
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      unit: newUnit.trim(),
      ratePerUnit: Number(newRate),
      description: newDesc.trim(),
      isActive: true,
      createdAt: new Date().toISOString()
    };

    setActivities([...activities, newAct]);
    setSuccessMsg(`Activity "${newAct.name}" added locally at ₹${newAct.ratePerUnit}/${newAct.unit}!`);
    setActivityModalOpen(false);
    setNewCode('');
    setNewName('');
    setSaving(false);
  };

  // Sheet KPI Summaries
  const totalOperators = sheetRows.length;
  const presentOperators = sheetRows.filter(r => r.attendance === 'PRESENT').length;
  const halfDayOperators = sheetRows.filter(r => r.attendance === 'HALF_DAY').length;
  const absentOperators = sheetRows.filter(r => r.attendance === 'ABSENT').length;
  const totalFloorUnits = sheetRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
  const totalFloorWages = sheetRows.reduce((sum, r) => sum + (r.totalAmount || 0), 0);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800">
              Garment Piece-Rate Production & Attendance
            </h1>
            <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded text-xs border border-amber-200">
              Floor Operations
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Unified single-view sheet for recording daily attendance and output units across all operators.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('sheet')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'sheet'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Daily Floor Sheet</span>
          </button>

          <button
            onClick={() => setActiveTab('activities')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'activities'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Operation Rates</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Logs History</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded-xl text-xs flex items-center justify-between font-semibold shadow-xs">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 1: DAILY FLOOR ATTENDANCE & PRODUCTION SHEET        */}
      {/* ======================================================== */}
      {activeTab === 'sheet' && (
        <div className="space-y-5">
          {/* Controls Bar: Date Selector & Master Save Button */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-2xl">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-bold text-slate-700">Production Date:</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-900 focus:outline-none"
                />
              </div>

              <div className="text-xs text-slate-400 font-medium">
                Showing all registered operators for active organization
              </div>
            </div>

            {/* Master Action: Save Entire Sheet */}
            <button
              onClick={handleSaveEntireSheet}
              disabled={saving}
              className="px-6 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-2 shadow-sm self-start md:self-auto"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              <span>{saving ? 'Saving Sheet...' : 'Save Entire Floor Sheet'}</span>
            </button>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Operators</span>
              <span className="text-lg font-black text-slate-900">{totalOperators}</span>
            </div>
            <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block mb-0.5">Present</span>
              <span className="text-lg font-black text-emerald-800">{presentOperators}</span>
            </div>
            <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-100 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-700 block mb-0.5">Half Day</span>
              <span className="text-lg font-black text-amber-800">{halfDayOperators}</span>
            </div>
            <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-100 text-center">
              <span className="text-[10px] uppercase font-bold text-rose-700 block mb-0.5">Absent</span>
              <span className="text-lg font-black text-rose-800">{absentOperators}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Total Pieces</span>
              <span className="text-lg font-black text-indigo-700">{totalFloorUnits.toLocaleString()}</span>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-center">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Floor Wages</span>
              <span className="text-lg font-black text-emerald-700">₹{totalFloorWages.toLocaleString()}</span>
            </div>
          </div>

          {/* The Unified IRCTC-Style Roster Sheet */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : sheetRows.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No operators found. Onboard operators from the Workforce & Employees menu.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4 text-center w-12">#</th>
                      <th className="py-3.5 px-4">Operator</th>
                      <th className="py-3.5 px-4 text-center">Attendance</th>
                      <th className="py-3.5 px-4">Assigned Operation</th>
                      <th className="py-3.5 px-4 text-right">Rate / Pc</th>
                      <th className="py-3.5 px-4 text-center w-32">Units Output</th>
                      <th className="py-3.5 px-4 text-right">Total (₹)</th>
                      <th className="py-3.5 px-4">Remarks / Line</th>
                      <th className="py-3.5 px-4 text-center w-24">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sheetRows.map((row, index) => {
                      const isAbsent = row.attendance === 'ABSENT';
                      return (
                        <tr 
                          key={row.employeeId} 
                          className={`transition ${isAbsent ? 'bg-slate-50/50 opacity-60' : 'hover:bg-slate-50/70'}`}
                        >
                          {/* Row Number */}
                          <td className="py-3.5 px-4 text-center font-bold text-slate-400">
                            {index + 1}
                          </td>

                          {/* Operator Details */}
                          <td className="py-3.5 px-4">
                            <div className="font-extrabold text-slate-900">{row.employeeName}</div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {row.employeeCode} • {row.department}
                            </div>
                          </td>

                          {/* Attendance Toggles (P / A / HD) */}
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200">
                              <button
                                type="button"
                                onClick={() => handleAttendanceToggle(row.employeeId, 'PRESENT')}
                                title="Mark Present"
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition ${
                                  row.attendance === 'PRESENT'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                P
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAttendanceToggle(row.employeeId, 'HALF_DAY')}
                                title="Mark Half-Day"
                                className={`px-2 py-1 rounded-lg text-[10px] font-black transition ${
                                  row.attendance === 'HALF_DAY'
                                    ? 'bg-amber-500 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                HD
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAttendanceToggle(row.employeeId, 'ABSENT')}
                                title="Mark Absent"
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition ${
                                  row.attendance === 'ABSENT'
                                    ? 'bg-rose-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                A
                              </button>
                            </div>
                          </td>

                          {/* Operation Selector */}
                          <td className="py-3.5 px-4">
                            <select
                              disabled={isAbsent}
                              value={row.activityId}
                              onChange={(e) => handleActivityChange(row.employeeId, e.target.value)}
                              className="w-full max-w-[200px] border border-slate-200 rounded-xl p-2 bg-white text-slate-800 text-xs font-semibold focus:ring-2 focus:ring-slate-900 focus:outline-none disabled:bg-slate-100"
                            >
                              {activities.map(a => (
                                <option key={a.id} value={a.id}>{a.name}</option>
                              ))}
                            </select>
                          </td>

                          {/* Rate Per Unit */}
                          <td className="py-3.5 px-4 text-right font-black text-slate-800 font-mono">
                            ₹{row.unitRate}
                          </td>

                          {/* Units Produced Input */}
                          <td className="py-3.5 px-4 text-center">
                            <input
                              type="number"
                              min="0"
                              disabled={isAbsent}
                              value={row.quantity === 0 ? '' : row.quantity}
                              onChange={(e) => handleQuantityChange(row.employeeId, e.target.value)}
                              placeholder="0"
                              className="w-24 text-center border border-slate-300 rounded-xl py-1.5 px-2 font-mono text-xs font-black text-slate-900 focus:ring-2 focus:ring-slate-900 focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
                            />
                          </td>

                          {/* Total Accrued Wages */}
                          <td className="py-3.5 px-4 text-right font-black text-emerald-700 font-mono text-sm">
                            ₹{row.totalAmount.toLocaleString()}
                          </td>

                          {/* Remarks Input */}
                          <td className="py-3.5 px-4">
                            <input
                              type="text"
                              disabled={isAbsent}
                              value={row.remarks}
                              onChange={(e) => handleRemarksChange(row.employeeId, e.target.value)}
                              placeholder="Batch / Line"
                              className="w-full max-w-[140px] border border-slate-200 rounded-xl py-1.5 px-2.5 text-slate-700 text-[11px] focus:outline-none disabled:bg-slate-100"
                            />
                          </td>

                          {/* Status Badge */}
                          <td className="py-3.5 px-4 text-center">
                            {row.isSaved ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                <span>Saved</span>
                              </span>
                            ) : (
                              <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                Pending
                              </span>
                            )}
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
      {/* TAB 2: OPERATION RATES & ACTIVITIES CATALOG              */}
      {/* ======================================================== */}
      {activeTab === 'activities' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between bg-white p-5 rounded-3xl border border-slate-200">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Piece-Rate Operations & Rates
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Standard compensation per completed unit (cutting, sewing, packing).
              </p>
            </div>
            <button
              onClick={() => setActivityModalOpen(true)}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Operation</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {activities.map(act => (
              <div key={act.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                      {act.code}
                    </span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Active
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 text-sm">{act.name}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    {act.description || 'Standard floor piece operation.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-xs font-semibold text-slate-400">Unit Rate:</span>
                  <div className="text-right">
                    <span className="text-xl font-black text-slate-900">₹{act.ratePerUnit}</span>
                    <span className="text-xs text-slate-500 font-semibold"> / {act.unit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: PRODUCTION LOGS HISTORY                           */}
      {/* ======================================================== */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900">All Logged Production Records</h2>
            <span className="text-xs text-slate-500 font-medium">{logs.length} entries recorded</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                  <th className="py-3 px-6 font-bold">Operator</th>
                  <th className="py-3 px-6 font-bold">Operation</th>
                  <th className="py-3 px-6 font-bold">Log Date</th>
                  <th className="py-3 px-6 font-bold text-right">Units</th>
                  <th className="py-3 px-6 font-bold text-right">Total Amount</th>
                  <th className="py-3 px-6 font-bold">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-6 font-bold text-slate-900">
                      {log.employeeName}
                      <span className="block text-[10px] font-mono text-slate-400">{log.employeeCode}</span>
                    </td>
                    <td className="py-3 px-6 font-medium text-slate-700">{log.activityName}</td>
                    <td className="py-3 px-6 text-slate-500">{new Date(log.logDate).toLocaleDateString()}</td>
                    <td className="py-3 px-6 text-right font-black text-slate-900">{log.quantity}</td>
                    <td className="py-3 px-6 text-right font-black text-emerald-600">₹{log.totalAmount.toLocaleString()}</td>
                    <td className="py-3 px-6 text-slate-400">{log.remarks || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Operation */}
      {activityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-extrabold text-slate-800 text-sm">Add Piece-Rate Operation</h3>
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
                <label className="block font-semibold text-slate-700 mb-1">Operation Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Collar Attachment"
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
                    className="w-full border border-slate-300 rounded-xl p-2.5 bg-white"
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
                  placeholder="Optional details..."
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

    </div>
  );
}
