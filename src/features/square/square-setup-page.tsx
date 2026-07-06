import { Link } from 'react-router-dom';
import { ArrowLeft, ExternalLink, Store } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isOwner } from '@/lib/auth';
import { Navigate } from 'react-router-dom';

const SQUARE_API_DOCS = 'https://developer.squareup.com/docs/oauth-api/overview';

export function SquareSetupPage() {
  if (!isOwner()) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="space-y-4 p-4 pb-24">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="sm" className="min-h-10 px-2" asChild>
          <Link to="/">
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            Dashboard
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <Store className="h-8 w-8 text-hanger-amber" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold">Connect Square POS</h1>
          <p className="text-sm text-muted-foreground">
            Owner setup — Chris Emick (demo login: chris.emick.owner@hangar.demo)
          </p>
        </div>
      </div>

      <Card className="border-hanger-amber/30 bg-hanger-amber/5">
        <CardContent className="space-y-3 p-4 text-sm">
          <p className="font-medium text-hanger-amber">Before you start</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Log in to this app as <strong>Owner</strong> (not Manager).</li>
            <li>Use the same Square account Hangar Liquor uses on the physical registers.</li>
            <li>Use Safari or Chrome — not an in-app browser.</li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <h2 className="font-semibold">Step-by-step (about 5 minutes)</h2>
          <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
            <li>
              Return to the <Link to="/" className="text-hanger-amber underline">Dashboard</Link> or open{' '}
              <Link to="/more" className="text-hanger-amber underline">More</Link>.
            </li>
            <li>
              Tap <strong>Connect Square account</strong> on the Square POS card (Dashboard or More).
            </li>
            <li>Square opens a secure sign-in page — log in with your Hangar Liquor Square seller account.</li>
            <li>
              Review permissions. The app only requests <strong>read</strong> access: orders, payments,
              catalog items, inventory, and merchant profile.
            </li>
            <li>Tap <strong>Allow</strong> / <strong>Authorize</strong>.</li>
            <li>
              You return here automatically. Confirm the card shows <strong>Connected to Square</strong>{' '}
              with your business name.
            </li>
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4 text-sm">
          <h2 className="font-semibold">If something goes wrong</h2>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <strong>No Square card on Dashboard?</strong> Your login may not be Owner — contact Steve to
              confirm your role.
            </li>
            <li>
              <strong>Button disabled / credentials not configured?</strong> Developer setup is still in
              progress. Try again after Friday deploy confirmation.
            </li>
            <li>
              <strong>invalid_state or state_expired?</strong> Tap Connect again — links expire in about 10
              minutes.
            </li>
            <li>
              <strong>Wrong store?</strong> More → Disconnect Square, then connect with the correct Square
              login.
            </li>
          </ul>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="min-h-12 flex-1 bg-hanger-amber text-primary-foreground hover:bg-hanger-amber/90"
          asChild
        >
          <Link to="/more">Go to Square connection</Link>
        </Button>
        <Button type="button" variant="outline" className="min-h-12" asChild>
          <a href={SQUARE_API_DOCS} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden />
            Square OAuth docs
          </a>
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Managers and staff never see Square settings. Tokens stay on AWS — not on your phone.
      </p>
    </div>
  );
}