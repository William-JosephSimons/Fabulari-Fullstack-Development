import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthNavigation } from '../auth-navigation/auth-navigation';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-register',
  imports: [AuthNavigation, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private readonly auth = inject(Auth);

  protected registrationMessage = '';
  protected registrationError = '';
  protected registrationDetails = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    birthdate: '',
    password: '',
    confirmPassword: ''
  };

  protected submitRegistration(): void {
    this.registrationMessage = '';
    this.registrationError = '';

    if (this.registrationDetails.password !== this.registrationDetails.confirmPassword) {
      this.registrationError = 'Passwords do not match.';
      return;
    }

    // confirmPassword is only used by the form and is not sent to Express.
    const { confirmPassword, ...accountDetails } = this.registrationDetails;

    this.auth.register(accountDetails).subscribe({
      next: (response: any) => {
        if (!response.valid) {
          this.registrationError = response.message || 'Registration was unsuccessful.';
          return;
        }

        this.registrationDetails.password = '';
        this.registrationDetails.confirmPassword = '';
        this.registrationMessage = 'Account created. You can now return to login.';
      },
      error: (error) => {
        this.registrationError =
          error.error?.message || 'Unable to contact the server.';
      },
    });
  }
}
