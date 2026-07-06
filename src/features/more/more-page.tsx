import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarDays, ChevronRight, LayoutDashboard, Settings, Smartphone, Printer, Download } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { usePwaInstall } from '@/hooks/use-pwa-install';
import { resetToDemoData, listUsers, createUser, updateUserRole, disableUser, enableUser, resetUserPassword, removeUserFromAllGroups } from '@/lib/api';
import { getCurrentUser, signOut, isOwner, hasRole } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';

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
  const user = getCurrentUser();
  const navigate = useNavigate();

  // User management state (Owner only)
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', tempPassword: '', name: '', role: 'ReadOnly' as const });
  const [userError, setUserError] = useState('');

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

  const loadUsers = async () => {
    if (!isOwner()) return;
    setLoadingUsers(true);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (e: any) {
      console.error('Failed to load users', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    try {
      let userToCreate = { ...newUser };
      if (!isOwner() && userToCreate.role !== 'ReadOnly') {
        userToCreate.role = 'ReadOnly';
      }
      await createUser(userToCreate);
      setNewUser({ username: '', tempPassword: '', name: '', role: 'ReadOnly' });
      await loadUsers();
    } catch (e: any) {
      setUserError(e.message || 'Failed to create user');
    }
  };

  const handleChangeRole = async (username: string, newRole: 'ReadOnly' | 'Manager' | 'Owner') => {
    try {
      await updateUserRole(username, newRole);
      await loadUsers();
    } catch (e: any) {
      alert('Failed to change role: ' + (e.message || e));
    }
  };

  // Load users for managers/owners
  useEffect(() => {
    if (hasRole('Manager')) {
      loadUsers();
    }
  }, []);

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

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">More</h2>
          <p className="text-muted-foreground">Settings and additional tools.</p>
        </div>
        {user && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Role: {user.role}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        )}
      </div>

      <ul className="space-y-2">
        {moreLinks.map(({ to, label, icon: Icon, description }) => (
          <li key={to}>
            <Link to={to} className="block">
              <Card className="transition-all hover:bg-muted/50 hover:shadow-sm border-hanger-amber/10">
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

      <Card className="border-hanger-amber/10">
        <CardContent className="flex min-h-14 items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-muted-foreground" aria-hidden />
            <span className="font-medium">Theme</span>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>

      {/* PWA Install Prompt + QR for staff (per Phase 7 plan) */}
      <Card className="border-hanger-gold/20">
        <CardContent className="p-4 space-y-4">
          <div className="flex items-center gap-3">
            <Smartphone className="h-6 w-6 text-hanger-amber" aria-hidden />
            <div>
              <p className="font-medium">Staff Onboarding - QR Code</p>
              <p className="text-sm text-muted-foreground">Scan to open/install the app.</p>
            </div>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-sm font-medium mb-2">Scan QR with phone camera → opens the app → tap "Install" or "Add to Home Screen" for a real app icon:</p>
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
                  {hasRole('Manager') && (
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
                  )}
                  <p className="text-[9px] text-center text-muted-foreground mt-1">
                    Useful for staff training &amp; seeing 12pk / packSize examples
                  </p>
                </div>

                {/* User Management - Manager can create ReadOnly; Owner has full flexibility */}
                {hasRole('Manager') && (
                  <Card className="border-hanger-gold/30 mt-4">
                    <CardContent className="p-4 space-y-3">
                      <p className="font-medium flex items-center justify-between">
                        User Management
                        <span className="text-[10px] font-normal text-muted-foreground">
                          {isOwner() ? 'Owner (full control)' : 'Manager (ReadOnly users only)'}
                        </span>
                      </p>

                      {/* Create User Form */}
                      <form onSubmit={handleCreateUser} className="space-y-2 border p-2 rounded bg-muted/30">
                        <div className="text-xs font-medium">Create New User</div>
                        <input
                          className="w-full border p-1.5 text-sm rounded"
                          placeholder="Username (email or id)"
                          value={newUser.username}
                          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                          required
                        />
                        <input
                          className="w-full border p-1.5 text-sm rounded"
                          placeholder="Display name (optional)"
                          value={newUser.name}
                          onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                        />
                        <input
                          type="password"
                          className="w-full border p-1.5 text-sm rounded"
                          placeholder="Temporary password"
                          value={newUser.tempPassword}
                          onChange={(e) => setNewUser({ ...newUser, tempPassword: e.target.value })}
                          required
                        />
                        <select
                          className="w-full border p-1.5 text-sm rounded"
                          value={newUser.role}
                          onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                          disabled={!isOwner()}
                        >
                          <option value="ReadOnly">Read Only (view only)</option>
                          {isOwner() && <option value="Manager">Manager (scan + edit)</option>}
                          {isOwner() && <option value="Owner">Owner (full)</option>}
                        </select>
                        {!isOwner() && <div className="text-[10px] text-muted-foreground">Managers can only create ReadOnly accounts.</div>}
                        <Button type="submit" size="sm" className="w-full min-h-9 text-xs">Create User</Button>
                        {userError && <p className="text-xs text-destructive">{userError}</p>}
                      </form>

                      {/* Users List with Actions */}
                      <div className="text-xs">
                        <p className="font-medium mb-1">Existing Users {loadingUsers && '(loading...)'}</p>
                        {users.length === 0 && !loadingUsers ? (
                          <p className="text-muted-foreground">No users yet.</p>
                        ) : (
                          <ul className="space-y-1 max-h-48 overflow-auto">
                            {users.map((u, i) => {
                              const currentRole = u.role || 'ReadOnly'; // fallback if not populated
                              return (
                                <li key={i} className="border p-1.5 rounded text-xs bg-background">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <div className="font-medium">{u.username}</div>
                                      {u.name && <div className="text-muted-foreground">{u.name}</div>}
                                      <div className="text-[10px] mt-0.5">Status: {u.enabled === false ? 'Disabled' : u.status || 'Active'}</div>
                                    </div>
                                    <div className="text-right space-y-1">
                                      {isOwner() && (
                                        <select
                                          value={currentRole}
                                          onChange={(e) => handleChangeRole(u.username, e.target.value as any)}
                                          className="border text-[10px] p-0.5 rounded"
                                        >
                                          <option value="ReadOnly">ReadOnly</option>
                                          <option value="Manager">Manager</option>
                                          <option value="Owner">Owner</option>
                                        </select>
                                      )}
                                      {!isOwner() && <span className="text-[10px] px-1 py-0.5 border rounded">{currentRole}</span>}
                                    </div>
                                  </div>

                                  {/* Action buttons - Owner full, Manager limited */}
                                  <div className="flex gap-1 mt-1 flex-wrap">
                                    {(isOwner() || hasRole('Manager')) && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-6 text-[10px] px-1.5"
                                        onClick={async () => {
                                          const res = await resetUserPassword(u.username);
                                          const resetRes = res as any;
                                          alert(`New temp password for ${u.username}: ${resetRes.temporaryPassword || 'Check console / backend'}. Tell employee to change on login.`);
                                          await loadUsers();
                                        }}
                                      >
                                        Reset PW
                                      </Button>
                                    )}
                                    {isOwner() && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-6 text-[10px] px-1.5"
                                          onClick={async () => {
                                            if (u.enabled === false) {
                                              await enableUser(u.username);
                                            } else {
                                              if (confirm(`Disable ${u.username}?`)) await disableUser(u.username);
                                            }
                                            await loadUsers();
                                          }}
                                        >
                                          {u.enabled === false ? 'Enable' : 'Disable'}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-6 text-[10px] px-1.5 text-destructive"
                                          onClick={async () => {
                                            if (confirm(`Remove all roles from ${u.username}? (keeps account)`)) {
                                              await removeUserFromAllGroups(u.username);
                                              await loadUsers();
                                            }
                                          }}
                                        >
                                          Remove Roles
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        <p className="text-[9px] text-muted-foreground mt-1">Owner: full edit/disable/reset/remove. Manager: create ReadOnly + reset passwords. Temp passwords force change on login.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* AWS Budgets & Cost Monitoring (recommended per AWS best practices for low-cost deployments) */}
      <Card className="border-hanger-amber/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-hanger-amber" aria-hidden />
            <div>
              <p className="font-medium">AWS Cost Monitoring</p>
              <p className="text-sm text-muted-foreground">Budget alerts for serverless costs (Terraform managed).</p>
            </div>
          </div>
          <div className="text-xs bg-muted/50 p-2 rounded">
            Monthly budget: $50 USD • Forecast alerts at 80%. View in AWS Console → Budgets.
          </div>
          <p className="text-[10px] text-muted-foreground">Keeps deployment low-cost as per AGENTS guidelines. Use PAY_PER_REQUEST + filtered data.</p>
        </CardContent>
      </Card>

      {/* Onboarding Runbook (Phase 7 recommended) */}
      <Card>
        <CardContent className="p-4">
          <p className="font-medium mb-2 flex items-center gap-2">
            <Settings className="h-4 w-4" /> Staff Onboarding Runbook
          </p>
          <ol className="text-xs space-y-1 text-muted-foreground list-decimal pl-4">
            <li>Scan QR (or visit the CloudFront URL) on your phone</li>
            <li>Tap Share → "Add to Home Screen" (gets a real app icon named "Hanger")</li>
            <li>Use "Reset demo catalog" for training data</li>
            <li>Scan items → add stock → view live forecasts (works offline too)</li>
            <li>For SageMaker: export CSV, train in Canvas, set endpoint in TF</li>
          </ol>
        </CardContent>
      </Card>

      {/* AWS SageMaker Info (recommended feature) */}
      <Card className="border-hanger-gold/30 bg-gradient-to-br from-hanger-gold/5 to-card">
        <CardContent className="p-4">
          <p className="font-medium mb-1 text-hanger-gold">AWS SageMaker Canvas Integration</p>
          <p className="text-xs text-muted-foreground">
            Optional high-accuracy forecasting via no-code ML in client's AWS. 
            Export sales → train in Canvas → deploy Serverless endpoint → toggle in /forecast or ?model=canvas.
            Falls back to statistical engine. See client-deployment.md for full workflow.
          </p>
          <p className="text-[10px] mt-1">Developed by Steve McKitrick, AWS Certified AI Practitioner</p>
        </CardContent>
      </Card>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        <p>UPC product data (when available) provided by <a href="https://world.openfoodfacts.org" target="_blank" rel="noopener noreferrer" className="underline">Open Food Facts</a> under free open licenses.</p>
        <p className="mt-1">We comply with their terms: proper attribution, User-Agent, and 1 API call per real user scan.</p>
      </div>

      {/* Premium developer credit */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-hanger-gold/30 bg-gradient-to-r from-hanger-gold/10 to-hanger-amber/10 px-4 py-1.5 text-[10px] font-medium text-hanger-gold">
          <span>Developed by</span>
          <span className="font-semibold">Steve McKitrick</span>
          <span className="text-[9px] opacity-70">• AWS Certified AI Practitioner</span>
        </div>
        <p className="mt-1 text-[9px] text-muted-foreground/60">Premium forecasting powered by AWS SageMaker Canvas</p>
      </div>
    </div>
  );
}
