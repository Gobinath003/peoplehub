'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import {
  CalendarDays,
  Plus,
  Check,
  X,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Users,
  ShieldCheck,
  Settings,
  RefreshCw,
  Download,
  UserCheck,
  Pencil,
  Trash2,
  Link2,
} from 'lucide-react';
import {
  LeaveWorkspaceSummaryDto,
  LeaveTypeDto,
  EmployeeLeaveBalanceDto,
  LeaveRequestDto,
  LeaveAccrualType,
  LeaveRequestStatus,
  HalfDaySession,
  EmployeeDto,
} from '@people-hub/shared-types';
import { exportToExcel } from '../../../utils/excelExport';
import {
  EnterpriseToolbar,
  EnterpriseTable,
  EnterpriseTableHeader,
  EnterpriseTableTh,
  EnterpriseTableBody,
  EnterpriseTableRow,
  EnterpriseTableTd,
  EnterpriseBadge,
  EnterpriseTabs,
  EnterpriseTabItem,
} from '../../../components/enterprise';

type TabKey = 'MY_LEAVES' | 'TEAM_APPROVALS' | 'ORG_REGISTER' | 'LEAVE_TYPES' | 'BALANCES';

const COLOR_SWATCHES = ['#0EA5E9', '#10B981', '#F43F5E', '#F59E0B', '#6366F1', '#64748B'];

function formatDateShort(iso: string) {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function getStatusBadge(status: string) {
  switch (status) {
    case LeaveRequestStatus.APPROVED:
      return <EnterpriseBadge variant="success">Approved</EnterpriseBadge>;
    case LeaveRequestStatus.REJECTED:
      return <EnterpriseBadge variant="danger">Rejected</EnterpriseBadge>;
    case LeaveRequestStatus.CANCELLED:
      return <EnterpriseBadge variant="neutral">Cancelled</EnterpriseBadge>;
    default:
      return <EnterpriseBadge variant="warning">Pending Review</EnterpriseBadge>;
  }
}

export default function LeaveManagementPage() {
  const { activeTenant, accessToken, isSuperAdmin, isTenantAdmin, isHRManager } = useApp();

  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [workspace, setWorkspace] = useState<LeaveWorkspaceSummaryDto | null>(null);
  const [orgBalances, setOrgBalances] = useState<EmployeeLeaveBalanceDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeDto[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabKey>('MY_LEAVES');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Apply Leave Modal
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [applyLeaveTypeId, setApplyLeaveTypeId] = useState('');
  const [applyStartDate, setApplyStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [applyEndDate, setApplyEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [applyIsHalfDay, setApplyIsHalfDay] = useState(false);
  const [applyHalfDaySession, setApplyHalfDaySession] = useState<HalfDaySession>(HalfDaySession.FIRST_HALF);
  const [applyReason, setApplyReason] = useState('');
  const [applyHandover, setApplyHandover] = useState('');
  const [applyContact, setApplyContact] = useState('');
  const [applyForEmployeeId, setApplyForEmployeeId] = useState('');
  const [submittingApply, setSubmittingApply] = useState(false);

  // Approve / Reject Action Modal
  const [reviewModalReq, setReviewModalReq] = useState<LeaveRequestDto | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Leave Type Master Modal (Add / Edit)
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<LeaveTypeDto | null>(null);
  const [ltCode, setLtCode] = useState('');
  const [ltName, setLtName] = useState('');
  const [ltDesc, setLtDesc] = useState('');
  const [ltQuota, setLtQuota] = useState('12');
  const [ltAccrual, setLtAccrual] = useState<string>(LeaveAccrualType.ANNUAL_UPFRONT);
  const [ltCarryForward, setLtCarryForward] = useState('0');
  const [ltMinNotice, setLtMinNotice] = useState('0');
  const [ltMaxConsecutive, setLtMaxConsecutive] = useState('');
  const [ltAllowHalfDay, setLtAllowHalfDay] = useState(true);
  const [ltIsPaid, setLtIsPaid] = useState(true);
  const [ltColor, setLtColor] = useState('#0EA5E9');
  const [ltIsActive, setLtIsActive] = useState(true);
  const [ltSyncBalances, setLtSyncBalances] = useState(true);
  const [savingType, setSavingType] = useState(false);

  // Adjust Employee Balance Modal
  const [adjustBalTarget, setAdjustBalTarget] = useState<EmployeeLeaveBalanceDto | null>(null);
  const [adjAllocated, setAdjAllocated] = useState('0');
  const [adjCarryForward, setAdjCarryForward] = useState('0');
  const [savingAdjust, setSavingAdjust] = useState(false);
  const [syncingYear, setSyncingYear] = useState(false);

  // Link Admin to Employee Profile Modal / Selector
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkEmployeeId, setLinkEmployeeId] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  const canManageAdmin = Boolean(workspace?.isAdmin || isSuperAdmin || isTenantAdmin || isHRManager);

  const fetchWorkspace = async () => {
    if (!activeTenant || !accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leave/workspace?year=${selectedYear}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id,
        },
      });
      if (res.ok) {
        const data: LeaveWorkspaceSummaryDto = await res.json();
        setWorkspace(data);
        const firstActive = data.leaveTypes.find((lt) => lt.isActive);
        if (firstActive && !applyLeaveTypeId) {
          setApplyLeaveTypeId(firstActive.id);
        }
        // Auto switch admin without employee link to Leave Masters or Team Approvals if pending
        if (!data.currentEmployee && data.isAdmin && activeTab === 'MY_LEAVES') {
          setActiveTab(data.allRequests.some((r) => r.status === 'PENDING') ? 'ORG_REGISTER' : 'LEAVE_TYPES');
        }
      }
    } catch (e) {
      console.warn('Failed to load leave workspace', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgBalancesAndEmployees = async () => {
    if (!activeTenant || !accessToken || !(isSuperAdmin || isTenantAdmin || isHRManager)) return;
    try {
      const [balRes, empRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/leave/balances?year=${selectedYear}`, {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'x-tenant-id': activeTenant.id },
        }),
        fetch(`${API_BASE_URL}/api/v1/employees`, {
          headers: { 'Authorization': `Bearer ${accessToken}`, 'x-tenant-id': activeTenant.id },
        }),
      ]);
      if (balRes.ok) {
        setOrgBalances(await balRes.json());
      }
      if (empRes.ok) {
        setEmployees(await empRes.json());
      }
    } catch (e) {
      console.warn('Failed to fetch org leave balances', e);
    }
  };

  useEffect(() => {
    fetchWorkspace();
    fetchOrgBalancesAndEmployees();
  }, [activeTenant, accessToken, selectedYear]);

  const activeLeaveTypes = useMemo(
    () => (workspace?.leaveTypes || []).filter((lt) => lt.isActive),
    [workspace]
  );

  const selectedApplyType = useMemo(
    () => activeLeaveTypes.find((lt) => lt.id === applyLeaveTypeId) || null,
    [activeLeaveTypes, applyLeaveTypeId]
  );

  const calculatedDays = useMemo(() => {
    if (!applyStartDate || !applyEndDate) return 0;
    const s = new Date(`${applyStartDate}T00:00:00Z`);
    const e = new Date(`${applyEndDate}T00:00:00Z`);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 0;
    if (applyIsHalfDay && applyStartDate === applyEndDate) return 0.5;
    return Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  }, [applyStartDate, applyEndDate, applyIsHalfDay]);

  const pendingTeamCount = useMemo(
    () => (workspace?.teamRequests || []).filter((r) => r.status === LeaveRequestStatus.PENDING).length,
    [workspace]
  );

  const pendingOrgCount = useMemo(
    () => (workspace?.allRequests || []).filter((r) => r.status === LeaveRequestStatus.PENDING).length,
    [workspace]
  );

  const openApplyModal = (preselectedLeaveTypeId?: string) => {
    setErrorMsg(null);
    if (preselectedLeaveTypeId) {
      setApplyLeaveTypeId(preselectedLeaveTypeId);
    } else if (activeLeaveTypes[0]) {
      setApplyLeaveTypeId(activeLeaveTypes[0].id);
    }
    const todayStr = new Date().toISOString().split('T')[0];
    setApplyStartDate(todayStr);
    setApplyEndDate(todayStr);
    setApplyIsHalfDay(false);
    setApplyHalfDaySession(HalfDaySession.FIRST_HALF);
    setApplyReason('');
    setApplyHandover('');
    setApplyContact('');
    setApplyForEmployeeId(workspace?.currentEmployee?.id || employees[0]?.id || '');
    setApplyModalOpen(true);
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    setSubmittingApply(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leave/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id,
        },
        body: JSON.stringify({
          leaveTypeId: applyLeaveTypeId,
          startDate: applyStartDate,
          endDate: applyEndDate,
          isHalfDay: applyIsHalfDay && applyStartDate === applyEndDate,
          halfDaySession: applyIsHalfDay && applyStartDate === applyEndDate ? applyHalfDaySession : undefined,
          reason: applyReason.trim(),
          handoverNotes: applyHandover.trim() || undefined,
          emergencyContact: applyContact.trim() || undefined,
          employeeId:
            !workspace?.currentEmployee && canManageAdmin && applyForEmployeeId
              ? applyForEmployeeId
              : undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Unable to submit leave application');
      }

      setSuccessMsg('Leave request submitted and routed to your Reporting Manager for review.');
      setApplyModalOpen(false);
      await fetchWorkspace();
      await fetchOrgBalancesAndEmployees();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to apply leave');
    } finally {
      setSubmittingApply(false);
    }
  };

  const handleCancelRequest = async (req: LeaveRequestDto) => {
    if (!activeTenant) return;
    if (!window.confirm(`Cancel your ${req.leaveTypeName} request for ${req.totalDays} day(s)?`)) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leave/requests/${req.id}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Unable to cancel leave request');
      }
      setSuccessMsg('Leave request cancelled and leave balance restored.');
      await fetchWorkspace();
      await fetchOrgBalancesAndEmployees();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to cancel leave');
    }
  };

  const openReviewModal = (req: LeaveRequestDto, decision: 'APPROVE' | 'REJECT') => {
    setReviewModalReq(req);
    setReviewDecision(decision);
    setReviewRemarks('');
    setErrorMsg(null);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !reviewModalReq) return;
    setSubmittingReview(true);
    setErrorMsg(null);
    const endpoint = reviewDecision === 'APPROVE' ? 'approve' : 'reject';
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leave/requests/${reviewModalReq.id}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id,
        },
        body: JSON.stringify({ remarks: reviewRemarks.trim() || undefined }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || `Failed to ${endpoint} leave request`);
      }
      setSuccessMsg(
        `Leave request for ${reviewModalReq.employeeName} (${reviewModalReq.leaveTypeCode}, ${reviewModalReq.totalDays}d) ${
          reviewDecision === 'APPROVE' ? 'approved' : 'rejected'
        }.`
      );
      setReviewModalReq(null);
      await fetchWorkspace();
      await fetchOrgBalancesAndEmployees();
    } catch (e: any) {
      setErrorMsg(e.message || 'Review action failed');
    } finally {
      setSubmittingReview(false);
    }
  };

  const openCreateTypeModal = () => {
    setEditingType(null);
    setLtCode('');
    setLtName('');
    setLtDesc('');
    setLtQuota('12');
    setLtAccrual(LeaveAccrualType.ANNUAL_UPFRONT);
    setLtCarryForward('0');
    setLtMinNotice('0');
    setLtMaxConsecutive('');
    setLtAllowHalfDay(true);
    setLtIsPaid(true);
    setLtColor('#0EA5E9');
    setLtIsActive(true);
    setLtSyncBalances(true);
    setErrorMsg(null);
    setTypeModalOpen(true);
  };

  const openEditTypeModal = (lt: LeaveTypeDto) => {
    setEditingType(lt);
    setLtCode(lt.code);
    setLtName(lt.name);
    setLtDesc(lt.description || '');
    setLtQuota(String(lt.annualQuota));
    setLtAccrual(lt.accrualType);
    setLtCarryForward(String(lt.carryForwardLimit));
    setLtMinNotice(String(lt.minNoticeDays));
    setLtMaxConsecutive(lt.maxConsecutiveDays !== null && lt.maxConsecutiveDays !== undefined ? String(lt.maxConsecutiveDays) : '');
    setLtAllowHalfDay(lt.allowHalfDay);
    setLtIsPaid(lt.isPaid);
    setLtColor(lt.color || '#0EA5E9');
    setLtIsActive(lt.isActive);
    setLtSyncBalances(true);
    setErrorMsg(null);
    setTypeModalOpen(true);
  };

  const handleSaveLeaveType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant) return;
    setSavingType(true);
    setErrorMsg(null);
    const payload: any = {
      code: ltCode.trim().toUpperCase(),
      name: ltName.trim(),
      description: ltDesc.trim() || undefined,
      annualQuota: Number(ltQuota) || 0,
      accrualType: ltAccrual,
      carryForwardLimit: Number(ltCarryForward) || 0,
      minNoticeDays: Number(ltMinNotice) || 0,
      maxConsecutiveDays: ltMaxConsecutive ? Number(ltMaxConsecutive) : null,
      allowHalfDay: ltAllowHalfDay,
      isPaid: ltIsPaid,
      color: ltColor,
    };
    if (editingType) {
      payload.isActive = ltIsActive;
      payload.syncExistingBalances = ltSyncBalances;
    }

    try {
      const url = editingType
        ? `${API_BASE_URL}/api/v1/leave/types/${editingType.id}`
        : `${API_BASE_URL}/api/v1/leave/types`;
      const res = await fetch(url, {
        method: editingType ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save leave type master');
      }
      setSuccessMsg(
        editingType
          ? `Leave Type "${payload.name}" (${payload.code}) updated successfully.`
          : `Leave Type "${payload.name}" (${payload.code}) created and allocated to employees.`
      );
      setTypeModalOpen(false);
      await fetchWorkspace();
      await fetchOrgBalancesAndEmployees();
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to save leave type');
    } finally {
      setSavingType(false);
    }
  };

  const handleDeleteLeaveType = async (lt: LeaveTypeDto) => {
    if (!activeTenant) return;
    if (!window.confirm(`Remove or deactivate Leave Type "${lt.name}" (${lt.code})?`)) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leave/types/${lt.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id,
        },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to remove leave type');
      }
      const data = await res.json();
      setSuccessMsg(data.message || `Leave Type "${lt.code}" removed.`);
      await fetchWorkspace();
      await fetchOrgBalancesAndEmployees();
    } catch (e: any) {
      setErrorMsg(e.message || 'Delete failed');
    }
  };

  const handleSyncBalances = async () => {
    if (!activeTenant) return;
    setSyncingYear(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leave/balances/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id,
        },
        body: JSON.stringify({ year: selectedYear, overwriteAllocated: false }),
      });
      if (!res.ok) throw new Error('Balance sync failed');
      const data = await res.json();
      setSuccessMsg(`Synchronized ${data.syncedRecords} leave balance records for ${data.employeesCount} employees (${selectedYear}).`);
      await fetchWorkspace();
      await fetchOrgBalancesAndEmployees();
    } catch (e: any) {
      setErrorMsg(e.message || 'Sync failed');
    } finally {
      setSyncingYear(false);
    }
  };

  const handleSaveAdjustBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !adjustBalTarget) return;
    setSavingAdjust(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leave/balances/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id,
        },
        body: JSON.stringify({
          employeeId: adjustBalTarget.employeeId,
          leaveTypeId: adjustBalTarget.leaveTypeId,
          year: adjustBalTarget.year,
          allocated: Number(adjAllocated) || 0,
          carryForward: Number(adjCarryForward) || 0,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to adjust balance');
      }
      setSuccessMsg(`Updated ${adjustBalTarget.leaveTypeCode} entitlement for ${adjustBalTarget.employeeName}.`);
      setAdjustBalTarget(null);
      await fetchWorkspace();
      await fetchOrgBalancesAndEmployees();
    } catch (e: any) {
      setErrorMsg(e.message || 'Adjustment failed');
    } finally {
      setSavingAdjust(false);
    }
  };

  const handleLinkProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenant || !linkEmployeeId) return;
    setSavingLink(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/v1/leave/admin/link-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id,
        },
        body: JSON.stringify({ employeeId: linkEmployeeId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Unable to link employee profile');
      }
      setSuccessMsg('Your login is now linked to the selected employee profile.');
      setLinkModalOpen(false);
      await fetchWorkspace();
      await fetchOrgBalancesAndEmployees();
    } catch (e: any) {
      setErrorMsg(e.message || 'Linking failed');
    } finally {
      setSavingLink(false);
    }
  };

  const filterRequests = (list: LeaveRequestDto[]) => {
    const q = searchQuery.trim().toLowerCase();
    return list.filter((r) => {
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.employeeName || '').toLowerCase().includes(q) ||
        (r.employeeCode || '').toLowerCase().includes(q) ||
        r.leaveTypeName.toLowerCase().includes(q) ||
        r.leaveTypeCode.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q)
      );
    });
  };

  const filteredMyRequests = useMemo(() => filterRequests(workspace?.myRequests || []), [workspace, searchQuery, statusFilter]);
  const filteredTeamRequests = useMemo(() => filterRequests(workspace?.teamRequests || []), [workspace, searchQuery, statusFilter]);
  const filteredOrgRequests = useMemo(() => filterRequests(workspace?.allRequests || []), [workspace, searchQuery, statusFilter]);

  const filteredBalances = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return orgBalances.filter((b) => {
      if (!q) return true;
      return (
        (b.employeeName || '').toLowerCase().includes(q) ||
        (b.employeeCode || '').toLowerCase().includes(q) ||
        b.leaveTypeName.toLowerCase().includes(q) ||
        b.leaveTypeCode.toLowerCase().includes(q)
      );
    });
  }, [orgBalances, searchQuery]);

  const handleExportRegister = () => {
    const rows = activeTab === 'TEAM_APPROVALS'
      ? filteredTeamRequests
      : activeTab === 'ORG_REGISTER'
      ? filteredOrgRequests
      : filteredMyRequests;
    if (rows.length === 0) return;

    exportToExcel({
      filename: `Leave_Register_${activeTab}_${selectedYear}`,
      sheetName: 'Leave Register',
      reportTitle: `${activeTenant?.name || 'Organization'} — Leave Applications (${selectedYear})`,
      columns: [
        { header: 'Emp Code', accessor: (r) => r.employeeCode || '-' },
        { header: 'Employee Name', accessor: (r) => r.employeeName || '-' },
        { header: 'Department', accessor: (r) => r.employeeDepartment || '-' },
        { header: 'Leave Type', accessor: (r) => `${r.leaveTypeName} (${r.leaveTypeCode})` },
        { header: 'From', accessor: (r) => formatDateShort(r.startDate) },
        { header: 'To', accessor: (r) => formatDateShort(r.endDate) },
        { header: 'Days', accessor: 'totalDays' },
        { header: 'Approver', accessor: (r) => r.approverName || 'HR / Admin' },
        { header: 'Status', accessor: 'status' },
        { header: 'Reason', accessor: 'reason' },
        { header: 'Approver Remarks', accessor: (r) => r.approverRemarks || '-' },
      ],
      data: rows,
    });
  };

  return (
    <div className="space-y-2.5">
      {/* Compact Employee Context & Availability Strip (Only when logged in as an Employee) */}
      {!loading && workspace?.currentEmployee && (
        <div className="bg-white rounded-xl border border-slate-200/80 px-3 py-2 shadow-2xs flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-bold text-slate-900">
              {workspace.currentEmployee.firstName} {workspace.currentEmployee.lastName}
            </span>
            <span className="font-mono text-[11px] text-slate-500">
              ({workspace.currentEmployee.employeeCode})
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">
              Approver:{' '}
              <strong className={workspace.reportingManager ? 'text-slate-800' : 'text-amber-700'}>
                {workspace.reportingManager
                  ? `${workspace.reportingManager.name} (${workspace.reportingManager.employeeCode})`
                  : 'HR / Admin Queue'}
              </strong>
            </span>
            {workspace.directReportsCount > 0 && (
              <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200/70">
                {workspace.directReportsCount} Direct Reports
              </span>
            )}
          </div>

          {workspace.balances.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {workspace.balances.map((bal) => {
                const totalQuota = bal.allocated + bal.carryForward;
                return (
                  <button
                    key={bal.id}
                    type="button"
                    onClick={() => openApplyModal(bal.leaveTypeId)}
                    title={`${bal.leaveTypeName} — Click to apply`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-[11px] transition"
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: bal.leaveTypeColor || '#10B981' }}
                    />
                    <span className="font-bold text-slate-700">{bal.leaveTypeCode}:</span>
                    <span className="font-extrabold text-slate-900">
                      {bal.isPaid ? `${bal.available}/${totalQuota}` : '∞'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Single Compact Navigation Tabs + Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-1">
        <EnterpriseTabs<TabKey>
          className="border-b-0 pb-0"
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={[
            ...(workspace?.currentEmployee
              ? [
                  {
                    key: 'MY_LEAVES' as TabKey,
                    label: 'My Leave History',
                    icon: Clock,
                    count: workspace.myRequests.length,
                  },
                ]
              : []),
            ...(workspace?.isManager || pendingTeamCount > 0 || (workspace?.teamRequests?.length || 0) > 0
              ? [
                  {
                    key: 'TEAM_APPROVALS' as TabKey,
                    label: 'Team Approvals',
                    icon: UserCheck,
                    count: pendingTeamCount,
                  },
                ]
              : []),
            ...(canManageAdmin
              ? [
                  {
                    key: 'ORG_REGISTER' as TabKey,
                    label: 'Organization Register',
                    icon: ShieldCheck,
                    count: pendingOrgCount,
                  },
                  {
                    key: 'LEAVE_TYPES' as TabKey,
                    label: 'Leave Type Masters',
                    icon: Settings,
                    count: workspace?.leaveTypes.length || 0,
                  },
                  {
                    key: 'BALANCES' as TabKey,
                    label: 'Employee Entitlements',
                    icon: Users,
                    count: orgBalances.length,
                  },
                ]
              : []),
          ]}
        />

        <div className="flex flex-wrap items-center gap-1.5 pb-1">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs"
          >
            {[selectedYear - 1, selectedYear, selectedYear + 1].map((yr) => (
              <option key={yr} value={yr}>
                Year {yr}
              </option>
            ))}
          </select>

          {!workspace?.currentEmployee && canManageAdmin && employees.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setLinkEmployeeId(employees[0]?.id || '');
                setLinkModalOpen(true);
              }}
              title="Link Admin login to an employee profile for self-service"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition"
            >
              <Link2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Link Profile</span>
            </button>
          )}

          {canManageAdmin && (
            <button
              type="button"
              onClick={openCreateTypeModal}
              className="px-2.5 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" />
              <span>Add Leave Type</span>
            </button>
          )}

          {(workspace?.currentEmployee || canManageAdmin) && (
            <button
              type="button"
              onClick={() => openApplyModal()}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Apply for Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Banners */}
      {successMsg && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Toolbar for Register Tabs */}
      {(activeTab === 'MY_LEAVES' || activeTab === 'TEAM_APPROVALS' || activeTab === 'ORG_REGISTER' || activeTab === 'BALANCES') && (
        <EnterpriseToolbar
          title={
            activeTab === 'MY_LEAVES'
              ? 'My Leave Applications'
              : activeTab === 'TEAM_APPROVALS'
              ? 'Direct Reports Approval Queue'
              : activeTab === 'ORG_REGISTER'
              ? 'Company-Wide Leave Register'
              : `Employee Leave Balances (${selectedYear})`
          }
          totalCount={
            activeTab === 'MY_LEAVES'
              ? filteredMyRequests.length
              : activeTab === 'TEAM_APPROVALS'
              ? filteredTeamRequests.length
              : activeTab === 'ORG_REGISTER'
              ? filteredOrgRequests.length
              : filteredBalances.length
          }
          searchPlaceholder={
            activeTab === 'BALANCES'
              ? 'Search by employee code, name, or leave type...'
              : 'Search requests by employee, leave type, or reason...'
          }
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          filters={
            <div className="flex items-center gap-2">
              {activeTab !== 'BALANCES' ? (
                <>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-medium text-slate-700"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending Review</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleExportRegister}
                    className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 text-xs font-medium shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Export Excel</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={syncingYear}
                  onClick={handleSyncBalances}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-900 hover:bg-slate-800 text-white transition flex items-center gap-1.5 text-xs font-bold shadow-2xs"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${syncingYear ? 'animate-spin' : ''}`} />
                  <span>Sync Active Quotas ({selectedYear})</span>
                </button>
              )}
            </div>
          }
        />
      )}

      {/* TAB 1/2/3: REQUEST TABLES */}
      {(activeTab === 'MY_LEAVES' || activeTab === 'TEAM_APPROVALS' || activeTab === 'ORG_REGISTER') && (() => {
        const rows =
          activeTab === 'MY_LEAVES'
            ? filteredMyRequests
            : activeTab === 'TEAM_APPROVALS'
            ? filteredTeamRequests
            : filteredOrgRequests;

        const isApproverView = activeTab === 'TEAM_APPROVALS' || activeTab === 'ORG_REGISTER';

        return (
          <EnterpriseTable
            loading={loading}
            isEmpty={rows.length === 0}
            emptyMessage={
              activeTab === 'MY_LEAVES'
                ? 'No leave applications submitted yet. Click "Apply for Leave" to submit a request.'
                : activeTab === 'TEAM_APPROVALS'
                ? 'No leave requests from your direct reports at this time.'
                : 'No organization leave applications matching filters.'
            }
          >
            <table className="w-full text-left border-collapse text-xs">
              <EnterpriseTableHeader>
                {isApproverView && <EnterpriseTableTh>Employee</EnterpriseTableTh>}
                <EnterpriseTableTh>Leave Type</EnterpriseTableTh>
                <EnterpriseTableTh>Dates & Duration</EnterpriseTableTh>
                <EnterpriseTableTh>Reason & Handover</EnterpriseTableTh>
                <EnterpriseTableTh>Approver Routing</EnterpriseTableTh>
                <EnterpriseTableTh>Status</EnterpriseTableTh>
                <EnterpriseTableTh align="right">Actions</EnterpriseTableTh>
              </EnterpriseTableHeader>
              <EnterpriseTableBody>
                {rows.map((req) => (
                  <EnterpriseTableRow key={req.id}>
                    {isApproverView && (
                      <EnterpriseTableTd>
                        <div className="font-bold text-slate-900">{req.employeeName}</div>
                        <div className="text-[10px] text-slate-500">
                          {req.employeeCode} • {req.employeeDepartment}
                        </div>
                      </EnterpriseTableTd>
                    )}

                    <EnterpriseTableTd>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: req.leaveTypeColor || '#10B981' }}
                        />
                        <div>
                          <div className="font-bold text-slate-900">{req.leaveTypeName}</div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {req.leaveTypeCode} • {req.isPaid ? 'Paid' : 'Unpaid'}
                          </div>
                        </div>
                      </div>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      <div className="font-semibold text-slate-800">
                        {formatDateShort(req.startDate)}
                        {req.startDate !== req.endDate ? ` → ${formatDateShort(req.endDate)}` : ''}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        <span className="font-bold text-slate-700">{req.totalDays} day(s)</span>
                        {req.isHalfDay && (
                          <span className="ml-1.5 px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-semibold">
                            {req.halfDaySession === HalfDaySession.FIRST_HALF ? 'First Half' : 'Second Half'}
                          </span>
                        )}
                      </div>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      <div className="max-w-xs text-slate-800 font-medium line-clamp-2" title={req.reason}>
                        {req.reason}
                      </div>
                      {req.handoverNotes && (
                        <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-xs" title={req.handoverNotes}>
                          Handover: {req.handoverNotes}
                        </div>
                      )}
                      {req.approverRemarks && (
                        <div className="text-[10px] text-indigo-700 mt-0.5 font-medium">
                          Reviewer note: &ldquo;{req.approverRemarks}&rdquo;
                        </div>
                      )}
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      {req.approverName ? (
                        <div>
                          <div className="font-semibold text-slate-800">{req.approverName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{req.approverCode}</div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">HR / Admin Review</span>
                      )}
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>{getStatusBadge(req.status)}</EnterpriseTableTd>

                    <EnterpriseTableTd align="right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {isApproverView && req.status === LeaveRequestStatus.PENDING && (
                          <>
                            <button
                              type="button"
                              onClick={() => openReviewModal(req, 'APPROVE')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center gap-1 transition"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Accept</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openReviewModal(req, 'REJECT')}
                              className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] inline-flex items-center gap-1 transition"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {activeTab === 'MY_LEAVES' &&
                          (req.status === LeaveRequestStatus.PENDING || req.status === LeaveRequestStatus.APPROVED) && (
                            <button
                              type="button"
                              onClick={() => handleCancelRequest(req)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-slate-600 font-semibold text-[11px] transition"
                            >
                              Cancel
                            </button>
                          )}
                      </div>
                    </EnterpriseTableTd>
                  </EnterpriseTableRow>
                ))}
              </EnterpriseTableBody>
            </table>
          </EnterpriseTable>
        );
      })()}

      {/* TAB 4: LEAVE TYPE MASTERS (TENANT ADMIN / HR) */}
      {activeTab === 'LEAVE_TYPES' && canManageAdmin && (
        <EnterpriseTable
          loading={loading}
          isEmpty={(workspace?.leaveTypes || []).length === 0}
          emptyMessage="No leave type masters defined. Click 'Add Leave Type' above."
        >
            <table className="w-full text-left border-collapse text-xs">
              <EnterpriseTableHeader>
                <EnterpriseTableTh>Leave Type</EnterpriseTableTh>
                <EnterpriseTableTh>Total Leaves / Year</EnterpriseTableTh>
                <EnterpriseTableTh>Accrual & Carry Forward</EnterpriseTableTh>
                <EnterpriseTableTh>Policy Rules</EnterpriseTableTh>
                <EnterpriseTableTh>Status</EnterpriseTableTh>
                <EnterpriseTableTh align="right">Actions</EnterpriseTableTh>
              </EnterpriseTableHeader>
              <EnterpriseTableBody>
                {(workspace?.leaveTypes || []).map((lt) => (
                  <EnterpriseTableRow key={lt.id}>
                    <EnterpriseTableTd>
                      <div className="flex items-start gap-2.5">
                        <span
                          className="w-3 h-3 rounded-full mt-1 shrink-0"
                          style={{ backgroundColor: lt.color || '#10B981' }}
                        />
                        <div>
                          <div className="font-bold text-slate-900">
                            {lt.name}{' '}
                            <span className="ml-1 font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                              {lt.code}
                            </span>
                          </div>
                          {lt.description && (
                            <div className="text-[11px] text-slate-500 max-w-sm mt-0.5">{lt.description}</div>
                          )}
                        </div>
                      </div>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      <span className="text-sm font-black text-slate-900">{lt.annualQuota}</span>
                      <span className="text-[11px] text-slate-500 ml-1">days / yr</span>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      <div className="font-semibold text-slate-800">{String(lt.accrualType).replace(/_/g, ' ')}</div>
                      <div className="text-[10px] text-slate-500">
                        Carry forward max: <strong>{lt.carryForwardLimit}d</strong>
                      </div>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      <div className="flex flex-wrap gap-1">
                        <EnterpriseBadge variant={lt.isPaid ? 'success' : 'neutral'}>
                          {lt.isPaid ? 'Paid' : 'Unpaid / LOP'}
                        </EnterpriseBadge>
                        {lt.allowHalfDay && <EnterpriseBadge variant="info">Half-Day Allowed</EnterpriseBadge>}
                        {lt.minNoticeDays > 0 && (
                          <EnterpriseBadge variant="warning">{lt.minNoticeDays}d Notice</EnterpriseBadge>
                        )}
                        {lt.maxConsecutiveDays && (
                          <EnterpriseBadge variant="neutral">Max {lt.maxConsecutiveDays}d/req</EnterpriseBadge>
                        )}
                      </div>
                    </EnterpriseTableTd>

                    <EnterpriseTableTd>
                      {lt.isActive ? (
                        <EnterpriseBadge variant="success">Active</EnterpriseBadge>
                      ) : (
                        <EnterpriseBadge variant="neutral">Inactive</EnterpriseBadge>
                      )}
                    </EnterpriseTableTd>

                    <EnterpriseTableTd align="right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditTypeModal(lt)}
                          title="Edit Leave Type & Annual Quota"
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLeaveType(lt)}
                          title="Delete or Deactivate Leave Type"
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </EnterpriseTableTd>
                  </EnterpriseTableRow>
                ))}
              </EnterpriseTableBody>
            </table>
          </EnterpriseTable>
      )}

      {/* TAB 5: EMPLOYEE LEAVE BALANCES MATRIX */}
      {activeTab === 'BALANCES' && canManageAdmin && (
        <EnterpriseTable
          loading={loading}
          isEmpty={filteredBalances.length === 0}
          emptyMessage="No employee leave balances initialized yet. Click 'Sync Active Quotas' above."
        >
          <table className="w-full text-left border-collapse text-xs">
            <EnterpriseTableHeader>
              <EnterpriseTableTh>Employee</EnterpriseTableTh>
              <EnterpriseTableTh>Leave Type</EnterpriseTableTh>
              <EnterpriseTableTh>Allocated / Yr</EnterpriseTableTh>
              <EnterpriseTableTh>Carry Fwd</EnterpriseTableTh>
              <EnterpriseTableTh>Used</EnterpriseTableTh>
              <EnterpriseTableTh>Pending</EnterpriseTableTh>
              <EnterpriseTableTh>Available</EnterpriseTableTh>
              <EnterpriseTableTh align="right">Adjust</EnterpriseTableTh>
            </EnterpriseTableHeader>
            <EnterpriseTableBody>
              {filteredBalances.map((b) => (
                <EnterpriseTableRow key={b.id}>
                  <EnterpriseTableTd>
                    <div className="font-bold text-slate-900">{b.employeeName}</div>
                    <div className="text-[10px] text-slate-500">
                      {b.employeeCode} • {b.department}
                    </div>
                  </EnterpriseTableTd>
                  <EnterpriseTableTd>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: b.leaveTypeColor || '#10B981' }}
                      />
                      <span className="font-semibold text-slate-800">{b.leaveTypeName}</span>
                      <span className="font-mono text-[10px] text-slate-400">({b.leaveTypeCode})</span>
                    </div>
                  </EnterpriseTableTd>
                  <EnterpriseTableTd className="font-bold text-slate-800">{b.allocated}</EnterpriseTableTd>
                  <EnterpriseTableTd className="text-slate-700">{b.carryForward}</EnterpriseTableTd>
                  <EnterpriseTableTd className="font-semibold text-emerald-700">{b.used}</EnterpriseTableTd>
                  <EnterpriseTableTd className="font-semibold text-amber-600">{b.pending}</EnterpriseTableTd>
                  <EnterpriseTableTd>
                    <span className="font-black text-slate-900">{b.isPaid ? b.available : 'Unpaid'}</span>
                  </EnterpriseTableTd>
                  <EnterpriseTableTd align="right">
                    <button
                      type="button"
                      onClick={() => {
                        setAdjustBalTarget(b);
                        setAdjAllocated(String(b.allocated));
                        setAdjCarryForward(String(b.carryForward));
                      }}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-[11px]"
                    >
                      Adjust Quota
                    </button>
                  </EnterpriseTableTd>
                </EnterpriseTableRow>
              ))}
            </EnterpriseTableBody>
          </table>
        </EnterpriseTable>
      )}

      {/* MODAL: APPLY FOR LEAVE */}
      {applyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-slate-900 text-emerald-400 rounded-xl">
                  <CalendarDays className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Apply for Leave</h3>
                  <p className="text-[11px] text-slate-500">
                    {workspace?.reportingManager
                      ? `Routes directly to Reporting Manager: ${workspace.reportingManager.name}`
                      : 'Submit your leave request with handover details'}
                  </p>
                </div>
              </div>
              <button onClick={() => setApplyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-6 space-y-4 text-xs">
              {!workspace?.currentEmployee && canManageAdmin && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Apply on Behalf of Employee *</label>
                  <select
                    required
                    value={applyForEmployeeId}
                    onChange={(e) => setApplyForEmployeeId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold"
                  >
                    <option value="">Select Employee...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.employeeCode} — {emp.firstName} {emp.lastName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Leave Type *</label>
                <select
                  required
                  value={applyLeaveTypeId}
                  onChange={(e) => {
                    setApplyLeaveTypeId(e.target.value);
                    setApplyIsHalfDay(false);
                  }}
                  className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold"
                >
                  {activeLeaveTypes.map((lt) => {
                    const bal = workspace?.balances.find((b) => b.leaveTypeId === lt.id);
                    const availText = bal
                      ? lt.isPaid
                        ? ` — ${bal.available} days available`
                        : ' — Unpaid Policy'
                      : ` — ${lt.annualQuota} days/yr`;
                    return (
                      <option key={lt.id} value={lt.id}>
                        {lt.name} ({lt.code}){availText}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">From Date *</label>
                  <input
                    type="date"
                    required
                    value={applyStartDate}
                    onChange={(e) => {
                      setApplyStartDate(e.target.value);
                      if (e.target.value > applyEndDate) setApplyEndDate(e.target.value);
                    }}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">To Date *</label>
                  <input
                    type="date"
                    required
                    min={applyStartDate}
                    value={applyEndDate}
                    onChange={(e) => {
                      setApplyEndDate(e.target.value);
                      if (e.target.value !== applyStartDate) setApplyIsHalfDay(false);
                    }}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs"
                  />
                </div>
              </div>

              {/* Duration Summary & Half-Day Option */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] text-slate-500">Calculated Duration:</span>{' '}
                  <strong className="text-slate-900 text-xs">{calculatedDays} working/calendar day(s)</strong>
                  {selectedApplyType?.minNoticeDays ? (
                    <span className="block text-[10px] text-amber-700 mt-0.5">
                      Policy requires {selectedApplyType.minNoticeDays} days advance notice.
                    </span>
                  ) : null}
                </div>

                {selectedApplyType?.allowHalfDay && applyStartDate === applyEndDate && (
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={applyIsHalfDay}
                      onChange={(e) => setApplyIsHalfDay(e.target.checked)}
                    />
                    <span>Half Day (0.5d)</span>
                  </label>
                )}
              </div>

              {applyIsHalfDay && applyStartDate === applyEndDate && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Half-Day Session *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setApplyHalfDaySession(HalfDaySession.FIRST_HALF)}
                      className={`p-2 rounded-xl border font-bold text-xs ${
                        applyHalfDaySession === HalfDaySession.FIRST_HALF
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      First Half (Morning)
                    </button>
                    <button
                      type="button"
                      onClick={() => setApplyHalfDaySession(HalfDaySession.SECOND_HALF)}
                      className={`p-2 rounded-xl border font-bold text-xs ${
                        applyHalfDaySession === HalfDaySession.SECOND_HALF
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-700 border-slate-300'
                      }`}
                    >
                      Second Half (Afternoon)
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Leave *</label>
                <textarea
                  rows={2}
                  required
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  placeholder="Provide brief context for your Reporting Manager..."
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Work Handover Notes</label>
                  <input
                    type="text"
                    value={applyHandover}
                    onChange={(e) => setApplyHandover(e.target.value)}
                    placeholder="Backup colleague / tasks covered"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Emergency Contact</label>
                  <input
                    type="text"
                    value={applyContact}
                    onChange={(e) => setApplyContact(e.target.value)}
                    placeholder="+91 98..."
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingApply || calculatedDays <= 0}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold flex items-center gap-2 shadow"
                >
                  {submittingApply ? 'Submitting...' : 'Submit Leave Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: APPROVE / REJECT REVIEW */}
      {reviewModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                {reviewDecision === 'APPROVE' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-600" />
                )}
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {reviewDecision === 'APPROVE' ? 'Accept Leave Request' : 'Reject Leave Request'}
                </h3>
              </div>
              <button onClick={() => setReviewModalReq(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="font-bold text-slate-900">
                  {reviewModalReq.employeeName} ({reviewModalReq.employeeCode})
                </div>
                <div className="text-slate-600">
                  <strong>{reviewModalReq.leaveTypeName}</strong> • {formatDateShort(reviewModalReq.startDate)}
                  {reviewModalReq.startDate !== reviewModalReq.endDate ? ` → ${formatDateShort(reviewModalReq.endDate)}` : ''} ({reviewModalReq.totalDays} day(s))
                </div>
                <div className="text-slate-500 italic">&ldquo;{reviewModalReq.reason}&rdquo;</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Manager Remarks {reviewDecision === 'REJECT' ? '(Recommended)' : '(Optional)'}
                </label>
                <textarea
                  rows={3}
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  placeholder={
                    reviewDecision === 'APPROVE'
                      ? 'Approved, enjoy your time off.'
                      : 'Provide reason for declining...'
                  }
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReviewModalReq(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReview}
                  className={`px-4 py-2 text-white rounded-xl font-bold shadow ${
                    reviewDecision === 'APPROVE'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {submittingReview
                    ? 'Processing...'
                    : reviewDecision === 'APPROVE'
                    ? 'Confirm Approval'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT LEAVE TYPE MASTER */}
      {typeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">
                  {editingType ? `Update Leave Type Master — ${editingType.code}` : 'Create Leave Type Master'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  Define annual leave entitlement (Total leaves / year) and policy rules.
                </p>
              </div>
              <button onClick={() => setTypeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveLeaveType} className="p-6 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Leave Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    value={ltCode}
                    onChange={(e) => setLtCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CL"
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-mono uppercase text-slate-800 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Leave Type Name *</label>
                  <input
                    type="text"
                    required
                    value={ltName}
                    onChange={(e) => setLtName(e.target.value)}
                    placeholder="e.g. Casual Leave"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Policy Description</label>
                <input
                  type="text"
                  value={ltDesc}
                  onChange={(e) => setLtDesc(e.target.value)}
                  placeholder="Optional guidelines shown to HR and employees"
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Total Leaves / Year *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.5"
                    value={ltQuota}
                    onChange={(e) => setLtQuota(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Accrual Policy</label>
                  <select
                    value={ltAccrual}
                    onChange={(e) => setLtAccrual(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold"
                  >
                    <option value={LeaveAccrualType.ANNUAL_UPFRONT}>Annual Upfront</option>
                    <option value={LeaveAccrualType.MONTHLY_ACCRUAL}>Monthly Accrual</option>
                    <option value={LeaveAccrualType.ON_DEMAND}>On Demand</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Carry Forward Cap</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={ltCarryForward}
                    onChange={(e) => setLtCarryForward(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Minimum Notice (Days)</label>
                  <input
                    type="number"
                    min="0"
                    value={ltMinNotice}
                    onChange={(e) => setLtMinNotice(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Consecutive Days (Blank = No Limit)</label>
                  <input
                    type="number"
                    min="1"
                    value={ltMaxConsecutive}
                    onChange={(e) => setLtMaxConsecutive(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input type="checkbox" checked={ltIsPaid} onChange={(e) => setLtIsPaid(e.target.checked)} />
                  <span>Paid Leave</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                  <input type="checkbox" checked={ltAllowHalfDay} onChange={(e) => setLtAllowHalfDay(e.target.checked)} />
                  <span>Allow Half-Day</span>
                </label>
                {editingType && (
                  <>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-700">
                      <input type="checkbox" checked={ltIsActive} onChange={(e) => setLtIsActive(e.target.checked)} />
                      <span>Active Policy</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-emerald-700">
                      <input type="checkbox" checked={ltSyncBalances} onChange={(e) => setLtSyncBalances(e.target.checked)} />
                      <span>Update Active Employee Quotas</span>
                    </label>
                  </>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Badge Color</label>
                <div className="flex items-center gap-2">
                  {COLOR_SWATCHES.map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setLtColor(hex)}
                      className={`w-6 h-6 rounded-full border-2 transition ${
                        ltColor === hex ? 'border-slate-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTypeModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingType}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow"
                >
                  {savingType ? 'Saving...' : editingType ? 'Update Leave Type' : 'Create & Allocate Leave Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADJUST INDIVIDUAL BALANCE */}
      {adjustBalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">Adjust Employee Leave Entitlement</h3>
                <p className="text-[11px] text-slate-500">
                  {adjustBalTarget.employeeName} ({adjustBalTarget.leaveTypeCode}, {adjustBalTarget.year})
                </p>
              </div>
              <button onClick={() => setAdjustBalTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveAdjustBalance} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Allocated Annual Quota (Days)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={adjAllocated}
                  onChange={(e) => setAdjAllocated(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs font-bold"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Carry Forward Balance (Days)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  required
                  value={adjCarryForward}
                  onChange={(e) => setAdjCarryForward(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 text-slate-800 text-xs font-bold"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAdjustBalTarget(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAdjust}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold"
                >
                  {savingAdjust ? 'Saving...' : 'Save Entitlement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LINK ADMIN PROFILE */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-extrabold text-slate-900 text-sm">Link User to Employee Profile</h3>
              <button onClick={() => setLinkModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleLinkProfile} className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Map your administrator login to an employee record so you can see personal leave balances, submit leaves, or act as a Reporting Manager.
              </p>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Employee *</label>
                <select
                  required
                  value={linkEmployeeId}
                  onChange={(e) => setLinkEmployeeId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 bg-white text-slate-800 text-xs font-semibold"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeCode} — {emp.firstName} {emp.lastName} ({emp.designation})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-600 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLink}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold"
                >
                  {savingLink ? 'Linking...' : 'Link Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
