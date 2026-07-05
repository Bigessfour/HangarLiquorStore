import { NavLink } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  Package,
  ScanLine,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/scan', label: 'Scan', icon: ScanLine, end: false },
  { to: '/inventory', label: 'Inventory', icon: Package, end: false },
  { to: '/events', label: 'Events', icon: CalendarDays, end: false },
  { to: '/reports', label: 'Reports', icon: BarChart3, end: false },
] as const;

export function BottomNav() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80"
      aria-label="Main navigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 pb-[env(safe-area-inset-bottom)]">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex min-h-16 flex-col items-center justify-center gap-1 px-1 text-xs font-medium transition-colors',
                isActive ? 'text-hanger-amber' : 'text-muted-foreground hover:text-foreground',
              )
            }
          >
            <Icon className="h-6 w-6" aria-hidden />
            <span>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}