import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getGroups } from '@/services/groups';
import { getUserBalanceSummary } from '@/services/balances';
import CreateGroupDialog from '@/components/CreateGroupDialog';
import { Users, ArrowRight, Plus, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import FooterLinks from '@/components/FooterLinks';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [balanceSummary, setBalanceSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  async function fetchDashboardData() {
    setLoading(true);
    try {
      const [groupsRes, balancesRes] = await Promise.all([
        getGroups(),
        getUserBalanceSummary()
      ]);
      
      if (groupsRes.success) {
        setGroups(groupsRes.data);
      } else {
        toast.error(groupsRes.error?.message || 'Failed to load groups');
      }

      if (balancesRes.success) {
        setBalanceSummary(balancesRes.data);
      }
    } catch {
      toast.error('Something went wrong loading dashboard data.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  function handleGroupCreated() {
    fetchDashboardData();
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'there';

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight neu-text-raised">
              Hey, {firstName}
            </h1>
            <p className="text-muted-foreground mt-1">
              {groups.length > 0
                ? `You're part of ${groups.length} group${groups.length === 1 ? '' : 's'}`
                : 'Create or join a group to start splitting expenses'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <CreateGroupDialog onGroupCreated={handleGroupCreated} />
          </div>
        </div>

        {/* Divider — neumorphic groove */}
        <div className="neu-inset h-[3px] rounded-full" />

        {/* Balance Summary Widgets */}
        {!loading && balanceSummary && (
          <div className="grid grid-cols-2 gap-4 mt-6 mb-8">
            <div className="neu-raised rounded-2xl p-5 border-l-4 border-emerald-500 overflow-hidden relative group">
              <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
              <p className="text-sm font-medium text-muted-foreground mb-1 relative z-10">Total You are Owed</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 relative z-10 truncate">
                ₹{balanceSummary.total_owed.toFixed(2)}
              </p>
            </div>
            <div className="neu-raised rounded-2xl p-5 border-l-4 border-red-500 overflow-hidden relative group">
              <div className="absolute inset-0 bg-red-500/5 group-hover:bg-red-500/10 transition-colors" />
              <p className="text-sm font-medium text-muted-foreground mb-1 relative z-10">Total You Owe</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400 relative z-10 truncate">
                ₹{balanceSummary.total_owe.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Loading State - Neumorphic Skeleton Shimmer */}
        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="neu-raised rounded-2xl p-5 animate-pulse">
                {/* Top row skeleton */}
                <div className="flex items-start justify-between mb-3">
                  <div className="space-y-2 flex-1 mr-4">
                    <div className="h-5 bg-muted rounded-md w-3/4" />
                    <div className="h-3 bg-muted/60 rounded-md w-1/4" />
                  </div>
                  <div className="h-6 w-12 bg-muted rounded-lg shrink-0" />
                </div>
                
                {/* Bottom row skeleton */}
                <div className="neu-inset rounded-xl px-3 py-2.5 flex items-center justify-between mt-3">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-8 bg-muted rounded-md" />
                    <div className="h-3 w-16 bg-muted rounded-md" />
                  </div>
                  <div className="h-4 w-4 bg-muted rounded-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Removed static error block, now handled by sonner Toasts */}

        {/* Empty State */}
        {!loading && groups.length === 0 && (
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
              <CreateGroupDialog onGroupCreated={handleGroupCreated} />
              <Button
                variant="link"
                onClick={() => navigate('/join')}
                className="font-medium"
              >
                Join with code
              </Button>
            </div>
          </div>
        )}

        {/* Group Cards */}
        {!loading && groups.length > 0 && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <Card
                key={group.id}
                className="p-5 cursor-pointer transition-all duration-200 hover:translate-y-[-2px] group"
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
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Footer */}
      <div className="md:hidden">
        <FooterLinks />
      </div>
    </div>
  );
}
