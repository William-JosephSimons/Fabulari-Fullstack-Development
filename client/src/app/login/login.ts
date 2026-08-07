import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthNavigation } from '../auth-navigation/auth-navigation';

@Component({
  selector: 'app-login',
  imports: [AuthNavigation, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  protected loginMessage = '';
  protected loginDetails = {
    username: '',
    password: ''
  };

  protected submitLogin(): void {
    // Authentication and navigation will be connected to Express in Week 5.
    this.loginMessage = 'Login form submitted.';
  }
}
