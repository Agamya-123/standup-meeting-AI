import React, { useState, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { NotificationBanner } from './components/common/NotificationBanner';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';

// Lazy load route pages for production code-splitting and bundle optimization
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));
const ManagerDashboard = lazy(() => import('./pages/ManagerDashboard').then((m) => ({ default: m.ManagerDashboard })));
const MemberOverview = lazy(() => import('./pages/MemberOverview').then((m) => ({ default: m.MemberOverview })));
const MemberDashboard = lazy(() => import('./pages/MemberDashboard').then((m) => ({ default: m.MemberDashboard })));
const StandupHistoryPage = lazy(() => import('./pages/StandupHistoryPage').then((m) => ({ default: m.StandupHistoryPage })));
const TeamsPage = lazy(() => import('./pages/TeamsPage').then((m) => ({ default: m.TeamsPage })));
const DepartmentsPage = lazy(() => import('./pages/DepartmentsPage').then((m) => ({ default: m.DepartmentsPage })));

const RouteLoadingFallback: React.FC = () => (
  <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
    <div className="inline-block w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    <p className="text-xs font-semibold text-slate-400">Loading view...</p>
  </div>
);

const ProtectedLayout: React.FC = () => {
  const { user, loading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafc] dark:bg-[#080b11] text-slate-400 flex flex-col items-center justify-center gap-3">
        <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm font-bold text-slate-500">Loading Workspace...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isManagerOrAdmin = user.role === 'MANAGER' || user.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#080b11] ambient-glow-bg flex flex-col font-sans transition-colors">
      {/* Standup Pending Reminder Alert Banner */}
      <NotificationBanner />

      <div className="flex flex-1">
        {/* Navigation Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

          <main className="flex-1 p-5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
                <Route
                  path="/dashboard"
                  element={isManagerOrAdmin ? <ManagerDashboard /> : <MemberOverview />}
                />
                <Route path="/standup" element={<MemberDashboard />} />
                <Route path="/history" element={<StandupHistoryPage />} />
                <Route path="/teams" element={<TeamsPage />} />
                <Route path="/departments" element={<DepartmentsPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
};

export const AppContent: React.FC = () => {
  const { user } = useAuth();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#080b11] text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="inline-block w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-500">Loading Application...</p>
        </div>
      }
    >
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route
          path="/register"
          element={user ? <Navigate to="/dashboard" replace /> : <Register />}
        />
        <Route path="/*" element={<ProtectedLayout />} />
      </Routes>
    </Suspense>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
