import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateGroup } from '@/services/groups';
import { toast } from 'sonner';
import { UserMinus, Trash2 } from 'lucide-react';

const CURRENCIES = [
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
];

export default function EditGroupDialog({ 
  group, 
  open, 
  onOpenChange, 
  onGroupUpdated,
  isAdmin = true,
  isCreator = false,
  onLeaveGroup,
  onDeleteGroup
}) {
  const [name, setName] = useState(group.name);
  const [currency, setCurrency] = useState(group.currency);
  const [simplifyDebts, setSimplifyDebts] = useState(Boolean(group.simplify_debts));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(group.name);
      setCurrency(group.currency);
      setSimplifyDebts(Boolean(group.simplify_debts));
      setError('');
    }
  }, [open, group.name, group.currency, group.simplify_debts]);

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Group name is required');
      return;
    }

    const updates = {};
    if (trimmed !== group.name) updates.name = trimmed;
    if (currency !== group.currency) updates.currency = currency;
    if (simplifyDebts !== Boolean(group.simplify_debts)) updates.simplify_debts = simplifyDebts;

    if (Object.keys(updates).length === 0) {
      onOpenChange(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await updateGroup(group.id, updates);

      if (result.success) {
        toast.success('Group updated successfully');
        onOpenChange(false);
        onGroupUpdated?.(result.data);
      } else {
        setError(result.error?.message || 'Failed to update group');
        toast.error(result.error?.message || 'Failed to update group');
      }
    } catch {
      const msg = 'Something went wrong. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="neu-raised-lg rounded-3xl max-w-md w-[90vw] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">Group Settings</DialogTitle>
            <DialogDescription className="sr-only">
              Group settings and destructive actions
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-8">
            <div className="grid gap-2">
              <Label htmlFor="edit-group-name" className="text-sm font-medium ml-1">
                Group name
              </Label>
              <Input
                id="edit-group-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={100}
                placeholder="Ex: Trip to Paris"
                className="h-12"
                disabled={!isAdmin}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-group-currency" className="text-sm font-medium ml-1">
                Base Currency
              </Label>
              <Select value={currency} onValueChange={setCurrency} disabled={!isAdmin}>
                <SelectTrigger id="edit-group-currency" className="h-12">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="neu-raised-lg border-none rounded-2xl">
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="rounded-xl focus:bg-primary/10">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-row items-center justify-between rounded-2xl border border-border/50 p-4 neu-inset">
              <div className="space-y-1">
                <Label htmlFor="simplify-debts" className="text-base font-semibold">
                  Simplify Debts
                </Label>
                <p className="text-sm text-muted-foreground">
                  Minimize the number of transactions required to settle up.
                </p>
              </div>
              <Switch
                id="simplify-debts"
                checked={simplifyDebts}
                onCheckedChange={setSimplifyDebts}
                disabled={!isAdmin}
              />
            </div>

            {/* Destructive Actions */}
            <div className="space-y-3 pt-4 border-t border-border/50">
              
              {!isCreator && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    onOpenChange(false);
                    onLeaveGroup?.();
                  }}
                >
                  <UserMinus className="h-4 w-4 mr-2" />
                  Leave Group
                </Button>
              )}

              {isCreator && (
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    onOpenChange(false);
                    onDeleteGroup?.();
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Group
                </Button>
              )}
            </div>

            {error && (
              <div className="neu-inset rounded-2xl p-4 bg-destructive/5 border border-destructive/10 animate-in fade-in zoom-in duration-200">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}
          </div>

          {isAdmin && (
            <DialogFooter>
              <Button
                type="submit"
                disabled={loading}
                className="h-12 px-8 font-semibold text-base w-full sm:w-auto"
              >
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

