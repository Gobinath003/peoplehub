import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface EnterprisePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  itemLabel?: string;
}

export const EnterprisePagination: React.FC<EnterprisePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  itemLabel = 'records',
}) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  return (
    <div className="px-3.5 py-2 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
      <div>
        Showing <span className="font-semibold text-slate-800">{startItem}</span> to{' '}
        <span className="font-semibold text-slate-800">{endItem}</span> of{' '}
        <span className="font-semibold text-slate-800">{totalItems}</span> {itemLabel}
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 shadow-2xs transition"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Prev</span>
        </button>
        <span className="px-2 py-1 text-xs text-slate-700 font-medium">
          Page {currentPage} of {totalPages}
        </span>
        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="px-2 py-1 rounded border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed font-medium text-xs flex items-center gap-1 shadow-2xs transition"
        >
          <span>Next</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
