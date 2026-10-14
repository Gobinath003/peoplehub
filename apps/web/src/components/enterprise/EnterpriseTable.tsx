import React from 'react';

interface EnterpriseTableProps {
  children: React.ReactNode;
  loading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  footer?: React.ReactNode;
  className?: string;
}

export const EnterpriseTable: React.FC<EnterpriseTableProps> = ({
  children,
  loading = false,
  isEmpty = false,
  emptyMessage = 'No records found matching criteria.',
  footer,
  className = '',
}) => {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden ${className}`}>
      {loading ? (
        <div className="p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : isEmpty ? (
        <div className="p-8 text-center text-slate-400 text-xs">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
      {footer}
    </div>
  );
};

export const EnterpriseTableHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <thead>
      <tr className={`bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider ${className}`}>
        {children}
      </tr>
    </thead>
  );
};

export const EnterpriseTableTh: React.FC<{
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}> = ({ children, align = 'left', className = '' }) => {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return <th className={`py-2.5 px-3.5 ${alignClass} ${className}`}>{children}</th>;
};

export const EnterpriseTableBody: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return <tbody className={`divide-y divide-slate-100 ${className}`}>{children}</tbody>;
};

export const EnterpriseTableRow: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}> = ({ children, onClick, className = '' }) => {
  return (
    <tr
      onClick={onClick}
      className={`hover:bg-slate-50/60 transition ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
};

export const EnterpriseTableTd: React.FC<{
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}> = ({ children, align = 'left', className = '' }) => {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return <td className={`py-2 px-3.5 text-xs text-slate-700 ${alignClass} ${className}`}>{children}</td>;
};
