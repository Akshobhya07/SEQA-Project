import { Request, Response } from 'express';
import { prisma } from '../config/db';

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const {
      entityType,
      entityId,
      action,
      userId,
      search,
      page = '1',
      limit = '30',
    } = req.query;

    const where: any = {};
    if (entityType && entityType !== 'ALL') where.entityType = entityType as string;
    if (entityId) where.entityId = entityId as string;
    if (action && action !== 'ALL') where.action = action as string;
    if (userId && userId !== 'ALL') where.userId = userId as string;

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
        { action: { contains: q, mode: 'insensitive' } },
      ];
    }

    const pageNum = parseInt(page as string, 10) || 1;
    const limitNum = parseInt(limit as string, 10) || 30;
    const skip = (pageNum - 1) * limitNum;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        take: limitNum,
        skip,
        orderBy: { timestamp: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
        },
      }),
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err: any) {
    console.error('getAuditLogs error:', err);
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
}
