const fs = require('fs');
const p = 'apps/web/src/app/dashboard/payroll/page.tsx';
let c = fs.readFileSync(p, 'utf8');

const oldHeader = `              {/* Company Header */}
              <div className="text-center pb-4 border-b-2 border-slate-800 space-y-1">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-wide">
                  {viewPayslip.companyName || activeTenant?.name}
                </h2>
                <p className="text-slate-500 text-xs">
                  Branch: {viewPayslip.branch || 'Head Office'} • Industry Vertical: {activeTenant?.industry}
                </p>
                <div className="inline-block bg-slate-100 text-slate-800 font-bold px-3 py-1 rounded text-xs mt-2 border border-slate-300">
                  PAYSLIP FOR THE MONTH OF {viewPayslip.payPeriod?.toUpperCase()}
                </div>
              </div>`;

const newHeader = `              {/* Company Header with Full Legal, Address & Tax Info */}
              <div className="text-center pb-5 border-b-2 border-slate-900 space-y-1.5">
                <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
                  {viewPayslip.companyName || activeTenant?.name}
                </h2>
                {activeTenant?.address && (
                  <p className="text-slate-600 text-xs font-medium max-w-xl mx-auto leading-relaxed">
                    {activeTenant.address}
                  </p>
                )}
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-medium">
                  {activeTenant?.phone && <span><strong>Phone:</strong> {activeTenant.phone}</span>}
                  {activeTenant?.email && <span>• <strong>Email:</strong> {activeTenant.email}</span>}
                  {activeTenant?.website && <span>• <strong>Web:</strong> {activeTenant.website}</span>}
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-slate-600 font-semibold">
                  {activeTenant?.taxId && <span><strong>GSTIN / Tax ID:</strong> {activeTenant.taxId}</span>}
                  {activeTenant?.registrationNo && <span>• <strong>CIN:</strong> {activeTenant.registrationNo}</span>}
                  <span>• <strong>Branch:</strong> {viewPayslip.branch || activeBranchScope || 'Head Office'}</span>
                </div>
                <div className="inline-block bg-slate-900 text-white font-black px-4 py-1 rounded-md text-xs mt-2 uppercase tracking-wider">
                  PAYSLIP FOR {viewPayslip.payPeriod?.toUpperCase()}
                </div>
              </div>`;

if (c.includes('{/* Company Header */}')) {
  c = c.replace(oldHeader, newHeader);
  c = c.replace(oldHeader.replace(/\n/g, '\r\n'), newHeader.replace(/\n/g, '\r\n'));
  fs.writeFileSync(p, c, 'utf8');
  console.log('Successfully updated payslip company header in payroll/page.tsx');
} else {
  console.log('Target company header not found in payroll/page.tsx');
}
