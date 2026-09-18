import React, { useState, useEffect } from 'react';
import { TeamMemberFeedItem, StandupReaction, ReactionReactor } from '../../types';
import { roleLabel } from '../../utils/roles';
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Users,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

interface TeamUpdateCardProps {
  item: TeamMemberFeedItem;
  onUpdate?: () => void;
}

const AVAILABLE_EMOJIS = ['🚀', '🔥', '👏', '👍', '❤️'] as const;

export const TeamUpdateCard: React.FC<TeamUpdateCardProps> = ({ item, onUpdate }) => {
  const { user, hasSubmitted, submission, blockerLevel } = item;
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [copied, setCopied] = useState<boolean>(false);
  const [localReactions, setLocalReactions] = useState<StandupReaction[]>(submission?.reactions || []);
  const [activeTooltipEmoji, setActiveTooltipEmoji] = useState<string | null>(null);

  useEffect(() => {
    if (submission?.reactions) {
      setLocalReactions(submission.reactions);
    }
  }, [submission?.reactions]);

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

  const yesterdayItems = parseList(submission?.yesterdayUpdates);
  const todayItems = parseList(submission?.todayPlans);
  const blockerItems = parseList(submission?.blockers);

  const formattedTime = submission?.submittedAt
    ? new Date(submission.submittedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    : null;

  const handleCopyUpdate = async () => {
    if (!hasSubmitted || !submission) return;
    try {
      const text = `👤 ${user.name} (${user.role})\n✅ Yesterday:\n${yesterdayItems
        .map((y) => `  • ${y}`)
        .join('\n')}\n🎯 Today:\n${todayItems
        .map((t) => `  • ${t}`)
        .join('\n')}${
        blockerItems.length > 0 && blockerLevel !== 'NONE'
          ? `\n🚨 Blockers (${blockerLevel}):\n${blockerItems.map((b) => `  • ${b}`).join('\n')}`
          : ''
      }`;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      showToast(`Copied ${user.name}'s standup to clipboard!`, 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy standup', 'error');
    }
  };

  const handleToggleReaction = async (emoji: string) => {
    if (!submission?.id || !currentUser) return;

    const existingIndex = localReactions.findIndex(
      (r) => r.emoji === emoji && r.userId === currentUser.id
    );
    const wasReacted = existingIndex !== -1;

    // Optimistic UI update
    const previousState = [...localReactions];
    if (wasReacted) {
      setLocalReactions(localReactions.filter((_, idx) => idx !== existingIndex));
    } else {
      const newReaction: StandupReaction = {
        id: `temp-${Date.now()}`,
        standupId: submission.id,
        userId: currentUser.id,
        emoji,
        createdAt: new Date().toISOString(),
        user: {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar
        }
      };
      setLocalReactions([...localReactions, newReaction]);
    }

    try {
      const res = await api.post(`/standups/${submission.id}/react`, { emoji });
      if (res.data.reactions) {
        setLocalReactions(res.data.reactions);
      }
      if (!wasReacted) {
        showToast(`Cheered ${user.name} with ${emoji}!`, 'success', 'Peer Cheer');
      }
      if (onUpdate) onUpdate();
    } catch (err: any) {
      setLocalReactions(previousState);
      showToast('Failed to update reaction', 'error');
    }
  };

  // Group reactions by emoji
  const groupedReactions: Record<string, { count: number; users: ReactionReactor[]; reactedByMe: boolean }> = {};
  AVAILABLE_EMOJIS.forEach((emoji) => {
    groupedReactions[emoji] = { count: 0, users: [], reactedByMe: false };
  });

  localReactions.forEach((r) => {
    if (!groupedReactions[r.emoji]) {
      groupedReactions[r.emoji] = { count: 0, users: [], reactedByMe: false };
    }
    groupedReactions[r.emoji].count += 1;
    if (r.user) {
      groupedReactions[r.emoji].users.push(r.user);
    }
    if (currentUser && r.userId === currentUser.id) {
      groupedReactions[r.emoji].reactedByMe = true;
    }
  });

  const isBlockerResolved = submission?.blockerStatus === 'RESOLVED';
  const isBlockerInProgress = submission?.blockerStatus === 'IN_PROGRESS';

  return (
    <div
      className={`glass-card p-4 sm:p-5 rounded-2xl border transition-all duration-200 relative overflow-hidden group ${
        blockerLevel === 'CRITICAL' && !isBlockerResolved
          ? 'border-rose-500/40 bg-rose-50/20 dark:bg-rose-950/15 shadow-sm shadow-rose-500/10'
          : blockerLevel === 'MINOR' && !isBlockerResolved
          ? 'border-amber-500/40 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm shadow-amber-500/10'
          : 'border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
      }`}
    >
      {/* Header Profile & Status */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={
                user.avatar ||
                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`
              }
              alt={user.name}
              className={`w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 p-0.5 shrink-0 border-2 ${
                blockerLevel === 'CRITICAL' && !isBlockerResolved
                  ? 'border-rose-500'
                  : blockerLevel === 'MINOR' && !isBlockerResolved
                  ? 'border-amber-500'
                  : 'border-blue-500/40'
              }`}
            />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-[#111724] ${
                hasSubmitted ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`}
            ></span>
          </div>

          <div>
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
              {user.name}
            </h3>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {roleLabel(user.role)}
            </span>
          </div>
        </div>

        {/* Status Badges & Quick Copy */}
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {hasSubmitted ? (
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>{formattedTime ? `${formattedTime}` : 'Submitted'}</span>
            </span>
          ) : (
            <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Pending</span>
            </span>
          )}

          {blockerLevel === 'CRITICAL' && (
            isBlockerResolved ? (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Resolved</span>
              </span>
            ) : isBlockerInProgress ? (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/40 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-500" />
                <span>In Triage</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-rose-600 text-white flex items-center gap-1 shadow-sm animate-pulse">
                <AlertCircle className="w-3 h-3" />
                <span>Critical</span>
              </span>
            )
          )}

          {blockerLevel === 'MINOR' && (
            isBlockerResolved ? (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-500" />
                <span>Resolved</span>
              </span>
            ) : isBlockerInProgress ? (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-500/30 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-500" />
                <span>In Triage</span>
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" />
                <span>Minor</span>
              </span>
            )
          )}

          {hasSubmitted && (
            <button
              onClick={handleCopyUpdate}
              title="Copy Standup Content"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition ml-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Standup Content */}
      {hasSubmitted ? (
        <div className="mt-3.5 space-y-3">
          {/* Yesterday */}
          <div>
            <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <span>Accomplished Yesterday</span>
            </h4>
            <ul className="space-y-1 pl-1">
              {yesterdayItems.map((item, idx) => (
                <li
                  key={idx}
                  className="text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2 leading-relaxed"
                >
                  <span className="text-blue-500 font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Today */}
          <div>
            <h4 className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <span>Today's Planned Deliverables</span>
            </h4>
            <ul className="space-y-1 pl-1">
              {todayItems.map((item, idx) => (
                <li
                  key={idx}
                  className="text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2 leading-relaxed"
                >
                  <span className="text-purple-500 font-bold shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Blockers */}
          {blockerItems.length > 0 && blockerLevel !== 'NONE' && (
            <div
              className={`p-3 rounded-xl border ${
                isBlockerResolved
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  : blockerLevel === 'CRITICAL'
                  ? 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-500/40 text-rose-900 dark:text-rose-200'
                  : 'bg-amber-50/80 dark:bg-amber-950/20 border-amber-500/30 text-amber-900 dark:text-amber-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  {isBlockerResolved ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : blockerLevel === 'CRITICAL' ? (
                    <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  )}
                  <span>
                    {isBlockerResolved ? 'Resolved Blocker' : 'Reported Blockers'}
                  </span>
                </h4>

                {isBlockerResolved && (
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Unblocked</span>
                  </span>
                )}
              </div>

              <ul className="space-y-1 pl-1">
                {blockerItems.map((item, idx) => (
                  <li
                    key={idx}
                    className={`text-xs font-medium flex items-start gap-1.5 ${
                      isBlockerResolved ? 'line-through opacity-70' : ''
                    }`}
                  >
                    <span>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Blocker Resolution Note if resolved */}
              {submission?.blockerResolutionNote && (
                <div className="mt-2 pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-800 dark:text-emerald-300 flex items-start gap-1.5 font-medium">
                  <span className="font-bold">Manager note:</span>
                  <span>"{submission.blockerResolutionNote}"</span>
                </div>
              )}
            </div>
          )}

          {/* Interactive Peer Reactions Bar with Visible Count & Hover Tooltips */}
          <div className="pt-2.5 flex items-center justify-between border-t border-slate-200/50 dark:border-white/5 relative">
            <span className="text-[10px] text-slate-400 font-medium">Cheer peer:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {AVAILABLE_EMOJIS.map((emoji) => {
                const group = groupedReactions[emoji] || { count: 0, users: [], reactedByMe: false };
                const count = group.count;
                const active = group.reactedByMe;
                const reactors = group.users;
                const isTooltipOpen = activeTooltipEmoji === emoji;

                return (
                  <div
                    key={emoji}
                    className="relative"
                    onMouseEnter={() => {
                      if (count > 0) setActiveTooltipEmoji(emoji);
                    }}
                    onMouseLeave={() => setActiveTooltipEmoji(null)}
                  >
                    <button
                      onClick={() => handleToggleReaction(emoji)}
                      className={`px-2 py-0.5 rounded-lg text-xs flex items-center gap-1.5 transition-all duration-150 ${
                        active
                          ? 'bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/50 shadow-sm shadow-blue-500/20 scale-105 font-bold'
                          : count > 0
                          ? 'bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10'
                          : 'bg-slate-100/50 dark:bg-white/[0.03] hover:bg-slate-200/70 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 border border-transparent'
                      }`}
                      title={
                        count > 0
                          ? `${reactors.map((u) => u.name).join(', ')} reacted ${emoji}`
                          : `React with ${emoji}`
                      }
                    >
                      <span className="text-xs">{emoji}</span>
                      {count > 0 && (
                        <span className="text-[10px] font-extrabold tracking-tight">
                          {count}
                        </span>
                      )}
                    </button>

                    {/* Popover / Tooltip showing who reacted */}
                    {isTooltipOpen && reactors.length > 0 && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 sm:w-56 glass-dropdown rounded-xl p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 pointer-events-none">
                        <div className="flex items-center gap-1.5 pb-1.5 mb-1.5 border-b border-slate-200 dark:border-white/10 text-[10px] font-bold text-slate-800 dark:text-slate-200">
                          <span>{emoji}</span>
                          <span>Cheered by {reactors.length} {reactors.length === 1 ? 'teammate' : 'teammates'}</span>
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {reactors.map((reactor, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-2">
                              <img
                                src={
                                  reactor.avatar ||
                                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                    reactor.name
                                  )}`
                                }
                                alt={reactor.name}
                                className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700"
                              />
                              <span className="text-[11px] text-slate-700 dark:text-slate-200 truncate font-medium">
                                {reactor.name}
                                {currentUser && reactor.id === currentUser.id && ' (You)'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3.5 p-4 rounded-xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/80 dark:border-white/5 text-center">
          <Clock className="w-4 h-4 text-amber-500 mx-auto mb-1.5 animate-bounce" />
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            Awaiting today's daily standup submission.
          </p>
        </div>
      )}
    </div>
  );
};
