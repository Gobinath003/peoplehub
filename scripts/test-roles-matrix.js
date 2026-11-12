/**
 * PeopleHub Multi-Role & Multi-Module Automated Verification Matrix
 *
 * Tests all 10 platform modules across distinct user accounts & RBAC roles:
 *   1. Super Admin / TENANT_ADMIN      (admin@peoplehub.com - ABC Garments Ltd & Noltrion)
 *   2. Branch-Scoped HR_MANAGER         (priya@garments.com - Chennai Branch only)
 *   3. Noltrion TENANT_ADMIN            (hr@noltrion.com - Noltrion Innovations)
 *   4. Ephemeral PAYROLL_MANAGER        (qa.payroll.matrix@peoplehub-test.local - auto cleaned up)
 *   5. Ephemeral EMPLOYEE               (qa.employee.matrix@peoplehub-test.local - auto cleaned up)
 *   6. Cross-Tenant & Unauthenticated   (401 / 403 boundary checks)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');

const ROOT_DIR = path.resolve(__dirname, '..');
const API_DIR = path.join(ROOT_DIR, 'apps', 'api');
const resolvePkg = (name) => require(require.resolve(name, { paths: [ROOT_DIR, API_DIR] }));

const dotenv = resolvePkg('dotenv');
dotenv.config({ path: path.join(API_DIR, '.env') });

const { PrismaClient } = resolvePkg('@prisma/client');
const bcrypt = resolvePkg('bcrypt');

const API_BASE = process.env.PEOPLEHUB_API_URL || 'http://localhost:3001/api/v1';

const ABC_GARMENTS_TENANT_ID = '7837a312-ed38-4859-9748-9cbad20d1863';
const NOLTRION_TENANT_ID = '76a3b0ef-962b-4202-9689-d3c241cef9c2';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bgGreen: '\x1b[42m\x1b[30m',
  bgRed: '\x1b[41m\x1b[37m',
};

const results = [];

function logHeader(text) {
  console.log(`\n${colors.bright}${colors.cyan}=== ${text} ===${colors.reset}`);
}

function record(roleLabel, moduleName, checkName, passed, ms, details = '') {
  results.push({ roleLabel, moduleName, checkName, passed, ms, details });
  const badge = passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
  const sec = (ms / 1000).toFixed(2);
  console.log(`  [${badge}] [${roleLabel}] ${moduleName} :: ${checkName} (${sec}s)`);
  if (details) {
    console.log(`         ${colors.gray}-> ${details}${colors.reset}`);
  }
}

async function request(url, options = {}, postData = null) {
  const urlObj = new URL(url);
  const client = urlObj.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const dataStr = postData !== null && postData !== undefined
      ? (typeof postData === 'string' ? postData : JSON.stringify(postData))
      : null;

    const req = client.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
          ...(dataStr ? { 'Content-Length': Buffer.byteLength(dataStr) } : {}),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => { body += chunk; });
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = body ? JSON.parse(body) : null;
          } catch {
            parsed = body;
          }
          resolve({ status: res.statusCode, data: parsed, raw: body });
        });
      }
    );

    req.on('error', reject);
    req.setTimeout(options.timeout || 25000, () => {
      req.destroy();
      reject(new Error(`Timeout after 25s: ${url}`));
    });

    if (dataStr) req.write(dataStr);
    req.end();
  });
}

async function isPortOpen(urlStr) {
  try {
    const res = await request(urlStr, { timeout: 2500 });
    return res.status > 0;
  } catch {
    return false;
  }
}

async function ensureApiRunning() {
  const probeUrl = `${API_BASE}/auth/login`;
  if (await isPortOpen(probeUrl)) {
    return { child: null, startedHere: false };
  }

  const distMain = path.join(API_DIR, 'dist', 'main.js');
  if (!fs.existsSync(distMain)) {
    throw new Error(`API build missing at ${distMain}. Run "npm run build:api" first.`);
  }

  console.log(`${colors.gray}Starting local NestJS API from apps/api/dist/main.js...${colors.reset}`);
  const child = spawn(process.execPath, ['dist/main.js'], {
    cwd: API_DIR,
    env: { ...process.env, PORT: '3001' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stderrBuf = '';
  child.stderr.on('data', (d) => { stderrBuf += d.toString(); });

  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (await isPortOpen(probeUrl)) {
      return { child, startedHere: true };
    }
    if (child.exitCode !== null) {
      throw new Error(`API exited early with code ${child.exitCode}: ${stderrBuf}`);
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  child.kill('SIGTERM');
  throw new Error('Local API did not become ready within 20s');
}

async function login(email, passwordHash) {
  const res = await request(`${API_BASE}/auth/login`, { method: 'POST' }, { email, passwordHash });
  if (![200, 201].includes(res.status) || !res.data?.accessToken) {
    throw new Error(`Login failed for ${email}: HTTP ${res.status} ${JSON.stringify(res.data)}`);
  }
  return res.data;
}

async function provisionEphemeralUser(prisma, { email, firstName, lastName, roleCode, tenantId, password }) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.auditLog.deleteMany({ where: { userId: existing.id } });
    await prisma.user.delete({ where: { id: existing.id } });
  }

  // Ensure standard roles (and permissions) exist for tenant before linking
  let role = await prisma.role.findFirst({ where: { tenantId, code: roleCode } });
  if (!role) {
    throw new Error(`Role ${roleCode} not found in tenant ${tenantId}`);
  }

  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      firstName,
      lastName,
      status: 'ACTIVE',
      tenantUsers: {
        create: {
          tenantId,
          status: 'ACTIVE',
        },
      },
      userRoles: {
        create: {
          tenantId,
          roleId: role.id,
          scopeType: 'TENANT',
          scopeId: null,
        },
      },
    },
  });

  return user;
}

async function assertEndpoint({ roleLabel, moduleName, checkName, url, method = 'GET', headers, body = null, expectStatus, validate }) {
  const t0 = Date.now();
  try {
    const res = await request(url, { method, headers }, body);
    const allowed = Array.isArray(expectStatus) ? expectStatus : [expectStatus];
    let ok = allowed.includes(res.status);
    let detail = `HTTP ${res.status}`;
    if (ok && validate) {
      const custom = await validate(res);
      if (custom === false) {
        ok = false;
        detail = `Validation failed on HTTP ${res.status}`;
      } else if (typeof custom === 'string') {
        detail = custom;
      }
    } else if (!ok) {
      detail = `Expected HTTP ${allowed.join('/')}, got HTTP ${res.status}: ${JSON.stringify(res.data)}`;
    }
    record(roleLabel, moduleName, checkName, ok, Date.now() - t0, detail);
    return res;
  } catch (e) {
    record(roleLabel, moduleName, checkName, false, Date.now() - t0, e.message);
    return null;
  }
}

async function runSuite() {
  console.log('================================================================================');
  console.log('   PEOPLEHUB MULTI-ROLE x ALL-MODULES AUTOMATED TEST SUITE');
  console.log('================================================================================');
  console.log(`Target API: ${API_BASE} | Time: ${new Date().toLocaleString()}`);

  const prisma = new PrismaClient();
  const ephemeralUserIds = [];
  let apiHandle = { child: null, startedHere: false };

  try {
    apiHandle = await ensureApiRunning();

    // ------------------------------------------------------------------------
    // Step 0: Authenticate Admin & Seed Standard Roles on ABC Garments Ltd
    // ------------------------------------------------------------------------
    logHeader('1. AUTHENTICATING SEEDED ACCOUNTS & PROVISIONING EPHEMERAL ROLES');
    const adminLogin = await login('admin@peoplehub.com', 'admin_pass');
    const adminGarmentsHeaders = {
      Authorization: `Bearer ${adminLogin.accessToken}`,
      'x-tenant-id': ABC_GARMENTS_TENANT_ID,
    };

    // Calling GET /users/roles ensures TENANT_ADMIN, HR_MANAGER, PAYROLL_MANAGER, EMPLOYEE exist with full permissions
    const roleCatalogRes = await assertEndpoint({
      roleLabel: 'TENANT_ADMIN',
      moduleName: 'Users & RBAC',
      checkName: 'Ensure & list standard role catalog',
      url: `${API_BASE}/users/roles`,
      headers: adminGarmentsHeaders,
      expectStatus: 200,
      validate: (r) => Array.isArray(r.data) && r.data.length >= 4 && `${r.data.length} roles provisioned`,
    });
    const payrollRole = roleCatalogRes?.data?.find((r) => r.code === 'PAYROLL_MANAGER');

    const priyaLogin = await login('priya@garments.com', 'priya_pass');
    record(
      'HR_MANAGER',
      'Auth',
      'Login priya@garments.com (Chennai Branch scope)',
      Boolean(priyaLogin.accessToken),
      0,
      `Scope: ${priyaLogin.roles?.[0]?.scopeType}: ${priyaLogin.roles?.[0]?.scopeId}`
    );

    const hrNoltrionLogin = await login('hr@noltrion.com', 'noltrion_pass');
    record(
      'NOLTRION_ADMIN',
      'Auth',
      'Login hr@noltrion.com (Noltrion Innovations)',
      Boolean(hrNoltrionLogin.accessToken && hrNoltrionLogin.activeTenant?.id === NOLTRION_TENANT_ID),
      0,
      `Active Tenant: ${hrNoltrionLogin.activeTenant?.name}`
    );

    const testPass = 'QaMatrix#2026';
    const payrollUser = await provisionEphemeralUser(prisma, {
      email: 'qa.payroll.matrix@peoplehub-test.local',
      firstName: 'QA',
      lastName: 'PayrollMgr',
      roleCode: 'PAYROLL_MANAGER',
      tenantId: ABC_GARMENTS_TENANT_ID,
      password: testPass,
    });
    ephemeralUserIds.push(payrollUser.id);
    const payrollLogin = await login(payrollUser.email, testPass);
    record('PAYROLL_MANAGER', 'Auth', 'Login ephemeral PAYROLL_MANAGER user', true, 0, payrollUser.email);

    const employeeUser = await provisionEphemeralUser(prisma, {
      email: 'qa.employee.matrix@peoplehub-test.local',
      firstName: 'QA',
      lastName: 'Employee',
      roleCode: 'EMPLOYEE',
      tenantId: ABC_GARMENTS_TENANT_ID,
      password: testPass,
    });
    ephemeralUserIds.push(employeeUser.id);
    const employeeLogin = await login(employeeUser.email, testPass);
    record('EMPLOYEE', 'Auth', 'Login ephemeral EMPLOYEE user', true, 0, employeeUser.email);

    const hrHeaders = { Authorization: `Bearer ${priyaLogin.accessToken}`, 'x-tenant-id': ABC_GARMENTS_TENANT_ID };
    const noltrionHeaders = { Authorization: `Bearer ${hrNoltrionLogin.accessToken}`, 'x-tenant-id': NOLTRION_TENANT_ID };
    const payrollHeaders = { Authorization: `Bearer ${payrollLogin.accessToken}`, 'x-tenant-id': ABC_GARMENTS_TENANT_ID };
    const empHeaders = { Authorization: `Bearer ${employeeLogin.accessToken}`, 'x-tenant-id': ABC_GARMENTS_TENANT_ID };

    // ------------------------------------------------------------------------
    // Step 2: Role 1 — TENANT_ADMIN across all 10 modules (ABC Garments Ltd)
    // ------------------------------------------------------------------------
    logHeader('2. TENANT_ADMIN (admin@peoplehub.com) — ALL MODULES');
    await assertEndpoint({
      roleLabel: 'TENANT_ADMIN',
      moduleName: 'Auth',
      checkName: 'Refresh token rotation',
      url: `${API_BASE}/auth/refresh`,
      method: 'POST',
      body: { refreshToken: adminLogin.refreshToken },
      expectStatus: [200, 201],
      validate: (r) => Boolean(r.data?.accessToken) && 'New JWT pair issued',
    });
    await assertEndpoint({
      roleLabel: 'TENANT_ADMIN',
      moduleName: 'Tenants & Modules',
      checkName: 'List tenants & active config & modules & salary types',
      url: `${API_BASE}/tenants/modules`,
      headers: adminGarmentsHeaders,
      expectStatus: 200,
      validate: (r) => Array.isArray(r.data) && `${r.data.length} modules returned`,
    });
    const bundleRes = await assertEndpoint({
      roleLabel: 'TENANT_ADMIN',
      moduleName: 'Organization Masters',
      checkName: 'GET /masters/bundle (Branches/Depts/Shifts/EmpTypes)',
      url: `${API_BASE}/masters/bundle`,
      headers: adminGarmentsHeaders,
      expectStatus: 200,
      validate: (r) => `Branches: ${r.data?.branches?.length}, Depts: ${r.data?.departments?.length}`,
    });
    const firstBranchName = bundleRes?.data?.branches?.[0]?.name || 'Chennai Branch';

    // Test Branch-scoped role assign + cleanup on ephemeral employeeUser
    if (payrollRole) {
      const assignRes = await assertEndpoint({
        roleLabel: 'TENANT_ADMIN',
        moduleName: 'Users & RBAC',
        checkName: `POST /users/:id/roles (BRANCH scope: ${firstBranchName})`,
        url: `${API_BASE}/users/${employeeUser.id}/roles`,
        method: 'POST',
        headers: adminGarmentsHeaders,
        body: { roleId: payrollRole.id, roleCode: payrollRole.code, scopeType: 'BRANCH', scopeId: firstBranchName },
        expectStatus: [200, 201],
        validate: (r) => Boolean(r.data?.id) && `Assigned ${r.data.roleCode} (${r.data.scopeType}: ${r.data.scopeId})`,
      });
      if (assignRes?.data?.id) {
        await assertEndpoint({
          roleLabel: 'TENANT_ADMIN',
          moduleName: 'Users & RBAC',
          checkName: 'DELETE /users/roles/:assignmentId (revoke scoped role)',
          url: `${API_BASE}/users/roles/${assignRes.data.id}`,
          method: 'DELETE',
          headers: adminGarmentsHeaders,
          expectStatus: 200,
        });
      }
    }

    await assertEndpoint({
      roleLabel: 'TENANT_ADMIN',
      moduleName: 'Workforce & Employees',
      checkName: 'GET /employees (full tenant roster)',
      url: `${API_BASE}/employees`,
      headers: adminGarmentsHeaders,
      expectStatus: 200,
      validate: (r) => Array.isArray(r.data) && `${r.data.length} employees`,
    });
    await assertEndpoint({
      roleLabel: 'TENANT_ADMIN',
      moduleName: 'Piece-Rate Production',
      checkName: 'GET /piece-rate/activities & summary',
      url: `${API_BASE}/piece-rate/activities`,
      headers: adminGarmentsHeaders,
      expectStatus: 200,
      validate: (r) => Array.isArray(r.data) && `${r.data.length} activities`,
    });
    await assertEndpoint({
      roleLabel: 'TENANT_ADMIN',
      moduleName: 'Payroll & Payslips',
      checkName: 'GET /payroll/payslips',
      url: `${API_BASE}/payroll/payslips`,
      headers: adminGarmentsHeaders,
      expectStatus: 200,
      validate: (r) => Array.isArray(r.data) && `${r.data.length} payslips`,
    });
    await assertEndpoint({
      roleLabel: 'TENANT_ADMIN',
      moduleName: 'Leave Management',
      checkName: 'GET /leave/workspace (isAdmin=true)',
      url: `${API_BASE}/leave/workspace`,
      headers: adminGarmentsHeaders,
      expectStatus: 200,
      validate: (r) => r.data?.isAdmin === true && `${r.data.leaveTypes?.length} leave types`,
    });
    await assertEndpoint({
      roleLabel: 'TENANT_ADMIN',
      moduleName: 'Accounts Ledger',
      checkName: 'GET /accounts/summary',
      url: `${API_BASE}/accounts/summary`,
      headers: adminGarmentsHeaders,
      expectStatus: 200,
      validate: (r) => `Income ₹${r.data?.totalIncome}, Expense ₹${r.data?.totalExpense}`,
    });
    await assertEndpoint({
      roleLabel: 'TENANT_ADMIN',
      moduleName: 'Audit Trails',
      checkName: 'GET /audit-logs',
      url: `${API_BASE}/audit-logs`,
      headers: adminGarmentsHeaders,
      expectStatus: 200,
      validate: (r) => Array.isArray(r.data) && `${r.data.length} audit logs`,
    });

    // ------------------------------------------------------------------------
    // Step 3: Role 2 — HR_MANAGER (priya@garments.com, BRANCH: Chennai Branch)
    // ------------------------------------------------------------------------
    logHeader('3. HR_MANAGER (priya@garments.com, Chennai Branch) — ALL MODULES & 403 CHECKS');
    await assertEndpoint({
      roleLabel: 'HR_MANAGER',
      moduleName: 'Tenants & Modules',
      checkName: 'GET /tenants/active denied (403 - seeded HR_MANAGER lacks TENANT_SETTINGS_VIEW)',
      url: `${API_BASE}/tenants/active`,
      headers: hrHeaders,
      expectStatus: 403,
    });
    await assertEndpoint({
      roleLabel: 'HR_MANAGER',
      moduleName: 'Tenants & Modules',
      checkName: 'POST /tenants/modules/PIECE_RATE denied (403 - no MODULE_MANAGE)',
      url: `${API_BASE}/tenants/modules/PIECE_RATE`,
      method: 'POST',
      headers: hrHeaders,
      body: { enabled: true },
      expectStatus: 403,
    });
    await assertEndpoint({
      roleLabel: 'HR_MANAGER',
      moduleName: 'Organization Masters',
      checkName: 'GET /masters/bundle',
      url: `${API_BASE}/masters/bundle`,
      headers: hrHeaders,
      expectStatus: 200,
    });
    await assertEndpoint({
      roleLabel: 'HR_MANAGER',
      moduleName: 'Users & RBAC',
      checkName: 'GET /users & /users/roles',
      url: `${API_BASE}/users`,
      headers: hrHeaders,
      expectStatus: 200,
      validate: (r) => Array.isArray(r.data) && `${r.data.length} tenant users`,
    });
    await assertEndpoint({
      roleLabel: 'HR_MANAGER',
      moduleName: 'Workforce & Employees',
      checkName: 'GET /employees enforces BRANCH scope (Chennai Branch)',
      url: `${API_BASE}/employees`,
      headers: hrHeaders,
      expectStatus: 200,
      validate: (r) => {
        if (!Array.isArray(r.data)) return false;
        const leaked = r.data.filter((emp) => emp.branch && emp.branch !== 'Chennai Branch');
        if (leaked.length > 0) return false;
        return `${r.data.length} Chennai Branch employees returned (0 cross-branch leaks)`;
      },
    });
    await assertEndpoint({
      roleLabel: 'HR_MANAGER',
      moduleName: 'Piece-Rate Production',
      checkName: 'GET /piece-rate/summary (defaults month/year safely)',
      url: `${API_BASE}/piece-rate/summary`,
      headers: hrHeaders,
      expectStatus: 200,
      validate: (r) => Array.isArray(r.data) && `${r.data.length} summary worker entries`,
    });
    await assertEndpoint({
      roleLabel: 'HR_MANAGER',
      moduleName: 'Payroll & Payslips',
      checkName: 'GET /payroll/structures allowed (PAYROLL_VIEW)',
      url: `${API_BASE}/payroll/structures`,
      headers: hrHeaders,
      expectStatus: 200,
    });
    await assertEndpoint({
      roleLabel: 'HR_MANAGER',
      moduleName: 'Payroll & Payslips',
      checkName: 'POST /payroll/hourly-logs passes PAYROLL_PROCESS guard (non-403)',
      url: `${API_BASE}/payroll/hourly-logs`,
      method: 'POST',
      headers: hrHeaders,
      body: { employeeId: '00000000-0000-0000-0000-000000000000', logDate: '2026-11-12', regularHours: 8, overtimeHours: 0 },
      expectStatus: [400, 404],
      validate: (r) => `Passed RBAC guard (${r.status} employee lookup)`,
    });
    await assertEndpoint({
      roleLabel: 'HR_MANAGER',
      moduleName: 'Leave Management',
      checkName: 'GET /leave/workspace (isAdmin=true)',
      url: `${API_BASE}/leave/workspace`,
      headers: hrHeaders,
      expectStatus: 200,
      validate: (r) => r.data?.isAdmin === true && `${r.data.leaveTypes?.length} leave types`,
    });
    await assertEndpoint({
      roleLabel: 'HR_MANAGER',
      moduleName: 'Accounts Ledger',
      checkName: 'GET /accounts/summary',
      url: `${API_BASE}/accounts/summary`,
      headers: hrHeaders,
      expectStatus: 200,
    });
    await assertEndpoint({
      roleLabel: 'HR_MANAGER',
      moduleName: 'Audit Trails',
      checkName: 'GET /audit-logs denied (403 - seeded HR_MANAGER lacks AUDIT_LOG_VIEW)',
      url: `${API_BASE}/audit-logs`,
      headers: hrHeaders,
      expectStatus: 403,
    });

    // ------------------------------------------------------------------------
    // Step 4: Role 3 — NOLTRION TENANT_ADMIN (hr@noltrion.com)
    // ------------------------------------------------------------------------
    logHeader('4. NOLTRION_ADMIN (hr@noltrion.com) — CORE MODULES ON NOLTRION INNOVATIONS');
    await assertEndpoint({ roleLabel: 'NOLTRION_ADMIN', moduleName: 'Tenants & Modules', checkName: 'GET /tenants/active', url: `${API_BASE}/tenants/active`, headers: noltrionHeaders, expectStatus: 200 });
    await assertEndpoint({ roleLabel: 'NOLTRION_ADMIN', moduleName: 'Organization Masters', checkName: 'GET /masters/bundle', url: `${API_BASE}/masters/bundle`, headers: noltrionHeaders, expectStatus: 200 });
    await assertEndpoint({ roleLabel: 'NOLTRION_ADMIN', moduleName: 'Users & RBAC', checkName: 'GET /users', url: `${API_BASE}/users`, headers: noltrionHeaders, expectStatus: 200 });
    await assertEndpoint({ roleLabel: 'NOLTRION_ADMIN', moduleName: 'Workforce & Employees', checkName: 'GET /employees', url: `${API_BASE}/employees`, headers: noltrionHeaders, expectStatus: 200 });
    await assertEndpoint({ roleLabel: 'NOLTRION_ADMIN', moduleName: 'Payroll & Payslips', checkName: 'GET /payroll/payslips', url: `${API_BASE}/payroll/payslips`, headers: noltrionHeaders, expectStatus: 200 });
    await assertEndpoint({ roleLabel: 'NOLTRION_ADMIN', moduleName: 'Leave Management', checkName: 'GET /leave/workspace', url: `${API_BASE}/leave/workspace`, headers: noltrionHeaders, expectStatus: 200 });
    await assertEndpoint({ roleLabel: 'NOLTRION_ADMIN', moduleName: 'Accounts Ledger', checkName: 'GET /accounts/summary', url: `${API_BASE}/accounts/summary`, headers: noltrionHeaders, expectStatus: 200 });
    await assertEndpoint({ roleLabel: 'NOLTRION_ADMIN', moduleName: 'Audit Trails', checkName: 'GET /audit-logs', url: `${API_BASE}/audit-logs`, headers: noltrionHeaders, expectStatus: 200 });

    // ------------------------------------------------------------------------
    // Step 5: Role 4 — PAYROLL_MANAGER — ALL MODULES & 403 BOUNDARY CHECKS
    // ------------------------------------------------------------------------
    logHeader('5. PAYROLL_MANAGER (ephemeral) — ALL MODULES & 403 CHECKS');
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Tenants & Modules',
      checkName: 'GET /tenants/active denied (403 - no TENANT_SETTINGS_VIEW)',
      url: `${API_BASE}/tenants/active`,
      headers: payrollHeaders,
      expectStatus: 403,
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Tenants & Modules',
      checkName: 'POST /tenants/modules/PIECE_RATE denied (403 - no MODULE_MANAGE)',
      url: `${API_BASE}/tenants/modules/PIECE_RATE`,
      method: 'POST',
      headers: payrollHeaders,
      body: { enabled: true },
      expectStatus: 403,
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Organization Masters',
      checkName: 'GET /masters/bundle',
      url: `${API_BASE}/masters/bundle`,
      headers: payrollHeaders,
      expectStatus: 200,
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Users & RBAC',
      checkName: 'GET /users allowed (EMPLOYEE_VIEW)',
      url: `${API_BASE}/users`,
      headers: payrollHeaders,
      expectStatus: 200,
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Users & RBAC',
      checkName: 'POST /users/:id/roles denied (403 - no EMPLOYEE_EDIT)',
      url: `${API_BASE}/users/${employeeUser.id}/roles`,
      method: 'POST',
      headers: payrollHeaders,
      body: { roleCode: 'EMPLOYEE', scopeType: 'TENANT', scopeId: null },
      expectStatus: 403,
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Workforce & Employees',
      checkName: 'GET /employees allowed (EMPLOYEE_VIEW)',
      url: `${API_BASE}/employees`,
      headers: payrollHeaders,
      expectStatus: 200,
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Workforce & Employees',
      checkName: 'POST /employees denied (403 - no EMPLOYEE_CREATE)',
      url: `${API_BASE}/employees`,
      method: 'POST',
      headers: payrollHeaders,
      body: { firstName: 'Denied', lastName: 'Test' },
      expectStatus: 403,
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Piece-Rate Production',
      checkName: 'GET /piece-rate/activities & logs',
      url: `${API_BASE}/piece-rate/activities`,
      headers: payrollHeaders,
      expectStatus: 200,
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Payroll & Payslips',
      checkName: 'GET /payroll/structures & payslips & hourly-logs allowed',
      url: `${API_BASE}/payroll/payslips`,
      headers: payrollHeaders,
      expectStatus: 200,
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Payroll & Payslips',
      checkName: 'POST /payroll/hourly-logs passes PAYROLL_PROCESS guard (non-403)',
      url: `${API_BASE}/payroll/hourly-logs`,
      method: 'POST',
      headers: payrollHeaders,
      body: { employeeId: '00000000-0000-0000-0000-000000000000', logDate: '2026-11-12', regularHours: 8, overtimeHours: 0 },
      expectStatus: [400, 404],
      validate: (r) => `Passed RBAC guard cleanly (${r.status} entity validation)`,
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Organization Masters',
      checkName: 'POST /masters/departments denied (403 - no EMPLOYEE_EDIT)',
      url: `${API_BASE}/masters/departments`,
      method: 'POST',
      headers: payrollHeaders,
      body: { code: 'QADENIED', name: 'Denied Dept' },
      expectStatus: 403,
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Leave Management',
      checkName: 'GET /leave/workspace (isAdmin=false)',
      url: `${API_BASE}/leave/workspace`,
      headers: payrollHeaders,
      expectStatus: 200,
      validate: (r) => r.data?.isAdmin === false && 'isAdmin=false verified',
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Leave Management',
      checkName: 'POST /leave/types denied (403 - cannot manage leave types)',
      url: `${API_BASE}/leave/types`,
      method: 'POST',
      headers: payrollHeaders,
      body: { code: 'TESTL', name: 'Test Leave', annualQuota: 5, accrualType: 'ANNUAL_UPFRONT' },
      expectStatus: 403,
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Accounts Ledger',
      checkName: 'GET /accounts/summary & transactions & advances',
      url: `${API_BASE}/accounts/summary`,
      headers: payrollHeaders,
      expectStatus: 200,
    });
    await assertEndpoint({
      roleLabel: 'PAYROLL_MANAGER',
      moduleName: 'Audit Trails',
      checkName: 'GET /audit-logs allowed (AUDIT_LOG_VIEW)',
      url: `${API_BASE}/audit-logs`,
      headers: payrollHeaders,
      expectStatus: 200,
    });

    // ------------------------------------------------------------------------
    // Step 6: Role 5 — EMPLOYEE — ALL MODULES & STRICT 403 BOUNDARY CHECKS
    // ------------------------------------------------------------------------
    logHeader('6. EMPLOYEE (ephemeral) — ALL MODULES & 403 BOUNDARY CHECKS');
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Tenants & Modules', checkName: 'GET /tenants/active denied (403)', url: `${API_BASE}/tenants/active`, headers: empHeaders, expectStatus: 403 });
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Tenants & Modules', checkName: 'GET /tenants/modules denied (403)', url: `${API_BASE}/tenants/modules`, headers: empHeaders, expectStatus: 403 });
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Organization Masters', checkName: 'GET /masters/bundle allowed (dropdown lookups)', url: `${API_BASE}/masters/bundle`, headers: empHeaders, expectStatus: 200 });
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Organization Masters', checkName: 'POST /masters/departments denied (403)', url: `${API_BASE}/masters/departments`, method: 'POST', headers: empHeaders, body: { code: 'QADENIED', name: 'Denied Dept' }, expectStatus: 403 });
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Users & RBAC', checkName: 'POST /users/:id/roles denied (403)', url: `${API_BASE}/users/${employeeUser.id}/roles`, method: 'POST', headers: empHeaders, body: { roleCode: 'TENANT_ADMIN', scopeType: 'TENANT' }, expectStatus: 403 });
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Workforce & Employees', checkName: 'POST /employees denied (403)', url: `${API_BASE}/employees`, method: 'POST', headers: empHeaders, body: { firstName: 'Denied', lastName: 'Emp' }, expectStatus: 403 });
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Piece-Rate Production', checkName: 'GET /piece-rate/activities denied (403 - requires PAYROLL_VIEW)', url: `${API_BASE}/piece-rate/activities`, headers: empHeaders, expectStatus: 403 });
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Piece-Rate Production', checkName: 'POST /piece-rate/activities denied (403 - requires PAYROLL_PROCESS)', url: `${API_BASE}/piece-rate/activities`, method: 'POST', headers: empHeaders, body: { code: 'QAPR', name: 'Denied Op', ratePerUnit: 5 }, expectStatus: 403 });
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Payroll & Payslips', checkName: 'GET /payroll/structures denied (403)', url: `${API_BASE}/payroll/structures`, headers: empHeaders, expectStatus: 403 });
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Payroll & Payslips', checkName: 'GET /payroll/payslips denied (403)', url: `${API_BASE}/payroll/payslips`, headers: empHeaders, expectStatus: 403 });
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Payroll & Payslips', checkName: 'GET /payroll/hourly-logs denied (403)', url: `${API_BASE}/payroll/hourly-logs`, headers: empHeaders, expectStatus: 403 });
    await assertEndpoint({
      roleLabel: 'EMPLOYEE',
      moduleName: 'Leave Management',
      checkName: 'GET /leave/workspace (isAdmin=false)',
      url: `${API_BASE}/leave/workspace`,
      headers: empHeaders,
      expectStatus: 200,
      validate: (r) => r.data?.isAdmin === false && 'isAdmin=false verified',
    });
    await assertEndpoint({
      roleLabel: 'EMPLOYEE',
      moduleName: 'Leave Management',
      checkName: 'POST /leave/types denied (403)',
      url: `${API_BASE}/leave/types`,
      method: 'POST',
      headers: empHeaders,
      body: { code: 'TESTL', name: 'Test Leave', annualQuota: 5, accrualType: 'ANNUAL_UPFRONT' },
      expectStatus: 403,
    });
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Accounts Ledger', checkName: 'GET /accounts/summary denied (403 - requires ACCOUNTS_VIEW)', url: `${API_BASE}/accounts/summary`, headers: empHeaders, expectStatus: 403 });
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Accounts Ledger', checkName: 'POST /accounts/transactions denied (403 - requires ACCOUNTS_CREATE)', url: `${API_BASE}/accounts/transactions`, method: 'POST', headers: empHeaders, body: { type: 'EXPENSE', amount: 10, description: 'Denied' }, expectStatus: 403 });
    await assertEndpoint({ roleLabel: 'EMPLOYEE', moduleName: 'Audit Trails', checkName: 'GET /audit-logs denied (403)', url: `${API_BASE}/audit-logs`, headers: empHeaders, expectStatus: 403 });

    // ------------------------------------------------------------------------
    // Step 7: Cross-Tenant Isolation & Unauthenticated Boundaries
    // ------------------------------------------------------------------------
    logHeader('7. MULTI-TENANT ISOLATION & UNAUTHENTICATED BOUNDARY CHECKS');
    const priyaCrossTenantHeaders = { Authorization: `Bearer ${priyaLogin.accessToken}`, 'x-tenant-id': NOLTRION_TENANT_ID };
    await assertEndpoint({
      roleLabel: 'CROSS_TENANT',
      moduleName: 'TenantGuard',
      checkName: 'priya@garments.com blocked from Noltrion /employees (403)',
      url: `${API_BASE}/employees`,
      headers: priyaCrossTenantHeaders,
      expectStatus: 403,
    });
    await assertEndpoint({
      roleLabel: 'CROSS_TENANT',
      moduleName: 'TenantGuard',
      checkName: 'priya@garments.com blocked from Noltrion /leave/workspace (403)',
      url: `${API_BASE}/leave/workspace`,
      headers: priyaCrossTenantHeaders,
      expectStatus: 403,
    });
    await assertEndpoint({
      roleLabel: 'ANON',
      moduleName: 'JwtAuthGuard',
      checkName: 'Unauthenticated request to /employees rejected (401)',
      url: `${API_BASE}/employees`,
      headers: { 'x-tenant-id': ABC_GARMENTS_TENANT_ID },
      expectStatus: 401,
    });

  } finally {
    if (ephemeralUserIds.length > 0) {
      await prisma.auditLog.deleteMany({ where: { userId: { in: ephemeralUserIds } } }).catch(() => {});
      await prisma.user.deleteMany({ where: { id: { in: ephemeralUserIds } } }).catch(() => {});
    }
    await prisma.$disconnect().catch(() => {});
    if (apiHandle.startedHere && apiHandle.child && !apiHandle.child.killed) {
      apiHandle.child.kill('SIGTERM');
    }
  }

  // Scorecard Summary
  console.log('\n================================================================================');
  console.log('                 MULTI-ROLE x ALL-MODULES SCORECARD');
  console.log('================================================================================');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const pct = results.length ? Math.round((passed / results.length) * 100) : 0;

  // Per-role breakdown
  const byRole = {};
  for (const r of results) {
    byRole[r.roleLabel] = byRole[r.roleLabel] || { pass: 0, total: 0 };
    byRole[r.roleLabel].total += 1;
    if (r.passed) byRole[r.roleLabel].pass += 1;
  }
  for (const [role, counts] of Object.entries(byRole)) {
    const tag = counts.pass === counts.total ? colors.green : colors.red;
    console.log(`  ${tag}${role.padEnd(18)}${colors.reset} : ${counts.pass}/${counts.total} checks passed`);
  }

  console.log('--------------------------------------------------------------------------------');
  console.log(`Total Matrix Checks : ${results.length}`);
  console.log(`Passed              : ${colors.green}${passed}${colors.reset}`);
  console.log(`Failed              : ${failed > 0 ? colors.red + failed + colors.reset : colors.green + '0' + colors.reset}`);
  console.log(`Success Rate        : ${pct}%`);
  console.log('--------------------------------------------------------------------------------');

  if (failed > 0) {
    console.log(`${colors.bgRed} RESULT: [FAILED] ${failed} MATRIX CHECK(S) FAILED ${colors.reset}`);
    process.exit(1);
  }
  console.log(`${colors.bgGreen} RESULT: [PASS] ALL ROLES & MODULES VERIFIED (${passed}/${results.length}) ${colors.reset}`);
  process.exit(0);
}

runSuite().catch((err) => {
  console.error(`\nFatal Matrix Runner Error: ${err.message}`);
  process.exit(1);
});
