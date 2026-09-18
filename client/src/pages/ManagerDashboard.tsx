import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { ManagerDashboardData, AISummaryData, Team } from '../types';
import { StatCard } from '../components/dashboard/StatCard';
import { BlockerPriorityList } from '../components/dashboard/BlockerPriorityList';
import { TeamUpdateCard } from '../components/dashboard/TeamUpdateCard';
import { AiInsightWidget } from '../components/dashboard/AiInsightWidget';
import { ExportModal } from '../components/common/ExportModal';
import { DepartmentSwitcher } from '../components/department/DepartmentSwitcher';
import { RestrictedDepartmentView } from '../components/department/RestrictedDepartmentView';
import {
  Users,
  CheckCircle2,
  Clock,
  ShieldAlert,
  AlertTriangle,
  Search,
  Sparkles,
  Share2,
  RefreshCw,
  Zap,
  Flame,
  Filter,
  Check,
  TrendingUp,
  Activity,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const ManagerDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [data, setData] = useState<ManagerDashboardData | null>(null);
  const [aiData, setAiData] = useState<AISummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [aiLoading, setAiLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeViewTab, setActiveViewTab] = useState<'OVERVIEW' | 'ALL_STANDUPS' | 'BLOCKERS' | 'AI'>('OVERVIEW');
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);
  const [autoRefreshSecs, setAutoRefreshSecs] = useState<number>(30);
  const [countdown, setCountdown] = useState<number>(30);

  // Department filter state
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');

  const fetchTeams = useCallback(async () => {
    try {
      const res = await api.get('/teams');
      setTeams(res.data.teams || []);
    } catch (err) {
      console.error('Error fetching departments', err);
    }
  }, []);

  const fetchDashboardData = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoading(true);
      try {
        const query = selectedTeamId ? `?teamId=${selectedTeamId}` : '';
        const response = await api.get(`/manager/dashboard${query}`);
        setData(response.data);
      } catch (err) {
        console.error('Error fetching manager dashboard data', err);
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [selectedTeamId]
  );

  const fetchAiSummary = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setAiLoading(true);
      try {
        const query = selectedTeamId ? `?teamId=${selectedTeamId}` : '';
        const response = await api.get(`/ai/summary${query}`);
        setAiData(response.data);
      } catch (err) {
        console.error('Error fetching AI summary', err);
      } finally {
        if (!isSilent) setAiLoading(false);
      }
    },
    [selectedTeamId]
  );

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchDashboardData(true), fetchAiSummary(true)]);
    setCountdown(autoRefreshSecs);
    setIsRefreshing(false);
    showToast('Dashboard refreshed with latest updates', 'success', 'Live Synced');
  };

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    fetchDashboardData();
    fetchAiSummary();
  }, [fetchDashboardData, fetchAiSummary, selectedTeamId]);

  // Auto-refresh countdown loop
  useEffect(() => {
    if (autoRefreshSecs === 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchDashboardData(true);
          fetchAiSummary(true);
          return autoRefreshSecs;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [autoRefreshSecs, fetchDashboardData, fetchAiSummary]);

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
    setActiveViewTab('OVERVIEW');
  };

  if (loading || !data) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-slate-400">
        <div className="inline-block w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Loading Manager Command Center...
        </p>
      </div>
    );
  }

  // Restricted department view (member tries to open a private department)
  if (data.restricted) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Manager Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Department-isolated standup feed with temporary cross-department access passes.
            </p>
          </div>
          <DepartmentSwitcher
            teams={teams}
            selectedTeamId={selectedTeamId}
            onSelectTeam={handleSelectTeam}
          />
        </div>

        <RestrictedDepartmentView
          team={data.team || null}
          userAccess={data.userAccess}
          onAccessRequested={() => {
            fetchTeams();
            fetchDashboardData(true);
          }}
        />
      </div>
    );
  }

  const { stats, priorityBlockers, teamMembersFeed } = data;

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const hasTempAccess = selectedTeam?.userAccess?.hasTempAccess;
  const tempExpiresAt = selectedTeam?.userAccess?.expiresAt
    ? new Date(selectedTeam.userAccess.expiresAt)
    : null;
  const remainingPassHours = tempExpiresAt
    ? Math.max(0, Math.round((tempExpiresAt.getTime() - Date.now()) / (1000 * 3600)))
    : null;

  const filteredFeed = teamMembersFeed.filter((item) => {
    const matchesSearch =
      item.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user.email.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'SUBMITTED') return item.hasSubmitted;
    if (filterStatus === 'PENDING') return !item.hasSubmitted;
    if (filterStatus === 'CRITICAL') return item.blockerLevel === 'CRITICAL';
    if (filterStatus === 'MINOR') return item.blockerLevel === 'MINOR';
    if (filterStatus === 'BLOCKED') return item.blockerLevel !== 'NONE';

    return true;
  });

  const filterCounts = {
    all: teamMembersFeed.length,
    submitted: teamMembersFeed.filter((i) => i.hasSubmitted).length,
    pending: teamMembersFeed.filter((i) => !i.hasSubmitted).length,
    critical: teamMembersFeed.filter((i) => i.blockerLevel === 'CRITICAL').length,
    minor: teamMembersFeed.filter((i) => i.blockerLevel === 'MINOR').length
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Export & Broadcast Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        dashboardData={data}
        aiData={aiData}
      />

      {/* Header Greeting & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Manager Command Center
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              LIVE SYNC
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time status of all {stats.totalMembers} developers, blocker triage, and AI synthesis.
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Fast Auto-refresh pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl glass-pill text-xs text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-beacon"></span>
            <span className="text-[11px] font-semibold">Auto-sync in {countdown}s</span>
          </div>

          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Fast Refresh'}</span>
          </button>

          <button
            onClick={() => setExportModalOpen(true)}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-md shadow-blue-500/20"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Export & Broadcast</span>
          </button>
        </div>
      </div>

      {/* Department Switcher */}
      <div className="flex flex-col gap-3">
        <DepartmentSwitcher
          teams={teams}
          selectedTeamId={selectedTeamId}
          onSelectTeam={handleSelectTeam}
        />
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Team Members"
          value={stats.totalMembers}
          subtitle="Active Developers"
          icon={Users}
          colorScheme="indigo"
        />

        <StatCard
          title="Submitted Today"
          value={stats.submittedCount}
          subtitle={`${stats.submissionRate}% Completion`}
          icon={CheckCircle2}
          colorScheme="emerald"
          progressBar={stats.submissionRate}
        />

        <StatCard
          title="Pending Updates"
          value={stats.pendingCount}
          subtitle="Awaiting Submission"
          icon={Clock}
          colorScheme="amber"
        />

        <StatCard
          title="Active Blockers"
          value={stats.activeBlockersCount}
          subtitle={`${stats.criticalBlockersCount} Critical, ${stats.minorBlockersCount} Minor`}
          icon={ShieldAlert}
          colorScheme="rose"
        />

        <StatCard
          title="Critical Alerts"
          value={stats.criticalBlockersCount}
          subtitle="Immediate Action Req."
          icon={AlertTriangle}
          colorScheme="rose"
        />
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-white/10 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-white/[0.04] p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10">
          <button
            onClick={() => setActiveViewTab('OVERVIEW')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeViewTab === 'OVERVIEW'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveViewTab('ALL_STANDUPS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeViewTab === 'ALL_STANDUPS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>All Standups</span>
            <span className="px-1.5 py-0.2 rounded-md bg-white/20 text-[10px]">
              {stats.submittedCount}/{stats.totalMembers}
            </span>
          </button>

          <button
            onClick={() => setActiveViewTab('BLOCKERS')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeViewTab === 'BLOCKERS'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>🚨 Blockers</span>
            {stats.activeBlockersCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-rose-500 text-white text-[10px]">
                {stats.activeBlockersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveViewTab('AI')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeViewTab === 'AI'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Insights</span>
          </button>
        </div>

        {/* Selected Department · Temp Access Pass Badge */}
        <div className="flex flex-wrap items-center gap-2">
          {selectedTeam && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-pill text-xs font-bold text-slate-700 dark:text-slate-300">
              <CheckCircle className="w-4 h-4 text-blue-500" />
              <span>Viewing: {selectedTeam.name}</span>
            </div>
          )}

          {hasTempAccess && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-bold">
              <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
              <span>
                Temporary Pass · {remainingPassHours !== null ? `${remainingPassHours}h remaining` : 'Active'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-pill text-xs font-bold text-slate-700 dark:text-slate-300">
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Team Energy: High</span>
          </div>
        </div>
      </div>

      {/* Tab: Overview (AI + Blockers + Standups) */}
      {activeViewTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Priority Blockers Bar */}
          {priorityBlockers.length > 0 && (
            <BlockerPriorityList
              blockers={priorityBlockers}
              onSelectMember={(name) => {
                setSearchQuery(name);
                setActiveViewTab('ALL_STANDUPS');
              }}
            />
          )}

          {/* AI Executive Intelligence */}
          <AiInsightWidget
            data={aiData}
            loading={aiLoading}
            onRefresh={() => fetchAiSummary(false)}
          />

          {/* Standup Submissions Section */}
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Team Member Submissions Feed
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Real-time updates submitted by developers today.
                </p>
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'ALL', label: `All (${filterCounts.all})` },
                  { id: 'SUBMITTED', label: `Submitted (${filterCounts.submitted})` },
                  { id: 'PENDING', label: `Pending (${filterCounts.pending})` },
                  { id: 'CRITICAL', label: `Critical (${filterCounts.critical})` },
                  { id: 'MINOR', label: `Minor (${filterCounts.minor})` }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilterStatus(f.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                      filterStatus === f.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFeed.map((item) => (
                <TeamUpdateCard key={item.user.id} item={item} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: All Standups */}
      {activeViewTab === 'ALL_STANDUPS' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by developer name..."
                className="glass-input w-full pl-9"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {['ALL', 'SUBMITTED', 'PENDING', 'BLOCKED'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {status.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeed.map((item) => (
              <TeamUpdateCard key={item.user.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Tab: Blockers */}
      {activeViewTab === 'BLOCKERS' && (
        <div className="space-y-6">
          <BlockerPriorityList
            blockers={priorityBlockers}
            onSelectMember={(name) => {
              setSearchQuery(name);
              setActiveViewTab('ALL_STANDUPS');
            }}
          />
        </div>
      )}

      {/* Tab: AI Insights */}
      {activeViewTab === 'AI' && (
        <div className="space-y-6">
          <AiInsightWidget
            data={aiData}
            loading={aiLoading}
            onRefresh={() => fetchAiSummary(false)}
          />
        </div>
      )}
    </div>
  );
};