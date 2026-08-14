import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthNavigation } from '../auth-navigation/auth-navigation';
import { Auth } from '../services/auth';

@Component({
  selector: 'app-login',
  imports: [AuthNavigation, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected loginMessage = '';
  protected loginDetails = {
    username: '',
    password: ''
  };

  protected submitLogin(): void {
    this.loginMessage = '';

    this.auth.login(this.loginDetails).subscribe({
      next: (response: any) => {
        if (!response.valid || !response.user) {
          this.loginMessage = response.message || 'Login was unsuccessful.';
          return;
        }

        this.auth.saveCurrentUser(response.user);

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
