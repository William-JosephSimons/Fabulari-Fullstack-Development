import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthNavigation } from '../auth-navigation/auth-navigation';

@Component({
  selector: 'app-first-run-setup',
  imports: [AuthNavigation, FormsModule],
  templateUrl: './first-run-setup.html',
  styleUrl: './first-run-setup.css',
})
export class FirstRunSetup {
  protected setupMessage = '';
  protected setupError = '';
  protected setupDetails = {
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    age: 18,
    password: '',
    confirmPassword: ''
  };

  protected submitSetup(): void {
    if (this.setupDetails.password !== this.setupDetails.confirmPassword) {
      this.setupMessage = '';
      this.setupError = 'Passwords do not match.';
      return;
    }

    // The Week 5 server route will replace this local prototype response.
    this.setupError = '';
    this.setupMessage = 'Super Admin setup form submitted.';
  }
}
