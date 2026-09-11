import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuditService } from '../services/auditService';
import { DeploymentStatus, HealthStatus, IncidentStatus, Severity } from '@prisma/client';

export async function getFailures(req: Request, res: Response) {
  try {
    const { severity, status, search } = req.query;

    const where: any = {};
    if (severity && severity !== 'ALL') {
      where.severity = severity as Severity;
    }
    if (status && status !== 'ALL') {
      where.status = status as IncidentStatus;
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { failureReason: { contains: q, mode: 'insensitive' } },
        { whatHappened: { contains: q, mode: 'insensitive' } },
        { errorMessage: { contains: q, mode: 'insensitive' } },
        { deployment: { serviceName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const failures = await prisma.deploymentFailure.findMany({
      where,
      orderBy: { failureTime: 'desc' },
      include: {
        deployment: {
          select: {
            id: true,
            serviceName: true,
            version: true,
            environment: true,
            startedAt: true,
            status: true,
            rollback: { select: { id: true, status: true } },
          },
        },
        assignedEngineer: { select: { id: true, name: true, email: true } },
        incidentCommander: { select: { id: true, name: true, email: true } },
        postMortem: { select: { id: true, status: true } },
      },
    });

    res.json(failures);
  } catch (err: any) {
    console.error('getFailures error:', err);
    res.status(500).json({ error: 'Failed to fetch failed deployment records' });
  }
}

export async function getFailureById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const failure = await prisma.deploymentFailure.findFirst({
      where: {
        OR: [{ id }, { deploymentId: id }],
      },
      include: {
        deployment: {
          include: {
            application: true,
            deployedBy: { select: { id: true, name: true, email: true } },
            rollback: {
              include: {
                steps: { orderBy: { stepNumber: 'asc' } },
                requestedBy: { select: { id: true, name: true } },
                approvedBy: { select: { id: true, name: true } },
              },
            },
          },
        },
        assignedEngineer: { select: { id: true, name: true, email: true, role: true } },
        incidentCommander: { select: { id: true, name: true, email: true, role: true } },
        postMortem: {
          include: {
            author: { select: { id: true, name: true } },
            correctiveActions: true,
          },
        },
      },
    });

    if (!failure) {
      return res.status(404).json({ error: 'Incident record not found' });
    }

    res.json(failure);
  } catch (err: any) {
    console.error('getFailureById error:', err);
    res.status(500).json({ error: 'Failed to fetch failure details' });
  }
}

export async function reportFailure(req: Request, res: Response) {
  try {
    const {
      deploymentId,
      severity,
      failureReason,
      whatHappened,
      observableSymptoms,
      affectedServices,
      usersAffected,
      downtimeMinutes,
      businessImpact,
      dataImpact,
      errorMessage,
      errorCode,
      logsSnippet,
      immediateActionsTaken,
      assignedEngineerId,
      incidentCommanderId,
    } = req.body;

    if (!deploymentId || !failureReason || !whatHappened) {
      return res.status(400).json({ error: 'Deployment ID, failure reason, and description are required' });
    }

    const deployment = await prisma.deployment.findUnique({ where: { id: deploymentId } });
    if (!deployment) {
      return res.status(404).json({ error: 'Target deployment not found' });
    }

    // Generate INC-YYYY-XXXXXX
    const currentYear = new Date().getFullYear();
    const count = await prisma.deploymentFailure.count();
    const incidentId = `INC-${currentYear}-${String(count + 1).padStart(6, '0')}`;

    // Update deployment status to FAILED & Health to CRITICAL
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: DeploymentStatus.FAILED,
        healthStatus: HealthStatus.CRITICAL,
      },
    });

    const incident = await prisma.deploymentFailure.create({
      data: {
        id: incidentId,
        deploymentId,
        severity: severity || Severity.SEV_2_HIGH,
        status: IncidentStatus.OPEN,
        failureTime: new Date(),
        detectedTime: new Date(),
        failureReason,
        whatHappened,
        observableSymptoms,
        affectedServices: affectedServices ? JSON.stringify(affectedServices) : null,
        usersAffected: usersAffected ? parseInt(usersAffected, 10) : 0,
        downtimeMinutes: downtimeMinutes ? parseInt(downtimeMinutes, 10) : 0,
        businessImpact,
        dataImpact,
        errorMessage,
        errorCode,
        logsSnippet,
        immediateActionsTaken,
        assignedEngineerId: assignedEngineerId || req.user?.id,
        incidentCommanderId: incidentCommanderId || req.user?.id,
      },
      include: {
        deployment: true,
        assignedEngineer: { select: { id: true, name: true } },
      },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        title: `SEV-${(severity || 'SEV_2_HIGH').split('_')[1]} Incident Declared: ${deployment.serviceName}`,
        message: `Deployment ${deploymentId} failed. Incident ${incidentId} opened: ${failureReason}`,
        type: 'CRITICAL',
        link: `/failures/${incidentId}`,
      },
    });

    await AuditService.log({
      userId: req.user?.id,
      action: 'INCIDENT_CREATED',
      entityType: 'INCIDENT',
      entityId: incidentId,
      deploymentId,
      newValue: { incidentId, severity, failureReason },
      description: `Incident ${incidentId} declared for deployment ${deploymentId} (${severity}): ${failureReason}`,
    });

    res.status(201).json(incident);
  } catch (err: any) {
    console.error('reportFailure error:', err);
    res.status(500).json({ error: 'Failed to record failure incident' });
  }
}

export async function updateFailure(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const existing = await prisma.deploymentFailure.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Incident record not found' });
    }

    const updated = await prisma.deploymentFailure.update({
      where: { id },
      data: {
        ...(updateData.status ? { status: updateData.status } : {}),
        ...(updateData.severity ? { severity: updateData.severity } : {}),
        ...(updateData.whatHappened ? { whatHappened: updateData.whatHappened } : {}),
        ...(updateData.observableSymptoms !== undefined ? { observableSymptoms: updateData.observableSymptoms } : {}),
        ...(updateData.businessImpact !== undefined ? { businessImpact: updateData.businessImpact } : {}),
        ...(updateData.dataImpact !== undefined ? { dataImpact: updateData.dataImpact } : {}),
        ...(updateData.downtimeMinutes !== undefined ? { downtimeMinutes: parseInt(updateData.downtimeMinutes, 10) } : {}),
        ...(updateData.usersAffected !== undefined ? { usersAffected: parseInt(updateData.usersAffected, 10) } : {}),
        ...(updateData.immediateActionsTaken !== undefined ? { immediateActionsTaken: updateData.immediateActionsTaken } : {}),
        ...(updateData.assignedEngineerId !== undefined ? { assignedEngineerId: updateData.assignedEngineerId } : {}),
        ...(updateData.incidentCommanderId !== undefined ? { incidentCommanderId: updateData.incidentCommanderId } : {}),
      },
    });

    await AuditService.log({
      userId: req.user?.id,
      action: 'INCIDENT_UPDATED',
      entityType: 'INCIDENT',
      entityId: id,
      deploymentId: existing.deploymentId,
      previousValue: { status: existing.status, severity: existing.severity },
      newValue: { status: updated.status, severity: updated.severity },
      description: `Incident ${id} investigation details updated`,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('updateFailure error:', err);
    res.status(500).json({ error: 'Failed to update failure record' });
  }
}
