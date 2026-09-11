import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertOctagon,
  MessageSquare,
} from 'lucide-react';
import { api } from '../api/client';
import { PostMortem, PostMortemStatus, RootCauseCategory } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { EmptyState } from '../components/common/EmptyState';
import { formatDate } from '../../src/utils/formatters';
import { useAuth } from '../context/AuthContext';

export const PostMortemsPage: React.FC = () => {
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const [postMortems, setPostMortems] = useState<PostMortem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [rootCauseCategory, setRootCauseCategory] = useState('ALL');

  useEffect(() => {
    fetchPostMortems();
  }, [search, status, rootCauseCategory]);

  const fetchPostMortems = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (status !== 'ALL') params.set('status', status);
      if (rootCauseCategory !== 'ALL') params.set('rootCauseCategory', rootCauseCategory);

      const res = await api.get<PostMortem[]>(`/postmortems?${params.toString()}`);
      setPostMortems(res || []);
    } catch (err) {
      console.error('Failed to load post-mortems:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" /> Root-Cause Analysis / Post-Mortems
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Documented failure retrospectives, 5-Whys analysis, and preventive action registers ({postMortems.length} total)
          </p>
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
            placeholder="Search post-mortem title, root cause, or summary..."
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            aria-label="Filter by Post-Mortem Status"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Review Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="UNDER_REVIEW">Under Review</option>
            <option value="APPROVED">Approved</option>
            <option value="CLOSED">Closed</option>
          </select>

          {/* Root Cause Category */}
          <select
            value={rootCauseCategory}
            onChange={(e) => setRootCauseCategory(e.target.value)}
            aria-label="Filter by Root Cause Category"
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Root Causes</option>
            <option value="DATABASE">Database</option>
            <option value="CONFIGURATION">Configuration</option>
            <option value="CODE_DEFECT">Code Defect</option>
            <option value="INFRASTRUCTURE">Infrastructure</option>
            <option value="DEPENDENCY">Dependency</option>
            <option value="PIPELINE">CI/CD Pipeline</option>
          </select>
        </div>
      </div>

      {/* Post-Mortem Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-6">
            <TableSkeleton rows={5} />
          </div>
        ) : postMortems.length === 0 ? (
          <EmptyState
            title="No post-mortems found"
            description="No post-mortems match the selected criteria."
            icon={FileText}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Post-Mortem ID</th>
                  <th className="px-4 py-3">Incident / Dep ID</th>
                  <th className="px-4 py-3">Document Title</th>
                  <th className="px-4 py-3">Root Cause</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Review Status</th>
                  <th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Actions Count</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {postMortems.map((pm) => (
                  <tr
                    key={pm.id}
                    onClick={() => navigate(`/postmortems/${pm.id}`)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3.5 font-mono font-bold text-amber-400">
                      {pm.id}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-400">
                      {pm.incidentId || pm.deploymentId || '—'}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-white max-w-xs truncate">
                      {pm.title}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-indigo-300 border border-slate-700">
                        {pm.rootCauseCategory.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge severity={pm.severity} />
                    </td>
                    <td className="px-4 py-3.5">
                      <Badge status={pm.status} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {pm.author?.name}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-slate-300">
                        {pm.correctiveActions?.length || 0} items
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/postmortems/${pm.id}`);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      >
                        Read
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
