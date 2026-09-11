import React, { useState } from 'react';
import { CheckCircle2, Clock, XCircle, SkipForward, Play, Plus, Edit2, Check } from 'lucide-react';
import { RollbackStep, StepStatus } from '../../types';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

interface RollbackStepListProps {
  steps: RollbackStep[];
  rollbackId: string;
  onUpdate: () => void;
}

export const RollbackStepList: React.FC<RollbackStepListProps> = ({
  steps,
  rollbackId,
  onUpdate,
}) => {
  const { canEdit } = useAuth();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);
  const [notesText, setNotesText] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleStatusChange = async (stepId: string, status: StepStatus) => {
    try {
      setUpdatingId(stepId);
      await api.put(`/rollbacks/steps/${stepId}`, { status });
      onUpdate();
    } catch (err) {
      console.error('Failed to update step status:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSaveNotes = async (stepId: string) => {
    try {
      await api.put(`/rollbacks/steps/${stepId}`, { notes: notesText });
      setEditingNotesId(null);
      onUpdate();
    } catch (err) {
      console.error('Failed to update notes:', err);
    }
  };

  const handleAddStep = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDesc.trim()) return;

    try {
      await api.post(`/rollbacks/${rollbackId}/steps`, {
        title: newTitle,
        description: newDesc,
      });
      setNewTitle('');
      setNewDesc('');
      setShowAddModal(false);
      onUpdate();
    } catch (err) {
      console.error('Failed to add step:', err);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-800">
        <div>
          <h3 className="text-sm font-semibold text-white tracking-tight">
            Rollback Execution Checklist
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Sequential disaster-recovery and rollback execution steps
          </p>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={() => setShowAddModal(!showAddModal)}
          >
            Add Step
          </Button>
        )}
      </div>

      {showAddModal && (
        <form onSubmit={handleAddStep} className="mb-6 p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-3">
          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">New Rollback Step</h4>
          <input
            type="text"
            placeholder="Step title (e.g. Flush Redis cache partition)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <textarea
            placeholder="Execution instructions or verification commands..."
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            rows={2}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" type="button" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Save Step
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {steps.map((step) => {
          const isCompleted = step.status === 'COMPLETED';
          const isInProgress = step.status === 'IN_PROGRESS';
          const isFailed = step.status === 'FAILED';
          const isSkipped = step.status === 'SKIPPED';

          return (
            <div
              key={step.id}
              className={`p-4 rounded-xl border transition-all ${
                isCompleted
                  ? 'bg-emerald-950/10 border-emerald-500/20'
                  : isInProgress
                  ? 'bg-amber-950/15 border-amber-500/30 shadow-sm'
                  : isFailed
                  ? 'bg-rose-950/15 border-rose-500/30'
                  : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-6 h-6 rounded-full font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                      isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : isInProgress
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                        : isFailed
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {step.stepNumber}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
                      {step.title}
                      <Badge status={step.status} />
                    </h4>
                    <p className="mt-1 text-xs text-slate-400">{step.description}</p>
                    {step.notes && (
                      <div className="mt-2 text-xs font-mono bg-slate-900/90 border border-slate-800 p-2 rounded text-slate-300">
                        <span className="text-indigo-400 font-semibold">Note:</span> {step.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Status Action Buttons */}
                {canEdit && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isCompleted && (
                      <button
                        onClick={() => handleStatusChange(step.id, 'COMPLETED')}
                        title="Mark Completed"
                        disabled={updatingId === step.id}
                        className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Done
                      </button>
                    )}
                    {!isInProgress && !isCompleted && (
                      <button
                        onClick={() => handleStatusChange(step.id, 'IN_PROGRESS')}
                        title="Mark In Progress"
                        disabled={updatingId === step.id}
                        className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" /> Start
                      </button>
                    )}
                    {!isSkipped && !isCompleted && (
                      <button
                        onClick={() => handleStatusChange(step.id, 'SKIPPED')}
                        title="Skip step"
                        disabled={updatingId === step.id}
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-xs font-medium transition-colors"
                      >
                        Skip
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingNotesId(step.id);
                        setNotesText(step.notes || '');
                      }}
                      title="Add note"
                      className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Note inline editing */}
              {editingNotesId === step.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Add execution note..."
                    className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                  <Button size="sm" variant="primary" onClick={() => handleSaveNotes(step.id)}>
                    <Check className="w-3.5 h-3.5" /> Save
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingNotesId(null)}>
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
