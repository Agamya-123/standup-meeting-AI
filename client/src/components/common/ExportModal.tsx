import React, { useState } from 'react';
import { ManagerDashboardData, AISummaryData } from '../../types';
import { roleLabel } from '../../utils/roles';
import { Copy, Check, X, FileText, Send, Share2, Sparkles, MessageSquare } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dashboardData: ManagerDashboardData | null;
  aiData: AISummaryData | null;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  dashboardData,
  aiData,
}) => {
  const { showToast } = useToast();
  const [activeFormat, setActiveFormat] = useState<'SLACK' | 'MARKDOWN' | 'EMAIL'>('SLACK');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !dashboardData) return null;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const generateSlackText = (): string => {
    const { stats, teamMembersFeed, priorityBlockers } = dashboardData;
    let out = `🚀 *Daily Engineering Standup Summary — ${today}*\n`;
    out += `📊 *Participation:* ${stats.submittedCount}/${stats.totalMembers} developers (${stats.submissionRate}%)\n`;
    out += `⚠️ *Active Blockers:* ${stats.activeBlockersCount} (${stats.criticalBlockersCount} Critical, ${stats.minorBlockersCount} Minor)\n\n`;

    if (aiData?.executiveSummary) {
      out += `🤖 *AI Executive Insight:*\n>${aiData.executiveSummary}\n\n`;
    }

    if (priorityBlockers.length > 0) {
      out += `🚨 *Immediate Blocker Triage:*\n`;
      priorityBlockers.forEach((b) => {
        let bList: string[] = [];
        try {
          bList = JSON.parse(b.blockers);
        } catch {
          bList = [b.blockers];
        }
        out += `• *${b.userName}* (${b.blockerLevel}): ${bList.join(', ')}\n`;
      });
      out += `\n`;
    }

    out += `👥 *Team Deliverables & Focus Areas:*\n`;
    teamMembersFeed.forEach((item) => {
      if (item.hasSubmitted && item.submission) {
        let yesterday: string[] = [];
        let todayPlans: string[] = [];
        try {
          yesterday = JSON.parse(item.submission.yesterdayUpdates);
          todayPlans = JSON.parse(item.submission.todayPlans);
        } catch {}

        out += `*${item.user.name}*:\n`;
        if (yesterday.length) out += `  ✅ Yesterday: ${yesterday.join(', ')}\n`;
        if (todayPlans.length) out += `  🎯 Today: ${todayPlans.join(', ')}\n`;
      }
    });

    return out;
  };

  const generateMarkdownText = (): string => {
    const { stats, teamMembersFeed, priorityBlockers } = dashboardData;
    let out = `# 📋 Daily Engineering Standup — ${today}\n\n`;
    out += `| Metric | Value |\n|---|---|\n`;
    out += `| **Participation** | ${stats.submittedCount} / ${stats.totalMembers} (${stats.submissionRate}%) |\n`;
    out += `| **Active Blockers** | ${stats.activeBlockersCount} (Critical: ${stats.criticalBlockersCount}, Minor: ${stats.minorBlockersCount}) |\n\n`;

    if (aiData?.executiveSummary) {
      out += `## 🤖 AI Executive Summary\n${aiData.executiveSummary}\n\n`;
    }

    if (priorityBlockers.length > 0) {
      out += `## 🚨 Priority Blockers\n`;
      priorityBlockers.forEach((b) => {
        let bList: string[] = [];
        try {
          bList = JSON.parse(b.blockers);
        } catch {
          bList = [b.blockers];
        }
        out += `- **${b.userName}** (${b.blockerLevel}): ${bList.join(', ')}\n`;
      });
      out += `\n`;
    }

    out += `## 👥 Individual Updates\n`;
    teamMembersFeed.forEach((item) => {
      if (item.hasSubmitted && item.submission) {
        let yesterday: string[] = [];
        let todayPlans: string[] = [];
        try {
          yesterday = JSON.parse(item.submission.yesterdayUpdates);
          todayPlans = JSON.parse(item.submission.todayPlans);
        } catch {}

        out += `### ${item.user.name} (${roleLabel(item.user.role)})\n`;
        if (yesterday.length) {
          out += `**Accomplished Yesterday:**\n`;
          yesterday.forEach((y) => (out += `- ${y}\n`));
        }
        if (todayPlans.length) {
          out += `**Today's Focus:**\n`;
          todayPlans.forEach((t) => (out += `- ${t}\n`));
        }
        out += `\n`;
      }
    });

    return out;
  };

  const currentContent = activeFormat === 'SLACK' ? generateSlackText() : generateMarkdownText();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      showToast('Standup summary copied to clipboard!', 'success', 'Export Ready');
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      showToast('Failed to copy to clipboard.', 'error');
    }
  };

  return (
    <div
      className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
      style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-[#111724] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500 border border-blue-500/20">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                Export & Broadcast Standup Summary
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate formatted updates for Slack, Discord, Notion, or Email.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Selector Pills */}
        <div className="p-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/30 dark:bg-white/[0.02] flex items-center gap-2">
          <button
            onClick={() => setActiveFormat('SLACK')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeFormat === 'SLACK'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Slack / Discord Format</span>
          </button>

          <button
            onClick={() => setActiveFormat('MARKDOWN')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              activeFormat === 'MARKDOWN'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Markdown / Notion</span>
          </button>
        </div>

        {/* Content Box */}
        <div className="p-5">
          <div className="relative">
            <textarea
              readOnly
              value={currentContent}
              rows={12}
              className="w-full bg-slate-50 dark:bg-[#090d16] border border-slate-200 dark:border-white/10 rounded-xl p-4 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none resize-none select-all"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            Ready to paste directly into team channels
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 transition shadow-md shadow-blue-500/20"
            >
              {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied!' : 'Copy Formatted Text'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
