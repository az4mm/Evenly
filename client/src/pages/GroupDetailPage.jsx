import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getGroup, getMembers, removeMember, updateMemberRole, deleteGroup } from '@/services/groups';
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
} from 'lucide-react';
import { toast } from 'sonner';

export default function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Alert Dialog State
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertConfig, setAlertConfig] = useState({ title: '', description: '', onConfirm: null, destructive: false });

  function confirmAction(title, description, onConfirm, destructive = false) {
    setAlertConfig({ title, description, onConfirm, destructive });
    setAlertOpen(true);
  }

  async function fetchData() {
    try {
      const [groupRes, membersRes] = await Promise.all([
        getGroup(id),
        getMembers(id),
      ]);

      if (groupRes.success) {
        setGroup(groupRes.data);
      } else {
        setError(groupRes.error?.message || 'Failed to load group');
        return;
      }

      if (membersRes.success) {
        setMembers(membersRes.data);
      }
    } catch {
      setError('Something went wrong loading group details.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [id]);

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
      fetchData();
    } else toast.error(res.error?.message || 'Failed to promote member');
  }

  async function handleDemote(memberId) {
    const res = await updateMemberRole(id, memberId, 'member');
    if (res.success) {
      toast.success('Admin demoted to member');
      fetchData();
    } else toast.error(res.error?.message || 'Failed to demote member');
  }

  async function handleRemoveMember(memberId) {
    confirmAction(
      'Remove Member',
      'Are you sure you want to remove this member from the group?',
      async () => {
        const res = await removeMember(id, memberId);
        if (res.success) {
          toast.success('Member removed');
          fetchData();
        } else toast.error(res.error?.message || 'Failed to remove member');
      },
      true // destructive
    );
  }

  async function handleLeave() {
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
              <h1 className="text-3xl font-bold tracking-tight">{group.name}</h1>

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
                    {isAdmin && (
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
        <div className="neu-inset h-[3px] rounded-full" />

        {/* ─── Tabs ─── */}
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">
              <Users className="h-4 w-4" /> Members
            </TabsTrigger>
            <TabsTrigger value="expenses">
              <Receipt className="h-4 w-4" /> Expenses
            </TabsTrigger>
            <TabsTrigger value="balances">
              <Scale className="h-4 w-4" /> Balances
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4" /> Activity
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members">
            <div className="space-y-3 mt-4">
              {/* Removed memberError rendering since we use Toasts now */}
              {members.map((member) => {
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
                          <DropdownMenuTrigger
                            render={
                              <Button variant="outline" className="h-7 w-7 p-0 border-none">
                                <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            }
                          />
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
              })}
            </div>
          </TabsContent>

          {/* Expenses Tab (placeholder) */}
          <TabsContent value="expenses">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="neu-raised flex items-center justify-center w-14 h-14 rounded-2xl mb-4">
                <Receipt className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium mb-1">No expenses yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Expenses will appear here once the feature is built.
              </p>
            </div>
          </TabsContent>

          {/* Balances Tab (placeholder) */}
          <TabsContent value="balances">
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="neu-raised flex items-center justify-center w-14 h-14 rounded-2xl mb-4">
                <Scale className="h-7 w-7 text-primary" />
              </div>
              <p className="font-medium mb-1">No balances to show</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Balances will be calculated once expenses are added.
              </p>
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
          onGroupUpdated={() => fetchData()}
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
              onClick={alertConfig.onConfirm}
              className={`neu-button h-11 px-6 rounded-xl border-none font-medium ${alertConfig.destructive ? 'text-destructive' : 'text-primary'}`}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
