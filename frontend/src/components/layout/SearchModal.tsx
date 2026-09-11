import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Rocket, AlertOctagon, RotateCcw, FileText, Box, ArrowRight, X } from 'lucide-react';
import { api } from '../../api/client';
import { Badge } from '../common/Badge';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>({
    deployments: [],
    incidents: [],
    rollbacks: [],
    postMortems: [],
    applications: [],
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (isOpen) onClose();
        else setQuery('');
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ deployments: [], incidents: [], rollbacks: [], postMortems: [], applications: [] });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const data = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const navigateTo = (path: string) => {
    navigate(path);
    onClose();
  };

  const hasResults =
    results.deployments?.length > 0 ||
    results.incidents?.length > 0 ||
    results.rollbacks?.length > 0 ||
    results.postMortems?.length > 0 ||
    results.applications?.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4">
      <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-900/90">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search deployments, rollbacks, incidents, post-mortems, commit SHAs..."
            className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800 rounded border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div className="max-h-[60vh] overflow-y-auto p-3 space-y-4">
          {loading && (
            <div className="py-8 text-center text-sm text-slate-400 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              Searching across systems...
            </div>
          )}

          {!loading && query && !hasResults && (
            <div className="py-12 text-center text-sm text-slate-400">
              No matching records found for "{query}".
            </div>
          )}

          {!query && (
            <div className="py-8 text-center text-xs text-slate-400">
              Type deployment ID (e.g. <span className="font-mono text-indigo-400">DEP-2026-000124</span>), incident ID (<span className="font-mono text-rose-400">INC-2026-000041</span>), rollback (<span className="font-mono text-purple-400">RB-</span>), or service name.
            </div>
          )}

          {/* Deployments Section */}
          {results.deployments?.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Rocket className="w-3.5 h-3.5 text-indigo-400" /> Deployments
              </div>
              <div className="space-y-1 mt-1">
                {results.deployments.map((d: any) => (
                  <button
                    key={d.id}
                    onClick={() => navigateTo(`/deployments/${d.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800/80 transition-colors text-left group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-indigo-300">{d.id}</span>
                        <span className="text-xs font-medium text-white">{d.serviceName}</span>
                        <span className="text-xs text-slate-400">({d.version})</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-md">{d.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge status={d.status} />
                      <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Incidents Section */}
          {results.incidents?.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5" /> Failures / Incidents
              </div>
              <div className="space-y-1 mt-1">
                {results.incidents.map((i: any) => (
                  <button
                    key={i.id}
                    onClick={() => navigateTo(`/failures/${i.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800/80 transition-colors text-left group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-rose-400">{i.id}</span>
                        <Badge severity={i.severity} />
                      </div>
                      <p className="text-xs text-slate-300 truncate max-w-md mt-0.5">{i.failureReason}</p>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Rollbacks Section */}
          {results.rollbacks?.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Rollback Records
              </div>
              <div className="space-y-1 mt-1">
                {results.rollbacks.map((r: any) => (
                  <button
                    key={r.id}
                    onClick={() => navigateTo(`/rollbacks/${r.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800/80 transition-colors text-left group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-purple-400">{r.id}</span>
                        <span className="text-xs text-slate-300">
                          {r.failedVersion} → <span className="text-emerald-400 font-semibold">{r.restoredVersion}</span>
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">{r.reason}</p>
                    </div>
                    <Badge status={r.status} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Post-Mortems Section */}
          {results.postMortems?.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Post-Mortems
              </div>
              <div className="space-y-1 mt-1">
                {results.postMortems.map((p: any) => (
                  <button
                    key={p.id}
                    onClick={() => navigateTo(`/postmortems/${p.id}`)}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800/80 transition-colors text-left group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-amber-400">{p.id}</span>
                        <span className="text-xs font-semibold text-white truncate max-w-md">{p.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-md mt-0.5">{p.executiveSummary}</p>
                    </div>
                    <Badge status={p.status} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
