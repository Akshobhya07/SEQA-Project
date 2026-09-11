import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Edit2,
  Save,
  Check,
} from 'lucide-react';
import { api } from '../api/client';
import { CorrectiveAction, ActionStatus, ActionPriority, ActionType } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatDate } from '../../src/utils/formatters';
import { useAuth } from '../context/AuthContext';

export const CorrectiveActionsPage: React.FC = () => {
  const { canEdit, user } = useAuth();
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [type, setType] = useState('ALL');

  // Edit Action Modal State
  const [selectedAction, setSelectedAction] = useState<CorrectiveAction | null>(null);
  const [newStatus, setNewStatus] = useState<ActionStatus>('OPEN');
  const [verificationNotes, setVerificationNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchActions();
  }, [search, status, priority, type]);

  const fetchActions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status !== 'ALL') params.set('status', status);
      if (priority !== 'ALL') params.set('priority', priority);
      if (type !== 'ALL') params.set('type', type);

      const res = await api.get<CorrectiveAction[]>(`/actions?${params.toString()}`);
      setActions(res || []);
    } catch (err) {
      console.error('Failed to load actions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (action: CorrectiveAction) => {
    setSelectedAction(action);
    setNewStatus(action.status);
    setVerificationNotes(action.verificationNotes || '');
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAction) return;

    try {
      setSaving(true);
      await api.put(`/actions/${selectedAction.id}`, {
        status: newStatus,
        verificationNotes,
      });
      setSelectedAction(null);
      fetchActions();
    } catch (err) {
      console.error('Failed to update action:', err);
    } finally {
      setSaving(false);
    }
  };

  // Metrics
  const openCount = actions.filter((a) => a.status === 'OPEN').length;
  const inProgressCount = actions.filter((a) => a.status === 'IN_PROGRESS').length;
  const completedCount = actions.filter((a) => a.status === 'COMPLETED').length;
  const p0Count = actions.filter((a) => a.priority === 'P0_CRITICAL' && a.status !== 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-emerald-400" /> Corrective & Preventive Action Register
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Post-mortem commitments, architectural remediations, and engineering reliability improvements
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Open Actions
          </span>
          <span className="text-2xl font-bold text-white">{openCount}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
            In Progress
          </span>
          <span className="text-2xl font-bold text-amber-400">{inProgressCount}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
            Completed Actions
          </span>
          <span className="text-2xl font-bold text-emerald-400">{completedCount}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400 block mb-1">
            P0 Critical Blockers
          </span>
          <span className="text-2xl font-bold text-rose-400">{p0Count}</span>
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
            placeholder="Search action description or verification notes..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            aria-label="Filter by Priority"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="P0_CRITICAL">P0 Critical</option>
            <option value="P1_HIGH">P1 High</option>
            <option value="P2_MEDIUM">P2 Medium</option>
            <option value="P3_LOW">P3 Low</option>
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by Action Status"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="BLOCKED">Blocked</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          {/* Type */}
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            aria-label="Filter by Action Type"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Action Types</option>
            <option value="CORRECTIVE">Corrective</option>
            <option value="PREVENTIVE">Preventive</option>
            <option value="CODE">Code</option>
            <option value="INFRASTRUCTURE">Infrastructure</option>
            <option value="PROCESS">Process</option>
            <option value="MONITORING">Monitoring</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={6} />
          </div>
        ) : actions.length === 0 ? (
          <EmptyState
            title="No action items found"
            description="No actions match the selected filter parameters."
            icon={CheckSquare}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Action ID</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Owner</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Verification Notes</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {actions.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-mono font-bold text-indigo-400">
                      {act.id}
                    </td>
                    <td className="px-4 py-3.5 text-white max-w-sm font-medium">
                      {act.description}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {act.type}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          act.priority === 'P0_CRITICAL'
                            ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                            : act.priority === 'P1_HIGH'
                            ? 'bg-orange-500/15 text-orange-400 border-orange-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {act.priority.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">{act.owner?.name}</td>
                    <td className="px-4 py-3.5 font-mono text-slate-400">
                      {formatDate(act.dueDate)}
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge status={act.status} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-400 max-w-xs truncate text-[11px]">
                      {act.verificationNotes || '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {canEdit && (
                        <button
                          onClick={() => handleOpenEdit(act)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        >
                          Update
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Action Item Modal */}
      {selectedAction && (
        <Modal
          isOpen={!!selectedAction}
          onClose={() => setSelectedAction(null)}
          title={`Update Action Item: ${selectedAction.id}`}
        >
          <form onSubmit={handleSaveAction} className="space-y-4 text-xs">
            <div>
              <span className="text-slate-400 block mb-1 font-semibold">Action Description</span>
              <p className="text-sm font-medium text-white bg-slate-950 p-3 rounded-lg border border-slate-800">
                {selectedAction.description}
              </p>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Status</label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ActionStatus)}
                aria-label="Action Item Status"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
              >
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">
                Verification Notes & Resolution Evidence
              </label>
              <textarea
                rows={3}
                placeholder="Pull Request # link, Terraform verification, or automated test suite proof..."
                value={verificationNotes}
                onChange={(e) => setVerificationNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <Button variant="ghost" type="button" onClick={() => setSelectedAction(null)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit" loading={saving} icon={Check}>
                Save Updates
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
