import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { Auth } from './services/auth/auth';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  // Validate any stored login with the server when Angular starts.
  ngOnInit(): void {
    const currentUser = this.auth.getCurrentUser();
    const token = this.auth.getAuthToken();

    if (!currentUser && !token) {
      return;
    }

    if (!currentUser || !token) {
      this.auth.clearLogin();
      this.router.navigate(['/login']);
      return;
    }

    this.auth.getSession().subscribe({
      next: (response: any) => {
        if (response.valid && response.user) {
          this.auth.saveCurrentUser(response.user);
          return;
        }

        this.auth.clearLogin();
        this.router.navigate(['/login']);
      },
      error: () => {
        this.auth.clearLogin();
        this.router.navigate(['/login']);
      },
    });
  }
}
