'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { Key, Plus, X, AlertTriangle, Check, Download } from 'lucide-react';
import { ScopeType } from '@people-hub/shared-types';
import { exportToExcel } from '../../../utils/excelExport';
import {
  EnterpriseToolbar,
  EnterpriseTable,
  EnterpriseTableHeader,
  EnterpriseTableTh,
  EnterpriseTableBody,
  EnterpriseTableRow,
  EnterpriseTableTd,
  EnterprisePagination,
  EnterpriseBadge,
} from '../../../components/enterprise';

interface MemberUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
  createdAt: string;
  roles?: {
    id: string;
    roleId: string;
    roleCode: string;
    roleName: string;
    scopeType: ScopeType;
    scopeId: string | null;
  }[];
}

interface RoleOption {
  id: string;
  code: string;
  name: string;
}

interface ScopeTargetOption {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
}

export default function UserManagementPage() {
  const { activeTenant, accessToken } = useApp();
  const [users, setUsers] = useState<MemberUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<MemberUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const pageSize = 10;

  // Real tenant roles, master scope targets & assignment form state
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [branchOptions, setBranchOptions] = useState<ScopeTargetOption[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<ScopeTargetOption[]>([]);
  const [roleCode, setRoleCode] = useState('HR_MANAGER');
  const [scopeType, setScopeType] = useState<ScopeType>(ScopeType.TENANT);
  const [scopeId, setScopeId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    if (!activeTenant || !accessToken) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'x-tenant-id': activeTenant.id
      };
      const [response, rolesCatalogResp, mastersBundleResp] = await Promise.all([
        fetch(`${API_BASE_URL}/api/v1/users`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/users/roles`, { headers }),
        fetch(`${API_BASE_URL}/api/v1/masters/bundle`, { headers }),
      ]);

      if (rolesCatalogResp.ok) {
        const rolesCatalog = await rolesCatalogResp.json();
        if (Array.isArray(rolesCatalog)) {
          setAvailableRoles(rolesCatalog);
        }
      }

      if (mastersBundleResp.ok) {
        const bundle = await mastersBundleResp.json();
        setBranchOptions(
          Array.isArray(bundle?.branches)
            ? bundle.branches.filter((b: ScopeTargetOption) => b.isActive !== false)
            : []
        );
        setDepartmentOptions(
          Array.isArray(bundle?.departments)
            ? bundle.departments.filter((d: ScopeTargetOption) => d.isActive !== false)
            : []
        );
      }

      if (response.ok) {
        const usersList: MemberUser[] = await response.json();
        await Promise.all(
          usersList.map(async (u) => {
            const rolesResp = await fetch(`${API_BASE_URL}/api/v1/users/${u.id}/roles`, { headers });
            if (rolesResp.ok) {
              u.roles = await rolesResp.json();
            }
          })
        );
        setUsers(usersList);
        setLoading(false);
        return;
      } else {
        const errBody = await response.json().catch(() => ({}));
        setErrorMsg(errBody?.message || `Failed to load tenant users (HTTP ${response.status})`);
      }
    } catch (e: any) {
      setErrorMsg(e?.message || 'Unable to connect to the Users API.');
    }

    setUsers([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTenant, accessToken]);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !activeTenant || !accessToken) return;
    setModalError(null);
    setErrorMsg(null);

    const roleObj = availableRoles.find(r => r.code === roleCode);
    const effectiveScopeId =
      scopeType === ScopeType.TENANT || scopeType === ScopeType.OWN
        ? null
        : scopeId.trim() || null;

    if ((scopeType === ScopeType.BRANCH || scopeType === ScopeType.DEPARTMENT) && !effectiveScopeId) {
      setModalError(
        `Please select a ${scopeType === ScopeType.BRANCH ? 'Branch' : 'Department'} from the dropdown.`
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/${selectedUser.id}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id
        },
        body: JSON.stringify({
          ...(roleObj?.id ? { roleId: roleObj.id } : {}),
          roleCode,
          scopeType,
          scopeId: effectiveScopeId
        })
      });

      if (response.ok) {
        await fetchUsers();
        setModalOpen(false);
        setSuccessMsg(
          `Assigned "${roleObj?.name || roleCode}" (${scopeType}${effectiveScopeId ? `: ${effectiveScopeId}` : ''}) to ${selectedUser.firstName} ${selectedUser.lastName}.`
        );
        setSaving(false);
        return;
      }

      const errBody = await response.json().catch(() => ({}));
      const msg = Array.isArray(errBody?.message)
        ? errBody.message.join(', ')
        : errBody?.message || `Failed to assign role (HTTP ${response.status})`;
      setModalError(msg);
      setSaving(false);
      return;
    } catch (e: any) {
      setModalError(e?.message || 'Network error while assigning role.');
    }

    setSaving(false);
  };

  const handleRevokeRole = async (userToUpdate: MemberUser, assignmentId: string) => {
    if (!activeTenant || !accessToken) return;
    setErrorMsg(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/roles/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant.id
        }
      });
      if (response.ok) {
        await fetchUsers();
        setSuccessMsg(`Revoked role assignment from ${userToUpdate.firstName} ${userToUpdate.lastName}.`);
        return;
      }
      const errBody = await response.json().catch(() => ({}));
      setErrorMsg(errBody?.message || `Failed to revoke role (HTTP ${response.status})`);
      return;
    } catch (e: any) {
      setErrorMsg(e?.message || 'Failed to revoke role via API');
    }
  };

  // Filtered users calculation
  const filteredUsers = users.filter(u => {
    const query = searchQuery.toLowerCase();
    const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
    const matchesSearch =
      fullName.includes(query) ||
      (u.email || '').toLowerCase().includes(query) ||
      (u.roles || []).some(r => (r.roleCode || '').toLowerCase().includes(query) || (r.roleName || '').toLowerCase().includes(query));

    const matchesRole = selectedRole === 'ALL' || (u.roles || []).some(r => r.roleCode === selectedRole);

    return matchesSearch && matchesRole;
  });

  const paginatedUsers = filteredUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getRoleDisplayName = (code: string) => {
    switch (code) {
      case 'TENANT_ADMIN': return 'Tenant Admin';
      case 'HR_MANAGER': return 'HR Manager';
      case 'PAYROLL_MANAGER': return 'Payroll Manager';
      case 'EMPLOYEE': return 'Employee';
      default: return code;
    }
  };

  const handleExportExcel = () => {
    if (filteredUsers.length === 0) return;
    exportToExcel({
      filename: `Users_Roles_${activeTenant?.slug || 'export'}_${new Date().toISOString().split('T')[0]}`,
      sheetName: 'Users & Roles',
      columns: [
        { header: 'First Name', accessor: 'firstName' },
        { header: 'Last Name', accessor: 'lastName' },
        { header: 'Email Address', accessor: 'email' },
        {
          header: 'Assigned Roles',
          accessor: (r) => (r.roles || []).map((role: any) => `${role.roleName || role.roleCode}${role.scopeType && role.scopeType !== 'TENANT' ? ` (${role.scopeType}: ${role.scopeId || 'All'})` : ''}`).join('; ') || 'No Assigned Roles'
        },
        { header: 'Status', accessor: 'status' },
      ],
      data: filteredUsers,
    });
  };

  const roleSelectOptions = availableRoles.length > 0
    ? availableRoles
    : [
        { id: '', code: 'TENANT_ADMIN', name: 'Tenant Administrator' },
        { id: '', code: 'HR_MANAGER', name: 'HR Manager' },
        { id: '', code: 'PAYROLL_MANAGER', name: 'Payroll Manager' },
        { id: '', code: 'EMPLOYEE', name: 'Employee' },
      ];

  return (
    <div className="space-y-3">
      {/* Enterprise Toolbar */}
      <EnterpriseToolbar
        title="User Access & Scoped Roles"
        totalCount={filteredUsers.length}
        tenantName={activeTenant?.name}
        searchPlaceholder="Search user name, email, role..."
        searchValue={searchQuery}
        onSearchChange={(val) => {
          setSearchQuery(val);
          setCurrentPage(1);
        }}
        filters={
          <div className="flex items-center gap-1.5">
            <select
              value={selectedRole}
              onChange={(e) => {
                setSelectedRole(e.target.value);
                setCurrentPage(1);
              }}
              className="py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-slate-400"
            >
              <option value="ALL">All Roles</option>
              <option value="TENANT_ADMIN">Tenant Admin</option>
              <option value="HR_MANAGER">HR Manager</option>
              <option value="PAYROLL_MANAGER">Payroll Manager</option>
              <option value="EMPLOYEE">Employee</option>
            </select>
            <button
              type="button"
              onClick={handleExportExcel}
              title="Download Excel (.xlsx)"
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 text-slate-700 transition flex items-center gap-1.5 text-xs font-medium shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Excel</span>
            </button>
          </div>
        }
      />

      {/* Success / Error Notifications */}
      {successMsg && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-600 hover:text-rose-800">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Enterprise Users Table */}
      <EnterpriseTable
        loading={loading}
        isEmpty={filteredUsers.length === 0}
        emptyMessage="No users found matching criteria."
        footer={
          filteredUsers.length > 0 && (
            <EnterprisePagination
              currentPage={currentPage}
              totalItems={filteredUsers.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              itemLabel="users"
            />
          )
        }
      >
        <table className="w-full text-left border-collapse text-xs">
          <EnterpriseTableHeader>
            <EnterpriseTableTh>User Details</EnterpriseTableTh>
            <EnterpriseTableTh>Status</EnterpriseTableTh>
            <EnterpriseTableTh>Assigned Roles & Scopes</EnterpriseTableTh>
            <EnterpriseTableTh align="right">Actions</EnterpriseTableTh>
          </EnterpriseTableHeader>
          <EnterpriseTableBody>
            {paginatedUsers.map(u => (
              <EnterpriseTableRow key={u.id}>
                <EnterpriseTableTd>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0 border border-slate-200">
                      {u.firstName?.[0] || 'U'}{u.lastName?.[0] || ''}
                    </div>
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-900 block text-xs truncate">
                        {u.firstName} {u.lastName}
                      </span>
                      <span className="text-slate-400 text-[11px] block truncate">{u.email}</span>
                    </div>
                  </div>
                </EnterpriseTableTd>
                <EnterpriseTableTd>
                  <EnterpriseBadge variant="success">
                    {u.status}
                  </EnterpriseBadge>
                </EnterpriseTableTd>
                <EnterpriseTableTd>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {u.roles?.map(role => (
                      <div
                        key={role.id}
                        className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-md px-2 py-0.5 text-[11px]"
                      >
                        <span className="font-semibold text-slate-800">
                          {role.roleName || getRoleDisplayName(role.roleCode)}
                        </span>
                        <span className="bg-white text-slate-600 px-1 py-0.2 rounded text-[10px] font-medium border border-slate-200">
                          {role.scopeType === 'TENANT' ? 'Tenant' : role.scopeId ? `${role.scopeType}: ${role.scopeId}` : role.scopeType}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRevokeRole(u, role.id)}
                          className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-0.5 rounded transition"
                          title="Revoke Role"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {(!u.roles || u.roles.length === 0) && (
                      <span className="text-slate-400 italic text-[11px]">No assigned roles</span>
                    )}
                  </div>
                </EnterpriseTableTd>
                <EnterpriseTableTd align="right">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setModalError(null);
                      setScopeType(ScopeType.TENANT);
                      setScopeId('');
                      const assignedCodes = new Set((u.roles || []).map(r => r.roleCode));
                      const firstAvailable = roleSelectOptions.find(r => !assignedCodes.has(r.code)) || roleSelectOptions[0];
                      if (firstAvailable) {
                        setRoleCode(firstAvailable.code);
                      }
                      setModalOpen(true);
                    }}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 transition inline-flex items-center gap-1 shadow-2xs"
                  >
                    <Plus className="w-3 h-3 text-slate-500" />
                    <span>Assign Role</span>
                  </button>
                </EnterpriseTableTd>
              </EnterpriseTableRow>
            ))}
          </EnterpriseTableBody>
        </table>
      </EnterpriseTable>

      {/* Role Assignment Modal */}
      {modalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full border border-slate-200 overflow-hidden">

            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
                <Key className="w-4 h-4 text-slate-700" />
                <span>Assign Scoped Role</span>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAssignRole} className="p-5 space-y-3.5 text-xs">
              {modalError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 leading-normal">
                User: <strong className="text-slate-900">{selectedUser.firstName} {selectedUser.lastName}</strong> ({selectedUser.email})
              </div>

              {/* Role Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Role</label>
                <select
                  value={roleCode}
                  onChange={(e) => {
                    setRoleCode(e.target.value);
                    setModalError(null);
                  }}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  {roleSelectOptions.map(r => (
                    <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>

              {/* Scope Type Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data Scope Access</label>
                <select
                  value={scopeType}
                  onChange={(e) => {
                    setScopeType(e.target.value as ScopeType);
                    setScopeId('');
                    setModalError(null);
                  }}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value={ScopeType.TENANT}>Entire Tenant (Full Access)</option>
                  <option value={ScopeType.BRANCH}>Branch Specific</option>
                  <option value={ScopeType.DEPARTMENT}>Department Specific</option>
                  <option value={ScopeType.OWN}>Own Records Only (Self Service)</option>
                </select>
              </div>

              {/* Scope Target Dropdown */}
              {(scopeType === ScopeType.BRANCH || scopeType === ScopeType.DEPARTMENT) && (() => {
                const isBranch = scopeType === ScopeType.BRANCH;
                const targetOptions = isBranch ? branchOptions : departmentOptions;
                const targetLabel = isBranch ? 'Target Branch' : 'Target Department';
                return (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      {targetLabel}
                    </label>
                    <select
                      value={scopeId}
                      onChange={(e) => {
                        setScopeId(e.target.value);
                        setModalError(null);
                      }}
                      className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                      required
                    >
                      <option value="">
                        {targetOptions.length > 0
                          ? `Select a ${isBranch ? 'Branch' : 'Department'}...`
                          : `No active ${isBranch ? 'branches' : 'departments'} configured`}
                      </option>
                      {targetOptions.map((opt) => (
                        <option key={opt.id} value={opt.name}>
                          {opt.name} ({opt.code})
                        </option>
                      ))}
                    </select>
                    {targetOptions.length === 0 && (
                      <p className="mt-1 text-[11px] text-amber-700">
                        Please add an active {isBranch ? 'branch' : 'department'} in Organization Masters first.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-slate-200 text-slate-600 rounded-lg px-3 py-1.5 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3.5 py-1.5 font-semibold flex items-center gap-1.5 shadow-2xs disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Apply Scoped Role'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
    </div>
  );
}
