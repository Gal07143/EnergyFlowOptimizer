import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'wouter';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  backLink?: string;
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  backLink,
  children
}: PageHeaderProps) {
  return (
    <div className="pb-5 border-b border-gray-200 dark:border-gray-800 sm:flex sm:items-center sm:justify-between">
      <div className="flex items-center">
        {backLink && (
          <Link href={backLink}>
            <Button variant="ghost" size="sm" className="mr-2">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          </Link>
        )}
        <div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 flex sm:mt-0 sm:ml-4">
        {children}
      </div>
    </div>
  );
}
