import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { DepartmentAccessRequest, Team } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  UserPlus,
  RefreshCw,
  AlertCircle,
  Building2,
  Trash2,
  Send,
  Lock,
  Layers
} from 'lucide-react';

interface AccessRequestsPanelProps {
  teams: Team[];
  onUpdated?: () => void;
}

export const AccessRequestsPanel: React.FC<AccessRequestsPanelProps> = ({
  teams,
  onUpdated
}) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState<boolean>(true);
  const [incomingRequests, setIncomingRequests] = useState<DepartmentAccessRequest[]>([]);
  const [myRequests, setMyRequests] = useState<DepartmentAccessRequest[]>([]);
  const [activeGrants, setActiveGrants] = useState<DepartmentAccessRequest[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Direct Grant modal state
  const [showDirectModal, setShowDirectModal] = useState<boolean>(false);
  const [directTeamId, setDirectTeamId] = useState<string>('');
  const [directUserId, setDirectUserId] = useState<string>('');
  const [directDuration, setDirectDuration] = useState<number>(24);
  const [directReason, setDirectReason] = useState<string>('');
  const [directSaving, setDirectSaving] = useState<boolean>(false);

  const isLeaderOrAdmin =
    user?.role === 'ADMIN' ||
    user?.role === 'MANAGER' ||
    teams.some((t) => t.managerId === user?.id);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/teams/access-requests');
      setIncomingRequests(res.data.incomingRequests || []);
      setMyRequests(res.data.myRequests || []);
      setActiveGrants(res.data.activeGrants || []);
    } catch (err) {
      console.error('Error fetching access requests', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
    if (teams.length > 0 && !directTeamId) {
      setDirectTeamId(teams[0].id);
    }
  }, [fetchRequests, teams, directTeamId]);

  const handleApprove = async (requestId: string, hours: number) => {
    setActionLoading(requestId);
    try {
      const res = await api.post(`/teams/access-requests/${requestId}/approve`, {
        durationHours: hours
      });
      showToast(res.data.message || 'Access granted!', 'success');
      await fetchRequests();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to approve request.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const res = await api.post(`/teams/access-requests/${requestId}/reject`);
      showToast('Access request declined.', 'info');
      await fetchRequests();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to reject request.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevoke = async (grantId: string) => {
    setActionLoading(grantId);
    try {
      await api.post(`/teams/access-requests/${grantId}/revoke`);
      showToast('Access pass revoked.', 'info');
      await fetchRequests();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to revoke access.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleGrantDirect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directTeamId || !directUserId) {
      showToast('Please select a department and team member.', 'error');
      return;
    }

    setDirectSaving(true);
    try {
      const res = await api.post(`/teams/${directTeamId}/grant-access`, {
        userId: directUserId,
        durationHours: directDuration,
        reason: directReason.trim() || undefined
      });
      showToast(res.data.message || 'Direct access pass issued!', 'success');
      setShowDirectModal(false);
      setDirectReason('');
      await fetchRequests();
      if (onUpdated) onUpdated();
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to grant access.', 'error');
    } finally {
      setDirectSaving(false);
    }
  };

  // Collect all company employees across teams to pick from in direct grant
  const allEmployees = Array.from(
    new Map(
      teams
        .flatMap((t) => (t.members || []).map((m) => m.user))
        .filter((u) => u && u.id !== user?.id)
        .map((u) => [u.id, u])
    ).values()
  );

  return (
    <div className="space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            Cross-Department Access Governance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Review incoming collaboration requests, monitor active temporary passes, and issue direct clearance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRequests}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          {isLeaderOrAdmin && (
            <button
              onClick={() => setShowDirectModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-indigo-500/20"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Issue Direct Pass</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Incoming Requests (For Leads & Admins) */}
      {isLeaderOrAdmin && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span>Pending Requests ({incomingRequests.length})</span>
            </h3>
          </div>

          {incomingRequests.length === 0 ? (
            <div className="p-6 rounded-2xl glass-card border border-slate-200/80 dark:border-white/10 text-center text-xs text-slate-400">
              No pending department access requests to review.
            </div>
          ) : (
            <div className="space-y-3">
              {incomingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl glass-panel border border-amber-500/30 bg-amber-50/10 dark:bg-amber-950/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={
                        req.user?.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                          req.user?.name || 'User'
                        )}`
                      }
                      alt={req.user?.name}
                      className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-amber-500/50 p-0.5"
                    />
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{req.user?.name}</span>
                        {req.user?.employeeId && (
                          <span className="text-[10px] font-mono text-slate-400">
                            {req.user.employeeId}
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          {req.durationHours}h Pass
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Target: <span className="font-bold text-slate-700 dark:text-slate-200">{req.team.name}</span>
                        {req.reason && <span> • Reason: &ldquo;{req.reason}&rdquo;</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleReject(req.id)}
                      disabled={actionLoading === req.id}
                      className="px-3 py-1.5 rounded-xl border border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold flex items-center gap-1 transition"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>

                    <button
                      onClick={() => handleApprove(req.id, req.durationHours)}
                      disabled={actionLoading === req.id}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve ({req.durationHours}h)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 2. Active Temporary Access Grants */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Active Temporary Access Passes ({activeGrants.length})</span>
          </h3>
        </div>

        {activeGrants.length === 0 ? (
          <div className="p-6 rounded-2xl glass-card border border-slate-200/80 dark:border-white/10 text-center text-xs text-slate-400">
            No active temporary passes at this moment.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeGrants.map((grant) => {
              const remainingHours = grant.expiresAt
                ? Math.max(
                    0,
                    Math.round((new Date(grant.expiresAt).getTime() - Date.now()) / (1000 * 3600))
                  )
                : null;

              return (
                <div
                  key={grant.id}
                  className="p-3.5 rounded-xl glass-panel border border-emerald-500/20 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={
                        grant.user?.avatar ||
                        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                          grant.user?.name || 'User'
                        )}`
                      }
                      alt={grant.user?.name}
                      className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 border border-emerald-500/40 p-0.5 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                        <span>{grant.user?.name}</span>
                        <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          → {grant.team.name}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                        <Clock className="w-3 h-3 text-emerald-500" />
                        <span>
                          {remainingHours !== null ? `${remainingHours}h remaining` : 'Permanent'}
                        </span>
                        {grant.grantedBy && <span>• by {grant.grantedBy.name}</span>}
                      </div>
                    </div>
                  </div>

                  {isLeaderOrAdmin && (
                    <button
                      onClick={() => handleRevoke(grant.id)}
                      disabled={actionLoading === grant.id}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition shrink-0"
                      title="Revoke access immediately"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. My Own Sent Requests */}
      <div className="space-y-3">
        <h3 className="text-xs font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5 text-blue-500" />
          <span>My Access Requests ({myRequests.length})</span>
        </h3>

        {myRequests.length === 0 ? (
          <div className="p-4 rounded-xl glass-card border border-slate-200/80 dark:border-white/10 text-center text-xs text-slate-400">
            You haven't requested cross-department access recently.
          </div>
        ) : (
          <div className="space-y-2">
            {myRequests.map((req) => (
              <div
                key={req.id}
                className="p-3 rounded-xl glass-card border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-slate-900 dark:text-white">
                    Department: {req.team.name}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Duration: {req.durationHours}h {req.reason && `• "${req.reason}"`}
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase ${
                    req.status === 'APPROVED'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : req.status === 'REJECTED'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {req.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Direct Pass Issuance Modal */}
      {showDirectModal && (
        <div
          className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div className="w-full max-w-md glass-panel rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-indigo-500" />
                  Issue Direct Department Pass
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Grant a colleague immediate temporary clearance to view your department standups.
                </p>
              </div>
              <button
                onClick={() => setShowDirectModal(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGrantDirect} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Target Department
                </label>
                <select
                  value={directTeamId}
                  onChange={(e) => setDirectTeamId(e.target.value)}
                  className="glass-input w-full cursor-pointer text-xs"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Select Team Member
                </label>
                <select
                  value={directUserId}
                  onChange={(e) => setDirectUserId(e.target.value)}
                  className="glass-input w-full cursor-pointer text-xs"
                  required
                >
                  <option value="">-- Choose Employee --</option>
                  {allEmployees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Duration
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { h: 24, l: '24 Hours' },
                    { h: 72, l: '3 Days' },
                    { h: 168, l: '7 Days' }
                  ].map((item) => (
                    <button
                      key={item.h}
                      type="button"
                      onClick={() => setDirectDuration(item.h)}
                      className={`p-2 rounded-xl text-center text-xs font-bold border transition ${
                        directDuration === item.h
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-slate-50 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                      }`}
                    >
                      {item.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Clearance Note (optional)
                </label>
                <input
                  type="text"
                  value={directReason}
                  onChange={(e) => setDirectReason(e.target.value)}
                  placeholder="e.g. Cross-functional sprint alignment"
                  className="glass-input w-full text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDirectModal(false)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={directSaving}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50"
                >
                  {directSaving ? 'Granting...' : 'Grant Temporary Access'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
