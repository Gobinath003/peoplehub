const http = require('http');

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : null;
          resolve({ status: res.statusCode, headers: res.headers, data: parsed, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runSanity() {
  console.log('=====================================================');
  console.log('   PEOPLE HUB - END-TO-END SYSTEM SANITY VERIFICATION');
  console.log('=====================================================\n');

  const results = [];
  const logTest = (name, passed, details) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${name}`);
    if (details) console.log(`       Details: ${details}`);
    results.push({ name, passed, details });
  };

  try {
    // 1. Auth Login Test
    console.log('[1/10] Testing Authentication & Token Issuance...');
    const loginRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'admin@peoplehub.com',
      passwordHash: 'admin_pass'
    });

    const loginPassed = loginRes.status === 200 && loginRes.data && loginRes.data.accessToken;
    logTest('Auth Login (admin@peoplehub.com)', loginPassed, loginPassed ? `Token received, Tenant: ${loginRes.data.activeTenant?.name}` : `Status: ${loginRes.status}`);

    if (!loginPassed) {
      console.error('Fatal: Cannot proceed without auth token');
      process.exit(1);
    }

    const token = loginRes.data.accessToken;
    const activeTenantId = loginRes.data.activeTenant.id;
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'x-tenant-id': activeTenantId,
      'Content-Type': 'application/json'
    };

    // 2. Tenants Endpoint
    console.log('\n[2/10] Testing Multi-Tenant Resolution...');
    const tenantsRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/tenants',
      method: 'GET',
      headers: authHeaders
    });
    const tenantsPassed = tenantsRes.status === 200 && Array.isArray(tenantsRes.data) && tenantsRes.data.length > 0;
    logTest('Tenants Query', tenantsPassed, `${tenantsRes.data?.length || 0} active tenants found`);

    // 3. Masters Catalog Bundle
    console.log('\n[3/10] Testing Master Settings Catalog Bundle...');
    const mastersRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/masters/bundle',
      method: 'GET',
      headers: authHeaders
    });
    const mastersData = mastersRes.data;
    const mastersPassed = mastersRes.status === 200 && mastersData &&
      Array.isArray(mastersData.departments) &&
      Array.isArray(mastersData.designations) &&
      Array.isArray(mastersData.branches);
    logTest('Masters Catalog Bundle', mastersPassed, 
      `Depts: ${mastersData?.departments?.length}, Desigs: ${mastersData?.designations?.length}, Branches: ${mastersData?.branches?.length}`);

    // 4. Employees Roster
    console.log('\n[4/10] Testing Employee Directory...');
    const empRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/employees',
      method: 'GET',
      headers: authHeaders
    });
    const empPassed = empRes.status === 200 && Array.isArray(empRes.data);
    logTest('Employees Query', empPassed, `${empRes.data?.length} real employees listed`);
    const sampleEmp = empRes.data?.[0];

    // 5. Piece-rate Operations Catalog
    console.log('\n[5/10] Testing Piece-Rate Operations Catalog & Floor Logs...');
    const opsRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/piece-rate/activities',
      method: 'GET',
      headers: authHeaders
    });
    const opsPassed = opsRes.status === 200 && Array.isArray(opsRes.data);
    logTest('Piece-rate Operations Catalog', opsPassed, `${opsRes.data?.length} operations registered`);

    const logsRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/piece-rate/logs',
      method: 'GET',
      headers: authHeaders
    });
    const logsPassed = logsRes.status === 200 && Array.isArray(logsRes.data);
    logTest('Floor Piece-rate Work Logs', logsPassed, `${logsRes.data?.length} work entries in system`);

    // 6. Test Floor Work Logging (Sanity Check of Bug Fix)
    if (sampleEmp && opsRes.data?.length > 0) {
      console.log('\n[6/10] Testing Floor Work Entry Creation (UUID & FK Verification)...');
      const testOp = opsRes.data[0];
      const todayStr = new Date().toISOString().split('T')[0];
      const createLogRes = await request({
        hostname: 'localhost',
        port: 3001,
        path: '/api/v1/piece-rate/employee-day-logs',
        method: 'POST',
        headers: authHeaders
      }, {
        employeeId: sampleEmp.id,
        logDate: todayStr,
        items: [
          {
            activityId: testOp.id,
            quantity: 25,
            unitRate: testOp.ratePerPiece,
            remarks: 'Automated Sanity Test Run'
          }
        ]
      });
      const createPassed = createLogRes.status === 200 || createLogRes.status === 201;
      logTest('Save Floor Sheet Work Entry', createPassed, createPassed ? `Successfully logged 25 pcs for ${sampleEmp.firstName}` : `Failed with status ${createLogRes.status}: ${createLogRes.raw}`);
    }

    // 7. Payroll Structures & Calculation
    console.log('\n[7/10] Testing Payroll Module...');
    const payrollRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/payroll/structures',
      method: 'GET',
      headers: authHeaders
    });
    const payrollPassed = payrollRes.status === 200 && Array.isArray(payrollRes.data);
    logTest('Payroll Salary Structures', payrollPassed, `${payrollRes.data?.length} employee salary structures`);

    const payslipsRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/payroll/payslips',
      method: 'GET',
      headers: authHeaders
    });
    const payslipsPassed = payslipsRes.status === 200 && Array.isArray(payslipsRes.data);
    logTest('Payslip History Retrieval', payslipsPassed, `${payslipsRes.data?.length} historical payslips`);

    // 8. Accounts & Financial Cashflow
    console.log('\n[8/10] Testing Accounts & Cashflow Module...');
    const accSummaryRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/accounts/summary',
      method: 'GET',
      headers: authHeaders
    });
    const accSummaryPassed = accSummaryRes.status === 200 && accSummaryRes.data;
    logTest('Accounts Financial Summary', accSummaryPassed, 
      accSummaryPassed ? `Total Income: ₹${accSummaryRes.data.totalIncome}, Total Expense: ₹${accSummaryRes.data.totalExpense}` : `Status: ${accSummaryRes.status}`);

    const accTxRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/accounts/transactions',
      method: 'GET',
      headers: authHeaders
    });
    const accTxPassed = accTxRes.status === 200 && Array.isArray(accTxRes.data);
    logTest('Accounts Transactions Ledger', accTxPassed, `${accTxRes.data?.length} financial journal records`);

    // 9. Users & Role Management
    console.log('\n[9/10] Testing Users & Security Roles...');
    const usersRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/users',
      method: 'GET',
      headers: authHeaders
    });
    const usersPassed = usersRes.status === 200 && Array.isArray(usersRes.data);
    logTest('Users Directory', usersPassed, `${usersRes.data?.length} users active`);

    // 10. Audit Logs
    console.log('\n[10/10] Testing System Audit Trails...');
    const auditRes = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/v1/audit-logs',
      method: 'GET',
      headers: authHeaders
    });
    const auditPassed = auditRes.status === 200 && Array.isArray(auditRes.data);
    logTest('Audit Trails Ledger', auditPassed, `${auditRes.data?.length} audit events captured`);

    console.log('\n=====================================================');
    const passedCount = results.filter(r => r.passed).length;
    console.log(`SANITY VERIFICATION RESULT: ${passedCount}/${results.length} PASSED`);
    console.log('=====================================================');

  } catch (err) {
    console.error('Fatal Sanity Test Error:', err);
  }
}

runSanity();
