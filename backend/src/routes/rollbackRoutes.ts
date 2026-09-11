import { Router } from 'express';
import {
  getRollbacks,
  getRollbackById,
  initiateRollback,
  approveRollback,
  updateRollbackStatus,
  updateRollbackStep,
  addRollbackStep,
} from '../controllers/rollbackController';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, getRollbacks);
router.get('/:id', authenticate, getRollbackById);
router.post('/', authenticate, authorize([Role.ADMIN, Role.SRE]), initiateRollback);
router.put('/:id/approval', authenticate, authorize([Role.ADMIN, Role.SRE]), approveRollback);
router.put('/:id/status', authenticate, authorize([Role.ADMIN, Role.SRE]), updateRollbackStatus);
router.put('/steps/:stepId', authenticate, authorize([Role.ADMIN, Role.SRE, Role.DEVELOPER]), updateRollbackStep);
router.post('/:id/steps', authenticate, authorize([Role.ADMIN, Role.SRE]), addRollbackStep);

export default router;
