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
import { createGroup } from '@/services/groups';
import { Plus } from 'lucide-react';

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
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();

    const trimmed = name.trim();
    if (!trimmed) {
      setError('Group name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await createGroup({ name: trimmed, currency });

      if (result.error) {
        setError(result.error);
        return;
      }

      setOpen(false);
      setName('');
      setCurrency('INR');
      onGroupCreated?.(result);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleOpenChange(nextOpen) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setName('');
      setCurrency('INR');
      setError('');
    }
  }

  // Default trigger if no children provided
  const trigger = children || (
    <button className="neu-button h-10 px-4 rounded-xl text-sm font-medium flex items-center gap-2 text-primary cursor-pointer">
      <Plus className="h-4 w-4" />
      Create Group
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={trigger} />
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
              <div className="neu-inset rounded-xl p-0.5">
                <input
                  id="group-name"
                  placeholder="e.g. Trip to Goa"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                  maxLength={100}
                  className="w-full bg-transparent h-10 px-3 rounded-xl text-sm outline-none"
                />
              </div>
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

            {error && (
              <div className="neu-inset rounded-xl p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <button
              type="submit"
              disabled={loading}
              className="neu-button h-10 px-6 rounded-xl text-sm font-medium text-primary disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
