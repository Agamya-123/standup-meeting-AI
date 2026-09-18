import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { DailyStandup, TeamMemberFeedItem } from '../types';
import { TeamUpdateCard } from '../components/dashboard/TeamUpdateCard';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Users,
  Sparkles,
  ShieldAlert,
  RefreshCw,
  Flame,
  Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

export const MemberOverview: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const firstName = user?.name.split(' ')[0] || 'Team Member';

  const [todayStandup, setTodayStandup] = useState<DailyStandup | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [teamFeed, setTeamFeed] = useState<TeamMemberFeedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const fetchOverviewData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      // Fetch user's own today standup status
      const standupRes = await api.get('/standups/today');
      setSubmitted(standupRes.data.submitted);
      setTodayStandup(standupRes.data.standup);

      // Fetch team updates so member can see peer progress
      const teamsRes = await api.get('/teams');
      const firstTeam = teamsRes.data.teams?.[0];

      if (firstTeam) {
        const dashRes = await api.get(`/manager/dashboard?teamId=${firstTeam.id}`);
        setTeamFeed(dashRes.data.teamMembersFeed || []);
      }
    } catch (err) {
      console.error('Error fetching member overview data', err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await fetchOverviewData(true);
    setIsRefreshing(false);
    showToast('Teammate updates synced!', 'success', 'Live Feed');
  };

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-slate-400">
        <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Loading Member Overview...
        </p>
      </div>
    );
  }

  // Filter out current user from peer feed or keep all peers
  const peerFeed = teamFeed.filter((item) => item.user.id !== user?.id);
  const activeBlockersCount = teamFeed.filter((item) => item.blockerLevel !== 'NONE').length;
  const submittedPeersCount = teamFeed.filter((i) => i.hasSubmitted).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Greeting & Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Welcome back, {firstName} 👋
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              DEVELOPER HUB
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Track your standup submission and sync with your engineering teammates in real time.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Fast Refresh'}</span>
          </button>

          <Link
            to="/standup"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-md shadow-blue-500/20"
          >
            <span>{submitted ? 'Edit Daily Standup' : 'Submit Today\'s Standup'}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Member Personal Standup Status Glass Card */}
      <div
        className={`p-5 sm:p-6 rounded-2xl glass-card border transition-all ${
          submitted
            ? todayStandup?.blockerLevel === 'CRITICAL'
              ? 'bg-rose-50/30 dark:bg-rose-950/20 border-rose-500/40'
              : todayStandup?.blockerLevel === 'MINOR'
              ? 'bg-amber-50/30 dark:bg-amber-950/20 border-amber-500/40'
              : 'bg-emerald-50/30 dark:bg-emerald-950/20 border-emerald-500/40'
            : 'bg-slate-50/80 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/10'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`p-3 rounded-2xl ${
                submitted
                  ? todayStandup?.blockerLevel === 'CRITICAL'
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : todayStandup?.blockerLevel === 'MINOR'
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-amber-500/15 text-amber-500 border border-amber-500/30 animate-pulse'
              }`}
            >
              {submitted ? (
                todayStandup?.blockerLevel === 'CRITICAL' ? (
                  <AlertCircle className="w-6 h-6" />
                ) : (
                  <CheckCircle2 className="w-6 h-6" />
                )
              ) : (
                <Clock className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {submitted ? "Today's Daily Standup Submitted" : "Today's Standup Pending"}
                </h2>
                {submitted && (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                    Synced{' '}
                    {new Date(todayStandup!.submittedAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {submitted
                  ? todayStandup?.blockerLevel === 'CRITICAL'
                    ? '🔴 You reported a critical blocker today. Your engineering manager is actively triaging.'
                    : todayStandup?.blockerLevel === 'MINOR'
                    ? '🟡 You reported a minor blocker today.'
                    : '🟢 All clear! Zero active impediments reported for today.'
                  : 'Keep your engineering manager & peers aligned by submitting your 3-question update.'}
              </p>
            </div>
          </div>

          <Link
            to="/standup"
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
              submitted
                ? 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-white/10'
                : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
            }`}
          >
            <span>{submitted ? 'Edit Submission' : 'Fill Standup Form'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Quick Team Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Core Engineering Team</span>
            <Users className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white mt-2">
            Core SaaS Team
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            {teamFeed.length} active developers
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Team Submissions</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
            {submittedPeersCount} / {teamFeed.length}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            {Math.round((submittedPeersCount / (teamFeed.length || 1)) * 100)}% team participation
          </div>
        </div>

        <div className="glass-card p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-white/10">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span>Active Team Blockers</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-2">
            {activeBlockersCount} Reported
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            Impediments across teammates
          </div>
        </div>
      </div>

      {/* Peer Teammate Updates Feed */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
              👥 Teammates' Today Updates
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              See what your engineering peers are working on today to stay aligned and cheer them on.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {peerFeed.map((item) => (
            <TeamUpdateCard key={item.user.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
};
