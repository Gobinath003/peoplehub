'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../../../context/AppContext';
import { API_BASE_URL } from '../../../../config/api';
import { Layers, ShieldCheck, ToggleLeft, ToggleRight, Check } from 'lucide-react';

interface ModuleItem {
  code: string;
  name: string;
  category: string;
  description: string;
}

export default function ModulesSettingsPage() {
  const { activeTenant, enabledModules, updateEnabledModules, accessToken } = useApp();
  const [savingCode, setSavingCode] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const modulesList: ModuleItem[] = [
    { code: 'ORGANIZATION', name: 'Organization structure', category: 'Core HRMS', description: 'Setup company profiles, business units, branches, locations, and departments.' },
    { code: 'EMPLOYEES', name: 'Employee Profiles & Lifecycle', category: 'Core HRMS', description: 'Onboard and manage employees, view lifecycle timelines, status and records.' },
    { code: 'ATTENDANCE', name: 'Attendance & Tracking', category: 'Core HRMS', description: 'Capture biometric punches, calculate working hours, compile reports.' },
    { code: 'LEAVE', name: 'Leave & Absence Management', category: 'Core HRMS', description: 'Configure leave types, process requests and carry out entitlement audits.' },
    { code: 'SHIFTS', name: 'Shift scheduling & rosters', category: 'Core HRMS', description: 'Assign shifts, manage rotations, and design complex rosters.' },
    { code: 'PAYROLL', name: 'Payroll Processing engine', category: 'Core HRMS', description: 'Calculate wages, process deductions, compute taxes, and issue payslips.' },
    { code: 'PIECE_RATE', name: 'Piece Rate Pay Roster', category: 'Garment Extension', description: 'Calculate operator wages based on garment production line counts.' },
    { code: 'TIMESHEET', name: 'Timesheet & Project billing', category: 'Consultancy Extension', description: 'Log consultants billable hours against client project codes.' },
    { code: 'DRIVER_ROSTER', name: 'Driver & Trip logs', category: 'Logistics Extension', description: 'Roster drivers, monitor trip allocations, and manage route allowances.' },
  ];

  const handleToggleModule = async (code: string) => {
    setSavingCode(code);
    setSuccessMsg(null);
    const isEnabled = !enabledModules.includes(code);

    try {
      // 1. Try backend API request
      const response = await fetch(`${API_BASE_URL}/api/v1/tenants/modules/${code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        },
        body: JSON.stringify({ isEnabled })
      });

      if (response.ok) {
        let updated;
        if (isEnabled) {
          updated = [...enabledModules, code];
        } else {
          updated = enabledModules.filter(m => m !== code);
        }
        updateEnabledModules(updated);
        setSuccessMsg(`Module ${code} updated successfully`);
        setSavingCode(null);
        return;
      }
    } catch (e) {
      console.warn('API update module state failed, updating locally only.', e);
    }

    // 2. Local State Fallback
    let updated;
    if (isEnabled) {
      updated = [...enabledModules, code];
    } else {
      updated = enabledModules.filter(m => m !== code);
    }
    updateEnabledModules(updated);
    setSuccessMsg(`Module ${code} toggled in Sandbox mode`);
    setSavingCode(null);
  };

  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  if (!activeTenant) {
    return <p className="text-slate-500 font-medium">Loading organization module settings...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">SaaS Feature Management</h1>
          <p className="text-slate-500 text-sm mt-1">Activate or deactivate HRMS features and industry extensions dynamically for {activeTenant.name}.</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded p-4 text-emerald-800 text-xs flex items-center gap-2 font-semibold">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Modules Table Layout */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
            <tr>
              <th className="px-6 py-4">Module Code</th>
              <th className="px-6 py-4">Module Details</th>
              <th className="px-6 py-4">Category</th>
              <th className="px-6 py-4 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
            {modulesList.map((mod) => {
              const isActive = enabledModules.includes(mod.code);
              const isSaving = savingCode === mod.code;
              return (
                <tr key={mod.code} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-slate-500">{mod.code}</td>
                  <td className="px-6 py-4 space-y-1">
                    <span className="font-bold text-slate-800 block text-sm">{mod.name}</span>
                    <span className="text-slate-400 leading-normal block">{mod.description}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      mod.category.includes('Extension') 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {mod.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggleModule(mod.code)}
                      disabled={isSaving}
                      className={`inline-flex items-center gap-2 focus:outline-none transition ${
                        isSaving ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {isSaving ? (
                        <span className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></span>
                      ) : isActive ? (
                        <ToggleRight className="w-10 h-10 text-primary-600 hover:text-primary-700" />
                      ) : (
                        <ToggleLeft className="w-10 h-10 text-slate-300 hover:text-slate-400" />
                      )}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
