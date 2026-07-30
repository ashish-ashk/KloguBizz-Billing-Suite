import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { IconComponent } from '../../shared/icons';
import { AuthPreviewCardComponent } from '../../shared/auth-preview-card.component';

/**
 * Confirms an email address (#52).
 *
 * Unauthenticated, and it has to be: the link arrives by email and is opened on whatever
 * device happens to be reading that inbox, which is frequently not the one that
 * registered. Requiring a session here would make the link fail for exactly the people
 * most likely to click it.
 *
 * It verifies on load rather than behind a button. The user has already expressed intent
 * by clicking the link in their email; a second "yes, really" achieves nothing except a
 * step at which people give up.
 */
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, IconComponent, AuthPreviewCardComponent],
  template: `
    <div class="auth-shell">
      <div class="auth-panel">
        <div class="auth-card">
          <div class="auth-head">
            <h1>Email confirmation</h1>
          </div>

          @if (state() === 'checking') {
            <div style="display:flex;align-items:center;gap:10px;padding:14px 0">
              <span class="spinner"></span>
              <span>Confirming your address…</span>
            </div>
          }

          @if (state() === 'done') {
            <div class="info-box ok" style="display:flex;gap:9px;align-items:flex-start">
              <app-icon name="checkCircle" [size]="16" style="flex-shrink:0;margin-top:1px" />
              <span>{{ message() }}</span>
            </div>
            <a class="btn primary" routerLink="/login" style="margin-top:16px;width:100%;justify-content:center">
              Continue to sign in
            </a>
          }

          @if (state() === 'failed') {
            <div class="info-box danger" style="display:flex;gap:9px;align-items:flex-start">
              <app-icon name="alertTriangle" [size]="16" style="flex-shrink:0;margin-top:1px" />
              <span>{{ message() }}</span>
            </div>
            <!-- The recovery path is inside the app, because issuing a new link needs to
                 know who is asking — which an expired link no longer proves. -->
            <p style="margin:14px 0 0;font-size:13px;line-height:1.7;color:var(--text-mid)">
              Sign in and open <strong>Security &amp; Privacy</strong> to send yourself a fresh link.
            </p>
            <a class="btn secondary" routerLink="/login" style="margin-top:16px;width:100%;justify-content:center">
              Go to sign in
            </a>
          }
        </div>
      </div>
      <app-auth-preview-card />
    </div>
  `
})
export class VerifyEmailComponent implements OnInit {
  state = signal<'checking' | 'done' | 'failed'>('checking');
  message = signal('');

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state.set('failed');
      this.message.set('This link is missing its token. Open the link from your email exactly as it was sent.');
      return;
    }

    this.http.post<{ ok: boolean; message: string }>(`${environment.apiUrl}/auth/verify-email`, { token })
      .subscribe({
        next: res => { this.state.set('done'); this.message.set(res.message); },
        error: err => {
          this.state.set('failed');
          this.message.set(err?.error?.message || 'This confirmation link is invalid or has expired.');
        }
      });
  }
}
