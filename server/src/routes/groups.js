import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { requireGroupMember, requireGroupAdmin } from '../middleware/group.js';
import {
  createGroup,
  listGroups,
  getGroup,
  updateGroup,
  deleteGroup,
  listMembers,
  previewGroup,
  joinGroup,
  removeMember,
  updateMemberRole,
} from '../controllers/groupController.js';
import {
  addExpense,
  listExpenses,
  getExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/expenseController.js';
import { getGroupBalances } from '../controllers/balanceController.js';
import { getGroupActivity } from '../controllers/activityController.js';

const router = Router();

// Group CRUD
router.post('/', authenticate, createGroup);
router.get('/', authenticate, listGroups);
router.get('/preview/:code', authenticate, previewGroup);
router.post('/join', authenticate, joinGroup);
router.get('/:id', authenticate, requireGroupMember, getGroup);
router.patch('/:id', authenticate, requireGroupAdmin, updateGroup);
router.delete('/:id', authenticate, requireGroupAdmin, deleteGroup);

// Member management
router.get('/:id/members', authenticate, requireGroupMember, listMembers);
router.delete('/:id/members/:userId', authenticate, requireGroupMember, removeMember);
router.patch('/:id/members/:userId', authenticate, requireGroupAdmin, updateMemberRole);

// Balances
router.get('/:id/balances', authenticate, requireGroupMember, getGroupBalances);

// Activity Log
router.get('/:id/activity', authenticate, requireGroupMember, getGroupActivity);

// Expense CRUD
router.post('/:id/expenses', authenticate, requireGroupMember, addExpense);
router.get('/:id/expenses', authenticate, requireGroupMember, listExpenses);
router.get('/:id/expenses/:expenseId', authenticate, requireGroupMember, getExpense);
router.patch('/:id/expenses/:expenseId', authenticate, requireGroupMember, updateExpense);
router.delete('/:id/expenses/:expenseId', authenticate, requireGroupMember, deleteExpense);

export default router;