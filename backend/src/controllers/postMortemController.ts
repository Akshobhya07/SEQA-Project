import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { AuditService } from '../services/auditService';
import { PostMortemStatus, RootCauseCategory, Severity } from '@prisma/client';

export async function getPostMortems(req: Request, res: Response) {
  try {
    const { status, rootCauseCategory, search } = req.query;

    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status as PostMortemStatus;
    }
    if (rootCauseCategory && rootCauseCategory !== 'ALL') {
      where.rootCauseCategory = rootCauseCategory as RootCauseCategory;
    }

    if (search) {
      const q = String(search).trim();
      where.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { title: { contains: q, mode: 'insensitive' } },
        { executiveSummary: { contains: q, mode: 'insensitive' } },
        { rootCauseDetail: { contains: q, mode: 'insensitive' } },
      ];
    }

    const postMortems = await prisma.postMortem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        author: { select: { id: true, name: true, email: true } },
        incident: { select: { id: true, severity: true, downtimeMinutes: true } },
        deployment: {
          select: {
            id: true,
            serviceName: true,
            version: true,
            environment: true,
          },
        },
        correctiveActions: { select: { id: true, status: true, priority: true } },
        _count: { select: { comments: true } },
      },
    });

    res.json(postMortems);
  } catch (err: any) {
    console.error('getPostMortems error:', err);
    res.status(500).json({ error: 'Failed to fetch post-mortems' });
  }
}

export async function getPostMortemById(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const postMortem = await prisma.postMortem.findFirst({
      where: {
        OR: [{ id }, { incidentId: id }, { deploymentId: id }],
      },
      include: {
        author: { select: { id: true, name: true, email: true, role: true } },
        incident: true,
        deployment: {
          include: {
            application: true,
            rollback: true,
          },
        },
        correctiveActions: {
          include: { owner: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
        comments: {
          include: { author: { select: { id: true, name: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!postMortem) {
      return res.status(404).json({ error: 'Post-Mortem not found' });
    }

    res.json(postMortem);
  } catch (err: any) {
    console.error('getPostMortemById error:', err);
    res.status(500).json({ error: 'Failed to fetch post-mortem details' });
  }
}

export async function createPostMortem(req: Request, res: Response) {
  try {
    const {
      incidentId,
      deploymentId,
      title,
      severity,
      executiveSummary,
      incidentTimeline,
      impactAnalysis,
      rootCauseCategory,
      rootCauseDetail,
      fiveWhys,
      contributingFactors,
      whatWentWell,
      whatWentWrong,
      lessonsLearned,
    } = req.body;

    if (!title || !executiveSummary || !rootCauseDetail) {
      return res.status(400).json({ error: 'Title, executive summary, and root cause detail are required' });
    }

    // Generate PM-YYYY-XXXXXX
    const currentYear = new Date().getFullYear();
    const count = await prisma.postMortem.count();
    const postMortemId = `PM-${currentYear}-${String(count + 1).padStart(6, '0')}`;

    const postMortem = await prisma.postMortem.create({
      data: {
        id: postMortemId,
        incidentId,
        deploymentId,
        title,
        status: PostMortemStatus.DRAFT,
        severity: severity || Severity.SEV_2_HIGH,
        authorId: req.user?.id || 'usr-sre-002',
        executiveSummary,
        incidentTimeline: typeof incidentTimeline === 'object' ? JSON.stringify(incidentTimeline) : incidentTimeline,
        impactAnalysis: typeof impactAnalysis === 'object' ? JSON.stringify(impactAnalysis) : impactAnalysis,
        rootCauseCategory: rootCauseCategory || RootCauseCategory.UNKNOWN,
        rootCauseDetail,
        fiveWhys: typeof fiveWhys === 'object' ? JSON.stringify(fiveWhys) : fiveWhys,
        contributingFactors: typeof contributingFactors === 'object' ? JSON.stringify(contributingFactors) : contributingFactors,
        whatWentWell,
        whatWentWrong,
        lessonsLearned,
      },
      include: {
        author: { select: { id: true, name: true } },
      },
    });

    await AuditService.log({
      userId: req.user?.id,
      action: 'POSTMORTEM_CREATED',
      entityType: 'POSTMORTEM',
      entityId: postMortemId,
      deploymentId,
      newValue: { postMortemId, title, rootCauseCategory },
      description: `Post-Mortem ${postMortemId} created: "${title}"`,
    });

    res.status(201).json(postMortem);
  } catch (err: any) {
    console.error('createPostMortem error:', err);
    res.status(500).json({ error: 'Failed to create post-mortem' });
  }
}

export async function updatePostMortem(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.postMortem.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Post-Mortem not found' });
    }

    const updated = await prisma.postMortem.update({
      where: { id },
      data: {
        ...(body.title ? { title: body.title } : {}),
        ...(body.status ? { status: body.status } : {}),
        ...(body.severity ? { severity: body.severity } : {}),
        ...(body.executiveSummary ? { executiveSummary: body.executiveSummary } : {}),
        ...(body.incidentTimeline !== undefined
          ? { incidentTimeline: typeof body.incidentTimeline === 'object' ? JSON.stringify(body.incidentTimeline) : body.incidentTimeline }
          : {}),
        ...(body.impactAnalysis !== undefined
          ? { impactAnalysis: typeof body.impactAnalysis === 'object' ? JSON.stringify(body.impactAnalysis) : body.impactAnalysis }
          : {}),
        ...(body.rootCauseCategory ? { rootCauseCategory: body.rootCauseCategory } : {}),
        ...(body.rootCauseDetail ? { rootCauseDetail: body.rootCauseDetail } : {}),
        ...(body.fiveWhys !== undefined
          ? { fiveWhys: typeof body.fiveWhys === 'object' ? JSON.stringify(body.fiveWhys) : body.fiveWhys }
          : {}),
        ...(body.contributingFactors !== undefined
          ? { contributingFactors: typeof body.contributingFactors === 'object' ? JSON.stringify(body.contributingFactors) : body.contributingFactors }
          : {}),
        ...(body.whatWentWell !== undefined ? { whatWentWell: body.whatWentWell } : {}),
        ...(body.whatWentWrong !== undefined ? { whatWentWrong: body.whatWentWrong } : {}),
        ...(body.lessonsLearned !== undefined ? { lessonsLearned: body.lessonsLearned } : {}),
      },
    });

    await AuditService.log({
      userId: req.user?.id,
      action: 'POSTMORTEM_UPDATED',
      entityType: 'POSTMORTEM',
      entityId: id,
      deploymentId: existing.deploymentId || undefined,
      previousValue: { status: existing.status },
      newValue: { status: updated.status },
      description: `Post-Mortem ${id} updated (status: ${updated.status})`,
    });

    res.json(updated);
  } catch (err: any) {
    console.error('updatePostMortem error:', err);
    res.status(500).json({ error: 'Failed to update post-mortem' });
  }
}

export async function addComment(req: Request, res: Response) {
  try {
    const { id } = req.params; // postMortemId
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty' });
    }

    const comment = await prisma.comment.create({
      data: {
        postMortemId: id,
        authorId: req.user?.id || 'usr-dev-003',
        content,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    res.status(201).json(comment);
  } catch (err: any) {
    console.error('addComment error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
}
