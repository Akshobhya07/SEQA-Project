import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  RotateCcw,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../api/client';
import { Rollback, Deployment, RollbackStatus, Environment } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatDate, formatDuration } from '../../src/utils/formatters';
import { useAuth } from '../context/AuthContext';

export const RollbacksPage: React.FC = () => {
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [rollbacks, setRollbacks] = useState<Rollback[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [environment, setEnvironment] = useState('ALL');

  // Initiate Rollback Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalDepId, setModalDepId] = useState('');
  const [modalFailedVer, setModalFailedVer] = useState('');
  const [modalRestoredVer, setModalRestoredVer] = useState('');
  const [modalReason, setModalReason] = useState('');
  const [modalReqApproval, setModalReqApproval] = useState(true);
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchRollbacks();

    // Check if opened from another page via router state
    if (location.state && (location.state as any).openModal) {
      const st = location.state as any;
      setModalDepId(st.deploymentId || '');
      setModalFailedVer(st.version || '');
      setIsModalOpen(true);
    }
  }, [search, status, environment, location.state]);

  const fetchRollbacks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status !== 'ALL') params.set('status', status);
      if (environment !== 'ALL') params.set('environment', environment);

      const res = await api.get<Rollback[]>(`/rollbacks?${params.toString()}`);
      setRollbacks(res || []);
    } catch (err) {
      console.error('Failed to load rollbacks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateRollback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalDepId || !modalFailedVer || !modalRestoredVer || !modalReason) {
      setModalError('Please fill in all rollback required fields.');
      return;
    }

    try {
      setModalSubmitting(true);
      setModalError(null);
      const res = await api.post<Rollback>('/rollbacks', {
        deploymentId: modalDepId,
        failedVersion: modalFailedVer,
        restoredVersion: modalRestoredVer,
        reason: modalReason,
        requiresApproval: modalReqApproval,
      });
      setIsModalOpen(false);
      navigate(`/rollbacks/${res.id}`);
    } catch (err: any) {
      setModalError(err.message || 'Failed to initiate rollback');
    } finally {
      setModalSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-purple-400" /> Software Rollback Records
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit register of automated and manual deployment rollbacks ({rollbacks.length} total)
          </p>
        </div>

        {canEdit && (
          <Button
            variant="danger"
            size="sm"
            icon={Plus}
            onClick={() => {
              setModalError(null);
              setIsModalOpen(true);
            }}
          >
            Initiate Rollback
          </Button>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rollback ID, deployment ID, or reason..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by Rollback Status"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="FAILED">Failed</option>
            <option value="NOT_STARTED">Not Started</option>
          </select>

          {/* Environment */}
          <select
            value={environment}
            onChange={(e) => setEnvironment(e.target.value)}
            aria-label="Filter by Environment"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
          >
            <option value="ALL">All Environments</option>
            <option value="PRODUCTION">Production</option>
            <option value="STAGING">Staging</option>
            <option value="QA">QA</option>
            <option value="DEVELOPMENT">Development</option>
          </select>
        </div>
      </div>

      {/* Rollbacks Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : rollbacks.length === 0 ? (
          <EmptyState
            title="No rollback records found"
            description="No deployments have required a rollback under the selected filter criteria."
            icon={RotateCcw}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Rollback ID</th>
                  <th className="px-4 py-3">Deployment ID</th>
                  <th className="px-4 py-3">Service & Environment</th>
                  <th className="px-4 py-3">Failed → Restored</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Approval</th>
                  <th className="px-4 py-3">Initiated By</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {rollbacks.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/rollbacks/${r.id}`)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-purple-400">
                      {r.id}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-indigo-400">
                      {r.deploymentId}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-white block">
                        {r.deployment?.serviceName}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {r.environment}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono">
                      <span className="text-rose-400">{r.failedVersion}</span> →{' '}
                      <span className="text-emerald-400 font-bold">{r.restoredVersion}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge status={r.status} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge status={r.approvalStatus} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {r.requestedBy?.name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-400">
                      {formatDuration(r.durationSeconds)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/rollbacks/${r.id}`);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        Checklist
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Initiate Rollback */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Initiate Disaster-Recovery Rollback"
      >
        <form onSubmit={handleInitiateRollback} className="space-y-4 text-xs">
          {modalError && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-rose-400 font-medium">
              {modalError}
            </div>
          )}

          <div>
            <label className="block font-semibold uppercase text-slate-400 mb-1">
              Target Deployment ID
            </label>
            <input
              type="text"
              required
              placeholder="DEP-2026-000124"
              value={modalDepId}
              onChange={(e) => setModalDepId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold uppercase text-slate-400 mb-1">
                Failed Version
              </label>
              <input
                type="text"
                required
                placeholder="v2.4.1"
                value={modalFailedVer}
                onChange={(e) => setModalFailedVer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold uppercase text-slate-400 mb-1">
                Restored (Target) Version
              </label>
              <input
                type="text"
                required
                placeholder="v2.4.0"
                value={modalRestoredVer}
                onChange={(e) => setModalRestoredVer(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold uppercase text-slate-400 mb-1">
              Rollback Justification / Incident Link
            </label>
            <textarea
              rows={3}
              required
              placeholder="Describe failure reason and necessity of rolling back release..."
              value={modalReason}
              onChange={(e) => setModalReason(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="reqApproval"
              checked={modalReqApproval}
              onChange={(e) => setModalReqApproval(e.target.checked)}
              className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
            />
            <label htmlFor="reqApproval" className="text-slate-300 font-medium">
              Require SRE/Admin approval prior to execution (Recommended for Production)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
            <Button variant="ghost" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" loading={modalSubmitting} icon={RotateCcw}>
              Initiate Rollback
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
