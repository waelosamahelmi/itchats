import { Scale } from 'lucide-react';

export default function TermsPage() {
  const lastUpdated = '2026-07-01';

  return (
    <div className="px-5 py-4 md:px-8 md:py-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-text-primary mb-1">Terms of Service</h2>
        <p className="text-xs text-text-muted">Last updated: {lastUpdated}</p>
      </div>

      <div className="prose-custom space-y-8">
        {/* 1. Acceptance */}
        <Section title="1. Acceptance of Terms">
          <P>
            By accessing or using ItChats ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not access or use the Platform. These Terms constitute a legally binding agreement between you and ItChats.
          </P>
          <P>
            We reserve the right to update or modify these Terms at any time. Material changes will be communicated via email or an in-app notification. Your continued use of the Platform after any such changes constitutes your acceptance of the new Terms.
          </P>
        </Section>

        {/* 2. Eligibility */}
        <Section title="2. Eligibility">
          <P>
            You must be at least 18 years old to use ItChats. Individuals between the ages of 13 and 17 may use the Platform only with the explicit consent and supervision of a parent or legal guardian. By using the Platform, you represent and warrant that you meet these age requirements.
          </P>
          <P>
            If you are a parent or guardian and you allow your child (aged 13–17) to use the Platform, you agree to be bound by these Terms on their behalf and you are responsible for their activity on the Platform.
          </P>
        </Section>

        {/* 3. Account */}
        <Section title="3. Account Registration & Security">
          <P>
            You must create an account to access most features of the Platform. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for safeguarding your account credentials and for all activity that occurs under your account.
          </P>
          <P>
            You must notify us immediately at support@itchats.ai if you suspect any unauthorized use of your account. ItChats is not liable for any loss or damage arising from your failure to protect your account credentials.
          </P>
        </Section>

        {/* 4. Credits & Payment */}
        <Section title="4. Credits & Payment Terms">
          <P>
            ItChats uses an internal credit system for AI-powered features. Credits are virtual units that are consumed when you use AI services such as character chat, image generation, voice synthesis, and autonomous character posting. Credit consumption rates are published in the Platform and may be adjusted with notice.
          </P>
          <P>
            All purchases of credits and subscriptions are final. Refunds are handled on a case-by-case basis and are at our sole discretion. You are responsible for any taxes applicable to your purchases.
          </P>
        </Section>

        {/* 5. Subscriptions */}
        <Section title="5. Subscriptions & Billing">
          <P>
            Subscription plans automatically renew at the end of each billing period unless cancelled. You may cancel your subscription at any time from your account settings; cancellation takes effect at the end of the current billing period. You will retain access to paid features until the end of the period you have paid for.
          </P>
          <P>
            We may change subscription pricing with 30 days' notice. Price changes apply to your next billing cycle and do not affect the current period.
          </P>
        </Section>

        {/* 6. AI Characters */}
        <Section title="6. AI Character Creation & Ownership">
          <P>
            When you create an AI character on ItChats, you retain ownership of the character's custom attributes (name, personality, backstory, appearance description, and custom images you upload). You grant ItChats a worldwide, non-exclusive, royalty-free license to host, display, and distribute your character on the Platform as necessary to provide the service.
          </P>
          <P>
            AI-generated content produced by your character (chat messages, images, stories, posts) is considered derivative work. You are responsible for ensuring that your characters and their outputs comply with these Terms and applicable laws. You may not create characters that impersonate real individuals without their express consent.
          </P>
        </Section>

        {/* 7. User Content */}
        <Section title="7. User Content & Conduct">
          <P>
            You are solely responsible for all content you upload, post, share, or otherwise make available on the Platform ("User Content"). You represent that you own or have all necessary rights to your User Content and that it does not infringe the rights of any third party.
          </P>
          <P>
            By posting User Content, you grant ItChats a non-exclusive, transferable, sublicensable, royalty-free, worldwide license to use, reproduce, modify, adapt, publish, and display such content in connection with operating and promoting the Platform. This license ends when you delete your User Content or your account, except to the extent the content has been shared with others and they have not deleted it.
          </P>
        </Section>

        {/* 8. Prohibited Activities */}
        <Section title="8. Prohibited Activities">
          <P>You agree not to engage in any of the following prohibited activities:</P>
          <ul className="list-disc pl-6 space-y-1.5 text-sm text-text-secondary leading-relaxed">
            <li>Creating or distributing illegal sexually explicit content (NSFW content involving minors is strictly prohibited and will result in immediate account termination and reporting to authorities)</li>
            <li>Harassing, threatening, or abusing other users</li>
            <li>Impersonating another person or entity without authorization</li>
            <li>Scraping, crawling, or data-mining the Platform without prior written permission</li>
            <li>Reverse engineering, decompiling, or attempting to extract the source code of the Platform</li>
            <li>Using the Platform for any illegal purpose or in violation of any applicable laws</li>
            <li>Creating accounts through unauthorized means, including bots or automated registration</li>
            <li>Interfering with or disrupting the integrity or performance of the Platform</li>
            <li>Uploading viruses, malware, or malicious code</li>
            <li>Reselling or redistributing access to the Platform without authorization</li>
          </ul>
        </Section>

        {/* 9. Intellectual Property */}
        <Section title="9. Intellectual Property Rights">
          <P>
            The Platform, including its code, design, branding, logos, and all other intellectual property, is owned by ItChats and is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Platform without our express written permission.
          </P>
          <P>
            The ItChats name, logo, and all related names and logos are trademarks of ItChats. You may not use these trademarks without our prior written consent.
          </P>
        </Section>

        {/* 10. Third-Party */}
        <Section title="10. Third-Party Services">
          <P>
            ItChats integrates with third-party services to provide certain features. AI generation capabilities are powered by Alibaba Cloud (DashScope). Payment processing is handled by Stripe. By using the Platform, you agree to comply with the applicable terms of these third-party services.
          </P>
          <P>
            We are not responsible for the availability, accuracy, or performance of third-party services. Your use of third-party services is at your own risk.
          </P>
        </Section>

        {/* 11. Termination */}
        <Section title="11. Termination & Account Deletion">
          <P>
            You may delete your account at any time from your account settings. Upon deletion, your account, characters, conversations, and all associated data will be permanently removed within 30 days. Some information may be retained as required by law or for legitimate business purposes (such as fraud prevention).
          </P>
          <P>
            We reserve the right to suspend or terminate your account at any time, with or without cause, including for violations of these Terms. In the event of termination for cause, you will not be entitled to a refund of any prepaid fees or credits.
          </P>
        </Section>

        {/* 12. Disclaimer */}
        <Section title="12. Disclaimer of Warranties">
          <P>
            The Platform is provided on an "AS IS" and "AS AVAILABLE" basis. To the fullest extent permitted by law, ItChats disclaims all warranties, express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
          </P>
          <P>
            We do not warrant that the Platform will be uninterrupted, error-free, secure, or free of viruses. AI-generated content may be inaccurate, offensive, or otherwise inappropriate. You use AI features at your own discretion and risk.
          </P>
        </Section>

        {/* 13. Limitation of Liability */}
        <Section title="13. Limitation of Liability">
          <P>
            To the maximum extent permitted by law, ItChats and its officers, directors, employees, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, or goodwill, arising out of or in connection with your use of the Platform.
          </P>
          <P>
            Our total liability to you for any claim arising from these Terms or your use of the Platform shall not exceed the amount you have paid to ItChats in the twelve (12) months preceding the claim, or one hundred dollars ($100), whichever is greater.
          </P>
        </Section>

        {/* 14. Indemnification */}
        <Section title="14. Indemnification">
          <P>
            You agree to indemnify, defend, and hold harmless ItChats and its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your access to or use of the Platform, your User Content, or your violation of these Terms.
          </P>
        </Section>

        {/* 15. Governing Law */}
        <Section title="15. Governing Law">
          <P>
            These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved exclusively in the courts located in Delaware.
          </P>
        </Section>

        {/* 16. Changes */}
        <Section title="16. Changes to Terms">
          <P>
            We may update these Terms from time to time. When we make material changes, we will notify you via email (to the address associated with your account) or through an in-app notification at least 14 days before the changes take effect. For non-material changes, we may update the Terms without prior notice. The "Last updated" date at the top of this page reflects the most recent revision.
          </P>
        </Section>

        {/* 17. Contact */}
        <Section title="17. Contact Information">
          <P>
            For questions about these Terms, please contact us at:
          </P>
          <p className="text-sm text-text-secondary leading-relaxed">
            Email: legal@itchats.ai<br />
            Support: support@itchats.ai<br />
          </p>
        </Section>
      </div>

      <div className="h-8" />
    </div>
  );
}

/* ── Reusable prose components for all legal pages ── */

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
