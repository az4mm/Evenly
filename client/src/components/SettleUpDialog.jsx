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
import { Loader2, ArrowRight, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
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

export default function SettleUpDialog({ open, onOpenChange, groupId, balance, expenseToEdit, onSuccess }) {
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      if (expenseToEdit) {
        setAmount(String(expenseToEdit.amount));
        setTransactionDate(new Date(expenseToEdit.transaction_date || Date.now()));
      } else if (balance) {
        setAmount(String(balance.amount));
        setTransactionDate(new Date());
      }
    } else {
      // Allow closing animation to run before resetting state
      setTimeout(() => {
        setAmount('');
        setLoading(false);
      }, 300);
    }
  }, [open, balance, expenseToEdit]);

  if (!balance && !expenseToEdit) return null;

  const fromUser = expenseToEdit 
    ? { id: expenseToEdit.paid_by, name: expenseToEdit.paid_by_name, profile_pic: expenseToEdit.paid_by_pic }
    : balance?.from_user;

  const toUser = expenseToEdit
    ? { id: expenseToEdit.distribution.splits[0].user_id, name: expenseToEdit.distribution.splits[0].user_name, profile_pic: expenseToEdit.distribution.splits[0].user_profile_pic }
    : balance?.to_user;

  async function handleSubmit(e) {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);

    if (!parsedAmount || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
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
      toast.success(expenseToEdit ? 'Settlement updated' : 'Settlement recorded');
      onSuccess();
      onOpenChange(false);
    } else {
      toast.error(res.error?.message || 'Failed to save settlement');
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden neu-raised-lg border-none">
        
        {/* Header Ribbon */}
        <div className="bg-emerald-500/10 p-6 flex flex-col items-center justify-center border-b border-emerald-500/20">
          <div className="h-12 w-12 rounded-full bg-emerald-500 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(16,185,129,0.5)]">
            <CheckCircle2 className="h-6 w-6 text-white" />
          </div>
          <DialogTitle className="text-3xl font-bold tracking-tight text-center relative">
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/70 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] dark:drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
              Settle Up
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

            {renderUser(toUser, "Receiving")}
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
              disabled={loading || !amount || parseFloat(amount) <= 0}
              className="w-full h-14 text-lg font-bold tracking-wide rounded-xl bg-emerald-500 hover:bg-emerald-600 focus:bg-emerald-600 text-white shadow-[0_4px_14px_rgba(16,185,129,0.4)] transition-all border-none"
            >
              {loading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
              {!loading && 'Record Payment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
