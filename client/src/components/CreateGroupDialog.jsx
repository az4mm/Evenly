import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Group created successfully!');
      setOpen(false);
      setName('');
      setCurrency('INR');
      onGroupCreated?.(result);
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

  // Default trigger if no children provided
  const trigger = children || (
    <Button className="gap-2 font-medium">
      <Plus className="h-4 w-4" />
      Create Group
    </Button>
  );

  return (
    <>
      <div className="inline-block cursor-pointer" onClick={() => setOpen(true)}>
        {trigger}
      </div>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="neu-raised-lg rounded-3xl border-none" style={{ background: 'var(--neu-bg)' }}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create a new group</DialogTitle>
            <DialogDescription>
              Add a name and pick a currency. You can invite members after creating the group.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="group-name">Group name</Label>
              <Input
                id="group-name"
                placeholder="e.g. Trip to Goa"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
                maxLength={100}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="group-currency">Currency</Label>
              <div className="neu-inset rounded-xl p-0.5">
                <select
                  id="group-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-transparent h-10 px-3 rounded-xl text-sm outline-none cursor-pointer"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Removed inline error rendering since we use Toasts now */}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={loading}
              className="px-6 font-medium gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Group'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
}
