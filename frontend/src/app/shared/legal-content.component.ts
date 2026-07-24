import { Component, computed, input } from '@angular/core';

interface LegalSection {
  heading: string;
  body: string[];
}

interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

const TERMS: LegalDoc = {
  title: 'Terms & Conditions',
  updated: 'Last updated: July 2026 (v1 — draft, pending legal review)',
  intro: 'These Terms govern access to and use of Klogu Bizz ("the Service"). By creating an account you agree to them on behalf of yourself and the organisation you register.',
  sections: [
    { heading: '1. Accounts', body: [
      'You must provide accurate information when registering and keep your login credentials confidential. You are responsible for all activity under your account.',
      'Each organisation workspace is isolated — your data is not visible to other tenants.'
    ] },
    { heading: '2. Acceptable Use', body: [
      'You agree not to use the Service to store or transmit unlawful content, attempt to breach the security of the platform, or resell access without written permission.'
    ] },
    { heading: '3. Data Ownership', body: [
      'You retain ownership of all invoices, client records and business data you enter. We process it solely to provide the Service and do not sell it to third parties.',
      'You may export your data at any time and request deletion on account closure, subject to statutory record-keeping requirements for GST documents.'
    ] },
    { heading: '4. Subscriptions & Billing', body: [
      'Paid plans renew automatically for the selected billing cycle unless cancelled beforehand. Fees are non-refundable except where required by law.'
    ] },
    { heading: '5. Termination', body: [
      'You may cancel your subscription at any time from the Subscription page. We may suspend or terminate accounts that violate these Terms or remain unpaid after the applicable grace period.'
    ] },
    { heading: '6. Liability', body: [
      'The Service is provided "as is". To the maximum extent permitted by law, we are not liable for indirect or consequential losses arising from its use. Nothing in these Terms limits liability that cannot be excluded by law.'
    ] },
    { heading: '7. Changes', body: [
      'We may update these Terms from time to time. Material changes will be communicated in advance and require re-acceptance on next sign-in.'
    ] }
  ]
};

const SLA: LegalDoc = {
  title: 'Service Level Agreement (SLA)',
  updated: 'Last updated: July 2026 (v1 — draft, pending legal review)',
  intro: 'This SLA describes the availability, support and maintenance commitments for Klogu Bizz.',
  sections: [
    { heading: '1. Uptime Target', body: [
      'We target 99.9% monthly uptime for the core application and API, excluding scheduled maintenance windows.'
    ] },
    { heading: '2. Support Response Times', body: [
      'Starter/Growth plans: initial response within 1 business day via email.',
      'Business/Enterprise plans: priority support with initial response within 4 business hours, plus a dedicated account manager on Enterprise.'
    ] },
    { heading: '3. Scheduled Maintenance', body: [
      'Planned maintenance is announced at least 48 hours in advance and, where possible, scheduled outside standard Indian business hours (IST).'
    ] },
    { heading: '4. Service Credits', body: [
      'If monthly uptime falls below 99.9% due to causes within our control, affected customers on paid plans may request a pro-rated service credit against their next invoice.'
    ] },
    { heading: '5. Data Backups', body: [
      'Production data is backed up daily with point-in-time recovery retained for 30 days.'
    ] },
    { heading: '6. Exclusions', body: [
      'This SLA does not cover outages caused by factors outside our reasonable control (e.g. internet backbone issues, force majeure) or misuse of the Service.'
    ] }
  ]
};

const DOCS: Record<string, LegalDoc> = { terms: TERMS, sla: SLA };

/** Shared Terms/SLA content — rendered either full-page (legal-page.component.ts) or inside a dialog (auth pages). */
@Component({
  selector: 'app-legal-content',
  standalone: true,
  template: `
    <h1 style="margin:0 0 4px;font-size:22px;letter-spacing:-0.3px;color:var(--text);">{{ doc().title }}</h1>
    <p style="margin:0 0 20px;font-size:12.5px;color:var(--faint,var(--muted));">{{ doc().updated }}</p>
    <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:var(--text);">{{ doc().intro }}</p>
    @for (s of doc().sections; track s.heading) {
      <h2 style="margin:20px 0 8px;font-size:14.5px;color:var(--text);">{{ s.heading }}</h2>
      @for (p of s.body; track p) {
        <p style="margin:0 0 10px;font-size:13.5px;line-height:1.7;color:var(--muted);">{{ p }}</p>
      }
    }
  `
})
export class LegalContentComponent {
  type = input<'terms' | 'sla'>('terms');
  doc = computed(() => DOCS[this.type()] || TERMS);
}
