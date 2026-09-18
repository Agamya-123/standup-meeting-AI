import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { StandupForm } from '../components/standup/StandupForm';
import { TeamUpdateCard } from '../components/dashboard/TeamUpdateCard';
import { TeamMemberFeedItem, Team } from '../types';
import { DepartmentSwitcher } from '../components/department/DepartmentSwitcher';
import { RestrictedDepartmentView } from '../components/department/RestrictedDepartmentView';
import {
  ClipboardCheck,
  Users,
  Search,
  RefreshCw,
  Sparkles,
  Filter,
  CheckCircle,
  Clock,
  Lock
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export const MemberDashboard: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState<'TEAM_FEED' | 'FORM'>(
    isManagerOrAdmin ? 'TEAM_FEED' : 'FORM'
  );
  const [teamFeed, setTeamFeed] = useState<TeamMemberFeedItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Department isolation state
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [isRestricted, setIsRestricted] = useState<boolean>(false);
  const [restrictedTeamData, setRestrictedTeamData] = useState<any>(null);

  const fetchTeams = useCallback(async () => {
    try {
      const res = await api.get('/teams');
      setTeams(res.data.teams || []);
    } catch (err) {
      console.error('Error fetching departments', err);
    }
  }, []);

  const fetchTeamFeed = useCallback(
    async (isSilent = false) => {
      if (!isSilent) setLoadingFeed(true);
      try {
        const query = selectedTeamId ? `?teamId=${selectedTeamId}` : '';
        const response = await api.get(`/manager/dashboard${query}`);

        if (response.data.restricted) {
          setIsRestricted(true);
          setRestrictedTeamData(response.data);
          setTeamFeed([]);
        } else {
          setIsRestricted(false);
          setRestrictedTeamData(null);
          setTeamFeed(response.data.teamMembersFeed || []);
        }
      } catch (err) {
        console.error('Error fetching team feed on standup page', err);
      } finally {
        if (!isSilent) setLoadingFeed(false);
      }
    },
    [selectedTeamId]
  );

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchTeams(), fetchTeamFeed(true)]);
    setIsRefreshing(false);
    showToast('Team standups refreshed!', 'success', 'Synced');
  };

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    fetchTeamFeed();
    if (isManagerOrAdmin) {
      setActiveTab('TEAM_FEED');
    }
  }, [isManagerOrAdmin, fetchTeamFeed, selectedTeamId]);

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeamId(teamId);
  };

  const filteredFeed = teamFeed.filter((item) => {
    const matchesSearch =
      item.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.user.email.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filterStatus === 'SUBMITTED') return item.hasSubmitted;
    if (filterStatus === 'PENDING') return !item.hasSubmitted;
    if (filterStatus === 'BLOCKED') return item.blockerLevel !== 'NONE';

    return true;
  });

  const submittedCount = teamFeed.filter((i) => i.hasSubmitted).length;
  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const hasTempAccess = selectedTeam?.userAccess?.hasTempAccess;
  const tempExpiresAt = selectedTeam?.userAccess?.expiresAt
    ? new Date(selectedTeam.userAccess.expiresAt)
    : null;
  const remainingPassHours = tempExpiresAt
    ? Math.max(0, Math.round((tempExpiresAt.getTime() - Date.now()) / (1000 * 3600)))
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Tab Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Daily Standup Workspace
            </h1>
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              SYNCHRONIZED
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {isManagerOrAdmin
              ? "Monitor all developers' updates, accomplishments, and blockers for today."
              : 'Submit your structured standup update and stay connected with your department.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-white/[0.04] p-1.5 rounded-xl border border-slate-200/80 dark:border-white/10">
          <button
            onClick={() => setActiveTab('FORM')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'FORM'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>My Standup Form</span>
          </button>

          <button
            onClick={() => setActiveTab('TEAM_FEED')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
              activeTab === 'TEAM_FEED'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Department Standups ({submittedCount}/{teamFeed.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'TEAM_FEED' ? (
        <div className="space-y-5">
          {/* Department Switcher Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <DepartmentSwitcher
              teams={teams}
              selectedTeamId={selectedTeamId}
              onSelectTeam={handleSelectTeam}
              showAllOption={isManagerOrAdmin}
            />

            {hasTempAccess && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-bold shrink-0">
                <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>
                  Temp Pass: {remainingPassHours !== null ? `${remainingPassHours}h remaining` : 'Active'}
                </span>
              </div>
            )}
          </div>

          {/* If Restricted, show the Lock & Request card */}
          {isRestricted ? (
            <RestrictedDepartmentView
              team={restrictedTeamData?.team || null}
              userAccess={restrictedTeamData?.userAccess}
              onAccessRequested={() => {
                fetchTeams();
                fetchTeamFeed(true);
              }}
            />
          ) : (
            <>
              {/* Search & Status Filters */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="relative w-full sm:w-80">
                  <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search teammate by name..."
                    className="glass-input w-full pl-9"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-blue-500 ${isRefreshing ? 'animate-spin' : ''}`}
                    />
                    <span>{isRefreshing ? 'Syncing...' : 'Sync'}</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {[
                      { label: 'All', value: 'ALL' },
                      { label: 'Submitted', value: 'SUBMITTED' },
                      { label: 'Pending', value: 'PENDING' },
                      { label: 'Blocked', value: 'BLOCKED' }
                    ].map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setFilterStatus(f.value)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                          filterStatus === f.value
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Team Feed Grid */}
              {loadingFeed ? (
                <div className="p-16 text-center text-slate-500 dark:text-slate-400">
                  <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-bold">Loading team updates...</p>
                </div>
              ) : filteredFeed.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFeed.map((item) => (
                    <TeamUpdateCard key={item.user.id} item={item} />
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center text-slate-500 dark:text-slate-400 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10">
                  <p className="text-xs font-medium">No team members match your filter criteria.</p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <StandupForm
          onSuccess={() => {
            fetchTeamFeed(true);
            setActiveTab('TEAM_FEED');
          }}
        />
      )}
    </div>
  );
};
