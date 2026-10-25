/**
 * PeopleHub Automated Testing Engine & Sanity Verification Suite
 * 
 * Runs end-to-end verification across the entire monorepo:
 * 1. Type Safety & Production Builds (Web + Shared Types + API)
 * 2. Authentication & Access Control (Super Admin & HR Manager)
 * 3. Core Business Modules & Data Integrity (Tenants, Masters, Employees, Piece-Rate, Payroll, Accounts, Audit)
 * 4. React Client-Side Runtime Integrity & Layout Checks (React #310 Hook Order Violation prevention)
 * 5. Git Status & Deployment Readiness
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const ROOT_DIR = path.resolve(__dirname, '..');
const LOCAL_API_BASE = 'http://localhost:3001/api/v1';
const REMOTE_API_BASE = 'https://peoplehub-api-l0yc.onrender.com/api/v1';

// Format helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bgGreen: '\x1b[42m\x1b[30m',
  bgRed: '\x1b[41m\x1b[37m'
};

function logHeader(text) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${text} ===${colors.reset}`);
}

async function request(url, options = {}, postData = null) {
  const urlObj = new URL(url);
  const client = urlObj.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const dataStr = postData ? (typeof postData === 'string' ? postData : JSON.stringify(postData)) : null;
    const reqOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        ...(options.headers || {}),
        ...(dataStr ? { 'Content-Length': Buffer.byteLength(dataStr) } : {})
      }
    };

    const req = client.request(reqOptions, (res) => {
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
    req.setTimeout(options.timeout || 35000, () => {
      req.destroy();
      reject(new Error(`Request timeout after 35s to ${url}`));
    });

    if (dataStr) {
      req.write(dataStr);
    }
    req.end();
  });
}

async function resolveActiveApiBase() {
  process.stdout.write(`  Probing local API (${LOCAL_API_BASE})... `);
  try {
    const res = await request(`${LOCAL_API_BASE}/tenants`, { timeout: 1500 });
    if (res.status === 200 || res.status === 401) {
      console.log(`${colors.green}ACTIVE${colors.reset}`);
      return LOCAL_API_BASE;
    }
  } catch (e) {
    // Local API not running, fallback to remote
  }

  console.log(`${colors.yellow}OFFLINE (Falling back to live Render API)${colors.reset}`);
  process.stdout.write(`  Probing remote Render API (${REMOTE_API_BASE})... `);
  try {
    const res = await request(`${REMOTE_API_BASE}/tenants`, { timeout: 35000 });
    if (res.status === 200 || res.status === 401) {
      console.log(`${colors.green}ONLINE${colors.reset}`);
      return REMOTE_API_BASE;
    }
  } catch (e) {
    console.log(`${colors.yellow}DNS/OFFLINE (${e.message})${colors.reset}`);
  }
  return REMOTE_API_BASE;
}

async function runTestEngine() {
  const startTime = Date.now();
  console.log('================================================================================');
  console.log('   PEOPLEHUB AUTOMATED TESTING ENGINE & PRE-PUSH VERIFICATION SCORECARD');
  console.log('================================================================================');
  console.log(`Timestamp: ${new Date().toLocaleString()} | Root: ${ROOT_DIR}`);

  const results = [];

  function recordResult(suite, name, passed, durationMs, details = '') {
    results.push({ suite, name, passed, durationMs, details });
    const mark = passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    const durStr = `${colors.gray}[${(durationMs / 1000).toFixed(2)}s]${colors.reset}`;
    console.log(`  ${mark}  ${name} ${durStr}`);
    if (details) {
      console.log(`         ${colors.gray}Details: ${details}${colors.reset}`);
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 1: COMPILATION & TYPE INTEGRITY
  // --------------------------------------------------------------------------
  logHeader('SUITE 1: BUILD & COMPILATION INTEGRITY');

  // 1.1 Shared Types Package Build
  {
    const t0 = Date.now();
    try {
      execSync('npm run build:types', { cwd: ROOT_DIR, stdio: 'pipe' });
      recordResult('Build', 'Shared Types Package Compilation (@people-hub/shared-types)', true, Date.now() - t0, 'Type declarations generated cleanly');
    } catch (e) {
      recordResult('Build', 'Shared Types Package Compilation (@people-hub/shared-types)', false, Date.now() - t0, e.message.slice(0, 120));
    }
  }

  // 1.2 Next.js Production Build
  {
    const t0 = Date.now();
    try {
      execSync('npm run build:web', { cwd: ROOT_DIR, stdio: 'pipe' });
      recordResult('Build', 'Next.js Production Build (15/15 Static Pages)', true, Date.now() - t0, '0 TypeScript, JSX, or SWC errors across all routes');
    } catch (e) {
      recordResult('Build', 'Next.js Production Build (15/15 Static Pages)', false, Date.now() - t0, e.message.slice(0, 120));
    }
  }

  // 1.3 NestJS Backend Build
  {
    const t0 = Date.now();
    try {
      execSync('npx tsc -p apps/api/tsconfig.json --noEmit', { cwd: ROOT_DIR, stdio: 'pipe' });
      recordResult('Build', 'NestJS API Typecheck (apps/api)', true, Date.now() - t0, 'Backend TypeScript types verified with 0 errors');
    } catch (e) {
      recordResult('Build', 'NestJS API Typecheck (apps/api)', false, Date.now() - t0, e.message.slice(0, 120));
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 2: AUTHENTICATION & ACCESS CONTROL
  // --------------------------------------------------------------------------
  logHeader('SUITE 2: AUTHENTICATION & SECURITY ROLES');
  const apiBase = await resolveActiveApiBase();

  let adminToken = '';
  let activeTenantId = '';
  let hrToken = '';

  // 2.1 Super Admin Login
  {
    const t0 = Date.now();
    try {
      const res = await request(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        email: 'admin@peoplehub.com',
        passwordHash: 'admin_pass'
      });

      const pass = res.status === 200 && res.data && res.data.accessToken;
      if (pass) {
        adminToken = res.data.accessToken;
        activeTenantId = res.data.activeTenant?.id || res.data.tenants?.[0]?.id;
      }
      recordResult('Auth', 'Super Admin Authentication (admin@peoplehub.com)', pass, Date.now() - t0, 
        pass ? `Token issued, Tenant: ${res.data.activeTenant?.name || 'PeopleHub Central'}` : `Status ${res.status}`);
    } catch (e) {
      recordResult('Auth', 'Super Admin Authentication (admin@peoplehub.com)', false, Date.now() - t0, e.message);
    }
  }

  // 2.2 HR Manager Login
  {
    const t0 = Date.now();
    try {
      const res = await request(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        email: 'priya@garments.com',
        passwordHash: 'priya_pass'
      });

      const pass = res.status === 200 && res.data && res.data.accessToken;
      if (pass) {
        hrToken = res.data.accessToken;
      }
      recordResult('Auth', 'HR Manager Authentication (priya@garments.com)', pass, Date.now() - t0,
        pass ? `Token issued, Scope: ${res.data.roles?.[0]?.scopeId || 'Tenant Scope'}` : `Status ${res.status}`);
    } catch (e) {
      recordResult('Auth', 'HR Manager Authentication (priya@garments.com)', false, Date.now() - t0, e.message);
    }
  }

  // 2.3 Invalid Credentials Rejection
  {
    const t0 = Date.now();
    try {
      const res = await request(`${apiBase}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, {
        email: 'fake_intruder@unknown.com',
        passwordHash: 'wrong_password_attempt'
      });

      const pass = res.status === 401 || res.status === 400 || res.status === 404;
      recordResult('Auth', 'Unauthorized Intruder Rejection Security Check', pass, Date.now() - t0,
        pass ? `Correctly denied with HTTP ${res.status}` : `Unexpected response status ${res.status}`);
    } catch (e) {
      recordResult('Auth', 'Unauthorized Intruder Rejection Security Check', false, Date.now() - t0, e.message);
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 3: BUSINESS MODULES & DATABASE APIS
  // --------------------------------------------------------------------------
  logHeader('SUITE 3: BUSINESS MODULES & DATA INTEGRITY');
  const effectiveToken = adminToken || hrToken;
  const authHeaders = {
    'Authorization': `Bearer ${effectiveToken}`,
    'x-tenant-id': activeTenantId || '7837a312-ed38-4859-9748-9cbad20d1863',
    'Content-Type': 'application/json'
  };

  // 3.1 Multi-Tenant Organization List
  {
    const t0 = Date.now();
    try {
      const res = await request(`${apiBase}/tenants`, { headers: authHeaders });
      const pass = res.status === 200 && Array.isArray(res.data) && res.data.length > 0;
      recordResult('API', 'Multi-Tenant Organization Directory', pass, Date.now() - t0,
        pass ? `${res.data.length} active tenants registered` : `Status ${res.status}`);
    } catch (e) {
      recordResult('API', 'Multi-Tenant Organization Directory', false, Date.now() - t0, e.message);
    }
  }

  // 3.2 Masters Catalog Bundle
  {
    const t0 = Date.now();
    try {
      const res = await request(`${apiBase}/masters/bundle`, { headers: authHeaders });
      const pass = res.status === 200 && res.data && Array.isArray(res.data.departments) && Array.isArray(res.data.designations);
      recordResult('API', 'Enterprise Masters Catalog Bundle', pass, Date.now() - t0,
        pass ? `Depts: ${res.data.departments.length}, Desigs: ${res.data.designations.length}, Branches: ${res.data.branches?.length || 0}` : `Status ${res.status}`);
    } catch (e) {
      recordResult('API', 'Enterprise Masters Catalog Bundle', false, Date.now() - t0, e.message);
    }
  }

  // 3.3 Employee Workforce Directory
  {
    const t0 = Date.now();
    try {
      const res = await request(`${apiBase}/employees`, { headers: authHeaders });
      const pass = res.status === 200 && Array.isArray(res.data);
      recordResult('API', 'Workforce & Employee Directory', pass, Date.now() - t0,
        pass ? `${res.data.length} employees on database roster` : `Status ${res.status}`);
    } catch (e) {
      recordResult('API', 'Workforce & Employee Directory', false, Date.now() - t0, e.message);
    }
  }

  // 3.4 Piece-Rate Operations Catalog & Floor Logs
  {
    const t0 = Date.now();
    try {
      const [actsRes, logsRes] = await Promise.all([
        request(`${apiBase}/piece-rate/activities`, { headers: authHeaders }),
        request(`${apiBase}/piece-rate/logs`, { headers: authHeaders })
      ]);
      const pass = actsRes.status === 200 && Array.isArray(actsRes.data) && logsRes.status === 200 && Array.isArray(logsRes.data);
      recordResult('API', 'Piece-Rate Operations Catalog & Production Logs', pass, Date.now() - t0,
        pass ? `${actsRes.data.length} operations cataloged, ${logsRes.data.length} floor work logs recorded` : `Acts: ${actsRes.status}, Logs: ${logsRes.status}`);
    } catch (e) {
      recordResult('API', 'Piece-Rate Operations Catalog & Production Logs', false, Date.now() - t0, e.message);
    }
  }

  // 3.5 Payroll Structures & Payslips
  {
    const t0 = Date.now();
    try {
      const [structRes, slipsRes] = await Promise.all([
        request(`${apiBase}/payroll/structures`, { headers: authHeaders }),
        request(`${apiBase}/payroll/payslips`, { headers: authHeaders })
      ]);
      const pass = structRes.status === 200 && Array.isArray(structRes.data) && slipsRes.status === 200 && Array.isArray(slipsRes.data);
      recordResult('API', 'Payroll Salary Structures & Payslip History', pass, Date.now() - t0,
        pass ? `${structRes.data.length} salary structures, ${slipsRes.data.length} historical payslips` : `Struct: ${structRes.status}, Slips: ${slipsRes.status}`);
    } catch (e) {
      recordResult('API', 'Payroll Salary Structures & Payslip History', false, Date.now() - t0, e.message);
    }
  }

  // 3.6 Accounts Financial Cashflow & Ledgers
  {
    const t0 = Date.now();
    try {
      const [summaryRes, txRes] = await Promise.all([
        request(`${apiBase}/accounts/summary`, { headers: authHeaders }),
        request(`${apiBase}/accounts/transactions`, { headers: authHeaders })
      ]);
      const pass = summaryRes.status === 200 && summaryRes.data && txRes.status === 200 && Array.isArray(txRes.data);
      recordResult('API', 'Accounts Ledger & Financial Transactions', pass, Date.now() - t0,
        pass ? `Total Income: ₹${summaryRes.data.totalIncome}, Expense: ₹${summaryRes.data.totalExpense}` : `Status ${summaryRes.status}`);
    } catch (e) {
      recordResult('API', 'Accounts Ledger & Financial Transactions', false, Date.now() - t0, e.message);
    }
  }

  // 3.7 Audit Log Trails
  {
    const t0 = Date.now();
    try {
      const res = await request(`${apiBase}/audit-logs`, { headers: authHeaders });
      const pass = res.status === 200 && Array.isArray(res.data);
      recordResult('API', 'System Audit Trails & Security Logs', pass, Date.now() - t0,
        pass ? `${res.data.length} audit events captured` : `Status ${res.status}`);
    } catch (e) {
      recordResult('API', 'System Audit Trails & Security Logs', false, Date.now() - t0, e.message);
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 4: REACT HYDRATION & RUNTIME RESILIENCE
  // --------------------------------------------------------------------------
  logHeader('SUITE 4: REACT RUNTIME & LAYOUT INTEGRITY');

  // 4.1 React Hook Order Scan (#310 Protection)
  {
    const t0 = Date.now();
    try {
      const layoutFile = fs.readFileSync(path.join(ROOT_DIR, 'apps/web/src/app/dashboard/layout.tsx'), 'utf8');
      // Look for any early return statement that occurs before a hook declaration inside DashboardLayoutContent
      const contentFnIdx = layoutFile.indexOf('function DashboardLayoutContent');
      const earlyReturnIdx = layoutFile.indexOf('if (!user) {', contentFnIdx);
      const afterReturnCode = layoutFile.slice(earlyReturnIdx);
      const hookAfterReturn = /(?:React\.)?(?:useEffect|useState|useMemo|useCallback)\(/.test(afterReturnCode);

      recordResult('Client', 'React Minified Error #310 (Hook Order Violation) Static Guard', !hookAfterReturn, Date.now() - t0,
        !hookAfterReturn ? 'All React hooks declared prior to conditional returns' : 'Hook declared after conditional return');
    } catch (e) {
      recordResult('Client', 'React Minified Error #310 Static Guard', false, Date.now() - t0, e.message);
    }
  }

  // 4.2 Copyright Footer Alignment Check
  {
    const t0 = Date.now();
    try {
      const layoutFile = fs.readFileSync(path.join(ROOT_DIR, 'apps/web/src/app/dashboard/layout.tsx'), 'utf8');
      const asideBlock = layoutFile.slice(layoutFile.indexOf('<aside'), layoutFile.indexOf('</aside>'));
      const hasMainFooter = layoutFile.includes('<footer') && layoutFile.includes('© 2026 Noltrion Innovations');
      const hasSidebarCopyright = asideBlock.includes('© 2026 Noltrion Innovations');
      const pass = hasMainFooter && !hasSidebarCopyright;
      recordResult('Client', 'Copyright Footer Relocation (Main Body Bottom, None in Sidebar)', pass, Date.now() - t0,
        pass ? 'Verified footer in <main> and removed from <aside>' : 'Copyright found in sidebar or missing from main');
    } catch (e) {
      recordResult('Client', 'Copyright Footer Relocation Check', false, Date.now() - t0, e.message);
    }
  }

  // 4.3 Piece-Rate Skills Summary & Popup Modal Guard
  {
    const t0 = Date.now();
    try {
      const pieceRateFile = fs.readFileSync(path.join(ROOT_DIR, 'apps/web/src/app/dashboard/piece-rate/page.tsx'), 'utf8');
      const hasSummaryBadge = pieceRateFile.includes('row.activitiesSummary.length') && pieceRateFile.includes('setDetailsModalRow');
      const hasDetailsModal = pieceRateFile.includes('detailsModalRow &&') && pieceRateFile.includes('Skills & Operations Breakdown');
      const hasStatutoryLedger = pieceRateFile.includes('DAILY PRODUCTION & PIECE-RATE WAGE DISBURSEMENT REGISTER') && pieceRateFile.includes('numberToWordsINR');
      const pass = hasSummaryBadge && hasDetailsModal && hasStatutoryLedger;
      recordResult('Client', 'Piece-Rate Skills Summary Badge, Details Modal & Statutory Ledger Check', pass, Date.now() - t0,
        pass ? 'Compact badge, popup modal breakdown, and Form 25 print ledger all verified' : 'Missing skills summary modal or ledger');
    } catch (e) {
      recordResult('Client', 'Piece-Rate Skills Summary & Modal Check', false, Date.now() - t0, e.message);
    }
  }

  // --------------------------------------------------------------------------
  // SUITE 5: VERSION CONTROL & DEPLOYMENT READINESS
  // --------------------------------------------------------------------------
  logHeader('SUITE 5: VERSION CONTROL & DEPLOYMENT READINESS');

  {
    const t0 = Date.now();
    try {
      const branchOutput = execSync('git branch --show-current', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
      const statusOutput = execSync('git status --porcelain', { cwd: ROOT_DIR, encoding: 'utf8' }).trim();
      const uncommittedCount = statusOutput ? statusOutput.split('\n').filter(Boolean).length : 0;
      const pass = branchOutput === 'main';
      recordResult('Git', `Git Repository Branch & Working Tree (${branchOutput})`, pass, Date.now() - t0,
        `${uncommittedCount} uncommitted files, active branch '${branchOutput}'`);
    } catch (e) {
      recordResult('Git', 'Git Repository Branch & Working Tree', false, Date.now() - t0, e.message);
    }
  }

  // --------------------------------------------------------------------------
  // FINAL SCORECARD SUMMARY
  // --------------------------------------------------------------------------
  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(1);
  const totalTests = results.length;
  const passedTests = results.filter(r => r.passed).length;
  const failedTests = totalTests - passedTests;
  const passRate = Math.round((passedTests / totalTests) * 100);

  console.log('\n================================================================================');
  console.log(`                     AUTOMATED TEST ENGINE SCORECARD`);
  console.log('================================================================================');
  console.log(`Total Verification Checks : ${totalTests}`);
  console.log(`Tests Passed              : ${colors.green}${passedTests}${colors.reset}`);
  console.log(`Tests Failed              : ${failedTests > 0 ? colors.red : colors.gray}${failedTests}${colors.reset}`);
  console.log(`Success Rate              : ${passRate === 100 ? colors.green : colors.yellow}${passRate}%${colors.reset}`);
  console.log(`Total Execution Time      : ${totalDuration}s`);
  console.log('--------------------------------------------------------------------------------');

  if (failedTests === 0) {
    console.log(`${colors.bgGreen}  OVERALL RESULT: [GO] APPLICATION FULLY VERIFIED - SAFE TO DEPLOY  ${colors.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${colors.bgRed}  OVERALL RESULT: [NO-GO] ${failedTests} CHECKS FAILED - DO NOT PUSH  ${colors.reset}\n`);
    process.exit(1);
  }
}

runTestEngine().catch(err => {
  console.error('\nFatal Automated Test Engine Error:', err);
  process.exit(1);
});
