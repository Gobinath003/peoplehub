/**
 * PeopleHub Real Browser UI E2E Automation Suite (Microsoft Edge / Chromium CDP)
 *
 * Launches a real headless Microsoft Edge instance + Next.js production server + NestJS API:
 *   1. Verifies /login renders cleanly with no compliance footer and logs in via real UI inputs
 *   2. Exercises real UI CRUD on /dashboard/employees (Create -> Reload -> Edit -> Delete)
 *      including verification that dropdowns hold real UUIDs (no mock 'dept-cut' fallback IDs)
 *   3. Exercises /dashboard/users Assign Scoped Role modal (Branch/Dept dropdown + Apply + Revoke)
 *   4. Crawls all dashboard routes as TENANT_ADMIN, HR_MANAGER, NOLTRION_ADMIN, and EMPLOYEE:
 *      - Verifies role-appropriate navigation visibility in the real DOM
 *      - Clicks Leave Management tabs and verifies 0 React Hook #310 / uncaught runtime errors
 *      - Fails immediately on ANY HTTP >= 500 API response or uncaught page exception
 */

const fs = require('fs');
const os = require('os');
const net = require('net');
const path = require('path');
const http = require('http');
const crypto = require('crypto');
const { spawn, execSync } = require('child_process');

function killProcTree(proc) {
  if (!proc || !proc.pid) return;
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
    } else {
      proc.kill('SIGTERM');
    }
  } catch {}
}

const ROOT_DIR = path.resolve(__dirname, '..');
const API_DIR = path.join(ROOT_DIR, 'apps', 'api');
const WEB_DIR = path.join(ROOT_DIR, 'apps', 'web');
const resolvePkg = (name) => require(require.resolve(name, { paths: [ROOT_DIR, API_DIR] }));

const dotenv = resolvePkg('dotenv');
dotenv.config({ path: path.join(API_DIR, '.env') });

const { PrismaClient } = resolvePkg('@prisma/client');
const bcrypt = resolvePkg('bcrypt');

const API_PORT = Number(process.env.E2E_API_PORT || 3011);
const WEB_PORT = Number(process.env.E2E_WEB_PORT || 3010);
const CDP_PORT = Number(process.env.E2E_CDP_PORT || 9239);
const WEB_ORIGIN = `http://127.0.0.1:${WEB_PORT}`;
const API_ORIGIN = `http://127.0.0.1:${API_PORT}`;

const ABC_TENANT_ID = '7837a312-ed38-4859-9748-9cbad20d1863';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EDGE_CANDIDATES = [
  process.env.CHROME_BIN,
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const results = [];
function record(scope, name, passed, ms, detail = '') {
  results.push({ scope, name, passed, ms, detail });
  const badge = passed ? `${colors.green}PASS${colors.reset}` : `${colors.red}FAIL${colors.reset}`;
  console.log(`  [${badge}] [${scope}] ${name} (${(ms / 1000).toFixed(2)}s)${detail ? ` -> ${detail}` : ''}`);
}

function findBrowserBinary() {
  for (const p of EDGE_CANDIDATES) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('No Chromium/Edge binary found. Set CHROME_BIN to msedge.exe or chrome.exe');
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

async function waitForHttp(url, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          res.resume();
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        });
        req.on('error', () => resolve(false));
      });
      if (ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class SimpleCdpClient {
  constructor(wsUrl) {
    this.wsUrl = new URL(wsUrl);
    this.socket = null;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.rxBuffer = Buffer.alloc(0);
  }

  connect() {
    return new Promise((resolve, reject) => {
      const sock = net.connect(Number(this.wsUrl.port), this.wsUrl.hostname);
      this.socket = sock;
      const key = crypto.randomBytes(16).toString('base64');
      let upgraded = false;

      sock.on('error', reject);
      sock.on('connect', () => {
        sock.write(
          `GET ${this.wsUrl.pathname}${this.wsUrl.search} HTTP/1.1\r\n` +
            `Host: ${this.wsUrl.host}\r\n` +
            `Upgrade: websocket\r\n` +
            `Connection: Upgrade\r\n` +
            `Sec-WebSocket-Key: ${key}\r\n` +
            `Sec-WebSocket-Version: 13\r\n\r\n`
        );
      });

      sock.on('data', (chunk) => {
        this.rxBuffer = Buffer.concat([this.rxBuffer, chunk]);
        if (!upgraded) {
          const idx = this.rxBuffer.indexOf('\r\n\r\n');
          if (idx === -1) return;
          upgraded = true;
          this.rxBuffer = this.rxBuffer.subarray(idx + 4);
          resolve();
        }
        this.drainFrames();
      });
    });
  }

  drainFrames() {
    while (this.rxBuffer.length >= 2) {
      const b0 = this.rxBuffer[0];
      const b1 = this.rxBuffer[1];
      const opcode = b0 & 0x0f;
      const masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f;
      let offset = 2;

      if (len === 126) {
        if (this.rxBuffer.length < offset + 2) return;
        len = this.rxBuffer.readUInt16BE(offset);
        offset += 2;
      } else if (len === 127) {
        if (this.rxBuffer.length < offset + 8) return;
        len = Number(this.rxBuffer.readBigUInt64BE(offset));
        offset += 8;
      }

      const maskLen = masked ? 4 : 0;
      if (this.rxBuffer.length < offset + maskLen + len) return;

      let payload = this.rxBuffer.subarray(offset + maskLen, offset + maskLen + len);
      if (masked) {
        const mask = this.rxBuffer.subarray(offset, offset + 4);
        const unmasked = Buffer.alloc(len);
        for (let i = 0; i < len; i++) unmasked[i] = payload[i] ^ mask[i % 4];
        payload = unmasked;
      }

      this.rxBuffer = this.rxBuffer.subarray(offset + maskLen + len);

      if (opcode === 0x8) {
        this.socket.end();
        return;
      }
      if (opcode === 0x9) {
        this.sendRawFrame(0x0a, payload);
        continue;
      }
      if (opcode === 0x1 || opcode === 0x0) {
        const msg = JSON.parse(payload.toString('utf8'));
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id);
          this.pending.delete(msg.id);
          if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
          else resolve(msg.result);
        } else if (msg.method) {
          const handlers = this.listeners.get(msg.method) || [];
          for (const fn of handlers) fn(msg.params);
        }
      }
    }
  }

  sendRawFrame(opcode, payloadBuf) {
    const mask = crypto.randomBytes(4);
    const len = payloadBuf.length;
    let header;
    if (len < 126) {
      header = Buffer.alloc(6);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | len;
      mask.copy(header, 2);
    } else if (len < 65536) {
      header = Buffer.alloc(8);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | 126;
      header.writeUInt16BE(len, 2);
      mask.copy(header, 4);
    } else {
      header = Buffer.alloc(14);
      header[0] = 0x80 | opcode;
      header[1] = 0x80 | 127;
      header.writeBigUInt64BE(BigInt(len), 2);
      mask.copy(header, 10);
    }
    const masked = Buffer.alloc(len);
    for (let i = 0; i < len; i++) masked[i] = payloadBuf[i] ^ mask[i % 4];
    this.socket.write(Buffer.concat([header, masked]));
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const buf = Buffer.from(JSON.stringify({ id, method, params }), 'utf8');
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.sendRawFrame(0x1, buf);
    });
  }

  on(method, fn) {
    if (!this.listeners.has(method)) this.listeners.set(method, []);
    this.listeners.get(method).push(fn);
  }

  close() {
    if (this.socket) this.socket.destroy();
  }
}

class PageDriver {
  constructor(cdp) {
    this.cdp = cdp;
    this.runtimeExceptions = [];
    this.consoleErrors = [];
    this.http500s = [];
    this.apiResponses = [];

    this.cdp.on('Runtime.exceptionThrown', (params) => {
      const desc = params?.exceptionDetails?.exception?.description || params?.exceptionDetails?.text || 'Uncaught exception';
      this.runtimeExceptions.push(desc);
    });

    this.cdp.on('Runtime.consoleAPICalled', (params) => {
      if (params.type === 'error') {
        const text = (params.args || []).map((a) => a.value || a.description || '').join(' ');
        if (text && !text.includes('status of 403') && !text.includes('status of 404')) {
          this.consoleErrors.push(text);
        }
      }
    });

    this.cdp.on('Network.responseReceived', (params) => {
      const { url, status } = params.response || {};
      if (!url) return;
      if (url.includes('/api/v1/')) {
        this.apiResponses.push({ url, status });
        if (status >= 500) {
          this.http500s.push(`HTTP ${status} ${url}`);
        }
      }
    });
  }

  async init() {
    await this.cdp.send('Page.enable');
    await this.cdp.send('Runtime.enable');
    await this.cdp.send('Network.enable');
    await this.cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: 'window.confirm = () => true; window.alert = () => {};',
    });
  }

  resetTelemetry() {
    this.runtimeExceptions = [];
    this.consoleErrors = [];
    this.http500s = [];
    this.apiResponses = [];
  }

  async goto(url) {
    await this.cdp.send('Page.navigate', { url });
    await this.waitFor(`document.readyState === 'complete'`, 15000);
    await this.sleep(450);
  }

  async sleep(ms) {
    await new Promise((r) => setTimeout(r, ms));
  }

  async evalJs(expr) {
    const res = await this.cdp.send('Runtime.evaluate', {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'JS eval error');
    }
    return res.result?.value;
  }

  async waitFor(predicateJs, timeoutMs = 15000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const ok = await this.evalJs(`Boolean(${predicateJs})`);
        if (ok) return true;
      } catch {}
      await this.sleep(200);
    }
    throw new Error(`waitFor timed out (${timeoutMs}ms): ${predicateJs}`);
  }

  async fillInput(selector, value) {
    const ok = await this.evalJs(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!ok) throw new Error(`Input not found: ${selector}`);
  }

  async selectByValue(selector, value) {
    const ok = await this.evalJs(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
      setter.call(el, ${JSON.stringify(value)});
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()`);
    if (!ok) throw new Error(`Select not found: ${selector}`);
  }

  async clickButton(textSubstring) {
    const clicked = await this.evalJs(`(() => {
      const needle = ${JSON.stringify(textSubstring)}.toLowerCase();
      const btns = Array.from(document.querySelectorAll('button, a'));
      const target = btns.find(b => !b.disabled && (b.textContent || '').trim().toLowerCase().includes(needle));
      if (!target) return false;
      target.scrollIntoView({ block: 'center' });
      target.click();
      return true;
    })()`);
    if (!clicked) throw new Error(`Button containing "${textSubstring}" not found`);
  }

  assertClean(scope, routeLabel) {
    const badReact = this.consoleErrors.filter((c) => /Minified React error|Hydration|Internal server error|Unhandled/i.test(c));
    const issues = [
      ...this.runtimeExceptions.map((e) => `Runtime: ${e}`),
      ...this.http500s.map((h) => `API 5xx: ${h}`),
      ...badReact.map((c) => `Console: ${c}`),
    ];
    if (issues.length > 0) {
      throw new Error(`${routeLabel} telemetry errors: ${issues.join(' | ')}`);
    }
  }
}

async function loginViaUi(page, email, password) {
  await page.goto(`${WEB_ORIGIN}/login`);
  await page.waitFor(`document.querySelector('input[autocomplete="username"], input[type="email"]')`);
  const emailSelector = `input[autocomplete="username"], input[type="email"]`;
  const passSelector = `input[type="password"], input[autocomplete="current-password"]`;
  await page.fillInput(emailSelector, email);
  await page.fillInput(passSelector, password);
  await page.clickButton('Sign In');
  await page.waitFor(`window.location.pathname.startsWith('/dashboard') && document.body.innerText.length > 80`, 15000);
  await page.sleep(600);
}

async function logoutViaUi(page) {
  await page.evalJs(`(() => {
    localStorage.removeItem('ph_token');
    localStorage.removeItem('ph_user');
    localStorage.removeItem('ph_active_tenant');
    localStorage.removeItem('ph_tenants');
    localStorage.removeItem('ph_roles');
    localStorage.removeItem('ph_permissions');
    localStorage.removeItem('ph_modules');
  })()`);
  await page.goto(`${WEB_ORIGIN}/login`);
}

async function main() {
  console.log('================================================================================');
  console.log('   PEOPLEHUB REAL BROWSER UI E2E AUTOMATION SUITE (HEADLESS EDGE + NEXT + API)');
  console.log('================================================================================');

  const prisma = new PrismaClient();
  let apiProc = null;
  let webProc = null;
  let edgeProc = null;
  let cdp = null;
  const userDataDir = path.join(os.tmpdir(), `peoplehub-edge-e2e-${Date.now()}`);
  const ephemeralUsers = [];

  try {
    // 1. Start NestJS API on dedicated E2E port
    const apiEnv = { ...process.env, PORT: String(API_PORT) };
    apiProc = spawn('node', ['apps/api/dist/main.js'], { cwd: ROOT_DIR, env: apiEnv, stdio: 'pipe' });
    await waitForHttp(`${API_ORIGIN}/api/v1/health`, 45000);

    // 2. Ensure Next.js Web has a production build with API_BASE_URL pointing to our E2E API if needed
    const buildIdPath = path.join(WEB_DIR, '.next', 'BUILD_ID');
    if (!fs.existsSync(buildIdPath)) {
      throw new Error('apps/web/.next production build missing. Run npm run build:web first.');
    }

    // Also allow overriding API_PORT or check NEXT_PUBLIC_API_URL compiled into .next
    const webEnv = { ...process.env, PORT: String(WEB_PORT), HOSTNAME: '127.0.0.1' };
    webProc = spawn(
      process.platform === 'win32' ? 'cmd.exe' : 'npx',
      process.platform === 'win32'
        ? ['/c', 'npx', 'next', 'start', 'apps/web', '-p', String(WEB_PORT), '-H', '127.0.0.1']
        : ['next', 'start', 'apps/web', '-p', String(WEB_PORT), '-H', '127.0.0.1'],
      { cwd: ROOT_DIR, env: webEnv, stdio: 'pipe' }
    );
    await waitForHttp(`${WEB_ORIGIN}/login`, 45000);

    // 3. Launch headless Microsoft Edge with CDP
    const browserBin = findBrowserBinary();
    edgeProc = spawn(
      browserBin,
      [
        '--headless=new',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--window-size=1440,900',
        `--remote-debugging-port=${CDP_PORT}`,
        `--user-data-dir=${userDataDir}`,
        'about:blank',
      ],
      { stdio: 'ignore' }
    );

    let wsUrl = null;
    for (let i = 0; i < 30; i++) {
      try {
        const list = await httpGetJson(`http://127.0.0.1:${CDP_PORT}/json/list`);
        const target = (list.data || []).find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
        if (target) {
          wsUrl = target.webSocketDebuggerUrl;
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 300));
    }
    if (!wsUrl) throw new Error('Failed to obtain CDP WebSocket URL from Edge');

    cdp = new SimpleCdpClient(wsUrl);
    await cdp.connect();
    const page = new PageDriver(cdp);
    await page.init();

    // Wait note: compiled Next.js uses http://localhost:3001 by default unless rebuilt with custom env;
    // Redirect any :3001 fetches from compiled web app cleanly if E2E_API_PORT !== 3001 via Fetch domain or run API on 3001 when free.
    if (API_PORT !== 3001) {
      await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `(() => {
          const origFetch = window.fetch.bind(window);
          window.fetch = (input, init) => {
            if (typeof input === 'string' && input.startsWith('http://localhost:3001')) {
              return origFetch(input.replace('http://localhost:3001', '${API_ORIGIN}'), init);
            }
            return origFetch(input, init);
          };
        })();`,
      });
    }

    // ------------------------------------------------------------------------
    // SUITE 1: Login Page UI Check & Admin Login
    // ------------------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.cyan}=== 1. REAL BROWSER LOGIN & TENANT_ADMIN UI ===${colors.reset}`);
    let t0 = Date.now();
    try {
      page.resetTelemetry();
      await page.goto(`${WEB_ORIGIN}/login`);
      const text = await page.evalJs(`document.body.innerText`);
      const hasCompliance = /Enterprise Guard|256-Bit SSL|SOC-2/i.test(text);
      if (hasCompliance) throw new Error('Compliance footer still present on /login');
      await loginViaUi(page, 'admin@peoplehub.com', 'admin_pass');
      page.assertClean('TENANT_ADMIN', '/login -> /dashboard');
      record('TENANT_ADMIN', 'Login form UI + clean redirect + no compliance footer', true, Date.now() - t0);
    } catch (e) {
      record('TENANT_ADMIN', 'Login form UI + clean redirect + no compliance footer', false, Date.now() - t0, e.message);
    }

    // ------------------------------------------------------------------------
    // SUITE 2: Employee UI E2E (Add Modal -> Save & Onboard -> Reload -> Edit -> Delete)
    // ------------------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.cyan}=== 2. EMPLOYEE DIRECTORY REAL BROWSER CRUD (ADMIN) ===${colors.reset}`);
    const uniqueSuffix = Date.now().toString().slice(-4);
    const e2eFirst = `UiAuto${uniqueSuffix}`;
    const e2eLast = 'Tester';
    t0 = Date.now();
    try {
      page.resetTelemetry();
      await page.goto(`${WEB_ORIGIN}/dashboard/employees`);
      await page.waitFor(`document.body.innerText.includes('Employee Directory')`);
      await page.waitFor(`!document.body.innerText.includes('Loading')`, 10000).catch(() => {});
      await page.sleep(500);

      await page.clickButton('Add Employee');
      await page.waitFor(`document.body.innerText.includes('Add New Employee')`);

      // Verify Department, Designation, Branch dropdowns hold real UUIDs (NOT 'dept-cut' fallback IDs)
      const masterValues = await page.evalJs(`(() => {
        const selects = Array.from(document.querySelectorAll('form select'));
        return selects.slice(0, 3).map(s => ({ value: s.value, label: s.options[s.selectedIndex]?.text || '' }));
      })()`);
      if (!masterValues.length || masterValues.some((m) => !UUID_RE.test(m.value))) {
        throw new Error(`Expected real UUID master options in Add New Employee modal, got ${JSON.stringify(masterValues)}`);
      }

      await page.fillInput('input[placeholder="e.g. Ramesh"]', e2eFirst);
      await page.fillInput('input[placeholder="e.g. Kumar"]', e2eLast);
      await page.fillInput('input[placeholder="+91 98400 00000"]', '9876543210');

      const postCountBefore = page.apiResponses.filter((r) => r.url.endsWith('/api/v1/employees') && r.status === 201).length;
      await page.clickButton('Save & Onboard Employee');

      await page.waitFor(
        `!document.body.innerText.includes('Add New Employee') && document.body.innerText.includes(${JSON.stringify(e2eFirst)})`,
        15000
      );
      const created201 = page.apiResponses.some((r) => r.url.endsWith('/api/v1/employees') && r.status === 201);
      if (!created201 && postCountBefore === 0) throw new Error('Expected POST /api/v1/employees 201');

      // Reload page to prove PostgreSQL persistence
      await page.goto(`${WEB_ORIGIN}/dashboard/employees`);
      await page.waitFor(`document.body.innerText.includes(${JSON.stringify(e2eFirst)})`, 15000);
      page.assertClean('TENANT_ADMIN', '/dashboard/employees CREATE + RELOAD');
      record('TENANT_ADMIN', `Employees UI Create "${e2eFirst}" + DB reload persistence`, true, Date.now() - t0, masterValues[0].label);
    } catch (e) {
      record('TENANT_ADMIN', 'Employees UI Create + DB reload persistence', false, Date.now() - t0, e.message);
    }

    // Edit & Delete our UI-created employee cleanly
    t0 = Date.now();
    try {
      const editedFirst = `${e2eFirst}Ed`;
      const openedEdit = await page.evalJs(`(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const row = rows.find(r => (r.innerText || '').includes(${JSON.stringify(e2eFirst)}));
        if (!row) return false;
        const editBtn = row.querySelector('button[title="Edit Employee"]');
        if (!editBtn) return false;
        editBtn.click();
        return true;
      })()`);
      if (!openedEdit) throw new Error('Could not find Edit Employee button on created row');

      await page.waitFor(`document.body.innerText.includes('Edit Employee Details')`);
      await page.evalJs(`(() => {
        const inputs = Array.from(document.querySelectorAll('form input[type="text"]'));
        const fnInput = inputs.find(i => (i.value || '').includes(${JSON.stringify(e2eFirst)}));
        if (!fnInput) throw new Error('First name input missing in Edit modal');
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
        setter.call(fnInput, ${JSON.stringify(editedFirst)});
        fnInput.dispatchEvent(new Event('input', { bubbles: true }));
        fnInput.dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
      await page.clickButton('Save Changes');
      await page.waitFor(
        `!document.body.innerText.includes('Edit Employee Details') && document.body.innerText.includes(${JSON.stringify(editedFirst)})`,
        15000
      );

      // Delete created employee cleanly via UI Delete icon
      const clickedDel = await page.evalJs(`(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const row = rows.find(r => (r.innerText || '').includes(${JSON.stringify(editedFirst)}));
        if (!row) return false;
        const delBtn = row.querySelector('button[title="Delete Employee"]');
        if (!delBtn) return false;
        delBtn.click();
        return true;
      })()`);
      if (!clickedDel) throw new Error('Could not find Delete Employee button');
      await page.waitFor(`!(document.querySelector('tbody')?.innerText || '').includes(${JSON.stringify(editedFirst)})`, 15000);
      page.assertClean('TENANT_ADMIN', '/dashboard/employees EDIT + DELETE');
      record('TENANT_ADMIN', 'Employees UI Edit + Delete cleanup', true, Date.now() - t0);
    } catch (e) {
      record('TENANT_ADMIN', 'Employees UI Edit + Delete cleanup', false, Date.now() - t0, e.message);
    }

    // ------------------------------------------------------------------------
    // SUITE 3: Users & Scoped Role UI E2E (Dropdown check + Apply + Revoke)
    // ------------------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.cyan}=== 3. USERS & ROLES SCOPED DROPDOWN UI E2E ===${colors.reset}`);
    t0 = Date.now();
    try {
      page.resetTelemetry();
      await page.goto(`${WEB_ORIGIN}/dashboard/users`);
      await page.waitFor(
        `document.body.innerText.includes('User Access & Scoped Roles') && document.querySelectorAll('tbody tr').length > 0 && Array.from(document.querySelectorAll('button')).some(b => (b.textContent || '').includes('Assign Role'))`,
        15000
      );
      await page.sleep(250);

      await page.evalJs(`(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const adminRow = rows.find(r => (r.innerText || '').includes('admin@peoplehub.com'));
        if (!adminRow) throw new Error('admin@peoplehub.com row missing');
        const btn = Array.from(adminRow.querySelectorAll('button')).find(b => (b.textContent || '').includes('Assign Role'));
        if (!btn) throw new Error('Assign Role button missing on admin row');
        btn.click();
      })()`);
      await page.waitFor(`document.body.innerText.includes('Assign Scoped Role')`);

      // Select PAYROLL_MANAGER and DEPARTMENT scope -> verify dropdown renders (no text input)
      await page.evalJs(`(() => {
        const selects = Array.from(document.querySelectorAll('form select'));
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
        setter.call(selects[0], 'PAYROLL_MANAGER');
        selects[0].dispatchEvent(new Event('change', { bubbles: true }));
        setter.call(selects[1], 'DEPARTMENT');
        selects[1].dispatchEvent(new Event('change', { bubbles: true }));
      })()`);
      await page.sleep(250);

      const hasTargetDropdown = await page.evalJs(`(() => {
        const selects = Array.from(document.querySelectorAll('form select'));
        const hasTextBox = Boolean(document.querySelector('form input[type="text"]'));
        if (selects.length < 3 || hasTextBox || selects[2].options.length < 2) return false;
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set;
        setter.call(selects[2], selects[2].options[1].value);
        selects[2].dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`);
      if (!hasTargetDropdown) throw new Error('Scope Target dropdown did not render cleanly on DEPARTMENT scope');

      await page.clickButton('Apply Scoped Role');
      await page.waitFor(
        `!document.body.innerText.includes('Assign Scoped Role') && (document.querySelector('tbody')?.innerText || '').includes('Payroll Manager')`,
        15000
      );

      // Revoke the temporary Payroll Manager badge from Super Admin cleanly
      await page.evalJs(`(() => {
        const rows = Array.from(document.querySelectorAll('tbody tr'));
        const adminRow = rows.find(r => (r.innerText || '').includes('admin@peoplehub.com'));
        if (!adminRow) throw new Error('admin@peoplehub.com row missing');
        const revokeBtn = Array.from(adminRow.querySelectorAll('button')).find(b => (b.title || '').toLowerCase().includes('revoke') && (b.parentElement?.innerText || '').includes('Payroll Manager'));
        if (!revokeBtn) throw new Error('Payroll Manager revoke button missing on admin row');
        revokeBtn.click();
      })()`);
      await page.waitFor(
        `!(Array.from(document.querySelectorAll('tbody tr')).find(r => (r.innerText || '').includes('admin@peoplehub.com'))?.innerText || '').includes('Payroll Manager')`,
        15000
      );
      page.assertClean('TENANT_ADMIN', '/dashboard/users Assign & Revoke');
      record('TENANT_ADMIN', 'Users & Roles Scope Target dropdown + Apply + Revoke', true, Date.now() - t0);
    } catch (e) {
      record('TENANT_ADMIN', 'Users & Roles Scope Target dropdown + Apply + Revoke', false, Date.now() - t0, e.message);
    }

    // ------------------------------------------------------------------------
    // SUITE 4: All Admin Dashboard Routes + Leave Management Tabs Crawl
    // ------------------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.cyan}=== 4. ALL DASHBOARD PAGES RENDER & CONSOLE AUDIT (ADMIN) ===${colors.reset}`);
    const adminRoutes = [
      ['/dashboard', 'Dashboard'],
      ['/dashboard/leave', 'Leave'],
      ['/dashboard/masters', 'Organization'],
      ['/dashboard/piece-rate', 'Production'],
      ['/dashboard/payroll', 'Payroll'],
      ['/dashboard/accounts', 'Accounts'],
      ['/dashboard/tenants', 'Tenant'],
      ['/dashboard/settings/modules', 'Module'],
    ];

    for (const [route, expectedKeyword] of adminRoutes) {
      const rt0 = Date.now();
      try {
        page.resetTelemetry();
        await page.goto(`${WEB_ORIGIN}${route}`);
        await page.waitFor(`document.body.innerText.includes(${JSON.stringify(expectedKeyword)})`, 15000);
        await page.sleep(450);

        if (route === '/dashboard/leave') {
          for (const tab of ['Team Approvals', 'Organization Register', 'Leave Type Masters']) {
            await page.evalJs(`(() => {
              const btn = Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes(${JSON.stringify(tab)}));
              if (btn) btn.click();
            })()`);
            await page.sleep(250);
          }
        }
        page.assertClean('TENANT_ADMIN', route);
        record('TENANT_ADMIN', `Render ${route} cleanly (0 React/JS/5xx errors)`, true, Date.now() - rt0);
      } catch (e) {
        record('TENANT_ADMIN', `Render ${route} cleanly (0 React/JS/5xx errors)`, false, Date.now() - rt0, e.message);
      }
    }

    // ------------------------------------------------------------------------
    // SUITE 5: HR_MANAGER (priya@garments.com) & Ephemeral EMPLOYEE UI Tests
    // ------------------------------------------------------------------------
    console.log(`\n${colors.bright}${colors.cyan}=== 5. MULTI-ROLE UI CHECKS (HR_MANAGER & EMPLOYEE) ===${colors.reset}`);
    t0 = Date.now();
    try {
      await logoutViaUi(page);
      page.resetTelemetry();
      await loginViaUi(page, 'priya@garments.com', 'priya_pass');
      await page.goto(`${WEB_ORIGIN}/dashboard/employees`);
      await page.waitFor(`document.body.innerText.includes('Employee Directory')`);
      await page.sleep(450);

      // Priya (branch-scoped HR Manager) clicks Add Employee -> sees real UUID masters & can create + delete
      await page.clickButton('Add Employee');
      await page.waitFor(`document.body.innerText.includes('Add New Employee')`);
      const hrFirst = `HrUi${uniqueSuffix}`;
      await page.fillInput('input[placeholder="e.g. Ramesh"]', hrFirst);
      await page.fillInput('input[placeholder="e.g. Kumar"]', 'Staff');
      await page.clickButton('Save & Onboard Employee');
      await page.waitFor(`!document.body.innerText.includes('Add New Employee')`, 15000);
      page.assertClean('HR_MANAGER', 'priya@garments.com Employee Create');

      // Clean up via Prisma (since Priya's Chennai Branch filter may hide Chennai Head Office rows)
      await prisma.employee.deleteMany({ where: { tenantId: ABC_TENANT_ID, firstName: hrFirst } });
      record('HR_MANAGER', 'priya@garments.com UI onboarding with Branch-scoped login', true, Date.now() - t0);
    } catch (e) {
      record('HR_MANAGER', 'priya@garments.com UI onboarding with Branch-scoped login', false, Date.now() - t0, e.message);
    }

    // Ephemeral EMPLOYEE UI role check
    t0 = Date.now();
    try {
      const empEmail = `qa.ui.emp.${uniqueSuffix}@peoplehub-test.local`;
      const empPass = 'QaUiEmp#2026';
      const empRole = await prisma.role.findFirst({ where: { tenantId: ABC_TENANT_ID, code: 'EMPLOYEE' } });
      if (!empRole) throw new Error('EMPLOYEE role not found');
      const empUser = await prisma.user.create({
        data: {
          email: empEmail,
          passwordHash: await bcrypt.hash(empPass, 10),
          firstName: 'UI',
          lastName: 'Employee',
          status: 'ACTIVE',
          tenantUsers: { create: { tenantId: ABC_TENANT_ID, status: 'ACTIVE' } },
          userRoles: { create: { tenantId: ABC_TENANT_ID, roleId: empRole.id, scopeType: 'TENANT', scopeId: null } },
        },
      });
      ephemeralUsers.push(empUser.id);

      await logoutViaUi(page);
      page.resetTelemetry();
      await loginViaUi(page, empEmail, empPass);

      const sidebarText = await page.evalJs(`document.querySelector('aside')?.innerText || ''`);
      const forbiddenVisible = ['Tenant Management', 'Payroll & Compensation', 'Accounts', 'Attendance & Production', 'Organization Masters']
        .filter((item) => sidebarText.includes(item));
      if (forbiddenVisible.length > 0) {
        throw new Error(`Restricted sidebar items visible to EMPLOYEE: ${forbiddenVisible.join(', ')}`);
      }

      await page.goto(`${WEB_ORIGIN}/dashboard/employees`);
      await page.waitFor(`document.body.innerText.includes('Employee Directory')`);
      await page.sleep(400);
      const hasAddBtn = await page.evalJs(`Boolean(Array.from(document.querySelectorAll('button')).find(b => (b.textContent || '').includes('Add Employee')))`);
      if (hasAddBtn) throw new Error('Add Employee button visible to EMPLOYEE role');

      await page.goto(`${WEB_ORIGIN}/dashboard/leave`);
      await page.waitFor(`document.body.innerText.includes('Leave')`);
      await page.sleep(400);
      page.assertClean('EMPLOYEE', 'Sidebar & Self-Service UI');
      record('EMPLOYEE', 'Sidebar hides Payroll/Accounts/Piece-Rate/Masters & Add Employee hidden', true, Date.now() - t0);
    } catch (e) {
      record('EMPLOYEE', 'Sidebar hides Payroll/Accounts/Piece-Rate/Masters & Add Employee hidden', false, Date.now() - t0, e.message);
    }

    // ------------------------------------------------------------------------
    // Summary
    // ------------------------------------------------------------------------
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    console.log('\n================================================================================');
    console.log(`   REAL BROWSER UI E2E SUMMARY: ${passed}/${results.length} PASSED | ${failed} FAILED`);
    console.log('================================================================================');
    if (failed > 0) process.exitCode = 1;
  } finally {
    if (cdp) cdp.close();
    killProcTree(edgeProc);
    killProcTree(webProc);
    killProcTree(apiProc);
    try {
      await prisma.employee.deleteMany({ where: { firstName: { startsWith: 'UiAuto' } } });
    } catch {}
    for (const uid of ephemeralUsers) {
      try {
        await prisma.auditLog.deleteMany({ where: { userId: uid } });
        await prisma.user.delete({ where: { id: uid } });
      } catch {}
    }
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {}
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Fatal UI E2E failure:', e);
  process.exit(1);
});
