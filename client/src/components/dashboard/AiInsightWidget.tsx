import React, { useState } from 'react';
import { AISummaryData } from '../../types';
import {
  Sparkles,
  Brain,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Zap,
  Copy,
  Check,
  Activity,
  ShieldAlert,
  Gauge
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface AiInsightWidgetProps {
  data: AISummaryData | null;
  loading: boolean;
  onRefresh: () => void;
}

export const AiInsightWidget: React.FC<AiInsightWidgetProps> = ({ data, loading, onRefresh }) => {
  const { showToast } = useToast();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [completedActions, setCompletedActions] = useState<Record<number, boolean>>({});

  if (loading) {
    return (
      <div className="p-6 rounded-2xl glass-panel border border-indigo-500/30 flex items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
        <span className="text-xs font-bold text-indigo-500 dark:text-indigo-300">
          Synthesizing AI Daily Team Intelligence & Implicit Blocker Patterns...
        </span>
      </div>
    );
  }

  if (!data) return null;

  // Calculate Team Health Score
  // Max 100: -20 per critical blocker, -8 per minor blocker, submission rate weight
  const blockerPenalty = data.criticalBlockersCount * 25 + data.minorBlockersCount * 10;
  const healthScore = Math.max(
    15,
    Math.min(100, Math.round(data.submissionRate * 0.5 + (100 - blockerPenalty) * 0.5))
  );

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    if (score >= 50) return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(
        `🤖 Standup AI Executive Synthesis:\n${data.executiveSummary}\n\n🚨 Risks:\n${data.identifiedRisks.join(
          '\n'
        )}\n\n✅ Action Items:\n${data.recommendations.join('\n')}`
      );
      setCopied(true);
      showToast('AI Briefing copied to clipboard!', 'success', 'Briefing Copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy briefing', 'error');
    }
  };

  const toggleActionItem = (idx: number) => {
    setCompletedActions((prev) => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div className="rounded-2xl glass-panel border border-indigo-500/30 overflow-hidden shadow-lg relative group">
      {/* Background ambient light */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-500/5 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Widget Header */}
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/30 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                AI Executive Briefing & Risk Matrix
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                GPT-Heuristic v2
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Automated synthesis of daily updates, implicit dependency detection, and priority recommendations.
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Health Score Pill */}
          <div
            className={`px-3 py-1 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${getHealthColor(
              healthScore
            )}`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Health Score: {healthScore}%</span>
          </div>

          <button
            onClick={handleCopySummary}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition text-xs font-semibold flex items-center gap-1 border border-slate-200/80 dark:border-white/10"
            title="Copy AI Executive Briefing"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onRefresh}
            title="Re-run AI Analysis"
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition border border-slate-200/80 dark:border-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition border border-slate-200/80 dark:border-white/10"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Widget Content Body */}
      {isExpanded && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Executive Summary Card */}
          <div className="p-4 sm:p-5 rounded-xl bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-transparent border border-indigo-500/20">
            <h3 className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-500" />
              <span>Executive Team Synthesis</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
              {data.executiveSummary}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Implicit Blocker Scanner */}
            <div className="p-4 rounded-xl glass-card border border-slate-200/80 dark:border-white/10">
              <h3 className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Implicit Blocker Scanner</span>
              </h3>
              {data.implicitBlockers.length > 0 ? (
                <div className="space-y-2">
                  {data.implicitBlockers.map((ib, idx) => (
                    <div
                      key={idx}
                      className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0a0e17] p-2.5 rounded-lg border border-slate-200/80 dark:border-white/5"
                    >
                      <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                        <span>{ib.userName}</span>
                        <span className="text-[10px] font-mono font-semibold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          "{ib.detectedPhrase}"
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
                        "{ib.text}"
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No hidden or implicit blockers found in today's textual updates.
                </p>
              )}
            </div>

            {/* Identified Risk Matrix */}
            <div className="p-4 rounded-xl glass-card border border-slate-200/80 dark:border-white/10">
              <h3 className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider mb-2.5 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>Project Risk Matrix</span>
              </h3>
              {data.identifiedRisks.length > 0 ? (
                <ul className="space-y-2">
                  {data.identifiedRisks.map((risk, idx) => (
                    <li
                      key={idx}
                      className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#0a0e17] p-2.5 rounded-lg border border-rose-500/20 flex items-start gap-2"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                      <span className="leading-snug">{risk}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Zero critical systemic delivery risks identified for this sprint.
                </p>
              )}
            </div>

            {/* Action Items Checklist */}
            <div className="p-4 rounded-xl glass-card border border-slate-200/80 dark:border-white/10">
              <h3 className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Action Items & Follow-ups</span>
                </div>
                <span className="text-[10px] text-slate-400 font-normal">
                  {Object.values(completedActions).filter(Boolean).length}/{data.recommendations.length}
                </span>
              </h3>
              <div className="space-y-2">
                {data.recommendations.map((rec, idx) => {
                  const isDone = !!completedActions[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleActionItem(idx)}
                      className={`text-xs p-2.5 rounded-lg border flex items-start gap-2 cursor-pointer transition ${
                        isDone
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 line-through opacity-70'
                          : 'bg-slate-50 dark:bg-[#0a0e17] border-slate-200/80 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => {}}
                        className="mt-0.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="leading-snug">{rec}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
