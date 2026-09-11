import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rocket, ArrowLeft, Check, GitBranch, GitCommit, Tag, Layers, Server } from 'lucide-react';
import { api } from '../api/client';
import { Application, Environment, DeploymentStatus, Deployment } from '../types';
import { Button } from '../components/common/Button';

export const CreateDeploymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    applicationId: '',
    serviceName: '',
    version: 'v2.4.2',
    environment: 'PRODUCTION' as Environment,
    branch: 'main',
    commitSha: Math.random().toString(16).substring(2, 14),
    deploymentTool: 'GitHub Actions',
    changeTicketId: 'JIRA-8601',
    releaseNotes: '',
    status: 'IN_PROGRESS' as DeploymentStatus,
  });

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const apps = await api.get<Application[]>('/applications');
      setApplications(apps);
      if (apps.length > 0) {
        setFormData((prev) => ({
          ...prev,
          applicationId: apps[0].id,
          serviceName: apps[0].name,
        }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAppChange = (appId: string) => {
    const selected = applications.find((a) => a.id === appId);
    setFormData((prev) => ({
      ...prev,
      applicationId: appId,
      serviceName: selected ? selected.name : prev.serviceName,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.applicationId || !formData.version || !formData.commitSha) {
      setError('Please fill in all mandatory deployment fields.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await api.post<Deployment>('/deployments', formData);
      navigate(`/deployments/${res.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to record deployment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Breadcrumb */}
      <div>
        <button
          onClick={() => navigate('/deployments')}
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Deployments
        </button>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Rocket className="w-5 h-5 text-indigo-400" /> Record Software Deployment
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Provision a new deployment record and initiate audit tracking in the SRE register.
        </p>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs font-medium text-rose-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Application */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Application Entity
            </label>
            <select
              value={formData.applicationId}
              onChange={(e) => handleAppChange(e.target.value)}
              aria-label="Application Entity"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              {applications.map((app) => (
                <option key={app.id} value={app.id}>
                  {app.name} ({app.key})
                </option>
              ))}
            </select>
          </div>

          {/* Service Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Service / Component Name
            </label>
            <input
              type="text"
              required
              value={formData.serviceName}
              onChange={(e) => setFormData({ ...formData, serviceName: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Version */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Target Version / Tag
            </label>
            <input
              type="text"
              required
              placeholder="v2.4.2"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Environment */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Deployment Environment
            </label>
            <select
              value={formData.environment}
              onChange={(e) => setFormData({ ...formData, environment: e.target.value as Environment })}
              aria-label="Deployment Environment"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="PRODUCTION">Production (Strict Audit & Rollback Control)</option>
              <option value="STAGING">Staging</option>
              <option value="QA">QA</option>
              <option value="DEVELOPMENT">Development</option>
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Git Branch
            </label>
            <input
              type="text"
              required
              placeholder="main"
              value={formData.branch}
              onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Commit SHA */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Commit SHA
            </label>
            <input
              type="text"
              required
              placeholder="7a8b9c1d2e3f"
              value={formData.commitSha}
              onChange={(e) => setFormData({ ...formData, commitSha: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Tool */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Deployment Tool / Runner
            </label>
            <select
              value={formData.deploymentTool}
              onChange={(e) => setFormData({ ...formData, deploymentTool: e.target.value })}
              aria-label="Deployment Tool / Runner"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="GitHub Actions">GitHub Actions</option>
              <option value="ArgoCD">ArgoCD (GitOps)</option>
              <option value="Spinnaker">Spinnaker</option>
              <option value="GitLab CI">GitLab CI</option>
              <option value="Jenkins">Jenkins</option>
            </select>
          </div>

          {/* Change Ticket ID */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Change Ticket / Issue ID
            </label>
            <input
              type="text"
              placeholder="JIRA-8601"
              value={formData.changeTicketId}
              onChange={(e) => setFormData({ ...formData, changeTicketId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {/* Initial Status */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Initial Deployment Status
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { val: 'IN_PROGRESS', label: 'In Progress (Active Rollout)' },
              { val: 'SUCCESSFUL', label: 'Successful' },
              { val: 'FAILED', label: 'Failed (Health check failure)' },
            ].map((st) => (
              <button
                key={st.val}
                type="button"
                onClick={() => setFormData({ ...formData, status: st.val as any })}
                className={`p-3 rounded-lg border text-left text-xs font-medium transition-all ${
                  formData.status === st.val
                    ? 'border-indigo-500 bg-indigo-500/10 text-white font-bold'
                    : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Release Notes */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Release Notes / Change Description
          </label>
          <textarea
            rows={3}
            placeholder="Key updates, database migration changes, config alterations, or deprecations..."
            value={formData.releaseNotes}
            onChange={(e) => setFormData({ ...formData, releaseNotes: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Button variant="ghost" type="button" onClick={() => navigate('/deployments')}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={loading} icon={Check}>
            Submit Deployment
          </Button>
        </div>
      </form>
    </div>
  );
};
