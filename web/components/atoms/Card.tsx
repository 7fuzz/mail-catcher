import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export const Card = ({ className, title, description, children, ...props }: CardProps) => {
  return (
    <div 
      className={cn(
        "rounded-lg border border-border-subtle bg-bg-card text-text-main shadow-sm",
        className
      )} 
      {...props}
    >
      {(title || description) && (
        <div className="flex flex-col space-y-1.5 p-6 border-b border-border-subtle">
          {title && <h3 className="text-xl font-semibold leading-none tracking-tight">{title}</h3>}
          {description && <p className="text-sm text-text-muted">{description}</p>}
        </div>
      )}
      <div className={cn("p-6", (title || description) ? "" : "")}>
        {children}
      </div>
    </div>
  );
};
