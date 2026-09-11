import React, { useEffect, useState } from 'react';
import {
  Rocket,
  CheckCircle2,
  AlertOctagon,
  RotateCcw,
  Activity,
  Clock,
  FileText,
  TrendingUp,
  ShieldAlert,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { api } from '../api/client';
import { DashboardData } from '../types';
import { StatCard } from '../components/common/StatCard';
import { CardSkeleton } from '../components/common/LoadingSkeleton';
import { useNavigate } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get<DashboardData>('/dashboard');
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-800/60 rounded w-48 animate-pulse" />
        <CardSkeleton count={8} />
      </div>
    );
  }

  const { summary, charts } = data;

  const COLORS = ['#6366f1', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg shadow-xl text-xs">
          <p className="font-semibold text-white mb-1.5">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center gap-2 text-slate-300">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="capitalize">{entry.name}:</span>
              <span className="font-mono font-bold text-white">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            Deployment Reliability & Audit Overview
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Production health metrics, MTTR performance, and rollback trends
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/deployments')}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Rocket className="w-3.5 h-3.5" /> Deployments View
          </button>
          <button
            onClick={() => navigate('/failures')}
            className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <AlertOctagon className="w-3.5 h-3.5" /> Incidents Queue
          </button>
        </div>
      </div>

      {/* 8 Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Deployments"
          value={summary.totalDeployments}
          subtitle="All environments tracked"
          icon={Rocket}
          color="indigo"
        />
        <StatCard
          title="Successful Deployments"
          value={summary.successfulDeployments}
          subtitle={`${summary.successRate}% success rate`}
          icon={CheckCircle2}
          trend="up"
          color="emerald"
        />
        <StatCard
          title="Failed Deployments"
          value={summary.failedDeployments}
          subtitle="Severity SEV-1 to SEV-4"
          icon={AlertOctagon}
          trend={summary.failedDeployments > 0 ? 'down' : 'neutral'}
          color="rose"
        />
        <StatCard
          title="Total Rollbacks"
          value={summary.totalRollbacks}
          subtitle={`${summary.rollbackRate}% rollback frequency`}
          icon={RotateCcw}
          color="purple"
        />
        <StatCard
          title="Success Rate"
          value={`${summary.successRate}%`}
          subtitle="Target: ≥ 95.0%"
          icon={TrendingUp}
          trend={summary.successRate >= 95 ? 'up' : 'down'}
          color="emerald"
        />
        <StatCard
          title="Rollback Rate"
          value={`${summary.rollbackRate}%`}
          subtitle="Target: ≤ 5.0%"
          icon={Activity}
          trend={summary.rollbackRate <= 5 ? 'up' : 'down'}
          color="amber"
        />
        <StatCard
          title="MTTR (Mean Recovery)"
          value={`${summary.mttrMinutes} min`}
          subtitle="Failure detection to restoration"
          icon={Clock}
          color="cyan"
        />
        <StatCard
          title="Open Post-Mortems"
          value={summary.openPostMortems}
          subtitle="Draft or under review"
          icon={FileText}
          color="indigo"
        />
      </div>

      {/* Primary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Deployment Trends Over Time (Spans 2 columns) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">
                Deployment Activity Trend
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Successful vs. Failed vs. Rollbacks over time
              </p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.deploymentTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSuccess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Area type="monotone" dataKey="successful" name="Successful" stroke="#10b981" fillOpacity={1} fill="url(#colorSuccess)" strokeWidth={2} />
                <Area type="monotone" dataKey="failed" name="Failed" stroke="#f43f5e" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2} />
                <Line type="monotone" dataKey="rollbacks" name="Rollbacks" stroke="#a855f7" strokeWidth={2} dot={{ r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Success Rate Trend */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Deployment Success Rate
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Reliability percentage trajectory</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.successRateTrends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                <YAxis domain={[50, 100]} stroke="#64748b" fontSize={11} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="successRate" name="Success Rate %" stroke="#6366f1" strokeWidth={3} dot={{ fill: '#6366f1', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Chart 3: Failures by Environment */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Failures by Environment
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Production vs. Staging vs. QA</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.failuresByEnvironment} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="environment" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Failure Incidents" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                  {charts.failuresByEnvironment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.environment === 'PRODUCTION' ? '#f43f5e' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Failures by Service */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Failures by Microservice
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Incident frequency by service</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={charts.failuresByService}
                margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="service" stroke="#64748b" fontSize={10} width={100} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Incidents" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 5: Root Cause Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white tracking-tight">
              Root Cause Categories
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Categorized post-mortem attribution</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.rootCauseDistribution.filter(r => r.count > 0)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="category" stroke="#64748b" fontSize={9} interval={0} angle={-25} textAnchor="end" height={45} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" name="Post-Mortems" fill="#a855f7" radius={[4, 4, 0, 0]}>
                  {charts.rootCauseDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
