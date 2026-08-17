import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthNavigation } from '../auth-navigation/auth-navigation';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-first-run-setup',
  imports: [AuthNavigation, FormsModule, RouterLink],
  templateUrl: './first-run-setup.html',
  styleUrl: './first-run-setup.css',
})
export class FirstRunSetup implements OnInit {
  private readonly auth = inject(Auth);

  protected statusLoaded = false;
  protected setupRequired = false;
  protected setupMessage = '';
  protected setupError = '';
  protected setupDetails = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    age: 18,
    password: '',
    confirmPassword: '',
  };

  ngOnInit(): void {
    this.auth.getBootstrapStatus().subscribe({
      next: (response: any) => {
        this.statusLoaded = true;
        this.setupRequired = response.setupRequired;

        if (!this.setupRequired) {
          this.setupMessage = 'Super Admin setup has already been completed.';
        }
      },
      error: () => {
        this.statusLoaded = true;
        this.setupError = 'Unable to contact the server.';
      },
    });
  }

  protected submitSetup(): void {
    this.setupMessage = '';
    this.setupError = '';

    if (this.setupDetails.password !== this.setupDetails.confirmPassword) {
      this.setupError = 'Passwords do not match.';
      return;
    }

    // confirmPassword is only used by the form and is not sent to Express.
    const { confirmPassword, ...accountDetails } = this.setupDetails;

    this.auth.createSuperAdmin(accountDetails).subscribe({
      next: (response: any) => {
        if (!response.valid) {
          this.setupError = response.message || 'Setup was unsuccessful.';
          return;
        }

        this.setupDetails.password = '';
        this.setupDetails.confirmPassword = '';
        this.setupRequired = false;
        this.setupMessage = 'Super Admin created. You can now return to login.';
      },
      error: (error) => {
        this.setupError = error.error?.message || 'Unable to contact the server.';
      },
    });
  }
}
