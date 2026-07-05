import { ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ScanPage() {
  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanLine className="h-6 w-6 text-hanger-amber" />
            Bottle Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Tap the big <strong>Scan Bottle</strong> button below to scan beer, spirits, or whiskey
            UPC codes.
          </p>
          <p className="text-sm text-muted-foreground">
            Examples: Coors Light, Jack Daniel&apos;s, Tito&apos;s Handmade Vodka
          </p>
          <Button size="lg" className="w-full bg-gradient-to-r from-hanger-gold to-hanger-amber">
            <ScanLine className="mr-2 h-5 w-5" />
            Open Scanner
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}