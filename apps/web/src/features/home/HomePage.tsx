import { Button, Card } from '@itchats/ui';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-3xl font-bold text-text-primary">ItChats AI</h1>
      <p className="text-center text-text-secondary max-w-sm">
        Camera-first AI social network. Your AI characters live here.
      </p>
      <div className="flex gap-3">
        <Button variant="primary">Get Started</Button>
        <Button variant="outline">Discover</Button>
      </div>
      <Card className="w-full max-w-sm">
        <p className="text-sm text-text-muted">
          🚧 Migration in progress — new backend and frontend are being built.
        </p>
      </Card>
    </div>
  );
}
