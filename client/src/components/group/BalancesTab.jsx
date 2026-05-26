import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Scale, Zap } from 'lucide-react';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function BalancesTab({
  balances,
  balanceSummary,
  balancesLoading,
  simplifyDebtsMode,
  group,
  currentUserId,
  onSettleUp,
}) {
  return (
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
          {simplifyDebtsMode && balances.length > 0 && (
            <div className="neu-inset rounded-2xl p-3 flex items-start gap-3 bg-emerald-500/5 border border-emerald-500/20 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="mt-0.5 rounded-full bg-emerald-500/20 p-1.5 text-emerald-600 dark:text-emerald-400">
                <Zap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                  Simplified Balances
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Debts have been optimized to minimize the number of transactions needed.
                </p>
              </div>
            </div>
          )}

          {balances.map((balance, index) => {
            const amInvolved = balance.from_user.id === currentUserId || balance.to_user.id === currentUserId;
            const iAmOwed = balance.to_user.id === currentUserId;

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
                      {balance.from_user.id === currentUserId ? 'You' : (balance.from_user.name || balance.from_user.email)}
                    </p>
                    <p className="text-[10px] lg:text-xs text-muted-foreground">Owes</p>
                  </div>
                </div>

                {/* Amount Badge & Action */}
                <div className="flex flex-col items-center justify-center shrink-0 px-2 lg:px-4">
                  <div className="neu-flat flex items-center justify-center px-2 py-1 lg:px-3 lg:py-1.5 rounded-lg text-sm lg:text-base font-bold text-primary mb-2">
                    {group?.currency} {balance.amount.toFixed(2)}
                  </div>

                  <Button
                    onClick={() => onSettleUp(balance)}
                    size="sm"
                    className="h-7 px-3 text-[10px] uppercase tracking-wider text-emerald-600 hover:text-emerald-500 transition-all rounded-lg font-bold border-none"
                  >
                    Settle Up
                  </Button>
                </div>

                {/* Creditor (Is Owed) */}
                <div className="flex items-center justify-end gap-2 lg:gap-3 flex-1 min-w-0 text-right">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm lg:text-base font-medium truncate">
                      {balance.to_user.id === currentUserId ? 'You' : (balance.to_user.name || balance.to_user.email)}
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
  );
}
