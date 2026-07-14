import { Component, input } from '@angular/core';

/**
 * Decorative floating invoice preview shown on the auth marketing panel —
 * proves what the product actually looks like rather than describing it,
 * which reads as far more credible than copy alone on a login screen.
 */
@Component({
  selector: 'app-auth-preview-card',
  standalone: true,
  template: `
    <div class="auth-mockup">
      <div class="auth-mockup-head">
        <span class="am-dot red"></span>
        <span class="am-dot amber"></span>
        <span class="am-dot green"></span>
        <span class="am-head-label">invoice.klogubizz.app</span>
      </div>
      <div class="auth-mockup-body">
        <div class="auth-mockup-row">
          <div>
            <div class="am-label">Tax Invoice</div>
            <div class="am-value">INV-2026-0842</div>
          </div>
          <span class="am-pill" [style.background]="accentColor()" [style.color]="'#fff'">Paid</span>
        </div>
        <div class="am-divider"></div>
        <div class="am-line"><span>Consulting Services</span><span>₹45,000.00</span></div>
        <div class="am-line muted"><span>CGST (9%)</span><span>₹4,050.00</span></div>
        <div class="am-line muted"><span>SGST (9%)</span><span>₹4,050.00</span></div>
        <div class="am-divider"></div>
        <div class="am-line total"><span>Total Due</span><span [style.color]="accentColor()">₹53,100.00</span></div>
      </div>
    </div>
  `
})
export class AuthPreviewCardComponent {
  accentColor = input('#4f46e5');
}
