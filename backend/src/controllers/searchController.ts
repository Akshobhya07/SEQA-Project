import { Request, Response } from 'express';
import { prisma } from '../config/db';

export async function globalSearch(req: Request, res: Response) {
  try {
    const { q } = req.query;

    if (!q || !String(q).trim()) {
      return res.json({
        deployments: [],
        incidents: [],
        rollbacks: [],
        postMortems: [],
        applications: [],
      });
    }

    const query = String(q).trim();

    const [deployments, incidents, rollbacks, postMortems, applications] = await Promise.all([
      prisma.deployment.findMany({
        where: {
          OR: [
            { id: { contains: query, mode: 'insensitive' } },
            { title: { contains: query, mode: 'insensitive' } },
            { serviceName: { contains: query, mode: 'insensitive' } },
            { version: { contains: query, mode: 'insensitive' } },
            { commitSha: { contains: query, mode: 'insensitive' } },
            { changeTicketId: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 8,
        include: { application: true },
      }),
      prisma.deploymentFailure.findMany({
        where: {
          OR: [
            { id: { contains: query, mode: 'insensitive' } },
            { failureReason: { contains: query, mode: 'insensitive' } },
            { errorMessage: { contains: query, mode: 'insensitive' } },
            { errorCode: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 8,
        include: { deployment: true },
      }),
      prisma.rollback.findMany({
        where: {
          OR: [
            { id: { contains: query, mode: 'insensitive' } },
            { reason: { contains: query, mode: 'insensitive' } },
            { failedVersion: { contains: query, mode: 'insensitive' } },
            { restoredVersion: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 8,
        include: { deployment: true },
      }),
      prisma.postMortem.findMany({
        where: {
          OR: [
            { id: { contains: query, mode: 'insensitive' } },
            { title: { contains: query, mode: 'insensitive' } },
            { executiveSummary: { contains: query, mode: 'insensitive' } },
            { rootCauseDetail: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 8,
      }),
      prisma.application.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { key: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: 5,
      }),
    ]);

    res.json({
      deployments,
      incidents,
      rollbacks,
      postMortems,
      applications,
    });
  } catch (err: any) {
    console.error('globalSearch error:', err);
    res.status(500).json({ error: 'Failed to perform search' });
  }
}
