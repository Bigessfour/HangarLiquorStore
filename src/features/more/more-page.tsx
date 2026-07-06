import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarDays, ChevronRight, LayoutDashboard, Settings, Smartphone, Printer, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { resetToDemoData } from '@/lib/api';

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
  const [appUrl, setAppUrl] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrImageLoaded, setQrImageLoaded] = useState(false);

  useEffect(() => {
    // Set app URL for QR (use origin for PWA install link)
    setAppUrl(window.location.origin);
  }, []);

  const qrCodeUrl = appUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(appUrl)}`
    : '';

  // Load QR into canvas for better print/download (canvas generation)
  useEffect(() => {
    if (!qrCodeUrl || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = 160;
      canvas.height = 160;
      ctx.drawImage(img, 0, 0, 160, 160);
      setQrImageLoaded(true);
    };
    img.src = qrCodeUrl;
  }, [qrCodeUrl]);

  const printQR = () => {
    const canvas = canvasRef.current;
    if (!canvas || !qrImageLoaded) return;

    const printWindow = window.open('', '', 'height=400,width=400');
    if (!printWindow) return;

    printWindow.document.write('<html><head><title>Install QR</title></head><body>');
    printWindow.document.write('<h3>Scan to install Hanger Liquor Store</h3>');
    printWindow.document.write(`<img src="${canvas.toDataURL()}" style="width:200px;height:200px;" />`);
    printWindow.document.write(`<p>${appUrl}</p>`);
    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const downloadQR = () => {
    const canvas = canvasRef.current;
    if (!canvas || !qrImageLoaded) return;

    const link = document.createElement('a');
    link.download = 'hanger-liquor-install-qr.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

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

      {/* PWA Install Prompt + QR for staff (per Phase 7 plan) */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-hanger-amber" aria-hidden />
            <div>
              <p className="font-medium">Staff Onboarding - QR Code</p>
              <p className="text-sm text-muted-foreground">Scan to open/install the app.</p>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-sm font-medium mb-2">Or scan QR code with phone camera:</p>
            {qrCodeUrl && (
              <div className="flex flex-col items-center">
                <canvas
                  ref={canvasRef}
                  className="border border-border rounded-lg"
                  width={160}
                  height={160}
                />
                <p className="text-[10px] text-muted-foreground mt-1 break-all text-center max-w-[160px]">
                  {appUrl}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  (Works best on mobile Chrome/Safari)
                </p>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={printQR}
                    disabled={!qrImageLoaded}
                    className="min-h-10 text-xs"
                  >
                    <Printer className="h-3 w-3 mr-1" /> Print QR
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={downloadQR}
                    disabled={!qrImageLoaded}
                    className="min-h-10 text-xs"
                  >
                    <Download className="h-3 w-3 mr-1" /> Download QR
                  </Button>
                </div>
                <p className="text-[10px] mt-1 text-muted-foreground text-center">
                  Includes live product catalog from filtered OFF dump (liquor only).
                </p>

                <div className="pt-3 mt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full min-h-10 text-xs"
                    onClick={() => {
                      if (confirm('Reset to realistic Hanger demo items (Bud, High Noon, Jack, etc.)? This only affects the local demo data.')) {
                        resetToDemoData();
                        // Simple non-blocking feedback (project style)
                        alert('Demo catalog reset. Refresh dashboard or scan to see updated live items.');
                      }
                    }}
                  >
                    Reset to realistic Hanger demo catalog
                  </Button>
                  <p className="text-[9px] text-center text-muted-foreground mt-1">
                    Useful for staff training &amp; seeing 12pk / packSize examples
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        <p>UPC product data (when available) provided by <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="underline">Open Food Facts</a> under free open licenses.</p>
        <p className="mt-1">We comply with their terms: proper attribution, User-Agent, and 1 API call per real user scan.</p>
      </div>
    </div>
  );
}
