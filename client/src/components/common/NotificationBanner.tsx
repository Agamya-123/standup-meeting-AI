import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { AppNotification } from '../../types';
import { Clock, ArrowRight, X, CheckCircle2, Zap, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotificationBanner: React.FC = () => {
  const { user } = useAuth();
  const [standupSubmitted, setStandupSubmitted] = useState<boolean>(true);
  const [resolvedNotification, setResolvedNotification] = useState<AppNotification | null>(null);
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  const checkStatus = async () => {
    if (!user) return;
    try {
      // 1. Check if user submitted today's standup
      const standupRes = await api.get('/standups/today');
      setStandupSubmitted(standupRes.data.submitted);

      // 2. Check if user has an unread BLOCKER_RESOLVED notification
      const notifRes = await api.get('/notifications');
      const unreadResolved = (notifRes.data.notifications || []).find(
        (n: AppNotification) => !n.read && n.type === 'BLOCKER_RESOLVED'
      );
      if (unreadResolved) {
        setResolvedNotification(unreadResolved);
      }
    } catch (err) {
      console.error('Error checking notifications for banner', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkStatus();
    // Re-check periodically
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleDismissResolved = async () => {
    if (resolvedNotification) {
      try {
        await api.patch(`/notifications/${resolvedNotification.id}/read`);
      } catch (err) {
        // ignore
      }
    }
    setResolvedNotification(null);
  };

  if (loading || dismissed) {
    return null;
  }

  // Priority 1: Blocker Resolved Live Alert Banner!
  if (resolvedNotification) {
    return (
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-2.5 shadow-lg flex items-center justify-between text-xs font-semibold backdrop-blur-md animate-in slide-in-from-top duration-300 border-b border-emerald-400/30">
        <div className="flex items-center gap-2.5 mx-auto sm:mx-0">
          <div className="p-1 rounded-lg bg-white/20 text-white shadow-inner">
            <CheckCircle2 className="w-4 h-4 animate-bounce" />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-extrabold uppercase tracking-wide bg-white/20 px-2 py-0.5 rounded text-[10px]">
              🚨 Tasker Ping: Blocker Unblocked!
            </span>
            <span className="text-emerald-50">
              {resolvedNotification.message}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            to="/standup"
            onClick={handleDismissResolved}
            className="bg-white hover:bg-emerald-50 text-emerald-900 px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
          >
            <span>Acknowledge & Proceed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={handleDismissResolved}
            className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition"
            title="Dismiss ping"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Priority 2: Standup Pending Reminder Banner (only for Team Members with submissions due)
  if (!standupSubmitted && user?.role === 'TEAM_MEMBER') {
    return (
      <div className="bg-gradient-to-r from-amber-600/90 via-amber-500/90 to-amber-600/90 text-slate-950 px-4 py-2.5 shadow-md flex items-center justify-between text-xs font-semibold backdrop-blur-md">
        <div className="flex items-center gap-2.5 mx-auto sm:mx-0">
          <div className="p-1 rounded bg-slate-950/20 text-slate-950">
            <Clock className="w-4 h-4 animate-bounce" />
          </div>
          <span>
            ⏰ <strong>Standup Pending Reminder:</strong> You haven't submitted your daily update for today yet. Keep your team aligned!
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/standup"
            className="bg-slate-950 hover:bg-slate-900 text-amber-300 px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
          >
            <span>Submit Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          <button
            onClick={() => setDismissed(true)}
            className="text-slate-950/80 hover:text-slate-950 p-1 transition"
            title="Dismiss reminder"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
};
