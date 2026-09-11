# Software Deployment Rollback Audit Manager

A centralized tracking, incident investigation, rollback execution, and audit portal for software deployments built for modern engineering and Site Reliability Engineering (SRE) teams.

Designed with an enterprise DevOps interface similar to Datadog, Jira, and Linear.

---

## 🌟 Key Capabilities

1. **Deployment Lifecycle Management**:
   - Record and monitor deployments across Production, Staging, QA, and Development environments.
   - Auto-generated sequential identifiers (`DEP-2026-000124`).
   - Detailed metadata tracking: Git commit SHA, branch, deployment runner (ArgoCD, GitHub Actions, Spinnaker, GitLab CI), change ticket ID, and release notes.
   - Live stdout/stderr log viewer.

2. **Deployment Health Indicators**:
   - Visual subsystem health check cards monitoring API clusters, Database shards, Worker queues, and Telemetry (p99 latency, error rates).
   - Health statuses: `HEALTHY`, `DEGRADED`, `CRITICAL`.

3. **Failed Deployment & Incident Investigation**:
   - Dedicated incident queue sorted by severity: `SEV-1 Critical`, `SEV-2 High`, `SEV-3 Medium`, `SEV-4 Low`.
   - Comprehensive incident investigation records (`INC-2026-000041`): failure reason, "What happened?", observable symptoms, blast radius, affected services, downtime duration, user impact, and immediate mitigation actions taken.

4. **Rollback Execution & Approval Workflow**:
   - Dedicated rollbacks tracking module (`RB-2026-000018`).
   - Production approval workflow: Require operator approval with review comments before rollback execution proceeds.
   - Ordered checklist timeline with granular execution steps:
     1. Stop affected service / redirect traffic
     2. Validate previous container image digest
     3. Restore previous release revision
     4. Verify database schema compatibility
     5. Restart service pods gracefully
     6. Run automated synthetic smoke tests
     7. Verify application telemetry and latency
     8. Confirm service recovery and update status
   - Dynamic step controls: toggle statuses (`Pending`, `In Progress`, `Completed`, `Failed`, `Skipped`), record execution notes, and add custom steps.

5. **Root-Cause Analysis (RCA) & Post-Mortems**:
   - Structured post-mortem documents (`PM-2026-000011`) linked to deployments and incidents.
   - Interactive **Five Whys (5-Whys)** visual flowchart chain editor.
   - Review states: `Draft`, `Under Review`, `Approved`, `Closed`.
   - Chronological incident timeline, impact analysis, structured root cause categorization (`Database`, `Configuration`, `Code Defect`, `Infrastructure`, `Dependency`, `CI/CD Pipeline`, `Human Error`, `Security`).
   - Retrospective triad: *What Went Well*, *What Went Wrong*, *Lessons Learned*.
   - Collaborative SRE review comment stream.

6. **Corrective & Preventive Action Items (CAPA)**:
   - Action register (`CA-2026-000031`) tracking remediation items with priority (`P0 Critical`, `P1 High`, `P2 Medium`, `P3 Low`), types (`Corrective`, `Preventive`, `Code`, `Infrastructure`, `Process`, `Monitoring`), owners, due dates, status, and verification notes.
   - Summary dashboard tracking open, in-progress, and critical blocker action items.

7. **Immutable Audit Trail & Compliance Logging**:
   - Append-only immutable audit trail capturing every state change (logins, deployment creation, failures, rollback requests, approvals, step completions, post-mortem status changes, and action resolutions).
   - Side-by-side JSON diff inspection viewer (previous vs. updated state).
   - Tamper-proof compliance CSV export.

8. **Reliability Dashboards & KPI Analytics**:
   - Key metrics: Total Deployments, Success Rate (%), Rollback Rate (%), Mean Time to Recovery (MTTR in minutes), Open Post-Mortems.
   - Recharts visual graphs:
     - Deployment Activity Trend over time (Successful vs. Failed vs. Rollbacks)
     - Success Rate Trajectory (%)
     - Rollback Frequency
     - Failures by Environment (Production, Staging, QA, Development)
     - Failures by Microservice
     - Root Cause Distribution

9. **Global Categorized Search & Notifications**:
   - Unified search modal (<kbd>Ctrl</kbd> + <kbd>K</kbd>) querying across Deployments, Incidents, Rollbacks, Post-Mortems, and Applications.
   - In-app notification bell with live unread counter for approval requests, incidents, and post-mortems due.

10. **Role-Based Access Control (RBAC)**:
    - **Admin**: Full system management, user status activation/deactivation, production rollback approvals, post-mortem approvals.
    - **DevOps / SRE**: Create deployments, report incidents, initiate rollbacks, execute steps, author post-mortems, create corrective actions.
    - **Developer**: View deployments, add technical investigation notes, update root-cause information, comment on post-mortems, update assigned actions.
    - **Viewer**: Read-only access to all dashboards, deployments, rollbacks, post-mortems, and audit logs.

---

## 💻 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Recharts, Lucide React icons, React Router v6.
- **Backend**: Node.js, Express.js, TypeScript, REST API architecture.
- **Database & ORM**: PostgreSQL 18.0, Prisma ORM v5.22.0.
- **Authentication**: JWT authentication with bcrypt password hashing and RBAC middleware.

---

## 🔑 Demo Login Credentials

For quick evaluation, use the 1-click role buttons on the login screen or enter:

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `Admin@123` | Full control, user administration, rollback approvals |
| **DevOps / SRE** | `sre@example.com` | `Sre@123` | Deployments, rollbacks, checklist execution, post-mortems |
| **Developer** | `developer@example.com` | `Developer@123` | Technical investigation, 5-Whys, assigned actions, comments |
| **Viewer** | `viewer@example.com` | `Viewer@123` | Read-only compliance and audit access |

---

## 🚀 Quick Start Instructions

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL 18 (Local binaries or running service)

### 2. Install Dependencies
```bash
# In backend
cd backend
npm install

# In frontend
cd ../frontend
npm install
```

### 3. Database Initialization & Seeding
The backend includes a managed PostgreSQL runner that starts a local cluster on port 5433 (or you can point `DATABASE_URL` in `backend/.env` to your custom PostgreSQL instance):

```bash
cd backend

# Initialize cluster and create database
npm run db:setup

# Push schema and seed realistic enterprise datasets
npx prisma db push
npm run prisma:seed
```

### 4. Running Locally
Run the entire stack with a single command from the project root:
```bash
npm run dev
```

This launches:
- **Frontend Portal**: [http://localhost:5173](http://localhost:5173)
- **Backend REST API**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/health](http://localhost:5000/health)

---

## 📁 Project Directory Structure

```
seqa/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma         # 12 Prisma models with PostgreSQL enums & indexes
│   │   └── seed.ts               # Realistic dataset (24 deployments, 6 incidents, 4 rollbacks, etc.)
│   ├── scripts/
│   │   └── pg-manager.js         # Managed PostgreSQL runner
│   ├── src/
│   │   ├── config/               # Prisma client & database connection
│   │   ├── controllers/          # 11 REST controllers
│   │   ├── middleware/           # Auth, RBAC, error handlers
│   │   ├── routes/               # API endpoint routers
│   │   ├── services/             # AuditService (immutable logging)
│   │   └── server.ts             # Express server entrypoint
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── api/                  # Fetch client with JWT authorization
│   │   ├── components/
│   │   │   ├── common/           # StatCard, Badge, Modal, HealthIndicator, Button, Skeletons
│   │   │   ├── layout/           # Sidebar, TopNavbar, SearchModal, MainLayout
│   │   │   ├── timeline/         # DeploymentTimeline, RollbackStepList
│   │   │   └── postmortem/       # FiveWhysEditor
│   │   ├── context/              # AuthContext, NotificationContext
│   │   ├── pages/                # 14 complete application pages
│   │   ├── types/                # TypeScript interfaces and DTOs
│   │   ├── utils/                # Formatters, CSV exporter, MTTR helpers
│   │   ├── App.tsx               # Protected routes & role authorization
│   │   ├── index.css             # Tailwind dark DevOps theme styling
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── scripts/
│   └── dev.js                    # Concurrent full-stack development orchestrator
├── package.json
├── .env.example
└── README.md
```

---

## 🛡️ API Endpoints Reference

### Authentication & Profile
- `POST /api/auth/login`: Authenticate and receive JWT
- `GET  /api/auth/me`: Get current user session and role

### Dashboard
- `GET  /api/dashboard`: Aggregated reliability metrics, MTTR, and Recharts graph datasets

### Deployments
- `GET    /api/deployments`: Search, filter, and paginate deployments
- `GET    /api/deployments/:id`: Full deployment overview, timeline, logs, and health metrics
- `POST   /api/deployments`: Record new deployment (`DEP-YYYY-XXXXXX`)
- `PUT    /api/deployments/:id`: Update status, health, and logs
- `DELETE /api/deployments/:id`: Delete deployment (Admin only)

### Failures & Incidents
- `GET  /api/failures`: List failed deployments and severities (`INC-YYYY-XXXXXX`)
- `GET  /api/failures/:id`: Get complete incident investigation record
- `POST /api/failures`: Declare incident and link to deployment
- `PUT  /api/failures/:id`: Update symptoms, impact, and immediate actions

### Rollbacks & Execution Steps
- `GET  /api/rollbacks`: List rollback records (`RB-YYYY-XXXXXX`)
- `GET  /api/rollbacks/:id`: Complete rollback execution record with checklist steps
- `POST /api/rollbacks`: Initiate rollback and populate default SRE steps
- `PUT  /api/rollbacks/:id/approval`: Approve or reject rollback (Admin / SRE)
- `PUT  /api/rollbacks/:id/status`: Update rollback status (In Progress, Completed, Failed)
- `PUT  /api/rollbacks/steps/:stepId`: Update step status, executor, and notes
- `POST /api/rollbacks/:id/steps`: Add new rollback execution step

### Root Cause Analysis & Post-Mortems
- `GET  /api/postmortems`: List post-mortems (`PM-YYYY-XXXXXX`)
- `GET  /api/postmortems/:id`: Full retrospective, 5-Whys, impact, and comments
- `POST /api/postmortems`: Create post-mortem
- `PUT  /api/postmortems/:id`: Update 5-Whys, status, and lessons learned
- `POST /api/postmortems/:id/comments`: Add engineering review comment

### Corrective Actions (CAPA)
- `GET  /api/actions`: List corrective/preventive actions (`CA-YYYY-XXXXXX`)
- `POST /api/actions`: Create action item with priority and due date
- `PUT  /api/actions/:id`: Update status and verification evidence

### Audit Logs & Reports
- `GET /api/audit-logs`: Search immutable audit event records
- `GET /api/reports/metrics`: Reliability metrics for specified date range
- `GET /api/reports/export`: CSV export for deployments, rollbacks, or audit logs
- `GET /api/search`: Multi-entity categorized search
- `GET /api/notifications`: In-app notification alerts
- `GET /api/teams`: Squad rosters and service mappings
- `GET /api/users`: User access list
