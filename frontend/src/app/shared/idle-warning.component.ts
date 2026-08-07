import { Component } from '@angular/core';
import { IdleService } from '../core/idle.service';

/**
 * The last-minute warning before an inactivity sign-out.
 *
 * Mounted at the app root rather than in the shell, because it has to appear on
 * every signed-in screen including the ones that do not use the shell (the
 * platform console, the invoice editor's print view). It renders nothing at all
 * until there is something to say.
 *
 * Deliberately **not** an `app-modal`: this dialog must not be dismissable by
 * clicking the backdrop or pressing Escape. Both are things a person does
 * absent-mindedly, and either would leave the countdown running invisibly — the
 * user would be signed out seconds after believing they had dealt with it.
 * There is exactly one way out, and it is the button.
 *
 * The `data-idle-warning` attribute is load-bearing: `IdleService` uses it to
 * ignore its own window-level listeners for events inside here, so pressing the
 * button does not tear the overlay away between the press and the release. See
 * `IdleService.record`.
 */
@Component({
  selector: 'app-idle-warning',
  standalone: true,
  template: `
    @if (idle.warningSeconds(); as seconds) {
      <div class="modal-overlay no-print" data-idle-warning role="alertdialog" aria-modal="true" aria-labelledby="idle-title">
        <div class="modal-panel" style="--modal-w:420px">
          <div class="modal-scroll">
            <div class="modal-head">
              <div class="modal-title" id="idle-title">Still there?</div>
            </div>
            <p style="margin:0 0 14px;font-size:13px;line-height:1.7;color:var(--text-mid)">
              You will be signed out in <strong>{{ seconds }}</strong>
              second{{ seconds === 1 ? '' : 's' }} because there has been no activity.
              Anything you have typed but not saved will be lost.
            </p>
            <div class="modal-foot">
              <button class="btn primary" type="button" (click)="stay()">Stay signed in</button>
            </div>
          </div>
        </div>
      </div>
    }
  `
})
export class IdleWarningComponent {
  constructor(public idle: IdleService) {}

  stay() {
    this.idle.record();
  }
}
