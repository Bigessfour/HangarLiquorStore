import type { InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'flex h-12 w-full rounded-lg border border-slate-300 px-3 text-base outline-none focus:border-slate-500',
        className,
      )}
      {...props}
    />
  );
}
