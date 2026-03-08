import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getGroups } from '@/services/groups';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CreateGroupDialog from '@/components/CreateGroupDialog';
import { Users, UserPlus, ArrowRight, LogOut } from 'lucide-react';

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchGroups() {
    try {
      const result = await getGroups();
      if (result.success) {
        setGroups(result.data);
      } else {
        setError(result.error?.message || 'Failed to load groups');
      }
    } catch {
      setError('Something went wrong loading your groups.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchGroups();
  }, []);

  function handleGroupCreated() {
    fetchGroups(); // Refresh the list
  }

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CreateGroupDialog onGroupCreated={handleGroupCreated} />
            <Button variant="outline" onClick={() => navigate('/join')}>
              <UserPlus className="h-4 w-4 mr-2" />
              Join Group
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Groups section */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Groups</h2>

          {loading && (
            <p className="text-muted-foreground">Loading groups...</p>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {!loading && !error && groups.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-1">No groups yet</p>
                <p className="text-sm text-muted-foreground">
                  Create a group to start splitting expenses, or{' '}
                  <button
                    onClick={() => navigate('/join')}
                    className="underline underline-offset-3 hover:text-foreground"
                  >
                    join one with an invite code
                  </button>.
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && groups.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => navigate(`/groups/${group.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle>{group.name}</CardTitle>
                      <Badge variant="outline">{group.currency}</Badge>
                    </div>
                    <CardDescription>
                      {group.my_role === 'admin' ? 'Admin' : 'Member'}
                    </CardDescription>
                  </CardHeader>
                  <CardFooter className="justify-between">
                     <div className="flex items-center gap-3">
                       <span className="text-xs text-muted-foreground flex items-center gap-1">
                         <Users className="h-3 w-3" />
                         {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                       </span>
                       <span className="text-xs text-muted-foreground">
                         Created {new Date(group.created_at).toLocaleDateString()}
                       </span>
                     </div>
                     <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
