import db from '../db/database.js';
import { generateInviteCode } from '../utils/inviteCode.js';

// POST /api/groups - Create a new group
export async function createGroup(req, res) {
  try {
    const { name, currency } = req.body;

    if (!name || name.trim().length === 0 || name.length > 100) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name must be 1-100 characters' },
      });
    }

    const groupCurrency = currency ? currency.toUpperCase() : 'INR';
    if (groupCurrency.length !== 3) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Currency must be a 3-letter code' },
      });
    }

    // Generate unique invite code (retry on collision)
    let inviteCode;
    let attempts = 0;
    while (attempts < 5) {
      inviteCode = generateInviteCode();
      const { rows } = await db.query(
        'SELECT id FROM groups WHERE invite_code = $1',
        [inviteCode]
      );
      if (rows.length === 0) break;
      attempts++;
    }
    if (attempts >= 5) {
      return res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to generate unique invite code' },
      });
    }

    // Create the group
    const { rows: groupRows } = await db.query(
      `INSERT INTO groups (name, currency, invite_code, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [name.trim(), groupCurrency, inviteCode, req.user.id]
    );

    const group = groupRows[0];

    // Add creator as admin
    await db.query(
      `INSERT INTO user_groups (user_id, group_id, role)
       VALUES ($1, $2, 'admin')`,
      [req.user.id, group.id]
    );

    return res.status(201).json({
      success: true,
      data: group,
    });
  } catch (err) {
    console.error('Error in POST /groups:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to create group' },
    });
  }
}

// GET /api/groups - List all groups the user belongs to
export async function listGroups(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT g.*, ug.role AS my_role,
              (SELECT COUNT(*) FROM user_groups WHERE group_id = g.id) AS member_count
       FROM user_groups ug
       JOIN groups g ON g.id = ug.group_id AND g.is_deleted = false
       WHERE ug.user_id = $1`,
      [req.user.id]
    );

    // member_count comes as string from pg, convert to number
    const groups = rows.map((row) => ({
      ...row,
      member_count: parseInt(row.member_count, 10),
    }));

    return res.json({
      success: true,
      data: groups,
    });
  } catch (err) {
    console.error('Error in GET /groups:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch groups' },
    });
  }
}

// GET /api/groups/:id - Get group details
export async function getGroup(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT g.*,
              (SELECT COUNT(*) FROM user_groups WHERE group_id = g.id) AS member_count
       FROM groups g
       WHERE g.id = $1 AND g.is_deleted = false`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Group not found' },
      });
    }

    const group = rows[0];
    group.member_count = parseInt(group.member_count, 10);

    return res.json({
      success: true,
      data: { ...group, my_role: req.membership.role },
    });
  } catch (err) {
    console.error('Error in GET /groups/:id:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch group' },
    });
  }
}

// PATCH /api/groups/:id - Update group (admin only)
export async function updateGroup(req, res) {
  try {
    const { name, currency } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (!name || name.trim().length === 0 || name.length > 100) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Name must be 1-100 characters' },
        });
      }
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }

    if (currency !== undefined) {
      if (!currency || currency.length !== 3) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Currency must be a 3-letter code' },
        });
      }

      // Check if group has any transactions (currency can only change if none exist)
      const { rows: txRows } = await db.query(
        'SELECT COUNT(*) FROM transactions WHERE group_id = $1',
        [req.params.id]
      );

      if (parseInt(txRows[0].count, 10) > 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Cannot change currency when transactions exist' },
        });
      }

      updates.push(`currency = $${paramIndex++}`);
      values.push(currency.toUpperCase());
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' },
      });
    }

    values.push(req.params.id);
    const { rows } = await db.query(
      `UPDATE groups SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error('Error in PATCH /groups/:id:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update group' },
    });
  }
}

// DELETE /api/groups/:id - Soft delete group (admin only)
export async function deleteGroup(req, res) {
  try {
    // TODO: Uncomment when balances feature is built
    // const { rows: balanceRows } = await db.query(
    //   'SELECT COUNT(*) FROM balances WHERE group_id = $1',
    //   [req.params.id]
    // );
    //
    // if (parseInt(balanceRows[0].count, 10) > 0) {
    //   return res.status(400).json({
    //     success: false,
    //     error: { code: 'VALIDATION_ERROR', message: 'All balances must be settled before deleting' },
    //   });
    // }

    await db.query(
      'UPDATE groups SET is_deleted = true WHERE id = $1',
      [req.params.id]
    );

    return res.json({
      success: true,
      data: { message: 'Group deleted successfully' },
    });
  } catch (err) {
    console.error('Error in DELETE /groups/:id:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to delete group' },
    });
  }
}

// GET /api/groups/:id/members - List group members
export async function listMembers(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT u.id, u.name, u.email, u.profile_pic, ug.role, ug.joined_at
       FROM user_groups ug
       JOIN users u ON u.id = ug.user_id
       WHERE ug.group_id = $1`,
      [req.params.id]
    );

    return res.json({
      success: true,
      data: rows,
    });
  } catch (err) {
    console.error('Error in GET /groups/:id/members:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch members' },
    });
  }
}

// GET /api/groups/preview/:code - Preview group by invite code (without joining)
export async function previewGroup(req, res) {
  try {
    const { rows } = await db.query(
      `SELECT g.id, g.name, g.currency,
              (SELECT COUNT(*) FROM user_groups WHERE group_id = g.id) AS member_count
       FROM groups g
       WHERE g.invite_code = $1 AND g.is_deleted = false`,
      [req.params.code]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invalid invite code' },
      });
    }

    const group = rows[0];

    return res.json({
      success: true,
      data: {
        name: group.name,
        currency: group.currency,
        member_count: parseInt(group.member_count, 10),
      },
    });
  } catch (err) {
    console.error('Error in GET /groups/preview/:code:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to preview group' },
    });
  }
}

// POST /api/groups/join - Join a group via invite code
export async function joinGroup(req, res) {
  try {
    const { invite_code } = req.body;

    if (!invite_code) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invite code is required' },
      });
    }

    // Find the group by invite code
    const { rows: groupRows } = await db.query(
      'SELECT * FROM groups WHERE invite_code = $1 AND is_deleted = false',
      [invite_code]
    );

    if (groupRows.length === 0) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Invalid invite code' },
      });
    }

    const group = groupRows[0];

    // Check if user is already a member
    const { rows: existingRows } = await db.query(
      'SELECT id FROM user_groups WHERE user_id = $1 AND group_id = $2',
      [req.user.id, group.id]
    );

    if (existingRows.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'ALREADY_MEMBER', message: 'You are already a member of this group' },
      });
    }

    // Join the group as member
    await db.query(
      `INSERT INTO user_groups (user_id, group_id, role)
       VALUES ($1, $2, 'member')`,
      [req.user.id, group.id]
    );

    return res.status(201).json({
      success: true,
      data: { ...group, my_role: 'member' },
    });
  } catch (err) {
    console.error('Error in POST /groups/join:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to join group' },
    });
  }
}

// DELETE /api/groups/:id/members/:userId - Remove member or leave group
export async function removeMember(req, res) {
  try {
    const targetUserId = req.params.userId;
    const isSelf = targetUserId === req.user.id;

    // Get the group to check creator
    const { rows: groupRows } = await db.query(
      'SELECT created_by FROM groups WHERE id = $1',
      [req.params.id]
    );

    // Cannot remove the group creator
    if (targetUserId === groupRows[0].created_by) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Cannot remove the group creator' },
      });
    }

    // If not removing yourself, must be admin
    if (!isSelf && req.membership.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Only admins can remove other members' },
      });
    }

    // A member can be removed/leave only when their group balance is fully settled.
    const { rows: balanceRows } = await db.query(
      `SELECT COUNT(*) FROM balances
       WHERE group_id = $1 AND (from_user_id = $2 OR to_user_id = $2)`,
      [req.params.id, targetUserId]
    );

    if (parseInt(balanceRows[0].count, 10) > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: isSelf
            ? 'You can only leave the group when your balance is zero'
            : 'You can only remove a member when their balance is zero',
        },
      });
    }

    await db.query(
      'DELETE FROM user_groups WHERE user_id = $1 AND group_id = $2',
      [targetUserId, req.params.id]
    );

    return res.json({
      success: true,
      data: { message: isSelf ? 'You have left the group' : 'Member removed successfully' },
    });
  } catch (err) {
    console.error('Error in DELETE /groups/:id/members/:userId:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' },
    });
  }
}

// PATCH /api/groups/:id/members/:userId - Promote/demote member (admin only)
export async function updateMemberRole(req, res) {
  try {
    const { role } = req.body;
    const targetUserId = req.params.userId;

    if (!role || !['admin', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Role must be "admin" or "member"' },
      });
    }

    // Get the group to check creator
    const { rows: groupRows } = await db.query(
      'SELECT created_by FROM groups WHERE id = $1',
      [req.params.id]
    );

    // Cannot demote the group creator
    if (targetUserId === groupRows[0].created_by && role === 'member') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Cannot demote the group creator' },
      });
    }

    // Cannot change your own role
    if (targetUserId === req.user.id) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Cannot change your own role' },
      });
    }

    await db.query(
      'UPDATE user_groups SET role = $1 WHERE user_id = $2 AND group_id = $3',
      [role, targetUserId, req.params.id]
    );

    return res.json({
      success: true,
      data: { message: `Member ${role === 'admin' ? 'promoted' : 'demoted'} successfully` },
    });
  } catch (err) {
    console.error('Error in PATCH /groups/:id/members/:userId:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update member role' },
    });
  }
}
