import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuditService } from '../services/auditService';
import { DeploymentStatus, Environment, HealthStatus } from '@prisma/client';

export async function getDeployments(req: Request, res: Response) {
  try {
    const {
      environment,
      status,
      applicationId,
      deployedById,
      search,
      sortBy = 'startedAt',
      sortOrder = 'desc',
      page = '1',
      limit = '15',
    } = req.query;

    const where: any = {};

    if (environment && environment !== 'ALL') {
      where.environment = environment as Environment;
    }
    if (status && status !== 'ALL') {
      where.status = status as DeploymentStatus;
    }
    if (applicationId && applicationId !== 'ALL') {
      where.applicationId = applicationId as string;
    }
    if (deployedById && deployedById !== 'ALL') {
      where.deployedById = deployedById as string;
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { serviceName: { contains: q, mode: 'insensitive' } },
        { version: { contains: q, mode: 'insensitive' } },
        { branch: { contains: q, mode: 'insensitive' } },
        { commitSha: { contains: q, mode: 'insensitive' } },
        { changeTicketId: { contains: q, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const [total, deployments] = await Promise.all([
      prisma.deployment.count({ where }),
      prisma.deployment.findMany({
        where,
        take: limitNum,
        skip,
        orderBy: { [sortBy as string]: sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          application: { select: { id: true, name: true, key: true } },
          deployedBy: { select: { id: true, name: true, email: true } },
          failure: { select: { id: true, severity: true, status: true } },
          rollback: { select: { id: true, status: true, restoredVersion: true } },
          postMortem: { select: { id: true, status: true } },
        },
      }),
    ]);

    res.json({
      deployments,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    console.error('getDeployments error:', err);
    res.status(500).json({ error: 'Failed to fetch deployments' });
  }
}

export async function getDeploymentById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const deployment = await prisma.deployment.findUnique({
      where: { id },
      include: {
        application: {
          include: {
            team: {
              include: {
                lead: { select: { id: true, name: true, email: true } },
              },
            },
          },
        },
        deployedBy: { select: { id: true, name: true, email: true, role: true } },
        failure: {
          include: {
            assignedEngineer: { select: { id: true, name: true, email: true } },
            incidentCommander: { select: { id: true, name: true, email: true } },
          },
        },
        rollback: {
          include: {
            requestedBy: { select: { id: true, name: true } },
            approvedBy: { select: { id: true, name: true } },
            steps: { orderBy: { stepNumber: 'asc' } },
          },
        },
        postMortem: {
          select: {
            id: true,
            title: true,
            status: true,
            severity: true,
            author: { select: { id: true, name: true } },
          },
        },
        auditLogs: {
          orderBy: { timestamp: 'desc' },
          take: 20,
          include: { user: { select: { id: true, name: true, role: true } } },
        },
      },
    });

    if (!deployment) {
      return res.status(404).json({ error: 'Deployment record not found' });
    }

    res.json(deployment);
  } catch (err: any) {
    console.error('getDeploymentById error:', err);
    res.status(500).json({ error: 'Failed to fetch deployment details' });
  }
}

export async function createDeployment(req: Request, res: Response) {
  try {
    const {
      title,
      applicationId,
      serviceName,
      version,
      environment,
      branch,
      commitSha,
      deploymentTool,
      changeTicketId,
      releaseNotes,
      status,
    } = req.body;

    if (!applicationId || !serviceName || !version || !commitSha) {
      return res.status(400).json({ error: 'Missing required deployment fields' });
    }

    // Generate unique sequential Deployment ID: DEP-YYYY-XXXXXX
    const currentYear = new Date().getFullYear();
    const count = await prisma.deployment.count();
    const nextSeq = String(count + 1).padStart(6, '0');
    const deploymentId = `DEP-${currentYear}-${nextSeq}`;

    // Default mock health metrics for initial state
    const healthMetrics = JSON.stringify({
      api: status === DeploymentStatus.FAILED ? 'Failed' : 'Healthy',
      database: 'Healthy',
      frontend: 'Healthy',
      workers: status === DeploymentStatus.FAILED ? 'Failed' : 'Healthy',
      errorRate: status === DeploymentStatus.FAILED ? '28.5%' : '0.01%',
      latencyMs: status === DeploymentStatus.FAILED ? 1450 : 85,
    });

    const initialLogs = `[${new Date().toISOString()}] Deployment ${deploymentId} initiated via ${deploymentTool || 'GitHub Actions'}
[${new Date().toISOString()}] Branch: ${branch || 'main'}, Commit: ${commitSha}
[${new Date().toISOString()}] Target Environment: ${environment || 'PRODUCTION'}
[${new Date().toISOString()}] Deployment status: ${status || 'IN_PROGRESS'}`;

    const deployment = await prisma.deployment.create({
      data: {
        id: deploymentId,
        title: title || `${serviceName} ${version} Deployment`,
        applicationId,
        serviceName,
        version,
        environment: environment || Environment.PRODUCTION,
        branch: branch || 'main',
        commitSha,
        deploymentTool: deploymentTool || 'GitHub Actions',
        changeTicketId,
        releaseNotes,
        deployedById: req.user?.id || 'usr-admin-001',
        status: status || DeploymentStatus.IN_PROGRESS,
        startedAt: new Date(),
        healthStatus: status === DeploymentStatus.FAILED ? HealthStatus.CRITICAL : HealthStatus.HEALTHY,
        healthMetrics,
        logs: initialLogs,
      },
      include: {
        application: true,
        deployedBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Record immutable audit log
    await AuditService.log({
      userId: req.user?.id,
      action: 'DEPLOYMENT_CREATED',
      entityType: 'DEPLOYMENT',
      entityId: deployment.id,
      deploymentId: deployment.id,
      newValue: {
        id: deployment.id,
        serviceName: deployment.serviceName,
        version: deployment.version,
        environment: deployment.environment,
      },
      description: `Deployment ${deployment.id} created for ${deployment.serviceName} (${deployment.version}) in ${deployment.environment}`,
      ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
    });

    res.status(201).json(deployment);
  } catch (err: any) {
    console.error('createDeployment error:', err);
    res.status(500).json({ error: 'Failed to create deployment record' });
  }
}

export async function updateDeployment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, healthStatus, releaseNotes, changeTicketId, logs } = req.body;

    const existing = await prisma.deployment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    const updated = await prisma.deployment.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(healthStatus ? { healthStatus } : {}),
        ...(releaseNotes !== undefined ? { releaseNotes } : {}),
        ...(changeTicketId !== undefined ? { changeTicketId } : {}),
        ...(logs !== undefined ? { logs } : {}),
        ...(status === DeploymentStatus.SUCCESSFUL || status === DeploymentStatus.FAILED
          ? { completedAt: new Date() }
          : {}),
      },
    });

    await AuditService.log({
      userId: req.user?.id,
      action: 'DEPLOYMENT_UPDATED',
      entityType: 'DEPLOYMENT',
      entityId: id,
      deploymentId: id,
      previousValue: { status: existing.status, healthStatus: existing.healthStatus },
      newValue: { status: updated.status, healthStatus: updated.healthStatus },
      description: `Deployment ${id} updated to status ${updated.status}`,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('updateDeployment error:', err);
    res.status(500).json({ error: 'Failed to update deployment record' });
  }
}

export async function deleteDeployment(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const existing = await prisma.deployment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    await prisma.deployment.delete({ where: { id } });

    await AuditService.log({
      userId: req.user?.id,
      action: 'DEPLOYMENT_DELETED',
      entityType: 'DEPLOYMENT',
      entityId: id,
      previousValue: { id, serviceName: existing.serviceName, version: existing.version },
      description: `Deployment ${id} deleted by Admin`,
    });

    res.json({ success: true, message: `Deployment ${id} deleted` });
  } catch (err: any) {
    console.error('deleteDeployment error:', err);
    res.status(500).json({ error: 'Failed to delete deployment' });
  }
}
