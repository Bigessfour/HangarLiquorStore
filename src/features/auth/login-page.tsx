import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NewPasswordRequiredError, completeNewPassword, isCognitoConfigured, signIn } from '@/lib/auth';
import { isDemoAuthEnabled } from '@/lib/demo-auth';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [needsNewPassword, setNeedsNewPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const finishLogin = () => {
    window.location.href = '/';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (needsNewPassword) {
        if (newPassword.length < 8) {
          setError('New password must be at least 8 characters.');
          return;
        }
        if (newPassword !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        await completeNewPassword(newPassword);
        finishLogin();
        return;
      }

      await signIn(username, password);
      finishLogin();
    } catch (err: unknown) {
      if (err instanceof NewPasswordRequiredError) {
        setNeedsNewPassword(true);
        setError('Set a new password to finish your first login.');
      } else if (err instanceof Error) {
        setError(err.message || 'Login failed. Check your credentials.');
      } else {
        setError('Login failed. Check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-2xl">Hanger Liquor Store</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            {needsNewPassword ? 'Set your new password' : 'Employee Login'}
          </p>
          {!isCognitoConfigured() && !isDemoAuthEnabled() && (
            <p className="text-center text-xs text-amber-600">
              Cognito is not configured. Set VITE_DEMO_AUTH=true for local demos.
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!needsNewPassword && (
              <>
                <div>
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="employee1"
                  />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {needsNewPassword && (
              <>
                <div>
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              </>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? 'Signing in...'
                : needsNewPassword
                  ? 'Set password & continue'
                  : 'Sign In'}
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Contact the owner for your login credentials.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}