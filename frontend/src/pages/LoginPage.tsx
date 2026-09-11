import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Mail, ArrowRight, CheckCircle2, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';

export const LoginPage: React.FC = () => {
  const { login, quickLogin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    try {
      setLoading(true);
      setError(null);
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: 'Admin' | 'SRE' | 'Developer' | 'Viewer') => {
    try {
      setLoading(true);
      setError(null);
      await quickLogin(role);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate demo user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white mx-auto shadow-xl shadow-indigo-500/25 mb-4 border border-indigo-400/30">
            <Shield className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            RollbackAudit Portal
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Software Deployment Rollback & Audit Management System
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={loading}
              className="w-full mt-2"
              icon={ArrowRight}
            >
              Sign In to Console
            </Button>
          </form>

          {/* Quick Demo Switcher */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> 1-Click Demo Evaluation Roles
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('Admin')}
                className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-indigo-500/50 hover:bg-slate-800 text-left transition-all group"
              >
                <div className="text-xs font-bold text-white group-hover:text-indigo-400">
                  Alex Vance
                </div>
                <div className="text-[10px] text-slate-400 font-mono">Role: ADMIN</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('SRE')}
                className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800 text-left transition-all group"
              >
                <div className="text-xs font-bold text-white group-hover:text-emerald-400">
                  Elena Rostova
                </div>
                <div className="text-[10px] text-slate-400 font-mono">Role: SRE</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('Developer')}
                className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800 text-left transition-all group"
              >
                <div className="text-xs font-bold text-white group-hover:text-amber-400">
                  Marcus Chen
                </div>
                <div className="text-[10px] text-slate-400 font-mono">Role: DEVELOPER</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('Viewer')}
                className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800 text-left transition-all group"
              >
                <div className="text-xs font-bold text-white group-hover:text-cyan-400">
                  Sarah Jenkins
                </div>
                <div className="text-[10px] text-slate-400 font-mono">Role: VIEWER</div>
              </button>
            </div>
          </div>
        </div>

        {/* Security & Audit notice */}
        <p className="mt-4 text-center text-xs text-slate-500">
          Immutable session logging active. All authorization actions are audit-recorded.
        </p>
      </div>
    </div>
  );
};
