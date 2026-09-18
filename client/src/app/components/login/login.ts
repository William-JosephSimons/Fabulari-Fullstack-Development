import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthNavigation } from '../auth-navigation/auth-navigation';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-login',
  imports: [AuthNavigation, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login implements OnInit {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected loginMessage = '';
  protected loginDetails = {
    username: '',
    password: '',
  };

  // Redirect an existing valid local login to its dashboard.
  ngOnInit(): void {
    this.auth.getBootstrapStatus().subscribe({
      next: (response: any) => {
        if (response.setupRequired) {
          this.router.navigate(['/setup']);
        }
      },
      error: () => {
        this.loginMessage = 'Unable to contact the server.';
      },
    });
  }

  // Validate and submit the login form.
  protected submitLogin(): void {
    this.loginMessage = '';

    this.auth.login(this.loginDetails).subscribe({
      next: (response: any) => {
        if (!response.valid || !response.user || !response.token) {
          this.loginMessage = response.message || 'Login was unsuccessful.';
          return;
        }

        this.auth.saveLogin(response.user, response.token);

        if (response.user.systemRole === 'superAdmin') {
          this.router.navigate(['/super-admin-dashboard']);
        } else {
          this.router.navigate(['/user-dashboard']);
        }
      },
      error: (error) => {
        this.loginMessage = error.error?.message || 'Unable to contact the server.';
      },
    });
  }
}
