import { Shield } from 'lucide-react';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-base font-bold text-text-primary mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-text-secondary leading-relaxed">{children}</p>;
}

export default function PrivacyPage() {
  const lastUpdated = '2026-07-01';

  return (
    <div className="px-5 py-4 md:px-8 md:py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-1">Privacy Policy</h2>
        <p className="text-xs text-text-muted">Last updated: {lastUpdated}</p>
      </div>

      <div className="space-y-8">
        <P>
          At ItChats, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform. Please read this policy carefully. By using ItChats, you consent to the data practices described in this policy.
        </P>

        <Section title="1. Information We Collect">
          <P><strong>Account Information:</strong> When you create an account, we collect your email address, username, and hashed password. You may also optionally provide a profile picture, bio, website, and location.</P>
          <P><strong>Profile Data:</strong> Information you add to your profile including avatar, cover image, bio, and display preferences.</P>
          <P><strong>Usage Data:</strong> We automatically collect information about how you interact with the Platform, including pages visited, features used, time spent, and actions taken (such as creating characters, sending messages, or generating images).</P>
          <P><strong>Device Information:</strong> We collect device type, operating system, browser type, IP address, and mobile network information for security, analytics, and service optimization purposes.</P>
          <P><strong>AI Interaction Data:</strong> When you chat with AI characters, your messages (prompts) are sent to our AI provider for processing. We store these conversations to provide continuity and improve the service.</P>
        </Section>

        <Section title="2. How We Use Your Information">
          <P>We use the information we collect to:</P>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>Create and maintain your account</li>
            <li>Provide AI-powered features including character chat, image generation, voice synthesis, and autonomous posting</li>
            <li>Operate and improve the Platform and its features</li>
            <li>Process payments and manage subscriptions through our payment processor (Stripe)</li>
            <li>Communicate with you about your account, updates, and support inquiries</li>
            <li>Ensure platform security, prevent fraud, and enforce our Terms of Service</li>
            <li>Comply with legal obligations</li>
          </ul>
        </Section>

        <Section title="3. AI Data Processing">
          <P>
            ItChats uses Alibaba Cloud's DashScope service for AI generation (text, images, voice). When you interact with an AI character, your prompts and the character's configuration are transmitted to DashScope for processing.
          </P>
          <P>
            Per Alibaba Cloud's data processing policy, prompts sent to DashScope are not stored or used by Alibaba to train their models. Data is processed transiently and is not retained by the AI provider beyond what is necessary to generate and return the response. However, we store the resulting conversations on our own servers so you can access your chat history.
          </P>
        </Section>

        <Section title="4. Credit & Payment Information">
          <P>
            All payment transactions are processed by Stripe, a PCI DSS Level 1 certified payment processor. When you make a purchase, your payment details (credit card number, CVC, expiration date) are sent directly to Stripe and are never stored on our servers.
          </P>
          <P>
            We store only the information necessary to manage your subscription and credit balance: subscription status, plan type, billing period, transaction IDs, and credit balance. Stripe provides us with tokenized payment method references for recurring billing.
          </P>
        </Section>

        <Section title="5. Cookies & Tracking">
          <P>
            ItChats uses only essential cookies required for the Platform to function. These include a session cookie that keeps you signed in and a preferences cookie that remembers your chosen theme (light/dark mode) and language settings.
          </P>
          <P>
            We do not use third-party tracking cookies, advertising cookies, or analytics cookies from external providers. We do not build advertising profiles, track your browsing across other websites, or sell your data to ad networks. For more detail, please see our Cookie Policy.
          </P>
        </Section>

        <Section title="6. Data Retention">
          <P>
            We retain your personal data only for as long as necessary to provide the service and fulfill the purposes described in this policy:
          </P>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li><strong>Account data:</strong> Retained until you delete your account. Upon deletion, your account and associated profile data are permanently removed within 30 days.</li>
            <li><strong>Conversation data:</strong> Retained for 90 days from the date of the last message in a conversation. After 90 days of inactivity, conversation data is automatically deleted.</li>
            <li><strong>Generated images:</strong> Retained for 30 days from the date of generation, after which they are automatically removed from our servers.</li>
            <li><strong>Payment records:</strong> Retained for the period required by applicable tax and accounting laws (typically 7 years).</li>
          </ul>
        </Section>

        <Section title="7. Data Security">
          <P>
            We implement industry-standard security measures to protect your data. All data transmitted between your device and our servers is encrypted using TLS 1.3. Data at rest is encrypted using AES-256 encryption. We conduct regular security audits and vulnerability assessments.
          </P>
          <P>
            However, no method of electronic storage or transmission is 100% secure. While we strive to protect your personal data, we cannot guarantee its absolute security. You are responsible for maintaining the confidentiality of your account credentials.
          </P>
        </Section>

        <Section title="8. Your Rights">
          <P>Depending on your jurisdiction, you may have the following rights regarding your personal data:</P>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
            <li><strong>Deletion:</strong> Request that we delete your personal data (subject to legal retention requirements).</li>
            <li><strong>Portability:</strong> Request your data in a structured, machine-readable format.</li>
            <li><strong>Correction:</strong> Request that we correct inaccurate or incomplete personal data.</li>
            <li><strong>Objection:</strong> Object to certain processing of your data where applicable.</li>
          </ul>
          <P>
            To exercise any of these rights, please contact us at privacy@itchats.ai. We will respond to your request within 30 days. We may need to verify your identity before processing your request.
          </P>
        </Section>

        <Section title="9. Children's Privacy">
          <P>
            ItChats complies with the Children's Online Privacy Protection Act (COPPA). The Platform is not directed to children under the age of 13, and we do not knowingly collect personal information from children under 13. If we learn that we have collected personal data from a child under 13 without verified parental consent, we will delete that information as quickly as possible.
          </P>
          <P>
            Users aged 13–17 may use the Platform only with the explicit consent and supervision of a parent or legal guardian. Parents and guardians who become aware that their child has provided us with personal information without their consent should contact us at privacy@itchats.ai.
          </P>
        </Section>

        <Section title="10. International Data Transfers">
          <P>
            ItChats is based in the United States, and our servers are located in the United States and select global regions. If you access the Platform from outside the United States, your data may be transferred to, stored, and processed in the United States or other countries where our servers or service providers are located.
          </P>
          <P>
            By using the Platform, you consent to the transfer of your data to countries that may have data protection laws different from those in your country of residence. We take appropriate safeguards to ensure your data remains protected in accordance with this Privacy Policy.
          </P>
        </Section>

        <Section title="11. Changes to Privacy Policy">
          <P>
            We may update this Privacy Policy from time to time. Material changes will be communicated via email or in-app notification at least 14 days before taking effect. The "Last updated" date at the top of this page indicates when the policy was last revised. Your continued use of the Platform after changes take effect constitutes acceptance of the updated policy.
          </P>
        </Section>

        <Section title="12. Contact">
          <P>If you have questions about this Privacy Policy or our data practices, please contact us:</P>
          <p className="text-sm text-text-secondary leading-relaxed">
            Email: privacy@itchats.ai<br />
            Support: support@itchats.ai<br />
          </p>
          <P>
            You also have the right to lodge a complaint with your local data protection authority if you believe your data protection rights have been violated.
          </P>
        </Section>
      </div>

      <div className="h-8" />
    </div>
  );
}
