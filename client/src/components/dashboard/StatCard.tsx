import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  colorScheme: 'indigo' | 'emerald' | 'amber' | 'rose' | 'purple';
  trend?: string;
  progressBar?: number; // 0 to 100 percentage
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorScheme,
  trend,
  progressBar
}) => {
  const styles = {
    indigo: {
      iconColor: 'text-blue-500',
      iconBg: 'bg-blue-500/10 border-blue-500/20',
      glow: 'from-blue-500/10 via-transparent to-transparent',
      barBg: 'bg-blue-500',
    },
    emerald: {
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-500/10 border-emerald-500/20',
      glow: 'from-emerald-500/10 via-transparent to-transparent',
      barBg: 'bg-emerald-500',
    },
    amber: {
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-500/10 border-amber-500/20',
      glow: 'from-amber-500/10 via-transparent to-transparent',
      barBg: 'bg-amber-500',
    },
    rose: {
      iconColor: 'text-rose-500',
      iconBg: 'bg-rose-500/10 border-rose-500/20',
      glow: 'from-rose-500/10 via-transparent to-transparent',
      barBg: 'bg-rose-500',
    },
    purple: {
      iconColor: 'text-purple-500',
      iconBg: 'bg-purple-500/10 border-purple-500/20',
      glow: 'from-purple-500/10 via-transparent to-transparent',
      barBg: 'bg-purple-500',
    }
  }[colorScheme];

  return (
    <div className="glass-card-interactive p-4 sm:p-5 rounded-2xl relative overflow-hidden group">
      {/* Ambient gradient corner */}
      <div
        className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${styles.glow} rounded-full blur-2xl pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity`}
      ></div>

      <div className="flex items-start justify-between relative z-10">
        <div>
          <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            {title}
          </span>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 tracking-tight">
            {value}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className={`p-2.5 rounded-xl border ${styles.iconBg} ${styles.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Progress Bar or Trend if provided */}
      {typeof progressBar === 'number' && (
        <div className="mt-3 pt-2 border-t border-slate-200/50 dark:border-white/5 relative z-10">
          <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mb-1">
            <span>Progress</span>
            <span className="font-bold text-slate-700 dark:text-slate-300">{progressBar}%</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${styles.barBg}`}
              style={{ width: `${Math.min(100, Math.max(0, progressBar))}%` }}
            ></div>
          </div>
        </div>
      )}

      {trend && (
        <div className="mt-2 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
          <span>{trend}</span>
        </div>
      )}
    </div>
  );
};
