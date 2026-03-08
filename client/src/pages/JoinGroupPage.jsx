import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { previewGroup, joinGroup } from '@/services/groups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, UserPlus, Users, Search } from 'lucide-react';

export default function JoinGroupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Preview state (step 2)
  const [preview, setPreview] = useState(null);
  const [joining, setJoining] = useState(false);

  // Auto-preview if code came from URL query param
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode && urlCode.trim().length === 6) {
      handlePreview(urlCode.trim().toUpperCase());
    }
  }, []);

  async function handlePreview(previewCode) {
    const trimmed = (previewCode || code).trim();
    if (!trimmed) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);
    setError('');
    setPreview(null);

    try {
      const result = await previewGroup(trimmed);

      if (result.success) {
        setPreview(result.data);
      } else {
        setError(result.error?.message || 'Invalid invite code');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setJoining(true);
    setError('');

    try {
      const result = await joinGroup(code.trim());

      if (result.success) {
        navigate(`/groups/${result.data.id}`);
      } else {
        setError(result.error?.message || 'Failed to join group');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setJoining(false);
    }
  }

  function handleReset() {
    setPreview(null);
    setError('');
    setCode('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Join a Group
          </CardTitle>
          <CardDescription>
            Enter the 6-character invite code shared by a group member.
          </CardDescription>
        </CardHeader>

        {/* Step 1: Enter code */}
        {!preview && (
          <form onSubmit={(e) => { e.preventDefault(); handlePreview(); }}>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="invite-code">Invite Code</Label>
                <Input
                  id="invite-code"
                  placeholder="e.g. A1B2C3"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoFocus
                  className="font-mono text-center text-lg tracking-widest"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive mt-3">{error}</p>
              )}
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button type="submit" disabled={loading || code.trim().length === 0}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Looking up...' : 'Look Up'}
              </Button>
            </CardFooter>
          </form>
        )}

        {/* Step 2: Confirm & join */}
        {preview && (
          <>
            <CardContent>
              <div className="rounded-lg border p-4 space-y-2">
                <p className="text-base font-medium">{preview.name}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{preview.currency}</Badge>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {preview.member_count} {preview.member_count === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </div>

              {error && (
                <p className="text-sm text-destructive mt-3">{error}</p>
              )}
            </CardContent>

            <CardFooter className="flex justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleJoin} disabled={joining}>
                <UserPlus className="h-4 w-4 mr-2" />
                {joining ? 'Joining...' : 'Join Group'}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
