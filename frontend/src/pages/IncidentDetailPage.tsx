import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertOctagon,
  ArrowLeft,
  RotateCcw,
  FileText,
  Clock,
  Users,
  ShieldAlert,
  Server,
  Terminal,
  Activity,
  CheckCircle2,
  Edit2,
  Save,
} from 'lucide-react';
import { api } from '../api/client';
import { DeploymentFailure, IncidentStatus, Severity } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { formatDate } from '../../src/utils/formatters';
import { useAuth } from '../context/AuthContext';

export const IncidentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const [incident, setIncident] = useState<DeploymentFailure | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    fetchIncident();
  }, [id]);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      const res = await api.get<DeploymentFailure>(`/failures/${id}`);
      setIncident(res);
      setFormData({
        status: res.status,
        severity: res.severity,
        whatHappened: res.whatHappened,
        observableSymptoms: res.observableSymptoms || '',
        businessImpact: res.businessImpact || '',
        dataImpact: res.dataImpact || '',
        immediateActionsTaken: res.immediateActionsTaken || '',
        downtimeMinutes: res.downtimeMinutes,
        usersAffected: res.usersAffected,
      });
    } catch (err) {
      console.error('Failed to load incident:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put(`/failures/${incident?.id}`, formData);
      setIsEditing(false);
      fetchIncident();
    } catch (err) {
      console.error('Failed to update incident:', err);
    }
  };

  if (loading || !incident) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-800 rounded w-48 animate-pulse" />
        <div className="h-96 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  const affectedServicesList: string[] = incident.affectedServices
    ? JSON.parse(incident.affectedServices)
    : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/failures')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Failed Deployments
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
              <AlertOctagon className="w-5 h-5 text-rose-500" />
              {incident.id}
            </h2>
            <Badge severity={incident.severity} />
            <Badge status={incident.status} />
          </div>
          <p className="text-xs text-slate-300 mt-1 font-medium">{incident.failureReason}</p>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2.5">
          {canEdit && (
            isEditing ? (
              <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>
                Save Updates
              </Button>
            ) : (
              <Button variant="outline" size="sm" icon={Edit2} onClick={() => setIsEditing(true)}>
                Edit Investigation
              </Button>
            )
          )}

          {!incident.deployment?.rollback && canEdit && (
            <Button
              variant="danger"
              size="sm"
              icon={RotateCcw}
              onClick={() =>
                navigate('/rollbacks', {
                  state: {
                    openModal: true,
                    deploymentId: incident.deploymentId,
                    version: incident.deployment?.version,
                  },
                })
              }
            >
              Initiate Rollback
            </Button>
          )}

          {incident.deployment?.rollback && (
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={() => navigate(`/rollbacks/${incident.deployment?.rollback?.id}`)}
            >
              View Rollback ({incident.deployment?.rollback?.id})
            </Button>
          )}

          {!incident.postMortem && canEdit && (
            <Button
              variant="secondary"
              size="sm"
              icon={FileText}
              onClick={() =>
                navigate('/postmortems/new', {
                  state: { incidentId: incident.id, deploymentId: incident.deploymentId },
                })
              }
            >
              Create Post-Mortem
            </Button>
          )}

          {incident.postMortem && (
            <Button
              variant="secondary"
              size="sm"
              icon={FileText}
              onClick={() => navigate(`/postmortems/${incident.postMortem?.id}`)}
            >
              View Post-Mortem ({incident.postMortem?.id})
            </Button>
          )}
        </div>
      </div>

      {/* Incident Status and Severity Controls (when editing) */}
      {isEditing && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Incident Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as IncidentStatus })}
              aria-label="Incident Status"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
            >
              <option value="OPEN">Open</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="MITIGATED">Mitigated</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Severity</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value as Severity })}
              aria-label="Severity"
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
            >
              <option value="SEV_1_CRITICAL">SEV-1 Critical</option>
              <option value="SEV_2_HIGH">SEV-2 High</option>
              <option value="SEV_3_MEDIUM">SEV-3 Medium</option>
              <option value="SEV_4_LOW">SEV-4 Low</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 font-bold uppercase mb-1">Downtime (Minutes)</label>
            <input
              type="number"
              value={formData.downtimeMinutes}
              onChange={(e) => setFormData({ ...formData, downtimeMinutes: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-white"
            />
          </div>
        </div>
      )}

      {/* Incident Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 block mb-1">Deployment ID</span>
          <button
            onClick={() => navigate(`/deployments/${incident.deploymentId}`)}
            className="font-mono font-bold text-indigo-400 hover:underline"
          >
            {incident.deploymentId}
          </button>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 block mb-1">Target Service</span>
          <span className="font-semibold text-white">{incident.deployment?.serviceName}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 block mb-1">Assigned SRE</span>
          <span className="font-semibold text-white">{incident.assignedEngineer?.name || 'Unassigned'}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 block mb-1">Incident Commander</span>
          <span className="font-semibold text-white">{incident.incidentCommander?.name || 'Admin On-Call'}</span>
        </div>
      </div>

      {/* Failure Description ("What Happened?") */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-400" /> Incident Description: What Happened?
        </h3>
        {isEditing ? (
          <textarea
            rows={4}
            value={formData.whatHappened}
            onChange={(e) => setFormData({ ...formData, whatHappened: e.target.value })}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        ) : (
          <p className="text-sm text-slate-300 leading-relaxed bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
            {incident.whatHappened}
          </p>
        )}
      </div>

      {/* Impact & Observable Symptoms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Observable Symptoms */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Observable Symptoms
          </h4>
          {isEditing ? (
            <textarea
              rows={3}
              value={formData.observableSymptoms}
              onChange={(e) => setFormData({ ...formData, observableSymptoms: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          ) : (
            <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
              {incident.observableSymptoms || 'No symptoms documented yet.'}
            </p>
          )}

          {/* Affected Services Tags */}
          {affectedServicesList.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 block mb-1.5">
                Affected Downstream Services:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {affectedServicesList.map((srv, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30"
                  >
                    {srv}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Impact Metrics */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" /> Blast Radius & Impact
          </h4>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block">Downtime Duration</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                {incident.downtimeMinutes} minutes
              </span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block">Users / Calls Affected</span>
              <span className="text-base font-bold text-white mt-0.5 block">
                {incident.usersAffected.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="text-xs space-y-2">
            <div>
              <span className="text-slate-400 font-semibold block">Business Impact:</span>
              <p className="text-slate-300 mt-0.5">{incident.businessImpact || 'N/A'}</p>
            </div>
            <div>
              <span className="text-slate-400 font-semibold block">Data Integrity Impact:</span>
              <p className="text-slate-300 mt-0.5">{incident.dataImpact || 'Zero data loss verified.'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Details & Technical Logs Snippet */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Error Details & Crash Stack
        </h4>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-2 py-0.5 rounded font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            {incident.errorCode || 'ERR_GENERAL'}
          </span>
          <span className="font-mono text-slate-300">{incident.errorMessage}</span>
        </div>
        {incident.logsSnippet && (
          <pre className="p-4 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-slate-300 overflow-x-auto whitespace-pre-wrap select-text">
            {incident.logsSnippet}
          </pre>
        )}
      </div>

      {/* Immediate Actions Taken */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-2">
          <CheckCircle2 className="w-3.5 h-3.5" /> Immediate Mitigation Actions Taken
        </h4>
        <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
          {incident.immediateActionsTaken || 'None recorded.'}
        </p>
      </div>
    </div>
  );
};
