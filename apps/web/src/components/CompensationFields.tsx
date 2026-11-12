'use client';

import React from 'react';
import { DollarSign, Clock, Scissors, Banknote, AlertCircle } from 'lucide-react';
import { SalaryType, SalaryStructureDto } from '@people-hub/shared-types';

export interface CompensationValues {
  basicSalary: string;
  hra: string;
  specialAllowance: string;
  conveyanceAllowance: string;
  hourlyRate: string;
  dailyRate: string;
  standardHours: string;
  overtimeMultiplier: string;
  pfDeduction: string;
  taxDeduction: string;
}

export const SALARY_MODEL_DEFINITIONS = [
  {
    code: SalaryType.MONTHLY_FIXED,
    label: 'Monthly Fixed Salary',
    shortLabel: 'Monthly Fixed',
    desc: 'Fixed monthly salary with allowances and statutory deductions (IT, Corporate).',
    badgeClass: 'border-primary-500 bg-primary-50/70 text-primary-950 ring-2 ring-primary-500/20',
    iconBgClass: 'bg-primary-600 text-white',
    icon: DollarSign,
  },
  {
    code: SalaryType.HOURLY,
    label: 'Hourly Rate Salary',
    shortLabel: 'Hourly Rate',
    desc: 'Pay computed from hourly rate × verified regular & overtime hours.',
    badgeClass: 'border-indigo-500 bg-indigo-50/70 text-indigo-950 ring-2 ring-indigo-500/20',
    iconBgClass: 'bg-indigo-600 text-white',
    icon: Clock,
  },
  {
    code: SalaryType.PIECE_RATE,
    label: 'Piece-Rate Output Salary',
    shortLabel: 'Piece-Rate Output',
    desc: 'Computed from daily verified garment/production unit output.',
    badgeClass: 'border-amber-500 bg-amber-50/70 text-amber-950 ring-2 ring-amber-500/20',
    iconBgClass: 'bg-amber-600 text-white',
    icon: Scissors,
  },
  {
    code: SalaryType.DAILY_WAGE,
    label: 'Daily Wage Salary',
    shortLabel: 'Daily Wage',
    desc: 'Fixed per-day wage rate multiplied by working days in the pay cycle.',
    badgeClass: 'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-500/20',
    iconBgClass: 'bg-emerald-600 text-white',
    icon: Banknote,
  },
] as const;

export function CompensationSummaryCell({
  salaryType,
  salaryStructure,
}: {
  salaryType: string;
  salaryStructure?: SalaryStructureDto | null;
}) {
  if (salaryType === SalaryType.PIECE_RATE) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
        <Scissors className="w-2.5 h-2.5 text-amber-600 mr-1" />
        Piece-Rate Output
      </span>
    );
  }
  if (salaryType === SalaryType.HOURLY) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <Clock className="w-2.5 h-2.5 text-indigo-600 mr-1" />
          Hourly
        </span>
        {salaryStructure && (salaryStructure.hourlyRate || 0) > 0 && (
          <span className="font-semibold text-slate-900 text-xs">
            ₹{salaryStructure.hourlyRate!.toLocaleString()}
            <span className="text-[10px] text-slate-400 font-normal">/hr</span>
          </span>
        )}
      </div>
    );
  }
  if (salaryType === SalaryType.DAILY_WAGE) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <Banknote className="w-2.5 h-2.5 text-emerald-600 mr-1" />
          Daily Wage
        </span>
        {salaryStructure && (salaryStructure.dailyRate || 0) > 0 && (
          <span className="font-semibold text-slate-900 text-xs">
            ₹{salaryStructure.dailyRate!.toLocaleString()}
            <span className="text-[10px] text-slate-400 font-normal">/day</span>
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">
        Fixed
      </span>
      {salaryStructure && (
        <span className="font-semibold text-slate-900 text-xs">
          ₹{salaryStructure.grossSalary.toLocaleString()}
          <span className="text-[10px] text-slate-400 font-normal">/mo</span>
        </span>
      )}
    </div>
  );
}

interface CompensationFieldsProps {
  allowedTypes: string[];
  salaryType: string;
  onSalaryTypeChange: (nextType: string) => void;
  values: CompensationValues;
  onChange: (field: keyof CompensationValues, val: string) => void;
  compact?: boolean;
}

export function CompensationFields({
  allowedTypes,
  salaryType,
  onSalaryTypeChange,
  values,
  onChange,
  compact = false,
}: CompensationFieldsProps) {
  const effectiveAllowed =
    allowedTypes && allowedTypes.length > 0
      ? allowedTypes
      : [SalaryType.MONTHLY_FIXED, SalaryType.HOURLY];

  const isCurrentDisabledByTenant = Boolean(salaryType && !effectiveAllowed.includes(salaryType));
  const options = SALARY_MODEL_DEFINITIONS.filter(
    (def) => effectiveAllowed.includes(def.code) || def.code === salaryType
  );

  const estimatedHourlyGross = Math.round((Number(values.hourlyRate) || 0) * (Number(values.standardHours) || 0));
  const estimatedDailyGross = Math.round((Number(values.dailyRate) || 0) * (Number(values.standardHours) || 0));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = salaryType === opt.code;
          const legacyDisabled = !effectiveAllowed.includes(opt.code);
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => onSalaryTypeChange(opt.code)}
              className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 ${
                active
                  ? `${opt.badgeClass} shadow-xs`
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`p-2 rounded-xl mt-0.5 shrink-0 ${active ? opt.iconBgClass : 'bg-slate-100 text-slate-500'}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-bold text-xs sm:text-sm text-slate-800">{opt.label}</span>
                  {legacyDisabled && (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                      Disabled in Tenant
                    </span>
                  )}
                </div>
                {!compact && <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{opt.desc}</div>}
              </div>
            </button>
          );
        })}
      </div>

      {isCurrentDisabledByTenant && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>This employee&apos;s current salary category is currently disabled in Tenant Management. Keep as legacy or switch to an active pay model.</span>
        </div>
      )}

      {salaryType === SalaryType.PIECE_RATE && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs space-y-1.5">
          <div className="font-bold flex items-center gap-1.5 text-amber-900 text-xs">
            <Scissors className="w-4 h-4 text-amber-600" />
            <span>Piece-Rate Wage System Activated</span>
          </div>
          <p className="text-[11px] text-amber-800 leading-relaxed">
            No fixed monthly salary structure required. Earnings are computed directly from daily logged units and approved piece rates.
          </p>
        </div>
      )}

      {salaryType === SalaryType.HOURLY && (
        <div className="p-4 bg-indigo-50/50 border border-indigo-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="font-bold flex items-center gap-1.5 text-indigo-950 text-xs">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Hourly Compensation Configuration</span>
            </div>
            <span className="bg-indigo-100 text-indigo-800 border border-indigo-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              Est. Baseline: ₹{estimatedHourlyGross.toLocaleString()}/mo
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Hourly Rate (₹/hr) *</label>
              <input
                type="number"
                required
                min={1}
                step="any"
                value={values.hourlyRate}
                onChange={(e) => onChange('hourlyRate', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Baseline Hrs / Month</label>
              <input
                type="number"
                min={0}
                step="any"
                value={values.standardHours}
                onChange={(e) => onChange('standardHours', e.target.value)}
                placeholder="160 (or 0 for logs only)"
                className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">OT Multiplier (x)</label>
              <input
                type="number"
                min={1}
                step="0.25"
                value={values.overtimeMultiplier}
                onChange={(e) => onChange('overtimeMultiplier', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tax / TDS (₹)</label>
              <input
                type="number"
                min={0}
                value={values.taxDeduction}
                onChange={(e) => onChange('taxDeduction', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-indigo-800/80">
            Log actual work hours in Payroll → Hourly Timesheets. When logs exist for a pay period, payroll automatically bills logged regular + OT hours instead of baseline hours.
          </p>
        </div>
      )}

      {salaryType === SalaryType.DAILY_WAGE && (
        <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-2xl space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="font-bold flex items-center gap-1.5 text-emerald-950 text-xs">
              <Banknote className="w-4 h-4 text-emerald-600" />
              <span>Daily Wage Configuration</span>
            </div>
            <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[11px] font-bold">
              Est. Monthly: ₹{estimatedDailyGross.toLocaleString()}/mo
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Daily Wage Rate (₹/day) *</label>
              <input
                type="number"
                required
                min={1}
                step="any"
                value={values.dailyRate}
                onChange={(e) => onChange('dailyRate', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Std. Days / Month</label>
              <input
                type="number"
                min={1}
                max={31}
                value={values.standardHours}
                onChange={(e) => onChange('standardHours', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">PF Deduction (₹)</label>
              <input
                type="number"
                min={0}
                value={values.pfDeduction}
                onChange={(e) => onChange('pfDeduction', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tax / TDS (₹)</label>
              <input
                type="number"
                min={0}
                value={values.taxDeduction}
                onChange={(e) => onChange('taxDeduction', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {salaryType === SalaryType.MONTHLY_FIXED && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Basic Salary (₹) *</label>
              <input
                type="number"
                required
                value={values.basicSalary}
                onChange={(e) => onChange('basicSalary', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">HRA (₹)</label>
              <input
                type="number"
                value={values.hra}
                onChange={(e) => onChange('hra', e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
              />
            </div>
            {!compact && (
              <>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Special Allowance (₹)</label>
                  <input
                    type="number"
                    value={values.specialAllowance}
                    onChange={(e) => onChange('specialAllowance', e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Conveyance (₹)</label>
                  <input
                    type="number"
                    value={values.conveyanceAllowance}
                    onChange={(e) => onChange('conveyanceAllowance', e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                  />
                </div>
              </>
            )}
          </div>

          {!compact && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">PF Deduction (₹)</label>
                <input
                  type="number"
                  value={values.pfDeduction}
                  onChange={(e) => onChange('pfDeduction', e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tax Deduction (₹)</label>
                <input
                  type="number"
                  value={values.taxDeduction}
                  onChange={(e) => onChange('taxDeduction', e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:ring-2 focus:ring-primary-500 focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
