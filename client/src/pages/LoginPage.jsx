import { Suspense, lazy, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Scissors, Loader2, ChevronDown } from 'lucide-react';
import FooterLinks from '@/components/FooterLinks';

// Lazy-load the heavy Spline runtime (~500KB+)
const Spline = lazy(() => import('@splinetool/react-spline'));

const SCENE_URL = 'https://prod.spline.design/Xwn3xmA7guz32i3A/scene.splinecode';

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [splineInteractive, setSplineInteractive] = useState(true);
  const [activePreview, setActivePreview] = useState(1);
  
  const scrollRef = useRef(null);
  const splineContainerRef = useRef(null);
  const overlayRef = useRef(null);

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

  // High-performance scroll-driven blur effect
  useEffect(() => {
    let ticking = false;

    const updateScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight;
      
      // Start blur at 20% scroll, fully blurred at 80%
      const progress = Math.min(Math.max((scrollY - heroHeight * 0.2) / (heroHeight * 0.6), 0), 1);
      
      // Directly manipulate DOM for 60fps smoothness
      if (splineContainerRef.current) {
        // Blur slightly into the background
        splineContainerRef.current.style.filter = `blur(${progress * 3}px)`;
        // Slightly dim the Spline container itself to help the overlay
        splineContainerRef.current.style.opacity = `${1 - progress * 0.3}`;
      }
      
      if (overlayRef.current) {
        overlayRef.current.style.opacity = `${progress * 0.65}`;
      }
      
      // Disable Spline interaction when scrolled down to prevent accidental clicks
      setSplineInteractive(scrollY < heroHeight * 0.4);
      
      ticking = false;
    };

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateScroll);
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount to set initial state
    updateScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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

      {/* ── Fixed Spline 3D Background ── */}
      <div
        ref={splineContainerRef}
        className="login-spline-bg"
        style={{ pointerEvents: splineInteractive ? 'auto' : 'none' }}
      >
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
      </div>

      {/* ── Dark overlay that increases with scroll ── */}
      <div
        ref={overlayRef}
        className="login-scroll-overlay"
        style={{ opacity: 0 }}
      />

      {/* ── Fixed Hero Elements (Brand, Hint) ── */}
      <div className="login-hero">
        <div className={`login-brand ${sceneLoaded ? 'login-brand--visible' : ''}`}>
          <div className="login-brand-logo">
            <Scissors className="h-6 w-6 sm:h-8 sm:w-8" />
          </div>
          <div className="login-brand-iframe-wrapper">
            <iframe 
              src="https://my.spline.design/helloliquidtext-Cxut4H5ycdCtFfbaZNwhM1ug-b3g/" 
              frameBorder="0" 
              width="100%" 
              height="100%"
              title="Evenly 3D Liquid Text"
            ></iframe>
          </div>
          <p className="login-brand-tagline">
            your friends owe you. we'll prove it.
          </p>
        </div>

        {signingIn && (
          <div className="login-signing-in">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Redirecting to Google...</span>
          </div>
        )}

        {sceneLoaded && !signingIn && (
          <div className="login-scroll-hint">
            <span>Scroll to explore</span>
            <ChevronDown className="h-4 w-4 animate-bounce" />
          </div>
        )}
      </div>

      {/* ── Scrollable Content Layer (Pushed down by 100vh) ── */}
      <div className="login-content-wrapper">

        {/* ═══ SHOWCASE SECTION 1: INTERACTIVE PREVIEW ═══ */}
        <section className="landing-section">
          <div className="landing-section-header">
            <span className="landing-badge">The App</span>
            <h2 className="landing-heading">See Evenly in action.</h2>
            <p className="landing-subheading">
              A clean, modern interface designed to make splitting bills as painless as possible.
            </p>
          </div>

          <div className="preview-tabs">
            {[
              { id: 1, name: 'Dashboard' },
              { id: 2, name: 'Join Group' },
              { id: 3, name: 'Transactions' },
              { id: 4, name: 'Balances' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActivePreview(tab.id)}
                className={`preview-tab ${activePreview === tab.id ? 'preview-tab--active' : ''}`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          <div className="landing-browser-mockup">
            <div className="browser-topbar">
              <div className="browser-dots">
                <span className="browser-dot" style={{ background: '#ff5f56' }} />
                <span className="browser-dot" style={{ background: '#ffbd2e' }} />
                <span className="browser-dot" style={{ background: '#27c93f' }} />
              </div>
              <div className="browser-url">evenly.app</div>
              <div className="browser-dots-spacer" />
            </div>
            
            <div className="browser-content">
              {[1, 2, 3, 4].map((id) => (
                <img
                  key={id}
                  src={`/preview-${id}.png`}
                  alt={`App Preview ${id}`}
                  className={`browser-img ${activePreview === id ? 'browser-img--active' : ''}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ═══ SHOWCASE SECTION 2: BENTO FEATURES ═══ */}
        <section className="landing-section">
          <div className="landing-section-header">
            <span className="landing-badge">Built Different</span>
            <h2 className="landing-heading">Not just another<br />expense tracker.</h2>
          </div>

          <div className="landing-bento-grid">
            {/* Balances */}
            <div className="bento-card">
              <h3 className="bento-card-title">Know your standing.</h3>
              <p className="bento-card-desc">Real-time balances. No guesswork.</p>
              <div className="bento-balance-demo">
                <div className="bento-balance-row">
                  <span className="bento-balance-label">You get back</span>
                  <span className="bento-balance-value bento-balance-value--positive">₹3,200</span>
                </div>
                <div className="bento-balance-divider" />
                <div className="bento-balance-row">
                  <span className="bento-balance-label">You owe</span>
                  <span className="bento-balance-value bento-balance-value--negative">₹800</span>
                </div>
              </div>
            </div>

            {/* Activity */}
            <div className="bento-card">
              <h3 className="bento-card-title">Receipts? We keep them.</h3>
              <p className="bento-card-desc">Every action, every change, logged.</p>
              <div className="bento-timeline-demo">
                <div className="bento-timeline-item">
                  <div className="bento-timeline-dot bento-dot--blue" />
                  <span>Rahul added "Cab" · <strong>₹1,800</strong></span>
                </div>
                <div className="bento-timeline-item">
                  <div className="bento-timeline-dot bento-dot--emerald" />
                  <span>You settled with Priya · <strong>₹2,000</strong></span>
                </div>
                <div className="bento-timeline-item">
                  <div className="bento-timeline-dot bento-dot--amber" />
                  <span>Priya added "Hotel" · <strong>₹8,000</strong></span>
                </div>
              </div>
            </div>

            {/* Split Methods */}
            <div className="bento-card">
              <h3 className="bento-card-title">Split your way.</h3>
              <p className="bento-card-desc">4 methods. Zero arguments.</p>
              <div className="bento-mini-demo">
                <div className="bento-split-pill">Equal</div>
                <div className="bento-split-pill bento-split-pill--active">Percentage</div>
                <div className="bento-split-pill">Exact</div>
                <div className="bento-split-pill">Shares</div>
              </div>
            </div>

            {/* Invite */}
            <div className="bento-card">
              <h3 className="bento-card-title">One link. Instant squad.</h3>
              <p className="bento-card-desc">Share a code, they're in.</p>
              <div className="bento-invite-demo">
                <div className="bento-invite-bar">
                  <span className="bento-invite-url">evenly.app/join/</span>
                  <span className="bento-invite-code">xK9mP2</span>
                </div>
              </div>
            </div>

            {/* Smart Debt Simplification */}
            <div className="bento-card bento-card--large">
              <h3 className="bento-card-title">Smart Debt Simplification</h3>
              <p className="bento-card-desc">We reorganize group debts behind the scenes to minimize the total number of transactions. Nobody likes paying 5 different people.</p>
              <div className="bento-balance-demo" style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.02)' }}>
                <div className="bento-balance-row" style={{ color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through' }}>
                  <span className="bento-balance-label">Before: 6 transactions</span>
                </div>
                <div className="bento-balance-divider" />
                <div className="bento-balance-row">
                  <span className="bento-balance-label" style={{ color: 'rgba(52, 211, 153, 0.9)' }}>After: Just 2 easy payments</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CTA SECTION ═══ */}
        <section className="landing-section landing-cta">
          <div className="landing-cta-card">
            <Scissors className="h-8 w-8 landing-cta-icon" />
            <h2 className="landing-cta-title">Stop texting<br />"bhai paise de."</h2>
            <p className="landing-cta-desc">
              Let the robot handle it. Scroll up and click to sign in.
            </p>
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="landing-cta-button"
            >
              Back to Top ↑
            </button>
          </div>
        </section>

        {/* ═══ FOOTER ═══ */}
        <div className="login-footer login-footer--visible">
          <FooterLinks className="login-footer-links" />
        </div>
      </div>
    </div>
  );
}
