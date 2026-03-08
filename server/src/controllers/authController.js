import db from '../db/database.js';

// GET /api/auth/me - Get current user profile (or create on first login)
export async function getMe(req, res) {
  try {
    // Check if user exists in our users table
    const { rows } = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [req.user.id]
    );

    const existingUser = rows[0];

    // If user doesn't exist, create them
    if (!existingUser) {
      const { rows: newRows } = await db.query(
        `INSERT INTO users (id, name, email, profile_pic)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          req.user.id,
          req.user.name || req.user.email.split('@')[0],
          req.user.email,
          req.user.profile_pic,
        ]
      );

      return res.json({
        success: true,
        data: { ...newRows[0], is_new_user: true },
      });
    }

    // Update profile_pic from Google if changed
    if (req.user.profile_pic && req.user.profile_pic !== existingUser.profile_pic) {
      await db.query(
        'UPDATE users SET profile_pic = $1 WHERE id = $2',
        [req.user.profile_pic, req.user.id]
      );
      existingUser.profile_pic = req.user.profile_pic;
    }

    return res.json({
      success: true,
      data: { ...existingUser, is_new_user: false },
    });
  } catch (err) {
    console.error('Error in GET /auth/me:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch user profile' },
    });
  }
}

// PATCH /api/auth/me - Update user profile
export async function updateMe(req, res) {
  try {
    const { name, default_currency } = req.body;
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      if (!name || name.length > 100) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Name must be 1-100 characters' },
        });
      }
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }

    if (default_currency !== undefined) {
      if (!default_currency || default_currency.length !== 3) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Currency must be a 3-letter code' },
        });
      }
      updates.push(`default_currency = $${paramIndex++}`);
      values.push(default_currency.toUpperCase());
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' },
      });
    }

    values.push(req.user.id);
    const { rows } = await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return res.json({
      success: true,
      data: rows[0],
    });
  } catch (err) {
    console.error('Error in PATCH /auth/me:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' },
    });
  }
}
