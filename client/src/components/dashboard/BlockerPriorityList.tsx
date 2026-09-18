import React, { useState } from 'react';
import { PriorityBlocker } from '../../types';
import {
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  MessageSquare,
  Check,
  Send,
  Clock,
  X,
  ChevronDown,
  Zap
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

interface BlockerPriorityListProps {
  blockers: PriorityBlocker[];
  onSelectMember?: (userName: string) => void;
  onBlockerResolved?: () => void;
}

const QUICK_TEMPLATES = [
  'Issue resolved — please proceed.',
  'AWS credentials granted — staging deploy is unblocked.',
  'Design signoff complete — proceed with implementation.',
  'DevOps approval granted — deploy whenever ready.',
  'Cross-team dependency cleared — unblocking your task now.',
];

interface ResolveModalState {
  isOpen: boolean;
  blockerId: string;
  blockerOwnerName: string;
  status: 'RESOLVED' | 'IN_PROGRESS';
  note: string;
  loading: boolean;
}

const INITIAL_MODAL: ResolveModalState = {
  isOpen: false,
  blockerId: '',
  blockerOwnerName: '',
  status: 'RESOLVED',
  note: '',
  loading: false
};

export const BlockerPriorityList: React.FC<BlockerPriorityListProps> = ({
  blockers,
  onSelectMember,
  onBlockerResolved
}) => {
  const { showToast } = useToast();
  const [modal, setModal] = useState<ResolveModalState>(INITIAL_MODAL);
  const [locallyResolved, setLocallyResolved] = useState<Record<string, 'RESOLVED' | 'IN_PROGRESS'>>({});

  const openResolveModal = (blocker: PriorityBlocker, status: 'RESOLVED' | 'IN_PROGRESS') => {
    setModal({
      isOpen: true,
      blockerId: blocker.id,
      blockerOwnerName: blocker.userName,
      status,
      note: status === 'IN_PROGRESS' ? 'Manager is actively unblocking this impediment.' : '',
      loading: false
    });
  };

  const closeModal = () => setModal(INITIAL_MODAL);

  const handleSendResolution = async () => {
    if (!modal.blockerId) return;
    setModal(prev => ({ ...prev, loading: true }));

    try {
      const note = modal.note.trim() ||
        (modal.status === 'RESOLVED'
          ? 'Issue resolved — please proceed.'
          : 'Manager is actively unblocking this impediment.');

      await api.post(`/notifications/resolve-blocker/${modal.blockerId}`, {
        status: modal.status,
        resolutionNote: note
      });

      setLocallyResolved(prev => ({ ...prev, [modal.blockerId]: modal.status }));

      const actionLabel = modal.status === 'RESOLVED' ? 'Resolved' : 'Triaged';
      showToast(
        `${actionLabel} ${modal.blockerOwnerName}'s blocker — live notification sent!`,
        'success',
        `Blocker ${actionLabel}`
      );

      if (onBlockerResolved) onBlockerResolved();
      closeModal();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message || 'Failed to send resolution',
        'error'
      );
    } finally {
      setModal(prev => ({ ...prev, loading: false }));
    }
  };

  if (!blockers || blockers.length === 0) {
    return (
      <div className="p-6 rounded-2xl glass-panel border border-emerald-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Zero Active Blockers
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                100% Flow
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              All submitted developers are progressing smoothly with zero reported impediments.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const criticalBlockers = blockers.filter((b) => b.blockerLevel === 'CRITICAL');
  const minorBlockers = blockers.filter((b) => b.blockerLevel === 'MINOR');

  const parseBlockerText = (blockersJson: string): string[] => {
    try {
      const parsed = JSON.parse(blockersJson);
      if (Array.isArray(parsed)) return parsed;
      return [blockersJson];
    } catch {
      return [blockersJson];
    }
  };

  const getBlockerStatus = (blocker: PriorityBlocker): 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' => {
    if (locallyResolved[blocker.id] === 'RESOLVED') return 'RESOLVED';
    if (locallyResolved[blocker.id] === 'IN_PROGRESS') return 'IN_PROGRESS';
    return (blocker.blockerStatus as 'OPEN' | 'IN_PROGRESS' | 'RESOLVED') || 'OPEN';
  };

  const renderBlockerCard = (blocker: PriorityBlocker, isCritical: boolean) => {
    const textItems = parseBlockerText(blocker.blockers);
    const currentStatus = getBlockerStatus(blocker);
    const isResolved = currentStatus === 'RESOLVED';
    const isInProgress = currentStatus === 'IN_PROGRESS';
    const isOpen = currentStatus === 'OPEN';

    return (
      <div
        key={blocker.id}
        className={`p-4 rounded-xl border transition-all ${
          isResolved
            ? 'bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-500/30'
            : isInProgress
            ? 'bg-blue-50/40 dark:bg-blue-950/10 border-blue-500/30'
            : isCritical
            ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-500/40 shadow-sm'
            : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-500/30'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="relative shrink-0">
              <img
                src={
                  blocker.userAvatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(blocker.userName)}`
                }
                alt={blocker.userName}
                className={`w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border-2 p-0.5 ${
                  isResolved
                    ? 'border-emerald-500/50'
                    : isCritical
                    ? 'border-rose-500/60'
                    : 'border-amber-500/40'
                }`}
              />
              <span
                className={`absolute -bottom-1 -right-1 p-0.5 rounded-full text-white ${
                  isResolved ? 'bg-emerald-600' : isInProgress ? 'bg-blue-600' : isCritical ? 'bg-rose-600' : 'bg-amber-500'
                }`}
              >
                {isResolved ? (
                  <Check className="w-2.5 h-2.5" />
                ) : isInProgress ? (
                  <Clock className="w-2.5 h-2.5" />
                ) : (
                  <AlertCircle className="w-2.5 h-2.5" />
                )}
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-2">
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  {blocker.userName}
                </span>
                <span
                  className={`px-2 py-0.5 text-[9px] font-extrabold rounded-md uppercase tracking-wider ${
                    isResolved
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : isInProgress
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      : isCritical
                      ? 'bg-rose-600 text-white'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {isResolved ? '✓ Resolved' : isInProgress ? '⏳ In Triage' : isCritical ? 'CRITICAL BLOCKER' : 'MINOR BLOCKER'}
                </span>
              </div>

              <ul className="mt-2 space-y-1">
                {textItems.map((item, idx) => (
                  <li
                    key={idx}
                    className={`text-xs font-medium flex items-start gap-2 ${
                      isResolved
                        ? 'text-slate-500 dark:text-slate-500 line-through'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    <span className={isCritical ? 'text-rose-500 font-bold' : 'text-amber-500 font-bold'}>•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              {/* Manager resolution note */}
              {(blocker.blockerResolutionNote || (isResolved && blocker.blockerResolutionNote)) && (
                <div className="mt-2 pt-2 border-t border-emerald-500/20 flex items-start gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                  <Zap className="w-3 h-3 mt-0.5 shrink-0 text-emerald-500" />
                  <span>"{blocker.blockerResolutionNote}"</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-end md:self-auto shrink-0">
            {!isResolved && (
              <>
                {!isInProgress && (
                  <button
                    onClick={() => openResolveModal(blocker, 'IN_PROGRESS')}
                    className="px-3 py-1.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold flex items-center gap-1.5 transition border border-blue-500/20"
                    title="Mark as In Progress & notify developer"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Triage</span>
                  </button>
                )}

                <button
                  onClick={() => openResolveModal(blocker, 'RESOLVED')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition ${
                    isCritical
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm'
                  }`}
                  title="Resolve blocker & ping developer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Resolve & Ping</span>
                </button>
              </>
            )}

            {isResolved && (
              <button
                onClick={() => openResolveModal(blocker, 'RESOLVED')}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200 dark:border-white/10"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>Resolved</span>
              </button>
            )}

            {onSelectMember && (
              <button
                onClick={() => onSelectMember(blocker.userName)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-white/[0.05] hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-200 dark:border-white/10"
              >
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                <span className="hidden sm:inline">View</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="rounded-2xl glass-panel border border-rose-500/40 p-5 sm:p-6 shadow-lg shadow-rose-500/5 relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/5 dark:bg-rose-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white shadow-md shadow-rose-500/30">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                🚨 Active Blocker Command Center
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Acknowledge and resolve blockers — developers get live pings.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {criticalBlockers.filter(b => getBlockerStatus(b) !== 'RESOLVED').length > 0 && (
              <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500 text-white shadow-sm flex items-center gap-1 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>
                  {criticalBlockers.filter(b => getBlockerStatus(b) !== 'RESOLVED').length} Critical
                </span>
              </span>
            )}
            {minorBlockers.filter(b => getBlockerStatus(b) !== 'RESOLVED').length > 0 && (
              <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                {minorBlockers.filter(b => getBlockerStatus(b) !== 'RESOLVED').length} Minor
              </span>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {criticalBlockers.map(b => renderBlockerCard(b, true))}
          {minorBlockers.map(b => renderBlockerCard(b, false))}
        </div>
      </div>

      {/* Resolve / Triage Modal */}
      {modal.isOpen && (
        <div
          className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md"
          style={{ margin: 0, top: 0, left: 0, right: 0, bottom: 0 }}
          onClick={closeModal}
        >
          <div
            className="relative w-full max-w-md glass-dropdown rounded-2xl shadow-2xl border border-slate-200 dark:border-white/15 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient bg */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>

            {/* Header */}
            <div className="p-5 pb-3 flex items-center justify-between border-b border-slate-200 dark:border-white/10">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  {modal.status === 'RESOLVED' ? (
                    <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Resolve Blocker & Ping Developer</>
                  ) : (
                    <><Clock className="w-4 h-4 text-blue-500" /> Triage Blocker & Notify Developer</>
                  )}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  A live notification will be sent to{' '}
                  <span className="font-bold text-slate-700 dark:text-slate-300">{modal.blockerOwnerName}</span>.
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Resolution Note Field */}
            <div className="p-5 space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2">
                  Resolution Message
                </label>
                <textarea
                  value={modal.note}
                  onChange={(e) => setModal(prev => ({ ...prev, note: e.target.value }))}
                  placeholder={
                    modal.status === 'RESOLVED'
                      ? 'Issue resolved — please proceed...'
                      : 'Actively investigating — update coming shortly...'
                  }
                  rows={3}
                  className="w-full glass-input text-xs rounded-xl px-3.5 py-2.5 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
                />
              </div>

              {/* Quick Templates */}
              <div>
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Quick Templates
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_TEMPLATES.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => setModal(prev => ({ ...prev, note: t }))}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition border text-left
                        ${modal.note === t
                          ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40'
                          : 'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                    >
                      {t.length > 40 ? t.slice(0, 40) + '…' : t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/[0.05] text-slate-700 dark:text-slate-300 text-sm font-semibold hover:bg-slate-200 dark:hover:bg-white/10 transition border border-slate-200 dark:border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendResolution}
                  disabled={modal.loading}
                  className={`flex-1 px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition ${
                    modal.status === 'RESOLVED'
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                      : 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/30'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {modal.loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{modal.status === 'RESOLVED' ? 'Resolve & Ping' : 'Triage & Notify'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
