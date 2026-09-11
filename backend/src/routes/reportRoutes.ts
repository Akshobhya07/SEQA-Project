import { Router } from 'express';
import { getReportMetrics, exportCsv } from '../controllers/reportController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/metrics', authenticate, getReportMetrics);
router.get('/export', authenticate, exportCsv);

export default router;
