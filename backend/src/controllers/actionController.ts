import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuditService } from '../services/auditService';
import { ActionPriority, ActionStatus, ActionType } from '@prisma/client';

export async function getActions(req: Request, res: Response) {
  try {
    const { status, priority, type, ownerId, search } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') where.status = status as ActionStatus;
    if (priority && priority !== 'ALL') where.priority = priority as ActionPriority;
    if (type && type !== 'ALL') where.type = type as ActionType;
    if (ownerId && ownerId !== 'ALL') where.ownerId = ownerId as string;

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { verificationNotes: { contains: q, mode: 'insensitive' } },
      ];
    }

    const actions = await prisma.correctiveAction.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
      include: {
        owner: { select: { id: true, name: true, email: true } },
        postMortem: {
          select: {
            id: true,
            title: true,
            deployment: { select: { id: true, serviceName: true } },
          },
        },
      },
    });

    res.json(actions);
  } catch (err: any) {
    console.error('getActions error:', err);
    res.status(500).json({ error: 'Failed to fetch corrective actions' });
  }
}

export async function createAction(req: Request, res: Response) {
  try {
    const { postMortemId, description, type, priority, ownerId, dueDate } = req.body;

    if (!postMortemId || !description || !ownerId || !dueDate) {
      return res.status(400).json({ error: 'Post-Mortem ID, description, owner, and due date are required' });
    }

    // Generate CA-YYYY-XXXXXX
    const currentYear = new Date().getFullYear();
    const count = await prisma.correctiveAction.count();
    const actionId = `CA-${currentYear}-${String(count + 1).padStart(6, '0')}`;

    const action = await prisma.correctiveAction.create({
      data: {
        id: actionId,
        postMortemId,
        description,
        type: type || ActionType.CORRECTIVE,
        priority: priority || ActionPriority.P2_MEDIUM,
        ownerId,
        dueDate: new Date(dueDate),
        status: ActionStatus.OPEN,
      },
      include: {
        owner: { select: { id: true, name: true } },
      },
    });

    await AuditService.log({
      userId: req.user?.id,
      action: 'ACTION_CREATED',
      entityType: 'ACTION',
      entityId: actionId,
      newValue: { actionId, description, priority, ownerId },
      description: `Corrective action ${actionId} created (${priority}): "${description}"`,
    });

    res.status(201).json(action);
  } catch (err: any) {
    console.error('createAction error:', err);
    res.status(500).json({ error: 'Failed to create corrective action' });
  }
}

export async function updateAction(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status, verificationNotes, priority, ownerId, dueDate } = req.body;

    const existing = await prisma.correctiveAction.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Action item not found' });
    }

    const isCompleted = status === ActionStatus.COMPLETED;
    const completionDate = isCompleted ? new Date() : (status ? null : existing.completionDate);

    const updated = await prisma.correctiveAction.update({
      where: { id },
      data: {
        ...(status ? { status, completionDate } : {}),
        ...(verificationNotes !== undefined ? { verificationNotes } : {}),
        ...(priority ? { priority } : {}),
        ...(ownerId ? { ownerId } : {}),
        ...(dueDate ? { dueDate: new Date(dueDate) } : {}),
      },
      include: { owner: { select: { id: true, name: true } } },
    });

    await AuditService.log({
      userId: req.user?.id,
      action: isCompleted ? 'ACTION_COMPLETED' : 'ACTION_UPDATED',
      entityType: 'ACTION',
      entityId: id,
      previousValue: { status: existing.status },
      newValue: { status: updated.status, verificationNotes },
      description: `Action ${id} status updated to ${updated.status}`,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('updateAction error:', err);
    res.status(500).json({ error: 'Failed to update action item' });
  }
}
