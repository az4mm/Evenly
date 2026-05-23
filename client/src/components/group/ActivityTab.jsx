import { Button } from '@/components/ui/button';
import {
  Activity,
  Receipt,
  Trash2,
  CheckCircle2,
  Users,
  Settings,
  UserPlus,
  LogOut,
  UserMinus,
  Shield,
  ShieldOff,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ActivityTab({
  activities,
  expenses,
  members,
  group,
  currentUserId,
  hasMoreActivities,
  loadingMoreActivities,
  onLoadMore,
  onActivityClick,
}) {
  return (
    <div className="mt-4 space-y-4">
      {activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="neu-raised flex items-center justify-center w-14 h-14 rounded-2xl mb-4">
            <Activity className="h-7 w-7 text-primary" />
          </div>
          <p className="font-medium mb-1">No activity yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Group activity will be logged here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => {
            let Icon = Activity;
            let text = activity.type ? activity.type.replace(/_/g, ' ') : 'performed an action';
            let iconColor = 'text-primary';
            let impactText = null;
            let impactColor = 'text-muted-foreground';
            let actionSubject = null;
            
            // Only open detail modal for activities that have meaningful extra data
            const hasDetail = ['expense_added', 'expense_updated', 'expense_deleted', 'settlement_recorded', 'settlement_updated', 'settlement_deleted', 'group_updated'].includes(activity.type);

            const data = activity.data || {};
            const isSelf = activity.user?.id === currentUserId;
            const actorName = isSelf ? 'You' : activity.user?.name;

            // Helper: resolve description from multiple possible legacy payload locations
            const resolveDesc = () => {
              return data.description
                || data.category
                || data.snapshot?.description
                || data.snapshot?.category
                || data.snapshot_after?.description
                || data.snapshot_after?.category
                || data.changes?.description?.new
                || null;
            };

            const fmt = new Intl.NumberFormat('en-IN', { style: 'currency', currency: group?.currency || 'INR' });

            if (activity.type === 'expense_added') {
              Icon = Receipt;
              const desc = resolveDesc();
              const amt = data.amount || data.snapshot?.amount;
              text = desc ? `added "${desc}"` : 'added an expense';
              if (amt) text += ` · ${fmt.format(amt)}`;
            }
            else if (activity.type === 'expense_updated') {
              Icon = Receipt;
              const desc = resolveDesc();
              const amt = data.amount || data.snapshot_after?.amount || data.snapshot?.amount;
              text = desc ? `updated "${desc}"` : 'updated an expense';
              if (amt) text += ` · ${fmt.format(amt)}`;
            }
            else if (activity.type === 'expense_deleted') {
              Icon = Trash2;
              const desc = resolveDesc();
              if (desc) {
                text = `deleted "${desc}"`;
              } else {
                // Last resort: show amount or payer for context
                const delAmount = data.amount || data.snapshot?.amount;
                const delPayer = data.paid_by_name || data.snapshot?.paid_by_name;
                text = delAmount ? `deleted an expense of ${fmt.format(delAmount)}` : `deleted an expense${delPayer ? ` by ${delPayer}` : ''}`;
              }
              iconColor = 'text-red-500';
            }
            else if (activity.type === 'settlement_recorded') { Icon = CheckCircle2; text = `recorded a settlement`; iconColor = 'text-emerald-500'; }
            else if (activity.type === 'settlement_updated') { Icon = CheckCircle2; text = `updated a settlement`; iconColor = 'text-emerald-500'; }
            else if (activity.type === 'settlement_deleted') { Icon = Trash2; text = `deleted a settlement`; iconColor = 'text-red-500'; }
            else if (activity.type === 'group_created') { Icon = Users; text = `created the group`; }
            else if (activity.type === 'group_updated') { Icon = Settings; text = `updated group settings`; }
            else if (activity.type === 'member_joined') { Icon = UserPlus; text = `joined the group`; iconColor = 'text-emerald-500'; }
            else if (activity.type === 'member_left') { Icon = LogOut; text = `left the group`; iconColor = 'text-red-500'; }
            else if (activity.type === 'member_removed') { Icon = UserMinus; text = `removed ${data.target_user_name || 'a member'}`; iconColor = 'text-red-500'; }
            else if (activity.type === 'member_promoted') { Icon = Shield; text = `promoted ${data.target_user_name || 'a member'} to Admin`; iconColor = 'text-primary'; }
            else if (activity.type === 'member_demoted') { Icon = ShieldOff; text = `demoted ${data.target_user_name || 'a member'}`; iconColor = 'text-muted-foreground'; }

            if (activity.transaction_id && expenses) {
              const tx = expenses.find(e => e.id === activity.transaction_id);
              if (tx) {
                const isPayer = tx.paid_by === currentUserId;
                const mySplit = tx.distribution?.splits?.find(s => s.user_id === currentUserId);
                const otherSplit = tx.distribution?.splits?.find(s => s.user_id !== tx.paid_by);
                const myShareAmount = mySplit ? parseFloat(mySplit.amount) : 0;
                const totalAmount = parseFloat(tx.amount);
                
                if (tx.type === 'settlement') {
                  const customPayer = isPayer ? 'You' : (tx.paid_by_name || data.paid_by_name || 'Someone');
                  const customReceiver = otherSplit?.user_id === currentUserId ? 'you' : (otherSplit?.user_name || 'someone');
                  
                  if (activity.type === 'settlement_recorded') {
                     actionSubject = <><span className="font-bold">{customPayer}</span> paid {customReceiver} <span className="font-semibold">{fmt.format(totalAmount)}</span></>;
                  }
                  if (isPayer) {
                    impactText = `You paid ${fmt.format(totalAmount)}`;
                    impactColor = 'text-emerald-500';
                  } else if (myShareAmount > 0) {
                    impactText = `You received ${fmt.format(totalAmount)}`;
                    impactColor = 'text-emerald-500';
                  }
                } else {
                  if (isPayer) {
                    const iGetBack = totalAmount - myShareAmount;
                    if (iGetBack > 0) {
                      impactText = `You get back ${fmt.format(iGetBack)}`;
                      impactColor = 'text-emerald-500';
                    } else {
                      impactText = `You paid ${fmt.format(totalAmount)}`;
                      impactColor = 'text-muted-foreground';
                    }
                  } else if (myShareAmount > 0) {
                    impactText = `You owe ${fmt.format(myShareAmount)}`;
                    impactColor = 'text-orange-500';
                  }
                }
              }
            }

            // Fallback: when the linked transaction was deleted but we have data in the activity log itself
            if (!actionSubject && (activity.type === 'settlement_recorded' || activity.type === 'settlement_deleted' || activity.type === 'settlement_updated')) {
              // Try to resolve names from the activity data payload
              const payerName = data.paid_by_name || actorName;
              const splits = data.distribution?.splits || data.snapshot?.distribution?.splits || [];
              
              // Resolve receiver: try user_name in splits, then check members, then scan all expenses
              let receiverName = 'someone';
              if (splits.length > 0) {
                const receiverSplit = splits[0];
                if (receiverSplit.user_name) {
                  receiverName = receiverSplit.user_name;
                } else if (receiverSplit.user_id) {
                  // 1. Check current group members
                  if (members) {
                    const memberMatch = members.find(m => m.user_id === receiverSplit.user_id);
                    if (memberMatch?.user?.name) {
                      receiverName = memberMatch.user.name;
                    }
                  }
                  // 2. If still unresolved, scan all expenses for matching user_id
                  if (receiverName === 'someone' && expenses) {
                    for (const ex of expenses) {
                      const match = ex.distribution?.splits?.find(s => s.user_id === receiverSplit.user_id);
                      if (match?.user_name) { receiverName = match.user_name; break; }
                    }
                  }
                  // 3. Check if it's the current user
                  if (receiverSplit.user_id === currentUserId) {
                    receiverName = 'you';
                  }
                }
              }

              if (activity.type === 'settlement_recorded') {
                const displayPayer = isSelf && (payerName === activity.user?.name || payerName === 'You') ? 'You' : payerName;
                const settlementAmt = data.amount || data.snapshot?.amount;
                actionSubject = <><span className="font-bold">{displayPayer}</span> paid {receiverName}{settlementAmt ? <span className="font-semibold"> {fmt.format(settlementAmt)}</span> : ''}</>;
              }
            }

            return (
              <div 
                key={activity.id} 
                onClick={hasDetail ? () => onActivityClick(activity) : undefined}
                className={`neu-flat p-4 rounded-2xl flex items-center justify-between gap-4 transition-all ${hasDetail ? 'group cursor-pointer hover:bg-black/5 active:scale-[0.98]' : ''}`}
              >
                <div className="flex gap-4 items-center min-w-0 flex-1">
                  <div className="flex flex-col items-center shrink-0 w-12 h-12 justify-center neu-inset rounded-xl">
                    <Icon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug truncate">
                      {actionSubject || <><span className="font-bold">{actorName}</span> {text}</>}
                    </p>
                    {impactText && (
                      <p className={`text-sm tracking-tight font-medium ${impactColor} mt-0.5`}>
                        {impactText}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5 tracking-tight">
                      {format(new Date(activity.created_at), 'MMM d, yyyy • h:mm a')}
                    </p>
                  </div>
                </div>
                {hasDetail && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            );
          })}
          
          {hasMoreActivities && (
            <div className="flex justify-center pt-4">
              <Button 
                variant="outline" 
                onClick={onLoadMore} 
                disabled={loadingMoreActivities}
                className="rounded-full px-8 neu-flat hover:neu-inset active:scale-95 transition-all text-muted-foreground hover:text-foreground"
              >
                {loadingMoreActivities ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                ) : (
                  'Load Older Activity'
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
