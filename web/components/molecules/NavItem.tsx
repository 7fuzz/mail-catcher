import React from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface NavItemProps {
  href: string;
  active?: boolean;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const NavItem = ({ href, active, children, icon, className }: NavItemProps) => {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors duration-200",
        active 
          ? "bg-brand-primary/10 text-brand-primary font-medium" 
          : "text-text-muted hover:bg-bg-main hover:text-text-main",
        className
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="truncate">{children}</span>
    </Link>
  );
};
