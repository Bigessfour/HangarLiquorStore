import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'destructive';
}

export function Alert({ className, variant = 'default', ...props }: AlertProps) {
  return (
    <div
      className={cn(
        'rounded-lg border px-4 py-3',
        variant === 'destructive'
          ? 'border-red-200 bg-red-50 text-red-800'
          : 'border-slate-200 bg-slate-50 text-slate-800',
        className,
      )}
      {...props}
    />
  );
}

export function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm', className)} {...props} />;
}