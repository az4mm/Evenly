import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-2">Welcome!</h2>
          <p className="text-muted-foreground">
            Logged in as {user?.email}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Name: {user?.user_metadata?.full_name || 'Not set'}
          </p>
        </div>
      </div>
    </div>
  );
}
