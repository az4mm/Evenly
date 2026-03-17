import { useState } from 'react';
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
import { createGroup } from '@/services/groups';
import { Plus, Loader2 } from 'lucide-react';
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

export default function CreateGroupDialog({ onGroupCreated, children }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      toast.error('Group name is required');
      return;
    }

    setLoading(true);

    try {
      const result = await createGroup({ name: trimmed, currency });

      if (result.success) {
        toast.success('Group created successfully!');
        setOpen(false);
        setName('');
        setCurrency('INR');
        onGroupCreated?.(result.data);
      } else {
        toast.error(result.error?.message || 'Failed to create group');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(nextOpen) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setName('');
      setCurrency('INR');
    }
  }

  const trigger = children || (
    <Button className="gap-2 font-medium">
      <Plus className="h-4 w-4" />
      Create Group
    </Button>
  );

  return (
    <>
      <div className="inline-block" onClick={() => setOpen(true)}>
        {trigger}
      </div>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="neu-raised-lg rounded-3xl border-none max-w-md w-[90vw]" style={{ background: 'var(--neu-bg)' }}>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold tracking-tight">Create a new group</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Add a name and pick a currency. You can invite members after creating the group.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-6 py-8">
              <div className="grid gap-2">
                <Label htmlFor="group-name" className="text-sm font-medium ml-1">
                  Group name
                </Label>
                <Input
                  id="group-name"
                  placeholder="e.g. Trip to Goa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  maxLength={100}
                  className="h-12"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="group-currency" className="text-sm font-medium ml-1">
                  Base Currency
                </Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger id="group-currency" className="h-12">
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
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={loading}
                className="h-12 px-8 font-semibold text-base w-full sm:w-auto gap-2"
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                {loading ? 'Creating Group...' : 'Create Group'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

