const API_BASE = 'https://peoplehub-api-l0yc.onrender.com/api/v1';

async function runSanityTest() {
  console.log('=== RUNNING PEOPLEHUB FULL SANITY TEST ===\n');

  let results = [];

  // 1. Test Admin Login
  console.log('1. Testing Super Admin Login (admin@peoplehub.com)...');
  let adminToken = '';
  let tenantId = '';
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@peoplehub.com', passwordHash: 'admin_pass' })
    });
    const data = await res.json();
    if (res.ok && data.accessToken) {
      adminToken = data.accessToken;
      tenantId = data.tenants?.[0]?.id;
      results.push({ test: 'Admin Login', status: 'PASS', details: `User: ${data.user.email}, Tenants: ${data.tenants.length}` });
    } else {
      results.push({ test: 'Admin Login', status: 'FAIL', details: JSON.stringify(data) });
    }
  } catch (e) {
    results.push({ test: 'Admin Login', status: 'FAIL', details: e.message });
  }

  // 2. Test HR Manager Login
  console.log('2. Testing HR Manager Login (priya@garments.com)...');
  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya@garments.com', passwordHash: 'priya_pass' })
    });
    const data = await res.json();
    if (res.ok && data.accessToken) {
      results.push({ test: 'HR Manager Login', status: 'PASS', details: `User: ${data.user.email}, Scope: ${data.roles?.[0]?.scopeId || 'None'}` });
    } else {
      results.push({ test: 'HR Manager Login', status: 'FAIL', details: JSON.stringify(data) });
    }
  } catch (e) {
    results.push({ test: 'HR Manager Login', status: 'FAIL', details: e.message });
  }

  if (!adminToken || !tenantId) {
    console.error('Cannot proceed without valid admin token and tenant ID');
    console.table(results);
    return;
  }

  const authHeaders = {
    'Authorization': `Bearer ${adminToken}`,
    'x-tenant-id': tenantId
  };

  // 3. Test Tenants List
  console.log('3. Testing Tenants API...');
  try {
    const res = await fetch(`${API_BASE}/tenants`, { headers: authHeaders });
    const data = await res.json();
    results.push({ 
      test: 'Tenants API', 
      status: res.ok ? 'PASS' : 'FAIL', 
      details: Array.isArray(data) ? `Found ${data.length} tenants (${data.map(t=>t.name).join(', ')})` : JSON.stringify(data) 
    });
  } catch (e) {
    results.push({ test: 'Tenants API', status: 'FAIL', details: e.message });
  }

  // 4. Test Masters Bundle (Departments, Designations, Branches, Shifts)
  console.log('4. Testing Masters Bundle API...');
  try {
    const res = await fetch(`${API_BASE}/masters/bundle`, { headers: authHeaders });
    const data = await res.json();
    results.push({ 
      test: 'Masters Bundle API', 
      status: res.ok ? 'PASS' : 'FAIL', 
      details: res.ok ? `Dept: ${data.departments?.length}, Desig: ${data.designations?.length}, Branch: ${data.branches?.length}, Shifts: ${data.shifts?.length}` : JSON.stringify(data) 
    });
  } catch (e) {
    results.push({ test: 'Masters Bundle API', status: 'FAIL', details: e.message });
  }

  // 5. Test Employees List
  console.log('5. Testing Employees API...');
  try {
    const res = await fetch(`${API_BASE}/employees`, { headers: authHeaders });
    const data = await res.json();
    results.push({ 
      test: 'Employees API', 
      status: res.ok ? 'PASS' : 'FAIL', 
      details: Array.isArray(data) ? `Found ${data.length} employees (${data.slice(0,3).map(e=>e.firstName+' '+e.lastName).join(', ')}...)` : JSON.stringify(data) 
    });
  } catch (e) {
    results.push({ test: 'Employees API', status: 'FAIL', details: e.message });
  }

  // 6. Test Piece Rate Activities
  console.log('6. Testing Piece-Rate Activities API...');
  try {
    const res = await fetch(`${API_BASE}/piece-rate/activities`, { headers: authHeaders });
    const data = await res.json();
    results.push({ 
      test: 'Piece-Rate Activities', 
      status: res.ok ? 'PASS' : 'FAIL', 
      details: Array.isArray(data) ? `Found ${data.length} activities (${data.map(a=>a.name).join(', ')})` : JSON.stringify(data) 
    });
  } catch (e) {
    results.push({ test: 'Piece-Rate Activities', status: 'FAIL', details: e.message });
  }

  // 7. Test Piece Rate Logs
  console.log('7. Testing Piece-Rate Logs API...');
  try {
    const res = await fetch(`${API_BASE}/piece-rate/logs`, { headers: authHeaders });
    const data = await res.json();
    results.push({ 
      test: 'Piece-Rate Logs', 
      status: res.ok ? 'PASS' : 'FAIL', 
      details: Array.isArray(data) ? `Found ${data.length} logs, Total logged pieces: ${data.reduce((a,b)=>a+(b.quantity||0),0)}` : JSON.stringify(data) 
    });
  } catch (e) {
    results.push({ test: 'Piece-Rate Logs', status: 'FAIL', details: e.message });
  }

  // 8. Test Payroll Salary Structures
  console.log('8. Testing Salary Structures API...');
  try {
    const res = await fetch(`${API_BASE}/payroll/structures`, { headers: authHeaders });
    const data = await res.json();
    results.push({ 
      test: 'Salary Structures API', 
      status: res.ok ? 'PASS' : 'FAIL', 
      details: Array.isArray(data) ? `Found ${data.length} active salary structures` : JSON.stringify(data) 
    });
  } catch (e) {
    results.push({ test: 'Salary Structures API', status: 'FAIL', details: e.message });
  }

  // 9. Test Payroll Payslips
  console.log('9. Testing Payslips API...');
  try {
    const res = await fetch(`${API_BASE}/payroll/payslips`, { headers: authHeaders });
    const data = await res.json();
    results.push({ 
      test: 'Payslips API', 
      status: res.ok ? 'PASS' : 'FAIL', 
      details: Array.isArray(data) ? `Found ${data.length} payslips` : JSON.stringify(data) 
    });
  } catch (e) {
    results.push({ test: 'Payslips API', status: 'FAIL', details: e.message });
  }

  // 10. Test Audit Logs
  console.log('10. Testing Audit Logs API...');
  try {
    const res = await fetch(`${API_BASE}/audit-logs`, { headers: authHeaders });
    const data = await res.json();
    results.push({ 
      test: 'Audit Logs API', 
      status: res.ok ? 'PASS' : 'FAIL', 
      details: Array.isArray(data) ? `Found ${data.length} audit trail entries` : JSON.stringify(data) 
    });
  } catch (e) {
    results.push({ test: 'Audit Logs API', status: 'FAIL', details: e.message });
  }

  console.log('\n=== SANITY TEST SUMMARY RESULTS ===');
  console.table(results);
}

runSanityTest();
