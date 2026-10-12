import React from 'react';
import { LegalPageShell } from './LegalPageShell';

export function PrivacyPolicyPage({ onBack }: { onBack: () => void }) {
  return (
    <LegalPageShell title="Privacy Policy" updated="October 12, 2026" onBack={onBack}>
      <p>
        This policy explains what NexCourse AI collects, why we collect it, and how we handle it. NexCourse is a
        file-to-SCORM authoring tool. Uploaded files and generated courses stay private to your account (or Team workspace).
      </p>

      <section>
        <h2>1. What we collect</h2>
        <ul>
          <li>Account data: email, name, authentication identifiers (including Google sign-in if you choose it).</li>
          <li>Content you provide: uploaded documents, typed topics, course drafts, media you add, and generated slide/narration text.</li>
          <li>Billing data: processed by Stripe (card details never stored on our servers). We store Stripe customer and subscription IDs and credit balances.</li>
          <li>Usage needed to run the product: AI/TTS credit consumption, trial weekly caps, support tickets, and basic logs (errors, IP for rate limits).</li>
        </ul>
      </section>

      <section>
        <h2>2. How we use it</h2>
        <p>
          We use this information to operate the service: authenticate you, extract source text, generate and save courses,
          bill plans and credits, send transactional email (password reset, ticket receipts), and improve reliability.
          We do not sell your personal data. We do not use your uploaded files or generated courses to train AI models.
        </p>
      </section>

      <section>
        <h2>3. Processors</h2>
        <p>
          We use vendors only to run NexCourse, including hosting, database/auth (Supabase), payments (Stripe), email
          (Resend), and AI providers that generate course text, images, or narration from the prompts we send. Those
          providers process content as needed to return a result; they are not given a license to use your material for
          their own training under our product terms with you.
        </p>
      </section>

      <section>
        <h2>4. Sharing</h2>
        <p>
          We share data with processors listed above, when required by law, or if you use Team seats (workspace owners
          and members see shared drafts and pooled credits). Review links you create share a play-only snapshot with
          whoever has the link until it expires. We do not share your courses with other customers.
        </p>
      </section>

      <section>
        <h2>5. Retention</h2>
        <p>
          Account and draft data remain until you delete them or close the account, subject to backups and legal holds.
          You can delete drafts from View drafts. To request account deletion, email{' '}
          <a href="mailto:support@nexcourse.ai">support@nexcourse.ai</a>.
        </p>
      </section>

      <section>
        <h2>6. Security</h2>
        <p>
          Drafts are stored per-account with access controls. Cloud assets use private storage prefixes. No method of
          transmission is perfectly secure; please use a strong unique password.
        </p>
      </section>

      <section>
        <h2>7. Cookies and analytics</h2>
        <p>
          We use essential cookies/local storage for sign-in and app state. We do not run advertising pixels on the
          authoring app.
        </p>
      </section>

      <section>
        <h2>8. Your choices</h2>
        <p>
          You can access and update account details in My Account, export courses as SCORM, and contact us to correct or
          delete personal data. If you are in a region with additional privacy rights, email support and we will handle
          the request as the law requires.
        </p>
      </section>

      <section>
        <h2>9. Contact</h2>
        <p>
          Privacy questions: <a href="mailto:support@nexcourse.ai">support@nexcourse.ai</a>. Related:{' '}
          <a href="/terms">Terms of Service</a> and <a href="/report-a-bug">how to report a bug</a>.
        </p>
      </section>
    </LegalPageShell>
  );
}
