import { Cookie, Shield, Settings, Clock, Info } from 'lucide-react';

function Section({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-base font-bold text-text-primary mb-3 flex items-center gap-2">
        {Icon && <Icon size={18} className="text-brand-primary shrink-0" />}
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-text-secondary leading-relaxed">{children}</p>;
}

export default function CookiePage() {
  const lastUpdated = '2026-07-01';

  return (
    <div className="px-5 py-4 md:px-8 md:py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-1">Cookie Policy</h2>
        <p className="text-xs text-text-muted">Last updated: {lastUpdated}</p>
      </div>

      <div className="space-y-8">
        {/* 1. What are cookies */}
        <Section title="1. What Are Cookies" icon={Info}>
          <P>
            Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently, as well as to provide information to the site owners. Cookies allow a website to recognize your device and remember certain information about your visit, such as your preferences and login status.
          </P>
          <P>
            Cookies can be "persistent" or "session" cookies. Persistent cookies remain on your device after you close your browser, until they expire or you delete them. Session cookies are temporary and are deleted automatically when you close your browser.
          </P>
        </Section>

        {/* 2. Types we use */}
        <Section title="2. Types of Cookies We Use" icon={Cookie}>
          <P>
            ItChats uses a minimal set of cookies — only those strictly necessary for the Platform to function properly. We do not use cookies for advertising, tracking, or analytics purposes.
          </P>

          <div className="space-y-4 mt-4">
            {/* Essential cookies */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield size={16} className="text-success" />
                <h4 className="text-sm font-semibold text-text-primary">Essential Cookies</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/20 text-success font-medium ml-auto">
                  Always Active
                </span>
              </div>
              <P>
                These cookies are necessary for the Platform to function and cannot be switched off in our systems. They include:
              </P>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-text-secondary leading-relaxed">
                <li><strong>Authentication Session:</strong> Stores a secure token that keeps you signed in while you use the Platform. Without this cookie, you would need to log in on every page. Expires when you close your browser (session cookie).</li>
                <li><strong>Security Token:</strong> Protects against cross-site request forgery (CSRF) attacks. Expires with your session.</li>
              </ul>
            </div>

            {/* Preference cookies */}
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings size={16} className="text-warning" />
                <h4 className="text-sm font-semibold text-text-primary">Preference Cookies</h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-warning/20 text-warning font-medium ml-auto">
                  Optional
                </span>
              </div>
              <P>
                These cookies allow the Platform to remember choices you make to provide a more personalized experience:
              </P>
              <ul className="list-disc pl-6 mt-2 space-y-1 text-sm text-text-secondary leading-relaxed">
                <li><strong>Theme Preference:</strong> Remembers whether you prefer light or dark mode, so the Platform displays correctly on your next visit. Expires after 365 days.</li>
                <li><strong>Language Preference:</strong> Remembers your preferred language setting. Expires after 365 days.</li>
                <li><strong>Cookie Consent:</strong> Remembers your cookie preferences so we do not show the consent banner on every visit. Expires after 365 days.</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 3. No third-party cookies */}
        <Section title="3. No Third-Party Advertising Cookies" icon={Shield}>
          <P>
            ItChats does not use third-party advertising cookies or tracking cookies. We do not partner with advertising networks, data brokers, or analytics providers that place cookies on your device. We do not track your browsing activity across other websites or build advertising profiles based on your behavior.
          </P>
          <P>
            Your activity on ItChats stays on ItChats. We do not sell, share, or disclose your data to advertisers.
          </P>
        </Section>

        {/* 4. No tracking */}
        <Section title="4. No Tracking Cookies">
          <P>
            We do not use any cookies, pixels, or similar technologies for the purpose of tracking your online activities over time and across different websites. ItChats does not respond to "Do Not Track" (DNT) signals because we do not track users in the first place.
          </P>
          <P>
            We collect anonymous, aggregated usage statistics through our own server-side logging (not client-side cookies) solely for the purpose of understanding platform usage patterns and improving performance. This data cannot be used to identify individual users.
          </P>
        </Section>

        {/* 5. How to disable */}
        <Section title="5. How to Disable Cookies" icon={Settings}>
          <P>
            Most web browsers allow you to control cookies through their settings preferences. You can set your browser to refuse all cookies, accept only certain types, or alert you when a cookie is being set. Please note that if you disable essential cookies, you may not be able to sign in or use core features of the Platform.
          </P>
          <P>Here is how to manage cookies on common browsers:</P>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies and other site data</li>
            <li><strong>Safari:</strong> Preferences → Privacy → Cookies and website data</li>
            <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies and Site Data</li>
            <li><strong>Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies and site data</li>
          </ul>
          <P>
            You can also clear your cookie consent preferences at any time from your browser settings or by using the cookie settings modal available on the Platform. Clearing your preferences will cause the cookie consent banner to reappear on your next visit.
          </P>
        </Section>

        {/* 6. Duration */}
        <Section title="6. Cookie Duration" icon={Clock}>
          <P>
            The duration of cookies used by ItChats is as follows:
          </P>
          <div className="glass rounded-xl overflow-hidden mt-3">
            <div className="grid grid-cols-3 gap-4 px-4 py-3 bg-white/[0.02] border-b border-border-subtle text-[10px] font-semibold text-text-muted uppercase tracking-wider">
              <span>Cookie</span>
              <span>Type</span>
              <span>Duration</span>
            </div>
            {[
              ['itchats_session', 'Essential', 'Session'],
              ['itchats_csrf', 'Essential', 'Session'],
              ['itchats_theme', 'Preference', '365 days'],
              ['itchats_lang', 'Preference', '365 days'],
              ['cookie_consent', 'Preference', '365 days'],
            ].map(([name, type, duration]) => (
              <div
                key={name}
                className="grid grid-cols-3 gap-4 px-4 py-2.5 border-b border-border-subtle last:border-b-0 text-sm"
              >
                <code className="text-brand-primary text-xs">{name}</code>
                <span className="text-text-secondary text-xs">{type}</span>
                <span className="text-text-muted text-xs">{duration}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="h-8" />
    </div>
  );
}
