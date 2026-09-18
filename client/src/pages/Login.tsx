import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  Building2,
  Lock,
  Mail,
  BadgeCheck,
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  ChevronRight,
  Layers
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { LookupResponse, LookupMatch } from '../types';

export const Login: React.FC = () => {
  const { login, lookupIdentifier } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // State Machine: Step 1 (IDENTIFY) -> (Optional SELECT_WORKSPACE) -> Step 2 (PASSWORD)
  const [step, setStep] = useState<'IDENTIFY' | 'SELECT_WORKSPACE' | 'PASSWORD'>('IDENTIFY');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [detectedData, setDetectedData] = useState<{
    user: { id: string; name: string; email: string; employeeId?: string | null; avatar?: string | null; role: string };
    company: { id: string; name: string; slug: string; logo?: string | null; domain?: string | null };
  } | null>(null);
  const [workspaceMatches, setWorkspaceMatches] = useState<LookupMatch[]>([]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Identifier Lookup & Auto-Detection
  const handleIdentify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) {
      setError('Please enter your work email or Employee ID.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data: LookupResponse = await lookupIdentifier(identifier.trim());

      if (data.multiple && data.matches && data.matches.length > 1) {
        setWorkspaceMatches(data.matches);
        setStep('SELECT_WORKSPACE');
      } else if (data.user && data.company) {
        setDetectedData({
          user: data.user,
          company: data.company
        });
        setStep('PASSWORD');
      } else {
        throw new Error('No user record found.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'No account detected for this email or Employee ID. Please check with your company admin.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWorkspace = (match: LookupMatch) => {
    setDetectedData({
      user: match.user,
      company: match.company
    });
    setStep('PASSWORD');
    setError('');
  };

  // Step 2: Password Authentication (scoped by detected companyId)
  const handleAuthenticate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter your account password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await login(identifier.trim(), password, detectedData?.company?.id);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToIdentify = () => {
    setStep('IDENTIFY');
    setPassword('');
    setError('');
    setWorkspaceMatches([]);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#080b11] ambient-glow-bg flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors">
      {/* Top right theme toggle */}
      <div className="absolute top-5 right-5 z-20">
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl glass-card border border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition"
          title="Toggle Theme"
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-blue-600" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md z-10">
        {/* Brand logo & Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Standup AI
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Async Engineering Alignment & Intelligent Blocker Resolution
          </p>
        </div>

        {/* Dynamic Glass Authentication Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl transition-all duration-300">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2.5 mb-5 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          {/* STEP 1: IDENTIFIER LOOKUP */}
          {step === 'IDENTIFY' && (
            <form onSubmit={handleIdentify} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                    Sign in to your workspace
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Step 1 of 2
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
                  Enter your work email address or company Employee ID to auto-detect your organization.
                </p>
              </div>

              <div>
                <label htmlFor="login-identifier" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address or Employee ID
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. rahul@nexustech.io or EMP-102"
                    required
                    autoFocus
                    className="glass-input w-full pl-10 text-sm"
                  />
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1.5">
                  Supports corporate email or company assigned badge ID (e.g., EMP-001, NEXU-001)
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/25 disabled:opacity-50 mt-4"
              >
                <span>{loading ? 'Detecting Organization...' : 'Continue'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* INTERMEDIATE STEP: MULTIPLE WORKSPACES FOUND FOR THIS EMPLOYEE ID */}
          {step === 'SELECT_WORKSPACE' && workspaceMatches.length > 0 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-white/10">
                <div>
                  <h2 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-500" />
                    Select Your Organization
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Employee ID <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{identifier}</span> was found in multiple workspaces:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBackToIdentify}
                  className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {workspaceMatches.map((match) => (
                  <button
                    key={match.company.id}
                    onClick={() => handleSelectWorkspace(match)}
                    className="w-full text-left p-3.5 rounded-2xl glass-card border border-slate-200/80 dark:border-white/10 hover:border-blue-500/50 hover:bg-blue-500/5 transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center p-1 shadow-sm shrink-0">
                        {match.company.logo ? (
                          <img
                            src={match.company.logo}
                            alt={match.company.name}
                            className="w-full h-full object-contain rounded-lg"
                          />
                        ) : (
                          <Building2 className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                            {match.company.name}
                          </span>
                          <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {match.user.name} • <span className="font-mono">{match.user.email}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: COMPANY DETECTED & PASSWORD VERIFICATION */}
          {step === 'PASSWORD' && detectedData && (
            <form onSubmit={handleAuthenticate} className="space-y-4 animate-in fade-in slide-in-from-right-3">
              {/* Detected Workspace Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-blue-500/30 flex items-center justify-center p-1 shadow-sm shrink-0">
                    {detectedData.company.logo ? (
                      <img
                        src={detectedData.company.logo}
                        alt={detectedData.company.name}
                        className="w-full h-full object-contain rounded-lg"
                      />
                    ) : (
                      <Building2 className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                        {detectedData.company.name}
                      </span>
                      <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block truncate">
                      {detectedData.company.domain || `${detectedData.company.slug}.workspace`}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={workspaceMatches.length > 1 ? () => setStep('SELECT_WORKSPACE') : handleBackToIdentify}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0 flex items-center gap-1 ml-2"
                  title="Switch Company or User"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Switch</span>
                </button>
              </div>

              {/* Detected User Identity Profile Pill */}
              <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 flex items-center gap-3">
                <img
                  src={
                    detectedData.user.avatar ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(detectedData.user.name)}`
                  }
                  alt={detectedData.user.name}
                  className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-700 border border-blue-500/30 p-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 truncate">
                    <span>{detectedData.user.name}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      {detectedData.user.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                    {detectedData.user.employeeId && `ID: ${detectedData.user.employeeId} • `}
                    {detectedData.user.email}
                  </div>
                </div>
              </div>

              {/* Password Input */}
              <div className="pt-1">
                <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your account password"
                    required
                    autoFocus
                    className="glass-input w-full pl-10 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/25 disabled:opacity-50 mt-4"
              >
                <KeyRound className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : `Sign in to ${detectedData.company.name}`}</span>
              </button>
            </form>
          )}

          {/* Footer Organization Onboarding Link */}
          <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-white/10 text-center text-xs text-slate-500 dark:text-slate-400">
            <span>Setting up a new team? </span>
            <Link
              to="/register"
              className="text-blue-600 dark:text-blue-400 hover:underline font-bold"
            >
              Register Company Workspace
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
