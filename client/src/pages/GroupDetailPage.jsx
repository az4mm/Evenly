import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getGroup, getMembers, removeMember, updateMemberRole, deleteGroup } from '@/services/groups';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import EditGroupDialog from '@/components/EditGroupDialog';
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
} from 'lucide-react';

export default function GroupDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [memberError, setMemberError] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);

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
      setError('Something went wrong.');
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
    } catch {
      // Fallback — select text approach ignored for now
    }
  }

  async function handlePromote(memberId) {
    setMemberError('');
    const res = await updateMemberRole(id, memberId, 'admin');
    if (res.success) {
      fetchData();
    } else {
      setMemberError(res.error?.message || 'Failed to promote member');
    }
  }

  async function handleDemote(memberId) {
    setMemberError('');
    const res = await updateMemberRole(id, memberId, 'member');
    if (res.success) {
      fetchData();
    } else {
      setMemberError(res.error?.message || 'Failed to demote member');
    }
  }

  async function handleRemoveMember(memberId) {
    if (!confirm('Are you sure you want to remove this member?')) return;
    setMemberError('');
    const res = await removeMember(id, memberId);
    if (res.success) {
      fetchData();
    } else {
      setMemberError(res.error?.message || 'Failed to remove member');
    }
  }

  async function handleLeave() {
    if (!confirm('Are you sure you want to leave this group?')) return;
    const res = await removeMember(id, user.id);
    if (res.success) navigate('/dashboard');
  }

  async function handleDeleteGroup() {
    if (!confirm('Are you sure you want to delete this group? This cannot be undone.')) return;
    const res = await deleteGroup(id);
    if (res.success) navigate('/dashboard');
  }

  function getInitials(name) {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading group...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isAdmin = group?.my_role === 'admin';
  const isCreator = group?.created_by === user?.id;

  return (
    <div className="min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{group.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{group.currency}</Badge>
                <Badge variant="secondary">
                  {group.member_count} {group.member_count === 1 ? 'member' : 'members'}
                </Badge>
                {isAdmin && <Badge>Admin</Badge>}
              </div>
            </div>
          </div>

          {/* Invite code + actions */}
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-mono text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
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
              size="sm"
              onClick={handleCopyInvite}
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1.5" />
                  Copy Invite Link
                </>
              )}
            </Button>

            {/* Group-level actions */}
            {(isAdmin || !isCreator) && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button variant="ghost" size="icon-sm" />}
                >
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Edit Group
                    </DropdownMenuItem>
                  )}
                  {!isCreator && (
                    <DropdownMenuItem onClick={handleLeave}>
                      <UserMinus className="h-4 w-4 mr-2" />
                      Leave Group
                    </DropdownMenuItem>
                  )}
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={handleDeleteGroup}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Group
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <Separator />

        {/* Tabs */}
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="expenses">
              <Receipt className="h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="balances">
              <Scale className="h-4 w-4" />
              Balances
            </TabsTrigger>
            <TabsTrigger value="activity">
              <Activity className="h-4 w-4" />
              Activity
            </TabsTrigger>
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members">
            <div className="space-y-2 mt-4">
              {memberError && (
                <p className="text-sm text-destructive">{memberError}</p>
              )}
              {members.map((member) => {
                const isMemberSelf = member.id === user?.id;
                const isMemberCreator = member.id === group.created_by;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        {member.profile_pic ? (
                          <AvatarImage src={member.profile_pic} alt={member.name} />
                        ) : null}
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {member.name || member.email}
                          {isMemberSelf && (
                            <span className="text-muted-foreground ml-1">(you)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                        {member.role === 'admin' ? 'Admin' : 'Member'}
                      </Badge>

                      {/* Admin actions on other members (not on self, not on creator) */}
                      {isAdmin && !isMemberSelf && !isMemberCreator && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={<Button variant="ghost" size="icon-sm" />}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {member.role === 'member' ? (
                              <DropdownMenuItem onClick={() => handlePromote(member.id)}>
                                <Shield className="h-4 w-4 mr-2" />
                                Promote to Admin
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleDemote(member.id)}>
                                <ShieldOff className="h-4 w-4 mr-2" />
                                Demote to Member
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              <UserMinus className="h-4 w-4 mr-2" />
                              Remove from Group
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
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No expenses yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Expenses will appear here once the feature is built.
              </p>
            </div>
          </TabsContent>

          {/* Balances Tab (placeholder) */}
          <TabsContent value="balances">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Scale className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No balances to show</p>
              <p className="text-sm text-muted-foreground mt-1">
                Balances will be calculated once expenses are added.
              </p>
            </div>
          </TabsContent>

          {/* Activity Tab (placeholder) */}
          <TabsContent value="activity">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Activity className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No activity yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Group activity will be logged here.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Group Dialog (admin only) */}
      {isAdmin && group && (
        <EditGroupDialog
          group={group}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onGroupUpdated={() => fetchData()}
        />
      )}
    </div>
  );
}
