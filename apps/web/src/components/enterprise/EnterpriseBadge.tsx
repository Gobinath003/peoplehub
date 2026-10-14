import React from 'react';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'purple';

interface EnterpriseBadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  useDot?: boolean;
  className?: string;
}

const VARIANT_STYLES: Record<BadgeVariant, { dot: string; text: string; bg: string; border: string }> = {
  success: { dot: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50/60', border: 'border-emerald-200/50' },
  danger: { dot: 'bg-rose-500', text: 'text-rose-700', bg: 'bg-rose-50/60', border: 'border-rose-200/50' },
  warning: { dot: 'bg-amber-500', text: 'text-amber-800', bg: 'bg-amber-50/60', border: 'border-amber-200/50' },
  info: { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50/60', border: 'border-blue-200/50' },
  neutral: { dot: 'bg-slate-400', text: 'text-slate-600', bg: 'bg-slate-100/60', border: 'border-slate-200/50' },
  purple: { dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50/60', border: 'border-purple-200/50' },
};

export const EnterpriseBadge: React.FC<EnterpriseBadgeProps> = ({
  children,
  variant = 'neutral',
  useDot = true,
  className = '',
}) => {
  const style = VARIANT_STYLES[variant];

  if (useDot) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.text} ${className}`}>
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
        <span>{children}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium px-2 py-0.5 rounded-md text-xs border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {children}
    </span>
  );
};
