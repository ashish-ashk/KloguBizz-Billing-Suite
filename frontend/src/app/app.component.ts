import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />'
})
export class AppComponent {
  // Injecting eagerly instantiates the singleton so it starts applying the
  // organisation's saved theme (or the default) as soon as the app boots.
  constructor(private theme: ThemeService) {}
}
