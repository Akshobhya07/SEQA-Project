import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Activity } from 'lucide-react';
import { HealthStatus } from '../../types';

interface HealthIndicatorProps {
  status: HealthStatus;
  metricsJson?: string | null;
  className?: string;
}

export const HealthIndicator: React.FC<HealthIndicatorProps> = ({
  status,
  metricsJson,
  className = '',
}) => {
  let metrics = {
    api: status === 'CRITICAL' ? 'Failed' : status === 'DEGRADED' ? 'Degraded' : 'Healthy',
    database: status === 'CRITICAL' ? 'Degraded' : 'Healthy',
    frontend: 'Healthy',
    workers: status === 'CRITICAL' ? 'Failed' : 'Healthy',
    errorRate: status === 'CRITICAL' ? '42.8%' : '0.02%',
    latencyMs: status === 'CRITICAL' ? 3850 : 95,
  };

  if (metricsJson) {
    try {
      metrics = { ...metrics, ...JSON.parse(metricsJson) };
    } catch {}
  }

  const isHealthy = status === 'HEALTHY';
  const isDegraded = status === 'DEGRADED';
  const isCritical = status === 'CRITICAL';

  const healthPercent = isHealthy ? 98 : isDegraded ? 65 : 20;

  const renderStatusBadge = (val: string) => {
    if (val === 'Healthy') {
      return (
        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5" /> Healthy
        </span>
      );
    }
    if (val === 'Degraded') {
      return (
        <span className="flex items-center gap-1 text-xs font-semibold text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5" /> Degraded
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1 text-xs font-semibold text-rose-400">
        <XCircle className="w-3.5 h-3.5" /> Failed
      </span>
    );
  };

  return (
    <div
      className={`bg-slate-900 border rounded-xl p-5 ${
        isCritical
          ? 'border-rose-500/40 bg-rose-950/10'
          : isDegraded
          ? 'border-amber-500/40 bg-amber-950/10'
          : 'border-slate-800'
      } ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <Activity
            className={`w-5 h-5 ${
              isCritical
                ? 'text-rose-400 animate-pulse'
                : isDegraded
                ? 'text-amber-400'
                : 'text-emerald-400'
            }`}
          />
          <h4 className="text-sm font-semibold tracking-wide text-white">
            Deployment Health:
            <span
              className={`ml-2 uppercase text-xs px-2 py-0.5 rounded font-bold ${
                isCritical
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : isDegraded
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              }`}
            >
              {status}
            </span>
          </h4>
        </div>
        <span className="text-sm font-mono font-bold text-slate-300">{healthPercent}%</span>
      </div>

      {/* Health Progress Bar */}
      <div className="mt-3 w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            isCritical ? 'bg-rose-500' : isDegraded ? 'bg-amber-500' : 'bg-emerald-500'
          }`}
          style={{ width: `${healthPercent}%` }}
        />
      </div>

      {/* Grid of Microservices */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-3 border-t border-slate-800/60 text-xs">
        <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 block mb-1">API Cluster</span>
          {renderStatusBadge(metrics.api)}
        </div>
        <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 block mb-1">Database Shards</span>
          {renderStatusBadge(metrics.database)}
        </div>
        <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 block mb-1">Worker Queue</span>
          {renderStatusBadge(metrics.workers)}
        </div>
        <div className="bg-slate-950/50 p-2.5 rounded-lg border border-slate-800">
          <span className="text-slate-400 block mb-1">Telemetry</span>
          <span className="font-mono text-slate-300">
            {metrics.latencyMs}ms | {metrics.errorRate}
          </span>
        </div>
      </div>
    </div>
  );
};
