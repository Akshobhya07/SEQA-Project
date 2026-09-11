export type Role = 'ADMIN' | 'SRE' | 'DEVELOPER' | 'VIEWER';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export type Environment = 'PRODUCTION' | 'STAGING' | 'QA' | 'DEVELOPMENT';

export type DeploymentStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'SUCCESSFUL' | 'FAILED' | 'ROLLED_BACK' | 'CANCELLED';

export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';

export type Severity = 'SEV_1_CRITICAL' | 'SEV_2_HIGH' | 'SEV_3_MEDIUM' | 'SEV_4_LOW';

export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED';

export type RollbackStatus = 'NOT_STARTED' | 'PENDING_APPROVAL' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PARTIAL';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export type PostMortemStatus = 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'CLOSED';

export type RootCauseCategory =
  | 'CODE_DEFECT'
  | 'CONFIGURATION'
  | 'INFRASTRUCTURE'
  | 'DATABASE'
  | 'DEPENDENCY'
  | 'PIPELINE'
  | 'HUMAN_ERROR'
  | 'SECURITY'
  | 'EXTERNAL_SERVICE'
  | 'UNKNOWN';

export type ActionType = 'CORRECTIVE' | 'PREVENTIVE' | 'MONITORING' | 'PROCESS' | 'CODE' | 'INFRASTRUCTURE';

export type ActionPriority = 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW';

export type ActionStatus = 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: UserStatus;
  team?: { id: string; name: string } | null;
  createdAt?: string;
}

export interface Application {
  id: string;
  name: string;
  key: string;
  description?: string;
  repoUrl?: string;
  team?: { id: string; name: string } | null;
  _count?: { deployments: number };
}

export interface Team {
  id: string;
  name: string;
  description?: string;
  lead?: { id: string; name: string; email: string } | null;
  members: User[];
  applications: { id: string; name: string; key: string }[];
}

export interface Deployment {
  id: string;
  title: string;
  applicationId: string;
  application: { id: string; name: string; key: string };
  serviceName: string;
  version: string;
  environment: Environment;
  branch: string;
  commitSha: string;
  deploymentTool: string;
  changeTicketId?: string;
  releaseNotes?: string;
  deployedById: string;
  deployedBy: { id: string; name: string; email: string; role?: Role };
  status: DeploymentStatus;
  startedAt: string;
  completedAt?: string;
  durationSeconds?: number;
  healthStatus: HealthStatus;
  healthMetrics?: string; // JSON
  logs?: string;
  failure?: {
    id: string;
    severity: Severity;
    status: IncidentStatus;
    failureReason?: string;
    detectedTime?: string;
    assignedEngineer?: { id: string; name: string; email?: string };
  };
  rollback?: {
    id: string;
    status: RollbackStatus;
    restoredVersion: string;
    requestedAt?: string;
    completedAt?: string;
  };
  postMortem?: {
    id: string;
    status: PostMortemStatus;
    title?: string;
    createdAt?: string;
  };
  auditLogs?: AuditLog[];
}

export interface DeploymentFailure {
  id: string;
  deploymentId: string;
  deployment: Deployment;
  severity: Severity;
  status: IncidentStatus;
  failureTime: string;
  detectedTime: string;
  failureReason: string;
  whatHappened: string;
  observableSymptoms?: string;
  affectedServices?: string; // JSON array
  usersAffected: number;
  downtimeMinutes: number;
  businessImpact?: string;
  dataImpact?: string;
  errorMessage?: string;
  errorCode?: string;
  logsSnippet?: string;
  alertUrl?: string;
  immediateActionsTaken?: string;
  assignedEngineerId?: string;
  assignedEngineer?: User;
  incidentCommanderId?: string;
  incidentCommander?: User;
  postMortem?: PostMortem;
}

export interface RollbackStep {
  id: string;
  rollbackId: string;
  stepNumber: number;
  title: string;
  description: string;
  status: StepStatus;
  executorId?: string;
  executor?: { id: string; name: string };
  startedAt?: string;
  completedAt?: string;
  notes?: string;
}

export interface Rollback {
  id: string;
  deploymentId: string;
  deployment: Deployment;
  failedVersion: string;
  restoredVersion: string;
  environment: Environment;
  reason: string;
  status: RollbackStatus;
  requiresApproval: boolean;
  requestedById: string;
  requestedBy: { id: string; name: string; email?: string; role?: Role };
  requestedAt: string;
  approvedById?: string;
  approvedBy?: { id: string; name: string; email?: string; role?: Role };
  approvedAt?: string;
  approvalComment?: string;
  approvalStatus: ApprovalStatus;
  initiatedById?: string;
  initiatedBy?: { id: string; name: string };
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  steps: RollbackStep[];
}

export interface FiveWhysItem {
  step: number;
  question: string;
  answer: string;
}

export interface TimelineEvent {
  time: string;
  event: string;
  actor: string;
}

export interface PostMortem {
  id: string;
  incidentId?: string;
  incident?: DeploymentFailure;
  deploymentId?: string;
  deployment?: Deployment;
  title: string;
  status: PostMortemStatus;
  severity: Severity;
  authorId: string;
  author: { id: string; name: string; email?: string; role?: Role };
  executiveSummary: string;
  incidentTimeline?: string; // JSON
  impactAnalysis?: string; // JSON
  rootCauseCategory: RootCauseCategory;
  rootCauseDetail: string;
  fiveWhys?: string; // JSON
  contributingFactors?: string; // JSON
  whatWentWell?: string;
  whatWentWrong?: string;
  lessonsLearned?: string;
  correctiveActions?: CorrectiveAction[];
  comments?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface CorrectiveAction {
  id: string;
  postMortemId: string;
  postMortem?: { id: string; title: string; deployment?: { id: string; serviceName: string } };
  description: string;
  type: ActionType;
  priority: ActionPriority;
  ownerId: string;
  owner: { id: string; name: string; email?: string };
  dueDate: string;
  completionDate?: string;
  status: ActionStatus;
  verificationNotes?: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  postMortemId: string;
  authorId: string;
  author: { id: string; name: string; role: Role };
  content: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId?: string;
  user?: { id: string; name: string; email: string; role: Role };
  action: string;
  entityType: string;
  entityId: string;
  previousValue?: string;
  newValue?: string;
  description: string;
  ipAddress?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface DashboardData {
  summary: {
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    totalRollbacks: number;
    successRate: number;
    rollbackRate: number;
    mttrMinutes: number;
    openPostMortems: number;
  };
  charts: {
    deploymentTrends: { date: string; successful: number; failed: number; rollbacks: number }[];
    successRateTrends: { date: string; successRate: number }[];
    rollbackFrequency: { date: string; rollbacks: number }[];
    failuresByEnvironment: { environment: string; count: number }[];
    failuresByService: { service: string; count: number }[];
    rootCauseDistribution: { category: string; rawCategory: string; count: number }[];
  };
}
