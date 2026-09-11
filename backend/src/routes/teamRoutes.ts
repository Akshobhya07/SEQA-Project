import { Router } from 'express';
import {
  getTeams,
  getUsers,
  toggleUserStatus,
  getApplications,
} from '../controllers/teamController';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/teams', authenticate, getTeams);
router.get('/users', authenticate, getUsers);
router.put('/users/:id/status', authenticate, authorize([Role.ADMIN]), toggleUserStatus);
router.get('/applications', authenticate, getApplications);

export default router;
