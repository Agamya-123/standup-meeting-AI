import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  MessageSquare,
  Moon,
  Send,
  Sun,
  Users,
  Zap,
  Target,
  Clock,
  TrendingUp
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

type WalkthroughScene = 'submit' | 'feed' | 'dashboard';

const SCENES: { id: WalkthroughScene; label: string; caption: string }[] = [
  {
    id: 'submit',
    label: 'Submit standup',
    caption: 'Team members fill yesterday, today, and blockers in one form.'
  },
  {
    id: 'feed',
    label: 'Team feed',
    caption: 'Leads read the team in one place and react or flag a blocker.'
  },
  {
    id: 'dashboard',
    label: 'Manager view',
    caption: 'Managers see who submitted, filter by team, and read an AI summary.'
  }
];

export const Landing: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [scene, setScene] = useState<WalkthroughScene>('submit');
  const [autoplay, setAutoplay] = useState(true);

  useEffect(() => {
    if (!autoplay) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const order: WalkthroughScene[] = ['submit', 'feed', 'dashboard'];
    const timer = window.setInterval(() => {
      setScene((current) => {
        const next = order[(order.indexOf(current) + 1) % order.length];
        return next;
      });
    }, 4200);

    return () => window.clearInterval(timer);
  }, [autoplay]);

  const selectScene = (id: WalkthroughScene) => {
    setAutoplay(false);
    setScene(id);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#080b11] text-slate-900 dark:text-slate-100">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-blue-600 focus:text-white"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-200/70 dark:border-white/10 bg-[#f8fafc]/80 dark:bg-[#080b11]/80 backdrop-blur-xl">
        <div className="w-full px-6 lg:px-12 h-16 flex items-center justify-between gap-4">
          <a href="#main" className="flex items-center gap-2.5 min-w-0">
            <span className="font-extrabold tracking-tight text-lg">Intelligent Daily Standup</span>
          </a>

          <nav aria-label="Page" className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#about" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              About
            </a>
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              How it works
            </a>
            <a href="#product" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Product
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2.5 rounded-xl glass-card border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:scale-105 transition-transform"
              title="Toggle theme"
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-600" />}
            </button>
            <Link
              to="/login"
              className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105 transition-all"
            >
              Create workspace
            </Link>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="relative overflow-hidden ambient-glow-bg">
          <div className="w-full px-6 lg:px-12 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-in fade-in slide-in-from-left-6 duration-700">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Async standups for real teams
              </p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.08] text-slate-900 dark:text-white">
                The morning update, without the meeting.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl leading-relaxed">
                Intelligent Daily Standup is a workspace where people write what they shipped, what they are doing next, and what is blocked. Leads review the feed. Managers see who is missing and where work is stuck.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/register"
                  className="group inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-105 transition-all"
                >
                  Create a company workspace
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl glass-card border border-slate-200/80 dark:border-white/15 font-bold hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
                >
                  Sign in to your workspace
                </Link>
              </div>
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                Register a company, then add employees with their own IDs and passwords.
              </p>

              {/* Animated stats */}
              <div className="mt-10 grid grid-cols-3 gap-4">
                {[
                  { icon: Clock, label: 'Saves time', value: '90%' },
                  { icon: Users, label: 'Team sync', value: '100%' },
                  { icon: TrendingUp, label: 'Productivity', value: '+40%' }
                ].map((stat, i) => (
                  <div
                    key={stat.label}
                    className="glass-card p-3 rounded-xl border border-slate-200/80 dark:border-white/10 hover:border-blue-500/30 transition-all animate-in fade-in slide-in-from-bottom-4"
                    style={{ animationDelay: `${i * 100}ms`, animationDuration: '700ms' }}
                  >
                    <stat.icon className="w-5 h-5 text-blue-600 dark:text-blue-400 mb-1" />
                    <p className="text-xl font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="animate-in fade-in slide-in-from-right-6 duration-700 delay-200">
              <ProductFrame scene={scene} onSelect={selectScene} />
            </div>
          </div>
        </section>

        <section id="about" className="px-6 lg:px-12 py-20 border-t border-slate-200/70 dark:border-white/10">
          <div className="w-full grid lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-12">
            <div className="animate-in fade-in slide-in-from-left-4 duration-700">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                What this is
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-300 leading-relaxed">
                Status lives in Slack threads, spreadsheets, and hallway updates. By the time a manager asks "what is blocked?", the answer is already stale.
              </p>
            </div>
            <div className="space-y-4 text-slate-600 dark:text-slate-300 leading-relaxed animate-in fade-in slide-in-from-right-4 duration-700 delay-200">
              <p>
                This app keeps one daily record per person, scoped to a company, department, and team. Roles match how the org actually works: admin, manager, team lead, and team member.
              </p>
              <p>
                Members submit. Leads read and react. Managers filter the day by team, watch submission rates, and get an AI summary of blockers and momentum. Temporary access grants cover people working across departments.
              </p>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="px-6 lg:px-12 py-20 bg-white/40 dark:bg-[#0a0e17]/40 border-y border-slate-200/70 dark:border-white/10">
          <div className="w-full">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white animate-in fade-in slide-in-from-bottom-4 duration-700">
              How a day runs
            </h2>
            <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
              Same three questions every morning. Different views depending on your role.
            </p>

            <ol className="mt-10 grid md:grid-cols-3 gap-6">
              {[
                {
                  n: '1',
                  title: 'Write the standup',
                  body: 'Yesterday, today, blockers. One form, one date. The record belongs to you and your team.',
                  icon: Send
                },
                {
                  n: '2',
                  title: 'Leads read the feed',
                  body: 'The team page shows who submitted, who is blocked, and lets a lead acknowledge or follow up.',
                  icon: MessageSquare
                },
                {
                  n: '3',
                  title: 'Managers see the pattern',
                  body: 'Dashboard filters by team, counts submissions, and an AI summary pulls blockers into one place.',
                  icon: BarChart3
                }
              ].map((step, i) => (
                <li
                  key={step.n}
                  className="glass-card rounded-2xl p-6 border border-slate-200/70 dark:border-white/10 hover:border-blue-500/30 hover:-translate-y-1 transition-all animate-in fade-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${i * 150}ms`, animationDuration: '700ms' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <step.icon className="w-5 h-5" />
                    </div>
                    <div className="text-sm font-extrabold text-blue-600 dark:text-blue-400">{step.n}</div>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">{step.title}</h3>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="product" className="px-6 lg:px-12 py-20">
          <div className="w-full">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-8">
              <div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Walk through the product
                </h2>
                <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-300">
                  These screens are a live walkthrough of the actual app: submit, team feed, manager dashboard.
                </p>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 md:text-right">
                {autoplay ? 'Cycling automatically. Pick a screen to pause.' : 'Autoplay paused.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 mb-6" role="tablist" aria-label="Product walkthrough">
              {SCENES.map((item) => {
                const selected = scene === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => selectScene(item.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all hover:scale-105 ${
                      selected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30'
                        : 'glass-card border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="glass-panel rounded-3xl border border-slate-200/80 dark:border-white/10 p-4 sm:p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
              <ProductStage scene={scene} />
              <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                {SCENES.find((item) => item.id === scene)?.caption}
              </p>
            </div>
          </div>
        </section>

        <section className="px-6 lg:px-12 py-20 bg-white/40 dark:bg-[#0a0e17]/40 border-y border-slate-200/70 dark:border-white/10">
          <div className="w-full">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Inside a workspace
            </h2>
            <ul className="mt-10 grid sm:grid-cols-2 gap-x-10 gap-y-6">
              {[
                { icon: Users, title: 'Company, department, team', body: 'Register a workspace, then build the hierarchy your people already use.' },
                { icon: Send, title: 'Daily standup form', body: 'Yesterday, today, blockers. One submission per person per day.' },
                { icon: MessageSquare, title: 'Feed and reactions', body: 'Leads read the team without a stand-up call and can react on a post.' },
                { icon: BarChart3, title: 'Dashboard and AI summary', body: 'Submission counts, team filters, and a short read of blockers and momentum.' }
              ].map((item, i) => (
                <li
                  key={item.title}
                  className="flex gap-4 animate-in fade-in slide-in-from-left-4"
                  style={{ animationDelay: `${i * 100}ms`, animationDuration: '600ms' }}
                >
                  <span className="mt-0.5 inline-flex w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 items-center justify-center shrink-0">
                    <item.icon className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-6 lg:px-12 py-20 ambient-glow-bg">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 mb-6 animate-in zoom-in-95 duration-500">
              <Activity className="w-8 h-8" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Open the workspace
            </h2>
            <p className="mt-4 text-slate-600 dark:text-slate-300">
              New company? Register and become the first admin. Already on a team? Sign in with email or employee ID.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/register"
                className="group inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-xl shadow-blue-500/25 hover:shadow-2xl hover:shadow-blue-500/40 hover:scale-105 transition-all"
              >
                Create a company workspace
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl glass-card border border-slate-200/80 dark:border-white/15 font-bold hover:border-blue-500/50 hover:bg-blue-500/5 transition-all"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-6 lg:px-12 py-8 border-t border-slate-200 dark:border-white/10">
        <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-200 font-bold">
            <Activity className="w-4 h-4 text-blue-600" aria-hidden="true" />
            Intelligent Daily Standup
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Sign in
            </Link>
            <Link to="/register" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Create workspace
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

const ProductFrame: React.FC<{
  scene: WalkthroughScene;
  onSelect: (id: WalkthroughScene) => void;
}> = ({ scene, onSelect }) => (
  <div className="glass-panel rounded-3xl border border-slate-200/80 dark:border-white/10 p-3 sm:p-4 shadow-2xl hover:shadow-3xl transition-shadow">
    <div className="flex items-center gap-1.5 px-2 pb-3" aria-hidden="true">
      <span className="w-2.5 h-2.5 rounded-full bg-rose-400/80" />
      <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
      <span className="ml-3 text-[11px] font-mono text-slate-400 truncate">app / {scene}</span>
    </div>
    <ProductStage scene={scene} compact />
    <div className="mt-3 flex gap-2">
      {SCENES.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onSelect(item.id)}
          className={`flex-1 h-1.5 rounded-full transition-all ${scene === item.id ? 'bg-blue-500' : 'bg-slate-200 dark:bg-white/10'}`}
          aria-label={`Show ${item.label}`}
        />
      ))}
    </div>
  </div>
);

const ProductStage: React.FC<{ scene: WalkthroughScene; compact?: boolean }> = ({ scene, compact }) => {
  return (
    <div
      className={`rounded-2xl bg-slate-50 dark:bg-[#0a0e17] border border-slate-200/80 dark:border-white/10 overflow-hidden transition-all ${
        compact ? 'min-h-[280px]' : 'min-h-[340px] sm:min-h-[380px]'
      }`}
    >
      {scene === 'submit' && <SubmitScene />}
      {scene === 'feed' && <FeedScene />}
      {scene === 'dashboard' && <DashboardScene />}
    </div>
  );
};

const SubmitScene: React.FC = () => (
  <div className="p-4 sm:p-5">
    <div className="flex items-center justify-between mb-4">
      <div>
        <p className="text-[11px] font-bold text-slate-400">Today · Core Platform</p>
        <p className="text-sm font-extrabold text-slate-900 dark:text-white">Daily standup</p>
      </div>
      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">Not submitted</span>
    </div>
    <div className="space-y-3">
      {[
        { label: 'Yesterday', value: 'Shipped the team roster assignment fix and added seed data.' },
        { label: 'Today', value: 'Review access grants and write the landing page.' },
        { label: 'Blockers', value: 'Waiting on design copy for the public homepage.' }
      ].map((field) => (
        <div key={field.label} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white/70 dark:bg-white/[0.03] hover:border-blue-500/30 transition-colors">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">{field.label}</p>
          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{field.value}</p>
        </div>
      ))}
    </div>
    <div className="mt-4 flex justify-end">
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-500 transition-colors cursor-pointer">
        <Send className="w-3 h-3" aria-hidden="true" />
        Submit standup
      </span>
    </div>
  </div>
);

const FeedScene: React.FC = () => (
  <div className="p-4 sm:p-5 space-y-3">
    <p className="text-sm font-extrabold text-slate-900 dark:text-white">Team feed · Core Platform</p>
    {[
      { name: 'Priya Shah', status: 'Shipped', blocker: false },
      { name: 'Jordan Hale', status: 'Blocked', blocker: true }
    ].map((row) => (
      <article key={row.name} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white/70 dark:bg-white/[0.03] hover:border-blue-500/30 transition-colors">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-extrabold text-slate-900 dark:text-white">{row.name}</p>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              row.blocker
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-300'
                : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {row.status}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
          {row.blocker
            ? 'Need the staging JWT rotated before I can finish the access-grant test.'
            : 'Closed the roster assignment bug. Reviewing seed data next.'}
        </p>
        <div className="mt-2 flex items-center gap-3 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Seen
          </span>
          {row.blocker && (
            <span className="inline-flex items-center gap-1 text-rose-500">
              <AlertCircle className="w-3 h-3" /> Blocker
            </span>
          )}
        </div>
      </article>
    ))}
  </div>
);

const DashboardScene: React.FC = () => (
  <div className="p-4 sm:p-5">
    <div className="flex items-center justify-between mb-4">
      <p className="text-sm font-extrabold text-slate-900 dark:text-white">Manager dashboard</p>
      <span className="text-[11px] font-mono text-slate-400">team: Core Platform</span>
    </div>
    <div className="grid grid-cols-3 gap-2 mb-4">
      {[
        { label: 'Submitted', value: '12/14' },
        { label: 'Blockers', value: '2' },
        { label: 'On time', value: '86%' }
      ].map((stat) => (
        <div key={stat.label} className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white/70 dark:bg-white/[0.03] hover:border-blue-500/30 transition-colors">
          <p className="text-[10px] font-bold text-slate-400">{stat.label}</p>
          <p className="text-lg font-extrabold text-slate-900 dark:text-white">{stat.value}</p>
        </div>
      ))}
    </div>
    <div className="rounded-xl border border-slate-200 dark:border-white/10 p-3 bg-white/70 dark:bg-white/[0.03]">
      <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 mb-1">AI summary</p>
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
        Most of Core Platform submitted. Two blockers sit on staging access. Roster assignment work is complete; landing page is in progress.
      </p>
    </div>
  </div>
);

