import { Request, Response } from 'express';
import { prisma } from '../config/db';

export async function getNotifications(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    const notifications = await prisma.notification.findMany({
      where: {
        OR: [{ userId: null }, { userId }],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        isRead: false,
        OR: [{ userId: null }, { userId }],
      },
    });

    res.json({ notifications, unreadCount });
  } catch (err: any) {
    console.error('getNotifications error:', err);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

export async function markNotificationRead(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json(updated);
  } catch (err: any) {
    console.error('markNotificationRead error:', err);
    res.status(500).json({ error: 'Failed to update notification' });
  }
}

export async function markAllRead(req: Request, res: Response) {
  try {
    const userId = req.user?.id;

    await prisma.notification.updateMany({
      where: {
        isRead: false,
        OR: [{ userId: null }, { userId }],
      },
      data: { isRead: true },
    });

    res.json({ success: true });
  } catch (err: any) {
    console.error('markAllRead error:', err);
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
}
