import { useState } from 'react';
import { Card, Tabs } from '@itchats/ui';

export default function DiscoverPage() {
  const [tab, setTab] = useState('characters');

  return (
    <div className="flex min-h-screen flex-col p-6 pt-20">
      <h1 className="text-2xl font-bold text-text-primary">Discover</h1>
      <div className="mt-4">
        <Tabs
          value={tab}
          onValueChange={setTab}
          items={[
            { value: 'characters', label: 'AI Characters' },
            { value: 'nearby', label: 'Nearby' },
          ]}
        />
      </div>
      <Card className="mt-4">
        <p className="text-sm text-text-muted">Discover AI characters and content here.</p>
      </Card>
    </div>
  );
}
