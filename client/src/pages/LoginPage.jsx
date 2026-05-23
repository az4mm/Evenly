import { Suspense, lazy, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Scissors, Loader2 } from 'lucide-react';
import FooterLinks from '@/components/FooterLinks';

// Lazy-load the heavy Spline runtime (~500KB+)
const Spline = lazy(() => import('@splinetool/react-spline'));

const SCENE_URL = 'https://prod.spline.design/Xwn3xmA7guz32i3A/scene.splinecode';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // Called when the Spline scene finishes loading
  const handleSplineLoad = useCallback((splineApp) => {
    setSceneLoaded(true);

    // Listen for clicks on the 3D "robot" object → trigger Google login
    splineApp.addEventListener('mouseDown', (e) => {
      if (e.target.name === 'robot') {
        setSigningIn(true);
        signInWithGoogle();
      }
    });

    // Show pointer cursor when hovering interactive objects
    splineApp.addEventListener('mouseHover', () => {
      document.body.style.cursor = 'pointer';
    });
  }, [signInWithGoogle]);

  // Already authenticated → redirect
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  // Auth state still loading → show branded loader
  if (loading) {
    return (
      <div className="login-scene-root">
        <div className="login-loader">
          <div className="login-loader-icon">
            <Scissors className="h-6 w-6 text-white animate-pulse" />
          </div>
          <p className="login-loader-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-scene-root">

      {/* ── Loading overlay (visible until Spline loads) ── */}
      <div className={`login-loader ${sceneLoaded ? 'login-loader--hidden' : ''}`}>
        <div className="login-loader-icon">
          <Scissors className="h-6 w-6 text-white animate-pulse" />
        </div>
        <p className="login-loader-text">Loading experience...</p>
      </div>

      {/* ── Full-screen Spline 3D Scene ── */}
      <Suspense fallback={null}>
        <Spline
          scene={SCENE_URL}
          onLoad={handleSplineLoad}
          style={{
            width: '100%',
            height: '100%',
            opacity: sceneLoaded ? 1 : 0,
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </Suspense>

      {/* ── Branding Overlay (top) ── */}
      <div className={`login-brand ${sceneLoaded ? 'login-brand--visible' : ''}`}>
        <div className="login-brand-logo">
          <Scissors className="h-5 w-5 sm:h-6 sm:w-6" />
        </div>
        <h1 className="login-brand-title">Evenly</h1>
        <p className="login-brand-tagline">
          your friends owe you. we'll prove it.
        </p>
      </div>

      {/* ── Signing-in indicator (shows after robot click) ── */}
      {signingIn && (
        <div className="login-signing-in">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Redirecting to Google...</span>
        </div>
      )}

      {/* ── Footer ── */}
      <div className={`login-footer ${sceneLoaded ? 'login-footer--visible' : ''}`}>
        <FooterLinks className="login-footer-links" />
      </div>
    </div>
  );
}

