import pool from '../db/database.js';

export const getUserOverallBalances = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get total amount the user owes others across all groups
    const oweResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_owe 
       FROM balances 
       WHERE from_user_id = $1`,
      [userId]
    );

    // Get total amount others owe the user across all groups
    const owedResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total_owed 
       FROM balances 
       WHERE to_user_id = $1`,
      [userId]
    );

    const totalOwe = parseFloat(oweResult.rows[0].total_owe);
    const totalOwed = parseFloat(owedResult.rows[0].total_owed);
    const netBalance = totalOwed - totalOwe;

    res.json({
      success: true,
      data: {
        total_owe: totalOwe,
        total_owed: totalOwed,
        net_balance: netBalance,
      },
    });
  } catch (error) {
    console.error('Error fetching overall balances:', error);
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};

export const getGroupBalances = async (req, res) => {
  try {
    const { id: groupId } = req.params;
    const userId = req.user.id;

    // Fetch all balances for this group with user details
    const result = await pool.query(
      `SELECT 
         b.amount,
         b.updated_at,
         u_from.id as from_user_id, 
         u_from.name as from_user_name, 
         u_from.email as from_user_email, 
         u_from.profile_pic as from_user_pic,
         u_to.id as to_user_id, 
         u_to.name as to_user_name, 
         u_to.email as to_user_email, 
         u_to.profile_pic as to_user_pic
       FROM balances b
       JOIN users u_from ON b.from_user_id = u_from.id
       JOIN users u_to ON b.to_user_id = u_to.id
       WHERE b.group_id = $1
       ORDER BY b.amount DESC`,
      [groupId]
    );

    const balances = result.rows.map(row => ({
      amount: parseFloat(row.amount),
      updated_at: row.updated_at,
      from_user: {
        id: row.from_user_id,
        name: row.from_user_name,
        email: row.from_user_email,
        profile_pic: row.from_user_pic,
      },
      to_user: {
        id: row.to_user_id,
        name: row.to_user_name,
        email: row.to_user_email,
        profile_pic: row.to_user_pic,
      }
    }));

    // Calculate personal summary for this specific group
    let userOwes = 0;
    let userIsOwed = 0;

    balances.forEach(b => {
      if (b.from_user.id === userId) {
        userOwes += b.amount;
      }
      if (b.to_user.id === userId) {
        userIsOwed += b.amount;
      }
    });

    const netGroupBalance = userIsOwed - userOwes;

    res.json({
      success: true,
      data: {
        summary: {
          user_owes: userOwes,
          user_is_owed: userIsOwed,
          net_balance: netGroupBalance
        },
        balances: balances
      },
    });
  } catch (error) {
    console.error('Error fetching group balances:', error);
    res.status(500).json({ success: false, error: { message: 'Server error' } });
  }
};
