import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { previewGroup, joinGroup } from '@/services/groups';
import { ArrowLeft, UserPlus, Users, Search, LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

export default function JoinGroupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [code, setCode] = useState(searchParams.get('code') || '');
  const [loading, setLoading] = useState(false);

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
      toast.error('Please enter an invite code');
      return;
    }

    setLoading(true);
    setPreview(null);

    try {
      const result = await previewGroup(trimmed);

      if (result.success) {
        setPreview(result.data);
      } else {
        toast.error(result.error?.message || 'Invalid invite code');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    setJoining(true);

    try {
      const result = await joinGroup(code.trim());

      if (result.success) {
        toast.success('Successfully joined the group!');
        navigate(`/groups/${result.data.id}`);
      } else {
        toast.error(result.error?.message || 'Failed to join group');
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setJoining(false);
    }
  }

  function handleReset() {
    setPreview(null);
    setCode('');
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="max-w-md mx-auto space-y-8">
        {/* Back link */}
        <Button
          onClick={() => navigate('/dashboard')}
          variant="outline"
          className="h-10 w-10 text-muted-foreground hover:text-primary p-0 border-none"
          title="Back to dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Page Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="neu-raised flex items-center justify-center w-10 h-10 rounded-xl">
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
            <Card className="p-6 space-y-5">
              <div className="space-y-4">
                <label htmlFor="invite-code" className="text-sm font-medium">
                  Invite Code
                </label>
                <Input
                  id="invite-code"
                  placeholder="A1B2C3"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  autoFocus
                  className="font-mono text-center text-2xl tracking-[0.3em] h-14"
                />
                <p className="text-xs text-muted-foreground text-center">
                  6 characters, letters and numbers
                </p>
              </div>

              {/* Error messages are now handled by sonner Toasts */}

              <Button
                type="submit"
                disabled={loading || code.trim().length === 0}
                className="w-full h-11"
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Looking up...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Look Up Group
                  </>
                )}
              </Button>
            </Card>
          </form>
        )}

        {/* Step 2: Confirm & join */}
        {preview && (
          <div className="space-y-4">
            <Card className="p-5 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Group Found
              </p>
              <h3 className="text-lg font-semibold">{preview.name}</h3>
              <div className="flex items-center gap-2">
                <span className="neu-flat text-xs font-mono px-2.5 py-1 rounded-lg text-muted-foreground">
                  {preview.currency}
                </span>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {preview.member_count} {preview.member_count === 1 ? 'member' : 'members'}
                </span>
              </div>
            </Card>

            {/* Error messages are now handled by sonner Toasts */}

            <div className="flex items-center gap-3">
              <Button
                onClick={handleReset}
                variant="outline"
                className="flex-1 h-11"
              >
                <ArrowLeft className="h-4 w-4" />
                Try Another
              </Button>
              <Button
                onClick={handleJoin}
                disabled={joining}
                className="flex-1 h-11"
              >
                {joining ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    Joining...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
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
