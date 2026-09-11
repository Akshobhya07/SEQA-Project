import { Router } from 'express';
import {
  getDeployments,
  getDeploymentById,
  createDeployment,
  updateDeployment,
  deleteDeployment,
} from '../controllers/deploymentController';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', authenticate, getDeployments);
router.get('/:id', authenticate, getDeploymentById);
router.post('/', authenticate, authorize([Role.ADMIN, Role.SRE]), createDeployment);
router.put('/:id', authenticate, authorize([Role.ADMIN, Role.SRE, Role.DEVELOPER]), updateDeployment);
router.delete('/:id', authenticate, authorize([Role.ADMIN]), deleteDeployment);

export default router;
