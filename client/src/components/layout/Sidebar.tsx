import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  ClipboardCheck,
  History,
  Users,
  Building2,
  BadgeCheck,
  Activity
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const isManagerOrAdmin = user?.role === 'MANAGER' || user?.role === 'ADMIN';

  const navItems = [
    {
      label: 'Overview',
      path: '/dashboard',
      icon: LayoutDashboard,
      badge: isManagerOrAdmin ? 'Live' : undefined,
    },
    {
      label: 'Daily Standup',
      path: '/standup',
      icon: ClipboardCheck,
      badge: 'Today',
    },
    {
      label: 'Standup History',
      path: '/history',
      icon: History,
    },
    ...(user?.role === 'ADMIN'
      ? [
          {
            label: 'Departments',
            path: '/departments',
            icon: Building2,
          }
        ]
      : []),
    {
      label: 'Team Members',
      path: '/teams',
      icon: Users,
    }
  ];

  return (
    <aside className="w-64 bg-white/70 dark:bg-[#0b0e14]/70 backdrop-blur-2xl border-r border-slate-200/80 dark:border-white/10 flex flex-col justify-between shrink-0 h-screen sticky top-0 transition-colors z-20">
      <div>
        {/* Brand Logo Header & Company Workspace Tag */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200/80 dark:border-white/10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-extrabold text-sm text-slate-900 dark:text-slate-100 tracking-tight leading-none flex items-center gap-1.5">
              Standup AI
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/10 text-blue-500 border border-blue-500/20">
                PRO
              </span>
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
              {user?.company?.name || 'Enterprise Workspace'}
            </p>
          </div>
        </div>

        {/* Company Badge Card */}
        {user?.company && (
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.03] border border-slate-200/80 dark:border-white/10 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold text-slate-900 dark:text-slate-100 truncate">
                {user.company.name}
              </div>
              <div className="text-[9px] font-mono text-slate-500 dark:text-slate-400 truncate">
                {user.employeeId ? `ID: ${user.employeeId}` : user.company.slug}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1">
          <div className="px-3 pb-2 pt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Workspace</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/80 dark:hover:bg-white/[0.05]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User Card & Role Banner Footer */}
      <div className="p-3 border-t border-slate-200/80 dark:border-white/10 space-y-2">
        <div className="glass-card p-3 rounded-xl flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 shrink-0">
            <BadgeCheck className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
              {isManagerOrAdmin ? 'Manager Command Center' : 'Developer Workspace'}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {isManagerOrAdmin ? 'Blockers & AI Intelligence' : 'Daily Sync & Focus Tracker'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
