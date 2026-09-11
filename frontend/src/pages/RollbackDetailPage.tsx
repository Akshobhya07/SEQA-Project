import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  RotateCcw,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  AlertTriangle,
  User,
  Calendar,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { api } from '../api/client';
import { Rollback, RollbackStatus, ApprovalStatus } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { RollbackStepList } from '../components/timeline/RollbackStepList';
import { formatDate, formatDuration } from '../../src/utils/formatters';
import { useAuth } from '../context/AuthContext';

export const RollbackDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { canApprove, canEdit, user } = useAuth();
  const navigate = useNavigate();
  const [rollback, setRollback] = useState<Rollback | null>(null);
  const [loading, setLoading] = useState(true);

  // Approval form state
  const [approvalComment, setApprovalComment] = useState('');
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    fetchRollback();
  }, [id]);

  const fetchRollback = async () => {
    try {
      setLoading(true);
      const res = await api.get<Rollback>(`/rollbacks/${id}`);
      setRollback(res);
    } catch (err) {
      console.error('Failed to load rollback:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (approved: boolean) => {
    try {
      setApproving(true);
      await api.put(`/rollbacks/${rollback?.id}/approval`, {
        approved,
        comment: approvalComment,
      });
      fetchRollback();
    } catch (err) {
      console.error('Failed to process approval:', err);
    } finally {
      setApproving(false);
    }
  };

  const handleMarkStatus = async (status: RollbackStatus) => {
    try {
      await api.put(`/rollbacks/${rollback?.id}/status`, { status });
      fetchRollback();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  if (loading || !rollback) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-800 rounded w-48 animate-pulse" />
        <div className="h-96 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  const isPendingApproval = rollback.approvalStatus === 'PENDING';
  const isApproved = rollback.approvalStatus === 'APPROVED';
  const isCompleted = rollback.status === 'COMPLETED';
  const isInProgress = rollback.status === 'IN_PROGRESS';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/rollbacks')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Rollbacks
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-purple-400" />
              {rollback.id}
            </h2>
            <Badge status={rollback.status} />
            <Badge status={rollback.approvalStatus} />
          </div>
          <p className="text-xs text-slate-300 mt-1">
            Rollback for <span className="font-semibold text-white">{rollback.deployment?.serviceName}</span> ({rollback.failedVersion} →{' '}
            <span className="text-emerald-400 font-bold">{rollback.restoredVersion}</span>)
          </p>
        </div>

        {/* Global Action Triggers */}
        <div className="flex items-center gap-2">
          {isInProgress && canEdit && (
            <Button
              variant="primary"
              size="sm"
              icon={CheckCircle2}
              onClick={() => handleMarkStatus('COMPLETED')}
            >
              Complete Rollback
            </Button>
          )}

          {isInProgress && canEdit && (
            <Button
              variant="danger"
              size="sm"
              icon={XCircle}
              onClick={() => handleMarkStatus('FAILED')}
            >
              Mark Failed
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/deployments/${rollback.deploymentId}`)}
          >
            Deployment Record →
          </Button>
        </div>
      </div>

      {/* Production Approval Workflow Banner */}
      {isPendingApproval ? (
        <div className="p-5 bg-amber-950/20 border border-amber-500/40 rounded-xl space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-lg">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  Rollback Approval Required (Production Environment)
                </h4>
                <p className="text-xs text-amber-300/80 mt-0.5">
                  Requested by <span className="font-semibold text-white">{rollback.requestedBy?.name}</span> at{' '}
                  {formatDate(rollback.requestedAt)}. Reason: "{rollback.reason}"
                </p>
              </div>
            </div>
          </div>

          {canApprove ? (
            <div className="pt-3 border-t border-amber-500/30 flex flex-col sm:flex-row items-center gap-3">
              <input
                type="text"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                placeholder="Approval comment or notes (e.g. Approved emergency revert to v2.4.0)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="primary"
                  size="sm"
                  loading={approving}
                  onClick={() => handleApproval(true)}
                  icon={CheckCircle2}
                >
                  Approve Execution
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={approving}
                  onClick={() => handleApproval(false)}
                  icon={XCircle}
                >
                  Reject
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              You are currently logged in as {user?.role}. Only Admin or SRE operators can approve this production rollback.
            </p>
          )}
        </div>
      ) : (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <div>
              <span className="text-white font-semibold block">
                Approval Status: {rollback.approvalStatus}
              </span>
              <span className="text-slate-400">
                Processed by {rollback.approvedBy?.name || 'Authorized Lead'} at {formatDate(rollback.approvedAt)}
                {rollback.approvalComment ? ` • "${rollback.approvalComment}"` : ''}
              </span>
            </div>
          </div>
          <Badge status={rollback.approvalStatus} />
        </div>
      )}

      {/* Technical Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 block mb-1">Target Service</span>
          <span className="font-semibold text-white">{rollback.deployment?.serviceName}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 block mb-1">Target Environment</span>
          <span className="font-semibold text-white">{rollback.environment}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 block mb-1">Version Reversion</span>
          <span className="font-mono text-white">
            <span className="text-rose-400">{rollback.failedVersion}</span> →{' '}
            <span className="text-emerald-400 font-bold">{rollback.restoredVersion}</span>
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 block mb-1">Execution Duration</span>
          <span className="font-mono font-bold text-white">
            {formatDuration(rollback.durationSeconds)}
          </span>
        </div>
      </div>

      {/* Rollback Reason Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          Rollback Trigger & Justification
        </h4>
        <p className="text-sm text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
          {rollback.reason}
        </p>
      </div>

      {/* Rollback Execution Steps Checklist */}
      <RollbackStepList
        steps={rollback.steps || []}
        rollbackId={rollback.id}
        onUpdate={fetchRollback}
      />
    </div>
  );
};
