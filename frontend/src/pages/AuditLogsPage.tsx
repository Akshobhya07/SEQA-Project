import React, { useEffect, useState } from 'react';
import {
  ShieldCheck,
  Search,
  Download,
  Filter,
  Lock,
  Eye,
  User,
  Clock,
  ArrowRight,
  Database,
} from 'lucide-react';
import { api } from '../api/client';
import { AuditLog } from '../types';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatDate, downloadCsv } from '../../src/utils/formatters';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [entityType, setEntityType] = useState('ALL');
  const [action, setAction] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Log Diff Modal
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [search, entityType, action, page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
      });
      if (search) params.set('search', search);
      if (entityType !== 'ALL') params.set('entityType', entityType);
      if (action !== 'ALL') params.set('action', action);

      const res = await api.get<{
        logs: AuditLog[];
        pagination: { total: number; totalPages: number };
      }>(`/audit-logs?${params.toString()}`);

      setLogs(res.logs || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await api.get<string>('/reports/export?type=audit-logs');
      downloadCsv(csv, `immutable_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      console.error('Failed to export audit logs:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-400" /> Immutable Audit Logs & Security Trail
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Tamper-proof compliance records for all deployment, rollback, and post-mortem operations ({totalCount} entries)
          </p>
        </div>

        <Button variant="outline" size="sm" icon={Download} onClick={handleExportCsv}>
          Export Compliance CSV
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search action, description, or entity ID..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Entity Type Filter */}
          <select
            value={entityType}
            onChange={(e) => {
              setEntityType(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Entity Type"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Entity Types</option>
            <option value="DEPLOYMENT">Deployment</option>
            <option value="ROLLBACK">Rollback</option>
            <option value="INCIDENT">Incident</option>
            <option value="POSTMORTEM">Post-Mortem</option>
            <option value="ACTION">Action Item</option>
            <option value="USER">User / Auth</option>
          </select>

          {/* Action Filter */}
          <select
            value={action}
            onChange={(e) => {
              setAction(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Action"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Actions</option>
            <option value="USER_LOGIN">User Login</option>
            <option value="DEPLOYMENT_CREATED">Deployment Created</option>
            <option value="DEPLOYMENT_UPDATED">Deployment Updated</option>
            <option value="DEPLOYMENT_FAILED">Deployment Failed</option>
            <option value="ROLLBACK_REQUESTED">Rollback Requested</option>
            <option value="ROLLBACK_APPROVED">Rollback Approved</option>
            <option value="ROLLBACK_COMPLETED">Rollback Completed</option>
            <option value="POSTMORTEM_CREATED">Post-Mortem Created</option>
            <option value="ACTION_CREATED">Action Created</option>
            <option value="ACTION_COMPLETED">Action Completed</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No audit log entries found"
            description="No system records match the active search criteria."
            icon={ShieldCheck}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp (UTC)</th>
                  <th className="px-4 py-3">Actor / User</th>
                  <th className="px-4 py-3">Action Event</th>
                  <th className="px-4 py-3">Entity Type</th>
                  <th className="px-4 py-3">Target Entity ID</th>
                  <th className="px-4 py-3">Event Description</th>
                  <th className="px-4 py-3">Client IP</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono text-slate-400">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-white block">
                        {log.user?.name || 'Automated Pipeline'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {log.user?.role || 'SYSTEM'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300 font-semibold">
                      {log.entityType}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-purple-300 font-bold">
                      {log.entityId}
                    </td>
                    <td className="px-4 py-3.5 text-slate-300 max-w-sm truncate" title={log.description}>
                      {log.description}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-500 text-[11px]">
                      {log.ipAddress}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {(log.previousValue || log.newValue) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1 ml-auto"
                        >
                          <Eye className="w-3.5 h-3.5" /> Diff
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
            <span>
              Page {page} of {totalPages} ({totalCount} total audit records)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Diff Modal */}
      {selectedLog && (
        <Modal
          isOpen={!!selectedLog}
          onClose={() => setSelectedLog(null)}
          title={`Audit State Transition: ${selectedLog.action} (${selectedLog.entityId})`}
          maxWidth="2xl"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300 font-medium">{selectedLog.description}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Previous Value */}
              <div>
                <span className="text-rose-400 font-bold uppercase tracking-wider block mb-1">
                  Previous State
                </span>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto max-h-60 whitespace-pre-wrap">
                  {selectedLog.previousValue
                    ? JSON.stringify(JSON.parse(selectedLog.previousValue), null, 2)
                    : 'null (Created)'}
                </pre>
              </div>

              {/* New Value */}
              <div>
                <span className="text-emerald-400 font-bold uppercase tracking-wider block mb-1">
                  Updated / New State
                </span>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto max-h-60 whitespace-pre-wrap">
                  {selectedLog.newValue
                    ? JSON.stringify(JSON.parse(selectedLog.newValue), null, 2)
                    : 'null (Deleted)'}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
