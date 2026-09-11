import { Router } from 'express';
import {
  getActions,
  createAction,
  updateAction,
} from '../controllers/actionController';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, getActions);
router.post('/', authenticate, authorize([Role.ADMIN, Role.SRE]), createAction);
router.put('/:id', authenticate, authorize([Role.ADMIN, Role.SRE, Role.DEVELOPER]), updateAction);

export default router;
