import React from 'react';
import { getStatusBadge, getSeverityBadge } from '../../utils/formatters';

interface BadgeProps {
  status?: string;
  severity?: string;
  className?: string;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ status, severity, className = '', children }) => {
  if (severity) {
    const s = getSeverityBadge(severity);
    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${s.bg} ${className}`}
      >
        {children || s.label}
      </span>
    );
  }

  if (status) {
    const s = getStatusBadge(status);
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${s.bg} ${className}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {children || s.label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 ${className}`}
    >
      {children}
    </span>
  );
};
