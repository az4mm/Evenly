import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Receipt,
  Calendar,
  CheckCircle2,
  MoreVertical,
  Trash2,
} from 'lucide-react';

export default function ExpensesTab({
  expenses,
  group,
  currentUserId,
  onAddExpense,
  onRecordPayment,
  onExpenseClick,
  onEditExpense,
  onDeleteExpense,
}) {
  return (
    <div className="mt-4 space-y-3">
      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button onClick={onAddExpense} className="gap-2">
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
        <Button
          variant="outline"
          onClick={onRecordPayment}
          className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-500"
        >
          <CheckCircle2 className="h-4 w-4" /> Record Payment
        </Button>
      </div>

      {expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="neu-raised flex items-center justify-center w-14 h-14 rounded-2xl mb-4">
            <Receipt className="h-7 w-7 text-primary" />
          </div>
          <p className="font-medium mb-1">No expenses yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            Add your first expense to start tracking who owes what.
          </p>
        </div>
      ) : (
        expenses.map((expense) => {
          const splitCount = expense.distribution?.splits?.length || 0;
          return (
            <div
              key={expense.id}
              onClick={() => onExpenseClick(expense)}
              className="neu-raised rounded-2xl p-4 flex items-center justify-between gap-3 cursor-pointer hover:bg-black/5 active:scale-[0.98] transition-all group/card"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Category Icon */}
                {expense.type === 'settlement' ? (
                  <div className="neu-flat flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-500 shrink-0 border border-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                ) : (
                  <div className="neu-flat flex items-center justify-center h-10 w-10 rounded-xl text-lg shrink-0">
                    {{
                      'Food & Drinks': '🍕', 'Transportation': '🚗', 'Accommodation': '🏨',
                      'Shopping': '🛍️', 'Entertainment': '🎬', 'Utilities': '💡',
                      'Rent': '🏠', 'Healthcare': '🏥', 'Education': '📚', 'Others': '📦',
                    }[expense.category] || '📦'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-medium truncate ${expense.type === 'settlement' ? 'text-emerald-500 font-bold' : ''}`}>
                    {expense.type === 'settlement' ? 'Payment' : (expense.description || expense.category)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {expense.type === 'settlement' ? (
                      <>
                        <span className="font-semibold text-foreground">{expense.paid_by === currentUserId ? 'You' : expense.paid_by_name}</span> paid <span className="font-semibold text-foreground">{expense.distribution?.splits?.[0]?.user_name}</span>
                      </>
                    ) : (
                      <>
                        Paid by {expense.paid_by === currentUserId ? 'you' : expense.paid_by_name}
                        {splitCount > 0 && ` · split ${splitCount} way${splitCount > 1 ? 's' : ''}`}
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right shrink-0 flex items-center gap-2">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    {group?.currency} {parseFloat(expense.amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(expense.transaction_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {' at '}
                    {new Date(expense.created_at || expense.transaction_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {/* Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="h-7 w-7 p-0 border-none inline-flex items-center justify-center rounded-md neu-button text-muted-foreground hover:text-foreground transition-all outline-none"
                  >
                    <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditExpense(expense);
                      }}
                    >
                      <Receipt className="h-4 w-4 mr-2" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteExpense(expense);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
