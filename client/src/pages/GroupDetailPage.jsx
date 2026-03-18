import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getGroup, getMembers, removeMember, updateMemberRole, deleteGroup } from '@/services/groups';
import { getExpenses, deleteExpense } from '@/services/expenses';
import { getGroupBalances } from '@/services/balances';
import AddExpenseDialog from '@/components/AddExpenseDialog';
import ExpenseDetailDialog from '@/components/ExpenseDetailDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  ArrowRight,
  Copy,
  Check,
  MoreVertical,
  Pencil,
  Shield,
  UserMinus,
  ShieldOff,
  Trash2,
  Users,
  Receipt,
  Scale,
  Activity,
  Link as LinkIcon,
  Plus,
  Calendar,
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

  // Balances State
  const [balances, setBalances] = useState([]);
  const [balanceSummary, setBalanceSummary] = useState(null);
  const [balancesLoading, setBalancesLoading] = useState(false);

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
      const [groupRes, expensesRes] = await Promise.all([
        getGroup(id),
        getExpenses(id),
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
    } catch {
      setError('Something went wrong loading group details.');
    } finally {
      setLoading(false);
    }
  }

  async function loadMembersIfNeeded() {
    if (members.length > 0 || membersLoading) return;
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
      loadMembersIfNeeded();
    } else toast.error(res.error?.message || 'Failed to promote member');
  }

  async function handleDemote(memberId) {
    const res = await updateMemberRole(id, memberId, 'member');
    if (res.success) {
      toast.success('Admin demoted to member');
      fetchGroupAndExpenses();
      loadMembersIfNeeded();
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
          loadMembersIfNeeded();
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

              {/* Actions dropdown */}
              {(isAdmin || !isCreator) && (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="outline" className="h-8 w-8 p-0 border-none">
                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="start">
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                        <Pencil className="h-4 w-4 mr-2" /> Edit Group
                      </DropdownMenuItem>
                    )}
                    {!isCreator && (
                      <DropdownMenuItem onClick={handleLeave}>
                        <UserMinus className="h-4 w-4 mr-2" /> Leave Group
                      </DropdownMenuItem>
                    )}
                    {isCreator && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive" onClick={handleDeleteGroup}>
                          <Trash2 className="h-4 w-4 mr-2" /> Delete Group
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
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
          <div className="neu-raised flex items-center gap-2.5 px-4 py-3 rounded-xl">
            <LinkIcon className="h-3.5 w-3.5 text-primary shrink-0" />
            <span
              className="text-sm font-mono font-semibold text-primary cursor-pointer hover:text-primary/70 transition-colors select-all"
              title="Click to copy code"
              onClick={async () => {
                await navigator.clipboard.writeText(group.invite_code);
                setCodeCopied(true);
                setTimeout(() => setCodeCopied(false), 2000);
              }}
            >
              {codeCopied ? 'Copied!' : group.invite_code}
            </span>
            <Button
              variant="outline"
              className="h-7 w-7 p-0 border-none text-primary"
              onClick={handleCopyInvite}
              title="Copy invite link"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
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
          {/* Members Tab */}
          <TabsContent value="members">
            <div className="space-y-3 mt-4">
              {/* Removed memberError rendering since we use Toasts now */}
              {membersLoading ? (
                // Neumorphic Members Skeleton
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="neu-raised flex items-center justify-between rounded-2xl p-4 animate-pulse">
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
              ) : (
                members.map((member) => {
                  const isSelf = member.id === user?.id;
                  const isMemberCreator = member.id === group.created_by;

                  return (
                    <div key={member.id} className="neu-raised flex items-center justify-between rounded-2xl p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar>
                          {member.profile_pic && <AvatarImage src={member.profile_pic} alt={member.name} />}
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {member.name || member.email}
                            {isSelf && <span className="text-muted-foreground ml-1 text-xs">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`neu-flat text-xs px-2.5 py-1 rounded-lg ${
                          member.role === 'admin' ? 'text-primary font-semibold' : 'text-muted-foreground'
                        }`}>
                          {member.role === 'admin' ? 'Admin' : 'Member'}
                        </span>

                        {isAdmin && !isSelf && !isMemberCreator && (
                          <DropdownMenu>
                            <DropdownMenuTrigger className="h-7 w-7 p-0 border-none inline-flex items-center justify-center rounded-md neu-button text-muted-foreground hover:text-foreground transition-all outline-none">
                              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {member.role === 'member' ? (
                                <DropdownMenuItem onClick={() => handlePromote(member.id)}>
                                  <Shield className="h-4 w-4 mr-2" /> Promote to Admin
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleDemote(member.id)}>
                                  <ShieldOff className="h-4 w-4 mr-2" /> Demote to Member
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem variant="destructive" onClick={() => handleRemoveMember(member.id)}>
                                <UserMinus className="h-4 w-4 mr-2" /> Remove from Group
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <div className="mt-4 space-y-3">
              {/* Add Expense Button */}
              <Button onClick={() => {
                setExpenseToEdit(null);
                setAddExpenseOpen(true);
              }} className="gap-2">
                <Plus className="h-4 w-4" /> Add Expense
              </Button>

              {expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="neu-raised flex items-center justify-center w-14 h-14 rounded-2xl mb-4">
                    <Receipt className="h-7 w-7 text-primary" />
                  </div>
                  <p className="font-medium mb-1">No expenses yet</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Add your first expense to start tracking who owes what.
                  </p>
                </div>
              ) : (
                expenses.filter(e => e.type === 'expense').map((expense) => {
                  const splitCount = expense.distribution?.splits?.length || 0;
                  return (
                    <div
                      key={expense.id}
                      onClick={() => {
                        setSelectedExpense(expense);
                        setIsDetailOpen(true);
                      }}
                      className="neu-raised rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 active:scale-[0.98] transition-all group/card"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {/* Category Icon */}
                        <div className="neu-flat flex items-center justify-center h-10 w-10 rounded-xl text-lg shrink-0">
                          {{
                            'Food & Drinks': '🍕', 'Transportation': '🚗', 'Accommodation': '🏨',
                            'Shopping': '🛍️', 'Entertainment': '🎬', 'Utilities': '💡',
                            'Rent': '🏠', 'Healthcare': '🏥', 'Education': '📚', 'Others': '📦',
                          }[expense.category] || '📦'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {expense.description || expense.category}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            Paid by {expense.paid_by === user?.id ? 'you' : expense.paid_by_name}
                            {splitCount > 0 && ` · split ${splitCount} way${splitCount > 1 ? 's' : ''}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <p className="text-sm font-semibold text-primary">
                            {group?.currency} {parseFloat(expense.amount).toFixed(2)}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(expense.transaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                            {' at '}
                            {new Date(expense.created_at || expense.transaction_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {/* Delete dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            onClick={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="h-7 w-7 p-0 border-none inline-flex items-center justify-center rounded-md neu-button text-muted-foreground hover:text-foreground transition-all outline-none"
                          >
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpenseToEdit(expense);
                                setAddExpenseOpen(true);
                              }}
                            >
                              <Receipt className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmAction(
                                  'Delete Expense',
                                  `Are you sure you want to delete "${expense.description || expense.category}"? This will reverse all balance effects.`,
                                  async () => {
                                    const res = await deleteExpense(id, expense.id);
                                    if (res.success) {
                                      toast.success('Expense deleted');
                                      setIsDetailOpen(false);
                                      fetchGroupAndExpenses();
                                    } else toast.error(res.error?.message || 'Failed to delete expense');
                                  },
                                  true
                                );
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </TabsContent>

          {/* Balances Tab */}
          <TabsContent value="balances">
            <div className="mt-4 space-y-4">
              
              {/* Personal Group Summary */}
              {!balancesLoading && balanceSummary && (
                <div className="neu-inset rounded-2xl p-5 grid grid-cols-2 gap-4 mb-2">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">You Are Owed</span>
                    <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {group?.currency} {balanceSummary.user_is_owed.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-col border-l border-border/50 pl-4">
                     <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">You Owe</span>
                    <span className="text-xl font-bold text-red-600 dark:text-red-400">
                      {group?.currency} {balanceSummary.user_owes.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {balancesLoading ? (
                /* Balances Skeleton */
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="neu-raised rounded-2xl p-4 flex items-center justify-between animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-muted rounded-full" />
                        <div className="space-y-2">
                          <div className="h-4 w-32 bg-muted rounded-md" />
                          <div className="h-3 w-20 bg-muted/60 rounded-md" />
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-muted rounded-md" />
                        <div className="h-10 w-10 bg-muted rounded-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : balances.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="neu-raised flex items-center justify-center w-14 h-14 rounded-2xl mb-4">
                    <Scale className="h-7 w-7 text-primary" />
                  </div>
                  <p className="font-medium mb-1">No balances yet</p>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    Once expenses are added and split, you will see who owes whom here.
                  </p>
                </div>
              ) : (
                /* Balances List */
                <div className="space-y-3">
                  {balances.map((balance, index) => {
                    const amInvolved = balance.from_user.id === user?.id || balance.to_user.id === user?.id;
                    const iAmOwed = balance.to_user.id === user?.id;
                    
                    return (
                      <div 
                        key={`${balance.from_user.id}-${balance.to_user.id}-${index}`} 
                        className={`neu-raised rounded-2xl p-4 flex items-center justify-between gap-4 transition-all ${amInvolved ? 'border-l-4 ' + (iAmOwed ? 'border-emerald-500' : 'border-red-500') : ''}`}
                      >
                        {/* Debtor (Owes) */}
                        <div className="flex items-center gap-2 lg:gap-3 flex-1 min-w-0">
                          <Avatar className="h-8 w-8 lg:h-10 lg:w-10 ring-2 ring-red-500/20">
                            {balance.from_user.profile_pic && <AvatarImage src={balance.from_user.profile_pic} alt={balance.from_user.name} />}
                            <AvatarFallback className="text-[10px] lg:text-sm bg-muted text-muted-foreground">
                              {getInitials(balance.from_user.name || balance.from_user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm lg:text-base font-medium truncate">
                              {balance.from_user.id === user?.id ? 'You' : (balance.from_user.name || balance.from_user.email)}
                            </p>
                            <p className="text-[10px] lg:text-xs text-muted-foreground">Owes</p>
                          </div>
                        </div>

                        {/* Amount Badge */}
                        <div className="flex flex-col items-center justify-center shrink-0 px-2 lg:px-4">
                          <div className="neu-flat flex items-center justify-center px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg text-sm lg:text-base font-bold text-primary mb-1">
                            {group?.currency} {balance.amount.toFixed(2)}
                          </div>
                          <ArrowRight className="h-3 w-3 lg:h-4 lg:w-4 text-muted-foreground" />
                        </div>

                        {/* Creditor (Is Owed) */}
                        <div className="flex items-center justify-end gap-2 lg:gap-3 flex-1 min-w-0 text-right">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm lg:text-base font-medium truncate">
                              {balance.to_user.id === user?.id ? 'You' : (balance.to_user.name || balance.to_user.email)}
                            </p>
                            <p className="text-[10px] lg:text-xs text-muted-foreground">Get Back</p>
                          </div>
                          <Avatar className="h-8 w-8 lg:h-10 lg:w-10 ring-2 ring-emerald-500/20">
                            {balance.to_user.profile_pic && <AvatarImage src={balance.to_user.profile_pic} alt={balance.to_user.name} />}
                            <AvatarFallback className="text-[10px] lg:text-sm bg-emerald-500/10 text-emerald-600">
                              {getInitials(balance.to_user.name || balance.to_user.email)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Activity Tab (placeholder) */}
          <TabsContent value="activity">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="neu-raised flex items-center justify-center w-14 h-14 rounded-2xl mb-4">
                <Activity className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium mb-1">No activity yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Group activity will be logged here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Group Dialog */}
      {isAdmin && group && (
        <EditGroupDialog
        group={group}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onGroupUpdated={(updated) => setGroup(updated)}
        />
      )}

      <ExpenseDetailDialog
        expense={selectedExpense}
        members={members}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={(exp) => {
          setIsDetailOpen(false);
          setExpenseToEdit(exp);
          setAddExpenseOpen(true);
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
        <AlertDialogContent className="neu-raised-lg border-none rounded-3xl" style={{ background: 'var(--neu-bg)' }}>
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
        <AlertDialogContent className="neu-raised-lg border-none rounded-3xl" style={{ background: 'var(--neu-bg)' }}>
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
    </div>
  );
}
