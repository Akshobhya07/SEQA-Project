import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Rocket,
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  AlertOctagon,
  Clock,
} from 'lucide-react';
import { api } from '../api/client';
import { Deployment, Application } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatDate, downloadCsv } from '../../src/utils/formatters';
import { useAuth } from '../context/AuthContext';

export const DeploymentsPage: React.FC = () => {
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination State
  const [search, setSearch] = useState('');
  const [environment, setEnvironment] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [applicationId, setApplicationId] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchApplications();
  }, []);

  useEffect(() => {
    fetchDeployments();
  }, [search, environment, status, applicationId, page]);

  const fetchApplications = async () => {
    try {
      const apps = await api.get<Application[]>('/applications');
      setApplications(apps);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDeployments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        sortBy: 'startedAt',
        sortOrder: 'desc',
      });
      if (search) params.set('search', search);
      if (environment !== 'ALL') params.set('environment', environment);
      if (status !== 'ALL') params.set('status', status);
      if (applicationId !== 'ALL') params.set('applicationId', applicationId);

      const res = await api.get<{
        deployments: Deployment[];
        pagination: { total: number; totalPages: number };
      }>(`/deployments?${params.toString()}`);

      setDeployments(res.deployments || []);
      setTotalPages(res.pagination?.totalPages || 1);
      setTotalCount(res.pagination?.total || 0);
    } catch (err) {
      console.error('Failed to fetch deployments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csvData = await api.get<string>('/reports/export?type=deployments');
      downloadCsv(csvData, `deployments_export_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Rocket className="w-5 h-5 text-indigo-400" /> Software Deployments
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit trail of all production, staging, and preview releases ({totalCount} total)
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button variant="outline" size="sm" icon={Download} onClick={handleExportCsv}>
            Export CSV
          </Button>
          {canEdit && (
            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => navigate('/deployments/new')}
            >
              Create Deployment
            </Button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Filter by ID, commit, branch, or release notes..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Environment */}
          <select
            value={environment}
            onChange={(e) => {
              setEnvironment(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Environment"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Environments</option>
            <option value="PRODUCTION">Production</option>
            <option value="STAGING">Staging</option>
            <option value="QA">QA</option>
            <option value="DEVELOPMENT">Development</option>
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Status"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESSFUL">Successful</option>
            <option value="FAILED">Failed</option>
            <option value="ROLLED_BACK">Rolled Back</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="SCHEDULED">Scheduled</option>
          </select>

          {/* Application */}
          <select
            value={applicationId}
            onChange={(e) => {
              setApplicationId(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by Application"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Applications</option>
            {applications.map((app) => (
              <option key={app.id} value={app.id}>
                {app.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Deployments Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={8} />
          </div>
        ) : deployments.length === 0 ? (
          <EmptyState
            title="No deployments match criteria"
            description="Try relaxing your environment or status filters, or record a new software deployment."
            icon={Rocket}
            actionLabel={canEdit ? 'Record Deployment' : undefined}
            onAction={() => navigate('/deployments/new')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Deployment ID</th>
                  <th className="px-4 py-3">Application</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Environment</th>
                  <th className="px-4 py-3">Branch / SHA</th>
                  <th className="px-4 py-3">Deployed By</th>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Rollback</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {deployments.map((d) => {
                  const hasRollback = !!d.rollback || d.status === 'ROLLED_BACK';
                  return (
                    <tr
                      key={d.id}
                      onClick={() => navigate(`/deployments/${d.id}`)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3.5 font-mono font-bold text-indigo-400">
                        {d.id}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-white">
                        {d.serviceName}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-300">
                        {d.version}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          d.environment === 'PRODUCTION'
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            : d.environment === 'STAGING'
                            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          {d.environment}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-400">
                        {d.branch} @{' '}
                        <span className="text-slate-300">{d.commitSha.slice(0, 7)}</span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-300">
                        {d.deployedBy?.name || 'Automated CI'}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-slate-400">
                        {formatDate(d.startedAt)}
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge status={d.status} />
                      </td>
                      <td className="px-4 py-3.5">
                        {hasRollback ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-400 bg-purple-500/10 border border-purple-500/30 px-2 py-0.5 rounded">
                            <RotateCcw className="w-3 h-3" /> Yes
                          </span>
                        ) : (
                          <span className="text-slate-600 font-mono">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/deployments/${d.id}`);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/40">
            <span>
              Page {page} of {totalPages} ({totalCount} items)
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
    </div>
  );
};
