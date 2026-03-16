import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, Receipt, AlertCircle, Equal, ChevronDown } from 'lucide-react';
import { addExpense, updateExpense } from '@/services/expenses';
import { toast } from 'sonner';

const CATEGORIES = [
  'Food & Drinks', 'Transportation', 'Accommodation', 'Shopping',
  'Entertainment', 'Utilities', 'Rent', 'Healthcare', 'Education', 'Others',
];

const CATEGORY_ICONS = {
  'Food & Drinks': '🍕',
  'Transportation': '🚗',
  'Accommodation': '🏨',
  'Shopping': '🛍️',
  'Entertainment': '🎬',
  'Utilities': '💡',
  'Rent': '🏠',
  'Healthcare': '🏥',
  'Education': '📚',
  'Others': '📦',
};

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

/** Enforce max 2 decimal places on a string number value */
function enforce2dp(value) {
  // Allow empty, digits, one dot, up to 2 decimals
  const match = value.match(/^\d*\.?\d{0,2}/);
  return match ? match[0] : '';
}

/** Enforce integer only (no decimals, no negatives) */
function enforceInteger(value) {
  const match = value.match(/^\d*/);
  return match ? match[0] : '';
}

function PaidByDropdown({ members, value, onChange, currentUserId }) {
  const [open, setOpen] = useState(false);
  const selectedMember = members.find((m) => m.id === value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="neu-inset h-10 w-full rounded-xl px-3 flex items-center justify-between text-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <div className="flex items-center gap-2 truncate">
          {selectedMember ? (
            <>
              <Avatar className="h-5 w-5 shrink-0">
                {selectedMember.profile_pic ? (
                  <AvatarImage src={selectedMember.profile_pic} alt={selectedMember.name} />
                ) : (
                  <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                    {getInitials(selectedMember.name || selectedMember.email)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="truncate">
                {selectedMember.name || selectedMember.email}
                {selectedMember.id === currentUserId && (
                  <span className="text-muted-foreground ml-1 text-xs">(you)</span>
                )}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Select member</span>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 neu-raised-lg border-none rounded-xl overflow-hidden py-1 max-h-48 overflow-y-auto" style={{ background: 'var(--neu-bg)' }}>
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                onChange(m.id);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${value === m.id ? 'bg-primary/10 text-primary font-medium' : ''}`}
            >
              <Avatar className="h-6 w-6 shrink-0">
                {m.profile_pic && <AvatarImage src={m.profile_pic} alt={m.name} />}
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {getInitials(m.name || m.email)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate">
                {m.name || m.email}
                {m.id === currentUserId && (
                  <span className="text-muted-foreground ml-1 text-xs">(you)</span>
                )}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AddExpenseDialog({ open, onOpenChange, groupId, members, currentUserId, onExpenseAdded, expenseToEdit }) {
  // ── Form State ──
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Others');
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitMethod, setSplitMethod] = useState('equal');
  const [loading, setLoading] = useState(false);

  // ── Split State ──
  const [includedMembers, setIncludedMembers] = useState({});
  const [exactAmounts, setExactAmounts] = useState({});
  const [percentages, setPercentages] = useState({});
  const [shares, setShares] = useState({});

  const parsedAmount = parseFloat(amount) || 0;

  const includedMembersList = useMemo(
    () => members.filter((m) => includedMembers[m.id]),
    [members, includedMembers]
  );

  // ── Auto-distribute defaults when amount or included members change ──
  useEffect(() => {
    if (!open || parsedAmount <= 0 || includedMembersList.length === 0) return;

    // For percentage: distribute 100% equally across included members (integer)
    if (splitMethod === 'percentage') {
      const perPerson = Math.floor(100 / includedMembersList.length);
      const remainder = 100 - perPerson * includedMembersList.length;
      const newPcts = { ...percentages };
      includedMembersList.forEach((m, i) => {
        newPcts[m.id] = String(i === 0 ? perPerson + remainder : perPerson);
      });
      setPercentages(newPcts);
    }

    // For exact: distribute amount equally across included members (2dp)
    if (splitMethod === 'exact') {
      const perPerson = Math.floor((parsedAmount / includedMembersList.length) * 100) / 100;
      const remainder = Math.round((parsedAmount - perPerson * includedMembersList.length) * 100) / 100;
      const newAmts = { ...exactAmounts };
      includedMembersList.forEach((m, i) => {
        newAmts[m.id] = (i === 0 ? perPerson + remainder : perPerson).toFixed(2);
      });
      setExactAmounts(newAmts);
    }

    // For share: default 1 for each included member
    if (splitMethod === 'share') {
      const newShares = { ...shares };
      includedMembersList.forEach((m) => {
        if (!newShares[m.id]) newShares[m.id] = '1';
      });
      setShares(newShares);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedAmount, splitMethod, open]);

  // ── Reset / populate form on open ──
  useEffect(() => {
    if (open) {
      if (expenseToEdit) {
        setDescription(expenseToEdit.description || '');
        setAmount(String(expenseToEdit.amount || ''));
        setCategory(expenseToEdit.category || 'Others');
        setPaidBy(expenseToEdit.paid_by || currentUserId);

        try {
          if (expenseToEdit.transaction_date) {
            setTransactionDate(new Date(expenseToEdit.transaction_date).toISOString().split('T')[0]);
          }
        } catch { /* ignore */ }

        const dist = expenseToEdit.distribution || {};
        const method = dist.method || 'equal';
        setSplitMethod(method);

        const included = {};
        const exacts = {};
        const pcts = {};
        const shr = {};

        members.forEach((m) => {
          included[m.id] = false;
          exacts[m.id] = '';
          pcts[m.id] = '';
          shr[m.id] = '1';
        });

        (dist.splits || []).forEach((s) => {
          included[s.user_id] = true;
          if (method === 'exact') exacts[s.user_id] = parseFloat(s.amount).toFixed(2);
          if (method === 'percentage') pcts[s.user_id] = String(Math.round(s.percentage));
          if (method === 'share') shr[s.user_id] = String(s.shares);
        });

        setIncludedMembers(included);
        setExactAmounts(exacts);
        setPercentages(pcts);
        setShares(shr);
      } else {
        setDescription('');
        setAmount('');
        setCategory('Others');
        setPaidBy(currentUserId);
        setTransactionDate(new Date().toISOString().split('T')[0]);
        setSplitMethod('equal');

        const included = {};
        const exacts = {};
        const pcts = {};
        const shr = {};
        members.forEach((m) => {
          included[m.id] = true;
          exacts[m.id] = '';
          pcts[m.id] = '';
          shr[m.id] = '1';
        });
        setIncludedMembers(included);
        setExactAmounts(exacts);
        setPercentages(pcts);
        setShares(shr);
      }
    }
  }, [open, members, currentUserId, expenseToEdit]);

  // ── Computed values ──
  const equalPerPerson = useMemo(() => {
    if (includedMembersList.length === 0 || parsedAmount === 0) return 0;
    return parsedAmount / includedMembersList.length;
  }, [parsedAmount, includedMembersList]);

  const computedSplits = useMemo(() => {
    if (includedMembersList.length === 0) return [];
    switch (splitMethod) {
      case 'equal':
        return includedMembersList.map((m) => ({ user_id: m.id }));
      case 'exact':
        return includedMembersList.map((m) => ({
          user_id: m.id,
          amount: parseFloat(exactAmounts[m.id]) || 0,
        }));
      case 'percentage':
        return includedMembersList.map((m) => ({
          user_id: m.id,
          percentage: parseInt(percentages[m.id]) || 0,
        }));
      case 'share':
        return includedMembersList.map((m) => ({
          user_id: m.id,
          shares: parseInt(shares[m.id]) || 0,
        }));
      default:
        return [];
    }
  }, [splitMethod, includedMembersList, exactAmounts, percentages, shares]);

  // UI totals for display/validation
  const uiCalculatedTotal = useMemo(() => {
    if (parsedAmount <= 0 || includedMembersList.length === 0) return 0;
    switch (splitMethod) {
      case 'equal': return parsedAmount;
      case 'exact':
        return includedMembersList.reduce((sum, m) => sum + (parseFloat(exactAmounts[m.id]) || 0), 0);
      case 'percentage': {
        const pctTotal = includedMembersList.reduce((sum, m) => sum + (parseInt(percentages[m.id]) || 0), 0);
        return Math.round((pctTotal / 100) * parsedAmount * 100) / 100;
      }
      case 'share': {
        const totalShares = includedMembersList.reduce((sum, m) => sum + (parseInt(shares[m.id]) || 0), 0);
        if (totalShares === 0) return 0;
        return includedMembersList.reduce((sum, m) => {
          const s = parseInt(shares[m.id]) || 0;
          return sum + Math.round((s / totalShares) * parsedAmount * 100) / 100;
        }, 0);
      }
      default: return 0;
    }
  }, [splitMethod, parsedAmount, includedMembersList, exactAmounts, percentages, shares]);

  const percentageTotal = useMemo(() => {
    if (splitMethod !== 'percentage') return 100;
    return includedMembersList.reduce((sum, m) => sum + (parseInt(percentages[m.id]) || 0), 0);
  }, [splitMethod, includedMembersList, percentages]);

  // Fix float precision: compare as rounded integers (cents)
  // e.g. 20.26 + 20.25 + 20.25 = 60.760000000000002 — rounds to 6076 === 6076 ✓
  const amountCents = Math.round(parsedAmount * 100);
  const totalCents = Math.round(uiCalculatedTotal * 100);
  const isSplitValid = parsedAmount > 0
    && amountCents === totalCents
    && includedMembersList.length > 0
    && (splitMethod !== 'percentage' || percentageTotal === 100);

  // ── Handlers ──
  function toggleMember(memberId) {
    setIncludedMembers((prev) => ({ ...prev, [memberId]: !prev[memberId] }));
  }

  function distributeEqually() {
    if (splitMethod === 'percentage') {
      const perPerson = Math.floor(100 / includedMembersList.length);
      const remainder = 100 - perPerson * includedMembersList.length;
      const newPcts = {};
      members.forEach((m) => {
        if (includedMembers[m.id]) {
          const idx = includedMembersList.findIndex(im => im.id === m.id);
          newPcts[m.id] = String(idx === 0 ? perPerson + remainder : perPerson);
        } else {
          newPcts[m.id] = '';
        }
      });
      setPercentages(newPcts);
    } else if (splitMethod === 'exact') {
      const perPerson = Math.floor((parsedAmount / includedMembersList.length) * 100) / 100;
      const remainder = Math.round((parsedAmount - perPerson * includedMembersList.length) * 100) / 100;
      const newAmts = {};
      members.forEach((m) => {
        if (includedMembers[m.id]) {
          const idx = includedMembersList.findIndex(im => im.id === m.id);
          newAmts[m.id] = (idx === 0 ? perPerson + remainder : perPerson).toFixed(2);
        } else {
          newAmts[m.id] = '';
        }
      });
      setExactAmounts(newAmts);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isSplitValid || loading) return;

    setLoading(true);
    const payload = {
      description: description.trim() || null,
      category,
      amount: parsedAmount,
      paid_by: paidBy,
      transaction_date: transactionDate,
      distribution: { method: splitMethod, splits: computedSplits },
    };

    let result;
    if (expenseToEdit) {
      result = await updateExpense(groupId, expenseToEdit.id, payload);
    } else {
      result = await addExpense(groupId, payload);
    }

    setLoading(false);
    if (result.success) {
      toast.success(expenseToEdit ? 'Expense updated!' : 'Expense added!');
      onExpenseAdded?.();
      onOpenChange(false);
    } else {
      toast.error(result.error?.message || (expenseToEdit ? 'Failed to update expense' : 'Failed to add expense'));
    }
  }

  // Shared input class (no spinner arrows for number via type=text)
  const inputCls = 'h-10';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="neu-raised-lg border-none rounded-3xl max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--neu-bg)' }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            {expenseToEdit ? 'Edit Expense' : 'Add Expense'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {expenseToEdit ? 'Update the details of this expense.' : 'Record a new expense for this group.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="exp-desc">Description</Label>
            <Input
              id="exp-desc"
              className={inputCls}
              placeholder="e.g. Dinner, Uber ride..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Amount + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="exp-amount">Amount *</Label>
              <Input
                id="exp-amount"
                type="text"
                inputMode="decimal"
                className={inputCls}
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(enforce2dp(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-full h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {CATEGORY_ICONS[cat]} {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Paid By + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Paid By</Label>
              <PaidByDropdown
                members={members}
                value={paidBy}
                onChange={setPaidBy}
                currentUserId={currentUserId}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exp-date">Date</Label>
              <Input
                id="exp-date"
                type="date"
                className={inputCls}
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>
          </div>

          {/* ── Split Distribution ── */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Split Between</Label>

            <Tabs value={splitMethod} onValueChange={setSplitMethod}>
              <TabsList className="w-full">
                <TabsTrigger value="equal" className="flex-1">Equal</TabsTrigger>
                <TabsTrigger value="exact" className="flex-1">Exact</TabsTrigger>
                <TabsTrigger value="percentage" className="flex-1">%</TabsTrigger>
                <TabsTrigger value="share" className="flex-1">Shares</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Member list — neumorphic rows */}
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {members.map((m) => {
                const isIncluded = !!includedMembers[m.id];
                return (
                  <div
                    key={m.id}
                    className={`neu-flat flex items-center gap-3 rounded-xl px-3 py-2.5 transition-opacity cursor-pointer select-none ${!isIncluded ? 'opacity-40' : ''}`}
                    onClick={() => toggleMember(m.id)}
                  >
                    {/* Checkbox */}
                    <Checkbox
                      checked={isIncluded}
                      onCheckedChange={() => toggleMember(m.id)}
                      onClick={(e) => e.stopPropagation()}
                    />

                    {/* Avatar + Name */}
                    <Avatar className="h-7 w-7 shrink-0">
                      {m.profile_pic && <AvatarImage src={m.profile_pic} alt={m.name} />}
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                        {getInitials(m.name || m.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate flex-1">
                      {m.name || m.email}
                      {m.id === currentUserId && (
                        <span className="text-muted-foreground ml-1 text-xs">(you)</span>
                      )}
                    </span>

                    {/* Split input per method */}
                    {isIncluded && (
                      <div
                        className="shrink-0 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {splitMethod === 'equal' && (
                          <span className="text-sm font-mono text-primary font-semibold">
                            {equalPerPerson.toFixed(2)}
                          </span>
                        )}
                        {splitMethod === 'exact' && (
                          <Input
                            type="text"
                            inputMode="decimal"
                            className="h-8 w-24 text-right text-sm px-2"
                            placeholder="0.00"
                            value={exactAmounts[m.id] || ''}
                            onChange={(e) =>
                              setExactAmounts((prev) => ({
                                ...prev,
                                [m.id]: enforce2dp(e.target.value),
                              }))
                            }
                          />
                        )}
                        {splitMethod === 'percentage' && (
                          <div className="flex items-center gap-1">
                            <Input
                              type="text"
                              inputMode="numeric"
                              className="h-8 w-16 text-right text-sm px-2"
                              placeholder="0"
                              value={percentages[m.id] || ''}
                              onChange={(e) =>
                                setPercentages((prev) => ({
                                  ...prev,
                                  [m.id]: enforceInteger(e.target.value),
                                }))
                              }
                            />
                            <span className="text-xs text-muted-foreground font-medium">%</span>
                          </div>
                        )}
                        {splitMethod === 'share' && (
                          <Input
                            type="text"
                            inputMode="numeric"
                            className="h-8 w-16 text-right text-sm px-2"
                            placeholder="1"
                            value={shares[m.id] || ''}
                            onChange={(e) =>
                              setShares((prev) => ({
                                ...prev,
                                [m.id]: enforceInteger(e.target.value),
                              }))
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Split Equally helper button */}
            {(splitMethod === 'exact' || splitMethod === 'percentage') && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={distributeEqually}
                className="text-xs gap-1.5 h-8"
              >
                <Equal className="h-3.5 w-3.5" />
                Split Equally
              </Button>
            )}

            {/* Validation summary bar */}
            <div
              className={`neu-inset rounded-xl px-4 py-2.5 flex items-center justify-between text-sm ${
                !isSplitValid && parsedAmount > 0 ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {splitMethod === 'percentage' ? (
                <>
                  <span>Total %</span>
                  <span className="font-mono font-semibold">
                    {percentageTotal}% / 100%
                  </span>
                </>
              ) : (
                <>
                  <span>Split Total</span>
                  <span className="font-mono font-semibold">
                    {uiCalculatedTotal.toFixed(2)} / {parsedAmount.toFixed(2)}
                  </span>
                </>
              )}
            </div>

            {/* Error message */}
            {!isSplitValid && parsedAmount > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3 shrink-0" />
                {includedMembersList.length === 0
                  ? 'Select at least one member'
                  : splitMethod === 'percentage'
                  ? `Percentages must be whole numbers summing to 100% (currently ${percentageTotal}%)`
                  : `Split total (${uiCalculatedTotal.toFixed(2)}) must exactly match amount (${parsedAmount.toFixed(2)})`}
              </p>
            )}
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <DialogClose render={<Button variant="outline" type="button" className="border-none">Cancel</Button>} />
            <Button type="submit" disabled={!isSplitValid || loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {expenseToEdit ? 'Save Changes' : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
