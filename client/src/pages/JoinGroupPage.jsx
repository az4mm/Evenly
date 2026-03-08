import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { previewGroup, joinGroup } from '@/services/groups';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, UserPlus, Users, Search, LinkIcon } from 'lucide-react';

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
    <div className="p-4 sm:p-8">
      <div className="max-w-md mx-auto space-y-8">
        {/* Back link */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to groups
        </button>

        {/* Page Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10">
              <LinkIcon className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Join a Group</h1>
          </div>
          <p className="text-muted-foreground mt-1">
            Enter the 6-character invite code shared by a group member.
          </p>
        </div>

        {/* Step 1: Enter code */}
        {!preview && (
          <form onSubmit={(e) => { e.preventDefault(); handlePreview(); }}>
            <Card>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="invite-code" className="text-sm font-medium">
                    Invite Code
                  </Label>
                  <Input
                    id="invite-code"
                    placeholder="A1B2C3"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    autoFocus
                    className="font-mono text-center text-2xl tracking-[0.3em] h-14 border-dashed border-primary/30 focus:border-primary"
                  />
                  <p className="text-xs text-muted-foreground text-center">
                    6 characters, letters and numbers
                  </p>
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || code.trim().length === 0}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                      Looking up...
                    </>
                  ) : (
                    <>
                      <Search className="h-4 w-4 mr-2" />
                      Look Up Group
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </form>
        )}

        {/* Step 2: Confirm & join */}
        {preview && (
          <div className="space-y-4">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="p-5 space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Group Found
                </p>
                <h3 className="text-lg font-semibold">{preview.name}</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">
                    {preview.currency}
                  </Badge>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="h-3.5 w-3.5" />
                    {preview.member_count} {preview.member_count === 1 ? 'member' : 'members'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleReset}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Try Another
              </Button>
              <Button
                onClick={handleJoin}
                disabled={joining}
                className="flex-1"
              >
                {joining ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent mr-2" />
                    Joining...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Join Group
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
