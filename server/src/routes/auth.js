import { Router } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// GET /api/auth/me - Get current user profile
router.get('/me', authenticate, async (req, res) => {
  try {
    // Check if user exists in our users table
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', req.user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = row not found, which is fine for new users
      throw fetchError;
    }

    // If user doesn't exist in our table, create them
    if (!existingUser) {
      const { data: newUser, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: req.user.id,
          name: req.user.name || req.user.email.split('@')[0],
          email: req.user.email,
          profile_pic: req.user.profile_pic,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return res.json({
        success: true,
        data: { ...newUser, is_new_user: true },
      });
    }

    // Update profile_pic from Google if changed
    if (req.user.profile_pic && req.user.profile_pic !== existingUser.profile_pic) {
      await supabaseAdmin
        .from('users')
        .update({ profile_pic: req.user.profile_pic })
        .eq('id', req.user.id);

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
});

// PATCH /api/auth/me - Update user profile
router.patch('/me', authenticate, async (req, res) => {
  try {
    const { name, default_currency } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name || name.length > 100) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Name must be 1-100 characters' },
        });
      }
      updates.name = name.trim();
    }

    if (default_currency !== undefined) {
      if (!default_currency || default_currency.length !== 3) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Currency must be a 3-letter code' },
        });
      }
      updates.default_currency = default_currency.toUpperCase();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No valid fields to update' },
      });
    }

    const { data: updatedUser, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      success: true,
      data: updatedUser,
    });
  } catch (err) {
    console.error('Error in PATCH /auth/me:', err);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to update profile' },
    });
  }
});

export default router;
