import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Rocket,
  ArrowLeft,
  RotateCcw,
  AlertOctagon,
  FileText,
  Terminal,
  Clock,
  GitBranch,
  GitCommit,
  User,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Server,
  ExternalLink,
} from 'lucide-react';
import { api } from '../api/client';
import { Deployment } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { HealthIndicator } from '../components/common/HealthIndicator';
import { DeploymentTimeline } from '../components/timeline/DeploymentTimeline';
import { formatDate } from '../../src/utils/formatters';
import { useAuth } from '../context/AuthContext';

export const DeploymentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { canEdit, canApprove } = useAuth();
  const navigate = useNavigate();
  const [deployment, setDeployment] = useState<Deployment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeployment();
  }, [id]);

  const fetchDeployment = async () => {
    try {
      setLoading(true);
      const res = await api.get<Deployment>(`/deployments/${id}`);
      setDeployment(res);
    } catch (err) {
      console.error('Failed to load deployment:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !deployment) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-800 rounded w-40 animate-pulse" />
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  const isFailed = deployment.status === 'FAILED' || deployment.status === 'ROLLED_BACK';
  const hasRollback = !!deployment.rollback;
  const hasFailure = !!deployment.failure;
  const hasPostMortem = !!deployment.postMortem;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/deployments')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Deployments
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-white font-mono">
              {deployment.id}
            </h2>
            <Badge status={deployment.status} />
            <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
              {deployment.environment}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">{deployment.title}</p>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2.5">
          {isFailed && !hasRollback && canEdit && (
            <Button
              variant="danger"
              size="sm"
              icon={RotateCcw}
              onClick={() =>
                navigate('/rollbacks', {
                  state: { openModal: true, deploymentId: deployment.id, version: deployment.version },
                })
              }
            >
              Initiate Rollback
            </Button>
          )}

          {isFailed && !hasFailure && canEdit && (
            <Button
              variant="secondary"
              size="sm"
              icon={AlertOctagon}
              onClick={() => navigate('/failures')}
            >
              Report Incident
            </Button>
          )}

          {hasRollback && (
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={() => navigate(`/rollbacks/${deployment.rollback?.id}`)}
            >
              View Rollback ({deployment.rollback?.id})
            </Button>
          )}

          {hasPostMortem && (
            <Button
              variant="secondary"
              size="sm"
              icon={FileText}
              onClick={() => navigate(`/postmortems/${deployment.postMortem?.id}`)}
            >
              View Post-Mortem
            </Button>
          )}
        </div>
      </div>

      {/* Prominent Banners for Incidents or Rollbacks */}
      {hasRollback && (
        <div className="p-4 bg-purple-950/20 border border-purple-500/40 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-lg">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">
                Rollback Registered: {deployment.rollback?.id}
              </h4>
              <p className="text-xs text-purple-300/80 mt-0.5">
                Target restored version: {deployment.rollback?.restoredVersion}. Status: {deployment.rollback?.status}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/rollbacks/${deployment.rollback?.id}`)}
          >
            Execution Checklist →
          </Button>
        </div>
      )}

      {hasFailure && (
        <div className="p-4 bg-rose-950/20 border border-rose-500/40 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Incident Declared: {deployment.failure?.id}
                <Badge severity={deployment.failure?.severity} />
              </h4>
              <p className="text-xs text-rose-300/80 mt-0.5">
                Failure status: {deployment.failure?.status}. Investigated by:{' '}
                {deployment.failure?.assignedEngineer?.name || 'Assigned SRE'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/failures/${deployment.failure?.id}`)}
          >
            Incident Investigation →
          </Button>
        </div>
      )}

      {/* Deployment Health Component */}
      <HealthIndicator
        status={deployment.healthStatus}
        metricsJson={deployment.healthMetrics}
      />

      {/* Technical Metadata Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Application Entity
          </span>
          <p className="text-sm font-semibold text-white">{deployment.serviceName}</p>
          <span className="text-xs font-mono text-indigo-400">{deployment.application?.key}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Git Information
          </span>
          <p className="text-sm font-mono text-white flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-slate-500" />
            {deployment.branch}
          </p>
          <span className="text-xs font-mono text-slate-400 flex items-center gap-1 mt-0.5">
            <GitCommit className="w-3.5 h-3.5 text-slate-500" />
            {deployment.commitSha}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Operator / Tool
          </span>
          <p className="text-sm font-semibold text-white flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-slate-500" />
            {deployment.deployedBy?.name}
          </p>
          <span className="text-xs text-slate-400">{deployment.deploymentTool}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Timeline Timestamps
          </span>
          <p className="text-xs font-mono text-slate-300">
            Started: {formatDate(deployment.startedAt)}
          </p>
          <p className="text-xs font-mono text-slate-400 mt-0.5">
            Finished: {deployment.completedAt ? formatDate(deployment.completedAt) : 'In Progress'}
          </p>
        </div>
      </div>

      {/* Two Column Layout: Lifecycle Timeline & Deployment Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Timeline */}
        <DeploymentTimeline deployment={deployment} />

        {/* Live Logs Viewer */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" /> Deployment Execution Logs
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-800 rounded text-slate-400">
              STDOUT / STDERR
            </span>
          </div>
          <div className="flex-1 bg-slate-950 rounded-lg p-4 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap max-h-96 leading-relaxed border border-slate-800/80 select-text">
            {deployment.logs || 'No logs recorded for this execution.'}
          </div>
        </div>
      </div>
    </div>
  );
};
