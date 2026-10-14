'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { Users, Key, Plus, Trash2, Shield, X, AlertTriangle, Check } from 'lucide-react';
import { ScopeType } from '@people-hub/shared-types';
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
  const pageSize = 10;
  
  // Form fields for assigning role
  const [roleCode, setRoleCode] = useState('HR_MANAGER');
  const [scopeType, setScopeType] = useState<ScopeType>(ScopeType.TENANT);
  const [scopeId, setScopeId] = useState('');
  const [saving, setSaving] = useState(false);

  // Available roles database simulation for local selector
  const availableRoles = [
    { id: 'role-id-admin', code: 'TENANT_ADMIN', name: 'Tenant Administrator' },
    { id: 'role-id-hrm', code: 'HR_MANAGER', name: 'HR Manager' },
    { id: 'role-id-payroll', code: 'PAYROLL_MANAGER', name: 'Payroll Manager' },
    { id: 'role-id-emp', code: 'EMPLOYEE', name: 'Employee' },
  ];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Try backend API list
      const response = await fetch(`${API_BASE_URL}/api/v1/users`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        }
      });

      if (response.ok) {
        const usersList: MemberUser[] = await response.json();
        // Load roles for each user
        for (const user of usersList) {
          const rolesResp = await fetch(`${API_BASE_URL}/api/v1/users/${user.id}/roles`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'x-tenant-id': activeTenant?.id || ''
            }
          });
          if (rolesResp.ok) {
            user.roles = await rolesResp.json();
          }
        }
        setUsers(usersList);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API fetch users failed, loading mock members.', e);
    }

    // 2. Mock Fallback
    const mockUsers: MemberUser[] = [
      {
        id: 'u1111111-1111-1111-1111-111111111111',
        email: 'admin@peoplehub.com',
        firstName: 'Priya',
        lastName: 'Sharma',
        status: 'ACTIVE',
        createdAt: '2026-08-01T12:00:00Z',
        roles: [
          {
            id: 'asg-1',
            roleId: 'role-id-admin',
            roleCode: 'TENANT_ADMIN',
            roleName: 'Tenant Administrator',
            scopeType: ScopeType.TENANT,
            scopeId: null
          }
        ]
      },
      {
        id: 'u2222222-2222-2222-2222-222222222222',
        email: 'kumar@abcgarments.com',
        firstName: 'Kumar',
        lastName: 'Saran',
        status: 'ACTIVE',
        createdAt: '2026-08-15T09:30:00Z',
        roles: [
          {
            id: 'asg-2',
            roleId: 'role-id-hrm',
            roleCode: 'HR_MANAGER',
            roleName: 'HR Manager',
            scopeType: ScopeType.BRANCH,
            scopeId: 'Chennai Branch'
          }
        ]
      },
      {
        id: 'u3333333-3333-3333-3333-333333333333',
        email: 'ananya@abcgarments.com',
        firstName: 'Ananya',
        lastName: 'Sen',
        status: 'ACTIVE',
        createdAt: '2026-08-20T10:00:00Z',
        roles: [
          {
            id: 'asg-3',
            roleId: 'role-id-emp',
            roleCode: 'EMPLOYEE',
            roleName: 'Employee',
            scopeType: ScopeType.OWN,
            scopeId: null
          }
        ]
      }
    ];
    setUsers(mockUsers);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [activeTenant]);

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSaving(true);

    const roleObj = availableRoles.find(r => r.code === roleCode)!;

    try {
      // Try backend
      const response = await fetch(`${API_BASE_URL}/api/v1/users/${selectedUser.id}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        },
        body: JSON.stringify({
          roleId: roleObj.id,
          scopeType,
          scopeId: scopeId || null
        })
      });

      if (response.ok) {
        await fetchUsers();
        setModalOpen(false);
        setSaving(false);
        return;
      }
    } catch (e) {
      console.warn('API role assignment failed, updates only simulated locally.', e);
    }

    // Mock local update
    const updatedUsers = users.map(u => {
      if (u.id === selectedUser.id) {
        const roles = u.roles || [];
        return {
          ...u,
          roles: [
            ...roles,
            {
              id: `asg-mock-${Date.now()}`,
              roleId: roleObj.id,
              roleCode: roleObj.code,
              roleName: roleObj.name,
              scopeType,
              scopeId: scopeId || null
            }
          ]
        };
      }
      return u;
    });

    setUsers(updatedUsers);
    setModalOpen(false);
    setSaving(false);
  };

  const handleRevokeRole = async (userToUpdate: MemberUser, assignmentId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/users/roles/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        }
      });
      if (response.ok) {
        await fetchUsers();
        return;
      }
    } catch (e) {
      console.warn('API revoke role failed, updating locally.', e);
    }

    // Mock local delete
    const updated = users.map(u => {
      if (u.id === userToUpdate.id) {
        return {
          ...u,
          roles: (u.roles || []).filter(r => r.id !== assignmentId)
        };
      }
      return u;
    });
    setUsers(updated);
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

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
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
        }
      />

      {/* Success Notification */}
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
                    onClick={() => {
                      setSelectedUser(u);
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
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAssignRole} className="p-5 space-y-3.5 text-xs">
              <div className="text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 leading-normal">
                User: <strong className="text-slate-900">{selectedUser.firstName} {selectedUser.lastName}</strong> ({selectedUser.email})
              </div>

              {/* Role Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Role</label>
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  {availableRoles.map(r => (
                    <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>

              {/* Scope Type Select */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Data Scope Access</label>
                <select
                  value={scopeType}
                  onChange={(e) => setScopeType(e.target.value as ScopeType)}
                  className="w-full border border-slate-200 rounded-lg p-2 bg-white text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                >
                  <option value={ScopeType.TENANT}>Entire Tenant (Full Access)</option>
                  <option value={ScopeType.BRANCH}>Branch Specific</option>
                  <option value={ScopeType.DEPARTMENT}>Department Specific</option>
                  <option value={ScopeType.OWN}>Own Records Only (Self Service)</option>
                </select>
              </div>

              {/* Scope ID */}
              {(scopeType === ScopeType.BRANCH || scopeType === ScopeType.DEPARTMENT) && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Scope Target Identifier</label>
                  <input
                    type="text"
                    value={scopeId}
                    onChange={(e) => setScopeId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg p-2 text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-400 text-xs"
                    placeholder="e.g. Chennai Branch, Engineering Dept"
                    required
                  />
                </div>
              )}

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
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3.5 py-1.5 font-semibold flex items-center gap-1.5 shadow-2xs"
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
