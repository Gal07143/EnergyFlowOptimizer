import React from 'react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  textClassName?: string;
  iconOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function Logo({ 
  className, 
  textClassName,
  iconOnly = false,
  size = 'md' 
}: LogoProps) {
  const sizeClasses = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl'
  };

  return (
    <Link href="/">
      <div className={cn('flex items-center cursor-pointer', className)}>
        <div className="flex items-center">
          <span className={cn('font-semibold', sizeClasses[size], textClassName)}>
            <span className="text-primary">grid</span>
            <span className="font-bold text-primary bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">X</span>
          </span>
        </div>
      </div>
    </Link>
  );
}