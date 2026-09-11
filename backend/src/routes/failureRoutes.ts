import { Router } from 'express';
import {
  getFailures,
  getFailureById,
  reportFailure,
  updateFailure,
} from '../controllers/failureController';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, getFailures);
router.get('/:id', authenticate, getFailureById);
router.post('/', authenticate, authorize([Role.ADMIN, Role.SRE]), reportFailure);
router.put('/:id', authenticate, authorize([Role.ADMIN, Role.SRE, Role.DEVELOPER]), updateFailure);

export default router;
