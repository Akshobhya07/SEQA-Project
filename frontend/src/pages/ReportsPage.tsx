import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  FileText,
  TrendingUp,
  RotateCcw,
  Clock,
  AlertOctagon,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { api } from '../api/client';
import { Button } from '../components/common/Button';
import { StatCard } from '../components/common/StatCard';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { formatDate, downloadCsv } from '../../src/utils/formatters';

export const ReportsPage: React.FC = () => {
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [range]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 365;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const res = await api.get(`/reports/metrics?startDate=${startDate}&endDate=${endDate}`);
      setReportData(res);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCsv = async () => {
    try {
      const csv = await api.get<string>('/reports/export?type=deployments');
      downloadCsv(csv, `reliability_audit_report_${range}.csv`);
    } catch (err) {
      console.error('Failed to export CSV:', err);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-400" /> SRE Deployment Reliability Report
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Statistical analysis of deployment reliability, incident frequency, and recovery velocity
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Time range switcher */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
            {(['7d', '30d', '90d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-md font-medium uppercase transition-colors ${
                  range === r
                    ? 'bg-indigo-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {r === 'all' ? '1 Year' : r}
              </button>
            ))}
          </div>

          <Button variant="outline" size="sm" icon={Download} onClick={handleExportCsv}>
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" icon={Printer} onClick={handlePrint}>
            Print Report
          </Button>
        </div>
      </div>

      {loading || !reportData ? (
        <CardSkeleton count={6} />
      ) : (
        <div className="space-y-6">
          {/* Printable Report Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <span className="text-[11px] font-mono uppercase text-indigo-400 font-bold block mb-1">
                  Executive Reliability Audit
                </span>
                <h3 className="text-lg font-bold text-white">
                  Software Deployment & Recovery Assessment
                </h3>
              </div>
              <div className="text-right text-xs font-mono text-slate-400">
                <p>Period: {formatDate(reportData.period?.start)}</p>
                <p>To: {formatDate(reportData.period?.end)}</p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 text-xs block mb-1">Total Deployments</span>
                <span className="text-2xl font-bold text-white">
                  {reportData.metrics?.totalDeployments}
                </span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 text-xs block mb-1">Success Rate</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {reportData.metrics?.successRate}%
                </span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 text-xs block mb-1">Rollback Rate</span>
                <span className="text-2xl font-bold text-amber-400">
                  {reportData.metrics?.rollbackRate}%
                </span>
              </div>
              <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-800/80">
                <span className="text-slate-400 text-xs block mb-1">Mean Time to Recovery</span>
                <span className="text-2xl font-bold text-cyan-400">
                  {reportData.metrics?.mttrMinutes} min
                </span>
              </div>
            </div>
          </div>

          {/* Breakdown Tables */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Failures by Service */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                <AlertOctagon className="w-4 h-4 text-rose-400" /> Incident Distribution by Service
              </h4>
              <div className="space-y-2 text-xs">
                {reportData.failuresByService?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800"
                  >
                    <span className="text-slate-200 font-medium">{item.service}</span>
                    <span className="font-mono font-bold text-rose-400">{item.count} incidents</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Failures by Environment */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" /> Incidents by Environment
              </h4>
              <div className="space-y-2 text-xs">
                {reportData.failuresByEnvironment?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800"
                  >
                    <span className="text-slate-200 font-medium">{item.environment}</span>
                    <span className="font-mono font-bold text-amber-400">{item.count} incidents</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Root Causes and Open Actions */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Root Cause Attribution & Outstanding Actions
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              {reportData.rootCauses?.map((rc: any, idx: number) => (
                <div key={idx} className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block mb-1 text-[11px] truncate">
                    {rc.category.replace(/_/g, ' ')}
                  </span>
                  <span className="text-base font-bold text-white font-mono">{rc.count} PMs</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
