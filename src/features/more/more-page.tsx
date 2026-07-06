import { Link } from 'react-router-dom';
import { BarChart3, CalendarDays, ChevronRight, LayoutDashboard, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ThemeToggle } from '@/components/common/theme-toggle';

const moreLinks = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, description: 'Store overview & alerts' },
  {
    to: '/events',
    label: 'Local Events',
    icon: CalendarDays,
    description: 'July 4th, football weekends',
  },
  {
    to: '/forecast',
    label: 'Forecast Reports',
    icon: BarChart3,
    description: 'Demand charts & trends',
  },
] as const;

export function MorePage() {
  return (
    <div className="space-y-4 p-4">
      <div>
        <h2 className="text-2xl font-bold">More</h2>
        <p className="text-muted-foreground">Settings and additional tools.</p>
      </div>

      <ul className="space-y-2">
        {moreLinks.map(({ to, label, icon: Icon, description }) => (
          <li key={to}>
            <Link to={to} className="block">
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex min-h-14 items-center gap-3 p-4">
                  <Icon className="h-6 w-6 shrink-0 text-hanger-amber" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{label}</p>
                    <p className="truncate text-sm text-muted-foreground">{description}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <Card>
        <CardContent className="flex min-h-14 items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-muted-foreground" aria-hidden />
            <span className="font-medium">Theme</span>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        <p>UPC product data (when available) provided by <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="underline">Open Food Facts</a> under free open licenses.</p>
        <p className="mt-1">We comply with their terms: proper attribution, User-Agent, and 1 API call per real user scan.</p>
      </div>
    </div>
  );
}
