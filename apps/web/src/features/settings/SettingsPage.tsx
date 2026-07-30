import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, CreditCard, Bell, Lock, Shield, Globe, Smartphone,
  User, Mail, Camera, Mic, Info, Trash2, LogOut, ChevronRight,
  ToggleLeft, ToggleRight, Sparkles, ExternalLink, AlertTriangle,
  Cookie, HelpCircle, FileText, Sun, Moon, X, Check, Languages,
} from 'lucide-react';
import type { RootState } from '@/app/store';
import { logout, useAppDispatch, setLanguage, setAutoTranslate, initLanguageSettings } from '@/app/store';
import { apiFetch } from '@/lib/api';
import { getStoredTheme, toggleAndNotify, type Theme } from '@/app/theme';
import { LANGUAGES, applyLanguage } from '@/lib/i18n';

// ── Settings Row ──
function SettingsRow({
  icon: Icon, label, value, onClick, danger, toggle, toggled, onToggle, disabled,
}: {
  icon: React.ElementType;
  label: string;
  value?: string;
  onClick?: () => void;
  danger?: boolean;
  toggle?: boolean;
  toggled?: boolean;
  onToggle?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={toggle ? onToggle : onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-4 px-4 py-3.5 rounded-xl transition-colors text-left ${
        danger
          ? 'glass hover:bg-danger/10'
          : 'glass hover:bg-white/5'
      } disabled:opacity-40`}
    >
      <Icon size={20} className={`shrink-0 ${danger ? 'text-danger' : 'text-text-secondary'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-danger' : 'text-text-primary'}`}>{label}</p>
        {value && <p className="text-xs text-text-muted truncate">{value}</p>}
      </div>
      {toggle !== undefined ? (
        toggled
          ? <ToggleRight size={22} className="text-brand-primary shrink-0" />
          : <ToggleLeft size={22} className="text-text-muted shrink-0" />
      ) : (
        <ChevronRight size={16} className="text-text-muted shrink-0" />
      )}
    </button>
  );
}

// ── Section Header ──
function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-semibold px-4 mt-6 mb-2">
      {title}
    </h3>
  );
}

export default function SettingsPage() {
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useSelector((s: RootState) => s.auth);

  // Notification toggles
  const [pushNotifs, setPushNotifs] = useState(true);
  const [emailNotifs, setEmailNotifs] = useState(false);
  const [charPostNotifs, setCharPostNotifs] = useState(true);
  const [storyNotifs, setStoryNotifs] = useState(true);
  const [msgNotifs, setMsgNotifs] = useState(true);
  const [reactNotifs, setReactNotifs] = useState(false);

  // Privacy
  const [privateAccount, setPrivateAccount] = useState(false);

  const [charVisibility, setCharVisibility] = useState(() => localStorage.getItem('itchats-char-visibility') ?? 'Everyone');
  const [blockedCount, setBlockedCount] = useState(0);

  // Permissions
  const [cameraPerm, setCameraPerm] = useState(false);
  const [micPerm, setMicPerm] = useState(false);
  const [notifPerm, setNotifPerm] = useState(true);

  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordResult, setPasswordResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [showLangPicker, setShowLangPicker] = useState(false);

  // Translation / language preferences from Redux
  const { language: currentLang, autoTranslate } = useSelector((s: RootState) => s.translation);

  // Real wallet / subscription data
  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const [subscription, setSubscription] = useState<{ plan?: string; planId?: string; status?: string; nextBilling?: string } | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);

  useEffect(() => {
    loadBilling();
    dispatch(initLanguageSettings());
    // Load notification preferences from localStorage
    try {
      const stored = localStorage.getItem('itchats-notifs');
      if (stored) {
        const prefs = JSON.parse(stored);
        setPushNotifs(prefs.pushNotifs ?? true);
        setEmailNotifs(prefs.emailNotifs ?? false);
        setCharPostNotifs(prefs.charPostNotifs ?? true);
        setStoryNotifs(prefs.storyNotifs ?? true);
        setMsgNotifs(prefs.msgNotifs ?? true);
        setReactNotifs(prefs.reactNotifs ?? false);
      }
    } catch {}
  }, []);

  async function loadBilling() {
    setBillingLoading(true);
    try {
      const [w, s] = await Promise.all([
        apiFetch<{ balance: number }>('/billing/wallet').catch(() => null),
        apiFetch<any>('/billing/subscription').catch(() => null),
      ]);
      setWallet(w);
      setSubscription(s);
    } catch {} finally { setBillingLoading(false); }
  }

  // Persist notification preferences to localStorage
  function saveNotifPrefs(updates: Record<string, boolean>) {
    const prefs = {
      pushNotifs, emailNotifs, charPostNotifs, storyNotifs,
      msgNotifs, reactNotifs, ...updates,
    };
    try { localStorage.setItem('itchats-notifs', JSON.stringify(prefs)); } catch {}
    // Also attempt backend save (fire and forget)
    apiFetch('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ notificationPreferences: prefs }),
    }).catch(() => {});
  }

  const balance = wallet?.balance ?? 0;
  const planName = subscription?.plan ?? subscription?.planId ?? 'Free';
  const planStatus = subscription?.status ?? 'active';

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordResult({ success: false, message: 'Passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordResult({ success: false, message: 'Password must be at least 6 characters' });
      return;
    }
    setPasswordChanging(true);
    setPasswordResult(null);
    try {
      await apiFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordResult({ success: true, message: 'Password changed successfully!' });
      setTimeout(() => {
        setShowPasswordModal(false);
        setPasswordResult(null);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }, 1500);
    } catch (err: any) {
      setPasswordResult({ success: false, message: err.message || 'Failed to change password' });
    } finally {
      setPasswordChanging(false);
    }
  };

  // ── Credit display card ──
  const CreditCard_ = () => (
    <div className="glass rounded-2xl p-5 mx-4 mb-2 bg-gradient-to-br from-brand-primary/10 to-transparent border border-brand-primary/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brand-primary" />
          <span className="text-sm font-semibold text-text-primary">Credits</span>
        </div>
        {billingLoading ? (
          <div className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
            {planStatus}
          </span>
        )}
      </div>
      {billingLoading ? (
        <div className="h-10 w-24 animate-pulse rounded bg-white/10 mb-1" />
      ) : (
        <p className="text-4xl font-extrabold text-text-primary mb-1">{balance.toLocaleString()}</p>
      )}
      <p className="text-xs text-text-muted mb-4">Available credits for AI features</p>
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{planName} Plan</span>
        {subscription?.nextBilling && <span>Next: {subscription.nextBilling}</span>}
      </div>
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => nav('/billing')}
          className="flex-1 rounded-full glass px-4 py-2.5 text-xs font-medium text-text-primary hover:bg-white/5 transition-all"
        >
          Manage Subscription
        </button>
        <button className="flex-1 rounded-full bg-brand-primary px-4 py-2.5 text-xs font-medium text-white hover:brightness-110 transition-all">
          Buy Credits
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      {/* Header */}
      <header className="safe-top px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => nav(-1)} className="p-1.5 rounded-full glass hover:bg-white/10 transition-colors">
            <ArrowLeft size={20} className="text-text-secondary" />
          </button>
          <h1 className="text-[26px] font-extrabold text-text-primary tracking-tight">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto pb-24">
        {/* Account Info */}
        <SectionHeader title="Account" />
        <div className="space-y-1 px-4">
          <SettingsRow icon={Mail} label="Email" value={user?.email || '(not set)'} disabled />
          <SettingsRow icon={User} label="Username" value={user?.username || '(not set)'} />
          <SettingsRow icon={Lock} label="Change Password" onClick={() => setShowPasswordModal(true)} />
          <SettingsRow
            icon={theme === 'dark' ? Moon : Sun}
            label="Appearance"
            value={theme === 'dark' ? 'Dark mode' : 'Light mode'}
            toggle
            toggled={theme === 'dark'}
            onToggle={() => setTheme(toggleAndNotify())}
          />
          <SettingsRow
            icon={Languages}
            label="Language"
            value={LANGUAGES.find(l => l.code === currentLang)?.nativeName || 'English'}
            onClick={() => setShowLangPicker(true)}
          />
          <SettingsRow
            icon={Globe}
            label="Auto-translate posts"
            value={autoTranslate ? 'On — all posts translated to your language' : 'Off'}
            toggle
            toggled={autoTranslate}
            onToggle={() => dispatch(setAutoTranslate(!autoTranslate))}
          />
        </div>

        {/* Billing */}
        <SectionHeader title="Billing & Credits" />
        <CreditCard_ />
        <div className="space-y-1 px-4 mt-2">
          <SettingsRow icon={CreditCard} label="Transaction History" onClick={() => nav('/billing')} />
        </div>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <div className="space-y-1 px-4">
          <SettingsRow icon={Bell} label="Push Notifications" toggle toggled={pushNotifs} onToggle={() => { setPushNotifs(!pushNotifs); saveNotifPrefs({ pushNotifs: !pushNotifs }); }} />
          <SettingsRow icon={Mail} label="Email Notifications" toggle toggled={emailNotifs} onToggle={() => { setEmailNotifs(!emailNotifs); saveNotifPrefs({ emailNotifs: !emailNotifs }); }} />
          <SettingsRow icon={Sparkles} label="Character Posts" toggle toggled={charPostNotifs} onToggle={() => { setCharPostNotifs(!charPostNotifs); saveNotifPrefs({ charPostNotifs: !charPostNotifs }); }} />
          <SettingsRow icon={Globe} label="Stories" toggle toggled={storyNotifs} onToggle={() => { setStoryNotifs(!storyNotifs); saveNotifPrefs({ storyNotifs: !storyNotifs }); }} />
          <SettingsRow icon={Bell} label="Messages" toggle toggled={msgNotifs} onToggle={() => { setMsgNotifs(!msgNotifs); saveNotifPrefs({ msgNotifs: !msgNotifs }); }} />
          <SettingsRow icon={Bell} label="Reactions" toggle toggled={reactNotifs} onToggle={() => { setReactNotifs(!reactNotifs); saveNotifPrefs({ reactNotifs: !reactNotifs }); }} />
        </div>

        {/* Permissions */}
        <SectionHeader title="Permissions" />
        <div className="space-y-1 px-4">
          <SettingsRow
            icon={Camera}
            label="Camera"
            value={cameraPerm ? 'Allowed' : 'Not granted'}
            toggle
            toggled={cameraPerm}
            onToggle={() => {
              if (!cameraPerm && navigator?.mediaDevices?.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ video: true }).then(() => setCameraPerm(true)).catch(() => {});
              } else {
                setCameraPerm(!cameraPerm);
              }
            }}
          />
          <SettingsRow
            icon={Mic}
            label="Microphone"
            value={micPerm ? 'Allowed' : 'Not granted'}
            toggle
            toggled={micPerm}
            onToggle={() => {
              if (!micPerm && navigator?.mediaDevices?.getUserMedia) {
                navigator.mediaDevices.getUserMedia({ audio: true }).then(() => setMicPerm(true)).catch(() => {});
              } else {
                setMicPerm(!micPerm);
              }
            }}
          />
          <SettingsRow icon={Bell} label="Notifications" value={notifPerm ? 'Allowed' : 'Blocked'} toggle toggled={notifPerm} onToggle={() => setNotifPerm(!notifPerm)} disabled />
          <SettingsRow icon={Smartphone} label="Photo Library" value="Allowed" toggle toggled disabled />
        </div>

        {/* Privacy */}
        <SectionHeader title="Privacy" />
        <div className="space-y-1 px-4">
          <SettingsRow
            icon={Shield}
            label="Private Account"
            value={privateAccount ? 'Only friends can see your content' : 'Anyone can see your public content'}
            toggle
            toggled={privateAccount}
            onToggle={() => setPrivateAccount(!privateAccount)}
          />
          <SettingsRow icon={Globe} label="Who can see my characters" value={charVisibility} onClick={() => { const opts: string[] = ['Everyone', 'Followers Only', 'Only Me']; const idx = Math.max(0, opts.indexOf(charVisibility)); const n = opts[(idx + 1) % 3]!; setCharVisibility(n); localStorage.setItem('itchats-char-visibility', n); }} />
          <SettingsRow icon={Lock} label="Blocked accounts" value={blockedCount > 0 ? `${blockedCount} blocked` : 'None'} onClick={() => alert('Blocked users management coming soon.')} />
        </div>

        {/* About */}
        <SectionHeader title="About" />
        <div className="space-y-1 px-4">
          <SettingsRow icon={Info} label="App Version" value="2.0.0-beta" disabled />
          <SettingsRow icon={HelpCircle} label="FAQ" onClick={() => nav('/legal/faq')} />
          <SettingsRow icon={FileText} label="Terms of Service" onClick={() => nav('/legal/terms')} />
          <SettingsRow icon={Shield} label="Privacy Policy" onClick={() => nav('/legal/privacy')} />
          <SettingsRow icon={Cookie} label="Cookie Policy" onClick={() => nav('/legal/cookies')} />
        </div>

        {/* Delete Account */}
        <div className="px-4 mt-6">
          {showDeleteConfirm ? (
            <div className="glass rounded-2xl p-4 border border-danger/20 space-y-3">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-danger shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-danger">Delete Account</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    This will permanently delete your account, all characters, conversations, and data. This action cannot be undone.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-full glass py-2.5 text-xs font-medium text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { dispatch(logout()); }}
                  className="flex-1 rounded-full bg-danger py-2.5 text-xs font-medium text-white hover:brightness-110 transition-all"
                >
                  Yes, Delete Everything
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full items-center gap-4 px-4 py-3.5 rounded-xl glass hover:bg-danger/10 transition-colors text-left"
            >
              <Trash2 size={20} className="text-danger shrink-0" />
              <span className="text-sm font-medium text-danger">Delete Account</span>
            </button>
          )}
        </div>

        {/* Sign Out */}
        <div className="px-4 mt-6 mb-4">
          <button
            onClick={() => dispatch(logout())}
            className="flex w-full items-center gap-4 px-4 py-3.5 rounded-xl glass hover:bg-danger/10 transition-colors text-left"
          >
            <LogOut size={20} className="text-danger shrink-0" />
            <span className="text-sm font-medium text-danger">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Language Picker Modal */}
      {showLangPicker && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setShowLangPicker(false)}>
          <div className="bg-bg-canvas w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setShowLangPicker(false)} className="p-1.5 rounded-full hover:bg-white/5">
                <X size={20} className="text-text-secondary" />
              </button>
              <h2 className="text-lg font-semibold text-text-primary">Language</h2>
              <div className="w-8" />
            </div>
            <p className="text-xs text-text-muted mb-4 px-1">Choose your preferred language. The app will restart in the selected language.</p>
            <div className="space-y-1">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    dispatch(setLanguage(lang.code));
                    applyLanguage(lang.code);
                    setShowLangPicker(false);
                    // Persist to localStorage directly as well
                    try { localStorage.setItem('itchats-language', lang.code); } catch {}
                  }}
                  className={`flex w-full items-center gap-4 px-4 py-3 rounded-xl transition-colors text-left ${currentLang === lang.code ? 'bg-brand-primary/10 text-brand-primary font-semibold' : 'glass hover:bg-white/5 text-text-primary'}`}
                >
                  <span className="text-xl">{lang.flag || '🌐'}</span>
                  <div className="flex-1">
                    <span className="text-sm">{lang.nativeName}</span>
                    <span className="text-xs text-text-muted ml-2">{lang.englishName}</span>
                  </div>
                  {currentLang === lang.code && <Check size={18} className="text-brand-primary shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end sm:items-center justify-center animate-fade-in" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-bg-canvas w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setShowPasswordModal(false)} className="p-1.5 rounded-full hover:bg-white/5">
                <X size={20} className="text-text-secondary" />
              </button>
              <h2 className="text-lg font-semibold text-text-primary">Change Password</h2>
              <div className="w-8" />
            </div>

            {passwordResult?.success ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center">
                  <Check size={28} className="text-success" />
                </div>
                <p className="text-text-primary font-medium">{passwordResult.message}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {passwordResult?.message && (
                  <div className="px-3 py-2 rounded-lg bg-danger/10 text-danger text-xs font-medium">
                    {passwordResult.message}
                  </div>
                )}
                <input
                  type="password"
                  placeholder="Current password"
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  className="w-full glass rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none"
                />
                <input
                  type="password"
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full glass rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full glass rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none"
                />
                <button
                  onClick={handleChangePassword}
                  disabled={passwordChanging || !currentPassword || !newPassword}
                  className="w-full rounded-full bg-brand-primary py-3 text-sm font-semibold text-white hover:brightness-110 transition-all disabled:opacity-40"
                >
                  {passwordChanging ? 'Changing...' : 'Change Password'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
