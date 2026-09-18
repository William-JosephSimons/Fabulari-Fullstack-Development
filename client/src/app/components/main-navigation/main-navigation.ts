import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-main-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './main-navigation.html',
  styleUrl: './main-navigation.css',
})
export class MainNavigation {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  // Clear the current login and return to the login page.
  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
