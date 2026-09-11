import { Router } from 'express';
import authRoutes from './authRoutes';
import dashboardRoutes from './dashboardRoutes';
import deploymentRoutes from './deploymentRoutes';
import failureRoutes from './failureRoutes';
import rollbackRoutes from './rollbackRoutes';
import postMortemRoutes from './postMortemRoutes';
import actionRoutes from './actionRoutes';
import auditRoutes from './auditRoutes';
import reportRoutes from './reportRoutes';
import teamRoutes from './teamRoutes';
import searchRoutes from './searchRoutes';
import notificationRoutes from './notificationRoutes';

const apiRouter = Router();

apiRouter.use('/auth', authRoutes);
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/deployments', deploymentRoutes);
apiRouter.use('/failures', failureRoutes);
apiRouter.use('/rollbacks', rollbackRoutes);
apiRouter.use('/postmortems', postMortemRoutes);
apiRouter.use('/actions', actionRoutes);
apiRouter.use('/audit-logs', auditRoutes);
apiRouter.use('/reports', reportRoutes);
apiRouter.use('/', teamRoutes);
apiRouter.use('/search', searchRoutes);
apiRouter.use('/notifications', notificationRoutes);

export default apiRouter;
