import { Card, Avatar } from '@itchats/ui';

export default function ProfilePage() {
  return (
    <div className="flex min-h-screen flex-col p-6 pt-20">
      <div className="flex items-center gap-4">
        <Avatar size="xl" fallback="You" />
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Your Profile</h1>
          <p className="text-sm text-text-secondary">Manage your account and characters</p>
        </div>
      </div>
      <Card className="mt-6">
        <p className="text-sm text-text-muted">Sign in to access your full profile.</p>
      </Card>
    </div>
  );
}
