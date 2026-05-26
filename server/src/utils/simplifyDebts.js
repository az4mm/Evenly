/**
 * Minimum Cash Flow Algorithm (Debt Simplification)
 * 
 * Takes an array of raw balance objects and returns a simplified array
 * of balances that minimizes the total number of transactions.
 * 
 * @param {Array} rawBalances - Array of objects with { from_user: {}, to_user: {}, amount: number }
 * @returns {Array} - Simplified array of balances in the same format
 */
export function simplifyBalances(rawBalances) {
  if (!rawBalances || rawBalances.length === 0) return [];

  // Step 1: Calculate net balance for each user
  const netBalances = new Map(); // userId -> { user: object, net: number }

  for (const balance of rawBalances) {
    const fromId = balance.from_user.id;
    const toId = balance.to_user.id;
    const amount = parseFloat(balance.amount);

    if (!netBalances.has(fromId)) {
      netBalances.set(fromId, { user: balance.from_user, net: 0 });
    }
    if (!netBalances.has(toId)) {
      netBalances.set(toId, { user: balance.to_user, net: 0 });
    }

    // Debtor pays (net decreases)
    netBalances.get(fromId).net -= amount;
    // Creditor receives (net increases)
    netBalances.get(toId).net += amount;
  }

  // Step 2: Separate into creditors (positive net) and debtors (negative net)
  const creditors = [];
  const debtors = [];

  for (const [userId, data] of netBalances.entries()) {
    if (data.net > 0.01) {
      creditors.push({ user: data.user, amount: data.net });
    } else if (data.net < -0.01) {
      debtors.push({ user: data.user, amount: Math.abs(data.net) });
    }
  }

  // Sort descending to match largest debtors with largest creditors (greedy approach)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => b.amount - a.amount);

  // Step 3: Greedily settle debts
  const simplified = [];
  let i = 0; // debtors index
  let j = 0; // creditors index

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settleAmount = Math.min(debtor.amount, creditor.amount);

    simplified.push({
      from_user: debtor.user,
      to_user: creditor.user,
      amount: parseFloat(settleAmount.toFixed(2)),
      // In simplified view, updated_at doesn't have a single source, so we use current time or null
      updated_at: new Date().toISOString()
    });

    debtor.amount -= settleAmount;
    creditor.amount -= settleAmount;

    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  return simplified;
}
