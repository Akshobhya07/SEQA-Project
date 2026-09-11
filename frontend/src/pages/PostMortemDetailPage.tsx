import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Clock,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Users,
  ShieldCheck,
  Send,
  Plus,
  Edit2,
  Save,
  MessageSquare,
  Check,
} from 'lucide-react';
import { api } from '../api/client';
import { PostMortem, FiveWhysItem, TimelineEvent, PostMortemStatus } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { FiveWhysEditor } from '../components/postmortem/FiveWhysEditor';
import { formatDate } from '../../src/utils/formatters';
import { useAuth } from '../context/AuthContext';

export const PostMortemDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { canEdit, user } = useAuth();
  const navigate = useNavigate();

  const [pm, setPm] = useState<PostMortem | null>(null);
  const [loading, setLoading] = useState(true);

  // Comments state
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [statusVal, setStatusVal] = useState<PostMortemStatus>('DRAFT');
  const [fiveWhysList, setFiveWhysList] = useState<FiveWhysItem[]>([]);
  const [whatWentWell, setWhatWentWell] = useState('');
  const [whatWentWrong, setWhatWentWrong] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');

  useEffect(() => {
    fetchPostMortem();
  }, [id]);

  const fetchPostMortem = async () => {
    try {
      setLoading(true);
      const res = await api.get<PostMortem>(`/postmortems/${id}`);
      setPm(res);
      setStatusVal(res.status);
      setWhatWentWell(res.whatWentWell || '');
      setWhatWentWrong(res.whatWentWrong || '');
      setLessonsLearned(res.lessonsLearned || '');

      if (res.fiveWhys) {
        try {
          setFiveWhysList(JSON.parse(res.fiveWhys));
        } catch {
          setFiveWhysList(getDefaultFiveWhys());
        }
      } else {
        setFiveWhysList(getDefaultFiveWhys());
      }
    } catch (err) {
      console.error('Failed to load post-mortem:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultFiveWhys = (): FiveWhysItem[] => [
    { step: 1, question: 'Why did the deployment fail?', answer: '' },
    { step: 2, question: 'Why did that happen?', answer: '' },
    { step: 3, question: 'Why did that happen?', answer: '' },
    { step: 4, question: 'Why did that happen?', answer: '' },
    { step: 5, question: 'Why did that happen?', answer: '' },
  ];

  const handleSave = async () => {
    try {
      await api.put(`/postmortems/${pm?.id}`, {
        status: statusVal,
        fiveWhys: fiveWhysList,
        whatWentWell,
        whatWentWrong,
        lessonsLearned,
      });
      setIsEditing(false);
      fetchPostMortem();
    } catch (err) {
      console.error('Failed to save post-mortem:', err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setSubmittingComment(true);
      await api.post(`/postmortems/${pm?.id}/comments`, { content: newComment });
      setNewComment('');
      fetchPostMortem();
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  if (loading || !pm) {
    return (
      <div className="space-y-6">
        <div className="h-6 bg-slate-800 rounded w-48 animate-pulse" />
        <div className="h-96 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  const timelineEvents: TimelineEvent[] = pm.incidentTimeline
    ? JSON.parse(pm.incidentTimeline)
    : [];

  const impactData = pm.impactAnalysis ? JSON.parse(pm.impactAnalysis) : null;
  const contributingFactorsList: string[] = pm.contributingFactors
    ? JSON.parse(pm.contributingFactors)
    : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/postmortems')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Post-Mortems
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-white font-mono flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-400" />
              {pm.id}
            </h2>
            <Badge status={pm.status} />
            <Badge severity={pm.severity} />
          </div>
          <h3 className="text-base font-semibold text-slate-100 mt-1">{pm.title}</h3>
        </div>

        {/* Action Triggers */}
        <div className="flex items-center gap-2.5">
          {canEdit && (
            isEditing ? (
              <Button variant="primary" size="sm" icon={Save} onClick={handleSave}>
                Save Changes
              </Button>
            ) : (
              <Button variant="outline" size="sm" icon={Edit2} onClick={() => setIsEditing(true)}>
                Edit Retrospective
              </Button>
            )
          )}

          {pm.deploymentId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/deployments/${pm.deploymentId}`)}
            >
              Deployment ({pm.deploymentId})
            </Button>
          )}

          {pm.incidentId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/failures/${pm.incidentId}`)}
            >
              Incident Record ({pm.incidentId})
            </Button>
          )}
        </div>
      </div>

      {/* Review Status Selector (when editing) */}
      {isEditing && (
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Lifecycle Review Status
          </span>
          <select
            value={statusVal}
            onChange={(e) => setStatusVal(e.target.value as PostMortemStatus)}
            aria-label="Lifecycle Review Status"
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="DRAFT">Draft</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved (Official Organ Record)</option>
            <option value="CLOSED">Closed (All Actions Completed)</option>
          </select>
        </div>
      )}

      {/* Metadata Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 block mb-1">Author / Lead Investigator</span>
          <span className="font-semibold text-white">{pm.author?.name}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 block mb-1">Primary Root Cause Category</span>
          <span className="font-mono text-indigo-400 font-bold">
            {pm.rootCauseCategory.replace(/_/g, ' ')}
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 block mb-1">Corrective Actions Count</span>
          <span className="font-mono font-bold text-white">
            {pm.correctiveActions?.length || 0} Action Items
          </span>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <span className="text-slate-400 block mb-1">Date Created</span>
          <span className="font-mono text-slate-300">{formatDate(pm.createdAt)}</span>
        </div>
      </div>

      {/* Executive Summary */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Executive Summary
        </h4>
        <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-4 rounded-lg border border-slate-800/80">
          {pm.executiveSummary}
        </p>
      </div>

      {/* Incident Timeline */}
      {timelineEvents.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Incident Event Timeline
          </h4>
          <div className="relative pl-6 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {timelineEvents.map((item, idx) => (
              <div key={idx} className="relative flex items-start gap-3">
                <span className="absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 border border-slate-900" />
                <div className="bg-slate-950/60 border border-slate-800/80 rounded p-2.5 flex-1 text-xs">
                  <div className="flex items-center justify-between text-slate-400 mb-0.5">
                    <span className="font-mono text-indigo-300 font-bold">{item.time}</span>
                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.2 rounded text-slate-300">
                      {item.actor}
                    </span>
                  </div>
                  <p className="text-slate-200">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Impact Analysis Cards */}
      {impactData && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
            <Users className="w-4 h-4" /> Comprehensive Impact Analysis
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block mb-1">Outage Duration</span>
              <span className="font-bold text-white text-sm">{impactData.duration}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block mb-1">Users Affected</span>
              <span className="font-bold text-white text-sm">{impactData.usersAffected}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block mb-1">Revenue Impact</span>
              <span className="font-bold text-white text-sm">{impactData.revenueImpact}</span>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <span className="text-slate-400 block mb-1">Data Impact</span>
              <span className="font-bold text-white text-sm">{impactData.dataImpact}</span>
            </div>
          </div>
        </div>
      )}

      {/* Root Cause Technical Detail */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
          Root Cause Detail
        </h4>
        <p className="text-sm text-slate-200 leading-relaxed bg-slate-950/40 p-4 rounded-lg border border-slate-800/80 font-mono">
          {pm.rootCauseDetail}
        </p>
      </div>

      {/* Interactive 5-Whys Flowchart */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-400" /> Five Whys Root Cause Chain
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Interactively trace causal dependencies leading to the deployment failure
          </p>
        </div>
        <FiveWhysEditor
          items={fiveWhysList}
          onChange={setFiveWhysList}
          readOnly={!isEditing}
        />
      </div>

      {/* Contributing Factors */}
      {contributingFactorsList.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Contributing Factors
          </h4>
          <ul className="space-y-1.5 text-xs text-slate-300">
            {contributingFactorsList.map((factor, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-indigo-400 font-bold">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Retrospective Triad: What Went Well, What Went Wrong, Lessons Learned */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> What Went Well
          </h4>
          {isEditing ? (
            <textarea
              rows={4}
              value={whatWentWell}
              onChange={(e) => setWhatWentWell(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white"
            />
          ) : (
            <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
              {pm.whatWentWell || '—'}
            </p>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> What Went Wrong
          </h4>
          {isEditing ? (
            <textarea
              rows={4}
              value={whatWentWrong}
              onChange={(e) => setWhatWentWrong(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white"
            />
          ) : (
            <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
              {pm.whatWentWrong || '—'}
            </p>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" /> Lessons Learned
          </h4>
          {isEditing ? (
            <textarea
              rows={4}
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-white"
            />
          ) : (
            <p className="text-xs text-slate-300 bg-slate-950/40 p-3 rounded-lg border border-slate-800/80">
              {pm.lessonsLearned || '—'}
            </p>
          )}
        </div>
      </div>

      {/* Corrective Actions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-sm font-semibold text-white tracking-tight">
              Action Items & Remediation Plans
            </h4>
            <p className="text-xs text-slate-400 mt-0.5">
              Preventive items tracked to ensure this failure mode cannot recur
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/actions')}
          >
            Manage Action Register →
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold border-b border-slate-800">
              <tr>
                <th className="px-3 py-2.5">Action ID</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Priority</th>
                <th className="px-3 py-2.5">Owner</th>
                <th className="px-3 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {pm.correctiveActions?.map((act) => (
                <tr key={act.id} className="hover:bg-slate-800/30">
                  <td className="px-3 py-2.5 font-mono font-bold text-indigo-400">
                    {act.id}
                  </td>
                  <td className="px-3 py-2.5 text-white max-w-sm">{act.description}</td>
                  <td className="px-3 py-2.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {act.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge severity={act.priority.replace('P0_CRITICAL', 'SEV_1_CRITICAL').replace('P1_HIGH', 'SEV_2_HIGH').replace('P2_MEDIUM', 'SEV_3_MEDIUM').replace('P3_LOW', 'SEV_4_LOW')} />
                  </td>
                  <td className="px-3 py-2.5">{act.owner?.name}</td>
                  <td className="px-3 py-2.5">
                    <Badge status={act.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Discussion & Collaboration Comments */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-indigo-400" /> SRE Engineering Comments & Review Notes
        </h4>

        <div className="space-y-3">
          {pm.comments?.map((c) => (
            <div key={c.id} className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{c.author?.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 rounded text-indigo-300">
                    {c.author?.role}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {formatDate(c.createdAt)}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{c.content}</p>
            </div>
          ))}
        </div>

        {/* New Comment Input */}
        {canEdit && (
          <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              placeholder="Add post-mortem technical review feedback..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
            />
            <Button variant="primary" size="sm" type="submit" loading={submittingComment} icon={Send}>
              Post
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
