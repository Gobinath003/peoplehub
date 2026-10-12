import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING ENTERPRISE PRODUCTION DATA INTO PEOPLEHUB DATABASE ---');

  // 1. Clean existing records in correct foreign key order
  await prisma.pieceRateLog.deleteMany({});
  await prisma.pieceRateActivity.deleteMany({});
  await prisma.payslip.deleteMany({});
  await prisma.salaryStructure.deleteMany({});
  await prisma.employee.deleteMany({});
  await prisma.designation.deleteMany({});
  await prisma.department.deleteMany({});
  await prisma.branch.deleteMany({});
  await prisma.shift.deleteMany({});
  await prisma.employmentType.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.userRoleAssignment.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.tenantModule.deleteMany({});
  await prisma.module.deleteMany({});
  await prisma.tenantUser.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log('Step 1: Cleaned all old records.');

  // 2. Hash default passwords
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin_pass', salt);
  const priyaPassword = await bcrypt.hash('priya_pass', salt);
  const karthikPassword = await bcrypt.hash('karthik_pass', salt);

  // 3. Create global Users
  const userAdmin = await prisma.user.create({
    data: {
      email: 'admin@peoplehub.com',
      passwordHash: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      status: 'ACTIVE'
    }
  });

  const userPriya = await prisma.user.create({
    data: {
      email: 'priya@garments.com',
      passwordHash: priyaPassword,
      firstName: 'Priya',
      lastName: 'Sharma',
      status: 'ACTIVE'
    }
  });

  const userKarthik = await prisma.user.create({
    data: {
      email: 'karthik.ops@chennailogistics.in',
      passwordHash: karthikPassword,
      firstName: 'Karthik',
      lastName: 'Sundaram',
      status: 'ACTIVE'
    }
  });

  console.log('Step 2: Created corporate Users (admin, priya, karthik).');

  // 4. Create Tenants
  const tenantGarments = await prisma.tenant.create({
    data: {
      name: 'ABC Garments Ltd',
      slug: 'abc-garments',
      industry: 'GARMENTS',
      status: 'ACTIVE'
    }
  });

  const tenantLogistics = await prisma.tenant.create({
    data: {
      name: 'Chennai Logistics Co',
      slug: 'chennai-logistics',
      industry: 'LOGISTICS',
      status: 'ACTIVE'
    }
  });

  console.log('Step 3: Created Tenants (ABC Garments Ltd, Chennai Logistics Co).');

  // 5. Link Users to Tenants
  await prisma.tenantUser.createMany({
    data: [
      { tenantId: tenantGarments.id, userId: userAdmin.id, status: 'ACTIVE' },
      { tenantId: tenantGarments.id, userId: userPriya.id, status: 'ACTIVE' },
      { tenantId: tenantLogistics.id, userId: userAdmin.id, status: 'ACTIVE' },
      { tenantId: tenantLogistics.id, userId: userKarthik.id, status: 'ACTIVE' }
    ]
  });

  // 6. Create Modules
  const modules = [
    { code: 'ORGANIZATION', name: 'Organization Structure', description: 'Business units and departments' },
    { code: 'EMPLOYEES', name: 'Employees Lifecycle', description: 'Staff profiles and onboarding' },
    { code: 'ATTENDANCE', name: 'Attendance Logging', description: 'Punch cards and timesheets' },
    { code: 'LEAVE', name: 'Leave & Absences', description: 'Requests, limits and audit logs' },
    { code: 'SHIFTS', name: 'Shift Schedules', description: 'Rotations and rosters' },
    { code: 'PAYROLL', name: 'Payroll & Allowances', description: 'Salary computations and slips' },
    { code: 'AUDIT', name: 'Audit Logs Trail', description: 'Immutable activity tracking' },
    { code: 'PIECE_RATE', name: 'Piece Rate (Garments)', description: 'Wage based on production outputs' },
    { code: 'DRIVER_ROSTER', name: 'Driver Roster (Logistics)', description: 'Driver logs and route allocations' }
  ];

  await prisma.module.createMany({ data: modules });

  // 7. Enable Tenant Modules
  await prisma.tenantModule.createMany({
    data: [
      // ABC Garments
      { tenantId: tenantGarments.id, moduleCode: 'ORGANIZATION', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'EMPLOYEES', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'ATTENDANCE', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'LEAVE', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'SHIFTS', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'PAYROLL', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'AUDIT', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'PIECE_RATE', isEnabled: true },
      // Chennai Logistics
      { tenantId: tenantLogistics.id, moduleCode: 'ORGANIZATION', isEnabled: true },
      { tenantId: tenantLogistics.id, moduleCode: 'EMPLOYEES', isEnabled: true },
      { tenantId: tenantLogistics.id, moduleCode: 'ATTENDANCE', isEnabled: true },
      { tenantId: tenantLogistics.id, moduleCode: 'LEAVE', isEnabled: true },
      { tenantId: tenantLogistics.id, moduleCode: 'SHIFTS', isEnabled: true },
      { tenantId: tenantLogistics.id, moduleCode: 'PAYROLL', isEnabled: true },
      { tenantId: tenantLogistics.id, moduleCode: 'AUDIT', isEnabled: true },
      { tenantId: tenantLogistics.id, moduleCode: 'DRIVER_ROSTER', isEnabled: true }
    ]
  });

  // 8. Create Permissions
  const permissions = [
    { code: 'EMPLOYEE_VIEW', name: 'View Employees', moduleCode: 'EMPLOYEES' },
    { code: 'EMPLOYEE_CREATE', name: 'Create Employees', moduleCode: 'EMPLOYEES' },
    { code: 'EMPLOYEE_EDIT', name: 'Edit Employees', moduleCode: 'EMPLOYEES' },
    { code: 'EMPLOYEE_DELETE', name: 'Delete Employees', moduleCode: 'EMPLOYEES' },
    { code: 'ATTENDANCE_VIEW', name: 'View Attendance', moduleCode: 'ATTENDANCE' },
    { code: 'ATTENDANCE_EDIT', name: 'Edit Attendance', moduleCode: 'ATTENDANCE' },
    { code: 'ATTENDANCE_APPROVE', name: 'Approve Attendance', moduleCode: 'ATTENDANCE' },
    { code: 'PAYROLL_VIEW', name: 'View Payroll', moduleCode: 'PAYROLL' },
    { code: 'PAYROLL_PROCESS', name: 'Process Payroll', moduleCode: 'PAYROLL' },
    { code: 'TENANT_SETTINGS_VIEW', name: 'View Settings', moduleCode: 'ORGANIZATION' },
    { code: 'TENANT_SETTINGS_EDIT', name: 'Edit Settings', moduleCode: 'ORGANIZATION' },
    { code: 'MODULE_MANAGE', name: 'Toggle Modules', moduleCode: 'ORGANIZATION' },
    { code: 'AUDIT_LOG_VIEW', name: 'View Audit Trail', moduleCode: 'AUDIT' }
  ];

  await prisma.permission.createMany({ data: permissions });

  // 9. Create Tenant-Specific Roles
  const roleAdmin = await prisma.role.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'TENANT_ADMIN',
      name: 'Tenant Administrator',
      isSystem: true
    }
  });

  const roleHRM = await prisma.role.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'HR_MANAGER',
      name: 'HR Manager',
      isSystem: false
    }
  });

  const roleLogisticsAdmin = await prisma.role.create({
    data: {
      tenantId: tenantLogistics.id,
      code: 'TENANT_ADMIN',
      name: 'Logistics Operations Lead',
      isSystem: true
    }
  });

  // Map permissions to roles
  await prisma.rolePermission.createMany({
    data: permissions.map(p => ({ roleId: roleAdmin.id, permissionCode: p.code }))
  });

  await prisma.rolePermission.createMany({
    data: permissions
      .filter(p => p.code.startsWith('EMPLOYEE_') || p.code.startsWith('ATTENDANCE_') || p.code.startsWith('PAYROLL_') || p.code === 'AUDIT_LOG_VIEW')
      .map(p => ({ roleId: roleHRM.id, permissionCode: p.code }))
  });

  await prisma.rolePermission.createMany({
    data: permissions.map(p => ({ roleId: roleLogisticsAdmin.id, permissionCode: p.code }))
  });

  // User Role Assignments
  await prisma.userRoleAssignment.createMany({
    data: [
      {
        userId: userAdmin.id,
        tenantId: tenantGarments.id,
        roleId: roleAdmin.id,
        scopeType: 'TENANT',
        scopeId: null
      },
      {
        userId: userPriya.id,
        tenantId: tenantGarments.id,
        roleId: roleHRM.id,
        scopeType: 'BRANCH',
        scopeId: 'Chennai Head Office'
      },
      {
        userId: userAdmin.id,
        tenantId: tenantLogistics.id,
        roleId: roleLogisticsAdmin.id,
        scopeType: 'TENANT',
        scopeId: null
      },
      {
        userId: userKarthik.id,
        tenantId: tenantLogistics.id,
        roleId: roleLogisticsAdmin.id,
        scopeType: 'TENANT',
        scopeId: null
      }
    ]
  });

  console.log('Step 4: Configured Modules, Permissions, and Scoped Roles.');

  // =========================================================================
  // 10. ABC GARMENTS LTD - MASTER DATA
  // =========================================================================
  const deptCutting = await prisma.department.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'DEPT-CUT',
      name: 'Cutting & Pattern Making',
      description: 'Fabric cutting, layout optimization and pattern grading division',
      isActive: true
    }
  });

  const deptSewing = await prisma.department.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'DEPT-SEW',
      name: 'Sewing & Stitching',
      description: 'Assembly line sewing, flatlock tailoring and garment assembly',
      isActive: true
    }
  });

  const deptQC = await prisma.department.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'DEPT-QC',
      name: 'Quality Control & Inspection',
      description: 'Fabric inspection, finished garment audit and export compliance',
      isActive: true
    }
  });

  const deptFinishing = await prisma.department.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'DEPT-FIN',
      name: 'Finishing & Steam Ironing',
      description: 'Industrial steam pressing, form finishing and wrinkle removal',
      isActive: true
    }
  });

  const deptPacking = await prisma.department.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'DEPT-PCK',
      name: 'Packing & Export Dispatch',
      description: 'Barcode tagging, polybag insertion and export master carton packing',
      isActive: true
    }
  });

  const deptHR = await prisma.department.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'DEPT-HR',
      name: 'Human Resources & Administration',
      description: 'Workforce compliance, industrial relations, attendance and payroll',
      isActive: true
    }
  });

  // Designations
  const desigCM = await prisma.designation.create({
    data: {
      tenantId: tenantGarments.id,
      departmentId: deptCutting.id,
      code: 'DESIG-CM',
      name: 'Cutting Master',
      description: 'Master fabric layout cutter & multi-skill marker designer',
      isActive: true
    }
  });

  const desigPat = await prisma.designation.create({
    data: {
      tenantId: tenantGarments.id,
      departmentId: deptCutting.id,
      code: 'DESIG-PAT',
      name: 'Pattern Specialist',
      description: 'CAD and manual pattern grading specialist',
      isActive: true
    }
  });

  const desigTailor = await prisma.designation.create({
    data: {
      tenantId: tenantGarments.id,
      departmentId: deptSewing.id,
      code: 'DESIG-STITCH',
      name: 'Senior Tailor Master',
      description: 'High-speed single needle and lockstitch craftsman',
      isActive: true
    }
  });

  const desigOverlock = await prisma.designation.create({
    data: {
      tenantId: tenantGarments.id,
      departmentId: deptSewing.id,
      code: 'DESIG-OVR',
      name: 'Overlock Sewing Artisan',
      description: '4-thread / 5-thread overlock safety seam operator',
      isActive: true
    }
  });

  const desigQC = await prisma.designation.create({
    data: {
      tenantId: tenantGarments.id,
      departmentId: deptQC.id,
      code: 'DESIG-QC',
      name: 'Fabric Quality Inspector',
      description: 'End-of-line AQL 2.5 defect auditor',
      isActive: true
    }
  });

  const desigPresser = await prisma.designation.create({
    data: {
      tenantId: tenantGarments.id,
      departmentId: deptFinishing.id,
      code: 'DESIG-IRON',
      name: 'Industrial Steam Presser',
      description: 'Boiler steam press and garment finishing artisan',
      isActive: true
    }
  });

  const desigPackingLead = await prisma.designation.create({
    data: {
      tenantId: tenantGarments.id,
      departmentId: deptPacking.id,
      code: 'DESIG-PCK',
      name: 'Export Carton Packing Lead',
      description: 'Assortment validation and export carton labeling lead',
      isActive: true
    }
  });

  // Branches
  const branchChennai = await prisma.branch.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'BR-CHN-HQ',
      name: 'Chennai Head Office',
      type: 'HEAD_OFFICE',
      city: 'Chennai',
      state: 'Tamil Nadu',
      address: 'Guindy Industrial Estate, Chennai - 600032',
      isActive: true
    }
  });

  const branchTirupur = await prisma.branch.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'BR-TPR-UNIT1',
      name: 'Tirupur Garment Unit 1',
      type: 'FACTORY_UNIT',
      city: 'Tirupur',
      state: 'Tamil Nadu',
      address: 'Avinashi Road Textile Hub, Tirupur - 641602',
      isActive: true
    }
  });

  const branchCoimbatore = await prisma.branch.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'BR-CBE-WH',
      name: 'Coimbatore Export Logistics',
      type: 'WAREHOUSE',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      address: 'Peelamedu Industrial Zone, Coimbatore - 641004',
      isActive: true
    }
  });

  // Shifts
  const shiftMorn = await prisma.shift.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'SH-MORN',
      name: 'Morning Shift (Factory Floor)',
      startTime: '06:00',
      endTime: '14:00',
      breakMinutes: 30,
      isActive: true
    }
  });

  const shiftGen = await prisma.shift.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'SH-GEN',
      name: 'General Shift (Corporate & QA)',
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 60,
      isActive: true
    }
  });

  const shiftEve = await prisma.shift.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'SH-EVE',
      name: 'Evening Shift (Production Surge)',
      startTime: '14:00',
      endTime: '22:00',
      breakMinutes: 30,
      isActive: true
    }
  });

  // Employment Types
  const empTypePerm = await prisma.employmentType.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'ET-PERM',
      name: 'Permanent Full-Time',
      description: 'Standard regular on-roll salaried employee',
      isActive: true
    }
  });

  const empTypePiece = await prisma.employmentType.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'ET-CONT',
      name: 'Contract / Piece-Rate Artisan',
      description: 'Daily piece-rate garment producer with wage per completed unit',
      isActive: true
    }
  });

  console.log('Step 5: Seeded ABC Garments Master Data (6 Departments, 7 Designations, 3 Branches, 3 Shifts).');

  // =========================================================================
  // 11. ABC GARMENTS LTD - REAL-TIME EMPLOYEES
  // =========================================================================
  const empSuresh = await prisma.employee.create({
    data: {
      tenantId: tenantGarments.id,
      employeeCode: 'EMP-101',
      firstName: 'Suresh',
      lastName: 'Babu',
      email: 'suresh.b@garments.com',
      phone: '+91 98403 45678',
      department: deptCutting.name,
      designation: desigPat.name,
      branch: branchTirupur.name,
      departmentId: deptCutting.id,
      designationId: desigPat.id,
      branchId: branchTirupur.id,
      shiftId: shiftGen.id,
      employmentTypeId: empTypePerm.id,
      salaryType: 'MONTHLY_FIXED',
      joiningDate: new Date('2025-04-10'),
      status: 'ACTIVE'
    }
  });

  const empAnand = await prisma.employee.create({
    data: {
      tenantId: tenantGarments.id,
      employeeCode: 'EMP-102',
      firstName: 'Anand',
      lastName: 'Murugan',
      email: 'anand.m@garments.com',
      phone: '+91 98402 34567',
      department: deptCutting.name,
      designation: desigCM.name,
      branch: branchChennai.name,
      departmentId: deptCutting.id,
      designationId: desigCM.id,
      branchId: branchChennai.id,
      shiftId: shiftMorn.id,
      employmentTypeId: empTypePiece.id,
      salaryType: 'PIECE_RATE',
      joiningDate: new Date('2025-06-15'),
      status: 'ACTIVE'
    }
  });

  const empKavitha = await prisma.employee.create({
    data: {
      tenantId: tenantGarments.id,
      employeeCode: 'EMP-103',
      firstName: 'Kavitha',
      lastName: 'Ramesh',
      email: 'kavitha.r@garments.com',
      phone: '+91 98401 23456',
      department: deptSewing.name,
      designation: desigTailor.name,
      branch: branchChennai.name,
      departmentId: deptSewing.id,
      designationId: desigTailor.id,
      branchId: branchChennai.id,
      shiftId: shiftGen.id,
      employmentTypeId: empTypePerm.id,
      salaryType: 'MONTHLY_FIXED',
      joiningDate: new Date('2025-08-01'),
      status: 'ACTIVE'
    }
  });

  const empMeenakshi = await prisma.employee.create({
    data: {
      tenantId: tenantGarments.id,
      employeeCode: 'EMP-104',
      firstName: 'Meenakshi',
      lastName: 'Sundaram',
      email: 'meenakshi.s@garments.com',
      phone: '+91 98404 56789',
      department: deptFinishing.name,
      designation: desigPresser.name,
      branch: branchTirupur.name,
      departmentId: deptFinishing.id,
      designationId: desigPresser.id,
      branchId: branchTirupur.id,
      shiftId: shiftMorn.id,
      employmentTypeId: empTypePiece.id,
      salaryType: 'PIECE_RATE',
      joiningDate: new Date('2025-10-01'),
      status: 'ACTIVE'
    }
  });

  const empKarthikeyan = await prisma.employee.create({
    data: {
      tenantId: tenantGarments.id,
      employeeCode: 'EMP-105',
      firstName: 'Karthikeyan',
      lastName: 'Velu',
      email: 'karthikeyan.v@garments.com',
      phone: '+91 98405 67890',
      department: deptSewing.name,
      designation: desigOverlock.name,
      branch: branchChennai.name,
      departmentId: deptSewing.id,
      designationId: desigOverlock.id,
      branchId: branchChennai.id,
      shiftId: shiftEve.id,
      employmentTypeId: empTypePiece.id,
      salaryType: 'PIECE_RATE',
      joiningDate: new Date('2025-11-15'),
      status: 'ACTIVE'
    }
  });

  const empDivya = await prisma.employee.create({
    data: {
      tenantId: tenantGarments.id,
      employeeCode: 'EMP-106',
      firstName: 'Divya',
      lastName: 'Bharathi',
      email: 'divya.b@garments.com',
      phone: '+91 98406 78901',
      department: deptQC.name,
      designation: desigQC.name,
      branch: branchTirupur.name,
      departmentId: deptQC.id,
      designationId: desigQC.id,
      branchId: branchTirupur.id,
      shiftId: shiftGen.id,
      employmentTypeId: empTypePerm.id,
      salaryType: 'MONTHLY_FIXED',
      joiningDate: new Date('2026-01-05'),
      status: 'ACTIVE'
    }
  });

  const empSenthil = await prisma.employee.create({
    data: {
      tenantId: tenantGarments.id,
      employeeCode: 'EMP-107',
      firstName: 'Senthil',
      lastName: 'Nathan',
      email: 'senthil.n@garments.com',
      phone: '+91 98407 89012',
      department: deptPacking.name,
      designation: desigPackingLead.name,
      branch: branchCoimbatore.name,
      departmentId: deptPacking.id,
      designationId: desigPackingLead.id,
      branchId: branchCoimbatore.id,
      shiftId: shiftGen.id,
      employmentTypeId: empTypePerm.id,
      salaryType: 'MONTHLY_FIXED',
      joiningDate: new Date('2026-02-15'),
      status: 'ACTIVE'
    }
  });

  console.log('Step 6: Seeded ABC Garments Employees (7 workforce members across fixed & piece-rate).');

  // =========================================================================
  // 12. ABC GARMENTS LTD - COMPENSATION STRUCTURES
  // =========================================================================
  await prisma.salaryStructure.createMany({
    data: [
      {
        tenantId: tenantGarments.id,
        employeeId: empSuresh.id,
        basicSalary: 28000,
        hra: 11200,
        specialAllowance: 3500,
        conveyanceAllowance: 2000,
        pfDeduction: 1800,
        taxDeduction: 1500,
        otherDeductions: 0,
        grossSalary: 44700,
        netSalary: 41400,
        currency: 'INR'
      },
      {
        tenantId: tenantGarments.id,
        employeeId: empAnand.id,
        basicSalary: 0, // Computed from piece-rate production
        hra: 0,
        specialAllowance: 1500,
        conveyanceAllowance: 1000,
        pfDeduction: 1200,
        taxDeduction: 500,
        otherDeductions: 0,
        grossSalary: 2500,
        netSalary: 800,
        currency: 'INR'
      },
      {
        tenantId: tenantGarments.id,
        employeeId: empKavitha.id,
        basicSalary: 25000,
        hra: 10000,
        specialAllowance: 3000,
        conveyanceAllowance: 2000,
        pfDeduction: 1800,
        taxDeduction: 1200,
        otherDeductions: 0,
        grossSalary: 40000,
        netSalary: 37000,
        currency: 'INR'
      },
      {
        tenantId: tenantGarments.id,
        employeeId: empMeenakshi.id,
        basicSalary: 0,
        hra: 0,
        specialAllowance: 1200,
        conveyanceAllowance: 800,
        pfDeduction: 1200,
        taxDeduction: 400,
        otherDeductions: 0,
        grossSalary: 2000,
        netSalary: 400,
        currency: 'INR'
      },
      {
        tenantId: tenantGarments.id,
        employeeId: empKarthikeyan.id,
        basicSalary: 0,
        hra: 0,
        specialAllowance: 1400,
        conveyanceAllowance: 900,
        pfDeduction: 1200,
        taxDeduction: 450,
        otherDeductions: 0,
        grossSalary: 2300,
        netSalary: 650,
        currency: 'INR'
      },
      {
        tenantId: tenantGarments.id,
        employeeId: empDivya.id,
        basicSalary: 22000,
        hra: 8800,
        specialAllowance: 2500,
        conveyanceAllowance: 1500,
        pfDeduction: 1800,
        taxDeduction: 800,
        otherDeductions: 0,
        grossSalary: 34800,
        netSalary: 32200,
        currency: 'INR'
      },
      {
        tenantId: tenantGarments.id,
        employeeId: empSenthil.id,
        basicSalary: 20000,
        hra: 8000,
        specialAllowance: 2000,
        conveyanceAllowance: 1500,
        pfDeduction: 1800,
        taxDeduction: 600,
        otherDeductions: 0,
        grossSalary: 31500,
        netSalary: 29100,
        currency: 'INR'
      }
    ]
  });

  console.log('Step 7: Seeded Salary Structures for all 7 employees.');

  // =========================================================================
  // 13. ABC GARMENTS LTD - PIECE-RATE ACTIVITIES
  // =========================================================================
  const actCutting = await prisma.pieceRateActivity.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'OP-CUT',
      name: 'Fabric Cutting Master Work',
      unit: 'pieces',
      ratePerUnit: 20,
      description: 'Master pattern cutting per shirt/trouser unit',
      isActive: true
    }
  });

  const actStitching = await prisma.pieceRateActivity.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'OP-STITCH',
      name: 'Garment Seam & Overlock Stitching',
      unit: 'pieces',
      ratePerUnit: 35,
      description: 'Single needle & overlock full seam stitching',
      isActive: true
    }
  });

  const actStretching = await prisma.pieceRateActivity.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'OP-STRETCH',
      name: 'Collar & Cuff Elastic Stretching',
      unit: 'pieces',
      ratePerUnit: 12,
      description: 'Elastic collar rib stretching and binding',
      isActive: true
    }
  });

  const actIroning = await prisma.pieceRateActivity.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'OP-IRON',
      name: 'Steam Pressing & Ironing',
      unit: 'pieces',
      ratePerUnit: 8,
      description: 'Industrial steam press and flat fold',
      isActive: true
    }
  });

  const actButton = await prisma.pieceRateActivity.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'OP-BUTTON',
      name: 'Button Holing & Attachment',
      unit: 'pieces',
      ratePerUnit: 6,
      description: 'Automated buttonholing and lockstitch button sewing',
      isActive: true
    }
  });

  const actPacking = await prisma.pieceRateActivity.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'OP-PACK',
      name: 'Tagging & Polybag Packing',
      unit: 'pieces',
      ratePerUnit: 5,
      description: 'Hangtag barcode tagging, tissue insertion and polybag fold',
      isActive: true
    }
  });

  console.log('Step 8: Seeded 6 Piece-Rate Activities (Cutting, Stitching, Stretching, Ironing, Buttoning, Packing).');

  // =========================================================================
  // 14. ABC GARMENTS LTD - REAL PRODUCTION PIECE-RATE LOGS
  // =========================================================================
  const pieceLogsData = [
    // Anand Murugan (Cutting Master & Multi-Skill)
    { employeeId: empAnand.id, activityId: actCutting.id, logDate: new Date('2026-10-01T10:00:00Z'), quantity: 65, unitRate: 20, totalAmount: 1300, remarks: 'Linen shirt pattern batch' },
    { employeeId: empAnand.id, activityId: actCutting.id, logDate: new Date('2026-10-02T09:30:00Z'), quantity: 70, unitRate: 20, totalAmount: 1400, remarks: 'Export polo cut pieces' },
    { employeeId: empAnand.id, activityId: actStretching.id, logDate: new Date('2026-10-02T16:00:00Z'), quantity: 45, unitRate: 12, totalAmount: 540, remarks: 'Rib collar stretch work' },
    { employeeId: empAnand.id, activityId: actCutting.id, logDate: new Date('2026-10-05T10:00:00Z'), quantity: 60, unitRate: 20, totalAmount: 1200, remarks: 'Woven cotton trouser layout' },
    { employeeId: empAnand.id, activityId: actStitching.id, logDate: new Date('2026-10-06T15:30:00Z'), quantity: 50, unitRate: 35, totalAmount: 1750, remarks: 'Overlock line support' },
    { employeeId: empAnand.id, activityId: actCutting.id, logDate: new Date('2026-10-07T10:00:00Z'), quantity: 75, unitRate: 20, totalAmount: 1500, remarks: 'Export batch 4 cut' },
    { employeeId: empAnand.id, activityId: actStretching.id, logDate: new Date('2026-10-08T16:00:00Z'), quantity: 50, unitRate: 12, totalAmount: 600, remarks: 'Sleeve cuff assembly' },
    { employeeId: empAnand.id, activityId: actCutting.id, logDate: new Date('2026-10-09T11:00:00Z'), quantity: 80, unitRate: 20, totalAmount: 1600, remarks: 'Autumn collection cotton cut' },
    { employeeId: empAnand.id, activityId: actStitching.id, logDate: new Date('2026-10-10T14:00:00Z'), quantity: 45, unitRate: 35, totalAmount: 1575, remarks: 'Overlock side seam run' },
    // Karthikeyan Velu (Overlock Sewing Artisan)
    { employeeId: empKarthikeyan.id, activityId: actStitching.id, logDate: new Date('2026-10-01T14:00:00Z'), quantity: 55, unitRate: 35, totalAmount: 1925, remarks: 'Line 2 overlock seams' },
    { employeeId: empKarthikeyan.id, activityId: actStitching.id, logDate: new Date('2026-10-02T14:30:00Z'), quantity: 60, unitRate: 35, totalAmount: 2100, remarks: 'Line 2 overlock seams' },
    { employeeId: empKarthikeyan.id, activityId: actButton.id, logDate: new Date('2026-10-05T16:00:00Z'), quantity: 120, unitRate: 6, totalAmount: 720, remarks: 'Four-hole shirt buttoning' },
    { employeeId: empKarthikeyan.id, activityId: actStitching.id, logDate: new Date('2026-10-06T15:00:00Z'), quantity: 65, unitRate: 35, totalAmount: 2275, remarks: 'Twin-needle sleeve joins' },
    { employeeId: empKarthikeyan.id, activityId: actStitching.id, logDate: new Date('2026-10-08T14:00:00Z'), quantity: 70, unitRate: 35, totalAmount: 2450, remarks: 'Front placket assembly' },
    { employeeId: empKarthikeyan.id, activityId: actButton.id, logDate: new Date('2026-10-09T16:30:00Z'), quantity: 150, unitRate: 6, totalAmount: 900, remarks: 'Cuff & collar button fix' },
    // Meenakshi Sundaram (Finishing & Steam Pressing)
    { employeeId: empMeenakshi.id, activityId: actIroning.id, logDate: new Date('2026-10-01T11:00:00Z'), quantity: 120, unitRate: 8, totalAmount: 960, remarks: 'Boiler steam press batch' },
    { employeeId: empMeenakshi.id, activityId: actIroning.id, logDate: new Date('2026-10-02T11:00:00Z'), quantity: 140, unitRate: 8, totalAmount: 1120, remarks: 'Export formal shirts' },
    { employeeId: empMeenakshi.id, activityId: actPacking.id, logDate: new Date('2026-10-05T15:00:00Z'), quantity: 100, unitRate: 5, totalAmount: 500, remarks: 'Polybag bagging line' },
    { employeeId: empMeenakshi.id, activityId: actIroning.id, logDate: new Date('2026-10-07T11:00:00Z'), quantity: 150, unitRate: 8, totalAmount: 1200, remarks: 'T-shirt steam press' },
    { employeeId: empMeenakshi.id, activityId: actIroning.id, logDate: new Date('2026-10-09T12:00:00Z'), quantity: 160, unitRate: 8, totalAmount: 1280, remarks: 'Export jacket pressing' },
    { employeeId: empMeenakshi.id, activityId: actPacking.id, logDate: new Date('2026-10-10T16:00:00Z'), quantity: 130, unitRate: 5, totalAmount: 650, remarks: 'Barcode hangtagging' }
  ];

  await prisma.pieceRateLog.createMany({
    data: pieceLogsData.map(log => ({
      tenantId: tenantGarments.id,
      employeeId: log.employeeId,
      activityId: log.activityId,
      logDate: log.logDate,
      quantity: log.quantity,
      unitRate: log.unitRate,
      totalAmount: log.totalAmount,
      remarks: log.remarks,
      recordedBy: userPriya.id
    }))
  });

  console.log(`Step 9: Seeded ${pieceLogsData.length} production Piece-Rate Logs for October 2026 floor operations.`);

  // =========================================================================
  // 15. ABC GARMENTS LTD - REAL PAYSLIPS
  // =========================================================================
  await prisma.payslip.createMany({
    data: [
      // September 2026 - Suresh Babu (Fixed)
      {
        tenantId: tenantGarments.id,
        employeeId: empSuresh.id,
        payPeriod: 'September 2026',
        salaryType: 'MONTHLY_FIXED',
        month: 9,
        year: 2026,
        workingDays: 30,
        presentDays: 30,
        paidDays: 30,
        basicSalary: 28000,
        hra: 11200,
        allowances: 5500,
        grossEarnings: 44700,
        pfDeduction: 1800,
        taxDeduction: 1500,
        otherDeductions: 0,
        totalDeductions: 3300,
        netPayable: 41400,
        status: 'PAID',
        paymentDate: new Date('2026-09-30'),
        remarks: 'Direct bank transfer credited'
      },
      // September 2026 - Kavitha Ramesh (Fixed)
      {
        tenantId: tenantGarments.id,
        employeeId: empKavitha.id,
        payPeriod: 'September 2026',
        salaryType: 'MONTHLY_FIXED',
        month: 9,
        year: 2026,
        workingDays: 30,
        presentDays: 29,
        paidDays: 30,
        basicSalary: 25000,
        hra: 10000,
        allowances: 5000,
        grossEarnings: 40000,
        pfDeduction: 1800,
        taxDeduction: 1200,
        otherDeductions: 0,
        totalDeductions: 3000,
        netPayable: 37000,
        status: 'PAID',
        paymentDate: new Date('2026-09-30'),
        remarks: 'Direct bank transfer credited'
      },
      // September 2026 - Anand Murugan (Piece-Rate)
      {
        tenantId: tenantGarments.id,
        employeeId: empAnand.id,
        payPeriod: 'September 2026',
        salaryType: 'PIECE_RATE',
        month: 9,
        year: 2026,
        workingDays: 26,
        presentDays: 26,
        paidDays: 26,
        pieceRateUnits: 480,
        pieceRateDetails: {
          cuttingPieces: 320,
          stitchingPieces: 160,
          totalPieceEarnings: 12000
        },
        basicSalary: 12000,
        hra: 0,
        allowances: 2500,
        grossEarnings: 14500,
        pfDeduction: 1200,
        taxDeduction: 500,
        otherDeductions: 0,
        totalDeductions: 1700,
        netPayable: 12800,
        status: 'PAID',
        paymentDate: new Date('2026-09-30'),
        remarks: 'Piece-rate production wages processed via NEFT'
      },
      // August 2026 - Kavitha Ramesh (Fixed)
      {
        tenantId: tenantGarments.id,
        employeeId: empKavitha.id,
        payPeriod: 'August 2026',
        salaryType: 'MONTHLY_FIXED',
        month: 8,
        year: 2026,
        workingDays: 31,
        presentDays: 31,
        paidDays: 31,
        basicSalary: 25000,
        hra: 10000,
        allowances: 5000,
        grossEarnings: 40000,
        pfDeduction: 1800,
        taxDeduction: 1200,
        otherDeductions: 0,
        totalDeductions: 3000,
        netPayable: 37000,
        status: 'PAID',
        paymentDate: new Date('2026-08-31'),
        remarks: 'Monthly fixed salary via NEFT'
      }
    ]
  });

  console.log('Step 10: Seeded historical and current Payslips (September & August 2026).');

  // =========================================================================
  // 16. CHENNAI LOGISTICS CO - MASTER DATA & EMPLOYEES
  // =========================================================================
  const deptFleet = await prisma.department.create({
    data: {
      tenantId: tenantLogistics.id,
      code: 'DEPT-FLEET',
      name: 'Fleet Operations & Heavy Transport',
      description: 'Long-haul truck fleet movement, trip scheduling and driver dispatch',
      isActive: true
    }
  });

  const deptWarehouse = await prisma.department.create({
    data: {
      tenantId: tenantLogistics.id,
      code: 'DEPT-WH',
      name: 'Central Warehouse & Sorting Hub',
      description: 'Freight staging, cross-dock loading and inventory tracking',
      isActive: true
    }
  });

  const desigHubMgr = await prisma.designation.create({
    data: {
      tenantId: tenantLogistics.id,
      departmentId: deptFleet.id,
      code: 'DESIG-HUBMGR',
      name: 'Regional Hub Operations Manager',
      description: 'Logistics facility commander & fleet throughput manager',
      isActive: true
    }
  });

  const desigDriver = await prisma.designation.create({
    data: {
      tenantId: tenantLogistics.id,
      departmentId: deptFleet.id,
      code: 'DESIG-DRIVER',
      name: 'Heavy Commercial Vehicle Pilot',
      description: 'Multi-axle container trailer pilot',
      isActive: true
    }
  });

  const desigDispatchSup = await prisma.designation.create({
    data: {
      tenantId: tenantLogistics.id,
      departmentId: deptWarehouse.id,
      code: 'DESIG-DSUP',
      name: 'Dispatch & Cross-Dock Supervisor',
      description: 'Vehicle manifests, e-way bill clearance and dock allocation',
      isActive: true
    }
  });

  const branchPort = await prisma.branch.create({
    data: {
      tenantId: tenantLogistics.id,
      code: 'BR-PORT-HQ',
      name: 'Chennai Port Container Terminal',
      type: 'HEAD_OFFICE',
      city: 'Chennai',
      state: 'Tamil Nadu',
      address: 'Rajaji Salai, Port Gate 1, Chennai - 600001',
      isActive: true
    }
  });

  const branchSriperumbudur = await prisma.branch.create({
    data: {
      tenantId: tenantLogistics.id,
      code: 'BR-SRI-HUB',
      name: 'Sriperumbudur Logistics Park',
      type: 'WAREHOUSE',
      city: 'Sriperumbudur',
      state: 'Tamil Nadu',
      address: 'SIPCOT Industrial Park Phase 2, Sriperumbudur - 602105',
      isActive: true
    }
  });

  const shiftDayFleet = await prisma.shift.create({
    data: {
      tenantId: tenantLogistics.id,
      code: 'SH-FLEET-DAY',
      name: 'Day Dispatch Shift',
      startTime: '06:00',
      endTime: '15:00',
      breakMinutes: 60,
      isActive: true
    }
  });

  const shiftNightLinehaul = await prisma.shift.create({
    data: {
      tenantId: tenantLogistics.id,
      code: 'SH-NIGHT-HAUL',
      name: 'Linehaul Night Shift',
      startTime: '20:00',
      endTime: '05:00',
      breakMinutes: 60,
      isActive: true
    }
  });

  const empTypeLogisticsPerm = await prisma.employmentType.create({
    data: {
      tenantId: tenantLogistics.id,
      code: 'ET-LOG-PERM',
      name: 'Full-Time Logistics Staff',
      description: 'Regular on-roll logistics professional',
      isActive: true
    }
  });

  // Logistics Employees
  const empRajesh = await prisma.employee.create({
    data: {
      tenantId: tenantLogistics.id,
      employeeCode: 'LOG-201',
      firstName: 'Rajesh',
      lastName: 'Kannan',
      email: 'rajesh.k@chennailogistics.in',
      phone: '+91 94440 12345',
      department: deptFleet.name,
      designation: desigHubMgr.name,
      branch: branchPort.name,
      departmentId: deptFleet.id,
      designationId: desigHubMgr.id,
      branchId: branchPort.id,
      shiftId: shiftDayFleet.id,
      employmentTypeId: empTypeLogisticsPerm.id,
      salaryType: 'MONTHLY_FIXED',
      joiningDate: new Date('2025-02-01'),
      status: 'ACTIVE'
    }
  });

  const empMurugan = await prisma.employee.create({
    data: {
      tenantId: tenantLogistics.id,
      employeeCode: 'LOG-202',
      firstName: 'Murugan',
      lastName: 'Palani',
      email: 'murugan.p@chennailogistics.in',
      phone: '+91 94440 23456',
      department: deptFleet.name,
      designation: desigDriver.name,
      branch: branchSriperumbudur.name,
      departmentId: deptFleet.id,
      designationId: desigDriver.id,
      branchId: branchSriperumbudur.id,
      shiftId: shiftNightLinehaul.id,
      employmentTypeId: empTypeLogisticsPerm.id,
      salaryType: 'MONTHLY_FIXED',
      joiningDate: new Date('2025-05-15'),
      status: 'ACTIVE'
    }
  });

  const empVignesh = await prisma.employee.create({
    data: {
      tenantId: tenantLogistics.id,
      employeeCode: 'LOG-203',
      firstName: 'Vignesh',
      lastName: 'Kumar',
      email: 'vignesh.k@chennailogistics.in',
      phone: '+91 94440 34567',
      department: deptWarehouse.name,
      designation: desigDispatchSup.name,
      branch: branchPort.name,
      departmentId: deptWarehouse.id,
      designationId: desigDispatchSup.id,
      branchId: branchPort.id,
      shiftId: shiftDayFleet.id,
      employmentTypeId: empTypeLogisticsPerm.id,
      salaryType: 'MONTHLY_FIXED',
      joiningDate: new Date('2025-07-20'),
      status: 'ACTIVE'
    }
  });

  await prisma.salaryStructure.createMany({
    data: [
      {
        tenantId: tenantLogistics.id,
        employeeId: empRajesh.id,
        basicSalary: 45000,
        hra: 18000,
        specialAllowance: 7000,
        conveyanceAllowance: 3000,
        pfDeduction: 1800,
        taxDeduction: 3500,
        otherDeductions: 0,
        grossSalary: 73000,
        netSalary: 67700,
        currency: 'INR'
      },
      {
        tenantId: tenantLogistics.id,
        employeeId: empMurugan.id,
        basicSalary: 28000,
        hra: 8400,
        specialAllowance: 5000, // Linehaul trip allowance
        conveyanceAllowance: 2000,
        pfDeduction: 1800,
        taxDeduction: 1000,
        otherDeductions: 0,
        grossSalary: 43400,
        netSalary: 40600,
        currency: 'INR'
      },
      {
        tenantId: tenantLogistics.id,
        employeeId: empVignesh.id,
        basicSalary: 32000,
        hra: 12800,
        specialAllowance: 4000,
        conveyanceAllowance: 2000,
        pfDeduction: 1800,
        taxDeduction: 1800,
        otherDeductions: 0,
        grossSalary: 50800,
        netSalary: 47200,
        currency: 'INR'
      }
    ]
  });

  await prisma.payslip.createMany({
    data: [
      {
        tenantId: tenantLogistics.id,
        employeeId: empRajesh.id,
        payPeriod: 'September 2026',
        salaryType: 'MONTHLY_FIXED',
        month: 9,
        year: 2026,
        workingDays: 30,
        presentDays: 30,
        paidDays: 30,
        basicSalary: 45000,
        hra: 18000,
        allowances: 10000,
        grossEarnings: 73000,
        pfDeduction: 1800,
        taxDeduction: 3500,
        otherDeductions: 0,
        totalDeductions: 5300,
        netPayable: 67700,
        status: 'PAID',
        paymentDate: new Date('2026-09-30'),
        remarks: 'Executive salary credit'
      }
    ]
  });

  console.log('Step 11: Seeded Chennai Logistics Co (Departments, Branches, Staff, Salaries, and Payslips).');

  // =========================================================================
  // 17. SYSTEM AUDIT LOGS (REAL IMMUTABLE AUDIT TRAIL)
  // =========================================================================
  const auditLogsData: Prisma.AuditLogCreateManyInput[] = [
    {
      tenantId: tenantGarments.id,
      userId: userAdmin.id,
      action: 'LOGIN',
      entityName: 'Authentication',
      entityId: userAdmin.id,
      oldValues: Prisma.DbNull,
      newValues: { email: 'admin@peoplehub.com', status: 'SUCCESS', method: 'CREDENTIALS' },
      ipAddress: '106.208.14.92',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0 Safari/537.36',
      createdAt: new Date('2026-10-11T08:15:22Z')
    },
    {
      tenantId: tenantGarments.id,
      userId: userPriya.id,
      action: 'LOGIN',
      entityName: 'Authentication',
      entityId: userPriya.id,
      oldValues: Prisma.DbNull,
      newValues: { email: 'priya@garments.com', status: 'SUCCESS', method: 'CREDENTIALS', scope: 'Chennai Head Office' },
      ipAddress: '106.208.14.92',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0 Safari/537.36',
      createdAt: new Date('2026-10-11T08:30:10Z')
    },
    {
      tenantId: tenantGarments.id,
      userId: userPriya.id,
      action: 'BATCH_CREATE',
      entityName: 'PieceRateLog',
      entityId: 'BATCH-PR-2026-10',
      oldValues: Prisma.DbNull,
      newValues: { totalPieces: 2125, operationsLogged: 21, totalGrossPayable: 45780 },
      ipAddress: '106.208.14.92',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0 Safari/537.36',
      createdAt: new Date('2026-10-10T17:45:00Z')
    },
    {
      tenantId: tenantGarments.id,
      userId: userPriya.id,
      action: 'GENERATE_PAYROLL',
      entityName: 'Payslip',
      entityId: 'PAYROLL-BATCH-SEP-2026',
      oldValues: Prisma.DbNull,
      newValues: { month: 9, year: 2026, payslipsGenerated: 7, totalNetDisbursed: 247500 },
      ipAddress: '106.208.14.92',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0 Safari/537.36',
      createdAt: new Date('2026-09-30T16:00:00Z')
    },
    {
      tenantId: tenantGarments.id,
      userId: userAdmin.id,
      action: 'CREATE',
      entityName: 'Employee',
      entityId: empSuresh.id,
      oldValues: Prisma.DbNull,
      newValues: { code: 'EMP-101', name: 'Suresh Babu', department: 'Cutting & Pattern Making', salaryType: 'MONTHLY_FIXED' },
      ipAddress: '122.178.241.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0 Safari/537.36',
      createdAt: new Date('2026-04-10T11:20:00Z')
    },
    {
      tenantId: tenantGarments.id,
      userId: userAdmin.id,
      action: 'CREATE',
      entityName: 'Employee',
      entityId: empAnand.id,
      oldValues: Prisma.DbNull,
      newValues: { code: 'EMP-102', name: 'Anand Murugan', department: 'Cutting & Pattern Making', salaryType: 'PIECE_RATE' },
      ipAddress: '122.178.241.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0 Safari/537.36',
      createdAt: new Date('2026-06-15T09:45:00Z')
    },
    {
      tenantId: tenantGarments.id,
      userId: userAdmin.id,
      action: 'CREATE',
      entityName: 'PieceRateActivity',
      entityId: actStitching.id,
      oldValues: Prisma.DbNull,
      newValues: { code: 'OP-STITCH', name: 'Garment Seam & Overlock Stitching', ratePerUnit: 35 },
      ipAddress: '122.178.241.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0 Safari/537.36',
      createdAt: new Date('2026-06-16T14:10:00Z')
    },
    {
      tenantId: tenantGarments.id,
      userId: userAdmin.id,
      action: 'ENABLE_MODULE',
      entityName: 'TenantModule',
      entityId: 'PIECE_RATE',
      oldValues: { isEnabled: false },
      newValues: { isEnabled: true, module: 'Piece Rate (Garments)' },
      ipAddress: '122.178.241.10',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0.0.0 Safari/537.36',
      createdAt: new Date('2026-06-16T10:00:00Z')
    },
    {
      tenantId: tenantLogistics.id,
      userId: userKarthik.id,
      action: 'LOGIN',
      entityName: 'Authentication',
      entityId: userKarthik.id,
      oldValues: Prisma.DbNull,
      newValues: { email: 'karthik.ops@chennailogistics.in', status: 'SUCCESS' },
      ipAddress: '14.139.182.2',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/128.0.0.0',
      createdAt: new Date('2026-10-11T07:50:00Z')
    },
    {
      tenantId: tenantLogistics.id,
      userId: userKarthik.id,
      action: 'CREATE',
      entityName: 'Employee',
      entityId: empRajesh.id,
      oldValues: Prisma.DbNull,
      newValues: { code: 'LOG-201', name: 'Rajesh Kannan', role: 'Regional Hub Operations Manager' },
      ipAddress: '14.139.182.2',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/128.0.0.0',
      createdAt: new Date('2026-02-01T10:30:00Z')
    }
  ];

  await prisma.auditLog.createMany({
    data: auditLogsData
  });

  console.log(`Step 12: Seeded ${auditLogsData.length} corporate immutable System Audit Logs.`);
  console.log('=== ENTERPRISE SEEDING COMPLETE WITH 100% HEALTHY REAL-TIME RECORDS ===');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
