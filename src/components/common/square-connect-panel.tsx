import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, ExternalLink, Link2, Link2Off, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isOwner } from '@/lib/auth';
import {
  disconnectSquare,
  fetchSquareStatus,
  startSquareAuthorization,
  type SquareConnectionStatus,
} from '@/lib/square-api';
import { toast } from 'sonner';

const SQUARE_DOCS = 'https://developer.squareup.com/docs/oauth-api/overview';

export function SquareConnectPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);

  const { data: status, isLoading, error } = useQuery({
    queryKey: ['square', 'status'],
    queryFn: fetchSquareStatus,
    enabled: isOwner(),
    retry: false,
  });

  useEffect(() => {
    const squareResult = searchParams.get('square');
    if (!squareResult) return;

    if (squareResult === 'connected') {
      toast.success('Square POS connected successfully');
      void queryClient.invalidateQueries({ queryKey: ['square', 'status'] });
    } else if (squareResult === 'error') {
      const reason = searchParams.get('reason') || 'authorization_failed';
      toast.error(`Square connection failed: ${reason.replace(/_/g, ' ')}`);
    }

    searchParams.delete('square');
    searchParams.delete('reason');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams, queryClient]);

  if (!isOwner()) return null;

  const handleConnect = async () => {
    setBusy(true);
    try {
      const url = await startSquareAuthorization();
      window.location.href = url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start Square authorization');
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Square POS? Sales sync will stop until you reconnect.')) return;
    setBusy(true);
    try {
      await disconnectSquare();
      await queryClient.invalidateQueries({ queryKey: ['square', 'status'] });
      toast.success('Square disconnected');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Disconnect failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-hanger-amber/30">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-3">
          <Store className="h-6 w-6 text-hanger-amber" aria-hidden />
          <div>
            <p className="font-medium">Square POS connection</p>
            <p className="text-sm text-muted-foreground">
              Owner only — link Hangar Liquor&apos;s Square account for sales data and forecasting.
            </p>
          </div>
        </div>

        {isLoading && <p className="text-sm text-muted-foreground">Checking Square status…</p>}

        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Unable to load Square status'}
          </p>
        )}

        {status && <SquareStatusBody status={status} />}

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {status?.connected ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-12"
              disabled={busy}
              onClick={() => void handleDisconnect()}
            >
              <Link2Off className="mr-2 h-4 w-4" aria-hidden />
              Disconnect Square
            </Button>
          ) : (
            <Button
              type="button"
              className="min-h-12 bg-hanger-amber text-primary-foreground hover:bg-hanger-amber/90"
              disabled={busy || !status?.credentialsConfigured}
              onClick={() => void handleConnect()}
            >
              <Link2 className="mr-2 h-4 w-4" aria-hidden />
              Connect Square account
            </Button>
          )}
          <Button type="button" variant="outline" className="min-h-12" asChild>
            <Link to="/square-setup">
              <BookOpen className="mr-2 h-4 w-4" aria-hidden />
              Setup instructions
            </Link>
          </Button>
          <Button type="button" variant="outline" className="min-h-12" asChild>
            <a href={SQUARE_DOCS} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
              Square API docs
            </a>
          </Button>
        </div>

        {!status?.credentialsConfigured && (
          <p className="text-xs text-muted-foreground">
            Optional for local demo. After terraform deploy, store Square Application ID and Secret in AWS,
            then Chris can connect — see{' '}
            <Link to="/square-setup" className="text-hanger-amber underline">
              Setup instructions
            </Link>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SquareStatusBody({ status }: { status: SquareConnectionStatus }) {
  if (status.connected) {
    return (
      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm">
        <p className="font-medium text-green-700 dark:text-green-400">Connected to Square</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>
            <strong>Business:</strong> {status.merchantName || status.merchantId}
          </li>
          {status.locationName && (
            <li>
              <strong>Location:</strong> {status.locationName}
            </li>
          )}
          {status.connectedAt && (
            <li>
              <strong>Connected:</strong> {new Date(status.connectedAt).toLocaleString()}
            </li>
          )}
        </ul>
        <p className="mt-2 text-xs">
          Read-only access: {status.scopes.join(', ').replace(/_/g, ' ').toLowerCase()}
        </p>
      </div>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Not connected. Chris (Owner) can authorize Hangar Liquor&apos;s Square seller account in one
      step — Managers and staff will not see this panel.
    </p>
  );
}
