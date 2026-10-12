const http = require('http');

const routes = [
  '/',
  '/login',
  '/dashboard',
  '/dashboard/employees',
  '/dashboard/piece-rate',
  '/dashboard/payroll',
  '/dashboard/masters',
  '/dashboard/audit-logs',
  '/dashboard/tenants',
  '/dashboard/users',
  '/dashboard/settings/modules'
];

async function checkRoute(route) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:3000${route}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const isError = res.statusCode >= 400 || data.includes('Internal Server Error') || data.includes('Unhandled Runtime Error');
        resolve({
          route,
          status: res.statusCode,
          ok: !isError,
          length: data.length,
          hasErrorText: data.includes('Internal Server Error') || data.includes('Unhandled Runtime Error')
        });
      });
    });
    req.on('error', (err) => {
      resolve({
        route,
        status: 'CONN_ERR',
        ok: false,
        details: err.message
      });
    });
    req.setTimeout(15000, () => {
      req.abort();
      resolve({ route, status: 'TIMEOUT', ok: false });
    });
  });
}

async function run() {
  console.log('Testing frontend Next.js routes on http://localhost:3000...');
  const results = [];
  for (const route of routes) {
    process.stdout.write(`Checking ${route}... `);
    const res = await checkRoute(route);
    console.log(`${res.status} (${res.ok ? 'OK' : 'FAIL'})`);
    results.push(res);
  }
  console.table(results);
}

run();
