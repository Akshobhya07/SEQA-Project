import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  Search,
  Filter,
  ArrowRight,
  Clock,
  ShieldAlert,
  RotateCcw,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { api } from '../api/client';
import { DeploymentFailure, Severity, IncidentStatus } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatDate } from '../../src/utils/formatters';

export const FailedDeploymentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [failures, setFailures] = useState<DeploymentFailure[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  useEffect(() => {
    fetchFailures();
  }, [search, severity, status]);

  const fetchFailures = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (severity !== 'ALL') params.set('severity', severity);
      if (status !== 'ALL') params.set('status', status);

      const res = await api.get<DeploymentFailure[]>(`/failures?${params.toString()}`);
      setFailures(res || []);
    } catch (err) {
      console.error('Failed to fetch failures:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertOctagon className="w-5 h-5 text-rose-500" /> Failed Deployments & Incident Queue
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Active and resolved failure incidents triage sorted by severity ({failures.length} records)
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incident ID, failure reason, or error..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Severity Filter */}
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            aria-label="Filter by Severity"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-rose-500"
          >
            <option value="ALL">All Severities</option>
            <option value="SEV_1_CRITICAL">SEV-1 Critical</option>
            <option value="SEV_2_HIGH">SEV-2 High</option>
            <option value="SEV_3_MEDIUM">SEV-3 Medium</option>
            <option value="SEV_4_LOW">SEV-4 Low</option>
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by Incident Status"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-rose-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="MITIGATED">Mitigated</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : failures.length === 0 ? (
          <EmptyState
            title="No deployment incidents found"
            description="All monitored deployments are currently healthy and operational."
            icon={CheckCircle2}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Incident ID</th>
                  <th className="px-4 py-3">Deployment ID</th>
                  <th className="px-4 py-3">Service & Version</th>
                  <th className="px-4 py-3">Environment</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Failure Reason</th>
                  <th className="px-4 py-3">Failure Time</th>
                  <th className="px-4 py-3">Incident Status</th>
                  <th className="px-4 py-3">Rollback</th>
                  <th className="px-4 py-3">Assigned SRE</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {failures.map((f) => {
                  const hasRollback = !!f.deployment?.rollback;
                  return (
                    <tr
                      key={f.id}
                      onClick={() => navigate(`/failures/${f.id}`)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 font-mono font-bold text-rose-400">
                        {f.id}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-indigo-400">
                        {f.deployment?.id || f.deploymentId}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-white">
                        {f.deployment?.serviceName}{' '}
                        <span className="font-mono text-slate-400 text-[11px]">
                          ({f.deployment?.version})
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                          {f.deployment?.environment}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge severity={f.severity} />
                      </td>
                      <td className="px-4 py-3.5 text-slate-300 max-w-xs truncate" title={f.failureReason}>
                        {f.failureReason}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-400">
                        {formatDate(f.failureTime)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge status={f.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        {hasRollback ? (
                          <span className="text-purple-400 font-bold text-[11px] bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded flex items-center gap-1 w-fit">
                            <RotateCcw className="w-3 h-3" /> RB Executed
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        {f.assignedEngineer?.name || 'Unassigned'}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/failures/${f.id}`);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          Investigate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
