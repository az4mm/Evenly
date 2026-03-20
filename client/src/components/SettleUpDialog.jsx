import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, ArrowRight, Calendar as CalendarIcon, CheckCircle2, ChevronDown } from 'lucide-react';
import { addExpense, updateExpense } from '@/services/expenses';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function enforce2dp(value) {
  const match = value.match(/^\d*\.?\d{0,2}/);
  return match ? match[0] : '';
}

export default function SettleUpDialog({ open, onOpenChange, groupId, balance, expenseToEdit, members = [], currentUser, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [loading, setLoading] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);

  // Free-form mode: no preset balance and not editing
  const isFreeForm = !balance && !expenseToEdit;

  useEffect(() => {
    if (open) {
      if (expenseToEdit) {
        setAmount(String(expenseToEdit.amount));
        setTransactionDate(new Date(expenseToEdit.transaction_date || Date.now()));
      } else if (balance) {
        setAmount(String(balance.amount));
        setTransactionDate(new Date());
      } else {
        // Free-form mode
        setAmount('');
        setSelectedMemberId('');
        setTransactionDate(new Date());
      }
    } else {
      // Allow closing animation to run before resetting state
      setTimeout(() => {
        setAmount('');
        setSelectedMemberId('');
        setLoading(false);
      }, 300);
    }
  }, [open, balance, expenseToEdit]);

  // In free-form mode, we still need at least currentUser
  if (!isFreeForm && !balance && !expenseToEdit) return null;

  // Determine payer and receiver
  let fromUser, toUser;

  if (expenseToEdit) {
    fromUser = { id: expenseToEdit.paid_by, name: expenseToEdit.paid_by_name, profile_pic: expenseToEdit.paid_by_pic };
    toUser = { id: expenseToEdit.distribution.splits[0].user_id, name: expenseToEdit.distribution.splits[0].user_name, profile_pic: expenseToEdit.distribution.splits[0].user_profile_pic };
  } else if (balance) {
    fromUser = balance.from_user;
    toUser = balance.to_user;
  } else {
    // Free-form: payer is always the current user
    fromUser = currentUser ? { id: currentUser.id, name: currentUser.user_metadata?.name || currentUser.email, profile_pic: currentUser.user_metadata?.avatar_url } : { id: '', name: 'You' };
    const selectedMember = members.find(m => m.user_id === selectedMemberId || m.id === selectedMemberId);
    toUser = selectedMember
      ? { id: selectedMember.user_id || selectedMember.id, name: selectedMember.user?.name || selectedMember.name || selectedMember.email, profile_pic: selectedMember.user?.profile_pic || selectedMember.profile_pic }
      : null;
  }

  // Filter out self from member picker
  const otherMembers = members.filter(m => {
    const memberId = m.user_id || m.id;
    return memberId !== (currentUser?.id || fromUser?.id);
  });

  async function handleSubmit(e) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (isFreeForm && !toUser) {
      toast.error('Please select who you are paying');
      return;
    }

    if (!expenseToEdit && balance && parsedAmount > parseFloat(balance.amount)) {
      toast.error('You cannot settle more than the owed amount');
      return;
    }

    setLoading(true);
    
    // Natively supported by the backend dynamic balance algorithm
    const payload = {
      type: 'settlement',
      description: 'Payment',
      category: 'Others',
      amount: parsedAmount,
      paid_by: fromUser.id,
      transaction_date: transactionDate.toISOString(),
      distribution: {
        method: 'exact',
        splits: [
          {
            user_id: toUser.id,
            amount: parsedAmount
          }
        ]
      }
    };

    let res;
    if (expenseToEdit) {
      res = await updateExpense(groupId, expenseToEdit.id, payload);
    } else {
      res = await addExpense(groupId, payload);
    }
    
    setLoading(false);

    if (res.success) {
      toast.success(expenseToEdit ? 'Payment updated' : 'Payment recorded');
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(res.error?.message || 'Failed to save payment');
    }
  }

  // Visual helper
  const renderUser = (user, label) => (
    <div className="flex flex-col items-center gap-2 p-3 neu-inset rounded-2xl w-full">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</span>
      <Avatar className="h-12 w-12 border-2 border-[var(--neu-bg)] bg-[var(--neu-bg)] shadow-[4px_4px_8px_var(--neu-shadow-dark),-4px_-4px_8px_var(--neu-shadow-light)]">
        {user.profile_pic ? (
          <AvatarImage src={user.profile_pic} alt={user.name} />
        ) : (
          <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">
            {getInitials(user.name || user.email)}
          </AvatarFallback>
        )}
      </Avatar>
      <span className="font-semibold text-sm text-center truncate w-full px-2">
        {user.name || user.email}
      </span>
    </div>
  );

  // Member picker for free-form mode
  const renderMemberPicker = () => (
    <div className="flex flex-col items-center gap-2 p-3 neu-inset rounded-2xl w-full relative">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Receiving</span>
      <Popover open={memberPickerOpen} onOpenChange={setMemberPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex flex-col items-center gap-2 w-full hover:bg-black/5 rounded-xl p-1 transition-colors"
          >
            {toUser ? (
              <>
                <Avatar className="h-12 w-12 border-2 border-[var(--neu-bg)] bg-[var(--neu-bg)] shadow-[4px_4px_8px_var(--neu-shadow-dark),-4px_-4px_8px_var(--neu-shadow-light)]">
                  {toUser.profile_pic ? (
                    <AvatarImage src={toUser.profile_pic} alt={toUser.name} />
                  ) : (
                    <AvatarFallback className="text-sm bg-primary/10 text-primary font-bold">
                      {getInitials(toUser.name)}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span className="font-semibold text-sm text-center truncate w-full px-2 flex items-center justify-center gap-1">
                  {toUser.name} <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </span>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-full border-2 border-dashed border-emerald-500/40 flex items-center justify-center bg-emerald-500/5">
                  <span className="text-emerald-500 text-lg">?</span>
                </div>
                <span className="text-sm text-muted-foreground font-medium flex items-center gap-1">
                  Select member <ChevronDown className="h-3 w-3" />
                </span>
              </>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-1 border-none neu-raised shadow-xl rounded-2xl" align="center">
          <div className="max-h-48 overflow-y-auto space-y-0.5">
            {otherMembers.map(member => {
              const mId = member.user_id || member.id;
              const mName = member.user?.name || member.name || member.email;
              const mPic = member.user?.profile_pic || member.profile_pic;
              return (
                <button
                  key={mId}
                  type="button"
                  onClick={() => { setSelectedMemberId(mId); setMemberPickerOpen(false); }}
                  className={cn(
                    'w-full flex items-center gap-3 p-2.5 rounded-xl text-left hover:bg-emerald-500/10 transition-colors',
                    selectedMemberId === mId && 'bg-emerald-500/10 ring-1 ring-emerald-500/30'
                  )}
                >
                  <Avatar className="h-8 w-8">
                    {mPic && <AvatarImage src={mPic} alt={mName} />}
                    <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                      {getInitials(mName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium truncate">{mName}</span>
                </button>
              );
            })}
            {otherMembers.length === 0 && (
              <div className="py-4 text-center text-sm text-muted-foreground">No other members</div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden neu-raised-lg border-none">
        
        {/* Header Ribbon */}
        <div className="bg-emerald-500/10 p-6 flex flex-col items-center justify-center border-b border-emerald-500/20">
          <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-3xl font-bold tracking-tight text-center relative">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/70 drop-shadow-sm dark:drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
              {isFreeForm ? 'Record Payment' : 'Settle Up'}
            </span>
          </DialogTitle>
          <DialogDescription className="text-center mt-2 font-medium">
            Record a payment between members
          </DialogDescription>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Members Visualizer */}
          <div className="flex items-center justify-between gap-1">
            {renderUser(fromUser, "Paying")}
            
            <div className="flex flex-col items-center justify-center text-muted-foreground px-1 shrink-0">
              <ArrowRight className="h-5 w-5 text-emerald-500 animate-pulse mb-1" />
              <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full uppercase tracking-wider">Pays</span>
            </div>

            {isFreeForm ? renderMemberPicker() : renderUser(toUser, "Receiving")}
          </div>

          <div className="space-y-5 pt-2">
             {/* Amount Input */}
             <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground ml-1">Payment Amount</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-xl">₹</span>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(enforce2dp(e.target.value))}
                  className="pl-9 text-2xl font-bold h-16 neu-inset border-none rounded-xl bg-transparent focus-visible:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Date Input */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider font-semibold text-muted-foreground ml-1">Payment Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-medium text-base neu-inset h-14 rounded-xl px-4 border-none hover:bg-transparent',
                      !transactionDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-3 h-5 w-5 opacity-70" />
                    {transactionDate ? format(transactionDate, 'PPP') : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-none neu-raised shadow-xl rounded-2xl" align="start">
                  <Calendar
                    mode="single"
                    selected={transactionDate}
                    onSelect={(d) => d && setTransactionDate(d)}
                    initialFocus
                    className="p-3 bg-[var(--neu-bg)] rounded-2xl"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={loading || !amount || parseFloat(amount) <= 0 || (isFreeForm && !toUser)}
              className="w-full h-14 text-lg font-bold tracking-wide rounded-xl text-emerald-600 hover:text-emerald-500 shadow-[0_4px_14px_rgba(16,185,129,0.4)] transition-all border-none"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {!loading && (expenseToEdit ? 'Update Payment' : 'Record Payment')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
