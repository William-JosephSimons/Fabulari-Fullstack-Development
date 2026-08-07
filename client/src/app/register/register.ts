import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthNavigation } from '../auth-navigation/auth-navigation';

@Component({
  selector: 'app-register',
  imports: [AuthNavigation, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  protected registrationMessage = '';
  protected registrationError = '';
  protected registrationDetails = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    age: 18,
    password: '',
    confirmPassword: ''
  };

  protected submitRegistration(): void {
    if (this.registrationDetails.password !== this.registrationDetails.confirmPassword) {
      this.registrationMessage = '';
      this.registrationError = 'Passwords do not match.';
      return;
    }

    // The prototype checks matching passwords; Express will perform all account validation.
    this.registrationError = '';
    this.registrationMessage = 'Registration form submitted.';
  }
}
