'use client'

import React from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '../molecules/ThemeToggle';

interface ManagementLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  backHref?: string;
}

export const ManagementLayout = ({ title, description, children, backHref = "/" }: ManagementLayoutProps) => {
  return (
    <div className="min-h-screen bg-bg-main text-text-main p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <Link 
              href={backHref} 
              className="flex items-center gap-2 text-brand-primary hover:underline transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              Back
            </Link>
            <ThemeToggle />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {description && <p className="text-text-muted mt-2">{description}</p>}
        </header>

        <main className="space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
};
