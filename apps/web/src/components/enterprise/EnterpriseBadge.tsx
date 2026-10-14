import React from 'react';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple';

interface EnterpriseBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
};

export const EnterpriseBadge: React.FC<EnterpriseBadgeProps> = ({
  children,
  variant = 'neutral',
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.2 rounded text-[10px] border tracking-tight ${VARIANT_STYLES[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
