import pool from '../db/database.js';

// ──────────────────────────────────────────────────
//  BALANCE HELPERS  (Application-Level Approach)
// ──────────────────────────────────────────────────

/**
 * Adjust the balance between two users in a group.
 *   debtorId owes creditorId `amount` more.
 *   If amount is negative, the debt direction reverses.
 *
 * Rules:
 *  1. Always store debtor → creditor (amount > 0)
 *  2. Delete record if amount reaches zero
 *  3. Swap from/to if net goes negative
 *  4. One record per (group, user-pair)
 */
async function adjustBalance(client, groupId, debtorId, creditorId, amount) {
  if (debtorId === creditorId || amount === 0) return;

  // Check existing balance in BOTH directions
  const { rows: existing } = await client.query(
    `SELECT id, from_user_id, to_user_id, amount
     FROM balances
     WHERE group_id = $1
       AND ((from_user_id = $2 AND to_user_id = $3)
         OR (from_user_id = $3 AND to_user_id = $2))`,
    [groupId, debtorId, creditorId]
  );

  if (existing.length === 0) {
    // No record yet — create one
    if (amount > 0) {
      await client.query(
        `INSERT INTO balances (group_id, from_user_id, to_user_id, amount)
         VALUES ($1, $2, $3, $4)`,
        [groupId, debtorId, creditorId, amount]
      );
    } else {
      // amount < 0 means creditor actually owes debtor
      await client.query(
        `INSERT INTO balances (group_id, from_user_id, to_user_id, amount)
         VALUES ($1, $2, $3, $4)`,
        [groupId, creditorId, debtorId, Math.abs(amount)]
      );
    }
    return;
  }

  const record = existing[0];
  let newAmount;

  if (record.from_user_id === debtorId && record.to_user_id === creditorId) {
    // Record direction matches: debtor → creditor
    newAmount = parseFloat(record.amount) + amount;
  } else {
    // Record direction is reversed: creditor → debtor
    // Subtracting because the existing record says creditor owes debtor
    newAmount = parseFloat(record.amount) - amount;
  }

  if (Math.abs(newAmount) < 0.01) {
    // Zero — delete the record
    await client.query('DELETE FROM balances WHERE id = $1', [record.id]);
  } else if (newAmount > 0) {
    // Keep same direction as the existing record
    await client.query(
      'UPDATE balances SET amount = $1 WHERE id = $2',
      [newAmount, record.id]
    );
  } else {
    // Negative — swap direction and store absolute value
    const absAmount = Math.abs(newAmount);
    await client.query(
      `UPDATE balances
       SET from_user_id = $1, to_user_id = $2, amount = $3
       WHERE id = $4`,
      [record.to_user_id, record.from_user_id, absAmount, record.id]
    );
  }
}

/**
 * Apply balance effects for an expense transaction.
 *   Each split user (except the payer) owes the payer their split amount.
 *   direction = 1 for adding, -1 for reversing
 */
async function applyExpenseBalances(client, groupId, payerId, splits, direction = 1) {
  for (const split of splits) {
    if (split.user_id === payerId) continue;
    await adjustBalance(client, groupId, split.user_id, payerId, split.amount * direction);
  }
}

// ──────────────────────────────────────────────────
//  VALIDATION HELPERS
// ──────────────────────────────────────────────────

const VALID_CATEGORIES = [
  'Food & Drinks', 'Transportation', 'Accommodation', 'Shopping',
  'Entertainment', 'Utilities', 'Rent', 'Healthcare', 'Education', 'Others'
];

function calculateSplits(amount, method, splits) {
  const totalAmount = parseFloat(amount);
  const numSplits = splits.length;
  if (numSplits === 0) return [];

  switch (method) {
    case 'equal': {
      const perPerson = Math.floor((totalAmount / numSplits) * 100) / 100;
      const remainder = Math.round((totalAmount - perPerson * numSplits) * 100) / 100;
      return splits.map((s, i) => ({
        ...s,
        amount: i === 0 ? perPerson + remainder : perPerson,
      }));
    }
    case 'percentage': {
      return splits.map((s) => ({
        ...s,
        amount: Math.round(((parseFloat(s.percentage) || 0) / 100) * totalAmount * 100) / 100,
      }));
    }
    case 'share': {
      const totalShares = splits.reduce((sum, s) => sum + (parseFloat(s.shares) || 0), 0);
      if (totalShares === 0) {
        return splits.map(s => ({ ...s, amount: 0 }));
      }
      return splits.map((s) => ({
        ...s,
        amount: Math.round((parseFloat(s.shares) / totalShares) * totalAmount * 100) / 100,
      }));
    }
    case 'exact':
      return splits.map(s => ({ ...s, amount: parseFloat(s.amount) || 0 }));
    default:
      return splits;
  }
}

function validateAndCalculateExpense(body, memberIds) {
  const { amount, paid_by, distribution, category } = body;
  const errors = [];
  let calculatedSplits = [];

  const parsedAmount = parseFloat(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
    errors.push('Amount must be a positive number');
  }
  if (!paid_by) {
    errors.push('paid_by is required');
  } else if (!memberIds.includes(paid_by)) {
    errors.push('paid_by must be a group member');
  }
  if (category && !VALID_CATEGORIES.includes(category)) {
    errors.push(`Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
  }
  if (!distribution || !distribution.method || !Array.isArray(distribution.splits) || distribution.splits.length === 0) {
    errors.push('distribution with method and splits is required');
    return { errors, calculatedSplits };
  }

  const validMethods = ['equal', 'exact', 'percentage', 'share'];
  if (!validMethods.includes(distribution.method)) {
    errors.push(`Invalid distribution method. Must be one of: ${validMethods.join(', ')}`);
  }

  for (const split of distribution.splits) {
    if (!split.user_id) {
      errors.push('Each split must have a user_id');
      break;
    }
    if (!memberIds.includes(split.user_id)) {
      errors.push(`Split user ${split.user_id} is not a group member`);
      break;
    }
  }

  if (errors.length > 0) return { errors, calculatedSplits };

  // Calculate the amounts
  calculatedSplits = calculateSplits(parsedAmount, distribution.method, distribution.splits);

  // Validate totals — allow tiny floating-point rounding artefacts only
  const totalSplit = calculatedSplits.reduce((sum, s) => sum + s.amount, 0);
  if (Math.abs(totalSplit - parsedAmount) > 0.005) {
    errors.push(`Total of splits (${totalSplit.toFixed(2)}) does not match expense amount (${parsedAmount.toFixed(2)})`);
  }

  // Method specific deep validation
  if (distribution.method === 'percentage') {
    // Percentages must be integers
    for (const s of distribution.splits) {
      const pct = parseFloat(s.percentage);
      if (!Number.isInteger(pct)) {
        errors.push(`Percentage values must be whole numbers (got ${s.percentage})`);
        break;
      }
    }
    const totalPct = distribution.splits.reduce((sum, s) => sum + (parseInt(s.percentage) || 0), 0);
    if (totalPct !== 100) {
      errors.push(`Percentages must sum to exactly 100% (got ${totalPct}%)`);
    }
  }

  // Exact amounts must have at most 2 decimal places
  if (distribution.method === 'exact') {
    for (const s of distribution.splits) {
      const amt = parseFloat(s.amount);
      if (Math.round(amt * 100) / 100 !== amt) {
        errors.push(`Exact amounts must have at most 2 decimal places (got ${s.amount})`);
        break;
      }
    }
  }

  return { errors, calculatedSplits };
}

// ──────────────────────────────────────────────────
//  CONTROLLERS
// ──────────────────────────────────────────────────

/**
 * POST /api/groups/:id/expenses
 */
export async function addExpense(req, res) {
  const { id: groupId } = req.params;
  const userId = req.user.id;
  const { description, category, amount, paid_by, distribution, transaction_date, type } = req.body;
  const isSettlement = type === 'settlement';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get group member IDs
    const { rows: members } = await client.query(
      'SELECT user_id FROM user_groups WHERE group_id = $1',
      [groupId]
    );
    const memberIds = members.map(m => m.user_id);

    // Validate and Calculate
    const { errors, calculatedSplits } = validateAndCalculateExpense(req.body, memberIds);
    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: errors.join('; ') } });
    }

    const finalDistribution = {
      ...distribution,
      splits: calculatedSplits
    };

    // Insert transaction
    const { rows: [transaction] } = await client.query(
      `INSERT INTO transactions (group_id, description, category, amount, paid_by, distribution, type, created_by, transaction_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [groupId, description || null, category || 'Others', parseFloat(amount), paid_by, finalDistribution, isSettlement ? 'settlement' : 'expense', userId, transaction_date || new Date()]
    );

    // Update balances
    await applyExpenseBalances(client, groupId, paid_by, calculatedSplits, 1);

    // Get payer name for activity log
    const { rows: [payer] } = await client.query('SELECT name FROM users WHERE id = $1', [paid_by]);

    // Log activity
    await client.query(
      `INSERT INTO activity_logs (group_id, user_id, transaction_id, type, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [groupId, userId, transaction.id, isSettlement ? 'settlement_recorded' : 'expense_added', JSON.stringify({
        description: description || null,
        amount: parseFloat(amount),
        paid_by_name: payer.name,
        category: category || 'Others',
        distribution: finalDistribution
      })]
    );

    await client.query('COMMIT');
    res.status(201).json({ success: true, data: transaction });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error adding expense:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to add expense' } });
  } finally {
    client.release();
  }
}

/**
 * GET /api/groups/:id/expenses
 */
export async function listExpenses(req, res) {
  const { id: groupId } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.name AS paid_by_name, u.profile_pic AS paid_by_pic,
              c.name AS created_by_name
       FROM transactions t
       JOIN users u ON t.paid_by = u.id
       JOIN users c ON t.created_by = c.id
       WHERE t.group_id = $1
       ORDER BY t.transaction_date DESC, t.created_at DESC`,
      [groupId]
    );

    // Resolve user info for each split
    if (rows.length > 0) {
      // Collect all unique user IDs from splits
      const splitUserIds = new Set();
      for (const row of rows) {
        if (row.distribution?.splits) {
          for (const split of row.distribution.splits) {
            if (split.user_id) splitUserIds.add(split.user_id);
          }
        }
      }

      if (splitUserIds.size > 0) {
        // Fetch all split users in one query
        const ids = Array.from(splitUserIds);
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
        const { rows: splitUsers } = await pool.query(
          `SELECT id, name, email, profile_pic FROM users WHERE id IN (${placeholders})`,
          ids
        );

        // Build a lookup map
        const userMap = {};
        for (const u of splitUsers) {
          userMap[u.id] = { name: u.name, email: u.email, profile_pic: u.profile_pic };
        }

        // Enrich each split with user info
        for (const row of rows) {
          if (row.distribution?.splits) {
            row.distribution.splits = row.distribution.splits.map(split => ({
              ...split,
              user_name: userMap[split.user_id]?.name || userMap[split.user_id]?.email || 'Unknown',
              user_profile_pic: userMap[split.user_id]?.profile_pic || null,
            }));
          }
        }
      }
    }

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Error listing expenses:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch expenses' } });
  }
}

/**
 * GET /api/groups/:id/expenses/:expenseId
 */
export async function getExpense(req, res) {
  const { id: groupId, expenseId } = req.params;

  try {
    const { rows } = await pool.query(
      `SELECT t.*, u.name AS paid_by_name, u.profile_pic AS paid_by_pic
       FROM transactions t
       JOIN users u ON t.paid_by = u.id
       WHERE t.id = $1 AND t.group_id = $2`,
      [expenseId, groupId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Expense not found' } });
    }

    res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('Error getting expense:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch expense' } });
  }
}

/**
 * PATCH /api/groups/:id/expenses/:expenseId
 */
export async function updateExpense(req, res) {
  const { id: groupId, expenseId } = req.params;
  const userId = req.user.id;
  const { description, category, amount, paid_by, distribution, transaction_date } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get existing transaction
    const { rows: existing } = await client.query(
      'SELECT * FROM transactions WHERE id = $1 AND group_id = $2',
      [expenseId, groupId]
    );

    if (existing.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Expense not found' } });
    }

    const oldTx = existing[0];

    // Get group member IDs
    const { rows: members } = await client.query(
      'SELECT user_id FROM user_groups WHERE group_id = $1',
      [groupId]
    );
    const memberIds = members.map(m => m.user_id);

    // Merge new values over old
    const newAmount = amount !== undefined ? parseFloat(amount) : parseFloat(oldTx.amount);
    const newPaidBy = paid_by || oldTx.paid_by;
    const newDistributionInput = distribution || oldTx.distribution;
    const newCategory = category || oldTx.category;

    // Validate the new state and Calculate splits
    const { errors, calculatedSplits } = validateAndCalculateExpense(
      { amount: newAmount, paid_by: newPaidBy, distribution: newDistributionInput, category: newCategory },
      memberIds
    );
    if (errors.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: errors.join('; ') } });
    }

    const finalDistribution = {
      ...newDistributionInput,
      splits: calculatedSplits
    };

    // 1. Reverse old balance effects
    await applyExpenseBalances(client, groupId, oldTx.paid_by, oldTx.distribution.splits, -1);

    // 2. Apply new balance effects
    await applyExpenseBalances(client, groupId, newPaidBy, calculatedSplits, 1);

    // 3. Update transaction
    const { rows: [updated] } = await client.query(
      `UPDATE transactions
       SET description = $1, category = $2, amount = $3, paid_by = $4, distribution = $5,
           transaction_date = $6, updated_by = $7
       WHERE id = $8
       RETURNING *`,
      [
        description !== undefined ? description : oldTx.description,
        newCategory,
        newAmount,
        newPaidBy,
        finalDistribution,
        transaction_date || oldTx.transaction_date,
        userId,
        expenseId
      ]
    );

    // 4. Log activity
    await client.query(
      `INSERT INTO activity_logs (group_id, user_id, transaction_id, type, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [groupId, userId, expenseId, oldTx.type === 'settlement' ? 'settlement_updated' : 'expense_updated', JSON.stringify({
        changes: {
          ...(amount !== undefined && parseFloat(amount) !== parseFloat(oldTx.amount) ? { amount: { old: parseFloat(oldTx.amount), new: parseFloat(amount) } } : {}),
          ...(description !== undefined && description !== oldTx.description ? { description: { old: oldTx.description, new: description } } : {}),
          ...(category && category !== oldTx.category ? { category: { old: oldTx.category, new: category } } : {}),
        },
        snapshot_before: oldTx,
        snapshot_after: updated
      })]
    );

    await client.query('COMMIT');
    res.json({ success: true, data: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error updating expense:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update expense' } });
  } finally {
    client.release();
  }
}

/**
 * DELETE /api/groups/:id/expenses/:expenseId
 */
export async function deleteExpense(req, res) {
  const { id: groupId, expenseId } = req.params;
  const userId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get existing transaction
    const { rows: existing } = await client.query(
      'SELECT * FROM transactions WHERE id = $1 AND group_id = $2',
      [expenseId, groupId]
    );

    if (existing.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Expense not found' } });
    }

    const oldTx = existing[0];

    // 1. Reverse balance effects
    await applyExpenseBalances(client, groupId, oldTx.paid_by, oldTx.distribution.splits, -1);

    // 2. Get payer name for snapshot
    const { rows: [payer] } = await client.query('SELECT name FROM users WHERE id = $1', [oldTx.paid_by]);

    // 3. Log activity BEFORE deleting (to capture transaction_id)
    await client.query(
      `INSERT INTO activity_logs (group_id, user_id, transaction_id, type, data)
       VALUES ($1, $2, $3, $4, $5)`,
      [groupId, userId, expenseId,
        oldTx.type === 'settlement' ? 'settlement_deleted' : 'expense_deleted',
        JSON.stringify({
          snapshot: {
            description: oldTx.description,
            amount: parseFloat(oldTx.amount),
            paid_by_name: payer.name,
            distribution: oldTx.distribution
          }
        })
      ]
    );

    // 4. Delete transaction
    await client.query('DELETE FROM transactions WHERE id = $1', [expenseId]);

    await client.query('COMMIT');
    res.json({ success: true, data: { message: 'Expense deleted' } });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting expense:', err);
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete expense' } });
  } finally {
    client.release();
  }
}
