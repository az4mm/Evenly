import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  MoreVertical,
  Shield,
  ShieldOff,
  UserMinus,
} from 'lucide-react';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function MembersTab({
  members,
  membersLoading,
  currentUserId,
  groupCreatedBy,
  isAdmin,
  onPromote,
  onDemote,
  onRemove,
}) {
  if (membersLoading) {
    return (
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
    );
  }

  return (
    <div className="space-y-3 mt-4">
      {members.map((member) => {
        const isSelf = member.id === currentUserId;
        const isMemberCreator = member.id === groupCreatedBy;

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
                      <DropdownMenuItem onClick={() => onPromote(member.id)}>
                        <Shield className="h-4 w-4 mr-2" /> Promote to Admin
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => onDemote(member.id)}>
                        <ShieldOff className="h-4 w-4 mr-2" /> Demote to Member
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onClick={() => onRemove(member.id)}>
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
  );
}
