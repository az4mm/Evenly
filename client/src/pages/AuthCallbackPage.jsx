import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function AuthCallbackPage() {
  const { user, loading } = useAuth();

  // While Supabase is processing auth tokens from the URL, show a loading state.
  // AuthContext's onAuthStateChange will set `user` once the session is ready.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    );
  }

  // Once loading is done, redirect based on auth state
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}
