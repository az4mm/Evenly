import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { getUserOverallBalances } from '../controllers/balanceController.js';

const router = Router();

// Get the user's overall owe/owed summary across all groups
router.get('/balances/summary', authenticate, getUserOverallBalances);

export default router;
