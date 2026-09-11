import { Router } from 'express';
import { getAuditLogs } from '../controllers/auditController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, getAuditLogs);

export default router;
