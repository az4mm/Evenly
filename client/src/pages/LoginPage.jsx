import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Scissors } from 'lucide-react';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <Scissors className="h-5 w-5 text-primary-foreground animate-pulse" />
          </div>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Dark Hero Section */}
      <div className="bg-sidebar-bg text-sidebar-foreground px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-sidebar-primary flex items-center justify-center">
              <Scissors className="h-6 w-6 text-sidebar-primary-foreground" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-sidebar-primary-foreground">
              Evenly
            </h1>
          </div>
          <p className="text-sidebar-muted text-base sm:text-lg leading-relaxed">
            Split expenses with friends, the easy way.<br className="hidden sm:block" />
            Track balances, settle debts, stay even.
          </p>
        </div>
      </div>

      {/* Login Card - overlapping the hero */}
      <div className="flex-1 bg-background flex items-start justify-center px-6 -mt-10">
        <div className="w-full max-w-sm">
          <div className="bg-card rounded-2xl border border-border shadow-lg p-8 space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-semibold text-card-foreground">Welcome back</h2>
              <p className="text-sm text-muted-foreground">
                Sign in to continue to Evenly
              </p>
            </div>

            <Button
              onClick={signInWithGoogle}
              variant="outline"
              size="lg"
              className="w-full h-12 text-base font-medium"
            >
              <svg className="mr-2.5 h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continue with Google
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our terms of service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
