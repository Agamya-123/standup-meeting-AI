import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import { DailyStandup } from '../../types';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ChevronRight,
  Clock,
  Filter,
  Check,
  Sparkles,
  TrendingUp
} from 'lucide-react';

export const StandupHistoryTimeline: React.FC = () => {
  const [history, setHistory] = useState<DailyStandup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterLevel, setFilterLevel] = useState<string>('ALL');

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/standups/my-history');
      setHistory(response.data.history || []);
    } catch (err) {
      console.error('Error fetching standup history', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const parseList = (jsonString?: string | null): string[] => {
    if (!jsonString) return [];
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed)) return parsed;
      return [jsonString];
    } catch {
      return [jsonString];
    }
  };

  const filteredHistory = history.filter((item) => {
    if (filterLevel === 'CRITICAL') return item.blockerLevel === 'CRITICAL';
    if (filterLevel === 'MINOR') return item.blockerLevel === 'MINOR';
    if (filterLevel === 'NONE') return item.blockerLevel === 'NONE';
    return true;
  });

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-slate-400">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-bold">Loading historical submissions...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="p-12 text-center text-xs font-medium text-slate-500 dark:text-slate-400 glass-panel rounded-2xl border border-slate-200/80 dark:border-white/10">
        <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-400" />
        No previous standup submissions found. Complete your daily standup to build your engineering log.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs & History Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            {history.length} Total Submissions
          </span>
          <span className="text-slate-400">•</span>
          <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {history.filter((h) => h.blockerLevel === 'NONE').length} Clean Days
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-white/[0.04] p-1 rounded-xl border border-slate-200/80 dark:border-white/10">
          {[
            { id: 'ALL', label: 'All Logs' },
            { id: 'NONE', label: 'Clean' },
            { id: 'MINOR', label: 'Minor Blockers' },
            { id: 'CRITICAL', label: 'Critical Blockers' }
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterLevel(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                filterLevel === f.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline Entries */}
      <div className="space-y-4">
        {filteredHistory.map((item) => {
          const yesterdayList = parseList(item.yesterdayUpdates);
          const todayList = parseList(item.todayPlans);
          const blockerList = parseList(item.blockers);

          return (
            <div
              key={item.id}
              className={`p-5 sm:p-6 rounded-2xl glass-card border transition-all ${
                item.blockerLevel === 'CRITICAL'
                  ? 'border-rose-500/40 bg-rose-50/20 dark:bg-rose-950/15'
                  : item.blockerLevel === 'MINOR'
                  ? 'border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/15'
                  : 'border-slate-200/80 dark:border-white/10'
              }`}
            >
              {/* Header Date & Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-200/80 dark:border-white/10">
                <div className="flex items-center gap-2.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <span>{item.date}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500 dark:text-slate-400 font-normal">
                    Submitted at{' '}
                    {new Date(item.submittedAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                <div>
                  {item.blockerLevel === 'CRITICAL' && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-rose-600 text-white flex items-center gap-1 shadow-sm">
                      <AlertCircle className="w-3 h-3" /> Critical Blocker
                    </span>
                  )}
                  {item.blockerLevel === 'MINOR' && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Minor Blocker
                    </span>
                  )}
                  {item.blockerLevel === 'NONE' && (
                    <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Clean Progress
                    </span>
                  )}
                </div>
              </div>

              {/* Yesterday & Today Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-3">
                <div>
                  <h4 className="font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>Accomplished Yesterday</span>
                  </h4>
                  <ul className="space-y-1 pl-1">
                    {yesterdayList.map((yItem, idx) => (
                      <li
                        key={idx}
                        className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5 leading-relaxed"
                      >
                        <span className="text-blue-500 font-bold shrink-0">•</span>
                        <span>{yItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span>Planned Deliverables</span>
                  </h4>
                  <ul className="space-y-1 pl-1">
                    {todayList.map((tItem, idx) => (
                      <li
                        key={idx}
                        className="text-slate-700 dark:text-slate-300 flex items-start gap-1.5 leading-relaxed"
                      >
                        <span className="text-purple-500 font-bold shrink-0">•</span>
                        <span>{tItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Blockers */}
              {blockerList.length > 0 && item.blockerLevel !== 'NONE' && (
                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-white/5">
                  <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-1.5">
                    Reported Blockers
                  </span>
                  <ul className="space-y-1 pl-1">
                    {blockerList.map((bItem, idx) => (
                      <li
                        key={idx}
                        className="text-xs text-rose-800 dark:text-rose-300 font-medium flex items-start gap-1.5"
                      >
                        <span>•</span>
                        <span>{bItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
