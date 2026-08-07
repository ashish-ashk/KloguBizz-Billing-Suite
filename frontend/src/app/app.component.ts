import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme.service';
import { IdleService } from './core/idle.service';
import { IdleWarningComponent } from './shared/idle-warning.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, IdleWarningComponent],
  template: `
    <router-outlet />
    <app-idle-warning />
  `
})
export class AppComponent {
  // Injecting eagerly instantiates the singleton so it starts applying the
  // organisation's saved theme (or the default) as soon as the app boots.
  constructor(private theme: ThemeService, private idle: IdleService) {
    // Started here rather than in the service's own constructor so that
    // *creating* the service (which the warning component also does) has no side
    // effects — only the app root decides that the clock should run.
    this.idle.start();
  }
}
