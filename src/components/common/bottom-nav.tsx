import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  LayoutDashboard,
  Lightbulb,
  MoreHorizontal,
  Package,
  ScanLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Home', icon: LayoutDashboard, emoji: '🏠', end: true },
  { to: '/scan', label: 'Scan', icon: ScanLine, emoji: '📱', end: false },
  { to: '/inventory', label: 'Inventory', icon: Package, emoji: '📦', end: false },
  { to: '/forecast', label: 'Forecast', icon: BarChart3, emoji: '📈', end: false },
  { to: '/suggestions', label: 'Suggestions', icon: Lightbulb, emoji: '💡', end: false },
  { to: '/more', label: 'More', icon: MoreHorizontal, emoji: '⋯', end: false },
] as const;

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      aria-label="Main navigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-6 pb-[env(safe-area-inset-bottom)]">
        {navItems.map(({ to, label, icon: Icon, emoji, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-h-16 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 text-[9px] font-medium transition-colors sm:px-1 sm:text-xs',
                isActive ? 'text-hanger-amber' : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <span className="text-base leading-none sm:hidden" aria-hidden>
              {emoji}
            </span>
            <Icon className="hidden h-5 w-5 sm:block" aria-hidden />
            <span className="max-w-full truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
