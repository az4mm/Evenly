import db from '../db/database.js';

// GET /api/groups/:id/activity - Get group activity logs
export async function getGroupActivity(req, res) {
  try {
    const groupId = req.params.id;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const offset = (page - 1) * limit;

    const { rows } = await db.query(
      `SELECT a.id, a.type, a.data, a.created_at, a.transaction_id,
              u.id AS user_id, u.name AS user_name, u.email AS user_email, u.profile_pic AS user_profile_pic
       FROM activity_logs a
       JOIN users u ON u.id = a.user_id
       WHERE a.group_id = $1
       ORDER BY a.created_at DESC
       LIMIT $2 OFFSET $3`,
      [groupId, limit, offset]
    );

    // Format the response structure so 'user' data is grouped neatly.
    const formattedActivities = rows.map(row => ({
      id: row.id,
      type: row.type,
      data: row.data,
      created_at: row.created_at,
      transaction_id: row.transaction_id,
      user: {
        id: row.user_id,
        name: row.user_name || row.user_email,
        email: row.user_email,
        profile_pic: row.user_profile_pic
      }
    }));

    // Get total count for pagination metadata
    const { rows: countRows } = await db.query(
      'SELECT COUNT(*) FROM activity_logs WHERE group_id = $1',
      [groupId]
    );
    const totalCount = parseInt(countRows[0].count, 10);
    const totalPages = Math.ceil(totalCount / limit);

    return res.json({
      success: true,
      data: formattedActivities,
      pagination: {
        current_page: page,
        total_pages: totalPages,
        total_items: totalCount,
        has_next: page < totalPages
      }
    });
  } catch (err) {
    console.error('Error in GET /api/groups/:id/activity:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch activity logs' },
    });
  }
}
