import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { DeploymentStatus, PostMortemStatus } from '@prisma/client';

export async function getReportMetrics(req: Request, res: Response) {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const [
      deployments,
      failures,
      rollbacks,
      postMortems,
      actions,
    ] = await Promise.all([
      prisma.deployment.findMany({
        where: { startedAt: { gte: start, lte: end } },
        include: { application: true },
      }),
      prisma.deploymentFailure.findMany({
        where: { failureTime: { gte: start, lte: end } },
        include: { deployment: true },
      }),
      prisma.rollback.findMany({
        where: { requestedAt: { gte: start, lte: end } },
      }),
      prisma.postMortem.findMany({
        where: { createdAt: { gte: start, lte: end } },
      }),
      prisma.correctiveAction.findMany({
        where: { createdAt: { gte: start, lte: end } },
      }),
    ]);

    const totalDeployments = deployments.length;
    const successfulDeployments = deployments.filter(d => d.status === DeploymentStatus.SUCCESSFUL).length;
    const failedDeployments = deployments.filter(d => d.status === DeploymentStatus.FAILED || d.status === DeploymentStatus.ROLLED_BACK).length;
    const rollbackCount = rollbacks.length;

    const successRate = totalDeployments > 0
      ? Number(((successfulDeployments / totalDeployments) * 100).toFixed(1))
      : 100;
    const rollbackRate = totalDeployments > 0
      ? Number(((rollbackCount / totalDeployments) * 100).toFixed(1))
      : 0;

    const downtimeMinutesArr = failures.map(f => f.downtimeMinutes).filter(m => m > 0);
    const mttrMinutes = downtimeMinutesArr.length > 0
      ? Math.round(downtimeMinutesArr.reduce((a, b) => a + b, 0) / downtimeMinutesArr.length)
      : 0;

    // Failures by Service
    const failuresByService: { [key: string]: number } = {};
    for (const f of failures) {
      const s = f.deployment?.serviceName || 'Unknown';
      failuresByService[s] = (failuresByService[s] || 0) + 1;
    }

    // Failures by Environment
    const failuresByEnvironment: { [key: string]: number } = {};
    for (const f of failures) {
      const e = f.deployment?.environment || 'PRODUCTION';
      failuresByEnvironment[e] = (failuresByEnvironment[e] || 0) + 1;
    }

    // Root causes
    const rootCauses: { [key: string]: number } = {};
    for (const pm of postMortems) {
      rootCauses[pm.rootCauseCategory] = (rootCauses[pm.rootCauseCategory] || 0) + 1;
    }

    const openCorrectiveActions = actions.filter(a => a.status === 'OPEN' || a.status === 'IN_PROGRESS').length;

    res.json({
      period: { start, end },
      metrics: {
        totalDeployments,
        successfulDeployments,
        failedDeployments,
        rollbackCount,
        successRate,
        rollbackRate,
        mttrMinutes,
        openCorrectiveActions,
      },
      failuresByService: Object.entries(failuresByService).map(([service, count]) => ({ service, count })),
      failuresByEnvironment: Object.entries(failuresByEnvironment).map(([environment, count]) => ({ environment, count })),
      rootCauses: Object.entries(rootCauses).map(([category, count]) => ({ category, count })),
    });
  } catch (err: any) {
    console.error('getReportMetrics error:', err);
    res.status(500).json({ error: 'Failed to generate report metrics' });
  }
}

export async function exportCsv(req: Request, res: Response) {
  try {
    const { type = 'deployments' } = req.query;

    if (type === 'deployments') {
      const deployments = await prisma.deployment.findMany({
        orderBy: { startedAt: 'desc' },
        include: { application: true, deployedBy: true },
      });

      const header = 'Deployment ID,Service,Version,Environment,Branch,Commit SHA,Status,Tool,Started At,Deployed By\n';
      const rows = deployments.map(d =>
        `"${d.id}","${d.serviceName}","${d.version}","${d.environment}","${d.branch}","${d.commitSha}","${d.status}","${d.deploymentTool}","${d.startedAt.toISOString()}","${d.deployedBy.name}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="deployments_audit_report.csv"');
      return res.send(header + rows);
    }

    if (type === 'rollbacks') {
      const rollbacks = await prisma.rollback.findMany({
        orderBy: { requestedAt: 'desc' },
        include: { deployment: true, requestedBy: true, approvedBy: true },
      });

      const header = 'Rollback ID,Deployment ID,Failed Version,Restored Version,Environment,Status,Approval Status,Requested By,Approved By,Duration Min\n';
      const rows = rollbacks.map(r =>
        `"${r.id}","${r.deploymentId}","${r.failedVersion}","${r.restoredVersion}","${r.environment}","${r.status}","${r.approvalStatus}","${r.requestedBy.name}","${r.approvedBy?.name || 'N/A'}","${Math.round((r.durationSeconds || 0) / 60)}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="rollbacks_audit_report.csv"');
      return res.send(header + rows);
    }

    if (type === 'audit-logs') {
      const logs = await prisma.auditLog.findMany({
        orderBy: { timestamp: 'desc' },
        include: { user: true },
      });

      const header = 'Timestamp,Action,Entity Type,Entity ID,User,IP Address,Description\n';
      const rows = logs.map(l =>
        `"${l.timestamp.toISOString()}","${l.action}","${l.entityType}","${l.entityId}","${l.user?.name || 'System'}","${l.ipAddress || '127.0.0.1'}","${l.description.replace(/"/g, '""')}"`
      ).join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="audit_trail_report.csv"');
      return res.send(header + rows);
    }

    res.status(400).json({ error: 'Invalid export type. Supported: deployments, rollbacks, audit-logs' });
  } catch (err: any) {
    console.error('exportCsv error:', err);
    res.status(500).json({ error: 'Failed to generate CSV export' });
  }
}
