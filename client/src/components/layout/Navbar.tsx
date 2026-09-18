import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { AppNotification } from '../../types';
import { roleLabel } from '../../utils/roles';
import {
  Bell,
  Search,
  LogOut,
  ShieldCheck,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sun,
  Moon,
  RefreshCw,
  Share2,
  Zap,
  Check,
  Sparkles,
  Flame,
  Rocket
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onRefresh?: () => Promise<void> | void;
  onOpenExport?: () => void;
  isRefreshing?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery = '',
  onSearchChange,
  onRefresh,
  onOpenExport,
  isRefreshing = false
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { showToast } = useToast();

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [timeAgoText, setTimeAgoText] = useState<string>('Just now');
  const [localRefreshing, setLocalRefreshing] = useState<boolean>(false);

  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  const fetchRealNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data) {
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch (err) {
      console.error('Error fetching notifications from API', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchRealNotifications();
      // Poll notifications every 15 seconds for live pings
      const interval = setInterval(fetchRealNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Update time ago indicator every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const seconds = Math.floor((new Date().getTime() - lastSyncTime.getTime()) / 1000);
      if (seconds < 10) setTimeAgoText('Just now');
      else if (seconds < 60) setTimeAgoText(`${seconds}s ago`);
      else setTimeAgoText(`${Math.floor(seconds / 60)}m ago`);
    }, 5000);
    return () => clearInterval(interval);
  }, [lastSyncTime]);

  const handleManualRefresh = async () => {
    setLocalRefreshing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      await fetchRealNotifications();
      setLastSyncTime(new Date());
      setTimeAgoText('Just now');
      showToast('Dashboard synchronized with server', 'success', 'Synced');
    } catch {
      showToast('Failed to refresh data', 'error');
    } finally {
      setTimeout(() => setLocalRefreshing(false), 400);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
      showToast('All notifications marked as read', 'info');
    } catch (err) {
      showToast('Failed to mark notifications read', 'error');
    }
  };

  const markSingleRead = async (id: string) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      // ignore
    }
  };

  const formatNotifTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Today';
    }
  };

  const isSpinning = isRefreshing || localRefreshing;

  return (
    <header className="h-16 bg-white/70 dark:bg-[#0b0e14]/70 backdrop-blur-2xl border-b border-slate-200/80 dark:border-white/10 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 transition-all">
      {/* Search Bar & Fast Actions */}
      <div className="flex items-center gap-3 flex-1 max-w-md">
        {onSearchChange && (
          <div className="relative w-full group">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search team members, blockers, or topics..."
              className="w-full bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 rounded-xl pl-9 pr-12 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/80 transition-all"
            />
            <span className="hidden sm:flex items-center gap-0.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-white/10 text-slate-500 dark:text-slate-400 border border-slate-300/60 dark:border-white/10">
              ⌘K
            </span>
          </div>
        )}
      </div>

      {/* Right Navbar Controls */}
      <div className="flex items-center gap-2 sm:gap-3 relative">
        {/* Fast Refresh & Live Sync Status Button */}
        <button
          onClick={handleManualRefresh}
          disabled={isSpinning}
          title="Click to trigger Fast Refresh"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] hover:bg-slate-200/80 dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-xs font-semibold text-slate-700 dark:text-slate-200 transition group"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 text-blue-500 group-hover:text-blue-400 transition-transform ${
              isSpinning ? 'animate-spin' : 'group-hover:rotate-45'
            }`}
          />
          <span className="hidden md:inline text-[11px]">
            {isSpinning ? 'Syncing...' : timeAgoText}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </button>

        {/* Export / Broadcast Modal Launcher */}
        {onOpenExport && (
          <button
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-xs font-semibold transition"
            title="Export & Broadcast Summary to Slack / Markdown"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[11px]">Export Summary</span>
          </button>
        )}

        {/* Date Pill */}
        <div className="hidden xl:flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-white/[0.04] px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-white/10">
          <Calendar className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-[11px]">{todayDate}</span>
        </div>

        {/* Theme Switcher Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition flex items-center gap-1.5 text-xs font-semibold border border-slate-200/80 dark:border-white/10"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>

        {/* Notifications Icon Button */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-slate-200/80 dark:border-white/10 transition"
            title="Live Notifications & Tasker Pings"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[9px] font-extrabold ring-2 ring-white dark:ring-[#0b0e14] animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Glass Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 glass-dropdown rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3.5 bg-slate-50/80 dark:bg-white/[0.03] border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">
                    <Bell className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    Notifications & Live Pings
                  </span>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-semibold"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                {notifications.length > 0 ? (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markSingleRead(n.id)}
                      className={`p-3.5 text-xs transition cursor-pointer ${
                        !n.read
                          ? n.type === 'BLOCKER_RESOLVED'
                            ? 'bg-emerald-50/70 dark:bg-emerald-500/10'
                            : 'bg-blue-50/50 dark:bg-blue-500/10'
                          : 'bg-transparent hover:bg-slate-50/40 dark:hover:bg-white/[0.02]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                          {n.type === 'BLOCKER_RESOLVED' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          )}
                          {n.type === 'BLOCKER_ACKNOWLEDGED' && (
                            <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          )}
                          {n.type === 'REACTION' && (
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                          {n.type === 'REMINDER' && (
                            <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                          )}
                          {n.type === 'INFO' && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          )}
                          <span className="truncate">{n.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {formatNotifTime(n.createdAt)}
                        </span>
                      </div>

                      <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-1 leading-normal">
                        {n.message}
                      </p>

                      {n.link && (
                        <Link
                          to={n.link}
                          onClick={() => setNotificationsOpen(false)}
                          className={`inline-flex items-center gap-1 text-[11px] font-bold hover:underline mt-2 ${
                            n.type === 'BLOCKER_RESOLVED'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          <span>{n.type === 'BLOCKER_RESOLVED' ? 'View Standup & Proceed' : 'Action Now'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500/60 mx-auto mb-2" />
                    All caught up! No unread notifications.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-white/10"></div>

        {/* User Profile Info */}
        {user && (
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <img
                src={
                  user.avatar ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`
                }
                alt={user.name}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-blue-500/40 p-0.5"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#0b0e14]"></span>
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1">
                {user.name}
                {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                )}
                {user.role === 'TEAM_LEAD' && (
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                )}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">
                {roleLabel(user.role)}
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
