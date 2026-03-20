import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Pencil,
  Trash2,
  Calendar,
  Layers,
  Receipt,
  User,
  Info,
  CheckCircle2,
} from 'lucide-react';

export default function ExpenseDetailDialog({
  expense,
  members = [],
  isOpen,
  onClose,
  onEdit,
  onDelete,
}) {
  if (!expense) return null;

  const getInitials = (name) => {
    return name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase() || '?';
  };

  const getMemberName = (split) => {
    // Use backend-enriched data first
    if (split.user_name) return split.user_name;
    // Fallback to members array
    const member = members.find(m => m.id === split.user_id || m.user_id === split.user_id);
    return member?.name || member?.email || 'Group Member';
  };

  const getMemberPic = (split) => {
    // Use backend-enriched data first
    if (split.user_profile_pic) return split.user_profile_pic;
    // Fallback to members array
    const member = members.find(m => m.id === split.user_id || m.user_id === split.user_id);
    return member?.profile_pic;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
    }).format(amount);
  };

  const isSettlement = expense.type === 'settlement';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="neu-raised-lg border-none rounded-3xl max-w-md w-[95vw] overflow-hidden p-0" style={{ background: 'var(--neu-bg)' }}>
        {/* Header/Banner Section */}
        <div className="bg-primary/5 p-6 pb-4 relative">
          

          <div className="flex items-center gap-3 mb-4">
            <div className={`neu-raised p-3 rounded-2xl ${isSettlement ? 'bg-emerald-500/10' : 'bg-white/50'}`}>
              {isSettlement ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
              ) : (
                <Receipt className="h-6 w-6 text-primary" />
              )}
            </div>
            <div>
              <p className={`text-xs font-semibold ${isSettlement ? 'text-emerald-500' : 'text-primary'} uppercase tracking-wider`}>
                {isSettlement ? 'Settlement Details' : 'Expense Details'}
              </p>
              <h2 className="text-xl font-bold truncate pr-8">
                {isSettlement ? 'Payment' : expense.description}
              </h2>
            </div>
          </div>

          <div className="flex flex-col items-start gap-1">
            <span className="text-3xl font-black text-foreground">
              {formatCurrency(expense.amount)}
            </span>
            <Badge variant="secondary" className={`border-none rounded-lg text-[10px] font-bold ${isSettlement ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
              {isSettlement ? 'Debt Settled' : (expense.category || 'General')}
            </Badge>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6 space-y-6">
          {/* Main Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="neu-inset p-3 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Date</span>
              </div>
              <p className="text-sm font-semibold">
                {new Date(expense.transaction_date || expense.created_at).toLocaleDateString('en-IN', { 
                  day: 'numeric', 
                  month: 'short', 
                  year: 'numeric' 
                })}
              </p>
            </div>
            <div className="neu-inset p-3 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Layers className="h-3 w-3" />
                <span className="text-[10px] font-bold uppercase tracking-tight">{isSettlement ? 'Type' : 'Split Method'}</span>
              </div>
              <Badge variant="outline" className={`text-[10px] capitalize ${isSettlement ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-600' : 'border-primary/20 bg-primary/5'}`}>
                {isSettlement ? 'Settlement' : (expense.distribution?.method || 'Equal')}
              </Badge>
            </div>
          </div>

          {/* Paid By Section */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Paid By</h3>
            <div className="neu-raised p-3 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 border-2 border-white/50">
                  <AvatarImage src={expense.paid_by_pic} alt={expense.paid_by_name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {getInitials(expense.paid_by_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-bold">{expense.paid_by_name}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">Full amount paid</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-primary">{formatCurrency(expense.amount)}</p>
              </div>
            </div>
          </div>

          {/* Splits Breakdown */}
          <div className="space-y-3 pb-2">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">
              {isSettlement ? 'Paid To' : 'Split Details'}
            </h3>
            <div className="neu-inset rounded-2xl p-1 overflow-hidden">
              <div className="max-h-[200px] overflow-y-auto px-2 py-1 space-y-2 scrollbar-hide">
                {expense.distribution?.splits?.map((split, idx) => {
                  const userName = getMemberName(split);
                  const userPic = getMemberPic(split);
                  
                  return (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-black/5 last:border-0">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={userPic} alt={userName} />
                          <AvatarFallback className="text-[10px] font-bold bg-muted/30 text-muted-foreground">
                            {getInitials(userName)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">{userName}</span>
                      </div>
                      <span className="text-sm font-bold text-foreground/80">
                        {formatCurrency(split.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 pt-0 flex gap-3">
          <Button
            onClick={() => onEdit(expense)}
            variant="outline"
            className="flex-1 neu-raised border-none font-bold text-sm h-12 rounded-2xl hover:bg-primary/5 transition-all group"
          >
            <Pencil className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            Edit
          </Button>
          <Button
            onClick={() => onDelete(expense)}
            variant="outline"
            className="flex-1 neu-raised border-none font-bold text-sm h-12 rounded-2xl text-destructive hover:bg-destructive/5 transition-all group"
          >
            <Trash2 className="h-4 w-4 mr-2 group-hover:scale-110 transition-transform" />
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
