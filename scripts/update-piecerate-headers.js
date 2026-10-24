const fs = require('fs');
const p = 'apps/web/src/app/dashboard/piece-rate/page.tsx';
let c = fs.readFileSync(p, 'utf8');

// 1. Update printable receipt
const oldReceiptHeader = `              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                <div className="font-black text-sm tracking-tight uppercase">{activeTenant?.name || 'Company Name'}</div>
                <div className="text-[10px] text-slate-500 font-sans font-semibold">
                  {activeBranchScope ? \`Branch: \${activeBranchScope}\` : 'Production & Manufacturing Facility'}
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-800 pt-1">
                  *** PIECE-RATE WORK RECEIPT ***
                </div>
              </div>`;

const newReceiptHeader = `              {/* Header with Official Company Details */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-slate-300">
                <div className="font-black text-base tracking-tight uppercase">{activeTenant?.name || 'Company Name'}</div>
                {activeTenant?.address && (
                  <div className="text-[10px] text-slate-600 font-sans font-medium">{activeTenant.address}</div>
                )}
                <div className="text-[9px] text-slate-500 font-sans">
                  {activeTenant?.phone && <span>Ph: {activeTenant.phone} </span>}
                  {activeTenant?.email && <span>• {activeTenant.email} </span>}
                  {activeTenant?.taxId && <span>• GSTIN: {activeTenant.taxId}</span>}
                </div>
                <div className="text-[10px] text-slate-600 font-sans font-bold">
                  {activeBranchScope ? \`Operating Branch: \${activeBranchScope}\` : 'Garment Line Production Facility'}
                </div>
                <div className="text-[11px] font-black uppercase tracking-wider text-slate-900 pt-1 border-t border-dotted border-slate-300 mt-1">
                  *** PIECE-RATE WORK WAGE VOUCHER ***
                </div>
              </div>`;

c = c.replace(oldReceiptHeader, newReceiptHeader);
c = c.replace(oldReceiptHeader.replace(/\n/g, '\r\n'), newReceiptHeader.replace(/\n/g, '\r\n'));

// 2. Update printable master ledger
const oldLedgerHeader = `              {/* Ledger Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-lg font-black text-slate-900 tracking-tight uppercase">{activeTenant?.name || 'Company Name'}</h1>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    {activeBranchScope ? \`Branch: \${activeBranchScope}\` : 'Piece-Rate Manufacturing Operations'}
                  </p>
                  <p className="text-sm font-black text-slate-800 mt-2 uppercase tracking-wide">
                    DAILY PRODUCTION & PIECE-RATE WAGE DISBURSEMENT LEDGER
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold text-slate-800">Date: {periodType === 'DAILY' ? selectedDate : weekRange.display}</div>
                  <div className="text-slate-400 text-[10px] mt-0.5">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                </div>
              </div>`;

const newLedgerHeader = `              {/* Ledger Header with Complete Legal Company Profile */}
              <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">{activeTenant?.name || 'Company Name'}</h1>
                  {activeTenant?.address && (
                    <p className="text-xs text-slate-600 font-medium max-w-lg mt-0.5 leading-relaxed">{activeTenant.address}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-slate-500 font-medium mt-1">
                    {activeTenant?.phone && <span><strong>Ph:</strong> {activeTenant.phone}</span>}
                    {activeTenant?.email && <span>• <strong>Email:</strong> {activeTenant.email}</span>}
                    {activeTenant?.taxId && <span>• <strong>GSTIN:</strong> {activeTenant.taxId}</span>}
                    {activeTenant?.registrationNo && <span>• <strong>CIN:</strong> {activeTenant.registrationNo}</span>}
                    <span>• <strong>Branch:</strong> {activeBranchScope || 'All Production Units'}</span>
                  </div>
                  <p className="text-xs font-black text-slate-900 mt-2 uppercase tracking-wider bg-slate-100 inline-block px-2.5 py-0.5 rounded border border-slate-300">
                    MASTER PRODUCTION & PIECE-RATE WAGE DISBURSEMENT LEDGER
                  </p>
                </div>
                <div className="text-right text-xs">
                  <div className="font-bold text-slate-900">Period: {periodType === 'DAILY' ? selectedDate : weekRange.display}</div>
                  <div className="text-slate-500 text-[10px] mt-0.5">Generated: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</div>
                </div>
              </div>`;

c = c.replace(oldLedgerHeader, newLedgerHeader);
c = c.replace(oldLedgerHeader.replace(/\n/g, '\r\n'), newLedgerHeader.replace(/\n/g, '\r\n'));

fs.writeFileSync(p, c, 'utf8');
console.log('Successfully updated piece-rate printable voucher and ledger headers in piece-rate/page.tsx');
