import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

function formatCurrency(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount);
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between items-center neu-flat p-4 rounded-xl gap-4">
      <span className="text-muted-foreground font-medium shrink-0">{label}</span>
      <span className="font-semibold text-right break-all">{value}</span>
    </div>
  );
}

export default function ActivityDetailDialog({ activity, members = [], expenses = [], currency = 'INR', open, onOpenChange }) {
  if (!activity) return null;

  const data = activity.data || {};
  const rawType = activity.type || '';
  const title = rawType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // ── Resolve a member name from the live expenses/members list ──
  function resolveName(userId, fallbackName) {
    if (!userId) return fallbackName || 'Unknown';
    const fromMembers = members.find(m => m.user_id === userId)?.user?.name;
    if (fromMembers) return fromMembers;
    // Check across all expense splits
    for (const ex of expenses) {
      const split = ex.distribution?.splits?.find(s => s.user_id === userId);
      if (split?.user_name) return split.user_name;
    }
    return fallbackName || userId;
  }

  let content = null;

  // ── Expense / Settlement events ──
  // Normalize legacy nested payloads — old expense_deleted stored data inside data.snapshot
  const effectiveData = (() => {
    if (data.snapshot && !data.amount) {
      return { ...data.snapshot, ...data }; // merge snapshot fields to top level, keeping any top-level overrides
    }
    return data;
  })();

  if (rawType.includes('expense') || rawType.includes('settlement')) {
    const d = effectiveData;
    content = (
      <div className="space-y-3">
        {d.description && <Row label="Description" value={d.description} />}
        {d.amount != null && (
          <Row label="Amount" value={<span className="text-lg font-bold">{formatCurrency(d.amount, currency)}</span>} />
        )}
        {d.category && <Row label="Category" value={d.category} />}
        {d.paid_by_name && <Row label="Paid by" value={d.paid_by_name} />}

        {/* Split / Settlement breakdown */}
        {data.distribution?.splits && (
          <div className="neu-flat p-4 rounded-xl">
            <span className="text-muted-foreground font-medium mb-3 block capitalize">
              {rawType.includes('settlement') ? 'Settlement' : `Split · ${data.distribution.method}`}
            </span>
            <div className="space-y-2">
              {data.distribution.splits.map((s, i) => {
                const name = resolveName(s.user_id, s.user_name);
                return (
                  <div key={i} className="flex justify-between text-sm py-1 border-b border-border/10 last:border-0">
                    <span>{name}</span>
                    <span className="font-mono font-medium">{formatCurrency(s.amount, currency)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Change diff for updates */}
        {data.changes && Object.keys(data.changes).length > 0 && (
          <div className="neu-flat p-4 rounded-xl space-y-2">
            <span className="text-muted-foreground font-medium block">What changed</span>
            {Object.entries(data.changes).map(([key, diff]) => {
              const fmt = (v) => (v === null || v === undefined || v === '') ? '(empty)' : String(v);
              return (
                <div key={key} className="text-sm flex flex-wrap items-center gap-1">
                  <span className="capitalize font-semibold">{key}:</span>
                  <span className="text-muted-foreground line-through">{fmt(diff.old)}</span>
                  <span className="text-emerald-500">→ {fmt(diff.new)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );

  // ── Member events (joined, left, removed, promoted, demoted) ──
  } else if (rawType.startsWith('member_')) {
    const targetName = data.target_user_name || resolveName(data.target_user_id, null);
    content = (
      <div className="space-y-3">
        {data.group_name && <Row label="Group" value={data.group_name} />}
        {targetName && rawType !== 'member_joined' && rawType !== 'member_left' && (
          <Row label="Member" value={targetName} />
        )}
        {data.new_role && (
          <Row label="New Role" value={<span className="capitalize font-bold">{data.new_role}</span>} />
        )}
        {!targetName && !data.group_name && !data.new_role && (
          <div className="py-8 text-center text-muted-foreground text-sm">No additional data.</div>
        )}
      </div>
    );

  // ── Group events ──
  } else if (rawType.startsWith('group_')) {
    content = (
      <div className="space-y-3">
        {data.group_name && <Row label="Group Name" value={data.group_name} />}
        {data.currency && <Row label="Currency" value={data.currency} />}
        {data.changes && Object.keys(data.changes).length > 0 && (
          <div className="neu-flat p-4 rounded-xl space-y-2">
            <span className="text-muted-foreground font-medium block">What changed</span>
            {Object.entries(data.changes).map(([key, diff]) => {
              const fmt = (v) => (v === null || v === undefined || v === '') ? '(empty)' : String(v);
              return (
              <div key={key} className="text-sm flex flex-wrap items-center gap-1">
                <span className="capitalize font-semibold">{key}:</span>
                <span className="text-muted-foreground line-through">{fmt(diff.old)}</span>
                <span className="text-emerald-500">→ {fmt(diff.new)}</span>
              </div>
              );
            })}
          </div>
        )}
      </div>
    );

  // ── Fallback ──
  } else {
    const keys = Object.keys(data).filter(k => !k.includes('_id'));
    content = (
      <div className="space-y-3">
        {keys.map(key => (
          <Row key={key} label={key.replace(/_/g, ' ')} value={
            typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key])
          } />
        ))}
        {keys.length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">No additional data recorded.</div>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="neu-raised-lg border-none rounded-3xl w-[95vw] max-w-lg p-0 overflow-hidden"
        style={{ background: 'var(--neu-bg)' }}
      >
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">{title}</DialogTitle>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {/* Meta row */}
          <div className="neu-inset p-4 rounded-2xl grid grid-cols-2 gap-y-2 text-sm">
            <div className="text-muted-foreground font-medium">By</div>
            <div className="font-medium">{activity.user?.name || activity.user?.email || 'Unknown'}</div>
            <div className="text-muted-foreground font-medium">When</div>
            <div className="font-medium">{format(new Date(activity.created_at), 'PP p')}</div>
          </div>

          {/* Dynamic content */}
          <div className="max-h-[55vh] overflow-y-auto space-y-3 pr-1">
            {content}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
