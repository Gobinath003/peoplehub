'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { 
  Scissors, Plus, Calendar, Check, X, 
  Trash2, Filter, Search, User, Layers, 
  Award, TrendingUp, AlertCircle, Sparkles, Tag 
} from 'lucide-react';
import { 
  PieceRateActivityDto, 
  PieceRateLogDto, 
  EmployeeDto 
} from '@people-hub/shared-types';

export default function PieceRatePage() {
  const { activeTenant, accessToken } = useApp();
  const [activeTab, setActiveTab] = useState<'entry' | 'history' | 'activities'>('entry');
  
  const [activities, setActivities] = useState<PieceRateActivityDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [logs, setLogs] = useState<PieceRateLogDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Daily Entry Form State
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState('50');
  const [remarks, setRemarks] = useState('');

  // New Activity Modal State
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('piece');
  const [newRate, setNewRate] = useState('15');
  const [newDesc, setNewDesc] = useState('');

  // History Filters
  const [filterEmpId, setFilterEmpId] = useState('ALL');
  const [filterActivityId, setFilterActivityId] = useState('ALL');

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

        if (emps.length > 0 && !selectedEmpId) {
          setSelectedEmpId(emps[0].id);
        }
        if (acts.length > 0 && !selectedActivityId) {
          setSelectedActivityId(acts[0].id);
        }

        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API fetch error in PieceRatePage, using mock data', e);
    }

    // Mock initial data
    const mockActs: PieceRateActivityDto[] = [
      { id: 'act-1', tenantId: activeTenant.id, code: 'CUTTING', name: 'Master Cutting', unit: 'piece', ratePerUnit: 15, isActive: true, createdAt: new Date().toISOString() },
      { id: 'act-2', tenantId: activeTenant.id, code: 'STITCHING', name: 'Garment Stitching', unit: 'piece', ratePerUnit: 25, isActive: true, createdAt: new Date().toISOString() },
      { id: 'act-3', tenantId: activeTenant.id, code: 'BUTTONING', name: 'Button Hole & Fixing', unit: 'piece', ratePerUnit: 5, isActive: true, createdAt: new Date().toISOString() },
      { id: 'act-4', tenantId: activeTenant.id, code: 'IRONING', name: 'Steam Pressing & Ironing', unit: 'piece', ratePerUnit: 8, isActive: true, createdAt: new Date().toISOString() },
      { id: 'act-5', tenantId: activeTenant.id, code: 'PACKING', name: 'Inspection & Box Packing', unit: 'piece', ratePerUnit: 4, isActive: true, createdAt: new Date().toISOString() },
    ];

    const mockEmps: EmployeeDto[] = [
      { id: 'e1', tenantId: activeTenant.id, userId: null, employeeCode: 'EMP-101', firstName: 'Kavitha', lastName: 'Ramesh', email: 'kavitha@garments.com', phone: null, department: 'Sewing', designation: 'Senior Tailor Master', branch: 'Chennai Branch', salaryType: 'PIECE_RATE', joiningDate: '2025-06-01', status: 'ACTIVE', createdAt: '' },
      { id: 'e2', tenantId: activeTenant.id, userId: null, employeeCode: 'EMP-102', firstName: 'Anand', lastName: 'Murugan', email: 'anand@garments.com', phone: null, department: 'Cutting', designation: 'Cutting Master', branch: 'Chennai Branch', salaryType: 'PIECE_RATE', joiningDate: '2025-09-15', status: 'ACTIVE', createdAt: '' },
    ];

    const mockLogs: PieceRateLogDto[] = [
      { id: 'log-1', tenantId: activeTenant.id, employeeId: 'e2', employeeCode: 'EMP-102', employeeName: 'Anand Murugan', activityId: 'act-1', activityCode: 'CUTTING', activityName: 'Master Cutting', unit: 'piece', logDate: new Date().toISOString(), quantity: 50, unitRate: 15, totalAmount: 750, remarks: 'Order #301 batch A', createdAt: new Date().toISOString() },
      { id: 'log-2', tenantId: activeTenant.id, employeeId: 'e1', employeeCode: 'EMP-101', employeeName: 'Kavitha Ramesh', activityId: 'act-2', activityCode: 'STITCHING', activityName: 'Garment Stitching', unit: 'piece', logDate: new Date().toISOString(), quantity: 30, unitRate: 25, totalAmount: 750, remarks: 'Order #301 body assembly', createdAt: new Date().toISOString() },
    ];

    setActivities(mockActs);
    setEmployees(mockEmps);
    setLogs(mockLogs);
    if (!selectedEmpId && mockEmps.length > 0) setSelectedEmpId(mockEmps[0].id);
    if (!selectedActivityId && mockActs.length > 0) setSelectedActivityId(mockActs[0].id);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeTenant, accessToken]);

  const activeActivity = activities.find(a => a.id === selectedActivityId);
  const currentRate = activeActivity ? activeActivity.ratePerUnit : 0;
  const computedTotal = (Number(quantity) || 0) * currentRate;

  const handleRecordDailyWork = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId || !selectedActivityId) return;
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      employeeId: selectedEmpId,
      activityId: selectedActivityId,
      logDate,
      quantity: Number(quantity),
      remarks: remarks.trim()
    };

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/piece-rate/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newLog = await res.json();
        setSuccessMsg(`Recorded ${quantity} units of ${activeActivity?.name} (₹${(Number(quantity) * currentRate).toLocaleString()})!`);
        await fetchData();
        setRemarks('');
        setSaving(false);
        return;
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to record daily log');
        setSaving(false);
        return;
      }
    } catch (e) {
      console.warn('API error, saving locally', e);
    }

    // Local fallback
    const emp = employees.find(e => e.id === selectedEmpId);
    const newLocalLog: PieceRateLogDto = {
      id: `local-log-${Date.now()}`,
      tenantId: activeTenant?.id || '',
      employeeId: selectedEmpId,
      employeeCode: emp?.employeeCode,
      employeeName: `${emp?.firstName} ${emp?.lastName}`,
      activityId: selectedActivityId,
      activityCode: activeActivity?.code,
      activityName: activeActivity?.name,
      unit: activeActivity?.unit || 'piece',
      logDate: new Date(logDate).toISOString(),
      quantity: Number(quantity),
      unitRate: currentRate,
      totalAmount: computedTotal,
      remarks: remarks || null,
      createdAt: new Date().toISOString()
    };

    setLogs([newLocalLog, ...logs]);
    setSuccessMsg(`Recorded ${quantity} units of ${activeActivity?.name} for ${emp?.firstName} (₹${computedTotal.toLocaleString()})!`);
    setRemarks('');
    setSaving(false);
  };

  const handleDeleteLog = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/piece-rate/logs/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        }
      });
      if (res.ok) {
        setSuccessMsg('Production entry deleted successfully');
        await fetchData();
        return;
      }
    } catch (e) {
      console.warn('API delete error, deleting locally', e);
    }

    setLogs(logs.filter(l => l.id !== id));
    setSuccessMsg('Production entry removed');
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      unit: newUnit.trim().toLowerCase(),
      ratePerUnit: Number(newRate),
      description: newDesc.trim()
    };

    try {
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
        setSuccessMsg(`Skill/Activity "${payload.name}" (@ ₹${payload.ratePerUnit}/${payload.unit}) created!`);
        await fetchData();
        setActivityModalOpen(false);
        setNewCode('');
        setNewName('');
        setNewDesc('');
        setSaving(false);
        return;
      } else {
        const err = await res.json();
        setErrorMsg(err.message || 'Failed to create activity');
        setSaving(false);
        return;
      }
    } catch (e) {
      console.warn('API create activity error, adding locally', e);
    }

    const localAct: PieceRateActivityDto = {
      id: `act-local-${Date.now()}`,
      tenantId: activeTenant?.id || '',
      code: payload.code,
      name: payload.name,
      unit: payload.unit,
      ratePerUnit: payload.ratePerUnit,
      description: payload.description,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    setActivities([...activities, localAct]);
    setSuccessMsg(`Created operation ${payload.name} locally`);
    setActivityModalOpen(false);
    setSaving(false);
  };

  // Filtered Logs
  const filteredLogs = logs.filter(l => {
    const matchEmp = filterEmpId === 'ALL' || l.employeeId === filterEmpId;
    const matchAct = filterActivityId === 'ALL' || l.activityId === filterActivityId;
    return matchEmp && matchAct;
  });

  const totalUnitsSum = filteredLogs.reduce((acc, l) => acc + l.quantity, 0);
  const totalAmountSum = filteredLogs.reduce((acc, l) => acc + l.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-800">Garment Piece-Rate Production</h1>
            <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded text-xs border border-amber-200">
              Daily Skill Work Logging
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Log daily output for cutting, stitching, and stretching activities. Earnings automatically feed into month-end payroll.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-200/80 p-1 rounded-xl text-xs font-bold self-start md:self-auto">
          <button
            onClick={() => setActiveTab('entry')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'entry' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Daily Work Entry
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'history' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Production Log Sheet ({logs.length})
          </button>
          <button
            onClick={() => setActiveTab('activities')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'activities' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'
            }`}
          >
            Skill Rates Master ({activities.length})
          </button>
        </div>
      </div>

      {/* Notifications */}
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

      {/* TAB 1: DAILY ACTIVITY ENTRY */}
      {activeTab === 'entry' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Entry Form */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Scissors className="w-4 h-4 text-primary-600" />
                <span>Record Daily Worker Output</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Enter end-of-day accounts reported by workers</p>
            </div>

            <form onSubmit={handleRecordDailyWork} className="space-y-4 text-xs">
              {/* Select Worker */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Worker / Master *</label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-primary-500 focus:outline-none font-medium"
                >
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode} — {emp.firstName} {emp.lastName} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Work Date *</label>
                <input
                  type="date"
                  required
                  value={logDate}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              {/* Activity / Skill Type */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operation / Skill *</label>
                <select
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 focus:ring-2 focus:ring-primary-500 focus:outline-none font-medium"
                >
                  {activities.map(act => (
                    <option key={act.id} value={act.id}>
                      {act.name} (₹{act.ratePerUnit} / {act.unit})
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Units / Quantity Completed ({activeActivity?.unit || 'pieces'}) *
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="e.g. 50"
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-mono text-slate-800 focus:ring-2 focus:ring-primary-500 focus:outline-none font-bold text-sm"
                />
              </div>

              {/* Real-time Calculation Badge */}
              <div className="p-4 bg-primary-50 border border-primary-200 rounded-xl space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Unit Rate:</span>
                  <span className="font-mono font-bold text-slate-800">₹{currentRate} / {activeActivity?.unit || 'piece'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Output Volume:</span>
                  <span className="font-mono font-bold text-slate-800">{quantity || 0} {activeActivity?.unit || 'pieces'}</span>
                </div>
                <div className="flex justify-between border-t border-primary-200 pt-1.5 text-primary-950 font-black text-sm">
                  <span>Total Earned:</span>
                  <span className="font-mono text-base text-primary-700">₹{computedTotal.toLocaleString()}</span>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Batch / Order Notes</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="e.g. Lot #120, Summer shirts"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs py-3 rounded-xl transition shadow flex items-center justify-center gap-2"
              >
                {saving ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>Record Daily Output</span>
              </button>
            </form>
          </div>

          {/* Today's Log Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs bg-slate-50/50">
              <div>
                <span className="font-bold text-slate-800">Recent Daily Production Entries</span>
                <p className="text-[11px] text-slate-400">All activity records logged by workers</p>
              </div>
              <span className="font-bold text-primary-700 font-mono bg-primary-50 px-2 py-0.5 rounded text-[11px]">
                {logs.length} Total Logs
              </span>
            </div>

            {loading ? (
              <div className="p-12 flex justify-center">
                <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs italic">
                No production logs recorded yet. Use the form on the left to submit daily worker accounts.
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Worker</th>
                      <th className="py-3 px-4">Operation</th>
                      <th className="py-3 px-4">Units</th>
                      <th className="py-3 px-4">Rate</th>
                      <th className="py-3 px-4">Total Earned</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.slice(0, 10).map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 font-mono text-slate-600 text-[11px]">
                          {log.logDate.split('T')[0]}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{log.employeeName}</div>
                          <div className="font-mono text-[10px] text-slate-400">{log.employeeCode}</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded text-[11px]">
                            {log.activityName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {log.quantity} <span className="text-[10px] text-slate-400 font-normal">{log.unit || 'pcs'}</span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          ₹{log.unitRate}
                        </td>
                        <td className="py-3 px-4 font-mono font-black text-emerald-700">
                          ₹{log.totalAmount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-slate-400 hover:text-red-600 p-1 transition"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTION LOG SHEET */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Units Completed</span>
                <div className="text-2xl font-black text-slate-800 mt-1 font-mono">{totalUnitsSum.toLocaleString()} Pieces</div>
              </div>
              <div className="p-3 bg-amber-100 text-amber-600 rounded-xl">
                <Scissors className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Piece Wages Earned</span>
                <div className="text-2xl font-black text-emerald-700 mt-1 font-mono">₹{totalAmountSum.toLocaleString()}</div>
              </div>
              <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Skills</span>
                <div className="text-2xl font-black text-purple-700 mt-1">{activities.length} Operations</div>
              </div>
              <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                <Award className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="font-semibold text-slate-500">Filter Worker:</span>
              <select
                value={filterEmpId}
                onChange={(e) => setFilterEmpId(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium"
              >
                <option value="ALL">All Workers</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <span className="font-semibold text-slate-500">Filter Operation:</span>
              <select
                value={filterActivityId}
                onChange={(e) => setFilterActivityId(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 font-medium"
              >
                <option value="ALL">All Operations</option>
                {activities.map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Full Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">Date</th>
                    <th className="py-3.5 px-6">Worker</th>
                    <th className="py-3.5 px-6">Operation / Skill</th>
                    <th className="py-3.5 px-6">Completed Output</th>
                    <th className="py-3.5 px-6">Unit Rate</th>
                    <th className="py-3.5 px-6">Total Earned</th>
                    <th className="py-3.5 px-6">Notes</th>
                    <th className="py-3.5 px-6 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredLogs.map(l => (
                    <tr key={l.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-4 px-6 font-mono text-slate-600">
                        {l.logDate.split('T')[0]}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-800">{l.employeeName}</div>
                        <div className="text-slate-400 text-[11px] font-mono">{l.employeeCode}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded text-[11px] border border-purple-200">
                          {l.activityName}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-800">
                        {l.quantity} <span className="text-[10px] text-slate-400 font-normal">{l.unit || 'pcs'}</span>
                      </td>
                      <td className="py-4 px-6 font-mono text-slate-600">
                        ₹{l.unitRate}
                      </td>
                      <td className="py-4 px-6 font-mono font-black text-emerald-700 text-sm">
                        ₹{l.totalAmount.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 text-slate-500 italic">
                        {l.remarks || '—'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDeleteLog(l.id)}
                          className="text-slate-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SKILL & ACTIVITY RATES MASTER */}
      {activeTab === 'activities' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600">Configured Garment Skills & Unit Price Card</span>
            <button
              onClick={() => setActivityModalOpen(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition shadow flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Skill / Operation</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activities.map(act => (
              <div key={act.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 bg-purple-50 text-purple-700 rounded-xl">
                        <Tag className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800 text-sm">{act.name}</h3>
                        <span className="font-mono text-[10px] text-slate-400 uppercase">{act.code}</span>
                      </div>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                      Active
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-3 leading-relaxed">
                    {act.description || 'Standard garment piece-rate production operation.'}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Unit Type</span>
                    <span className="font-semibold text-slate-700 capitalize text-xs">{act.unit}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Rate / Unit</span>
                    <span className="text-lg font-black text-emerald-700 font-mono">₹{act.ratePerUnit}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW ACTIVITY */}
      {activityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-primary-100 text-primary-700 rounded-lg">
                  <Scissors className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Add Operation / Skill Rate</h3>
                  <p className="text-[11px] text-slate-400">Define operation code, unit type, and rate</p>
                </div>
              </div>
              <button onClick={() => setActivityModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
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
                  placeholder="e.g. OVERLOCK"
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Operation / Skill Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Overlock Stitching"
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit Type *</label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  >
                    <option value="piece">piece</option>
                    <option value="dozen">dozen</option>
                    <option value="meter">meter</option>
                    <option value="bundle">bundle</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rate / Unit (₹) *</label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    value={newRate}
                    onChange={(e) => setNewRate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 font-mono text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Description of operation quality requirements..."
                  className="w-full border border-slate-300 rounded-lg p-2 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActivityModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-600 rounded-xl hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold flex items-center gap-2 shadow"
                >
                  <Plus className="w-4 h-4" />
                  <span>Save Operation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
