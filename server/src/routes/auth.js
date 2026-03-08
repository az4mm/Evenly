import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getMe, updateMe } from '../controllers/authController.js';

const router = Router();

router.get('/me', authenticate, getMe);
router.patch('/me', authenticate, updateMe);

export default router;
