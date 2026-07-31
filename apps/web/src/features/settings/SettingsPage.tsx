import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, CreditCard, Bell, Lock, Shield, Globe,
  User, Mail, Camera, Mic, Info, Trash2, LogOut, ChevronRight,
  ToggleLeft, ToggleRight, Sparkles, ExternalLink, AlertTriangle,
  Cookie, HelpCircle, FileText, Sun, Moon, X, Check, Languages,
  Ban, Search, UserX, Users, Eye, EyeOff,
} from 'lucide-react';
import type { RootState } from '@/app/store';
import { logout, useAppDispatch, setLanguage, setAutoTranslate, initLanguageSettings } from '@/app/store';
import { apiFetch } from '@/lib/api';
import { getStoredTheme, toggleAndNotify, type Theme } from '@/app/theme';
import { LANGUAGES, applyLanguage } from '@/lib/i18n';

// ── Types ──
interface UserSettings {
  privateAccount: boolean;
  discoverable: boolean;
  charVisibility: string;
  nsfwFilter: boolean;
  contentLanguage: string;
  notificationPreferences: {
    pushNotifs: boolean;
    emailNotifs: boolean;
    charPostNotifs: boolean;
    storyNotifs: boolean;
    msgNotifs: boolean;
    reactNotifs: boolean;
  };
}

interface BlockedUser {
  id: string;
  username: string;
  displayName?: string | null;
  blockedAt?: string;
}

// ── Settings Row ──
function SettingsRow({
  icon: Icon, label, value, onClick, danger, toggle, toggled, onToggle, disabled, badge,
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
  badge?: string;
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
      style={{ minHeight: 52 }}
    >
      <Icon size={20} className={`shrink-0 ${danger ? 'text-danger' : 'text-text-secondary'}`} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${danger ? 'text-danger' : 'text-text-primary'}`}>{label}</p>
        {value && <p className="text-xs text-text-muted truncate">{value}</p>}
      </div>
      {badge && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary font-medium">
          {badge}
        </span>
      )}
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
function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 mt-6 mb-2">
      <h3 className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">{title}</h3>
      {subtitle && <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>}
    </div>
  );
}

// ── Modal backdrop ──
function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[var(--z-modal)] bg-black/80 flex items-end sm:items-center justify-center animate-fade-in" onClick={onClose}>
      <div
        className="bg-bg-canvas w-full max-w-md rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const nav = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useSelector((s: RootState) => s.auth);

  // Server settings
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Local state mirrors
  const [privateAccount, setPrivateAccount] = useState(false);
  const [discoverable, setDiscoverable] = useState(true);
  const [charVisibility, setCharVisibility] = useState('Everyone');
  const [nsfwFilter, setNsfwFilter] = useState(true);
  const [contentLanguage, setContentLanguage] = useState('en');
  const [notifPrefs, setNotifPrefs] = useState({
    pushNotifs: true, emailNotifs: false, charPostNotifs: true,
    storyNotifs: true, msgNotifs: true, reactNotifs: false,
  });

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);

  // Password
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordChanging, setPasswordChanging] = useState(false);
  const [passwordResult, setPasswordResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // Modals
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showCharVisPicker, setShowCharVisPicker] = useState(false);
  const [showContentLangPicker, setShowContentLangPicker] = useState(false);
  const [showBlockSearch, setShowBlockSearch] = useState(false);
  const [blockSearchQuery, setBlockSearchQuery] = useState('');
  const [blockSearchResults, setBlockSearchResults] = useState<any[]>([]);
  const [blockSearching, setBlockSearching] = useState(false);

  // Theme
  const [theme, setTheme] = useState<Theme>(getStoredTheme);

  // Billing
  const [wallet, setWallet] = useState<{ balance: number } | null>(null);
  const [subscription, setSubscription] = useState<{ plan?: string; planId?: string; status?: string; nextBilling?: string } | null>(null);
  const [billingLoading, setBillingLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Translation
  const { language: currentLang, autoTranslate } = useSelector((s: RootState) => s.translation);

  // Camera/mic permissions
  const [cameraPerm, setCameraPerm] = useState(false);
  const [micPerm, setMicPerm] = useState(false);

  // ── Load data ──
  useEffect(() => {
    loadSettings();
    loadBilling();
    loadBlockedUsers();
    dispatch(initLanguageSettings());
  }, []);

  const loadSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const data = await apiFetch<UserSettings>('/users/me/settings');
      setSettings(data);
      setPrivateAccount(data.privateAccount);
      setDiscoverable(data.discoverable);
      setCharVisibility(data.charVisibility);
      setNsfwFilter(data.nsfwFilter);
      setContentLanguage(data.contentLanguage);
      setNotifPrefs(data.notificationPreferences);
    } catch {
      // Fall back to localStorage defaults
      try {
        const stored = localStorage.getItem('itchats-notifs');
        if (stored) setNotifPrefs(JSON.parse(stored));
      } catch {}
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  const loadBlockedUsers = useCallback(async () => {
    setBlockedLoading(true);
    try {
      const data = await apiFetch<{ blocked: BlockedUser[]; count: number }>('/users/me/blocked');
      setBlockedUsers(data.blocked || []);
    } catch {} finally {
      setBlockedLoading(false);
    }
  }, []);

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const [w, s] = await Promise.all([
        apiFetch<{ balance: number }>('/billing/wallet').catch(() => null),
        apiFetch<any>('/billing/subscription').catch(() => null),
      ]);
      setWallet(w);
      setSubscription(s);
    } catch {} finally { setBillingLoading(false); }
  }, []);

  // ── Save settings helper ──
  const saveSetting = async (key: string, value: any, updateFn: () => void) => {
    setSaving(true);
    updateFn(); // Optimistic update
    try {
      await apiFetch('/users/me/settings', {
        method: 'PATCH',
        body: JSON.stringify({ [key]: value }),
      });
    } catch {
      // Rollback: reload settings
      loadSettings();
    } finally {
      setSaving(false);
    }
  };

  const saveSettingsBatch = async (updates: Record<string, any>) => {
    setSaving(true);
    try {
      await apiFetch('/users/me/settings', {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    } catch {
      loadSettings();
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle handlers ──
  const togglePrivateAccount = () => {
    const next = !privateAccount;
    setPrivateAccount(next);
    saveSettingsBatch({ privateAccount: next });
  };

  const toggleDiscoverable = () => {
    const next = !discoverable;
    setDiscoverable(next);
    saveSettingsBatch({ discoverable: next });
  };

  const toggleNsfwFilter = () => {
    const next = !nsfwFilter;
    setNsfwFilter(next);
    saveSettingsBatch({ nsfwFilter: next });
  };

  const updateNotifPref = async (key: string, value: boolean) => {
    const next = { ...notifPrefs, [key]: value };
    setNotifPrefs(next);
    localStorage.setItem('itchats-notifs', JSON.stringify(next));
    saveSettingsBatch({ notificationPreferences: next });

    // When push notification toggle changes, actually subscribe/unsubscribe
    if (key === 'pushNotifs') {
      if (value) {
        // Request push subscription — browser will prompt
        const { subscribeToPush } = await import('@/lib/push');
        subscribeToPush().catch(() => {});
      } else {
        const { unsubscribeFromPush } = await import('@/lib/push');
        unsubscribeFromPush().catch(() => {});
      }
    }
  };

  // ── Block user search ──
  const searchUsers = async (q: string) => {
    setBlockSearchQuery(q);
    if (q.length < 1) { setBlockSearchResults([]); return; }
    setBlockSearching(true);
    try {
      const res = await apiFetch<any[]>(`/users/search?q=${encodeURIComponent(q)}`);
      setBlockSearchResults(res || []);
    } catch { setBlockSearchResults([]); }
    finally { setBlockSearching(false); }
  };

  const blockUser = async (targetId: string) => {
    try {
      await apiFetch(`/users/${targetId}/block`, { method: 'POST' });
      loadBlockedUsers();
      setShowBlockSearch(false);
      setBlockSearchQuery('');
      setBlockSearchResults([]);
    } catch (e: any) { alert(e.message || 'Failed to block user'); }
  };

  const unblockUser = async (targetId: string) => {
    try {
      await apiFetch(`/users/${targetId}/block`, { method: 'DELETE' });
      loadBlockedUsers();
    } catch (e: any) { alert(e.message || 'Failed to unblock user'); }
  };

  // ── Account deletion ──
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await apiFetch('/users/me', { method: 'DELETE' });
      setShowDeleteConfirm(false);
      dispatch(logout());
      nav('/auth');
    } catch (e: any) {
      alert(e.message || 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Logout all sessions ──
  const handleLogoutAll = async () => {
    try {
      await apiFetch('/auth/logout-all', { method: 'POST' });
      dispatch(logout());
      nav('/auth');
    } catch {
      // Still logout locally even if server call fails
      dispatch(logout());
      nav('/auth');
    }
  };

  // ── Password change ──
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

  const charVisOptions = ['Everyone', 'Followers Only', 'Only Me'];
  const contentLangOptions = [
    { code: 'en', name: 'English' },
    { code: 'ar', name: 'Arabic' },
    { code: 'fi', name: 'Finnish' },
    { code: 'sv', name: 'Swedish' },
    { code: 'de', name: 'German' },
    { code: 'fr', name: 'French' },
    { code: 'zh', name: 'Chinese' },
  ];

  // ── Credit card ──
  const balance = wallet?.balance ?? 0;
  const planName = subscription?.plan ?? subscription?.planId ?? 'Free';
  const planStatus = subscription?.status ?? 'active';

  // ── Loading state ──
  if (settingsLoading && !settings) {
    return (
      <div className="flex flex-col h-full bg-bg-canvas">
        <header className="safe-top px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => nav(-1)} className="p-1.5 rounded-full glass hover:bg-white/10 transition-colors touch-target">
              <ArrowLeft size={20} className="text-text-secondary" />
            </button>
            <div className="skeleton h-8 w-40 rounded-lg" />
          </div>
        </header>
        <div className="flex-1 px-4 space-y-4 pt-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="skeleton h-[52px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-bg-canvas">
      {/* Header */}
      <header className="safe-top px-5 pt-5 pb-3 shrink-0">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={() => nav(-1)} className="p-1.5 rounded-full glass hover:bg-white/10 transition-colors touch-target">
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
        <div className="glass rounded-2xl p-5 mx-4 mb-2">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-brand-primary" />
              <span className="text-sm font-semibold text-text-primary">Credits</span>
            </div>
            {billingLoading ? (
              <div className="skeleton h-5 w-16 rounded-full" />
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                {planStatus}
              </span>
            )}
          </div>
          {billingLoading ? (
            <div className="skeleton h-10 w-24 rounded mb-1" />
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
              className="flex-1 rounded-full glass px-4 py-2.5 text-xs font-medium text-text-primary hover:bg-white/5 transition-all touch-target"
            >
              Manage Subscription
            </button>
            <button className="flex-1 rounded-full bg-brand-primary px-4 py-2.5 text-xs font-medium text-white hover:brightness-110 transition-all touch-target">
              Buy Credits
            </button>
          </div>
        </div>
        <div className="space-y-1 px-4 mt-2">
          <SettingsRow icon={CreditCard} label="Transaction History" onClick={() => nav('/billing')} />
        </div>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <div className="space-y-1 px-4">
          <SettingsRow icon={Bell} label="Push Notifications" toggle toggled={notifPrefs.pushNotifs} onToggle={() => updateNotifPref('pushNotifs', !notifPrefs.pushNotifs)} />
          {/* Email notifications hidden until email service is configured (Section 20) */}
          <SettingsRow icon={Mail} label="Character Posts" toggle toggled={notifPrefs.charPostNotifs} onToggle={() => updateNotifPref('charPostNotifs', !notifPrefs.charPostNotifs)} />
          <SettingsRow icon={Globe} label="Stories" toggle toggled={notifPrefs.storyNotifs} onToggle={() => updateNotifPref('storyNotifs', !notifPrefs.storyNotifs)} />
          <SettingsRow icon={Bell} label="Messages" toggle toggled={notifPrefs.msgNotifs} onToggle={() => updateNotifPref('msgNotifs', !notifPrefs.msgNotifs)} />
          <SettingsRow icon={Bell} label="Reactions" toggle toggled={notifPrefs.reactNotifs} onToggle={() => updateNotifPref('reactNotifs', !notifPrefs.reactNotifs)} />
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
        </div>

        {/* Privacy */}
        <SectionHeader title="Privacy" />
        <div className="space-y-1 px-4">
          <SettingsRow
            icon={privateAccount ? EyeOff : Eye}
            label="Private Account"
            value={privateAccount ? 'Only friends can see your content' : 'Anyone can see your public content'}
            toggle
            toggled={privateAccount}
            onToggle={togglePrivateAccount}
          />
          <SettingsRow
            icon={Globe}
            label="Discoverability"
            value={discoverable ? 'Your profile can be found and suggested' : 'Hidden from discover and search'}
            toggle
            toggled={discoverable}
            onToggle={toggleDiscoverable}
          />
          <SettingsRow
            icon={Users}
            label="Who can see my characters"
            value={charVisibility}
            onClick={() => setShowCharVisPicker(true)}
          />
          <SettingsRow
            icon={Ban}
            label="Blocked accounts"
            value={blockedUsers.length > 0 ? `${blockedUsers.length} blocked` : 'None'}
            onClick={() => { loadBlockedUsers(); setShowBlockedModal(true); }}
          />
        </div>

        {/* Content Preferences */}
        <SectionHeader title="Content Preferences" />
        <div className="space-y-1 px-4">
          <SettingsRow
            icon={Shield}
            label="NSFW Filter"
            value={nsfwFilter ? 'Filter explicit content' : 'Show all content'}
            toggle
            toggled={nsfwFilter}
            onToggle={toggleNsfwFilter}
          />
          <SettingsRow
            icon={Globe}
            label="Content Language"
            value={contentLangOptions.find(l => l.code === contentLanguage)?.name || 'English'}
            onClick={() => setShowContentLangPicker(true)}
          />
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

        {/* Account Actions */}
        <div className="px-4 mt-6 space-y-2">
          {/* Logout All Sessions */}
          <button
            onClick={handleLogoutAll}
            className="flex w-full items-center gap-4 px-4 py-3.5 rounded-xl glass hover:bg-warning/10 transition-colors text-left"
            style={{ minHeight: 52 }}
          >
            <LogOut size={20} className="text-warning shrink-0" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-warning">Logout All Sessions</p>
              <p className="text-xs text-text-muted">Sign out everywhere, including other devices</p>
            </div>
          </button>

          {/* Delete Account */}
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
                  disabled={deleteLoading}
                  className="flex-1 rounded-full glass py-2.5 text-xs font-medium text-text-primary touch-target"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 rounded-full bg-danger py-2.5 text-xs font-medium text-white hover:brightness-110 transition-all disabled:opacity-50 touch-target"
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete Everything'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex w-full items-center gap-4 px-4 py-3.5 rounded-xl glass hover:bg-danger/10 transition-colors text-left"
              style={{ minHeight: 52 }}
            >
              <Trash2 size={20} className="text-danger shrink-0" />
              <span className="text-sm font-medium text-danger">Delete Account</span>
            </button>
          )}
        </div>

        {/* Admin Panel (admin only) */}
        {user?.role === 'admin' && (
          <div className="px-4 mt-6">
            <button
              onClick={() => nav('/admin')}
              className="flex w-full items-center gap-4 px-4 py-3.5 rounded-xl glass hover:bg-violet-500/10 transition-colors text-left border border-violet-500/20"
              style={{ minHeight: 52 }}
            >
              <Shield size={20} className="text-violet-400 shrink-0" />
              <span className="text-sm font-medium text-violet-400">Admin Panel</span>
            </button>
          </div>
        )}

        {/* Sign Out */}
        <div className="px-4 mt-3 mb-4">
          <button
            onClick={() => dispatch(logout())}
            className="flex w-full items-center gap-4 px-4 py-3.5 rounded-xl glass hover:bg-danger/10 transition-colors text-left"
            style={{ minHeight: 52 }}
          >
            <LogOut size={20} className="text-danger shrink-0" />
            <span className="text-sm font-medium text-danger">Sign Out</span>
          </button>
        </div>
      </div>

      {/* ── Language Picker Modal ── */}
      {showLangPicker && (
        <ModalOverlay onClose={() => setShowLangPicker(false)}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setShowLangPicker(false)} className="touch-target rounded-full hover:bg-white/5">
              <X size={20} className="text-text-secondary" />
            </button>
            <h2 className="text-lg font-semibold text-text-primary">Language</h2>
            <div className="w-8" />
          </div>
          <div className="space-y-1">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => {
                  dispatch(setLanguage(lang.code));
                  applyLanguage(lang.code);
                  setShowLangPicker(false);
                  try { localStorage.setItem('itchats-language', lang.code); } catch {}
                }}
                className={`flex w-full items-center gap-4 px-4 py-3 rounded-xl transition-colors text-left ${currentLang === lang.code ? 'bg-brand-primary/10 text-brand-primary font-semibold' : 'glass hover:bg-white/5 text-text-primary'}`}
                style={{ minHeight: 48 }}
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
        </ModalOverlay>
      )}

      {/* ── Character Visibility Picker ── */}
      {showCharVisPicker && (
        <ModalOverlay onClose={() => setShowCharVisPicker(false)}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setShowCharVisPicker(false)} className="touch-target rounded-full hover:bg-white/5">
              <X size={20} className="text-text-secondary" />
            </button>
            <h2 className="text-lg font-semibold text-text-primary">Character Visibility</h2>
            <div className="w-8" />
          </div>
          <div className="space-y-1">
            {charVisOptions.map(opt => (
              <button
                key={opt}
                onClick={() => {
                  setCharVisibility(opt);
                  saveSettingsBatch({ charVisibility: opt });
                  setShowCharVisPicker(false);
                }}
                className={`flex w-full items-center gap-4 px-4 py-3 rounded-xl transition-colors text-left ${charVisibility === opt ? 'bg-brand-primary/10 text-brand-primary font-semibold' : 'glass hover:bg-white/5 text-text-primary'}`}
                style={{ minHeight: 48 }}
              >
                <span className="text-sm">{opt}</span>
                {charVisibility === opt && <Check size={18} className="text-brand-primary shrink-0 ml-auto" />}
              </button>
            ))}
          </div>
        </ModalOverlay>
      )}

      {/* ── Content Language Picker ── */}
      {showContentLangPicker && (
        <ModalOverlay onClose={() => setShowContentLangPicker(false)}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setShowContentLangPicker(false)} className="touch-target rounded-full hover:bg-white/5">
              <X size={20} className="text-text-secondary" />
            </button>
            <h2 className="text-lg font-semibold text-text-primary">Content Language</h2>
            <div className="w-8" />
          </div>
          <p className="text-xs text-text-muted mb-4 px-1">Prefer content in this language across Discover, Feed, and recommendations.</p>
          <div className="space-y-1">
            {contentLangOptions.map(opt => (
              <button
                key={opt.code}
                onClick={() => {
                  setContentLanguage(opt.code);
                  saveSettingsBatch({ contentLanguage: opt.code });
                  setShowContentLangPicker(false);
                }}
                className={`flex w-full items-center gap-4 px-4 py-3 rounded-xl transition-colors text-left ${contentLanguage === opt.code ? 'bg-brand-primary/10 text-brand-primary font-semibold' : 'glass hover:bg-white/5 text-text-primary'}`}
                style={{ minHeight: 48 }}
              >
                <span className="text-sm">{opt.name}</span>
                {contentLanguage === opt.code && <Check size={18} className="text-brand-primary shrink-0 ml-auto" />}
              </button>
            ))}
          </div>
        </ModalOverlay>
      )}

      {/* ── Blocked Users Modal ── */}
      {showBlockedModal && (
        <ModalOverlay onClose={() => { setShowBlockedModal(false); setShowBlockSearch(false); }}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => { setShowBlockedModal(false); setShowBlockSearch(false); }} className="touch-target rounded-full hover:bg-white/5">
              <X size={20} className="text-text-secondary" />
            </button>
            <h2 className="text-lg font-semibold text-text-primary">Blocked Accounts</h2>
            <button
              onClick={() => setShowBlockSearch(true)}
              className="touch-target rounded-full hover:bg-white/5"
            >
              <Search size={18} className="text-text-secondary" />
            </button>
          </div>

          {showBlockSearch ? (
            <div className="space-y-3">
              <input
                type="text"
                value={blockSearchQuery}
                onChange={e => searchUsers(e.target.value)}
                placeholder="Search users to block..."
                className="w-full glass rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none"
              />
              {blockSearching && <p className="text-xs text-text-muted text-center">Searching...</p>}
              {blockSearchResults.length > 0 && (
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {blockSearchResults.map(user => (
                    <div key={user.id} className="flex items-center gap-3 px-3 py-2 glass rounded-xl">
                      <div className="flex-1">
                        <p className="text-sm text-text-primary">{user.displayName || user.username}</p>
                        {user.displayName && <p className="text-xs text-text-muted">@{user.username}</p>}
                      </div>
                      <button
                        onClick={() => blockUser(user.id)}
                        className="text-xs px-3 py-1.5 rounded-full bg-danger/10 text-danger font-medium hover:bg-danger/20 touch-target"
                      >
                        Block
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {blockSearchQuery && !blockSearching && blockSearchResults.length === 0 && (
                <p className="text-xs text-text-muted text-center py-4">No users found</p>
              )}
              <button
                onClick={() => { setShowBlockSearch(false); setBlockSearchQuery(''); }}
                className="w-full text-xs text-text-muted py-2 hover:text-text-secondary"
              >
                Cancel
              </button>
            </div>
          ) : blockedLoading ? (
            <div className="space-y-2 py-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton h-14 rounded-xl" />
              ))}
            </div>
          ) : blockedUsers.length === 0 ? (
            <div className="empty-state py-8">
              <Ban size={36} className="text-text-muted mb-2" />
              <p className="empty-state-title">No Blocked Accounts</p>
              <p className="empty-state-desc">Tap the search icon above to find and block users.</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {blockedUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2.5 glass rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-bg-glass flex items-center justify-center">
                    <UserX size={18} className="text-text-muted" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{u.displayName || u.username}</p>
                    {u.displayName && <p className="text-xs text-text-muted">@{u.username}</p>}
                  </div>
                  <button
                    onClick={() => unblockUser(u.id)}
                    className="text-xs px-3 py-1.5 rounded-full glass hover:bg-white/10 font-medium touch-target"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </ModalOverlay>
      )}

      {/* ── Password Change Modal ── */}
      {showPasswordModal && (
        <ModalOverlay onClose={() => setShowPasswordModal(false)}>
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setShowPasswordModal(false)} className="touch-target rounded-full hover:bg-white/5">
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
                className="w-full glass rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus-ring"
              />
              <input
                type="password"
                placeholder="New password (min 6 chars)"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full glass rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus-ring"
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full glass rounded-xl px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none focus-ring"
              />
              <button
                onClick={handleChangePassword}
                disabled={passwordChanging || !currentPassword || !newPassword}
                className="w-full rounded-full bg-brand-primary py-3 text-sm font-semibold text-white hover:brightness-110 transition-all disabled:opacity-40 touch-target"
              >
                {passwordChanging ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          )}
        </ModalOverlay>
      )}
    </div>
  );
}
