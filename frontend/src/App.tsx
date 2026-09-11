import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { MainLayout } from './components/layout/MainLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DeploymentsPage } from './pages/DeploymentsPage';
import { CreateDeploymentPage } from './pages/CreateDeploymentPage';
import { DeploymentDetailPage } from './pages/DeploymentDetailPage';
import { FailedDeploymentsPage } from './pages/FailedDeploymentsPage';
import { IncidentDetailPage } from './pages/IncidentDetailPage';
import { RollbacksPage } from './pages/RollbacksPage';
import { RollbackDetailPage } from './pages/RollbackDetailPage';
import { PostMortemsPage } from './pages/PostMortemsPage';
import { PostMortemDetailPage } from './pages/PostMortemDetailPage';
import { CorrectiveActionsPage } from './pages/CorrectiveActionsPage';
import { TeamsUsersPage } from './pages/TeamsUsersPage';
import { ReportsPage } from './pages/ReportsPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-xs">
        <span className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2" />
        Authenticating session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            {/* Protected Management Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="deployments" element={<DeploymentsPage />} />
              <Route path="deployments/new" element={<CreateDeploymentPage />} />
              <Route path="deployments/:id" element={<DeploymentDetailPage />} />
              <Route path="failures" element={<FailedDeploymentsPage />} />
              <Route path="failures/:id" element={<IncidentDetailPage />} />
              <Route path="rollbacks" element={<RollbacksPage />} />
              <Route path="rollbacks/:id" element={<RollbackDetailPage />} />
              <Route path="postmortems" element={<PostMortemsPage />} />
              <Route path="postmortems/:id" element={<PostMortemDetailPage />} />
              <Route path="actions" element={<CorrectiveActionsPage />} />
              <Route path="teams" element={<TeamsUsersPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="audit-logs" element={<AuditLogsPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
};

export default App;
