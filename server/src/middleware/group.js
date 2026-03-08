import db from '../db/database.js';

// Checks that the authenticated user is a member of the group (from :id param).
// Attaches req.membership = { role, group_id, user_id } to the request.
export async function requireGroupMember(req, res, next) {
  const groupId = req.params.id;

  try {
    const { rows } = await db.query(
      'SELECT * FROM user_groups WHERE user_id = $1 AND group_id = $2',
      [req.user.id, groupId]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not a member of this group' },
      });
    }

    req.membership = rows[0];
    next();
  } catch (err) {
    console.error('Error in requireGroupMember middleware:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to verify group membership' },
    });
  }
}

// Same as requireGroupMember but also checks role is 'admin'.
export async function requireGroupAdmin(req, res, next) {
  const groupId = req.params.id;

  try {
    const { rows } = await db.query(
      'SELECT * FROM user_groups WHERE user_id = $1 AND group_id = $2',
      [req.user.id, groupId]
    );

    if (rows.length === 0) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You are not a member of this group' },
      });
    }

    if (rows[0].role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only admins can perform this action' },
      });
    }

    req.membership = rows[0];
    next();
  } catch (err) {
    console.error('Error in requireGroupAdmin middleware:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to verify admin access' },
    });
  }
}
