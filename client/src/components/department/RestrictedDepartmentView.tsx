import React, { useState } from 'react';
import { Team, UserTeamAccessResult } from '../../types';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Lock,
  ShieldAlert,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Users,
  Sparkles
} from 'lucide-react';

interface RestrictedDepartmentViewProps {
  team: {
    id: string;
    name: string;
    department?: string | null;
    description?: string | null;
    manager?: {
      id: string;
      name: string;
      email: string;
      avatar?: string | null;
    } | null;
  } | null;
  userAccess?: UserTeamAccessResult;
  onAccessRequested?: () => void;
}

export const RestrictedDepartmentView: React.FC<RestrictedDepartmentViewProps> = ({
  team,
  userAccess,
  onAccessRequested
}) => {
  const { showToast } = useToast();
  const [durationHours, setDurationHours] = useState<number>(24);
  const [reason, setReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [showRequestForm, setShowRequestForm] = useState<boolean>(false);

  const pendingRequest = userAccess?.pendingRequest;

  const handleRequestAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!team?.id) return;

    setSubmitting(true);
    try {
      const res = await api.post(`/teams/${team.id}/request-access`, {
        reason: reason.trim() || undefined,
        durationHours
      });
      showToast(res.data.message || 'Access request submitted successfully!', 'success');
      setShowRequestForm(false);
      setReason('');
      if (onAccessRequested) onAccessRequested();
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Failed to submit department access request.',
        'error'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto my-8 p-8 rounded-3xl glass-panel border border-slate-200/80 dark:border-white/10 shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 mx-auto rounded-3xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 shadow-xl shadow-rose-500/10">
        <Lock className="w-8 h-8" />
      </div>

      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 mb-3">
          <ShieldAlert className="w-3.5 h-3.5" />
          Department Access Restricted
        </div>

        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {team?.name || 'Department'} Standups are Private
        </h2>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
          Daily standups, blockers, and sprint logs for this department are confidential to its
          direct team members, department head, and company leadership.
        </p>
      </div>

      {/* Team Details Pill */}
      {team && (
        <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">{team.name}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {team.description || 'Company Department'}
              </div>
            </div>
          </div>

          {team.manager && (
            <div className="text-xs text-slate-500 dark:text-slate-400 sm:text-right">
              <span className="block text-[10px] uppercase font-bold text-slate-400">Department Lead</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{team.manager.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Pending Request Status Badge */}
      {pendingRequest ? (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-amber-500 shrink-0 animate-pulse" />
            <div className="text-left">
              <div className="font-bold">Access Request Pending Approval</div>
              <div className="text-[11px] text-amber-600/80 dark:text-amber-300/80">
                Requested {pendingRequest.durationHours}h clearance. Awaiting approval from the Department Head or Admin.
              </div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-amber-500/20 text-amber-800 dark:text-amber-200 uppercase tracking-wider shrink-0">
            In Review
          </span>
        </div>
      ) : !showRequestForm ? (
        <div className="pt-2">
          <button
            onClick={() => setShowRequestForm(true)}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 mx-auto shadow-lg shadow-blue-500/25 transition hover:scale-105"
          >
            <Send className="w-4 h-4" />
            <span>Request Temporary Access Pass</span>
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleRequestAccess}
          className="p-5 rounded-2xl glass-card border border-blue-500/30 text-left space-y-4 animate-in fade-in slide-in-from-top-3"
        >
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-2.5">
            <h3 className="text-xs font-extrabold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              Request Temporary Cross-Department Pass
            </h3>
            <button
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Select Pass Duration
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { hours: 24, label: '24 Hours', sub: 'Quick Sync' },
                { hours: 72, label: '3 Days', sub: 'Feature Sprint' },
                { hours: 168, label: '7 Days', sub: 'Cross-Team Collab' }
              ].map((d) => (
                <button
                  key={d.hours}
                  type="button"
                  onClick={() => setDurationHours(d.hours)}
                  className={`p-2.5 rounded-xl text-left border transition ${
                    durationHours === d.hours
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold'
                      : 'border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className="text-xs font-extrabold">{d.label}</div>
                  <div className="text-[10px] text-slate-400">{d.sub}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Collaboration Reason / Note (optional)
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Need to coordinate on the Auth API integration for Q3..."
              className="glass-input w-full text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRequestForm(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Submitting...' : 'Send Access Request'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
