// Industry codes
export enum IndustryType {
  GARMENTS = 'GARMENTS',
  MANUFACTURING = 'MANUFACTURING',
  LABOUR = 'LABOUR',
  CONSULTANCY = 'CONSULTANCY',
  LOGISTICS = 'LOGISTICS',
  CORPORATE = 'CORPORATE'
}

// Module codes configuration
export enum ModuleCode {
  ORGANIZATION = 'ORGANIZATION',
  EMPLOYEES = 'EMPLOYEES',
  ATTENDANCE = 'ATTENDANCE',
  LEAVE = 'LEAVE',
  SHIFTS = 'SHIFTS',
  PAYROLL = 'PAYROLL',
  DOCUMENTS = 'DOCUMENTS',
  EXPENSES = 'EXPENSES',
  REPORTS = 'REPORTS',
  AUDIT = 'AUDIT',
  // Industry-specific extension modules
  PIECE_RATE = 'PIECE_RATE',          // Garments
  MUSTER_ROLL = 'MUSTER_ROLL',        // Manufacturing/Labour
  TIMESHEET = 'TIMESHEET',            // Consultancy
  DRIVER_ROSTER = 'DRIVER_ROSTER'     // Logistics
}

// Scope Types
export enum ScopeType {
  TENANT = 'TENANT',
  COMPANY = 'COMPANY',
  BRANCH = 'BRANCH',
  DEPARTMENT = 'DEPARTMENT',
  OWN = 'OWN'
}

// System Roles
export enum SystemRole {
  TENANT_ADMIN = 'TENANT_ADMIN',
  HR_MANAGER = 'HR_MANAGER',
  PAYROLL_MANAGER = 'PAYROLL_MANAGER',
  EMPLOYEE = 'EMPLOYEE'
}

// Permission codes
export enum PermissionCode {
  // Employee permissions
  EMPLOYEE_VIEW = 'EMPLOYEE_VIEW',
  EMPLOYEE_CREATE = 'EMPLOYEE_CREATE',
  EMPLOYEE_EDIT = 'EMPLOYEE_EDIT',
  EMPLOYEE_DELETE = 'EMPLOYEE_DELETE',

  // Attendance permissions
  ATTENDANCE_VIEW = 'ATTENDANCE_VIEW',
  ATTENDANCE_EDIT = 'ATTENDANCE_EDIT',
  ATTENDANCE_REGULARIZE = 'ATTENDANCE_REGULARIZE',
  ATTENDANCE_APPROVE = 'ATTENDANCE_APPROVE',

  // Leave permissions
  LEAVE_VIEW = 'LEAVE_VIEW',
  LEAVE_APPLY = 'LEAVE_APPLY',
  LEAVE_APPROVE = 'LEAVE_APPROVE',

  // Payroll permissions
  PAYROLL_VIEW = 'PAYROLL_VIEW',
  PAYROLL_PROCESS = 'PAYROLL_PROCESS',
  PAYROLL_APPROVE = 'PAYROLL_APPROVE',

  // Tenant / module settings
  TENANT_SETTINGS_VIEW = 'TENANT_SETTINGS_VIEW',
  TENANT_SETTINGS_EDIT = 'TENANT_SETTINGS_EDIT',
  MODULE_MANAGE = 'MODULE_MANAGE',

  // System Audit
  AUDIT_LOG_VIEW = 'AUDIT_LOG_VIEW'
}

// Auth API DTO Contracts
export interface LoginRequest {
  email: string;
  passwordHash: string; // Used strictly as client-sent login credential
}

export interface UserContext {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  industry: IndustryType;
}

export interface ActiveRoleContext {
  roleId: string;
  roleCode: string;
  scopeType: ScopeType;
  scopeId: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserContext;
  activeTenant: TenantContext | null;
  tenants: TenantContext[];
  roles: ActiveRoleContext[];
  permissions: string[];
  enabledModules: string[];
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// Tenant Contracts
export interface TenantResponse {
  id: string;
  name: string;
  slug: string;
  industry: IndustryType;
  status: string;
  createdAt: string;
}

export interface TenantModuleResponse {
  moduleCode: ModuleCode;
  moduleName: string;
  isEnabled: boolean;
}

// User Contracts
export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
}

export interface UserRoleResponse {
  id: string;
  roleId: string;
  roleCode: string;
  roleName: string;
  scopeType: ScopeType;
  scopeId: string | null;
}

// Audit Log Contracts
export interface AuditLogResponse {
  id: string;
  tenantId: string | null;
  userId: string | null;
  userEmail: string | null;
  action: string;
  entityName: string;
  entityId: string | null;
  oldValues: any;
  newValues: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

// Tenant Creation with Admin DTO
export interface CreateTenantWithAdminRequest {
  name: string;
  slug: string;
  industry: IndustryType;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

// Employee Contracts
export interface SalaryStructureDto {
  id: string;
  employeeId: string;
  basicSalary: number;
  hra: number;
  specialAllowance: number;
  conveyanceAllowance: number;
  pfDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
  grossSalary: number;
  netSalary: number;
  currency: string;
  effectiveDate: string;
}

export enum SalaryType {
  MONTHLY_FIXED = 'MONTHLY_FIXED',
  PIECE_RATE = 'PIECE_RATE'
}

export interface EmployeeDto {
  id: string;
  tenantId: string;
  userId: string | null;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  department: string;
  designation: string;
  branch: string | null;
  departmentId?: string | null;
  designationId?: string | null;
  branchId?: string | null;
  shiftId?: string | null;
  employmentTypeId?: string | null;
  salaryType: SalaryType | string;
  joiningDate: string;
  status: string;
  salaryStructure?: SalaryStructureDto | null;
  createdAt: string;
}

export interface CreateEmployeeRequest {
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  department?: string;
  designation?: string;
  branch?: string;
  departmentId?: string;
  designationId?: string;
  branchId?: string;
  shiftId?: string;
  employmentTypeId?: string;
  salaryType?: SalaryType | string;
  joiningDate: string;
  status?: string;
  // Optional initial salary configuration
  basicSalary?: number;
  hra?: number;
  specialAllowance?: number;
  conveyanceAllowance?: number;
  pfDeduction?: number;
  taxDeduction?: number;
}

export interface UpdateEmployeeRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  department?: string;
  designation?: string;
  branch?: string;
  departmentId?: string;
  designationId?: string;
  branchId?: string;
  shiftId?: string;
  employmentTypeId?: string;
  salaryType?: SalaryType | string;
  joiningDate?: string;
  status?: string;
}

export interface UpsertSalaryStructureRequest {
  basicSalary: number;
  hra?: number;
  specialAllowance?: number;
  conveyanceAllowance?: number;
  pfDeduction?: number;
  taxDeduction?: number;
  otherDeductions?: number;
}

// Payslip Contracts
export interface PieceRateDetailItem {
  activityName: string;
  units: number;
  rate: number;
  total: number;
}

export interface PayslipDto {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  department?: string;
  designation?: string;
  branch?: string | null;
  companyName?: string;
  payPeriod: string;
  salaryType?: string;
  month: number;
  year: number;
  workingDays: number;
  presentDays: number;
  paidDays: number;
  pieceRateUnits?: number | null;
  pieceRateDetails?: PieceRateDetailItem[] | null;
  basicSalary: number;
  hra: number;
  allowances: number;
  grossEarnings: number;
  pfDeduction: number;
  taxDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netPayable: number;
  status: string;
  paymentDate: string | null;
  remarks: string | null;
  createdAt: string;
}

export interface GeneratePayslipRequest {
  month: number;
  year: number;
  payPeriod: string;
  employeeId?: string; // If omitted, generates for all eligible employees in tenant
  workingDays?: number;
}

// Garment Piece-Rate Contracts
export interface PieceRateActivityDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  unit: string;
  ratePerUnit: number;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreatePieceRateActivityRequest {
  code: string;
  name: string;
  unit?: string;
  ratePerUnit: number;
  description?: string;
}

export interface PieceRateLogDto {
  id: string;
  tenantId: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  activityId: string;
  activityCode?: string;
  activityName?: string;
  unit?: string;
  logDate: string;
  quantity: number;
  unitRate: number;
  totalAmount: number;
  remarks?: string | null;
  recordedBy?: string | null;
  createdAt: string;
}

export interface CreatePieceRateLogRequest {
  employeeId: string;
  activityId: string;
  logDate: string;
  quantity: number;
  unitRate?: number;
  remarks?: string;
}

export interface PieceRateEmployeeSummaryDto {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department: string;
  branch?: string | null;
  totalUnits: number;
  totalEarnings: number;
  activitiesCount: number;
  breakdown: PieceRateDetailItem[];
}

// Master Data Management Contracts
export interface DepartmentDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  employeeCount?: number;
  createdAt: string;
}

export interface CreateDepartmentRequest {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateDepartmentRequest {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface DesignationDto {
  id: string;
  tenantId: string;
  departmentId?: string | null;
  departmentName?: string | null;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  employeeCount?: number;
  createdAt: string;
}

export interface CreateDesignationRequest {
  code: string;
  name: string;
  departmentId?: string;
  description?: string;
}

export interface UpdateDesignationRequest {
  code?: string;
  name?: string;
  departmentId?: string;
  description?: string;
  isActive?: boolean;
}

export type BranchType = 'HEAD_OFFICE' | 'FACTORY_UNIT' | 'BRANCH_OFFICE' | 'WAREHOUSE';

export interface BranchDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  type: BranchType | string;
  city?: string | null;
  state?: string | null;
  address?: string | null;
  isActive: boolean;
  employeeCount?: number;
  createdAt: string;
}

export interface CreateBranchRequest {
  code: string;
  name: string;
  type?: BranchType | string;
  city?: string;
  state?: string;
  address?: string;
}

export interface UpdateBranchRequest {
  code?: string;
  name?: string;
  type?: BranchType | string;
  city?: string;
  state?: string;
  address?: string;
  isActive?: boolean;
}

export interface ShiftDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  isActive: boolean;
  employeeCount?: number;
  createdAt: string;
}

export interface CreateShiftRequest {
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  breakMinutes?: number;
}

export interface UpdateShiftRequest {
  code?: string;
  name?: string;
  startTime?: string;
  endTime?: string;
  breakMinutes?: number;
  isActive?: boolean;
}

export interface EmploymentTypeDto {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  employeeCount?: number;
  createdAt: string;
}

export interface CreateEmploymentTypeRequest {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateEmploymentTypeRequest {
  code?: string;
  name?: string;
  description?: string;
  isActive?: boolean;
}

export interface MasterBundleDto {
  departments: DepartmentDto[];
  designations: DesignationDto[];
  branches: BranchDto[];
  shifts: ShiftDto[];
  employmentTypes: EmploymentTypeDto[];
}



