import * as XLSX from 'xlsx';

export interface CompanyExportHeader {
  name?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxId?: string | null;
  registrationNo?: string | null;
  reportTitle?: string;
  branchScope?: string | null;
}

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
  companyInfo?: CompanyExportHeader;
  reportTitle?: string;
}

/**
 * Cleanly exports tabular data to a native Excel (.xlsx) file
 * with full official Company Tenant details, address, contact, and auto-sized column widths.
 */
export function exportToExcel<T = any>(options: ExcelExportOptions<T>): void {
  const {
    filename,
    sheetName = 'Report',
    columns,
    data,
    headers: rawHeaders,
    rows: rawRows,
    reportTitle,
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

  // Attempt to resolve company details from options or localStorage active tenant
  let comp: CompanyExportHeader | null = options.companyInfo || null;
  let activeBranch: string | null = null;

  if (!comp && typeof window !== 'undefined') {
    try {
      const storedTenantStr = localStorage.getItem('ph_active_tenant');
      if (storedTenantStr) {
        const parsed = JSON.parse(storedTenantStr);
        comp = {
          name: parsed.name,
          address: parsed.address,
          phone: parsed.phone,
          email: parsed.email,
          website: parsed.website,
          taxId: parsed.taxId,
          registrationNo: parsed.registrationNo,
        };
      }
      activeBranch = localStorage.getItem('ph_branch_scope');
    } catch {
      // Ignore localStorage read errors
    }
  }

  const exportDateStr = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date());

  // Build top company header rows
  const headerBlock: (string | number | boolean | null | undefined)[][] = [];

  if (comp && comp.name) {
    // Row 1: Company Name
    headerBlock.push([comp.name.toUpperCase()]);

    // Row 2: Address
    if (comp.address) {
      headerBlock.push([`Registered Office / Facility: ${comp.address}`]);
    }

    // Row 3: Phone, Email, Website, GSTIN / Tax ID
    const contactParts: string[] = [];
    if (comp.phone) contactParts.push(`Phone: ${comp.phone}`);
    if (comp.email) contactParts.push(`Email: ${comp.email}`);
    if (comp.taxId) contactParts.push(`GSTIN / Tax ID: ${comp.taxId}`);
    if (comp.registrationNo) contactParts.push(`CIN: ${comp.registrationNo}`);
    if (comp.website) contactParts.push(`Web: ${comp.website}`);

    if (contactParts.length > 0) {
      headerBlock.push([contactParts.join('  |  ')]);
    }

    // Row 4: Report Title & Export Metadata
    const title = reportTitle || comp.reportTitle || sheetName;
    const metaParts = [`Report: ${title}`, `Generated: ${exportDateStr}`];
    if (comp.branchScope || activeBranch) {
      metaParts.push(`Branch Scope: ${comp.branchScope || activeBranch}`);
    }
    headerBlock.push([metaParts.join('  |  ')]);

    // Row 5: Empty Spacer Row
    headerBlock.push([]);
  }

  // Construct sheet data with Company Header + Column Headers + Data Rows
  const sheetData = [...headerBlock, finalHeaders, ...finalRows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Auto-fit column widths based on table headers and data rows
  const colWidths = finalHeaders.map((header, colIndex) => {
    let maxLen = header.length;
    finalRows.forEach((row) => {
      const cellVal = row[colIndex];
      const strVal = cellVal !== null && cellVal !== undefined ? String(cellVal) : '';
      if (strVal.length > maxLen) {
        maxLen = strVal.length;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 3, 12), 60) };
  });

  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Ensure filename has .xlsx extension
  const safeFilename = filename.toLowerCase().endsWith('.xlsx') ? filename : `${filename}.xlsx`;

  XLSX.writeFile(wb, safeFilename);
}
