import React from 'react';
import { cn } from '@/lib/utils';

export const Table = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className="w-full overflow-x-auto border border-border-subtle rounded-lg bg-bg-card">
    <table className={cn("w-full text-left border-collapse", className)}>
      {children}
    </table>
  </div>
);

export const THead = ({ children }: { children: React.ReactNode }) => (
  <thead className="bg-bg-sidebar border-b border-border-subtle">
    {children}
  </thead>
);

export const TBody = ({ children }: { children: React.ReactNode }) => (
  <tbody className="divide-y divide-border-subtle">
    {children}
  </tbody>
);

export const TH = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <th className={cn("px-6 py-4 text-xs font-semibold text-text-muted uppercase tracking-wider", className)}>
    {children}
  </th>
);

export const TR = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <tr className={cn("group transition-colors hover:bg-bg-main/50", className)}>
    {children}
  </tr>
);

export const TD = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <td className={cn("px-6 py-4 text-sm text-text-main", className)}>
    {children}
  </td>
);
