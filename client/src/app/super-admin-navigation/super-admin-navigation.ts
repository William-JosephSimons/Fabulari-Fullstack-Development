import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-super-admin-navigation',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './super-admin-navigation.html',
  styleUrl: './super-admin-navigation.css',
})
export class SuperAdminNavigation {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
