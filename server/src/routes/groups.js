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

export default router;
