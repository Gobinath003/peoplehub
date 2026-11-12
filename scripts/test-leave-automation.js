/**
 * End-to-End Automation Testing Suite: Tenant Admin Login & Leave Management Workflow
 *
 * Verifies the complete corporate Leave Management & Tenant Admin lifecycle:
 *  1. Super Admin provisioning of a tenant with custom module visibility (LEAVE enabled)
 *  2. Tenant Admin login (validates JWT, activeTenant, enabledModules, refresh token, invalid password guard)
 *  3. Leave Type Masters CRUD (create custom type, update quota & sync balances, delete unused type)
 *  4. Employee creation, Reporting Manager assignment, circular-hierarchy guard & Portal Login provisioning
 *  5. Balance sync & admin balance view (/leave/balances)
 *  6. End-User portal login (Employee Code), RBAC isolation, leave availability & applications (Full-Day, Half-Day, Overlap guard, Cancel refund, Self-approve block)
 *  7. Reporting Manager portal login (EMPLOYEE role), Approve & Reject decisions, and final leave balance reconciliation
 *  8. Clean teardown of temporary test tenant and users
 */

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/PeopleHub?schema=public',
    },
  },
});

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
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
        ...(options.headers || {}),
      },
    };

    if (dataStr) {
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(dataStr);
    }

    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch {
          parsed = body;
        }
        resolve({ status: res.statusCode, ok: res.statusCode >= 200 && res.statusCode < 300, data: parsed, raw: body });
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
    const res = await request(`http://localhost:${port}/api/v1/tenants`, { method: 'GET', timeout: 1500 });
    return res.status !== undefined && res.status > 0;
  } catch {
    return false;
  }
}

async function startIsolatedApiServer(port = 3098) {
  console.log(`${colors.yellow}  [API Server] Starting isolated NestJS backend on port ${port}...${colors.reset}`);
  const env = Object.assign({}, process.env, {
    PORT: String(port),
    NODE_ENV: 'development',
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/PeopleHub?schema=public',
    JWT_SECRET: process.env.JWT_SECRET || 'super-secret-jwt-access-key-change-in-production',
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'super-secret-jwt-refresh-key-change-in-production',
  });

  const apiProcess = spawn(process.execPath, ['apps/api/dist/main.js'], {
    cwd: path.resolve(__dirname, '..'),
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const procLogs = [];
  apiProcess.stdout.on('data', (d) => procLogs.push(d.toString()));
  apiProcess.stderr.on('data', (d) => procLogs.push(d.toString()));

  let exitedEarly = null;
  apiProcess.on('exit', (code) => {
    exitedEarly = code;
  });

  const start = Date.now();
  while (Date.now() - start < 20000) {
    if (exitedEarly !== null) {
      throw new Error(`API exited early with code ${exitedEarly}:\n${procLogs.join('')}`);
    }
    if (await isServerAlive(port)) {
      console.log(`${colors.green}  [API Server] NestJS backend online on port ${port}.${colors.reset}`);
      return { port, process: apiProcess, logs: procLogs };
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  apiProcess.kill('SIGTERM');
  throw new Error(`Timed out starting NestJS API server on port ${port}:\n${procLogs.join('')}`);
}

async function runLeaveAutomation() {
  console.log('\n' + '='.repeat(84));
  console.log(`   ${colors.bright}PEOPLEHUB AUTOMATION SUITE: TENANT ADMIN LOGIN & LEAVE MANAGEMENT${colors.reset}`);
  console.log(`   Timestamp: ${new Date().toLocaleString()}`);
  console.log('='.repeat(84) + '\n');

  const ts = Date.now();
  const slug = `leave-auto-${ts}`;
  const adminEmail = `hr.auto.${ts}@leave-test.com`;
  const adminPass = 'TenantAuto@123';
  const mgrEmail = `mgr.auto.${ts}@leave-test.com`;
  const mgrPass = 'MgrAuto@123';
  const empEmail = `emp.auto.${ts}@leave-test.com`;
  const empPass = 'EmpAuto@123';

  let serverInfo = null;
  let tenantId = null;
  let runError = null;
  const startedAt = new Date().toISOString();
  const results = [];

  function record(step, title, passed, details = '') {
    results.push({ step, title, passed, details });
    const mark = passed ? `${colors.green}✅ PASS${colors.reset}` : `${colors.red}❌ FAIL${colors.reset}`;
    console.log(`  ${mark} ${colors.bold}[Step ${step}]${colors.reset} ${title}`);
    if (details) {
      console.log(`         ${colors.gray}Details: ${details}${colors.reset}`);
    }
  }

  try {
    serverInfo = await startIsolatedApiServer(3098);
    const BASE = `http://localhost:${serverInfo.port}/api/v1`;

    const api = (endpoint, method = 'GET', body = null, token = null, tid = null) => {
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (tid) headers['x-tenant-id'] = tid;
      return request(`${BASE}${endpoint}`, { method, headers }, body);
    };

    // STEP 1: Super Admin Auth & Provision Tenant
    const saLogin = await api('/auth/login', 'POST', {
      email: 'admin@peoplehub.com',
      passwordHash: 'admin_pass',
    });
    assert.strictEqual(saLogin.status, 200, `Super Admin login failed: ${saLogin.raw}`);
    const saToken = saLogin.data.accessToken;

    const tenantRes = await api(
      '/tenants',
      'POST',
      {
        name: `Leave Auto Corp ${ts}`,
        slug,
        industry: 'CORPORATE',
        address: 'OMR IT Corridor, Chennai',
        adminFirstName: 'Kavita',
        adminLastName: 'Rao',
        adminEmail,
        adminPassword: adminPass,
        enabledModules: ['ORGANIZATION', 'EMPLOYEES', 'LEAVE', 'AUDIT'],
        enabledSalaryTypes: ['MONTHLY_FIXED', 'HOURLY'],
      },
      saToken
    );
    assert.strictEqual(tenantRes.status, 201, `Create tenant failed: ${tenantRes.raw}`);
    tenantId = tenantRes.data.tenant.id;
    record(1, 'Super Admin Login & Tenant Provisioning', true, `Tenant="${tenantRes.data.tenant.name}", id=${tenantId}`);

    // STEP 2: Tenant Admin Login (positive, module check, refresh token, wrong password guard)
    const badTaLogin = await api('/auth/login', 'POST', {
      email: adminEmail,
      passwordHash: 'WrongPassword!99',
    });
    assert.strictEqual(badTaLogin.status, 401, 'Invalid Tenant Admin credentials must return 401');

    const taLogin = await api('/auth/login', 'POST', {
      email: adminEmail,
      passwordHash: adminPass,
    });
    assert.strictEqual(taLogin.status, 200, `Tenant Admin login failed: ${taLogin.raw}`);
    assert.ok(taLogin.data.accessToken, 'Tenant Admin accessToken required');
    assert.ok(taLogin.data.refreshToken, 'Tenant Admin refreshToken required');
    assert.strictEqual(taLogin.data.activeTenant.id, tenantId);
    const mods = taLogin.data.enabledModules || [];
    assert(mods.includes('LEAVE') && mods.includes('EMPLOYEES') && !mods.includes('PAYROLL'), `Unexpected enabledModules: ${JSON.stringify(mods)}`);
    const taToken = taLogin.data.accessToken;

    const refreshRes = await api('/auth/refresh', 'POST', {
      refreshToken: taLogin.data.refreshToken,
    });
    assert.strictEqual(refreshRes.status, 200, `Tenant Admin refresh token failed: ${refreshRes.raw}`);
    assert.ok(refreshRes.data.accessToken, 'Refresh must return new accessToken');

    const activeTenantRes = await api('/tenants/active', 'GET', null, taToken, tenantId);
    assert.strictEqual(activeTenantRes.status, 200);
    assert.strictEqual(activeTenantRes.data.id, tenantId);
    record(2, 'Tenant Admin Login, Refresh Token & Module Scope', true, `Admin=${adminEmail}, Modules=[${mods.join(', ')}], Wrong-Pass Guard=401`);

    // STEP 3: Leave Type Masters CRUD
    const typesRes = await api('/leave/types', 'GET', null, taToken, tenantId);
    assert.strictEqual(typesRes.status, 200);
    const clType = typesRes.data.find((t) => t.code === 'CL');
    assert.ok(clType, 'Seeded CL leave type should exist');

    const createWell = await api(
      '/leave/types',
      'POST',
      {
        code: 'WELL',
        name: 'Wellness Leave',
        description: 'Mental recharge leave',
        annualQuota: 4,
        accrualType: 'ANNUAL_UPFRONT',
        carryForwardLimit: 0,
        allowHalfDay: true,
        isPaid: true,
        color: '#6366F1',
      },
      taToken,
      tenantId
    );
    assert.strictEqual(createWell.status, 201, `Create WELL failed: ${createWell.raw}`);
    const wellTypeId = createWell.data.id;

    const createTemp = await api(
      '/leave/types',
      'POST',
      { code: 'TEMP', name: 'Temporary Leave', annualQuota: 2 },
      taToken,
      tenantId
    );
    assert.strictEqual(createTemp.status, 201);
    const delTemp = await api(`/leave/types/${createTemp.data.id}`, 'DELETE', null, taToken, tenantId);
    assert.strictEqual(delTemp.status, 200, `Delete leave type failed: ${delTemp.raw}`);

    const updCl = await api(
      `/leave/types/${clType.id}`,
      'PUT',
      { annualQuota: 15, syncExistingBalances: true },
      taToken,
      tenantId
    );
    assert.strictEqual(updCl.status, 200);
    assert.strictEqual(updCl.data.annualQuota, 15);
    record(3, 'Leave Type Masters CRUD & Quota Sync', true, `Created WELL (4d), Updated CL 12d -> 15d, Deleted TEMP`);

    // STEP 4: Reporting Manager & Employee Setup + Circular Hierarchy Guard
    const mgrCreate = await api(
      '/employees',
      'POST',
      {
        employeeCode: 'MGR-AUTO-01',
        firstName: 'Meera',
        lastName: 'Nair',
        email: mgrEmail,
        department: 'Engineering',
        designation: 'Engineering Manager',
        salaryType: 'MONTHLY_FIXED',
        joiningDate: '2026-01-10',
        basicSalary: 55000,
        createPortalLogin: true,
        portalPassword: mgrPass,
        roleCode: 'EMPLOYEE',
      },
      taToken,
      tenantId
    );
    assert.strictEqual(mgrCreate.status, 201, `Create manager failed: ${mgrCreate.raw}`);
    const mgrId = mgrCreate.data.id;

    const empCreate = await api(
      '/employees',
      'POST',
      {
        employeeCode: 'EMP-AUTO-01',
        firstName: 'Arjun',
        lastName: 'Verma',
        email: empEmail,
        department: 'Engineering',
        designation: 'Software Engineer',
        salaryType: 'MONTHLY_FIXED',
        joiningDate: '2026-02-01',
        basicSalary: 38000,
      },
      taToken,
      tenantId
    );
    assert.strictEqual(empCreate.status, 201, `Create employee failed: ${empCreate.raw}`);
    const empId = empCreate.data.id;

    const assignMgr = await api(
      `/employees/${empId}`,
      'PUT',
      { reportingManagerId: mgrId },
      taToken,
      tenantId
    );
    assert.strictEqual(assignMgr.status, 200, `Assign manager failed: ${assignMgr.raw}`);
    assert.strictEqual(assignMgr.data.reportingManagerId, mgrId);

    const circularRes = await api(
      `/employees/${mgrId}`,
      'PUT',
      { reportingManagerId: empId },
      taToken,
      tenantId
    );
    assert.strictEqual(circularRes.status, 400, 'Circular reporting hierarchy must fail with 400');

    const provLogin = await api(
      `/employees/${empId}/portal-login`,
      'POST',
      { email: empEmail, password: empPass, roleCode: 'EMPLOYEE' },
      taToken,
      tenantId
    );
    assert.strictEqual(provLogin.status, 201, `Provision employee login failed: ${provLogin.raw}`);

    const syncRes = await api('/leave/balances/sync', 'POST', { year: 2026 }, taToken, tenantId);
    assert.strictEqual(syncRes.status, 201, `Sync balances failed: ${syncRes.raw}`);
    const balList = await api('/leave/balances?year=2026', 'GET', null, taToken, tenantId);
    assert.strictEqual(balList.status, 200);
    assert.ok(balList.data.length >= 2);
    record(4, 'Reporting Manager Assignment, Circular Guard & Portal Logins', true, `Assigned MGR-AUTO-01 -> EMP-AUTO-01, Circular Guard=400, Synced ${balList.data.length} balance records`);

    // STEP 5: End-User Login, Availability, Apply (Full, Half, Cancel, Overlap, Self-Approve Guard)
    const empLogin = await api('/auth/login', 'POST', {
      email: 'EMP-AUTO-01',
      passwordHash: empPass,
    });
    assert.strictEqual(empLogin.status, 200, `Employee login via code failed: ${empLogin.raw}`);
    const empToken = empLogin.data.accessToken;

    const rbacRes = await api('/leave/types', 'POST', { code: 'NOPE', name: 'Nope', annualQuota: 5 }, empToken, tenantId);
    assert.strictEqual(rbacRes.status, 403, 'End user must not create Leave Type Masters');

    const empWs1 = await api('/leave/workspace?year=2026', 'GET', null, empToken, tenantId);
    assert.strictEqual(empWs1.status, 200);
    assert.strictEqual(empWs1.data.reportingManager.name, 'Meera Nair');
    const clBal1 = empWs1.data.balances.find((b) => b.leaveTypeCode === 'CL');
    const wellBal1 = empWs1.data.balances.find((b) => b.leaveTypeCode === 'WELL');
    assert.strictEqual(clBal1.available, 15);
    assert.strictEqual(wellBal1.available, 4);

    // Apply 2-day CL
    const reqCl = await api(
      '/leave/requests',
      'POST',
      {
        leaveTypeId: clType.id,
        startDate: '2026-12-10',
        endDate: '2026-12-11',
        reason: 'Family function out of town',
        handoverNotes: 'Code handover completed',
      },
      empToken,
      tenantId
    );
    assert.strictEqual(reqCl.status, 201, `Apply 2-day CL failed: ${reqCl.raw}`);
    assert.strictEqual(reqCl.data.totalDays, 2);

    // Overlap check
    const overlapRes = await api(
      '/leave/requests',
      'POST',
      { leaveTypeId: clType.id, startDate: '2026-12-11', endDate: '2026-12-12', reason: 'Overlap test' },
      empToken,
      tenantId
    );
    assert.strictEqual(overlapRes.status, 409, 'Overlapping dates must fail with 409 Conflict');

    // Apply 0.5-day WELL
    const reqWell = await api(
      '/leave/requests',
      'POST',
      {
        leaveTypeId: wellTypeId,
        startDate: '2026-12-18',
        endDate: '2026-12-18',
        isHalfDay: true,
        halfDaySession: 'FIRST_HALF',
        reason: 'Morning health checkup',
      },
      empToken,
      tenantId
    );
    assert.strictEqual(reqWell.status, 201);
    assert.strictEqual(reqWell.data.totalDays, 0.5);

    // Apply 1-day CL & cancel it to verify pending refund
    const reqCancel = await api(
      '/leave/requests',
      'POST',
      { leaveTypeId: clType.id, startDate: '2026-12-22', endDate: '2026-12-22', reason: 'Personal errand' },
      empToken,
      tenantId
    );
    assert.strictEqual(reqCancel.status, 201);
    const cancelRes = await api(`/leave/requests/${reqCancel.data.id}/cancel`, 'POST', null, empToken, tenantId);
    assert.strictEqual(cancelRes.status, 201);
    assert.strictEqual(cancelRes.data.status, 'CANCELLED');

    const selfApprove = await api(
      `/leave/requests/${reqCl.data.id}/approve`,
      'POST',
      { remarks: 'Self-approve test' },
      empToken,
      tenantId
    );
    assert.strictEqual(selfApprove.status, 403, 'Employee cannot self-approve');
    record(5, 'End-User Login, Availability, Apply, Overlap & Cancel Refund', true, `Applied CL(2d), WELL(0.5d), Cancelled 1d; Overlap=409; RBAC/Self-Approve=403`);

    // STEP 6: Reporting Manager Login, Approve & Reject + Final Reconciliation
    const mgrLogin = await api('/auth/login', 'POST', {
      email: 'MGR-AUTO-01',
      passwordHash: mgrPass,
    });
    assert.strictEqual(mgrLogin.status, 200, `Manager login failed: ${mgrLogin.raw}`);
    const mgrToken = mgrLogin.data.accessToken;

    const mgrWs = await api('/leave/workspace?year=2026', 'GET', null, mgrToken, tenantId);
    assert.strictEqual(mgrWs.status, 200);
    assert.strictEqual(mgrWs.data.isManager, true);
    assert.strictEqual(mgrWs.data.directReportsCount, 1);
    assert.strictEqual(mgrWs.data.teamRequests.filter((r) => r.status === 'PENDING').length, 2);

    const approveRes = await api(
      `/leave/requests/${reqCl.data.id}/approve`,
      'POST',
      { remarks: 'Approved by Reporting Manager' },
      mgrToken,
      tenantId
    );
    assert.strictEqual(approveRes.status, 201);
    assert.strictEqual(approveRes.data.status, 'APPROVED');

    const rejectRes = await api(
      `/leave/requests/${reqWell.data.id}/reject`,
      'POST',
      { remarks: 'Sprint demo scheduled in morning slot' },
      mgrToken,
      tenantId
    );
    assert.strictEqual(rejectRes.status, 201);
    assert.strictEqual(rejectRes.data.status, 'REJECTED');

    const empWsFinal = await api('/leave/workspace?year=2026', 'GET', null, empToken, tenantId);
    const clFinal = empWsFinal.data.balances.find((b) => b.leaveTypeCode === 'CL');
    const wellFinal = empWsFinal.data.balances.find((b) => b.leaveTypeCode === 'WELL');
    assert.strictEqual(clFinal.used, 2);
    assert.strictEqual(clFinal.pending, 0);
    assert.strictEqual(clFinal.available, 13);
    assert.strictEqual(wellFinal.used, 0);
    assert.strictEqual(wellFinal.pending, 0);
    assert.strictEqual(wellFinal.available, 4);

    // Tenant Admin Org Register check
    const adminWs = await api('/leave/workspace?year=2026', 'GET', null, taToken, tenantId);
    assert.strictEqual(adminWs.status, 200);
    assert.strictEqual(adminWs.data.allRequests.length, 3);
    record(6, 'Reporting Manager Approve/Reject & Admin Register Reconciliation', true, `CL(2d) Approved -> avail 13/15, WELL(0.5d) Rejected -> avail 4/4, Admin Register=3 rows`);

    console.log('\n' + '='.repeat(84));
    console.log(`   ${colors.green}${colors.bright}OVERALL VERDICT: PASS (${results.length}/${results.length} Suites Verified)${colors.reset}`);
    console.log('='.repeat(84) + '\n');
  } catch (err) {
    runError = err;
    throw err;
  } finally {
    const logsDir = path.resolve(__dirname, '..', 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    const completedAt = new Date().toISOString();
    const passedCount = results.filter((r) => r.passed).length;
    const verdict = !runError && passedCount === 6 ? 'PASS' : 'FAIL';

    const jsonReport = {
      suite: 'PeopleHub Tenant Admin Login & Leave Management Automation',
      verdict,
      startedAt,
      completedAt,
      passedCount,
      totalSuites: 6,
      results,
      error: runError ? runError.message : null,
    };
    const jsonPath = path.join(logsDir, 'leave-automation-report.json');
    fs.writeFileSync(jsonPath, JSON.stringify(jsonReport, null, 2), 'utf8');

    const mdLines = [
      '# PeopleHub Automation Test Result — Tenant Admin Login & Leave Management',
      '',
      `- **Verdict**: **${verdict}** (${passedCount}/6 suites passed)`,
      `- **Started At**: ${startedAt}`,
      `- **Completed At**: ${completedAt}`,
      `- **Isolated API Port**: 3098`,
      '',
      '| Step | Test Suite | Status | Details |',
      '|---:|---|---|---|',
      ...results.map((r) => `| ${r.step} | ${r.title} | ${r.passed ? 'PASS' : 'FAIL'} | ${r.details} |`),
      ...(runError ? ['', `> **Failure**: \`${runError.message}\``] : []),
      '',
    ];
    const mdPath = path.join(logsDir, 'leave-automation-report.md');
    fs.writeFileSync(mdPath, mdLines.join('\n'), 'utf8');
    console.log(`${colors.cyan}  Test reports written to:\n    - ${mdPath}\n    - ${jsonPath}${colors.reset}`);

    if (tenantId) {
      await prisma.tenant.delete({ where: { id: tenantId } }).catch((err) => {
        console.error('Failed to clean test tenant:', err.message);
      });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, mgrEmail, empEmail] } },
    }).catch(() => {});
    await prisma.$disconnect();
    if (serverInfo?.process && !serverInfo.process.killed) {
      serverInfo.process.kill('SIGTERM');
    }
    console.log(`${colors.gray}  Cleanup & isolated API teardown complete.${colors.reset}`);
  }
}

runLeaveAutomation().catch((err) => {
  console.error(`\n${colors.red}LEAVE AUTOMATION FAILED:${colors.reset}`, err);
  process.exit(1);
});
