import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuditService } from '../services/auditService';
import { ApprovalStatus, DeploymentStatus, Environment, HealthStatus, RollbackStatus, StepStatus } from '@prisma/client';

export async function getRollbacks(req: Request, res: Response) {
  try {
    const { status, environment, search } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status as RollbackStatus;
    }
    if (environment && environment !== 'ALL') {
      where.environment = environment as Environment;
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { deploymentId: { contains: q, mode: 'insensitive' } },
        { reason: { contains: q, mode: 'insensitive' } },
        { failedVersion: { contains: q, mode: 'insensitive' } },
        { restoredVersion: { contains: q, mode: 'insensitive' } },
        { deployment: { serviceName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const rollbacks = await prisma.rollback.findMany({
      where,
      orderBy: { requestedAt: 'desc' },
      include: {
        deployment: {
          select: {
            id: true,
            serviceName: true,
            environment: true,
            application: { select: { id: true, name: true, key: true } },
          },
        },
        requestedBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        initiatedBy: { select: { id: true, name: true, email: true } },
        steps: {
          select: { id: true, status: true, stepNumber: true },
        },
      },
    });

    res.json(rollbacks);
  } catch (err: any) {
    console.error('getRollbacks error:', err);
    res.status(500).json({ error: 'Failed to fetch rollbacks' });
  }
}

export async function getRollbackById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const rollback = await prisma.rollback.findFirst({
      where: {
        OR: [{ id }, { deploymentId: id }],
      },
      include: {
        deployment: {
          include: {
            application: true,
            deployedBy: { select: { id: true, name: true, email: true } },
            failure: true,
          },
        },
        requestedBy: { select: { id: true, name: true, email: true, role: true } },
        approvedBy: { select: { id: true, name: true, email: true, role: true } },
        initiatedBy: { select: { id: true, name: true, email: true, role: true } },
        steps: {
          orderBy: { stepNumber: 'asc' },
          include: { executor: { select: { id: true, name: true } } },
        },
      },
    });

    if (!rollback) {
      return res.status(404).json({ error: 'Rollback record not found' });
    }

    res.json(rollback);
  } catch (err: any) {
    console.error('getRollbackById error:', err);
    res.status(500).json({ error: 'Failed to fetch rollback execution record' });
  }
}

export async function initiateRollback(req: Request, res: Response) {
  try {
    const {
      deploymentId,
      failedVersion,
      restoredVersion,
      reason,
      requiresApproval,
      customSteps,
    } = req.body;

    if (!deploymentId || !failedVersion || !restoredVersion || !reason) {
      return res.status(400).json({ error: 'Missing required rollback fields' });
    }

    const deployment = await prisma.deployment.findUnique({ where: { id: deploymentId } });
    if (!deployment) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    // Check if rollback already exists
    const existing = await prisma.rollback.findUnique({ where: { deploymentId } });
    if (existing) {
      return res.status(400).json({ error: 'A rollback record already exists for this deployment' });
    }

    // Generate RB-YYYY-XXXXXX
    const currentYear = new Date().getFullYear();
    const count = await prisma.rollback.count();
    const rollbackId = `RB-${currentYear}-${String(count + 1).padStart(6, '0')}`;

    const isProd = deployment.environment === Environment.PRODUCTION;
    const reqApproval = requiresApproval !== undefined ? requiresApproval : isProd;
    const initialStatus = reqApproval ? RollbackStatus.PENDING_APPROVAL : RollbackStatus.IN_PROGRESS;

    const rollback = await prisma.rollback.create({
      data: {
        id: rollbackId,
        deploymentId,
        failedVersion,
        restoredVersion,
        environment: deployment.environment,
        reason,
        status: initialStatus,
        requiresApproval: reqApproval,
        requestedById: req.user?.id || 'usr-sre-002',
        requestedAt: new Date(),
        approvalStatus: reqApproval ? ApprovalStatus.PENDING : ApprovalStatus.APPROVED,
        startedAt: reqApproval ? null : new Date(),
      },
    });

    // Generate default SRE rollback steps if custom steps not provided
    const defaultSteps = customSteps || [
      { stepNumber: 1, title: 'Stop traffic to degraded service', description: 'Redirect load balancer or decrease ingress canary weight to 0%.' },
      { stepNumber: 2, title: 'Verify previous image manifest', description: `Validate docker image digest for restored tag ${restoredVersion}.` },
      { stepNumber: 3, title: 'Restore previous release revision', description: `Execute Helm / ArgoCD rollback to target version ${restoredVersion}.` },
      { stepNumber: 4, title: 'Verify database compatibility', description: 'Ensure database migrations are downward-compatible with restored version.' },
      { stepNumber: 5, title: 'Restart service pods & verify readiness', description: 'Perform rolling rollout and check liveness / readiness probes.' },
      { stepNumber: 6, title: 'Execute synthetic end-to-end smoke tests', description: 'Run automated integration test suite to verify core endpoints.' },
      { stepNumber: 7, title: 'Verify application telemetry & error rate', description: 'Confirm error rates drop < 0.1% and latency p95 normalizes.' },
      { stepNumber: 8, title: 'Confirm recovery & notify stakeholders', description: 'Update incident channel and mark rollback completed.' },
    ];

    for (const step of defaultSteps) {
      await prisma.rollbackStep.create({
        data: {
          rollbackId: rollback.id,
          stepNumber: step.stepNumber,
          title: step.title,
          description: step.description,
          status: StepStatus.PENDING,
          executorId: req.user?.id,
        },
      });
    }

    // In-app notification
    await prisma.notification.create({
      data: {
        title: reqApproval ? 'Rollback Approval Required' : 'Rollback Initiated',
        message: `Rollback ${rollbackId} requested for ${deployment.serviceName} (${failedVersion} -> ${restoredVersion}) in ${deployment.environment}.`,
        type: 'WARNING',
        link: `/rollbacks/${rollbackId}`,
      },
    });

    await AuditService.log({
      userId: req.user?.id,
      action: 'ROLLBACK_REQUESTED',
      entityType: 'ROLLBACK',
      entityId: rollbackId,
      deploymentId,
      newValue: { rollbackId, failedVersion, restoredVersion, requiresApproval: reqApproval },
      description: `Rollback ${rollbackId} requested for ${deployment.serviceName} from ${failedVersion} to ${restoredVersion}`,
    });

    const fullRecord = await prisma.rollback.findUnique({
      where: { id: rollbackId },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    res.status(201).json(fullRecord);
  } catch (err: any) {
    console.error('initiateRollback error:', err);
    res.status(500).json({ error: 'Failed to initiate rollback' });
  }
}

export async function approveRollback(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { approved, comment } = req.body;

    const rollback = await prisma.rollback.findUnique({ where: { id } });
    if (!rollback) {
      return res.status(404).json({ error: 'Rollback record not found' });
    }

    if (rollback.approvalStatus !== ApprovalStatus.PENDING) {
      return res.status(400).json({ error: `Rollback is already ${rollback.approvalStatus}` });
    }

    const newApprovalStatus = approved ? ApprovalStatus.APPROVED : ApprovalStatus.REJECTED;
    const newStatus = approved ? RollbackStatus.IN_PROGRESS : RollbackStatus.FAILED;

    const updated = await prisma.rollback.update({
      where: { id },
      data: {
        approvalStatus: newApprovalStatus,
        status: newStatus,
        approvedById: req.user?.id,
        approvedAt: new Date(),
        approvalComment: comment || (approved ? 'Approved by operator' : 'Rejected by operator'),
        startedAt: approved ? new Date() : null,
      },
      include: { steps: { orderBy: { stepNumber: 'asc' } } },
    });

    await AuditService.log({
      userId: req.user?.id,
      action: approved ? 'ROLLBACK_APPROVED' : 'ROLLBACK_REJECTED',
      entityType: 'ROLLBACK',
      entityId: id,
      deploymentId: rollback.deploymentId,
      newValue: { approvalStatus: newApprovalStatus, comment },
      description: `Rollback ${id} ${approved ? 'APPROVED' : 'REJECTED'} by ${req.user?.name || 'Operator'}. Comment: "${comment || 'None'}"`,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('approveRollback error:', err);
    res.status(500).json({ error: 'Failed to process rollback approval' });
  }
}

export async function updateRollbackStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const existing = await prisma.rollback.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Rollback not found' });
    }

    const isCompleted = status === RollbackStatus.COMPLETED;
    const completedAt = isCompleted ? new Date() : null;
    let durationSeconds = existing.durationSeconds;

    if (isCompleted && existing.startedAt) {
      durationSeconds = Math.round((new Date().getTime() - new Date(existing.startedAt).getTime()) / 1000);
    }

    const updated = await prisma.rollback.update({
      where: { id },
      data: {
        status,
        ...(isCompleted ? { completedAt, durationSeconds } : {}),
      },
    });

    // If completed, update deployment status to ROLLED_BACK and health to HEALTHY
    if (isCompleted) {
      await prisma.deployment.update({
        where: { id: existing.deploymentId },
        data: {
          status: DeploymentStatus.ROLLED_BACK,
          healthStatus: HealthStatus.HEALTHY,
        },
      });

      await AuditService.log({
        userId: req.user?.id,
        action: 'ROLLBACK_COMPLETED',
        entityType: 'ROLLBACK',
        entityId: id,
        deploymentId: existing.deploymentId,
        description: `Rollback ${id} completed in ${Math.round((durationSeconds || 0) / 60)} minutes. Version restored: ${existing.restoredVersion}`,
      });
    }

    res.json(updated);
  } catch (err: any) {
    console.error('updateRollbackStatus error:', err);
    res.status(500).json({ error: 'Failed to update rollback status' });
  }
}

export async function updateRollbackStep(req: Request, res: Response) {
  try {
    const { stepId } = req.params;
    const { status, notes } = req.body;

    const existing = await prisma.rollbackStep.findUnique({
      where: { id: stepId },
      include: { rollback: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Rollback step not found' });
    }

    const isDone = status === StepStatus.COMPLETED || status === StepStatus.SKIPPED;
    const isRunning = status === StepStatus.IN_PROGRESS;

    const updated = await prisma.rollbackStep.update({
      where: { id: stepId },
      data: {
        ...(status ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
        executorId: req.user?.id || existing.executorId,
        startedAt: isRunning && !existing.startedAt ? new Date() : existing.startedAt,
        completedAt: isDone ? new Date() : existing.completedAt,
      },
    });

    await AuditService.log({
      userId: req.user?.id,
      action: 'ROLLBACK_STEP_UPDATED',
      entityType: 'ROLLBACK',
      entityId: existing.rollbackId,
      deploymentId: existing.rollback.deploymentId,
      description: `Step ${existing.stepNumber} ("${existing.title}") status changed to ${status}`,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('updateRollbackStep error:', err);
    res.status(500).json({ error: 'Failed to update rollback step' });
  }
}

export async function addRollbackStep(req: Request, res: Response) {
  try {
    const { id } = req.params; // rollbackId
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ error: 'Step title and description are required' });
    }

    const count = await prisma.rollbackStep.count({ where: { rollbackId: id } });

    const step = await prisma.rollbackStep.create({
      data: {
        rollbackId: id,
        stepNumber: count + 1,
        title,
        description,
        status: StepStatus.PENDING,
        executorId: req.user?.id,
      },
    });

    res.status(201).json(step);
  } catch (err: any) {
    console.error('addRollbackStep error:', err);
    res.status(500).json({ error: 'Failed to add rollback step' });
  }
}
