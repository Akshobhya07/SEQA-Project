import React from 'react';
import { Settings, Shield, Key, Database, Server, UserCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-400" /> Platform System Settings
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          System audit policies, database cluster configurations, and authentication credentials
        </p>
      </div>

      {/* Demo Credentials Cheatsheet */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-400" /> Development Demo Credentials
        </h3>
        <p className="text-xs text-slate-400">
          Use these pre-seeded development credentials to test different organizational roles and permissions:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono">
            <span className="text-indigo-400 font-bold block mb-1">Admin Role:</span>
            <p className="text-white">admin@example.com</p>
            <p className="text-slate-400">Admin@123</p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono">
            <span className="text-emerald-400 font-bold block mb-1">DevOps / SRE Role:</span>
            <p className="text-white">sre@example.com</p>
            <p className="text-slate-400">Sre@123</p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono">
            <span className="text-amber-400 font-bold block mb-1">Developer Role:</span>
            <p className="text-white">developer@example.com</p>
            <p className="text-slate-400">Developer@123</p>
          </div>

          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono">
            <span className="text-cyan-400 font-bold block mb-1">Viewer (Read-Only):</span>
            <p className="text-white">viewer@example.com</p>
            <p className="text-slate-400">Viewer@123</p>
          </div>
        </div>
      </div>

      {/* Database Cluster Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-3 text-xs">
        <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
          <Database className="w-4 h-4 text-emerald-400" /> Database & ORM Architecture
        </h3>
        <div className="space-y-2 text-slate-300">
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/60 border border-slate-800">
            <span>Database Engine:</span>
            <span className="font-mono text-white font-bold">PostgreSQL 18.0 (Managed Cluster)</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/60 border border-slate-800">
            <span>ORM Layer:</span>
            <span className="font-mono text-white font-bold">Prisma ORM v5.22.0</span>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded bg-slate-950/60 border border-slate-800">
            <span>Audit Immutability Policy:</span>
            <span className="font-mono text-emerald-400 font-bold">STRICT_APPEND_ONLY (Enforced)</span>
          </div>
        </div>
      </div>

      {/* Current Session Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-xs space-y-2">
        <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-purple-400" /> Current Session State
        </h3>
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-slate-300 space-y-1">
          <p><span className="text-slate-500">Authenticated User:</span> {user?.name} ({user?.email})</p>
          <p><span className="text-slate-500">Granted Role:</span> {user?.role}</p>
          <p><span className="text-slate-500">Assigned Squad:</span> {user?.team?.name || 'Unassigned'}</p>
        </div>
      </div>
    </div>
  );
};
