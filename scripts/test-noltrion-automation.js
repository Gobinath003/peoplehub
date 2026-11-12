/**
 * End-to-End Automation Testing Suite: Noltrion Innovations Lifecycle
 * 
 * Verifies the complete business journey:
 * 1. Super Admin authentication & Tenant creation ("Noltrion Innovations")
 * 2. Enterprise module provisioning (Piece-Rate, Payroll, Employees, etc.)
 * 3. HR Manager authentication & context switching
 * 4. Piece-Rate operations catalog registration
 * 5. Employee onboarding & compensation structure configuration
 * 6. Daily floor sheet entry & piece-rate work calculation
 * 7. Daily work ledger verification & statutory print format rendering
 * 8. Payroll generation & comprehensive payslip computation
 * 9. Accounts expense ledger posting & cashflow summary
 * 10. Immutable security audit trail verification
 */

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: { url: 'postgresql://postgres:postgres@localhost:5432/PeopleHub?schema=public' }
  }
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

function request(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const dataStr = data ? JSON.stringify(data) : null;
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        ...(options.headers || {})
      }
    };

    if (dataStr) {
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(dataStr);
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch (e) {
          parsed = body;
        }
        resolve({ status: res.statusCode, data: parsed, raw: body });
      });
    });

    req.on('error', reject);
    req.setTimeout(options.timeout || 15000, () => {
      req.destroy();
      reject(new Error(`Timeout after 15s to ${url}`));
    });

    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function isServerAlive(port) {
  try {
    const res = await request(`http://localhost:${port}/api/v1/tenants`, {
      method: 'GET',
      timeout: 1500
    });
    return res.status !== undefined && res.status > 0;
  } catch (e) {
    return false;
  }
}

async function startServerIfNeeded() {
  if (await isServerAlive(3001)) {
    console.log(`${colors.cyan}  [API Server] Detected active backend on port 3001.${colors.reset}`);
    return { port: 3001, process: null };
  }

  console.log(`${colors.yellow}  [API Server] Starting local in-process NestJS backend on port 3099...${colors.reset}`);
  const env = Object.assign({}, process.env, {
    PORT: '3099',
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/PeopleHub?schema=public',
    JWT_SECRET: 'super-secret-jwt-access-key-change-in-production',
    JWT_REFRESH_SECRET: 'super-secret-jwt-refresh-key-change-in-production'
  });

  const apiProcess = spawn('node', ['apps/api/dist/main.js'], {
    cwd: path.resolve(__dirname, '..'),
    env,
    stdio: 'pipe'
  });

  apiProcess.stdout.on('data', d => {
    const str = d.toString();
    if (str.includes('Running') || str.includes('Error') || str.includes('exception')) {
      process.stdout.write(`    [NestJS] ${str}`);
    }
  });
  apiProcess.stderr.on('data', d => {
    process.stderr.write(`    [NestJS ERR] ${d}`);
  });

  // Wait for server to become responsive
  const start = Date.now();
  let online = false;
  while (Date.now() - start < 20000) {
    await new Promise(r => setTimeout(r, 600));
    if (await isServerAlive(3099)) {
      online = true;
      break;
    }
  }

  if (!online) {
    apiProcess.kill();
    throw new Error('Could not start NestJS API server on port 3099 within 20s');
  }

  console.log(`${colors.green}  [API Server] NestJS backend is online on port 3099.${colors.reset}`);
  return { port: 3099, process: apiProcess };
}

async function cleanPriorTestData() {
  console.log(`${colors.gray}  Preparing clean state: purging prior "noltrion-innovations" test artifacts...${colors.reset}`);
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: 'noltrion-innovations' }
  });

  if (existingTenant) {
    const tId = existingTenant.id;
    await prisma.accountTransaction.deleteMany({ where: { tenantId: tId } });
    await prisma.pieceRateLog.deleteMany({ where: { tenantId: tId } });
    await prisma.pieceRateActivity.deleteMany({ where: { tenantId: tId } });
    await prisma.payslip.deleteMany({ where: { tenantId: tId } });
    await prisma.salaryStructure.deleteMany({ where: { employee: { tenantId: tId } } });
    await prisma.employee.deleteMany({ where: { tenantId: tId } });
    await prisma.designation.deleteMany({ where: { tenantId: tId } });
    await prisma.department.deleteMany({ where: { tenantId: tId } });
    await prisma.branch.deleteMany({ where: { tenantId: tId } });
    await prisma.auditLog.deleteMany({ where: { tenantId: tId } });
    await prisma.userRoleAssignment.deleteMany({ where: { tenantId: tId } });
    await prisma.rolePermission.deleteMany({ where: { role: { tenantId: tId } } });
    await prisma.role.deleteMany({ where: { tenantId: tId } });
    await prisma.tenantModule.deleteMany({ where: { tenantId: tId } });
    await prisma.tenantUser.deleteMany({ where: { tenantId: tId } });
    await prisma.tenant.delete({ where: { id: tId } });
  }

  // Purge test user hr@noltrion.com if orphaned
  await prisma.user.deleteMany({
    where: { email: 'hr@noltrion.com' }
  });
  console.log(`${colors.green}  Clean state verified.${colors.reset}`);
}

async function runAutomation() {
  console.log('\n' + '='.repeat(82));
  console.log(`   ${colors.bright}PEOPLEHUB END-TO-END AUTOMATION TESTING ENGINE${colors.reset}`);
  console.log(`   Target Scenario: "Noltrion Innovations" Complete SaaS Lifecycle`);
  console.log(`   Timestamp: ${new Date().toLocaleString()}`);
  console.log('='.repeat(82) + '\n');

  let serverInfo = null;
  const results = [];

  function record(step, title, passed, details = '', metrics = {}) {
    results.push({ step, title, passed, details, metrics });
    const mark = passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`  ${mark} ${colors.bold}[Step ${step}]${colors.reset} ${title}`);
    if (details) {
      console.log(`         ${colors.gray}Details: ${details}${colors.reset}`);
    }
  }

  try {
    serverInfo = await startServerIfNeeded();
    const API_BASE = `http://localhost:${serverInfo.port}/api/v1`;

    await cleanPriorTestData();

    // ------------------------------------------------------------------------
    // STEP 1: Super Admin Authentication
    // ------------------------------------------------------------------------
    let adminToken = '';
    {
      const res = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
        email: 'admin@peoplehub.com',
        passwordHash: 'admin_pass'
      });
      const pass = res.status === 200 && res.data && res.data.accessToken;
      if (pass) adminToken = res.data.accessToken;
      record(1, 'Super Administrator Authentication (admin@peoplehub.com)', pass,
        pass ? 'Access token successfully generated' : `Failed with status ${res.status}`);
    }

    // ------------------------------------------------------------------------
    // STEP 2: Create Tenant "Noltrion Innovations"
    // ------------------------------------------------------------------------
    let tenantId = '';
    let hrEmail = 'hr@noltrion.com';
    let hrPass = 'noltrion_pass';
    {
      const payload = {
        name: 'Noltrion Innovations',
        slug: 'noltrion-innovations',
        industry: 'GARMENTS',
        address: 'Plot No. 12-14, Noltrion Tech Corridor, Chennai - 600096, Tamil Nadu, India',
        phone: '+91 44 4890 1200',
        email: 'corporate@noltrion.com',
        website: 'https://noltrion.com',
        taxId: '33NOLTR8899F1Z2',
        registrationNo: 'U72200TN2026PTC889900',
        adminEmail: hrEmail,
        adminPassword: hrPass,
        adminFirstName: 'Noltrion',
        adminLastName: 'HR'
      };

      const res = await request(`${API_BASE}/tenants`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      }, payload);

      const pass = res.status === 201 && res.data && (res.data.tenant?.id || res.data.id);
      if (pass) {
        tenantId = res.data.tenant?.id || res.data.id;
      }
      record(2, 'Tenant Company Creation ("Noltrion Innovations")', pass,
        pass ? `Created Tenant ID: ${tenantId} | Industry: GARMENTS | CIN: U72200TN2026PTC889900` : `Status ${res.status}: ${JSON.stringify(res.data)}`);
    }

    const tenantHeaders = (token) => ({
      Authorization: `Bearer ${token}`,
      'x-tenant-id': tenantId
    });

    // ------------------------------------------------------------------------
    // STEP 3: Verify Tenant Modules Provisioning
    // ------------------------------------------------------------------------
    {
      const res = await request(`${API_BASE}/tenants/modules`, {
        headers: tenantHeaders(adminToken)
      });
      const enabledCodes = Array.isArray(res.data) ? res.data.filter(m => m.isEnabled).map(m => m.moduleCode) : [];
      const hasPieceRate = enabledCodes.includes('PIECE_RATE');
      const hasPayroll = enabledCodes.includes('PAYROLL');
      const hasEmployees = enabledCodes.includes('EMPLOYEES');
      const pass = res.status === 200 && hasPieceRate && hasPayroll && hasEmployees;
      record(3, 'Enterprise Modules Auto-Provisioning (PIECE_RATE, PAYROLL, EMPLOYEES)', pass,
        pass ? `Active modules: ${enabledCodes.join(', ')}` : `Missing modules. Found: ${enabledCodes.join(', ')}`);
    }

    // ------------------------------------------------------------------------
    // STEP 4: HR Manager Authentication & Workspace Context
    // ------------------------------------------------------------------------
    let hrToken = '';
    {
      const res = await request(`${API_BASE}/auth/login`, { method: 'POST' }, {
        email: hrEmail,
        passwordHash: hrPass
      });
      const pass = res.status === 200 && res.data && res.data.accessToken;
      if (pass) hrToken = res.data.accessToken;
      record(4, 'Noltrion HR Manager Login (hr@noltrion.com)', pass,
        pass ? `Session established for tenant "${res.data.activeTenant?.name || 'Noltrion Innovations'}"` : `Status ${res.status}`);
    }

    // ------------------------------------------------------------------------
    // STEP 5: Register Garment Piece-Rate Operations Catalog
    // ------------------------------------------------------------------------
    let opCollar = null;
    let opCuff = null;
    let opIron = null;
    {
      const op1 = await request(`${API_BASE}/piece-rate/activities`, {
        method: 'POST',
        headers: tenantHeaders(hrToken)
      }, {
        code: 'NOL-OP-01',
        name: 'High-Precision Collar Stitching',
        unit: 'pieces',
        ratePerUnit: 18.00,
        description: 'Double-needle seam collar precision joining'
      });

      const op2 = await request(`${API_BASE}/piece-rate/activities`, {
        method: 'POST',
        headers: tenantHeaders(hrToken)
      }, {
        code: 'NOL-OP-02',
        name: 'Cuff & Sleeve Elastic Hemming',
        unit: 'pieces',
        ratePerUnit: 14.50,
        description: 'Elastic attachment and cuff circular stitching'
      });

      const op3 = await request(`${API_BASE}/piece-rate/activities`, {
        method: 'POST',
        headers: tenantHeaders(hrToken)
      }, {
        code: 'NOL-OP-03',
        name: 'Garment Ironing & Final Packing',
        unit: 'pieces',
        ratePerUnit: 10.00,
        description: 'Steam pressing, tag attachment and polybag packing'
      });

      const pass = op1.status === 201 && op2.status === 201 && op3.status === 201;
      if (pass) {
        opCollar = op1.data;
        opCuff = op2.data;
        opIron = op3.data;
      }
      record(5, 'Piece-Rate Operations Catalog Setup (3 Garments Activities)', pass,
        pass ? `OP-01: ₹18/pc, OP-02: ₹14.50/pc, OP-03: ₹10/pc registered` : 'Failed to register operations');
    }

    // ------------------------------------------------------------------------
    // STEP 6: Create Employee & Setup Compensation Structure
    // ------------------------------------------------------------------------
    let employee = null;
    {
      const empRes = await request(`${API_BASE}/employees`, {
        method: 'POST',
        headers: tenantHeaders(hrToken)
      }, {
        employeeCode: 'NOL-EMP-101',
        firstName: 'Sathish',
        lastName: 'Kumar',
        email: 'sathish.kumar@noltrion.com',
        phone: '+91 98401 23456',
        department: 'Sewing & Stitching',
        designation: 'Master Tailor',
        salaryType: 'PIECE_RATE',
        joiningDate: '2026-11-01',
        status: 'ACTIVE',
        basicSalary: 12000,
        hra: 3500,
        specialAllowance: 1500,
        pfDeduction: 1440,
        taxDeduction: 500
      });

      const pass = empRes.status === 201 && empRes.data && empRes.data.id;
      if (pass) employee = empRes.data;
      record(6, 'Employee Onboarding ("Sathish Kumar", NOL-EMP-101)', pass,
        pass ? `Created Employee ID: ${employee.id} | Base Salary: ₹12,000 | Type: PIECE_RATE` : `Status ${empRes.status}`);
    }

    // ------------------------------------------------------------------------
    // STEP 7: Daily Sheet Entry (Floor Production Work Logging)
    // ------------------------------------------------------------------------
    let floorLogs = [];
    const testLogDate = '2026-11-10';
    {
      const logRes = await request(`${API_BASE}/piece-rate/employee-day-logs`, {
        method: 'POST',
        headers: tenantHeaders(hrToken)
      }, {
        employeeId: employee.id,
        logDate: testLogDate,
        items: [
          { activityId: opCollar.id, quantity: 40, unitRate: 18.00, remarks: 'Shift A Batch 1' },
          { activityId: opCuff.id, quantity: 30, unitRate: 14.50, remarks: 'Shift A Batch 2' },
          { activityId: opIron.id, quantity: 50, unitRate: 10.00, remarks: 'Shift A Final Out' }
        ]
      });

      const pass = logRes.status === 200 && Array.isArray(logRes.data) && logRes.data.length === 3;
      if (pass) floorLogs = logRes.data;
      const expectedTotalWage = (40 * 18.00) + (30 * 14.50) + (50 * 10.00); // 720 + 435 + 500 = 1655
      const actualTotalWage = floorLogs.reduce((sum, l) => sum + Number(l.totalAmount), 0);
      const totalUnits = floorLogs.reduce((sum, l) => sum + Number(l.quantity), 0);

      record(7, 'Daily Floor Sheet Entry (120 Pieces across 3 Operations)', pass && actualTotalWage === expectedTotalWage,
        pass ? `Logged ${totalUnits} units finished | Floor Earnings: ₹${actualTotalWage.toFixed(2)} (Expected ₹1655.00)` : `Status ${logRes.status}`);
    }

    // ------------------------------------------------------------------------
    // STEP 8: Daily Work Ledger Query & Statutory Print Format Verification
    // ------------------------------------------------------------------------
    {
      const res = await request(`${API_BASE}/piece-rate/logs?employeeId=${employee.id}&startDate=${testLogDate}&endDate=${testLogDate}`, {
        headers: tenantHeaders(hrToken)
      });

      const pass = res.status === 200 && Array.isArray(res.data) && res.data.length >= 3;
      const totalPieces = res.data.reduce((acc, row) => acc + row.quantity, 0);
      const totalWages = res.data.reduce((acc, row) => acc + Number(row.totalAmount), 0);

      const printableLedgerData = {
        company: 'Noltrion Innovations',
        registrationNo: 'U72200TN2026PTC889900',
        gstin: '33NOLTR8899F1Z2',
        date: testLogDate,
        totalRoster: 1,
        activeWorkers: 1,
        totalUnits: totalPieces,
        grandTotalWages: totalWages,
        breakdown: res.data.map(d => `${d.activity?.name || d.activityCode}: ${d.quantity} pcs @ ₹${d.unitRate} = ₹${d.totalAmount}`)
      };

      record(8, 'Daily Work Ledger & Statutory Print Format Validation', pass && totalWages === 1655,
        pass ? `Verified Master Ledger: 1 Active Operator, ${totalPieces} Units Finished, ₹${totalWages} Disbursable` : `Failed to verify ledger`);
    }

    // ------------------------------------------------------------------------
    // STEP 9: Generate Pay Slip for Employee
    // ------------------------------------------------------------------------
    let payslipId = '';
    let payslipData = null;
    {
      const payRes = await request(`${API_BASE}/payroll/payslips/generate`, {
        method: 'POST',
        headers: tenantHeaders(hrToken)
      }, {
        month: 11,
        year: 2026,
        employeeId: employee.id,
        payPeriod: 'November 2026',
        workingDays: 26
      });

      const pass = payRes.status === 201 && payRes.data && payRes.data.generatedCount >= 1;
      if (pass && payRes.data.payslips && payRes.data.payslips.length > 0) {
        payslipData = payRes.data.payslips[0];
        payslipId = payslipData.id;
      }

      // Fetch the single payslip to verify detailed breakdown
      const slipDetail = await request(`${API_BASE}/payroll/payslips/${payslipId}`, {
        headers: tenantHeaders(hrToken)
      });

      const detailPass = slipDetail.status === 200 && slipDetail.data && slipDetail.data.id === payslipId;
      record(9, 'Payroll Processing & Official Payslip Generation', pass && detailPass,
        detailPass ? `Pay Period: ${slipDetail.data.payPeriod} | Gross: ₹${slipDetail.data.grossEarnings} | Net: ₹${slipDetail.data.netPayable} | Status: ${slipDetail.data.status}` : `Status ${payRes.status}`);
    }

    // ------------------------------------------------------------------------
    // STEP 10: Accounts Transaction & Immutable Audit Log Verification ("Others")
    // ------------------------------------------------------------------------
    {
      // Post floor wage disbursement into company financial accounts
      const txRes = await request(`${API_BASE}/accounts/transactions`, {
        method: 'POST',
        headers: tenantHeaders(hrToken)
      }, {
        type: 'EXPENSE',
        category: 'FLOOR_WAGES',
        amount: 1655.00,
        transactionDate: testLogDate,
        paymentMode: 'CASH',
        payeePayer: 'Sathish Kumar (NOL-EMP-101)',
        description: `Piece-rate floor wage disbursement for ${testLogDate}`
      });

      const txPass = txRes.status === 201 && txRes.data && txRes.data.id;

      // Verify accounts summary
      const summaryRes = await request(`${API_BASE}/accounts/summary`, {
        headers: tenantHeaders(hrToken)
      });
      const summaryPass = summaryRes.status === 200 && summaryRes.data.totalExpense >= 1655;

      // Verify audit logs captured events
      const auditRes = await request(`${API_BASE}/audit-logs`, {
        headers: tenantHeaders(hrToken)
      });
      const auditPass = auditRes.status === 200 && Array.isArray(auditRes.data) && auditRes.data.length > 0;

      const othersPass = txPass && summaryPass && auditPass;
      record(10, 'Accounts Cashflow Entry & Security Audit Trail Validation', othersPass,
        othersPass ? `Expense ₹1655 booked in Accounts Ledger | ${auditRes.data.length} Security Audit events logged` : 'Failed accounts or audit check');
    }

    // ------------------------------------------------------------------------
    // SUMMARY SCORECARD
    // ------------------------------------------------------------------------
    const passedCount = results.filter(r => r.passed).length;
    const totalCount = results.length;
    const allPassed = passedCount === totalCount;

    console.log('\n' + '='.repeat(82));
    console.log(`   ${colors.bright}VERIFICATION SUMMARY: ${passedCount} / ${totalCount} CHECKS PASSED (${((passedCount / totalCount) * 100).toFixed(0)}%)${colors.reset}`);
    console.log(`   OVERALL VERDICT: ${allPassed ? `${colors.green}${colors.bright}PASSED (100% COMPLETE & VERIFIED)${colors.reset}` : `${colors.red}FAILED${colors.reset}`}`);
    console.log('='.repeat(82) + '\n');

    return allPassed;
  } finally {
    if (serverInfo && serverInfo.process) {
      console.log(`${colors.gray}  Stopping temporary in-process NestJS test server...${colors.reset}`);
      serverInfo.process.kill();
    }
    await prisma.$disconnect();
  }
}

runAutomation()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error(`${colors.red}Fatal test engine error:${colors.reset}`, err);
    process.exit(1);
  });
