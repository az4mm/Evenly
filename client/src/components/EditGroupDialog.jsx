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
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { updateGroup } from '@/services/groups';
import { toast } from 'sonner';

const CURRENCIES = [
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'JPY', label: 'JPY - Japanese Yen' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
];

export default function EditGroupDialog({ group, open, onOpenChange, onGroupUpdated }) {
  const [name, setName] = useState(group.name);
  const [currency, setCurrency] = useState(group.currency);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setName(group.name);
      setCurrency(group.currency);
      setError('');
    }
  }, [open, group.name, group.currency]);

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
      <DialogContent className="neu-raised-lg rounded-3xl border-none max-w-md w-[90vw]" style={{ background: 'var(--neu-bg)' }}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">Edit group</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update the group name or currency. Currency can only be changed if no transactions exist.
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
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-group-currency" className="text-sm font-medium ml-1">
                Base Currency
              </Label>
              <Select value={currency} onValueChange={setCurrency}>
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

            {error && (
              <div className="neu-inset rounded-2xl p-4 bg-destructive/5 border border-destructive/10 animate-in fade-in zoom-in duration-200">
                <p className="text-sm text-destructive font-medium">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              className="h-12 px-8 font-semibold text-base w-full sm:w-auto"
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

