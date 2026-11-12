import React from 'react';
import { Search, Plus, LucideIcon } from 'lucide-react';

interface EnterpriseToolbarProps {
  title?: string;
  totalCount?: number;
  tenantName?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  primaryActionLabel?: string;
  primaryActionIcon?: LucideIcon;
  onPrimaryAction?: () => void;
  filters?: React.ReactNode;
  children?: React.ReactNode;
}

export const EnterpriseToolbar: React.FC<EnterpriseToolbarProps> = ({
  title,
  totalCount,
  tenantName,
  searchPlaceholder = 'Search records...',
  searchValue,
  onSearchChange,
  primaryActionLabel,
  primaryActionIcon: PrimaryIcon = Plus,
  onPrimaryAction,
  filters,
  children,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
      {/* Left Compact Section Label and Count */}
      <div className="flex items-center gap-2 min-h-[28px]">
        {title && (
          <span className="text-xs font-bold text-slate-700 tracking-tight">{title}</span>
        )}
        {typeof totalCount === 'number' && (
          <span className="text-[11px] text-slate-500 font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 border border-slate-200/60">
            {totalCount} records
          </span>
        )}
        {tenantName && !title && (
          <span className="text-[11px] text-slate-500 font-medium">
            {tenantName}
          </span>
        )}
      </div>

      {/* Right Controls: Search, Filters, Primary Button */}
      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
        {onSearchChange && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue ?? ''}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 w-44 sm:w-56"
            />
          </div>
        )}

        {filters && <div className="flex items-center gap-1.5">{filters}</div>}

        {children}

        {primaryActionLabel && onPrimaryAction && (
          <button
            type="button"
            onClick={onPrimaryAction}
            className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-3 py-1.5 rounded-lg transition shadow-2xs flex items-center gap-1.5 shrink-0"
          >
            <PrimaryIcon className="w-3.5 h-3.5" />
            <span>{primaryActionLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
};
