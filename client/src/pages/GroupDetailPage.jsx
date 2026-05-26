import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getGroup, getMembers, removeMember, updateMemberRole, deleteGroup, getActivityLogs } from '@/services/groups';
import { getExpenses, deleteExpense } from '@/services/expenses';
import { getGroupBalances } from '@/services/balances';
import AddExpenseDialog from '@/components/AddExpenseDialog';
import ExpenseDetailDialog from '@/components/ExpenseDetailDialog';
import SettleUpDialog from '@/components/SettleUpDialog';
import ActivityDetailDialog from '@/components/ActivityDetailDialog';

// Tab Sub-Components
import MembersTab from '@/components/group/MembersTab';
import ExpensesTab from '@/components/group/ExpensesTab';
import BalancesTab from '@/components/group/BalancesTab';
import ActivityTab from '@/components/group/ActivityTab';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import EditGroupDialog from '@/components/EditGroupDialog';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Copy,
  Check,
  Settings,
  UserMinus,
  Trash2,
  Users,
  Receipt,
  Scale,
  Activity,
  Link as LinkIcon,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';

export default function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('expenses');
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState(null);
  const [activityDetailOpen, setActivityDetailOpen] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [hasMoreActivities, setHasMoreActivities] = useState(false);
  const [loadingMoreActivities, setLoadingMoreActivities] = useState(false);

  // Settle Up state
  const [settleUpOpen, setSettleUpOpen] = useState(false);
  const [settleUpBalance, setSettleUpBalance] = useState(null);
  const [settleUpExpenseToEdit, setSettleUpExpenseToEdit] = useState(null);

  // Balances State
  const [balances, setBalances] = useState([]);
  const [balanceSummary, setBalanceSummary] = useState(null);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [simplifyDebtsMode, setSimplifyDebtsMode] = useState(false);

  // Alert Dialog State
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', description: '', onConfirm: null, destructive: false });
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningConfig, setWarningConfig] = useState({ title: '', description: '' });

  function confirmAction(title, description, onConfirm, destructive = false) {
    setAlertConfig({ title, description, onConfirm, destructive });
    setAlertOpen(true);
  }

  function showWarning(title, description) {
    setWarningConfig({ title, description });
    setWarningOpen(true);
  }

  async function hasUnsettledBalances(userId) {
    try {
      const balancesRes = await getGroupBalances(id);
      if (!balancesRes.success) {
        return null;
      }

      return balancesRes.data.balances.some(
        (balance) => balance.from_user.id === userId || balance.to_user.id === userId
      );
    } catch {
      return null;
    }
  }

  async function fetchGroupAndExpenses() {
    setLoading(true);
    try {
      const [groupRes, expensesRes, activitiesRes] = await Promise.all([
        getGroup(id),
        getExpenses(id),
        getActivityLogs(id)
      ]);

      if (groupRes.success) {
        setGroup(groupRes.data);
      } else {
        setError(groupRes.error?.message || 'Failed to load group');
        return;
      }

      if (expensesRes.success) {
        setExpenses(expensesRes.data);
      }

      if (activitiesRes.success) {
        setActivities(activitiesRes.data);
        if (activitiesRes.pagination) {
          setHasMoreActivities(activitiesRes.pagination.page < activitiesRes.pagination.totalPages);
        } else {
          setHasMoreActivities(activitiesRes.data.length >= 50);
        }
      }
    } catch {
      setError('Something went wrong loading group details.');
    } finally {
      setLoading(false);
    }
  }

  async function loadMoreActivities() {
    if (loadingMoreActivities || !hasMoreActivities) return;
    setLoadingMoreActivities(true);
    const nextPage = activityPage + 1;
    try {
      const res = await getActivityLogs(id, nextPage);
      if (res.success) {
        setActivities(prev => [...prev, ...res.data]);
        setActivityPage(nextPage);
        if (res.pagination) {
          setHasMoreActivities(res.pagination.page < res.pagination.totalPages);
        } else {
          setHasMoreActivities(res.data.length >= 50);
        }
      } else {
        toast.error(res.error?.message || 'Failed to load more activity');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load more activity');
    } finally {
      setLoadingMoreActivities(false);
    }
  }

  async function loadMembersIfNeeded(force = false) {
    if (!force && (members.length > 0 || membersLoading)) return;
    setMembersLoading(true);
    try {
      const membersRes = await getMembers(id);
      if (membersRes.success) {
        setMembers(membersRes.data);
      }
    } catch (err) {
      console.error('Failed to load members', err);
    } finally {
      setMembersLoading(false);
    }
  }

  async function loadBalancesIfNeeded() {
    // Only load if empty to prevent unnecessary fetches, or force reload if needed
    if (balancesLoading) return;
    setBalancesLoading(true);
    try {
      const balancesRes = await getGroupBalances(id);
      if (balancesRes.success) {
        setBalances(balancesRes.data.balances);
        setBalanceSummary(balancesRes.data.summary);
        setSimplifyDebtsMode(balancesRes.data.simplify_debts);
      }
    } catch (err) {
      console.error('Failed to load balances', err);
    } finally {
      setBalancesLoading(false);
    }
  }

  useEffect(() => {
    fetchGroupAndExpenses();
  }, [id]);

  useEffect(() => {
    if (activeTab === 'members' || addExpenseOpen) {
      loadMembersIfNeeded();
    }
    if (activeTab === 'balances') {
      loadBalancesIfNeeded();
    }
  }, [activeTab, addExpenseOpen]);

  async function handleCopyInvite() {
    if (!group?.invite_code) return;
    try {
      const shareableLink = `${window.location.origin}/join?code=${group.invite_code}`;
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  }

  async function handlePromote(memberId) {
    const res = await updateMemberRole(id, memberId, 'admin');
    if (res.success) {
      toast.success('Member promoted to admin');
      fetchGroupAndExpenses();
      loadMembersIfNeeded(true);
    } else toast.error(res.error?.message || 'Failed to promote member');
  }

  async function handleDemote(memberId) {
    const res = await updateMemberRole(id, memberId, 'member');
    if (res.success) {
      toast.success('Admin demoted to member');
      fetchGroupAndExpenses();
      loadMembersIfNeeded(true);
    } else toast.error(res.error?.message || 'Failed to demote member');
  }

  async function handleRemoveMember(memberId) {
    const hasUnsettled = await hasUnsettledBalances(memberId);
    if (hasUnsettled === true) {
      showWarning(
        'Cannot Remove Member',
        'You can only remove a member when their balance is zero. Settle all balances first, then try again.'
      );
      return;
    }

    confirmAction(
      'Remove Member',
      'Are you sure you want to remove this member from the group?',
      async () => {
        const res = await removeMember(id, memberId);
        if (res.success) {
          toast.success('Member removed');
          fetchGroupAndExpenses();
          loadMembersIfNeeded(true);
        } else toast.error(res.error?.message || 'Failed to remove member');
      },
      true // destructive
    );
  }

  async function handleLeave() {
    const hasUnsettled = await hasUnsettledBalances(user.id);
    if (hasUnsettled === true) {
      showWarning(
        'Cannot Leave Group',
        'You can only leave this group when your balance is zero. Settle all balances first, then try again.'
      );
      return;
    }

    confirmAction(
      'Leave Group',
      'Are you sure you want to leave this group? You will no longer have access to its expenses.',
      async () => {
        const res = await removeMember(id, user.id);
        if (res.success) {
          toast.success('You left the group');
          navigate('/dashboard');
        } else {
          toast.error('Failed to leave group');
        }
      },
      true
    );
  }

  async function handleDeleteGroup() {
    confirmAction(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone and will permanently delete all expenses and balances.',
      async () => {
        const res = await deleteGroup(id);
        if (res.success) {
          toast.success('Group deleted');
          navigate('/dashboard');
        } else {
          toast.error('Failed to delete group');
        }
      },
      true
    );
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  }

  // Loading State - Neumorphic Skeleton Shimmer
  if (loading) {
    return (
      <div className="p-4 sm:p-8 animate-pulse">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-10 w-10 bg-muted rounded-xl mb-6" /> {/* back btn */}
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-4">
              <div className="h-8 w-48 bg-muted rounded-md" /> {/* Title */}
              <div className="flex gap-2">
                <div className="h-6 w-12 bg-muted/60 rounded-md" />
                <div className="h-6 w-20 bg-muted/60 rounded-md" />
              </div>
            </div>
            <div className="h-12 w-32 bg-muted rounded-xl" /> {/* Invite box */}
          </div>

          <div className="neu-inset h-[3px] rounded-full my-6" />

          {/* Tabs skeleton */}
          <div className="h-10 w-full sm:w-[400px] bg-muted rounded-xl mb-8" />
          
          {/* Members list skeleton */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="neu-raised flex items-center justify-between rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-muted rounded-full" />
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-muted rounded-md" />
                    <div className="h-3 w-40 bg-muted/60 rounded-md" />
                  </div>
                </div>
                <div className="h-6 w-16 bg-muted/60 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="neu-inset rounded-2xl p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
        <Button
          onClick={() => navigate('/dashboard')}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  const isAdmin = group?.my_role === 'admin';
  const isCreator = group?.created_by === user?.id;

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Back button */}
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="h-10 w-10 p-0 border-none text-muted-foreground hover:text-primary"
          title="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* ─── Group Header ─── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h1 className="text-3xl font-bold tracking-tight neu-text-raised">{group.name}</h1>

              {/* Settings button */}
              <Button 
                variant="outline" 
                className="h-8 w-8 p-0 border-none hover:bg-muted"
                onClick={() => setEditDialogOpen(true)}
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>

            {/* Meta badges — neumorphic flat */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="neu-flat text-xs font-mono px-2.5 py-1 rounded-lg text-muted-foreground">
                {group.currency}
              </span>
              <span className="neu-flat text-xs px-2.5 py-1 rounded-lg text-muted-foreground flex items-center gap-1">
                <Users className="h-3 w-3" />
                {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
              </span>
              {isAdmin && (
                <span className="neu-flat text-xs px-2.5 py-1 rounded-lg text-primary font-semibold">
                  Admin
                </span>
              )}
            </div>
          </div>

          {/* ─── Invite Code Box ─── */}
          <div className="flex flex-col items-start sm:items-end gap-1.5 mt-2 sm:mt-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pl-1 sm:pl-0 sm:pr-1">
              Invite Code
            </span>
            <div className="neu-raised flex items-center gap-3 px-4 py-2.5 rounded-xl">
              <div 
                className="flex flex-col cursor-pointer group"
                onClick={async () => {
                  await navigator.clipboard.writeText(group.invite_code);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }}
                title="Click to copy just the code"
              >
                <span className="text-sm font-mono font-bold text-primary tracking-wide group-hover:text-primary/70 transition-colors">
                  {codeCopied ? 'Copied!' : group.invite_code}
                </span>
                <span className="text-[9px] text-muted-foreground group-hover:text-primary/70 transition-colors">
                  Click to copy code
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary"
                onClick={handleCopyInvite}
                title="Copy full invite link"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Groove divider */}
        <div className="neu-inset h-[3px] rounded-full" />        {/* Tabs section */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full h-14 neu-inset p-1.5 rounded-2xl">
            <TabsTrigger value="expenses" className="flex-1 rounded-xl text-sm gap-2">
              <Receipt className="h-4 w-4" /> <span className="hidden sm:inline">Expenses</span>
            </TabsTrigger>
            <TabsTrigger value="balances" className="flex-1 rounded-xl text-sm gap-2">
              <Scale className="h-4 w-4" /> <span className="hidden sm:inline">Balances</span>
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex-1 rounded-xl text-sm gap-2">
              <Activity className="h-4 w-4" /> <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1 rounded-xl text-sm gap-2">
              <Users className="h-4 w-4" /> <span className="hidden sm:inline">Members</span>
            </TabsTrigger>
          </TabsList>
          <TabsContent value="members">
            <MembersTab 
              members={members}
              membersLoading={membersLoading}
              currentUserId={user?.id}
              groupCreatedBy={group.created_by}
              isAdmin={isAdmin}
              onPromote={handlePromote}
              onDemote={handleDemote}
              onRemove={handleRemoveMember}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesTab 
              expenses={expenses}
              group={group}
              currentUserId={user?.id}
              onAddExpense={() => {
                setExpenseToEdit(null);
                setAddExpenseOpen(true);
              }}
              onRecordPayment={() => {
                setSettleUpBalance(null);
                setSettleUpExpenseToEdit(null);
                loadMembersIfNeeded();
                setSettleUpOpen(true);
              }}
              onExpenseClick={(expense) => {
                setSelectedExpense(expense);
                setIsDetailOpen(true);
              }}
              onEditExpense={(expense) => {
                setSelectedExpense(expense);
                setIsDetailOpen(true);
              }}
              onDeleteExpense={(expense) => {
                setSelectedExpense(expense);
                setIsDetailOpen(true);
              }}
            />
          </TabsContent>

          <TabsContent value="balances">
            <BalancesTab 
              balances={balances}
              balanceSummary={balanceSummary}
              balancesLoading={balancesLoading}
              simplifyDebtsMode={simplifyDebtsMode}
              group={group}
              currentUserId={user?.id}
              onSettleUp={(balance) => {
                setSettleUpExpenseToEdit(null);
                setSettleUpBalance(balance);
                setSettleUpOpen(true);
              }}
            />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityTab 
              activities={activities}
              expenses={expenses}
              members={members}
              group={group}
              currentUserId={user?.id}
              hasMoreActivities={hasMoreActivities}
              loadingMoreActivities={loadingMoreActivities}
              onLoadMore={loadMoreActivities}
              onActivityClick={(activity) => {
                setSelectedActivity(activity);
                setActivityDetailOpen(true);
              }}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Group Settings Dialog */}
      {group && (
        <EditGroupDialog
          group={group}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onGroupUpdated={(updated) => setGroup(prev => ({ ...prev, ...updated }))}
          isAdmin={isAdmin}
          isCreator={isCreator}
          onLeaveGroup={handleLeave}
          onDeleteGroup={handleDeleteGroup}
        />
      )}

      <ActivityDetailDialog
        activity={selectedActivity}
        members={members}
        expenses={expenses}
        currency={group?.currency || 'INR'}
        open={activityDetailOpen}
        onOpenChange={setActivityDetailOpen}
      />

      <ExpenseDetailDialog
        expense={selectedExpense}
        members={members}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={(expense) => {
          setIsDetailOpen(false);
          if (expense.type === 'settlement') {
            setSettleUpExpenseToEdit(expense);
            setSettleUpBalance(null);
            setSettleUpOpen(true);
          } else {
            setExpenseToEdit(expense);
            setAddExpenseOpen(true);
          }
        }}
        onDelete={(exp) => {
          setIsDetailOpen(false);
          confirmAction(
            'Delete Expense',
            `Are you sure you want to delete "${exp.description || exp.category}"? This will reverse all balance effects.`,
            async () => {
              const res = await deleteExpense(id, exp.id);
              if (res.success) {
                toast.success('Expense deleted');
                fetchGroupAndExpenses();
              } else toast.error(res.error?.message || 'Failed to delete expense');
            },
            true
          );
        }}
      />

      {/* Add / Edit Expense Dialog */}
      {group && (
        <AddExpenseDialog
          open={addExpenseOpen}
          onOpenChange={(isOpen) => {
            setAddExpenseOpen(isOpen);
            if (!isOpen) setExpenseToEdit(null);
          }}
          groupId={id}
          members={members}
          currentUserId={user?.id}
          expenseToEdit={expenseToEdit}
          onExpenseAdded={() => fetchGroupAndExpenses()}
        />
      )}

      {/* Confirmation Alert Dialog */}
      <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
        <AlertDialogContent className="neu-raised-lg rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">{alertConfig.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-base">
              {alertConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3 sm:gap-2">
            <AlertDialogCancel className="neu-flat h-11 px-6 rounded-xl border-none font-medium hover:bg-transparent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (alertConfig.onConfirm) {
                  await alertConfig.onConfirm();
                }
                setAlertOpen(false);
              }}
              className={`neu-button h-11 px-6 rounded-xl border-none font-medium ${alertConfig.destructive ? 'text-destructive' : 'text-primary'}`}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warning Alert Dialog */}
      <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
        <AlertDialogContent className="neu-raised-lg rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">{warningConfig.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-base">
              {warningConfig.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3 sm:gap-2">
            <AlertDialogAction
              onClick={() => setWarningOpen(false)}
              className="neu-button h-11 px-6 rounded-xl border-none font-medium text-primary"
            >
              Got it
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <SettleUpDialog
        open={settleUpOpen}
        onOpenChange={(open) => {
          setSettleUpOpen(open);
          if (!open) setTimeout(() => setSettleUpExpenseToEdit(null), 300);
        }}
        groupId={id}
        balance={settleUpBalance}
        expenseToEdit={settleUpExpenseToEdit}
        members={members}
        currentUser={user}
        onSuccess={() => {
          fetchGroupAndExpenses();
          loadBalancesIfNeeded(true); // force reload balances
        }}
      />
    </div>
  );
}
