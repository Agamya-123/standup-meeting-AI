import React from 'react';
import { Team } from '../../types';
import {
  Building2,
  Lock,
  Clock,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Layers,
  Sparkles
} from 'lucide-react';

interface DepartmentSwitcherProps {
  teams: Team[];
  selectedTeamId: string;
  onSelectTeam: (teamId: string) => void;
  showAllOption?: boolean;
  className?: string;
}

export const DepartmentSwitcher: React.FC<DepartmentSwitcherProps> = ({
  teams,
  selectedTeamId,
  onSelectTeam,
  showAllOption = true,
  className = ''
}) => {
  if (!teams || teams.length === 0) return null;

  const getBadgeForTeam = (team: Team) => {
    const access = team.userAccess;
    if (!access) return null;

    if (access.isLead) {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 flex items-center gap-1 shrink-0">
          <ShieldCheck className="w-2.5 h-2.5" />
          Lead
        </span>
      );
    }

    if (access.isMember) {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1 shrink-0">
          <CheckCircle2 className="w-2.5 h-2.5" />
          Member
        </span>
      );
    }

    if (access.hasTempAccess && access.expiresAt) {
      const remainingHours = Math.max(
        0,
        Math.round((new Date(access.expiresAt).getTime() - Date.now()) / (1000 * 3600))
      );
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1 shrink-0">
          <Clock className="w-2.5 h-2.5" />
          {remainingHours}h Pass
        </span>
      );
    }

    if (access.pendingRequest) {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1 shrink-0">
          <Clock className="w-2.5 h-2.5" />
          Pending
        </span>
      );
    }

    if (!access.allowed) {
      return (
        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center gap-1 shrink-0">
          <Lock className="w-2.5 h-2.5" />
          Locked
        </span>
      );
    }

    return null;
  };

  return (
    <div className={`flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none ${className}`}>
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 mr-1">
        <Layers className="w-3.5 h-3.5 text-blue-500" />
        <span className="hidden sm:inline">Department:</span>
      </div>

      {showAllOption && (
        <button
          onClick={() => onSelectTeam('')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 ${
            selectedTeamId === ''
              ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
              : 'bg-slate-100/80 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>All Departments</span>
        </button>
      )}

      {teams.map((team) => {
        const isSelected = selectedTeamId === team.id;
        const isAllowed = team.userAccess ? team.userAccess.allowed : true;

        return (
          <button
            key={team.id}
            onClick={() => onSelectTeam(team.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shrink-0 ${
              isSelected
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'bg-slate-100/80 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10'
            }`}
          >
            <span>{team.name}</span>
            {getBadgeForTeam(team)}
          </button>
        );
      })}
    </div>
  );
};
