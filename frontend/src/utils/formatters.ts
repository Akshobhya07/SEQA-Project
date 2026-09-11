export function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';

  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatTimeAgo(dateString?: string | null): string {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '—';

  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMin > 0) return `${diffMin}m ago`;
  return 'Just now';
}

export function formatDuration(seconds?: number | null): string {
  if (seconds === undefined || seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  if (mins < 60) {
    return remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

export function getStatusBadge(status: string) {
  switch (status) {
    case 'SUCCESSFUL':
    case 'COMPLETED':
    case 'RESOLVED':
    case 'APPROVED':
    case 'HEALTHY':
    case 'ACTIVE':
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        dot: 'bg-emerald-400',
        label: status.replace(/_/g, ' '),
      };

    case 'FAILED':
    case 'CRITICAL':
    case 'REJECTED':
    case 'SEV_1_CRITICAL':
      return {
        bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        dot: 'bg-rose-400',
        label: status.replace(/_/g, ' '),
      };

    case 'ROLLED_BACK':
      return {
        bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        dot: 'bg-purple-400',
        label: 'ROLLED BACK',
      };

    case 'IN_PROGRESS':
    case 'INVESTIGATING':
    case 'UNDER_REVIEW':
    case 'DEGRADED':
    case 'SEV_2_HIGH':
      return {
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        dot: 'bg-amber-400',
        label: status.replace(/_/g, ' '),
      };

    case 'PENDING_APPROVAL':
    case 'PENDING':
    case 'DRAFT':
    case 'SCHEDULED':
    case 'SEV_3_MEDIUM':
      return {
        bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        dot: 'bg-cyan-400',
        label: status.replace(/_/g, ' '),
      };

    case 'CANCELLED':
    case 'INACTIVE':
    case 'CLOSED':
    case 'SKIPPED':
    case 'SEV_4_LOW':
    default:
      return {
        bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
        dot: 'bg-slate-400',
        label: status.replace(/_/g, ' '),
      };
  }
}

export function getSeverityBadge(severity: string) {
  switch (severity) {
    case 'SEV_1_CRITICAL':
      return { label: 'SEV-1 Critical', bg: 'bg-red-500/20 text-red-400 border-red-500/40' };
    case 'SEV_2_HIGH':
      return { label: 'SEV-2 High', bg: 'bg-orange-500/20 text-orange-400 border-orange-500/40' };
    case 'SEV_3_MEDIUM':
      return { label: 'SEV-3 Medium', bg: 'bg-amber-500/20 text-amber-400 border-amber-500/40' };
    case 'SEV_4_LOW':
      return { label: 'SEV-4 Low', bg: 'bg-blue-500/20 text-blue-400 border-blue-500/40' };
    default:
      return { label: severity, bg: 'bg-slate-500/20 text-slate-400 border-slate-500/40' };
  }
}

export function downloadCsv(data: string, filename: string) {
  const blob = new Blob([data], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
