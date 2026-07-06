import { Link } from 'react-router-dom';
import { BookOpen, Link2, Store } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isOwner } from '@/lib/auth';
import { fetchSquareStatus, startSquareAuthorization } from '@/lib/square-api';
import { toast } from 'sonner';
import { useState } from 'react';

export function SquareDashboardCard() {
  const [busy, setBusy] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['square', 'status'],
    queryFn: fetchSquareStatus,
    enabled: isOwner(),
    retry: false,
  });

  if (!isOwner()) return null;
  if (isLoading) return null;
  if (status?.connected) return null;

  const handleConnect = async () => {
    if (!status?.credentialsConfigured) {
      toast.message('Square credentials are being configured — see setup instructions.');
      return;
    }
    setBusy(true);
    try {
      const url = await startSquareAuthorization();
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start Square authorization');
      setBusy(false);
    }
  };

  return (
    <Card className="border-hanger-amber/40 bg-gradient-to-br from-hanger-amber/10 to-card shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start gap-3">
          <Store className="mt-0.5 h-6 w-6 shrink-0 text-hanger-amber" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-hanger-amber">Connect Square POS</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Link Hangar Liquor&apos;s Square register to pull sales into forecasts. Owner only — ready
              for Chris when you&apos;re back Friday.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="min-h-12 flex-1 bg-hanger-amber text-primary-foreground hover:bg-hanger-amber/90"
            disabled={busy || !status?.credentialsConfigured}
            onClick={() => void handleConnect()}
          >
            <Link2 className="mr-2 h-4 w-4" aria-hidden />
            Connect Square account
          </Button>
          <Button type="button" variant="outline" className="min-h-12 flex-1" asChild>
            <Link to="/square-setup">
              <BookOpen className="mr-2 h-4 w-4" aria-hidden />
              Setup instructions
            </Link>
          </Button>
        </div>

        {!status?.credentialsConfigured && (
          <p className="text-xs text-muted-foreground">
            Developer is finishing AWS + Square app registration. Instructions are available now; connect
            button activates once credentials are in place.
          </p>
        )}
      </CardContent>
    </Card>
  );
}