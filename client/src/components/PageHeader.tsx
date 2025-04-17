import React, { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm sm:text-base text-muted-foreground mt-1">{subtitle}</p>
        )}
      </div>
      {children && <div className="flex-shrink-0 mt-2 sm:mt-0">{children}</div>}
    </div>
  );
}