import { useState, useEffect, useCallback } from 'react';
import { X, Cookie, Settings, Shield } from 'lucide-react';

type ConsentPrefs = {
  essential: boolean;
  preferences: boolean;
};

function loadConsent(): ConsentPrefs | null {
  try {
    const raw = localStorage.getItem('cookie_consent');
    if (!raw) return null;
    return JSON.parse(raw) as ConsentPrefs;
  } catch {
    return null;
  }
}

function saveConsent(prefs: ConsentPrefs) {
  localStorage.setItem('cookie_consent', JSON.stringify(prefs));
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [prefs, setPrefs] = useState<ConsentPrefs>({
    essential: true,
    preferences: true,
  });

  // Check on mount
  useEffect(() => {
    const existing = loadConsent();
    if (!existing) {
      // Small delay for the entrance animation
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const handleAcceptAll = useCallback(() => {
    const all: ConsentPrefs = { essential: true, preferences: true };
    saveConsent(all);
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 300);
  }, []);

  const handleSaveSettings = useCallback(() => {
    saveConsent(prefs);
    setShowModal(false);
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      setExiting(false);
    }, 300);
  }, [prefs]);

  if (!visible) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-[60] pointer-events-none`}
        style={{ WebkitBackdropFilter: 'none' }}
      >
        {/* Banner */}
        <div
          className={`absolute bottom-24 left-3 right-3 md:left-1/2 md:right-auto md:-translate-x-1/2 md:max-w-lg pointer-events-auto transition-all duration-500 ${
            exiting
              ? 'translate-y-24 opacity-0'
              : 'translate-y-0 opacity-100 animate-slide-up'
          }`}
        >
          <div className="glass-strong rounded-2xl p-4 md:p-5 border border-border-strong shadow-2xl shadow-black/40">
            {/* Header */}
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 rounded-xl bg-brand-primary/10 shrink-0">
                <Cookie size={18} className="text-brand-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-text-primary mb-1">Cookie Preferences</h4>
                <p className="text-xs text-text-secondary leading-relaxed">
                  We use essential cookies to keep you signed in and remember your preferences. By continuing, you agree to our{' '}
                  <a
                    href="/legal/cookies"
                    target="_blank"
                    className="text-brand-primary underline underline-offset-2 hover:text-brand-secondary transition-colors"
                    rel="noreferrer"
                  >
                    Cookie Policy
                  </a>
                  .
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(true)}
                className="flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-text-secondary glass hover:bg-white/10 transition-all"
              >
                Cookie Settings
              </button>
              <button
                onClick={handleAcceptAll}
                className="flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-white bg-brand-primary hover:brightness-110 transition-all"
              >
                Accept All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center p-0 md:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />

          {/* Modal */}
          <div className="relative w-full md:max-w-md glass-strong rounded-t-2xl md:rounded-2xl border border-border-strong shadow-2xl animate-slide-up overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
              <div className="flex items-center gap-2.5">
                <Settings size={18} className="text-brand-primary" />
                <h4 className="text-sm font-bold text-text-primary">Cookie Settings</h4>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={16} className="text-text-muted" />
              </button>
            </div>

            {/* Content */}
            <div className="px-5 py-4 space-y-4 max-h-[50vh] md:max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-text-secondary leading-relaxed">
                We use cookies to provide core functionality and remember your preferences. You can control which cookies are enabled below.
              </p>

              {/* Essential - always on */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-border-subtle">
                <Shield size={18} className="text-success shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-xs font-semibold text-text-primary">Essential</h5>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                      Always Active
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Required for the platform to function. Includes authentication session and security tokens. These cannot be disabled.
                  </p>
                </div>
              </div>

              {/* Preferences toggle */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-border-subtle">
                <Settings size={18} className="text-warning shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-xs font-semibold text-text-primary">Preferences</h5>
                    <button
                      onClick={() => setPrefs((p) => ({ ...p, preferences: !p.preferences }))}
                      className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${
                        prefs.preferences ? 'bg-brand-primary' : 'bg-white/15'
                      }`}
                      role="switch"
                      aria-checked={prefs.preferences}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                          prefs.preferences ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Remembers your theme (light/dark mode), language, and cookie consent choices. These are optional but improve your experience.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-border-subtle flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-text-secondary glass hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className="flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold text-white bg-brand-primary hover:brightness-110 transition-all"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
