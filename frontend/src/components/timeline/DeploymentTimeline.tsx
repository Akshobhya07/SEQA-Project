import React from 'react';
import { CheckCircle2, AlertCircle, RotateCcw, FileText, ArrowDown, Clock } from 'lucide-react';
import { Deployment } from '../../types';
import { formatDate } from '../../utils/formatters';

interface DeploymentTimelineProps {
  deployment: Deployment;
}

export const DeploymentTimeline: React.FC<DeploymentTimelineProps> = ({ deployment }) => {
  const isFailed = deployment.status === 'FAILED' || deployment.status === 'ROLLED_BACK';
  const isRolledBack = deployment.status === 'ROLLED_BACK' || !!deployment.rollback;
  const isCompleted = deployment.status === 'SUCCESSFUL';
  const hasPostMortem = !!deployment.postMortem;

  const steps = [
    {
      title: 'Deployment Created',
      desc: `Manifest compiled for ${deployment.serviceName} (${deployment.version})`,
      time: deployment.startedAt,
      status: 'completed',
      icon: CheckCircle2,
      color: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/40',
    },
    {
      title: 'Deployment Started',
      desc: `Rollout initiated via ${deployment.deploymentTool} on ${deployment.environment}`,
      time: deployment.startedAt,
      status: 'completed',
      icon: Clock,
      color: 'text-indigo-400 bg-indigo-500/20 border-indigo-500/40',
    },
    ...(isFailed
      ? [
          {
            title: 'Deployment Failed & Alert Triggered',
            desc: deployment.failure?.failureReason || 'Health probe failures exceeding threshold',
            time: deployment.failure?.detectedTime || deployment.completedAt,
            status: 'failed',
            icon: AlertCircle,
            color: 'text-rose-400 bg-rose-500/20 border-rose-500/40',
          },
        ]
      : []),
    ...(isRolledBack
      ? [
          {
            title: 'Rollback Initiated',
            desc: `Restoring version ${deployment.rollback?.restoredVersion || 'previous'}`,
            time: deployment.rollback?.requestedAt,
            status: 'rollback',
            icon: RotateCcw,
            color: 'text-purple-400 bg-purple-500/20 border-purple-500/40',
          },
          {
            title: 'Rollback Completed & Service Restored',
            desc: `Status: ${deployment.rollback?.status || 'COMPLETED'}`,
            time: deployment.rollback?.completedAt || deployment.completedAt,
            status: 'completed',
            icon: CheckCircle2,
            color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
          },
        ]
      : isCompleted
      ? [
          {
            title: 'Deployment Completed Successfully',
            desc: 'All canary probes passing, 100% traffic shifted',
            time: deployment.completedAt,
            status: 'completed',
            icon: CheckCircle2,
            color: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40',
          },
        ]
      : [
          {
            title: 'Deployment In Progress',
            desc: 'Traffic shifting and health probes evaluating...',
            time: null,
            status: 'in_progress',
            icon: Clock,
            color: 'text-amber-400 bg-amber-500/20 border-amber-500/40 animate-pulse',
          },
        ]),
    ...(hasPostMortem
      ? [
          {
            title: 'Post-Mortem Created',
            desc: `RCA Document: ${deployment.postMortem?.title || deployment.postMortem?.id}`,
            time: deployment.postMortem?.createdAt,
            status: 'postmortem',
            icon: FileText,
            color: 'text-cyan-400 bg-cyan-500/20 border-cyan-500/40',
          },
        ]
      : []),
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <h3 className="text-sm font-semibold text-white tracking-tight mb-6 flex items-center gap-2">
        <Clock className="w-4 h-4 text-indigo-400" /> Deployment Lifecycle Timeline
      </h3>

      <div className="relative pl-6 space-y-6 before:absolute before:left-[19px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={idx} className="relative flex items-start gap-4 group">
              <div
                className={`absolute -left-[30px] w-7 h-7 rounded-full border flex items-center justify-center shrink-0 z-10 ${step.color}`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div className="flex-1 bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5 hover:border-slate-700 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-white tracking-wide">{step.title}</h4>
                  {step.time && (
                    <span className="text-[11px] font-mono text-slate-400">
                      {formatDate(step.time)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-400">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
