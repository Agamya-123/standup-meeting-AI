import React from 'react';
import { StandupHistoryTimeline } from '../components/standup/StandupHistoryTimeline';

export const StandupHistoryPage: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      <div className="border-b border-slate-200/80 dark:border-white/10 pb-5">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Standup Submission History
          </h1>
          <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            AUDIT TRAIL
          </span>
        </div>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Review previous daily standups, track your engineering velocity, and audit past blocker logs.
        </p>
      </div>

      <StandupHistoryTimeline />
    </div>
  );
};
