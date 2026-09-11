import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuditService } from '../services/auditService';
import { UserStatus } from '@prisma/client';

export async function getTeams(req: Request, res: Response) {
  try {
    const teams = await prisma.team.findMany({
      include: {
        lead: { select: { id: true, name: true, email: true } },
        members: { select: { id: true, name: true, email: true, role: true, status: true } },
        applications: { select: { id: true, name: true, key: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(teams);
  } catch (err: any) {
    console.error('getTeams error:', err);
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
}

export async function getUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        team: { select: { id: true, name: true } },
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err: any) {
    console.error('getUsers error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

export async function toggleUserStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const newStatus = status || (user.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE);

    const updated = await prisma.user.update({
      where: { id },
      data: { status: newStatus },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    await AuditService.log({
      userId: req.user?.id,
      action: 'USER_STATUS_CHANGED',
      entityType: 'USER',
      entityId: id,
      previousValue: { status: user.status },
      newValue: { status: newStatus },
      description: `User ${user.name} status changed to ${newStatus}`,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('toggleUserStatus error:', err);
    res.status(500).json({ error: 'Failed to update user status' });
  }
}

export async function getApplications(req: Request, res: Response) {
  try {
    const apps = await prisma.application.findMany({
      include: {
        team: { select: { id: true, name: true } },
        _count: { select: { deployments: true } },
      },
      orderBy: { name: 'asc' },
    });
    res.json(apps);
  } catch (err: any) {
    console.error('getApplications error:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
}
