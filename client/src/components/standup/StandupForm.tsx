import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { DailyStandup } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Shield,
  Edit3,
  Send,
  Sparkles,
  Wand2,
  Eye,
  Check,
  Zap,
  CornerDownLeft
} from 'lucide-react';

interface StandupFormProps {
  onSuccess?: () => void;
}

export const StandupForm: React.FC<StandupFormProps> = ({ onSuccess }) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [existingStandup, setExistingStandup] = useState<DailyStandup | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [yesterdayBullets, setYesterdayBullets] = useState<string[]>(['']);
  const [todayBullets, setTodayBullets] = useState<string[]>(['']);
  const [blockerBullets, setBlockerBullets] = useState<string[]>(['']);
  const [blockerLevel, setBlockerLevel] = useState<'NONE' | 'MINOR' | 'CRITICAL'>('NONE');

  const smartTemplates = [
    {
      title: 'Full-Stack Feature',
      yesterday: [
        'Built responsive UI layout & components with Tailwind CSS',
        'Added unit tests for state management & form handlers'
      ],
      today: [
        'Connect frontend with backend REST API endpoints',
        'Implement error states and optimistic UI updates'
      ],
      blockers: [],
      level: 'NONE' as const
    },
    {
      title: 'Bug Triage & Hotfix',
      yesterday: [
        'Reproduced critical staging environment issue and traced stacktrace',
        'Patched race condition in authentication token refresh loop'
      ],
      today: [
        'Deploy fix to staging and run automated regression tests',
        'Draft post-incident review notes for team retrospective'
      ],
      blockers: ['Waiting for QA staging signoff'],
      level: 'MINOR' as const
    },
    {
      title: 'DevOps & Infrastructure',
      yesterday: [
        'Refactored Dockerfile multi-stage build cache layer',
        'Configured CI/CD GitHub Actions workflow steps'
      ],
      today: [
        'Set up automated database schema migration triggers',
        'Benchmark server request latency & memory profile'
      ],
      blockers: [],
      level: 'NONE' as const
    }
  ];

  const applyTemplate = (tpl: typeof smartTemplates[0]) => {
    setYesterdayBullets(tpl.yesterday);
    setTodayBullets(tpl.today);
    setBlockerBullets(tpl.blockers.length > 0 ? tpl.blockers : ['']);
    setBlockerLevel(tpl.level);
    showToast(`Applied "${tpl.title}" template`, 'info', 'Smart Template');
  };

  const fetchTodayStatus = async () => {
    setLoading(true);
    try {
      const response = await api.get('/standups/today');
      if (response.data.submitted && response.data.standup) {
        const s: DailyStandup = response.data.standup;
        setExistingStandup(s);
        populateFormFromStandup(s);
      } else {
        setExistingStandup(null);
        resetForm();
      }
    } catch (err: any) {
      console.error('Failed to fetch today standup status', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayStatus();
  }, []);

  const populateFormFromStandup = (s: DailyStandup) => {
    try {
      setYesterdayBullets(JSON.parse(s.yesterdayUpdates));
    } catch {
      setYesterdayBullets([s.yesterdayUpdates]);
    }

    try {
      setTodayBullets(JSON.parse(s.todayPlans));
    } catch {
      setTodayBullets([s.todayPlans]);
    }

    try {
      const parsedBlockers = JSON.parse(s.blockers || '[]');
      setBlockerBullets(parsedBlockers.length > 0 ? parsedBlockers : ['']);
    } catch {
      setBlockerBullets(s.blockers ? [s.blockers] : ['']);
    }

    setBlockerLevel(s.blockerLevel);
  };

  const resetForm = () => {
    setYesterdayBullets(['']);
    setTodayBullets(['']);
    setBlockerBullets(['']);
    setBlockerLevel('NONE');
    setError(null);
  };

  const handleBulletChange = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    list: string[],
    index: number,
    value: string
  ) => {
    const updated = [...list];
    updated[index] = value;
    setter(updated);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    list: string[],
    index: number
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const updated = [...list];
      updated.splice(index + 1, 0, '');
      setter(updated);
    } else if (e.key === 'Backspace' && list[index] === '' && list.length > 1) {
      e.preventDefault();
      const updated = list.filter((_, i) => i !== index);
      setter(updated);
    }
  };

  const addBullet = (setter: React.Dispatch<React.SetStateAction<string[]>>, list: string[]) => {
    setter([...list, '']);
  };

  const removeBullet = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    list: string[],
    index: number
  ) => {
    if (list.length === 1) {
      setter(['']);
      return;
    }
    const updated = list.filter((_, i) => i !== index);
    setter(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validYesterday = yesterdayBullets.map((b) => b.trim()).filter(Boolean);
    const validToday = todayBullets.map((b) => b.trim()).filter(Boolean);
    const validBlockers = blockerBullets.map((b) => b.trim()).filter(Boolean);

    if (validYesterday.length === 0) {
      setError('Please add at least one accomplishment for yesterday.');
      return;
    }

    if (validToday.length === 0) {
      setError('Please add at least one planned focus for today.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        yesterdayUpdates: validYesterday,
        todayPlans: validToday,
        blockers: validBlockers,
        blockerLevel
      };

      if (existingStandup && isEditing) {
        await api.put(`/standups/${existingStandup.id}`, payload);
        showToast('Daily Standup updated successfully!', 'success', 'Updated');
      } else {
        await api.post('/standups', payload);
        showToast('Daily Standup submitted! Your team is in sync.', 'success', 'Submitted 🎉');
      }

      await fetchTodayStatus();
      setIsEditing(false);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit standup.');
      showToast('Error submitting standup', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 rounded-2xl glass-panel border border-slate-200/80 dark:border-white/10 text-center text-slate-400">
        <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs font-semibold">Loading your standup status...</p>
      </div>
    );
  }

  // Submitted view (ReadOnly)
  if (existingStandup && !isEditing) {
    const submittedTime = new Date(existingStandup.submittedAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const yesterdayList = JSON.parse(existingStandup.yesterdayUpdates || '[]');
    const todayList = JSON.parse(existingStandup.todayPlans || '[]');
    const blockerList = JSON.parse(existingStandup.blockers || '[]');

    return (
      <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-emerald-500/30 shadow-xl space-y-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  Today's Standup Submitted
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Synced Live
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Submitted at {submittedTime} • Your team & manager can see your update
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-md shadow-blue-500/20"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Submission</span>
          </button>
        </div>

        <div className="space-y-5 relative z-10">
          <div>
            <h3 className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
              Yesterday's Accomplishments
            </h3>
            <ul className="space-y-1.5 pl-1">
              {yesterdayList.map((item: string, idx: number) => (
                <li
                  key={idx}
                  className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-start gap-2.5"
                >
                  <span className="text-blue-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
              Today's Planned Focus
            </h3>
            <ul className="space-y-1.5 pl-1">
              {todayList.map((item: string, idx: number) => (
                <li
                  key={idx}
                  className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 flex items-start gap-2.5"
                >
                  <span className="text-purple-500 font-bold">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Blocker Severity Status
            </h3>
            <div className="flex items-center gap-3">
              {existingStandup.blockerLevel === 'NONE' && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> No Active Blocker
                </span>
              )}
              {existingStandup.blockerLevel === 'MINOR' && (
                <span className="px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Minor Blocker
                </span>
              )}
              {existingStandup.blockerLevel === 'CRITICAL' && (
                <span className="px-3 py-1 rounded-xl text-xs font-extrabold bg-rose-600 text-white shadow-md shadow-rose-600/25 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" /> Critical Blocker
                </span>
              )}
            </div>

            {blockerList.length > 0 && (
              <ul className="mt-2.5 space-y-1.5 pl-1">
                {blockerList.map((item: string, idx: number) => (
                  <li
                    key={idx}
                    className="text-xs sm:text-sm text-rose-600 dark:text-rose-300 flex items-start gap-2 font-medium"
                  >
                    <span>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Interactive Form
  return (
    <form
      onSubmit={handleSubmit}
      className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xl space-y-6 relative overflow-hidden"
    >
      {/* Background glow */}
      <div className="absolute top-0 right-1/3 w-80 h-80 bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-white/10 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              {isEditing ? "Edit Today's Standup" : 'Daily Standup Check-in'}
            </h2>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
              Async Flow
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Hit <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-white/10 font-mono text-[10px]">Enter ↵</kbd> to add bullets automatically.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline font-medium mr-2"
            >
              Cancel
            </button>
          )}

          <div className="flex items-center bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('EDIT')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                activeTab === 'EDIT'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('PREVIEW')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                activeTab === 'PREVIEW'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* AI Quick Smart Templates */}
      <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-500/5 via-blue-500/5 to-purple-500/5 border border-indigo-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Wand2 className="w-4 h-4 text-indigo-500" />
          <span>Quick Smart Presets:</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {smartTemplates.map((tpl) => (
            <button
              key={tpl.title}
              type="button"
              onClick={() => applyTemplate(tpl)}
              className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 border border-slate-200 dark:border-white/10 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition"
            >
              + {tpl.title}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Tab Content */}
      {activeTab === 'EDIT' ? (
        <div className="space-y-6">
          {/* Question 1: Yesterday */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>1. What did you accomplish yesterday? *</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {yesterdayBullets.filter(Boolean).length} items
              </span>
            </div>

            <div className="space-y-2">
              {yesterdayBullets.map((bullet, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-blue-500 font-bold text-xs pl-1">•</span>
                  <input
                    type="text"
                    value={bullet}
                    onChange={(e) =>
                      handleBulletChange(setYesterdayBullets, yesterdayBullets, idx, e.target.value)
                    }
                    onKeyDown={(e) =>
                      handleKeyDown(e, setYesterdayBullets, yesterdayBullets, idx)
                    }
                    placeholder="e.g. Completed authentication module UI layout & tests..."
                    className="glass-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeBullet(setYesterdayBullets, yesterdayBullets, idx)}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addBullet(setYesterdayBullets, yesterdayBullets)}
              className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Accomplishment</span>
            </button>
          </div>

          {/* Question 2: Today */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>2. What are you planning to work on today? *</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {todayBullets.filter(Boolean).length} items
              </span>
            </div>

            <div className="space-y-2">
              {todayBullets.map((bullet, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-purple-500 font-bold text-xs pl-1">•</span>
                  <input
                    type="text"
                    value={bullet}
                    onChange={(e) =>
                      handleBulletChange(setTodayBullets, todayBullets, idx, e.target.value)
                    }
                    onKeyDown={(e) =>
                      handleKeyDown(e, setTodayBullets, todayBullets, idx)
                    }
                    placeholder="e.g. Implement manager dashboard charts integration..."
                    className="glass-input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeBullet(setTodayBullets, todayBullets, idx)}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => addBullet(setTodayBullets, todayBullets)}
              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 pt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Another Focus Plan</span>
            </button>
          </div>

          {/* Question 3: Blockers */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              3. Any blockers or dependencies preventing velocity?
            </label>

            {/* Severity Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-2">
              <button
                type="button"
                onClick={() => setBlockerLevel('NONE')}
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  blockerLevel === 'NONE'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'glass-card text-slate-600 dark:text-slate-400'
                }`}
              >
                <Shield className="w-4 h-4 text-emerald-500" />
                <span>🟢 No Blocker (All Clear)</span>
              </button>

              <button
                type="button"
                onClick={() => setBlockerLevel('MINOR')}
                className={`p-3.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  blockerLevel === 'MINOR'
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500 ring-2 ring-amber-500/20'
                    : 'glass-card text-slate-600 dark:text-slate-400'
                }`}
              >
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>🟡 Minor Blocker</span>
              </button>

              <button
                type="button"
                onClick={() => setBlockerLevel('CRITICAL')}
                className={`p-3.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-2 transition ${
                  blockerLevel === 'CRITICAL'
                    ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white border-transparent shadow-lg shadow-rose-500/30 ring-2 ring-rose-500/30'
                    : 'glass-card text-slate-600 dark:text-slate-400'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                <span>🔴 Critical Blocker</span>
              </button>
            </div>

            {blockerLevel !== 'NONE' && (
              <div className="space-y-2 mt-3 animate-in fade-in duration-200">
                {blockerBullets.map((bullet, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-rose-500 font-bold text-xs pl-1">•</span>
                    <input
                      type="text"
                      value={bullet}
                      onChange={(e) =>
                        handleBulletChange(setBlockerBullets, blockerBullets, idx, e.target.value)
                      }
                      onKeyDown={(e) =>
                        handleKeyDown(e, setBlockerBullets, blockerBullets, idx)
                      }
                      placeholder="e.g. Waiting for production AWS credentials or staging approval..."
                      className="glass-input flex-1 border-rose-500/40 focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeBullet(setBlockerBullets, blockerBullets, idx)}
                      className="p-2 text-slate-400 hover:text-rose-500 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={() => addBullet(setBlockerBullets, blockerBullets)}
                  className="text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 pt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Blocker Description</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Live Preview Tab */
        <div className="p-5 rounded-xl glass-card border border-slate-200 dark:border-white/10 space-y-4">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Live Preview (How your card looks to teammates):
          </div>

          <div>
            <h4 className="text-xs font-bold text-blue-500 uppercase">Yesterday:</h4>
            <ul className="pl-2 text-xs text-slate-700 dark:text-slate-300 mt-1 space-y-1">
              {yesterdayBullets.filter(Boolean).map((y, i) => (
                <li key={i}>• {y}</li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-purple-500 uppercase">Today:</h4>
            <ul className="pl-2 text-xs text-slate-700 dark:text-slate-300 mt-1 space-y-1">
              {todayBullets.filter(Boolean).map((t, i) => (
                <li key={i}>• {t}</li>
              ))}
            </ul>
          </div>

          {blockerLevel !== 'NONE' && (
            <div>
              <h4 className="text-xs font-bold text-rose-500 uppercase">
                Blockers ({blockerLevel}):
              </h4>
              <ul className="pl-2 text-xs text-rose-600 dark:text-rose-300 mt-1 space-y-1">
                {blockerBullets.filter(Boolean).map((b, i) => (
                  <li key={i}>• {b}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Form Submit Footer */}
      <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex items-center justify-between">
        <span className="text-xs text-slate-400 hidden sm:inline">
          Syncs immediately with manager analytics
        </span>

        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-2 transition shadow-lg shadow-blue-500/25 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>
            {submitting
              ? 'Synchronizing...'
              : isEditing
              ? 'Update Daily Standup'
              : 'Submit Daily Standup'}
          </span>
        </button>
      </div>
    </form>
  );
};
