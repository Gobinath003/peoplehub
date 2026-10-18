import * as XLSX from 'xlsx';

export interface ExcelExportOptions<T = any> {
  filename: string;
  sheetName?: string;
  columns?: {
    header: string;
    accessor: keyof T | ((row: T) => any);
    width?: number;
  }[];
  data?: T[];
  headers?: string[];
  rows?: (string | number | boolean | null | undefined)[][];
}

/**
 * Cleanly exports tabular data to a native Excel (.xlsx) file with auto-sized column widths.
 */
export function exportToExcel<T = any>(options: ExcelExportOptions<T>): void {
  const {
    filename,
    sheetName = 'Sheet1',
    columns,
    data,
    headers: rawHeaders,
    rows: rawRows,
  } = options;

  let finalHeaders: string[] = [];
  let finalRows: (string | number | boolean | null | undefined)[][] = [];

  if (columns && data) {
    finalHeaders = columns.map((c) => c.header);
    finalRows = data.map((item) =>
      columns.map((c) => {
        if (typeof c.accessor === 'function') {
          return c.accessor(item);
        }
        const val = item[c.accessor];
        return val !== undefined && val !== null ? val : '';
      })
    );
  } else if (rawHeaders && rawRows) {
    finalHeaders = rawHeaders;
    finalRows = rawRows;
  } else {
    console.warn('exportToExcel called without valid columns/data or headers/rows');
    return;
  }

  // Construct sheet data with headers in row 0
  const sheetData = [finalHeaders, ...finalRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Auto-fit column widths
  const colWidths = finalHeaders.map((header, colIndex) => {
    let maxLen = header.length;
    finalRows.forEach((row) => {
      const cellVal = row[colIndex];
      const strVal = cellVal !== null && cellVal !== undefined ? String(cellVal) : '';
      if (strVal.length > maxLen) {
        maxLen = strVal.length;
      }
    });
    // Set column width with safety margins
    return { wch: Math.min(Math.max(maxLen + 3, 10), 50) };
  });

  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Ensure filename has .xlsx extension
  const safeFilename = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;

  XLSX.writeFile(wb, safeFilename);
}
