import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  DollarSign,
  LayoutDashboard,
  Settings,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { InstallAppPanel } from '@/components/common/install-app-panel';
import { SquareConnectPanel } from '@/components/common/square-connect-panel';
import {
  resetToDemoData,
  listUsers,
  createUser,
  updateUserRole,
  disableUser,
  enableUser,
  resetUserPassword,
  removeUserFromAllGroups,
} from '@/lib/api';
import { getCurrentUser, signOut, isOwner, hasRole } from '@/lib/auth';
import { useNavigate } from 'react-router-dom';
import { useGuidedTrialStore } from '@/features/guided-trial';

const moreLinks = [
  {
    to: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
    description: 'Store overview & alerts',
    minRole: 'ReadOnly' as const,
  },
  {
    to: '/profit',
    label: 'Profit & Ops',
    icon: DollarSign,
    description: 'Day / month / year · money in your pocket',
    minRole: 'Manager' as const,
  },
  {
    to: '/events',
    label: 'Local Events',
    icon: CalendarDays,
    description: 'July 4th, football weekends',
    minRole: 'ReadOnly' as const,
  },
  {
    to: '/forecast',
    label: 'Forecast Reports',
    icon: BarChart3,
    description: 'Demand charts & trends',
    minRole: 'ReadOnly' as const,
  },
] as const;

export function MorePage() {
  const user = getCurrentUser();
  const navigate = useNavigate();
  const startTrial = useGuidedTrialStore((s) => s.start);
  const trialStatus = useGuidedTrialStore((s) => s.status);

  // User management state (Owner only)
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    tempPassword: '',
    name: '',
    role: 'ReadOnly' as const,
  });
  const [userError, setUserError] = useState('');

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

  const handleLogout = () => {
    signOut();
    navigate('/login');
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between" data-tour="tour-more">
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
        {moreLinks
          .filter((link) => hasRole(link.minRole))
          .map(({ to, label, icon: Icon, description }) => (
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

      <Card className="border-hanger-gold/40 bg-hanger-amber/5" data-tour="tour-start-trial">
        <CardContent className="space-y-3 p-4">
          <p className="font-medium">Owner trial run</p>
          <p className="text-sm text-muted-foreground">
            Walk through each control — Dashboard, Scan, Inventory, Events, Forecast, and more.
            {trialStatus === 'completed' ? ' You already finished once; restart anytime.' : null}
            {trialStatus === 'skipped' ? ' You skipped earlier; restart anytime.' : null}
          </p>
          <Button
            type="button"
            className="min-h-12 w-full bg-hanger-amber text-primary-foreground hover:bg-hanger-amber/90"
            onClick={() => startTrial()}
            data-testid="start-trial-run"
          >
            Start trial run
          </Button>
        </CardContent>
      </Card>

      <Card className="border-hanger-amber/10">
        <CardContent className="flex min-h-14 items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-muted-foreground" aria-hidden />
            <span className="font-medium">Theme</span>
          </div>
          <ThemeToggle />
        </CardContent>
      </Card>

      <InstallAppPanel />

      <SquareConnectPanel />

      {hasRole('Manager') && (
        <Card className="border-hanger-gold/30">
          <CardContent className="space-y-3 p-4">
            <p className="font-medium">Staff training</p>
            <Button
              variant="outline"
              size="sm"
              className="min-h-10 w-full text-xs"
              onClick={() => {
                if (
                  confirm(
                    'Reset to realistic Hanger demo items (Bud, High Noon, Jack, etc.)? This only affects the local demo data.',
                  )
                ) {
                  resetToDemoData();
                  alert('Demo catalog reset. Refresh dashboard or scan to see updated live items.');
                }
              }}
            >
              Reset to realistic Hanger demo catalog
            </Button>
            <p className="text-[9px] text-muted-foreground">
              Useful for staff training and seeing 12pk / packSize examples.
            </p>
          </CardContent>
        </Card>
      )}

      {hasRole('Manager') && (
        <Card className="border-hanger-gold/30">
          <CardContent className="space-y-3 p-4">
            <p className="flex items-center justify-between font-medium">
              User Management
              <span className="text-[10px] font-normal text-muted-foreground">
                {isOwner() ? 'Owner (full control)' : 'Manager (ReadOnly users only)'}
              </span>
            </p>
            {!import.meta.env.VITE_API_URL && (
              <p className="text-[10px] text-muted-foreground">
                Local demo shows a sample owner only. Creating users needs Cognito on a deployed
                backend.
              </p>
            )}

            <form onSubmit={handleCreateUser} className="space-y-2 rounded border bg-muted/30 p-2">
              <div className="text-xs font-medium">Create New User</div>
              <input
                className="w-full rounded border p-1.5 text-sm"
                placeholder="Username (email or id)"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                required
              />
              <input
                className="w-full rounded border p-1.5 text-sm"
                placeholder="Display name (optional)"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
              />
              <input
                type="password"
                className="w-full rounded border p-1.5 text-sm"
                placeholder="Temporary password"
                value={newUser.tempPassword}
                onChange={(e) => setNewUser({ ...newUser, tempPassword: e.target.value })}
                required
              />
              <select
                className="w-full rounded border p-1.5 text-sm"
                value={newUser.role}
                onChange={(e) =>
                  setNewUser({ ...newUser, role: e.target.value as typeof newUser.role })
                }
                disabled={!isOwner()}
              >
                <option value="ReadOnly">Read Only (view only)</option>
                {isOwner() && <option value="Manager">Manager (scan + edit)</option>}
                {isOwner() && <option value="Owner">Owner (full)</option>}
              </select>
              {!isOwner() && (
                <div className="text-[10px] text-muted-foreground">
                  Managers can only create ReadOnly accounts.
                </div>
              )}
              <Button type="submit" size="sm" className="min-h-9 w-full text-xs">
                Create User
              </Button>
              {userError && <p className="text-xs text-destructive">{userError}</p>}
            </form>

            <div className="text-xs">
              <p className="mb-1 font-medium">Existing Users {loadingUsers && '(loading...)'}</p>
              {users.length === 0 && !loadingUsers ? (
                <p className="text-muted-foreground">No users yet.</p>
              ) : (
                <ul className="max-h-48 space-y-1 overflow-auto">
                  {users.map((u, i) => {
                    const currentRole = u.role || 'ReadOnly';
                    return (
                      <li key={i} className="rounded border bg-background p-1.5 text-xs">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{u.username}</div>
                            {u.name && <div className="text-muted-foreground">{u.name}</div>}
                            <div className="mt-0.5 text-[10px]">
                              Status: {u.enabled === false ? 'Disabled' : u.status || 'Active'}
                            </div>
                          </div>
                          <div className="space-y-1 text-right">
                            {isOwner() ? (
                              <select
                                value={currentRole}
                                onChange={(e) =>
                                  handleChangeRole(u.username, e.target.value as typeof currentRole)
                                }
                                className="rounded border p-0.5 text-[10px]"
                              >
                                <option value="ReadOnly">ReadOnly</option>
                                <option value="Manager">Manager</option>
                                <option value="Owner">Owner</option>
                              </select>
                            ) : (
                              <span className="rounded border px-1 py-0.5 text-[10px]">
                                {currentRole}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-1 flex flex-wrap gap-1">
                          {(isOwner() || hasRole('Manager')) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 px-1.5 text-[10px]"
                              onClick={async () => {
                                const res = await resetUserPassword(u.username);
                                const resetRes = res as { temporaryPassword?: string };
                                alert(
                                  `New temp password for ${u.username}: ${resetRes.temporaryPassword || 'Check console / backend'}. Tell employee to change on login.`,
                                );
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
                                className="h-6 px-1.5 text-[10px]"
                                onClick={async () => {
                                  if (u.enabled === false) {
                                    await enableUser(u.username);
                                  } else if (confirm(`Disable ${u.username}?`)) {
                                    await disableUser(u.username);
                                  }
                                  await loadUsers();
                                }}
                              >
                                {u.enabled === false ? 'Enable' : 'Disable'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 px-1.5 text-[10px] text-destructive"
                                onClick={async () => {
                                  if (
                                    confirm(`Remove all roles from ${u.username}? (keeps account)`)
                                  ) {
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
              <p className="mt-1 text-[9px] text-muted-foreground">
                Owner: full edit/disable/reset/remove. Manager: create ReadOnly + reset passwords.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AWS Budgets & Cost Monitoring (recommended per AWS best practices for low-cost deployments) */}
      <Card className="border-hanger-amber/20">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-hanger-amber" aria-hidden />
            <div>
              <p className="font-medium">AWS Cost Monitoring</p>
              <p className="text-sm text-muted-foreground">
                Budget alerts for serverless costs (Terraform managed).
              </p>
            </div>
          </div>
          <div className="text-xs bg-muted/50 p-2 rounded">
            Monthly budget: $50 USD • Forecast alerts at 80%. View in AWS Console → Budgets.
          </div>
          <p className="text-[10px] text-muted-foreground">
            Keeps deployment low-cost as per AGENTS guidelines. Use PAY_PER_REQUEST + filtered data.
          </p>
        </CardContent>
      </Card>

      {/* Onboarding Runbook (Phase 7 recommended) */}
      <Card>
        <CardContent className="p-4">
          <p className="font-medium mb-2 flex items-center gap-2">
            <Settings className="h-4 w-4" /> Staff Onboarding Runbook
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-xs text-muted-foreground">
            <li>Scan the install QR on More → Install the app (or open the HTTPS URL)</li>
            <li>
              iPhone/iPad: Safari → Share → Add to Home Screen. Android: Chrome → Install app (or
              sideload APK from PWABuilder).
            </li>
            <li>Use Reset demo catalog for training data</li>
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
            Optional high-accuracy forecasting via no-code ML in client's AWS. Export sales → train
            in Canvas → deploy Serverless endpoint → toggle in /forecast or ?model=canvas. Falls
            back to statistical engine. See client-deployment.md for full workflow.
          </p>
          <p className="text-[10px] mt-1">
            Developed by Steve McKitrick, AWS Certified AI Practitioner
          </p>
        </CardContent>
      </Card>

      <div className="mt-6 text-center text-xs text-muted-foreground">
        <p>
          UPC product data (when available) provided by{' '}
          <a
            href="https://world.openfoodfacts.org"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Open Food Facts
          </a>{' '}
          under free open licenses.
        </p>
        <p className="mt-1">
          We comply with their terms: proper attribution, User-Agent, and 1 API call per real user
          scan.
        </p>
      </div>

      {/* Premium developer credit */}
      <div className="mt-8 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-hanger-gold/30 bg-gradient-to-r from-hanger-gold/10 to-hanger-amber/10 px-4 py-1.5 text-[10px] font-medium text-hanger-gold">
          <span>Developed by</span>
          <span className="font-semibold">Steve McKitrick</span>
          <span className="text-[9px] opacity-70">• AWS Certified AI Practitioner</span>
        </div>
        <p className="mt-1 text-[9px] text-muted-foreground/60">
          Premium forecasting powered by AWS SageMaker Canvas
        </p>
      </div>
    </div>
  );
}
