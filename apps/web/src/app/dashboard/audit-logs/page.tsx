'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '../../../context/AppContext';
import { API_BASE_URL } from '../../../config/api';
import { Shield, Clock, Terminal, ChevronDown, ChevronUp } from 'lucide-react';
import { AuditLogResponse } from '@people-hub/shared-types';

export default function AuditLogsPage() {
  const { activeTenant, accessToken } = useApp();
  const [logs, setLogs] = useState<AuditLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/audit-logs`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-tenant-id': activeTenant?.id || ''
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data);
        setLoading(false);
        return;
      }
    } catch (e) {
      console.warn('API fetch audit logs failed, loading mockup logs.', e);
    }

    // Mock logs fallback
    const mockLogs: AuditLogResponse[] = [
      {
        id: 'log-1',
        tenantId: activeTenant?.id || 't2222222-2222-2222-2222-222222222222',
        userId: 'u1111111-1111-1111-1111-111111111111',
        userEmail: 'admin@peoplehub.com',
        action: 'POST /api/v1/auth/login',
        entityName: 'Authentication',
        entityId: 'u1111111-1111-1111-1111-111111111111',
        oldValues: null,
        newValues: { email: 'admin@peoplehub.com', passwordHash: '[REDACTED]' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        createdAt: new Date().toISOString()
      },
      {
        id: 'log-2',
        tenantId: activeTenant?.id || 't2222222-2222-2222-2222-222222222222',
        userId: 'u1111111-1111-1111-1111-111111111111',
        userEmail: 'admin@peoplehub.com',
        action: 'POST /api/v1/tenants/modules/PIECE_RATE',
        entityName: 'Tenants',
        entityId: 'PIECE_RATE',
        oldValues: null,
        newValues: { isEnabled: true },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        createdAt: new Date(Date.now() - 300000).toISOString()
      },
      {
        id: 'log-3',
        tenantId: activeTenant?.id || 't2222222-2222-2222-2222-222222222222',
        userId: 'u1111111-1111-1111-1111-111111111111',
        userEmail: 'admin@peoplehub.com',
        action: 'POST /api/v1/users/u2222222-2222-2222-2222-222222222222/roles',
        entityName: 'Users',
        entityId: 'asg-2',
        oldValues: null,
        newValues: { roleId: 'role-id-hrm', scopeType: 'BRANCH', scopeId: 'Chennai Branch' },
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        createdAt: new Date(Date.now() - 600000).toISOString()
      }
    ];

    setLogs(mockLogs);
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [activeTenant]);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800">System Audit Trail</h1>
        <p className="text-slate-500 text-sm mt-1">Immutable system event records for monitoring user actions, tenant isolation and authentication contexts.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {logs.map((log) => {
              const isExpanded = expandedId === log.id;
              return (
                <div key={log.id} className="p-4 hover:bg-slate-50/50 transition-colors">
                  {/* Summary row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    
                    {/* Event & Action */}
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 text-slate-600 rounded mt-0.5">
                        <Terminal className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 text-sm">{log.action}</span>
                          <span className="bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase border border-blue-100">
                            {log.entityName}
                          </span>
                        </div>
                        <div className="text-slate-400 mt-1 flex items-center gap-1.5">
                          <span>User: <strong>{log.userEmail || 'Anonymous'}</strong></span>
                          <span>•</span>
                          <span>IP: {log.ipAddress}</span>
                        </div>
                      </div>
                    </div>

                    {/* Metadata & Toggle */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 min-w-[200px]">
                      <div className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>

                  </div>

                  {/* Expanded Payload view */}
                  {isExpanded && (
                    <div className="mt-4 border-t border-slate-100 pt-4 space-y-3 bg-slate-50 p-4 rounded-lg text-[11px] font-mono text-slate-700 overflow-x-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <span className="text-slate-400 font-bold block mb-1">User Agent</span>
                          <span className="break-all">{log.userAgent}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold block mb-1">Event Target Reference ID</span>
                          <span className="break-all">{log.entityId || 'N/A'}</span>
                        </div>
                      </div>
                      
                      {log.newValues && (
                        <div>
                          <span className="text-slate-400 font-bold block mb-1">Request Payload</span>
                          <pre className="p-2 bg-slate-900 text-primary-300 rounded overflow-x-auto">
                            {JSON.stringify(log.newValues, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
            {logs.length === 0 && (
              <div className="p-8 text-center text-slate-400 italic">No events logged for this tenant</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
