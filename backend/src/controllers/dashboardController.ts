import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { DeploymentStatus, PostMortemStatus } from '@prisma/client';

export async function getDashboardStats(req: Request, res: Response) {
  try {
    const [
      totalDeployments,
      successfulDeployments,
      failedDeployments,
      rolledBackDeployments,
      totalRollbacks,
      openPostMortems,
      allDeployments,
      allFailures,
      allPostMortems,
      allRollbacks,
    ] = await Promise.all([
      prisma.deployment.count(),
      prisma.deployment.count({ where: { status: DeploymentStatus.SUCCESSFUL } }),
      prisma.deployment.count({ where: { status: DeploymentStatus.FAILED } }),
      prisma.deployment.count({ where: { status: DeploymentStatus.ROLLED_BACK } }),
      prisma.rollback.count(),
      prisma.postMortem.count({
        where: {
          status: { in: [PostMortemStatus.DRAFT, PostMortemStatus.UNDER_REVIEW] },
        },
      }),
      prisma.deployment.findMany({
        orderBy: { startedAt: 'asc' },
        include: { application: true },
      }),
      prisma.deploymentFailure.findMany({
        include: { deployment: { include: { application: true } } },
      }),
      prisma.postMortem.findMany(),
      prisma.rollback.findMany(),
    ]);

    // Combined failures: explicit FAILED status + ROLLED_BACK
    const totalFailedOrRolledBack = failedDeployments + rolledBackDeployments;
    const successRate = totalDeployments > 0
      ? Number(((successfulDeployments / totalDeployments) * 100).toFixed(1))
      : 100;
    const rollbackRate = totalDeployments > 0
      ? Number(((totalRollbacks / totalDeployments) * 100).toFixed(1))
      : 0;

    // MTTR calculation: average downtimeMinutes from failure records
    const downtimeValues = allFailures
      .map(f => f.downtimeMinutes)
      .filter(m => m > 0);
    const avgMttr = downtimeValues.length > 0
      ? Math.round(downtimeValues.reduce((a, b) => a + b, 0) / downtimeValues.length)
      : 18;

    // 1. Deployment Trend over time (grouped by day)
    const trendsMap: { [date: string]: { date: string; successful: number; failed: number; rollbacks: number } } = {};
    for (const dep of allDeployments) {
      const day = dep.startedAt.toISOString().split('T')[0];
      if (!trendsMap[day]) {
        trendsMap[day] = { date: day, successful: 0, failed: 0, rollbacks: 0 };
      }
      if (dep.status === DeploymentStatus.SUCCESSFUL) {
        trendsMap[day].successful += 1;
      } else if (dep.status === DeploymentStatus.FAILED) {
        trendsMap[day].failed += 1;
      } else if (dep.status === DeploymentStatus.ROLLED_BACK) {
        trendsMap[day].rollbacks += 1;
        trendsMap[day].failed += 1;
      }
    }
    const deploymentTrends = Object.values(trendsMap).sort((a, b) => a.date.localeCompare(b.date));

    // 2. Success Rate Trend
    const successRateTrends = deploymentTrends.map(t => {
      const total = t.successful + t.failed;
      const rate = total > 0 ? Number(((t.successful / total) * 100).toFixed(1)) : 100;
      return {
        date: t.date,
        successRate: rate,
      };
    });

    // 3. Rollback Frequency by Date
    const rollbackFrequency = deploymentTrends.map(t => ({
      date: t.date,
      rollbacks: t.rollbacks,
    }));

    // 4. Failures by Environment
    const envFailureMap: { [env: string]: number } = {
      PRODUCTION: 0,
      STAGING: 0,
      QA: 0,
      DEVELOPMENT: 0,
    };
    for (const fail of allFailures) {
      const env = fail.deployment?.environment || 'PRODUCTION';
      envFailureMap[env] = (envFailureMap[env] || 0) + 1;
    }
    const failuresByEnvironment = Object.entries(envFailureMap).map(([env, count]) => ({
      environment: env,
      count,
    }));

    // 5. Failures by Service
    const serviceFailureMap: { [service: string]: number } = {};
    for (const fail of allFailures) {
      const srv = fail.deployment?.serviceName || 'Unknown Service';
      serviceFailureMap[srv] = (serviceFailureMap[srv] || 0) + 1;
    }
    const failuresByService = Object.entries(serviceFailureMap)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count);

    // 6. Root Cause Distribution
    const rootCauseMap: { [cat: string]: number } = {};
    for (const pm of allPostMortems) {
      const cat = pm.rootCauseCategory;
      rootCauseMap[cat] = (rootCauseMap[cat] || 0) + 1;
    }
    // Ensure standard categories exist even if 0
    const defaultCategories = [
      'CODE_DEFECT',
      'CONFIGURATION',
      'INFRASTRUCTURE',
      'DATABASE',
      'DEPENDENCY',
      'PIPELINE',
      'HUMAN_ERROR',
      'SECURITY',
      'UNKNOWN',
    ];
    for (const cat of defaultCategories) {
      if (!(cat in rootCauseMap)) {
        rootCauseMap[cat] = 0;
      }
    }
    const rootCauseDistribution = Object.entries(rootCauseMap).map(([category, count]) => ({
      category: category.replace(/_/g, ' '),
      rawCategory: category,
      count,
    }));

    res.json({
      summary: {
        totalDeployments,
        successfulDeployments,
        failedDeployments: totalFailedOrRolledBack,
        totalRollbacks,
        successRate,
        rollbackRate,
        mttrMinutes: avgMttr,
        openPostMortems,
      },
      charts: {
        deploymentTrends,
        successRateTrends,
        rollbackFrequency,
        failuresByEnvironment,
        failuresByService,
        rootCauseDistribution,
      },
    });
  } catch (err: any) {
    console.error('Error in getDashboardStats:', err);
    res.status(500).json({ error: 'Failed to compute dashboard metrics' });
  }
}
