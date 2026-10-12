import React from 'react';
import { LegalPageShell } from '../legal/LegalPageShell';

export function ReportBugPage({ onBack }: { onBack: () => void }) {
  return (
    <LegalPageShell title="How to report a bug" updated="October 12, 2026" onBack={onBack}>
      <p>
        Use this page when something in NexCourse does not work as expected (generation, player, publish, billing, or
        account). Product questions and refunds can use the same inbox.
      </p>

      <section>
        <h2>1. Fastest path (signed in)</h2>
        <p>
          In the app, open the Help widget (question-mark button) → <strong>Submit Ticket</strong> → issue type{' '}
          <strong>Bug Report</strong>. You will get a ticket id that starts with <strong>NCX-</strong>. Keep that id in
          follow-up mail.
        </p>
      </section>

      <section>
        <h2>2. Email</h2>
        <p>
          Write <a href="mailto:support@nexcourse.ai?subject=Bug%20report">support@nexcourse.ai</a> from the email on
          your NexCourse account. We aim to reply within 2 business days.
        </p>
      </section>

      <section>
        <h2>3. What to include</h2>
        <ul>
          <li>Account email and (if you have one) NCX ticket id</li>
          <li>What you clicked, in order (for example: Upload → Continue → Generate)</li>
          <li>What you expected vs what happened</li>
          <li>Browser and whether you were on nexcourse.ai or a published SCORM zip</li>
          <li>A screenshot or short clip if the player or layout is wrong</li>
          <li>For billing: the Stripe receipt email or last four of the card used in test/live Checkout</li>
        </ul>
      </section>

      <section>
        <h2>4. What we do not need</h2>
        <p>
          Do not send LMS passwords, live card numbers, or confidential source files unless we ask. A description of the
          file type (Word / PDF / PPT) is enough to start.
        </p>
      </section>

      <section>
        <h2>5. Other help</h2>
        <p>
          Cancel or change a plan from My Account → Manage Subscription. Refund requests within 14 days of a charge go
          to the same support address with your receipt.{' '}
          <a href="/terms">Terms of Service</a> · <a href="/privacy">Privacy Policy</a>
        </p>
      </section>
    </LegalPageShell>
  );
}
