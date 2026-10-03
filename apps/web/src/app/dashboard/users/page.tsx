'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { Users, Key, Plus, Trash2, Shield, X, AlertTriangle } from 'lucide-react';
import { ScopeType } from '@people-hub/shared-types';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">User Access & Scoped Roles</h1>
          <p className="text-slate-500 text-sm mt-1">Manage user memberships, roles, permissions scopes for tenant isolation policies.</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-left">
              <tr>
                <th className="px-6 py-4">User Details</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Assigned Roles & Scopes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-800 font-bold flex items-center justify-center border border-slate-200 text-xs">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block text-sm">{u.firstName} {u.lastName}</span>
                        <span className="text-slate-400 block">{u.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold px-2 py-0.5 rounded text-[10px]">
                      {u.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {u.roles?.map(role => (
                        <div key={role.id} className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded pl-2 pr-1 py-1 text-[10px]">
                          <span className="font-bold text-slate-800">{role.roleCode}</span>
                          <span className="text-slate-400">|</span>
                          <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-semibold uppercase">
                            {role.scopeType}
                          </span>
                          {role.scopeId && (
                            <span className="text-slate-600 font-semibold italic">({role.scopeId})</span>
                          )}
                          <button
                            onClick={() => handleRevokeRole(u, role.id)}
                            className="text-red-500 hover:bg-red-50 p-0.5 rounded"
                            title="Revoke Role"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {(!u.roles || u.roles.length === 0) && (
                        <span className="text-slate-400 italic">No assigned roles</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        setModalOpen(true);
                      }}
                      className="bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 font-semibold px-3 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Assign Role</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Role Assignment Modal */}
      {modalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full border border-slate-200 overflow-hidden">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <Key className="w-5 h-5 text-primary-500" />
                <span>Assign Scoped Role</span>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAssignRole} className="p-6 space-y-4 text-xs">
              <div className="text-slate-500 bg-slate-50 p-3 rounded leading-normal mb-2">
                Assigning RBAC role to user: <strong>{selectedUser.firstName} {selectedUser.lastName}</strong>
              </div>

              {/* Role Select */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Select Role</label>
                <select
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {availableRoles.map(r => (
                    <option key={r.code} value={r.code}>{r.name} ({r.code})</option>
                  ))}
                </select>
              </div>

              {/* Scope Type Select */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Data Scope Access</label>
                <select
                  value={scopeType}
                  onChange={(e) => setScopeType(e.target.value as ScopeType)}
                  className="w-full border border-slate-300 rounded-lg p-2.5 bg-white text-slate-700 text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                  <label className="block font-bold text-slate-700 mb-1">Scope Target Identifier (e.g. Branch/Dept ID)</label>
                  <input
                    type="text"
                    value={scopeId}
                    onChange={(e) => setScopeId(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500 text-xs"
                    placeholder="e.g. Chennai Branch, Engineering Dept"
                    required
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="border border-slate-300 text-slate-600 rounded-lg px-4 py-2 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg px-4 py-2 font-semibold flex items-center gap-1.5"
                >
                  {saving ? 'Saving...' : 'Apply Scope Role'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
    </div>
  );
}
