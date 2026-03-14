import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import AppLayout from '@/components/AppLayout';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import GroupDetailPage from '@/pages/GroupDetailPage';
import JoinGroupPage from '@/pages/JoinGroupPage';
import AuthCallbackPage from '@/pages/AuthCallbackPage';
import { Toaster } from 'sonner';
import { useTheme } from '@/contexts/ThemeContext';

function App() {
  const { theme } = useTheme();

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <DashboardPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/groups/:id"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <GroupDetailPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/join"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <JoinGroupPage />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<AuthCallbackPage />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        <Toaster 
          position="top-center" 
          theme={theme}
          toastOptions={{
            style: {
              background: 'var(--neu-bg)',
              border: 'none',
              boxShadow: '6px 6px 12px var(--neu-shadow-dark), -6px -6px 12px var(--neu-shadow-light)',
              color: 'var(--foreground)',
              borderRadius: '1rem',
            },
            classNames: {
              toast: 'font-sans',
              description: 'text-muted-foreground',
              actionButton: 'neu-button text-primary',
              cancelButton: 'neu-flat text-muted-foreground',
              error: 'text-destructive',
              success: 'text-primary'
            },
          }} 
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
