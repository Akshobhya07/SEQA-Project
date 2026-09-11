import { PrismaClient, Role, UserStatus, Environment, DeploymentStatus, HealthStatus, Severity, IncidentStatus, RollbackStatus, ApprovalStatus, StepStatus, PostMortemStatus, RootCauseCategory, ActionType, ActionPriority, ActionStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0 && process.env.FORCE_SEED !== 'true') {
    console.log('[Seed] Database is already initialized with data. Skipping seed.');
    return;
  }

  console.log('Seeding database with realistic DevOps audit data...');

  // Clean existing tables in reverse dependency order
  await prisma.comment.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.correctiveAction.deleteMany();
  await prisma.postMortem.deleteMany();
  await prisma.rollbackStep.deleteMany();
  await prisma.rollback.deleteMany();
  await prisma.deploymentFailure.deleteMany();
  await prisma.deployment.deleteMany();
  await prisma.application.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();

  // 1. Create Demo Users
  const salt = await bcrypt.genSalt(10);
  const passwordAdmin = await bcrypt.hash('Admin@123', salt);
  const passwordSre = await bcrypt.hash('Sre@123', salt);
  const passwordDev = await bcrypt.hash('Developer@123', salt);
  const passwordViewer = await bcrypt.hash('Viewer@123', salt);

  const admin = await prisma.user.create({
    data: {
      id: 'usr-admin-001',
      name: 'Alex Vance (Admin)',
      email: 'admin@example.com',
      password: passwordAdmin,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  const sre = await prisma.user.create({
    data: {
      id: 'usr-sre-002',
      name: 'Elena Rostova (Lead SRE)',
      email: 'sre@example.com',
      password: passwordSre,
      role: Role.SRE,
      status: UserStatus.ACTIVE,
    },
  });

  const dev = await prisma.user.create({
    data: {
      id: 'usr-dev-003',
      name: 'Marcus Chen (Staff Engineer)',
      email: 'developer@example.com',
      password: passwordDev,
      role: Role.DEVELOPER,
      status: UserStatus.ACTIVE,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      id: 'usr-view-004',
      name: 'Sarah Jenkins (Auditor/Viewer)',
      email: 'viewer@example.com',
      password: passwordViewer,
      role: Role.VIEWER,
      status: UserStatus.ACTIVE,
    },
  });

  console.log('Users created: Admin, SRE, Developer, Viewer');

  // 2. Create Teams
  const paymentTeam = await prisma.team.create({
    data: {
      id: 'team-payments',
      name: 'Core Payments & Billing',
      description: 'Responsible for payment processing, ledger transactions, and billing pipelines.',
      leadId: sre.id,
      members: {
        connect: [{ id: admin.id }, { id: sre.id }, { id: dev.id }],
      },
    },
  });

  const platformTeam = await prisma.team.create({
    data: {
      id: 'team-platform',
      name: 'Cloud Infrastructure & SRE',
      description: 'Manages Kubernetes clusters, CI/CD runners, observability, and network infrastructure.',
      leadId: sre.id,
      members: {
        connect: [{ id: admin.id }, { id: sre.id }],
      },
    },
  });

  const orderTeam = await prisma.team.create({
    data: {
      id: 'team-orders',
      name: 'Fulfillment & Logistics',
      description: 'Owns order state machines, inventory reservations, and delivery webhook pipelines.',
      leadId: dev.id,
      members: {
        connect: [{ id: dev.id }, { id: viewer.id }],
      },
    },
  });

  // 3. Create Applications
  const apps = [
    {
      id: 'app-payments',
      name: 'Payment Service',
      key: 'PAYMENT_SRV',
      description: 'Stripe, PayPal, and ACH gateway processor handling 50k txn/min.',
      repoUrl: 'https://github.com/enterprise/payment-service',
      teamId: paymentTeam.id,
    },
    {
      id: 'app-auth',
      name: 'User Authentication Service',
      key: 'AUTH_SRV',
      description: 'OAuth2/OIDC provider, session manager, and RBAC token validator.',
      repoUrl: 'https://github.com/enterprise/auth-service',
      teamId: platformTeam.id,
    },
    {
      id: 'app-orders',
      name: 'Order Management',
      key: 'ORDER_MGMT',
      description: 'Distributed event-driven order processing engine with Kafka.',
      repoUrl: 'https://github.com/enterprise/order-management',
      teamId: orderTeam.id,
    },
    {
      id: 'app-inventory',
      name: 'Inventory Service',
      key: 'INVENTORY_SRV',
      description: 'Real-time stock reservation, SKU indexing, and warehouse sync.',
      repoUrl: 'https://github.com/enterprise/inventory-service',
      teamId: orderTeam.id,
    },
    {
      id: 'app-notif',
      name: 'Notification Service',
      key: 'NOTIF_SRV',
      description: 'Transactional email, SMS, and push notification dispatcher.',
      repoUrl: 'https://github.com/enterprise/notification-service',
      teamId: platformTeam.id,
    },
    {
      id: 'app-analytics',
      name: 'Analytics API',
      key: 'ANALYTICS_API',
      description: 'Real-time OLAP metrics and cohort analysis engine.',
      repoUrl: 'https://github.com/enterprise/analytics-api',
      teamId: platformTeam.id,
    },
  ];

  for (const app of apps) {
    await prisma.application.create({ data: app });
  }

  console.log('Applications and teams created.');

  // 4. Create Deployments (24 total)
  const baseDate = new Date('2026-09-01T10:00:00Z');

  // Helper for generating timestamps
  const getOffsetDate = (days: number, hours: number = 0, mins: number = 0) => {
    const d = new Date(baseDate.getTime());
    d.setDate(d.getDate() + days);
    d.setHours(d.getHours() + hours);
    d.setMinutes(d.getMinutes() + mins);
    return d;
  };

  // Deployment 1: Payment Service v2.4.1 (FAILED & ROLLED BACK)
  const dep1 = await prisma.deployment.create({
    data: {
      id: 'DEP-2026-000124',
      title: 'Payment Gateway Sharding and Postgres Schema Migration',
      applicationId: 'app-payments',
      serviceName: 'Payment Service',
      version: 'v2.4.1',
      environment: Environment.PRODUCTION,
      branch: 'release/v2.4.1',
      commitSha: '9f2a8c3d41b0',
      deploymentTool: 'ArgoCD',
      changeTicketId: 'JIRA-8492',
      releaseNotes: 'Partitioning of transactions table by month; update stripe-sdk to 14.1.0',
      deployedById: sre.id,
      status: DeploymentStatus.ROLLED_BACK,
      startedAt: getOffsetDate(10, 8, 30),
      completedAt: getOffsetDate(10, 8, 48),
      durationSeconds: 1080,
      healthStatus: HealthStatus.CRITICAL,
      healthMetrics: JSON.stringify({
        api: 'Failed',
        database: 'Degraded',
        frontend: 'Healthy',
        workers: 'Failed',
        errorRate: '42.8%',
        latencyMs: 3850,
      }),
      logs: `[14:30:00] INFO: ArgoCD sync initiated for target: production-cluster-us-east-1
[14:30:15] INFO: Applying Kubernetes Deployment yaml payment-service:v2.4.1
[14:30:28] INFO: Running pre-deployment migration: 20260910_partition_transactions.sql
[14:31:02] ERROR: Exclusive table lock timeout on "public.transactions" (lock wait timeout 30000ms exceeded)
[14:31:05] FATAL: Migration failed. Node 3 rejected incoming client queries.
[14:31:12] ERROR: Readiness probe failed for pod payment-service-789bfb-k98dx: HTTP 500 Connection Timeout
[14:31:25] ERROR: Circuit breaker OPEN for /api/v1/charge (error rate > 40%)
[14:32:00] CRITICAL: Rollback triggered by automated SRE canary policy.`,
    },
  });

  // Incident for Dep 1
  const inc1 = await prisma.deploymentFailure.create({
    data: {
      id: 'INC-2026-000041',
      deploymentId: dep1.id,
      severity: Severity.SEV_1_CRITICAL,
      status: IncidentStatus.RESOLVED,
      failureTime: getOffsetDate(10, 8, 31),
      detectedTime: getOffsetDate(10, 8, 32),
      failureReason: 'Exclusive lock timeout during table partitioning migration in PostgreSQL shard 3',
      whatHappened: 'The deployment script executed an ALTER TABLE on the 180-million row transactions table without a low lock-timeout wrapper. Production traffic blocked behind the exclusive table lock, exhausting the PgBouncer pool in 35 seconds.',
      observableSymptoms: 'HTTP 504 Gateway Timeouts on /api/v1/charge, transaction drop by 94%, PgBouncer active clients 1000/1000 max capacity.',
      affectedServices: JSON.stringify(['Payment Service', 'Checkout Web API', 'Order Management']),
      usersAffected: 14200,
      downtimeMinutes: 18,
      businessImpact: 'Estimated $84,000 in delayed checkouts; 1,210 transactions failed during the 18-minute window.',
      dataImpact: 'Zero data corruption. Uncommitted transactions rolled back cleanly.',
      errorMessage: 'ERROR: lock_timeout exceeded while acquiring AccessExclusiveLock on relation "transactions"',
      errorCode: 'PG_55P03',
      logsSnippet: 'STATEMENT: ALTER TABLE transactions ADD CONSTRAINT check_sharding CHECK (created_at IS NOT NULL);',
      alertUrl: 'https://datadog.internal.net/alerts/849201',
      immediateActionsTaken: 'Killed pending ALTER TABLE query via pg_terminate_backend. Reverted Helm release to v2.4.0. Flushed PgBouncer pooled connections.',
      assignedEngineerId: sre.id,
      incidentCommanderId: admin.id,
    },
  });

  // Rollback for Dep 1
  const rb1 = await prisma.rollback.create({
    data: {
      id: 'RB-2026-000018',
      deploymentId: dep1.id,
      failedVersion: 'v2.4.1',
      restoredVersion: 'v2.4.0',
      environment: Environment.PRODUCTION,
      reason: 'SEV-1 Incident INC-2026-000041: PostgreSQL exclusive lock timeout blocking checkout pipeline.',
      status: RollbackStatus.COMPLETED,
      requiresApproval: true,
      requestedById: sre.id,
      requestedAt: getOffsetDate(10, 8, 33),
      approvedById: admin.id,
      approvedAt: getOffsetDate(10, 8, 34),
      approvalComment: 'Approved emergency rollback to restore transaction processing immediately.',
      approvalStatus: ApprovalStatus.APPROVED,
      initiatedById: sre.id,
      startedAt: getOffsetDate(10, 8, 35),
      completedAt: getOffsetDate(10, 8, 48),
      durationSeconds: 780,
    },
  });

  // Rollback steps for Dep 1
  const rb1Steps = [
    { num: 1, title: 'Terminate blocking migration queries', desc: 'Execute pg_terminate_backend on all active ALTER TABLE queries on shard 3.', status: StepStatus.COMPLETED, notes: 'Terminated PID 49102.' },
    { num: 2, title: 'Verify current pod health', desc: 'Inspect Kubernetes pods and check PgBouncer connection pool depth.', status: StepStatus.COMPLETED, notes: 'PgBouncer connection queue observed at 1,000.' },
    { num: 3, title: 'Restore previous container image (v2.4.0)', desc: 'Run helm rollback payment-service 84 to switch deployments back to v2.4.0.', status: StepStatus.COMPLETED, notes: 'Image pulled from ECR and deployed.' },
    { num: 4, title: 'Verify database schema consistency', desc: 'Ensure no partial index or invalid constraint exists on transactions table.', status: StepStatus.COMPLETED, notes: 'Schema matches v2.4.0 clean state.' },
    { num: 5, title: 'Restart service pods gracefully', desc: 'Perform rolling restart of payment-service-deployment with 25% maxUnavailable.', status: StepStatus.COMPLETED, notes: '24/24 pods in Running state.' },
    { num: 6, title: 'Run automated synthetic smoke tests', desc: 'Execute end-to-end sandbox charge tests through Stripe & PayPal gateways.', status: StepStatus.COMPLETED, notes: 'All 15 smoke tests passed with 200 OK.' },
    { num: 7, title: 'Verify application metrics and latency', desc: 'Verify Datadog error rate drops below 0.1% and p99 latency < 250ms.', status: StepStatus.COMPLETED, notes: 'P99 returned to 182ms; error rate 0.02%.' },
    { num: 8, title: 'Confirm service recovery and resolve incident', desc: 'Notify Incident Commander and post status update to #incident-payments.', status: StepStatus.COMPLETED, notes: 'Status page updated: Operational.' },
  ];

  for (const s of rb1Steps) {
    await prisma.rollbackStep.create({
      data: {
        rollbackId: rb1.id,
        stepNumber: s.num,
        title: s.title,
        description: s.desc,
        status: s.status,
        executorId: sre.id,
        startedAt: getOffsetDate(10, 8, 35 + s.num),
        completedAt: getOffsetDate(10, 8, 36 + s.num),
        notes: s.notes,
      },
    });
  }

  // Post-Mortem for Dep 1
  const pm1 = await prisma.postMortem.create({
    data: {
      id: 'PM-2026-000011',
      incidentId: inc1.id,
      deploymentId: dep1.id,
      title: 'Post-Mortem: Payment Service Schema Lock Outage on v2.4.1 Deployment',
      status: PostMortemStatus.APPROVED,
      severity: Severity.SEV_1_CRITICAL,
      authorId: sre.id,
      executiveSummary: 'On September 11, 2026, the deployment of Payment Service v2.4.1 caused an 18-minute outage affecting payment checkouts. The issue was triggered by an uncontrolled database migration acquiring an exclusive lock on the core transactions table. Rollback to v2.4.0 restored full service with zero data loss.',
      incidentTimeline: JSON.stringify([
        { time: '14:30 UTC', event: 'Deployment of Payment Service v2.4.1 initiated by ArgoCD pipeline.', actor: 'CI/CD' },
        { time: '14:31 UTC', event: 'Migration script executed ALTER TABLE without lock timeout, queueing incoming read/write traffic.', actor: 'PostgreSQL' },
        { time: '14:32 UTC', event: 'Datadog alert triggered: Payment Service 5xx error rate > 40%. Incident INC-2026-000041 opened.', actor: 'Monitoring' },
        { time: '14:33 UTC', event: 'Rollback RB-2026-000018 requested by Lead SRE Elena Rostova.', actor: 'Elena (SRE)' },
        { time: '14:34 UTC', event: 'Rollback approved by Admin Alex Vance.', actor: 'Alex (Admin)' },
        { time: '14:38 UTC', event: 'Blocking migration process killed; Helm rollback to v2.4.0 initiated.', actor: 'Elena (SRE)' },
        { time: '14:48 UTC', event: 'All pods healthy; payment success rate 99.98%; incident mitigated.', actor: 'Elena (SRE)' },
      ]),
      impactAnalysis: JSON.stringify({
        duration: '18 minutes',
        usersAffected: '14,200 checkout attempts',
        servicesAffected: ['Payment Service', 'Checkout Web API', 'Order Management'],
        revenueImpact: '$84,000 delayed transactions (recovered post-rollback)',
        dataImpact: 'Zero data loss or corruption',
      }),
      rootCauseCategory: RootCauseCategory.DATABASE,
      rootCauseDetail: 'The migration script added a check constraint directly to the transactions table. In PostgreSQL, adding constraints without the NOT VALID clause acquires an AccessExclusiveLock, scanning the whole table while blocking all concurrent SELECT and UPDATE operations.',
      fiveWhys: JSON.stringify([
        { step: 1, question: 'Why did the deployment fail?', answer: 'The Payment Service crashed with HTTP 504 and database connection pool exhaustion.' },
        { step: 2, question: 'Why was the database connection pool exhausted?', answer: 'Hundreds of backend worker threads were blocked waiting on an AccessExclusiveLock on the transactions table.' },
        { step: 3, question: 'Why did the query acquire an AccessExclusiveLock?', answer: 'The migration script executed an ALTER TABLE ADD CONSTRAINT directly without NOT VALID flag.' },
        { step: 4, question: 'Why was the migration executed without NOT VALID flag?', answer: 'The migration was not reviewed against zero-downtime PostgreSQL schema guidelines in the PR review.' },
        { step: 5, question: 'Why did CI/CD pipeline not catch this before production?', answer: 'Staging environment database had only 5,000 rows, where the exclusive lock took < 5ms and passed unflagged.' },
      ]),
      contributingFactors: JSON.stringify([
        'Staging database test dataset did not reflect production scale (5k rows vs 180M rows).',
        'No automated linter for dangerous SQL DDL commands (e.g. pg-safe-migrations or squawk).',
        'Database lock_timeout was unset in the deployment session defaults.',
      ]),
      whatWentWell: 'Automated rollback alerts fired within 90 seconds. Rollback checklist executed cleanly in 13 minutes. Communication in #incident-payments was disciplined.',
      whatWentWrong: 'No automated pre-merge DDL safety checks. Staging lacked scale testing. Rollback approval took 1 minute longer than ideal due to phone notification delay.',
      lessonsLearned: 'All future DDL operations on tables > 10M rows must mandate NOT VALID + VALIDATE CONSTRAINT multi-step migrations with 2-second lock timeouts.',
    },
  });

  // Corrective Actions for PM 1
  await prisma.correctiveAction.create({
    data: {
      id: 'CA-2026-000031',
      postMortemId: pm1.id,
      description: 'Integrate squawk/pg-safe-migrations SQL linter into GitHub Actions CI pipeline to block unsafe DDL.',
      type: ActionType.PROCESS,
      priority: ActionPriority.P0_CRITICAL,
      ownerId: dev.id,
      dueDate: getOffsetDate(15),
      status: ActionStatus.IN_PROGRESS,
      verificationNotes: 'GitHub Action workflow draft submitted in PR #412.',
    },
  });

  await prisma.correctiveAction.create({
    data: {
      id: 'CA-2026-000032',
      postMortemId: pm1.id,
      description: 'Configure session-level lock_timeout = 2s and statement_timeout = 10s for all deployment migration runners.',
      type: ActionType.INFRASTRUCTURE,
      priority: ActionPriority.P1_HIGH,
      ownerId: sre.id,
      dueDate: getOffsetDate(17),
      completionDate: getOffsetDate(12),
      status: ActionStatus.COMPLETED,
      verificationNotes: 'Updated in Terraform db-parameter-group modules.',
    },
  });

  await prisma.correctiveAction.create({
    data: {
      id: 'CA-2026-000033',
      postMortemId: pm1.id,
      description: 'Create an anonymized 10M row staging benchmark replica for performance pre-flight validation.',
      type: ActionType.PREVENTIVE,
      priority: ActionPriority.P2_MEDIUM,
      ownerId: sre.id,
      dueDate: getOffsetDate(25),
      status: ActionStatus.OPEN,
    },
  });

  // Deployment 2: User Authentication Service v3.2.0 (FAILED & ROLLED BACK)
  const dep2 = await prisma.deployment.create({
    data: {
      id: 'DEP-2026-000125',
      title: 'JWT Secret Rotation and Passkey WebAuthn v2',
      applicationId: 'app-auth',
      serviceName: 'User Authentication Service',
      version: 'v3.2.0',
      environment: Environment.PRODUCTION,
      branch: 'main',
      commitSha: 'c81e728d9a01',
      deploymentTool: 'GitHub Actions',
      changeTicketId: 'JIRA-8501',
      releaseNotes: 'Implement dual-key JWT rotation and WebAuthn FIDO2 passkey registration endpoint.',
      deployedById: dev.id,
      status: DeploymentStatus.ROLLED_BACK,
      startedAt: getOffsetDate(8, 14, 0),
      completedAt: getOffsetDate(8, 14, 22),
      durationSeconds: 1320,
      healthStatus: HealthStatus.CRITICAL,
      healthMetrics: JSON.stringify({
        api: 'Failed',
        database: 'Healthy',
        frontend: 'Healthy',
        workers: 'Failed',
        errorRate: '100%',
        latencyMs: 120,
      }),
      logs: `[14:00:00] Starting deployment for auth-service:v3.2.0
[14:00:10] Container image deployed to pods auth-service-67b8d-xxxx
[14:00:15] FATAL: Missing mandatory environment variable JWT_SECRET_V2
[14:00:16] Container crashed with exit code 1 (CrashLoopBackOff)
[14:01:00] Liveness probe failed 3 times. Pods restarting indefinitely.
[14:02:00] Ingress returning 502 Bad Gateway across all OAuth endpoints.`,
    },
  });

  const inc2 = await prisma.deploymentFailure.create({
    data: {
      id: 'INC-2026-000042',
      deploymentId: dep2.id,
      severity: Severity.SEV_1_CRITICAL,
      status: IncidentStatus.RESOLVED,
      failureTime: getOffsetDate(8, 14, 1),
      detectedTime: getOffsetDate(8, 14, 2),
      failureReason: 'Missing environment variable JWT_SECRET_V2 in production Helm release values file',
      whatHappened: 'Code required JWT_SECRET_V2 for token signing. The secret was provisioned in AWS Secrets Manager, but the Kubernetes ExternalSecret mapping was omitted in the Helm release commit.',
      observableSymptoms: 'CrashLoopBackOff on all 12 auth-service pods; 502 Bad Gateway on /oauth/token and /login.',
      affectedServices: JSON.stringify(['User Authentication Service', 'All APIs']),
      usersAffected: 38000,
      downtimeMinutes: 14,
      businessImpact: 'Total login outage for 14 minutes across web and mobile apps.',
      dataImpact: 'None.',
      errorMessage: 'Error: JWT_SECRET_V2 is required for application startup',
      errorCode: 'ENV_CONFIG_MISSING',
      immediateActionsTaken: 'Rollback to v3.1.9 initiated immediately by SRE on-call.',
      assignedEngineerId: sre.id,
      incidentCommanderId: admin.id,
    },
  });

  const rb2 = await prisma.rollback.create({
    data: {
      id: 'RB-2026-000019',
      deploymentId: dep2.id,
      failedVersion: 'v3.2.0',
      restoredVersion: 'v3.1.9',
      environment: Environment.PRODUCTION,
      reason: 'INC-2026-000042: CrashLoopBackOff due to missing JWT_SECRET_V2 secret mapping.',
      status: RollbackStatus.COMPLETED,
      requiresApproval: true,
      requestedById: dev.id,
      requestedAt: getOffsetDate(8, 14, 3),
      approvedById: sre.id,
      approvedAt: getOffsetDate(8, 14, 4),
      approvalComment: 'Emergency approval granted. Reverting to v3.1.9 immediately.',
      approvalStatus: ApprovalStatus.APPROVED,
      initiatedById: sre.id,
      startedAt: getOffsetDate(8, 14, 5),
      completedAt: getOffsetDate(8, 14, 18),
      durationSeconds: 780,
    },
  });

  const rb2Steps = [
    { num: 1, title: 'Verify pod failure logs', desc: 'Confirm CrashLoopBackOff cause via kubectl logs.', status: StepStatus.COMPLETED, notes: 'Missing JWT_SECRET_V2 confirmed.' },
    { num: 2, title: 'Trigger Helm rollback', desc: 'helm rollback auth-service to previous stable release.', status: StepStatus.COMPLETED, notes: 'Target revision restored.' },
    { num: 3, title: 'Verify new pod startup', desc: 'Wait for 12/12 pods to report 1/1 Running and pass readiness check.', status: StepStatus.COMPLETED, notes: '12/12 pods ready in 4 minutes.' },
    { num: 4, title: 'Execute synthetic authentication test', desc: 'Simulate password login, token refresh, and introspection.', status: StepStatus.COMPLETED, notes: 'OIDC flow verified.' },
    { num: 5, title: 'Verify latency and recovery', desc: 'Ensure error rate returns to 0% and 502s clear.', status: StepStatus.COMPLETED, notes: 'All endpoints responding 200.' },
  ];

  for (const s of rb2Steps) {
    await prisma.rollbackStep.create({
      data: {
        rollbackId: rb2.id,
        stepNumber: s.num,
        title: s.title,
        description: s.desc,
        status: s.status,
        executorId: sre.id,
        startedAt: getOffsetDate(8, 14, 5 + s.num),
        completedAt: getOffsetDate(8, 14, 6 + s.num),
        notes: s.notes,
      },
    });
  }

  const pm2 = await prisma.postMortem.create({
    data: {
      id: 'PM-2026-000012',
      incidentId: inc2.id,
      deploymentId: dep2.id,
      title: 'Post-Mortem: Auth Service CrashLoopBackOff Due to Missing Environment Secret',
      status: PostMortemStatus.APPROVED,
      severity: Severity.SEV_1_CRITICAL,
      authorId: dev.id,
      executiveSummary: 'Deployment of v3.2.0 halted entire platform authentication for 14 minutes due to an unmapped environment secret in Kubernetes. Rollback to v3.1.9 restored user access.',
      incidentTimeline: JSON.stringify([
        { time: '14:00 UTC', event: 'Deployment initiated for Auth Service v3.2.0.', actor: 'CI/CD' },
        { time: '14:01 UTC', event: 'Pods enter CrashLoopBackOff.', actor: 'Kubernetes' },
        { time: '14:03 UTC', event: 'Incident INC-2026-000042 declared SEV-1. Rollback RB-2026-000019 requested.', actor: 'Elena (SRE)' },
        { time: '14:04 UTC', event: 'Rollback approved and Helm release reverted to v3.1.9.', actor: 'Elena (SRE)' },
        { time: '14:18 UTC', event: 'All pods stable. Login success rate restored to 100%.', actor: 'Elena (SRE)' },
      ]),
      impactAnalysis: JSON.stringify({
        duration: '14 minutes',
        usersAffected: '38,000 users unable to sign in',
        servicesAffected: ['User Authentication Service', 'Gateway', 'Mobile Apps'],
        revenueImpact: 'Negligible direct financial loss, high reputational impact',
        dataImpact: 'Zero data impact',
      }),
      rootCauseCategory: RootCauseCategory.CONFIGURATION,
      rootCauseDetail: 'The backend application enforced a strict startup assertion requiring JWT_SECRET_V2 without a fallback or pre-deployment validation schema in the Helm CI pipeline.',
      fiveWhys: JSON.stringify([
        { step: 1, question: 'Why did the deployment fail?', answer: 'Application threw a fatal uncaught exception during boot and exited.' },
        { step: 2, question: 'Why did it throw an exception during boot?', answer: 'The environment variable JWT_SECRET_V2 was undefined.' },
        { step: 3, question: 'Why was JWT_SECRET_V2 undefined in the container?', answer: 'The ExternalSecret Kubernetes manifest was not updated in the production Helm chart values.' },
        { step: 4, question: 'Why was the Helm chart values file not updated?', answer: 'Secrets configuration was kept in a private repository detached from the main application pull request.' },
        { step: 5, question: 'Why did deployment proceed without verifying secrets?', answer: 'The deployment pipeline lacked an automated dry-run validation step checking required environment variables against the cluster.' },
      ]),
      contributingFactors: JSON.stringify([
        'Split repository pattern between application code and deployment Helm values.',
        'No pre-flight validation hook testing secret presence before pod rollover.',
      ]),
      whatWentWell: 'Fast rollback execution (14 min total MTTR). Good visibility into pod crashes via Slack alerts.',
      whatWentWrong: 'No staging-to-prod environment variable diff checker in CI.',
      lessonsLearned: 'Implement pre-deployment config schema validation (JSON Schema/Zod) verified by CI before any production rollout is permitted.',
    },
  });

  await prisma.correctiveAction.create({
    data: {
      id: 'CA-2026-000034',
      postMortemId: pm2.id,
      description: 'Implement Zod environment validation pre-flight check in CI pipeline before Helm upgrade.',
      type: ActionType.CODE,
      priority: ActionPriority.P0_CRITICAL,
      ownerId: dev.id,
      dueDate: getOffsetDate(14),
      completionDate: getOffsetDate(10),
      status: ActionStatus.COMPLETED,
      verificationNotes: 'Added env validation script run on pull request build.',
    },
  });

  await prisma.correctiveAction.create({
    data: {
      id: 'CA-2026-000035',
      postMortemId: pm2.id,
      description: 'Create Helm pre-upgrade hooks to verify all ExternalSecret resources exist in Kubernetes namespace.',
      type: ActionType.INFRASTRUCTURE,
      priority: ActionPriority.P1_HIGH,
      ownerId: sre.id,
      dueDate: getOffsetDate(20),
      status: ActionStatus.IN_PROGRESS,
    },
  });

  // Deployment 3: Inventory Service v4.0.1 (FAILED & ROLLED BACK)
  const dep3 = await prisma.deployment.create({
    data: {
      id: 'DEP-2026-000126',
      title: 'Real-Time Stock Caching with Redis Cluster',
      applicationId: 'app-inventory',
      serviceName: 'Inventory Service',
      version: 'v4.0.1',
      environment: Environment.PRODUCTION,
      branch: 'release/v4.0.1',
      commitSha: '1a2b3c4d5e6f',
      deploymentTool: 'ArgoCD',
      changeTicketId: 'JIRA-8515',
      releaseNotes: 'Migrate in-memory cache to distributed Redis Cluster cache-aside pattern.',
      deployedById: dev.id,
      status: DeploymentStatus.ROLLED_BACK,
      startedAt: getOffsetDate(5, 11, 0),
      completedAt: getOffsetDate(5, 11, 35),
      durationSeconds: 2100,
      healthStatus: HealthStatus.CRITICAL,
      healthMetrics: JSON.stringify({
        api: 'Failed',
        database: 'Healthy',
        frontend: 'Healthy',
        workers: 'Failed',
        errorRate: '78%',
        latencyMs: 5400,
      }),
      logs: `[11:00:00] Starting rollout of inventory-service:v4.0.1
[11:05:00] Redis cluster connection pool initialized with 200 connections
[11:08:22] WARN: Memory usage exceeding 85% container limit (1.7GB / 2.0GB)
[11:10:45] FATAL: OOMKilled - container exceeded 2048MB memory limit
[11:11:10] Pod inventory-service-8921-xz terminates with exit code 137`,
    },
  });

  const inc3 = await prisma.deploymentFailure.create({
    data: {
      id: 'INC-2026-000043',
      deploymentId: dep3.id,
      severity: Severity.SEV_2_HIGH,
      status: IncidentStatus.RESOLVED,
      failureTime: getOffsetDate(5, 11, 10),
      detectedTime: getOffsetDate(5, 11, 12),
      failureReason: 'Unbounded buffer allocation in Redis cache-aside client causing OOMKilled container exits',
      whatHappened: 'A batch SKU query loaded 100,000 product stock states into an unpaged in-memory array before caching, exceeding the 2GB container memory threshold under heavy traffic.',
      observableSymptoms: 'Containers terminated with exit code 137 (OOMKilled); high latency on warehouse pick lists.',
      affectedServices: JSON.stringify(['Inventory Service', 'Warehouse Fulfillment App']),
      usersAffected: 450,
      downtimeMinutes: 25,
      businessImpact: 'Warehouse fulfillment picking halted for 25 minutes across 3 fulfillment centers.',
      dataImpact: 'None.',
      errorMessage: 'System OOM killer terminated process inventory-service (PID 1)',
      errorCode: 'OOM_EXIT_137',
      immediateActionsTaken: 'Rollback to v4.0.0 executed. Increased container memory limit temporarily to 4GB.',
      assignedEngineerId: dev.id,
      incidentCommanderId: sre.id,
    },
  });

  const rb3 = await prisma.rollback.create({
    data: {
      id: 'RB-2026-000020',
      deploymentId: dep3.id,
      failedVersion: 'v4.0.1',
      restoredVersion: 'v4.0.0',
      environment: Environment.PRODUCTION,
      reason: 'INC-2026-000043: OOM crashes on inventory cache initialization.',
      status: RollbackStatus.COMPLETED,
      requiresApproval: true,
      requestedById: dev.id,
      requestedAt: getOffsetDate(5, 11, 15),
      approvedById: sre.id,
      approvedAt: getOffsetDate(5, 11, 16),
      approvalComment: 'Approved. Revert to stable memory footprint in v4.0.0.',
      approvalStatus: ApprovalStatus.APPROVED,
      initiatedById: sre.id,
      startedAt: getOffsetDate(5, 11, 17),
      completedAt: getOffsetDate(5, 11, 35),
      durationSeconds: 1080,
    },
  });

  const rb3Steps = [
    { num: 1, title: 'Scale down failing v4.0.1 pods', desc: 'Avoid container thrashing by decreasing replica target.', status: StepStatus.COMPLETED, notes: 'Scaled down.' },
    { num: 2, title: 'Deploy v4.0.0 image', desc: 'Revert deployment spec to docker tag v4.0.0.', status: StepStatus.COMPLETED, notes: 'Deploying v4.0.0.' },
    { num: 3, title: 'Clear invalid Redis keys', desc: 'Flush partial cache tags to avoid deserialization anomalies.', status: StepStatus.COMPLETED, notes: 'Cache tags purged.' },
    { num: 4, title: 'Monitor memory and recovery', desc: 'Ensure container memory holds steady at ~450MB.', status: StepStatus.COMPLETED, notes: 'Memory stable at 420MB.' },
  ];

  for (const s of rb3Steps) {
    await prisma.rollbackStep.create({
      data: {
        rollbackId: rb3.id,
        stepNumber: s.num,
        title: s.title,
        description: s.desc,
        status: s.status,
        executorId: dev.id,
        startedAt: getOffsetDate(5, 11, 17 + s.num),
        completedAt: getOffsetDate(5, 11, 18 + s.num),
        notes: s.notes,
      },
    });
  }

  const pm3 = await prisma.postMortem.create({
    data: {
      id: 'PM-2026-000013',
      incidentId: inc3.id,
      deploymentId: dep3.id,
      title: 'Post-Mortem: Inventory Service OOMKilled Outage on v4.0.1 Deployment',
      status: PostMortemStatus.UNDER_REVIEW,
      severity: Severity.SEV_2_HIGH,
      authorId: dev.id,
      executiveSummary: 'Memory leak caused by unpaged bulk database reads into Redis cache resulted in recurring pod eviction under production peak load. Reverted to v4.0.0 to restore operations.',
      incidentTimeline: JSON.stringify([
        { time: '11:00 UTC', event: 'Rollout of Inventory Service v4.0.1 started.', actor: 'CI/CD' },
        { time: '11:10 UTC', event: 'Pod OOMKilled alerts triggered in Datadog.', actor: 'Monitoring' },
        { time: '11:15 UTC', event: 'Rollback requested and approved.', actor: 'Elena (SRE)' },
        { time: '11:35 UTC', event: 'Service restored on v4.0.0.', actor: 'Marcus (Dev)' },
      ]),
      impactAnalysis: JSON.stringify({
        duration: '25 minutes',
        usersAffected: '450 warehouse workers',
        servicesAffected: ['Inventory Service', 'Warehouse Picking'],
        revenueImpact: 'Minor shipping delay; zero cancellation',
        dataImpact: 'None',
      }),
      rootCauseCategory: RootCauseCategory.CODE_DEFECT,
      rootCauseDetail: 'Lack of streaming/cursor pagination in bulk stock fetching algorithm resulted in 1.8GB heap spikes during prime time.',
      fiveWhys: JSON.stringify([
        { step: 1, question: 'Why did the pods crash?', answer: 'Kubernetes memory limit was exceeded, triggering Linux OOM killer.' },
        { step: 2, question: 'Why was memory limit exceeded?', answer: 'The application tried to buffer 100k items in memory simultaneously.' },
        { step: 3, question: 'Why did it buffer 100k items?', answer: 'The cache warmer executed findAll() instead of chunked batch queries.' },
        { step: 4, question: 'Why did testing not uncover this?', answer: 'Load test dataset had only 1,000 SKUs.' },
        { step: 5, question: 'Why was load test dataset undersized?', answer: 'Production catalog scale had doubled in Q3 without updating load test fixtures.' },
      ]),
      contributingFactors: JSON.stringify([
        'Outdated load test dataset.',
        'Missing memory profiling in staging benchmark.',
      ]),
      whatWentWell: 'Smooth rollback execution; clean database state.',
      whatWentWrong: 'Took 8 minutes to identify that OOM was occurring due to noisy log output.',
      lessonsLearned: 'Mandate stream processing with chunk size <= 500 items for all caching operations.',
    },
  });

  await prisma.correctiveAction.create({
    data: {
      id: 'CA-2026-000036',
      postMortemId: pm3.id,
      description: 'Refactor cache warmer to use cursor-based streaming with 500 item chunk sizes.',
      type: ActionType.CODE,
      priority: ActionPriority.P1_HIGH,
      ownerId: dev.id,
      dueDate: getOffsetDate(18),
      status: ActionStatus.IN_PROGRESS,
    },
  });

  await prisma.correctiveAction.create({
    data: {
      id: 'CA-2026-000037',
      postMortemId: pm3.id,
      description: 'Update staging load test database fixture to mirror production 150k SKU size.',
      type: ActionType.PROCESS,
      priority: ActionPriority.P2_MEDIUM,
      ownerId: dev.id,
      dueDate: getOffsetDate(24),
      status: ActionStatus.OPEN,
    },
  });

  // Deployment 4: Order Management v1.8.4 (FAILED, IN PROGRESS ROLLBACK)
  const dep4 = await prisma.deployment.create({
    data: {
      id: 'DEP-2026-000127',
      title: 'Kafka Consumer Partition Rebalance and Exactly-Once Semantics',
      applicationId: 'app-orders',
      serviceName: 'Order Management',
      version: 'v1.8.4',
      environment: Environment.PRODUCTION,
      branch: 'main',
      commitSha: '3d4e5f6a7b8c',
      deploymentTool: 'GitHub Actions',
      changeTicketId: 'JIRA-8530',
      releaseNotes: 'Enable Kafka transactional producer and update consumer group protocol.',
      deployedById: dev.id,
      status: DeploymentStatus.FAILED,
      startedAt: getOffsetDate(2, 9, 0),
      completedAt: getOffsetDate(2, 9, 25),
      durationSeconds: 1500,
      healthStatus: HealthStatus.CRITICAL,
      healthMetrics: JSON.stringify({
        api: 'Degraded',
        database: 'Healthy',
        frontend: 'Healthy',
        workers: 'Failed',
        errorRate: '35%',
        latencyMs: 1200,
      }),
      logs: `[09:00:00] Order management v1.8.4 starting up
[09:05:12] Kafka consumer group rebalance in progress...
[09:08:44] ERROR: Consumer heartbeat timeout; group entered livelock
[09:12:00] Partition lag growing exponentially: 45,000 unread messages`,
    },
  });

  const inc4 = await prisma.deploymentFailure.create({
    data: {
      id: 'INC-2026-000044',
      deploymentId: dep4.id,
      severity: Severity.SEV_2_HIGH,
      status: IncidentStatus.INVESTIGATING,
      failureTime: getOffsetDate(2, 9, 8),
      detectedTime: getOffsetDate(2, 9, 10),
      failureReason: 'Kafka consumer group livelock due to prolonged processing time exceeding max.poll.interval.ms',
      whatHappened: 'A long external API call inside the message processing loop exceeded the 300s Kafka heartbeat interval, causing Kafka broker to revoke partitions repeatedly in an endless rebalance storm.',
      observableSymptoms: 'Consumer lag exceeding 50,000 events; orders stuck in PENDING_CONFIRMATION status.',
      affectedServices: JSON.stringify(['Order Management', 'Customer Order Tracking']),
      usersAffected: 2300,
      downtimeMinutes: 30,
      businessImpact: 'Customers receiving delayed order confirmation emails.',
      dataImpact: 'No dropped events; messages buffered in Kafka topic.',
      errorMessage: 'CommitFailedException: Commit cannot be completed since the group has already rebalanced',
      errorCode: 'KAFKA_COMMIT_FAILED',
      immediateActionsTaken: 'Rollback requested to v1.8.3 pending approval from Lead SRE.',
      assignedEngineerId: dev.id,
      incidentCommanderId: sre.id,
    },
  });

  const rb4 = await prisma.rollback.create({
    data: {
      id: 'RB-2026-000021',
      deploymentId: dep4.id,
      failedVersion: 'v1.8.4',
      restoredVersion: 'v1.8.3',
      environment: Environment.PRODUCTION,
      reason: 'INC-2026-000044: Kafka consumer group rebalance storm.',
      status: RollbackStatus.IN_PROGRESS,
      requiresApproval: true,
      requestedById: dev.id,
      requestedAt: getOffsetDate(2, 9, 15),
      approvedById: sre.id,
      approvedAt: getOffsetDate(2, 9, 16),
      approvalComment: 'Approved. Revert consumer group configuration.',
      approvalStatus: ApprovalStatus.APPROVED,
      initiatedById: dev.id,
      startedAt: getOffsetDate(2, 9, 18),
      completedAt: null,
      durationSeconds: null,
    },
  });

  const rb4Steps = [
    { num: 1, title: 'Pause Kafka topic consumption', desc: 'Pause consumer offset commits to prevent repeated rebalance.', status: StepStatus.COMPLETED, notes: 'Paused.' },
    { num: 2, title: 'Rollback Order Management deployment to v1.8.3', desc: 'Apply Kubernetes manifest with stable Kafka client settings.', status: StepStatus.IN_PROGRESS, notes: 'Pod rollout in progress.' },
    { num: 3, title: 'Verify partition assignment', desc: 'Check that all 16 partitions are assigned smoothly.', status: StepStatus.PENDING, notes: '' },
    { num: 4, title: 'Drain consumer lag', desc: 'Monitor consumer lag until buffer returns to zero.', status: StepStatus.PENDING, notes: '' },
  ];

  for (const s of rb4Steps) {
    await prisma.rollbackStep.create({
      data: {
        rollbackId: rb4.id,
        stepNumber: s.num,
        title: s.title,
        description: s.desc,
        status: s.status,
        executorId: dev.id,
        startedAt: s.status !== StepStatus.PENDING ? getOffsetDate(2, 9, 18 + s.num) : null,
        completedAt: s.status === StepStatus.COMPLETED ? getOffsetDate(2, 9, 19 + s.num) : null,
        notes: s.notes,
      },
    });
  }

  // 20 More Realistic Deployments (Successful, In Progress, Scheduled across Environments)
  const remainingDeployments = [
    { id: 'DEP-2026-000101', app: 'app-payments', name: 'Payment Service', ver: 'v2.3.9', env: Environment.PRODUCTION, status: DeploymentStatus.SUCCESSFUL, dur: 420, days: 1, devId: dev.id },
    { id: 'DEP-2026-000102', app: 'app-payments', name: 'Payment Service', ver: 'v2.4.0', env: Environment.PRODUCTION, status: DeploymentStatus.SUCCESSFUL, dur: 390, days: 4, devId: dev.id },
    { id: 'DEP-2026-000103', app: 'app-payments', name: 'Payment Service', ver: 'v2.4.2-rc1', env: Environment.STAGING, status: DeploymentStatus.SUCCESSFUL, dur: 310, days: 10, devId: dev.id },
    { id: 'DEP-2026-000104', app: 'app-auth', name: 'User Authentication Service', ver: 'v3.1.8', env: Environment.PRODUCTION, status: DeploymentStatus.SUCCESSFUL, dur: 480, days: 2, devId: dev.id },
    { id: 'DEP-2026-000105', app: 'app-auth', name: 'User Authentication Service', ver: 'v3.1.9', env: Environment.PRODUCTION, status: DeploymentStatus.SUCCESSFUL, dur: 450, days: 6, devId: dev.id },
    { id: 'DEP-2026-000106', app: 'app-auth', name: 'User Authentication Service', ver: 'v3.2.1-beta', env: Environment.QA, status: DeploymentStatus.SUCCESSFUL, dur: 240, days: 9, devId: dev.id },
    { id: 'DEP-2026-000107', app: 'app-orders', name: 'Order Management', ver: 'v1.8.1', env: Environment.PRODUCTION, status: DeploymentStatus.SUCCESSFUL, dur: 520, days: 1, devId: dev.id },
    { id: 'DEP-2026-000108', app: 'app-orders', name: 'Order Management', ver: 'v1.8.2', env: Environment.PRODUCTION, status: DeploymentStatus.SUCCESSFUL, dur: 510, days: 3, devId: dev.id },
    { id: 'DEP-2026-000109', app: 'app-orders', name: 'Order Management', ver: 'v1.8.3', env: Environment.PRODUCTION, status: DeploymentStatus.SUCCESSFUL, dur: 490, days: 5, devId: dev.id },
    { id: 'DEP-2026-000110', app: 'app-inventory', name: 'Inventory Service', ver: 'v3.9.8', env: Environment.PRODUCTION, status: DeploymentStatus.SUCCESSFUL, dur: 380, days: 2, devId: dev.id },
    { id: 'DEP-2026-000111', app: 'app-inventory', name: 'Inventory Service', ver: 'v4.0.0', env: Environment.PRODUCTION, status: DeploymentStatus.SUCCESSFUL, dur: 395, days: 4, devId: dev.id },
    { id: 'DEP-2026-000112', app: 'app-notif', name: 'Notification Service', ver: 'v1.5.0', env: Environment.PRODUCTION, status: DeploymentStatus.SUCCESSFUL, dur: 310, days: 3, devId: sre.id },
    { id: 'DEP-2026-000113', app: 'app-notif', name: 'Notification Service', ver: 'v1.5.1', env: Environment.STAGING, status: DeploymentStatus.SUCCESSFUL, dur: 290, days: 6, devId: sre.id },
    { id: 'DEP-2026-000114', app: 'app-notif', name: 'Notification Service', ver: 'v1.5.2', env: Environment.QA, status: DeploymentStatus.FAILED, dur: 180, days: 8, devId: sre.id },
    { id: 'DEP-2026-000115', app: 'app-analytics', name: 'Analytics API', ver: 'v2.8.5', env: Environment.PRODUCTION, status: DeploymentStatus.SUCCESSFUL, dur: 440, days: 2, devId: dev.id },
    { id: 'DEP-2026-000116', app: 'app-analytics', name: 'Analytics API', ver: 'v2.9.0', env: Environment.PRODUCTION, status: DeploymentStatus.FAILED, dur: 610, days: 7, devId: dev.id },
    { id: 'DEP-2026-000117', app: 'app-analytics', name: 'Analytics API', ver: 'v2.9.1', env: Environment.STAGING, status: DeploymentStatus.SUCCESSFUL, dur: 350, days: 9, devId: dev.id },
    { id: 'DEP-2026-000118', app: 'app-payments', name: 'Payment Service', ver: 'v2.4.3', env: Environment.DEVELOPMENT, status: DeploymentStatus.IN_PROGRESS, dur: 0, days: 11, devId: dev.id },
    { id: 'DEP-2026-000119', app: 'app-auth', name: 'User Authentication Service', ver: 'v3.3.0', env: Environment.DEVELOPMENT, status: DeploymentStatus.SCHEDULED, dur: 0, days: 11, devId: dev.id },
    { id: 'DEP-2026-000120', app: 'app-orders', name: 'Order Management', ver: 'v1.8.5', env: Environment.QA, status: DeploymentStatus.SUCCESSFUL, dur: 280, days: 10, devId: dev.id },
  ];

  for (const d of remainingDeployments) {
    const started = getOffsetDate(d.days, 10, 0);
    const completed = d.dur > 0 ? getOffsetDate(d.days, 10, Math.floor(d.dur / 60)) : null;
    const health = d.status === DeploymentStatus.FAILED ? HealthStatus.CRITICAL : HealthStatus.HEALTHY;

    await prisma.deployment.create({
      data: {
        id: d.id,
        title: `${d.name} ${d.ver} release for ${d.env}`,
        applicationId: d.app,
        serviceName: d.name,
        version: d.ver,
        environment: d.env,
        branch: d.env === Environment.PRODUCTION ? 'main' : 'develop',
        commitSha: Math.random().toString(16).substring(2, 14),
        deploymentTool: 'GitHub Actions',
        deployedById: d.devId,
        status: d.status,
        startedAt: started,
        completedAt: completed,
        durationSeconds: d.dur > 0 ? d.dur : null,
        healthStatus: health,
        healthMetrics: JSON.stringify({
          api: d.status === DeploymentStatus.FAILED ? 'Failed' : 'Healthy',
          database: 'Healthy',
          frontend: 'Healthy',
          workers: d.status === DeploymentStatus.FAILED ? 'Degraded' : 'Healthy',
          errorRate: d.status === DeploymentStatus.FAILED ? '12.4%' : '0.01%',
          latencyMs: d.status === DeploymentStatus.FAILED ? 840 : 110,
        }),
        logs: `[10:00:00] Starting automated pipeline deployment for ${d.id}...
[10:01:20] Health checks passed.
[10:02:45] Traffic shifted to revision. Status: ${d.status}.`,
      },
    });
  }

  // 2 More Incidents for analytics and notifications
  await prisma.deploymentFailure.create({
    data: {
      id: 'INC-2026-000045',
      deploymentId: 'DEP-2026-000116',
      severity: Severity.SEV_3_MEDIUM,
      status: IncidentStatus.RESOLVED,
      failureTime: getOffsetDate(7, 10, 10),
      detectedTime: getOffsetDate(7, 10, 15),
      failureReason: 'Sequential table scan on 200M events analytics partition caused query timeout',
      whatHappened: 'A newly added aggregation query omitted composite index on event_type + timestamp, overloading primary read replica CPU to 99%.',
      observableSymptoms: 'API p99 latency spiked from 120ms to 9,400ms. Grafana dashboards timing out.',
      affectedServices: JSON.stringify(['Analytics API', 'Internal Reporting Dashboards']),
      usersAffected: 85,
      downtimeMinutes: 45,
      businessImpact: 'Executive dashboards were non-responsive for 45 minutes.',
      dataImpact: 'None.',
      errorMessage: 'QueryExecutionException: statement timeout exceeded after 30000ms',
      errorCode: 'PG_QUERY_TIMEOUT',
      immediateActionsTaken: 'Hotfixed query with temporary limit and added concurrent index on read replica.',
      assignedEngineerId: dev.id,
      incidentCommanderId: sre.id,
    },
  });

  await prisma.deploymentFailure.create({
    data: {
      id: 'INC-2026-000046',
      deploymentId: 'DEP-2026-000114',
      severity: Severity.SEV_4_LOW,
      status: IncidentStatus.RESOLVED,
      failureTime: getOffsetDate(8, 10, 5),
      detectedTime: getOffsetDate(8, 10, 8),
      failureReason: 'SendGrid webhook IP whitelist mismatch in QA environment',
      whatHappened: 'Outbound webhook requests were blocked by updated firewall rule in QA VPC.',
      observableSymptoms: 'Test email notifications not being delivered in QA testing sandbox.',
      affectedServices: JSON.stringify(['Notification Service']),
      usersAffected: 10,
      downtimeMinutes: 60,
      businessImpact: 'QA testing paused for 1 hour.',
      dataImpact: 'None.',
      errorMessage: 'HttpConnectionError: 403 Forbidden from SendGrid egress proxy',
      errorCode: 'NET_EGRESS_403',
      immediateActionsTaken: 'Updated security group egress rules in AWS VPC.',
      assignedEngineerId: sre.id,
      incidentCommanderId: admin.id,
    },
  });

  // Additional Corrective Actions (total 10)
  const additionalActions = [
    { id: 'CA-2026-000038', desc: 'Add composite B-Tree index (event_type, timestamp DESC) on analytics events table.', type: ActionType.CODE, prio: ActionPriority.P1_HIGH, owner: dev.id, status: ActionStatus.COMPLETED, date: 8 },
    { id: 'CA-2026-000039', desc: 'Implement automated firewall rule verification test in QA Terraform pipeline.', type: ActionType.MONITORING, prio: ActionPriority.P3_LOW, owner: sre.id, status: ActionStatus.COMPLETED, date: 9 },
    { id: 'CA-2026-000040', desc: 'Draft runbook for Kafka partition rebalance mitigation and partition count sizing.', type: ActionType.PROCESS, prio: ActionPriority.P2_MEDIUM, owner: sre.id, status: ActionStatus.IN_PROGRESS, date: 16 },
    { id: 'CA-2026-000041', desc: 'Establish Canary Deployment validation stage with 5% traffic split in ArgoCD for Payment Service.', type: ActionType.INFRASTRUCTURE, prio: ActionPriority.P0_CRITICAL, owner: sre.id, status: ActionStatus.OPEN, date: 20 },
    { id: 'CA-2026-000042', desc: 'Audit all microservices for unbounded array allocations in Redis cache consumers.', type: ActionType.PREVENTIVE, prio: ActionPriority.P1_HIGH, owner: dev.id, status: ActionStatus.OPEN, date: 22 },
  ];

  for (const a of additionalActions) {
    await prisma.correctiveAction.create({
      data: {
        id: a.id,
        postMortemId: pm1.id,
        description: a.desc,
        type: a.type,
        priority: a.prio,
        ownerId: a.owner,
        dueDate: getOffsetDate(a.date + 10),
        completionDate: a.status === ActionStatus.COMPLETED ? getOffsetDate(a.date) : null,
        status: a.status,
      },
    });
  }

  // 5. Create Realistic Immutable Audit Logs (25+ entries)
  const auditEntries = [
    { action: 'USER_LOGIN', type: 'USER', id: admin.id, desc: 'Admin Alex Vance logged in from 192.168.1.42', user: admin.id, mins: 120 },
    { action: 'DEPLOYMENT_CREATED', type: 'DEPLOYMENT', id: 'DEP-2026-000124', desc: 'Deployment DEP-2026-000124 initiated for Payment Service v2.4.1 (ArgoCD)', user: sre.id, mins: 100 },
    { action: 'DEPLOYMENT_FAILED', type: 'DEPLOYMENT', id: 'DEP-2026-000124', desc: 'Deployment DEP-2026-000124 marked FAILED due to lock timeout', user: sre.id, mins: 98 },
    { action: 'INCIDENT_CREATED', type: 'INCIDENT', id: 'INC-2026-000041', desc: 'Incident INC-2026-000041 declared SEV-1 Critical by Elena Rostova', user: sre.id, mins: 97 },
    { action: 'ROLLBACK_REQUESTED', type: 'ROLLBACK', id: 'RB-2026-000018', desc: 'Rollback RB-2026-000018 requested for Payment Service from v2.4.1 to v2.4.0', user: sre.id, mins: 96 },
    { action: 'ROLLBACK_APPROVED', type: 'ROLLBACK', id: 'RB-2026-000018', desc: 'Rollback RB-2026-000018 approved by Admin Alex Vance. Comment: "Approved emergency rollback"', user: admin.id, mins: 95 },
    { action: 'ROLLBACK_STARTED', type: 'ROLLBACK', id: 'RB-2026-000018', desc: 'Rollback execution started. Helm rollback initiated.', user: sre.id, mins: 94 },
    { action: 'ROLLBACK_STEP_COMPLETED', type: 'ROLLBACK', id: 'RB-2026-000018', desc: 'Step 1: Terminate blocking migration queries completed.', user: sre.id, mins: 93 },
    { action: 'ROLLBACK_COMPLETED', type: 'ROLLBACK', id: 'RB-2026-000018', desc: 'Production deployment rolled back from v2.4.1 to v2.4.0. Service restored.', user: sre.id, mins: 80 },
    { action: 'POSTMORTEM_CREATED', type: 'POSTMORTEM', id: 'PM-2026-000011', desc: 'Post-Mortem PM-2026-000011 created for incident INC-2026-000041', user: sre.id, mins: 60 },
    { action: 'POSTMORTEM_APPROVED', type: 'POSTMORTEM', id: 'PM-2026-000011', desc: 'Post-Mortem PM-2026-000011 status changed to APPROVED by Admin', user: admin.id, mins: 40 },
    { action: 'ACTION_CREATED', type: 'ACTION', id: 'CA-2026-000031', desc: 'Corrective action CA-2026-000031 assigned to Marcus Chen (P0_CRITICAL)', user: sre.id, mins: 35 },
    { action: 'USER_LOGIN', type: 'USER', id: dev.id, desc: 'Marcus Chen logged in from 10.0.4.15', user: dev.id, mins: 30 },
    { action: 'DEPLOYMENT_CREATED', type: 'DEPLOYMENT', id: 'DEP-2026-000125', desc: 'Deployment DEP-2026-000125 initiated for User Auth Service v3.2.0', user: dev.id, mins: 25 },
    { action: 'DEPLOYMENT_FAILED', type: 'DEPLOYMENT', id: 'DEP-2026-000125', desc: 'Deployment DEP-2026-000125 marked FAILED (CrashLoopBackOff)', user: sre.id, mins: 24 },
    { action: 'ROLLBACK_REQUESTED', type: 'ROLLBACK', id: 'RB-2026-000019', desc: 'Rollback requested for User Auth Service from v3.2.0 to v3.1.9', user: dev.id, mins: 23 },
    { action: 'ROLLBACK_APPROVED', type: 'ROLLBACK', id: 'RB-2026-000019', desc: 'Rollback approved by Elena Rostova', user: sre.id, mins: 22 },
    { action: 'ROLLBACK_COMPLETED', type: 'ROLLBACK', id: 'RB-2026-000019', desc: 'Rollback RB-2026-000019 completed. All 12 pods healthy.', user: sre.id, mins: 15 },
    { action: 'ACTION_COMPLETED', type: 'ACTION', id: 'CA-2026-000034', desc: 'Corrective action CA-2026-000034 marked COMPLETED by Marcus Chen', user: dev.id, mins: 10 },
  ];

  for (const e of auditEntries) {
    const d = new Date();
    d.setMinutes(d.getMinutes() - e.mins);
    await prisma.auditLog.create({
      data: {
        timestamp: d,
        userId: e.user,
        action: e.action,
        entityType: e.type,
        entityId: e.id,
        description: e.desc,
        ipAddress: '192.168.1.42',
        isImmutable: true,
      },
    });
  }

  // 6. In-App Notifications
  const notifications = [
    { title: 'Rollback Approval Required', message: 'Order Management rollback RB-2026-000021 requires production approval.', type: 'WARNING', user: admin.id, link: '/rollbacks/RB-2026-000021', read: false },
    { title: 'Post-Mortem Review Due', message: 'Post-Mortem PM-2026-000013 for Inventory Service is currently Under Review.', type: 'INFO', user: sre.id, link: '/postmortems/PM-2026-000013', read: false },
    { title: 'Corrective Action Overdue Alert', message: 'Action CA-2026-000031 (SQL Linter in CI) is due in 3 days.', type: 'WARNING', user: dev.id, link: '/actions', read: false },
    { title: 'Rollback Completed Successfully', message: 'Payment Service rolled back to v2.4.0. Latency normalized.', type: 'SUCCESS', user: admin.id, link: '/rollbacks/RB-2026-000018', read: true },
    { title: 'Deployment Failure Detected', message: 'DEP-2026-000127 failed health probes in Production.', type: 'CRITICAL', user: sre.id, link: '/failures/INC-2026-000044', read: false },
  ];

  for (const n of notifications) {
    await prisma.notification.create({
      data: {
        title: n.title,
        message: n.message,
        type: n.type,
        userId: n.user,
        link: n.link,
        isRead: n.read,
      },
    });
  }

  // Comments for Post-Mortem 1
  await prisma.comment.create({
    data: {
      postMortemId: pm1.id,
      authorId: dev.id,
      content: 'I have tested the squawk linter on our current repository. It caught 3 other potential lock hazards in pending PRs. PR #412 will be ready for review tomorrow.',
    },
  });

  await prisma.comment.create({
    data: {
      postMortemId: pm1.id,
      authorId: sre.id,
      content: 'Great work Marcus. We should also add this checklist to the team sprint planning template.',
    },
  });

  console.log('Database seeding complete with full enterprise datasets!');
}

main()
  .catch((e) => {
    console.error('Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
