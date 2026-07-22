import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BookOpen, ExternalLink, Link2, Link2Off, RefreshCw, Store } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isOwner } from '@/lib/auth';
import {
  disconnectSquare,
  fetchSquareStatus,
  startSquareAuthorization,
  syncSquareData,
  type SquareConnectionStatus,
} from '@/lib/square-api';
import { toast } from 'sonner';
import { DEMO_SQUARE_DISCLAIMER, isDemoSquareSimulated } from '@/lib/demo-sim';
import { isMockApi } from '@/lib/mock-api';

const SQUARE_DOCS = 'https://developer.squareup.com/docs/oauth-api/overview';

export function SquareConnectPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const mock = isMockApi();
  const squareSim = isDemoSquareSimulated();

  const {
    data: status,
    isLoading,
    error,
  } = useQuery({
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

  const handleSync = async () => {
    setBusy(true);
    try {
      const summary = await syncSquareData();
      await queryClient.invalidateQueries({ queryKey: ['square', 'status'] });
      toast.success(
        `Synced ${summary.orders.unitsSold} units · ${summary.catalog.mappedVariations} catalog items`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Square sync failed');
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

        {mock && squareSim && (
          <p className="rounded-md border border-hanger-amber/40 bg-hanger-amber/10 px-3 py-2 text-sm text-foreground">
            {DEMO_SQUARE_DISCLAIMER} Depends on: live API, Square SSM credentials, Owner Connect,
            then Sync.
          </p>
        )}
        {mock && !squareSim && (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Local demo — Square is not connected. Set{' '}
            <code className="rounded bg-muted px-1 text-xs">VITE_DEMO_SIMULATE_SQUARE=true</code> in{' '}
            <code className="rounded bg-muted px-1 text-xs">.env.demo</code> (or run{' '}
            <code className="rounded bg-muted px-1 text-xs">npm run demo</code>) to preview the
            connected view. Real OAuth needs the live backend.
          </p>
        )}

        {isLoading && <p className="text-sm text-muted-foreground">Checking Square status…</p>}

        {error && !mock && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error instanceof Error ? error.message : 'Unable to load Square status'}
          </p>
        )}

        {status && <SquareStatusBody status={status} />}

        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Steve finishes Part A (credentials in AWS) — see Setup instructions.</li>
          <li>You tap Connect and Allow with the register Square login.</li>
          <li>Tap Sync Square data when you want fresh sales into Hangar.</li>
        </ol>

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {status?.connected ? (
            <>
              <Button
                type="button"
                className="min-h-12 bg-hanger-amber text-primary-foreground hover:bg-hanger-amber/90"
                disabled={busy}
                onClick={() => void handleSync()}
              >
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                {squareSim ? 'Refresh demo sync' : 'Sync Square data'}
              </Button>
              {!status.demoSimulation && (
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
              )}
            </>
          ) : (
            <>
              <Button
                type="button"
                className="min-h-12 bg-hanger-amber text-primary-foreground hover:bg-hanger-amber/90"
                disabled={busy || (!mock && !status?.credentialsConfigured)}
                onClick={() => void handleConnect()}
              >
                <Link2 className="mr-2 h-4 w-4" aria-hidden />
                Connect Square account
              </Button>
              {mock && (
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-12"
                  disabled={busy}
                  onClick={() => void handleSync()}
                >
                  <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
                  Try demo sync
                </Button>
              )}
            </>
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

        {!status?.credentialsConfigured && !mock && (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
            Square Connect is not ready yet — Steve still needs to put Hangar&apos;s Square app ID and
            secret in AWS (Part A). Everything else (scan, inventory, Profit &amp; Ops, Ask Hangar)
            works without that. See{' '}
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
        <p className="font-medium text-green-700 dark:text-green-400">
          {status.demoSimulation ? 'Connected to Square (demo simulation)' : 'Connected to Square'}
        </p>
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
          {status.lastSyncAt && (
            <li>
              <strong>Last sync:</strong> {new Date(status.lastSyncAt).toLocaleString()}
              {status.lastSyncSummary?.orders && (
                <>
                  {' '}
                  ({status.lastSyncSummary.orders.unitsSold} units · $
                  {(
                    (status.lastSyncSummary.payments?.paymentsGrossCents || 0) / 100
                  ).toFixed(0)}
                  )                </>
              )}
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
