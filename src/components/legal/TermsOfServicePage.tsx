import React from 'react';
import { LegalPageShell } from './LegalPageShell';

export function TermsOfServicePage({ onBack }: { onBack: () => void }) {
  return (
    <LegalPageShell title="Terms of Service" updated="October 12, 2026" onBack={onBack}>
      <p>
        These Terms of Service (“Terms”) govern your use of NexCourse AI (“NexCourse,” “we,” “us”), including
        nexcourse.ai and related apps. By creating an account or using the service, you agree to these Terms.
      </p>

      <section>
        <h2>1. The service</h2>
        <p>
          NexCourse turns documents you upload (or a topic you type) into an editable eLearning course and lets you
          export a SCORM package for the LMS you already use. We are not an LMS, we do not host learner analytics as a
          product, and completion/score reporting after publish is handled by your LMS.
        </p>
      </section>

      <section>
        <h2>2. Accounts</h2>
        <p>
          You must provide accurate account information and keep your login secure. You are responsible for activity
          under your account, including Team seats you invite. Trial access is by invitation and may be limited or ended
          as described in the product.
        </p>
      </section>

      <section>
        <h2>3. Your content</h2>
        <p>
          You retain rights to files you upload and courses you generate. You grant us a limited license to process that
          content only to provide the service (extract text, generate slides, store drafts, export packages). We do not
          use your content to train AI models. You represent that you have the right to upload the material and that it
          does not infringe others’ rights or contain unlawful content.
        </p>
      </section>

      <section>
        <h2>4. Plans, credits, and billing</h2>
        <ul>
          <li>Paid plans are billed through Stripe. Prices and included credits are shown on the Pricing page at purchase.</li>
          <li>AI credits are spent when generation API calls succeed (analysis, outline, and slide hydrate) and when an AI image is returned. TTS credits are spent per successful narration clip.</li>
          <li>A short course uses fewer AI credits than a full multi-module course. Failed generation or image calls do not spend credits.</li>
          <li>Subscription credits refresh at the start of each billing cycle. Pay-as-you-go credit packs are added when purchased and do not have a separate expiry date.</li>
          <li>You may cancel anytime via My Account → Manage Subscription (Stripe Customer Portal). Access continues through the paid period.</li>
        </ul>
      </section>

      <section>
        <h2>5. Refunds</h2>
        <p>
          For refund requests within 14 days of a charge, email{' '}
          <a href="mailto:support@nexcourse.ai">support@nexcourse.ai</a> with your account email and Stripe receipt.
          We review refunds case by case; unused credits and first-time charges are prioritized.
        </p>
      </section>

      <section>
        <h2>6. Acceptable use</h2>
        <p>
          Do not reverse engineer the service, overload it, attempt unauthorized access, upload malware, or use NexCourse
          to generate content you do not have rights to publish. We may suspend accounts that violate these Terms.
        </p>
      </section>

      <section>
        <h2>7. AI output</h2>
        <p>
          Generated courses are drafts. You must review and edit them before you publish. We do not warrant that output
          is complete, accurate, or fit for a specific regulatory or training requirement.
        </p>
      </section>

      <section>
        <h2>8. Availability and changes</h2>
        <p>
          We may modify features, credits, or these Terms. Material billing changes will be posted on the site or emailed
          to the account address. Continued use after the update date constitutes acceptance.
        </p>
      </section>

      <section>
        <h2>9. Limitation of liability</h2>
        <p>
          To the extent allowed by law, NexCourse is provided “as is,” and we are not liable for indirect, incidental,
          or consequential damages, or for loss of data, LMS results, or training outcomes. Our total liability for a
          claim is limited to the fees you paid us in the three months before the claim.
        </p>
      </section>

      <section>
        <h2>10. Contact</h2>
        <p>
          Questions: <a href="mailto:support@nexcourse.ai">support@nexcourse.ai</a>. Privacy practices are described in
          our <a href="/privacy">Privacy Policy</a>. How to file a product bug:{' '}
          <a href="/report-a-bug">Report a bug</a>.
        </p>
      </section>
    </LegalPageShell>
  );
}
