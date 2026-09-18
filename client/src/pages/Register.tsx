import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Sun,
  Moon,
  Building2,
  User,
  Mail,
  Lock,
  Globe,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Register: React.FC = () => {
  const { registerCompany } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState('');
  const [companySlug, setCompanySlug] = useState('');
  const [domain, setDomain] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminEmployeeId, setAdminEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');

  const handleCompanyNameChange = (value: string) => {
    setCompanyName(value);
    if (!companySlug || companySlug === slugify(companyName)) {
      setCompanySlug(slugify(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!companyName.trim() || !adminName.trim() || !adminEmail.trim() || !password) {
      setError('Company name, admin name, email, and password are required.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await registerCompany({
        companyName: companyName.trim(),
        companySlug: companySlug.trim() || undefined,
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
        adminEmployeeId: adminEmployeeId.trim() || undefined,
        password,
        domain: domain.trim() || undefined
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not create company workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#080b11] ambient-glow-bg flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors">
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

      <div className="w-full max-w-lg z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-xl shadow-blue-500/25 mb-3">
            <Activity className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create a Company Workspace
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Register your organization, then add employees with their own IDs and passwords.
          </p>
        </div>

        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2 mb-4">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Organization
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => handleCompanyNameChange(e.target.value)}
                    placeholder="Nexus Technologies"
                    required
                    className="glass-input w-full"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Workspace Slug
                    </label>
                    <input
                      type="text"
                      value={companySlug}
                      onChange={(e) => setCompanySlug(slugify(e.target.value))}
                      placeholder="nexus-tech"
                      className="glass-input w-full font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      Domain (optional)
                    </label>
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="nexustech.io"
                      className="glass-input w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-1 border-t border-slate-200/80 dark:border-white/10">
              <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3 mt-4 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Workspace Admin
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    Admin Full Name
                  </label>
                  <input
                    type="text"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="Alex Mercer"
                    required
                    className="glass-input w-full"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      Admin Email
                    </label>
                    <input
                      type="email"
                      value={adminEmail}
                      onChange={(e) => setAdminEmail(e.target.value)}
                      placeholder="alex@nexustech.io"
                      required
                      className="glass-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Employee ID / Badge ID (optional)
                    </label>
                    <input
                      type="text"
                      value={adminEmployeeId}
                      onChange={(e) => setAdminEmployeeId(e.target.value)}
                      placeholder={`Auto ${(companySlug.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) || 'EMP').toUpperCase()}-001`}
                      className="glass-input w-full font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Password
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      required
                      minLength={8}
                      className="glass-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      required
                      className="glass-input w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/25 disabled:opacity-50 mt-2"
            >
              <span>{loading ? 'Creating Workspace...' : 'Create Company Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-bold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
