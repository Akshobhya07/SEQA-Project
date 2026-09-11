import { prisma } from '../config/db';

export interface AuditLogParams {
  userId?: string;
  action: string;
  entityType: 'DEPLOYMENT' | 'ROLLBACK' | 'INCIDENT' | 'POSTMORTEM' | 'ACTION' | 'USER' | 'TEAM';
  entityId: string;
  deploymentId?: string;
  previousValue?: any;
  newValue?: any;
  description: string;
  ipAddress?: string;
}

export class AuditService {
  static async log(params: AuditLogParams) {
    try {
      const prevString = params.previousValue ? JSON.stringify(params.previousValue) : null;
      const newString = params.newValue ? JSON.stringify(params.newValue) : null;

      const record = await prisma.auditLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          deploymentId: params.deploymentId,
          previousValue: prevString,
          newValue: newString,
          description: params.description,
          ipAddress: params.ipAddress || '127.0.0.1',
          isImmutable: true,
        },
      });

      return record;
    } catch (err) {
      console.error('[AuditService] Failed to record audit log:', err);
    }
  }

  static async getLogs(filters: {
    entityType?: string;
    entityId?: string;
    action?: string;
    userId?: string;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.action) where.action = filters.action;
    if (filters.userId) where.userId = filters.userId;

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 50,
        skip: filters.offset || 0,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return { total, logs };
  }
}
