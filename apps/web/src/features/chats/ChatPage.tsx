import { Card } from '@itchats/ui';

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col p-6 pt-20">
      <h1 className="text-2xl font-bold text-text-primary">Chats</h1>
      <Card className="mt-4">
        <p className="text-sm text-text-muted">Your conversations will appear here.</p>
      </Card>
    </div>
  );
}
