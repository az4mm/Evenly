import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getGroups } from '@/services/groups';
import CreateGroupDialog from '@/components/CreateGroupDialog';
import { Users, ArrowRight, Plus, FolderOpen } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
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
    fetchGroups();
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Hey, {firstName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {groups.length > 0
                ? `You're part of ${groups.length} group${groups.length === 1 ? '' : 's'}`
                : 'Create or join a group to start splitting expenses'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CreateGroupDialog onGroupCreated={handleGroupCreated}>
              <button className="neu-button h-10 px-4 rounded-xl text-sm font-medium flex items-center gap-2 text-primary cursor-pointer">
                <Plus className="h-4 w-4" />
                Create Group
              </button>
            </CreateGroupDialog>
          </div>
        </div>

        {/* Divider — neumorphic groove */}
        <div className="neu-inset h-[3px] rounded-full" />

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3 text-muted-foreground">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span className="text-sm">Loading your groups...</span>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="neu-inset rounded-2xl p-4">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="neu-raised flex items-center justify-center w-16 h-16 rounded-2xl mb-5">
              <FolderOpen className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-6">
              Groups let you track shared expenses with friends, roommates,
              or travel buddies. Create one to get started, or join an
              existing group with an invite code.
            </p>
            <div className="flex items-center gap-3">
              <CreateGroupDialog onGroupCreated={handleGroupCreated}>
                <button className="neu-button h-10 px-5 rounded-xl text-sm font-medium flex items-center gap-2 text-primary cursor-pointer">
                  <Plus className="h-4 w-4" />
                  Create Group
                </button>
              </CreateGroupDialog>
              <button
                onClick={() => navigate('/join')}
                className="text-sm font-medium text-primary hover:text-primary/80 underline underline-offset-4 transition-colors"
              >
                Join with code
              </button>
            </div>
          </div>
        )}

        {/* Group Cards */}
        {!loading && groups.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <div
                key={group.id}
                className="neu-raised rounded-2xl p-5 cursor-pointer transition-all duration-200 hover:translate-y-[-2px] group"
                onClick={() => navigate(`/groups/${group.id}`)}
              >
                {/* Top: name + currency */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-base truncate">
                      {group.name}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {group.my_role === 'admin' ? 'Admin' : 'Member'}
                    </span>
                  </div>
                  <span className="neu-flat ml-2 shrink-0 text-xs font-mono px-2.5 py-1 rounded-lg text-muted-foreground">
                    {group.currency}
                  </span>
                </div>

                {/* Bottom: meta row */}
                <div className="neu-inset rounded-xl px-3 py-2.5 flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {group.member_count}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(group.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
