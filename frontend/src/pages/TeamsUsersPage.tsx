import React, { useEffect, useState } from 'react';
import {
  Users,
  Shield,
  Layers,
  Server,
  UserCheck,
  UserX,
  Plus,
} from 'lucide-react';
import { api } from '../api/client';
import { Team, User } from '../types';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { TableSkeleton } from '../components/common/LoadingSkeleton';
import { useAuth } from '../context/AuthContext';

export const TeamsUsersPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'teams' | 'users'>('teams');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsRes, usersRes] = await Promise.all([
        api.get<Team[]>('/teams'),
        api.get<User[]>('/users'),
      ]);
      setTeams(teamsRes || []);
      setUsers(usersRes || []);
    } catch (err) {
      console.error('Failed to load teams/users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userObj: User) => {
    try {
      const newStatus = userObj.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await api.put(`/users/${userObj.id}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" /> Engineering Teams & Access Control
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organization squads, service ownership mappings, and role-based access permissions
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs">
          <button
            onClick={() => setActiveTab('teams')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'teams'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Squads & Teams ({teams.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
              activeTab === 'users'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Organization Users ({users.length})
          </button>
        </div>
      </div>

      {loading ? (
        <TableSkeleton rows={6} />
      ) : activeTab === 'teams' ? (
        /* Teams Grid */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div
              key={team.id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col justify-between shadow-sm hover:border-slate-700 transition-all"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">{team.name}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {team.members?.length || 0} Members
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">{team.description}</p>

                <div className="space-y-3 pt-3 border-t border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-500 font-semibold block mb-0.5">Team Lead:</span>
                    <span className="text-slate-200 font-medium">{team.lead?.name || 'Unassigned'}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 font-semibold block mb-1.5">
                      Services Owned:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {team.applications?.length > 0 ? (
                        team.applications.map((app) => (
                          <span
                            key={app.id}
                            className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/30"
                          >
                            {app.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">No services linked</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Users Table */
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Member Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Assigned Team</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Access Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3.5 font-medium text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-indigo-400">
                        {u.name.charAt(0)}
                      </div>
                      {u.name}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-slate-400">{u.email}</td>
                    <td className="px-4 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">{u.team?.name || 'Platform Shared'}</td>
                    <td className="px-4 py-3.5">
                      <Badge status={u.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {isAdmin && (
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                            u.status === 'ACTIVE'
                              ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30'
                              : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/30'
                          }`}
                        >
                          {u.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
