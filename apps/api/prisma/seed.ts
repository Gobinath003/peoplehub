import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding People Hub database...');

  // 1. Clean existing database
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

  console.log('Cleaned old records.');

  // 2. Hash default passwords
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin_pass', salt);
  const priyaPassword = await bcrypt.hash('priya_pass', salt);

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

  console.log('Created Users.');

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

  console.log('Created Tenants.');

  // 5. Link Users to Tenants
  await prisma.tenantUser.createMany({
    data: [
      { tenantId: tenantGarments.id, userId: userAdmin.id, status: 'ACTIVE' },
      { tenantId: tenantGarments.id, userId: userPriya.id, status: 'ACTIVE' },
      { tenantId: tenantLogistics.id, userId: userAdmin.id, status: 'ACTIVE' }
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
      // Garments
      { tenantId: tenantGarments.id, moduleCode: 'ORGANIZATION', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'EMPLOYEES', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'ATTENDANCE', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'LEAVE', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'SHIFTS', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'PAYROLL', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'AUDIT', isEnabled: true },
      { tenantId: tenantGarments.id, moduleCode: 'PIECE_RATE', isEnabled: true },
      // Logistics
      { tenantId: tenantLogistics.id, moduleCode: 'ORGANIZATION', isEnabled: true },
      { tenantId: tenantLogistics.id, moduleCode: 'EMPLOYEES', isEnabled: true },
      { tenantId: tenantLogistics.id, moduleCode: 'AUDIT', isEnabled: true },
      { tenantId: tenantLogistics.id, moduleCode: 'DRIVER_ROSTER', isEnabled: true }
    ]
  });

  console.log('Configured Modules.');

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

  // 9. Create global and tenant specific Roles
  const roleAdmin = await prisma.role.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'TENANT_ADMIN',
      name: 'Tenant Administrator',
      isSystem: true
    }
  });

  const roleLogisticsAdmin = await prisma.role.create({
    data: {
      tenantId: tenantLogistics.id,
      code: 'TENANT_ADMIN',
      name: 'Logistics Tenant Admin',
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

  // 10. Map Permissions to Roles
  const adminPermissions = permissions.map(p => ({
    roleId: roleAdmin.id,
    permissionCode: p.code
  }));
  await prisma.rolePermission.createMany({ data: adminPermissions });

  const logisticsAdminPermissions = permissions
    .filter(p => ['EMPLOYEE_VIEW', 'EMPLOYEE_CREATE', 'AUDIT_LOG_VIEW', 'TENANT_SETTINGS_VIEW'].includes(p.code))
    .map(p => ({
      roleId: roleLogisticsAdmin.id,
      permissionCode: p.code
    }));
  await prisma.rolePermission.createMany({ data: logisticsAdminPermissions });

  const hrmPermissions = permissions
    .filter(p => p.code.startsWith('EMPLOYEE_') || p.code.startsWith('ATTENDANCE_') || p.code.startsWith('PAYROLL_'))
    .map(p => ({
      roleId: roleHRM.id,
      permissionCode: p.code
    }));
  await prisma.rolePermission.createMany({ data: hrmPermissions });

  console.log('Mapped Permissions to Roles.');

  // 11. Create User Role Assignments with scopes
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
        scopeId: 'Chennai Branch'
      },
      {
        userId: userAdmin.id,
        tenantId: tenantLogistics.id,
        roleId: roleLogisticsAdmin.id,
        scopeType: 'TENANT',
        scopeId: null
      }
    ]
  });

  console.log('Assigned Roles with scopes.');

  // 11. Seed Master Data Management for ABC Garments
  const deptCutting = await prisma.department.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'DEPT-CUT',
      name: 'Cutting & Pattern Making',
      description: 'Fabric cutting and pattern master division',
      isActive: true,
    },
  });

  const deptSewing = await prisma.department.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'DEPT-SEW',
      name: 'Sewing & Stitching',
      description: 'Assembly line sewing and garment tailoring',
      isActive: true,
    },
  });

  const deptQC = await prisma.department.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'DEPT-QC',
      name: 'Quality Control & Inspection',
      description: 'Fabric and finished garment defect inspection',
      isActive: true,
    },
  });

  const deptHR = await prisma.department.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'DEPT-HR',
      name: 'Human Resources & Administration',
      description: 'Workforce management, attendance, and payroll',
      isActive: true,
    },
  });

  const desigCM = await prisma.designation.create({
    data: {
      tenantId: tenantGarments.id,
      departmentId: deptCutting.id,
      code: 'DESIG-CM',
      name: 'Cutting Master',
      description: 'Master fabric layout cutter & multi-skill artisan',
      isActive: true,
    },
  });

  const desigPat = await prisma.designation.create({
    data: {
      tenantId: tenantGarments.id,
      departmentId: deptCutting.id,
      code: 'DESIG-PAT',
      name: 'Pattern Specialist',
      description: 'CAD and manual pattern grading',
      isActive: true,
    },
  });

  const desigTailor = await prisma.designation.create({
    data: {
      tenantId: tenantGarments.id,
      departmentId: deptSewing.id,
      code: 'DESIG-STITCH',
      name: 'Senior Tailor Master',
      description: 'Overlock and single needle operator',
      isActive: true,
    },
  });

  const desigQC = await prisma.designation.create({
    data: {
      tenantId: tenantGarments.id,
      departmentId: deptQC.id,
      code: 'DESIG-QC',
      name: 'Fabric Quality Inspector',
      description: 'Quality inspection and defect auditor',
      isActive: true,
    },
  });

  const branchChennai = await prisma.branch.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'BR-CHN-HQ',
      name: 'Chennai Head Office',
      type: 'HEAD_OFFICE',
      city: 'Chennai',
      state: 'Tamil Nadu',
      address: 'Guindy Industrial Estate, Chennai - 600032',
      isActive: true,
    },
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
      isActive: true,
    },
  });

  const shiftGen = await prisma.shift.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'SH-GEN',
      name: 'General Shift',
      startTime: '09:00',
      endTime: '18:00',
      breakMinutes: 60,
      isActive: true,
    },
  });

  const shiftMorn = await prisma.shift.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'SH-MORN',
      name: 'Morning Shift (Factory)',
      startTime: '06:00',
      endTime: '14:00',
      breakMinutes: 30,
      isActive: true,
    },
  });

  const empTypePerm = await prisma.employmentType.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'ET-PERM',
      name: 'Permanent Full-Time',
      description: 'Regular on-roll company employee',
      isActive: true,
    },
  });

  const empTypePiece = await prisma.employmentType.create({
    data: {
      tenantId: tenantGarments.id,
      code: 'ET-CONT',
      name: 'Contract / Piece-Rate Worker',
      description: 'Daily piece-rate garment producer',
      isActive: true,
    },
  });

  console.log('Seeded Master Data (Departments, Designations, Branches, Shifts, Employment Types).');

  // 12. Seed Sample Employees for ABC Garments linked to Masters
  const emp1 = await prisma.employee.create({
    data: {
      tenantId: tenantGarments.id,
      employeeCode: 'EMP-101',
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
      joiningDate: new Date('2025-06-01'),
      status: 'ACTIVE'
    }
  });

  const emp2 = await prisma.employee.create({
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
      joiningDate: new Date('2025-09-15'),
      status: 'ACTIVE'
    }
  });

  const emp3 = await prisma.employee.create({
    data: {
      tenantId: tenantGarments.id,
      employeeCode: 'EMP-103',
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
      joiningDate: new Date('2026-02-01'),
      status: 'ACTIVE'
    }
  });

  // 12. Seed Compensation Structures
  await prisma.salaryStructure.createMany({
    data: [
      {
        tenantId: tenantGarments.id,
        employeeId: emp1.id,
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
        employeeId: emp2.id,
        basicSalary: 0, // Computed dynamically from monthly piece-rate logs
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
        employeeId: emp3.id,
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
      }
    ]
  });

  // 13. Seed Piece-Rate Activities (Garment Operations Master)
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

  // 14. Seed Sample Daily Piece-Rate Production Logs (September 2026 for Anand Murugan)
  await prisma.pieceRateLog.createMany({
    data: [
      {
        tenantId: tenantGarments.id,
        employeeId: emp2.id,
        activityId: actCutting.id,
        logDate: new Date('2026-09-01T10:00:00Z'),
        quantity: 50,
        unitRate: 20,
        totalAmount: 1000,
        remarks: 'Daily cutting batch 50 men shirts',
        recordedBy: userPriya.id
      },
      {
        tenantId: tenantGarments.id,
        employeeId: emp2.id,
        activityId: actCutting.id,
        logDate: new Date('2026-09-02T09:30:00Z'),
        quantity: 60,
        unitRate: 20,
        totalAmount: 1200,
        remarks: 'T-shirt cut pieces',
        recordedBy: userPriya.id
      },
      {
        tenantId: tenantGarments.id,
        employeeId: emp2.id,
        activityId: actStretching.id,
        logDate: new Date('2026-09-02T16:00:00Z'),
        quantity: 30,
        unitRate: 12,
        totalAmount: 360,
        remarks: 'Collar rib stretch batch (multi-skill work)',
        recordedBy: userPriya.id
      },
      {
        tenantId: tenantGarments.id,
        employeeId: emp2.id,
        activityId: actCutting.id,
        logDate: new Date('2026-09-03T10:00:00Z'),
        quantity: 45,
        unitRate: 20,
        totalAmount: 900,
        remarks: 'Polo t-shirt cutting',
        recordedBy: userPriya.id
      },
      {
        tenantId: tenantGarments.id,
        employeeId: emp2.id,
        activityId: actStitching.id,
        logDate: new Date('2026-09-03T15:30:00Z'),
        quantity: 40,
        unitRate: 35,
        totalAmount: 1400,
        remarks: 'Overlock stitching line 2 (multi-skill work)',
        recordedBy: userPriya.id
      },
      {
        tenantId: tenantGarments.id,
        employeeId: emp2.id,
        activityId: actCutting.id,
        logDate: new Date('2026-09-04T10:00:00Z'),
        quantity: 55,
        unitRate: 20,
        totalAmount: 1100,
        remarks: 'Kids wear batch cutting',
        recordedBy: userPriya.id
      },
      {
        tenantId: tenantGarments.id,
        employeeId: emp2.id,
        activityId: actStretching.id,
        logDate: new Date('2026-09-04T16:00:00Z'),
        quantity: 25,
        unitRate: 12,
        totalAmount: 300,
        remarks: 'Sleeve cuff stretch',
        recordedBy: userPriya.id
      },
      {
        tenantId: tenantGarments.id,
        employeeId: emp2.id,
        activityId: actStitching.id,
        logDate: new Date('2026-09-05T14:00:00Z'),
        quantity: 50,
        unitRate: 35,
        totalAmount: 1750,
        remarks: 'Shirt collar & side seam stitching',
        recordedBy: userPriya.id
      }
    ]
  });

  // 15. Seed Sample Payslips (August 2026 for Fixed Salary Emp)
  await prisma.payslip.createMany({
    data: [
      {
        tenantId: tenantGarments.id,
        employeeId: emp1.id,
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

  console.log('Seeded Employees, Compensation Structures, and Payslips.');
  console.log('Database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
