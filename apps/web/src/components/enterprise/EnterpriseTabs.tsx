import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface EnterpriseTabItem<T extends string = string> {
  key: T;
  label: string;
  count?: number;
  icon?: LucideIcon;
}

interface EnterpriseTabsProps<T extends string = string> {
  tabs: EnterpriseTabItem<T>[];
  activeTab: T;
  onTabChange: (tabKey: T) => void;
  variant?: 'underline' | 'pills';
  className?: string;
}

export function EnterpriseTabs<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  variant = 'underline',
  className = '',
}: EnterpriseTabsProps<T>) {
  if (variant === 'pills') {
    return (
      <div className={`flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs ${className}`}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="text-[10px] text-slate-400">({tab.count})</span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1.5 overflow-x-auto pb-0.5 border-b border-slate-200/80 ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition flex items-center gap-1.5 border-b-2 -mb-px ${
              isActive
                ? 'border-slate-900 text-slate-900 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
            }`}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                  isActive ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
