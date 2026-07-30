import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  ArrowLeft, CreditCard, Bell, Lock, Shield, Globe, Smartphone,
  User, Mail, Camera, Mic, Info, Trash2, LogOut, ChevronRight,
  ToggleLeft, ToggleRight, Sparkles, ExternalLink, AlertTriangle,
  Cookie, HelpCircle, FileText, Sun, Moon,
} from 'lucide-react';
import type { RootState } from '@/app/store';
import { logout, useAppDispatch } from '@/app/store';
import { mockCurrentUser, mockCredits } from '@/lib/mockData';
import { getStoredTheme, toggleAndNotify, type Theme } from '@/app/theme';

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

  // Permissions
  const [cameraPerm, setCameraPerm] = useState(false);
  const [micPerm, setMicPerm] = useState(false);
  const [notifPerm, setNotifPerm] = useState(true);

  const [theme, setTheme] = useState<Theme>(getStoredTheme);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // ── Credit display card ──
  const CreditCard_ = () => (
    <div className="glass rounded-2xl p-5 mx-4 mb-2 bg-gradient-to-br from-brand-primary/10 to-transparent border border-brand-primary/10">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-brand-primary" />
          <span className="text-sm font-semibold text-text-primary">Credits</span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
          {mockCredits.subscription.status}
        </span>
      </div>
      <p className="text-4xl font-extrabold text-text-primary mb-1">{mockCredits.balance.toLocaleString()}</p>
      <p className="text-xs text-text-muted mb-4">Available credits for AI features</p>
      <div className="flex items-center justify-between text-xs text-text-secondary">
        <span>{mockCredits.subscription.plan}</span>
        <span>{mockCredits.subscription.price}</span>
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
          <SettingsRow icon={Mail} label="Email" value={user?.email || mockCurrentUser.email} disabled />
          <SettingsRow icon={User} label="Username" value={user?.username || mockCurrentUser.username} />
          <SettingsRow icon={Lock} label="Change Password" onClick={() => {}} />
          <SettingsRow
            icon={theme === 'dark' ? Moon : Sun}
            label="Appearance"
            value={theme === 'dark' ? 'Dark mode' : 'Light mode'}
            toggle
            toggled={theme === 'dark'}
            onToggle={() => setTheme(toggleAndNotify())}
          />
        </div>

        {/* Billing */}
        <SectionHeader title="Billing & Credits" />
        <CreditCard_ />
        <div className="space-y-1 px-4 mt-2">
          <SettingsRow icon={CreditCard} label="Transaction History" onClick={() => {}} />
        </div>

        {/* Notifications */}
        <SectionHeader title="Notifications" />
        <div className="space-y-1 px-4">
          <SettingsRow icon={Bell} label="Push Notifications" toggle toggled={pushNotifs} onToggle={() => setPushNotifs(!pushNotifs)} />
          <SettingsRow icon={Mail} label="Email Notifications" toggle toggled={emailNotifs} onToggle={() => setEmailNotifs(!emailNotifs)} />
          <SettingsRow icon={Sparkles} label="Character Posts" toggle toggled={charPostNotifs} onToggle={() => setCharPostNotifs(!charPostNotifs)} />
          <SettingsRow icon={Globe} label="Stories" toggle toggled={storyNotifs} onToggle={() => setStoryNotifs(!storyNotifs)} />
          <SettingsRow icon={Bell} label="Messages" toggle toggled={msgNotifs} onToggle={() => setMsgNotifs(!msgNotifs)} />
          <SettingsRow icon={Bell} label="Reactions" toggle toggled={reactNotifs} onToggle={() => setReactNotifs(!reactNotifs)} />
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
          <SettingsRow icon={Globe} label="Who can see my characters" value="Everyone" onClick={() => {}} />
          <SettingsRow icon={Lock} label="Blocked accounts" onClick={() => {}} />
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
    </div>
  );
}
